import type {
  AuctionData,
  CompareRequest,
  CompareResponse,
  CompareError,
  MeResponse,
  UsageResponse,
  HistoryResponse,
} from '@auction-comparator/shared'
import type {
  CompareRequestMessage,
  CompareResponseMessage,
  CompareErrorMessage,
  AuthCheckMessage,
  AuthCheckResponseMessage,
  UsageRequestMessage,
  UsageResponseMessage,
  UsageErrorMessage,
  HistoryRequestMessage,
  HistoryResponseMessage,
  HistoryErrorMessage,
  ForceRefreshRequestMessage,
} from '@/utils/messaging'
import {
  getSettings,
  getApiToken,
  getAuthState,
  updateFromMeResponse,
  needsAuthRefresh,
  clearApiToken,
} from '@/utils/storage'

// In-flight request deduplication
const pendingRequests = new Map<string, Promise<CompareResponse>>()

// Retry configuration
const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 1000

export default defineBackground(() => {
  console.log('[Auction Comparator] Background script loaded', { id: browser.runtime.id })

  // Check auth status on startup
  checkAuthStatus()

  // Set up periodic auth check (every 6 hours)
  browser.alarms.create('authCheck', { periodInMinutes: 6 * 60 })
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'authCheck') {
      checkAuthStatus()
    }
  })

  // Handle messages from content scripts
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'COMPARE_REQUEST') {
      handleCompareRequest(message as CompareRequestMessage)
        .then((response) => sendResponse(response))
        .catch((error) => {
          console.error('[Auction Comparator] Compare request failed:', error)
          sendResponse({
            type: 'COMPARE_RESPONSE',
            success: false,
            error: {
              code: 'API_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          } satisfies CompareErrorMessage)
        })
      return true // Keep channel open for async response
    }

    if (message.type === 'AUTH_CHECK') {
      handleAuthCheck()
        .then((response) => sendResponse(response))
        .catch((error) => {
          console.error('[Auction Comparator] Auth check failed:', error)
          sendResponse({
            type: 'AUTH_CHECK_RESPONSE',
            authenticated: false,
            hasSubscription: false,
          } satisfies AuthCheckResponseMessage)
        })
      return true
    }

    if (message.type === 'OPEN_LOGIN') {
      openLoginPage()
      sendResponse({ success: true })
      return false
    }

    if (message.type === 'LOGOUT') {
      handleLogout()
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }))
      return true
    }

    if (message.type === 'USAGE_REQUEST') {
      handleUsageRequest()
        .then((response) => sendResponse(response))
        .catch((error) => {
          console.error('[Auction Comparator] Usage request failed:', error)
          sendResponse({
            type: 'USAGE_RESPONSE',
            success: false,
            error: {
              code: 'API_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          } satisfies UsageErrorMessage)
        })
      return true
    }

    if (message.type === 'HISTORY_REQUEST') {
      handleHistoryRequest(message as HistoryRequestMessage)
        .then((response) => sendResponse(response))
        .catch((error) => {
          console.error('[Auction Comparator] History request failed:', error)
          sendResponse({
            type: 'HISTORY_RESPONSE',
            success: false,
            error: {
              code: 'API_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          } satisfies HistoryErrorMessage)
        })
      return true
    }
  })

  // Listen for external messages from the web app (for auto-auth after login)
  browser.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    console.log('[Auction Comparator] External message received!')
    console.log('[Auction Comparator] Sender:', JSON.stringify(sender))
    console.log('[Auction Comparator] Message:', JSON.stringify(message))

    // Handle the message asynchronously
    ;(async () => {
      try {
        // Verify the sender is from our allowed origins
        const settings = await getSettings()
        const allowedOrigin = new URL(settings.apiBase).origin

        console.log('[Auction Comparator] Allowed origin:', allowedOrigin)
        console.log('[Auction Comparator] Sender origin:', sender.origin || sender.url)

        // Check origin (sender.origin might be undefined, use url as fallback)
        const senderOrigin = sender.origin || (sender.url ? new URL(sender.url).origin : null)

        if (senderOrigin && senderOrigin !== allowedOrigin) {
          console.warn('[Auction Comparator] Rejected external message from:', senderOrigin)
          sendResponse({ success: false, error: 'Invalid origin' })
          return
        }

        if (message.type === 'AUTH_TOKEN') {
          await handleSetToken(message.token)
          console.log('[Auction Comparator] Auth token saved successfully')
          sendResponse({ success: true })
          // Notify all tabs to refresh auth state
          notifyTabsAuthChanged()
        } else if (message.type === 'AUTH_LOGOUT') {
          await handleLogout()
          console.log('[Auction Comparator] Logged out via external message')
          sendResponse({ success: true })
          // Notify all tabs to refresh auth state
          notifyTabsAuthChanged()
        } else {
          console.log('[Auction Comparator] Unknown message type:', message.type)
          sendResponse({ success: false, error: 'Unknown message type' })
        }
      } catch (error: any) {
        console.error('[Auction Comparator] Error handling external message:', error)
        sendResponse({ success: false, error: error.message })
      }
    })()

    return true // Keep channel open for async response
  })
})

async function checkAuthStatus(): Promise<void> {
  const needsRefresh = await needsAuthRefresh()
  if (!needsRefresh) return

  const token = await getApiToken()
  if (!token) return

  try {
    const settings = await getSettings()
    const response = await fetch(`${settings.apiBase}/api/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (response.ok) {
      const data: MeResponse = await response.json()
      await updateFromMeResponse(data)
      console.log('[Auction Comparator] Auth status refreshed')
    } else if (response.status === 401) {
      // Token is invalid, clear it
      await clearApiToken()
      console.log('[Auction Comparator] Token expired, cleared')
    }
  } catch (error) {
    console.error('[Auction Comparator] Failed to check auth status:', error)
  }
}

async function handleAuthCheck(): Promise<AuthCheckResponseMessage> {
  // Force refresh if needed
  await checkAuthStatus()

  const authState = await getAuthState()
  const authenticated = !!authState.apiToken && !!authState.user
  const status = authState.subscription?.status
  const hasSubscription = status === 'active' || status === 'trialing'

  return {
    type: 'AUTH_CHECK_RESPONSE',
    authenticated,
    hasSubscription,
    user: authState.user ?? undefined,
    subscription: authState.subscription ?? undefined,
  }
}

async function notifyTabsAuthChanged(): Promise<void> {
  try {
    const tabs = await browser.tabs.query({})
    for (const tab of tabs) {
      if (tab.id) {
        browser.tabs.sendMessage(tab.id, { type: 'AUTH_CHANGED' }).catch(() => {
          // Ignore errors for tabs that don't have our content script
        })
      }
    }
  } catch (error) {
    console.error('[Auction Comparator] Failed to notify tabs:', error)
  }
}

async function handleSetToken(token: string): Promise<void> {
  const settings = await getSettings()

  // Validate token by calling /api/me
  const response = await fetch(`${settings.apiBase}/api/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Invalid token')
  }

  const data: MeResponse = await response.json()

  // Save token and user info
  await import('@/utils/storage').then(({ saveAuthState }) =>
    saveAuthState({
      apiToken: token,
      user: data.user,
      subscription: data.subscription,
      features: data.features,
      lastCheckedAt: Date.now(),
    })
  )

  console.log('[Auction Comparator] Token set successfully')
}

async function handleLogout(): Promise<void> {
  await clearApiToken()
  console.log('[Auction Comparator] Logged out')
}

async function openLoginPage(): Promise<void> {
  const settings = await getSettings()
  // Pass extension ID so web app can send auth token back
  const extensionId = browser.runtime.id
  await browser.tabs.create({
    url: `${settings.apiBase}/login?ext=${extensionId}`,
  })
}

async function handleUsageRequest(): Promise<UsageResponseMessage | UsageErrorMessage> {
  const authState = await getAuthState()
  if (!authState.apiToken) {
    return {
      type: 'USAGE_RESPONSE',
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Please sign in to view usage',
      },
    }
  }

  const settings = await getSettings()
  const response = await fetch(`${settings.apiBase}/api/usage`, {
    headers: {
      'Authorization': `Bearer ${authState.apiToken}`,
    },
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    return {
      type: 'USAGE_RESPONSE',
      success: false,
      error: {
        code: response.status === 401 ? 'UNAUTHORIZED' : 'API_ERROR',
        message: errorBody.message || `API error: ${response.status}`,
      },
    }
  }

  const data: UsageResponse = await response.json()
  return {
    type: 'USAGE_RESPONSE',
    success: true,
    data,
  }
}

async function handleHistoryRequest(
  message: HistoryRequestMessage
): Promise<HistoryResponseMessage | HistoryErrorMessage> {
  const authState = await getAuthState()
  if (!authState.apiToken) {
    return {
      type: 'HISTORY_RESPONSE',
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Please sign in to view history',
      },
    }
  }

  const settings = await getSettings()
  const params = new URLSearchParams()
  if (message.page) params.set('page', String(message.page))
  if (message.pageSize) params.set('pageSize', String(message.pageSize))

  const response = await fetch(`${settings.apiBase}/api/history?${params}`, {
    headers: {
      'Authorization': `Bearer ${authState.apiToken}`,
    },
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    return {
      type: 'HISTORY_RESPONSE',
      success: false,
      error: {
        code: response.status === 401 ? 'UNAUTHORIZED' : 'API_ERROR',
        message: errorBody.message || `API error: ${response.status}`,
      },
    }
  }

  const data: HistoryResponse = await response.json()
  return {
    type: 'HISTORY_RESPONSE',
    success: true,
    data,
  }
}

async function handleCompareRequest(
  message: CompareRequestMessage | ForceRefreshRequestMessage
): Promise<CompareResponseMessage | CompareErrorMessage> {
  const { data } = message
  const forceRefresh = 'forceRefresh' in message ? message.forceRefresh : false

  // Check authentication first
  const authState = await getAuthState()
  if (!authState.apiToken) {
    return {
      type: 'COMPARE_RESPONSE',
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Please sign in to use price comparison',
      },
    }
  }

  // Check subscription
  const status = authState.subscription?.status
  const hasSubscription = status === 'active' || status === 'trialing'
  if (!hasSubscription) {
    return {
      type: 'COMPARE_RESPONSE',
      success: false,
      error: {
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'An active subscription is required',
      },
    }
  }

  // Generate deduplication key
  const dedupKey = generateDedupKey(data)

  // Check for pending request
  const pending = pendingRequests.get(dedupKey)
  if (pending) {
    console.log('[Auction Comparator] Reusing pending request')
    const result = await pending
    return {
      type: 'COMPARE_RESPONSE',
      success: true,
      data: result,
    }
  }

  // Create new request
  const requestPromise = executeCompareRequest(data, authState.apiToken, forceRefresh)
  pendingRequests.set(dedupKey, requestPromise)

  try {
    const result = await requestPromise
    return {
      type: 'COMPARE_RESPONSE',
      success: true,
      data: result,
    }
  } catch (error) {
    const errorResponse: CompareError = {
      code: 'API_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    }

    if (error instanceof RateLimitError) {
      errorResponse.code = 'RATE_LIMITED'
      errorResponse.retryAfter = error.retryAfter
    } else if (error instanceof QuotaError) {
      errorResponse.code = 'QUOTA_EXCEEDED';
      (errorResponse as any).usage = error.usage
    } else if (error instanceof AuthError) {
      errorResponse.code = error.code as any
    }

    return {
      type: 'COMPARE_RESPONSE',
      success: false,
      error: errorResponse,
    }
  } finally {
    pendingRequests.delete(dedupKey)
  }
}

async function executeCompareRequest(
  data: AuctionData,
  token: string,
  forceRefresh: boolean = false
): Promise<CompareResponse> {
  const settings = await getSettings()
  const apiUrl = `${settings.apiBase}/api/compare`

  const request: CompareRequest = {
    title: data.title,
    brand: data.brand,
    model: data.model,
    condition: data.condition,
    currency: data.currency,
    locale: data.locale,
    auctionPrice: data.totalPrice,
    siteDomain: data.siteDomain,
    lotUrl: data.lotUrl,
    category: data.category as 'vehicle' | 'product' | undefined,
    extractionConfidence: data.extractionConfidence,
    forceRefresh,
  }

  let lastError: Error | null = null
  let backoffMs = INITIAL_BACKOFF_MS

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Extension-Id': browser.runtime.id,
        },
        body: JSON.stringify(request),
      })

      if (response.status === 401) {
        // Token expired, clear and throw
        await clearApiToken()
        throw new AuthError('Session expired. Please sign in again.', 'UNAUTHORIZED')
      }

      if (response.status === 402) {
        const errorBody = await response.json().catch(() => ({}))
        if (errorBody.code === 'QUOTA_EXCEEDED') {
          throw new QuotaError(errorBody.message || 'Quota exceeded', errorBody.usage)
        }
        throw new AuthError('Subscription required', 'SUBSCRIPTION_REQUIRED')
      }

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
        throw new RateLimitError('Rate limited', retryAfter)
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.message || `API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry auth, rate limit, or quota errors
      if (error instanceof RateLimitError || error instanceof AuthError || error instanceof QuotaError) {
        throw error
      }

      // Don't retry on last attempt
      if (attempt < MAX_RETRIES - 1) {
        console.log(`[Auction Comparator] Retry ${attempt + 1}/${MAX_RETRIES} after ${backoffMs}ms`)
        await sleep(backoffMs)
        backoffMs *= 2 // Exponential backoff
      }
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

function generateDedupKey(data: AuctionData): string {
  return `${data.siteDomain}:${data.title}:${data.totalPrice}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class RateLimitError extends Error {

  constructor(message: string, public retryAfter: number) {
    super(message)
    this.name = 'RateLimitError'
  }

}

class AuthError extends Error {

  constructor(message: string, public code: string) {
    super(message)
    this.name = 'AuthError'
  }

}

class QuotaError extends Error {

  constructor(message: string, public usage?: any) {
    super(message)
    this.name = 'QuotaError'
  }

}

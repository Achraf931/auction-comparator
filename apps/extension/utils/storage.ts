import type {
  ExtensionAuthState,
  UserInfo,
  SubscriptionInfo,
  FeatureFlags,
  MeResponse,
} from '@auction-comparator/shared'

export interface ExtensionSettings {
  /** Whether the extension is enabled */
  enabled: boolean;
  /** API base URL */
  apiBase: string;
  /** Domains where the extension should not run */
  disabledDomains: string[];
  /** Whether to auto-expand the overlay */
  autoExpand: boolean;
  /** Default margin percentage for verdict */
  marginPercent: number;
  /** Sites where user has granted permission (site IDs) */
  enabledSites: string[];
  /** Origins where user has hidden the extension overlay */
  hiddenOrigins: string[];
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  apiBase: 'http://localhost:3001',
  disabledDomains: [],
  autoExpand: true,
  marginPercent: 10,
  enabledSites: [],
  hiddenOrigins: [],
}

const DEFAULT_AUTH_STATE: ExtensionAuthState = {
  apiToken: null,
  user: null,
  subscription: null,
  features: null,
  lastCheckedAt: null,
}

// Check interval: 6 hours
const AUTH_CHECK_INTERVAL = 6 * 60 * 60 * 1000

/**
 * Get all extension settings
 */
export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get('settings')
  return {
    ...DEFAULT_SETTINGS,
    ...(result.settings || {}),
  }
}

/**
 * Save extension settings
 */
export async function saveSettings(
  settings: Partial<ExtensionSettings>
): Promise<void> {
  const current = await getSettings()
  await chrome.storage.sync.set({
    settings: { ...current, ...settings },
  })
}

/**
 * Check if the extension is enabled for a domain
 */
export async function isEnabledForDomain(domain: string): Promise<boolean> {
  const settings = await getSettings()
  if (!settings.enabled) return false
  return !settings.disabledDomains.includes(domain)
}

/**
 * Toggle domain enabled state
 */
export async function toggleDomain(
  domain: string,
  enabled: boolean
): Promise<void> {
  const settings = await getSettings()
  const disabledDomains = new Set(settings.disabledDomains)

  if (enabled) {
    disabledDomains.delete(domain)
  } else {
    disabledDomains.add(domain)
  }

  await saveSettings({
    disabledDomains: Array.from(disabledDomains),
  })
}

/**
 * Get cached comparison result for a lot
 */
export async function getCachedComparison(
  lotId: string
): Promise<unknown | null> {
  const result = await chrome.storage.local.get(`comparison:${lotId}`)
  return result[`comparison:${lotId}`] || null
}

/**
 * Cache comparison result
 */
export async function setCachedComparison(
  lotId: string,
  data: unknown,
  ttlMs = 30 * 60 * 1000
): Promise<void> {
  await chrome.storage.local.set({
    [`comparison:${lotId}`]: {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    },
  })
}

// ========== Auth State Management ==========

/**
 * Get the current auth state
 */
export async function getAuthState(): Promise<ExtensionAuthState> {
  const result = await chrome.storage.local.get('authState')
  return {
    ...DEFAULT_AUTH_STATE,
    ...(result.authState || {}),
  }
}

/**
 * Save auth state
 */
export async function saveAuthState(
  state: Partial<ExtensionAuthState>
): Promise<void> {
  const current = await getAuthState()
  await chrome.storage.local.set({
    authState: { ...current, ...state },
  })
}

/**
 * Set the API token
 */
export async function setApiToken(token: string): Promise<void> {
  await saveAuthState({ apiToken: token })
}

/**
 * Get the API token
 */
export async function getApiToken(): Promise<string | null> {
  const state = await getAuthState()
  return state.apiToken
}

/**
 * Clear the API token (logout)
 */
export async function clearApiToken(): Promise<void> {
  await saveAuthState({
    apiToken: null,
    user: null,
    subscription: null,
    features: null,
    lastCheckedAt: null,
  })
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const state = await getAuthState()
  return !!state.apiToken && !!state.user
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
  const state = await getAuthState()
  const status = state.subscription?.status
  return status === 'active' || status === 'trialing'
}

/**
 * Update auth state from /api/me response
 */
export async function updateFromMeResponse(response: MeResponse): Promise<void> {
  await saveAuthState({
    user: response.user,
    subscription: response.subscription,
    features: response.features,
    lastCheckedAt: Date.now(),
  })
}

/**
 * Check if auth state needs refresh
 */
export async function needsAuthRefresh(): Promise<boolean> {
  const state = await getAuthState()

  // No token = no refresh needed
  if (!state.apiToken) return false

  // Never checked = needs refresh
  if (!state.lastCheckedAt) return true

  // Check if interval has passed
  return Date.now() - state.lastCheckedAt > AUTH_CHECK_INTERVAL
}

/**
 * Get the web app URL for login
 */
export async function getWebAppUrl(path: string = ''): Promise<string> {
  const settings = await getSettings()
  return `${settings.apiBase}${path}`
}

// ========== Site Permission Management ==========

/**
 * Check if a site is enabled (has permission)
 */
export async function isSiteEnabled(siteId: string): Promise<boolean> {
  const settings = await getSettings()
  return settings.enabledSites.includes(siteId)
}

/**
 * Add a site to enabled sites
 */
export async function enableSite(siteId: string): Promise<void> {
  const settings = await getSettings()
  if (!settings.enabledSites.includes(siteId)) {
    await saveSettings({
      enabledSites: [...settings.enabledSites, siteId],
    })
  }
}

/**
 * Remove a site from enabled sites
 */
export async function disableSite(siteId: string): Promise<void> {
  const settings = await getSettings()
  await saveSettings({
    enabledSites: settings.enabledSites.filter(id => id !== siteId),
  })
}

/**
 * Get all enabled site IDs
 */
export async function getEnabledSites(): Promise<string[]> {
  const settings = await getSettings()
  return settings.enabledSites
}

// ========== Hidden Origins Management ==========

/**
 * Check if an origin is hidden
 */
export async function isOriginHidden(origin: string): Promise<boolean> {
  const settings = await getSettings()
  return settings.hiddenOrigins.includes(origin)
}

/**
 * Hide the extension on an origin
 */
export async function hideOnOrigin(origin: string): Promise<void> {
  const settings = await getSettings()
  if (!settings.hiddenOrigins.includes(origin)) {
    await saveSettings({
      hiddenOrigins: [...settings.hiddenOrigins, origin],
    })
  }
}

/**
 * Show the extension on an origin (remove from hidden)
 */
export async function showOnOrigin(origin: string): Promise<void> {
  const settings = await getSettings()
  await saveSettings({
    hiddenOrigins: settings.hiddenOrigins.filter(o => o !== origin),
  })
}

/**
 * Get all hidden origins
 */
export async function getHiddenOrigins(): Promise<string[]> {
  const settings = await getSettings()
  return settings.hiddenOrigins
}

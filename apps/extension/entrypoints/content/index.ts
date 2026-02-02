import { createApp } from 'vue'
import ui from '@nuxt/ui/vue-plugin'
import type { AuctionData, Currency } from '@auction-comparator/shared'
import App from './App.vue'
import { getAdapterForCurrentPage } from '@/adapters'
import { isEnabledForDomain, isOriginHidden } from '@/utils/storage'
import { debounce } from '@/utils/dom'
import {
  createExtractor,
  isSupportedDomain,
  formatPrice,
  type ExtractionResult,
} from '@/extractor'
import { i18n, initLocale } from '@/utils/i18n'
import { getAllMatchPatterns } from '@/utils/sites'
import './main.css'

export default defineContentScript({
  // Include all supported sites - permissions are checked at runtime
  matches: [
    '*://*.interencheres.fr/*',
    '*://*.interencheres.com/*',
    '*://*.alcopa-auction.fr/*',
    '*://*.alcopa-auction.com/*',
    '*://*.encheres-domaine.gouv.fr/*',
    '*://*.moniteurdesventes.com/*',
    '*://*.agorastore.fr/*',
    '*://*.auctelia.com/*',
  ],
  cssInjectionMode: 'ui',

  async main(ctx) {
    console.log('[Auction Comparator] Content script loaded on:', window.location.href)

    // Check if extension is enabled for this domain
    const domain = window.location.hostname
    const origin = window.location.origin
    const enabled = await isEnabledForDomain(domain)

    if (!enabled) {
      console.log('[Auction Comparator] Extension disabled for this domain')
      return
    }

    // Check if user has hidden the extension on this origin
    const hidden = await isOriginHidden(origin)
    if (hidden) {
      console.log('[Auction Comparator] Extension hidden for this origin:', origin)
      return
    }

    // Get adapter for current site
    const adapter = getAdapterForCurrentPage()
    let useExtractor = false

    if (!adapter) {
      // Check if we can use the self-healing extractor
      if (isSupportedDomain(domain)) {
        console.log('[Auction Comparator] No adapter, using self-healing extractor')
        useExtractor = true
      } else {
        console.log('[Auction Comparator] No adapter found for this site')
        return
      }
    }

    if (adapter) {
      console.log(`[Auction Comparator] Using adapter: ${adapter.name}`)
    }

    // Check if this is a lot page
    let isLot = false
    if (adapter) {
      isLot = adapter.isLotPage()
    } else if (useExtractor) {
      // Extractor will check during extraction
      isLot = true // Will be validated by extractor
    }

    console.log('[Auction Comparator] Is lot page:', isLot)

    if (!isLot) {
      console.log('[Auction Comparator] Not a lot page, skipping')
      return
    }

    // Wait for page to be fully loaded before extracting
    if (document.readyState !== 'complete') {
      await new Promise(resolve => window.addEventListener('load', resolve, { once: true }))
      console.log('[Auction Comparator] Page fully loaded')
    }

    // Detect if this is an SPA site that needs longer wait time
    const isSPASite = domain.includes('auctelia')
    const initialDelay = isSPASite ? 1500 : 500

    // Wait for dynamic content to render
    await new Promise(resolve => setTimeout(resolve, initialDelay))
    console.log('[Auction Comparator] Initial delay complete:', initialDelay, 'ms')

    // Extract initial auction data
    let currentData: AuctionData | null = null

    if (adapter) {
      currentData = adapter.extractData()
      console.log('[Auction Comparator] Adapter extracted data:', currentData)

      // If price is still 0, retry with increasing delays (important for SPAs)
      const maxRetries = isSPASite ? 3 : 1
      let retryCount = 0

      while (currentData && (!currentData.currentBid || currentData.currentBid === 0) && retryCount < maxRetries) {
        retryCount++
        const retryDelay = retryCount * 1000
        console.log(`[Auction Comparator] Price is 0, retry ${retryCount}/${maxRetries} in ${retryDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        currentData = adapter.extractData()
        console.log('[Auction Comparator] Retry extracted data:', currentData)
      }
    }

    // If adapter failed or returned incomplete data (no price), try self-healing extractor
    const needsAiFallback = !currentData || !currentData.currentBid || currentData.currentBid === 0
    if (needsAiFallback) {
      console.log('[Auction Comparator] Adapter returned incomplete data, trying AI extractor...')
      const aiData = await extractWithSelfHealing()
      console.log('[Auction Comparator] AI extractor result:', aiData)

      if (aiData) {
        if (!currentData) {
          // No adapter data at all, use AI data
          currentData = aiData
        } else if (aiData.currentBid && aiData.currentBid > 0) {
          // Adapter got title but not price - merge the data
          currentData = {
            ...currentData,
            currentBid: aiData.currentBid,
            totalPrice: aiData.totalPrice,
          }
          console.log('[Auction Comparator] Merged adapter + AI data:', currentData)
        }
      }
    }

    // If still no data, create minimal data so overlay shows (for debugging)
    if (!currentData) {
      console.warn('[Auction Comparator] No data extracted, creating minimal data for debugging')
      currentData = {
        title: document.title.split('|')[0].split('-')[0].trim() || 'Unknown Item',
        condition: 'unknown',
        currentBid: 0,
        currency: 'EUR',
        fees: { buyerPremium: 0.25 },
        totalPrice: 0,
        siteDomain: domain,
        locale: 'fr',
        lotUrl: window.location.href,
        extractedAt: Date.now(),
      }
    }

    console.log('[Auction Comparator] Final data for overlay:', currentData)

    // Create the UI using WXT's shadow root system
    const uiContainer = await createShadowRootUi(ctx, {
      name: 'auction-comparator-overlay',
      position: 'inline',
      anchor: 'body',
      append: 'last',
      onMount(container) {
        // Initialize locale from storage
        initLocale()

        // Create Vue app
        const app = createApp(App, {
          initialData: currentData,
          adapter,
        })
        app.use(ui)
        app.use(i18n)
        app.mount(container)
        return app
      },
      onRemove(app) {
        app?.unmount()
      },
    })

    uiContainer.mount()
    console.log('[Auction Comparator] Overlay mounted')

    // Listen for extension toggle messages from popup
    const handleToggleMessage = (message: any) => {
      if (message.type === 'EXTENSION_TOGGLED' && !message.enabled) {
        console.log('[Auction Comparator] Extension disabled, removing overlay')
        uiContainer.remove()
      }
    }
    chrome.runtime.onMessage.addListener(handleToggleMessage)

    // Set up MutationObserver for price changes (only if using adapter)
    if (adapter) {
      const config = adapter.getMutationConfig()
      const targetElement = document.querySelector(config.targetSelector) || document.body

      const handleMutation = debounce(() => {
        const newData = adapter.extractData()
        if (newData && hasDataChanged(currentData, newData)) {
          console.log('[Auction Comparator] Data changed, updating overlay', newData)
          currentData = newData

          // Emit event for the Vue app to pick up
          const event = new CustomEvent('auction-data-updated', {
            detail: newData,
          })
          uiContainer.shadow.querySelector('#app')?.dispatchEvent(event)
        }
      }, config.debounceMs)

      const observer = new MutationObserver(handleMutation)
      observer.observe(targetElement, config.options)

      console.log('[Auction Comparator] MutationObserver started')

      // Cleanup on context invalidation
      ctx.onInvalidated(() => {
        observer.disconnect()
        chrome.runtime.onMessage.removeListener(handleToggleMessage)
        uiContainer.remove()
      })
    } else {
      // For self-healing extractor, the extractor handles its own observation
      ctx.onInvalidated(() => {
        chrome.runtime.onMessage.removeListener(handleToggleMessage)
        uiContainer.remove()
      })
    }
  },
})

function hasDataChanged(
  oldData: AuctionData | null,
  newData: AuctionData | null
): boolean {
  if (!oldData || !newData) return true
  return (
    oldData.currentBid !== newData.currentBid ||
    oldData.totalPrice !== newData.totalPrice ||
    oldData.title !== newData.title
  )
}

/**
 * Extract auction data using the self-healing extractor
 */
async function extractWithSelfHealing(): Promise<AuctionData | null> {
  const extractor = createExtractor({
    debug: true,
    useAiFallback: true,
    aiResolveEndpoint: `${import.meta.env.VITE_API_URL }/api/extract/resolve`,
  })

  const result = await extractor.extract()

  if (!result.success || (!result.title && !result.price)) {
    console.log('[Auction Comparator] Self-healing extraction failed:', result)
    return null
  }

  // Get domain config for buyer premium
  const buyerPremium = result.lotPageInfo.config?.buyerPremium ?? 0.2
  const currentBid = result.price?.value ?? 0
  const totalPrice = currentBid * (1 + buyerPremium)

  const currency = normalizeCurrency(result.price?.currency ?? 'EUR')

  return {
    title: result.title || 'Unknown Item',
    condition: 'unknown',
    currentBid,
    currency,
    fees: { buyerPremium },
    totalPrice,
    siteDomain: result.domain,
    locale: result.lotPageInfo.config?.locale ?? 'fr',
    lotUrl: window.location.href,
    extractedAt: Date.now(),
    extractionConfidence: result.confidence,
  }
}

/**
 * Convert extraction result to AuctionData format
 */
function extractionResultToAuctionData(result: ExtractionResult): AuctionData | null {
  if (!result.success) return null

  const buyerPremium = result.lotPageInfo.config?.buyerPremium ?? 0.2
  const currentBid = result.price?.value ?? 0
  const totalPrice = currentBid * (1 + buyerPremium)
  const currency = normalizeCurrency(result.price?.currency ?? 'EUR')

  return {
    title: result.title || 'Unknown Item',
    condition: 'unknown',
    currentBid,
    currency,
    fees: { buyerPremium },
    totalPrice,
    siteDomain: result.domain,
    locale: result.lotPageInfo.config?.locale ?? 'fr',
    lotUrl: result.lotPageInfo.url,
    extractedAt: Date.now(),
    extractionConfidence: result.confidence,
  }
}

/**
 * Normalize currency string to Currency type
 */
function normalizeCurrency(currency: string): Currency {
  const upper = currency.toUpperCase()
  if (upper === 'EUR' || upper === 'USD' || upper === 'GBP') {
    return upper
  }
  return 'EUR' // Default
}

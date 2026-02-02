import type { AuctionData, AuctionFees, Currency, MutationObserverConfig } from '@auction-comparator/shared'
import { calculateTotalPrice } from '@auction-comparator/shared'
import { BaseAdapter } from './base'

/**
 * Adapter for Auctelia auction site
 * Industrial equipment auctions (supports multiple locales: fr, en, nl)
 */
export class AucteliaAdapter extends BaseAdapter {

  id = 'auctelia'
  name = 'Auctelia'
  urlPatterns = [
    /auctelia\.com/i,
  ]
  defaultCurrency: Currency = 'EUR'
  defaultLocale = 'fr'
  defaultFees: AuctionFees = {
    buyerPremium: 0.15, // 15% typical buyer's premium
    vat: 0, // VAT usually included
  }

  private selectors = {
    // Title extraction - Auctelia uses various title patterns
    title: [
      'h1',
      '[class*="title"] h1',
      '[class*="product"] h1',
      '[class*="lot"] h1',
      '.text-2xl',
      '.text-xl',
    ],

    // Price extraction - Auctelia displays prices prominently
    price: [
      '[class*="price"]',
      '[class*="bid"]',
      '[class*="amount"]',
      '[class*="euro"]',
      '.text-primary',
      '.font-bold',
    ],

    // Description/condition
    description: '[class*="description"], [class*="detail"]',
    condition: '[class*="condition"], [class*="state"], [class*="etat"]',
  }

  isLotPage(): boolean {
    const url = window.location.href.toLowerCase()

    // Auctelia lot pages have patterns like:
    // https://www.auctelia.com/fr/materiel-occasion/tondeuse-autoportee-daewoo-daxrm224/rZ6V9IXb4_u4IBZm_elzU
    // https://www.auctelia.com/en/used-equipment/...
    // https://www.auctelia.com/nl/gebruikte-materiaal/...
    const lotPatterns = [
      /\/materiel-occasion\//i,
      /\/used-equipment\//i,
      /\/gebruikte-materiaal\//i,
      /\/lot\//i,
      /\/item\//i,
      /\/[a-z]{2}\/[^\/]+\/[^\/]+\/[a-zA-Z0-9_-]+$/i, // locale/category/title/id pattern
    ]

    const isLotUrl = lotPatterns.some(p => p.test(url))
    console.log('[Auctelia Adapter] URL check:', url, 'isLot:', isLotUrl)

    return isLotUrl
  }

  extractData(): AuctionData | null {
    console.log('[Auctelia Adapter] Attempting to extract data...')
    console.log('[Auctelia Adapter] URL:', window.location.href)

    // Detect locale from URL
    const locale = this.detectLocale()

    // Try to extract from Nuxt hydration data first (most reliable for SPAs)
    const nuxtData = this.extractFromNuxtData()
    let title = nuxtData?.title || null
    let currentBid = nuxtData?.price || null

    console.log('[Auctelia Adapter] Nuxt data:', nuxtData)

    // Extract title from DOM if not found
    if (!title) {
      for (const selector of this.selectors.title) {
        title = this.getText(selector)
        if (title && title.length > 5 && !title.includes('Auctelia')) {
          console.log('[Auctelia Adapter] Found title with selector:', selector, ':', title.slice(0, 50))
          break
        }
      }
    }

    if (!title) {
      // Try to get title from URL (Auctelia has descriptive URLs)
      const urlTitle = this.extractTitleFromUrl()
      if (urlTitle) {
        title = urlTitle
        console.log('[Auctelia Adapter] Using URL title:', title)
      }
    }

    if (!title) {
      title = document.title.split('|')[0].split('-')[0].trim()
      console.log('[Auctelia Adapter] Using document title:', title)
    }

    if (!title || title.length < 3) {
      console.warn('[Auctelia Adapter] Could not extract title')
      return null
    }

    // Extract price from DOM - look for the main price display
    if (!currentBid) {
      console.log('[Auctelia Adapter] Starting DOM price extraction...')

      // First, look for price patterns with € symbol in prominent elements
      const priceElements = document.querySelectorAll('*')
      for (const el of priceElements) {
        // Only check direct text content (not nested)
        const text = el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE
          ? el.textContent?.trim() || ''
          : ''

        if (text && /^\d[\d\s,.]*\s*€$/.test(text)) {
          const price = this.parseNumber(text)
          if (price && price > 0 && price < 1000000) {
            // Check if this element looks like a main price (larger text, bold, etc.)
            const style = window.getComputedStyle(el)
            const fontSize = parseFloat(style.fontSize)
            if (fontSize >= 16) {
              currentBid = price
              console.log('[Auctelia Adapter] Found prominent price:', price, 'fontSize:', fontSize)
              break
            }
          }
        }
      }
    }

    // Try standard selectors
    if (!currentBid) {
      for (const selector of this.selectors.price) {
        const elements = document.querySelectorAll(selector)
        for (const el of elements) {
          const text = el.textContent?.trim()
          if (text) {
            const priceMatch = text.match(/(\d[\d\s,.]*)\s*€/)
            if (priceMatch) {
              const price = this.parseNumber(priceMatch[1])
              if (price && price > 0 && price < 1000000) {
                currentBid = price
                console.log('[Auctelia Adapter] Found price with selector:', selector, ':', price)
                break
              }
            }
          }
        }
        if (currentBid) break
      }
    }

    // Look for "Enchère actuelle" or similar labels
    if (!currentBid) {
      const priceLabels = this.getPriceLabels(locale)
      const allElements = document.querySelectorAll('*')

      for (const el of allElements) {
        const text = el.textContent?.toLowerCase() || ''

        for (const label of priceLabels) {
          if (text.includes(label)) {
            // Found a label, look for price in this element or siblings
            const priceMatch = el.textContent?.match(/(\d[\d\s,.]*)\s*€/)
            if (priceMatch) {
              const price = this.parseNumber(priceMatch[1])
              if (price && price > 0 && price < 1000000) {
                currentBid = price
                console.log('[Auctelia Adapter] Found price near label:', label, ':', price)
                break
              }
            }
          }
        }
        if (currentBid) break
      }
    }

    // Try JSON-LD structured data
    if (!currentBid) {
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]')
      for (const script of jsonLdScripts) {
        try {
          const data = JSON.parse(script.textContent || '')
          const price = data.offers?.price || data.price
          if (price) {
            const parsedPrice = typeof price === 'number' ? price : this.parseNumber(String(price))
            if (parsedPrice && parsedPrice > 0) {
              currentBid = parsedPrice
              console.log('[Auctelia Adapter] Found price from JSON-LD:', currentBid)
              break
            }
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    }

    if (!currentBid) {
      console.warn('[Auctelia Adapter] Could not extract price - setting to 0')
      currentBid = 0
    }

    // Extract lot ID from URL
    const lotId = this.extractLotIdFromUrl()

    // Extract condition
    const conditionText = this.getText(this.selectors.condition) || ''
    const condition = this.parseCondition(conditionText)

    // Extract description
    const description = this.getText(this.selectors.description) || undefined

    // Try to extract brand/model from title
    const { brand, model } = this.extractBrandModel(title)

    // Detect category (Auctelia is mostly industrial equipment)
    const category = this.detectCategory(title, description)

    // Calculate total price with fees
    const totalPrice = calculateTotalPrice(currentBid, this.defaultFees)

    const data: AuctionData = {
      title,
      brand,
      model,
      category,
      condition,
      currentBid,
      currency: this.defaultCurrency,
      fees: this.defaultFees,
      totalPrice,
      siteDomain: this.getDomain(),
      locale,
      lotId,
      lotUrl: this.getUrl(),
      description,
      extractionConfidence: this.getExtractionConfidence(brand, model),
      extractedAt: Date.now(),
    }

    console.log('[Auctelia Adapter] Extracted data:', data)
    return data
  }

  getOverlayMountPoint(): Element | null {
    return document.body
  }

  getMutationConfig(): MutationObserverConfig {
    return {
      targetSelector: 'body',
      options: {
        childList: true,
        subtree: true,
        characterData: true,
      },
      debounceMs: 800,
    }
  }

  private detectLocale(): string {
    const url = window.location.pathname
    const localeMatch = url.match(/^\/([a-z]{2})\//)
    return localeMatch?.[1] || this.defaultLocale
  }

  private getPriceLabels(locale: string): string[] {
    const labels: Record<string, string[]> = {
      fr: ['prix', 'enchère', 'mise à prix', 'montant', 'offre actuelle'],
      en: ['price', 'bid', 'starting price', 'amount', 'current offer'],
      nl: ['prijs', 'bod', 'startprijs', 'bedrag', 'huidig bod'],
    }
    return labels[locale] || labels.fr
  }

  private extractLotIdFromUrl(): string | undefined {
    // Match the ID at the end of URL like /rZ6V9IXb4_u4IBZm_elzU
    const match = window.location.href.match(/\/([a-zA-Z0-9_-]{10,})(?:\?|$)/)
    return match?.[1]
  }

  /**
   * Extract title from URL path
   * Auctelia URLs have descriptive slugs like /tondeuse-autoportee-daewoo-daxrm224/
   */
  private extractTitleFromUrl(): string | null {
    try {
      const path = window.location.pathname
      // Match pattern: /locale/category/title-slug/id
      const match = path.match(/\/[a-z]{2}\/[^\/]+\/([^\/]+)\//)
      if (match && match[1]) {
        // Convert slug to title: tondeuse-autoportee-daewoo-daxrm224 -> Tondeuse autoportee daewoo daxrm224
        const slug = match[1]
        const title = slug
          .split('-')
          .map((word, i) => i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)
          .join(' ')
        return title
      }
    } catch (e) {
      console.error('[Auctelia Adapter] URL title extraction error:', e)
    }
    return null
  }

  /**
   * Extract data from Nuxt hydration data (__NUXT_DATA__ or window.__NUXT__)
   * Auctelia is a Nuxt.js SPA
   */
  private extractFromNuxtData(): { title: string; price: number } | null {
    try {
      // Try window.__NUXT__ (Nuxt 2 style)
      const nuxt2 = (window as any).__NUXT__
      if (nuxt2?.data?.[0]) {
        const data = nuxt2.data[0]
        // Look for product/lot data
        if (data.product || data.lot || data.item) {
          const item = data.product || data.lot || data.item
          const title = item.title || item.name
          const price = item.currentBid || item.price || item.currentPrice
          if (title && price) {
            return { title, price: parseFloat(price) }
          }
        }
      }

      // Try Nuxt 3 style hydration data
      const scripts = document.querySelectorAll('script')
      for (const script of scripts) {
        const content = script.textContent || ''

        // Look for __NUXT_DATA__ or similar patterns
        if (content.includes('__NUXT_DATA__') || content.includes('window.__NUXT__')) {
          // Try to find price and title in the data
          const priceMatch = content.match(/"(?:currentBid|price|currentPrice)"\s*:\s*(\d+(?:\.\d+)?)/i)
          const titleMatch = content.match(/"(?:title|name)"\s*:\s*"([^"]+)"/i)

          if (priceMatch || titleMatch) {
            const price = priceMatch ? parseFloat(priceMatch[1]) : 0
            const title = titleMatch ? titleMatch[1] : ''
            if (price > 0 || title) {
              console.log('[Auctelia Adapter] Found Nuxt data - price:', price, 'title:', title)
              return { title, price }
            }
          }
        }
      }

      // Look for any script with product data
      for (const script of scripts) {
        const content = script.textContent || ''
        if (content.length > 100 && content.length < 50000) {
          // Look for auction/bid related data
          const bidMatch = content.match(/"(?:current_?bid|current_?price|bid_?amount)"\s*:\s*(\d+(?:\.\d+)?)/i)
          if (bidMatch) {
            const price = parseFloat(bidMatch[1])
            if (price > 0 && price < 1000000) {
              console.log('[Auctelia Adapter] Found bid in script:', price)
              return { title: '', price }
            }
          }
        }
      }
    } catch (e) {
      console.error('[Auctelia Adapter] Nuxt data extraction error:', e)
    }
    return null
  }

  private extractBrandModel(title: string): { brand?: string; model?: string } {
    // Industrial equipment brands
    const brands = [
      'Caterpillar', 'CAT', 'John Deere', 'Komatsu', 'Hitachi', 'Volvo', 'Liebherr',
      'JCB', 'Bobcat', 'Kubota', 'Case', 'New Holland', 'Massey Ferguson',
      'Daewoo', 'Hyundai', 'Samsung', 'Doosan', 'Kobelco', 'Sumitomo',
      'Toyota', 'Linde', 'Still', 'Jungheinrich', 'Crown', 'Yale', 'Hyster',
      'Manitou', 'Merlo', 'Claas', 'Fendt', 'Deutz-Fahr', 'Same',
      'Atlas', 'Terex', 'Takeuchi', 'Yanmar', 'Wacker Neuson',
      'Husqvarna', 'Stihl', 'Honda', 'Briggs', 'Kohler',
    ]

    const titleLower = title.toLowerCase()
    let brand: string | undefined

    for (const b of brands) {
      if (titleLower.includes(b.toLowerCase())) {
        brand = b
        break
      }
    }

    const modelMatch = title.match(/(?:model|modèle|type)?\s*([A-Z0-9]+-?[A-Z0-9]+)/i)
    const model = modelMatch?.[1]

    return { brand, model }
  }

  private detectCategory(title: string, description?: string): 'vehicle' | 'product' {
    const text = `${title} ${description || ''}`.toLowerCase()

    const vehicleKeywords = [
      'véhicule', 'vehicule', 'voiture', 'automobile', 'camion', 'fourgon',
      'tracteur', 'chariot', 'élévateur', 'elevateur', 'nacelle', 'pelleteuse',
      'chargeuse', 'bulldozer', 'grue', 'excavatrice', 'mini-pelle',
      'forklift', 'truck', 'loader', 'excavator', 'crane',
    ]

    if (vehicleKeywords.some(kw => text.includes(kw))) {
      return 'vehicle'
    }

    return 'product'
  }

}

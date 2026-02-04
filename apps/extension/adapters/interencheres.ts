import type { AuctionData, AuctionFees, Currency, MutationObserverConfig } from '@auction-comparator/shared'
import { calculateTotalPrice } from '@auction-comparator/shared'
import { BaseAdapter } from './base'

/**
 * Adapter for Interencheres auction site
 * NOTE: CSS selectors need to be verified against the live site
 */
export class InterencheresAdapter extends BaseAdapter {

  id = 'interencheres'
  name = 'Interenchères'
  urlPatterns = [
    /interencheres\.com/i,
    /interencheres\.fr/i,
  ]
  defaultCurrency: Currency = 'EUR'
  defaultLocale = 'fr'
  defaultFees: AuctionFees = {
    buyerPremium: 0.25, // 25% typical buyer's premium
    vat: 0, // VAT usually included
  }

  // TODO: Verify these selectors against the live Interencheres site
  // These are common patterns that might work
  private selectors = {
    // Title extraction - try multiple common patterns
    title: [
      'h1',
      '[class*="title"]',
      '[class*="lot-title"]',
      '[class*="titre"]',
      '.product-title',
    ],

    // Price extraction - try multiple common patterns
    price: [
      '[class*="price"]',
      '[class*="prix"]',
      '[class*="bid"]',
      '[class*="enchere"]',
      '[class*="amount"]',
      '[class*="montant"]',
    ],

    // Description/condition
    description: '[class*="description"], [class*="detail"]',
    condition: '[class*="condition"], [class*="etat"]',
  }

  isLotPage(): boolean {
    const url = window.location.href.toLowerCase()

    // Check for common lot page URL patterns
    // Example: https://www.interencheres.com/.../lot-85262793.html
    const lotPatterns = [
      /\/lot-\d+/, // lot-85262793.html
      /\/lot\//, // /lot/123
      /\/vente\/.*\/\d+/, // /vente/xxx/123
      /lotid=/, // ?lotid=123
      /\/fiche\//, // /fiche/
    ]

    const isLotUrl = lotPatterns.some(p => p.test(url))
    console.log('[Interencheres Adapter] URL check:', url, 'isLot:', isLotUrl)

    return isLotUrl
  }

  extractData(): AuctionData | null {
    console.log('[Interencheres Adapter] Attempting to extract data...')
    console.log('[Interencheres Adapter] URL:', window.location.href)

    // Extract title - try multiple selectors
    let title: string | null = null
    for (const selector of this.selectors.title) {
      title = this.getText(selector)
      if (title && title.length > 5) {
        console.log('[Interencheres Adapter] Found title with selector:', selector, ':', title.slice(0, 50))
        break
      }
    }

    if (!title) {
      // Fallback to document title
      title = document.title.split('|')[0].split('-')[0].trim()
      console.log('[Interencheres Adapter] Using document title:', title)
    }

    if (!title || title.length < 3) {
      console.warn('[Interencheres Adapter] Could not extract title')
      return null
    }

    // Extract price - try multiple selectors
    let currentBid: number | null = null
    console.log('[Interencheres Adapter] Starting price extraction...')

    for (const selector of this.selectors.price) {
      const elements = document.querySelectorAll(selector)
      console.log(`[Interencheres Adapter] Selector "${selector}" found ${elements.length} elements`)
      for (const el of elements) {
        const text = el.textContent?.trim()
        if (text) {
          const price = this.parseNumber(text)
          console.log(`[Interencheres Adapter] Text: "${text.slice(0, 30)}" -> price: ${price}`)
          if (price && price > 0) {
            currentBid = price
            console.log('[Interencheres Adapter] Found price:', price, 'with selector:', selector)
            break
          }
        }
      }
      if (currentBid) break
    }

    // Try specific price patterns in the page
    if (!currentBid) {
      console.log('[Interencheres Adapter] Trying label-based price extraction...')
      // Look for "Enchère actuelle", "Prix actuel", "Mise à prix"
      const priceLabels = ['enchère actuelle', 'prix actuel', 'mise à prix', 'estimation', 'enchère']

      // More efficient: search in body text first
      const bodyText = document.body.innerText.toLowerCase()
      for (const label of priceLabels) {
        if (bodyText.includes(label)) {
          console.log(`[Interencheres Adapter] Found label "${label}" in page`)
        }
      }

      // Find elements containing price labels
      const candidates = document.querySelectorAll('span, div, p, td, h1, h2, h3, h4, h5')
      for (const el of candidates) {
        const text = el.textContent?.toLowerCase() || ''
        if (priceLabels.some(label => text.includes(label))) {
          // Look for price in this element
          const priceMatch = el.textContent?.match(/(\d[\d\s,.]*)\s*€/)
          if (priceMatch) {
            const price = this.parseNumber(priceMatch[1])
            if (price && price > 0) {
              currentBid = price
              console.log('[Interencheres Adapter] Found price near label:', price, 'in:', el.textContent?.slice(0, 50))
              break
            }
          }
        }
      }
    }

    // If still no price, try to find any element with euro symbol (be more aggressive)
    if (!currentBid) {
      console.log('[Interencheres Adapter] Trying full text scan for prices...')
      const allText = document.body.innerText
      // Match prices like "1 500 €", "15000€", "1,500.00 €"
      const priceMatches = allText.match(/(\d[\d\s,.]*)\s*€/g) || []
      console.log(`[Interencheres Adapter] Found ${priceMatches.length} price patterns in page`)

      // Filter for reasonable prices (> 10€) and take the largest as likely the main price
      const prices = priceMatches
        .map(match => {
          const numMatch = match.match(/(\d[\d\s,.]*)/)
          return numMatch ? this.parseNumber(numMatch[1]) : null
        })
        .filter((p): p is number => p !== null && p > 10)
        .sort((a, b) => b - a) // Sort descending

      console.log('[Interencheres Adapter] Filtered prices:', prices.slice(0, 5))

      if (prices.length > 0) {
        // Take the second largest price if available (first might be estimate/max)
        // or just the largest if only one
        currentBid = prices.length > 2 ? prices[1] : prices[0]
        console.log('[Interencheres Adapter] Found price from text scan:', currentBid, 'from', prices.length, 'candidates')
      }
    }

    // Try structured data (JSON-LD or microdata)
    if (!currentBid) {
      console.log('[Interencheres Adapter] Trying structured data...')

      // Try itemprop="price"
      const priceEl = document.querySelector('[itemprop="price"]')
      if (priceEl) {
        const priceContent = priceEl.getAttribute('content') || priceEl.textContent
        const price = this.parseNumber(priceContent)
        if (price && price > 0) {
          currentBid = price
          console.log('[Interencheres Adapter] Found price from itemprop:', price)
        }
      }

      // Try JSON-LD
      if (!currentBid) {
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]')
        for (const script of jsonLdScripts) {
          try {
            const data = JSON.parse(script.textContent || '')
            const price = data.offers?.price || data.price
            if (price) {
              currentBid = typeof price === 'number' ? price : this.parseNumber(String(price))
              if (currentBid && currentBid > 0) {
                console.log('[Interencheres Adapter] Found price from JSON-LD:', currentBid)
                break
              }
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      }
    }

    if (!currentBid) {
      console.warn('[Interencheres Adapter] Could not extract price - setting to 0 to continue')
      currentBid = 0 // Continue with 0 to at least show the title
    }

    console.log('[Interencheres Adapter] Final currentBid:', currentBid)

    // Extract lot ID from URL
    const lotId = this.extractLotIdFromUrl()

    // Extract condition
    const conditionText = this.getText(this.selectors.condition) || ''
    const condition = this.parseCondition(conditionText)

    // Extract description
    const description = this.getText(this.selectors.description) || undefined

    // Try to extract brand/model from title
    const { brand, model } = this.extractBrandModel(title)

    // Detect if this is a vehicle listing
    const category = this.detectCategory(title, description)

    // Extract year (for vehicles)
    const year = category === 'vehicle' ? this.extractYear(title, description) : undefined

    // Calculate total price with fees
    const totalPrice = calculateTotalPrice(currentBid, this.defaultFees)

    const data: AuctionData = {
      title,
      brand,
      model,
      year,
      category,
      condition,
      currentBid,
      currency: this.defaultCurrency,
      fees: this.defaultFees,
      totalPrice,
      siteDomain: this.getDomain(),
      locale: this.defaultLocale,
      lotId,
      lotUrl: this.getUrl(),
      description,
      extractionConfidence: this.getExtractionConfidence(brand, model),
      extractedAt: Date.now(),
    }

    console.log('[Interencheres Adapter] Extracted data:', data)
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

  private extractLotIdFromUrl(): string | undefined {
    // Match lot-85262793.html or /123
    const match = window.location.href.match(/lot-(\d+)|\/(\d+)(?:\?|$|\/|#|\.html)/)
    return match?.[1] || match?.[2]
  }

  private extractBrandModel(title: string): { brand?: string; model?: string } {
    // Common brands in auctions
    const brands = [
      'Apple',
      'iPhone',
      'iPad',
      'MacBook',
      'Samsung',
      'Sony',
      'Canon',
      'Nikon',
      'Leica',
      'Rolex',
      'Omega',
      'Cartier',
      'Hermès',
      'Hermes',
      'Louis Vuitton',
      'Chanel',
      'Dior',
      'BMW',
      'Mercedes',
      'Audi',
      'Porsche',
      'Ferrari',
      'Lamborghini',
      'Bose',
      'JBL',
      'Dyson',
      'KitchenAid',
      'Nespresso',
    ]

    const titleLower = title.toLowerCase()
    let brand: string | undefined

    for (const b of brands) {
      if (titleLower.includes(b.toLowerCase())) {
        brand = b
        break
      }
    }

    // Try to extract model numbers (e.g., "iPhone 15 Pro", "Model X")
    const modelMatch = title.match(/(?:model|modèle)?\s*([A-Z0-9]+-?[A-Z0-9]+)/i)
    const model = modelMatch?.[1]

    return { brand, model }
  }

  private detectCategory(title: string, description?: string): 'vehicle' | 'product' {
    const url = window.location.href.toLowerCase()
    const text = `${url} ${title} ${description || ''}`.toLowerCase()

    // URL patterns indicating vehicles
    const vehicleUrlPatterns = [
      /vehicule/,
      /voiture/,
      /automobile/,
      /auto-moto/,
      /moto/,
      /camion/,
      /utilitaire/,
    ]

    if (vehicleUrlPatterns.some(p => p.test(url))) {
      console.log('[Interencheres Adapter] Detected vehicle from URL')
      return 'vehicle'
    }

    // Keywords indicating vehicles in title/description
    const vehicleKeywords = [
      // Car brands
      'renault',
      'peugeot',
      'citroen',
      'citroën',
      'volkswagen',
      'audi',
      'bmw',
      'mercedes',
      'ford',
      'opel',
      'fiat',
      'toyota',
      'nissan',
      'honda',
      'hyundai',
      'kia',
      'seat',
      'skoda',
      'dacia',
      'suzuki',
      'mazda',
      'volvo',
      'mini',
      'jeep',
      'land rover',
      'porsche',
      'ferrari',
      'lamborghini',
      'maserati',
      'alfa romeo',
      'jaguar',
      // Vehicle types
      'voiture',
      'véhicule',
      'vehicule',
      'automobile',
      'berline',
      'break',
      'suv',
      'monospace',
      'cabriolet',
      'coupé',
      'coupe',
      'pick-up',
      'pickup',
      '4x4',
      'fourgon',
      'utilitaire',
      'camionnette',
      'camion',
      'tracteur',
      'moto',
      'scooter',
      'quad',
      'motocyclette',
      // Vehicle specific terms
      'immatriculation',
      'kilométrage',
      'kilometrage',
      'carte grise',
      'cv fiscaux',
      'essence',
      'diesel',
      'hybride',
      'electrique',
      'électrique',
      'boite auto',
      'boîte manuelle',
      'cylindrée',
      'cylindree',
    ]

    const hasVehicleKeyword = vehicleKeywords.some(kw => text.includes(kw))

    if (hasVehicleKeyword) {
      console.log('[Interencheres Adapter] Detected vehicle from keywords')
      return 'vehicle'
    }

    return 'product'
  }

  private extractYear(title: string, description?: string): number | undefined {
    const text = `${title} ${description || ''}`

    // Try to find year in title/description (e.g., "2019", "2020")
    const yearMatch = text.match(/\b(20\d{2}|19\d{2})\b/)
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10)
      const currentYear = new Date().getFullYear()
      if (year >= 1990 && year <= currentYear + 1) {
        console.log('[Interencheres Adapter] Found year:', year)
        return year
      }
    }

    // Try to find year near specific keywords
    const pageText = document.body.innerText
    const yearPatterns = [
      /(?:année|annee|mise en circulation|1ère immat|immatriculation)[:\s]*(\d{4})/i,
      /(\d{4})\s*(?:km|kms|kilomètres)/i,
      /modèle\s+(\d{4})/i,
    ]

    for (const pattern of yearPatterns) {
      const match = pageText.match(pattern)
      if (match) {
        const year = parseInt(match[1], 10)
        const currentYear = new Date().getFullYear()
        if (year >= 1990 && year <= currentYear + 1) {
          console.log('[Interencheres Adapter] Found year from page:', year)
          return year
        }
      }
    }

    return undefined
  }

}

import type { AuctionData, AuctionFees, Currency, MutationObserverConfig } from '@auction-comparator/shared'
import { BaseAdapter } from './base'

/**
 * Adapter for encheres-domaine.gouv.fr (French government auction site)
 */
export class EncheresDomaineAdapter extends BaseAdapter {

  id = 'encheres-domaine'
  name = 'Enchères Domaine (Gouv.fr)'
  urlPatterns = [
    /encheres-domaine\.gouv\.fr/i,
  ]
  defaultCurrency: Currency = 'EUR'
  defaultLocale = 'fr'
  // Government auctions typically have 15% buyer premium
  defaultFees: AuctionFees = {
    buyerPremium: 0.15,
    vat: 0,
  }

  isLotPage(): boolean {
    const url = window.location.href.toLowerCase()
    // Lot pages have pattern: /lot/xxx.html
    return /\/lot\/[^/]+\.html/i.test(url)
  }

  extractData(): AuctionData | null {
    console.log('[EncheresDomaineAdapter] Attempting to extract data...')
    console.log('[EncheresDomaineAdapter] Current URL:', window.location.href)
    console.log('[EncheresDomaineAdapter] Document ready state:', document.readyState)

    // Debug: log page structure
    const h1s = document.querySelectorAll('h1')
    const h2s = document.querySelectorAll('h2')
    console.log('[EncheresDomaineAdapter] Found h1 elements:', h1s.length)
    console.log('[EncheresDomaineAdapter] Found h2 elements:', h2s.length)
    h1s.forEach((h, i) => console.log(`[EncheresDomaineAdapter] h1[${i}]:`, h.textContent?.slice(0, 100)))

    // Extract the main description/title
    // Try multiple selectors that might contain the lot description
    let title = this.extractTitle()
    console.log('[EncheresDomaineAdapter] Raw extracted title:', title?.slice(0, 150))

    // If primary extraction failed, try fallback immediately
    if (!title || title.length < 5) {
      console.warn('[EncheresDomaineAdapter] Primary extraction failed, trying fallback')
      title = this.getFallbackTitle()
      console.log('[EncheresDomaineAdapter] Fallback title:', title?.slice(0, 100))
    }

    // If still no title, try extracting from visible text
    if (!title || title.length < 5) {
      console.warn('[EncheresDomaineAdapter] Fallback failed, trying visible text extraction')
      title = this.extractFromVisibleText()
      console.log('[EncheresDomaineAdapter] Visible text title:', title?.slice(0, 100))
    }

    if (!title || title.length < 5) {
      console.error('[EncheresDomaineAdapter] No title found after all attempts')
      return null
    }

    const finalTitle = title
    console.log('[EncheresDomaineAdapter] Final title:', finalTitle.slice(0, 100))

    // Extract price - look for "Enchère actuelle" or similar
    const currentBid = this.extractPrice()
    console.log('[EncheresDomaineAdapter] Extracted price:', currentBid)

    if (!currentBid) {
      console.warn('[EncheresDomaineAdapter] Could not extract price - using 0')
      // Don't return null, continue with price = 0 so we at least get the title
    }

    const finalPrice = currentBid || 0
    console.log('[EncheresDomaineAdapter] finalPrice:', finalPrice)

    // Detect category from title
    const category = this.detectCategory(finalTitle)

    // Extract brand if it's a vehicle
    const brand = this.extractBrand(finalTitle)
    console.log('[EncheresDomaineAdapter] Extracted brand:', brand)

    // Extract model
    const model = this.extractModel(finalTitle)
    console.log('[EncheresDomaineAdapter] Extracted model:', model)

    // Extract condition from description
    const condition = this.parseCondition(finalTitle)

    // Calculate total with buyer premium
    const totalPrice = finalPrice * (1 + this.defaultFees.buyerPremium)
    console.log('[EncheresDomaineAdapter] Calculated totalPrice:', totalPrice, '(finalPrice:', finalPrice, '* 1.15)')

    const data: AuctionData = {
      title: this.cleanTitle(finalTitle),
      brand,
      model,
      category,
      condition,
      currentBid: finalPrice,
      currency: this.defaultCurrency,
      fees: this.defaultFees,
      totalPrice,
      siteDomain: this.getDomain(),
      locale: this.defaultLocale,
      lotUrl: this.getUrl(),
      description: finalTitle, // Full description
      extractionConfidence: this.getExtractionConfidence(brand, model),
      extractedAt: Date.now(),
    }

    console.log('[EncheresDomaineAdapter] Final extracted data:', data)
    return data
  }

  private getFallbackTitle(): string | null {
    // Try og:title
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
    console.log('[EncheresDomaineAdapter] og:title:', ogTitle?.slice(0, 80))
    if (ogTitle && !ogTitle.toLowerCase().includes('enchères du domaine') && ogTitle.length > 10) {
      return ogTitle
    }

    // Try meta description
    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content')
    console.log('[EncheresDomaineAdapter] meta description:', metaDesc?.slice(0, 80))
    if (metaDesc && metaDesc.length > 20 && this.looksLikeLotDescription(metaDesc)) {
      return metaDesc
    }

    // Try h1 (but not site title)
    const h1s = document.querySelectorAll('h1')
    for (const h1 of h1s) {
      const text = h1.textContent?.trim()
      if (text && text.length > 10 && !text.toLowerCase().includes('enchères du domaine')) {
        console.log('[EncheresDomaineAdapter] Using h1:', text.slice(0, 80))
        return text
      }
    }

    // Try h2 elements
    const h2s = document.querySelectorAll('h2')
    for (const h2 of h2s) {
      const text = h2.textContent?.trim()
      if (text && text.length > 15 && this.looksLikeLotDescription(text)) {
        console.log('[EncheresDomaineAdapter] Using h2:', text.slice(0, 80))
        return text
      }
    }

    // Try the page URL - often contains the item name
    const urlMatch = window.location.pathname.match(/\/lot\/([^.]+)/)
    if (urlMatch && urlMatch[1]) {
      // Convert slug to title: "scooter-yamaha-tmax" -> "Scooter Yamaha Tmax"
      const urlTitle = urlMatch[1]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
      console.log('[EncheresDomaineAdapter] Using URL slug:', urlTitle)
      return urlTitle
    }

    return null
  }

  private extractFromVisibleText(): string | null {
    // Look for text that contains vehicle/product indicators in any element
    const allElements = document.querySelectorAll('p, div, span, td, li, article, section')

    for (const el of allElements) {
      // Skip hidden elements
      const style = window.getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden') continue

      // Get direct text content (not nested)
      const text = el.textContent?.trim()
      if (!text || text.length < 30 || text.length > 500) continue

      // Check if this looks like a lot description
      if (this.looksLikeLotDescription(text)) {
        const score = this.scoreAsDescription(text)
        if (score >= 10) {
          console.log('[EncheresDomaineAdapter] Found via visible text (score:', score, '):', text.slice(0, 80))
          return text
        }
      }
    }

    return null
  }

  private extractTitle(): string | null {
    // Try different selectors for the lot description
    const selectors = [
      // Government site specific selectors
      '.fiche-lot',
      '.lot-detail',
      '.lot-info',
      '.product-title',
      '.item-title',
      '.auction-title',
      '.sale-item-title',
      // Main content selectors
      '.lot-description',
      '.description-lot',
      '#description',
      '.detail-lot',
      '[itemprop="description"]',
      '[itemprop="name"]',
      // Data attributes
      '[data-lot-title]',
      '[data-description]',
      // Article content
      'article h1',
      'article h2',
      'article .title',
      'article p',
      '.content p',
      '.lot-content p',
      // Generic content areas
      'main h1',
      'main h2',
      'main p',
      '.main-content p',
      // Card/panel structures
      '.card-title',
      '.panel-title',
      '.card-body h1',
      '.card-body h2',
      // H1/H2 as fallback (but not first one if it's site title)
      '.lot-title',
      'h2.title',
      'h1.title',
    ]

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector)
      for (const el of elements) {
        const text = el.textContent?.trim()
        // Look for text that looks like a lot description (contains vehicle/product info)
        if (text && text.length > 20 && this.looksLikeLotDescription(text)) {
          return text
        }
      }
    }

    // Fallback: find the longest paragraph that looks like a description
    const allParagraphs = document.querySelectorAll('p, div.description, div.content')
    let bestMatch: string | null = null
    let bestScore = 0

    for (const p of allParagraphs) {
      const text = p.textContent?.trim()
      if (!text || text.length < 30) continue

      const score = this.scoreAsDescription(text)
      if (score > bestScore) {
        bestScore = score
        bestMatch = text
      }
    }

    return bestMatch
  }

  private looksLikeLotDescription(text: string): boolean {
    const lower = text.toLowerCase()
    // Should contain product/vehicle indicators
    const indicators = [
      'imm.', 'immatricul', 'n° de série', 'numéro de série', 'serie',
      'mise en circulation', 'km', 'kilométrage',
      'essence', 'diesel', 'électrique', 'hybride',
      'marque', 'modèle', 'type',
      'avec', 'sans', 'état',
      'enlèvement', 'retrait',
      'agrasc', 'ref.', 'réf.',
    ]
    return indicators.some(ind => lower.includes(ind))
  }

  private scoreAsDescription(text: string): number {
    const lower = text.toLowerCase()
    let score = 0

    // Vehicle indicators
    if (/\b(scooter|moto|voiture|véhicule|auto|camion|utilitaire)\b/i.test(text)) score += 10
    if (/\b(yamaha|honda|suzuki|kawasaki|renault|peugeot|citroen|bmw|mercedes|audi|vw|volkswagen|ford|opel|fiat|toyota|nissan)\b/i.test(text)) score += 15
    if (/imm\.|immatricul/i.test(text)) score += 10
    if (/n[°º]?\s*de\s*série/i.test(text)) score += 10
    if (/mise\s*en\s*circulation/i.test(text)) score += 5
    if (/\d+\s*km\b/i.test(text)) score += 5
    if (/essence|diesel|électrique/i.test(text)) score += 5
    if (/agrasc/i.test(text)) score += 5 // Government reference

    // Penalty for navigation/menu text
    if (/accueil|menu|connexion|inscription|panier/i.test(text)) score -= 20
    if (text.split(' ').length < 10) score -= 5 // Too short

    return score
  }

  private extractPrice(): number | null {
    // Look for price elements
    const priceSelectors = [
      '[class*="enchere"]',
      '[class*="price"]',
      '[class*="prix"]',
      '[class*="bid"]',
      '.current-bid',
      '.prix-actuel',
      '.enchere-actuelle',
    ]

    for (const selector of priceSelectors) {
      const elements = document.querySelectorAll(selector)
      for (const el of elements) {
        const text = el.textContent || ''
        const price = this.parsePrice(text)
        if (price && price > 0) {
          return price
        }
      }
    }

    // Fallback: search for price patterns in the page
    const bodyText = document.body.innerText

    // Use the same pattern that works in console: /(\d[\d\s,.]*)\s*€/g
    const allPrices = bodyText.match(/(\d[\d\s,.]*)\s*€/g) || []
    console.log('[EncheresDomaineAdapter] All price matches:', allPrices)

    // Parse all prices and find reasonable ones
    const parsedPrices = allPrices
      .map(match => {
        const numMatch = match.match(/(\d[\d\s,.]*)/)
        if (numMatch) {
          // Remove spaces, replace comma with dot for parsing
          const cleaned = numMatch[1].replace(/\s/g, '').replace(',', '.')
          return parseFloat(cleaned)
        }
        return null
      })
      .filter((p): p is number => p !== null && !isNaN(p) && p > 100)
      .sort((a, b) => b - a) // Sort descending

    console.log('[EncheresDomaineAdapter] Parsed prices:', parsedPrices)

    if (parsedPrices.length > 0) {
      // Return the largest reasonable price (likely the current bid)
      return parsedPrices[0]
    }

    return null
  }

  private parsePrice(text: string): number | null {
    // Extract number from price text like "1 500 €" or "1500€"
    const match = text.match(/(\d[\d\s.,]*)\s*€/)
    if (match && match[1]) {
      return this.parseNumber(match[1])
    }
    return null
  }

  private detectCategory(title: string): 'vehicle' | 'product' {
    const lower = title.toLowerCase()

    // All motorized vehicles should return 'vehicle' for proper search handling
    if (/scooter|moto|motocycl|voiture|auto|véhicule|berline|suv|4x4|camion|utilitaire|fourgon|tracteur|engin/i.test(lower)) {
      return 'vehicle'
    }
    if (/bateau|navire|yacht|jet-?ski/i.test(lower)) {
      return 'vehicle' // Boats are also vehicles for search purposes
    }

    return 'product'
  }

  private extractBrand(title: string): string | undefined {
    // Common vehicle brands
    const brands = [
      'Yamaha', 'Honda', 'Suzuki', 'Kawasaki', 'BMW', 'Ducati', 'Harley-Davidson', 'Triumph',
      'Renault', 'Peugeot', 'Citroën', 'Citroen', 'Volkswagen', 'VW', 'Audi', 'Mercedes', 'BMW',
      'Ford', 'Opel', 'Fiat', 'Toyota', 'Nissan', 'Honda', 'Hyundai', 'Kia', 'Mazda',
      'Porsche', 'Ferrari', 'Lamborghini', 'Maserati', 'Jaguar', 'Land Rover', 'Volvo',
      'Piaggio', 'Vespa', 'Aprilia', 'MV Agusta', 'KTM', 'Benelli',
    ]

    // First check the title
    for (const brand of brands) {
      if (new RegExp(`\\b${brand}\\b`, 'i').test(title)) {
        return brand
      }
    }

    // Also check the URL - often contains brand in slug
    const url = window.location.pathname.toLowerCase()
    for (const brand of brands) {
      if (url.includes(brand.toLowerCase())) {
        console.log('[EncheresDomaineAdapter] Brand found in URL:', brand)
        return brand
      }
    }

    return undefined
  }

  private extractModel(title: string): string | undefined {
    // Try to extract model after brand
    // Pattern: "Brand Model" or "Brand Model-XXX"
    const modelPatterns = [
      /yamaha\s+([a-z0-9-]+(?:\s+[a-z0-9]+)?)/i,
      /honda\s+([a-z0-9-]+(?:\s+[a-z0-9]+)?)/i,
      /suzuki\s+([a-z0-9-]+(?:\s+[a-z0-9]+)?)/i,
      /bmw\s+([a-z0-9-]+(?:\s+[a-z0-9]+)?)/i,
      /renault\s+([a-z0-9-]+(?:\s+[a-z0-9]+)?)/i,
      /peugeot\s+(\d{3,4}(?:\s+[a-z0-9]+)?)/i,
      /citro[eë]n\s+([a-z0-9-]+(?:\s+[a-z0-9]+)?)/i,
      // Generic: word after known prefix
      /(?:scooter|moto|voiture)\s+\w+\s+([a-z0-9-]+)/i,
    ]

    for (const pattern of modelPatterns) {
      const match = title.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    // Also try extracting from URL
    // URL pattern: /lot/scooter-yamaha-tmax.html -> tmax
    const urlMatch = window.location.pathname.match(/\/lot\/[^/]*?-(t-?max|xmax|nmax|pcx|sh|forza|cb\d+|cbr\d+|mt-?\d+|yzf|r1|r6|clio|megane|208|308|c3|c4|golf|polo|a3|a4|serie-?\d|class-?[a-z])[^/]*/i)
    if (urlMatch && urlMatch[1]) {
      const model = urlMatch[1].replace(/-/g, ' ').toUpperCase()
      console.log('[EncheresDomaineAdapter] Model found in URL:', model)
      return model
    }

    // Generic: extract word after brand in URL
    const genericUrlMatch = window.location.pathname.match(/(?:yamaha|honda|suzuki|bmw|renault|peugeot|citroen|volkswagen|audi|mercedes)-([a-z0-9]+)/i)
    if (genericUrlMatch && genericUrlMatch[1]) {
      const model = genericUrlMatch[1].toUpperCase()
      console.log('[EncheresDomaineAdapter] Model found in URL (generic):', model)
      return model
    }

    return undefined
  }

  private cleanTitle(title: string): string {
    // Clean up the title for display and search
    let clean = title
      // Remove reference numbers
      .replace(/\(réf\.[^)]+\)/gi, '')
      .replace(/agrasc[^.]*\./gi, '')
      // Remove pickup/delivery instructions
      .replace(/enlèvement[^.]*\./gi, '')
      .replace(/retrait[^.]*\./gi, '')
      .replace(/des frais supplémentaires[^.]*\./gi, '')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim()

    // Limit to first sentence or 200 chars for cleaner title
    const firstSentence = clean.match(/^[^.]+/)
    if (firstSentence && firstSentence[0].length > 20) {
      clean = firstSentence[0]
    } else if (clean.length > 200) {
      clean = clean.slice(0, 200) + '...'
    }

    return clean
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
      debounceMs: 1000,
    }
  }
}

import type { AuctionData, AuctionFees, Currency, MutationObserverConfig } from '@auction-comparator/shared'
import { calculateTotalPrice } from '@auction-comparator/shared'
import { BaseAdapter } from './base'

/**
 * Vehicle specifications extracted from page data
 */
interface VehicleSpecs {
  brand: string
  model: string
  year?: number
  fuel?: string
  version?: string
  mileage?: number
}

/**
 * Adapter for Agorastore auction site
 * Public sector surplus sales
 */
export class AgorastoreAdapter extends BaseAdapter {

  id = 'agorastore'
  name = 'Agorastore'
  urlPatterns = [
    /agorastore\.fr/i,
  ]
  defaultCurrency: Currency = 'EUR'
  defaultLocale = 'fr'
  defaultFees: AuctionFees = {
    buyerPremium: 0.10, // 10% typical buyer's premium
    vat: 0, // VAT usually included
  }

  private selectors = {
    // Title extraction
    title: [
      'h1.product-title',
      'h1[class*="title"]',
      '.product-name h1',
      '.product-detail h1',
      'h1',
    ],

    // Price extraction
    price: [
      '.product-price',
      '.current-price',
      '[class*="price"]',
      '[class*="prix"]',
      '.bid-amount',
    ],

    // Description/condition
    description: '.product-description, .description-content, [class*="description"]',
    condition: '[class*="condition"], [class*="etat"], .product-state',
  }

  isLotPage(): boolean {
    const url = window.location.href.toLowerCase()

    // Agorastore lot pages have patterns like:
    // https://www.agorastore.fr/vente-occasion/vehicules-legers-2-roues/vehicules-de-tourisme/peugeot-expert-1-6-hdi-120-cv-annee-2017-123-000-kms-407717.aspx
    const lotPatterns = [
      /\/vente-occasion\/.*-\d+\.aspx/i,
      /\/annonce\//,
      /\/lot\//,
      /\/fiche\//,
      /-\d+\.aspx$/,
    ]

    const isLotUrl = lotPatterns.some(p => p.test(url))
    console.log('[Agorastore Adapter] URL check:', url, 'isLot:', isLotUrl)

    return isLotUrl
  }

  extractData(): AuctionData | null {
    console.log('[Agorastore Adapter] Attempting to extract data...')
    console.log('[Agorastore Adapter] URL:', window.location.href)

    // Try to extract vehicle specifications from embedded JavaScript (most detailed)
    const vehicleSpecs = this.extractVehicleSpecs()
    console.log('[Agorastore Adapter] Vehicle specs:', vehicleSpecs)

    // Try to extract from JSON-LD first (most reliable for price)
    const jsonLdData = this.extractFromJsonLd()
    let title = jsonLdData?.title || null
    let currentBid = jsonLdData?.price || null

    console.log('[Agorastore Adapter] JSON-LD data:', jsonLdData)

    // Try to extract from embedded saleState object
    if (!currentBid) {
      const saleStatePrice = this.extractFromSaleState()
      if (saleStatePrice) {
        currentBid = saleStatePrice
        console.log('[Agorastore Adapter] Found price from saleState:', currentBid)
      }
    }

    // Fallback: Extract title from selectors
    if (!title) {
      for (const selector of this.selectors.title) {
        title = this.getText(selector)
        if (title && title.length > 5) {
          console.log('[Agorastore Adapter] Found title with selector:', selector, ':', title.slice(0, 50))
          break
        }
      }
    }

    if (!title) {
      title = document.title.split('|')[0].split('-')[0].trim()
      console.log('[Agorastore Adapter] Using document title:', title)
    }

    if (!title || title.length < 3) {
      console.warn('[Agorastore Adapter] Could not extract title')
      return null
    }

    // Fallback: Extract price from DOM selectors
    if (!currentBid) {
      console.log('[Agorastore Adapter] Starting DOM price extraction...')

      for (const selector of this.selectors.price) {
        const elements = document.querySelectorAll(selector)
        console.log(`[Agorastore Adapter] Selector "${selector}" found ${elements.length} elements`)
        for (const el of elements) {
          const text = el.textContent?.trim()
          if (text) {
            const price = this.parseNumber(text)
            console.log(`[Agorastore Adapter] Text: "${text.slice(0, 30)}" -> price: ${price}`)
            if (price && price > 0) {
              currentBid = price
              console.log('[Agorastore Adapter] Found price:', price, 'with selector:', selector)
              break
            }
          }
        }
        if (currentBid) break
      }
    }

    if (!currentBid) {
      console.warn('[Agorastore Adapter] Could not extract price - setting to 0')
      currentBid = 0
    }

    // Extract lot ID from URL
    const lotId = this.extractLotIdFromUrl()

    // Extract condition
    const conditionText = this.getText(this.selectors.condition) || ''
    const condition = this.parseCondition(conditionText)

    // Extract description
    const description = this.getText(this.selectors.description) || undefined

    // Use vehicle specs if available, otherwise try URL slug, then title parsing
    let brand: string | undefined
    let model: string | undefined
    let specsUsed: VehicleSpecs | null = vehicleSpecs

    // Try URL slug extraction if JS extraction failed
    if (!specsUsed) {
      specsUsed = this.extractFromUrlSlug()
      console.log('[Agorastore Adapter] URL slug specs:', specsUsed)
    }

    if (specsUsed) {
      brand = specsUsed.brand
      model = specsUsed.model
      // Build a better title from vehicle specs for search
      title = this.buildVehicleTitle(specsUsed, title)
      console.log('[Agorastore Adapter] Built vehicle title:', title)
    } else {
      const extracted = this.extractBrandModel(title)
      brand = extracted.brand
      model = extracted.model
    }

    // Detect category
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
      locale: this.defaultLocale,
      lotId,
      lotUrl: this.getUrl(),
      description,
      extractionConfidence: vehicleSpecs ? 'high' : this.getExtractionConfidence(brand, model),
      extractedAt: Date.now(),
    }

    console.log('[Agorastore Adapter] Extracted data:', data)
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
    // Match patterns like -407717.aspx or /lot/123
    const match = window.location.href.match(/-(\d+)\.aspx|\/(\d+)(?:\?|$|\/|#)/)
    return match?.[1] || match?.[2]
  }

  /**
   * Extract data from JSON-LD structured data
   * Agorastore embeds Product schema with offers
   */
  private extractFromJsonLd(): { title: string; price: number } | null {
    try {
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]')
      for (const script of jsonLdScripts) {
        const data = JSON.parse(script.textContent || '')

        // Handle both single object and array formats
        const items = Array.isArray(data) ? data : [data]

        for (const item of items) {
          if (item['@type'] === 'Product') {
            const title = item.name
            let price: number | null = null

            // Extract price from offers
            if (item.offers) {
              const offers = Array.isArray(item.offers) ? item.offers : [item.offers]
              for (const offer of offers) {
                if (offer.price) {
                  price = parseFloat(String(offer.price))
                  if (!isNaN(price) && price > 0) {
                    console.log('[Agorastore Adapter] Found JSON-LD price:', price)
                    break
                  }
                }
              }
            }

            if (title && price && price > 0) {
              return { title, price }
            }
          }
        }
      }
    } catch (e) {
      console.error('[Agorastore Adapter] JSON-LD parse error:', e)
    }
    return null
  }

  /**
   * Extract price from embedded saleState JavaScript object
   * Agorastore embeds auction state in a script tag
   */
  private extractFromSaleState(): number | null {
    try {
      // Look for saleState in script tags
      const scripts = document.querySelectorAll('script:not([src])')
      for (const script of scripts) {
        const content = script.textContent || ''

        // Try to find saleState object
        const saleStateMatch = content.match(/saleState\s*[=:]\s*(\{[\s\S]*?\})\s*[,;]/)
        if (saleStateMatch) {
          try {
            const saleState = JSON.parse(saleStateMatch[1])
            if (saleState.currentPrice && typeof saleState.currentPrice === 'number') {
              console.log('[Agorastore Adapter] Found saleState.currentPrice:', saleState.currentPrice)
              return saleState.currentPrice
            }
          } catch {
            // Try a more lenient regex for the price
          }
        }

        // Alternative: look for currentPrice directly
        const priceMatch = content.match(/"currentPrice"\s*:\s*(\d+(?:\.\d+)?)/i)
        if (priceMatch) {
          const price = parseFloat(priceMatch[1])
          if (!isNaN(price) && price > 0) {
            console.log('[Agorastore Adapter] Found currentPrice in script:', price)
            return price
          }
        }
      }
    } catch (e) {
      console.error('[Agorastore Adapter] saleState extraction error:', e)
    }
    return null
  }

  /**
   * Extract vehicle specifications from embedded JavaScript data
   * Agorastore embeds detailed vehicle info in script tags
   */
  private extractVehicleSpecs(): VehicleSpecs | null {
    try {
      const scripts = document.querySelectorAll('script:not([src])')
      for (const script of scripts) {
        const content = script.textContent || ''

        // Look for vehicle data patterns
        // Pattern 1: marque/brand
        const brandMatch = content.match(/["'](?:marque|brand)["']\s*:\s*["']([^"']+)["']/i)
        const modelMatch = content.match(/["'](?:modele|model)["']\s*:\s*["']([^"']+)["']/i)

        if (brandMatch && modelMatch) {
          const brand = brandMatch[1].trim()
          const model = modelMatch[1].trim()

          // Extract additional details
          const yearMatch = content.match(/["'](?:annee|year|dateImmat)["']\s*:\s*["']?(\d{4})/)
          const fuelMatch = content.match(/["'](?:energie|carburant|fuel|fuelType)["']\s*:\s*["']([^"']+)["']/i)
          const versionMatch = content.match(/["'](?:version|finition)["']\s*:\s*["']([^"']+)["']/i)
          const mileageMatch = content.match(/["'](?:kilometrage|mileage|km)["']\s*:\s*["']?(\d+)/i)

          const specs: VehicleSpecs = {
            brand,
            model,
            year: yearMatch ? parseInt(yearMatch[1]) : undefined,
            fuel: fuelMatch ? this.normalizeFuelType(fuelMatch[1]) : undefined,
            version: versionMatch ? versionMatch[1].trim() : undefined,
            mileage: mileageMatch ? parseInt(mileageMatch[1]) : undefined,
          }

          console.log('[Agorastore Adapter] Found vehicle specs:', specs)
          return specs
        }

        // Pattern 2: Look for structured data in different format
        // e.g., brand: "VOLVO", model: "XC60"
        const altBrandMatch = content.match(/\bmarque\s*[=:]\s*["']([^"']+)["']/i)
          || content.match(/\bbrand\s*[=:]\s*["']([^"']+)["']/i)
        const altModelMatch = content.match(/\bmodele\s*[=:]\s*["']([^"']+)["']/i)
          || content.match(/\bmodel\s*[=:]\s*["']([^"']+)["']/i)

        if (altBrandMatch && altModelMatch) {
          const specs: VehicleSpecs = {
            brand: altBrandMatch[1].trim(),
            model: altModelMatch[1].trim(),
          }
          console.log('[Agorastore Adapter] Found vehicle specs (alt):', specs)
          return specs
        }
      }
    } catch (e) {
      console.error('[Agorastore Adapter] Vehicle specs extraction error:', e)
    }
    return null
  }

  /**
   * Normalize fuel type string to a clean format
   */
  private normalizeFuelType(fuel: string): string {
    const fuelLower = fuel.toLowerCase()

    // Hybrid detection
    if (fuelLower.includes('elec') || fuelLower.includes('hybride') || fuelLower.includes('hybrid')) {
      if (fuelLower.includes('ess') || fuelLower.includes('petrol') || fuelLower.includes('gasoline')) {
        return 'hybride essence'
      }
      if (fuelLower.includes('diesel') || fuelLower.includes('go')) {
        return 'hybride diesel'
      }
      return 'hybride'
    }

    // Electric
    if (fuelLower === 'elec' || fuelLower === 'electrique' || fuelLower === 'electric') {
      return 'électrique'
    }

    // Diesel
    if (fuelLower.includes('diesel') || fuelLower === 'go' || fuelLower === 'gazole') {
      return 'diesel'
    }

    // Petrol/Essence
    if (fuelLower.includes('ess') || fuelLower.includes('petrol') || fuelLower.includes('gasoline')) {
      return 'essence'
    }

    return fuel
  }

  /**
   * Build an optimized title for vehicle search
   */
  private buildVehicleTitle(specs: VehicleSpecs, originalTitle: string): string {
    const parts: string[] = []

    // Always include brand and model
    if (specs.brand) {
      parts.push(this.capitalize(specs.brand))
    }
    if (specs.model) {
      parts.push(specs.model.toUpperCase())
    }

    // Add version if available (e.g., "T6 AWD")
    if (specs.version) {
      parts.push(specs.version)
    }

    // Add fuel type for hybrid/electric (important for price)
    if (specs.fuel) {
      const fuelLower = specs.fuel.toLowerCase()
      if (fuelLower.includes('hybride') || fuelLower.includes('électrique') || fuelLower.includes('electric')) {
        parts.push(specs.fuel)
      }
    }

    // Add year if recent (affects price significantly)
    if (specs.year && specs.year >= 2015) {
      parts.push(String(specs.year))
    }

    // If we have enough info from specs, use that
    if (parts.length >= 2) {
      return parts.join(' ')
    }

    // Otherwise, use original title
    return originalTitle
  }

  /**
   * Capitalize first letter of each word
   */
  private capitalize(str: string): string {
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  }

  private extractBrandModel(title: string): { brand?: string; model?: string } {
    const brands = [
      'Peugeot', 'Renault', 'Citroen', 'Citroën', 'Volkswagen', 'Audi', 'BMW', 'Mercedes',
      'Ford', 'Opel', 'Fiat', 'Toyota', 'Nissan', 'Honda', 'Hyundai', 'Kia', 'Dacia',
      'Volvo', 'Mini', 'Jeep', 'Land Rover', 'Porsche', 'Iveco', 'MAN', 'DAF',
      'Apple', 'Samsung', 'Sony', 'HP', 'Dell', 'Lenovo', 'Bosch', 'Makita', 'DeWalt',
    ]

    const titleLower = title.toLowerCase()
    let brand: string | undefined

    for (const b of brands) {
      if (titleLower.includes(b.toLowerCase())) {
        brand = b
        break
      }
    }

    // Improved model extraction - look for model after brand
    let model: string | undefined
    if (brand) {
      // Try to find model after brand (e.g., "Volvo XC60" -> "XC60")
      const brandIndex = titleLower.indexOf(brand.toLowerCase())
      const afterBrand = title.slice(brandIndex + brand.length).trim()
      // Match alphanumeric model codes like "XC60", "308", "C3", "A4"
      const modelMatch = afterBrand.match(/^([A-Z0-9]{1,3}[\s-]?[A-Z0-9]{0,4})/i)
      if (modelMatch && modelMatch[1].length >= 2) {
        model = modelMatch[1].trim().toUpperCase()
      }
    }

    return { brand, model }
  }

  private detectCategory(title: string, description?: string): 'vehicle' | 'product' {
    const text = `${title} ${description || ''}`.toLowerCase()

    const vehicleKeywords = [
      'véhicule', 'vehicule', 'voiture', 'automobile', 'camion', 'fourgon',
      'utilitaire', 'moto', 'scooter', 'tracteur', 'remorque',
      // Car brands
      'renault', 'peugeot', 'citroen', 'citroën', 'volkswagen', 'ford',
      'audi', 'bmw', 'mercedes', 'volvo', 'toyota', 'nissan', 'honda',
      'hyundai', 'kia', 'dacia', 'opel', 'fiat', 'jeep', 'mini',
      // Vehicle-specific terms
      'immatriculation', 'carte grise', 'kilométrage', 'kilometrage',
      'hybride', 'diesel', 'essence', 'électrique',
    ]

    if (vehicleKeywords.some(kw => text.includes(kw))) {
      return 'vehicle'
    }

    return 'product'
  }

  /**
   * Extract vehicle info from URL slug as fallback
   * URL pattern: /category/subcategory/brand-model-info-12345.aspx
   */
  private extractFromUrlSlug(): VehicleSpecs | null {
    try {
      const url = window.location.pathname
      // Match the last segment before .aspx: brand-model-info-id.aspx
      const slugMatch = url.match(/\/([^/]+)-(\d+)\.aspx$/i)
      if (!slugMatch) return null

      const slug = slugMatch[1] // e.g., "volvo-xc60-hybride-2023-45-000km-tres-bon-etat"
      const parts = slug.split('-')

      if (parts.length < 2) return null

      // Known car brands for matching
      const brands = [
        'peugeot', 'renault', 'citroen', 'volkswagen', 'audi', 'bmw', 'mercedes',
        'ford', 'opel', 'fiat', 'toyota', 'nissan', 'honda', 'hyundai', 'kia',
        'dacia', 'volvo', 'mini', 'jeep', 'porsche', 'iveco', 'man', 'daf',
        'seat', 'skoda', 'mazda', 'mitsubishi', 'suzuki', 'alfa', 'land', 'rover',
      ]

      // Find brand in slug parts
      let brandIndex = -1
      for (let i = 0; i < parts.length; i++) {
        if (brands.includes(parts[i].toLowerCase())) {
          brandIndex = i
          break
        }
      }

      if (brandIndex === -1) return null

      const brand = parts[brandIndex]
      let model: string | undefined

      // Model is usually right after brand
      if (brandIndex + 1 < parts.length) {
        const nextPart = parts[brandIndex + 1]
        // Model codes are usually alphanumeric like "xc60", "308", "c3"
        if (/^[a-z0-9]{2,10}$/i.test(nextPart) && !['hybride', 'diesel', 'essence'].includes(nextPart.toLowerCase())) {
          model = nextPart.toUpperCase()
        }
      }

      // Look for year (4 digits)
      const yearPart = parts.find(p => /^20\d{2}$/.test(p))
      const year = yearPart ? parseInt(yearPart) : undefined

      // Look for fuel type
      let fuel: string | undefined
      if (slug.includes('hybride')) fuel = 'hybride'
      else if (slug.includes('electrique') || slug.includes('électrique')) fuel = 'électrique'
      else if (slug.includes('diesel')) fuel = 'diesel'

      if (brand && model) {
        console.log('[Agorastore Adapter] Extracted from URL slug:', { brand, model, year, fuel })
        return { brand, model, year, fuel }
      }
    } catch (e) {
      console.error('[Agorastore Adapter] URL slug extraction error:', e)
    }
    return null
  }

}

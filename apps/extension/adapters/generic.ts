import type { AuctionData, AuctionFees, Currency } from '@auction-comparator/shared'
import { calculateTotalPrice } from '@auction-comparator/shared'
import { BaseAdapter } from './base'

/**
 * Generic fallback adapter that attempts to extract auction data
 * from any site using common patterns
 */
export class GenericAdapter extends BaseAdapter {

  id = 'generic'
  name = 'Generic Auction Site'
  urlPatterns = [/.*/] // Matches any URL
  defaultCurrency: Currency = 'EUR'
  defaultLocale = 'en'
  defaultFees: AuctionFees = {
    buyerPremium: 0.20, // Assume 20% premium
  }

  // Common selectors found across auction sites
  private commonSelectors = {
    title: [
      'h1',
      '[class*="title"]',
      '[class*="lot-name"]',
      '[class*="product-name"]',
      '[itemprop="name"]',
    ],
    price: [
      '[class*="current-bid"]',
      '[class*="price"]',
      '[class*="bid"]',
      '[itemprop="price"]',
      '[class*="amount"]',
    ],
    description: [
      '[class*="description"]',
      '[itemprop="description"]',
      '[class*="detail"]',
    ],
  }

  isLotPage(): boolean {
    // Check URL patterns common to auction lots
    const url = window.location.href.toLowerCase()
    const lotPatterns = [
      /\/lot\//,
      /\/item\//,
      /\/auction.*\/\d+/,
      /\/bid\//,
      /lotid=/i,
    ]

    return lotPatterns.some(p => p.test(url))
  }

  extractData(): AuctionData | null {
    if (!this.isLotPage()) {
      return null
    }

    // Try to extract title
    const title = this.findText(this.commonSelectors.title)
    if (!title) {
      return null
    }

    // Try to extract price
    const priceText = this.findText(this.commonSelectors.price)
    const currentBid = this.parseNumber(priceText)

    if (!currentBid) {
      return null
    }

    // Detect currency from price text
    const currency = this.detectCurrency(priceText || '') || this.defaultCurrency

    // Extract description
    const description = this.findText(this.commonSelectors.description) || undefined

    // Detect if this looks like a vehicle and extract year
    const category = this.detectCategory(title, description)
    const year = category === 'vehicle' ? this.extractYear(title, description) : undefined

    const totalPrice = calculateTotalPrice(currentBid, this.defaultFees)

    return {
      title,
      year,
      category,
      condition: 'unknown',
      currentBid,
      currency,
      fees: this.defaultFees,
      totalPrice,
      siteDomain: this.getDomain(),
      locale: this.detectLocale(),
      lotUrl: this.getUrl(),
      description,
      extractedAt: Date.now(),
    }
  }

  getOverlayMountPoint(): Element | null {
    // Try to find a price container
    for (const selector of this.commonSelectors.price) {
      const el = document.querySelector(selector)
      if (el?.parentElement) {
        return el.parentElement
      }
    }
    return document.body
  }

  private findText(selectors: string[]): string | null {
    for (const selector of selectors) {
      const text = this.getText(selector)
      if (text && text.length > 0) {
        return text
      }
    }
    return null
  }

  private detectCurrency(text: string): Currency | null {
    if (text.includes('€') || text.includes('EUR')) return 'EUR'
    if (text.includes('$') || text.includes('USD')) return 'USD'
    if (text.includes('£') || text.includes('GBP')) return 'GBP'
    return null
  }

  private detectLocale(): string {
    // Try to detect from HTML lang attribute
    const htmlLang = document.documentElement.lang
    if (htmlLang) {
      return htmlLang.split('-')[0]
    }

    // Detect from URL
    const host = window.location.hostname
    if (host.endsWith('.fr')) return 'fr'
    if (host.endsWith('.de')) return 'de'
    if (host.endsWith('.es')) return 'es'
    if (host.endsWith('.it')) return 'it'
    if (host.endsWith('.co.uk')) return 'uk'

    return 'en'
  }

  private detectCategory(title: string, description?: string): 'vehicle' | 'product' {
    const text = `${title} ${description || ''}`.toLowerCase()

    const vehicleKeywords = [
      'car', 'voiture', 'auto', 'vehicle', 'véhicule', 'vehicule',
      'truck', 'camion', 'van', 'fourgon', 'motorcycle', 'moto',
      'scooter', 'tractor', 'tracteur', 'forklift', 'chariot',
      'km', 'mileage', 'kilométrage', 'immatriculation',
    ]

    if (vehicleKeywords.some(kw => text.includes(kw))) {
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
        return year
      }
    }

    return undefined
  }

}

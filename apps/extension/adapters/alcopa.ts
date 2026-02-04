import type { AuctionData, AuctionFees, Currency, MutationObserverConfig } from '@auction-comparator/shared'
import { calculateTotalPrice } from '@auction-comparator/shared'
import { BaseAdapter } from './base'

/**
 * Adapter for Alcopa Auction website (vehicles)
 */
export class AlcopaAdapter extends BaseAdapter {

  id = 'alcopa'
  name = 'Alcopa Auction'
  urlPatterns = [
    /alcopa-auction\.fr/i,
    /alcopa-auction\.com/i,
  ]
  defaultCurrency: Currency = 'EUR'
  defaultLocale = 'fr'
  // Alcopa shows "Frais inclus" so fees are already included in the price
  defaultFees: AuctionFees = {
    buyerPremium: 0,
    vat: 0,
  }

  isLotPage(): boolean {
    const url = window.location.href.toLowerCase()

    // Alcopa lot pages have patterns like:
    // /voiture-occasion/brand/model-lotid
    // /utilitaire-occasion/brand/model-lotid
    const lotPatterns = [
      /\/voiture-occasion\/.+\/.+-\d+$/,
      /\/utilitaire-occasion\/.+\/.+-\d+$/,
      /\/moto-occasion\/.+\/.+-\d+$/,
      /\/vehicule\/.+\/.+-\d+$/,
    ]

    const isLotUrl = lotPatterns.some(p => p.test(url))
    console.log('[Alcopa Adapter] URL check:', url, 'isLot:', isLotUrl)

    return isLotUrl
  }

  extractData(): AuctionData | null {
    console.log('[Alcopa Adapter] Attempting to extract data...')

    // Extract brand from URL first
    const brand = this.extractBrandFromUrl()

    // Extract model/description from the specific h2 with itemprop="description"
    const descriptionEl = document.querySelector('h2[itemprop="description"]')
    const model = descriptionEl?.textContent?.trim() || ''

    // Build full title: "Brand Model" for better search results
    let title = ''
    if (brand && model) {
      title = `${brand} ${model}`
    } else if (model) {
      title = model
    } else {
      // Fallback to document title
      title = document.title.split('|')[0].split('-')[0].trim()
    }

    if (!title || title.length < 3) {
      console.warn('[Alcopa Adapter] Could not extract title')
      return null
    }

    console.log('[Alcopa Adapter] Found title:', title, '(brand:', brand, ', model:', model, ')')

    // Extract price - look for "Enchère courante" text
    let currentBid: number | null = null

    // Find all h4 elements and look for the one with "Enchère courante"
    const h4Elements = document.querySelectorAll('h4')
    for (const el of h4Elements) {
      const text = el.textContent || ''
      if (text.includes('Enchère courante')) {
        currentBid = this.parseNumber(text)
        if (currentBid) {
          console.log('[Alcopa Adapter] Found price from Enchère courante:', currentBid)
          break
        }
      }
    }

    // Fallback: try to find price with € symbol
    if (!currentBid) {
      const priceMatch = document.body.innerText.match(/(\d[\d\s]*)\s*€/)
      if (priceMatch) {
        currentBid = this.parseNumber(priceMatch[1])
        console.log('[Alcopa Adapter] Found price from text:', currentBid)
      }
    }

    if (!currentBid) {
      console.warn('[Alcopa Adapter] Could not extract price')
      return null
    }

    // Extract lot ID from URL (last part after the last dash)
    const lotId = this.extractLotIdFromUrl()

    // Check if fees are included
    const feesIncluded = document.body.innerText.toLowerCase().includes('frais inclus')

    // For Alcopa, price shown is the total (fees included)
    const totalPrice = currentBid

    // Extract year from page content or title
    const year = this.extractYear(title)

    const data: AuctionData = {
      title,
      brand,
      model: model || undefined,
      year,
      category: 'vehicle', // Alcopa is a vehicle auction site
      condition: 'good', // Vehicles are typically used
      currentBid,
      currency: this.defaultCurrency,
      fees: this.defaultFees,
      totalPrice,
      siteDomain: this.getDomain(),
      locale: this.defaultLocale,
      lotId,
      lotUrl: this.getUrl(),
      extractionConfidence: this.getExtractionConfidence(brand, model),
      extractedAt: Date.now(),
    }

    console.log('[Alcopa Adapter] Extracted data:', data)
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
      debounceMs: 1000,
    }
  }

  private extractLotIdFromUrl(): string | undefined {
    // URL format: /voiture-occasion/renault/clio-iv-...-980466
    const match = window.location.href.match(/-(\d+)$/)
    return match?.[1]
  }

  private extractBrandFromUrl(): string | undefined {
    // URL format: /voiture-occasion/renault/...
    const match = window.location.pathname.match(/\/(?:voiture|utilitaire|moto|vehicule)-occasion\/([^/]+)\//i)
    if (match) {
      // Capitalize first letter
      return match[1].charAt(0).toUpperCase() + match[1].slice(1)
    }
    return undefined
  }

  private extractYear(title: string): number | undefined {
    // Try to find year in title (e.g., "2019", "2020")
    const yearMatch = title.match(/\b(20\d{2}|19\d{2})\b/)
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10)
      // Sanity check: year should be between 1990 and current year + 1
      const currentYear = new Date().getFullYear()
      if (year >= 1990 && year <= currentYear + 1) {
        console.log('[Alcopa Adapter] Found year:', year)
        return year
      }
    }

    // Try to find year in page content (look for "Année" or "Mise en circulation")
    const pageText = document.body.innerText
    const yearPatterns = [
      /(?:année|annee|mise en circulation|1ère immat)[:\s]*(\d{4})/i,
      /(\d{4})\s*(?:km|kms|kilomètres)/i,
    ]

    for (const pattern of yearPatterns) {
      const match = pageText.match(pattern)
      if (match) {
        const year = parseInt(match[1], 10)
        const currentYear = new Date().getFullYear()
        if (year >= 1990 && year <= currentYear + 1) {
          console.log('[Alcopa Adapter] Found year from page:', year)
          return year
        }
      }
    }

    return undefined
  }

}

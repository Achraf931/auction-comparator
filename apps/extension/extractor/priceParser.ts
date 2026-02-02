/**
 * Price parsing and normalization utilities
 * Handles various European price formats
 */

export interface ParsedPrice {
  value: number;
  currency: string;
  original: string;
  formatted: string;
}

// Currency patterns
const CURRENCY_PATTERNS = [
  { symbol: '€', code: 'EUR' },
  { symbol: 'EUR', code: 'EUR' },
  { symbol: '$', code: 'USD' },
  { symbol: 'USD', code: 'USD' },
  { symbol: '£', code: 'GBP' },
  { symbol: 'GBP', code: 'GBP' },
]

// Price extraction patterns - various formats
const PRICE_PATTERNS = [
  // "1 250 €" or "1 250,50 €"
  /(\d{1,3}(?:\s\d{3})*(?:,\d{1,2})?)\s*€/,
  // "1.250 €" or "1.250,50 €"
  /(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)\s*€/,
  // "€ 1,250" or "€ 1,250.50"
  /€\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/,
  // "1250€" or "1250,50€"
  /(\d+(?:,\d{1,2})?)\s*€/,
  // "EUR 1250" or "1250 EUR"
  /EUR\s*(\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{1,2})?)/i,
  /(\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{1,2})?)\s*EUR/i,
  // Generic number with € anywhere
  /(\d{1,3}(?:[\s\u00a0.,]\d{3})*(?:[.,]\d{1,2})?)/,
]

/**
 * Normalize a price string to a numeric value
 */
export function normalizePrice(text: string): number | null {
  if (!text) return null

  // Remove all non-numeric chars except . , and spaces
  let cleaned = text
    .replace(/[^\d.,\s\u00a0]/g, '')
    .trim()

  if (!cleaned) return null

  // Handle different European formats
  // "1 250,50" -> "1250.50"
  // "1.250,50" -> "1250.50"
  // "1,250.50" -> "1250.50"

  // Count decimals indicators
  const commaCount = (cleaned.match(/,/g) || []).length
  const dotCount = (cleaned.match(/\./g) || []).length

  if (commaCount === 1 && dotCount === 0) {
    // "1250,50" - comma is decimal separator
    const parts = cleaned.split(',')
    if (parts[1] && parts[1].length <= 2) {
      cleaned = `${parts[0].replace(/[\s\u00a0]/g, '') }.${ parts[1]}`
    } else {
      // "1,250" - comma is thousand separator
      cleaned = cleaned.replace(/,/g, '').replace(/[\s\u00a0]/g, '')
    }
  } else if (dotCount === 1 && commaCount === 0) {
    // "1250.50" or "1.250"
    const parts = cleaned.split('.')
    if (parts[1] && parts[1].length <= 2) {
      // "1250.50" - dot is decimal separator
      cleaned = `${parts[0].replace(/[\s\u00a0]/g, '') }.${ parts[1]}`
    } else {
      // "1.250" - dot is thousand separator
      cleaned = cleaned.replace(/\./g, '').replace(/[\s\u00a0]/g, '')
    }
  } else if (commaCount > 0 && dotCount > 0) {
    // "1.250,50" or "1,250.50"
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    if (lastComma > lastDot) {
      // "1.250,50" - comma is decimal
      cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    } else {
      // "1,250.50" - dot is decimal
      cleaned = cleaned.replace(/,/g, '')
    }
    cleaned = cleaned.replace(/[\s\u00a0]/g, '')
  } else {
    // Just spaces or no separators
    cleaned = cleaned.replace(/[\s\u00a0.,]/g, '')
  }

  const value = parseFloat(cleaned)
  return isNaN(value) ? null : value
}

/**
 * Detect currency from text
 */
export function detectCurrency(text: string): string | null {
  const upperText = text.toUpperCase()
  for (const { symbol, code } of CURRENCY_PATTERNS) {
    if (text.includes(symbol) || upperText.includes(symbol.toUpperCase())) {
      return code
    }
  }
  return null
}

/**
 * Check if text contains a price-like pattern
 */
export function containsPrice(text: string): boolean {
  // Must have digits and a currency symbol/code
  const hasDigits = /\d/.test(text)
  const hasCurrency = /[€$£]|EUR|USD|GBP/i.test(text)
  return hasDigits && hasCurrency
}

/**
 * Extract all price-like values from text
 */
export function extractPrices(text: string): ParsedPrice[] {
  const prices: ParsedPrice[] = []

  for (const pattern of PRICE_PATTERNS) {
    const matches = text.matchAll(new RegExp(pattern, 'g'))
    for (const match of matches) {
      const original = match[0]
      const numPart = match[1] || match[0]
      const value = normalizePrice(numPart)

      if (value && value > 0) {
        const currency = detectCurrency(original) || 'EUR'
        prices.push({
          value,
          currency,
          original,
          formatted: formatPrice(value, currency),
        })
      }
    }
  }

  // Deduplicate by value
  const seen = new Set<number>()
  return prices.filter(p => {
    if (seen.has(p.value)) return false
    seen.add(p.value)
    return true
  })
}

/**
 * Parse a single price text
 */
export function parsePrice(text: string): ParsedPrice | null {
  const prices = extractPrices(text)
  return prices[0] || null
}

/**
 * Format a price for display
 */
export function formatPrice(value: number, currency: string = 'EUR'): string {
  const symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
  }
  const symbol = symbols[currency] || currency
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) } ${ symbol}`
}

/**
 * Check if a price value is within sane ranges for auctions
 */
export function isReasonablePrice(value: number, minPrice = 1, maxPrice = 10000000): boolean {
  return value >= minPrice && value <= maxPrice
}

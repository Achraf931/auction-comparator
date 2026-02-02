import type { Currency } from '../types/auction';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: '\u20ac',
  USD: '$',
  GBP: '\u00a3',
};

const CURRENCY_LOCALES: Record<Currency, string> = {
  EUR: 'fr-FR',
  USD: 'en-US',
  GBP: 'en-GB',
};

/**
 * Format a price with currency symbol
 */
export function formatPrice(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse a price string to a number
 * Handles various formats: "1,234.56", "1.234,56", "1 234,56"
 */
export function parsePriceString(priceString: string): number | null {
  if (!priceString) return null;

  // Remove currency symbols and whitespace
  let cleaned = priceString.replace(/[€$£\s]/g, '').trim();

  // Handle European format (1.234,56 or 1 234,56)
  if (cleaned.includes(',') && (cleaned.indexOf(',') > cleaned.lastIndexOf('.') || !cleaned.includes('.'))) {
    // European: comma is decimal separator
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // US/UK: period is decimal separator
    cleaned = cleaned.replace(/,/g, '');
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency];
}

/**
 * Detect currency from a price string
 */
export function detectCurrency(priceString: string): Currency | null {
  if (priceString.includes('\u20ac') || priceString.includes('EUR')) return 'EUR';
  if (priceString.includes('$') || priceString.includes('USD')) return 'USD';
  if (priceString.includes('\u00a3') || priceString.includes('GBP')) return 'GBP';
  return null;
}

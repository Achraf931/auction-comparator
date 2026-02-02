import type { Currency, WebPriceResult } from '@auction-comparator/shared';

export type SearchCategory = 'product' | 'vehicle';

export interface ShoppingSearchOptions {
  /** Search query */
  query: string;
  /** Target currency */
  currency: Currency;
  /** Locale for results */
  locale: string;
  /** Maximum number of results */
  maxResults?: number;
  /** Category of item being searched */
  category?: SearchCategory;
}

export interface ShoppingProvider {
  /** Provider identifier */
  id: string;
  /** Provider display name */
  name: string;

  /**
   * Search for products
   */
  search(options: ShoppingSearchOptions): Promise<WebPriceResult[]>;

  /**
   * Check if the provider is available (API key configured, etc.)
   */
  isAvailable(): boolean;
}

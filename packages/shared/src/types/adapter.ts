import type { AuctionData, AuctionFees, Currency, ItemCondition } from './auction';

export interface MutationObserverConfig {
  /** Target element selector to observe */
  targetSelector: string;
  /** MutationObserver options */
  options: MutationObserverInit;
  /** Debounce time in milliseconds */
  debounceMs: number;
}

export interface SiteAdapter {
  /** Unique adapter identifier */
  id: string;
  /** Display name of the auction site */
  name: string;
  /** URL patterns this adapter handles */
  urlPatterns: RegExp[];
  /** Default currency for this site */
  defaultCurrency: Currency;
  /** Default locale for this site */
  defaultLocale: string;
  /** Default fee structure for this site */
  defaultFees: AuctionFees;

  /**
   * Check if the current page is a lot/item detail page
   */
  isLotPage(): boolean;

  /**
   * Extract auction data from the current page
   */
  extractData(): AuctionData | null;

  /**
   * Get the element where the overlay should be mounted
   */
  getOverlayMountPoint(): Element | null;

  /**
   * Get MutationObserver configuration for detecting price changes
   */
  getMutationConfig(): MutationObserverConfig;

  /**
   * Parse condition from site-specific text
   */
  parseCondition(conditionText: string): ItemCondition;
}

export interface AdapterConstructor {
  new (): SiteAdapter;
}

export interface AdapterRegistry {
  /** Register a new adapter */
  register(adapter: AdapterConstructor): void;

  /** Get adapter for current URL */
  getAdapter(url: string): SiteAdapter | null;

  /** Get all registered adapter IDs */
  getAdapterIds(): string[];
}

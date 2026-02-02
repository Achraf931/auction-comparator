import type { Currency, ItemCondition } from './auction';
import type { NormalizedProduct, ProductSignatures, CompareSource } from './normalization';

export type ItemCategory = 'product' | 'vehicle';
export type ExtractionConfidenceLevel = 'high' | 'medium' | 'low';

export interface CompareRequest {
  /** Item title from the auction */
  title: string;
  /** Brand name if known */
  brand?: string;
  /** Model name/number if known */
  model?: string;
  /** Item condition for filtering results */
  condition?: ItemCondition;
  /** Currency for price comparison */
  currency: Currency;
  /** Locale for search queries (e.g., 'fr', 'en', 'de') */
  locale: string;
  /** Current auction total price (including fees) */
  auctionPrice: number;
  /** Domain of the auction site */
  siteDomain: string;
  /** Lot URL for history tracking */
  lotUrl?: string;
  /** Item category - affects search strategy */
  category?: ItemCategory;
  /** Extraction confidence from adapter */
  extractionConfidence?: ExtractionConfidenceLevel;
  /** Whether to use AI normalization (default: auto based on confidence) */
  useNormalization?: boolean;
  /** Force a fresh fetch, bypassing cache (consumes quota) */
  forceRefresh?: boolean;
}

export interface WebPriceResult {
  /** Product title from the web listing */
  title: string;
  /** Price in the requested currency */
  price: number;
  /** Original price string as displayed */
  priceString: string;
  /** Source website */
  source: string;
  /** URL to the listing */
  url: string;
  /** Thumbnail image URL */
  thumbnail?: string;
  /** Item condition if specified */
  condition?: string;
  /** Whether shipping is included */
  shippingIncluded?: boolean;
  /** Shipping cost if known */
  shippingCost?: number;
  /** Relevance score (0-1) based on title matching */
  relevanceScore: number;
}

export interface PriceStats {
  /** Minimum price found */
  min: number;
  /** Maximum price found */
  max: number;
  /** Median price */
  median: number;
  /** Average price */
  average: number;
  /** Number of results used for stats */
  count: number;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type VerdictStatus = 'worth_it' | 'borderline' | 'not_worth_it';

export interface Verdict {
  /** The recommendation status */
  status: VerdictStatus;
  /** Price difference as a percentage (negative = savings) */
  margin: number;
  /** Human-readable explanation */
  reason: string;
}

/**
 * Usage summary for current billing period
 */
export interface UsageSummary {
  /** Current billing period (YYYY-MM) */
  period: string;
  /** Fresh fetches used this period */
  freshFetchCount: number;
  /** Cache hits this period */
  cacheHitCount: number;
  /** Monthly quota for fresh fetches */
  quota: number;
  /** Plan key */
  plan: string;
  /** Billing period (monthly, yearly) */
  billingPeriod: 'monthly' | 'yearly' | null;
  /** Free tier remaining (lifetime allowance) */
  freeRemaining?: number;
  /** Free tier used (lifetime) */
  freeUsed?: number;
  /** Free tier total allowance */
  freeTotal?: number;
  /** Whether user has an active subscription */
  hasSubscription?: boolean;
}

/**
 * Cache metadata in response
 */
export interface CacheMetadata {
  /** How the result was obtained */
  source: CompareSource;
  /** Cache entry ID if from cache */
  cacheEntryId?: string;
  /** When the cache entry was fetched */
  fetchedAt?: number;
  /** When the cache entry expires */
  expiresAt?: number;
  /** Signature used for lookup */
  signatureUsed?: string;
}

/**
 * Normalized product info in response
 */
export interface NormalizedInfo {
  /** Brand */
  brand: string | null;
  /** Model */
  model: string | null;
  /** Capacity in GB */
  capacity_gb: number | null;
  /** Condition grade */
  condition_grade: string;
  /** Functional state */
  functional_state: string;
  /** Category */
  category: string | null;
  /** Signatures */
  signatures: ProductSignatures;
}

export interface CompareResponse {
  /** The search query used */
  queryUsed: string;
  /** Web price results, sorted by relevance */
  results: WebPriceResult[];
  /** Price statistics from results */
  stats: PriceStats;
  /** Confidence level based on result quality */
  confidence: ConfidenceLevel;
  /** Buy recommendation */
  verdict: Verdict;
  /** Timestamp when cached (if from cache) - deprecated, use cache.fetchedAt */
  cachedAt?: number;
  /** Cache expiration timestamp - deprecated, use cache.expiresAt */
  expiresAt?: number;
  /** Cache metadata */
  cache?: CacheMetadata;
  /** Normalized product info */
  normalized?: NormalizedInfo;
  /** Usage summary for quota tracking */
  usage?: UsageSummary;
}

export interface CompareError {
  /** Error code */
  code: 'RATE_LIMITED' | 'API_ERROR' | 'NO_RESULTS' | 'INVALID_REQUEST' | 'UNAUTHORIZED' | 'SUBSCRIPTION_REQUIRED' | 'UNKNOWN_PLAN' | 'QUOTA_EXCEEDED' | 'FREE_EXHAUSTED';
  /** Human-readable error message */
  message: string;
  /** Retry after this many seconds (for rate limiting) */
  retryAfter?: number;
  /** Usage summary when quota exceeded */
  usage?: UsageSummary;
  /** Whether cache-only mode is available */
  cacheOnlyAvailable?: boolean;
}

/**
 * Search history entry
 */
export interface SearchHistoryEntry {
  /** Entry ID */
  id: string;
  /** When the search was performed */
  createdAt: string;
  /** Auction site domain */
  domain: string;
  /** Lot URL */
  lotUrl: string;
  /** Raw title from auction */
  rawTitle: string;
  /** Normalized title */
  normalizedTitle?: string;
  /** Auction price at time of search */
  auctionPrice: number | null;
  /** Currency */
  currency: string | null;
  /** How result was obtained */
  compareSource: CompareSource;
  /** Price stats at time of search */
  stats?: {
    min: number;
    max: number;
    median: number;
  };
  /** When the cache was fetched (if cached) */
  fetchedAt?: string;
}

/**
 * History API response
 */
export interface HistoryResponse {
  /** History entries */
  entries: SearchHistoryEntry[];
  /** Total count for pagination */
  total: number;
  /** Current page */
  page: number;
  /** Page size */
  pageSize: number;
}

/**
 * Usage API response
 */
export interface UsageResponse {
  /** Current period */
  period: string;
  /** Fresh fetches used */
  freshFetchCount: number;
  /** Cache hits */
  cacheHitCount: number;
  /** Monthly quota */
  quota: number;
  /** Plan key */
  plan: string;
  /** Billing period (monthly, yearly) */
  billingPeriod: 'monthly' | 'yearly' | null;
  /** Days remaining in period */
  daysRemaining: number;
  /** Free tier remaining (lifetime) */
  freeRemaining?: number;
  /** Free tier used (lifetime) */
  freeUsed?: number;
  /** Free tier total allowance */
  freeTotal?: number;
  /** Whether user has an active subscription */
  hasSubscription?: boolean;
}

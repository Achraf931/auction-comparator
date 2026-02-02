import type { ExtractionConfidence } from './auction';

// Re-export for convenience
export type { ExtractionConfidence };

/**
 * Normalized item condition grade
 */
export type ConditionGrade = 'new' | 'used' | 'unknown';

/**
 * Functional state - distinguishes working items from broken/for-parts
 */
export type FunctionalState = 'ok' | 'broken' | 'unknown';

/**
 * Normalized item condition (legacy, kept for compatibility)
 */
export type NormalizedCondition = 'new' | 'used' | 'refurbished' | 'unknown';

/**
 * Compare source - how the cache entry was resolved
 */
export type CompareSource = 'cache_strict' | 'cache_loose' | 'fresh_fetch';

/**
 * Deterministic hints detected from title
 */
export interface DeterministicHints {
  /** Broken/for-parts indicators found */
  brokenIndicators: string[];
  /** Condition indicators found */
  conditionIndicators: string[];
  /** Confidence that item is broken (0-1) */
  brokenConfidence: number;
  /** Confidence in condition detection (0-1) */
  conditionConfidence: number;
}

/**
 * Request to normalize an auction title
 */
export interface NormalizeRequest {
  /** Raw title from auction listing */
  rawTitle: string;
  /** Domain of the auction site */
  siteDomain: string;
  /** Locale for language-specific normalization */
  locale: string;
  /** Brand hint from deterministic extraction */
  brandHint?: string;
  /** Model hint from deterministic extraction */
  modelHint?: string;
  /** Category hint (vehicle, product) */
  categoryHint?: string;
  /** Lot URL for context */
  lotUrl?: string;
  /** Deterministic hints pre-computed */
  hints?: DeterministicHints;
}

/**
 * Normalized product with structured fields for cache signatures
 */
export interface NormalizedProduct {
  /** Detected brand */
  brand: string | null;
  /** Detected model */
  model: string | null;
  /** Product reference/SKU if found */
  reference: string | null;
  /** Capacity in GB (normalized to integer) */
  capacity_gb: number | null;
  /** Product category */
  category: string | null;
  /** Condition grade for caching */
  condition_grade: ConditionGrade;
  /** Functional state - ok vs broken/parts */
  functional_state: FunctionalState;
  /** Locale used for search */
  locale: string;
  /** Overall confidence score 0-1 */
  confidence: number;
  /** Confidence in condition detection 0-1 */
  conditionConfidence: number;
  /** Primary search query */
  query: string;
  /** Alternative queries */
  altQueries: string[];
}

/**
 * Product signatures for cache lookup
 */
export interface ProductSignatures {
  /** Strict signature - includes condition_grade */
  strict: string;
  /** Loose signature - excludes condition_grade for fallback */
  loose: string;
}

/**
 * Result of title normalization (AI or heuristic)
 */
export interface NormalizedResult {
  /** Cleaned, normalized title */
  normalizedTitle: string;
  /** Detected brand */
  brand: string | null;
  /** Detected model */
  model: string | null;
  /** Product reference/SKU if found */
  reference: string | null;
  /** Capacity/size if applicable (e.g., "256GB", "1TB") */
  capacity: string | null;
  /** Capacity in GB (normalized integer) */
  capacity_gb: number | null;
  /** Detected condition */
  condition: NormalizedCondition;
  /** Condition grade for signatures */
  condition_grade: ConditionGrade;
  /** Functional state (ok/broken/unknown) */
  functional_state: FunctionalState;
  /** Whether this appears to be an accessory rather than main product */
  isAccessory: boolean;
  /** Product category */
  category: string | null;
  /** Primary search query to use */
  query: string;
  /** Alternative queries to try if primary yields poor results */
  altQueries: string[];
  /** Confidence score 0-1 */
  confidence: number;
  /** Confidence in condition detection 0-1 */
  conditionConfidence: number;
  /** Whether AI was used for normalization */
  usedAI: boolean;
  /** Cache key for this normalization */
  cacheKey?: string;
  /** Deterministic hints that were detected */
  hints?: DeterministicHints;
  /** Computed signatures for cache lookup */
  signatures?: ProductSignatures;
}

/**
 * Normalization API response
 */
export interface NormalizeResponse extends NormalizedResult {
  /** Whether result was served from cache */
  cached: boolean;
  /** Cache expiration timestamp */
  expiresAt?: number;
}

/**
 * Error response from normalization API
 */
export interface NormalizeError {
  code: 'INVALID_REQUEST' | 'NORMALIZATION_FAILED' | 'PROVIDER_ERROR';
  message: string;
}

/**
 * Extended auction data with extraction confidence
 */
export interface ExtractedAuctionData {
  rawTitle: string;
  currentBid: number;
  currency: string;
  condition?: string;
  brandHint?: string;
  modelHint?: string;
  url: string;
  siteDomain: string;
  locale: string;
  category?: string;
  /** Confidence in the deterministic extraction */
  extractionConfidence: ExtractionConfidence;
}

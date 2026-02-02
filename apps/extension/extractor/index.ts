/**
 * Self-healing auction page extractor
 *
 * This module provides a robust extraction system for auction pages that:
 * - Works on allowlisted domains without brittle CSS selectors
 * - Uses heuristic scoring based on semantic signals
 * - Learns and caches successful extraction paths
 * - Falls back to AI when heuristics have low confidence
 * - Observes live price changes via MutationObserver
 */

// Main orchestrator
export {
  AuctionExtractor,
  createExtractor,
  type ExtractionResult,
  type ExtractionDebugInfo,
  type ExtractorOptions,
} from './extractorOrchestrator'

// Domain configuration
export {
  getDomainConfig,
  getAllDomainConfigs,
  isLotPage,
  type DomainConfig,
} from './domainConfig'

// Lot page detection
export {
  detectLotPage,
  isSupportedDomain,
  type LotPageInfo,
} from './lotPageDetector'

// Candidate collection
export {
  collectAllCandidates,
  collectTitleCandidates,
  collectPriceCandidates,
  getCssPath,
  type TitleCandidate,
  type PriceCandidate,
  type BaseCandidate,
} from './candidateCollector'

// Heuristic scoring
export {
  scoreAllCandidates,
  getTopCandidates,
  type ScoringResult,
  type ScoredTitleCandidate,
  type ScoredPriceCandidate,
  type ExtractionConfidence,
} from './heuristicScorer'

// Self-healing cache
export {
  getLearnedExtraction,
  saveLearnedExtraction,
  recordExtractionFailure,
  clearLearnedExtraction,
  getAllLearnedExtractions,
  clearAllLearnedExtractions,
  tryLearnedPath,
  validateLearnedExtraction,
  type LearnedExtraction,
} from './selfHealingCache'

// Live observation
export {
  createLiveObserver,
  createPeriodicChecker,
  watchForPageTransition,
  type LiveObserver,
  type ObserverConfig,
} from './liveObserver'

// Price parsing
export {
  parsePrice,
  extractPrices,
  normalizePrice,
  detectCurrency,
  containsPrice,
  formatPrice,
  isReasonablePrice,
  type ParsedPrice,
} from './priceParser'

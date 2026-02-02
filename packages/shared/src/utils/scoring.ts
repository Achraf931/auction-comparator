import type {
  ConfidenceLevel,
  PriceStats,
  Verdict,
  VerdictStatus,
  WebPriceResult,
} from '../types/comparison';

/** Default margin percentage for verdict calculation */
const DEFAULT_MARGIN_PCT = 0.10; // 10%

/** Minimum results needed for high confidence */
const HIGH_CONFIDENCE_MIN_RESULTS = 5;

/** Minimum average relevance for high confidence */
const HIGH_CONFIDENCE_MIN_RELEVANCE = 0.7;

/**
 * Calculate relevance score between auction title and web result title
 * Returns a value between 0 and 1
 */
export function calculateRelevanceScore(
  auctionTitle: string,
  resultTitle: string,
  brand?: string,
  model?: string
): number {
  const normalizedAuction = normalizeText(auctionTitle);
  const normalizedResult = normalizeText(resultTitle);

  // Split into words
  const auctionWords = new Set(normalizedAuction.split(/\s+/).filter(w => w.length > 2));
  const resultWords = new Set(normalizedResult.split(/\s+/).filter(w => w.length > 2));

  // Calculate word overlap
  let matchCount = 0;
  for (const word of auctionWords) {
    if (resultWords.has(word)) {
      matchCount++;
    }
  }

  const overlapScore = auctionWords.size > 0
    ? matchCount / auctionWords.size
    : 0;

  // Bonus for brand/model match
  let brandBonus = 0;
  if (brand && normalizedResult.includes(normalizeText(brand))) {
    brandBonus = 0.15;
  }
  if (model && normalizedResult.includes(normalizeText(model))) {
    brandBonus += 0.15;
  }

  return Math.min(1, overlapScore * 0.7 + brandBonus + 0.1);
}

/**
 * Calculate price statistics from web results
 */
export function calculatePriceStats(results: WebPriceResult[]): PriceStats {
  if (results.length === 0) {
    return { min: 0, max: 0, median: 0, average: 0, count: 0 };
  }

  const prices = results.map(r => r.price).sort((a, b) => a - b);
  const sum = prices.reduce((acc, p) => acc + p, 0);

  const median = prices.length % 2 === 0
    ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
    : prices[Math.floor(prices.length / 2)];

  return {
    min: prices[0],
    max: prices[prices.length - 1],
    median: Math.round(median * 100) / 100,
    average: Math.round((sum / prices.length) * 100) / 100,
    count: prices.length,
  };
}

/**
 * Calculate confidence level based on result quality
 */
export function calculateConfidence(results: WebPriceResult[]): ConfidenceLevel {
  if (results.length === 0) return 'low';

  const avgRelevance = results.reduce((acc, r) => acc + r.relevanceScore, 0) / results.length;

  if (results.length >= HIGH_CONFIDENCE_MIN_RESULTS && avgRelevance >= HIGH_CONFIDENCE_MIN_RELEVANCE) {
    return 'high';
  }

  if (results.length >= 3 && avgRelevance >= 0.5) {
    return 'medium';
  }

  return 'low';
}

/**
 * Calculate verdict (recommendation) for the auction
 */
export function calculateVerdict(
  auctionPrice: number,
  stats: PriceStats,
  marginPct: number = DEFAULT_MARGIN_PCT
): Verdict {
  if (stats.count === 0) {
    return {
      status: 'borderline',
      margin: 0,
      reason: 'No comparable prices found',
    };
  }

  const savingsVsMin = ((stats.min - auctionPrice) / stats.min) * 100;
  const savingsVsMedian = ((stats.median - auctionPrice) / stats.median) * 100;

  // Worth it: auction price is at least marginPct below web minimum
  const worthItThreshold = stats.min * (1 - marginPct);
  // Not worth it: auction price is above median
  const notWorthItThreshold = stats.median;

  let status: VerdictStatus;
  let reason: string;

  if (auctionPrice <= worthItThreshold) {
    status = 'worth_it';
    reason = `${Math.abs(Math.round(savingsVsMin))}% below the lowest web price`;
  } else if (auctionPrice > notWorthItThreshold) {
    status = 'not_worth_it';
    reason = `${Math.abs(Math.round(savingsVsMedian))}% above the median web price`;
  } else {
    status = 'borderline';
    const diff = Math.round(savingsVsMin);
    if (diff > 0) {
      reason = `${diff}% below the lowest web price, but within margin`;
    } else {
      reason = `${Math.abs(diff)}% above the lowest web price`;
    }
  }

  return {
    status,
    margin: Math.round(savingsVsMin * 10) / 10,
    reason,
  };
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

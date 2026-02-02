/**
 * Heuristic scoring system for ranking candidates without AI
 */

import type { TitleCandidate, PriceCandidate } from './candidateCollector'
import type { DomainConfig } from './domainConfig'
import { isReasonablePrice } from './priceParser'

export type ExtractionConfidence = 'high' | 'medium' | 'low';

export interface ScoredTitleCandidate extends TitleCandidate {
  score: number;
  scoreBreakdown: Record<string, number>;
}

export interface ScoredPriceCandidate extends PriceCandidate {
  score: number;
  scoreBreakdown: Record<string, number>;
  priceType: 'current_bid' | 'starting_price' | 'estimate' | 'sold' | 'unknown';
}

export interface ScoringResult {
  titleCandidates: ScoredTitleCandidate[];
  priceCandidates: ScoredPriceCandidate[];
  bestTitle: ScoredTitleCandidate | null;
  bestPrice: ScoredPriceCandidate | null;
  confidence: ExtractionConfidence;
  needsAI: boolean;
}

// Positive label keywords for current bid price (FR + EN)
const PRICE_POSITIVE_LABELS = [
  // French
  'prix actuel',
  'enchère actuelle',
  'enchere actuelle',
  'enchère courante',
  'enchere courante',
  'dernière enchère',
  'derniere enchere',
  'offre actuelle',
  'mise en cours',
  'meilleure offre',
  'votre enchère',
  'highest bid',
  // English
  'current bid',
  'current price',
  'your bid',
  'highest bid',
  'winning bid',
  'top bid',
  'leading bid',
]

// Negative label keywords (not current bid)
const PRICE_NEGATIVE_LABELS = [
  // French
  'estimation',
  'estimé',
  'estime',
  'mise à prix',
  'mise a prix',
  'prix de départ',
  'prix de depart',
  'prix initial',
  'frais',
  'commission',
  'adjugé',
  'adjuge',
  'vendu',
  'prix de réserve',
  'prix de reserve',
  'prix minimum',
  // English
  'estimate',
  'estimated',
  'starting price',
  'reserve price',
  'minimum price',
  'sold',
  'hammer price',
  'final price',
  'fees',
  'commission',
  'premium',
]

// Title negative keywords (navigation, UI elements)
const TITLE_NEGATIVE_LABELS = [
  'navigation',
  'breadcrumb',
  'menu',
  'login',
  'connexion',
  'panier',
  'cart',
  'recherche',
  'search',
  'footer',
  'header',
  'cookie',
  'newsletter',
  'inscription',
  'register',
]

/**
 * Normalize text for keyword matching
 */
function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Check if text contains any of the keywords
 */
function containsKeywords(text: string, keywords: string[]): string[] {
  const normalized = normalizeForMatching(text)
  return keywords.filter(kw => normalized.includes(normalizeForMatching(kw)))
}

/**
 * Score a title candidate
 */
function scoreTitleCandidate(
  candidate: TitleCandidate,
  config: DomainConfig | null
): ScoredTitleCandidate {
  const breakdown: Record<string, number> = {}
  let score = 0

  // Tag bonus (h1 > h2 > h3 > others)
  if (candidate.tagName === 'h1') {
    breakdown.tagBonus = 30
    score += 30
  } else if (candidate.tagName === 'h2') {
    breakdown.tagBonus = 20
    score += 20
  } else if (candidate.tagName === 'h3') {
    breakdown.tagBonus = 10
    score += 10
  } else if (candidate.isMeta) {
    breakdown.tagBonus = 5
    score += 5
  }

  // Visibility bonus
  if (candidate.isVisible) {
    breakdown.visibility = 10
    score += 10
  }

  // Font size bonus (larger = more important)
  if (candidate.fontSize >= 24) {
    breakdown.fontSize = 15
    score += 15
  } else if (candidate.fontSize >= 18) {
    breakdown.fontSize = 10
    score += 10
  }

  // Position bonus (closer to top = better)
  if (candidate.distanceFromTop < 500) {
    breakdown.position = 10
    score += 10
  } else if (candidate.distanceFromTop < 1000) {
    breakdown.position = 5
    score += 5
  }

  // Length check (too short or too long is bad)
  const textLength = candidate.text.length
  if (textLength >= 10 && textLength <= 200) {
    breakdown.length = 5
    score += 5
  } else if (textLength < 5 || textLength > 300) {
    breakdown.length = -10
    score -= 10
  }

  // Negative keywords penalty
  const context = `${candidate.text } ${ candidate.labelContext}`
  const negatives = containsKeywords(context, TITLE_NEGATIVE_LABELS)
  if (negatives.length > 0) {
    const penalty = -20 * negatives.length
    breakdown.negativeKeywords = penalty
    score += penalty
  }

  // "LOT" in title is often good
  if (/\bLOT\b/i.test(candidate.text)) {
    breakdown.lotKeyword = 5
    score += 5
  }

  return {
    ...candidate,
    score,
    scoreBreakdown: breakdown,
  }
}

/**
 * Score a price candidate
 */
function scorePriceCandidate(
  candidate: PriceCandidate,
  config: DomainConfig | null
): ScoredPriceCandidate {
  const breakdown: Record<string, number> = {}
  let score = 0
  let priceType: 'current_bid' | 'starting_price' | 'estimate' | 'sold' | 'unknown' = 'unknown'

  const context = (`${candidate.labelContext } ${ candidate.text}`).toLowerCase()

  // Valid price bonus
  if (candidate.value && candidate.value > 0) {
    breakdown.validPrice = 10
    score += 10

    // Reasonable range check
    if (isReasonablePrice(candidate.value)) {
      breakdown.reasonableRange = 5
      score += 5
    } else {
      breakdown.reasonableRange = -10
      score -= 10
    }
  } else {
    breakdown.validPrice = -20
    score -= 20
  }

  // Currency detection bonus
  if (candidate.currency) {
    breakdown.currency = 5
    score += 5
  }

  // Visibility bonus
  if (candidate.isVisible) {
    breakdown.visibility = 15
    score += 15
  }

  // Font size bonus (price is often prominent)
  if (candidate.fontSize >= 20) {
    breakdown.fontSize = 15
    score += 15
  } else if (candidate.fontSize >= 16) {
    breakdown.fontSize = 8
    score += 8
  }

  // Font weight bonus
  if (candidate.fontWeight >= 600) {
    breakdown.fontWeight = 5
    score += 5
  }

  // Position bonus
  if (candidate.distanceFromTop < 800) {
    breakdown.position = 10
    score += 10
  }

  // Positive keyword matching
  const allPositiveLabels = [...PRICE_POSITIVE_LABELS, ...(config?.priceLabelsPositive || [])]
  const positives = containsKeywords(context, allPositiveLabels)
  if (positives.length > 0) {
    const bonus = 25 * Math.min(positives.length, 3)
    breakdown.positiveKeywords = bonus
    breakdown.matchedPositive = positives as any
    score += bonus
    priceType = 'current_bid'
  }

  // Negative keyword matching
  const allNegativeLabels = [...PRICE_NEGATIVE_LABELS, ...(config?.priceLabelsNegative || [])]
  const negatives = containsKeywords(context, allNegativeLabels)
  if (negatives.length > 0) {
    const penalty = -30 * Math.min(negatives.length, 3)
    breakdown.negativeKeywords = penalty
    breakdown.matchedNegative = negatives as any
    score += penalty

    // Determine type from negative keywords
    if (containsKeywords(context, ['estimation', 'estimate', 'estimé']).length > 0) {
      priceType = 'estimate'
    } else if (containsKeywords(context, ['mise à prix', 'mise a prix', 'starting price', 'prix de départ']).length > 0) {
      priceType = 'starting_price'
    } else if (containsKeywords(context, ['adjugé', 'vendu', 'sold', 'hammer']).length > 0) {
      priceType = 'sold'
    }
  }

  return {
    ...candidate,
    score,
    scoreBreakdown: breakdown,
    priceType,
  }
}

/**
 * Calculate confidence based on score margins
 */
function calculateConfidence(candidates: Array<{ score: number }>): ExtractionConfidence {
  if (candidates.length === 0) return 'low'
  if (candidates.length === 1) return candidates[0].score > 30 ? 'medium' : 'low'

  const sorted = [...candidates].sort((a, b) => b.score - a.score)
  const margin = sorted[0].score - sorted[1].score
  const topScore = sorted[0].score

  if (topScore >= 50 && margin >= 20) {
    return 'high'
  } if (topScore >= 30 && margin >= 10) {
    return 'medium'
  }
  return 'low'
}

/**
 * Score all candidates and determine best matches
 */
export function scoreAllCandidates(
  titleCandidates: TitleCandidate[],
  priceCandidates: PriceCandidate[],
  config: DomainConfig | null
): ScoringResult {
  // Score all candidates
  const scoredTitles = titleCandidates
    .map(c => scoreTitleCandidate(c, config))
    .sort((a, b) => b.score - a.score)

  const scoredPrices = priceCandidates
    .map(c => scorePriceCandidate(c, config))
    .sort((a, b) => b.score - a.score)

  // Get best candidates
  const bestTitle = scoredTitles[0] || null
  const bestPrice = scoredPrices.find(p => p.priceType === 'current_bid' && p.score > 0)
    || scoredPrices.find(p => p.score > 0 && p.priceType !== 'estimate' && p.priceType !== 'sold')
    || scoredPrices[0]
    || null

  // Calculate confidences
  const titleConfidence = calculateConfidence(scoredTitles)
  const priceConfidence = calculateConfidence(
    scoredPrices.filter(p => p.priceType !== 'estimate' && p.priceType !== 'sold')
  )

  // Overall confidence is the minimum
  let confidence: ExtractionConfidence
  if (titleConfidence === 'low' || priceConfidence === 'low') {
    confidence = 'low'
  } else if (titleConfidence === 'medium' || priceConfidence === 'medium') {
    confidence = 'medium'
  } else {
    confidence = 'high'
  }

  // Determine if AI is needed
  const needsAI = confidence === 'low' ||
    (confidence === 'medium' && scoredPrices.length > 3)

  return {
    titleCandidates: scoredTitles,
    priceCandidates: scoredPrices,
    bestTitle,
    bestPrice,
    confidence,
    needsAI,
  }
}

/**
 * Get top N candidates for debugging/AI resolution
 */
export function getTopCandidates(result: ScoringResult, n = 5): {
  topTitles: ScoredTitleCandidate[];
  topPrices: ScoredPriceCandidate[];
} {
  return {
    topTitles: result.titleCandidates.slice(0, n),
    topPrices: result.priceCandidates.slice(0, n),
  }
}

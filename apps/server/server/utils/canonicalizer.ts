import { createHash } from 'crypto';
import type {
  NormalizedResult,
  ConditionGrade,
  FunctionalState,
  DeterministicHints,
  ProductSignatures,
} from '@auction-comparator/shared';

// Broken/for-parts indicators (French + English)
const BROKEN_INDICATORS = [
  // French
  { pattern: /\bhs\b/i, weight: 1.0 },
  { pattern: /\bhors\s*service\b/i, weight: 1.0 },
  { pattern: /\bne\s*s['']?allume\s*p(as|lus)\b/i, weight: 1.0 },
  { pattern: /\bpour\s*pi[eè]ces?\b/i, weight: 1.0 },
  { pattern: /\b[àa]\s*r[ée]parer\b/i, weight: 0.9 },
  { pattern: /\bicloud\s*lock(ed)?\b/i, weight: 1.0 },
  { pattern: /\bbloqu[ée]\s*icloud\b/i, weight: 1.0 },
  { pattern: /\bne\s*fonctionne\s*p(as|lus)\b/i, weight: 1.0 },
  { pattern: /\ben\s*panne\b/i, weight: 0.9 },
  { pattern: /\bcass[ée]\b/i, weight: 0.7 },
  { pattern: /\b[ée]cran\s*cass[ée]\b/i, weight: 0.6 },
  { pattern: /\bfissur[ée]\b/i, weight: 0.5 },
  { pattern: /\bd[ée]fectueu(x|se)\b/i, weight: 0.9 },
  // English
  { pattern: /\bfor\s*parts?\b/i, weight: 1.0 },
  { pattern: /\bbroken\b/i, weight: 0.9 },
  { pattern: /\bnot\s*working\b/i, weight: 1.0 },
  { pattern: /\bdoesn['']?t\s*(turn\s*on|power\s*on|work)\b/i, weight: 1.0 },
  { pattern: /\bwon['']?t\s*(turn\s*on|power\s*on|start)\b/i, weight: 1.0 },
  { pattern: /\bdefective\b/i, weight: 0.9 },
  { pattern: /\bas[\s-]*is\b/i, weight: 0.6 },
  { pattern: /\bspares?\s*(only|or\s*repair)\b/i, weight: 1.0 },
  { pattern: /\bsalvage\b/i, weight: 0.8 },
];

// Condition indicators (French + English)
const CONDITION_INDICATORS: { pattern: RegExp; condition: ConditionGrade; weight: number }[] = [
  // New
  { pattern: /\bneuf\b/i, condition: 'new', weight: 0.9 },
  { pattern: /\bnouveau\b/i, condition: 'new', weight: 0.7 },
  { pattern: /\bsealed\b/i, condition: 'new', weight: 1.0 },
  { pattern: /\bbrand\s*new\b/i, condition: 'new', weight: 1.0 },
  { pattern: /\bnew\s*in\s*box\b/i, condition: 'new', weight: 1.0 },
  { pattern: /\bnib\b/i, condition: 'new', weight: 0.9 },
  { pattern: /\bbnib\b/i, condition: 'new', weight: 1.0 },
  { pattern: /\bsous\s*blister\b/i, condition: 'new', weight: 1.0 },
  // Used
  { pattern: /\boccasion\b/i, condition: 'used', weight: 0.9 },
  { pattern: /\busag[ée]\b/i, condition: 'used', weight: 0.9 },
  { pattern: /\bused\b/i, condition: 'used', weight: 0.9 },
  { pattern: /\bpre[\s-]*owned\b/i, condition: 'used', weight: 0.9 },
  { pattern: /\bsecond[\s-]*hand\b/i, condition: 'used', weight: 0.9 },
  { pattern: /\bd['']occasion\b/i, condition: 'used', weight: 0.9 },
  { pattern: /\breconditionn[ée]\b/i, condition: 'used', weight: 0.8 },
  { pattern: /\brefurbished\b/i, condition: 'used', weight: 0.8 },
  { pattern: /\brenewed\b/i, condition: 'used', weight: 0.8 },
  { pattern: /\bcomme\s*neuf\b/i, condition: 'used', weight: 0.85 },
  { pattern: /\blike\s*new\b/i, condition: 'used', weight: 0.85 },
  { pattern: /\btr[eè]s\s*bon\s*[ée]tat\b/i, condition: 'used', weight: 0.8 },
  { pattern: /\bbon\s*[ée]tat\b/i, condition: 'used', weight: 0.7 },
];

// Capacity patterns with normalization to GB
const CAPACITY_PATTERNS: { pattern: RegExp; toGb: (match: RegExpMatchArray) => number }[] = [
  // TB/To patterns
  { pattern: /(\d+(?:[.,]\d+)?)\s*(?:tb|to)\b/i, toGb: (m) => parseFloat(m[1].replace(',', '.')) * 1024 },
  // GB/Go patterns
  { pattern: /(\d+)\s*(?:gb|go)\b/i, toGb: (m) => parseInt(m[1], 10) },
  // MB/Mo patterns (rare but possible)
  { pattern: /(\d+)\s*(?:mb|mo)\b/i, toGb: (m) => Math.round(parseInt(m[1], 10) / 1024) },
  // Bare numbers that look like common capacities
  { pattern: /\b(16|32|64|128|256|512|1024|2048)\b(?!\s*(?:gb|go|tb|to|mb|mo|g|t|px|mp|inch|pouces?|"))/i, toGb: (m) => parseInt(m[1], 10) },
];

/**
 * Detect broken/for-parts indicators in text
 */
export function detectBrokenIndicators(text: string): { indicators: string[]; confidence: number } {
  const indicators: string[] = [];
  let maxWeight = 0;

  for (const { pattern, weight } of BROKEN_INDICATORS) {
    const match = text.match(pattern);
    if (match) {
      indicators.push(match[0]);
      maxWeight = Math.max(maxWeight, weight);
    }
  }

  return {
    indicators,
    confidence: indicators.length > 0 ? maxWeight : 0,
  };
}

/**
 * Detect condition indicators in text
 */
export function detectConditionIndicators(text: string): {
  indicators: string[];
  condition: ConditionGrade;
  confidence: number;
} {
  const indicators: string[] = [];
  let bestCondition: ConditionGrade = 'unknown';
  let bestWeight = 0;

  for (const { pattern, condition, weight } of CONDITION_INDICATORS) {
    const match = text.match(pattern);
    if (match) {
      indicators.push(match[0]);
      if (weight > bestWeight) {
        bestCondition = condition;
        bestWeight = weight;
      }
    }
  }

  return {
    indicators,
    condition: bestCondition,
    confidence: bestWeight,
  };
}

/**
 * Get deterministic hints from raw title
 */
export function getDeterministicHints(rawTitle: string): DeterministicHints {
  const broken = detectBrokenIndicators(rawTitle);
  const condition = detectConditionIndicators(rawTitle);

  return {
    brokenIndicators: broken.indicators,
    conditionIndicators: condition.indicators,
    brokenConfidence: broken.confidence,
    conditionConfidence: condition.confidence,
  };
}

/**
 * Parse capacity from text and normalize to GB
 */
export function parseCapacityToGb(text: string): number | null {
  for (const { pattern, toGb } of CAPACITY_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const gb = toGb(match);
      // Validate reasonable capacity values
      if (gb >= 1 && gb <= 16384) {
        return gb;
      }
    }
  }
  return null;
}

/**
 * Normalize brand string
 */
export function normalizeBrand(brand: string | null): string | null {
  if (!brand) return null;

  // Trim and normalize casing
  let normalized = brand.trim();

  // Common brand normalizations
  const brandMap: Record<string, string> = {
    'iphone': 'Apple',
    'ipad': 'Apple',
    'macbook': 'Apple',
    'imac': 'Apple',
    'airpods': 'Apple',
    'apple watch': 'Apple',
    'galaxy': 'Samsung',
    'surface': 'Microsoft',
    'pixel': 'Google',
    'playstation': 'Sony',
    'ps5': 'Sony',
    'ps4': 'Sony',
    'xbox': 'Microsoft',
    'vw': 'Volkswagen',
    'merc': 'Mercedes',
    'mercedes-benz': 'Mercedes',
    'land rover': 'Land Rover',
    'range rover': 'Land Rover',
  };

  const lowerBrand = normalized.toLowerCase();
  if (brandMap[lowerBrand]) {
    return brandMap[lowerBrand];
  }

  // Title case the brand
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

/**
 * Normalize model string
 */
export function normalizeModel(model: string | null): string | null {
  if (!model) return null;

  // Trim and clean up
  let normalized = model.trim();

  // Remove common boilerplate
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized;
}

/**
 * Compute strict signature for cache lookup
 * Includes: brand, model, reference, capacity_gb, functional_state, condition_grade, locale
 */
export function computeSignatureStrict(
  brand: string | null,
  model: string | null,
  reference: string | null,
  capacity_gb: number | null,
  functional_state: FunctionalState,
  condition_grade: ConditionGrade,
  locale: string
): string {
  const parts = [
    brand?.toLowerCase().trim() || '',
    model?.toLowerCase().trim() || '',
    reference?.toLowerCase().trim() || '',
    capacity_gb?.toString() || '',
    functional_state,
    condition_grade,
    locale.toLowerCase(),
  ];

  const data = parts.join('|');
  return createHash('sha256').update(data).digest('hex').slice(0, 32);
}

/**
 * Compute loose signature for fallback cache lookup
 * Excludes condition_grade for cases where condition is unknown
 */
export function computeSignatureLoose(
  brand: string | null,
  model: string | null,
  reference: string | null,
  capacity_gb: number | null,
  functional_state: FunctionalState,
  locale: string
): string {
  const parts = [
    brand?.toLowerCase().trim() || '',
    model?.toLowerCase().trim() || '',
    reference?.toLowerCase().trim() || '',
    capacity_gb?.toString() || '',
    functional_state,
    locale.toLowerCase(),
  ];

  const data = parts.join('|');
  return createHash('sha256').update(data).digest('hex').slice(0, 32);
}

/**
 * Compute both signatures for a normalized product
 */
export function computeSignatures(
  brand: string | null,
  model: string | null,
  reference: string | null,
  capacity_gb: number | null,
  functional_state: FunctionalState,
  condition_grade: ConditionGrade,
  locale: string
): ProductSignatures {
  return {
    strict: computeSignatureStrict(brand, model, reference, capacity_gb, functional_state, condition_grade, locale),
    loose: computeSignatureLoose(brand, model, reference, capacity_gb, functional_state, locale),
  };
}

/**
 * Resolve functional state from hints and AI result
 * Deterministic detection takes precedence over AI
 */
export function resolveFunctionalState(
  hints: DeterministicHints,
  aiResult?: FunctionalState
): FunctionalState {
  // High confidence broken detection is authoritative
  if (hints.brokenConfidence >= 0.8) {
    return 'broken';
  }

  // Medium confidence broken detection
  if (hints.brokenConfidence >= 0.5) {
    // If AI agrees or is unknown, trust deterministic
    if (!aiResult || aiResult === 'broken' || aiResult === 'unknown') {
      return 'broken';
    }
    // AI disagrees - use unknown to be safe
    return 'unknown';
  }

  // Low confidence or no broken indicators
  if (hints.brokenIndicators.length === 0) {
    // Trust AI if available, otherwise ok
    return aiResult || 'ok';
  }

  // Some broken indicators but low confidence
  return aiResult || 'unknown';
}

/**
 * Resolve condition grade from hints and AI result
 */
export function resolveConditionGrade(
  hints: DeterministicHints,
  aiResult?: ConditionGrade
): { grade: ConditionGrade; confidence: number } {
  const conditionResult = detectConditionIndicators(hints.conditionIndicators.join(' '));

  // Use deterministic if confident
  if (hints.conditionConfidence >= 0.7) {
    return {
      grade: conditionResult.condition,
      confidence: hints.conditionConfidence,
    };
  }

  // Use AI if available and deterministic is uncertain
  if (aiResult && aiResult !== 'unknown') {
    return {
      grade: aiResult,
      confidence: 0.6, // AI confidence is capped
    };
  }

  // Fallback
  return {
    grade: conditionResult.condition !== 'unknown' ? conditionResult.condition : 'unknown',
    confidence: hints.conditionConfidence || 0.3,
  };
}

/**
 * Canonicalize a normalized result with proper signatures
 */
export function canonicalize(
  result: NormalizedResult,
  locale: string
): NormalizedResult {
  // Get deterministic hints
  const hints = getDeterministicHints(result.normalizedTitle);

  // Parse capacity to GB
  const capacity_gb = result.capacity_gb ?? parseCapacityToGb(result.capacity || result.normalizedTitle);

  // Resolve functional state (deterministic takes precedence)
  const functional_state = resolveFunctionalState(hints, result.functional_state);

  // Resolve condition grade
  const conditionResult = resolveConditionGrade(hints, result.condition_grade);
  const condition_grade = conditionResult.grade;
  const conditionConfidence = conditionResult.confidence;

  // Normalize brand and model
  const brand = normalizeBrand(result.brand);
  const model = normalizeModel(result.model);

  // Compute signatures
  const signatures = computeSignatures(
    brand,
    model,
    result.reference,
    capacity_gb,
    functional_state,
    condition_grade,
    locale
  );

  return {
    ...result,
    brand,
    model,
    capacity_gb,
    condition_grade,
    functional_state,
    conditionConfidence,
    hints,
    signatures,
  };
}

/**
 * Check if a loose cache lookup should be allowed
 * Only allowed when condition is unknown or low confidence
 */
export function shouldAllowLooseLookup(
  condition_grade: ConditionGrade,
  conditionConfidence: number
): boolean {
  return condition_grade === 'unknown' || conditionConfidence < 0.5;
}

/**
 * Get maximum TTL for loose cache lookup (shorter than strict)
 * Returns TTL in milliseconds
 */
export function getLooseCacheTtl(): number {
  // 6 hours for loose cache lookups (vs 24h for strict)
  return 6 * 60 * 60 * 1000;
}

/**
 * Get default TTL for cache entries
 * Returns TTL in milliseconds
 */
export function getDefaultCacheTtl(): number {
  // 24 hours default
  return 24 * 60 * 60 * 1000;
}

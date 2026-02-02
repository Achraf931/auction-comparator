import type {
  NormalizeRequest,
  NormalizedResult,
  NormalizedCondition,
  ConditionGrade,
  FunctionalState,
} from '@auction-comparator/shared';
import { createHash } from 'crypto';
import {
  getDeterministicHints,
  parseCapacityToGb,
  resolveFunctionalState,
  resolveConditionGrade,
  computeSignatures,
  normalizeBrand as canonicalizeBrand,
  normalizeModel as canonicalizeModel,
} from './canonicalizer';

// Common auction boilerplate patterns to remove
const BOILERPLATE_PATTERNS = [
  /\b(lot|n[°º]|ref\.?|référence|reference)\s*:?\s*\d+/gi,
  /\b(enchère|enchere|auction|vente|sale)\b/gi,
  /\b(circa|env\.?|environ|approx\.?|approximately)\s*\d{4}\b/gi,
  /\b(état|etat|condition)\s*:?\s*/gi,
  /\b(frais|fees)\s*(inclus|included)?\b/gi,
  /\[\d+\]/g,  // [123] lot numbers
  /\(\d+\)/g,  // (123) reference numbers
  /[*#]+/g,
  /\s+/g,  // Normalize whitespace
];

// Condition keywords mapping
const CONDITION_KEYWORDS: Record<string, NormalizedCondition> = {
  // French
  'neuf': 'new',
  'nouveau': 'new',
  'occasion': 'used',
  'usagé': 'used',
  'usage': 'used',
  'reconditionné': 'refurbished',
  'remis à neuf': 'refurbished',
  // English
  'new': 'new',
  'brand new': 'new',
  'sealed': 'new',
  'used': 'used',
  'pre-owned': 'used',
  'second hand': 'used',
  'refurbished': 'refurbished',
  'renewed': 'refurbished',
  'like new': 'refurbished',
};

// Accessory indicators
const ACCESSORY_KEYWORDS = [
  'accessoire', 'accessory', 'accessories',
  'chargeur', 'charger', 'cable', 'câble',
  'housse', 'case', 'cover', 'coque', 'étui',
  'adaptateur', 'adapter', 'support', 'stand',
  'télécommande', 'remote', 'manette', 'controller',
  'batterie', 'battery', 'pile', 'piles',
  'écouteur', 'earphone', 'earbuds', 'casque audio',
  'protection', 'protector', 'film',
];

// Known brands for detection
const KNOWN_BRANDS = [
  // Tech
  'Apple', 'iPhone', 'iPad', 'MacBook', 'iMac', 'Samsung', 'Sony', 'LG', 'Huawei', 'Xiaomi',
  'Google', 'Microsoft', 'Surface', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'MSI',
  'Canon', 'Nikon', 'Leica', 'Fujifilm', 'Panasonic', 'Olympus', 'GoPro',
  'Bose', 'JBL', 'Sonos', 'Bang & Olufsen', 'B&O', 'Harman Kardon', 'Marshall',
  'Dyson', 'iRobot', 'Roomba', 'Philips', 'Bosch', 'Siemens', 'Miele',
  // Luxury
  'Rolex', 'Omega', 'Cartier', 'Patek Philippe', 'Audemars Piguet', 'Tag Heuer',
  'Hermès', 'Hermes', 'Louis Vuitton', 'LV', 'Chanel', 'Dior', 'Gucci', 'Prada',
  // Vehicles
  'Renault', 'Peugeot', 'Citroën', 'Citroen', 'Volkswagen', 'VW', 'Audi', 'BMW', 'Mercedes',
  'Ford', 'Opel', 'Fiat', 'Toyota', 'Nissan', 'Honda', 'Hyundai', 'Kia', 'Mazda',
  'Porsche', 'Ferrari', 'Lamborghini', 'Maserati', 'Jaguar', 'Land Rover', 'Volvo',
  'Harley-Davidson', 'Yamaha', 'Kawasaki', 'Suzuki', 'Ducati', 'Triumph',
];

// Capacity patterns
const CAPACITY_PATTERNS = [
  /(\d+)\s*(go|gb|to|tb|mo|mb)/i,
  /(\d+)\s*(g|t)\b/i,
  /(\d+)\s*pouces?|inch(es)?/i,
  /(\d+)\s*"(?:\s|$)/,
  /(\d+)\s*(l|litres?|liters?)\b/i,
  /(\d+)\s*(cv|ch|hp)\b/i,
];

// Model patterns
const MODEL_PATTERNS = [
  /\b([A-Z]{1,3}\d{2,4}[A-Z]?)\b/,  // A12, XS500, GT3
  /\b(\d{1,2}\s*(?:Pro|Max|Plus|Ultra|Mini|Lite|Air|SE))\b/i,
  /\b(Pro|Max|Plus|Ultra|Mini|Lite|Air|SE)\s*(\d+)?\b/i,
  /\b(Series|Gen|Generation)\s*(\d+)\b/i,
  /\b(Mark|Mk)\s*(I{1,4}|[1-4])\b/i,
  /\bVersion\s*([\d.]+)\b/i,
];

/**
 * Generate cache key for normalization request
 */
export function generateNormalizeCacheKey(request: NormalizeRequest): string {
  const data = [
    request.rawTitle.toLowerCase().trim(),
    request.locale,
    request.siteDomain,
    request.brandHint || '',
    request.modelHint || '',
  ].join('|');
  
  return createHash('sha256').update(data).digest('hex').slice(0, 32);
}

/**
 * Heuristic title normalization (no AI)
 */
export function normalizeHeuristic(request: NormalizeRequest): NormalizedResult {
  let title = request.rawTitle.trim();
  const originalTitle = title;
  
  // 1. Remove boilerplate patterns
  for (const pattern of BOILERPLATE_PATTERNS) {
    title = title.replace(pattern, ' ');
  }
  title = title.replace(/\s+/g, ' ').trim();
  
  // 2. Detect condition
  let condition: NormalizedCondition = 'unknown';
  const titleLower = originalTitle.toLowerCase();
  for (const [keyword, cond] of Object.entries(CONDITION_KEYWORDS)) {
    if (titleLower.includes(keyword.toLowerCase())) {
      condition = cond;
      break;
    }
  }
  
  // 3. Detect if accessory
  const isAccessory = ACCESSORY_KEYWORDS.some(kw => 
    titleLower.includes(kw.toLowerCase())
  );
  
  // 4. Detect brand
  let brand: string | null = request.brandHint ?? null;
  if (!brand) {
    for (const b of KNOWN_BRANDS) {
      if (titleLower.includes(b.toLowerCase())) {
        brand = b;
        break;
      }
    }
  }
  
  // 5. Detect capacity
  let capacity: string | null = null;
  for (const pattern of CAPACITY_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      capacity = match[0].toUpperCase().replace(/\s+/g, '');
      break;
    }
  }
  
  // 6. Detect model
  let model: string | null = request.modelHint ?? null;
  if (!model) {
    for (const pattern of MODEL_PATTERNS) {
      const match = title.match(pattern);
      if (match) {
        model = match[0].trim();
        break;
      }
    }
  }
  
  // 7. Extract reference (alphanumeric codes)
  let reference: string | null = null;
  const refMatch = title.match(/\b([A-Z]{2,}\d{3,}[A-Z0-9]*)\b/);
  if (refMatch && refMatch[1]) {
    reference = refMatch[1];
  }
  
  // 8. Build normalized title
  const normalizedParts: string[] = [];
  if (brand) normalizedParts.push(brand);
  if (model && model !== brand) normalizedParts.push(model);
  
  // Add remaining cleaned title if not redundant
  let cleanTitle = title;
  if (brand) cleanTitle = cleanTitle.replace(new RegExp(brand, 'gi'), '');
  if (model) cleanTitle = cleanTitle.replace(new RegExp(model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
  cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();
  
  if (cleanTitle.length > 3 && cleanTitle.length <= 80) {
    normalizedParts.push(cleanTitle);
  }
  
  const normalizedTitle = normalizedParts.join(' ').trim() || title;
  
  // 9. Build search query
  const queryParts: string[] = [];

  // Check if this is a vehicle category
  const isVehicle = request.categoryHint === 'vehicle' ||
    KNOWN_BRANDS.some(b =>
      ['Renault', 'Peugeot', 'Citroën', 'Citroen', 'Volkswagen', 'VW', 'Audi', 'BMW', 'Mercedes',
        'Ford', 'Opel', 'Fiat', 'Toyota', 'Nissan', 'Honda', 'Hyundai', 'Kia', 'Mazda',
        'Porsche', 'Ferrari', 'Lamborghini', 'Maserati', 'Jaguar', 'Land Rover', 'Volvo'].includes(b) &&
      titleLower.includes(b.toLowerCase())
    );

  if (brand) queryParts.push(brand);
  if (model) queryParts.push(model);

  // For vehicles, extract year if present
  if (isVehicle) {
    const yearMatch = originalTitle.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      queryParts.push(yearMatch[0]);
    }

    // Extract engine info (1.6, 2.0, etc)
    const engineMatch = originalTitle.match(/\b(\d[.,]\d)\s*(l|L|dci|hdi|tdi|tsi|tfsi)?\b/i);
    if (engineMatch) {
      queryParts.push(engineMatch[0].replace(',', '.'));
    }
  }

  if (capacity) queryParts.push(capacity);
  if (queryParts.length === 0) {
    // Fall back to first 60 chars of cleaned title
    queryParts.push(normalizedTitle.slice(0, 60));
  }

  const query = queryParts.join(' ').trim();
  
  // 10. Generate alternative queries
  const altQueries: string[] = [];
  
  // Alt 1: Brand + model only
  if (brand && model) {
    altQueries.push(`${brand} ${model}`);
  }
  
  // Alt 2: Add condition if used
  if (condition === 'used' && query.length < 60) {
    altQueries.push(`${query} occasion`);
  }
  
  // 11. Calculate confidence
  let confidence = 0.3; // Base heuristic confidence
  if (brand) confidence += 0.2;
  if (model) confidence += 0.2;
  if (reference) confidence += 0.1;
  if (!isAccessory) confidence += 0.1;
  confidence = Math.min(confidence, 0.8); // Cap heuristic at 0.8

  // 12. Get deterministic hints and compute extended fields
  const hints = getDeterministicHints(originalTitle);

  // Parse capacity to GB
  const capacity_gb = parseCapacityToGb(capacity || originalTitle);

  // Resolve functional state (deterministic detection)
  const functional_state = resolveFunctionalState(hints);

  // Resolve condition grade
  const conditionResult = resolveConditionGrade(hints);
  const condition_grade = conditionResult.grade;
  const conditionConfidence = conditionResult.confidence;

  // Map NormalizedCondition to ConditionGrade
  const conditionGradeFromCondition = (cond: NormalizedCondition): ConditionGrade => {
    if (cond === 'new') return 'new';
    if (cond === 'used' || cond === 'refurbished') return 'used';
    return 'unknown';
  };

  // Use detected condition_grade if better than heuristic
  const finalConditionGrade = conditionResult.confidence > 0.3
    ? condition_grade
    : conditionGradeFromCondition(condition);

  // Normalize brand and model for signatures
  const normalizedBrand = canonicalizeBrand(brand);
  const normalizedModel = canonicalizeModel(model);

  // Compute signatures
  const locale = request.locale || 'fr';
  const signatures = computeSignatures(
    normalizedBrand,
    normalizedModel,
    reference,
    capacity_gb,
    functional_state,
    finalConditionGrade,
    locale
  );

  // Detect category
  const category = request.categoryHint || (isVehicle ? 'vehicle' : 'product');

  return {
    normalizedTitle,
    brand: normalizedBrand,
    model: normalizedModel,
    reference,
    capacity,
    capacity_gb,
    condition,
    condition_grade: finalConditionGrade,
    functional_state,
    isAccessory,
    category,
    query,
    altQueries: altQueries.slice(0, 2),
    confidence,
    conditionConfidence: Math.max(conditionResult.confidence, 0.3),
    usedAI: false,
    cacheKey: generateNormalizeCacheKey(request),
    hints,
    signatures,
  };
}

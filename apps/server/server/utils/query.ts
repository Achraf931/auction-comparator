import type { CompareRequest } from '@auction-comparator/shared';

// Important product type qualifiers that significantly affect price
const IMPORTANT_TYPE_QUALIFIERS = [
  // Mowers/Garden - French (compound terms first for priority matching)
  'tondeuse autoportée', 'tondeuse autoportee', 'tracteur tondeuse', 'robot tondeuse',
  'autoportée', 'autoportee', 'autoporte',
  // Mowers/Garden - English
  'riding mower', 'ride-on mower', 'tractor mower', 'robot mower', 'lawn tractor',
  'ride-on', 'self-propelled',
  // Equipment types - French
  'chariot élévateur', 'chariot elevateur', 'nacelle articulée', 'mini-pelle', 'pelleteuse',
  // Equipment types - English
  'forklift', 'scissor lift', 'boom lift', 'excavator', 'mini excavator',
  // Vehicle types - French
  'utilitaire', 'fourgon', 'camionnette', 'poids lourd', 'car de tourisme',
  // Vehicle types - English
  'van', 'pickup', 'truck', 'heavy duty', 'coach', 'touring bus',
];

// Base product words to include when type qualifiers are found
const PRODUCT_BASE_WORDS: Record<string, string> = {
  'autoportée': 'tondeuse',
  'autoportee': 'tondeuse',
  'autoporte': 'tondeuse',
  'ride-on': 'mower',
  'riding': 'mower',
  'self-propelled': 'mower',
};

/**
 * Build an optimized search query from the compare request
 */
export function buildSearchQuery(request: CompareRequest): string {
  const parts: string[] = [];
  const titleLower = request.title.toLowerCase();

  // Add brand and model first for better matching
  if (request.brand) {
    parts.push(request.brand);
  }

  if (request.model) {
    parts.push(request.model);
  }

  // Extract important type qualifiers from title
  const typeQualifiers = extractTypeQualifiers(request.title);
  if (typeQualifiers.length > 0) {
    parts.push(...typeQualifiers);
    console.log('[Query] Found type qualifiers:', typeQualifiers);
  }

  // If we have brand, model, and type qualifiers, that's usually enough
  if (request.brand && request.model && typeQualifiers.length > 0) {
    const query = parts.join(' ').trim();
    console.log('[Query] Built from brand+model+type:', query);
    return query;
  }

  // If we have brand and model but no type qualifiers, still return
  if (request.brand && request.model) {
    const query = parts.join(' ').trim();
    console.log('[Query] Built from brand+model:', query);
    return query;
  }

  // Clean and add the title, removing redundant brand/model
  let cleanTitle = request.title;

  if (request.brand) {
    cleanTitle = cleanTitle.replace(new RegExp(request.brand, 'gi'), '').trim();
  }

  if (request.model) {
    cleanTitle = cleanTitle.replace(new RegExp(escapeRegex(request.model), 'gi'), '').trim();
  }

  // Remove type qualifiers we already added
  for (const qualifier of typeQualifiers) {
    cleanTitle = cleanTitle.replace(new RegExp(escapeRegex(qualifier), 'gi'), '').trim();
  }

  // Remove common auction-specific terms
  cleanTitle = cleanTitle
    .replace(/\b(lot|enchère|enchere|auction|vente|sale)\b/gi, '')
    .replace(/\b(circa|env|environ|approx)\s*\d{4}\b/gi, '')
    .replace(/\b(n°|num|numéro|number)\s*\d+\b/gi, '')
    .replace(/\b(imm\.?|immatricul\w*)\s*[A-Z0-9-]+/gi, '') // Remove license plates
    .replace(/\b(n°?\s*de\s*série|serial)\s*\w+/gi, '') // Remove serial numbers
    .replace(/\b(agrasc|réf\.?|ref\.?)\s*[\d/]+/gi, '') // Remove reference numbers
    .replace(/[*#]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanTitle.length > 0 && cleanTitle.length <= 60) {
    parts.push(cleanTitle);
  } else if (cleanTitle.length > 60) {
    // Take first 60 characters to avoid overly specific queries
    parts.push(cleanTitle.substring(0, 60).trim());
  }

  const query = parts.join(' ').trim();
  console.log('[Query] Built query:', query, '(from title:', request.title?.slice(0, 30), ')');
  return query;
}

/**
 * Extract important product type qualifiers from title
 * Also includes base product words when appropriate (e.g., "tondeuse" for "autoportée")
 */
function extractTypeQualifiers(title: string): string[] {
  const titleLower = title.toLowerCase();
  const found: string[] = [];

  for (const qualifier of IMPORTANT_TYPE_QUALIFIERS) {
    if (titleLower.includes(qualifier.toLowerCase())) {
      // Get the original case version from the title
      const regex = new RegExp(escapeRegex(qualifier), 'gi');
      const match = title.match(regex);
      if (match) {
        found.push(match[0]);
      } else {
        found.push(qualifier);
      }

      // Check if we need to add a base product word
      const baseWord = PRODUCT_BASE_WORDS[qualifier.toLowerCase()];
      if (baseWord && !titleLower.includes(baseWord.toLowerCase())) {
        // Title has the qualifier but not the base word, add it
        found.unshift(baseWord); // Add at beginning
      }
    }
  }

  // Deduplicate (case-insensitive) and limit
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of found) {
    const lower = item.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      unique.push(item);
    }
  }

  return unique.slice(0, 3); // Allow up to 3 for base word + 2 qualifiers
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get the Google domain for a locale
 */
export function getGoogleDomain(locale: string): string {
  const domains: Record<string, string> = {
    fr: 'google.fr',
    de: 'google.de',
    es: 'google.es',
    it: 'google.it',
    uk: 'google.co.uk',
    en: 'google.com',
  };

  return domains[locale.toLowerCase()] || 'google.com';
}

/**
 * Get the country code for a locale
 */
export function getCountryCode(locale: string): string {
  const countries: Record<string, string> = {
    fr: 'fr',
    de: 'de',
    es: 'es',
    it: 'it',
    uk: 'uk',
    en: 'us',
  };

  return countries[locale.toLowerCase()] || 'us';
}

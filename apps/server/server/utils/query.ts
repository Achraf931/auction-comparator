import type { CompareRequest } from '@auction-comparator/shared';

/**
 * Build an optimized search query from the compare request
 */
export function buildSearchQuery(request: CompareRequest): string {
  const parts: string[] = [];

  // Add brand and model first for better matching
  if (request.brand) {
    parts.push(request.brand);
  }

  if (request.model) {
    parts.push(request.model);
  }

  // If we have brand and model, that's usually enough for a good search
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

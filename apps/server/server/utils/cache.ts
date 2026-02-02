import { LRUCache } from 'lru-cache';
import type { CompareResponse } from '@auction-comparator/shared';

export interface CacheOptions {
  /** Maximum number of items in cache */
  max?: number;
  /** Time to live in milliseconds */
  ttl?: number;
}

const DEFAULT_OPTIONS: CacheOptions = {
  max: 500,
  ttl: 60 * 60 * 1000, // 1 hour
};

let cache: LRUCache<string, CompareResponse> | null = null;

function getCache(): LRUCache<string, CompareResponse> {
  if (!cache) {
    cache = new LRUCache<string, CompareResponse>({
      max: DEFAULT_OPTIONS.max!,
      ttl: DEFAULT_OPTIONS.ttl!,
    });
  }
  return cache;
}

/**
 * Generate a cache key from request parameters
 */
export function generateCacheKey(
  title: string,
  currency: string,
  locale: string,
  brand?: string,
  model?: string
): string {
  const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, ' ');
  const parts = [normalizedTitle, currency, locale];
  if (brand) parts.push(brand.toLowerCase());
  if (model) parts.push(model.toLowerCase());
  return parts.join('::');
}

/**
 * Get cached response if available
 */
export function getCachedResponse(key: string): CompareResponse | null {
  const cached = getCache().get(key);
  if (cached) {
    return {
      ...cached,
      cachedAt: cached.cachedAt,
    };
  }
  return null;
}

/**
 * Store response in cache
 */
export function setCachedResponse(
  key: string,
  response: CompareResponse,
  ttlMs?: number
): void {
  const now = Date.now();
  const ttl = ttlMs ?? DEFAULT_OPTIONS.ttl!;

  const cachedResponse: CompareResponse = {
    ...response,
    cachedAt: now,
    expiresAt: now + ttl,
  };

  getCache().set(key, cachedResponse, { ttl });
}

/**
 * Clear all cached responses
 */
export function clearCache(): void {
  getCache().clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; max: number } {
  const c = getCache();
  return {
    size: c.size,
    max: c.max,
  };
}

import { LRUCache } from 'lru-cache';
import type { NormalizedResult } from '@auction-comparator/shared';

// Cache TTL: 30 days (normalization rarely changes)
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Max cache entries
const MAX_CACHE_ENTRIES = 10000;

interface CachedNormalization {
  result: NormalizedResult;
  cachedAt: number;
  expiresAt: number;
}

// In-memory LRU cache for normalizations
const normalizationCache = new LRUCache<string, CachedNormalization>({
  max: MAX_CACHE_ENTRIES,
  ttl: CACHE_TTL_MS,
});

/**
 * Get cached normalization result
 */
export function getCachedNormalization(cacheKey: string): NormalizedResult | null {
  const cached = normalizationCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() > cached.expiresAt) {
    normalizationCache.delete(cacheKey);
    return null;
  }

  console.log('[Normalize Cache] Hit for key:', cacheKey.slice(0, 16) + '...');
  return cached.result;
}

/**
 * Cache a normalization result
 */
export function setCachedNormalization(cacheKey: string, result: NormalizedResult): void {
  const now = Date.now();

  normalizationCache.set(cacheKey, {
    result,
    cachedAt: now,
    expiresAt: now + CACHE_TTL_MS,
  });

  console.log('[Normalize Cache] Stored key:', cacheKey.slice(0, 16) + '...');
}

/**
 * Get cache statistics
 */
export function getNormalizationCacheStats(): { size: number; maxSize: number } {
  return {
    size: normalizationCache.size,
    maxSize: MAX_CACHE_ENTRIES,
  };
}

/**
 * Clear the normalization cache
 */
export function clearNormalizationCache(): void {
  normalizationCache.clear();
  console.log('[Normalize Cache] Cleared');
}

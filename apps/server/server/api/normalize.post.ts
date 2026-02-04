import type { NormalizeRequest, NormalizeResponse, NormalizeError } from '@auction-comparator/shared';
import { normalizeHeuristic, generateNormalizeCacheKey } from '../utils/normalizer-heuristic';
import { getNormalizerProvider } from '../utils/normalizer-providers';
import { getCachedNormalization, setCachedNormalization } from '../utils/normalize-cache';
import { requireAuth } from '../utils/auth';

export default defineEventHandler(async (event): Promise<NormalizeResponse | NormalizeError> => {
  // Require authentication
  let user;
  try {
    user = await requireAuth(event);
  } catch (error: any) {
    setResponseStatus(event, 401);
    return {
      code: 'INVALID_REQUEST',
      message: 'Authentication required',
    };
  }

  // Parse request body
  const body = await readBody<NormalizeRequest>(event);

  // Validate required fields
  if (!body?.rawTitle || !body?.siteDomain || !body?.locale) {
    setResponseStatus(event, 400);
    return {
      code: 'INVALID_REQUEST',
      message: 'Missing required fields: rawTitle, siteDomain, locale',
    };
  }

  // Generate cache key
  const cacheKey = generateNormalizeCacheKey(body);

  // Check cache first
  const cached = getCachedNormalization(cacheKey);
  if (cached) {
    console.log('[Normalize] Returning cached result for:', body.rawTitle.slice(0, 50));
    return {
      ...cached,
      cached: true,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
  }

  // Try AI normalization if provider is available
  const provider = getNormalizerProvider();
  let result;

  if (provider && provider.isAvailable()) {
    try {
      console.log('[Normalize] Using AI provider:', provider.id, 'for:', body.rawTitle.slice(0, 50));
      result = await provider.normalize(body);
      console.log('[Normalize] AI result - query:', result.query, 'confidence:', result.confidence);
    } catch (error) {
      console.error('[Normalize] AI provider error, falling back to heuristic:', error);
      // Fall back to heuristic on error
      result = normalizeHeuristic(body);
    }
  } else {
    // Use heuristic normalization
    console.log('[Normalize] Using heuristic for:', body.rawTitle.slice(0, 50));
    result = normalizeHeuristic(body);
  }

  // Cache the result
  setCachedNormalization(cacheKey, result);

  return {
    ...result,
    cached: false,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
});

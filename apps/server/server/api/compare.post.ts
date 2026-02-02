import type {
  CompareRequest,
  CompareResponse,
  CompareError,
  ItemCategory,
  NormalizeRequest,
  NormalizedResult,
  CompareSource,
} from '@auction-comparator/shared';
import {
  calculatePriceStats,
  calculateConfidence,
  calculateVerdict,
} from '@auction-comparator/shared';
import { getShoppingProvider } from '../providers';
import { checkRateLimit, getRemainingRequests } from '../utils/rateLimit';
import { buildSearchQuery } from '../utils/query';
import { requireAuth } from '../utils/auth';
import { normalizeHeuristic, generateNormalizeCacheKey } from '../utils/normalizer-heuristic';
import { getNormalizerProvider } from '../utils/normalizer-providers';
import { getCachedNormalization, setCachedNormalization } from '../utils/normalize-cache';
import {
  getDeterministicHints,
  canonicalize,
  computeSignatures,
  getDefaultCacheTtl,
} from '../utils/canonicalizer';
import {
  resolveCache,
  storeCacheEntry,
  recordSearchHistory,
} from '../utils/compare-cache';
import {
  hasQuotaAvailable,
  consumeQuota,
  incrementCacheHit,
  getUsageSummary,
} from '../utils/quota';
import { deduplicateRequest } from '../utils/inflight';

// Vehicle auction sites (fallback detection)
const VEHICLE_SITES = [
  'alcopa-auction.fr',
  'alcopa-auction.com',
  'vpauto.fr',
  'encheres-vo.com',
  'agorastore.fr',
];

function detectCategory(siteDomain?: string): ItemCategory {
  if (!siteDomain) return 'product';
  const domain = siteDomain.toLowerCase();
  return VEHICLE_SITES.some(site => domain.includes(site)) ? 'vehicle' : 'product';
}

export default defineEventHandler(async (event) => {
  // Require authentication
  let user;
  try {
    user = await requireAuth(event);
  } catch (error: any) {
    setResponseStatus(event, 401);
    return {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    } satisfies CompareError;
  }

  // Note: We no longer require subscription upfront.
  // Free tier users can access cache hits for free.
  // Quota is only checked before fresh fetches.

  // Use user ID for rate limiting
  const rateLimitKey = user.id;

  // Check rate limit
  const retryAfter = checkRateLimit(rateLimitKey);
  if (retryAfter > 0) {
    setResponseStatus(event, 429);
    event.node.res.setHeader('Retry-After', String(retryAfter));
    return {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
      retryAfter,
    } satisfies CompareError;
  }

  // Add rate limit headers
  event.node.res.setHeader('X-RateLimit-Remaining', String(getRemainingRequests(rateLimitKey)));

  // Parse request body
  const body = await readBody<CompareRequest>(event);

  // Validate required fields
  if (!body?.title || !body?.currency || !body?.locale || body?.auctionPrice === undefined) {
    setResponseStatus(event, 400);
    return {
      code: 'INVALID_REQUEST',
      message: 'Missing required fields: title, currency, locale, auctionPrice',
    } satisfies CompareError;
  }

  // Get API key from runtime config
  const config = useRuntimeConfig();
  const apiKey = config.serpApiKey;

  if (!apiKey) {
    setResponseStatus(event, 500);
    return {
      code: 'API_ERROR',
      message: 'Server not configured: missing SERPAPI_KEY',
    } satisfies CompareError;
  }

  // Use category from request, or detect from site domain
  const category = body.category || detectCategory(body.siteDomain);
  const locale = body.locale || 'fr';
  const domain = body.siteDomain || 'unknown';
  const lotUrl = body.lotUrl || '';
  const forceRefresh = body.forceRefresh || false;

  console.log('[Compare] Request received:', {
    title: body.title?.slice(0, 50),
    brand: body.brand,
    model: body.model,
    category,
    siteDomain: domain,
    extractionConfidence: body.extractionConfidence,
    forceRefresh,
  });

  // Step 1: Normalize the product
  const extractionConfidence = body.extractionConfidence || 'medium';
  const hasBrandAndModel = !!(body.brand && body.model);
  const shouldNormalize = hasBrandAndModel
    ? false
    : (body.useNormalization ?? (extractionConfidence !== 'high'));

  let normalized: NormalizedResult;

  if (shouldNormalize) {
    // Prepare normalization request with deterministic hints
    const hints = getDeterministicHints(body.title);
    const normalizeRequest: NormalizeRequest = {
      rawTitle: body.title,
      siteDomain: domain,
      locale,
      brandHint: body.brand,
      modelHint: body.model,
      categoryHint: category,
      lotUrl,
      hints,
    };

    const normalizeCacheKey = generateNormalizeCacheKey(normalizeRequest);
    let cachedNormalized = getCachedNormalization(normalizeCacheKey);

    if (cachedNormalized) {
      // Re-canonicalize to ensure signatures are computed
      normalized = canonicalize(cachedNormalized, locale);
    } else {
      // Try AI normalization first, fall back to heuristic
      const provider = getNormalizerProvider();

      if (provider && provider.isAvailable()) {
        try {
          console.log('[Compare] Using AI normalization for:', body.title.slice(0, 50));
          normalized = await provider.normalize(normalizeRequest);
          normalized = canonicalize(normalized, locale);
        } catch (error) {
          console.error('[Compare] AI normalization failed, using heuristic:', error);
          normalized = normalizeHeuristic(normalizeRequest);
        }
      } else {
        console.log('[Compare] Using heuristic normalization for:', body.title.slice(0, 50));
        normalized = normalizeHeuristic(normalizeRequest);
      }

      // Cache the normalization result
      setCachedNormalization(normalizeCacheKey, normalized);
    }
  } else {
    // High confidence OR has brand+model - use deterministic query building
    const hints = getDeterministicHints(body.title);
    const query = buildSearchQuery(body);

    // Create a minimal normalized result
    normalized = {
      normalizedTitle: body.title,
      brand: body.brand || null,
      model: body.model || null,
      reference: null,
      capacity: null,
      capacity_gb: null,
      condition: 'unknown',
      condition_grade: 'unknown',
      functional_state: hints.brokenConfidence >= 0.8 ? 'broken' : 'ok',
      isAccessory: false,
      category,
      query,
      altQueries: [],
      confidence: 0.8,
      conditionConfidence: 0.3,
      usedAI: false,
      hints,
      signatures: computeSignatures(
        body.brand || null,
        body.model || null,
        null,
        null,
        hints.brokenConfidence >= 0.8 ? 'broken' : 'ok',
        'unknown',
        locale
      ),
    };
  }

  console.log('[Compare] Normalized result:', {
    query: normalized.query,
    brand: normalized.brand,
    model: normalized.model,
    functional_state: normalized.functional_state,
    condition_grade: normalized.condition_grade,
    signatures: normalized.signatures,
  });

  // Warn if this appears to be an accessory or broken
  if (normalized.isAccessory) {
    console.log('[Compare] Warning: Item appears to be an accessory');
  }
  if (normalized.functional_state === 'broken') {
    console.log('[Compare] Warning: Item appears to be broken/for parts');
  }

  // Step 2: Check cache
  const signatures = normalized.signatures!;
  const cacheResult = await resolveCache(
    signatures,
    normalized.condition_grade,
    normalized.conditionConfidence,
    forceRefresh
  );

  if (cacheResult.entry) {
    // Cache hit - don't consume quota
    console.log('[Compare] Cache HIT (' + cacheResult.source + ')');

    await incrementCacheHit(user.id);

    // Record in history
    await recordSearchHistory(
      user.id,
      domain,
      lotUrl,
      body.title,
      normalized,
      cacheResult.source,
      cacheResult.entry.id,
      body.auctionPrice,
      body.currency
    );

    // Recalculate verdict with current auction price
    const verdict = calculateVerdict(body.auctionPrice, cacheResult.entry.stats);
    const usage = await getUsageSummary(user.id);

    return {
      queryUsed: cacheResult.entry.queryUsed,
      results: cacheResult.entry.results,
      stats: cacheResult.entry.stats,
      confidence: cacheResult.entry.confidence,
      verdict,
      cachedAt: cacheResult.entry.fetchedAt.getTime(),
      expiresAt: cacheResult.entry.expiresAt.getTime(),
      cache: {
        source: cacheResult.source,
        cacheEntryId: cacheResult.entry.id,
        fetchedAt: cacheResult.entry.fetchedAt.getTime(),
        expiresAt: cacheResult.entry.expiresAt.getTime(),
        signatureUsed: cacheResult.source === 'cache_strict' ? signatures.strict : signatures.loose,
      },
      normalized: {
        brand: normalized.brand,
        model: normalized.model,
        capacity_gb: normalized.capacity_gb,
        condition_grade: normalized.condition_grade,
        functional_state: normalized.functional_state,
        category: normalized.category,
        signatures,
      },
      usage,
    } satisfies CompareResponse;
  }

  // Cache miss - need fresh fetch
  console.log('[Compare] Cache MISS - checking quota');

  // Step 3: Check quota before fresh fetch (subscription or free tier)
  const quotaCheck = await hasQuotaAvailable(user.id);
  if (!quotaCheck.available) {
    console.log('[Compare] Quota not available:', quotaCheck.errorCode);

    const usage = await getUsageSummary(user.id);

    setResponseStatus(event, 402);
    return {
      code: quotaCheck.errorCode || 'QUOTA_EXCEEDED',
      message: quotaCheck.errorMessage || 'No quota available',
      usage,
      cacheOnlyAvailable: false,
    } satisfies CompareError;
  }

  console.log('[Compare] Quota available via:', quotaCheck.source);

  // Step 4: Deduplicate in-flight requests and perform fresh fetch
  const query = normalized.query;

  const { result: fetchResult, wasDeduped } = await deduplicateRequest(
    signatures.strict,
    async () => {
      console.log('[Compare] Performing fresh fetch for query:', query);

      const provider = getShoppingProvider(apiKey);
      const results = await provider.search({
        query,
        currency: body.currency,
        locale,
        maxResults: 15,
        category,
      });

      return results;
    }
  );

  if (wasDeduped) {
    console.log('[Compare] Request was deduplicated');
  }

  console.log(`[Compare] Search returned ${fetchResult.length} raw results`);

  // Filter and sort results by relevance
  const relevanceThreshold = category === 'vehicle' ? 0.15 : 0.25;

  let filteredResults = fetchResult
    .filter((r) => r.relevanceScore >= relevanceThreshold)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  // For vehicles, filter by price sanity check
  if (category === 'vehicle' && body.auctionPrice > 0) {
    const minReasonablePrice = body.auctionPrice * 0.2;
    const originalCount = filteredResults.length;
    filteredResults = filteredResults.filter((r) => r.price >= minReasonablePrice);
    if (filteredResults.length < originalCount) {
      console.log(`[Compare] Filtered out ${originalCount - filteredResults.length} vehicle results with suspiciously low prices`);
    }
  }

  filteredResults = filteredResults.slice(0, 10);

  console.log(`[Compare] After filtering (threshold ${relevanceThreshold}): ${filteredResults.length} results`);

  // Handle no results
  if (filteredResults.length === 0) {
    if (fetchResult.length > 0) {
      // Try relaxed filtering
      const lowestThreshold = 0.05;
      const relaxedResults = fetchResult
        .filter((r) => r.relevanceScore >= lowestThreshold)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 10);

      if (relaxedResults.length > 0) {
        console.log(`[Compare] Using relaxed filtering: ${relaxedResults.length} results`);
        filteredResults = relaxedResults;
      }
    }

    if (filteredResults.length === 0) {
      // Record failed search in history
      await recordSearchHistory(
        user.id,
        domain,
        lotUrl,
        body.title,
        normalized,
        'fresh_fetch',
        null,
        body.auctionPrice,
        body.currency
      );

      // Still consume quota for the API call
      await consumeQuota(user.id, quotaCheck);

      setResponseStatus(event, 404);
      return {
        code: 'NO_RESULTS',
        message: `No comparable ${category === 'vehicle' ? 'vehicles' : 'products'} found for: "${query}"`,
      } satisfies CompareError;
    }
  }

  // Calculate statistics
  const stats = calculatePriceStats(filteredResults);
  const confidence = calculateConfidence(filteredResults);
  const verdict = calculateVerdict(body.auctionPrice, stats);

  // Step 5: Store in cache
  const cacheEntry = await storeCacheEntry(
    signatures,
    query,
    filteredResults,
    stats,
    confidence,
    getDefaultCacheTtl()
  );

  // Step 6: Consume quota and record history
  const consumed = await consumeQuota(user.id, quotaCheck);
  if (!consumed) {
    console.error('[Compare] Failed to consume quota - race condition?');
    // Continue anyway since we already made the API call
  }

  await recordSearchHistory(
    user.id,
    domain,
    lotUrl,
    body.title,
    normalized,
    'fresh_fetch',
    cacheEntry.id,
    body.auctionPrice,
    body.currency
  );

  const usage = await getUsageSummary(user.id);

  console.log('[Compare] Fresh fetch complete, quota:', usage.freshFetchCount + '/' + usage.quota);

  return {
    queryUsed: query,
    results: filteredResults,
    stats,
    confidence,
    verdict,
    cachedAt: cacheEntry.fetchedAt.getTime(),
    expiresAt: cacheEntry.expiresAt.getTime(),
    cache: {
      source: 'fresh_fetch',
      cacheEntryId: cacheEntry.id,
      fetchedAt: cacheEntry.fetchedAt.getTime(),
      expiresAt: cacheEntry.expiresAt.getTime(),
      signatureUsed: signatures.strict,
    },
    normalized: {
      brand: normalized.brand,
      model: normalized.model,
      capacity_gb: normalized.capacity_gb,
      condition_grade: normalized.condition_grade,
      functional_state: normalized.functional_state,
      category: normalized.category,
      signatures,
    },
    usage,
  } satisfies CompareResponse;
});

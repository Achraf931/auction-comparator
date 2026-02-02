import { eq, and, gt, lt } from 'drizzle-orm';
import { db, compareCacheEntries, searchHistory } from '../db';
import type { CompareCacheEntry, CompareSource } from '../db/schema';
import type {
  WebPriceResult,
  PriceStats,
  ConfidenceLevel,
  ProductSignatures,
  NormalizedResult,
} from '@auction-comparator/shared';
import { getDefaultCacheTtl, getLooseCacheTtl, shouldAllowLooseLookup } from './canonicalizer';

export interface CacheEntry {
  id: string;
  signatureStrict: string;
  signatureLoose: string;
  queryUsed: string;
  results: WebPriceResult[];
  stats: PriceStats;
  confidence: ConfidenceLevel;
  fetchedAt: Date;
  expiresAt: Date;
}

export interface CacheLookupResult {
  entry: CacheEntry | null;
  source: CompareSource;
}

/**
 * Parse stored cache entry from database
 */
function parseCacheEntry(dbEntry: CompareCacheEntry): CacheEntry {
  return {
    id: dbEntry.id,
    signatureStrict: dbEntry.signatureStrict,
    signatureLoose: dbEntry.signatureLoose,
    queryUsed: dbEntry.queryUsed,
    results: JSON.parse(dbEntry.resultsJson) as WebPriceResult[],
    stats: JSON.parse(dbEntry.statsJson) as PriceStats,
    confidence: dbEntry.confidence,
    fetchedAt: dbEntry.fetchedAt,
    expiresAt: dbEntry.expiresAt,
  };
}

/**
 * Look up cache by strict signature
 */
export async function getCacheByStrictSignature(
  signatureStrict: string
): Promise<CacheEntry | null> {
  const now = new Date();

  const entry = await db.query.compareCacheEntries.findFirst({
    where: and(
      eq(compareCacheEntries.signatureStrict, signatureStrict),
      gt(compareCacheEntries.expiresAt, now)
    ),
  });

  if (!entry) return null;

  return parseCacheEntry(entry);
}

/**
 * Look up cache by loose signature with stricter TTL
 */
export async function getCacheByLooseSignature(
  signatureLoose: string,
  conditionGrade: string,
  conditionConfidence: number
): Promise<CacheEntry | null> {
  // Check if loose lookup is allowed
  if (!shouldAllowLooseLookup(conditionGrade as any, conditionConfidence)) {
    return null;
  }

  const now = new Date();
  const looseTtl = getLooseCacheTtl();
  const minFetchedAt = new Date(now.getTime() - looseTtl);

  const entry = await db.query.compareCacheEntries.findFirst({
    where: and(
      eq(compareCacheEntries.signatureLoose, signatureLoose),
      gt(compareCacheEntries.expiresAt, now),
      gt(compareCacheEntries.fetchedAt, minFetchedAt)
    ),
  });

  if (!entry) return null;

  return parseCacheEntry(entry);
}

/**
 * Resolve cache entry using strict-first, then loose lookup
 */
export async function resolveCache(
  signatures: ProductSignatures,
  conditionGrade: string,
  conditionConfidence: number,
  forceRefresh: boolean = false
): Promise<CacheLookupResult> {
  if (forceRefresh) {
    return { entry: null, source: 'fresh_fetch' };
  }

  // Try strict signature first
  const strictEntry = await getCacheByStrictSignature(signatures.strict);
  if (strictEntry) {
    return { entry: strictEntry, source: 'cache_strict' };
  }

  // Try loose signature if allowed
  const looseEntry = await getCacheByLooseSignature(
    signatures.loose,
    conditionGrade,
    conditionConfidence
  );
  if (looseEntry) {
    return { entry: looseEntry, source: 'cache_loose' };
  }

  return { entry: null, source: 'fresh_fetch' };
}

/**
 * Store a new cache entry
 */
export async function storeCacheEntry(
  signatures: ProductSignatures,
  queryUsed: string,
  results: WebPriceResult[],
  stats: PriceStats,
  confidence: ConfidenceLevel,
  ttlMs?: number
): Promise<CacheEntry> {
  const now = new Date();
  const ttl = ttlMs ?? getDefaultCacheTtl();
  const expiresAt = new Date(now.getTime() + ttl);
  const id = crypto.randomUUID();

  // Check if entry already exists
  const existing = await db.query.compareCacheEntries.findFirst({
    where: eq(compareCacheEntries.signatureStrict, signatures.strict),
  });

  if (existing) {
    // Update existing entry
    await db.update(compareCacheEntries)
      .set({
        queryUsed,
        resultsJson: JSON.stringify(results),
        statsJson: JSON.stringify(stats),
        confidence,
        fetchedAt: now,
        expiresAt,
        updatedAt: now,
      })
      .where(eq(compareCacheEntries.id, existing.id));

    return {
      id: existing.id,
      signatureStrict: signatures.strict,
      signatureLoose: signatures.loose,
      queryUsed,
      results,
      stats,
      confidence,
      fetchedAt: now,
      expiresAt,
    };
  }

  // Insert new entry
  await db.insert(compareCacheEntries).values({
    id,
    signatureStrict: signatures.strict,
    signatureLoose: signatures.loose,
    provider: 'serpapi',
    queryUsed,
    resultsJson: JSON.stringify(results),
    statsJson: JSON.stringify(stats),
    confidence,
    fetchedAt: now,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    signatureStrict: signatures.strict,
    signatureLoose: signatures.loose,
    queryUsed,
    results,
    stats,
    confidence,
    fetchedAt: now,
    expiresAt,
  };
}

/**
 * Record a search in history
 */
export async function recordSearchHistory(
  userId: string,
  domain: string,
  lotUrl: string,
  rawTitle: string,
  normalized: NormalizedResult,
  compareSource: CompareSource,
  cacheEntryId: string | null,
  auctionPrice: number | null,
  currency: string | null
): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(searchHistory).values({
    id,
    userId,
    createdAt: now,
    domain,
    lotUrl,
    rawTitle,
    normalizedJson: JSON.stringify(normalized),
    signatureStrict: normalized.signatures?.strict || '',
    signatureLoose: normalized.signatures?.loose || '',
    compareSource,
    cacheEntryId,
    auctionPrice,
    currency,
  });
}

/**
 * Get search history for a user
 */
export async function getSearchHistory(
  userId: string,
  options: {
    page?: number;
    pageSize?: number;
    domain?: string;
    compareSource?: CompareSource;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{ entries: any[]; total: number }> {
  const {
    page = 1,
    pageSize = 20,
    domain,
    compareSource,
    startDate,
    endDate,
  } = options;

  const offset = (page - 1) * pageSize;

  // Build conditions
  const conditions = [eq(searchHistory.userId, userId)];

  if (domain) {
    conditions.push(eq(searchHistory.domain, domain));
  }

  if (compareSource) {
    conditions.push(eq(searchHistory.compareSource, compareSource));
  }

  if (startDate) {
    conditions.push(gt(searchHistory.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lt(searchHistory.createdAt, endDate));
  }

  // Get entries with cache data
  const entries = await db.query.searchHistory.findMany({
    where: and(...conditions),
    with: {
      cacheEntry: true,
    },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    limit: pageSize,
    offset,
  });

  // Get total count
  const allEntries = await db.query.searchHistory.findMany({
    where: and(...conditions),
    columns: { id: true },
  });

  return {
    entries: entries.map((entry) => {
      const normalized = JSON.parse(entry.normalizedJson);
      const cacheStats = entry.cacheEntry
        ? JSON.parse(entry.cacheEntry.statsJson)
        : null;

      return {
        id: entry.id,
        createdAt: entry.createdAt.toISOString(),
        domain: entry.domain,
        lotUrl: entry.lotUrl,
        rawTitle: entry.rawTitle,
        normalizedTitle: normalized.normalizedTitle,
        auctionPrice: entry.auctionPrice,
        currency: entry.currency,
        compareSource: entry.compareSource,
        stats: cacheStats,
        fetchedAt: entry.cacheEntry?.fetchedAt?.toISOString(),
      };
    }),
    total: allEntries.length,
  };
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  const now = new Date();

  const result = await db.delete(compareCacheEntries)
    .where(lt(compareCacheEntries.expiresAt, now));

  return result.changes;
}

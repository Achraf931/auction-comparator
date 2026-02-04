/**
 * Minimal quota utility - cache hit tracking only
 * Credit consumption is handled by credits.ts
 * This file exists for backward compatibility with cache hit statistics
 */

/**
 * Increment cache hit count (statistics only, no cost)
 * Cache hits are FREE - no credits consumed
 */
export async function incrementCacheHit(userId: string): Promise<void> {
  // Cache hits are free and tracked in search_history already
  // This is a no-op for stats tracking
  console.log(`[Stats] Cache hit for user ${userId} - FREE, no credit consumed`);
}

/**
 * Get basic usage summary (simplified for credit system)
 * @deprecated Use getCreditsSummary from credits.ts instead
 */
export async function getUsageSummary(userId: string): Promise<{
  cacheHitsTracked: boolean;
}> {
  return {
    cacheHitsTracked: true,
  };
}

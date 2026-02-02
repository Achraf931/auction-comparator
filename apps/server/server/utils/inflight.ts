/**
 * In-flight request deduplication
 *
 * Prevents duplicate SerpApi calls when multiple requests for the same
 * product signature arrive simultaneously.
 *
 * Note: This is an in-memory implementation that works per Nitro instance.
 * For multi-instance deployments, use Redis or a similar distributed lock.
 */

interface InFlightRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

// Map of signature -> pending request promise
const inFlightRequests = new Map<string, InFlightRequest<any>>();

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
// Max age for stale entries (10 minutes)
const MAX_ENTRY_AGE = 10 * 60 * 1000;

/**
 * Get or create an in-flight request
 *
 * If a request for the same signature is already in progress,
 * returns the existing promise. Otherwise, executes the factory
 * function and tracks it.
 */
export async function deduplicateRequest<T>(
  signature: string,
  factory: () => Promise<T>
): Promise<{ result: T; wasDeduped: boolean }> {
  // Check for existing in-flight request
  const existing = inFlightRequests.get(signature);
  if (existing) {
    console.log(`[InFlight] Deduplicating request for signature: ${signature.slice(0, 16)}...`);
    try {
      const result = await existing.promise;
      return { result, wasDeduped: true };
    } catch (error) {
      // If the existing request failed, remove it and continue with new request
      inFlightRequests.delete(signature);
    }
  }

  // Create new request
  const promise = factory();
  const entry: InFlightRequest<T> = {
    promise,
    timestamp: Date.now(),
  };

  inFlightRequests.set(signature, entry);

  try {
    const result = await promise;
    return { result, wasDeduped: false };
  } finally {
    // Clean up after completion
    inFlightRequests.delete(signature);
  }
}

/**
 * Check if a request is currently in-flight
 */
export function isRequestInFlight(signature: string): boolean {
  return inFlightRequests.has(signature);
}

/**
 * Get count of in-flight requests
 */
export function getInFlightCount(): number {
  return inFlightRequests.size;
}

/**
 * Clean up stale in-flight entries
 * (shouldn't normally happen, but protects against stuck requests)
 */
export function cleanupStaleEntries(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [signature, entry] of inFlightRequests.entries()) {
    if (now - entry.timestamp > MAX_ENTRY_AGE) {
      inFlightRequests.delete(signature);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[InFlight] Cleaned up ${cleaned} stale entries`);
  }

  return cleaned;
}

// Set up periodic cleanup
let cleanupTimer: NodeJS.Timeout | null = null;

export function startCleanupTimer(): void {
  if (!cleanupTimer) {
    cleanupTimer = setInterval(cleanupStaleEntries, CLEANUP_INTERVAL);
    // Don't block process exit
    if (cleanupTimer.unref) {
      cleanupTimer.unref();
    }
  }
}

export function stopCleanupTimer(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// Start cleanup timer on module load
startCleanupTimer();

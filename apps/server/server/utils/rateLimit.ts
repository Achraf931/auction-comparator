interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

/** Maximum requests per window for authenticated users */
const MAX_REQUESTS_AUTH = 30;

/** Maximum requests per window for unauthenticated (per IP) */
const MAX_REQUESTS_UNAUTH = 10;

/** Window size in milliseconds (1 minute) */
const WINDOW_MS = 60 * 1000;

export type RateLimitType = 'auth' | 'ip';

/**
 * Check if a client has exceeded rate limits
 * Returns the number of seconds to wait if limited, or 0 if allowed
 */
export function checkRateLimit(clientId: string, type: RateLimitType = 'auth'): number {
  const now = Date.now();
  const key = `${type}:${clientId}`;
  const entry = rateLimits.get(key);
  const maxRequests = type === 'auth' ? MAX_REQUESTS_AUTH : MAX_REQUESTS_UNAUTH;

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    cleanupExpiredEntries(now);
  }

  if (!entry || entry.resetAt <= now) {
    // New window
    rateLimits.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return 0;
  }

  if (entry.count >= maxRequests) {
    // Rate limited
    return Math.ceil((entry.resetAt - now) / 1000);
  }

  // Increment count
  entry.count++;
  return 0;
}

/**
 * Check both auth and IP rate limits
 * Returns the number of seconds to wait if either is limited, or 0 if allowed
 */
export function checkDualRateLimit(userId: string | null, ip: string): number {
  // Always check IP limit
  const ipLimit = checkRateLimit(ip, 'ip');
  if (ipLimit > 0) return ipLimit;

  // If authenticated, also check user limit
  if (userId) {
    const authLimit = checkRateLimit(userId, 'auth');
    if (authLimit > 0) return authLimit;
  }

  return 0;
}

/**
 * Get remaining requests for a client
 */
export function getRemainingRequests(clientId: string, type: RateLimitType = 'auth'): number {
  const now = Date.now();
  const key = `${type}:${clientId}`;
  const entry = rateLimits.get(key);
  const maxRequests = type === 'auth' ? MAX_REQUESTS_AUTH : MAX_REQUESTS_UNAUTH;

  if (!entry || entry.resetAt <= now) {
    return maxRequests;
  }

  return Math.max(0, maxRequests - entry.count);
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimits.entries()) {
    if (entry.resetAt <= now) {
      rateLimits.delete(key);
    }
  }
}

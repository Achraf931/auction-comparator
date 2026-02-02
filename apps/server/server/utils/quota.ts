import { eq, and, gt, sql } from 'drizzle-orm';
import { db, planLimits, usagePeriods, subscriptions, users, FREE_FRESH_FETCH_ALLOWANCE } from '../db';
import type { PlanKey, UsagePeriod, BillingPeriod, User } from '../db/schema';
import type { UsageSummary } from '@auction-comparator/shared';
import { hasActiveSubscription } from '@auction-comparator/shared';

// Default plan quotas (monthly, regardless of billing period)
const DEFAULT_QUOTAS: Record<PlanKey, number> = {
  starter: 50,
  pro: 300,
  business: 2000,
};

/**
 * Get current billing period string (YYYY-MM)
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get days remaining in current period
 */
export function getDaysRemaining(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.max(0, lastDay.getDate() - now.getDate());
}

/**
 * Get plan limit for a user based on their subscription
 * Returns the plan key, billing period, and monthly quota
 */
export async function getPlanLimit(userId: string): Promise<{
  planKey: PlanKey;
  billingPeriod: BillingPeriod | null;
  quota: number;
}> {
  // Get user's subscription
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  // Use plan_key from subscription, default to starter if not set
  const planKey: PlanKey = (sub?.planKey as PlanKey) || 'starter';
  const billingPeriod: BillingPeriod | null = (sub?.billingPeriod as BillingPeriod) || null;

  // Try to get quota from database first
  const dbLimit = await db.query.planLimits.findFirst({
    where: eq(planLimits.planKey, planKey),
  });

  // Quota is always MONTHLY, regardless of billing period
  const quota = dbLimit?.monthlyFreshFetchQuota ?? DEFAULT_QUOTAS[planKey];

  return { planKey, billingPeriod, quota };
}

/**
 * Get or create usage period for user
 */
export async function getOrCreateUsagePeriod(userId: string): Promise<UsagePeriod> {
  const period = getCurrentPeriod();

  // Try to find existing period
  let usagePeriod = await db.query.usagePeriods.findFirst({
    where: and(
      eq(usagePeriods.userId, userId),
      eq(usagePeriods.periodYyyymm, period)
    ),
  });

  if (!usagePeriod) {
    // Create new period
    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(usagePeriods).values({
      id,
      userId,
      periodYyyymm: period,
      freshFetchCount: 0,
      cacheHitCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    usagePeriod = await db.query.usagePeriods.findFirst({
      where: eq(usagePeriods.id, id),
    });

    if (!usagePeriod) {
      throw new Error('Failed to create usage period');
    }
  }

  return usagePeriod;
}

/**
 * Result of quota check
 */
export interface QuotaCheckResult {
  available: boolean;
  source: 'subscription' | 'free_tier' | 'none';
  // Subscription quota (if applicable)
  monthlyUsed: number | null;
  monthlyQuota: number | null;
  planKey: PlanKey | null;
  // Free tier (always returned)
  freeRemaining: number;
  freeUsed: number;
  freeTotal: number;
  // Error info (if not available)
  errorCode?: 'QUOTA_EXCEEDED' | 'FREE_EXHAUSTED';
  errorMessage?: string;
}

/**
 * Get user's subscription status
 */
async function getUserSubscriptionStatus(userId: string): Promise<{
  hasSubscription: boolean;
  planKey: PlanKey | null;
  billingPeriod: BillingPeriod | null;
  quota: number | null;
}> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (!sub || !hasActiveSubscription(sub.status)) {
    return { hasSubscription: false, planKey: null, billingPeriod: null, quota: null };
  }

  const planKey = sub.planKey as PlanKey | null;
  if (!planKey) {
    return { hasSubscription: false, planKey: null, billingPeriod: null, quota: null };
  }

  const billingPeriod = sub.billingPeriod as BillingPeriod | null;

  // Get quota from database or default
  const dbLimit = await db.query.planLimits.findFirst({
    where: eq(planLimits.planKey, planKey),
  });

  const quota = dbLimit?.monthlyFreshFetchQuota ?? DEFAULT_QUOTAS[planKey];

  return { hasSubscription: true, planKey, billingPeriod, quota };
}

/**
 * Get user's free tier status
 */
async function getUserFreeTierStatus(userId: string): Promise<{
  remaining: number;
  used: number;
  total: number;
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      freeFreshFetchRemaining: true,
      freeFreshFetchUsed: true,
    },
  });

  return {
    remaining: user?.freeFreshFetchRemaining ?? FREE_FRESH_FETCH_ALLOWANCE,
    used: user?.freeFreshFetchUsed ?? 0,
    total: FREE_FRESH_FETCH_ALLOWANCE,
  };
}

/**
 * Check if user has quota available for fresh fetch
 * Priority: subscription > free tier
 */
export async function hasQuotaAvailable(userId: string): Promise<QuotaCheckResult> {
  // Check subscription status
  const subStatus = await getUserSubscriptionStatus(userId);
  const freeTier = await getUserFreeTierStatus(userId);

  // If user has active subscription, use subscription quota
  if (subStatus.hasSubscription && subStatus.quota !== null) {
    const usagePeriod = await getOrCreateUsagePeriod(userId);
    const available = usagePeriod.freshFetchCount < subStatus.quota;

    return {
      available,
      source: available ? 'subscription' : 'none',
      monthlyUsed: usagePeriod.freshFetchCount,
      monthlyQuota: subStatus.quota,
      planKey: subStatus.planKey,
      freeRemaining: freeTier.remaining,
      freeUsed: freeTier.used,
      freeTotal: freeTier.total,
      ...(available ? {} : {
        errorCode: 'QUOTA_EXCEEDED',
        errorMessage: `Monthly quota exceeded (${usagePeriod.freshFetchCount}/${subStatus.quota}). Upgrade your plan for more fresh fetches.`,
      }),
    };
  }

  // No subscription - check free tier
  if (freeTier.remaining > 0) {
    return {
      available: true,
      source: 'free_tier',
      monthlyUsed: null,
      monthlyQuota: null,
      planKey: null,
      freeRemaining: freeTier.remaining,
      freeUsed: freeTier.used,
      freeTotal: freeTier.total,
    };
  }

  // No subscription and free tier exhausted
  return {
    available: false,
    source: 'none',
    monthlyUsed: null,
    monthlyQuota: null,
    planKey: null,
    freeRemaining: 0,
    freeUsed: freeTier.used,
    freeTotal: freeTier.total,
    errorCode: 'FREE_EXHAUSTED',
    errorMessage: 'Your free trial has ended. Subscribe to continue using price comparisons.',
  };
}

/**
 * Legacy check for backwards compatibility
 */
export async function hasQuotaAvailableLegacy(userId: string): Promise<{
  available: boolean;
  current: number;
  quota: number;
  planKey: PlanKey;
}> {
  const { planKey, quota } = await getPlanLimit(userId);
  const usagePeriod = await getOrCreateUsagePeriod(userId);

  return {
    available: usagePeriod.freshFetchCount < quota,
    current: usagePeriod.freshFetchCount,
    quota,
    planKey,
  };
}

/**
 * Increment fresh fetch count for user (subscription quota)
 */
export async function incrementFreshFetch(userId: string): Promise<void> {
  const usagePeriod = await getOrCreateUsagePeriod(userId);

  await db.update(usagePeriods)
    .set({
      freshFetchCount: usagePeriod.freshFetchCount + 1,
      updatedAt: new Date(),
    })
    .where(eq(usagePeriods.id, usagePeriod.id));
}

/**
 * Atomically decrement free tier allowance
 * Returns true if decrement was successful, false if already at 0
 * Uses conditional update for race safety
 */
export async function decrementFreeTier(userId: string): Promise<boolean> {
  const result = await db.update(users)
    .set({
      freeFreshFetchRemaining: sql`${users.freeFreshFetchRemaining} - 1`,
      freeFreshFetchUsed: sql`${users.freeFreshFetchUsed} + 1`,
      freeFreshFetchGrantedAt: sql`COALESCE(${users.freeFreshFetchGrantedAt}, ${Date.now()})`,
      updatedAt: new Date(),
    })
    .where(and(
      eq(users.id, userId),
      gt(users.freeFreshFetchRemaining, 0)
    ));

  return result.changes > 0;
}

/**
 * Consume quota based on current status
 * For subscribed users: increments monthly usage
 * For free tier users: decrements free allowance atomically
 * Returns success status
 */
export async function consumeQuota(userId: string, quotaCheck: QuotaCheckResult): Promise<boolean> {
  if (quotaCheck.source === 'subscription') {
    await incrementFreshFetch(userId);
    return true;
  }

  if (quotaCheck.source === 'free_tier') {
    return await decrementFreeTier(userId);
  }

  return false;
}

/**
 * Increment cache hit count for user
 */
export async function incrementCacheHit(userId: string): Promise<void> {
  const usagePeriod = await getOrCreateUsagePeriod(userId);

  await db.update(usagePeriods)
    .set({
      cacheHitCount: usagePeriod.cacheHitCount + 1,
      updatedAt: new Date(),
    })
    .where(eq(usagePeriods.id, usagePeriod.id));
}

/**
 * Extended usage summary including free tier
 */
export interface ExtendedUsageSummary extends UsageSummary {
  freeRemaining: number;
  freeUsed: number;
  freeTotal: number;
  hasSubscription: boolean;
}

/**
 * Get usage summary for user (includes free tier info)
 */
export async function getUsageSummary(userId: string): Promise<ExtendedUsageSummary> {
  const subStatus = await getUserSubscriptionStatus(userId);
  const freeTier = await getUserFreeTierStatus(userId);
  const usagePeriod = await getOrCreateUsagePeriod(userId);

  return {
    period: usagePeriod.periodYyyymm,
    freshFetchCount: usagePeriod.freshFetchCount,
    cacheHitCount: usagePeriod.cacheHitCount,
    quota: subStatus.quota ?? 0,
    plan: subStatus.planKey ?? 'starter',
    billingPeriod: subStatus.billingPeriod,
    // Free tier info
    freeRemaining: freeTier.remaining,
    freeUsed: freeTier.used,
    freeTotal: freeTier.total,
    hasSubscription: subStatus.hasSubscription,
  };
}

/**
 * Initialize default plan limits in database
 */
export async function initializePlanLimits(): Promise<void> {
  for (const [planKey, quota] of Object.entries(DEFAULT_QUOTAS)) {
    const existing = await db.query.planLimits.findFirst({
      where: eq(planLimits.planKey, planKey as PlanKey),
    });

    if (!existing) {
      await db.insert(planLimits).values({
        id: crypto.randomUUID(),
        planKey: planKey as PlanKey,
        monthlyFreshFetchQuota: quota,
        createdAt: new Date(),
      });
    }
  }
}

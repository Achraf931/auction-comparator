import type { PlanKey } from '../db/schema';

export type BillingPeriod = 'monthly' | 'yearly';

export interface PlanInfo {
  planKey: PlanKey;
  billingPeriod: BillingPeriod;
}

// Price mapping built from environment variables
let STRIPE_PRICE_MAP: Map<string, PlanInfo> | null = null;

/**
 * Required environment variables for price mapping
 */
const REQUIRED_PRICE_ENV_VARS = [
  'STRIPE_PRICE_STARTER_MONTHLY',
  'STRIPE_PRICE_STARTER_YEARLY',
  'STRIPE_PRICE_PRO_MONTHLY',
  'STRIPE_PRICE_PRO_YEARLY',
  'STRIPE_PRICE_BUSINESS_MONTHLY',
  'STRIPE_PRICE_BUSINESS_YEARLY',
] as const;

/**
 * Initialize and validate the price mapping from environment variables
 * Throws on startup if any required env var is missing
 */
export function initializePriceMapping(): void {
  const map = new Map<string, PlanInfo>();
  const missing: string[] = [];

  // Check each required env var
  for (const envVar of REQUIRED_PRICE_ENV_VARS) {
    const priceId = process.env[envVar];
    if (!priceId) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required Stripe price environment variables: ${missing.join(', ')}. ` +
      `Please configure all 6 price IDs in your .env file.`
    );
  }

  // Build the mapping
  map.set(process.env.STRIPE_PRICE_STARTER_MONTHLY!, { planKey: 'starter', billingPeriod: 'monthly' });
  map.set(process.env.STRIPE_PRICE_STARTER_YEARLY!, { planKey: 'starter', billingPeriod: 'yearly' });
  map.set(process.env.STRIPE_PRICE_PRO_MONTHLY!, { planKey: 'pro', billingPeriod: 'monthly' });
  map.set(process.env.STRIPE_PRICE_PRO_YEARLY!, { planKey: 'pro', billingPeriod: 'yearly' });
  map.set(process.env.STRIPE_PRICE_BUSINESS_MONTHLY!, { planKey: 'business', billingPeriod: 'monthly' });
  map.set(process.env.STRIPE_PRICE_BUSINESS_YEARLY!, { planKey: 'business', billingPeriod: 'yearly' });

  STRIPE_PRICE_MAP = map;

  console.log('[PriceMapping] Initialized with', map.size, 'price IDs');
}

/**
 * Get the price mapping (initializes if needed)
 */
export function getPriceMapping(): Map<string, PlanInfo> {
  if (!STRIPE_PRICE_MAP) {
    initializePriceMapping();
  }
  return STRIPE_PRICE_MAP!;
}

/**
 * Get plan info from a Stripe price ID
 * Returns null if price ID is not in the mapping
 */
export function getPlanFromPriceId(priceId: string): PlanInfo | null {
  const map = getPriceMapping();
  return map.get(priceId) || null;
}

/**
 * Check if a price ID is valid (exists in our mapping)
 */
export function isValidPriceId(priceId: string): boolean {
  const map = getPriceMapping();
  return map.has(priceId);
}

/**
 * Get all valid price IDs
 */
export function getAllPriceIds(): string[] {
  const map = getPriceMapping();
  return Array.from(map.keys());
}

/**
 * Get price ID for a specific plan and billing period
 */
export function getPriceIdForPlan(planKey: PlanKey, billingPeriod: BillingPeriod): string | null {
  const map = getPriceMapping();
  for (const [priceId, info] of map.entries()) {
    if (info.planKey === planKey && info.billingPeriod === billingPeriod) {
      return priceId;
    }
  }
  return null;
}

/**
 * Get all plans with their price IDs (for pricing page)
 */
export function getAllPlansWithPrices(): Array<{
  planKey: PlanKey;
  monthly: { priceId: string };
  yearly: { priceId: string };
}> {
  const plans: PlanKey[] = ['starter', 'pro', 'business'];
  return plans.map(planKey => ({
    planKey,
    monthly: { priceId: getPriceIdForPlan(planKey, 'monthly')! },
    yearly: { priceId: getPriceIdForPlan(planKey, 'yearly')! },
  }));
}

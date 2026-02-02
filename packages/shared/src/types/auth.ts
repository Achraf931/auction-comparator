/**
 * Subscription status values from Stripe
 */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'
  | 'unknown_plan';

/**
 * Plan keys
 */
export type PlanKey = 'starter' | 'pro' | 'business';

/**
 * Billing period
 */
export type BillingPeriod = 'monthly' | 'yearly';

/**
 * User information returned from API
 */
export interface UserInfo {
  id: string;
  email: string;
  createdAt: string;
}

/**
 * Subscription information returned from API
 */
export interface SubscriptionInfo {
  status: SubscriptionStatus;
  /** Stripe price ID (deprecated, use planKey) */
  plan: string | null;
  /** Plan key (starter, pro, business) */
  planKey: PlanKey | null;
  /** Billing period (monthly, yearly) */
  billingPeriod: BillingPeriod | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/**
 * Feature flags based on subscription
 */
export interface FeatureFlags {
  compare: boolean;
  maxComparisonsPerDay: number;
}

/**
 * Usage info for free tier and subscription
 */
export interface UsageInfo {
  /** Free tier remaining (lifetime) */
  freeRemaining: number;
  /** Free tier used (lifetime) */
  freeUsed: number;
  /** Free tier total allowance */
  freeTotal: number;
  /** Monthly quota (if subscribed) */
  monthlyQuota: number | null;
  /** Monthly used (if subscribed) */
  monthlyUsed: number | null;
}

/**
 * Response from GET /api/me
 */
export interface MeResponse {
  user: UserInfo;
  subscription: SubscriptionInfo | null;
  features: FeatureFlags;
  usage: UsageInfo;
}

/**
 * Login request body
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Register request body
 */
export interface RegisterRequest {
  email: string;
  password: string;
}

/**
 * Auth response with token
 */
export interface AuthResponse {
  success: true;
  user: UserInfo;
  /** API token for extension use (only returned on login/register) */
  apiToken?: string;
}

/**
 * Generic API error response
 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/**
 * Token info response
 */
export interface TokenInfo {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

/**
 * Create token response
 */
export interface CreateTokenResponse {
  success: true;
  token: string; // Raw token (only shown once)
  tokenInfo: TokenInfo;
}

/**
 * Checkout session response
 */
export interface CheckoutSessionResponse {
  success: true;
  checkoutUrl: string;
}

/**
 * Portal session response
 */
export interface PortalSessionResponse {
  success: true;
  portalUrl: string;
}

/**
 * Auth state stored in extension
 */
export interface ExtensionAuthState {
  apiToken: string | null;
  user: UserInfo | null;
  subscription: SubscriptionInfo | null;
  features: FeatureFlags | null;
  lastCheckedAt: number | null;
}

/**
 * Default feature flags for unauthenticated users
 */
export const DEFAULT_FEATURES: FeatureFlags = {
  compare: false,
  maxComparisonsPerDay: 0,
};

/**
 * Feature flags for active subscribers
 */
export const SUBSCRIBER_FEATURES: FeatureFlags = {
  compare: true,
  maxComparisonsPerDay: 100,
};

/**
 * Check if subscription allows feature access
 */
export function hasActiveSubscription(status: SubscriptionStatus | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}

/**
 * Check if subscription has a valid plan (not unknown_plan)
 */
export function hasValidPlan(status: SubscriptionStatus | null | undefined, planKey: PlanKey | null | undefined): boolean {
  if (!hasActiveSubscription(status)) {
    return false;
  }
  if (status === 'unknown_plan') {
    return false;
  }
  return planKey != null;
}

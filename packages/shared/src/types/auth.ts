/**
 * User information returned from API
 */
export interface UserInfo {
  id: string;
  email: string;
  createdAt: string;
  emailVerifiedAt: string | null;
}

/**
 * Credits information returned from API
 */
export interface CreditsInfo {
  /** Current credit balance */
  balance: number;
  /** Whether the free credit is still available */
  freeAvailable: boolean;
  /** Total purchased credits (lifetime) */
  totalPurchased?: number;
  /** Total consumed credits (lifetime) */
  totalConsumed?: number;
}

/**
 * Feature flags for users
 */
export interface FeatureFlags {
  compare: boolean;
  maxComparisonsPerDay: number;
}

/**
 * Response from GET /api/me
 */
export interface MeResponse {
  user: UserInfo;
  credits: CreditsInfo;
  features: FeatureFlags;
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
 * Checkout session response (for credit packs)
 */
export interface CheckoutSessionResponse {
  success: true;
  url: string;
}

/**
 * Auth state stored in extension
 */
export interface ExtensionAuthState {
  apiToken: string | null;
  user: UserInfo | null;
  credits: CreditsInfo | null;
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
 * Feature flags for users with credits
 */
export const CREDITS_FEATURES: FeatureFlags = {
  compare: true,
  maxComparisonsPerDay: 100,
};

/**
 * Check if user has credits available (balance > 0 or free credit available)
 */
export function hasCreditsAvailable(credits: CreditsInfo | null | undefined): boolean {
  if (!credits) return false;
  return credits.balance > 0 || credits.freeAvailable;
}

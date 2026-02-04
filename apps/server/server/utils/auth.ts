import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcrypt';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { db, users, apiTokens, sessions } from '../db';
import type { User } from '../db';
import type { MeResponse, FeatureFlags, UserInfo, CreditsInfo } from '@auction-comparator/shared';
import { DEFAULT_FEATURES, CREDITS_FEATURES, hasCreditsAvailable as checkCredits } from '@auction-comparator/shared';
import type { H3Event } from 'h3';
import { getCookie, setCookie, deleteCookie } from 'h3';
import { getCreditsSummary } from './credits';

const SALT_ROUNDS = 12;
const SESSION_COOKIE_NAME = 'auction_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
const API_TOKEN_LENGTH = 32; // 256 bits

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a random UUID
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate a secure random API token
 */
export function generateApiToken(): string {
  return randomBytes(API_TOKEN_LENGTH).toString('base64url');
}

/**
 * Hash an API token for storage
 */
export function hashApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new user
 */
export async function createUser(email: string, password: string): Promise<User> {
  const id = generateUUID();
  const passwordHash = await hashPassword(password);
  const now = new Date();

  await db.insert(users).values({
    id,
    email: email.toLowerCase().trim(),
    passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) {
    throw new Error('Failed to create user');
  }

  return user;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim()),
  });
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

/**
 * Update user's Stripe customer ID
 */
export async function updateUserStripeCustomerId(userId: string, customerId: string): Promise<void> {
  await db.update(users)
    .set({ stripeCustomerId: customerId, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/**
 * Create a new API token for a user
 */
export async function createApiTokenForUser(
  userId: string,
  name: string = 'Extension Token',
  expiresInDays?: number
): Promise<{ token: string; tokenId: string }> {
  const token = generateApiToken();
  const tokenHash = hashApiToken(token);
  const id = generateUUID();
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  await db.insert(apiTokens).values({
    id,
    userId,
    tokenHash,
    name,
    expiresAt,
    createdAt: new Date(),
  });

  return { token, tokenId: id };
}

/**
 * Validate an API token and return the user
 */
export async function validateApiToken(token: string): Promise<User | null> {
  const tokenHash = hashApiToken(token);
  const now = new Date();

  const tokenRecord = await db.query.apiTokens.findFirst({
    where: and(
      eq(apiTokens.tokenHash, tokenHash),
      isNull(apiTokens.revokedAt)
    ),
    with: {
      user: true,
    },
  });

  if (!tokenRecord) {
    return null;
  }

  // Check expiration
  if (tokenRecord.expiresAt && tokenRecord.expiresAt < now) {
    return null;
  }

  // Update last used timestamp
  await db.update(apiTokens)
    .set({ lastUsedAt: now })
    .where(eq(apiTokens.id, tokenRecord.id));

  return tokenRecord.user;
}

/**
 * Revoke an API token
 */
export async function revokeApiToken(tokenId: string, userId: string): Promise<boolean> {
  const result = await db.update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, userId)));

  return result.changes > 0;
}

/**
 * Revoke all API tokens for a user (used on logout)
 */
export async function revokeAllUserApiTokens(userId: string): Promise<number> {
  const result = await db.update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)));

  return result.changes;
}

/**
 * Get all active API tokens for a user
 */
export async function getUserApiTokens(userId: string) {
  return db.query.apiTokens.findMany({
    where: and(
      eq(apiTokens.userId, userId),
      isNull(apiTokens.revokedAt)
    ),
    columns: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });
}

/**
 * Create a web session for a user
 */
export async function createSession(userId: string): Promise<string> {
  const id = generateUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await db.insert(sessions).values({
    id,
    userId,
    expiresAt,
    createdAt: new Date(),
  });

  return id;
}

/**
 * Validate a session and return the user
 */
export async function validateSession(sessionId: string): Promise<User | null> {
  const now = new Date();

  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.id, sessionId),
      gt(sessions.expiresAt, now)
    ),
    with: {
      user: true,
    },
  });

  return session?.user ?? null;
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/**
 * Set session cookie
 */
export function setSessionCookie(event: H3Event, sessionId: string): void {
  setCookie(event, SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Get session cookie
 */
export function getSessionCookie(event: H3Event): string | undefined {
  return getCookie(event, SESSION_COOKIE_NAME);
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE_NAME, {
    path: '/',
  });
}

/**
 * Convert User to UserInfo for API response
 */
export function toUserInfo(user: User): UserInfo {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Get feature flags based on credits availability
 */
export function getFeatureFlags(credits: CreditsInfo): FeatureFlags {
  if (checkCredits(credits)) {
    return CREDITS_FEATURES;
  }
  return DEFAULT_FEATURES;
}

/**
 * Build MeResponse from user
 */
export async function buildMeResponse(user: User): Promise<MeResponse> {
  const creditsSummary = await getCreditsSummary(user.id);

  const credits: CreditsInfo = {
    balance: creditsSummary.balance,
    freeAvailable: creditsSummary.freeAvailable,
    totalPurchased: creditsSummary.totalPurchased,
    totalConsumed: creditsSummary.totalConsumed,
  };

  return {
    user: toUserInfo(user),
    credits,
    features: getFeatureFlags(credits),
  };
}

/**
 * Get authenticated user from request (checks both cookie and Bearer token)
 */
export async function getAuthenticatedUser(event: H3Event): Promise<User | null> {
  // Check Bearer token first (for extension/API calls)
  const authHeader = getHeader(event, 'authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return validateApiToken(token);
  }

  // Fall back to session cookie (for web app)
  const sessionId = getSessionCookie(event);
  if (sessionId) {
    return validateSession(sessionId);
  }

  return null;
}

/**
 * Require authentication - throws 401 if not authenticated
 */
export async function requireAuth(event: H3Event): Promise<User> {
  const user = await getAuthenticatedUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      },
    });
  }
  return user;
}

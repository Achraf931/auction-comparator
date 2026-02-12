import { randomBytes, createHash } from 'crypto';
import { eq, and, gt } from 'drizzle-orm';
import { db, users, emailVerificationTokens } from '../db';
import { generateUUID } from './auth';

const TOKEN_LENGTH = 32; // 256 bits
const TOKEN_EXPIRY_HOURS = 24;

/**
 * Generate a cryptographically secure verification token
 */
export function generateVerificationToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('base64url');
}

/**
 * Hash a verification token for storage (SHA-256)
 */
export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Create a verification token for a user.
 * Invalidates any existing tokens for that user first.
 * Returns the raw token (to be sent in the email link).
 */
export async function createVerificationToken(userId: string): Promise<string> {
  // Invalidate existing tokens for this user
  await db.delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, userId));

  const rawToken = generateVerificationToken();
  const tokenHash = hashVerificationToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await db.insert(emailVerificationTokens).values({
    id: generateUUID(),
    userId,
    tokenHash,
    expiresAt,
    createdAt: now,
  });

  return rawToken;
}

/**
 * Verify a token and mark the user's email as verified.
 * Returns the userId if successful, null if token is invalid/expired.
 */
export async function verifyEmailToken(rawToken: string): Promise<string | null> {
  const tokenHash = hashVerificationToken(rawToken);
  const now = new Date();

  // Find valid token
  const tokenRecord = await db.query.emailVerificationTokens.findFirst({
    where: and(
      eq(emailVerificationTokens.tokenHash, tokenHash),
      gt(emailVerificationTokens.expiresAt, now),
    ),
  });

  if (!tokenRecord) {
    return null;
  }

  // Mark user as verified
  await db.update(users)
    .set({ emailVerifiedAt: now, updatedAt: now })
    .where(eq(users.id, tokenRecord.userId));

  // Delete all tokens for this user
  await db.delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, tokenRecord.userId));

  return tokenRecord.userId;
}

/**
 * Check if a user's email is verified
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { emailVerifiedAt: true },
  });
  return !!user?.emailVerifiedAt;
}

/**
 * Build the verification URL to embed in the email
 */
export function buildVerifyUrl(rawToken: string): string {
  const config = useRuntimeConfig();
  return `${config.appBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
}

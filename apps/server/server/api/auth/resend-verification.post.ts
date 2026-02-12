import { requireAuth } from '../../utils/auth';
import { createVerificationToken, buildVerifyUrl } from '../../utils/email-verification';
import { sendVerificationEmail } from '../../services/mailer/resend';
import { checkRateLimit } from '../../utils/rateLimit';

// Stricter rate limit: max 3 per hour per user
const resendLimits = new Map<string, { count: number; resetAt: number }>();

function checkResendRateLimit(userId: string): number {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 3;
  const key = `resend-verify:${userId}`;
  const entry = resendLimits.get(key);

  if (!entry || entry.resetAt <= now) {
    resendLimits.set(key, { count: 1, resetAt: now + windowMs });
    return 0;
  }

  if (entry.count >= maxRequests) {
    return Math.ceil((entry.resetAt - now) / 1000);
  }

  entry.count++;
  return 0;
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const config = useRuntimeConfig();

  // Already verified
  if (user.emailVerifiedAt) {
    return {
      success: true,
      message: 'Email already verified',
      alreadyVerified: true,
    };
  }

  // Rate limit check
  const waitSeconds = checkResendRateLimit(user.id);
  if (waitSeconds > 0) {
    setResponseStatus(event, 429);
    return {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Trop de demandes. Réessayez dans ${Math.ceil(waitSeconds / 60)} minute(s).`,
      },
    };
  }

  try {
    const rawToken = await createVerificationToken(user.id);
    const verifyUrl = buildVerifyUrl(rawToken);
    await sendVerificationEmail({
      to: user.email,
      verifyUrl,
      contactEmail: config.contactEmail,
    });

    return {
      success: true,
      message: 'Verification email sent',
    };
  } catch (error) {
    console.error('[Auth] Failed to resend verification email:', error);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to send verification email',
      },
    };
  }
});

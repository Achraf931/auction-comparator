import type { RegisterRequest, AuthResponse, ApiError } from '@auction-comparator/shared';
import {
  createUser,
  getUserByEmail,
  createApiTokenForUser,
  createSession,
  setSessionCookie,
  toUserInfo,
} from '../../utils/auth';
import { createVerificationToken, buildVerifyUrl } from '../../utils/email-verification';
import { sendVerificationEmail } from '../../services/mailer/resend';

export default defineEventHandler(async (event): Promise<AuthResponse | ApiError> => {
  const body = await readBody<RegisterRequest>(event);

  // Validate input
  if (!body?.email || !body?.password) {
    setResponseStatus(event, 400);
    return {
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Email and password are required',
      },
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    setResponseStatus(event, 400);
    return {
      success: false,
      error: {
        code: 'INVALID_EMAIL',
        message: 'Invalid email format',
      },
    };
  }

  // Validate password strength
  if (body.password.length < 8) {
    setResponseStatus(event, 400);
    return {
      success: false,
      error: {
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters',
      },
    };
  }

  // Check if user already exists
  const existing = await getUserByEmail(body.email);
  if (existing) {
    setResponseStatus(event, 409);
    return {
      success: false,
      error: {
        code: 'EMAIL_EXISTS',
        message: 'An account with this email already exists',
      },
    };
  }

  try {
    const config = useRuntimeConfig();

    // Create user (email_verified_at is null by default)
    const user = await createUser(body.email, body.password);

    // Create web session
    const sessionId = await createSession(user.id);
    setSessionCookie(event, sessionId);

    // Create API token for extension
    const { token: apiToken } = await createApiTokenForUser(user.id, 'Extension Token');

    // Generate verification token and send email
    try {
      const rawToken = await createVerificationToken(user.id);
      const verifyUrl = buildVerifyUrl(rawToken);
      await sendVerificationEmail({
        to: user.email,
        verifyUrl,
        contactEmail: config.contactEmail,
      });
    } catch (emailError) {
      // Log but don't fail registration if email sending fails
      console.error('[Auth] Failed to send verification email:', emailError);
    }

    return {
      success: true,
      user: toUserInfo(user),
      apiToken,
    };
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create account',
      },
    };
  }
});

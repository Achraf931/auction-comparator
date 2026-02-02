import type { LoginRequest, AuthResponse, ApiError } from '@auction-comparator/shared';
import {
  getUserByEmail,
  verifyPassword,
  createSession,
  setSessionCookie,
  toUserInfo,
  createApiTokenForUser,
} from '../../utils/auth';

export default defineEventHandler(async (event): Promise<AuthResponse | ApiError> => {
  const body = await readBody<LoginRequest>(event);

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

  // Find user
  const user = await getUserByEmail(body.email);
  if (!user) {
    setResponseStatus(event, 401);
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    };
  }

  // Verify password
  const isValid = await verifyPassword(body.password, user.passwordHash);
  if (!isValid) {
    setResponseStatus(event, 401);
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    };
  }

  try {
    // Create web session
    const sessionId = await createSession(user.id);
    setSessionCookie(event, sessionId);

    // Create API token for the extension
    const { token: apiToken } = await createApiTokenForUser(user.id, 'Extension Token (Auto)');

    return {
      success: true,
      user: toUserInfo(user),
      apiToken, // Returned for the extension to auto-connect
    };
  } catch (error) {
    console.error('[Auth] Login error:', error);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Login failed',
      },
    };
  }
});

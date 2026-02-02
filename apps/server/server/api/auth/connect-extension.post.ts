import { requireAuth, createApiTokenForUser } from '../../utils/auth';

/**
 * Create a token specifically for extension connection
 * This bypasses the token limit since it's for auto-connection
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);

    // Create a token for the extension (no limit check)
    const { token } = await createApiTokenForUser(user.id, 'Extension Auto-Connect');

    return {
      success: true,
      token,
    };
  } catch (error: any) {
    if (error.statusCode === 401) {
      setResponseStatus(event, 401);
      return error.data;
    }
    console.error('[Auth] Error creating extension token:', error);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create token',
      },
    };
  }
});

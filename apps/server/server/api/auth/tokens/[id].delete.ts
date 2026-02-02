import type { ApiError } from '@auction-comparator/shared';
import { requireAuth, revokeApiToken } from '../../../utils/auth';

export default defineEventHandler(async (event): Promise<{ success: true } | ApiError> => {
  try {
    const user = await requireAuth(event);
    const tokenId = getRouterParam(event, 'id');

    if (!tokenId) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Token ID is required',
        },
      };
    }

    const revoked = await revokeApiToken(tokenId, user.id);

    if (!revoked) {
      setResponseStatus(event, 404);
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Token not found',
        },
      };
    }

    return { success: true };
  } catch (error: any) {
    if (error.statusCode === 401) {
      setResponseStatus(event, 401);
      return error.data;
    }
    console.error('[Tokens] Error revoking token:', error);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to revoke token',
      },
    };
  }
});

import type { TokenInfo, ApiError } from '@auction-comparator/shared';
import { requireAuth, getUserApiTokens } from '../../../utils/auth';

export default defineEventHandler(async (event): Promise<{ success: true; tokens: TokenInfo[] } | ApiError> => {
  try {
    const user = await requireAuth(event);
    const tokens = await getUserApiTokens(user.id);

    return {
      success: true,
      tokens: tokens.map((t) => ({
        id: t.id,
        name: t.name,
        createdAt: t.createdAt.toISOString(),
        lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
        expiresAt: t.expiresAt?.toISOString() ?? null,
      })),
    };
  } catch (error: any) {
    if (error.statusCode === 401) {
      setResponseStatus(event, 401);
      return error.data;
    }
    console.error('[Tokens] Error:', error);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get tokens',
      },
    };
  }
});

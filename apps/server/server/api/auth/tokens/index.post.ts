import type { CreateTokenResponse, ApiError } from '@auction-comparator/shared';
import { requireAuth, createApiTokenForUser, getUserApiTokens } from '../../../utils/auth';

interface CreateTokenRequest {
  name?: string;
}

const MAX_TOKENS_PER_USER = 5;

export default defineEventHandler(async (event): Promise<CreateTokenResponse | ApiError> => {
  try {
    const user = await requireAuth(event);
    const body = await readBody<CreateTokenRequest>(event);

    // Check token limit
    const existingTokens = await getUserApiTokens(user.id);
    if (existingTokens.length >= MAX_TOKENS_PER_USER) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: {
          code: 'TOKEN_LIMIT_REACHED',
          message: `Maximum of ${MAX_TOKENS_PER_USER} tokens allowed`,
        },
      };
    }

    const name = body?.name || 'Extension Token';
    const { token, tokenId } = await createApiTokenForUser(user.id, name);

    return {
      success: true,
      token,
      tokenInfo: {
        id: tokenId,
        name,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        expiresAt: null,
      },
    };
  } catch (error: any) {
    if (error.statusCode === 401) {
      setResponseStatus(event, 401);
      return error.data;
    }
    console.error('[Tokens] Error creating token:', error);
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

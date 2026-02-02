import type { MeResponse, ApiError } from '@auction-comparator/shared';
import { requireAuth, buildMeResponse } from '../utils/auth';

export default defineEventHandler(async (event): Promise<MeResponse | ApiError> => {
  try {
    const user = await requireAuth(event);
    return await buildMeResponse(user);
  } catch (error: any) {
    if (error.statusCode === 401) {
      setResponseStatus(event, 401);
      return error.data;
    }
    console.error('[Me] Error:', error);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user info',
      },
    };
  }
});

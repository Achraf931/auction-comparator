import type { CompareError } from '@auction-comparator/shared';
import { requireAuth } from '../utils/auth';
import { getCreditsSummary } from '../utils/credits';

/**
 * GET /api/usage - Returns credit usage summary
 * Kept for backward compatibility, forwards to credits system
 */
export default defineEventHandler(async (event): Promise<any | CompareError> => {
  // Require authentication
  let user;
  try {
    user = await requireAuth(event);
  } catch (error: any) {
    setResponseStatus(event, 401);
    return {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    };
  }

  try {
    const credits = await getCreditsSummary(user.id);

    // Return credit info in a format compatible with the old usage API
    return {
      credits: {
        balance: credits.balance,
        freeAvailable: credits.freeAvailable,
        totalPurchased: credits.totalPurchased,
        totalConsumed: credits.totalConsumed,
      },
    };
  } catch (error) {
    console.error('[Usage] Error fetching credits:', error);
    setResponseStatus(event, 500);
    return {
      code: 'API_ERROR',
      message: 'Failed to fetch usage',
    };
  }
});

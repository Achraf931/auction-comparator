import type { UsageResponse, CompareError } from '@auction-comparator/shared';
import { requireAuth } from '../utils/auth';
import { getUsageSummary, getDaysRemaining } from '../utils/quota';

export default defineEventHandler(async (event): Promise<UsageResponse | CompareError> => {
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
    const usage = await getUsageSummary(user.id);
    const daysRemaining = getDaysRemaining();

    return {
      period: usage.period,
      freshFetchCount: usage.freshFetchCount,
      cacheHitCount: usage.cacheHitCount,
      quota: usage.quota,
      plan: usage.plan,
      billingPeriod: usage.billingPeriod,
      daysRemaining,
      // Free tier info
      freeRemaining: usage.freeRemaining,
      freeUsed: usage.freeUsed,
      freeTotal: usage.freeTotal,
      hasSubscription: usage.hasSubscription,
    };
  } catch (error) {
    console.error('[Usage] Error fetching usage:', error);
    setResponseStatus(event, 500);
    return {
      code: 'API_ERROR',
      message: 'Failed to fetch usage',
    };
  }
});

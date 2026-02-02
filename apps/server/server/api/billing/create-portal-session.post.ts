import type { PortalSessionResponse, ApiError } from '@auction-comparator/shared';
import { requireAuth } from '../../utils/auth';
import { createPortalSession } from '../../utils/stripe';

export default defineEventHandler(async (event): Promise<PortalSessionResponse | ApiError> => {
  try {
    const user = await requireAuth(event);
    const portalUrl = await createPortalSession(user);

    return {
      success: true,
      portalUrl,
    };
  } catch (error: any) {
    if (error.statusCode === 401) {
      setResponseStatus(event, 401);
      return error.data;
    }
    console.error('[Billing] Portal session error:', error);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: {
        code: 'PORTAL_ERROR',
        message: error.message || 'Failed to create portal session',
      },
    };
  }
});

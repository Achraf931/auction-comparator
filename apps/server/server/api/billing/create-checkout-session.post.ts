import type { CheckoutSessionResponse, ApiError } from '@auction-comparator/shared';
import { requireAuth } from '../../utils/auth';
import { createCheckoutSession, validatePriceId } from '../../utils/stripe';

interface CheckoutRequest {
  priceId: string;
}

export default defineEventHandler(async (event): Promise<CheckoutSessionResponse | ApiError> => {
  try {
    const user = await requireAuth(event);

    // Parse request body
    const body = await readBody<CheckoutRequest>(event);

    if (!body?.priceId) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: priceId',
        },
      };
    }

    // Validate price ID is in our mapping
    if (!validatePriceId(body.priceId)) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: {
          code: 'INVALID_PRICE_ID',
          message: 'Invalid price ID. The selected plan is not available.',
        },
      };
    }

    const checkoutUrl = await createCheckoutSession(user, body.priceId);

    return {
      success: true,
      checkoutUrl,
    };
  } catch (error: any) {
    if (error.statusCode === 401) {
      setResponseStatus(event, 401);
      return error.data;
    }
    console.error('[Billing] Checkout session error:', error);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: {
        code: 'CHECKOUT_ERROR',
        message: error.message || 'Failed to create checkout session',
      },
    };
  }
});

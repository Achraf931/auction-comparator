import { requireAuth } from '../../../utils/auth';
import { getStripe, getOrCreateStripeCustomer, getAppBaseUrl } from '../../../utils/stripe';
import { getPackById, getStripePriceId, isValidPackId, VALID_PACK_IDS } from '../../../utils/credit-packs';
import { db, purchases } from '../../../db';
import type { CreditPackId } from '../../../db/schema';

export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await requireAuth(event);

  // Require email verification before purchasing credits
  if (!user.emailVerifiedAt) {
    throw createError({
      statusCode: 403,
      data: {
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Veuillez confirmer votre adresse e-mail avant d\'acheter des crédits.',
        },
      },
    });
  }

  // Parse request body
  const body = await readBody<{ packId: string }>(event);
  console.log('[Credits Checkout] Request body:', body);

  if (!body?.packId) {
    console.error('[Credits Checkout] Missing packId');
    throw createError({
      statusCode: 400,
      message: 'Missing packId',
    });
  }

  // Validate pack ID format
  if (!isValidPackId(body.packId)) {
    console.error('[Credits Checkout] Invalid pack ID:', body.packId, 'Valid:', VALID_PACK_IDS);
    throw createError({
      statusCode: 400,
      message: `Invalid pack ID. Valid packs: ${VALID_PACK_IDS.join(', ')}`,
    });
  }

  // Get pack from registry (single source of truth)
  const pack = getPackById(body.packId);
  if (!pack) {
    console.error('[Credits Checkout] Pack not found:', body.packId);
    throw createError({
      statusCode: 400,
      message: 'Invalid pack ID',
    });
  }

  // Get Stripe price ID
  const priceId = getStripePriceId(pack.id);
  console.log('[Credits Checkout] Stripe price ID for', pack.id, ':', priceId);
  if (!priceId) {
    console.error('[Credits Checkout] Price not configured for pack:', pack.id);
    throw createError({
      statusCode: 500,
      message: 'Credit pack price not configured',
    });
  }

  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(user);
  const baseUrl = getAppBaseUrl();
  console.log('[Credits Checkout] Customer ID:', customerId, 'Base URL:', baseUrl);

  // Create pending purchase record
  const purchaseId = crypto.randomUUID();
  const now = new Date();

  try {
    await db.insert(purchases).values({
      id: purchaseId,
      userId: user.id,
      provider: 'stripe',
      packId: pack.id as CreditPackId,
      creditsAmount: pack.credits,
      amountCents: pack.priceCents,
      currency: 'EUR',
      status: 'pending',
      createdAt: now,
    });
    console.log('[Credits Checkout] Purchase record created:', purchaseId);
  } catch (dbError) {
    console.error('[Credits Checkout] Database error:', dbError);
    throw createError({
      statusCode: 500,
      message: 'Failed to create purchase record',
    });
  }

  // Create Stripe checkout session (one-time payment mode)
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment', // ONE-TIME payment, not subscription
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/account?credits=success`,
    cancel_url: `${baseUrl}/account?credits=cancel`,
    metadata: {
      userId: user.id,
      packId: pack.id,
      credits: String(pack.credits),
      purchaseId,
    },
  });

  if (!session.url) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create checkout session',
    });
  }

  console.log(`[Credits] Created checkout session for user ${user.id}, pack ${pack.id}`);

  return { url: session.url };
});

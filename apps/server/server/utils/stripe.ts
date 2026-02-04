import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db, webhookEvents, users, purchases } from '../db';
import type { User } from '../db';
import { addPurchasedCredits, refundCredits } from './credits';
import { getPackById } from './credit-packs';

let stripeInstance: Stripe | null = null;

/**
 * Get Stripe client instance
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover',
    });
  }
  return stripeInstance;
}

/**
 * Get app base URL
 */
export function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL || 'http://localhost:3001';
}

/**
 * Create or get Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(user: User): Promise<string> {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: {
      userId: user.id,
    },
  });

  // Update user with Stripe customer ID
  await db.update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return customer.id;
}

/**
 * Check if webhook event was already processed (idempotency)
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  const existing = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.id, eventId),
  });
  return Boolean(existing);
}

/**
 * Mark webhook event as processed
 */
export async function markEventProcessed(eventId: string, type: string): Promise<void> {
  await db.insert(webhookEvents).values({
    id: eventId,
    type,
    processedAt: new Date(),
  }).onConflictDoNothing();
}

/**
 * Get user ID from Stripe customer ID
 */
export async function getUserIdFromCustomerId(customerId: string): Promise<string | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  });
  return user?.id ?? null;
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Handle checkout.session.completed for credit pack purchases (one-time payments)
 * IMPORTANT: Never trust metadata for creditsAmount - always use the registry
 */
export async function handleCreditPackCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const { userId, packId, purchaseId } = session.metadata || {};
  const paymentIntentId = session.payment_intent as string;

  if (!userId || !packId || !purchaseId) {
    console.error('[Stripe] Missing metadata in credit pack checkout session');
    return;
  }

  // Validate packId and get credits from registry (NEVER trust client/metadata for credits)
  const pack = getPackById(packId);
  if (!pack) {
    console.error(`[Stripe] Invalid packId in checkout session metadata: ${packId}`);
    return;
  }

  // Use credits from registry, not metadata
  const creditsAmount = pack.credits;

  // Idempotency check: see if already processed
  const existing = await db.query.purchases.findFirst({
    where: eq(purchases.stripePaymentIntentId, paymentIntentId),
  });

  if (existing?.status === 'paid') {
    console.log(`[Stripe] Credit pack purchase ${purchaseId} already processed`);
    return;
  }

  // Update purchase record with registry values
  await db.update(purchases)
    .set({
      status: 'paid',
      stripePaymentIntentId: paymentIntentId,
      stripeCheckoutSessionId: session.id,
      paidAt: new Date(),
      // Ensure creditsAmount matches registry (in case of tampering)
      creditsAmount: creditsAmount,
      amountCents: pack.priceCents,
    })
    .where(eq(purchases.id, purchaseId));

  // Add credits to user account using REGISTRY value
  await addPurchasedCredits(userId, creditsAmount, purchaseId, paymentIntentId);

  console.log(`[Stripe] Credit pack purchase completed: ${creditsAmount} credits (${pack.id}) for user ${userId}`);
}

/**
 * Handle charge.refunded for credit pack refunds
 */
export async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const paymentIntentId = charge.payment_intent as string;

  if (!paymentIntentId) {
    console.log('[Stripe] Refund without payment intent, skipping');
    return;
  }

  // Find the purchase by payment intent
  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.stripePaymentIntentId, paymentIntentId),
  });

  if (!purchase) {
    console.log(`[Stripe] No purchase found for payment intent ${paymentIntentId}`);
    return;
  }

  if (purchase.status === 'refunded') {
    console.log(`[Stripe] Purchase ${purchase.id} already refunded`);
    return;
  }

  // Update purchase status
  await db.update(purchases)
    .set({ status: 'refunded' })
    .where(eq(purchases.id, purchase.id));

  // Deduct credits from user
  await refundCredits(
    purchase.userId,
    purchase.creditsAmount,
    purchase.id,
    `Refund for purchase ${purchase.id}`
  );

  console.log(`[Stripe] Refunded ${purchase.creditsAmount} credits for purchase ${purchase.id}`);
}

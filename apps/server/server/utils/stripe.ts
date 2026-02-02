import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db, subscriptions, webhookEvents, users } from '../db';
import type { Subscription, User, PlanKey, BillingPeriod } from '../db';
import type { SubscriptionStatus } from '@auction-comparator/shared';
import { getPlanFromPriceId, isValidPriceId, initializePriceMapping } from './price-mapping';

let stripeInstance: Stripe | null = null;
let priceMappingInitialized = false;

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
 * Initialize price mapping (call once at startup)
 */
export function initializeStripe(): void {
  if (!priceMappingInitialized) {
    initializePriceMapping();
    priceMappingInitialized = true;
  }
}

/**
 * Validate a price ID is in our mapping
 */
export function validatePriceId(priceId: string): boolean {
  initializeStripe();
  return isValidPriceId(priceId);
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
 * Create a Stripe Checkout session for subscription
 * @param user The user to create the session for
 * @param priceId The Stripe price ID (must be in our price mapping)
 */
export async function createCheckoutSession(user: User, priceId: string): Promise<string> {
  // Validate price ID is in our mapping
  if (!validatePriceId(priceId)) {
    throw new Error(`Invalid price ID: ${priceId}. Price ID must be configured in environment variables.`);
  }

  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(user);
  const baseUrl = getAppBaseUrl();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/account?checkout=success`,
    cancel_url: `${baseUrl}/account?checkout=cancel`,
    metadata: {
      userId: user.id,
    },
  });

  if (!session.url) {
    throw new Error('Failed to create checkout session');
  }

  return session.url;
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession(user: User): Promise<string> {
  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(user);
  const baseUrl = getAppBaseUrl();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/account`,
  });

  return session.url;
}

/**
 * Map Stripe subscription status to our status type
 */
function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
    paused: 'paused',
  };
  return statusMap[status] || 'incomplete';
}

/**
 * Resolve plan info from a Stripe subscription
 * Returns the plan key, billing period, and status
 */
function resolvePlanFromSubscription(stripeSubscription: Stripe.Subscription): {
  planKey: PlanKey | null;
  billingPeriod: BillingPeriod | null;
  status: SubscriptionStatus;
  priceId: string | null;
} {
  const priceId = stripeSubscription.items.data[0]?.price.id ?? null;

  if (!priceId) {
    return {
      planKey: null,
      billingPeriod: null,
      status: 'unknown_plan' as SubscriptionStatus,
      priceId: null,
    };
  }

  const planInfo = getPlanFromPriceId(priceId);

  if (!planInfo) {
    console.warn(`[Stripe] Unknown price ID: ${priceId}. Marking subscription as unknown_plan.`);
    return {
      planKey: null,
      billingPeriod: null,
      status: 'unknown_plan' as SubscriptionStatus,
      priceId,
    };
  }

  return {
    planKey: planInfo.planKey,
    billingPeriod: planInfo.billingPeriod,
    status: mapStripeStatus(stripeSubscription.status),
    priceId,
  };
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
 * Upsert subscription from Stripe data
 */
export async function upsertSubscription(
  userId: string,
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  // Initialize price mapping if not done
  initializeStripe();

  const now = new Date();
  const customerId = stripeSubscription.customer as string;

  // Resolve plan info from price ID
  const { planKey, billingPeriod, status, priceId } = resolvePlanFromSubscription(stripeSubscription);

  // In Stripe API v2025-12-15.clover, period dates are on subscription items, not subscription
  const firstItem = stripeSubscription.items.data[0];
  const currentPeriodStart = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000)
    : null;
  const currentPeriodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000)
    : null;

  const data = {
    stripeSubscriptionId: stripeSubscription.id,
    stripeCustomerId: customerId,
    stripePriceId: priceId,
    planKey,
    billingPeriod,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    updatedAt: now,
  };

  // Check if subscription exists
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (existing) {
    await db.update(subscriptions)
      .set(data)
      .where(eq(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({
      id: crypto.randomUUID(),
      userId,
      ...data,
      createdAt: now,
    });
  }

  console.log(`[Stripe] Subscription upserted: plan=${planKey}, period=${billingPeriod}, status=${status}`);
}

/**
 * Handle checkout.session.completed webhook
 */
export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId || !subscriptionId) {
    console.error('[Stripe] Missing userId or subscriptionId in checkout session');
    return;
  }

  // Update user's Stripe customer ID if not set
  await db.update(users)
    .set({ stripeCustomerId: customerId, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Fetch full subscription details
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await upsertSubscription(userId, subscription);
  console.log(`[Stripe] Subscription activated for user ${userId}`);
}

/**
 * Handle customer.subscription.updated webhook
 */
export async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  const userId = await getUserIdFromCustomerId(customerId);

  if (!userId) {
    console.error(`[Stripe] No user found for customer ${customerId}`);
    return;
  }

  await upsertSubscription(userId, subscription);
  console.log(`[Stripe] Subscription updated for user ${userId}: ${subscription.status}`);
}

/**
 * Handle customer.subscription.deleted webhook
 */
export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  const userId = await getUserIdFromCustomerId(customerId);

  if (!userId) {
    console.error(`[Stripe] No user found for customer ${customerId}`);
    return;
  }

  // Update to canceled status
  await db.update(subscriptions)
    .set({
      status: 'canceled',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  console.log(`[Stripe] Subscription canceled for user ${userId}`);
}

/**
 * Handle invoice.payment_failed webhook
 */
export async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;
  const userId = await getUserIdFromCustomerId(customerId);

  if (!userId) {
    console.error(`[Stripe] No user found for customer ${customerId}`);
    return;
  }

  // Mark subscription as past_due
  await db.update(subscriptions)
    .set({
      status: 'past_due',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  console.log(`[Stripe] Payment failed for user ${userId}`);
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

import type Stripe from 'stripe';
import {
  verifyWebhookSignature,
  isEventProcessed,
  markEventProcessed,
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handlePaymentFailed,
} from '../../utils/stripe';

export default defineEventHandler(async (event) => {
  // Get raw body for signature verification
  const rawBody = await readRawBody(event);
  if (!rawBody) {
    setResponseStatus(event, 400);
    return { error: 'No body' };
  }

  // Get Stripe signature header
  const signature = getHeader(event, 'stripe-signature');
  if (!signature) {
    setResponseStatus(event, 400);
    return { error: 'No signature' };
  }

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = verifyWebhookSignature(rawBody, signature);
  } catch (error: any) {
    console.error('[Stripe Webhook] Signature verification failed:', error.message);
    setResponseStatus(event, 400);
    return { error: 'Invalid signature' };
  }

  // Check idempotency
  if (await isEventProcessed(stripeEvent.id)) {
    console.log(`[Stripe Webhook] Event ${stripeEvent.id} already processed`);
    return { received: true };
  }

  console.log(`[Stripe Webhook] Processing ${stripeEvent.type} (${stripeEvent.id})`);

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${stripeEvent.type}`);
    }

    // Mark event as processed
    await markEventProcessed(stripeEvent.id, stripeEvent.type);
  } catch (error) {
    console.error(`[Stripe Webhook] Error processing ${stripeEvent.type}:`, error);
    // Still return 200 to prevent Stripe from retrying
    // Errors are logged for manual investigation
  }

  return { received: true };
});

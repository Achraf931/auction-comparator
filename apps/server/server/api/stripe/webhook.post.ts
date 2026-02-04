import type Stripe from 'stripe';
import {
  verifyWebhookSignature,
  isEventProcessed,
  markEventProcessed,
  handleCreditPackCheckoutCompleted,
  handleChargeRefunded,
} from '../../utils/stripe';

export default defineEventHandler(async (event) => {
  console.log('[Stripe Webhook] Received request');

  // Get raw body for signature verification
  const rawBody = await readRawBody(event);
  if (!rawBody) {
    console.error('[Stripe Webhook] No body received');
    setResponseStatus(event, 400);
    return { error: 'No body' };
  }

  // Get Stripe signature header
  const signature = getHeader(event, 'stripe-signature');
  if (!signature) {
    console.error('[Stripe Webhook] No stripe-signature header');
    setResponseStatus(event, 400);
    return { error: 'No signature' };
  }

  console.log('[Stripe Webhook] Verifying signature...');
  console.log('[Stripe Webhook] STRIPE_WEBHOOK_SECRET configured:', !!process.env.STRIPE_WEBHOOK_SECRET);

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = verifyWebhookSignature(rawBody, signature);
    console.log('[Stripe Webhook] Signature verified successfully');
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

        // Only handle one-time payments (credit packs)
        if (session.mode === 'payment') {
          await handleCreditPackCheckoutCompleted(session);
        } else {
          // Subscription mode is deprecated - log and ignore
          console.log(`[Stripe Webhook] Ignoring checkout.session.completed with mode=${session.mode} (subscriptions deprecated)`);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = stripeEvent.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
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

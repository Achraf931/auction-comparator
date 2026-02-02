import { initializeStripe } from '../utils/stripe';

export default defineNitroPlugin(() => {
  // Initialize Stripe price mapping on server start
  // This will throw if any required price env vars are missing
  initializeStripe();
});

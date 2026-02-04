import { CREDIT_PACKS, FREE_CREDITS, getStripePriceId } from '../../utils/credit-packs';

export default defineEventHandler(async (event) => {
  // Get locale from query or default to 'fr'
  const query = getQuery(event);
  const locale = (query.locale as 'en' | 'fr') || 'fr';

  const packs = CREDIT_PACKS
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(pack => ({
      id: pack.id,
      credits: pack.credits,
      displayName: pack.displayName[locale],
      shortDescription: pack.shortDescription[locale],
      priceCents: pack.priceCents,
      priceEur: pack.priceEur,
      currency: pack.currency,
      badge: pack.badge,
      pricePerCredit: Math.round((pack.priceEur / pack.credits) * 100) / 100,
      stripePriceId: getStripePriceId(pack.id),
    }));

  return {
    packs,
    freeCredits: FREE_CREDITS,
    cacheHitsFree: true, // Cache hits don't consume credits
  };
});

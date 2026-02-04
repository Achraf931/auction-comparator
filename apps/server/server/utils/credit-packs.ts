import type { CreditPackId } from '../db/schema';

/**
 * Credit Pack definition - single source of truth for all pack information
 */
export interface CreditPack {
  id: CreditPackId;
  credits: number;
  priceCents: number; // Price in cents (EUR)
  priceEur: number; // Price in euros (derived from priceCents)
  currency: 'EUR';
  displayName: {
    en: string;
    fr: string;
  };
  shortDescription: {
    en: string;
    fr: string;
  };
  badge: 'none' | 'most_popular' | 'best_value';
  sortOrder: number;
}

/**
 * Premium pricing - all credit packs (single source of truth)
 * Server trusts this registry for creditsAmount and priceCents
 */
export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack_1',
    credits: 1,
    priceCents: 149,
    priceEur: 1.49,
    currency: 'EUR',
    displayName: {
      en: '1 Comparison',
      fr: '1 Comparaison',
    },
    shortDescription: {
      en: 'Quick top-up',
      fr: 'Recharge rapide',
    },
    badge: 'none',
    sortOrder: 1,
  },
  {
    id: 'pack_5',
    credits: 5,
    priceCents: 499,
    priceEur: 4.99,
    currency: 'EUR',
    displayName: {
      en: '5 Comparisons',
      fr: '5 Comparaisons',
    },
    shortDescription: {
      en: 'Starter pack',
      fr: 'Pack découverte',
    },
    badge: 'none',
    sortOrder: 5,
  },
  {
    id: 'pack_10',
    credits: 10,
    priceCents: 899,
    priceEur: 8.99,
    currency: 'EUR',
    displayName: {
      en: '10 Comparisons',
      fr: '10 Comparaisons',
    },
    shortDescription: {
      en: 'Regular use',
      fr: 'Usage régulier',
    },
    badge: 'none',
    sortOrder: 10,
  },
  {
    id: 'pack_30',
    credits: 30,
    priceCents: 1999,
    priceEur: 19.99,
    currency: 'EUR',
    displayName: {
      en: '30 Comparisons',
      fr: '30 Comparaisons',
    },
    shortDescription: {
      en: 'Most popular',
      fr: 'Le plus populaire',
    },
    badge: 'most_popular',
    sortOrder: 30,
  },
  {
    id: 'pack_100',
    credits: 100,
    priceCents: 4999,
    priceEur: 49.99,
    currency: 'EUR',
    displayName: {
      en: '100 Comparisons',
      fr: '100 Comparaisons',
    },
    shortDescription: {
      en: 'Best value',
      fr: 'Meilleure offre',
    },
    badge: 'best_value',
    sortOrder: 100,
  },
];

// 1 free comparison for new users
export const FREE_CREDITS = 1;

// Valid pack IDs for validation
export const VALID_PACK_IDS: CreditPackId[] = ['pack_1', 'pack_5', 'pack_10', 'pack_30', 'pack_100'];

/**
 * Get Stripe price ID from environment for a pack
 */
export function getStripePriceId(packId: CreditPackId): string | null {
  const map: Record<CreditPackId, string | undefined> = {
    pack_1: process.env.STRIPE_PRICE_PACK_1,
    pack_5: process.env.STRIPE_PRICE_PACK_5,
    pack_10: process.env.STRIPE_PRICE_PACK_10,
    pack_30: process.env.STRIPE_PRICE_PACK_30,
    pack_100: process.env.STRIPE_PRICE_PACK_100,
  };
  return map[packId] || null;
}

/**
 * Get pack by Stripe price ID (for webhook handling)
 */
export function getPackByPriceId(priceId: string): CreditPack | null {
  const priceToPackMap: Record<string, CreditPackId> = {};

  // Build reverse mapping from env vars
  if (process.env.STRIPE_PRICE_PACK_1) {
    priceToPackMap[process.env.STRIPE_PRICE_PACK_1] = 'pack_1';
  }
  if (process.env.STRIPE_PRICE_PACK_5) {
    priceToPackMap[process.env.STRIPE_PRICE_PACK_5] = 'pack_5';
  }
  if (process.env.STRIPE_PRICE_PACK_10) {
    priceToPackMap[process.env.STRIPE_PRICE_PACK_10] = 'pack_10';
  }
  if (process.env.STRIPE_PRICE_PACK_30) {
    priceToPackMap[process.env.STRIPE_PRICE_PACK_30] = 'pack_30';
  }
  if (process.env.STRIPE_PRICE_PACK_100) {
    priceToPackMap[process.env.STRIPE_PRICE_PACK_100] = 'pack_100';
  }

  const packId = priceToPackMap[priceId];
  if (!packId) return null;

  return CREDIT_PACKS.find(p => p.id === packId) || null;
}

/**
 * Get pack by ID (validates against registry)
 */
export function getPackById(packId: string): CreditPack | null {
  if (!isValidPackId(packId)) return null;
  return CREDIT_PACKS.find(p => p.id === packId) || null;
}

/**
 * Validate pack ID
 */
export function isValidPackId(packId: string): packId is CreditPackId {
  return VALID_PACK_IDS.includes(packId as CreditPackId);
}

/**
 * Check if all credit pack price IDs are configured
 */
export function areCreditPackPricesConfigured(): boolean {
  return !!(
    process.env.STRIPE_PRICE_PACK_1 &&
    process.env.STRIPE_PRICE_PACK_5 &&
    process.env.STRIPE_PRICE_PACK_10 &&
    process.env.STRIPE_PRICE_PACK_30 &&
    process.env.STRIPE_PRICE_PACK_100
  );
}

/**
 * Get all packs with their Stripe price IDs (for API response)
 * Sorted by sortOrder
 */
export function getAllPacksWithPrices(locale: 'en' | 'fr' = 'fr'): Array<{
  id: CreditPackId;
  credits: number;
  priceCents: number;
  priceEur: number;
  currency: string;
  displayName: string;
  shortDescription: string;
  badge: string;
  pricePerCredit: number;
  stripePriceId: string | null;
}> {
  return CREDIT_PACKS
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(pack => ({
      id: pack.id,
      credits: pack.credits,
      priceCents: pack.priceCents,
      priceEur: pack.priceEur,
      currency: pack.currency,
      displayName: pack.displayName[locale],
      shortDescription: pack.shortDescription[locale],
      badge: pack.badge,
      pricePerCredit: Math.round((pack.priceEur / pack.credits) * 100) / 100,
      stripePriceId: getStripePriceId(pack.id),
    }));
}

/**
 * Get pack for quick top-up (single credit)
 */
export function getQuickTopUpPack(): CreditPack {
  return CREDIT_PACKS.find(p => p.id === 'pack_1')!;
}

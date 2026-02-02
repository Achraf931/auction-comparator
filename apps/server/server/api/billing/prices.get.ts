import { getAllPlansWithPrices } from '../../utils/price-mapping';

interface PlanPricing {
  planKey: 'starter' | 'pro' | 'business';
  name: string;
  description: string;
  monthlyQuota: number;
  features: string[];
  monthly: {
    priceId: string;
    price: number;
    currency: string;
  };
  yearly: {
    priceId: string;
    price: number;
    currency: string;
    monthlyEquivalent: number;
    savings: number;
  };
}

interface PricesResponse {
  plans: PlanPricing[];
}

// Plan details (quotas, features, prices)
const PLAN_DETAILS: Record<string, Omit<PlanPricing, 'monthly' | 'yearly'>> = {
  starter: {
    planKey: 'starter',
    name: 'Starter',
    description: 'For casual auction buyers',
    monthlyQuota: 50,
    features: [
      '50 fresh price checks/month',
      'Unlimited cache hits',
      'All auction sites',
      'Basic support',
    ],
  },
  pro: {
    planKey: 'pro',
    name: 'Pro',
    description: 'For regular auction hunters',
    monthlyQuota: 300,
    features: [
      '300 fresh price checks/month',
      'Unlimited cache hits',
      'All auction sites',
      'Priority support',
      'Search history',
    ],
  },
  business: {
    planKey: 'business',
    name: 'Business',
    description: 'For power users & resellers',
    monthlyQuota: 2000,
    features: [
      '2000 fresh price checks/month',
      'Unlimited cache hits',
      'All auction sites',
      'Premium support',
      'Search history',
      'API access (coming soon)',
    ],
  },
};

// Prices in EUR (these should match your Stripe prices)
const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 9.99, yearly: 95.90 },
  pro: { monthly: 19.99, yearly: 191.90 },
  business: { monthly: 49.99, yearly: 479.90 },
};

export default defineEventHandler(async (): Promise<PricesResponse> => {
  const plansWithPrices = getAllPlansWithPrices();

  const plans: PlanPricing[] = plansWithPrices.map(({ planKey, monthly, yearly }) => {
    const details = PLAN_DETAILS[planKey]!;
    const prices = PLAN_PRICES[planKey]!;
    const yearlyMonthlyEquivalent = Math.round((prices.yearly / 12) * 100) / 100;
    const savings = Math.round((1 - prices.yearly / (prices.monthly * 12)) * 100);

    return {
      planKey: details.planKey,
      name: details.name,
      description: details.description,
      monthlyQuota: details.monthlyQuota,
      features: details.features,
      monthly: {
        priceId: monthly.priceId,
        price: prices.monthly,
        currency: 'EUR',
      },
      yearly: {
        priceId: yearly.priceId,
        price: prices.yearly,
        currency: 'EUR',
        monthlyEquivalent: yearlyMonthlyEquivalent,
        savings,
      },
    };
  });

  return { plans };
});

import { requireAuth } from '../../utils/auth';
import { getOrCreateUserCredits, getCreditsSummary, getPurchaseHistory } from '../../utils/credits';
import { CREDIT_PACKS, FREE_CREDITS } from '../../utils/credit-packs';

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);

  const credits = await getOrCreateUserCredits(user.id);
  const summary = await getCreditsSummary(user.id);

  return {
    balance: credits.balance,
    freeAvailable: credits.freeCreditsGranted === 0,
    freeCreditsAmount: FREE_CREDITS,
    totalPurchased: summary.totalPurchased,
    totalConsumed: summary.totalConsumed,
  };
});

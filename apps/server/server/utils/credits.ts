import { eq, and, gt, sql } from 'drizzle-orm';
import { db, userCredits, creditLedger, purchases } from '../db';
import type { UserCredits, CreditLedgerType, Purchase } from '../db/schema';
import { FREE_CREDITS } from './credit-packs';

/**
 * Get or create user credits record
 * Initializes with 0 balance for new users
 */
export async function getOrCreateUserCredits(userId: string): Promise<UserCredits> {
  let credits = await db.query.userCredits.findFirst({
    where: eq(userCredits.userId, userId),
  });

  if (!credits) {
    const now = new Date();
    await db.insert(userCredits).values({
      userId,
      balance: 0,
      freeCreditsGranted: 0,
      updatedAt: now,
    });

    credits = await db.query.userCredits.findFirst({
      where: eq(userCredits.userId, userId),
    });

    if (!credits) {
      throw new Error('Failed to create user credits record');
    }
  }

  return credits;
}

/**
 * Get current credit balance for a user
 */
export async function getUserBalance(userId: string): Promise<number> {
  const credits = await getOrCreateUserCredits(userId);
  return credits.balance;
}

/**
 * Grant free credit to a new user (only once)
 * Returns true if credit was granted, false if already granted
 */
export async function grantFreeCredit(userId: string): Promise<boolean> {
  const credits = await getOrCreateUserCredits(userId);

  if (credits.freeCreditsGranted === 1) {
    return false; // Already granted
  }

  // Use synchronous transaction for better-sqlite3
  const result = db.transaction((tx) => {
    // Double-check inside transaction
    const currentCredits = tx.select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .get();

    if (!currentCredits || currentCredits.freeCreditsGranted === 1) {
      return false;
    }

    const newBalance = currentCredits.balance + FREE_CREDITS;
    const now = new Date();

    // Update balance and mark free credits as granted
    tx.update(userCredits)
      .set({
        balance: newBalance,
        freeCreditsGranted: 1,
        updatedAt: now,
      })
      .where(eq(userCredits.userId, userId))
      .run();

    // Record in ledger
    tx.insert(creditLedger).values({
      id: crypto.randomUUID(),
      userId,
      type: 'grant_free',
      delta: FREE_CREDITS,
      balanceAfter: newBalance,
      reason: 'Welcome free credit for new user',
      relatedObjectType: null,
      relatedObjectId: null,
      createdAt: now,
    }).run();

    console.log(`[Credits] Granted ${FREE_CREDITS} free credit(s) to user ${userId}`);
    return true;
  });

  return result;
}

/**
 * Result of credits availability check
 */
export interface CreditsCheckResult {
  available: boolean;
  balance: number;
  freeAvailable: boolean;
  source: 'balance' | 'free' | 'none';
}

/**
 * Check if user has credits available for a comparison
 * Returns availability status and source of credits
 */
export async function hasCreditsAvailable(userId: string): Promise<CreditsCheckResult> {
  const credits = await getOrCreateUserCredits(userId);

  // Check if user has balance
  if (credits.balance > 0) {
    return {
      available: true,
      balance: credits.balance,
      freeAvailable: credits.freeCreditsGranted === 0,
      source: 'balance',
    };
  }

  // Check if free credit is available
  if (credits.freeCreditsGranted === 0) {
    return {
      available: true,
      balance: credits.balance,
      freeAvailable: true,
      source: 'free',
    };
  }

  // No credits available
  return {
    available: false,
    balance: 0,
    freeAvailable: false,
    source: 'none',
  };
}

/**
 * Add credits after a successful purchase
 * Called from webhook handler
 */
export async function addPurchasedCredits(
  userId: string,
  amount: number,
  purchaseId: string,
  stripePaymentIntentId: string
): Promise<void> {
  db.transaction((tx) => {
    // Get current balance
    let credits = tx.select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .get();

    const now = new Date();

    if (!credits) {
      // Create record if it doesn't exist
      tx.insert(userCredits).values({
        userId,
        balance: amount,
        freeCreditsGranted: 0,
        updatedAt: now,
      }).run();

      credits = { userId, balance: amount, freeCreditsGranted: 0, updatedAt: now };
    } else {
      // Update balance
      tx.update(userCredits)
        .set({
          balance: credits.balance + amount,
          updatedAt: now,
        })
        .where(eq(userCredits.userId, userId))
        .run();

      credits = { ...credits, balance: credits.balance + amount };
    }

    // Record in ledger
    tx.insert(creditLedger).values({
      id: crypto.randomUUID(),
      userId,
      type: 'purchase',
      delta: amount,
      balanceAfter: credits.balance,
      reason: `Purchased ${amount} credits`,
      relatedObjectType: 'purchase',
      relatedObjectId: purchaseId,
      createdAt: now,
    }).run();

    console.log(`[Credits] Added ${amount} credits to user ${userId}, new balance: ${credits.balance}`);
  });
}

/**
 * Result of credit consumption
 */
export interface ConsumeResult {
  success: boolean;
  newBalance: number;
  source?: 'balance' | 'free';
  error?: 'NO_CREDITS';
}

/**
 * Atomically consume 1 credit for a fresh fetch
 * Returns success status and new balance
 */
export async function consumeCredit(
  userId: string,
  comparisonId: string
): Promise<ConsumeResult> {
  return db.transaction((tx): ConsumeResult => {
    const credits = tx.select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .get();

    const now = new Date();

    // If no credits record, check if we can grant free credit
    if (!credits) {
      // Create record with free credit
      tx.insert(userCredits).values({
        userId,
        balance: 0,
        freeCreditsGranted: 1, // Mark as granted and consumed
        updatedAt: now,
      }).run();

      // Record grant in ledger
      tx.insert(creditLedger).values({
        id: crypto.randomUUID(),
        userId,
        type: 'grant_free',
        delta: FREE_CREDITS,
        balanceAfter: FREE_CREDITS,
        reason: 'Welcome free credit for new user',
        relatedObjectType: null,
        relatedObjectId: null,
        createdAt: now,
      }).run();

      // Record consumption in ledger
      tx.insert(creditLedger).values({
        id: crypto.randomUUID(),
        userId,
        type: 'consume',
        delta: -1,
        balanceAfter: 0,
        reason: 'Fresh price comparison',
        relatedObjectType: 'comparison',
        relatedObjectId: comparisonId,
        createdAt: now,
      }).run();

      console.log(`[Credits] Granted and consumed free credit for user ${userId}`);
      return { success: true, newBalance: 0, source: 'free' as const };
    }

    // If balance is 0 but free credit not yet granted
    if (credits.balance <= 0 && credits.freeCreditsGranted === 0) {
      // Grant and consume free credit
      tx.update(userCredits)
        .set({
          freeCreditsGranted: 1,
          updatedAt: now,
        })
        .where(eq(userCredits.userId, userId))
        .run();

      // Record grant in ledger
      tx.insert(creditLedger).values({
        id: crypto.randomUUID(),
        userId,
        type: 'grant_free',
        delta: FREE_CREDITS,
        balanceAfter: FREE_CREDITS,
        reason: 'Welcome free credit for new user',
        relatedObjectType: null,
        relatedObjectId: null,
        createdAt: now,
      }).run();

      // Record consumption in ledger
      tx.insert(creditLedger).values({
        id: crypto.randomUUID(),
        userId,
        type: 'consume',
        delta: -1,
        balanceAfter: 0,
        reason: 'Fresh price comparison',
        relatedObjectType: 'comparison',
        relatedObjectId: comparisonId,
        createdAt: now,
      }).run();

      console.log(`[Credits] Granted and consumed free credit for user ${userId}`);
      return { success: true, newBalance: 0, source: 'free' as const };
    }

    // No balance and free credit already used
    if (credits.balance <= 0) {
      return { success: false, newBalance: 0, error: 'NO_CREDITS' as const };
    }

    // Atomic decrement with race condition protection
    const result = tx.update(userCredits)
      .set({
        balance: sql`${userCredits.balance} - 1`,
        updatedAt: now,
      })
      .where(and(
        eq(userCredits.userId, userId),
        gt(userCredits.balance, 0)
      ))
      .run();

    if (result.changes === 0) {
      // Race condition - balance became 0
      return { success: false, newBalance: 0, error: 'NO_CREDITS' as const };
    }

    const newBalance = credits.balance - 1;

    // Record in ledger
    tx.insert(creditLedger).values({
      id: crypto.randomUUID(),
      userId,
      type: 'consume',
      delta: -1,
      balanceAfter: newBalance,
      reason: 'Fresh price comparison',
      relatedObjectType: 'comparison',
      relatedObjectId: comparisonId,
      createdAt: now,
    }).run();

    console.log(`[Credits] Consumed 1 credit for user ${userId}, new balance: ${newBalance}`);
    return { success: true, newBalance, source: 'balance' as const };
  });
}

/**
 * Refund credits (e.g., after Stripe refund)
 */
export async function refundCredits(
  userId: string,
  amount: number,
  purchaseId: string,
  reason: string
): Promise<void> {
  db.transaction((tx) => {
    const credits = tx.select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .get();

    if (!credits) {
      console.error(`[Credits] Cannot refund: no credits record for user ${userId}`);
      return;
    }

    const now = new Date();
    const newBalance = Math.max(0, credits.balance - amount);

    tx.update(userCredits)
      .set({
        balance: newBalance,
        updatedAt: now,
      })
      .where(eq(userCredits.userId, userId))
      .run();

    tx.insert(creditLedger).values({
      id: crypto.randomUUID(),
      userId,
      type: 'refund',
      delta: -amount,
      balanceAfter: newBalance,
      reason,
      relatedObjectType: 'purchase',
      relatedObjectId: purchaseId,
      createdAt: now,
    }).run();

    console.log(`[Credits] Refunded ${amount} credits from user ${userId}, new balance: ${newBalance}`);
  });
}

/**
 * Get credit ledger entries for a user (for history/debugging)
 */
export async function getCreditHistory(
  userId: string,
  limit: number = 50
): Promise<Array<typeof creditLedger.$inferSelect>> {
  return await db.query.creditLedger.findMany({
    where: eq(creditLedger.userId, userId),
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    limit,
  });
}

/**
 * Get purchase history for a user
 */
export async function getPurchaseHistory(
  userId: string,
  limit: number = 50
): Promise<Purchase[]> {
  return await db.query.purchases.findMany({
    where: eq(purchases.userId, userId),
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    limit,
  });
}

/**
 * Credits summary for API responses
 */
export interface CreditsSummary {
  balance: number;
  freeAvailable: boolean;
  totalPurchased: number;
  totalConsumed: number;
}

/**
 * Get full credits summary for a user
 */
export async function getCreditsSummary(userId: string): Promise<CreditsSummary> {
  const credits = await getOrCreateUserCredits(userId);

  // Get totals from ledger
  const ledgerEntries = await db.query.creditLedger.findMany({
    where: eq(creditLedger.userId, userId),
  });

  let totalPurchased = 0;
  let totalConsumed = 0;

  for (const entry of ledgerEntries) {
    if (entry.type === 'purchase' || entry.type === 'grant_free') {
      totalPurchased += entry.delta;
    } else if (entry.type === 'consume') {
      totalConsumed += Math.abs(entry.delta);
    }
  }

  return {
    balance: credits.balance,
    freeAvailable: credits.freeCreditsGranted === 0,
    totalPurchased,
    totalConsumed,
  };
}

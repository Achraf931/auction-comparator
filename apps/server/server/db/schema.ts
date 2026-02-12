import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // UUID
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  emailVerifiedAt: integer('email_verified_at', { mode: 'timestamp' }), // null = not verified
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// API Tokens for extension authentication
export const apiTokens = sqliteTable('api_tokens', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(), // SHA-256 hash of the token
  name: text('name').notNull().default('Extension Token'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }), // null = never expires
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }), // null = active
});

// Processed Stripe webhook events for idempotency
export const webhookEvents = sqliteTable('webhook_events', {
  id: text('id').primaryKey(), // Stripe event ID
  type: text('type').notNull(),
  processedAt: integer('processed_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Web sessions for cookie-based auth (web app)
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Email verification tokens
export const emailVerificationTokens = sqliteTable('email_verification_tokens', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(), // SHA-256 hash of the token
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('email_verification_tokens_user_idx').on(table.userId),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  apiTokens: many(apiTokens),
  sessions: many(sessions),
  searchHistory: many(searchHistory),
  emailVerificationTokens: many(emailVerificationTokens),
}));

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(users, {
    fields: [apiTokens.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationTokens.userId],
    references: [users.id],
  }),
}));

// Global compare cache shared across users
export const compareCacheEntries = sqliteTable('compare_cache_entries', {
  id: text('id').primaryKey(), // UUID
  signatureStrict: text('signature_strict').notNull().unique(),
  signatureLoose: text('signature_loose').notNull(),
  provider: text('provider').notNull().default('serpapi'),
  queryUsed: text('query_used').notNull(),
  resultsJson: text('results_json').notNull(), // JSON array of top N results
  statsJson: text('stats_json').notNull(), // JSON object with min/median/max/average/count
  confidence: text('confidence', { enum: ['high', 'medium', 'low'] }).notNull(),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('compare_cache_signature_loose_idx').on(table.signatureLoose),
  index('compare_cache_expires_idx').on(table.expiresAt),
]);

// User search history
export const searchHistory = sqliteTable('search_history', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  domain: text('domain').notNull(),
  lotUrl: text('lot_url').notNull(),
  rawTitle: text('raw_title').notNull(),
  normalizedJson: text('normalized_json').notNull(), // JSON snapshot of NormalizedProduct
  signatureStrict: text('signature_strict').notNull(),
  signatureLoose: text('signature_loose').notNull(),
  compareSource: text('compare_source', { enum: ['cache_strict', 'cache_loose', 'fresh_fetch'] }).notNull(),
  cacheEntryId: text('cache_entry_id').references(() => compareCacheEntries.id, { onDelete: 'set null' }),
  auctionPrice: real('auction_price'),
  currency: text('currency'),
}, (table) => [
  index('search_history_user_created_idx').on(table.userId, table.createdAt),
  index('search_history_domain_idx').on(table.domain),
]);

// Processed webhook events (extending existing for generic use)
export const processedEvents = sqliteTable('processed_events', {
  id: text('id').primaryKey(), // UUID
  provider: text('provider').notNull(), // 'stripe', etc.
  eventId: text('event_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('processed_events_provider_event_idx').on(table.provider, table.eventId),
]);

export const compareCacheEntriesRelations = relations(compareCacheEntries, ({ many }) => ({
  searchHistories: many(searchHistory),
}));

export const searchHistoryRelations = relations(searchHistory, ({ one }) => ({
  user: one(users, {
    fields: [searchHistory.userId],
    references: [users.id],
  }),
  cacheEntry: one(compareCacheEntries, {
    fields: [searchHistory.cacheEntryId],
    references: [compareCacheEntries.id],
  }),
}));

// ============================================================
// Credit Pack System Tables
// ============================================================

// User credits balance
export const userCredits = sqliteTable('user_credits', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  freeCreditsGranted: integer('free_credits_granted').notNull().default(0), // 0 = not granted, 1 = granted
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Credit ledger entry types
export type CreditLedgerType = 'grant_free' | 'purchase' | 'consume' | 'refund' | 'admin_adjust';

// Append-only credit ledger (audit trail)
export const creditLedger = sqliteTable('credit_ledger', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['grant_free', 'purchase', 'consume', 'refund', 'admin_adjust'] }).notNull(),
  delta: integer('delta').notNull(), // +10, -1, etc.
  balanceAfter: integer('balance_after').notNull(),
  reason: text('reason').notNull(),
  relatedObjectType: text('related_object_type'), // 'purchase', 'comparison', 'stripe_session'
  relatedObjectId: text('related_object_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('credit_ledger_user_created_idx').on(table.userId, table.createdAt),
]);

// Credit pack IDs
export type CreditPackId = 'pack_1' | 'pack_5' | 'pack_10' | 'pack_30' | 'pack_100';

// Purchase status
export type PurchaseStatus = 'pending' | 'paid' | 'failed' | 'refunded';

// Purchase records
export const purchases = sqliteTable('purchases', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull().default('stripe'),
  stripeCheckoutSessionId: text('stripe_checkout_session_id'),
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(), // Idempotency key
  packId: text('pack_id', { enum: ['pack_1', 'pack_5', 'pack_10', 'pack_30', 'pack_100'] }).notNull(),
  creditsAmount: integer('credits_amount').notNull(),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('EUR'),
  status: text('status', { enum: ['pending', 'paid', 'failed', 'refunded'] }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  paidAt: integer('paid_at', { mode: 'timestamp' }),
}, (table) => [
  index('purchases_user_idx').on(table.userId),
  index('purchases_stripe_session_idx').on(table.stripeCheckoutSessionId),
]);

// Relations for credit tables
export const userCreditsRelations = relations(userCredits, ({ one }) => ({
  user: one(users, {
    fields: [userCredits.userId],
    references: [users.id],
  }),
}));

export const creditLedgerRelations = relations(creditLedger, ({ one }) => ({
  user: one(users, {
    fields: [creditLedger.userId],
    references: [users.id],
  }),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  user: one(users, {
    fields: [purchases.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ApiToken = typeof apiTokens.$inferSelect;
export type NewApiToken = typeof apiTokens.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;
export type CompareCacheEntry = typeof compareCacheEntries.$inferSelect;
export type NewCompareCacheEntry = typeof compareCacheEntries.$inferInsert;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type NewSearchHistory = typeof searchHistory.$inferInsert;
export type ProcessedEvent = typeof processedEvents.$inferSelect;
export type NewProcessedEvent = typeof processedEvents.$inferInsert;
export type UserCredits = typeof userCredits.$inferSelect;
export type NewUserCredits = typeof userCredits.$inferInsert;
export type CreditLedgerEntry = typeof creditLedger.$inferSelect;
export type NewCreditLedgerEntry = typeof creditLedger.$inferInsert;
export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;

// Compare source type
export type CompareSource = 'cache_strict' | 'cache_loose' | 'fresh_fetch';

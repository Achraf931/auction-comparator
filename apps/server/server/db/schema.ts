import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Free tier default allowance (configurable via env)
export const FREE_FRESH_FETCH_ALLOWANCE = parseInt(process.env.FREE_FRESH_FETCH_ALLOWANCE || '10', 10);

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // UUID
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  // Free tier allowance (lifetime, one-time)
  freeFreshFetchRemaining: integer('free_fresh_fetch_remaining').notNull().default(FREE_FRESH_FETCH_ALLOWANCE),
  freeFreshFetchUsed: integer('free_fresh_fetch_used').notNull().default(0),
  freeFreshFetchGrantedAt: integer('free_fresh_fetch_granted_at', { mode: 'timestamp' }),
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

// Billing period type
export type BillingPeriod = 'monthly' | 'yearly';

// Subscriptions table
export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeCustomerId: text('stripe_customer_id'),
  stripePriceId: text('stripe_price_id'),
  planKey: text('plan_key', { enum: ['starter', 'pro', 'business'] }),
  billingPeriod: text('billing_period', { enum: ['monthly', 'yearly'] }),
  status: text('status', {
    enum: ['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused', 'unknown_plan'],
  }).notNull().default('incomplete'),
  currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }),
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }),
  cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
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

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  apiTokens: many(apiTokens),
  subscription: one(subscriptions),
  sessions: many(sessions),
  usagePeriods: many(usagePeriods),
  searchHistory: many(searchHistory),
}));

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(users, {
    fields: [apiTokens.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Plan limits for subscription tiers
export const planLimits = sqliteTable('plan_limits', {
  id: text('id').primaryKey(), // UUID
  planKey: text('plan_key', { enum: ['starter', 'pro', 'business'] }).notNull().unique(),
  monthlyFreshFetchQuota: integer('monthly_fresh_fetch_quota').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Usage tracking per user per billing period
export const usagePeriods = sqliteTable('usage_periods', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  periodYyyymm: text('period_yyyymm').notNull(), // e.g., "2026-02"
  freshFetchCount: integer('fresh_fetch_count').notNull().default(0),
  cacheHitCount: integer('cache_hit_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('usage_periods_user_period_idx').on(table.userId, table.periodYyyymm),
]);

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

// Relations for new tables
export const planLimitsRelations = relations(planLimits, ({ }) => ({}));

export const usagePeriodsRelations = relations(usagePeriods, ({ one }) => ({
  user: one(users, {
    fields: [usagePeriods.userId],
    references: [users.id],
  }),
}));

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

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ApiToken = typeof apiTokens.$inferSelect;
export type NewApiToken = typeof apiTokens.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type PlanLimit = typeof planLimits.$inferSelect;
export type NewPlanLimit = typeof planLimits.$inferInsert;
export type UsagePeriod = typeof usagePeriods.$inferSelect;
export type NewUsagePeriod = typeof usagePeriods.$inferInsert;
export type CompareCacheEntry = typeof compareCacheEntries.$inferSelect;
export type NewCompareCacheEntry = typeof compareCacheEntries.$inferInsert;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type NewSearchHistory = typeof searchHistory.$inferInsert;
export type ProcessedEvent = typeof processedEvents.$inferSelect;
export type NewProcessedEvent = typeof processedEvents.$inferInsert;

// Plan key type
export type PlanKey = 'starter' | 'pro' | 'business';

// Compare source type
export type CompareSource = 'cache_strict' | 'cache_loose' | 'fresh_fetch';

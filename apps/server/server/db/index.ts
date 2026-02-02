import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { join } from 'path';

// Database file location
const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'auction-comparator.db');

// Ensure data directory exists
import { mkdirSync } from 'fs';
import { dirname } from 'path';
try {
  mkdirSync(dirname(dbPath), { recursive: true });
} catch {
  // Directory may already exist
}

// Create SQLite connection
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent access
sqlite.pragma('journal_mode = WAL');

// Create Drizzle instance with schema
export const db = drizzle(sqlite, { schema });

// Export schema for use elsewhere
export * from './schema';

// Initialize database tables
export function initializeDatabase() {
  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      stripe_customer_id TEXT UNIQUE,
      free_fresh_fetch_remaining INTEGER NOT NULL DEFAULT 10,
      free_fresh_fetch_used INTEGER NOT NULL DEFAULT 0,
      free_fresh_fetch_granted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT 'Extension Token',
      expires_at INTEGER,
      last_used_at INTEGER,
      created_at INTEGER NOT NULL,
      revoked_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      stripe_subscription_id TEXT UNIQUE,
      stripe_customer_id TEXT,
      stripe_price_id TEXT,
      plan_key TEXT,
      billing_period TEXT,
      status TEXT NOT NULL DEFAULT 'incomplete',
      current_period_start INTEGER,
      current_period_end INTEGER,
      cancel_at_period_end INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );


    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      processed_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_api_tokens_token_hash ON api_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

    -- Plan limits for subscription tiers
    CREATE TABLE IF NOT EXISTS plan_limits (
      id TEXT PRIMARY KEY,
      plan_key TEXT NOT NULL UNIQUE,
      monthly_fresh_fetch_quota INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    -- Usage tracking per user per billing period
    CREATE TABLE IF NOT EXISTS usage_periods (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period_yyyymm TEXT NOT NULL,
      fresh_fetch_count INTEGER NOT NULL DEFAULT 0,
      cache_hit_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_periods_user_period ON usage_periods(user_id, period_yyyymm);

    -- Global compare cache shared across users
    CREATE TABLE IF NOT EXISTS compare_cache_entries (
      id TEXT PRIMARY KEY,
      signature_strict TEXT NOT NULL UNIQUE,
      signature_loose TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'serpapi',
      query_used TEXT NOT NULL,
      results_json TEXT NOT NULL,
      stats_json TEXT NOT NULL,
      confidence TEXT NOT NULL,
      fetched_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_compare_cache_signature_loose ON compare_cache_entries(signature_loose);
    CREATE INDEX IF NOT EXISTS idx_compare_cache_expires ON compare_cache_entries(expires_at);

    -- User search history
    CREATE TABLE IF NOT EXISTS search_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      domain TEXT NOT NULL,
      lot_url TEXT NOT NULL,
      raw_title TEXT NOT NULL,
      normalized_json TEXT NOT NULL,
      signature_strict TEXT NOT NULL,
      signature_loose TEXT NOT NULL,
      compare_source TEXT NOT NULL,
      cache_entry_id TEXT REFERENCES compare_cache_entries(id) ON DELETE SET NULL,
      auction_price REAL,
      currency TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_search_history_user_created ON search_history(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_search_history_domain ON search_history(domain);

    -- Processed events (generic for multiple providers)
    CREATE TABLE IF NOT EXISTS processed_events (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_processed_events_provider_event ON processed_events(provider, event_id);
  `);

  // Migrations: Add new columns if they don't exist
  const migrations = [
    { table: 'subscriptions', column: 'stripe_customer_id', type: 'TEXT' },
    { table: 'subscriptions', column: 'plan_key', type: 'TEXT' },
    { table: 'subscriptions', column: 'billing_period', type: 'TEXT' },
    // Free tier columns
    { table: 'users', column: 'free_fresh_fetch_remaining', type: 'INTEGER NOT NULL DEFAULT 10' },
    { table: 'users', column: 'free_fresh_fetch_used', type: 'INTEGER NOT NULL DEFAULT 0' },
    { table: 'users', column: 'free_fresh_fetch_granted_at', type: 'INTEGER' },
  ];

  for (const { table, column, type } of migrations) {
    try {
      sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`[DB] Added column ${column} to ${table}`);
    } catch (e: any) {
      // Column already exists - ignore
      if (!e.message.includes('duplicate column')) {
        console.error(`[DB] Migration error for ${table}.${column}:`, e.message);
      }
    }
  }

  console.log('[DB] Database initialized at:', dbPath);
}

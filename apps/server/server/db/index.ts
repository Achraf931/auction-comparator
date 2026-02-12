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

    -- Note: subscriptions table deprecated (credit pack model now)

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

    -- Note: plan_limits and usage_periods tables deprecated (credit pack model now)

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

    -- User credits balance (credit pack system)
    CREATE TABLE IF NOT EXISTS user_credits (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      balance INTEGER NOT NULL DEFAULT 0,
      free_credits_granted INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    -- Credit ledger (audit trail)
    CREATE TABLE IF NOT EXISTS credit_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      delta INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reason TEXT NOT NULL,
      related_object_type TEXT,
      related_object_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_created ON credit_ledger(user_id, created_at);

    -- Purchases (credit pack purchases)
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL DEFAULT 'stripe',
      stripe_checkout_session_id TEXT,
      stripe_payment_intent_id TEXT UNIQUE,
      pack_id TEXT NOT NULL,
      credits_amount INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      paid_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session ON purchases(stripe_checkout_session_id);

    -- Email verification tokens
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens(user_id);
  `);

  // Migrations: Add new columns if they don't exist
  const migrations: { table: string; column: string; type: string }[] = [
    { table: 'users', column: 'email_verified_at', type: 'INTEGER' },
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

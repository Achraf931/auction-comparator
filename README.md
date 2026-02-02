# Auction Price Comparator

A Chrome Extension (MV3) that compares auction bid prices with web market prices. When browsing supported auction sites, the extension displays an overlay showing how the current bid compares to prices found on shopping sites.

## Features

- **Real-time price comparison**: Automatically extracts auction data and compares with web prices
- **Smart verdict system**: "Worth it", "Borderline", or "Not worth it" recommendations
- **Confidence indicators**: Shows reliability based on result quality
- **Shadow DOM isolation**: Overlay styles don't interfere with auction sites
- **Caching & rate limiting**: Efficient API usage with server-side caching
- **Subscription system**: Premium features via Stripe subscriptions
- **User authentication**: Secure login with API tokens for extension

## Project Structure

```
/auction-comparator/
├── apps/
│   ├── extension/          # WXT Chrome extension
│   │   ├── adapters/       # Site-specific data extractors
│   │   ├── components/     # Vue overlay components
│   │   ├── composables/    # Vue composables
│   │   ├── entrypoints/    # Background, content, popup scripts
│   │   └── utils/          # DOM, storage, messaging helpers
│   └── server/             # Nuxt 3 fullstack app (API + Web UI)
│       ├── server/
│       │   ├── api/        # API endpoints (auth, billing, compare)
│       │   ├── db/         # Database schema and connection
│       │   ├── providers/  # Shopping data providers (SerpApi)
│       │   └── utils/      # Auth, Stripe, cache, rate limiting
│       ├── pages/          # Web UI (login, account, billing)
│       ├── composables/    # Vue composables for web app
│       └── middleware/     # Auth middleware
└── packages/
    └── shared/             # Shared types and utilities
        └── src/
            ├── types/      # TypeScript interfaces
            └── utils/      # Currency, scoring functions
```

## Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [SerpApi](https://serpapi.com/) API key (free tier: 100 searches/month)
- [Stripe](https://stripe.com/) account (for subscriptions)

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp apps/server/.env.example apps/server/.env
```

Edit `apps/server/.env` and configure:

```env
# Required
SERPAPI_KEY=your_serpapi_key

# Stripe (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# URLs
API_BASE=http://localhost:3001
APP_BASE_URL=http://localhost:3001
```

### 3. Set up Stripe

1. Create a product in [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Add a recurring price (e.g., €9.99/month)
3. Copy the Price ID to `STRIPE_PRICE_ID` in `.env`
4. For local development, use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3001/api/stripe/webhook
# Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET
```

### 4. Start development servers

```bash
# Terminal 1: Start the backend + web app
bun run dev:server

# Terminal 2: Start the extension
bun run dev:extension

# Terminal 3: Forward Stripe webhooks
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

### 5. Load the extension in Chrome

- Open `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select `apps/extension/.output/chrome-mv3/` (use production build)

## Usage

### Web App

1. Visit http://localhost:3001
2. Create an account at `/register`
3. Subscribe at `/billing`
4. Copy your API token from `/account`

### Extension

1. Click "Paste Token" in the extension overlay
2. Enter your API token from the web app
3. Navigate to a supported auction site (e.g., interencheres.fr)
4. Open a lot/item detail page
5. The overlay shows price comparison data

## API Endpoints

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/login` | POST | Login (web session) |
| `/api/auth/logout` | POST | Logout |
| `/api/me` | GET | Get current user + subscription |
| `/api/auth/tokens` | GET | List API tokens |
| `/api/auth/tokens` | POST | Create new token |
| `/api/auth/tokens/:id` | DELETE | Revoke token |

### Billing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/billing/create-checkout-session` | POST | Start Stripe checkout |
| `/api/billing/create-portal-session` | POST | Open Stripe portal |
| `/api/stripe/webhook` | POST | Stripe webhook handler |

### Compare (requires auth + subscription)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/compare` | POST | Compare auction price with web prices |
| `/api/normalize` | POST | Normalize auction title (AI or heuristic) |

### POST /api/compare

**Request:**
```json
{
  "title": "iPhone 15 Pro",
  "brand": "Apple",
  "model": "15 Pro",
  "condition": "good",
  "currency": "EUR",
  "locale": "fr",
  "auctionPrice": 500,
  "siteDomain": "interencheres.fr"
}
```

**Headers:**
```
Authorization: Bearer <your_api_token>
```

**Response:**
```json
{
  "queryUsed": "Apple iPhone 15 Pro",
  "results": [...],
  "stats": { "min": 450, "median": 600, "max": 800, "count": 8 },
  "confidence": "high",
  "verdict": {
    "status": "worth_it",
    "margin": -10.5,
    "reason": "10% below the lowest web price"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid token
- `402 Payment Required` - No active subscription
- `429 Too Many Requests` - Rate limited

### POST /api/normalize

**Request:**
```json
{
  "rawTitle": "LOT 123 - iPhone 15 Pro 256GB Noir - Bon état",
  "siteDomain": "interencheres.fr",
  "locale": "fr",
  "brandHint": "Apple",
  "modelHint": "iPhone 15 Pro"
}
```

**Response:**
```json
{
  "normalizedTitle": "Apple iPhone 15 Pro 256GB",
  "brand": "Apple",
  "model": "iPhone 15 Pro",
  "reference": null,
  "capacity": "256GB",
  "condition": "used",
  "isAccessory": false,
  "query": "Apple iPhone 15 Pro 256GB",
  "altQueries": ["iPhone 15 Pro", "Apple iPhone 15 Pro occasion"],
  "confidence": 0.85,
  "usedAI": true,
  "cached": false
}
```

## Adding New Auction Sites

1. Create a new adapter in `apps/extension/adapters/`:

```typescript
// apps/extension/adapters/mysite.ts
import { BaseAdapter } from './base';

export class MySiteAdapter extends BaseAdapter {
  id = 'mysite';
  name = 'My Auction Site';
  urlPatterns = [/mysite\.com/i];
  defaultCurrency = 'EUR';
  defaultLocale = 'en';
  defaultFees = { buyerPremium: 0.20 };

  isLotPage(): boolean {
    // Return true if current page is a lot detail page
  }

  extractData(): AuctionData | null {
    // Extract auction data from DOM
  }

  getOverlayMountPoint(): Element | null {
    // Return element to mount overlay near
  }
}
```

2. Register in `apps/extension/adapters/index.ts`
3. Add URL pattern to `apps/extension/wxt.config.ts` host_permissions
4. Add URL pattern to content script matches

## Build for Production

```bash
# Build both server and extension
bun run build

# Or build individually
bun run build:server
bun run build:extension
```

The extension build output is at `apps/extension/.output/chrome-mv3/`

## Database

The server uses SQLite with Drizzle ORM. Tables:
- `users` - User accounts
- `api_tokens` - Extension API tokens
- `subscriptions` - Stripe subscription state
- `sessions` - Web sessions
- `webhook_events` - Processed Stripe events (idempotency)
- `plan_limits` - Monthly quota limits per plan (starter, pro, business)
- `usage_periods` - Per-user monthly usage tracking (fresh fetches, cache hits)
- `compare_cache_entries` - Global cache for search results (shared across users)
- `search_history` - User search history with cache hit tracking

The database is auto-initialized on first run at `apps/server/data/auction-comparator.db`.

## Smart Caching & Cost Optimization

### Fresh Fetch vs Cache Hit

The system distinguishes between:

- **Fresh Fetch**: A paid SerpApi call that consumes your monthly quota
- **Cache Hit**: Reusing existing search results (no quota consumed)

### Product Signatures

Each normalized product generates two signatures for cache lookup:

1. **Strict Signature** (`signature_strict`): Hash of `brand|model|reference|capacity_gb|functional_state|condition_grade|locale`
   - Used for exact matches
   - Different conditions = different cache entries

2. **Loose Signature** (`signature_loose`): Hash of `brand|model|reference|capacity_gb|functional_state|locale`
   - Excludes condition_grade
   - Used as fallback when condition is unknown or low confidence
   - Only valid for recently cached entries (6 hours vs 24 hours)

### Cache Lookup Flow

```
1. Compute signatures from normalized product
2. Look up by signature_strict
3. If not found AND condition is unknown/low-confidence:
   - Look up by signature_loose (with stricter TTL)
4. If still not found:
   - Check quota availability
   - Perform SerpApi call
   - Store in cache with both signatures
   - Increment quota usage
```

### Examples

| Title A | Title B | Cache Reuse? |
|---------|---------|--------------|
| iPhone 15 Pro 256GB Used | iPhone 15 Pro 256GB | Yes (loose) |
| iPhone 15 Pro 128GB | iPhone 15 Pro 256GB | No (capacity differs) |
| iPhone 15 Pro HS/Pour pièces | iPhone 15 Pro Used | No (functional_state differs) |

## Broken/For-Parts Detection

Items marked as broken, for parts, or not working are treated specially:

### Detected Indicators (French + English)

- **High confidence broken**: "HS", "hors service", "pour pièces", "ne s'allume pas", "iCloud lock", "for parts", "not working"
- **Medium confidence**: "cassé", "à réparer", "defective", "as-is"
- **Condition**: "neuf", "occasion", "reconditionné", "used", "refurbished"

### Functional State

- `ok` - Working condition (default)
- `broken` - For parts, not working
- `unknown` - Can't determine

**Important**: Broken items will NEVER reuse cache entries for working items (and vice versa). This prevents comparing broken iPhone prices with working iPhone prices.

## Subscription Plans & Quotas

### Plan Limits

| Plan | Monthly Fresh Fetches | Price |
|------|----------------------|-------|
| Starter | 50 | Free tier |
| Pro | 300 | €9.99/month |
| Business | 2000 | €49.99/month |

### Quota Enforcement

- Quotas are **only consumed on fresh fetches** (paid SerpApi calls)
- Cache hits do **not** consume quota
- Reset monthly based on subscription period
- When quota exceeded: 402 error with upgrade CTA

### Configure Plan Pricing

Add to your `.env`:

```env
# Stripe Price IDs for each plan
STRIPE_PRICE_ID=price_starter_...        # Default plan
STRIPE_PRICE_ID_PRO=price_pro_...
STRIPE_PRICE_ID_BUSINESS=price_business_...
```

## API Endpoints (Updated)

### Usage & History

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/usage` | GET | Get current month usage + quota |
| `/api/history` | GET | Get paginated search history |

### GET /api/usage

**Response:**
```json
{
  "period": "2026-02",
  "freshFetchCount": 15,
  "cacheHitCount": 42,
  "quota": 300,
  "plan": "pro",
  "daysRemaining": 18
}
```

### GET /api/history

**Query params:**
- `page` (default: 1)
- `pageSize` (default: 20, max: 100)
- `domain` (filter by auction site)
- `compareSource` (filter: cache_strict, cache_loose, fresh_fetch)

**Response:**
```json
{
  "entries": [
    {
      "id": "...",
      "createdAt": "2026-02-01T10:30:00Z",
      "domain": "interencheres.fr",
      "lotUrl": "https://...",
      "rawTitle": "LOT 123 - iPhone 15 Pro",
      "normalizedTitle": "Apple iPhone 15 Pro 256GB",
      "auctionPrice": 500,
      "currency": "EUR",
      "compareSource": "cache_strict",
      "stats": { "min": 450, "median": 600, "max": 800 },
      "fetchedAt": "2026-02-01T09:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

### POST /api/compare (Updated)

New request fields:
- `lotUrl` - Lot URL for history tracking
- `forceRefresh` - Force a fresh fetch (consumes quota)

New response fields:
```json
{
  "cache": {
    "source": "cache_strict",
    "cacheEntryId": "...",
    "fetchedAt": 1706781600000,
    "expiresAt": 1706868000000,
    "signatureUsed": "abc123..."
  },
  "normalized": {
    "brand": "Apple",
    "model": "iPhone 15 Pro",
    "capacity_gb": 256,
    "condition_grade": "used",
    "functional_state": "ok",
    "category": "product",
    "signatures": {
      "strict": "abc123...",
      "loose": "def456..."
    }
  },
  "usage": {
    "period": "2026-02",
    "freshFetchCount": 16,
    "cacheHitCount": 42,
    "quota": 300,
    "plan": "pro"
  }
}
```

New error code:
- `402 QUOTA_EXCEEDED` - Monthly quota exhausted

## Configuration

### Extension Settings

- **Enable/disable**: Toggle extension globally
- **Domain toggle**: Enable/disable for specific sites
- **API Server**: Backend URL (default: http://localhost:3001)

### Server Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SERPAPI_KEY` | Yes | SerpApi API key |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | Yes | Stripe subscription price ID |
| `APP_BASE_URL` | No | Public URL (default: http://localhost:3001) |
| `DATABASE_PATH` | No | SQLite path (default: ./data/auction-comparator.db) |

## AI-Assisted Normalization (Optional)

The system includes an optional AI layer to improve search precision when deterministic extraction has low confidence. AI is used ONLY for cleaning/normalizing titles and generating search queries - never for determining prices.

### How It Works

1. **Deterministic extraction** happens in the extension (brand, model, title from DOM)
2. Each extraction has a **confidence level**: high, medium, or low
3. If confidence is not high, the server calls **/api/normalize** to:
   - Clean auction boilerplate from titles
   - Extract structured attributes (brand, model, reference, capacity)
   - Detect accessories vs main products
   - Generate optimized search queries
4. Results are **cached for 30 days** (normalization rarely changes)

### Enabling AI Normalization

Add these to your `apps/server/.env`:

```env
# Choose one provider: 'anthropic', 'openai', or 'ollama'
NORMALIZER_PROVIDER=anthropic

# For Anthropic (recommended - fast & cheap with Haiku)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-haiku-20240307

# For OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# For Ollama (free, local)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### Using Ollama (Free/Local)

Ollama is the recommended option for local AI normalization - it's free and runs entirely on your machine.

1. Install Ollama: https://ollama.ai/
2. Pull a model: `ollama pull llama3.2`
3. Start Ollama: `ollama serve` (or run the Ollama app)
4. Configure environment:
   ```env
   NORMALIZER_PROVIDER=ollama
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.2
   ```

**Note**: AI is used ONLY for normalizing product metadata (brand, model, capacity, condition). It never extracts or determines prices - that's always done via SerpApi.

### Disabling AI

Leave `NORMALIZER_PROVIDER` empty or unset. The system will use heuristic normalization only (regex-based, no API calls).

### Caching

- **Normalization cache**: 30 days TTL, in-memory LRU (10,000 entries max)
- **Compare results cache**: 24 hours TTL (strict), 6 hours (loose fallback), stored in DB
- **In-flight deduplication**: Concurrent requests for same signature share one SerpApi call
- Cache key for normalization: hash of (title + locale + siteDomain + brandHint + modelHint)
- Cache key for compare: product signature (brand + model + capacity + functional_state + condition + locale)

### Cost Control

- AI is only called when extraction confidence is low/medium
- High-confidence extractions skip AI entirely
- Results are aggressively cached
- Cheap models recommended (Haiku, GPT-4o-mini, Llama 3.2)

## Tech Stack

- **Extension**: WXT, Vue 3, Nuxt UI v3, TypeScript
- **Server**: Nuxt 3, Nitro, Drizzle ORM, SQLite
- **Payments**: Stripe Checkout + Customer Portal
- **Shared**: TypeScript
- **Package Manager**: Bun

## Security

- Passwords hashed with bcrypt (12 rounds)
- API tokens stored as SHA-256 hashes
- HTTP-only cookies for web sessions
- Stripe webhook signature verification
- CORS configured for extension domains
- Rate limiting per user

## Notes

- SerpApi free tier has 100 searches/month - consider upgrading for production
- For production, use PostgreSQL instead of SQLite
- Configure Stripe webhooks for your production domain
- Server caches results for 1 hour to minimize API calls

## License

MIT

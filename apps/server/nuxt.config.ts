export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  modules: ['@nuxt/ui'],

  css: ['~/assets/css/main.css'],

  icon: {
    serverBundle: 'remote',
  },

  nitro: {
    preset: 'node-server',
  },

  runtimeConfig: {
    serpApiKey: process.env.SERPAPI_KEY || '',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    // Note: Stripe price IDs are read directly from process.env by price-mapping.ts
    // STRIPE_PRICE_STARTER_MONTHLY, STRIPE_PRICE_STARTER_YEARLY, etc.
    appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3001',
    // AI Normalization settings
    normalizerProvider: process.env.NORMALIZER_PROVIDER || '', // 'anthropic', 'openai', or 'ollama'
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2',
    public: {
      apiBase: process.env.API_BASE || 'http://localhost:3001',
      appName: 'Auction Comparator',
    },
  },

  routeRules: {
    '/api/**': {
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Id, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
    },
    // Disable CSRF for Stripe webhooks
    '/api/stripe/webhook': {
      cors: false,
    },
    // Client-side rendering for auth pages
    '/login': { ssr: false },
    '/register': { ssr: false },
    '/account': { ssr: false },
    '/billing': { ssr: false },
  },
});

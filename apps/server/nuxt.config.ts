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
    // Credit pack Stripe price IDs (one-time payments, EUR)
    // Premium pricing: pack_1=1.49, pack_5=4.99, pack_10=8.99, pack_30=19.99, pack_100=49.99
    stripePricePack1: process.env.STRIPE_PRICE_PACK_1 || '',
    stripePricePack5: process.env.STRIPE_PRICE_PACK_5 || '',
    stripePricePack10: process.env.STRIPE_PRICE_PACK_10 || '',
    stripePricePack30: process.env.STRIPE_PRICE_PACK_30 || '',
    stripePricePack100: process.env.STRIPE_PRICE_PACK_100 || '',
    appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3001',
    // Email / Resend
    resendApiKey: process.env.RESEND_API_KEY || '',
    emailFrom: process.env.EMAIL_FROM || 'AuctiMatch <no-reply@auctimatch.com>',
    contactEmail: process.env.CONTACT_EMAIL || 'contact@auctimatch.com',
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
    '/verify-email/**': { ssr: false },
  },
});

<script setup lang="ts">
const { isAuthenticated, hasActiveSubscription } = useAuth();
const { t } = useI18n();

const features = computed(() => [
  {
    icon: 'i-lucide-search',
    title: t('featureRealTimeTitle'),
    description: t('featureRealTimeDesc'),
  },
  {
    icon: 'i-lucide-badge-check',
    title: t('featureSmartBuyTitle'),
    description: t('featureSmartBuyDesc'),
  },
  {
    icon: 'i-lucide-chrome',
    title: t('featureBrowserTitle'),
    description: t('featureBrowserDesc'),
  },
  {
    icon: 'i-lucide-zap',
    title: t('featureFastTitle'),
    description: t('featureFastDesc'),
  },
  {
    icon: 'i-lucide-shield-check',
    title: t('featureSecureTitle'),
    description: t('featureSecureDesc'),
  },
  {
    icon: 'i-lucide-globe',
    title: t('featureMultiLangTitle'),
    description: t('featureMultiLangDesc'),
  },
]);

const steps = computed(() => [
  {
    number: '1',
    title: t('step1Title'),
    description: t('step1Desc'),
  },
  {
    number: '2',
    title: t('step2Title'),
    description: t('step2Desc'),
  },
  {
    number: '3',
    title: t('step3Title'),
    description: t('step3Desc'),
  },
]);

const supportedSites = [
  { name: 'Interencheres', domain: 'interencheres.com', logo: 'i-lucide-gavel' },
  { name: 'Alcopa Auction', domain: 'alcopa-auction.fr', logo: 'i-lucide-car' },
  { name: 'Encheres Domaine', domain: 'encheres-domaine.gouv.fr', logo: 'i-lucide-landmark' },
  { name: 'Moniteur des Ventes', domain: 'moniteurdesventes.com', logo: 'i-lucide-store' },
];

const faqs = computed(() => [
  {
    question: t('faqQuestion1'),
    answer: t('faqAnswer1'),
  },
  {
    question: t('faqQuestion2'),
    answer: t('faqAnswer2'),
  },
  {
    question: t('faqQuestion3'),
    answer: t('faqAnswer3'),
  },
  {
    question: t('faqQuestion4'),
    answer: t('faqAnswer4'),
  },
]);
</script>

<template>
  <div class="space-y-24 pb-16">
    <!-- Hero Section -->
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-emerald-500/10 dark:from-primary-500/5 dark:to-emerald-500/5" />
      <div class="relative pt-16 pb-20 text-center">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-6">
          <UIcon name="i-lucide-sparkles" class="w-4 h-4" />
          <span>{{ t('smartAuctionPriceAnalysis') }}</span>
        </div>

        <h1 class="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
          {{ t('heroTitle1') }}
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-emerald-500">{{ t('heroTitle2') }}</span>
          {{ t('heroTitle3') }}
        </h1>

        <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          {{ t('heroDescription') }}
        </p>

        <div class="flex flex-col sm:flex-row justify-center gap-4">
          <UButton
            v-if="!isAuthenticated"
            to="/register"
            size="xl"
            class="px-8"
          >
            <UIcon name="i-lucide-download" class="w-5 h-5 mr-2" />
            {{ t('getStartedFree') }}
          </UButton>
          <UButton
            v-else-if="!hasActiveSubscription"
            to="/account"
            size="xl"
            class="px-8"
          >
            {{ t('subscribeNow') }}
          </UButton>
          <UButton
            v-else
            to="/account"
            size="xl"
            variant="soft"
            class="px-8"
          >
            {{ t('goToAccount') }}
          </UButton>

          <UButton
            v-if="!isAuthenticated"
            to="/login"
            size="xl"
            variant="outline"
            class="px-8"
          >
            {{ t('signIn') }}
          </UButton>
        </div>

        <!-- Stats -->
        <div class="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          <div>
            <div class="text-3xl font-bold text-gray-900 dark:text-white">4+</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">{{ t('auctionSites') }}</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-gray-900 dark:text-white">{{ t('realTime') }}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">{{ t('priceUpdates') }}</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-gray-900 dark:text-white">FR & EN</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">{{ t('languages') }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Demo Preview -->
    <section class="relative">
      <div class="max-w-4xl mx-auto">
        <div class="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-2xl bg-gray-900">
          <!-- Browser Chrome -->
          <div class="bg-gray-800 px-4 py-3 flex items-center gap-3">
            <div class="flex gap-2">
              <div class="w-3 h-3 rounded-full bg-red-500" />
              <div class="w-3 h-3 rounded-full bg-yellow-500" />
              <div class="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div class="flex-1 bg-gray-700 rounded-lg px-4 py-1.5 text-sm text-gray-400 font-mono">
              interencheres.com/lot/12345
            </div>
          </div>
          <!-- Content Preview -->
          <div class="p-8 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 min-h-[300px] flex items-center justify-center">
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm border border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                  <UIcon name="i-lucide-scale" class="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <div class="font-semibold text-gray-900 dark:text-white">{{ t('priceComparisonTitle') }}</div>
                  <div class="text-xs text-gray-500">MacBook Pro M3</div>
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('auctionPrice') }}</span>
                  <span class="font-bold text-lg">1,200 EUR</span>
                </div>
                <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('marketPrice') }}</span>
                  <span class="font-bold text-lg text-gray-500">1,650 EUR</span>
                </div>
                <div class="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                  <span class="text-sm font-medium text-green-700 dark:text-green-400">{{ t('youSave') }}</span>
                  <span class="font-bold text-lg text-green-600 dark:text-green-400">450 EUR (27%)</span>
                </div>
              </div>

              <div class="mt-4 p-3 bg-green-500 rounded-lg text-center">
                <span class="text-white font-bold">{{ t('goodDealBid') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section>
      <div class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {{ t('howItWorks') }}
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {{ t('howItWorksDesc') }}
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <div v-for="step in steps" :key="step.number" class="relative text-center">
          <div class="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center mx-auto mb-4">
            <span class="text-2xl font-bold text-primary-600 dark:text-primary-400">{{ step.number }}</span>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">{{ step.title }}</h3>
          <p class="text-gray-600 dark:text-gray-400">{{ step.description }}</p>

          <!-- Connector line -->
          <div v-if="step.number !== '3'" class="hidden md:block absolute top-8 left-[calc(50%+3rem)] w-[calc(100%-6rem)] h-0.5 bg-gradient-to-r from-primary-200 to-primary-100 dark:from-primary-800 dark:to-primary-900" />
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section>
      <div class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {{ t('everythingYouNeed') }}
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {{ t('everythingYouNeedDesc') }}
        </p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <UCard v-for="feature in features" :key="feature.title" class="hover:shadow-lg transition-shadow">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
              <UIcon :name="feature.icon" class="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white mb-1">{{ feature.title }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ feature.description }}</p>
            </div>
          </div>
        </UCard>
      </div>
    </section>

    <!-- Supported Sites -->
    <section class="bg-gray-50 dark:bg-gray-900/50 -mx-4 px-4 py-16 rounded-3xl">
      <div class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {{ t('supportedAuctionSites') }}
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {{ t('supportedAuctionSitesDesc') }}
        </p>
      </div>

      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        <div
          v-for="site in supportedSites"
          :key="site.domain"
          class="bg-white dark:bg-gray-800 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
        >
          <div class="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
            <UIcon :name="site.logo" class="w-7 h-7 text-gray-600 dark:text-gray-400" />
          </div>
          <h3 class="font-semibold text-gray-900 dark:text-white mb-1">{{ site.name }}</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ site.domain }}</p>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section>
      <div class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {{ t('simpleTransparentPricing') }}
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {{ t('pricingDesc') }}
        </p>
      </div>

      <div class="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
        <!-- Starter Plan -->
        <UCard>
          <div class="text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">{{ t('starterPlan') }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ t('starterPlanDesc') }}</p>

            <div class="mb-4">
              <span class="text-4xl font-bold text-gray-900 dark:text-white">9.99</span>
              <span class="text-xl font-bold text-gray-900 dark:text-white">EUR</span>
              <span class="text-gray-500 dark:text-gray-400">{{ t('perMonth') }}</span>
            </div>

            <UBadge color="neutral" variant="soft" class="mb-6">{{ t('freshChecksMonth', { count: 50 }) }}</UBadge>

            <ul class="space-y-2 text-left text-sm mb-6">
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{{ t('allAuctionSites') }}</span>
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{{ t('unlimitedCacheHits') }}</span>
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{{ t('basicSupport') }}</span>
              </li>
            </ul>

            <UButton
              v-if="!isAuthenticated"
              to="/register"
              variant="soft"
              block
            >
              {{ t('getStarted') }}
            </UButton>
            <UButton
              v-else
              to="/account?tab=subscription"
              variant="soft"
              block
            >
              {{ t('viewPlans') }}
            </UButton>
          </div>
        </UCard>

        <!-- Pro Plan -->
        <UCard class="border-2 border-primary-500 dark:border-primary-400 relative">
          <UBadge color="primary" class="absolute -top-3 left-1/2 transform -translate-x-1/2">{{ t('mostPopular') }}</UBadge>
          <div class="text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">{{ t('proPlan') }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ t('proPlanDesc') }}</p>

            <div class="mb-4">
              <span class="text-4xl font-bold text-gray-900 dark:text-white">19.99</span>
              <span class="text-xl font-bold text-gray-900 dark:text-white">EUR</span>
              <span class="text-gray-500 dark:text-gray-400">{{ t('perMonth') }}</span>
            </div>

            <UBadge color="primary" variant="soft" class="mb-6">{{ t('freshChecksMonth', { count: 300 }) }}</UBadge>

            <ul class="space-y-2 text-left text-sm mb-6">
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{{ t('allAuctionSites') }}</span>
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{{ t('unlimitedCacheHits') }}</span>
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{{ t('prioritySupport') }}</span>
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{{ t('searchHistory') }}</span>
              </li>
            </ul>

            <UButton
              v-if="!isAuthenticated"
              to="/register"
              block
            >
              {{ t('getStarted') }}
            </UButton>
            <UButton
              v-else
              to="/account?tab=subscription"
              block
            >
              {{ t('viewPlans') }}
            </UButton>
          </div>
        </UCard>

        <!-- Business Plan -->
        <UCard>
          <div class="text-center">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">{{ t('businessPlan') }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ t('businessPlanDesc') }}</p>

            <div class="mb-4">
              <span class="text-4xl font-bold text-gray-900 dark:text-white">49.99</span>
              <span class="text-xl font-bold text-gray-900 dark:text-white">EUR</span>
              <span class="text-gray-500 dark:text-gray-400">{{ t('perMonth') }}</span>
            </div>

            <UBadge color="neutral" variant="soft" class="mb-6">{{ t('freshChecksMonth', { count: 2000 }) }}</UBadge>

            <ul class="space-y-2 text-left text-sm mb-6">
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{{ t('allAuctionSites') }}</span>
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{{ t('unlimitedCacheHits') }}</span>
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{{ t('premiumSupport') }}</span>
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{{ t('apiAccessComingSoon') }}</span>
              </li>
            </ul>

            <UButton
              v-if="!isAuthenticated"
              to="/register"
              variant="soft"
              block
            >
              {{ t('getStarted') }}
            </UButton>
            <UButton
              v-else
              to="/account?tab=subscription"
              variant="soft"
              block
            >
              {{ t('viewPlans') }}
            </UButton>
          </div>
        </UCard>
      </div>

      <p class="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
        {{ t('saveAnnualBilling') }}
      </p>
    </section>

    <!-- FAQ -->
    <section>
      <div class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {{ t('faq') }}
        </h2>
      </div>

      <div class="max-w-3xl mx-auto">
        <UAccordion :items="faqs.map((faq, i) => ({ label: faq.question, content: faq.answer, defaultOpen: i === 0 }))" />
      </div>
    </section>

    <!-- Final CTA -->
    <section class="text-center bg-gradient-to-br from-primary-500 to-emerald-500 -mx-4 px-4 py-16 rounded-3xl">
      <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
        {{ t('readyToSave') }}
      </h2>
      <p class="text-lg text-white/90 max-w-2xl mx-auto mb-8">
        {{ t('joinSmartBidders') }}
      </p>
      <UButton
        v-if="!isAuthenticated"
        to="/register"
        size="xl"
        color="white"
        class="px-8"
      >
        {{ t('getStartedNow') }}
      </UButton>
      <UButton
        v-else-if="!hasActiveSubscription"
        to="/account"
        size="xl"
        color="white"
        class="px-8"
      >
        {{ t('subscribeNow') }}
      </UButton>
      <UButton
        v-else
        to="/account"
        size="xl"
        color="white"
        variant="outline"
        class="px-8"
      >
        {{ t('goToDashboard') }}
      </UButton>
    </section>
  </div>
</template>

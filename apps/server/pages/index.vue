<script setup lang="ts">
const { isAuthenticated } = useAuth();
const { t, locale } = useI18n();
import { legacyLinks, CONTACT_EMAIL } from '~/config/legacyLinks';

// Premium credit packs (synced with server registry)
const creditPacks = [
  { id: 'pack_1', credits: 1, priceEur: 1.49, descKey: 'quickTopUp' as const, badge: 'none' as const },
  { id: 'pack_5', credits: 5, priceEur: 4.99, descKey: 'starterPack' as const, badge: 'none' as const },
  { id: 'pack_10', credits: 10, priceEur: 8.99, descKey: 'regularUse' as const, badge: 'none' as const },
  { id: 'pack_30', credits: 30, priceEur: 19.99, descKey: 'popularChoice' as const, badge: 'most_popular' as const },
  { id: 'pack_100', credits: 100, priceEur: 49.99, descKey: 'bestValue' as const, badge: 'best_value' as const },
];

// Buy credits
const buyingPack = ref<string | null>(null);

async function buyPack(packId: string) {
  if (!isAuthenticated.value) {
    navigateTo('/login');
    return;
  }

  buyingPack.value = packId;
  try {
    const response = await $fetch<{ url: string }>('/api/billing/checkout/credits', {
      method: 'POST',
      body: { packId },
    });
    if (response.url) {
      window.location.href = response.url;
    }
  } catch (error) {
    console.error('Failed to create checkout:', error);
  } finally {
    buyingPack.value = null;
  }
}

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
  { name: 'Agorastore', domain: 'agorastore.fr', logo: 'i-lucide-shopping-bag' },
  { name: 'Auctelia', domain: 'auctelia.com', logo: 'i-lucide-tractor' },
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
    <section class="relative overflow-hidden rounded-lg">
      <div class="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-emerald-500/10 dark:from-primary-500/5 dark:to-emerald-500/5" />
      <div class="relative pt-16 pb-20 text-center">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-6">
          <UIcon name="i-lucide-sparkles" class="w-4 h-4" />
          <span>{{ t('smartAuctionPriceAnalysis') }}</span>
        </div>

        <h1 class="text-pretty text-5xl md:text-6xl font-bold text-zinc-900 dark:text-white mb-6 leading-tight">
          {{ t('heroTitle1') }}
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-emerald-500">{{ t('heroTitle2') }}</span>
          <span v-if="locale === 'en'" class="pl-2">
            {{ t('heroTitle3') }}
          </span>
        </h1>

        <p class="text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          {{ t('heroDescription') }}
        </p>

        <div class="flex flex-col sm:flex-row justify-center gap-4">
          <UButton
            v-if="!isAuthenticated"
            to="https://chromewebstore.google.com/detail/auctimatch/afijdhkahknhjhodbdppppnpioeicdkb"
            size="xl"
            class="px-8"
            external
          >
            <UIcon name="i-lucide-download" class="w-5 h-5 mr-2" />
            {{ t('getStartedFree') }}
          </UButton>
          <UButton
            v-else
            to="/account"
            size="xl"
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
            <div class="text-3xl font-bold text-zinc-900 dark:text-white">6+</div>
            <div class="text-sm text-zinc-500 dark:text-zinc-400">{{ t('auctionSites') }}</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-zinc-900 dark:text-white">{{ t('realTime') }}</div>
            <div class="text-sm text-zinc-500 dark:text-zinc-400">{{ t('priceUpdates') }}</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-zinc-900 dark:text-white">FR & EN</div>
            <div class="text-sm text-zinc-500 dark:text-zinc-400">{{ t('languages') }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Demo Preview -->
    <section class="relative">
      <div class="max-w-4xl mx-auto">
        <div class="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl bg-zinc-900">
          <!-- Browser Chrome -->
          <div class="bg-zinc-800 px-4 py-3 flex items-center gap-3">
            <div class="flex gap-2">
              <div class="w-3 h-3 rounded-full bg-red-500" />
              <div class="w-3 h-3 rounded-full bg-yellow-500" />
              <div class="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div class="flex-1 bg-zinc-700 rounded-lg px-4 py-1.5 text-sm text-zinc-400 font-mono">
              interencheres.com/lot/12345
            </div>
          </div>
          <!-- Content Preview -->
          <div class="p-8 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 min-h-[300px] flex items-center justify-center">
            <div class="bg-white dark:bg-zinc-800 rounded-xl shadow-xl p-6 max-w-sm border border-zinc-200 dark:border-zinc-700">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                  <UIcon name="i-lucide-scale" class="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <div class="font-semibold text-zinc-900 dark:text-white">{{ t('priceComparisonTitle') }}</div>
                  <div class="text-xs text-zinc-500">MacBook Pro M3</div>
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg">
                  <span class="text-sm text-zinc-600 dark:text-zinc-400">{{ t('auctionPrice') }}</span>
                  <span class="font-bold text-lg">1,200 EUR</span>
                </div>
                <div class="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg">
                  <span class="text-sm text-zinc-600 dark:text-zinc-400">{{ t('marketPrice') }}</span>
                  <span class="font-bold text-lg text-zinc-500">1,650 EUR</span>
                </div>
                <div class="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                  <span class="text-sm font-medium text-green-700 dark:text-green-400 mr-2">{{ t('youSave') }}</span>
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
        <h2 class="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
          {{ t('howItWorks') }}
        </h2>
        <p class="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          {{ t('howItWorksDesc') }}
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <div v-for="step in steps" :key="step.number" class="relative text-center">
          <div class="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center mx-auto mb-4">
            <span class="text-2xl font-bold text-primary-600 dark:text-primary-400">{{ step.number }}</span>
          </div>
          <h3 class="text-xl font-semibold text-zinc-900 dark:text-white mb-2">{{ step.title }}</h3>
          <p class="text-zinc-600 dark:text-zinc-400">{{ step.description }}</p>

          <!-- Connector line -->
          <div v-if="step.number !== '3'" class="hidden md:block absolute top-8 left-[calc(50%+3rem)] w-[calc(100%-6rem)] h-0.5 bg-gradient-to-r from-primary-200 to-primary-100 dark:from-primary-800 dark:to-primary-900" />
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section>
      <div class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
          {{ t('everythingYouNeed') }}
        </h2>
        <p class="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
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
              <h3 class="font-semibold text-zinc-900 dark:text-white mb-1">{{ feature.title }}</h3>
              <p class="text-sm text-zinc-600 dark:text-zinc-400">{{ feature.description }}</p>
            </div>
          </div>
        </UCard>
      </div>
    </section>

    <!-- Supported Sites -->
    <section class="bg-zinc-50 dark:bg-zinc-900/50 -mx-4 px-4 py-16 rounded-3xl">
      <div class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
          {{ t('supportedAuctionSites') }}
        </h2>
        <p class="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          {{ t('supportedAuctionSitesDesc') }}
        </p>
      </div>

      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        <div
          v-for="site in supportedSites"
          :key="site.domain"
          class="bg-white dark:bg-zinc-800 rounded-xl p-6 text-center border border-zinc-200 dark:border-zinc-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
        >
          <div class="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center mx-auto mb-4">
            <UIcon :name="site.logo" class="w-7 h-7 text-zinc-600 dark:text-zinc-400" />
          </div>
          <h3 class="font-semibold text-zinc-900 dark:text-white mb-1">{{ site.name }}</h3>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ site.domain }}</p>
        </div>
      </div>
    </section>

    <!-- Credit Packs Pricing -->
    <section>
      <div class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
          {{ t('simpleTransparentPricing') }}
        </h2>
        <p class="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          {{ t('payOnlyForWhatYouUse') }}
        </p>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          {{ t('oneComparisonExplainer') }}
        </p>
      </div>

      <div class="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 max-w-6xl mx-auto">
        <UCard
          v-for="pack in creditPacks"
          :key="pack.id"
          :class="[
            pack.badge === 'most_popular' ? 'border-2 border-primary-500 dark:border-primary-400 relative' : '',
            pack.badge === 'best_value' ? 'border-2 border-emerald-500 dark:border-emerald-400 relative' : ''
          ]"
          :ui="pack.badge !== 'none' ? { root: 'overflow-visible' } : {}"
        >
          <UBadge
            v-if="pack.badge === 'most_popular'"
            color="primary"
            class="absolute -top-3 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
          >
            {{ t('mostPopular') }}
          </UBadge>
          <UBadge
            v-if="pack.badge === 'best_value'"
            color="success"
            class="absolute -top-3 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
          >
            {{ t('bestValueBadge') }}
          </UBadge>
          <div class="text-center">
            <h3 class="text-lg font-bold text-zinc-900 dark:text-white mb-1">
              {{ pack.credits }} {{ pack.credits === 1 ? t('comparison') : t('comparisons') }}
            </h3>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-3">{{ t(pack.descKey) }}</p>

            <div class="mb-1">
              <span class="text-2xl font-bold text-zinc-900 dark:text-white">{{ pack.priceEur.toFixed(2) }}</span>
              <span class="text-sm font-bold text-zinc-900 dark:text-white"> EUR</span>
            </div>
            <div class="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              {{ (pack.priceEur / pack.credits).toFixed(2) }} EUR/{{ t('comparison') }}
            </div>

            <UButton
              v-if="!isAuthenticated"
              to="/register"
              :variant="pack.badge !== 'none' ? 'solid' : 'soft'"
              :color="pack.badge === 'best_value' ? 'success' : 'primary'"
              size="sm"
              block
            >
              {{ t('getStarted') }}
            </UButton>
            <UButton
              v-else
              :loading="buyingPack === pack.id"
              :variant="pack.badge !== 'none' ? 'solid' : 'soft'"
              :color="pack.badge === 'best_value' ? 'success' : 'primary'"
              size="sm"
              block
              @click="buyPack(pack.id)"
            >
              {{ t('buy') }}
            </UButton>
          </div>
        </UCard>
      </div>

      <div class="text-center mt-8 space-y-2">
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          <UIcon name="i-lucide-infinity" class="w-4 h-4 inline-block mr-1 text-green-500" />
          {{ t('cacheHitsFree') }}
        </p>
        <p class="text-sm text-primary-500">
          <UIcon name="i-lucide-gift" class="w-4 h-4 inline-block mr-1" />
          {{ t('freeCreditsIncluded') }}
        </p>
      </div>
    </section>

    <!-- FAQ -->
    <section>
      <div class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
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
        color="neutral"
        variant="solid"
        class="px-8 bg-white text-primary-600 hover:bg-white/90"
      >
        {{ t('getStartedNow') }}
      </UButton>
      <UButton
        v-else
        to="/account"
        size="xl"
        color="neutral"
        variant="solid"
        class="px-8 bg-white text-primary-600 hover:bg-white/90"
      >
        {{ t('goToDashboard') }}
      </UButton>
    </section>

    <!-- Footer -->
    <footer class="border-t border-zinc-200 dark:border-zinc-800 pt-8 pb-4 -mx-4 px-4">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <UIcon name="i-lucide-scale" class="w-4 h-4 text-primary-500" />
          <span>AuctiMatch</span>
        </div>
        <nav class="flex flex-wrap items-center justify-center gap-4 text-sm">
          <template v-for="link in legacyLinks" :key="link.key">
            <a
              v-if="'href' in link"
              :href="link.href"
              class="text-zinc-500 dark:text-zinc-400 hover:text-primary-500 transition-colors"
            >
              {{ t(link.key) }}
            </a>
            <NuxtLink
              v-else
              :to="link.to"
              class="text-zinc-500 dark:text-zinc-400 hover:text-primary-500 transition-colors"
            >
              {{ t(link.key) }}
            </NuxtLink>
          </template>
        </nav>
      </div>
    </footer>
  </div>
</template>

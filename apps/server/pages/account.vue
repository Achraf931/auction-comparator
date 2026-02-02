<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
});

const { state, hasActiveSubscription, fetchUser, createCheckoutSession, createPortalSession, logout, connectExtension } = useAuth();
const { t } = useI18n();
const route = useRoute();

// Handle checkout redirect
const checkoutStatus = computed(() => route.query.checkout as string | undefined);

// Extension ID from URL (when redirected from extension login)
const extensionId = computed(() => route.query.ext as string | undefined);

// Tabs
const tabs = computed(() => [
  { label: t('profile'), value: 'profile', icon: 'i-lucide-user' },
  { label: t('subscription'), value: 'subscription', icon: 'i-lucide-credit-card' },
  { label: t('history'), value: 'history', icon: 'i-lucide-history' },
]);
// Default to subscription tab if specified in query
const initialTab = route.query.tab === 'subscription' ? 'subscription' : 'profile';
const activeTab = ref(initialTab);

const billingLoading = ref<string | null>(null);

// Billing period toggle
const billingPeriod = ref<'monthly' | 'yearly'>('monthly');

// Fetch pricing data
interface PlanPricing {
  planKey: 'starter' | 'pro' | 'business';
  name: string;
  description: string;
  monthlyQuota: number;
  features: string[];
  monthly: { priceId: string; price: number; currency: string };
  yearly: { priceId: string; price: number; currency: string; monthlyEquivalent: number; savings: number };
}

const plans = ref<PlanPricing[]>([]);
const pricesLoading = ref(true);

async function fetchPrices() {
  try {
    const response = await $fetch<{ plans: PlanPricing[] }>('/api/billing/prices');
    plans.value = response.plans;
  } catch (error) {
    console.error('Failed to fetch prices:', error);
  } finally {
    pricesLoading.value = false;
  }
}

// Extension connection
const extensionConnected = ref(false);
const extensionConnecting = ref(false);

async function handleSubscribe(priceId: string) {
  billingLoading.value = priceId;
  await createCheckoutSession(priceId);
  billingLoading.value = null;
}

async function handleManageBilling() {
  billingLoading.value = 'portal';
  await createPortalSession();
  billingLoading.value = null;
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString();
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(price);
}

function getPlanDisplayName(planKey: string | null | undefined): string {
  if (!planKey) return 'Free';
  const names: Record<string, string> = { starter: 'Starter', pro: 'Pro', business: 'Business' };
  return names[planKey] || planKey;
}

// Refresh user data on mount
onMounted(async () => {
  await Promise.all([fetchUser(), fetchPrices()]);

  // Auto-connect extension if we have an ID
  if (extensionId.value && state.value.user) {
    extensionConnecting.value = true;
    const success = await connectExtension(extensionId.value);
    extensionConnecting.value = false;
    extensionConnected.value = success;
  }
});
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ t('account') }}</h1>
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-lucide-log-out"
        @click="logout"
      >
        {{ t('signOut') }}
      </UButton>
    </div>

    <!-- Checkout Status Alerts -->
    <UAlert
      v-if="checkoutStatus === 'success'"
      color="success"
      variant="soft"
      icon="i-lucide-check-circle"
      :title="t('checkoutSuccess')"
      :description="t('checkoutSuccessDesc')"
      closable
    />

    <UAlert
      v-if="checkoutStatus === 'cancel'"
      color="warning"
      variant="soft"
      icon="i-lucide-x-circle"
      :title="t('checkoutCancelled')"
      :description="t('checkoutCancelledDesc')"
      closable
    />

    <!-- Extension Connecting -->
    <UCard v-if="extensionConnecting">
      <div class="text-center py-4">
        <UIcon name="i-lucide-loader-2" class="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
        <h2 class="text-xl font-bold mb-2">{{ t('loading') }}</h2>
        <p class="text-zinc-600 dark:text-zinc-400">
          {{ t('extensionNowConnected') }}
        </p>
      </div>
    </UCard>

    <!-- Extension Connected Success -->
    <UCard v-else-if="extensionConnected">
      <div class="text-center py-4">
        <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <UIcon name="i-lucide-check-circle" class="w-8 h-8 text-green-500" />
        </div>
        <h2 class="text-xl font-bold text-green-700 dark:text-green-400 mb-2">{{ t('extensionConnected') }}</h2>
        <p class="text-zinc-600 dark:text-zinc-400">
          {{ t('canCloseTab') }}
        </p>
      </div>
    </UCard>

    <!-- Extension Connection Failed -->
    <UCard v-else-if="extensionId && !extensionConnected && !extensionConnecting">
      <div class="text-center py-4">
        <div class="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <UIcon name="i-lucide-alert-circle" class="w-8 h-8 text-amber-500" />
        </div>
        <h2 class="text-xl font-bold text-amber-700 dark:text-amber-400 mb-2">{{ t('subscriptionRequired') }}</h2>
        <p class="text-zinc-600 dark:text-zinc-400 mb-4">
          {{ t('subscribeToStart') }}
        </p>
        <UButton @click="connectExtension(extensionId!).then(s => extensionConnected = s)">
          {{ t('subscribeNow') }}
        </UButton>
      </div>
    </UCard>

    <!-- Extension Status Card -->
    <UCard v-else>
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-full flex items-center justify-center" :class="hasActiveSubscription ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'">
          <UIcon
            :name="hasActiveSubscription ? 'i-lucide-check-circle' : 'i-lucide-alert-circle'"
            class="w-6 h-6"
            :class="hasActiveSubscription ? 'text-green-500' : 'text-amber-500'"
          />
        </div>
        <div class="flex-1">
          <h3 class="font-semibold">
            {{ hasActiveSubscription ? t('extensionReady') : t('subscriptionRequired') }}
          </h3>
          <p class="text-sm text-zinc-500">
            {{ hasActiveSubscription ? t('extensionConnectedReady') : t('subscribeToStart') }}
          </p>
        </div>
        <UButton
          v-if="!hasActiveSubscription"
          @click="activeTab = 'subscription'"
        >
          {{ t('viewPlans') }}
        </UButton>
      </div>
    </UCard>

    <!-- Tabs -->
    <UTabs v-model="activeTab" :items="tabs" />

    <!-- Profile Tab -->
    <UCard v-if="activeTab === 'profile'">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-user" class="w-5 h-5 text-primary-500" />
          <span class="font-semibold">{{ t('profileInfo') }}</span>
        </div>
      </template>

      <div class="space-y-4">
        <div class="flex justify-between items-center py-2 border-b border-default">
          <span class="text-zinc-500">{{ t('email') }}</span>
          <span class="font-medium">{{ state.user?.email }}</span>
        </div>
        <div class="flex justify-between items-center py-2 border-b border-default">
          <span class="text-zinc-500">{{ t('memberSince') }}</span>
          <span class="font-medium">{{ formatDate(state.user?.createdAt ?? null) }}</span>
        </div>
        <div class="flex justify-between items-center py-2">
          <span class="text-zinc-500">{{ t('accountId') }}</span>
          <span class="font-mono text-sm text-zinc-400">{{ state.user?.id?.slice(0, 8) }}...</span>
        </div>
      </div>
    </UCard>

    <!-- Subscription Tab -->
    <template v-if="activeTab === 'subscription'">
      <!-- Pricing Cards (No subscription) -->
      <div v-if="!hasActiveSubscription" class="space-y-6">
        <!-- Billing Period Toggle -->
        <div class="flex justify-center">
          <div class="inline-flex items-center gap-3 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <button
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              :class="billingPeriod === 'monthly' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-600 dark:text-zinc-400'"
              @click="billingPeriod = 'monthly'"
            >
              {{ t('monthly') }}
            </button>
            <button
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              :class="billingPeriod === 'yearly' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-600 dark:text-zinc-400'"
              @click="billingPeriod = 'yearly'"
            >
              {{ t('yearly') }}
              <UBadge color="success" size="xs">{{ t('saveUpTo', { percent: 30 }) }}</UBadge>
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="pricesLoading" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
        </div>

        <!-- Plans Grid -->
        <div v-else class="grid gap-4 md:grid-cols-3">
          <UCard
            v-for="plan in plans"
            :key="plan.planKey"
            :class="plan.planKey === 'pro' ? 'ring-2 ring-primary-500' : ''"
          >
            <template #header>
              <div class="text-center">
                <UBadge v-if="plan.planKey === 'pro'" color="primary" class="mb-2">{{ t('mostPopular') }}</UBadge>
                <h3 class="text-xl font-bold">{{ plan.name }}</h3>
                <p class="text-sm text-zinc-500">{{ plan.description }}</p>
              </div>
            </template>

            <div class="text-center py-4">
              <template v-if="billingPeriod === 'monthly'">
                <div class="text-3xl font-bold">
                  {{ formatPrice(plan.monthly.price, plan.monthly.currency) }}
                  <span class="text-base font-normal text-zinc-500">/{{ t('monthly').toLowerCase() }}</span>
                </div>
              </template>
              <template v-else>
                <div class="text-3xl font-bold">
                  {{ formatPrice(plan.yearly.price, plan.yearly.currency) }}
                  <span class="text-base font-normal text-zinc-500">/{{ t('yearly').toLowerCase() }}</span>
                </div>
                <div class="text-sm text-zinc-500 mt-1">
                  {{ formatPrice(plan.yearly.monthlyEquivalent, plan.yearly.currency) }}/{{ t('monthly').toLowerCase() }}
                  <span class="text-green-600 font-medium ml-1">{{ t('saveUpTo', { percent: plan.yearly.savings }) }}</span>
                </div>
              </template>
            </div>

            <div class="text-center mb-4">
              <UBadge color="neutral" variant="soft">
                {{ t('freshChecksMonth', { count: plan.monthlyQuota }) }}
              </UBadge>
            </div>

            <ul class="space-y-2 mb-6 text-sm">
              <li v-for="feature in plan.features" :key="feature" class="flex items-start gap-2">
                <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{{ feature }}</span>
              </li>
            </ul>

            <UButton
              block
              :color="plan.planKey === 'pro' ? 'primary' : 'neutral'"
              :variant="plan.planKey === 'pro' ? 'solid' : 'soft'"
              :loading="billingLoading === (billingPeriod === 'monthly' ? plan.monthly.priceId : plan.yearly.priceId)"
              @click="handleSubscribe(billingPeriod === 'monthly' ? plan.monthly.priceId : plan.yearly.priceId)"
            >
              {{ t('subscribeNow') }}
            </UButton>
          </UCard>
        </div>

        <p class="text-center text-sm text-gray-500">
          {{ t('cancelAnytime') }}
        </p>
      </div>

      <!-- Active Subscription -->
      <UCard v-else>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-credit-card" class="w-5 h-5 text-primary-500" />
            <span class="font-semibold">{{ t('yourSubscription') }}</span>
          </div>
        </template>

        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 rounded-lg border border-default">
            <div>
              <div class="font-semibold">
                {{ getPlanDisplayName(state.subscription?.planKey) }} Plan
              </div>
              <div class="text-sm">
                {{ state.subscription?.billingPeriod === 'yearly' ? t('annualBilling') : t('monthlyBilling') }}
              </div>
            </div>
            <UBadge color="success" variant="subtle">{{ state.subscription?.status }}</UBadge>
          </div>

          <div class="space-y-2">
            <div v-if="state.subscription?.currentPeriodEnd" class="flex justify-between text-sm">
              <span class="text-gray-500">
                {{ state.subscription.cancelAtPeriodEnd ? t('endsOn') : t('renewsOn') }}
              </span>
              <span class="font-medium">{{ formatDate(state.subscription.currentPeriodEnd) }}</span>
            </div>
          </div>

          <UAlert
            v-if="state.subscription?.cancelAtPeriodEnd"
            color="warning"
            variant="soft"
            icon="i-lucide-alert-triangle"
          >
            <template #title>{{ t('subscriptionEnding') }}</template>
            <template #description>
              {{ t('subscriptionWontRenew') }}
            </template>
          </UAlert>

          <UButton
            color="neutral"
            :loading="billingLoading === 'portal'"
            @click="handleManageBilling"
          >
            {{ t('manageSubscription') }}
          </UButton>

          <p class="text-sm text-gray-500">
            {{ t('updatePaymentMethod') }}
          </p>
        </div>
      </UCard>
    </template>

    <!-- History Tab -->
    <UCard v-if="activeTab === 'history'">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-history" class="w-5 h-5 text-primary-500" />
          <span class="font-semibold">{{ t('searchHistory') }}</span>
        </div>
      </template>

      <div class="text-center py-8">
        <UIcon name="i-lucide-search" class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          {{ t('searchHistoryDesc') }}
        </p>
        <NuxtLink to="/history">
          <UButton icon="i-lucide-external-link">
            {{ t('viewDetails') }}
          </UButton>
        </NuxtLink>
      </div>
    </UCard>

    <!-- Error Display -->
    <UAlert
      v-if="state.error"
      color="error"
      variant="soft"
      :title="state.error"
      closable
    />
  </div>
</template>

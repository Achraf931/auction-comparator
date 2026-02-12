<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
});

const { state, fetchUser, createPortalSession, logout, connectExtension } = useAuth();
const { t } = useI18n();
const route = useRoute();

// Handle checkout redirect
const checkoutStatus = computed(() => route.query.checkout as string | undefined);
const creditsStatus = computed(() => route.query.credits as string | undefined);

// Extension ID from URL (when redirected from extension login)
const extensionId = computed(() => route.query.ext as string | undefined);

// Tabs
const tabs = computed(() => [
  { label: t('profile'), value: 'profile', icon: 'i-lucide-user' },
  { label: t('credits'), value: 'credits', icon: 'i-lucide-coins' },
  { label: t('history'), value: 'history', icon: 'i-lucide-history' },
]);
// Default to credits tab if specified in query
const initialTab = route.query.tab === 'credits' ? 'credits' : 'profile';
const activeTab = ref(initialTab);

const billingLoading = ref<string | null>(null);

// Credits data
interface CreditsData {
  balance: number;
  freeAvailable: boolean;
  freeCreditsAmount: number;
  totalPurchased: number;
  totalConsumed: number;
}

interface CreditPack {
  id: string;
  credits: number;
  displayName: string;
  shortDescription: string;
  priceEur: number;
  priceCents: number;
  pricePerCredit: number;
  badge: 'none' | 'most_popular' | 'best_value';
  stripePriceId: string | null;
}

const credits = ref<CreditsData | null>(null);
const creditPacks = ref<CreditPack[]>([]);
const creditsLoading = ref(true);

async function fetchCredits() {
  try {
    const [creditsResponse, packsResponse] = await Promise.all([
      $fetch<CreditsData>('/api/me/credits'),
      $fetch<{ packs: CreditPack[] }>('/api/billing/credit-packs'),
    ]);
    credits.value = creditsResponse;
    creditPacks.value = packsResponse.packs;
  } catch (error) {
    console.error('Failed to fetch credits:', error);
  } finally {
    creditsLoading.value = false;
  }
}

const showVerificationModal = ref(false);
const resendLoading = ref(false);
const resendSuccess = ref(false);

async function buyPack(packId: string) {
  billingLoading.value = packId;
  try {
    const response = await $fetch<{ url: string }>('/api/billing/checkout/credits', {
      method: 'POST',
      body: { packId },
    });
    if (response.url) {
      window.location.href = response.url;
    }
  } catch (error: any) {
    if (error.data?.error?.code === 'EMAIL_NOT_VERIFIED') {
      showVerificationModal.value = true;
    } else {
      console.error('Failed to create checkout:', error);
    }
  } finally {
    billingLoading.value = null;
  }
}

async function handleResendVerification() {
  resendLoading.value = true;
  resendSuccess.value = false;
  try {
    await $fetch('/api/auth/resend-verification', {
      method: 'POST',
      credentials: 'include',
    });
    resendSuccess.value = true;
  } catch (error) {
    console.error('Failed to resend verification:', error);
  } finally {
    resendLoading.value = false;
  }
}

const isEmailVerified = computed(() => !!state.value.user?.emailVerifiedAt);

// Extension connection
const extensionConnected = ref(false);
const extensionConnecting = ref(false);

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
  await Promise.all([fetchUser(), fetchCredits()]);

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

    <!-- Checkout/Credits Status Alerts -->
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

    <UAlert
      v-if="creditsStatus === 'success'"
      color="success"
      variant="soft"
      icon="i-lucide-coins"
      :title="t('creditsSuccess')"
      :description="t('creditsSuccessDesc')"
      closable
    />

    <UAlert
      v-if="creditsStatus === 'cancel'"
      color="warning"
      variant="soft"
      icon="i-lucide-x-circle"
      :title="t('creditsCancelled')"
      :description="t('creditsCancelledDesc')"
      closable
    />

    <!-- Email Verification Banner -->
    <UAlert
      v-if="state.user && !isEmailVerified"
      color="warning"
      variant="soft"
      icon="i-lucide-mail"
      :title="t('emailNotVerified')"
      :description="t('verifyEmailBanner')"
    >
      <template #actions>
        <UButton
          variant="soft"
          color="warning"
          size="xs"
          :loading="resendLoading"
          @click="handleResendVerification"
        >
          {{ t('resendVerificationEmail') }}
        </UButton>
      </template>
    </UAlert>

    <UAlert
      v-if="resendSuccess"
      color="success"
      variant="soft"
      icon="i-lucide-check"
      :title="t('verificationEmailSent')"
      closable
      @close="resendSuccess = false"
    />

    <!-- Email Verification Modal -->
    <UModal v-model:open="showVerificationModal">
      <template #content>
        <div class="p-6 text-center">
          <div class="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-lucide-mail-warning" class="w-8 h-8 text-amber-500" />
          </div>
          <h3 class="text-lg font-bold text-zinc-900 dark:text-white mb-2">{{ t('emailNotVerified') }}</h3>
          <p class="text-zinc-600 dark:text-zinc-400 mb-6">{{ t('emailNotVerifiedDesc') }}</p>
          <div class="flex flex-col gap-3">
            <UButton
              :loading="resendLoading"
              @click="handleResendVerification"
            >
              {{ t('resendVerificationEmail') }}
            </UButton>
            <UButton
              variant="ghost"
              color="neutral"
              @click="showVerificationModal = false"
            >
              {{ t('cancel') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

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

    <!-- Extension Connection - Needs Credits -->
    <UCard v-else-if="extensionId && !extensionConnected && !extensionConnecting">
      <div class="text-center py-4">
        <div class="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <UIcon name="i-lucide-coins" class="w-8 h-8 text-amber-500" />
        </div>
        <h2 class="text-xl font-bold text-amber-700 dark:text-amber-400 mb-2">{{ t('extensionConnected') }}</h2>
        <p class="text-zinc-600 dark:text-zinc-400 mb-4">
          {{ t('freeCreditsIncluded') }}
        </p>
        <UButton @click="connectExtension(extensionId!).then(s => extensionConnected = s)">
          {{ t('getStarted') }}
        </UButton>
      </div>
    </UCard>

    <!-- Extension Status Card -->
    <UCard v-else>
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30">
          <UIcon
            name="i-lucide-check-circle"
            class="w-6 h-6 text-green-500"
          />
        </div>
        <div class="flex-1">
          <h3 class="font-semibold">{{ t('extensionReady') }}</h3>
          <p class="text-sm text-zinc-500">
            {{ t('extensionConnectedReady') }}
          </p>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold text-primary-500">{{ credits?.balance || 0 }}</div>
          <div class="text-xs text-zinc-500">{{ t('credits') }}</div>
        </div>
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

    <!-- Credits Tab -->
    <template v-if="activeTab === 'credits'">
      <!-- Current Balance -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-coins" class="w-5 h-5 text-primary-500" />
            <span class="font-semibold">{{ t('yourCredits') }}</span>
          </div>
        </template>

        <div class="text-center py-6">
          <div class="text-5xl font-bold text-primary-500 mb-2">
            {{ credits?.balance || 0 }}
          </div>
          <div class="text-zinc-500">{{ t('creditsBalance') }}</div>
          <div v-if="credits?.freeAvailable" class="mt-2 text-sm text-green-600">
            + 1 {{ t('freeCredit') }}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 pt-4 border-t border-default">
          <div class="text-center">
            <div class="text-2xl font-bold text-zinc-700 dark:text-zinc-300">{{ credits?.totalPurchased || 0 }}</div>
            <div class="text-xs text-zinc-500">{{ t('totalPurchased') }}</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-zinc-700 dark:text-zinc-300">{{ credits?.totalConsumed || 0 }}</div>
            <div class="text-xs text-zinc-500">{{ t('totalConsumed') }}</div>
          </div>
        </div>
      </UCard>

      <!-- Buy Credits -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-shopping-cart" class="w-5 h-5 text-primary-500" />
            <span class="font-semibold">{{ t('buyCredits') }}</span>
          </div>
        </template>

        <!-- Loading -->
        <div v-if="creditsLoading" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
        </div>

        <!-- Credit Packs -->
        <div v-else class="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <div
            v-for="pack in creditPacks"
            :key="pack.id"
            class="relative p-3 rounded-lg border-2 transition-colors"
            :class="[
              pack.badge === 'most_popular' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : '',
              pack.badge === 'best_value' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : '',
              pack.badge === 'none' ? 'border-zinc-200 dark:border-zinc-700' : ''
            ]"
          >
            <UBadge
              v-if="pack.badge === 'most_popular'"
              color="primary"
              size="xs"
              class="absolute -top-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
            >
              {{ t('mostPopular') }}
            </UBadge>
            <UBadge
              v-if="pack.badge === 'best_value'"
              color="success"
              size="xs"
              class="absolute -top-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
            >
              {{ t('bestValueBadge') }}
            </UBadge>
            <div class="text-center" :class="pack.badge !== 'none' ? 'pt-2' : ''">
              <div class="text-xl font-bold">{{ pack.credits }}</div>
              <div class="text-xs text-zinc-500 mb-1">{{ pack.credits === 1 ? t('comparison') : t('comparisons') }}</div>
              <div class="text-sm text-zinc-400 mb-2">{{ pack.shortDescription }}</div>
              <div class="text-lg font-bold" :class="pack.badge === 'best_value' ? 'text-emerald-500' : 'text-primary-500'">
                {{ pack.priceEur.toFixed(2) }} EUR
              </div>
              <div class="text-xs text-zinc-400 mb-3">{{ pack.pricePerCredit.toFixed(2) }} EUR/{{ t('comparison') }}</div>
              <UButton
                block
                size="xs"
                :color="pack.badge === 'best_value' ? 'success' : pack.badge === 'most_popular' ? 'primary' : 'neutral'"
                :variant="pack.badge !== 'none' ? 'solid' : 'soft'"
                :loading="billingLoading === pack.id"
                @click="buyPack(pack.id)"
              >
                {{ t('buy') }}
              </UButton>
            </div>
          </div>
        </div>

        <div class="text-center mt-4 space-y-1">
          <p class="text-xs text-zinc-500">
            {{ t('oneComparisonExplainer') }}
          </p>
          <p class="text-xs text-zinc-500">
            {{ t('cacheHitsFree') }}
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

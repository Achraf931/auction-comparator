<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AuctionData, CompareResponse, SiteAdapter, UserInfo, UsageResponse } from '@auction-comparator/shared'
import { formatPrice } from '@auction-comparator/shared'
import { requestComparison, requestComparisonWithRefresh, checkAuth, openLogin, logout, requestUsage } from '@/utils/messaging'
import { listenForLocaleChanges } from '@/utils/i18n'
import PricePanel from '@/components/overlay/PricePanel.vue'
import VerdictBadge from '@/components/overlay/VerdictBadge.vue'
import ConfidenceIndicator from '@/components/overlay/ConfidenceIndicator.vue'
import WebResultsList from '@/components/overlay/WebResultsList.vue'
import CacheStatus from '@/components/overlay/CacheStatus.vue'
import QuotaWidget from '@/components/overlay/QuotaWidget.vue'

const { t } = useI18n()

const props = defineProps<{
  initialData: AuctionData;
  adapter: SiteAdapter;
}>()

console.log('[App.vue] Props initialData:', JSON.stringify(props.initialData))
const auctionData = ref<AuctionData>(props.initialData)
console.log('[App.vue] auctionData ref:', JSON.stringify(auctionData.value))
const comparison = ref<CompareResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const errorCode = ref<string | null>(null)
const collapsed = ref(false)

// Drag state
const isDragging = ref(false)
const position = ref({ x: 0, y: 0 })
const dragOffset = ref({ x: 0, y: 0 })

function startDrag(e: MouseEvent) {
  isDragging.value = true
  const container = (e.target as HTMLElement).closest('.overlay-container') as HTMLElement
  if (container) {
    const rect = container.getBoundingClientRect()
    dragOffset.value = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return
  position.value = {
    x: e.clientX - dragOffset.value.x,
    y: e.clientY - dragOffset.value.y
  }
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const overlayStyle = computed(() => {
  if (position.value.x === 0 && position.value.y === 0) {
    return {} // Use default CSS position
  }
  return {
    top: `${position.value.y}px`,
    left: `${position.value.x}px`,
    right: 'auto'
  }
})

// Auth state
const authenticated = ref(false)
const hasSubscription = ref(false)
const user = ref<UserInfo | null>(null)
const authLoading = ref(true)

// Usage/quota state
const usage = ref<UsageResponse | null>(null)
const quotaExceeded = ref(false)
const freeExhausted = ref(false)

// Check if user can make comparisons (has subscription OR free tier remaining)
const canCompare = computed(() => {
  if (hasSubscription.value) return true
  if (usage.value && usage.value.freeRemaining !== undefined) {
    return usage.value.freeRemaining > 0
  }
  return true // Default to true, let backend handle
})


const formattedAuctionPrice = computed(() =>
  formatPrice(auctionData.value.totalPrice, auctionData.value.currency)
)

async function checkAuthStatus() {
  authLoading.value = true
  try {
    const result = await checkAuth()
    authenticated.value = result.authenticated
    hasSubscription.value = result.hasSubscription
    user.value = result.user ?? null
  } catch (err) {
    console.error('[Auction Comparator] Auth check error:', err)
    authenticated.value = false
    hasSubscription.value = false
  } finally {
    authLoading.value = false
  }
}

async function fetchComparison(forceRefresh: boolean = false) {
  // Only require authentication, not subscription (free tier allowed)
  if (!authenticated.value) {
    return
  }

  loading.value = true
  error.value = null
  errorCode.value = null
  quotaExceeded.value = false
  freeExhausted.value = false

  try {
    comparison.value = forceRefresh
      ? await requestComparisonWithRefresh(auctionData.value, true)
      : await requestComparison(auctionData.value)
    console.log('[Auction Comparator] Comparison fetched:', comparison.value)

    // Update usage from response
    if (comparison.value.usage) {
      usage.value = {
        ...comparison.value.usage,
        daysRemaining: 0, // Will be updated by fetchUsage
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch comparison'
    errorCode.value = err.code || 'API_ERROR'

    // Handle auth errors
    if (err.code === 'UNAUTHORIZED') {
      authenticated.value = false
    } else if (err.code === 'SUBSCRIPTION_REQUIRED') {
      hasSubscription.value = false
    } else if (err.code === 'QUOTA_EXCEEDED') {
      quotaExceeded.value = true
      if (err.usage) {
        usage.value = err.usage
      }
    } else if (err.code === 'FREE_EXHAUSTED') {
      freeExhausted.value = true
      if (err.usage) {
        usage.value = err.usage
      }
    }

    console.error('[Auction Comparator] Comparison error:', err)
  } finally {
    loading.value = false
  }
}

async function fetchUsage() {
  // Fetch usage for all authenticated users (including free tier)
  if (!authenticated.value) {
    return
  }

  try {
    usage.value = await requestUsage()
  } catch (err) {
    console.error('[Auction Comparator] Usage fetch error:', err)
  }
}

function handleForceRefresh() {
  if (quotaExceeded.value || freeExhausted.value) {
    // Can't force refresh when quota is exceeded or free tier exhausted
    return
  }
  fetchComparison(true)
}

function handleDataUpdate(event: CustomEvent<AuctionData>) {
  auctionData.value = event.detail
  if (authenticated.value) {
    fetchComparison()
  }
}

function toggleCollapsed() {
  collapsed.value = !collapsed.value
}

function retry() {
  fetchComparison()
}

async function handleSignIn() {
  await openLogin()
}


async function handleLogout() {
  await logout()
  authenticated.value = false
  hasSubscription.value = false
  user.value = null
  comparison.value = null
}

// Handle auth changed message from background script
function handleAuthChanged(message: any) {
  if (message.type === 'AUTH_CHANGED') {
    console.log('[Auction Comparator] Auth changed, refreshing...')
    checkAuthStatus().then(() => {
      if (authenticated.value) {
        fetchComparison()
        fetchUsage()
      }
    })
  }
}

onMounted(async () => {
  await checkAuthStatus()
  if (authenticated.value) {
    fetchComparison()
    fetchUsage()
  }

  // Listen for data updates from the content script
  const container = document.getElementById('app')
  container?.addEventListener('auction-data-updated', handleDataUpdate as EventListener)

  // Listen for auth changes from background script
  chrome.runtime.onMessage.addListener(handleAuthChanged)

  // Listen for locale changes from popup
  listenForLocaleChanges()
})

onUnmounted(() => {
  const container = document.getElementById('app')
  container?.removeEventListener('auction-data-updated', handleDataUpdate as EventListener)
  chrome.runtime.onMessage.removeListener(handleAuthChanged)
})
</script>

<template>
  <UApp>
    <div class="overlay-container" :style="overlayStyle">
      <Transition name="overlay">
        <UCard variant="solid" class="shadow-xl border border-muted/10">
          <!-- Header (draggable) -->
          <template #header>
            <div
              class="flex items-center justify-between gap-2 cursor-move select-none"
              @mousedown="startDrag"
            >
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-grip-vertical" class="text-muted size-4" />
                <UIcon name="i-lucide-scale" class="text-primary size-5" />
                <span class="font-semibold text-sm">{{ t('priceCompare') }}</span>
              </div>
              <div class="flex items-center gap-1" @mousedown.stop>
                <VerdictBadge
                  v-if="comparison && !collapsed"
                  :verdict="comparison.verdict"
                  size="sm"
                />
                <UButton
                  :icon="collapsed ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
                  variant="link"
                  color="neutral"
                  @click="toggleCollapsed"
                />
              </div>
            </div>
          </template>

          <!-- Auth Loading -->
          <template v-if="authLoading">
            <div class="flex flex-col items-center gap-3 py-4">
              <UIcon name="i-lucide-loader-2" class="size-6 text-muted animate-spin" />
              <span class="text-sm text-muted">{{ t('checkingAccount') }}</span>
            </div>
          </template>

          <!-- Not Authenticated -->
          <template v-else-if="!authenticated">
            <div class="space-y-4 py-2">
              <div class="text-center">
                <UIcon name="i-lucide-lock" class="size-8 text-muted mx-auto mb-2" />
                <p class="text-sm text-muted">
                  {{ t('signInToCompare') }}
                </p>
              </div>
              <UButton :label="t('signIn')" size="sm" icon="i-lucide-log-in" block @click="handleSignIn" />
            </div>
          </template>

          <!-- Collapsed state -->
          <template v-else-if="collapsed">
            <div class="flex items-center justify-between gap-2 text-sm">
              <span class="font-bold">{{ formattedAuctionPrice }}</span>
              <VerdictBadge v-if="comparison" :verdict="comparison.verdict" size="sm" />
              <UBadge v-else-if="loading" :label="t('loading')" color="neutral" variant="soft" />
            </div>
          </template>

          <!-- Expanded state -->
          <template v-else>
            <!-- Loading state -->
            <div v-if="loading" class="flex flex-col items-center gap-3 py-4">
              <UIcon name="i-lucide-loader-2" class="size-8 text-primary animate-spin" />
              <span class="text-sm text-muted">{{ t('searchingPrices') }}</span>
            </div>

            <!-- Error state -->
            <div v-else-if="error" class="flex flex-col items-center gap-3 py-4">
              <UIcon name="i-lucide-alert-circle" class="size-8 text-error" />
              <span class="text-sm text-error">{{ error }}</span>
              <UButton :label="t('retry')" size="sm" variant="soft" @click="retry" />
            </div>

            <!-- Quota exceeded state -->
            <div v-else-if="quotaExceeded" class="flex flex-col items-center gap-3 py-4">
              <UIcon name="i-lucide-gauge" class="size-8 text-warning" />
              <span class="text-sm text-warning font-medium">{{ t('quotaExceeded') }}</span>
              <p class="text-xs text-muted text-center">{{ t('quotaExceededHint') }}</p>
              <UButton :label="t('upgradePlan')" size="sm" @click="handleSignIn" />
            </div>

            <!-- Free tier exhausted state -->
            <div v-else-if="freeExhausted" class="flex flex-col items-center gap-3 py-4">
              <UIcon name="i-lucide-gift" class="size-8 text-warning" />
              <span class="text-sm text-warning font-medium">{{ t('freeExhausted') }}</span>
              <p class="text-xs text-muted text-center">{{ t('freeExhaustedHint', { total: usage?.freeTotal || 10 }) }}</p>
              <UButton :label="t('upgradeNow')" size="sm" @click="handleSignIn" />
            </div>

            <!-- Results -->
            <div v-else-if="comparison" class="space-y-4">
              <!-- Cache status -->
              <CacheStatus
                v-if="comparison.cache"
                :source="comparison.cache.source"
                :fetched-at="comparison.cache.fetchedAt"
                :expires-at="comparison.cache.expiresAt"
                @force-refresh="handleForceRefresh"
              />

              <!-- Price comparison panel -->
              <PricePanel
                :auction-price="auctionData.totalPrice"
                :currency="auctionData.currency"
                :stats="comparison.stats"
              />

              <!-- Verdict -->
              <div class="flex items-center justify-between">
                <VerdictBadge :verdict="comparison.verdict" size="sm" />
                <ConfidenceIndicator :level="comparison.confidence" />
              </div>

              <!-- Web results -->
              <WebResultsList
                :results="comparison.results.slice(0, 3)"
                :currency="auctionData.currency"
              />
            </div>

            <!-- Initial state (no data yet) -->
            <div v-else class="flex flex-col items-center gap-3 py-4">
              <UButton icon="i-lucide-search" :label="t('comparePrices')" size="sm" @click="fetchComparison" />
            </div>
          </template>

          <!-- Footer when authenticated (shows for both subscription and free tier) -->
          <template v-if="authenticated && !collapsed" #footer>
            <!-- Quota widget -->
            <QuotaWidget v-if="usage" :usage="usage" />
          </template>
        </UCard>
      </Transition>
    </div>
  </UApp>
</template>

<style scoped>
.overlay-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 2147483647;
  max-width: 380px;
  width: 100%;
}

.overlay-enter-active,
.overlay-leave-active {
  transition: all 0.3s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>

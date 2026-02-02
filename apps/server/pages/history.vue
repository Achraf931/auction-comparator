<script setup lang="ts">
import type { SearchHistoryEntry, HistoryResponse } from '@auction-comparator/shared';

definePageMeta({
  middleware: ['auth'],
});

const { t } = useI18n();

// Filters
const filters = reactive({
  domain: '',
  compareSource: '' as '' | 'cache_strict' | 'cache_loose' | 'fresh_fetch',
  startDate: '',
  endDate: '',
});

// Pagination
const page = ref(1);
const pageSize = ref(20);

// Data
const entries = ref<SearchHistoryEntry[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref<string | null>(null);

// Unique domains for filter dropdown
const domains = ref<string[]>([]);

// Computed
const totalPages = computed(() => Math.ceil(total.value / pageSize.value));
const showingFrom = computed(() => (page.value - 1) * pageSize.value + 1);
const showingTo = computed(() => Math.min(page.value * pageSize.value, total.value));

const hasActiveFilters = computed(() => {
  return filters.domain || filters.compareSource || filters.startDate || filters.endDate;
});

async function fetchHistory() {
  loading.value = true;
  error.value = null;

  try {
    const params = new URLSearchParams();
    params.set('page', page.value.toString());
    params.set('pageSize', pageSize.value.toString());

    if (filters.domain) params.set('domain', filters.domain);
    if (filters.compareSource) params.set('compareSource', filters.compareSource);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);

    const response = await $fetch<HistoryResponse>(`/api/history?${params.toString()}`, {
      credentials: 'include',
    });

    entries.value = response.entries;
    total.value = response.total;

    // Extract unique domains
    const allDomains = new Set(response.entries.map(e => e.domain));
    if (domains.value.length === 0) {
      domains.value = Array.from(allDomains).sort();
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load history';
    console.error('[History] Error:', err);
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  page.value = 1;
  fetchHistory();
}

function clearFilters() {
  filters.domain = '';
  filters.compareSource = '';
  filters.startDate = '';
  filters.endDate = '';
  page.value = 1;
  fetchHistory();
}

function goToPage(newPage: number) {
  if (newPage >= 1 && newPage <= totalPages.value) {
    page.value = newPage;
    fetchHistory();
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(price: number | null, currency: string | null) {
  if (price === null) return '-';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(price);
}

function getSourceBadge(source: string) {
  if (source === 'fresh_fetch') {
    return { color: 'success' as const, label: t('fresh') };
  }
  return { color: 'neutral' as const, label: t('cached') };
}

function getVerdictInfo(entry: SearchHistoryEntry) {
  if (!entry.stats || entry.auctionPrice === null) return null;

  const margin = ((entry.stats.median - entry.auctionPrice) / entry.stats.median) * 100;

  if (margin > 10) {
    return { status: 'worth_it', color: 'success' as const, label: t('worthIt'), margin };
  } else if (margin < -10) {
    return { status: 'not_worth_it', color: 'error' as const, label: t('notWorthIt'), margin };
  }
  return { status: 'borderline', color: 'warning' as const, label: t('borderline'), margin };
}

function getMarginText(margin: number) {
  const absMargin = Math.abs(margin).toFixed(0);
  if (margin > 0) return `${absMargin}% ${t('belowMarket')}`;
  if (margin < 0) return `${absMargin}% ${t('aboveMarket')}`;
  return t('atMarket');
}

// Fetch initial data and all domains
onMounted(async () => {
  // First fetch without filters to get all domains
  try {
    const allResponse = await $fetch<HistoryResponse>('/api/history?pageSize=100', {
      credentials: 'include',
    });
    domains.value = [...new Set(allResponse.entries.map(e => e.domain))].sort();
  } catch {
    // Ignore, will use domains from current page
  }

  await fetchHistory();
});
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold">{{ t('searchHistory') }}</h1>
      <p class="text-gray-500 mt-1">{{ t('searchHistoryDesc') }}</p>
    </div>

    <!-- Filters -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-filter" class="w-5 h-5 text-primary-500" />
          <span class="font-semibold">{{ t('filters') }}</span>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Domain filter -->
        <div>
          <label class="block text-sm font-medium mb-1">Site</label>
          <select
            v-model="filters.domain"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
          >
            <option value="">{{ t('allSites') }}</option>
            <option v-for="domain in domains" :key="domain" :value="domain">
              {{ domain }}
            </option>
          </select>
        </div>

        <!-- Source filter -->
        <div>
          <label class="block text-sm font-medium mb-1">Source</label>
          <select
            v-model="filters.compareSource"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
          >
            <option value="">{{ t('allSources') }}</option>
            <option value="cache_strict">{{ t('fromCache') }} (strict)</option>
            <option value="cache_loose">{{ t('fromCache') }} (loose)</option>
            <option value="fresh_fetch">{{ t('freshSearch') }}</option>
          </select>
        </div>

        <!-- Start date -->
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('startDate') }}</label>
          <UInput
            v-model="filters.startDate"
            type="date"
            class="w-full"
          />
        </div>

        <!-- End date -->
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('endDate') }}</label>
          <UInput
            v-model="filters.endDate"
            type="date"
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton
            v-if="hasActiveFilters"
            variant="ghost"
            color="neutral"
            @click="clearFilters"
          >
            {{ t('clearFilters') }}
          </UButton>
          <UButton @click="applyFilters">
            {{ t('search') }}
          </UButton>
        </div>
      </template>
    </UCard>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Error -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="error"
    />

    <!-- Empty state -->
    <UCard v-else-if="entries.length === 0" class="text-center py-12">
      <UIcon name="i-lucide-search-x" class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-600 dark:text-gray-400">{{ t('noSearchesYet') }}</h3>
      <p class="text-gray-500 mt-2 max-w-md mx-auto">{{ t('noSearchesYetDesc') }}</p>
    </UCard>

    <!-- Results -->
    <template v-else>
      <!-- Results count -->
      <div class="text-sm text-gray-500">
        {{ t('showing') }} {{ showingFrom }}-{{ showingTo }} {{ t('of') }} {{ total }} {{ t('results') }}
      </div>

      <!-- Results list -->
      <div class="space-y-4">
        <UCard
          v-for="entry in entries"
          :key="entry.id"
          class="hover:shadow-md transition-shadow"
        >
          <div class="flex flex-col md:flex-row md:items-start gap-4">
            <!-- Main content -->
            <div class="flex-1 min-w-0">
              <!-- Title -->
              <h3 class="font-medium text-base truncate" :title="entry.rawTitle">
                {{ entry.rawTitle }}
              </h3>

              <!-- Meta info -->
              <div class="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500">
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-globe" class="w-4 h-4" />
                  {{ entry.domain }}
                </span>
                <span class="text-gray-300 dark:text-gray-600">•</span>
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-calendar" class="w-4 h-4" />
                  {{ formatDate(entry.createdAt) }}
                </span>
                <UBadge
                  :color="getSourceBadge(entry.compareSource).color"
                  variant="soft"
                  size="sm"
                >
                  {{ getSourceBadge(entry.compareSource).label }}
                </UBadge>
              </div>

              <!-- Normalized title if different -->
              <p
                v-if="entry.normalizedTitle && entry.normalizedTitle !== entry.rawTitle"
                class="text-sm text-gray-500 mt-2 italic"
              >
                → {{ entry.normalizedTitle }}
              </p>
            </div>

            <!-- Price info -->
            <div class="flex flex-col items-end gap-2 shrink-0">
              <!-- Auction price -->
              <div class="text-right">
                <div class="text-xs text-gray-500">{{ t('auctionPrice') }}</div>
                <div class="text-lg font-bold">
                  {{ formatPrice(entry.auctionPrice, entry.currency) }}
                </div>
              </div>

              <!-- Market stats -->
              <div v-if="entry.stats" class="text-right">
                <div class="text-xs text-gray-500">{{ t('marketPrice') }}</div>
                <div class="flex items-center gap-2 text-sm">
                  <span class="text-gray-500">{{ t('median') }}:</span>
                  <span class="font-medium">{{ formatPrice(entry.stats.median, entry.currency) }}</span>
                </div>
                <div class="flex items-center gap-3 text-xs text-gray-500">
                  <span>{{ t('min') }}: {{ formatPrice(entry.stats.min, entry.currency) }}</span>
                  <span>{{ t('max') }}: {{ formatPrice(entry.stats.max, entry.currency) }}</span>
                </div>
              </div>

              <!-- Verdict -->
              <div v-if="getVerdictInfo(entry)" class="mt-2">
                <UBadge
                  :color="getVerdictInfo(entry)!.color"
                  variant="subtle"
                >
                  {{ getVerdictInfo(entry)!.label }}
                </UBadge>
                <div class="text-xs text-gray-500 mt-1">
                  {{ getMarginText(getVerdictInfo(entry)!.margin) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <template #footer>
            <div class="flex items-center justify-end gap-2">
              <UButton
                v-if="entry.lotUrl"
                variant="ghost"
                color="neutral"
                size="sm"
                icon="i-lucide-external-link"
                :href="entry.lotUrl"
                target="_blank"
              >
                {{ t('openAuction') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
        <UButton
          variant="soft"
          color="neutral"
          :disabled="page === 1"
          @click="goToPage(page - 1)"
        >
          {{ t('previous') }}
        </UButton>

        <div class="flex items-center gap-1">
          <template v-for="p in totalPages" :key="p">
            <UButton
              v-if="p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)"
              :variant="p === page ? 'solid' : 'ghost'"
              :color="p === page ? 'primary' : 'neutral'"
              size="sm"
              @click="goToPage(p)"
            >
              {{ p }}
            </UButton>
            <span
              v-else-if="p === page - 2 || p === page + 2"
              class="px-2 text-gray-400"
            >
              ...
            </span>
          </template>
        </div>

        <UButton
          variant="soft"
          color="neutral"
          :disabled="page === totalPages"
          @click="goToPage(page + 1)"
        >
          {{ t('next') }}
        </UButton>
      </div>
    </template>
  </div>
</template>

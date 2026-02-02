<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import type { Currency, WebPriceResult } from '@auction-comparator/shared'
import { formatPrice } from '@auction-comparator/shared'

const { t } = useI18n()

const props = defineProps<{
  results: WebPriceResult[];
  currency: Currency;
}>()

function openUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function formatRelevance(score: number): string {
  return `${Math.round(score * 100)}%`
}
</script>

<template>
  <div class="space-y-2">
    <div class="text-xs font-medium flex items-center gap-1">
      <UIcon name="i-lucide-shopping-cart" class="size-3.5" />
      {{ t('topWebListings') }}
    </div>

    <div class="space-y-2">
      <div
        v-for="(result, index) in results"
        :key="index"
        class="flex items-start gap-2 p-2 rounded-lg bg-elevated/5 hover:bg-elevated/10 cursor-pointer transition-colors"
        @click="openUrl(result.url)"
      >
        <!-- Thumbnail -->
        <div class="shrink-0">
          <img
            v-if="result.thumbnail"
            :src="result.thumbnail"
            :alt="result.title"
            class="size-12 object-cover rounded"
          >
          <div
            v-else
            class="size-12 bg-elevated/50 rounded flex items-center justify-center"
          >
            <UIcon name="i-lucide-image" class="size-6 text-muted" />
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate" :title="result.title">
            {{ result.title }}
          </div>
          <div class="flex items-center justify-between mt-1">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-success">
                {{ formatPrice(result.price, currency) }}
              </span>
              <span class="text-xs text-muted line-clamp-1">{{ result.source }}</span>
            </div>
            <UBadge
              v-if="result.relevanceScore >= 0.7"
              :label="`${formatRelevance(result.relevanceScore)} ${t('match')}`"
              color="primary"
              variant="subtle"
              size="xs"
              class="whitespace-nowrap"
            />
          </div>
          <div
            v-if="result.shippingIncluded"
            class="text-xs text-muted mt-1"
          >
            {{ t('freeShipping') }}
          </div>
        </div>

        <!-- External link icon -->
        <UIcon
          name="i-lucide-external-link"
          class="size-4 text-muted shrink-0"
        />
      </div>
    </div>
  </div>
</template>

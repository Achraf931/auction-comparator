<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Currency, PriceStats } from '@auction-comparator/shared'
import { formatPrice } from '@auction-comparator/shared'

const { t } = useI18n()

const props = defineProps<{
  auctionPrice: number;
  currency: Currency;
  stats: PriceStats;
}>()

const formattedAuction = computed(() => formatPrice(props.auctionPrice, props.currency))
const formattedMin = computed(() => formatPrice(props.stats.min, props.currency))
const formattedMedian = computed(() => formatPrice(props.stats.median, props.currency))
const formattedMax = computed(() => formatPrice(props.stats.max, props.currency))

const savingsPercent = computed(() => {
  if (props.stats.min === 0) return 0
  return Math.round(((props.stats.min - props.auctionPrice) / props.stats.min) * 100)
})

const savingsClass = computed(() => {
  if (savingsPercent.value > 10) return 'text-emerald-600 dark:text-emerald-400'
  if (savingsPercent.value > 0) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
})
</script>

<template>
  <div class="space-y-3">
    <!-- Auction price -->
    <div class="flex items-center justify-between">
      <span class="text-sm">{{ t('auctionTotal') }}</span>
      <span class="font-bold text-lg">{{ formattedAuction }}</span>
    </div>

    <!-- Divider -->
    <div class="h-px bg-elevated/10" />

    <!-- Web prices -->
    <div class="grid grid-cols-3 gap-2 text-center">
      <div>
        <div class="text-xs mb-1">
          {{ t('webMin') }}
        </div>
        <div class="font-semibold text-success">
          {{ formattedMin }}
        </div>
      </div>
      <div>
        <div class="text-xs mb-1">
          {{ t('median') }}
        </div>
        <div class="font-semibold">
          {{ formattedMedian }}
        </div>
      </div>
      <div>
        <div class="text-xs mb-1">
          {{ t('webMax') }}
        </div>
        <div class="font-semibold">
          {{ formattedMax }}
        </div>
      </div>
    </div>

    <!-- Savings indicator -->
    <div class="flex items-center justify-center gap-2 py-2 bg-elevated rounded-lg">
      <UIcon
        :name="savingsPercent > 0 ? 'i-lucide-trending-down' : 'i-lucide-trending-up'"
        :class="savingsClass"
        class="size-5"
      />
      <span :class="savingsClass" class="font-semibold">
        {{ savingsPercent > 0 ? t('save') : t('pay') }}
        {{ Math.abs(savingsPercent) }}%
        {{ t('vsWebMin') }}
      </span>
    </div>

    <!-- Results count -->
    <div class="text-xs text-center text-muted">
      {{ t('basedOn', { count: stats.count }) }}
    </div>
  </div>
</template>

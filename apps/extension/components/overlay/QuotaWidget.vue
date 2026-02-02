<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { UsageResponse } from '@auction-comparator/shared'

const { t } = useI18n()

const props = defineProps<{
  usage: UsageResponse
}>()

// Check if user has subscription (quota > 0 and a plan)
const hasSubscription = computed(() => {
  return props.usage.hasSubscription === true || (props.usage.quota > 0 && props.usage.plan !== 'starter')
})

// Free tier calculations
const freeRemaining = computed(() => props.usage.freeRemaining ?? 0)
const freeTotal = computed(() => props.usage.freeTotal ?? 10)
const freeUsed = computed(() => props.usage.freeUsed ?? 0)
const freePercent = computed(() => {
  if (freeTotal.value === 0) return 100
  return Math.round((freeUsed.value / freeTotal.value) * 100)
})
const freeExhausted = computed(() => freeRemaining.value <= 0)

// Subscription quota calculations
const usagePercent = computed(() => {
  if (!props.usage.quota) return 0
  return Math.min(100, Math.round((props.usage.freshFetchCount / props.usage.quota) * 100))
})

const isLow = computed(() => usagePercent.value >= 80)
const isExhausted = computed(() => props.usage.freshFetchCount >= props.usage.quota)

const progressColor = computed(() => {
  if (hasSubscription.value) {
    if (isExhausted.value) return 'error'
    if (isLow.value) return 'warning'
    return 'primary'
  } else {
    if (freeExhausted.value) return 'error'
    if (freeRemaining.value <= 3) return 'warning'
    return 'success'
  }
})

const planLabel = computed(() => {
  if (!hasSubscription.value) return t('freeTrial')
  const { plan } = props.usage
  return plan.charAt(0).toUpperCase() + plan.slice(1)
})
</script>

<template>
  <div class="space-y-1">
    <!-- Free tier display (no subscription) -->
    <template v-if="!hasSubscription">
      <div class="flex items-center justify-between text-xs">
        <span class="text-muted flex items-center gap-1">
          <UIcon name="i-lucide-gift" class="size-3" />
          {{ t('freeTrial') }}
        </span>
        <span :class="freeExhausted ? 'text-error' : freeRemaining <= 3 ? 'text-warning' : 'text-success'">
          {{ freeRemaining }} / {{ freeTotal }}
        </span>
      </div>
      <UProgress :model-value="freePercent" :color="progressColor" size="xs" :ui="{ base: 'bg-elevated/50' }" />
      <div class="text-xs text-muted">
        {{ t('freeSearchesRemaining', { count: freeRemaining }) }}
      </div>
    </template>

    <!-- Subscription quota display -->
    <template v-else>
      <div class="flex items-center justify-between text-xs">
        <span class="text-muted">{{ t('freshFetches') }}</span>
        <span :class="isExhausted ? 'text-error' : isLow ? 'text-warning' : 'text-muted'">
          {{ usage.freshFetchCount }} / {{ usage.quota }}
        </span>
      </div>
      <UProgress :model-value="usagePercent" :color="progressColor" size="xs" :ui="{ base: 'bg-elevated/50' }" />
      <div class="flex items-center justify-between text-xs text-muted">
        <span>{{ planLabel }}</span>
        <span v-if="usage.daysRemaining > 0">{{ t('daysRemaining', { days: usage.daysRemaining }) }}</span>
      </div>
    </template>
  </div>
</template>

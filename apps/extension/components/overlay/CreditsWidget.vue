<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  balance: number
  freeAvailable: boolean
}>()

const hasCredits = computed(() => props.balance > 0 || props.freeAvailable)

const displayBalance = computed(() => {
  if (props.freeAvailable && props.balance === 0) {
    return '1' // Show 1 for the free credit
  }
  return String(props.balance)
})

const statusColor = computed(() => {
  if (props.balance === 0 && !props.freeAvailable) return 'error'
  if (props.balance <= 2) return 'warning'
  return 'success'
})
</script>

<template>
  <div class="flex items-center justify-between text-xs">
    <span class="text-muted flex items-center gap-1">
      <UIcon name="i-lucide-coins" class="size-3" />
      {{ t('credits') }}
    </span>
    <span :class="[
      hasCredits ? 'text-success' : 'text-error',
      statusColor === 'warning' && 'text-warning'
    ]">
      {{ displayBalance }}
      <span v-if="freeAvailable && balance === 0" class="text-muted">({{ t('freeCredit') }})</span>
    </span>
  </div>
  <div v-if="!hasCredits" class="text-xs text-error mt-1">
    {{ t('noCreditsRemaining') }}
  </div>
</template>

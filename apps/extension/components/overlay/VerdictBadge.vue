<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Verdict } from '@auction-comparator/shared'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    verdict: Verdict;
    size?: 'xs' | 'sm' | 'md';
  }>(),
  {
    size: 'md',
  }
)

const config = computed(() => {
  switch (props.verdict.status) {
    case 'worth_it':
      return {
        icon: 'i-lucide-check-circle',
        color: 'success' as const,
        labelKey: 'worthIt',
      }
    case 'borderline':
      return {
        icon: 'i-lucide-alert-circle',
        color: 'warning' as const,
        labelKey: 'borderline',
      }
    case 'not_worth_it':
      return {
        icon: 'i-lucide-x-circle',
        color: 'error' as const,
        labelKey: 'notWorthIt',
      }
  }
})
</script>

<template>
  <UBadge :label="t(config.labelKey)" :icon="config.icon" :color="config.color" variant="subtle" :size />
</template>

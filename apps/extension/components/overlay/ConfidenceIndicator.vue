<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ConfidenceLevel } from '@auction-comparator/shared'

const { t } = useI18n()

const props = defineProps<{
  level: ConfidenceLevel;
}>()

const config = computed(() => {
  switch (props.level) {
    case 'high':
      return {
        bars: 3,
        color: 'bg-emerald-500',
        labelKey: 'highConfidence',
      }
    case 'medium':
      return {
        bars: 2,
        color: 'bg-amber-500',
        labelKey: 'mediumConfidence',
      }
    case 'low':
      return {
        bars: 1,
        color: 'bg-red-500',
        labelKey: 'lowConfidence',
      }

    default:
      return {
        bars: 0,
        color: 'bg-zinc-300 dark:bg-zinc-600',
        labelKey: 'noConfidenceData',
      }
  }
})
</script>

<template>
  <div class="tooltip-wrapper">
    <div class="flex items-end gap-0.5 h-4 cursor-help">
      <div
        v-for="i in 3"
        :key="i"
        class="w-1 rounded-sm transition-colors"
        :class="[
          i <= config.bars ? config.color : 'bg-zinc-300 dark:bg-zinc-600',
          i === 1 ? 'h-1.5' : i === 2 ? 'h-2.5' : 'h-4'
        ]"
      />
    </div>
    <span class="tooltip-text">{{ t(config.labelKey) }}</span>
  </div>
</template>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-block;
}

.tooltip-text {
  visibility: hidden;
  opacity: 0;
  position: absolute;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  background-color: #1f2937;
  color: white;
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 10;
  transition: opacity 0.2s, visibility 0.2s;
}

.tooltip-text::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 4px;
  border-style: solid;
  border-color: #1f2937 transparent transparent transparent;
}

.tooltip-wrapper:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}
</style>

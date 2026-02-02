<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CompareSource } from '@auction-comparator/shared'

const { t } = useI18n()

const props = defineProps<{
  source: CompareSource
  fetchedAt?: number
  expiresAt?: number
}>()

const emit = defineEmits<{
  forceRefresh: []
}>()

const isCached = computed(() => props.source !== 'fresh_fetch')

const sourceLabel = computed(() => {
  switch (props.source) {
    case 'cache_strict':
      return t('cacheStrict')
    case 'cache_loose':
      return t('cacheLoose')
    case 'fresh_fetch':
      return t('freshFetch')
    default:
      return props.source
  }
})

const expiresIn = computed(() => {
  if (!props.expiresAt) return null
  const now = Date.now()
  const diff = props.expiresAt - now
  if (diff <= 0) return t('expired')

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return t('expiresInHours', { hours })
  }
  return t('expiresInMinutes', { minutes })
})

const fetchedAgo = computed(() => {
  if (!props.fetchedAt) return null
  const now = Date.now()
  const diff = now - props.fetchedAt

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return t('fetchedHoursAgo', { hours })
  }
  if (minutes > 0) {
    return t('fetchedMinutesAgo', { minutes })
  }
  return t('fetchedJustNow')
})
</script>

<template>
  <div class="flex items-center justify-between text-xs">
    <div class="flex items-center gap-1.5">
      <UIcon
        :name="isCached ? 'i-lucide-database' : 'i-lucide-globe'"
        :class="isCached ? 'text-success' : 'text-info'"
        class="size-3.5"
      />
      <span class="text-muted">
        {{ t('source') }}: <span :class="isCached ? 'text-success' : 'text-info'">{{ sourceLabel }}</span>
      </span>
    </div>

    <div class="flex items-center gap-2">
      <span v-if="expiresIn" class="text-muted">{{ expiresIn }}</span>
      <UButton
        v-if="isCached"
        icon="i-lucide-refresh-cw"
        size="2xs"
        variant="ghost"
        color="neutral"
        :title="t('forceRefreshHint')"
        @click="emit('forceRefresh')"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
defineEmits<{
  click: [];
}>()
</script>

<template>
  <UButton
    icon="i-lucide-settings"
    variant="ghost"
    color="neutral"
    size="xs"
    @click="$emit('click')"
  />
</template>

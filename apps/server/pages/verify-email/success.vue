<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <div class="max-w-md mx-auto text-center py-16">
    <div class="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
      <UIcon name="i-lucide-check-circle" class="w-10 h-10 text-green-500" />
    </div>
    <h1 class="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
      {{ t('emailVerifiedSuccess') }}
    </h1>
    <p class="text-zinc-600 dark:text-zinc-400 mb-8">
      {{ t('emailVerifiedSuccessDesc') }}
    </p>
    <UButton to="/account" size="lg">
      {{ t('goToAccount') }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();

const reason = computed(() => route.query.reason as string | undefined);
const errorMessage = computed(() => {
  if (reason.value === 'missing_token') return t('emailVerificationMissing');
  return t('emailVerificationExpired');
});
</script>

<template>
  <div class="max-w-md mx-auto text-center py-16">
    <div class="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
      <UIcon name="i-lucide-x-circle" class="w-10 h-10 text-red-500" />
    </div>
    <h1 class="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
      {{ t('emailVerificationError') }}
    </h1>
    <p class="text-zinc-600 dark:text-zinc-400 mb-8">
      {{ errorMessage }}
    </p>
    <div class="flex gap-3 justify-center">
      <UButton to="/account" variant="soft">
        {{ t('goToAccount') }}
      </UButton>
    </div>
  </div>
</template>

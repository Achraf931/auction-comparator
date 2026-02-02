<script setup lang="ts">
const { t, locale, setLocale } = useI18n();
const { state } = useAuth();

const localeOptions = [
  { value: 'en', label: 'EN' },
  { value: 'fr', label: 'FR' },
];

const isAuthenticated = computed(() => !!state.value.user);
</script>

<template>
  <div class="min-h-screen bg-default">
    <!-- Header with navigation -->
    <header class="border-b border-default">
      <div class="container mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-6">
          <NuxtLink to="/" class="flex items-center gap-2">
            <UIcon name="i-lucide-scale" class="w-6 h-6 text-primary-500" />
            <span class="font-semibold">Auction Comparator</span>
          </NuxtLink>

          <!-- Navigation links for authenticated users -->
          <nav v-if="isAuthenticated" class="hidden sm:flex items-center gap-4">
            <NuxtLink
              to="/account"
              class="text-sm text-zinc-600 dark:text-zinc-400 hover:text-primary-500 transition-colors"
              active-class="text-primary-500 font-medium"
            >
              {{ t('account') }}
            </NuxtLink>
            <NuxtLink
              to="/history"
              class="text-sm text-zinc-600 dark:text-zinc-400 hover:text-primary-500 transition-colors"
              active-class="text-primary-500 font-medium"
            >
              {{ t('history') }}
            </NuxtLink>
          </nav>
        </div>

        <div class="flex items-center gap-3">
          <!-- Language selector -->
          <div class="flex items-center gap-1">
            <button
              v-for="opt in localeOptions"
              :key="opt.value"
              class="px-3 py-1 text-sm rounded-md transition-colors"
              :class="locale === opt.value
                ? 'bg-primary-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'"
              @click="setLocale(opt.value as 'en' | 'fr')"
            >
              {{ opt.label }}
            </button>
          </div>

          <!-- Auth buttons for non-authenticated users -->
          <div v-if="!isAuthenticated" class="hidden sm:flex items-center gap-2">
            <NuxtLink to="/login">
              <UButton variant="ghost" color="neutral" size="sm">
                {{ t('signIn') }}
              </UButton>
            </NuxtLink>
            <NuxtLink to="/register">
              <UButton size="sm">
                {{ t('signUp') }}
              </UButton>
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <div class="container mx-auto px-4 py-8">
      <slot />
    </div>
  </div>
</template>

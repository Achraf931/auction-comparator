<script setup lang="ts">
definePageMeta({
  middleware: ['guest'],
});

const route = useRoute();
const { register, state } = useAuth();
const { t } = useI18n();

// Check if opened from extension
const extensionId = computed(() => route.query.ext as string | undefined);
const extensionConnected = ref(false);

const form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
});

const loading = ref(false);

const passwordError = computed(() => {
  if (form.password && form.password.length < 8) {
    return t('passwordMinLength');
  }
  if (form.confirmPassword && form.password !== form.confirmPassword) {
    return t('passwordsNoMatch');
  }
  return undefined;
});

async function handleSubmit() {
  if (passwordError.value) return;

  loading.value = true;
  const result = await register(form.email, form.password);
  loading.value = false;

  if (result.success) {
    // If from extension, show success message
    if (extensionId.value) {
      extensionConnected.value = true;
    } else {
      // Force a clean navigation with the new session cookie
      // This ensures the middleware sees the authenticated state
      reloadNuxtApp({ path: '/account' });
    }
  }
}
</script>

<template>
  <div class="max-w-md mx-auto">
    <!-- Extension Connected Success -->
    <UCard v-if="extensionConnected">
      <div class="text-center py-8">
        <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <UIcon name="i-lucide-check-circle" class="w-8 h-8 text-green-500" />
        </div>
        <h1 class="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">{{ t('accountCreated') }}</h1>
        <p class="text-zinc-600 dark:text-zinc-400 mb-6">
          {{ t('extensionNowConnected') }} {{ t('canCloseTab') }}
        </p>
        <div class="flex gap-3 justify-center">
          <UButton
            to="/account"
            variant="soft"
          >
            {{ t('goToAccount') }}
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Register Form -->
    <UCard v-else>
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold">{{ t('createAccount') }}</h1>
          <p class="text-sm text-zinc-500 mt-1">
            {{ extensionId ? t('createToConnect') : t('getStartedWithApp') }}
          </p>
        </div>
      </template>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <UFormField :label="t('email')" name="email">
          <UInput
            v-model="form.email"
            type="email"
            placeholder="you@example.com"
            required
            autocomplete="email"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('password')" name="password" :error="form.password && passwordError ? passwordError : undefined">
          <UInput
            v-model="form.password"
            type="password"
            :placeholder="t('passwordMinLength')"
            required
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('confirmPassword')" name="confirmPassword">
          <UInput
            v-model="form.confirmPassword"
            type="password"
            :placeholder="t('confirmPassword')"
            required
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>

        <UAlert
          v-if="state.error"
          color="error"
          variant="soft"
          :title="state.error"
        />

        <UButton
          type="submit"
          block
          :loading="loading"
          :disabled="!!passwordError"
        >
          {{ extensionId ? t('createConnectExtension') : t('createAccount') }}
        </UButton>
      </form>

      <template #footer>
        <p class="text-center text-sm text-zinc-500">
          {{ t('alreadyHaveAccount') }}
          <NuxtLink :to="extensionId ? `/login?ext=${extensionId}` : '/login'" class="text-primary-500 hover:underline">
            {{ t('signIn') }}
          </NuxtLink>
        </p>
      </template>
    </UCard>
  </div>
</template>

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
const registrationComplete = ref(false);

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
      // Show email verification message
      registrationComplete.value = true;
    }
  }
}

const resendLoading = ref(false);
const resendSuccess = ref(false);

async function handleResendVerification() {
  resendLoading.value = true;
  resendSuccess.value = false;
  try {
    await $fetch('/api/auth/resend-verification', {
      method: 'POST',
      credentials: 'include',
    });
    resendSuccess.value = true;
  } catch (error) {
    console.error('Failed to resend verification:', error);
  } finally {
    resendLoading.value = false;
  }
}
</script>

<template>
  <div class="max-w-md mx-auto">
    <!-- Registration Complete - Verify Email -->
    <UCard v-if="registrationComplete">
      <div class="text-center py-8">
        <div class="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <UIcon name="i-lucide-mail-check" class="w-8 h-8 text-primary-500" />
        </div>
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{{ t('checkYourEmail') }}</h1>
        <p class="text-zinc-600 dark:text-zinc-400 mb-6">
          {{ t('verifyEmailDesc') }}
        </p>

        <UAlert
          v-if="resendSuccess"
          color="success"
          variant="soft"
          :title="t('verificationEmailSent')"
          class="mb-4"
        />

        <div class="flex flex-col gap-3">
          <UButton
            variant="soft"
            :loading="resendLoading"
            @click="handleResendVerification"
          >
            {{ t('resendVerificationEmail') }}
          </UButton>
          <UButton
            to="/account"
            variant="ghost"
            color="neutral"
          >
            {{ t('goToAccount') }}
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Extension Connected Success -->
    <UCard v-else-if="extensionConnected">
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

    <!-- Register Form (no v-if/v-else-if matched above) -->
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

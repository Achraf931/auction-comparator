<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { UserInfo } from '@auction-comparator/shared'
import ColorModeButton from '@/components/ColorModeButton.vue'
import { useSettings } from '@/composables/useSettings'
import { checkAuth, openLogin, logout } from '@/utils/messaging'
import { setLocale, getStoredLocaleAsync, i18n } from '@/utils/i18n'

const { t } = useI18n()

const { settings, loading, loadSettings, toggleEnabled, setApiBase, setMarginPercent, toggleDomainEnabled } = useSettings()

const apiBaseInput = ref('')
const marginInput = ref(10)
const currentDomain = ref('')

// Auth state
const authLoading = ref(true)
const authenticated = ref(false)
const user = ref<UserInfo | null>(null)

// Language state
const currentLocale = ref<'en' | 'fr'>('fr')
const localeOptions = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
]

function changeLocale(newLocale: 'en' | 'fr') {
  setLocale(newLocale)
  currentLocale.value = newLocale
  i18n.global.locale.value = newLocale
}

const isDomainEnabled = computed(() => {
  if (!settings.value || !currentDomain.value) return true
  return !settings.value.disabledDomains.includes(currentDomain.value)
})

async function handleApiBaseChange() {
  if (apiBaseInput.value && apiBaseInput.value !== settings.value?.apiBase) {
    await setApiBase(apiBaseInput.value)
  }
}

async function handleMarginChange() {
  if (marginInput.value !== settings.value?.marginPercent) {
    await setMarginPercent(marginInput.value)
  }
}

async function checkAuthStatus() {
  authLoading.value = true
  try {
    const result = await checkAuth()
    authenticated.value = result.authenticated
    user.value = result.user ?? null
  } catch {
    authenticated.value = false
    user.value = null
  } finally {
    authLoading.value = false
  }
}

async function handleSignIn() {
  await openLogin()
  window.close()
}

async function handleLogout() {
  await logout()
  authenticated.value = false
  user.value = null
}

onMounted(async () => {
  // Load stored locale from chrome.storage and sync with i18n
  currentLocale.value = await getStoredLocaleAsync()
  i18n.global.locale.value = currentLocale.value

  await Promise.all([loadSettings(), checkAuthStatus()])
  if (settings.value) {
    apiBaseInput.value = settings.value.apiBase
    marginInput.value = settings.value.marginPercent
  }

  // Get current tab domain
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.url) {
      const url = new URL(tab.url)
      currentDomain.value = url.hostname
    }
  } catch {
    // Ignore errors getting current tab
  }
})
</script>

<template>
  <UApp>
    <UCard class="w-80">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-scale" class="size-5 text-primary" />
            <span class="font-semibold">Auction Comparator</span>
          </div>
          <ColorModeButton size="xs" />
        </div>
      </template>

      <!-- Loading state -->
      <div v-if="loading" class="flex items-center justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary-500" />
      </div>

      <!-- Settings -->
      <div v-else-if="settings" class="space-y-4">
        <!-- Enable/disable toggle -->
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-sm">
              {{ t('extensionEnabled') }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ t('extensionEnabledDesc') }}
            </div>
          </div>
          <USwitch v-model="settings.enabled" @update:model-value="toggleEnabled" />
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700" />

        <!-- Current domain toggle -->
        <div v-if="currentDomain" class="flex items-center justify-between">
          <div>
            <div class="font-medium text-sm">
              {{ t('enableForSite', { domain: currentDomain }) }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ t('showOverlayOnSite') }}
            </div>
          </div>
          <USwitch
            :model-value="isDomainEnabled"
            @update:model-value="toggleDomainEnabled(currentDomain)"
          />
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700" />

        <!-- API Base URL -->
        <div class="space-y-2">
          <label class="text-sm font-medium">{{ t('apiServer') }}</label>
          <UInput
            v-model="apiBaseInput"
            placeholder="http://localhost:3001"
            size="sm"
            @blur="handleApiBaseChange"
          />
        </div>

        <!-- Margin percentage -->
        <div class="space-y-2">
          <label class="text-sm font-medium">
            {{ t('marginThreshold', { percent: marginInput }) }}
          </label>
          <input
            v-model.number="marginInput"
            type="range"
            :min="5"
            :max="30"
            :step="5"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-500"
            @change="handleMarginChange"
          >
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ t('marginThresholdDesc') }}
          </div>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700" />

        <!-- Language selector -->
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-sm">{{ t('language') }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ t('languageDesc') }}
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button
              v-for="opt in localeOptions"
              :key="opt.value"
              class="px-3 py-1 text-sm rounded-md transition-colors"
              :class="currentLocale === opt.value
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'"
              @click="changeLocale(opt.value as 'en' | 'fr')"
            >
              {{ opt.value.toUpperCase() }}
            </button>
          </div>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700" />

        <!-- Account section -->
        <div class="space-y-2">
          <div class="text-sm font-medium">{{ t('account') }}</div>

          <!-- Loading -->
          <div v-if="authLoading" class="flex items-center gap-2 text-sm text-gray-500">
            <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <span>{{ t('checking') }}</span>
          </div>

          <!-- Not authenticated -->
          <div v-else-if="!authenticated" class="space-y-2">
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ t('signInToCompare') }}
            </p>
            <UButton
              :label="t('signIn')"
              icon="i-lucide-log-in"
              size="sm"
              block
              @click="handleSignIn"
            />
          </div>

          <!-- Authenticated -->
          <div v-else class="space-y-2">
            <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <UIcon name="i-lucide-user" class="w-4 h-4 text-primary" />
              <span class="truncate">{{ user?.email }}</span>
            </div>
            <UButton
              :label="t('signOut')"
              icon="i-lucide-log-out"
              variant="soft"
              color="neutral"
              size="sm"
              block
              @click="handleLogout"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="text-xs text-gray-500 dark:text-gray-400 text-center">
          v0.0.1 • {{ t('poweredBy') }}
        </div>
      </template>
    </UCard>
  </UApp>
</template>

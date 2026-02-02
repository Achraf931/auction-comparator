<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { UserInfo } from '@auction-comparator/shared'
import ColorModeButton from '@/components/ColorModeButton.vue'
import { useSettings } from '@/composables/useSettings'
import { checkAuth, openLogin, logout } from '@/utils/messaging'
import { setLocale, getStoredLocaleAsync, i18n } from '@/utils/i18n'
import { SUPPORTED_SITES, getSiteByUrl, type SiteConfig } from '@/utils/sites'
import { hasSitePermission, requestSitePermission, getCurrentTabInfo, enableSiteOnCurrentTab } from '@/utils/permissions'
import { enableSite, disableSite, showOnOrigin, isOriginHidden } from '@/utils/storage'

const { t } = useI18n()

const { settings, loading, loadSettings, updateSettings, setApiBase, setMarginPercent, toggleDomainEnabled } = useSettings()

async function handleToggleEnabled(enabled: boolean) {
  await updateSettings({ enabled })

  // Handle show/hide overlay on current tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      if (enabled) {
        // Re-enabling: reload the tab to show overlay
        chrome.tabs.reload(tab.id)
      } else {
        // Disabling: send message to remove overlay
        chrome.tabs.sendMessage(tab.id, {
          type: 'EXTENSION_TOGGLED',
          enabled: false
        }).catch(() => {
          // Tab might not have content script, ignore
        })
      }
    }
  } catch {
    // Ignore errors
  }
}

const apiBaseInput = ref('')
const marginInput = ref(10)
const currentDomain = ref('')
const currentOrigin = ref('')

// Auth state
const authLoading = ref(true)
const authenticated = ref(false)
const user = ref<UserInfo | null>(null)

// Sites state
const sitePermissions = ref<Map<string, boolean>>(new Map())
const currentSite = ref<SiteConfig | null>(null)
const currentSiteHasPermission = ref(false)
const isCurrentOriginHidden = ref(false)
const sitesLoading = ref(true)

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

async function loadSitePermissions() {
  sitesLoading.value = true
  try {
    const permissions = new Map<string, boolean>()
    for (const site of SUPPORTED_SITES) {
      const hasPermission = await hasSitePermission(site)
      permissions.set(site.id, hasPermission)
    }
    sitePermissions.value = permissions
  } finally {
    sitesLoading.value = false
  }
}

async function handleRequestSitePermission(site: SiteConfig) {
  const granted = await requestSitePermission(site)
  if (granted) {
    sitePermissions.value.set(site.id, true)
    await enableSite(site.id)
    // Refresh to update UI
    sitePermissions.value = new Map(sitePermissions.value)
  }
}

async function handleEnableCurrentSite() {
  if (!currentSite.value) return
  const result = await enableSiteOnCurrentTab()
  if (result.success) {
    currentSiteHasPermission.value = true
    sitePermissions.value.set(currentSite.value.id, true)
    await enableSite(currentSite.value.id)
    sitePermissions.value = new Map(sitePermissions.value)
    // Reload the tab to activate the content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      chrome.tabs.reload(tab.id)
      window.close()
    }
  }
}

async function handleShowOnOrigin() {
  if (!currentOrigin.value) return
  await showOnOrigin(currentOrigin.value)
  isCurrentOriginHidden.value = false
  // Reload the tab to show the overlay
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id) {
    chrome.tabs.reload(tab.id)
    window.close()
  }
}

onMounted(async () => {
  // Load stored locale from chrome.storage and sync with i18n
  currentLocale.value = await getStoredLocaleAsync()
  i18n.global.locale.value = currentLocale.value

  await Promise.all([loadSettings(), checkAuthStatus(), loadSitePermissions()])
  if (settings.value) {
    apiBaseInput.value = settings.value.apiBase
    marginInput.value = settings.value.marginPercent
  }

  // Get current tab info
  try {
    const tabInfo = await getCurrentTabInfo()
    if (tabInfo.url) {
      const url = new URL(tabInfo.url)
      currentDomain.value = url.hostname
      currentOrigin.value = tabInfo.origin || ''
      currentSite.value = tabInfo.site
      currentSiteHasPermission.value = tabInfo.hasPermission
      isCurrentOriginHidden.value = tabInfo.origin ? await isOriginHidden(tabInfo.origin) : false
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
            <div class="text-xs text-zinc-500 dark:text-zinc-400">
              {{ t('extensionEnabledDesc') }}
            </div>
          </div>
          <USwitch :model-value="settings.enabled" @update:model-value="handleToggleEnabled" />
        </div>

        <div class="border-t border-zinc-200 dark:border-zinc-700" />

        <!-- Current site status -->
        <div v-if="currentSite" class="space-y-2">
          <div class="font-medium text-sm">
            {{ t('currentSite') }}
          </div>
          <div class="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <UIcon :name="currentSite.icon" class="size-5 text-primary" />
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">
                {{ currentSite.label }}
              </div>
              <div class="text-xs text-muted truncate">
                {{ currentDomain }}
              </div>
            </div>
            <div v-if="currentSiteHasPermission && !isCurrentOriginHidden">
              <UIcon name="i-lucide-check-circle" class="size-5 text-success" />
            </div>
            <div v-else-if="isCurrentOriginHidden">
              <UIcon name="i-lucide-eye-off" class="size-5 text-muted" />
            </div>
          </div>

          <!-- Enable button if no permission -->
          <UButton
            v-if="!currentSiteHasPermission"
            :label="t('enableOnThisSite')"
            icon="i-lucide-shield-check"
            size="sm"
            block
            @click="handleEnableCurrentSite"
          />

          <!-- Show button if hidden -->
          <UButton
            v-else-if="isCurrentOriginHidden"
            :label="t('showOnThisSite')"
            icon="i-lucide-eye"
            size="sm"
            variant="soft"
            block
            @click="handleShowOnOrigin"
          />
        </div>

        <!-- Not a supported site -->
        <div v-else-if="currentDomain" class="space-y-2">
          <div class="font-medium text-sm">
            {{ t('currentSite') }}
          </div>
          <div class="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <UIcon name="i-lucide-globe" class="size-5 text-muted" />
            <div class="flex-1">
              <div class="text-sm text-zinc-500 truncate">
                {{ currentDomain }}
              </div>
              <div class="text-xs text-zinc-400">
                {{ t('notSupported') }}
              </div>
            </div>
          </div>
        </div>

        <div class="border-t border-zinc-200 dark:border-zinc-700" />

        <!-- Supported Sites -->
        <div class="space-y-2">
          <div class="font-medium text-sm">
            {{ t('supportedSites') }}
          </div>
          <div v-if="sitesLoading" class="flex justify-center py-2">
            <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin text-primary" />
          </div>
          <div v-else class="space-y-1 max-h-32 overflow-y-auto">
            <div
              v-for="site in SUPPORTED_SITES"
              :key="site.id"
              class="flex items-center gap-2 p-1.5 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <UIcon :name="site.icon" class="w-4 h-4 text-muted" />
              <span class="flex-1 text-sm truncate">{{ site.label }}</span>
              <UIcon
                v-if="sitePermissions.get(site.id)"
                name="i-lucide-check"
                class="size-4 text-success"
              />
              <button
                v-else
                class="text-xs text-primary-500 hover:underline"
                @click="handleRequestSitePermission(site)"
              >
                {{ t('enable') }}
              </button>
            </div>
          </div>
        </div>

        <div class="border-t border-zinc-200 dark:border-zinc-700" />

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
            class="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700 accent-primary-500"
            @change="handleMarginChange"
          >
          <div class="text-xs text-zinc-500 dark:text-zinc-400">
            {{ t('marginThresholdDesc') }}
          </div>
        </div>

        <div class="border-t border-zinc-200 dark:border-zinc-700" />

        <!-- Language selector -->
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-sm">
              {{ t('language') }}
            </div>
            <div class="text-xs text-zinc-500 dark:text-zinc-400">
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
                : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'"
              @click="changeLocale(opt.value as 'en' | 'fr')"
            >
              {{ opt.value.toUpperCase() }}
            </button>
          </div>
        </div>

        <div class="border-t border-zinc-200 dark:border-zinc-700" />

        <!-- Account section -->
        <div class="space-y-2">
          <div class="text-sm font-medium">
            {{ t('account') }}
          </div>

          <!-- Loading -->
          <div v-if="authLoading" class="flex items-center gap-2 text-sm text-zinc-500">
            <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <span>{{ t('checking') }}</span>
          </div>

          <!-- Not authenticated -->
          <div v-else-if="!authenticated" class="space-y-2">
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
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
            <div class="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
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
        <div class="text-xs text-zinc-500 dark:text-zinc-400 text-center">
          v0.0.1 • {{ t('poweredBy') }}
        </div>
      </template>
    </UCard>
  </UApp>
</template>

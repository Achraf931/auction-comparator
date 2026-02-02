import { ref, watch } from 'vue'
import type { ExtensionSettings } from '@/utils/storage'
import { getSettings, saveSettings } from '@/utils/storage'

const settings = ref<ExtensionSettings | null>(null)
const loading = ref(false)

export function useSettings() {
  async function loadSettings() {
    loading.value = true
    try {
      settings.value = await getSettings()
    } finally {
      loading.value = false
    }
  }

  async function updateSettings(updates: Partial<ExtensionSettings>) {
    if (!settings.value) return

    settings.value = { ...settings.value, ...updates }
    await saveSettings(updates)
  }

  async function toggleEnabled() {
    if (!settings.value) return
    await updateSettings({ enabled: !settings.value.enabled })
  }

  async function setApiBase(apiBase: string) {
    await updateSettings({ apiBase })
  }

  async function setMarginPercent(marginPercent: number) {
    await updateSettings({ marginPercent })
  }

  async function toggleDomainEnabled(domain: string) {
    if (!settings.value) return

    const disabledDomains = new Set(settings.value.disabledDomains)
    if (disabledDomains.has(domain)) {
      disabledDomains.delete(domain)
    } else {
      disabledDomains.add(domain)
    }

    await updateSettings({ disabledDomains: Array.from(disabledDomains) })
  }

  return {
    settings,
    loading,
    loadSettings,
    updateSettings,
    toggleEnabled,
    setApiBase,
    setMarginPercent,
    toggleDomainEnabled,
  }
}

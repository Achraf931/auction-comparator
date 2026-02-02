import { ref, readonly } from 'vue'
import type { CompareResponse } from '@auction-comparator/shared'

export type OverlayStatus = 'idle' | 'loading' | 'success' | 'error';

const status = ref<OverlayStatus>('idle')
const comparison = ref<CompareResponse | null>(null)
const error = ref<string | null>(null)
const collapsed = ref(false)

export function useOverlayState() {
  function setLoading() {
    status.value = 'loading'
    error.value = null
  }

  function setSuccess(data: CompareResponse) {
    status.value = 'success'
    comparison.value = data
    error.value = null
  }

  function setError(message: string) {
    status.value = 'error'
    error.value = message
  }

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  function reset() {
    status.value = 'idle'
    comparison.value = null
    error.value = null
  }

  return {
    status: readonly(status),
    comparison: readonly(comparison),
    error: readonly(error),
    collapsed,
    setLoading,
    setSuccess,
    setError,
    toggleCollapsed,
    reset,
  }
}

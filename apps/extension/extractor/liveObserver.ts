/**
 * Live price observer using MutationObserver
 * Watches for price changes and updates the UI
 */

import { parsePrice, isReasonablePrice, type ParsedPrice } from './priceParser'

export interface ObserverConfig {
  /** Element to observe */
  element: Element;
  /** CSS path for logging */
  cssPath: string;
  /** Callback when price changes */
  onPriceChange: (price: ParsedPrice) => void;
  /** Callback when element disappears or becomes invalid */
  onInvalid: (reason: 'disappeared' | 'invalid_price' | 'empty') => void;
  /** Minimum time between updates (ms) */
  debounceMs?: number;
}

export interface LiveObserver {
  /** Start observing */
  start: () => void;
  /** Stop observing */
  stop: () => void;
  /** Check current status */
  isActive: () => boolean;
  /** Get last valid price */
  getLastPrice: () => ParsedPrice | null;
}

/**
 * Create a live observer for a price element
 */
export function createLiveObserver(config: ObserverConfig): LiveObserver {
  const { element, cssPath, onPriceChange, onInvalid, debounceMs = 500 } = config

  let observer: MutationObserver | null = null
  let lastPrice: ParsedPrice | null = null
  let debounceTimeout: number | null = null
  let isRunning = false

  // Get the initial price
  const initialText = element.textContent?.trim()
  if (initialText) {
    const parsed = parsePrice(initialText)
    if (parsed && isReasonablePrice(parsed.value)) {
      lastPrice = parsed
    }
  }

  /**
   * Check if the element is still valid
   */
  function checkElementValidity(): boolean {
    // Check if element is still in DOM
    if (!document.body.contains(element)) {
      console.log('[LiveObserver] Element disappeared from DOM:', cssPath)
      onInvalid('disappeared')
      return false
    }

    // Check if element is still visible
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      console.log('[LiveObserver] Element became invisible:', cssPath)
      onInvalid('disappeared')
      return false
    }

    return true
  }

  /**
   * Process a potential price change
   */
  function processChange(): void {
    if (!checkElementValidity()) {
      stop()
      return
    }

    const text = element.textContent?.trim()
    if (!text || text.length < 2) {
      console.log('[LiveObserver] Element became empty:', cssPath)
      onInvalid('empty')
      return
    }

    const parsed = parsePrice(text)
    if (!parsed) {
      console.log('[LiveObserver] Could not parse price from:', text)
      onInvalid('invalid_price')
      return
    }

    if (!isReasonablePrice(parsed.value)) {
      console.log('[LiveObserver] Price out of reasonable range:', parsed.value)
      onInvalid('invalid_price')
      return
    }

    // Check if price actually changed
    if (lastPrice && lastPrice.value === parsed.value) {
      return // No change
    }

    console.log('[LiveObserver] Price changed:', lastPrice?.value, '->', parsed.value)
    lastPrice = parsed
    onPriceChange(parsed)
  }

  /**
   * Debounced change handler
   */
  function handleMutation(): void {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }
    debounceTimeout = window.setTimeout(processChange, debounceMs)
  }

  /**
   * Start observing
   */
  function start(): void {
    if (isRunning) return

    // Find the best element to observe (might need to observe parent)
    let targetElement = element

    // If element has no children, observe parent
    if (element.childNodes.length === 0 && element.parentElement) {
      targetElement = element.parentElement
    }

    observer = new MutationObserver(handleMutation)
    observer.observe(targetElement, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    isRunning = true
    console.log('[LiveObserver] Started observing:', cssPath)

    // Trigger initial check
    processChange()
  }

  /**
   * Stop observing
   */
  function stop(): void {
    if (!isRunning) return

    if (observer) {
      observer.disconnect()
      observer = null
    }

    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
      debounceTimeout = null
    }

    isRunning = false
    console.log('[LiveObserver] Stopped observing:', cssPath)
  }

  return {
    start,
    stop,
    isActive: () => isRunning,
    getLastPrice: () => lastPrice,
  }
}

/**
 * Create a periodic fallback checker
 * Uses requestAnimationFrame for efficiency
 */
export function createPeriodicChecker(
  checkFn: () => void,
  intervalMs: number = 2000
): { start: () => void; stop: () => void } {
  let frameId: number | null = null
  let lastCheck = 0

  function loop(timestamp: number): void {
    if (timestamp - lastCheck >= intervalMs) {
      lastCheck = timestamp
      checkFn()
    }
    frameId = requestAnimationFrame(loop)
  }

  return {
    start: () => {
      if (frameId === null) {
        frameId = requestAnimationFrame(loop)
      }
    },
    stop: () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
        frameId = null
      }
    },
  }
}

/**
 * Watch for dynamic content loading (SPAs)
 * Detects when significant DOM changes occur that might indicate a page transition
 */
export function watchForPageTransition(
  onTransition: () => void,
  debounceMs: number = 1000
): { start: () => void; stop: () => void } {
  let observer: MutationObserver | null = null
  let debounceTimeout: number | null = null
  let mutationCount = 0
  const MUTATION_THRESHOLD = 10 // Significant changes

  function handleMutations(mutations: MutationRecord[]): void {
    // Count significant mutations
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutationCount += mutation.addedNodes.length + mutation.removedNodes.length
      }
    }

    // If enough mutations, might be a page transition
    if (mutationCount >= MUTATION_THRESHOLD) {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
      }
      debounceTimeout = window.setTimeout(() => {
        console.log('[PageTransition] Detected significant DOM change, mutations:', mutationCount)
        mutationCount = 0
        onTransition()
      }, debounceMs)
    }

    // Reset mutation count periodically
    setTimeout(() => {
      mutationCount = Math.max(0, mutationCount - 5)
    }, 500)
  }

  return {
    start: () => {
      if (observer) return
      observer = new MutationObserver(handleMutations)
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      })
      console.log('[PageTransition] Started watching for page transitions')
    },
    stop: () => {
      if (observer) {
        observer.disconnect()
        observer = null
      }
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
        debounceTimeout = null
      }
      mutationCount = 0
    },
  }
}

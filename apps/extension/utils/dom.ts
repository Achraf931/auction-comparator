/**
 * Create a Shadow DOM container for the overlay
 * This isolates our styles from the host page
 */
export function createShadowContainer(hostId: string): {
  host: HTMLElement;
  shadow: ShadowRoot;
  container: HTMLElement;
} {
  // Remove existing container if present
  const existing = document.getElementById(hostId)
  if (existing) {
    existing.remove()
  }

  // Create host element
  const host = document.createElement('div')
  host.id = hostId
  host.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    z-index: 2147483647;
    font-family: system-ui, -apple-system, sans-serif;
  `

  // Create shadow root
  const shadow = host.attachShadow({ mode: 'closed' })

  // Create container inside shadow
  const container = document.createElement('div')
  container.id = 'app'
  shadow.appendChild(container)

  return { host, shadow, container }
}

/**
 * Inject styles into a shadow root
 */
export function injectStyles(shadow: ShadowRoot, css: string): void {
  const style = document.createElement('style')
  style.textContent = css
  shadow.insertBefore(style, shadow.firstChild)
}

/**
 * Wait for an element to appear in the DOM
 */
export function waitForElement(
  selector: string,
  timeout = 10000
): Promise<Element | null> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector)
    if (element) {
      resolve(element)
      return
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) {
        observer.disconnect()
        resolve(el)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, timeout)
  })
}

/**
 * Debounce a function
 */
export function debounce<T extends(...args: unknown[]) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, ms)
  }
}

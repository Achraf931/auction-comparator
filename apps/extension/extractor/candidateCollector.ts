/**
 * Candidate collector for title and price elements
 * Collects DOM elements that might contain the data we need
 */

import { containsPrice, parsePrice, type ParsedPrice } from './priceParser'

export interface BaseCandidate {
  /** CSS path to element (robust, not relying on IDs) */
  cssPath: string;
  /** Cleaned text content */
  text: string;
  /** Context from nearby elements */
  labelContext: string;
  /** The actual DOM element */
  element: Element;
  /** Is the element visible */
  isVisible: boolean;
  /** Font size in pixels */
  fontSize: number;
  /** Font weight */
  fontWeight: number;
  /** Distance from top of viewport */
  distanceFromTop: number;
}

export interface TitleCandidate extends BaseCandidate {
  type: 'title';
  /** Tag name (h1, h2, etc) */
  tagName: string;
  /** Is this from meta tags */
  isMeta: boolean;
}

export interface PriceCandidate extends BaseCandidate {
  type: 'price';
  /** Parsed price value */
  value: number | null;
  /** Detected currency */
  currency: string | null;
  /** Raw price text */
  rawPrice: string;
}

/**
 * Generate a robust CSS path for an element
 * Uses tag:nth-of-type chain, avoiding IDs and classes
 */
export function getCssPath(element: Element): string {
  const path: string[] = []
  let current: Element | null = element

  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase()

    // Add nth-of-type for disambiguation
    const parent = current.parentElement
    if (parent) {
      const currentTagName = current.tagName
      const childArray: Element[] = []
      for (let i = 0; i < parent.children.length; i++) {
        childArray.push(parent.children[i])
      }
      const siblings = childArray.filter(child => child.tagName === currentTagName)
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-of-type(${ index })`
      }
    }

    path.unshift(selector)
    current = current.parentElement
  }

  return path.join(' > ')
}

/**
 * Get context text from nearby elements (siblings, parent labels)
 */
function getLabelContext(element: Element, maxChars = 200): string {
  const contexts: string[] = []

  // Get parent's text (excluding child text)
  const parent = element.parentElement
  if (parent) {
    const parentClone = parent.cloneNode(true) as Element
    // Remove the target element from clone
    const children = parentClone.querySelectorAll('*')
    children.forEach(c => {
      if (c.textContent === element.textContent) {
        c.textContent = ''
      }
    })
    const parentText = parentClone.textContent?.trim().slice(0, 100)
    if (parentText) contexts.push(parentText)
  }

  // Get previous sibling text
  let prev = element.previousElementSibling
  while (prev && contexts.join(' ').length < maxChars) {
    const text = prev.textContent?.trim().slice(0, 50)
    if (text) contexts.unshift(text)
    prev = prev.previousElementSibling
  }

  // Get next sibling text (less important)
  const next = element.nextElementSibling
  if (next && contexts.join(' ').length < maxChars) {
    const text = next.textContent?.trim().slice(0, 50)
    if (text) contexts.push(text)
  }

  // Check for aria-label, title, etc.
  const ariaLabel = element.getAttribute('aria-label')
  if (ariaLabel) contexts.push(ariaLabel)

  const title = element.getAttribute('title')
  if (title) contexts.push(title)

  return contexts.join(' ').slice(0, maxChars)
}

/**
 * Check if an element is visible
 */
function isElementVisible(element: Element): boolean {
  const el = element as HTMLElement

  // Check offsetParent (null means hidden)
  if (el.offsetParent === null && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
    // Exception: fixed/sticky elements
    const style = window.getComputedStyle(el)
    if (style.position !== 'fixed' && style.position !== 'sticky') {
      return false
    }
  }

  // Check visibility CSS
  const style = window.getComputedStyle(el)
  if (style.visibility === 'hidden' || style.display === 'none') {
    return false
  }

  // Check aria-hidden
  if (el.getAttribute('aria-hidden') === 'true') {
    return false
  }

  // Check dimensions
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    return false
  }

  return true
}

/**
 * Get computed font metrics for an element
 */
function getFontMetrics(element: Element): { fontSize: number; fontWeight: number } {
  const style = window.getComputedStyle(element)
  const fontSize = parseFloat(style.fontSize) || 16
  const fontWeight = parseInt(style.fontWeight) || 400
  return { fontSize, fontWeight }
}

/**
 * Collect title candidates from the page
 */
export function collectTitleCandidates(): TitleCandidate[] {
  const candidates: TitleCandidate[] = []

  // Collect h1, h2, h3 elements
  const headings = document.querySelectorAll('h1, h2, h3')
  headings.forEach(el => {
    const text = el.textContent?.trim()
    if (!text || text.length < 3 || text.length > 500) return

    const { fontSize, fontWeight } = getFontMetrics(el)
    const rect = el.getBoundingClientRect()

    candidates.push({
      type: 'title',
      cssPath: getCssPath(el),
      text,
      labelContext: getLabelContext(el),
      element: el,
      isVisible: isElementVisible(el),
      fontSize,
      fontWeight,
      distanceFromTop: rect.top + window.scrollY,
      tagName: el.tagName.toLowerCase(),
      isMeta: false,
    })
  })

  // Collect from og:title
  const ogTitle = document.querySelector('meta[property="og:title"]')
  if (ogTitle) {
    const content = ogTitle.getAttribute('content')?.trim()
    if (content && content.length >= 3) {
      candidates.push({
        type: 'title',
        cssPath: 'meta[property="og:title"]',
        text: content,
        labelContext: 'Open Graph title',
        element: ogTitle,
        isVisible: true,
        fontSize: 0,
        fontWeight: 0,
        distanceFromTop: 0,
        tagName: 'meta',
        isMeta: true,
      })
    }
  }

  // Collect from document.title
  if (document.title) {
    const fakeElement = document.createElement('title')
    candidates.push({
      type: 'title',
      cssPath: 'title',
      text: document.title.split('|')[0].split('-')[0].trim(),
      labelContext: 'Document title',
      element: fakeElement,
      isVisible: true,
      fontSize: 0,
      fontWeight: 0,
      distanceFromTop: 0,
      tagName: 'title',
      isMeta: true,
    })
  }

  // Collect large text elements that might be titles
  const largeText = document.querySelectorAll('[class*="title"], [class*="Title"], [class*="titre"], [class*="Titre"], [class*="product"], [class*="lot"]')
  largeText.forEach(el => {
    if (el.tagName.match(/^H[1-6]$/)) return // Already collected

    const text = el.textContent?.trim()
    if (!text || text.length < 3 || text.length > 500) return

    const { fontSize, fontWeight } = getFontMetrics(el)
    if (fontSize < 16) return // Too small

    const rect = el.getBoundingClientRect()

    candidates.push({
      type: 'title',
      cssPath: getCssPath(el),
      text,
      labelContext: getLabelContext(el),
      element: el,
      isVisible: isElementVisible(el),
      fontSize,
      fontWeight,
      distanceFromTop: rect.top + window.scrollY,
      tagName: el.tagName.toLowerCase(),
      isMeta: false,
    })
  })

  return candidates
}

/**
 * Collect price candidates from the page
 */
export function collectPriceCandidates(): PriceCandidate[] {
  const candidates: PriceCandidate[] = []
  const seen = new Set<string>()

  // Walk all text nodes looking for price patterns
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const text = node.textContent?.trim()
        if (!text || text.length < 2) return NodeFilter.FILTER_REJECT
        if (containsPrice(text)) return NodeFilter.FILTER_ACCEPT
        return NodeFilter.FILTER_REJECT
      },
    }
  )

  let node: Node | null
  while ((node = walker.nextNode())) {
    const parent = node.parentElement
    if (!parent) continue

    const text = node.textContent?.trim()
    if (!text) continue

    // Deduplicate by element
    const cssPath = getCssPath(parent)
    if (seen.has(cssPath)) continue
    seen.add(cssPath)

    const parsed = parsePrice(text)
    const { fontSize, fontWeight } = getFontMetrics(parent)
    const rect = parent.getBoundingClientRect()

    candidates.push({
      type: 'price',
      cssPath,
      text: text.slice(0, 100),
      labelContext: getLabelContext(parent),
      element: parent,
      isVisible: isElementVisible(parent),
      fontSize,
      fontWeight,
      distanceFromTop: rect.top + window.scrollY,
      value: parsed?.value ?? null,
      currency: parsed?.currency ?? null,
      rawPrice: text,
    })
  }

  // Also check elements with price-related classes
  const priceElements = document.querySelectorAll('[class*="price"], [class*="Price"], [class*="prix"], [class*="Prix"], [class*="bid"], [class*="Bid"], [class*="enchere"], [class*="Enchere"]')
  priceElements.forEach(el => {
    const text = el.textContent?.trim()
    if (!text || !containsPrice(text)) return

    const cssPath = getCssPath(el)
    if (seen.has(cssPath)) return
    seen.add(cssPath)

    const parsed = parsePrice(text)
    const { fontSize, fontWeight } = getFontMetrics(el)
    const rect = el.getBoundingClientRect()

    candidates.push({
      type: 'price',
      cssPath,
      text: text.slice(0, 100),
      labelContext: getLabelContext(el),
      element: el,
      isVisible: isElementVisible(el),
      fontSize,
      fontWeight,
      distanceFromTop: rect.top + window.scrollY,
      value: parsed?.value ?? null,
      currency: parsed?.currency ?? null,
      rawPrice: text,
    })
  })

  return candidates
}

/**
 * Collect all candidates (title + price)
 */
export function collectAllCandidates(): {
  titleCandidates: TitleCandidate[];
  priceCandidates: PriceCandidate[];
  } {
  return {
    titleCandidates: collectTitleCandidates(),
    priceCandidates: collectPriceCandidates(),
  }
}

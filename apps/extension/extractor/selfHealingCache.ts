/**
 * Self-healing cache for learned extraction paths
 * Stores successful extractions per domain and reuses them
 */

export interface LearnedExtraction {
  /** Domain this extraction is for */
  domain: string;
  /** CSS path to title element */
  titlePath: string | null;
  /** CSS path to price element */
  pricePath: string | null;
  /** Keywords that matched for this extraction */
  matchedKeywords: string[];
  /** Number of successful uses */
  successCount: number;
  /** Number of failed attempts */
  failCount: number;
  /** Last successful extraction timestamp */
  lastSuccess: number;
  /** Last update timestamp */
  updatedAt: number;
  /** Confidence of original extraction */
  confidence: 'high' | 'medium' | 'low';
}

const STORAGE_KEY = 'learned_extractions'
const MAX_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const MAX_FAIL_COUNT = 3 // After this many failures, clear the entry

/**
 * Get learned extraction for a domain
 */
export async function getLearnedExtraction(domain: string): Promise<LearnedExtraction | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const cache = (result[STORAGE_KEY] || {}) as Record<string, LearnedExtraction>

    const entry = cache[domain]
    if (!entry) return null

    // Check if entry is too old
    if (Date.now() - entry.updatedAt > MAX_CACHE_AGE_MS) {
      await clearLearnedExtraction(domain)
      return null
    }

    // Check if too many failures
    if (entry.failCount >= MAX_FAIL_COUNT) {
      await clearLearnedExtraction(domain)
      return null
    }

    return entry
  } catch (error) {
    console.error('[SelfHealingCache] Error getting learned extraction:', error)
    return null
  }
}

/**
 * Save a learned extraction
 */
export async function saveLearnedExtraction(
  domain: string,
  titlePath: string | null,
  pricePath: string | null,
  matchedKeywords: string[],
  confidence: 'high' | 'medium' | 'low'
): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const cache = (result[STORAGE_KEY] || {}) as Record<string, LearnedExtraction>

    const existing = cache[domain]
    const now = Date.now()

    cache[domain] = {
      domain,
      titlePath,
      pricePath,
      matchedKeywords,
      successCount: existing ? existing.successCount + 1 : 1,
      failCount: 0, // Reset on success
      lastSuccess: now,
      updatedAt: now,
      confidence,
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: cache })
    console.log('[SelfHealingCache] Saved learned extraction for:', domain)
  } catch (error) {
    console.error('[SelfHealingCache] Error saving learned extraction:', error)
  }
}

/**
 * Record a failed extraction attempt
 */
export async function recordExtractionFailure(domain: string): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const cache = (result[STORAGE_KEY] || {}) as Record<string, LearnedExtraction>

    const existing = cache[domain]
    if (existing) {
      existing.failCount++
      existing.updatedAt = Date.now()
      await chrome.storage.local.set({ [STORAGE_KEY]: cache })
      console.log('[SelfHealingCache] Recorded failure for:', domain, 'count:', existing.failCount)
    }
  } catch (error) {
    console.error('[SelfHealingCache] Error recording failure:', error)
  }
}

/**
 * Clear learned extraction for a domain
 */
export async function clearLearnedExtraction(domain: string): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const cache = (result[STORAGE_KEY] || {}) as Record<string, LearnedExtraction>

    delete cache[domain]
    await chrome.storage.local.set({ [STORAGE_KEY]: cache })
    console.log('[SelfHealingCache] Cleared learned extraction for:', domain)
  } catch (error) {
    console.error('[SelfHealingCache] Error clearing learned extraction:', error)
  }
}

/**
 * Get all learned extractions
 */
export async function getAllLearnedExtractions(): Promise<Record<string, LearnedExtraction>> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    return (result[STORAGE_KEY] || {}) as Record<string, LearnedExtraction>
  } catch (error) {
    console.error('[SelfHealingCache] Error getting all learned extractions:', error)
    return {}
  }
}

/**
 * Clear all learned extractions
 */
export async function clearAllLearnedExtractions(): Promise<void> {
  try {
    await chrome.storage.local.remove(STORAGE_KEY)
    console.log('[SelfHealingCache] Cleared all learned extractions')
  } catch (error) {
    console.error('[SelfHealingCache] Error clearing all learned extractions:', error)
  }
}

/**
 * Try to extract using a learned path
 * Returns the element if found and valid, null otherwise
 */
export function tryLearnedPath(cssPath: string | null): Element | null {
  if (!cssPath) return null

  try {
    const element = document.querySelector(cssPath)
    if (!element) return null

    // Validate element is still visible
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return null

    // Check if element has content
    const text = element.textContent?.trim()
    if (!text || text.length < 2) return null

    return element
  } catch (error) {
    console.warn('[SelfHealingCache] Error trying learned path:', cssPath, error)
    return null
  }
}

/**
 * Validate a learned extraction is still working
 */
export function validateLearnedExtraction(
  learned: LearnedExtraction,
  validateTitle: (el: Element) => boolean,
  validatePrice: (el: Element) => boolean
): { titleValid: boolean; priceValid: boolean } {
  const titleElement = tryLearnedPath(learned.titlePath)
  const priceElement = tryLearnedPath(learned.pricePath)

  return {
    titleValid: titleElement ? validateTitle(titleElement) : false,
    priceValid: priceElement ? validatePrice(priceElement) : false,
  }
}

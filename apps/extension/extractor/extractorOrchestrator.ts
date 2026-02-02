/**
 * Main extraction orchestrator
 * Coordinates all extraction modules for a complete extraction flow
 */

import { detectLotPage, type LotPageInfo } from './lotPageDetector'
import { collectAllCandidates } from './candidateCollector'
import { scoreAllCandidates, type ScoringResult, type ExtractionConfidence } from './heuristicScorer'
import {
  getLearnedExtraction,
  saveLearnedExtraction,
  recordExtractionFailure,
  tryLearnedPath,
  validateLearnedExtraction,
  type LearnedExtraction,
} from './selfHealingCache'
import { createLiveObserver, watchForPageTransition, type LiveObserver } from './liveObserver'
import { parsePrice, type ParsedPrice } from './priceParser'
import type { DomainConfig } from './domainConfig'

export interface ExtractionResult {
  success: boolean;
  title: string | null;
  price: ParsedPrice | null;
  priceType: 'current_bid' | 'starting_price' | 'estimate' | 'sold' | 'unknown';
  confidence: ExtractionConfidence;
  source: 'learned' | 'heuristic' | 'ai';
  domain: string;
  lotPageInfo: LotPageInfo;
  debug?: ExtractionDebugInfo;
}

export interface ExtractionDebugInfo {
  candidatesFound: { titles: number; prices: number };
  topTitleCandidates: Array<{ text: string; score: number; cssPath: string }>;
  topPriceCandidates: Array<{ text: string; score: number; cssPath: string; priceType: string }>;
  learnedExtraction: LearnedExtraction | null;
  aiUsed: boolean;
  aiResponse?: unknown;
}

export interface ExtractorOptions {
  /** Enable debug mode for overlay */
  debug?: boolean;
  /** Callback when price updates live */
  onPriceUpdate?: (price: ParsedPrice) => void;
  /** Callback when extraction becomes invalid */
  onInvalid?: (reason: string) => void;
  /** API endpoint for AI resolution */
  aiResolveEndpoint?: string;
  /** Whether to use AI as fallback */
  useAiFallback?: boolean;
}

/**
 * Main extractor class
 */
export class AuctionExtractor {

  private options: ExtractorOptions
  private liveObserver: LiveObserver | null = null
  private pageTransitionWatcher: ReturnType<typeof watchForPageTransition> | null = null
  private lastResult: ExtractionResult | null = null

  constructor(options: ExtractorOptions = {}) {
    this.options = {
      debug: false,
      useAiFallback: true,
      ...options,
    }
  }

  /**
   * Run extraction on current page
   */
  async extract(): Promise<ExtractionResult> {
    // Step 1: Detect if this is a lot page
    const lotPageInfo = detectLotPage()

    if (!lotPageInfo.isLotPage) {
      return {
        success: false,
        title: null,
        price: null,
        priceType: 'unknown',
        confidence: 'low',
        source: 'heuristic',
        domain: lotPageInfo.domain,
        lotPageInfo,
      }
    }

    console.log('[Extractor] Lot page detected:', lotPageInfo.domain)

    // Step 2: Try learned extraction first
    const learnedResult = await this.tryLearnedExtraction(lotPageInfo)
    if (learnedResult) {
      this.lastResult = learnedResult
      return learnedResult
    }

    // Step 3: Run heuristic extraction
    const heuristicResult = await this.runHeuristicExtraction(lotPageInfo)

    // Step 4: If confidence is low and AI fallback is enabled, try AI
    if (
      this.options.useAiFallback &&
      this.options.aiResolveEndpoint &&
      heuristicResult.confidence === 'low'
    ) {
      const aiResult = await this.tryAiResolution(lotPageInfo, heuristicResult)
      if (aiResult) {
        this.lastResult = aiResult
        return aiResult
      }
    }

    this.lastResult = heuristicResult
    return heuristicResult
  }

  /**
   * Try to extract using learned paths
   */
  private async tryLearnedExtraction(lotPageInfo: LotPageInfo): Promise<ExtractionResult | null> {
    const learned = await getLearnedExtraction(lotPageInfo.domain)
    if (!learned) {
      console.log('[Extractor] No learned extraction for domain:', lotPageInfo.domain)
      return null
    }

    console.log('[Extractor] Trying learned extraction, success count:', learned.successCount)

    // Validate the learned paths still work
    const validation = validateLearnedExtraction(
      learned,
      (el) => {
        const text = el.textContent?.trim()
        return !!text && text.length >= 3 && text.length <= 500
      },
      (el) => {
        const text = el.textContent?.trim()
        if (!text) return false
        const parsed = parsePrice(text)
        return !!parsed && parsed.value > 0
      }
    )

    if (!validation.titleValid && !validation.priceValid) {
      console.log('[Extractor] Learned extraction no longer valid')
      await recordExtractionFailure(lotPageInfo.domain)
      return null
    }

    // Extract using learned paths
    const titleElement = tryLearnedPath(learned.titlePath)
    const priceElement = tryLearnedPath(learned.pricePath)

    const title = titleElement?.textContent?.trim() || null
    const priceText = priceElement?.textContent?.trim()
    const price = priceText ? parsePrice(priceText) : null

    if (!title && !price) {
      await recordExtractionFailure(lotPageInfo.domain)
      return null
    }

    // Start live observer on price element
    if (priceElement && price && this.options.onPriceUpdate) {
      this.startLiveObserver(priceElement, learned.pricePath || '')
    }

    // Update success count
    await saveLearnedExtraction(
      lotPageInfo.domain,
      learned.titlePath,
      learned.pricePath,
      learned.matchedKeywords,
      learned.confidence
    )

    return {
      success: true,
      title,
      price,
      priceType: 'current_bid', // Learned paths are always for current bid
      confidence: learned.confidence,
      source: 'learned',
      domain: lotPageInfo.domain,
      lotPageInfo,
      debug: this.options.debug
        ? {
          candidatesFound: { titles: 0, prices: 0 },
          topTitleCandidates: [],
          topPriceCandidates: [],
          learnedExtraction: learned,
          aiUsed: false,
        }
        : undefined,
    }
  }

  /**
   * Run heuristic-based extraction
   */
  private async runHeuristicExtraction(lotPageInfo: LotPageInfo): Promise<ExtractionResult> {
    // Collect candidates
    const { titleCandidates, priceCandidates } = collectAllCandidates()
    console.log(
      '[Extractor] Collected candidates:',
      titleCandidates.length,
      'titles,',
      priceCandidates.length,
      'prices'
    )

    // Score candidates
    const scoringResult = scoreAllCandidates(
      titleCandidates,
      priceCandidates,
      lotPageInfo.config
    )

    const { bestTitle, bestPrice, confidence } = scoringResult

    // If we have good results, save for future
    if (confidence !== 'low' && (bestTitle || bestPrice)) {
      const matchedKeywords: string[] = []
      if (bestPrice?.scoreBreakdown.matchedPositive) {
        matchedKeywords.push(...(bestPrice.scoreBreakdown.matchedPositive as unknown as string[]))
      }

      await saveLearnedExtraction(
        lotPageInfo.domain,
        bestTitle?.cssPath || null,
        bestPrice?.cssPath || null,
        matchedKeywords,
        confidence
      )
    }

    // Start live observer on best price element
    if (bestPrice && this.options.onPriceUpdate) {
      this.startLiveObserver(bestPrice.element, bestPrice.cssPath)
    }

    return {
      success: confidence !== 'low',
      title: bestTitle?.text || null,
      price: bestPrice
        ? { value: bestPrice.value!, currency: bestPrice.currency!, original: bestPrice.rawPrice, formatted: '' }
        : null,
      priceType: bestPrice?.priceType || 'unknown',
      confidence,
      source: 'heuristic',
      domain: lotPageInfo.domain,
      lotPageInfo,
      debug: this.options.debug ? this.buildDebugInfo(scoringResult, null, false) : undefined,
    }
  }

  /**
   * Try AI-based resolution when heuristics fail
   */
  private async tryAiResolution(
    lotPageInfo: LotPageInfo,
    heuristicResult: ExtractionResult
  ): Promise<ExtractionResult | null> {
    if (!this.options.aiResolveEndpoint) {
      return null
    }

    console.log('[Extractor] Trying AI resolution')

    try {
      // Collect fresh candidates for AI
      const { titleCandidates, priceCandidates } = collectAllCandidates()
      const scoringResult = scoreAllCandidates(titleCandidates, priceCandidates, lotPageInfo.config)

      // Prepare data for AI
      const topTitles = scoringResult.titleCandidates.slice(0, 5).map((c) => ({
        text: c.text,
        context: c.labelContext,
        score: c.score,
        cssPath: c.cssPath,
      }))

      const topPrices = scoringResult.priceCandidates.slice(0, 8).map((c) => ({
        text: c.text,
        context: c.labelContext,
        value: c.value,
        score: c.score,
        priceType: c.priceType,
        cssPath: c.cssPath,
      }))

      const response = await fetch(this.options.aiResolveEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: lotPageInfo.domain,
          url: lotPageInfo.url,
          titleCandidates: topTitles,
          priceCandidates: topPrices,
          config: lotPageInfo.config,
        }),
      })

      if (!response.ok) {
        console.error('[Extractor] AI resolution failed:', response.status)
        return null
      }

      const aiResult = await response.json()
      console.log('[Extractor] AI resolution result:', aiResult)

      if (!aiResult.success) {
        return null
      }

      // Find the selected elements by CSS path
      const selectedTitle = scoringResult.titleCandidates.find(
        (c) => c.cssPath === aiResult.titleCssPath
      )
      const selectedPrice = scoringResult.priceCandidates.find(
        (c) => c.cssPath === aiResult.priceCssPath
      )

      // Save the AI selection for future use
      if (selectedTitle || selectedPrice) {
        await saveLearnedExtraction(
          lotPageInfo.domain,
          aiResult.titleCssPath || null,
          aiResult.priceCssPath || null,
          aiResult.matchedKeywords || [],
          'medium' // AI results start at medium confidence
        )
      }

      // Start live observer
      if (selectedPrice && this.options.onPriceUpdate) {
        this.startLiveObserver(selectedPrice.element, selectedPrice.cssPath)
      }

      return {
        success: true,
        title: selectedTitle?.text || aiResult.title || null,
        price: selectedPrice
          ? {
            value: selectedPrice.value!,
            currency: selectedPrice.currency!,
            original: selectedPrice.rawPrice,
            formatted: '',
          }
          : null,
        priceType: aiResult.priceType || 'current_bid',
        confidence: 'medium',
        source: 'ai',
        domain: lotPageInfo.domain,
        lotPageInfo,
        debug: this.options.debug
          ? this.buildDebugInfo(scoringResult, null, true, aiResult)
          : undefined,
      }
    } catch (error) {
      console.error('[Extractor] AI resolution error:', error)
      return null
    }
  }

  /**
   * Start live observer for price updates
   */
  private startLiveObserver(element: Element, cssPath: string): void {
    // Stop existing observer
    this.stopLiveObserver()

    this.liveObserver = createLiveObserver({
      element,
      cssPath,
      onPriceChange: (price) => {
        console.log('[Extractor] Live price update:', price.value)
        if (this.lastResult) {
          this.lastResult.price = price
        }
        this.options.onPriceUpdate?.(price)
      },
      onInvalid: (reason) => {
        console.log('[Extractor] Price element invalid:', reason)
        this.options.onInvalid?.(reason)
        // Could trigger re-extraction here
      },
    })

    this.liveObserver.start()
  }

  /**
   * Stop live observer
   */
  private stopLiveObserver(): void {
    if (this.liveObserver) {
      this.liveObserver.stop()
      this.liveObserver = null
    }
  }

  /**
   * Start watching for page transitions (SPA navigation)
   */
  startPageTransitionWatch(onTransition: () => void): void {
    this.pageTransitionWatcher = watchForPageTransition(onTransition)
    this.pageTransitionWatcher.start()
  }

  /**
   * Stop watching for page transitions
   */
  stopPageTransitionWatch(): void {
    if (this.pageTransitionWatcher) {
      this.pageTransitionWatcher.stop()
      this.pageTransitionWatcher = null
    }
  }

  /**
   * Clean up all observers
   */
  destroy(): void {
    this.stopLiveObserver()
    this.stopPageTransitionWatch()
  }

  /**
   * Get last extraction result
   */
  getLastResult(): ExtractionResult | null {
    return this.lastResult
  }

  /**
   * Build debug info
   */
  private buildDebugInfo(
    scoringResult: ScoringResult,
    learned: LearnedExtraction | null,
    aiUsed: boolean,
    aiResponse?: unknown
  ): ExtractionDebugInfo {
    return {
      candidatesFound: {
        titles: scoringResult.titleCandidates.length,
        prices: scoringResult.priceCandidates.length,
      },
      topTitleCandidates: scoringResult.titleCandidates.slice(0, 5).map((c) => ({
        text: c.text.slice(0, 100),
        score: c.score,
        cssPath: c.cssPath,
      })),
      topPriceCandidates: scoringResult.priceCandidates.slice(0, 5).map((c) => ({
        text: c.text,
        score: c.score,
        cssPath: c.cssPath,
        priceType: c.priceType,
      })),
      learnedExtraction: learned,
      aiUsed,
      aiResponse,
    }
  }

}

/**
 * Create extractor instance with default options
 */
export function createExtractor(options?: ExtractorOptions): AuctionExtractor {
  return new AuctionExtractor(options)
}

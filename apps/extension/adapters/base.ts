import type {
  SiteAdapter,
  AuctionData,
  AuctionFees,
  Currency,
  ItemCondition,
  MutationObserverConfig,
  ExtractionConfidence,
} from '@auction-comparator/shared'
import { calculateExtractionConfidence } from '@auction-comparator/shared'

export abstract class BaseAdapter implements SiteAdapter {

  abstract id: string;
  abstract name: string;
  abstract urlPatterns: RegExp[];
  abstract defaultCurrency: Currency;
  abstract defaultLocale: string;
  abstract defaultFees: AuctionFees;

  abstract isLotPage(): boolean;
  abstract extractData(): AuctionData | null;
  abstract getOverlayMountPoint(): Element | null;

  getMutationConfig(): MutationObserverConfig {
    return {
      targetSelector: 'body',
      options: {
        childList: true,
        subtree: true,
        characterData: true,
      },
      debounceMs: 500,
    }
  }

  parseCondition(conditionText: string): ItemCondition {
    const text = conditionText.toLowerCase()

    if (text.includes('neuf') || text.includes('new')) {
      return 'new'
    }
    if (text.includes('comme neuf') || text.includes('like new')) {
      return 'like_new'
    }
    if (text.includes('très bon') || text.includes('very good') || text.includes('excellent')) {
      return 'very_good'
    }
    if (text.includes('bon état') || text.includes('good')) {
      return 'good'
    }
    if (text.includes('acceptable') || text.includes('fair')) {
      return 'acceptable'
    }
    if (text.includes('pour pièces') || text.includes('for parts') || text.includes('hs')) {
      return 'for_parts'
    }

    return 'unknown'
  }

  /**
   * Extract text content from an element
   */
  protected getText(selector: string): string | null {
    const element = document.querySelector(selector)
    return element?.textContent?.trim() || null
  }

  /**
   * Extract a number from text
   */
  protected parseNumber(text: string | null): number | null {
    if (!text) return null
    const cleaned = text.replace(/[^\d.,]/g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }

  /**
   * Get current domain
   */
  protected getDomain(): string {
    return window.location.hostname
  }

  /**
   * Get current URL
   */
  protected getUrl(): string {
    return window.location.href
  }

  /**
   * Calculate extraction confidence based on available data
   */
  protected getExtractionConfidence(
    brand?: string,
    model?: string,
    hasJsonLd = false
  ): ExtractionConfidence {
    return calculateExtractionConfidence(brand, model, hasJsonLd)
  }

}

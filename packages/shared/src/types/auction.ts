export type Currency = 'EUR' | 'USD' | 'GBP';

export type ItemCondition =
  | 'new'
  | 'like_new'
  | 'very_good'
  | 'good'
  | 'acceptable'
  | 'for_parts'
  | 'unknown';

export interface AuctionFees {
  /** Buyer's premium percentage (e.g., 0.20 for 20%) */
  buyerPremium: number;
  /** Fixed fees in the auction currency */
  fixedFees?: number;
  /** VAT percentage if applicable */
  vat?: number;
}

export type ExtractionConfidence = 'high' | 'medium' | 'low';

export interface AuctionData {
  /** Item title from the auction listing */
  title: string;
  /** Brand name if detectable */
  brand?: string;
  /** Model name/number if detectable */
  model?: string;
  /** Year (e.g., car model year, first circulation date) */
  year?: number;
  /** Item condition */
  condition: ItemCondition;
  /** Current bid price (or starting price if no bids) */
  currentBid: number;
  /** Currency of the auction */
  currency: Currency;
  /** Auction house fees structure */
  fees: AuctionFees;
  /** Total price including fees */
  totalPrice: number;
  /** Site domain where the auction is listed */
  siteDomain: string;
  /** Locale for search queries */
  locale: string;
  /** Unique lot identifier */
  lotId?: string;
  /** URL of the auction lot */
  lotUrl?: string;
  /** Category of the item */
  category?: string;
  /** Raw description text */
  description?: string;
  /** Confidence level of the extraction */
  extractionConfidence?: ExtractionConfidence;
  /** Timestamp when data was extracted */
  extractedAt: number;
}

/**
 * Calculate extraction confidence based on available data
 */
export function calculateExtractionConfidence(
  brandHint?: string,
  modelHint?: string,
  hasJsonLd?: boolean
): ExtractionConfidence {
  if (hasJsonLd || (brandHint && modelHint)) {
    return 'high';
  }
  if (brandHint || modelHint) {
    return 'medium';
  }
  return 'low';
}

/**
 * Calculate total auction price including all fees
 */
export function calculateTotalPrice(
  bidPrice: number,
  fees: AuctionFees
): number {
  let total = bidPrice;

  // Add buyer's premium
  total += bidPrice * fees.buyerPremium;

  // Add fixed fees
  if (fees.fixedFees) {
    total += fees.fixedFees;
  }

  // Add VAT if applicable (applied to the total)
  if (fees.vat) {
    total += total * fees.vat;
  }

  return Math.round(total * 100) / 100;
}

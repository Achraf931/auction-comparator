import type { ShoppingProvider, ShoppingSearchOptions } from './base';
import type { Currency, WebPriceResult } from '@auction-comparator/shared';
import { parsePriceString, calculateRelevanceScore } from '@auction-comparator/shared';
import { getGoogleDomain, getCountryCode } from '../utils/query';

interface SerpApiShoppingResult {
  title: string;
  link?: string;
  product_link?: string;
  source: string;
  price?: string;
  extracted_price?: number;
  thumbnail?: string;
  delivery?: string;
  second_hand_condition?: string;
}

interface SerpApiOrganicResult {
  title: string;
  link: string;
  snippet?: string;
  source?: string;
  thumbnail?: string;
}

interface SerpApiResponse {
  shopping_results?: SerpApiShoppingResult[];
  organic_results?: SerpApiOrganicResult[];
  error?: string;
}

export class SerpApiProvider implements ShoppingProvider {
  id = 'serpapi';
  name = 'SerpApi Google Shopping';

  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async search(options: ShoppingSearchOptions): Promise<WebPriceResult[]> {
    if (!this.isAvailable()) {
      throw new Error('SerpApi key not configured');
    }

    const { category = 'product' } = options;

    // Use different search strategy for vehicles
    if (category === 'vehicle') {
      return this.searchVehicle(options);
    }

    return this.searchProducts(options);
  }

  private async searchProducts(options: ShoppingSearchOptions): Promise<WebPriceResult[]> {
    const { query, currency, locale, maxResults = 10 } = options;

    // Try Google Shopping first
    const shoppingResults = await this.tryGoogleShopping(query, locale, maxResults, currency);

    if (shoppingResults.length > 0) {
      return shoppingResults;
    }

    console.log('[SerpApi] No Google Shopping results, trying organic search fallback');

    // Fallback to organic search if shopping returns nothing
    return this.tryOrganicSearchWithPrices(query, locale, maxResults, currency);
  }

  private async tryGoogleShopping(
    query: string,
    locale: string,
    maxResults: number,
    currency: Currency
  ): Promise<WebPriceResult[]> {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      engine: 'google_shopping',
      q: query,
      google_domain: getGoogleDomain(locale),
      gl: getCountryCode(locale),
      hl: locale,
      num: String(maxResults),
    });

    try {
      const response = await fetch(`https://serpapi.com/search?${params}`);

      if (!response.ok) {
        console.log(`[SerpApi] Shopping request failed: ${response.status}`);
        return [];
      }

      const data: SerpApiResponse = await response.json();

      if (data.error) {
        console.log(`[SerpApi] Shopping error: ${data.error}`);
        return [];
      }

      const results = data.shopping_results || [];

      return results
        .filter((r) => r.extracted_price || r.price)
        .map((r) => this.mapResult(r, query, currency))
        .filter((r): r is WebPriceResult => r !== null);
    } catch (error) {
      console.error('[SerpApi] Shopping search failed:', error);
      return [];
    }
  }

  private async tryOrganicSearchWithPrices(
    query: string,
    locale: string,
    maxResults: number,
    currency: Currency
  ): Promise<WebPriceResult[]> {
    // Add "prix" or "price" to help find pages with prices
    const priceQuery = locale.startsWith('fr')
      ? `${query} prix`
      : `${query} price`;

    const params = new URLSearchParams({
      api_key: this.apiKey,
      engine: 'google',
      q: priceQuery,
      google_domain: getGoogleDomain(locale),
      gl: getCountryCode(locale),
      hl: locale,
      num: String(maxResults * 2),
    });

    try {
      const response = await fetch(`https://serpapi.com/search?${params}`);

      if (!response.ok) {
        console.log(`[SerpApi] Organic request failed: ${response.status}`);
        return [];
      }

      const data: SerpApiResponse = await response.json();

      if (data.error) {
        console.log(`[SerpApi] Organic error: ${data.error}`);
        return [];
      }

      const results = data.organic_results || [];

      // Try to extract prices from organic results
      return results
        .map((r) => this.mapOrganicResultWithPrice(r, query, currency))
        .filter((r): r is WebPriceResult => r !== null)
        .slice(0, maxResults);
    } catch (error) {
      console.error('[SerpApi] Organic search failed:', error);
      return [];
    }
  }

  private mapOrganicResultWithPrice(
    result: SerpApiOrganicResult,
    query: string,
    currency: Currency
  ): WebPriceResult | null {
    const textToSearch = `${result.title} ${result.snippet || ''}`;

    // Match various price patterns
    const pricePatterns = [
      /(\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?)\s*€/,
      /€\s*(\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?)/,
      /(\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?)\s*euros?/i,
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*\$/,
      /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*£/,
      /£\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
    ];

    let price: number | null = null;
    let priceString = '';

    for (const pattern of pricePatterns) {
      const match = textToSearch.match(pattern);
      if (match && match[1]) {
        const cleanPrice = match[1].replace(/[\s.]/g, '').replace(',', '.');
        price = parseFloat(cleanPrice);
        priceString = match[0];
        break;
      }
    }

    if (!price || price <= 0) {
      return null;
    }

    let source = 'Unknown';
    try {
      const url = new URL(result.link);
      source = url.hostname.replace('www.', '');
    } catch {
      // Keep default
    }

    const relevanceScore = calculateRelevanceScore(query, result.title);

    return {
      title: result.title,
      price,
      priceString: priceString || `${price} ${currency}`,
      source,
      url: result.link,
      thumbnail: result.thumbnail,
      relevanceScore,
    };
  }

  private async searchVehicle(options: ShoppingSearchOptions): Promise<WebPriceResult[]> {
    const { query, currency, locale, maxResults = 10 } = options;

    // Try multiple query strategies for vehicles
    const queryStrategies = [
      `${query} prix occasion`,
      `${query} occasion`,
      `${query} argus`,
      query, // Plain query as fallback
    ];

    const carSites = [
      'lacentrale.fr',
      'leboncoin.fr',
      'autoscout24',
      'largus.fr',
      'autoplus.fr',
      'caradisiac.com',
      'aramisauto.com',
      'spoticar.fr',
      'paruvendu.fr',
      'ouestfrance-auto.com',
    ];

    for (const vehicleQuery of queryStrategies) {
      console.log(`[SerpApi] Trying vehicle query: "${vehicleQuery}"`);

      const params = new URLSearchParams({
        api_key: this.apiKey,
        engine: 'google',
        q: vehicleQuery,
        google_domain: getGoogleDomain(locale),
        gl: getCountryCode(locale),
        hl: locale,
        num: String(maxResults * 3), // Get more results to filter
      });

      try {
        const response = await fetch(`https://serpapi.com/search?${params}`);

        if (!response.ok) {
          console.log(`[SerpApi] Vehicle request failed: ${response.status}`);
          continue;
        }

        const data: SerpApiResponse = await response.json();

        if (data.error) {
          console.log(`[SerpApi] Vehicle search error: ${data.error}`);
          continue;
        }

        const results = data.organic_results || [];

        // First try: filter for car marketplace sites
        let vehicleResults = results
          .filter((r) => carSites.some(site => r.link.toLowerCase().includes(site)))
          .map((r) => this.mapVehicleResult(r, query, currency))
          .filter((r): r is WebPriceResult => r !== null);

        if (vehicleResults.length >= 3) {
          console.log(`[SerpApi] Found ${vehicleResults.length} vehicle results from car sites`);
          return vehicleResults.slice(0, maxResults);
        }

        // Second try: if not enough results from car sites, try extracting prices from any result
        if (vehicleResults.length < 3 && results.length > 0) {
          const allResults = results
            .map((r) => this.mapVehicleResult(r, query, currency))
            .filter((r): r is WebPriceResult => r !== null);

          if (allResults.length > vehicleResults.length) {
            console.log(`[SerpApi] Found ${allResults.length} results with prices (expanded search)`);
            vehicleResults = allResults;
          }
        }

        if (vehicleResults.length > 0) {
          return vehicleResults.slice(0, maxResults);
        }
      } catch (error) {
        console.error(`[SerpApi] Vehicle search failed for query "${vehicleQuery}":`, error);
        continue;
      }
    }

    // If all strategies failed, return empty array
    console.log('[SerpApi] All vehicle search strategies failed');
    return [];
  }

  private mapResult(
    result: SerpApiShoppingResult,
    query: string,
    currency: Currency
  ): WebPriceResult | null {
    const price = result.extracted_price ?? parsePriceString(result.price || '');

    if (!price || price <= 0) {
      return null;
    }

    // Try multiple URL fields, fallback to Google search
    const url = result.link || result.product_link ||
      `https://www.google.com/search?q=${encodeURIComponent(result.title)}`;

    const relevanceScore = calculateRelevanceScore(query, result.title);

    return {
      title: result.title,
      price,
      priceString: result.price || `${price} ${currency}`,
      source: result.source,
      url,
      thumbnail: result.thumbnail,
      condition: result.second_hand_condition,
      shippingIncluded: result.delivery?.toLowerCase().includes('livraison gratuite') ||
        result.delivery?.toLowerCase().includes('free'),
      relevanceScore,
    };
  }

  private mapVehicleResult(
    result: SerpApiOrganicResult,
    query: string,
    currency: Currency
  ): WebPriceResult | null {
    // Try to extract price from title or snippet
    const textToSearch = `${result.title} ${result.snippet || ''}`;
    const textLower = textToSearch.toLowerCase();

    // Skip results that appear to be parts/accessories
    const partKeywords = [
      'pièce', 'piece', 'pieces', 'pièces',
      'accessoire', 'accessory', 'accessories',
      'filtre', 'filter', 'huile', 'oil',
      'pneu', 'tire', 'tyre', 'roue', 'wheel',
      'batterie', 'battery',
      'phare', 'headlight', 'feu', 'light',
      'rétroviseur', 'mirror',
      'pare-choc', 'bumper', 'capot', 'hood',
      'amortisseur', 'shock', 'suspension',
      'freins', 'brake', 'plaquette', 'pad',
      'courroie', 'belt', 'durite', 'hose',
      'embrayage', 'clutch', 'joint', 'gasket',
      'échappement', 'exhaust', 'silencieux', 'muffler',
      'démarreur', 'starter', 'alternateur', 'alternator',
      'radiateur', 'radiator', 'thermostat',
      'bougie', 'spark plug', 'injecteur', 'injector',
      'carrosserie', 'body part',
      'kit ', 'lot de', 'set of', 'pack of',
      'compatible', 'pour ', 'for ',
    ];

    // Check if this looks like a part/accessory listing
    const isPart = partKeywords.some(kw => textLower.includes(kw));
    if (isPart) {
      console.log(`[SerpApi] Skipping part/accessory: "${result.title.slice(0, 50)}"`);
      return null;
    }

    // Match price patterns like "15 000 €", "15000€", "15.000 €"
    const pricePatterns = [
      /(\d{1,3}(?:[\s.,]\d{3})*)\s*€/,
      /€\s*(\d{1,3}(?:[\s.,]\d{3})*)/,
      /(\d{1,3}(?:[\s.,]\d{3})*)\s*euros?/i,
    ];

    let price: number | null = null;
    let priceString = '';

    for (const pattern of pricePatterns) {
      const match = textToSearch.match(pattern);
      if (match && match[1]) {
        // Clean up the price string and parse it
        const cleanPrice = match[1].replace(/[\s.]/g, '').replace(',', '.');
        price = parseFloat(cleanPrice);
        priceString = match[0];
        break;
      }
    }

    // Minimum price threshold for vehicles (cars/motorcycles should be at least €1500)
    const MIN_VEHICLE_PRICE = 1500;

    if (!price || price <= 0 || price < MIN_VEHICLE_PRICE) {
      // Skip results without price or with unrealistic vehicle prices
      return null;
    }

    // Extract source from URL
    let source = 'Unknown';
    try {
      const url = new URL(result.link);
      source = url.hostname.replace('www.', '');
    } catch {
      // Keep default
    }

    const relevanceScore = calculateRelevanceScore(query, result.title);

    // Require higher relevance for vehicles
    if (relevanceScore < 0.2) {
      console.log(`[SerpApi] Skipping low relevance vehicle (${relevanceScore}): "${result.title.slice(0, 50)}"`);
      return null;
    }

    return {
      title: result.title,
      price,
      priceString: priceString || `${price} €`,
      source,
      url: result.link,
      thumbnail: result.thumbnail,
      condition: 'used',
      relevanceScore,
    };
  }
}

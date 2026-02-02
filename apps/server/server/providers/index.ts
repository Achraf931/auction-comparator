import type { ShoppingProvider } from './base';
import { SerpApiProvider } from './serpapi';

export type { ShoppingProvider, ShoppingSearchOptions } from './base';

let provider: ShoppingProvider | null = null;

/**
 * Get the configured shopping provider
 */
export function getShoppingProvider(apiKey: string): ShoppingProvider {
  if (!provider || (provider as SerpApiProvider).isAvailable() !== Boolean(apiKey)) {
    provider = new SerpApiProvider(apiKey);
  }
  return provider;
}

/**
 * Domain configuration for self-healing extractor
 * Add new domains here with URL patterns and optional label hints
 */

export interface DomainConfig {
  /** Domain identifier */
  id: string;
  /** Display name */
  name: string;
  /** URL patterns to match */
  hostPatterns: RegExp[];
  /** Lot page URL patterns (path-based) */
  lotPagePatterns: RegExp[];
  /** Default locale */
  locale: string;
  /** Default currency */
  currency: string;
  /** Buyer's premium percentage (0-1) */
  buyerPremium: number;
  /** Additional positive label keywords for price detection */
  priceLabelsPositive?: string[];
  /** Additional negative label keywords for price detection */
  priceLabelsNegative?: string[];
}

export const DOMAIN_CONFIGS: DomainConfig[] = [
  {
    id: 'encheres-domaine',
    name: 'Enchères Domaine',
    hostPatterns: [/encheres-domaine\.gouv\.fr$/i],
    lotPagePatterns: [/^\/lot\//i],
    locale: 'fr',
    currency: 'EUR',
    buyerPremium: 0.15,
    priceLabelsPositive: ['enchère actuelle', 'prix courant'],
    priceLabelsNegative: ['adjugé'],
  },
  {
    id: 'moniteur-des-ventes',
    name: 'Moniteur des Ventes',
    hostPatterns: [/www\.moniteurdesventes\.com$/i, /moniteurdesventes\.com$/i],
    lotPagePatterns: [/^\/fr\/l\//i, /^\/en\/l\//i],
    locale: 'fr',
    currency: 'EUR',
    buyerPremium: 0.20,
    priceLabelsPositive: ['dernière enchère', 'enchère courante'],
    priceLabelsNegative: ['mise à prix initiale'],
  },
  // Existing domains can be added here for generic extraction
  {
    id: 'interencheres',
    name: 'Interenchères',
    hostPatterns: [/interencheres\.fr$/i, /interencheres\.com$/i],
    lotPagePatterns: [/\/lot-\d+/i, /\/vente\/.*\/\d+/i],
    locale: 'fr',
    currency: 'EUR',
    buyerPremium: 0.25,
  },
  {
    id: 'alcopa-auction',
    name: 'Alcopa Auction',
    hostPatterns: [/alcopa-auction\.fr$/i, /alcopa-auction\.com$/i],
    lotPagePatterns: [/\/voiture-occasion\/.+\/.+-\d+$/i, /\/utilitaire-occasion\/.+\/.+-\d+$/i],
    locale: 'fr',
    currency: 'EUR',
    buyerPremium: 0,
  },
]

/**
 * Get domain config for a given hostname
 */
export function getDomainConfig(hostname: string): DomainConfig | null {
  for (const config of DOMAIN_CONFIGS) {
    if (config.hostPatterns.some(p => p.test(hostname))) {
      return config
    }
  }
  return null
}

/**
 * Check if a URL is a lot page for the given domain config
 */
export function isLotPage(pathname: string, config: DomainConfig): boolean {
  return config.lotPagePatterns.some(p => p.test(pathname))
}

/**
 * Get all domain configs
 */
export function getAllDomainConfigs(): DomainConfig[] {
  return DOMAIN_CONFIGS
}

/**
 * Get all supported domains for manifest host_permissions
 */
export function getAllHostPatterns(): string[] {
  const patterns: string[] = []
  for (const config of DOMAIN_CONFIGS) {
    // Convert regex patterns to manifest match patterns
    for (const pattern of config.hostPatterns) {
      const source = pattern.source
        .replace(/\\\./g, '.')
        .replace(/\$$/, '')
        .replace(/^\^/, '')
      patterns.push(`*://*.${ source }/*`)
      patterns.push(`*://${ source }/*`)
    }
  }
  return [...new Set(patterns)]
}

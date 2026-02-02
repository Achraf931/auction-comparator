/**
 * Supported Sites Registry - Single source of truth for all auction sites
 */

export interface SiteConfig {
  /** Unique identifier for the site */
  id: string;
  /** Display name */
  label: string;
  /** Origins for Chrome permissions (used with chrome.permissions.request) */
  origins: string[];
  /** URL match patterns for content script injection */
  matchPatterns: string[];
  /** Hostname patterns for quick matching */
  hostnames: string[];
  /** Example URL for display */
  exampleUrl: string;
  /** Supported locales (optional) */
  locales?: string[];
  /** Site status */
  status: 'supported' | 'beta';
  /** Icon name (lucide icon) */
  icon: string;
  /** Short description */
  description: string;
}

/**
 * All supported auction sites
 */
export const SUPPORTED_SITES: SiteConfig[] = [
  {
    id: 'interencheres',
    label: 'Interenchères',
    origins: ['https://*.interencheres.fr/*', 'https://*.interencheres.com/*'],
    matchPatterns: ['*://*.interencheres.fr/*', '*://*.interencheres.com/*'],
    hostnames: ['interencheres.fr', 'interencheres.com', 'www.interencheres.fr', 'www.interencheres.com'],
    exampleUrl: 'https://www.interencheres.com/meubles-objets-art/lot/12345',
    status: 'supported',
    icon: 'i-lucide-gavel',
    description: 'French auction house network',
  },
  {
    id: 'alcopa',
    label: 'Alcopa Auction',
    origins: ['https://*.alcopa-auction.fr/*', 'https://*.alcopa-auction.com/*'],
    matchPatterns: ['*://*.alcopa-auction.fr/*', '*://*.alcopa-auction.com/*'],
    hostnames: ['alcopa-auction.fr', 'alcopa-auction.com', 'www.alcopa-auction.fr', 'www.alcopa-auction.com'],
    exampleUrl: 'https://www.alcopa-auction.fr/voiture-occasion/12345',
    status: 'supported',
    icon: 'i-lucide-car',
    description: 'Vehicle auctions',
  },
  {
    id: 'encheres-domaine',
    label: 'Enchères Domaine',
    origins: ['https://encheres-domaine.gouv.fr/*'],
    matchPatterns: ['*://*.encheres-domaine.gouv.fr/*'],
    hostnames: ['encheres-domaine.gouv.fr', 'www.encheres-domaine.gouv.fr'],
    exampleUrl: 'https://encheres-domaine.gouv.fr/vente/12345',
    status: 'supported',
    icon: 'i-lucide-landmark',
    description: 'French government auctions',
  },
  {
    id: 'moniteur-ventes',
    label: 'Moniteur des Ventes',
    origins: ['https://www.moniteurdesventes.com/*'],
    matchPatterns: ['*://*.moniteurdesventes.com/*'],
    hostnames: ['moniteurdesventes.com', 'www.moniteurdesventes.com'],
    exampleUrl: 'https://www.moniteurdesventes.com/vente/12345',
    status: 'supported',
    icon: 'i-lucide-store',
    description: 'French auction listings',
  },
  {
    id: 'agorastore',
    label: 'Agorastore',
    origins: ['https://www.agorastore.fr/*'],
    matchPatterns: ['*://*.agorastore.fr/*'],
    hostnames: ['agorastore.fr', 'www.agorastore.fr'],
    exampleUrl: 'https://www.agorastore.fr/vente-occasion/vehicules-legers-2-roues/vehicules-de-tourisme/peugeot-expert-1-6-hdi-120-cv-annee-2017-123-000-kms-407717.aspx',
    status: 'supported',
    icon: 'i-lucide-shopping-bag',
    description: 'Public sector surplus sales',
  },
  {
    id: 'auctelia',
    label: 'Auctelia',
    origins: ['https://www.auctelia.com/*'],
    matchPatterns: ['*://*.auctelia.com/*'],
    hostnames: ['auctelia.com', 'www.auctelia.com'],
    exampleUrl: 'https://www.auctelia.com/fr/materiel-occasion/tondeuse-autoportee-daewoo-daxrm224/rZ6V9IXb4_u4IBZm_elzU',
    locales: ['fr', 'en', 'nl'],
    status: 'supported',
    icon: 'i-lucide-tractor',
    description: 'Industrial equipment auctions',
  },
];

/**
 * Get all origins for optional_host_permissions
 */
export function getAllOrigins(): string[] {
  return SUPPORTED_SITES.flatMap(site => site.origins);
}

/**
 * Get all match patterns for content script matching
 */
export function getAllMatchPatterns(): string[] {
  return SUPPORTED_SITES.flatMap(site => site.matchPatterns);
}

/**
 * Find site config by URL
 */
export function getSiteByUrl(url: string): SiteConfig | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    for (const site of SUPPORTED_SITES) {
      for (const pattern of site.hostnames) {
        if (hostname === pattern || hostname.endsWith('.' + pattern)) {
          return site;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Find site config by ID
 */
export function getSiteById(id: string): SiteConfig | null {
  return SUPPORTED_SITES.find(site => site.id === id) || null;
}

/**
 * Get origin from URL
 */
export function getOriginFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.origin;
  } catch {
    return null;
  }
}

/**
 * Check if URL matches any supported site
 */
export function isSupportedUrl(url: string): boolean {
  return getSiteByUrl(url) !== null;
}

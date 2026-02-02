/**
 * Lot page detection using URL patterns
 * No DOM selectors required - purely URL-based
 */

import { getDomainConfig, isLotPage as checkLotPage, type DomainConfig } from './domainConfig'

export interface LotPageInfo {
  isLotPage: boolean;
  domain: string;
  config: DomainConfig | null;
  pathname: string;
  url: string;
}

/**
 * Detect if the current page is a lot page
 */
export function detectLotPage(url: string = window.location.href): LotPageInfo {
  const parsed = new URL(url)
  const { hostname } = parsed
  const { pathname } = parsed

  const config = getDomainConfig(hostname)

  if (!config) {
    return {
      isLotPage: false,
      domain: hostname,
      config: null,
      pathname,
      url,
    }
  }

  const isLot = checkLotPage(pathname, config)

  return {
    isLotPage: isLot,
    domain: hostname,
    config,
    pathname,
    url,
  }
}

/**
 * Check if domain is in our supported list
 */
export function isSupportedDomain(hostname: string = window.location.hostname): boolean {
  return getDomainConfig(hostname) !== null
}

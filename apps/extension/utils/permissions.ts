/**
 * Chrome Permissions Helpers for optional_host_permissions
 */

import { getSiteByUrl, getOriginFromUrl, type SiteConfig } from './sites';

/**
 * Check if we have permission for a specific origin
 */
export async function hasHostPermission(origin: string): Promise<boolean> {
  try {
    // Normalize origin to match pattern format
    const pattern = origin.endsWith('/') ? origin + '*' : origin + '/*';

    const result = await chrome.permissions.contains({
      origins: [pattern],
    });
    return result;
  } catch (error) {
    console.error('[Permissions] Error checking permission:', error);
    return false;
  }
}

/**
 * Check if we have permission for a URL
 */
export async function hasPermissionForUrl(url: string): Promise<boolean> {
  const origin = getOriginFromUrl(url);
  if (!origin) return false;
  return hasHostPermission(origin);
}

/**
 * Request host permission for an origin
 */
export async function requestHostPermission(origin: string): Promise<boolean> {
  try {
    // Normalize origin to match pattern format
    const pattern = origin.endsWith('/') ? origin + '*' : origin + '/*';

    const granted = await chrome.permissions.request({
      origins: [pattern],
    });

    console.log(`[Permissions] Permission ${granted ? 'granted' : 'denied'} for ${origin}`);
    return granted;
  } catch (error) {
    console.error('[Permissions] Error requesting permission:', error);
    return false;
  }
}

/**
 * Request permission for a site's origins
 */
export async function requestSitePermission(site: SiteConfig): Promise<boolean> {
  try {
    const granted = await chrome.permissions.request({
      origins: site.origins,
    });

    console.log(`[Permissions] Permission ${granted ? 'granted' : 'denied'} for site ${site.id}`);
    return granted;
  } catch (error) {
    console.error('[Permissions] Error requesting site permission:', error);
    return false;
  }
}

/**
 * Check if we have permission for a site
 */
export async function hasSitePermission(site: SiteConfig): Promise<boolean> {
  try {
    const result = await chrome.permissions.contains({
      origins: site.origins,
    });
    return result;
  } catch (error) {
    console.error('[Permissions] Error checking site permission:', error);
    return false;
  }
}

/**
 * Remove host permission for an origin
 */
export async function removeHostPermission(origin: string): Promise<boolean> {
  try {
    const pattern = origin.endsWith('/') ? origin + '*' : origin + '/*';

    const removed = await chrome.permissions.remove({
      origins: [pattern],
    });

    console.log(`[Permissions] Permission ${removed ? 'removed' : 'not removed'} for ${origin}`);
    return removed;
  } catch (error) {
    console.error('[Permissions] Error removing permission:', error);
    return false;
  }
}

/**
 * Get the current tab's URL and site info
 */
export async function getCurrentTabInfo(): Promise<{
  url: string | null;
  origin: string | null;
  site: SiteConfig | null;
  hasPermission: boolean;
}> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url || null;

    if (!url) {
      return { url: null, origin: null, site: null, hasPermission: false };
    }

    const origin = getOriginFromUrl(url);
    const site = getSiteByUrl(url);
    const hasPermission = origin ? await hasHostPermission(origin) : false;

    return { url, origin, site, hasPermission };
  } catch (error) {
    console.error('[Permissions] Error getting current tab info:', error);
    return { url: null, origin: null, site: null, hasPermission: false };
  }
}

/**
 * Inject content script into a tab
 */
export async function injectContentScript(tabId: number): Promise<boolean> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/content.js'],
    });

    // Also inject CSS
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content-scripts/content.css'],
    });

    console.log(`[Permissions] Content script injected into tab ${tabId}`);
    return true;
  } catch (error) {
    console.error('[Permissions] Error injecting content script:', error);
    return false;
  }
}

/**
 * Check and request permission for current tab, then inject content script
 */
export async function enableSiteOnCurrentTab(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { url, origin, site, hasPermission } = await getCurrentTabInfo();

    if (!url || !origin) {
      return { success: false, error: 'No active tab' };
    }

    if (!site) {
      return { success: false, error: 'Site not supported' };
    }

    // Request permission if needed
    let permitted = hasPermission;
    if (!permitted) {
      permitted = await requestSitePermission(site);
      if (!permitted) {
        return { success: false, error: 'Permission denied by user' };
      }
    }

    // Get the current tab ID
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      return { success: false, error: 'No tab ID' };
    }

    // Inject content script
    const injected = await injectContentScript(tab.id);
    if (!injected) {
      return { success: false, error: 'Failed to inject content script' };
    }

    return { success: true };
  } catch (error) {
    console.error('[Permissions] Error enabling site:', error);
    return { success: false, error: String(error) };
  }
}

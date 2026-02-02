import type { MeResponse, UserInfo, SubscriptionInfo, FeatureFlags } from '@auction-comparator/shared';

const EXTENSION_ID_KEY = 'auction_ext_id';

/**
 * Get extension ID from URL parameter (set when opening login from extension)
 */
function getExtensionIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('ext');
}

/**
 * Store extension ID for later use (e.g., logout sync)
 */
function storeExtensionId(extensionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EXTENSION_ID_KEY, extensionId);
}

/**
 * Get stored extension ID
 */
function getStoredExtensionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(EXTENSION_ID_KEY);
}

/**
 * Clear stored extension ID
 */
function clearStoredExtensionId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(EXTENSION_ID_KEY);
}

/**
 * Send auth token to the browser extension
 */
async function notifyExtension(token: string): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    console.log('[Auth] Chrome extension API not available');
    return false;
  }

  const extensionId = getExtensionIdFromUrl();
  if (!extensionId) {
    console.log('[Auth] No extension ID in URL, skipping notification');
    return false;
  }

  try {
    const response = await chrome.runtime.sendMessage(extensionId, {
      type: 'AUTH_TOKEN',
      token,
    });
    if (response?.success) {
      console.log('[Auth] Extension notified successfully');
      // Store extension ID for later (e.g., logout sync)
      storeExtensionId(extensionId);
      return true;
    }
  } catch (error) {
    console.log('[Auth] Could not notify extension:', error);
  }

  return false;
}

/**
 * Notify extension to logout
 */
async function notifyExtensionLogout(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return;
  }

  const extensionId = getStoredExtensionId();
  if (!extensionId) {
    return;
  }

  try {
    await chrome.runtime.sendMessage(extensionId, {
      type: 'AUTH_LOGOUT',
    });
    console.log('[Auth] Extension logout notification sent');
  } catch (error) {
    console.log('[Auth] Could not notify extension logout:', error);
  } finally {
    clearStoredExtensionId();
  }
}

interface AuthState {
  user: UserInfo | null;
  subscription: SubscriptionInfo | null;
  features: FeatureFlags | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

export function useAuth() {
  const state = useState<AuthState>('auth', () => ({
    user: null,
    subscription: null,
    features: null,
    loading: false,
    initialized: false,
    error: null,
  }));

  const isAuthenticated = computed(() => !!state.value.user);
  const hasActiveSubscription = computed(() => {
    const status = state.value.subscription?.status;
    return status === 'active' || status === 'trialing';
  });

  async function fetchUser() {
    // Prevent multiple simultaneous fetches
    if (state.value.loading) return;

    state.value.loading = true;
    state.value.error = null;

    try {
      // Get headers from incoming request (for SSR cookie forwarding)
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : {};

      const response = await $fetch<MeResponse>('/api/me', {
        credentials: 'include',
        headers,
      });

      state.value.user = response.user;
      state.value.subscription = response.subscription;
      state.value.features = response.features;
    } catch (error: any) {
      if (error.statusCode !== 401) {
        state.value.error = error.message || 'Failed to fetch user';
      }
      state.value.user = null;
      state.value.subscription = null;
      state.value.features = null;
    } finally {
      state.value.loading = false;
      state.value.initialized = true;
    }
  }

  async function login(email: string, password: string) {
    state.value.loading = true;
    state.value.error = null;

    try {
      const response = await $fetch<{ success: true; apiToken?: string }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
        credentials: 'include',
      });

      await fetchUser();

      // Notify the browser extension with the API token
      if (response.apiToken) {
        notifyExtension(response.apiToken);
      }

      return true;
    } catch (error: any) {
      state.value.error = error.data?.error?.message || 'Login failed';
      state.value.loading = false;
      return false;
    }
  }

  async function register(email: string, password: string) {
    state.value.loading = true;
    state.value.error = null;

    try {
      const response = await $fetch<{ success: true; apiToken?: string }>('/api/auth/register', {
        method: 'POST',
        body: { email, password },
        credentials: 'include',
      });

      await fetchUser();

      // Notify the browser extension with the API token
      if (response.apiToken) {
        notifyExtension(response.apiToken);
      }

      return { success: true, apiToken: response.apiToken };
    } catch (error: any) {
      state.value.error = error.data?.error?.message || 'Registration failed';
      state.value.loading = false;
      return { success: false, apiToken: undefined };
    }
  }

  async function logout() {
    // Notify extension to logout (fire and forget)
    notifyExtensionLogout();

    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore errors on logout
    }

    state.value.user = null;
    state.value.subscription = null;
    state.value.features = null;

    navigateTo('/login');
  }

  async function createCheckoutSession(priceId: string) {
    try {
      const response = await $fetch<{ success: true; checkoutUrl: string }>('/api/billing/create-checkout-session', {
        method: 'POST',
        credentials: 'include',
        body: { priceId },
      });

      window.location.href = response.checkoutUrl;
    } catch (error: any) {
      state.value.error = error.data?.error?.message || 'Failed to create checkout session';
    }
  }

  async function createPortalSession() {
    try {
      const response = await $fetch<{ success: true; portalUrl: string }>('/api/billing/create-portal-session', {
        method: 'POST',
        credentials: 'include',
      });

      window.location.href = response.portalUrl;
    } catch (error: any) {
      state.value.error = error.data?.error?.message || 'Failed to create portal session';
    }
  }

  /**
   * Connect the browser extension by creating a token and sending it
   */
  async function connectExtension(extensionId: string): Promise<boolean> {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      console.log('[Auth] Chrome extension API not available');
      state.value.error = 'Chrome extension API not available. Make sure you are using Chrome.';
      return false;
    }

    try {
      // Create a token specifically for extension connection
      const response = await $fetch<{ success: true; token: string }>('/api/auth/connect-extension', {
        method: 'POST',
        credentials: 'include',
      });

      console.log('[Auth] Token created, sending to extension:', extensionId);

      // Send to extension
      const result = await chrome.runtime.sendMessage(extensionId, {
        type: 'AUTH_TOKEN',
        token: response.token,
      });

      console.log('[Auth] Extension response:', result);

      if (result?.success) {
        console.log('[Auth] Extension connected successfully');
        return true;
      } else {
        state.value.error = 'Extension did not acknowledge the connection';
      }
    } catch (error: any) {
      console.error('[Auth] Failed to connect extension:', error);
      state.value.error = error.message || 'Failed to connect extension';
    }

    return false;
  }

  return {
    state,
    isAuthenticated,
    hasActiveSubscription,
    fetchUser,
    login,
    register,
    logout,
    createCheckoutSession,
    createPortalSession,
    connectExtension,
  };
}

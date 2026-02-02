import { createI18n } from 'vue-i18n'

const messages = {
  en: {
    // Header
    priceCompare: 'Price Compare',

    // Auth
    checkingAccount: 'Checking account...',
    signInToCompare: 'Sign in to compare prices',
    signIn: 'Sign In',
    signOut: 'Sign out',

    // Subscription
    subscriptionRequired: 'Subscription Required',
    subscribeToUnlock: 'Subscribe to unlock price comparisons',
    subscribeNow: 'Subscribe Now',

    // Loading & Errors
    searchingPrices: 'Searching web prices...',
    retry: 'Retry',
    comparePrices: 'Compare Prices',
    loading: 'Loading...',

    // Price Panel
    auctionTotal: 'Auction total (w/ fees)',
    webMin: 'Web Min',
    median: 'Median',
    webMax: 'Web Max',
    save: 'Save',
    pay: 'Pay',
    vsWebMin: 'vs web min',
    basedOn: 'Based on {count} web listings',

    // Confidence
    highConfidence: 'High confidence',
    mediumConfidence: 'Medium confidence',
    lowConfidence: 'Low confidence',
    noConfidenceData: 'No confidence data',

    // Verdict
    worthIt: 'Worth it',
    notWorthIt: 'Not worth it',
    borderline: 'Borderline',

    // Settings
    language: 'Language',
    english: 'English',
    french: 'French',

    // Web Results
    topWebListings: 'Top web listings',
    match: 'match',
    freeShipping: 'Free shipping',

    // Cache Status
    source: 'Source',
    cacheStrict: 'Cache (exact)',
    cacheLoose: 'Cache (similar)',
    freshFetch: 'Fresh',
    expired: 'Expired',
    expiresInHours: 'Expires in {hours}h',
    expiresInMinutes: 'Expires in {minutes}m',
    fetchedHoursAgo: 'Fetched {hours}h ago',
    fetchedMinutesAgo: 'Fetched {minutes}m ago',
    fetchedJustNow: 'Just fetched',
    forceRefreshHint: 'Force refresh (uses quota)',

    // Quota
    freshFetches: 'Fresh fetches',
    daysRemaining: '{days} days left',
    quotaExceeded: 'Quota Exceeded',
    quotaExceededHint: 'You have used all your fresh fetches for this month. Upgrade your plan for more.',
    upgradePlan: 'Upgrade Plan',

    // Free tier
    freeTrial: 'Free Trial',
    freeSearchesRemaining: '{count} free searches left',
    freeExhausted: 'Free trial ended',
    freeExhaustedHint: 'Your {total} free searches have been used. Subscribe to continue.',
    cachedResultFree: 'Cached result (free)',
    upgradeNow: 'Subscribe Now',

    // Popup Settings
    extensionEnabled: 'Extension enabled',
    extensionEnabledDesc: 'Compare auction prices with web prices',
    enableForSite: 'Enable for {domain}',
    showOverlayOnSite: 'Show overlay on this site',
    apiServer: 'API Server',
    marginThreshold: 'Margin threshold: {percent}%',
    marginThresholdDesc: 'Auction must be this % below web min to be "worth it"',
    languageDesc: 'Extension display language',
    account: 'Account',
    checking: 'Checking...',
    poweredBy: 'Powered by SerpApi',
  },
  fr: {
    // Header
    priceCompare: 'Comparateur de Prix',

    // Auth
    checkingAccount: 'Vérification du compte...',
    signInToCompare: 'Connectez-vous pour comparer les prix',
    signIn: 'Se connecter',
    signOut: 'Déconnexion',

    // Subscription
    subscriptionRequired: 'Abonnement Requis',
    subscribeToUnlock: 'Abonnez-vous pour débloquer les comparaisons de prix',
    subscribeNow: "S'abonner",

    // Loading & Errors
    searchingPrices: 'Recherche des prix web...',
    retry: 'Réessayer',
    comparePrices: 'Comparer les Prix',
    loading: 'Chargement...',

    // Price Panel
    auctionTotal: 'Total enchère (frais inclus)',
    webMin: 'Min Web',
    median: 'Médian',
    webMax: 'Max Web',
    save: 'Économisez',
    pay: 'Payez',
    vsWebMin: 'vs min web',
    basedOn: 'Basé sur {count} annonces web',

    // Confidence
    highConfidence: 'Confiance élevée',
    mediumConfidence: 'Confiance moyenne',
    lowConfidence: 'Confiance faible',
    noConfidenceData: 'Pas de données de confiance',

    // Verdict
    worthIt: 'Bonne affaire',
    notWorthIt: 'Pas rentable',
    borderline: 'À la limite',

    // Settings
    language: 'Langue',
    english: 'Anglais',
    french: 'Français',

    // Web Results
    topWebListings: 'Meilleures annonces web',
    match: 'pertinence',
    freeShipping: 'Livraison gratuite',

    // Cache Status
    source: 'Source',
    cacheStrict: 'Cache (exact)',
    cacheLoose: 'Cache (similaire)',
    freshFetch: 'Nouveau',
    expired: 'Expiré',
    expiresInHours: 'Expire dans {hours}h',
    expiresInMinutes: 'Expire dans {minutes}m',
    fetchedHoursAgo: 'Récupéré il y a {hours}h',
    fetchedMinutesAgo: 'Récupéré il y a {minutes}m',
    fetchedJustNow: 'Vient d\'être récupéré',
    forceRefreshHint: 'Forcer le rafraîchissement (utilise le quota)',

    // Quota
    freshFetches: 'Recherches fraîches',
    daysRemaining: '{days} jours restants',
    quotaExceeded: 'Quota Dépassé',
    quotaExceededHint: 'Vous avez utilisé toutes vos recherches fraîches ce mois-ci. Passez à un plan supérieur.',
    upgradePlan: 'Changer de Plan',

    // Free tier
    freeTrial: 'Essai gratuit',
    freeSearchesRemaining: '{count} recherches gratuites restantes',
    freeExhausted: 'Essai gratuit terminé',
    freeExhaustedHint: 'Vos {total} recherches gratuites ont été utilisées. Abonnez-vous pour continuer.',
    cachedResultFree: 'Résultat en cache (gratuit)',
    upgradeNow: "S'abonner maintenant",

    // Popup Settings
    extensionEnabled: 'Extension activée',
    extensionEnabledDesc: 'Comparer les prix des enchères avec les prix web',
    enableForSite: 'Activer pour {domain}',
    showOverlayOnSite: 'Afficher le panneau sur ce site',
    apiServer: 'Serveur API',
    marginThreshold: 'Seuil de marge : {percent}%',
    marginThresholdDesc: 'L\'enchère doit être ce % en dessous du min web pour être "rentable"',
    languageDesc: 'Langue d\'affichage de l\'extension',
    account: 'Compte',
    checking: 'Vérification...',
    poweredBy: 'Propulsé par SerpApi',
  },
}

export const i18n = createI18n({
  legacy: false,
  locale: 'fr', // Default to French for French auction sites
  fallbackLocale: 'en',
  messages,
})

/**
 * Set locale and persist to chrome.storage + notify all tabs
 */
export async function setLocale(locale: 'en' | 'fr') {
  i18n.global.locale.value = locale

  // Store in chrome.storage for sync across all extension contexts
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ locale })

    // Notify all content scripts to update their locale
    try {
      const tabs = await chrome.tabs.query({})
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'LOCALE_CHANGED', locale }).catch(() => {
            // Ignore errors for tabs without content script
          })
        }
      }
    } catch {
      // Ignore errors
    }
  }

  // Also store in localStorage as fallback
  localStorage.setItem('auction-comparator-locale', locale)
}

/**
 * Get stored locale from chrome.storage or localStorage
 */
export async function getStoredLocaleAsync(): Promise<'en' | 'fr'> {
  // Try chrome.storage first
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const result = await chrome.storage.local.get('locale')
      if (result.locale === 'en' || result.locale === 'fr') {
        return result.locale
      }
    } catch {
      // Fall through to localStorage
    }
  }

  // Fallback to localStorage
  const stored = localStorage.getItem('auction-comparator-locale')
  if (stored === 'en' || stored === 'fr') {
    return stored
  }

  // Auto-detect from browser
  const browserLang = navigator.language.split('-')[0]
  return browserLang === 'fr' ? 'fr' : 'en'
}

/**
 * Sync version for initial load (uses localStorage only)
 */
export function getStoredLocale(): 'en' | 'fr' {
  const stored = localStorage.getItem('auction-comparator-locale')
  if (stored === 'en' || stored === 'fr') {
    return stored
  }
  // Auto-detect from browser
  const browserLang = navigator.language.split('-')[0]
  return browserLang === 'fr' ? 'fr' : 'en'
}

/**
 * Initialize locale (async version)
 */
export async function initLocaleAsync() {
  const locale = await getStoredLocaleAsync()
  i18n.global.locale.value = locale
  // Also sync to localStorage
  localStorage.setItem('auction-comparator-locale', locale)
}

/**
 * Initialize locale (sync version for immediate use)
 */
export function initLocale() {
  const locale = getStoredLocale()
  i18n.global.locale.value = locale
}

/**
 * Listen for locale changes from other extension contexts
 */
export function listenForLocaleChanges() {
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'LOCALE_CHANGED' && (message.locale === 'en' || message.locale === 'fr')) {
        i18n.global.locale.value = message.locale
        localStorage.setItem('auction-comparator-locale', message.locale)
      }
    })
  }
}

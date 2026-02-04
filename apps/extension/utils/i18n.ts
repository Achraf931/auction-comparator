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

    // Credits / Comparisons
    credits: 'Comparisons',
    comparison: 'comparison',
    comparisons: 'comparisons',
    freeCredit: 'free',
    noCredits: 'No Comparisons',
    noCreditsHint: 'Purchase comparisons to continue comparing prices.',
    noCreditsRemaining: 'No comparisons remaining',
    buyCredits: 'Buy Comparisons',
    buyComparisons: 'Buy Comparisons',
    creditConsumed: '1 comparison used',
    cacheHitFree: 'Cache hit (free)',

    // Legacy quota (for backwards compatibility)
    freshFetches: 'Fresh fetches',
    daysRemaining: '{days} days left',
    quotaExceeded: 'Quota Exceeded',
    quotaExceededHint: 'You have used all your fresh fetches for this month. Upgrade your plan for more.',
    upgradePlan: 'Upgrade Plan',

    // Free tier (updated for credits)
    freeTrial: 'Free Trial',
    freeSearchesRemaining: '{count} free searches left',
    freeExhausted: 'Free credit used',
    freeExhaustedHint: 'Your free credit has been used. Purchase credits to continue.',
    cachedResultFree: 'Cached result (free)',
    upgradeNow: 'Buy Credits',

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

    // Sites Management
    currentSite: 'Current site',
    supportedSites: 'Supported sites',
    enableOnThisSite: 'Enable on this site',
    showOnThisSite: 'Show on this site',
    notSupported: 'Not a supported auction site',
    enable: 'Enable',

    // Overlay Actions
    hideOnThisSite: 'Hide on this website',
    hideConfirm: 'Hide extension?',
    hideConfirmDesc: 'The overlay will be hidden on this website. You can re-enable it from the extension popup.',
    cancel: 'Cancel',
    hide: 'Hide',
  },
  fr: {
    // Header
    priceCompare: 'Comparateur de Prix',

    // Auth
    checkingAccount: 'Vérification du compte...',
    signInToCompare: 'Connectez-vous pour comparer les prix',
    signIn: 'Se connecter',
    signOut: 'Déconnexion',

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

    // Credits / Comparisons
    credits: 'Comparaisons',
    comparison: 'comparaison',
    comparisons: 'comparaisons',
    freeCredit: 'gratuite',
    noCredits: 'Plus de comparaisons',
    noCreditsHint: 'Achetez des comparaisons pour continuer à comparer les prix.',
    noCreditsRemaining: 'Plus de comparaisons disponibles',
    buyCredits: 'Acheter des comparaisons',
    buyComparisons: 'Acheter des comparaisons',
    creditConsumed: '1 comparaison utilisée',
    cacheHitFree: 'Cache (gratuit)',

    // Legacy quota (for backwards compatibility)
    freshFetches: 'Recherches fraîches',
    daysRemaining: '{days} jours restants',
    quotaExceeded: 'Quota Dépassé',
    quotaExceededHint: 'Vous avez utilisé toutes vos recherches fraîches ce mois-ci. Passez à un plan supérieur.',
    upgradePlan: 'Changer de Plan',

    // Free tier (updated for credits)
    freeTrial: 'Essai gratuit',
    freeSearchesRemaining: '{count} recherches gratuites restantes',
    freeExhausted: 'Crédit gratuit utilisé',
    freeExhaustedHint: 'Votre crédit gratuit a été utilisé. Achetez des crédits pour continuer.',
    cachedResultFree: 'Résultat en cache (gratuit)',
    upgradeNow: 'Acheter des crédits',

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

    // Sites Management
    currentSite: 'Site actuel',
    supportedSites: 'Sites supportés',
    enableOnThisSite: 'Activer sur ce site',
    showOnThisSite: 'Afficher sur ce site',
    notSupported: 'Site d\'enchères non supporté',
    enable: 'Activer',

    // Overlay Actions
    hideOnThisSite: 'Masquer sur ce site',
    hideConfirm: 'Masquer l\'extension ?',
    hideConfirmDesc: 'Le panneau sera masqué sur ce site. Vous pouvez le réactiver depuis le popup de l\'extension.',
    cancel: 'Annuler',
    hide: 'Masquer',
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

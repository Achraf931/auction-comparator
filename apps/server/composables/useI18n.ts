const messages = {
  en: {
    // Common
    signIn: 'Sign In',
    signOut: 'Sign Out',
    signUp: 'Sign Up',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    loading: 'Loading...',
    cancel: 'Cancel',
    save: 'Save',

    // Login page
    welcomeBack: 'Welcome Back',
    signInToAccount: 'Sign in to your account',
    signInToConnect: 'Sign in to connect your extension',
    signInConnectExtension: 'Sign In & Connect Extension',
    noAccount: "Don't have an account?",
    createOne: 'Create one',

    // Register page
    createAccount: 'Create Account',
    getStarted: 'Get started with Auction Comparator',
    createToConnect: 'Create an account to connect your extension',
    createConnectExtension: 'Create Account & Connect',
    passwordMinLength: 'Password must be at least 8 characters',
    passwordsNoMatch: 'Passwords do not match',
    alreadyHaveAccount: 'Already have an account?',

    // Extension connected
    extensionConnected: 'Extension Connected!',
    accountCreated: 'Account Created!',
    canCloseTab: 'You can close this tab and return to the auction page.',
    extensionNowConnected: 'Your browser extension is now connected.',
    goToAccount: 'Go to Account',

    // Account page
    account: 'Account',
    profile: 'Profile',
    subscription: 'Subscription',
    profileInfo: 'Profile Information',
    memberSince: 'Member since',
    accountId: 'Account ID',

    // Subscription
    extensionReady: 'Extension Ready',
    extensionConnectedReady: 'Your extension is connected and ready to use',
    subscriptionRequired: 'Subscription Required',
    subscribeToStart: 'Subscribe to start using the extension',
    viewPlans: 'View Plans',
    yourSubscription: 'Your Subscription',
    annualBilling: 'Annual billing',
    monthlyBilling: 'Monthly billing',
    renewsOn: 'Renews on',
    endsOn: 'Ends on',
    subscriptionEnding: 'Subscription ending',
    subscriptionWontRenew: 'Your subscription will not renew. Click "Manage Subscription" to reactivate.',
    manageSubscription: 'Manage Subscription',
    updatePaymentMethod: 'Update payment method, change plan, or cancel your subscription.',
    subscribeNow: 'Subscribe Now',

    // Pricing
    monthly: 'Monthly',
    yearly: 'Yearly',
    saveUpTo: 'Save up to {percent}%',
    freshChecksMonth: '{count} fresh checks/month',
    mostPopular: 'Most Popular',
    cancelAnytime: 'Cancel anytime. No questions asked.',

    // Checkout
    checkoutSuccess: 'Subscription activated!',
    checkoutSuccessDesc: 'Your subscription is now active. You can start using the extension.',
    checkoutCancelled: 'Checkout cancelled',
    checkoutCancelledDesc: 'Your subscription was not completed. You can try again below.',

    // History page
    history: 'History',
    searchHistory: 'Search History',
    searchHistoryDesc: 'View all your past price comparisons',
    noSearchesYet: 'No searches yet',
    noSearchesYetDesc: 'Your comparison history will appear here once you start using the extension.',
    filters: 'Filters',
    allSites: 'All sites',
    allSources: 'All sources',
    fromCache: 'From cache',
    freshSearch: 'Fresh search',
    startDate: 'Start date',
    endDate: 'End date',
    clearFilters: 'Clear filters',
    search: 'Search',
    showing: 'Showing',
    of: 'of',
    results: 'results',
    previous: 'Previous',
    next: 'Next',
    auctionPrice: 'Auction price',
    marketPrice: 'Market price',
    median: 'Median',
    min: 'Min',
    max: 'Max',
    worthIt: 'Worth it',
    borderline: 'Borderline',
    notWorthIt: 'Not worth it',
    cached: 'Cached',
    fresh: 'Fresh',
    viewDetails: 'View details',
    openAuction: 'Open auction',
    searchedOn: 'Searched on',
    priceComparison: 'Price comparison',
    belowMarket: 'below market',
    aboveMarket: 'above market',
    atMarket: 'at market price',

    // Free tier
    freeTrial: 'Free Trial',
    freeTrialDesc: '{count} free web searches',
    freeSearchesRemaining: '{count} free searches remaining',
    freeSearchExplanation: 'One search = one price check on the internet. Recent results are reused automatically.',
    freeExhausted: 'Free trial ended',
    freeExhaustedDesc: 'Your {count} free searches have been used. Subscribe to continue.',
    cachedResult: 'Cached result',
    cachedResultFree: 'This is a cached result (free)',
    upgradeNow: 'Upgrade Now',

    // Landing page - Hero
    smartAuctionPriceAnalysis: 'Smart Auction Price Analysis',
    heroTitle1: 'Never Overpay at',
    heroTitle2: 'Auctions',
    heroTitle3: 'Again',
    heroDescription: 'Our browser extension instantly compares auction prices with real market prices. Know if you\'re getting a deal or being overcharged before you place your bid.',
    getStartedFree: 'Get Started Free',

    // Landing page - Stats
    auctionSites: 'Auction Sites',
    realTime: 'Real-time',
    priceUpdates: 'Price Updates',
    languages: 'Languages',

    // Landing page - Demo preview
    priceComparisonTitle: 'Price Comparison',
    youSave: 'You Save',
    goodDealBid: 'Good Deal - Bid!',

    // Landing page - How it works
    howItWorks: 'How It Works',
    howItWorksDesc: 'Get started in minutes. No complicated setup required.',
    step1Title: 'Install the Extension',
    step1Desc: 'Add our Chrome extension to your browser with one click.',
    step2Title: 'Browse Auctions',
    step2Desc: 'Visit any supported auction site and browse items as usual.',
    step3Title: 'See Price Comparisons',
    step3Desc: 'Our overlay shows real market prices and a clear verdict automatically.',

    // Landing page - Features
    everythingYouNeed: 'Everything You Need',
    everythingYouNeedDesc: 'Powerful features to help you make smarter auction decisions.',
    featureRealTimeTitle: 'Real-Time Price Analysis',
    featureRealTimeDesc: 'Instantly compare auction prices with current market prices from major online retailers and marketplaces.',
    featureSmartBuyTitle: 'Smart Buy Recommendations',
    featureSmartBuyDesc: 'Get clear verdicts on whether to bid or pass, based on comprehensive market data analysis.',
    featureBrowserTitle: 'Seamless Browser Integration',
    featureBrowserDesc: 'Works directly on auction sites with a non-intrusive overlay. No copy-pasting or tab switching.',
    featureFastTitle: 'Lightning Fast',
    featureFastDesc: 'Results in seconds. See price comparisons before the bidding ends.',
    featureSecureTitle: 'Secure & Private',
    featureSecureDesc: 'Your browsing data stays local. We only send product info for price comparison.',
    featureMultiLangTitle: 'Multi-Language Support',
    featureMultiLangDesc: 'Available in English and French with automatic language detection.',

    // Landing page - Supported sites
    supportedAuctionSites: 'Supported Auction Sites',
    supportedAuctionSitesDesc: 'Works with major French auction platforms. More sites coming soon.',

    // Landing page - Pricing
    simpleTransparentPricing: 'Simple, Transparent Pricing',
    pricingDesc: 'Choose the plan that fits your auction hunting style.',
    starterPlan: 'Starter',
    starterPlanDesc: 'For casual buyers',
    proPlan: 'Pro',
    proPlanDesc: 'For regular hunters',
    businessPlan: 'Business',
    businessPlanDesc: 'For power users',
    perMonth: '/month',
    allAuctionSites: 'All auction sites',
    unlimitedCacheHits: 'Unlimited cache hits',
    basicSupport: 'Basic support',
    prioritySupport: 'Priority support',
    premiumSupport: 'Premium support',
    apiAccessComingSoon: 'API access (coming soon)',
    getStarted: 'Get Started',
    saveAnnualBilling: 'Save up to 30% with annual billing. Cancel anytime.',

    // Landing page - FAQ
    faq: 'Frequently Asked Questions',
    faqQuestion1: 'How does the price comparison work?',
    faqAnswer1: 'Our extension analyzes the auction item details and searches major online marketplaces to find similar products. We then calculate the average market price and compare it to the auction price including fees.',
    faqQuestion2: 'Which browsers are supported?',
    faqAnswer2: 'Currently, our extension works on Google Chrome and other Chromium-based browsers like Edge, Brave, and Opera.',
    faqQuestion3: 'Is my data safe?',
    faqAnswer3: 'Absolutely. We only send product information (title, brand, model) to our servers for price lookup. We never track your browsing history or store personal data.',
    faqQuestion4: 'Can I cancel my subscription anytime?',
    faqAnswer4: 'Yes, you can cancel your subscription at any time from your account page. No questions asked, no hidden fees.',

    // Landing page - Final CTA
    readyToSave: 'Ready to Save Money on Auctions?',
    joinSmartBidders: 'Join thousands of smart bidders who never overpay at auctions.',
    getStartedNow: 'Get Started Now',
    goToDashboard: 'Go to Dashboard',
  },
  fr: {
    // Common
    signIn: 'Se connecter',
    signOut: 'Déconnexion',
    signUp: "S'inscrire",
    email: 'Email',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    loading: 'Chargement...',
    cancel: 'Annuler',
    save: 'Enregistrer',

    // Login page
    welcomeBack: 'Bon retour',
    signInToAccount: 'Connectez-vous à votre compte',
    signInToConnect: 'Connectez-vous pour relier votre extension',
    signInConnectExtension: 'Se connecter et relier l\'extension',
    noAccount: "Vous n'avez pas de compte ?",
    createOne: 'Créer un compte',

    // Register page
    createAccount: 'Créer un compte',
    getStarted: 'Commencez avec Auction Comparator',
    createToConnect: 'Créez un compte pour relier votre extension',
    createConnectExtension: 'Créer un compte et relier',
    passwordMinLength: 'Le mot de passe doit contenir au moins 8 caractères',
    passwordsNoMatch: 'Les mots de passe ne correspondent pas',
    alreadyHaveAccount: 'Vous avez déjà un compte ?',

    // Extension connected
    extensionConnected: 'Extension reliée !',
    accountCreated: 'Compte créé !',
    canCloseTab: 'Vous pouvez fermer cet onglet et retourner à la page d\'enchères.',
    extensionNowConnected: 'Votre extension navigateur est maintenant connectée.',
    goToAccount: 'Aller au compte',

    // Account page
    account: 'Compte',
    profile: 'Profil',
    subscription: 'Abonnement',
    profileInfo: 'Informations du profil',
    memberSince: 'Membre depuis',
    accountId: 'ID du compte',

    // Subscription
    extensionReady: 'Extension prête',
    extensionConnectedReady: 'Votre extension est connectée et prête à être utilisée',
    subscriptionRequired: 'Abonnement requis',
    subscribeToStart: 'Abonnez-vous pour commencer à utiliser l\'extension',
    viewPlans: 'Voir les offres',
    yourSubscription: 'Votre abonnement',
    annualBilling: 'Facturation annuelle',
    monthlyBilling: 'Facturation mensuelle',
    renewsOn: 'Renouvellement le',
    endsOn: 'Fin le',
    subscriptionEnding: 'Abonnement en cours de fin',
    subscriptionWontRenew: 'Votre abonnement ne sera pas renouvelé. Cliquez sur "Gérer l\'abonnement" pour réactiver.',
    manageSubscription: 'Gérer l\'abonnement',
    updatePaymentMethod: 'Modifier le moyen de paiement, changer d\'offre ou annuler votre abonnement.',
    subscribeNow: "S'abonner maintenant",

    // Pricing
    monthly: 'Mensuel',
    yearly: 'Annuel',
    saveUpTo: 'Économisez jusqu\'à {percent}%',
    freshChecksMonth: '{count} recherches/mois',
    mostPopular: 'Le plus populaire',
    cancelAnytime: 'Annulez à tout moment. Sans engagement.',

    // Checkout
    checkoutSuccess: 'Abonnement activé !',
    checkoutSuccessDesc: 'Votre abonnement est maintenant actif. Vous pouvez utiliser l\'extension.',
    checkoutCancelled: 'Paiement annulé',
    checkoutCancelledDesc: 'Votre abonnement n\'a pas été finalisé. Vous pouvez réessayer ci-dessous.',

    // History page
    history: 'Historique',
    searchHistory: 'Historique des recherches',
    searchHistoryDesc: 'Consultez toutes vos comparaisons de prix passées',
    noSearchesYet: 'Aucune recherche pour le moment',
    noSearchesYetDesc: 'Votre historique de comparaison apparaîtra ici une fois que vous commencerez à utiliser l\'extension.',
    filters: 'Filtres',
    allSites: 'Tous les sites',
    allSources: 'Toutes les sources',
    fromCache: 'Depuis le cache',
    freshSearch: 'Recherche fraîche',
    startDate: 'Date de début',
    endDate: 'Date de fin',
    clearFilters: 'Effacer les filtres',
    search: 'Rechercher',
    showing: 'Affichage de',
    of: 'sur',
    results: 'résultats',
    previous: 'Précédent',
    next: 'Suivant',
    auctionPrice: 'Prix enchère',
    marketPrice: 'Prix marché',
    median: 'Médian',
    min: 'Min',
    max: 'Max',
    worthIt: 'Bon prix',
    borderline: 'Limite',
    notWorthIt: 'Trop cher',
    cached: 'Cache',
    fresh: 'Fraîche',
    viewDetails: 'Voir les détails',
    openAuction: 'Ouvrir l\'enchère',
    searchedOn: 'Recherché le',
    priceComparison: 'Comparaison de prix',
    belowMarket: 'sous le marché',
    aboveMarket: 'au-dessus du marché',
    atMarket: 'au prix du marché',

    // Free tier
    freeTrial: 'Essai gratuit',
    freeTrialDesc: '{count} recherches web gratuites',
    freeSearchesRemaining: '{count} recherches gratuites restantes',
    freeSearchExplanation: 'Une recherche = une vérification de prix sur Internet. Les résultats récents sont réutilisés automatiquement.',
    freeExhausted: 'Essai gratuit terminé',
    freeExhaustedDesc: 'Vos {count} recherches gratuites ont été utilisées. Abonnez-vous pour continuer.',
    cachedResult: 'Résultat en cache',
    cachedResultFree: 'Ceci est un résultat enregistré (gratuit)',
    upgradeNow: 'S\'abonner maintenant',

    // Landing page - Hero
    smartAuctionPriceAnalysis: 'Analyse intelligente des prix d\'enchères',
    heroTitle1: 'Ne surpayez plus jamais aux',
    heroTitle2: 'Enchères',
    heroTitle3: '',
    heroDescription: 'Notre extension de navigateur compare instantanément les prix des enchères avec les prix réels du marché. Sachez si vous faites une bonne affaire ou si vous payez trop cher avant de miser.',
    getStartedFree: 'Commencer gratuitement',
    goToAccount: 'Aller au compte',

    // Landing page - Stats
    auctionSites: 'Sites d\'enchères',
    realTime: 'Temps réel',
    priceUpdates: 'Mise à jour des prix',
    languages: 'Langues',

    // Landing page - Demo preview
    priceComparisonTitle: 'Comparaison de prix',
    youSave: 'Vous économisez',
    goodDealBid: 'Bonne affaire - Enchérissez !',

    // Landing page - How it works
    howItWorks: 'Comment ça marche',
    howItWorksDesc: 'Commencez en quelques minutes. Aucune configuration compliquée.',
    step1Title: 'Installer l\'extension',
    step1Desc: 'Ajoutez notre extension Chrome à votre navigateur en un clic.',
    step2Title: 'Parcourir les enchères',
    step2Desc: 'Visitez n\'importe quel site d\'enchères supporté et naviguez comme d\'habitude.',
    step3Title: 'Voir les comparaisons de prix',
    step3Desc: 'Notre panneau affiche automatiquement les prix du marché et un verdict clair.',

    // Landing page - Features
    everythingYouNeed: 'Tout ce dont vous avez besoin',
    everythingYouNeedDesc: 'Des fonctionnalités puissantes pour prendre de meilleures décisions aux enchères.',
    featureRealTimeTitle: 'Analyse des prix en temps réel',
    featureRealTimeDesc: 'Comparez instantanément les prix des enchères avec les prix actuels du marché des principaux détaillants et places de marché.',
    featureSmartBuyTitle: 'Recommandations d\'achat intelligentes',
    featureSmartBuyDesc: 'Obtenez des verdicts clairs pour savoir si vous devez enchérir ou passer, basés sur une analyse complète des données du marché.',
    featureBrowserTitle: 'Intégration navigateur fluide',
    featureBrowserDesc: 'Fonctionne directement sur les sites d\'enchères avec un panneau discret. Pas de copier-coller ni de changement d\'onglet.',
    featureFastTitle: 'Ultra rapide',
    featureFastDesc: 'Résultats en quelques secondes. Voyez les comparaisons de prix avant la fin des enchères.',
    featureSecureTitle: 'Sécurisé et privé',
    featureSecureDesc: 'Vos données de navigation restent locales. Nous n\'envoyons que les infos produit pour la comparaison de prix.',
    featureMultiLangTitle: 'Support multilingue',
    featureMultiLangDesc: 'Disponible en anglais et en français avec détection automatique de la langue.',

    // Landing page - Supported sites
    supportedAuctionSites: 'Sites d\'enchères supportés',
    supportedAuctionSitesDesc: 'Fonctionne avec les principales plateformes d\'enchères françaises. D\'autres sites arrivent bientôt.',

    // Landing page - Pricing
    simpleTransparentPricing: 'Tarification simple et transparente',
    pricingDesc: 'Choisissez le forfait adapté à votre style de chasse aux enchères.',
    starterPlan: 'Starter',
    starterPlanDesc: 'Pour les acheteurs occasionnels',
    proPlan: 'Pro',
    proPlanDesc: 'Pour les chasseurs réguliers',
    businessPlan: 'Business',
    businessPlanDesc: 'Pour les utilisateurs intensifs',
    perMonth: '/mois',
    allAuctionSites: 'Tous les sites d\'enchères',
    unlimitedCacheHits: 'Résultats en cache illimités',
    basicSupport: 'Support basique',
    prioritySupport: 'Support prioritaire',
    premiumSupport: 'Support premium',
    apiAccessComingSoon: 'Accès API (bientôt disponible)',
    getStarted: 'Commencer',
    saveAnnualBilling: 'Économisez jusqu\'à 30% avec la facturation annuelle. Annulez à tout moment.',

    // Landing page - FAQ
    faq: 'Questions fréquentes',
    faqQuestion1: 'Comment fonctionne la comparaison de prix ?',
    faqAnswer1: 'Notre extension analyse les détails de l\'article aux enchères et recherche des produits similaires sur les principales places de marché en ligne. Nous calculons ensuite le prix moyen du marché et le comparons au prix de l\'enchère, frais inclus.',
    faqQuestion2: 'Quels navigateurs sont supportés ?',
    faqAnswer2: 'Actuellement, notre extension fonctionne sur Google Chrome et d\'autres navigateurs basés sur Chromium comme Edge, Brave et Opera.',
    faqQuestion3: 'Mes données sont-elles en sécurité ?',
    faqAnswer3: 'Absolument. Nous n\'envoyons que les informations produit (titre, marque, modèle) à nos serveurs pour la recherche de prix. Nous ne suivons jamais votre historique de navigation et ne stockons pas de données personnelles.',
    faqQuestion4: 'Puis-je annuler mon abonnement à tout moment ?',
    faqAnswer4: 'Oui, vous pouvez annuler votre abonnement à tout moment depuis votre page de compte. Sans questions, sans frais cachés.',

    // Landing page - Final CTA
    readyToSave: 'Prêt à économiser sur les enchères ?',
    joinSmartBidders: 'Rejoignez des milliers d\'enchérisseurs malins qui ne surpayent jamais.',
    getStartedNow: 'Commencer maintenant',
    goToDashboard: 'Aller au tableau de bord',
  },
};

type Locale = 'en' | 'fr';
type MessageKey = keyof typeof messages.en;

export function useI18n() {
  const locale = useCookie<Locale>('locale', { default: () => 'fr' });

  function t(key: MessageKey, params?: Record<string, string | number>): string {
    const message = messages[locale.value]?.[key] || messages.en[key] || key;

    if (!params) return message;

    return Object.entries(params).reduce((acc, [k, v]) => {
      return acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }, message);
  }

  function setLocale(newLocale: Locale) {
    locale.value = newLocale;
  }

  return {
    t,
    locale,
    setLocale,
    locales: ['en', 'fr'] as const,
  };
}

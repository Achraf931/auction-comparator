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
    getStartedWithApp: 'Get started with Auction Comparator',
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
    profileInfo: 'Profile Information',
    memberSince: 'Member since',
    accountId: 'Account ID',

    // Extension status
    extensionReady: 'Extension Ready',
    extensionConnectedReady: 'Your extension is connected and ready to use',

    // Checkout
    creditsSuccess: 'Credits added!',
    creditsSuccessDesc: 'Your credits have been added to your account.',
    creditsCancelled: 'Purchase cancelled',
    creditsCancelledDesc: 'Your credit purchase was not completed. You can try again below.',

    // Credits
    credits: 'Credits',
    yourCredits: 'Your Credits',
    creditsBalance: 'Credit Balance',
    buyCredits: 'Buy Credits',
    buy: 'Buy',
    creditPacks: 'Credit Packs',
    payAsYouGo: 'Pay as you go',
    payOnlyForWhatYouUse: 'Pay only for what you use. No subscription required.',
    oneComparisonExplainer: '1 credit = 1 new price comparison',
    cacheHitsFree: 'Cache hits are always free - you only pay for fresh price checks.',
    perCredit: '/credit',
    comparison: 'comparison',
    comparisons: 'comparisons',
    pack1: '1 Credit',
    pack5: '5 Credits',
    pack10: '10 Credits',
    pack30: '30 Credits',
    pack100: '100 Credits',
    quickTopUp: 'Quick top-up',
    starterPack: 'Starter pack',
    regularUse: 'Regular use',
    popularChoice: 'Most popular',
    bestValue: 'Best value',
    bestValueBadge: 'Best Value',
    freeCreditsIncluded: '1 free comparison for new users',
    purchaseHistory: 'Purchase History',
    noPurchasesYet: 'No purchases yet',
    noPurchasesDesc: 'Your purchase history will appear here once you buy credits.',
    totalPurchased: 'Total purchased',
    totalConsumed: 'Total consumed',
    freeCredit: 'free credit',
    noCredits: 'No credits remaining',
    noCreditsHint: 'Purchase credits to continue making price comparisons.',
    noCreditsRemaining: 'No credits left',

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

    // Free credit info
    freeSearchExplanation: 'One comparison = one price check on the internet. Recent results are reused automatically.',
    cachedResult: 'Cached result',
    cachedResultFree: 'This is a cached result (free)',

    // Email verification
    verifyEmailTitle: 'Verify Your Email',
    verifyEmailDesc: 'We sent a verification link to your email address. Please check your inbox and click the link to verify your account.',
    resendVerificationEmail: 'Resend verification email',
    verificationEmailSent: 'Verification email sent!',
    emailNotVerified: 'Email not verified',
    emailNotVerifiedDesc: 'Please verify your email address before purchasing credits.',
    emailVerified: 'Email verified',
    emailVerifiedSuccess: 'Your email has been verified successfully!',
    emailVerifiedSuccessDesc: 'You can now access all features of AuctiMatch.',
    emailVerificationError: 'Verification failed',
    emailVerificationExpired: 'This verification link has expired or is invalid. Please request a new one.',
    emailVerificationMissing: 'No verification token found. Please check your email for the correct link.',
    goToAccount: 'Go to Account',
    checkYourEmail: 'Check your email',
    verifyEmailBanner: 'Please verify your email to access all features.',

    // Landing page - Footer
    legalNotice: 'Legal Notice',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    contact: 'Contact',

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
    pricingDesc: 'Pay only for what you use. No subscription required.',
    allAuctionSites: 'All auction sites',
    unlimitedCacheHits: 'Unlimited cache hits',
    getStarted: 'Get Started',

    // Landing page - FAQ
    faq: 'Frequently Asked Questions',
    faqQuestion1: 'How does the price comparison work?',
    faqAnswer1: 'Our extension analyzes the auction item details and searches major online marketplaces to find similar products. We then calculate the average market price and compare it to the auction price including fees.',
    faqQuestion2: 'Which browsers are supported?',
    faqAnswer2: 'Currently, our extension works on Google Chrome and other Chromium-based browsers like Edge, Brave, and Opera.',
    faqQuestion3: 'Is my data safe?',
    faqAnswer3: 'Absolutely. We only send product information (title, brand, model) to our servers for price lookup. We never track your browsing history or store personal data.',
    faqQuestion4: 'Do credits expire?',
    faqAnswer4: 'No, your credits never expire. Use them whenever you need to compare prices at auctions.',

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
    getStartedWithApp: 'Commencez avec Auction Comparator',
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
    profileInfo: 'Informations du profil',
    memberSince: 'Membre depuis',
    accountId: 'ID du compte',

    // Extension status
    extensionReady: 'Extension prête',
    extensionConnectedReady: 'Votre extension est connectée et prête à être utilisée',

    // Checkout
    creditsSuccess: 'Crédits ajoutés !',
    creditsSuccessDesc: 'Vos crédits ont été ajoutés à votre compte.',
    creditsCancelled: 'Achat annulé',
    creditsCancelledDesc: 'Votre achat de crédits n\'a pas été finalisé. Vous pouvez réessayer ci-dessous.',

    // Credits
    credits: 'Crédits',
    yourCredits: 'Vos crédits',
    creditsBalance: 'Solde de crédits',
    buyCredits: 'Acheter des crédits',
    buy: 'Acheter',
    creditPacks: 'Packs de crédits',
    payAsYouGo: 'Payez à l\'usage',
    payOnlyForWhatYouUse: 'Payez uniquement ce que vous utilisez. Pas d\'abonnement requis.',
    oneComparisonExplainer: '1 crédit = 1 nouvelle comparaison de prix',
    cacheHitsFree: 'Les résultats en cache sont toujours gratuits - vous ne payez que pour les nouvelles recherches.',
    perCredit: '/crédit',
    comparison: 'comparaison',
    comparisons: 'comparaisons',
    pack1: '1 Crédit',
    pack5: '5 Crédits',
    pack10: '10 Crédits',
    pack30: '30 Crédits',
    pack100: '100 Crédits',
    quickTopUp: 'Recharge rapide',
    starterPack: 'Pack découverte',
    regularUse: 'Usage régulier',
    popularChoice: 'Le plus populaire',
    bestValue: 'Meilleure offre',
    bestValueBadge: 'Meilleure Offre',
    freeCreditsIncluded: '1 comparaison gratuite pour les nouveaux utilisateurs',
    purchaseHistory: 'Historique des achats',
    noPurchasesYet: 'Aucun achat pour le moment',
    noPurchasesDesc: 'Votre historique d\'achats apparaîtra ici une fois que vous aurez acheté des crédits.',
    totalPurchased: 'Total acheté',
    totalConsumed: 'Total consommé',
    freeCredit: 'crédit gratuit',
    noCredits: 'Aucun crédit restant',
    noCreditsHint: 'Achetez des crédits pour continuer à comparer les prix.',
    noCreditsRemaining: 'Plus de crédits',

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

    // Free credit info
    freeSearchExplanation: 'Une comparaison = une vérification de prix sur Internet. Les résultats récents sont réutilisés automatiquement.',
    cachedResult: 'Résultat en cache',
    cachedResultFree: 'Ceci est un résultat enregistré (gratuit)',

    // Email verification
    verifyEmailTitle: 'Vérifiez votre e-mail',
    verifyEmailDesc: 'Nous avons envoyé un lien de vérification à votre adresse e-mail. Veuillez consulter votre boîte de réception et cliquer sur le lien pour vérifier votre compte.',
    resendVerificationEmail: 'Renvoyer l\'e-mail de vérification',
    verificationEmailSent: 'E-mail de vérification envoyé !',
    emailNotVerified: 'E-mail non vérifié',
    emailNotVerifiedDesc: 'Veuillez vérifier votre adresse e-mail avant d\'acheter des crédits.',
    emailVerified: 'E-mail vérifié',
    emailVerifiedSuccess: 'Votre e-mail a été vérifié avec succès !',
    emailVerifiedSuccessDesc: 'Vous pouvez maintenant accéder à toutes les fonctionnalités d\'AuctiMatch.',
    emailVerificationError: 'Échec de la vérification',
    emailVerificationExpired: 'Ce lien de vérification a expiré ou est invalide. Veuillez en demander un nouveau.',
    emailVerificationMissing: 'Aucun jeton de vérification trouvé. Veuillez vérifier votre e-mail pour le lien correct.',
    goToAccount: 'Aller au compte',
    checkYourEmail: 'Consultez votre e-mail',
    verifyEmailBanner: 'Veuillez vérifier votre e-mail pour accéder à toutes les fonctionnalités.',

    // Landing page - Footer
    legalNotice: 'Mentions légales',
    privacyPolicy: 'Politique de confidentialité',
    termsOfService: 'Conditions d\'utilisation',
    contact: 'Contact',

    // Landing page - Hero
    smartAuctionPriceAnalysis: 'Analyse intelligente des prix d\'enchères',
    heroTitle1: 'Ne surpayez plus jamais aux',
    heroTitle2: 'Enchères',
    heroTitle3: '',
    heroDescription: 'Notre extension de navigateur compare instantanément les prix des enchères avec les prix réels du marché. Sachez si vous faites une bonne affaire ou si vous payez trop cher avant de miser.',
    getStartedFree: 'Commencer gratuitement',

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
    pricingDesc: 'Payez uniquement ce que vous utilisez. Pas d\'abonnement requis.',
    allAuctionSites: 'Tous les sites d\'enchères',
    unlimitedCacheHits: 'Résultats en cache illimités',
    getStarted: 'Commencer',

    // Landing page - FAQ
    faq: 'Questions fréquentes',
    faqQuestion1: 'Comment fonctionne la comparaison de prix ?',
    faqAnswer1: 'Notre extension analyse les détails de l\'article aux enchères et recherche des produits similaires sur les principales places de marché en ligne. Nous calculons ensuite le prix moyen du marché et le comparons au prix de l\'enchère, frais inclus.',
    faqQuestion2: 'Quels navigateurs sont supportés ?',
    faqAnswer2: 'Actuellement, notre extension fonctionne sur Google Chrome et d\'autres navigateurs basés sur Chromium comme Edge, Brave et Opera.',
    faqQuestion3: 'Mes données sont-elles en sécurité ?',
    faqAnswer3: 'Absolument. Nous n\'envoyons que les informations produit (titre, marque, modèle) à nos serveurs pour la recherche de prix. Nous ne suivons jamais votre historique de navigation et ne stockons pas de données personnelles.',
    faqQuestion4: 'Les crédits expirent-ils ?',
    faqAnswer4: 'Non, vos crédits n\'expirent jamais. Utilisez-les quand vous voulez pour comparer les prix aux enchères.',

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

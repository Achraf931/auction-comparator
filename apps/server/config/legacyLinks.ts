export const CONTACT_EMAIL = 'contact@auctimatch.com';

export const legacyLinks = [
  { key: 'legalNotice', to: '/legal' },
  { key: 'privacyPolicy', to: '/privacy' },
  { key: 'termsOfService', to: '/terms' },
  { key: 'contact', href: `mailto:${CONTACT_EMAIL}` },
] as const;

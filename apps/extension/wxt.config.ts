import { defineConfig } from 'wxt'
import ui from '@nuxt/ui/vite'

// All supported auction site match patterns
// Keep in sync with utils/sites.ts SUPPORTED_SITES
const OPTIONAL_HOST_PERMISSIONS = [
  '*://*.interencheres.fr/*',
  '*://*.interencheres.com/*',
  '*://*.alcopa-auction.fr/*',
  '*://*.alcopa-auction.com/*',
  '*://*.encheres-domaine.gouv.fr/*',
  '*://*.moniteurdesventes.com/*',
  '*://*.agorastore.fr/*',
  '*://*.auctelia.com/*',
]

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],

  manifest: {
    name: 'Auction Price Comparator',
    description: 'Compare auction bid prices with web market prices',
    version: '0.1.0',
    permissions: ['storage', 'activeTab', 'alarms', 'scripting'],
    // Use optional_host_permissions for privacy-friendly permission requests
    optional_host_permissions: OPTIONAL_HOST_PERMISSIONS,
    // Allow web app to send messages to extension for auto-auth
    externally_connectable: {
      matches: [
        'http://localhost/*',
        'https://localhost/*',
        'https://*.auction-comparator.com/*',
        'https://*.auctimatch.com/*',
      ],
    },
  },

  vite: () => ({
    plugins: [
      ui({
        ui: {
          colors: {
            neutral: 'zinc',
            primary: 'emerald',
          },
        },
      }),
    ],
  }),
})

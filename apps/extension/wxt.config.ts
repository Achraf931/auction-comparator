import { defineConfig } from 'wxt'
import ui from '@nuxt/ui/vite'

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],

  manifest: {
    name: 'Auction Price Comparator',
    description: 'Compare auction bid prices with web market prices',
    version: '0.0.1',
    permissions: ['storage', 'activeTab', 'alarms'],
    host_permissions: [
      '*://*.interencheres.fr/*',
      '*://*.interencheres.com/*',
      '*://*.alcopa-auction.fr/*',
      '*://*.alcopa-auction.com/*',
      '*://*.encheres-domaine.gouv.fr/*',
      '*://*.moniteurdesventes.com/*',
    ],
    // Allow web app to send messages to extension for auto-auth
    externally_connectable: {
      matches: [
        'http://localhost/*',
        'https://localhost/*',
        'https://*.auction-comparator.com/*',
      ],
    },
  },

  vite: () => ({
    plugins: [
      ui({
        ui: {
          colors: {
            neutral: 'neutral',
            primary: 'emerald',
          },
        },
      }),
    ],
  }),
})

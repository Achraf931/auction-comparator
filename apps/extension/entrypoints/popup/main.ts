import { createApp } from 'vue'
import './main.css'
import ui from '@nuxt/ui/vue-plugin'
import App from './App.vue'
import { i18n, initLocale } from '@/utils/i18n'

// Initialize locale from storage
initLocale()

const app = createApp(App)

app.use(ui)
app.use(i18n)
app.mount('#app')

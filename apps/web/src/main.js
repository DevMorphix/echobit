import { createApp } from 'vue'
import '@fontsource-variable/inter'
import '@fontsource-variable/sora'
import './style.css'
import App from './App.vue'
import router from './router'
import { initAuth } from './api'
import { initTheme } from './composables/useTheme'

initTheme()

// Resolve the session (cookie) before mounting so the router guard sees it.
initAuth().finally(() => createApp(App).use(router).mount('#app'))

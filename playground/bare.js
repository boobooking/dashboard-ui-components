import { createApp } from 'vue'
// Стили пакета первыми — тот же порядок, что требуется от потребителя.
import '../dist/style.css'
import './bare.css'
import './shell.css'
import App from './App.vue'
import { dashboardUi } from '../dist/index.js'
import { lastNavigation } from './navigation-log.js'

createApp(App)
    .use(dashboardUi, { navigate: (href) => { lastNavigation.value = href } })
    .mount('#app')

import { createApp } from 'vue'
import '../dist/style.css'
import './host.css'
import './shell.css'
import App from './App.vue'
import { dashboardUi } from '../dist/index.js'
import { lastNavigation } from './navigation-log.js'

// Крестик PageCard виден, только если в истории вкладки больше одной записи,
// поэтому демо добавляет свою запись до монтирования.
history.pushState({ pageCardDemo: true }, '')

createApp(App)
    .use(dashboardUi, { navigate: (href) => { lastNavigation.value = href } })
    .mount('#app')

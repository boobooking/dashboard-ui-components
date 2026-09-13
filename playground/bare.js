import { createApp } from 'vue'
// Стили пакета первыми — тот же порядок, что требуется от потребителя.
import '../dist/style.css'
import './bare.css'
import './shell.css'
import App from './App.vue'

createApp(App).mount('#app')

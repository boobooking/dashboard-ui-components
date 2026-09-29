import { ref } from 'vue'

// Последний адрес, по которому компонент пакета попросил перейти: в playground
// нет роутера, navigate только записывает адрес для строки состояния.
export const lastNavigation = ref('')

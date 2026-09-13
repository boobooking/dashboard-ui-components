// Стили попадают в сборку только через entry: без этой строки Rollup собрал бы
// style.css из одного pikaday, без единой утилиты Tailwind и без ошибки.
import './styles/index.css'

export { default as Popup } from './components/Popup.vue'
export { default as Dot } from './components/Dot.vue'
export { default as PickDay } from './components/PickDay.vue'

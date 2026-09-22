// Стили попадают в сборку только через entry: без этой строки Rollup собрал бы
// style.css из одного pikaday, без единой утилиты Tailwind и без ошибки.
import './styles/index.css'

export { default as Popup } from './components/Popup.vue'
export { default as Dot } from './components/Dot.vue'
export { default as PickDay } from './components/PickDay.vue'
export { default as RussianMobileFilter } from './components/RussianMobileFilter.vue'
export { default as Search } from './components/Search.vue'
export { default as SelectDateInterval } from './components/SelectDateInterval.vue'
export { default as SelectSingle } from './components/SelectSingle.vue'
export { default as SmallBadge } from './components/SmallBadge.vue'
export { default as ErrorMessages } from './components/ErrorMessages.vue'
export { default as Closer } from './components/Closer.vue'
export { default as DownloadLink } from './components/DownloadLink.vue'
export { default as ConfirmationModal } from './components/ConfirmationModal.vue'
export { default as DropdownButtonWithAction } from './components/DropdownButtonWithAction.vue'

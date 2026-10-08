// Стили попадают в сборку только через entry: без этой строки Rollup собрал бы
// style.css из одного pikaday, без единой утилиты Tailwind и без ошибки.
import './styles/index.css'

export { dashboardUi } from './plugin.js'

export { default as Dot } from './components/Dot.vue'
export { default as RussianMobileFilter } from './components/RussianMobileFilter.vue'
export { default as Search } from './components/Search.vue'
export { default as SelectDateInterval } from './components/SelectDateInterval.vue'
export { default as SelectSingle } from './components/SelectSingle.vue'
export { default as SmallBadge } from './components/SmallBadge.vue'
export { default as ErrorMessages } from './components/ErrorMessages.vue'
export { default as DownloadLink } from './components/DownloadLink.vue'
export { default as ConfirmationModal } from './components/ConfirmationModal.vue'
export { default as DropdownButtonWithAction } from './components/DropdownButtonWithAction.vue'
export { default as HamburgerMenu } from './components/HamburgerMenu.vue'
export { default as DataTable } from './components/DataTable.vue'
export { default as NavigationMenuElement } from './components/NavigationMenuElement.vue'
export { default as PageCard } from './components/PageCard.vue'
export { default as NotificationMessage } from './components/NotificationMessage.vue'

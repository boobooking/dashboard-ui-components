// Иконки действий ActionButton, ActionPill, DropdownButtonWithAction и
// HamburgerMenu: имя из поля icon пункта меню или из пропа icon — компонент
// иконки. Новая иконка — файл в components/icons без своего размера и новое имя
// здесь. Внутренний модуль пакета.

import Plus from './components/icons/Plus.vue'
import Download from './components/icons/Download.vue'
import Refresh from './components/icons/Refresh.vue'
import BankTransfer from './components/icons/BankTransfer.vue'
import CurrencyExchange from './components/icons/CurrencyExchange.vue'

export const ACTION_ICONS = {
    plus: Plus,
    download: Download,
    refresh: Refresh,
    'bank-transfer': BankTransfer,
    'currency-exchange': CurrencyExchange,
}

export function isActionIcon(name) {
    return typeof name === 'string' && Object.hasOwn(ACTION_ICONS, name)
}

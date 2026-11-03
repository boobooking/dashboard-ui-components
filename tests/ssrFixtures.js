import { h } from 'vue'
import DetailRow from '../src/components/DetailRow.vue'

// Минимальные пропсы и слоты каждого экспортируемого компонента для серверного
// рендера и гидратации. Компоненты, чьё содержимое зависит от значения, — в
// открытом состоянии, чтобы на сервере рендерилось и оно. Компонент без
// фикстуры роняет tests/ssr.test.js.
export const ssrFixtures = {
    ActionButton: { props: { label: 'Создать', color: 'green-solid', icon: 'plus' } },
    ActionPill: { props: { title: 'скачать xlsx', icon: 'download', isLoading: true, loadingText: 'формируется отчёт' } },
    ConfirmationModal: { props: { isOpen: true, actionButtonText: 'Удалить', confirmationHeading: 'Удалить запись?', confirmationText: 'Действие нельзя отменить.' } },
    DataTable: {
        props: {
            rows: [{ uuid: '1', name: 'Первый' }, { uuid: '2', name: 'Второй' }],
            columns: [{ key: 'name', label: 'Имя' }],
            rowKey: 'uuid',
            meta: { from: 16, to: 17, total: 40 },
            links: { prev: '/list?page=1', next: '/list?page=3' },
            foundText: 'Найдено записей',
        },
    },
    Dot: { props: { color: 'green-pale' } },
    DropdownButtonWithAction: { props: { actions: [{ label: 'Действие', icon: 'plus', href: '#' }, { label: 'Другое действие', icon: 'plus', href: '#' }] } },
    ErrorMessages: { props: { messages: { email: 'Неверный email' } } },
    FormInput: { props: { label: 'Имя', modelValue: 'Анна', isRequired: true } },
    HamburgerMenu: { props: { actions: [{ label: 'Выйти', icon: 'plus', href: '#' }] } },
    InfoPill: { props: { text: 'Новый', color: 'green-pale' } },
    NavigationMenuElement: { props: { url: '/section', name: 'Раздел' } },
    NotificationMessage: { props: { modelValue: 'Письмо отправлено', type: 'confirmation', notificationHeading: 'Готово' } },
    DetailList: { slots: { default: () => h(DetailRow, { title: 'Телефон' }, () => '+7 999') } },
    DetailRow: { props: { title: 'Телефон' }, slots: { default: () => '+7 999' } },
    PageCard: { props: { fallbackUrl: '/list' }, slots: { default: () => h('h3', 'Заголовок') } },
    PageTabs: {
        props: {
            tabs: [
                { key: 'active', name: 'Активные', url: '/events' },
                { key: 'archive', name: 'Архив', url: '/archive' },
            ],
            activeKey: 'archive',
        },
    },
    RussianMobileFilter: { props: { header: 'Телефон', modelValue: '79031234567' } },
    Search: { props: { header: 'Поиск', modelValue: 'запрос' } },
    SelectDateFilter: { props: { header: 'Дата', modelValue: '01.03.2026' } },
    SelectDateForm: { props: { label: 'Дата', modelValue: '01.03.2026' } },
    SelectDateIntervalFilter: { props: { header: 'Интервал', dateFrom: '01.03.2026', dateTo: '15.03.2026' } },
    SelectDateIntervalForm: {
        props: { label: 'Период', dateFrom: '01.03.2026', dateTo: '15.03.2026' },
        slots: { description: () => h('a', { href: '#' }, 'Пояснение') },
    },
    SelectMultipleFilter: {
        props: {
            header: 'Бренд',
            items: [{ id: 'rc', name: 'Royal Canin' }, { id: 'eukanuba', name: 'Eukanuba' }],
            modelValue: ['rc', 'eukanuba'],
            withSearch: true,
        },
    },
    SelectMultipleForm: {
        props: {
            label: 'Бренд',
            items: [{ id: 'rc', name: 'Royal Canin' }, { id: 'eukanuba', name: 'Eukanuba' }],
            modelValue: ['rc', 'eukanuba'],
            withSearch: true,
        },
    },
    SelectSingleFilter: { props: { header: 'Вендор', items: [{ id: 'a', name: 'Первый' }], modelValue: 'a' } },
    SelectMultipleList: { props: { label: 'Участники', items: [{ id: 'owner', name: 'Владельцы' }, { id: 'doctor', name: 'Ветеринарные врачи' }, { id: 'club', name: 'Клубы' }], modelValue: ['doctor'], columns: 2 } },
    SelectSingleCards: { props: { label: 'Бренд', items: [{ id: 'rc', name: 'Royal Canin' }, { id: 'eukanuba', name: 'Eukanuba' }], modelValue: 'eukanuba', isRequired: true } },
    SelectSingleForm: { props: { label: 'Вендор', description: 'Пояснение', items: [{ id: 'a', name: 'Первый' }], modelValue: 'a' } },
    SelectCurrencyFilter: { props: { header: 'Валюта', modelValue: 'USD', currencies: ['RUB', 'USD'] } },
    SelectCurrencyForm: { props: { label: 'Валюта', modelValue: 'USD' } },
    AmountIntervalFilter: { props: { header: 'Сумма', amountFrom: 100000, amountTo: 500000, currency: 'USD' } },
    AmountIntervalForm: { props: { label: 'Сумма', amountFrom: 100000, amountTo: 500000, currency: 'USD' } },
    AmountForm: { props: { label: 'Сумма', description: 'Пояснение', modelValue: { amount: 123456, currency: 'USD' } } },
    TextPopover: { props: { text: 'Полный текст сообщения', modelValue: true } },
}

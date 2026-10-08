import { h } from 'vue'

// Минимальные пропсы и слоты каждого экспортируемого компонента для серверного
// рендера и гидратации. Компоненты, чьё содержимое зависит от значения, — в
// открытом состоянии, чтобы на сервере рендерилось и оно. Компонент без
// фикстуры роняет tests/ssr.test.js.
export const ssrFixtures = {
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
    Dot: { props: { color: 'green' } },
    DownloadLink: { props: { url: '/export.xlsx' } },
    DropdownButtonWithAction: { props: { actions: [{ label: 'Другое действие', href: '#' }] }, slots: { button: () => 'Действие' } },
    ErrorMessages: { props: { messages: { email: 'Неверный email' } } },
    HamburgerMenu: { props: { actions: [{ label: 'Выйти', href: '#' }] } },
    NavigationMenuElement: { props: { url: '/section', name: 'Раздел' } },
    NotificationMessage: { props: { modelValue: 'Письмо отправлено', type: 'confirmation', notificationHeading: 'Готово' } },
    PageCard: { props: { fallbackUrl: '/list' }, slots: { default: () => h('h3', 'Заголовок') } },
    RussianMobileFilter: { props: { header: 'Телефон', modelValue: '79031234567' } },
    Search: { props: { header: 'Поиск', modelValue: 'запрос' } },
    SelectDateInterval: { props: { header: 'Интервал', dateFrom: '01.03.2026', dateTo: '15.03.2026' } },
    SelectSingle: { props: { header: 'Вендор', items: [{ id: 'a', name: 'Первый' }], modelValue: 'a' } },
    SmallBadge: { props: { text: 'Новый', color: 'green' } },
}

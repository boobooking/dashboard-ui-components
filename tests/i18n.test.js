// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { messages } from '../src/i18n.js'
import { dashboardUi } from '../src/plugin.js'
import ConfirmationModal from '../src/components/ConfirmationModal.vue'
import DownloadLink from '../src/components/DownloadLink.vue'
import DropdownButtonWithAction from '../src/components/DropdownButtonWithAction.vue'
import PageCard from '../src/components/PageCard.vue'
import Pagination from '../src/components/Pagination.vue'
import PickDay from '../src/components/PickDay.vue'
import SelectDateInterval from '../src/components/SelectDateInterval.vue'

enableAutoUnmount(afterEach)

const inApp = (options) => ({ plugins: [[dashboardUi, options]] })

// pikaday загружается в mounted() PickDay: календарь появляется после загрузки.
async function pikadayLoaded() {
    await vi.dynamicImportSettled()
    await flushPromises()
}

describe('словари', () => {
    it('ключи ru и en совпадают', () => {
        expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.ru).sort())
    })

    it('в календаре 12 месяцев и 7 дней недели в обоих языках', () => {
        for (const lang of ['ru', 'en']) {
            expect(messages[lang].months).toHaveLength(12)
            expect(messages[lang].weekdays).toHaveLength(7)
            expect(messages[lang].weekdaysShort).toHaveLength(7)
        }
    })
})

describe('ConfirmationModal: кнопка отмены', () => {
    const cases = [
        { name: 'без плагина — ru', global: {}, props: {}, expected: 'Отмена' },
        { name: 'плагин en', global: inApp({ lang: 'en' }), props: {}, expected: 'Cancel' },
        { name: 'проп lang ru главнее плагина en', global: inApp({ lang: 'en' }), props: { lang: 'ru' }, expected: 'Отмена' },
        { name: 'явный текст главнее языка', global: inApp({ lang: 'en' }), props: { cancelButtonText: 'Назад' }, expected: 'Назад' },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const wrapper = mount(ConfirmationModal, {
                props: { isOpen: true, actionButtonText: 'OK', ...testCase.props },
                global: testCase.global,
            })
            // Кнопка отмены — последняя кнопка модалки (после кнопки действия).
            const buttons = wrapper.findAll('button')

            expect(buttons[buttons.length - 1].text()).toBe(testCase.expected)
        })
    }
})

describe('DownloadLink: подпись', () => {
    const cases = [
        { name: 'без плагина — ru', global: {}, props: {}, expected: 'Скачать' },
        { name: 'плагин en', global: inApp({ lang: 'en' }), props: {}, expected: 'Download' },
        { name: 'явный title главнее языка', global: inApp({ lang: 'en' }), props: { title: 'скачать xls' }, expected: 'скачать xls' },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const wrapper = mount(DownloadLink, { props: { url: '/export', ...testCase.props }, global: testCase.global })
            const link = wrapper.get('a')

            expect(link.text()).toBe(testCase.expected)
            expect(link.attributes('title')).toBe(testCase.expected)
        })
    }
})

describe('DropdownButtonWithAction: подпись стрелки', () => {
    const cases = [
        { name: 'без плагина — ru', global: {}, expected: 'Открыть меню' },
        { name: 'плагин en', global: inApp({ lang: 'en' }), expected: 'Open menu' },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const wrapper = mount(DropdownButtonWithAction, {
                slots: { button: 'Основное' },
                props: { actions: [{ label: 'Действие', href: '#' }] },
                global: testCase.global,
            })

            expect(wrapper.findAll('button').some((button) => button.text().includes(testCase.expected))).toBe(true)
        })
    }
})

describe('SelectDateInterval: подсказки и оба календаря', () => {
    const cases = [
        { name: 'без плагина — ru', global: {}, props: {}, placeholders: ['от', 'до'], weekday: 'Пн', absent: 'Mon' },
        { name: 'плагин en', global: inApp({ lang: 'en' }), props: {}, placeholders: ['from', 'to'], weekday: 'Mon', absent: 'Пн' },
        { name: 'проп lang en главнее плагина ru и доходит до календарей', global: inApp({ lang: 'ru' }), props: { lang: 'en' }, placeholders: ['from', 'to'], weekday: 'Mon', absent: 'Пн' },
        { name: 'проп lang ru главнее плагина en и доходит до календарей', global: inApp({ lang: 'en' }), props: { lang: 'ru' }, placeholders: ['от', 'до'], weekday: 'Пн', absent: 'Mon' },
    ]

    for (const testCase of cases) {
        it(testCase.name, async () => {
            const wrapper = mount(SelectDateInterval, { props: { header: 'Интервал', ...testCase.props }, global: testCase.global })
            await pikadayLoaded()

            expect(wrapper.findAll('input').map((input) => input.attributes('placeholder'))).toEqual(testCase.placeholders)

            // Оба вложенных PickDay: шапки их календарей — на языке интервала.
            const headers = wrapper.findAll('.pika-table thead').map((thead) => thead.text())
            expect(headers).toHaveLength(2)
            for (const header of headers) {
                expect(header).toContain(testCase.weekday)
                expect(header).not.toContain(testCase.absent)
            }
        })
    }
})

describe('недопустимый lang: язык плагина, а не падение', () => {
    const paginationProps = { links: { prev: '/p1', next: '/p3' }, meta: { from: 1, to: 15, total: 40 } }
    const cases = [
        { name: 'ConfirmationModal, lang de и плагин en — English', component: ConfirmationModal, props: { isOpen: true, actionButtonText: 'OK', lang: 'de' }, global: inApp({ lang: 'en' }), expected: 'Cancel' },
        { name: 'ConfirmationModal, lang пустой и без плагина — русский', component: ConfirmationModal, props: { isOpen: true, actionButtonText: 'OK', lang: '' }, global: {}, expected: 'Отмена' },
        { name: 'ConfirmationModal, lang en-US и плагин en — English', component: ConfirmationModal, props: { isOpen: true, actionButtonText: 'OK', lang: 'en-US' }, global: inApp({ lang: 'en' }), expected: 'Cancel' },
        { name: 'Pagination, lang de и плагин en — English', component: Pagination, props: { ...paginationProps, lang: 'de' }, global: inApp({ lang: 'en' }), expected: 'Showing' },
        { name: 'Pagination, lang пустой и без плагина — русский', component: Pagination, props: { ...paginationProps, lang: '' }, global: {}, expected: 'Показаны результаты' },
        { name: 'DownloadLink, lang de и плагин en — English', component: DownloadLink, props: { url: '/export', lang: 'de' }, global: inApp({ lang: 'en' }), expected: 'Download' },
        { name: 'PickDay, lang пустой и без плагина — русский', component: PickDay, props: { lang: '' }, global: {}, expected: 'Пн' },
        { name: 'SelectDateInterval, lang de и плагин en — English', component: SelectDateInterval, props: { header: 'Интервал', lang: 'de' }, global: inApp({ lang: 'en' }), expected: 'Mon' },
        { name: 'DropdownButtonWithAction, lang de и плагин en — English', component: DropdownButtonWithAction, props: { lang: 'de', actions: [{ label: 'Действие', href: '#' }] }, slots: { button: 'Основное' }, global: inApp({ lang: 'en' }), expected: 'Open menu' },
    ]

    for (const testCase of cases) {
        it(testCase.name, async () => {
            const warnings = []
            const wrapper = mount(testCase.component, {
                props: testCase.props,
                slots: testCase.slots,
                global: { ...testCase.global, config: { warnHandler: (message) => warnings.push(message) } },
            })
            await pikadayLoaded()

            expect(wrapper.text()).toContain(testCase.expected)
            // Валидатор пропа по-прежнему предупреждает — и только он.
            expect(warnings.length).toBeGreaterThan(0)
            for (const warning of warnings) {
                expect(warning).toContain('Invalid prop')
            }
        })
    }
})

describe('недопустимый lang: крестик PageCard', () => {
    // Крестик рисуется, когда у карточки есть цель: здесь — fallback-url.
    it('lang de и плагин en — доступное имя Back', async () => {
        const warnings = []
        const errors = []
        const wrapper = mount(PageCard, {
            props: { lang: 'de', fallbackUrl: '/list' },
            global: {
                ...inApp({ lang: 'en' }),
                config: {
                    errorHandler: (error) => errors.push(error),
                    warnHandler: (message) => warnings.push(message),
                },
            },
        })
        await nextTick()

        const cross = wrapper.findAll('button').find((button) => button.find('path[d="M6 18L18 6M6 6l12 12"]').exists())
        expect(cross.attributes('aria-label')).toBe('Back')
        expect(errors).toEqual([])
        // Валидатор пропа по-прежнему предупреждает — и только он.
        expect(warnings.length).toBeGreaterThan(0)
        for (const warning of warnings) {
            expect(warning).toContain('Invalid prop')
        }
    })
})

describe('PickDay: месяц в шапке календаря', () => {
    const cases = [
        { name: 'без плагина — русский месяц', global: {}, expected: messages.ru.months, absent: messages.en.months },
        { name: 'плагин en — английский месяц', global: inApp({ lang: 'en' }), expected: messages.en.months, absent: messages.ru.months },
    ]

    for (const testCase of cases) {
        it(testCase.name, async () => {
            const wrapper = mount(PickDay, { global: testCase.global })
            await pikadayLoaded()
            // Дата не фиксирована, поэтому ищем месяц среди двенадцати.
            const label = wrapper.get('.pika-label').text()

            expect(testCase.expected.some((month) => label.includes(month))).toBe(true)
            expect(testCase.absent.some((month) => label.includes(month))).toBe(false)
        })
    }
})

describe('PickDay: календарь', () => {
    const cases = [
        { name: 'без плагина — ru', global: {}, expected: 'Пн', absent: 'Mon' },
        { name: 'плагин en', global: inApp({ lang: 'en' }), expected: 'Mon', absent: 'Пн' },
    ]

    for (const testCase of cases) {
        it(testCase.name, async () => {
            const wrapper = mount(PickDay, { global: testCase.global })
            await pikadayLoaded()
            // Pikaday рисует календарь в контейнер, как только создан (bound: false);
            // шапка таблицы — краткие дни недели.
            const header = wrapper.get('.pika-table thead').text()

            expect(header).toContain(testCase.expected)
            expect(header).not.toContain(testCase.absent)
        })
    }
})

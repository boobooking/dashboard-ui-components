// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import PageTabs from '../src/components/PageTabs.vue'
import { dashboardUi } from '../src/plugin.js'

enableAutoUnmount(afterEach)
// Как в tests/NavigationMenuElement.test.js: монтирование в документ, чтобы клик всплывал до window.
afterEach(() => {
    document.body.innerHTML = ''
})

const TABS = [
    { key: 'orders', name: 'Ордера', url: 'https://example.test/groups/1/orders' },
    { key: 'certificates', name: 'Сертификаты', url: 'https://example.test/groups/1/certificates' },
    { key: 'messages', name: 'Sms', url: 'https://example.test/groups/1/messages' },
]

// Как в tests/NavigationMenuElement.test.js: слушатель на window записывает, отменил ли
// компонент переход, и отменяет его сам, чтобы happy-dom не уходил по адресу.
function click(element, init = {}) {
    let prevented = null
    const record = (event) => {
        prevented = event.defaultPrevented
        event.preventDefault()
    }
    window.addEventListener('click', record)
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }))
    window.removeEventListener('click', record)

    return prevented
}

const mountWith = (plugin, props) => {
    const errors = []
    const warnings = []
    const wrapper = mount(PageTabs, {
        props,
        attachTo: document.body,
        global: {
            plugins: plugin ? [[dashboardUi, plugin]] : [],
            config: {
                errorHandler: (error) => errors.push(error),
                warnHandler: (message) => warnings.push(message),
            },
        },
    })

    return { wrapper, errors, warnings }
}

const mountTabs = (plugin, props = {}) => mountWith(plugin, { tabs: TABS, activeKey: 'certificates', ...props })

describe('PageTabs', () => {
    it('рисует по ссылке на таб с адресом и подписью', () => {
        const { wrapper, errors, warnings } = mountTabs(null)

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        const links = wrapper.findAll('a')
        expect(links.map((link) => link.attributes('href'))).toEqual(TABS.map((tab) => tab.url))
        expect(links.map((link) => link.text())).toEqual(['Ордера', 'Сертификаты', 'Sms'])
    })

    it('корень — nav с ресетом пакета, раскладкой и подписью «Закладки»', () => {
        const { wrapper, errors, warnings } = mountTabs(null)

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(wrapper.element.tagName).toBe('NAV')
        expect(wrapper.classes()).toEqual(['bb-dashboard-ui', 'bb:flex', 'bb:space-x-4'])
        expect(wrapper.attributes('aria-label')).toBe('Закладки')
    })
})

const activeCases = [
    { name: 'открыт второй таб', activeKey: 'certificates', current: [false, true, false] },
    { name: 'activeKey не из списка — ни один таб не выделен', activeKey: 'archive', current: [false, false, false] },
    { name: 'activeKey null — ни один таб не выделен', activeKey: null, current: [false, false, false] },
]

describe('PageTabs: открытый таб', () => {
    for (const testCase of activeCases) {
        it(testCase.name, () => {
            const { wrapper, errors, warnings } = mountTabs(null, { activeKey: testCase.activeKey })

            expect(errors).toEqual([])
            expect(warnings).toEqual([])

            wrapper.findAll('a').forEach((link, index) => {
                const classes = link.classes()

                for (const cls of ['bb:px-3', 'bb:py-2', 'bb:font-medium', 'bb:text-sm', 'bb:rounded-md']) {
                    expect(classes).toContain(cls)
                }

                if (testCase.current[index]) {
                    expect(link.attributes('aria-current')).toBe('page')
                    expect(classes).toContain('bb:bg-indigo-100')
                    expect(classes).toContain('bb:text-gray-700')
                    expect(classes).not.toContain('bb:text-gray-500')
                } else {
                    expect(link.attributes('aria-current')).toBeUndefined()
                    expect(classes).toContain('bb:text-gray-500')
                    expect(classes).toContain('bb:hover:text-gray-700')
                    expect(classes).not.toContain('bb:bg-indigo-100')
                }
            })
        })
    }

    it('числовые ключи не выделяются: сравнение с activeKey строгое', () => {
        const tabs = [
            { key: 1, name: 'Первый', url: '/first' },
            { key: 2, name: 'Второй', url: '/second' },
        ]
        const { wrapper, errors, warnings } = mountTabs(null, { tabs, activeKey: '1' })

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(wrapper.findAll('a')).toHaveLength(2)
        expect(wrapper.findAll('[aria-current]')).toHaveLength(0)
    })
})

const notArrayCases = [
    { name: 'tabs: null', props: { tabs: null, activeKey: 'orders' } },
    { name: 'tabs не передан', props: { activeKey: 'orders' } },
]

describe('PageTabs: список табов', () => {
    for (const testCase of notArrayCases) {
        it(`${testCase.name} — пустой nav и одно предупреждение Vue`, () => {
            const { wrapper, errors, warnings } = mountWith(null, testCase.props)

            expect(errors).toEqual([])
            expect(warnings).toHaveLength(1)
            expect(warnings[0]).toContain('"tabs"')
            expect(wrapper.element.tagName).toBe('NAV')
            expect(wrapper.findAll('a')).toHaveLength(0)
        })
    }

    it('элементы, которые не объекты, пропускаются', () => {
        const { wrapper, errors, warnings } = mountTabs(null, { tabs: [null, TABS[0], 'Ордера', 42, TABS[1]] })

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(wrapper.findAll('a').map((link) => link.attributes('href'))).toEqual([TABS[0].url, TABS[1].url])
    })
})

const passThroughCases = [
    { name: 'средняя кнопка', init: { button: 1 } },
    { name: '⌘-клик', init: { metaKey: true } },
    { name: 'Ctrl-клик', init: { ctrlKey: true } },
    { name: 'Shift-клик', init: { shiftKey: true } },
    { name: 'Alt-клик', init: { altKey: true } },
]

describe('PageTabs: переход', () => {
    it('обычный клик уходит в navigate с адресом таба и отменяет переход браузера', () => {
        const visited = []
        const { wrapper, errors, warnings } = mountTabs({ navigate: (href) => visited.push(href) })

        expect(click(wrapper.findAll('a')[2].element)).toBe(true)
        expect(visited).toEqual([TABS[2].url])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    for (const testCase of passThroughCases) {
        it(`${testCase.name} остаётся браузеру`, () => {
            const visited = []
            const { wrapper, errors, warnings } = mountTabs({ navigate: (href) => visited.push(href) })

            expect(click(wrapper.findAll('a')[0].element, testCase.init)).toBe(false)
            expect(visited).toEqual([])
            expect(errors).toEqual([])
            expect(warnings).toEqual([])
        })
    }

    it('без плагина браузер идёт по ссылке сам', () => {
        const { wrapper, errors, warnings } = mountTabs(null)

        expect(click(wrapper.findAll('a')[0].element)).toBe(false)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

const langCases = [
    { name: 'проп lang en — «Tabs»', plugin: null, props: { lang: 'en' }, expected: 'Tabs' },
    { name: 'плагин en — «Tabs»', plugin: { lang: 'en' }, props: {}, expected: 'Tabs' },
    { name: 'проп lang ru главнее плагина en', plugin: { lang: 'en' }, props: { lang: 'ru' }, expected: 'Закладки' },
]

describe('PageTabs: язык', () => {
    for (const testCase of langCases) {
        it(testCase.name, () => {
            const { wrapper, errors, warnings } = mountTabs(testCase.plugin, testCase.props)

            expect(errors).toEqual([])
            expect(warnings).toEqual([])
            expect(wrapper.attributes('aria-label')).toBe(testCase.expected)
        })
    }
})

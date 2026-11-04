// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h } from 'vue'
import NavigationHeader from '../src/components/NavigationHeader.vue'
import NavigationMenuElement from '../src/components/NavigationMenuElement.vue'
import HamburgerMenu from '../src/components/HamburgerMenu.vue'
import { dashboardUi } from '../src/plugin.js'

enableAutoUnmount(afterEach)
// Как в tests/PageTabs.test.js: монтирование в документ, чтобы клик всплывал до window.
afterEach(() => {
    document.body.innerHTML = ''
})

const ITEMS = [
    { key: 'orders', name: 'Ордера', url: 'https://example.test/orders' },
    { key: 'groups', name: 'Группы', url: 'https://example.test/groups' },
    { key: 'admin', name: 'Администратор', url: 'https://example.test/admin' },
]
const ACTIONS = [{ label: 'Выйти', href: '#' }]

// Как в tests/PageTabs.test.js: слушатель на window записывает, отменил ли
// компонент переход, и отменяет его сам, чтобы happy-dom не уходил по адресу.
function click(element) {
    let prevented = null
    const record = (event) => {
        prevented = event.defaultPrevented
        event.preventDefault()
    }
    window.addEventListener('click', record)
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
    window.removeEventListener('click', record)

    return prevented
}

const mountWith = (plugin, props, extra = {}) => {
    const errors = []
    const warnings = []
    const wrapper = mount(NavigationHeader, {
        props,
        attachTo: document.body,
        global: {
            plugins: plugin ? [[dashboardUi, plugin]] : [],
            config: {
                errorHandler: (error) => errors.push(error),
                warnHandler: (message) => warnings.push(message),
            },
        },
        ...extra,
    })

    return { wrapper, errors, warnings }
}

const mountHeader = (plugin, props = {}, extra = {}) => mountWith(plugin, { items: ITEMS, activeKey: 'groups', actions: ACTIONS, ...props }, extra)

describe('NavigationHeader: пункты', () => {
    it('пункты по порядку: href из url, подпись из name', () => {
        const { wrapper, errors, warnings } = mountHeader(null)

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        const elements = wrapper.findAllComponents(NavigationMenuElement)
        expect(elements).toHaveLength(3)
        expect(elements.map((element) => element.attributes('href'))).toEqual(ITEMS.map((item) => item.url))
        expect(elements.map((element) => element.text())).toEqual(ITEMS.map((item) => item.name))
    })

    it('активный по activeKey: isActive и aria-current="page" только у него', () => {
        const { wrapper, errors, warnings } = mountHeader(null)

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        const elements = wrapper.findAllComponents(NavigationMenuElement)
        expect(elements.map((element) => element.props('isActive'))).toEqual([false, true, false])
        expect(elements.map((element) => element.attributes('aria-current'))).toEqual([undefined, 'page', undefined])
    })

    it.each([['missing'], [null]])('activeKey %j — ни одного активного, aria-current нет', (activeKey) => {
        const { wrapper, errors, warnings } = mountHeader(null, { activeKey })

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(wrapper.findAllComponents(NavigationMenuElement).map((element) => element.props('isActive'))).toEqual([false, false, false])
        expect(wrapper.findAll('[aria-current]')).toHaveLength(0)
    })

    it('числовой ключ не равен строковому activeKey', () => {
        const items = [
            { key: 1, name: 'Первый', url: '/first' },
            { key: 2, name: 'Второй', url: '/second' },
        ]
        const { wrapper, errors, warnings } = mountHeader(null, { items, activeKey: '1' })

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(wrapper.findAllComponents(NavigationMenuElement)).toHaveLength(2)
        expect(wrapper.findAll('[aria-current]')).toHaveLength(0)
    })

    // Предупреждение Vue о типе допустимо, ошибок быть не должно.
    it.each([[null], ['строка'], [{}]])('items %j — пунктов нет, без ошибок', (items) => {
        const { wrapper, errors } = mountHeader(null, { items })

        expect(errors).toEqual([])
        expect(wrapper.element.tagName).toBe('NAV')
        expect(wrapper.findAllComponents(NavigationMenuElement)).toHaveLength(0)
    })

    it('элементы-не-объекты пропускаются', () => {
        const { wrapper, errors, warnings } = mountHeader(null, { items: [null, 'x', ITEMS[0]] })

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(wrapper.findAllComponents(NavigationMenuElement)).toHaveLength(1)
    })

    it('смена items: пункт администратора появляется и исчезает', async () => {
        const { wrapper, errors, warnings } = mountHeader(null, { items: ITEMS.slice(0, 2) })
        expect(wrapper.findAllComponents(NavigationMenuElement)).toHaveLength(2)

        await wrapper.setProps({ items: ITEMS })
        expect(wrapper.findAllComponents(NavigationMenuElement)).toHaveLength(3)

        await wrapper.setProps({ items: ITEMS.slice(0, 2) })
        expect(wrapper.findAllComponents(NavigationMenuElement)).toHaveLength(2)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

describe('NavigationHeader: меню профиля и логотип', () => {
    it('actions уходят в HamburgerMenu', () => {
        const { wrapper } = mountHeader(null)

        expect(wrapper.findComponent(HamburgerMenu).props('actions')).toEqual(ACTIONS)
    })

    it('без actions кнопки меню нет', () => {
        const { wrapper, errors, warnings } = mountHeader(null, { actions: undefined })

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(wrapper.find('button').exists()).toBe(false)
    })

    it('слот logo перед пунктами; без слота блока логотипа нет', () => {
        const withLogo = mountHeader(null, {}, { slots: { logo: () => h('img', { alt: 'Логотип', src: '/logo.png' }) } })
        const html = withLogo.wrapper.html()
        expect(html).toContain('alt="Логотип"')
        expect(html.indexOf('alt="Логотип"')).toBeLessThan(html.indexOf('Ордера'))

        const withoutLogo = mountHeader(null)
        expect(withoutLogo.wrapper.find('img').exists()).toBe(false)
        expect(withoutLogo.wrapper.find('.bb\\:shrink-0').exists()).toBe(false)
    })
})

const langCases = [
    { name: 'по умолчанию — «Разделы»', plugin: null, props: {}, expected: 'Разделы' },
    { name: 'проп lang en — «Sections»', plugin: null, props: { lang: 'en' }, expected: 'Sections' },
    { name: 'плагин en — «Sections»', plugin: { lang: 'en' }, props: {}, expected: 'Sections' },
]

describe('NavigationHeader: язык', () => {
    for (const testCase of langCases) {
        it(`aria-label ${testCase.name}`, () => {
            const { wrapper, errors, warnings } = mountHeader(testCase.plugin, testCase.props)

            expect(errors).toEqual([])
            expect(warnings).toEqual([])
            expect(wrapper.attributes('aria-label')).toBe(testCase.expected)
        })
    }

    it('lang доходит до HamburgerMenu', () => {
        const { wrapper } = mountHeader(null, { lang: 'en' })

        expect(wrapper.findComponent(HamburgerMenu).props('lang')).toBe('en')
    })
})

describe('NavigationHeader: корень', () => {
    it('class и data-* — на корне nav', () => {
        const { wrapper } = mountHeader(null, { class: 'extra', 'data-test': 'header' })

        expect(wrapper.element.tagName).toBe('NAV')
        expect(wrapper.classes()).toContain('extra')
        expect(wrapper.classes()).toContain('bb-dashboard-ui')
        expect(wrapper.attributes('data-test')).toBe('header')
    })

    it('клик по пункту уходит в navigate плагина', () => {
        const visited = []
        const { wrapper, errors, warnings } = mountHeader({ navigate: (href) => visited.push(href) })

        expect(click(wrapper.findAll('a')[1].element)).toBe(true)
        expect(visited).toEqual([ITEMS[1].url])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

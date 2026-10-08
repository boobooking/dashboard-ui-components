// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import HamburgerMenu from '../src/components/HamburgerMenu.vue'
import DropdownButtonWithAction from '../src/components/DropdownButtonWithAction.vue'
import { dashboardUi } from '../src/plugin.js'
import { flushToggles, installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

// Панель меню — popover="auto" Popover API. Его заменяет tests/popoverStub.js:
// toggle в нём приходит отложенно и объединённо, как в браузере. attachTo
// нужен показу: showPopover требует элемент в документе.
let uninstallPopover

beforeEach(() => {
    uninstallPopover = installPopoverStub()
})

afterEach(() => {
    uninstallPopover()
})

const VALIDATOR_WARNING = 'Invalid prop: custom validator check failed for prop "actions"'

// Меню профиля в шапке: два перехода и выход действием.
function profileActions(onSelect = () => {}) {
    return [
        { label: 'Администраторы', href: '#users' },
        { label: 'Поменять пароль', href: '#password' },
        { label: 'Выйти', onSelect },
    ]
}

function buttonOf(wrapper) {
    return wrapper.find('button[popovertarget]')
}

function menuOf(wrapper) {
    return wrapper.get('[role="menu"]')
}

function itemsOf(wrapper) {
    return menuOf(wrapper).findAll('[role="menuitem"]')
}

function isOpen(wrapper) {
    return menuOf(wrapper).element.matches(':popover-open')
}

async function settle() {
    await flushToggles()
    await flushPromises()
}

async function openMenu(wrapper) {
    await buttonOf(wrapper).trigger('click')
    await settle()
}

function press(key) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    document.activeElement.dispatchEvent(event)
    return event
}

describe('HamburgerMenu: кнопка', () => {
    it.each([
        { name: 'без плагина', props: {}, global: {}, expected: 'Открыть меню' },
        { name: 'lang en', props: { lang: 'en' }, global: {}, expected: 'Open menu' },
        { name: 'плагин en', props: {}, global: { plugins: [[dashboardUi, { lang: 'en' }]] }, expected: 'Open menu' },
    ])('подпись кнопки для скринридера: $name — «$expected»', ({ props, global, expected }) => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions(), ...props }, global })

        expect(buttonOf(wrapper).attributes('type')).toBe('button')
        expect(buttonOf(wrapper).text()).toBe(expected)
    })

    it('без пунктов кнопки и панели нет', () => {
        mount(HamburgerMenu, { attachTo: document.body })

        expect(document.body.querySelector('button')).toBeNull()
        expect(document.body.querySelector('[role="menu"]')).toBeNull()
    })
})

describe('HamburgerMenu: открытие и закрытие', () => {
    it('кнопка с popovertarget открывает и закрывает меню', async () => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() } })

        expect(buttonOf(wrapper).attributes('popovertarget')).toBe(menuOf(wrapper).attributes('id'))
        expect(menuOf(wrapper).attributes('aria-labelledby')).toBe(buttonOf(wrapper).attributes('id'))
        expect(menuOf(wrapper).attributes('popover')).toBe('auto')

        await openMenu(wrapper)
        expect(isOpen(wrapper)).toBe(true)

        await openMenu(wrapper)
        expect(isOpen(wrapper)).toBe(false)
    })

    it('Escape закрывает меню', async () => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() } })
        await openMenu(wrapper)

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await settle()

        expect(isOpen(wrapper)).toBe(false)
    })

    it('клик вне меню закрывает его', async () => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() } })
        await openMenu(wrapper)

        document.body.click()
        await settle()

        expect(isOpen(wrapper)).toBe(false)
    })
})

describe('HamburgerMenu: пункты', () => {
    const navigation = []
    const inApp = { plugins: [[dashboardUi, { navigate: (href) => navigation.push(href) }]] }

    beforeEach(() => {
        navigation.length = 0
    })

    it('переход — ссылка: клик уходит в navigate плагина и закрывает меню', async () => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() }, global: inApp })
        await openMenu(wrapper)

        const link = itemsOf(wrapper)[0]
        expect(link.element.tagName).toBe('A')
        expect(link.attributes('href')).toBe('#users')
        await link.trigger('click')
        await settle()

        expect(navigation).toEqual(['#users'])
        expect(isOpen(wrapper)).toBe(false)
    })

    it('клик по переходу с Cmd остаётся браузеру, а меню закрывается', async () => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() }, global: inApp })
        await openMenu(wrapper)

        await itemsOf(wrapper)[0].trigger('click', { metaKey: true })
        await settle()

        expect(navigation).toEqual([])
        expect(isOpen(wrapper)).toBe(false)
    })

    it('действие вызывает onSelect один раз без аргументов и закрывает меню', async () => {
        const onSelect = vi.fn()
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions(onSelect) } })
        await openMenu(wrapper)

        const button = itemsOf(wrapper)[2]
        expect(button.element.tagName).toBe('BUTTON')
        await button.trigger('click')
        await settle()

        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(onSelect).toHaveBeenCalledWith()
        expect(isOpen(wrapper)).toBe(false)
    })
})

describe('HamburgerMenu: стрелки', () => {
    it.each([
        { key: 'ArrowDown', want: 'Администраторы' },
        { key: 'ArrowUp', want: 'Выйти' },
    ])('в открытом меню $key переводит фокус на «$want» и не прокручивает страницу', async ({ key, want }) => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() } })
        buttonOf(wrapper).element.focus()
        await openMenu(wrapper)

        const event = press(key)

        expect(event.defaultPrevented).toBe(true)
        expect(document.activeElement.textContent).toBe(want)
    })

    it('у закрытого меню стрелки прокручивают страницу', () => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() } })
        buttonOf(wrapper).element.focus()

        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })
})

describe('HamburgerMenu: место меню', () => {
    it('меню встаёт правым краем по правому краю кнопки, а не обёртки', async () => {
        Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1000 })
        Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 800 })
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() } })
        const button = buttonOf(wrapper).element
        // Обёртка кнопки — корень PopoverMenu. wrapper.element для этого
        // не годится: в режиме разработки корень HamburgerMenu — фрагмент
        // из комментария и <popover-menu>, и wrapper.element — контейнер
        // монтирования. Обёртка шире кнопки: по обёртке правый край меню
        // был бы 50px.
        button.parentElement.getBoundingClientRect = () => ({ top: 10, bottom: 50, left: 800, right: 950 })
        button.getBoundingClientRect = () => ({ top: 10, bottom: 50, left: 860, right: 900 })

        try {
            await openMenu(wrapper)

            expect(menuOf(wrapper).element.style.right).toBe('100px')
            expect(menuOf(wrapper).element.style.top).toBe('54px')
        } finally {
            delete document.documentElement.clientWidth
            delete document.documentElement.clientHeight
        }
    })
})

describe('HamburgerMenu: проверка пунктов', () => {
    function mountChecked(actions) {
        const warnings = []
        const errors = []
        mount(HamburgerMenu, {
            attachTo: document.body,
            props: { actions },
            global: {
                config: {
                    warnHandler: (message) => warnings.push(message),
                    errorHandler: (error) => errors.push(error),
                },
            },
        })

        return { warnings, errors }
    }

    it.each([
        { name: 'элемент null', item: null },
        { name: 'нет label', item: { href: '#users' } },
        { name: 'ни href, ни onSelect', item: { label: 'Выйти' } },
    ])('неверный пункт ($name) — ровно одно предупреждение валидатора и без ошибок', ({ item }) => {
        const { warnings, errors } = mountChecked([...profileActions(), item])

        expect(warnings).toHaveLength(1)
        expect(warnings[0]).toContain(VALIDATOR_WARNING)
        expect(errors).toEqual([])
    })

    it('верные пункты, и опасный тоже, — без предупреждений', () => {
        const { warnings, errors } = mountChecked([...profileActions(), { label: 'Удалить', danger: true, onSelect: () => {} }])

        expect(warnings).toEqual([])
        expect(errors).toEqual([])
    })
})

describe('HamburgerMenu: на странице', () => {
    it('открытие меню в шапке закрывает открытое меню строки таблицы, id у меню свои', async () => {
        const Page = {
            render: () => h('div', [
                h(HamburgerMenu, { actions: profileActions() }),
                h(DropdownButtonWithAction, { actions: [{ label: 'Удалить', onSelect: () => {} }] }, { button: () => 'Редактировать' }),
            ]),
        }
        const page = mount(Page, { attachTo: document.body })
        const header = page.findComponent(HamburgerMenu)
        const row = page.findComponent(DropdownButtonWithAction)
        const rowArrow = row.get('button[popovertarget]')
        const rowMenu = row.get('[role="menu"]')

        await rowArrow.trigger('click')
        await settle()
        expect(rowMenu.element.matches(':popover-open')).toBe(true)

        await openMenu(header)

        expect(isOpen(header)).toBe(true)
        expect(rowMenu.element.matches(':popover-open')).toBe(false)
        expect(row.emitted('update:modelValue')).toEqual([[true], [false]])
        expect(buttonOf(header).attributes('id')).not.toBe(rowArrow.attributes('id'))
        expect(menuOf(header).attributes('id')).not.toBe(rowMenu.attributes('id'))
    })

    it('новый массив тех же пунктов при открытом меню не закрывает его и не сбрасывает фокус', async () => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() } })
        await openMenu(wrapper)
        press('ArrowDown')
        press('ArrowDown')

        await wrapper.setProps({ actions: profileActions() })
        await settle()

        expect(isOpen(wrapper)).toBe(true)
        expect(document.activeElement.textContent).toBe('Поменять пароль')
    })

    it('пункты пропали при открытом меню — меню уходит, стрелки снова прокручивают страницу', async () => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() } })
        await openMenu(wrapper)

        await wrapper.setProps({ actions: [] })
        await settle()

        expect(document.body.querySelector('[role="menu"]')).toBeNull()
        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })
})

// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import HamburgerMenu from '../src/components/HamburgerMenu.vue'
import DropdownButtonWithAction from '../src/components/DropdownButtonWithAction.vue'
import { COLOR_NAMES, colorClass } from '../src/colors.js'
import { dashboardUi } from '../src/plugin.js'
import ConfirmationModal from '../src/components/ConfirmationModal.vue'
import { flushToggles, installPopoverStub } from './popoverStub.js'
import { installSafariFocus } from './safariFocus.js'

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
        { name: 'неверный color', item: { label: 'Удалить', color: 'blue', onSelect: () => {} } },
    ])('неверный пункт ($name) — ровно одно предупреждение валидатора и без ошибок', ({ item }) => {
        const { warnings, errors } = mountChecked([...profileActions(), item])

        expect(warnings).toHaveLength(1)
        expect(warnings[0]).toContain(VALIDATOR_WARNING)
        expect(errors).toEqual([])
    })

    it('верные пункты, и цветные тоже, — без предупреждений', () => {
        const { warnings, errors } = mountChecked([
            ...profileActions(),
            { label: 'Отправить заново', color: 'yellow', onSelect: () => {} },
            { label: 'Удалить', color: 'red', onSelect: () => {} },
        ])

        expect(warnings).toEqual([])
        expect(errors).toEqual([])
    })
})

describe('HamburgerMenu: цвета пунктов', () => {
    it('обычный, жёлтый и красный пункт — свой цвет текста и подсветки', () => {
        const wrapper = mount(HamburgerMenu, {
            attachTo: document.body,
            props: {
                actions: [
                    { label: 'Администраторы', href: '#users' },
                    { label: 'Отправить заново', color: 'yellow', onSelect: () => {} },
                    { label: 'Удалить', color: 'red', onSelect: () => {} },
                ],
            },
        })

        const [plain, yellow, red] = itemsOf(wrapper).map((item) => item.classes())
        expect(plain).toEqual(expect.arrayContaining(['bb:text-gray-700', 'bb:focus:bg-gray-100', 'bb:focus:text-gray-900', 'bb:hover:bg-gray-100', 'bb:hover:text-gray-900']))
        expect(yellow).toEqual(expect.arrayContaining(['bb:bg-yellow-100', 'bb:text-yellow-800', 'bb:hover:bg-yellow-200', 'bb:focus:bg-yellow-200']))
        expect(yellow).not.toContain('bb:text-gray-700')
        expect(red).toEqual(expect.arrayContaining(['bb:bg-red-100', 'bb:text-red-800', 'bb:hover:bg-red-200', 'bb:focus:bg-red-200']))
        expect(red).not.toContain('bb:bg-red-400')
    })

    it.each(COLOR_NAMES)('пункт цвета %s — классы menuItem из списка', (color) => {
        const wrapper = mount(HamburgerMenu, {
            attachTo: document.body,
            props: { actions: [{ label: 'Пункт', color, onSelect: () => {} }] },
        })

        expect(itemsOf(wrapper)[0].classes()).toEqual(expect.arrayContaining(colorClass(color, 'menuItem').split(' ')))
    })
})

describe('HamburgerMenu: пункт с полем danger', () => {
    it('обычный пункт без предупреждений; красный — по color', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const warnings = []
        const wrapper = mount(HamburgerMenu, {
            attachTo: document.body,
            props: {
                actions: [
                    ...profileActions(),
                    { label: 'Опасное', danger: true, onSelect: () => {} },
                    { label: 'Удалить', danger: true, color: 'red', onSelect: () => {} },
                ],
            },
            global: { config: { warnHandler: (message) => warnings.push(message) } },
        })

        expect(itemsOf(wrapper)[3].classes()).toContain('bb:text-gray-700')
        expect(itemsOf(wrapper)[4].classes()).toContain('bb:text-red-800')
        expect(warnings).toEqual([])
        expect(warn).not.toHaveBeenCalled()
        warn.mockRestore()
    })
})

describe('HamburgerMenu: на странице', () => {
    it('открытие меню в шапке закрывает открытое меню строки таблицы, id у меню свои', async () => {
        const Page = {
            render: () => h('div', [
                h(HamburgerMenu, { actions: profileActions() }),
                h(DropdownButtonWithAction, { actions: [{ label: 'Редактировать', href: '#edit' }, { label: 'Удалить', onSelect: () => {} }] }),
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

// Safari: клик фокус на кнопку и пункт не ставит, а при скрытии панели фокус
// с пункта уходит на body. Chrome возвращает фокус на кнопку сам.
describe('HamburgerMenu: фокус после закрытия в Safari', () => {
    const navigation = []
    const errors = []
    const warnings = []
    const global = {
        plugins: [[dashboardUi, { navigate: (href) => navigation.push(href) }]],
        config: { errorHandler: (error) => errors.push(String(error)), warnHandler: (message) => warnings.push(message) },
    }
    const link = { label: 'Поменять пароль', href: '#password' }
    const withoutNavigate = {
        plugins: [dashboardUi],
        config: global.config,
    }
    let uninstallSafari
    let frames
    let wrappers

    beforeEach(() => {
        navigation.length = 0
        errors.length = 0
        warnings.length = 0
        frames = []
        wrappers = []
        uninstallSafari = installSafariFocus()
        vi.stubGlobal('requestAnimationFrame', (callback) => frames.push(callback))
        vi.stubGlobal('cancelAnimationFrame', () => {})
        document.body.focus()
    })

    // Предупреждения Vue при размонтировании тоже попадают в проверку.
    afterEach(() => {
        wrappers.forEach((wrapper) => wrapper.unmount())
        uninstallSafari()
        vi.unstubAllGlobals()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    function runFrames() {
        frames.splice(0).forEach((callback) => callback(0))
    }

    function mountMenu(actions, mountGlobal = global) {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions }, global: mountGlobal })
        wrappers.push(wrapper)
        return wrapper
    }

    it.each([
        { name: 'Escape после стрелок', close: () => press('Escape') },
        { name: 'Enter на пункте', close: () => document.activeElement.click() },
    ])('$name — фокус на кнопке меню', async ({ close }) => {
        const wrapper = mountMenu([link, { label: 'Выйти', onSelect: () => {} }])
        await openMenu(wrapper)
        press('ArrowDown')
        expect(document.activeElement.textContent).toBe('Поменять пароль')

        close()
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(document.activeElement).toBe(buttonOf(wrapper).element)
    })

    it('клик по пункту-кнопке без предварительного фокуса — фокус на кнопке меню, onSelect один раз', async () => {
        const onSelect = vi.fn()
        const wrapper = mountMenu([link, { label: 'Выйти', onSelect }])
        await openMenu(wrapper)
        expect(document.activeElement).toBe(document.body)

        await itemsOf(wrapper)[1].trigger('click')
        await settle()

        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(document.activeElement).toBe(buttonOf(wrapper).element)
    })

    it('клик по пункту-ссылке без предварительного фокуса — фокус на кнопке меню, navigate вызван', async () => {
        const wrapper = mountMenu([link, { label: 'Выйти', onSelect: () => {} }])
        await openMenu(wrapper)

        await itemsOf(wrapper)[0].trigger('click')
        await settle()

        expect(navigation).toEqual(['#password'])
        expect(document.activeElement).toBe(buttonOf(wrapper).element)
    })

    it('Enter на пункте-кнопке — фокус на кнопке меню, onSelect один раз', async () => {
        const onSelect = vi.fn()
        const wrapper = mountMenu([link, { label: 'Выйти', onSelect }])
        await openMenu(wrapper)
        press('ArrowDown')
        press('ArrowDown')
        expect(document.activeElement.textContent).toBe('Выйти')

        document.activeElement.click()
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(document.activeElement).toBe(buttonOf(wrapper).element)
    })

    it('клик по пункту-ссылке без navigate — фокус на кнопке меню, ошибок нет', async () => {
        const wrapper = mountMenu([link, { label: 'Выйти', onSelect: () => {} }], withoutNavigate)
        await openMenu(wrapper)

        await itemsOf(wrapper)[0].trigger('click')
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(navigation).toEqual([])
        expect(document.activeElement).toBe(buttonOf(wrapper).element)
    })

    it('onSelect переводит фокус на другой элемент страницы — фокус там и остаётся', async () => {
        const field = document.createElement('input')
        document.body.appendChild(field)
        onTestFinished(() => field.remove())
        const wrapper = mountMenu([link, { label: 'Выйти', onSelect: () => field.focus() }])
        await openMenu(wrapper)

        await itemsOf(wrapper)[1].trigger('click')
        await settle()

        expect(document.activeElement).toBe(field)
    })

    // Пункт открывает ConfirmationModal: порядок кадра модалки и toggle
    // закрытия меню в браузерах разный.
    it.each(['toggle-first', 'frame-first'])('пункт открывает модалку, порядок %s — фокус на «Отмена», после закрытия на кнопке меню', async (order) => {
        const Page = {
            data: () => ({ open: false }),
            render() {
                return h('div', [
                    h(HamburgerMenu, { actions: [link, { label: 'Удалить', onSelect: () => { this.open = true } }] }),
                    h(ConfirmationModal, {
                        confirmationHeading: 'Удаление',
                        confirmationText: 'Удалить?',
                        actionButtonText: 'Удалить',
                        isOpen: this.open,
                        onActionCanceled: () => { this.open = false },
                    }),
                ])
            },
        }
        const wrapper = mount(Page, { attachTo: document.body, global })
        wrappers.push(wrapper)
        await openMenu(wrapper)
        runFrames()

        await itemsOf(wrapper)[1].trigger('click')
        if (order === 'toggle-first') {
            await flushToggles()
        }
        runFrames()
        const cancel = wrapper.findAll('[role="dialog"] button').find((button) => button.text() === 'Отмена').element
        expect(document.activeElement).toBe(cancel)

        await flushToggles()
        expect(document.activeElement).toBe(cancel)

        await wrapper.findAll('[role="dialog"] button').find((button) => button.text() === 'Отмена').trigger('click')
        await settle()
        expect(wrapper.vm.open).toBe(false)
        expect(document.activeElement).toBe(buttonOf(wrapper).element)
    })
})

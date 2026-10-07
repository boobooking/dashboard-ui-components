// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
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

const slots = {
    button: () => h('span', 'Редактировать'),
}

// Одно действие: большинству тестов нужен только факт, что пункт есть.
const actions = [{ label: 'Удалить', onSelect: () => {} }]

function arrowOf(wrapper) {
    return wrapper.findAll('button').find((button) => button.text().includes('Открыть меню'))
}

function menuOf(wrapper) {
    return wrapper.get('[role="menu"]')
}

function isOpen(wrapper) {
    return menuOf(wrapper).element.matches(':popover-open')
}

async function settle() {
    await flushToggles()
    await flushPromises()
}

// Две строки с меню, которыми управляет родитель, как на Users/Index:
// открыто только меню активной строки, закрытие меню сбрасывает выбор.
const Rows = {
    data() {
        return { active: null, closes: 0 }
    },
    methods: {
        opened(row) {
            this.active = row
        },
        closed() {
            this.active = null
            this.closes++
        },
    },
    render() {
        return h('div', ['a', 'b'].map((row) => h(
            DropdownButtonWithAction,
            {
                key: row,
                'data-row': row,
                actions,
                modelValue: this.active === row,
                'onUpdate:modelValue': (opened) => (opened ? this.opened(row) : this.closed()),
            },
            slots,
        )))
    },
}

function row(wrapper, name) {
    return wrapper.get(`[data-row="${name}"]`)
}

describe('DropdownButtonWithAction без привязки', () => {
    it('стрелка с popovertarget открывает и закрывает меню', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions } })

        expect(arrowOf(wrapper).attributes('popovertarget')).toBe(menuOf(wrapper).attributes('id'))
        expect(menuOf(wrapper).attributes('popover')).toBe('auto')

        await arrowOf(wrapper).trigger('click')
        await settle()
        expect(isOpen(wrapper)).toBe(true)

        await arrowOf(wrapper).trigger('click')
        await settle()
        expect(isOpen(wrapper)).toBe(false)
    })

    it('на клик по стрелке эмитит update:modelValue один раз', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions } })

        await arrowOf(wrapper).trigger('click')
        await settle()

        expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    })

    it('на закрытие по Escape эмитит false', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions } })

        await arrowOf(wrapper).trigger('click')
        await settle()
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await settle()

        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
        expect(isOpen(wrapper)).toBe(false)
    })

    it('на клик вне меню эмитит false', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions } })

        await arrowOf(wrapper).trigger('click')
        await settle()
        document.body.click()
        await settle()

        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('клик по пункту меню закрывает меню и эмитит false', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions } })

        await arrowOf(wrapper).trigger('click')
        await settle()
        await menuOf(wrapper).get('[role="menuitem"]').trigger('click')
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('прокрутка вне меню и изменение размера окна закрывают меню, прокрутка меню — нет', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions } })

        await arrowOf(wrapper).trigger('click')
        await settle()
        menuOf(wrapper).element.dispatchEvent(new Event('scroll'))
        await settle()
        expect(isOpen(wrapper)).toBe(true)

        document.dispatchEvent(new Event('scroll'))
        await settle()
        expect(isOpen(wrapper)).toBe(false)

        await arrowOf(wrapper).trigger('click')
        await settle()
        window.dispatchEvent(new Event('resize'))
        await settle()
        expect(isOpen(wrapper)).toBe(false)
    })

    it('у стрелки возле левого края окна меню сужается до места слева', async () => {
        Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1000 })
        Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 800 })
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions } })
        arrowOf(wrapper).element.getBoundingClientRect = () => ({ top: 100, bottom: 120, left: 120, right: 140 })

        try {
            await arrowOf(wrapper).trigger('click')
            await settle()

            expect(menuOf(wrapper).element.style.maxWidth).toBe('132px')
            expect(menuOf(wrapper).element.style.right).toBe('860px')
        } finally {
            delete document.documentElement.clientWidth
            delete document.documentElement.clientHeight
        }
    })

    // Слушатели прокрутки и размера окна, добавленные и снятые за время теста.
    function recordWindowListeners() {
        const record = { added: [], removed: [] }
        const addSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
            if (type === 'scroll' || type === 'resize') {
                record.added.push([type, listener])
            }
        })
        const removeSpy = vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener) => {
            record.removed.push([type, listener])
        })
        record.restore = () => {
            addSpy.mockRestore()
            removeSpy.mockRestore()
        }

        return record
    }

    it('toggle, пришедший после размонтирования, не оставляет слушателей прокрутки и размера окна', async () => {
        const record = recordWindowListeners()
        const errors = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots,
            props: { actions },
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        try {
            await arrowOf(wrapper).trigger('click')
            wrapper.unmount()
            await settle()

            expect(errors).toEqual([])
            for (const entry of record.added) {
                expect(record.removed).toContainEqual(entry)
            }
        } finally {
            record.restore()
        }
    })

    it('размонтирование открытого меню снимает слушатели прокрутки и размера окна', async () => {
        const record = recordWindowListeners()
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions } })

        try {
            await arrowOf(wrapper).trigger('click')
            await settle()
            expect(record.added.map(([type]) => type).sort()).toEqual(['resize', 'scroll'])

            wrapper.unmount()

            for (const entry of record.added) {
                expect(record.removed).toContainEqual(entry)
            }
        } finally {
            record.restore()
        }
    })

    it('открытие, закрытие, повторное открытие и размонтирование не оставляют слушателей', async () => {
        const record = recordWindowListeners()
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions } })

        try {
            await arrowOf(wrapper).trigger('click')
            await settle()
            await arrowOf(wrapper).trigger('click')
            await settle()
            await arrowOf(wrapper).trigger('click')
            await settle()
            expect(record.added.length).toBeGreaterThan(2)

            wrapper.unmount()

            for (const entry of record.added) {
                expect(record.removed).toContainEqual(entry)
            }
        } finally {
            record.restore()
        }
    })

    it('панель наследует цвет текста: у popover в верхнем слое свой color', () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions } })

        expect(menuOf(wrapper).classes()).toContain('bb:text-inherit')
    })

    it('без действий стрелки и панели нет', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots: { button: slots.button },
        })

        expect(arrowOf(wrapper)).toBeUndefined()
        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    })
})

describe('DropdownButtonWithAction с привязкой', () => {
    it('принимает входящее значение без ответного события', async () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { modelValue: false, actions },
            slots,
        })

        await wrapper.setProps({ modelValue: true })
        await settle()
        expect(isOpen(wrapper)).toBe(true)

        await wrapper.setProps({ modelValue: false })
        await settle()
        expect(isOpen(wrapper)).toBe(false)

        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('не эмитит и тогда, когда toggle приходит позже и объединённым', async () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { modelValue: false, actions },
            slots,
        })

        // Оба значения — до отложенного toggle: браузер пришлёт одно
        // событие с newState: 'closed'.
        await wrapper.setProps({ modelValue: true })
        await wrapper.setProps({ modelValue: false })
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('открытое при монтировании меню открыто без ответного события', async () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { modelValue: true, actions },
            slots,
        })
        await settle()

        expect(isOpen(wrapper)).toBe(true)
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    const switches = [
        { name: 'переключение A → B оставляет выбранной B', from: 'a', to: 'b' },
        { name: 'переключение B → A оставляет выбранной A', from: 'b', to: 'a' },
    ]

    for (const testCase of switches) {
        it(testCase.name, async () => {
            const wrapper = mount(Rows, { attachTo: document.body })

            await arrowOf(row(wrapper, testCase.from)).trigger('click')
            await settle()
            await arrowOf(row(wrapper, testCase.to)).trigger('click')
            await settle()

            expect(wrapper.vm.active).toBe(testCase.to)
            expect(isOpen(row(wrapper, testCase.from))).toBe(false)
            expect(isOpen(row(wrapper, testCase.to))).toBe(true)
        })
    }

    it('закрытие родителем не вызывает обработчик закрытия', async () => {
        const wrapper = mount(Rows, { attachTo: document.body })

        await arrowOf(row(wrapper, 'a')).trigger('click')
        await settle()
        wrapper.vm.active = null
        await settle()

        expect(isOpen(row(wrapper, 'a'))).toBe(false)
        expect(wrapper.vm.closes).toBe(0)
    })

    it('даёт стрелке и меню каждой кнопки свои id', () => {
        const wrapper = mount(Rows, { attachTo: document.body })

        const ids = ['a', 'b'].map((name) => {
            const arrowId = arrowOf(row(wrapper, name)).attributes('id')
            const menuId = menuOf(row(wrapper, name)).attributes('id')
            expect(arrowId).toBeTruthy()
            expect(menuId).toBeTruthy()
            expect(menuOf(row(wrapper, name)).attributes('aria-labelledby')).toBe(arrowId)
            expect(arrowOf(row(wrapper, name)).attributes('popovertarget')).toBe(menuId)
            return [arrowId, menuId]
        })

        expect(ids[0][0]).not.toBe(ids[1][0])
        expect(ids[0][1]).not.toBe(ids[1][1])
    })
})

describe('DropdownButtonWithAction без Popover API', () => {
    it('стрелка и входящее значение не бросают исключений', async () => {
        uninstallPopover()
        uninstallPopover = () => {}
        const errors = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { modelValue: false, actions },
            slots,
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        await arrowOf(wrapper).trigger('click')
        await wrapper.setProps({ modelValue: true })
        await flushPromises()

        expect(errors).toEqual([])
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
})

describe('DropdownButtonWithAction: стрелки', () => {
    // Переход и действие: стрелки ходят и по ссылкам, и по кнопкам.
    const twoActions = [
        { label: 'Поменять пароль', href: '#password' },
        { label: 'Удалить', danger: true, onSelect: () => {} },
    ]

    function press(key) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
        document.activeElement.dispatchEvent(event)
        return event
    }

    async function openMenu(wrapper) {
        arrowOf(wrapper).element.focus()
        await arrowOf(wrapper).trigger('click')
        await settle()
    }

    it.each([
        { key: 'ArrowDown', want: 'Поменять пароль' },
        { key: 'ArrowUp', want: 'Удалить' },
    ])('в открытом меню $key переводит фокус на «$want» и не прокручивает страницу', async ({ key, want }) => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions: twoActions } })
        await openMenu(wrapper)

        const event = press(key)

        expect(event.defaultPrevented).toBe(true)
        expect(document.activeElement.textContent).toBe(want)
    })

    it('в закрытом меню стрелки прокручивают страницу', () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions: twoActions } })
        arrowOf(wrapper).element.focus()

        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })

    it('после закрытия меню стрелки снова прокручивают страницу', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions: twoActions } })
        await openMenu(wrapper)

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })
})

describe('DropdownButtonWithAction: пункты из пропа actions', () => {
    const navigation = []
    const inApp = { plugins: [[dashboardUi, { navigate: (href) => navigation.push(href) }]] }

    beforeEach(() => {
        navigation.length = 0
    })

    function itemsOf(wrapper) {
        return menuOf(wrapper).findAll('[role="menuitem"]')
    }

    function press(key) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
        document.activeElement.dispatchEvent(event)
        return event
    }

    async function openMenu(wrapper) {
        await arrowOf(wrapper).trigger('click')
        await settle()
    }

    it('переход рисуется ссылкой, действие — кнопкой', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots,
            props: { actions: [{ label: 'Поменять пароль', href: '#password' }, { label: 'Удалить', danger: true, onSelect: () => {} }] },
        })

        const [link, button] = itemsOf(wrapper)
        expect(link.element.tagName).toBe('A')
        expect(link.attributes('href')).toBe('#password')
        expect(link.text()).toBe('Поменять пароль')
        expect(button.element.tagName).toBe('BUTTON')
        expect(button.attributes('type')).toBe('button')
        expect(button.text()).toBe('Удалить')
    })

    it('клик по действию вызывает onSelect один раз без аргументов и закрывает меню', async () => {
        const onSelect = vi.fn()
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions: [{ label: 'Удалить', onSelect }] } })
        await openMenu(wrapper)

        await itemsOf(wrapper)[0].trigger('click')
        await settle()

        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(onSelect).toHaveBeenCalledWith()
        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('клик по переходу уходит в navigate плагина и закрывает меню', async () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots,
            props: { actions: [{ label: 'Поменять пароль', href: '#password' }] },
            global: inApp,
        })
        await openMenu(wrapper)

        await itemsOf(wrapper)[0].trigger('click')
        await settle()

        expect(navigation).toEqual(['#password'])
        expect(isOpen(wrapper)).toBe(false)
    })

    it('клик по переходу с Cmd остаётся браузеру, а меню закрывается', async () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots,
            props: { actions: [{ label: 'Поменять пароль', href: '#password' }] },
            global: inApp,
        })
        await openMenu(wrapper)

        await itemsOf(wrapper)[0].trigger('click', { metaKey: true })
        await settle()

        expect(navigation).toEqual([])
        expect(isOpen(wrapper)).toBe(false)
    })

    it.each([
        { name: 'пустой список', value: [] },
        { name: 'null', value: null },
    ])('$name — стрелки и меню нет, предупреждений нет', ({ value }) => {
        const warnings = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots,
            props: { actions: value },
            global: { config: { warnHandler: (message) => warnings.push(message) } },
        })

        expect(arrowOf(wrapper)).toBeUndefined()
        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
        expect(warnings).toEqual([])
    })

    it('новый список при открытом меню виден сразу, и стрелки ходят по нему', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions: [{ label: 'Старый', onSelect: () => {} }] } })
        await openMenu(wrapper)

        await wrapper.setProps({ actions: [{ label: 'Первый новый', onSelect: () => {} }, { label: 'Второй новый', onSelect: () => {} }] })
        arrowOf(wrapper).element.focus()
        press('ArrowUp')

        expect(itemsOf(wrapper).map((item) => item.text())).toEqual(['Первый новый', 'Второй новый'])
        expect(document.activeElement.textContent).toBe('Второй новый')
    })

    // Браузер, удаляя открытый popover из документа, toggle не присылает:
    // слушатели снимает и о закрытии сообщает сам компонент.
    it('список опустел при открытом меню: стрелки снова прокручивают страницу, родитель узнаёт о закрытии', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions } })
        await openMenu(wrapper)

        await wrapper.setProps({ actions: [] })
        await settle()

        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })

    // Наблюдатель modelValue срабатывает до рендера: если пункты и открытие
    // пришли разом, меню в этот момент ещё нет в DOM.
    it('пункты и открытие пришли одновременно — меню открыто, ответного события нет', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { modelValue: false, actions: [] } })

        await wrapper.setProps({ actions, modelValue: true })
        await settle()

        expect(isOpen(wrapper)).toBe(true)
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
})

describe('DropdownButtonWithAction: проверка пунктов', () => {
    const fn = () => {}
    const VALIDATOR_WARNING = 'Invalid prop: custom validator check failed for prop "actions"'

    function mountChecked(value) {
        const warnings = []
        const errors = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots,
            props: { actions: value },
            global: {
                config: {
                    warnHandler: (message) => warnings.push(message),
                    errorHandler: (error) => errors.push(error),
                },
            },
        })

        return { wrapper, warnings, errors }
    }

    it.each([
        { name: 'элемент null', item: null },
        { name: 'элемент-строка', item: 'Удалить' },
        { name: 'нет label', item: { onSelect: fn } },
        { name: 'пустой label', item: { label: '', onSelect: fn } },
        { name: 'ни href, ни onSelect', item: { label: 'Удалить' } },
        { name: 'пустой href', item: { label: 'Открыть', href: '' } },
        { name: 'оба верных поля', item: { label: 'Открыть', href: '#open', onSelect: fn } },
        { name: 'href и onSelect-строка', item: { label: 'Открыть', href: '#open', onSelect: 'ошибка' } },
        { name: 'пустой href и onSelect', item: { label: 'Удалить', href: '', onSelect: fn } },
        { name: 'href null и onSelect', item: { label: 'Удалить', href: null, onSelect: fn } },
        { name: 'onSelect-строка без href', item: { label: 'Удалить', onSelect: 'ошибка' } },
        { name: 'danger-строка', item: { label: 'Удалить', danger: 'да', onSelect: fn } },
    ])('неверный пункт ($name) — предупреждение Vue', ({ item }) => {
        const { warnings } = mountChecked([{ label: 'Верный', onSelect: fn }, item])

        expect(warnings.some((message) => message.includes(VALIDATOR_WARNING))).toBe(true)
    })

    it.each([
        { name: 'переход', item: { label: 'Открыть', href: '#open' } },
        { name: 'действие', item: { label: 'Удалить', onSelect: fn } },
        { name: 'переход с danger', item: { label: 'Открыть', href: '#open', danger: true } },
        { name: 'действие с danger: false', item: { label: 'Удалить', danger: false, onSelect: fn } },
        { name: 'поле со значением undefined', item: { label: 'Открыть', href: '#open', onSelect: undefined } },
    ])('верный пункт ($name) — без предупреждений', ({ item }) => {
        const { warnings } = mountChecked([item])

        expect(warnings).toEqual([])
    })

    it('неверные пункты не роняют компонент ни при рендере, ни при клике', async () => {
        const { wrapper, errors } = mountChecked([
            null,
            'строка',
            { label: 'A', onSelect: 'ошибка' },
            { label: 'B', href: 42 },
            { label: 'C', href: '#c', onSelect: 'ошибка' },
        ])
        const rendered = () => menuOf(wrapper).findAll('[role="menuitem"]')

        expect(rendered().map((item) => [item.element.tagName, item.text()])).toEqual([['BUTTON', 'A'], ['BUTTON', 'B'], ['A', 'C']])

        for (const index of [0, 1, 2]) {
            await arrowOf(wrapper).trigger('click')
            await settle()
            await rendered()[index].trigger('click')
            await settle()
            expect(isOpen(wrapper)).toBe(false)
        }
        expect(errors).toEqual([])
    })

    it('список из одних необъектов — без стрелки', () => {
        const { wrapper, errors } = mountChecked([null, 'строка'])

        expect(arrowOf(wrapper)).toBeUndefined()
        expect(errors).toEqual([])
    })

    it('не массив — без стрелки и без ошибок', () => {
        const { wrapper, errors } = mountChecked('Удалить')

        expect(arrowOf(wrapper)).toBeUndefined()
        expect(errors).toEqual([])
    })

    it('onSelect, бросивший исключение, отдаёт ошибку Vue и не оставляет меню открытым', async () => {
        const failure = new Error('сбой обработчика')
        const { wrapper, errors } = mountChecked([{ label: 'Удалить', onSelect: () => { throw failure } }])
        await arrowOf(wrapper).trigger('click')
        await settle()

        await menuOf(wrapper).get('[role="menuitem"]').trigger('click')
        await settle()

        expect(errors).toEqual([failure])
        expect(isOpen(wrapper)).toBe(false)
    })

    // Vue передаёт в errorHandler отклонённый Promise, только если обработчик
    // клика его вернул; иначе отказ уходит в unhandledrejection.
    it('асинхронный onSelect с отказом отдаёт ошибку Vue, а меню закрывается сразу', async () => {
        const failure = new Error('сбой асинхронного обработчика')
        const { wrapper, errors } = mountChecked([{ label: 'Удалить', onSelect: async () => { throw failure } }])
        await arrowOf(wrapper).trigger('click')
        await settle()

        menuOf(wrapper).get('[role="menuitem"]').element.click()
        expect(isOpen(wrapper)).toBe(false)

        await settle()
        expect(errors).toEqual([failure])
    })
})

describe('DropdownButtonWithAction: убранный слот actions', () => {
    const MESSAGE = '[dashboard-ui-components] DropdownButtonWithAction: слот actions убран, пункты меню передаются пропом actions'
    let warn

    beforeEach(() => {
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
        warn.mockRestore()
        vi.unstubAllEnvs()
    })

    const withSlot = { ...slots, actions: () => h('a', { href: '#', class: 'from-slot' }, 'Из слота') }

    it('переданный слот не рисуется, а в консоль уходит предупреждение', () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots: withSlot })

        expect(wrapper.find('.from-slot').exists()).toBe(false)
        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn).toHaveBeenCalledWith(MESSAGE)
    })

    it('без слота предупреждения нет', () => {
        mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions } })

        expect(warn).not.toHaveBeenCalled()
    })

    it('в продакшен-сборке предупреждения нет', () => {
        vi.stubEnv('NODE_ENV', 'production')

        mount(DropdownButtonWithAction, { attachTo: document.body, slots: withSlot })

        expect(warn).not.toHaveBeenCalled()
    })
})

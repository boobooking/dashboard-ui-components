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

// Основное действие — переход: основная кнопка с ним — ссылка.
const main = { label: 'Редактировать', href: '#edit' }

// Основная кнопка и один пункт меню: большинству тестов нужен только факт,
// что меню есть.
const actions = [main, { label: 'Удалить', onSelect: () => {} }]

function arrowOf(wrapper) {
    return wrapper.findAll('button').find((button) => button.text().includes('Открыть меню'))
}

// Основная кнопка — ссылка или кнопка вне меню и без popovertarget.
function mainOf(wrapper) {
    return wrapper.findAll('a, button').find((element) => element.attributes('popovertarget') === undefined && element.element.closest('[role="menu"]') === null)
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
        )))
    },
}

function row(wrapper, name) {
    return wrapper.get(`[data-row="${name}"]`)
}

describe('DropdownButtonWithAction без привязки', () => {
    it('стрелка с popovertarget открывает и закрывает меню', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })

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
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })

        await arrowOf(wrapper).trigger('click')
        await settle()

        expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    })

    it('на закрытие по Escape эмитит false', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })

        await arrowOf(wrapper).trigger('click')
        await settle()
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await settle()

        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
        expect(isOpen(wrapper)).toBe(false)
    })

    it('на клик вне меню эмитит false', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })

        await arrowOf(wrapper).trigger('click')
        await settle()
        document.body.click()
        await settle()

        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('клик по пункту меню закрывает меню и эмитит false', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })

        await arrowOf(wrapper).trigger('click')
        await settle()
        await menuOf(wrapper).get('[role="menuitem"]').trigger('click')
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('прокрутка вне меню и изменение размера окна закрывают меню, прокрутка меню — нет', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })

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
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })
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
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })

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
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })

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

    it('пункты задают цвет текста сами — обычный, жёлтый, красный: у popover в верхнем слое свой color', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: {
                actions: [
                    main,
                    { label: 'Поменять пароль', href: '#password' },
                    { label: 'Отправить заново', color: 'yellow', onSelect: () => {} },
                    { label: 'Удалить', color: 'red', onSelect: () => {} },
                ],
            },
        })

        const [plain, yellow, red] = menuOf(wrapper).findAll('[role="menuitem"]').map((item) => item.classes())
        expect(plain).toEqual(expect.arrayContaining(['bb:text-gray-700', 'bb:focus:bg-gray-100']))
        expect(yellow).toEqual(expect.arrayContaining(['bb:text-yellow-800', 'bb:focus:bg-yellow-100']))
        expect(red).toEqual(expect.arrayContaining(['bb:text-red-700', 'bb:focus:bg-red-50']))
        expect(red).not.toContain('bb:bg-red-400')
    })

    // Высоту стрелки задаёт её содержимое, высоту основной кнопки — слот
    // приложения. В блочной обёртке стрелка осталась бы своей высоты, и её
    // нижняя рамка не совпала бы с рамкой основной кнопки. Раскладку
    // happy-dom не считает: высоты проверяются в браузере, тест закрепляет
    // класс.
    it('обёртка стрелки — flex: стрелка растягивается по высоте основной кнопки', () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })

        const classes = [...arrowOf(wrapper).element.parentElement.classList]
        expect(classes).toContain('bb:flex')
        expect(classes).not.toContain('bb:block')
    })
})

describe('DropdownButtonWithAction с привязкой', () => {
    it('принимает входящее значение без ответного события', async () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { modelValue: false, actions },
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
        { label: 'Удалить', color: 'red', onSelect: () => {} },
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
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main, ...twoActions] } })
        await openMenu(wrapper)

        const event = press(key)

        expect(event.defaultPrevented).toBe(true)
        expect(document.activeElement.textContent).toBe(want)
    })

    it('в закрытом меню стрелки прокручивают страницу', () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main, ...twoActions] } })
        arrowOf(wrapper).element.focus()

        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })

    it('после закрытия меню стрелки снова прокручивают страницу', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main, ...twoActions] } })
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
            props: { actions: [main, { label: 'Поменять пароль', href: '#password' }, { label: 'Удалить', color: 'red', onSelect: () => {} }] },
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
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main, { label: 'Удалить', onSelect }] } })
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
            props: { actions: [main, { label: 'Поменять пароль', href: '#password' }] },
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
            props: { actions: [main, { label: 'Поменять пароль', href: '#password' }] },
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
    ])('$name — ничего не рисуется, предупреждений нет', ({ value }) => {
        const warnings = []
        mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: value },
            global: { config: { warnHandler: (message) => warnings.push(message) } },
        })

        expect(document.body.querySelector('a, button')).toBeNull()
        expect(document.body.querySelector('[role="menu"]')).toBeNull()
        expect(warnings).toEqual([])
    })

    it('новый список при открытом меню виден сразу, и стрелки ходят по нему', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main, { label: 'Старый', onSelect: () => {} }] } })
        await openMenu(wrapper)

        await wrapper.setProps({ actions: [main, { label: 'Первый новый', onSelect: () => {} }, { label: 'Второй новый', onSelect: () => {} }] })
        arrowOf(wrapper).element.focus()
        press('ArrowUp')

        expect(itemsOf(wrapper).map((item) => item.text())).toEqual(['Первый новый', 'Второй новый'])
        expect(document.activeElement.textContent).toBe('Второй новый')
    })

    // Браузер, удаляя открытый popover из документа, toggle не присылает:
    // слушатели снимает и о закрытии сообщает сам компонент.
    it('список опустел при открытом меню: стрелки снова прокручивают страницу, родитель узнаёт о закрытии', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })
        await openMenu(wrapper)

        await wrapper.setProps({ actions: [] })
        await settle()

        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })

    // toggle об открытии приходит отложенно, и список может опустеть раньше:
    // меню к этому времени уже нет в DOM, и открытым его считать нельзя.
    it('список опустел до запоздавшего toggle об открытии: родитель не узнаёт об открытии, стрелки прокручивают страницу', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })

        await arrowOf(wrapper).trigger('click')
        await wrapper.setProps({ actions: [] })
        await settle()

        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })

    // Наблюдатель modelValue срабатывает до рендера: если пункты и открытие
    // пришли разом, меню в этот момент ещё нет в DOM.
    it('пункты и открытие пришли одновременно — меню открыто, ответного события нет', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { modelValue: false, actions: [] } })

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
        { name: 'неверный color', item: { label: 'Удалить', color: 'green', onSelect: fn } },
    ])('неверный пункт ($name) — предупреждение Vue', ({ item }) => {
        const { warnings } = mountChecked([{ label: 'Верный', onSelect: fn }, item])

        expect(warnings.some((message) => message.includes(VALIDATOR_WARNING))).toBe(true)
    })

    it.each([
        { name: 'переход', item: { label: 'Открыть', href: '#open' } },
        { name: 'действие', item: { label: 'Удалить', onSelect: fn } },
        { name: 'переход с color: red', item: { label: 'Открыть', href: '#open', color: 'red' } },
        { name: 'действие с color: yellow', item: { label: 'Удалить', color: 'yellow', onSelect: fn } },
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

        expect([mainOf(wrapper).element.tagName, mainOf(wrapper).text()]).toEqual(['BUTTON', 'A'])
        expect(rendered().map((item) => [item.element.tagName, item.text()])).toEqual([['BUTTON', 'B'], ['A', 'C']])

        await mainOf(wrapper).trigger('click')
        for (const index of [0, 1]) {
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
        const { wrapper, errors } = mountChecked([main, { label: 'Удалить', onSelect: () => { throw failure } }])
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
        const { wrapper, errors } = mountChecked([main, { label: 'Удалить', onSelect: async () => { throw failure } }])
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

    const withSlot = { actions: () => h('a', { href: '#', class: 'from-slot' }, 'Из слота') }

    it('переданный слот не рисуется, а в консоль уходит предупреждение', () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots: withSlot, props: { actions } })

        expect(wrapper.find('.from-slot').exists()).toBe(false)
        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn).toHaveBeenCalledWith(MESSAGE)
    })

    it('без слота предупреждения нет', () => {
        mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })

        expect(warn).not.toHaveBeenCalled()
    })

    it('в продакшен-сборке предупреждения нет', () => {
        vi.stubEnv('NODE_ENV', 'production')

        mount(DropdownButtonWithAction, { attachTo: document.body, slots: withSlot, props: { actions } })

        expect(warn).not.toHaveBeenCalled()
    })
})

describe('DropdownButtonWithAction: убранное поле danger', () => {
    const MESSAGE = "[dashboard-ui-components] DropdownButtonWithAction: поле danger убрано, красный пункт — color: 'red'"
    const VALIDATOR_WARNING = 'Invalid prop: custom validator check failed for prop "actions"'
    const withDanger = () => [...actions, { label: 'Опасное', danger: true, onSelect: () => {} }]
    let warn

    beforeEach(() => {
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
        warn.mockRestore()
        vi.unstubAllEnvs()
    })

    // Неверный пункт Vue отмечает своим предупреждением; warnHandler его
    // перехватывает, и вывод тестов остаётся чистым.
    function mountWith(value) {
        const warnings = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: value },
            global: { config: { warnHandler: (message) => warnings.push(message) } },
        })

        return { wrapper, warnings }
    }

    it('пункт с danger рисуется обычным, Vue отмечает его, а в консоль уходит одно предупреждение с заменой', () => {
        const { wrapper, warnings } = mountWith(withDanger())
        const items = menuOf(wrapper).findAll('[role="menuitem"]')

        expect(items[items.length - 1].classes()).toContain('bb:text-gray-700')
        expect(warnings.some((message) => message.includes(VALIDATOR_WARNING))).toBe(true)
        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn).toHaveBeenCalledWith(MESSAGE)
    })

    it('тот же список заново при перерисовке родителя — предупреждение не повторяется', async () => {
        const { wrapper } = mountWith(withDanger())

        await wrapper.setProps({ actions: withDanger() })
        await wrapper.setProps({ actions: withDanger() })

        expect(warn).toHaveBeenCalledTimes(1)
    })

    it('в продакшен-сборке предупреждения нет', () => {
        vi.stubEnv('NODE_ENV', 'production')

        mountWith(withDanger())

        expect(warn).not.toHaveBeenCalled()
    })
})

describe('DropdownButtonWithAction: кнопка из действий', () => {
    const navigation = []
    const inApp = { plugins: [[dashboardUi, { navigate: (href) => navigation.push(href) }]] }

    beforeEach(() => {
        navigation.length = 0
    })

    it('без действий ничего не рисуется', () => {
        mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [] } })

        expect(document.body.querySelector('a, button')).toBeNull()
        expect(document.body.querySelector('[role="menu"]')).toBeNull()
    })

    it('одно действие — одна кнопка без стрелки и меню, скруглённая с обеих сторон', () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main] } })

        expect(arrowOf(wrapper)).toBeUndefined()
        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
        expect(mainOf(wrapper).text()).toBe('Редактировать')
        expect(mainOf(wrapper).classes()).toEqual(expect.arrayContaining(['bb:rounded-md', 'bb:px-4', 'bb:py-2', 'bb:text-sm', 'bb:font-medium']))
        expect(mainOf(wrapper).classes()).not.toContain('bb:rounded-l-md')
    })

    it('несколько действий — первое основная кнопка, остальные в меню по порядку', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [main, { label: 'Поменять пароль', href: '#password' }, { label: 'Удалить', onSelect: () => {} }] },
        })

        expect(mainOf(wrapper).text()).toBe('Редактировать')
        expect(mainOf(wrapper).classes()).toContain('bb:rounded-l-md')
        expect(menuOf(wrapper).findAll('[role="menuitem"]').map((item) => item.text())).toEqual(['Поменять пароль', 'Удалить'])
    })

    it('основная кнопка-переход — ссылка: клик уходит в navigate плагина', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main] }, global: inApp })

        expect(mainOf(wrapper).element.tagName).toBe('A')
        expect(mainOf(wrapper).attributes('href')).toBe('#edit')
        await mainOf(wrapper).trigger('click')

        expect(navigation).toEqual(['#edit'])
    })

    it('основная кнопка-переход: клик с Cmd остаётся браузеру', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main] }, global: inApp })

        await mainOf(wrapper).trigger('click', { metaKey: true })

        expect(navigation).toEqual([])
    })

    it('основная кнопка-переход без navigate — обычная ссылка: клик не перехватывается', () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main] } })
        const event = new MouseEvent('click', { bubbles: true, cancelable: true })

        mainOf(wrapper).element.dispatchEvent(event)

        expect(event.defaultPrevented).toBe(false)
    })

    it('основная кнопка-действие вызывает onSelect один раз без аргументов', async () => {
        const onSelect = vi.fn()
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [{ label: 'Отправить заново', onSelect }] } })

        expect(mainOf(wrapper).element.tagName).toBe('BUTTON')
        expect(mainOf(wrapper).attributes('type')).toBe('button')
        await mainOf(wrapper).trigger('click')

        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(onSelect).toHaveBeenCalledWith()
    })

    it('onSelect основной кнопки, бросивший исключение, отдаёт ошибку Vue', async () => {
        const failure = new Error('сбой обработчика')
        const errors = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [{ label: 'Отправить заново', onSelect: () => { throw failure } }] },
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        await mainOf(wrapper).trigger('click')

        expect(errors).toEqual([failure])
    })

    // Vue передаёт в errorHandler отклонённый Promise, только если обработчик
    // клика его вернул; иначе отказ уходит в unhandledrejection.
    it('асинхронный onSelect основной кнопки с отказом отдаёт ошибку Vue', async () => {
        const failure = new Error('сбой асинхронного обработчика')
        const errors = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [{ label: 'Отправить заново', onSelect: async () => { throw failure } }] },
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        mainOf(wrapper).element.click()
        await flushPromises()

        expect(errors).toEqual([failure])
    })

    it('первое действие без href и onSelect — кнопка, клик по ней ничего не вызывает и не роняет компонент', async () => {
        const warnings = []
        const errors = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [{ label: 'Пустое' }, { label: 'Удалить', onSelect: () => {} }] },
            global: { config: { warnHandler: (message) => warnings.push(message), errorHandler: (error) => errors.push(error) } },
        })

        expect(mainOf(wrapper).element.tagName).toBe('BUTTON')
        await mainOf(wrapper).trigger('click')

        expect(errors).toEqual([])
        expect(warnings.some((message) => message.includes('Invalid prop: custom validator check failed for prop "actions"'))).toBe(true)
    })

    it('первое действие сменилось с перехода на действие — основная кнопка выполняет новое действие', async () => {
        const onSelect = vi.fn()
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main] }, global: inApp })

        await wrapper.setProps({ actions: [{ label: 'Отправить заново', onSelect }] })
        await mainOf(wrapper).trigger('click')

        expect(mainOf(wrapper).element.tagName).toBe('BUTTON')
        expect(mainOf(wrapper).text()).toBe('Отправить заново')
        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(navigation).toEqual([])
    })

    it.each([
        {
            name: 'обычное',
            color: undefined,
            mainClasses: ['bb:bg-white', 'bb:border-gray-300', 'bb:text-gray-700', 'bb:hover:bg-gray-50'],
            arrowClasses: ['bb:bg-white', 'bb:border-gray-300', 'bb:text-gray-500', 'bb:hover:bg-gray-50'],
        },
        {
            name: 'жёлтое',
            color: 'yellow',
            mainClasses: ['bb:bg-yellow-100', 'bb:border-yellow-300', 'bb:text-yellow-800', 'bb:hover:bg-yellow-200'],
            arrowClasses: ['bb:bg-yellow-100', 'bb:border-yellow-300', 'bb:text-yellow-800', 'bb:hover:bg-yellow-200'],
        },
        {
            name: 'красное',
            color: 'red',
            mainClasses: ['bb:bg-red-50', 'bb:border-red-300', 'bb:text-red-700', 'bb:hover:bg-red-100'],
            arrowClasses: ['bb:bg-red-50', 'bb:border-red-300', 'bb:text-red-700', 'bb:hover:bg-red-100'],
        },
    ])('первое действие $name — основная кнопка и стрелка его цвета', ({ color, mainClasses, arrowClasses }) => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [{ ...main, color }, { label: 'Удалить', onSelect: () => {} }] },
        })

        expect(mainOf(wrapper).classes()).toEqual(expect.arrayContaining(mainClasses))
        expect(arrowOf(wrapper).classes()).toEqual(expect.arrayContaining(arrowClasses))
    })

    it('цвет пункта меню основную кнопку и стрелку не красит', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [main, { label: 'Удалить', color: 'red', onSelect: () => {} }] },
        })

        expect(mainOf(wrapper).classes()).toContain('bb:bg-white')
        expect(mainOf(wrapper).classes()).not.toContain('bb:bg-red-50')
        expect(arrowOf(wrapper).classes()).toContain('bb:bg-white')
    })

    // Видно ли кольцо, happy-dom не считает: тест закрепляет классы,
    // нажатия Tab, Enter и пробела проверяются в браузере.
    it('у основной кнопки кольцо фокуса, как у стрелки', () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })
        const ring = ['bb:focus:z-10', 'bb:focus:outline-hidden', 'bb:focus:ring-1', 'bb:focus:ring-indigo-500', 'bb:focus:border-indigo-500']

        expect(mainOf(wrapper).classes()).toEqual(expect.arrayContaining(ring))
        expect(arrowOf(wrapper).classes()).toEqual(expect.arrayContaining(ring))
    })

    it('при открытом меню осталось одно действие: меню пропадает, родитель узнаёт о закрытии', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })
        await arrowOf(wrapper).trigger('click')
        await settle()

        await wrapper.setProps({ actions: [main] })
        await settle()

        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
        expect(mainOf(wrapper).text()).toBe('Редактировать')
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    // Наблюдатель пропажи меню срабатывает после рендера: входящее
    // «закрыто» к этому времени уже принято, и ответное событие не уходит.
    it('действия опустели и закрытие пришло от родителя одновременно — ответного события нет', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions, modelValue: true } })
        await settle()

        await wrapper.setProps({ actions: [], modelValue: false })
        await settle()

        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('при одном действии входящее «открыто» ни на что не влияет, ответного события нет', async () => {
        const errors = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [main], modelValue: true },
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })
        await settle()

        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
        expect(errors).toEqual([])
    })

    it('при одном действии входящее «открыто», затем действий не осталось — события нет: меню не было', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main], modelValue: true } })
        await settle()

        await wrapper.setProps({ actions: [] })
        await settle()

        expect(document.body.querySelector('a, button')).toBeNull()
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
})

describe('DropdownButtonWithAction: убранный слот button', () => {
    const MESSAGE = '[dashboard-ui-components] DropdownButtonWithAction: слот button убран, основная кнопка — первый пункт actions'
    let warn

    beforeEach(() => {
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
        warn.mockRestore()
        vi.unstubAllEnvs()
    })

    const withSlot = { button: () => h('span', { class: 'from-slot' }, 'Из слота') }

    it('переданный слот не рисуется, а в консоль уходит предупреждение', () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots: withSlot, props: { actions } })

        expect(wrapper.find('.from-slot').exists()).toBe(false)
        expect(mainOf(wrapper).text()).toBe('Редактировать')
        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn).toHaveBeenCalledWith(MESSAGE)
    })

    it('без слота предупреждения нет', () => {
        mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })

        expect(warn).not.toHaveBeenCalled()
    })

    it('в продакшен-сборке предупреждения нет', () => {
        vi.stubEnv('NODE_ENV', 'production')

        mount(DropdownButtonWithAction, { attachTo: document.body, slots: withSlot, props: { actions } })

        expect(warn).not.toHaveBeenCalled()
    })
})

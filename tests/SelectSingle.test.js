// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import PopoverPanel from '../src/components/PopoverPanel.vue'
import SelectSingle from '../src/components/SelectSingle.vue'
import SelectSingleFilter from '../src/components/SelectSingleFilter.vue'
import { flushToggles, installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

// Список — popover="auto" Popover API. Его заменяет tests/popoverStub.js:
// без него в happy-dom popovertarget список не откроет.
let uninstallPopover

// Ошибки и предупреждения Vue: тест через vueHandlers требует, чтобы их не было.
let errors
let warnings

beforeEach(() => {
    uninstallPopover = installPopoverStub()
    errors = []
    warnings = []
})

afterEach(() => {
    uninstallPopover()
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
})

const items = [
    { id: 'a', name: 'Первый' },
    { id: 'b', name: 'Второй' },
    { id: 'c', name: 'Третий' },
]

// Утилита отображения на самой панели перебила бы display: none закрытого
// popover, и закрытый список был бы виден.
const DISPLAY = /^bb:(block|inline-block|inline|flex|inline-flex|grid|inline-grid|table|contents|flow-root|hidden)$/

// Настройки Vue для mount: ошибки уходят в errors, предупреждения — в warnings.
function vueHandlers() {
    return { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } }
}

// attachTo нужен фокусу: элементу вне документа его не дать.
function mountSelect(props = {}) {
    return mount(SelectSingleFilter, { props: { header: 'Вендор', items, ...props }, attachTo: document.body, global: vueHandlers() })
}

// Ядро без обёртки: внутренние пропы withClear и withArrow обёртки не передают.
function mountCore(props = {}) {
    return mount(SelectSingle, { props: { items, ...props }, attachTo: document.body, global: vueHandlers() })
}

function triggerOf(wrapper) {
    return wrapper.find('button')
}

function panelOf(wrapper) {
    return wrapper.get('[popover]')
}

function isOpen(wrapper) {
    return panelOf(wrapper).element.matches(':popover-open')
}

function press(key) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    document.activeElement.dispatchEvent(event)
    return event
}

// Сначала — рендер Vue: выбор пункта закрывает список через isOpen,
// и hidePopover зовётся при рендере, а toggle встаёт в очередь после него.
async function settle() {
    await flushPromises()
    await flushToggles()
    await flushPromises()
}

async function open(wrapper) {
    triggerOf(wrapper).element.focus()
    await triggerOf(wrapper).trigger('click')
    await settle()
}

describe('SelectSingle', () => {
    it('не падает, если вместо списка пришёл null', () => {
        const errors = []
        mount(SelectSingleFilter, {
            props: { header: 'Вендор', items: null },
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: () => {} } },
        })

        expect(errors).toEqual([])
    })

    // У строки и объекта с length длина не нулевая: без проверки на массив
    // список счёл бы их пунктами, и find с v-for уронили бы рендер.
    it.each([
        { name: 'объект', value: { a: 1 } },
        { name: 'объект с length', value: { length: 1 } },
        { name: 'строка', value: 'строка' },
        { name: 'число', value: 5 },
    ])('не падает, если вместо списка пришёл не массив: $name', ({ value }) => {
        const errors = []
        const warnings = []
        const wrapper = mount(SelectSingleFilter, {
            props: { header: 'Вендор', items: value },
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } },
        })

        expect(errors).toEqual([])
        expect(wrapper.find('[popovertarget]').exists()).toBe(false)
        // Предупреждают обёртка и ядро: проп items есть у обоих.
        expect(warnings).toHaveLength(2)
        for (const warning of warnings) {
            expect(warning).toContain('Invalid prop: type check failed for prop "items"')
        }
    })

    it('пропускает элементы-необъекты, выбранный пункт остаётся выбранным', async () => {
        const errors = []
        const warnings = []
        const wrapper = mount(SelectSingleFilter, {
            props: { header: 'Вендор', items: items.slice(0, 2), modelValue: 'b' },
            attachTo: document.body,
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } },
        })

        await wrapper.setProps({ items: [null, items[0], undefined, 'мусор', items[1]] })
        await open(wrapper)
        const buttons = panelOf(wrapper).findAll('button')

        expect(buttons.map((button) => button.text())).toEqual(['Первый', 'Второй'])
        expect(buttons.map((button) => button.get('svg').element.style.display)).toEqual(['none', ''])
        expect(wrapper.get('[popovertarget]').text()).toBe('Второй')

        await buttons[0].trigger('click')

        expect(wrapper.emitted('update:modelValue')).toEqual([['a']])
        expect(wrapper.emitted('changed')).toEqual([[]])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('в открытом списке стрелка вниз ведёт на первый пункт и не прокручивает страницу', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        const event = press('ArrowDown')

        expect(event.defaultPrevented).toBe(true)
        expect(document.activeElement.textContent).toBe('Первый')
    })

    it('отсчёт идёт от выбранного пункта', async () => {
        const wrapper = mountSelect({ modelValue: 'b' })
        await open(wrapper)

        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Третий')
    })

    it('в закрытом списке стрелки прокручивают страницу', () => {
        const wrapper = mountSelect()
        triggerOf(wrapper).element.focus()

        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })

    it('после выбора стрелки снова прокручивают страницу, а фокус возвращается на кнопку', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        press('ArrowDown')

        document.activeElement.click()
        await settle()

        expect(wrapper.emitted('update:modelValue')).toEqual([['a']])
        expect(document.activeElement).toBe(triggerOf(wrapper).element)
        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })

    it('после закрытия по Escape фокус возвращается на кнопку', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        press('ArrowDown')

        press('Escape')
        await settle()

        expect(document.activeElement).toBe(triggerOf(wrapper).element)
    })
})

describe('SelectSingle: пункты пропали при открытом списке', () => {
    function press(key) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
        document.activeElement.dispatchEvent(event)
        return event
    }

    it('стрелки снова прокручивают страницу, а вернувшиеся пункты открываются заново и ходят по новому списку', async () => {
        const wrapper = mount(SelectSingleFilter, { props: { header: 'Вендор', items }, attachTo: document.body })
        wrapper.find('button').element.focus()
        await wrapper.find('button').trigger('click')
        await settle()

        await wrapper.setProps({ items: [] })
        await settle()

        const field = document.createElement('textarea')
        document.body.append(field)
        try {
            field.focus()
            expect(press('ArrowDown').defaultPrevented).toBe(false)
        } finally {
            field.remove()
        }

        await wrapper.setProps({ items })
        await settle()
        wrapper.find('button').element.focus()
        await wrapper.find('button').trigger('click')
        await settle()
        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Первый')
    })
})

describe('SelectSingle: список на Popover API', () => {
    it('список — панель popover="auto", кнопка открывает и закрывает её', async () => {
        const wrapper = mountSelect()

        expect(triggerOf(wrapper).attributes('popovertarget')).toBe(panelOf(wrapper).attributes('id'))
        expect(panelOf(wrapper).attributes('popover')).toBe('auto')

        await open(wrapper)
        expect(isOpen(wrapper)).toBe(true)

        await triggerOf(wrapper).trigger('click')
        await settle()
        expect(isOpen(wrapper)).toBe(false)
    })

    it('выбор пункта закрывает список', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        press('ArrowDown')

        document.activeElement.click()
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.findComponent(SelectSingle).vm.isOpen).toBe(false)
    })

    it('клик вне списка закрывает его', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        document.body.click()
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.findComponent(SelectSingle).vm.isOpen).toBe(false)
    })

    it('прокрутка страницы закрывает список, прокрутка внутри списка — нет', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        panelOf(wrapper).element.dispatchEvent(new Event('scroll'))
        await settle()
        expect(isOpen(wrapper)).toBe(true)

        document.dispatchEvent(new Event('scroll'))
        await settle()
        expect(isOpen(wrapper)).toBe(false)
    })

    it('изменение размера окна закрывает список', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        window.dispatchEvent(new Event('resize'))
        await settle()

        expect(isOpen(wrapper)).toBe(false)
    })

    describe('место списка', () => {
        afterEach(() => {
            delete document.documentElement.clientWidth
            delete document.documentElement.clientHeight
        })

        function viewport(width, height) {
            Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: width })
            Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: height })
        }

        it('левым краем по полю, под ним', async () => {
            viewport(1000, 800)
            const wrapper = mountSelect()
            triggerOf(wrapper).element.getBoundingClientRect = () => ({ top: 100, bottom: 140, left: 50, right: 290 })

            await open(wrapper)

            expect(panelOf(wrapper).element.style.left).toBe('50px')
            expect(panelOf(wrapper).element.style.right).toBe('auto')
            expect(panelOf(wrapper).element.style.top).toBe('144px')
        })

        it('у нижнего края окна помещается — вниз', async () => {
            viewport(1000, 800)
            const wrapper = mountSelect()
            triggerOf(wrapper).element.getBoundingClientRect = () => ({ top: 700, bottom: 740, left: 50, right: 290 })

            await open(wrapper)
            await new Promise((resolve) => requestAnimationFrame(resolve))

            expect(panelOf(wrapper).element.style.top).toBe('744px')
            expect(panelOf(wrapper).element.style.bottom).toBe('auto')
        })

        // Поместился ли список, видно только после его появления: размеры
        // задаются явно, у happy-dom они — нули.
        it('у нижнего края окна не помещается — после появления вверх, высота ограничена местом до края', async () => {
            viewport(1000, 800)
            const wrapper = mountSelect()
            triggerOf(wrapper).element.getBoundingClientRect = () => ({ top: 700, bottom: 740, left: 50, right: 290 })
            const panel = panelOf(wrapper).element
            Object.defineProperty(panel, 'clientHeight', { configurable: true, value: 48 })
            Object.defineProperty(panel, 'scrollHeight', { configurable: true, value: 120 })

            await open(wrapper)
            await new Promise((resolve) => requestAnimationFrame(resolve))

            expect(panel.style.top).toBe('auto')
            expect(panel.style.bottom).toBe('104px')
            expect(panel.style.maxHeight).toBe('688px')
        })
    })

    it('открытие второго списка закрывает первый, id у панелей свои', async () => {
        const Page = {
            render: () => h('div', [
                h(SelectSingleFilter, { header: 'Вендор', items }),
                h(SelectSingleFilter, { header: 'Сертификат', items }),
            ]),
        }
        const page = mount(Page, { attachTo: document.body })
        const [first, second] = page.findAllComponents(SelectSingle)

        await first.find('button').trigger('click')
        await settle()
        await second.find('button').trigger('click')
        await settle()

        expect(second.get('[popover]').element.matches(':popover-open')).toBe(true)
        expect(first.get('[popover]').element.matches(':popover-open')).toBe(false)
        expect(first.vm.isOpen).toBe(false)
        expect(first.get('[popover]').attributes('id')).not.toBe(second.get('[popover]').attributes('id'))
    })

    it('у панели нет утилит отображения', () => {
        const wrapper = mountSelect()

        expect(panelOf(wrapper).classes().filter((name) => DISPLAY.test(name))).toEqual([])
    })

    // У [popover] браузер ставит color: CanvasText, а у пунктов списка
    // своего цвета нет: без наследования их текст был бы чёрным, а не цвета
    // страницы. Цвет happy-dom не считает: тест закрепляет класс.
    it('панель берёт цвет текста страницы, а не браузера', () => {
        const wrapper = mountSelect()

        expect(panelOf(wrapper).classes()).toContain('bb:text-inherit')
    })

    // Длинный список прокручен до конца: следующий жест колеса или
    // трекпада ушёл бы на страницу, и её прокрутка закрыла бы список.
    // Прокрутку happy-dom не считает: тест закрепляет класс.
    it('прокрутка в конце длинного списка не уходит на страницу', () => {
        const wrapper = mountSelect()

        expect(panelOf(wrapper).classes()).toContain('bb:overscroll-contain')
    })

    it('у кнопки списка кольцо видимого фокуса', () => {
        const wrapper = mountSelect()

        expect(triggerOf(wrapper).classes()).toEqual(
            expect.arrayContaining(['bb:focus-visible:focus-ring']),
        )
    })

    // Так делает Safari: по клику фокус на кнопку не ставится, и при
    // закрытии popover браузер возвращает его туда, где он был до
    // открытия, — на body, раньше, чем придёт toggle.
    it('после Escape фокус возвращается на кнопку, даже если браузер увёл его на body', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        press('ArrowDown')

        press('Escape')
        document.activeElement.blur()
        await settle()

        expect(document.activeElement).toBe(triggerOf(wrapper).element)
    })

    // Список закрылся прокруткой страницы, и кнопка могла уже уйти из окна.
    // Возврат фокуса не прокручивает страницу к ней: Safari иначе дёрнул бы
    // страницу против прокрутки пользователя.
    it('возврат фокуса на кнопку не прокручивает страницу', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        press('ArrowDown')
        const button = triggerOf(wrapper).element
        const focusOptions = []
        const focus = button.focus
        button.focus = function (options) {
            focusOptions.push(options)
            return focus.call(this, options)
        }

        document.dispatchEvent(new Event('scroll'))
        document.activeElement.blur()
        await settle()

        expect(document.activeElement).toBe(button)
        expect(focusOptions).toEqual([{ preventScroll: true }])
    })

    it('фокус, ушедший при закрытии на другой элемент, остаётся там', async () => {
        const wrapper = mountSelect()
        const field = document.createElement('input')
        document.body.append(field)

        try {
            await open(wrapper)
            press('ArrowDown')

            press('Escape')
            field.focus()
            await settle()

            expect(document.activeElement).toBe(field)
        } finally {
            field.remove()
        }
    })
})

describe('SelectSingle: подсветка пункта', () => {
    it('пункт подсвечивается и наведением, и фокусом', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        const classes = panelOf(wrapper).findAll('button')[0].classes()

        expect(classes).toEqual(expect.arrayContaining(['bb:hover:bg-indigo-100', 'bb:focus:bg-indigo-100']))
    })
})

describe('SelectSingle: Tab внутри списка', () => {
    function pressTab(init = {}) {
        const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true, ...init })
        document.activeElement.dispatchEvent(event)
        return event
    }

    function itemButton(wrapper, name) {
        return panelOf(wrapper).findAll('button').find((button) => button.text() === name)
    }

    it('Tab ходит по пунктам по кругу', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        itemButton(wrapper, 'Первый').element.focus()

        expect(pressTab().defaultPrevented).toBe(true)
        expect(document.activeElement.textContent).toBe('Второй')

        itemButton(wrapper, 'Третий').element.focus()
        pressTab()

        expect(document.activeElement.textContent).toBe('Первый')

        expect(pressTab({ shiftKey: true }).defaultPrevented).toBe(true)
        expect(document.activeElement.textContent).toBe('Третий')
    })

    it('Tab после движения мыши идёт от пункта в фокусе', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        itemButton(wrapper, 'Первый').element.focus()

        await itemButton(wrapper, 'Третий').trigger('mousemove')
        pressTab()

        expect(document.activeElement.textContent).toBe('Второй')
    })

    it('стрелка после движения мыши идёт от пункта в фокусе', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        itemButton(wrapper, 'Первый').element.focus()

        await itemButton(wrapper, 'Третий').trigger('mousemove')
        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Второй')
    })

    it('с кнопки фильтра Tab ведёт на первый пункт, Shift+Tab на последний', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        pressTab()

        expect(document.activeElement.textContent).toBe('Первый')

        triggerOf(wrapper).element.focus()
        pressTab({ shiftKey: true })

        expect(document.activeElement.textContent).toBe('Третий')
    })

    it.each(['ctrlKey', 'altKey', 'metaKey'])('Tab с %s не перехватывается', async (modifier) => {
        const wrapper = mountSelect()
        await open(wrapper)
        itemButton(wrapper, 'Первый').element.focus()

        expect(pressTab({ [modifier]: true }).defaultPrevented).toBe(false)
    })

    it('после закрытия Tab не перехватывается', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        itemButton(wrapper, 'Первый').element.focus()

        press('Escape')
        await settle()
        triggerOf(wrapper).element.focus()

        expect(isOpen(wrapper)).toBe(false)
        expect(pressTab().defaultPrevented).toBe(false)
    })

    it('после пропажи пунктов слушатели keydown снимаются', async () => {
        const added = []
        const removed = []
        const add = vi.spyOn(document, 'addEventListener').mockImplementation(function (type, handler, capture) {
            added.push([type, handler, capture])
            return EventTarget.prototype.addEventListener.call(this, type, handler, capture)
        })
        const remove = vi.spyOn(document, 'removeEventListener').mockImplementation(function (type, handler, capture) {
            removed.push([type, handler, capture])
            return EventTarget.prototype.removeEventListener.call(this, type, handler, capture)
        })
        const wrapper = mountSelect()
        await open(wrapper)
        const keydowns = added.filter(([type, , capture]) => type === 'keydown' && capture === true)

        expect(keydowns).toHaveLength(2)

        await wrapper.setProps({ items: [] })
        await settle()
        add.mockRestore()
        remove.mockRestore()

        for (const handler of keydowns) {
            expect(removed).toContainEqual(handler)
        }
    })
})

describe('SelectSingle: фокус после ластика', () => {
    // Фокус на ластике — как после Tab; в happy-dom :focus-visible равен :focus.
    async function pressEraser(wrapper, { visible = true, moveFocusTo = null } = {}) {
        const eraser = wrapper.findAll('button').find((button) => button.find('path[d="M6 18L18 6M6 6l12 12"]').exists())
        const control = wrapper.get('button[popovertarget]').element
        const focus = vi.spyOn(control, 'focus')
        if (!visible) {
            const matches = eraser.element.matches.bind(eraser.element)
            vi.spyOn(eraser.element, 'matches').mockImplementation((selector) => (selector === ':focus-visible' ? false : matches(selector)))
        }
        eraser.element.focus()

        await eraser.trigger('click')
        moveFocusTo?.focus()
        await Promise.all(eraser.element.getAnimations().map((animation) => animation.finished))
        await flushPromises()

        return focus
    }

    it('с клавиатуры фокус уходит на своё управление, события — по одному', async () => {
        const wrapper = mountSelect({ modelValue: 'a' })

        const focus = await pressEraser(wrapper)

        expect(document.activeElement).toBe(wrapper.get('button[popovertarget]').element)
        expect(focus).toHaveBeenCalledTimes(1)
        expect(focus).toHaveBeenCalledWith({ preventScroll: true })
        expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
        expect(wrapper.emitted('changed')).toHaveLength(1)
    })

    it('без :focus-visible фокус не переводится', async () => {
        const wrapper = mountSelect({ modelValue: 'a' })

        const focus = await pressEraser(wrapper, { visible: false })

        expect(focus).not.toHaveBeenCalled()
        expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
        expect(wrapper.emitted('changed')).toHaveLength(1)
    })

    it('фокус ушёл с ластика до конца анимации: очистка выполнена, фокус на месте', async () => {
        const wrapper = mountSelect({ modelValue: 'a' })
        const outside = document.createElement('button')
        document.body.appendChild(outside)

        const focus = await pressEraser(wrapper, { moveFocusTo: outside })

        expect(focus).not.toHaveBeenCalled()
        expect(document.activeElement).toBe(outside)
        expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
        expect(wrapper.emitted('changed')).toHaveLength(1)
    })
})

describe('SelectSingle: клик после замены items', () => {
    it('пункт выбирается и список закрывается, хотя items заменили до обработчика клика', async () => {
        const errors = []
        const warnings = []
        const Parent = {
            components: { SelectSingleFilter },
            data: () => ({ list: items.map((item) => ({ ...item })) }),
            template: '<SelectSingleFilter header="Вендор" :items="list" @update:modelValue="$emit(\'picked\', $event)" />',
        }
        const wrapper = mount(Parent, {
            attachTo: document.body,
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } },
        })
        await open(wrapper)
        const button = wrapper.findAll('[popover] button').find((candidate) => candidate.text() === 'Второй')

        wrapper.vm.list.splice(0, wrapper.vm.list.length, { id: 'x', name: 'Иной' }, { id: 'y', name: 'Другой' })
        button.element.click()
        await settle()

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(wrapper.emitted('picked')).toEqual([['b']])
        expect(isOpen(wrapper)).toBe(false)
    })
})

const CROSS_PATH = 'path[d="M6 18L18 6M6 6l12 12"]'

// Кнопки пунктов: в панели с поиском есть ещё ластик поля.
function itemButtons(wrapper) {
    return panelOf(wrapper).findAll('button').filter((button) => !button.find(CROSS_PATH).exists())
}

function itemButton(wrapper, name) {
    return itemButtons(wrapper).find((button) => button.text() === name)
}

describe('поиск', () => {
    function fieldOf(wrapper) {
        return panelOf(wrapper).get('input')
    }

    function itemNames(wrapper) {
        return itemButtons(wrapper).map((button) => button.text())
    }

    // Ластик поля — в панели, ластик значения — рядом с кнопкой списка.
    function searchEraserOf(wrapper) {
        return panelOf(wrapper).findAll('button').find((button) => button.find(CROSS_PATH).exists())
    }

    // Остановка стрелок: поле или пункт с этим именем.
    function stopOf(wrapper, name) {
        return name === 'поле' ? fieldOf(wrapper).element : itemButton(wrapper, name).element
    }

    it('без withSearch поля нет, поведение прежнее', async () => {
        const wrapper = mountCore()
        await open(wrapper)

        expect(panelOf(wrapper).find('input').exists()).toBe(false)

        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Первый')
        expect(press('x').defaultPrevented).toBe(false)

        press('Tab')

        expect(document.activeElement.textContent).toBe('Второй')
    })

    it('при открытии фокус в поле, страница не прокручивается', async () => {
        const wrapper = mountCore({ withSearch: true })
        const field = fieldOf(wrapper).element
        const focusOptions = []
        const focus = field.focus
        field.focus = function (options) {
            focusOptions.push(options)
            return focus.call(this, options)
        }

        await open(wrapper)

        expect(document.activeElement).toBe(field)
        expect(focusOptions).toEqual([{ preventScroll: true }])
    })

    it('ввод оставляет совпавшие пункты', async () => {
        const wrapper = mountCore({ withSearch: true, items: items.slice(0, 2) })
        await open(wrapper)

        await fieldOf(wrapper).setValue('вто')

        expect(itemNames(wrapper)).toEqual(['Второй'])
    })

    it('фильтр без учёта регистра и с обрезкой', async () => {
        const wrapper = mountCore({ withSearch: true })
        await open(wrapper)

        await fieldOf(wrapper).setValue('  ВТО ')

        expect(itemNames(wrapper)).toEqual(['Второй'])
    })

    it.each([
        { name: 'по-русски', props: {}, expected: 'Ничего не найдено' },
        { name: 'lang en', props: { lang: 'en' }, expected: 'Nothing found' },
    ])('нет совпадений, стрелки и Tab не падают: $name', async ({ props, expected }) => {
        const wrapper = mountCore({ withSearch: true, ...props })
        await open(wrapper)

        expect(panelOf(wrapper).text()).not.toContain(expected)

        await fieldOf(wrapper).setValue('zzz')

        expect(panelOf(wrapper).text()).toContain(expected)
        expect(itemButtons(wrapper)).toEqual([])

        press('ArrowDown')

        expect(document.activeElement).toBe(fieldOf(wrapper).element)

        press('ArrowUp')

        expect(document.activeElement).toBe(fieldOf(wrapper).element)

        press('Tab')

        expect(document.activeElement).toBe(searchEraserOf(wrapper).element)

        press('Tab')

        expect(document.activeElement).toBe(fieldOf(wrapper).element)
    })

    it('нет совпадений при выбранном пункте: стрелка с кнопки ведёт в поле', async () => {
        const wrapper = mountCore({ withSearch: true, modelValue: 'a' })
        await open(wrapper)
        await fieldOf(wrapper).setValue('zzz')

        triggerOf(wrapper).element.focus()
        press('ArrowDown')

        expect(document.activeElement).toBe(fieldOf(wrapper).element)
    })

    it('выбор отфильтрованного пункта шлёт его id, закрывает список и сбрасывает запрос', async () => {
        const wrapper = mountCore({ withSearch: true })
        await open(wrapper)
        await fieldOf(wrapper).setValue('вто')

        await itemButton(wrapper, 'Второй').trigger('click')
        await settle()

        expect(wrapper.emitted('update:modelValue')).toEqual([['b']])
        expect(wrapper.emitted('changed')).toEqual([[]])
        expect(isOpen(wrapper)).toBe(false)
        expect(fieldOf(wrapper).element.value).toBe('')
    })

    // Индекс пункта считается по видимым пунктам: по всем он указал бы
    // мимо, и в Safari фокус остался бы на body.
    it('в Safari фокус после выбора отфильтрованного пункта — на кнопке', async () => {
        const wrapper = mountCore({ withSearch: true })
        await open(wrapper)
        await fieldOf(wrapper).setValue('вто')
        document.activeElement.blur()

        itemButton(wrapper, 'Второй').element.click()
        await settle()

        expect(document.activeElement).toBe(triggerOf(wrapper).element)
    })

    it('закрытие сбрасывает запрос', async () => {
        const wrapper = mountCore({ withSearch: true })
        await open(wrapper)
        await fieldOf(wrapper).setValue('вто')

        press('Escape')
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(fieldOf(wrapper).element.value).toBe('')
        expect(document.activeElement).toBe(triggerOf(wrapper).element)
    })

    it('галочка выбранного пункта стоит при фильтрации', async () => {
        const wrapper = mountCore({ withSearch: true, modelValue: 'b' })
        await open(wrapper)

        await fieldOf(wrapper).setValue('р')

        expect(itemButtons(wrapper).map((button) => button.get('svg').element.style.display)).toEqual(['none', '', 'none'])

        await fieldOf(wrapper).setValue('вто')

        expect(itemNames(wrapper)).toEqual(['Второй'])
        expect(itemButton(wrapper, 'Второй').get('svg').element.style.display).toBe('')
    })

    it('выбранный пункт, скрытый фильтром, остаётся в надписи', async () => {
        const wrapper = mountCore({ withSearch: true, modelValue: 'a' })
        await open(wrapper)

        await fieldOf(wrapper).setValue('тре')

        expect(itemNames(wrapper)).toEqual(['Третий'])
        expect(triggerOf(wrapper).text()).toBe('Первый')
    })

    it.each([
        { name: 'из поля вниз — первый пункт', from: 'поле', key: 'ArrowDown', to: 'Первый' },
        { name: 'из поля вверх — последний пункт', from: 'поле', key: 'ArrowUp', to: 'Третий' },
        { name: 'с первого пункта вверх — поле', from: 'Первый', key: 'ArrowUp', to: 'поле' },
        { name: 'с последнего пункта вниз — поле', from: 'Третий', key: 'ArrowDown', to: 'поле' },
    ])('круг стрелок через поле: $name', async ({ from, key, to }) => {
        const wrapper = mountCore({ withSearch: true })
        await open(wrapper)
        stopOf(wrapper, from).focus()

        press(key)

        expect(document.activeElement).toBe(stopOf(wrapper, to))
    })

    it('фокус снаружи без выбранного: вниз — первый пункт, вверх — последний', async () => {
        const wrapper = mountCore({ withSearch: true })
        await open(wrapper)

        triggerOf(wrapper).element.focus()
        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Первый')

        triggerOf(wrapper).element.focus()
        press('ArrowUp')

        expect(document.activeElement.textContent).toBe('Третий')
    })

    // Индекс выбранного считается по видимым пунктам: по всем он указал
    // бы мимо, и отсчёт пошёл бы от поля.
    it('фокус снаружи с выбранным при фильтрации: отсчёт от него', async () => {
        const wrapper = mountCore({ withSearch: true, modelValue: 'c' })
        await open(wrapper)
        await fieldOf(wrapper).setValue('т')

        expect(itemNames(wrapper)).toEqual(['Второй', 'Третий'])

        triggerOf(wrapper).element.focus()
        press('ArrowDown')

        expect(document.activeElement).toBe(fieldOf(wrapper).element)
    })

    it('выбранный пункт скрыт фильтром: отсчёт от поля', async () => {
        const wrapper = mountCore({ withSearch: true, modelValue: 'a' })
        await open(wrapper)
        await fieldOf(wrapper).setValue('тре')

        triggerOf(wrapper).element.focus()
        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Третий')
    })

    it('ластик запроса в Tab, но не в стрелках', async () => {
        const wrapper = mountCore({ withSearch: true })
        await open(wrapper)
        await fieldOf(wrapper).setValue('р')
        const field = fieldOf(wrapper).element

        field.focus()
        press('Tab')

        expect(document.activeElement).toBe(searchEraserOf(wrapper).element)

        field.focus()
        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Первый')

        press('ArrowUp')

        expect(document.activeElement).toBe(field)
    })

    it('набор с пункта уходит в поле', async () => {
        const wrapper = mountCore({ withSearch: true })
        await open(wrapper)
        await fieldOf(wrapper).setValue('й')
        press('ArrowDown')

        const event = press('x')

        expect(event.defaultPrevented).toBe(true)

        await nextTick()
        const field = fieldOf(wrapper).element

        expect(document.activeElement).toBe(field)
        expect(field.value).toBe('йx')
        expect(field.selectionStart).toBe(2)
        expect(field.selectionEnd).toBe(2)
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('пропажа пунктов сбрасывает запрос', async () => {
        const wrapper = mountCore({ withSearch: true })
        await open(wrapper)
        await fieldOf(wrapper).setValue('й')

        await wrapper.setProps({ items: [] })
        await settle()

        expect(wrapper.find('[popover]').exists()).toBe(false)
        expect(wrapper.vm.isOpen).toBe(false)

        await wrapper.setProps({ items })
        await settle()

        expect(isOpen(wrapper)).toBe(false)

        await open(wrapper)

        expect(fieldOf(wrapper).element.value).toBe('')
        expect(itemNames(wrapper)).toEqual(['Первый', 'Второй', 'Третий'])
    })

    it.each([
        { name: 'с поиском — держится', props: { withSearch: true }, expected: true },
        { name: 'без поиска — нет', props: {}, expected: false },
    ])('размер панели: $name', ({ props, expected }) => {
        const wrapper = mountCore(props)

        expect(wrapper.findComponent(PopoverPanel).props('keepSize')).toBe(expected)
    })

    it('имя пункта не строка: фильтр и надпись без ошибок и предупреждений', async () => {
        const wrapper = mountCore({
            withSearch: true,
            items: [...items, { id: 'd', name: null }, { id: 'e', name: 5 }],
            'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
        })
        await open(wrapper)

        await fieldOf(wrapper).setValue('5')

        expect(itemNames(wrapper)).toEqual(['5'])

        await itemButtons(wrapper)[0].trigger('click')

        expect(triggerOf(wrapper).text()).toBe('5')
    })
})

describe('withClear = false', () => {
    function eraserOf(wrapper) {
        return wrapper.findAll('button').find((button) => button.find(CROSS_PATH).exists())
    }

    it('ластика нет', () => {
        const wrapper = mountCore({ withClear: false, modelValue: 'a' })

        expect(eraserOf(wrapper)).toBeUndefined()
    })

    it('клик по выбранному закрывает список без событий', async () => {
        const wrapper = mountCore({ withClear: false, modelValue: 'a' })
        await open(wrapper)

        await itemButton(wrapper, 'Первый').trigger('click')
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.vm.isOpen).toBe(false)
        expect(document.activeElement).toBe(triggerOf(wrapper).element)
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
        expect(wrapper.emitted('changed')).toBeUndefined()
    })

    it('клик по другому шлёт update:modelValue и changed', async () => {
        const wrapper = mountCore({ withClear: false, modelValue: 'a' })
        await open(wrapper)

        await itemButton(wrapper, 'Второй').trigger('click')
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toEqual([['b']])
        expect(wrapper.emitted('changed')).toEqual([[]])
    })

    it('по умолчанию ластик есть, клик по выбранному снимает выбор', async () => {
        const wrapper = mountCore({ modelValue: 'a' })

        expect(eraserOf(wrapper).exists()).toBe(true)

        await open(wrapper)
        await itemButton(wrapper, 'Первый').trigger('click')
        await settle()

        expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
        expect(wrapper.emitted('changed')).toEqual([[]])
    })
})

describe('withArrow', () => {
    // Внешний span текста кнопки — первый потомок кнопки.
    function textBoxOf(wrapper) {
        return triggerOf(wrapper).get('span')
    }

    it('без пропа стрелки нет, текст прямо во внешнем span', () => {
        const wrapper = mountCore({ modelValue: 'a' })

        expect(triggerOf(wrapper).find('svg').exists()).toBe(false)
        expect(triggerOf(wrapper).find('.bb\\:truncate').exists()).toBe(false)
        expect(textBoxOf(wrapper).text()).toBe('Первый')
        expect(textBoxOf(wrapper).classes()).toContain('bb:pr-12')
        expect(textBoxOf(wrapper).classes()).not.toContain('bb:pr-7')
        expect(textBoxOf(wrapper).classes()).not.toContain('bb:min-w-0')
    })

    it('с пропом стрелка в кнопке скрыта от чтения и не ловит указатель', () => {
        const wrapper = mountCore({ withArrow: true })
        const arrow = triggerOf(wrapper).get('svg')

        expect(arrow.attributes('aria-hidden')).toBe('true')
        expect(arrow.classes()).toEqual(expect.arrayContaining([
            'bb:absolute', 'bb:right-3', 'bb:top-1/2', 'bb:-translate-y-1/2', 'bb:w-2', 'bb:h-1.5',
            'bb:fill-current', 'bb:text-gray-500', 'bb:pointer-events-none',
        ]))
    })

    it('с пропом текст в .bb\\:truncate, правый отступ bb:pr-7', () => {
        const wrapper = mountCore({ withArrow: true, modelValue: 'a' })

        expect(triggerOf(wrapper).get('.bb\\:truncate').text()).toBe('Первый')
        expect(textBoxOf(wrapper).classes()).toEqual(expect.arrayContaining(['bb:min-w-0', 'bb:pr-7']))
        expect(textBoxOf(wrapper).classes()).not.toContain('bb:pr-12')
    })
})

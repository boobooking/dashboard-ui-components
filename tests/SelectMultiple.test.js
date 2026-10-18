// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import SelectMultiple from '../src/components/SelectMultiple.vue'
import { flushToggles, installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

// Список — popover="auto" Popover API. Его заменяет tests/popoverStub.js:
// без него в happy-dom popovertarget список не откроет.
let uninstallPopover

// Ошибки и предупреждения Vue: каждый тест требует, чтобы их не было.
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

// attachTo нужен фокусу: элементу вне документа его не дать.
function mountSelect(props = {}) {
    return mountWith({ props: { header: 'Вендор', items, ...props } })
}

function mountWith(options) {
    return mount(SelectMultiple, {
        attachTo: document.body,
        ...options,
        global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } },
    })
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

describe('SelectMultiple', () => {
    it('не падает, если вместо списка пришёл null', () => {
        mountWith({ props: { header: 'Вендор', items: null } })

        expect(warnings).toEqual(['Invalid prop: type check failed for prop "items". Expected Array, got Null '])
        warnings = []
    })

    it('в открытом списке стрелка вниз ведёт на первый пункт и не прокручивает страницу', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        const event = press('ArrowDown')

        expect(event.defaultPrevented).toBe(true)
        expect(document.activeElement.textContent).toBe('Первый')
    })

    it('отсчёт идёт от выбранного пункта', async () => {
        const wrapper = mountSelect({ modelValue: ['b'] })
        await open(wrapper)

        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Третий')
    })

    it('в закрытом списке стрелки прокручивают страницу', () => {
        const wrapper = mountSelect()
        triggerOf(wrapper).element.focus()

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

describe('SelectMultiple: пункты пропали при открытом списке', () => {
    function press(key) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
        document.activeElement.dispatchEvent(event)
        return event
    }

    it('стрелки снова прокручивают страницу, а вернувшиеся пункты открываются заново и ходят по новому списку', async () => {
        const wrapper = mountWith({ props: { header: 'Вендор', items } })
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

describe('SelectMultiple: список на Popover API', () => {
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

    it('клик вне списка закрывает его', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        document.body.click()
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.vm.isOpen).toBe(false)
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
                h(SelectMultiple, { header: 'Вендор', items }),
                h(SelectMultiple, { header: 'Сертификат', items }),
            ]),
        }
        const page = mount(Page, { attachTo: document.body, global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } } })
        const [first, second] = page.findAllComponents(SelectMultiple)

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

function labelOf(wrapper) {
    return triggerOf(wrapper).text()
}

function eraserOf(wrapper) {
    return wrapper.findAll('button').find((button) => button.find('path[d="M6 18L18 6M6 6l12 12"]').exists())
}

async function pressFinished(element) {
    await Promise.all(element.getAnimations().map((animation) => animation.finished))
    await flushPromises()
}

function itemButtons(wrapper) {
    return panelOf(wrapper).findAll('button')
}

describe('SelectMultiple: выбор нескольких пунктов', () => {
    it('клик добавляет id в конец', async () => {
        const modelValue = ['c']
        const wrapper = mountSelect({ modelValue })
        await open(wrapper)

        await itemButtons(wrapper)[0].trigger('click')

        expect(wrapper.emitted('update:modelValue')).toEqual([[['c', 'a']]])
        expect(wrapper.emitted('changed')).toEqual([[]])
        expect(modelValue).toEqual(['c'])
    })

    it('повторный клик убирает id', async () => {
        const wrapper = mountSelect({ modelValue: ['a', 'c'] })
        await open(wrapper)

        await itemButtons(wrapper)[0].trigger('click')

        expect(wrapper.emitted('update:modelValue')).toEqual([[['c']]])
        expect(wrapper.emitted('changed')).toHaveLength(1)
    })

    it('id вне пунктов сохраняются', async () => {
        const wrapper = mountSelect({ modelValue: ['x'] })

        expect(labelOf(wrapper)).toBe('')
        expect(eraserOf(wrapper)).toBeUndefined()

        await open(wrapper)
        await itemButtons(wrapper)[0].trigger('click')

        expect(wrapper.emitted('update:modelValue')).toEqual([[['x', 'a']]])
    })

    it.each([
        { name: 'ничего не выбрано', props: { modelValue: [] }, expected: '' },
        { name: 'один пункт', props: { modelValue: ['b'] }, expected: 'Второй' },
        { name: 'несколько пунктов', props: { modelValue: ['a', 'b'] }, expected: 'Выбрано: 2' },
        { name: 'пункт и id вне пунктов', props: { modelValue: ['a', 'x'] }, expected: 'Первый' },
        { name: 'английский язык', props: { modelValue: ['a', 'b'], lang: 'en' }, expected: 'Selected: 2' },
    ])('надпись: $name', ({ props, expected }) => {
        const wrapper = mountSelect(props)

        expect(wrapper.get('[popovertarget]').text()).toBe(expected)
    })

    it('клик по пункту список не закрывает, фокус остаётся на пункте', async () => {
        const wrapper = mountSelect({ modelValue: ['c'] })
        await open(wrapper)
        press('ArrowDown')
        const item = document.activeElement

        item.click()
        await settle()

        expect(isOpen(wrapper)).toBe(true)
        expect(wrapper.vm.isOpen).toBe(true)
        expect(document.activeElement).toBe(item)

        await wrapper.setProps({ modelValue: wrapper.emitted('update:modelValue')[0][0] })
        await settle()

        expect(item.getAttribute('aria-pressed')).toBe('true')
        expect(document.activeElement).toBe(item)
        expect(isOpen(wrapper)).toBe(true)
    })

    it('отсчёт идёт от первого выбранного пункта', async () => {
        const wrapper = mountSelect({ modelValue: ['c', 'a'] })
        await open(wrapper)

        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Второй')
    })

    it('aria-pressed у пунктов показывает выбор', async () => {
        const wrapper = mountSelect({ modelValue: ['b'] })

        expect(itemButtons(wrapper).map((button) => button.attributes('aria-pressed'))).toEqual(['false', 'true', 'false'])
    })

    it('modelValue: null — ничего не выбрано', () => {
        const wrapper = mountSelect({ modelValue: null })

        expect(labelOf(wrapper)).toBe('')
        expect(eraserOf(wrapper)).toBeUndefined()
    })

    it('дубли id снимаются одним кликом', async () => {
        const wrapper = mountSelect({ modelValue: ['a', 'a'] })
        await open(wrapper)

        await itemButtons(wrapper)[0].trigger('click')

        expect(wrapper.emitted('update:modelValue')).toEqual([[[]]])
    })

    it('значение не массив — не падает, Vue предупреждает', () => {
        const wrapper = mountSelect({ modelValue: 'a' })

        expect(labelOf(wrapper)).toBe('')
        expect(warnings).toHaveLength(1)
        expect(warnings[0]).toContain('Invalid prop: type check failed for prop "modelValue"')
        warnings = []
    })

    it('новый массив тех же пунктов при открытом списке не сбрасывает фокус и список', async () => {
        const wrapper = mountSelect({ modelValue: ['b'] })
        await open(wrapper)
        itemButtons(wrapper)[1].element.focus()

        await wrapper.setProps({ items: items.map((item) => ({ ...item })) })
        await settle()

        expect(isOpen(wrapper)).toBe(true)
        expect(document.activeElement.textContent).toBe('Второй')
        expect(itemButtons(wrapper).map((button) => button.attributes('aria-pressed'))).toEqual(['false', 'true', 'false'])
    })

    it('ластик отдаёт [] и changed после нажатия', async () => {
        const wrapper = mountSelect({ modelValue: ['a'] })
        const eraser = eraserOf(wrapper)

        await eraser.trigger('click')
        await pressFinished(eraser.element)

        expect(wrapper.emitted('update:modelValue')).toEqual([[[]]])
        expect(wrapper.emitted('changed')).toEqual([[]])
    })

    it('lang en: подпись ластика — Clear', () => {
        const wrapper = mountSelect({ modelValue: ['a'], lang: 'en' })

        expect(eraserOf(wrapper).text()).toBe('Clear')
    })
})

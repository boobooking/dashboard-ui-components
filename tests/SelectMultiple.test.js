// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import PopoverPanel from '../src/components/PopoverPanel.vue'
import SelectMultiple from '../src/components/SelectMultiple.vue'
import SelectSingle from '../src/components/SelectSingle.vue'
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

// options — другие поля события: модификаторы, isComposing.
function press(key, options = {}) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options })
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

    // У строки есть length: без проверки на массив список счёл бы её пунктами.
    it.each([
        { name: 'объект', value: {} },
        { name: 'строка', value: 'ab' },
    ])('не падает, если вместо списка пришёл не массив: $name', ({ value }) => {
        mountWith({ props: { header: 'Вендор', items: value } })

        expect(errors).toEqual([])
        expect(warnings).toHaveLength(1)
        expect(warnings[0]).toContain('Invalid prop: type check failed for prop "items"')
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

const CROSS_PATH = 'path[d="M6 18L18 6M6 6l12 12"]'

function eraserOf(wrapper) {
    return wrapper.findAll('button').find((button) => button.find(CROSS_PATH).exists())
}

async function pressFinished(element) {
    await Promise.all(element.getAnimations().map((animation) => animation.finished))
    await flushPromises()
}

// Кнопки пунктов: в панели с поиском есть ещё ластик поля.
function itemButtons(wrapper) {
    return panelOf(wrapper).findAll('button').filter((button) => !button.find(CROSS_PATH).exists())
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

describe('SelectMultiple: поиск', () => {
    function fieldOf(wrapper) {
        return panelOf(wrapper).get('input')
    }

    // Ластик поля — в панели, ластик значения — рядом с кнопкой списка.
    function searchEraserOf(wrapper) {
        return panelOf(wrapper).findAll('button').find((button) => button.find(CROSS_PATH).exists())
    }

    function itemNames(wrapper) {
        return itemButtons(wrapper).map((button) => button.text())
    }

    // Остановка стрелок: поле или пункт с этим именем.
    function stopOf(wrapper, name) {
        return name === 'поле'
            ? fieldOf(wrapper).element
            : itemButtons(wrapper).find((button) => button.text() === name).element
    }

    it('без withSearch поля нет', () => {
        const wrapper = mountSelect()

        expect(panelOf(wrapper).find('input').exists()).toBe(false)
    })

    it.each([
        { name: 'по-русски', props: {}, expected: 'Поиск' },
        { name: 'lang en', props: { lang: 'en' }, expected: 'Search' },
    ])('поле: $name', ({ props, expected }) => {
        const field = fieldOf(mountSelect({ withSearch: true, ...props }))

        expect(field.attributes('type')).toBe('text')
        expect(field.attributes('autocomplete')).toBe('off')
        expect(field.attributes('placeholder')).toBe(expected)
        expect(field.attributes('aria-label')).toBe(expected)
    })

    it('фильтр без учёта регистра и с обрезкой', async () => {
        const wrapper = mountSelect({ withSearch: true })
        await open(wrapper)

        await fieldOf(wrapper).setValue('  ВТО ')

        expect(itemNames(wrapper)).toEqual(['Второй'])

        await fieldOf(wrapper).setValue('   ')

        expect(itemNames(wrapper)).toEqual(['Первый', 'Второй', 'Третий'])
    })

    it.each([
        { name: 'по-русски', props: {}, expected: 'Ничего не найдено' },
        { name: 'lang en', props: { lang: 'en' }, expected: 'Nothing found' },
    ])('ничего не найдено: $name', async ({ props, expected }) => {
        const wrapper = mountSelect({ withSearch: true, ...props })
        await open(wrapper)

        expect(panelOf(wrapper).text()).not.toContain(expected)

        await fieldOf(wrapper).setValue('zzz')

        expect(panelOf(wrapper).text()).toContain(expected)
        expect(itemButtons(wrapper)).toEqual([])
    })

    it('ластик поля: виден при непустом запросе, очищает его, фокус остаётся в поле', async () => {
        const wrapper = mountSelect({ withSearch: true })
        await open(wrapper)
        const field = fieldOf(wrapper)
        const eraser = searchEraserOf(wrapper)

        expect(eraser.element.style.display).toBe('none')

        await field.setValue('вто')

        expect(eraser.element.style.display).toBe('')

        eraser.element.focus()
        await eraser.trigger('click')
        await pressFinished(eraser.element)

        expect(field.element.value).toBe('')
        expect(document.activeElement).toBe(field.element)
    })

    it('при открытии фокус в поле, страница не прокручивается', async () => {
        const wrapper = mountSelect({ withSearch: true })
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

    it('при монтировании фокус не в поле', async () => {
        const wrapper = mountSelect({ withSearch: true })
        await settle()

        expect(document.activeElement).not.toBe(fieldOf(wrapper).element)
    })

    it('запрос сбрасывается при закрытии, но не при клике по пункту', async () => {
        const wrapper = mountSelect({ withSearch: true })
        await open(wrapper)
        await fieldOf(wrapper).setValue('й')

        await itemButtons(wrapper)[0].trigger('click')
        await settle()

        expect(fieldOf(wrapper).element.value).toBe('й')

        await triggerOf(wrapper).trigger('click')
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(fieldOf(wrapper).element.value).toBe('')
    })

    it('имя пункта не строка: фильтр и надпись без ошибок и предупреждений', async () => {
        const wrapper = mountSelect({
            withSearch: true,
            items: [...items, { id: 'd', name: null }, { id: 'e', name: 5 }],
            'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
        })
        await open(wrapper)

        await fieldOf(wrapper).setValue('пер')

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(itemNames(wrapper)).toEqual(['Первый'])

        await fieldOf(wrapper).setValue('5')

        expect(itemNames(wrapper)).toEqual(['5'])

        await itemButtons(wrapper)[0].trigger('click')

        expect(labelOf(wrapper)).toBe('5')
        expect(warnings).toEqual([])
    })

    it('выбранные пункты, скрытые фильтром, считаются в надписи', async () => {
        const wrapper = mountSelect({ withSearch: true, modelValue: ['a', 'b'] })
        await open(wrapper)

        await fieldOf(wrapper).setValue('тре')

        expect(itemNames(wrapper)).toEqual(['Третий'])
        expect(labelOf(wrapper)).toBe('Выбрано: 2')
    })

    it('Enter в поле не отправляет форму', async () => {
        const wrapper = mountSelect({ withSearch: true })
        await open(wrapper)
        fieldOf(wrapper).element.focus()

        expect(press('Enter').defaultPrevented).toBe(true)
    })

    it.each([
        { name: 'из поля вниз — первый пункт', from: 'поле', key: 'ArrowDown', to: 'Первый' },
        { name: 'из поля вверх — последний пункт', from: 'поле', key: 'ArrowUp', to: 'Третий' },
        { name: 'с первого пункта вверх — поле', from: 'Первый', key: 'ArrowUp', to: 'поле' },
        { name: 'с последнего пункта вниз — поле', from: 'Третий', key: 'ArrowDown', to: 'поле' },
    ])('круг стрелок через поле: $name', async ({ from, key, to }) => {
        const wrapper = mountSelect({ withSearch: true })
        await open(wrapper)
        stopOf(wrapper, from).focus()

        press(key)

        expect(document.activeElement).toBe(stopOf(wrapper, to))
    })

    it('фокус снаружи без выбранных: вниз — первый пункт, вверх — последний', async () => {
        const wrapper = mountSelect({ withSearch: true })
        await open(wrapper)

        triggerOf(wrapper).element.focus()
        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Первый')

        triggerOf(wrapper).element.focus()
        press('ArrowUp')

        expect(document.activeElement.textContent).toBe('Третий')
    })

    it('фокус снаружи с выбранным: отсчёт от него', async () => {
        const wrapper = mountSelect({ withSearch: true, modelValue: ['b'] })
        await open(wrapper)

        triggerOf(wrapper).element.focus()
        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Третий')
    })

    it('ластик поля вне стрелок и мыши', async () => {
        const wrapper = mountSelect({ withSearch: true })
        await open(wrapper)
        await fieldOf(wrapper).setValue('й')
        fieldOf(wrapper).element.focus()

        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Первый')

        await searchEraserOf(wrapper).trigger('mousemove')

        expect(document.activeElement.textContent).toBe('Первый')
    })

    it('набор символа на пункте уходит в поле', async () => {
        const wrapper = mountSelect({ withSearch: true })
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

    it('Backspace на пункте стирает последний символ запроса в поле', async () => {
        const wrapper = mountSelect({ withSearch: true })
        await open(wrapper)
        await fieldOf(wrapper).setValue('й')
        press('ArrowDown')

        const event = press('Backspace')
        await nextTick()

        expect(event.defaultPrevented).toBe(true)
        expect(fieldOf(wrapper).element.value).toBe('')
        expect(document.activeElement).toBe(fieldOf(wrapper).element)
    })

    it.each([
        { name: 'Ctrl', key: 'a', options: { ctrlKey: true } },
        { name: 'Cmd', key: 'a', options: { metaKey: true } },
        { name: 'Alt', key: 'a', options: { altKey: true } },
        { name: 'пробел', key: ' ', options: {} },
        { name: 'набор методом ввода', key: 'a', options: { isComposing: true } },
    ])('на пункте не уходит в поле: $name', async ({ key, options }) => {
        const wrapper = mountSelect({ withSearch: true })
        await open(wrapper)
        press('ArrowDown')

        const event = press(key, options)
        await nextTick()

        expect(event.defaultPrevented).toBe(false)
        expect(fieldOf(wrapper).element.value).toBe('')
        expect(document.activeElement.textContent).toBe('Первый')
    })

    it('без поиска набор на пункте не перехватывается', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        press('ArrowDown')

        expect(press('x').defaultPrevented).toBe(false)
    })

    it.each([
        { name: 'с поиском — держится', props: { withSearch: true }, expected: true },
        { name: 'без поиска — нет', props: {}, expected: false },
    ])('размер панели: $name', ({ props, expected }) => {
        const wrapper = mountSelect(props)

        expect(wrapper.findComponent(PopoverPanel).props('keepSize')).toBe(expected)
    })

    it('lang en: подпись ластика поля — Clear', () => {
        const wrapper = mountSelect({ withSearch: true, lang: 'en' })

        expect(searchEraserOf(wrapper).text()).toBe('Clear')
    })

    it('пункты пропали при запросе: список закрыт, вернувшиеся открываются с пустым полем', async () => {
        const wrapper = mountSelect({ withSearch: true })
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
    })

    it('две копии: открытие второй закрывает первую и сбрасывает её запрос', async () => {
        const Page = {
            render: () => h('div', [
                h(SelectMultiple, { header: 'Вендор', items, withSearch: true }),
                h(SelectMultiple, { header: 'Сертификат', items, withSearch: true }),
            ]),
        }
        const page = mount(Page, { attachTo: document.body, global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } } })
        const [first, second] = page.findAllComponents(SelectMultiple)
        await first.find('button').trigger('click')
        await settle()
        await first.get('input').setValue('вто')

        await second.find('button').trigger('click')
        await settle()

        expect(first.get('[popover]').element.matches(':popover-open')).toBe(false)
        expect(first.get('input').element.value).toBe('')
        expect(second.get('input').element.value).toBe('')
    })

    it('Escape из поля закрывает список, фокус возвращается на кнопку', async () => {
        const wrapper = mountSelect({ withSearch: true })
        await open(wrapper)
        fieldOf(wrapper).element.focus()

        press('Escape')
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(document.activeElement).toBe(triggerOf(wrapper).element)
    })
})

describe('SelectMultiple: высота кнопки и фокус после клика', () => {
    function itemButton(wrapper, name) {
        return wrapper.findAll('[popover] button').find((button) => button.text() === name)
    }

    it('надпись кнопки держит минимальную высоту, у SelectSingle её нет', () => {
        const multiple = mountSelect()
        const single = mount(SelectSingle, { props: { header: 'Вендор', items } })

        expect(multiple.get('button[popovertarget] span').classes()).toContain('bb:min-h-8')
        expect(single.get('button[popovertarget] span').classes()).not.toContain('bb:min-h-8')
    })

    for (const withSearch of [false, true]) {
        it(`фокус на пункте после клика, как в Safari, withSearch: ${withSearch}`, async () => {
            const wrapper = mountSelect({ withSearch })
            await open(wrapper)
            press('ArrowDown')
            document.activeElement.blur()

            itemButton(wrapper, 'Первый').element.click()

            expect(document.activeElement).toBe(itemButton(wrapper, 'Первый').element)
        })
    }

    it('фокус ставится до событий', async () => {
        const focused = []
        const wrapper = mountSelect({ 'onUpdate:modelValue': () => focused.push(document.activeElement) })
        await open(wrapper)
        document.activeElement.blur()

        itemButton(wrapper, 'Второй').element.click()

        expect(focused).toEqual([itemButton(wrapper, 'Второй').element])
    })

    it('Escape после клика возвращает фокус на кнопку фильтра', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        document.activeElement.blur()
        itemButton(wrapper, 'Первый').element.click()

        press('Escape')
        await settle()

        expect(document.activeElement).toBe(triggerOf(wrapper).element)
    })
})

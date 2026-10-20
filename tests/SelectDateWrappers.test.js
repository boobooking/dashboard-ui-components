// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import Dot from '../src/components/Dot.vue'
import ElementHeader from '../src/components/ElementHeader.vue'
import SelectDate from '../src/components/SelectDate.vue'
import SelectDateFilter from '../src/components/SelectDateFilter.vue'
import SelectDateForm from '../src/components/SelectDateForm.vue'
import { flushToggles, installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)
afterEach(() => {
    document.body.innerHTML = ''
})

// Обёртки ядра SelectDate: вид фильтра и вид поля формы. Календарь
// проверяет SelectDate.test.js; здесь — вид обёрток и то, что значение
// и события проходят сквозь них.
let uninstallPopover

beforeEach(() => {
    uninstallPopover = installPopoverStub()
})

afterEach(() => {
    uninstallPopover()
})

// pikaday загружается в mounted(): дожидаемся загрузки и создания календаря.
async function pikadayLoaded() {
    await vi.dynamicImportSettled()
    await flushPromises()
}

async function settle() {
    await flushToggles()
    await flushPromises()
}

// attachTo нужен календарю: Popover API открывает только панель в документе.
function mountWrapper(component, props, attrs = {}) {
    const errors = []
    const warnings = []
    const wrapper = mount(component, {
        props,
        attrs,
        attachTo: document.body,
        global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } },
    })

    return { wrapper, errors, warnings }
}

function triggerOf(wrapper) {
    return wrapper.get('button[popovertarget]')
}

function inputOf(wrapper) {
    return wrapper.get('input')
}

// Pikaday выбирает дату по mousedown.
async function chooseDay(wrapper, day) {
    await triggerOf(wrapper).trigger('click')
    await settle()
    wrapper.get(`.pika-button[data-pika-day="${day}"]`).element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    await settle()
}

describe('SelectDateFilter', () => {
    const mountFilter = (props = {}, attrs = {}) => mountWrapper(SelectDateFilter, { header: 'Дата', ...props }, attrs)

    it('высота, рамка и ширина по содержимому на корне', () => {
        const { wrapper, errors, warnings } = mountFilter()

        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb-dashboard-ui', 'bb:h-18', 'bb:border', 'bb:border-gray-200', 'bb:w-fit']))
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('столбец шириной 9rem: заголовок и поле даты', () => {
        const { wrapper, errors, warnings } = mountFilter()
        const column = wrapper.getComponent(SelectDate).element.parentElement

        expect([...column.classList]).toContain('bb:w-36')
        expect(column.contains(wrapper.getComponent(ElementHeader).element)).toBe(true)
        expect(wrapper.getComponent(SelectDate).classes()).toContain('bb:flex-1')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('заголовок и точки', async () => {
        const { wrapper, errors, warnings } = mountFilter()
        const dots = () => wrapper.findAllComponents(Dot)
        const loadingDot = () => dots().find((dot) => dot.props('withPulse'))
        const requiredDot = () => dots().find((dot) => !dot.props('withPulse'))

        expect(wrapper.getComponent(ElementHeader).text()).toBe('Дата')
        expect(loadingDot().element.style.display).toBe('none')
        expect(requiredDot().element.style.display).toBe('none')

        await wrapper.setProps({ isRequired: true, isLoading: true })

        expect(requiredDot().element.style.display).toBe('')
        expect(loadingDot().element.style.display).toBe('')
        expect(loadingDot().classes()).toContain('bb:animate-pulse')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('смена даты: update:modelValue и changed насквозь', async () => {
        const { wrapper, errors, warnings } = mountFilter({ modelValue: '15.03.2026' })
        await pikadayLoaded()

        expect(inputOf(wrapper).element.value).toBe('15.03.2026')

        await chooseDay(wrapper, 20)

        expect(wrapper.emitted('update:modelValue')).toEqual([['20.03.2026']])
        expect(wrapper.emitted('changed')).toEqual([[]])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('lang насквозь', async () => {
        const { wrapper, errors, warnings } = mountFilter({ lang: 'en' })
        await pikadayLoaded()

        expect(wrapper.get('.pika-table thead').text()).toContain('Mon')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('класс потребителя', () => {
        const { wrapper, errors, warnings } = mountFilter({}, { class: 'ml-2 h-18 border border-gray-200' })

        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb-dashboard-ui', 'ml-2', 'h-18', 'border', 'border-gray-200']))
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('радиус кнопки и поля берётся из переменной, переменную фильтр не задаёт', () => {
        const { wrapper, errors, warnings } = mountFilter()
        const boxes = [wrapper.element, ...wrapper.element.querySelectorAll('div')]

        expect(triggerOf(wrapper).classes()).toContain('bb:rounded-[var(--bb-field-radius,0)]')
        expect(inputOf(wrapper).classes()).toContain('bb:rounded-[var(--bb-field-radius,0)]')
        expect(boxes.flatMap((box) => [...box.classList]).filter((name) => name.includes('--bb-field-radius'))).toEqual([])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('кнопка и поле без aria-labelledby', () => {
        const { wrapper, errors, warnings } = mountFilter({ modelValue: '15.03.2026' })

        expect(triggerOf(wrapper).attributes('aria-labelledby')).toBeUndefined()
        expect(inputOf(wrapper).attributes('aria-labelledby')).toBeUndefined()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('null в заголовке', () => {
        const errors = []
        const wrapper = mount(SelectDateFilter, {
            props: { header: null },
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: () => {} } },
        })

        expect(errors).toEqual([])
        expect(wrapper.getComponent(ElementHeader).text()).toBe('')
        expect(wrapper.findComponent(SelectDate).exists()).toBe(true)
    })
})

describe('SelectDateForm', () => {
    const mountForm = (props = {}, attrs = {}) => mountWrapper(SelectDateForm, { label: 'Дата', ...props }, attrs)

    // Подпись — первый span обёртки: строка подписи стоит над рамкой.
    function labelOf(wrapper) {
        return wrapper.get('span')
    }

    // Рамка поля — та, в которой стоит ядро.
    function frameOf(wrapper) {
        return wrapper.getComponent(SelectDate).element.parentElement
    }

    it('подпись и точка как у FormInput', async () => {
        const { wrapper, errors, warnings } = mountForm()
        const dot = () => wrapper.findComponent(Dot)

        expect(labelOf(wrapper).text()).toBe('Дата')
        expect(labelOf(wrapper).classes()).toEqual(
            expect.arrayContaining(['bb:block', 'bb:text-sm', 'bb:font-medium', 'bb:leading-5', 'bb:text-gray-700']),
        )
        expect(dot().props('color')).toBe('red')
        expect(dot().classes()).toContain('bb:ml-2')
        expect(dot().element.style.display).toBe('none')

        await wrapper.setProps({ isRequired: true })

        expect(dot().element.style.display).toBe('')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('рамка поля задаёт радиус, кнопка и поле берут его из переменной', () => {
        const { wrapper, errors, warnings } = mountForm()

        expect([...frameOf(wrapper).classList]).toEqual(expect.arrayContaining([
            'bb:mt-1', 'bb:flex', 'bb:h-9.5', 'bb:w-full', 'bb:rounded-md', 'bb:border', 'bb:border-gray-300',
            'bb:bg-white', 'bb:shadow-xs', 'bb:text-sm', 'bb:[--bb-field-radius:0.375rem]',
        ]))
        expect(wrapper.getComponent(SelectDate).classes()).toContain('bb:flex-1')
        expect(triggerOf(wrapper).classes()).toContain('bb:rounded-[var(--bb-field-radius,0)]')
        expect(inputOf(wrapper).classes()).toContain('bb:rounded-[var(--bb-field-radius,0)]')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    // Кнопка называется подписью и своим текстом (подсказка и дата), поле
    // ввода — подписью: дата остаётся его значением. Подсказка пустая.
    it('доступное имя кнопки и поля при пустой и выбранной дате', async () => {
        const { wrapper, errors, warnings } = mountForm()
        await pikadayLoaded()
        const labelId = labelOf(wrapper).attributes('id')

        expect(labelId).toBeTruthy()
        expect(triggerOf(wrapper).attributes('aria-labelledby')).toBe(`${labelId} ${triggerOf(wrapper).attributes('id')}`)
        expect(triggerOf(wrapper).get('.bb\\:sr-only').text()).toBe('')
        expect(inputOf(wrapper).attributes('aria-labelledby')).toBe(labelId)
        expect(inputOf(wrapper).attributes('placeholder') ?? '').toBe('')

        await wrapper.setProps({ modelValue: '15.03.2026' })

        expect(triggerOf(wrapper).attributes('aria-labelledby')).toBe(`${labelId} ${triggerOf(wrapper).attributes('id')}`)
        expect(triggerOf(wrapper).get('.bb\\:sr-only').text()).toBe('15.03.2026')
        expect(inputOf(wrapper).attributes('aria-labelledby')).toBe(labelId)
        expect(inputOf(wrapper).element.value).toBe('15.03.2026')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('две формы на странице', () => {
        const page = mount({
            render: () => h('div', [
                h(SelectDateForm, { label: 'Дата' }),
                h(SelectDateForm, { label: 'Срок' }),
            ]),
        })
        const [first, second] = page.findAllComponents(SelectDateForm)
        const firstLabelId = labelOf(first).attributes('id')
        const secondLabelId = labelOf(second).attributes('id')

        expect(firstLabelId).not.toBe(secondLabelId)
        expect(triggerOf(first).attributes('aria-labelledby')).toBe(`${firstLabelId} ${triggerOf(first).attributes('id')}`)
        expect(triggerOf(second).attributes('aria-labelledby')).toBe(`${secondLabelId} ${triggerOf(second).attributes('id')}`)
        expect(inputOf(first).attributes('aria-labelledby')).toBe(firstLabelId)
        expect(inputOf(second).attributes('aria-labelledby')).toBe(secondLabelId)
    })

    it('смена даты: update:modelValue и changed насквозь', async () => {
        const { wrapper, errors, warnings } = mountForm({ modelValue: '15.03.2026' })
        await pikadayLoaded()

        await chooseDay(wrapper, 20)

        expect(wrapper.emitted('update:modelValue')).toEqual([['20.03.2026']])
        expect(wrapper.emitted('changed')).toEqual([[]])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('lang насквозь', async () => {
        const { wrapper, errors, warnings } = mountForm({ lang: 'en' })
        await pikadayLoaded()

        expect(wrapper.get('.pika-table thead').text()).toContain('Mon')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('класс на корне', () => {
        const { wrapper, errors, warnings } = mountForm({}, { class: 'ml-2' })

        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb-dashboard-ui', 'ml-2']))
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('null в подписи', () => {
        const errors = []
        const wrapper = mount(SelectDateForm, {
            props: { label: null },
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: () => {} } },
        })

        expect(errors).toEqual([])
        expect(labelOf(wrapper).text()).toBe('')
        expect(wrapper.findComponent(SelectDate).exists()).toBe(true)
    })
})

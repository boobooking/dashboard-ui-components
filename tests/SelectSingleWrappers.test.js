// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import Dot from '../src/components/Dot.vue'
import DropdownButton from '../src/components/DropdownButton.vue'
import ElementHeader from '../src/components/ElementHeader.vue'
import SelectSingle from '../src/components/SelectSingle.vue'
import SelectSingleFilter from '../src/components/SelectSingleFilter.vue'
import SelectSingleForm from '../src/components/SelectSingleForm.vue'
import { flushToggles, installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

// Обёртки ядра SelectSingle: вид фильтра и вид поля формы. Поведение
// списка проверяет SelectSingle.test.js; здесь — вид обёрток и то, что
// значение и события проходят сквозь них.
let uninstallPopover

beforeEach(() => {
    uninstallPopover = installPopoverStub()
})

afterEach(() => {
    uninstallPopover()
})

const items = [
    { id: 'a', name: 'Первый' },
    { id: 'b', name: 'Второй' },
]

// attachTo нужен фокусу: элементу вне документа его не дать.
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
    return wrapper.find('button[popovertarget]')
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

async function choose(wrapper, name) {
    await open(wrapper)
    await panelOf(wrapper).findAll('button').find((button) => button.text() === name).trigger('click')
    await settle()
}

describe('SelectSingle: look', () => {
    it.each([['ядра', SelectSingle], ['DropdownButton', DropdownButton]])('валидатор look %s', (name, component) => {
        const { validator } = component.props.look

        expect(validator('x')).toBe(false)
        expect(validator('filter')).toBe(true)
        expect(validator('form')).toBe(true)
    })
})

describe('SelectSingleFilter', () => {
    const mountFilter = (props = {}, attrs = {}) => mountWrapper(SelectSingleFilter, { header: 'Вендор', items, ...props }, attrs)

    it('корень по ширине содержимого', () => {
        const { wrapper, errors, warnings } = mountFilter()

        expect(wrapper.classes()).toContain('bb:w-fit')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('высота и рамка на корне', () => {
        const { wrapper, errors, warnings } = mountFilter()

        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb:h-18', 'bb:border', 'bb:border-gray-200']))
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('заголовок и точки', async () => {
        const { wrapper, errors, warnings } = mountFilter()
        const dots = () => wrapper.findAllComponents(Dot)
        const loadingDot = () => dots().find((dot) => dot.props('withPulse'))
        const requiredDot = () => dots().find((dot) => !dot.props('withPulse'))

        expect(wrapper.getComponent(ElementHeader).text()).toBe('Вендор')
        expect(loadingDot().element.style.display).toBe('none')
        expect(requiredDot().element.style.display).toBe('none')

        await wrapper.setProps({ isRequired: true, isLoading: true })

        expect(requiredDot().element.style.display).toBe('')
        expect(loadingDot().element.style.display).toBe('')
        expect(loadingDot().classes()).toContain('bb:animate-pulse')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('пункты пришли позже', async () => {
        const { wrapper, errors, warnings } = mountFilter({ items: [] })
        const rootClasses = wrapper.classes()

        expect(rootClasses).toContain('bb:h-18')
        expect(wrapper.find('button').exists()).toBe(false)

        await wrapper.setProps({ items })

        expect(wrapper.find('button').exists()).toBe(true)
        expect(wrapper.classes()).toEqual(rootClasses)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('класс потребителя', () => {
        const { wrapper, errors, warnings } = mountFilter({}, { class: 'h-18 border border-gray-200 ml-2' })

        expect(wrapper.classes()).toEqual(expect.arrayContaining(['h-18', 'border', 'border-gray-200', 'ml-2']))
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('v-model насквозь', async () => {
        const { wrapper, errors, warnings } = mountFilter({ modelValue: 'a' })

        expect(triggerOf(wrapper).text()).toBe('Первый')

        await choose(wrapper, 'Второй')

        expect(wrapper.emitted('update:modelValue')).toEqual([['b']])
        expect(wrapper.emitted('changed')).toEqual([[]])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('кольцо фокуса кнопки без скругления', () => {
        const { wrapper, errors, warnings } = mountFilter()

        expect(triggerOf(wrapper).classes()).not.toContain('bb:rounded-md')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('кнопка без aria-labelledby', () => {
        const { wrapper, errors, warnings } = mountFilter({ modelValue: 'a' })

        expect(triggerOf(wrapper).attributes('aria-labelledby')).toBeUndefined()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('null в подписи', () => {
        const errors = []
        const wrapper = mount(SelectSingleFilter, {
            props: { header: null, items },
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: () => {} } },
        })

        expect(errors).toEqual([])
        expect(wrapper.getComponent(ElementHeader).text()).toBe('')
        expect(triggerOf(wrapper).exists()).toBe(true)
    })
})

describe('SelectSingleForm', () => {
    const mountForm = (props = {}, attrs = {}) => mountWrapper(SelectSingleForm, { label: 'Вендор', items, ...props }, attrs)

    // Подпись — первый span обёртки: строка подписи стоит над рамкой.
    function labelOf(wrapper) {
        return wrapper.get('span')
    }

    // Рамка поля — та, в которой стоит ядро.
    function frameOf(wrapper) {
        return wrapper.getComponent(SelectSingle).element.parentElement
    }

    it('подпись и точка как у FormInput', async () => {
        const { wrapper, errors, warnings } = mountForm()
        const dot = () => wrapper.findComponent(Dot)

        expect(labelOf(wrapper).text()).toBe('Вендор')
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

    it('рамка поля', () => {
        const { wrapper, errors, warnings } = mountForm()

        expect([...frameOf(wrapper).classList]).toEqual(expect.arrayContaining(['bb:h-9.5', 'bb:rounded-md', 'bb:border-gray-300']))
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('без пунктов рамка остаётся', () => {
        const { wrapper, errors, warnings } = mountForm({ items: [] })

        expect([...frameOf(wrapper).classList]).toEqual(expect.arrayContaining(['bb:h-9.5', 'bb:rounded-md', 'bb:border-gray-300']))
        expect(wrapper.find('button').exists()).toBe(false)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('кольцо фокуса кнопки скруглено под рамку', () => {
        const { wrapper, errors, warnings } = mountForm()

        expect(triggerOf(wrapper).classes()).toContain('bb:rounded-md')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('доступное имя', async () => {
        const { wrapper, errors, warnings } = mountForm()
        const labelId = labelOf(wrapper).attributes('id')

        expect(labelId).toBeTruthy()
        expect(triggerOf(wrapper).attributes('aria-labelledby')).toBe(`${labelId} ${triggerOf(wrapper).attributes('id')}`)

        await wrapper.setProps({ modelValue: 'a' })

        expect(triggerOf(wrapper).text()).toBe('Первый')
        expect(triggerOf(wrapper).attributes('aria-labelledby')).toBe(`${labelId} ${triggerOf(wrapper).attributes('id')}`)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('две формы на странице', () => {
        const page = mount({
            render: () => h('div', [
                h(SelectSingleForm, { label: 'Вендор', items }),
                h(SelectSingleForm, { label: 'Сертификат', items }),
            ]),
        })
        const [first, second] = page.findAllComponents(SelectSingleForm)
        const firstLabelId = labelOf(first).attributes('id')
        const secondLabelId = labelOf(second).attributes('id')

        expect(firstLabelId).not.toBe(secondLabelId)
        expect(triggerOf(first).attributes('aria-labelledby')).toBe(`${firstLabelId} ${triggerOf(first).attributes('id')}`)
        expect(triggerOf(second).attributes('aria-labelledby')).toBe(`${secondLabelId} ${triggerOf(second).attributes('id')}`)
    })

    // Заглушка Popover открывает панель только по click: открытие Enter
    // и пробелом проверяется в браузере.
    it('клавиатура в поле формы', async () => {
        const { wrapper, errors, warnings } = mountForm()

        await open(wrapper)

        expect(isOpen(wrapper)).toBe(true)

        press('Escape')
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(document.activeElement).toBe(triggerOf(wrapper).element)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('v-model насквозь', async () => {
        const { wrapper, errors, warnings } = mountForm({ modelValue: 'a' })

        expect(triggerOf(wrapper).text()).toBe('Первый')

        await choose(wrapper, 'Второй')

        expect(wrapper.emitted('update:modelValue')).toEqual([['b']])
        expect(wrapper.emitted('changed')).toEqual([[]])
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
        const wrapper = mount(SelectSingleForm, {
            props: { label: null, items },
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: () => {} } },
        })

        expect(errors).toEqual([])
        expect(labelOf(wrapper).text()).toBe('')
        expect(triggerOf(wrapper).exists()).toBe(true)
    })
})

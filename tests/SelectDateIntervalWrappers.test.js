// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import Dot from '../src/components/Dot.vue'
import ElementHeader from '../src/components/ElementHeader.vue'
import PickDay from '../src/components/PickDay.vue'
import SelectDateInterval from '../src/components/SelectDateInterval.vue'
import SelectDateIntervalFilter from '../src/components/SelectDateIntervalFilter.vue'
import SelectDateIntervalForm from '../src/components/SelectDateIntervalForm.vue'

enableAutoUnmount(afterEach)

// Обёртки ядра SelectDateInterval: вид фильтра и вид поля формы. Календари
// проверяют SelectDateInterval.test.js и PickDay.test.js; здесь — вид
// обёрток и то, что значения и события проходят сквозь них.

// pikaday загружается в mounted(): дожидаемся загрузки и создания календаря.
async function pikadayLoaded() {
    await vi.dynamicImportSettled()
    await flushPromises()
}

function mountWrapper(component, props, attrs = {}) {
    const errors = []
    const warnings = []
    const wrapper = mount(component, {
        props,
        attrs,
        global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } },
    })

    return { wrapper, errors, warnings }
}

describe('SelectDateInterval: look ядра', () => {
    it('валидатор look', () => {
        const { validator } = SelectDateInterval.props.look

        expect(validator('x')).toBe(false)
        expect(validator('filter')).toBe(true)
        expect(validator('form')).toBe(true)
    })

    it('без look раскладка filter', () => {
        const wrapper = mount(SelectDateInterval)

        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb:flex', 'bb:divide-x']))
        expect(wrapper.classes()).not.toContain('bb:grid-cols-2')
    })
})

describe('PickDay: look', () => {
    it('валидатор look', () => {
        const { validator } = PickDay.props.look

        expect(validator('x')).toBe(false)
        expect(validator('filter')).toBe(true)
        expect(validator('form')).toBe(true)
    })
})

describe('SelectDateIntervalFilter', () => {
    const mountFilter = (props = {}, attrs = {}) => mountWrapper(SelectDateIntervalFilter, { header: 'Интервал', ...props }, attrs)

    it('корень по ширине содержимого', () => {
        const { wrapper } = mountFilter()

        expect(wrapper.classes()).toContain('bb:w-fit')
    })

    it('поля фильтра без скругления у кнопки и поля', () => {
        const { wrapper } = mountFilter()

        for (const field of wrapper.findAllComponents(PickDay)) {
            expect(field.classes()).toContain('bb:pl-3')
            expect(field.get('button[popovertarget]').classes()).not.toContain('bb:rounded-md')
            expect(field.get('input').classes()).not.toContain('bb:rounded-md')
            expect(field.get('input').classes()).not.toContain('bb:pl-3')
        }
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

        expect(wrapper.getComponent(ElementHeader).text()).toBe('Интервал')
        expect(loadingDot().element.style.display).toBe('none')
        expect(requiredDot().element.style.display).toBe('none')

        await wrapper.setProps({ isRequired: true, isLoading: true })

        expect(requiredDot().element.style.display).toBe('')
        expect(loadingDot().element.style.display).toBe('')
        expect(loadingDot().classes()).toContain('bb:animate-pulse')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('подсказки полей от и до', async () => {
        const { wrapper, errors, warnings } = mountFilter()
        await pikadayLoaded()

        expect(wrapper.findAll('input').map((input) => input.attributes('placeholder'))).toEqual(['от', 'до'])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('даты и события насквозь', async () => {
        const { wrapper, errors, warnings } = mountFilter({ dateFrom: '01.03.2026', dateTo: '15.03.2026' })
        await pikadayLoaded()

        const [from, to] = wrapper.findAllComponents(PickDay)
        expect(from.props('modelValue')).toBe('01.03.2026')
        expect(to.props('modelValue')).toBe('15.03.2026')

        from.vm.$emit('update:modelValue', '02.03.2026')
        await flushPromises()

        expect(wrapper.emitted('update:dateFrom')).toEqual([['02.03.2026']])
        expect(wrapper.emitted('update:dateTo')).toBeUndefined()
        expect(wrapper.emitted('changed')).toEqual([[]])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('lang насквозь', async () => {
        const { wrapper, errors, warnings } = mountFilter({ lang: 'en' })
        await pikadayLoaded()

        expect(wrapper.findAll('input').map((input) => input.attributes('placeholder'))).toEqual(['from', 'to'])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('null в подписи', () => {
        const errors = []
        const wrapper = mount(SelectDateIntervalFilter, {
            props: { header: null },
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: () => {} } },
        })

        expect(errors).toEqual([])
        expect(wrapper.getComponent(ElementHeader).text()).toBe('')
        expect(wrapper.findAllComponents(PickDay)).toHaveLength(2)
    })
})

describe('SelectDateIntervalForm', () => {
    const mountForm = (props = {}, attrs = {}) => mountWrapper(SelectDateIntervalForm, { label: 'Период', ...props }, attrs)

    // Подпись — первый span обёртки: строка подписи стоит над полями.
    function labelOf(wrapper) {
        return wrapper.get('span')
    }

    it('подпись и точка как у FormInput', async () => {
        const { wrapper, errors, warnings } = mountForm()
        const dot = () => wrapper.findComponent(Dot)

        expect(labelOf(wrapper).text()).toBe('Период')
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

    it('кольцо фокуса скруглено под рамку', () => {
        const { wrapper } = mountForm()

        for (const field of wrapper.findAllComponents(PickDay)) {
            expect(field.classes()).not.toContain('bb:pl-3')
            expect(field.get('button[popovertarget]').classes()).toContain('bb:rounded-md')
            expect(field.get('input').classes()).toEqual(expect.arrayContaining(['bb:rounded-md', 'bb:pl-3']))
        }
    })

    it('группа названа подписью', () => {
        const { wrapper } = mountForm()
        const group = wrapper.get('[role="group"]')
        const labelId = labelOf(wrapper).attributes('id')

        expect(labelId).toBeTruthy()
        expect(group.attributes('aria-labelledby')).toBe(labelId)
        expect(group.findAllComponents(PickDay)).toHaveLength(2)
    })

    it('от и до одинаковой ширины', () => {
        const { wrapper } = mountForm()
        const [from, to] = wrapper.findAllComponents(PickDay)
        const fromClasses = [...from.element.classList].sort()
        const toClasses = [...to.element.classList].sort()

        expect(fromClasses).toEqual(toClasses)
        expect(fromClasses).toEqual(expect.arrayContaining(['bb:h-9.5', 'bb:border-gray-300']))
        expect(wrapper.getComponent(SelectDateInterval).classes()).toContain('bb:grid-cols-2')
    })

    it('без значков и новых текстов', async () => {
        const filter = mount(SelectDateIntervalFilter, { props: { header: 'Интервал' } })
        const { wrapper, errors, warnings } = mountForm()
        await pikadayLoaded()

        const [from, to] = wrapper.findAllComponents(PickDay)
        for (const field of [from, to]) {
            expect(field.findAll('input')).toHaveLength(1)
            expect(field.findAll('button[popovertarget]')).toHaveLength(1)
        }
        // Значки заголовка и точки вне полей: сравниваются только ядра.
        expect(wrapper.getComponent(SelectDateInterval).findAll('svg')).toHaveLength(filter.getComponent(SelectDateInterval).findAll('svg').length)
        expect(wrapper.findAll('input').map((input) => input.attributes('placeholder'))).toEqual(['от', 'до'])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('даты и события насквозь', async () => {
        const { wrapper, errors, warnings } = mountForm({ dateFrom: '01.03.2026', dateTo: '15.03.2026' })
        await pikadayLoaded()

        const [, to] = wrapper.findAllComponents(PickDay)
        to.vm.$emit('update:modelValue', '16.03.2026')
        await flushPromises()

        expect(wrapper.emitted('update:dateTo')).toEqual([['16.03.2026']])
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
        const wrapper = mount(SelectDateIntervalForm, {
            props: { label: null },
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: () => {} } },
        })

        expect(errors).toEqual([])
        expect(labelOf(wrapper).text()).toBe('')
        expect(wrapper.findAllComponents(PickDay)).toHaveLength(2)
    })
})

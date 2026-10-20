// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import Dot from '../src/components/Dot.vue'
import ElementHeader from '../src/components/ElementHeader.vue'
import SelectDate from '../src/components/SelectDate.vue'
import SelectDateInterval from '../src/components/SelectDateInterval.vue'
import SelectDateIntervalFilter from '../src/components/SelectDateIntervalFilter.vue'
import SelectDateIntervalForm from '../src/components/SelectDateIntervalForm.vue'

enableAutoUnmount(afterEach)

// Обёртки ядра SelectDateInterval: вид фильтра и вид поля формы. Календари
// проверяют SelectDateInterval.test.js и SelectDate.test.js; здесь — вид
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

describe('SelectDateInterval: ядро без разметки', () => {
    // Слот ядра рисует один узел; поля слота последнего рендера — в fields().
    function mountCore(props = {}, attrs = {}) {
        const errors = []
        const warnings = []
        let fields = null
        const wrapper = mount({
            render: () => h(SelectDateInterval, { ...props, ...attrs }, {
                default: (slotProps) => {
                    fields = slotProps
                    return h('div', { class: 'slot-root' })
                },
            }),
        }, {
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } },
        })

        return { wrapper, core: wrapper.getComponent(SelectDateInterval), fields: () => fields, errors, warnings }
    }

    it('у ядра нет пропа look', () => {
        expect(SelectDateInterval.props.look).toBeUndefined()
    })

    it('передаёт в слот from и to: значение, update и подсказку', () => {
        const { wrapper, fields, errors, warnings } = mountCore({ dateFrom: '01.03.2026', dateTo: '15.03.2026' })
        const { from, to } = fields()

        expect(wrapper.findAll('.slot-root')).toHaveLength(1)
        expect(from.value).toBe('01.03.2026')
        expect(to.value).toBe('15.03.2026')
        expect(from.placeholder).toBe('от')
        expect(to.placeholder).toBe('до')
        expect(typeof from.update).toBe('function')
        expect(typeof to.update).toBe('function')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('подсказки на языке ядра', () => {
        const { fields, errors, warnings } = mountCore({ lang: 'en' })

        expect(fields().from.placeholder).toBe('from')
        expect(fields().to.placeholder).toBe('to')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('update меняет значение и даёт update:date… и changed', async () => {
        const { core, fields, errors, warnings } = mountCore({ dateFrom: '01.03.2026', dateTo: '15.03.2026' })

        fields().from.update('02.03.2026')
        await flushPromises()

        expect(fields().from.value).toBe('02.03.2026')
        expect(core.emitted('update:dateFrom')).toEqual([['02.03.2026']])
        expect(core.emitted('update:dateTo')).toBeUndefined()
        expect(core.emitted('changed')).toEqual([[]])

        fields().to.update('')
        await flushPromises()

        expect(fields().to.value).toBe('')
        expect(core.emitted('update:dateTo')).toEqual([['']])
        expect(core.emitted('changed')).toEqual([[], []])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('эхо родителя и новое значение от родителя не дают changed', async () => {
        const errors = []
        const warnings = []
        let fields = null
        const wrapper = mount({
            data: () => ({ dateFrom: '01.03.2026' }),
            render() {
                return h(SelectDateInterval, {
                    dateFrom: this.dateFrom,
                    'onUpdate:dateFrom': (value) => {
                        this.dateFrom = value
                    },
                }, {
                    default: (slotProps) => {
                        fields = slotProps
                        return h('div')
                    },
                })
            },
        }, {
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } },
        })
        const core = wrapper.getComponent(SelectDateInterval)

        fields.from.update('02.03.2026')
        await flushPromises()

        expect(wrapper.vm.dateFrom).toBe('02.03.2026')
        expect(core.emitted('changed')).toEqual([[]])

        wrapper.vm.dateFrom = '05.03.2026'
        await flushPromises()

        expect(fields.from.value).toBe('05.03.2026')
        expect(core.emitted('changed')).toEqual([[]])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('атрибуты на ядро не переносятся', () => {
        const { wrapper, errors, warnings } = mountCore({}, { class: 'ml-2', 'data-test': 'core' })
        const slotRoot = wrapper.get('.slot-root')

        expect(slotRoot.classes()).toEqual(['slot-root'])
        expect(slotRoot.attributes('data-test')).toBeUndefined()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

describe('SelectDateIntervalFilter', () => {
    const mountFilter = (props = {}, attrs = {}) => mountWrapper(SelectDateIntervalFilter, { header: 'Интервал', ...props }, attrs)

    it('корень по ширине содержимого', () => {
        const { wrapper, errors, warnings } = mountFilter()

        expect(wrapper.classes()).toContain('bb:w-fit')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    // Ядро своей разметки не рисует: строка с линией лежит прямо в столбце
    // обёртки шириной 18rem.
    it('строка с линией — разметка обёртки, от и до по половине', () => {
        const { wrapper, errors, warnings } = mountFilter()
        const [from, to] = wrapper.findAllComponents(SelectDate)
        const row = from.element.parentElement

        expect(to.element.parentElement).toBe(row)
        expect([...row.classList]).toEqual(expect.arrayContaining(['bb:flex', 'bb:h-full', 'bb:divide-x', 'bb:divide-gray-200']))
        expect([...row.parentElement.classList]).toContain('bb:w-72')
        for (const field of [from, to]) {
            expect(field.classes()).toEqual(expect.arrayContaining(['bb:flex-1', 'bb:min-w-36']))
            expect(field.classes()).not.toContain('bb:pl-3')
            expect(field.get('input').classes()).toContain('bb:pl-3')
        }
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('радиус кнопок и полей берётся из переменной, переменную фильтр не задаёт', () => {
        const { wrapper, errors, warnings } = mountFilter()
        const boxes = [wrapper.element, ...wrapper.element.querySelectorAll('div')]

        for (const field of wrapper.findAllComponents(SelectDate)) {
            expect(field.get('button[popovertarget]').classes()).toContain('bb:rounded-[var(--bb-field-radius,0)]')
            expect(field.get('input').classes()).toContain('bb:rounded-[var(--bb-field-radius,0)]')
        }
        expect(boxes.flatMap((box) => [...box.classList]).filter((name) => name.includes('--bb-field-radius'))).toEqual([])
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

        const [from, to] = wrapper.findAllComponents(SelectDate)
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

    it('lang у ядра и у обоих полей', async () => {
        const { wrapper, errors, warnings } = mountFilter({ lang: 'en' })
        await pikadayLoaded()

        expect(wrapper.findAll('input').map((input) => input.attributes('placeholder'))).toEqual(['from', 'to'])
        expect(wrapper.findAllComponents(SelectDate).map((field) => field.props('lang'))).toEqual(['en', 'en'])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('класс потребителя', () => {
        const { wrapper, errors, warnings } = mountFilter({}, { class: 'ml-2 h-18 border border-gray-200' })

        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb-dashboard-ui', 'ml-2', 'h-18', 'border', 'border-gray-200']))
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
        expect(wrapper.findAllComponents(SelectDate)).toHaveLength(2)
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

    // Рамки задают радиус поля: кольцо фокуса кнопки и поля ввода скруглено
    // под рамку.
    it('кольцо фокуса скруглено под рамку', () => {
        const { wrapper, errors, warnings } = mountForm()

        for (const field of wrapper.findAllComponents(SelectDate)) {
            expect([...field.element.parentElement.classList]).toContain('bb:[--bb-field-radius:0.375rem]')
            expect(field.classes()).toContain('bb:flex-1')
            expect(field.classes()).not.toContain('bb:pl-3')
            expect(field.get('button[popovertarget]').classes()).toContain('bb:rounded-[var(--bb-field-radius,0)]')
            expect(field.get('input').classes()).toEqual(expect.arrayContaining(['bb:rounded-[var(--bb-field-radius,0)]', 'bb:pl-3']))
        }
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('группа названа подписью', () => {
        const { wrapper, errors, warnings } = mountForm()
        const group = wrapper.get('[role="group"]')
        const labelId = labelOf(wrapper).attributes('id')

        expect(labelId).toBeTruthy()
        expect(group.attributes('aria-labelledby')).toBe(labelId)
        expect(group.classes()).toEqual(expect.arrayContaining(['bb:mt-1', 'bb:grid', 'bb:grid-cols-2', 'bb:gap-3']))
        expect(group.findAllComponents(SelectDate)).toHaveLength(2)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    // Ядро своей разметки не рисует: обе рамки лежат прямо в сетке группы.
    // Отступ от подписи — у группы, у рамок его нет.
    it('от и до одинаковой ширины: две рамки с одинаковыми классами', () => {
        const { wrapper, errors, warnings } = mountForm()
        const group = wrapper.get('[role="group"]').element
        const frames = wrapper.findAllComponents(SelectDate).map((field) => field.element.parentElement)
        const [fromClasses, toClasses] = frames.map((frame) => [...frame.classList].sort())

        expect(frames.map((frame) => frame.parentElement)).toEqual([group, group])
        expect(frames[0]).not.toBe(frames[1])
        expect(fromClasses).toEqual(toClasses)
        expect(fromClasses).toEqual(expect.arrayContaining([
            'bb:flex', 'bb:h-9.5', 'bb:w-full', 'bb:rounded-md', 'bb:border', 'bb:border-gray-300',
            'bb:bg-white', 'bb:shadow-xs', 'bb:text-sm', 'bb:[--bb-field-radius:0.375rem]',
        ]))
        expect(fromClasses).not.toContain('bb:mt-1')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('без значков и новых текстов', async () => {
        const filter = mount(SelectDateIntervalFilter, { props: { header: 'Интервал' } })
        const { wrapper, errors, warnings } = mountForm()
        await pikadayLoaded()

        const [from, to] = wrapper.findAllComponents(SelectDate)
        for (const field of [from, to]) {
            expect(field.findAll('input')).toHaveLength(1)
            expect(field.findAll('button[popovertarget]')).toHaveLength(1)
        }
        // Значки заголовка и точки вне полей: сравниваются только поля дат.
        const icons = (component) => component.findAllComponents(SelectDate).flatMap((field) => field.findAll('svg'))
        expect(icons(wrapper)).toHaveLength(icons(filter).length)
        expect(wrapper.findAll('input').map((input) => input.attributes('placeholder'))).toEqual(['от', 'до'])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('даты и события насквозь', async () => {
        const { wrapper, errors, warnings } = mountForm({ dateFrom: '01.03.2026', dateTo: '15.03.2026' })
        await pikadayLoaded()

        const [, to] = wrapper.findAllComponents(SelectDate)
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

    it('две формы на странице', () => {
        const page = mount({
            render: () => h('div', [
                h(SelectDateIntervalForm, { label: 'Период' }),
                h(SelectDateIntervalForm, { label: 'Срок' }),
            ]),
        })
        const [first, second] = page.findAllComponents(SelectDateIntervalForm)
        const firstLabelId = labelOf(first).attributes('id')
        const secondLabelId = labelOf(second).attributes('id')

        expect(firstLabelId).not.toBe(secondLabelId)
        expect(first.get('[role="group"]').attributes('aria-labelledby')).toBe(firstLabelId)
        expect(second.get('[role="group"]').attributes('aria-labelledby')).toBe(secondLabelId)
    })

    it('lang у ядра и у обоих полей', async () => {
        const { wrapper, errors, warnings } = mountForm({ lang: 'en' })
        await pikadayLoaded()

        expect(wrapper.findAll('input').map((input) => input.attributes('placeholder'))).toEqual(['from', 'to'])
        expect(wrapper.findAllComponents(SelectDate).map((field) => field.props('lang'))).toEqual(['en', 'en'])
        const headers = wrapper.findAll('.pika-table thead').map((thead) => thead.text())
        expect(headers).toHaveLength(2)
        for (const header of headers) {
            expect(header).toContain('Mon')
        }
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
        expect(wrapper.findAllComponents(SelectDate)).toHaveLength(2)
    })
})

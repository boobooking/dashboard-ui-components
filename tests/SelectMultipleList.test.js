// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import SelectMultipleList from '../src/components/SelectMultipleList.vue'

enableAutoUnmount(afterEach)

const items = [
    { id: 'future_owner', name: 'Будущие владельцы' },
    { id: 'doctor', name: 'Ветеринарные врачи' },
    { id: 'owner', name: 'Владельцы' },
    { id: 'volunteer', name: 'Волонтёры' },
]

// Ошибки и предупреждения Vue всех монтирований теста; после каждого теста они
// должны быть пусты, а тесты, которые их ждут, проверяют и забирают их сами.
const errors = []
const warnings = []

beforeEach(() => {
    errors.length = 0
    warnings.length = 0
})

afterEach(() => {
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
})

function mountList(props, attrs = {}) {
    const wrapper = mount(SelectMultipleList, {
        props: { label: 'Участники', items, ...props },
        attrs,
        attachTo: document.body,
        global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } },
    })

    return { wrapper, errors, warnings }
}

function rows(wrapper) {
    return wrapper.findAll('label')
}

function rowOf(wrapper, name) {
    return rows(wrapper).find((row) => row.text() === name)
}

describe('подпись и точка', () => {
    it('текст подписи', () => {
        const { wrapper } = mountList()

        expect(wrapper.get('span[id]').text()).toBe('Участники')
    })

    it('точка скрыта, пока isRequired не задан, и видна с ним', () => {
        const hidden = mountList()
        const visible = mountList({ isRequired: true })

        expect(hidden.wrapper.getComponent({ name: 'Dot' }).props('color')).toBe('red')
        expect(hidden.wrapper.getComponent({ name: 'Dot' }).element.style.display).toBe('none')
        expect(visible.wrapper.getComponent({ name: 'Dot' }).element.style.display).not.toBe('none')
    })

    it('label null — пустая подпись и одно предупреждение Vue об обязательном пропе', () => {
        const { wrapper } = mountList({ label: null })

        expect(wrapper.get('span[id]').text()).toBe('')
        expect(warnings).toHaveLength(1)
        expect(warnings[0]).toContain('label')
        warnings.length = 0
    })

    it('class и data-атрибуты ложатся на корень', () => {
        const { wrapper } = mountList({}, { class: 'ml-2', 'data-x': '1' })

        expect(wrapper.element.classList.contains('bb-dashboard-ui')).toBe(true)
        expect(wrapper.element.classList.contains('ml-2')).toBe(true)
        expect(wrapper.element.getAttribute('data-x')).toBe('1')
    })
})

describe('группа', () => {
    it('group ссылается на подпись и держит сетку', () => {
        const { wrapper } = mountList()
        const group = wrapper.get('[role="group"]')

        expect(group.attributes('aria-labelledby')).toBe(wrapper.get('span[id]').attributes('id'))
        expect(group.classes()).toEqual(expect.arrayContaining(['bb:mt-1', 'bb:grid', 'bb:gap-x-4', 'bb:gap-y-2']))
    })

    it('у двух компонентов в одном приложении разные id подписей', () => {
        const wrapper = mount(
            { render: () => h('div', [h(SelectMultipleList, { label: 'Первый', items }), h(SelectMultipleList, { label: 'Второй', items })]) },
            { attachTo: document.body }
        )
        const labelIds = wrapper.findAll('span[id]').map((label) => label.attributes('id'))

        expect(new Set(labelIds).size).toBe(2)
    })
})

describe('вид', () => {
    it('отмеченный пункт: индиго и белая галочка рядом', () => {
        const { wrapper } = mountList({ modelValue: ['doctor'] })
        const row = rowOf(wrapper, 'Ветеринарные врачи')
        const input = row.get('input')

        expect(input.classes()).toEqual(expect.arrayContaining(['bb:border-indigo-600', 'bb:bg-indigo-600']))
        expect(input.element.checked).toBe(true)
        expect(row.get('svg').classes()).toContain('bb:fill-white')
    })

    it('неотмеченный пункт: серая рамка, галочки нет', () => {
        const { wrapper } = mountList({ modelValue: ['doctor'] })
        const row = rowOf(wrapper, 'Владельцы')
        const input = row.get('input')

        expect(input.classes()).toEqual(expect.arrayContaining(['bb:border-gray-300', 'bb:bg-white']))
        expect(input.classes()).not.toContain('bb:bg-indigo-600')
        expect(input.element.checked).toBe(false)
        expect(row.find('svg').exists()).toBe(false)
    })

    it('у каждого input общие классы, в том числе кольцо с клавиатуры', () => {
        const { wrapper } = mountList({ modelValue: ['doctor'] })
        const inputs = wrapper.findAll('input')

        expect(inputs).toHaveLength(4)
        for (const input of inputs) {
            expect(input.classes()).toEqual(
                expect.arrayContaining(['bb:size-4', 'bb:rounded', 'bb:border', 'bb:bg-none', 'bb:focus-visible:focus-ring'])
            )
        }
    })

    it('надпись', () => {
        const { wrapper } = mountList()

        expect(rows(wrapper)[0].get(':scope > span:last-child').classes()).toEqual(
            expect.arrayContaining(['bb:ml-3', 'bb:text-sm', 'bb:font-medium', 'bb:text-gray-700'])
        )
    })
})

describe('отметка', () => {
    it('клик по пункту добавляет id, затем changed', async () => {
        const { wrapper } = mountList({ modelValue: ['doctor'] })

        await rowOf(wrapper, 'Владельцы').get('input').trigger('click')

        expect(wrapper.emitted('update:modelValue')).toEqual([[['doctor', 'owner']]])
        expect(wrapper.emitted('changed')).toEqual([[]])
    })

    it('клик по отмеченному снимает id', async () => {
        const { wrapper } = mountList({ modelValue: ['doctor'] })

        await rowOf(wrapper, 'Ветеринарные врачи').get('input').trigger('click')

        expect(wrapper.emitted('update:modelValue')).toEqual([[[]]])
        expect(wrapper.emitted('changed')).toEqual([[]])
    })

    // Клик по надписи внутри label отмечает галочку через активацию label в happy-dom.
    it('клик по надписи отмечает так же', async () => {
        const { wrapper } = mountList({ modelValue: ['doctor'] })

        await rowOf(wrapper, 'Владельцы').get(':scope > span:last-child').trigger('click')

        expect(wrapper.emitted('update:modelValue')).toEqual([[['doctor', 'owner']]])
        expect(wrapper.emitted('changed')).toEqual([[]])
    })

    it('id вне пунктов сохраняются', async () => {
        const { wrapper } = mountList({ modelValue: ['gone', 'doctor'] })

        await rowOf(wrapper, 'Владельцы').get('input').trigger('click')
        await rowOf(wrapper, 'Ветеринарные врачи').get('input').trigger('click')

        expect(wrapper.emitted('update:modelValue')).toEqual([[['gone', 'doctor', 'owner']], [['gone']]])
    })

    it('modelValue null: ничего не отмечено, клик отмечает один пункт', async () => {
        const { wrapper } = mountList({ modelValue: null })

        expect(wrapper.findAll('input').some((input) => input.element.checked)).toBe(false)

        await rowOf(wrapper, 'Будущие владельцы').get('input').trigger('click')

        expect(wrapper.emitted('update:modelValue')).toEqual([[['future_owner']]])
    })

    it('родитель принял значение: пункт отмечен, галочка есть', async () => {
        const { wrapper } = mountList({
            modelValue: [],
            'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
        })

        await rowOf(wrapper, 'Владельцы').get('input').trigger('click')
        await flushPromises()

        expect(rowOf(wrapper, 'Владельцы').get('input').element.checked).toBe(true)
        expect(rowOf(wrapper, 'Владельцы').find('svg').exists()).toBe(true)
    })

    it('родитель не принял значение: пункт не отмечен, галочки нет', async () => {
        const { wrapper } = mountList({ modelValue: [] })

        await rowOf(wrapper, 'Владельцы').get('input').trigger('click')
        await flushPromises()

        expect(rowOf(wrapper, 'Владельцы').get('input').element.checked).toBe(false)
        expect(rowOf(wrapper, 'Владельцы').find('svg').exists()).toBe(false)
    })

    it('родитель не принял снятие: пункт остаётся отмеченным', async () => {
        const { wrapper } = mountList({ modelValue: ['doctor'] })

        await rowOf(wrapper, 'Ветеринарные врачи').get('input').trigger('click')
        await flushPromises()

        expect(rowOf(wrapper, 'Ветеринарные врачи').get('input').element.checked).toBe(true)
        expect(rowOf(wrapper, 'Ветеринарные врачи').find('svg').exists()).toBe(true)
    })
})

describe('раскладка', () => {
    it('сетка в две колонки по умолчанию', () => {
        const { wrapper } = mountList()

        expect(wrapper.get('[role="group"]').element.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
    })

    it('три колонки и четыре пункта: места 1/1, 1/2, 2/1, 3/1', () => {
        const { wrapper } = mountList({ columns: 3 })
        const places = rows(wrapper).map((row) => `${row.element.style.gridColumn}/${row.element.style.gridRow}`)

        expect(wrapper.get('[role="group"]').element.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))')
        expect(places).toEqual(['1/1', '1/2', '2/1', '3/1'])
    })
})

describe('неверное columns', () => {
    it.each([0, -1, 1.5, '3'])('%s — две колонки и одно предупреждение Vue', (columns) => {
        const { wrapper } = mountList({ columns })

        expect(wrapper.get('[role="group"]').element.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
        expect(warnings).toHaveLength(1)
        expect(warnings[0]).toContain('columns')
        warnings.length = 0
    })

    it('null — две колонки без предупреждений', () => {
        const { wrapper } = mountList({ columns: null })

        expect(wrapper.get('[role="group"]').element.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
        expect(warnings).toEqual([])
    })
})

describe('пустые items', () => {
    it.each([[[], 0], [null, 1], ['x', 1]])('%j — только подпись, без сетки, предупреждений Vue: %i', (value, warningCount) => {
        const { wrapper } = mountList({ items: value })

        expect(wrapper.find('[role="group"]').exists()).toBe(false)
        expect(wrapper.get('span[id]').text()).toBe('Участники')
        expect(warnings).toHaveLength(warningCount)
        for (const warning of warnings) expect(warning).toContain('items')
        warnings.length = 0
    })

    it('необъекты пропускаются', () => {
        const { wrapper } = mountList({ items: [null, 5, { id: 'owner', name: 'Владельцы' }] })

        expect(rows(wrapper)).toHaveLength(1)
    })
})

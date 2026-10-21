// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import SelectSingleCards from '../src/components/SelectSingleCards.vue'

enableAutoUnmount(afterEach)

const items = [
    { id: 'rc', name: 'Royal Canin' },
    { id: 'eukanuba', name: 'Eukanuba' },
]

const fourItems = [
    { id: 'a', name: 'Первый' },
    { id: 'b', name: 'Второй' },
    { id: 'c', name: 'Третий' },
    { id: 'd', name: 'Четвёртый' },
]

// Компонент монтируется в документ, как в приложении: так работает группа переключателей.
function mountCards(props, attrs = {}) {
    const errors = []
    const warnings = []
    const wrapper = mount(SelectSingleCards, {
        props: { label: 'Бренд', items, ...props },
        attrs,
        attachTo: document.body,
        global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } },
    })

    return { wrapper, errors, warnings }
}

function cards(wrapper) {
    return wrapper.findAll('label')
}

function cardOf(wrapper, name) {
    return cards(wrapper).find((card) => card.text() === name)
}

function isSelectedCard(card) {
    return card.classes().includes('bb:border-indigo-500') && card.classes().includes('bb:bg-indigo-50')
}

describe('подпись и точка', () => {
    it('текст подписи', () => {
        const { wrapper } = mountCards()

        expect(wrapper.get('span[id]').text()).toBe('Бренд')
    })

    it('точка скрыта, пока isRequired не задан, и видна с ним', () => {
        const hidden = mountCards()
        const visible = mountCards({ isRequired: true })

        expect(hidden.wrapper.getComponent({ name: 'Dot' }).props('color')).toBe('red')
        expect(hidden.wrapper.getComponent({ name: 'Dot' }).element.style.display).toBe('none')
        expect(visible.wrapper.getComponent({ name: 'Dot' }).element.style.display).not.toBe('none')
    })

    it('label null — пустая подпись без ошибок', () => {
        const { wrapper, errors } = mountCards({ label: null })

        expect(wrapper.get('span[id]').text()).toBe('')
        expect(errors).toEqual([])
    })
})

describe('группа', () => {
    it('radiogroup ссылается на подпись и держит сетку', () => {
        const { wrapper } = mountCards()
        const group = wrapper.get('[role="radiogroup"]')

        expect(group.attributes('aria-labelledby')).toBe(wrapper.get('span[id]').attributes('id'))
        expect(group.classes()).toEqual(expect.arrayContaining(['bb:mt-2', 'bb:grid', 'bb:gap-3']))
    })

    it('у двух компонентов в одном приложении разные id подписей и name переключателей', () => {
        const errors = []
        const warnings = []
        const wrapper = mount(
            { render: () => h('div', [h(SelectSingleCards, { label: 'Первый', items }), h(SelectSingleCards, { label: 'Второй', items })]) },
            { attachTo: document.body, global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } } }
        )
        const labelIds = wrapper.findAll('span[id]').map((label) => label.attributes('id'))
        const groupNames = wrapper.findAll('input').map((input) => input.attributes('name'))

        expect(new Set(labelIds).size).toBe(2)
        expect(new Set(groupNames).size).toBe(2)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('внутри компонента name у всех переключателей один', () => {
        const { wrapper } = mountCards()
        const names = wrapper.findAll('input').map((input) => input.attributes('name'))

        expect(new Set(names).size).toBe(1)
    })
})

describe('вид', () => {
    it('выбранная карточка', () => {
        const { wrapper } = mountCards({ modelValue: 'eukanuba' })
        const card = cardOf(wrapper, 'Eukanuba')
        const circle = card.get('span')

        expect(isSelectedCard(card)).toBe(true)
        expect(circle.classes()).toContain('bb:border-indigo-600')
        expect(circle.find('span').classes()).toContain('bb:bg-indigo-600')
        expect(card.get('input').element.checked).toBe(true)
    })

    it('невыбранная карточка', () => {
        const { wrapper } = mountCards({ modelValue: 'eukanuba' })
        const card = cardOf(wrapper, 'Royal Canin')
        const circle = card.get('span')

        expect(card.classes()).toEqual(expect.arrayContaining(['bb:border-gray-300', 'bb:bg-white', 'bb:hover:bg-gray-50']))
        expect(isSelectedCard(card)).toBe(false)
        expect(circle.classes()).toContain('bb:border-gray-400')
        expect(circle.find('span').exists()).toBe(false)
    })

    it('кружок и надпись не принимают курсор и клик', () => {
        const { wrapper } = mountCards()
        const spans = cards(wrapper)[0].findAll(':scope > span')

        expect(spans).toHaveLength(2)
        for (const span of spans) {
            expect(span.classes()).toEqual(expect.arrayContaining(['bb:pointer-events-none', 'bb:cursor-default']))
        }
    })

    it('переключатель прозрачный и лежит на всей карточке', () => {
        const { wrapper } = mountCards()

        expect(wrapper.get('input').classes()).toEqual(
            expect.arrayContaining(['bb:absolute', 'bb:inset-0', 'bb:size-full', 'bb:cursor-pointer', 'bb:opacity-0'])
        )
    })

    it('переключатель снимает картинку @tailwindcss/forms приложения', () => {
        const { wrapper } = mountCards()

        expect(wrapper.get('input').classes()).toContain('bb:bg-none')
    })

    it('без значения ни одна карточка не выбрана', () => {
        const { wrapper } = mountCards()

        expect(cards(wrapper).some(isSelectedCard)).toBe(false)
        expect(wrapper.findAll('input').some((input) => input.element.checked)).toBe(false)
    })
})

describe('выбор', () => {
    it('клик по переключателю эмитит id, затем changed', async () => {
        const { wrapper } = mountCards()

        await cardOf(wrapper, 'Eukanuba').get('input').trigger('click')

        expect(wrapper.emitted('update:modelValue')).toEqual([['eukanuba']])
        expect(wrapper.emitted('changed')).toEqual([[]])
    })

    it('клик по надписи карточки выбирает так же', async () => {
        const { wrapper } = mountCards()

        await cardOf(wrapper, 'Eukanuba').findAll(':scope > span')[1].trigger('click')

        expect(wrapper.emitted('update:modelValue')).toEqual([['eukanuba']])
        expect(wrapper.emitted('changed')).toEqual([[]])
    })

    it('клик по выбранной ничего не эмитит', async () => {
        const { wrapper } = mountCards({ modelValue: 'eukanuba' })

        await cardOf(wrapper, 'Eukanuba').get('input').trigger('click')

        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
        expect(wrapper.emitted('changed')).toBeUndefined()
    })

    it('родитель принял значение: выбрана новая карточка', async () => {
        const { wrapper } = mountCards({
            modelValue: 'rc',
            'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
        })

        await cardOf(wrapper, 'Eukanuba').get('input').trigger('click')
        await flushPromises()

        expect(isSelectedCard(cardOf(wrapper, 'Eukanuba'))).toBe(true)
        expect(cardOf(wrapper, 'Eukanuba').get('input').element.checked).toBe(true)
        expect(isSelectedCard(cardOf(wrapper, 'Royal Canin'))).toBe(false)
        expect(cardOf(wrapper, 'Royal Canin').get('input').element.checked).toBe(false)
    })

    it('родитель не принял значение: выбрана прежняя карточка', async () => {
        const { wrapper } = mountCards({ modelValue: 'rc' })

        await cardOf(wrapper, 'Eukanuba').get('input').trigger('click')
        await flushPromises()

        expect(cardOf(wrapper, 'Royal Canin').get('input').element.checked).toBe(true)
        expect(cardOf(wrapper, 'Eukanuba').get('input').element.checked).toBe(false)
        expect(isSelectedCard(cardOf(wrapper, 'Royal Canin'))).toBe(true)
        expect(isSelectedCard(cardOf(wrapper, 'Eukanuba'))).toBe(false)
    })
})

describe('булевы и нулевые id', () => {
    const booleanItems = [
        { id: true, name: 'СМС' },
        { id: false, name: 'Промо' },
    ]

    it('true выбирает первую, клик по второй эмитит строго false', async () => {
        const { wrapper } = mountCards({ items: booleanItems, modelValue: true })

        expect(isSelectedCard(cardOf(wrapper, 'СМС'))).toBe(true)
        expect(isSelectedCard(cardOf(wrapper, 'Промо'))).toBe(false)

        await cardOf(wrapper, 'Промо').get('input').trigger('click')

        expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    })

    it('0 выбирает пункт с id 0', () => {
        const { wrapper } = mountCards({
            items: [
                { id: 0, name: 'Ноль' },
                { id: 1, name: 'Один' },
            ],
            modelValue: 0,
        })

        expect(isSelectedCard(cardOf(wrapper, 'Ноль'))).toBe(true)
        expect(isSelectedCard(cardOf(wrapper, 'Один'))).toBe(false)
    })

    it('пустая строка остаётся строкой и ничего не выбирает', () => {
        const { wrapper, warnings } = mountCards({ modelValue: '' })

        expect(wrapper.props('modelValue')).toBe('')
        expect(cards(wrapper).some(isSelectedCard)).toBe(false)
        expect(warnings).toEqual([])
    })

    it('значение вне пунктов ничего не выбирает, ошибок нет', () => {
        const { wrapper, errors, warnings } = mountCards({ modelValue: 'other' })

        expect(cards(wrapper).some(isSelectedCard)).toBe(false)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

describe('раскладка', () => {
    it('сетка в две колонки по умолчанию', () => {
        const { wrapper } = mountCards()

        expect(wrapper.get('[role="radiogroup"]').element.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
    })

    it('три колонки и четыре пункта: места 1/1, 1/2, 2/1, 3/1', () => {
        const { wrapper } = mountCards({ items: fourItems, columns: 3 })
        const places = cards(wrapper).map((card) => `${card.element.style.gridColumn}/${card.element.style.gridRow}`)

        expect(wrapper.get('[role="radiogroup"]').element.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))')
        expect(places).toEqual(['1/1', '1/2', '2/1', '3/1'])
    })

    it('порядок карточек в DOM — порядок массива', () => {
        const { wrapper } = mountCards({ items: fourItems, columns: 3 })

        expect(cards(wrapper).map((card) => card.text())).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый'])
    })

    it('смена пунктов при выбранном значении пересчитывает места без ошибок', async () => {
        const { wrapper, errors, warnings } = mountCards({ modelValue: 'eukanuba', columns: 3 })

        await wrapper.setProps({ items: fourItems })

        expect(cards(wrapper).map((card) => `${card.element.style.gridColumn}/${card.element.style.gridRow}`)).toEqual(['1/1', '1/2', '2/1', '3/1'])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

describe('неверное columns', () => {
    it.each([0, -1, 1.5, '3'])('%s — две колонки и одно предупреждение Vue', (columns) => {
        const { wrapper, warnings } = mountCards({ columns })

        expect(wrapper.get('[role="radiogroup"]').element.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
        expect(warnings).toHaveLength(1)
    })

    it('null — две колонки без предупреждений', () => {
        const { wrapper, warnings } = mountCards({ columns: null })

        expect(wrapper.get('[role="radiogroup"]').element.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
        expect(warnings).toEqual([])
    })
})

describe('пустые items', () => {
    it.each([[[]], [null], ['x']])('%j — только подпись, без сетки', (value) => {
        const { wrapper } = mountCards({ items: value })

        expect(wrapper.find('[role="radiogroup"]').exists()).toBe(false)
        expect(wrapper.get('span[id]').text()).toBe('Бренд')
    })

    it('необъекты пропускаются', () => {
        const { wrapper, errors } = mountCards({ items: [null, 5, { id: 'rc', name: 'Royal Canin' }] })

        expect(cards(wrapper)).toHaveLength(1)
        expect(errors).toEqual([])
    })
})

describe('атрибуты', () => {
    it('class и data-атрибуты ложатся на корень', () => {
        const { wrapper } = mountCards({}, { class: 'ml-2', 'data-x': '1' })

        expect(wrapper.element.classList.contains('bb-dashboard-ui')).toBe(true)
        expect(wrapper.element.classList.contains('ml-2')).toBe(true)
        expect(wrapper.element.getAttribute('data-x')).toBe('1')
    })
})

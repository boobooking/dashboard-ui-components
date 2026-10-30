// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h, ref } from 'vue'
import AmountCurrency from '../src/components/AmountCurrency.vue'
import AmountInput from '../src/components/AmountInput.vue'
import AmountIntervalFilter from '../src/components/AmountIntervalFilter.vue'
import AmountIntervalForm from '../src/components/AmountIntervalForm.vue'
import CrossButton from '../src/components/CrossButton.vue'
import Dot from '../src/components/Dot.vue'
import ElementHeader from '../src/components/ElementHeader.vue'
import { flushToggles, installPopoverStub } from './popoverStub.js'

let errors
let warnings
let uninstallPopover

beforeEach(() => {
    errors = []
    warnings = []
    uninstallPopover = installPopoverStub()
})

afterEach(() => {
    uninstallPopover()
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
})

// Хуки afterEach идут в обратном порядке: размонтирование — до проверки выше.
enableAutoUnmount(afterEach)

const CROSS_PATH = 'path[d="M6 18L18 6M6 6l12 12"]'
const FRAME_CLASSES = [
    'bb:h-9.5',
    'bb:rounded-md',
    'bb:border',
    'bb:border-gray-300',
    'bb:bg-white',
    'bb:shadow-xs',
    'bb:text-sm',
    'bb:[--bb-field-radius:0.375rem]',
]

const COMPONENTS = [
    ['AmountIntervalFilter', AmountIntervalFilter, { header: 'Сумма' }],
    ['AmountIntervalForm', AmountIntervalForm, { label: 'Сумма' }],
]

// attachTo нужен фокусу: элементу вне документа его не дать.
function mountOptions() {
    return {
        attachTo: document.body,
        global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } },
    }
}

function mountInterval(component, base, props = {}, attrs = {}) {
    return mount(component, { props: { ...base, ...props }, attrs, ...mountOptions() })
}

// Настоящая связка v-model: родитель сразу отвечает на update:*.
function mountBound(component, base, props = {}, initial = {}) {
    const state = ref({ amountFrom: null, amountTo: null, currency: null, ...initial })
    const log = { from: [], to: [], currency: [], changes: [] }
    const wrapper = mount({
        render: () => h(component, {
            ...base,
            ...props,
            amountFrom: state.value.amountFrom,
            amountTo: state.value.amountTo,
            currency: state.value.currency,
            'onUpdate:amountFrom': (next) => {
                log.from.push(next)
                state.value.amountFrom = next
            },
            'onUpdate:amountTo': (next) => {
                log.to.push(next)
                state.value.amountTo = next
            },
            'onUpdate:currency': (next) => {
                log.currency.push(next)
                state.value.currency = next
            },
            onChanged: () => log.changes.push({ ...state.value }),
        }),
    }, mountOptions())

    return { wrapper, state, ...log }
}

const fieldsOf = (wrapper) => wrapper.findAllComponents(AmountInput)
const blockOf = (wrapper) => wrapper.findComponent(AmountCurrency)
const inputsOf = (field) => field.findAll('input')
const wholeOf = (wrapper, index) => inputsOf(fieldsOf(wrapper)[index])[0]
const triggerOf = (wrapper) => wrapper.find('button[popovertarget]')
const panelOf = (wrapper) => wrapper.get('[popover]')
const itemsOf = (wrapper) => panelOf(wrapper).findAll('button').filter((button) => !button.find(CROSS_PATH).exists())
const isOutsidePanel = (element) => element.closest('[popover]') === null

function parts(wrapper) {
    return fieldsOf(wrapper).map((field) => inputsOf(field).map((input) => input.element.value))
}

function emittedOf(wrapper, name) {
    return (wrapper.emitted(name) ?? []).map(([value]) => value)
}

function expectNoEvents(wrapper) {
    for (const name of ['update:amountFrom', 'update:amountTo', 'update:currency', 'changed']) {
        expect(wrapper.emitted(name)).toBeUndefined()
    }
}

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

async function choose(wrapper, label) {
    await open(wrapper)
    await itemsOf(wrapper).find((item) => item.text() === label).trigger('click')
    await settle()
}

describe.each(COMPONENTS)('%s', (name, component, base) => {
    describe('активная валюта', () => {
        it('на mounted — одно событие с первой валютой, changed нет', () => {
            const wrapper = mountInterval(component, base, { currencies: ['RUB', 'USD'] })

            expect(emittedOf(wrapper, 'update:currency')).toEqual(['RUB'])
            expect(wrapper.emitted('update:amountFrom')).toBeUndefined()
            expect(wrapper.emitted('update:amountTo')).toBeUndefined()
            expect(wrapper.emitted('changed')).toBeUndefined()
        })

        it('связка v-model: подстановка одна, родитель принял — повторного нет', async () => {
            const { currency, changes } = mountBound(component, base, { currencies: ['RUB', 'USD'] })

            await flushPromises()

            expect(currency).toEqual(['RUB'])
            expect(changes).toEqual([])
        })

        it('валюта в списке — событий нет', () => {
            const wrapper = mountInterval(component, base, { currency: 'USD', currencies: ['RUB', 'USD'] })

            expectNoEvents(wrapper)
        })

        it('код сменился при той же активной валюте — одно событие, повторного нет', async () => {
            const wrapper = mountInterval(component, base, { currency: 'USD', currencies: ['USD'] })

            await wrapper.setProps({ currency: 'EUR' })

            expect(emittedOf(wrapper, 'update:currency')).toEqual(['USD'])

            await wrapper.setProps({ currency: 'USD' })

            expect(emittedOf(wrapper, 'update:currency')).toEqual(['USD'])
            expect(wrapper.emitted('changed')).toBeUndefined()
        })

        it('новый равный массив — событий нет', async () => {
            const wrapper = mountInterval(component, base, { currency: 'USD', currencies: ['USD', 'EUR'] })

            await wrapper.setProps({ currencies: ['USD', 'EUR'] })

            expectNoEvents(wrapper)
        })
    })

    describe('поля и события', () => {
        it('ввод в «от» шлёт update:amountFrom, в «до» — update:amountTo', async () => {
            const wrapper = mountInterval(component, base, { currency: 'USD', currencies: ['USD'] })

            await wholeOf(wrapper, 0).setValue('12')
            await wholeOf(wrapper, 1).setValue('34')

            expect(emittedOf(wrapper, 'update:amountFrom')).toEqual([1200])
            expect(emittedOf(wrapper, 'update:amountTo')).toEqual([3400])
            expect(wrapper.emitted('changed')).toBeUndefined()
        })

        it('подсказки полей — «от» и «до», по языку', () => {
            const ru = mountInterval(component, base, { currency: 'USD', currencies: ['USD'] })
            const en = mountInterval(component, base, { currency: 'USD', currencies: ['USD'], lang: 'en' })

            expect(wholeOf(ru, 0).attributes('aria-label')).toBe('от')
            expect(wholeOf(ru, 1).attributes('aria-label')).toBe('до')
            expect(wholeOf(en, 0).attributes('aria-label')).toBe('from')
            expect(wholeOf(en, 1).attributes('aria-label')).toBe('to')
        })

        it('Enter в поле с изменённой суммой — changed, связка v-model', async () => {
            const { wrapper, from, to, changes } = mountBound(component, base, { currencies: ['USD'] }, { currency: 'USD' })

            await wholeOf(wrapper, 0).setValue('12')
            await wholeOf(wrapper, 1).setValue('34')

            expect(from).toEqual([1200])
            expect(to).toEqual([3400])
            expect(changes).toEqual([])

            await wholeOf(wrapper, 1).trigger('keydown', { key: 'Enter' })

            expect(changes).toEqual([{ amountFrom: 1200, amountTo: 3400, currency: 'USD' }])

            await wholeOf(wrapper, 1).trigger('keydown', { key: 'Enter' })

            expect(changes).toHaveLength(1)
        })

        it('нулевая граница «от» считается заданной — выбор валюты даёт changed', async () => {
            const { wrapper, changes } = mountBound(component, base, { currencies: ['USD', 'JPY'] }, { amountFrom: 0, currency: 'USD' })

            await choose(wrapper, 'JPY ¥')

            expect(changes).toEqual([{ amountFrom: 0, amountTo: null, currency: 'JPY' }])
        })

        it('крестик в «от» — update:amountFrom null и changed', async () => {
            const { wrapper, from, changes } = mountBound(component, base, { currencies: ['USD'] }, { amountFrom: 100, amountTo: 500, currency: 'USD' })

            const eraser = fieldsOf(wrapper)[0].getComponent(CrossButton)

            await eraser.trigger('click')
            await Promise.all(eraser.element.getAnimations().map((animation) => animation.finished))

            expect(from).toEqual([null])
            expect(changes).toEqual([{ amountFrom: null, amountTo: 500, currency: 'USD' }])
        })

        it('без v-model поля работают на своём состоянии, события уходят', async () => {
            const wrapper = mountInterval(component, base, { currencies: ['USD'] })

            await wholeOf(wrapper, 0).setValue('1234')
            await wholeOf(wrapper, 0).setValue('12345')
            await wholeOf(wrapper, 0).trigger('keydown', { key: 'Enter' })

            expect(parts(wrapper)[0]).toEqual(['12 345', ''])
            expect(emittedOf(wrapper, 'update:amountFrom')).toEqual([123400, 1234500])
            expect(wrapper.emitted('changed')).toEqual([[]])
        })

        it('withEraser: false доходит до обоих полей', () => {
            const wrapper = mountInterval(component, base, {
                amountFrom: 100,
                amountTo: 500,
                currency: 'USD',
                currencies: ['USD'],
                withEraser: false,
            })

            expect(wrapper.findAllComponents(CrossButton)).toHaveLength(0)
        })

        it('class ложится на корень с bb-dashboard-ui', () => {
            const wrapper = mountInterval(component, base, {}, { class: 'ml-2' })

            expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb-dashboard-ui', 'ml-2']))
        })

        it('lang доходит до полей и поиска валюты', async () => {
            const wrapper = mountInterval(component, base, {
                amountFrom: 123456,
                amountTo: 223456,
                currency: 'USD',
                currencies: ['USD', 'EUR'],
                lang: 'en',
            })
            await open(wrapper)

            expect(parts(wrapper)).toEqual([['1,234', '56'], ['2,234', '56']])
            expect(panelOf(wrapper).get('input').attributes('placeholder')).toBe('Search')
        })
    })

    describe('блок валюты', () => {
        it('выбор валюты при заданной границе — update:currency, границы те же, changed', async () => {
            const { wrapper, currency, from, to, changes } = mountBound(
                component,
                base,
                { currencies: ['USD', 'JPY'] },
                { amountFrom: 123456, currency: 'USD' },
            )

            await choose(wrapper, 'JPY ¥')

            expect(currency).toEqual(['JPY'])
            expect(from).toEqual([])
            expect(to).toEqual([])
            expect(changes).toEqual([{ amountFrom: 123456, amountTo: null, currency: 'JPY' }])
        })

        it('выбор валюты при одной лишь границе «до» — changed', async () => {
            const { wrapper, changes } = mountBound(component, base, { currencies: ['USD', 'JPY'] }, { amountTo: 500, currency: 'USD' })

            await choose(wrapper, 'JPY ¥')

            expect(changes).toHaveLength(1)
        })

        it('выбор валюты без границ — значение есть, changed нет', async () => {
            const { wrapper, currency, changes } = mountBound(component, base, { currencies: ['USD', 'JPY'] }, { currency: 'USD' })

            await choose(wrapper, 'JPY ¥')

            expect(currency).toEqual(['JPY'])
            expect(changes).toEqual([])
        })

        it('выбор той же валюты — событий нет', async () => {
            const wrapper = mountInterval(component, base, { amountFrom: 100, currency: 'USD', currencies: ['USD', 'JPY'] })

            await choose(wrapper, 'USD $')

            expectNoEvents(wrapper)
        })

        it('смена валюты не меняет границы, поля показывают новую запятую', async () => {
            const { wrapper, from, to } = mountBound(
                component,
                base,
                { currencies: ['USD', 'JPY'] },
                { amountFrom: 123456, amountTo: 223456, currency: 'USD' },
            )

            expect(parts(wrapper)).toEqual([['1 234', '56'], ['2 234', '56']])

            await choose(wrapper, 'JPY ¥')

            expect(parts(wrapper)).toEqual([['123 456'], ['223 456']])
            expect(from).toEqual([])
            expect(to).toEqual([])
        })

        it('одна валюта — текст, не в порядке Tab', () => {
            const wrapper = mountInterval(component, base, { currency: 'RUB', currencies: ['RUB'] })
            const block = blockOf(wrapper)

            expect(block.text()).toBe('RUB ₽')
            expect(block.findAll('button, input, a, [tabindex]')).toHaveLength(0)
        })

        it('порядок Tab: «от», копейки, крестик, «до», копейки, крестик, валюта', () => {
            const wrapper = mountInterval(component, base, {
                amountFrom: 123456,
                amountTo: 223456,
                currency: 'USD',
                currencies: ['USD', 'EUR'],
            })
            const [from, to] = fieldsOf(wrapper)
            const [fromCross, toCross] = wrapper.findAllComponents(CrossButton)
            const names = new Map([
                [inputsOf(from)[0].element, 'от'],
                [inputsOf(from)[1].element, 'копейки от'],
                [fromCross.element, 'крестик от'],
                [inputsOf(to)[0].element, 'до'],
                [inputsOf(to)[1].element, 'копейки до'],
                [toCross.element, 'крестик до'],
                [triggerOf(wrapper).element, 'валюта'],
            ])
            const stops = wrapper.findAll('input, button').map((stop) => stop.element).filter(isOutsidePanel)

            expect(stops.map((stop) => names.get(stop))).toEqual([
                'от',
                'копейки от',
                'крестик от',
                'до',
                'копейки до',
                'крестик до',
                'валюта',
            ])
        })
    })

    describe('блокировка', () => {
        it('[] — оба поля disabled, событий нет', () => {
            const wrapper = mountInterval(component, base, { amountFrom: 100, amountTo: 500, currency: 'USD', currencies: [] })

            expect(wrapper.findAll('input').map((input) => input.element.disabled)).toEqual([true, true, true, true])
            expectNoEvents(wrapper)
        })

        it.each([
            ['USD', [['1 234', '56'], ['2 234', '56']]],
            ['JPY', [['123 456'], ['223 456']]],
            ['KWD', [['123', '456'], ['223', '456']]],
        ])('[] → [%s]: границы на месте, части по валюте, событий нет', async (code, expected) => {
            const wrapper = mountInterval(component, base, { amountFrom: 123456, amountTo: 223456, currency: code, currencies: [] })

            await wrapper.setProps({ currencies: [code] })

            expect(parts(wrapper)).toEqual(expected)
            expect(wrapper.findAll('input').every((input) => !input.element.disabled)).toBe(true)
            expectNoEvents(wrapper)
        })
    })
})

describe('AmountIntervalFilter', () => {
    const filterBase = { header: 'Сумма' }

    it('корень: высота, рамка, ширина по содержимому', () => {
        const wrapper = mountInterval(AmountIntervalFilter, filterBase)

        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb:h-18', 'bb:border', 'bb:border-gray-200', 'bb:w-fit']))
    })

    it('поля шириной 184px и блок валюты шириной 6rem, между ними divide-x', () => {
        const wrapper = mountInterval(AmountIntervalFilter, filterBase, { currency: 'USD', currencies: ['USD'] })
        const [from, to] = fieldsOf(wrapper)
        const row = from.element.parentElement.parentElement

        expect(from.element.parentElement.classList).toContain('bb:w-46')
        expect(to.element.parentElement.classList).toContain('bb:w-46')
        expect(to.element.parentElement.parentElement).toBe(row)
        expect(blockOf(wrapper).element.parentElement.classList).toContain('bb:w-24')
        expect(blockOf(wrapper).element.parentElement.parentElement).toBe(row)
        expect([...row.classList]).toEqual(expect.arrayContaining(['bb:divide-x', 'bb:divide-gray-200']))
    })

    it('у блоков фильтра нет рамок формы', () => {
        const wrapper = mountInterval(AmountIntervalFilter, filterBase, { currency: 'USD', currencies: ['USD'] })
        const frames = [fieldsOf(wrapper)[0], fieldsOf(wrapper)[1], blockOf(wrapper)].map((part) => part.element.parentElement)
        const formClasses = ['bb:[--bb-field-radius:0.375rem]', 'bb:border', 'bb:border-gray-300', 'bb:rounded-md', 'bb:shadow-xs', 'bb:bg-white']

        expect(frames).toHaveLength(3)
        for (const frame of frames) {
            expect(formClasses.filter((name) => frame.classList.contains(name))).toEqual([])
        }
    })

    it('заголовок и isLoading доходят до ElementHeader', () => {
        const wrapper = mountInterval(AmountIntervalFilter, filterBase, { isRequired: true, isLoading: true })
        const header = wrapper.getComponent(ElementHeader)

        expect(header.props()).toMatchObject({ text: 'Сумма', isRequired: true, isLoading: true })
    })

    it('withCurrency: false — блока нет, подстановка и копейки по переданной валюте', () => {
        const wrapper = mountInterval(AmountIntervalFilter, filterBase, {
            amountFrom: 123456,
            amountTo: 223456,
            currency: 'JPY',
            withCurrency: false,
        })

        expect(blockOf(wrapper).exists()).toBe(false)
        expect(parts(wrapper)).toEqual([['123 456'], ['223 456']])
        expectNoEvents(wrapper)
    })

    it('withCurrency: false без валюты — AED, два знака, подстановка есть', () => {
        const wrapper = mountInterval(AmountIntervalFilter, filterBase, {
            amountFrom: 123456,
            withCurrency: false,
        })

        expect(blockOf(wrapper).exists()).toBe(false)
        expect(parts(wrapper)[0]).toEqual(['1 234', '56'])
        expect(emittedOf(wrapper, 'update:currency')).toEqual(['AED'])
    })
})

describe('AmountIntervalForm', () => {
    const formBase = { label: 'Сумма' }

    it('group с именем подписи', () => {
        const wrapper = mountInterval(AmountIntervalForm, formBase)
        const group = wrapper.get('[role="group"]')
        const label = document.getElementById(group.attributes('aria-labelledby'))

        expect(label.textContent).toBe('Сумма')
    })

    it('у двух копий разные id подписи', () => {
        const wrapper = mount({
            render: () => [
                h(AmountIntervalForm, { label: 'Первая' }),
                h(AmountIntervalForm, { label: 'Вторая' }),
            ],
        }, mountOptions())
        const [first, second] = wrapper.findAll('[role="group"]')

        expect(first.attributes('aria-labelledby')).not.toBe(second.attributes('aria-labelledby'))
    })

    it('сетка 1fr 1fr 6rem с промежутком gap-3', () => {
        const wrapper = mountInterval(AmountIntervalForm, formBase)
        const group = wrapper.get('[role="group"]')

        expect(group.classes()).toEqual(expect.arrayContaining(['bb:mt-1', 'bb:grid', 'bb:grid-cols-[1fr_1fr_6rem]', 'bb:gap-3']))
        expect(group.element.children).toHaveLength(3)
    })

    it('у каждого из трёх блоков своя рамка с --bb-field-radius', () => {
        const wrapper = mountInterval(AmountIntervalForm, formBase)
        const frames = [...wrapper.get('[role="group"]').element.children]

        for (const frame of frames) {
            expect([...frame.classList]).toEqual(expect.arrayContaining(FRAME_CLASSES))
        }
        expect(frames[0].contains(fieldsOf(wrapper)[0].element)).toBe(true)
        expect(frames[1].contains(fieldsOf(wrapper)[1].element)).toBe(true)
        expect(frames[2].contains(blockOf(wrapper).element)).toBe(true)
    })

    it('isRequired показывает точку', async () => {
        const wrapper = mountInterval(AmountIntervalForm, formBase)
        const dot = () => wrapper.getComponent(Dot)

        expect(dot().element.style.display).toBe('none')

        await wrapper.setProps({ isRequired: true })

        expect(dot().element.style.display).toBe('')
    })
})

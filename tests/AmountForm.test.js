// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h, ref } from 'vue'
import AmountCurrency from '../src/components/AmountCurrency.vue'
import AmountForm from '../src/components/AmountForm.vue'
import AmountInput from '../src/components/AmountInput.vue'
import CrossButton from '../src/components/CrossButton.vue'
import Dot from '../src/components/Dot.vue'
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

// attachTo нужен фокусу: элементу вне документа его не дать.
function mountOptions() {
    return {
        attachTo: document.body,
        global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } },
    }
}

function mountForm(props = {}, attrs = {}) {
    return mount(AmountForm, { props: { label: 'Сумма', ...props }, attrs, ...mountOptions() })
}

// Настоящая связка v-model: родитель сразу отвечает на update:modelValue.
function mountBound(props = {}, initial = null) {
    const value = ref(initial)
    const updates = []
    const changes = []
    const wrapper = mount({
        render: () => h(AmountForm, {
            label: 'Сумма',
            ...props,
            modelValue: value.value,
            'onUpdate:modelValue': (next) => {
                updates.push(next)
                value.value = next
            },
            onChanged: () => changes.push(value.value),
        }),
    }, mountOptions())

    return { wrapper, value, updates, changes }
}

const fieldOf = (wrapper) => wrapper.getComponent(AmountInput)
const blockOf = (wrapper) => wrapper.getComponent(AmountCurrency)
const wholeOf = (wrapper) => fieldOf(wrapper).findAll('input')[0]
const fractionOf = (wrapper) => fieldOf(wrapper).findAll('input')[1]
const triggerOf = (wrapper) => wrapper.find('button[popovertarget]')
const panelOf = (wrapper) => wrapper.get('[popover]')
const itemsOf = (wrapper) => panelOf(wrapper).findAll('button').filter((button) => !button.find(CROSS_PATH).exists())
const isOutsidePanel = (element) => element.closest('[popover]') === null

function parts(wrapper) {
    return fieldOf(wrapper).findAll('input').map((input) => input.element.value)
}

function values(wrapper) {
    return (wrapper.emitted('update:modelValue') ?? []).map(([value]) => value)
}

function expectNoEvents(wrapper) {
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('changed')).toBeUndefined()
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

describe('AmountForm: активная валюта', () => {
    it('без modelValue на mounted — одно событие с первой валютой, changed нет', () => {
        const wrapper = mountForm({ currencies: ['RUB', 'USD'] })

        expect(values(wrapper)).toEqual([{ amount: null, currency: 'RUB' }])
        expect(wrapper.emitted('changed')).toBeUndefined()
    })

    it('без currencies — AED', () => {
        const wrapper = mountForm()

        expect(values(wrapper)).toEqual([{ amount: null, currency: 'AED' }])
    })

    it('валюты нет в списке — событие с активной и той же суммой', () => {
        const wrapper = mountForm({ modelValue: { amount: 123456, currency: 'EUR' }, currencies: ['USD'] })

        expect(values(wrapper)).toEqual([{ amount: 123456, currency: 'USD' }])
        expect(wrapper.emitted('changed')).toBeUndefined()
    })

    it('валюта в списке — событий нет', () => {
        const wrapper = mountForm({ modelValue: { amount: 123456, currency: 'USD' }, currencies: ['RUB', 'USD'] })

        expectNoEvents(wrapper)
    })

    it('связка v-model: подстановка одна, родитель принял — повторного нет', async () => {
        const { updates, changes } = mountBound({ currencies: ['RUB', 'USD'] })

        await flushPromises()

        expect(updates).toEqual([{ amount: null, currency: 'RUB' }])
        expect(changes).toEqual([])
    })

    it('код сменился при той же активной валюте — одно событие, родитель принял — повторного нет', async () => {
        const wrapper = mountForm({ modelValue: { amount: 123456, currency: 'USD' }, currencies: ['USD'] })

        await wrapper.setProps({ modelValue: { amount: 123456, currency: 'EUR' } })

        expect(values(wrapper)).toEqual([{ amount: 123456, currency: 'USD' }])

        await wrapper.setProps({ modelValue: { amount: 123456, currency: 'USD' } })

        expect(values(wrapper)).toHaveLength(1)
        expect(wrapper.emitted('changed')).toBeUndefined()
    })

    it('новый равный массив — событий нет', async () => {
        const wrapper = mountForm({ modelValue: { amount: 123456, currency: 'USD' }, currencies: ['USD', 'EUR'] })

        await wrapper.setProps({ currencies: ['USD', 'EUR'] })

        expectNoEvents(wrapper)
    })

    it('текущая валюта пропала из списка — событие с первой', async () => {
        const wrapper = mountForm({ modelValue: { amount: 123456, currency: 'USD' }, currencies: ['USD', 'EUR'] })

        await wrapper.setProps({ currencies: ['EUR', 'RUB'] })

        expect(values(wrapper)).toEqual([{ amount: 123456, currency: 'EUR' }])
        expect(wrapper.emitted('changed')).toBeUndefined()
    })
})

describe('AmountForm: блок валюты', () => {
    it('одна валюта — текст, кнопки нет, не в порядке Tab', () => {
        const wrapper = mountForm({ modelValue: { amount: null, currency: 'RUB' }, currencies: ['RUB'] })
        const block = blockOf(wrapper)
        const text = block.get('span')

        expect(block.text()).toBe('RUB ₽')
        expect(text.classes()).toEqual(expect.arrayContaining(['bb:truncate', 'bb:px-3']))
        expect(block.findAll('button, input, a, [tabindex]')).toHaveLength(0)
    })

    it('несколько — кнопка со стрелкой и меткой, ластика нет, поиск есть', async () => {
        const wrapper = mountForm({ modelValue: { amount: 123456, currency: 'USD' }, currencies: ['RUB', 'USD'] })
        await open(wrapper)
        const crosses = blockOf(wrapper).findAll(CROSS_PATH).filter((cross) => isOutsidePanel(cross.element))

        expect(triggerOf(wrapper).text()).toContain('USD $')
        expect(triggerOf(wrapper).find('svg').exists()).toBe(true)
        expect(crosses).toHaveLength(0)
        expect(panelOf(wrapper).find('input').exists()).toBe(true)
        expect(itemsOf(wrapper).map((item) => item.text())).toEqual(['RUB ₽', 'USD $'])
    })

    it.each([
        ['ru', 'Валюта'],
        ['en', 'Currency'],
    ])('имя кнопки в %s — подпись «%s» и метка', (lang, label) => {
        const wrapper = mountForm({ modelValue: { amount: null, currency: 'USD' }, currencies: ['RUB', 'USD'], lang })
        const trigger = triggerOf(wrapper)
        const [labelId, triggerId] = trigger.attributes('aria-labelledby').split(' ')
        const hint = document.getElementById(labelId)

        expect(hint.textContent).toBe(label)
        expect(hint.classList).toContain('bb:sr-only')
        expect(triggerId).toBe(trigger.attributes('id'))
    })

    it('выбор другой валюты при сумме — та же сумма, changed, новые части поля', async () => {
        const { wrapper, value, updates, changes } = mountBound({ currencies: ['USD', 'JPY'] }, { amount: 123456, currency: 'USD' })

        await choose(wrapper, 'JPY ¥')

        expect(updates).toEqual([{ amount: 123456, currency: 'JPY' }])
        expect(value.value).toEqual({ amount: 123456, currency: 'JPY' })
        expect(changes).toEqual([{ amount: 123456, currency: 'JPY' }])
        expect(parts(wrapper)).toEqual(['123 456'])
    })

    it('выбор другой валюты при пустой сумме — значение есть, changed нет', async () => {
        const { wrapper, updates, changes } = mountBound({ currencies: ['USD', 'JPY'] }, { amount: null, currency: 'USD' })

        await choose(wrapper, 'JPY ¥')

        expect(updates).toEqual([{ amount: null, currency: 'JPY' }])
        expect(changes).toEqual([])
    })

    it('сумма 0 считается суммой: выбор другой валюты даёт changed', async () => {
        const { wrapper, updates, changes } = mountBound({ currencies: ['USD', 'JPY'] }, { amount: 0, currency: 'USD' })

        await choose(wrapper, 'JPY ¥')

        expect(updates).toEqual([{ amount: 0, currency: 'JPY' }])
        expect(changes).toEqual([{ amount: 0, currency: 'JPY' }])
    })

    it('выбор той же валюты — событий нет', async () => {
        const wrapper = mountForm({ modelValue: { amount: 123456, currency: 'USD' }, currencies: ['USD', 'JPY'] })

        await choose(wrapper, 'USD $')

        expectNoEvents(wrapper)
    })
})

describe('AmountForm: блокировка', () => {
    it('[] — поля disabled, блок пуст, событий нет', () => {
        const wrapper = mountForm({ modelValue: { amount: 123456, currency: 'USD' }, currencies: [] })

        expect(fieldOf(wrapper).findAll('input').map((input) => input.element.disabled)).toEqual([true, true])
        expect(parts(wrapper)).toEqual(['', ''])
        expect(blockOf(wrapper).element.children).toHaveLength(0)
        expect(blockOf(wrapper).text()).toBe('')
        expectNoEvents(wrapper)
    })

    it('список опустел — поля disabled, событий нет', async () => {
        const wrapper = mountForm({ modelValue: { amount: 123456, currency: 'USD' }, currencies: ['USD'] })

        await wrapper.setProps({ currencies: [] })

        expect(wrapper.findAll('input').map((input) => input.element.disabled)).toEqual([true, true])
        expectNoEvents(wrapper)
    })

    it.each([
        ['USD', ['1 234', '56']],
        ['JPY', ['123 456']],
        ['KWD', ['123', '456']],
    ])('[] → [%s]: значение на месте, части по валюте, событий нет', async (currency, expected) => {
        const wrapper = mountForm({ modelValue: { amount: 123456, currency }, currencies: [] })

        await wrapper.setProps({ currencies: [currency] })

        expect(parts(wrapper)).toEqual(expected)
        expect(fieldOf(wrapper).findAll('input').every((input) => !input.element.disabled)).toBe(true)
        expectNoEvents(wrapper)
    })

    it('[] → [EUR] при USD — одно событие с EUR и той же суммой', async () => {
        const wrapper = mountForm({ modelValue: { amount: 123456, currency: 'USD' }, currencies: [] })

        await wrapper.setProps({ currencies: ['EUR'] })

        expect(values(wrapper)).toEqual([{ amount: 123456, currency: 'EUR' }])
        expect(wrapper.emitted('changed')).toBeUndefined()
    })
})

describe('AmountForm: форма', () => {
    it('подпись связана с основной частью', () => {
        const wrapper = mountForm({ modelValue: { amount: 123456, currency: 'USD' }, currencies: ['USD'] })
        const label = wrapper.get('label')

        expect(label.text()).toBe('Сумма')
        expect(wholeOf(wrapper).attributes('id')).toBeTruthy()
        expect(label.attributes('for')).toBe(wholeOf(wrapper).attributes('id'))
        // Фокус по клику на подпись ставит браузер, happy-dom его не моделирует:
        // браузер отдаёт его элементу label.control.
        expect(label.element.control).toBe(wholeOf(wrapper).element)
    })

    it('у двух копий разные id', () => {
        const wrapper = mount({
            render: () => [
                h(AmountForm, { label: 'Первая', currencies: ['USD'] }),
                h(AmountForm, { label: 'Вторая', currencies: ['USD'] }),
            ],
        }, mountOptions())
        const [first, second] = wrapper.findAllComponents(AmountForm)

        expect(wholeOf(first).attributes('id')).not.toBe(wholeOf(second).attributes('id'))
        expect(first.get('label').attributes('for')).toBe(wholeOf(first).attributes('id'))
        expect(second.get('label').attributes('for')).toBe(wholeOf(second).attributes('id'))
    })

    it('у двух копий с двумя валютами разные id подписи кнопки', () => {
        const wrapper = mount({
            render: () => [
                h(AmountForm, { label: 'Первая', currencies: ['USD', 'EUR'] }),
                h(AmountForm, { label: 'Вторая', currencies: ['USD', 'EUR'] }),
            ],
        }, mountOptions())
        const [first, second] = wrapper.findAllComponents(AmountForm)
        const hintIdOf = (form) => triggerOf(form).attributes('aria-labelledby').split(' ')[0]

        expect(hintIdOf(first)).not.toBe(hintIdOf(second))
        expect(blockOf(first).element.contains(document.getElementById(hintIdOf(first)))).toBe(true)
        expect(blockOf(second).element.contains(document.getElementById(hintIdOf(second)))).toBe(true)
    })

    it('isRequired показывает точку', async () => {
        const wrapper = mountForm()
        const dot = () => wrapper.getComponent(Dot)

        expect(dot().element.style.display).toBe('none')

        await wrapper.setProps({ isRequired: true })

        expect(dot().element.style.display).toBe('')
    })

    it('class ложится на корень с bb-dashboard-ui', () => {
        const wrapper = mountForm({}, { class: 'ml-2' })

        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb-dashboard-ui', 'ml-2']))
    })

    it('data-атрибут ложится на корень', () => {
        const wrapper = mountForm({}, { 'data-test': 'amount' })

        expect(wrapper.attributes('data-test')).toBe('amount')
    })

    it('строка из рамки суммы и рамки блока', () => {
        const wrapper = mountForm()
        const amountFrame = fieldOf(wrapper).element.parentElement
        const blockFrame = blockOf(wrapper).element.parentElement

        expect(amountFrame.parentElement).toBe(blockFrame.parentElement)
        expect([...amountFrame.parentElement.classList]).toEqual(expect.arrayContaining(['bb:mt-1', 'bb:flex', 'bb:gap-3']))
        expect([...amountFrame.classList]).toEqual(expect.arrayContaining([...FRAME_CLASSES, 'bb:flex-1', 'bb:min-w-0']))
        expect([...blockFrame.classList]).toEqual(expect.arrayContaining([...FRAME_CLASSES, 'bb:w-24', 'bb:flex-none']))
    })

    it('modelValue не объект — пусто, одно предупреждение о типе', () => {
        const wrapper = mountForm({ modelValue: 'x' })

        expect(parts(wrapper)).toEqual(['', ''])
        expect(warnings.splice(0)).toEqual([expect.stringContaining('"modelValue"')])
    })

    it('amount не сумма — пусто, предупреждений нет', () => {
        const wrapper = mountForm({ modelValue: { amount: '100', currency: 'USD' }, currencies: ['USD'] })

        expect(parts(wrapper)).toEqual(['', ''])
    })

    it('withEraser: false доходит до поля', () => {
        const wrapper = mountForm({ modelValue: { amount: 123456, currency: 'USD' }, currencies: ['USD'], withEraser: false })

        expect(fieldOf(wrapper).findComponent(CrossButton).exists()).toBe(false)
    })

    it('порядок Tab: основная часть, копейки, крестик, валюта', () => {
        const wrapper = mountForm({ modelValue: { amount: 123456, currency: 'USD' }, currencies: ['USD', 'EUR'] })
        const names = new Map([
            [wholeOf(wrapper).element, 'основная часть'],
            [fractionOf(wrapper).element, 'копейки'],
            [wrapper.getComponent(CrossButton).element, 'крестик'],
            [triggerOf(wrapper).element, 'валюта'],
        ])
        const stops = wrapper.findAll('input, button').map((stop) => stop.element).filter(isOutsidePanel)

        expect(stops.map((stop) => names.get(stop))).toEqual(['основная часть', 'копейки', 'крестик', 'валюта'])
    })

    it('фиксированная валюта не входит в порядок Tab', () => {
        const wrapper = mountForm({ modelValue: { amount: 123456, currency: 'USD' }, currencies: ['USD'] })
        const stops = wrapper.findAll('input, button').map((stop) => stop.element)

        expect(stops).toEqual([wholeOf(wrapper).element, fractionOf(wrapper).element, wrapper.getComponent(CrossButton).element])
    })

    it('ввод шлёт сумму с активной валютой, Enter — changed', async () => {
        const wrapper = mountForm({ modelValue: { amount: null, currency: 'USD' }, currencies: ['USD'] })

        await wholeOf(wrapper).setValue('12')
        await wholeOf(wrapper).trigger('keydown', { key: 'Enter' })

        expect(values(wrapper)).toEqual([{ amount: 1200, currency: 'USD' }])
        expect(wrapper.emitted('changed')).toEqual([[]])
    })

    it('каждое событие несёт новый объект, переданный не меняется', async () => {
        const modelValue = { amount: null, currency: 'USD' }
        const wrapper = mountForm({ modelValue, currencies: ['USD'] })

        await wholeOf(wrapper).setValue('1')
        await wholeOf(wrapper).setValue('12')

        const [first, second] = values(wrapper)

        expect(first).not.toBe(second)
        expect(first).not.toBe(modelValue)
        expect(modelValue).toEqual({ amount: null, currency: 'USD' })
    })

    it('без v-model поле работает на своём состоянии, события уходят', async () => {
        const wrapper = mountForm({ currencies: ['USD'] })

        await wholeOf(wrapper).setValue('1234')
        await wholeOf(wrapper).setValue('12345')
        await wholeOf(wrapper).trigger('keydown', { key: 'Enter' })

        expect(parts(wrapper)).toEqual(['12 345', ''])
        expect(values(wrapper)).toEqual([
            { amount: null, currency: 'USD' },
            { amount: 123400, currency: 'USD' },
            { amount: 1234500, currency: 'USD' },
        ])
        expect(wrapper.emitted('changed')).toEqual([[]])
    })

    it('родитель только слушает: выбор валюты шлёт amount: null и не шлёт changed', async () => {
        // Значение задаёт родитель, поэтому событие выбора несёт переданную им сумму, а не введённую.
        const wrapper = mountForm({ currencies: ['USD', 'JPY'] })

        wholeOf(wrapper).element.focus()
        await wholeOf(wrapper).setValue('1234')
        await open(wrapper)

        // Этот changed — от выхода из поля суммы, выбор валюты своего не добавляет.
        expect(wrapper.emitted('changed')).toHaveLength(1)

        await itemsOf(wrapper).find((item) => item.text() === 'JPY ¥').trigger('click')
        await settle()

        expect(values(wrapper).at(-1)).toEqual({ amount: null, currency: 'JPY' })
        expect(wrapper.emitted('changed')).toHaveLength(1)
        expect(parts(wrapper)).toEqual(['1 234', ''])
    })

    it('lang доходит до поля и поиска', async () => {
        const wrapper = mountForm({ modelValue: { amount: 123456, currency: 'USD' }, currencies: ['USD', 'EUR'], lang: 'en' })
        await open(wrapper)

        expect(parts(wrapper)).toEqual(['1,234', '56'])
        expect(panelOf(wrapper).get('input').attributes('placeholder')).toBe('Search')
    })
})

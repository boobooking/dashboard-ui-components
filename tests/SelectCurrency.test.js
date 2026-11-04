// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import ElementHeader from '../src/components/ElementHeader.vue'
import SelectCurrencyFilter from '../src/components/SelectCurrencyFilter.vue'
import SelectCurrencyForm from '../src/components/SelectCurrencyForm.vue'
import SelectSingle from '../src/components/SelectSingle.vue'
import Dot from '../src/components/Dot.vue'
import { flushToggles, installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

let uninstallPopover

beforeEach(() => {
    uninstallPopover = installPopoverStub()
})

afterEach(() => {
    uninstallPopover()
})

const CROSS_PATH = 'path[d="M6 18L18 6M6 6l12 12"]'

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

function itemsOf(wrapper) {
    return panelOf(wrapper).findAll('button').filter((button) => !button.find(CROSS_PATH).exists())
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

describe.each([
    ['SelectCurrencyFilter', SelectCurrencyFilter, { header: 'Валюта' }],
    ['SelectCurrencyForm', SelectCurrencyForm, { label: 'Валюта' }],
])('%s', (name, component, labelProps) => {
    const mountCurrency = (props = {}, attrs = {}) => mountWrapper(component, { ...labelProps, ...props }, attrs)

    it('без currencies — весь список с AED первым и меткой USD $', async () => {
        const { wrapper, errors, warnings } = mountCurrency()
        await open(wrapper)
        const items = itemsOf(wrapper)

        expect(items).toHaveLength(156)
        expect(items[0].text()).toBe('AED')
        expect(items.map((item) => item.text())).toContain('USD $')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('currencies задаёт пункты и их порядок', async () => {
        const { wrapper, errors, warnings } = mountCurrency({ currencies: ['RUB', 'USD'] })
        await open(wrapper)

        expect(itemsOf(wrapper).map((item) => item.text())).toEqual(['RUB ₽', 'USD $'])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('неизвестный код пропущен', async () => {
        const { wrapper, errors, warnings } = mountCurrency({ currencies: ['RUB', 'XXX', 'USD'] })
        await open(wrapper)

        expect(itemsOf(wrapper).map((item) => item.text())).toEqual(['RUB ₽', 'USD $'])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('поиск по умолчанию есть', async () => {
        const { wrapper, errors, warnings } = mountCurrency({ currencies: ['RUB', 'USD'] })
        await open(wrapper)

        expect(panelOf(wrapper).find('input').exists()).toBe(true)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it(':with-search="false" убирает поиск', async () => {
        const { wrapper, errors, warnings } = mountCurrency({ currencies: ['RUB', 'USD'], withSearch: false })
        await open(wrapper)

        expect(panelOf(wrapper).find('input').exists()).toBe(false)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('поиск ₽ находит RUB ₽', async () => {
        const { wrapper, errors, warnings } = mountCurrency()
        await open(wrapper)

        await panelOf(wrapper).get('input').setValue('₽')
        await settle()

        expect(itemsOf(wrapper).map((item) => item.text())).toEqual(['RUB ₽'])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('выбор шлёт код, update:modelValue и changed', async () => {
        const { wrapper, errors, warnings } = mountCurrency({ currencies: ['RUB', 'USD'] })
        await open(wrapper)

        await itemsOf(wrapper).find((item) => item.text() === 'USD $').trigger('click')
        await settle()

        expect(wrapper.emitted('update:modelValue')).toEqual([['USD']])
        expect(wrapper.emitted('changed')).toEqual([[]])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('ластик шлёт null', async () => {
        const { wrapper, errors, warnings } = mountCurrency({ currencies: ['RUB', 'USD'], modelValue: 'USD' })
        // Ластик значения стоит рядом с кнопкой списка, ластик запроса — в панели.
        const eraser = wrapper.findAll('button').find((button) => button.find(CROSS_PATH).exists() && !button.element.closest('[popover]'))

        await eraser.trigger('click')
        await Promise.all(eraser.element.getAnimations().map((animation) => animation.finished))
        await flushPromises()

        expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
        expect(wrapper.emitted('changed')).toEqual([[]])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('смена currencies меняет пункты', async () => {
        const { wrapper, errors, warnings } = mountCurrency({ currencies: ['RUB'] })
        await open(wrapper)

        expect(itemsOf(wrapper).map((item) => item.text())).toEqual(['RUB ₽'])

        await wrapper.setProps({ currencies: ['USD', 'EUR'] })
        await settle()

        expect(itemsOf(wrapper).map((item) => item.text())).toEqual(['USD $', 'EUR €'])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('modelValue показывается меткой на кнопке', () => {
        const { wrapper, errors, warnings } = mountCurrency({ modelValue: 'USD' })

        expect(triggerOf(wrapper).text()).toBe('USD $')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('data-атрибут ложится на корень', () => {
        const { wrapper, errors, warnings } = mountCurrency({}, { 'data-test': 'currency' })

        expect(wrapper.attributes('data-test')).toBe('currency')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('class ложится на корень', () => {
        const { wrapper, errors, warnings } = mountCurrency({}, { class: 'ml-2' })

        expect(wrapper.classes()).toContain('ml-2')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('lang доходит до поиска', async () => {
        const { wrapper, errors, warnings } = mountCurrency({ lang: 'en' })
        await open(wrapper)

        expect(panelOf(wrapper).get('input').attributes('placeholder')).toBe('Search')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

// Без пунктов кнопки нет, подпись или заголовок и рамка остаются.
describe.each([
    [
        'SelectCurrencyFilter',
        SelectCurrencyFilter,
        { header: 'Валюта' },
        (wrapper) => wrapper.element,
        ['bb:h-18', 'bb:border', 'bb:border-gray-200'],
    ],
    [
        'SelectCurrencyForm',
        SelectCurrencyForm,
        { label: 'Валюта' },
        (wrapper) => wrapper.getComponent(SelectSingle).element.parentElement,
        ['bb:field-frame'],
    ],
])('%s: пустой currencies', (name, component, labelProps, frameOf, frameClasses) => {
    it('кнопки нет, подпись и рамка остались', () => {
        const { wrapper, errors, warnings } = mountWrapper(component, { ...labelProps, currencies: [] })

        expect(wrapper.find('button').exists()).toBe(false)
        expect(wrapper.text()).toContain('Валюта')
        expect([...frameOf(wrapper).classList]).toEqual(expect.arrayContaining(frameClasses))
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

describe('SelectCurrencyForm: точка isRequired', () => {
    it('isRequired показывает точку', async () => {
        const { wrapper, errors, warnings } = mountWrapper(SelectCurrencyForm, { label: 'Валюта' })
        const dot = () => wrapper.getComponent(Dot)

        expect(dot().element.style.display).toBe('none')

        await wrapper.setProps({ isRequired: true })

        expect(dot().element.style.display).toBe('')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

describe('SelectCurrencyFilter: заголовок', () => {
    it('заголовок и точка isRequired', () => {
        const { wrapper, errors, warnings } = mountWrapper(SelectCurrencyFilter, { header: 'Валюта', isRequired: true, isLoading: true })

        expect(wrapper.getComponent(ElementHeader).text()).toBe('Валюта')
        expect(wrapper.getComponent(ElementHeader).props()).toMatchObject({ isRequired: true, isLoading: true })
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

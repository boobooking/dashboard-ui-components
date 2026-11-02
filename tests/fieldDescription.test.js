// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import AmountForm from '../src/components/AmountForm.vue'
import AmountIntervalForm from '../src/components/AmountIntervalForm.vue'
import FieldDescription from '../src/components/FieldDescription.vue'
import FormInput from '../src/components/FormInput.vue'
import SelectCurrencyForm from '../src/components/SelectCurrencyForm.vue'
import SelectDateForm from '../src/components/SelectDateForm.vue'
import SelectDateIntervalForm from '../src/components/SelectDateIntervalForm.vue'
import SelectMultipleForm from '../src/components/SelectMultipleForm.vue'
import SelectMultipleList from '../src/components/SelectMultipleList.vue'
import SelectSingleCards from '../src/components/SelectSingleCards.vue'
import SelectSingleForm from '../src/components/SelectSingleForm.vue'
import { installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

let uninstallPopover

beforeEach(() => {
    uninstallPopover = installPopoverStub()
})

afterEach(() => {
    uninstallPopover()
    document.body.innerHTML = ''
})

// carrier — элемент, который связан с описанием через aria-describedby.
const items = [{ id: 'a', name: 'Первый' }, { id: 'b', name: 'Второй' }]
const trigger = (wrapper) => wrapper.find('button[popovertarget]')
const group = (wrapper) => wrapper.find('[role="group"]')
const amount = { amount: 123456, currency: 'USD' }

const fields = [
    { name: 'FormInput', component: FormInput, props: { label: 'Имя' }, carrier: (wrapper) => wrapper.find('input') },
    { name: 'SelectSingleForm', component: SelectSingleForm, props: { label: 'Вендор', items }, carrier: trigger },
    { name: 'SelectCurrencyForm', component: SelectCurrencyForm, props: { label: 'Валюта' }, carrier: trigger },
    { name: 'SelectMultipleForm', component: SelectMultipleForm, props: { label: 'Вендор', items }, carrier: trigger },
    { name: 'SelectDateForm', component: SelectDateForm, props: { label: 'Дата' }, carrier: trigger },
    { name: 'SelectDateIntervalForm', component: SelectDateIntervalForm, props: { label: 'Период' }, carrier: group },
    { name: 'AmountForm', component: AmountForm, props: { label: 'Сумма', modelValue: amount }, carrier: (wrapper) => wrapper.find('input') },
    { name: 'AmountIntervalForm', component: AmountIntervalForm, props: { label: 'Сумма' }, carrier: group },
    { name: 'SelectSingleCards', component: SelectSingleCards, props: { label: 'Бренд', items }, carrier: (wrapper) => wrapper.find('[role="radiogroup"]') },
    { name: 'SelectMultipleList', component: SelectMultipleList, props: { label: 'Участники', items }, carrier: group },
]

const descriptionOf = (wrapper) => wrapper.findComponent(FieldDescription)

describe.each(fields)('$name: описание', ({ component, props, carrier }) => {
    const mountField = (options = {}) => mount(component, {
        attachTo: document.body,
        ...options,
        props: { ...props, ...options.props },
    })

    it('текст пропа под полем, связь через aria-describedby', async () => {
        const wrapper = mountField({ props: { description: 'Пояснение' } })
        await flushPromises()

        expect(descriptionOf(wrapper).text()).toBe('Пояснение')
        expect(descriptionOf(wrapper).attributes('id')).toBeTruthy()
        expect(carrier(wrapper).attributes('aria-describedby')).toBe(descriptionOf(wrapper).attributes('id'))
    })

    it.each([[undefined], [null], ['']])('значение %s — описания и связи нет', async (description) => {
        const wrapper = mountField({ props: { description } })
        await flushPromises()

        expect(descriptionOf(wrapper).exists()).toBe(false)
        expect(carrier(wrapper).attributes('aria-describedby')).toBeUndefined()
    })

    it('слот важнее пропа', () => {
        const wrapper = mountField({
            props: { description: 'Пропа' },
            slots: { description: '<a href="#s">Слот</a>' },
        })

        expect(descriptionOf(wrapper).get('a').text()).toBe('Слот')
        expect(descriptionOf(wrapper).text()).not.toContain('Пропа')
    })

    it('слот появляется и исчезает по условию страницы', async () => {
        const Page = defineComponent({
            components: { Field: component },
            props: { isShown: Boolean },
            setup: () => ({ fieldProps: props }),
            template: '<Field v-bind="fieldProps"><template v-if="isShown" #description>Слот</template></Field>',
        })
        const wrapper = mount(Page, { attachTo: document.body, props: { isShown: false } })
        expect(descriptionOf(wrapper).exists()).toBe(false)
        expect(carrier(wrapper).attributes('aria-describedby')).toBeUndefined()

        await wrapper.setProps({ isShown: true })
        expect(descriptionOf(wrapper).text()).toBe('Слот')
        expect(carrier(wrapper).attributes('aria-describedby')).toBe(descriptionOf(wrapper).attributes('id'))

        await wrapper.setProps({ isShown: false })
        expect(descriptionOf(wrapper).exists()).toBe(false)
        expect(carrier(wrapper).attributes('aria-describedby')).toBeUndefined()
    })

    it('разметка в пропе выводится как текст', () => {
        const wrapper = mountField({ props: { description: '<b>жирный</b>' } })

        expect(descriptionOf(wrapper).find('b').exists()).toBe(false)
        expect(descriptionOf(wrapper).text()).toBe('<b>жирный</b>')
    })

    it('не строка — предупреждение Vue, описания нет, без ошибок', () => {
        const warnings = []
        const errors = []
        const wrapper = mountField({
            props: { description: 42 },
            global: {
                config: {
                    warnHandler: (message) => warnings.push(message),
                    errorHandler: (error) => errors.push(error),
                },
            },
        })

        expect(warnings.some((message) => message.includes('Invalid prop: type check failed for prop "description"'))).toBe(true)
        expect(errors).toEqual([])
        expect(descriptionOf(wrapper).exists()).toBe(false)
    })

    it('на вызове FieldDescription нет своих классов', () => {
        const wrapper = mountField({ props: { description: 'Пояснение' } })

        expect(descriptionOf(wrapper).vm.$attrs.class).toBeUndefined()
    })

    it('описание — после рамки или группы, последним в корне', () => {
        const wrapper = mountField({ props: { description: 'Пояснение' } })

        expect(wrapper.element.lastElementChild).toBe(descriptionOf(wrapper).element)
    })

    // useId() уникален в пределах приложения: экземпляры — на одной странице.
    it('два экземпляра — разные id описаний', () => {
        const Page = defineComponent({
            components: { Field: component },
            setup: () => ({ fieldProps: { ...props, description: 'Пояснение' } }),
            template: '<Field v-bind="fieldProps"/><Field v-bind="fieldProps"/>',
        })
        const wrapper = mount(Page, { attachTo: document.body })
        const [first, second] = wrapper.findAllComponents(FieldDescription)

        expect(first.attributes('id')).not.toBe(second.attributes('id'))
    })
})

describe('FieldDescription', () => {
    it('вид задан здесь', () => {
        expect(mount(FieldDescription).classes()).toEqual(expect.arrayContaining([
            'bb:mt-1', 'bb:w-0', 'bb:min-w-full', 'bb:text-xs', 'bb:leading-4', 'bb:font-normal', 'bb:text-gray-500', 'bb:wrap-anywhere',
        ]))
    })
})

describe('FormInput: связь описания', () => {
    const mountInput = (options = {}) => mount(FormInput, { ...options, props: { label: 'Имя', ...options.props } })

    it('aria-describedby страницы сохраняется и обновляется', async () => {
        const wrapper = mountInput({ props: { description: 'Пояснение' }, attrs: { 'aria-describedby': 'hint-a' } })
        const id = descriptionOf(wrapper).attributes('id')
        expect(wrapper.get('input').attributes('aria-describedby')).toBe(`hint-a ${id}`)

        await wrapper.setProps({ 'aria-describedby': 'hint-b' })
        expect(wrapper.get('input').attributes('aria-describedby')).toBe(`hint-b ${id}`)

        await wrapper.setProps({ 'aria-describedby': undefined })
        expect(wrapper.get('input').attributes('aria-describedby')).toBe(id)
    })

    it('aria-describedby страницы без описания — только он', () => {
        const wrapper = mountInput({ attrs: { 'aria-describedby': 'hint' } })

        expect(wrapper.get('input').attributes('aria-describedby')).toBe('hint')
    })

    it('id страницы: описание строится от него, смена id не рвёт связь', async () => {
        const wrapper = mountInput({ props: { description: 'Пояснение' }, attrs: { id: 'email' } })
        expect(descriptionOf(wrapper).attributes('id')).toBe('email-description')
        expect(wrapper.get('input').attributes('aria-describedby')).toBe('email-description')

        await wrapper.setProps({ id: 'phone' })
        expect(descriptionOf(wrapper).attributes('id')).toBe('phone-description')
        expect(wrapper.get('input').attributes('aria-describedby')).toBe('phone-description')
    })
})

describe('носители описания', () => {
    it('SelectDateForm: поле даты тоже связано', async () => {
        const wrapper = mount(SelectDateForm, { attachTo: document.body, props: { label: 'Дата', description: 'Пояснение' } })
        await flushPromises()

        expect(wrapper.get('input').attributes('aria-describedby')).toBe(descriptionOf(wrapper).attributes('id'))
    })

    describe('AmountForm', () => {
        const mountAmount = (modelValue, props = {}) => mount(AmountForm, {
            attachTo: document.body,
            props: { label: 'Сумма', description: 'Пояснение', modelValue, ...props },
        })
        // Поля суммы: в панели валюты есть своё поле поиска.
        const amountInputs = (wrapper) => wrapper.findAll('input[inputmode]')
        const described = (wrapper) => amountInputs(wrapper).map((input) => input.attributes('aria-describedby'))

        it('с копейками связаны оба поля суммы, кнопка валюты — нет', () => {
            const wrapper = mountAmount({ amount: 123456, currency: 'USD' })
            const id = descriptionOf(wrapper).attributes('id')

            expect(described(wrapper)).toEqual([id, id])
            expect(trigger(wrapper).attributes('aria-describedby')).toBeUndefined()
        })

        it('без копеек связано одно поле', () => {
            const wrapper = mountAmount({ amount: 1234, currency: 'JPY' })

            expect(described(wrapper)).toEqual([descriptionOf(wrapper).attributes('id')])
        })

        it('заблокированное поле сохраняет связь', () => {
            const wrapper = mountAmount({ amount: 123456, currency: 'USD' }, { currencies: [] })
            const id = descriptionOf(wrapper).attributes('id')

            expect(amountInputs(wrapper)[0].attributes('disabled')).toBeDefined()
            expect(described(wrapper)).toContain(id)
        })
    })

    it.each([
        { name: 'SelectSingleForm', component: SelectSingleForm, prop: 'items', filled: items, props: { label: 'Вендор' } },
        { name: 'SelectMultipleForm', component: SelectMultipleForm, prop: 'items', filled: items, props: { label: 'Вендор' } },
        { name: 'SelectCurrencyForm', component: SelectCurrencyForm, prop: 'currencies', filled: ['USD'], props: { label: 'Валюта' } },
    ])('$name: без пунктов описание остаётся, связь появляется вместе с кнопкой', async ({ component, prop, filled, props }) => {
        const wrapper = mount(component, {
            attachTo: document.body,
            props: { ...props, description: 'Пояснение', [prop]: [] },
        })
        expect(descriptionOf(wrapper).exists()).toBe(true)
        expect(trigger(wrapper).exists()).toBe(false)

        await wrapper.setProps({ [prop]: filled })
        expect(trigger(wrapper).attributes('aria-describedby')).toBe(descriptionOf(wrapper).attributes('id'))

        await wrapper.setProps({ [prop]: [] })
        expect(descriptionOf(wrapper).exists()).toBe(true)
        expect(trigger(wrapper).exists()).toBe(false)
    })

    it.each([
        { name: 'SelectSingleCards', component: SelectSingleCards },
        { name: 'SelectMultipleList', component: SelectMultipleList },
    ])('$name без пунктов: описание есть, группы нет', ({ component }) => {
        const wrapper = mount(component, {
            attachTo: document.body,
            props: { label: 'Бренд', items: [], description: 'Пояснение' },
        })

        expect(descriptionOf(wrapper).text()).toBe('Пояснение')
        expect(wrapper.find('[role="group"], [role="radiogroup"]').exists()).toBe(false)
    })
})

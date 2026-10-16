// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h, nextTick, ref } from 'vue'
import FormInput from '../src/components/FormInput.vue'
import Dot from '../src/components/Dot.vue'

enableAutoUnmount(afterEach)

const mountInput = (props = {}, attrs = {}) => {
    const errors = []
    const warnings = []
    const wrapper = mount(FormInput, {
        props: { label: 'Имя', ...props },
        attrs,
        global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } },
    })

    return { wrapper, errors, warnings }
}

describe('FormInput', () => {
    it('подпись — текст label, for подписи — id поля', () => {
        const { wrapper, errors, warnings } = mountInput()
        const label = wrapper.find('label')
        const input = wrapper.find('input')

        expect(label.text()).toBe('Имя')
        expect(input.attributes('id')).toBeTruthy()
        expect(label.attributes('for')).toBe(input.attributes('id'))
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('у двух полей разные id', () => {
        const errors = []
        const warnings = []
        const wrapper = mount(
            { render: () => [h(FormInput, { label: 'Имя' }), h(FormInput, { label: 'Email' })] },
            { global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } } },
        )
        const inputs = wrapper.findAll('input')
        const labels = wrapper.findAll('label')

        expect(inputs[0].attributes('id')).not.toBe(inputs[1].attributes('id'))
        expect(labels[0].attributes('for')).toBe(inputs[0].attributes('id'))
        expect(labels[1].attributes('for')).toBe(inputs[1].attributes('id'))
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('id от формы — в поле и в for', () => {
        const { wrapper, errors, warnings } = mountInput({}, { id: 'user-email' })

        expect(wrapper.find('input').attributes('id')).toBe('user-email')
        expect(wrapper.find('label').attributes('for')).toBe('user-email')
        expect(wrapper.attributes('id')).toBeUndefined()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('поле показывает modelValue', () => {
        const { wrapper, errors, warnings } = mountInput({ modelValue: 'Анна' })

        expect(wrapper.find('input').element.value).toBe('Анна')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it.each([null, undefined])('modelValue %s — пустое поле', (modelValue) => {
        const { wrapper, errors, warnings } = mountInput({ modelValue })

        expect(wrapper.find('input').element.value).toBe('')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('ввод — update:modelValue со строкой как есть', async () => {
        const { wrapper, errors, warnings } = mountInput()

        await wrapper.find('input').setValue('  Анна  ')

        expect(wrapper.emitted('update:modelValue')).toEqual([['  Анна  ']])
        expect(wrapper.emitted('changed')).toBeUndefined()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('новое modelValue от родителя — в поле, без событий', async () => {
        const { wrapper, errors, warnings } = mountInput({ modelValue: 'Анна' })

        await wrapper.setProps({ modelValue: 'Пётр' })
        expect(wrapper.find('input').element.value).toBe('Пётр')

        await wrapper.setProps({ modelValue: null })
        expect(wrapper.find('input').element.value).toBe('')

        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('composition — событие только по compositionend', async () => {
        const errors = []
        const warnings = []
        const name = ref('')
        const updates = []
        const wrapper = mount(
            {
                render: () => h(FormInput, {
                    label: 'Имя',
                    modelValue: name.value,
                    'onUpdate:modelValue': (value) => {
                        updates.push(value)
                        name.value = value
                    },
                }),
            },
            { global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } } },
        )
        const input = wrapper.find('input')

        input.element.value = 'при'
        await input.trigger('compositionstart')
        await input.trigger('input')
        expect(updates).toEqual([])

        input.element.value = 'привет'
        await input.trigger('compositionend')
        expect(updates).toEqual(['привет'])

        await nextTick()
        expect(input.element.value).toBe('привет')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('type по умолчанию text', () => {
        const { wrapper, errors, warnings } = mountInput()

        expect(wrapper.find('input').attributes('type')).toBe('text')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it.each(['text', 'email', 'password', 'tel', 'url', 'search'])('type %s — в атрибуте', (type) => {
        const { wrapper, errors, warnings } = mountInput({ type })

        expect(wrapper.find('input').attributes('type')).toBe(type)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it.each(['number', 'checkbox', 'date'])('type %s вне списка — предупреждение и type="text"', (type) => {
        const { wrapper, errors, warnings } = mountInput({ type })

        expect(warnings.some((message) => message.includes('Invalid prop: custom validator check failed for prop "type"'))).toBe(true)
        expect(wrapper.find('input').attributes('type')).toBe('text')
        expect(errors).toEqual([])
    })

    it('isRequired — точка', async () => {
        const { wrapper, errors, warnings } = mountInput()
        const input = () => wrapper.find('input')
        const noRequiredAttrs = () => {
            expect(input().attributes('required')).toBeUndefined()
            expect(input().attributes('aria-required')).toBeUndefined()
            expect(input().attributes('aria-invalid')).toBeUndefined()
        }
        const dot = () => wrapper.findComponent(Dot)

        expect(dot().props('color')).toBe('red')
        expect(dot().element.style.display).toBe('none')
        noRequiredAttrs()

        await wrapper.setProps({ isRequired: true })
        expect(dot().element.style.display).toBe('')
        noRequiredAttrs()

        await wrapper.setProps({ isRequired: false })
        expect(dot().element.style.display).toBe('none')
        noRequiredAttrs()

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('атрибуты и слушатели — на поле, class и style — на корне', async () => {
        const onBlur = vi.fn()
        const onKeydown = vi.fn()
        const { wrapper, errors, warnings } = mountInput({}, {
            placeholder: 'Иван',
            autocomplete: 'new-password',
            name: 'password',
            disabled: true,
            required: true,
            class: 'w-1/3',
            style: 'margin-top: 4px',
            onBlur,
            onKeydown,
        })
        const input = wrapper.find('input')

        expect(input.attributes('placeholder')).toBe('Иван')
        expect(input.attributes('autocomplete')).toBe('new-password')
        expect(input.attributes('name')).toBe('password')
        expect(input.attributes('disabled')).toBeDefined()
        expect(input.attributes('required')).toBeDefined()
        for (const name of ['placeholder', 'autocomplete', 'name', 'disabled', 'required']) {
            expect(wrapper.attributes(name)).toBeUndefined()
        }
        expect(wrapper.classes()).toContain('bb-dashboard-ui')
        expect(wrapper.classes()).toContain('w-1/3')
        expect(input.classes()).not.toContain('w-1/3')
        expect(wrapper.element.style.marginTop).toBe('4px')
        expect(input.element.style.marginTop).toBe('')

        // VTU не шлёт trigger() в поле с disabled
        await wrapper.setProps({ disabled: false })
        await input.trigger('blur')
        await input.trigger('keydown', { key: 'Enter' })
        expect(onBlur).toHaveBeenCalledTimes(1)
        expect(onKeydown).toHaveBeenCalledTimes(1)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('атрибуты, изменённые после монтирования', async () => {
        const { wrapper, errors, warnings } = mountInput()

        await wrapper.setProps({ disabled: true, class: 'w-1/2' })
        expect(wrapper.find('input').attributes('disabled')).toBeDefined()
        expect(wrapper.classes()).toContain('w-1/2')

        await wrapper.setProps({ disabled: false })
        expect(wrapper.find('input').attributes('disabled')).toBeUndefined()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('label null — пустая подпись', () => {
        const { wrapper, errors, warnings } = mountInput({ label: null })

        expect(warnings.some((message) => message.includes('Invalid prop: type check failed for prop "label"'))).toBe(true)
        expect(errors).toEqual([])
        expect(wrapper.find('label').text()).toBe('')
    })
})

// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createSSRApp, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import FormTextarea from '../src/components/FormTextarea.vue'
import CharacterCounter from '../src/components/CharacterCounter.vue'
import Dot from '../src/components/Dot.vue'
import { ssrFixtures } from './ssrFixtures.js'

enableAutoUnmount(afterEach)

afterEach(() => {
    document.body.innerHTML = ''
})

const mountTextarea = (props = {}, attrs = {}) => {
    const errors = []
    const warnings = []
    const wrapper = mount(FormTextarea, {
        props: { label: 'Комментарий', ...props },
        attrs,
        global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } },
    })

    return { wrapper, errors, warnings }
}

const counterText = (wrapper) => wrapper.get('[aria-hidden="true"]').text()

describe('FormTextarea', () => {
    it('подпись — текст label, for подписи — id поля', () => {
        const { wrapper, errors, warnings } = mountTextarea()
        const label = wrapper.find('label')
        const textarea = wrapper.find('textarea')

        expect(label.text()).toBe('Комментарий')
        expect(textarea.attributes('id')).toBeTruthy()
        expect(label.attributes('for')).toBe(textarea.attributes('id'))
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('у двух полей разные id', () => {
        const errors = []
        const warnings = []
        const wrapper = mount(
            { render: () => [h(FormTextarea, { label: 'Комментарий' }), h(FormTextarea, { label: 'Заметка' })] },
            { global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } } },
        )
        const textareas = wrapper.findAll('textarea')
        const labels = wrapper.findAll('label')

        expect(textareas[0].attributes('id')).not.toBe(textareas[1].attributes('id'))
        expect(labels[0].attributes('for')).toBe(textareas[0].attributes('id'))
        expect(labels[1].attributes('for')).toBe(textareas[1].attributes('id'))
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('id от формы — в поле и в for', () => {
        const { wrapper, errors, warnings } = mountTextarea({}, { id: 'user-comment' })

        expect(wrapper.find('textarea').attributes('id')).toBe('user-comment')
        expect(wrapper.find('label').attributes('for')).toBe('user-comment')
        expect(wrapper.attributes('id')).toBeUndefined()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('поле показывает modelValue', () => {
        const { wrapper, errors, warnings } = mountTextarea({ modelValue: 'Анна' })

        expect(wrapper.find('textarea').element.value).toBe('Анна')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it.each([null, undefined])('modelValue %s — пустое поле', (modelValue) => {
        const { wrapper, errors, warnings } = mountTextarea({ modelValue })

        expect(wrapper.find('textarea').element.value).toBe('')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('ввод — update:modelValue со строкой как есть', async () => {
        const { wrapper, errors, warnings } = mountTextarea()

        await wrapper.find('textarea').setValue('  Анна  ')

        expect(wrapper.emitted('update:modelValue')).toEqual([['  Анна  ']])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('новое modelValue от родителя — в поле, без событий', async () => {
        const { wrapper, errors, warnings } = mountTextarea({ modelValue: 'Анна' })

        await wrapper.setProps({ modelValue: 'Пётр' })
        expect(wrapper.find('textarea').element.value).toBe('Пётр')

        await wrapper.setProps({ modelValue: null })
        expect(wrapper.find('textarea').element.value).toBe('')

        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('composition — событие только по compositionend', async () => {
        const errors = []
        const warnings = []
        const text = ref('')
        const updates = []
        const wrapper = mount(
            {
                render: () => h(FormTextarea, {
                    label: 'Комментарий',
                    modelValue: text.value,
                    'onUpdate:modelValue': (value) => {
                        updates.push(value)
                        text.value = value
                    },
                }),
            },
            { global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } } },
        )
        const textarea = wrapper.find('textarea')

        textarea.element.value = 'при'
        await textarea.trigger('compositionstart')
        await textarea.trigger('input')
        expect(updates).toEqual([])

        textarea.element.value = 'привет'
        await textarea.trigger('compositionend')
        expect(updates).toEqual(['привет'])

        await nextTick()
        expect(textarea.element.value).toBe('привет')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('composition: счётчик меняется сразу, событие — по compositionend', async () => {
        const errors = []
        const warnings = []
        const text = ref('')
        const updates = []
        const wrapper = mount(
            {
                render: () => h(FormTextarea, {
                    label: 'Комментарий',
                    characterLimit: 10,
                    modelValue: text.value,
                    'onUpdate:modelValue': (value) => {
                        updates.push(value)
                        text.value = value
                    },
                }),
            },
            { global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } } },
        )
        const textarea = wrapper.find('textarea')

        textarea.element.value = 'при'
        await textarea.trigger('compositionstart')
        await textarea.trigger('input')
        expect(updates).toEqual([])
        expect(counterText(wrapper)).toBe('3 / 10')

        textarea.element.value = 'привет'
        await textarea.trigger('compositionend')
        expect(updates).toEqual(['привет'])
        await nextTick()
        expect(counterText(wrapper)).toBe('6 / 10')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('isRequired — точка', async () => {
        const { wrapper, errors, warnings } = mountTextarea()
        const textarea = () => wrapper.find('textarea')
        const noRequiredAttrs = () => {
            expect(textarea().attributes('required')).toBeUndefined()
            expect(textarea().attributes('aria-required')).toBeUndefined()
            expect(textarea().attributes('aria-invalid')).toBeUndefined()
        }
        const dot = () => wrapper.findComponent(Dot)

        expect(dot().props('color')).toBe('red-pale')
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
        const { wrapper, errors, warnings } = mountTextarea({}, {
            placeholder: 'Текст',
            name: 'comment',
            disabled: true,
            required: true,
            class: 'w-1/3',
            style: 'margin-top: 4px',
            onBlur,
            onKeydown,
        })
        const textarea = wrapper.find('textarea')

        expect(textarea.attributes('placeholder')).toBe('Текст')
        expect(textarea.attributes('name')).toBe('comment')
        expect(textarea.attributes('disabled')).toBeDefined()
        expect(textarea.attributes('required')).toBeDefined()
        for (const name of ['placeholder', 'name', 'disabled', 'required']) {
            expect(wrapper.attributes(name)).toBeUndefined()
        }
        expect(wrapper.classes()).toContain('bb-dashboard-ui')
        expect(wrapper.classes()).toContain('w-1/3')
        expect(textarea.classes()).not.toContain('w-1/3')
        expect(wrapper.element.style.marginTop).toBe('4px')
        expect(textarea.element.style.marginTop).toBe('')

        // VTU не шлёт trigger() в поле с disabled
        await wrapper.setProps({ disabled: false })
        await textarea.trigger('blur')
        await textarea.trigger('keydown', { key: 'Enter' })
        expect(onBlur).toHaveBeenCalledTimes(1)
        expect(onKeydown).toHaveBeenCalledTimes(1)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('атрибуты, изменённые после монтирования', async () => {
        const { wrapper, errors, warnings } = mountTextarea()

        await wrapper.setProps({ disabled: true, class: 'w-1/2' })
        expect(wrapper.find('textarea').attributes('disabled')).toBeDefined()
        expect(wrapper.classes()).toContain('w-1/2')

        await wrapper.setProps({ disabled: false })
        expect(wrapper.find('textarea').attributes('disabled')).toBeUndefined()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('label null — пустая подпись', () => {
        const { wrapper, errors, warnings } = mountTextarea({ label: null })

        expect(warnings).toEqual([expect.stringContaining('Invalid prop: type check failed for prop "label"')])
        expect(errors).toEqual([])
        expect(wrapper.find('label').text()).toBe('')
    })

    it('rows по умолчанию 6, переданное — в атрибут', () => {
        const first = mountTextarea()
        const second = mountTextarea({ rows: 10 })

        expect(first.wrapper.find('textarea').attributes('rows')).toBe('6')
        expect(second.wrapper.find('textarea').attributes('rows')).toBe('10')
        for (const { errors, warnings } of [first, second]) {
            expect(errors).toEqual([])
            expect(warnings).toEqual([])
        }
    })

    it.each([[0], [-1], [1.5], ['10']])('rows %j — предупреждение и 6', (rows) => {
        const { wrapper, errors, warnings } = mountTextarea({ rows })

        expect(warnings).toContainEqual(expect.stringContaining('prop "rows"'))
        expect(wrapper.find('textarea').attributes('rows')).toBe('6')
        expect(errors).toEqual([])
    })

    it('rows null — 6 без предупреждения', () => {
        const { wrapper, errors, warnings } = mountTextarea({ rows: null })

        expect(wrapper.find('textarea').attributes('rows')).toBe('6')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('resize только по высоте', () => {
        const { wrapper, errors, warnings } = mountTextarea()

        expect(wrapper.find('textarea').classes()).toContain('bb:resize-y')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it.each([[{}], [{ characterLimit: null }]])('без characterLimit и с null — счётчика и -counter нет', (props) => {
        const { wrapper, errors, warnings } = mountTextarea(props)

        expect(wrapper.findComponent(CharacterCounter).exists()).toBe(false)
        expect(wrapper.html()).not.toContain('-counter')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it.each([[0], [-5], [2.5], ['279']])('characterLimit %j — предупреждение, счётчика нет', (characterLimit) => {
        const { wrapper, errors, warnings } = mountTextarea({ characterLimit })

        expect(warnings).toContainEqual(expect.stringContaining('prop "characterLimit"'))
        expect(wrapper.findComponent(CharacterCounter).exists()).toBe(false)
        expect(wrapper.find('textarea').attributes('aria-describedby')).toBeUndefined()
        expect(errors).toEqual([])
    })

    it('characterLimit не ставит maxlength; maxlength страницы — на поле', () => {
        const first = mountTextarea({ characterLimit: 10 })
        const second = mountTextarea({ characterLimit: 10 }, { maxlength: 20 })

        expect(first.wrapper.find('textarea').attributes('maxlength')).toBeUndefined()
        expect(second.wrapper.find('textarea').attributes('maxlength')).toBe('20')
        for (const { errors, warnings } of [first, second]) {
            expect(errors).toEqual([])
            expect(warnings).toEqual([])
        }
    })

    it('счётчик в строке заголовка: label и счётчик — в одном ряду', () => {
        const { wrapper, errors, warnings } = mountTextarea({ characterLimit: 10 })
        const label = wrapper.get('label').element
        const counter = wrapper.findComponent(CharacterCounter).element
        const row = label.parentElement.parentElement

        expect(row.contains(counter)).toBe(true)
        expect(row.contains(wrapper.get('textarea').element)).toBe(false)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('aria-describedby: страница, подпись, счётчик', async () => {
        const { wrapper, errors, warnings } = mountTextarea(
            { characterLimit: 10, description: 'Подпись' },
            { id: 'note', 'aria-describedby': 'page-hint' },
        )
        const describedBy = () => wrapper.get('textarea').attributes('aria-describedby')

        expect(describedBy()).toBe('page-hint note-description note-counter')
        expect(wrapper.get('#note-counter').exists()).toBe(true)

        await wrapper.setProps({ description: null })
        expect(describedBy()).toBe('page-hint note-counter')

        await wrapper.setProps({ description: 'Подпись', characterLimit: null })
        expect(describedBy()).toBe('page-hint note-description')

        await wrapper.setProps({ 'aria-describedby': undefined })
        expect(describedBy()).toBe('note-description')

        await wrapper.setProps({ description: null })
        expect(describedBy()).toBeUndefined()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('lang поля доходит до счётчика', () => {
        const { wrapper, errors, warnings } = mountTextarea({ characterLimit: 10, lang: 'en' })

        expect(wrapper.text()).toContain('Characters: 0 of 10')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('без v-model счётчик идёт за полем и ввод не стирается', async () => {
        const { wrapper, errors, warnings } = mountTextarea({ characterLimit: 10 })
        const textarea = wrapper.get('textarea')

        textarea.element.value = 'абв'
        await textarea.trigger('input')
        await nextTick()

        expect(textarea.element.value).toBe('абв')
        expect(counterText(wrapper)).toBe('3 / 10')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('родитель молчит на update:modelValue — текст и счётчик остаются', async () => {
        const { wrapper, errors, warnings } = mountTextarea({ modelValue: 'а', characterLimit: 10 })
        const textarea = wrapper.get('textarea')

        textarea.element.value = 'аб'
        await textarea.trigger('input')
        await nextTick()

        expect(textarea.element.value).toBe('аб')
        expect(counterText(wrapper)).toBe('2 / 10')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it.each([['а\r\nб'], ['а\rб']])('modelValue %j — счётчик 3, поле «а\\nб», событий нет', async (modelValue) => {
        const { wrapper, errors, warnings } = mountTextarea({ modelValue, characterLimit: 10 })

        expect(wrapper.get('textarea').element.value).toBe('а\nб')
        expect(counterText(wrapper)).toBe('3 / 10')
        await nextTick()
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('смена modelValue родителем на значение с \\r\\n — 3, событий нет', async () => {
        const { wrapper, errors, warnings } = mountTextarea({ modelValue: '', characterLimit: 10 })

        await wrapper.setProps({ modelValue: 'а\r\nб' })

        expect(wrapper.get('textarea').element.value).toBe('а\nб')
        expect(counterText(wrapper)).toBe('3 / 10')
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it.each([[42], [{}], [[]]])('modelValue %j при монтировании и setProps — предупреждение, без ошибок, поле пустое, «0 / 10»', async (modelValue) => {
        const mounted = mountTextarea({ modelValue, characterLimit: 10 })

        expect(mounted.warnings).not.toEqual([])
        expect(mounted.errors).toEqual([])
        expect(mounted.wrapper.get('textarea').element.value).toBe('')
        expect(counterText(mounted.wrapper)).toBe('0 / 10')

        const updated = mountTextarea({ modelValue: 'а', characterLimit: 10 })
        await updated.wrapper.setProps({ modelValue })

        expect(updated.warnings).not.toEqual([])
        expect(updated.errors).toEqual([])
        expect(updated.wrapper.get('textarea').element.value).toBe('')
        expect(counterText(updated.wrapper)).toBe('0 / 10')
    })

    it('SSR: серверный HTML и гидратация дают 13 из 10 и поле с \\n', async () => {
        const render = () => h(FormTextarea, ssrFixtures.FormTextarea.props)
        const serverWarnings = []
        const server = createSSRApp({ render })
        server.config.warnHandler = (message) => serverWarnings.push(message)
        const html = await renderToString(server)

        const container = document.createElement('div')
        container.innerHTML = html
        document.body.appendChild(container)
        expect(container.textContent).toContain('13 / 10')
        expect(container.textContent).toContain('Символов: 13 из 10')
        expect(serverWarnings).toEqual([])

        const warnings = []
        const errors = []
        const client = createSSRApp({ render })
        client.config.warnHandler = (message) => warnings.push(message)
        client.config.errorHandler = (error) => errors.push(error)
        client.mount(container)
        await nextTick()

        expect(container.querySelector('[aria-hidden="true"]').textContent).toBe('13 / 10')
        expect(container.textContent).toContain('Символов: 13 из 10')
        expect(container.querySelector('textarea').value).toBe('Первая\nвторая')
        expect(warnings).toEqual([])
        expect(errors).toEqual([])
        client.unmount()
    })
})

// fieldClass — классы приложения только для самого поля; подпись, описание и счётчик остаются стилем пакета
describe('FormTextarea fieldClass', () => {
    const fieldProps = { description: 'Подсказка', characterLimit: 10 }
    const nodesWithoutAppClasses = (wrapper) => [
        wrapper.element,
        wrapper.get('label').element,
        wrapper.get('[id$="-description"]').element,
        wrapper.get('[aria-hidden="true"]').element,
    ]

    it.each([
        ['font-mono'],
        [['font-mono', 'text-xs']],
        [{ 'font-mono': true, 'text-xs': false }],
    ])('fieldClass %j — только на поле', (fieldClass) => {
        const { wrapper, errors, warnings } = mountTextarea({ ...fieldProps, fieldClass })
        const field = wrapper.get('textarea')

        expect(field.classes()).toContain('font-mono')
        expect(field.classes()).toContain('bb:field-frame')
        expect(field.classes('text-xs')).toBe(Array.isArray(fieldClass))

        for (const node of nodesWithoutAppClasses(wrapper)) {
            expect(node.classList.contains('font-mono')).toBe(false)
        }

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it.each([[null], [''], [[]], [{}]])('fieldClass %j — на поле только классы пакета', (fieldClass) => {
        const { wrapper, errors, warnings } = mountTextarea({ ...fieldProps, fieldClass })
        const withoutProp = mountTextarea(fieldProps).wrapper.get('textarea')

        expect(wrapper.get('textarea').classes()).toEqual(withoutProp.classes())
        expect(wrapper.get('textarea').classes()).toContain('bb:field-frame')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('смена fieldClass после монтирования', async () => {
        const { wrapper, errors, warnings } = mountTextarea({ ...fieldProps, fieldClass: 'font-mono' })

        await wrapper.setProps({ fieldClass: 'text-xs' })

        expect(wrapper.get('textarea').classes()).toContain('text-xs')
        expect(wrapper.get('textarea').classes()).not.toContain('font-mono')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('class со страницы — на корне, не на поле', () => {
        const { wrapper, errors, warnings } = mountTextarea({ ...fieldProps, fieldClass: 'font-mono' }, { class: 'mt-4' })

        expect(wrapper.classes()).toContain('mt-4')
        expect(wrapper.classes()).not.toContain('font-mono')
        expect(wrapper.get('textarea').classes()).not.toContain('mt-4')
        expect(wrapper.get('textarea').classes()).toContain('font-mono')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it.each([[5], [true]])('fieldClass %j — предупреждение о типе, без ошибок', (fieldClass) => {
        const { wrapper, errors, warnings } = mountTextarea({ ...fieldProps, fieldClass })

        expect(warnings).toEqual([expect.stringContaining('Invalid prop: type check failed for prop "fieldClass"')])
        expect(errors).toEqual([])
        expect(wrapper.get('textarea').classes()).toContain('bb:field-frame')
        expect(wrapper.get('textarea').classes().filter((name) => !name.startsWith('bb:'))).toEqual([])
    })
})

// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import ActionButton from '../src/components/ActionButton.vue'
import { COLOR_NAMES, colorClass } from '../src/colors.js'
import { ACTION_ICONS } from '../src/actionIcons.js'
import { dashboardUi } from '../src/plugin.js'

enableAutoUnmount(afterEach)

// Вид кнопки из Global Constraints: размеры, рамка, текст и фокус.
const BUTTON_LOOK = ['bb:px-4', 'bb:py-2', 'bb:border', 'bb:rounded-md', 'bb:shadow-xs', 'bb:text-sm', 'bb:font-medium', 'bb:gap-2', 'bb:focus:focus-ring']

// Вид без цвета: белая кнопка с серой рамкой и наведением.
const PLAIN_LOOK = ['bb:bg-white', 'bb:border-gray-300', 'bb:text-gray-700', 'bb:hover:bg-gray-50']

const navigation = []
const inApp = { plugins: [[dashboardUi, { navigate: (href) => navigation.push(href) }]] }

let warn

beforeEach(() => {
    navigation.length = 0
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
    warn.mockRestore()
})

function mountButton(props = {}, options = {}) {
    return mount(ActionButton, { props: { label: 'Создать', ...props }, global: inApp, ...options })
}

function tokens(part, name) {
    return colorClass(name, part).split(' ')
}

describe('ActionButton: вид', () => {
    it('без цвета — белая кнопка type="button"', () => {
        const wrapper = mountButton()
        const label = wrapper.get('span')

        expect(wrapper.element.tagName).toBe('BUTTON')
        expect(wrapper.attributes('type')).toBe('button')
        expect(wrapper.classes()).toEqual(expect.arrayContaining([...BUTTON_LOOK, ...PLAIN_LOOK, 'bb:cursor-pointer']))
        expect(label.classes()).toEqual(expect.arrayContaining(['bb:pointer-events-none', 'bb:cursor-default']))
        expect(label.text()).toBe('Создать')
        expect(warn).not.toHaveBeenCalled()
    })

    it.each(COLOR_NAMES)('%s — наборы button и buttonHover', (color) => {
        const wrapper = mountButton({ color })

        expect(wrapper.classes()).toEqual(expect.arrayContaining([...tokens('button', color), ...tokens('buttonHover', color)]))
        expect(wrapper.classes()).not.toContain('bb:bg-white')
        expect(warn).not.toHaveBeenCalled()
    })

    it.each(['green', 'blue', 'constructor'])('%s — без цвета и одно предупреждение', (color) => {
        const wrapper = mountButton({ color })

        expect(wrapper.classes()).toEqual(expect.arrayContaining(PLAIN_LOOK))
        expect(warn).toHaveBeenCalledTimes(1)
    })

    it.each([null, ''])('%j — без цвета и без предупреждений', (color) => {
        const wrapper = mountButton({ color })

        expect(wrapper.classes()).toEqual(expect.arrayContaining(PLAIN_LOOK))
        expect(warn).not.toHaveBeenCalled()
    })
})

describe('ActionButton: иконка', () => {
    it.each(Object.keys(ACTION_ICONS))('%s — иконка слева от подписи', (icon) => {
        const wrapper = mountButton({ icon })
        const [first, second] = wrapper.element.children

        expect(first.tagName.toLowerCase()).toBe('svg')
        expect(first.getAttribute('aria-hidden')).toBe('true')
        expect(second.tagName).toBe('SPAN')
        expect(second.textContent).toBe('Создать')
        expect(warn).not.toHaveBeenCalled()
    })

    it('pin — без иконки и одно предупреждение', () => {
        const wrapper = mountButton({ icon: 'pin' })

        expect(wrapper.find('svg').exists()).toBe(false)
        expect(warn).toHaveBeenCalledTimes(1)
    })

    it.each([null, ''])('%j — без иконки и без предупреждений', (icon) => {
        const wrapper = mountButton({ icon })

        expect(wrapper.find('svg').exists()).toBe(false)
        expect(warn).not.toHaveBeenCalled()
    })
})

describe('ActionButton: клик', () => {
    it('click передаёт MouseEvent', async () => {
        const wrapper = mountButton()

        await wrapper.trigger('click')

        expect(wrapper.emitted('click')).toHaveLength(1)
        expect(wrapper.emitted('click')[0][0]).toBeInstanceOf(MouseEvent)
        expect(warn).not.toHaveBeenCalled()
    })

    it('@click.prevent работает', async () => {
        const errors = []
        const onClick = vi.fn()
        const Parent = {
            components: { ActionButton },
            methods: { onClick },
            template: '<action-button label="Создать" @click.prevent="onClick"/>',
        }
        const wrapper = mount(Parent, { global: { config: { errorHandler: (error) => errors.push(error) } } })

        await wrapper.get('button').trigger('click')

        expect(onClick).toHaveBeenCalledTimes(1)
        expect(errors).toEqual([])
        expect(warn).not.toHaveBeenCalled()
    })
})

describe('ActionButton: type="submit" в форме', () => {
    function mountForm(template) {
        const onClick = vi.fn()
        const onSubmit = vi.fn()
        const Parent = {
            components: { ActionButton },
            methods: { onClick, onSubmit },
            template,
        }
        // Без подключения к документу happy-dom не отправляет форму вовсе.
        const wrapper = mount(Parent, { attachTo: document.body })

        return { wrapper, onClick, onSubmit }
    }

    it('у корня type="submit"', () => {
        const wrapper = mountButton({ type: 'submit' })

        expect(wrapper.attributes('type')).toBe('submit')
        expect(warn).not.toHaveBeenCalled()
    })

    it('клик отправляет форму', async () => {
        const { wrapper, onClick, onSubmit } = mountForm('<form @submit.prevent="onSubmit"><action-button label="Войти" type="submit" @click="onClick"/></form>')

        await wrapper.get('button').trigger('click')

        expect(onClick).toHaveBeenCalledTimes(1)
        expect(onSubmit).toHaveBeenCalledTimes(1)
        expect(warn).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('@click.prevent отменяет отправку формы', async () => {
        const { wrapper, onClick, onSubmit } = mountForm('<form @submit.prevent="onSubmit"><action-button label="Войти" type="submit" @click.prevent="onClick"/></form>')

        await wrapper.get('button').trigger('click')

        expect(onClick).toHaveBeenCalledTimes(1)
        expect(onSubmit).not.toHaveBeenCalled()
        expect(warn).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('type="reset" — одно предупреждение, type="button"', () => {
        const wrapper = mountButton({ type: 'reset' })

        expect(wrapper.attributes('type')).toBe('button')
        expect(warn).toHaveBeenCalledTimes(1)
    })
})

describe('ActionButton: ссылка', () => {
    it('href — ссылка: клик уходит в navigate, события click нет', async () => {
        const wrapper = mountButton({ href: '/users/create' })

        expect(wrapper.element.tagName).toBe('A')
        expect(wrapper.attributes('href')).toBe('/users/create')
        expect(wrapper.attributes()).not.toHaveProperty('type')
        expect(wrapper.attributes()).not.toHaveProperty('disabled')

        await wrapper.trigger('click')

        expect(navigation).toEqual(['/users/create'])
        expect(wrapper.emitted('click')).toBeUndefined()
        expect(warn).not.toHaveBeenCalled()
    })

    it.each([null, ''])('href %j — кнопка', (href) => {
        const wrapper = mountButton({ href })

        expect(wrapper.element.tagName).toBe('BUTTON')
        expect(wrapper.attributes()).not.toHaveProperty('href')
        expect(warn).not.toHaveBeenCalled()
    })
})

describe('ActionButton: выключенная', () => {
    it('погашена, без наведения и без click', async () => {
        const wrapper = mountButton({ isDisabled: true })

        expect(wrapper.attributes()).toHaveProperty('disabled')
        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb:opacity-50', 'bb:cursor-not-allowed']))
        expect(wrapper.classes()).not.toContain('bb:cursor-pointer')
        expect(wrapper.classes()).not.toContain('bb:hover:bg-gray-50')

        await wrapper.trigger('click')

        expect(wrapper.emitted('click')).toBeUndefined()
        expect(warn).not.toHaveBeenCalled()
    })

    it('с цветом — без наведения цвета', () => {
        const wrapper = mountButton({ isDisabled: true, color: 'green-solid' })

        expect(wrapper.classes()).toEqual(expect.arrayContaining(tokens('button', 'green-solid')))
        expect(wrapper.classes()).not.toContain('bb:hover:bg-green-700')
        expect(warn).not.toHaveBeenCalled()
    })

    it('выключенная ссылка — выключенная кнопка без href', async () => {
        const wrapper = mountButton({ href: '/users/create', isDisabled: true })

        expect(wrapper.element.tagName).toBe('BUTTON')
        expect(wrapper.attributes()).toHaveProperty('disabled')
        expect(wrapper.attributes()).not.toHaveProperty('href')

        await wrapper.trigger('click')

        expect(navigation).toEqual([])
        expect(wrapper.emitted('click')).toBeUndefined()
        expect(warn).not.toHaveBeenCalled()
    })

    it('isDisabled на лету', async () => {
        const wrapper = mountButton()

        await wrapper.setProps({ isDisabled: true })

        expect(wrapper.attributes()).toHaveProperty('disabled')
        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb:opacity-50', 'bb:cursor-not-allowed']))
        expect(wrapper.classes()).not.toContain('bb:hover:bg-gray-50')

        await wrapper.setProps({ isDisabled: false })

        expect(wrapper.attributes()).not.toHaveProperty('disabled')
        expect(wrapper.classes()).not.toContain('bb:opacity-50')
        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb:cursor-pointer', 'bb:hover:bg-gray-50']))

        await wrapper.trigger('click')

        expect(wrapper.emitted('click')).toHaveLength(1)
        expect(warn).not.toHaveBeenCalled()
    })
})

describe('ActionButton: атрибуты на корень', () => {
    it.each([
        ['кнопка', {}, 'BUTTON'],
        ['ссылка', { href: '/users/create' }, 'A'],
    ])('%s: class и data-dialog-focus на корневом элементе', (_name, props, tagName) => {
        const wrapper = mountButton(props, { attrs: { class: 'bb:w-full', 'data-dialog-focus': '' } })

        expect(wrapper.element.tagName).toBe(tagName)
        expect(wrapper.classes()).toContain('bb:w-full')
        expect(wrapper.attributes()).toHaveProperty('data-dialog-focus')
        expect(warn).not.toHaveBeenCalled()
    })
})

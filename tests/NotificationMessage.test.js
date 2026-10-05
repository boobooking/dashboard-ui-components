// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import NotificationMessage from '../src/components/NotificationMessage.vue'
import { dashboardUi } from '../src/plugin.js'

enableAutoUnmount(afterEach)
afterEach(() => {
    document.body.innerHTML = ''
})

const ICONS = {
    confirmation: 'path[d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"]',
    warning: 'path[d^="M8.257 3.099"]',
    dangerous: 'path[d^="M12 9v2m0 4h.01"]',
}

// Предупреждения и ошибки Vue собираются и проверяются в каждом тесте, как в
// tests/Pagination.test.js.
function withHandlers(plugin) {
    const errors = []
    const warnings = []
    const global = {
        plugins: plugin ? [[dashboardUi, plugin]] : [],
        config: {
            errorHandler: (error) => errors.push(error),
            warnHandler: (message) => warnings.push(message),
        },
    }

    return { errors, warnings, global }
}

function mountMessage({ props = {}, plugin } = {}) {
    const { errors, warnings, global } = withHandlers(plugin)
    const wrapper = mount(NotificationMessage, { props, attachTo: document.body, global })

    return { wrapper, errors, warnings }
}

// Панель — единственный элемент внутри корня; пока текста нет, её нет.
const panelOf = (root) => root.firstElementChild

describe('NotificationMessage: типы', () => {
    const cases = [
        { type: 'confirmation', role: 'status', background: 'bb:bg-gray-50' },
        { type: 'warning', role: 'status', background: 'bb:bg-yellow-50' },
        { type: 'dangerous', role: 'alert', background: 'bb:bg-red-50' },
    ]

    for (const testCase of cases) {
        it(testCase.type, () => {
            const { wrapper, errors, warnings } = mountMessage({
                props: { modelValue: 'Письмо отправлено на адрес user@example.com', type: testCase.type, notificationHeading: 'Заголовок уведомления' },
            })
            const panel = panelOf(wrapper.element)

            expect(wrapper.attributes('role')).toBe(testCase.role)
            expect(wrapper.classes()).toContain('bb-dashboard-ui')
            expect(wrapper.classes()).toContain('bb:pointer-events-none')
            expect(panel).not.toBeNull()
            expect(panel.classList.contains(testCase.background)).toBe(true)
            expect(panel.classList.contains('bb:pointer-events-auto')).toBe(true)
            expect(wrapper.get('button').classes()).toContain(testCase.background)
            for (const [type, selector] of Object.entries(ICONS)) {
                expect(panel.querySelector(selector) !== null).toBe(type === testCase.type)
            }
            expect(wrapper.text()).toContain('Письмо отправлено на адрес user@example.com')
            expect(wrapper.text()).toContain('Заголовок уведомления')
            expect(panel.querySelector('p').textContent.trim()).toBe('Заголовок уведомления')
            expect(wrapper.get('button').attributes('type')).toBe('button')
            expect(panel.querySelectorAll('svg')).toHaveLength(2)
            for (const svg of panel.querySelectorAll('svg')) {
                expect(svg.getAttribute('aria-hidden')).toBe('true')
            }
            expect(errors).toEqual([])
            expect(warnings).toEqual([])
        })
    }
})

describe('NotificationMessage: пустое значение', () => {
    const cases = [
        { name: 'пустая строка', props: { modelValue: '' } },
        { name: 'null', props: { modelValue: null } },
        { name: 'значение не передано', props: {} },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const { wrapper, errors, warnings } = mountMessage({ props: testCase.props })

            expect(wrapper.attributes('role')).toBe('status')
            expect(panelOf(wrapper.element)).toBeNull()
            expect(wrapper.find('button').exists()).toBe(false)
            expect(errors).toEqual([])
            expect(warnings).toEqual([])
        })
    }
})

describe('NotificationMessage: живая область', () => {
    it('панель появляется внутри того же корня', async () => {
        const { wrapper, errors, warnings } = mountMessage({ props: { modelValue: '', type: 'dangerous' } })
        const root = wrapper.element

        await wrapper.setProps({ modelValue: 'Не удалось отправить письмо' })

        expect(wrapper.element).toBe(root)
        expect(panelOf(root)).not.toBeNull()
        expect(panelOf(root).parentElement).toBe(root)
        expect(root.getAttribute('role')).toBe('alert')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

describe('NotificationMessage: закрытие', () => {
    it('крестик — одно событие update:modelValue с пустой строкой', async () => {
        const { wrapper, errors, warnings } = mountMessage({ props: { modelValue: 'Текст', type: 'confirmation' } })

        await wrapper.get('button').trigger('click')

        expect(wrapper.emitted('update:modelValue')).toEqual([['']])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('полный цикл v-model с родителем', async () => {
        const Parent = {
            data: () => ({ message: '' }),
            render() {
                return h(NotificationMessage, {
                    modelValue: this.message,
                    'onUpdate:modelValue': (value) => { this.message = value },
                    type: 'confirmation',
                    notificationHeading: 'Письмо отправлено',
                })
            },
        }
        const { errors, warnings, global } = withHandlers()
        const wrapper = mount(Parent, { attachTo: document.body, global })

        expect(panelOf(wrapper.element)).toBeNull()

        wrapper.vm.message = 'Письмо отправлено на адрес user@example.com'
        await nextTick()
        expect(panelOf(wrapper.element)).not.toBeNull()

        await wrapper.get('button').trigger('click')
        expect(wrapper.vm.message).toBe('')
        expect(panelOf(wrapper.element)).toBeNull()

        wrapper.vm.message = 'Письмо отправлено на адрес user@example.com'
        await nextTick()
        expect(panelOf(wrapper.element)).not.toBeNull()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('два уведомления на странице: закрытие одного не трогает другое', async () => {
        const Parent = {
            data: () => ({ message: 'Письмо отправлено', errorMessage: 'Ошибка отправки' }),
            render() {
                return h('div', [
                    h(NotificationMessage, {
                        modelValue: this.message,
                        'onUpdate:modelValue': (value) => { this.message = value },
                        type: 'confirmation',
                    }),
                    h(NotificationMessage, {
                        modelValue: this.errorMessage,
                        'onUpdate:modelValue': (value) => { this.errorMessage = value },
                        type: 'dangerous',
                    }),
                ])
            },
        }
        const { errors, warnings, global } = withHandlers()
        const wrapper = mount(Parent, { attachTo: document.body, global })
        const [status, alert] = [wrapper.get('[role="status"]').element, wrapper.get('[role="alert"]').element]

        await wrapper.get('[role="status"] button').trigger('click')

        expect(wrapper.vm.message).toBe('')
        expect(wrapper.vm.errorMessage).toBe('Ошибка отправки')
        expect(panelOf(status)).toBeNull()
        expect(panelOf(alert)).not.toBeNull()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

describe('NotificationMessage: недопустимый type', () => {
    it('предупреждение валидатора, без ошибок, без иконки и фона', () => {
        const { wrapper, errors, warnings } = mountMessage({ props: { modelValue: 'Текст', type: 'info' } })
        const panel = panelOf(wrapper.element)

        expect(errors).toEqual([])
        expect(warnings.length).toBeGreaterThan(0)
        expect(warnings.every((warning) => warning.includes('Invalid prop'))).toBe(true)
        expect(panel).not.toBeNull()
        expect(panel.querySelector('svg path[d^="M9 12.75"], svg path[d^="M8.257"], svg path[d^="M12 9v2"]')).toBeNull()
        for (const background of ['bb:bg-gray-50', 'bb:bg-yellow-50', 'bb:bg-red-50']) {
            expect(panel.classList.contains(background)).toBe(false)
        }
    })
})

describe('NotificationMessage: подпись крестика', () => {
    const cases = [
        { name: 'без плагина — «Закрыть»', plugin: undefined, props: {}, expected: 'Закрыть', warns: false },
        { name: 'плагин en — «Close»', plugin: { lang: 'en' }, props: {}, expected: 'Close', warns: false },
        { name: 'проп lang ru главнее плагина en', plugin: { lang: 'en' }, props: { lang: 'ru' }, expected: 'Закрыть', warns: false },
        { name: 'недопустимый lang — язык плагина', plugin: { lang: 'en' }, props: { lang: 'de' }, expected: 'Close', warns: true },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const { wrapper, errors, warnings } = mountMessage({
                props: { modelValue: 'Текст', type: 'warning', ...testCase.props },
                plugin: testCase.plugin,
            })

            expect(wrapper.get('button').text()).toBe(testCase.expected)
            expect(errors).toEqual([])
            if (testCase.warns) {
                expect(warnings.length).toBeGreaterThan(0)
                expect(warnings.every((warning) => warning.includes('Invalid prop'))).toBe(true)
            } else {
                expect(warnings).toEqual([])
            }
        })
    }
})

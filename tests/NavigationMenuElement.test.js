// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import NavigationMenuElement from '../src/components/NavigationMenuElement.vue'
import { dashboardUi } from '../src/plugin.js'

enableAutoUnmount(afterEach)
// Как в tests/Pagination.test.js: монтирование в документ, чтобы клик всплывал до window.
afterEach(() => {
    document.body.innerHTML = ''
})

const URL = 'https://example.test/dashboard/services'

// Как в tests/Pagination.test.js: слушатель на window записывает, отменил ли
// компонент переход, и отменяет его сам, чтобы happy-dom не уходил по адресу.
function click(element, init = {}) {
    let prevented = null
    const record = (event) => {
        prevented = event.defaultPrevented
        event.preventDefault()
    }
    window.addEventListener('click', record)
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }))
    window.removeEventListener('click', record)

    return prevented
}

const mountItem = (plugin, props = {}) => {
    const errors = []
    const warnings = []
    const wrapper = mount(NavigationMenuElement, {
        props: { url: URL, name: 'Анкеты', isActive: false, ...props },
        attachTo: document.body,
        global: {
            plugins: plugin ? [[dashboardUi, plugin]] : [],
            config: {
                errorHandler: (error) => errors.push(error),
                warnHandler: (message) => warnings.push(message),
            },
        },
    })

    return { wrapper, errors, warnings }
}

describe('NavigationMenuElement', () => {
    it('рисует ссылку с адресом и подписью', () => {
        const { wrapper, errors, warnings } = mountItem(null)

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        const link = wrapper.get('a')
        expect(link.attributes('href')).toBe(URL)
        expect(link.text()).toBe('Анкеты')
    })

    it('обычный клик уходит в navigate с адресом и отменяет переход браузера', () => {
        const visited = []
        const { wrapper, errors, warnings } = mountItem({ navigate: (href) => visited.push(href) })

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(click(wrapper.get('a').element)).toBe(true)
        expect(visited).toEqual([URL])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('клик средней кнопкой не перехватывается', () => {
        const visited = []
        const { wrapper, errors, warnings } = mountItem({ navigate: (href) => visited.push(href) })

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(click(wrapper.get('a').element, { button: 1 })).toBe(false)
        expect(visited).toEqual([])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('без плагина браузер идёт по ссылке сам', () => {
        const { wrapper, errors, warnings } = mountItem(null)

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(click(wrapper.get('a').element)).toBe(false)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

const activeCases = [
    {
        name: 'isActive true',
        isActive: true,
        shouldHave: ['bb:border-indigo-400', 'bb:text-gray-600', 'bb:focus:border-indigo-700'],
        shouldNotHave: ['bb:border-transparent', 'bb:text-gray-500'],
    },
    {
        name: 'isActive false',
        isActive: false,
        shouldHave: ['bb:border-transparent', 'bb:text-gray-500'],
        shouldNotHave: ['bb:border-indigo-400', 'bb:text-gray-600'],
    },
]

describe('NavigationMenuElement: активный пункт меню', () => {
    for (const testCase of activeCases) {
        it(testCase.name, () => {
            const { wrapper, errors, warnings } = mountItem(null, { isActive: testCase.isActive })

            expect(errors).toEqual([])
            expect(warnings).toEqual([])

            const classes = wrapper.get('a').classes()

            for (const cls of testCase.shouldHave) {
                expect(classes).toContain(cls)
            }

            for (const cls of testCase.shouldNotHave) {
                expect(classes).not.toContain(cls)
            }
        })
    }
})

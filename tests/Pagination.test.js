// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import Pagination from '../src/components/Pagination.vue'
import { dashboardUi } from '../src/plugin.js'

enableAutoUnmount(afterEach)
// Компонент монтируется в документ (attachTo), иначе клик не всплывает до window
// и помощник click() не узнает, отменён ли переход.
afterEach(() => {
    document.body.innerHTML = ''
})

const NEXT = 'https://example.test/list?source=vetkit&page=3'
const PREV = 'https://example.test/list?source=vetkit&page=1'
const META = { from: 16, to: 30, total: 40 }

const text = (wrapper) => wrapper.text().replace(/\s+/g, ' ').trim()

// Клик по ссылке, как у пользователя. Слушатель на window срабатывает последним
// и записывает, отменил ли компонент переход; затем отменяет переход сам, чтобы
// happy-dom не уходил по адресу.
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

// null у обязательных links/meta Vue сопровождает предупреждением о типе пропа —
// это ожидаемо (README: компонент не падает на null, но Vue предупредит).
// Предупреждения собираются, а не пишутся в stderr: вывод тестов остаётся чистым.
function mountPagination({ props, plugin } = {}) {
    const errors = []
    const warnings = []
    const wrapper = mount(Pagination, {
        props,
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

describe('Pagination: что рисуется', () => {
    const cases = [
        { name: 'обе ссылки', links: { prev: PREV, next: NEXT }, meta: META, hrefs: [PREV, NEXT], warns: false },
        { name: 'только следующая', links: { prev: null, next: NEXT }, meta: META, hrefs: [NEXT], warns: false },
        { name: 'только предыдущая', links: { prev: PREV, next: null }, meta: META, hrefs: [PREV], warns: false },
        { name: 'без ключей prev/next — ни одной ссылки, в том числе на #', links: {}, meta: META, hrefs: [], warns: false },
        { name: 'пустые адреса — ни одной ссылки', links: { prev: '', next: '' }, meta: META, hrefs: [], warns: false },
        { name: 'links — null, записи есть — строка результатов без ссылок', links: null, meta: META, hrefs: [], warns: true },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const { wrapper, errors, warnings } = mountPagination({ props: { links: testCase.links, meta: testCase.meta } })

            expect(errors).toEqual([])
            if (testCase.warns) {
                expect(warnings.length).toBeGreaterThan(0)
                expect(warnings.every((w) => w.includes('Invalid prop'))).toBe(true)
            } else {
                expect(warnings).toEqual([])
            }
            expect(wrapper.find('nav').exists()).toBe(true)
            expect(wrapper.findAll('a').map((a) => a.attributes('href'))).toEqual(testCase.hrefs)
            expect(text(wrapper)).toContain('Показаны результаты 16 - 30 из 40')
        })
    }

    it('без from/to строки результатов нет, ссылки остаются', () => {
        const { wrapper, errors, warnings } = mountPagination({ props: { links: { prev: null, next: NEXT }, meta: { total: 40 } } })

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(wrapper.find('nav').exists()).toBe(true)
        expect(text(wrapper)).not.toContain('Показаны результаты')
        expect(wrapper.findAll('a').map((a) => a.attributes('href'))).toEqual([NEXT])
    })

    // Записей нет — meta не задан или total не больше нуля: пагинации нет вовсе.
    const empty = [
        { name: 'total = 0', links: { prev: null, next: null }, meta: { from: null, to: null, total: 0 }, expectWarnings: false },
        { name: 'links и meta — null', links: null, meta: null, expectWarnings: true },
        { name: 'meta без ключей', links: { prev: null, next: NEXT }, meta: {}, expectWarnings: false },
    ]

    for (const testCase of empty) {
        it(`ничего не рисует: ${testCase.name}`, () => {
            const { wrapper, errors, warnings } = mountPagination({ props: { links: testCase.links, meta: testCase.meta } })

            expect(errors).toEqual([])
            if (testCase.expectWarnings) {
                expect(warnings.length).toBeGreaterThan(0)
                expect(warnings.every((w) => w.includes('Invalid prop'))).toBe(true)
            } else {
                expect(warnings).toEqual([])
            }
            expect(wrapper.find('nav').exists()).toBe(false)
        })
    }

    const missingOrInvalidTo = [
        { name: 'to отсутствует', links: { prev: PREV, next: NEXT }, meta: { from: 16, total: 40 } },
        { name: 'to — строка', links: { prev: PREV, next: NEXT }, meta: { from: 16, to: '30', total: 40 } },
    ]

    for (const testCase of missingOrInvalidTo) {
        it(`${testCase.name}: ссылки есть, строки результатов нет`, () => {
            const { wrapper, errors, warnings } = mountPagination({ props: { links: testCase.links, meta: testCase.meta } })

            expect(errors).toEqual([])
            expect(warnings).toEqual([])
            expect(wrapper.find('nav').exists()).toBe(true)
            expect(wrapper.findAll('a').map((a) => a.attributes('href'))).toEqual([PREV, NEXT])
            expect(text(wrapper)).not.toContain('Показаны результаты')
        })
    }

    const invalidTotal = [
        { name: 'total — строка', links: { prev: null, next: null }, meta: { from: null, to: null, total: '40' } },
        { name: 'total = -1', links: { prev: null, next: null }, meta: { from: null, to: null, total: -1 } },
        { name: 'total = NaN', links: { prev: null, next: null }, meta: { from: null, to: null, total: NaN } },
    ]

    for (const testCase of invalidTotal) {
        it(`ничего не рисует: ${testCase.name}`, () => {
            const { wrapper, errors, warnings } = mountPagination({ props: { links: testCase.links, meta: testCase.meta } })

            expect(errors).toEqual([])
            expect(warnings).toEqual([])
            expect(wrapper.find('nav').exists()).toBe(false)
        })
    }
})

describe('Pagination: тексты', () => {
    const cases = [
        { name: 'без плагина — ru', plugin: null, props: {}, expected: ['Предыдущая', 'Показаны результаты 16 - 30 из 40', 'Следующая'] },
        { name: 'плагин en', plugin: { lang: 'en' }, props: {}, expected: ['Previous', 'Showing 16 - 30 of 40 results', 'Next'] },
        { name: 'проп lang en без плагина', plugin: null, props: { lang: 'en' }, expected: ['Previous', 'Showing 16 - 30 of 40 results', 'Next'] },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const { wrapper, warnings } = mountPagination({
                props: { links: { prev: PREV, next: NEXT }, meta: META, ...testCase.props },
                plugin: testCase.plugin,
            })

            expect(warnings).toEqual([])
            for (const fragment of testCase.expected) {
                expect(text(wrapper)).toContain(fragment)
            }
        })
    }
})

describe('Pagination: переход', () => {
    it('обычный клик уходит в navigate с адресом и отменяет переход браузера', () => {
        const visited = []
        const { wrapper, errors, warnings } = mountPagination({
            props: { links: { prev: null, next: NEXT }, meta: META },
            plugin: { navigate: (href) => visited.push(href) },
        })

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(click(wrapper.get('a').element)).toBe(true)
        expect(visited).toEqual([NEXT])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('Ctrl-клик не перехватывается', () => {
        const visited = []
        const { wrapper, errors, warnings } = mountPagination({
            props: { links: { prev: null, next: NEXT }, meta: META },
            plugin: { navigate: (href) => visited.push(href) },
        })

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(click(wrapper.get('a').element, { ctrlKey: true })).toBe(false)
        expect(visited).toEqual([])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('без плагина браузер идёт по ссылке сам', () => {
        const { wrapper, errors, warnings } = mountPagination({ props: { links: { prev: null, next: NEXT }, meta: META } })

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(click(wrapper.get('a').element)).toBe(false)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('клик по PREV ссылке отменяет переход браузера и вызывает navigate', () => {
        const visited = []
        const { wrapper, errors, warnings } = mountPagination({
            props: { links: { prev: PREV, next: null }, meta: META },
            plugin: { navigate: (href) => visited.push(href) },
        })

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        const prevLink = wrapper.findAll('a').find((a) => a.attributes('href') === PREV)
        expect(click(prevLink.element)).toBe(true)
        expect(visited).toEqual([PREV])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

describe('Pagination: атрибуты и стиль', () => {
    it('attrs передаются на nav', () => {
        const errors = []
        const warnings = []
        const wrapper = mount(Pagination, {
            props: { links: { prev: PREV, next: NEXT }, meta: META },
            attrs: { class: 'mt-6' },
            attachTo: document.body,
            global: {
                config: {
                    errorHandler: (error) => errors.push(error),
                    warnHandler: (message) => warnings.push(message),
                },
            },
        })

        const nav = wrapper.find('nav')
        expect(nav.exists()).toBe(true)
        expect(nav.classes()).toContain('mt-6')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('с total = 0 и attrs ничего не рисует, warnings пусто', () => {
        const errors = []
        const warnings = []
        const wrapper = mount(Pagination, {
            props: { links: { prev: PREV, next: NEXT }, meta: { total: 0 } },
            attrs: { class: 'mt-6' },
            attachTo: document.body,
            global: {
                config: {
                    errorHandler: (error) => errors.push(error),
                    warnHandler: (message) => warnings.push(message),
                },
            },
        })

        expect(wrapper.find('nav').exists()).toBe(false)
        expect(warnings).toEqual([])
        expect(errors).toEqual([])
    })
})

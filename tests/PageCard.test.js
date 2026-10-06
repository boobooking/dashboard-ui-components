// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PageCard from '../src/components/PageCard.vue'
import { dashboardUi } from '../src/plugin.js'

enableAutoUnmount(afterEach)
afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
})

const CROSS_PATH = 'path[d="M6 18L18 6M6 6l12 12"]'

// Предупреждения и ошибки Vue собираются и проверяются в каждом тесте, как в
// tests/Pagination.test.js.
function mountCard({ attrs = {}, props = {}, plugin } = {}) {
    const errors = []
    const warnings = []
    const wrapper = mount(PageCard, {
        props,
        attrs,
        slots: { default: '<h3 id="card-heading">Заголовок</h3>' },
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

const findCross = (wrapper) => wrapper.findAll('button').find((button) => button.find(CROSS_PATH).exists())

// Компонент читает history.length после монтирования. Порядок блоков важен:
// первый монтирует при истории из одной записи, последний добавляет запись до
// своих монтирований.
describe('PageCard: вкладка без истории', () => {
    it('крестика нет, места под него нет', async () => {
        expect(window.history.length).toBeLessThan(2)

        const { wrapper, errors, warnings } = mountCard()
        await nextTick()

        expect(findCross(wrapper)).toBeUndefined()
        expect(wrapper.classes()).toContain('bb:[--bb-closer-space:0px]')
        expect(wrapper.classes()).not.toContain('bb:[--bb-closer-space:3.5rem]')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

describe('PageCard: карточка', () => {
    it('содержимое слота — внутри корня', () => {
        const { wrapper, errors, warnings } = mountCard()

        expect(wrapper.get('#card-heading').element.parentElement).toBe(wrapper.element)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('на корне — классы карточки и нет ресета пакета', () => {
        const { wrapper, errors, warnings } = mountCard()

        for (const name of ['bb:box-border', 'bb:relative', 'bb:my-6', 'bb:mx-auto', 'bb:bg-white', 'bb:shadow-xl', 'bb:sm:max-w-xl', 'bb:sm:rounded-lg']) {
            expect(wrapper.classes()).toContain(name)
        }
        expect(wrapper.classes()).not.toContain('bb-dashboard-ui')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('класс и атрибут приложения — на корне', () => {
        const { wrapper, errors, warnings } = mountCard({ attrs: { class: 'px-4', 'data-test': 'card' } })

        expect(wrapper.classes()).toContain('px-4')
        expect(wrapper.attributes('data-test')).toBe('card')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

describe('PageCard: вкладка с историей', () => {
    // До монтирования: компонент читает history.length после монтирования.
    beforeAll(() => {
        window.history.pushState({ pageCardTest: true }, '')
        expect(window.history.length).toBeGreaterThan(1)
    })

    it('крестик после слота, доступен с клавиатуры, место под него задано', async () => {
        const { wrapper, errors, warnings } = mountCard()
        await nextTick()
        const cross = findCross(wrapper)

        expect(cross).toBeDefined()
        expect(wrapper.element.lastElementChild).toBe(cross.element)
        expect(cross.attributes('tabindex')).toBe('0')
        for (const name of ['bb:absolute', 'bb:md:left-full', 'bb:md:ml-4', 'bb:sm:mt-6', 'bb:focus-visible:ring-2', 'bb:focus-visible:ring-indigo-500']) {
            expect(cross.classes()).toContain(name)
        }
        expect(wrapper.classes()).toContain('bb:[--bb-closer-space:3.5rem]')
        expect(wrapper.classes()).toContain('bb:md:[--bb-closer-space:0px]')
        expect(wrapper.classes()).not.toContain('bb:[--bb-closer-space:0px]')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    const labelCases = [
        { name: 'без плагина — «Назад»', plugin: undefined, props: {}, expected: 'Назад' },
        { name: 'плагин en — «Back»', plugin: { lang: 'en' }, props: {}, expected: 'Back' },
        { name: 'проп lang ru главнее плагина en', plugin: { lang: 'en' }, props: { lang: 'ru' }, expected: 'Назад' },
    ]

    for (const testCase of labelCases) {
        it(`доступное имя крестика: ${testCase.name}`, async () => {
            const { wrapper, errors, warnings } = mountCard({ plugin: testCase.plugin, props: testCase.props })
            await nextTick()

            expect(findCross(wrapper).attributes('aria-label')).toBe(testCase.expected)
            expect(errors).toEqual([])
            expect(warnings).toEqual([])
        })
    }

    it('клик по крестику — history.back() один раз', async () => {
        const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
        const { wrapper, errors, warnings } = mountCard()
        await nextTick()

        await findCross(wrapper).trigger('click')

        expect(back).toHaveBeenCalledTimes(1)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('крестик появляется после монтирования, а не при создании', async () => {
        const { wrapper, errors, warnings } = mountCard()

        // mounted() уже прочёл историю, но перерисовка ещё не прошла.
        expect(findCross(wrapper)).toBeUndefined()
        expect(wrapper.classes()).toContain('bb:[--bb-closer-space:0px]')

        await nextTick()

        expect(findCross(wrapper)).toBeDefined()
        expect(wrapper.classes()).toContain('bb:[--bb-closer-space:3.5rem]')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

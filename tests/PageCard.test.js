// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import PageCard from '../src/components/PageCard.vue'
import { dashboardUi, injectSettings } from '../src/plugin.js'

enableAutoUnmount(afterEach)
afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
})

// Ошибки и предупреждения Vue каждого смонтированного случая: после случая
// они должны быть пустыми, так что ни один случай не может про них забыть.
// Случай, который ждёт предупреждение, сам проверяет его и объявляет это
// опцией expectsWarnings.
const collected = []

afterEach(() => {
    for (const { errors, warnings, expectsWarnings } of collected.splice(0)) {
        expect(errors).toEqual([])
        if (!expectsWarnings) {
            expect(warnings).toEqual([])
        }
    }
})

const CROSS_PATH = 'path[d="M6 18L18 6M6 6l12 12"]'

// Карточка открыта, монтирование назначило окно, перерисовка прошла.
const settle = async () => {
    await nextTick()
    await nextTick()
}

// Страница приложения: пока page.show — false, на экране «список», после —
// карточка. Адрес страницы — ref, его читает currentUrl плагина: как
// в Inertia, он меняется до того, как создаются компоненты новой страницы.
// plugin: 'windows' — плагин с navigate-шпионом и currentUrl; объект —
// эти опции плагина; null — без плагина.
function mountPage({ address = '/list', plugin = 'windows', props = {}, attrs = {}, show = false, expectsWarnings = false } = {}) {
    const errors = []
    const warnings = []
    collected.push({ errors, warnings, expectsWarnings })
    const current = ref(address)
    const navigate = vi.fn()
    const page = reactive({ show, props, attrs })
    let plugins = []

    if (plugin === 'windows') {
        plugins = [[dashboardUi, { navigate, currentUrl: () => current.value }]]
    } else if (plugin !== null) {
        plugins = [[dashboardUi, plugin]]
    }

    const Host = defineComponent({
        inject: injectSettings,
        render() {
            if (!page.show) {
                return h('div', { id: 'list' }, 'Список')
            }

            return h(PageCard, { ...page.attrs, ...page.props }, {
                default: ({ close }) => [
                    h('h3', { id: 'card-heading' }, 'Заголовок'),
                    h('button', { id: 'cancel', type: 'button', onClick: close }, 'Отмена'),
                ],
            })
        },
    })

    const wrapper = mount(Host, {
        attachTo: document.body,
        global: {
            plugins,
            config: {
                errorHandler: (error) => errors.push(error),
                warnHandler: (message) => warnings.push(message),
            },
        },
    })

    // Переход на страницу с карточкой: сначала адрес, затем отрисовка.
    async function open(nextAddress) {
        current.value = nextAddress
        page.show = true
        await settle()
    }

    // Переход внутри карточки: адрес меняется, карточка остаётся.
    async function goTo(nextAddress) {
        current.value = nextAddress
        await settle()
    }

    const card = () => wrapper.findComponent(PageCard)
    const cross = () => wrapper.findAll('button').find((button) => button.find(CROSS_PATH).exists())
    const chain = () => wrapper.vm.uiSettings.windows.state.windows.map((item) => [item.key, item.returnAddress])

    return { wrapper, page, current, navigate, open, goTo, card, cross, chain, errors, warnings }
}

describe('PageCard: адрес возврата', () => {
    it('крестик ведёт на адрес прежней страницы с query', async () => {
        const page = mountPage({ address: '/groups?status=sending' })
        await page.open('/groups/A/orders')

        await page.cross().trigger('click')

        expect(page.navigate).toHaveBeenCalledTimes(1)
        expect(page.navigate).toHaveBeenCalledWith('/groups?status=sending')
        expect(page.errors).toEqual([])
        expect(page.warnings).toEqual([])
    })

    it('close() слотом и через ref — тот же переход', async () => {
        const page = mountPage()
        await page.open('/card')

        await page.wrapper.get('#cancel').trigger('click')
        page.card().vm.close()

        expect(page.navigate.mock.calls).toEqual([['/list'], ['/list']])
        expect(page.warnings).toEqual([])
    })

    it('двойной клик по крестику — два перехода на одну цель', async () => {
        const page = mountPage()
        await page.open('/card')

        await page.cross().trigger('click')
        await page.cross().trigger('click')

        expect(page.navigate.mock.calls).toEqual([['/list'], ['/list']])
    })

    it('уходящая карточка окно новой страницы не берёт', async () => {
        const page = mountPage()
        await page.open('/card')

        page.current.value = '/other'
        page.page.show = false
        await settle()

        expect(page.chain()).toEqual([['/card', '/list']])
        expect(page.warnings).toEqual([])
    })
})

describe('PageCard: без адреса возврата', () => {
    it('холодное открытие без fallback-url — крестика нет, close() ничего не делает', async () => {
        const page = mountPage({ address: '/card', show: true })
        await settle()

        expect(page.cross()).toBeUndefined()
        expect(page.card().classes()).toContain('bb:[--bb-closer-space:0px]')
        page.card().vm.close()
        expect(page.navigate).not.toHaveBeenCalled()
        expect(page.warnings).toEqual([])
    })

    it('холодное открытие с fallback-url — крестик ведёт на него', async () => {
        const page = mountPage({ address: '/card', show: true, props: { fallbackUrl: '/users' } })
        await settle()

        await page.cross().trigger('click')

        expect(page.navigate).toHaveBeenCalledWith('/users')
    })

    it('смена fallback-url на экране — новая цель', async () => {
        const page = mountPage({ address: '/card', show: true, props: { fallbackUrl: '/a' } })
        await settle()

        page.page.props.fallbackUrl = '/b'
        await settle()
        await page.cross().trigger('click')

        expect(page.chain()).toEqual([['/card', null]])
        expect(page.wrapper.vm.uiSettings.windows.state.windows[0].fallbackAddress).toBe('/b')
        expect(page.navigate).toHaveBeenCalledWith('/b')
        expect(page.warnings).toEqual([])
    })

    it('fallback-url="" — цели нет', async () => {
        const page = mountPage({ address: '/card', show: true, props: { fallbackUrl: '' } })
        await settle()

        expect(page.cross()).toBeUndefined()
    })

    it('плагин без currentUrl — только fallback-url', async () => {
        const navigate = vi.fn()
        const page = mountPage({ plugin: { navigate }, show: true, props: { fallbackUrl: '/users' } })
        await settle()

        await page.cross().trigger('click')

        expect(navigate).toHaveBeenCalledWith('/users')
    })

    it('без плагина — fallback-url полной загрузкой страницы', async () => {
        const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
        const page = mountPage({ plugin: null, show: true, props: { fallbackUrl: '/users' } })
        await settle()

        await page.cross().trigger('click')

        expect(assign).toHaveBeenCalledWith('/users')
    })

    it('плагин без navigate — close() зовёт location.assign', async () => {
        const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
        const current = ref('/list')
        const page = mountPage({ plugin: { currentUrl: () => current.value } })
        current.value = '/card'
        page.page.show = true
        await settle()

        await page.cross().trigger('click')

        expect(assign).toHaveBeenCalledWith('/list')
    })
})

describe('PageCard: ключ окна', () => {
    it('смена window-key вместе с показом страницы — новое окно', async () => {
        const page = mountPage({ address: '/groups', props: { windowKey: 'group:A' } })
        await page.open('/groups/A/orders')

        page.current.value = '/groups/B/orders'
        page.page.props.windowKey = 'group:B'
        await settle()
        await page.cross().trigger('click')

        expect(page.navigate).toHaveBeenCalledWith('/groups/A/orders')
        expect(page.warnings).toEqual([])
    })

    it('смена window-key без показа — предупреждение, окно прежнее; возврат ключа — без предупреждения', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const page = mountPage({ props: { windowKey: 'A' } })
        await page.open('/card')

        page.page.props.windowKey = 'B'
        await settle()
        page.page.props.windowKey = 'A'
        await settle()
        await page.cross().trigger('click')

        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn.mock.calls[0][0]).toBe('PageCard: ключ окна сменился на «B» без смены страницы — карточка остаётся в окне «A»')
        expect(page.navigate).toHaveBeenCalledWith('/list')
    })

    it('после смены таба смена ключа без показа — предупреждение, окно прежнее', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const page = mountPage({ props: { windowKey: 'A' } })
        await page.open('/card/1')
        await page.goTo('/card/2')

        page.page.props.windowKey = 'B'
        await settle()
        await page.cross().trigger('click')

        expect(warn).toHaveBeenCalledTimes(1)
        expect(page.chain()).toEqual([['A', '/list']])
        expect(page.navigate).toHaveBeenCalledWith('/list')
    })

    it('ключ по умолчанию следует за путём: переиспользованная карточка — новое окно', async () => {
        const page = mountPage({ address: '/users?page=2' })
        await page.open('/users/1/edit')
        await page.goTo('/users/2/edit')

        await page.cross().trigger('click')

        expect(page.navigate).toHaveBeenCalledWith('/users/1/edit')
        expect(page.warnings).toEqual([])
    })

    it('window-key="" — как ключ по умолчанию', async () => {
        const page = mountPage({ address: '/users?page=2', props: { windowKey: '' } })
        await page.open('/users/1/edit')
        await page.goTo('/users/2/edit')

        await page.cross().trigger('click')

        expect(page.navigate).toHaveBeenCalledWith('/users/1/edit')
    })
})

describe('PageCard: карточка', () => {
    const widthCases = [
        { width: undefined, card: 'bb:sm:max-w-xl', closer: ['bb:md:right-auto', 'bb:md:left-full', 'bb:md:mr-0', 'bb:md:ml-4'], space: 'bb:md:[--bb-closer-space:0px]' },
        { width: 'xl', card: 'bb:sm:max-w-xl', closer: ['bb:md:right-auto', 'bb:md:left-full', 'bb:md:mr-0', 'bb:md:ml-4'], space: 'bb:md:[--bb-closer-space:0px]' },
        { width: '4xl', card: 'bb:sm:max-w-4xl', closer: ['bb:lg:right-auto', 'bb:lg:left-full', 'bb:lg:mr-0', 'bb:lg:ml-4'], space: 'bb:lg:[--bb-closer-space:0px]' },
        { width: '7xl', card: 'bb:sm:max-w-7xl', closer: ['bb:2xl:right-auto', 'bb:2xl:left-full', 'bb:2xl:mr-0', 'bb:2xl:ml-4'], space: 'bb:2xl:[--bb-closer-space:0px]' },
    ]

    for (const testCase of widthCases) {
        it(`ширина ${testCase.width ?? 'по умолчанию'}: классы карточки, крестика и места под него`, async () => {
            const props = { fallbackUrl: '/list', ...(testCase.width === undefined ? {} : { width: testCase.width }) }
            const page = mountPage({ plugin: null, show: true, props })
            await settle()

            expect(page.card().classes()).toContain(testCase.card)
            expect(page.card().classes()).toContain('bb:[--bb-closer-space:3.5rem]')
            expect(page.card().classes()).toContain(testCase.space)
            for (const name of testCase.closer) {
                expect(page.cross().classes()).toContain(name)
            }
            expect(page.warnings).toEqual([])
        })
    }

    it('недопустимая ширина — вид xl и предупреждение валидатора', async () => {
        const page = mountPage({ plugin: null, show: true, expectsWarnings: true, props: { fallbackUrl: '/list', width: 'wide' } })
        await settle()

        expect(page.card().classes()).toContain('bb:sm:max-w-xl')
        expect(page.warnings).toHaveLength(1)
        expect(page.warnings[0]).toContain('width')
    })

    it('на корне — классы карточки, нет ресета пакета, слот внутри корня', async () => {
        const page = mountPage({ plugin: null, show: true })
        await settle()

        for (const name of ['bb:box-border', 'bb:relative', 'bb:my-6', 'bb:mx-auto', 'bb:bg-white', 'bb:shadow-xl', 'bb:sm:rounded-lg']) {
            expect(page.card().classes()).toContain(name)
        }
        expect(page.card().classes()).not.toContain('bb-dashboard-ui')
        expect(page.wrapper.get('#card-heading').element.parentElement).toBe(page.card().element)
        expect(page.warnings).toEqual([])
    })

    it('class, style, data-*, aria-* — на корне; id и пропы страницы — нет', async () => {
        const page = mountPage({
            plugin: null,
            show: true,
            attrs: {
                class: 'px-4',
                style: 'color: red',
                'data-test': 'card',
                'aria-describedby': 'hint',
                id: 'page',
                group: { uuid: '1' },
            },
        })
        await settle()
        const root = page.card()

        expect(root.classes()).toContain('px-4')
        expect(root.attributes('style')).toContain('color: red')
        expect(root.attributes('data-test')).toBe('card')
        expect(root.attributes('aria-describedby')).toBe('hint')
        expect(root.attributes('id')).toBeUndefined()
        expect(root.attributes('group')).toBeUndefined()
        expect(page.errors).toEqual([])
        expect(page.warnings).toEqual([])
    })

    it('крестик после слота и доступен с клавиатуры', async () => {
        const page = mountPage({ plugin: null, show: true, props: { fallbackUrl: '/list' } })
        await settle()

        expect(page.card().element.lastElementChild).toBe(page.cross().element)
        expect(page.cross().attributes('tabindex')).toBe('0')
        for (const name of ['bb:absolute', 'bb:sm:mt-6', 'bb:focus-visible:ring-2', 'bb:focus-visible:ring-indigo-500']) {
            expect(page.cross().classes()).toContain(name)
        }
    })

    const labelCases = [
        { name: 'без плагина — «Назад»', plugin: null, props: {}, expected: 'Назад' },
        { name: 'плагин en — «Back»', plugin: { lang: 'en' }, props: {}, expected: 'Back' },
        { name: 'проп lang ru главнее плагина en', plugin: { lang: 'en' }, props: { lang: 'ru' }, expected: 'Назад' },
    ]

    for (const testCase of labelCases) {
        it(`доступное имя крестика: ${testCase.name}`, async () => {
            const page = mountPage({ plugin: testCase.plugin, show: true, props: { fallbackUrl: '/list', ...testCase.props } })
            await settle()

            expect(page.cross().attributes('aria-label')).toBe(testCase.expected)
            expect(page.warnings).toEqual([])
        })
    }
})

import { createApp, defineComponent, h } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { vi, expect } from 'vitest'
import { createInertiaApp, router, usePage } from '@inertiajs/vue3'
import PageCard from '../../src/components/PageCard.vue'
import { dashboardUi } from '../../src/plugin.js'

// Настоящие Inertia и Vue, сервер — функция serve(): по адресу отдаёт объект
// страницы. Страницы — как в приложении: табы группы объявляют PageCard
// постоянным макетом с ключом окна, форма и редактор держат PageCard
// в своём шаблоне.

const Tab = defineComponent({
    props: { group: String, tab: String },
    layout: (props) => [PageCard, { windowKey: `group:${props.group}`, fallbackUrl: '/groups' }],
    render() {
        return h('div', { id: 'tab' }, `${this.group} ${this.tab}`)
    },
})

const Form = defineComponent({
    props: { fallback: String },
    render() {
        return h(PageCard, { fallbackUrl: this.fallback }, () => h('h3', 'Форма'))
    },
})

const Editor = defineComponent({
    render: () => h(PageCard, { fallbackUrl: '/users' }, () => h('h3', 'Редактор')),
})

const Bare = defineComponent({
    render: () => h(PageCard, null, () => h('h3', 'Без запасного адреса')),
})

const List = defineComponent({
    render: () => h('div', { id: 'list' }, 'Список'),
})

const pages = { Tab, Form, Editor, Bare, List }

const page = (component, url, props) => ({ component, props, url, version: '' })

export function serve(address) {
    const path = new URL(address, 'https://example.test').pathname
    let match = path.match(/^\/groups\/(\w+)\/(orders|certificates)$/)

    if (match) {
        return page('Tab', address, { group: match[1], tab: match[2] })
    }

    match = path.match(/^\/groups\/(\w+)\/keys$/)

    if (match) {
        return page('Form', address, { fallback: `/groups/${match[1]}/certificates` })
    }

    // Форма с абсолютным запасным адресом, как отдаёт Ziggy.
    match = path.match(/^\/groups\/(\w+)\/abs-keys$/)

    if (match) {
        return page('Form', address, { fallback: `${window.location.origin}/groups/${match[1]}/certificates` })
    }

    if (/^\/users\/\d+\/edit$/.test(path)) {
        return page('Editor', address, {})
    }

    if (/^\/bare\/\d+$/.test(path)) {
        return page('Bare', address, {})
    }

    return page('List', address, {})
}

// Адреса, ответ на которые обрывается (blocked) или не приходит, пока
// запрос не отменят (hanging).
export const blocked = new Set()
export const hanging = new Set()

const http = {
    async request(config) {
        const url = new URL(config.url, window.location.origin)
        const address = url.pathname + url.search

        if (blocked.has(address)) {
            throw new Error(`адрес заблокирован тестом: ${address}`)
        }

        if (hanging.has(address)) {
            return new Promise((resolve, reject) => {
                config.signal?.addEventListener('abort', () => reject(new Error(`запрос отменён: ${address}`)))
            })
        }

        return {
            status: 200,
            data: JSON.stringify(serve(address)),
            headers: { 'x-inertia': 'true', 'content-type': 'application/json' },
        }
    },
}

export const warnings = []

export async function settle() {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await flushPromises()
}

// Порядок установки — как в app.js приложения: .use(plugin)
// .use(dashboardUi).mount(el). Начальную страницу Inertia задаёт уже
// после установки плагинов.
export async function start(address) {
    document.body.innerHTML = '<div id="app"></div>'
    window.history.replaceState(null, '', address)

    await createInertiaApp({
        page: serve(address),
        resolve: (name) => pages[name],
        http,
        progress: false,
        setup({ el, App, props, plugin }) {
            const app = createApp({ render: () => h(App, props) })

            app.config.warnHandler = (message) => warnings.push(message)
            app.use(plugin)
                .use(dashboardUi, {
                    navigate: (href) => router.visit(href, { onNetworkError: () => false }),
                    currentUrl: () => usePage().url,
                })
                .mount(el)

            return app
        },
    })
    await settle()
}

export async function visit(href, options = {}) {
    await new Promise((resolve) => router.visit(href, { ...options, onFinish: () => resolve() }))
    await settle()
}

export const address = () => window.location.pathname + window.location.search

export const hasCross = () => document.querySelector('button[aria-label="Назад"]') !== null

export async function clickCross() {
    document.querySelector('button[aria-label="Назад"]').click()
    await settle()
}

export async function waitForAddress(expected) {
    await vi.waitFor(() => expect(address()).toBe(expected))
    await settle()
}

export async function back() {
    window.history.back()
    await settle()
}

export async function go(delta) {
    window.history.go(delta)
    await settle()
}

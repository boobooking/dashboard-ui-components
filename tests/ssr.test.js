// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import * as pkg from '../src/index.js'
import { ssrFixtures } from './ssrFixtures.js'

// Серверный рендер без браузера: загрузка пакета и рендер каждого
// экспортируемого компонента не должны касаться window и document.

const componentNames = Object.keys(pkg).filter((name) => name !== 'dashboardUi').sort()

async function renderOnServer(name) {
    const warnings = []
    const errors = []
    const fixture = ssrFixtures[name]
    const app = createSSRApp({ render: () => h(pkg[name], fixture.props ?? {}, fixture.slots) })

    app.config.warnHandler = (message) => warnings.push(message)
    app.config.errorHandler = (error) => errors.push(error)

    const html = await renderToString(app)

    return { html, warnings, errors }
}

describe('SSR: окружение', () => {
    it('нет window и document', () => {
        expect(typeof window).toBe('undefined')
        expect(typeof document).toBe('undefined')
    })

    it('фикстура есть у каждого экспортируемого компонента, и только у них', () => {
        expect(Object.keys(ssrFixtures).sort()).toEqual(componentNames)
    })
})

describe('SSR: рендер каждого компонента', () => {
    for (const name of componentNames) {
        it(name, async () => {
            const { html, warnings, errors } = await renderOnServer(name)

            expect(html.length).toBeGreaterThan(0)
            expect(errors).toEqual([])
            expect(warnings).toEqual([])
        })
    }
})

describe('SSR: PageCard', () => {
    it('с fallback-url сервер рисует крестик и место под него', async () => {
        const { html, warnings, errors } = await renderOnServer('PageCard')

        expect(html).toContain('M6 18L18 6M6 6l12 12')
        expect(html).toContain('bb:[--bb-closer-space:3.5rem]')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('без fallback-url крестика и места под него нет', async () => {
        const app = createSSRApp({ render: () => h(pkg.PageCard, null, () => h('h3', 'Заголовок')) })
        const warnings = []
        app.config.warnHandler = (message) => warnings.push(message)

        const html = await renderToString(app)

        expect(html).not.toContain('M6 18L18 6M6 6l12 12')
        expect(html).toContain('bb:[--bb-closer-space:0px]')
        expect(warnings).toEqual([])
    })
})

describe('SSR: плагин', () => {
    it('currentUrl на сервере не вызывается', async () => {
        let calls = 0
        const app = createSSRApp({ render: () => h('div') })

        app.use(pkg.dashboardUi, {
            currentUrl: () => {
                calls += 1

                return '/list'
            },
        })
        await renderToString(app)

        expect(calls).toBe(0)
    })
})

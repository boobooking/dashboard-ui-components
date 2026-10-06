// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { flushPromises } from '@vue/test-utils'
import * as pkg from '../src/index.js'
import { ssrFixtures } from './ssrFixtures.js'

afterEach(() => {
    document.body.innerHTML = ''
})

const CROSS_PATH = 'path[d="M6 18L18 6M6 6l12 12"]'
const componentNames = Object.keys(pkg).filter((name) => name !== 'dashboardUi').sort()

// Серверный HTML кладётся в контейнер и гидратируется. Подробности
// расхождений Vue пишет предупреждениями, а итог — один раз за модуль — через
// console.error, поэтому собираются оба канала.
async function hydrate(render) {
    const serverWarnings = []
    const server = createSSRApp({ render })
    server.config.warnHandler = (message) => serverWarnings.push(message)
    const html = await renderToString(server)

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)

    const warnings = []
    const errors = []
    const client = createSSRApp({ render })
    client.config.warnHandler = (message) => warnings.push(message)
    client.config.errorHandler = (error) => errors.push(error)

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let consoleErrors
    let consoleWarns
    try {
        client.mount(container)
        // PickDay загружает pikaday в mounted(): загрузка заканчивается до
        // конца теста, а не после.
        await vi.dynamicImportSettled()
        await flushPromises()
    } finally {
        consoleErrors = [...consoleError.mock.calls]
        consoleWarns = [...consoleWarn.mock.calls]
        consoleError.mockRestore()
        consoleWarn.mockRestore()
    }

    return { html, container, client, serverWarnings, warnings, errors, consoleErrors, consoleWarns }
}

function renderFixture(name) {
    const fixture = ssrFixtures[name]

    return () => h(pkg[name], fixture.props ?? {}, fixture.slots)
}

describe('гидратация каждого компонента', () => {
    for (const name of componentNames) {
        it(name, async () => {
            const result = await hydrate(renderFixture(name))

            expect(result.serverWarnings).toEqual([])
            expect(result.warnings).toEqual([])
            expect(result.errors).toEqual([])
            expect(result.consoleErrors).toEqual([])
            expect(result.consoleWarns).toEqual([])
            result.client.unmount()
        })
    }
})

describe('гидратация PageCard при истории вкладки', () => {
    beforeAll(() => {
        window.history.pushState({ hydrationTest: true }, '')
        expect(window.history.length).toBeGreaterThan(1)
    })

    it('сервер — без крестика, после гидратации крестик появляется без расхождений', async () => {
        const result = await hydrate(renderFixture('PageCard'))

        expect(result.html).not.toContain('M6 18L18 6M6 6l12 12')

        await nextTick()

        expect(result.container.querySelector(CROSS_PATH)).not.toBeNull()
        expect(result.warnings).toEqual([])
        expect(result.errors).toEqual([])
        expect(result.consoleErrors).toEqual([])
        result.client.unmount()
    })
})

// Последним: console.error с итогом Vue пишет один раз за модуль, и проверка
// самой проверки не должна забрать его у компонентов.
describe('проверка ловит расхождения', () => {
    it('разный текст на сервере и в браузере — предупреждение и console.error', async () => {
        let renders = 0
        const Mismatch = { render: () => h('p', renders++ === 0 ? 'сервер' : 'браузер') }

        const result = await hydrate(() => h(Mismatch))

        expect(result.warnings.some((warning) => warning.includes('Hydration'))).toBe(true)
        expect(result.consoleErrors.length).toBeGreaterThan(0)
        result.client.unmount()
    })
})

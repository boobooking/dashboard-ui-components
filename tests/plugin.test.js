// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { createApp, defineComponent, ref } from 'vue'
import { dashboardUi, injectSettings } from '../src/plugin.js'

describe('dashboardUi', () => {
    const cases = [
        { name: 'без параметров', options: undefined, throws: null },
        { name: 'lang ru', options: { lang: 'ru' }, throws: null },
        { name: 'lang en и функция navigate', options: { lang: 'en', navigate: () => {} }, throws: null },
        { name: 'неизвестный lang', options: { lang: 'de' }, throws: /lang «de»/ },
        { name: 'navigate не функция', options: { navigate: '/next' }, throws: /navigate/ },
        // «Не передано» — только отсутствующий ключ. Явные null и undefined —
        // переданные значения и отклоняются, как любые другие.
        { name: 'lang: null', options: { lang: null }, throws: /lang «null»/ },
        { name: 'navigate: null', options: { navigate: null }, throws: /navigate/ },
        { name: 'lang: undefined', options: { lang: undefined }, throws: /lang «undefined»/ },
        { name: 'navigate: undefined', options: { navigate: undefined }, throws: /navigate/ },
        { name: 'currentUrl — функция', options: { currentUrl: () => '/list' }, throws: null },
        { name: 'currentUrl не функция', options: { currentUrl: '/list' }, throws: /currentUrl должен быть функцией/ },
        { name: 'currentUrl: null', options: { currentUrl: null }, throws: /currentUrl должен быть функцией/ },
        { name: 'currentUrl: undefined', options: { currentUrl: undefined }, throws: /currentUrl должен быть функцией/ },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const install = () => createApp({ render: () => null }).use(dashboardUi, testCase.options)

            if (testCase.throws === null) {
                expect(install).not.toThrow()
            } else {
                expect(install).toThrow(testCase.throws)
            }
        })
    }
})

// Настройки приложения читает компонент-зонд: ключ provide наружу не отдаётся.
function mountProbe(currentUrl) {
    let settings = null
    const app = createApp(defineComponent({
        inject: injectSettings,
        created() {
            settings = this.uiSettings
        },
        render: () => null,
    }))

    app.use(dashboardUi, { currentUrl })
    app.mount(document.createElement('div'))

    return { app, windows: () => settings.windows }
}

describe('dashboardUi: currentUrl', () => {
    it('без опции окон нет', () => {
        let settings = null
        const app = createApp(defineComponent({
            inject: injectSettings,
            created() {
                settings = this.uiSettings
            },
            render: () => null,
        }))

        app.use(dashboardUi, {})
        app.mount(document.createElement('div'))

        expect(settings.windows).toBe(null)
        app.unmount()
    })

    it('undefined и null до готовности роутера показом не считаются', () => {
        const current = ref(undefined)
        const { app, windows } = mountProbe(() => current.value)

        expect(windows().page.number).toBe(0)

        current.value = null
        expect(windows().page.number).toBe(0)

        current.value = '/list'
        expect(windows().page).toEqual({ number: 1, address: '/list' })
        expect(windows().state.transition.fromAddress).toBe(null)
        app.unmount()
    })

    it('показ записывается синхронно, с адресом прежней страницы', () => {
        const current = ref('/list?page=2')
        const { app, windows } = mountProbe(() => current.value)

        current.value = '/card'

        expect(windows().page).toEqual({ number: 2, address: '/card' })
        expect(windows().state.transition.fromAddress).toBe('/list?page=2')
        app.unmount()
    })

    it('абсолютный адрес и hash приводятся к пути с query; смена одного hash — не показ', () => {
        const current = ref('https://example.test/groups?status=sending#top')
        const { app, windows } = mountProbe(() => current.value)

        expect(windows().page).toEqual({ number: 1, address: '/groups?status=sending' })

        current.value = '/groups?status=sending#bottom'
        expect(windows().page.number).toBe(1)
        app.unmount()
    })

    it('после app.unmount() смена адреса состояние не меняет', () => {
        const current = ref('/list')
        const { app, windows } = mountProbe(() => current.value)
        const page = windows().page

        app.unmount()
        current.value = '/other'

        expect(page).toEqual({ number: 1, address: '/list' })
    })
})

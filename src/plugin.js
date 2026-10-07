import { effectScope, shallowReactive, watch } from 'vue'
import { isLang, LANGS } from './i18n.js'
import { createWindows, normalizeAddress, pageShown } from './windows.js'

// Ключ настроек в provide приложения. Наружу не экспортируется: приложение
// задаёт настройки через dashboardUi, компоненты читают их через injectSettings.
const settingsKey = Symbol('dashboardUi')

// Без плагина: русский язык, ссылки — обычные <a> без перехвата клика,
// окон PageCard нет.
const defaultSettings = Object.freeze({ lang: 'ru', navigate: null, windows: null })

export const injectSettings = {
    uiSettings: { from: settingsKey, default: () => defaultSettings },
}

// Слежение за адресом страницы: каждый показ — переход в модуле окон.
// Синхронно, чтобы переход был записан до того, как Vue создаст
// компоненты новой страницы. До готовности роутера currentUrl() может
// вернуть undefined или null — такое значение показом не считается.
// Смена одного hash — тоже не показ: адрес окна — путь и query.
function followPages(app, currentUrl) {
    const state = createWindows()
    const page = shallowReactive({ number: 0, address: null })
    const scope = effectScope(true)

    scope.run(() => {
        watch(currentUrl, (value) => {
            const address = normalizeAddress(value, window.location.origin)

            if (address === null || address === page.address) {
                return
            }

            page.number = pageShown(state, address)
            page.address = address
        }, { flush: 'sync', immediate: true })
    })
    app.onUnmount(() => scope.stop())

    return { state, page }
}

export const dashboardUi = {
    install(app, options) {
        const given = options ?? {}

        // Не передан (ключа нет) — умолчание; переданное значение, включая
        // null и undefined, проверяется.
        const lang = Object.hasOwn(given, 'lang') ? given.lang : 'ru'
        // Неверный язык ловится сразу, а не русским текстом в английском приложении.
        if (!isLang(lang)) {
            throw new Error(`dashboardUi: неизвестный lang «${lang}», допустимы: ${LANGS.join(', ')}`)
        }

        const hasNavigate = Object.hasOwn(given, 'navigate')
        const navigate = hasNavigate ? given.navigate : null
        if (hasNavigate && typeof navigate !== 'function') {
            throw new Error('dashboardUi: navigate должен быть функцией (href) => …')
        }

        const hasCurrentUrl = Object.hasOwn(given, 'currentUrl')
        const currentUrl = hasCurrentUrl ? given.currentUrl : null
        if (hasCurrentUrl && typeof currentUrl !== 'function') {
            throw new Error('dashboardUi: currentUrl должен быть функцией () => адрес страницы')
        }

        // Окна ведутся только в браузере: на сервере страницы не
        // показываются, и слежение там остановить было бы некому.
        const windows = currentUrl !== null && typeof window !== 'undefined'
            ? followPages(app, currentUrl)
            : null

        app.provide(settingsKey, Object.freeze({ lang, navigate, windows }))
    },
}

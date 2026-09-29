import { isLang, LANGS } from './i18n.js'

// Ключ настроек в provide приложения. Наружу не экспортируется: приложение
// задаёт настройки через dashboardUi, компоненты читают их через injectSettings.
const settingsKey = Symbol('dashboardUi')

// Без плагина: русский язык, ссылки — обычные <a> без перехвата клика.
const defaultSettings = Object.freeze({ lang: 'ru', navigate: null })

export const injectSettings = {
    uiSettings: { from: settingsKey, default: () => defaultSettings },
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

        app.provide(settingsKey, Object.freeze({ lang, navigate }))
    },
}

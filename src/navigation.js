import { injectSettings } from './plugin.js'

// Какой клик по ссылке пакета отдать функции перехода приложения. Правила —
// как у Inertia Link (shouldIntercept в @inertiajs/core): всё, чем пользователь
// просит браузер открыть ссылку по-своему — новая вкладка, окно, скачивание, —
// остаётся браузеру.
export function shouldNavigateInApp(event) {
    const target = event.currentTarget?.target ?? ''

    return !(
        event.defaultPrevented ||
        event.target?.isContentEditable === true ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (target !== '' && target !== '_self') ||
        event.button !== 0
    )
}

// Ссылка пакета — настоящий <a href>. Обычный клик уходит в navigate(href)
// плагина dashboardUi; без navigate браузер идёт по ссылке сам.
export const withNavigation = {
    inject: injectSettings,

    methods: {
        followLink(event, href) {
            const navigate = this.uiSettings.navigate

            if (navigate === null || !shouldNavigateInApp(event)) {
                return
            }

            event.preventDefault()
            navigate(href)
        },
    },
}

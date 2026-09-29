import { isLang, messages } from './i18n.js'
import { injectSettings } from './plugin.js'

// Язык компонента: проп lang, если он допустим, иначе язык плагина dashboardUi,
// иначе ru. Недопустимый проп валидатор в dev-сборке ругается, но компонент
// не падает: берёт язык плагина. Компонент берёт тексты из this.texts.
export const withLang = {
    inject: injectSettings,

    props: {
        lang: {
            type: String,
            default: null,
            validator: (value) => value === null || isLang(value),
        },
    },

    computed: {
        resolvedLang() {
            return isLang(this.lang) ? this.lang : this.uiSettings.lang
        },

        texts() {
            return messages[this.resolvedLang]
        },
    },
}

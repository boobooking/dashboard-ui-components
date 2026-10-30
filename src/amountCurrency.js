import { pickCurrencies } from './currencies.js'

// Активная валюта полей суммы: переданная, если она в списке, иначе первая из
// списка, иначе null. Компонент объявляет computed passedCurrency и метод
// reportCurrency(code), которым сообщает родителю исправленный код.
export const withAmountCurrency = {
    props: {
        // Коды валют; null — полный список, [] — валют нет, поля заблокированы.
        currencies: {
            type: Array,
            default: null,
        },
    },

    computed: {
        currencyList() {
            return pickCurrencies(this.currencies)
        },

        activeCurrency() {
            return this.currencyList.find((currency) => currency.code === this.passedCurrency) ?? this.currencyList[0] ?? null
        },

        activeCode() {
            return this.activeCurrency?.code ?? null
        },

        fractionDigits() {
            return this.activeCurrency?.digits ?? 2
        },

        isBlocked() {
            return this.currencyList.length === 0
        },

        // Наблюдение за строкой, а не за массивом: новый массив с теми же
        // валютами её не меняет, а смена переданного кода меняет, даже если
        // активная валюта осталась той же.
        currencyKey() {
            return `${this.passedCurrency}|${this.activeCode}`
        },
    },

    watch: {
        currencyKey() {
            this.syncCurrency()
        },
    },

    mounted() {
        this.syncCurrency()
    },

    methods: {
        // При пустом списке значение родителя остаётся как есть: заданное до
        // загрузки валют должно её пережить.
        syncCurrency() {
            if (!this.isBlocked && this.activeCode !== this.passedCurrency) {
                this.reportCurrency(this.activeCode)
            }
        },
    },
}

// Описание поля формы: проп description и слот description. Методы, а не
// вычисляемые свойства: $slots не реактивен, а шаблон вызывает их в каждом
// рендере. useId() здесь нет: Vue не вызывает setup() миксина, поэтому id описания
// строится от id, который уже есть в компоненте. Внутренний модуль пакета.
export const withFieldDescription = {
    props: {
        // Текст под полем. Разметку, например ссылку, передаёт слот description.
        description: {
            type: String,
            default: null,
        },
    },

    methods: {
        // Слот важнее пропа, но описание есть при любом из них. Условие на
        // показ страница ставит на шаблон слота.
        hasDescription() {
            return this.$slots.description !== undefined
                || (typeof this.description === 'string' && this.description !== '')
        },

        // id описания или null, если описания нет: значение годится и для
        // aria-describedby.
        descriptionId(id) {
            return this.hasDescription() ? `${id}-description` : null
        },
    },
}

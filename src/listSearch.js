// Поиск по пунктам списка: проп withSearch, запрос, отфильтрованные пункты,
// остановки стрелок и Tab, набор с пункта. Компонент объявляет itemList и
// hasItems, ставит ListSearchField с ref="search" и v-model="query", список
// пунктов — с ref="list" и @keydown="onListKeydown", а из обработчика toggle
// панели вызывает onSearchToggle. Внутренний модуль пакета.
export const withListSearch = {
    props: {
        // Поле поиска над пунктами списка.
        withSearch: {
            type: Boolean,
            default: false,
        },
    },

    data() {
        return {
            // Запрос поиска: внутреннее состояние, не часть значения.
            // Сбрасывается при каждом закрытии списка.
            query: '',
        }
    },

    watch: {
        // Пункты пропали — панель уходит из DOM без события toggle, поэтому
        // запрос сбрасывается здесь: иначе вернувшийся список открылся бы
        // с прежним запросом.
        hasItems(hasItems) {
            if (!hasItems) {
                this.query = ''
            }
        },
    },

    computed: {
        // Фильтр поиска: имя пункта содержит запрос без учёта регистра,
        // запрос обрезан по краям. Пустой запрос — все пункты. Без поиска
        // запрос не действует: он мог остаться от поля, которое убрали
        // при открытом списке.
        visibleItems() {
            const query = this.withSearch ? this.query.trim().toLowerCase() : ''

            if (query === '') {
                return this.itemList
            }

            return this.itemList.filter((item) => this.itemName(item).toLowerCase().includes(query))
        },
    },

    methods: {
        // Имя пункта строкой: null и undefined — пустое имя, число — его
        // запись. Имя уходит в строковые пропы ListElement и DropdownButton,
        // и число в них Vue встретил бы предупреждением.
        itemName(item) {
            return String(item.name ?? '')
        },

        // Кнопки пунктов в порядке visibleItems: корень ListElement — кнопка,
        // и прямые потомки списка — только они. Без совпадений списка нет.
        itemElements() {
            return this.$refs.list ? [...this.$refs.list.querySelectorAll(':scope > button')] : []
        },

        // Поле ввода поиска. Без поля — null.
        searchInput() {
            return this.$refs.search?.inputElement() ?? null
        },

        // Остановки стрелок: поле, если оно есть, затем пункты. Ластик поля —
        // тоже кнопка, но в круг стрелок не входит. Без совпадений пунктов нет —
        // только поле. Функция одна и с поиском, и без него: панель берёт её
        // при открытии, а поиск могут включить и выключить при открытом списке.
        searchStops() {
            const field = this.$refs.search ? [this.$refs.search.inputElement()] : []

            return [...field, ...this.itemElements()]
        },

        // Остановки Tab: поле, ластик поля, пока запрос не пуст, затем пункты.
        // Ластик в Tab, но не в стрелках: стрелки ходят по выбору, а Tab
        // должен дойти до каждой кнопки списка. Tab ведёт модуль, а не
        // браузер: Safari пропускает кнопки (holdTabFocus). Функция одна и
        // с поиском, и без него, как searchStops.
        tabStops() {
            const field = this.$refs.search ? [this.$refs.search.inputElement()] : []
            const eraser = this.$refs.search && this.query !== '' ? [this.$refs.search.eraserElement()] : []

            return [...field, ...eraser, ...this.itemElements()]
        },

        // Список открылся — фокус в поле, набор сразу идёт в поиск. Страница
        // к полю не прокручивается: её прокрутка закрыла бы список. Список
        // закрылся по любой причине — запрос сбрасывается.
        onSearchToggle(isOpen) {
            if (isOpen && this.withSearch) {
                this.$refs.search.focus()
            }

            if (!isOpen) {
                this.query = ''
            }
        },

        // Набор на пункте уходит в поле: фокус на пункт переводят стрелки
        // или Tab, и без этого набор пропадал бы.
        // Печатный символ — одна клавиша без Ctrl, Cmd и Alt, кроме пробела:
        // пробел нажимает пункт. Ввод через метод ввода (isComposing)
        // не перехватывается. Символ дописывается в запрос, Backspace стирает
        // последний; каретка — в конце, после того как поле получит запрос.
        onListKeydown(event) {
            if (!this.withSearch || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
                return
            }

            if (event.key === 'Backspace') {
                this.query = this.query.slice(0, -1)
            } else if (event.key.length === 1 && event.key !== ' ') {
                this.query = this.query + event.key
            } else {
                return
            }

            event.preventDefault()
            this.$refs.search.focus()
            this.$nextTick(() => {
                this.$refs.search.moveCaretToEnd()
            })
        },
    },
}

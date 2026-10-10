<template>
    <popover-panel
        class="bb-dashboard-ui bb:inline-flex"
        :has-content="!isEmpty"
        :model-value="modelValue"
        align="end"
        :max-width="384"
        panel-role="region"
        :panel-label="texts.fullText"
        panel-focusable
        panel-class="bb:p-3 bb:rounded-md bb:border bb:border-gray-200 bb:bg-white bb:shadow-lg bb:text-left bb:text-sm bb:leading-5 bb:text-gray-700 bb:whitespace-normal bb:break-words bb:overscroll-contain bb:select-text bb:focus:outline-hidden bb:focus-visible:ring-2 bb:focus-visible:ring-indigo-500"
        @update:model-value="$emit('update:modelValue', $event)"
        @toggle="onPanelToggle"
    >
        <template #trigger="trigger">
            <!-- relative держит скрытую подпись sr-only внутри кнопки: без
                 него она позиционируется от карточки, выходит из обёртки
                 таблицы с прокруткой и расширяет страницу. -->
            <button
                type="button"
                :id="trigger.id"
                :popovertarget="trigger.popovertarget"
                class="bb:relative bb:text-gray-400 bb:hover:text-gray-600 bb:rounded-md bb:focus:outline-hidden bb:focus-visible:ring-2 bb:focus-visible:ring-indigo-500"
            >
                <span class="bb:sr-only">{{ texts.showText }}</span>
                <eye/>
            </button>
        </template>
        <template #default>{{ normalizedText }}</template>
    </popover-panel>
</template>

<script>
import PopoverPanel from "./PopoverPanel.vue";
import Eye from "./icons/Eye.vue";
import { withLang } from "../lang.js";

// Скрытый текст по клику на иконку-глаз. Открытие, место у кнопки (правый
// край по правому краю кнопки, ширина до 384 px — max-w-sm), закрытие
// кликом вне, Escape, прокруткой и изменением размера окна делает
// PopoverPanel. Пустой текст — компонента нет. whitespace-normal у панели —
// потому что ячейка таблицы whitespace-nowrap, а панель в DOM лежит внутри
// неё. tabindex и роль с именем — чтобы длинный текст прокручивался
// с клавиатуры во всех браузерах. select-text — потому что, пока подсказка
// открыта, остальная страница не выделяется (lockPageSelection).

// Запрет выделения страницы общий для всех подсказок. Когда открывается
// соседняя, события toggle закрытой и открытой приходят в любом порядке,
// поэтому прежние стили <html> запоминает первая взявшая запрет,
// а возвращает последняя отпустившая.
let pageSelectionLocks = 0;
let savedPageSelection = null;

export default {
    components: {
        PopoverPanel,
        Eye,
    },

    mixins: [withLang],

    emits: ["update:modelValue"],

    props: {
        // Скрытый текст. null, undefined и пустая строка — компонента нет.
        text: {
            type: String,
            required: true,
        },
        // Открыта ли подсказка. v-model необязателен: компонент сам
        // открывается и закрывается.
        modelValue: {
            type: Boolean,
            default: false,
        },
    },

    data() {
        return {
            // Держит ли эта подсказка запрет выделения страницы.
            holdsPageSelectionLock: false,
        };
    },

    computed: {
        normalizedText() {
            return typeof this.text === "string" ? this.text : "";
        },

        isEmpty() {
            return this.normalizedText === "";
        },
    },

    beforeUnmount() {
        this.unlockPageSelection();
    },

    methods: {
        // Запрет — по фактическому состоянию панели (toggle PopoverPanel),
        // а не по update:modelValue: входящий modelValue эхом не
        // возвращается, и подсказка, открытая или закрытая через v-model,
        // запрет иначе не поставила бы или не сняла.
        onPanelToggle(isOpen) {
            if (isOpen) {
                this.lockPageSelection();
            } else {
                this.unlockPageSelection();
            }
        },

        // Подсказка лежит в DOM внутри страницы, а выделение браузер
        // продолжает по порядку DOM: тройной клик или протяжка мышью
        // за конец текста увели бы выделение в следующую строку таблицы.
        // Пока подсказка открыта, остальная страница не выделяется,
        // и выделение остаётся в подсказке. Оператор ничего не теряет:
        // клик вне подсказки её закрывает и снимает запрет.
        lockPageSelection() {
            if (this.holdsPageSelectionLock) {
                return;
            }

            this.holdsPageSelectionLock = true;
            pageSelectionLocks += 1;

            if (pageSelectionLocks === 1) {
                const style = document.documentElement.style;

                savedPageSelection = {
                    userSelect: style.userSelect,
                    webkitUserSelect: style.webkitUserSelect,
                };
                style.userSelect = "none";
                style.webkitUserSelect = "none";
            }
        },

        unlockPageSelection() {
            if (!this.holdsPageSelectionLock) {
                return;
            }

            this.holdsPageSelectionLock = false;
            pageSelectionLocks -= 1;

            if (pageSelectionLocks === 0) {
                Object.assign(document.documentElement.style, savedPageSelection);
                savedPageSelection = null;
            }
        },
    },
};
</script>

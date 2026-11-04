<template>
    <!-- Поле поиска над пунктами: при прокрутке длинного списка
         оно остаётся на месте, прокручиваются пункты. -->
    <div class="bb:sticky bb:top-0 bb:min-w-56 bb:px-2 bb:py-2 bb:bg-white bb:border-b bb:border-gray-200">
        <div class="bb:relative">
            <!-- type="text", а не "search": у search Escape в Chrome
                 сначала стирает запрос, а не закрывает список, и
                 браузер рисует свой крестик рядом с ластиком.
                 Enter гасится: фильтр может стоять внутри формы,
                 и Enter в поле отправил бы её. -->
            <input
                ref="input"
                type="text"
                autocomplete="off"
                v-model="query"
                :placeholder="texts.search"
                :aria-label="texts.search"
                class="bb:w-full bb:pl-3 bb:pr-9 bb:py-2 bb:text-sm bb:field-frame bb:focus:focus-ring"
                @keydown.enter.prevent
            />
            <cross-button
                ref="eraser"
                v-show="query !== ''"
                size="small"
                :lang="lang"
                @clicked="clearQuery"
                class="bb:absolute bb:right-0 bb:top-0 bb:pr-2 bb:h-full"
            />
        </div>
    </div>
</template>

<script>
import { withLang } from "../lang.js";
import CrossButton from "./CrossButton.vue";

// Поле поиска над пунктами списка с ластиком запроса. Запрос — через v-model.
// Логику поиска ведёт миксин withListSearch; пакет компонент не экспортирует.
export default {
    components: {
        CrossButton,
    },

    mixins: [withLang],

    emits: ["update:modelValue"],

    props: {
        modelValue: {
            type: String,
            default: "",
        },
    },

    computed: {
        // Нативный v-model откладывает обновление до compositionend, пока
        // идёт ввод через IME.
        query: {
            get() {
                return this.modelValue;
            },
            set(value) {
                this.$emit("update:modelValue", value);
            },
        },
    },

    methods: {
        // Страница к полю не прокручивается: её прокрутка закрыла бы список.
        focus() {
            this.$refs.input.focus({ preventScroll: true });
        },

        moveCaretToEnd() {
            const end = this.$refs.input.value.length;
            this.$refs.input.setSelectionRange(end, end);
        },

        inputElement() {
            return this.$refs.input;
        },

        eraserElement() {
            return this.$refs.eraser.$el;
        },

        // Ластик поля: запрос пуст, фокус остаётся в поле.
        clearQuery() {
            this.query = "";
            this.$refs.input.focus();
        },
    },
};
</script>

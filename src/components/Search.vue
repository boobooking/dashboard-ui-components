<template>
    <div class="bb-dashboard-ui bb:flex bb:flex-none">
        <div class="bb:flex bb:w-full bb:flex-col bb:border bb:border-white bb:bg-white">
            <element-header :text="header" :is-required="isRequired" :is-loading="isLoading" />
            <div class="bb:relative bb:flex bb:h-full bb:w-full">
                <label class="bb:flex bb:w-full bb:h-full bb:items-center bb:justify-center">
                    <input
                        ref="input"
                        class="bb:flex bb:w-full bb:h-full bb:px-3 bb:py-2 bb:cursor-pointer bb:truncate bb:focus:focus-ring bb:border-none"
                        v-model.trim="search"
                        @input="startSearch"
                    />
                </label>
                <!-- Ластик рядом с <label>, а не внутри: браузер собирает имя
                     поля из всего текста <label>, и подпись ластика «Очистить»
                     стала бы именем поля. -->
                <cross-button
                    v-show="inputNeedsEraser"
                    ref="eraser"
                    size="small"
                    @clicked="clearInput"
                    class="bb:absolute bb:right-0 bb:top-0 bb:pr-2 bb:h-full"
                />
            </div>
        </div>
    </div>
</template>

<script>
import ElementHeader from "./ElementHeader.vue";
import CrossButton from "./CrossButton.vue";

export default {
    components: {
        ElementHeader,
        CrossButton,
    },

    emits: ["update:modelValue", "changed"],

    props: {
        modelValue: {
            type: String,
            default: '',
        },
        header: {
            type: String,
            required: true,
        },
        isRequired: {
            type: Boolean,
            default: false,
        },
        isLoading: {
            type: Boolean,
            default: false,
        }
    },

    data() {
        return {
            search: this.modelValue ?? ''
        };
    },

    computed: {
        inputNeedsEraser() {
            return this.search.length > 0
        }
    },

    watch: {
        // Значение пришло от родителя, поэтому без эмитов: update:modelValue
        // вернул бы его обратно эхом, а changed запустил бы лишний перезапрос.
        // null и undefined — как пустая строка: родитель мог сбросить значение в null.
        modelValue(value) {
            this.search = value ?? ''
        },
    },

    methods: {
        // Ластик пропадает после очистки, и фокус с клавиатуры упал бы на body:
        // возвращаем его на поле поиска. Касание и мышь :focus-visible не дают,
        // и экранная клавиатура не выезжает.
        moveFocusFromEraser() {
            const eraser = this.$refs.eraser.$el
            if (document.activeElement === eraser && eraser.matches(':focus-visible')) {
                this.$refs.input.focus({ preventScroll: true })
            }
        },

        clearInput() {
            this.moveFocusFromEraser()
            this.search = ''
            this.startSearch()
        },
        startSearch() {
            this.$emit('update:modelValue', this.search);
            this.$emit('changed');
        }
    },
};
</script>

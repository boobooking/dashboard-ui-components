<template>
    <div class="bb-dashboard-ui" :class="$attrs.class" :style="$attrs.style">
        <div class="bb:flex bb:items-start bb:justify-between bb:gap-3">
            <div class="bb:flex bb:items-center">
                <label :for="textareaId()" class="bb:block bb:text-sm bb:font-medium bb:leading-5 bb:text-gray-700" v-text="label"/>
                <dot v-show="isRequired" color="red-pale" class="bb:ml-2"/>
            </div>
            <!-- h-5 — высота строки подписи: счётчик по центру первой строки,
                 и строка со счётчиком не выше строки без него. -->
            <div v-if="hasCounter" class="bb:flex bb:h-5 bb:shrink-0 bb:items-center">
                <character-counter :id="`${textareaId()}-counter`" :text="text" :limit="characterLimit" :lang="lang"/>
            </div>
        </div>
        <textarea
            v-model="value"
            v-bind="{ ...textareaAttrs() }"
            :id="textareaId()"
            :aria-describedby="textareaDescribedBy()"
            :rows="textareaRows"
            class="bb:mt-1 bb:block bb:w-full bb:rounded-md bb:border bb:border-gray-300 bb:bg-white bb:px-3 bb:py-2 bb:text-sm bb:leading-5 bb:shadow-xs bb:focus:focus-ring bb:resize-y"
            @input="text = $event.target.value"
        />
        <field-description v-if="hasDescription()" :id="descriptionId(textareaId())"><slot name="description">{{ description }}</slot></field-description>
    </div>
</template>

<script>
import { useId } from "vue";
import { withFieldDescription } from "../fieldDescription.js";
import { withLang } from "../lang.js";
import CharacterCounter from "./CharacterCounter.vue";
import Dot from "./Dot.vue";
import FieldDescription from "./FieldDescription.vue";

const DEFAULT_ROWS = 6;

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

// Так переносы приводит сам <textarea>: счётчик до первого ввода
// показывает то же число, что после.
// Не строка (null, число, объект) — пустая строка: компонент не падает.
const normalizeLineBreaks = (value) => (typeof value === "string" ? value.replace(/\r\n?/g, "\n") : "");

// Многострочное поле с подписью над ним. Устроено как FormInput: значение —
// через v-model, isRequired только рисует красную точку (атрибутов required
// и aria-* поле от него не получает). Необязательный счётчик символов
// считает текст, который сейчас в поле, и только показывает его: maxlength
// от characterLimit не ставится.
export default {
    components: { CharacterCounter, Dot, FieldDescription },

    mixins: [withFieldDescription, withLang],

    // Атрибуты приложения (placeholder, disabled, maxlength, слушатели)
    // ставятся на поле, а не на корень; class и style — на корень явно.
    inheritAttrs: false,

    props: {
        modelValue: {
            type: String,
            default: "",
        },
        label: {
            type: String,
            required: true,
        },
        isRequired: {
            type: Boolean,
            default: false,
        },
        rows: {
            type: Number,
            default: DEFAULT_ROWS,
            validator: isPositiveInteger,
        },
        characterLimit: {
            type: Number,
            default: null,
            validator: isPositiveInteger,
        },
    },

    emits: ["update:modelValue"],

    // useId() уникален в пределах приложения: подпись каждого поля
    // указывает на своё поле, а не на первое попавшееся.
    setup() {
        return {
            generatedId: useId(),
        };
    },

    data() {
        return {
            text: normalizeLineBreaks(this.modelValue),
        };
    },

    computed: {
        // Нативный v-model откладывает set до compositionend, пока идёт ввод
        // через IME; @input обновляет text и во время composition. Поле
        // привязано к text, а не к пропу: иначе страница без v-model стирала
        // бы ввод при перерисовке.
        value: {
            get() {
                return this.text;
            },
            set(value) {
                this.$emit("update:modelValue", value);
            },
        },

        textareaRows() {
            return isPositiveInteger(this.rows) ? this.rows : DEFAULT_ROWS;
        },

        hasCounter() {
            return isPositiveInteger(this.characterLimit);
        },
    },

    watch: {
        modelValue(value) {
            this.text = normalizeLineBreaks(value);
        },
    },

    methods: {
        // Методы, как forwardedAttrs() у PageCard: шаблон вызывает их
        // в каждом рендере.
        textareaId() {
            return this.$attrs.id ?? this.generatedId;
        },

        // aria-describedby страницы не теряется: id страницы, описания и
        // счётчика через пробел.
        textareaDescribedBy() {
            const ids = [
                this.$attrs["aria-describedby"],
                this.descriptionId(this.textareaId()),
                this.hasCounter ? `${this.textareaId()}-counter` : null,
            ].filter(Boolean);

            return ids.length > 0 ? ids.join(" ") : null;
        },

        textareaAttrs() {
            return Object.fromEntries(
                Object.entries(this.$attrs).filter(([name]) => !["class", "style", "id"].includes(name)),
            );
        },
    },
};
</script>

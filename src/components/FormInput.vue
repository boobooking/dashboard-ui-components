<template>
    <div class="bb-dashboard-ui" :class="$attrs.class" :style="$attrs.style">
        <div class="bb:flex bb:items-center">
            <label :for="inputId()" class="bb:block bb:text-sm bb:font-medium bb:leading-5 bb:text-gray-700" v-text="label"/>
            <dot v-show="isRequired" color="red-pale" class="bb:ml-2"/>
        </div>
        <input
            v-model="value"
            v-bind="{ ...inputAttrs() }"
            :id="inputId()"
            :aria-describedby="inputDescribedBy()"
            :type="inputType"
            class="bb:mt-1 bb:block bb:w-full bb:field-frame bb:px-3 bb:py-2 bb:text-sm bb:focus:focus-ring"
            :class="fieldClass"
        />
        <field-description v-if="hasDescription()" :id="descriptionId(inputId())"><slot name="description">{{ description }}</slot></field-description>
    </div>
</template>

<script>
import { useId } from "vue";
import { withFieldDescription } from "../fieldDescription.js";
import Dot from "./Dot.vue";
import FieldDescription from "./FieldDescription.vue";

const TYPES = ["text", "email", "password", "tel", "url", "search"];

// Поле ввода с подписью над ним. Значение — через v-model. isRequired
// только рисует красную точку: атрибутов required и aria-* поле от него
// не получает.
export default {
    components: { Dot, FieldDescription },

    mixins: [withFieldDescription],

    // Атрибуты приложения (placeholder, autocomplete, disabled, слушатели)
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
        type: {
            type: String,
            default: "text",
            validator: (value) => TYPES.includes(value),
        },
        isRequired: {
            type: Boolean,
            default: false,
        },
        // Классы приложения для самого поля: подпись остаётся стилем пакета.
        // Пишутся без префикса bb:, как class на корне.
        fieldClass: {
            type: [String, Array, Object],
            default: null,
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

    computed: {
        // Нативный v-model откладывает обновление до compositionend, пока
        // идёт ввод через IME.
        value: {
            get() {
                return this.modelValue ?? "";
            },
            set(value) {
                this.$emit("update:modelValue", value);
            },
        },

        inputType() {
            return TYPES.includes(this.type) ? this.type : "text";
        },
    },

    methods: {
        // Методы, как forwardedAttrs() у PageCard: шаблон вызывает их
        // в каждом рендере.
        inputId() {
            return this.$attrs.id ?? this.generatedId;
        },

        // aria-describedby страницы не теряется: оба id через пробел.
        inputDescribedBy() {
            const ids = [this.$attrs["aria-describedby"], this.descriptionId(this.inputId())].filter(Boolean);

            return ids.length > 0 ? ids.join(" ") : null;
        },

        inputAttrs() {
            return Object.fromEntries(
                Object.entries(this.$attrs).filter(([name]) => !["class", "style", "id"].includes(name)),
            );
        },
    },
};
</script>

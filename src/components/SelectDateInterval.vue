<template>
    <slot :from="from" :to="to"/>
</template>

<script>
import { withLang } from "../lang.js";

// Ядро выбора интервала дат без своей разметки: значения двух дат и правила
// событий. В слот по умолчанию ядро отдаёт поля from и to: значение, update
// с новой датой и подсказку «от» или «до». Поля дат, разделитель, рамки,
// заголовок и подпись рисуют обёртки SelectDateIntervalFilter
// и SelectDateIntervalForm; пакет ядро не экспортирует.
export default {
    // Своего узла у ядра нет: атрибуты потребителя остаются на обёртке.
    inheritAttrs: false,

    mixins: [withLang],

    emits: ["update:dateFrom", "update:dateTo", "changed"],

    props: {
        dateFrom: {
            type: String,
            default: "",
        },
        dateTo: {
            type: String,
            default: "",
        },
    },

    data() {
        return {
            userDateFrom: this.dateFrom,
            userDateTo: this.dateTo,
        };
    },

    computed: {
        // Поля слота. update пишет новую дату в локальную копию, события
        // шлют наблюдатели ниже.
        from() {
            return {
                value: this.userDateFrom,
                update: (value) => {
                    this.userDateFrom = value;
                },
                placeholder: this.texts.dateFrom,
            };
        },
        to() {
            return {
                value: this.userDateTo,
                update: (value) => {
                    this.userDateTo = value;
                },
                placeholder: this.texts.dateTo,
            };
        },
    },

    watch: {
        dateFrom(newValue) {
            this.userDateFrom = newValue;
        },
        dateTo(newValue) {
            this.userDateTo = newValue;
        },
        userDateFrom(newValue) {
            this.$emit("update:dateFrom", newValue);
            if (this.dateFrom !== newValue) {
                this.$emit("changed");
            }
        },
        userDateTo(newValue) {
            this.$emit("update:dateTo", newValue);
            if (this.dateTo !== newValue) {
                this.$emit("changed");
            }
        },
    },
};
</script>

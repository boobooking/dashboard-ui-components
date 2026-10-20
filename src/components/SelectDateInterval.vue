<template>
    <div :class="look === 'form' ? 'bb-dashboard-ui bb:grid bb:grid-cols-2 bb:gap-3' : 'bb-dashboard-ui bb:flex bb:h-full bb:divide-x bb:divide-gray-200'">
        <pick-day
            v-model="userDateFrom"
            :class="look === 'form' ? 'bb:h-9.5 bb:min-w-0 bb:pl-3 bb:rounded-md bb:border bb:border-gray-300 bb:bg-white bb:shadow-xs bb:text-sm' : 'bb:flex-1 bb:min-w-36 bb:pl-3'"
            :placeholder-text="texts.dateFrom"
            :lang="resolvedLang"
        />
        <pick-day
            v-model="userDateTo"
            :class="look === 'form' ? 'bb:h-9.5 bb:min-w-0 bb:pl-3 bb:rounded-md bb:border bb:border-gray-300 bb:bg-white bb:shadow-xs bb:text-sm' : 'bb:flex-1 bb:min-w-36 bb:pl-3'"
            :placeholder-text="texts.dateTo"
            :lang="resolvedLang"
        />
    </div>
</template>

<script>
import PickDay from "./PickDay.vue";
import { withLang } from "../lang.js";

export default {
    components: {
        PickDay,
    },

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
        // Вид ядра: filter — два поля в ряд под заголовком обёртки фильтра,
        // form — два поля, каждое в своей рамке.
        look: {
            type: String,
            default: "filter",
            validator: (value) => ["filter", "form"].includes(value),
        },
    },

    data() {
        return {
            userDateFrom: this.dateFrom,
            userDateTo: this.dateTo,
        };
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

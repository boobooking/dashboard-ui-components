<template>
    <div class="bb-dashboard-ui flex">
        <div class="flex border border-white">
            <div class="flex flex-col min-w-72 w-72 bg-white h-full">
                <element-header :text="header" :is-required="isRequired" :is-loading="isLoading"/>
                <div class="flex h-full divide-x divide-gray-200">
                    <pick-day v-model:day="userDateFrom" class="flex-1 min-w-36 pl-3" placeholder-text="от"/>
                    <pick-day v-model:day="userDateTo" class="flex-1 min-w-36 pl-3" placeholder-text="до"/>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import ElementHeader from "./ElementHeader.vue";
import PickDay from "./PickDay.vue";

export default {
    components: {
        ElementHeader,
        PickDay,
    },

    emits: ["update:dateFrom", "update:dateTo", "updated"],

    props: {
        dateFrom: {
            type: String,
            default: "",
            required: true,
        },
        dateTo: {
            type: String,
            default: "",
            required: true,
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
                this.$emit("updated");
            }
        },
        userDateTo(newValue) {
            this.$emit("update:dateTo", newValue);
            if (this.dateTo !== newValue) {
                this.$emit("updated");
            }
        },
    },
};
</script>

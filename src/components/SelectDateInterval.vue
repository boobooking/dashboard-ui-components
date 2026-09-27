<template>
    <div class="bb-dashboard-ui bb:flex">
        <div class="bb:flex bb:border bb:border-white">
            <div class="bb:flex bb:flex-col bb:min-w-72 bb:w-72 bb:bg-white bb:h-full">
                <element-header :text="header" :is-required="isRequired" :is-loading="isLoading"/>
                <div class="bb:flex bb:h-full bb:divide-x bb:divide-gray-200">
                    <pick-day v-model="userDateFrom" class="bb:flex-1 bb:min-w-36 bb:pl-3" placeholder-text="от"/>
                    <pick-day v-model="userDateTo" class="bb:flex-1 bb:min-w-36 bb:pl-3" placeholder-text="до"/>
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

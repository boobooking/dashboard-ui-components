<template>
    <div class="bb:flex bb:flex-col bb:grow bb:bg-white">
        <div class="bb:relative bb:flex bb:w-full bb:h-full">
            <!-- Список — PopoverPanel под кнопкой: открывает и закрывает его
                 браузер по popovertarget кнопки. Обёртка кнопки занимает
                 место кнопки рядом с ластиком. Цвет текста панель наследует
                 от страницы: у [popover] браузер ставит свой, а у пунктов
                 списка цвета нет. Прокрутка в конце длинного списка
                 не уходит на страницу: её прокрутка закрыла бы список. -->
            <popover-panel
                class="bb:flex bb:w-full bb:h-full"
                :model-value="isOpen"
                align="start"
                arrows
                :find-selected="findSelected"
                return-focus
                panel-class="bb:bg-white bb:text-inherit bb:border bb:border-gray-200 bb:rounded-md bb:shadow-lg bb:overscroll-contain"
                @update:model-value="$emit('update:isOpen', $event)"
            >
                <template #trigger="trigger">
                    <button
                        type="button"
                        :id="trigger.id"
                        :popovertarget="trigger.popovertarget"
                        class="bb:flex bb:w-full bb:h-full bb:items-center bb:focus:outline-hidden bb:cursor-pointer"
                    >
                        <span
                            class="bb:flex bb:w-full bb:h-full bb:pl-3 bb:pr-12 bb:py-2 bb:items-center bb:whitespace-nowrap bb:leading-none"
                            v-text="title"
                        />
                    </button>
                </template>
                <template #default>
                    <slot></slot>
                </template>
            </popover-panel>
            <eraser v-if="needsEraser" @click="$emit('erased')" class="bb:pr-2 bb:h-full"></eraser>
        </div>
    </div>
</template>

<script>
import PopoverPanel from "./PopoverPanel.vue";
import Eraser from "./Eraser.vue";

export default {
    components: { PopoverPanel, Eraser },

    emits: ["update:isOpen", "erased"],

    props: {
        isOpen: {
            type: Boolean,
            default: false,
        },
        title: {
            type: String,
            default: null,
        },
        hasValue: {
            type: Boolean,
            default: true,
        },
        // Выбранный пункт списка: от него считают стрелки.
        findSelected: {
            type: Function,
            default: () => null,
        },
    },

    computed: {
        needsEraser() {
            if (this.isOpen) {
                return false;
            }

            return this.hasValue;
        },
    },
};
</script>

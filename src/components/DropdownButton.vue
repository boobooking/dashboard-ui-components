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
                :find-stops="findStops"
                :keep-size="keepSize"
                return-focus
                panel-class="bb:bg-white bb:text-inherit bb:border bb:border-gray-200 bb:rounded-md bb:shadow-lg bb:overscroll-contain"
                @update:model-value="$emit('update:isOpen', $event)"
                @toggle="$emit('toggle', $event)"
            >
                <template #trigger="trigger">
                    <button
                        type="button"
                        :id="trigger.id"
                        :popovertarget="trigger.popovertarget"
                        class="bb:flex bb:w-full bb:h-full bb:items-center bb:focus:outline-hidden bb:cursor-pointer"
                    >
                        <!-- Содержимое кнопки не ловит указатель и без курсора-руки:
                             см. README, «Клавиатурная навигация». -->
                        <span
                            class="bb:flex bb:w-full bb:h-full bb:pl-3 bb:pr-12 bb:py-2 bb:items-center bb:whitespace-nowrap bb:leading-none bb:pointer-events-none bb:cursor-default"
                            :class="{ 'bb:min-h-[calc(1em+1rem)]': withStableHeight }"
                            v-text="title"
                        />
                    </button>
                </template>
                <template #default>
                    <slot></slot>
                </template>
            </popover-panel>
            <cross-button v-if="needsEraser" size="small" :lang="lang" @clicked="$emit('erased')" class="bb:absolute bb:right-0 bb:top-0 bb:pr-2 bb:h-full"></cross-button>
        </div>
    </div>
</template>

<script>
import PopoverPanel from "./PopoverPanel.vue";
import CrossButton from "./CrossButton.vue";

export default {
    components: { PopoverPanel, CrossButton },

    emits: ["update:isOpen", "erased", "toggle"],

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
        // Остановки стрелок вместо всех кнопок и ссылок списка (PopoverPanel).
        findStops: {
            type: Function,
            default: null,
        },
        // Список не сужается и открытый вверх не укорачивается (PopoverPanel).
        keepSize: {
            type: Boolean,
            default: false,
        },
        // Кнопка одной высоты пустая и с надписью: выбор первого пункта
        // не растит её под открытым списком. Наименьшая высота надписи —
        // строка (leading-none, 1em) и отступы py-2 (1rem), при любом
        // размере шрифта.
        withStableHeight: {
            type: Boolean,
            default: false,
        },
        // Язык подписи ластика; без него — язык плагина (CrossButton).
        lang: {
            type: String,
            default: null,
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

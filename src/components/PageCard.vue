<template>
    <div
        class="bb:box-border bb:relative bb:my-6 bb:mx-auto bb:bg-white bb:shadow-xl bb:sm:max-w-xl bb:sm:rounded-lg"
        :class="canGoBack ? 'bb:[--bb-closer-space:3.5rem] bb:md:[--bb-closer-space:0px]' : 'bb:[--bb-closer-space:0px]'"
    >
        <!-- Место под крестик для заголовка страницы: --bb-closer-space — 3.5rem,
             пока крестик в углу (ниже md), 0 — когда он снаружи или его нет. -->
        <slot></slot>

        <!-- После слота: в углу карточки крестик рисуется поверх содержимого.
             tabindex и aria-label перекрывают собственные атрибуты Closer. -->
        <closer
            v-if="canGoBack"
            class="bb:absolute bb:top-0 bb:right-0 bb:mt-4 bb:mr-4 bb:w-8 bb:h-8 bb:sm:mt-6 bb:md:right-auto bb:md:left-full bb:md:mr-0 bb:md:ml-4 bb:rounded-md bb:focus-visible:ring-2 bb:focus-visible:ring-indigo-500"
            tabindex="0"
            :aria-label="texts.back"
            @clicked="goBack"
        />
    </div>
</template>

<script>
import Closer from "./Closer.vue";
import { withLang } from "../lang.js";

// Карточка отдельной страницы с крестиком «назад по истории». У корня нет
// bb-dashboard-ui: ресет пакета накрыл бы разметку страницы в слоте, в том
// числе поля @tailwindcss/forms. box-border задан явно — ресет его не даёт,
// а без preflight приложения карточка с отступами стала бы шире.
export default {
    components: { Closer },

    mixins: [withLang],

    data() {
        return {
            // Крестик есть, если в истории вкладки больше одной записи — как на
            // страницах до компонента. Это число записей, включая записи
            // впереди текущей, а не гарантия, что назад есть куда. Читается
            // один раз при создании.
            canGoBack: window.history.length > 1,
        };
    },

    methods: {
        goBack() {
            window.history.back();
        },
    },
};
</script>

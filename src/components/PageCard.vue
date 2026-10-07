<template>
    <div
        class="bb:box-border bb:relative bb:my-6 bb:mx-auto bb:bg-white bb:shadow-xl bb:sm:rounded-lg"
        :class="[
            {
                'bb:sm:max-w-xl': resolvedWidth === 'xl',
                'bb:sm:max-w-4xl': resolvedWidth === '4xl',
                'bb:sm:max-w-7xl': resolvedWidth === '7xl',
            },
            canClose
                ? {
                    'bb:[--bb-closer-space:3.5rem] bb:md:[--bb-closer-space:0px]': resolvedWidth === 'xl',
                    'bb:[--bb-closer-space:3.5rem] bb:lg:[--bb-closer-space:0px]': resolvedWidth === '4xl',
                    'bb:[--bb-closer-space:3.5rem] bb:2xl:[--bb-closer-space:0px]': resolvedWidth === '7xl',
                }
                : 'bb:[--bb-closer-space:0px]',
            $attrs.class,
        ]"
        :style="$attrs.style"
        v-bind="{ ...forwardedAttrs() }"
    >
        <!-- Место под крестик для заголовка страницы: --bb-closer-space — 3.5rem,
             пока крестик в углу (ниже порога ширины), 0 — когда он снаружи или
             его нет. -->
        <slot :close="close"></slot>

        <!-- После слота: в углу карточки крестик рисуется поверх содержимого.
             tabindex и aria-label перекрывают собственные атрибуты Closer.
             Порог, от которого крестик снаружи, зависит от ширины: снаружи
             нужно 1rem зазора и 2rem крестика по обе стороны карточки. -->
        <closer
            v-if="canClose"
            class="bb:absolute bb:top-0 bb:right-0 bb:mt-4 bb:mr-4 bb:w-8 bb:h-8 bb:sm:mt-6 bb:rounded-md bb:focus-visible:ring-2 bb:focus-visible:ring-indigo-500"
            :class="{
                'bb:md:right-auto bb:md:left-full bb:md:mr-0 bb:md:ml-4': resolvedWidth === 'xl',
                'bb:lg:right-auto bb:lg:left-full bb:lg:mr-0 bb:lg:ml-4': resolvedWidth === '4xl',
                'bb:2xl:right-auto bb:2xl:left-full bb:2xl:mr-0 bb:2xl:ml-4': resolvedWidth === '7xl',
            }"
            tabindex="0"
            :aria-label="texts.back"
            @clicked="close"
        />
    </div>
</template>

<script>
import Closer from "./Closer.vue";
import { withLang } from "../lang.js";
import { assign, normalizeAddress, pathOf, release, setFallback, sync } from "../windows.js";

const WIDTHS = ["xl", "4xl", "7xl"];

// Карточка отдельной страницы. Крестик и close() ведут туда, откуда
// карточку открыли: адрес прежней страницы помнит окно плагина
// dashboardUi (src/windows.js), а без него — fallback-url. Истории
// браузера карточка не касается. У корня нет bb-dashboard-ui: ресет
// пакета накрыл бы разметку страницы в слоте, в том числе поля
// @tailwindcss/forms. box-border задан явно — ресет его не даёт, а без
// preflight приложения карточка с отступами стала бы шире.
export default {
    components: { Closer },

    mixins: [withLang],

    // Когда PageCard — постоянный макет Inertia, ему атрибутами приходят
    // пропы страницы, и в разметку они попасть не должны. Классы и стиль
    // приложения ставятся на корень явно, data-* и aria-* — через
    // forwardedAttrs(). Комментарий стоит здесь, а не над корнем шаблона:
    // комментарий перед корнем превратил бы его во фрагмент.
    inheritAttrs: false,

    props: {
        width: {
            type: String,
            default: "xl",
            validator: (value) => WIDTHS.includes(value),
        },
        // Куда закрываться, если адреса возврата нет: F5, новая вкладка,
        // прямая ссылка, приложение без currentUrl.
        fallbackUrl: {
            type: String,
            default: null,
        },
        // Общий ключ окна для карточки из нескольких страниц; без него —
        // путь страницы.
        windowKey: {
            type: String,
            default: null,
        },
    },

    data() {
        return {
            // Адрес возврата окна карточки; null — окна нет или открыли
            // без прежней страницы. Назначается после монтирования: на
            // сервере окон нет.
            returnAddress: null,
        };
    },

    computed: {
        resolvedWidth() {
            return WIDTHS.includes(this.width) ? this.width : "xl";
        },

        windows() {
            return this.uiSettings.windows;
        },

        resolvedKey() {
            if (this.windowKey !== null && this.windowKey !== "") {
                return this.windowKey;
            }

            return this.windows === null ? null : pathOf(this.windows.page.address);
        },

        target() {
            if (this.returnAddress !== null) {
                return this.returnAddress;
            }

            return this.fallbackUrl === null || this.fallbackUrl === "" ? null : this.fallbackUrl;
        },

        canClose() {
            return this.target !== null;
        },
    },

    watch: {
        fallbackUrl() {
            if (this.windows !== null) {
                setFallback(this.windows.state, this, this.fallbackAddress());
            }
        },
    },

    mounted() {
        if (this.windows === null) {
            return;
        }

        this.returnAddress = assign(this.windows.state, this, this.resolvedKey, this.fallbackAddress()).returnAddress;

        // После отрисовки: карточку, которую уносит переход, к этому
        // моменту уже размонтировали, её слежение остановлено, и окно
        // новой страницы она себе не возьмёт.
        this.$watch(
            () => [this.windows.page.number, this.resolvedKey],
            () => this.syncWindow(),
            { flush: "post" },
        );
    },

    beforeUnmount() {
        if (this.windows !== null) {
            release(this.windows.state, this);
        }
    },

    methods: {
        fallbackAddress() {
            return normalizeAddress(this.fallbackUrl, window.location.origin);
        },

        // Атрибуты приложения, которые не могут быть пропами страницы:
        // пропы Inertia — имена вида group и orders, без data- и aria-.
        forwardedAttrs() {
            return Object.fromEntries(
                Object.entries(this.$attrs).filter(([name]) => name.startsWith("data-") || name.startsWith("aria-")),
            );
        },

        syncWindow() {
            const result = sync(this.windows.state, this, this.resolvedKey, this.fallbackAddress());

            if (result.rejected) {
                console.warn(`PageCard: ключ окна сменился на «${this.resolvedKey}» без смены страницы — карточка остаётся в окне «${result.key}»`);
            }

            this.returnAddress = result.window.returnAddress;
        },

        // То же, что крестик: «Отмена» страницы и возврат после успешного
        // действия. Окно закрывается не здесь, а когда страница-цель
        // показана: неуспешный переход оставляет его открытым.
        close() {
            const target = this.target;

            if (target === null) {
                return;
            }

            const navigate = this.uiSettings.navigate;

            if (navigate === null) {
                window.location.assign(target);

                return;
            }

            navigate(target);
        },
    },
};
</script>

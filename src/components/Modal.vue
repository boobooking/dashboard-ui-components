<template>
    <!-- Корень виден всегда: если прятать его вместе с isOpen, он успевает получить
         display none раньше, чем доиграют переходы оверлея и панели, а в скрытом
         поддереве переходы не запускаются. Закрытым он не перехватывает клики. -->
    <div class="bb-dashboard-ui bb:fixed bb:inset-0 bb:overflow-y-auto bb:z-20" :class="{ 'bb:pointer-events-none': !isOpen }">
        <div class="bb:min-h-screen bb:text-center">
            <!-- Overlay -->
            <transition
                enter-active-class="bb:ease-out bb:duration-300"
                enter-from-class="bb:opacity-0"
                enter-to-class="bb:opacity-100"
                leave-active-class="bb:ease-in bb:duration-200"
                leave-from-class="bb:opacity-100"
                leave-to-class="bb:opacity-0"
            >
                <div v-show="isOpen" class="bb:fixed bb:inset-0 bb:transition-opacity">
                    <div class="bb:absolute bb:inset-0 bb:bg-gray-500 bb:opacity-75"></div>
                </div>
            </transition>

            <!-- This element is to trick the browser into centering the modal contents. -->
            <span class="bb:inline-block bb:align-middle bb:h-screen"></span>

            <!-- Modal panel. relative поднимает панель над оверлеем: оба лежат в
                 одном контексте наложения, и без позиционирования панель рисуется
                 раньше — оверлей затеняет её и перехватывает клики. -->
            <transition
                enter-active-class="bb:ease-out bb:duration-300"
                enter-from-class="bb:opacity-0 bb:scale-95"
                enter-to-class="bb:opacity-100 bb:scale-100"
                leave-active-class="bb:ease-in bb:duration-200"
                leave-from-class="bb:opacity-100 bb:scale-100"
                leave-to-class="bb:opacity-0 bb:scale-95"
            >
                <div
                    v-show="isOpen"
                    ref="panel"
                    class="bb:relative bb:inline-block bb:align-middle bb:my-8 bb:max-w-lg bb:w-full bb:bg-white bb:rounded-lg bb:text-left bb:overflow-visible bb:shadow-xl bb:transition-all"
                    role="dialog"
                    aria-modal="true"
                    :aria-labelledby="headingId"
                >
                    <slot></slot>
                </div>
            </transition>
        </div>
    </div>
</template>

<script>
import { holdDialogFocus } from "../dialogFocus.js";

export default {
    // escape — Escape в открытой модалке. Внутреннее событие:
    // ConfirmationModal превращает его в actionCanceled.
    emits: ["escape"],

    props: {
        isOpen: {
            type: Boolean,
            default: false,
        },
        // id заголовка, который подписывает диалог. Заголовок рисует тот, кто
        // кладёт содержимое в слот, поэтому id приходит оттуда же.
        headingId: {
            type: String,
            required: true,
        },
    },

    watch: {
        // Открытая модалка держит фокус (holdDialogFocus), закрытая отпускает.
        // Фокус захватывается в следующем кадре, а не сразу: модалку часто
        // открывает пункт меню, а меню закрывается позже в том же клике, и
        // браузер возвращает фокус на кнопку меню. Наблюдатель срабатывает
        // между слушателями этого клика и запомнил бы пункт, который сейчас
        // спрячется; кадр наступает после всего клика.
        isOpen: {
            flush: "post",
            handler(isOpen) {
                if (isOpen) {
                    this.holdFocus();
                    return;
                }

                this.releaseFocus();
            },
        },
    },

    created() {
        // Кадр, в котором модалка захватит фокус, пока он не наступил.
        this.focusFrame = null;
        // Снимает слушатель клавиш и возвращает фокус, пока модалка его держит.
        this.releaseHeldFocus = null;
    },

    mounted() {
        if (this.isOpen) {
            this.holdFocus();
        }
    },

    beforeUnmount() {
        this.releaseFocus();
    },

    methods: {
        // Не больше одного кадра и одного держателя: повторное открытие без
        // закрытия ничего не делает.
        holdFocus() {
            if (this.focusFrame !== null || this.releaseHeldFocus !== null) {
                return;
            }

            this.focusFrame = requestAnimationFrame(() => {
                this.focusFrame = null;
                this.releaseHeldFocus = holdDialogFocus(this.$refs.panel, () => this.$emit("escape"));
            });
        },

        // Закрытие до кадра отменяет кадр: фокус ещё не захвачен.
        releaseFocus() {
            if (this.focusFrame !== null) {
                cancelAnimationFrame(this.focusFrame);
                this.focusFrame = null;
            }

            if (this.releaseHeldFocus !== null) {
                this.releaseHeldFocus();
                this.releaseHeldFocus = null;
            }
        },
    },
};
</script>

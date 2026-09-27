<template>
    <!-- Корень виден всегда: если прятать его вместе с isOpen, он успевает получить
         display none раньше, чем доиграют переходы оверлея и панели, а в скрытом
         поддереве переходы не запускаются. Закрытым он не перехватывает клики. -->
    <div class="bb-dashboard-ui bb:fixed bb:inset-0 bb:overflow-y-auto bb:z-20" :class="{ 'bb:pointer-events-none': !isOpen }">
        <div class="bb:flex bb:items-end bb:justify-center bb:min-h-screen bb:pt-4 bb:px-4 bb:pb-20 bb:text-center bb:sm:block bb:sm:p-0">
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
            <span class="bb:hidden bb:sm:inline-block bb:sm:align-middle bb:sm:h-screen"></span>

            <!-- Modal panel. relative поднимает панель над оверлеем: оба лежат в
                 одном контексте наложения, и без позиционирования панель рисуется
                 раньше — оверлей затеняет её и перехватывает клики. -->
            <transition
                enter-active-class="bb:ease-out bb:duration-300"
                enter-from-class="bb:opacity-0 bb:translate-y-4 bb:sm:translate-y-0 bb:sm:scale-95"
                enter-to-class="bb:opacity-100 bb:translate-y-0 bb:sm:scale-100"
                leave-active-class="bb:ease-in bb:duration-200"
                leave-from-class="bb:opacity-100 bb:translate-y-0 bb:sm:scale-100"
                leave-to-class="bb:opacity-0 bb:translate-y-4 bb:sm:translate-y-0 bb:sm:scale-95"
            >
                <div
                    v-show="isOpen"
                    class="bb:relative bb:inline-block bb:align-bottom bb:bg-white bb:rounded-lg bb:text-left bb:overflow-visible bb:shadow-xl bb:transition-all bb:sm:my-8 bb:sm:align-middle bb:sm:max-w-lg bb:sm:w-full"
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
export default {
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
};
</script>

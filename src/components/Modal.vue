<template>
    <!-- Корень виден всегда: если прятать его вместе с isOpen, он успевает получить
         display none раньше, чем доиграют переходы оверлея и панели, а в скрытом
         поддереве переходы не запускаются. Закрытым он не перехватывает клики. -->
    <div class="bb-dashboard-ui fixed inset-0 overflow-y-auto z-20" :class="{ 'pointer-events-none': !isOpen }">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <!-- Overlay -->
            <transition
                enter-active-class="ease-out duration-300"
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="ease-in duration-200"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <div v-show="isOpen" class="fixed inset-0 transition-opacity">
                    <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
            </transition>

            <!-- This element is to trick the browser into centering the modal contents. -->
            <span class="hidden sm:inline-block sm:align-middle sm:h-screen"></span>

            <!-- Modal panel. relative поднимает панель над оверлеем: оба лежат в
                 одном контексте наложения, и без позиционирования панель рисуется
                 раньше — оверлей затеняет её и перехватывает клики. -->
            <transition
                enter-active-class="ease-out duration-300"
                enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enter-to-class="opacity-100 translate-y-0 sm:scale-100"
                leave-active-class="ease-in duration-200"
                leave-from-class="opacity-100 translate-y-0 sm:scale-100"
                leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
                <div
                    v-show="isOpen"
                    class="relative inline-block align-bottom bg-white rounded-lg text-left overflow-visible shadow-xl transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
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

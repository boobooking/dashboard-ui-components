// Нажатие крестика CrossButton: кнопка «вдавливается», сжимается и
// возвращается, и только потом компонент сообщает о нажатии событием clicked.
// Иначе нажатия не было бы видно: ластик пропадает сразу после очистки,
// а крестик PageCard уводит со страницы. Анимация — по click, а не по
// :active: Enter, пробел и расширения клавиатурной навигации :active не дают.
// Нажатия во время анимации не считаются: одно нажатие — одно действие.
// При «уменьшении движения» в системе и без Web Animations — без анимации
// и сразу. Компонент объявляет emits: ["clicked"] и вешает press на click
// корня. Внутренний модуль пакета.

const KEYFRAMES = [{ transform: 'scale(1)' }, { transform: 'scale(0.8)' }, { transform: 'scale(1)' }]
const DURATION = 150

export const withPress = {
    created() {
        // Нереактивные поля: в шаблоне они не нужны.
        this.isPressing = false
        this.isUnmounted = false
    },

    beforeUnmount() {
        this.isUnmounted = true
    },

    methods: {
        press() {
            if (this.isPressing) {
                return
            }

            this.isPressing = true
            playPress(this.$el).then(() => {
                this.isPressing = false

                if (!this.isUnmounted) {
                    this.$emit('clicked')
                }
            })
        },
    },
}

// Промис выполняется, когда анимация закончилась или прервана.
function playPress(element) {
    if (typeof element.animate !== 'function' || prefersReducedMotion()) {
        return Promise.resolve()
    }

    const done = () => {}

    return element.animate(KEYFRAMES, { duration: DURATION, easing: 'ease-out' }).finished.then(done, done)
}

function prefersReducedMotion() {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

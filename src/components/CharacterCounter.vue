<template>
    <span class="bb:text-xs bb:leading-4 bb:font-normal bb:text-gray-500 bb:tabular-nums bb:whitespace-nowrap">
        <span aria-hidden="true"><span :class="{ 'bb:text-red-600': isOverLimit }">{{ count }}</span> / {{ limit }}</span>
        <span :id="id" class="bb:sr-only">{{ `${texts.characterCount}: ${count} ${texts.characterCountOf} ${limit}` }}</span>
    </span>
</template>

<script>
import { withLang } from '../lang.js'

// Счётчик символов поля формы. Считает code points, как mb_strlen в Laravel.
// Внутренний компонент пакета: вид задан только здесь. Лимит только
// показывается, проверку его значения делает вызывающее поле. Видимое число
// скрыто от скринридера, он читает текст с id (его поле подключает к себе
// через aria-describedby).
export default {
    mixins: [withLang],

    props: {
        text: {
            type: String,
            default: '',
        },
        limit: {
            type: Number,
            required: true,
        },
        id: {
            type: String,
            default: null,
        },
    },

    computed: {
        count() {
            return Array.from(this.text ?? '').length
        },

        isOverLimit() {
            return this.count > this.limit
        },
    },
}
</script>

<template>
    <div
        class="bb:flex bb:items-stretch bb:h-full bb:w-full bb:min-w-0 bb:pl-3 bb:rounded-[var(--bb-field-radius,0)] bb:has-focus-visible:focus-ring"
        :class="{ 'bb:pr-3': !withEraser }"
        @click="onRootClick"
        @focusin="hasFocus = true"
        @focusout="onFocusOut"
    >
        <span v-if="prefix" class="bb:flex bb:flex-none bb:items-center bb:mr-2 bb:text-gray-400 bb:select-none">{{ prefix }}</span>
        <input
            ref="wholeInput"
            :id="inputId"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            :value="groupedWhole"
            :disabled="isDisabled"
            :aria-label="prefix"
            class="bb:flex-1 bb:w-full bb:min-w-0 bb:bg-transparent bb:text-right bb:tabular-nums bb:focus:outline-hidden"
            @input="onWholeInput"
            @focus="onWholeFocus"
            @click="holdCaret"
            @keydown="onWholeKeydown"
            @keydown.enter="commit"
            @keyup="holdCaret"
            @select="holdCaret"
            @paste.prevent="onPaste"
        />
        <template v-if="digits > 0">
            <span v-show="!isCollapsed" class="bb:flex bb:items-center bb:text-gray-500">{{ separator }}</span>
            <input
                v-show="!isCollapsed"
                ref="fractionInput"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                :value="fraction"
                :disabled="isDisabled"
                :placeholder="'0'.repeat(digits)"
                :aria-label="texts.amountFraction"
                :style="{ width: `${digits}ch` }"
                class="bb:flex-none bb:bg-transparent bb:tabular-nums bb:placeholder-gray-400 bb:focus:outline-hidden"
                @input="onFractionInput"
                @blur="onFractionBlur"
                @keydown.enter="commit"
                @keydown.backspace="onFractionBackspace"
            />
        </template>
        <cross-button
            v-if="withEraser"
            ref="eraser"
            size="small"
            :lang="lang"
            class="bb:h-full bb:pr-2 bb:flex-none"
            :class="{ 'bb:invisible': isEmpty }"
            @mousedown.prevent
            @clicked="erase"
        />
    </div>
</template>

<script>
import CrossButton from "./CrossButton.vue";
import { withLang } from "../lang.js";
import {
    cleanWhole,
    decimalSeparator,
    groupWhole,
    isDecimalKey,
    joinAmount,
    normalizeAmount,
    parsePastedAmount,
    splitAmount,
} from "../amount.js";

// Ядро поля суммы: основная часть, разделитель, копейки и крестик, без рамки.
// Внутри — две строки цифр, наружу — целое в минимальных единицах валюты или
// null. Внутренний компонент пакета.
export default {
    components: { CrossButton },

    mixins: [withLang],

    emits: ["update:modelValue", "changed"],

    props: {
        modelValue: {
            type: Number,
            default: null,
        },
        // Число знаков копеек, у валют без копеек — 0.
        digits: {
            type: Number,
            default: 2,
        },
        // Подсказка слева от суммы, она же имя основной части.
        prefix: {
            type: String,
            default: null,
        },
        // id основной части для внешней подписи <label for>.
        inputId: {
            type: String,
            default: null,
        },
        withEraser: {
            type: Boolean,
            default: true,
        },
        isDisabled: {
            type: Boolean,
            default: false,
        },
    },

    data() {
        const amount = this.isDisabled ? null : normalizeAmount(this.modelValue);

        return {
            ...splitAmount(amount, this.digits),
            hasFocus: false,
        };
    },

    computed: {
        amount() {
            return joinAmount(this.whole, this.fraction, this.digits);
        },

        isEmpty() {
            return this.amount === null;
        },

        isCollapsed() {
            return this.isEmpty && !this.hasFocus;
        },

        groupedWhole() {
            return groupWhole(this.whole, this.resolvedLang);
        },

        separator() {
            return decimalSeparator(this.resolvedLang);
        },
    },

    created() {
        // Нереактивные поля: в шаблоне они не нужны. committed — точка сравнения
        // для changed: сумма на момент прошлого changed или внешней установки.
        this.committed = this.amount;
        this.isUnmounted = false;

        // Один наблюдатель на все три пропа: порядок вызова отдельных watch
        // зависит от порядка обновления пропов, и части пересчитывались бы дважды.
        this.$watch(() => [this.modelValue, this.digits, this.isDisabled], this.syncProps);
    },

    beforeUnmount() {
        this.isUnmounted = true;
    },

    methods: {
        syncProps([value, digits, isDisabled], [previousValue, previousDigits, wasDisabled]) {
            if (isDisabled) {
                this.writeAmount(null, digits);
                this.hasFocus = false;
                return;
            }

            const incoming = normalizeAmount(value);

            if (wasDisabled) {
                this.writeAmount(incoming, digits);
                this.committed = incoming;
                return;
            }

            const current = joinAmount(this.whole, this.fraction, previousDigits);

            // Эхо своего update:modelValue или смена только точности: сумма та
            // же, точка сравнения остаётся, иначе changed после ввода не пришёл бы.
            if (value === previousValue || incoming === current) {
                if (digits !== previousDigits) {
                    this.writeAmount(current, digits);
                }

                return;
            }

            // Внешняя установка: значение уже отражает выдачу, событие не нужно.
            this.writeAmount(incoming, digits);
            this.committed = incoming;
        },

        writeAmount(amount, digits) {
            const { whole, fraction } = splitAmount(amount, digits);

            this.whole = whole;
            this.fraction = fraction;
        },

        // Правка, не изменившая сумму (буква, ноль в конце копеек), событий не даёт.
        applyParts(whole, fraction) {
            const previous = this.amount;

            this.whole = whole;
            this.fraction = fraction;

            if (this.amount !== previous) {
                this.$emit("update:modelValue", this.amount);
            }
        },

        // Значение поля пишется напрямую: если часть не изменилась, Vue не
        // перерисует поле, и буква осталась бы на экране.
        onWholeInput(event) {
            this.applyParts(cleanWhole(event.target.value, this.digits), this.fraction);
            event.target.value = this.groupedWhole;
        },

        onFractionInput(event) {
            const fraction = event.target.value.replace(/\D/g, "").slice(0, this.digits);

            this.applyParts(this.whole, fraction);
            event.target.value = fraction;
        },

        // Браузер выделяет всё поле при Tab уже после события focus, и первая
        // цифра стёрла бы сумму. Это не выделение пользователя, поэтому курсор
        // ставится в конец безусловно и в следующем кадре.
        onWholeFocus() {
            requestAnimationFrame(() => {
                const input = this.$refs.wholeInput;

                if (document.activeElement === input) {
                    input.setSelectionRange(input.value.length, input.value.length);
                }
            });
        },

        // Курсор основной части всегда в конце. Выделение всей части остаётся:
        // сумму можно скопировать, а ввод и вставка её заменят.
        holdCaret() {
            const input = this.$refs.wholeInput;
            const end = input.value.length;
            const isAllSelected = input.selectionStart === 0 && input.selectionEnd === end;

            if (!isAllSelected && input.selectionStart !== end) {
                input.setSelectionRange(end, end);
            }
        },

        // Отмена по умолчанию нужна в обоих переходах фокуса: браузер применяет
        // нажатие уже к полю, в котором оказался фокус.
        onWholeKeydown(event) {
            this.holdCaret();

            if (this.digits > 0 && isDecimalKey(event.key, this.resolvedLang)) {
                event.preventDefault();
                this.$refs.fractionInput.focus();
            }
        },

        onFractionBackspace(event) {
            if (this.fraction === "") {
                event.preventDefault();
                this.$refs.wholeInput.focus();
            }
        },

        onFractionBlur() {
            if (this.fraction === "") {
                return;
            }

            this.fraction = this.fraction.padEnd(this.digits, "0");
            this.whole = this.whole || "0";
        },

        // Отклонённая вставка не меняет поле: сумма не должна молча стать другой.
        onPaste(event) {
            const text = event.clipboardData?.getData("text") ?? "";
            const parsed = parsePastedAmount(text, this.resolvedLang, this.digits);

            if (parsed !== null) {
                this.applyParts(parsed.whole, parsed.fraction);
            }
        },

        onRootClick(event) {
            if (!event.target.closest("input, button")) {
                this.$refs.wholeInput.focus();
            }
        },

        // Переход между частями поля и крестиком выходом не считается.
        onFocusOut(event) {
            if (this.$el.contains(event.relatedTarget)) {
                return;
            }

            this.hasFocus = false;
            this.commit();
        },

        // Крестик пропадает после очистки, и фокус с клавиатуры упал бы на body:
        // возвращаем его в поле. Касание и мышь :focus-visible не дают, и экранная
        // клавиатура не выезжает.
        moveFocusFromEraser() {
            const eraser = this.$refs.eraser.$el;

            if (document.activeElement === eraser && eraser.matches(":focus-visible")) {
                this.$refs.wholeInput.focus({ preventScroll: true });
            }
        },

        erase() {
            this.moveFocusFromEraser();
            this.applyParts("", "");
            this.commit();
        },

        // Единственная точка эмита changed. Chrome шлёт blur и при удалении поля
        // в фокусе, а changed со страницы, с которой уходят, запустил бы её
        // перезагрузку. Блокировка событий не шлёт вовсе.
        commit() {
            if (this.isUnmounted || this.isDisabled || this.amount === this.committed) {
                return;
            }

            this.committed = this.amount;
            this.$emit("changed");
        },
    },
};
</script>

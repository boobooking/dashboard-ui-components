<template>
    <div
        class="bb:flex bb:items-stretch bb:h-full bb:w-full bb:min-w-0 bb:pl-3 bb:rounded-[var(--bb-field-radius,0)] bb:has-focus-visible:focus-ring"
        :class="{ 'bb:pr-3': !withEraser }"
        @mousedown="onRootMousedown"
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
            :title="fullAmount"
            class="bb:flex-1 bb:w-full bb:min-w-0 bb:bg-transparent bb:text-right bb:text-ellipsis bb:tabular-nums bb:focus:outline-hidden"
            @input="onWholeInput"
            @focus="onWholeFocus"
            @click="holdCaret"
            @keydown="onWholeKeydown"
            @keydown.enter="commit"
            @keyup="holdCaret"
            @select="holdCaret"
            @paste.prevent="onWholePaste"
            @dragstart.prevent
            @drop.prevent
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
                :maxlength="digits"
                :placeholder="'0'.repeat(digits)"
                :aria-label="texts.amountFraction"
                :style="{ width: `calc(${digits}ch + 2px)` }"
                class="bb:flex-none bb:bg-transparent bb:tabular-nums bb:placeholder-gray-400 bb:focus:outline-hidden"
                @input="onFractionInput"
                @blur="completeParts"
                @keydown.enter="commit"
                @keydown.backspace="onFractionBackspace"
                @paste.prevent="onFractionPaste"
                @dragstart.prevent
                @drop.prevent
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
    onlyDigits,
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

        // Полная запись для title: без фокуса основная часть обрезается многоточием.
        // Строится из суммы, а не из частей: пустые копейки в ней — нули.
        fullAmount() {
            if (this.isEmpty) {
                return null;
            }

            const { whole, fraction } = splitAmount(this.amount, this.digits);
            const grouped = groupWhole(whole, this.resolvedLang);

            return fraction === "" ? grouped : `${grouped}${this.separator}${fraction}`;
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

        // Запись значения уводит курсор в конец: если фильтр убрал символы, курсор
        // возвращается на своё место за вычетом убранного.
        onFractionInput(event) {
            const input = event.target;
            const typed = input.value;
            const caret = input.selectionStart;
            const fraction = onlyDigits(typed).slice(0, this.digits);

            this.applyParts(this.whole, fraction);
            input.value = fraction;

            if (fraction !== typed) {
                const position = Math.max(caret - (typed.length - fraction.length), 0);

                input.setSelectionRange(position, position);
            }
        },

        // Браузер выделяет всё поле при Tab уже после события focus, и первая
        // цифра стёрла бы сумму. Это не выделение пользователя, поэтому курсор
        // ставится в конец безусловно и в следующем кадре.
        onWholeFocus() {
            requestAnimationFrame(() => {
                const input = this.$refs.wholeInput;

                if (document.activeElement === input) {
                    input.setSelectionRange(input.value.length, input.value.length);
                    input.scrollLeft = input.scrollWidth;
                }
            });
        },

        // Курсор основной части всегда в конце и виден: сама установка курсора
        // длинную сумму не прокручивает, а видимая область может стоять слева и при
        // курсоре в конце. Выделение всей части остаётся: сумму можно скопировать,
        // а ввод и вставка её заменят.
        holdCaret() {
            const input = this.$refs.wholeInput;
            const end = input.value.length;
            const isAllSelected = input.selectionStart === 0 && input.selectionEnd === end;

            if (isAllSelected) {
                return;
            }

            if (input.selectionStart !== end) {
                input.setSelectionRange(end, end);
            }

            input.scrollLeft = input.scrollWidth;
        },

        // Отмена по умолчанию нужна в обоих переходах фокуса: браузер применяет
        // нажатие уже к полю, в котором оказался фокус. С модификатором запятая и
        // точка — сочетания браузера и системы, они остаются им.
        onWholeKeydown(event) {
            this.holdCaret();

            const hasModifier = event.metaKey || event.ctrlKey || event.altKey;

            if (this.digits > 0 && !hasModifier && isDecimalKey(event.key, this.resolvedLang)) {
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

        padFraction(fraction) {
            return fraction === "" ? "" : fraction.padEnd(this.digits, "0");
        },

        // Непустые копейки дополняются нулями, а пустая основная часть рядом с
        // ними становится нулём. Две пустые части остаются пустыми.
        completeParts() {
            if (this.fraction === "") {
                return;
            }

            this.fraction = this.padFraction(this.fraction);
            this.whole = this.whole || "0";
        },

        // Отклонённая вставка не меняет поле: сумма не должна молча стать другой.
        // Фокус при вставке в основной части, поэтому копейки дополняются сразу.
        // Vue перепишет поле позже, поэтому курсор и прокрутка ставятся в следующем
        // кадре. Ждать клавишу нельзя: на вставке из меню её нет.
        onWholePaste(event) {
            const text = event.clipboardData?.getData("text") ?? "";
            const parsed = parsePastedAmount(text, this.resolvedLang, this.digits);

            if (parsed !== null) {
                this.applyParts(parsed.whole, this.padFraction(parsed.fraction));
                this.onWholeFocus();
            }
        },

        // Текст буфера проверяется целиком, до maxlength: обрезанная браузером
        // вставка молча дала бы другую сумму. Отказ не трогает и выделение.
        // Значение пишется сразу, иначе курсор некуда поставить: Vue обновит поле позже.
        onFractionPaste(event) {
            const input = event.target;
            const text = event.clipboardData?.getData("text") ?? "";
            const { selectionStart, selectionEnd } = input;
            const fraction = this.fraction.slice(0, selectionStart) + text + this.fraction.slice(selectionEnd);

            if (!/^\d+$/.test(text) || fraction.length > this.digits) {
                return;
            }

            const caret = selectionStart + text.length;

            this.applyParts(this.whole, fraction);
            input.value = fraction;
            input.setSelectionRange(caret, caret);
        },

        // Действие браузера отменено, иначе он снял бы фокус с поля и нажатие
        // внутри поля выглядело бы как выход из него.
        onRootMousedown(event) {
            if (event.button === 0 && !event.target.closest("input, button")) {
                event.preventDefault();
                this.$refs.wholeInput.focus();
            }
        },

        // Переход между частями поля и крестиком выходом не считается.
        onFocusOut(event) {
            if (this.$el.contains(event.relatedTarget)) {
                return;
            }

            this.hasFocus = false;
            this.completeParts();
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

        // CrossButton шлёт clicked после анимации: за это время поле могло
        // заблокироваться. После размонтирования крестик clicked не шлёт.
        erase() {
            if (this.isDisabled) {
                return;
            }

            this.moveFocusFromEraser();
            this.applyParts("", "");
            this.committed = null;
            this.$emit("changed");
        },

        // Выход из поля и Enter: changed, только если сумма изменилась. Chrome шлёт
        // blur и при удалении поля в фокусе, а changed со страницы, с которой
        // уходят, запустил бы её перезагрузку. Блокировка событий не шлёт вовсе.
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

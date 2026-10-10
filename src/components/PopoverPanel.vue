<template>
    <!-- Корень — обёртка кнопки и панели. Отображение и размеры задаёт
         вызывающий компонент классом на <popover-panel>: у каждой
         выпадающей части своя раскладка. -->
    <span class="bb:relative" v-if="hasContent">
        <!-- Кнопку, которая открывает панель, рисует вызывающий компонент и
             вешает на неё id и popovertarget из пропсов слота. Открывает и
             закрывает панель браузер по popovertarget: свой обработчик click
             открывал бы панель заново сразу после того, как браузер закрыл её
             по клику вне. -->
        <slot name="trigger" :id="buttonId" :popovertarget="panelId"></slot>
        <!-- Панель в верхнем слое браузера: таблицу с горизонтальной
             прокруткой она не расширяет, и обёртки с прокруткой её не
             обрезают. m-0 inset-auto снимают умолчания браузера для
             [popover], иначе панель встала бы в центр окна; координаты
             ставит placePopover. Вид панели — panelClass вызывающего
             компонента, без утилит отображения: они перебили бы display:
             none закрытой панели. Общие для всех панелей классы — только
             здесь: правка вида, например анимация появления, меняет все
             выпадающие части сразу. -->
        <div
            ref="panel"
            :id="panelId"
            popover="auto"
            class="bb:m-0 bb:inset-auto"
            :class="panelClass"
            :role="panelRole"
            :aria-orientation="panelRole === 'menu' ? 'vertical' : null"
            :aria-labelledby="panelLabel === null ? buttonId : null"
            :aria-label="panelLabel"
            :tabindex="panelFocusable ? 0 : null"
            @beforetoggle="onBeforeToggle"
            @toggle="onToggle"
            @click="onClick"
        >
            <slot></slot>
        </div>
    </span>
</template>

<script>
import { useId } from "vue";
import { canControlPopover, closeOnScrollAndResize, fitPopover, isPopoverOpen, placePopover } from "../popover.js";
import { moveMenuFocus } from "../menuFocus.js";

// Выпадающая панель у кнопки на Popover API: открытие и закрытие, место у
// кнопки, закрытие прокруткой и изменением размера окна, стрелки. Кнопку и
// содержимое рисует вызывающий компонент.
// Внутренний компонент пакета: на нём стоят меню PopoverMenu, список
// SelectSingle (DropdownButton) и календарь PickDay.
export default {
    emits: ["update:modelValue", "toggle"],

    props: {
        modelValue: {
            type: Boolean,
            default: false,
        },
        // Без содержимого нет ни кнопки, ни панели.
        hasContent: {
            type: Boolean,
            default: true,
        },
        // "end" — правый край панели по правому краю кнопки, "start" — левый
        // по левому, с разворотом у края окна (placePopover).
        align: {
            type: String,
            default: "end",
            validator: (value) => ["start", "end"].includes(value),
        },
        // Наибольшая ширина панели, px.
        maxWidth: {
            type: Number,
            default: null,
        },
        // Стрелки и мышь ведут фокус по кнопкам и ссылкам панели.
        arrows: {
            type: Boolean,
            default: false,
        },
        // Выбранный пункт: от него считают стрелки, пока фокус вне панели.
        findSelected: {
            type: Function,
            default: () => null,
        },
        // Клик внутри панели закрывает её — после обработчика пункта.
        closeOnClick: {
            type: Boolean,
            default: false,
        },
        // Вид панели: рамка, фон, скругление, тень. Без утилит отображения.
        panelClass: {
            type: String,
            default: "",
        },
        // Роль панели; у меню — ещё и вертикальная ориентация.
        panelRole: {
            type: String,
            default: null,
        },
        // Своё доступное имя панели вместо имени кнопки: у подсказки
        // TextPopover область — «Полный текст», а кнопка — «Показать текст».
        panelLabel: {
            type: String,
            default: null,
        },
        // tabindex="0" у панели: длинное содержимое прокручивается
        // с клавиатуры во всех браузерах — прокручиваемый блок сам получает
        // фокус не везде.
        panelFocusable: {
            type: Boolean,
            default: false,
        },
        // Фокус был внутри панели при закрытии — после закрытия он
        // возвращается на кнопку: иначе он пропал бы со страницы, и Tab
        // начинал бы с её начала. Safari по клику фокус на кнопку не ставит
        // и при закрытии уводит его на body, поэтому браузер кнопку сам
        // не вернёт. Фокус, который браузер отдал другому элементу (клик по
        // соседнему полю), не забирается.
        returnFocus: {
            type: Boolean,
            default: false,
        },
    },

    setup() {
        return {
            buttonId: useId(),
            panelId: useId(),
        };
    },

    data() {
        return {
            // Текущее значение панели. По нему гасится ответное событие:
            // toggle браузер присылает позже и объединяет переключения подряд,
            // поэтому временный флаг вокруг showPopover() его бы пропустил.
            panelIsOpen: this.modelValue,
        };
    },

    watch: {
        // Входящее значение только принимается. Ответное событие вернуло бы
        // родителю его же решение, и обработчик вида «закрыли — сбросить
        // выбор» сбросил бы строку, которую родитель только что выбрал.
        modelValue(isOpen) {
            this.panelIsOpen = isOpen;
            this.applyPanelState();
        },

        // DOM панели появляется и исчезает только при рендере, поэтому
        // наблюдатель — после него (flush: "post"). Содержимое появилось:
        // наблюдатель modelValue мог сработать раньше, когда панели ещё не
        // было в DOM, — состояние применяется заново. Содержимое пропало:
        // удаляя открытый popover из документа, браузер не присылает toggle,
        // и без этого слушатели стрелок и прокрутки остались бы висеть,
        // а родитель считал бы панель открытой.
        hasContent: {
            flush: "post",
            handler(hasContent) {
                if (hasContent) {
                    this.applyPanelState();
                    return;
                }

                this.stopListening();
                this.reportPanelShown(false);

                if (this.panelIsOpen) {
                    this.panelIsOpen = false;
                    this.$emit("update:modelValue", false);
                }
            },
        },
    },

    created() {
        // Снимает слушатели прокрутки и размера окна, пока панель открыта.
        this.stopClosing = null;
        // Снимает слушатель стрелок, пока панель открыта.
        this.stopArrows = null;
        // Был ли фокус внутри панели, когда она начала закрываться.
        this.focusWasInside = false;
        // Открыта ли панель в браузере сейчас — по последнему событию toggle
        // или пропаже содержимого. Не panelIsOpen: тот принимает входящее
        // значение раньше, чем браузер его подтвердит.
        this.panelShown = false;
    },

    mounted() {
        this.applyPanelState();
    },

    beforeUnmount() {
        this.stopListening();
    },

    methods: {
        // Привести панель к panelIsOpen. Без Popover API и вне документа
        // управлять нечем.
        applyPanelState() {
            const panel = this.$refs.panel;

            if (!canControlPopover(panel) || !panel.isConnected) {
                return;
            }

            if (this.panelIsOpen && !isPopoverOpen(panel)) {
                panel.showPopover();
            }

            if (!this.panelIsOpen && isPopoverOpen(panel)) {
                panel.hidePopover();
            }
        },

        close() {
            const panel = this.$refs.panel;

            if (isPopoverOpen(panel)) {
                panel.hidePopover();
            }
        },

        // Событие toggle — о фактическом состоянии панели по любой причине,
        // в том числе по входящему modelValue: подавление эха
        // update:modelValue его не касается. Только при изменении: браузер
        // объединяет переключения подряд, и событие сообщает последнее
        // наблюдаемое состояние, а не каждое краткое. При размонтировании
        // события нет — подписчик убирает своё сам.
        reportPanelShown(isOpen) {
            if (this.panelShown === isOpen) {
                return;
            }

            this.panelShown = isOpen;
            this.$emit("toggle", isOpen);
        },

        onClick() {
            if (this.closeOnClick) {
                this.close();
            }
        },

        // Место панели — по кнопке из слота, а не по обёртке: обёртка может
        // быть шире кнопки. Поместилась ли панель, видно после её появления:
        // кадр анимации приходит до первой отрисовки, и панель, которой
        // не хватило места, встаёт на другое место незаметно. При закрытии
        // запоминается, был ли фокус внутри: к toggle браузер его уже
        // переставит.
        onBeforeToggle(event) {
            if (event.newState === "open") {
                const button = document.getElementById(this.buttonId);
                const options = { maxWidth: this.maxWidth, align: this.align };
                placePopover(button, this.$refs.panel, options);
                requestAnimationFrame(() => {
                    const panel = this.$refs.panel;

                    if (isPopoverOpen(panel)) {
                        fitPopover(button, panel, options);
                    }
                });
                return;
            }

            const panel = this.$refs.panel;
            this.focusWasInside = panel !== undefined && panel !== null && panel.contains(document.activeElement);
        },

        // Единственный путь, которым панель сообщает родителю об открытии или
        // закрытии: кнопка, клик вне, Escape, клик внутри при closeOnClick,
        // прокрутка, размер окна. Значение, совпавшее с текущим, — эхо
        // входящего, его не эмитят. Слушатели и сообщение родителю — по
        // фактическому состоянию панели, а не по newState: toggle мог прийти
        // после размонтирования, устареть или запоздать за содержимым,
        // которое пропало и унесло панель из DOM, — такая панель закрыта.
        // Фактическое состояние уходит и событием toggle.
        onToggle() {
            this.stopListening();

            const panel = this.$refs.panel;
            const isOpen = isPopoverOpen(panel);
            if (isOpen) {
                this.stopClosing = closeOnScrollAndResize(panel, this.close);

                if (this.arrows) {
                    this.stopArrows = moveMenuFocus(panel, this.findSelected);
                }
            }

            if (!isOpen) {
                this.restoreFocus(panel);
            }

            this.reportPanelShown(isOpen);

            if (isOpen === this.panelIsOpen) {
                return;
            }

            this.panelIsOpen = isOpen;
            this.$emit("update:modelValue", isOpen);
        },

        // Вернуть фокус на кнопку, если он был внутри закрытой панели и
        // теперь потерян: на body или всё ещё на скрытом пункте. Страница
        // к кнопке не прокручивается: панель могла закрыться прокруткой,
        // и кнопка уже ушла из окна.
        restoreFocus(panel) {
            const focusWasInside = this.focusWasInside;
            this.focusWasInside = false;

            if (!this.returnFocus || !focusWasInside) {
                return;
            }

            const active = document.activeElement;
            const isLost = active === null || active === document.body || (panel !== undefined && panel !== null && panel.contains(active));
            if (isLost) {
                document.getElementById(this.buttonId)?.focus({ preventScroll: true });
            }
        },

        stopListening() {
            if (this.stopClosing !== null) {
                this.stopClosing();
                this.stopClosing = null;
            }

            if (this.stopArrows !== null) {
                this.stopArrows();
                this.stopArrows = null;
            }
        },
    },
};
</script>

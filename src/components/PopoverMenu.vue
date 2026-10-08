<template>
    <!-- Корень — обёртка кнопки и панели. Отображение и отступы задаёт
         вызывающий компонент классом на <popover-menu>: у каждого меню своя
         раскладка. -->
    <span class="bb:relative" v-if="hasActions">
        <!-- Кнопку, которая открывает меню, рисует вызывающий компонент и
             вешает на неё id и popovertarget из пропсов слота. Открывает и
             закрывает меню браузер по popovertarget: свой обработчик click
             открывал бы меню заново сразу после того, как браузер закрыл его
             по клику вне. -->
        <slot name="trigger" :id="menuButtonId" :popovertarget="menuId"></slot>
        <!-- Меню в верхнем слое браузера: таблицу с горизонтальной
             прокруткой оно не расширяет, и она его не обрезает.
             m-0 inset-auto снимают умолчания браузера для [popover],
             иначе меню встало бы в центр окна; координаты ставит
             placePopover. Клик внутри меню закрывает его: открытое
             меню легло бы поверх модалки, которую открывает пункт.
             Вид панели и пунктов задан только здесь: правка вида, например
             анимация появления, меняет все меню пакета сразу. -->
        <div
            ref="menu"
            :id="menuId"
            popover="auto"
            class="bb:m-0 bb:inset-auto bb:w-56 bb:rounded-md bb:shadow-lg bb:bg-white bb:ring-1 bb:ring-black/5"
            role="menu"
            aria-orientation="vertical"
            :aria-labelledby="menuButtonId"
            @beforetoggle="onBeforeToggle"
            @toggle="onToggle"
            @click="close"
        >
            <!-- Вид пунктов задаёт только компонент: страница передаёт
                 данные, а не разметку. Цвет текста у каждого пункта
                 свой: у popover в верхнем слое color браузера, а не
                 страницы. Подсветка — фокус, его ставят и
                 стрелки, и мышь (moveMenuFocus), поэтому hover-стилей нет. -->
            <template v-for="(item, index) in actionItems" :key="index">
                <a
                    v-if="isLink(item)"
                    :href="item.href"
                    role="menuitem"
                    class="bb:block bb:w-full bb:px-4 bb:py-2 bb:text-sm bb:text-left bb:cursor-pointer bb:focus:outline-hidden"
                    :class="item.danger === true ? 'bb:bg-red-400 bb:text-white bb:focus:bg-red-500' : 'bb:text-gray-700 bb:focus:bg-gray-100 bb:focus:text-gray-900'"
                    @click="followLink($event, item.href)"
                    v-text="item.label"
                ></a>
                <button
                    v-else
                    type="button"
                    role="menuitem"
                    class="bb:block bb:w-full bb:px-4 bb:py-2 bb:text-sm bb:text-left bb:cursor-pointer bb:focus:outline-hidden"
                    :class="item.danger === true ? 'bb:bg-red-400 bb:text-white bb:focus:bg-red-500' : 'bb:text-gray-700 bb:focus:bg-gray-100 bb:focus:text-gray-900'"
                    @click="select(item)"
                    v-text="item.label"
                ></button>
            </template>
        </div>
    </span>
</template>

<script>
import { useId } from "vue";
import { withNavigation } from "../navigation.js";
import { canControlPopover, closeOnScrollAndResize, isPopoverOpen, placePopover } from "../popover.js";
import { moveMenuFocus } from "../menuFocus.js";
import { toMenuItems } from "../menuItems.js";

// Ширина меню — bb:w-56. У кнопки ближе к левому краю окна меню сужается
// до места слева.
const MENU_WIDTH = 224;

// Меню из пунктов actions: панель, пункты и всё поведение меню. Кнопку,
// которая его открывает, рисует вызывающий компонент в слоте trigger.
// Внутренний компонент пакета: на нём стоят меню DropdownButtonWithAction
// и HamburgerMenu.
export default {
    mixins: [withNavigation],

    emits: ["update:modelValue"],

    props: {
        // Пункты меню: { label, href } — переход, { label, onSelect } —
        // действие, danger: true — опасный пункт. Тип и пункты проверяют
        // публичные компоненты: проверка и здесь давала бы каждое
        // предупреждение дважды.
        actions: {
            default: () => [],
        },
        modelValue: {
            type: Boolean,
            default: false,
        },
    },

    setup() {
        return {
            menuButtonId: useId(),
            menuId: useId(),
        };
    },

    data() {
        return {
            // Текущее значение меню. По нему гасится ответное событие:
            // toggle браузер присылает позже и объединяет переключения подряд,
            // поэтому временный флаг вокруг showPopover() его бы пропустил.
            menuIsOpen: this.modelValue,
        };
    },

    computed: {
        actionItems() {
            return toMenuItems(this.actions);
        },

        hasActions() {
            return this.actionItems.length > 0;
        },
    },

    watch: {
        // Входящее значение только принимается. Ответное событие вернуло бы
        // родителю его же решение, и обработчик вида «закрыли — сбросить
        // выбор» сбросил бы строку, которую родитель только что выбрал.
        modelValue(isOpen) {
            this.menuIsOpen = isOpen;
            this.applyMenuState();
        },

        // DOM меню появляется и исчезает только при рендере, поэтому
        // наблюдатель — после него (flush: "post"). Пункты появились:
        // наблюдатель modelValue мог сработать раньше, когда меню ещё не было
        // в DOM, — состояние применяется заново. Пункты пропали: удаляя
        // открытый popover из документа, браузер не присылает toggle, и без
        // этого слушатели стрелок и прокрутки остались бы висеть, а родитель
        // считал бы меню открытым.
        hasActions: {
            flush: "post",
            handler(hasActions) {
                if (hasActions) {
                    this.applyMenuState();
                    return;
                }

                this.stopListening();

                if (this.menuIsOpen) {
                    this.menuIsOpen = false;
                    this.$emit("update:modelValue", false);
                }
            },
        },
    },

    created() {
        // Снимает слушатели прокрутки и размера окна, пока меню открыто.
        this.stopClosing = null;
        // Снимает слушатель стрелок, пока меню открыто.
        this.stopArrows = null;
    },

    mounted() {
        this.applyMenuState();
    },

    beforeUnmount() {
        this.stopListening();
    },

    methods: {
        // Ссылка — только при непустом строковом href; у ссылки onSelect
        // не вызывается.
        isLink(item) {
            return typeof item.href === "string" && item.href !== "";
        },

        // Кнопка без функции onSelect по клику только закрывает меню.
        // Результат onSelect возвращается обработчику клика: отклонённый
        // Promise асинхронного onSelect Vue передаёт в свой обработчик ошибок,
        // а без return отказ ушёл бы в unhandledrejection.
        select(item) {
            if (typeof item.onSelect === "function") {
                return item.onSelect();
            }
        },

        // Привести меню к menuIsOpen. Без Popover API и вне документа
        // управлять нечем.
        applyMenuState() {
            const menu = this.$refs.menu;

            if (!canControlPopover(menu) || !menu.isConnected) {
                return;
            }

            if (this.menuIsOpen && !isPopoverOpen(menu)) {
                menu.showPopover();
            }

            if (!this.menuIsOpen && isPopoverOpen(menu)) {
                menu.hidePopover();
            }
        },

        close() {
            const menu = this.$refs.menu;

            if (isPopoverOpen(menu)) {
                menu.hidePopover();
            }
        },

        // Место меню — по кнопке из слота, а не по обёртке: обёртка может
        // быть шире кнопки.
        onBeforeToggle(event) {
            if (event.newState === "open") {
                placePopover(document.getElementById(this.menuButtonId), this.$refs.menu, { maxWidth: MENU_WIDTH });
            }
        },

        // Единственный путь, которым меню сообщает родителю об открытии или
        // закрытии: кнопка, клик вне, Escape, клик по пункту, прокрутка,
        // размер окна. Значение, совпавшее с текущим, — эхо входящего, его
        // не эмитят. Слушатели и сообщение родителю — по фактическому
        // состоянию меню, а не по newState: toggle мог прийти после
        // размонтирования, устареть или запоздать за пунктами, которые
        // пропали и унесли меню из DOM, — такое меню закрыто.
        onToggle() {
            this.stopListening();

            const menu = this.$refs.menu;
            const isOpen = isPopoverOpen(menu);
            if (isOpen) {
                this.stopClosing = closeOnScrollAndResize(menu, this.close);
                this.stopArrows = moveMenuFocus(menu);
            }

            if (isOpen === this.menuIsOpen) {
                return;
            }

            this.menuIsOpen = isOpen;
            this.$emit("update:modelValue", isOpen);
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

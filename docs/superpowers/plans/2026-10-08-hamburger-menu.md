# HamburgerMenu и общее приватное меню PopoverMenu — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** меню профиля в шапке проектов получает публичный компонент `HamburgerMenu`, который работает и выглядит как меню `DropdownButtonWithAction`; вид и поведение обоих меню живут в одном приватном `PopoverMenu`; `Popup`, `PickDay` и `Closer` перестают экспортироваться; выпуск `0.15.0`.

**Architecture:** из `DropdownButtonWithAction` в приватный `PopoverMenu.vue` переносится всё, кроме основной кнопки и вида стрелки: панель `popover="auto"`, пункты, переходы, закрытие, `moveMenuFocus`, `v-model`. Кнопку, открывающую меню, рисует публичный компонент в слоте `trigger` по пропсам `{ id, popovertarget }`. Проверка и разбор пунктов — во внутреннем модуле `src/menuItems.js`. `HamburgerMenu` — `PopoverMenu` с кнопкой ☰ в слоте.

**Tech Stack:** Vue 3.5 (Options API, SFC), Tailwind v4 с префиксом `bb:`, Vite 8 (library mode), vitest 5 + happy-dom + @vue/test-utils, Popover API (в тестах — `tests/popoverStub.js`).

**Spec:** `docs/superpowers/specs/2026-10-08-hamburger-menu-design.md`

## Global Constraints

- Ветка `feat/hamburger-menu`; версия в `package.json` — `0.14.0` до последней задачи, затем `0.15.0` последним коммитом.
- `PopoverMenu`: проп `actions` — без `type` и без `validator`, `default: () => []`; проп `modelValue` — `Boolean`, `false`; событие `update:modelValue`; слот `trigger` с пропсами `id` и `popovertarget`.
- Кнопка в слоте `trigger` получает атрибуты явно: `:id="trigger.id" :popovertarget="trigger.popovertarget"`. `v-bind="trigger"` запрещён: его отклоняет `tests/utilityPrefix.test.js`.
- Валидатор `(value) => value.every(isMenuItem)` — только у пропа `actions` публичных компонентов (`DropdownButtonWithAction`, `HamburgerMenu`), оба `type: Array`, `default: () => []`.
- Место меню — `placePopover` по самой кнопке из слота (`document.getElementById(id)`), `maxWidth` 224.
- Классы панели и пунктов переносятся дословно из нынешнего `DropdownButtonWithAction.vue`.
- Классы кнопки ☰ — дословно: `bb:relative bb:inline-flex bb:items-center bb:justify-center bb:p-2 bb:rounded-md bb:text-gray-400 bb:hover:text-gray-500 bb:hover:bg-gray-100 bb:focus:outline-hidden bb:focus:bg-gray-100 bb:focus:text-gray-500 bb:transition bb:duration-150 bb:ease-in-out`; SVG — `bb:h-6 bb:w-6`, путь `M4 6h16M4 12h16M4 18h16`; подпись — `texts.openMenu` в `bb:sr-only`.
- Код переносится, а не пишется заново: комментарии сохраняются; меняются только те, что после переноса стали бы ложными.
- Экспорт после Task 3 — ровно пятнадцать компонентов: `ConfirmationModal`, `DataTable`, `Dot`, `DownloadLink`, `DropdownButtonWithAction`, `ErrorMessages`, `HamburgerMenu`, `NavigationMenuElement`, `NotificationMessage`, `PageCard`, `RussianMobileFilter`, `Search`, `SelectDateInterval`, `SelectSingle`, `SmallBadge` и плагин `dashboardUi`.
- Каждый класс в шаблоне — с префиксом `bb:` (кроме `bb-dashboard-ui`), `:class` — только литералы; это проверяет `tests/utilityPrefix.test.js`.
- Стиль кода: в `.vue` — двойные кавычки и точки с запятой; в `.js` (и `src`, и тестах) — одинарные кавычки без точек с запятой; отступ 4 пробела; комментарии по-русски, описывают код как он есть.
- Вывод `npm test` чистый: ни одного предупреждения или ошибки; ожидаемые предупреждения перехватываются в тестах.
- Логи — в рабочую папку плана `W=.superpowers/sdd/2026-10-08-hamburger-menu` (git-ignored). Полный набор — один прогон с логом и кодом завершения: `npm test > $W/<имя>.log 2>&1; echo "exit $?"`, итоги и шум — `grep` по логу. Не строить цепочки `npm test | grep … && …`: без `pipefail` код цепочки — код `grep`.
- Коммиты — conventional commits по-русски, повелительное наклонение, без служебных строк; `--no-verify` запрещён.

## Review Focus

- Два меню на одной странице — шапка и строка таблицы: открытие одного закрывает другое, родитель строки узнаёт о закрытии, у кнопок и панелей свои `id`. Тест — Task 2.
- Родитель перерисовался при открытом меню и передал новый массив тех же пунктов (`:actions="[…]"` в шаблоне): меню остаётся открытым, фокус — на том же пункте. Тест — Task 2.
- Пункты `HamburgerMenu` пропали при открытом меню (у шапки нет `v-model`, сообщить некому): меню уходит из DOM, стрелки снова прокручивают страницу. Тест — Task 2.
- Только клавиатура: Tab до ☰, Enter или пробел открывает меню, стрелки ведут фокус, Enter выбирает, Escape закрывает и фокус остаётся у кнопки. happy-dom не превращает Enter на кнопке в клик — проверка в браузере, Task 6.
- Кнопка ☰ у правого края окна и узкое окно: меню не выходит за окно, правый край — по кнопке. Тест места — Task 2, вид — Task 6.

---

### Task 1: `PopoverMenu` и `menuItems.js`; `DropdownButtonWithAction` на них

Перенос без изменения поведения: защитная сетка — существующие 59 тестов `tests/DropdownButtonWithAction.test.js`, которые не меняются.

**Files:**
- Create: `src/menuItems.js`
- Create: `src/components/PopoverMenu.vue`
- Modify: `src/components/DropdownButtonWithAction.vue` (файл целиком)

**Interfaces:**
- Consumes: `withNavigation` (`src/navigation.js`, метод `followLink(event, href)`), `withLang` (`src/lang.js`, `this.texts`), `canControlPopover`, `closeOnScrollAndResize`, `isPopoverOpen`, `placePopover` (`src/popover.js`), `moveMenuFocus(menu, findSelected)` (`src/menuFocus.js`).
- Produces:
  - `src/menuItems.js`: `isMenuItem(item)` → `boolean`; `toMenuItems(actions)` → массив объектов (не массив — `[]`, необъекты пропускаются).
  - `src/components/PopoverMenu.vue` (default export): пропы `actions` (любое значение), `modelValue` (`Boolean`); событие `update:modelValue` (`boolean`); слот `trigger` с пропсами `{ id: string, popovertarget: string }`; корень — `<span class="bb:relative">` с `v-if` по наличию пунктов, `class` вызывающего компонента ложится на него.

- [ ] **Step 1: Прогон до переноса**

```bash
W=.superpowers/sdd/2026-10-08-hamburger-menu
npx vitest run tests/DropdownButtonWithAction.test.js --reporter=verbose > $W/t1-before.log 2>&1; echo "exit $?"
grep -E "(✓|×) .* > " $W/t1-before.log | sed -E 's/ [0-9]+ms$//' | sort > $W/t1-before.txt
wc -l < $W/t1-before.txt
grep -E "Tests " $W/t1-before.log
```

Expected: `exit 0`, `59`, `Tests  59 passed (59)`.

- [ ] **Step 2: Создать `src/menuItems.js`**

```js
// Пункты меню DropdownButtonWithAction и HamburgerMenu: проверка для
// валидаторов пропа actions и разбор для PopoverMenu.
// Внутренний модуль пакета.

// Пункт меню — ровно одна из двух форм: переход (href без onSelect) или
// действие (onSelect без href). Поле отсутствует, если оно undefined.
export function isMenuItem(item) {
    if (typeof item !== 'object' || item === null) {
        return false
    }

    if (typeof item.label !== 'string' || item.label === '') {
        return false
    }

    if (item.danger !== undefined && typeof item.danger !== 'boolean') {
        return false
    }

    const isLink = typeof item.href === 'string' && item.href !== '' && item.onSelect === undefined
    const isCommand = typeof item.onSelect === 'function' && item.href === undefined

    return isLink || isCommand
}

// Валидатор только предупреждает и данные не исправляет, поэтому меню
// не падает ни на каком значении: не массив — пустой список, элементы-
// необъекты пропускаются.
export function toMenuItems(actions) {
    if (!Array.isArray(actions)) {
        return []
    }

    return actions.filter((item) => typeof item === 'object' && item !== null)
}
```

- [ ] **Step 3: Создать `src/components/PopoverMenu.vue`**

```vue
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
```

- [ ] **Step 4: Заменить `src/components/DropdownButtonWithAction.vue` целиком**

```vue
<template>
    <span class="bb-dashboard-ui bb:relative bb:inline-flex bb:shadow-xs bb:rounded-md">
        <!-- Без дополнительных действий стрелке нечего открывать: её нет,
             и кнопка скругляется с обеих сторон. -->
        <button
            type="button"
            class="bb:relative bb:inline-flex bb:items-center bb:rounded-l-md bb:border bb:border-gray-300 bb:bg-white bb:hover:bg-gray-50 bb:focus:outline-hidden"
            :class="{ 'bb:rounded-r-md': !hasActions }"
        >
            <slot name="button"></slot>
        </button>
        <!-- Меню, его пункты и поведение — PopoverMenu; здесь только стрелка,
             которая его открывает. -->
        <popover-menu
            class="bb:-ml-px bb:block"
            :actions="actions"
            :model-value="modelValue"
            @update:model-value="$emit('update:modelValue', $event)"
        >
            <template #trigger="trigger">
                <button
                    type="button"
                    :id="trigger.id"
                    :popovertarget="trigger.popovertarget"
                    class="bb:relative bb:inline-flex bb:items-center bb:px-2 bb:py-2 bb:rounded-r-md bb:border bb:border-gray-300 bb:bg-white bb:text-sm bb:font-medium bb:text-gray-500 bb:hover:bg-gray-50 bb:focus:z-10 bb:focus:outline-hidden bb:focus:ring-1 bb:focus:ring-indigo-500 bb:focus:border-indigo-500"
                >
                    <span class="bb:sr-only">{{ texts.openMenu }}</span>
                    <svg
                        class="bb:h-5 bb:w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clip-rule="evenodd"
                        />
                    </svg>
                </button>
            </template>
        </popover-menu>
    </span>
</template>

<script>
import { withLang } from "../lang.js";
import { isMenuItem, toMenuItems } from "../menuItems.js";
import PopoverMenu from "./PopoverMenu.vue";

export default {
    components: {
        PopoverMenu,
    },

    mixins: [withLang],

    emits: ["update:modelValue"],

    props: {
        // Пункты меню: { label, href } — переход, { label, onSelect } —
        // действие, danger: true — опасный пункт.
        actions: {
            type: Array,
            default: () => [],
            validator: (value) => value.every(isMenuItem),
        },
        modelValue: {
            type: Boolean,
            default: false,
        },
    },

    computed: {
        // Основная кнопка лежит вне PopoverMenu: есть ли пункты, она узнаёт
        // здесь.
        hasActions() {
            return toMenuItems(this.actions).length > 0;
        },
    },

    created() {
        // Слот actions убран: пункты задаёт проп. Меню проекта, который ещё
        // передаёт разметку, осталось бы без пунктов молча. Проверку
        // process.env.NODE_ENV подменяет бандлер проекта, как у самого Vue:
        // в продакшен-сборке её и предупреждения нет.
        if (process.env.NODE_ENV !== "production" && this.$slots.actions) {
            console.warn("[dashboard-ui-components] DropdownButtonWithAction: слот actions убран, пункты меню передаются пропом actions");
        }
    },
};
</script>
```

- [ ] **Step 5: Прогон после переноса и сверка состава**

```bash
W=.superpowers/sdd/2026-10-08-hamburger-menu
npx vitest run tests/DropdownButtonWithAction.test.js --reporter=verbose > $W/t1-after.log 2>&1; echo "exit $?"
grep -E "(✓|×) .* > " $W/t1-after.log | sed -E 's/ [0-9]+ms$//' | sort > $W/t1-after.txt
diff $W/t1-before.txt $W/t1-after.txt; echo "diff exit $?"
grep -E "Tests " $W/t1-after.log
```

Expected: `exit 0`, `diff exit 0` (пустой diff), `Tests  59 passed (59)`. Если diff не пустой или есть `×` — разобрать по superpowers:systematic-debugging; тесты не менять.

- [ ] **Step 6: Весь набор и сборка**

```bash
W=.superpowers/sdd/2026-10-08-hamburger-menu
npm test > $W/t1-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t1-suite.log
grep -ciE "warn|error|stderr" $W/t1-suite.log
npm run build > $W/t1-build.log 2>&1; echo "build exit $?"
grep -E "built|error" $W/t1-build.log
```

Expected: `tests exit 0`, `Test Files  30 passed (30)`, `Tests  413 passed (413)`, `0`, `build exit 0`, `✓ built`. `tests/utilityPrefix.test.js` входит в набор и проверяет оба файла.

- [ ] **Step 7: Коммит**

```bash
git add src/menuItems.js src/components/PopoverMenu.vue src/components/DropdownButtonWithAction.vue
git commit -m "refactor: вынести меню DropdownButtonWithAction в приватный PopoverMenu"
```

---

### Task 2: `HamburgerMenu`

**Files:**
- Create: `tests/HamburgerMenu.test.js`
- Create: `src/components/HamburgerMenu.vue`
- Modify: `src/index.js` (строка после `DropdownButtonWithAction`)
- Modify: `tests/exports.test.js`
- Modify: `tests/ssrFixtures.js`

**Interfaces:**
- Consumes: `PopoverMenu` (Task 1): пропы `actions`, слот `trigger` с `{ id, popovertarget }`; `isMenuItem(item)` из `src/menuItems.js`; `withLang` (`this.texts.openMenu`, проп `lang`).
- Produces: экспорт `HamburgerMenu` из `src/index.js`; пропы `actions` (`Array`, `[]`, валидатор `every(isMenuItem)`) и `lang`; слотов, событий и `v-model` нет.

- [ ] **Step 1: Написать `tests/HamburgerMenu.test.js`**

```js
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import HamburgerMenu from '../src/components/HamburgerMenu.vue'
import DropdownButtonWithAction from '../src/components/DropdownButtonWithAction.vue'
import { dashboardUi } from '../src/plugin.js'
import { flushToggles, installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

// Панель меню — popover="auto" Popover API. Его заменяет tests/popoverStub.js:
// toggle в нём приходит отложенно и объединённо, как в браузере. attachTo
// нужен показу: showPopover требует элемент в документе.
let uninstallPopover

beforeEach(() => {
    uninstallPopover = installPopoverStub()
})

afterEach(() => {
    uninstallPopover()
})

const VALIDATOR_WARNING = 'Invalid prop: custom validator check failed for prop "actions"'

// Меню профиля в шапке: два перехода и выход действием.
function profileActions(onSelect = () => {}) {
    return [
        { label: 'Администраторы', href: '#users' },
        { label: 'Поменять пароль', href: '#password' },
        { label: 'Выйти', onSelect },
    ]
}

function buttonOf(wrapper) {
    return wrapper.find('button[popovertarget]')
}

function menuOf(wrapper) {
    return wrapper.get('[role="menu"]')
}

function itemsOf(wrapper) {
    return menuOf(wrapper).findAll('[role="menuitem"]')
}

function isOpen(wrapper) {
    return menuOf(wrapper).element.matches(':popover-open')
}

async function settle() {
    await flushToggles()
    await flushPromises()
}

async function openMenu(wrapper) {
    await buttonOf(wrapper).trigger('click')
    await settle()
}

function press(key) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    document.activeElement.dispatchEvent(event)
    return event
}

describe('HamburgerMenu: кнопка', () => {
    it.each([
        { name: 'без плагина', props: {}, global: {}, expected: 'Открыть меню' },
        { name: 'lang en', props: { lang: 'en' }, global: {}, expected: 'Open menu' },
        { name: 'плагин en', props: {}, global: { plugins: [[dashboardUi, { lang: 'en' }]] }, expected: 'Open menu' },
    ])('подпись кнопки для скринридера: $name — «$expected»', ({ props, global, expected }) => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions(), ...props }, global })

        expect(buttonOf(wrapper).attributes('type')).toBe('button')
        expect(buttonOf(wrapper).text()).toBe(expected)
    })

    it('без пунктов кнопки и панели нет', () => {
        mount(HamburgerMenu, { attachTo: document.body })

        expect(document.body.querySelector('button')).toBeNull()
        expect(document.body.querySelector('[role="menu"]')).toBeNull()
    })
})

describe('HamburgerMenu: открытие и закрытие', () => {
    it('кнопка с popovertarget открывает и закрывает меню', async () => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() } })

        expect(buttonOf(wrapper).attributes('popovertarget')).toBe(menuOf(wrapper).attributes('id'))
        expect(menuOf(wrapper).attributes('aria-labelledby')).toBe(buttonOf(wrapper).attributes('id'))
        expect(menuOf(wrapper).attributes('popover')).toBe('auto')

        await openMenu(wrapper)
        expect(isOpen(wrapper)).toBe(true)

        await openMenu(wrapper)
        expect(isOpen(wrapper)).toBe(false)
    })

    it('Escape закрывает меню', async () => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() } })
        await openMenu(wrapper)

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await settle()

        expect(isOpen(wrapper)).toBe(false)
    })

    it('клик вне меню закрывает его', async () => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() } })
        await openMenu(wrapper)

        document.body.click()
        await settle()

        expect(isOpen(wrapper)).toBe(false)
    })
})

describe('HamburgerMenu: пункты', () => {
    const navigation = []
    const inApp = { plugins: [[dashboardUi, { navigate: (href) => navigation.push(href) }]] }

    beforeEach(() => {
        navigation.length = 0
    })

    it('переход — ссылка: клик уходит в navigate плагина и закрывает меню', async () => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() }, global: inApp })
        await openMenu(wrapper)

        const link = itemsOf(wrapper)[0]
        expect(link.element.tagName).toBe('A')
        expect(link.attributes('href')).toBe('#users')
        await link.trigger('click')
        await settle()

        expect(navigation).toEqual(['#users'])
        expect(isOpen(wrapper)).toBe(false)
    })

    it('клик по переходу с Cmd остаётся браузеру, а меню закрывается', async () => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() }, global: inApp })
        await openMenu(wrapper)

        await itemsOf(wrapper)[0].trigger('click', { metaKey: true })
        await settle()

        expect(navigation).toEqual([])
        expect(isOpen(wrapper)).toBe(false)
    })

    it('действие вызывает onSelect один раз без аргументов и закрывает меню', async () => {
        const onSelect = vi.fn()
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions(onSelect) } })
        await openMenu(wrapper)

        const button = itemsOf(wrapper)[2]
        expect(button.element.tagName).toBe('BUTTON')
        await button.trigger('click')
        await settle()

        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(onSelect).toHaveBeenCalledWith()
        expect(isOpen(wrapper)).toBe(false)
    })
})

describe('HamburgerMenu: стрелки', () => {
    it.each([
        { key: 'ArrowDown', want: 'Администраторы' },
        { key: 'ArrowUp', want: 'Выйти' },
    ])('в открытом меню $key переводит фокус на «$want» и не прокручивает страницу', async ({ key, want }) => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() } })
        buttonOf(wrapper).element.focus()
        await openMenu(wrapper)

        const event = press(key)

        expect(event.defaultPrevented).toBe(true)
        expect(document.activeElement.textContent).toBe(want)
    })

    it('у закрытого меню стрелки прокручивают страницу', () => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() } })
        buttonOf(wrapper).element.focus()

        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })
})

describe('HamburgerMenu: место меню', () => {
    it('меню встаёт правым краем по правому краю кнопки, а не обёртки', async () => {
        Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1000 })
        Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 800 })
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() } })
        // Обёртка шире кнопки: по обёртке правый край меню был бы 50px.
        wrapper.element.getBoundingClientRect = () => ({ top: 10, bottom: 50, left: 800, right: 950 })
        buttonOf(wrapper).element.getBoundingClientRect = () => ({ top: 10, bottom: 50, left: 860, right: 900 })

        try {
            await openMenu(wrapper)

            expect(menuOf(wrapper).element.style.right).toBe('100px')
            expect(menuOf(wrapper).element.style.top).toBe('54px')
        } finally {
            delete document.documentElement.clientWidth
            delete document.documentElement.clientHeight
        }
    })
})

describe('HamburgerMenu: проверка пунктов', () => {
    function mountChecked(actions) {
        const warnings = []
        const errors = []
        mount(HamburgerMenu, {
            attachTo: document.body,
            props: { actions },
            global: {
                config: {
                    warnHandler: (message) => warnings.push(message),
                    errorHandler: (error) => errors.push(error),
                },
            },
        })

        return { warnings, errors }
    }

    it.each([
        { name: 'элемент null', item: null },
        { name: 'нет label', item: { href: '#users' } },
        { name: 'ни href, ни onSelect', item: { label: 'Выйти' } },
    ])('неверный пункт ($name) — ровно одно предупреждение валидатора и без ошибок', ({ item }) => {
        const { warnings, errors } = mountChecked([...profileActions(), item])

        expect(warnings).toHaveLength(1)
        expect(warnings[0]).toContain(VALIDATOR_WARNING)
        expect(errors).toEqual([])
    })

    it('верные пункты, и опасный тоже, — без предупреждений', () => {
        const { warnings, errors } = mountChecked([...profileActions(), { label: 'Удалить', danger: true, onSelect: () => {} }])

        expect(warnings).toEqual([])
        expect(errors).toEqual([])
    })
})

describe('HamburgerMenu: на странице', () => {
    it('открытие меню в шапке закрывает открытое меню строки таблицы, id у меню свои', async () => {
        const Page = {
            render: () => h('div', [
                h(HamburgerMenu, { actions: profileActions() }),
                h(DropdownButtonWithAction, { actions: [{ label: 'Удалить', onSelect: () => {} }] }, { button: () => 'Редактировать' }),
            ]),
        }
        const page = mount(Page, { attachTo: document.body })
        const header = page.findComponent(HamburgerMenu)
        const row = page.findComponent(DropdownButtonWithAction)
        const rowArrow = row.get('button[popovertarget]')
        const rowMenu = row.get('[role="menu"]')

        await rowArrow.trigger('click')
        await settle()
        expect(rowMenu.element.matches(':popover-open')).toBe(true)

        await openMenu(header)

        expect(isOpen(header)).toBe(true)
        expect(rowMenu.element.matches(':popover-open')).toBe(false)
        expect(row.emitted('update:modelValue')).toEqual([[true], [false]])
        expect(buttonOf(header).attributes('id')).not.toBe(rowArrow.attributes('id'))
        expect(menuOf(header).attributes('id')).not.toBe(rowMenu.attributes('id'))
    })

    it('новый массив тех же пунктов при открытом меню не закрывает его и не сбрасывает фокус', async () => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() } })
        await openMenu(wrapper)
        press('ArrowDown')
        press('ArrowDown')

        await wrapper.setProps({ actions: profileActions() })
        await settle()

        expect(isOpen(wrapper)).toBe(true)
        expect(document.activeElement.textContent).toBe('Поменять пароль')
    })

    it('пункты пропали при открытом меню — меню уходит, стрелки снова прокручивают страницу', async () => {
        const wrapper = mount(HamburgerMenu, { attachTo: document.body, props: { actions: profileActions() } })
        await openMenu(wrapper)

        await wrapper.setProps({ actions: [] })
        await settle()

        expect(document.body.querySelector('[role="menu"]')).toBeNull()
        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })
})
```

- [ ] **Step 2: Экспорт и SSR-пример в тестах**

В `tests/exports.test.js` заменить заголовок теста `'ровно семнадцать компонентов и плагин'` на `'ровно восемнадцать компонентов и плагин'` и вставить `'HamburgerMenu',` в список между `'ErrorMessages',` и `'NavigationMenuElement',`.

В `tests/ssrFixtures.js` после строки

```js
    ErrorMessages: { props: { messages: { email: 'Неверный email' } } },
```

вставить:

```js
    HamburgerMenu: { props: { actions: [{ label: 'Выйти', href: '#' }] } },
```

- [ ] **Step 3: Убедиться, что тесты падают**

```bash
W=.superpowers/sdd/2026-10-08-hamburger-menu
npx vitest run tests/HamburgerMenu.test.js tests/exports.test.js tests/ssr.test.js > $W/t2-red.log 2>&1; echo "exit $?"
grep -E "Failed to resolve|HamburgerMenu.vue|FAIL|Tests " $W/t2-red.log | head -20
```

Expected: `exit 1`; `tests/HamburgerMenu.test.js` падает на импорте `../src/components/HamburgerMenu.vue` (файла нет); в `tests/exports.test.js` падает `ровно восемнадцать компонентов и плагин` (нет `HamburgerMenu`); в `tests/ssr.test.js` падает `фикстура есть у каждого экспортируемого компонента, и только у них`.

- [ ] **Step 4: Создать `src/components/HamburgerMenu.vue`**

```vue
<template>
    <!-- Меню, его пункты и поведение — PopoverMenu; здесь только кнопка ☰,
         которая его открывает. Без пунктов кнопки нет. -->
    <popover-menu class="bb-dashboard-ui bb:inline-flex" :actions="actions">
        <template #trigger="trigger">
            <button
                type="button"
                :id="trigger.id"
                :popovertarget="trigger.popovertarget"
                class="bb:relative bb:inline-flex bb:items-center bb:justify-center bb:p-2 bb:rounded-md bb:text-gray-400 bb:hover:text-gray-500 bb:hover:bg-gray-100 bb:focus:outline-hidden bb:focus:bg-gray-100 bb:focus:text-gray-500 bb:transition bb:duration-150 bb:ease-in-out"
            >
                <span class="bb:sr-only">{{ texts.openMenu }}</span>
                <svg class="bb:h-6 bb:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
            </button>
        </template>
    </popover-menu>
</template>

<script>
import { withLang } from "../lang.js";
import { isMenuItem } from "../menuItems.js";
import PopoverMenu from "./PopoverMenu.vue";

export default {
    components: {
        PopoverMenu,
    },

    mixins: [withLang],

    props: {
        // Пункты меню — как у DropdownButtonWithAction: { label, href } —
        // переход, { label, onSelect } — действие, danger: true — опасный
        // пункт.
        actions: {
            type: Array,
            default: () => [],
            validator: (value) => value.every(isMenuItem),
        },
    },
};
</script>
```

В `src/index.js` после строки `export { default as DropdownButtonWithAction } from './components/DropdownButtonWithAction.vue'` вставить:

```js
export { default as HamburgerMenu } from './components/HamburgerMenu.vue'
```

- [ ] **Step 5: Тесты проходят**

```bash
W=.superpowers/sdd/2026-10-08-hamburger-menu
npx vitest run tests/HamburgerMenu.test.js tests/exports.test.js tests/ssr.test.js tests/hydration.test.js > $W/t2-green.log 2>&1; echo "exit $?"
grep -E "Test Files|Tests |×" $W/t2-green.log
```

Expected: `exit 0`, все файлы и тесты passed, `×` нет.

- [ ] **Step 6: Весь набор и сборка**

```bash
W=.superpowers/sdd/2026-10-08-hamburger-menu
npm test > $W/t2-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t2-suite.log
grep -ciE "warn|error|stderr" $W/t2-suite.log
npm run build > $W/t2-build.log 2>&1; echo "build exit $?"
grep -E "built|error" $W/t2-build.log
```

Expected: `tests exit 0`, `Test Files  31 passed (31)`, всё passed, `0`, `build exit 0`, `✓ built`.

- [ ] **Step 7: Коммит**

```bash
git add src/components/HamburgerMenu.vue src/index.js tests/HamburgerMenu.test.js tests/exports.test.js tests/ssrFixtures.js
git commit -m "feat: добавить HamburgerMenu — кнопку ☰ с меню на PopoverMenu"
```

---

### Task 3: `Popup`, `PickDay` и `Closer` — внутренние

**Files:**
- Modify: `tests/exports.test.js`
- Modify: `src/index.js`
- Modify: `tests/ssrFixtures.js`
- Modify: `playground/App.vue`
- Modify: `playground/shell.css`

**Interfaces:**
- Consumes: экспорт `HamburgerMenu` (Task 2).
- Produces: публичная поверхность из пятнадцати компонентов (Global Constraints); playground без демо `Popup`, `PickDay`, `Closer`.

- [ ] **Step 1: Тест экспорта**

В `tests/exports.test.js`:

1. Заголовок `'ровно восемнадцать компонентов и плагин'` → `'ровно пятнадцать компонентов и плагин'`; из списка убрать строки `'Closer',`, `'PickDay',`, `'Popup',`.
2. После теста `'Modal — внутренний, не экспортируется'` вставить:

```js
    // Части SelectSingle, SelectDateInterval и PageCard: проекты их
    // не используют.
    it.each(['Popup', 'PickDay', 'Closer'])('%s — внутренний, не экспортируется', (name) => {
        expect(pkg).not.toHaveProperty(name)
    })
```

- [ ] **Step 2: Тест падает**

```bash
W=.superpowers/sdd/2026-10-08-hamburger-menu
npx vitest run tests/exports.test.js > $W/t3-red.log 2>&1; echo "exit $?"
grep -E "×|Tests " $W/t3-red.log
```

Expected: `exit 1`; падают `ровно пятнадцать компонентов и плагин` и три `… — внутренний, не экспортируется`.

- [ ] **Step 3: Убрать экспорт**

В `src/index.js` удалить строки:

```js
export { default as Popup } from './components/Popup.vue'
export { default as PickDay } from './components/PickDay.vue'
export { default as Closer } from './components/Closer.vue'
```

- [ ] **Step 4: SSR-тест падает на лишних примерах**

```bash
W=.superpowers/sdd/2026-10-08-hamburger-menu
npx vitest run tests/exports.test.js tests/ssr.test.js > $W/t3-ssr-red.log 2>&1; echo "exit $?"
grep -E "×|Tests " $W/t3-ssr-red.log
```

Expected: `exit 1`; `tests/exports.test.js` проходит; в `tests/ssr.test.js` падает `фикстура есть у каждого экспортируемого компонента, и только у них`.

- [ ] **Step 5: Убрать примеры**

В `tests/ssrFixtures.js` удалить строки:

```js
    Closer: {},
    PickDay: { props: { modelValue: '15.03.2026', placeholderText: 'от' } },
    Popup: { props: { modelValue: true }, slots: { default: () => h('div', 'Меню') } },
```

Импорт `h` остаётся: им пользуется пример `PageCard`.

- [ ] **Step 6: Тесты проходят**

```bash
W=.superpowers/sdd/2026-10-08-hamburger-menu
npx vitest run tests/exports.test.js tests/ssr.test.js tests/hydration.test.js > $W/t3-green.log 2>&1; echo "exit $?"
grep -E "Test Files|Tests |×" $W/t3-green.log
```

Expected: `exit 0`, всё passed.

- [ ] **Step 7: Playground без трёх демо**

Playground импортирует компоненты из `../dist/index.js`: без этого шага его сборка упала бы на убранных именах.

В `playground/App.vue`:

1. Удалить секцию целиком:

```html
        <section>
            <h2>Popup</h2>
            <button type="button" class="demo-button" @click="popupIsOpen = !popupIsOpen">Открыть меню</button>
            <popup v-model="popupIsOpen">
                <div class="menu">Содержимое меню</div>
            </popup>
        </section>
```

2. Удалить секцию целиком:

```html
        <section>
            <h2>PickDay</h2>
            <div class="field">
                <pick-day v-model="day" placeholder-text="от"/>
            </div>
            <p>Значение: {{ day === '' ? '(пусто)' : day }}</p>
        </section>
```

3. Удалить секцию целиком:

```html
        <section>
            <h2>Closer</h2>
            <closer class="closer-demo" @clicked="closerClicks++"/>
            <p>Нажатий: {{ closerClicks }}</p>
        </section>
```

4. В секции `lang="en"` удалить строку `<pick-day v-model="day" lang="en"/>`.
5. Из импорта и из `components` удалить `Popup,`, `PickDay,`, `Closer,`.
6. Из `data()` удалить `popupIsOpen: false,`, `day: '',`, `closerClicks: 0,`.

Каждая удалённая секция отделена от соседних пустой строкой — после удаления между секциями остаётся одна пустая строка.

В `playground/shell.css`:

1. В списке `box-sizing` в начале файла удалить строку `.field,`.
2. Удалить блоки целиком:

```css
.menu {
    padding: 8px 12px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

.field {
    width: 220px;
    height: 40px;
    background: #fff;
    border: 1px solid #e5e7eb;
}
```

и

```css
.closer-demo {
    width: 32px;
    height: 32px;
}
```

Проверка:

```bash
grep -nE "popup|Popup|pick-day|PickDay|closer|Closer|popupIsOpen|closerClicks|\bday\b" playground/App.vue
grep -nE "^\.menu|\.field|closer-demo" playground/shell.css
```

Expected: оба вывода пусты.

- [ ] **Step 8: Сборка playground**

```bash
W=.superpowers/sdd/2026-10-08-hamburger-menu
npm run build > $W/t3-build.log 2>&1; echo "build exit $?"
npx vite build --config vite.playground.config.js --outDir "$PWD/$W/playground-check" --emptyOutDir --base ./ > $W/t3-pg.log 2>&1; echo "playground exit $?"
grep -E "built|error|not exported" $W/t3-pg.log
rm -rf "$W/playground-check"
```

Expected: `build exit 0`, `playground exit 0`, `✓ built`, без `error` и `not exported`.

- [ ] **Step 9: Весь набор**

```bash
W=.superpowers/sdd/2026-10-08-hamburger-menu
npm test > $W/t3-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t3-suite.log
grep -ciE "warn|error|stderr" $W/t3-suite.log
```

Expected: `tests exit 0`, всё passed, `0`.

- [ ] **Step 10: Коммит**

```bash
git add src/index.js tests/exports.test.js tests/ssrFixtures.js playground/App.vue playground/shell.css
git commit -m "feat: сделать Popup, PickDay и Closer внутренними"
```

---

### Task 4: `HamburgerMenu` в playground

**Files:**
- Modify: `playground/App.vue`
- Modify: `playground/shell.css`

**Interfaces:**
- Consumes: экспорт `HamburgerMenu` (Task 2); метод `countSelection` и счётчик `menuSelections` playground.
- Produces: демо в полосе-шапке (`.demo-header`) и вариант `lang="en"`.

- [ ] **Step 1: Демо**

В `playground/App.vue` сразу после секции `<h2>DropdownButtonWithAction</h2>` (после её закрывающего `</section>`) вставить:

```html

        <section>
            <h2>HamburgerMenu</h2>
            <!-- Полоса как шапка проектов: кнопка ☰ у правого края, меню
                 профиля открывается под ней влево. -->
            <div class="demo-header">
                <span>Шапка</span>
                <hamburger-menu :actions="profileActions"/>
            </div>
            <p>Выбрано действий: {{ menuSelections }}</p>
        </section>
```

В секции `lang="en"` после блока `<dropdown-button-with-action lang="en" …>…</dropdown-button-with-action>` вставить:

```html
            <hamburger-menu lang="en" :actions="[{ label: 'Log out', onSelect: countSelection }]"/>
```

В импорте и в `components` после `DropdownButtonWithAction,` вставить `HamburgerMenu,`.

В `computed` после `menuActions()` вставить:

```js

        // Как меню профиля в шапке проектов: два перехода и выход действием.
        // Переходы — по hash, как у menuActions.
        profileActions() {
            return [
                { label: 'Администраторы', href: '#users' },
                { label: 'Поменять пароль', href: '#password' },
                { label: 'Выйти', onSelect: this.countSelection },
            ];
        },
```

- [ ] **Step 2: Стиль полосы**

В `playground/shell.css` в список `box-sizing` в начале файла после `.demo-card-column` добавить `.demo-header` (запятую — после `.demo-card-column`):

```css
.demo-card-column,
.demo-header {
    box-sizing: border-box;
}
```

В конец файла добавить:

```css

/* Полоса демо HamburgerMenu — как шапка проектов: белая, с тенью, кнопка
   у правого края. */
.demo-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
    padding: 0 16px;
    background: #fff;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}
```

- [ ] **Step 3: Сборка playground**

```bash
W=.superpowers/sdd/2026-10-08-hamburger-menu
npm run build > $W/t4-build.log 2>&1; echo "build exit $?"
npx vite build --config vite.playground.config.js --outDir "$PWD/$W/playground-check" --emptyOutDir --base ./ > $W/t4-pg.log 2>&1; echo "playground exit $?"
grep -E "built|error|warn" $W/t4-pg.log
rm -rf "$W/playground-check"
```

Expected: `build exit 0`, `playground exit 0`, `✓ built`, без `error` и `warn`.

- [ ] **Step 4: Коммит**

```bash
git add playground/App.vue playground/shell.css
git commit -m "docs: показать HamburgerMenu в playground"
```

---

### Task 5: README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: API `HamburgerMenu` (Task 2), список экспорта (Task 3).
- Produces: документация `0.15.0`.

- [ ] **Step 1: Требования**

Заменить

```
Меню `DropdownButtonWithAction` стоит на Popover API браузера: Safari 17+,
Chrome 114+, Firefox 125+. В браузерах старше меню видно в потоке всегда.
```

на

```
Меню `DropdownButtonWithAction` и `HamburgerMenu` стоят на Popover API
браузера: Safari 17+, Chrome 114+, Firefox 125+. В браузерах старше меню
видно в потоке всегда.
```

- [ ] **Step 2: Список компонентов**

Заменить

```
Пакет экспортирует семнадцать компонентов: `Popup`, `Dot`, `PickDay`,
`RussianMobileFilter`, `Search`, `SelectDateInterval`, `SelectSingle`,
`SmallBadge`, `ErrorMessages`, `Closer`, `DownloadLink`,
`ConfirmationModal`, `DropdownButtonWithAction`, `DataTable`,
`NavigationMenuElement`, `PageCard`, `NotificationMessage` и плагин
`dashboardUi`.
```

на

```
Пакет экспортирует пятнадцать компонентов: `Dot`, `RussianMobileFilter`,
`Search`, `SelectDateInterval`, `SelectSingle`, `SmallBadge`,
`ErrorMessages`, `DownloadLink`, `ConfirmationModal`,
`DropdownButtonWithAction`, `HamburgerMenu`, `DataTable`,
`NavigationMenuElement`, `PageCard`, `NotificationMessage` и плагин
`dashboardUi`.
```

- [ ] **Step 3: Убрать разделы `Popup`, `PickDay`, `Closer`**

```bash
python3 - README.md <<'EOF'
import sys
path = sys.argv[1]
lines = open(path, encoding='utf-8').read().split('\n')
for heading, following in [('### Popup', '### Dot'), ('### PickDay', '### RussianMobileFilter'), ('### Closer', '### DownloadLink')]:
    start = lines.index(heading)
    end = lines.index(following, start)
    del lines[start:end]
open(path, 'w', encoding='utf-8').write('\n'.join(lines))
EOF
grep -nE "^### (Popup|PickDay|Closer)$" README.md; echo "grep exit $?"
```

Expected: `grep exit 1` (разделов нет).

- [ ] **Step 4: Ссылки на раздел про `changed`**

Во всём файле заменить `Почему у Popup и Dot нет события changed` на `Почему у Dot нет события changed` (заголовок раздела и ссылка из раздела `Dot`).

Тело раздела: заменить

```
У `Popup` такого момента нет: он не хранит значение фильтра, а лишь
управляет видимостью меню, и открытие меню — не повод перезагружать
данные. Момент, когда выбор действительно завершён, отслеживает
компонент, который использует `Popup` — сам или через внутренние
компоненты пакета, — `changed` эмитит он.

У `Dot` события нет по другой причине: у него нет значения вообще, поэтому
эмитить не о чем.

Отсутствие `changed` у `Popup` и `Dot` — сознательное решение, а не
пропуск.
```

на

```
У `Dot` такого момента нет: у него нет значения вообще, поэтому эмитить
не о чем.

Отсутствие `changed` у `Dot` — сознательное решение, а не пропуск.
```

- [ ] **Step 5: `SelectDateInterval`**

Заменить

```
Пара `PickDay` под одним заголовком — интервал дат «от» и «до».
```

на

```
Два поля даты под одним заголовком — интервал дат «от» и «до». Дата
выбирается в календаре Pikaday, у каждого поля — ластик очистки. Pikaday
загружается в браузере при монтировании компонента, а не при загрузке
пакета, поэтому календари появляются, когда загрузка закончится.
```

Заменить

```
События: `update:dateFrom`, `update:dateTo` — на каждый выбор в
соответствующем `PickDay`; `changed` — когда новое значение отличается от
переданного пропса (отдельно для каждой из двух дат).
```

на

```
События: `update:dateFrom`, `update:dateTo` — на каждый выбор даты
в соответствующем поле и на его очистку ластиком (пустой строкой);
`changed` — когда новое значение отличается от переданного пропса
(отдельно для каждой из двух дат).
```

- [ ] **Step 6: Раздел `HamburgerMenu`**

Вставить перед строкой `### DataTable` (с пустой строкой после):

```
### HamburgerMenu

Кнопка ☰ с меню из пунктов пропа `actions` — меню профиля в шапке
дашборда. Кнопку, панель и пункты рисует компонент, страница передаёт
только пункты. Без пунктов кнопки нет.

    <hamburger-menu :actions="menuActions" />

    import { router } from '@inertiajs/vue3';

    computed: {
        menuActions() {
            return [
                { label: 'Администраторы', href: this.route('users') },
                { label: 'Поменять пароль', href: this.route('my.password.edit') },
                { label: 'Выйти', onSelect: () => router.delete(this.route('logout')) },
            ];
        },
    },

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `actions` | `Array` | `[]` | Пункты меню — в том же формате, что у `DropdownButtonWithAction` |
| `lang` | `String` | язык плагина | `"ru"` или `"en"` |

Пункты, их проверка и вид — как у `DropdownButtonWithAction`: переход —
`{ label, href }`, действие — `{ label, onSelect }`, опасный пункт —
`danger: true`. Выход запросом DELETE — действие: Inertia пакет
не импортирует, `router.delete` вызывает страница.

Событий и `v-model` нет: меню открывают и закрывают кнопка, клик вне меню,
Escape, клик по пункту, прокрутка и изменение размера окна. Меню
открывается в верхнем слое браузера (Popover API), правым краем по правому
краю кнопки, вниз или вверх — где больше места. Открытие другого меню
закрывает предыдущее.

Клавиатура и мышь — как в меню `DropdownButtonWithAction`: пока меню
открыто, стрелки вверх и вниз переводят фокус по пунктам, Enter выбирает
пункт под фокусом; подсветка пункта — это фокус, и мышь ведёт тот же фокус.
```

- [ ] **Step 7: «Языки»**

После строки

```
| `DropdownButtonWithAction` — подпись стрелки для скринридера | Открыть меню | Open menu |
```

вставить:

```
| `HamburgerMenu` — подпись кнопки для скринридера | Открыть меню | Open menu |
```

Заменить строку

```
| `PickDay` — месяцы, дни недели, кнопки календаря | по-русски | in English |
```

на

```
| `SelectDateInterval` — месяцы, дни недели, кнопки календарей | по-русски | in English |
```

Заменить

```
Неделя начинается с понедельника. Календарь `PickDay` берёт язык при
монтировании: смена языка после монтирования в нём не отражается.
```

на

```
Неделя начинается с понедельника. Календари `SelectDateInterval` берут язык
при монтировании: смена языка после монтирования в них не отражается.
```

- [ ] **Step 8: «SSR», «Правила API», `ConfirmationModal`, «Playground», «Ограничение»**

Заменить

```
- `PickDay` загружает Pikaday в браузере при монтировании: календарь
  появляется, когда загрузка закончится;
```

на

```
- `SelectDateInterval` загружает Pikaday в браузере при монтировании:
  календари появляются, когда загрузка закончится;
```

Заменить

```
  возможность (`withEraser` у `PickDay`, `withPulse` у `Dot`).
```

на

```
  возможность (`withPulse` у `Dot`).
```

Заменить

```
  `Dot` или `align` у `Popup`, — обязательно имеет `validator`,
```

на

```
  `Dot` или `variant` у `DataTable`, — обязательно имеет `validator`,
```

Заменить

```
компонент меняет сам: `Popup` закрывается по клику вне, `SelectSingle` меняет
```

на

```
компонент меняет сам: меню `DropdownButtonWithAction` закрывается по клику вне, `SelectSingle` меняет
```

Заменить `со всеми семнадцатью компонентами` на `со всеми пятнадцатью компонентами`.

Заменить

```
внутри `Popup` и `DropdownButtonWithAction`. Ресет лежит в слое
```

на

```
внутри `DropdownButtonWithAction`. Ресет лежит в слое
```

Удалить абзац (с пустой строкой после него):

```
У `Closer` нет доступного имени, и он выключен из порядка табуляции
(`tabindex="-1"`): скринридер его не назовёт, а с клавиатуры до него не
добраться.
```

Крестик `PageCard` этого ограничения не имеет: у него `tabindex="0"` и доступное имя «Назад» (строка `PageCard` в «Языках»).

- [ ] **Step 9: «Обновление с 0.14»**

Вставить перед строкой `## Обновление с 0.13` (с пустой строкой после):

```
## Обновление с 0.14

- Меню профиля в шапке переходит с `Popup` на `HamburgerMenu`: кнопку ☰,
  панель и пункты рисует компонент, страница передаёт только пункты. Было:

      <div class="relative">
          <div>
              <button
                  @click="menuDropdownOpen = !menuDropdownOpen"
                  :class="{ 'z-20': menuDropdownOpen }"
                  class="relative inline-flex items-center justify-center p-2 rounded-md text-gray-400 …"
                  aria-label="Main menu"
                  aria-expanded="false"
              >
                  <svg class="h-6 w-6" …>…</svg>
              </button>
          </div>
          <popup class="origin-top-right right-0" v-model="menuDropdownOpen" align="right">
              <div class="mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black/5" role="menu" …>
                  <Link :href="route('users')" as="button" class="…" role="menuitem">Администраторы</Link>
                  <Link :href="route('logout')" method="delete" as="button" class="…" role="menuitem">Выйти</Link>
              </div>
          </popup>
      </div>

  Стало:

      <hamburger-menu :actions="menuActions" />

      import { router } from '@inertiajs/vue3';

      computed: {
          menuActions() {
              return [
                  { label: 'Администраторы', href: this.route('users') },
                  { label: 'Выйти', onSelect: () => router.delete(this.route('logout')) },
              ];
          },
      },

  Пункты собираются в `computed`: в шаблоне импорт `router` недоступен.
  Выход запросом DELETE — действие с `router.delete`, тот же вызов, что
  делал `<Link method="delete">`. `menuDropdownOpen` и импорт `Popup`
  больше не нужны.
- `Popup`, `PickDay` и `Closer` больше не экспортируются: это внутренние
  части `SelectSingle`, `SelectDateInterval` и `PageCard`. Импорт любого
  из них ломает сборку: «… is not exported by …».
- `0.15.0` не подтянется по `^0.14.0`: для версий `0.x` знак `^` пропускает
  только патчи. Обновление — `npm install @boobooking/dashboard-ui-components@^0.15.0`.
```

- [ ] **Step 10: Проверка**

```bash
grep -nE "Popup|PickDay|Closer|семнадцат|восемнадцат" README.md
```

Expected: только строки раздела «Обновление с 0.14». Любая другая строка — пропущенная правка.

- [ ] **Step 11: Коммит**

```bash
git add README.md
git commit -m "docs: описать HamburgerMenu и обновление с 0.14 в README"
```

---

### Task 6: Приёмка в браузерах

**Files:**
- Временно: `/Users/boobooking/Code/mars/certificates/src/public/build/ui-playground/` (удаляется в конце задачи)

**Interfaces:**
- Consumes: сборка пакета и playground (Tasks 1–5).
- Produces: подтверждение вида и поведения; коммитов нет.

- [ ] **Step 1: Сборка и выкладка playground**

Chrome (chrome-devtools MCP) видит `certificates.test`, но не `localhost`, поэтому сборка playground кладётся в публичную папку certificates.

```bash
npm run build && npx vite build --config vite.playground.config.js --outDir /Users/boobooking/Code/mars/certificates/src/public/build/ui-playground --emptyOutDir --base ./; echo "build exit $?"
```

Expected: `build exit 0`.

- [ ] **Step 2: Chrome, `https://certificates.test/build/ui-playground/index.html` и `…/host.html`**

В обоих окружениях (голом и приложения):

- `HamburgerMenu`: серая кнопка ☰ у правого края полосы; наведение даёт серый фон; клик открывает меню под кнопкой, правый край меню — по правому краю кнопки, ширина 224px; пункты — серый текст на белом;
- наведение подсвечивает пункт под курсором; ↓/↑ ведут одну подсветку, с краёв по кругу;
- Enter на «Выйти» — «Выбрано действий» +1, меню закрыто; клик по «Администраторы» в `host.html` — «Последний переход» `#users`;
- Escape и клик вне закрывают меню;
- только клавиатура: Tab до ☰, Enter открывает, ↓, Enter выбирает; повторно Tab до ☰, пробел открывает, Escape закрывает, фокус на ☰ (`document.activeElement`);
- открытое меню строки таблицы закрывается, когда открывают ☰;
- `DropdownButtonWithAction` («Без привязки», меню строк таблицы): вид и поведение как до переноса — стрелка, панель, пункты, красный «Удалить», перенос длинного пункта;
- узкое окно (`resize_page` 375px): меню ☰ не выходит за окно;
- `lang="en"`: у ☰ скрытая подпись `Open menu`;
- консоль без ошибок и предупреждений.

- [ ] **Step 3: Safari — владелец**

Попросить владельца проверить те же пункты в его Safari на `https://certificates.test/build/ui-playground/index.html` (расширение Safari глушит `keydown` на `body`, поэтому проверка — только у владельца). Дождаться ответа. Найденную ошибку — по superpowers:systematic-debugging с тестом, который сначала падает.

- [ ] **Step 4: Убрать сборку**

```bash
rm -rf /Users/boobooking/Code/mars/certificates/src/public/build/ui-playground && /bin/ls /Users/boobooking/Code/mars/certificates/src/public/build
```

Expected: `assets`, `manifest.json`.

---

### Task 7: Версия `0.15.0`

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Поднять версию**

Run: `npm version 0.15.0 --no-git-tag-version && git diff | grep -E "^[-+].*version"`
Expected: три строки `0.14.0` → `0.15.0` (одна в `package.json`, две в `package-lock.json`).

- [ ] **Step 2: Финальная проверка**

```bash
W=.superpowers/sdd/2026-10-08-hamburger-menu
npm test > $W/t7-test.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t7-test.log
grep -ciE "warn|error|stderr" $W/t7-test.log
npm run build > $W/t7-build.log 2>&1; echo "build exit $?"
grep -E "built|error" $W/t7-build.log
```

Expected: `tests exit 0`, всё passed, `0`, `build exit 0`, `✓ built`. При ненулевом коде — не коммитить, разобрать лог.

- [ ] **Step 3: Коммит**

```bash
git add package.json package-lock.json
git commit -m "chore: поднять версию пакета до 0.15.0"
```

---

## Отличия от спеки

- README (спека §9): абзац об ограничении `Closer` удаляется, а не переписывается «о крестике `PageCard`»: `PageCard` даёт крестику `tabindex="0"` и доступное имя «Назад», и ограничение к нему не относится.
- Корень `PopoverMenu` без `ref` (спека §4.2 называет `ref="root"`): якорь места ищется по `id` кнопки, обёртка по ссылке не нужна.
- Тесты Review Focus добавлены в Task 2 сверх списка спеки §8: два меню на странице, новый массив тех же пунктов, пункты пропали при открытом меню.
- Между Task 2 и Task 3 тест экспорта называет восемнадцать компонентов: `HamburgerMenu` добавляется раньше, чем убираются три внутренних.

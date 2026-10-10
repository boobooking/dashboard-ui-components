# Общий список цветов, InfoPill, ActionPill и TextPopover — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** один список цветов пакета, `InfoPill` вместо `SmallBadge`, `ActionPill` и `downloadFile` вместо `DownloadLink`, `TextPopover` на `PopoverPanel`, полоска строки `DataTable`, шесть цветов у `Dot` и меню. Выпуск `0.16.0`.

**Architecture:** `src/colors.js` хранит готовые классы каждого цвета для пяти мест (`pill`, `pillHover`, `button`, `menuItem`, `mark`) и даёт миксин `withColors` с методом `colorClass(name, part)`; компоненты берут цветовые классы только через него, а `tests/utilityPrefix.test.js` принимает этот вызов в `:class`. `ActionPill` только рисует (иконка, подпись, `isLoading`, событие `click`), скачивание — отдельная функция `downloadFile(url)`. `TextPopover` — обёртка над `PopoverPanel`, которой добавлены `panelLabel`, `panelFocusable` и событие `toggle` о фактическом состоянии панели; запрет выделения страницы висит на `toggle`.

**Tech Stack:** Vue 3.5 (Options API, SFC), Tailwind v4 с префиксом `bb:`, Vite 8 (library mode), vitest 5 + happy-dom 20 + @vue/test-utils, Popover API (в тестах — `tests/popoverStub.js`), `fetch`.

**Spec:** `docs/superpowers/specs/2026-10-10-colors-pills-text-popover-design.md`

## Global Constraints

- Репозиторий `/Users/boobooking/Code/dashboard-ui-components`, ветка — текущая `main`, коммиты прямо в неё. Версия в `package.json` — `0.15.1` до Task 14, затем `0.16.0` последним коммитом. Пуш и тег — только по слову владельца (Task 15).
- Шесть цветов, порядок — `gray`, `green`, `yellow`, `red`, `indigo`, `purple`. Синего нет.
- Наборы классов цвета `<тон>` — дословно (спека §4):
  - `pill`: `bb:bg-<тон>-100 bb:text-<тон>-800`
  - `pillHover`: `bb:hover:text-<тон>-600`
  - `button`: `bb:bg-<тон>-100 bb:border-<тон>-300 bb:text-<тон>-800 bb:hover:bg-<тон>-200`
  - `menuItem`: `bb:text-<тон>-800 bb:focus:bg-<тон>-100`
  - `mark`: `bb:text-<тон>-500`
- «Без цвета» — классы остаются в компоненте, дословно как сейчас: кнопка `bb:bg-white bb:border-gray-300 bb:text-gray-700 bb:hover:bg-gray-50` (у стрелки `bb:text-gray-500`), пункт `bb:text-gray-700 bb:focus:bg-gray-100 bb:focus:text-gray-900`, строка таблицы `bb:bg-white bb:even:bg-gray-50`.
- `ActionPill` во время работы: `bb:opacity-60 bb:cursor-not-allowed`, `disabled`, `aria-busy="true"`, иконка `Clock`; вне работы — `bb:cursor-pointer` и `pillHover`. Цвет по умолчанию — `purple`. Иконки — `download`, `refresh`.
- `Clock`: минутная стрелка `bb:animate-spin`, часовая `bb:animate-[spin_12s_linear_infinite]`, у обеих `bb:origin-center bb:motion-reduce:animate-none`.
- `downloadFile`: `fetch(url, { credentials: 'same-origin' })`; `redirected` и не-`2xx` — отказ; имя — `filename*=UTF-8''…`, затем `filename="…"`/`filename=…`, затем последний сегмент пути, затем `download`; blob-адрес освобождается через 40 000 мс.
- Тексты `i18n.js`: `showText` — «Показать текст» / «Show text», `fullText` — «Полный текст» / «Full text». Ключ `download` удаляется.
- Каждый класс в шаблоне — с префиксом `bb:` (кроме `bb-dashboard-ui`); `:class` — литералы или вызов `colorClass(…)`. Комментарий перед корнем шаблона запрещён: в сборке разработки он делает шаблон фрагментом, и класс страницы не ляжет на корень.
- Код переносится, а не пишется заново: существующие комментарии сохраняются; меняются только те, что после правки стали бы ложными.
- Стиль: в `.vue` — двойные кавычки и точки с запятой; в `.js` (`src` и тесты) — одинарные кавычки без точек с запятой; отступ 4 пробела; комментарии по-русски и описывают код как он есть.
- Вывод `npm test` чистый: ни одного предупреждения или ошибки; ожидаемые предупреждения перехватываются в тестах (`warnHandler`, `vi.spyOn(console, 'warn')`).
- Логи — в `W=.superpowers/sdd/2026-10-10-colors-pills-text-popover` (каталог `.superpowers/sdd` git-ignored своим `.gitignore`; создать `mkdir -p "$W"` в Task 1). Полный набор — `npm test > $W/<имя>.log 2>&1; echo "exit $?"`, итоги — `grep -E "Test Files|Tests |×" $W/<имя>.log`, шум — `grep -ciE "warn|error|stderr" $W/<имя>.log` (ожидается `0`).
- Коммиты — conventional commits по-русски, повелительное наклонение, без служебных строк и упоминаний инструментов; `--no-verify` запрещён.

## Review Focus

- Подсказку открыли кнопкой, а родитель с `v-model` закрыл её программно (или наоборот: открыл программно, закрыл кликом вне): запрет выделения страницы должен сняться ровно один раз, а у второй подсказки — работать дальше. Тесты — Task 7 (`toggle`) и Task 8 (запрет).
- Текст подсказки опустел, пока она открыта, и тут же пришёл запоздавший браузерный `toggle`: одно `toggle(false)`, одно `update:modelValue(false)`, счётчик запретов не уходит в минус. Тесты — Task 7 и Task 8.
- Сессия истекла, и выгрузка вернула страницу входа после перенаправления: `downloadFile` отклоняется, файл не сохраняется. Тест — Task 6.
- `Content-Disposition` без кавычек (`attachment; filename=orders_export.xlsx`, так отдаёт Laravel) и с битым `filename*`: имя файла берётся правильно, а не `download`. Тесты — Task 6.
- Двойной клик по пилюле во время работы: второй `click` не приходит, пилюля не теряет погашенный вид. Тест — Task 5; клавиатура и мышь — приёмка (Task 12).

---

### Task 1: Общий список цветов

**Files:**
- Create: `src/colors.js`
- Modify: `src/styles/index.css`
- Modify: `tests/utilityPrefix.test.js`
- Test: `tests/colors.test.js` (новый)

**Interfaces:**
- Consumes: —
- Produces: `src/colors.js` — `COLORS` (объект «имя → { pill, pillHover, button, menuItem, mark }», только для тестов), `COLOR_NAMES: string[]`, `isColor(name): boolean`, `colorClass(name, part): string` (неизвестное — `''`), миксин `withColors` с методом `colorClass`. `utilityPrefix.test.js` принимает в `:class` вызов с callee-идентификатором `colorClass`.

- [ ] **Step 1: Рабочая папка**

```bash
W=.superpowers/sdd/2026-10-10-colors-pills-text-popover
mkdir -p "$W" && git status --short
```

Expected: пусто — каталог git-ignored.

- [ ] **Step 2: Тест списка — падает**

`tests/colors.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { COLORS, COLOR_NAMES, colorClass, isColor } from '../src/colors.js'

const PARTS = ['pill', 'pillHover', 'button', 'menuItem', 'mark']

describe('список цветов', () => {
    it('шесть имён в порядке списка', () => {
        expect(COLOR_NAMES).toEqual(['gray', 'green', 'yellow', 'red', 'indigo', 'purple'])
    })

    it.each(COLOR_NAMES)('%s — ровно пять наборов', (name) => {
        expect(Object.keys(COLORS[name])).toEqual(PARTS)
    })

    // Строки модуля — не разметка компонента: tests/utilityPrefix.test.js их
    // не видит, префикс проверяется здесь.
    it.each(COLOR_NAMES)('%s — каждая утилита с префиксом bb:', (name) => {
        const tokens = PARTS.flatMap((part) => COLORS[name][part].split(/\s+/))

        expect(tokens.filter((token) => !token.startsWith('bb:'))).toEqual([])
    })

    it.each(COLOR_NAMES)('%s — одна схема на все цвета, отличается только тон', (name) => {
        expect(COLORS[name]).toEqual({
            pill: `bb:bg-${name}-100 bb:text-${name}-800`,
            pillHover: `bb:hover:text-${name}-600`,
            button: `bb:bg-${name}-100 bb:border-${name}-300 bb:text-${name}-800 bb:hover:bg-${name}-200`,
            menuItem: `bb:text-${name}-800 bb:focus:bg-${name}-100`,
            mark: `bb:text-${name}-500`,
        })
    })

    it.each(COLOR_NAMES)('isColor(%s) — да', (name) => {
        expect(isColor(name)).toBe(true)
    })

    it.each(['blue', 'Red', '', null, undefined, 42, 'toString', '__proto__'])('isColor(%s) — нет', (value) => {
        expect(isColor(value)).toBe(false)
    })

    it('colorClass: набор цвета; неизвестный цвет или набор — пустая строка', () => {
        expect(colorClass('red', 'pill')).toBe('bb:bg-red-100 bb:text-red-800')
        expect(colorClass('blue', 'pill')).toBe('')
        expect(colorClass(null, 'pill')).toBe('')
        expect(colorClass('red', 'shadow')).toBe('')
    })
})
```

Run: `npx vitest run tests/colors.test.js`
Expected: FAIL — `Failed to load url ../src/colors.js`.

- [ ] **Step 3: Модуль**

`src/colors.js`:

```js
// Общий список цветов пакета: имя цвета — классы каждого места, где цвет
// встречается. Правка оттенка или новый цвет — только здесь. Классы
// записаны целиком, литералами: Tailwind пакета генерирует только те
// утилиты, которые видит в исходниках (@source '../colors.js' в
// styles/index.css), а префикс bb: у каждой проверяет tests/colors.test.js.
// Внутренний модуль пакета.
//
// pill — InfoPill и ActionPill; pillHover — ActionPill, пока не идёт
// работа; button — основная кнопка и стрелка DropdownButtonWithAction;
// menuItem — пункт PopoverMenu; mark — Dot и полоска строки DataTable.
// mark — цвет текста, а не фона: точка красится fill-current, полоска —
// bb:bg-current, и набор у них один.
//
// «Без цвета» — белая кнопка, обычный пункт, строка без полоски — в список
// не входит: это вид компонента по умолчанию, его классы в компоненте.
export const COLORS = {
    gray: {
        pill: 'bb:bg-gray-100 bb:text-gray-800',
        pillHover: 'bb:hover:text-gray-600',
        button: 'bb:bg-gray-100 bb:border-gray-300 bb:text-gray-800 bb:hover:bg-gray-200',
        menuItem: 'bb:text-gray-800 bb:focus:bg-gray-100',
        mark: 'bb:text-gray-500',
    },
    green: {
        pill: 'bb:bg-green-100 bb:text-green-800',
        pillHover: 'bb:hover:text-green-600',
        button: 'bb:bg-green-100 bb:border-green-300 bb:text-green-800 bb:hover:bg-green-200',
        menuItem: 'bb:text-green-800 bb:focus:bg-green-100',
        mark: 'bb:text-green-500',
    },
    yellow: {
        pill: 'bb:bg-yellow-100 bb:text-yellow-800',
        pillHover: 'bb:hover:text-yellow-600',
        button: 'bb:bg-yellow-100 bb:border-yellow-300 bb:text-yellow-800 bb:hover:bg-yellow-200',
        menuItem: 'bb:text-yellow-800 bb:focus:bg-yellow-100',
        mark: 'bb:text-yellow-500',
    },
    red: {
        pill: 'bb:bg-red-100 bb:text-red-800',
        pillHover: 'bb:hover:text-red-600',
        button: 'bb:bg-red-100 bb:border-red-300 bb:text-red-800 bb:hover:bg-red-200',
        menuItem: 'bb:text-red-800 bb:focus:bg-red-100',
        mark: 'bb:text-red-500',
    },
    indigo: {
        pill: 'bb:bg-indigo-100 bb:text-indigo-800',
        pillHover: 'bb:hover:text-indigo-600',
        button: 'bb:bg-indigo-100 bb:border-indigo-300 bb:text-indigo-800 bb:hover:bg-indigo-200',
        menuItem: 'bb:text-indigo-800 bb:focus:bg-indigo-100',
        mark: 'bb:text-indigo-500',
    },
    purple: {
        pill: 'bb:bg-purple-100 bb:text-purple-800',
        pillHover: 'bb:hover:text-purple-600',
        button: 'bb:bg-purple-100 bb:border-purple-300 bb:text-purple-800 bb:hover:bg-purple-200',
        menuItem: 'bb:text-purple-800 bb:focus:bg-purple-100',
        mark: 'bb:text-purple-500',
    },
}

export const COLOR_NAMES = Object.keys(COLORS)

// Только имя из списка: не строка, чужое имя и имена свойств объекта
// (toString, __proto__) — не цвет.
export function isColor(name) {
    return COLOR_NAMES.includes(name)
}

// Неизвестный цвет или набор — пустая строка: компонент рисуется без
// цветовых классов и не падает.
export function colorClass(name, part) {
    return isColor(name) ? COLORS[name][part] ?? '' : ''
}

// Для шаблонов: :class="colorClass(color, 'pill')". Эту форму
// tests/utilityPrefix.test.js принимает в :class.
export const withColors = {
    methods: {
        colorClass,
    },
}
```

- [ ] **Step 4: Список зелёный**

Run: `npx vitest run tests/colors.test.js`
Expected: PASS, 34 теста.

- [ ] **Step 5: Исключение для `colorClass` в проверке префикса — тест падает**

В `tests/utilityPrefix.test.js` после `describe('исключение для panelClass', …)` добавить:

```js
describe('исключение для colorClass', () => {
    it(':class с вызовом colorClass принимается, строки проверяет tests/colors.test.js', () => {
        const template = '<template><span class="bb:px-3" :class="[colorClass(color, \'pill\'), isOn ? \'bb:opacity-60\' : colorClass(color, \'pillHover\')]"></span></template>'

        expect(classTokens(template, 'InfoPill.vue')).toEqual(['bb:px-3', 'bb:opacity-60'])
    })

    it('другой вызов в :class отклоняется', () => {
        const template = '<template><span :class="classesOf(color)"></span></template>'

        expect(() => classTokens(template, 'InfoPill.vue')).toThrow('форма CallExpression в :class не проверяется')
    })
})
```

Run: `npx vitest run tests/utilityPrefix.test.js -t "colorClass"`
Expected: FAIL — первый тест: `форма CallExpression в :class не проверяется — запишите классы литералами` (сейчас так отвечает ветка `default`); второй проходит уже сейчас.

- [ ] **Step 6: Принять вызов `colorClass`**

В `classLiterals` в `tests/utilityPrefix.test.js` перед `default:` добавить ветку:

```js
        case 'CallExpression':
            // colorClass(…) — классы из src/colors.js: их строки и префикс
            // проверяет tests/colors.test.js. Любой другой вызов статически
            // не проверить.
            if (node.callee.type === 'Identifier' && node.callee.name === 'colorClass') {
                return []
            }
            throw new Error('форма CallExpression в :class не проверяется — запишите классы литералами или возьмите colorClass')
```

Run: `npx vitest run tests/utilityPrefix.test.js`
Expected: PASS.

- [ ] **Step 7: Tailwind видит модуль**

В `src/styles/index.css` после строки `@source '../components';` добавить:

```css
@source '../colors.js';
```

Комментарий над `@import 'tailwindcss/utilities.css' …` не меняется.

- [ ] **Step 8: Сборка и весь набор**

```bash
W=.superpowers/sdd/2026-10-10-colors-pills-text-popover
npm test > $W/t1.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t1.log
grep -ciE "warn|error|stderr" $W/t1.log
npm run build > $W/t1-build.log 2>&1; echo "build exit $?"
grep -c "purple-300" dist/style.css
```

Expected: `tests exit 0`, всё passed, `0`, `build exit 0`, число больше `0` — `bb:border-purple-300` есть только в `colors.js` и попал в сборку.

- [ ] **Step 9: Коммит**

```bash
git add src/colors.js src/styles/index.css tests/colors.test.js tests/utilityPrefix.test.js
git commit -m "feat: завести общий список цветов пакета"
```

---

### Task 2: `InfoPill` вместо `SmallBadge`

**Files:**
- Create: `src/components/InfoPill.vue`
- Delete: `src/components/SmallBadge.vue`
- Modify: `src/components/DataTable.vue` (бейджи), `src/index.js`
- Modify: `tests/exports.test.js`, `tests/ssrFixtures.js`, `tests/DataTable.test.js`
- Test: `tests/InfoPill.test.js` (новый)

**Interfaces:**
- Consumes: `isColor`, `withColors` (Task 1).
- Produces: компонент `InfoPill` — пропы `text: String` (обязателен), `color: String` (обязателен, `validator: isColor`); экспорт `InfoPill` из `src/index.js`; `SmallBadge` не экспортируется.

- [ ] **Step 1: Тест — падает**

`tests/InfoPill.test.js`:

```js
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import InfoPill from '../src/components/InfoPill.vue'
import { COLOR_NAMES, colorClass } from '../src/colors.js'

enableAutoUnmount(afterEach)

// warnings собирает предупреждения Vue в тестах, которые нарочно передают
// недопустимое значение: вывод тестов остаётся чистым.
function mountPill(props, warnings = null) {
    return mount(InfoPill, {
        props,
        global: warnings === null ? {} : { config: { warnHandler: (message) => warnings.push(message) } },
    })
}

// Цветовые классы: фон и текст с тоном, без размера текста bb:text-xs.
function colorClasses(wrapper) {
    return wrapper.classes().filter((name) => /^bb:(?:bg|text)-[a-z]+-\d+$/.test(name))
}

describe('InfoPill', () => {
    it.each(COLOR_NAMES)('%s — классы pill из списка цветов', (color) => {
        const wrapper = mountPill({ text: 'Доставлено', color })

        expect(colorClasses(wrapper)).toEqual(colorClass(color, 'pill').split(' '))
        expect(wrapper.text()).toBe('Доставлено')
    })

    it('форма пилюли и ресет пакета на корне', () => {
        const wrapper = mountPill({ text: 'Найдено: 40', color: 'indigo' })

        expect(wrapper.element.tagName).toBe('SPAN')
        expect(wrapper.classes()).toEqual(expect.arrayContaining([
            'bb-dashboard-ui', 'bb:inline-flex', 'bb:items-center', 'bb:px-3', 'bb:py-2', 'bb:rounded-full',
            'bb:text-xs', 'bb:font-medium', 'bb:leading-none', 'bb:select-none', 'bb:whitespace-nowrap',
        ]))
    })

    it('null вместо текста — пустая пилюля; Vue отмечает только тип text', () => {
        const warnings = []
        const wrapper = mountPill({ text: null, color: 'gray' }, warnings)

        expect(wrapper.text()).toBe('')
        expect(warnings.length).toBeGreaterThan(0)
        expect(warnings.every((message) => message.includes('"text"'))).toBe(true)
    })

    it('цвет вне списка — предупреждение валидатора, пилюля без цветовых классов', () => {
        const warnings = []
        const wrapper = mountPill({ text: 'Синий', color: 'blue' }, warnings)

        expect(warnings.some((message) => message.includes('Invalid prop: custom validator check failed for prop "color"'))).toBe(true)
        expect(colorClasses(wrapper)).toEqual([])
        expect(wrapper.text()).toBe('Синий')
    })
})
```

Run: `npx vitest run tests/InfoPill.test.js`
Expected: FAIL — `Failed to load url ../src/components/InfoPill.vue`.

- [ ] **Step 2: Компонент**

`src/components/InfoPill.vue`:

```vue
<template>
    <span
        class="bb-dashboard-ui bb:inline-flex bb:items-center bb:px-3 bb:py-2 bb:rounded-full bb:text-xs bb:font-medium bb:leading-none bb:select-none bb:whitespace-nowrap"
        :class="colorClass(color, 'pill')"
        v-text="text"
    ></span>
</template>

<script>
import { isColor, withColors } from "../colors.js";

// Пилюля, которая только показывает текст: статус, счётчик, флаг, пометку.
// Цвет — имя из общего списка (src/colors.js). Текст не переносится.
export default {
    mixins: [withColors],

    props: {
        text: {
            type: String,
            required: true,
        },
        color: {
            type: String,
            required: true,
            validator: isColor,
        },
    },
};
</script>
```

Run: `npx vitest run tests/InfoPill.test.js`
Expected: PASS, 9 тестов.

- [ ] **Step 3: `DataTable` рисует бейджи `InfoPill`; тест — падает**

В `tests/DataTable.test.js` добавить импорт `import InfoPill from '../src/components/InfoPill.vue'` и в `describe('DataTable: бейдж, пустое состояние, пагинация', …)` тест:

```js
    it('бейджи «Найдено» и пустого списка — InfoPill цвета indigo', () => {
        const found = mountTable({ meta, links, foundText: 'Найдено ордеров' })
        const empty = mountTable({ rows: [], emptyText: 'Не найдено ордеров' })

        expect(found.getComponent(InfoPill).props()).toEqual({ text: 'Найдено ордеров: 40', color: 'indigo' })
        expect(empty.getComponent(InfoPill).props()).toEqual({ text: 'Не найдено ордеров', color: 'indigo' })
    })
```

Run: `npx vitest run tests/DataTable.test.js -t "InfoPill"`
Expected: FAIL — `Unable to get component`.

- [ ] **Step 4: Замена в `DataTable`, удаление `SmallBadge`, экспорт**

`src/components/DataTable.vue`:
- в шаблоне `<small-badge v-if="badgeText !== null" :text="badgeText" color="indigo"/>` → `<info-pill v-if="badgeText !== null" :text="badgeText" color="indigo"/>`;
- `import SmallBadge from "./SmallBadge.vue";` → `import InfoPill from "./InfoPill.vue";`;
- в `components` `SmallBadge,` → `InfoPill,`.

Удалить `src/components/SmallBadge.vue`.

`src/index.js`: `export { default as SmallBadge } from './components/SmallBadge.vue'` → `export { default as InfoPill } from './components/InfoPill.vue'` (на том же месте).

`tests/exports.test.js`: в списке `'SmallBadge',` убрать, `'InfoPill',` вставить после `'HamburgerMenu',` (список отсортирован). Число компонентов не меняется.

`tests/ssrFixtures.js`: строку `SmallBadge: …` убрать, после `HamburgerMenu: …` добавить:

```js
    InfoPill: { props: { text: 'Новый', color: 'green' } },
```

- [ ] **Step 5: Весь набор**

```bash
W=.superpowers/sdd/2026-10-10-colors-pills-text-popover
npm test > $W/t2.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t2.log
grep -ciE "warn|error|stderr" $W/t2.log
grep -rn "SmallBadge\|small-badge" src tests
```

Expected: `tests exit 0`, всё passed, `0`; grep — пусто.

- [ ] **Step 6: Коммит**

```bash
git add -A src tests
git commit -m "feat: заменить SmallBadge на InfoPill из общего списка цветов"
```

---

### Task 3: `Dot` из списка и полоска строки `DataTable`

**Files:**
- Modify: `src/components/Dot.vue`
- Modify: `src/components/DataTable.vue`
- Test: `tests/Dot.test.js` (новый), `tests/DataTable.test.js`

**Interfaces:**
- Consumes: `isColor`, `withColors` (Task 1).
- Produces: `Dot` — `color` любое имя списка; `DataTable` — проп `rowStripe: Function | null` (`row => имя цвета | null`), пропа `rowColor` нет.

- [ ] **Step 1: Тест `Dot` — падает**

`tests/Dot.test.js`:

```js
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import Dot from '../src/components/Dot.vue'
import { COLOR_NAMES, colorClass } from '../src/colors.js'

enableAutoUnmount(afterEach)

describe('Dot', () => {
    it.each(COLOR_NAMES)('%s — цвет mark из списка', (color) => {
        const wrapper = mount(Dot, { props: { color } })

        expect(wrapper.classes()).toContain(colorClass(color, 'mark'))
        expect(wrapper.get('svg').classes()).toContain('bb:fill-current')
    })

    it('withPulse — пульсация, без него — нет', () => {
        expect(mount(Dot, { props: { color: 'red', withPulse: true } }).classes()).toContain('bb:animate-pulse')
        expect(mount(Dot, { props: { color: 'red' } }).classes()).not.toContain('bb:animate-pulse')
    })

    it('цвет вне списка — предупреждение валидатора, точка без цвета', () => {
        const warnings = []
        const wrapper = mount(Dot, {
            props: { color: 'blue' },
            global: { config: { warnHandler: (message) => warnings.push(message) } },
        })

        expect(warnings.some((message) => message.includes('Invalid prop: custom validator check failed for prop "color"'))).toBe(true)
        expect(wrapper.classes().filter((name) => /^bb:text-[a-z]+-\d+$/.test(name))).toEqual([])
    })
})
```

Run: `npx vitest run tests/Dot.test.js`
Expected: FAIL — у `gray`, `yellow`, `indigo`, `purple` нет класса и валидатор их отклоняет; у `red`/`green` прежний класс `bb:text-red-500` совпадает — эти проходят.

- [ ] **Step 2: `Dot` на списке**

`src/components/Dot.vue` целиком:

```vue
<template>
    <div
        class="bb-dashboard-ui bb:flex bb:h-full bb:items-center bb:leading-none bb:text-4xl"
        :class="[colorClass(color, 'mark'), { 'bb:animate-pulse': withPulse }]"
    >
        <svg class="bb:fill-current bb:w-2 bb:h-2" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="45" />
        </svg>
    </div>
</template>

<script>
import { isColor, withColors } from "../colors.js";

export default {
    mixins: [withColors],

    props: {
        withPulse: {
            type: Boolean,
            default: false,
        },
        // Имя из общего списка цветов (src/colors.js).
        color: {
            type: String,
            required: true,
            validator: isColor,
        },
    },
};
</script>
```

Run: `npx vitest run tests/Dot.test.js`
Expected: PASS, 8 тестов.

- [ ] **Step 3: Тесты полоски — падают**

В `tests/DataTable.test.js` в `describe('DataTable: строки', …)` два теста `rowColor` (`'строки полосатые; rowColor красит строку без полосатости'` и `'green из rowColor — зелёная строка'`) заменить на:

```js
    // Полоска — только для глаз: ни роли, ни текста у неё нет.
    function stripeIn(cell) {
        return cell.find('span[aria-hidden="true"]')
    }

    it('строки полосатые всегда', () => {
        const wrapper = mountTable({ rowStripe: () => 'red' })

        for (const row of wrapper.findAll('tbody tr')) {
            expect(row.classes()).toEqual(['bb:bg-white', 'bb:even:bg-gray-50'])
        }
    })

    it('rowStripe: полоска цвета mark в первой видимой ячейке строки', () => {
        const wrapper = mountTable({
            columns: [{ key: 'hidden', label: 'Скрытый', visible: false }, ...columns],
            rowStripe: (row) => (row.uuid === 'a' ? 'red' : null),
        })

        const stripe = stripeIn(cellsOf(wrapper, 0)[0])
        expect(stripe.exists()).toBe(true)
        expect(stripe.classes()).toEqual(['bb:absolute', 'bb:left-0', 'bb:inset-y-0', 'bb:w-1', 'bb:bg-current', 'bb:text-red-500'])
        expect(stripeIn(cellsOf(wrapper, 0)[1]).exists()).toBe(false)
        expect(stripeIn(cellsOf(wrapper, 1)[0]).exists()).toBe(false)
    })

    it('полоска стоит перед содержимым слота первой ячейки', () => {
        const wrapper = mountTable({ rowStripe: () => 'yellow' }, { 'cell-phone': ({ row }) => h('b', row.phone) })
        const cell = cellsOf(wrapper, 0)[0]

        expect(cell.element.firstElementChild.tagName).toBe('SPAN')
        expect(cell.get('b').text()).toBe('+79990000001')
    })

    it.each([
        ['null', () => null],
        ['имя вне списка', () => 'blue'],
        ['не строку', () => 42],
    ])('rowStripe вернул %s — полоски нет', (_, rowStripe) => {
        const wrapper = mountTable({ rowStripe })

        expect(stripeIn(cellsOf(wrapper, 0)[0]).exists()).toBe(false)
    })

    it('rowStripe не функция — полоски нет, Vue отмечает тип', () => {
        const warnings = []
        const wrapper = mountTable({ rowStripe: 'red' }, {}, { warnings })

        expect(stripeIn(cellsOf(wrapper, 0)[0]).exists()).toBe(false)
        expect(warnings.some((message) => message.includes('Invalid prop: type check failed for prop "rowStripe"'))).toBe(true)
    })
```

Run: `npx vitest run tests/DataTable.test.js -t "строки"`
Expected: FAIL — полоски нет, у строк ещё объект классов `rowColor`.

- [ ] **Step 4: Полоска вместо заливки**

`src/components/DataTable.vue`:

1. `<tr …>`: убрать привязку `:class="{ 'bb:bg-white bb:even:bg-gray-50': colorOf(row) === null, 'bb:bg-red-50': …, 'bb:bg-green-50': … }"` и поставить статический класс:

```html
                        <tr
                            v-for="(row, index) in normalizedRows"
                            :key="keyOf(row, index)"
                            class="bb:bg-white bb:even:bg-gray-50"
                        >
```

2. `<td v-for="column in visibleColumns" …>` → `<td v-for="(column, columnIndex) in visibleColumns" …>`; первой строкой внутри `<td>`, перед `<slot :name="`cell-${column.key}`" …>`:

```html
                                <!-- Полоска строки — в первой видимой ячейке: ячейка
                                     relative, и полоска встаёт по её левому краю на
                                     всю высоту строки. Набор mark общего списка
                                     задаёт цвет текста, полоска берёт его через
                                     bg-current. -->
                                <span
                                    v-if="columnIndex === 0 && rowStripes[index] !== null"
                                    class="bb:absolute bb:left-0 bb:inset-y-0 bb:w-1 bb:bg-current"
                                    :class="colorClass(rowStripes[index], 'mark')"
                                    aria-hidden="true"
                                ></span>
```

3. Скрипт:
- `import { isColor, withColors } from "../colors.js";` рядом с импортом `withLang`;
- `const ROW_COLORS = ["red", "green"];` удалить;
- `mixins: [withLang]` → `mixins: [withLang, withColors]`;
- проп `rowColor` с комментарием `// row => 'red' | 'green' | null: цвет строки вместо полосатости.` заменить:

```js
        // row => имя цвета из общего списка или null: полоска слева в первой
        // ячейке строки. Строки полосатые всегда.
        rowStripe: {
            type: Function,
            default: null,
        },
```

- в `computed` после `normalizedRows()`:

```js
        // Цвет полоски каждой строки по её номеру: rowStripe вызывается
        // один раз на строку за рендер.
        rowStripes() {
            return this.normalizedRows.map((row) => this.stripeOf(row));
        },
```

- метод `colorOf(row)` заменить:

```js
        // Не функция, null и имя вне списка — без полоски.
        stripeOf(row) {
            if (typeof this.rowStripe !== "function") {
                return null;
            }

            const color = this.rowStripe(row);

            return isColor(color) ? color : null;
        },
```

Run: `npx vitest run tests/DataTable.test.js`
Expected: PASS.

- [ ] **Step 5: Весь набор**

```bash
W=.superpowers/sdd/2026-10-10-colors-pills-text-popover
npm test > $W/t3.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t3.log
grep -ciE "warn|error|stderr" $W/t3.log
grep -rn "rowColor\|colorOf\|ROW_COLORS\|isRed\|isGreen" src tests
```

Expected: `tests exit 0`, всё passed, `0`; grep — пусто.

- [ ] **Step 6: Коммит**

```bash
git add src/components/Dot.vue src/components/DataTable.vue tests/Dot.test.js tests/DataTable.test.js
git commit -m "feat: красить Dot из общего списка и заменить заливку строк DataTable полоской rowStripe"
```

---

### Task 4: Меню на списке цветов, legacy-предупреждения убраны

**Files:**
- Modify: `src/menuItems.js`
- Modify: `src/components/PopoverMenu.vue`, `src/components/DropdownButtonWithAction.vue`, `src/components/HamburgerMenu.vue`
- Test: `tests/DropdownButtonWithAction.test.js`, `tests/HamburgerMenu.test.js`

**Interfaces:**
- Consumes: `isColor`, `withColors`, `COLOR_NAMES`, `colorClass` (Task 1).
- Produces: `src/menuItems.js` — `isMenuItem`, `toMenuItems`, `isLinkItem`, `itemColor` (без `warnsRemovedDanger`); цвет пункта и основной кнопки — любое имя списка.

- [ ] **Step 1: Тесты цветов и пункта с `danger` — падают**

`tests/DropdownButtonWithAction.test.js`:

1. Импорт: `import { COLOR_NAMES, colorClass } from '../src/colors.js'`.
2. Тест `'пункты задают цвет текста сами — обычный, жёлтый, красный: у popover в верхнем слое свой color'`: красные ожидания `['bb:text-red-700', 'bb:focus:bg-red-50']` → `['bb:text-red-800', 'bb:focus:bg-red-100']`; после теста добавить:

```js
    it.each(COLOR_NAMES)('пункт меню цвета %s — классы menuItem из списка, без обычных', (color) => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [main, { label: 'Пункт', color, onSelect: () => {} }] },
        })
        const classes = menuOf(wrapper).get('[role="menuitem"]').classes()

        expect(classes).toEqual(expect.arrayContaining(colorClass(color, 'menuItem').split(' ')))
        expect(classes).not.toContain('bb:text-gray-700')
    })
```

3. В `describe('DropdownButtonWithAction: проверка пунктов', …)`: случай `{ name: 'неверный color', item: { label: 'Удалить', color: 'green', onSelect: fn } }` → `color: 'blue'`; в список верных добавить `{ name: 'действие с color: purple', item: { label: 'Отметить', color: 'purple', onSelect: fn } }` и `{ name: 'пункт с лишним полем danger', item: { label: 'Удалить', danger: true, onSelect: fn } }`.
4. В `describe('DropdownButtonWithAction: кнопка из действий', …)` таблицу `it.each([{ name: 'обычное', … }, { name: 'жёлтое', … }, { name: 'красное', … }])('первое действие $name — …')` заменить двумя тестами:

```js
    it('первое действие без цвета — белая основная кнопка и стрелка', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [main, { label: 'Удалить', onSelect: () => {} }] },
        })

        expect(mainOf(wrapper).classes()).toEqual(expect.arrayContaining(['bb:bg-white', 'bb:border-gray-300', 'bb:text-gray-700', 'bb:hover:bg-gray-50']))
        expect(arrowOf(wrapper).classes()).toEqual(expect.arrayContaining(['bb:bg-white', 'bb:border-gray-300', 'bb:text-gray-500', 'bb:hover:bg-gray-50']))
    })

    it.each(COLOR_NAMES)('первое действие цвета %s — основная кнопка и стрелка с классами button', (color) => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [{ ...main, color }, { label: 'Удалить', onSelect: () => {} }] },
        })
        const expected = colorClass(color, 'button').split(' ')

        expect(mainOf(wrapper).classes()).toEqual(expect.arrayContaining(expected))
        expect(arrowOf(wrapper).classes()).toEqual(expect.arrayContaining(expected))
        expect(mainOf(wrapper).classes()).not.toContain('bb:bg-white')
    })
```

5. В `'цвет пункта меню основную кнопку и стрелку не красит'`: `not.toContain('bb:bg-red-50')` → `not.toContain('bb:bg-red-100')`.
6. Блоки `describe('DropdownButtonWithAction: убранный слот actions', …)`, `describe('DropdownButtonWithAction: убранное поле danger', …)` и `describe('DropdownButtonWithAction: убранный слот button', …)` удалить целиком и на место первого поставить:

```js
describe('DropdownButtonWithAction: без предупреждений об убранном API', () => {
    let warn

    beforeEach(() => {
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
        warn.mockRestore()
    })

    it('пункт с полем danger — обычный пункт; красный — по color', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: {
                actions: [
                    main,
                    { label: 'Опасное', danger: true, onSelect: () => {} },
                    { label: 'Удалить', danger: true, color: 'red', onSelect: () => {} },
                ],
            },
        })
        const [plain, red] = menuOf(wrapper).findAll('[role="menuitem"]').map((item) => item.classes())

        expect(plain).toContain('bb:text-gray-700')
        expect(red).toContain('bb:text-red-800')
        expect(warn).not.toHaveBeenCalled()
    })

    it('слоты actions и button не рисуются и не дают предупреждений', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions },
            slots: {
                actions: () => h('a', { href: '#', class: 'from-slot' }, 'Из слота'),
                button: () => h('span', { class: 'from-slot' }, 'Из слота'),
            },
        })

        expect(wrapper.find('.from-slot').exists()).toBe(false)
        expect(warn).not.toHaveBeenCalled()
    })
})
```

Имена `main`, `actions`, `menuOf`, `mainOf`, `arrowOf` — уже есть в файле. Если после удаления блоков `vi.stubEnv`/`vi.unstubAllEnvs` больше нигде не используются — это вызовы, а не импорты, править нечего; импорты `vi`, `beforeEach`, `afterEach`, `h` остаются нужными.

`tests/HamburgerMenu.test.js`:

1. Импорт: `import { COLOR_NAMES, colorClass } from '../src/colors.js'`.
2. `{ name: 'неверный color', item: { label: 'Удалить', color: 'green', onSelect: () => {} } }` → `color: 'blue'`.
3. В `'обычный, жёлтый и красный пункт — свой цвет текста и подсветки'` красные ожидания → `['bb:text-red-800', 'bb:focus:bg-red-100']`; после теста:

```js
    it.each(COLOR_NAMES)('пункт цвета %s — классы menuItem из списка', (color) => {
        const wrapper = mount(HamburgerMenu, {
            attachTo: document.body,
            props: { actions: [{ label: 'Пункт', color, onSelect: () => {} }] },
        })

        expect(itemsOf(wrapper)[0].classes()).toEqual(expect.arrayContaining(colorClass(color, 'menuItem').split(' ')))
    })
```

4. Блок `describe('HamburgerMenu: убранное поле danger', …)` заменить:

```js
describe('HamburgerMenu: пункт с полем danger', () => {
    it('обычный пункт без предупреждений; красный — по color', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const warnings = []
        const wrapper = mount(HamburgerMenu, {
            attachTo: document.body,
            props: {
                actions: [
                    ...profileActions(),
                    { label: 'Опасное', danger: true, onSelect: () => {} },
                    { label: 'Удалить', danger: true, color: 'red', onSelect: () => {} },
                ],
            },
            global: { config: { warnHandler: (message) => warnings.push(message) } },
        })

        expect(itemsOf(wrapper)[3].classes()).toContain('bb:text-gray-700')
        expect(itemsOf(wrapper)[4].classes()).toContain('bb:text-red-800')
        expect(warnings).toEqual([])
        expect(warn).not.toHaveBeenCalled()
        warn.mockRestore()
    })
})
```

Убрать из импорта `tests/HamburgerMenu.test.js` то, что после удаления блока не используется (проверить `grep -n "reactive\|nextTick\|stubEnv" tests/HamburgerMenu.test.js`).

Run: `npx vitest run tests/DropdownButtonWithAction.test.js tests/HamburgerMenu.test.js`
Expected: FAIL — красные классы прежние, цвета `green`…`purple` отклоняются валидатором, пункт с `danger` даёт предупреждение.

- [ ] **Step 2: `menuItems.js`**

`src/menuItems.js` целиком:

```js
// Пункты меню DropdownButtonWithAction и HamburgerMenu: проверка для
// валидаторов пропа actions, разбор и цвет для PopoverMenu.
// Внутренний модуль пакета.

import { isColor } from './colors.js'

// Пункт меню — ровно одна из двух форм: переход (href без onSelect) или
// действие (onSelect без href). Поле отсутствует, если оно undefined.
// Цвет — color: имя из общего списка цветов (src/colors.js).
export function isMenuItem(item) {
    if (typeof item !== 'object' || item === null) {
        return false
    }

    if (typeof item.label !== 'string' || item.label === '') {
        return false
    }

    if (item.color !== undefined && !isColor(item.color)) {
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

// Ссылка — только при непустом строковом href; у ссылки onSelect
// не вызывается.
export function isLinkItem(item) {
    return typeof item.href === 'string' && item.href !== ''
}

// Цвет пункта для его классов. Без color и с color вне списка — обычный:
// пункт с неверным color валидатор отклоняет, и рисуется он обычным.
export function itemColor(item) {
    return isColor(item.color) ? item.color : null
}
```

- [ ] **Step 3: `PopoverMenu`**

`src/components/PopoverMenu.vue`:
- у `<a>` и у `<button>` пункта объект

```html
                    :class="{
                        'bb:text-gray-700 bb:focus:bg-gray-100 bb:focus:text-gray-900': color(item) === null,
                        'bb:text-yellow-800 bb:focus:bg-yellow-100': color(item) === 'yellow',
                        'bb:text-red-700 bb:focus:bg-red-50': color(item) === 'red',
                    }"
```

заменить на

```html
                    :class="color(item) === null ? 'bb:text-gray-700 bb:focus:bg-gray-100 bb:focus:text-gray-900' : colorClass(color(item), 'menuItem')"
```

- импорт `import { withColors } from "../colors.js";`, `mixins: [withNavigation]` → `mixins: [withNavigation, withColors]`;
- комментарий пропа `actions`: `color: 'yellow' или 'red' — цвет` → `color — имя из общего списка цветов`.

- [ ] **Step 4: `DropdownButtonWithAction`**

`src/components/DropdownButtonWithAction.vue`:
- у основной `<a>` и `<button>` объект `:class` заменить:

```html
            :class="[
                { 'bb:rounded-l-md': hasMenu, 'bb:rounded-md': !hasMenu },
                mainColor === null ? 'bb:bg-white bb:border-gray-300 bb:text-gray-700 bb:hover:bg-gray-50' : colorClass(mainColor, 'button'),
            ]"
```

- у стрелки (`#trigger`) объект `:class` заменить:

```html
                    :class="mainColor === null ? 'bb:bg-white bb:border-gray-300 bb:text-gray-500 bb:hover:bg-gray-50' : colorClass(mainColor, 'button')"
```

- импорт: `import { isLinkItem, isMenuItem, itemColor, toMenuItems, warnsRemovedDanger } from "../menuItems.js";` → `import { isLinkItem, isMenuItem, itemColor, toMenuItems } from "../menuItems.js";` и `import { withColors } from "../colors.js";`;
- `mixins: [withLang, withNavigation, warnsRemovedDanger("DropdownButtonWithAction")]` → `mixins: [withLang, withNavigation, withColors]`;
- хук `created()` с двумя предупреждениями (слоты `actions` и `button`) удалить целиком вместе с комментариями;
- комментарий пропа `actions`: `color: 'yellow' или 'red' — цвет.` → `color — имя из общего списка цветов.`;
- комментарий над шаблоном про цвет первого действия — без изменений.

- [ ] **Step 5: `HamburgerMenu`**

`src/components/HamburgerMenu.vue`:
- `import { isMenuItem, warnsRemovedDanger } from "../menuItems.js";` → `import { isMenuItem } from "../menuItems.js";`;
- `mixins: [withLang, warnsRemovedDanger("HamburgerMenu")]` → `mixins: [withLang]`;
- комментарий пропа: `color: 'yellow' или 'red' — цвет.` → `color — имя из общего списка цветов.`

- [ ] **Step 6: Тесты меню зелёные, весь набор**

```bash
W=.superpowers/sdd/2026-10-10-colors-pills-text-popover
npx vitest run tests/DropdownButtonWithAction.test.js tests/HamburgerMenu.test.js tests/utilityPrefix.test.js
npm test > $W/t4.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t4.log
grep -ciE "warn|error|stderr" $W/t4.log
grep -rn "danger\|warnsRemoved\|слот actions убран\|слот button убран" src tests | grep -v "dangerous\|Dangerous"
```

Expected: PASS; `tests exit 0`, всё passed, `0`; последний grep — только новые тесты «пункт с полем danger» и `danger: true` в них.

- [ ] **Step 7: Коммит**

```bash
git add src/menuItems.js src/components/PopoverMenu.vue src/components/DropdownButtonWithAction.vue src/components/HamburgerMenu.vue tests/DropdownButtonWithAction.test.js tests/HamburgerMenu.test.js
git commit -m "feat: красить кнопку и пункты меню из общего списка и убрать предупреждения об убранном API"
```

---

### Task 5: Иконки и `ActionPill` вместо `DownloadLink`

**Files:**
- Create: `src/components/icons/Refresh.vue`, `src/components/icons/Clock.vue`, `src/components/ActionPill.vue`
- Modify: `src/components/icons/Download.vue` (`aria-hidden`)
- Delete: `src/components/DownloadLink.vue`
- Modify: `src/i18n.js`, `src/index.js`, `src/styles/index.css` (комментарий)
- Modify: `tests/i18n.test.js`, `tests/exports.test.js`, `tests/ssrFixtures.js`
- Test: `tests/ActionPill.test.js` (новый)

**Interfaces:**
- Consumes: `isColor`, `withColors`, `COLOR_NAMES`, `colorClass` (Task 1).
- Produces: `ActionPill` — пропы `title: String` (обязателен), `icon: 'download' | 'refresh'` (обязателен), `color: String = 'purple'`, `isLoading: Boolean = false`, `loadingText: String = null`; событие `click`. Иконки `Clock`, `Refresh`, `Download` — внутренние. Ключа `download` в `i18n.js` нет.

- [ ] **Step 1: Тест — падает**

`tests/ActionPill.test.js`:

```js
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import ActionPill from '../src/components/ActionPill.vue'
import { COLOR_NAMES, colorClass } from '../src/colors.js'

enableAutoUnmount(afterEach)

const DOWNLOAD_PATH = 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'
const REFRESH_PATH = 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'

function mountPill(props = {}, warnings = null) {
    return mount(ActionPill, {
        props: { title: 'скачать xlsx', icon: 'download', ...props },
        global: warnings === null ? {} : { config: { warnHandler: (message) => warnings.push(message) } },
    })
}

function iconPath(wrapper) {
    return wrapper.find('svg path').attributes('d')
}

// Цветовые классы: фон и текст с тоном и наведение с тоном.
function colorClasses(wrapper) {
    return wrapper.classes().filter((name) => /^bb:(?:hover:)?(?:bg|text)-[a-z]+-\d+$/.test(name))
}

describe('ActionPill: вид', () => {
    it('кнопка с подписью, подсказкой и иконкой', () => {
        const wrapper = mountPill()

        expect(wrapper.element.tagName).toBe('BUTTON')
        expect(wrapper.attributes('type')).toBe('button')
        expect(wrapper.attributes('title')).toBe('скачать xlsx')
        expect(wrapper.text()).toBe('скачать xlsx')
        expect(iconPath(wrapper)).toBe(DOWNLOAD_PATH)
        expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true')
        expect(wrapper.classes()).toEqual(expect.arrayContaining([
            'bb-dashboard-ui', 'bb:inline-flex', 'bb:items-center', 'bb:px-3', 'bb:py-1.5', 'bb:rounded-full',
            'bb:text-xs', 'bb:font-medium', 'bb:leading-none', 'bb:select-none', 'bb:whitespace-nowrap', 'bb:cursor-pointer',
        ]))
    })

    it('icon refresh — стрелки обновления', () => {
        expect(iconPath(mountPill({ icon: 'refresh', title: 'запросить статусы' }))).toBe(REFRESH_PATH)
    })

    it('цвет по умолчанию — purple, с наведением', () => {
        expect(colorClasses(mountPill())).toEqual([...colorClass('purple', 'pill').split(' '), colorClass('purple', 'pillHover')])
    })

    it.each(COLOR_NAMES)('%s — классы pill и pillHover из списка', (color) => {
        expect(colorClasses(mountPill({ color }))).toEqual([...colorClass(color, 'pill').split(' '), colorClass(color, 'pillHover')])
    })

    it('клик — событие click без аргументов', async () => {
        const wrapper = mountPill()

        await wrapper.trigger('click')

        expect(wrapper.emitted('click')).toEqual([[]])
    })
})

describe('ActionPill: идёт работа', () => {
    it('погашена, недоступна, занята; часы и текст на время работы', () => {
        const wrapper = mountPill({ isLoading: true, loadingText: 'формируется отчёт' })

        expect(wrapper.attributes('disabled')).toBeDefined()
        expect(wrapper.attributes('aria-busy')).toBe('true')
        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb:opacity-60', 'bb:cursor-not-allowed']))
        expect(wrapper.classes()).not.toContain('bb:cursor-pointer')
        expect(colorClasses(wrapper)).toEqual(colorClass('purple', 'pill').split(' '))
        expect(wrapper.find('svg circle').exists()).toBe(true)
        expect(wrapper.find(`path[d="${DOWNLOAD_PATH}"]`).exists()).toBe(false)
        expect(wrapper.text()).toBe('формируется отчёт')
        expect(wrapper.attributes('title')).toBe('формируется отчёт')
    })

    it.each([null, ''])('loadingText %s — остаётся title', (loadingText) => {
        expect(mountPill({ isLoading: true, loadingText }).text()).toBe('скачать xlsx')
    })

    it('второй клик во время работы не проходит', async () => {
        const wrapper = mountPill()
        await wrapper.trigger('click')
        await wrapper.setProps({ isLoading: true })

        await wrapper.trigger('click')

        expect(wrapper.emitted('click')).toEqual([[]])
        expect(wrapper.classes()).toContain('bb:opacity-60')
    })

    it('работа кончилась — снова иконка, подпись и наведение', async () => {
        const wrapper = mountPill({ isLoading: true, loadingText: 'формируется отчёт' })

        await wrapper.setProps({ isLoading: false })

        expect(wrapper.attributes('disabled')).toBeUndefined()
        expect(wrapper.attributes('aria-busy')).toBeUndefined()
        expect(iconPath(wrapper)).toBe(DOWNLOAD_PATH)
        expect(wrapper.text()).toBe('скачать xlsx')
        expect(wrapper.classes()).toContain(colorClass('purple', 'pillHover'))
    })

    it('часы: стрелки крутятся вокруг центра, при «уменьшить движение» стоят', () => {
        const [hour, minute] = mountPill({ isLoading: true }).findAll('svg line')

        expect(minute.classes()).toEqual(['bb:origin-center', 'bb:animate-spin', 'bb:motion-reduce:animate-none'])
        expect(hour.classes()).toEqual(['bb:origin-center', 'bb:animate-[spin_12s_linear_infinite]', 'bb:motion-reduce:animate-none'])
        expect(minute.attributes()).toMatchObject({ x1: '12', y1: '12', x2: '12', y2: '6.5' })
        expect(hour.attributes()).toMatchObject({ x1: '12', y1: '12', x2: '15', y2: '12' })
    })
})

describe('ActionPill: неверные значения', () => {
    it('неизвестная иконка — предупреждение валидатора, пилюля без иконки', () => {
        const warnings = []
        const wrapper = mountPill({ icon: 'trash' }, warnings)

        expect(warnings.some((message) => message.includes('Invalid prop: custom validator check failed for prop "icon"'))).toBe(true)
        expect(wrapper.find('svg').exists()).toBe(false)
        expect(wrapper.text()).toBe('скачать xlsx')
    })

    it('цвет вне списка — предупреждение валидатора, без цветовых классов', () => {
        const warnings = []
        const wrapper = mountPill({ color: 'blue' }, warnings)

        expect(warnings.some((message) => message.includes('Invalid prop: custom validator check failed for prop "color"'))).toBe(true)
        expect(colorClasses(wrapper)).toEqual([])
    })

    it('title null — пустая подпись; Vue отмечает только тип title', () => {
        const warnings = []
        const wrapper = mountPill({ title: null }, warnings)

        expect(wrapper.text()).toBe('')
        expect(warnings.every((message) => message.includes('"title"'))).toBe(true)
    })
})
```

Run: `npx vitest run tests/ActionPill.test.js`
Expected: FAIL — `Failed to load url ../src/components/ActionPill.vue`.

- [ ] **Step 2: Иконки**

`src/components/icons/Download.vue` — в `<svg …>` добавить `aria-hidden="true"` последним атрибутом; остальное без изменений.

`src/components/icons/Refresh.vue`:

```vue
<template>
    <svg class="bb:w-4 bb:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
    </svg>
</template>

<script>
export default {};
</script>
```

`src/components/icons/Clock.vue`:

```vue
<template>
    <svg
        class="bb:w-4 bb:h-4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
    >
        <circle cx="12" cy="12" r="9"/>
        <line class="bb:origin-center bb:animate-[spin_12s_linear_infinite] bb:motion-reduce:animate-none" x1="12" y1="12" x2="15" y2="12"/>
        <line class="bb:origin-center bb:animate-spin bb:motion-reduce:animate-none" x1="12" y1="12" x2="12" y2="6.5"/>
    </svg>
</template>

<script>
// Часы с бегущими стрелками — пока идёт работа ActionPill. Минутная —
// оборот за секунду (animate-spin), часовая — за двенадцать. Стрелки
// крутятся вокруг центра циферблата: у SVG-элементов transform-box
// по умолчанию view-box, и origin-center — центр viewBox, (12, 12). Своих
// @keyframes нет: spin Tailwind генерирует вместе с animate-spin. При
// системной настройке «уменьшить движение» стрелки стоят.
export default {};
</script>
```

- [ ] **Step 3: Компонент**

`src/components/ActionPill.vue`:

```vue
<template>
    <button
        type="button"
        class="bb-dashboard-ui bb:inline-flex bb:items-center bb:px-3 bb:py-1.5 bb:rounded-full bb:text-xs bb:font-medium bb:leading-none bb:select-none bb:whitespace-nowrap"
        :class="[
            colorClass(color, 'pill'),
            isLoading ? 'bb:opacity-60 bb:cursor-not-allowed' : 'bb:cursor-pointer',
            isLoading ? '' : colorClass(color, 'pillHover'),
        ]"
        :title="label"
        :disabled="isLoading"
        :aria-busy="isLoading ? 'true' : null"
        @click="$emit('click')"
    >
        <!-- Пока идёт работа — часы вместо иконки действия. Неизвестная
             иконка — пилюля без иконки. -->
        <clock-icon v-if="isLoading"/>
        <download-icon v-else-if="icon === 'download'"/>
        <refresh-icon v-else-if="icon === 'refresh'"/>
        <span class="bb:ml-1" v-text="label"></span>
    </button>
</template>

<script>
import Clock from "./icons/Clock.vue";
import Download from "./icons/Download.vue";
import Refresh from "./icons/Refresh.vue";
import { isColor, withColors } from "../colors.js";

// Иконки действий: новое действие — новая иконка и новое имя здесь.
const ICONS = ["download", "refresh"];

// Пилюля, которой запускают действие. Что делает действие, пилюля не знает:
// страница слушает click и сама передаёт isLoading, пока действие идёт.
// Кнопка disabled на время работы: второй клик браузер не пропустит.
export default {
    components: {
        "clock-icon": Clock,
        "download-icon": Download,
        "refresh-icon": Refresh,
    },

    mixins: [withColors],

    emits: ["click"],

    props: {
        // Подпись и всплывающая подсказка.
        title: {
            type: String,
            required: true,
        },
        icon: {
            type: String,
            required: true,
            validator: (value) => ICONS.includes(value),
        },
        // Имя из общего списка цветов (src/colors.js).
        color: {
            type: String,
            default: "purple",
            validator: isColor,
        },
        // Идёт работа: пилюля погашена, вместо иконки — часы.
        isLoading: {
            type: Boolean,
            default: false,
        },
        // Подпись на время работы; null и пустая строка — остаётся title.
        loadingText: {
            type: String,
            default: null,
        },
    },

    computed: {
        label() {
            const text = this.isLoading && typeof this.loadingText === "string" && this.loadingText !== ""
                ? this.loadingText
                : this.title;

            return typeof text === "string" ? text : "";
        },
    },
};
</script>
```

Run: `npx vitest run tests/ActionPill.test.js`
Expected: PASS.

- [ ] **Step 4: `DownloadLink` уходит**

- Удалить `src/components/DownloadLink.vue`.
- `src/index.js`: `export { default as DownloadLink } from './components/DownloadLink.vue'` → `export { default as ActionPill } from './components/ActionPill.vue'`.
- `src/i18n.js`: в `ru` удалить строку `download: 'Скачать',`, в `en` — `download: 'Download',`.
- `src/styles/index.css`: в комментарии к сбросу ссылок `Без этого в приложении без preflight ссылка — внутри компонента или сам корень, как у DownloadLink, — осталась бы синей и подчёркнутой.` → `Без этого в приложении без preflight ссылка — внутри компонента или сам корень — осталась бы синей и подчёркнутой.`; селектор `a.bb-dashboard-ui` остаётся.
- `tests/i18n.test.js`: убрать `import DownloadLink …`, блок `describe('DownloadLink: подпись', …)` и случай `'DownloadLink, lang de и плагин en — English'` в `'недопустимый lang: язык плагина, а не падение'`.
- `tests/exports.test.js`: `'DownloadLink',` убрать, `'ActionPill',` вставить первым элементом списка.
- `tests/ssrFixtures.js`: строку `DownloadLink: …` убрать, первой строкой объекта добавить:

```js
    ActionPill: { props: { title: 'скачать xlsx', icon: 'download', isLoading: true, loadingText: 'формируется отчёт' } },
```

- [ ] **Step 5: Весь набор и сборка**

```bash
W=.superpowers/sdd/2026-10-10-colors-pills-text-popover
npm test > $W/t5.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t5.log
grep -ciE "warn|error|stderr" $W/t5.log
grep -rn "DownloadLink\|download-link\|texts.download" src tests
npm run build > $W/t5-build.log 2>&1; echo "build exit $?"
grep -o "@keyframes spin" dist/style.css | head -1
grep -o "spin_12s_linear_infinite[^}]*}" dist/style.css | head -1
grep -c "prefers-reduced-motion" dist/style.css
```

Expected: `tests exit 0`, всё passed, `0`; первый grep — пусто; `build exit 0`; `@keyframes spin`; правило `animate-[spin_12s_linear_infinite]` с `animation: spin 12s linear infinite`; число больше `0`.

- [ ] **Step 6: Коммит**

```bash
git add -A src tests
git commit -m "feat: добавить ActionPill с часами на время работы вместо DownloadLink"
```

---

### Task 6: `downloadFile`

**Files:**
- Create: `src/download.js`
- Modify: `src/index.js`, `tests/exports.test.js`, `tests/ssr.test.js`, `tests/hydration.test.js`
- Test: `tests/download.test.js` (новый)

**Interfaces:**
- Consumes: —
- Produces: `downloadFile(url: string): Promise<void>` — экспорт из `src/index.js`; отклоняется `Error` при `redirected` и не-`2xx`, ошибкой `fetch` — при сетевой.

- [ ] **Step 1: Тест — падает**

`tests/download.test.js`:

```js
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadFile } from '../src/download.js'

// fetch, blob-адреса и клик по ссылке подменяются: в happy-dom скачивания
// нет, а проверить нужно, что и как отдано браузеру.
const BLOB_URL = 'blob:https://dashboard.test/1'
const original = {}
let clicks
let fetchMock

function response({ status = 200, redirected = false, disposition = null } = {}) {
    const headers = new Headers()
    if (disposition !== null) {
        headers.set('Content-Disposition', disposition)
    }

    return { ok: status >= 200 && status < 300, status, redirected, headers, blob: async () => new Blob(['xlsx']) }
}

beforeEach(() => {
    vi.useFakeTimers()
    clicks = []
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    original.create = URL.createObjectURL
    original.revoke = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => BLOB_URL)
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
        clicks.push({ href: this.getAttribute('href'), download: this.getAttribute('download'), connected: this.isConnected })
    })
})

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    URL.createObjectURL = original.create
    URL.revokeObjectURL = original.revoke
    document.body.innerHTML = ''
})

describe('downloadFile: запрос и файл', () => {
    it('запрос с cookie сессии; скрытая ссылка на blob кликнута и убрана', async () => {
        fetchMock.mockResolvedValue(response({ disposition: 'attachment; filename=orders_export.xlsx' }))

        await downloadFile('/orders/export?phone=7')

        expect(fetchMock).toHaveBeenCalledWith('/orders/export?phone=7', { credentials: 'same-origin' })
        expect(clicks).toEqual([{ href: BLOB_URL, download: 'orders_export.xlsx', connected: true }])
        expect(document.body.querySelector('a')).toBeNull()
    })

    it.each([
        ['filename без кавычек (Laravel)', 'attachment; filename=orders_export.xlsx', '/export', 'orders_export.xlsx'],
        ['filename в кавычках', 'attachment; filename="orders export.xlsx"', '/export', 'orders export.xlsx'],
        ['filename* главнее filename', 'attachment; filename="fallback.xlsx"; filename*=UTF-8\'\'%D0%BE%D1%82%D1%87%D1%91%D1%82.xlsx', '/export', 'отчёт.xlsx'],
        ['битый filename* — берётся filename', 'attachment; filename="fallback.xlsx"; filename*=UTF-8\'\'%E0%A4%A', '/export', 'fallback.xlsx'],
        ['заголовок без имени — последний сегмент пути', 'attachment', '/files/orders%20report.xlsx?page=2', 'orders report.xlsx'],
        ['без заголовка — последний сегмент пути', null, '/build/ui-playground/report.csv', 'report.csv'],
        ['без заголовка и пути — download', null, '/', 'download'],
    ])('имя файла: %s', async (_, disposition, url, expected) => {
        fetchMock.mockResolvedValue(response({ disposition }))

        await downloadFile(url)

        expect(clicks[0].download).toBe(expected)
    })

    it('blob-адрес освобождается через 40 секунд, не раньше', async () => {
        fetchMock.mockResolvedValue(response())

        await downloadFile('/export')

        vi.advanceTimersByTime(39999)
        expect(URL.revokeObjectURL).not.toHaveBeenCalled()
        vi.advanceTimersByTime(1)
        expect(URL.revokeObjectURL).toHaveBeenCalledWith(BLOB_URL)
    })
})

describe('downloadFile: отказ', () => {
    it.each([404, 500])('ответ %s — отказ с кодом, файла нет', async (status) => {
        fetchMock.mockResolvedValue(response({ status }))

        await expect(downloadFile('/export')).rejects.toThrow(String(status))
        expect(URL.createObjectURL).not.toHaveBeenCalled()
        expect(clicks).toEqual([])
    })

    it('перенаправление (истёкшая сессия) — отказ, страница входа не сохраняется', async () => {
        fetchMock.mockResolvedValue(response({ redirected: true, disposition: null }))

        await expect(downloadFile('/export')).rejects.toThrow('перенаправил')
        expect(clicks).toEqual([])
    })

    it('сетевая ошибка — отказ той же ошибкой', async () => {
        const failure = new TypeError('Failed to fetch')
        fetchMock.mockRejectedValue(failure)

        await expect(downloadFile('/export')).rejects.toBe(failure)
        expect(clicks).toEqual([])
    })
})
```

Run: `npx vitest run tests/download.test.js`
Expected: FAIL — `Failed to load url ../src/download.js`.

- [ ] **Step 2: Функция**

`src/download.js`:

```js
// Скачивание файла запросом, а не переходом браузера: страница знает, когда
// файл пришёл, и показывает работу, например на ActionPill. Функция общая
// для дашбордов; компоненты о ней не знают, вызывает её страница. window
// и document — только при вызове: загрузке модуля на сервере это не мешает.

// Столько живёт blob-адрес после клика: немедленное освобождение в части
// браузеров обрывает скачивание (так же делает FileSaver.js).
const REVOKE_DELAY_MS = 40000

// Имя из Content-Disposition: сначала filename*=UTF-8''…, затем
// filename="…" или filename=… без кавычек — так отдаёт Laravel. Битое
// кодирование filename* — как его отсутствие.
function nameFromDisposition(header) {
    if (typeof header !== 'string') {
        return null
    }

    const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)
    if (encoded !== null) {
        try {
            return decodeURIComponent(encoded[1].trim())
        } catch {
            // ищем filename
        }
    }

    const quoted = /filename\s*=\s*"([^"]+)"/i.exec(header)
    if (quoted !== null) {
        return quoted[1]
    }

    const plain = /filename\s*=\s*([^;"\s]+)/i.exec(header)

    return plain === null ? null : plain[1]
}

// Последний непустой сегмент пути адреса.
function nameFromPath(url) {
    try {
        const segments = new URL(url, window.location.href).pathname.split('/').filter((segment) => segment !== '')

        return segments.length === 0 ? null : decodeURIComponent(segments[segments.length - 1])
    } catch {
        return null
    }
}

export async function downloadFile(url) {
    const response = await fetch(url, { credentials: 'same-origin' })

    // Сервер перенаправил — обычно на страницу входа после истёкшей сессии:
    // без проверки под видом файла сохранилась бы её разметка.
    if (response.redirected) {
        throw new Error(`downloadFile: сервер перенаправил запрос ${url}`)
    }

    if (!response.ok) {
        throw new Error(`downloadFile: ответ ${response.status} на ${url}`)
    }

    const name = nameFromDisposition(response.headers.get('Content-Disposition')) ?? nameFromPath(url) ?? 'download'
    const blobUrl = URL.createObjectURL(await response.blob())
    const link = document.createElement('a')

    link.href = blobUrl
    link.download = name
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()

    setTimeout(() => URL.revokeObjectURL(blobUrl), REVOKE_DELAY_MS)
}
```

Run: `npx vitest run tests/download.test.js`
Expected: PASS, 13 тестов.

- [ ] **Step 3: Экспорт; SSR-тесты не принимают функцию за компонент**

- `src/index.js`: после `export { dashboardUi } from './plugin.js'` добавить `export { downloadFile } from './download.js'`.
- `tests/exports.test.js`: в списке после `'dashboardUi',` добавить `'downloadFile',`; после теста списка:

```js
    it('downloadFile — функция', () => {
        expect(typeof pkg.downloadFile).toBe('function')
    })
```

- `tests/ssr.test.js` и `tests/hydration.test.js`: строку `const componentNames = Object.keys(pkg).filter((name) => name !== 'dashboardUi').sort()` заменить на

```js
// Не компоненты: плагин и функция скачивания.
const componentNames = Object.keys(pkg).filter((name) => !['dashboardUi', 'downloadFile'].includes(name)).sort()
```

- [ ] **Step 4: Весь набор**

```bash
W=.superpowers/sdd/2026-10-10-colors-pills-text-popover
npm test > $W/t6.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t6.log
grep -ciE "warn|error|stderr" $W/t6.log
```

Expected: `tests exit 0`, всё passed, `0`.

- [ ] **Step 5: Коммит**

```bash
git add src/download.js src/index.js tests/download.test.js tests/exports.test.js tests/ssr.test.js tests/hydration.test.js
git commit -m "feat: добавить downloadFile — скачивание файла запросом"
```

---

### Task 7: `PopoverPanel` — имя и фокус панели, событие `toggle`

**Files:**
- Modify: `src/components/PopoverPanel.vue`
- Test: `tests/PopoverPanel.test.js`

**Interfaces:**
- Consumes: —
- Produces: `PopoverPanel` — пропы `panelLabel: String = null`, `panelFocusable: Boolean = false`; событие `toggle(isOpen: boolean)` — фактическое состояние панели, только при изменении; при размонтировании не приходит.

- [ ] **Step 1: Тесты — падают**

В `tests/PopoverPanel.test.js` внутри `describe('PopoverPanel', …)` добавить:

```js
    it('panel-label — своё имя панели вместо имени кнопки', () => {
        const wrapper = mountPanel({ props: { panelRole: 'region', panelLabel: 'Полный текст' } })

        expect(panelOf(wrapper).attributes('aria-label')).toBe('Полный текст')
        expect(panelOf(wrapper).attributes('aria-labelledby')).toBeUndefined()
    })

    it('без panel-label имя панели — от кнопки', () => {
        const wrapper = mountPanel({ props: { panelRole: 'region' } })

        expect(panelOf(wrapper).attributes('aria-label')).toBeUndefined()
        expect(panelOf(wrapper).attributes('aria-labelledby')).toBe(buttonOf(wrapper).attributes('id'))
    })

    it('panel-focusable — tabindex="0" у панели, без него — нет', () => {
        expect(panelOf(mountPanel({ props: { panelFocusable: true } })).attributes('tabindex')).toBe('0')
        expect(panelOf(mountPanel()).attributes('tabindex')).toBeUndefined()
    })
```

И новый блок после него:

```js
describe('PopoverPanel: событие toggle', () => {
    // v-model, как у страницы: событие возвращается пропом.
    function mountWithModel() {
        const wrapper = mountPanel({
            props: {
                modelValue: false,
                'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
            },
        })

        return wrapper
    }

    it('кнопка открывает и закрывает — toggle(true), toggle(false)', async () => {
        const wrapper = mountPanel()

        await buttonOf(wrapper).trigger('click')
        await settle()
        await buttonOf(wrapper).trigger('click')
        await settle()

        expect(wrapper.emitted('toggle')).toEqual([[true], [false]])
    })

    it('modelValue true на монтировании — toggle(true), эха update:modelValue нет', async () => {
        const wrapper = mountPanel({ props: { modelValue: true } })
        await settle()

        expect(isOpen(wrapper)).toBe(true)
        expect(wrapper.emitted('toggle')).toEqual([[true]])
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('входящий modelValue открывает и закрывает — toggle на каждое, эха нет', async () => {
        const wrapper = mountPanel()

        await wrapper.setProps({ modelValue: true })
        await settle()
        await wrapper.setProps({ modelValue: false })
        await settle()

        expect(wrapper.emitted('toggle')).toEqual([[true], [false]])
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('открыли кнопкой, закрыли через v-model — toggle(false)', async () => {
        const wrapper = mountWithModel()

        await buttonOf(wrapper).trigger('click')
        await settle()
        await wrapper.setProps({ modelValue: false })
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.emitted('toggle')).toEqual([[true], [false]])
        expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    })

    it('состояние не изменилось — toggle нет', async () => {
        const wrapper = mountPanel()

        await wrapper.setProps({ modelValue: false })
        await settle()

        expect(wrapper.emitted('toggle')).toBeUndefined()
    })

    it('содержимое пропало у открытой панели — toggle(false) и update:modelValue(false)', async () => {
        const wrapper = mountPanel()
        await buttonOf(wrapper).trigger('click')
        await settle()

        await wrapper.setProps({ hasContent: false })
        await settle()

        expect(wrapper.emitted('toggle')).toEqual([[true], [false]])
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('открытие → пропажа содержимого → запоздавший браузерный toggle: второго toggle нет', async () => {
        const wrapper = mountPanel()
        await buttonOf(wrapper).trigger('click')
        await settle()

        // Закрытие поставлено в очередь браузера, и тут же пропало содержимое:
        // toggle закрытия приходит уже после пропажи.
        await buttonOf(wrapper).trigger('click')
        await wrapper.setProps({ hasContent: false })
        await settle()

        expect(wrapper.emitted('toggle')).toEqual([[true], [false]])
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('размонтирование открытой панели — toggle(false) нет', async () => {
        const wrapper = mountPanel()
        await buttonOf(wrapper).trigger('click')
        await settle()

        wrapper.unmount()
        await settle()

        expect(wrapper.emitted('toggle')).toEqual([[true]])
    })
})
```

Run: `npx vitest run tests/PopoverPanel.test.js`
Expected: FAIL — нет `aria-label`, `tabindex`, событий `toggle`.

- [ ] **Step 2: Пропы и атрибуты панели**

`src/components/PopoverPanel.vue`, шаблон панели: строку `:aria-labelledby="buttonId"` заменить на

```html
            :aria-labelledby="panelLabel === null ? buttonId : null"
            :aria-label="panelLabel"
            :tabindex="panelFocusable ? 0 : null"
```

Пропы — после `panelRole`:

```js
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
```

- [ ] **Step 3: Событие `toggle`**

- `emits: ["update:modelValue"]` → `emits: ["update:modelValue", "toggle"]`.
- В `created()` после `this.focusWasInside = false;`:

```js
        // Открыта ли панель в браузере сейчас — по последнему событию toggle
        // или пропаже содержимого. Не panelIsOpen: тот принимает входящее
        // значение раньше, чем браузер его подтвердит.
        this.panelShown = false;
```

- Метод (после `close()`):

```js
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
```

- В `onToggle()` перед строкой `if (isOpen === this.panelIsOpen) {` добавить `this.reportPanelShown(isOpen);`. Комментарий над `onToggle` дополнить последней фразой: `Фактическое состояние уходит и событием toggle.`
- В наблюдателе `hasContent`, ветка без содержимого: после `this.stopListening();` добавить `this.reportPanelShown(false);`. Комментарий наблюдателя не меняется.

- [ ] **Step 4: Зелёные тесты, весь набор**

```bash
W=.superpowers/sdd/2026-10-10-colors-pills-text-popover
npx vitest run tests/PopoverPanel.test.js
npm test > $W/t7.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t7.log
grep -ciE "warn|error|stderr" $W/t7.log
```

Expected: PASS; `tests exit 0`, всё passed, `0` — меню, список и календарь не изменились.

- [ ] **Step 5: Коммит**

```bash
git add src/components/PopoverPanel.vue tests/PopoverPanel.test.js
git commit -m "feat: дать PopoverPanel своё имя и фокус панели и событие toggle о фактическом состоянии"
```

---

### Task 8: `TextPopover` в пакете

**Files:**
- Create: `src/components/icons/Eye.vue`, `src/components/TextPopover.vue`
- Modify: `src/i18n.js`, `src/index.js`, `tests/exports.test.js`, `tests/ssrFixtures.js`, `tests/i18n.test.js`
- Test: `tests/TextPopover.test.js` (новый)

**Interfaces:**
- Consumes: `PopoverPanel` — `hasContent`, `modelValue`, `align`, `maxWidth`, `panelRole`, `panelLabel`, `panelFocusable`, `panelClass`, события `update:modelValue`, `toggle` (Task 7); `withLang`.
- Produces: `TextPopover` — пропы `text: String` (обязателен), `modelValue: Boolean = false`, `lang`; событие `update:modelValue`. Экспорт из `src/index.js`. Ключи `showText`, `fullText` в `i18n.js`.

- [ ] **Step 1: Тест — падает**

`tests/TextPopover.test.js`:

```js
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import TextPopover from '../src/components/TextPopover.vue'
import { dashboardUi } from '../src/plugin.js'
import { flushToggles, installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

let uninstallPopover

beforeEach(() => {
    uninstallPopover = installPopoverStub()
    // Стиль страницы, который подсказка обязана вернуть.
    document.documentElement.style.userSelect = 'text'
})

afterEach(() => {
    uninstallPopover()
    document.documentElement.style.userSelect = ''
    document.documentElement.style.webkitUserSelect = ''
})

async function settle() {
    await flushToggles()
    await flushPromises()
}

function mountPopover(props = {}, { warnings = null, global = {} } = {}) {
    return mount(TextPopover, {
        attachTo: document.body,
        props: { text: 'Полный текст сообщения', ...props },
        global: warnings === null ? global : { ...global, config: { warnHandler: (message) => warnings.push(message) } },
    })
}

// v-model, как у страницы: событие возвращается пропом.
function mountWithModel() {
    const wrapper = mountPopover({
        modelValue: false,
        'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
    })

    return wrapper
}

const buttonOf = (wrapper) => wrapper.get('button[popovertarget]')
const panelOf = (wrapper) => wrapper.get('[popover]')
const isOpen = (wrapper) => panelOf(wrapper).element.matches(':popover-open')
const pageSelection = () => document.documentElement.style.userSelect

describe('TextPopover: вид и открытие', () => {
    it.each([
        ['пустая строка', ''],
        ['null', null],
    ])('%s — компонента нет', (_, text) => {
        const warnings = []
        mountPopover({ text }, { warnings })

        expect(document.body.querySelector('button')).toBeNull()
        expect(document.body.querySelector('[popover]')).toBeNull()
    })

    it('кнопка с подписью для скринридера открывает область с текстом', async () => {
        const wrapper = mountPopover()
        expect(buttonOf(wrapper).get('.bb\\:sr-only').text()).toBe('Показать текст')
        expect(buttonOf(wrapper).get('svg').attributes('aria-hidden')).toBe('true')

        await buttonOf(wrapper).trigger('click')
        await settle()

        expect(isOpen(wrapper)).toBe(true)
        expect(panelOf(wrapper).text()).toBe('Полный текст сообщения')
        expect(panelOf(wrapper).attributes()).toMatchObject({ role: 'region', 'aria-label': 'Полный текст', tabindex: '0' })
        expect(panelOf(wrapper).classes()).toEqual(expect.arrayContaining(['bb:whitespace-normal', 'bb:break-words', 'bb:select-text']))
        expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    })

    it('lang en — тексты по-английски', () => {
        const wrapper = mountPopover({ lang: 'en' })

        expect(buttonOf(wrapper).get('.bb\\:sr-only').text()).toBe('Show text')
        expect(panelOf(wrapper).attributes('aria-label')).toBe('Full text')
    })

    it('язык плагина en', () => {
        const wrapper = mountPopover({}, { global: { plugins: [[dashboardUi, { lang: 'en' }]] } })

        expect(panelOf(wrapper).attributes('aria-label')).toBe('Full text')
    })
})

describe('TextPopover: v-model', () => {
    it('modelValue открывает и закрывает без эха', async () => {
        const wrapper = mountPopover()

        await wrapper.setProps({ modelValue: true })
        await settle()
        expect(isOpen(wrapper)).toBe(true)

        await wrapper.setProps({ modelValue: false })
        await settle()
        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('текст опустел при открытой подсказке — компонента нет, update:modelValue(false)', async () => {
        const wrapper = mountPopover()
        await buttonOf(wrapper).trigger('click')
        await settle()

        await wrapper.setProps({ text: '' })
        await settle()

        expect(document.body.querySelector('[popover]')).toBeNull()
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('modelValue true при пустом тексте — ничего не открывается', async () => {
        mountPopover({ text: '', modelValue: true })
        await settle()

        expect(document.body.querySelector('[popover]')).toBeNull()
        expect(pageSelection()).toBe('text')
    })
})

describe('TextPopover: запрет выделения страницы', () => {
    it('открыта кнопкой — страница не выделяется; закрыта кнопкой — стиль страницы вернулся', async () => {
        const wrapper = mountPopover()

        await buttonOf(wrapper).trigger('click')
        await settle()
        expect(pageSelection()).toBe('none')

        await buttonOf(wrapper).trigger('click')
        await settle()
        expect(pageSelection()).toBe('text')
    })

    it('modelValue true на монтировании — запрет стоит', async () => {
        mountPopover({ modelValue: true })
        await settle()

        expect(pageSelection()).toBe('none')
    })

    it('открыта через v-model — запрет; закрыта через v-model — снят', async () => {
        const wrapper = mountPopover()

        await wrapper.setProps({ modelValue: true })
        await settle()
        expect(pageSelection()).toBe('none')

        await wrapper.setProps({ modelValue: false })
        await settle()
        expect(pageSelection()).toBe('text')
    })

    it('открыта кнопкой, закрыта через v-model — запрет снят', async () => {
        const wrapper = mountWithModel()

        await buttonOf(wrapper).trigger('click')
        await settle()
        expect(pageSelection()).toBe('none')

        await wrapper.setProps({ modelValue: false })
        await settle()
        expect(pageSelection()).toBe('text')
    })

    it('текст опустел при открытой подсказке — запрет снят', async () => {
        const wrapper = mountPopover()
        await buttonOf(wrapper).trigger('click')
        await settle()

        await wrapper.setProps({ text: '' })
        await settle()

        expect(pageSelection()).toBe('text')
    })

    it('открытие → опустевший текст → запоздавший toggle: запрет снят один раз, у другой подсказки работает', async () => {
        const first = mountPopover()
        await buttonOf(first).trigger('click')
        await settle()

        await buttonOf(first).trigger('click')
        await first.setProps({ text: '' })
        await settle()
        expect(pageSelection()).toBe('text')

        // Счётчик не ушёл в минус: вторая подсказка снова ставит запрет.
        const second = mountPopover({ text: 'Другой текст' })
        await buttonOf(second).trigger('click')
        await settle()
        expect(pageSelection()).toBe('none')

        await buttonOf(second).trigger('click')
        await settle()
        expect(pageSelection()).toBe('text')
    })

    it('две подсказки: открытие второй закрывает первую, запрет держится, пока открыта хоть одна', async () => {
        const first = mountPopover()
        const second = mountPopover({ text: 'Другой текст' })

        await buttonOf(first).trigger('click')
        await settle()
        await buttonOf(second).trigger('click')
        await settle()

        expect(isOpen(first)).toBe(false)
        expect(isOpen(second)).toBe(true)
        expect(pageSelection()).toBe('none')

        await buttonOf(second).trigger('click')
        await settle()
        expect(pageSelection()).toBe('text')
    })

    it('размонтирование открытой подсказки — запрет снят', async () => {
        const wrapper = mountPopover()
        await buttonOf(wrapper).trigger('click')
        await settle()

        wrapper.unmount()
        await settle()

        expect(pageSelection()).toBe('text')
    })
})
```

Run: `npx vitest run tests/TextPopover.test.js`
Expected: FAIL — `Failed to load url ../src/components/TextPopover.vue`.

- [ ] **Step 2: Иконка и тексты**

`src/components/icons/Eye.vue` — из `certificates/src/resources/js/Shared/icons/Eye.vue` с префиксом; комментарий о Heroicon переезжает в скрипт (перед корнем шаблона комментарий запрещён):

```vue
<template>
    <svg class="bb:h-5 bb:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
    </svg>
</template>

<script>
// Heroicon name: outline/eye
export default {};
</script>
```

`src/i18n.js`: в `ru` после `close: 'Закрыть',`:

```js
        // TextPopover: подпись кнопки для скринридера и имя области с текстом.
        showText: 'Показать текст',
        fullText: 'Полный текст',
```

в `en` после `close: 'Close',`:

```js
        showText: 'Show text',
        fullText: 'Full text',
```

- [ ] **Step 3: Компонент**

`src/components/TextPopover.vue`:

```vue
<template>
    <popover-panel
        class="bb-dashboard-ui bb:inline-flex"
        :has-content="!isEmpty"
        :model-value="modelValue"
        align="end"
        :max-width="384"
        panel-role="region"
        :panel-label="texts.fullText"
        panel-focusable
        panel-class="bb:p-3 bb:rounded-md bb:border bb:border-gray-200 bb:bg-white bb:shadow-lg bb:text-left bb:text-sm bb:leading-5 bb:text-gray-700 bb:whitespace-normal bb:break-words bb:overscroll-contain bb:select-text bb:focus:outline-hidden bb:focus-visible:ring-2 bb:focus-visible:ring-indigo-500"
        @update:model-value="$emit('update:modelValue', $event)"
        @toggle="onPanelToggle"
    >
        <template #trigger="trigger">
            <!-- relative держит скрытую подпись sr-only внутри кнопки: без
                 него она позиционируется от карточки, выходит из обёртки
                 таблицы с прокруткой и расширяет страницу. -->
            <button
                type="button"
                :id="trigger.id"
                :popovertarget="trigger.popovertarget"
                class="bb:relative bb:text-gray-400 bb:hover:text-gray-600 bb:rounded-md bb:focus:outline-hidden bb:focus-visible:ring-2 bb:focus-visible:ring-indigo-500"
            >
                <span class="bb:sr-only">{{ texts.showText }}</span>
                <eye/>
            </button>
        </template>
        <template #default>{{ normalizedText }}</template>
    </popover-panel>
</template>

<script>
import PopoverPanel from "./PopoverPanel.vue";
import Eye from "./icons/Eye.vue";
import { withLang } from "../lang.js";

// Скрытый текст по клику на иконку-глаз. Открытие, место у кнопки (правый
// край по правому краю кнопки, ширина до 384 px — max-w-sm), закрытие
// кликом вне, Escape, прокруткой и изменением размера окна делает
// PopoverPanel. Пустой текст — компонента нет. whitespace-normal у панели —
// потому что ячейка таблицы whitespace-nowrap, а панель в DOM лежит внутри
// неё. tabindex и роль с именем — чтобы длинный текст прокручивался
// с клавиатуры во всех браузерах. select-text — потому что, пока подсказка
// открыта, остальная страница не выделяется (lockPageSelection).

// Запрет выделения страницы общий для всех подсказок. Когда открывается
// соседняя, события toggle закрытой и открытой приходят в любом порядке,
// поэтому прежние стили <html> запоминает первая взявшая запрет,
// а возвращает последняя отпустившая.
let pageSelectionLocks = 0;
let savedPageSelection = null;

export default {
    components: {
        PopoverPanel,
        Eye,
    },

    mixins: [withLang],

    emits: ["update:modelValue"],

    props: {
        // Скрытый текст. null, undefined и пустая строка — компонента нет.
        text: {
            type: String,
            required: true,
        },
        // Открыта ли подсказка. v-model необязателен: компонент сам
        // открывается и закрывается.
        modelValue: {
            type: Boolean,
            default: false,
        },
    },

    data() {
        return {
            // Держит ли эта подсказка запрет выделения страницы.
            holdsPageSelectionLock: false,
        };
    },

    computed: {
        normalizedText() {
            return typeof this.text === "string" ? this.text : "";
        },

        isEmpty() {
            return this.normalizedText === "";
        },
    },

    beforeUnmount() {
        this.unlockPageSelection();
    },

    methods: {
        // Запрет — по фактическому состоянию панели (toggle PopoverPanel),
        // а не по update:modelValue: входящий modelValue эхом не
        // возвращается, и подсказка, открытая или закрытая через v-model,
        // запрет иначе не поставила бы или не сняла.
        onPanelToggle(isOpen) {
            if (isOpen) {
                this.lockPageSelection();
            } else {
                this.unlockPageSelection();
            }
        },

        // Подсказка лежит в DOM внутри страницы, а выделение браузер
        // продолжает по порядку DOM: тройной клик или протяжка мышью
        // за конец текста увели бы выделение в следующую строку таблицы.
        // Пока подсказка открыта, остальная страница не выделяется,
        // и выделение остаётся в подсказке. Оператор ничего не теряет:
        // клик вне подсказки её закрывает и снимает запрет.
        lockPageSelection() {
            if (this.holdsPageSelectionLock) {
                return;
            }

            this.holdsPageSelectionLock = true;
            pageSelectionLocks += 1;

            if (pageSelectionLocks === 1) {
                const style = document.documentElement.style;

                savedPageSelection = {
                    userSelect: style.userSelect,
                    webkitUserSelect: style.webkitUserSelect,
                };
                style.userSelect = "none";
                style.webkitUserSelect = "none";
            }
        },

        unlockPageSelection() {
            if (!this.holdsPageSelectionLock) {
                return;
            }

            this.holdsPageSelectionLock = false;
            pageSelectionLocks -= 1;

            if (pageSelectionLocks === 0) {
                Object.assign(document.documentElement.style, savedPageSelection);
                savedPageSelection = null;
            }
        },
    },
};
</script>
```

Run: `npx vitest run tests/TextPopover.test.js`
Expected: PASS.

- [ ] **Step 4: Экспорт, SSR, i18n**

- `src/index.js`: последней строкой `export { default as TextPopover } from './components/TextPopover.vue'`.
- `tests/exports.test.js`: `'TextPopover',` после `'SelectSingle',`; название теста `'ровно пятнадцать компонентов и плагин'` → `'ровно шестнадцать компонентов, плагин и downloadFile'`.
- `tests/ssrFixtures.js`, после `SelectSingle: …`:

```js
    TextPopover: { props: { text: 'Полный текст сообщения', modelValue: true } },
```

- `tests/i18n.test.js`: импорт `import TextPopover from '../src/components/TextPopover.vue'`; в `'недопустимый lang: язык плагина, а не падение'` случай:

```js
        { name: 'TextPopover, lang de и плагин en — English', component: TextPopover, props: { text: 'Text', lang: 'de' }, global: inApp({ lang: 'en' }), expected: 'Show text' },
```

- [ ] **Step 5: Весь набор**

```bash
W=.superpowers/sdd/2026-10-10-colors-pills-text-popover
npm test > $W/t8.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t8.log
grep -ciE "warn|error|stderr" $W/t8.log
```

Expected: `tests exit 0`, всё passed, `0`.

- [ ] **Step 6: Коммит**

```bash
git add src/components/icons/Eye.vue src/components/TextPopover.vue src/i18n.js src/index.js tests/TextPopover.test.js tests/exports.test.js tests/ssrFixtures.js tests/i18n.test.js
git commit -m "feat: перенести TextPopover в пакет на PopoverPanel"
```

---

### Task 9: README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: API Tasks 1–8.
- Produces: README по разделам 4–13 спеки.

- [ ] **Step 1: «Требования», «Компоненты», новый раздел «Цвета»**

- «Требования», абзац про Popover API: `Меню DropdownButtonWithAction и HamburgerMenu, список SelectSingle и календари SelectDateInterval стоят …` → `Меню DropdownButtonWithAction и HamburgerMenu, список SelectSingle, календари SelectDateInterval и подсказка TextPopover стоят …`; конец абзаца `В браузерах старше меню, список и календари видны в потоке всегда.` → `В браузерах старше меню, список, календари и подсказка видны в потоке всегда.`
- «Компоненты», первый абзац:

```markdown
Пакет экспортирует шестнадцать компонентов: `Dot`, `RussianMobileFilter`,
`Search`, `SelectDateInterval`, `SelectSingle`, `InfoPill`,
`ErrorMessages`, `ActionPill`, `ConfirmationModal`,
`DropdownButtonWithAction`, `HamburgerMenu`, `DataTable`,
`NavigationMenuElement`, `PageCard`, `NotificationMessage`, `TextPopover`,
функцию `downloadFile` и плагин `dashboardUi`. В архив пакета
(`files: ["dist"]`) исходники не попадают, поэтому контракт каждого
компонента — здесь и в playground, а не в исходном коде.
```

- Перед `## Компоненты` — новый раздел:

```markdown
## Цвета

У пакета один список цветов, и все компоненты с цветом берут его:
`gray`, `green`, `yellow`, `red`, `indigo`, `purple`. Цвет передаётся
именем; другое имя валидатор отклоняет, а компонент рисуется без цвета.
Смысл цвета — какой статус зелёный — задаёт проект своей картой
«значение → имя».

| Где | Вид цвета `<тон>` |
| --- | --- |
| `InfoPill`, `ActionPill` | фон `-100`, текст `-800`; у `ActionPill` при наведении текст `-600` |
| основная кнопка и стрелка `DropdownButtonWithAction` | фон `-100`, рамка `-300`, текст `-800`, при наведении фон `-200` |
| пункт меню `DropdownButtonWithAction` и `HamburgerMenu` | текст `-800`, в фокусе фон `-100` |
| `Dot`, полоска строки `DataTable` | `-500` |

Без цвета кнопка белая с серой рамкой, пункт меню серый, строка таблицы без
полоски — это вид компонента по умолчанию, в список он не входит.
```

- [ ] **Step 2: `Dot`, `InfoPill`, `ActionPill`, `downloadFile`**

- `### Dot`: первая строка `Индикатор-точка: красная или зелёная, с пульсацией или без.` → `Индикатор-точка любого цвета из списка, с пульсацией или без.`; в таблице `color` — `` `"red"` или `"green"` `` → `имя из списка цветов (раздел «Цвета»)`.
- Раздел `### SmallBadge` заменить:

```markdown
### InfoPill

Пилюля, которая только показывает текст: статус, счётчик, флаг, пометку.
Текст не переносится.

    <info-pill text="доставлено" color="green" />

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `text` | `String` | обязателен | Текст пилюли |
| `color` | `String` | обязателен | Имя из списка цветов |

Событий нет.
```

- Раздел `### DownloadLink` заменить:

````markdown
### ActionPill

Пилюля, которой запускают действие: скачать отчёт, запросить статусы. Что
делает действие, пилюля не знает — страница слушает `click` и сама передаёт
`isLoading`, пока действие идёт.

    <action-pill
        icon="download"
        title="скачать xlsx"
        loading-text="формируется отчёт"
        :is-loading="exportLoading"
        @click="exportOrders"
    />

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `title` | `String` | обязателен | Подпись и всплывающая подсказка |
| `icon` | `String` | обязателен | `"download"` или `"refresh"` |
| `color` | `String` | `"purple"` | Имя из списка цветов |
| `isLoading` | `Boolean` | `false` | Идёт работа |
| `loadingText` | `String` | `null` | Подпись на время работы; без неё остаётся `title` |

Событие: `click` без аргументов.

Пока идёт работа, пилюля погашена и недоступна — второй клик не проходит,
вместо иконки бегут стрелки часов, подпись — `loadingText`. При системной
настройке «уменьшить движение» стрелки стоят. Иконки пакета — `download`
и `refresh`; новое действие с новой иконкой — новая иконка в пакете.

### downloadFile

Функция: скачивает файл запросом и отдаёт его браузеру. Страница знает,
когда файл пришёл, — так показывается работа на `ActionPill`.

```js
import { downloadFile } from '@boobooking/dashboard-ui-components'

exportOrders() {
    this.exportLoading = true;
    downloadFile(this.exportUrl)
        .catch(() => { this.exportFailure = "Попробуйте ещё раз"; })
        .finally(() => { this.exportLoading = false; });
}
```

- Запрос — `GET` с cookie сессии (`credentials: 'same-origin'`).
- Promise отклоняется: при ответе не `2xx` (код в тексте ошибки), при
  перенаправлении — обычно на страницу входа после истёкшей сессии — и при
  сетевой ошибке.
- Имя файла — из `Content-Disposition` (`filename*=UTF-8''…`, затем
  `filename`), без него — последний сегмент пути адреса, без пути —
  `download`.
- Таймаута нет; уход со страницы скачивание не прерывает. Файл до
  сохранения целиком в памяти вкладки.
````

- [ ] **Step 3: `DropdownButtonWithAction`, `HamburgerMenu`, `DataTable`, `TextPopover`**

- `DropdownButtonWithAction`, таблица полей: `| `color` | `"yellow"` или `"red"` | Цвет; без поля — обычный |` → `| `color` | `String` | Имя из списка цветов; без поля — обычный |`.
- Абзац `Цвет первого действия красит основную кнопку … при подсветке светлый фон того же цвета.` заменить:

```markdown
Цвет первого действия красит основную кнопку вместе со стрелкой, цвет
пункта меню — только этот пункт. Без цвета кнопка белая с серой рамкой,
пункт — серый текст и серый фон при подсветке; с цветом — по разделу
«Цвета».
```

- Абзац `Вид кнопки и пунктов задаёт компонент … см. «Обновление с 0.13».` — без изменений: он ссылается на миграцию, предупреждений не обещает.
- `HamburgerMenu`: `цвет — color: 'yellow' или color: 'red'.` → `цвет — color: имя из списка цветов.`
- `DataTable`, пример: `<download-link :url="exportUrl" title="скачать xlsx" />` → `<action-pill icon="download" title="скачать xlsx" :is-loading="exportLoading" @click="exportOrders" />`; `<small-badge :text="row.statusLabel" :color="row.statusColor" />` → `<info-pill :text="row.statusLabel" :color="row.statusColor" />`.
- `DataTable`, таблица пропов: строку `rowColor` заменить на `| `rowStripe` | `Function` | `null` | `row => имя цвета \| null` — полоска слева в первой ячейке строки; строки полосатые всегда |`.
- После раздела `### NotificationMessage` — новый:

```markdown
### TextPopover

Иконка-глаз, по клику — подсказка со скрытым текстом: длинный текст SMS,
значение ключа. Пустой текст — компонента нет.

    <text-popover :text="row.message" />

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `text` | `String` | обязателен | Скрытый текст; `null` и `""` — компонента нет |
| `modelValue` | `Boolean` | `false` | Открыта ли подсказка; `v-model` необязателен |
| `lang` | `String` | язык плагина | `"ru"` или `"en"` |

Событие: `update:modelValue` — когда подсказка открылась или закрылась сама:
кнопкой, кликом вне, Escape, прокруткой, изменением размера окна, опустевшим
текстом. Значение, пришедшее от родителя, эхом не возвращается.

Подсказка открывается в верхнем слое браузера (Popover API): правым краем по
правому краю иконки, шириной до 384 px, вниз, если помещается, иначе туда,
где места больше; длинный текст прокручивается внутри, в том числе с
клавиатуры. Пока подсказка открыта, остальная страница не выделяется:
тройной клик и протяжка мышью выделяют только её текст.
```

- [ ] **Step 4: «Языки», «Правила API», «Playground», «Ограничение»**

- «Языки»: `` `cancel-button-text` у `ConfirmationModal`, `title` у `DownloadLink`. `` → `` `cancel-button-text` у `ConfirmationModal`. ``; строку таблицы `DownloadLink — подпись` удалить; после строки `NotificationMessage` добавить `| `TextPopover` — подпись кнопки и имя области | Показать текст / Полный текст | Show text / Full text |`.
- «Правила API пакета»:
  - правило о префиксе: фразу `Классы в :class пишутся литералами — ключами объекта, ветками тернарного оператора, элементами массива.` дополнить: `Цветовые классы компонент не пишет сам — берёт из src/colors.js вызовом colorClass(имя, набор), и эту форму тест тоже принимает.`;
  - правило о ссылках: фразу `Исключение — DownloadLink: это обычная ссылка браузера, скачивающая файл, и через navigate она не идёт.` удалить.
- «Playground»: `со всеми пятнадцатью компонентами` → `со всеми шестнадцатью компонентами`.
- «Ограничение»: `и глобальный @keyframes pulse (его использует bb:animate-pulse у Dot): если приложение объявит свой pulse, победит тот, что подключён позже.` → `и глобальные @keyframes pulse и spin (их используют bb:animate-pulse у Dot и стрелки часов ActionPill): если приложение объявит свой pulse или spin, победит тот, что подключён позже.`

- [ ] **Step 5: «Обновление с 0.15»**

Перед `## Обновление с 0.14`:

````markdown
## Обновление с 0.15

| Было | Стало |
| --- | --- |
| `SmallBadge` | `InfoPill`, пропы те же; цвета `blue` нет |
| `<download-link :url="exportUrl" title="скачать xlsx" />` | `<action-pill icon="download" title="скачать xlsx" loading-text="формируется отчёт" :is-loading="exportLoading" @click="exportOrders" />` и `downloadFile(exportUrl)` в методе страницы |
| своя пилюля-кнопка с `loading` и событием `clicked` | `ActionPill`: `isLoading`, событие `click` |
| `rowColor` у `DataTable` — заливка строки | `rowStripe` — полоска слева; строки полосатые всегда |
| `color` пункта меню — `yellow` или `red`; `Dot` — `red` или `green` | любое имя из списка цветов |
| красная кнопка и красный пункт — `red-50`/`red-700` | `red-100`/`red-800`, как все цвета списка |
| предупреждения о поле `danger` и слотах `actions`, `button` | их нет: пункт с `danger` — обычный пункт, слоты не рисуются |
| свой `TextPopover` проекта | `TextPopover` пакета; пустой текст — компонента нет |

Метод страницы для «скачать xlsx»:

```js
exportOrders() {
    this.exportFailure = "";
    this.exportLoading = true;
    downloadFile(this.exportUrl)
        .catch(() => { this.exportFailure = "Попробуйте ещё раз"; })
        .finally(() => { this.exportLoading = false; });
}
```

`0.16.0` не подтянется по `^0.15.x`: для версий `0.x` знак `^` пропускает
только патчи. Обновление — `npm install @boobooking/dashboard-ui-components@^0.16.0`.
````

- [ ] **Step 6: Проверка**

```bash
grep -n "SmallBadge\|small-badge\|DownloadLink\|download-link\|rowColor\|пятнадцат" README.md
```

Expected: только раздел «Обновление с 0.15» (таблица замен) и прежние разделы «Обновление с 0.14» и старше.

- [ ] **Step 7: Коммит**

```bash
git add README.md
git commit -m "docs: описать список цветов, InfoPill, ActionPill, downloadFile и TextPopover в README"
```

---

### Task 10: Playground

**Files:**
- Modify: `playground/App.vue`
- Create: `playground/public/report.csv`

**Interfaces:**
- Consumes: экспорты `dist/index.js` после `npm run build` (Tasks 1–8).
- Produces: демо для приёмки (Task 12).

- [ ] **Step 1: Файл для скачивания**

`playground/public/report.csv` (Vite кладёт `public/` в корень сборки playground):

```
phone;status
+79990000001;delivered
```

- [ ] **Step 2: Импорт и регистрация**

В `import { … } from '../dist/index.js'`: `SmallBadge,` → `InfoPill,`, `DownloadLink,` → `ActionPill,`, в конец списка — `TextPopover,` и `downloadFile,`. В `components`: `SmallBadge,` → `InfoPill,`, `DownloadLink,` → `ActionPill,`, в конец — `TextPopover,`.

- [ ] **Step 3: Данные и методы**

В `data()`:

```js
            // Имена списка цветов пакета: таблица «Цвета».
            colors: ['gray', 'green', 'yellow', 'red', 'indigo', 'purple'],
            pillsLoading: false,
            downloadLoading: false,
            downloadResult: '',
            refreshLoading: false,
            refreshes: 0,
            popoverText: 'Провайдер принял сообщение, итог доставки пока не получен. Длинный текст переносится по словам и прокручивается внутри подсказки, если не помещается по высоте окна.',
            popoverIsOpen: false,
```

В `tableRows`: поле `rowColor: index === 1 ? 'red' : index === 2 ? 'green' : null,` → `stripe: [null, 'red', 'yellow', 'green', null, 'indigo', 'purple', 'gray', null, null][index],`.

В `methods`:

```js
        // Скачивание файла сборки playground; missing.csv — ошибка 404.
        downloadSample(name) {
            this.downloadResult = '';
            this.downloadLoading = true;
            downloadFile(name)
                .then(() => { this.downloadResult = `скачан ${name}`; })
                .catch((error) => { this.downloadResult = `ошибка: ${error.message}`; })
                .finally(() => { this.downloadLoading = false; });
        },
        // Действие на две секунды — видно часы.
        refreshForTwoSeconds() {
            this.refreshLoading = true;
            setTimeout(() => {
                this.refreshLoading = false;
                this.refreshes++;
            }, 2000);
        },
```

- [ ] **Step 4: Разметка**

- Раздел `Dot`: после трёх точек — `<dot v-for="color in colors" :key="color" :color="color"/>`.
- Раздел `SmallBadge` заменить:

```html
        <section>
            <h2>Цвета</h2>
            <table class="demo-colors">
                <tr>
                    <th>имя</th><th>InfoPill</th><th>ActionPill</th><th>кнопка, стрелка и пункт меню</th><th>Dot</th>
                </tr>
                <tr>
                    <td>без цвета</td><td>—</td><td>—</td>
                    <td><dropdown-button-with-action :actions="[{ label: 'Посмотреть', href: '#view' }, { label: 'Пункт', onSelect: countSelection }]"/></td>
                    <td>—</td>
                </tr>
                <tr v-for="color in colors" :key="color">
                    <td>{{ color }}</td>
                    <td><info-pill :text="color === 'indigo' ? 'Найдено: 40' : 'статус'" :color="color"/></td>
                    <td><action-pill icon="download" title="скачать xlsx" :color="color" :is-loading="pillsLoading" loading-text="формируется отчёт"/></td>
                    <td><dropdown-button-with-action :actions="[{ label: 'Действие', color, onSelect: countSelection }, { label: 'Пункт', color, onSelect: countSelection }]"/></td>
                    <td><dot :color="color"/></td>
                </tr>
            </table>
            <p><button type="button" class="demo-button" @click="pillsLoading = !pillsLoading">isLoading у пилюль таблицы: {{ pillsLoading ? 'да' : 'нет' }}</button></p>
        </section>
```

- Раздел `DownloadLink` заменить:

```html
        <section>
            <h2>ActionPill и downloadFile</h2>
            <div class="demo-row">
                <action-pill icon="download" title="скачать report.csv" loading-text="формируется отчёт" :is-loading="downloadLoading" @click="downloadSample('report.csv')"/>
                <action-pill icon="download" title="скачать отсутствующий" loading-text="формируется отчёт" :is-loading="downloadLoading" @click="downloadSample('missing.csv')"/>
                <action-pill icon="refresh" title="запросить статусы" loading-text="запрашиваем статусы" :is-loading="refreshLoading" @click="refreshForTwoSeconds"/>
            </div>
            <p>Скачивание: {{ downloadResult || '—' }}; запросов статусов: {{ refreshes }}</p>
        </section>

        <section>
            <h2>TextPopover</h2>
            <div class="demo-row">
                <text-popover text="Короткий текст"/>
                <text-popover :text="popoverText"/>
                <text-popover text=""/>
                <text-popover v-model="popoverIsOpen" :text="popoverText"/>
            </div>
            <p>
                Подсказка с v-model: {{ popoverIsOpen ? 'открыта' : 'закрыта' }}
                <button type="button" class="demo-button" @click="popoverIsOpen = !popoverIsOpen">Переключить снаружи</button>
                <button type="button" class="demo-button" @click="popoverText = popoverText === '' ? 'Текст вернулся' : ''">Опустошить или вернуть текст</button>
            </p>
        </section>
```

- Раздел `DataTable`: `<download-link url="/export.xlsx" title="скачать xlsx"/>` → `<action-pill icon="download" title="скачать xlsx" loading-text="формируется отчёт" :is-loading="downloadLoading" @click="downloadSample('report.csv')"/>`; оба `<small-badge :text="row.status" :color="row.statusColor"/>` → `<info-pill :text="row.status" :color="row.statusColor"/>`; заголовок `Скрытый столбец, цвет строки, без пагинации` → `Скрытый столбец, полоска строки, без пагинации`; `:row-color="(row) => row.rowColor"` → `:row-stripe="(row) => row.stripe"`.
- Раздел `lang="en"`: `<download-link url="/export.xlsx" lang="en"/>` → `<text-popover lang="en" text="Full text in English"/>`.

- [ ] **Step 5: Стиль таблицы цветов**

В `playground/shell.css` в конец:

```css
.demo-colors td,
.demo-colors th {
    padding: 6px 12px;
    text-align: left;
    vertical-align: middle;
}
```

- [ ] **Step 6: Сборка playground**

```bash
W=.superpowers/sdd/2026-10-10-colors-pills-text-popover
npm run build > $W/t10-build.log 2>&1 && npx vite build --config vite.playground.config.js --outDir "$PWD/$W/pg" --emptyOutDir --base ./ >> $W/t10-build.log 2>&1; echo "build exit $?"
grep -iE "warn|error" $W/t10-build.log
ls $W/pg
rm -rf $W/pg
```

Expected: `build exit 0`, grep — пусто, в `pg` есть `index.html`, `host.html`, `report.csv`. `outDir` — абсолютный: `vite.playground.config.js` задаёт `root: 'playground'`, и относительный путь Vite отсчитал бы от него.

- [ ] **Step 7: Коммит**

```bash
git add playground/App.vue playground/public/report.csv playground/shell.css
git commit -m "docs: показать в playground цвета, ActionPill, downloadFile, TextPopover и полоску строки"
```

---

### Task 11: Сборка пакета

**Files:** — (только проверка)

**Interfaces:**
- Consumes: Tasks 1–10.
- Produces: подтверждение, что `dist` собран со всеми цветами и анимацией.

- [ ] **Step 1: Сборка и проверка CSS**

```bash
W=.superpowers/sdd/2026-10-10-colors-pills-text-popover
npm test > $W/t11.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t11.log
grep -ciE "warn|error|stderr" $W/t11.log
npm run build > $W/t11-build.log 2>&1; echo "build exit $?"
for c in gray green yellow red indigo purple; do
  for k in "bg-$c-100" "text-$c-800" "hover\\\\:text-$c-600" "border-$c-300" "hover\\\\:bg-$c-200" "focus\\\\:bg-$c-100" "text-$c-500"; do
    grep -q "$k" dist/style.css || echo "нет $k"
  done
done
grep -o "@keyframes \(spin\|pulse\)" dist/style.css | sort -u
grep -o "bg-current[^}]*}" dist/style.css | head -1
```

Expected: `tests exit 0`, всё passed, `0`, `build exit 0`; цикл ничего не печатает; две строки `@keyframes pulse` и `@keyframes spin`; правило `bg-current` с `background-color: currentcolor`.

Коммитов нет.

---

### Task 12: Приёмка в браузерах

**Files:**
- Временно: `/Users/boobooking/Code/mars/certificates/src/public/build/ui-playground/` (удаляется в конце задачи)

**Interfaces:**
- Consumes: Tasks 1–11.
- Produces: подтверждение вида и поведения; коммитов нет.

- [ ] **Step 1: Сборка и выкладка**

```bash
npm run build && npx vite build --config vite.playground.config.js --outDir /Users/boobooking/Code/mars/certificates/src/public/build/ui-playground --emptyOutDir --base ./; echo "build exit $?"
for p in index.html host.html report.csv; do curl -sk -o /dev/null -w "$p %{http_code}\n" https://certificates.test/build/ui-playground/$p; done
```

Expected: `build exit 0`, все три `200`. Сборка certificates очищает `build/` целиком: перед каждым сообщением владельцу со ссылкой — снова проверить `200`, при `404` выложить заново.

- [ ] **Step 2: Chrome — `index.html` и `host.html`**

Браузер — Chrome DevTools MCP (`mcp__chrome-devtools__*`), окно 1600×1000.

- «Цвета»: у каждой из шести строк `InfoPill`, `ActionPill`, кнопка со стрелкой, пункт меню и точка — одного тона по утверждённой схеме; строка «без цвета» — белая кнопка и серый пункт. Наведение на `ActionPill` и кнопку — `hover` по uid, затем `evaluate_script` с `el.matches(':hover')` и `getComputedStyle(el).color` / `backgroundColor`: скриншот псевдокласс не доказывает.
- Переключатель `isLoading`: все шесть пилюль погашены (`opacity: 0.6`), курсор `not-allowed`, стрелки часов крутятся — `getAnimations()` у обеих `line` возвращает по одной анимации с `effect.getTiming().duration` `1000` и `12000`.
- «Уменьшить движение»: эмулировать медиа-запрос в Chrome DevTools MCP нечем, поэтому проверяется правило — `evaluate_script` обходит `document.styleSheets` и находит `@media (prefers-reduced-motion: reduce)` с правилом `.bb\:motion-reduce\:animate-none` и `animation: none`. Само поведение — у владельца в Safari (Step 3).
- «ActionPill и downloadFile»: перед кликом `emulate` с `networkConditions: "Slow 3G"`, чтобы запрос шёл заметно долго; «скачать report.csv» — часы и «формируется отчёт» на время запроса (снапшот во время загрузки: кнопка `disabled`), затем «скачан report.csv»; после — `emulate` без `networkConditions`; «скачать отсутствующий» — «ошибка: downloadFile: ответ 404 на missing.csv»; «запросить статусы» — две секунды часов, счётчик +1; клик во время работы ничего не добавляет.
- «TextPopover»: короткий и длинный текст открываются под иконкой правым краем по иконке; у нижнего края окна — вверх; длинный прокручивается внутри; пока открыта, тройной клик по тексту рядом не выделяет страницу; пустой — иконки нет; «Переключить снаружи» открывает и закрывает; «Опустошить» при открытой подсказке убирает её и снимает запрет выделения (`document.documentElement.style.userSelect` — прежнее значение).
- `DataTable`: полоски слева у строк 2–4 и 6–8 цветов red, yellow, green, indigo, purple, gray; строки полосатые; бейдж «Найдено» индиговый.
- Консоль без ошибок и предупреждений в обоих окружениях.

- [ ] **Step 3: Safari — владелец**

Попросить владельца проверить в его Safari `https://certificates.test/build/ui-playground/index.html` (ссылку перед сообщением проверить, Step 1): таблицу цветов; часы на пилюлях и их остановку при «Уменьшить движение» в настройках системы; «скачать report.csv» — файл сохраняется целиком; «скачать отсутствующий» — ошибка; `TextPopover` у верхнего и нижнего края, тройной клик. Дождаться ответа. Найденную ошибку — по superpowers:systematic-debugging с тестом, который сначала падает.

- [ ] **Step 4: Убрать сборку**

```bash
rm -rf /Users/boobooking/Code/mars/certificates/src/public/build/ui-playground && /bin/ls /Users/boobooking/Code/mars/certificates/src/public/build
```

Expected: `assets`, `manifest.json`.

---

### Task 13: Итоговое ревью

Независимое ревью коммитов этого плана до коммита с версией.

**Files:**
- Изменяются только файлы, которых касаются исправления.

**Interfaces:**
- Consumes: коммиты Tasks 1–10 и результат Task 12.
- Produces: ветка без замечаний Critical и Important; список отложенных Minor для владельца.

- [ ] **Step 1: Пакет ревью**

```bash
BASE=$(git log --format=%h -1 -- docs/superpowers/plans/2026-10-10-colors-pills-text-popover.md)
git log --oneline $BASE..HEAD
```

Пакет — скриптом superpowers `subagent-driven-development/scripts/review-package docs/superpowers/plans/2026-10-10-colors-pills-text-popover.md $BASE HEAD`.

- [ ] **Step 2: Ревьюер**

Свежий ревьюер на самой сильной доступной модели (модель указывается явно) по `superpowers:requesting-code-review` (`code-reviewer.md`): пакет ревью, спека, этот план, раздел Review Focus дословно, решения из журнала исполнения (строки `Ruling:`).

- [ ] **Step 3: Разбор и исправления**

Каждое замечание переоценивается по тому, что получит человек, если ветка выйдет как есть. Critical и Important — исправления, каждое отдельно: тест, который сначала падает; исправление; весь набор:

```bash
W=.superpowers/sdd/2026-10-10-colors-pills-text-popover
npm test > $W/t13-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t13-suite.log
grep -ciE "warn|error|stderr" $W/t13-suite.log
```

Expected: `tests exit 0`, всё passed, `0`. Коммит на каждое исправление. Minor — в список отложенных для владельца. Исправление, видимое в браузере, — повторить затронутые пункты Task 12 в Chrome и у владельца в Safari.

---

### Task 14: Версия `0.16.0`

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Поднять версию**

Run: `npm version 0.16.0 --no-git-tag-version && git diff | grep -E "^[-+].*version"`
Expected: три строки `0.15.1` → `0.16.0`.

- [ ] **Step 2: Финальная проверка**

```bash
W=.superpowers/sdd/2026-10-10-colors-pills-text-popover
npm test > $W/t14-test.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t14-test.log
grep -ciE "warn|error|stderr" $W/t14-test.log
npm run build > $W/t14-build.log 2>&1; echo "build exit $?"
grep -E "built|error" $W/t14-build.log
```

Expected: `tests exit 0`, всё passed, `0`, `build exit 0`, `✓ built`.

- [ ] **Step 3: Коммит**

```bash
git add package.json package-lock.json
git commit -m "chore: поднять версию пакета до 0.16.0"
```

---

### Task 15: Выпуск — только по слову владельца

- [ ] **Step 1: Пуш и `Test`**

После слова владельца:

```bash
git push origin main
SHA=$(git rev-parse HEAD)
gh run list --commit "$SHA" --workflow Test
```

Дождаться `completed success` у `Test` (оба джоба) по полному SHA версионного коммита: `gh run watch <id>`.

- [ ] **Step 2: Тег**

```bash
git tag v0.16.0 "$SHA" && git push origin v0.16.0
gh run list --workflow Publish --limit 1
npm view @boobooking/dashboard-ui-components@0.16.0 version
```

Expected: `Publish` — `success`; `0.16.0`.

---

## Отличия от спеки

- `src/colors.js` экспортирует и сам объект `COLORS` — для `tests/colors.test.js`: спека §4 называет `COLOR_NAMES`, `isColor`, `colorClass` и миксин `withColors`. Из `src/index.js` модуль по-прежнему не экспортируется.
- `DataTable` считает цвет полоски один раз на строку в вычисляемом `rowStripes` (спека §9 показывает вызов `stripeOf(row)` прямо в шаблоне).
- Приёмка `downloadFile` в Safari — в playground, файлом `report.csv` с того же адреса, а не на странице certificates до релиза (спека §16, шаг 3): страница «Ордеры» сама переходит на `ActionPill` и `downloadFile` только в плане certificates, после выпуска; там же — проверка настоящего ответа Laravel в Chrome и Safari.
- Комментарий об иконке `Eye` («Heroicon name: outline/eye») переезжает из шаблона в скрипт: комментарий перед корнем шаблона сделал бы компонент фрагментом.
- В `ActionPill` `loadingText`, равный пустой строке, считается отсутствующим, как `null`.
- Ожидаемые числа тестов в задачах посчитаны заранее; если исполнитель получит другое — сверить, откуда разница, и записать решение в журнал.

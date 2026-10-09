# DropdownButtonWithAction из списка действий и цвета пунктов — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `DropdownButtonWithAction` строится только из пропа `actions` — первое действие становится основной кнопкой, остальные уходят в меню, одно действие — кнопка без меню. У пунктов три цвета (`color: 'yellow' | 'red'`) вместо `danger`. Выпуск `0.15.0`.

**Architecture:** формат пункта, его цвет и предупреждение об убранном `danger` живут в `src/menuItems.js` и общие для `DropdownButtonWithAction`, `HamburgerMenu` и `PopoverMenu`. `PopoverMenu` красит пункты по `color`. `DropdownButtonWithAction` рисует основную кнопку из первого действия (`<a>` через `withNavigation` или `<button>` с `onSelect`), а `PopoverMenu` получает действия со второго. Механика меню (`PopoverPanel`) не меняется.

**Tech Stack:** Vue 3.5 (Options API, SFC), Tailwind v4 с префиксом `bb:`, Vite 8 (library mode), vitest 5 + happy-dom + @vue/test-utils, Popover API (в тестах — `tests/popoverStub.js`).

**Spec:** `docs/superpowers/specs/2026-10-09-dropdown-button-actions-design.md`

## Global Constraints

- Ветка `feat/hamburger-menu`; версия в `package.json` — `0.14.0` до последней задачи, затем `0.15.0` последним коммитом. Слияние и публикация — только по слову владельца.
- Пункт: `label` (непустая строка, обязательно), ровно одно из `href` (непустая строка) и `onSelect` (функция), необязательный `color` — `'yellow'` или `'red'`; без `color` — обычный. Поле со значением `undefined` отсутствует. Пункт с полем `danger` (не `undefined`) неверен; неверный `color` — тоже.
- Тексты предупреждений — дословно:
  - `[dashboard-ui-components] DropdownButtonWithAction: поле danger убрано, красный пункт — color: 'red'`
  - `[dashboard-ui-components] HamburgerMenu: поле danger убрано, красный пункт — color: 'red'`
  - `[dashboard-ui-components] DropdownButtonWithAction: слот button убран, основная кнопка — первый пункт actions`
  - `[dashboard-ui-components] DropdownButtonWithAction: слот actions убран, пункты меню передаются пропом actions` — прежнее, не меняется.
- Предупреждение о `danger` — один раз на экземпляр компонента; все предупреждения — только при `process.env.NODE_ENV !== 'production'`.
- Классы цветов — дословно (спека §5):
  - кнопка, обычная: `bb:bg-white bb:border-gray-300 bb:text-gray-700 bb:hover:bg-gray-50` (у стрелки `bb:text-gray-500` вместо `bb:text-gray-700`);
  - кнопка, жёлтая: `bb:bg-yellow-100 bb:border-yellow-300 bb:text-yellow-800 bb:hover:bg-yellow-200`;
  - кнопка, красная: `bb:bg-red-50 bb:border-red-300 bb:text-red-700 bb:hover:bg-red-100`;
  - пункт, обычный: `bb:text-gray-700 bb:focus:bg-gray-100 bb:focus:text-gray-900`;
  - пункт, жёлтый: `bb:text-yellow-800 bb:focus:bg-yellow-100`;
  - пункт, красный: `bb:text-red-700 bb:focus:bg-red-50`.
- Основная кнопка: `bb:px-4 bb:py-2 bb:text-sm bb:font-medium`; кольцо фокуса у основной кнопки и стрелки — `bb:focus:z-10 bb:focus:outline-hidden bb:focus:ring-1 bb:focus:ring-indigo-500 bb:focus:border-indigo-500`.
- `PopoverPanel`, `src/popover.js`, `src/menuFocus.js` не меняются.
- Код переносится, а не пишется заново: комментарии сохраняются; меняются только те, что после правки стали бы ложными.
- Каждый класс в шаблоне — с префиксом `bb:` (кроме `bb-dashboard-ui`), `:class` — только литералы; это проверяет `tests/utilityPrefix.test.js`.
- Стиль кода: в `.vue` — двойные кавычки и точки с запятой; в `.js` (и `src`, и тестах) — одинарные кавычки без точек с запятой; отступ 4 пробела; комментарии по-русски, описывают код как он есть.
- Вывод `npm test` чистый: ни одного предупреждения или ошибки; ожидаемые предупреждения перехватываются в тестах (`warnHandler`, `vi.spyOn(console, 'warn')`).
- Логи — в рабочую папку плана `W=.superpowers/sdd/2026-10-09-dropdown-button-actions` (git-ignored, создаётся в Task 1: `mkdir -p "$W"`). Полный набор — один прогон с логом и кодом завершения: `npm test > $W/<имя>.log 2>&1; echo "exit $?"`, итоги и шум — `grep` по логу.
- Коммиты — conventional commits по-русски, повелительное наклонение, без служебных строк; `--no-verify` запрещён.

## Review Focus

- Действий не осталось, пока меню открыто, а родитель держит его под `v-model`: кнопка пропадает целиком вместе с `PopoverMenu`, а `PopoverPanel` при размонтировании о закрытии не сообщает — родитель должен узнать о закрытии от самой кнопки, ровно один раз. А при одном действии меню нет, и входящее «открыто» с последующей пропажей действия события не даёт. Тесты — Task 2 («список опустел при открытом меню…», «при одном действии входящее «открыто», затем действий не осталось…»).
- Первое действие сменило вид (переход → действие), пока кнопка на странице: основная кнопка становится `<button>` и выполняет новое действие, а не старый переход. Тест — Task 2.
- Список действий записан прямо в шаблоне родителя и создаётся заново при каждой его перерисовке: предупреждение о `danger` не повторяется. Тест — Task 1.
- Неверное первое действие — без `href` и `onSelect`: кнопка рисуется, клик ничего не вызывает, ошибок нет. Тест — Task 2.
- Enter и пробел на основной кнопке-действии вызывают `onSelect`, Tab доходит до основной кнопки и стрелки, кольцо фокуса видно. happy-dom клавиатурную активацию кнопки не воспроизводит: тест закрепляет `<button type="button">` и классы кольца (Task 2), нажатия — приёмка в браузерах (Task 5).

---

### Task 1: Цвет пункта вместо `danger`

**Files:**
- Modify: `src/menuItems.js`
- Modify: `src/components/PopoverMenu.vue`
- Modify: `src/components/HamburgerMenu.vue`
- Modify: `src/components/DropdownButtonWithAction.vue` (комментарий пропа и примесь)
- Modify: `playground/App.vue` (два `danger: true`)
- Test: `tests/HamburgerMenu.test.js`, `tests/DropdownButtonWithAction.test.js`

**Interfaces:**
- Consumes: —
- Produces: в `src/menuItems.js` — `isMenuItem(item): boolean` (с `color` и без `danger`), `toMenuItems(actions): object[]` (без изменений), `itemColor(item): 'yellow' | 'red' | null`, `warnsRemovedDanger(componentName: string)` — примесь Options API (data `dangerWarned`, наблюдатель `actions` с `immediate: true`).

- [ ] **Step 1: Рабочая папка и тесты `HamburgerMenu`**

```bash
W=.superpowers/sdd/2026-10-09-dropdown-button-actions
mkdir -p "$W"
```

В `tests/HamburgerMenu.test.js`:

1. В `it.each` неверных пунктов (describe `HamburgerMenu: проверка пунктов`) после строки `        { name: 'ни href, ни onSelect', item: { label: 'Выйти' } },` добавить:

```js
        { name: 'неверный color', item: { label: 'Удалить', color: 'green', onSelect: () => {} } },
```

2. Заменить

```js
    it('верные пункты, и опасный тоже, — без предупреждений', () => {
        const { warnings, errors } = mountChecked([...profileActions(), { label: 'Удалить', danger: true, onSelect: () => {} }])
```

на

```js
    it('верные пункты, и цветные тоже, — без предупреждений', () => {
        const { warnings, errors } = mountChecked([
            ...profileActions(),
            { label: 'Отправить заново', color: 'yellow', onSelect: () => {} },
            { label: 'Удалить', color: 'red', onSelect: () => {} },
        ])
```

3. Перед `describe('HamburgerMenu: на странице', () => {` вставить:

```js
describe('HamburgerMenu: цвета пунктов', () => {
    it('обычный, жёлтый и красный пункт — свой цвет текста и подсветки', () => {
        const wrapper = mount(HamburgerMenu, {
            attachTo: document.body,
            props: {
                actions: [
                    { label: 'Администраторы', href: '#users' },
                    { label: 'Отправить заново', color: 'yellow', onSelect: () => {} },
                    { label: 'Удалить', color: 'red', onSelect: () => {} },
                ],
            },
        })

        const [plain, yellow, red] = itemsOf(wrapper).map((item) => item.classes())
        expect(plain).toEqual(expect.arrayContaining(['bb:text-gray-700', 'bb:focus:bg-gray-100', 'bb:focus:text-gray-900']))
        expect(yellow).toEqual(expect.arrayContaining(['bb:text-yellow-800', 'bb:focus:bg-yellow-100']))
        expect(yellow).not.toContain('bb:text-gray-700')
        expect(red).toEqual(expect.arrayContaining(['bb:text-red-700', 'bb:focus:bg-red-50']))
        expect(red).not.toContain('bb:bg-red-400')
    })
})

describe('HamburgerMenu: убранное поле danger', () => {
    const MESSAGE = "[dashboard-ui-components] HamburgerMenu: поле danger убрано, красный пункт — color: 'red'"
    const withDanger = () => [...profileActions(), { label: 'Удалить', danger: true, onSelect: () => {} }]
    let warn

    beforeEach(() => {
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
        warn.mockRestore()
        vi.unstubAllEnvs()
    })

    // Неверный пункт Vue отмечает своим предупреждением; warnHandler его
    // перехватывает, и вывод тестов остаётся чистым.
    function mountWith(actions) {
        const warnings = []
        const wrapper = mount(HamburgerMenu, {
            attachTo: document.body,
            props: { actions },
            global: { config: { warnHandler: (message) => warnings.push(message) } },
        })

        return { wrapper, warnings }
    }

    it('пункт с danger рисуется обычным, Vue отмечает его, а в консоль уходит одно предупреждение с заменой', () => {
        const { wrapper, warnings } = mountWith(withDanger())

        expect(itemsOf(wrapper)[3].classes()).toContain('bb:text-gray-700')
        expect(warnings.some((message) => message.includes(VALIDATOR_WARNING))).toBe(true)
        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn).toHaveBeenCalledWith(MESSAGE)
    })

    it('тот же список заново при перерисовке родителя — предупреждение не повторяется', async () => {
        const { wrapper } = mountWith(withDanger())

        await wrapper.setProps({ actions: withDanger() })
        await wrapper.setProps({ actions: withDanger() })

        expect(warn).toHaveBeenCalledTimes(1)
    })

    it('danger, появившийся после монтирования, даёт предупреждение', async () => {
        const { wrapper } = mountWith(profileActions())
        expect(warn).not.toHaveBeenCalled()

        await wrapper.setProps({ actions: withDanger() })

        expect(warn).toHaveBeenCalledWith(MESSAGE)
    })

    it('пункт с danger и color рисуется обычным: пункт с danger неверен целиком', () => {
        const { wrapper } = mountWith([...profileActions(), { label: 'Удалить', danger: true, color: 'red', onSelect: () => {} }])

        expect(itemsOf(wrapper)[3].classes()).toContain('bb:text-gray-700')
        expect(itemsOf(wrapper)[3].classes()).not.toContain('bb:text-red-700')
    })

    it('в продакшен-сборке предупреждения нет', () => {
        vi.stubEnv('NODE_ENV', 'production')

        mountWith(withDanger())

        expect(warn).not.toHaveBeenCalled()
    })
})
```

- [ ] **Step 2: Тесты `DropdownButtonWithAction`**

Замены в `tests/DropdownButtonWithAction.test.js` — скриптом; каждая замена проверяет, что найдена ровно один раз:

```bash
python3 - <<'PY'
p = 'tests/DropdownButtonWithAction.test.js'
s = open(p, encoding='utf-8').read()

def rep(old, new):
    global s
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)

rep("""    it('пункты задают цвет текста сами: у popover в верхнем слое свой color', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots,
            props: { actions: [{ label: 'Поменять пароль', href: '#password' }, { label: 'Удалить', danger: true, onSelect: () => {} }] },
        })

        const [link, danger] = menuOf(wrapper).findAll('[role="menuitem"]')
        expect(link.classes()).toContain('bb:text-gray-700')
        expect(danger.classes()).toContain('bb:text-white')
    })""", """    it('пункты задают цвет текста сами — обычный, жёлтый, красный: у popover в верхнем слое свой color', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots,
            props: {
                actions: [
                    { label: 'Поменять пароль', href: '#password' },
                    { label: 'Отправить заново', color: 'yellow', onSelect: () => {} },
                    { label: 'Удалить', color: 'red', onSelect: () => {} },
                ],
            },
        })

        const [plain, yellow, red] = menuOf(wrapper).findAll('[role="menuitem"]').map((item) => item.classes())
        expect(plain).toEqual(expect.arrayContaining(['bb:text-gray-700', 'bb:focus:bg-gray-100']))
        expect(yellow).toEqual(expect.arrayContaining(['bb:text-yellow-800', 'bb:focus:bg-yellow-100']))
        expect(red).toEqual(expect.arrayContaining(['bb:text-red-700', 'bb:focus:bg-red-50']))
        expect(red).not.toContain('bb:bg-red-400')
    })""")

rep("""        { label: 'Удалить', danger: true, onSelect: () => {} },
    ]""", """        { label: 'Удалить', color: 'red', onSelect: () => {} },
    ]""")

rep("""            props: { actions: [{ label: 'Поменять пароль', href: '#password' }, { label: 'Удалить', danger: true, onSelect: () => {} }] },""",
    """            props: { actions: [{ label: 'Поменять пароль', href: '#password' }, { label: 'Удалить', color: 'red', onSelect: () => {} }] },""")

rep("""        { name: 'danger-строка', item: { label: 'Удалить', danger: 'да', onSelect: fn } },""",
    """        { name: 'неверный color', item: { label: 'Удалить', color: 'green', onSelect: fn } },""")

rep("""        { name: 'переход с danger', item: { label: 'Открыть', href: '#open', danger: true } },
        { name: 'действие с danger: false', item: { label: 'Удалить', danger: false, onSelect: fn } },""",
    """        { name: 'переход с color: red', item: { label: 'Открыть', href: '#open', color: 'red' } },
        { name: 'действие с color: yellow', item: { label: 'Удалить', color: 'yellow', onSelect: fn } },""")

assert 'danger' not in s
open(p, 'w', encoding='utf-8').write(s)
PY
```

В конец файла добавить:

```js
describe('DropdownButtonWithAction: убранное поле danger', () => {
    const MESSAGE = "[dashboard-ui-components] DropdownButtonWithAction: поле danger убрано, красный пункт — color: 'red'"
    const VALIDATOR_WARNING = 'Invalid prop: custom validator check failed for prop "actions"'
    const withDanger = () => [...actions, { label: 'Опасное', danger: true, onSelect: () => {} }]
    let warn

    beforeEach(() => {
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
        warn.mockRestore()
        vi.unstubAllEnvs()
    })

    // Неверный пункт Vue отмечает своим предупреждением; warnHandler его
    // перехватывает, и вывод тестов остаётся чистым.
    function mountWith(value) {
        const warnings = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots,
            props: { actions: value },
            global: { config: { warnHandler: (message) => warnings.push(message) } },
        })

        return { wrapper, warnings }
    }

    it('пункт с danger рисуется обычным, Vue отмечает его, а в консоль уходит одно предупреждение с заменой', () => {
        const { wrapper, warnings } = mountWith(withDanger())
        const items = menuOf(wrapper).findAll('[role="menuitem"]')

        expect(items[items.length - 1].classes()).toContain('bb:text-gray-700')
        expect(warnings.some((message) => message.includes(VALIDATOR_WARNING))).toBe(true)
        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn).toHaveBeenCalledWith(MESSAGE)
    })

    it('тот же список заново при перерисовке родителя — предупреждение не повторяется', async () => {
        const { wrapper } = mountWith(withDanger())

        await wrapper.setProps({ actions: withDanger() })
        await wrapper.setProps({ actions: withDanger() })

        expect(warn).toHaveBeenCalledTimes(1)
    })

    it('в продакшен-сборке предупреждения нет', () => {
        vi.stubEnv('NODE_ENV', 'production')

        mountWith(withDanger())

        expect(warn).not.toHaveBeenCalled()
    })
})
```

- [ ] **Step 3: Тесты падают**

```bash
W=.superpowers/sdd/2026-10-09-dropdown-button-actions
npx vitest run tests/HamburgerMenu.test.js tests/DropdownButtonWithAction.test.js > $W/t1-red.log 2>&1; echo "exit $?"
grep -E "×|Tests " $W/t1-red.log | head -20
```

Expected: `exit 1`. Падают: цвета пунктов в обоих файлах (нет классов `bb:text-yellow-800`, `bb:text-red-700`), «неверный color» в обоих (валидатор цвет не проверяет), тесты убранного `danger` (валидатор `danger` принимает, предупреждения нет), в том числе «пункт с danger и color рисуется обычным» (сейчас `danger: true` красит пункт заливкой `bb:bg-red-400`; после правки тест ловит `itemColor`, который не учёл бы `danger`). Остальные проходят.

- [ ] **Step 4: `src/menuItems.js`**

Заменить файл целиком:

```js
// Пункты меню DropdownButtonWithAction и HamburgerMenu: проверка для
// валидаторов пропа actions, разбор и цвет для PopoverMenu, предупреждение
// об убранном поле danger.
// Внутренний модуль пакета.

// Цвета пункта; пункт без color — обычный.
const COLORS = ['yellow', 'red']

// Пункт меню — ровно одна из двух форм: переход (href без onSelect) или
// действие (onSelect без href). Поле отсутствует, если оно undefined.
// Цвет — color: 'yellow' или 'red'. Поля danger нет: пункт с ним неверен.
export function isMenuItem(item) {
    if (typeof item !== 'object' || item === null) {
        return false
    }

    if (typeof item.label !== 'string' || item.label === '') {
        return false
    }

    if (item.color !== undefined && !COLORS.includes(item.color)) {
        return false
    }

    if (item.danger !== undefined) {
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

// Цвет пункта для его классов. Без color, с неверным color и с убранным
// полем danger — обычный: такой пункт валидатор отклоняет, и рисуется он
// обычным, какой бы color у него ни был.
export function itemColor(item) {
    if (item.danger !== undefined) {
        return null
    }

    return COLORS.includes(item.color) ? item.color : null
}

// Пункт с убранным полем danger валидатор отклоняет без объяснения, поэтому
// компонент называет замену сам. Один раз на экземпляр: список, записанный
// в шаблоне родителя, создаётся заново при каждой его перерисовке, и
// предупреждение повторялось бы на каждую. Проверку process.env.NODE_ENV
// подменяет бандлер проекта, как у самого Vue: в продакшен-сборке
// предупреждения нет.
export function warnsRemovedDanger(componentName) {
    return {
        data() {
            return {
                dangerWarned: false,
            }
        },

        watch: {
            actions: {
                immediate: true,
                handler(actions) {
                    if (process.env.NODE_ENV === 'production' || this.dangerWarned) {
                        return
                    }

                    if (toMenuItems(actions).some((item) => item.danger !== undefined)) {
                        this.dangerWarned = true
                        console.warn(`[dashboard-ui-components] ${componentName}: поле danger убрано, красный пункт — color: 'red'`)
                    }
                },
            },
        },
    }
}
```

- [ ] **Step 5: `PopoverMenu` красит пункты по `color`**

В `src/components/PopoverMenu.vue`:

1. У `<a>` и у `<button>` пункта заменить строку

```vue
                    :class="item.danger === true ? 'bb:bg-red-400 bb:text-white bb:focus:bg-red-500' : 'bb:text-gray-700 bb:focus:bg-gray-100 bb:focus:text-gray-900'"
```

на

```vue
                    :class="{
                        'bb:text-gray-700 bb:focus:bg-gray-100 bb:focus:text-gray-900': color(item) === null,
                        'bb:text-yellow-800 bb:focus:bg-yellow-100': color(item) === 'yellow',
                        'bb:text-red-700 bb:focus:bg-red-50': color(item) === 'red',
                    }"
```

2. Импорт `import { toMenuItems } from "../menuItems.js";` заменить на `import { itemColor, toMenuItems } from "../menuItems.js";`.

3. Комментарий пропа `actions`:

```js
        // Пункты меню: { label, href } — переход, { label, onSelect } —
        // действие, danger: true — опасный пункт. Тип и пункты проверяют
        // публичные компоненты: проверка и здесь давала бы каждое
        // предупреждение дважды.
```

заменить на

```js
        // Пункты меню: { label, href } — переход, { label, onSelect } —
        // действие, color: 'yellow' или 'red' — цвет. Тип и пункты проверяют
        // публичные компоненты: проверка и здесь давала бы каждое
        // предупреждение дважды.
```

4. В `methods` перед `isLink(item)` добавить:

```js
        color(item) {
            return itemColor(item);
        },

```

- [ ] **Step 6: Предупреждение в `HamburgerMenu` и `DropdownButtonWithAction`**

В `src/components/HamburgerMenu.vue`: импорт `import { isMenuItem } from "../menuItems.js";` → `import { isMenuItem, warnsRemovedDanger } from "../menuItems.js";`; `mixins: [withLang],` → `mixins: [withLang, warnsRemovedDanger("HamburgerMenu")],`; комментарий пропа

```js
        // Пункты меню — как у DropdownButtonWithAction: { label, href } —
        // переход, { label, onSelect } — действие, danger: true — опасный
        // пункт.
```

→

```js
        // Пункты меню — как у DropdownButtonWithAction: { label, href } —
        // переход, { label, onSelect } — действие, color: 'yellow' или
        // 'red' — цвет.
```

В `src/components/DropdownButtonWithAction.vue`: импорт `import { isMenuItem, toMenuItems } from "../menuItems.js";` → `import { isMenuItem, toMenuItems, warnsRemovedDanger } from "../menuItems.js";`; `mixins: [withLang],` → `mixins: [withLang, warnsRemovedDanger("DropdownButtonWithAction")],`; комментарий пропа

```js
        // Пункты меню: { label, href } — переход, { label, onSelect } —
        // действие, danger: true — опасный пункт.
```

→

```js
        // Пункты меню: { label, href } — переход, { label, onSelect } —
        // действие, color: 'yellow' или 'red' — цвет.
```

- [ ] **Step 7: Playground без `danger`**

В `playground/App.vue` оба `danger: true` заменить на `color: 'red'`:

```bash
sed -i '' "s/danger: true/color: 'red'/g" playground/App.vue && grep -c "danger" playground/App.vue
```

Expected: `0`.

- [ ] **Step 8: Тесты проходят, весь набор, коммит**

```bash
W=.superpowers/sdd/2026-10-09-dropdown-button-actions
npx vitest run tests/HamburgerMenu.test.js tests/DropdownButtonWithAction.test.js > $W/t1-green.log 2>&1; echo "exit $?"
grep -E "Tests |×" $W/t1-green.log
npm test > $W/t1-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t1-suite.log
grep -ciE "warn|error|stderr" $W/t1-suite.log
npm run build > $W/t1-build.log 2>&1; echo "build exit $?"
git add src/menuItems.js src/components/PopoverMenu.vue src/components/HamburgerMenu.vue src/components/DropdownButtonWithAction.vue playground/App.vue tests/HamburgerMenu.test.js tests/DropdownButtonWithAction.test.js
git commit -m "feat: задавать цвет пункта меню полем color вместо danger"
```

Expected: `exit 0` (`Tests  91 passed (91)`: 28 `HamburgerMenu` и 63 `DropdownButtonWithAction`); `tests exit 0`, `Tests  524 passed (524)`; `0`; `build exit 0`.

---

### Task 2: Основная кнопка из первого действия

**Files:**
- Modify: `src/menuItems.js` (добавить `isLinkItem`)
- Modify: `src/components/PopoverMenu.vue` (`isLink` через `isLinkItem`)
- Modify: `src/components/DropdownButtonWithAction.vue` (шаблон и `<script>` целиком)
- Test: `tests/DropdownButtonWithAction.test.js`, `tests/PopoverPanel.test.js`, `tests/i18n.test.js`, `tests/ssrFixtures.js`, `tests/HamburgerMenu.test.js`

**Interfaces:**
- Consumes: из Task 1 — `isMenuItem`, `toMenuItems`, `itemColor`, `warnsRemovedDanger` из `src/menuItems.js`; `PopoverMenu` с пропами `actions`, `modelValue`, событием `update:modelValue`, слотом `trigger` (`{ id, popovertarget }`).
- Produces: `isLinkItem(item): boolean` в `src/menuItems.js`; `DropdownButtonWithAction` с пропами `actions`, `modelValue`, `lang` и событием `update:modelValue`, без слотов.

- [ ] **Step 1: Перевести прежние тесты на основную кнопку из `actions`**

```bash
python3 - <<'PY'
import re

def edit(path, pairs):
    s = open(path, encoding='utf-8').read()
    for old, new, count in pairs:
        assert s.count(old) == count, (path, s.count(old), old[:60])
        s = s.replace(old, new)
    open(path, 'w', encoding='utf-8').write(s)

edit('tests/DropdownButtonWithAction.test.js', [
    ("""const slots = {
    button: () => h('span', 'Редактировать'),
}

// Одно действие: большинству тестов нужен только факт, что пункт есть.
const actions = [{ label: 'Удалить', onSelect: () => {} }]
""", """// Основное действие — переход: основная кнопка с ним — ссылка.
const main = { label: 'Редактировать', href: '#edit' }

// Основная кнопка и один пункт меню: большинству тестов нужен только факт,
// что меню есть.
const actions = [main, { label: 'Удалить', onSelect: () => {} }]
""", 1),
    ("""function arrowOf(wrapper) {
    return wrapper.findAll('button').find((button) => button.text().includes('Открыть меню'))
}
""", """function arrowOf(wrapper) {
    return wrapper.findAll('button').find((button) => button.text().includes('Открыть меню'))
}

// Основная кнопка — ссылка или кнопка вне меню и без popovertarget.
function mainOf(wrapper) {
    return wrapper.findAll('a, button').find((element) => element.attributes('popovertarget') === undefined && element.element.closest('[role="menu"]') === null)
}
""", 1),
    ("""            },
            slots,
        )))""", """            },
        )))""", 1),
    ("{ attachTo: document.body, slots, props: {", "{ attachTo: document.body, props: {", 19),
    ("\n            slots,\n", "\n", 12),
    ("""                actions: [
                    { label: 'Поменять пароль', href: '#password' },
                    { label: 'Отправить заново', color: 'yellow', onSelect: () => {} },""", """                actions: [
                    main,
                    { label: 'Поменять пароль', href: '#password' },
                    { label: 'Отправить заново', color: 'yellow', onSelect: () => {} },""", 1),
    ("""    it('без действий стрелки и панели нет', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots: { button: slots.button },
        })

        expect(arrowOf(wrapper)).toBeUndefined()
        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    })

""", "", 1),
    ("props: { actions: twoActions } }", "props: { actions: [main, ...twoActions] } }", 3),
    ("props: { actions: [{ label: 'Поменять пароль', href: '#password' }, { label: 'Удалить', color: 'red', onSelect: () => {} }] },",
     "props: { actions: [main, { label: 'Поменять пароль', href: '#password' }, { label: 'Удалить', color: 'red', onSelect: () => {} }] },", 1),
    ("props: { actions: [{ label: 'Удалить', onSelect }] } })", "props: { actions: [main, { label: 'Удалить', onSelect }] } })", 1),
    ("            props: { actions: [{ label: 'Поменять пароль', href: '#password' }] },",
     "            props: { actions: [main, { label: 'Поменять пароль', href: '#password' }] },", 2),
    ("""    ])('$name — стрелки и меню нет, предупреждений нет', ({ value }) => {
        const warnings = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: value },
            global: { config: { warnHandler: (message) => warnings.push(message) } },
        })

        expect(arrowOf(wrapper)).toBeUndefined()
        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
        expect(warnings).toEqual([])""", """    ])('$name — ничего не рисуется, предупреждений нет', ({ value }) => {
        const warnings = []
        mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: value },
            global: { config: { warnHandler: (message) => warnings.push(message) } },
        })

        expect(document.body.querySelector('a, button')).toBeNull()
        expect(document.body.querySelector('[role="menu"]')).toBeNull()
        expect(warnings).toEqual([])""", 1),
    ("props: { actions: [{ label: 'Старый', onSelect: () => {} }] } })", "props: { actions: [main, { label: 'Старый', onSelect: () => {} }] } })", 1),
    ("await wrapper.setProps({ actions: [{ label: 'Первый новый', onSelect: () => {} }, { label: 'Второй новый', onSelect: () => {} }] })",
     "await wrapper.setProps({ actions: [main, { label: 'Первый новый', onSelect: () => {} }, { label: 'Второй новый', onSelect: () => {} }] })", 1),
    ("""        expect(rendered().map((item) => [item.element.tagName, item.text()])).toEqual([['BUTTON', 'A'], ['BUTTON', 'B'], ['A', 'C']])

        for (const index of [0, 1, 2]) {""", """        expect([mainOf(wrapper).element.tagName, mainOf(wrapper).text()]).toEqual(['BUTTON', 'A'])
        expect(rendered().map((item) => [item.element.tagName, item.text()])).toEqual([['BUTTON', 'B'], ['A', 'C']])

        await mainOf(wrapper).trigger('click')
        for (const index of [0, 1]) {""", 1),
    ("mountChecked([{ label: 'Удалить', onSelect: () => { throw failure } }])", "mountChecked([main, { label: 'Удалить', onSelect: () => { throw failure } }])", 1),
    ("mountChecked([{ label: 'Удалить', onSelect: async () => { throw failure } }])", "mountChecked([main, { label: 'Удалить', onSelect: async () => { throw failure } }])", 1),
    ("    const withSlot = { ...slots, actions: () => h('a', { href: '#', class: 'from-slot' }, 'Из слота') }",
     "    const withSlot = { actions: () => h('a', { href: '#', class: 'from-slot' }, 'Из слота') }", 1),
    ("{ attachTo: document.body, slots: withSlot })", "{ attachTo: document.body, slots: withSlot, props: { actions } })", 2),
])

edit('tests/PopoverPanel.test.js', [
    ("""            props: { actions: [{ label: 'Удалить', onSelect: () => {} }] },
            slots: { button: () => 'Редактировать' },
""", """            props: { actions: [{ label: 'Редактировать', href: '#edit' }, { label: 'Удалить', onSelect: () => {} }] },
""", 1),
])

edit('tests/i18n.test.js', [
    ("""                slots: { button: 'Основное' },
                props: { actions: [{ label: 'Действие', href: '#' }] },
""", """                props: { actions: [{ label: 'Основное', href: '#main' }, { label: 'Действие', href: '#' }] },
""", 1),
    ("props: { lang: 'de', actions: [{ label: 'Действие', href: '#' }] }, slots: { button: 'Основное' },",
     "props: { lang: 'de', actions: [{ label: 'Основное', href: '#main' }, { label: 'Действие', href: '#' }] },", 1),
])

edit('tests/ssrFixtures.js', [
    ("DropdownButtonWithAction: { props: { actions: [{ label: 'Другое действие', href: '#' }] }, slots: { button: () => 'Действие' } },",
     "DropdownButtonWithAction: { props: { actions: [{ label: 'Действие', href: '#' }, { label: 'Другое действие', href: '#' }] } },", 1),
])

edit('tests/HamburgerMenu.test.js', [
    ("h(DropdownButtonWithAction, { actions: [{ label: 'Удалить', onSelect: () => {} }] }, { button: () => 'Редактировать' }),",
     "h(DropdownButtonWithAction, { actions: [{ label: 'Редактировать', href: '#edit' }, { label: 'Удалить', onSelect: () => {} }] }),", 1),
])
PY
grep -n "slots" tests/DropdownButtonWithAction.test.js
```

Expected: скрипт без ошибок; `slots` остаётся только в строках с `withSlot`.

- [ ] **Step 2: Новые тесты основной кнопки и слота `button`**

В конец `tests/DropdownButtonWithAction.test.js` добавить:

```js
describe('DropdownButtonWithAction: кнопка из действий', () => {
    const navigation = []
    const inApp = { plugins: [[dashboardUi, { navigate: (href) => navigation.push(href) }]] }

    beforeEach(() => {
        navigation.length = 0
    })

    it('без действий ничего не рисуется', () => {
        mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [] } })

        expect(document.body.querySelector('a, button')).toBeNull()
        expect(document.body.querySelector('[role="menu"]')).toBeNull()
    })

    it('одно действие — одна кнопка без стрелки и меню, скруглённая с обеих сторон', () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main] } })

        expect(arrowOf(wrapper)).toBeUndefined()
        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
        expect(mainOf(wrapper).text()).toBe('Редактировать')
        expect(mainOf(wrapper).classes()).toEqual(expect.arrayContaining(['bb:rounded-md', 'bb:px-4', 'bb:py-2', 'bb:text-sm', 'bb:font-medium']))
        expect(mainOf(wrapper).classes()).not.toContain('bb:rounded-l-md')
    })

    it('несколько действий — первое основная кнопка, остальные в меню по порядку', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [main, { label: 'Поменять пароль', href: '#password' }, { label: 'Удалить', onSelect: () => {} }] },
        })

        expect(mainOf(wrapper).text()).toBe('Редактировать')
        expect(mainOf(wrapper).classes()).toContain('bb:rounded-l-md')
        expect(menuOf(wrapper).findAll('[role="menuitem"]').map((item) => item.text())).toEqual(['Поменять пароль', 'Удалить'])
    })

    it('основная кнопка-переход — ссылка: клик уходит в navigate плагина', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main] }, global: inApp })

        expect(mainOf(wrapper).element.tagName).toBe('A')
        expect(mainOf(wrapper).attributes('href')).toBe('#edit')
        await mainOf(wrapper).trigger('click')

        expect(navigation).toEqual(['#edit'])
    })

    it('основная кнопка-переход: клик с Cmd остаётся браузеру', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main] }, global: inApp })

        await mainOf(wrapper).trigger('click', { metaKey: true })

        expect(navigation).toEqual([])
    })

    it('основная кнопка-переход без navigate — обычная ссылка: клик не перехватывается', () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main] } })
        const event = new MouseEvent('click', { bubbles: true, cancelable: true })

        mainOf(wrapper).element.dispatchEvent(event)

        expect(event.defaultPrevented).toBe(false)
    })

    it('основная кнопка-действие вызывает onSelect один раз без аргументов', async () => {
        const onSelect = vi.fn()
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [{ label: 'Отправить заново', onSelect }] } })

        expect(mainOf(wrapper).element.tagName).toBe('BUTTON')
        expect(mainOf(wrapper).attributes('type')).toBe('button')
        await mainOf(wrapper).trigger('click')

        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(onSelect).toHaveBeenCalledWith()
    })

    it('onSelect основной кнопки, бросивший исключение, отдаёт ошибку Vue', async () => {
        const failure = new Error('сбой обработчика')
        const errors = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [{ label: 'Отправить заново', onSelect: () => { throw failure } }] },
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        await mainOf(wrapper).trigger('click')

        expect(errors).toEqual([failure])
    })

    // Vue передаёт в errorHandler отклонённый Promise, только если обработчик
    // клика его вернул; иначе отказ уходит в unhandledrejection.
    it('асинхронный onSelect основной кнопки с отказом отдаёт ошибку Vue', async () => {
        const failure = new Error('сбой асинхронного обработчика')
        const errors = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [{ label: 'Отправить заново', onSelect: async () => { throw failure } }] },
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        mainOf(wrapper).element.click()
        await flushPromises()

        expect(errors).toEqual([failure])
    })

    it('первое действие без href и onSelect — кнопка, клик по ней ничего не вызывает и не роняет компонент', async () => {
        const warnings = []
        const errors = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [{ label: 'Пустое' }, { label: 'Удалить', onSelect: () => {} }] },
            global: { config: { warnHandler: (message) => warnings.push(message), errorHandler: (error) => errors.push(error) } },
        })

        expect(mainOf(wrapper).element.tagName).toBe('BUTTON')
        await mainOf(wrapper).trigger('click')

        expect(errors).toEqual([])
        expect(warnings.some((message) => message.includes('Invalid prop: custom validator check failed for prop "actions"'))).toBe(true)
    })

    it('первое действие сменилось с перехода на действие — основная кнопка выполняет новое действие', async () => {
        const onSelect = vi.fn()
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main] }, global: inApp })

        await wrapper.setProps({ actions: [{ label: 'Отправить заново', onSelect }] })
        await mainOf(wrapper).trigger('click')

        expect(mainOf(wrapper).element.tagName).toBe('BUTTON')
        expect(mainOf(wrapper).text()).toBe('Отправить заново')
        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(navigation).toEqual([])
    })

    it.each([
        {
            name: 'обычное',
            color: undefined,
            mainClasses: ['bb:bg-white', 'bb:border-gray-300', 'bb:text-gray-700', 'bb:hover:bg-gray-50'],
            arrowClasses: ['bb:bg-white', 'bb:border-gray-300', 'bb:text-gray-500', 'bb:hover:bg-gray-50'],
        },
        {
            name: 'жёлтое',
            color: 'yellow',
            mainClasses: ['bb:bg-yellow-100', 'bb:border-yellow-300', 'bb:text-yellow-800', 'bb:hover:bg-yellow-200'],
            arrowClasses: ['bb:bg-yellow-100', 'bb:border-yellow-300', 'bb:text-yellow-800', 'bb:hover:bg-yellow-200'],
        },
        {
            name: 'красное',
            color: 'red',
            mainClasses: ['bb:bg-red-50', 'bb:border-red-300', 'bb:text-red-700', 'bb:hover:bg-red-100'],
            arrowClasses: ['bb:bg-red-50', 'bb:border-red-300', 'bb:text-red-700', 'bb:hover:bg-red-100'],
        },
    ])('первое действие $name — основная кнопка и стрелка его цвета', ({ color, mainClasses, arrowClasses }) => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [{ ...main, color }, { label: 'Удалить', onSelect: () => {} }] },
        })

        expect(mainOf(wrapper).classes()).toEqual(expect.arrayContaining(mainClasses))
        expect(arrowOf(wrapper).classes()).toEqual(expect.arrayContaining(arrowClasses))
    })

    it('цвет пункта меню основную кнопку и стрелку не красит', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [main, { label: 'Удалить', color: 'red', onSelect: () => {} }] },
        })

        expect(mainOf(wrapper).classes()).toContain('bb:bg-white')
        expect(mainOf(wrapper).classes()).not.toContain('bb:bg-red-50')
        expect(arrowOf(wrapper).classes()).toContain('bb:bg-white')
    })

    // Видно ли кольцо, happy-dom не считает: тест закрепляет классы,
    // нажатия Tab, Enter и пробела проверяются в браузере.
    it('у основной кнопки кольцо фокуса, как у стрелки', () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })
        const ring = ['bb:focus:z-10', 'bb:focus:outline-hidden', 'bb:focus:ring-1', 'bb:focus:ring-indigo-500', 'bb:focus:border-indigo-500']

        expect(mainOf(wrapper).classes()).toEqual(expect.arrayContaining(ring))
        expect(arrowOf(wrapper).classes()).toEqual(expect.arrayContaining(ring))
    })

    it('при открытом меню осталось одно действие: меню пропадает, родитель узнаёт о закрытии', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })
        await arrowOf(wrapper).trigger('click')
        await settle()

        await wrapper.setProps({ actions: [main] })
        await settle()

        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
        expect(mainOf(wrapper).text()).toBe('Редактировать')
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('при одном действии входящее «открыто» ни на что не влияет, ответного события нет', async () => {
        const errors = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [main], modelValue: true },
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })
        await settle()

        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
        expect(errors).toEqual([])
    })

    it('при одном действии входящее «открыто», затем действий не осталось — события нет: меню не было', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [main], modelValue: true } })
        await settle()

        await wrapper.setProps({ actions: [] })
        await settle()

        expect(document.body.querySelector('a, button')).toBeNull()
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
})

describe('DropdownButtonWithAction: убранный слот button', () => {
    const MESSAGE = '[dashboard-ui-components] DropdownButtonWithAction: слот button убран, основная кнопка — первый пункт actions'
    let warn

    beforeEach(() => {
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
        warn.mockRestore()
        vi.unstubAllEnvs()
    })

    const withSlot = { button: () => h('span', { class: 'from-slot' }, 'Из слота') }

    it('переданный слот не рисуется, а в консоль уходит предупреждение', () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots: withSlot, props: { actions } })

        expect(wrapper.find('.from-slot').exists()).toBe(false)
        expect(mainOf(wrapper).text()).toBe('Редактировать')
        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn).toHaveBeenCalledWith(MESSAGE)
    })

    it('без слота предупреждения нет', () => {
        mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions } })

        expect(warn).not.toHaveBeenCalled()
    })

    it('в продакшен-сборке предупреждения нет', () => {
        vi.stubEnv('NODE_ENV', 'production')

        mount(DropdownButtonWithAction, { attachTo: document.body, slots: withSlot, props: { actions } })

        expect(warn).not.toHaveBeenCalled()
    })
})
```

- [ ] **Step 3: Тесты падают**

```bash
W=.superpowers/sdd/2026-10-09-dropdown-button-actions
npx vitest run tests/DropdownButtonWithAction.test.js tests/PopoverPanel.test.js tests/i18n.test.js tests/ssr.test.js tests/hydration.test.js tests/HamburgerMenu.test.js > $W/t2-red.log 2>&1; echo "exit $?"
grep -E "×|Tests " $W/t2-red.log | head -40
```

Expected: `exit 1`. Падают тесты `DropdownButtonWithAction`, которым нужна основная кнопка из первого действия: её нет, первое действие стоит пунктом меню, слот `button` не даёт предупреждения. `PopoverPanel`, `i18n`, `ssr`, `hydration` и `HamburgerMenu` проходят.

- [ ] **Step 4: `isLinkItem` в `src/menuItems.js`, `PopoverMenu` на нём**

В `src/menuItems.js` после функции `toMenuItems` вставить:

```js

// Ссылка — только при непустом строковом href; у ссылки onSelect
// не вызывается.
export function isLinkItem(item) {
    return typeof item.href === 'string' && item.href !== ''
}
```

В `src/components/PopoverMenu.vue`: импорт → `import { isLinkItem, itemColor, toMenuItems } from "../menuItems.js";`, тело `isLink(item)` →

```js
        isLink(item) {
            return isLinkItem(item);
        },
```

(комментарий над `isLink` остаётся).

- [ ] **Step 5: `DropdownButtonWithAction` из действий**

Заменить `src/components/DropdownButtonWithAction.vue` целиком:

```vue
<template>
    <!-- Кнопка из действий actions: первое — основная кнопка, остальные —
         меню за стрелкой. Без действий кнопки нет. Цвет первого действия
         красит основную кнопку вместе со стрелкой, цвет пункта меню — только
         этот пункт. -->
    <span v-if="hasActions" class="bb-dashboard-ui bb:relative bb:inline-flex bb:shadow-xs bb:rounded-md">
        <!-- Основное действие выполняет пакет, как и пункт меню: переход —
             ссылка через navigate плагина, действие — кнопка, которая
             вызывает onSelect. Проекту не нужно ловить клик самому и
             зависеть от разметки кнопки. Без меню стрелки нет, и кнопка
             скругляется с обеих сторон. -->
        <a
            v-if="isLink(mainAction)"
            :href="mainAction.href"
            class="bb:relative bb:inline-flex bb:items-center bb:px-4 bb:py-2 bb:border bb:text-sm bb:font-medium bb:cursor-pointer bb:focus:z-10 bb:focus:outline-hidden bb:focus:ring-1 bb:focus:ring-indigo-500 bb:focus:border-indigo-500"
            :class="{
                'bb:rounded-l-md': hasMenu,
                'bb:rounded-md': !hasMenu,
                'bb:bg-white bb:border-gray-300 bb:text-gray-700 bb:hover:bg-gray-50': mainColor === null,
                'bb:bg-yellow-100 bb:border-yellow-300 bb:text-yellow-800 bb:hover:bg-yellow-200': mainColor === 'yellow',
                'bb:bg-red-50 bb:border-red-300 bb:text-red-700 bb:hover:bg-red-100': mainColor === 'red',
            }"
            @click="followLink($event, mainAction.href)"
            v-text="mainAction.label"
        ></a>
        <button
            v-else
            type="button"
            class="bb:relative bb:inline-flex bb:items-center bb:px-4 bb:py-2 bb:border bb:text-sm bb:font-medium bb:cursor-pointer bb:focus:z-10 bb:focus:outline-hidden bb:focus:ring-1 bb:focus:ring-indigo-500 bb:focus:border-indigo-500"
            :class="{
                'bb:rounded-l-md': hasMenu,
                'bb:rounded-md': !hasMenu,
                'bb:bg-white bb:border-gray-300 bb:text-gray-700 bb:hover:bg-gray-50': mainColor === null,
                'bb:bg-yellow-100 bb:border-yellow-300 bb:text-yellow-800 bb:hover:bg-yellow-200': mainColor === 'yellow',
                'bb:bg-red-50 bb:border-red-300 bb:text-red-700 bb:hover:bg-red-100': mainColor === 'red',
            }"
            @click="select(mainAction)"
            v-text="mainAction.label"
        ></button>
        <!-- Меню, его пункты и поведение — PopoverMenu; здесь только стрелка,
             которая его открывает. Обёртка стрелки — flex: стрелка
             растягивается по высоте основной кнопки. Без пунктов меню
             PopoverMenu не рисует ни стрелки, ни панели. -->
        <popover-menu
            class="bb:-ml-px bb:flex"
            :actions="menuActions"
            :model-value="modelValue"
            @update:model-value="onMenuToggle"
        >
            <template #trigger="trigger">
                <button
                    type="button"
                    :id="trigger.id"
                    :popovertarget="trigger.popovertarget"
                    class="bb:relative bb:inline-flex bb:items-center bb:px-2 bb:py-2 bb:rounded-r-md bb:border bb:text-sm bb:font-medium bb:focus:z-10 bb:focus:outline-hidden bb:focus:ring-1 bb:focus:ring-indigo-500 bb:focus:border-indigo-500"
                    :class="{
                        'bb:bg-white bb:border-gray-300 bb:text-gray-500 bb:hover:bg-gray-50': mainColor === null,
                        'bb:bg-yellow-100 bb:border-yellow-300 bb:text-yellow-800 bb:hover:bg-yellow-200': mainColor === 'yellow',
                        'bb:bg-red-50 bb:border-red-300 bb:text-red-700 bb:hover:bg-red-100': mainColor === 'red',
                    }"
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
import { isLinkItem, isMenuItem, itemColor, toMenuItems, warnsRemovedDanger } from "../menuItems.js";
import { withNavigation } from "../navigation.js";
import PopoverMenu from "./PopoverMenu.vue";

export default {
    components: {
        PopoverMenu,
    },

    mixins: [withLang, withNavigation, warnsRemovedDanger("DropdownButtonWithAction")],

    emits: ["update:modelValue"],

    props: {
        // Действия: первое — основная кнопка, остальные — пункты меню.
        // { label, href } — переход, { label, onSelect } — действие,
        // color: 'yellow' или 'red' — цвет.
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

    data() {
        return {
            // Последнее значение меню — из его событий и входящего значения:
            // меню, пропавшее вместе с последним действием, о закрытии
            // уже не сообщит.
            menuIsOpen: this.modelValue,
        };
    },

    computed: {
        items() {
            return toMenuItems(this.actions);
        },

        hasActions() {
            return this.items.length > 0;
        },

        mainAction() {
            return this.items[0];
        },

        // Цвет первого действия — цвет всей кнопки, вместе со стрелкой.
        mainColor() {
            return this.hasActions ? itemColor(this.mainAction) : null;
        },

        menuActions() {
            return this.items.slice(1);
        },

        hasMenu() {
            return this.menuActions.length > 0;
        },
    },

    watch: {
        modelValue(isOpen) {
            this.menuIsOpen = isOpen;
        },

        // Меню пропало вместе со всей кнопкой — действий не осталось:
        // PopoverMenu размонтирован и о закрытии открытого меню уже
        // не сообщит, сообщает кнопка. Меню, пропавшее при оставшейся
        // кнопке, о закрытии сообщает само. При одном действии меню нет,
        // и пропажа последнего действия ничего не закрывает.
        hasMenu(hasMenu) {
            if (!hasMenu && !this.hasActions && this.menuIsOpen) {
                this.menuIsOpen = false;
                this.$emit("update:modelValue", false);
            }
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

        // Слот button убран: основная кнопка — первое действие. Кнопка
        // проекта, который ещё передаёт разметку, молча потеряла бы своё
        // основное действие.
        if (process.env.NODE_ENV !== "production" && this.$slots.button) {
            console.warn("[dashboard-ui-components] DropdownButtonWithAction: слот button убран, основная кнопка — первый пункт actions");
        }
    },

    methods: {
        isLink(item) {
            return isLinkItem(item);
        },

        // Кнопка без функции onSelect по клику ничего не делает. Результат
        // onSelect возвращается обработчику клика: отклонённый Promise
        // асинхронного onSelect Vue передаёт в свой обработчик ошибок,
        // а без return отказ ушёл бы в unhandledrejection.
        select(item) {
            if (typeof item.onSelect === "function") {
                return item.onSelect();
            }
        },

        onMenuToggle(isOpen) {
            this.menuIsOpen = isOpen;
            this.$emit("update:modelValue", isOpen);
        },
    },
};
</script>
```

- [ ] **Step 6: Тесты проходят**

```bash
W=.superpowers/sdd/2026-10-09-dropdown-button-actions
npx vitest run tests/DropdownButtonWithAction.test.js tests/PopoverPanel.test.js tests/i18n.test.js tests/ssr.test.js tests/hydration.test.js tests/HamburgerMenu.test.js tests/utilityPrefix.test.js > $W/t2-green.log 2>&1; echo "exit $?"
grep -E "Test Files|Tests |×" $W/t2-green.log
```

Expected: `exit 0`, все семь файлов проходят; в `DropdownButtonWithAction.test.js` — 84 теста.

- [ ] **Step 7: Весь набор, сборка, коммит**

```bash
W=.superpowers/sdd/2026-10-09-dropdown-button-actions
npm test > $W/t2-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t2-suite.log
grep -ciE "warn|error|stderr" $W/t2-suite.log
npm run build > $W/t2-build.log 2>&1; echo "build exit $?"
git add src/menuItems.js src/components/PopoverMenu.vue src/components/DropdownButtonWithAction.vue tests/DropdownButtonWithAction.test.js tests/PopoverPanel.test.js tests/i18n.test.js tests/ssrFixtures.js tests/HamburgerMenu.test.js
git commit -m "feat: строить DropdownButtonWithAction из списка действий: первое — основная кнопка"
```

Expected: `tests exit 0`, `Tests  545 passed (545)`; `0`; `build exit 0`. Playground на этом шаге ещё передаёт слот `button` — он не рисуется; Playground переводится в Task 3.

---

### Task 3: Playground

**Files:**
- Modify: `playground/App.vue`
- Modify: `playground/shell.css` (убрать `.demo-action`)

**Interfaces:**
- Consumes: `DropdownButtonWithAction` из Task 2 (только проп `actions`, `v-model`, `lang`), `HamburgerMenu` с цветами из Task 1.
- Produces: демо раздела 8 спеки; коммит.

- [ ] **Step 1: Раздел `DropdownButtonWithAction`**

В `playground/App.vue` заменить раздел от `            <h2>DropdownButtonWithAction</h2>` до `            <p>Выбрано действий: {{ menuSelections }}</p>` включительно на:

```vue
            <h2>DropdownButtonWithAction</h2>
            <h3>Одно действие: кнопка без стрелки в цвете действия</h3>
            <div class="demo-row">
                <dropdown-button-with-action :actions="[{ label: 'Посмотреть', href: '#view' }]"/>
                <dropdown-button-with-action :actions="[{ label: 'Отправить заново', color: 'yellow', onSelect: countSelection }]"/>
                <dropdown-button-with-action :actions="[{ label: 'Delete', color: 'red', onSelect: countSelection }]"/>
            </div>

            <h3>Несколько действий: первое — кнопка, стрелка открывает остальные</h3>
            <div class="demo-row">
                <dropdown-button-with-action :actions="menuActions"/>
                <dropdown-button-with-action :actions="retryActions"/>
                <dropdown-button-with-action :actions="deleteActions"/>
                <dropdown-button-with-action
                    v-model="dropdownIsOpen"
                    :actions="[{ label: 'С v-model', onSelect: countSelection }, { label: 'Действие', onSelect: countSelection }]"
                />
            </div>
            <p>
                Меню с v-model: {{ dropdownIsOpen ? 'открыто' : 'закрыто' }}
                <button type="button" class="demo-button" @click="dropdownIsOpen = !dropdownIsOpen">Переключить снаружи</button>
            </p>
            <p>Выбрано действий: {{ menuSelections }}, последний переход: {{ lastNavigation || '—' }}</p>
```

- [ ] **Step 2: Ячейки таблиц и `lang="en"`**

В том же файле:

1. Меню в ячейке таблицы `page`:

```vue
                    <dropdown-button-with-action :actions="menuActions">
                        <template #button><span class="demo-action">Редактировать</span></template>
                    </dropdown-button-with-action>
```

→

```vue
                    <dropdown-button-with-action :actions="menuActions"/>
```

2. Меню в ячейке таблицы `card`:

```vue
                            <dropdown-button-with-action :actions="[{ label: 'Удалить', color: 'red', onSelect: countSelection }]">
                                <template #button><span class="demo-action">Редактировать</span></template>
                            </dropdown-button-with-action>
```

→

```vue
                            <dropdown-button-with-action :actions="[{ label: 'Редактировать', href: '#edit' }, { label: 'Удалить', color: 'red', onSelect: countSelection }]"/>
```

3. В разделе `lang="en"`:

```vue
            <dropdown-button-with-action lang="en" :actions="[{ label: 'Another action', onSelect: countSelection }]">
                <template #button><span class="demo-action">Action</span></template>
            </dropdown-button-with-action>
```

→

```vue
            <dropdown-button-with-action lang="en" :actions="[{ label: 'Action', onSelect: countSelection }, { label: 'Another action', onSelect: countSelection }]"/>
```

- [ ] **Step 3: Списки действий**

В `computed` заменить `menuActions` с комментарием над ним:

```js
        // Как меню страницы администраторов: переход и опасное действие.
        // Длинный пункт показывает перенос строки в меню шириной w-56.
        // Переход — по hash: в голом окружении без navigate страница
        // не уходит.
        menuActions() {
            return [
                { label: 'Поменять пароль', href: '#password' },
                { label: 'Отправить письмо с новым паролем на старый и новый адрес', onSelect: this.countSelection },
                { label: 'Удалить', color: 'red', onSelect: this.countSelection },
            ];
        },
```

на

```js
        // Как кнопка страницы администраторов: основная кнопка — переход,
        // в меню обычный, жёлтый и красный пункты. Длинный пункт показывает
        // перенос строки в меню шириной w-56. Переходы — по hash: в голом
        // окружении без navigate страница не уходит.
        menuActions() {
            return [
                { label: 'Редактировать', href: '#edit' },
                { label: 'Поменять пароль', href: '#password' },
                { label: 'Отправить письмо с новым паролем на старый и новый адрес', color: 'yellow', onSelect: this.countSelection },
                { label: 'Удалить', color: 'red', onSelect: this.countSelection },
            ];
        },

        // Как кнопка отправок certificates: основное действие — функция,
        // жёлтое.
        retryActions() {
            return [
                { label: 'Отправить заново', color: 'yellow', onSelect: this.countSelection },
                { label: 'Зафиксировать как неотправленное', onSelect: this.countSelection },
            ];
        },

        // Красное основное действие и переход в меню.
        deleteActions() {
            return [
                { label: 'Удалить', color: 'red', onSelect: this.countSelection },
                { label: 'Поменять пароль', href: '#password' },
            ];
        },
```

В `profileActions` перед `{ label: 'Выйти', onSelect: this.countProfileSelection },` добавить строку:

```js
                { label: 'Выйти на всех устройствах', color: 'yellow', onSelect: this.countProfileSelection },
```

а комментарий над `profileActions`

```js
        // Как меню профиля в шапке проектов: два перехода и выход действием.
        // Переходы — по hash, как у menuActions.
```

заменить на

```js
        // Как меню профиля в шапке проектов: два перехода и выход действием;
        // жёлтый пункт показывает цвет пунктов HamburgerMenu. Переходы —
        // по hash, как у menuActions.
```

- [ ] **Step 4: Убрать `.demo-action`**

В `playground/shell.css` удалить блок целиком (с комментарием):

```css
/* Содержимое слотов — разметка страницы, как у приложения, где в слоты
   кладутся ссылки с отступами. */
.demo-action {
    display: block;
    padding: 8px 16px;
    font-size: 14px;
}

```

- [ ] **Step 5: Проверка и коммит**

```bash
W=.superpowers/sdd/2026-10-09-dropdown-button-actions
grep -c "demo-action\|#button\|danger" playground/App.vue playground/shell.css
npm run build > $W/t3-build.log 2>&1 && npx vite build --config vite.playground.config.js --outDir $W/pg --emptyOutDir --base ./ >> $W/t3-build.log 2>&1; echo "build exit $?"
grep -ciE "warn|error" $W/t3-build.log
git add playground/App.vue playground/shell.css
git commit -m "docs: показать в playground кнопки из списка действий и цвета пунктов"
```

Expected: `playground/App.vue:0`, `playground/shell.css:0`; `build exit 0`; `0`.

---

### Task 4: README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: поведение Tasks 1–3.
- Produces: документация; коммит.

- [ ] **Step 1: Раздел `DropdownButtonWithAction`**

Заменить начало раздела — от `### DropdownButtonWithAction` до абзаца, начинающегося с «Событие: `update:modelValue`» (не включая его), — на:

````markdown
### DropdownButtonWithAction

Кнопка из списка действий `actions`. Первое действие — основная кнопка,
остальные — меню за стрелкой справа. Одно действие — кнопка без стрелки;
без действий компонент ничего не рисует.

    <dropdown-button-with-action
        v-model="menuIsOpen"
        :actions="[
            { label: 'Редактировать', href: route('user.edit', { user: row.getId() }) },
            { label: 'Поменять пароль', href: route('user.password.edit', { user: row.getId() }) },
            { label: 'Удалить', color: 'red', onSelect: () => prepareUserDelete(row) },
        ]"
    />

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `actions` | `Array` | `[]` | Действия, см. ниже |
| `modelValue` | `Boolean` | `false` | Открыто ли меню |
| `lang` | `String` | язык плагина | `"ru"` или `"en"` |

Действие — объект одной из двух форм: переход (`href` без `onSelect`) или
действие (`onSelect` без `href`). Поле со значением `undefined` считается
отсутствующим.

| Поле | Тип | Описание |
| --- | --- | --- |
| `label` | `String`, обязательно | Текст кнопки или пункта меню |
| `href` | `String` | Переход: обычный клик уходит в `navigate` плагина `dashboardUi`, клик с Cmd/Ctrl/Shift и средней кнопкой — браузеру; без `navigate` — обычная ссылка |
| `onSelect` | `Function` | Действие: вызывается без аргументов |
| `color` | `"yellow"` или `"red"` | Цвет; без поля — обычный |

Основная кнопка работает как пункт меню: переход — ссылка, действие —
кнопка, и `onSelect` вызывает сам компонент — по клику, Enter и пробелу.
Своего события клика у кнопки нет: странице не нужно ловить клик и
разбираться в разметке компонента.

Цвет первого действия красит основную кнопку вместе со стрелкой, цвет
пункта меню — только этот пункт. Обычная кнопка — белая с серой рамкой,
жёлтая и красная — светлый фон, рамка и текст своего цвета. Обычный пункт
меню — серый текст, при подсветке серый фон; жёлтый и красный — текст
своего цвета, при подсветке светлый фон того же цвета.

Неверный список Vue отмечает предупреждением о пропе в режиме разработки,
а компонент не падает: элементы-необъекты пропускает, кнопка без функции
`onSelect` по клику ничего не вызывает, пункт без неё только закрывает
меню. `null` — пустой список.

Вид кнопки и пунктов задаёт компонент: страница передаёт данные, а не
разметку, и классов не даёт. Слота `button` и поля `danger` нет с версии
0.15.0 — см. «Обновление с 0.14»; слота `actions` — с 0.14.0, см.
«Обновление с 0.13».

````

- [ ] **Step 2: `HamburgerMenu` и правило ссылок**

В разделе `HamburgerMenu` заменить

```markdown
Пункты, их проверка и вид — как у `DropdownButtonWithAction`: переход —
`{ label, href }`, действие — `{ label, onSelect }`, опасный пункт —
`danger: true`. Выход запросом DELETE — действие: Inertia пакет
не импортирует, `router.delete` вызывает страница.
```

на

```markdown
Пункты, их проверка и вид — как у `DropdownButtonWithAction`: переход —
`{ label, href }`, действие — `{ label, onSelect }`, цвет —
`color: 'yellow'` или `color: 'red'`. Выход запросом DELETE — действие:
Inertia пакет не импортирует, `router.delete` вызывает страница.
```

В «Правила API пакета» заменить `` `NavigationMenuElement` и пункты-переходы `DropdownButtonWithAction` и `` на `` `NavigationMenuElement`, основная кнопка-переход и пункты-переходы `DropdownButtonWithAction` и ``.

- [ ] **Step 3: «Обновление с 0.14»**

В разделе «Обновление с 0.14» перед пунктом, начинающимся с «- `0.15.0` не подтянется по `^0.14.0`», вставить:

````markdown
- `DropdownButtonWithAction` строится из списка действий: первое действие —
  основная кнопка, остальные — меню. Слота `button` нет: переданный слот
  не рисуется, а в режиме разработки в консоль уходит предупреждение.
  Отступы и шрифт основной кнопки задаёт компонент (`px-4 py-2 text-sm
  font-medium`). Было:

      <dropdown-button-with-action
          :actions="[
              { label: 'Поменять пароль', href: route('user.password.edit', { user: row.getId() }) },
              { label: 'Удалить', danger: true, onSelect: () => prepareUserDelete(row) },
          ]"
      >
          <template v-slot:button>
              <Link class="block px-4 py-2 text-sm font-medium text-gray-700" :href="route('user.edit', { user: row.getId() })">
                  Редактировать
              </Link>
          </template>
      </dropdown-button-with-action>

  Стало:

      <dropdown-button-with-action
          :actions="[
              { label: 'Редактировать', href: route('user.edit', { user: row.getId() }) },
              { label: 'Поменять пароль', href: route('user.password.edit', { user: row.getId() }) },
              { label: 'Удалить', color: 'red', onSelect: () => prepareUserDelete(row) },
          ]"
      />

- Кнопка без меню — одно действие. Было:

      <dropdown-button-with-action>
          <template v-slot:button>
              <Link class="block px-4 py-2 text-sm font-medium text-gray-700" :href="showGroupLink(row)">
                  Посмотреть
              </Link>
          </template>
      </dropdown-button-with-action>

  Стало:

      <dropdown-button-with-action :actions="[{ label: 'Посмотреть', href: showGroupLink(row) }]" />

- Основное действие-функция больше не ловится на корне компонента:
  `onSelect` первого действия вызывает сам компонент — по клику, Enter и
  пробелу. Было:

      <dropdown-button-with-action
          :actions="[{ label: 'Зафиксировать как неотправленное', onSelect: () => askUnsent(row) }]"
          v-on:click="retryFromDropdown($event, row)"
      >
          <template v-slot:button>
              <span class="block px-2 py-1 text-sm text-gray-700">Отправить заново</span>
          </template>
      </dropdown-button-with-action>

      retryFromDropdown(event, sms) {
          if (event.currentTarget.firstElementChild.contains(event.target)) {
              this.askRetry(sms);
          }
      },

  Стало:

      <dropdown-button-with-action
          :actions="[
              { label: 'Отправить заново', onSelect: () => askRetry(row) },
              { label: 'Зафиксировать как неотправленное', onSelect: () => askUnsent(row) },
          ]"
      />

  `retryFromDropdown` удаляется: он полагался на разметку пакета.
- Поле `danger` заменено цветом: `danger: true` → `color: 'red'`. Пункт
  с `danger` рисуется обычным, а в режиме разработки в консоль уходит
  предупреждение с заменой. Новый цвет — `color: 'yellow'`. Цвета есть
  и у пунктов `HamburgerMenu`.
- Красный пункт меню — мягкий: красный текст, при подсветке светлый
  красный фон, а не заливка `red-400` с белым текстом.
````

- [ ] **Step 4: Проверка и коммит**

```bash
grep -n "danger" README.md
git add README.md
git commit -m "docs: описать DropdownButtonWithAction из списка действий и цвета пунктов в README"
```

Expected: `danger` встречается только в разделах «Обновление с 0.14» (замена `danger: true` → `color: 'red'` и «Было») и «Обновление с 0.13».

---

### Task 5: Приёмка в браузерах

**Files:**
- Временно: `/Users/boobooking/Code/mars/certificates/src/public/build/ui-playground/` (удаляется в конце задачи)

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: подтверждение вида и поведения; коммитов нет.

- [ ] **Step 1: Сборка и выкладка**

```bash
npm run build && npx vite build --config vite.playground.config.js --outDir /Users/boobooking/Code/mars/certificates/src/public/build/ui-playground --emptyOutDir --base ./; echo "build exit $?"
for p in index.html host.html; do curl -sk -o /dev/null -w "$p %{http_code}\n" https://certificates.test/build/ui-playground/$p; done
```

Expected: `build exit 0`, обе страницы `200`. Сборка certificates очищает `build/` целиком: перед каждым сообщением владельцу со ссылкой — снова проверить `200`, при `404` выложить заново.

- [ ] **Step 2: Chrome, Playground (`index.html`) и окружение приложения (`host.html`)**

`DropdownButtonWithAction`:

- три одиночные кнопки — обычная, жёлтая, красная — без стрелки, скруглены с обеих сторон, цвета — по одобренной мягкой схеме;
- кнопки со стрелкой: основная часть и стрелка одного цвета и одной высоты, граница между ними — цвета рамки;
- меню: обычный, жёлтый и красный пункты; подсветка стрелками и мышью — серым, светло-жёлтым и светло-красным фоном;
- основная кнопка-переход: клик меняет «последний переход», Cmd-клик открывает новую вкладку;
- основная кнопка-действие: клик, а с клавиатуры Tab до кнопки и Enter, Tab и пробел — каждый раз +1 к «Выбрано действий»;
- Tab доходит до основной кнопки и до стрелки, кольцо фокуса видно на обеих, на всех трёх цветах;
- меню: открытие, стрелки, Enter, Escape, клик вне, `v-model` и «Переключить снаружи» — как раньше;
- ячейки таблиц: «Редактировать» со стрелкой, меню открывается.

`HamburgerMenu`: жёлтый пункт «Выйти на всех устройствах», подсветка светло-жёлтым.

Консоль без ошибок и предупреждений в обоих окружениях.

- [ ] **Step 3: Safari — владелец**

Попросить владельца проверить те же пункты в его Safari на `https://certificates.test/build/ui-playground/index.html` (ссылку перед сообщением проверить, Step 1), отдельно — Tab, Enter и пробел на основной кнопке-действии и кольцо фокуса. Заодно — место панелей после итогового ревью плана Popover API: список и календарь в правой половине окна открываются левым краем по полю, если помещаются; в нижней половине — вниз, если помещаются; меню у нижнего края — вверх. Дождаться ответа. Найденную ошибку — по superpowers:systematic-debugging с тестом, который сначала падает.

- [ ] **Step 4: Убрать сборку**

```bash
rm -rf /Users/boobooking/Code/mars/certificates/src/public/build/ui-playground && /bin/ls /Users/boobooking/Code/mars/certificates/src/public/build
```

Expected: `assets`, `manifest.json`.

---

### Task 6: Итоговое ревью

Независимое ревью коммитов этого плана до коммита с версией.

**Files:**
- Изменяются только файлы, которых касаются исправления.

**Interfaces:**
- Consumes: коммиты Tasks 1–4 и результат Task 5.
- Produces: ветка без замечаний Critical и Important; список отложенных Minor для владельца.

- [ ] **Step 1: Пакет ревью**

```bash
W=.superpowers/sdd/2026-10-09-dropdown-button-actions
BASE=$(git log --format=%h -1 -- docs/superpowers/plans/2026-10-09-dropdown-button-actions.md)
git log --oneline $BASE..HEAD
```

Пакет — скриптом superpowers `subagent-driven-development/scripts/review-package docs/superpowers/plans/2026-10-09-dropdown-button-actions.md $BASE HEAD`. Ревьюеру указать, что коммиты ветки до `$BASE` (HamburgerMenu и Popover API) уже прошли свои ревью.

- [ ] **Step 2: Ревьюер**

Свежий ревьюер на самой сильной доступной модели (модель указывается явно) по `superpowers:requesting-code-review` (`code-reviewer.md`): пакет ревью, спека, этот план, раздел Review Focus дословно, решения из журнала исполнения (строки `Ruling:`).

- [ ] **Step 3: Разбор и исправления**

Каждое замечание переоценивается по тому, что получит человек, если ветка выйдет как есть. Critical и Important — исправления, каждое отдельно: тест, который сначала падает; исправление; весь набор:

```bash
W=.superpowers/sdd/2026-10-09-dropdown-button-actions
npm test > $W/t6-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t6-suite.log
grep -ciE "warn|error|stderr" $W/t6-suite.log
```

Expected: `tests exit 0`, всё passed, `0`. Коммит на каждое исправление. Minor — в список отложенных для владельца. Исправление, видимое в браузере, — повторить затронутые пункты Task 5 в Chrome и у владельца в Safari.

---

### Task 7: Версия `0.15.0`

Закрывает и Task 12 плана `docs/superpowers/plans/2026-10-08-popover-dropdowns.md`, и отложенную Task 8 плана `docs/superpowers/plans/2026-10-08-hamburger-menu.md`.

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Поднять версию**

Run: `npm version 0.15.0 --no-git-tag-version && git diff | grep -E "^[-+].*version"`
Expected: три строки `0.14.0` → `0.15.0`.

- [ ] **Step 2: Финальная проверка**

```bash
W=.superpowers/sdd/2026-10-09-dropdown-button-actions
npm test > $W/t7-test.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t7-test.log
grep -ciE "warn|error|stderr" $W/t7-test.log
npm run build > $W/t7-build.log 2>&1; echo "build exit $?"
grep -E "built|error" $W/t7-build.log
```

Expected: `tests exit 0`, всё passed, `0`, `build exit 0`, `✓ built`.

- [ ] **Step 3: Коммит и журналы**

```bash
git add package.json package-lock.json
git commit -m "chore: поднять версию пакета до 0.15.0"
```

В журналах планов `2026-10-08-popover-dropdowns` (Task 12) и `2026-10-08-hamburger-menu` (Task 8) отметить, что версия поднята этим коммитом.

---

## Отличия от спеки

- Предупреждение о `danger` — примесь `warnsRemovedDanger(componentName)` в `src/menuItems.js`, общая для `DropdownButtonWithAction` и `HamburgerMenu`; спека §6 называет только модуль.
- `itemColor` возвращает обычный цвет и для пункта с `danger`, даже если у него есть `color`: спека §4.6 обещает такому пункту обычный вид.
- `isLinkItem` переезжает из метода `PopoverMenu` в `src/menuItems.js`: тем же правилом пользуется основная кнопка. Метод `isLink` в `PopoverMenu` остаётся и зовёт `isLinkItem`.
- Действий не осталось при открытом меню: `PopoverPanel` при размонтировании о закрытии не сообщает, поэтому `DropdownButtonWithAction` помнит последнее значение меню (`menuIsOpen`) и, когда меню пропадает вместе со всей кнопкой (наблюдатель `hasMenu`), сообщает о закрытии сам (спека §4.3 называет поведение, но не способ). Меню, пропавшее при оставшейся кнопке, сообщает о закрытии через `PopoverPanel`, как раньше.
- У основной кнопки `bb:cursor-pointer`, как у пунктов меню; спека §5 курсор не называет.
- Ожидаемые числа тестов в задачах посчитаны заранее; если исполнитель получит другое — сверить, откуда разница, и записать решение в журнал.

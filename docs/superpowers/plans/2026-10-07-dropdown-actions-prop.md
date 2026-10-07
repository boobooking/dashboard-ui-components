# DropdownButtonWithAction: пункты меню данными — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** пункты меню `DropdownButtonWithAction` приходят пропом `actions` (данные), а вид пунктов целиком задаёт библиотека; слот `actions` убран.

**Architecture:** компонент рисует каждый пункт сам: переход — `<a href>` через существующий `withNavigation`, действие — `<button type="button">`. Валидатор пропа предупреждает о неверных пунктах, а компонент не падает ни на каком значении. Клавиатура и мышь уже работают через `moveMenuFocus` (`src/menuFocus.js`) по `a[href]` и `button` меню — их не трогаем.

**Tech Stack:** Vue 3.5 (Options API, SFC), Tailwind v4 с префиксом `bb:`, Vite 8 (library mode), vitest 5 + happy-dom + @vue/test-utils, Popover API (в тестах — `tests/popoverStub.js`).

**Spec:** `docs/superpowers/specs/2026-10-07-dropdown-actions-prop-design.md`

## Global Constraints

- Ветка `fix/keyboard-navigation`; версия пакета в `package.json` — `0.13.0` до последней задачи, затем `0.14.0` последним коммитом.
- Проп `actions`: `type: Array`, `default: () => []`; поля пункта — ровно `label`, `href`, `onSelect`, `danger`.
- Поле отсутствует, если его значение `undefined`; любое другое значение, включая `null`, — поле есть.
- Допустимые формы пункта: переход — `href` непустая строка и `onSelect` отсутствует; действие — `onSelect` функция и `href` отсутствует.
- Текст предупреждения о слоте — дословно: `[dashboard-ui-components] DropdownButtonWithAction: слот actions убран, пункты меню передаются пропом actions`, только при `process.env.NODE_ENV !== "production"`.
- Классы пунктов — дословно из спеки §5.4: общие `bb:block bb:w-full bb:px-4 bb:py-2 bb:text-sm bb:text-left bb:cursor-pointer bb:focus:outline-hidden`; обычный `bb:text-gray-700 bb:focus:bg-gray-100 bb:focus:text-gray-900`; `danger` `bb:bg-red-400 bb:text-white bb:focus:bg-red-500`; стилей `hover:` нет.
- Каждый класс в шаблоне — с префиксом `bb:`, а `:class` — только литералы (строка, тернарник, объект со строковыми ключами, массив): это проверяет `tests/utilityPrefix.test.js`, метод в `:class` его роняет.
- Стиль кода: в `.vue` — двойные кавычки и точки с запятой; в `.js` тестов — одинарные кавычки без точек с запятой; отступ 4 пробела; комментарии по-русски, описывают код как он есть.
- Вывод `npm test` чистый: ни одного предупреждения или ошибки; ожидаемые предупреждения перехватываются в тестах.
- Полный набор — один прогон с логом и проверкой кода завершения: `npm test > /private/tmp/dbwa-test.log 2>&1; echo "exit $?"`, итоги и шум — `grep` по логу. Не строить цепочки вида `npm test | grep … && …`: без `pipefail` код цепочки — это код `grep`, и следующий шаг пошёл бы при упавших тестах.
- Коммиты — conventional commits по-русски, повелительное наклонение, без служебных строк; `--no-verify` запрещён.

## Review Focus

- Список пунктов опустел, пока меню открыто (строка потеряла действия после обновления данных): ждём, что стрелки снова прокручивают страницу и родитель по `v-model` узнаёт о закрытии — браузер при удалении открытого popover не присылает `toggle`. Тест — Task 1.
- Список пунктов заменили, пока меню открыто: ждём новые пункты сразу и стрелки по новым пунктам. Тест — Task 1.
- Клик по переходу с Cmd/Ctrl: ждём, что переход остаётся браузеру (новая вкладка), а меню всё равно закрывается. Тест — Task 1.
- `onSelect` бросил исключение: ждём, что ошибка уходит в обработчик ошибок Vue, а меню не остаётся открытым поверх страницы. Тест — Task 2.
- Длинный `label` в меню шириной `bb:w-56`: ждём перенос строки внутри пункта без выхода за меню. Проверка — в браузере, Task 6 (пункт с длинным текстом добавляется в playground в Task 4).

---

### Task 1: Пункты меню из пропа `actions`

Проп, разметка пунктов, закрытие, переходы через `navigate`, стрелка по числу пунктов; перевод всех тестов со слота `actions` на проп.

**Files:**
- Modify: `src/components/DropdownButtonWithAction.vue`
- Modify: `tests/DropdownButtonWithAction.test.js`
- Modify: `tests/i18n.test.js:88` и `tests/i18n.test.js:134`
- Modify: `tests/ssrFixtures.js:22`

**Interfaces:**
- Consumes: `withNavigation` из `src/navigation.js` (метод `followLink(event, href)`), `withLang` из `src/lang.js`, `moveMenuFocus` из `src/menuFocus.js` (уже подключён).
- Produces: проп `actions`; computed `actionItems` (массив, по которому рисуются пункты) и `hasActions` (`boolean`); методы `isLink(item)` → `boolean` и `select(item)`. Task 2 меняет тела `actionItems`, `isLink` и `select` и добавляет валидатор; Task 3 дополняет `created`.

- [ ] **Step 1: Перевести существующие тесты на проп**

В `tests/DropdownButtonWithAction.test.js`:

1. Импорт плагина — после строки `import DropdownButtonWithAction from '../src/components/DropdownButtonWithAction.vue'`:

```js
import { dashboardUi } from '../src/plugin.js'
```

2. Заменить

```js
const slots = {
    button: () => h('span', 'Редактировать'),
    actions: () => h('a', { href: '#', class: 'item' }, 'Удалить'),
}
```

на

```js
const slots = {
    button: () => h('span', 'Редактировать'),
}

// Одно действие: большинству тестов нужен только факт, что пункт есть.
const actions = [{ label: 'Удалить', onSelect: () => {} }]
```

3. В `Rows.render` заменить

```js
                key: row,
                'data-row': row,
```

на

```js
                key: row,
                'data-row': row,
                actions,
```

4. Механические замены:

```bash
sed -i '' 's/{ attachTo: document.body, slots })/{ attachTo: document.body, slots, props: { actions } })/' tests/DropdownButtonWithAction.test.js
sed -i '' -E 's/props: \{ modelValue: (true|false) \},/props: { modelValue: \1, actions },/' tests/DropdownButtonWithAction.test.js
sed -i '' "s/get('.item')/get('[role=\"menuitem\"]')/" tests/DropdownButtonWithAction.test.js
sed -i '' 's/slots: twoActions })/slots, props: { actions: twoActions } })/' tests/DropdownButtonWithAction.test.js
```

Тест «без действий стрелки и панели нет» (`slots: { button: slots.button }`) не трогать: пунктов у него нет, так и должно остаться.

5. В тесте «toggle, пришедший после размонтирования…» заменить

```js
            attachTo: document.body,
            slots,
            global: { config: { errorHandler: (error) => errors.push(error) } },
```

на

```js
            attachTo: document.body,
            slots,
            props: { actions },
            global: { config: { errorHandler: (error) => errors.push(error) } },
```

6. В `describe('DropdownButtonWithAction: стрелки'` заменить

```js
    const twoActions = {
        button: () => h('span', 'Редактировать'),
        actions: () => [
            h('a', { href: '#', role: 'menuitem' }, 'Поменять пароль'),
            h('a', { href: '#', role: 'menuitem' }, 'Удалить'),
        ],
    }
```

на

```js
    // Переход и действие: стрелки ходят и по ссылкам, и по кнопкам.
    const twoActions = [
        { label: 'Поменять пароль', href: '#password' },
        { label: 'Удалить', danger: true, onSelect: () => {} },
    ]
```

7. Проверка, что слота `actions` в файле не осталось: `grep -n "actions: ()" tests/DropdownButtonWithAction.test.js` — пусто.

В `tests/i18n.test.js` строку 88

```js
                slots: { button: 'Основное', actions: '<a href="#">Действие</a>' },
```

заменить на

```js
                slots: { button: 'Основное' },
                props: { actions: [{ label: 'Действие', href: '#' }] },
```

и в строке 134 заменить фрагмент

```js
props: { lang: 'de' }, slots: { button: 'Основное', actions: '<a href="#">Действие</a>' },
```

на

```js
props: { lang: 'de', actions: [{ label: 'Действие', href: '#' }] }, slots: { button: 'Основное' },
```

В `tests/ssrFixtures.js` строку

```js
    DropdownButtonWithAction: { slots: { button: () => 'Действие', actions: () => h('a', { href: '#' }, 'Другое действие') } },
```

заменить на

```js
    DropdownButtonWithAction: { props: { actions: [{ label: 'Другое действие', href: '#' }] }, slots: { button: () => 'Действие' } },
```

- [ ] **Step 2: Написать новые падающие тесты**

В конец `tests/DropdownButtonWithAction.test.js`:

```js
describe('DropdownButtonWithAction: пункты из пропа actions', () => {
    const navigation = []
    const inApp = { plugins: [[dashboardUi, { navigate: (href) => navigation.push(href) }]] }

    beforeEach(() => {
        navigation.length = 0
    })

    function itemsOf(wrapper) {
        return menuOf(wrapper).findAll('[role="menuitem"]')
    }

    function press(key) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
        document.activeElement.dispatchEvent(event)
        return event
    }

    async function openMenu(wrapper) {
        await arrowOf(wrapper).trigger('click')
        await settle()
    }

    it('переход рисуется ссылкой, действие — кнопкой', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots,
            props: { actions: [{ label: 'Поменять пароль', href: '#password' }, { label: 'Удалить', danger: true, onSelect: () => {} }] },
        })

        const [link, button] = itemsOf(wrapper)
        expect(link.element.tagName).toBe('A')
        expect(link.attributes('href')).toBe('#password')
        expect(link.text()).toBe('Поменять пароль')
        expect(button.element.tagName).toBe('BUTTON')
        expect(button.attributes('type')).toBe('button')
        expect(button.text()).toBe('Удалить')
    })

    it('клик по действию вызывает onSelect один раз без аргументов и закрывает меню', async () => {
        const onSelect = vi.fn()
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions: [{ label: 'Удалить', onSelect }] } })
        await openMenu(wrapper)

        await itemsOf(wrapper)[0].trigger('click')
        await settle()

        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(onSelect).toHaveBeenCalledWith()
        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('клик по переходу уходит в navigate плагина и закрывает меню', async () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots,
            props: { actions: [{ label: 'Поменять пароль', href: '#password' }] },
            global: inApp,
        })
        await openMenu(wrapper)

        await itemsOf(wrapper)[0].trigger('click')
        await settle()

        expect(navigation).toEqual(['#password'])
        expect(isOpen(wrapper)).toBe(false)
    })

    it('клик по переходу с Cmd остаётся браузеру, а меню закрывается', async () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots,
            props: { actions: [{ label: 'Поменять пароль', href: '#password' }] },
            global: inApp,
        })
        await openMenu(wrapper)

        await itemsOf(wrapper)[0].trigger('click', { metaKey: true })
        await settle()

        expect(navigation).toEqual([])
        expect(isOpen(wrapper)).toBe(false)
    })

    it.each([
        { name: 'пустой список', value: [] },
        { name: 'null', value: null },
    ])('$name — стрелки и меню нет, предупреждений нет', ({ value }) => {
        const warnings = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots,
            props: { actions: value },
            global: { config: { warnHandler: (message) => warnings.push(message) } },
        })

        expect(arrowOf(wrapper)).toBeUndefined()
        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
        expect(warnings).toEqual([])
    })

    it('новый список при открытом меню виден сразу, и стрелки ходят по нему', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions: [{ label: 'Старый', onSelect: () => {} }] } })
        await openMenu(wrapper)

        await wrapper.setProps({ actions: [{ label: 'Первый новый', onSelect: () => {} }, { label: 'Второй новый', onSelect: () => {} }] })
        arrowOf(wrapper).element.focus()
        press('ArrowUp')

        expect(itemsOf(wrapper).map((item) => item.text())).toEqual(['Первый новый', 'Второй новый'])
        expect(document.activeElement.textContent).toBe('Второй новый')
    })

    // Браузер, удаляя открытый popover из документа, toggle не присылает:
    // слушатели снимает и о закрытии сообщает сам компонент.
    it('список опустел при открытом меню: стрелки снова прокручивают страницу, родитель узнаёт о закрытии', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions } })
        await openMenu(wrapper)

        await wrapper.setProps({ actions: [] })
        await settle()

        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })

    // Наблюдатель modelValue срабатывает до рендера: если пункты и открытие
    // пришли разом, меню в этот момент ещё нет в DOM.
    it('пункты и открытие пришли одновременно — меню открыто, ответного события нет', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { modelValue: false, actions: [] } })

        await wrapper.setProps({ actions, modelValue: true })
        await settle()

        expect(isOpen(wrapper)).toBe(true)
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
})
```

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `npx vitest run tests/DropdownButtonWithAction.test.js tests/i18n.test.js tests/ssr.test.js tests/hydration.test.js`
Expected: FAIL — у компонента нет пропа `actions`, без слота нет стрелки: `arrowOf(wrapper)` даёт `undefined` («Cannot read properties of undefined»), i18n не находит «Open menu», новые тесты не находят пунктов.

- [ ] **Step 4: Реализация в компоненте**

В `src/components/DropdownButtonWithAction.vue`:

1. В шаблоне заменить `:class="{ 'bb:rounded-r-md': !$slots.actions }"` на `:class="{ 'bb:rounded-r-md': !hasActions }"` и `<span class="bb:-ml-px bb:relative bb:block" v-if="$slots.actions">` на `<span class="bb:-ml-px bb:relative bb:block" v-if="hasActions">`.

2. В шаблоне заменить `<slot name="actions"></slot>` на

```html
                <!-- Вид пунктов задаёт только компонент: страница передаёт
                     данные, а не разметку. Подсветка — фокус, его ставят и
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
```

3. Импорт — после `import { withLang } from "../lang.js";`:

```js
import { withNavigation } from "../navigation.js";
```

и `mixins: [withLang],` заменить на `mixins: [withLang, withNavigation],`.

4. В `props` перед `modelValue` добавить:

```js
        // Пункты меню: { label, href } — переход, { label, onSelect } —
        // действие, danger: true — опасный пункт.
        actions: {
            type: Array,
            default: () => [],
        },
```

5. Между `data()` и `watch` добавить:

```js
    computed: {
        // null — пустой список: компонент не падает на null.
        actionItems() {
            return this.actions ?? [];
        },

        hasActions() {
            return this.actionItems.length > 0;
        },
    },
```

6. В `watch` после наблюдателя `modelValue` добавить:

```js
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
```

7. В `methods` перед `applyMenuState` добавить:

```js
        isLink(item) {
            return item.href !== undefined;
        },

        select(item) {
            item.onSelect();
        },
```

- [ ] **Step 5: Убедиться, что тесты проходят**

Run: `npx vitest run tests/DropdownButtonWithAction.test.js tests/i18n.test.js tests/ssr.test.js tests/hydration.test.js tests/utilityPrefix.test.js`
Expected: PASS, без предупреждений в выводе.

Run (полный набор — по правилу Global Constraints, один прогон с логом):

```bash
npm test > /private/tmp/dbwa-test.log 2>&1; echo "exit $?"
grep -E "Test Files|Tests " /private/tmp/dbwa-test.log
grep -ciE "warn|error|stderr" /private/tmp/dbwa-test.log
```

Expected: `exit 0`; все файлы и тесты passed; `0`.

- [ ] **Step 6: Коммит**

```bash
git add src/components/DropdownButtonWithAction.vue tests/DropdownButtonWithAction.test.js tests/i18n.test.js tests/ssrFixtures.js
git commit -m "feat: передавать пункты меню DropdownButtonWithAction пропом actions"
```

---

### Task 2: Проверка пунктов и устойчивость к неверным

Валидатор формы пунктов; компонент не падает ни на каком значении `actions`.

**Files:**
- Modify: `src/components/DropdownButtonWithAction.vue`
- Test: `tests/DropdownButtonWithAction.test.js`

**Interfaces:**
- Consumes: из Task 1 — проп `actions`, computed `actionItems`, `hasActions`, методы `isLink(item)`, `select(item)`.
- Produces: функция `isAction(item)` → `boolean` в модуле компонента (не экспортируется); новые тела `actionItems`, `isLink`, `select`.

- [ ] **Step 1: Написать падающие тесты**

В конец `tests/DropdownButtonWithAction.test.js`:

```js
describe('DropdownButtonWithAction: проверка пунктов', () => {
    const fn = () => {}
    const VALIDATOR_WARNING = 'Invalid prop: custom validator check failed for prop "actions"'

    function mountChecked(value) {
        const warnings = []
        const errors = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots,
            props: { actions: value },
            global: {
                config: {
                    warnHandler: (message) => warnings.push(message),
                    errorHandler: (error) => errors.push(error),
                },
            },
        })

        return { wrapper, warnings, errors }
    }

    it.each([
        { name: 'элемент null', item: null },
        { name: 'элемент-строка', item: 'Удалить' },
        { name: 'нет label', item: { onSelect: fn } },
        { name: 'пустой label', item: { label: '', onSelect: fn } },
        { name: 'ни href, ни onSelect', item: { label: 'Удалить' } },
        { name: 'пустой href', item: { label: 'Открыть', href: '' } },
        { name: 'оба верных поля', item: { label: 'Открыть', href: '#open', onSelect: fn } },
        { name: 'href и onSelect-строка', item: { label: 'Открыть', href: '#open', onSelect: 'ошибка' } },
        { name: 'пустой href и onSelect', item: { label: 'Удалить', href: '', onSelect: fn } },
        { name: 'href null и onSelect', item: { label: 'Удалить', href: null, onSelect: fn } },
        { name: 'onSelect-строка без href', item: { label: 'Удалить', onSelect: 'ошибка' } },
        { name: 'danger-строка', item: { label: 'Удалить', danger: 'да', onSelect: fn } },
    ])('неверный пункт ($name) — предупреждение Vue', ({ item }) => {
        const { warnings } = mountChecked([{ label: 'Верный', onSelect: fn }, item])

        expect(warnings.some((message) => message.includes(VALIDATOR_WARNING))).toBe(true)
    })

    it.each([
        { name: 'переход', item: { label: 'Открыть', href: '#open' } },
        { name: 'действие', item: { label: 'Удалить', onSelect: fn } },
        { name: 'переход с danger', item: { label: 'Открыть', href: '#open', danger: true } },
        { name: 'действие с danger: false', item: { label: 'Удалить', danger: false, onSelect: fn } },
        { name: 'поле со значением undefined', item: { label: 'Открыть', href: '#open', onSelect: undefined } },
    ])('верный пункт ($name) — без предупреждений', ({ item }) => {
        const { warnings } = mountChecked([item])

        expect(warnings).toEqual([])
    })

    it('неверные пункты не роняют компонент ни при рендере, ни при клике', async () => {
        const { wrapper, errors } = mountChecked([
            null,
            'строка',
            { label: 'A', onSelect: 'ошибка' },
            { label: 'B', href: 42 },
            { label: 'C', href: '#c', onSelect: 'ошибка' },
        ])
        const rendered = () => menuOf(wrapper).findAll('[role="menuitem"]')

        expect(rendered().map((item) => [item.element.tagName, item.text()])).toEqual([['BUTTON', 'A'], ['BUTTON', 'B'], ['A', 'C']])

        for (const index of [0, 1, 2]) {
            await arrowOf(wrapper).trigger('click')
            await settle()
            await rendered()[index].trigger('click')
            await settle()
            expect(isOpen(wrapper)).toBe(false)
        }
        expect(errors).toEqual([])
    })

    it('список из одних необъектов — без стрелки', () => {
        const { wrapper, errors } = mountChecked([null, 'строка'])

        expect(arrowOf(wrapper)).toBeUndefined()
        expect(errors).toEqual([])
    })

    it('не массив — без стрелки и без ошибок', () => {
        const { wrapper, errors } = mountChecked('Удалить')

        expect(arrowOf(wrapper)).toBeUndefined()
        expect(errors).toEqual([])
    })

    it('onSelect, бросивший исключение, отдаёт ошибку Vue и не оставляет меню открытым', async () => {
        const failure = new Error('сбой обработчика')
        const { wrapper, errors } = mountChecked([{ label: 'Удалить', onSelect: () => { throw failure } }])
        await arrowOf(wrapper).trigger('click')
        await settle()

        await menuOf(wrapper).get('[role="menuitem"]').trigger('click')
        await settle()

        expect(errors).toEqual([failure])
        expect(isOpen(wrapper)).toBe(false)
    })

    // Vue передаёт в errorHandler отклонённый Promise, только если обработчик
    // клика его вернул; иначе отказ уходит в unhandledrejection.
    it('асинхронный onSelect с отказом отдаёт ошибку Vue, а меню закрывается сразу', async () => {
        const failure = new Error('сбой асинхронного обработчика')
        const { wrapper, errors } = mountChecked([{ label: 'Удалить', onSelect: async () => { throw failure } }])
        await arrowOf(wrapper).trigger('click')
        await settle()

        menuOf(wrapper).get('[role="menuitem"]').element.click()
        expect(isOpen(wrapper)).toBe(false)

        await settle()
        expect(errors).toEqual([failure])
    })
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run tests/DropdownButtonWithAction.test.js`
Expected: FAIL — таблица неверных пунктов не находит предупреждения валидатора (его нет); «неверные пункты не роняют компонент» и «список из одних необъектов» падают: `errors` содержит `TypeError` (обращение к `href` у `null`, вызов строки `onSelect`); «не массив» — `TypeError` или стрелка есть; «асинхронный onSelect с отказом» — `errors` пуст, а vitest сообщает о необработанном отказе Promise (`Unhandled Rejection`): `select` из Task 1 результат `onSelect` не возвращает. Тесты верных пунктов и «onSelect, бросивший исключение» проходят уже сейчас: первые — потому что валидатора нет, второй закрепляет поведение Vue (ошибка обработчика уходит в `errorHandler`, всплытие клика до меню продолжается).

- [ ] **Step 3: Реализация**

В `src/components/DropdownButtonWithAction.vue`:

1. После константы `MENU_WIDTH` добавить:

```js
// Пункт меню — ровно одна из двух форм: переход (href без onSelect) или
// действие (onSelect без href). Поле отсутствует, если оно undefined.
function isAction(item) {
    if (typeof item !== "object" || item === null) {
        return false;
    }

    if (typeof item.label !== "string" || item.label === "") {
        return false;
    }

    if (item.danger !== undefined && typeof item.danger !== "boolean") {
        return false;
    }

    const isLink = typeof item.href === "string" && item.href !== "" && item.onSelect === undefined;
    const isCommand = typeof item.onSelect === "function" && item.href === undefined;

    return isLink || isCommand;
}
```

2. В пропе `actions` после `default: () => [],` добавить:

```js
            validator: (value) => value.every(isAction),
```

3. Заменить computed `actionItems`:

```js
        // Валидатор только предупреждает и данные не исправляет, поэтому
        // компонент не падает ни на каком значении: не массив — пустой
        // список, элементы-необъекты пропускаются.
        actionItems() {
            if (!Array.isArray(this.actions)) {
                return [];
            }

            return this.actions.filter((item) => typeof item === "object" && item !== null);
        },
```

4. Заменить методы `isLink` и `select`:

```js
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
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx vitest run tests/DropdownButtonWithAction.test.js`
Expected: PASS.

Run:

```bash
npm test > /private/tmp/dbwa-test.log 2>&1; echo "exit $?"
grep -E "Test Files|Tests " /private/tmp/dbwa-test.log
grep -ciE "warn|error|stderr" /private/tmp/dbwa-test.log
```

Expected: `exit 0`; все файлы и тесты passed; `0`.

- [ ] **Step 5: Мутационная проверка**

Изменения задачи ещё не закоммичены, поэтому откат — из копии, а не через git (`git checkout` стёр бы реализацию). Перед мутациями: `cp src/components/DropdownButtonWithAction.vue /private/tmp/dbwa-task2.vue`; после каждой: `cp /private/tmp/dbwa-task2.vue src/components/DropdownButtonWithAction.vue`; в конце: `cmp /private/tmp/dbwa-task2.vue src/components/DropdownButtonWithAction.vue && rm /private/tmp/dbwa-task2.vue`. По очереди внести:
- в `isAction` убрать `&& item.onSelect === undefined` — должен упасть тест «href и onSelect-строка»;
- в `isAction` убрать `&& item.href === undefined` — должны упасть «пустой href и onSelect» и «href null и onSelect»;
- в `select` убрать проверку `typeof` — должен упасть «неверные пункты не роняют компонент»;
- в `select` убрать `return` — должен упасть «асинхронный onSelect с отказом».

Run после каждой мутации: `npx vitest run tests/DropdownButtonWithAction.test.js` — Expected: FAIL названного теста. После отката — PASS.

- [ ] **Step 6: Коммит**

```bash
git add src/components/DropdownButtonWithAction.vue tests/DropdownButtonWithAction.test.js
git commit -m "feat: проверять пункты меню DropdownButtonWithAction и не падать на неверных"
```

---

### Task 3: Предупреждение об убранном слоте `actions`

**Files:**
- Modify: `src/components/DropdownButtonWithAction.vue` (`created`)
- Test: `tests/DropdownButtonWithAction.test.js`

**Interfaces:**
- Consumes: хук `created` компонента (в нём уже `this.stopClosing = null` и `this.stopArrows = null`).
- Produces: `console.warn` с текстом из Global Constraints.

- [ ] **Step 1: Написать падающие тесты**

В конец `tests/DropdownButtonWithAction.test.js`:

```js
describe('DropdownButtonWithAction: убранный слот actions', () => {
    const MESSAGE = '[dashboard-ui-components] DropdownButtonWithAction: слот actions убран, пункты меню передаются пропом actions'
    let warn

    beforeEach(() => {
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
        warn.mockRestore()
        vi.unstubAllEnvs()
    })

    const withSlot = { ...slots, actions: () => h('a', { href: '#', class: 'from-slot' }, 'Из слота') }

    it('переданный слот не рисуется, а в консоль уходит предупреждение', () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots: withSlot })

        expect(wrapper.find('.from-slot').exists()).toBe(false)
        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn).toHaveBeenCalledWith(MESSAGE)
    })

    it('без слота предупреждения нет', () => {
        mount(DropdownButtonWithAction, { attachTo: document.body, slots, props: { actions } })

        expect(warn).not.toHaveBeenCalled()
    })

    it('в продакшен-сборке предупреждения нет', () => {
        vi.stubEnv('NODE_ENV', 'production')

        mount(DropdownButtonWithAction, { attachTo: document.body, slots: withSlot })

        expect(warn).not.toHaveBeenCalled()
    })
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run tests/DropdownButtonWithAction.test.js -t "убранный слот"`
Expected: FAIL «переданный слот…» — `warn` вызван 0 раз. Два других теста проходят уже сейчас: они защищают от лишнего предупреждения.

- [ ] **Step 3: Реализация**

В `created()` после `this.stopArrows = null;` добавить:

```js
        // Слот actions убран: пункты задаёт проп. Меню проекта, который ещё
        // передаёт разметку, осталось бы без пунктов молча. Проверку
        // process.env.NODE_ENV подменяет бандлер проекта, как у самого Vue:
        // в продакшен-сборке её и предупреждение нет.
        if (process.env.NODE_ENV !== "production" && this.$slots.actions) {
            console.warn("[dashboard-ui-components] DropdownButtonWithAction: слот actions убран, пункты меню передаются пропом actions");
        }
```

- [ ] **Step 4: Убедиться, что тесты проходят и сборка сохраняет проверку**

Run: `npx vitest run tests/DropdownButtonWithAction.test.js`
Expected: PASS.

Run:

```bash
npm test > /private/tmp/dbwa-test.log 2>&1; echo "exit $?"
grep -E "Test Files|Tests " /private/tmp/dbwa-test.log
grep -ciE "warn|error|stderr" /private/tmp/dbwa-test.log
```

Expected: `exit 0`; все файлы и тесты passed; `0` — шпион глушит `console.warn` только в своём `describe`.

Run: `npm run build && grep -c 'process.env.NODE_ENV' dist/index.js`
Expected: сборка проходит, `1` — Vite в библиотечном режиме `process.env.*` не подменяет.

- [ ] **Step 5: Коммит**

```bash
git add src/components/DropdownButtonWithAction.vue tests/DropdownButtonWithAction.test.js
git commit -m "feat: предупреждать о слоте actions DropdownButtonWithAction в режиме разработки"
```

---

### Task 4: Playground на пропе `actions`

**Files:**
- Modify: `playground/App.vue`
- Modify: `playground/shell.css`

**Interfaces:**
- Consumes: проп `actions` из Task 1.
- Produces: данные `menuSelections`, метод `countSelection()`, computed `menuActions` в `App.vue`.

- [ ] **Step 1: Заменить пять мест со слотом `#actions`**

В `playground/App.vue` заменить

```html
                <dropdown-button-with-action>
                    <template #button><span class="demo-action">Без привязки</span></template>
                    <template #actions>
                        <a href="#" class="demo-action">Первое действие</a>
                        <a href="#" class="demo-action">Второе действие</a>
                    </template>
                </dropdown-button-with-action>
                <dropdown-button-with-action v-model="dropdownIsOpen">
                    <template #button><span class="demo-action">С v-model</span></template>
                    <template #actions>
                        <a href="#" class="demo-action">Действие</a>
                    </template>
                </dropdown-button-with-action>
```

на

```html
                <dropdown-button-with-action :actions="menuActions">
                    <template #button><span class="demo-action">Без привязки</span></template>
                </dropdown-button-with-action>
                <dropdown-button-with-action v-model="dropdownIsOpen" :actions="[{ label: 'Действие', onSelect: countSelection }]">
                    <template #button><span class="demo-action">С v-model</span></template>
                </dropdown-button-with-action>
```

заменить

```html
                <button type="button" class="demo-button" @click="dropdownIsOpen = !dropdownIsOpen">Переключить снаружи</button>
            </p>
```

на

```html
                <button type="button" class="demo-button" @click="dropdownIsOpen = !dropdownIsOpen">Переключить снаружи</button>
            </p>
            <p>Выбрано действий: {{ menuSelections }}</p>
```

заменить (таблица `page`)

```html
                    <dropdown-button-with-action>
                        <template #button><span class="demo-action">Редактировать</span></template>
                        <template #actions>
                            <a href="#" class="demo-action">Поменять пароль</a>
                            <a href="#" class="demo-action">Удалить</a>
                        </template>
                    </dropdown-button-with-action>
```

на

```html
                    <dropdown-button-with-action :actions="menuActions">
                        <template #button><span class="demo-action">Редактировать</span></template>
                    </dropdown-button-with-action>
```

заменить (таблица `card`)

```html
                            <dropdown-button-with-action>
                                <template #button><span class="demo-action">Редактировать</span></template>
                                <template #actions>
                                    <a href="#" class="demo-action">Удалить</a>
                                </template>
                            </dropdown-button-with-action>
```

на

```html
                            <dropdown-button-with-action :actions="[{ label: 'Удалить', danger: true, onSelect: countSelection }]">
                                <template #button><span class="demo-action">Редактировать</span></template>
                            </dropdown-button-with-action>
```

заменить (`lang="en"`)

```html
            <dropdown-button-with-action lang="en">
                <template #button><span class="demo-action">Action</span></template>
                <template #actions><a href="#" class="demo-action">Another action</a></template>
            </dropdown-button-with-action>
```

на

```html
            <dropdown-button-with-action lang="en" :actions="[{ label: 'Another action', onSelect: countSelection }]">
                <template #button><span class="demo-action">Action</span></template>
            </dropdown-button-with-action>
```

Проверка: `grep -n "#actions" playground/App.vue` — пусто.

- [ ] **Step 2: Данные, метод и computed**

В `data()` после `dropdownIsOpen: false,` добавить `menuSelections: 0,`.

В `computed` перед `tableColumns()` добавить:

```js
        // Как меню страницы администраторов: переход и опасное действие.
        // Длинный пункт показывает перенос строки в меню шириной w-56.
        // Переход — по hash: в голом окружении без navigate страница
        // не уходит.
        menuActions() {
            return [
                { label: 'Поменять пароль', href: '#password' },
                { label: 'Отправить письмо с новым паролем на старый и новый адрес', onSelect: this.countSelection },
                { label: 'Удалить', danger: true, onSelect: this.countSelection },
            ];
        },
```

В `methods` после `showNotice` добавить:

```js
        countSelection() {
            this.menuSelections++;
        },
```

- [ ] **Step 3: Убрать стиль фокуса пунктов из `shell.css`**

В `playground/shell.css` удалить блок

```css

/* Подсветка пункта меню — фокус: меню ставит его и стрелками, и мышью. */
a.demo-action:focus {
    outline: none;
    background-color: #e0e7ff;
}
```

- [ ] **Step 4: Сборка playground**

Run: `npm run build && npx vite build --config vite.playground.config.js --outDir /private/tmp/playground-check --emptyOutDir --base ./`
Expected: обе сборки проходят без предупреждений Vue о шаблоне.

Run: `rm -rf /private/tmp/playground-check`

- [ ] **Step 5: Коммит**

```bash
git add playground/App.vue playground/shell.css
git commit -m "docs: перевести playground на проп actions"
```

---

### Task 5: README — проп `actions` и «Обновление с 0.13»

**Files:**
- Modify: `README.md` (раздел `### DropdownButtonWithAction`, новый раздел `## Обновление с 0.13` перед `## Обновление с 0.12`)

**Interfaces:**
- Consumes: поведение из Task 1–3.
- Produces: документация для проектов.

- [ ] **Step 1: Начало раздела компонента**

Заменить

```
Кнопка с меню дополнительных действий: основная часть — слот `button`, стрелка
справа открывает меню из слота `actions`. Без слота `actions` стрелки нет, и
кнопка скругляется с обеих сторон.

    <dropdown-button-with-action v-model="menuIsOpen">
        <template #button>…основное действие…</template>
        <template #actions>…пункты меню…</template>
    </dropdown-button-with-action>

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `modelValue` | `Boolean` | `false` | Открыто ли меню |
| `lang` | `String` | язык плагина | `"ru"` или `"en"` |
```

на

```
Кнопка с меню дополнительных действий: основная часть — слот `button`, стрелка
справа открывает меню из пунктов пропа `actions`. Без пунктов стрелки нет, и
кнопка скругляется с обеих сторон.

    <dropdown-button-with-action
        v-model="menuIsOpen"
        :actions="[
            { label: 'Поменять пароль', href: route('user.password.edit', { user: row.getId() }) },
            { label: 'Удалить', danger: true, onSelect: () => prepareUserDelete(row) },
        ]"
    >
        <template #button>…основное действие…</template>
    </dropdown-button-with-action>

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `actions` | `Array` | `[]` | Пункты меню, см. ниже |
| `modelValue` | `Boolean` | `false` | Открыто ли меню |
| `lang` | `String` | язык плагина | `"ru"` или `"en"` |

Пункт меню — объект одной из двух форм: переход (`href` без `onSelect`) или
действие (`onSelect` без `href`). Поле со значением `undefined` считается
отсутствующим.

| Поле | Тип | Описание |
| --- | --- | --- |
| `label` | `String`, обязательно | Текст пункта |
| `href` | `String` | Переход: обычный клик уходит в `navigate` плагина `dashboardUi`, клик с Cmd/Ctrl/Shift и средней кнопкой — браузеру; без `navigate` — обычная ссылка |
| `onSelect` | `Function` | Действие: вызывается без аргументов при выборе пункта |
| `danger` | `Boolean` | Опасный пункт — красный; по умолчанию `false` |

Неверный список Vue отмечает предупреждением о пропе в режиме разработки,
а компонент не падает: элементы-необъекты пропускает, кнопка без функции
`onSelect` только закрывает меню. `null` — пустой список.

Вид пунктов задаёт компонент: страница передаёт данные, а не разметку,
и классов пунктам не даёт. Обычный пункт — серый текст, при подсветке —
серый фон; опасный — красный фон, при подсветке темнее. Слота `actions`
нет с версии 0.14.0 — см. «Обновление с 0.13».
```

- [ ] **Step 2: Абзацы о клавиатуре и подсветке**

Заменить

```
Пока меню открыто, стрелки вверх и вниз переводят фокус по ссылкам и кнопкам
слота `actions` и страницу не прокручивают: вниз — на первый пункт, вверх —
на последний, дальше — по соседним, с краёв — по кругу. Enter на пункте под
фокусом нажимает его. Мышь ведёт тот же фокус: движение по пункту ставит фокус
на него, и стрелки продолжают от пункта под курсором.

Подсветку пунктов задаёт страница: компонент содержимое слота не оформляет.
Чтобы подсвечен был один пункт — тот, на который указали последним, — пунктам
дают стиль фокуса, а не наведения: `focus:bg-gray-100 focus:outline-hidden`
вместо `hover:bg-gray-100`. Без стиля фокуса пункт под стрелкой выделяет
только стандартная рамка браузера, и её почти не видно.
```

на

```
Пока меню открыто, стрелки вверх и вниз переводят фокус по пунктам и
страницу не прокручивают: вниз — на первый пункт, вверх — на последний,
дальше — по соседним, с краёв — по кругу. Enter на пункте под фокусом
выбирает его. Подсветка пункта — это фокус, и мышь ведёт тот же фокус:
движение по пункту ставит фокус на него, стрелки продолжают от пункта под
курсором. Подсвечен всегда один пункт — тот, на который последними указали
клавиатура или мышь.
```

- [ ] **Step 3: Раздел «Обновление с 0.13»**

Перед строкой `## Обновление с 0.12` вставить:

```
## Обновление с 0.13

- `DropdownButtonWithAction`: пункты меню передаются пропом `actions`,
  слот `actions` убран, и страница больше не оформляет пункты — вид задаёт
  компонент. Было:

      <template v-slot:actions>
          <Link
              class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              :href="route('user.password.edit', {'user': row.getId()})"
          >
              Поменять пароль
          </Link>
          <a
              href="#"
              @click.prevent="prepareUserDelete(row)"
              class="block px-4 py-2 text-sm bg-red-400 hover:bg-red-500 text-white"
              role="menuitem"
          >
              Удалить
          </a>
      </template>

  Стало — проп на самом `dropdown-button-with-action`:

      :actions="[
          { label: 'Поменять пароль', href: route('user.password.edit', { user: row.getId() }) },
          { label: 'Удалить', danger: true, onSelect: () => prepareUserDelete(row) },
      ]"

  Меню со старым слотом остаётся без пунктов и без стрелки; в режиме
  разработки компонент пишет об этом в консоль.
- `0.14.0` не подтянется по `^0.13.0`: для версий `0.x` знак `^` пропускает
  только патчи. Обновление — `npm install @boobooking/dashboard-ui-components@^0.14.0`.

```

- [ ] **Step 4: Проверка**

Run: `grep -n "слот \`actions\`\|слота \`actions\`\|#actions" README.md`
Expected: только упоминания убранного слота — в разделе компонента («Слота `actions` нет с версии 0.14.0») и в «Обновление с 0.13».

- [ ] **Step 5: Коммит**

```bash
git add README.md
git commit -m "docs: описать проп actions и обновление с 0.13 в README"
```

---

### Task 6: Приёмка в браузере

Без кода; при найденной ошибке — вернуться в задачу, которая владеет кодом, с падающим тестом.

**Files:**
- Временно: `/Users/boobooking/Code/mars/certificates/src/public/build/ui-playground/` (удаляется в конце задачи)

- [ ] **Step 1: Сборка и выкладка playground**

Run:

```bash
npm test > /private/tmp/dbwa-test.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests " /private/tmp/dbwa-test.log
```

Expected: `tests exit 0`, все файлы и тесты passed. Только после этого:

```bash
npm run build && npx vite build --config vite.playground.config.js --outDir /Users/boobooking/Code/mars/certificates/src/public/build/ui-playground --emptyOutDir --base ./; echo "build exit $?"
```

Expected: `build exit 0`, обе сборки прошли.

- [ ] **Step 2: Chrome (chrome-devtools MCP), `https://certificates.test/build/ui-playground/index.html` и `…/host.html`**

Проверить и записать результат по каждому пункту:
- меню «Без привязки»: три пункта; «Поменять пароль» и длинный пункт — серый текст на белом, «Удалить» — красный фон с белым текстом; длинный пункт переносится внутри меню, меню шире `w-56` не становится;
- нижний красный пункт не выходит за скругление меню (скриншот меню крупно);
- наведение мышью подсвечивает пункт (серый фон / тёмно-красный), стрелки ведут ту же подсветку, подсвечен один пункт;
- клик и Enter по «Удалить» увеличивают «Выбрано действий» и закрывают меню;
- в `host.html` клик по «Поменять пароль» даёт «Последний переход: #password» в разделе DataTable, меню закрывается;
- в консоли страницы нет предупреждений Vue и ошибок (`list_console_messages`).

- [ ] **Step 3: Safari владельца**

Попросить владельца проверить те же пункты в его Safari на `https://certificates.test/build/ui-playground/index.html`. Дождаться ответа.

- [ ] **Step 4: Убрать временную сборку**

Run: `rm -rf /Users/boobooking/Code/mars/certificates/src/public/build/ui-playground && /bin/ls /Users/boobooking/Code/mars/certificates/src/public/build`
Expected: остались только `assets` и `manifest.json`.

---

### Task 7: Версия `0.14.0`

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Поднять версию**

Run: `npm version 0.14.0 --no-git-tag-version && git diff | grep -E "^[-+].*version"`
Expected: три строки `0.13.0` → `0.14.0` (одна в `package.json`, две в `package-lock.json`).

- [ ] **Step 2: Финальная проверка**

Run:

```bash
npm test > /private/tmp/dbwa-test.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" /private/tmp/dbwa-test.log
grep -ciE "warn|error|stderr" /private/tmp/dbwa-test.log
npm run build > /private/tmp/dbwa-build.log 2>&1; echo "build exit $?"
grep -E "built|error" /private/tmp/dbwa-build.log
```

Expected: `tests exit 0`, все файлы и тесты passed, `0`, `build exit 0`, `✓ built`. При ненулевом коде — не коммитить, разобрать лог.

- [ ] **Step 3: Коммит**

```bash
git add package.json package-lock.json
git commit -m "chore: поднять версию пакета до 0.14.0"
```

---

## Отличия от спеки

- Спека §8 называет один коммит `feat:` для пунктов меню; план делит его на три атомарных коммита по задачам 1–3 (проп и разметка, проверка пунктов, предупреждение о слоте) и добавляет `docs:` для playground и README.
- Добавлено поведение, о котором спека молчит (Review Focus): при опустевшем списке у открытого меню компонент снимает слушатели и эмитит `update:modelValue(false)`.
- Добавлено по ревью плана: когда пункты появляются, компонент применяет состояние меню после рендера (наблюдатель `hasActions` с `flush: "post"`) — иначе пункты, пришедшие вместе с `modelValue: true`, дают закрытое меню при внутреннем состоянии «открыто».
- Добавлено по ревью плана: `select` возвращает результат `onSelect`, и отказ асинхронного обработчика попадает в `errorHandler` Vue, а не в `unhandledrejection`.

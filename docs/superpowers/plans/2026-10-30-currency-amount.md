# Выбор валюты и поля суммы, выпуск `0.22.0` — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** пять публичных компонентов для денег — `SelectCurrencyForm`, `SelectCurrencyFilter`, `AmountForm`, `AmountIntervalFilter`, `AmountIntervalForm` — и поиск в `SelectSingleForm` и `SelectSingleFilter`. Выпуск `0.22.0`.

**Architecture:**

- **Данные и арифметика** — чистые модули без Vue: `src/currencies.js` (таблица, выбор по кодам, метка) и `src/amount.js` (разбор, сборка, разряды, вставка).
- **Поиск** выносится из `SelectMultiple` в `src/listSearch.js` (миксин) и `ListSearchField.vue` (поле с ластиком); `SelectSingle` берёт те же части.
- **Поле суммы** — ядро `AmountInput.vue` без рамки, живёт двумя строками цифр; блок валюты — `AmountCurrency.vue` поверх ядра `SelectSingle` с внутренними `withClear` и `withArrow`.
- **Правило активной валюты** — миксин `withAmountCurrency` в `src/amountCurrency.js`. `AmountForm` берёт его напрямую, диапазоны — через ядро без разметки `AmountInterval.vue`.

**Tech Stack:** Vue 3.5 (Options API, SFC), vitest + happy-dom, @vue/test-utils 2, Vite (library mode), Tailwind 4 с префиксом `bb`, @playwright/test 1.63.0 (Chromium, WebKit), chrome-devtools MCP, GitHub Actions, npm.

**Spec:** `docs/superpowers/specs/2026-10-30-currency-amount-design.md` (согласована с Codex, коммит `22a6941`).

## Global Constraints

- **Рабочая копия:** основная, `/Users/boobooking/Code/dashboard-ui-components`, ветка `feature/currency-amount`; все команды — из неё. Ветка не пушится.
- **Публикация** (слияние в `main`, тег `v0.22.0`, пуш `main` и тега) — только после явного согласия Тима на этом шаге (Task 11).
- **Не меняются:** `SelectDateIntervalFilter`, `SelectDateIntervalForm`, вид `CrossButton`, API существующих компонентов (только новые необязательные пропы).
- **Из пакета не экспортируются:** `AmountInput`, `AmountCurrency`, `AmountInterval`, `ListSearchField`, `src/currencies.js`, `src/amount.js`.
- **Значения:** сумма — целое `0 ≤ amount < 10^15`, цифр всего не больше 15; `AmountForm` — `{ amount, currency }`; диапазоны — `amountFrom`, `amountTo`, `currency`.
- **Утилиты:** каждая — с префиксом `bb:`; в `:class` — только литералы (`tests/utilityPrefix.test.js`). Динамическая ширина копеек — через `:style`.
- **Фокус:** только утилита `focus-ring`. Носитель поля суммы — корень `AmountInput`, `bb:has-focus-visible:focus-ring`; поля ввода сами кольца не рисуют (`bb:focus:outline-hidden`).
- **Тексты** — только `src/i18n.js`, ключи в `ru` и `en`.
- **SSR:** API браузера — только в `mounted()`, `beforeUnmount()` и обработчиках.
- **Стиль кода:** в `.vue` — двойные кавычки и точки с запятой в `<script>`, Options API, отступ 4 пробела; в `src/*.js` и `.js` тестов — одинарные кавычки без точек с запятой, как `src/phone.js` и `tests/phone.test.js`. Комментарии по-русски, описывают код как он есть; существующие сохраняются.
- **Тесты:** unit — `npm test -- --dir tests`; браузерные — `npm run test:browser`.
- **Чистый вывод:** `npm test -- --dir tests --reporter=verbose > $W/<имя>.log 2>&1`, затем `grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/<имя>.log` — ожидается `0`. `W=/Users/boobooking/Code/dashboard-ui-components/.superpowers/sdd/2026-10-30-currency-amount`.
- **Во всех unit-тестах компонентов** ошибки и предупреждения Vue собираются через `global.config.errorHandler` / `warnHandler` и проверяются пустыми, кроме тестов, которые их ждут, — как `mountWrapper` в `tests/SelectSingleWrappers.test.js`. Списки в тестах — через `installPopoverStub`.
- **Коммиты:** conventional commits по-русски, в повелительном наклонении, без служебных строк и упоминаний инструментов; `--no-verify` запрещён.
- **Отклонения:** если план или спеку нельзя выполнить как написано — остановиться и доложить отклонение с доказательствами; план не менять.

## Review Focus

1. **Tab в заполненное поле:** браузер выделяет всё содержимое `input`, и первая цифра стёрла бы сумму. Ожидается курсор в конце, цифра дописывается. Тест — Task 9.
2. **Символ, не меняющий значения:** буква в основной части или в копейках. `:value` Vue не перепишет поле, буква не должна остаться на экране. Тест — Task 6.
3. **Поле в фокусе размонтируется:** Chrome шлёт `blur` при удалении, `changed` со страницы, с которой уходят, запустил бы перезагрузку. Ожидается ни одного `changed`. Тест — Task 6.
4. **`@tailwindcss/forms` приложения** в `host.html`: у полей суммы нет своей рамки, кольца и отступов от плагина, поле выглядит как в `index.html`. Тест — Task 9.
5. **Родитель не передал `v-model`:** поле суммы работает на своём состоянии, компонент не падает, события уходят. Тест — Task 7.

## Прогон расширений клавиатурной навигации

Нужен в Task 10. Скрипты и стенды — в scratchpad сессии. Порядок — как в `docs/superpowers/plans/2026-10-21-select-cards-list.md`, раздел с тем же названием: собранный Playground через `python3 -m http.server`, Vimlike и Vimari в Playwright WebKit, обе страницы, с правилом `button:not(:disabled) { cursor: pointer }` и без него.

Ожидается: у основной части, копеек, крестика и кнопки валюты по одному кандидату; нажатие кандидата ставит фокус или открывает список. Провал — отклонение.

---

### Task 1: Таблица валют

**Files:**
- Create: `src/currencies.js`
- Test: `tests/currencies.test.js`

**Interfaces:**
- Produces: `CURRENCIES` (массив `{ code: string, digits: 0|2|3, symbol: string|null }`), `pickCurrencies(codes) → массив записей`, `currencyLabel(currency) → string`.

- [ ] **Step 1: Написать падающие тесты**

```js
it('156 записей, коды уникальны и отсортированы', () => {
    const codes = CURRENCIES.map((currency) => currency.code)
    expect(codes).toHaveLength(156)
    expect(new Set(codes).size).toBe(156)
    expect(codes).toEqual([...codes].sort())
})
it.each(['BOV', 'CHE', 'CHW', 'CLF', 'COU', 'MXV', 'USN', 'UYI', 'UYW'])('фондового кода %s нет', ...)
it('digits — только 0, 2, 3', ...)
it.each(['AFN', 'ALL', 'COP', 'HUF', 'IDR', 'IRR', 'KPW', 'LAK', 'LBP', 'MGA', 'MMK', 'SOS', 'SYP', 'YER'])('%s — 2 знака, а не 0 из Intl', ...)
it('IQD — 3 знака, JPY — 0, KWD — 3', ...)
it('pickCurrencies', () => {
    expect(pickCurrencies(null)).toBe(CURRENCIES)
    expect(pickCurrencies(undefined)).toBe(CURRENCIES)
    expect(pickCurrencies([])).toEqual([])
    expect(pickCurrencies('USD')).toEqual([])
    expect(pickCurrencies(['USD', 'RUB']).map((c) => c.code)).toEqual(['USD', 'RUB'])
    expect(pickCurrencies(['USD', 'XXX', 'USD', 'usd']).map((c) => c.code)).toEqual(['USD'])
})
it('currencyLabel: USD $, AED, XOF F CFA', ...)
```

- [ ] **Step 2: Запуск** — `npm test -- --dir tests currencies`. Ожидается FAIL: модуля нет.
- [ ] **Step 3: Реализовать `src/currencies.js`.** Записи — ровно из списка спеки §4, `-` — `symbol: null`, `XOF` — с обычным пробелом `F CFA`. Комментарий над таблицей: источник и почему не `Intl`.
- [ ] **Step 4: Запуск** — PASS.
- [ ] **Step 5: Commit** — `git add src/currencies.js tests/currencies.test.js && git commit -m "feat: добавить таблицу валют"`.

---

### Task 2: Арифметика суммы

**Files:**
- Create: `src/amount.js`
- Test: `tests/amount.test.js`

**Interfaces:**
- Produces:
  - `MAX_DIGITS = 15`;
  - `normalizeAmount(value) → number|null`;
  - `splitAmount(amount, digits) → { whole: string, fraction: string }`;
  - `joinAmount(whole, fraction, digits) → number|null`;
  - `cleanWhole(text, digits) → string`;
  - `groupWhole(whole, lang) → string`;
  - `decimalSeparator(lang) → ',' | '.'`;
  - `isDecimalKey(key, lang) → boolean`: `ru` — `,` и `.`; `en` — `.`;
  - `parsePastedAmount(text, lang, digits) → { whole, fraction } | null`.

- [ ] **Step 1: Написать падающие тесты** (таблицами `it.each`):

| Вызов | Результат |
| --- | --- |
| `normalizeAmount` от `0`, `123456`, `999999999999999` | то же число |
| `normalizeAmount` от `-1`, `1.5`, `NaN`, `'5'`, `null`, `undefined`, `10 ** 15` | `null` |
| `splitAmount(123456, 2)` | `{ whole: '1234', fraction: '56' }` |
| `splitAmount(123456, 0)` | `{ whole: '123456', fraction: '' }` |
| `splitAmount(123456, 3)` | `{ whole: '123', fraction: '456' }` |
| `splitAmount(5, 2)` | `{ whole: '0', fraction: '05' }` |
| `splitAmount(null, 2)` | `{ whole: '', fraction: '' }` |
| `joinAmount('1234', '', 2)` | `123400` |
| `joinAmount('1234', '5', 2)` | `123450` |
| `joinAmount('', '50', 2)` | `50` |
| `joinAmount('', '', 2)` | `null` |
| `joinAmount('123456', '', 0)` | `123456` |
| `cleanWhole('00a1 2', 2)` | `'12'` |
| `cleanWhole('000', 2)` | `'0'` |
| `cleanWhole('1'.repeat(20), 2)` | 13 цифр |
| `cleanWhole('1'.repeat(20), 0)` | 15 цифр |
| `groupWhole('1234567', 'ru')` | `'1 234 567'` |
| `groupWhole('1234567', 'en')` | `'1,234,567'` |
| `groupWhole('', 'ru')`, `groupWhole('123', 'en')` | `''`, `'123'` |

`parsePastedAmount`:

| Текст | Язык | `digits` | Результат |
| --- | --- | --- | --- |
| `1 234,56` | ru | 2 | `1234` + `56` |
| `1234.56` | ru | 2 | `1234` + `56` |
| `1,234.56` | ru | 2 | `1234` + `56` |
| `1.234,56` | ru | 2 | `1234` + `56` |
| `1.234.567` | ru | 2 | `1234567` + `''` |
| ` 1 234,5` | ru | 2 | `1234` + `5` |
| `0,50` | ru | 2 | `0` + `50` |
| `007` | ru | 2 | `7` + `''` |
| `1,234` | ru | 2 | `null` |
| `1,234` | en | 2 | `1234` + `''` |
| `1,234.56` | en | 2 | `1234` + `56` |
| `1,234,567` | en | 2 | `1234567` + `''` |
| `1 234,56` | ru | 0 | `null` |
| `1234` | ru | 0 | `1234` + `''` |
| `1` × 14 | ru | 2 | `null` |
| `1` × 13 | ru | 2 | 13 цифр + `''` |
| `1,234,567.89` | en | 2 | `1234567` + `89` |
| `12,34,567.89` | en | 2 | `1234567` + `89` |
| `1.2,3.4`, `1,2.3,4` | ru | 2 | `null` |
| `-100.00`, `1e3`, `100–200`, `1 234,56 ₽`, `.50`, `` | ru | 2 | `null` |

- [ ] **Step 2: Запуск** — `npm test -- --dir tests amount`. Ожидается FAIL.
- [ ] **Step 3: Реализовать `src/amount.js`.** `parsePastedAmount` — по шагам спеки §7.5, порядок правил в комментарии. Пустые копейки в `joinAmount` дополняются нулями справа, пустая основная часть — `0`.
- [ ] **Step 4: Запуск** — PASS.
- [ ] **Step 5: Commit** — `git add src/amount.js tests/amount.test.js && git commit -m "feat: добавить разбор и сборку суммы"`.

---

### Task 3: Вынос поиска из `SelectMultiple`

Рефакторинг без изменения поведения. `tests/SelectMultiple.test.js`, `tests/SelectMultipleWrappers.test.js` и e2e `SelectMultiple` не меняются.

**Files:**
- Create: `src/listSearch.js`, `src/components/ListSearchField.vue`
- Modify: `src/components/SelectMultiple.vue`, `tests/focusRing.test.js:128`

**Interfaces:**
- Produces:
  - `ListSearchField.vue`: проп `modelValue` (`String`), `lang`; событие `update:modelValue`; методы `focus()` (с `preventScroll`), `moveCaretToEnd()`, `inputElement()`, `eraserElement()`. Разметка, комментарии и классы — перенос блока `v-if="withSearch"` из `SelectMultiple.vue`; `clearQuery` живёт здесь.
  - `withListSearch` из `src/listSearch.js`: проп `withSearch`; `data.query`; `computed.visibleItems`; методы `itemName`, `itemElements`, `searchInput`, `searchStops`, `tabStops`, `onSearchToggle(isOpen)`, `onListKeydown`; `watch.hasItems` сбрасывает запрос. Ждёт от компонента `itemList`, `hasItems` и `ref="search"` на `ListSearchField`, `ref="list"` на списке.

- [ ] **Step 1: Базовый прогон** — `npm test -- --dir tests`. Записать число тестов в отчёт.
- [ ] **Step 2: Перенести.** В `SelectMultiple` остаются `selectedIds`, `selectedItems`, `title`, `itemClicked`, `clear`, `firstSelectedElement`, `arrowsOrigin` (`firstSelectedElement() ?? searchInput()`), `onToggle` вызывает `onSearchToggle`. Комментарии переезжают вместе с кодом. `isOpen = false` в `watch.hasItems` остаётся в ядре.
- [ ] **Step 3: `tests/focusRing.test.js`.** Строка носителя `SelectMultiple.vue` заменяется на `['ListSearchField.vue', 'bb:focus:focus-ring', 1]`.
- [ ] **Step 4: Запуск** — `npm test -- --dir tests` с проверкой чистого вывода: все зелёные, тесты `SelectMultiple` те же, общее число больше базового только на три проверки `tests/utilityPrefix.test.js`, которые тест создаёт сам на каждый `.vue`. `npm run test:browser` — зелёный.
- [ ] **Step 5: Commit** — `git add src tests/focusRing.test.js && git commit -m "refactor: вынести поиск списка из SelectMultiple"`.

---

### Task 4: Поиск и внутренние режимы `SelectSingle`

**Files:**
- Modify: `src/components/SelectSingle.vue`, `SelectSingleForm.vue`, `SelectSingleFilter.vue`, `DropdownButton.vue`
- Test: `tests/SelectSingle.test.js`, `tests/SelectSingleWrappers.test.js`

**Interfaces:**
- Consumes: `withListSearch`, `ListSearchField` (Task 3).
- Produces: пропы `SelectSingle`: `withSearch`, `withClear` (`true`), `withArrow` (`false`), `lang`. `SelectSingleForm`, `SelectSingleFilter`: `withSearch`, `lang`. `DropdownButton`: `withArrow` (`false`).

- [ ] **Step 1: Написать падающие тесты** в `tests/SelectSingle.test.js`, описание `describe('поиск')`:
  - без `withSearch` поля нет, поведение прежнее;
  - с `withSearch` фокус при открытии в поле; ввод `вто` оставляет один пункт из `Первый`, `Второй`;
  - нет совпадений — строка `Ничего не найдено`, в `lang: 'en'` — `Nothing found`, стрелки и `Tab` не падают;
  - выбор отфильтрованного пункта шлёт его `id` и закрывает список; запрос сброшен;
  - закрытие сбрасывает запрос; галочка выбранного пункта стоит при фильтрации;
  - стрелки ходят по полю и пунктам, ластик запроса в Tab, но не в стрелках;
  - набор с пункта уходит в поле;
  - пропажа пунктов сбрасывает запрос;
  - `keepSize` передан в панель только с `withSearch`.

  `describe('withClear = false')`: ластика нет; клик по выбранному закрывает список без событий; клик по другому шлёт `update:modelValue` и `changed`.

  `describe('withArrow')`: стрелка есть только с пропом, текст в `.bb\\:truncate`, правый отступ `bb:pr-7`.

  В `tests/SelectSingleWrappers.test.js`: `withSearch` и `lang` доходят до ядра; ластик получает `lang`.

- [ ] **Step 2: Запуск** — `npm test -- --dir tests SelectSingle`. Ожидается FAIL.
- [ ] **Step 3: Реализовать.**
  - `SelectSingle`: миксины `withLang`, `withListSearch`; разметка поиска и строка «Ничего не найдено» — как в `SelectMultiple`; `:find-selected="arrowsOrigin"`, `:find-stops="searchStops"`, `:find-tab-stops="tabStops"`, `:keep-size="withSearch"`, `@toggle="onToggle"`, `:lang="lang"`; `arrowsOrigin` — `activeItemElement() ?? searchInput()`; индексы — по `visibleItems`.
  - `itemClicked`: при `!withClear && item.id === modelValue` закрыть список без событий.
  - `:has-value="withClear && hasValue"`.
  - `DropdownButton`: при `withArrow` текст — во вложенном `<span class="bb:truncate">`, внешний span получает `bb:min-w-0 bb:pr-7` вместо `bb:pr-12`; без пропа разметка текста прежняя. Стрелка — `svg` с `aria-hidden`, треугольник, `bb:absolute bb:right-3 bb:top-1/2 bb:-translate-y-1/2 bb:w-2 bb:h-1.5 bb:fill-current bb:text-gray-500 bb:pointer-events-none`.
- [ ] **Step 4: Запуск** — `npm test -- --dir tests` с проверкой чистого вывода. PASS.
- [ ] **Step 5: Commit** — `git add src tests && git commit -m "feat: добавить поиск в SelectSingle"`.

---

### Task 5: Выбор валюты

**Files:**
- Create: `src/components/SelectCurrencyForm.vue`, `SelectCurrencyFilter.vue`
- Modify: `src/index.js`, `tests/exports.test.js`, `tests/ssrFixtures.js`
- Test: `tests/SelectCurrency.test.js`

**Interfaces:**
- Consumes: `pickCurrencies`, `currencyLabel`; `SelectSingleForm`, `SelectSingleFilter`.
- Produces: компоненты с пропами спеки §6.

- [ ] **Step 1: Написать падающие тесты**, `it.each` по обоим компонентам:
  - без `currencies` — 156 пунктов, первый `AED`, у `USD` метка `USD $`;
  - `currencies: ['RUB', 'USD']` — два пункта в этом порядке;
  - `[]` — кнопки нет, подпись или заголовок и рамка есть, предупреждений нет;
  - неизвестный код пропущен;
  - поиск по умолчанию есть, `:with-search="false"` — нет;
  - поиск `₽` находит `RUB ₽`;
  - выбор шлёт код, `update:modelValue` и `changed`; ластик шлёт `null`;
  - `class` ложится на корень.

  Фикстуры SSR:

  ```js
  SelectCurrencyFilter: { props: { header: 'Валюта', modelValue: 'USD', currencies: ['RUB', 'USD'] } },
  SelectCurrencyForm: { props: { label: 'Валюта', modelValue: 'USD' } },
  ```

  `tests/exports.test.js`: двадцать восемь компонентов на этом шаге, имена в списке; `ListSearchField` не экспортируется.

- [ ] **Step 2: Запуск** — FAIL.
- [ ] **Step 3: Реализовать** тонкие обёртки: `items` — computed `pickCurrencies(currencies).map(...)`, `withSearch` по умолчанию `true`. Экспорт — после `SelectSingleCards`.
- [ ] **Step 4: Запуск** — `npm test -- --dir tests` с проверкой чистого вывода. PASS.
- [ ] **Step 5: Commit** — `git add src tests && git commit -m "feat: добавить SelectCurrencyForm и SelectCurrencyFilter"`.

---

### Task 6: Ядро поля суммы

**Files:**
- Create: `src/components/AmountInput.vue`
- Modify: `src/i18n.js`, `tests/focusRing.test.js`
- Test: `tests/AmountInput.test.js`

**Interfaces:**
- Consumes: всё из `src/amount.js`; `withLang`, `CrossButton`.
- Produces: `AmountInput`.
  - Пропы: `modelValue` (`Number`, `null`), `digits` (`Number`, `2`), `prefix` (`String`, `null`), `inputId` (`String`, `null`), `withEraser` (`Boolean`, `true`), `isDisabled` (`Boolean`, `false`), `lang`.
  - События: `update:modelValue` (число или `null`), `changed`.
  - i18n: `amountFrom`, `amountTo`, `amountFraction`, `currency` (спека §11).

- [ ] **Step 1: Написать падающие тесты**, `attachTo: document.body`:

  Ввод:
  - ввод `1234` в основную часть: поле `1 234`, событие `123400`; в `lang: 'en'` — `1,234`;
  - буква `a` в основной части и в копейках на экране не остаётся, значение и событие не меняются (Review Focus 2);
  - `007` → `7`; предел 13 цифр при `digits: 2`;
  - запятая и точка в основной части переводят фокус в копейки; в `en` запятая игнорируется; при `digits: 0` обе игнорируются;
  - копейки `5`, уход: поле `50`, сумма та же; пустая основная часть становится `0`;
  - обход пустого поля: Tab в основную часть, в копейки, наружу — значение `null`, копейки снова скрыты, событий нет;
  - Backspace в пустых копейках переводит фокус в основную часть; в непустых — нет;
  - `keydown` при курсоре в середине возвращает его в конец; выделение всей основной части остаётся; частичное сворачивается.

  Копейки и вид:
  - пустое поле без фокуса: разделитель и копейки скрыты; фокус показывает; уход из пустого скрывает; уход с суммой оставляет плейсхолдер;
  - `digits: 0` — блока нет; `digits: 3` — плейсхолдер `000`, `style.width` `3ch`;
  - клик по пустому месту корня и по `prefix` ставит фокус в основную часть;
  - `prefix` виден, основная часть называется им через `aria-label`.

  Значения:
  - `modelValue: 123456` → `1 234` и `56`;
  - недопустимые `-1`, `1.5`, `10 ** 15` → пусто, предупреждений о значении нет;
  - эхо: ввод `1234`, родитель отвечает `123400`, копейки остаются пустыми;
  - другое значение родителя заменяет обе части;
  - смена `digits` при `123456`: 0 → `123 456`, 3 → `123` и `456`, снова 2 → `1 234` и `56`, событий нет;
  - `1234` с пустыми копейками при смене на `digits: 0` → `123 400`;
  - одновременные изменения одним `setProps`, и через динамический `v-bind` с обратным порядком ключей: `{ modelValue: 654321, digits: 0 }` при `123456`, `2` → `654 321`; `{ digits: 0, isDisabled: false }` при `123456`, `isDisabled: true` → `123 456`; `{ modelValue: 654321, digits: 3, isDisabled: false }` → `654` и `321`; событий нет, следующий уход — ни одного `changed`.

  `changed`, с настоящей связкой `v-model` родителя через `h()`:
  - ввод, эхо, уход — одно `changed`;
  - Enter, затем уход — одно;
  - внешняя установка, затем уход — ни одного;
  - переход между основной частью, копейками и крестиком — ни одного;
  - уход без правок — ни одного;
  - `wrapper.unmount()` при фокусе и несохранённой правке — ни одного (Review Focus 3).

  Вставка:
  - `1 234,56` заменяет сумму, `update:modelValue` с `123456`;
  - отклонённая `-100.00` не меняет поле, событий нет.

  Крестик:
  - скрыт через `bb:invisible` при пустом поле, виден при сумме;
  - клик шлёт `null` и `changed`, обе части пусты, повторного `changed` при уходе нет;
  - в видимом фокусе клавиатуры фокус до очистки переходит в основную часть;
  - `mousedown` на крестике отменён;
  - `withEraser: false` — крестика нет, у корня `bb:pr-3`.

  Блокировка:
  - `isDisabled` — оба поля `disabled`, поле пустое при `modelValue: 123456`, крестик скрыт, событий нет;
  - уход фокуса при включении блокировки не даёт `changed`;
  - снятие блокировки строит части из `modelValue`: `digits` 2 → 2 — `1 234` и `56`; 2 → 0 — `123 456`; 2 → 3 — `123` и `456`; событий нет, следующий уход — ни одного `changed`.

  `tests/focusRing.test.js`: носитель `['AmountInput.vue', 'bb:has-focus-visible:focus-ring', 1]`.

- [ ] **Step 2: Запуск** — FAIL.
- [ ] **Step 3: Реализовать `AmountInput.vue`.**
  - `data`: `whole`, `fraction`, `hasFocus`. В `created` — нереактивные `committed` и `isUnmounted`, как в `RussianMobileFilter`.
  - `computed`: `amount` (`joinAmount`), `isEmpty`, `isCollapsed` (`isEmpty && !hasFocus`), `groupedWhole`.
  - Один наблюдатель на все три пропа: в `created` — `this.$watch(() => [this.modelValue, this.digits, this.isDisabled], this.syncProps)`. Отдельные `watch` не годятся: порядок их вызова зависит от обновления пропов, и части пересчитывались бы дважды. `syncProps([value, digits, isDisabled], [previousValue, previousDigits, wasDisabled])`, приоритеты сверху вниз:
    1. `isDisabled` — части пусты, `hasFocus = false`, выход;
    2. `incoming = normalizeAmount(value)`; `wasDisabled` — части из `incoming` с `digits`, `committed = incoming`, выход;
    3. `current = joinAmount(whole, fraction, previousDigits)`; если `value === previousValue` или `incoming === current` — это эхо или только смена точности: при `digits !== previousDigits` части из `current` с `digits`, `committed` не трогать, выход;
    4. иначе внешняя установка: части из `incoming` с `digits`, `committed = incoming`.
  - Обработчики `input` пишут `event.target.value` напрямую.
  - Основная часть: `@focus`, `@click`, `@keydown`, `@keyup`, `@select`, `@paste.prevent`. Метод `holdCaret()` оставляет выделение всего поля, иначе ставит курсор в конец.
  - `@focus` ставит курсор в конец безусловно, в `requestAnimationFrame`: браузер выделяет всё поле при Tab, это не выделение пользователя.
  - Корень: `@click` (фокус в основную часть, если цель не `input` и не `button`), `@focusin`, `@focusout`. Выход из поля — `relatedTarget` вне корня. `commit()`: при `isUnmounted` или `isDisabled` выход; при `amount !== committed` — `committed = amount`, `changed`. Enter в обоих полях — `commit()`.
  - Копейки: `@blur` работает только при непустых копейках: дополняет их нулями, пустая основная часть становится `0`. Две пустые части остаются пустыми.
  - Крестик: `@mousedown.prevent`, `@clicked="erase"`, `:class="{ 'bb:invisible': isEmpty }"`, как ластики пакета: проверка `document.activeElement` и `:focus-visible`, `focus({ preventScroll: true })` до очистки.
  - Классы: корень `bb:flex bb:items-stretch bb:h-full bb:w-full bb:min-w-0 bb:pl-3 bb:rounded-[var(--bb-field-radius,0)] bb:has-focus-visible:focus-ring`; основная часть `bb:flex-1 bb:w-full bb:min-w-0 bb:bg-transparent bb:text-right bb:tabular-nums bb:focus:outline-hidden`; копейки `bb:flex-none bb:bg-transparent bb:tabular-nums bb:placeholder-gray-400 bb:focus:outline-hidden`; разделитель `bb:flex bb:items-center bb:text-gray-500`; `prefix` `bb:flex bb:flex-none bb:items-center bb:mr-2 bb:text-gray-400 bb:select-none`; крестик `bb:h-full bb:pr-2 bb:flex-none`.
- [ ] **Step 4: Запуск** — `npm test -- --dir tests` с проверкой чистого вывода. PASS.
- [ ] **Step 5: Commit** — `git add src tests && git commit -m "feat: добавить ядро поля суммы"`.

---

### Task 7: Блок валюты и `AmountForm`

**Files:**
- Create: `src/amountCurrency.js`, `src/components/AmountCurrency.vue`, `src/components/AmountForm.vue`
- Modify: `src/index.js`, `tests/exports.test.js`, `tests/ssrFixtures.js`
- Test: `tests/AmountForm.test.js`

**Interfaces:**
- Consumes: `pickCurrencies`, `currencyLabel`, `normalizeAmount`, `AmountInput`, `SelectSingle` с `withClear`, `withArrow`, `withSearch`.
- Produces:
  - `withAmountCurrency`: проп `currencies`; `computed`: `currencyList`, `activeCurrency`, `activeCode`, `fractionDigits` (`?? 2`), `isBlocked`, `currencyKey`; ждёт от компонента `computed.passedCurrency` и метод `reportCurrency(code)`.
  - `AmountCurrency.vue`: пропы `currencies` (массив записей), `modelValue` (код), `lang`; событие `update:modelValue`. Имя кнопки — `sr-only`-подпись `texts.currency` с `useId`, передаётся в `labelledBy`.
  - `AmountForm.vue`: пропы и события спеки §9.2.

- [ ] **Step 1: Написать падающие тесты** в `tests/AmountForm.test.js`:

  Валюта:
  - без `modelValue` и с `currencies: ['RUB', 'USD']` — на `mounted` одно событие `{ amount: null, currency: 'RUB' }`, `changed` нет;
  - без `currencies` — `AED`;
  - `{ amount: 123456, currency: 'EUR' }` при `['USD']` — событие `{ amount: 123456, currency: 'USD' }`;
  - `currencies=['USD']`, родитель меняет `currency` с `USD` на `EUR` — одно исправляющее событие; родитель принял — повторного нет;
  - новый равный массив — событий нет;
  - текущая валюта пропала из списка — событие с первой;
  - одна валюта — текст `RUB ₽`, кнопки нет, не в порядке Tab;
  - несколько — кнопка со стрелкой, ластика нет, поиск есть;
  - выбор другой валюты при сумме: событие с той же суммой и `changed`, поле `123 456` для JPY; при пустой сумме `changed` нет.

  Блокировка:
  - `[]` — поля `disabled`, блок пуст, событий значения и `changed` нет, в том числе на `mounted`;
  - `{ amount: 123456, currency: 'USD' }`, `[]` → `['USD']`: значение на месте, поле `1 234` и `56`, событий значения нет;
  - то же с `currency: 'JPY'` и `['JPY']`: `123 456`; с `KWD`: `123` и `456`;
  - `[]` → `['EUR']` при `currency: 'USD'`: одно событие с `EUR` и той же суммой.

  Форма:
  - клик по подписи ставит фокус в основную часть, `for` равен `id` поля, у двух копий `id` разные;
  - `isRequired` показывает точку;
  - `class` на корне;
  - `modelValue: 'x'` — пусто, одно предупреждение Vue о типе;
  - `withEraser: false` доходит до поля;
  - порядок Tab: кнопки и поля в DOM в порядке спеки §9.5;
  - без `v-model` (родитель не слушает): ввод идёт в поле, события уходят, ошибок нет (Review Focus 5).

  Фикстура SSR: `AmountForm: { props: { label: 'Сумма', modelValue: { amount: 123456, currency: 'USD' } } }`.

- [ ] **Step 2: Запуск** — FAIL.
- [ ] **Step 3: Реализовать.**
  - Миксин: `currencyKey` — строка `${passedCurrency}|${activeCode}`; `watch.currencyKey` и `mounted` вызывают `syncCurrency()`: `!isBlocked && activeCode !== passedCurrency` → `reportCurrency(activeCode)`.
  - `AmountCurrency`: 0 — пусто; 1 — `<span>` с `bb:truncate` и `bb:px-3`; больше — `select-single` с `:with-clear="false" with-arrow with-search`.
  - `AmountForm`: подпись — `<label>` с `for`, рамка суммы — как у `FormInput` без `mt-1`, `bb:flex-1 bb:min-w-0`, `--bb-field-radius`; рамка блока — `bb:w-24 bb:flex-none`; строка `bb:mt-1 bb:flex bb:gap-3`. Каждое событие — новый объект.
- [ ] **Step 4: Запуск** — `npm test -- --dir tests` с проверкой чистого вывода. PASS.
- [ ] **Step 5: Commit** — `git add src tests && git commit -m "feat: добавить AmountForm"`.

---

### Task 8: Диапазоны сумм

**Files:**
- Create: `src/components/AmountInterval.vue`, `AmountIntervalFilter.vue`, `AmountIntervalForm.vue`
- Modify: `src/index.js`, `tests/exports.test.js`, `tests/ssrFixtures.js`
- Test: `tests/AmountInterval.test.js`

**Interfaces:**
- Consumes: `withAmountCurrency`, `AmountInput`, `AmountCurrency`, `ElementHeader`, `Dot`.
- Produces: ядро без разметки, как `SelectDateInterval`. Слот: `{ from, to, currency }`:
  - `from`, `to`: `{ value, prefix, update, changed }`;
  - `currency`: `{ list, code, digits, isBlocked, choose }`.

- [ ] **Step 1: Написать падающие тесты**, `it.each` по обоим компонентам:
  - подстановка валюты на `mounted`: `update:currency` с первой, `changed` нет;
  - ввод в «от» шлёт `update:amountFrom`, в «до» — `update:amountTo`; `changed` по разделу 9.4 с настоящей связкой `v-model`;
  - выбор валюты: `update:currency`; `changed` только при заданной хотя бы одной границе;
  - при смене валюты `amountFrom` и `amountTo` не меняются, поля показывают новую запятую;
  - смена переданного кода при неизменной активной валюте — одно событие, повторного нет;
  - новый равный массив — событий нет;
  - `[]` — оба поля `disabled`, событий нет; `[]` → `['USD']` с заданными границами — части из значений, событий значения нет; с `JPY` и `KWD` — `123 456` и `123`, `456`;
  - порядок в DOM: «от», копейки, крестик, «до», копейки, крестик, валюта;
  - одна валюта — текст, не в порядке Tab;
  - `withEraser: false` доходит до обоих полей.

  Только фильтр:
  - `withCurrency: false` — блока нет, `digits` из `currency: 'JPY'` — блока копеек нет; без `currency` — `AED`, 2 знака;
  - высота и рамка `bb:h-18 bb:border bb:border-gray-200`, поля `bb:w-45`, блок `bb:w-24`, `bb:divide-x`;
  - `isLoading` доходит до `ElementHeader`.

  Только форма:
  - `role="group"` с именем подписи; сетка `1fr 1fr 6rem`.

  Фикстуры SSR:

  ```js
  AmountIntervalFilter: { props: { header: 'Сумма', amountFrom: 100000, amountTo: 500000, currency: 'USD' } },
  AmountIntervalForm: { props: { label: 'Сумма', amountFrom: 100000, amountTo: 500000, currency: 'USD' } },
  ```

  `tests/exports.test.js`: тридцать один компонент, описание теста и список; ядра `AmountInput`, `AmountCurrency`, `AmountInterval` не экспортируются. Обновить комментарии в тесте.

- [ ] **Step 2: Запуск** — FAIL.
- [ ] **Step 3: Реализовать** по спеке §9.3 и §10. `AmountInterval` — `inheritAttrs: false`, миксины `withLang`, `withAmountCurrency`; `passedCurrency` — проп `currency`; `reportCurrency` — `update:currency`. Сетка формы — `bb:grid-cols-[1fr_1fr_6rem]`.
- [ ] **Step 4: Запуск** — `npm test -- --dir tests` с проверкой чистого вывода. PASS.
- [ ] **Step 5: Commit** — `git add src tests && git commit -m "feat: добавить диапазоны сумм"`.

---

### Task 9: Playground и браузерные тесты

**Files:**
- Modify: `playground/App.vue`
- Create: `e2e/amount.e2e.js`

**Interfaces:**
- Consumes: все пять компонентов; `test`, `expect`, `pages`, `openPlayground`, `expectColor` из `e2e/helpers.js`.

- [ ] **Step 1: Playground** — раздел `<h2>Валюта и сумма</h2>` по спеке §14:
  - форма: `SelectCurrencyForm` с поиском; `AmountForm` с `['RUB', 'USD', 'JPY', 'KWD', 'XOF']`, начальное `{ amount: 123456, currency: 'USD' }`; `AmountForm` с `['RUB']`; `AmountForm` с `:with-eraser="false"`; `AmountIntervalForm`;
  - фильтры: `SelectCurrencyFilter`; `AmountIntervalFilter` с валютой; с `:with-currency="false"` и `currency="RUB"`;
  - `SelectSingleForm` и `SelectSingleFilter` с `with-search`;
  - `<p data-testid="amount-values">` с `JSON.stringify` всех значений.

- [ ] **Step 2: Написать браузерные тесты** — цикл по `pages`, Chromium и WebKit:
  - Tab в заполненное поле ставит курсор в конец, цифра дописывается, сумма не стирается (Review Focus 1);
  - клик в середину, Home, стрелка влево — `selectionStart` равен длине значения; набор цифры дописывает её в конец;
  - `Meta+A` (`Control+A` не на macOS), ввод `5` — основная часть `5`;
  - порядок Tab в `AmountForm` и `AmountIntervalFilter` — по спеке §9.5: локаторы конкретных полей и кнопок внутри примера, после каждого Tab `toBeFocused()`; одинаковые «Копейки» и «Очистить» различаются областью поля;
  - Tab в заполненное поле, затем `Meta+A` и ввод — замена всей основной части;
  - кольцо крестика: с Tab до крестика расширенный на 3px прямоугольник значка внутри прямоугольника поля, поле показывает кольцо;
  - USD → JPY → KWD → USD через настоящий список с поиском: `amount` всегда `123456`, на экране `1 234,56`, `123 456`, `123,456`, `1 234,56`;
  - метка `XOF F CFA` обрезается, код виден, рамка блока не растёт;
  - поле суммы: высота 38px, рамка `gray-300`, одинаковый вид в `index.html` и `host.html`, нет кольца на самом `input` (Review Focus 4);
  - высота `AmountIntervalFilter` равна высоте `SelectDateIntervalFilter`; поле вмещает `100 000 000,00`: `scrollWidth ≤ clientWidth`;
  - `SelectSingleForm` с поиском: открытие, ввод, Enter на пункте.

- [ ] **Step 3: Запуск** — `npm run test:browser`. Все зелёные. Падение от реальной геометрии или событий Safari-движка — исправление в компоненте с unit-тестом, если поведение не расходится со спекой; иначе отклонение.
- [ ] **Step 4: Commit** — `git add playground e2e && git commit -m "test: показать поля суммы в Playground и проверить в браузере"`.

---

### Task 10: README и приёмка

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README** по спеке §15. Разделы `SelectCurrencyForm`, `SelectCurrencyFilter`, `AmountForm`, `AmountIntervalFilter`, `AmountIntervalForm` — после `### SelectSingleForm`, в формате его раздела. В `AmountForm`: две части, курсор, копейки, смена валюты с таблицей спеки §7.2 и предупреждением, вставка, крестик, `[]`. «Компоненты» и «Playground» — тридцать один. «Требования» — новые компоненты на Popover API. «Языки» — строки новых компонентов, ластик `SelectSingle…` по пропу `lang`. «Клавиатурная навигация» — фраза о поле суммы.
- [ ] **Step 2: Расширения** — раздел «Прогон расширений клавиатурной навигации».
- [ ] **Step 3: Playground в certificates.**
  - Выкладка: `npm run build && npx vite build --config vite.playground.config.js --outDir ~/Code/mars/certificates/src/public/build/ui-playground --emptyOutDir --base ./`.
  - `curl -sk -o /dev/null -w "%{http_code}"` по `https://certificates.test/build/ui-playground/index.html` и `host.html` — `200`.
  - Chrome (chrome-devtools), 1280×900, обе страницы: все примеры раздела, мышь и клавиатура, консоль без ошибок и предупреждений.
- [ ] **Step 4:** `npm test -- --dir tests` (чистый вывод), `npm run test:browser`, `npm run build` — без ошибок.
- [ ] **Step 5: Commit** — `git add README.md && git commit -m "docs: описать выбор валюты и поля суммы"`.

---

### Task 11: Выпуск `0.22.0`

Порядок — спека §16.

- [ ] **Step 1:** Итоговое ревью ветки, исправление всех замечаний, включая мелкие, каждое с тестом, который сначала падает. После исправлений — проверки Task 10, Step 4.
- [ ] **Step 2: Версия последним коммитом.** `npm version 0.22.0 --no-git-tag-version`, `git add package.json package-lock.json && git commit -m "chore: поднять версию до 0.22.0"`.
- [ ] **Step 3:** Тиму — итог: что сделано и проверено, ссылка на Playground в certificates для проверки в настоящем Safari: Tab, курсор, копейки, крестик, список валют (перед ссылкой `200` у обеих страниц, при `404` — выложить заново). Вопрос: сливать в `main`, пушить и ставить тег `v0.22.0`?
- [ ] **Step 4:** Только после согласия: `git switch main && git merge --ff-only feature/currency-amount && git push origin main`.
- [ ] **Step 5:** Дождаться зелёного `Test`, оба джоба, именно этого SHA: `gh run list --workflow test.yml --commit "$(git rev-parse HEAD)"`.
- [ ] **Step 6:** `git tag v0.22.0 && git push origin v0.22.0`.
- [ ] **Step 7:** GitHub Actions `Publish` по тегу зелёный (`gh run list --workflow publish.yml --limit 1`). `npm view @boobooking/dashboard-ui-components@0.22.0 version` и `npm view @boobooking/dashboard-ui-components dist-tags.latest` — оба `0.22.0`. Первый `E404` или старая версия — не провал: registry догоняет, повторять до совпадения.
- [ ] **Step 8:** Ветку `feature/currency-amount` удалить локально (`git branch -d`).

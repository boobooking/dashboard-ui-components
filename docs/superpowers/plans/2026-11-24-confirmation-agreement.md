# ConfirmationModal: галочка согласия и слот текста — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** у `ConfirmationModal` появляются проп `agreementText` (галочка, без которой действие недоступно) и слот по умолчанию вместо `confirmationText`.

**Architecture:** маркер галочки в круге фокуса `dialogFocus.js`; в `ConfirmationModal.vue` слот тела, чекбокс и внутреннее `agreed` со сбросом при открытии; тесты компонента, фокуса, SSR и гидратации; Playground и README.

**Tech Stack:** Vue 3.5, Tailwind 4 с префиксом `bb`, vitest + happy-dom, @vue/test-utils.

**Spec:** `docs/superpowers/specs/2026-11-24-confirmation-agreement-design.md`.

## Global Constraints

- **Ветка:** `main`. Версия 0.27.0, тег и публикация — по слову владельца, в план не входят.
- **Проп:** `agreementText: { type: String, default: null }`; галочка есть, когда строка непустая.
- **Блокировка:** `Boolean(agreementText) && !agreed` → `ActionButton` `isDisabled`.
- **Сброс:** `agreed = false` при каждом переходе `isOpen` в `true`; начальное значение `false`.
- **Фокус:** `ITEMS = 'a[href], button:not(:disabled), input[data-dialog-agreement]:not(:disabled)'`.
- **Слот:** обёртка `<div class="bb:mt-2 bb:text-sm bb:text-gray-500">`; со слотом абзац `confirmationText` не выводится.
- **Галочка:** `<label>` с отступом `bb:mt-4`, подпись `bb:text-sm bb:text-gray-900`; чекбокс — разметка и классы как в `src/components/SelectMultipleList.vue` (input + SVG-галочка), с атрибутом `data-dialog-agreement`.
- **Код:** классы литералами с префиксом `bb:`; комментарии по-русски, описывают код как есть, без истории; существующие комментарии не удалять.
- **Коммиты:** conventional commits по-русски, без `--no-verify`.
- **Отклонения:** если план или спеку нельзя выполнить как написано — остановиться и сообщить с доказательством, план не менять.
- **Проверка:** `npx vitest run --dir tests` — всё зелёное, вывод чистый.

## Review Focus

1. `agreementText: ""` — галочки нет, кнопка включена. Тест — Task 2 Step 1.
2. Модалка смонтирована сразу открытой с `agreementText` — галочка снята, кнопка выключена. Тест — Task 2 Step 1.
3. Недоступное поле в слоте перед галочкой не ломает Tab. Тест — Task 2 Step 1.
4. Клик по подписи галочки переключает её (связь label → input). Тест — Task 2 Step 1.
5. Отмена и Escape работают при снятой галочке. Тест — Task 2 Step 1.

---

### Task 1: Галочка в круге фокуса

**Files:**
- Modify: `src/dialogFocus.js` (`ITEMS` и комментарий над ним)
- Test: `tests/dialogFocus.test.js` (describe `holdDialogFocus: Tab`)

**Interfaces:**
- Produces: элементы с `input[data-dialog-agreement]` входят в круг Tab модалок пакета.

- [ ] **Step 1: Падающий тест.** В `holdDialogFocus: Tab` новый `it('включает поле с data-dialog-agreement, пропуская выключенное и поле без метки')`: панель — кнопка, `input` без метки, `input[data-dialog-agreement][disabled]`, `input[data-dialog-agreement]`, кнопка; Tab с первой кнопки — фокус на включённом маркированном `input`, ещё Tab — на последней кнопке.
- [ ] **Step 2:** `npx vitest run tests/dialogFocus.test.js` — FAIL (фокус уходит на последнюю кнопку).
- [ ] **Step 3:** `ITEMS` из Global Constraints; комментарий: элементы фокуса модалок пакета — кнопки, ссылки и галочка согласия по метке; поля слота не входят, недоступное поле в круге зациклило бы Tab.
- [ ] **Step 4:** `npx vitest run tests/dialogFocus.test.js` — PASS.
- [ ] **Step 5: Коммит** — `feat: включить галочку согласия в круг фокуса модалки`.

### Task 2: Слот и галочка в ConfirmationModal

**Files:**
- Modify: `src/components/ConfirmationModal.vue`, `tests/ssrFixtures.js` (фикстура `ConfirmationModal`)
- Test: `tests/ConfirmationModal.test.js`

**Interfaces:**
- Consumes: маркер `data-dialog-agreement` из Task 1.
- Produces: проп `agreementText`, слот по умолчанию; события прежние (`actionConfirmed`, `actionCanceled`).

- [ ] **Step 1: Падающие тесты** в `tests/ConfirmationModal.test.js`, новый describe `ConfirmationModal: галочка и слот`:
  - `it.each([[undefined], ['']])('без галочки (agreementText %s): чекбокса нет, действие доступно')` — `input[type=checkbox]` нет; клик по «Да» — одно `actionConfirmed`;
  - `'с agreementText: галочка снята, действие выключено до отметки'` — `label` содержит текст пропа; `input` не отмечен и имеет `data-dialog-agreement`; кнопка «Да» `disabled`, клик — `actionConfirmed` нет; `setValue(true)` на чекбоксе — кнопка включена, клик — одно `actionConfirmed`; предупреждений Vue нет (warnHandler пуст);
  - `'клик по подписи отмечает галочку'` — `trigger('click')` на `label` (с `attachTo: document.body`) — `input.element.checked === true`, кнопка включена;
  - `'закрыть и открыть снова — галочка снята'` — отметить, `setProps({ isOpen: false })`, `setProps({ isOpen: true })` — не отмечена, кнопка `disabled`;
  - `'смонтирована открытой — галочка снята'`;
  - `'отмена и Escape при снятой галочке дают actionCanceled'`;
  - `'слот заменяет абзац текста'` — слот `'<p>Абзац</p><ul><li><b>Пункт</b></li></ul>'`, `confirmationText: 'Текст'`: обёртка с классами `bb:mt-2 bb:text-sm bb:text-gray-500` содержит `ul > li > b`; строки «Текст» в модалке нет; без слота абзац «Текст» на месте;
  - фокус (`attachTo`, `nextFrame` из файла): открыта с `agreementText` — после кадра фокус на «Отмене»; Tab (keydown на `document.body`, как в существующих тестах фокуса) — на чекбоксе; Tab — снова на «Отмене»; после отметки: с чекбокса Tab — на «Да»;
  - `'inert-поле в слоте не мешает дойти до галочки'` — слот `<div inert><input></div>`; Tab с «Отмены» — на чекбоксе.
- [ ] **Step 2:** `npx vitest run tests/ConfirmationModal.test.js` — FAIL по новым тестам, старые PASS.
- [ ] **Step 3: Реализация** в `ConfirmationModal.vue`: проп и `data() { agreed: false }`; `watch: isOpen(value) { if (value) this.agreed = false }`; computed `actionDisabled` = условие из Global Constraints → `:is-disabled` у кнопки действия; тело — `<div v-if="$slots.default" class="…">` со слотом, иначе прежний блок с абзацем; под телом `<label v-if="agreementText">` с чекбоксом `v-model="agreed"` (разметка из `SelectMultipleList`) и подписью. Комментарии к сбросу (почему по `isOpen`: модалка смонтирована всегда) и к булеву условию (пустая строка в `isDisabled` стала бы `true`).
- [ ] **Step 4:** `npx vitest run tests/ConfirmationModal.test.js` — PASS.
- [ ] **Step 5: Фикстура SSR/гидратации.** В `tests/ssrFixtures.js` фикстуре `ConfirmationModal` добавить `agreementText: 'Подтверждаю'` и `slots: { default: () => [h('p', 'Абзац'), h('ul', [h('li', 'Пункт')])] }` (формат `slots` — как у других фикстур файла).
  Run: `npx vitest run tests/ssr.test.js tests/hydration.test.js`
  Expected: PASS, без предупреждений о несовпадении гидратации.
- [ ] **Step 6:** `npx vitest run --dir tests` — PASS, вывод чистый.
- [ ] **Step 7: Коммит** — `feat: добавить галочку согласия и слот текста ConfirmationModal`.

### Task 3: Playground и README

**Files:**
- Modify: `playground/App.vue` (раздел `ConfirmationModal`), `README.md` (`### ConfirmationModal`)

**Interfaces:**
- Consumes: проп `agreementText` и слот из Task 2.

- [ ] **Step 1: Playground.** Кнопка «С согласием» — в `demo-row` раздела **после** существующего `<dropdown-button-with-action :actions="modalMenuActions"/>` (`e2e/menuFocus.e2e.js` берёт третью кнопку раздела как триггер меню), и модалка `type="warning"` с `agreement-text="Подтверждаю"`, `action-button-text="Скачать"`, заголовком «Выгрузка персональных данных» и слотом: абзац и список из двух-трёх пунктов с `<b>`; классы списка — у Playground свои (`list-disc`/`pl-5` или его demo-классы). События — те же счётчики `modalConfirms`/`modalCancels`.
- [ ] **Step 2: README `### ConfirmationModal`.** Строка таблицы `agreementText` | `String` | `null` | Подпись галочки согласия; без неё галочки нет. Абзац о слоте по умолчанию (обёртка `bb:mt-2 bb:text-sm bb:text-gray-500`, `confirmationText` не выводится, вид содержимого задаёт страница). Абзац о галочке: снята при каждом открытии, пока снята — кнопка действия выключена и `actionConfirmed` не приходит; отмена и Escape работают; галочка входит в круг фокуса, поля слота — нет. Пример со слотом и `agreement-text`.
- [ ] **Step 3: Проверить.**
  Run: `git diff --check && npx vitest run --dir tests && npm run build && npm run test:browser`
  Expected: пусто от `diff --check`; vitest PASS; сборка без ошибок; Playwright PASS (если браузеры не запускаются в окружении — зафиксировать вывод и сообщить).
- [ ] **Step 4: Коммит** — `docs: описать галочку согласия и слот ConfirmationModal`.

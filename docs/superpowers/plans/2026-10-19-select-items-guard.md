# Некорректный `items` в `SelectSingle` и `SelectMultiple` — план, выпуск `0.19.1`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `SelectSingle` и `SelectMultiple` не падают на любом `items`; выпуск `0.19.1`.

**Architecture:** в каждом компоненте вычисляемое `itemList` отбрасывает не-массив и элементы-необъекты; всё остальное уже строится от `itemList`.

**Tech Stack:** Vue 3.5 (Options API), vitest + happy-dom, @vue/test-utils 2, GitHub Actions, npm.

**Spec:** `docs/superpowers/specs/2026-10-19-select-items-guard-design.md`

## Global Constraints

- Рабочая копия — git worktree `/Users/boobooking/Code/dashboard-ui-components/.worktrees/items-guard`, ветка `fix/select-items-guard` от `c7e30fc` (`0.19.0`).
- Публикация `0.19.1` разрешена владельцем («выпусти фикс версию», 2026-10-19).
- Стиль: в `.vue` — двойные кавычки и точки с запятой в `<script>`, Options API; в тестах — одинарные кавычки без точек с запятой; отступ 4 пробела; комментарии по-русски, описывают код как он есть; существующие комментарии сохраняются (меняется только ставший неверным).
- Тесты — `npm test -- --dir tests`, база `c7e30fc`: 46 файлов, 1097 тестов. Вывод чистый: `npm test -- --dir tests --reporter=verbose > $S/ig-suite.log 2>&1`, затем `grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $S/ig-suite.log` — `0`. `S=/private/tmp/claude-501/-Users-boobooking-Code-dashboard-ui-components/03280d94-7310-46dc-a60d-462e4fab1b96/scratchpad`.
- Коммиты — conventional commits по-русски, повелительное наклонение; `--no-verify` запрещён.

## Review Focus

- Пункт выбран, затем `items` пришёл с `null` на его месте и самим пунктом дальше: галочка и надпись на месте. Тест — Task 1, `SelectSingle`, «выбранный среди мусора».
- `SelectMultiple` с поиском и `null` среди пунктов: набор запроса не падает. Тест — Task 1.

---

### Task 1: Отбрасывать некорректные пункты

**Files:** Modify `src/components/SelectSingle.vue`, `src/components/SelectMultiple.vue`, `README.md`; Test `tests/SelectSingle.test.js`, `tests/SelectMultiple.test.js`.

**Interfaces:** `itemList` в обоих компонентах — `Array.isArray(this.items) ? this.items.filter((item) => typeof item === "object" && item !== null) : []`; комментарий над ним — правило спеки §2 (не массив — пустой список, элементы-необъекты пропускаются). Остальной код не меняется.

- [ ] **Step 1: Тесты.**
  - `SelectSingle`, `it.each` по значениям `{ a: 1 }`, `'строка'`, `5`: монтирование не падает (`errors` пуст), кнопки списка нет, одно предупреждение Vue `Invalid prop: type check failed for prop "items"` (по образцу существующего теста `items: null` в `tests/SelectSingle.test.js`).
  - `SelectSingle`, `items: [null, { id: 'a', name: 'Первый' }, undefined, 'мусор', { id: 'b', name: 'Второй' }]`, `modelValue: 'b'`: в списке ровно две кнопки пунктов «Первый», «Второй»; надпись — «Второй»; клик по «Первый» — `update:modelValue` `['a']`; ошибок и предупреждений нет.
  - `SelectMultiple`, те же `items`, `modelValue: ['a', 'b']`, `withSearch: true`: две кнопки пунктов; надпись — `Выбрано: 2`; клик по «Первый» — `update:modelValue` `[['b']]`; набор `'вто'` в поле поиска — видна одна кнопка «Второй»; ошибок и предупреждений нет.
- [ ] **Step 2: Тесты падают** — ожидаемо `TypeError` (`Cannot read properties of null`) и ошибки рендера `SelectSingle` на не-массиве.
- [ ] **Step 3: Реализация** по Interfaces.
- [ ] **Step 4: README** — абзац `items` у `SelectSingle` (раздел `SelectSingle`, после таблицы пропов или в абзаце «`items` — массив объектов…») и фраза у `SelectMultiple` «`null` и `undefined` в `items` — пустой список» — по спеке §3.
- [ ] **Step 5: Весь набор и сборка** — набор по Global Constraints (все зелёные, `0`), `npm run build` — `exit 0`.
- [ ] **Step 6: Коммит** — `fix: не падать на некорректном items в SelectSingle и SelectMultiple`.

---

### Task 2: Выпуск `0.19.1`

- [ ] **Step 1: Версия и `main`** — из рабочей копии:

```bash
npm version 0.19.1 --no-git-tag-version && git diff | grep -E '^[-+].*"version"'
npm test -- --dir tests --reporter=verbose > $S/ig-t2-suite.log 2>&1; echo "tests exit $?"
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $S/ig-t2-suite.log
npm run build > $S/ig-t2-build.log 2>&1; echo "build exit $?"
git add package.json package-lock.json && git commit -m "chore: поднять версию пакета до 0.19.1"
git -C /Users/boobooking/Code/dashboard-ui-components merge --ff-only fix/select-items-guard
```

Expected: три строки `0.19.0` → `0.19.1`; `tests exit 0`; `0`; `build exit 0`; `main` перемотан.

- [ ] **Step 2: Пуш, `Test`, тег, `Publish`** — из основной рабочей копии, как Task 8 Steps 2–3 плана `docs/superpowers/plans/2026-10-16-form-input.md`, с `0.19.1` и тегом `v0.19.1`. Expected: `test exit 0`, `publish exit 0`; `npm view …@0.19.1 version` и `dist-tags.latest` — `0.19.1` (E404 сразу после публикации — повторять).
- [ ] **Step 3: Задача** — `gh issue close 1 --comment "Исправлено в 0.19.1 (<SHA исправления>)."`.

---

### Task 3: Уборка и отчёт

- [ ] **Step 1:** `git -C /Users/boobooking/Code/dashboard-ui-components worktree remove .worktrees/items-guard`, `git … branch -d fix/select-items-guard`, `git … status -s` — пусто.
- [ ] **Step 2:** сообщение Codex о конце реализации, отчёт владельцу.

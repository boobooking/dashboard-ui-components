# downloadFile: истёкшая сессия — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `downloadFile` шлёт `X-Requested-With: XMLHttpRequest` и на `401` отклоняет promise с `sessionExpired: true`.

**Architecture:** одна функция `src/download.js`: заголовок в `fetch`, ветка `401` после проверки перенаправления, поле `sessionExpired` у отказов пакета. Тесты на подменённом `fetch` и на настоящем сервере Node, затем README.

**Tech Stack:** vitest + happy-dom, Node `http`, Fetch API.

**Spec:** `docs/superpowers/specs/2026-11-24-download-session-expired-design.md`.

## Global Constraints

- **Ветка:** `main`. Версия, тег и публикация — по слову владельца, в план не входят.
- **Запрос:** `fetch(url, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })`.
- **Порядок проверок:** сначала `response.redirected`, затем `response.status === 401`, затем `!response.ok`.
- **Поля отказов пакета:** `redirectUrl`, `status`, `sessionExpired` — у каждого отказа все три. Сетевая ошибка `fetch` пробрасывается как есть, без полей.
- **Сообщения:** перенаправление и прочие коды — прежние; `401` — `` `downloadFile: сессия истекла, ответ 401 на ${url}` ``.
- **Код:** комментарии по-русски, описывают код как есть, без истории; существующие комментарии не удалять.
- **Коммиты:** conventional commits по-русски, без `--no-verify`.
- **Отклонения:** если план или спеку нельзя выполнить как написано — остановиться и сообщить с доказательством, план не менять.
- **Проверка:** `npx vitest run --dir tests` — всё зелёное, вывод чистый (без предупреждений).

## Review Focus

1. Перенаправление, закончившееся `401`, — это перенаправление, а не истёкшая сессия: `redirectUrl` — конечный адрес, `status: null`, `sessionExpired: false`. Тест — Task 1 Step 1.
2. Заголовок действительно уходит по сети, а не только в аргумент подменённого `fetch`. Тест — Task 1 Step 2 (настоящий сервер).
3. `403` — обычный отказ (`sessionExpired: false`), а не истёкшая сессия. Тест — Task 1 Step 1.
4. `422` (невалидные параметры) — обычный отказ. Тест — Task 1 Step 1.
5. Сетевая ошибка не получает поле `sessionExpired`. Тест — Task 1 Step 1.

---

### Task 1: Заголовок и отказ на 401

**Files:**
- Modify: `src/download.js` (функция `downloadFile`)
- Test: `tests/download.test.js`, `tests/download.server.test.js`

**Interfaces:**
- Produces: `downloadFile(url: string): Promise<void>`; отказ — `Error` с полями `redirectUrl: string|null`, `status: number|null`, `sessionExpired: boolean`.

- [ ] **Step 1: Обновить `tests/download.test.js`**

- В тесте «запрос с cookie сессии…» ожидание вызова:
  `expect(fetchMock).toHaveBeenCalledWith('/orders/export?phone=7', { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })`.
- Параметризованный отказ: `it.each([403, 404, 422, 500])`, к ожиданиям добавить `expect(error.sessionExpired).toBe(false)`.
- Новый тест `'401 — отказ с sessionExpired, файла нет'`: `response({ status: 401 })`; `error.message === 'downloadFile: сессия истекла, ответ 401 на /export'`, `error.status === 401`, `error.redirectUrl === null`, `error.sessionExpired === true`, `URL.createObjectURL` не вызван, `clicks` пуст.
- Тест «перенаправление (истёкшая сессия)…»: добавить `expect(error.sessionExpired).toBe(false)`; из названия убрать «(истёкшая сессия)» — перенаправление больше не означает её.
- Тест «перенаправление, закончившееся ответом 404…» сделать `it.each([404, 401])('перенаправление, закончившееся ответом %s, — отказ как при перенаправлении', …)` с `response({ status, redirected: true, url: 'https://dashboard.test/gone' })`; ожидания прежние плюс `expect(error.sessionExpired).toBe(false)`.
- Сетевая ошибка: добавить `expect(Object.hasOwn(failure, 'sessionExpired')).toBe(false)`.

- [ ] **Step 2: Обновить `tests/download.server.test.js`**

- В сервер добавить путь `/guarded-export`, повторяющий `auth` Laravel: при `request.headers['x-requested-with'] === 'XMLHttpRequest'` — `401` с `Content-Type: application/json` и телом `{"message":"Unauthenticated."}`, иначе `302` на `/login`. Пути `/export` и `/old-export` не меняются.
- Новый тест `'401 от сервера, отвечающего как auth Laravel, — sessionExpired true'`: `downloadFile(`${origin}/guarded-export`)`; `error.message === `downloadFile: сессия истекла, ответ 401 на ${origin}/guarded-export``, `status === 401`, `redirectUrl === null`, `sessionExpired === true`.
- В трёх существующих тестах добавить `expect(error.sessionExpired).toBe(false)`.
- Комментарий в начале файла дополнить: сервер `/guarded-export` проверяет, что заголовок доходит по сети.

- [ ] **Step 3: Запустить — тесты падают**

Run: `npx vitest run tests/download.test.js tests/download.server.test.js`
Expected: FAIL — ожидание заголовка, `sessionExpired` `undefined`, сообщение `401`.

- [ ] **Step 4: Реализовать в `src/download.js`**

Заголовок в `fetch` (Global Constraints). Между проверкой `response.redirected` и `!response.ok` — ветка `401` с сообщением из Global Constraints и полями `{ redirectUrl: null, status: 401, sessionExpired: true }`; у двух существующих отказов добавить `sessionExpired: false`. Комментарий к ветке `401`: заголовок `X-Requested-With` делает запрос для Laravel «ожидающим JSON», и на истёкшую сессию он отвечает `401`, а не перенаправлением на вход. Комментарий к ветке перенаправления: убрать утверждение «обычно на страницу входа после истёкшей сессии», оставив смысл про `redirectUrl` (утверждение становится ложным).

- [ ] **Step 5: Запустить — всё зелёное**

Run: `npx vitest run --dir tests`
Expected: PASS, без предупреждений в выводе.

- [ ] **Step 6: Коммит**

```bash
git add src/download.js tests/download.test.js tests/download.server.test.js
git commit -m "feat: отличать истёкшую сессию в downloadFile"
```

### Task 2: README

**Files:**
- Modify: `README.md` — раздел `### downloadFile`, раздел `## Обновление с 0.25`

**Interfaces:**
- Consumes: контракт отказа из Task 1.

- [ ] **Step 1: Раздел `### downloadFile`**

- Первый пункт списка: запрос — `GET` с cookie сессии и заголовком `X-Requested-With: XMLHttpRequest`; из-за него Laravel на истёкшую сессию отвечает `401`, на невалидные параметры — `422`, а не перенаправлением.
- Причины отказа: перенаправление (`redirectUrl`, `status: null`, `sessionExpired: false`); `401` — истёкшая сессия (`status: 401`, `redirectUrl: null`, `sessionExpired: true`); прочие не `2xx` (`status`, `redirectUrl: null`, `sessionExpired: false`); сетевая ошибка — без этих полей.
- Примечание: адрес на другом origin из-за заголовка вызовет CORS-preflight; функция рассчитана на свой origin.
- Абзац перед примером Inertia переписать: истёкшая сессия приходит как `sessionExpired`, страница показывает своё уведомление; `redirectUrl` — для прочих перенаправлений.
- Пример Inertia — целый компонент, а не только метод: импорт `{ downloadFile, NotificationMessage }` из пакета и `router` из `@inertiajs/vue3`; `components: { NotificationMessage }`; `data()` возвращает `{ exportLoading: false, exportFailure: "", sessionMessage: "" }`; в шаблоне `<notification-message v-model="sessionMessage" type="warning" />`. Метод `exportOrders` сбрасывает `exportFailure`, а в `catch` сначала `if (error.sessionExpired) { this.sessionMessage = "Сессия закончилась. Обновите страницу."; return; }`, затем прежняя ветка `redirectUrl`, затем «Попробуйте ещё раз».
- Короткий пример (без Inertia) не меняется.

- [ ] **Step 2: Раздел `## Обновление с 0.25`**

Добавить абзац: `downloadFile` шлёт `X-Requested-With`, поэтому Laravel отвечает на истёкшую сессию `401` (отказ с `sessionExpired: true`), а не перенаправлением на вход, а на невалидные параметры выгрузки — `422`, а не перенаправлением назад. Страницам, которые переходили по `redirectUrl`, нужна ветка `sessionExpired`; невалидные параметры попадают в общую ветку отказа.

- [ ] **Step 3: Проверить пример Inertia**

Скопировать компонент из примера в одноразовый тест `tests/readmeExample.tmp.test.js`, заменив импорт пакета на `../src/index.js` (публичное имя ведёт в `dist`, где старая сборка) (happy-dom; `@inertiajs/vue3` замокать через `vi.mock`, `fetch` — ответ `{ ok: false, status: 401, redirected: false }`), смонтировать, вызвать `exportOrders`, дождаться `flushPromises`.
Run: `npx vitest run tests/readmeExample.tmp.test.js`
Expected: PASS — в разметке есть «Сессия закончилась. Обновите страницу.», `router.visit` не вызван, предупреждений Vue нет. Затем удалить файл: в репозиторий он не попадает.

- [ ] **Step 4: Проверить всё**

Run: `git diff --check && npx vitest run --dir tests`
Expected: пустой вывод `diff --check`; тесты PASS, вывод чистый.

- [ ] **Step 5: Коммит**

```bash
git add README.md
git commit -m "docs: описать отказ downloadFile на истёкшую сессию"
```

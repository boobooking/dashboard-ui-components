# Причина отказа `downloadFile` в полях ошибки — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** у отказов `downloadFile` появляются поля `redirectUrl` и `status`, по которым страница отличает истёкшую сессию от ошибки сервера. Выпуск `0.16.3`.

**Architecture:** `src/download.js` при перенаправлении и при ответе не `2xx` бросает прежний `Error` с прежним текстом, дополненный полями через `Object.assign`; сетевая ошибка `fetch` проходит без изменений. Поля проверяются тестами на подменённом `fetch` (`tests/download.test.js`) и тестами на настоящем `fetch` Node с локальным HTTP-сервером (`tests/download.server.test.js`). README и Playground показывают поля.

**Tech Stack:** Vue 3.5 (Options API, SFC), vitest 5 + happy-dom 20, `node:http`, `fetch` (браузер и Node 24+), Vite (library mode).

**Spec:** `docs/superpowers/specs/2026-10-13-download-file-failure-reason-design.md`

## Global Constraints

- Репозиторий `/Users/boobooking/Code/dashboard-ui-components`, ветка — текущая `main`, коммиты прямо в неё. Версия в `package.json` — `0.16.2` до Task 3, затем `0.16.3` последним коммитом. Пуш и тег — только по слову владельца (Task 4).
- Поля ошибки — дословно (спека §4): перенаправление — `redirectUrl: response.url`, `status: null`; ответ не `2xx` — `redirectUrl: null`, `status: response.status`; сетевая ошибка — тот же объект ошибки `fetch`, без собственных свойств `redirectUrl` и `status`.
- Перенаправление проверяется раньше кода ответа: перенаправление, закончившееся `404`, — отказ перенаправления.
- Тексты сообщений не меняются: `` `downloadFile: сервер перенаправил запрос ${url}` `` и `` `downloadFile: ответ ${response.status} на ${url}` ``.
- Своего класса ошибки и новых экспортов нет: `src/index.js` не меняется.
- Остальное в `downloadFile` не меняется: запрос `fetch(url, { credentials: 'same-origin' })`, имя файла, скачивание, освобождение blob-адреса через 40 000 мс.
- Стиль: в `.js` (`src` и тесты) — одинарные кавычки без точек с запятой; в `.vue` — как в файле; в примерах README — как в соседних примерах раздела (точки с запятой); отступ 4 пробела; комментарии по-русски и описывают код как он есть. Существующие комментарии сохраняются; дополняются только те, о которых говорит спека.
- Вывод тестов чистый. vitest 5 стандартным репортером не печатает `console` успешных тестов, поэтому чистота проверяется так: `npm test -- --reporter=verbose > $W/<имя>.log 2>&1`, затем `grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/<имя>.log` — ожидается `0`. Поиск по словам `warn|error` в этом логе не годится: он ловит имена тестов вроде `ErrorMessages`.
- Логи — в `W=.superpowers/sdd/2026-10-13-download-file-failure-reason` (каталог `.superpowers/sdd` git-ignored своим `.gitignore`); создать `mkdir -p "$W"` в Task 1.
- Коммиты — conventional commits по-русски, повелительное наклонение, без служебных строк и упоминаний инструментов; `--no-verify` запрещён.

## Review Focus

- Сервер перенаправил запрос, и перенаправление закончилось страницей с кодом не `2xx` (например, `404`): страница должна получить отказ перенаправления с `redirectUrl`, а не отказ с кодом. Тест — Task 1, «перенаправление, закончившееся ответом 404».
- Цепочка перенаправлений (`/old-export` → `/export` → `/login`): `redirectUrl` — последний адрес, страница входа, а не промежуточный. Тест — Task 1, `download.server.test.js`.
- Сетевая ошибка: страница проверяет `if (error.redirectUrl)` и не должна увести пользователя — у ошибки `fetch` полей нет, объект тот же. Тест — Task 1, «сетевая ошибка».
- Проект, разбирающий текст ошибки, после обновления не должен сломаться: тексты сообщений дословно прежние. Тесты — Task 1, полные `message` во всех отказах.
- Настоящий `fetch` сам заполняет `redirected` и `url` после перенаправления; подменённый `fetch` пишет их руками и этого не доказывает. Тест — Task 1, `download.server.test.js`.

---

### Task 1: Поля причины отказа в `downloadFile`

**Files:**
- Modify: `src/download.js:51-59`
- Modify: `tests/download.test.js:12-19` (хелпер `response`), `tests/download.test.js:83-106` (блок «отказ»)
- Create: `tests/download.server.test.js`
- Modify: `README.md:335-342` (раздел `downloadFile`)
- Modify: `playground/App.vue:490`

**Interfaces:**
- Consumes: `downloadFile(url): Promise<void>` из `src/download.js` (`0.16.2`).
- Produces: отказ `downloadFile` — `Error` с полями `redirectUrl: string | null` и `status: number | null`, либо ошибка `fetch` без этих полей. Сигнатура функции и экспорты не меняются.

- [ ] **Step 1: Каталог логов и база ревью**

```bash
W=.superpowers/sdd/2026-10-13-download-file-failure-reason
mkdir -p "$W"
git rev-parse HEAD > "$W/base-sha"
cat "$W/base-sha"
```

Полный SHA `HEAD` до Task 1 — неизменная база итогового ревью (Task 2): коммиты с отметками в плане, сделанные по ходу исполнения, её не сдвигают.

- [ ] **Step 2: Хелпер `response` получает `url`**

В `tests/download.test.js` заменить хелпер целиком:

```js
function response({ status = 200, redirected = false, disposition = null, url = '' } = {}) {
    const headers = new Headers()
    if (disposition !== null) {
        headers.set('Content-Disposition', disposition)
    }

    return { ok: status >= 200 && status < 300, status, redirected, url, headers, blob: async () => new Blob(['xlsx']) }
}
```

- [ ] **Step 3: Падающие тесты блока «отказ»**

В `tests/download.test.js` заменить блок `describe('downloadFile: отказ', …)` целиком:

```js
describe('downloadFile: отказ', () => {
    it.each([404, 500])('ответ %s — отказ с кодом в status, файла нет', async (status) => {
        fetchMock.mockResolvedValue(response({ status }))

        const error = await downloadFile('/export').catch((failure) => failure)

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe(`downloadFile: ответ ${status} на /export`)
        expect(error.status).toBe(status)
        expect(error.redirectUrl).toBeNull()
        expect(URL.createObjectURL).not.toHaveBeenCalled()
        expect(clicks).toEqual([])
    })

    it('перенаправление (истёкшая сессия) — отказ с адресом в redirectUrl, страница входа не сохраняется', async () => {
        fetchMock.mockResolvedValue(response({ redirected: true, url: 'https://dashboard.test/login' }))

        const error = await downloadFile('/export').catch((failure) => failure)

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('downloadFile: сервер перенаправил запрос /export')
        expect(error.redirectUrl).toBe('https://dashboard.test/login')
        expect(error.status).toBeNull()
        expect(URL.createObjectURL).not.toHaveBeenCalled()
        expect(clicks).toEqual([])
    })

    it('перенаправление, закончившееся ответом 404, — отказ как при перенаправлении', async () => {
        fetchMock.mockResolvedValue(response({ status: 404, redirected: true, url: 'https://dashboard.test/gone' }))

        const error = await downloadFile('/export').catch((failure) => failure)

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('downloadFile: сервер перенаправил запрос /export')
        expect(error.redirectUrl).toBe('https://dashboard.test/gone')
        expect(error.status).toBeNull()
        expect(clicks).toEqual([])
    })

    it('сетевая ошибка — отказ той же ошибкой, без полей причины', async () => {
        const failure = new TypeError('Failed to fetch')
        fetchMock.mockRejectedValue(failure)

        await expect(downloadFile('/export')).rejects.toBe(failure)
        expect(Object.hasOwn(failure, 'redirectUrl')).toBe(false)
        expect(Object.hasOwn(failure, 'status')).toBe(false)
        expect(clicks).toEqual([])
    })
})
```

- [ ] **Step 4: Тесты на настоящем сервере**

Создать `tests/download.server.test.js` (без комментария окружения, как `colors.test.js`: окружение по умолчанию — `node`):

```js
import { createServer } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { downloadFile } from '../src/download.js'

// Настоящий fetch Node и настоящий HTTP-сервер: fetch по стандарту Fetch сам
// идёт за перенаправлением и заполняет redirected и url, как браузер.
// В tests/download.test.js эти значения ответа пишутся руками. До DOM
// функция здесь не доходит: отказ происходит раньше URL.createObjectURL.
let server
let origin

beforeAll(async () => {
    server = createServer((request, response) => {
        if (request.url === '/old-export') {
            response.writeHead(302, { Location: '/export' })
            response.end()
            return
        }

        if (request.url === '/export') {
            response.writeHead(302, { Location: '/login' })
            response.end()
            return
        }

        if (request.url === '/login') {
            response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            response.end('<form method="post" action="/login"></form>')
            return
        }

        response.writeHead(404)
        response.end()
    })

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    origin = `http://127.0.0.1:${server.address().port}`
})

// close закрывает и простаивающие соединения keep-alive, оставшиеся от fetch
// (Node 19+), поэтому ждать их таймаута не приходится.
afterAll(() => new Promise((resolve) => server.close(resolve)))

describe('downloadFile: отказ на настоящем сервере', () => {
    it('302 на /login — redirectUrl с полным адресом страницы входа, status null', async () => {
        const error = await downloadFile(`${origin}/export`).catch((failure) => failure)

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe(`downloadFile: сервер перенаправил запрос ${origin}/export`)
        expect(error.redirectUrl).toBe(`${origin}/login`)
        expect(error.status).toBeNull()
    })

    it('цепочка перенаправлений — redirectUrl с последним адресом', async () => {
        const error = await downloadFile(`${origin}/old-export`).catch((failure) => failure)

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe(`downloadFile: сервер перенаправил запрос ${origin}/old-export`)
        expect(error.redirectUrl).toBe(`${origin}/login`)
        expect(error.status).toBeNull()
    })

    it('404 — status с кодом, redirectUrl null', async () => {
        const error = await downloadFile(`${origin}/missing`).catch((failure) => failure)

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe(`downloadFile: ответ 404 на ${origin}/missing`)
        expect(error.status).toBe(404)
        expect(error.redirectUrl).toBeNull()
    })
})
```

- [ ] **Step 5: Тесты падают**

```bash
W=.superpowers/sdd/2026-10-13-download-file-failure-reason
npx vitest run tests/download.test.js tests/download.server.test.js > $W/t1-red.log 2>&1; echo "exit $?"
grep -E "Test Files|Tests |×|FAIL" $W/t1-red.log
```

Expected: `exit 1`; падают 7 тестов: в `download.test.js` — «ответ 404», «ответ 500», «перенаправление (истёкшая сессия)», «перенаправление, закончившееся ответом 404» (поля `undefined` вместо ожидаемых); в `download.server.test.js` — все три по той же причине. «сетевая ошибка» и тесты блока «запрос и файл» проходят. Если серверные тесты падают по другой причине (сервер не поднялся, `fetch` отверг параметры) — разобраться до Step 6.

- [ ] **Step 6: Поля в `src/download.js`**

Заменить две проверки в `downloadFile` (комментарий над проверкой перенаправления дополняется, спека §4):

```js
    // Сервер перенаправил — обычно на страницу входа после истёкшей сессии:
    // без проверки под видом файла сохранилась бы её разметка. redirectUrl —
    // куда в итоге привёл сервер: страница может отправить пользователя туда
    // же, куда отправила бы ссылка.
    if (response.redirected) {
        throw Object.assign(new Error(`downloadFile: сервер перенаправил запрос ${url}`), { redirectUrl: response.url, status: null })
    }

    if (!response.ok) {
        throw Object.assign(new Error(`downloadFile: ответ ${response.status} на ${url}`), { redirectUrl: null, status: response.status })
    }
```

Остальной файл не меняется.

- [ ] **Step 7: Тесты проходят**

```bash
W=.superpowers/sdd/2026-10-13-download-file-failure-reason
npx vitest run tests/download.test.js tests/download.server.test.js > $W/t1-green.log 2>&1; echo "exit $?"
grep -E "Test Files|Tests |×" $W/t1-green.log
```

Expected: `exit 0`, `Test Files  2 passed (2)`, ни одного `×`.

- [ ] **Step 8: README, раздел `downloadFile`**

В `README.md` заменить пункт:

```markdown
- Promise отклоняется: при ответе не `2xx` (код в тексте ошибки), при
  перенаправлении — обычно на страницу входа после истёкшей сессии — и при
  сетевой ошибке.
```

на:

```markdown
- Promise отклоняется:
  - при перенаправлении — обычно на страницу входа после истёкшей сессии:
    у ошибки `redirectUrl` — адрес, куда в итоге привёл сервер, `status` —
    `null`;
  - при ответе не `2xx`: `status` — код ответа, `redirectUrl` — `null`;
  - при сетевой ошибке — ошибкой `fetch`, без этих полей.
```

После последнего пункта раздела («Таймаута нет; уход со страницы скачивание не прерывает. Файл до сохранения целиком в памяти вкладки.») и перед `### ConfirmationModal` вставить (с пустой строкой до и после):

````markdown
Ссылка при истёкшей сессии привела бы браузер на страницу входа. Чтобы
страница вела себя так же, она сама переходит по `redirectUrl`: пакет
не импортирует ни Inertia, ни роутер. В приложении на Inertia:

```js
import { router } from '@inertiajs/vue3'

exportOrders() {
    this.exportFailure = "";
    this.exportLoading = true;

    downloadFile(this.exportUrl)
        .catch((error) => {
            if (error.redirectUrl) {
                router.visit(error.redirectUrl);
                return;
            }

            this.exportFailure = "Попробуйте ещё раз";
        })
        .finally(() => {
            this.exportLoading = false;
        });
}
```
````

Первый пример раздела не меняется. Проверка:

```bash
sed -n '/^### downloadFile/,/^### ConfirmationModal/p' README.md
```

Expected: раздел с вложенным списком отказов и вторым примером; `### ConfirmationModal` — сразу после него.

- [ ] **Step 9: Playground**

В `playground/App.vue`, метод `downloadSample`, заменить строку:

```js
                .catch((error) => { this.downloadResult = `ошибка: ${error.message}`; })
```

на:

```js
                .catch((error) => { this.downloadResult = typeof error.status === 'number' ? `ошибка ${error.status}` : `ошибка: ${error.message}`; })
```

Комментарий над методом («Скачивание файла сборки playground; missing.csv — ошибка 404.») остаётся: он по-прежнему верен.

- [ ] **Step 10: Весь набор, сборка и сборка Playground**

```bash
W=.superpowers/sdd/2026-10-13-download-file-failure-reason
npm test -- --reporter=verbose > $W/t1-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests " $W/t1-suite.log
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/t1-suite.log
npm run build > $W/t1-build.log 2>&1 && npx vite build --config vite.playground.config.js --outDir "$PWD/$W/pg" --emptyOutDir --base ./ >> $W/t1-build.log 2>&1; echo "build exit $?"
grep -iE "warn|error" $W/t1-build.log
ls $W/pg
rm -rf $W/pg
```

Expected: `tests exit 0`; `Test Files  41 passed (41)`, `Tests  751 passed (751)` (до задачи — 40 и 747: +1 тест в `download.test.js`, +3 в новом файле); `0`; `build exit 0`; grep по сборке — пусто; в `pg` есть `index.html`, `host.html`, `report.csv`. `outDir` — абсолютный: `vite.playground.config.js` задаёт `root: 'playground'`, и относительный путь Vite отсчитал бы от него. Другие числа тестов — сверить, откуда разница, и записать решение в журнал.

- [ ] **Step 11: Коммит**

```bash
git add src/download.js tests/download.test.js tests/download.server.test.js README.md playground/App.vue
git commit -m "feat: сообщать в ошибке downloadFile адрес перенаправления и код ответа"
git status -s
```

Expected: `git status -s` пуст.

---

### Task 2: Итоговое ревью

Независимое ревью коммитов этого плана до коммита с версией.

**Files:**
- Изменяются только файлы, которых касаются исправления.

**Interfaces:**
- Consumes: коммит Task 1.
- Produces: ветка без замечаний Critical и Important; список отложенных Minor для владельца.

- [ ] **Step 1: Пакет ревью**

```bash
W=.superpowers/sdd/2026-10-13-download-file-failure-reason
BASE=$(cat "$W/base-sha")
git log --oneline $BASE..HEAD
```

Пакет — скриптом superpowers `subagent-driven-development/scripts/review-package docs/superpowers/plans/2026-10-13-download-file-failure-reason.md $BASE HEAD`.

- [ ] **Step 2: Ревьюер**

Свежий ревьюер на самой сильной доступной модели (модель указывается явно) по `superpowers:requesting-code-review` (`code-reviewer.md`): пакет ревью, спека, этот план, раздел Review Focus дословно, решения из журнала исполнения (строки `Ruling:`).

- [ ] **Step 3: Разбор и исправления**

Каждое замечание переоценивается по тому, что получит человек, если выпуск выйдет как есть. Critical и Important — исправления, каждое отдельно: тест, который сначала падает; исправление; весь набор:

```bash
W=.superpowers/sdd/2026-10-13-download-file-failure-reason
npm test -- --reporter=verbose > $W/t2-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests " $W/t2-suite.log
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/t2-suite.log
```

Expected: `tests exit 0`, всё passed, `0`. Коммит на каждое исправление. Minor — в список отложенных для владельца.

---

### Task 3: Версия `0.16.3`

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Поднять версию**

Run: `npm version 0.16.3 --no-git-tag-version && git diff | grep -E "^[-+].*version"`
Expected: три строки `0.16.2` → `0.16.3`: одна в `package.json`, две в `package-lock.json`.

- [ ] **Step 2: Финальная проверка**

```bash
W=.superpowers/sdd/2026-10-13-download-file-failure-reason
npm test -- --reporter=verbose > $W/t3-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests " $W/t3-suite.log
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/t3-suite.log
npm run build > $W/t3-build.log 2>&1; echo "build exit $?"
grep -E "built|error" $W/t3-build.log
```

Expected: `tests exit 0`, всё passed, `0`, `build exit 0`, `✓ built`.

- [ ] **Step 3: Коммит**

```bash
git add package.json package-lock.json
git commit -m "chore: поднять версию пакета до 0.16.3"
git status -s
```

Expected: `git status -s` пуст.

---

### Task 4: Выпуск — только по слову владельца

- [ ] **Step 1: Пуш и `Test`**

После слова владельца. Запуск workflow появляется не сразу после пуша, поэтому он выбирается по полному SHA версионного коммита, а не последним в списке: последний может оказаться прежним запуском.

```bash
SHA=$(git rev-parse HEAD)
git push origin main
for attempt in $(seq 1 24); do
    TEST_ID=$(gh run list --workflow Test --commit "$SHA" --json databaseId --jq '.[0].databaseId')
    [ -n "$TEST_ID" ] && break
    sleep 5
done
echo "Test run: $TEST_ID"
gh run watch "$TEST_ID" --exit-status; echo "test exit $?"
```

Expected: номер запуска не пуст; `test exit 0` — оба джоба, `test` и `vue-floor`, успешны. Если оболочка не даёт `sleep` в переднем плане, тот же цикл ожидания запускается в фоне или через Monitor. Пустой номер после двух минут или `test exit` не `0` — остановиться и сообщить владельцу, тег не ставить.

- [ ] **Step 2: Тег и публикация**

```bash
git tag v0.16.3 "$SHA" && git push origin v0.16.3
for attempt in $(seq 1 24); do
    PUBLISH_ID=$(gh run list --workflow Publish --commit "$SHA" --json databaseId --jq '.[0].databaseId')
    [ -n "$PUBLISH_ID" ] && break
    sleep 5
done
echo "Publish run: $PUBLISH_ID"
gh run watch "$PUBLISH_ID" --exit-status; echo "publish exit $?"
```

Expected: номер запуска не пуст; `publish exit 0`. Только после этого — проверки npm:

```bash
npm view @boobooking/dashboard-ui-components@0.16.3 version
npm view @boobooking/dashboard-ui-components dist-tags.latest
```

Expected: `0.16.3` и `0.16.3`.

---

## Отличия от спеки

- В `download.server.test.js` добавлена цепочка перенаправлений `/old-export` → `/export` → `/login`: она закрепляет риск спеки §10 «`redirectUrl` — адрес после всех перенаправлений».
- В тестах отказа с кодом и перенаправления проверяется и `toBeInstanceOf(Error)`: поля добавляются к прежнему `Error`, а не к другому объекту.
- Ожидаемые числа тестов посчитаны заранее; если исполнитель получит другое — сверить, откуда разница, и записать решение в журнал.

# Pagination, NavigationMenuElement и языки — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Выпустить `@boobooking/dashboard-ui-components` 0.8.0 с плагином `dashboardUi` (язык `ru`/`en` и функция перехода по ссылке), английскими текстами всех компонентов и новыми `Pagination` и `NavigationMenuElement`, и перевести на них cashback.

**Architecture:** Тексты — в одном модуле словарей; язык компонента берётся из пропа `lang`, иначе из плагина, иначе `ru` (миксин `withLang`). Ссылки новых компонентов — настоящие `<a href>`; обычный клик уходит в `navigate(href)` из плагина по правилам `shouldIntercept` Inertia (миксин `withNavigation`), без плагина браузер идёт по ссылке сам. Пакет не зависит ни от Inertia, ни от роутера.

**Tech Stack:** Vue 3.5 (Options API, `provide`/`inject`, миксины), Tailwind 4 с префиксом `bb`, vitest 5 + @vue/test-utils + happy-dom, Pikaday, Vite 8; cashback — Laravel + Inertia 3.6.1.

**Spec:** `docs/superpowers/specs/2026-09-27-pagination-navigation-i18n-design.md`

## Global Constraints

- **Репозитории.** Пакет: `/Users/boobooking/Code/dashboard-ui-components`, ветка `feature/pagination-navigation-i18n`. cashback: `/Users/boobooking/Code/mars/cashback`, ветка `feature/package-pagination-navigation` (создаётся в задаче 9). `main` обоих не трогать.
- **Тег, пуш, публикация, вливание в `main` — только по команде владельца.** В cashback не пушить никогда.
- **Пакет не зависит от Inertia и роутеров.** Никаких импортов `@inertiajs/*`, `vue-router`, `@heroicons/*` в `src/`.
- **Без плагина — поведение 0.7.0:** русские тексты те же, ссылки — обычные `<a>` без перехвата.
- **Тексты — только в `src/i18n.js`, в обоих словарях `ru` и `en` с одинаковыми ключами.** В разметке и `<script>` компонентов русских и английских строк интерфейса нет.
- **Язык:** проп `lang` (`'ru'` | `'en'`, по умолчанию `null`, `validator`) главнее плагина; плагин главнее умолчания `ru`. Явно переданный текст (`cancel-button-text`, `title` у `DownloadLink`) главнее языка.
- **Формат даты `дд.мм.гггг` и `firstDay: 1` — в обоих языках.**
- **Перехват клика — ровно правила `shouldIntercept` Inertia:** не перехватывать при `defaultPrevented`, `isContentEditable` у `event.target`, Alt/Ctrl/Meta/Shift, `target` ссылки кроме `''`/`'_self'`, `button !== 0`.
- **Префикс `bb:`** у каждой утилиты в разметке, классы в `:class` — литералами (проверяет `tests/utilityPrefix.test.js`).
- **Проверки пакета:** `npm test -- --reporter=verbose` зелёный и без диагностик — поиск `\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled` пуст; `npm run build` без строк с `warn` (без учёта регистра).
- **Рабочий каталог вне репозиториев:** `P=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/pagination-i18n`.
- **Файлы Chrome DevTools MCP** (`filePath` у `take_screenshot`/`evaluate_script`) пишутся только внутрь `/Users/boobooking/Code/mars/cashback`: писать в `/Users/boobooking/Code/mars/cashback/.superpowers/tmp-shots/` и сразу `mv` в `$P/…`; в конце задачи `tmp-shots` удалить.
- **Браузер:** не трогать чужие вкладки (`list_pages` покажет их; например certificates.test, payments.test). Свои вкладки — в изолированных контекстах, названных в задаче, и закрывать в конце задачи.
- **cashback:** artisan — только `docker exec cashback-backend php /var/www/artisan …`, никакого `tinker`; администратор приёмки — через `user:create` (вопросы по порядку: `Email`, `Имя`, `Пароль`, `Пароль ещё раз`; ответы через `printf … | docker exec -i …`); модалку отправки письма на Services никогда не подтверждать.
- **zsh:** `PIPESTATUS` нет — `out=$(cmd 2>&1); rc=$?`; разделитель в `echo` — `"-----"` в кавычках.

## Review Focus

1. **Ссылка пагинации без адреса** (`links.prev` отсутствует, `null`, пустая строка) — кнопки нет, ссылки на `#` нет. Проверка — задача 5, шаг 1 (случаи `links: {}` и `prev: null`).
2. **Приложение без плагина** — клик по ссылке пакета не отменяется, браузер идёт по адресу сам; тексты русские. Проверка — задача 5 и 6 («без плагина»), задача 3 («без плагина»).
3. **Клик «открыть в новой вкладке»** (Ctrl/Cmd/Shift, средняя кнопка) — не перехватывается. Проверка — задача 4 (таблица), задача 5 и 6 (Ctrl-клик), задача 9–10 (в браузере).
4. **Английский на вложенных компонентах** — `lang="en"` на `SelectDateInterval` доходит до календарей. Проверка — задача 3, шаг 1.
5. **Существующие русские тексты не изменились** — вид 0.7.0 в `ru`. Проверка — задача 8 (сверка playground с задачей 1).

## File Structure

| Задача | Файлы | Ответственность |
|---|---|---|
| 1 | — | снимки playground «до» (0.7.0) |
| 2 | `src/i18n.js`, `src/plugin.js`, `src/lang.js`, `src/index.js`, `tests/plugin.test.js`, `tests/i18n.test.js` | словари, плагин, миксин языка |
| 3 | `src/components/{ConfirmationModal,DownloadLink,DropdownButtonWithAction,PickDay,SelectDateInterval}.vue`, `tests/i18n.test.js` | тексты компонентов из словарей |
| 4 | `src/navigation.js`, `tests/navigation.test.js` | правило перехвата клика и миксин перехода |
| 5 | `src/components/Pagination.vue`, `src/components/icons/ArrowNarrow{Left,Right}.vue`, `src/index.js`, `tests/Pagination.test.js` | компонент пагинации |
| 6 | `src/components/NavigationMenuElement.vue`, `src/index.js`, `tests/NavigationMenuElement.test.js` | пункт меню шапки |
| 7 | `playground/*`, `README.md` | демо и документация |
| 8 | — | приёмка playground «после» |
| 9 | `package.json`, `package-lock.json` (пакет); cashback — правки без коммита | версия 0.8.0; проверка tarball на cashback; **стоп** |
| 10 | cashback: `package.json`, `package-lock.json` | после публикации — коммит перевода cashback |

---

### Task 1: Снимки playground «до»

Коммита нет. Фиксирует вид 0.7.0, с которым сверяется задача 8.

**Files:** создаются `$P/serve.sh`, `$P/wait.js`, `$P/measure-pg.js`, `$P/before/*`.

**Interfaces:**
- Produces: `$P/before/<ID>.png` для ID ниже; `$P/serve.sh` (отдаёт `playground/dist` на `0.0.0.0:8765`); `$P/wait.js`.

- [ ] **Step 1: Сборка и сервер**

```bash
P=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/pagination-i18n
mkdir -p "$P/before" "$P/after" "$P/cashback"
cd /Users/boobooking/Code/dashboard-ui-components
test "$(git branch --show-current)" = "feature/pagination-navigation-i18n" || { echo "ПРОВАЛ: не та ветка"; exit 1; }
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
rm -rf playground/dist
out=$(npx vite build --config vite.playground.config.js 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
cat > "$P/serve.sh" <<'EOF'
#!/bin/zsh
pkill -f "http.server 8765" 2>/dev/null
cd /Users/boobooking/Code/dashboard-ui-components/playground/dist || exit 1
nohup python3 -m http.server 8765 --bind 0.0.0.0 >/dev/null 2>&1 &
sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8765/host.html
EOF
chmod +x "$P/serve.sh" && "$P/serve.sh"
```

Expected: `200`.

- [ ] **Step 2: Скрипты съёмки**

Снимки сравниваются попиксельно, поэтому всё, что меняется само по себе, фиксируется.

`$P/fixed-date.js` — передаётся в `navigate_page` параметром `initScript` при каждом открытии страницы: «сегодня» в календаре — 15.09.2026, в какой бы день ни шла приёмка.

```js
(() => {
    const fixed = new Date(2026, 8, 15, 12, 0, 0).getTime();
    const RealDate = Date;
    class FixedDate extends RealDate {
        constructor(...args) {
            super(...(args.length ? args : [fixed]));
        }
        static now() {
            return fixed;
        }
    }
    window.Date = FixedDate;
})();
```

`$P/wait.js` (`evaluate_script`, результат должен быть `0`): дожидается конечных переходов и ставит бесконечные анимации (пульсация `Dot`) на паузу в нулевой фазе.

```js
async () => {
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const finite = (a) => a.effect?.getComputedTiming().iterations !== Infinity;
    const running = () => document.getAnimations().filter((a) => a.playState === "running" && finite(a));
    await frame();
    await frame();
    for (let i = 0; i < 20 && running().length > 0; i++) {
        await Promise.all(running().map((a) => a.finished.catch(() => null)));
        await frame();
    }
    for (const a of document.getAnimations()) {
        if (!finite(a)) {
            a.pause();
            a.currentTime = 0;
        }
    }
    await frame();
    return running().length;
}
```

`$P/measure-pg.js` (`evaluate_script` с `filePath`): прямоугольник каждой секции playground вместе с её открытыми всплывающими частями (меню, календарь) в координатах вьюпорта и прямоугольник открытой модалки. Сравнение режет снимки по этим областям, поэтому положение секции на странице (прокрутка, секции ниже) на него не влияет.

```js
() => {
    const rect = (el) => {
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    const visible = (el) => el.getClientRects().length > 0;
    const union = (rects) => {
        const x1 = Math.min(...rects.map((r) => r.x));
        const y1 = Math.min(...rects.map((r) => r.y));
        const x2 = Math.max(...rects.map((r) => r.x + r.w));
        const y2 = Math.max(...rects.map((r) => r.y + r.h));
        return { x: Math.floor(x1), y: Math.floor(y1), w: Math.ceil(x2 - x1), h: Math.ceil(y2 - y1) };
    };
    const sections = {};
    for (const section of document.querySelectorAll("section")) {
        const title = section.querySelector("h2")?.textContent.trim();
        if (!title) continue;
        // Поддерево элемента с position: fixed (модалка на весь экран — и корень,
        // и обёртка min-h-screen внутри, даже у закрытой) — не часть секции;
        // панель открытой модалки меряется отдельно (dialog).
        const fixedRoots = [...section.querySelectorAll("*")].filter((el) => getComputedStyle(el).position === "fixed");
        const parts = [section, ...section.querySelectorAll("*")]
            .filter((el) => visible(el) && !fixedRoots.some((root) => root.contains(el)))
            .map(rect);
        sections[title] = union(parts);
    }
    const dialog = [...document.querySelectorAll('[role="dialog"]')].find(visible);
    return {
        dpr: devicePixelRatio,
        viewport: { w: innerWidth, h: innerHeight },
        sections,
        dialog: dialog ? union([rect(dialog)]) : null,
    };
}
```

`$P/crop.py` — вырезает область снимка по его замеру:

```python
import json
from PIL import Image

# ID снимка → область: заголовок секции playground, «dialog» или вся страница до
# конца секции DropdownButtonWithAction (последней секции 0.7.0).
SECTIONS = {
    'calendar': 'PickDay', 'interval': 'SelectDateInterval', 'dropdown': 'DropdownButtonWithAction',
    'download': 'DownloadLink', 'pagination': 'Pagination', 'menu': 'NavigationMenuElement',
    'en': 'lang="en"', 'en-calendar': 'lang="en"',
}

def region(state, m):
    if state == 'page':
        last = m['sections']['DropdownButtonWithAction']
        return (0, 0, m['viewport']['w'], last['y'] + last['h'])
    if state in ('warning', 'en-modal'):
        d = m['dialog']
        return (d['x'], d['y'], d['x'] + d['w'], d['y'] + d['h'])
    s = m['sections'][SECTIONS[state]]
    return (s['x'], s['y'], s['x'] + s['w'], s['y'] + s['h'])

def crop(png, js, state):
    m = json.load(open(js))
    k = m['dpr']
    box = tuple(round(v * k) for v in region(state, m))
    return Image.open(png).convert('RGB').crop(box)
```

- [ ] **Step 3: Снимки**

Вкладка — `new_page` на `http://host.docker.internal:8765/`, `isolatedContext: "pg"`; `emulate` с `viewport: "1440x900x1"`. Для каждой страницы `S` из `bare` (`/`) и `host` (`/host.html`):

| ID | Действие перед снимком | Снимок |
|---|---|---|
| `<S>-page` | — (прокрутка в самом верху) | `fullPage: true` |
| `<S>-calendar` | секция «PickDay»: `scrollIntoView({ block: "center" })`, клик по полю | вьюпорт |
| `<S>-interval` | секция «SelectDateInterval»: `scrollIntoView({ block: "center" })` | вьюпорт |
| `<S>-warning` | секция «ConfirmationModal», «Жёлтая» | вьюпорт; после снимка — кнопка отмены |
| `<S>-dropdown` | секция «DropdownButtonWithAction»: `scrollIntoView({ block: "center" })`, стрелка первой кнопки с действиями | вьюпорт; после снимка — Escape |
| `<S>-download` | секция «DownloadLink»: `scrollIntoView({ block: "center" })` | вьюпорт |

Каждый снимок: `navigate_page` на страницу с `initScript` = содержимое `$P/fixed-date.js`, действие, `$P/wait.js` → `0`, снимок, сразу за ним `$P/measure-pg.js` → `<ID>.json`. Область для сравнения (по `$P/crop.py`) должна целиком лежать во вьюпорте (для вьюпортных снимков) — проверить по JSON; если нет, прокрутить так, чтобы лежала, и переснять. Файлы — в `…/cashback/.superpowers/tmp-shots/`, затем `mv` в `$P/before/`. Всего 12 пар PNG + JSON.

Остановить сервер: `pkill -f "http.server 8765"`. Закрыть свою вкладку. Удалить `tmp-shots`.

---

### Task 2: Словари, плагин и миксин языка

**Files:**
- Create: `src/i18n.js`, `src/plugin.js`, `src/lang.js`, `tests/plugin.test.js`, `tests/i18n.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Produces:
  - `src/i18n.js`: `export const LANGS = ['ru', 'en']`; `export function isLang(value): boolean`; `export const messages = { ru: {…}, en: {…} }` с ключами `cancel`, `download`, `openMenu`, `previousMonth`, `nextMonth`, `months` (12), `weekdays` (7, с воскресенья), `weekdaysShort` (7), `dateFrom`, `dateTo`, `previousPage`, `nextPage`, `resultsBefore`, `resultsOf`, `resultsAfter`.
  - `src/plugin.js`: `export const injectSettings` (объект для опции `inject`, даёт `this.uiSettings` = `{ lang, navigate }`); `export const dashboardUi` (плагин `install(app, options)`).
  - `src/lang.js`: `export const withLang` — миксин: проп `lang`, вычисляемые `resolvedLang` и `texts`.
  - `src/index.js`: экспорт `dashboardUi`.

- [ ] **Step 1: Тесты**

`tests/plugin.test.js`:

```js
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { dashboardUi } from '../src/plugin.js'

describe('dashboardUi', () => {
    const cases = [
        { name: 'без параметров', options: undefined, throws: null },
        { name: 'lang ru', options: { lang: 'ru' }, throws: null },
        { name: 'lang en и функция navigate', options: { lang: 'en', navigate: () => {} }, throws: null },
        { name: 'неизвестный lang', options: { lang: 'de' }, throws: /lang «de»/ },
        { name: 'navigate не функция', options: { navigate: '/next' }, throws: /navigate/ },
        // «Не передано» — только отсутствующий ключ. Явные null и undefined —
        // переданные значения и отклоняются, как любые другие.
        { name: 'lang: null', options: { lang: null }, throws: /lang «null»/ },
        { name: 'navigate: null', options: { navigate: null }, throws: /navigate/ },
        { name: 'lang: undefined', options: { lang: undefined }, throws: /lang «undefined»/ },
        { name: 'navigate: undefined', options: { navigate: undefined }, throws: /navigate/ },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const install = () => createApp({ render: () => null }).use(dashboardUi, testCase.options)

            if (testCase.throws === null) {
                expect(install).not.toThrow()
            } else {
                expect(install).toThrow(testCase.throws)
            }
        })
    }
})
```

`tests/i18n.test.js` (задача 3 допишет сюда проверки компонентов):

```js
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { messages } from '../src/i18n.js'

describe('словари', () => {
    it('ключи ru и en совпадают', () => {
        expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.ru).sort())
    })

    it('в календаре 12 месяцев и 7 дней недели в обоих языках', () => {
        for (const lang of ['ru', 'en']) {
            expect(messages[lang].months).toHaveLength(12)
            expect(messages[lang].weekdays).toHaveLength(7)
            expect(messages[lang].weekdaysShort).toHaveLength(7)
        }
    })
})
```

- [ ] **Step 2: Тесты падают**

`npx vitest run tests/plugin.test.js tests/i18n.test.js` — Expected: FAIL, модулей `../src/plugin.js` и `../src/i18n.js` нет.

- [ ] **Step 3: `src/i18n.js`**

```js
// Все тексты пакета. Ключи в словарях одинаковые: компонент берёт текст по
// ключу из словаря своего языка (миксин withLang), а не пишет строку сам.
export const LANGS = ['ru', 'en']

export function isLang(value) {
    return LANGS.includes(value)
}

export const messages = {
    ru: {
        cancel: 'Отмена',
        download: 'Скачать',
        openMenu: 'Открыть меню',
        previousMonth: 'Предыдущий месяц',
        nextMonth: 'Следующий месяц',
        months: [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
        ],
        // Pikaday ждёт дни недели с воскресенья, какой бы ни был firstDay.
        weekdays: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
        weekdaysShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
        dateFrom: 'от',
        dateTo: 'до',
        previousPage: 'Предыдущая',
        nextPage: 'Следующая',
        // «Показаны результаты [1 - 15] из [40]»: числа — в отдельных элементах,
        // поэтому фраза хранится кусками вокруг них.
        resultsBefore: 'Показаны результаты',
        resultsOf: 'из',
        resultsAfter: '',
    },
    en: {
        cancel: 'Cancel',
        download: 'Download',
        openMenu: 'Open menu',
        previousMonth: 'Previous month',
        nextMonth: 'Next month',
        months: [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ],
        weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        dateFrom: 'from',
        dateTo: 'to',
        previousPage: 'Previous',
        nextPage: 'Next',
        // «Showing [1 - 15] of [40] results»
        resultsBefore: 'Showing',
        resultsOf: 'of',
        resultsAfter: 'results',
    },
}
```

- [ ] **Step 4: `src/plugin.js`**

```js
import { isLang, LANGS } from './i18n.js'

// Ключ настроек в provide приложения. Наружу не экспортируется: приложение
// задаёт настройки через dashboardUi, компоненты читают их через injectSettings.
const settingsKey = Symbol('dashboardUi')

// Без плагина: русский язык, ссылки — обычные <a> без перехвата клика.
const defaultSettings = Object.freeze({ lang: 'ru', navigate: null })

export const injectSettings = {
    uiSettings: { from: settingsKey, default: () => defaultSettings },
}

export const dashboardUi = {
    install(app, options) {
        const given = options ?? {}

        // Не передан (ключа нет) — умолчание; переданное значение, включая
        // null и undefined, проверяется.
        const lang = Object.hasOwn(given, 'lang') ? given.lang : 'ru'
        // Неверный язык ловится сразу, а не русским текстом в английском приложении.
        if (!isLang(lang)) {
            throw new Error(`dashboardUi: неизвестный lang «${lang}», допустимы: ${LANGS.join(', ')}`)
        }

        const hasNavigate = Object.hasOwn(given, 'navigate')
        const navigate = hasNavigate ? given.navigate : null
        if (hasNavigate && typeof navigate !== 'function') {
            throw new Error('dashboardUi: navigate должен быть функцией (href) => …')
        }

        app.provide(settingsKey, Object.freeze({ lang, navigate }))
    },
}
```

- [ ] **Step 5: `src/lang.js`**

```js
import { isLang, messages } from './i18n.js'
import { injectSettings } from './plugin.js'

// Язык компонента: проп lang, если задан, иначе язык плагина dashboardUi,
// иначе ru. Компонент берёт тексты из this.texts.
export const withLang = {
    inject: injectSettings,

    props: {
        lang: {
            type: String,
            default: null,
            validator: (value) => value === null || isLang(value),
        },
    },

    computed: {
        resolvedLang() {
            return this.lang ?? this.uiSettings.lang
        },

        texts() {
            return messages[this.resolvedLang]
        },
    },
}
```

- [ ] **Step 6: Экспорт плагина**

В `src/index.js` после строки `import './styles/index.css'` и пустой строки добавить:

```js
export { dashboardUi } from './plugin.js'
```

- [ ] **Step 7: Тесты проходят**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
out=$(npm test -- --reporter=verbose 2>&1); rc=$?; echo "$out" | tail -6
test "$rc" -eq 0 || { echo "ПРОВАЛ: npm test"; exit 1; }
noise=$(echo "$out" | grep -E '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled')
test -z "$noise" || { echo "ПРОВАЛ: диагностики:"; echo "$noise"; exit 1; }
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения"; exit 1; }
echo ok
```

- [ ] **Step 8: Commit**

```bash
git add src/i18n.js src/plugin.js src/lang.js src/index.js tests/plugin.test.js tests/i18n.test.js
git commit -m "feat: добавить плагин dashboardUi и словари ru/en"
```

---

### Task 3: Тексты компонентов из словарей

**Files:**
- Modify: `src/components/ConfirmationModal.vue`, `DownloadLink.vue`, `DropdownButtonWithAction.vue`, `PickDay.vue`, `SelectDateInterval.vue`
- Modify: `tests/i18n.test.js`

**Interfaces:**
- Consumes: `withLang` (`src/lang.js`), `dashboardUi` (`src/plugin.js`), `messages` (`src/i18n.js`).
- Produces: у пяти компонентов проп `lang`; `cancelButtonText` у `ConfirmationModal` и `title` у `DownloadLink` по умолчанию `null`.

- [ ] **Step 1: Тесты**

Дописать в конец `tests/i18n.test.js` (импорты — в начало файла, к существующим):

```js
import { afterEach } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { dashboardUi } from '../src/plugin.js'
import ConfirmationModal from '../src/components/ConfirmationModal.vue'
import DownloadLink from '../src/components/DownloadLink.vue'
import DropdownButtonWithAction from '../src/components/DropdownButtonWithAction.vue'
import PickDay from '../src/components/PickDay.vue'
import SelectDateInterval from '../src/components/SelectDateInterval.vue'

enableAutoUnmount(afterEach)

const inApp = (options) => ({ plugins: [[dashboardUi, options]] })

describe('ConfirmationModal: кнопка отмены', () => {
    const cases = [
        { name: 'без плагина — ru', global: {}, props: {}, expected: 'Отмена' },
        { name: 'плагин en', global: inApp({ lang: 'en' }), props: {}, expected: 'Cancel' },
        { name: 'проп lang ru главнее плагина en', global: inApp({ lang: 'en' }), props: { lang: 'ru' }, expected: 'Отмена' },
        { name: 'явный текст главнее языка', global: inApp({ lang: 'en' }), props: { cancelButtonText: 'Назад' }, expected: 'Назад' },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const wrapper = mount(ConfirmationModal, {
                props: { isOpen: true, actionButtonText: 'OK', ...testCase.props },
                global: testCase.global,
            })
            // Кнопка отмены — последняя кнопка модалки (после кнопки действия).
            const buttons = wrapper.findAll('button')

            expect(buttons[buttons.length - 1].text()).toBe(testCase.expected)
        })
    }
})

describe('DownloadLink: подпись', () => {
    const cases = [
        { name: 'без плагина — ru', global: {}, props: {}, expected: 'Скачать' },
        { name: 'плагин en', global: inApp({ lang: 'en' }), props: {}, expected: 'Download' },
        { name: 'явный title главнее языка', global: inApp({ lang: 'en' }), props: { title: 'скачать xls' }, expected: 'скачать xls' },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const wrapper = mount(DownloadLink, { props: { url: '/export', ...testCase.props }, global: testCase.global })
            const link = wrapper.get('a')

            expect(link.text()).toBe(testCase.expected)
            expect(link.attributes('title')).toBe(testCase.expected)
        })
    }
})

describe('DropdownButtonWithAction: подпись стрелки', () => {
    const cases = [
        { name: 'без плагина — ru', global: {}, expected: 'Открыть меню' },
        { name: 'плагин en', global: inApp({ lang: 'en' }), expected: 'Open menu' },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const wrapper = mount(DropdownButtonWithAction, {
                slots: { button: 'Основное', actions: '<a href="#">Действие</a>' },
                global: testCase.global,
            })

            expect(wrapper.findAll('button').some((button) => button.text().includes(testCase.expected))).toBe(true)
        })
    }
})

describe('SelectDateInterval: подсказки и оба календаря', () => {
    const cases = [
        { name: 'без плагина — ru', global: {}, props: {}, placeholders: ['от', 'до'], weekday: 'Пн', absent: 'Mon' },
        { name: 'плагин en', global: inApp({ lang: 'en' }), props: {}, placeholders: ['from', 'to'], weekday: 'Mon', absent: 'Пн' },
        { name: 'проп lang en главнее плагина ru и доходит до календарей', global: inApp({ lang: 'ru' }), props: { lang: 'en' }, placeholders: ['from', 'to'], weekday: 'Mon', absent: 'Пн' },
        { name: 'проп lang ru главнее плагина en и доходит до календарей', global: inApp({ lang: 'en' }), props: { lang: 'ru' }, placeholders: ['от', 'до'], weekday: 'Пн', absent: 'Mon' },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const wrapper = mount(SelectDateInterval, { props: { header: 'Интервал', ...testCase.props }, global: testCase.global })

            expect(wrapper.findAll('input').map((input) => input.attributes('placeholder'))).toEqual(testCase.placeholders)

            // Оба вложенных PickDay: шапки их календарей — на языке интервала.
            const headers = wrapper.findAll('.pika-table thead').map((thead) => thead.text())
            expect(headers).toHaveLength(2)
            for (const header of headers) {
                expect(header).toContain(testCase.weekday)
                expect(header).not.toContain(testCase.absent)
            }
        })
    }
})

describe('PickDay: календарь', () => {
    const cases = [
        { name: 'без плагина — ru', global: {}, expected: 'Пн', absent: 'Mon' },
        { name: 'плагин en', global: inApp({ lang: 'en' }), expected: 'Mon', absent: 'Пн' },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const wrapper = mount(PickDay, { global: testCase.global })
            // Pikaday рисует календарь в контейнер сразу (bound: false);
            // шапка таблицы — краткие дни недели.
            const header = wrapper.get('.pika-table thead').text()

            expect(header).toContain(testCase.expected)
            expect(header).not.toContain(testCase.absent)
        })
    }
})
```

Если в happy-dom таблица календаря появляется только после открытия, перед чтением шапки открыть календарь: `await wrapper.get('input').trigger('click')` — и записать это в отчёт.

- [ ] **Step 2: Тесты падают**

`npx vitest run tests/i18n.test.js` — Expected: FAIL на случаях с `en` (тексты русские) и на случае «явный текст главнее языка» у `DownloadLink` не падает (он проходит и сейчас) — это нормально.

- [ ] **Step 3: `ConfirmationModal.vue`**

В `<script>`: импорт `import { withLang } from "../lang.js";` после импорта `Warning`; в объект компонента после `components: {…},` добавить `mixins: [withLang],`; проп

```js
        cancelButtonText: {
            type: String,
            default: "Отмена",
        },
```

заменить на

```js
        // Не задан — текст кнопки из словаря языка; явно переданный главнее языка.
        cancelButtonText: {
            type: String,
            default: null,
        },
```

В шаблоне `{{ cancelButtonText }}` заменить на `{{ cancelButtonText ?? texts.cancel }}`.

- [ ] **Step 4: `DownloadLink.vue`**

Шаблон: `:title="title"` → `:title="label"`, `{{ title }}` → `{{ label }}`. Скрипт:

```js
import Download from "./icons/Download.vue";
import { withLang } from "../lang.js";

export default {
    components: {
        "download-icon": Download,
    },

    mixins: [withLang],

    props: {
        url: {
            type: String,
            required: true,
        },
        // Не задан — подпись из словаря языка; явно переданная главнее языка.
        title: {
            type: String,
            default: null,
        },
    },

    computed: {
        label() {
            return this.title ?? this.texts.download;
        },
    },
};
```

- [ ] **Step 5: `DropdownButtonWithAction.vue`**

Импорт `import { withLang } from "../lang.js";` после импорта `Popup`; после `components: {Popup},` — `mixins: [withLang],`; в шаблоне `<span class="bb:sr-only">Открыть меню</span>` → `<span class="bb:sr-only">{{ texts.openMenu }}</span>`.

- [ ] **Step 6: `PickDay.vue`**

Импорт `import { withLang } from "../lang.js";` после импорта `date.js`; после `components: {…},` — `mixins: [withLang],`; в `mounted()` объект `i18n: { … }` целиком заменить на

```js
            // Язык берётся при монтировании: Pikaday собирается один раз.
            i18n: {
                previousMonth: this.texts.previousMonth,
                nextMonth: this.texts.nextMonth,
                months: this.texts.months,
                weekdays: this.texts.weekdays,
                weekdaysShort: this.texts.weekdaysShort,
            },
```

`firstDay: 1`, `parse`, `toString` не менять.

- [ ] **Step 7: `SelectDateInterval.vue`**

Импорт `import { withLang } from "../lang.js";` после импорта `PickDay`; после `components: {…},` — `mixins: [withLang],`; в шаблоне два `<pick-day>`:

```html
                    <pick-day v-model="userDateFrom" class="bb:flex-1 bb:min-w-36 bb:pl-3" :placeholder-text="texts.dateFrom" :lang="resolvedLang"/>
                    <pick-day v-model="userDateTo" class="bb:flex-1 bb:min-w-36 bb:pl-3" :placeholder-text="texts.dateTo" :lang="resolvedLang"/>
```

- [ ] **Step 8: Нет строк интерфейса вне словаря**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
python3 - <<'EOF'
import glob, re
for f in sorted(glob.glob('src/components/**/*.vue', recursive=True)):
    s = open(f).read()
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S); s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    hits = [l.strip() for l in s.split('\n') if re.search('[А-Яа-яЁё]', re.sub(r'(^|\s)//.*$', '', l))]
    if hits: print(f, hits)
print('проверено')
EOF
```

Expected: только `проверено` — ни одной кириллической строки вне комментариев.

- [ ] **Step 9: Тесты, сборка**

Те же команды, что в задаче 2, шаг 7. Expected: всё зелёное, без диагностик и предупреждений; старые тесты (`ConfirmationModal`, `DropdownButtonWithAction`, `PickDay` и т. д.) проходят без изменений.

- [ ] **Step 10: Commit**

```bash
git add src/components/ConfirmationModal.vue src/components/DownloadLink.vue src/components/DropdownButtonWithAction.vue src/components/PickDay.vue src/components/SelectDateInterval.vue tests/i18n.test.js
git commit -m "feat: переводить тексты компонентов на английский по lang"
```

---

### Task 4: Перехват клика по ссылке

**Files:**
- Create: `src/navigation.js`, `tests/navigation.test.js`

**Interfaces:**
- Consumes: `injectSettings` (`src/plugin.js`).
- Produces: `export function shouldNavigateInApp(event): boolean`; `export const withNavigation` — миксин с методом `followLink(event, href)`.

- [ ] **Step 1: Тест**

`tests/navigation.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { shouldNavigateInApp } from '../src/navigation.js'

// Минимальный клик по ссылке: левая кнопка, без модификаторов, без target.
const click = (overrides = {}) => ({
    button: 0,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    defaultPrevented: false,
    target: { isContentEditable: false },
    currentTarget: { target: '' },
    ...overrides,
})

describe('shouldNavigateInApp', () => {
    const cases = [
        { name: 'обычный левый клик', event: click(), expected: true },
        { name: 'target=_self', event: click({ currentTarget: { target: '_self' } }), expected: true },
        { name: 'Alt', event: click({ altKey: true }), expected: false },
        { name: 'Ctrl', event: click({ ctrlKey: true }), expected: false },
        { name: 'Meta (Cmd)', event: click({ metaKey: true }), expected: false },
        { name: 'Shift', event: click({ shiftKey: true }), expected: false },
        { name: 'средняя кнопка', event: click({ button: 1 }), expected: false },
        { name: 'target=_blank', event: click({ currentTarget: { target: '_blank' } }), expected: false },
        { name: 'событие уже отменено', event: click({ defaultPrevented: true }), expected: false },
        { name: 'клик из редактируемого содержимого', event: click({ target: { isContentEditable: true } }), expected: false },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            expect(shouldNavigateInApp(testCase.event)).toBe(testCase.expected)
        })
    }
})
```

- [ ] **Step 2: Тест падает** — `npx vitest run tests/navigation.test.js`: модуля нет.

- [ ] **Step 3: `src/navigation.js`**

```js
import { injectSettings } from './plugin.js'

// Какой клик по ссылке пакета отдать функции перехода приложения. Правила —
// как у Inertia Link (shouldIntercept в @inertiajs/core): всё, чем пользователь
// просит браузер открыть ссылку по-своему — новая вкладка, окно, скачивание, —
// остаётся браузеру.
export function shouldNavigateInApp(event) {
    const target = event.currentTarget?.target ?? ''

    return !(
        event.defaultPrevented ||
        event.target?.isContentEditable === true ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (target !== '' && target !== '_self') ||
        event.button !== 0
    )
}

// Ссылка пакета — настоящий <a href>. Обычный клик уходит в navigate(href)
// плагина dashboardUi; без navigate браузер идёт по ссылке сам.
export const withNavigation = {
    inject: injectSettings,

    methods: {
        followLink(event, href) {
            const navigate = this.uiSettings.navigate

            if (navigate === null || !shouldNavigateInApp(event)) {
                return
            }

            event.preventDefault()
            navigate(href)
        },
    },
}
```

- [ ] **Step 4: Тесты, сборка** — команды задачи 2, шаг 7.

- [ ] **Step 5: Commit**

```bash
git add src/navigation.js tests/navigation.test.js
git commit -m "feat: переходить по ссылкам пакета через navigate приложения"
```

---

### Task 5: Pagination

**Files:**
- Create: `src/components/Pagination.vue`, `src/components/icons/ArrowNarrowLeft.vue`, `src/components/icons/ArrowNarrowRight.vue`, `tests/Pagination.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Consumes: `withLang`, `withNavigation`, `dashboardUi`.
- Produces: экспорт `Pagination` — пропы `links: Object` (required), `meta: Object` (required), `lang`.

- [ ] **Step 1: Тест**

`tests/Pagination.test.js`:

```js
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import Pagination from '../src/components/Pagination.vue'
import { dashboardUi } from '../src/plugin.js'

enableAutoUnmount(afterEach)
// Компонент монтируется в документ (attachTo), иначе клик не всплывает до window
// и помощник click() не узнает, отменён ли переход.
afterEach(() => {
    document.body.innerHTML = ''
})

const NEXT = 'https://example.test/list?source=vetkit&page=3'
const PREV = 'https://example.test/list?source=vetkit&page=1'
const META = { from: 16, to: 30, total: 40 }

const text = (wrapper) => wrapper.text().replace(/\s+/g, ' ').trim()

// Клик по ссылке, как у пользователя. Слушатель на window срабатывает последним
// и записывает, отменил ли компонент переход; затем отменяет переход сам, чтобы
// happy-dom не уходил по адресу.
function click(element, init = {}) {
    let prevented = null
    const record = (event) => {
        prevented = event.defaultPrevented
        event.preventDefault()
    }
    window.addEventListener('click', record)
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }))
    window.removeEventListener('click', record)

    return prevented
}

// null у обязательных links/meta Vue сопровождает предупреждением о типе пропа —
// это ожидаемо (README: компонент не падает на null, но Vue предупредит).
// Предупреждения собираются, а не пишутся в stderr: вывод тестов остаётся чистым.
function mountPagination({ props, plugin } = {}) {
    const errors = []
    const warnings = []
    const wrapper = mount(Pagination, {
        props,
        attachTo: document.body,
        global: {
            plugins: plugin ? [[dashboardUi, plugin]] : [],
            config: {
                errorHandler: (error) => errors.push(error),
                warnHandler: (message) => warnings.push(message),
            },
        },
    })

    return { wrapper, errors, warnings }
}

describe('Pagination: что рисуется', () => {
    const cases = [
        { name: 'обе ссылки', links: { prev: PREV, next: NEXT }, meta: META, hrefs: [PREV, NEXT] },
        { name: 'только следующая', links: { prev: null, next: NEXT }, meta: META, hrefs: [NEXT] },
        { name: 'только предыдущая', links: { prev: PREV, next: null }, meta: META, hrefs: [PREV] },
        { name: 'без ключей prev/next — ни одной ссылки, в том числе на #', links: {}, meta: META, hrefs: [] },
        { name: 'пустые адреса — ни одной ссылки', links: { prev: '', next: '' }, meta: META, hrefs: [] },
        { name: 'links — null, записи есть — строка результатов без ссылок', links: null, meta: META, hrefs: [] },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const { wrapper, errors } = mountPagination({ props: { links: testCase.links, meta: testCase.meta } })

            expect(errors).toEqual([])
            expect(wrapper.find('nav').exists()).toBe(true)
            expect(wrapper.findAll('a').map((a) => a.attributes('href'))).toEqual(testCase.hrefs)
            expect(text(wrapper)).toContain('Показаны результаты 16 - 30 из 40')
        })
    }

    it('без from/to строки результатов нет, ссылки остаются', () => {
        const { wrapper, errors } = mountPagination({ props: { links: { prev: null, next: NEXT }, meta: { total: 40 } } })

        expect(errors).toEqual([])
        expect(wrapper.find('nav').exists()).toBe(true)
        expect(text(wrapper)).not.toContain('Показаны результаты')
        expect(wrapper.findAll('a').map((a) => a.attributes('href'))).toEqual([NEXT])
    })

    // Записей нет — meta не задан или total не больше нуля: пагинации нет вовсе.
    const empty = [
        { name: 'total = 0', links: { prev: null, next: null }, meta: { from: null, to: null, total: 0 } },
        { name: 'links и meta — null', links: null, meta: null },
        { name: 'meta без ключей', links: { prev: null, next: NEXT }, meta: {} },
    ]

    for (const testCase of empty) {
        it(`ничего не рисует: ${testCase.name}`, () => {
            const { wrapper, errors } = mountPagination({ props: { links: testCase.links, meta: testCase.meta } })

            expect(errors).toEqual([])
            expect(wrapper.find('nav').exists()).toBe(false)
        })
    }
})

describe('Pagination: тексты', () => {
    const cases = [
        { name: 'без плагина — ru', plugin: null, props: {}, expected: ['Предыдущая', 'Показаны результаты 16 - 30 из 40', 'Следующая'] },
        { name: 'плагин en', plugin: { lang: 'en' }, props: {}, expected: ['Previous', 'Showing 16 - 30 of 40 results', 'Next'] },
        { name: 'проп lang en без плагина', plugin: null, props: { lang: 'en' }, expected: ['Previous', 'Showing 16 - 30 of 40 results', 'Next'] },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const { wrapper } = mountPagination({
                props: { links: { prev: PREV, next: NEXT }, meta: META, ...testCase.props },
                plugin: testCase.plugin,
            })

            for (const fragment of testCase.expected) {
                expect(text(wrapper)).toContain(fragment)
            }
        })
    }
})

describe('Pagination: переход', () => {
    it('обычный клик уходит в navigate с адресом и отменяет переход браузера', () => {
        const visited = []
        const { wrapper } = mountPagination({
            props: { links: { prev: null, next: NEXT }, meta: META },
            plugin: { navigate: (href) => visited.push(href) },
        })

        expect(click(wrapper.get('a').element)).toBe(true)
        expect(visited).toEqual([NEXT])
    })

    it('Ctrl-клик не перехватывается', () => {
        const visited = []
        const { wrapper } = mountPagination({
            props: { links: { prev: null, next: NEXT }, meta: META },
            plugin: { navigate: (href) => visited.push(href) },
        })

        expect(click(wrapper.get('a').element, { ctrlKey: true })).toBe(false)
        expect(visited).toEqual([])
    })

    it('без плагина браузер идёт по ссылке сам', () => {
        const { wrapper } = mountPagination({ props: { links: { prev: null, next: NEXT }, meta: META } })

        expect(click(wrapper.get('a').element)).toBe(false)
    })
})
```

- [ ] **Step 2: Тест падает** — `npx vitest run tests/Pagination.test.js`: компонента нет.

- [ ] **Step 3: Иконки**

`src/components/icons/ArrowNarrowLeft.vue` (контур — `ArrowNarrowLeftIcon` heroicons v1, solid, MIT):

```vue
<template>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z"/>
    </svg>
</template>

<script>
export default {};
</script>
```

`src/components/icons/ArrowNarrowRight.vue`:

```vue
<template>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"/>
    </svg>
</template>

<script>
export default {};
</script>
```

- [ ] **Step 4: `src/components/Pagination.vue`**

Вёрстка — вариант A (`cashback/resources/js/Shared/Pagination.vue`) с префиксом `bb:`.

```vue
<template>
    <nav v-if="hasResults" class="bb-dashboard-ui bb:px-4 bb:flex bb:items-center bb:justify-between bb:sm:px-0">
        <div class="bb:-mt-px bb:w-0 bb:flex-1 bb:flex">
            <a
                v-if="previousPageUrl !== null"
                :href="previousPageUrl"
                class="bb:border-t-2 bb:border-transparent bb:pt-4 bb:pr-1 bb:inline-flex bb:items-center bb:text-sm bb:font-medium bb:text-gray-500 bb:hover:text-gray-700 bb:hover:border-indigo-700"
                @click="followLink($event, previousPageUrl)"
            >
                <arrow-narrow-left class="bb:mr-3 bb:h-5 bb:w-5 bb:text-gray-400"/>
                {{ texts.previousPage }}
            </a>
        </div>
        <div v-if="hasRange" class="bb:hidden bb:md:-mt-px bb:md:flex bb:text-gray-400 bb:text-sm bb:leading-5">
            {{ texts.resultsBefore }}
            <span class="bb:font-medium bb:text-gray-900 bb:mx-1">{{ from }} - {{ to }}</span> {{ texts.resultsOf }}
            <span class="bb:font-medium bb:text-gray-900 bb:mx-1">{{ total }}</span> {{ texts.resultsAfter }}
        </div>
        <div class="bb:-mt-px bb:w-0 bb:flex-1 bb:flex bb:justify-end">
            <a
                v-if="nextPageUrl !== null"
                :href="nextPageUrl"
                class="bb:border-t-2 bb:border-transparent bb:pt-4 bb:pl-1 bb:inline-flex bb:items-center bb:text-sm bb:font-medium bb:text-gray-500 bb:hover:text-gray-700 bb:hover:border-indigo-700"
                @click="followLink($event, nextPageUrl)"
            >
                {{ texts.nextPage }}
                <arrow-narrow-right class="bb:ml-3 bb:h-5 bb:w-5 bb:text-gray-400"/>
            </a>
        </div>
    </nav>
</template>

<script>
import ArrowNarrowLeft from "./icons/ArrowNarrowLeft.vue";
import ArrowNarrowRight from "./icons/ArrowNarrowRight.vue";
import { withLang } from "../lang.js";
import { withNavigation } from "../navigation.js";

// Адрес страницы из links Laravel API Resource: только непустая строка.
// null, отсутствующий ключ и пустая строка — страницы нет, кнопки нет.
function pageUrl(value) {
    return typeof value === "string" && value !== "" ? value : null;
}

export default {
    components: {
        ArrowNarrowLeft,
        ArrowNarrowRight,
    },

    mixins: [withLang, withNavigation],

    props: {
        // links и meta — как их отдаёт Laravel API Resource:
        // links: { prev, next }, meta: { from, to, total }.
        links: {
            type: Object,
            required: true,
        },
        meta: {
            type: Object,
            required: true,
        },
    },

    computed: {
        from() {
            return this.meta?.from;
        },

        to() {
            return this.meta?.to;
        },

        total() {
            return this.meta?.total;
        },

        // Записи есть — пагинация рисуется. Нет meta или total не больше нуля — нет.
        hasResults() {
            return typeof this.total === "number" && this.total > 0;
        },

        // Строка «Показаны результаты X - Y из Z» — только когда известен диапазон.
        hasRange() {
            return typeof this.from === "number" && typeof this.to === "number";
        },

        previousPageUrl() {
            return pageUrl(this.links?.prev);
        },

        nextPageUrl() {
            return pageUrl(this.links?.next);
        },
    },
};
</script>
```

- [ ] **Step 5: Экспорт** — в `src/index.js` после строки экспорта `DropdownButtonWithAction`: `export { default as Pagination } from './components/Pagination.vue'`.

- [ ] **Step 6: Тесты, сборка** — команды задачи 2, шаг 7. Проверка `utilityPrefix` должна пройти и для `Pagination.vue`, и для иконок; диагностик в выводе нет.

- [ ] **Step 7: Commit**

```bash
git add src/components/Pagination.vue src/components/icons/ArrowNarrowLeft.vue src/components/icons/ArrowNarrowRight.vue src/index.js tests/Pagination.test.js
git commit -m "feat: добавить Pagination"
```

---

### Task 6: NavigationMenuElement

**Files:**
- Create: `src/components/NavigationMenuElement.vue`, `tests/NavigationMenuElement.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Consumes: `withNavigation`, `dashboardUi`.
- Produces: экспорт `NavigationMenuElement` — пропы `url: String` (required), `name: String` (required), `isActive: Boolean` (false).

- [ ] **Step 1: Тест**

`tests/NavigationMenuElement.test.js`:

```js
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import NavigationMenuElement from '../src/components/NavigationMenuElement.vue'
import { dashboardUi } from '../src/plugin.js'

enableAutoUnmount(afterEach)
// Как в tests/Pagination.test.js: монтирование в документ, чтобы клик всплывал до window.
afterEach(() => {
    document.body.innerHTML = ''
})

const URL = 'https://example.test/dashboard/services'

// Как в tests/Pagination.test.js: слушатель на window записывает, отменил ли
// компонент переход, и отменяет его сам, чтобы happy-dom не уходил по адресу.
function click(element, init = {}) {
    let prevented = null
    const record = (event) => {
        prevented = event.defaultPrevented
        event.preventDefault()
    }
    window.addEventListener('click', record)
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }))
    window.removeEventListener('click', record)

    return prevented
}

const mountItem = (plugin) => mount(NavigationMenuElement, {
    props: { url: URL, name: 'Анкеты', isActive: false },
    attachTo: document.body,
    global: { plugins: plugin ? [[dashboardUi, plugin]] : [] },
})

describe('NavigationMenuElement', () => {
    it('рисует ссылку с адресом и подписью', () => {
        const link = mountItem(null).get('a')

        expect(link.attributes('href')).toBe(URL)
        expect(link.text()).toBe('Анкеты')
    })

    it('обычный клик уходит в navigate с адресом и отменяет переход браузера', () => {
        const visited = []
        const wrapper = mountItem({ navigate: (href) => visited.push(href) })

        expect(click(wrapper.get('a').element)).toBe(true)
        expect(visited).toEqual([URL])
    })

    it('клик средней кнопкой не перехватывается', () => {
        const visited = []
        const wrapper = mountItem({ navigate: (href) => visited.push(href) })

        expect(click(wrapper.get('a').element, { button: 1 })).toBe(false)
        expect(visited).toEqual([])
    })

    it('без плагина браузер идёт по ссылке сам', () => {
        expect(click(mountItem(null).get('a').element)).toBe(false)
    })
})
```

- [ ] **Step 2: Тест падает.**

- [ ] **Step 3: `src/components/NavigationMenuElement.vue`**

Вёрстка — вариант A (`cashback/resources/js/Shared/NavigationMenuElement.vue`) с префиксом `bb:`.

```vue
<template>
    <a
        :href="url"
        :class="
            isActive
                ? 'bb:border-indigo-400 bb:text-gray-600 bb:focus:border-indigo-700'
                : 'bb:border-transparent bb:text-gray-500 bb:hover:text-gray-600 bb:hover:border-gray-300 bb:focus:text-gray-700 bb:focus:border-gray-300'
        "
        class="bb-dashboard-ui bb:inline-flex bb:items-center bb:px-1 bb:pt-1 bb:border-b-2 bb:text-sm bb:font-medium bb:leading-5 bb:focus:outline-hidden bb:transition bb:duration-150 bb:ease-in-out"
        @click="followLink($event, url)"
        v-text="name"
    />
</template>

<script>
import { withNavigation } from "../navigation.js";

export default {
    mixins: [withNavigation],

    props: {
        url: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: false,
        },
    },
};
</script>
```

- [ ] **Step 4: Экспорт** — в `src/index.js` после строки `Pagination`: `export { default as NavigationMenuElement } from './components/NavigationMenuElement.vue'`.

- [ ] **Step 5: Тесты, сборка** — команды задачи 2, шаг 7.

- [ ] **Step 6: Commit**

```bash
git add src/components/NavigationMenuElement.vue src/index.js tests/NavigationMenuElement.test.js
git commit -m "feat: добавить NavigationMenuElement"
```

---

### Task 7: Playground и README

**Files:**
- Create: `playground/navigation-log.js`
- Modify: `playground/bare.js`, `playground/host.js`, `playground/App.vue`, `README.md`

**Interfaces:**
- Consumes: `dashboardUi`, `Pagination`, `NavigationMenuElement` из `../dist/index.js`.

- [ ] **Step 1: Журнал переходов**

`playground/navigation-log.js`:

```js
import { ref } from 'vue'

// Последний адрес, по которому компонент пакета попросил перейти: в playground
// нет роутера, navigate только записывает адрес для строки состояния.
export const lastNavigation = ref('')
```

`playground/bare.js` — после импорта `App`:

```js
import { dashboardUi } from '../dist/index.js'
import { lastNavigation } from './navigation-log.js'
```

и вместо `createApp(App).mount('#app')`:

```js
createApp(App)
    .use(dashboardUi, { navigate: (href) => { lastNavigation.value = href } })
    .mount('#app')
```

`playground/host.js` — то же самое.

- [ ] **Step 2: Демо в `App.vue`**

В конец шаблона, перед закрывающим `</div>` страницы:

```html
        <section>
            <h2>Pagination</h2>
            <pagination :links="{ prev: '/list?page=1', next: '/list?page=3' }" :meta="{ from: 16, to: 30, total: 40 }"/>
            <pagination :links="{ prev: null, next: '/list?page=2' }" :meta="{ from: 1, to: 15, total: 40 }"/>
            <p>Последний переход: {{ lastNavigation || '—' }}</p>
        </section>

        <section>
            <h2>NavigationMenuElement</h2>
            <div class="demo-row">
                <navigation-menu-element name="Активный" url="/section/active" :is-active="true"/>
                <navigation-menu-element name="Обычный" url="/section/other"/>
            </div>
        </section>

        <section>
            <h2>lang="en"</h2>
            <select-date-interval header="Period" lang="en" v-model:date-from="dateFrom" v-model:date-to="dateTo"/>
            <pick-day v-model="day" lang="en"/>
            <download-link url="/export.xlsx" lang="en"/>
            <dropdown-button-with-action lang="en">
                <template #button><span class="demo-action">Action</span></template>
                <template #actions><a href="#" class="demo-action">Another action</a></template>
            </dropdown-button-with-action>
            <button type="button" class="demo-button" @click="englishModalIsOpen = true">Open modal</button>
            <confirmation-modal
                :is-open="englishModalIsOpen"
                lang="en"
                confirmation-heading="Delete?"
                confirmation-text="This cannot be undone."
                action-button-text="Delete"
                @action-confirmed="englishModalIsOpen = false"
                @action-canceled="englishModalIsOpen = false"
            />
            <pagination lang="en" :links="{ prev: '/list?page=1', next: '/list?page=3' }" :meta="{ from: 16, to: 30, total: 40 }"/>
        </section>
```

В `<script>`: к импорту из `'../dist/index.js'` добавить `Pagination, NavigationMenuElement`; в `components` — их же; `import { lastNavigation } from './navigation-log.js'`; в `setup()` вернуть ещё `lastNavigation`; в `data()` добавить `englishModalIsOpen: false`.

- [ ] **Step 3: README**

1. «Установка» — после примера импорта добавить:

````markdown
### Подключение к приложению

Плагин `dashboardUi` задаёт язык и переход по ссылкам пакета. Оба параметра
необязательны; без плагина компоненты русскоязычные, а ссылки — обычные `<a>`.

```js
import { dashboardUi } from '@boobooking/dashboard-ui-components'
import { router } from '@inertiajs/vue3'

createApp(App).use(dashboardUi, {
    lang: 'en',
    navigate: (href) => router.visit(href),
})
```

- `lang` — `'ru'` (по умолчанию) или `'en'`; другое значение — ошибка в `app.use`.
- `navigate(href)` — переход приложения по адресу: для Inertia
  `router.visit(href)`, для Vue Router `router.push(href)`. Компоненты рисуют
  настоящий `<a href>` и отдают `navigate` только обычный клик левой кнопкой;
  клики с Ctrl/Cmd/Shift/Alt, средней кнопкой и ссылки с `target` остаются
  браузеру. Без `navigate` браузер идёт по ссылке сам.
````

2. «Компоненты» — число и список экспортов: «шестнадцать компонентов» и в список добавить `Pagination`, `NavigationMenuElement`; после списка — «и плагин `dashboardUi`».

3. Новые разделы после `### DropdownButtonWithAction`:

````markdown
### Pagination

Переход на предыдущую и следующую страницу и строка «Показаны результаты X - Y
из Z» для списков на Laravel API Resource.

    <pagination class="mt-6" :links="orders.links" :meta="orders.meta" />

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `links` | `Object` | обязателен | `{ prev, next }` — адреса соседних страниц или `null` |
| `meta` | `Object` | обязателен | `{ from, to, total }` |
| `lang` | `String` | язык плагина | `"ru"` или `"en"` |

Если записей нет — `meta` не задан или `meta.total` не больше нуля, —
компонент ничего не рисует. Строка «Показаны результаты» — только когда в
`meta` есть числовые `from` и `to`. Кнопка — только при непустом адресе в
`links.prev` / `links.next`; при `links: null` остаётся одна строка
результатов. Ссылки — через `navigate` плагина. Событий нет.

### NavigationMenuElement

Пункт меню шапки: ссылка с подчёркиванием активного раздела.

    <navigation-menu-element name="Заказы" :url="route('orders')" :is-active="isOrders" />

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `url` | `String` | обязателен | Адрес раздела |
| `name` | `String` | обязателен | Подпись |
| `isActive` | `Boolean` | `false` | Активный раздел |

Ссылка — через `navigate` плагина. Событий нет.
````

4. Новый раздел «Языки» перед «Правила API пакета»:

````markdown
## Языки

Тексты пакета есть на русском и английском. Язык компонента — проп `lang`, если
он задан, иначе язык плагина `dashboardUi`, иначе русский. Явно переданный текст
главнее языка: `cancel-button-text` у `ConfirmationModal`, `title` у
`DownloadLink`.

| Компонент | `ru` | `en` |
| --- | --- | --- |
| `ConfirmationModal` — кнопка отмены | Отмена | Cancel |
| `DownloadLink` — подпись | Скачать | Download |
| `DropdownButtonWithAction` — подпись стрелки для скринридера | Открыть меню | Open menu |
| `PickDay` — месяцы, дни недели, кнопки календаря | по-русски | in English |
| `SelectDateInterval` — подсказки полей | от / до | from / to |
| `Pagination` | Предыдущая / Следующая / Показаны результаты X - Y из Z | Previous / Next / Showing X - Y of Z results |

Формат даты — `дд.мм.гггг` в обоих языках: это формат значения, а не текст.
Неделя начинается с понедельника. Календарь `PickDay` берёт язык при
монтировании: смена языка после монтирования в нём не отражается.
````

5. «Правила API пакета» — два пункта в конец списка:

```markdown
- Тексты интерфейса — только в `src/i18n.js`, в словарях `ru` и `en` с
  одинаковыми ключами; компонент берёт их через миксин `withLang`
  (`this.texts`) и получает проп `lang`.
- Ссылка компонента — настоящий `<a href>`; обычный клик — через
  `followLink($event, href)` миксина `withNavigation`, который отдаёт его
  `navigate` плагина. Ни Inertia, ни роутер пакет не импортирует.
```

6. «Что пакет берёт у приложения» — удалить абзац «Компоненты русскоязычные: названия месяцев, подписи и правила номера телефона зашиты.» и вместо него: «Правила номера телефона в `RussianMobileFilter` — российские; язык текстов задаётся, см. «Языки».»

7. «Playground» — «со всеми тринадцатью/четырнадцатью компонентами» → «со всеми шестнадцатью компонентами».

- [ ] **Step 4: Сборка playground**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
rm -rf playground/dist
out=$(npx vite build --config vite.playground.config.js 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения"; exit 1; }
out=$(npm test -- --reporter=verbose 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: npm test"; exit 1; }
echo ok
```

- [ ] **Step 5: Commit**

```bash
git add playground/navigation-log.js playground/bare.js playground/host.js playground/App.vue README.md
git commit -m "docs: описать подключение, языки и новые компоненты"
```

---

### Task 8: Приёмка playground «после»

Коммита нет.

**Interfaces:** Consumes `$P/before/*`, `$P/serve.sh`, `$P/wait.js`.

- [ ] **Step 1: Сборка и сервер** — как задача 7, шаг 4, затем `$P/serve.sh` → `200`.

- [ ] **Step 2: Снимки существующих состояний** — те же 12 ID и та же процедура, что в задаче 1, шаг 3 (`initScript`, `emulate` 1440×900×1, `wait.js`, замер сразу после снимка), в `$P/after/`.

- [ ] **Step 3: Сверка с «до»**

```bash
P=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/pagination-i18n
cd "$P" && python3 - <<'EOF'
import os
from PIL import ImageChops
from crop import crop
for name in sorted(n for n in os.listdir('before') if n.endswith('.png')):
    stem = name[:-4]; state = stem.split('-', 1)[1]
    a = crop(f'before/{name}', f'before/{stem}.json', state)
    b = crop(f'after/{name}', f'after/{stem}.json', state)
    if a.size != b.size:
        print(stem, 'РАЗМЕР', a.size, b.size); continue
    box = ImageChops.difference(a, b).getbbox()
    print(stem, 'совпадает' if box is None else f'отличается в {box}')
EOF
```

Expected: все 12 — `совпадает`, размеры областей равны. Русские тексты и вид 0.7.0 не изменились. Любое отличие или разный размер — остановиться и доложить.

- [ ] **Step 4: Новые компоненты и английский**

На обеих страницах (`bare`, `host`), той же процедурой, в `$P/after/`:

- `<S>-pagination`: секция «Pagination» в центре вьюпорта — обе пагинации, у второй нет «Предыдущая».
- `<S>-menu`: секция «NavigationMenuElement» — у «Активный» подчёркивание.
- `<S>-en`: секция «lang="en"» — подсказки `from`/`to`, `Download`, `Showing 16 - 30 of 40 results`, `Previous`/`Next`.
- `<S>-en-calendar`: клик по английскому `PickDay` — месяц и дни недели по-английски (`Mon`…).
- `<S>-en-modal`: «Open modal» — кнопка `Cancel`; после снимка — `Cancel`.
- Переход: клик по «Следующая» первой пагинации — строка «Последний переход» показывает `/list?page=3`, `location.href` не изменился. Ctrl-клик (`evaluate_script`: `dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }))` на ссылке) — строка не меняется, `defaultPrevented` — `false`.

Сверка `bare` с `host` для `pagination`, `menu`, `en`, `en-calendar`, `en-modal` — тем же `crop.py` (одна и та же область, размеры строго равны): совпадают. Итог — `$P/after/verdict.md`. Остановить сервер, закрыть вкладку, удалить `tmp-shots`.

---

### Task 9: Версия 0.8.0 и проверка tarball на cashback

**Files:**
- Modify (пакет): `package.json`, `package-lock.json`
- cashback: правки раздела 11 спеки — **без коммита**

**Interfaces:**
- Produces: версионный коммит пакета; ветка cashback `feature/package-pagination-navigation` с незакоммиченными правками; `$P/cashback/before|tarball/*`.

- [ ] **Step 1: Версия пакета**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
npm version 0.8.0 --no-git-tag-version
grep -n '"version": "0.8.0"' package.json package-lock.json
out=$(npm test -- --reporter=verbose 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: npm test"; exit 1; }
noise=$(echo "$out" | grep -E '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled'); test -z "$noise" || { echo "ПРОВАЛ"; echo "$noise"; exit 1; }
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; exit 1; }
git add package.json package-lock.json
git commit -m "chore: поднять версию пакета до 0.8.0"
```

- [ ] **Step 2: Администратор приёмки в cashback**

```bash
P=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/pagination-i18n
test -f "$P/admin.env" || printf 'ADMIN_EMAIL=acceptance-pn@cashback.test\nADMIN_PASSWORD=%s\n' "$(openssl rand -hex 12)" > "$P/admin.env"
. "$P/admin.env"
out=$(printf '%s\n%s\n%s\n%s\n' "$ADMIN_EMAIL" "Приёмка пагинации" "$ADMIN_PASSWORD" "$ADMIN_PASSWORD" | docker exec -i cashback-backend php /var/www/artisan user:create 2>&1); rc=$?
echo "$out" | tail -2; test "$rc" -eq 0 || { echo "ПРОВАЛ"; exit 1; }
```

Браузер: `new_page` на `https://cashback.test/dashboard/login`, `isolatedContext: "pn"`, `emulate` с `viewport: "1440x900x1"`, вход под `ADMIN_EMAIL`/`ADMIN_PASSWORD` (пароль не печатать).

- [ ] **Step 3: Снимки cashback «до»** — на `main` cashback (`git -C /Users/boobooking/Code/mars/cashback status --porcelain` пуст, ветка `main`), после `npm run build` в cashback.

Скрипт замеров `$P/measure-cb.js`:

```js
() => {
    const rect = (el) => {
        if (!el || el.getClientRects().length === 0) return null;
        const b = el.getBoundingClientRect();
        return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    };
    const look = (el) => {
        const s = getComputedStyle(el);
        return { color: s.color, borderTop: `${s.borderTopWidth} ${s.borderTopColor}`, borderBottom: `${s.borderBottomWidth} ${s.borderBottomColor}`, fontSize: s.fontSize, fontWeight: s.fontWeight };
    };
    const pager = [...document.querySelectorAll("nav")].find((n) => /Следующая|Предыдущая|Показаны результаты/.test(n.textContent));
    const menuNames = ["Кэшбэки", "Анкеты VetKit", "Пользователи", "Платежи", "Sms"];
    const menu = [...document.querySelectorAll("a")].filter((a) => menuNames.includes(a.textContent.trim()));
    return {
        url: location.pathname + location.search,
        pager: rect(pager),
        pagerText: pager ? pager.innerText.replace(/\s+/g, " ").trim() : null,
        pagerLinks: pager ? [...pager.querySelectorAll("a")].map((a) => ({ text: a.innerText.trim(), href: a.getAttribute("href"), ...rect(a), look: look(a), svg: rect(a.querySelector("svg")) })) : [],
        menu: menu.map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href"), ...rect(a), look: look(a) })),
    };
}
```

Перед каждым снимком — `$P/wait.js` → `0` (ставит бесконечные анимации на паузу). ID снимков (`fullPage: true` и замер в JSON) — для страниц `cashbacks`, `consumers`, `messages`, `payments`, `services`, `users` (`/dashboard/<страница>`):

- `<страница>-p1` — первая страница;
- `<страница>-p2` — вторая (`?page=2`), если у списка больше одной страницы; иначе записать «одна страница» в `$P/cashback/before/notes.md`.

Всё — в `$P/cashback/before/` (через `tmp-shots`).

- [ ] **Step 4: Правки cashback в ветке**

```bash
cd /Users/boobooking/Code/mars/cashback
test -z "$(git status --porcelain)" || { echo "ПРОВАЛ: дерево cashback не чистое"; exit 1; }
git switch -c feature/package-pagination-navigation
```

1. `resources/js/app.js`: строка `import { createInertiaApp } from "@inertiajs/vue3";` → `import { createInertiaApp, router } from "@inertiajs/vue3";`; после строки `import { resolvePageComponent } …` добавить `import { dashboardUi } from "@boobooking/dashboard-ui-components";`; в цепочке после `.use(plugin)` добавить строку `.use(dashboardUi, { navigate: (href) => router.visit(href) })`.
2. Страницы — удалить строку `import Pagination from "../../Shared/Pagination.vue";` и заменить строку импорта из пакета:

| Файл | Строка импорта из пакета |
|---|---|
| `resources/js/Pages/Cashbacks/Index.vue` | `import { DownloadLink, Pagination, RussianMobileFilter, SelectDateInterval, SelectSingle, SmallBadge } from "@boobooking/dashboard-ui-components";` |
| `resources/js/Pages/Consumers/Index.vue` | `import { Pagination, RussianMobileFilter, SelectDateInterval, SelectSingle, SmallBadge } from "@boobooking/dashboard-ui-components";` |
| `resources/js/Pages/Messages/Index.vue` | `import { Pagination, RussianMobileFilter, SelectDateInterval, SelectSingle, SmallBadge } from "@boobooking/dashboard-ui-components";` |
| `resources/js/Pages/Payments/Index.vue` | `import { Pagination, RussianMobileFilter, SelectDateInterval, SelectSingle, SmallBadge } from "@boobooking/dashboard-ui-components";` |
| `resources/js/Pages/Services/Index.vue` | `import { ConfirmationModal, Pagination, RussianMobileFilter, SelectDateInterval, SelectSingle, SmallBadge } from "@boobooking/dashboard-ui-components";` |
| `resources/js/Pages/Users/Index.vue` | `import { ConfirmationModal, DropdownButtonWithAction, Pagination } from "@boobooking/dashboard-ui-components";` |

   Регистрация `Pagination` в `components` и вызовы `<pagination …>` не меняются.
3. `resources/js/Shared/NavigationHeader.vue`: удалить `import NavigationMenuElement from "./NavigationMenuElement.vue";`, строку `import { Popup } from "@boobooking/dashboard-ui-components";` заменить на `import { NavigationMenuElement, Popup } from "@boobooking/dashboard-ui-components";`.
4. Удаления и зависимости — порядок важен: `npm uninstall` сверяет `node_modules` с lock-файлом и вернул бы 0.7.0, поэтому tarball ставится последним.

```bash
cd /Users/boobooking/Code/mars/cashback
P=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/pagination-i18n
git rm -q resources/js/Shared/Pagination.vue resources/js/Shared/NavigationMenuElement.vue
out=$(npm uninstall @heroicons/vue 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
tgz=$(cd /Users/boobooking/Code/dashboard-ui-components && npm pack --pack-destination "$P/cashback" 2>/dev/null | tail -1)
test -f "$P/cashback/$tgz" || { echo "ПРОВАЛ: npm pack"; exit 1; }
out=$(npm install "$P/cashback/$tgz" --no-save 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
grep -m1 '"version"' node_modules/@boobooking/dashboard-ui-components/package.json
hits=$(grep -rn 'Shared/Pagination\|Shared/NavigationMenuElement\|NavigationMenuElement.vue\|heroicons' resources/js package.json)
test -z "$hits" || { echo "ПРОВАЛ: остались ссылки:"; echo "$hits"; exit 1; }
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения"; exit 1; }
ls resources/js/Shared | wc -l
```

Expected: версия `0.8.0` в `node_modules`; ссылок нет; сборка чистая; в `Shared/` 6 файлов.

- [ ] **Step 5: Приёмка на tarball**

1. Снимки и замеры — те же ID, что в шаге 3, в `$P/cashback/tarball/`. Сравнение с `before` строгое — размер снимков и каждый пиксель:

```bash
P=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/pagination-i18n
STAGE=tarball   # в задаче 10 — published
cd "$P/cashback" && python3 - "$STAGE" <<'EOF'
import os, sys, json
from PIL import Image, ImageChops
stage = sys.argv[1]
for name in sorted(n for n in os.listdir('before') if n.endswith('.png')):
    a = Image.open(f'before/{name}').convert('RGB'); b = Image.open(f'{stage}/{name}').convert('RGB')
    if a.size != b.size:
        print(name, 'РАЗМЕР', a.size, b.size); continue
    box = ImageChops.difference(a, b).getbbox()
    ja = json.load(open(f'before/{name[:-4]}.json')); jb = json.load(open(f'{stage}/{name[:-4]}.json'))
    print(name, 'совпадает' if box is None and ja == jb else f'отличается: пиксели {box}, JSON {"равны" if ja == jb else "разные"}')
EOF
```

   Expected: все — `совпадает`. Любое отличие — стоп и доклад.
2. Поведение — на `/dashboard/cashbacks`, после каждого сценария — скрипт ожидания; результаты в `$P/cashback/tarball/behaviour.md`:
   - a. `window.__marker = Date.now()`, прокрутка вниз. Перед кликом — MutationObserver, записывающий появление элемента `#nprogress`, и `emulate` с `networkConditions: "Slow 3G"`: у Inertia индикатор показывается с задержкой 250 мс, и быстрый переход закончился бы раньше. Клик «Следующая» (по `uid`): маркер жив, адрес с `page=2`, `history.length` +1, прокрутка наверху, запрос страницы — XHR с заголовком `X-Inertia` (`get_network_request`), `#nprogress` появлялся. Затем `emulate` без `networkConditions` — сеть в обычном режиме;
   - b. `/dashboard/cashbacks?source=vetkit` → «Следующая»: в адресе `source=vetkit` и `page=2`;
   - c. после (a) `navigate_page` back — адрес вернулся, маркер жив; forward — снова `page=2`;
   - d. на «Следующая» `evaluate_script` отправляет `click` с `ctrlKey`, с `metaKey`, с `shiftKey`, с `button: 1`: `defaultPrevented === false`, запросов с `X-Inertia` нет; открывшиеся вкладки — закрыть;
   - e. фокус на «Следующая», `press_key` Enter — XHR с `X-Inertia`, маркер жив;
   - f. клик по пункту «Анкеты VetKit» в шапке — адрес `/dashboard/services`, маркер жив, XHR с `X-Inertia`, активный пункт сменился (`menu[].look.borderBottom`);
   - g. `list_console_messages` — без ошибок.

- [ ] **Step 6: Стоп — доклад владельцу**

Не ставить тег, не пушить, не публиковать. Правки cashback остаются незакоммиченными в ветке `feature/package-pagination-navigation` (в `node_modules` — tarball). Администратор приёмки остаётся для задачи 10. Доложить: коммиты пакета (`git log --oneline main..HEAD`), итоги задач 8 и 9. Продолжение (задача 10) — после публикации `0.8.0`.

---

### Task 10: После публикации 0.8.0 — коммит cashback

Выполняется, когда `npm view @boobooking/dashboard-ui-components@0.8.0 version --prefer-online` отвечает `0.8.0`.

**Files:** cashback `package.json`, `package-lock.json` (+ правки задачи 9, уже в дереве).

- [ ] **Step 1: Пакет из реестра**

```bash
cd /Users/boobooking/Code/mars/cashback
test "$(git branch --show-current)" = "feature/package-pagination-navigation" || { echo "ПРОВАЛ: не та ветка"; exit 1; }
out=$(npm install @boobooking/dashboard-ui-components@0.8.0 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
grep -n '"@boobooking/dashboard-ui-components": "\^0.8.0"' package.json
grep -n -A2 '"node_modules/@boobooking/dashboard-ui-components"' package-lock.json | grep resolved
grep -c heroicons package.json package-lock.json
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения"; exit 1; }
```

Expected: `^0.8.0`; `resolved` — `https://registry.npmjs.org/…-0.8.0.tgz`; `heroicons` — `0` в обоих файлах; сборка чистая.

- [ ] **Step 2: Приёмка на опубликованной версии** — шаг 5 задачи 9 целиком, в `$P/cashback/published/`, сверка с `before`.

- [ ] **Step 3: Pest** — `docker exec cashback-backend php /var/www/artisan test`: всё зелёное, без предупреждений.

- [ ] **Step 4: Commit cashback**

```bash
cd /Users/boobooking/Code/mars/cashback
git add -A resources/js package.json package-lock.json
git status --short
git commit -F - <<'EOF'
refactor: брать Pagination и NavigationMenuElement из пакета

Пагинация и пункт меню шапки жили копиями в девяти проектах. Теперь они в
@boobooking/dashboard-ui-components 0.8.0; ссылки пакета — настоящие <a href>,
а переход без перезагрузки выполняет Inertia через navigate плагина
dashboardUi, подключённого в app.js. Вид и поведение не изменились.
@heroicons/vue больше не нужен.

Спека: dashboard-ui-components/docs/superpowers/specs/2026-09-27-pagination-navigation-i18n-design.md
EOF
```

- [ ] **Step 5: Уборка** — администратор приёмки удаляет себя через `/dashboard/users` (меню своей строки → «Удалить» → подтвердить), вход с его данными отклоняется; закрыть вкладку `pn`; удалить `tmp-shots`. Доложить владельцу: коммиты пакета и cashback, итоги приёмки.

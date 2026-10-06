# SSR в пакете и PickDayNative — Implementation Plan

> **Задачи о `PickDayNative`, `SelectDateInterval` и `formatIsoDay` /
> `parseIsoDay` в выпуск 0.11.0 не вошли** — см. примечание в начале спеки.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Пакет загружается, рендерится на сервере и гидратируется без расхождений; новый `PickDayNative` на `<input type="date">` с API `PickDay`; `SelectDateInterval` на `PickDayNative`; выпуск `0.11.0` и обновление cashback.

**Architecture:** `PickDayNative` хранит значение `ДД.ММ.ГГГГ`, а встроенному полю отдаёт `ГГГГ-ММ-ДД` через новые `formatIsoDay` / `parseIsoDay` в `src/date.js`; пропускает к родителю только полную дату с годом 1000–9999 и по `blur` возвращает поле к `modelValue`. `PageCard` читает историю в `mounted()`, `PickDay` загружает pikaday через `import()` в `mounted()`. Общая таблица фикстур `tests/ssrFixtures.js` питает серверный рендер в окружении `node` (`tests/ssr.test.js`) и гидратацию в happy-dom (`tests/hydration.test.js`) и обязана покрывать все экспорты.

**Tech Stack:** Vue 3.5 (Options API), Tailwind 4 с `prefix(bb)`, vitest 5 + @vue/test-utils + happy-dom, `vue/server-renderer`, Vite (библиотека и playground), Chrome DevTools MCP, Playwright 1.63 (WebKit и Firefox, только для приёмки), cashback — Laravel + Inertia 3.

**Spec:** `docs/superpowers/specs/2026-10-06-ssr-pick-day-native-design.md` (коммит `a705e23`).

## Global Constraints

- Пакет: `/Users/boobooking/Code/dashboard-ui-components`, ветка `feature/ssr-pick-day-native` (от `main` `02df6cf`, `0.10.1`; в ветке — спека и этот план). cashback: `/Users/boobooking/Code/mars/cashback` (`main` `dd97de7`, `^0.10.0`, установлен `0.10.0`). payments не трогается.
- `PickDayNative`: пропсы `modelValue` (`String`, `""`), `withEraser` (`Boolean`, `true`), `placeholderText` (`String`, `""`), `lang` (миксин `withLang`); события `update:modelValue` и `changed` — всегда парой.
- Диапазон дат — год 1000–9999: и для значения от родителя (§4.3), и для ввода (§4.4).
- Правило отправки (§4.4): `validity.badInput` — ничего; пустое поле — кандидат `""`; дата не разобрана или год вне диапазона — ничего; иначе кандидат `formatDay(date)`; кандидат уходит, только если отличается от `modelValue` (`null` — как `""`). По `blur` поле снова показывает значение по §4.3, без событий.
- `SelectDateInterval`: API и события не меняются; обе даты — `PickDayNative`.
- `PickDay`: API и вид не меняются; pikaday — `await import("pikaday")` в `mounted()`, CSS pikaday — статический импорт.
- `PageCard`: `canGoBack: false` в `data()`, `window.history.length > 1` в `mounted()`.
- Публичная поверхность: восемнадцать компонентов и `dashboardUi` — девятнадцать имён.
- Версия пакета — `0.11.0`.
- Чистота вывода тестов пакета: только `npm test -- --reporter=verbose` и `grep -acE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled'` → `0`.
- Коммиты: conventional commits по-русски; никогда `--no-verify`; cashback не пушить. Неотслеживаемый `.idea/` в пакете — владельца, в коммиты не добавлять.
- PHP-инструменты — только `docker exec cashback-backend php /var/www/artisan …`; tinker не трогать; администратор приёмки — только `user:create`; миграции не запускать.
- Пароль администратора приёмки читает и вводит только контроллер; сабагенты работают в авторизованной вкладке.
- На странице cashback `Services` модалку отправки письма никогда не открывать и не подтверждать: она шлёт настоящее письмо через Mindbox.
- Браузер: только свои вкладки, `pageId` — явно в каждом вызове; вкладку `1` (чужая, `certificates.test`) не трогать. `take_screenshot`/`evaluate_script` с `filePath` пишут только в `/Users/boobooking/Code/mars/cashback/.superpowers/tmp-shots/`, оттуда `mv`.
- `$R=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/ssr-pick-day-native` — снимки, замеры, скрипты приёмки, Playwright (`$R/pw`). В зависимости пакета и cashback Playwright не попадает.
- Обязательны в Chrome, WebKit и Firefox и не заменяются записью в README: значение не теряется; частичная дата и год вне диапазона не уходят родителю; полный ввод — одно событие, частичный ввод и уход из поля — ни одного; ластик очищает одним событием; маска пустого поля без фокуса скрыта, подпись не накладывается на текст. В README допускаются только отличия вида: календарь, видимый формат, первый день недели, оставшаяся иконка.
- Выбор даты в календаре Chrome проверяется автоматически — на playground и в cashback (клик по полю → `ArrowRight` → `Enter`); ручных проверок в Chrome нет. Выбор в календаре WebKit и Firefox автоматизацией не проверяется: в итоге приёмки для них пишется «выбор через календарь не проверен», и пункт закрывает ручная проверка Tim в Safari и Firefox Developer Edition (раздел «Ручная проверка календаря»); каждый браузер закрывает только свой пункт. Проверка ввода с клавиатуры выбор в календаре не заменяет.

## Review Focus

- Приложение с `@tailwindcss/forms` и preflight Tailwind 4 задаёт свои отступы и высоту встроенным частям поля даты (`::-webkit-datetime-edit*`) — поле `PickDayNative` выглядит одинаково с плагином и без: ресет пакета задаёт эти части сам (задача 2, `src/styles/index.css`), приёмка сравнивает поля на `bare` и `host` попиксельно (задача 6, шаг 5).
- Родитель передаёт `:model-value` без `v-model` и не принимает новое значение — после ухода из поля оно снова показывает `modelValue`, а не набранную дату — задача 2 (тест «без v-model поле возвращается к modelValue»).
- Родитель меняет значение, пока в поле частичный ввод (например, сброс фильтров) — поле показывает значение родителя — задача 2 (тест «во время частичного ввода»).
- `placeholderText: null` от родителя — ни текста «null», ни `aria-label` — задача 2 (тест «placeholderText null»).
- Две даты `SelectDateInterval`: фокус в одном поле не прячет подпись другого — задача 3 (тест «фокус в одном поле»).

---

### Task 1: Снимки playground «до»

Коммита нет. Выполняется на `feature/ssr-pick-day-native` до правок кода.

**Files:** только `$R`.

**Interfaces:**
- Produces: `$R/serve.sh`, `$R/wait.js`, `$R/fixed-date.js`, `$R/measure-pg.js`, `$R/crop.py` (`section_region`, `crop`, `rect_region`); `$R/pg/before/{bare,host}-page.{png,json}`.

- [ ] **Step 1: Скрипты приёмки**

```bash
R=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/ssr-pick-day-native
mkdir -p "$R/pg/before" "$R/pg/after"
```

`$R/serve.sh` (после создания — `chmod +x "$R/serve.sh"`):

```zsh
#!/bin/zsh
pkill -f "http.server 8765" 2>/dev/null
cd /Users/boobooking/Code/dashboard-ui-components/playground/dist || exit 1
nohup python3 -m http.server 8765 --bind 0.0.0.0 >/dev/null 2>&1 &
sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8765/host.html
```

`$R/fixed-date.js` — для `initScript` у `navigate_page`:

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

`$R/wait.js` — дожидается конечных анимаций, бесконечные ставит на паузу; ожидается `0`:

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

`$R/measure-pg.js` — прямоугольники секций по `h2` (поддерево элемента с `position: fixed` в секцию не входит) и отдельные элементы секции `lang="en"`, кроме заголовка и `SelectDateInterval` (у него есть колонка `bb:min-w-72`):

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
    let enParts = [];
    for (const section of document.querySelectorAll("section")) {
        const title = section.querySelector("h2")?.textContent.trim();
        if (!title) continue;
        const fixedRoots = [...section.querySelectorAll("*")].filter((el) => getComputedStyle(el).position === "fixed");
        const outsideFixed = (el) => !fixedRoots.some((root) => root.contains(el));
        const parts = [section, ...section.querySelectorAll("*")].filter((el) => visible(el) && outsideFixed(el)).map(rect);
        sections[title] = union(parts);
        if (title === 'lang="en"') {
            enParts = [...section.children]
                .filter((el) => el.tagName !== "H2" && visible(el) && outsideFixed(el) && el.querySelector('[class*="bb:min-w-72"]') === null)
                .map((el) => ({ tag: el.tagName, cls: el.getAttribute("class"), rect: union([rect(el)]) }));
        }
    }
    return { dpr: devicePixelRatio, viewport: { w: innerWidth, h: innerHeight }, sections, enParts };
}
```

`$R/crop.py`:

```python
import json
from PIL import Image


def section_region(m, title):
    s = m['sections'][title]
    return (s['x'], s['y'], s['x'] + s['w'], s['y'] + s['h'])


def rect_region(r):
    return (r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])


def crop(png, js, region):
    m = json.load(open(js))
    k = m['dpr']
    box = tuple(round(v * k) for v in region(m))
    return Image.open(png).convert('RGB').crop(box)
```

- [ ] **Step 2: Сборка и сервер**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
rm -rf playground/dist
out=$(npx vite build --config vite.playground.config.js 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
"$R/serve.sh"
```

Expected: `200`.

- [ ] **Step 3: Снимки**

Вкладка — `new_page` с `isolatedContext: "spd-pg"`, `emulate` `viewport: "1440x900x1"`. Для `S` = `bare` (`http://host.docker.internal:8765/`) и `host` (`http://host.docker.internal:8765/host.html`):

1. `navigate_page` с `initScript` = содержимое `$R/fixed-date.js`;
2. `evaluate_script` с `$R/wait.js` → `0`;
3. `take_screenshot` `fullPage: true` → `…/tmp-shots/<S>-page.png`;
4. `evaluate_script` с `$R/measure-pg.js`, `filePath` → `…/tmp-shots/<S>-page.json`;
5. `mv` в `$R/pg/before/`.

Вкладку оставить открытой для задачи 6. Сервер остановить: `pkill -f "http.server 8765"`.

- [ ] **Step 4: Проверка**

```bash
cd "$R" && python3 - <<'EOF'
import json
for s in ('bare', 'host'):
    m = json.load(open(f'pg/before/{s}-page.json'))
    print(s, sorted(m['sections']))
    print(s, 'lang="en":', [(p['tag'], p['cls']) for p in m['enParts']])
EOF
```

Expected: у обеих страниц одинаковый список секций, в нём есть `PickDay`, `SelectDateInterval`, `lang="en"`, нет `PickDayNative`; в `enParts` нет элемента интервала, есть корень `PickDay` (`bb-dashboard-ui bb:flex bb:flex-col`) и остальные компоненты секции.

---

### Task 2: `formatIsoDay` / `parseIsoDay` и компонент `PickDayNative`

**Files:**
- Modify: `src/date.js`
- Create: `src/components/PickDayNative.vue`
- Modify: `src/styles/index.css`
- Modify: `src/index.js`
- Test: `tests/date.test.js`, `tests/PickDayNative.test.js` (новый), `tests/exports.test.js`

**Interfaces:**
- Produces: `formatIsoDay(date: Date): string` (`"ГГГГ-ММ-ДД"`), `parseIsoDay(value: string): Date | null`; компонент `PickDayNative` (экспорт из `src/index.js`) — пропсы и события из Global Constraints; разметка: корень `div.bb-dashboard-ui`, поле `input[type="date"]`, подпись `span[aria-hidden="true"]` (только пока видна), ластик — единственная `button` компонента; класс прозрачности — `bb:text-transparent`.

- [ ] **Step 1: Тесты `date.js`**

В `tests/date.test.js` импорт `import { formatDay, parseDay } from '../src/date.js'` → `import { formatDay, formatIsoDay, parseDay, parseIsoDay } from '../src/date.js'`; в конец файла:

```js
describe('parseIsoDay', () => {
    const valid = [
        { name: 'обычная дата', input: '2026-03-15', year: 2026, month: 2, day: 15 },
        { name: 'год меньше 1000 не подменяется на 19xx', input: '0002-12-03', year: 2, month: 11, day: 3 },
    ]

    for (const testCase of valid) {
        it(testCase.name, () => {
            const date = parseIsoDay(testCase.input)

            expect(date).not.toBeNull()
            expect(date.getFullYear()).toBe(testCase.year)
            expect(date.getMonth()).toBe(testCase.month)
            expect(date.getDate()).toBe(testCase.day)
            expect(date.getHours()).toBe(0)
        })
    }

    const invalid = [
        { name: 'несуществующая дата', input: '2026-02-31' },
        { name: 'год из пяти цифр', input: '10000-01-01' },
        { name: 'однозначный месяц', input: '2026-3-15' },
        { name: 'формат ДД.ММ.ГГГГ', input: '15.03.2026' },
        { name: 'мусор', input: 'вчера' },
        { name: 'пустая строка', input: '' },
    ]

    for (const testCase of invalid) {
        it(`отклоняет: ${testCase.name}`, () => {
            expect(parseIsoDay(testCase.input)).toBeNull()
        })
    }
})

describe('formatIsoDay', () => {
    const cases = [
        { name: 'двузначные день и месяц', input: new Date(2026, 8, 13), expected: '2026-09-13' },
        { name: 'однозначные дополняются нулём', input: new Date(2026, 0, 1), expected: '2026-01-01' },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            expect(formatIsoDay(testCase.input)).toBe(testCase.expected)
        })
    }

    it('дополняет нулями год короче четырёх цифр', () => {
        const date = new Date(0)
        date.setFullYear(2, 11, 3)

        expect(formatIsoDay(date)).toBe('0002-12-03')
    })
})
```

- [ ] **Step 2: Тесты `PickDayNative`**

`tests/PickDayNative.test.js`:

```js
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import PickDayNative from '../src/components/PickDayNative.vue'

enableAutoUnmount(afterEach)
afterEach(() => {
    document.body.innerHTML = ''
})

// Предупреждения и ошибки Vue собираются и проверяются в каждом тесте.
function withHandlers() {
    const errors = []
    const warnings = []
    const global = {
        config: {
            errorHandler: (error) => errors.push(error),
            warnHandler: (message) => warnings.push(message),
        },
    }

    return { errors, warnings, global }
}

function mountField(props = {}) {
    const { errors, warnings, global } = withHandlers()
    const wrapper = mount(PickDayNative, { props, attachTo: document.body, global })

    return { wrapper, errors, warnings }
}

const fieldOf = (wrapper) => wrapper.get('input[type="date"]')
const labelOf = (wrapper) => wrapper.find('span[aria-hidden="true"]')
const eraserOf = (wrapper) => wrapper.find('button')

// Ввод так, как его видит компонент: значение поля и признак частичного
// ввода. Частичного ввода в happy-dom нет, поэтому validity подменяется на
// элементе.
async function typeInto(wrapper, value, { badInput = false } = {}) {
    const field = fieldOf(wrapper)

    Object.defineProperty(field.element, 'validity', { value: { badInput }, configurable: true })
    field.element.value = value
    await field.trigger('input')
}

function expectNoEvents(wrapper) {
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('changed')).toBeUndefined()
}

function expectSent(wrapper, value) {
    expect(wrapper.emitted('update:modelValue')).toEqual([[value]])
    expect(wrapper.emitted('changed')).toEqual([[]])
}

function expectClean({ errors, warnings }) {
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
}

describe('PickDayNative: вид', () => {
    it('без пропсов: поле пустое, подписи и ластика нет, маска скрыта', () => {
        const mounted = mountField()
        const { wrapper } = mounted

        expect(fieldOf(wrapper).element.value).toBe('')
        expect(fieldOf(wrapper).attributes('aria-label')).toBeUndefined()
        expect(fieldOf(wrapper).classes()).toContain('bb:text-transparent')
        expect(labelOf(wrapper).exists()).toBe(false)
        expect(eraserOf(wrapper).exists()).toBe(false)
        expect(wrapper.classes()).toContain('bb-dashboard-ui')
        expectNoEvents(wrapper)
        expectClean(mounted)
    })

    it('подпись видна, aria-label равен ей, текст поля прозрачен; в фокусе подписи нет', async () => {
        const mounted = mountField({ placeholderText: 'от' })
        const { wrapper } = mounted

        expect(labelOf(wrapper).text()).toBe('от')
        expect(fieldOf(wrapper).attributes('aria-label')).toBe('от')
        expect(fieldOf(wrapper).classes()).toContain('bb:text-transparent')

        await fieldOf(wrapper).trigger('focus')

        expect(labelOf(wrapper).exists()).toBe(false)
        expect(fieldOf(wrapper).classes()).not.toContain('bb:text-transparent')

        await fieldOf(wrapper).trigger('blur')

        expect(labelOf(wrapper).text()).toBe('от')
        expectNoEvents(wrapper)
        expectClean(mounted)
    })

    it('placeholderText null — ни подписи, ни aria-label', () => {
        const mounted = mountField({ placeholderText: null })
        const { wrapper } = mounted

        expect(labelOf(wrapper).exists()).toBe(false)
        expect(fieldOf(wrapper).attributes('aria-label')).toBeUndefined()
        expect(wrapper.text()).not.toContain('null')
        expectClean(mounted)
    })

    const values = [
        { name: 'обычная дата', modelValue: '15.03.2026', field: '2026-03-15' },
        { name: 'нижняя граница диапазона', modelValue: '01.01.1000', field: '1000-01-01' },
        { name: 'верхняя граница диапазона', modelValue: '31.12.9999', field: '9999-12-31' },
        { name: 'год 0 — вне диапазона', modelValue: '01.01.0000', field: '' },
        { name: 'год 999 — вне диапазона', modelValue: '31.12.0999', field: '' },
        { name: 'null', modelValue: null, field: '' },
        { name: 'undefined', modelValue: undefined, field: '' },
        { name: 'не дата', modelValue: 'abc', field: '' },
        { name: 'несуществующая дата', modelValue: '31.02.2026', field: '' },
    ]

    for (const testCase of values) {
        it(`значение: ${testCase.name}`, () => {
            const mounted = mountField({ modelValue: testCase.modelValue, placeholderText: 'от' })
            const { wrapper } = mounted
            const hasDate = testCase.field !== ''

            expect(fieldOf(wrapper).element.value).toBe(testCase.field)
            expect(labelOf(wrapper).exists()).toBe(!hasDate)
            expect(eraserOf(wrapper).exists()).toBe(hasDate)
            expect(fieldOf(wrapper).classes().includes('bb:text-transparent')).toBe(!hasDate)
            expectNoEvents(wrapper)
            expectClean(mounted)
        })
    }

    it('withEraser: false — ластика нет и при дате', () => {
        const mounted = mountField({ modelValue: '15.03.2026', withEraser: false })

        expect(eraserOf(mounted.wrapper).exists()).toBe(false)
        expectClean(mounted)
    })
})

describe('PickDayNative: что уходит родителю', () => {
    const cases = [
        { name: 'частичный ввод', modelValue: '', value: '', badInput: true, sent: null },
        { name: 'промежуточный год 0002', modelValue: '', value: '0002-12-03', sent: null },
        { name: 'промежуточный год 0202', modelValue: '', value: '0202-12-03', sent: null },
        { name: 'год 999', modelValue: '', value: '0999-12-31', sent: null },
        { name: 'полная дата', modelValue: '', value: '2026-12-03', sent: '03.12.2026' },
        { name: 'нижняя граница', modelValue: '', value: '1000-01-01', sent: '01.01.1000' },
        { name: 'верхняя граница', modelValue: '', value: '9999-12-31', sent: '31.12.9999' },
        { name: 'очистка заполненного поля', modelValue: '15.03.2026', value: '', sent: '' },
        { name: 'пустое поле при пустом значении', modelValue: '', value: '', sent: null },
        { name: 'пустое поле при null', modelValue: null, value: '', sent: null },
        { name: 'то же значение', modelValue: '03.12.2026', value: '2026-12-03', sent: null },
    ]

    for (const testCase of cases) {
        it(testCase.name, async () => {
            const mounted = mountField({ modelValue: testCase.modelValue })
            const { wrapper } = mounted

            await typeInto(wrapper, testCase.value, { badInput: testCase.badInput ?? false })

            if (testCase.sent === null) {
                expectNoEvents(wrapper)
            } else {
                expectSent(wrapper, testCase.sent)
            }
            expectClean(mounted)
        })
    }
})

describe('PickDayNative: год из пяти цифр', () => {
    it('атомарный ввод — ничего (happy-dom такое значение отбрасывает, поэтому оно подменено)', async () => {
        const mounted = mountField({ modelValue: '' })
        const { wrapper } = mounted
        const field = fieldOf(wrapper)

        Object.defineProperty(field.element, 'validity', { value: { badInput: false }, configurable: true })
        Object.defineProperty(field.element, 'value', { value: '10000-03-15', writable: true, configurable: true })
        await field.trigger('input')

        expectNoEvents(wrapper)
        expectClean(mounted)
    })
})

describe('PickDayNative: уход из поля', () => {
    it('частичный ввод в заполненном поле — снова прежняя дата', async () => {
        const mounted = mountField({ modelValue: '15.03.2026' })
        const { wrapper } = mounted

        await fieldOf(wrapper).trigger('focus')
        await typeInto(wrapper, '', { badInput: true })
        await fieldOf(wrapper).trigger('blur')

        expect(fieldOf(wrapper).element.value).toBe('2026-03-15')
        expectNoEvents(wrapper)
        expectClean(mounted)
    })

    it('год вне диапазона в заполненном поле — снова прежняя дата', async () => {
        const mounted = mountField({ modelValue: '15.03.2026' })
        const { wrapper } = mounted

        await fieldOf(wrapper).trigger('focus')
        await typeInto(wrapper, '0202-12-03')
        await fieldOf(wrapper).trigger('blur')

        expect(fieldOf(wrapper).element.value).toBe('2026-03-15')
        expectNoEvents(wrapper)
        expectClean(mounted)
    })

    it('незавершённый ввод в пустом поле — поле пустое, подпись видна', async () => {
        const mounted = mountField({ placeholderText: 'от' })
        const { wrapper } = mounted

        await fieldOf(wrapper).trigger('focus')
        await typeInto(wrapper, '0202-12-03')
        await fieldOf(wrapper).trigger('blur')

        expect(fieldOf(wrapper).element.value).toBe('')
        expect(labelOf(wrapper).text()).toBe('от')
        expectNoEvents(wrapper)
        expectClean(mounted)
    })

    it('с v-model новая дата остаётся после ухода из поля', async () => {
        const Parent = {
            data: () => ({ day: '' }),
            render() {
                return h(PickDayNative, {
                    modelValue: this.day,
                    'onUpdate:modelValue': (value) => { this.day = value },
                })
            },
        }
        const { errors, warnings, global } = withHandlers()
        const wrapper = mount(Parent, { attachTo: document.body, global })

        await fieldOf(wrapper).trigger('focus')
        await typeInto(wrapper, '2026-12-03')

        expect(wrapper.vm.day).toBe('03.12.2026')

        await fieldOf(wrapper).trigger('blur')

        expect(fieldOf(wrapper).element.value).toBe('2026-12-03')
        expectClean({ errors, warnings })
    })

    it('без v-model поле возвращается к modelValue', async () => {
        const mounted = mountField({ modelValue: '15.03.2026' })
        const { wrapper } = mounted

        await fieldOf(wrapper).trigger('focus')
        await typeInto(wrapper, '2026-12-03')

        expectSent(wrapper, '03.12.2026')

        await fieldOf(wrapper).trigger('blur')

        expect(fieldOf(wrapper).element.value).toBe('2026-03-15')
        expectClean(mounted)
    })
})

describe('PickDayNative: значение от родителя', () => {
    it('поле показывает его сразу и без событий', async () => {
        const mounted = mountField({ modelValue: '' })
        const { wrapper } = mounted

        await wrapper.setProps({ modelValue: '01.02.2026' })
        expect(fieldOf(wrapper).element.value).toBe('2026-02-01')

        await wrapper.setProps({ modelValue: null })
        expect(fieldOf(wrapper).element.value).toBe('')

        expectNoEvents(wrapper)
        expectClean(mounted)
    })

    it('во время частичного ввода — поле показывает значение родителя', async () => {
        const mounted = mountField({ modelValue: '' })
        const { wrapper } = mounted

        await fieldOf(wrapper).trigger('focus')
        await typeInto(wrapper, '', { badInput: true })
        await wrapper.setProps({ modelValue: '01.02.2026' })

        expect(fieldOf(wrapper).element.value).toBe('2026-02-01')
        expectNoEvents(wrapper)
        expectClean(mounted)
    })
})

describe('PickDayNative: ластик', () => {
    it('очищает: пустая строка и changed, по одному', async () => {
        const mounted = mountField({ modelValue: '15.03.2026' })
        const { wrapper } = mounted

        await eraserOf(wrapper).trigger('click')

        expectSent(wrapper, '')
        expectClean(mounted)
    })
})

describe('PickDayNative: календарь', () => {
    it('клик вызывает showPicker один раз', async () => {
        const mounted = mountField()
        const showPicker = vi.fn()

        fieldOf(mounted.wrapper).element.showPicker = showPicker
        await fieldOf(mounted.wrapper).trigger('click')

        expect(showPicker).toHaveBeenCalledTimes(1)
        expectClean(mounted)
    })

    it('showPicker бросает — без ошибок', async () => {
        const mounted = mountField()

        fieldOf(mounted.wrapper).element.showPicker = () => {
            throw new DOMException('Нужен жест пользователя', 'NotAllowedError')
        }
        await fieldOf(mounted.wrapper).trigger('click')

        expectClean(mounted)
    })

    it('без showPicker — без ошибок', async () => {
        const mounted = mountField()

        expect('showPicker' in fieldOf(mounted.wrapper).element).toBe(false)
        await fieldOf(mounted.wrapper).trigger('click')

        expectClean(mounted)
    })
})

describe('PickDayNative: язык', () => {
    it('недопустимый lang — предупреждение валидатора, без ошибок', () => {
        const { errors, warnings } = mountField({ lang: 'de' })

        expect(errors).toEqual([])
        expect(warnings.length).toBeGreaterThan(0)
        for (const warning of warnings) {
            expect(warning).toContain('Invalid prop')
        }
    })
})
```

`tests/exports.test.js`: заголовок теста `'ровно семнадцать компонентов и плагин'` → `'ровно восемнадцать компонентов и плагин'`; в список после `'PickDay',` добавить строку `'PickDayNative',`.

- [ ] **Step 3: Тесты падают**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
npx vitest run tests/date.test.js tests/PickDayNative.test.js tests/exports.test.js 2>&1 | tail -15
```

Expected: FAIL — `formatIsoDay`/`parseIsoDay` не экспортируются, `PickDayNative.vue` не найден, в экспортах нет `PickDayNative`.

- [ ] **Step 4: `src/date.js`**

Файл целиком:

```js
export function formatDay(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).padStart(4, "0");

    return `${day}.${month}.${year}`;
}

export function parseDay(value) {
    const parts = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);

    if (parts === null) {
        return null;
    }

    const [, day, month, year] = parts.map(Number);

    return makeDay(year, month, day);
}

// Значение встроенного поля даты браузера (<input type="date">) — ГГГГ-ММ-ДД.
export function formatIsoDay(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).padStart(4, "0");

    return `${year}-${month}-${day}`;
}

export function parseIsoDay(value) {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (parts === null) {
        return null;
    }

    const [, year, month, day] = parts.map(Number);

    return makeDay(year, month, day);
}

// Полночь по местному времени или null, если такой даты нет.
function makeDay(year, month, day) {
    // Конструктор Date для года 0–99 трактует его как 19xx (new Date(16, 0, 1) —
    // это 1916-й, а не 16-й), setFullYear такой подмены не делает.
    const date = new Date(0);

    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0);

    // Переполнение (например, 31.02.2026) Date не отклоняет, а тихо переносит на
    // следующий месяц — сверяем компоненты после сборки и отсекаем такие даты сами.
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
        return null;
    }

    return date;
}
```

- [ ] **Step 5: `src/components/PickDayNative.vue`**

```vue
<template>
    <div class="bb-dashboard-ui bb:flex bb:flex-col">
        <div class="bb:relative bb:flex bb:h-full bb:cursor-pointer bb:leading-none">
            <!-- Геометрия поля — как у PickDay: py-2 pr-3 и рамка в 1 px, левого
                 отступа нет — его задаёт родитель. Иконка календаря браузера
                 скрыта: календарь открывается кликом по всему полю. Пока даты нет
                 и поле не в фокусе, текст поля прозрачен — маску браузера
                 закрывает подпись. -->
            <input
                ref="field"
                type="date"
                :value="fieldValue"
                :aria-label="label || null"
                class="bb:w-full bb:h-full bb:py-2 bb:pr-3 bb:leading-none bb:border bb:border-transparent bb:whitespace-nowrap bb:bg-transparent bb:cursor-pointer bb:focus:outline-hidden bb:[&::-webkit-calendar-picker-indicator]:hidden"
                :class="{ 'bb:text-transparent': hidesMask }"
                @click="openCalendar"
                @input="takeInput"
                @focus="isFocused = true"
                @blur="showModelValue"
            />

            <!-- Подпись пропускает клики в поле; имя поля для скринридера — в
                 aria-label. text-sm и gray-300 — как у подсказки PickDay;
                 left-px — над началом текста, за рамкой поля. -->
            <span
                v-if="showsLabel"
                aria-hidden="true"
                class="bb:absolute bb:inset-y-0 bb:left-px bb:flex bb:items-center bb:text-sm bb:text-gray-300 bb:whitespace-nowrap bb:pointer-events-none"
            >{{ label }}</span>

            <eraser v-if="needsEraser" @click="clear" class="bb:z-10 bb:h-full bb:pr-2"/>
        </div>
    </div>
</template>

<script>
import Eraser from "./Eraser.vue";
import { formatDay, formatIsoDay, parseDay, parseIsoDay } from "../date.js";
import { withLang } from "../lang.js";

// Поле показывает и отдаёт родителю даты с годом из четырёх цифр. Нижняя
// граница отсекает и значения, которые поле даты HTML не примет (год 0), и
// промежуточные 0002, 0020, 0202 — их браузер сообщает на каждую цифру, пока
// набирается год.
const MIN_YEAR = 1000;
const MAX_YEAR = 9999;

function inYearRange(date) {
    return date !== null && date.getFullYear() >= MIN_YEAR && date.getFullYear() <= MAX_YEAR;
}

// Выбор даты на встроенном поле браузера с API PickDay. Значение — ДД.ММ.ГГГГ;
// видимый формат даты в поле, первый день недели и вид календаря задаёт
// браузер. Своих текстов нет: lang принимается ради одинакового с PickDay API.
export default {
    components: {
        Eraser,
    },

    mixins: [withLang],

    emits: ["update:modelValue", "changed"],

    props: {
        modelValue: {
            type: String,
            default: "",
        },
        withEraser: {
            type: Boolean,
            default: true,
        },
        placeholderText: {
            type: String,
            default: "",
        },
    },

    data() {
        return {
            isFocused: false,
        };
    },

    computed: {
        // Значение встроенного поля — ГГГГ-ММ-ДД; пустая строка — даты нет.
        // null и undefined — как пустая строка.
        fieldValue() {
            const date = parseDay(this.modelValue ?? "");

            return inYearRange(date) ? formatIsoDay(date) : "";
        },

        hasDate() {
            return this.fieldValue !== "";
        },

        label() {
            return this.placeholderText ?? "";
        },

        hidesMask() {
            return !this.hasDate && !this.isFocused;
        },

        showsLabel() {
            return this.hidesMask && this.label !== "";
        },

        needsEraser() {
            return this.withEraser && this.hasDate;
        },
    },

    methods: {
        // Без showPicker() или без жеста пользователя браузер бросает
        // исключение — тогда поле работает так, как задумал браузер.
        openCalendar() {
            try {
                this.$refs.field.showPicker();
            } catch {
                // Календарь не открылся; ввод с клавиатуры по-прежнему работает.
            }
        },

        // Частичный ввод и год вне диапазона родителю не уходят; пустое поле —
        // очистка кнопкой браузера или стиранием всей даты.
        takeInput(event) {
            const field = event.target;

            if (field.validity.badInput) {
                return;
            }

            if (field.value === "") {
                this.send("");

                return;
            }

            const date = parseIsoDay(field.value);

            if (!inYearRange(date)) {
                return;
            }

            this.send(formatDay(date));
        },

        // Значение уходит, только если отличается от modelValue: ответ тем же
        // значением вернул бы родителю его же.
        send(day) {
            if (day === (this.modelValue ?? "")) {
                return;
            }

            this.$emit("update:modelValue", day);
            this.$emit("changed");
        },

        // Незавершённый ввод отбрасывается: поле снова показывает modelValue.
        // Значение пишется в элемент напрямую — уход фокуса не всегда
        // перерисовывает компонент, а без перерисовки Vue поле не тронет.
        showModelValue() {
            this.isFocused = false;
            this.$refs.field.value = this.fieldValue;
        },

        clear() {
            this.send("");
        },
    },
};
</script>
```

- [ ] **Step 6: Ресет встроенных частей поля даты — `src/styles/index.css`**

В слое `components` комментарий

```css
    /* Как у @tailwindcss/forms, а не как у preflight: у нас только текстовые
       поля, и родной вид им не нужен. */
```

заменить на

```css
    /* Как у @tailwindcss/forms, а не как у preflight: родной вид не нужен ни
       текстовым полям, ни полю даты PickDayNative. */
```

и после правила `.bb-dashboard-ui input:focus { … }` добавить:

```css
    /* Встроенные части поля даты — как у @tailwindcss/forms (preflight
       Tailwind 4 задаёт те же, кроме высоты 1lh): без этого поле
       PickDayNative в приложении с плагином или preflight было бы другой
       высоты, чем без них. Каждый псевдоэлемент — отдельным правилом:
       браузер, который его не знает, отбросил бы весь список селекторов. */
    .bb-dashboard-ui ::-webkit-datetime-edit-fields-wrapper {
        padding: 0;
    }

    .bb-dashboard-ui ::-webkit-date-and-time-value {
        min-height: 1.5em;
        text-align: inherit;
    }

    .bb-dashboard-ui ::-webkit-datetime-edit {
        display: inline-flex;
        padding-top: 0;
        padding-bottom: 0;
    }

    .bb-dashboard-ui ::-webkit-datetime-edit-year-field {
        padding-top: 0;
        padding-bottom: 0;
    }

    .bb-dashboard-ui ::-webkit-datetime-edit-month-field {
        padding-top: 0;
        padding-bottom: 0;
    }

    .bb-dashboard-ui ::-webkit-datetime-edit-day-field {
        padding-top: 0;
        padding-bottom: 0;
    }
```

- [ ] **Step 7: Экспорт — `src/index.js`**

После строки `export { default as PickDay } from './components/PickDay.vue'` добавить:

```js
export { default as PickDayNative } from './components/PickDayNative.vue'
```

- [ ] **Step 8: Все тесты, сборка**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
out=$(npm test -- --reporter=verbose 2>&1); rc=$?
printf '%s\n' "$out" | tail -8
test "$rc" -eq 0 || { echo "ПРОВАЛ: npm test"; exit 1; }
test "$(printf '%s\n' "$out" | grep -acE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled')" -eq 0 || { echo "ПРОВАЛ: диагностика"; exit 1; }
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения сборки"; exit 1; }
grep -c 'calendar-picker-indicator' dist/style.css
grep -c 'webkit-datetime-edit-day-field' dist/style.css
echo ok
```

Expected: все тесты зелёные (в том числе `utilityPrefix` — по тесту на новый файл), диагностика `0`, оба `grep -c` ≥ `1`, `ok`.

- [ ] **Step 9: Commit**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
git add src/date.js src/components/PickDayNative.vue src/styles/index.css src/index.js tests/date.test.js tests/PickDayNative.test.js tests/exports.test.js
git commit -m "feat: добавить PickDayNative — выбор даты на встроенном поле браузера"
```

---

### Task 3: `SelectDateInterval` на `PickDayNative`

**Files:**
- Modify: `src/components/SelectDateInterval.vue`
- Test: `tests/SelectDateInterval.test.js`, `tests/i18n.test.js`

**Interfaces:**
- Consumes: `PickDayNative` (задача 2): `v-model`, `placeholder-text`, `lang`; разметка — `input[type="date"]`, подпись `span[aria-hidden="true"]`.
- Produces: `SelectDateInterval` без `PickDay` внутри; в `tests/i18n.test.js` у таблицы «недопустимый lang» — необязательное поле случая `read(wrapper)` (по умолчанию `wrapper.text()`).

- [ ] **Step 1: Тесты `SelectDateInterval`**

`tests/SelectDateInterval.test.js` — импорт `import { afterEach, describe, expect, it } from 'vitest'` оставить; после импорта `SelectDateInterval` добавить `import PickDayNative from '../src/components/PickDayNative.vue'`. В конец `describe('SelectDateInterval', …)` (после существующего теста) добавить:

```js
    function mountInterval(props = {}) {
        const errors = []
        const warnings = []
        const wrapper = mount(SelectDateInterval, {
            props: { header: 'Период', ...props },
            attachTo: document.body,
            global: {
                config: {
                    errorHandler: (error) => errors.push(error),
                    warnHandler: (message) => warnings.push(message),
                },
            },
        })

        return { wrapper, errors, warnings }
    }

    it('внутри два встроенных поля даты с подписями от и до', () => {
        const { wrapper, errors, warnings } = mountInterval()

        expect(wrapper.findAllComponents(PickDayNative)).toHaveLength(2)
        expect(wrapper.findAll('input[type="date"]').map((input) => input.attributes('aria-label'))).toEqual(['от', 'до'])
        expect(wrapper.find('.pika-single').exists()).toBe(false)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('ввод даты в первое поле — update:dateFrom и changed', async () => {
        const { wrapper, errors, warnings } = mountInterval()
        const input = wrapper.findAll('input[type="date"]')[0]

        input.element.value = '2026-03-15'
        await input.trigger('input')

        expect(wrapper.emitted('update:dateFrom')).toEqual([['15.03.2026']])
        expect(wrapper.emitted('changed')).toEqual([[]])
        expect(wrapper.emitted('update:dateTo')).toBeUndefined()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('фокус в одном поле не прячет подпись другого', async () => {
        const { wrapper, errors, warnings } = mountInterval()
        const [from, to] = wrapper.findAllComponents(PickDayNative)

        await from.get('input').trigger('focus')

        expect(from.find('span[aria-hidden="true"]').exists()).toBe(false)
        expect(to.get('span[aria-hidden="true"]').text()).toBe('до')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
```

В начало файла, после `enableAutoUnmount(afterEach)`, добавить:

```js
afterEach(() => {
    document.body.innerHTML = ''
})
```

- [ ] **Step 2: `tests/i18n.test.js` — интервал**

После импорта `PickDay` добавить `import PickDayNative from '../src/components/PickDayNative.vue'`.

Блок `describe('SelectDateInterval: подсказки и оба календаря', …)` целиком заменить на:

```js
describe('SelectDateInterval: подписи полей', () => {
    const cases = [
        { name: 'без плагина — ru', global: {}, props: {}, labels: ['от', 'до'] },
        { name: 'плагин en', global: inApp({ lang: 'en' }), props: {}, labels: ['from', 'to'] },
        { name: 'проп lang en главнее плагина ru', global: inApp({ lang: 'ru' }), props: { lang: 'en' }, labels: ['from', 'to'] },
        { name: 'проп lang ru главнее плагина en', global: inApp({ lang: 'en' }), props: { lang: 'ru' }, labels: ['от', 'до'] },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const wrapper = mount(SelectDateInterval, { props: { header: 'Интервал', ...testCase.props }, global: testCase.global })
            const fields = wrapper.findAllComponents(PickDayNative)

            // Подпись поверх поля и имя поля для скринридера — на языке интервала.
            expect(fields.map((field) => field.get('span[aria-hidden="true"]').text())).toEqual(testCase.labels)
            expect(fields.map((field) => field.get('input').attributes('aria-label'))).toEqual(testCase.labels)
        })
    }
})
```

В таблице `describe('недопустимый lang: язык плагина, а не падение', …)` строку случая `SelectDateInterval` заменить на:

```js
        { name: 'SelectDateInterval, lang de и плагин en — English', component: SelectDateInterval, props: { header: 'Интервал', lang: 'de' }, global: inApp({ lang: 'en' }), read: (wrapper) => wrapper.get('input[type="date"]').attributes('aria-label'), expected: 'from' },
```

и в теле цикла этой таблицы строку `expect(wrapper.text()).toContain(testCase.expected)` заменить на:

```js
            const actual = testCase.read ? testCase.read(wrapper) : wrapper.text()
            expect(actual).toContain(testCase.expected)
```

- [ ] **Step 3: Тесты падают**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
npx vitest run tests/SelectDateInterval.test.js tests/i18n.test.js 2>&1 | tail -15
```

Expected: FAIL — внутри интервала `PickDay`: нет `input[type="date"]` и `PickDayNative`.

- [ ] **Step 4: `src/components/SelectDateInterval.vue`**

В шаблоне две строки

```html
                    <pick-day v-model="userDateFrom" class="bb:flex-1 bb:min-w-36 bb:pl-3" :placeholder-text="texts.dateFrom" :lang="resolvedLang"/>
                    <pick-day v-model="userDateTo" class="bb:flex-1 bb:min-w-36 bb:pl-3" :placeholder-text="texts.dateTo" :lang="resolvedLang"/>
```

заменить на

```html
                    <pick-day-native v-model="userDateFrom" class="bb:flex-1 bb:min-w-36 bb:pl-3" :placeholder-text="texts.dateFrom" :lang="resolvedLang"/>
                    <pick-day-native v-model="userDateTo" class="bb:flex-1 bb:min-w-36 bb:pl-3" :placeholder-text="texts.dateTo" :lang="resolvedLang"/>
```

в скрипте `import PickDay from "./PickDay.vue";` → `import PickDayNative from "./PickDayNative.vue";`, в `components` строку `        PickDay,` → `        PickDayNative,`.

- [ ] **Step 5: Все тесты, чистота вывода**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
out=$(npm test -- --reporter=verbose 2>&1); rc=$?
printf '%s\n' "$out" | tail -8
test "$rc" -eq 0 || { echo "ПРОВАЛ: npm test"; exit 1; }
test "$(printf '%s\n' "$out" | grep -acE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled')" -eq 0 || { echo "ПРОВАЛ: диагностика"; exit 1; }
echo ok
```

Expected: все зелёные, диагностика `0`, `ok`.

- [ ] **Step 6: Commit**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
git add src/components/SelectDateInterval.vue tests/SelectDateInterval.test.js tests/i18n.test.js
git commit -m "feat: построить SelectDateInterval на PickDayNative"
```

---

### Task 4: SSR — `PageCard`, ленивый pikaday, серверный рендер и гидратация

**Files:**
- Modify: `src/components/PageCard.vue`, `src/components/PickDay.vue`
- Create: `tests/ssrFixtures.js`, `tests/ssr.test.js`, `tests/hydration.test.js`
- Test: `tests/PageCard.test.js`, `tests/PickDay.test.js`, `tests/i18n.test.js`

**Interfaces:**
- Consumes: экспорты `src/index.js` (восемнадцать компонентов после задачи 2).
- Produces: `ssrFixtures` — `{ [имя экспорта]: { props?, slots? } }` для каждого компонента; `PickDay` с нереактивными полями `picker` (`null` до загрузки pikaday) и `isUnmounted`.

- [ ] **Step 1: Фикстуры и тест серверного рендера**

`tests/ssrFixtures.js`:

```js
import { h } from 'vue'

// Минимальные пропсы и слоты каждого экспортируемого компонента для серверного
// рендера и гидратации. Компоненты, чьё содержимое зависит от значения, — в
// открытом состоянии, чтобы на сервере рендерилось и оно. Компонент без
// фикстуры роняет tests/ssr.test.js.
export const ssrFixtures = {
    Closer: {},
    ConfirmationModal: { props: { isOpen: true, actionButtonText: 'Удалить', confirmationHeading: 'Удалить запись?', confirmationText: 'Действие нельзя отменить.' } },
    Dot: { props: { color: 'green' } },
    DownloadLink: { props: { url: '/export.xlsx' } },
    DropdownButtonWithAction: { slots: { button: () => 'Действие', actions: () => h('a', { href: '#' }, 'Другое действие') } },
    ErrorMessages: { props: { messages: { email: 'Неверный email' } } },
    NavigationMenuElement: { props: { url: '/section', name: 'Раздел' } },
    NotificationMessage: { props: { modelValue: 'Письмо отправлено', type: 'confirmation', notificationHeading: 'Готово' } },
    PageCard: { slots: { default: () => h('h3', 'Заголовок') } },
    Pagination: { props: { links: { prev: '/list?page=1', next: '/list?page=3' }, meta: { from: 16, to: 30, total: 40 } } },
    PickDay: { props: { modelValue: '15.03.2026', placeholderText: 'от' } },
    PickDayNative: { props: { modelValue: '15.03.2026', placeholderText: 'от' } },
    Popup: { props: { modelValue: true }, slots: { default: () => h('div', 'Меню') } },
    RussianMobileFilter: { props: { header: 'Телефон', modelValue: '79031234567' } },
    Search: { props: { header: 'Поиск', modelValue: 'запрос' } },
    SelectDateInterval: { props: { header: 'Интервал', dateFrom: '01.03.2026', dateTo: '15.03.2026' } },
    SelectSingle: { props: { header: 'Вендор', items: [{ id: 'a', name: 'Первый' }], modelValue: 'a' } },
    SmallBadge: { props: { text: 'Новый', color: 'green' } },
}
```

`tests/ssr.test.js`:

```js
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import * as pkg from '../src/index.js'
import { ssrFixtures } from './ssrFixtures.js'

// Серверный рендер без браузера: загрузка пакета и рендер каждого
// экспортируемого компонента не должны касаться window и document.

const componentNames = Object.keys(pkg).filter((name) => name !== 'dashboardUi').sort()

async function renderOnServer(name) {
    const warnings = []
    const errors = []
    const fixture = ssrFixtures[name]
    const app = createSSRApp({ render: () => h(pkg[name], fixture.props ?? {}, fixture.slots) })

    app.config.warnHandler = (message) => warnings.push(message)
    app.config.errorHandler = (error) => errors.push(error)

    const html = await renderToString(app)

    return { html, warnings, errors }
}

describe('SSR: окружение', () => {
    it('нет window и document', () => {
        expect(typeof window).toBe('undefined')
        expect(typeof document).toBe('undefined')
    })

    it('фикстура есть у каждого экспортируемого компонента, и только у них', () => {
        expect(Object.keys(ssrFixtures).sort()).toEqual(componentNames)
    })
})

describe('SSR: рендер каждого компонента', () => {
    for (const name of componentNames) {
        it(name, async () => {
            const { html, warnings, errors } = await renderOnServer(name)

            expect(html.length).toBeGreaterThan(0)
            expect(errors).toEqual([])
            expect(warnings).toEqual([])
        })
    }
})

describe('SSR: PageCard', () => {
    it('на сервере крестика нет и места под него нет', async () => {
        const { html, warnings, errors } = await renderOnServer('PageCard')

        expect(html).not.toContain('M6 18L18 6M6 6l12 12')
        expect(html).toContain('bb:[--bb-closer-space:0px]')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})
```

- [ ] **Step 2: Тест гидратации**

`tests/hydration.test.js`:

```js
// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { flushPromises } from '@vue/test-utils'
import * as pkg from '../src/index.js'
import { ssrFixtures } from './ssrFixtures.js'

afterEach(() => {
    document.body.innerHTML = ''
})

const CROSS_PATH = 'path[d="M6 18L18 6M6 6l12 12"]'
const componentNames = Object.keys(pkg).filter((name) => name !== 'dashboardUi').sort()

// Серверный HTML кладётся в контейнер и гидратируется. Подробности
// расхождений Vue пишет предупреждениями, а итог — один раз за модуль — через
// console.error, поэтому собираются оба канала.
async function hydrate(render) {
    const serverWarnings = []
    const server = createSSRApp({ render })
    server.config.warnHandler = (message) => serverWarnings.push(message)
    const html = await renderToString(server)

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)

    const warnings = []
    const errors = []
    const client = createSSRApp({ render })
    client.config.warnHandler = (message) => warnings.push(message)
    client.config.errorHandler = (error) => errors.push(error)

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let consoleErrors
    let consoleWarns
    try {
        client.mount(container)
        // PickDay загружает pikaday в mounted(): загрузка заканчивается до
        // конца теста, а не после.
        await vi.dynamicImportSettled()
        await flushPromises()
    } finally {
        consoleErrors = [...consoleError.mock.calls]
        consoleWarns = [...consoleWarn.mock.calls]
        consoleError.mockRestore()
        consoleWarn.mockRestore()
    }

    return { html, container, client, serverWarnings, warnings, errors, consoleErrors, consoleWarns }
}

function renderFixture(name) {
    const fixture = ssrFixtures[name]

    return () => h(pkg[name], fixture.props ?? {}, fixture.slots)
}

describe('гидратация каждого компонента', () => {
    for (const name of componentNames) {
        it(name, async () => {
            const result = await hydrate(renderFixture(name))

            expect(result.serverWarnings).toEqual([])
            expect(result.warnings).toEqual([])
            expect(result.errors).toEqual([])
            expect(result.consoleErrors).toEqual([])
            expect(result.consoleWarns).toEqual([])
            result.client.unmount()
        })
    }
})

describe('гидратация PageCard при истории вкладки', () => {
    beforeAll(() => {
        window.history.pushState({ hydrationTest: true }, '')
        expect(window.history.length).toBeGreaterThan(1)
    })

    it('сервер — без крестика, после гидратации крестик появляется без расхождений', async () => {
        const result = await hydrate(renderFixture('PageCard'))

        expect(result.html).not.toContain('M6 18L18 6M6 6l12 12')

        await nextTick()

        expect(result.container.querySelector(CROSS_PATH)).not.toBeNull()
        expect(result.warnings).toEqual([])
        expect(result.errors).toEqual([])
        expect(result.consoleErrors).toEqual([])
        result.client.unmount()
    })
})

// Последним: console.error с итогом Vue пишет один раз за модуль, и проверка
// самой проверки не должна забрать его у компонентов.
describe('проверка ловит расхождения', () => {
    it('разный текст на сервере и в браузере — предупреждение и console.error', async () => {
        let renders = 0
        const Mismatch = { render: () => h('p', renders++ === 0 ? 'сервер' : 'браузер') }

        const result = await hydrate(() => h(Mismatch))

        expect(result.warnings.some((warning) => warning.includes('Hydration'))).toBe(true)
        expect(result.consoleErrors.length).toBeGreaterThan(0)
        result.client.unmount()
    })
})
```

- [ ] **Step 3: Тесты `PageCard` и `PickDay`**

`tests/PageCard.test.js`:

1. импорт `import { enableAutoUnmount, mount } from '@vue/test-utils'` оставить, добавить `import { nextTick } from 'vue'`;
2. комментарий

```js
// Компонент читает history.length при создании. Порядок блоков важен: первый
// монтирует при истории из одной записи, последний добавляет запись до своих
// монтирований.
```

   заменить на

```js
// Компонент читает history.length после монтирования. Порядок блоков важен:
// первый монтирует при истории из одной записи, последний добавляет запись до
// своих монтирований.
```

3. тест `'крестика нет, места под него нет'` — сделать `async`, после `const { wrapper, errors, warnings } = mountCard()` добавить `await nextTick()`;
4. в `describe('PageCard: вкладка с историей', …)` комментарий `// До монтирования: компонент читает history.length при создании.` → `// До монтирования: компонент читает history.length после монтирования.`; в каждом тесте блока (крестик после слота, три теста доступного имени, клик) — сделать `async` (где ещё не) и сразу после `mountCard(…)` добавить `await nextTick()`;
5. в конец блока `'PageCard: вкладка с историей'` добавить:

```js
    it('крестик появляется после монтирования, а не при создании', async () => {
        const { wrapper, errors, warnings } = mountCard()

        // mounted() уже прочёл историю, но перерисовка ещё не прошла.
        expect(findCross(wrapper)).toBeUndefined()
        expect(wrapper.classes()).toContain('bb:[--bb-closer-space:0px]')

        await nextTick()

        expect(findCross(wrapper)).toBeDefined()
        expect(wrapper.classes()).toContain('bb:[--bb-closer-space:3.5rem]')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
```

`tests/PickDay.test.js` — импорты заменить на:

```js
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import PickDay from '../src/components/PickDay.vue'
import { formatDay } from '../src/date.js'
```

после `enableAutoUnmount(afterEach)` добавить:

```js
afterEach(() => {
    document.body.innerHTML = ''
})

// pikaday загружается в mounted(): дожидаемся загрузки и создания календаря.
async function pikadayLoaded() {
    await vi.dynamicImportSettled()
    await flushPromises()
}
```

и в конец `describe('PickDay', …)`:

```js
    it('календарь создаётся после загрузки pikaday', async () => {
        const errors = []
        const wrapper = mount(PickDay, {
            props: { modelValue: '15.03.2026' },
            attachTo: document.body,
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        // Загрузка модуля асинхронна: сразу после mount() календаря ещё нет.
        expect(wrapper.vm.picker).toBeNull()
        expect(wrapper.find('.pika-single').exists()).toBe(false)

        await pikadayLoaded()

        expect(wrapper.find('.pika-single').exists()).toBe(true)
        expect(formatDay(wrapper.vm.picker.getDate())).toBe('15.03.2026')
        expect(errors).toEqual([])
    })

    it('значение, пришедшее до загрузки pikaday, — в календаре после загрузки', async () => {
        const errors = []
        const wrapper = mount(PickDay, {
            props: { modelValue: '' },
            attachTo: document.body,
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        // Календаря ещё нет: синхронизация и очистка не должны падать.
        wrapper.vm.syncPicker('01.02.2026')
        wrapper.setProps({ modelValue: '01.02.2026' })

        await pikadayLoaded()

        expect(formatDay(wrapper.vm.picker.getDate())).toBe('01.02.2026')
        expect(errors).toEqual([])
    })

    it('размонтирование до загрузки pikaday — без ошибок и без календаря', async () => {
        // createApp, а не mount: автоматическое размонтирование тестовых
        // обёрток размонтировало бы приложение второй раз.
        const errors = []
        const container = document.createElement('div')
        document.body.appendChild(container)
        const app = createApp(PickDay)
        app.config.errorHandler = (error) => errors.push(error)
        const vm = app.mount(container)

        app.unmount()
        await pikadayLoaded()

        expect(vm.picker).toBeNull()
        expect(document.querySelector('.pika-single')).toBeNull()
        expect(errors).toEqual([])
    })
```

`tests/i18n.test.js`:

1. импорт `import { afterEach, beforeAll, describe, expect, it } from 'vitest'` → `import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'`; импорт `import { enableAutoUnmount, mount } from '@vue/test-utils'` → `import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'`; добавить `import { nextTick } from 'vue'`;
2. после `const inApp = …` добавить:

```js
// pikaday загружается в mounted() PickDay: календарь появляется после загрузки.
async function pikadayLoaded() {
    await vi.dynamicImportSettled()
    await flushPromises()
}
```

3. в таблице «недопустимый lang: язык плагина, а не падение» тело `it(testCase.name, () => {` → `it(testCase.name, async () => {`, и сразу после `mount(…)` (перед чтением `actual`) добавить `await pikadayLoaded()`;
4. в «недопустимый lang: крестик PageCard» комментарий `// Крестик рисуется, только если в истории больше одной записи; компонент читает её при создании.` (две строки) → `// Крестик рисуется, только если в истории больше одной записи; компонент читает её после монтирования.`; тест сделать `async` и после `mount(PageCard, …)` добавить `await nextTick()`;
5. в «PickDay: месяц в шапке календаря» и «PickDay: календарь» — тесты `async`, после `mount(PickDay, …)` добавить `await pikadayLoaded()`; комментарий `// Pikaday рисует календарь в контейнер сразу (bound: false);` → `// Pikaday рисует календарь в контейнер, как только создан (bound: false);`.

- [ ] **Step 4: Тесты падают**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
npx vitest run tests/ssr.test.js tests/hydration.test.js tests/PageCard.test.js tests/PickDay.test.js 2>&1 | tail -25
```

Expected: FAIL — `ssr.test.js` падает на загрузке пакета (`window is not defined`); в гидратации `PageCard` при истории крестик есть в серверном HTML; `PageCard` — крестик есть сразу после `mount()`; `PickDay` — `picker` не `null` сразу после `mount()`.

- [ ] **Step 5: `PageCard`**

В `src/components/PageCard.vue` блок `data()` заменить на:

```js
    data() {
        return {
            // Крестик есть, если в истории вкладки больше одной записи — как на
            // страницах до компонента. Это число записей, включая записи
            // впереди текущей, а не гарантия, что назад есть куда. Читается
            // один раз после монтирования: на сервере истории нет, поэтому
            // сервер и гидратация рисуют карточку без крестика.
            canGoBack: false,
        };
    },

    mounted() {
        this.canGoBack = window.history.length > 1;
    },
```

- [ ] **Step 6: `PickDay`**

В `src/components/PickDay.vue`:

1. строку `import Pikaday from "pikaday";` удалить (`import "pikaday/css/pikaday.css";` остаётся);
2. `created()` заменить на:

```js
    created() {
        // Нереактивные поля: инстанс pikaday нельзя заворачивать в прокси Vue.
        this.picker = null;
        this.isUnmounted = false;
    },
```

3. `mounted() {` → `async mounted() {`, и первой строкой тела — перед `this.picker = new Pikaday({` — вставить:

```js
        // pikaday загружается здесь, а не при загрузке модуля: он обращается к
        // window сразу при выполнении своего модуля, и статический импорт
        // уронил бы загрузку всего пакета на сервере (SSR).
        const { default: Pikaday } = await import("pikaday");

        if (this.isUnmounted) {
            return;
        }

```

4. `beforeUnmount()` заменить на:

```js
    beforeUnmount() {
        this.isUnmounted = true;
        this.picker?.destroy();
    },
```

5. в `syncPicker(value)` первой строкой тела (перед `const date = parseDay(value);`) вставить:

```js
            // Календаря ещё нет: pikaday при создании прочтёт значение из поля.
            if (this.picker === null) {
                return;
            }

```

6. в `clearPicker()` строку `this.picker.clear();` → `this.picker?.clear();`.

- [ ] **Step 7: Все тесты, чистота вывода**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
out=$(npm test -- --reporter=verbose 2>&1); rc=$?
printf '%s\n' "$out" | tail -8
test "$rc" -eq 0 || { echo "ПРОВАЛ: npm test"; exit 1; }
test "$(printf '%s\n' "$out" | grep -acE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled')" -eq 0 || { echo "ПРОВАЛ: диагностика"; exit 1; }
echo ok
```

Expected: все зелёные, диагностика `0`, `ok`.

- [ ] **Step 8: Сборка грузится в Node**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения сборки"; exit 1; }
grep -c 'from "pikaday"' dist/index.js
grep -c 'import("pikaday")' dist/index.js
node --input-type=module -e "const m = await import('./dist/index.js'); console.log('loaded', Object.keys(m).length)"
```

Expected: первый `grep -c` — `0` (статического импорта нет), второй — `1`; `loaded 19`.

- [ ] **Step 9: Commit**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
git add src/components/PageCard.vue src/components/PickDay.vue tests/ssrFixtures.js tests/ssr.test.js tests/hydration.test.js tests/PageCard.test.js tests/PickDay.test.js tests/i18n.test.js
git commit -m "feat: поддержать серверный рендеринг во всём пакете"
```

---

### Task 5: Playground и README

**Files:**
- Modify: `playground/App.vue`, `README.md`

**Interfaces:**
- Consumes: `PickDayNative` из `../dist/index.js`.
- Produces: секция playground «PickDayNative» с элементами `[data-demo="empty"]`, `[data-demo="filled"]`, `[data-demo="no-eraser"]`, `[data-demo="en"]` (обёртки `.field` полей) и абзацами `[data-demo="empty-state"]`, `[data-demo="filled-state"]` вида `Значение: <ДД.ММ.ГГГГ или (пусто)>, событий: <N>`; абзац секции «SelectDateInterval» вида `С <…> по <…>, событий: <N>`.

- [ ] **Step 1: Playground**

`playground/App.vue`:

1. после секции `PickDay` (закрывающий `</section>` после `<p>Значение: {{ day === '' ? '(пусто)' : day }}</p>`) вставить:

```html
        <section>
            <h2>PickDayNative</h2>
            <div class="demo-row">
                <div class="field" data-demo="empty">
                    <pick-day-native v-model="nativeDay" placeholder-text="от" @changed="nativeDayCommits++"/>
                </div>
                <div class="field" data-demo="filled">
                    <pick-day-native v-model="nativeFilledDay" placeholder-text="до" @changed="nativeFilledDayCommits++"/>
                </div>
                <div class="field" data-demo="no-eraser">
                    <pick-day-native v-model="nativeNoEraserDay" :with-eraser="false"/>
                </div>
                <div class="field" data-demo="en">
                    <pick-day-native v-model="nativeEnglishDay" placeholder-text="from" lang="en"/>
                </div>
            </div>
            <p data-demo="empty-state">Значение: {{ nativeDay === '' ? '(пусто)' : nativeDay }}, событий: {{ nativeDayCommits }}</p>
            <p data-demo="filled-state">Значение: {{ nativeFilledDay === '' ? '(пусто)' : nativeFilledDay }}, событий: {{ nativeFilledDayCommits }}</p>
        </section>
```

2. в секции `SelectDateInterval` у `<select-date-interval` после `v-model:date-to="dateTo"` добавить строку `                @changed="intervalCommits++"`; абзац `<p>С {{ dateFrom || '(пусто)' }} по {{ dateTo || '(пусто)' }}</p>` → `<p>С {{ dateFrom || '(пусто)' }} по {{ dateTo || '(пусто)' }}, событий: {{ intervalCommits }}</p>`;
3. в импорт из `'../dist/index.js'` и в `components` после `PickDay,` добавить `PickDayNative,`;
4. в `data()` после `day: '',` добавить:

```js
            nativeDay: '',
            nativeDayCommits: 0,
            nativeFilledDay: '15.03.2026',
            nativeFilledDayCommits: 0,
            nativeNoEraserDay: '15.03.2026',
            nativeEnglishDay: '',
```

   и после `dateTo: '',` — `            intervalCommits: 0,`.

- [ ] **Step 2: README**

Все строки прозы — не длиннее 80 символов.

1. Раздел «Компоненты», первый абзац — целиком:

```
Пакет экспортирует восемнадцать компонентов: `Popup`, `Dot`, `PickDay`,
`PickDayNative`, `RussianMobileFilter`, `Search`, `SelectDateInterval`,
`SelectSingle`, `SmallBadge`, `ErrorMessages`, `Closer`, `DownloadLink`,
`ConfirmationModal`, `DropdownButtonWithAction`, `Pagination`,
`NavigationMenuElement`, `PageCard`, `NotificationMessage` и плагин
`dashboardUi`. В архив пакета (`files: ["dist"]`) исходники не попадают,
поэтому контракт каждого компонента — здесь и в playground, а не в исходном
коде.
```

2. `### PickDay`, строку `Поле выбора одной даты на Pikaday, с ластиком очистки.` заменить на:

```
Поле выбора одной даты на Pikaday, с ластиком очистки. Pikaday загружается
в браузере при монтировании компонента, а не при загрузке пакета, поэтому
календарь появляется, когда загрузка закончится. Выбор даты на встроенном
поле браузера, без Pikaday, — `PickDayNative`.
```

3. Сразу перед `### RussianMobileFilter` вставить раздел:

```
### PickDayNative

Поле выбора одной даты на встроенном поле браузера (`<input type="date">`),
с ластиком очистки. API — как у `PickDay`, без Pikaday.

    <pick-day-native v-model="date" placeholder-text="от" />

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `modelValue` | `String` | `""` | Дата `ДД.ММ.ГГГГ` или пустая строка |
| `withEraser` | `Boolean` | `true` | Показывать ли ластик очистки |
| `placeholderText` | `String` | `""` | Подпись пустого поля и его доступное имя |
| `lang` | `String` | язык плагина | `"ru"` или `"en"`; своих текстов у компонента нет |

Значение — всегда `ДД.ММ.ГГГГ`, а видимый формат даты в поле, первый день
недели и вид календаря задаёт браузер по своему языку: в браузере на
английском поле покажет `03/15/2026`. Поле показывает даты с годом от 1000
до 9999; значение вне этого диапазона или не в формате `ДД.ММ.ГГГГ` поле
показывает пустым, без ластика.

Пока поле пустое и не в фокусе, вместо маски браузера видна подпись
`placeholderText`. Клик по полю открывает календарь браузера; дату можно и
набрать с клавиатуры, попав в поле по Tab или закрыв календарь по Escape.

События: `update:modelValue` и `changed` — всегда парой, при выборе даты в
календаре, при полном вводе даты с клавиатуры и при очистке — ластиком,
кнопкой браузера или стиранием всей даты (пустой строкой). Частично
набранная дата и год вне диапазона родителю не уходят: пока набирается год,
браузер сообщает промежуточные `0002`, `0020`, `0202`, и компонент их
пропускает, поэтому набор даты целиком даёт одно событие. Правка дня в уже
заполненной дате даёт событие на каждую цифру дня. Когда фокус уходит из
поля, оно снова показывает `modelValue`: незавершённый ввод отбрасывается.
Значение, изменённое родителем, поле показывает сразу и без событий.
```

4. `### SelectDateInterval`: строку `Пара `PickDay` под одним заголовком — интервал дат «от» и «до».` заменить на:

```
Пара `PickDayNative` под одним заголовком — интервал дат «от» и «до» на
встроенных полях даты браузера.
```

   в таблице строку `lang` → `| `lang` | `String` | язык плагина | `"ru"` или `"en"`; действует на подписи обоих полей |`; абзац событий целиком:

```
События: `update:dateFrom`, `update:dateTo` — на каждое значение, которое
отдаёт соответствующий `PickDayNative` (см. его раздел); `changed` — когда
новое значение отличается от переданного пропса (отдельно для каждой из двух
дат).
```

5. `### PageCard`, абзац о крестике: фрагмент

```
Крестик показан, если в истории вкладки больше одной записи
(`history.length > 1`, значение читается при создании компонента), и по клику
возвращает назад (`history.back()`). `PageCard` читает историю браузера при
создании компонента, поэтому ему нужен браузер: серверный рендеринг (SSR) не
поддерживается. `history.length` считает и записи впереди
текущей, поэтому это не гарантия, что назад есть куда.
```

   заменить на

```
Крестик показан, если в истории вкладки больше одной записи
(`history.length > 1`, значение читается один раз после монтирования), и по
клику возвращает назад (`history.back()`). При серверном рендеринге (SSR)
сервер историю вкладки не знает и отдаёт карточку без крестика: крестик
появляется сразу после гидратации, и на экранах уже `md` заголовок в этот
момент сдвигается, освобождая под него место. Без SSR крестик появляется до
первой отрисовки. `history.length` считает и записи впереди текущей, поэтому
это не гарантия, что назад есть куда.
```

   (остаток абзаца, начиная с `От `md` крестик стоит`, — без изменений).

6. `## Языки`: в таблицу после строки `PickDay` добавить `| `PickDayNative` — формат даты в поле и календарь | задаёт браузер | задаёт браузер |`; абзац под таблицей целиком:

```
Формат значения даты — `дд.мм.гггг` в обоих языках: это формат значения, а
не текст. У `PickDay` неделя начинается с понедельника, а календарь берёт
язык при монтировании: смена языка после монтирования в нём не отражается. У
`PickDayNative` видимый формат даты в поле и первый день недели задаёт
браузер.
```

7. Перед `## Правила API пакета` вставить раздел:

```
## SSR

Пакет загружается и рендерится на сервере (серверный рендеринг, например
Inertia SSR), а серверная разметка гидратируется без расхождений. К API
браузера компоненты обращаются только после монтирования, поэтому:

- `PageCard` на сервере рисует карточку без крестика: история вкладки
  известна только в браузере. Крестик появляется сразу после гидратации;
- `PickDay` загружает Pikaday в браузере при монтировании: календарь
  появляется, когда загрузка закончится;
- остальные компоненты, в том числе `PickDayNative`, рендерятся на сервере
  так же, как в браузере.
```

8. `## Правила API пакета`: последним пунктом списка (после пункта о ссылках, который заканчивается `NavigationMenuElement`.) добавить:

```
- Компонент обращается к `window`, `document` и другим API браузера только
  в `mounted()`, `beforeUnmount()` и обработчиках событий; загрузка модуля,
  `data()`, `computed` и рендер работают без браузера. Так пакет
  загружается и рендерится на сервере (см. «SSR»). Правило проверяют
  `tests/ssr.test.js` и `tests/hydration.test.js`: каждый экспортируемый
  компонент обязан иметь фикстуру в `tests/ssrFixtures.js`.
```

9. `## Playground`: `со всеми семнадцатью компонентами` → `со всеми восемнадцатью компонентами`.

10. Список ресета для слотов (абзац «Ресет пакета распространяется и на содержимое слотов…»): после пункта `- полям `input` — `appearance: none` и снятое кольцо фокуса (`box-shadow`).` — точку в конце этого пункта заменить на `;` и добавить пункт:

```
- встроенным частям поля даты (`::-webkit-datetime-edit` и соседним
  псевдоэлементам) — нулевые вертикальные отступы и высоту строки значения,
  как у `@tailwindcss/forms`.
```

11. После абзаца `С версии 0.10.0 `Modal` не экспортируется: …` добавить:

```
С версии 0.11.0 `SelectDateInterval` построен на `PickDayNative`: календарь
рисует браузер, дату можно набрать с клавиатуры, а видимый формат даты в
поле зависит от языка браузера. Значения и события интервала не изменились.
`PickDay` с Pikaday остаётся в пакете для тех, кому нужен прежний календарь.
```

- [ ] **Step 3: Проверка README и сборка playground**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
python3 - <<'EOF'
import re
lines = open('README.md', encoding='utf-8').read().split('\n')
inside = False
long = []
for i, line in enumerate(lines, 1):
    if line.startswith('```'):
        inside = not inside
        continue
    if inside or line.startswith('    ') or line.startswith('|'):
        continue
    if len(line) > 80:
        long.append((i, len(line)))
print('длинные строки прозы:', long)
EOF
grep -c 'семнадцат' README.md
grep -n 'SSR не\|не поддерживается' README.md
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; exit 1; }
rm -rf playground/dist
out=$(npx vite build --config vite.playground.config.js 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: playground"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения playground"; exit 1; }
echo ok
```

Expected: `длинные строки прозы: []`; `grep -c 'семнадцат'` — `0`; поиск «SSR не / не поддерживается» — пусто; `ok`.

- [ ] **Step 4: Commit**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
git add playground/App.vue README.md
git commit -m "docs: описать PickDayNative и SSR, добавить их в playground"
```

---

### Task 6: Приёмка playground «после»

Коммита нет.

**Interfaces:**
- Consumes: `$R/pg/before/*`, скрипты `$R`, вкладка `spd-pg`; playground задачи 5 (`playground/dist` собран).
- Produces: `$R/pg/after/*`, `$R/pw/*`, `$R/pg/after/verdict.md`.

- [ ] **Step 1: Скрипты состояния**

`$R/native-state.js`:

```js
() => {
    const sectionOf = (title) => [...document.querySelectorAll("section")].find((s) => s.querySelector("h2")?.textContent.trim() === title);
    const native = sectionOf("PickDayNative");
    const read = (name) => {
        const box = native.querySelector(`[data-demo="${name}"]`);
        const input = box.querySelector('input[type="date"]');
        const label = box.querySelector('span[aria-hidden="true"]');
        return {
            value: input.value,
            ariaLabel: input.getAttribute("aria-label"),
            color: getComputedStyle(input).color,
            label: label ? label.textContent.trim() : null,
            eraser: box.querySelector("button") !== null,
            focused: document.activeElement === input,
        };
    };
    const intervalOf = (title) => {
        const section = sectionOf(title);
        return {
            fields: [...section.querySelectorAll('input[type="date"]')].map((input) => ({ value: input.value, ariaLabel: input.getAttribute("aria-label") })),
            labels: [...section.querySelectorAll('span[aria-hidden="true"]')].map((span) => span.textContent.trim()),
            text: section.querySelector(":scope > p")?.textContent.trim() ?? null,
        };
    };
    return {
        empty: read("empty"),
        filled: read("filled"),
        noEraser: read("no-eraser"),
        english: read("en"),
        emptyState: native.querySelector('[data-demo="empty-state"]').textContent.trim(),
        filledState: native.querySelector('[data-demo="filled-state"]').textContent.trim(),
        interval: intervalOf("SelectDateInterval"),
        englishInterval: intervalOf('lang="en"'),
    };
}
```

`$R/date-order.js` — цифры даты 15.03.<год> в порядке частей поля по языку браузера: `full` — год 2026, `lowYear` — год `999` (три цифры: промежуточные 0009, 0099, 0999 — все вне диапазона, а первая цифра 0 дала бы недопустимый год 0), `thousandYear` — год 1000; `first` — цифры первой части:

```js
() => {
    const order = new Intl.DateTimeFormat(navigator.language, { day: "2-digit", month: "2-digit", year: "numeric" })
        .formatToParts(new Date(2026, 2, 15))
        .map((part) => part.type)
        .filter((type) => type === "day" || type === "month" || type === "year");
    const digits = (year) => order.map((type) => ({ day: "15", month: "03", year })[type]).join("");
    return {
        language: navigator.language,
        order,
        full: digits("2026"),
        first: { day: "15", month: "03", year: "2026" }[order[0]],
        lowYear: digits("999"),
        thousandYear: digits("1000"),
    };
}
```

`$R/mask-region.js` — пустое поле «от» по центру экрана, подпись спрятана, прямоугольник поля:

```js
() => {
    const section = [...document.querySelectorAll("section")].find((s) => s.querySelector("h2")?.textContent.trim() === "PickDayNative");
    section.scrollIntoView({ block: "center" });
    const box = section.querySelector('[data-demo="empty"]');
    const input = box.querySelector('input[type="date"]');
    const label = box.querySelector('span[aria-hidden="true"]');
    if (label) label.style.visibility = "hidden";
    const b = input.getBoundingClientRect();
    return {
        dpr: devicePixelRatio,
        rect: { x: b.x, y: b.y, w: b.width, h: b.height },
        color: getComputedStyle(input).color,
        indicator: getComputedStyle(input, "::-webkit-calendar-picker-indicator").display,
    };
}
```

`$R/native-boxes.js` — прямоугольники четырёх обёрток полей секции «PickDayNative» в координатах страницы (секция по центру экрана):

```js
() => {
    const section = [...document.querySelectorAll("section")].find((s) => s.querySelector("h2")?.textContent.trim() === "PickDayNative");
    section.scrollIntoView({ block: "center" });
    const boxes = {};
    for (const name of ["empty", "filled", "no-eraser", "en"]) {
        const b = section.querySelector(`[data-demo="${name}"]`).getBoundingClientRect();
        boxes[name] = { x: Math.floor(b.x), y: Math.floor(b.y), w: Math.ceil(b.width), h: Math.ceil(b.height) };
    }
    return { dpr: devicePixelRatio, boxes };
}
```

`$R/fit.js` — геометрия полей интервала: колонка, половина каждого поля (корень `PickDayNative`), само поле, ластик и правый край даты. Правый край даты — левый край поля плюс собственная ширина такого же поля с тем же значением, без правого отступа и рамки:

```js
() => {
    const section = [...document.querySelectorAll("section")].find((s) => s.querySelector("h2")?.textContent.trim() === "SelectDateInterval");
    section.scrollIntoView({ block: "center" });
    const rect = (el) => {
        const b = el.getBoundingClientRect();
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, w: b.width, h: b.height };
    };
    const column = section.querySelector('[class*="bb:min-w-72"]');
    const fields = [...column.querySelectorAll('input[type="date"]')].map((input) => {
        const style = getComputedStyle(input);
        const eraser = input.parentElement.querySelector("button");
        const probe = document.createElement("input");
        probe.type = "date";
        probe.className = input.className;
        probe.value = input.value;
        probe.style.cssText = "position:absolute;visibility:hidden;width:auto";
        input.parentElement.appendChild(probe);
        const need = probe.getBoundingClientRect().width;
        probe.remove();
        const box = rect(input);
        return {
            value: input.value,
            root: rect(input.closest(".bb-dashboard-ui")),
            input: box,
            eraser: eraser ? rect(eraser) : null,
            need,
            textRight: box.left + need - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth),
        };
    });
    return { viewport: innerWidth, dpr: devicePixelRatio, column: rect(column), fields };
}
```

- [ ] **Step 2: Сервер** — `"$R/serve.sh"` → `200`.

- [ ] **Step 3: Неизменные секции**

Вкладка `spd-pg`, `emulate` `1440x900x1`. Для `S` = `bare`, `host` — как в задаче 1, шаг 3, в `$R/pg/after/<S>-page.{png,json}`.

```bash
cd "$R" && python3 - <<'EOF'
import json, sys
from PIL import ImageChops
from crop import crop, section_region, rect_region

SKIP = {'SelectDateInterval', 'PickDayNative', 'lang="en"'}
failures = []

def check(ok, line):
    print(line)
    if not ok:
        failures.append(line)

def same(a, b):
    return a.size == b.size and ImageChops.difference(a, b).getbbox() is None

for s in ('bare', 'host'):
    pb, jb = f'pg/before/{s}-page.png', f'pg/before/{s}-page.json'
    pa, ja = f'pg/after/{s}-page.png', f'pg/after/{s}-page.json'
    mb, ma = json.load(open(jb)), json.load(open(ja))
    check('PickDayNative' in ma['sections'] and 'PickDayNative' not in mb['sections'], f'{s} секция PickDayNative появилась')
    rest = sorted(set(mb['sections']) - SKIP)
    check(rest == sorted(set(ma['sections']) - SKIP), f'{s} остальные секции те же: {len(rest)}')
    for title in rest:
        a = crop(pb, jb, lambda m: section_region(m, title))
        b = crop(pa, ja, lambda m: section_region(m, title))
        check(same(a, b), f'{s} {title} ' + ('совпадает' if same(a, b) else f'ОТЛИЧАЕТСЯ {a.size} {b.size}'))
    eb, ea = mb['enParts'], ma['enParts']
    check([(p['tag'], p['cls']) for p in eb] == [(p['tag'], p['cls']) for p in ea], f'{s} lang="en": тот же состав, {len(eb)} элементов')
    for i, (xb, xa) in enumerate(zip(eb, ea)):
        a = crop(pb, jb, lambda m: rect_region(xb['rect']))
        b = crop(pa, ja, lambda m: rect_region(xa['rect']))
        check(same(a, b), f'{s} lang="en" #{i} {xb["tag"]} ' + ('совпадает' if same(a, b) else f'ОТЛИЧАЕТСЯ {a.size} {b.size}'))
sys.exit(1 if failures else 0)
EOF
echo "exit=$?"
```

Expected: все строки — `совпадает` / верные, `exit=0`.

- [ ] **Step 4: Поведение в Chrome**

`emulate` `1440x900x1`. Для `S` = `bare`, `host`. «Свежая страница» — `navigate_page` с `initScript` = `$R/fixed-date.js`, затем `$R/wait.js` → `0`. «Уйти из поля» — `evaluate_script` `() => document.activeElement.blur()`. Фокус поля `N` секции «PickDayNative» — `evaluate_script` `() => document.querySelector('[data-demo="N"] input[type="date"]').focus()`.

1. Свежая страница; `$R/date-order.js` → запомнить `order`, `full`, `first`, `lowYear`, `thousandYear`; `$R/native-state.js`:
   - `empty`: `value` `""`, `label` `"от"`, `ariaLabel` `"от"`, `color` `"rgba(0, 0, 0, 0)"`, `eraser` `false`;
   - `filled`: `value` `"2026-03-15"`, `label` `null`, `eraser` `true`;
   - `noEraser`: `value` `"2026-03-15"`, `eraser` `false`;
   - `english`: `label` `"from"`, `ariaLabel` `"from"`;
   - `interval.fields[*].ariaLabel` — `["от", "до"]`, `interval.labels` — `["от", "до"]`; `englishInterval.labels` — `["from", "to"]`.
2. Маска: `$R/mask-region.js` (`indicator` — `"none"`, `color` — `"rgba(0, 0, 0, 0)"`), `take_screenshot` без `fullPage` → `<S>-mask.png`, JSON — `<S>-mask.json`, в `$R/pg/after/`.
3. Фокус: фокус `empty` → `native-state.js`: `empty.label` `null`, `empty.color` не `"rgba(0, 0, 0, 0)"`; уйти из поля → `empty.label` `"от"`.
4. Полный ввод: свежая страница; фокус `empty`; `type_text` с `full`; уйти из поля → `emptyState` — `"Значение: 15.03.2026, событий: 1"`, `empty.value` `"2026-03-15"`.
5. Частичный ввод в пустом: свежая страница; фокус `empty`; `type_text` с `first`; уйти из поля → `emptyState` — `"Значение: (пусто), событий: 0"`, `empty.value` `""`, `empty.label` `"от"`.
6. Частичный ввод в заполненном: свежая страница; фокус `filled`; `press_key` `Backspace`; уйти из поля → `filledState` — `"Значение: 15.03.2026, событий: 0"`, `filled.value` `"2026-03-15"`.
6а. Законченная дата с годом вне диапазона в пустом: свежая страница; фокус `empty`; `type_text` с `lowYear`; до ухода прочитать значение (`evaluate_script` `() => document.querySelector('[data-demo="empty"] input[type="date"]').value`) — `"0999-03-15"`, иначе сбой проверки: стоп и доклад; уйти из поля → `emptyState` — `"Значение: (пусто), событий: 0"`, `empty.value` `""`, `empty.label` `"от"`.
6б. Год вне диапазона в заполненном, меняется только часть года — если `order[2]` — `"year"` (иначе записать пропуск): свежая страница; фокус `no-eraser`; `press_key` `Shift+Tab` — фокус переходит в последнюю часть поля `filled`, то есть в год (`evaluate_script` `() => document.activeElement === document.querySelector('[data-demo="filled"] input[type="date"]')` → `true`); `type_text` `999`; до ухода значение `filled` — `"0999-03-15"` (день и месяц не тронуты; иначе сбой проверки: стоп и доклад); уйти из поля → `filledState` — `"Значение: 15.03.2026, событий: 0"`, `filled.value` `"2026-03-15"`.
6в. Набор года 10000 по цифрам — если `order[2]` — `"year"`: свежая страница; фокус `empty`; `type_text` с `thousandYear` → `emptyState` — `"Значение: 15.03.1000, событий: 1"` (год 1000 допустим и уходит родителю); `type_text` `0`; прочитать значение `empty`: если оно начинается с `10000-` — `emptyState` по-прежнему `"Значение: 15.03.1000, событий: 1"` (переход 1000 → 10000 события не добавил); уйти из поля → `empty.value` `"1000-03-15"` (последняя принятая дата), `emptyState` тот же. Если значение не начинается с `10000-` — записать «Chrome: год 10000 вводом недостижим, поле дало <значение>».
6г. Атомарный ввод года 10000: свежая страница; `evaluate_script` `() => { const input = document.querySelector('[data-demo="empty"] input[type="date"]'); input.focus(); input.value = '10000-03-15'; input.dispatchEvent(new Event('input', { bubbles: true })); return { focused: document.activeElement === input, value: input.value }; }` — `focused` — `true` (иначе уход из поля не вызовет обработчик поля: стоп и доклад); если `value` — `"10000-03-15"`: `emptyState` — `"Значение: (пусто), событий: 0"`; уйти из поля → `empty.value` `""`. Если браузер значение отбросил — записать это.
7. Ластик: свежая страница; `evaluate_script` `() => document.querySelector('[data-demo="filled"] button').click()` → `filledState` — `"Значение: (пусто), событий: 1"`.
8. Выбор в календаре: свежая страница; `take_snapshot`, клик по первой части поля «от» секции «PickDayNative» по `uid` — клик открывает календарь Chrome (`showPicker()`); `press_key` `ArrowRight`, `press_key` `Enter` — выбран следующий день после сегодняшнего по системному времени (подмену `Date` на странице календарь не видит); `$R/wait.js`; `native-state.js` → `emptyState` — `"Значение: <ДД.ММ.ГГГГ из empty.value>, событий: 1"`, `empty.value` не пуст. Затем то же для поля «до» (`filled`, 15.03.2026: календарь открыт на этой дате) → `filledState` — `"Значение: 16.03.2026, событий: 1"`. Способ проверен заранее в Chrome DevTools MCP: клик → `ArrowRight` → `Enter` даёт одну пару `input`/`change`. Нет события — стоп и доклад: это дефект компонента или сбой проверки, ручная проверка его не заменяет.
9. Интервал: свежая страница; фокус первого поля интервала — `evaluate_script` `() => [...document.querySelectorAll('section')].find((s) => s.querySelector('h2')?.textContent.trim() === 'SelectDateInterval').querySelector('input[type="date"]').focus()`; `type_text` с `full`; уйти из поля → `interval.text` — `"С 15.03.2026 по (пусто), событий: 1"`.

Все выводы `native-state.js` по шагам — в `$R/pg/after/<S>-chrome.md`. Любое расхождение с ожидаемым — стоп и доклад.

- [ ] **Step 5: Поля `bare` и `host` одинаковы**

Свежая страница `S` = `bare`, `host`; `$R/native-boxes.js` → `<S>-boxes.json`; `take_screenshot` без `fullPage` → `<S>-boxes.png`, в `$R/pg/after/`.

```bash
cd "$R" && python3 - <<'EOF'
import json, sys
from PIL import Image, ImageChops

failures = []
mb, mh = json.load(open('pg/after/bare-boxes.json')), json.load(open('pg/after/host-boxes.json'))
ib, ih = Image.open('pg/after/bare-boxes.png').convert('RGB'), Image.open('pg/after/host-boxes.png').convert('RGB')
for name in ('empty', 'filled', 'no-eraser', 'en'):
    rb, rh = mb['boxes'][name], mh['boxes'][name]
    k = mb['dpr']
    a = ib.crop(tuple(round(v * k) for v in (rb['x'], rb['y'], rb['x'] + rb['w'], rb['y'] + rb['h'])))
    b = ih.crop(tuple(round(v * k) for v in (rh['x'], rh['y'], rh['x'] + rh['w'], rh['y'] + rh['h'])))
    ok = (rb['w'], rb['h']) == (rh['w'], rh['h']) and a.size == b.size and ImageChops.difference(a, b).getbbox() is None
    line = f'{name} bare = host: ' + ('совпадает' if ok else f'ОТЛИЧАЕТСЯ {rb} {rh}')
    print(line)
    if not ok:
        failures.append(line)
sys.exit(1 if failures else 0)
EOF
echo "exit=$?"
```

Expected: 4 строки `совпадает`, `exit=0`.

Маска (шаг 4.2) — однотонная левая часть поля:

```bash
cd "$R" && python3 - <<'EOF'
import json, sys
from PIL import Image

failures = []
for s in ('bare', 'host'):
    m = json.load(open(f'pg/after/{s}-mask.json'))
    r, k = m['rect'], m['dpr']
    box = (round((r['x'] + 2) * k), round((r['y'] + 2) * k), round((r['x'] + r['w'] * 0.7) * k), round((r['y'] + r['h'] - 2) * k))
    colors = Image.open(f'pg/after/{s}-mask.png').convert('RGB').crop(box).getcolors(maxcolors=1 << 16)
    ok = colors is not None and len(colors) == 1
    line = f'{s} маска пустого поля скрыта: ' + ('да' if ok else f'НЕТ, цветов {len(colors) if colors else "много"}')
    print(line)
    if not ok:
        failures.append(line)
sys.exit(1 if failures else 0)
EOF
echo "exit=$?"
```

Expected: 2 строки `да`, `exit=0`.

- [ ] **Step 6: Ширина колонки интервала**

Для `S` = `bare`, `host` и `W` = `320`, `768`, `1280`: `emulate` `<W>x900x1`; свежая страница `S`; оба поля интервала: фокус, `type_text` с `full`, уйти из поля (второе поле — `querySelectorAll('input[type="date"]')[1]` секции); `$R/fit.js` → `$R/pg/after/fit-<S>-<W>.json`; `take_screenshot` без `fullPage` → `fit-<S>-<W>.png`.

```bash
cd "$R" && python3 - <<'EOF'
import json, sys
from PIL import Image

E = 0.5
failures = []

def check(ok, line):
    print(line)
    if not ok:
        failures.append(line)

def inside(inner, outer):
    return inner['left'] >= outer['left'] - E and inner['right'] <= outer['right'] + E

for s in ('bare', 'host'):
    for w in (320, 768, 1280):
        tag = f'{s} {w}'
        m = json.load(open(f'pg/after/fit-{s}-{w}.json'))
        col, fields = m['column'], m['fields']
        check(m['viewport'] == w and len(fields) == 2 and all(f['value'] == '2026-03-15' for f in fields), f'{tag}: два поля с датой')
        if len(fields) != 2:
            continue
        for i, f in enumerate(fields):
            check(inside(f['root'], col), f'{tag} поле {i}: половина внутри колонки {f["root"]} / {col}')
            check(inside(f['input'], f['root']), f'{tag} поле {i}: поле внутри своей половины')
            check(f['input']['w'] >= f['need'] - E, f'{tag} поле {i}: дата помещается ({f["input"]["w"]:.1f} ≥ {f["need"]:.1f})')
            ok = f['eraser'] is not None and inside(f['eraser'], f['root']) and f['textRight'] <= f['eraser']['left'] + E
            check(ok, f'{tag} поле {i}: ластик внутри половины и не закрывает дату (дата до {f["textRight"]:.1f}, ластик с {f["eraser"]["left"] if f["eraser"] else None})')
        check(fields[0]['root']['right'] <= fields[1]['root']['left'] + E, f'{tag}: половины не перекрываются')
        k = m['dpr']
        Image.open(f'pg/after/fit-{s}-{w}.png').crop(tuple(round(v * k) for v in (col['left'] - 4, col['top'] - 4, col['right'] + 4, col['bottom'] + 4))).save(f'pg/after/fit-{s}-{w}-column.png')
sys.exit(1 if failures else 0)
EOF
echo "exit=$?"
```

Expected: все строки верные, `exit=0`. Контроллер смотрит `fit-<S>-<W>-column.png`: дата в обоих полях видна целиком, ластик рядом с ней.

- [ ] **Step 7: `PickDay` по-прежнему выбирает дату**

`emulate` `1440x900x1`; свежая страница `bare`; `evaluate_script`:

```js
async () => {
    const section = [...document.querySelectorAll("section")].find((s) => s.querySelector("h2")?.textContent.trim() === "PickDay");
    section.querySelector("button").click();
    await new Promise((r) => setTimeout(r, 300));
    const day = [...section.querySelectorAll(".pika-button")].find((b) => b.textContent.trim() === "10");
    if (!day) return { error: "нет календаря" };
    day.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    return section.querySelector(":scope > p").textContent.trim();
}
```

Expected: `"Значение: 10.09.2026"` (дата зафиксирована `fixed-date.js` на сентябрь 2026).

- [ ] **Step 8: WebKit и Firefox через Playwright**

```bash
R=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/ssr-pick-day-native
mkdir -p "$R/pw" && cd "$R/pw"
test -f package.json || npm init -y >/dev/null
out=$(npm install playwright@1.63.0 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
npx playwright install webkit firefox 2>&1 | tail -3
```

`$R/pw/check.mjs`:

```js
import { readFileSync, writeFileSync } from 'node:fs'
import { firefox, webkit } from 'playwright'

const R = process.env.R
const base = 'http://127.0.0.1:8765'
const script = (name) => `(${readFileSync(`${R}/${name}`, 'utf8')})()`
const ORDERS = { dmy: ['day', 'month', 'year'], mdy: ['month', 'day', 'year'], ymd: ['year', 'month', 'day'] }
const digits = (order, year = '2026') => order.map((type) => ({ day: '15', month: '03', year })[type]).join('')
const first = (order) => ({ day: '15', month: '03', year: '2026' })[order[0]]
const field = (page, name) => page.locator(`[data-demo="${name}"] input[type="date"]`)
const state = (page) => page.evaluate(script('native-state.js'))
const blur = (page) => page.evaluate(() => document.activeElement.blur())

async function fresh(context, path, problems) {
    const page = await context.newPage()
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
    page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') problems.push(`${message.type()}: ${message.text()}`)
    })
    await page.goto(base + path)
    await page.evaluate(script('wait.js'))
    return page
}

async function typeInto(page, locator, digits) {
    await locator.focus()
    await page.keyboard.type(digits, { delay: 60 })
}

const results = []
let failed = false
function check(name, ok, detail) {
    results.push({ name, ok, detail })
    if (!ok) failed = true
    console.log(`${ok ? 'ок   ' : 'ПРОВАЛ'} ${name}${ok ? '' : ` — ${JSON.stringify(detail)}`}`)
}

for (const [engine, type] of [['webkit', webkit], ['firefox', firefox]]) {
    const browser = await type.launch()
    for (const [pageName, path] of [['bare', '/'], ['host', '/host.html']]) {
        const tag = `${engine} ${pageName}`
        const problems = []
        const context = await browser.newContext({ locale: 'ru-RU', viewport: { width: 1440, height: 900 } })

        // Порядок частей поля по языку браузера: тот, при котором набранные
        // цифры дают 15.03.2026.
        let order = null
        for (const key of Object.keys(ORDERS)) {
            const page = await fresh(context, path, problems)
            await typeInto(page, field(page, 'empty'), digits(ORDERS[key]))
            const value = await field(page, 'empty').inputValue()
            await page.close()
            if (value === '2026-03-15') {
                order = ORDERS[key]
                break
            }
        }
        check(`${tag}: порядок частей поля найден`, order !== null, order)
        if (order === null) {
            await context.close()
            continue
        }
        problems.length = 0

        let page = await fresh(context, path, problems)
        let s = await state(page)
        check(`${tag}: начальное состояние`, s.empty.value === '' && s.empty.label === 'от' && s.empty.ariaLabel === 'от' && s.filled.value === '2026-03-15' && s.filled.eraser && !s.noEraser.eraser && s.english.label === 'from', s)
        const mask = await page.evaluate(script('mask-region.js'))
        writeFileSync(`${R}/pw/${engine}-${pageName}-mask.json`, JSON.stringify(mask))
        await page.screenshot({ path: `${R}/pw/${engine}-${pageName}-mask.png` })
        await page.close()

        page = await fresh(context, path, problems)
        await field(page, 'empty').focus()
        s = await state(page)
        check(`${tag}: в фокусе подписи нет`, s.empty.label === null && s.empty.color !== 'rgba(0, 0, 0, 0)', s.empty)
        await blur(page)
        s = await state(page)
        check(`${tag}: после ухода подпись снова видна`, s.empty.label === 'от', s.empty)
        await page.close()

        page = await fresh(context, path, problems)
        await typeInto(page, field(page, 'empty'), digits(order))
        await blur(page)
        s = await state(page)
        check(`${tag}: полный ввод — одно событие`, s.emptyState === 'Значение: 15.03.2026, событий: 1' && s.empty.value === '2026-03-15', s.emptyState)
        await page.close()

        page = await fresh(context, path, problems)
        await typeInto(page, field(page, 'empty'), first(order))
        await blur(page)
        s = await state(page)
        check(`${tag}: частичный ввод в пустом — ничего`, s.emptyState === 'Значение: (пусто), событий: 0' && s.empty.value === '' && s.empty.label === 'от', s)
        await page.close()

        page = await fresh(context, path, problems)
        await field(page, 'filled').focus()
        await page.keyboard.press('Backspace')
        await blur(page)
        s = await state(page)
        check(`${tag}: частичный ввод в заполненном — прежняя дата`, s.filledState === 'Значение: 15.03.2026, событий: 0' && s.filled.value === '2026-03-15', s)
        await page.close()

        page = await fresh(context, path, problems)
        await typeInto(page, field(page, 'empty'), digits(order, '999'))
        const typed999 = await field(page, 'empty').inputValue()
        check(`${tag}: год 999 набран`, typed999 === '0999-03-15', typed999)
        await blur(page)
        s = await state(page)
        check(`${tag}: законченная дата с годом 0999 в пустом — ничего`, s.emptyState === 'Значение: (пусто), событий: 0' && s.empty.value === '' && s.empty.label === 'от', s)
        await page.close()

        page = await fresh(context, path, problems)
        // Фокус до ввода: иначе уход из поля не вызовет обработчик поля.
        await field(page, 'empty').focus()
        const atomic = await field(page, 'empty').evaluate((input) => {
            input.value = '10000-03-15'
            input.dispatchEvent(new Event('input', { bubbles: true }))
            return input.value
        })
        const atomicFocused = await page.evaluate(() => document.activeElement === document.querySelector('[data-demo="empty"] input[type="date"]'))
        check(`${tag}: поле в фокусе перед атомарным вводом`, atomicFocused, null)
        if (atomic === '10000-03-15') {
            s = await state(page)
            check(`${tag}: атомарный ввод года 10000 — ничего`, s.emptyState === 'Значение: (пусто), событий: 0', s.emptyState)
            await blur(page)
            const afterBlur = await field(page, 'empty').inputValue()
            check(`${tag}: после ухода поле пустое`, afterBlur === '', afterBlur)
        } else {
            console.log(`запись ${tag}: значение с годом 10000 браузер отбросил («${atomic}»)`)
            results.push({ name: `${tag}: атомарный год 10000`, ok: null, detail: atomic })
        }
        await page.close()

        // Только когда год — последняя часть поля: Shift+Tab из следующего
        // поля попадает в год, а цифры года не уходят в другую часть.
        if (order[2] === 'year') {
            page = await fresh(context, path, problems)
            await field(page, 'no-eraser').focus()
            await page.keyboard.press('Shift+Tab')
            const inFilled = await page.evaluate(() => document.activeElement === document.querySelector('[data-demo="filled"] input[type="date"]'))
            await page.keyboard.type('999', { delay: 60 })
            const typedYear = await field(page, 'filled').inputValue()
            check(`${tag}: в заполненном изменена только часть года`, inFilled && typedYear === '0999-03-15', { inFilled, typedYear })
            await blur(page)
            s = await state(page)
            check(`${tag}: год 0999 в заполненном — прежняя дата`, s.filledState === 'Значение: 15.03.2026, событий: 0' && s.filled.value === '2026-03-15', s)
            await page.close()

            page = await fresh(context, path, problems)
            await typeInto(page, field(page, 'empty'), digits(order, '1000'))
            s = await state(page)
            check(`${tag}: год 1000 допустим и уходит родителю`, s.emptyState === 'Значение: 15.03.1000, событий: 1', s.emptyState)
            await page.keyboard.type('0')
            const typed10000 = await field(page, 'empty').inputValue()
            if (typed10000.startsWith('10000-')) {
                s = await state(page)
                check(`${tag}: переход 1000 → 10000 события не добавил`, s.emptyState === 'Значение: 15.03.1000, событий: 1', s.emptyState)
                await blur(page)
                s = await state(page)
                check(`${tag}: после ухода — последняя принятая дата`, s.empty.value === '1000-03-15' && s.emptyState === 'Значение: 15.03.1000, событий: 1', s)
            } else {
                console.log(`запись ${tag}: год 10000 вводом недостижим, поле дало «${typed10000}»`)
                results.push({ name: `${tag}: год 10000 по цифрам`, ok: null, detail: typed10000 })
            }
            await page.close()
        } else {
            console.log(`запись ${tag}: год не последняя часть (${order.join('-')}), сценарии части года и 10000 пропущены`)
            results.push({ name: `${tag}: сценарии части года`, ok: null, detail: order })
        }

        page = await fresh(context, path, problems)
        await page.locator('[data-demo="filled"] button').click()
        s = await state(page)
        check(`${tag}: ластик — одно событие`, s.filledState === 'Значение: (пусто), событий: 1' && s.filled.value === '', s.filledState)
        await page.close()

        page = await fresh(context, path, problems)
        await field(page, 'empty').click()
        await page.waitForTimeout(500)
        await page.keyboard.press('Escape')
        await blur(page)
        s = await state(page)
        check(`${tag}: клик не ломает поле`, s.emptyState === 'Значение: (пусто), событий: 0', s.emptyState)
        await page.close()

        page = await fresh(context, path, problems)
        const intervalFrom = page.locator('section').filter({ has: page.locator('h2', { hasText: /^SelectDateInterval$/ }) }).locator('input[type="date"]').first()
        await typeInto(page, intervalFrom, digits(order))
        await blur(page)
        s = await state(page)
        check(`${tag}: интервал — одно событие`, s.interval.text === 'С 15.03.2026 по (пусто), событий: 1', s.interval)
        await page.close()

        check(`${tag}: без ошибок и предупреждений страницы`, problems.length === 0, problems)
        await context.close()
    }
    await browser.close()
}

writeFileSync(`${R}/pw/results.json`, JSON.stringify(results, null, 2))
process.exit(failed ? 1 : 0)
```

```bash
"$R/serve.sh"
cd "$R/pw" && R="$R" node check.mjs; echo "exit=$?"
cd "$R" && python3 - <<'EOF'
import json, sys
from PIL import Image

failures = []
for engine in ('webkit', 'firefox'):
    for s in ('bare', 'host'):
        m = json.load(open(f'pw/{engine}-{s}-mask.json'))
        r, k = m['rect'], m['dpr']
        box = (round((r['x'] + 2) * k), round((r['y'] + 2) * k), round((r['x'] + r['w'] * 0.7) * k), round((r['y'] + r['h'] - 2) * k))
        colors = Image.open(f'pw/{engine}-{s}-mask.png').convert('RGB').crop(box).getcolors(maxcolors=1 << 16)
        ok = colors is not None and len(colors) == 1
        line = f'{engine} {s} маска скрыта: ' + ('да' if ok else 'НЕТ')
        print(line)
        if not ok:
            failures.append(line)
sys.exit(1 if failures else 0)
EOF
echo "exit=$?"
```

Expected: все строки `ок`, `exit=0` у обоих скриптов. Если строка «порядок частей поля найден» провалена — это сбой проверки, а не компонента: стоп и доклад. Иная `ПРОВАЛ` — дефект компонента по обязательным требованиям (Global Constraints): стоп и доклад с выводом и снимками, приёмка не пройдена. Выбор в календаре WebKit и Firefox этим скриптом не проверяется: в итог — «WebKit: выбор через календарь не проверен», «Firefox: выбор через календарь не проверен».

- [ ] **Step 9: Итог**

`$R/pg/after/verdict.md` — выводы шагов 3–8, записи о недостижимом годе 10000 (если были), отдельной строкой — список браузеров, где выбор через календарь не проверен. Сервер не останавливать: после задачи 6 контроллер проводит ручную проверку календаря с Tim. Удалить `/Users/boobooking/Code/mars/cashback/.superpowers/tmp-shots`. Вкладку `spd-pg` перевести на `about:blank`.

---

### Ручная проверка календаря — контроллер и Tim

После задачи 6, если в итоге есть «выбор через календарь не проверен». Сервер playground запущен (`$R/serve.sh`). Контроллер передаёт Tim шаги для каждого такого браузера (Safari — вместо WebKit, Firefox Developer Edition — вместо Firefox; каждый браузер закрывает только свой пункт; Chrome проверяется автоматически в задаче 6, шаг 4.8) и записывает ответ в `$R/pg/after/verdict.md`:

1. Открыть `http://127.0.0.1:8765/`, прокрутить к секции «PickDayNative».
2. Кликнуть по полю «от», выбрать в календаре любую дату → под полями: `Значение: <выбранная дата ДД.ММ.ГГГГ>, событий: 1`.
3. Кликнуть по полю «до» (там 15.03.2026), выбрать в календаре другую дату → `Значение: <выбранная дата>, событий: 1` во второй строке.

Ответ «не так» — дефект компонента: приёмка не пройдена. После ответов — `pkill -f "http.server 8765"`.

---

### Task 7: Версия `0.11.0` и tarball

**Files:** `package.json`, `package-lock.json`.

**Interfaces:**
- Produces: версионный коммит; `$R/tarball/boobooking-dashboard-ui-components-0.11.0.tgz`.

- [ ] **Step 1: Версия**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
npm version 0.11.0 --no-git-tag-version
grep -n '"version": "0.11.0"' package.json package-lock.json
out=$(npm test -- --reporter=verbose 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: npm test"; exit 1; }
test "$(printf '%s\n' "$out" | grep -acE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled')" -eq 0 || { echo "ПРОВАЛ: диагностика"; exit 1; }
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; exit 1; }
node --input-type=module -e "const m = await import('./dist/index.js'); console.log('loaded', Object.keys(m).length)"
git add package.json package-lock.json
git commit -m "chore: поднять версию пакета до 0.11.0"
```

Expected: `"version": "0.11.0"` — одна строка в `package.json`, две в `package-lock.json`; `loaded 19`.

- [ ] **Step 2: Tarball**

```bash
R=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/ssr-pick-day-native
mkdir -p "$R/tarball"
cd /Users/boobooking/Code/dashboard-ui-components && npm pack --pack-destination "$R/tarball" 2>/dev/null | tail -1
tar -tzf "$R/tarball/boobooking-dashboard-ui-components-0.11.0.tgz" | sort
```

Expected: `package/README.md`, `package/dist/index.js`, `package/dist/style.css`, `package/package.json`.

---

### Task 8: cashback на tarball — снимки «до», обновление, приёмка

**Шаг 0 — контроллер, до передачи задачи:**

```bash
R=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/ssr-pick-day-native
test -f "$R/cashback-admin.env" || printf 'ADMIN_EMAIL=acceptance-spd@cashback.test\nADMIN_PASSWORD=%s\n' "$(openssl rand -hex 12)" > "$R/cashback-admin.env"
. "$R/cashback-admin.env"
out=$(printf '%s\n%s\n%s\n%s\n' "$ADMIN_EMAIL" "Приёмка PickDayNative" "$ADMIN_PASSWORD" "$ADMIN_PASSWORD" | docker exec -i cashback-backend php /var/www/artisan user:create 2>&1); rc=$?
echo "$out" | tail -2; test "$rc" -eq 0 || echo "ПРОВАЛ"
```

Затем `new_page` `https://cashback.test/dashboard/login` с `isolatedContext: "spd-cb"`, вход под этой учёткой (пароль — контроллер). Сабагент получает авторизованную вкладку.

**Files (cashback):** `package.json`, `package-lock.json` — без коммита.

**Interfaces:**
- Consumes: tarball задачи 7; вкладка `spd-cb`.
- Produces: ветка cashback `feature/dashboard-ui-0.11` с незакоммиченными правками; `$R/cashback/{before,after}`.

Страницы `P`: `payments`, `messages`, `cashbacks`, `consumers`, `services` — адрес `https://cashback.test/dashboard/<P>`. На `services` модалку отправки письма не открывать.

- [ ] **Step 1: Скрипты**

`$R/cb-filter.js` — фильтр дат (корень `SelectDateInterval`) в координатах страницы:

```js
() => {
    const column = document.querySelector('[class*="bb:min-w-72"]');
    const root = column ? column.closest(".bb-dashboard-ui") : null;
    const b = root ? root.getBoundingClientRect() : null;
    return {
        dpr: devicePixelRatio,
        viewport: { w: innerWidth, h: innerHeight },
        page: { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight },
        rect: b ? { x: b.x + scrollX, y: b.y + scrollY, w: b.width, h: b.height } : null,
    };
}
```

`$R/cb-recorder.js` — журнал переходов Inertia: перед каждым действием заводит пустой журнал, а один раз на страницу ставит перехватчики. Переход Inertia 3 (`@inertiajs/core` 3.6.1) — `XMLHttpRequest` с заголовком `X-Inertia` и события `inertia:start` / `inertia:finish` на `document`; `fetch` с `X-Inertia` тоже попадает в журнал:

```js
() => {
    window.__filterLog = { sent: [], started: [], finished: [] };
    if (!window.__filterRecorder) {
        window.__filterRecorder = true;
        const open = XMLHttpRequest.prototype.open;
        const setRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        const send = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            this.__filterUrl = new URL(String(url), location.href).href;
            this.__filterInertia = false;
            return open.call(this, method, url, ...rest);
        };
        XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
            if (String(name).toLowerCase() === "x-inertia") this.__filterInertia = true;
            return setRequestHeader.call(this, name, value);
        };
        XMLHttpRequest.prototype.send = function (...args) {
            if (this.__filterInertia) window.__filterLog.sent.push(this.__filterUrl);
            return send.apply(this, args);
        };
        const originalFetch = window.fetch;
        window.fetch = function (input, init) {
            const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
            if (headers.has("X-Inertia")) window.__filterLog.sent.push(new URL(input instanceof Request ? input.url : String(input), location.href).href);
            return originalFetch.call(this, input, init);
        };
        document.addEventListener("inertia:start", (event) => window.__filterLog.started.push(String(event.detail.visit.url)));
        document.addEventListener("inertia:finish", (event) => {
            const visit = event.detail.visit;
            window.__filterLog.finished.push({ url: String(visit.url), completed: visit.completed, cancelled: visit.cancelled, interrupted: visit.interrupted });
        });
    }
    return true;
}
```

`$R/cb-settle.js` — ждёт, пока каждый начатый переход закончится и 2 секунды не появится ничего нового, не дольше 15 секунд, и возвращает журнал, адрес и поля дат; `settled` — `true`, только если оба условия выполнились до тайм-аута:

```js
async () => {
    // performance.now(), а не Date: Date на странице подменяет fixed-date.js.
    const log = window.__filterLog;
    const startedAt = performance.now();
    let lastCount = -1;
    let quietSince = performance.now();
    let settled = false;
    while (performance.now() - startedAt < 15000) {
        const count = log.sent.length + log.started.length + log.finished.length;
        if (count !== lastCount) {
            lastCount = count;
            quietSince = performance.now();
        }
        if (log.finished.length >= log.started.length && performance.now() - quietSince >= 2000) {
            settled = true;
            break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const column = document.querySelector('[class*="bb:min-w-72"]');
    const inputs = column ? [...column.querySelectorAll('input[type="date"]')] : [];
    return {
        url: location.pathname + location.search,
        settled,
        sent: [...log.sent],
        started: [...log.started],
        finished: log.finished.map((visit) => ({ ...visit })),
        fields: inputs.map((input) => ({ value: input.value, ariaLabel: input.getAttribute("aria-label"), eraser: input.parentElement.querySelector("button") !== null })),
    };
}
```

- [ ] **Step 2: Снимки «до»**

cashback на `main`, дерево чистое, установлен `0.10.0`, `npm run build` — без ошибок и предупреждений. Во вкладке `spd-cb`, для `W` = `1440` (`1440x900x1`), `768` (`768x1024x1`), `375` (`375x812x1`) и каждой `P`:

1. `emulate`; `navigate_page` на страницу с `initScript` = `$R/fixed-date.js`; `$R/wait.js` → `0`;
2. `take_screenshot` `fullPage: true` → `<P>-<W>.png`; `$R/cb-filter.js` → `<P>-<W>.json` (`rect` не `null`) — в `$R/cashback/before/`.

- [ ] **Step 3: Ветка и пакет из tarball**

```bash
cd /Users/boobooking/Code/mars/cashback
R=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/ssr-pick-day-native
test -z "$(git status --porcelain)" || { echo "ПРОВАЛ: дерево не чистое"; exit 1; }
git switch -c feature/dashboard-ui-0.11
out=$(npm install "$R/tarball/boobooking-dashboard-ui-components-0.11.0.tgz" --no-save 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
grep -m1 '"version"' node_modules/@boobooking/dashboard-ui-components/package.json
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения"; exit 1; }
echo ok
```

Expected: `"version": "0.11.0"`, затем `ok`.

- [ ] **Step 4: Снимки «после» и сверка вне фильтра**

Те же `W` и `P`, что в шаге 2, в `$R/cashback/after/`.

```bash
cd "$R/cashback" && python3 - <<'EOF'
import json, sys
from PIL import Image, ImageChops, ImageDraw

PAGES = ('payments', 'messages', 'cashbacks', 'consumers', 'services')
failures = []

def masked(png, rect, dpr):
    img = Image.open(png).convert('RGB')
    box = tuple(round(v * dpr) for v in (rect['x'] - 2, rect['y'] - 2, rect['x'] + rect['w'] + 2, rect['y'] + rect['h'] + 2))
    filter_crop = img.crop(box)
    ImageDraw.Draw(img).rectangle(box, fill=(0, 0, 0))
    return img, filter_crop

for p in PAGES:
    for w in (1440, 768, 375):
        name = f'{p}-{w}'
        mb, ma = json.load(open(f'before/{name}.json')), json.load(open(f'after/{name}.json'))
        ok = mb['rect'] is not None and mb['rect'] == ma['rect'] and mb['page'] == ma['page'] and mb['viewport'] == ma['viewport'] and mb['dpr'] == ma['dpr']
        same = False
        if ok:
            a, fa = masked(f'before/{name}.png', mb['rect'], mb['dpr'])
            b, fb = masked(f'after/{name}.png', ma['rect'], ma['dpr'])
            fa.save(f'before/{name}-filter.png')
            fb.save(f'after/{name}-filter.png')
            same = a.size == b.size and ImageChops.difference(a, b).getbbox() is None
        line = f'{name} вне фильтра ' + ('совпадает' if same else f'ОТЛИЧАЕТСЯ до {mb} после {ma}')
        print(line)
        if not same:
            failures.append(line)
sys.exit(1 if failures else 0)
EOF
echo "exit=$?"
```

Expected: 15 строк `совпадает`, `exit=0`. Контроллер смотрит пары `<P>-<W>-filter.png` до/после: фильтр того же размера, подписи «от» / «до» на месте, дата не обрезана.

- [ ] **Step 5: Запросы фильтра**

`1440x900x1`. Действия с полем «от» — через `evaluate_script`: фокус — `() => document.querySelector('[class*="bb:min-w-72"] input[type="date"]').focus()`; уйти из поля — `() => document.activeElement.blur()`; ластик — `() => document.querySelector('[class*="bb:min-w-72"] input[type="date"]').parentElement.querySelector('button').click()`. Перед каждым действием — `$R/cb-recorder.js`, после — `$R/cb-settle.js`.

Для каждой `P`: свежая страница (`navigate_page` без параметров, `$R/wait.js`); `$R/date-order.js` → `full`. Затем:

1. `cb-recorder.js`; `cb-settle.js` → `s0`: два поля, `ariaLabel` — `["от", "до"]`. Если `s0.fields[0].value` не пуст — `cb-recorder.js`, ластик, `cb-settle.js`.
2. Ввод с клавиатуры: `cb-recorder.js`; фокус; `type_text` с `full`; уйти из поля; `cb-settle.js` → `s1`.
3. Частичный ввод и уход: `cb-recorder.js`; фокус; `press_key` `Backspace`; уйти из поля; `cb-settle.js` → `s2`.
4. Ластик: `cb-recorder.js`; ластик; `cb-settle.js` → `s3`.
5. Выбор в календаре (поле «от» пусто после ластика): `cb-recorder.js`; `take_snapshot`, клик по первой части поля «от» по `uid` — открывается календарь Chrome; `press_key` `ArrowRight`, `press_key` `Enter`; `cb-settle.js` → `s4`. Ввод с клавиатуры (пункт 2) выбор в календаре не заменяет: оба пункта обязательны.

Ожидается:

- `s1`: `settled` — `true`; в `sent` ровно один адрес, его путь — `/dashboard/<P>`, параметр `date_from` — `15.03.2026`; `started` — один адрес, `finished` — одна запись с `completed: true`; `fields[0].value` — `2026-03-15`; `url` содержит `date_from=15.03.2026`;
- `s2`: `settled` — `true`; `sent`, `started`, `finished` пусты; `fields[0].value` — `2026-03-15`;
- `s3`: `settled` — `true`; в `sent` ровно один адрес к `/dashboard/<P>` без `date_from`; `finished` — одна запись с `completed: true`; `fields[0].value` — `""`;
- `s4`: как `s1`, но дата в `date_from` и `url` — `s4.fields[0].value` в формате `ДД.ММ.ГГГГ`.

Выводы — в `$R/cashback/requests.md`. Любое расхождение — стоп и доклад.

- [ ] **Step 6: Pest**

`docker exec cashback-backend php /var/www/artisan test` — все зелёные, без предупреждений.

Итог — `$R/cashback/verdict.md`. Правки остаются незакоммиченными в `feature/dashboard-ui-0.11`. Удалить `tmp-shots`.

---

### Выпуск `0.11.0` — контроллер

После задач 1–8 и ручной проверки календаря в Safari и Firefox: финальное ревью ветки пакета (`main..feature/ssr-pick-day-native`), одна волна исправлений и повторное ревью.

Если исправления меняют `src/` или `playground/`, до тега:

1. сборка из исправленного кода — `npm pack` упаковывает готовый `dist`:

```bash
cd /Users/boobooking/Code/dashboard-ui-components
out=$(npm test -- --reporter=verbose 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: npm test"; exit 1; }
test "$(printf '%s\n' "$out" | grep -acE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled')" -eq 0 || { echo "ПРОВАЛ: диагностика"; exit 1; }
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения сборки"; exit 1; }
node --input-type=module -e "const m = await import('./dist/index.js'); console.log('loaded', Object.keys(m).length)"
rm -rf playground/dist
out=$(npx vite build --config vite.playground.config.js 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: playground"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения playground"; exit 1; }
echo ok
```

2. задача 7, шаг 2 — tarball заново;
3. задача 6, шаги 2–9 — заново; при правке поведения `PickDayNative` — и ручная проверка календаря;
4. задача 8 — переустановить tarball в cashback, `npm run build`, шаги 4–6.

Затем `git reset --soft main` → один коммит:

```
feat: добавить PickDayNative и поддержку SSR

PickDayNative — выбор даты на встроенном поле браузера с API PickDay, без
Pikaday; SelectDateInterval построен на нём. Пакет загружается и
рендерится на сервере: PageCard читает историю вкладки после монтирования,
PickDay загружает Pikaday в браузере. tests/ssr.test.js и
tests/hydration.test.js рендерят на сервере и гидратируют каждый
экспортируемый компонент.
```

→ `git switch main` → `git merge --ff-only feature/ssr-pick-day-native` → `npm test` и сборка на `main` → `git branch -D feature/ssr-pick-day-native` → `git push origin main` → `git tag v0.11.0` → `git push origin v0.11.0` → `gh run watch` для Publish → `npm view @boobooking/dashboard-ui-components@0.11.0 version --prefer-online` → `0.11.0`.

---

### Task 9: cashback на опубликованной `0.11.0`

Выполняется, когда `npm view @boobooking/dashboard-ui-components@0.11.0 version --prefer-online` отвечает `0.11.0`.

**Files:** cashback — `package.json`, `package-lock.json`.

**Interfaces:**
- Consumes: ветка `feature/dashboard-ui-0.11` cashback, `$R/cashback/after/*`, вкладка `spd-cb`.
- Produces: коммит в `main` cashback (fast-forward); удалённый администратор приёмки.

- [ ] **Step 1: Пакет из реестра**

```bash
cd /Users/boobooking/Code/mars/cashback
test "$(git branch --show-current)" = "feature/dashboard-ui-0.11" || { echo "ПРОВАЛ: не та ветка"; exit 1; }
out=$(npm install @boobooking/dashboard-ui-components@0.11.0 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
grep -n '"@boobooking/dashboard-ui-components": "\^0.11.0"' package.json
grep -n -A2 '"node_modules/@boobooking/dashboard-ui-components"' package-lock.json | grep resolved
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения"; exit 1; }
```

Expected: `^0.11.0`; `resolved` — `https://registry.npmjs.org/@boobooking/dashboard-ui-components/-/dashboard-ui-components-0.11.0.tgz`.

- [ ] **Step 2: Снимки на опубликованной версии**

Те же `W` и `P`, что в задаче 8, шаг 2, в `$R/cashback/published/`. Сверка с `after`:

```bash
cd "$R/cashback" && python3 - <<'EOF'
import json, os, sys
from PIL import Image, ImageChops

expected = sorted(f'{p}-{w}' for p in ('payments', 'messages', 'cashbacks', 'consumers', 'services') for w in (1440, 768, 375))
names = sorted(n[:-4] for n in os.listdir('published') if n.endswith('.png'))
assert names == expected, names
failures = []
for name in names:
    ma = json.load(open(f'after/{name}.json')); mb = json.load(open(f'published/{name}.json'))
    a = Image.open(f'after/{name}.png').convert('RGB'); b = Image.open(f'published/{name}.png').convert('RGB')
    same = a.size == b.size and ImageChops.difference(a, b).getbbox() is None and ma == mb
    print(name, 'совпадает' if same else 'ОТЛИЧАЕТСЯ')
    if not same:
        failures.append(name)
sys.exit(1 if failures else 0)
EOF
echo "exit=$?"
```

Expected: 15 строк `совпадает`, `exit=0`.

- [ ] **Step 3: Pest и коммит**

`docker exec cashback-backend php /var/www/artisan test` — все зелёные, без предупреждений.

```bash
cd /Users/boobooking/Code/mars/cashback
git add package.json package-lock.json
git status --short
git commit -F - <<'EOF'
chore: обновить пакет компонентов дашборда до 0.11.0

Фильтр дат на страницах выплат, сообщений, кешбэков, потребителей и услуг
теперь на встроенном поле даты браузера (PickDayNative из
@boobooking/dashboard-ui-components 0.11.0): календарь рисует браузер, дату
можно набрать с клавиатуры. Значения фильтра и запросы не изменились.
EOF
```

- [ ] **Step 4: Уборка**

- администратор приёмки удаляет себя через `/dashboard/users` (меню своей строки → «Удалить» → подтвердить);
- удалить `/Users/boobooking/Code/mars/cashback/.superpowers/tmp-shots`;
- контроллер: вход под учёткой отклоняется; закрыть вкладки `spd-cb` и `spd-pg` (последнюю — на `about:blank`, если она последняя своя); удалить `$R/cashback-admin.env`; ветку `feature/dashboard-ui-0.11` cashback — fast-forward в `main`, удалить, без пуша.

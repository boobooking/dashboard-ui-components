# NotificationMessage и внутренний Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Компонент `NotificationMessage` в пакете (перенос `ConfirmationMessage` из cashback по правилам пакета), `Modal` — только внутренний, выпуск `0.10.0` и перевод cashback.

**Architecture:** `NotificationMessage` — корень на весь экран с постоянной живой областью (`role` по типу) и панелью внутри через `v-if`; текст — `v-model`, крестик закрывает уведомление сам (`update:modelValue` с `""`); подпись крестика — из словаря через `withLang`. `Modal` убирается из `src/index.js`, README и playground; `ConfirmationModal` импортирует его по-прежнему.

**Tech Stack:** Vue 3.5 (Options API), Tailwind 4 с `prefix(bb)`, vitest 5 + @vue/test-utils + happy-dom, Vite (библиотечная сборка и playground), Chrome DevTools MCP, cashback — Laravel + Inertia 3 (docker compose станции).

**Spec:** `docs/superpowers/specs/2026-10-05-notification-message-design.md` (коммит `d02d631`).

## Global Constraints

- Пакет: `/Users/boobooking/Code/dashboard-ui-components`, ветка `feature/notification-message` (от `main` `9961a6c`, `0.9.0`). cashback: `/Users/boobooking/Code/mars/cashback` (`main` `690d343`, `0.9.0`). payments и certificates не трогаются.
- `NotificationMessage`: пропсы `modelValue` (`String`, `""`), `type` (`String`, `"warning"`, валидатор `"confirmation"` / `"warning"` / `"dangerous"`), `notificationHeading` (`String`, `""`), `lang` (миксин `withLang`); событие только `update:modelValue`; `null` в `modelValue` — пусто.
- Корень рендерится всегда: `role="alert"` у `dangerous`, `role="status"` у `confirmation` и `warning`; класс `bb-dashboard-ui`, `bb:pointer-events-none`; панель — внутри через `v-if`, `bb:pointer-events-auto`.
- Вид панели — как у `ConfirmationMessage` cashback, классы с префиксом `bb:`.
- Крестик: `type="button"`, скрытая подпись `bb:sr-only` из словаря; ключ `close` — `ru` «Закрыть», `en` «Close». Иконки декоративные — `aria-hidden="true"`.
- `Modal` не экспортируется из `src/index.js`; компонентов в README — семнадцать.
- Версия пакета — `0.10.0`.
- Чистота вывода тестов пакета: только `npm test -- --reporter=verbose` и `grep -acE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled'` → `0`.
- Коммиты: пакет и cashback — conventional commits по-русски; никогда `--no-verify`; cashback не пушить. Неотслеживаемый `.idea/` в пакете — владельца, в коммиты не добавлять.
- PHP-инструменты — только `docker exec cashback-backend php /var/www/artisan …`; tinker не трогать; администратор приёмки — только `user:create`; миграции не запускать.
- Пароль администратора приёмки читает и вводит только контроллер; сабагенты работают в авторизованной вкладке.
- На странице cashback `Services` модалку отправки письма никогда не подтверждать: она шлёт настоящее письмо через Mindbox.
- Браузер: только свои вкладки, `pageId` — явно в каждом вызове; `take_screenshot`/`evaluate_script` с `filePath` пишут только в `/Users/boobooking/Code/mars/cashback/.superpowers/tmp-shots/`, оттуда `mv`.
- `$R=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/notification-message` — снимки, замеры, скрипты приёмки.

## Review Focus

- `null` и отсутствие значения в `modelValue` — ничего не видно, ошибок нет — задача 2 (тест «пустое значение»).
- Тот же текст после закрытия задан снова — уведомление показывается снова — задача 2 (полный цикл `v-model`).
- Две области на одной странице (cashback: подтверждение и ошибка) — закрытие одной не трогает другую — задача 2 (тест двух экземпляров).
- Пустая область на весь экран не перехватывает клики по странице — задача 2 (классы `pointer-events`), задача 5 (`elementFromPoint` в углу).
- Недопустимый `type` в production (валидатор молчит) — компонент не падает — задача 2 (тест недопустимого `type`).

---

### Task 1: Снимки playground «до»

Коммита нет. Выполняется на `feature/notification-message` до правок кода (в ветке только спека и план).

**Files:** только `$R`.

**Interfaces:**
- Produces: `$R/serve.sh`, `$R/wait.js`, `$R/fixed-date.js`, `$R/measure-pg.js`, `$R/crop.py` (`section_region`, `crop`, `around`); `$R/pg/before/{bare,host}-page.{png,json}`, `$R/pg/before/{bare,host}-modal-{warning,dangerous}.{png,json}`.

- [ ] **Step 1: Скрипты приёмки**

```bash
R=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/notification-message
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

`$R/measure-pg.js` — прямоугольники секций по `h2`; поддерево элемента с `position: fixed` в секцию не входит:

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

`$R/crop.py`:

```python
import json
from PIL import Image


def section_region(m, title):
    s = m['sections'][title]
    return (s['x'], s['y'], s['x'] + s['w'], s['y'] + s['h'])


def crop(png, js, region):
    m = json.load(open(js))
    k = m['dpr']
    box = tuple(round(v * k) for v in region(m))
    return Image.open(png).convert('RGB').crop(box)


# Область вокруг элемента с запасом под тень и внешнее кольцо: shadow-lg у
# уведомления уходит вниз примерно на 22px, shadow-xl у модалки — на 40px.
def around(png, rect, dpr, margin):
    img = Image.open(png).convert('RGB')
    box = (
        max(0, round((rect['x'] - margin) * dpr)),
        max(0, round((rect['y'] - margin) * dpr)),
        min(img.size[0], round((rect['x'] + rect['w'] + margin) * dpr)),
        min(img.size[1], round((rect['y'] + rect['h'] + margin) * dpr)),
    )
    return img.crop(box)
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

Вкладка — `new_page` с `isolatedContext: "nm-pg"`, `emulate` `viewport: "1440x900x1"`. Для `S` = `bare` (`http://host.docker.internal:8765/`) и `host` (`http://host.docker.internal:8765/host.html`):

1. `navigate_page` с `initScript` = содержимое `$R/fixed-date.js`;
2. `evaluate_script` с `$R/wait.js` → `0`;
3. `take_screenshot` `fullPage: true` → `…/tmp-shots/<S>-page.png`;
4. `evaluate_script` с `$R/measure-pg.js`, `filePath` → `…/tmp-shots/<S>-page.json`;
5. `mv` в `$R/pg/before/`.

Открытая `ConfirmationModal` — для `S` = `bare`, `host` и `M` = `warning` (кнопка «Жёлтая»), `dangerous` («Красная»), viewport тот же `1440x900x1`:

1. свежий `navigate_page` с `initScript` = `$R/fixed-date.js`; `$R/wait.js` → `0`;
2. `evaluate_script`: `() => { const s = [...document.querySelectorAll('section')].find((x) => x.querySelector('h2')?.textContent.trim() === 'ConfirmationModal'); s.scrollIntoView({ block: 'center' }); [...s.querySelectorAll('button')].find((b) => b.textContent.trim() === '<подпись кнопки>').click(); return scrollY; }`;
3. `$R/wait.js` → `0`; `take_screenshot` без `fullPage` → `<S>-modal-<M>.png`; `$R/measure-pg.js` → `<S>-modal-<M>.json` (поле `dialog` не `null`) — в `$R/pg/before/`.

Вкладку оставить открытой для задачи 5. Сервер остановить: `pkill -f "http.server 8765"`.

- [ ] **Step 4: Проверка**

```bash
cd "$R" && python3 - <<'EOF'
import json
for s in ('bare', 'host'):
    m = json.load(open(f'pg/before/{s}-page.json'))
    print(s, sorted(m['sections']))
    for modal in ('warning', 'dangerous'):
        d = json.load(open(f'pg/before/{s}-modal-{modal}.json'))
        print(s, modal, 'viewport', d['viewport'], 'dialog', d['dialog'])
EOF
```

Expected: у обеих страниц одинаковый список секций, в нём есть `Modal`, нет `NotificationMessage`; у четырёх снимков модалки viewport `1440×900`, `dialog` не `null`.

---

### Task 2: Словарь, иконки и компонент `NotificationMessage`

**Files:**
- Modify: `src/i18n.js`, `src/index.js`
- Create: `src/components/icons/Check.vue`, `src/components/icons/Close.vue`, `src/components/NotificationMessage.vue`
- Test: `tests/NotificationMessage.test.js`

**Interfaces:**
- Consumes: `withLang` (`src/lang.js`: проп `lang`, `texts`), `dashboardUi` (`src/plugin.js`), иконки `src/components/icons/Dangerous.vue`, `Warning.vue`.
- Produces: `export { default as NotificationMessage }` из `src/index.js`; ключ `messages.ru.close` / `messages.en.close`; иконки `Check.vue`, `Close.vue`.

- [ ] **Step 1: Тест**

`tests/NotificationMessage.test.js`:

```js
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import NotificationMessage from '../src/components/NotificationMessage.vue'
import { dashboardUi } from '../src/plugin.js'

enableAutoUnmount(afterEach)
afterEach(() => {
    document.body.innerHTML = ''
})

const ICONS = {
    confirmation: 'path[d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"]',
    warning: 'path[d^="M8.257 3.099"]',
    dangerous: 'path[d^="M12 9v2m0 4h.01"]',
}

// Предупреждения и ошибки Vue собираются и проверяются в каждом тесте, как в
// tests/Pagination.test.js.
function withHandlers(plugin) {
    const errors = []
    const warnings = []
    const global = {
        plugins: plugin ? [[dashboardUi, plugin]] : [],
        config: {
            errorHandler: (error) => errors.push(error),
            warnHandler: (message) => warnings.push(message),
        },
    }

    return { errors, warnings, global }
}

function mountMessage({ props = {}, plugin } = {}) {
    const { errors, warnings, global } = withHandlers(plugin)
    const wrapper = mount(NotificationMessage, { props, attachTo: document.body, global })

    return { wrapper, errors, warnings }
}

// Панель — единственный элемент внутри корня; пока текста нет, её нет.
const panelOf = (root) => root.firstElementChild

describe('NotificationMessage: типы', () => {
    const cases = [
        { type: 'confirmation', role: 'status', background: 'bb:bg-gray-50' },
        { type: 'warning', role: 'status', background: 'bb:bg-yellow-50' },
        { type: 'dangerous', role: 'alert', background: 'bb:bg-red-50' },
    ]

    for (const testCase of cases) {
        it(testCase.type, () => {
            const { wrapper, errors, warnings } = mountMessage({
                props: { modelValue: 'Письмо отправлено на адрес user@example.com', type: testCase.type, notificationHeading: 'Письмо отправлено' },
            })
            const panel = panelOf(wrapper.element)

            expect(wrapper.attributes('role')).toBe(testCase.role)
            expect(wrapper.classes()).toContain('bb-dashboard-ui')
            expect(wrapper.classes()).toContain('bb:pointer-events-none')
            expect(panel).not.toBeNull()
            expect(panel.classList.contains(testCase.background)).toBe(true)
            expect(panel.classList.contains('bb:pointer-events-auto')).toBe(true)
            expect(wrapper.get('button').classes()).toContain(testCase.background)
            for (const [type, selector] of Object.entries(ICONS)) {
                expect(panel.querySelector(selector) !== null).toBe(type === testCase.type)
            }
            expect(wrapper.text()).toContain('Письмо отправлено на адрес user@example.com')
            expect(wrapper.text()).toContain('Письмо отправлено')
            expect(wrapper.get('button').attributes('type')).toBe('button')
            for (const svg of panel.querySelectorAll('svg')) {
                expect(svg.getAttribute('aria-hidden')).toBe('true')
            }
            expect(errors).toEqual([])
            expect(warnings).toEqual([])
        })
    }
})

describe('NotificationMessage: пустое значение', () => {
    const cases = [
        { name: 'пустая строка', props: { modelValue: '' } },
        { name: 'null', props: { modelValue: null } },
        { name: 'значение не передано', props: {} },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const { wrapper, errors, warnings } = mountMessage({ props: testCase.props })

            expect(wrapper.attributes('role')).toBe('status')
            expect(panelOf(wrapper.element)).toBeNull()
            expect(wrapper.find('button').exists()).toBe(false)
            expect(errors).toEqual([])
            expect(warnings).toEqual([])
        })
    }
})

describe('NotificationMessage: живая область', () => {
    it('панель появляется внутри того же корня', async () => {
        const { wrapper, errors, warnings } = mountMessage({ props: { modelValue: '', type: 'dangerous' } })
        const root = wrapper.element

        await wrapper.setProps({ modelValue: 'Не удалось отправить письмо' })

        expect(wrapper.element).toBe(root)
        expect(panelOf(root)).not.toBeNull()
        expect(panelOf(root).parentElement).toBe(root)
        expect(root.getAttribute('role')).toBe('alert')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

describe('NotificationMessage: закрытие', () => {
    it('крестик — одно событие update:modelValue с пустой строкой', async () => {
        const { wrapper, errors, warnings } = mountMessage({ props: { modelValue: 'Текст', type: 'confirmation' } })

        await wrapper.get('button').trigger('click')

        expect(wrapper.emitted('update:modelValue')).toEqual([['']])
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('полный цикл v-model с родителем', async () => {
        const Parent = {
            data: () => ({ message: '' }),
            render() {
                return h(NotificationMessage, {
                    modelValue: this.message,
                    'onUpdate:modelValue': (value) => { this.message = value },
                    type: 'confirmation',
                    notificationHeading: 'Письмо отправлено',
                })
            },
        }
        const { errors, warnings, global } = withHandlers()
        const wrapper = mount(Parent, { attachTo: document.body, global })

        expect(panelOf(wrapper.element)).toBeNull()

        wrapper.vm.message = 'Письмо отправлено на адрес user@example.com'
        await nextTick()
        expect(panelOf(wrapper.element)).not.toBeNull()

        await wrapper.get('button').trigger('click')
        expect(wrapper.vm.message).toBe('')
        expect(panelOf(wrapper.element)).toBeNull()

        wrapper.vm.message = 'Письмо отправлено на адрес user@example.com'
        await nextTick()
        expect(panelOf(wrapper.element)).not.toBeNull()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('два уведомления на странице: закрытие одного не трогает другое', async () => {
        const Parent = {
            data: () => ({ message: 'Письмо отправлено', errorMessage: 'Ошибка отправки' }),
            render() {
                return h('div', [
                    h(NotificationMessage, {
                        modelValue: this.message,
                        'onUpdate:modelValue': (value) => { this.message = value },
                        type: 'confirmation',
                    }),
                    h(NotificationMessage, {
                        modelValue: this.errorMessage,
                        'onUpdate:modelValue': (value) => { this.errorMessage = value },
                        type: 'dangerous',
                    }),
                ])
            },
        }
        const { errors, warnings, global } = withHandlers()
        const wrapper = mount(Parent, { attachTo: document.body, global })
        const [status, alert] = [wrapper.get('[role="status"]').element, wrapper.get('[role="alert"]').element]

        await wrapper.get('[role="status"] button').trigger('click')

        expect(wrapper.vm.message).toBe('')
        expect(wrapper.vm.errorMessage).toBe('Ошибка отправки')
        expect(panelOf(status)).toBeNull()
        expect(panelOf(alert)).not.toBeNull()
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

describe('NotificationMessage: недопустимый type', () => {
    it('предупреждение валидатора, без ошибок, без иконки и фона', () => {
        const { wrapper, errors, warnings } = mountMessage({ props: { modelValue: 'Текст', type: 'info' } })
        const panel = panelOf(wrapper.element)

        expect(errors).toEqual([])
        expect(warnings.length).toBeGreaterThan(0)
        expect(warnings.every((warning) => warning.includes('Invalid prop'))).toBe(true)
        expect(panel).not.toBeNull()
        expect(panel.querySelector('svg path[d^="M9 12.75"], svg path[d^="M8.257"], svg path[d^="M12 9v2"]')).toBeNull()
        for (const background of ['bb:bg-gray-50', 'bb:bg-yellow-50', 'bb:bg-red-50']) {
            expect(panel.classList.contains(background)).toBe(false)
        }
    })
})

describe('NotificationMessage: подпись крестика', () => {
    const cases = [
        { name: 'без плагина — «Закрыть»', plugin: undefined, props: {}, expected: 'Закрыть', warns: false },
        { name: 'плагин en — «Close»', plugin: { lang: 'en' }, props: {}, expected: 'Close', warns: false },
        { name: 'проп lang ru главнее плагина en', plugin: { lang: 'en' }, props: { lang: 'ru' }, expected: 'Закрыть', warns: false },
        { name: 'недопустимый lang — язык плагина', plugin: { lang: 'en' }, props: { lang: 'de' }, expected: 'Close', warns: true },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const { wrapper, errors, warnings } = mountMessage({
                props: { modelValue: 'Текст', type: 'warning', ...testCase.props },
                plugin: testCase.plugin,
            })

            expect(wrapper.get('button').text()).toBe(testCase.expected)
            expect(errors).toEqual([])
            if (testCase.warns) {
                expect(warnings.length).toBeGreaterThan(0)
                expect(warnings.every((warning) => warning.includes('Invalid prop'))).toBe(true)
            } else {
                expect(warnings).toEqual([])
            }
        })
    }
})
```

- [ ] **Step 2: Тест падает**

Run: `npm test -- tests/NotificationMessage.test.js`
Expected: FAIL — `Failed to resolve import "../src/components/NotificationMessage.vue"`.

- [ ] **Step 3: Ключ словаря**

`src/i18n.js`: в словарь `ru` после строки `        back: 'Назад',` добавить:

```js
        // NotificationMessage: подпись крестика для скринридера.
        close: 'Закрыть',
```

в словарь `en` после строки `        back: 'Back',`:

```js
        close: 'Close',
```

- [ ] **Step 4: Иконки**

`src/components/icons/Check.vue`:

```vue
<template>
    <!-- Heroicon name: outline/check-circle -->
    <svg
        class="bb:h-7 bb:w-7 bb:text-green-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        aria-hidden="true"
    >
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
    </svg>
</template>

<script>
export default {};
</script>
```

`src/components/icons/Close.vue`:

```vue
<template>
    <!-- Heroicon name: solid/x -->
    <svg class="bb:h-5 bb:w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
        />
    </svg>
</template>

<script>
export default {};
</script>
```

- [ ] **Step 5: Компонент**

`src/components/NotificationMessage.vue`:

```vue
<template>
    <div
        class="bb-dashboard-ui bb:fixed bb:inset-0 bb:flex bb:items-end bb:justify-center bb:px-4 bb:py-6 bb:pointer-events-none bb:sm:p-6 bb:sm:items-start bb:sm:justify-end"
        :role="isDangerous ? 'alert' : 'status'"
    >
        <!-- Живая область есть всегда: скринридер объявляет изменение области,
             которую уже отслеживает, а область, созданная сразу с текстом,
             может остаться необъявленной (W3C ARIA22). Пустая — невидима и не
             перехватывает клики. -->
        <div
            v-if="hasMessage"
            class="bb:max-w-sm bb:w-full bb:shadow-lg bb:rounded-lg bb:pointer-events-auto bb:ring-1 bb:ring-black/5 bb:overflow-hidden"
            :class="{ 'bb:bg-red-50': isDangerous, 'bb:bg-yellow-50': isWarning, 'bb:bg-gray-50': isConfirmation }"
        >
            <div class="bb:p-4">
                <div class="bb:flex bb:items-start">
                    <div class="bb:shrink-0">
                        <warning v-if="isWarning"/>
                        <dangerous v-if="isDangerous"/>
                        <check v-if="isConfirmation"/>
                    </div>
                    <div class="bb:ml-3 bb:w-0 bb:flex-1 bb:pt-0.5">
                        <p class="bb:text-sm bb:font-medium bb:text-gray-900">{{ notificationHeading }}</p>
                        <p class="bb:mt-1 bb:text-sm bb:text-gray-500">{{ text }}</p>
                    </div>
                    <div class="bb:ml-4 bb:shrink-0 bb:flex">
                        <button
                            type="button"
                            class="bb:rounded-md bb:inline-flex bb:text-gray-400 bb:hover:text-gray-500 bb:focus:outline-hidden bb:focus:ring-2 bb:focus:ring-offset-2 bb:focus:ring-indigo-500"
                            :class="{ 'bb:bg-red-50': isDangerous, 'bb:bg-yellow-50': isWarning, 'bb:bg-gray-50': isConfirmation }"
                            @click.prevent="$emit('update:modelValue', '')"
                        >
                            <span class="bb:sr-only">{{ texts.close }}</span>
                            <close/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import Check from "./icons/Check.vue";
import Close from "./icons/Close.vue";
import Dangerous from "./icons/Dangerous.vue";
import Warning from "./icons/Warning.vue";
import { withLang } from "../lang.js";

// Всплывающее уведомление. Крестик закрывает его сам: эмитит пустой текст,
// поэтому странице достаточно v-model.
export default {
    components: {
        Check,
        Close,
        Dangerous,
        Warning,
    },

    mixins: [withLang],

    emits: ["update:modelValue"],

    props: {
        modelValue: {
            type: String,
            default: "",
        },
        type: {
            type: String,
            default: "warning",
            validator: (value) => {
                return ["confirmation", "warning", "dangerous"].indexOf(value) !== -1;
            },
        },
        notificationHeading: {
            type: String,
            default: "",
        },
    },

    computed: {
        // null — пустой текст: компонент не падает ни на каком значении.
        text() {
            return this.modelValue ?? "";
        },

        hasMessage() {
            return this.text.length > 0;
        },

        isDangerous() {
            return this.type === "dangerous";
        },

        isWarning() {
            return this.type === "warning";
        },

        isConfirmation() {
            return this.type === "confirmation";
        },
    },
};
</script>
```

- [ ] **Step 6: Экспорт**

`src/index.js`: после строки `export { default as PageCard } from './components/PageCard.vue'` добавить:

```js
export { default as NotificationMessage } from './components/NotificationMessage.vue'
```

- [ ] **Step 7: Тесты проходят, вывод чистый, стили собраны**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
out=$(npm test -- --reporter=verbose 2>&1); rc=$?; echo "rc=$rc"
printf '%s\n' "$out" | grep -aE 'Test Files|Tests '
printf '%s\n' "$out" | grep -acE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled'
out=$(npm run build 2>&1); rc=$?; echo "build rc=$rc"; printf '%s\n' "$out" | grep -aic warn
for c in 'pointer-events-none' 'pointer-events-auto' 'max-w-sm' 'bg-gray-50' 'sr-only' 'ring-black'; do printf '%s ' "$c"; grep -c "$c" dist/style.css; done
```

Expected: `rc=0`; `NotificationMessage.test.js` — 15 тестов, все зелёные; диагностик `0`; `build rc=0`, предупреждений `0`; каждый класс найден в `dist/style.css` (счётчик ≥ `1`).

- [ ] **Step 8: Commit**

```bash
git add src/i18n.js src/index.js src/components/icons/Check.vue src/components/icons/Close.vue src/components/NotificationMessage.vue tests/NotificationMessage.test.js
git commit -m "feat: добавить NotificationMessage — всплывающее уведомление"
```

---

### Task 3: `Modal` — только внутренний

**Files:**
- Modify: `src/index.js`, `README.md`, `playground/App.vue`
- Create: `tests/exports.test.js`

**Interfaces:**
- Consumes: экспорт `NotificationMessage` (задача 2).
- Produces: публичная поверхность — 17 компонентов и `dashboardUi`, без `Modal`.

- [ ] **Step 1: Тест публичной поверхности**

`tests/exports.test.js`:

```js
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import * as pkg from '../src/index.js'

describe('публичная поверхность пакета', () => {
    it('Modal — внутренний, не экспортируется', () => {
        expect(pkg).not.toHaveProperty('Modal')
    })

    it('ровно семнадцать компонентов и плагин', () => {
        expect(Object.keys(pkg).sort()).toEqual([
            'Closer',
            'ConfirmationModal',
            'Dot',
            'DownloadLink',
            'DropdownButtonWithAction',
            'ErrorMessages',
            'NavigationMenuElement',
            'NotificationMessage',
            'PageCard',
            'Pagination',
            'PickDay',
            'Popup',
            'RussianMobileFilter',
            'Search',
            'SelectDateInterval',
            'SelectSingle',
            'SmallBadge',
            'dashboardUi',
        ])
    })
})
```

- [ ] **Step 2: Тест падает**

Run: `npm test -- tests/exports.test.js`
Expected: FAIL — оба теста: `Modal` есть среди экспортов.

- [ ] **Step 3: Убрать экспорт**

`src/index.js`: удалить строку `export { default as Modal } from './components/Modal.vue'`.

Run: `npm test -- tests/exports.test.js` → PASS (2 теста).

- [ ] **Step 4: Playground без `Modal`**

`playground/App.vue`:

1. удалить секцию целиком:

```html
        <section>
            <h2>Modal</h2>
            <div class="demo-row">
                <button type="button" class="demo-button" @click="plainModalIsOpen = true">Открыть</button>
            </div>
            <modal :is-open="plainModalIsOpen" :heading-id="plainModalHeadingId">
                <div style="padding: 24px">
                    <h3 :id="plainModalHeadingId">Произвольное содержимое</h3>
                    <p>Разметку внутри модалки задаёт приложение.</p>
                    <button type="button" class="demo-button" @click="plainModalIsOpen = false">Закрыть</button>
                </div>
            </modal>
        </section>

```

   (вместе с пустой строкой после неё);
2. в импорте из `'../dist/index.js'` и в `components` удалить строку `Modal,`;
3. в `setup()` удалить строку `plainModalHeadingId: useId(),`; строку `import { useId } from 'vue';` удалить — `useId` больше не используется;
4. в `data()` удалить строку `plainModalIsOpen: false,`.

- [ ] **Step 5: README**

1. «Компоненты»: строку `` `SmallBadge`, `ErrorMessages`, `Closer`, `DownloadLink`, `Modal`, `` → `` `SmallBadge`, `ErrorMessages`, `Closer`, `DownloadLink`, ``; строку `` `NavigationMenuElement`, `PageCard` и плагин `dashboardUi`. В архив пакета `` → `` `NavigationMenuElement`, `PageCard`, `NotificationMessage` и плагин `dashboardUi`. В архив пакета ``.
2. Раздел `### Modal` удалить целиком — от строки `### Modal` до строки перед `### ConfirmationModal`.
3. Раздел `### ConfirmationModal`: после абзаца «События: `actionConfirmed` … нет v-model».» добавить абзац:

```markdown
Панель модалки — белая, со скруглением `rounded-lg`: на узком экране прижата
к нижнему краю, начиная с `sm` стоит по центру и занимает `max-w-lg`. `class` и
другие атрибуты на `<confirmation-modal>` попадают на полноэкранный корень, а
не на панель. Панель не обрезает содержимое, поэтому блоки текста и кнопок со
своим фоном скругляют внешние углы сами — верхний `rounded-t-lg`, нижний
`rounded-b-lg`.
```

4. Раздел `### PageCard`: `Карточка не обрезает содержимое, как `Modal`:` → `Карточка не обрезает содержимое, как у `ConfirmationModal`:`.
5. Абзац о ресете слотов: `внутри `Popup`, `DropdownButtonWithAction` и `Modal`. Ресет лежит в слое` → `внутри `Popup` и `DropdownButtonWithAction`. Ресет лежит в слое`.
6. Абзац о фокусе — заменить три строки

```markdown
`Modal` и построенный на нём `ConfirmationModal` не переносят фокус внутрь при
открытии, не удерживают его внутри, не возвращают на прежнее место после
закрытия и не закрываются по Escape.
```

на

```markdown
`ConfirmationModal` не переносит фокус внутрь при открытии, не удерживает его
внутри, не возвращает на прежнее место после закрытия и не закрывается по
Escape.
```

- [ ] **Step 6: Проверка**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
grep -n '`Modal`' README.md; echo "Modal в README: $?"
grep -n -e '<modal' -e 'plainModal' -e 'useId' playground/App.vue; echo "Modal в playground: $?"
out=$(npm test -- --reporter=verbose 2>&1); rc=$?; echo "rc=$rc"
printf '%s\n' "$out" | grep -aE 'Test Files|Tests '
printf '%s\n' "$out" | grep -acE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled'
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; exit 1; }
rm -rf playground/dist
out=$(npx vite build --config vite.playground.config.js 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: playground"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения playground"; exit 1; }
echo ok
```

Expected: `Modal в README: 1` (grep ничего не нашёл), `Modal в playground: 1`, `rc=0`, диагностик `0`, затем `ok`.

- [ ] **Step 7: Commit**

```bash
git add src/index.js tests/exports.test.js playground/App.vue README.md
git commit -m "refactor: сделать Modal внутренним компонентом пакета"
```

---

### Task 4: Playground и README для `NotificationMessage`

**Files:**
- Modify: `playground/App.vue`, `README.md`

**Interfaces:**
- Consumes: `NotificationMessage` из `../dist/index.js`.
- Produces: секция playground `<h2>NotificationMessage</h2>` с кнопками «Подтверждение», «Предупреждение», «Ошибка» и тремя экземплярами (`confirmation`, `warning`, `dangerous`).

- [ ] **Step 1: Секция в `App.vue`**

После закрывающего `</section>` последней секции (`PageCard`), перед закрывающим `</div>` страницы:

```html

        <section>
            <h2>NotificationMessage</h2>
            <div class="demo-row">
                <button type="button" class="demo-button" @click="showNotice('confirmation')">Подтверждение</button>
                <button type="button" class="demo-button" @click="showNotice('warning')">Предупреждение</button>
                <button type="button" class="demo-button" @click="showNotice('dangerous')">Ошибка</button>
            </div>
            <!-- У каждого типа свой экземпляр: роль живой области задаётся типом. -->
            <notification-message v-model="confirmationNotice" type="confirmation" notification-heading="Письмо отправлено"/>
            <notification-message v-model="warningNotice" type="warning" notification-heading="Проверьте данные"/>
            <notification-message v-model="dangerousNotice" type="dangerous" notification-heading="Ошибка отправки"/>
        </section>
```

В `<script>`: в импорт из `'../dist/index.js'` после `PageCard,` — строку `    NotificationMessage,`; в `components` после `PageCard,` — `        NotificationMessage,`; в `data()` после `englishModalIsOpen: false,` — три строки:

```js
            confirmationNotice: '',
            warningNotice: '',
            dangerousNotice: '',
```

Блока `methods` в `App.vue` нет — добавить его сразу после закрывающей `},` блока `data()`:

```js

    methods: {
        // На экране одно уведомление: у всех трёх одно место в углу.
        showNotice(type) {
            this.confirmationNotice = type === 'confirmation' ? 'Письмо отправлено на адрес user@example.com' : '';
            this.warningNotice = type === 'warning' ? 'Заполните все обязательные поля.' : '';
            this.dangerousNotice = type === 'dangerous' ? 'Не удалось отправить письмо на адрес user@example.com' : '';
        },
    },
```

- [ ] **Step 2: README**

1. После раздела `### PageCard` (перед `## Языки`) — раздел:

````markdown
### NotificationMessage

Всплывающее уведомление: заголовок, текст, иконка по типу и крестик закрытия.
На узком экране стоит снизу по центру, начиная с `sm` — в правом верхнем углу.

    <notification-message
        v-model="message"
        type="confirmation"
        notification-heading="Письмо отправлено"
    />

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `modelValue` | `String` | `""` | Текст уведомления; пустая строка или `null` — уведомления нет |
| `type` | `String` | `"warning"` | `"confirmation"` (галочка, серый фон), `"warning"` (жёлтое) или `"dangerous"` (красное) |
| `notificationHeading` | `String` | `""` | Заголовок |
| `lang` | `String` | язык плагина | `"ru"` или `"en"` |

Уведомление показано, пока текст непуст. Крестик закрывает его сам — эмитит
`update:modelValue` с пустой строкой, поэтому странице достаточно `v-model`.
Других событий нет.

Для скринридера уведомление — живая область: `role="alert"` у `dangerous`,
`role="status"` у остальных. Область есть на странице всегда, а пустая
невидима и не перехватывает клики, поэтому появившийся текст скринридер
объявляет. Роль задаётся типом, так что каждому типу удобно держать свой
экземпляр. Подпись крестика для скринридера — «Закрыть» / «Close».

Корень — на весь экран (`fixed inset-0`), с ресетом пакета; слотов нет.
````

2. «Языки», таблица: после строки `` | `PageCard` — доступное имя крестика | Назад | Back | `` добавить строку:

```markdown
| `NotificationMessage` — подпись крестика для скринридера | Закрыть | Close |
```

- [ ] **Step 3: Сборка playground**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
rm -rf playground/dist
out=$(npx vite build --config vite.playground.config.js 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения"; exit 1; }
out=$(npm test -- --reporter=verbose 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: npm test"; exit 1; }
test "$(printf '%s\n' "$out" | grep -acE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled')" -eq 0 || { echo "ПРОВАЛ: диагностика"; exit 1; }
grep -c '### NotificationMessage' README.md
echo ok
```

Expected: `1`, затем `ok`.

- [ ] **Step 4: Commit**

```bash
git add playground/App.vue README.md
git commit -m "docs: описать NotificationMessage в README и показать в playground"
```

---

### Task 5: Приёмка playground «после»

Коммита нет.

**Interfaces:**
- Consumes: `$R/pg/before/*`, скрипты `$R`, вкладка `nm-pg`; секция и данные задачи 4.
- Produces: `$R/pg/after/*`, `$R/pg/after/verdict.md`.

- [ ] **Step 1: Скрипт замера уведомлений**

`$R/measure-notice.js`:

```js
() => {
    const rect = (el) => {
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    const roots = [...document.querySelectorAll('[role="status"], [role="alert"]')];
    const panels = roots.map((root) => root.firstElementChild).filter(Boolean);
    const corner = document.elementFromPoint(innerWidth - 10, 10);
    return {
        dpr: devicePixelRatio,
        viewport: { w: innerWidth, h: innerHeight },
        roles: roots.map((root) => root.getAttribute('role')),
        panels: panels.map((panel) => ({ role: panel.parentElement.getAttribute('role'), rect: rect(panel), text: panel.innerText.replace(/\s+/g, ' ').trim() })),
        cornerInsideRegion: corner ? roots.some((root) => root.contains(corner)) : null,
    };
}
```

- [ ] **Step 2: Сервер** — `"$R/serve.sh"` → `200` (playground собран в задаче 4).

- [ ] **Step 3: Существующие секции**

Вкладка `nm-pg`, `emulate` `1440x900x1`. Для `S` = `bare`, `host` — как в задаче 1, шаг 3, в `$R/pg/after/<S>-page.{png,json}`.

```bash
cd "$R" && python3 - <<'EOF'
import json, sys
from PIL import ImageChops
from crop import crop, section_region

def same(a, b):
    return a.size == b.size and ImageChops.difference(a, b).getbbox() is None

failures = []
for s in ('bare', 'host'):
    before = json.load(open(f'pg/before/{s}-page.json'))['sections']
    after = json.load(open(f'pg/after/{s}-page.json'))['sections']
    assert 'Modal' not in after and 'NotificationMessage' in after, sorted(after)
    for title in before:
        if title == 'Modal':
            continue
        a = crop(f'pg/before/{s}-page.png', f'pg/before/{s}-page.json', lambda m: section_region(m, title))
        b = crop(f'pg/after/{s}-page.png', f'pg/after/{s}-page.json', lambda m: section_region(m, title))
        line = f'{s} {title} ' + ('совпадает' if same(a, b) else f'ОТЛИЧАЕТСЯ {a.size} {b.size}')
        print(line)
        if not same(a, b):
            failures.append(line)
sys.exit(1 if failures else 0)
EOF
echo "exit=$?"
```

Expected: все строки — `совпадает`, `exit=0`.

- [ ] **Step 4: Уведомления bare/host**

Для `W` = `1440` и `375`: сначала `emulate` с `viewport` `1440x900x1` или `375x812x1` соответственно; затем для `S` = `bare`, `host` и `T` = `confirmation` (кнопка «Подтверждение»), `warning` («Предупреждение»), `dangerous` («Ошибка»):

1. `navigate_page` с `initScript` = `$R/fixed-date.js`; `$R/wait.js` → `0`;
2. `evaluate_script` `$R/measure-notice.js` → `viewport.w` равен `W`, `panels` пуст, `roles` — `["status", "status", "alert"]`, `cornerInsideRegion` — `false`;
3. `evaluate_script`: `() => { [...document.querySelectorAll('section')].find((s) => s.querySelector('h2')?.textContent.trim() === 'NotificationMessage').querySelectorAll('button').forEach((b) => { if (b.textContent.trim() === '<подпись кнопки>') b.click(); }); }`;
4. `$R/wait.js` → `0`; `take_screenshot` без `fullPage` → `<S>-<T>-<W>.png`; `$R/measure-notice.js` → `<S>-<T>-<W>.json` — в `$R/pg/after/`.

Сверка — viewport и DPR по ширине, координаты панели bare и host равны, панель с запасом под тень и кольцо совпадает попиксельно; любое несовпадение завершает скрипт с кодом `1`:

```bash
cd "$R" && python3 - <<'EOF'
import json, sys
from PIL import ImageChops
from crop import around

failures = []

def check(ok, line):
    print(line)
    if not ok:
        failures.append(line)

for t, role in (('confirmation', 'status'), ('warning', 'status'), ('dangerous', 'alert')):
    for w in (1440, 375):
        m = {s: json.load(open(f'pg/after/{s}-{t}-{w}.json')) for s in ('bare', 'host')}
        ok = all(m[s]['viewport']['w'] == w and m[s]['dpr'] == 1 and len(m[s]['panels']) == 1 and m[s]['panels'][0]['role'] == role for s in m)
        check(ok, f'{t} {w} viewport/dpr/панель/роль ' + ('верно' if ok else f'НЕВЕРНО {m}'))
        if not ok:
            continue
        ra, rb = m['bare']['panels'][0]['rect'], m['host']['panels'][0]['rect']
        check(ra == rb, f'{t} {w} положение ' + ('совпадает' if ra == rb else f'ОТЛИЧАЕТСЯ {ra} {rb}'))
        a = around(f'pg/after/bare-{t}-{w}.png', ra, 1, 24)
        b = around(f'pg/after/host-{t}-{w}.png', rb, 1, 24)
        same = a.size == b.size and ImageChops.difference(a, b).getbbox() is None
        check(same, f'{t} {w} панель с тенью ' + ('совпадает' if same else f'ОТЛИЧАЕТСЯ {a.size} {b.size}'))
sys.exit(1 if failures else 0)
EOF
echo "exit=$?"
```

Expected: 18 строк `верно` / `совпадает`, `exit=0`.

- [ ] **Step 5: Открытая `ConfirmationModal`**

`emulate` `1440x900x1`. Для `S` = `bare`, `host` и `M` = `warning` («Жёлтая»), `dangerous` («Красная») — снимки как в задаче 1, шаг 3 (открытая модалка), в `$R/pg/after/<S>-modal-<M>.{png,json}`. Затем на той же странице `take_snapshot`, клик по кнопке «Отмена» по `uid`, `$R/wait.js` → `0`, `$R/measure-pg.js` → поле `dialog` — `null` (модалка закрылась).

```bash
cd "$R" && python3 - <<'EOF'
import json, sys
from PIL import ImageChops
from crop import around

failures = []
for s in ('bare', 'host'):
    for modal in ('warning', 'dangerous'):
        name = f'{s}-modal-{modal}'
        ma = json.load(open(f'pg/before/{name}.json'))
        mb = json.load(open(f'pg/after/{name}.json'))
        ok = (ma['viewport'] == mb['viewport'] and ma['dpr'] == mb['dpr'] and ma['dialog'] is not None and ma['dialog'] == mb['dialog'])
        a = around(f'pg/before/{name}.png', ma['dialog'], ma['dpr'], 48) if ok else None
        b = around(f'pg/after/{name}.png', mb['dialog'], mb['dpr'], 48) if ok else None
        same = ok and a.size == b.size and ImageChops.difference(a, b).getbbox() is None
        line = f'{name} ' + ('совпадает' if same else f'ОТЛИЧАЕТСЯ dialog {ma["dialog"]} → {mb["dialog"]}')
        print(line)
        if not same:
            failures.append(line)
sys.exit(1 if failures else 0)
EOF
echo "exit=$?"
```

Expected: 4 строки `совпадает`, `exit=0`; после «Отмены» модалка закрыта на обеих страницах для обоих типов.

- [ ] **Step 6: Закрытие и живая область**

На `host`, `emulate` `1440x900x1`:

1. свежий `navigate_page`; `evaluate_script` — наблюдатель на области `dangerous` до показа:

```js
() => {
    const root = document.querySelector('[role="alert"]');
    window.__liveRoot = root;
    window.__liveInserted = false;
    new MutationObserver((records) => {
        for (const record of records) {
            for (const node of record.addedNodes) {
                if (node.nodeType === 1 && node.parentElement === root) window.__liveInserted = true;
            }
        }
    }).observe(root, { childList: true });
    return root !== null;
}
```

   → `true`; `take_snapshot` — в дереве доступности есть узлы `status` и `alert`;
2. клик «Ошибка» (как в шаге 4); `evaluate_script` `() => ({ sameRoot: document.querySelector('[role="alert"]') === window.__liveRoot, inserted: window.__liveInserted })` → `{ sameRoot: true, inserted: true }`;
3. `take_snapshot`, клик по кнопке «Закрыть» по `uid`; `$R/measure-notice.js` → `panels` пуст, `cornerInsideRegion` — `false`.

- [ ] **Step 7: Итог**

`$R/pg/after/verdict.md` — выводы шагов 3–6. Сервер не останавливать — после задачи 5 контроллер проводит проверку VoiceOver с Tim. Удалить `/Users/boobooking/Code/mars/cashback/.superpowers/tmp-shots`. Вкладку `nm-pg` перевести на `about:blank`.

---

### Проверка VoiceOver — контроллер и Tim

После задачи 5, сервер playground запущен (`$R/serve.sh`). Контроллер передаёт Tim шаги и записывает ответ в `$R/pg/after/verdict.md`:

1. Safari на Mac: `http://127.0.0.1:8765/host.html`, прокрутить к секции «NotificationMessage».
2. Включить VoiceOver (⌘F5).
3. «Подтверждение» — VoiceOver произносит «Письмо отправлено» и «Письмо отправлено на адрес user@example.com».
4. «Предупреждение» — «Проверьте данные» и «Заполните все обязательные поля.».
5. «Ошибка» — «Ошибка отправки» и «Не удалось отправить письмо на адрес user@example.com», сразу, прерывая текущую речь.
6. Выключить VoiceOver (⌘F5).

После ответа — `pkill -f "http.server 8765"`.

---

### Task 6: Версия `0.10.0` и tarball

**Files:** `package.json`, `package-lock.json`.

**Interfaces:**
- Produces: версионный коммит; `$R/tarball/boobooking-dashboard-ui-components-0.10.0.tgz`.

- [ ] **Step 1: Версия**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
npm version 0.10.0 --no-git-tag-version
grep -n '"version": "0.10.0"' package.json package-lock.json
out=$(npm test -- --reporter=verbose 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: npm test"; exit 1; }
test "$(printf '%s\n' "$out" | grep -acE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled')" -eq 0 || { echo "ПРОВАЛ: диагностика"; exit 1; }
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; exit 1; }
git add package.json package-lock.json
git commit -m "chore: поднять версию пакета до 0.10.0"
```

Expected: `"version": "0.10.0"` — одна строка в `package.json`, две в `package-lock.json`.

- [ ] **Step 2: Tarball**

```bash
R=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/notification-message
mkdir -p "$R/tarball"
cd /Users/boobooking/Code/dashboard-ui-components && npm pack --pack-destination "$R/tarball" 2>/dev/null | tail -1
tar -tzf "$R/tarball/boobooking-dashboard-ui-components-0.10.0.tgz" | sort
```

Expected: `package/README.md`, `package/dist/index.js`, `package/dist/style.css`, `package/package.json`.

---

### Task 7: cashback на tarball — снимки «до», перевод, приёмка

**Шаг 0 — контроллер, до передачи задачи:**

```bash
R=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/notification-message
test -f "$R/cashback-admin.env" || printf 'ADMIN_EMAIL=acceptance-nm@cashback.test\nADMIN_PASSWORD=%s\n' "$(openssl rand -hex 12)" > "$R/cashback-admin.env"
. "$R/cashback-admin.env"
out=$(printf '%s\n%s\n%s\n%s\n' "$ADMIN_EMAIL" "Приёмка NotificationMessage" "$ADMIN_PASSWORD" "$ADMIN_PASSWORD" | docker exec -i cashback-backend php /var/www/artisan user:create 2>&1); rc=$?
echo "$out" | tail -2; test "$rc" -eq 0 || echo "ПРОВАЛ"
```

Затем `new_page` `https://cashback.test/dashboard/login` с `isolatedContext: "nm-cb"`, вход под этой учёткой (пароль — контроллер). Сабагент получает авторизованную вкладку.

**Files (cashback):** `resources/js/Pages/Services/Index.vue`; удаляются `resources/js/Shared/ConfirmationMessage.vue`, `resources/js/icons/Check.vue`, `resources/js/icons/Close.vue`, `resources/js/icons/Dangerous.vue`, `resources/js/icons/Warning.vue` — без коммита.

**Interfaces:**
- Consumes: tarball задачи 6; `NotificationMessage` (`v-model`, `type`, `notification-heading`); вкладка `nm-cb`.
- Produces: ветка cashback `feature/notification-message` с незакоммиченными правками; `$R/cashback/{before,after}`.

- [ ] **Step 1: Скрипты состояния и замера**

Уведомления на `Services` появляются после отправки письма; письма не отправляются — состояние задаётся в экземпляре страницы. Обход начинается с `_vnode` контейнера `#app`: рендерер Vue ставит его и в production-сборке (а `app._instance` там не заполняется).

`$R/set-confirmation.js`:

```js
() => {
    const stack = [document.getElementById('app')._vnode];
    while (stack.length) {
        const vnode = stack.pop();
        if (!vnode) continue;
        const component = vnode.component;
        if (component) {
            if (component.data && 'message' in component.data && 'errorMessage' in component.data) {
                component.data.message = 'Письмо успешно отправлено по адресу user@example.com';
                component.data.errorMessage = '';
                return true;
            }
            stack.push(component.subTree);
        }
        if (Array.isArray(vnode.children)) stack.push(...vnode.children);
    }
    return false;
}
```

`$R/set-dangerous.js` — тот же код, но присваивания:

```js
                component.data.message = '';
                component.data.errorMessage = 'Не удалось отправить письмо на адрес user@example.com';
```

`$R/read-state.js` — тот же обход, но вместо присваиваний:

```js
                return { message: component.data.message, errorMessage: component.data.errorMessage };
```

(и `return null` в конце вместо `return false`).

`$R/measure-cb-notice.js` — панель по тексту заголовка, одинаково до и после перевода:

```js
() => {
    const heading = [...document.querySelectorAll('p')].find((p) => ['Письмо отправлено', 'Ошибка отправки'].includes(p.textContent.trim()));
    const panel = heading ? heading.closest('div[class*="max-w-sm"]') : null;
    const b = panel ? panel.getBoundingClientRect() : null;
    return {
        dpr: devicePixelRatio,
        viewport: { w: innerWidth, h: innerHeight },
        scrollY,
        heading: heading ? heading.textContent.trim() : null,
        rect: b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null,
    };
}
```

- [ ] **Step 2: Снимки «до»**

cashback на `main`, дерево чистое, `npm run build` — без ошибок и предупреждений. Во вкладке `nm-cb`, для `W` = `1440` (`1440x900x1`) и `375` (`375x812x1`), `T` = `confirmation`, `dangerous`:

1. `emulate`; `navigate_page` на `https://cashback.test/dashboard/services`; `$R/wait.js` → `0`;
2. `evaluate_script` `$R/set-<T>.js` → `true`; `$R/wait.js` → `0`;
3. `take_screenshot` без `fullPage` → `<T>-<W>.png`; `$R/measure-cb-notice.js` → `<T>-<W>.json` (`rect` не `null`, `scrollY` — `0`) — в `$R/cashback/before/`.

Модалку отправки письма не открывать и не подтверждать.

- [ ] **Step 3: Ветка и перевод**

```bash
cd /Users/boobooking/Code/mars/cashback
test -z "$(git status --porcelain)" || { echo "ПРОВАЛ: дерево не чистое"; exit 1; }
git switch -c feature/notification-message
```

`resources/js/Pages/Services/Index.vue`:

1. два блока

```html
                    <confirmation-message
                        v-model:message="message"
                        type="confirmation"
                        v-on:notification-closed="closeConfirmationMessage"
                        notification-heading="Письмо отправлено"
                    />

                    <confirmation-message
                        v-model:message="errorMessage"
                        type="dangerous"
                        v-on:notification-closed="closeErrorMessage"
                        notification-heading="Ошибка отправки"
                    />
```

   заменить на

```html
                    <notification-message
                        v-model="message"
                        type="confirmation"
                        notification-heading="Письмо отправлено"
                    />

                    <notification-message
                        v-model="errorMessage"
                        type="dangerous"
                        notification-heading="Ошибка отправки"
                    />
```

2. импорт `import { ConfirmationModal, Pagination, RussianMobileFilter, SelectDateInterval, SelectSingle, SmallBadge } from "@boobooking/dashboard-ui-components";` → `import { ConfirmationModal, NotificationMessage, Pagination, RussianMobileFilter, SelectDateInterval, SelectSingle, SmallBadge } from "@boobooking/dashboard-ui-components";`; строку `import ConfirmationMessage from "../../Shared/ConfirmationMessage.vue";` удалить;
3. в `components` строку `        "confirmation-message": ConfirmationMessage,` → `        NotificationMessage,`;
4. из `methods` удалить методы `closeConfirmationMessage()` и `closeErrorMessage()` целиком, вместе с пустой строкой перед каждым; запятая после `sendEmail` (или другого метода, ставшего последним) остаётся.

```bash
cd /Users/boobooking/Code/mars/cashback
R=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/notification-message
git rm -q resources/js/Shared/ConfirmationMessage.vue resources/js/icons/Check.vue resources/js/icons/Close.vue resources/js/icons/Dangerous.vue resources/js/icons/Warning.vue
out=$(npm install "$R/tarball/boobooking-dashboard-ui-components-0.10.0.tgz" --no-save 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
grep -m1 '"version"' node_modules/@boobooking/dashboard-ui-components/package.json
hits=$(grep -rn -e 'ConfirmationMessage' -e 'confirmation-message' -e 'notification-closed' -e 'closeConfirmationMessage' -e 'closeErrorMessage' -e 'icons/' resources/js)
test -z "$hits" || { echo "ПРОВАЛ: остались:"; echo "$hits"; exit 1; }
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения"; exit 1; }
echo ok
```

Expected: `"version": "0.10.0"`, затем `ok`.

- [ ] **Step 4: Снимки «после» и сверка**

Те же `W` и `T`, что в шаге 2, в `$R/cashback/after/`.

```bash
cd "$R/cashback" && python3 - <<'EOF'
import json, sys
sys.path.insert(0, '..')
from PIL import ImageChops
from crop import around

failures = []
for t in ('confirmation', 'dangerous'):
    for w in (1440, 375):
        name = f'{t}-{w}'
        ma = json.load(open(f'before/{name}.json'))
        mb = json.load(open(f'after/{name}.json'))
        ok = all(m['rect'] is not None and m['scrollY'] == 0 and m['viewport']['w'] == w and m['dpr'] == 1 for m in (ma, mb))
        ok = ok and ma['rect'] == mb['rect'] and ma['viewport'] == mb['viewport'] and ma['heading'] == mb['heading']
        same = False
        if ok:
            a = around(f'before/{name}.png', ma['rect'], 1, 24)
            b = around(f'after/{name}.png', mb['rect'], 1, 24)
            same = a.size == b.size and ImageChops.difference(a, b).getbbox() is None
        line = f'{name} ' + ('совпадает' if same else f'ОТЛИЧАЕТСЯ до {ma} после {mb}')
        print(line)
        if not same:
            failures.append(line)
sys.exit(1 if failures else 0)
EOF
echo "exit=$?"
```

Expected: 4 строки `совпадает`, `exit=0` — положение, viewport, DPR и панель с запасом под тень и кольцо одинаковы до и после. Иначе — стоп и доклад с вырезками.

- [ ] **Step 5: Закрытие**

`1440`; `navigate_page` на `/dashboard/services`; `$R/set-dangerous.js` → `true`; `take_snapshot` — у кнопки закрытия имя «Закрыть»; клик по ней по `uid`; `$R/read-state.js` → `{ message: "", errorMessage: "" }`; `$R/measure-cb-notice.js` → `rect` — `null`.

Итог — `$R/cashback/verdict.md`. Правки остаются незакоммиченными в `feature/notification-message`. Удалить `tmp-shots`.

---

### Выпуск `0.10.0` — контроллер

После задач 1–7 и проверки VoiceOver: финальное ревью ветки пакета (`main..feature/notification-message`), одна волна исправлений и повторное ревью.

Если исправления меняют `src/` или `playground/`, до тега:

1. сборка из исправленного кода — `npm pack` упаковывает готовый `dist`:

```bash
cd /Users/boobooking/Code/dashboard-ui-components
out=$(npm test -- --reporter=verbose 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: npm test"; exit 1; }
test "$(printf '%s\n' "$out" | grep -acE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled')" -eq 0 || { echo "ПРОВАЛ: диагностика"; exit 1; }
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения сборки"; exit 1; }
rm -rf playground/dist
out=$(npx vite build --config vite.playground.config.js 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: playground"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения playground"; exit 1; }
echo ok
```

2. задача 6, шаг 2 — tarball заново;
3. задача 5, шаги 2–7 — заново; при правке разметки уведомления — и проверка VoiceOver;
4. задача 7 — переустановить tarball в cashback, `npm run build`, шаги 4–5.

Затем `git reset --soft main` → один коммит с телом → `git switch main` → `git merge --ff-only feature/notification-message` → `npm test` и сборка на `main` → `git branch -D feature/notification-message` → `git push origin main` → `git tag v0.10.0` → `git push origin v0.10.0` → `gh run watch` для Publish → `npm view @boobooking/dashboard-ui-components@0.10.0 version --prefer-online` → `0.10.0`.

---

### Task 8: cashback на опубликованной `0.10.0`

Выполняется, когда `npm view @boobooking/dashboard-ui-components@0.10.0 version --prefer-online` отвечает `0.10.0`.

**Files:** cashback — `package.json`, `package-lock.json` и правки задачи 7.

**Interfaces:**
- Consumes: ветка `feature/notification-message` cashback, `$R/cashback/after/*`, вкладка `nm-cb`.
- Produces: коммит в `feature/notification-message` cashback; удалённый администратор приёмки.

- [ ] **Step 1: Пакет из реестра**

```bash
cd /Users/boobooking/Code/mars/cashback
test "$(git branch --show-current)" = "feature/notification-message" || { echo "ПРОВАЛ: не та ветка"; exit 1; }
out=$(npm install @boobooking/dashboard-ui-components@0.10.0 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
grep -n '"@boobooking/dashboard-ui-components": "\^0.10.0"' package.json
grep -n -A2 '"node_modules/@boobooking/dashboard-ui-components"' package-lock.json | grep resolved
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения"; exit 1; }
```

Expected: `^0.10.0`; `resolved` — `https://registry.npmjs.org/@boobooking/dashboard-ui-components/-/dashboard-ui-components-0.10.0.tgz`.

- [ ] **Step 2: Снимки на опубликованной версии**

Те же `W` и `T`, что в задаче 7, шаг 2, в `$R/cashback/published/`. Сверка с `after`:

```bash
cd "$R/cashback" && python3 - <<'EOF'
import json, os, sys
from PIL import Image, ImageChops

expected = sorted(f'{t}-{w}' for t in ('confirmation', 'dangerous') for w in (1440, 375))
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

Expected: 4 строки `совпадает`, `exit=0` — снимки целиком и замеры (положение, viewport, DPR) равны стадии tarball.

- [ ] **Step 3: Pest и коммит**

`docker exec cashback-backend php /var/www/artisan test` — все зелёные, без предупреждений.

```bash
cd /Users/boobooking/Code/mars/cashback
git add -A resources/js package.json package-lock.json
git status --short
git commit -F - <<'EOF'
refactor: брать уведомление NotificationMessage из пакета

Всплывающее уведомление на странице услуг теперь NotificationMessage из
@boobooking/dashboard-ui-components 0.10.0 вместо своей копии
ConfirmationMessage и её иконок. Текст передаётся через v-model, и крестик
закрывает уведомление сам — обработчики закрытия на странице больше не
нужны. Вид уведомлений не изменился; для скринридера они теперь живые
области, а у крестика есть подпись «Закрыть».
EOF
```

- [ ] **Step 4: Уборка**

- администратор приёмки удаляет себя через `/dashboard/users` (меню своей строки → «Удалить» → подтвердить);
- удалить `/Users/boobooking/Code/mars/cashback/.superpowers/tmp-shots`;
- контроллер: вход под учёткой отклоняется; закрыть вкладки `nm-cb` и `nm-pg` (последнюю — на `about:blank`); удалить `$R/cashback-admin.env`; ветку `feature/notification-message` cashback — fast-forward в `main`, удалить, без пуша.

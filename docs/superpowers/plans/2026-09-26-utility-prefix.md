# Префикс утилит пакета — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Собрать утилиты пакета с префиксом `bb`, чтобы они не проигрывали одноимённым утилитам приложения, и выпустить это как `0.7.0`.

**Architecture:** Префикс ставится на импорт темы Tailwind в `src/styles/index.css`; разметка всех компонентов переводится на `bb:*` детерминированным скриптом по AST шаблонов; пропуск префикса ловит vitest-тест по тому же AST. Playground получает честное окружение потребителя, на котором ошибка воспроизводится «до» и исчезает «после»; финальная проверка — tarball в cashback.

**Tech Stack:** Vue 3.5 (`vue/compiler-sfc`: `parse`, `babelParse`), Tailwind 4.3.3, Vite 8, vitest 5 (node и happy-dom), npm, Chrome DevTools MCP.

**Spec:** `docs/superpowers/specs/2026-09-26-utility-prefix-design.md`

## Global Constraints

- **Репозиторий** `/Users/boobooking/Code/dashboard-ui-components`, ветка `feature/utility-prefix`. `main` не трогать. **Тег, пуш и `npm publish` не делать** — только по команде владельца: публикацию в npm не откатить.
- **API компонентов не меняется:** пропсы, события, слоты, логика `<script>`.
- **Префикс `bb`.** Каждый утилитарный токен в разметке — `bb:<токен>`, префикс первым, варианты после: `bb:sm:inline-block`, `bb:hover:bg-red-700`, `bb:placeholder:text-sm`. Без префикса — только `bb-dashboard-ui`. Проверено: в компонентах 22 файла, 117 атрибутов с классами, 217 разных токенов; все, кроме `bb-dashboard-ui`, — утилиты Tailwind (`w-phone` порождает токен пакета).
- **Не меняются:** ресет на `.bb-dashboard-ui`, объявление слоёв первой строкой `src/styles/index.css`, `@source '../components'`, `vite.config.js`.
- **Строка в `playground/host.css` `@source inline("hidden mx-auto w-12");`** появляется в задаче 1 и остаётся навсегда.
- **Проверки:** `npm test` целиком зелёный и без диагностик; `npm run build` без строк с `warn` (без учёта регистра). Диагностики тестов проверяются только так: `npm test -- --reporter=verbose` и поиск `[Vue warn]`, `stderr |`, `(node:<pid>)`, `Warning: `, `Unhandled` — стандартный репортер vitest 5 вывод `console` из успешных тестов не печатает (проверено), а поиск по словам `warn`/`error` ловит имена тестов вроде `ErrorMessages`.
- **Рабочий каталог вне репозиториев:** `P=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/utility-prefix`. Снимки, замеры и одноразовые скрипты — там, в коммиты не входят.
- **Файлы из Chrome DevTools MCP** (`take_screenshot`/`evaluate_script` с `filePath`) пишутся только внутрь дерева `/Users/boobooking/Code/mars/cashback` — писать в `/Users/boobooking/Code/mars/cashback/.superpowers/tmp-shots/` (каталог в `.gitignore`) и сразу переносить `mv` в `$P/…`; в конце задачи `tmp-shots` удалить.
- **Вкладки браузера:** страницы `1` (certificates.test) и `10` (payments.test) — не наши, не трогать. Playground открывать в своей вкладке с `isolatedContext: "playground"`. Вкладка `8` (`isolatedContext: "acceptance"`) — вход в дашборд cashback, её использовать в задаче 4 и не закрывать.
- **cashback** (`/Users/boobooking/Code/mars/cashback`, ветка `feature/dashboard-ui-components`) содержит **незакоммиченные правки** переезда — не трогать ни их, ни индекс, ни ветку. В cashback разрешено только в задаче 4: `npm install <tarball> --no-save` и `npm run build`; возвращает всё `$P/cashback/restore.sh` (`npm ci`, `npm run build`, сверка HEAD, `git status`, `git diff --binary` и `git diff --cached --binary` с сохранёнными до установки) — **обязательно и после любой ошибки или прерванной проверки**. Модалку отправки письма на `Services` только открывать и отменять — подтверждение шлёт настоящее письмо через Mindbox.
- **zsh:** массива `PIPESTATUS` нет — код возврата брать как `out=$(cmd 2>&1); rc=$?`; разделитель в `echo` — `"-----"` в кавычках.

## Review Focus

1. **Токен без префикса** — стиль молча пропадает в голом приложении и может подмениться классом приложения. Проверка — AST-тест, задача 2, шаги 1–2 и 6.
2. **Классы переходов** (`*-class` у `<transition>` в `Popup` и `Modal`) — без префикса анимация пропадает, а снимки её не видят (переход короче снимка). Проверка — тот же тест покрывает `*-class`; задача 2, шаг 6 (список файлов `Popup.vue` и `Modal.vue` в отчёте теста).
3. **Переименованный токен темы** `--container-phone` → `--bb-container-phone`: ширина поля телефона должна остаться `calc(19ch + 16px)`. Проверка — замер `phone` в задаче 4, шаг 3.
4. **Классы приложения на корне компонента** по-прежнему побеждают: крестик в cashback позиционируется классами страницы (`absolute right-0 top-0 w-8 h-8 mr-4 mt-4`). Проверка — задача 4, шаг 7.
5. **В сборку не попали утилиты без префикса** — иначе столкновения вернутся. Проверка — задача 2, шаг 8.

## File Structure

| Задача | Файлы | Ответственность |
|---|---|---|
| 1 | `playground/host.css`, `vite.playground.config.js` | честное окружение потребителя и статическая сборка обеих страниц |
| 2 | `tests/utilityPrefix.test.js` (новый), `src/styles/index.css`, `src/components/**/*.vue` (22 файла) | префикс в стилях и разметке, тест на пропуск |
| 3 | `README.md` | описание префикса, правило для разметки, заметка об именах классов |
| 4 | — | приёмка «после» в playground и в cashback |
| 5 | `package.json`, `package-lock.json` | версия `0.7.0` |

---

### Task 1: Честный playground и снимки «до»

**Files:**
- Modify: `playground/host.css`
- Modify: `vite.playground.config.js`
- Создаются: `$P/before/*` (вне репозитория)

**Interfaces:**
- Consumes: код `0.6.0` (HEAD ветки после спеки)
- Produces: `$P/before/<ID>.png|json` для всех ID из шага 5; `$P/serve.sh` для отдачи playground; скрипты `$P/wait.js`, `$P/measure.js`

- [ ] **Step 1: `playground/host.css`**

Файл целиком, было:

```css
@import 'tailwindcss';
@plugin '@tailwindcss/forms';
```

стало:

```css
/*
 * Окружение потребителя: Tailwind приложения не видит исходников пакета и
 * генерирует только то, что встречается в разметке самого приложения.
 */
@import 'tailwindcss' source(none);
@source './*.{vue,html}';

/*
 * Базовые утилиты, которые у потребителя есть для его разметки, а их sm:-пар
 * нет. Утилиты пакета не должны зависеть от того, генерирует ли их приложение.
 */
@source inline("hidden mx-auto w-12");

@plugin '@tailwindcss/forms';
```

- [ ] **Step 2: `vite.playground.config.js`**

Файл целиком, стало:

```js
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    root: 'playground',
    plugins: [vue(), tailwindcss()],
    build: {
        rollupOptions: {
            // Обе страницы: статическую сборку playground отдают браузеру для
            // приёмки, и без входа страница хоста в неё не попадает.
            input: {
                index: fileURLToPath(new URL('./playground/index.html', import.meta.url)),
                host: fileURLToPath(new URL('./playground/host.html', import.meta.url)),
            },
        },
    },
})
```

- [ ] **Step 3: Собрать пакет и playground, проверить хост**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
out=$(npm run build 2>&1); rc=$?
test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка пакета"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения"; echo "$out" | grep -i warn; exit 1; }
rm -rf playground/dist
out=$(npx vite build --config vite.playground.config.js 2>&1); rc=$?
test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка playground"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения playground"; echo "$out" | grep -i warn; exit 1; }
ls playground/dist/index.html playground/dist/host.html || { echo "ПРОВАЛ: нет одной из страниц"; exit 1; }
python3 - <<'EOF'
import glob, re
# Конфликт на уровне CSS: базовый класс хоста стоит ПОСЛЕ вариантного класса пакета.
pairs = [('.hidden', '.sm\\:inline-block'), ('.mx-auto', '.sm\\:mx-0'), ('.w-12', '.sm\\:w-10')]
for f in sorted(glob.glob('playground/dist/assets/*.css')):
    s = open(f).read()
    last = lambda sel: max((m.start() for m in re.finditer(re.escape(sel) + r'\{', s)), default=-1)
    first = lambda sel: min((m.start() for m in re.finditer(re.escape(sel) + r'\{', s)), default=-1)
    print(f, [(b, v, 'конфликт' if first(v) >= 0 and last(b) > first(v) else 'нет') for b, v in pairs])
EOF
```

Expected: обе страницы собраны; у CSS страницы хоста все три пары — `конфликт` (хост сгенерировал базовый класс после вариантного класса пакета), у CSS голой страницы — `нет`. Если CSS у страниц общий или конфликт не виден — записать вывод в отчёт как есть: решающая проверка — снимки шага 6. Записать вывод в отчёт.

- [ ] **Step 4: Коммит**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
git add playground/host.css vite.playground.config.js
git commit -m "chore: сделать окружение хоста в playground честным"
```

- [ ] **Step 5: Скрипты приёмки и сервер**

```bash
P=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/utility-prefix
mkdir -p "$P/before" "$P/after" "$P/cashback"
cat > "$P/serve.sh" <<'EOF'
#!/bin/zsh
# Отдаёт playground/dist на 0.0.0.0:8765; браузер MCP открывает http://host.docker.internal:8765
pkill -f "http.server 8765" 2>/dev/null
cd /Users/boobooking/Code/dashboard-ui-components/playground/dist || exit 1
nohup python3 -m http.server 8765 --bind 0.0.0.0 >/dev/null 2>&1 &
sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8765/host.html
EOF
chmod +x "$P/serve.sh" && "$P/serve.sh"
```

Expected: `200`.

Скрипт ожидания (`$P/wait.js`, выполнять через `evaluate_script`, результат должен быть `0`):

```js
async () => {
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const running = () => document.getAnimations().filter(
        (a) => a.playState === "running" && a.effect?.getComputedTiming().iterations !== Infinity
    );
    await frame();
    await frame();
    for (let i = 0; i < 20 && running().length > 0; i++) {
        await Promise.all(running().map((a) => a.finished.catch(() => null)));
        await frame();
    }
    return running().length;
}
```

Скрипт замеров (`$P/measure.js`):

```js
() => {
    const rect = (el) => {
        if (!el || el.getClientRects().length === 0) return null;
        const b = el.getBoundingClientRect();
        return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    };
    const dialog = [...document.querySelectorAll('[role="dialog"]')].find((d) => d.getClientRects().length > 0) ?? null;
    // У ConfirmationModal первый svg в панели — иконка, его родитель — кружок иконки.
    const icon = dialog?.querySelector("svg")?.parentElement ?? null;
    const menus = [...document.querySelectorAll('[role="menu"], .bb-dashboard-ui ul')].filter((m) => m.getClientRects().length > 0);
    return {
        viewport: { w: innerWidth, h: innerHeight },
        dialog: rect(dialog),
        icon: rect(icon),
        phone: rect(document.querySelector('input[type="tel"]')),
        openMenus: menus.map(rect),
    };
}
```

Скопировать оба скрипта в `$P/wait.js` и `$P/measure.js` дословно.

- [ ] **Step 6: Снимки «до»**

Браузер: `new_page` с `url: "http://host.docker.internal:8765/"`, `isolatedContext: "playground"`. Для каждой страницы `S` из `bare` (`/`) и `host` (`/host.html`) и каждой ширины `W` из `1440` (окно 1440×900) и `375` (окно 375×812, `resize_page`) снять состояния:

| Состояние | Действие перед снимком | Снимок | После снимка |
|---|---|---|---|
| `page` | — | `take_screenshot` с `fullPage: true` | — |
| `popup` | секция «Popup», кнопка «Открыть меню» | вьюпорт | Escape |
| `dropdown` | секция «DropdownButtonWithAction», стрелка первой кнопки с действиями | вьюпорт | Escape |
| `select` | секция «SelectSingle», клик по полю | вьюпорт | Escape |
| `calendar` | секция «PickDay», клик по полю | вьюпорт | Escape |
| `modal` | секция «Modal», «Открыть» | вьюпорт | «Закрыть» |
| `warning` | секция «ConfirmationModal», «Жёлтая» | вьюпорт | кнопка отмены в модалке |
| `danger` | секция «ConfirmationModal», «Красная» | вьюпорт | кнопка отмены в модалке |

ID снимка — `<S>-<W>-<состояние>`, всего 32. Для каждого: `navigate_page` на страницу (чистое состояние), `resize_page`, действие (`take_snapshot` → `click` по `uid`), `$P/wait.js` → `0`, `take_screenshot` в `…/cashback/.superpowers/tmp-shots/<ID>.png`, `$P/measure.js` в `…/tmp-shots/<ID>.json`, `mv` в `$P/before/`, действие «после снимка».

Ожидается и записывается в `$P/before/notes.md`:

- `bare-1440-warning` и `bare-1440-danger`: панель по центру по вертикали (`|dialog.y − (900 − dialog.h)/2| ≤ 2`), `icon.w = 40`, кружок у левого края панели (`icon.x < dialog.x + dialog.w/2 − icon.w`);
- `host-1440-warning` и `host-1440-danger`: панель **не** по центру (прижата к верху), `icon.w = 48`, кружок по центру панели — ошибка воспроизведена. Если воспроизвести не удалось — остановиться и доложить: без этого исправление нечем проверить;
- `host-1440-modal` против `bare-1440-modal`: у `host` панель не по центру;
- на `375` обе страницы совпадают (узкий экран `sm:` не использует);
- любые другие различия `bare` и `host` перечислить в `notes.md` — это тоже столкновения, которые исправление должно убрать.

---

### Task 2: Префикс в стилях и разметке

**Files:**
- Create: `tests/utilityPrefix.test.js`
- Modify: `src/styles/index.css` (строка импорта темы)
- Modify: все 22 файла `src/components/**/*.vue` (только значения классов)
- Одноразовый скрипт: `$P/prefix-codemod.mjs` (вне репозитория)

**Interfaces:**
- Consumes: ничего из задачи 1
- Produces: компоненты с классами `bb:*`; `dist/style.css` только с утилитами `.bb\:*`; тест `tests/utilityPrefix.test.js`

- [ ] **Step 1: Тест**

`tests/utilityPrefix.test.js`:

```js
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { babelParse, parse } from 'vue/compiler-sfc'

// Утилиты пакета собраны с префиксом bb (src/styles/index.css). Класс без
// префикса Tailwind пакета не сгенерирует: в голом приложении стиль молча
// пропадёт, а в приложении с Tailwind его подменит одноимённый класс
// приложения. Тест проверяет каждый класс в разметке каждого компонента.

const componentsDir = fileURLToPath(new URL('../src/components', import.meta.url))

// Типы узлов AST шаблона из @vue/compiler-core.
const ELEMENT = 1
const ATTRIBUTE = 6
const DIRECTIVE = 7

function vueFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) return vueFiles(full)
        return entry.name.endsWith('.vue') ? [full] : []
    })
}

function walk(node, visit) {
    visit(node)
    for (const child of node.children ?? []) walk(child, visit)
}

// Классы в :class записываются литералами: ключи объекта, ветки тернарного
// оператора, элементы массива, строка. Условия — не классы, их не трогаем.
// Любая другая форма не проверяется статически, поэтому запрещена.
function classLiterals(node) {
    switch (node.type) {
        case 'ObjectExpression':
            return node.properties.map((property) => {
                if (property.type !== 'ObjectProperty' || property.key.type !== 'StringLiteral') {
                    throw new Error(`ключ в :class должен быть строковым литералом, а не ${property.key?.type ?? property.type}`)
                }
                return property.key.value
            })
        case 'ConditionalExpression':
            return [...classLiterals(node.consequent), ...classLiterals(node.alternate)]
        case 'ArrayExpression':
            return node.elements.flatMap(classLiterals)
        case 'StringLiteral':
            return [node.value]
        default:
            throw new Error(`форма ${node.type} в :class не проверяется — запишите классы литералами`)
    }
}

function classTokens(source) {
    const { descriptor, errors } = parse(source)
    if (errors.length > 0) throw errors[0]

    const tokens = []
    walk(descriptor.template.ast, (node) => {
        if (node.type !== ELEMENT) return

        for (const prop of node.props) {
            // class и пропсы <transition> вида enter-active-class
            if (prop.type === ATTRIBUTE && (prop.name === 'class' || prop.name.endsWith('-class')) && prop.value) {
                tokens.push(...prop.value.content.split(/\s+/))
            }

            if (prop.type === DIRECTIVE && prop.name === 'bind' && prop.arg?.content === 'class') {
                const expression = babelParse(`(${prop.exp.content})`).program.body[0].expression
                tokens.push(...classLiterals(expression).flatMap((literal) => literal.split(/\s+/)))
            }
        }
    })

    return tokens.filter(Boolean)
}

const files = vueFiles(componentsDir)

describe('префикс bb у утилит в разметке компонентов', () => {
    it('компоненты найдены', () => {
        expect(files.length).toBeGreaterThan(0)
    })

    for (const file of files) {
        it(path.relative(componentsDir, file), () => {
            const unprefixed = classTokens(fs.readFileSync(file, 'utf8'))
                .filter((token) => token !== 'bb-dashboard-ui' && !token.startsWith('bb:'))

            expect(unprefixed).toEqual([])
        })
    }
})
```

- [ ] **Step 2: Тест падает**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
npx vitest run tests/utilityPrefix.test.js 2>&1 | tail -30
```

Expected: `компоненты найдены` проходит; тесты файлов с классами падают, в `expected [] got [...]` — токены без префикса (например, у `Dot.vue` — `flex`, `h-full`, `text-red-500`…). Ни один тест не падает с исключением «форма … не проверяется» — все нынешние `:class` литеральные. Записать число упавших файлов.

- [ ] **Step 3: Скрипт замены**

`$P/prefix-codemod.mjs` — одноразовый, в репозиторий не входит. Меняет только значения классов по точным смещениям AST, пробелы и переносы внутри значений сохраняет:

```js
// Запуск из корня пакета: node $P/prefix-codemod.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const require = createRequire(path.resolve('package.json'))
const { babelParse, parse } = require('vue/compiler-sfc')

const prefix = (token) => (token === 'bb-dashboard-ui' || token.startsWith('bb:') ? token : `bb:${token}`)
const prefixAll = (text) => text.replace(/\S+/g, prefix)

function vueFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) return vueFiles(full)
        return entry.name.endsWith('.vue') ? [full] : []
    })
}

function walk(node, visit) {
    visit(node)
    for (const child of node.children ?? []) walk(child, visit)
}

// Узлы-литералы с классами в выражении :class — те же формы, что в тесте.
function literalNodes(node) {
    switch (node.type) {
        case 'ObjectExpression':
            return node.properties.map((property) => {
                if (property.key.type !== 'StringLiteral') throw new Error(`ключ ${property.key.type}`)
                return property.key
            })
        case 'ConditionalExpression':
            return [...literalNodes(node.consequent), ...literalNodes(node.alternate)]
        case 'ArrayExpression':
            return node.elements.flatMap(literalNodes)
        case 'StringLiteral':
            return [node]
        default:
            throw new Error(`форма ${node.type}`)
    }
}

let changedFiles = 0
let edited = 0
for (const file of vueFiles('src/components')) {
    const source = fs.readFileSync(file, 'utf8')
    const { descriptor } = parse(source)
    const edits = []

    walk(descriptor.template.ast, (node) => {
        if (node.type !== 1) return
        for (const prop of node.props) {
            if (prop.type === 6 && (prop.name === 'class' || prop.name.endsWith('-class')) && prop.value) {
                // loc значения атрибута включает кавычки
                const { start, end } = prop.value.loc
                const quote = source[start.offset]
                if ((quote !== '"' && quote !== "'") || source[end.offset - 1] !== quote) {
                    throw new Error(`${file}: значение ${prop.name} без кавычек`)
                }
                edits.push({ from: start.offset + 1, to: end.offset - 1 })
            }
            if (prop.type === 7 && prop.name === 'bind' && prop.arg?.content === 'class') {
                // loc выражения — без кавычек атрибута; литерал в обёрнутой «(…)» строке
                // сдвинут на 1 и включает свои кавычки
                const base = prop.exp.loc.start.offset
                if (source.slice(base, prop.exp.loc.end.offset) !== prop.exp.content) throw new Error(`${file}: смещение :class`)
                const expression = babelParse(`(${prop.exp.content})`).program.body[0].expression
                for (const literal of literalNodes(expression)) {
                    edits.push({ from: base + literal.start - 1 + 1, to: base + literal.end - 1 - 1 })
                }
            }
        }
    })

    let result = source
    for (const { from, to } of edits.sort((a, b) => b.from - a.from)) {
        result = result.slice(0, from) + prefixAll(result.slice(from, to)) + result.slice(to)
    }
    if (result !== source) {
        fs.writeFileSync(file, result)
        changedFiles++
        edited += edits.length
    }
}
console.log(`файлов изменено: ${changedFiles}, значений: ${edited}`)
```

```bash
cd /Users/boobooking/Code/dashboard-ui-components
P=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/utility-prefix
# (сохранить код выше в $P/prefix-codemod.mjs)
node "$P/prefix-codemod.mjs"
git diff --stat
```

Expected: `значений: 117`; `git diff --stat` — только файлы в `src/components`. Повторный запуск скрипта ничего не меняет (`файлов изменено: 0`) — проверить.

- [ ] **Step 4: Просмотреть дифф разметки**

`git diff src/components` — убедиться глазами на нескольких файлах (`Modal.vue`, `Popup.vue`, `ConfirmationModal.vue`, `SmallBadge.vue`, `ErrorMessages.vue`): изменились только значения `class`, `*-class` и строковые литералы-классы в `:class`; условия (`isDangerous`, `!$slots.actions`), пропсы и логика не тронуты; `bb-dashboard-ui` без префикса; многострочные `:class` сохранили переносы.

- [ ] **Step 5: Префикс в стилях**

`src/styles/index.css`, строка импорта темы, было:

```css
@import 'tailwindcss/theme.css' layer(theme);
```

стало:

```css
/*
 * Префикс bb: утилиты пакета — bb:flex, bb:sm:inline-block, переменные темы —
 * --bb-*. Tailwind приложения таких классов не генерирует, поэтому
 * одноимённых правил у пакета и приложения нет, и порядок подключения стилей
 * на вид компонентов не влияет. Каждый класс в разметке компонентов пишется
 * с префиксом; пропуск ловит tests/utilityPrefix.test.js.
 */
@import 'tailwindcss/theme.css' layer(theme) prefix(bb);
```

Остальное в файле — без изменений, в том числе `@theme { --container-phone: … }`: Tailwind выпустит его как `--bb-container-phone` для `bb:w-phone`.

- [ ] **Step 6: Тесты проходят**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
out=$(npm test -- --reporter=verbose 2>&1); rc=$?
echo "$out" | grep -A30 "utilityPrefix" | head -30
echo "$out" | tail -6
test "$rc" -eq 0 || { echo "ПРОВАЛ: npm test"; exit 1; }
# Диагностики, а не слова в именах тестов: предупреждения Vue, вывод console
# из тестов, предупреждения Node, необработанные ошибки.
noise=$(echo "$out" | grep -E '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled')
test -z "$noise" || { echo "ПРОВАЛ: диагностики в выводе тестов:"; echo "$noise"; exit 1; }
echo "тесты зелёные, диагностик нет"
```

Expected: в `utilityPrefix` проходят все файлы, в списке есть `Popup.vue` и `Modal.vue`; `npm test` зелёный целиком; `тесты зелёные, диагностик нет`.

- [ ] **Step 7: Сборка**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
out=$(npm run build 2>&1); rc=$?
test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения"; echo "$out" | grep -i warn; exit 1; }
echo ok
```

- [ ] **Step 8: Разовая проверка сборки**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
python3 - <<'EOF'
import re
s = open('dist/style.css').read()
start = s.find('@layer utilities')
assert start >= 0, 'нет слоя utilities'
# тело слоя utilities: от открывающей скобки до парной
i = s.index('{', start); depth = 0
for j in range(i, len(s)):
    depth += {'{': 1, '}': -1}.get(s[j], 0)
    if depth == 0: break
body = s[i:j]
# класс в селекторе: после начала, скобки, запятой, точки с запятой или пробела и не с цифры —
# иначе за класс сошли бы числа вида .5rem в значениях
classes = set(re.findall(r'(?:^|[{},;\s])\.((?:\\.|[A-Za-z_-])(?:\\.|[A-Za-z0-9_-])*)', body))
bad = sorted(c for c in classes if not c.startswith('bb\\:'))
print('классов в utilities:', len(classes), 'без префикса:', bad)
theme = s[s.find('@layer theme'):]
theme = theme[:theme.find('}')]
vars_ = set(re.findall(r'(--[A-Za-z0-9-]+)\s*:', theme))
print('переменных темы:', len(vars_), 'без --bb-:', sorted(v for v in vars_ if not v.startswith('--bb-')))
EOF
```

Expected: `без префикса: []` и `без --bb-: []`. Если в списках что-то есть — остановиться и доложить.

- [ ] **Step 9: Commit**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
git add tests/utilityPrefix.test.js src/styles/index.css src/components
git commit -m "fix: собрать утилиты пакета с префиксом bb"
```

---

### Task 3: README

**Files:**
- Modify: `README.md` — раздел «Правила API пакета» и первый абзац раздела «Ограничение»

**Interfaces:**
- Consumes: префикс из задачи 2
- Produces: документация

- [ ] **Step 1: «Правила API пакета»**

В конец списка раздела добавить пункт:

```markdown
- Каждая утилита в разметке компонента пишется с префиксом `bb:` — в
  `class`, в `:class` и в пропсах `*-class` у `<transition>`; варианты идут
  после префикса: `bb:sm:inline-block`, `bb:hover:bg-red-700`. Утилита без
  префикса не сгенерируется. Классы в `:class` пишутся литералами — ключами
  объекта, ветками тернарного оператора, элементами массива. Оба правила
  проверяет `tests/utilityPrefix.test.js`.
```

- [ ] **Step 2: «Ограничение», первый абзац**

Было:

```markdown
Пакет отдаёт скомпилированные утилиты Tailwind — те же имена классов, что
генерирует Tailwind приложения. При стоковой палитре правила совпадают. Если
приложение переопределит стоковый цвет, одноимённые правила столкнутся и
победит подключённое позже, то есть компоненты возьмут палитру приложения.
```

стало:

```markdown
Утилиты пакета собраны с префиксом `bb`: классы внутри компонентов — вида
`bb:flex` и `bb:sm:inline-block`, переменные темы — `--bb-*`. Tailwind
приложения таких классов не генерирует, поэтому одноимённых правил у пакета и
приложения нет: вид компонентов не зависит ни от того, какие утилиты
генерирует приложение, ни от его палитры. Общими остаются только служебные
переменные Tailwind `--tw-*` с их `@property` — на одной версии Tailwind у
пакета и приложения они объявлены одинаково.

Порядок «стили пакета до стилей приложения» по-прежнему нужен: классы,
которые приложение передаёт на корень компонента, — его собственные
утилиты, и при одинаковом свойстве они побеждают, потому что подключены
позже.

С версии 0.7.0 классы внутри компонентов — `bb:*`. Если приложение
обращалось к внутренностям компонентов по классам в своём CSS или тестах,
такие обращения перестанут находить элементы: внутренние классы в контракт
пакета не входят.
```

- [ ] **Step 3: Commit**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
git add README.md
git commit -m "docs: описать префикс утилит в README"
```

---

### Task 4: Приёмка «после»

Коммита нет.

**Files:** не меняются. Создаются `$P/after/*`, `$P/cashback/*`.

**Interfaces:**
- Consumes: `$P/before/*`, `$P/serve.sh`, `$P/wait.js`, `$P/measure.js` из задачи 1; код задач 2–3
- Produces: `$P/after/verdict.md`, `$P/cashback/verdict.md`

- [ ] **Step 1: Собрать и отдать playground**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
rm -rf playground/dist
out=$(npx vite build --config vite.playground.config.js 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ"; echo "$out"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения"; exit 1; }
/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/utility-prefix/serve.sh
```

Expected: `200`.

- [ ] **Step 2: Снимки «после»**

Те же 32 ID и та же процедура, что в задаче 1, шаг 6, — в `$P/after/`.

- [ ] **Step 3: Сверка**

Для каждого ID сравнить JSON и PNG (`Read` парами):

- `bare-*` «после» совпадает с `bare-*` «до» — префикс значений стилей не меняет;
- `host-*` «после» совпадает с `bare-*` «после»: на `1440` в `warning`, `danger`, `modal` панель по центру (`|dialog.y − (900 − dialog.h)/2| ≤ 2`), в `warning`/`danger` `icon.w = 40` и кружок у левого края панели;
- `phone.w` на всех `page`-снимках равен `phone.w` в `bare-*` «до» — токен `--bb-container-phone` работает;
- всё, что в `$P/before/notes.md` записано как различие `bare`/`host`, исчезло.

Итог — в `$P/after/verdict.md`, по строке на ID. Любое расхождение сверх этого — остановиться и доложить.

Затем остановить сервер: `pkill -f "http.server 8765"`.

- [ ] **Step 4: Состояние cashback и скрипт восстановления**

Всё, что задача меняет в cashback, отменяет `$P/cashback/restore.sh`. **Правило: если любой из шагов 5–7 упал, приёмка нашла расхождение или работу приходится прервать — сначала `restore.sh`, потом доклад.** Скрипт можно запускать сколько угодно раз.

`git status` не доказывает сохранность содержимого: уже изменённый файл остаётся `M`, даже если его поменять ещё раз. Поэтому сохраняются и сравниваются сами диффы рабочего дерева и индекса.

```bash
cd /Users/boobooking/Code/mars/cashback
P=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/utility-prefix
mkdir -p "$P/cashback"
git rev-parse HEAD > "$P/cashback/head-before.txt"
git status --porcelain > "$P/cashback/status-before.txt"
git diff --binary > "$P/cashback/diff-before.patch"
git diff --cached --binary > "$P/cashback/diff-cached-before.patch"
cat > "$P/cashback/restore.sh" <<'EOF'
#!/bin/zsh
# Возвращает node_modules и сборку cashback к lock-файлу и сверяет, что HEAD,
# индекс и рабочее дерево cashback не изменились. Код 0 — всё как было.
P=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/utility-prefix
cd /Users/boobooking/Code/mars/cashback || exit 1
fail=0
out=$(npm ci 2>&1); rc=$?
[ "$rc" -eq 0 ] || { echo "ПРОВАЛ: npm ci"; echo "$out" | tail -20; fail=1; }
out=$(npm run build 2>&1); rc=$?
[ "$rc" -eq 0 ] || { echo "ПРОВАЛ: сборка cashback"; echo "$out" | tail -20; fail=1; }
n=$(grep -c 'bb\\:' node_modules/@boobooking/dashboard-ui-components/dist/style.css)
[ "$n" -eq 0 ] || { echo "ПРОВАЛ: в node_modules остался пакет с префиксом"; fail=1; }
[ "$(git rev-parse HEAD)" = "$(cat "$P/cashback/head-before.txt")" ] || { echo "ПРОВАЛ: HEAD изменился"; fail=1; }
git status --porcelain | cmp -s - "$P/cashback/status-before.txt" || { echo "ПРОВАЛ: git status изменился"; fail=1; }
git diff --binary | cmp -s - "$P/cashback/diff-before.patch" || { echo "ПРОВАЛ: содержимое рабочего дерева изменилось"; fail=1; }
git diff --cached --binary | cmp -s - "$P/cashback/diff-cached-before.patch" || { echo "ПРОВАЛ: содержимое индекса изменилось"; fail=1; }
rm -rf /Users/boobooking/Code/mars/cashback/.superpowers/tmp-shots
[ "$fail" -eq 0 ] && echo "cashback как был: HEAD, индекс, рабочее дерево, node_modules"
exit $fail
EOF
chmod +x "$P/cashback/restore.sh"
wc -c "$P/cashback/diff-before.patch" "$P/cashback/diff-cached-before.patch"
```

Expected: оба патча непустые — в cashback лежат незакоммиченные правки переезда (изменения в рабочем дереве и удаления в индексе). Сейчас установленная версия пакета совпадает с lock-файлом (`0.5.0`), поэтому `npm ci` возвращает ровно то, что было.

- [ ] **Step 5: Tarball в cashback**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
P=/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/utility-prefix
tgz=$(npm pack --pack-destination "$P/cashback" 2>/dev/null | tail -1)
# до установки в cashback ещё ничего не менялось — восстанавливать нечего
test -n "$tgz" && test -f "$P/cashback/$tgz" || { echo "ПРОВАЛ: npm pack"; exit 1; }
cd /Users/boobooking/Code/mars/cashback
out=$(npm install "$P/cashback/$tgz" --no-save 2>&1); rc=$?
test "$rc" -eq 0 || { echo "ПРОВАЛ: установка tarball"; echo "$out"; "$P/cashback/restore.sh"; exit 1; }
n=$(grep -c 'bb\\:' node_modules/@boobooking/dashboard-ui-components/dist/style.css)
test "$n" -gt 0 || { echo "ПРОВАЛ: установлен не тот пакет"; "$P/cashback/restore.sh"; exit 1; }
out=$(npm run build 2>&1); rc=$?
test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка cashback"; echo "$out"; "$P/cashback/restore.sh"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения cashback"; echo "$out" | grep -i warn; "$P/cashback/restore.sh"; exit 1; }
echo "установлен $tgz, cashback собран"
```

Expected: имя tarball (версия в нём ещё `0.6.0` — поднимается в задаче 5, на проверку не влияет) и `установлен …, cashback собран`.

- [ ] **Step 6: Модалки в cashback**

Во вкладке `8` (`acceptance`, вход выполнен), окно 1440×900:

1. `https://cashback.test/dashboard/users`: меню действий строки `acceptance-login@cashback.test` → «Удалить» → модалка. `$P/wait.js` → `0`, снимок `$P/cashback/users-modal.png`, `$P/measure.js` → `$P/cashback/users-modal.json`. «Отмена».
2. `https://cashback.test/dashboard/services`: «Отправить письмо» в первой строке → модалка. Ожидание, снимок `services-modal.png`, замер `services-modal.json`. **«Отмена» — не подтверждать.**

Expected в обоих: панель по центру (`|dialog.y − (900 − dialog.h)/2| ≤ 2`), `icon.w = 40`, кружок у левого края панели.

- [ ] **Step 7: Остальное в cashback не сдвинулось**

Сравнить с эталоном приёмки переезда `/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/ui-migration/step2/` (снимки cashback на пакете `0.5.0` при тех же незакоммиченных правках):

- `https://cashback.test/dashboard/cashbacks` — бейджи (счётчик, бейдж скачивания) на месте и того же вида, что `step2/cashbacks-empty.png`;
- `DISCONTO_PAYMENT_PATH` из `/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/ui-migration/urls.env` — прямоугольник крестика (кнопка `w-8` с путём `M6 18L18 6M6 6l12 12`, см. замер) совпадает с `closer` в `step2/disconto-payment.json`: классы страницы на корне `Closer` побеждают;
- `https://cashback.test/dashboard/login` во вкладке `7` (`anon`) с неверным паролем — жёлтая плашка того же вида, что `step2/login-error.png`;
- меню пользователя в шапке `/dashboard/cashbacks` открывается справа, как в `step2/header-menu-open.png`.

Итог — `$P/cashback/verdict.md`.

- [ ] **Step 8: Вернуть cashback**

Выполняется всегда — и после успешной приёмки, и после любой ошибки в шагах 5–7.

```bash
/private/tmp/claude-501/-Users-boobooking-Code-mars-cashback/96aaa04e-b2cd-499b-8520-007f57ee01e6/scratchpad/utility-prefix/cashback/restore.sh; echo "rc=$?"
```

Expected: `cashback как был: HEAD, индекс, рабочее дерево, node_modules` и `rc=0`. Любой `ПРОВАЛ` — остановиться и доложить с выводом скрипта, ничего в cashback не править вручную.

---

### Task 5: Версия 0.7.0

**Files:**
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Consumes: всё предыдущее
- Produces: версионный коммит, на который владелец поставит тег

- [ ] **Step 1: Поднять версию**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
npm version 0.7.0 --no-git-tag-version
grep -n '"version": "0.7.0"' package.json package-lock.json
```

Expected: `package.json` и два места в `package-lock.json` (корень и `packages[""]`).

- [ ] **Step 2: Тесты и сборка**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
out=$(npm test -- --reporter=verbose 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: npm test"; echo "$out" | tail -20; exit 1; }
noise=$(echo "$out" | grep -E '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled')
test -z "$noise" || { echo "ПРОВАЛ: диагностики в выводе тестов:"; echo "$noise"; exit 1; }
out=$(npm run build 2>&1); rc=$?; test "$rc" -eq 0 || { echo "ПРОВАЛ: сборка"; exit 1; }
test "$(echo "$out" | grep -ic warn)" -eq 0 || { echo "ПРОВАЛ: предупреждения"; exit 1; }
echo ok
```

- [ ] **Step 3: Commit**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
git add package.json package-lock.json
git commit -m "chore: поднять версию пакета до 0.7.0"
```

- [ ] **Step 4: Остановиться и доложить**

Не ставить тег, не пушить, не публиковать. Доложить владельцу: коммиты ветки `feature/utility-prefix` (`git log --oneline main..HEAD`), итоги задач 1 и 4 (воспроизведение «до», совпадение «после», модалки в cashback). Тег `v0.7.0`, вливание в `main` и пуш — по его команде.

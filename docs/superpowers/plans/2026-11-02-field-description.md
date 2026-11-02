# Описание поля формы — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** проп и слот `description` у десяти полей форм, вид описания — в одном приватном компоненте `FieldDescription`, поле связано с описанием через `aria-describedby`.

**Architecture:**
- `FieldDescription.vue` рисует описание, больше классов вида нигде нет.
- Миксин `withFieldDescription` даёт проп и метод `descriptionId(id)`: `id` описания или `null`.
- Ядра получают проп `describedBy` рядом с `labelledBy`.

**Tech Stack:** Vue 3.5 (Options API), vitest + happy-dom, Playwright 1.63 (Chromium, WebKit), Tailwind 4 с префиксом `bb`.

**Spec:** `docs/superpowers/specs/2026-11-02-field-description-design.md`.

## Global Constraints

- **Ветка:** `feat/field-description`, основная рабочая копия. Версия, тег, слияние и публикация — только по слову владельца.
- **Вид:** отступ от поля 4 px, 12 px, высота строки 16 px, обычное начертание, `gray-500`. Вид один при любом состоянии поля.
- **Поля:** `FormInput`, `SelectSingleForm`, `SelectCurrencyForm`, `SelectMultipleForm`, `SelectDateForm`, `SelectDateIntervalForm`, `AmountForm`, `AmountIntervalForm`, `SelectSingleCards`, `SelectMultipleList`.
- **Код:** классы литералами с префиксом `bb:`; комментарии по-русски и без истории изменений; существующие комментарии не удалять, если они не стали ложными; новых экспортов нет.
- **Коммиты:** conventional commits по-русски, без `--no-verify`.
- **Отклонения:** если план или спеку нельзя выполнить как написано — остановиться и сообщить об отклонении с доказательством; план не менять.
- **Проверка:** набор пакета — `npx vitest run --dir tests`, вывод чистый.

## Review Focus

1. Слот у `SelectCurrencyForm` появляется и исчезает по условию страницы: описание следует за ним, пустого блока нет. Тест — Task 3.
2. `FormInput` со своим `id` страницы: описание и `aria-describedby` используют его, смена `id` не рвёт связь. Тест — Task 1.
3. Два экземпляра поля на странице: `id` описаний разные. Тест — Task 3.
4. Серверная отрисовка слота: разметка совпадает при гидрации. Тест — Task 3, фикстуры SSR.
5. Подпись длинным словом без пробелов не раздвигает форму. Тест — Task 4.

---

### Task 1: FieldDescription, миксин и FormInput

**Files:**
- Create: `src/components/FieldDescription.vue`, `src/fieldDescription.js`, `tests/fieldDescription.test.js`
- Modify: `src/components/FormInput.vue`

**Interfaces:**
- Produces:
  - `FieldDescription`: без пропсов, `id` — обычный атрибут на корне, слот по умолчанию;
  - `withFieldDescription`: проп `description: String`, по умолчанию `null`; метод `hasDescription(): boolean`; метод `descriptionId(id: string): string | null`, значение `` `${id}-description` `` при наличии описания.

- [ ] **Step 1: Написать падающие тесты**

В `tests/fieldDescription.test.js` таблица `fields` из одной строки `FormInput`, Task 3 дополнит её:

```js
const fields = [
    { name: 'FormInput', component: FormInput, props: { label: 'Имя' }, carrier: (wrapper) => wrapper.find('input') },
]

const descriptionOf = (wrapper) => wrapper.findComponent(FieldDescription)

describe.each(fields)('$name: описание', ({ component, props, carrier }) => {
    const mountField = (options = {}) => mount(component, { attachTo: document.body, ...options, props: { ...props, ...options.props } })

    it('текст пропа под полем, связь через aria-describedby', () => {
        const wrapper = mountField({ props: { description: 'Пояснение' } })
        expect(descriptionOf(wrapper).text()).toBe('Пояснение')
        expect(carrier(wrapper).attributes('aria-describedby')).toBe(descriptionOf(wrapper).attributes('id'))
    })

    it.each([[undefined], [null], ['']])('значение %s — описания и связи нет', (description) => {
        const wrapper = mountField({ props: { description } })
        expect(descriptionOf(wrapper).exists()).toBe(false)
        expect(carrier(wrapper).attributes('aria-describedby')).toBeUndefined()
    })

    it('слот важнее пропа', () => {
        const wrapper = mountField({ props: { description: 'Пропа' }, slots: { description: '<a href="#s">Слот</a>' } })
        expect(descriptionOf(wrapper).get('a').text()).toBe('Слот')
        expect(descriptionOf(wrapper).text()).not.toContain('Пропа')
    })

    it('слот появляется и исчезает по условию страницы', async () => {
        const Page = defineComponent({
            components: { Field: component },
            props: { isShown: Boolean },
            setup: () => ({ fieldProps: props }),
            template: '<Field v-bind="fieldProps"><template v-if="isShown" #description>Слот</template></Field>',
        })
        const wrapper = mount(Page, { attachTo: document.body, props: { isShown: false } })
        expect(descriptionOf(wrapper).exists()).toBe(false)
        await wrapper.setProps({ isShown: true })
        expect(descriptionOf(wrapper).text()).toBe('Слот')
        await wrapper.setProps({ isShown: false })
        expect(descriptionOf(wrapper).exists()).toBe(false)
    })

    it('разметка в пропе выводится как текст', () => {
        const wrapper = mountField({ props: { description: '<b>жирный</b>' } })
        expect(descriptionOf(wrapper).find('b').exists()).toBe(false)
        expect(descriptionOf(wrapper).text()).toBe('<b>жирный</b>')
    })

    it('не строка — предупреждение Vue, описания нет, без ошибок', () => {})

    it('на вызове FieldDescription нет своих классов', () => {
        const wrapper = mountField({ props: { description: 'Пояснение' } })
        expect(descriptionOf(wrapper).vm.$attrs.class).toBeUndefined()
    })

    it('два экземпляра — разные id описаний', () => {})
})

describe('FieldDescription', () => {
    it('вид задан здесь', () => {
        expect(mount(FieldDescription).classes()).toEqual(expect.arrayContaining([
            'bb:mt-1', 'bb:text-xs', 'bb:leading-4', 'bb:font-normal', 'bb:text-gray-500', 'bb:wrap-anywhere',
        ]))
    })
})

describe('FormInput: связь описания', () => {
    it('aria-describedby страницы сохраняется и обновляется', async () => { /* hint-a → hint-b → undefined: на каждом шаге id описания остаётся, значение страницы следует за атрибутом */ })
    it('aria-describedby страницы без описания — только он', () => {})
    it('id страницы: описание строится от него, смена id не рвёт связь', async () => {})
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run --dir tests tests/fieldDescription.test.js`
Expected: FAIL — нет `src/components/FieldDescription.vue`.

- [ ] **Step 3: Реализовать**

`FieldDescription.vue`, один корень:

```vue
<div class="bb:mt-1 bb:text-xs bb:leading-4 bb:font-normal bb:text-gray-500 bb:wrap-anywhere"><slot></slot></div>
```

Проп `id` не объявляется: атрибут ложится на корень сам. Комментарий в `<script>`: вид описания задан только здесь.

`src/fieldDescription.js`:

```js
hasDescription() {
    return this.$slots.description !== undefined || (typeof this.description === 'string' && this.description !== '')
},
descriptionId(id) {
    return this.hasDescription() ? `${id}-description` : null
},
```

Методы, а не вычисляемые свойства: `$slots` не реактивен. `useId()` в миксин не выносится: Vue не вызывает `setup()` миксина.

`FormInput.vue`: миксин; после `<input>` вызов

```vue
<field-description v-if="hasDescription()" :id="descriptionId(inputId())"><slot name="description">{{ description }}</slot></field-description>
```

На `<input>` после `v-bind` — `:aria-describedby="inputDescribedBy()"`; метод соединяет через пробел `$attrs['aria-describedby']` и `descriptionId(inputId())` и возвращает `null`, если обоих нет. Обновить комментарий о подсказках в начале файла, если он стал ложным.

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx vitest run --dir tests tests/fieldDescription.test.js tests/FormInput.test.js tests/utilityPrefix.test.js`
Expected: PASS.

- [ ] **Step 5: Закоммитить**

```bash
git add src tests
git commit -m "feat: добавить описание поля в FormInput"
```

### Task 2: Проп describedBy у ядер

**Files:**
- Modify: `src/components/DropdownButton.vue`, `src/components/SelectSingle.vue`, `src/components/SelectMultiple.vue`, `src/components/SelectDate.vue`, `src/components/AmountInput.vue`
- Test: `tests/SelectSingle.test.js`, `tests/SelectMultiple.test.js`, `tests/SelectDate.test.js`, `tests/AmountInput.test.js`

**Interfaces:**
- Produces: проп `describedBy: String`, по умолчанию `null`, у пяти ядер. Без него атрибута нет.

- [ ] **Step 1: Написать падающие тесты**

- `SelectSingle`, `SelectMultiple`: `describedBy: 'hint'` — на кнопке с `popovertarget` `aria-describedby="hint"`; без пропа атрибута нет.
- `SelectDate`: то же на кнопке и на поле даты; пока календарь открыт, у поля атрибут остаётся.
- `AmountInput`: при `digits: 2` атрибут на обоих `input`, при `digits: 0` — на одном; при `isDisabled: true` атрибут остаётся.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run --dir tests tests/SelectSingle.test.js tests/SelectMultiple.test.js tests/SelectDate.test.js tests/AmountInput.test.js`
Expected: FAIL в новых тестах.

- [ ] **Step 3: Реализовать**

Проп с комментарием рядом с `labelledBy`, `:aria-describedby="describedBy"` на тех же элементах. `SelectSingle` и `SelectMultiple` передают проп в `DropdownButton`. `AmountInput` — на оба `input`.

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: та же команда.
Expected: PASS.

- [ ] **Step 5: Закоммитить**

```bash
git add src tests
git commit -m "feat: передавать describedBy в ядра полей"
```

### Task 3: Остальные девять полей

**Files:**
- Modify: `src/components/SelectSingleForm.vue`, `SelectCurrencyForm.vue`, `SelectMultipleForm.vue`, `SelectDateForm.vue`, `SelectDateIntervalForm.vue`, `AmountForm.vue`, `AmountIntervalForm.vue`, `SelectSingleCards.vue`, `SelectMultipleList.vue`; `tests/ssrFixtures.js`
- Test: `tests/fieldDescription.test.js`

**Interfaces:**
- Consumes: `FieldDescription`, `withFieldDescription` из Task 1, `describedBy` из Task 2.

- [ ] **Step 1: Дополнить таблицу и написать тесты**

В `fields` — девять строк, обязательные пропсы взять из тестов компонента, `carrier`:

| Поле | `carrier` |
| --- | --- |
| `SelectSingleForm`, `SelectCurrencyForm`, `SelectMultipleForm` | `button[popovertarget]` |
| `SelectDateForm` | `button[popovertarget]` |
| `AmountForm` | первый `input` |
| `SelectDateIntervalForm`, `AmountIntervalForm` | `[role="group"]` |
| `SelectSingleCards` | `[role="radiogroup"]` |
| `SelectMultipleList` | `[role="group"]` |

Отдельные тесты:

- `SelectDateForm`: поле даты тоже связано;
- `AmountForm`: `digits` 2 — оба поля суммы связаны, поле кнопки валюты не связано; `digits` 0 — одно поле; заблокированная валюта — связь есть;
- `SelectSingleForm`, `SelectMultipleForm`: `setProps` `items` `[] → items → []`, `SelectCurrencyForm`: `currencies` `[] → ['USD'] → []`: описание остаётся всё время, кнопка со связью появляется и пропадает;
- `SelectSingleCards`, `SelectMultipleList` без пунктов: описание есть, группы нет;
- описание стоит после рамки или группы, а не внутри: у корня оно последний дочерний элемент.

В `tests/ssrFixtures.js`: `SelectSingleForm` с пропом `description`, `SelectDateIntervalForm` со слотом `description`, `AmountForm` с `description`.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run --dir tests tests/fieldDescription.test.js`
Expected: FAIL для девяти новых строк.

- [ ] **Step 3: Реализовать**

Миксин и компонент в каждом поле; вызов из Task 1 — последним дочерним элементом корня, `id` от `labelId`, у `AmountForm` от `inputId`. `aria-describedby` или `:described-by` на носителях из таблицы:

- `SelectSingleForm`, `SelectMultipleForm`, `SelectDateForm`, `AmountForm` — `:described-by="descriptionId(...)"` на ядре;
- интервалы и группы — `:aria-describedby="descriptionId(labelId)"`.

`SelectCurrencyForm` своей разметки описания не имеет: миксин даёт проп, в `SelectSingleForm` уходят `:description="description"` и

```vue
<template v-if="$slots.description" #description><slot name="description"></slot></template>
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx vitest run --dir tests`
Expected: PASS всего набора, вывод чистый.

- [ ] **Step 5: Закоммитить**

```bash
git add src tests
git commit -m "feat: добавить описание остальным полям форм"
```

### Task 4: Playground, браузерные тесты, README

**Files:**
- Create: `e2e/fieldDescription.e2e.js`
- Modify: `playground/App.vue`, `README.md`

**Interfaces:**
- Consumes: `test`, `expect`, `pages`, `openPlayground`, `expectColor` из `e2e/helpers.js`.

- [ ] **Step 1: Дополнить Playground**

Раздел `<h2>Описание поля</h2>`: десять полей с `description`, пятое из них — `SelectCurrencyForm` или любое другое по удобству; плюс `SelectSingleForm` со слотом и ссылкой `<a href="#description-link" class="...">` и `FormInput` с описанием `'W'.repeat(200)`. Поля стоят в ограниченной по ширине `.demo-form`, у групп списки непустые.

- [ ] **Step 2: Написать браузерные тесты**

`e2e/fieldDescription.e2e.js`, цикл по `pages`. `section` — по заголовку, `descriptions` — `section.locator('[id$="-description"]')`.

```js
test('вид и отступ у всех полей', async ({ page }) => {
    await expect(descriptions(page)).toHaveCount(12)
    for (const description of await descriptions(page).all()) {
        await expect(description).toHaveCSS('font-size', '12px')
        await expect(description).toHaveCSS('line-height', '16px')
        await expectColor(description, 'color', 'gray-500')
        const gap = await description.evaluate((node) => node.getBoundingClientRect().top - node.previousElementSibling.getBoundingClientRect().bottom)
        expect(gap).toBeCloseTo(4, 0)
    }
})

test('ссылка в слоте нажимается мышью', async ({ page }) => {
    await section(page).getByRole('link', { name: 'Settings' }).click()
    await expect(page).toHaveURL(/#description-link$/)
})

test('ссылка в слоте нажимается с клавиатуры', async ({ page }) => {
    await section(page).getByRole('link', { name: 'Settings' }).focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#description-link$/)
})

test('длинное слово не шире поля', async ({ page }) => {
    const fits = await longDescription(page).evaluate((node) => node.scrollWidth <= node.clientWidth && node.getBoundingClientRect().right <= node.previousElementSibling.getBoundingClientRect().right + 0.5)
    expect(fits).toBe(true)
})
```

- [ ] **Step 3: Запустить браузерные тесты**

Run: `npm run test:browser -- e2e/fieldDescription.e2e.js`
Expected: все тесты проходят в Chromium и WebKit, `consoleProblems` пуст.

- [ ] **Step 4: Обновить README**

- Раздел «Описание поля» перед `### FormInput` или сразу за ним: проп, слот, пример со ссылкой из раздела 4.1 спеки; слот важнее пропа; условие ставится на шаблон слота; ссылку оформляет страница; вид один у всех полей.
- В таблицу пропов каждого из десяти компонентов — строка `` | `description` | `String` | `null` | Текст под полем, см. «Описание поля» | ``.

- [ ] **Step 5: Запустить всё**

Run: `npx vitest run --dir tests && npm run test:browser`
Expected: всё проходит, вывод чистый.

- [ ] **Step 6: Закоммитить**

```bash
git add playground/App.vue e2e/fieldDescription.e2e.js README.md
git commit -m "docs: показать описание поля в Playground и README"
```

### Task 5: Приёмка

**Files:** нет.

- [ ] **Step 1: Выложить Playground**

Run: `npm run build`, затем `npx vite build --config vite.playground.config.js --outDir ~/Code/mars/certificates/src/public/build/ui-playground --emptyOutDir --base ./`, затем `curl -sk -o /dev/null -w "%{http_code}"` по `index.html` и `host.html`.
Expected: `200` на обе страницы.

- [ ] **Step 2: Принять**

Chrome — исполнитель, Safari — владелец: вид описания у всех полей, ссылка, длинный текст. Версию не поднимать.

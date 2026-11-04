# NavigationHeader — шапка дашборда

Дата: 2026-11-04

## 1. Цель и рамки

Шапку дашборда — белую полосу с пунктами разделов слева и меню профиля справа —
каждый проект держит у себя в `resources/js/Shared/NavigationHeader.vue`. Таких
файлов восемь, и отличаются они в основном пунктами меню. Цель: компонент
пакета `NavigationHeader`, которому страница передаёт пункты, ключ активного
пункта, пункты меню профиля и, по желанию, логотип.

В рамках задачи:

- публичный компонент `NavigationHeader`;
- текст для скринридера в `src/i18n.js`;
- тесты, Playground, README;
- выпуск вместе с `FormTextarea` и общей рамкой поля в `0.25.0` (раздел 9).

Вне рамок:

- перевод проектов на компонент — отдельные задачи в их репозиториях (решение
  автора, раздел 3);
- мобильное меню: дашборды работают на десктопе («Правила API пакета»);
- изменения `NavigationMenuElement` и `HamburgerMenu`: шапка собирается из них
  как есть.

## 2. Что показало исследование

Восемь проектов: certificates, payments, cashback (пакет подключён),
cashback-vetkit-backend, belarus, russia, health-days-backend, overweight
(пакета нет).

- **certificates, payments, cashback** — один и тот же файл на 74–91 строку:
  `<nav class="bg-white shadow-sm">`, внутри `mx-auto px-4 sm:px-6 lg:px-8`,
  строка `flex justify-between h-16`; слева `hidden sm:flex space-x-8` с
  `NavigationMenuElement` (`name`, `:url`, `:is-active`), справа
  `hidden sm:ml-6 sm:flex sm:items-center` с `<hamburger-menu :actions>`. У
  cashback перед пунктами логотип: `shrink-0 flex items-center` с
  `<img class="hidden lg:block h-5 w-auto" src="/dashboard/images/logo-crown.png">`,
  пункты с `ml-8`.
- **belarus, russia, health-days-backend, overweight, cashback-vetkit-backend** —
  те же пункты, но меню профиля и мобильное меню свёрстаны вручную
  (`popup`, кнопка ☰, `mobile-navigation-menu-element`). Логотип Royal Canin у
  всех пяти. Часть пунктов — только для администратора (`v-if="isAdmin"`).
- **Активный пункт** во всех восьми — по `$page.component` Inertia, иногда по
  нескольким страницам: `["Settings/Index", "Settings/Countries",
  "Settings/Calendars"]` в payments, `["Events/Index", "Archive/Index"]` в
  russia и health-days-backend.
- **Тень:** `shadow-sm` — certificates, payments, cashback,
  health-days-backend, cashback-vetkit-backend (пять); `shadow` — belarus,
  russia, overweight (три).
- В пакете есть `NavigationMenuElement` (пункт шапки: ссылка через `navigate`,
  подчёркивание активного, без `aria-current`, атрибуты ложатся на `<a>`),
  `HamburgerMenu` (меню профиля, проп `actions`, `lang`) и `PageTabs` —
  образец API: `tabs: [{ key, name, url }]`, `activeKey`, `<nav aria-label>` с
  текстом из `i18n.js`, проверка массива без падений.
- Пакет не импортирует Inertia: имя страницы и активный пункт знает только
  приложение.

## 3. Решения и их источники

| Решение | Источник |
| --- | --- |
| Универсальный компонент шапки в пакете, имя `NavigationHeader` | владелец (принял предложение) |
| API по образцу `PageTabs`: `items: [{ key, name, url }]`, `activeKey`, `actions` | владелец (принял предложение) |
| Активный пункт вычисляет страница по `$page.component` и передаёт ключом | владелец (принял предложение) |
| Пункты для администратора страница просто не кладёт в массив | владелец (принял предложение) |
| Мобильного меню нет, пункты видны на любой ширине | владелец (принял предложение) |
| Логотип — через слот | владелец |
| Тень — `shadow-sm`, встречается чаще | владелец |
| Работа в ветке `feat/form-textarea`, выпуск `0.25.0` | владелец |
| Перевод проектов — отдельные задачи | автор |
| Отступы шапки — `px-8` без порогов ширины: вид как у проектов на десктопе | автор |
| Активный пункт получает `aria-current="page"` | автор |
| У шапки имя для скринридера из `i18n.js` | автор |

## 4. API

### 4.1. Пример

```vue
<navigation-header :items="items" :active-key="activeKey" :actions="menuActions">
    <template #logo>
        <img src="/dashboard/images/logo-crown.png" alt="Royal Canin" class="h-5 w-auto">
    </template>
</navigation-header>
```

```js
items() {
    return [
        { key: 'orders', name: 'Ордера', url: this.route('orders') },
        { key: 'groups', name: 'Группы', url: this.route('groups') },
        ...(this.isAdmin ? [{ key: 'users', name: 'Пользователи', url: this.route('users') }] : []),
    ];
},
activeKey() {
    const sections = { orders: ['Orders/Index'], groups: ['Groups/Index'], users: ['Users/Index'] };
    return Object.keys(sections).find((key) => sections[key].includes(this.$page.component)) ?? null;
},
```

### 4.2. Пропы и слот

| Что | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `items` | `Array` | `[]` | Пункты разделов `[{ key, name, url }]`, все поля — строки |
| `activeKey` | `String` | `null` | Ключ активного пункта |
| `actions` | `Array` | `[]` | Пункты меню профиля — передаются в `HamburgerMenu` как есть |
| `lang` | `String` | язык плагина | `"ru"` или `"en"`: имя шапки для скринридера и подпись кнопки меню |
| слот `logo` | разметка | — | Логотип слева от пунктов |

- `items` не массив — пунктов нет; элементы, которые не объекты, пропускаются
  (как `tabList` у `PageTabs`). Компонент не падает ни на каком значении.
- Ключ сравнивается с `activeKey` строго. Нет такого ключа или `null` — не
  выделен ни один пункт.
- Без `actions` (или с пустым массивом) кнопки меню нет — так ведёт себя
  `HamburgerMenu`; шапка остаётся той же высоты.
- Без слота `logo` пункты начинаются от левого отступа шапки.
- Событий и `v-model` нет. Переходы — через `navigate` плагина, как у
  `NavigationMenuElement`.
- Атрибуты (`class`, `style`, `data-*`) ложатся на корень `<nav>`.

## 5. Вид и доступность

- Корень `<nav>` с `aria-label` из `i18n.js` («Разделы» / «Sections»), белый
  фон, тень `shadow-sm`, на всю ширину родителя.
- Внутри строка высотой 64px (`h-16`), отступы слева и справа `px-8`; слева
  логотип и пункты, справа меню профиля, по центру по вертикали.
- Слот `logo` — в блоке `shrink-0 flex items-center`; между логотипом и
  первым пунктом 32px. Размер картинки задаёт страница.
- Пункты — `NavigationMenuElement` подряд с промежутком 32px, на всю высоту
  строки (подчёркивание активного — у нижнего края шапки, как сейчас).
  Активный пункт получает `aria-current="page"` (атрибут ложится на `<a>`).
- Пункты в одну строку, без переноса; порогов ширины (`sm:`, `lg:`) нет.
- Фокус пунктов и кнопки меню — как у `NavigationMenuElement` и
  `HamburgerMenu` сейчас.

## 6. SSR

Фикстура в `tests/ssrFixtures.js` — с пунктами, `activeKey`, `actions` и
слотом логотипа; `tests/ssr.test.js`, `tests/hydration.test.js` проходят.
`tests/exports.test.js` — `NavigationHeader` в списке.

## 7. README, Playground, тесты

**README.** Раздел `### NavigationHeader` рядом с `NavigationMenuElement` и
`HamburgerMenu`: пример раздела 4.1 (пункты, вычисление `activeKey` по
`$page.component` с несколькими страницами на раздел, пункт администратора),
таблица пропов, поведение раздела 4.2, вид раздела 5. «Языки» — строка с
именем шапки. Список экспортов и число компонентов в «Playground».

**Playground.** Раздел `NavigationHeader`: шапка с логотипом, четырьмя
пунктами, активным вторым и меню профиля; шапка без логотипа и без меню;
шапка без активного пункта.

**Тесты (Vitest).**

- пункты в порядке массива, ссылки `href` из `url`, подписи из `name`;
- активный по `activeKey`: `NavigationMenuElement` с `isActive`, у его `<a>`
  `aria-current="page"`; у остальных атрибута нет; неизвестный ключ и `null` —
  ни одного активного;
- `items` не массив, `null`, элементы-не-объекты — без ошибок, лишние
  пропущены;
- `actions` уходят в `HamburgerMenu`; без `actions` кнопки нет;
- слот `logo` показан перед пунктами; без слота блока логотипа нет;
- `aria-label` шапки на `ru` и `en`, `lang` доходит до `HamburgerMenu`;
- атрибуты на корне;
- клик по пункту уходит в `navigate` плагина.

**Тесты (Playwright, обе страницы, Chromium и WebKit).** Высота шапки 64px,
белый фон, тень не `none`; активный пункт подчёркнут (`border-bottom-color`
`indigo-400`), у него `aria-current="page"`; кнопка меню справа, правый край
с отступом 32px; логотип слева, первый пункт в 32px от него; на ширине окна
1024px пункты видны и в одну строку.

**Приёмка.** В Chrome — исполнитель, в Safari — владелец, в Playground.

## 8. Принятые риски

- Логотип в слоте: размер и `alt` картинки — забота страницы.
- Восемь пунктов не уместятся в узком окне — шапка не переносит пункты; так
  же ведут себя шапки проектов на десктопе сейчас.

## 9. Выпуск

Ветка `feat/form-textarea`, где уже есть `FormTextarea`, общая рамка поля и
коммит версии `0.25.0` (`320d5b9`). Версия в `package.json` уже `0.25.0`, поэтому
новых коммитов версии нет и историю не переписываем: компонент входит в `0.25.0`,
тег `v0.25.0` ставится на последний коммит ветки. Слияние и тег — по слову
владельца.

## 10. Что остаётся за исполнителем

- Ключи `src/i18n.js`.
- Как именно передать `aria-current` в `NavigationMenuElement` (атрибутом
  через наследование атрибутов — оно у компонента включено).
- Состав демо Playground сверх перечисленного.

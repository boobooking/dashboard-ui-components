# PageTabs и отказ от мобильных вариантов компонентов

Дата: 2026-10-13

## 1. Цель и рамки

Табы второго уровня — переключатель между страницами одного раздела под
шапкой дашборда («Активные / Архив», «Ордера / Сертификаты / Sms») —
каждый дашборд верстает сам. Разметка скопирована из проекта в проект и
расходится в мелочах (раздел 2).

Цель: табы второго уровня — компонент пакета `PageTabs`. Страница передаёт
список табов и ключ открытого, вид и переход живут в одном месте.

Дашборды мобильной вёрстки не имеют (раздел 2), поэтому мобильного
варианта у `PageTabs` нет, а мобильные варианты, которые компоненты пакета
унаследовали от шаблонов Tailwind UI, удаляются: компонент выглядит на
любой ширине так, как сейчас выглядит на десктопе.

В рамках задачи:

- публичный компонент `PageTabs`, текст «Закладки» в `src/i18n.js`;
- удаление мобильных вариантов у `Modal`, `ConfirmationModal`,
  `NotificationMessage`, `Pagination`, `DataTable` и `PageCard`
  (раздел 9);
- правило «мобильных вариантов нет» в README;
- тесты, playground, README;
- выпуск `0.17.0` — после выпуска `0.16.3` (раздел 12);
- перевод certificates: карточка группы на `PageTabs`, зависимость
  `^0.17.0` (раздел 13).

Вне рамок:

- russia и cashback — отдельные задачи в их репозиториях (раздел 13.2);
- мобильная разметка проектов: в шапке certificates меню разделов
  и профиля скрыты на узком экране (`hidden sm:flex`), отступы страниц —
  `px-4 sm:px-6 lg:px-8`, в russia есть мобильное меню шапки;
- раскладка вокруг табов — отступы, кнопки рядом, `justify-between` —
  остаётся разметкой страниц.

## 2. Что показало исследование

### 2.1. Табы второго уровня

Одна и та же разметка найдена в трёх дашбордах (поиск по
`aria-label="Tabs"` и «Выберите закладку»):

- **russia**, `resources/js/Pages/Events/Index.vue` и
  `resources/js/Pages/Archive/Index.vue` — «Активные / Архив». Разметка
  повторена на двух страницах, открытый таб записан в каждой вручную.
  У мобильного `select` нет `@change`: выбор пункта никуда не ведёт. Пакет
  в russia не подключён (Vue `^3.5.13`, Tailwind 3).
- **certificates**, `resources/js/Pages/Groups/Card.vue` — «Ордера /
  Сертификаты / Sms». Табы — computed `tabs` (`{ key, name, link }`),
  открытый — проп `activeTab`, мобильный выбор — метод `switchTab` →
  `router.get(link)`. Пакет `^0.16.2`, плагин подключён с
  `navigate: (href) => router.visit(href)`.
- **cashback**, `resources/js/Pages/Messages/Index.vue` — «Пользовательские
  / Системные». Табы записаны вручную, адрес — `route('messages', {
  ...smsQuery, tab })`, мобильный выбор — `switchTab`. Пакет `^0.15.1`.

Разметка у всех трёх — пример табов Tailwind UI: на узком экране
(`sm:hidden`) `<select>` со скрытым `<label>`, не связанным с полем, от
`sm` — `<nav class="flex space-x-4" aria-label="Tabs">` со ссылками
`px-3 py-2 font-medium text-sm rounded-md`; открытая — `bg-indigo-100
text-gray-700`, остальные — `text-gray-500 hover:text-gray-700`;
`aria-current` нет ни у одной.

### 2.2. Мобильная вёрстка дашбордов

- certificates и cashback: на узком экране шапка прячет меню разделов
  и меню профиля (`hidden sm:flex`) и ничего не показывает взамен —
  с телефона нельзя перейти в другой раздел. Во всём certificates
  `sm:hidden` — только у `select` табов.
- russia: в шапке есть мобильное меню; таблицы и фильтры под узкий экран
  не переделаны, `select` табов не работает.

Мобильный `select` табов — часть шаблона Tailwind UI, а не решение
проекта.

### 2.3. Мобильные варианты в пакете

Варианты `sm:`, `md:`, `lg:`, `2xl:` есть у шести компонентов:

- `Modal` (приватный, панель `ConfirmationModal`) — на узком экране панель
  прижата к нижнему краю и выезжает снизу, от `sm` — по центру,
  `max-w-lg`, появляется с масштабом;
- `ConfirmationModal` — на узком экране иконка над текстом крупнее,
  текст по центру, кнопки на всю ширину друг под другом, `text-base`;
  от `sm` — иконка слева, кнопки в ряд справа, `text-sm`;
- `NotificationMessage` — на узком экране снизу по центру, от `sm` —
  в правом верхнем углу;
- `Pagination` (приватная, внутри `DataTable`) — отступ `px-4` на узком
  экране; строка «Показаны результаты X - Y из Z» видна только от `md`;
- `DataTable` — скругление таблицы только от `sm`;
- `PageCard` — на узком экране карточка во всю ширину без скругления,
  крестик ближе к верху (`mt-4`, от `sm` — `mt-6`); крестик снаружи
  карточки — от `md`, `lg` или `2xl` в зависимости от `width`.

## 3. Решения и их источники

| Решение | Источник |
| --- | --- |
| Компонент в пакете; в этой задаче переводится только certificates, russia и cashback — отдельно | выбор владельца из вариантов |
| Табы — ссылки, переход через `navigate` плагина, без событий (подход A) | выбор владельца из трёх подходов |
| Имя `PageTabs`, пропы `tabs` и `activeKey`, без `v-model`, без слотов | согласовано в дизайне |
| Раскладка вокруг табов остаётся на странице | согласовано в дизайне |
| Мобильного варианта у `PageTabs` нет | владелец |
| Мобильные варианты компонентов пакета удаляются там, где имеет смысл | владелец |
| Пороги крестика `PageCard` остаются (раздел 9.6) | согласовано в спеке |
| Выпуск `0.17.0` после `0.16.3` | владелец |

## 4. API `PageTabs`

    <page-tabs :tabs="tabs" :active-key="activeTab"/>

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `tabs` | `Array` | обязателен | `[{ key, name, url }]`: ключ, подпись, адрес таба |
| `activeKey` | `String` | `null` | Ключ открытого таба |
| `lang` | `String` | `null` | Язык скрытой подписи (миксин `withLang`) |

- Событий и слотов нет.
- `v-model` нет: открытый таб компонент сам не меняет — его приносит новая
  страница после перехода. Так же устроены `isActive` у
  `NavigationMenuElement` и `isOpen` у `ConfirmationModal`.
- `tabs`, не являющийся массивом (`null`, `undefined`), — пустой список:
  компонент рисует пустой `nav` без ошибок, Vue только предупреждает
  о типе обязательного пропа. Элементы списка, которые не объекты,
  пропускаются.
- `activeKey`, не совпадающий ни с одним ключом, — ни один таб не выделен.
- Ключи уникальны — забота страницы; повтор ключа Vue сообщит
  предупреждением о `:key`.

## 5. Разметка и вид

Одна разметка на любой ширине:

    <nav class="bb-dashboard-ui bb:flex bb:space-x-4" :aria-label="texts.tabs">
        <a
            v-for="tab in tabList"
            :key="tab.key"
            :href="tab.url"
            :aria-current="tab.key === activeKey ? 'page' : null"
            class="bb:px-3 bb:py-2 bb:font-medium bb:text-sm bb:rounded-md"
            :class="tab.key === activeKey
                ? 'bb:bg-indigo-100 bb:text-gray-700'
                : 'bb:text-gray-500 bb:hover:text-gray-700'"
            @click="followLink($event, tab.url)"
            v-text="tab.name"
        />
    </nav>

- Классы — те же, что у нынешних копий, с префиксом `bb:`. Цвета записаны
  в компоненте литералами, как у `NavigationMenuElement`: цветового пропа
  нет, `src/colors.js` не нужен.
- Подпись — текст самой ссылки, вложенных элементов нет: у Vimlike одна
  подсказка на ссылку (README, «Клавиатурная навигация»).
- Фокус ссылки — обводка браузера, как сейчас.
- Ссылки в строку не переносятся: две-три короткие подписи помещаются
  в любое окно десктопа.

## 6. Переход

Обычный клик по ссылке — `followLink($event, tab.url)` миксина
`withNavigation`, то есть `navigate` плагина. Ctrl/⌘-клик, Shift, Alt,
средняя кнопка, `target` — остаются браузеру. Без плагина ссылка —
обычный переход браузера.

## 7. Тексты

Ключ `tabs` в `src/i18n.js`: `ru` — «Закладки», `en` — «Tabs».
`aria-label` у `nav`.

## 8. SSR

К API браузера компонент не обращается. Фикстура в
`tests/ssrFixtures.js`:

    PageTabs: {
        props: {
            tabs: [
                { key: 'active', name: 'Активные', url: '/events' },
                { key: 'archive', name: 'Архив', url: '/archive' },
            ],
            activeKey: 'archive',
        },
    },

## 9. Удаление мобильных вариантов

Правило: у компонента остаётся вид, который сейчас начинается с `sm`
(или `md`), — классы этого варианта пишутся без префикса ширины, классы
узкого варианта, которые он перекрывал, удаляются. Вид на десктопе
не меняется.

### 9.1. `Modal`

- Контейнер: `bb:flex bb:items-end bb:justify-center bb:min-h-screen
  bb:pt-4 bb:px-4 bb:pb-20 bb:text-center bb:sm:block bb:sm:p-0` →
  `bb:min-h-screen bb:text-center`.
- Центрирующий `span`: `bb:hidden bb:sm:inline-block bb:sm:align-middle
  bb:sm:h-screen` → `bb:inline-block bb:align-middle bb:h-screen`.
- Переход панели: `enter-from` и `leave-to` — `bb:opacity-0 bb:scale-95`,
  `enter-to` и `leave-from` — `bb:opacity-100 bb:scale-100`
  (`translate-y-4` и `translate-y-0` уходят).
- Панель: `bb:align-bottom` и `bb:sm:` у `my-8`, `align-middle`,
  `max-w-lg`, `w-full` → `bb:my-8 bb:align-middle bb:max-w-lg bb:w-full`.

### 9.2. `ConfirmationModal`

- Блок текста: `bb:px-4 bb:pt-5 bb:pb-4 bb:sm:p-6 bb:sm:pb-4` →
  `bb:p-6 bb:pb-4`; внутренняя обёртка `bb:sm:flex bb:sm:items-start` →
  `bb:flex bb:items-start`.
- Круг иконки: `bb:mx-auto … bb:h-12 bb:w-12 … bb:sm:mx-0 bb:sm:h-10
  bb:sm:w-10` → `bb:h-10 bb:w-10` без `mx-auto`.
- Текст: `bb:mt-3 bb:text-center bb:sm:mt-0 bb:sm:ml-4 bb:sm:text-left` →
  `bb:ml-4 bb:text-left`.
- Блок кнопок: `bb:px-4 … bb:sm:px-6 bb:sm:flex bb:sm:flex-row-reverse` →
  `bb:px-6 bb:flex bb:flex-row-reverse`.
- Кнопки: `bb:w-full`, `bb:text-base`, `bb:mt-3` (у отмены) и
  `bb:sm:` у `ml-3`, `w-auto`, `text-sm`, `mt-0` → `bb:ml-3 bb:text-sm`.

### 9.3. `NotificationMessage`

Корень: `bb:items-end bb:justify-center bb:px-4 bb:py-6 bb:sm:p-6
bb:sm:items-start bb:sm:justify-end` → `bb:p-6 bb:items-start
bb:justify-end`: уведомление всегда в правом верхнем углу.

### 9.4. `Pagination`

- `nav`: `bb:px-4 … bb:sm:px-0` → без горизонтального отступа.
- Строка «Показаны результаты»: `bb:hidden bb:md:-mt-px bb:md:flex` →
  `bb:-mt-px bb:flex`: видна на любой ширине.

### 9.5. `DataTable`

Обёртка таблицы (не карточка): `bb:sm:rounded-lg` → `bb:rounded-lg`.

### 9.6. `PageCard`

- Корень: `bb:sm:rounded-lg` → `bb:rounded-lg`; `bb:sm:max-w-xl`,
  `bb:sm:max-w-4xl`, `bb:sm:max-w-7xl` → `bb:max-w-xl`, `bb:max-w-4xl`,
  `bb:max-w-7xl`.
- Крестик: `bb:mt-4 bb:sm:mt-6` → `bb:mt-6`.
- Пороги `md`, `lg`, `2xl`, от которых крестик снаружи карточки, и
  переменная `--bb-closer-space` остаются: они про ширину окна десктопа,
  а не про телефон. Без них крестик карточки `4xl` в окне уже 1024px
  вышел бы за край экрана.

### 9.7. Правило в README

В «Правила API пакета»: мобильных вариантов у компонентов нет — дашборды
работают на десктопе. Порог ширины (`sm:`, `md:`, …) ставится, только если
без него компонент не помещается в узкое окно десктопа, как крестик
`PageCard`.

## 10. Тесты

`tests/PageTabs.test.js`, в стиле `tests/NavigationMenuElement.test.js`
(монтирование в документ, `errorHandler` и `warnHandler` пишут в массивы,
клик — через слушатель на `window`):

- ссылки — по одной на таб, с адресом и подписью; у открытой —
  `aria-current="page"` и `bb:bg-indigo-100`, у остальных `aria-current`
  нет;
- `activeKey`, которого нет в списке, — ни у одной ссылки нет
  `aria-current`;
- `tabs: null` — компонент рисуется, ошибок нет, предупреждение Vue
  о типе пропа ровно одно и проверяется; элемент `null` в списке
  пропускается;
- обычный клик уходит в `navigate` с адресом таба и отменяет переход
  браузера;
- клик средней кнопкой не перехватывается;
- `lang="en"` — `aria-label` у `nav` — «Tabs».

Меняются:

- `tests/exports.test.js` — имя `PageTabs`;
- `tests/ssrFixtures.js` — раздел 8;
- `tests/PageCard.test.js` — ожидаемые классы карточки и крестика
  (`bb:max-w-*`, `bb:rounded-lg`, `bb:mt-6` вместо вариантов `bb:sm:`);
- `tests/DataTable.test.js` — `bb:rounded-lg` у обёртки таблицы.

Расположение модалки, уведомления и пагинации тесты не проверяют
(happy-dom не считает раскладку) — оно проверяется в браузере (раздел 14).
Префиксы `bb:` проверяет `tests/utilityPrefix.test.js` без правок.

## 11. Playground и README

Playground (`playground/App.vue`) — раздел `PageTabs`: три таба, открыт
второй, адреса вида `/tabs/…`; переход показывает строка состояния
(`navigation-log.js`). В разделе `lang="en"` — `PageTabs` с `lang="en"`.

README:

- раздел `PageTabs` после `NavigationMenuElement`: назначение, пример,
  таблица пропов, «Ссылки — через `navigate` плагина. Событий нет»;
- раздел «Почему у PageTabs нет v-model» рядом с разделами про `Dot` и
  `ConfirmationModal`;
- «Компоненты»: «шестнадцать» → «семнадцать», `PageTabs` в списке;
- «Правила API пакета»: `PageTabs` в списке ходящих через `navigate`
  и правило раздела 9.7;
- «Playground»: «шестнадцатью» → «семнадцатью»;
- `ConfirmationModal`: «на узком экране прижата к нижнему краю, начиная
  с `sm` стоит по центру и занимает `max-w-lg`» → «стоит по центру
  и занимает `max-w-lg`»;
- `NotificationMessage`: «На узком экране стоит снизу по центру, начиная
  с `sm` — в правом верхнем углу» → «Стоит в правом верхнем углу»;
- `PageCard`: заголовок колонки «Ширина от `sm`» → «Ширина»;
  `sm:rounded-lg` в «Атрибутах» → `rounded-lg`; в примерах
  `px-4 pt-4 sm:px-6 sm:pt-6` → `px-6 pt-6`, `px-4 py-5 … sm:px-6` →
  `px-6 py-5 …`, `px-4 py-4 sm:px-6 sm:py-6` → `px-6 py-6`,
  `overflow-hidden sm:rounded-b-lg` → `overflow-hidden rounded-b-lg`
  (в примере и в тексте).

## 12. Выпуск `0.17.0`

Минорная версия: новый компонент; API прежних компонентов не меняется,
меняется только их вид уже `sm`.

- Работа в пакете начинается, когда выпуск `0.16.3` (спека
  `2026-10-13-download-file-failure-reason-design.md`) закоммичен в `main`;
  тег `v0.17.0` ставится после публикации `0.16.3`. Workflow ставит метку
  `latest` явно, и `0.16.3`, опубликованная позже, сняла бы её с `0.17.0`.
- Коммит с версией в `package.json` и в двух местах `package-lock.json` —
  последний.
- Перед пушем — `npm pack` и `npm install --no-save <архив>` в certificates,
  проверка (раздел 14).
- Пуш `main`, зелёный `Test` (оба джоба) по полному SHA версионного
  коммита, тег `v0.17.0` на этот SHA, пуш одного тега.

## 13. Перевод проектов

### 13.1. certificates (в этой задаче)

`resources/js/Pages/Groups/Card.vue`:

- внутри обёртки `<div class="flex">` с комментарием «Табы Ордера /
  Сертификаты / Sms» два блока (`sm:hidden` с `select` и `hidden sm:block`
  с `nav`) заменяются на `<page-tabs :tabs="tabs" :active-key="activeTab"/>`;
  обёртка и комментарий остаются;
- в computed `tabs` поле `link` переименовывается в `url`; комментарий над
  ним «по этому списку строится и десктопная навигация, и мобильный
  select» становится ложным и меняется на «по этому списку `PageTabs`
  строит табы»;
- метод `switchTab` удаляется; `Link` и `router` остаются — они нужны
  ссылке закрытия и запуску отправки;
- `PageTabs` добавляется в импорт из пакета и в `components`.

Зависимость — `npm install @boobooking/dashboard-ui-components@0.17.0`
(`^0.17.0` в `package.json`), `npm run build`. Сверка экспортов пакета
с `resources/js` и `resources/css`: других копий табов в certificates нет,
без аналога в пакете по-прежнему остаётся только `Shared/NavigationHeader`.

Коммит certificates — на текущей ветке, без пуша.

### 13.2. russia и cashback (отдельные задачи)

- cashback: `Messages/Index.vue` — табы списком с адресом
  `route('messages', { ...smsQuery, tab })`, `switchTab` удаляется;
  зависимость с `^0.15.1` до `^0.17.0`.
- russia: сначала подключение пакета (плагин `dashboardUi` с `navigate`,
  стили пакета), затем `Events/Index.vue` и `Archive/Index.vue` на
  `PageTabs` с `active-key` `'active'` и `'archive'`. Нерабочий мобильный
  `select` уходит вместе с копией разметки.

## 14. Приёмка

- `npm test` и `npm run build` пакета, `npm run build` certificates —
  с чистым выводом.
- Chrome (chrome-devtools), playground сборкой во временном
  `certificates/src/public/build/ui-playground/`, голое окружение и
  окружение приложения:
  - `PageTabs` — вид ссылок, выделение открытого таба, переход кликом;
  - на ширине 1280px `ConfirmationModal`, `NotificationMessage`,
    `PageCard` и `DataTable` с пагинацией выглядят так же, как в `0.16.3`
    (сравнение снимков);
  - на ширине 500px — тот же вид: модалка по центру, кнопки в ряд,
    уведомление в правом верхнем углу, строка «Показаны результаты»
    видна, карточка и таблица скруглены;
  - консоль без ошибок.
  После проверки временная сборка удаляется.
- certificates.test, карточка группы, с пакетом из `npm pack`: переход по
  трём табам кликом, выделение открытого таба, адреса у ссылок; модалка
  «Начать отправку?» и уведомление выглядят как раньше; консоль без ошибок.
- Итоговое ревью свежим ревьюером, исправление найденного.

## 15. Принятые риски

- На телефоне компоненты пакета выглядят как на десктопе: модалка шириной
  в экран с кнопками в ряд, уведомление сверху справа. Дашборды на
  телефоне и так не работают: в certificates и cashback на узком экране
  нет меню разделов.
- Ссылки `PageTabs` в строку не переносятся: длинный список табов в узком
  окне выйдет за край.

## 16. Список файлов

Пакет, создаются:

- `src/components/PageTabs.vue`
- `tests/PageTabs.test.js`

Пакет, меняются:

- `src/components/Modal.vue`
- `src/components/ConfirmationModal.vue`
- `src/components/NotificationMessage.vue`
- `src/components/Pagination.vue`
- `src/components/DataTable.vue`
- `src/components/PageCard.vue`
- `src/index.js`
- `src/i18n.js`
- `tests/exports.test.js`
- `tests/ssrFixtures.js`
- `tests/PageCard.test.js`
- `tests/DataTable.test.js`
- `playground/App.vue`
- `README.md`
- `package.json`, `package-lock.json`

certificates, меняются:

- `resources/js/Pages/Groups/Card.vue`
- `package.json`, `package-lock.json`

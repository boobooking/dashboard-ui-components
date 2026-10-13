# PageTabs — переключатель табов второго уровня

Дата: 2026-10-13

## 1. Цель и рамки

Табы второго уровня — переключатель между страницами одного раздела под
шапкой дашборда («Активные / Архив», «Ордера / Сертификаты / Sms») —
каждый дашборд верстает сам: на узком экране родной `<select>`, на широком
`<nav>` из ссылок Inertia. Разметка скопирована из проекта в проект и
расходится в мелочах (раздел 2).

Цель: табы второго уровня — компонент пакета `PageTabs`. Страница передаёт
список табов и ключ открытого, а вид, мобильный выбор и переход живут
в одном месте.

В рамках задачи:

- публичный компонент `PageTabs`, два текста в `src/i18n.js`, `select`
  в ресете пакета;
- тесты, playground, README;
- выпуск `0.17.0` — после выпуска `0.16.3` (раздел 11);
- перевод certificates: карточка группы на `PageTabs`, зависимость
  `^0.17.0` (раздел 12).

Вне рамок:

- russia и cashback — отдельные задачи в их репозиториях (раздел 12);
- раскладка вокруг табов — отступы, кнопки рядом, `justify-between` —
  остаётся разметкой страниц;
- общий шеврон для `PageTabs` и `DropdownButtonWithAction`: стрелка
  `DropdownButtonWithAction` не меняется.

## 2. Что показало исследование

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

Разметка у всех трёх одна:

- обёртка `sm:hidden` с `<label class="sr-only">Выберите закладку</label>`,
  не связанным с полем, и `<select class="block w-full focus:ring-indigo-500
  focus:border-indigo-500 border-gray-300 rounded-md">`; стрелку, рамку и
  отступы полю даёт `@tailwindcss/forms` приложения;
- обёртка `hidden sm:block` с `<nav class="flex space-x-4" aria-label="Tabs">`;
- ссылка — `px-3 py-2 font-medium text-sm rounded-md`, открытая —
  `bg-indigo-100 text-gray-700`, остальные — `text-gray-500
  hover:text-gray-700`; `aria-current` нет ни у одной.

Во всех трёх местах табы обёрнуты страницей во flex-контейнер, поэтому
`select` на узком экране шириной по содержимому, а не во всю страницу.

В пакете ссылки уже ходят через `navigate` плагина (`withNavigation`,
`NavigationMenuElement`), а без плагина крестик `PageCard` переходит через
`window.location.assign`. Ресет пакета (`src/styles/index.css`, слой
`components`) обнуляет отступы и рамку у всего поддерева
`.bb-dashboard-ui`, а шрифт и цвет наследует только у `button` и `input`.

## 3. Решения и их источники

| Решение | Источник |
| --- | --- |
| Компонент в пакете; в этой задаче переводится только certificates, russia и cashback — отдельно | выбор владельца из вариантов |
| Табы — ссылки, переход через `navigate` плагина, без событий (подход A) | выбор владельца из трёх подходов |
| Имя `PageTabs`, пропы `tabs` и `activeKey`, без `v-model`, без слотов | согласовано в дизайне |
| Раскладка вокруг табов остаётся на странице | согласовано в дизайне |
| Вид — как у нынешних копий; `select` оформляет пакет, стрелку рисует сам | согласовано в дизайне |
| Без плагина выбор в `select` — `window.location.assign`, как у `PageCard` | согласовано в дизайне |
| Тексты «Закладки» и «Выберите закладку» — в `src/i18n.js` | согласовано в дизайне |
| Выпуск `0.17.0` после `0.16.3` | владелец |

## 4. API `PageTabs`

    <page-tabs :tabs="tabs" :active-key="activeTab"/>

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `tabs` | `Array` | обязателен | `[{ key, name, url }]`: ключ, подпись, адрес таба |
| `activeKey` | `String` | `null` | Ключ открытого таба |
| `lang` | `String` | `null` | Язык скрытых подписей (миксин `withLang`) |

- Событий и слотов нет.
- `v-model` нет: открытый таб компонент сам не меняет — его приносит новая
  страница после перехода. Так же устроены `isActive` у
  `NavigationMenuElement` и `isOpen` у `ConfirmationModal`.
- `tabs`, не являющийся массивом (`null`, `undefined`), — пустой список:
  компонент рисует пустые `select` и `nav` без ошибок, Vue только
  предупреждает о типе обязательного пропа. Элементы списка, которые не
  объекты, пропускаются.
- `activeKey`, не совпадающий ни с одним ключом, — ни один таб не открыт
  (разделы 5.1 и 5.2).
- Ключи уникальны — забота страницы; повтор ключа Vue сообщит
  предупреждением о `:key`.

## 5. Разметка и вид

Корень — `<div class="bb-dashboard-ui">` с двумя детьми: мобильным выбором
и навигацией. Отступов и ширины корень не задаёт.

### 5.1. Широкий экран (от `sm`)

    <nav class="bb:hidden bb:sm:flex bb:space-x-4" :aria-label="texts.tabs">
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

### 5.2. Узкий экран (уже `sm`)

    <div class="bb:relative bb:sm:hidden">
        <select
            class="bb:block bb:w-full bb:appearance-none bb:bg-none bb:bg-white
                   bb:border bb:border-gray-300 bb:rounded-md bb:py-2 bb:pl-3
                   bb:pr-10 bb:text-base bb:focus:outline-hidden
                   bb:focus:border-indigo-500 bb:focus:ring-1
                   bb:focus:ring-indigo-500"
            :aria-label="texts.chooseTab"
            @change="selectTab($event.target.value)"
        >
            <option v-if="!hasActiveTab" value="" disabled selected/>
            <option
                v-for="tab in tabList"
                :key="tab.key"
                :value="tab.key"
                :selected="tab.key === activeKey"
                v-text="tab.name"
            />
        </select>
        <svg class="bb:pointer-events-none bb:absolute bb:right-2 bb:top-1/2
                    bb:-translate-y-1/2 bb:h-5 bb:w-5 bb:text-gray-500" …/>
    </div>

- Доступное имя — `aria-label` на самом `select`. Отдельного `<label>` нет:
  в нынешних копиях он к полю не привязан.
- Открытый таб — атрибут `selected` у его `option`, а не `:value` у
  `select`: так серверная разметка показывает открытый таб ещё до
  гидратации (раздел 8).
- Если открытого таба нет (computed `hasActiveTab` — есть ли в списке таб
  с ключом `activeKey` — ложен), выбран пустой неактивный пункт: поле
  пустое, и выбор любого таба — переход.
- Отступы, рамка, скругление, белый фон и фокус `indigo-500` — утилиты
  пакета: ресет пакета в слое `components` перекрывает то, что даёт
  `@tailwindcss/forms` приложения из слоя `base`.
- `bb:appearance-none` снимает родную стрелку, `bb:bg-none` — фоновую
  стрелку `@tailwindcss/forms`. Стрелку рисует компонент: тот же шеврон
  (`viewBox="0 0 20 20"`, тот же `path`), что у стрелки
  `DropdownButtonWithAction`, с `aria-hidden="true"`. Поле выглядит
  одинаково в приложении с плагином форм и без него.
- `bb:text-base` (1rem) — размер, который сейчас даёт `@tailwindcss/forms`;
  меньший шрифт в поле заставил бы Safari на iPhone увеличивать страницу
  при фокусе.
- Ширину задаёт страница: в flex-обёртке (раздел 2) поле шириной по
  содержимому, в блочной — во всю ширину.

### 5.3. Ресет пакета

В правило `src/styles/index.css`, которое наследует шрифт и цвет у
`.bb-dashboard-ui button` и `.bb-dashboard-ui input`, добавляется
`.bb-dashboard-ui select`. Без этого в приложении без preflight поле
рисовалось бы системным шрифтом браузера, а не шрифтом приложения.
Комментарий у правила дополняется.

## 6. Переход

- Ссылка: обычный клик — `followLink($event, tab.url)` миксина
  `withNavigation`, то есть `navigate` плагина. Ctrl/⌘-клик, Shift,
  Alt, средняя кнопка, `target` — остаются браузеру.
- `select`: `selectTab(key)` находит таб по ключу и вызывает
  `navigate(tab.url)`. Без плагина (`navigate === null`) —
  `window.location.assign(tab.url)`, как крестик `PageCard`. Повторный
  выбор открытого таба события `change` не даёт.
- Пока новая страница не пришла, поле показывает выбранный пункт. Если
  переход не состоялся, поле остаётся на нём до следующей отрисовки
  страницы (раздел 14).

## 7. Тексты

Два ключа в `src/i18n.js`, в словарях `ru` и `en`:

| Ключ | ru | en | Где |
| --- | --- | --- | --- |
| `tabs` | Закладки | Tabs | `aria-label` у `nav` |
| `chooseTab` | Выберите закладку | Choose a tab | `aria-label` у `select` |

## 8. SSR

К `window` компонент обращается только в `selectTab`. Рендер одинаков на
сервере и в браузере; открытый таб в `select` задан атрибутом `selected`,
поэтому `tests/hydration.test.js` расхождений не находит. Фикстура в
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

## 9. Тесты

`tests/PageTabs.test.js`, в стиле `tests/NavigationMenuElement.test.js`
(монтирование в документ, `errorHandler` и `warnHandler` пишут в массивы,
клик — через слушатель на `window`):

- ссылки — по одной на таб, с адресом и подписью; у открытой —
  `aria-current="page"` и `bb:bg-indigo-100`, у остальных `aria-current`
  нет;
- `option` — по одному на таб, выбран открытый;
- `activeKey`, которого нет в списке, — ни у одной ссылки нет
  `aria-current`, выбран пустой неактивный пункт;
- `tabs: null` — компонент рисуется, ошибок нет, предупреждение Vue
  о типе пропа ровно одно и проверяется; элемент `null` в списке
  пропускается;
- обычный клик по ссылке уходит в `navigate` с адресом таба и отменяет
  переход браузера;
- клик средней кнопкой не перехватывается;
- выбор в `select` вызывает `navigate` с адресом выбранного таба;
- без плагина выбор в `select` вызывает `window.location.assign` с адресом
  (подмена через `vi.spyOn`);
- `lang="en"` — `aria-label` у `nav` и `select` английские.

Дополняются: `tests/exports.test.js` (имя `PageTabs`),
`tests/ssrFixtures.js` (раздел 8). Префиксы `bb:` проверяет
`tests/utilityPrefix.test.js` без правок.

## 10. Playground и README

Playground (`playground/App.vue`) — раздел `PageTabs`: три таба, открыт
второй, адреса вида `/tabs/…`; переход показывает строка состояния
(`navigation-log.js`). В разделе `lang="en"` — `PageTabs` с `lang="en"`.

README:

- раздел `PageTabs` после `NavigationMenuElement`: назначение, пример,
  таблица пропов, «Ссылки — через `navigate` плагина. Событий нет», вид
  на узком экране;
- раздел «Почему у PageTabs нет v-model» рядом с разделами про `Dot` и
  `ConfirmationModal`;
- «Компоненты»: «шестнадцать» → «семнадцать», `PageTabs` в списке;
- «Правила API пакета»: `PageTabs` в списке ходящих через `navigate`;
- «Playground»: «шестнадцатью» → «семнадцатью».

## 11. Выпуск `0.17.0`

Минорная версия: новый компонент, прежний API не меняется.

- Работа в пакете начинается, когда выпуск `0.16.3` (спека
  `2026-10-13-download-file-failure-reason-design.md`) закоммичен в `main`;
  тег `v0.17.0` ставится после публикации `0.16.3`. Workflow ставит метку
  `latest` явно, и `0.16.3`, опубликованная позже, сняла бы её с `0.17.0`.
- Коммит с версией в `package.json` и в двух местах `package-lock.json` —
  последний.
- Перед пушем — `npm pack` и `npm install --no-save <архив>` в certificates,
  проверка (раздел 13).
- Пуш `main`, зелёный `Test` (оба джоба) по полному SHA версионного
  коммита, тег `v0.17.0` на этот SHA, пуш одного тега.

## 12. Перевод проектов

### 12.1. certificates (в этой задаче)

`resources/js/Pages/Groups/Card.vue`:

- внутри обёртки `<div class="flex">` с комментарием «Табы Ордера /
  Сертификаты / Sms» два блока (`sm:hidden` с `select` и `hidden sm:block`
  с `nav`) заменяются на `<page-tabs :tabs="tabs" :active-key="activeTab"/>`;
  обёртка и комментарий остаются;
- в computed `tabs` поле `link` переименовывается в `url`; комментарий над
  ним («по этому списку строится и десктопная навигация, и мобильный
  select») остаётся верным;
- метод `switchTab` удаляется; `Link` и `router` остаются — они нужны
  ссылке закрытия и запуску отправки;
- `PageTabs` добавляется в импорт из пакета и в `components`.

Зависимость — `npm install @boobooking/dashboard-ui-components@0.17.0`
(`^0.17.0` в `package.json`), `npm run build`. Сверка экспортов пакета
с `resources/js` и `resources/css`: других копий табов в certificates нет,
без аналога в пакете по-прежнему остаётся только `Shared/NavigationHeader`.

Коммит certificates — на текущей ветке, без пуша.

### 12.2. russia и cashback (отдельные задачи)

- cashback: `Messages/Index.vue` — табы списком с адресом
  `route('messages', { ...smsQuery, tab })`, `switchTab` удаляется;
  зависимость с `^0.15.1` до `^0.17.0`.
- russia: сначала подключение пакета (плагин `dashboardUi` с `navigate`,
  стили пакета), затем `Events/Index.vue` и `Archive/Index.vue` на
  `PageTabs` с `active-key` `'active'` и `'archive'`. Нерабочий мобильный
  `select` уходит вместе с копией разметки.

## 13. Приёмка

- `npm test` и `npm run build` пакета, `npm run build` certificates —
  с чистым выводом.
- Chrome (chrome-devtools), playground сборкой во временном
  `certificates/src/public/build/ui-playground/`, голое окружение и
  окружение приложения: вид ссылок и `select` на широкой и узкой ширине,
  одна стрелка у поля, фокус, переход кликом и выбором; консоль без
  ошибок. После проверки временная сборка удаляется.
- certificates.test, карточка группы, с пакетом из `npm pack`: на широкой
  ширине — переход по трём табам кликом, выделение открытого таба,
  адреса у ссылок; на узкой — переход через `select`; консоль без ошибок.
- Safari на iPhone — проверяет владелец.
- Итоговое ревью свежим ревьюером, исправление найденного.

## 14. Принятые риски

- Не состоявшийся переход оставляет в `select` выбранный, а не открытый
  таб до следующей отрисовки страницы.
- Стрелка поля — шеврон пакета, а не контурная стрелка
  `@tailwindcss/forms`: на узком экране certificates она чуть плотнее,
  чем сейчас.
- Без плагина `dashboardUi` ссылки и выбор в `select` ведут браузер
  обычным переходом с перезагрузкой страницы.

## 15. Список файлов

Пакет, создаются:

- `src/components/PageTabs.vue`
- `tests/PageTabs.test.js`

Пакет, меняются:

- `src/index.js`
- `src/i18n.js`
- `src/styles/index.css`
- `tests/exports.test.js`
- `tests/ssrFixtures.js`
- `playground/App.vue`
- `README.md`
- `package.json`, `package-lock.json`

certificates, меняются:

- `resources/js/Pages/Groups/Card.vue`
- `package.json`, `package-lock.json`

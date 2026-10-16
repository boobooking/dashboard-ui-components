# FormInput — поле формы с подписью

Дата: 2026-10-16

## 1. Цель и рамки

Поле формы с подписью — «Имя», «Email», «Пароль» над полем ввода в рамке,
с красной точкой у подписи, когда поле не заполнено, — каждый дашборд
верстает сам. Разметка скопирована из проекта в проект около 75 раз
и расходится в мелочах; в части копий подпись связана не с тем полем
(раздел 2).

Цель: поле формы с подписью — компонент пакета `FormInput`. Он показывает
подпись, поле и, по флагу, красную точку и отдаёт введённое значение форме
через `v-model`. Что делать со значением, заполнено ли поле и когда
показывать точку, решает форма.

В рамках задачи:

- публичный компонент `FormInput`;
- тесты, Playground, README;
- выпуск `0.18.0` (раздел 10);
- перевод форм cashback, certificates и payments на `FormInput`
  (раздел 11).

Вне рамок:

- страницы входа cashback, certificates и payments (`Auth/Login.vue`) —
  у них свой вариант поля: без точки, `type="email"`, атрибут `required`, другие
  классы; остаются как есть;
- текст ошибки под полем и красная рамка у поля;
- поле с приставкой слева («Ссылка на мероприятие» в russia и belarus),
  маски, `textarea`;
- подсказки над кнопками («Заполните все поля и нажмите кнопку Создать.»,
  «Пожалуйста, заполните все поля, отмеченные обязательными.») и блок
  `ErrorMessages` — остаются разметкой форм;
- russia, belarus, belarus-dashboard, overweight, health-days-backend,
  cashback-vetkit-backend — отдельные задачи в их репозиториях.

## 2. Что показало исследование

Просмотрены восемь дашбордов в `~/Code/mars`: russia, belarus,
belarus-dashboard, overweight, health-days-backend, cashback,
cashback-vetkit-backend, certificates — и payments (`~/Code/payments`),
третий потребитель пакета.

### 2.1. Разметка

Общего компонента поля нет ни в одном проекте. Копия везде одна и та же
(cashback, `resources/js/Pages/Users/Create.vue`):

    <div>
        <div class="flex items-center">
            <label for="name" class="block text-sm font-medium leading-5 text-gray-700"> Имя </label>
            <dot v-show="markNameRequired" color="red" class="ml-2"></dot>
        </div>
        <div class="mt-1 relative rounded-md shadow-xs">
            <input
                v-model="name"
                id="name"
                type="text"
                class="block w-full border-gray-300 rounded-md focus:border-blue-300 focus:ring-3 focus:ring-blue-200/50 sm:text-sm sm:leading-5"
            />
        </div>
    </div>

- Рамку в 1px, внутренние отступы `px-3 py-2`, белый фон и размер шрифта
  полю даёт `@tailwindcss/forms` проекта, классами они не записаны.
- В проектах на Tailwind 3 (russia, belarus, belarus-dashboard,
  overweight) — те же классы в записи Tailwind 3 (`shadow-sm`,
  `focus:ring focus:ring-blue-200 focus:ring-opacity-50`).
- `relative` у обёртки есть на страницах создания и пропущен на страницах
  редактирования и смены пароля.
- Поля стоят столбцом в `flex flex-col w-full space-y-4` формы.

Подпись связана не с тем полем: у Email и Пароль `for="name"`, а у поля
`id="email"` / `id="password"`, клик по подписи ставит курсор в «Имя».
В cashback и certificates — `Users/Create.vue` (Email, Пароль),
`Users/Edit.vue` (Email); в `Users/ChangePassword.vue`
и `Users/ChangeMyPassword.vue` у поля пароля `id="name"`. Та же ошибка
в russia, overweight, health-days-backend, cashback-vetkit-backend
и belarus-dashboard.

### 2.2. Красная точка

Точка значит «поле не заполнено», а не «поле обязательное». Два способа:

- **основной** (все формы, кроме одной): флаг `markXRequired` сначала
  `false`; кнопка отправки ставит его на пустых полях, watcher поля
  снимает, когда в поле что-то ввели, и ставит, когда поле стёрли;
- **сразу** (certificates, `Pages/Groups/Complete.vue`, «Номер
  закрывающего документа»): `v-show="!numberIsFilled"` — точка видна
  с открытия формы, пока поле пустое.

Проверка на клиенте — только на пустоту (`length > 0`, в certificates
`trim() !== ""`). Если что-то не заполнено, форма показывает красную
строку «Пожалуйста, заполните все поля, отмеченные обязательными.» и не
отправляет запрос; иначе — серую подсказку. Формат email и длину пароля
проверяет сервер, его ошибки форма выводит одним блоком `ErrorMessages` под
полями. Красной рамки у поля и текста ошибки под полем нет нигде, кроме
полей времени в health-days-backend.

Атрибут `required` у поля есть только на страницах входа; формы страниц его
не ставят.

### 2.3. Значение и типы

- Значение — `v-model` на поле `data()` страницы; полезную нагрузку
  собирает computed, отправляет `router.post` / `router.patch`
  или axios.
- Типы: `text` — в том числе у всех полей Email вне страниц входа,
  `password`, на страницах входа `email`. `number`, `tel`, `date` в полях
  с подписью не встречаются.
- Плейсхолдеров, подсказок под полем, `disabled`, `autocomplete`,
  `autofocus`, `maxlength` у полей форм нет. `v-model.trim` — только у
  email на страницах входа.

### 2.4. Пакет в проектах

Пакет подключён в cashback, certificates и payments (`^0.17.1`, все
три — Tailwind 4 с `@tailwindcss/forms`); формы берут из него `Dot`,
`ErrorMessages`, `PageCard`. В payments те же копии поля с английскими
подписями (Name, Email, Password) и та же ошибка `for="name"`.
Остальные дашборды держат свои копии `Dot` и `ErrorMessages`.

## 3. Решения и их источники

| Решение | Источник |
| --- | --- |
| Компонент в пакете | владелец |
| Точку показывает флаг; когда его ставить, решает форма — подходят и основной способ, и «сразу» | владелец |
| Тип поля задаётся параметром: `password`, `email` и другие | владелец |
| `id` поля создаёт компонент и сам подставляет его в `for` подписи | владелец |
| Переводятся cashback и certificates; остальные проекты — отдельно | владелец |
| Переводится и payments | владелец, на вопрос после проверки спеки |
| Вне рамок: страницы входа, текст ошибки под полем, красная рамка, приставка, маски, `textarea`; подсказки и `ErrorMessages` остаются в формах | предложено в дизайне, владелец подтвердил |
| Вид — как у нынешних копий, классы `bb:` | предложено в дизайне, владелец подтвердил |
| Имя `FormInput`; пропы `label`, `type` (по умолчанию `text`), `isRequired`; значение — `v-model` без обрезки пробелов | предложено в дизайне, владелец подтвердил |
| `class` и `style` — на корень, остальные атрибуты — на поле ввода | предложено в дизайне, владелец подтвердил |
| Выпуск `0.18.0` | предложено в дизайне, владелец подтвердил |
| Список допустимых `type` и запасной `text` (раздел 4.2) | решение Claude |
| `id`, переданный атрибутом, заменяет созданный и в поле, и в `for` (раздел 4.3) | решение Claude |
| Поля Email в переводимых формах остаются `type="text"` (раздел 11) | решение Claude после ревью Codex |
| Значение — через нативный `v-model` поля, `number` в списке нет (разделы 4.1, 4.2) | решение Claude после ревью Codex |

## 4. API `FormInput`

    <form-input v-model="name" label="Имя" :is-required="markNameRequired"/>
    <form-input v-model="email" label="Email" type="email" :is-required="markEmailRequired"/>
    <form-input v-model="password" label="Пароль" type="password" :is-required="markPasswordRequired"/>

### 4.1. Пропы и события

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `modelValue` | `String` | `""` | Значение поля |
| `label` | `String` | обязателен | Подпись над полем |
| `type` | `String` | `"text"` | Тип поля, см. 4.2 |
| `isRequired` | `Boolean` | `false` | Красная точка у подписи |

- Событие `update:modelValue` — на каждый ввод, со строкой из поля как
  есть: пробелы компонент не обрезает, это решение формы.
- Внутри — нативный `v-model` поля на computed (чтение — `modelValue`,
  запись — событие), поэтому поле ведёт себя как нынешние копии
  с `v-model`: во время набора через IME (composition) событие не
  уходит, значение приходит по `compositionend`.
- Значение, изменённое родителем, поле показывает сразу и без событий.
- `null` и `undefined` в `modelValue` — пустое поле; в `label` — пустая
  подпись. Компонент не падает, Vue предупреждает о типе обязательного
  пропа, как у других компонентов пакета («Правила API пакета» в README).
- Событий `changed`, слотов и текстов интерфейса нет; пропа `lang` нет.
  `changed` у фильтров значит «можно обновлять выдачу», у поля формы
  такого момента нет — значение забирает форма при отправке.

### 4.2. `type`

Допустимые значения: `text`, `email`, `password`, `tel`, `url`,
`search` — типы, у которых значение — строка, а поле выглядит так же,
как текстовое. `number` в списке нет: нативный `v-model` у поля
`type="number"` отдаёт число, а не строку, и ни одной форме это поле
не нужно. Проп — перечисление, поэтому у него `validator`
(правило пакета). Значение вне списка валидатор отклоняет
с предупреждением Vue, а поле рисуется с `type="text"`: `checkbox`,
`date` или `file` в этой рамке были бы сломанным полем. Даты в дашбордах
выбирают календарём, а не полем `date`.

### 4.3. `isRequired` и атрибуты

- `isRequired` только показывает точку. Атрибутов `required`
  и `aria-*` он полю не ставит: в основном способе точка значит «не
  заполнено после попытки отправить», и браузерная проверка
  обязательности тут ни при чём.
- `inheritAttrs: false`. `class` и `style`, переданные компоненту, ложатся
  на корень: ими форма задаёт ширину и отступы поля целиком. Все остальные
  атрибуты и слушатели — `autocomplete`, `placeholder`, `name`,
  `disabled`, `required`, `@blur`, `@keydown.enter` и любые другие —
  ложатся на `<input>`.
- `id` поля компонент создаёт через `useId()` (как `ConfirmationModal`)
  и подставляет в `id` поля и в `for` подписи: две копии на странице не
  делят один `id`, клик по подписи ставит курсор в своё поле. Если форма
  передала атрибут `id`, он заменяет созданный в обоих местах.

## 5. Разметка и вид

Структура (классы — для ориентира, точный набор подбирает исполнитель
по сверке из раздела 12):

    <div class="bb-dashboard-ui">                  ← class и style формы
        <div class="bb:flex bb:items-center">
            <label :for="inputId" class="bb:block bb:text-sm bb:font-medium bb:leading-5 bb:text-gray-700" v-text="label"/>
            <dot v-show="isRequired" color="red" class="bb:ml-2"/>
        </div>
        <input :id="inputId" :type="inputType" …атрибуты формы… class="bb:mt-1 bb:block bb:w-full …"/>
    </div>

Вид — как у нынешних копий cashback и certificates в приложении
с `@tailwindcss/forms`, в варианте от `sm`:

- подпись: `text-sm`, `font-medium`, `leading-5`, `text-gray-700`;
  точка — `Dot` красного цвета с отступом `ml-2` справа от подписи;
- поле: на `mt-1` ниже подписи, на всю ширину корня; рамка 1px
  `gray-300`, скругление `rounded-md`, белый фон, отступы `px-3 py-2`,
  шрифт `text-sm` / `leading-5`, тень `shadow-xs`; высота поля — 38px;
- фокус: рамка `blue-300`, кольцо 3px `blue-200/50`, без обводки
  браузера.

Правила:

- Каждая утилита — с префиксом `bb:`, без порогов ширины `bb:sm:`:
  компонент на любой ширине выглядит как на десктопе (правило пакета).
- Корень — `bb-dashboard-ui`: ресет пакета снимает с поля оформление
  `@tailwindcss/forms` приложения и кольцо фокуса, вид целиком задают
  утилиты компонента (слой `utilities` сильнее ресета). Поэтому поле
  одинаково в Playground и в окружении приложения.
- Подпись — без `cursor: pointer`: Vimlike считал бы её кнопкой
  (README, «Клавиатурная навигация»). Клик по подписи ставит курсор в поле
  средствами браузера, через `for`.
- Особого вида у `disabled` и плейсхолдера компонент не задаёт: в формах
  их нет. Плейсхолдер получает цвет из ресета пакета.

## 6. SSR

К API браузера компонент не обращается; `useId()` даёт одинаковый `id`
на сервере и в браузере. Фикстура в `tests/ssrFixtures.js`:

    FormInput: { props: { label: 'Имя', modelValue: 'Анна', isRequired: true } },

## 7. Тесты

`tests/FormInput.test.js`, по образцу тестов пакета: предупреждения Vue
собираются через `warnHandler` и проверяются — вывод тестов чистый.

- Подпись показывает `label`; `for` подписи равен `id` поля; у двух копий
  на странице `id` разные.
- Атрибут `id` от формы — в `id` поля и в `for` подписи.
- Поле показывает `modelValue`; `null` и `undefined` — пустое поле, без
  предупреждений.
- Ввод эмитит `update:modelValue` со строкой как есть, с пробелами по
  краям; других событий нет.
- Новое `modelValue` от родителя — в поле, без событий.
- Composition: `compositionstart`, ввод — события нет; `compositionend` —
  одно `update:modelValue` с итоговой строкой; родитель с `v-model`
  получает её, и поле показывает её же.
- `type`: по умолчанию `text`; каждый из шести допустимых — в атрибуте
  поля; значение вне списка — предупреждение Vue и `type="text"`.
- `isRequired`: `false` — точка скрыта, `true` — видна, переключение
  туда и обратно; атрибута `required` у поля нет.
- Атрибуты: `placeholder`, `autocomplete`, `name`, `disabled`, `required`
  и слушатель `blur` — на поле, не на корне; `class` и `style` — на
  корне, не на поле.
- `label: null` — пустая подпись, компонент рисуется, предупреждение
  о типе обязательного пропа.

Меняются:

- `tests/exports.test.js` — восемнадцать компонентов, в списке
  `FormInput`;
- `tests/ssrFixtures.js` — фикстура из раздела 6.

`tests/utilityPrefix.test.js` проверит префиксы нового компонента сам.

## 8. Playground

`playground/App.vue` — раздел `FormInput` после `Search`, виден в обоих
окружениях:

- форма как «Создание администратора»: Имя, Email (`type="email"`),
  Пароль (`type="password"`) и кнопка «Создать». Кнопка ставит точку на
  пустых полях, ввод в поле снимает её, стирание ставит снова —
  основной способ из раздела 2.2. Под формой — строка со значениями
  полей;
- поле «Номер закрывающего документа» с точкой, пока оно пустое, —
  способ «сразу».

## 9. README

- Раздел `FormInput` после `Search`: назначение, пример, таблица пропов,
  событие, допустимые `type`, куда ложатся атрибуты, `id` и `for`, смысл
  точки и оба способа её показывать — с примером watcher и кнопки для
  основного способа и `:is-required="!numberIsFilled"` для способа
  «сразу».
- «Компоненты»: «семнадцать» → «восемнадцать», `FormInput` в списке.
- «Playground»: «семнадцатью» → «восемнадцатью».

## 10. Выпуск `0.18.0`

Минорная версия: новый компонент, API прежних не меняется. Ветка —
текущая `main`. Порядок:

1. `feat:`-коммит(ы): компонент, экспорт, тесты, Playground, README;
2. `npm test` — все тесты зелёные, вывод без предупреждений;
   `npm run build`; сборка Playground;
3. приёмка в пакете и в проектах с архивом `npm pack` (раздел 12);
4. итоговое ревью свежим ревьюером, исправление найденного;
5. `chore:`-коммит с `0.18.0` в `package.json` и двух местах
   `package-lock.json` — последним;
6. **согласие владельца** на публикацию;
7. пуш `main`, зелёный `Test` (оба джоба) по полному SHA версионного
   коммита, тег `v0.18.0` на этот SHA, пуш одного тега; публикует
   workflow `Publish`;
8. `npm view @boobooking/dashboard-ui-components@0.18.0 version`
   и `dist-tags.latest` — оба `0.18.0`.

Сообщения коммитов и документы — на русском, как принято в репозитории.

## 11. Перевод проектов

Проекты: cashback (`~/Code/mars/cashback`), certificates
(`~/Code/mars/certificates/src`) и payments (`~/Code/payments`). Пути
ниже — от `resources/js/Pages`.

Формы:

| Файл | cashback | certificates | payments | Поля |
| --- | --- | --- | --- | --- |
| `Users/Create.vue` | да | да | да | Имя, Email, Пароль |
| `Users/Edit.vue` | да | да | да | Имя, Email |
| `Users/ChangePassword.vue` | да | да | да | Пароль |
| `Users/ChangeMyPassword.vue` | да | да | да | Пароль |
| `Groups/Complete.vue` | — | да | — | Номер закрывающего документа |
| `PaymentAgents/Create.vue` | — | — | да | Name |
| `PaymentAgents/Edit.vue` | — | — | да | Name |

В payments подписи английские — `Name`, `Email`, `Password`; они
переходят в `label` как есть. Страница `Currencies/Add.vue` — чекбоксы,
не это поле, не меняется.

В каждом файле:

- блок поля — внешний `<div>` с подписью, точкой и обёрткой поля —
  заменяется одной строкой:
  - Имя: `<form-input v-model="name" label="Имя" :is-required="markNameRequired"/>`;
  - Email: `<form-input v-model="email" label="Email" :is-required="markEmailRequired"/>`;
  - Пароль: `<form-input v-model="password" label="Пароль" type="password" :is-required="markPasswordRequired"/>`;
  - Номер: `<form-input v-model="number" label="Номер закрывающего документа" :is-required="!numberIsFilled"/>`;

  имена переменных, флагов и текст подписи — те, что в файле; соседние
  комментарии остаются;
- Email остаётся `type="text"`, как сейчас: у поля `email` браузер
  обрезает пробелы по краям значения, и Email из одних пробелов стал бы
  пустым — проверки `length > 0` в формах начали бы ставить точку там,
  где сейчас запрос уходит и отказывает сервер. Поведение форм не
  меняется;
- `Dot` уходит из импорта пакета и из `components` — во всех пятнадцати
  файлах он используется только в этих полях; `FormInput` добавляется;
- данные, watchers, проверки, отправка, подсказки и `ErrorMessages` не
  меняются.

Порядок в каждом проекте:

1. рабочее дерево чистое — иначе проект не трогается, вопрос владельцу;
2. до публикации — правки форм и `npm install --no-save <архив npm pack>`,
   `npm run build` без ошибок, приёмка (раздел 12);
3. после шага 8 раздела 10 — `npm install
   @boobooking/dashboard-ui-components@^0.18.0`: диапазон
   в `package.json` и lock-файл на `0.18.0`; `npm run build` без ошибок;
4. тесты проекта зелёные:
   - cashback — `docker exec -e HOME=/tmp cashback-backend sh -lc 'cd /var/www && ./vendor/bin/pest'`;
   - certificates — `docker exec certificates-backend php artisan test`;
   - payments — `docker exec -w /var/www payments-backend php artisan test`;
5. `refactor:`-коммит на текущей ветке на языке проекта: cashback
   и certificates — русский, payments — английский; пушит владелец.

## 12. Приёмка

- `npm test` и `npm run build` пакета, `npm run build` cashback,
  certificates и payments — с чистым выводом.
- **Сверка вида.** Временный стенд в scratchpad: Tailwind 4
  и `@tailwindcss/forms`, как в `playground/host.css`, стили пакета
  первыми; рядом нынешняя копия поля из cashback `Users/Create.vue`
  и `FormInput` с той же подписью — без точки и с точкой, в покое
  и в фокусе. Playwright Chromium и WebKit (см. заметки о браузерах
  проекта), снимки одного размера: размеры, отступы, цвета, рамка, кольцо
  фокуса совпадают; расхождения допустимы только в сглаживании.
  После проверки стенд удаляется.
- **Playground** сборкой в `certificates/src/public/build/ui-playground/`
  (команда — как в спеке `0.17.1`, раздел 11; перед проверкой — `200`
  у `index.html` и `host.html`), Chrome (chrome-devtools), 1280×900, оба
  окружения:
  1. клик по каждой подписи ставит курсор в её поле;
  2. Tab проходит поля по порядку;
  3. «Создать» с пустыми полями — точки у всех трёх; ввод в поле снимает
     его точку, стирание ставит снова;
  4. строка значений показывает введённое как есть, с пробелами;
  5. «Номер закрывающего документа» — точка видна, пока поле пустое;
  6. консоль без ошибок и предупреждений.
- **Проекты** с архивом `npm pack`, Chrome (chrome-devtools),
  https://cashback.test, https://certificates.test и https://payments.test:
  создание администратора — «Создать» с пустыми полями даёт точки
  и красную строку, ввод снимает точку, клик по «Email» и «Пароль»
  ставит курсор в своё поле, неверный email и Email из одних пробелов —
  как раньше: точки нет, запрос уходит, ошибка сервера в `ErrorMessages`;
  редактирование и обе смены пароля — точка и подсказка как раньше;
  в certificates закрытие группы — точка видна, пока номер пуст;
  в payments создание и редактирование агента — точка у Name и подсказка
  как раньше; консоль без ошибок. Пользователей, агентов и закрытых групп
  приёмка не создаёт.
  Если сеанс в Chrome просрочен (редирект на `/login`), — вопрос
  владельцу: учётных данных у исполнителя нет.

## 13. Принятые риски

- Экранный диктор точку не озвучивает — как и сейчас.
- `text-sm` и на телефоне: Safari на iPhone приближает страницу при
  фокусе в поле со шрифтом меньше 16px. Дашборды на телефоне не работают.
- У `disabled` нет своего вида: формы его не используют.
- Проекты на Tailwind 3 при переводе получат `@tailwindcss/forms` вне
  слоёв, сильнее ресета и утилит пакета; это вопрос их отдельных задач.

## 14. Файлы

Пакет, создаются:

- `src/components/FormInput.vue`
- `tests/FormInput.test.js`

Пакет, меняются:

- `src/index.js`
- `tests/exports.test.js`
- `tests/ssrFixtures.js`
- `playground/App.vue`
- `README.md`
- `package.json`, `package-lock.json`

cashback, меняются:

- `resources/js/Pages/Users/Create.vue`, `Edit.vue`,
  `ChangePassword.vue`, `ChangeMyPassword.vue`
- `package.json`, `package-lock.json`

certificates, меняются:

- `resources/js/Pages/Users/Create.vue`, `Edit.vue`,
  `ChangePassword.vue`, `ChangeMyPassword.vue`
- `resources/js/Pages/Groups/Complete.vue`
- `package.json`, `package-lock.json`

payments, меняются:

- `resources/js/Pages/Users/Create.vue`, `Edit.vue`,
  `ChangePassword.vue`, `ChangeMyPassword.vue`
- `resources/js/Pages/PaymentAgents/Create.vue`, `Edit.vue`
- `package.json`, `package-lock.json`

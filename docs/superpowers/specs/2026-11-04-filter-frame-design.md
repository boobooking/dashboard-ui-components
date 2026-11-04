# Рамка фильтров RussianMobileFilter и Search

Дата: 2026-11-04

## 1. Цель и рамки

Фильтры пакета сами рисуют рамку строки фильтров — высоту 72px и серую рамку
1px `gray-200`. `RussianMobileFilter` и `Search` этого не делают: страницы
дописывают им `h-18 border border-gray-200`, иначе фильтр ниже соседей и без
рамки. Библиотека задаёт стиль, поэтому рамку рисуют сами компоненты, как
остальные фильтры.

В рамках задачи:

- `RussianMobileFilter` и `Search` получают на корне ту же высоту и рамку, что
  остальные фильтры;
- тесты, Playground, README.

Вне рамок:

- удаление классов `h-18 border border-gray-200` со страниц cashback и
  certificates и пересмотр рамки `Search` в окнах payments — задачи в
  репозиториях проектов;
- выпуск: версия, тег и публикация — по слову владельца.

## 2. Что показало исследование

- Корни фильтров: `SelectSingleFilter`, `SelectMultipleFilter` —
  `bb-dashboard-ui bb:flex bb:flex-none bb:w-fit bb:h-18 bb:border
  bb:border-gray-200`; `SelectDateFilter`, `SelectDateIntervalFilter`,
  `AmountIntervalFilter` — `bb-dashboard-ui bb:flex bb:w-fit bb:h-18 bb:border
  bb:border-gray-200`; `SelectCurrencyFilter` — обёртка над
  `SelectSingleFilter`.
- `RussianMobileFilter.vue` и `Search.vue`: корень
  `bb-dashboard-ui bb:flex bb:flex-none`, внутри
  `bb:flex bb:w-full bb:flex-col bb:border bb:border-white bb:bg-white`.
- Страницы: `<russian-mobile-filter class="h-18 border border-gray-200">` —
  cashback (Payments — ещё `ml-2`, Messages, Consumers, Cashbacks, Services) и
  certificates (Messages, Groups/Messages, Orders, Keys, Groups/Orders).
- payments: `Search` в окнах `Currencies/Add.vue` и `Countries/Add.vue` с
  `class="border border-gray-300 rounded-md overflow-hidden"` и комментарием
  «The library Search stays universal; its frame for the white window comes
  from here».
- CSS пакета подключается до CSS приложения, утилиты приложения на корне
  сильнее утилит пакета с тем же свойством.
- Playground: раздел «Панель фильтров» — ряд из пяти фильтров без
  `RussianMobileFilter` и `Search`; разделы `RussianMobileFilter` и `Search`
  показывают компоненты отдельно.

## 3. Решения и их источники

| Решение | Источник |
| --- | --- |
| Высоту и рамку рисует `RussianMobileFilter` | владелец (подтвердил, что это проблема пакета) |
| То же для `Search`: библиотека задаёт стиль | владелец |
| Классы на корне — `bb:h-18 bb:border bb:border-gray-200`, как у остальных фильтров; остальные классы корня и внутренние не меняются | автор |
| Классы со страниц убираются в проектах отдельно; пока они стоят, вид тот же | автор |
| Ветка `fix/filter-frame` от `main` | автор |

## 4. Поведение

- Корень `RussianMobileFilter` и `Search`: `bb-dashboard-ui bb:flex
  bb:flex-none bb:h-18 bb:border bb:border-gray-200`. Высота 72px, рамка 1px
  `gray-200`, как у `SelectSingleFilter` рядом.
- Внутренняя белая рамка и всё остальное — без изменений.
- Страница с `class="h-18 border border-gray-200"` выглядит как сейчас.
  Страница с `ml-2` сохраняет отступ.
- Страница, задающая свою рамку (payments: `border-gray-300 rounded-md`),
  перекрывает цвет и скругление классами приложения; высота теперь 72px от
  пакета — если окну нужна другая, страница задаёт свою (`h-…`). Это
  принятое следствие: стиль задаёт библиотека.

## 5. Тесты

**Vitest** (`tests/RussianMobileFilter.test.js`, `tests/Search.test.js`): на
корне `bb:h-18`, `bb:border`, `bb:border-gray-200`; `class` со страницы
(`ml-2 h-18 border border-gray-200`) — на корне вместе с ними, без
предупреждений.

**Playwright**, обе страницы, Chromium и WebKit: в «Панели фильтров» рядом с
остальными стоят `RussianMobileFilter` и `Search`; у всех фильтров ряда
высота 72px и `border-top-color` `gray-200`, `border-top-width` 1px.

## 6. README

- `### RussianMobileFilter` и `### Search`: высота и рамка как у остальных
  фильтров, классы со страниц для этого не нужны.
- «Обновление с 0.25»: классы `h-18 border border-gray-200` на
  `RussianMobileFilter` больше не нужны; у `Search` теперь высота 72px и
  серая рамка — страница, которой нужна другая рамка или высота, задаёт их
  классами.

## 7. Что остаётся за исполнителем

- Где в «Панели фильтров» поставить два фильтра.
- Формулировки README в пределах раздела 6.

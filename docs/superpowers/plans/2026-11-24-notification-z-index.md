# NotificationMessage поверх содержимого — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** корень `NotificationMessage` получает `bb:z-10`; выпуск 0.26.2.

**Spec:** `docs/superpowers/specs/2026-11-24-notification-z-index-design.md`.

## Global Constraints

- Ветка `main`; коммиты conventional по-русски, без `--no-verify`.
- Корень: `bb-dashboard-ui bb:fixed bb:inset-0 bb:z-10 bb:flex bb:items-start bb:justify-end bb:p-6 bb:pointer-events-none`.
- Проверка: `npx vitest run --dir tests` чистый, `npm run build`, `npm run test:browser`.

### Task 1: Демо, тесты, исправление

**Files:** `playground/App.vue` (раздел `PageCard`, данные), `e2e/notificationLayer.e2e.js` (новый), `tests/NotificationMessage.test.js`, `src/components/NotificationMessage.vue`.

- [ ] **Step 1: Демо.** В разделе `#page-card` после первой карточки — `page-card` с `fallback-url="#page-card"`, `width="7xl"`, классом демо с `max-width: 88rem`; в слоте заголовок, кнопка «Показать уведомление» (`notificationInCardText = '…'`) и `notification-message v-model="notificationInCardText" type="warning"`.
- [ ] **Step 2: Тесты.** Unit: `'корень над содержимым страницы — bb:z-10'` — у корня класс `bb:z-10`. E2E (`pages`, обе страницы): свежая страница, `reducedMotion: 'reduce'` (иначе `CrossButton` пишет переход после анимации, позже события клика), viewport 1440×900; прокрутить так, чтобы верх новой карточки был на `y=10`; нажать «Показать уведомление»; кликнуть мышью (`page.mouse.click`) по центру крестика уведомления; ожидание — уведомление скрыто, строка «Последний переход» в секции `PageTabs` (на странице таких строк две) осталась «—».
- [ ] **Step 3: RED.** `npx vitest run --dir tests NotificationMessage` и `npm run test:browser -- e2e/notificationLayer.e2e.js` — оба падают; e2e — строка журнала в секции `PageTabs` получила `#page-card`.
- [ ] **Step 4: Исправление** — класс корня из Global Constraints.
- [ ] **Step 5: GREEN** — те же команды проходят; затем полный `npx vitest run --dir tests` и `npm run test:browser`.
- [ ] **Step 6: Коммит** — `fix: поднять NotificationMessage над содержимым страницы`.

### Task 2: README и выпуск

- [ ] **Step 1:** README по спеке §7: абзац про слой в `### NotificationMessage`; раздел «Обновление с 0.26»: ручной `z-10` на уведомлениях больше не нужен.
- [ ] **Step 2:** `git diff --check`, `npx vitest run --dir tests`; коммит `docs: описать слой NotificationMessage`.
- [ ] **Step 3: Выпуск** (решение владельца): `npm version 0.26.2 --no-git-tag-version`, тесты и сборка, коммит `chore: поднять версию до 0.26.2`, тег `v0.26.2`, push `main` и тега, Publish в Actions успешен, `npm view … dist-tags.latest` = `0.26.2`.

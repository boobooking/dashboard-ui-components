import { test, expect, pages, openPlayground } from './helpers.js'

// Уведомление лежит в слоте PageCard, а крестик карточки стоит в разметке
// после слота. Карточка-демо подобрана так, что при 1440×900 и верхе карточки
// на y=10 крестик уведомления лежит над крестиком карточки: клик мышью
// попадает в тот, что нарисован выше. Анимация CrossButton отключена — иначе
// переход записывается позже события клика.
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

const card = (page) => page.locator('[data-demo="notification-in-card"]')
const navigationLog = (page) =>
    page.locator('section', { has: page.locator('h2', { hasText: 'PageTabs' }) }).locator('p', { hasText: 'Последний переход' })

for (const file of pages) {
    test.describe(`NotificationMessage в PageCard, ${file}`, () => {
        test.beforeEach(async ({ page }) => {
            await openPlayground(page, file)
        })

        test('крестик уведомления закрывает уведомление, а не карточку', async ({ page }) => {
            await card(page).evaluate((element) => window.scrollBy(0, element.getBoundingClientRect().top - 10))
            await card(page).getByRole('button', { name: 'Показать уведомление' }).click()
            const notice = page.getByText('Уведомление поверх крестика карточки')
            await expect(notice).toBeVisible()

            const close = page.locator('[role="status"]', { hasText: 'Уведомление поверх крестика карточки' }).getByRole('button', { name: 'Закрыть' })
            const box = await close.boundingBox()
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

            await expect(notice).toBeHidden()
            await expect(navigationLog(page)).toHaveText('Последний переход: —')
        })
    })
}

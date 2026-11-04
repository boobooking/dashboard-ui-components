import { test, expect, pages, openPlayground, expectColor } from './helpers.js'

const header = (page, name) => page.locator(`nav[data-demo="header-${name}"]`)
// Левая часть строки — логотип и пункты; ссылки меню профиля лежат в панели справа.
const links = (page, name) => header(page, name).locator('> div > div:first-child a')
const menuButton = (page, name) => header(page, name).locator('button[popovertarget]')

// Расстояние от края шапки до края вложенного элемента.
const rect = (locator) => locator.evaluate((node) => {
    const { left, right, top } = node.getBoundingClientRect()

    return { left, right, top }
})

for (const file of pages) {
    test.describe(`NavigationHeader, ${file}`, () => {
        test.beforeEach(async ({ page }) => {
            await openPlayground(page, file)
        })

        test('высота, фон и тень у шапки с меню и без него', async ({ page }) => {
            for (const name of ['full', 'plain']) {
                const navigation = header(page, name)
                const row = navigation.locator('> div')

                await expect(row).toHaveCSS('height', '64px')
                await expectColor(navigation, 'background-color', 'white')
                await expect(navigation).not.toHaveCSS('box-shadow', 'none')
            }
            await expect(menuButton(page, 'plain')).toHaveCount(0)
        })

        test('активный пункт подчёркнут и отмечен aria-current', async ({ page }) => {
            const active = links(page, 'full').nth(1)

            // Цвет читается до фокуса: в фокусе подчёркивание indigo-700.
            await expectColor(active, 'border-bottom-color', 'indigo-400')
            // Пункт на всю высоту строки: подчёркивание у нижнего края шапки.
            await expect(active).toHaveCSS('height', '64px')
            await expect(active).toHaveAttribute('aria-current', 'page')
            for (const index of [0, 2, 3]) {
                await expect(links(page, 'full').nth(index)).not.toHaveAttribute('aria-current', /.*/)
            }
        })

        test('активный ключ вне списка не отмечает ни одну ссылку', async ({ page }) => {
            await expect(links(page, 'unknown')).toHaveCount(4)
            await expect(links(page, 'unknown').and(page.locator('[aria-current]'))).toHaveCount(0)
        })

        test('кнопка меню в 32px от правого края шапки', async ({ page }) => {
            const navigation = await rect(header(page, 'full'))
            const button = await rect(menuButton(page, 'full'))

            expect(Math.abs(navigation.right - button.right - 32)).toBeLessThanOrEqual(1)
            // Минимальный зазор до пунктов задаёт margin-left правого блока.
            await expect(header(page, 'full').locator('> div > div:last-child')).toHaveCSS('margin-left', '24px')
        })

        test('логотип в 32px от края, первый пункт в 32px от логотипа', async ({ page }) => {
            const navigation = await rect(header(page, 'full'))
            const logo = await rect(header(page, 'full').locator('svg[aria-label="Логотип"]'))
            const first = await rect(links(page, 'full').first())

            expect(Math.abs(logo.left - navigation.left - 32)).toBeLessThanOrEqual(1)
            expect(Math.abs(first.left - logo.right - 32)).toBeLessThanOrEqual(1)
        })

        test('без логотипа первый пункт в 32px от края шапки', async ({ page }) => {
            const navigation = await rect(header(page, 'plain'))
            const first = await rect(links(page, 'plain').first())

            expect(Math.abs(first.left - navigation.left - 32)).toBeLessThanOrEqual(1)
        })

        test('на ширине 1024px пункты в одну строку', async ({ page }) => {
            await page.setViewportSize({ width: 1024, height: 768 })

            const items = links(page, 'full')
            await expect(items).toHaveCount(4)
            const tops = []
            for (const item of await items.all()) {
                await expect(item).toBeVisible()
                tops.push((await rect(item)).top)
            }
            expect(new Set(tops).size).toBe(1)

            // Подпись с пробелом занимает одну строку.
            const lines = await items.nth(1).evaluate((link) => {
                const range = document.createRange()
                range.selectNodeContents(link)

                return range.getClientRects().length
            })
            expect(lines).toBe(1)
        })
    })
}

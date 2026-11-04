import { test, expect, pages, openPlayground, expectColor } from './helpers.js'

// Рамка и высота фильтров панели: у всех семи одинаковые.
for (const file of pages) {
    test.describe(`рамка фильтров: ${file}`, () => {
        test('все фильтры панели — 72px и серая рамка', async ({ page }) => {
            await openPlayground(page, file)
            const section = page.locator('section').filter({ has: page.getByRole('heading', { level: 2, name: 'Панель фильтров', exact: true }) })
            const filters = section.locator('.demo-row > .bb-dashboard-ui')
            await expect(filters).toHaveCount(7)
            const count = await filters.count()

            for (let index = 0; index < count; index++) {
                const filter = filters.nth(index)
                // Номер фильтра в сообщении: по нему видно, какой не прошёл.
                try {
                    expect((await filter.boundingBox()).height).toBe(72)
                    await expect(filter).toHaveCSS('border-top-width', '1px')
                    await expectColor(filter, 'border-top-color', 'gray-200')
                } catch (error) {
                    error.message = `фильтр №${index}\n${error.message}`
                    throw error
                }
            }
        })
    })
}

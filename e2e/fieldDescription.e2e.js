import { test, expect, pages, openPlayground, expectColor } from './helpers.js'

const section = (page) => page.locator('section', { has: page.locator('h2', { hasText: 'Описание поля' }) })
const descriptions = (page) => section(page).locator('[id$="-description"]')
const link = (page) => section(page).getByRole('link', { name: 'Settings' })

for (const file of pages) {
    test.describe(`описание поля, ${file}`, () => {
        test.beforeEach(async ({ page }) => {
            await openPlayground(page, file)
        })

        test('вид и отступ у всех полей', async ({ page }) => {
            await expect(descriptions(page)).toHaveCount(14)

            for (const description of await descriptions(page).all()) {
                await expect(description).toHaveCSS('font-size', '12px')
                await expect(description).toHaveCSS('line-height', '16px')
                await expect(description).toHaveCSS('font-weight', '400')
                await expectColor(description, 'color', 'gray-500')

                const gap = await description.evaluate((node) => node.getBoundingClientRect().top
                    - node.previousElementSibling.getBoundingClientRect().bottom)
                expect(gap).toBeCloseTo(4, 0)
            }
        })

        test('ссылка в слоте нажимается мышью', async ({ page }) => {
            await link(page).click()

            await expect(page).toHaveURL(/#description-link$/)
        })

        test('ссылка в слоте нажимается с клавиатуры', async ({ page }) => {
            await link(page).focus()
            await page.keyboard.press('Enter')

            await expect(page).toHaveURL(/#description-link$/)
        })

        test('в обёртке по содержимому описание не раздвигает поле', async ({ page }) => {
            const description = descriptions(page).nth(12)
            const field = await description.locator('xpath=preceding-sibling::input').boundingBox()
            const box = await description.boundingBox()

            expect(field.width).toBeLessThan(300)
            expect(box.width).toBeCloseTo(field.width, 0)
        })

        test('длинное слово не шире поля', async ({ page }) => {
            const fits = await descriptions(page).last().evaluate((node) => {
                const range = document.createRange()
                range.selectNodeContents(node)

                return range.getBoundingClientRect().right <= node.previousElementSibling.getBoundingClientRect().right + 0.5
            })

            expect(fits).toBe(true)
        })
    })
}

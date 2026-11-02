import { test, expect, pages, openPlayground, expectColor } from './helpers.js'

const section = (page) => page.locator('section', { has: page.locator('h2', { hasText: 'DetailList' }) })
const list = (page) => section(page).locator('dl')
const rows = (page) => list(page).locator('> div')

for (const file of pages) {
    test.describe(`DetailList, ${file}`, () => {
        test.beforeEach(async ({ page }) => {
            await openPlayground(page, file)
        })

        test('первая строка серая, вторая белая, третья серая', async ({ page }) => {
            await expectColor(rows(page).nth(0), 'background-color', 'gray-50')
            await expectColor(rows(page).nth(1), 'background-color', 'white')
            await expectColor(rows(page).nth(2), 'background-color', 'gray-50')
        })

        test('строки из v-for идут в общем счёте, последняя серая', async ({ page }) => {
            await expect(rows(page)).toHaveCount(7)
            await expectColor(rows(page).nth(3), 'background-color', 'white')
            await expectColor(rows(page).nth(4), 'background-color', 'gray-50')
            await expectColor(rows(page).nth(6), 'background-color', 'gray-50')
        })

        test('спрятанная строка: чередование по видимым строкам', async ({ page }) => {
            await section(page).getByRole('button', { name: 'Спрятать телефон' }).click()

            await expect(rows(page)).toHaveCount(6)
            await expect(rows(page).nth(1)).toContainText('Код')
            await expectColor(rows(page).nth(1), 'background-color', 'white')
        })

        test('все строки спрятаны: высота списка 0', async ({ page }) => {
            await section(page).getByRole('button', { name: 'Спрятать все строки' }).click()

            await expect(rows(page)).toHaveCount(0)
            expect((await list(page).boundingBox()).height).toBe(0)
        })

        test('текст и пилюля в одной строке', async ({ page }) => {
            const text = await rows(page).nth(2).locator('dd').evaluate((dd) => {
                // В значении есть пустые текстовые узлы Vue: нужен узел с кодом.
                const code = [...dd.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '')
                const range = document.createRange()
                range.selectNode(code)
                const { right, bottom } = range.getBoundingClientRect()
                return { right, bottom }
            })
            const pill = await rows(page).nth(2).locator('dd > span').boundingBox()

            expect(pill.x).toBeGreaterThanOrEqual(text.right)
            expect(pill.y).toBeLessThan(text.bottom)
        })

        test('нулевые отступы и начертание', async ({ page }) => {
            const title = rows(page).first().locator('dt')
            const value = rows(page).first().locator('dd')

            for (const property of ['margin-top', 'margin-left', 'padding-left']) {
                await expect(title).toHaveCSS(property, '0px')
                await expect(value).toHaveCSS(property, '0px')
                await expect(list(page)).toHaveCSS(property, '0px')
            }
            await expect(title).toHaveCSS('font-weight', '400')
        })

        test('нижние углы обрезаны скруглением', async ({ page }) => {
            await list(page).scrollIntoViewIfNeeded()
            const clipped = await list(page).screenshot()

            await page.addStyleTag({ content: 'section dl { overflow: visible !important; border-radius: 0 !important }' })

            expect(clipped.equals(await list(page).screenshot())).toBe(false)
        })

        test.describe('узкое окно', () => {
            test.use({ viewport: { width: 360, height: 800 } })

            test('две колонки: название и значение на одной линии', async ({ page }) => {
                const title = await rows(page).first().locator('dt').boundingBox()
                const value = await rows(page).first().locator('dd').boundingBox()

                expect(value.y).toBeCloseTo(title.y, 0)
                expect(value.x).toBeGreaterThan(title.x + title.width)
            })

            // Четвёртая строка — длинное название согласия, пятая — адрес без пробелов.
            test('длинное значение и название в своих колонках', async ({ page }) => {
                for (const [index, cell] of [[4, 'dd'], [3, 'dt']]) {
                    const fits = await rows(page).nth(index).locator(cell).evaluate((element) => {
                        const range = document.createRange()
                        range.selectNodeContents(element)
                        return range.getBoundingClientRect().right <= element.getBoundingClientRect().right + 0.5
                    })

                    expect(fits).toBe(true)
                }
            })
        })
    })
}

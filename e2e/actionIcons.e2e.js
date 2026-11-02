import {
    test, expect, pages, openPlayground, buttonAfterHeading, openPanel, menuItem, openMenuByClick,
} from './helpers.js'

// Иконки действий и ширина меню в настоящей вёрстке. Номера кнопок считают
// и кнопки закрытых меню: их popover стоит сразу за стрелкой.
const iconsArrow = (page) => buttonAfterHeading(page, 'h3', 'С иконками')
const colorMainButton = (page) => buttonAfterHeading(page, 'h3', 'С иконками', 4)
const colorArrow = (page) => buttonAfterHeading(page, 'h3', 'С иконками', 5)
const longArrow = (page) => buttonAfterHeading(page, 'h3', 'Несколько действий')
const retryArrow = (page) => buttonAfterHeading(page, 'h3', 'Несколько действий', 5)

// Подпись пункта обрезана многоточием: текст шире своего блока.
const labelIsCut = (item) => item.locator('span').last().evaluate((label) => label.scrollWidth > label.clientWidth)

for (const file of pages) {
    test.describe(`иконки и ширина меню, ${file}`, () => {
        test.beforeEach(async ({ page }) => {
            await openPlayground(page, file)
        })

        test('длинный пункт в одну строку, меню шире 224 px', async ({ page }) => {
            await expect(longArrow(page)).toBeVisible()
            await openMenuByClick(page, longArrow(page))

            expect((await menuItem(page, 'Отправить письмо').boundingBox()).height).toBe(36)
            expect((await openPanel(page).boundingBox()).width).toBeGreaterThan(224)
        })

        test('короткое меню — 224 px, правый край по стрелке', async ({ page }) => {
            await expect(iconsArrow(page)).toBeVisible()
            await openMenuByClick(page, iconsArrow(page))

            const panel = await openPanel(page).boundingBox()
            const arrow = await iconsArrow(page).boundingBox()
            expect(panel.width).toBe(224)
            expect(panel.x + panel.width).toBeCloseTo(arrow.x + arrow.width, 0)
        })

        test('иконка 16 × 16 px, текст пунктов на одной линии', async ({ page }) => {
            await expect(iconsArrow(page)).toBeVisible()
            await openMenuByClick(page, iconsArrow(page))

            const lefts = await openPanel(page).locator('[role="menuitem"] > span:last-child')
                .evaluateAll((labels) => labels.map((label) => label.getBoundingClientRect().left))
            expect(lefts).toHaveLength(3)
            expect(new Set(lefts).size).toBe(1)

            const icon = await openPanel(page).locator('svg').first().boundingBox()
            expect([icon.width, icon.height]).toEqual([16, 16])
        })

        // Цвет текста пункта и цвет линии иконки: getComputedStyle(svg).color
        // только унаследован и о том, чем нарисована иконка, ничего не говорит.
        const paints = (item) => item.evaluate((node) => [
            getComputedStyle(node).color,
            getComputedStyle(node.querySelector('svg path')).stroke,
        ])

        test('иконка красится как текст цветного пункта', async ({ page }) => {
            await expect(colorArrow(page)).toBeVisible()
            await openMenuByClick(page, colorArrow(page))

            const [text, icon] = await paints(menuItem(page, 'Добавить в чёрный список'))
            expect(icon).toBe(text)
        })

        test('при наведении иконка темнеет вместе с текстом', async ({ page }) => {
            await expect(iconsArrow(page)).toBeVisible()
            await openMenuByClick(page, iconsArrow(page))

            const item = menuItem(page, 'Добавить группу')
            const [text, icon] = await paints(item)
            expect(icon).toBe(text)

            await item.hover()
            const [hoverText, hoverIcon] = await paints(item)
            expect(hoverText).not.toBe(text)
            expect(hoverIcon).toBe(hoverText)
        })

        test('клик по иконке основной кнопки — клик по кнопке, указатель у кнопки', async ({ page }) => {
            const counter = page.locator('p', { hasText: /^Выбрано действий: \d+, последний переход/ })
            const before = await counter.textContent()

            await expect(colorMainButton(page)).toBeVisible()
            await colorMainButton(page).scrollIntoViewIfNeeded()
            const box = await colorMainButton(page).locator('svg').boundingBox()
            const center = [box.x + 8, box.y + 8]

            const target = await page.evaluate(([x, y]) => {
                const element = document.elementFromPoint(x, y)
                return [element.tagName, getComputedStyle(element).cursor]
            }, center)
            expect(target).toEqual(['BUTTON', 'pointer'])

            await page.mouse.click(...center)
            await expect(counter).not.toHaveText(before)
        })

        test.describe('узкое окно', () => {
            test.use({ viewport: { width: 360, height: 800 } })

            test('мало места слева: меню в окне, левый край 8 px, подпись целиком', async ({ page }) => {
                await expect(retryArrow(page)).toBeVisible()
                await openMenuByClick(page, retryArrow(page))

                const panel = await openPanel(page).boundingBox()
                const arrow = await retryArrow(page).boundingBox()
                // Сдвиг действительно нужен: у стрелки слева места меньше, чем ширина меню.
                expect(arrow.x + arrow.width - 8).toBeLessThan(panel.width)
                expect(panel.x).toBeCloseTo(8, 0)
                expect(await labelIsCut(menuItem(page, 'Зафиксировать'))).toBe(false)
            })

            test('меню шире окна: 8 px с обеих сторон, подпись обрезана', async ({ page }) => {
                await expect(longArrow(page)).toBeVisible()
                await openMenuByClick(page, longArrow(page))

                const panel = await openPanel(page).boundingBox()
                expect(panel.x).toBeCloseTo(8, 0)
                expect(panel.width).toBeCloseTo(344, 0)
                expect(await labelIsCut(menuItem(page, 'Отправить письмо'))).toBe(true)
            })
        })
    })
}

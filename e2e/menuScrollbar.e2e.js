import {
    test, expect, openPlayground, buttonAfterHeading, openPanel, openMenuByClick, scrollToTrigger,
} from './helpers.js'

// Меню с вертикальной полосой прокрутки, только Chromium: Playwright прячет
// полосы флагом запуска, а настройку запуска можно менять лишь на весь файл.
// Полоса входит в ширину меню, поэтому важен порядок: сначала разворот вверх,
// потом измерение ширины.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } })
test.skip(({ browserName }) => browserName !== 'chromium')

const longArrow = (page) => buttonAfterHeading(page, 'h3', 'Несколько действий')
const retryArrow = (page) => buttonAfterHeading(page, 'h3', 'Несколько действий', 5)

const scrollbarWidth = (panel) => panel.evaluate((element) => element.offsetWidth - element.clientWidth)

test.beforeEach(async ({ page }) => {
    await openPlayground(page, 'index.html')
    await page.addStyleTag({ content: '[popover]::-webkit-scrollbar { width: 15px }' })
})

test.describe('полоса исчезает', () => {
    test.use({ viewport: { width: 360, height: 800 } })

    test('полоса исчезает при развороте вверх: левый край по окончательной ширине', async ({ page }) => {
        await expect(retryArrow(page)).toBeVisible()
        // Под стрелкой 30 px: за вычетом зазора и отступа меню остаётся 18 px,
        // меньше высоты пункта.
        await retryArrow(page).evaluate((arrow) => {
            arrow.scrollIntoView({ block: 'end' })
            window.scrollBy(0, 30)
        })
        await scrollToTrigger(page, retryArrow(page))
        await openMenuByClick(page, retryArrow(page))

        const panel = openPanel(page)
        expect(await panel.evaluate((element) => element.style.top)).toBe('auto')
        expect(await scrollbarWidth(panel)).toBe(0)
        expect((await panel.boundingBox()).x).toBeCloseTo(8, 0)

        // Полоса до разворота была: столько места оставалось снизу.
        const maxHeight = await panel.evaluate((element) => {
            const previous = element.style.maxHeight
            element.style.maxHeight = '18px'
            return previous
        })
        expect(await scrollbarWidth(panel)).toBeGreaterThan(0)
        await panel.evaluate((element, previous) => { element.style.maxHeight = previous }, maxHeight)
    })
})

test.describe('полоса остаётся', () => {
    test.use({ viewport: { width: 360, height: 120 } })

    test('полоса остаётся в коротком узком окне: горизонтальной прокрутки нет', async ({ page }) => {
        await scrollToTrigger(page, longArrow(page))
        await openMenuByClick(page, longArrow(page))

        const panel = openPanel(page)
        expect(await scrollbarWidth(panel)).toBeGreaterThan(0)
        expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    })
})

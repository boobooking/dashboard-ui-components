import { test, expect, pages, openPlayground, expectColor, expectFocusRing } from './helpers.js'

const section = (page, title) => page.locator('section', { has: page.locator('h2', { hasText: title }) })
const textareaSection = (page) => section(page, 'FormTextarea')
const field = (page, label) => textareaSection(page).getByLabel(label, { exact: true })
// Корень CharacterCounter — родитель скрытого текста с id `<id поля>-counter`.
const counter = async (page, label) => {
    const id = await field(page, label).getAttribute('id')

    return page.locator(`[id="${id}-counter"]`).locator('xpath=..')
}
// Корень компонента: родитель строки заголовка.
const componentRoot = (page, label) => labelOf(page, label).locator('xpath=../..')
const labelOf = (page, label) => textareaSection(page).locator('label', { hasText: label })

const LONG_LABEL = 'Очень длинный заголовок поля, который не помещается в одну строку и переносится'

// Центр первой строки заголовка.
const firstLineCenter = async (label) => {
    const box = await label.boundingBox()
    const lineHeight = await label.evaluate((node) => parseFloat(getComputedStyle(node).lineHeight))

    return box.y + lineHeight / 2
}

for (const file of pages) {
    test.describe(`FormTextarea, ${file}`, () => {
        test.beforeEach(async ({ page }) => {
            await openPlayground(page, file)
        })

        test('рамка как у FormInput', async ({ page }) => {
            const textarea = field(page, 'Комментарий')
            const input = section(page, 'FormInput').getByLabel('Имя', { exact: true })
            const properties = ['border-top-color', 'border-top-width', 'border-radius', 'background-color',
                'padding-left', 'padding-top', 'font-family', 'font-size', 'line-height', 'box-shadow']

            for (const property of properties) {
                const expected = await input.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property)
                await expect(textarea, property).toHaveCSS(property, expected)
            }

            await textarea.focus()
            await expectFocusRing(textarea)
        })

        test('счётчик: место и вид', async ({ page }) => {
            const textarea = field(page, 'Текст сообщения')
            const root = await counter(page, 'Текст сообщения')
            await textarea.scrollIntoViewIfNeeded()
            const textareaBox = await textarea.boundingBox()
            const rootBox = await root.boundingBox()

            expect(Math.abs(rootBox.x + rootBox.width - (textareaBox.x + textareaBox.width))).toBeLessThanOrEqual(0.5)
            expect(Math.abs(rootBox.y + rootBox.height / 2 - await firstLineCenter(labelOf(page, 'Текст сообщения')))).toBeLessThanOrEqual(1)

            const comment = field(page, 'Комментарий')
            await comment.scrollIntoViewIfNeeded()
            const commentBox = await comment.boundingBox()
            const commentTop = (await componentRoot(page, 'Комментарий').boundingBox()).y
            const messageTop = (await componentRoot(page, 'Текст сообщения').boundingBox()).y
            // Строка заголовка со счётчиком и без него одной высоты.
            const messageBox = await textarea.boundingBox()
            expect(Math.abs((messageBox.y - messageTop) - (commentBox.y - commentTop))).toBeLessThanOrEqual(0.5)

            await expect(root).toHaveCSS('font-size', '12px')
            await expect(root).toHaveCSS('line-height', '16px')
            await expectColor(root, 'color', 'gray-500')
            await expect(root.locator('[aria-hidden="true"]')).toHaveText('0 / 279')
        })

        test('сверх лимита первое число red-600', async ({ page }) => {
            const root = await counter(page, 'Сверх лимита')

            await expectColor(root.locator('[aria-hidden="true"] > span').first(), 'color', 'red-600')
            await expect(root.locator('[aria-hidden="true"]')).toHaveText('306 / 279')
        })

        test('ввод меняет счётчик', async ({ page }) => {
            await field(page, 'Текст сообщения').fill('абв')

            await expect((await counter(page, 'Текст сообщения')).locator('[aria-hidden="true"]')).toHaveText('3 / 279')
        })

        test('длинный заголовок', async ({ page }) => {
            const label = labelOf(page, LONG_LABEL)
            const root = await counter(page, LONG_LABEL)
            await field(page, LONG_LABEL).scrollIntoViewIfNeeded()
            const rootBox = await root.boundingBox()
            const labelBox = await label.boundingBox()
            const lineHeight = await label.evaluate((node) => parseFloat(getComputedStyle(node).lineHeight))

            expect(rootBox.height).toBeLessThanOrEqual(16.5)
            expect(Math.abs(rootBox.y + rootBox.height / 2 - await firstLineCenter(label))).toBeLessThanOrEqual(1)
            expect(labelBox.height).toBeGreaterThan(lineHeight)
        })

        test('растягивание по высоте', async ({ page }) => {
            const textarea = field(page, 'Комментарий')
            await expect(textarea).toHaveCSS('resize', 'vertical')
            await textarea.scrollIntoViewIfNeeded()
            const before = await textarea.boundingBox()

            await page.mouse.move(before.x + before.width - 3, before.y + before.height - 3)
            await page.mouse.down()
            await page.mouse.move(before.x + before.width + 57, before.y + before.height + 37, { steps: 10 })
            await page.mouse.up()
            const after = await textarea.boundingBox()

            expect(after.height).toBeGreaterThan(before.height)
            expect(after.width).toBeCloseTo(before.width, 0)
        })

        test('rows', async ({ page }) => {
            const ten = await field(page, 'Десять строк').boundingBox()
            const six = await field(page, 'Комментарий').boundingBox()

            expect(Math.abs(ten.height - six.height - 80)).toBeLessThanOrEqual(1)
        })
    })
}

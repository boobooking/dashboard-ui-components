import {
    test, expect, pages, openPlayground, expectColor, expectFocusRing, openPanel, waitForMenuReady, scrollToTrigger,
} from './helpers.js'

// Рамка, фон, скругление и тень поля формы — вид утилиты field-frame.
async function expectFieldFrame(frame) {
    await expect(frame).toHaveCSS('border-top-width', '1px')
    await expectColor(frame, 'border-top-color', 'gray-300')
    await expect(frame).toHaveCSS('border-top-left-radius', '6px')
    await expect(frame).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(frame).not.toHaveCSS('box-shadow', 'none')
}

for (const file of pages) {
    test.describe(`рамка поля: ${file}`, () => {
        test.beforeEach(async ({ page }) => {
            await openPlayground(page, file)
        })

        test('все видимые рамки полей', async ({ page }) => {
            // Поля поиска закрытых панелей остаются в DOM со display: none.
            const frames = page.locator('[class~="bb:field-frame"]:visible')
            const count = await frames.count()
            // Защита от пустой выборки: полноту миграции проверяет tests/fieldFrame.test.js.
            expect(count).toBeGreaterThan(20)

            for (let index = 0; index < count; index++) {
                const frame = frames.nth(index)
                // Рамка №index и её начало разметки: по сообщению видно, какое поле не прошло.
                const name = await frame.evaluate((element, number) => `рамка №${number} ${element.outerHTML.slice(0, 120)}`, index)
                try {
                    await expectFieldFrame(frame)
                    // Значение берётся из токена скругления: запись числа зависит от минификации.
                    const [fieldRadius, tokenRadius] = await frame.evaluate((element) => {
                        const style = getComputedStyle(element)
                        return ['--bb-field-radius', '--bb-radius-md'].map((property) => style.getPropertyValue(property).trim())
                    })
                    expect(fieldRadius, '--bb-field-radius').not.toBe('')
                    expect(fieldRadius, '--bb-field-radius равна --bb-radius-md').toBe(tokenRadius)
                } catch (error) {
                    error.message = `${name}\n${error.message}`
                    throw error
                }
            }
        })

        test('поле поиска в панели', async ({ page }) => {
            const example = page.locator('.bb-dashboard-ui').filter({
                has: page.getByText('Вендор с поиском', { exact: true }),
            }).first()
            const button = example.locator('button[popovertarget]')
            await scrollToTrigger(page, button)
            await button.click()
            await waitForMenuReady(page)

            const search = openPanel(page).getByRole('textbox')
            await expect(search).toBeFocused()
            await expectFieldFrame(search)
            await expectFocusRing(search)
        })
    })
}

import { test, expect, pages, openPlayground, expectFocusRing } from './helpers.js'

// ActionButton в настоящей вёрстке: размеры, ссылка, выключенная кнопка,
// основная кнопка DropdownButtonWithAction и фокус «Отмены» ConfirmationModal.
const section = (page) => page.locator('section', { has: page.locator('h2', { hasText: /^ActionButton$/ }) })

// Ряд примеров под подзаголовком раздела.
const row = (container, heading) =>
    container.locator('h3', { hasText: heading }).locator('xpath=following-sibling::div[1]')

const buttonCounter = (page) => section(page).locator('p', { hasText: /^Нажатий кнопок: \d+/ })

const clickCount = async (page) => Number(/Нажатий кнопок: (\d+)/.exec(await buttonCounter(page).textContent())[1])

// Основная кнопка DropdownButtonWithAction «Отправить заново»: в разделе
// «Несколько действий» — со стрелкой меню, в разделе «Одно действие» — без неё.
const dropdownMain = (page, heading) =>
    row(page.locator('section', { has: page.locator('h2', { hasText: /^DropdownButtonWithAction$/ }) }), heading)
        .getByRole('button', { name: 'Отправить заново' })

// Видимые слои box-shadow: непрозрачный цвет и хотя бы одна ненулевая длина.
// Computed-вид пишет нули как `0px`, а пустые слои Tailwind — прозрачным
// цветом, поэтому строку целиком сравнивать нельзя.
const visibleShadows = (locator) => locator.evaluate((element) => {
    const value = getComputedStyle(element).boxShadow
    if (value === 'none') {
        return []
    }
    return value.split(/,(?![^(]*\))/).map((layer) => layer.trim()).filter((layer) => {
        const color = /rgba?\(([^)]*)\)/.exec(layer)
        const alpha = color === null ? 1 : Number(color[1].split(/[\s,/]+/).filter(Boolean)[3] ?? 1)
        const lengths = [...layer.replace(/rgba?\([^)]*\)/, '').matchAll(/-?[\d.]+px/g)].map((match) => parseFloat(match[0]))
        return alpha > 0 && lengths.some((length) => length !== 0)
    })
})

const corners = (locator) => locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return [
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomRightRadius,
        style.borderBottomLeftRadius,
    ]
})

for (const file of pages) {
    test.describe(`ActionButton, ${file}`, () => {
        test.beforeEach(async ({ page }) => {
            await openPlayground(page, file)
        })

        test('высота 38 px, как у основной кнопки DropdownButtonWithAction; иконка 16 × 16 px', async ({ page }) => {
            const plain = row(section(page), 'двенадцать цветов').getByRole('button', { name: 'Без цвета' })
            const withIcon = row(section(page), 'Иконки').getByRole('button', { name: 'bank-transfer' })
            const main = dropdownMain(page, 'Несколько действий')

            const plainBox = await plain.boundingBox()
            expect(plainBox.height).toBe(38)
            expect((await withIcon.boundingBox()).height).toBe(38)
            expect((await main.boundingBox()).height).toBe(plainBox.height)

            const icon = await withIcon.locator('svg').boundingBox()
            expect([icon.width, icon.height]).toEqual([16, 16])
        })

        test('растянутая кнопка и ссылка: подпись по центру', async ({ page }) => {
            const stretched = row(section(page), 'Растянутая')
            for (const target of [stretched.locator('button'), stretched.locator('a')]) {
                const box = await target.boundingBox()
                const label = await target.locator('span').boundingBox()
                expect(box.width).toBeGreaterThan(180)
                expect(Math.abs((label.x + label.width / 2) - (box.x + box.width / 2))).toBeLessThanOrEqual(1)
            }
        })

        test('основная кнопка DropdownButtonWithAction: углы, своей тени нет, кольцо фокуса видно', async ({ page }) => {
            const plain = row(section(page), 'двенадцать цветов').getByRole('button', { name: 'Без цвета' })
            const withMenu = dropdownMain(page, 'Несколько действий')
            const single = dropdownMain(page, 'Одно действие')

            expect(await corners(withMenu)).toEqual(['6px', '0px', '0px', '6px'])
            expect(await corners(single)).toEqual(['6px', '6px', '6px', '6px'])

            // Отдельная кнопка несёт shadow-xs: проверка тени её видит.
            const ownShadow = await visibleShadows(plain)
            expect(ownShadow).toHaveLength(1)
            expect(ownShadow[0]).toContain('0px 1px 2px')
            expect(await visibleShadows(withMenu)).toEqual([])
            expect(await visibleShadows(single)).toEqual([])

            await withMenu.focus()
            await expectFocusRing(withMenu)
            expect(await visibleShadows(withMenu)).not.toEqual([])
        })

        test('ссылка уходит в navigate, страница не перезагружается', async ({ page }) => {
            const link = row(section(page), 'Ссылка').getByRole('link', { name: 'Создать пользователя' })
            await expect(link).toHaveAttribute('href', '#create')
            await expect(buttonCounter(page)).toContainText('последний переход: —')
            await page.evaluate(() => { window.actionButtonMarker = true })

            await link.click()

            await expect(buttonCounter(page)).toContainText('последний переход: #create')
            expect(await page.evaluate(() => window.actionButtonMarker)).toBe(true)
            expect(new URL(page.url()).hash).toBe('')
        })

        test('выключенная не нажимается, после переключателя — нажимается', async ({ page }) => {
            const disabled = row(section(page), 'Выключенные')
            const toggle = disabled.getByRole('button', { name: /^isDisabled/ })
            const names = ['Без цвета', 'green-solid', 'green-pale']
            await expect(toggle).toHaveText('isDisabled: да')

            for (const name of names) {
                const button = disabled.getByRole('button', { name, exact: true })
                await expect(button).toBeDisabled()
                const before = await clickCount(page)
                // force: Playwright иначе ждёт, пока кнопка станет доступной.
                await button.click({ force: true })
                // Обновление Vue успело бы пройти за два кадра.
                await page.evaluate(() => new Promise((resolve) => {
                    requestAnimationFrame(() => requestAnimationFrame(resolve))
                }))
                expect(await clickCount(page)).toBe(before)
            }

            await toggle.click()
            await expect(toggle).toHaveText('isDisabled: нет')

            for (const name of names) {
                const before = await clickCount(page)
                await disabled.getByRole('button', { name, exact: true }).click()
                await expect.poll(() => clickCount(page)).toBe(before + 1)
            }
        })

        for (const [opener, action] of [['Жёлтая', 'Начать отправку'], ['Красная', 'Удалить']]) {
            test(`ConfirmationModal (${opener.toLowerCase()}): после открытия фокус на «Отмене», кольцо видно`, async ({ page }) => {
                await page.getByRole('button', { name: opener, exact: true }).click()
                const dialog = page.getByRole('dialog')
                await expect(dialog.getByRole('button', { name: action })).toBeVisible()

                const cancel = dialog.getByRole('button', { name: 'Отмена' })
                await expect(cancel).toBeFocused()
                await expectFocusRing(cancel)
            })
        }
    })
}

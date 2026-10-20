import {
    test, expect, pages, openPlayground, buttonAfterHeading, hamburgerButton,
    openPanel, menuItem, arrowTo, openMenuByClick, expectColor,
} from './helpers.js'

// Фокус страницы одной строкой: чем он занят до и после наведения.
const focusDescription = (page) => page.evaluate(() => {
    const active = document.activeElement
    return `${active.tagName} ${active.id} ${active.value ?? active.textContent.trim().slice(0, 30)}`
})

const away = (page) => page.mouse.move(5, 5)

for (const file of pages) {
    test.describe(`наведение и цвета, ${file}`, () => {
        test.beforeEach(async ({ page }) => {
            await openPlayground(page, file)
        })

        test.describe('Мероприятие (SelectMultipleFilter с поиском)', () => {
            const open = async (page) => {
                const trigger = buttonAfterHeading(page, 'h3', 'Длинный список с поиском')
                await trigger.click()
                await expect(openPanel(page).locator('input')).toBeFocused()
                await away(page)
                return trigger
            }

            test('пункт под мышью подсвечен, фокус остаётся в поиске, набор идёт в поле', async ({ page }) => {
                await open(page)
                const third = menuItem(page, 'Мероприятие 3, Москва')
                await expectColor(third, 'background-color', 'white')
                await third.hover()
                await expectColor(third, 'background-color', 'indigo-100')
                await expect(openPanel(page).locator('input')).toBeFocused()
                await page.keyboard.type('Моск')
                await expect(openPanel(page).locator('input')).toHaveValue('Моск')
                await expect(openPanel(page).locator('input')).toBeFocused()
            })

            test('стрелки идут от пункта в фокусе, а не от мыши; Escape возвращает фокус на кнопку', async ({ page }) => {
                const trigger = await open(page)
                await page.keyboard.type('Моск')
                await menuItem(page, 'Мероприятие 9, Москва').hover()
                await page.keyboard.press('ArrowDown')
                await page.keyboard.press('ArrowDown')
                const focused = menuItem(page, 'Мероприятие 6, Москва')
                await expect(focused).toBeFocused()
                await away(page)
                await expectColor(focused, 'background-color', 'indigo-100')
                await expectColor(menuItem(page, 'Мероприятие 9, Москва'), 'background-color', 'white')
                await page.keyboard.press('Escape')
                await expect(openPanel(page)).toHaveCount(0)
                await expect(trigger).toBeFocused()
            })
        })

        const singles = [
            ['SelectSingleFilter', (page) => buttonAfterHeading(page, 'h2', 'SelectSingleFilter')],
            ['SelectSingleForm', (page) => page.locator('xpath=(//*[normalize-space(.)="Вендор"]/following::button[@popovertarget])[1]')],
        ]
        for (const [name, trigger] of singles) {
            test.describe(name, () => {
                test('наведение подсвечивает пункт и фокус не меняет', async ({ page }) => {
                    await trigger(page).click()
                    await expect(openPanel(page)).toBeVisible()
                    const before = await focusDescription(page)
                    const second = openPanel(page).locator('button').nth(1)
                    await second.hover()
                    await expectColor(second, 'background-color', 'indigo-100')
                    expect(await focusDescription(page)).toBe(before)
                })

                test('выбор мышью при фокусе на body: пункт выбран, фокус на кнопке', async ({ page }) => {
                    await trigger(page).click()
                    await expect(openPanel(page)).toBeVisible()
                    const second = openPanel(page).locator('button').nth(1)
                    const text = (await second.textContent()).trim()
                    await page.evaluate(() => document.activeElement.blur())
                    await second.click()
                    await expect(openPanel(page)).toHaveCount(0)
                    await expect(trigger(page)).toBeFocused()
                    await expect(trigger(page)).toContainText(text)
                })
            })
        }

        test.describe('DropdownButtonWithAction', () => {
            const open = async (page) => {
                const trigger = buttonAfterHeading(page, 'h3', 'Несколько действий')
                await openMenuByClick(page, trigger)
                await away(page)
                return trigger
            }

            test('цвета пунктов в покое', async ({ page }) => {
                await open(page)
                const red = menuItem(page, 'Удалить')
                await expectColor(red, 'background-color', 'red-100')
                await expectColor(red, 'color', 'red-800')
                await expectColor(menuItem(page, 'Отправить письмо'), 'background-color', 'yellow-100')
            })

            test('красный под мышью темнее, фокус не меняется, без мыши снова светлый', async ({ page }) => {
                await open(page)
                const red = menuItem(page, 'Удалить')
                const before = await focusDescription(page)
                await red.hover()
                await expectColor(red, 'background-color', 'red-200')
                expect(await focusDescription(page)).toBe(before)
                await away(page)
                await expectColor(red, 'background-color', 'red-100')
            })

            test('пункт без цвета под мышью подсвечен', async ({ page }) => {
                await open(page)
                const plain = menuItem(page, 'Поменять пароль')
                await plain.hover()
                await expectColor(plain, 'background-color', 'gray-100')
                await expectColor(plain, 'color', 'gray-900')
            })

            test('красный в фокусе темнее; фокус и мышь на разных пунктах подсвечивают оба', async ({ page }) => {
                await open(page)
                const red = menuItem(page, 'Удалить')
                const plain = menuItem(page, 'Поменять пароль')
                await arrowTo(page, 'Удалить')
                await expectColor(red, 'background-color', 'red-200')
                await plain.hover()
                await expect(red).toBeFocused()
                await expectColor(plain, 'background-color', 'gray-100')
                await expectColor(red, 'background-color', 'red-200')
            })

            test('Escape после стрелок закрывает меню, фокус на кнопке меню', async ({ page }) => {
                const trigger = await open(page)
                await arrowTo(page, 'Удалить')
                await page.keyboard.press('Escape')
                await expect(openPanel(page)).toHaveCount(0)
                await expect(trigger).toBeFocused()
            })
        })

        test.describe('HamburgerMenu', () => {
            test('цвета пунктов в покое, под мышью и без цвета под мышью', async ({ page }) => {
                await openMenuByClick(page, hamburgerButton(page))
                await away(page)
                const yellow = menuItem(page, 'Выйти на всех устройствах')
                const plain = menuItem(page, 'Поменять пароль')
                await expectColor(yellow, 'background-color', 'yellow-100')
                await expectColor(yellow, 'color', 'yellow-800')
                await yellow.hover()
                await expectColor(yellow, 'background-color', 'yellow-200')
                await plain.hover()
                await expectColor(plain, 'background-color', 'gray-100')
            })

            test('жёлтый в фокусе темнее', async ({ page }) => {
                await openMenuByClick(page, hamburgerButton(page))
                await away(page)
                await arrowTo(page, 'Выйти на всех устройствах')
                await expectColor(menuItem(page, 'Выйти на всех устройствах'), 'background-color', 'yellow-200')
            })
        })

        test.describe('меню строки таблицы', () => {
            test('«Удалить» в покое — фон red-100', async ({ page }) => {
                const trigger = page.locator('xpath=//h3[contains(., "page: пагинация")]/following::button[normalize-space(@aria-label)="Открыть меню" or normalize-space(.)="Открыть меню"][1]')
                await openMenuByClick(page, trigger)
                await away(page)
                await expectColor(menuItem(page, 'Удалить'), 'background-color', 'red-100')
            })
        })
    })
}

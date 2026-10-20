import {
    test, expect, pages, openPlayground, buttonAfterHeading, hamburgerButton,
    openPanel, menuItem, arrowTo, openMenuByClick, waitForMenuReady, scrollToTrigger,
} from './helpers.js'

// Меню открывает кнопка с popovertarget; фокус после закрытия должен
// вернуться на неё. В WebKit клик по кнопке фокус не ставит, поэтому меню
// открывается настоящим click().
const menus = [
    {
        name: 'DropdownButtonWithAction',
        trigger: (page) => buttonAfterHeading(page, 'h3', 'Несколько действий'),
        keyboardItem: 'Отправить письмо',
        buttonItem: 'Отправить письмо',
        linkItem: 'Поменять пароль',
        href: '#password',
    },
    {
        name: 'HamburgerMenu',
        trigger: hamburgerButton,
        keyboardItem: 'Выйти на всех',
        buttonItem: 'Выйти на всех',
        linkItem: 'Поменять пароль',
        href: '#password',
    },
]

const modalMenuTrigger = (page) => buttonAfterHeading(page, 'h2', 'ConfirmationModal', 3)

for (const file of pages) {
    test.describe(`возврат фокуса меню, ${file}`, () => {
        test.beforeEach(async ({ page }) => {
            await openPlayground(page, file)
        })

        for (const menu of menus) {
            test.describe(menu.name, () => {
                test('меню открыто мышью, стрелки и Escape: фокус на кнопке меню', async ({ page }) => {
                    const trigger = menu.trigger(page)
                    await openMenuByClick(page, trigger)
                    await arrowTo(page, menu.keyboardItem)
                    await page.keyboard.press('Escape')
                    await expect(openPanel(page)).toHaveCount(0)
                    await expect(trigger).toBeFocused()
                })

                test('выбор пункта-кнопки мышью: фокус на кнопке меню', async ({ page }) => {
                    const trigger = menu.trigger(page)
                    await openMenuByClick(page, trigger)
                    await menuItem(page, menu.buttonItem).click()
                    await expect(openPanel(page)).toHaveCount(0)
                    await expect(trigger).toBeFocused()
                })

                // navigate Playground только записывает адрес, страница не уходит.
                test('выбор пункта-ссылки мышью: navigate вызван, фокус на кнопке меню', async ({ page }) => {
                    const trigger = menu.trigger(page)
                    await openMenuByClick(page, trigger)
                    await menuItem(page, menu.linkItem).click()
                    await expect(page.getByText(`последний переход: ${menu.href}`).first()).toBeVisible()
                    await expect(page).toHaveURL(new RegExp(`${file}$`))
                    await expect(openPanel(page)).toHaveCount(0)
                    await expect(trigger).toBeFocused()
                })

                test('Enter на пункте: фокус на кнопке меню', async ({ page }) => {
                    const trigger = menu.trigger(page)
                    await openMenuByClick(page, trigger)
                    await arrowTo(page, menu.keyboardItem)
                    await page.keyboard.press('Enter')
                    await expect(openPanel(page)).toHaveCount(0)
                    await expect(trigger).toBeFocused()
                })
            })
        }

        test.describe('пункт меню открывает ConfirmationModal', () => {
            const cancel = (page) => page.getByRole('button', { name: 'Отмена' })

            test('пункт выбран мышью: фокус на «Отмена», после Escape модалки на кнопке меню', async ({ page }) => {
                const trigger = modalMenuTrigger(page)
                await openMenuByClick(page, trigger)
                await menuItem(page, 'Удалить').click()
                await expect(cancel(page)).toBeFocused()
                await page.keyboard.press('Escape')
                await expect(cancel(page)).toBeHidden()
                await expect(trigger).toBeFocused()
            })

            test('меню открыто мышью, пункт выбран Enter: фокус на «Отмена», после Escape модалки на кнопке меню', async ({ page }) => {
                const trigger = modalMenuTrigger(page)
                await openMenuByClick(page, trigger)
                await arrowTo(page, 'Удалить')
                await page.keyboard.press('Enter')
                await expect(cancel(page)).toBeFocused()
                await page.keyboard.press('Escape')
                await expect(cancel(page)).toBeHidden()
                await expect(trigger).toBeFocused()
            })

            test('всё клавиатурой: фокус на «Отмена», после Escape модалки на кнопке меню', async ({ page }) => {
                const trigger = modalMenuTrigger(page)
                await scrollToTrigger(page, trigger)
                await trigger.focus()
                await page.keyboard.press('Enter')
                await waitForMenuReady(page)
                await arrowTo(page, 'Удалить')
                await page.keyboard.press('Enter')
                await expect(cancel(page)).toBeFocused()
                await page.keyboard.press('Escape')
                await expect(cancel(page)).toBeHidden()
                await expect(trigger).toBeFocused()
            })
        })
    })
}

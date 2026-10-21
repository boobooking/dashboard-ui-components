import { test, expect, pages, openPlayground, expectColor } from './helpers.js'

const sectionOf = (page) => page.locator('section').filter({
    has: page.locator('h2', { hasText: 'SelectSingleCards и SelectMultipleList' }),
})

const field = (section) => section.getByLabel('Название', { exact: true })
const values = (section) => section.getByText(/^Выбрано:/)
const radio = (section, group, name) =>
    section.getByRole('radiogroup', { name: group, exact: true }).getByRole('radio', { name, exact: true })
// Внутри label локатор has считается от самой надписи, поэтому он начинается с page.
const card = (section, group, name) =>
    section.getByRole('radiogroup', { name: group, exact: true }).locator('label', {
        has: section.page().getByRole('radio', { name, exact: true }),
    })
// Одни и те же пункты стоят в трёх списках раздела: группа обязательна.
const checkbox = (section, group, name) =>
    section.getByRole('group', { name: group, exact: true }).getByRole('checkbox', { name, exact: true })

const computed = (locator, properties) => locator.evaluate((element, names) => {
    const style = getComputedStyle(element)
    return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name)]))
}, properties)

// Видимое кольцо пакета: линия blue-300 в 1px и ореол.
async function expectFocusRing(locator) {
    await expectColor(locator, 'outline-color', 'blue-300')
    await expect(locator).toHaveCSS('outline-width', '1px')
    await expect(locator).not.toHaveCSS('box-shadow', 'none')
}

// Кольца не видно: обводки нет или она прозрачная (@tailwindcss/forms ставит
// галочке в фокусе `outline: 2px solid transparent`), ореола нет.
async function expectNoFocusRing(locator) {
    const { 'outline-style': style, 'outline-color': color, 'box-shadow': shadow } =
        await computed(locator, ['outline-style', 'outline-color', 'box-shadow'])
    const transparent = /^rgba\(.*, 0\)$/.test(color) || color === 'transparent'
    expect(style === 'none' || transparent, `обводка: ${style} ${color}`).toBe(true)
    expect(shadow).toBe('none')
}

for (const file of pages) {
    test.describe(`SelectSingleCards и SelectMultipleList, ${file}`, () => {
        let section

        test.beforeEach(async ({ page }) => {
            await openPlayground(page, file)
            section = sectionOf(page)
            await section.scrollIntoViewIfNeeded()
        })

        test('Tab идёт по карточкам: первая без выбора, выбранная, затем список', async ({ page }) => {
            await field(section).focus()
            await page.keyboard.press('Tab')
            await expect(radio(section, 'Бренд', 'Royal Canin')).toBeFocused()
            await page.keyboard.press('Tab')
            await expect(radio(section, 'Способ валидации участника', 'Самостоятельно через ввод кода СМС')).toBeFocused()
            await page.keyboard.press('Tab')
            await expect(checkbox(section, 'Участники', 'Будущие владельцы')).toBeFocused()
        })

        test('стрелка вниз выбирает следующую карточку только в своей группе', async ({ page }) => {
            await radio(section, 'Способ валидации участника', 'Самостоятельно через ввод кода СМС').focus()
            await page.keyboard.press('ArrowDown')
            const next = radio(section, 'Способ валидации участника', 'При помощи промо-персонала')
            await expect(next).toBeChecked()
            await expect(next).toBeFocused()
            await expect(values(section)).toContainText('"validation":false')
            await expect(values(section)).toContainText('"brand":null')
        })

        test('Space выбирает карточку и красит её', async ({ page }) => {
            await field(section).focus()
            await page.keyboard.press('Tab')
            await page.keyboard.press('Space')
            await expect(values(section)).toContainText('"brand":"rc"')
            const royal = card(section, 'Бренд', 'Royal Canin')
            await expectColor(royal, 'background-color', 'indigo-50')
            await expectColor(royal, 'border-top-color', 'indigo-500')
        })

        test('Space отмечает и снимает галочки, порядок значений — порядок пунктов', async ({ page }) => {
            await checkbox(section, 'Участники', 'Будущие владельцы').focus()
            await page.keyboard.press('Space')
            await expect(checkbox(section, 'Участники', 'Будущие владельцы')).toBeChecked()
            await page.keyboard.press('Tab')
            await expect(checkbox(section, 'Участники', 'Ветеринарные врачи')).toBeFocused()
            await page.keyboard.press('Space')
            await expect(values(section)).toContainText('"participants":["future_owner","doctor"]')
            await page.keyboard.press('Space')
            await expect(values(section)).toContainText('"participants":["future_owner"]')
        })

        test('кольцо с клавиатуры: у карточки и у галочки один ореол', async ({ page }) => {
            await field(section).focus()
            await page.keyboard.press('Tab')
            const royal = card(section, 'Бренд', 'Royal Canin')
            await expectFocusRing(royal)
            const { 'box-shadow': cardShadow } = await computed(royal, ['box-shadow'])
            await page.keyboard.press('Tab')
            await page.keyboard.press('Tab')
            const first = checkbox(section, 'Участники', 'Будущие владельцы')
            await expect(first).toBeFocused()
            await expectFocusRing(first)
            // В host.html равенство ловит отступ ореола от @tailwindcss/forms.
            await expect(first).toHaveCSS('box-shadow', cardShadow)
        })

        test('клик мышью не рисует кольцо', async () => {
            await card(section, 'Бренд', 'Eukanuba').click()
            await expectNoFocusRing(card(section, 'Бренд', 'Eukanuba'))
            await section.getByRole('group', { name: 'Участники', exact: true }).getByText('Клубы', { exact: true }).click()
            const club = checkbox(section, 'Участники', 'Клубы')
            await expect(club).toBeChecked()
            await expectNoFocusRing(club)
        })

        test('отмеченная галочка: без картинки плагина форм, цвет indigo-600', async () => {
            await section.getByRole('group', { name: 'Участники', exact: true }).getByText('Клубы', { exact: true }).click()
            const club = checkbox(section, 'Участники', 'Клубы')
            await expect(club).toBeChecked()
            await expect(club).toHaveCSS('background-image', 'none')
            await expectColor(club, 'background-color', 'indigo-600')
        })

        test('три колонки: второй пункт под первым, третий и четвёртый в строке первого', async () => {
            const group = 'Четыре пункта в три колонки'
            const boxes = []
            for (const name of ['Будущие владельцы', 'Ветеринарные врачи', 'Владельцы', 'Волонтёры']) {
                boxes.push(await checkbox(section, group, name).boundingBox())
            }
            const [first, second, third, fourth] = boxes
            expect(new Set([first.x, second.x, third.x, fourth.x]).size).toBe(3)
            expect(second.x).toBe(first.x)
            expect(second.y).toBeGreaterThan(first.y)
            expect(third.y).toBe(first.y)
            expect(fourth.y).toBe(first.y)
        })
    })
}

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
// галочке в фокусе `outline: 2px solid transparent`), ореола нет. Значения
// перечитываются, пока не сойдутся. Прозрачность: ключевое слово, rgba() из
// четырёх компонентов через запятую с нулевой альфой или запись с `/ 0`.
const transparentColor = /^(transparent|rgba\(\s*[^,]+,[^,]+,[^,]+,\s*0(\.0+)?%?\s*\)|[a-z-]+\([^/]*\/\s*0(\.0+)?%?\s*\))$/
async function expectNoFocusRing(locator) {
    await expect.poll(async () => {
        const style = await computed(locator, ['outline-style', 'outline-color', 'box-shadow'])
        const noOutline = style['outline-style'] === 'none' || transparentColor.test(style['outline-color'])
        return {
            outline: noOutline ? 'none' : `${style['outline-style']} ${style['outline-color']}`,
            boxShadow: style['box-shadow'],
        }
    }).toEqual({ outline: 'none', boxShadow: 'none' })
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

        // У остальных носителей focus-ring кольцо появляется сразу. Анимация
        // outline-color и box-shadow вела бы линию за 150 мс из почти чёрной.
        test('кольцо карточки появляется сразу: линия и ореол не анимируются', async ({ page }) => {
            await field(section).focus()
            await page.keyboard.press('Tab')
            const royal = card(section, 'Бренд', 'Royal Canin')
            const { transitioned, animated } = await royal.evaluate((element) => ({
                transitioned: getComputedStyle(element).transitionProperty.split(',').map((name) => name.trim()),
                animated: element.getAnimations().map((animation) => animation.transitionProperty),
            }))
            await expect(radio(section, 'Бренд', 'Royal Canin')).toBeFocused()
            const ringProperties = ['all', 'outline', 'outline-color', 'box-shadow']
            expect({
                transitioned: transitioned.filter((name) => ringProperties.includes(name)),
                animated: animated.filter((name) => ringProperties.includes(name)),
            }).toEqual({ transitioned: [], animated: [] })
        })

        test('клик мышью не рисует кольцо', async () => {
            await card(section, 'Бренд', 'Eukanuba').click()
            await expect(radio(section, 'Бренд', 'Eukanuba')).toBeChecked()
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

        // Переключатель прозрачный, но картинку :checked видит Vimlike: с ней
        // метка выбранной карточки встаёт в центр, а не в угол, как у остальных.
        test('выбранная карточка: у переключателя нет картинки плагина форм', async () => {
            const selected = radio(section, 'Способ валидации участника', 'Самостоятельно через ввод кода СМС')
            await expect(selected).toBeChecked()
            await expect(selected).toHaveCSS('background-image', 'none')
        })

        test('три колонки: второй пункт под первым, третий и четвёртый в строке первого', async () => {
            const group = 'Четыре пункта в три колонки'
            const boxes = []
            for (const name of ['Будущие владельцы', 'Ветеринарные врачи', 'Владельцы', 'Волонтёры']) {
                boxes.push(await checkbox(section, group, name).boundingBox())
            }
            const [first, second, third, fourth] = boxes
            // Дробная ширина колонок: равенство в пределах полупикселя.
            const columns = [first.x, third.x, fourth.x].sort((a, b) => a - b)
            expect(columns[1] - columns[0]).toBeGreaterThan(1)
            expect(columns[2] - columns[1]).toBeGreaterThan(1)
            expect(second.x).toBeCloseTo(first.x, 0)
            expect(second.y).toBeGreaterThan(first.y)
            expect(third.y).toBeCloseTo(first.y, 0)
            expect(fourth.y).toBeCloseTo(first.y, 0)
        })
    })
}

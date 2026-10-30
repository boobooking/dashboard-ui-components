import {
    test, expect, pages, openPlayground, expectColor, expectFocusRing, openPanel, waitForMenuReady, scrollToTrigger,
} from './helpers.js'

const sectionOf = (page) => page.locator('section').filter({
    has: page.locator('h2', { hasText: 'Валюта и сумма' }),
})

const values = (section) => section.getByTestId('amount-values')

// Корень примера: только он содержит свою подпись или заголовок.
const example = (section, title) => section.locator('.bb-dashboard-ui').filter({
    has: section.page().getByText(title, { exact: true }),
})

const wholeOf = (section, label) => section.getByLabel(label, { exact: true })
const fromOf = (interval) => interval.getByRole('textbox', { name: 'от', exact: true })
const toOf = (interval) => interval.getByRole('textbox', { name: 'до', exact: true })

// Поле — корень AmountInput, родитель основной части. Одинаковые «Копейки» и
// «Очистить» диапазона различаются только им.
const fieldOf = (whole) => whole.locator('xpath=..')
const fraction = (field) => field.getByRole('textbox', { name: 'Копейки', exact: true })
const eraser = (field) => field.getByRole('button', { name: 'Очистить', exact: true })
const eraserIcon = (field) => eraser(field).locator('span:has(svg)')

const listButton = (scope) => scope.locator('button[popovertarget]')

// Рамка блока валюты — родитель корня AmountCurrency, а в корне лежит и скрытая
// подпись списка, и текст единственной валюты.
const currencyFrame = (blockChild) => blockChild.locator('xpath=../..')

const computed = (locator, properties) => locator.evaluate((element, names) => {
    const style = getComputedStyle(element)
    return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name)]))
}, properties)

const caret = (input) => input.evaluate((element) => [element.selectionStart, element.selectionEnd])

async function expectCaretAtEnd(input) {
    const { length } = await input.inputValue()
    await expect.poll(() => caret(input)).toEqual([length, length])
}

// Прошёл кадр после фокуса: поле ставит курсор в конец в следующем кадре и
// отменило бы выделение, сделанное раньше него. Человек быстрее кадра не успеет.
const framePassed = (page) => page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
}))

async function expectAllSelected(input) {
    const { length } = await input.inputValue()
    await expect.poll(() => caret(input)).toEqual([0, length])
}

// Сумма на экране: основная часть, разделитель и копейки, а без копеек только
// основная часть.
const shownAmount = (whole) => whole.evaluate((input) => {
    const part = input.parentElement.querySelector('[aria-label="Копейки"]')
    return part === null ? input.value : `${input.value}${part.previousElementSibling.textContent}${part.value}`
})

// После каждого Tab фокус на следующей остановке.
async function expectTabOrder(page, start, stops) {
    await start.focus()
    for (const stop of stops) {
        await page.keyboard.press('Tab')
        await expect(stop).toBeFocused()
    }
}

// Поиск оставляет единственный пункт: стрелка ставит на него фокус, Enter
// выбирает, список закрывается.
async function chooseFromList(page, trigger, query, item) {
    await scrollToTrigger(page, trigger)
    await trigger.click()
    await waitForMenuReady(page)
    await expect(openPanel(page).getByRole('textbox')).toBeFocused()
    await page.keyboard.type(query)
    await page.keyboard.press('ArrowDown')
    await expect(openPanel(page).getByRole('button', { name: item })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(openPanel(page)).toHaveCount(0)
}

// Граница текста кода и границы блока метки: код виден, пока лежит внутри блока.
const codeAndLabelEdges = (label) => label.evaluate((element) => {
    const range = document.createRange()
    range.setStart(element.firstChild, 0)
    range.setEnd(element.firstChild, 'XOF'.length)
    return { code: range.getBoundingClientRect().right, label: element.getBoundingClientRect().right }
})

const fitsInput = (input) => input.evaluate((element) => element.scrollWidth <= element.clientWidth)
const scrollOffset = (input) => input.evaluate((element) => element.scrollLeft)

for (const file of pages) {
    test.describe(`Валюта и сумма, ${file}`, () => {
        let section

        test.beforeEach(async ({ page }) => {
            await openPlayground(page, file)
            section = sectionOf(page)
            await section.scrollIntoViewIfNeeded()
        })

        test.describe('курсор основной части', () => {
            let whole

            test.beforeEach(() => {
                whole = wholeOf(section, 'Сумма перевода')
            })

            test('Tab в заполненное поле ставит курсор в конец, цифра дописывается', async ({ page }) => {
                await expectTabOrder(page, listButton(example(section, 'Валюта договора')), [whole])
                await expectCaretAtEnd(whole)
                await page.keyboard.type('7')
                await expect.poll(() => shownAmount(whole)).toBe('12 347,56')
                await expect(values(section)).toContainText('"transfer":{"amount":1234756,"currency":"USD"}')
            })

            test('клик в середину, Home и стрелка влево оставляют курсор в конце', async ({ page }) => {
                // Поле уже в фокусе: первый клик сам ставит курсор через событие focus.
                await whole.focus()
                await framePassed(page)
                // Цифры прижаты вправо: точка в 20px от края попадает между ними.
                const { width, height } = await whole.boundingBox()
                await whole.click({ position: { x: width - 20, y: height / 2 } })
                await expectCaretAtEnd(whole)

                // На macOS Home курсор в поле не двигает, начало строки там — Cmd+стрелка.
                for (const key of ['Home', 'ControlOrMeta+ArrowLeft', 'ArrowLeft']) {
                    await page.keyboard.press(key)
                    await expectCaretAtEnd(whole)
                }

                await page.keyboard.type('7')
                await expect.poll(() => shownAmount(whole)).toBe('12 347,56')
            })

            test('Cmd+A выделяет основную часть, ввод заменяет её', async ({ page }) => {
                await whole.click()
                await framePassed(page)
                await page.keyboard.press('ControlOrMeta+A')
                await expectAllSelected(whole)
                await page.keyboard.type('5')
                await expect.poll(() => shownAmount(whole)).toBe('5,56')
                await expect(values(section)).toContainText('"transfer":{"amount":556,"currency":"USD"}')
            })

            test('Tab в заполненное поле, затем Cmd+A и ввод заменяют всю основную часть', async ({ page }) => {
                await expectTabOrder(page, listButton(example(section, 'Валюта договора')), [whole])
                await expectCaretAtEnd(whole)
                await page.keyboard.press('ControlOrMeta+A')
                await expectAllSelected(whole)
                await page.keyboard.type('5')
                await expect.poll(() => shownAmount(whole)).toBe('5,56')
            })

            test('клик по подписи ставит фокус в основную часть', async () => {
                await section.getByText('Сумма перевода', { exact: true }).click()
                await expect(whole).toBeFocused()
            })
        })

        test.describe('порядок Tab', () => {
            test('AmountForm: основная часть, копейки, крестик, валюта', async ({ page }) => {
                const whole = wholeOf(section, 'Сумма перевода')
                const field = fieldOf(whole)
                await expectTabOrder(page, whole, [
                    fraction(field),
                    eraser(field),
                    listButton(example(section, 'Сумма перевода')),
                    wholeOf(section, 'Сумма в рублях'),
                ])
            })

            test('AmountForm без суммы: скрытый крестик пропускается', async ({ page }) => {
                const whole = wholeOf(section, 'Сумма перевода')
                const field = fieldOf(whole)
                await eraser(field).click()
                await expect(eraser(field)).toBeHidden()
                await expectTabOrder(page, whole, [
                    fraction(field),
                    listButton(example(section, 'Сумма перевода')),
                ])
            })

            test('AmountForm с одной валютой: валюта не входит в порядок', async ({ page }) => {
                const whole = wholeOf(section, 'Сумма в рублях')
                const field = fieldOf(whole)
                await expectTabOrder(page, whole, [
                    fraction(field),
                    eraser(field),
                    wholeOf(section, 'Сумма во франках КФА'),
                ])
            })

            test('AmountForm без крестика: копейки, затем валюта', async ({ page }) => {
                const whole = wholeOf(section, 'Сумма без крестика')
                await expectTabOrder(page, whole, [
                    fraction(fieldOf(whole)),
                    listButton(example(section, 'Сумма без крестика')),
                ])
            })

            for (const title of ['Диапазон суммы', 'Сумма заказа']) {
                test(`диапазон «${title}»: от, копейки, крестик, до, копейки, крестик, валюта`, async ({ page }) => {
                    const interval = example(section, title)
                    const from = fromOf(interval)
                    const to = toOf(interval)
                    await from.click()
                    await page.keyboard.type('1')
                    await to.click()
                    await page.keyboard.type('2')
                    await expectTabOrder(page, from, [
                        fraction(fieldOf(from)),
                        eraser(fieldOf(from)),
                        to,
                        fraction(fieldOf(to)),
                        eraser(fieldOf(to)),
                        listButton(interval),
                    ])
                })
            }

            test('диапазон без блока валюты: после крестика «до» фокус уходит из фильтра', async ({ page }) => {
                const interval = example(section, 'Сумма заказа в рублях')
                const from = fromOf(interval)
                const to = toOf(interval)
                await to.click()
                await page.keyboard.type('2')
                await expectTabOrder(page, from, [
                    fraction(fieldOf(from)),
                    to,
                    fraction(fieldOf(to)),
                    eraser(fieldOf(to)),
                    listButton(example(section, 'Вендор с поиском в панели')),
                ])
            })
        })

        test.describe('кольцо крестика', () => {
            const carriers = [
                ['AmountForm', (scope) => wholeOf(scope, 'Сумма перевода')],
                ['AmountIntervalForm', (scope) => fromOf(example(scope, 'Диапазон суммы'))],
                ['AmountIntervalFilter', (scope) => fromOf(example(scope, 'Сумма заказа'))],
            ]

            for (const [name, wholeLocator] of carriers) {
                test(`${name}: кольцо значка внутри поля, поле показывает своё`, async ({ page }) => {
                    const whole = wholeLocator(section)
                    const field = fieldOf(whole)
                    await whole.click()
                    await page.keyboard.type('5')
                    await expectTabOrder(page, whole, [fraction(field), eraser(field)])

                    // 3px — ореол утилиты focus-ring (ring-3) вокруг значка.
                    const icon = await eraserIcon(field).boundingBox()
                    const box = await field.boundingBox()
                    expect(icon.x - 3).toBeGreaterThanOrEqual(box.x)
                    expect(icon.y - 3).toBeGreaterThanOrEqual(box.y)
                    expect(icon.x + icon.width + 3).toBeLessThanOrEqual(box.x + box.width)
                    expect(icon.y + icon.height + 3).toBeLessThanOrEqual(box.y + box.height)

                    await expectFocusRing(eraserIcon(field))
                    await expectFocusRing(field)
                })
            }
        })

        test('USD, JPY, KWD и снова USD: сумма в минимальных единицах не меняется', async ({ page }) => {
            const transfer = example(section, 'Сумма перевода')
            const whole = wholeOf(section, 'Сумма перевода')
            await expect.poll(() => shownAmount(whole)).toBe('1 234,56')

            const steps = [
                ['JPY', '123 456'],
                ['KWD', '123,456'],
                ['USD', '1 234,56'],
            ]

            for (const [code, shown] of steps) {
                await chooseFromList(page, listButton(transfer), code, code)
                await expect(values(section)).toContainText(`"transfer":{"amount":123456,"currency":"${code}"}`)
                await expect.poll(() => shownAmount(whole)).toBe(shown)
            }
        })

        test.describe('длинная метка валюты', () => {
            const lists = [
                ['AmountForm', 'Сумма перевода'],
                ['AmountIntervalForm', 'Диапазон суммы'],
                ['AmountIntervalFilter', 'Сумма заказа'],
            ]

            for (const [name, title] of lists) {
                test(`${name}: метка в кнопке обрезается, код виден, рамка не растёт`, async ({ page }) => {
                    const scope = example(section, title)
                    const frame = currencyFrame(scope.getByText('Валюта', { exact: true }))
                    expect((await frame.boundingBox()).width).toBe(96)

                    await chooseFromList(page, listButton(scope), 'XOF', 'XOF')

                    const label = listButton(scope).getByText('XOF F CFA', { exact: true })
                    expect((await frame.boundingBox()).width).toBe(96)
                    await expect(label).toHaveCSS('text-overflow', 'ellipsis')
                    expect(await fitsInput(label)).toBe(false)
                    const edges = await codeAndLabelEdges(label)
                    expect(edges.code).toBeLessThanOrEqual(edges.label)
                })
            }

            test('единственная валюта: код виден, рамка не растёт', async () => {
                const label = example(section, 'Сумма во франках КФА').getByText('XOF F CFA', { exact: true })
                expect((await currencyFrame(label).boundingBox()).width).toBe(96)
                await expect(label).toHaveCSS('text-overflow', 'ellipsis')
                const edges = await codeAndLabelEdges(label)
                expect(edges.code).toBeLessThanOrEqual(edges.label)
            })
        })

        test.describe('вид поля суммы', () => {
            test('рамка высотой 38px цвета gray-300, у самих полей ввода ни рамки, ни отступов', async () => {
                const whole = wholeOf(section, 'Сумма перевода')
                const field = fieldOf(whole)
                const frame = field.locator('xpath=..')
                expect((await frame.boundingBox()).height).toBe(38)
                await expectColor(frame, 'border-top-color', 'gray-300')
                await expect(frame).toHaveCSS('border-top-width', '1px')

                for (const input of [whole, fraction(field)]) {
                    await expect(input).toHaveCSS('border-top-width', '0px')
                    await expect(input).toHaveCSS('border-left-width', '0px')
                    await expect(input).toHaveCSS('padding-left', '0px')
                    await expect(input).toHaveCSS('padding-top', '0px')
                    await expect(input).toHaveCSS('box-shadow', 'none')
                }
            })

            test('кольцо рисует корень поля, а не input', async ({ page }) => {
                const whole = wholeOf(section, 'Сумма перевода')
                const field = fieldOf(whole)
                await listButton(example(section, 'Валюта договора')).focus()

                // Плагин @tailwindcss/forms рисует кольцо на :focus, поэтому стили
                // проверяются, пока часть в фокусе.
                for (const input of [whole, fraction(field)]) {
                    await page.keyboard.press('Tab')
                    await expect(input).toBeFocused()
                    await expectFocusRing(field)
                    await expect(input).toHaveCSS('outline-style', 'none')
                    await expect(input).toHaveCSS('box-shadow', 'none')
                    await expect(input).toHaveCSS('border-top-width', '0px')
                }
            })
        })

        test('высота AmountIntervalFilter равна высоте SelectDateIntervalFilter', async ({ page }) => {
            const dateFilter = page.locator('section').filter({
                has: page.locator('h2', { hasText: 'SelectDateIntervalFilter' }),
            }).locator('.bb-dashboard-ui').first()
            const dateHeight = (await dateFilter.boundingBox()).height
            expect(dateHeight).toBe(72)
            expect((await example(section, 'Сумма заказа').boundingBox()).height).toBe(dateHeight)
        })

        // Одиннадцать цифр в обеих валютах. Сдвиг проверяется сразу после последней
        // цифры, пока фокус в копейках: WebKit прокручивает поле к курсору.
        const filterAmounts = [
            ['USD', '100000000,00', '100 000 000,00'],
            ['KWD', '10000000,000', '10 000 000,000'],
        ]

        for (const [code, typed, shown] of filterAmounts) {
            test(`поле AmountIntervalFilter вмещает ${shown} ${code}, копейки не сдвигаются`, async ({ page }) => {
                const interval = example(section, 'Сумма заказа')
                await chooseFromList(page, listButton(interval), code, code)

                for (const whole of [fromOf(interval), toOf(interval)]) {
                    const part = fraction(fieldOf(whole))
                    await whole.click()
                    await page.keyboard.type(typed)
                    await expect.poll(() => shownAmount(whole)).toBe(shown)
                    await expect(part).toBeFocused()
                    expect(await scrollOffset(part)).toBe(0)
                    expect(await scrollOffset(whole)).toBe(0)
                    expect(await fitsInput(whole)).toBe(true)
                    expect(await fitsInput(part)).toBe(true)
                }
            })
        }

        test.describe('список с поиском', () => {
            const lists = [
                ['SelectSingleForm', 'Вендор с поиском', 'втор', 'Второй вендор', '"searchVendor":"b"'],
                ['SelectSingleFilter', 'Вендор с поиском в панели', 'трет', 'Третий вендор', '"searchFilterVendor":"c"'],
                ['SelectCurrencyForm', 'Валюта договора', 'usd', 'USD $', '"formCurrency":"USD"'],
                ['SelectCurrencyFilter', 'Валюта отчёта', 'jpy', 'JPY ¥', '"filterCurrency":"JPY"'],
            ]

            for (const [name, title, query, item, value] of lists) {
                test(`${name}: открытие, поиск, Enter на пункте`, async ({ page }) => {
                    const button = listButton(example(section, title))
                    await chooseFromList(page, button, query, item)
                    await expect(values(section)).toContainText(value)
                    await expect(button).toContainText(item)
                    await expect(button).toBeFocused()
                })
            }
        })
    })
}

// Свойства, по которым поле не должно отличаться между окружениями. Шрифт
// сравнивается размером: стек шрифтов страница задаёт сама.
const lookProperties = [
    'height', 'box-sizing', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-top-color', 'border-top-left-radius', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin-top', 'margin-left', 'background-color', 'box-shadow', 'outline-style', 'font-size', 'line-height', 'text-align',
]

async function fieldLook(page, file) {
    await openPlayground(page, file)
    const section = sectionOf(page)
    const whole = wholeOf(section, 'Сумма перевода')
    const field = fieldOf(whole)
    const parts = { frame: field.locator('xpath=..'), field, whole, fraction: fraction(field), eraser: eraser(field) }
    const look = {}

    for (const [name, locator] of Object.entries(parts)) {
        const { width, height } = await locator.boundingBox()
        look[name] = { width, height, ...await computed(locator, lookProperties) }
    }

    return look
}

test('поле суммы выглядит одинаково в index.html и host.html', async ({ page }) => {
    const bare = await fieldLook(page, 'index.html')
    const host = await fieldLook(page, 'host.html')
    expect(host).toEqual(bare)
})

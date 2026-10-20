import { test as base, expect } from '@playwright/test'

export const pages = ['index.html', 'host.html']

// Ошибки и предупреждения консоли и pageerror собираются до `goto`;
// тест с ними падает.
export const test = base.extend({
    consoleProblems: [async ({ page }, use) => {
        // Состояние последнего toggle панели: openMenu по нему узнаёт, что
        // слушатели меню уже стоят (см. openMenu).
        await page.addInitScript(() => {
            document.addEventListener('toggle', (event) => {
                window.lastPanelState = event.newState
            }, true)
        })
        const problems = []
        page.on('console', (message) => {
            if (['error', 'warning'].includes(message.type())) {
                problems.push(`${message.type()}: ${message.text()}`)
            }
        })
        page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
        await use(problems)
        expect(problems).toEqual([])
    }, { auto: true }],
})

export { expect }

export async function openPlayground(page, file) {
    await page.goto(file)
    await expect(page.locator('h2', { hasText: 'ConfirmationModal' })).toBeVisible()
}

// Кнопка-стрелка или ☰ — первая кнопка после заголовка раздела.
export const buttonAfterHeading = (page, tag, text, number = 1) =>
    page.locator(`xpath=//${tag}[contains(., "${text}")]/following::button[${number}]`)

export const hamburgerButton = (page) =>
    page.locator('xpath=//span[.="Шапка"]/following::button[1]')

export const openPanel = (page) => page.locator('[popover]:popover-open')

export const menuItem = (page, text) =>
    openPanel(page).locator('a, button', { hasText: text }).first()

// Меню открыто и готово к клавишам. Слушатель стрелок панель ставит по
// событию toggle, которое браузер присылает позже открытия; стрелка до него
// прокручивает страницу, и панель закрывается по прокрутке. Состояние toggle
// запоминает init-скрипт фикстуры: в одной задаче с ним панель ставит свои
// слушатели, поэтому после ответа evaluate клавиши уже доходят.
export async function waitForMenuReady(page) {
    await expect(openPanel(page)).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.lastPanelState)).toBe('open')
}

// Кнопка меню в зоне видимости, и события прокрутки уже доставлены: событие
// scroll приходит в кадре после прокрутки, а прокрутка после открытия
// закрыла бы меню. Два кадра анимации гарантируют, что событие прошло.
export async function scrollToTrigger(page, trigger) {
    await trigger.scrollIntoViewIfNeeded()
    await page.evaluate(() => new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve))
    }))
}

// Меню открывает настоящий click() по кнопке меню.
export async function openMenuByClick(page, trigger) {
    await trigger.click()
    await waitForMenuReady(page)
}

// Стрелки вниз до пункта: с фокусом на кнопке меню первая стрелка ставит его
// на первый пункт.
export async function arrowTo(page, text) {
    const labels = await openPanel(page).locator('a, button').allTextContents()
    const index = labels.findIndex((label) => label.includes(text))
    expect(index, `пункт «${text}» в меню`).toBeGreaterThanOrEqual(0)
    for (let step = 0; step <= index; step++) {
        await page.keyboard.press('ArrowDown')
    }
    await expect(menuItem(page, text)).toBeFocused()
}

// Цвет токена пакета `--bb-color-<имя>` в computed-виде: пробный элемент
// внутри того же родителя, что и проверяемый.
async function tokenColor(locator, name, property) {
    return locator.evaluate((element, [name, property]) => {
        const probe = document.createElement('span')
        probe.style.setProperty(property, `var(--bb-color-${name})`)
        element.parentElement.appendChild(probe)
        const value = getComputedStyle(probe).getPropertyValue(property)
        probe.remove()
        return value
    }, [name, property])
}

export async function expectColor(locator, property, name) {
    const expected = name === 'white'
        ? 'rgb(255, 255, 255)'
        : await tokenColor(locator, name, property)
    await expect(locator).toHaveCSS(property, expected)
}

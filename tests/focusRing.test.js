// @vitest-environment node
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { compile } from '@tailwindcss/node'

// Вид фокуса пакета задаёт одна утилита focus-ring в src/styles/index.css:
// компоненты выбирают лишь момент (focus:, focus-visible:, group-focus-visible:).

const stylesDir = fileURLToPath(new URL('../src/styles', import.meta.url))
const componentsDir = fileURLToPath(new URL('../src/components', import.meta.url))

const FOCUS = '.bb\\:focus\\:focus-ring:focus'
const FOCUS_VISIBLE = '.bb\\:focus-visible\\:focus-ring:focus-visible'
const HAS_FOCUS_VISIBLE = '.bb\\:has-focus-visible\\:focus-ring:has(:focus-visible)'
const GROUP_FOCUS_VISIBLE = '.bb\\:group-focus-visible\\:focus-ring:is(:where(.bb\\:group):focus-visible *)'

const LINE_AND_HALO = [
    'outline-width: 1px',
    'outline-style: solid',
    'outline-color: var(--bb-color-blue-300)',
    'outline-offset: calc(1px * -1)',
    'calc(3px + var(--tw-ring-offset-width))',
    // цвет кольца лежит во вложенном @supports, поэтому проверяем его часть
    'var(--bb-color-blue-200) 50%',
]

async function buildCss() {
    const source = fs.readFileSync(`${stylesDir}/index.css`, 'utf8')
    const compiler = await compile(source, { base: stylesDir, onDependency() {} })

    return compiler.build(['bb:focus:focus-ring', 'bb:focus-visible:focus-ring', 'bb:group-focus-visible:focus-ring', 'bb:has-focus-visible:focus-ring', 'focus-ring'])
}

// Тело правила с точным селектором; вложенный @supports входит в тело.
function ruleBody(css, selector) {
    const start = css.indexOf(`${selector} {`)
    if (start === -1) return null

    let depth = 0
    for (let i = css.indexOf('{', start); i < css.length; i++) {
        if (css[i] === '{') depth++
        if (css[i] === '}') depth--
        if (depth === 0) return css.slice(start, i + 1)
    }

    return null
}

describe('утилита focus-ring', () => {
    it.each([
        ['focus', FOCUS],
        ['focus-visible', FOCUS_VISIBLE],
        ['group-focus-visible', GROUP_FOCUS_VISIBLE],
        ['has-focus-visible', HAS_FOCUS_VISIBLE],
    ])('вариант %s рисует линию 1px и ореол 3px', async (_name, selector) => {
        const rule = ruleBody(await buildCss(), selector)

        expect(rule).not.toBeNull()
        for (const declaration of LINE_AND_HALO) {
            expect(rule).toContain(declaration)
        }
    })

    it('без префикса bb правила нет', async () => {
        expect(await buildCss()).not.toContain('.focus-ring')
    })
})

describe('фокус календаря', () => {
    it.each([
        ['.bb-dashboard-ui .pika-prev:focus, .bb-dashboard-ui .pika-next:focus'],
        ['.bb-dashboard-ui .pika-label:has(.pika-select:focus-visible)'],
    ])('%s — линия и ореол утилиты, без оранжевой обводки', async (selector) => {
        const rule = ruleBody(await buildCss(), selector)

        expect(rule).not.toBeNull()
        for (const declaration of LINE_AND_HALO) {
            expect(rule).toContain(declaration)
        }
        expect(rule).not.toContain('#ff8000')
    })

    it('день под фокусом — оранжевый фон', async () => {
        expect(ruleBody(await buildCss(), '.bb-dashboard-ui .pika-button:focus')).toContain('background: #ff8000')
    })
})

// Строки в кавычках из шаблона: class, :class и panel-class; строка с
// focus-ring — класс одного узла.
function focusRingStrings(fileName) {
    const source = fs.readFileSync(`${componentsDir}/${fileName}`, 'utf8')
    const template = source.slice(source.indexOf('<template>'), source.indexOf('</template>'))

    return [...template.matchAll(/"([^"]*)"|'([^']*)'/g)]
        .map((match) => match[1] ?? match[2])
        .filter((value) => value.includes('focus-ring'))
}

describe('носители focus-ring', () => {
    const carriers = [
        ['FormInput.vue', 'bb:focus:focus-ring', 1],
        ['ActionPill.vue', 'bb:focus-visible:focus-ring', 1],
        ['PageTabs.vue', 'bb:focus-visible:focus-ring', 1],
        ['Pagination.vue', 'bb:focus-visible:focus-ring', 2],
        ['Search.vue', 'bb:focus:focus-ring', 1],
        ['RussianMobileFilter.vue', 'bb:focus:focus-ring', 1],
        ['DropdownButton.vue', 'bb:focus-visible:focus-ring', 1],
        ['SelectMultiple.vue', 'bb:focus:focus-ring', 1],
        ['CrossButton.vue', 'bb:group-focus-visible:focus-ring', 1],
        ['TextPopover.vue', 'bb:focus-visible:focus-ring', 2],
        ['NotificationMessage.vue', 'bb:focus:focus-ring', 1],
        ['ConfirmationModal.vue', 'bb:focus:focus-ring', 2],
        ['DropdownButtonWithAction.vue', 'bb:focus:focus-ring', 3],
        ['SelectSingleCards.vue', 'bb:has-focus-visible:focus-ring', 1],
    ]

    it.each(carriers)('%s: утилита %s на %i узлах, без focus:outline-hidden', (fileName, utility, count) => {
        const strings = focusRingStrings(fileName)
        const tokens = strings.map((value) => value.split(/\s+/))

        expect(strings).toHaveLength(count)
        for (const nodeTokens of tokens) {
            expect(nodeTokens).toContain(utility)
            expect(nodeTokens).not.toContain('bb:focus:outline-hidden')
        }
    })

    it('SelectDate: кнопка календаря — focus-visible, поле даты — focus, без focus:outline-hidden', () => {
        const strings = focusRingStrings('SelectDate.vue')
        const utilities = strings.map((value) => value.split(/\s+/).filter((token) => token.endsWith('focus-ring')))

        expect(utilities).toEqual([['bb:focus-visible:focus-ring'], ['bb:focus:focus-ring']])
        for (const value of strings) {
            expect(value.split(/\s+/)).not.toContain('bb:focus:outline-hidden')
        }
    })

    it('на кнопке CrossButton focus:outline-hidden остаётся', () => {
        const source = fs.readFileSync(`${componentsDir}/CrossButton.vue`, 'utf8')

        expect(source).toContain('bb:focus:outline-hidden')
    })

    it('DropdownButtonWithAction: z-10 остаётся рядом с утилитой', () => {
        for (const value of focusRingStrings('DropdownButtonWithAction.vue')) {
            expect(value.split(/\s+/)).toContain('bb:focus:z-10')
        }
    })

    it('кнопка действия ConfirmationModal: цвет кольца от типа окна не зависит', () => {
        const source = fs.readFileSync(`${componentsDir}/ConfirmationModal.vue`, 'utf8')

        expect(source).not.toMatch(/ring-(red|yellow)/)
    })
})

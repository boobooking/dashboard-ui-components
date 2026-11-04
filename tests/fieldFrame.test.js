// @vitest-environment node
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { compile } from '@tailwindcss/node'

// Рамку полей форм и поля поиска панелей задаёт одна утилита field-frame в
// src/styles/index.css; компоненты лишь ставят её на узел-носитель.

const stylesDir = fileURLToPath(new URL('../src/styles', import.meta.url))
const componentsDir = fileURLToPath(new URL('../src/components', import.meta.url))

const FRAME_PARTS = ['bb:rounded-md', 'bb:border', 'bb:border-gray-300', 'bb:bg-white', 'bb:shadow-xs', 'bb:leading-5']

describe('утилита field-frame', () => {
    it('рамка, скругление, фон, тень, --bb-field-radius', async () => {
        const source = fs.readFileSync(`${stylesDir}/index.css`, 'utf8')
        const compiler = await compile(source, { base: stylesDir, onDependency() {} })
        const css = compiler.build(['bb:field-frame'])
        const start = css.indexOf('.bb\\:field-frame {')

        expect(start).not.toBe(-1)

        const rule = css.slice(start, css.indexOf('\n  }', start))

        expect(rule).toMatch(/border-style: var\(--tw-border-style\);\s*border-width: 1px;/)
        expect(rule).toContain('border-color: var(--bb-color-gray-300)')
        expect(rule).toContain('border-radius: var(--bb-radius-md)')
        expect(rule).toContain('background-color: var(--bb-color-white)')
        expect(rule).toContain('--tw-shadow')
        expect(rule).toContain('box-shadow:')
        // скругление и переменная для частей внутри рамки — одно значение
        expect(rule).toContain('--bb-field-radius: var(--bb-radius-md)')
        expect(css).toContain('--bb-radius-md: 0.375rem')
    })
})

// Статические атрибуты class="…" из шаблона (без :class и panel-class).
function staticClasses(fileName) {
    const source = fs.readFileSync(`${componentsDir}/${fileName}`, 'utf8')
    const template = source.slice(source.indexOf('<template>'), source.indexOf('</template>'))

    return [...template.matchAll(/(?<![:\w-])class="([^"]*)"/g)].map((match) => match[1])
}

describe('носители field-frame', () => {
    const carriers = [
        ['FormInput.vue', 1], ['FormTextarea.vue', 1], ['AmountForm.vue', 2], ['AmountIntervalForm.vue', 3],
        ['SelectDateForm.vue', 1], ['SelectDateIntervalForm.vue', 2], ['SelectSingleForm.vue', 1],
        ['SelectMultipleForm.vue', 1], ['ListSearchField.vue', 1],
    ]

    it.each(carriers)('%s: bb:field-frame на %i узлах без прежних классов рамки', (fileName, count) => {
        const nodes = staticClasses(fileName).filter((value) => value.split(/\s+/).includes('bb:field-frame'))

        expect(nodes).toHaveLength(count)
        for (const value of nodes) {
            const tokens = value.split(/\s+/)

            for (const part of FRAME_PARTS) {
                expect(tokens).not.toContain(part)
            }
            expect(tokens.some((token) => token.startsWith('bb:[--bb-field-radius:'))).toBe(false)
        }
    })
})

describe('сторож рамки', () => {
    const components = fs.readdirSync(componentsDir).filter((name) => name.endsWith('.vue'))

    it('ни в одном статическом class компонентов нет bb:border-gray-300', () => {
        const offenders = components.filter((name) => staticClasses(name).some((value) => value.split(/\s+/).includes('bb:border-gray-300')))

        expect(offenders).toEqual([])
    })

    it('bb:[--bb-field-radius: нет ни в одном компоненте', () => {
        const offenders = components.filter((name) => fs.readFileSync(`${componentsDir}/${name}`, 'utf8').includes('bb:[--bb-field-radius:'))

        expect(offenders).toEqual([])
    })
})

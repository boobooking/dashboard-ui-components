// @vitest-environment node
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { compile } from '@tailwindcss/node'

// Толщину рамки кружка SelectSingleCards и квадрата SelectMultipleList задаёт
// одна утилита choice-border в src/styles/index.css.

const stylesDir = fileURLToPath(new URL('../src/styles', import.meta.url))

describe('choice-border', () => {
    it('рамка 1,5 px', async () => {
        const source = fs.readFileSync(`${stylesDir}/index.css`, 'utf8')
        const compiler = await compile(source, { base: stylesDir, onDependency() {} })

        expect(compiler.build(['bb:choice-border'])).toMatch(/\.bb\\:choice-border \{\s*border-width: 1\.5px;/)
    })
})

// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { hasCross, start, warnings } from './harness.js'

it('7b. холодное открытие карточки без fallback-url: крестика нет', async () => {
    await start('/bare/1')

    expect(hasCross()).toBe(false)
    expect(warnings).toEqual([])
})

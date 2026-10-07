// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { address, clickCross, hasCross, start, waitForAddress, warnings } from './harness.js'

it('7a. холодное открытие карточки с fallback-url: крестик ведёт на него, /undefined не появляется', async () => {
    await start('/users/7/edit')

    expect(hasCross()).toBe(true)

    await clickCross()

    await waitForAddress('/users')
    expect(address()).not.toContain('undefined')
    expect(warnings).toEqual([])
})

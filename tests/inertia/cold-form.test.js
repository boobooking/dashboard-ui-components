// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { address, clickCross, hasCross, start, waitForAddress, warnings } from './harness.js'

it('7c. холодное открытие формы с абсолютным запасным адресом: крестик ведёт на таб, а с таба — на его запасной адрес', async () => {
    await start('/groups/A/abs-keys')

    expect(hasCross()).toBe(true)

    await clickCross()

    await waitForAddress('/groups/A/certificates')
    expect(hasCross()).toBe(true)

    await clickCross()

    await waitForAddress('/groups')
    expect(address()).not.toContain('undefined')
    expect(warnings).toEqual([])
})

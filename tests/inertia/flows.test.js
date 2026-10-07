// @vitest-environment happy-dom
import { afterEach, beforeAll, expect, it } from 'vitest'
import { router } from '@inertiajs/vue3'
import {
    address,
    back,
    blocked,
    clickCross,
    go,
    hanging,
    hasCross,
    settle,
    start,
    visit,
    waitForAddress,
    warnings,
} from './harness.js'

// Одно приложение на файл: роутер Inertia — синглтон модуля. Каждый
// сценарий начинает со страницы без карточки, поэтому цепочка окон
// начинается заново (правило 5).
beforeAll(async () => {
    await start('/groups?status=new')
})

afterEach(() => {
    blocked.clear()
    hanging.clear()
    expect(warnings).toEqual([])
})

it('1. фильтр списка через replace, затем карточка: крестик — на заменённый фильтр', async () => {
    await visit('/groups?status=new')
    await visit('/groups?status=sending', { replace: true })
    await visit('/groups/A/orders')

    await clickCross()

    await waitForAddress('/groups?status=sending')
})

it('2. переход на текущий адрес с пересозданием страницы: крестик — на источник', async () => {
    await visit('/users?page=2')
    await visit('/users/1/edit')
    await visit('/users/1/edit')
    await visit('/users/1/edit')

    await clickCross()

    await waitForAddress('/users?page=2')
    expect(hasCross()).toBe(false)
})

it('3. таб → форма → закрытие формы → таб с фильтром → закрытие карточки', async () => {
    await visit('/groups?landing=1')
    await visit('/groups/A/orders')
    await visit('/groups/A/certificates?vendor=X')
    await visit('/groups/A/keys')

    await clickCross()
    await waitForAddress('/groups/A/certificates?vendor=X')
    await clickCross()

    await waitForAddress('/groups?landing=1')
})

it('4a. «Назад» с формы, затем крестик карточки — источник', async () => {
    await visit('/groups?landing=2')
    await visit('/groups/A/orders')
    await visit('/groups/A/certificates?vendor=Y')
    await visit('/groups/A/keys')

    await back()
    await waitForAddress('/groups/A/certificates?vendor=Y')
    await clickCross()

    await waitForAddress('/groups?landing=2')
})

it('4b. прыжок по истории с формы через промежуточный таб — источник', async () => {
    await visit('/groups?landing=3')
    await visit('/groups/A/orders')
    await visit('/groups/A/certificates?vendor=Z')
    await visit('/groups/A/keys')

    await go(-2)
    await waitForAddress('/groups/A/orders')
    await clickCross()

    await waitForAddress('/groups?landing=3')
})

it('5a. переход назад оборвался: карточка на экране, повторный крестик уходит на ту же цель', async () => {
    await visit('/users?page=3')
    await visit('/users/2/edit')
    blocked.add('/users?page=3')

    await clickCross()

    expect(address()).toBe('/users/2/edit')
    expect(hasCross()).toBe(true)

    blocked.clear()
    await clickCross()

    await waitForAddress('/users?page=3')
})

it('5b. переход назад отменён: карточка на экране, повторный крестик уходит на ту же цель', async () => {
    await visit('/users?page=4')
    await visit('/users/3/edit')
    hanging.add('/users?page=4')

    document.querySelector('button[aria-label="Назад"]').click()
    await settle()
    router.cancelAll()
    await settle()

    expect(address()).toBe('/users/3/edit')
    expect(hasCross()).toBe(true)

    hanging.clear()
    await clickCross()

    await waitForAddress('/users?page=4')
})

it('6. группа A → группа B в том же макете: крестик B — таб A, крестик A — источник', async () => {
    await visit('/groups?landing=4')
    await visit('/groups/A/orders')
    await visit('/groups/B/orders')

    await clickCross()
    await waitForAddress('/groups/A/orders')
    await clickCross()

    await waitForAddress('/groups?landing=4')
})

it('8. редактор переиспользован для другой записи (preserveState): крестик — первый редактор, затем источник', async () => {
    await visit('/users?page=5')
    await visit('/users/1/edit')
    await visit('/users/2/edit', { preserveState: true })

    await clickCross()
    await waitForAddress('/users/1/edit')
    await clickCross()

    await waitForAddress('/users?page=5')
})

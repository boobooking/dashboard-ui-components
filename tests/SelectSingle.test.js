// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import SelectSingle from '../src/components/SelectSingle.vue'

enableAutoUnmount(afterEach)

const items = [
    { id: 'a', name: 'Первый' },
    { id: 'b', name: 'Второй' },
    { id: 'c', name: 'Третий' },
]

// attachTo нужен фокусу: элементу вне документа его не дать.
function mountSelect(props = {}) {
    return mount(SelectSingle, { props: { header: 'Вендор', items, ...props }, attachTo: document.body })
}

function triggerOf(wrapper) {
    return wrapper.find('button')
}

function press(key) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    document.activeElement.dispatchEvent(event)
    return event
}

async function open(wrapper) {
    triggerOf(wrapper).element.focus()
    await triggerOf(wrapper).trigger('click')
    await flushPromises()
}

describe('SelectSingle', () => {
    it('не падает, если вместо списка пришёл null', () => {
        const errors = []
        mount(SelectSingle, {
            props: { header: 'Вендор', items: null },
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: () => {} } },
        })

        expect(errors).toEqual([])
    })

    it('в открытом списке стрелка вниз ведёт на первый пункт и не прокручивает страницу', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        const event = press('ArrowDown')

        expect(event.defaultPrevented).toBe(true)
        expect(document.activeElement.textContent).toBe('Первый')
    })

    it('отсчёт идёт от выбранного пункта', async () => {
        const wrapper = mountSelect({ modelValue: 'b' })
        await open(wrapper)

        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Третий')
    })

    it('в закрытом списке стрелки прокручивают страницу', () => {
        const wrapper = mountSelect()
        triggerOf(wrapper).element.focus()

        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })

    it('после выбора стрелки снова прокручивают страницу, а фокус возвращается на кнопку', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        press('ArrowDown')

        document.activeElement.click()
        await flushPromises()

        expect(wrapper.emitted('update:modelValue')).toEqual([['a']])
        expect(document.activeElement).toBe(triggerOf(wrapper).element)
        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })

    it('после закрытия по Escape фокус возвращается на кнопку', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        press('ArrowDown')

        press('Escape')
        await flushPromises()

        expect(document.activeElement).toBe(triggerOf(wrapper).element)
    })
})

describe('SelectSingle: пункты пропали при открытом списке', () => {
    function press(key) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
        document.activeElement.dispatchEvent(event)
        return event
    }

    it('стрелки снова прокручивают страницу, а вернувшиеся пункты открываются заново и ходят по новому списку', async () => {
        const wrapper = mount(SelectSingle, { props: { header: 'Вендор', items }, attachTo: document.body })
        wrapper.find('button').element.focus()
        await wrapper.find('button').trigger('click')
        await flushPromises()

        await wrapper.setProps({ items: [] })
        await flushPromises()

        const field = document.createElement('textarea')
        document.body.append(field)
        try {
            field.focus()
            expect(press('ArrowDown').defaultPrevented).toBe(false)
        } finally {
            field.remove()
        }

        await wrapper.setProps({ items })
        await flushPromises()
        wrapper.find('button').element.focus()
        await wrapper.find('button').trigger('click')
        await flushPromises()
        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Первый')
    })
})

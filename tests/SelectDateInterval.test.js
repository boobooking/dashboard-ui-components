// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import SelectDateInterval from '../src/components/SelectDateInterval.vue'
import { flushToggles, installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

describe('SelectDateInterval', () => {
    it('не падает на null и не шлёт changed на значения от родителя', async () => {
        const errors = []
        const wrapper = mount(SelectDateInterval, {
            props: { header: 'Период', dateFrom: null, dateTo: null },
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        await wrapper.setProps({ dateFrom: '01.02.2026' })
        await wrapper.setProps({ dateFrom: null, dateTo: null })

        expect(errors).toEqual([])
        expect(wrapper.emitted('changed')).toBeUndefined()
    })
})

describe('SelectDateInterval: календари на Popover API', () => {
    let uninstallPopover

    beforeEach(() => {
        uninstallPopover = installPopoverStub()
    })

    afterEach(() => {
        uninstallPopover()
    })

    async function settle() {
        await flushToggles()
        await flushPromises()
    }

    it('открытие календаря «до» закрывает календарь «от»', async () => {
        const wrapper = mount(SelectDateInterval, { props: { header: 'Период' }, attachTo: document.body })
        const [from, to] = wrapper.findAll('button[popovertarget]')
        const [fromPanel, toPanel] = wrapper.findAll('[popover]')

        await from.trigger('click')
        await settle()
        expect(fromPanel.element.matches(':popover-open')).toBe(true)

        await to.trigger('click')
        await settle()
        expect(toPanel.element.matches(':popover-open')).toBe(true)
        expect(fromPanel.element.matches(':popover-open')).toBe(false)
    })
})

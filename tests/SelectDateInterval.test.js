// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import SelectDateInterval from '../src/components/SelectDateInterval.vue'

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

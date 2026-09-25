// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import PickDay from '../src/components/PickDay.vue'

enableAutoUnmount(afterEach)

describe('PickDay', () => {
    it('не падает, если родитель передал null', async () => {
        const errors = []
        const wrapper = mount(PickDay, {
            props: { modelValue: null },
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        await wrapper.setProps({ modelValue: '01.02.2026' })
        await wrapper.setProps({ modelValue: null })

        expect(errors).toEqual([])
        expect(wrapper.get('input').element.value).toBe('')
    })
})

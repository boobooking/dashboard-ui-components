// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import RussianMobileFilter from '../src/components/RussianMobileFilter.vue'

enableAutoUnmount(afterEach)

describe('RussianMobileFilter', () => {
    it('не падает, если родитель передал null', async () => {
        const errors = []
        const wrapper = mount(RussianMobileFilter, {
            props: { header: 'Телефон', modelValue: null },
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        await wrapper.setProps({ modelValue: '79031234567' })
        await wrapper.setProps({ modelValue: null })

        expect(errors).toEqual([])
        expect(wrapper.get('input').element.value).toBe('')
    })
})

// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import ErrorMessages from '../src/components/ErrorMessages.vue'

enableAutoUnmount(afterEach)

describe('ErrorMessages', () => {
    it('не падает на null и ничего не рисует', () => {
        const errors = []
        const wrapper = mount(ErrorMessages, {
            props: { messages: null },
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: () => {} } },
        })

        expect(errors).toEqual([])
        expect(wrapper.find('p').exists()).toBe(false)
    })
})

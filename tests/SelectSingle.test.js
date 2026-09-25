// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import SelectSingle from '../src/components/SelectSingle.vue'

enableAutoUnmount(afterEach)

describe('SelectSingle', () => {
    it('не падает, если вместо списка пришёл null', () => {
        const errors = []
        mount(SelectSingle, {
            props: { header: 'Вендор', items: null },
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: () => {} } },
        })

        expect(errors).toEqual([])
    })
})

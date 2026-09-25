// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import Search from '../src/components/Search.vue'

enableAutoUnmount(afterEach)

describe('Search', () => {
    it('показывает значение, которое родитель задал после монтирования', async () => {
        const wrapper = mount(Search, { props: { header: 'Поиск', modelValue: 'евро' } })

        await wrapper.setProps({ modelValue: '' })

        expect(wrapper.get('input').element.value).toBe('')
    })

    it('не возвращает родителю значение, пришедшее от него же', async () => {
        const wrapper = mount(Search, { props: { header: 'Поиск', modelValue: 'евро' } })

        await wrapper.setProps({ modelValue: 'доллар' })

        expect(wrapper.get('input').element.value).toBe('доллар')
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
        expect(wrapper.emitted('changed')).toBeUndefined()
    })
})

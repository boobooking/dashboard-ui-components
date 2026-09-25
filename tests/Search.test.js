// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h } from 'vue'
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

    it('при вводе под v-model родителя шлёт по одному событию без эха', async () => {
        const Parent = {
            data() {
                return { query: '' }
            },
            render() {
                return h(Search, {
                    header: 'Поиск',
                    modelValue: this.query,
                    'onUpdate:modelValue': (value) => (this.query = value),
                })
            },
        }
        const wrapper = mount(Parent)
        const search = wrapper.findComponent(Search)

        await search.get('input').setValue('евро')

        expect(wrapper.vm.query).toBe('евро')
        expect(search.get('input').element.value).toBe('евро')
        expect(search.emitted('update:modelValue')).toEqual([['евро']])
        expect(search.emitted('changed')).toHaveLength(1)
    })
})

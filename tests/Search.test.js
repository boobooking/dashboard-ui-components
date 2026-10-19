// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
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

    it('не падает, если родитель передал null', async () => {
        const errors = []
        const wrapper = mount(Search, {
            props: { header: 'Поиск', modelValue: null },
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        expect(wrapper.get('input').element.value).toBe('')

        await wrapper.setProps({ modelValue: 'евро' })
        await wrapper.setProps({ modelValue: null })

        expect(errors).toEqual([])
        expect(wrapper.get('input').element.value).toBe('')
    })
})

describe('Search: фокус после ластика', () => {
    // Фокус на ластике — как после Tab; в happy-dom :focus-visible равен :focus.
    async function pressEraser(wrapper, { visible = true, moveFocusTo = null } = {}) {
        const eraser = wrapper.findAll('button').find((button) => button.find('path[d="M6 18L18 6M6 6l12 12"]').exists())
        const control = wrapper.get('input').element
        const focus = vi.spyOn(control, 'focus')
        if (!visible) {
            const matches = eraser.element.matches.bind(eraser.element)
            vi.spyOn(eraser.element, 'matches').mockImplementation((selector) => (selector === ':focus-visible' ? false : matches(selector)))
        }
        eraser.element.focus()

        await eraser.trigger('click')
        moveFocusTo?.focus()
        await Promise.all(eraser.element.getAnimations().map((animation) => animation.finished))
        await flushPromises()

        return focus
    }

    it('с клавиатуры фокус уходит на своё управление, события — по одному', async () => {
        const wrapper = mount(Search, { props: { header: 'Поиск', modelValue: 'евро' }, attachTo: document.body })

        const focus = await pressEraser(wrapper)

        expect(document.activeElement).toBe(wrapper.get('input').element)
        expect(focus).toHaveBeenCalledTimes(1)
        expect(focus).toHaveBeenCalledWith({ preventScroll: true })
        expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
        expect(wrapper.emitted('changed')).toHaveLength(1)
    })

    it('без :focus-visible фокус не переводится', async () => {
        const wrapper = mount(Search, { props: { header: 'Поиск', modelValue: 'евро' }, attachTo: document.body })

        const focus = await pressEraser(wrapper, { visible: false })

        expect(focus).not.toHaveBeenCalled()
        expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
        expect(wrapper.emitted('changed')).toHaveLength(1)
    })

    it('фокус ушёл с ластика до конца анимации: очистка выполнена, фокус на месте', async () => {
        const wrapper = mount(Search, { props: { header: 'Поиск', modelValue: 'евро' }, attachTo: document.body })
        const outside = document.createElement('button')
        document.body.appendChild(outside)

        const focus = await pressEraser(wrapper, { moveFocusTo: outside })

        expect(focus).not.toHaveBeenCalled()
        expect(document.activeElement).toBe(outside)
        expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
        expect(wrapper.emitted('changed')).toHaveLength(1)
    })
})

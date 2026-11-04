// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import CharacterCounter from '../src/components/CharacterCounter.vue'
import { dashboardUi } from '../src/plugin.js'

enableAutoUnmount(afterEach)

const mountCounter = (props = {}, global = {}) => {
    const errors = []
    const warnings = []
    const wrapper = mount(CharacterCounter, {
        props,
        global: {
            ...global,
            config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) },
        },
    })

    return { wrapper, errors, warnings }
}

const visible = (wrapper) => wrapper.get('[aria-hidden="true"]')
const hidden = (wrapper) => wrapper.get('#c-counter')

describe('CharacterCounter', () => {
    it.each([
        ['', 0],
        ['привет', 6],
        ['а\nб', 3],
        ['👍', 1],
        ['👨‍👩‍👧', 5],
    ])('%j — %i символов', (text, count) => {
        const { wrapper, errors, warnings } = mountCounter({ text, limit: 279, id: 'c-counter' })

        expect(visible(wrapper).text()).toBe(`${count} / 279`)
        expect(hidden(wrapper).text()).toBe(`Символов: ${count} из 279`)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it.each([[9, false], [10, false], [11, true]])('%i символов при лимите 10 — красный: %s', (length, isRed) => {
        const { wrapper, errors, warnings } = mountCounter({ text: 'я'.repeat(length), limit: 10, id: 'c-counter' })

        expect(wrapper.find('.bb\\:text-red-600').exists()).toBe(isRed)
        if (isRed) expect(wrapper.get('.bb\\:text-red-600').text()).toBe('11')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('null — 0', () => {
        const { wrapper, errors, warnings } = mountCounter({ text: null, limit: 10, id: 'c-counter' })

        expect(visible(wrapper).text()).toBe('0 / 10')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('en: Characters: 3 of 10', () => {
        const { wrapper, errors, warnings } = mountCounter({ text: 'abc', limit: 10, id: 'c-counter', lang: 'en' })

        expect(hidden(wrapper).text()).toBe('Characters: 3 of 10')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('язык плагина en без пропа lang', () => {
        const { wrapper, errors, warnings } = mountCounter(
            { text: 'abc', limit: 10, id: 'c-counter' },
            { plugins: [[dashboardUi, { lang: 'en' }]] },
        )

        expect(hidden(wrapper).text()).toBe('Characters: 3 of 10')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('скрытый текст — bb:sr-only, без aria-live', () => {
        const { wrapper, errors, warnings } = mountCounter({ text: 'abc', limit: 10, id: 'c-counter' })

        expect(hidden(wrapper).classes()).toContain('bb:sr-only')
        expect(wrapper.find('[aria-live]').exists()).toBe(false)
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('новый text — новые числа', async () => {
        const { wrapper, errors, warnings } = mountCounter({ text: 'abc', limit: 10, id: 'c-counter' })

        await wrapper.setProps({ text: 'abcde' })

        expect(visible(wrapper).text()).toBe('5 / 10')
        expect(hidden(wrapper).text()).toBe('Символов: 5 из 10')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })
})

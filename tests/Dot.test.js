// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import Dot from '../src/components/Dot.vue'
import { COLOR_NAMES, colorClass } from '../src/colors.js'

enableAutoUnmount(afterEach)

describe('Dot', () => {
    it.each(COLOR_NAMES)('%s — цвет mark из списка', (color) => {
        const wrapper = mount(Dot, { props: { color } })

        expect(wrapper.classes()).toContain(colorClass(color, 'mark'))
        expect(wrapper.get('svg').classes()).toContain('bb:fill-current')
    })

    it('withPulse — пульсация, без него — нет', () => {
        expect(mount(Dot, { props: { color: 'red', withPulse: true } }).classes()).toContain('bb:animate-pulse')
        expect(mount(Dot, { props: { color: 'red' } }).classes()).not.toContain('bb:animate-pulse')
    })

    it('цвет вне списка — предупреждение валидатора, точка без цвета', () => {
        const warnings = []
        const wrapper = mount(Dot, {
            props: { color: 'blue' },
            global: { config: { warnHandler: (message) => warnings.push(message) } },
        })

        expect(warnings.some((message) => message.includes('Invalid prop: custom validator check failed for prop "color"'))).toBe(true)
        expect(wrapper.classes().filter((name) => /^bb:text-[a-z]+-\d+$/.test(name))).toEqual([])
    })
})

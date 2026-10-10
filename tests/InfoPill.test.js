// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import InfoPill from '../src/components/InfoPill.vue'
import { COLOR_NAMES, colorClass } from '../src/colors.js'

enableAutoUnmount(afterEach)

// warnings собирает предупреждения Vue в тестах, которые нарочно передают
// недопустимое значение: вывод тестов остаётся чистым.
function mountPill(props, warnings = null) {
    return mount(InfoPill, {
        props,
        global: warnings === null ? {} : { config: { warnHandler: (message) => warnings.push(message) } },
    })
}

// Цветовые классы: фон и текст с тоном, без размера текста bb:text-xs.
function colorClasses(wrapper) {
    return wrapper.classes().filter((name) => /^bb:(?:bg|text)-[a-z]+-\d+$/.test(name))
}

describe('InfoPill', () => {
    it.each(COLOR_NAMES)('%s — классы pill из списка цветов', (color) => {
        const wrapper = mountPill({ text: 'Доставлено', color })

        expect(colorClasses(wrapper)).toEqual(colorClass(color, 'pill').split(' '))
        expect(wrapper.text()).toBe('Доставлено')
    })

    it('форма пилюли и ресет пакета на корне', () => {
        const wrapper = mountPill({ text: 'Найдено: 40', color: 'indigo' })

        expect(wrapper.element.tagName).toBe('SPAN')
        expect(wrapper.classes()).toEqual(expect.arrayContaining([
            'bb-dashboard-ui', 'bb:inline-flex', 'bb:items-center', 'bb:px-3', 'bb:py-2', 'bb:rounded-full',
            'bb:text-xs', 'bb:font-medium', 'bb:leading-none', 'bb:select-none', 'bb:whitespace-nowrap',
        ]))
    })

    it('null вместо текста — пустая пилюля; Vue отмечает только тип text', () => {
        const warnings = []
        const wrapper = mountPill({ text: null, color: 'gray' }, warnings)

        expect(wrapper.text()).toBe('')
        expect(warnings.length).toBeGreaterThan(0)
        expect(warnings.every((message) => message.includes('"text"'))).toBe(true)
    })

    it('цвет вне списка — предупреждение валидатора, пилюля без цветовых классов', () => {
        const warnings = []
        const wrapper = mountPill({ text: 'Синий', color: 'blue' }, warnings)

        expect(warnings.some((message) => message.includes('Invalid prop: custom validator check failed for prop "color"'))).toBe(true)
        expect(colorClasses(wrapper)).toEqual([])
        expect(wrapper.text()).toBe('Синий')
    })
})

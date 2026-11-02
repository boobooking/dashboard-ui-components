// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ActionIcon from '../src/components/ActionIcon.vue'
import { ACTION_ICONS, isActionIcon } from '../src/actionIcons.js'
import { itemIcon } from '../src/menuItems.js'

describe('ActionIcon', () => {
    // Размер иконок действий задан в одном месте, ActionIcon: у самих иконок
    // своего размера нет, иначе новая иконка могла бы выйти другого размера.
    it.each(Object.keys(ACTION_ICONS))('%s: svg 16 px без своего размера у самой иконки', (name) => {
        const icon = mount(ActionIcon, { props: { name } }).get('svg')

        expect(icon.classes()).toEqual(expect.arrayContaining([
            'bb:w-4', 'bb:h-4', 'bb:shrink-0', 'bb:pointer-events-none', 'bb:cursor-default',
        ]))
        expect(icon.attributes('aria-hidden')).toBe('true')
        expect(mount(ACTION_ICONS[name]).classes()).toEqual([])
        expect([icon.attributes('stroke'), icon.attributes('fill')]).toContain('currentColor')
    })

    it('без имени — пустой блок того же размера', () => {
        const wrapper = mount(ActionIcon)

        expect(wrapper.element.tagName).toBe('SPAN')
        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb:w-4', 'bb:h-4', 'bb:shrink-0']))
    })
})

describe('isActionIcon и itemIcon', () => {
    it.each(['pin', '', 'constructor', 'toString', 1, null, undefined, {}])('%s — не иконка', (value) => {
        expect(isActionIcon(value)).toBe(false)
        expect(itemIcon({ icon: value })).toBeNull()
    })

    it('plus — иконка', () => {
        expect(isActionIcon('plus')).toBe(true)
        expect(itemIcon({ icon: 'plus' })).toBe('plus')
    })
})

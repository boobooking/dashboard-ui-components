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

    it('список иконок общий и упорядочен', () => {
        expect(Object.keys(ACTION_ICONS)).toEqual(['plus', 'download', 'refresh', 'bank-transfer', 'currency-exchange'])
    })

    it.each([
        ['bank-transfer', 'M2 9l10-7 10 7H2zM4.5 12v6M9.5 12v6M14.5 12v6M19.5 12v6M3.5 18h17M2 22h20'],
        ['currency-exchange', 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'],
    ])('%s: путь и штрих как у остальных иконок', (name, path) => {
        const pathElement = mount(ActionIcon, { props: { name } }).get('svg path')

        expect(pathElement.attributes()).toMatchObject({
            d: path, 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        })
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

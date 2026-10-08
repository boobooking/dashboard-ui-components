// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import * as pkg from '../src/index.js'

describe('публичная поверхность пакета', () => {
    it('Modal — внутренний, не экспортируется', () => {
        expect(pkg).not.toHaveProperty('Modal')
    })

    // Части SelectSingle, SelectDateInterval и PageCard: проекты их
    // не используют.
    it.each(['Popup', 'PickDay', 'Closer'])('%s — внутренний, не экспортируется', (name) => {
        expect(pkg).not.toHaveProperty(name)
    })

    it('ровно пятнадцать компонентов и плагин', () => {
        expect(Object.keys(pkg).sort()).toEqual([
            'ConfirmationModal',
            'DataTable',
            'Dot',
            'DownloadLink',
            'DropdownButtonWithAction',
            'ErrorMessages',
            'HamburgerMenu',
            'NavigationMenuElement',
            'NotificationMessage',
            'PageCard',
            'RussianMobileFilter',
            'Search',
            'SelectDateInterval',
            'SelectSingle',
            'SmallBadge',
            'dashboardUi',
        ])
    })

    it('Pagination — внутренний, рисуется только внутри DataTable', () => {
        expect(pkg).not.toHaveProperty('Pagination')
    })
})

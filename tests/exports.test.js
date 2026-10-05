// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import * as pkg from '../src/index.js'

describe('публичная поверхность пакета', () => {
    it('Modal — внутренний, не экспортируется', () => {
        expect(pkg).not.toHaveProperty('Modal')
    })

    it('ровно семнадцать компонентов и плагин', () => {
        expect(Object.keys(pkg).sort()).toEqual([
            'Closer',
            'ConfirmationModal',
            'Dot',
            'DownloadLink',
            'DropdownButtonWithAction',
            'ErrorMessages',
            'NavigationMenuElement',
            'NotificationMessage',
            'PageCard',
            'Pagination',
            'PickDay',
            'Popup',
            'RussianMobileFilter',
            'Search',
            'SelectDateInterval',
            'SelectSingle',
            'SmallBadge',
            'dashboardUi',
        ])
    })
})

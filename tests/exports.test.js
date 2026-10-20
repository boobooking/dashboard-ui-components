// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import * as pkg from '../src/index.js'

describe('публичная поверхность пакета', () => {
    it('Modal — внутренний, не экспортируется', () => {
        expect(pkg).not.toHaveProperty('Modal')
    })

    // Части SelectSingle, SelectDateInterval, PageCard и фильтров: проекты
    // их не используют.
    it.each(['Popup', 'PickDay', 'CrossButton'])('%s — внутренний, не экспортируется', (name) => {
        expect(pkg).not.toHaveProperty(name)
    })

    // Ядра обёрток …Filter и …Form: проекты берут обёртки.
    it.each(['SelectSingle', 'SelectMultiple', 'SelectDate', 'SelectDateInterval'])('%s — ядро, не экспортируется', (name) => {
        expect(pkg).not.toHaveProperty(name)
    })

    it('ровно двадцать четыре компонента, плагин и downloadFile', () => {
        expect(Object.keys(pkg).sort()).toEqual([
            'ActionPill',
            'ConfirmationModal',
            'DataTable',
            'Dot',
            'DropdownButtonWithAction',
            'ErrorMessages',
            'FormInput',
            'HamburgerMenu',
            'InfoPill',
            'NavigationMenuElement',
            'NotificationMessage',
            'PageCard',
            'PageTabs',
            'RussianMobileFilter',
            'Search',
            'SelectDateFilter',
            'SelectDateForm',
            'SelectDateIntervalFilter',
            'SelectDateIntervalForm',
            'SelectMultipleFilter',
            'SelectMultipleForm',
            'SelectSingleFilter',
            'SelectSingleForm',
            'TextPopover',
            'dashboardUi',
            'downloadFile',
        ])
    })

    it('downloadFile — функция', () => {
        expect(typeof pkg.downloadFile).toBe('function')
    })

    it('Pagination — внутренний, рисуется только внутри DataTable', () => {
        expect(pkg).not.toHaveProperty('Pagination')
    })
})

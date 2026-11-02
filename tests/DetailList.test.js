// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h } from 'vue'
import DetailList from '../src/components/DetailList.vue'
import DetailRow from '../src/components/DetailRow.vue'

enableAutoUnmount(afterEach)

describe('DetailRow', () => {
    it('название в dt, значение в dd', () => {
        const row = mount(DetailRow, { props: { title: 'Телефон' }, slots: { default: '+7 999' } })

        expect(row.element.tagName).toBe('DIV')
        expect([...row.element.children].map((child) => child.tagName)).toEqual(['DT', 'DD'])
        expect(row.get('dt').text()).toBe('Телефон')
        expect(row.get('dd').text()).toBe('+7 999')
    })

    it('значение — любая разметка страницы', () => {
        const row = mount(DetailRow, {
            props: { title: 'Чек' },
            slots: { default: '<a href="#receipt">фото</a><span>проверено</span>' },
        })

        expect(row.get('dd a').attributes('href')).toBe('#receipt')
        expect(row.get('dd span').text()).toBe('проверено')
    })

    it('две колонки и чередование, без порогов ширины', () => {
        const row = mount(DetailRow, { props: { title: 'Телефон' } })

        expect(row.classes()).toEqual(expect.arrayContaining([
            'bb:grid', 'bb:grid-cols-3', 'bb:gap-4', 'bb:px-6', 'bb:py-5', 'bb:bg-white', 'bb:odd:bg-gray-50',
        ]))
        expect(row.get('dd').classes()).toContain('bb:col-span-2')
        expect(row.html()).not.toMatch(/bb:(sm|md|lg|xl):/)
    })

    it('отступы браузера и начертание заданы самим компонентом', () => {
        const row = mount(DetailRow, { props: { title: 'Телефон' } })

        expect(row.get('dt').classes()).toEqual(expect.arrayContaining([
            'bb:m-0', 'bb:p-0', 'bb:text-sm', 'bb:leading-5', 'bb:font-normal', 'bb:text-gray-500',
        ]))
        expect(row.get('dd').classes()).toEqual(expect.arrayContaining([
            'bb:m-0', 'bb:p-0', 'bb:text-sm', 'bb:leading-5', 'bb:font-medium', 'bb:text-gray-900',
        ]))
    })

    it('колонки не раздвигает длинное значение', () => {
        const row = mount(DetailRow, { props: { title: 'Телефон' } })

        expect(row.get('dt').classes()).toContain('bb:wrap-break-word')
        expect(row.get('dd').classes()).toContain('bb:wrap-break-word')
    })

    it('без title — предупреждение Vue и без ошибок', () => {
        const warnings = []
        const errors = []
        const row = mount(DetailRow, {
            slots: { default: 'значение' },
            global: {
                config: {
                    warnHandler: (message) => warnings.push(message),
                    errorHandler: (error) => errors.push(error),
                },
            },
        })

        expect(warnings.some((message) => message.includes('Missing required prop: "title"'))).toBe(true)
        expect(errors).toEqual([])
        expect(row.get('dd').text()).toBe('значение')
    })

    it('class страницы ложится на строку', () => {
        const row = mount(DetailRow, { props: { title: 'Телефон' }, attrs: { class: 'mt-2' } })

        expect(row.classes()).toContain('mt-2')
    })

    it('вне списка не падает', () => {
        const errors = []
        const row = mount(DetailRow, {
            props: { title: 'Телефон' },
            slots: { default: '+7 999' },
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        expect(errors).toEqual([])
        expect(row.get('dd').text()).toBe('+7 999')
    })
})

describe('DetailList', () => {
    const rows = () => [
        h(DetailRow, { title: 'Телефон' }, () => '+7 999'),
        h(DetailRow, { title: 'Email' }, () => 'a@example.test'),
    ]

    it('строки лежат в dl прямыми дочерними элементами', () => {
        const list = mount(DetailList, { slots: { default: rows } })

        expect(list.element.tagName).toBe('DL')
        expect([...list.element.children].map((child) => child.tagName)).toEqual(['DIV', 'DIV'])
    })

    it('нижние углы скругляет и обрезает сам список', () => {
        const list = mount(DetailList)

        expect(list.classes()).toEqual(expect.arrayContaining([
            'bb:m-0', 'bb:p-0', 'bb:overflow-hidden', 'bb:rounded-b-lg',
        ]))
    })

    it('пустой слот не падает', () => {
        const list = mount(DetailList)

        expect(list.element.tagName).toBe('DL')
        expect(list.element.children).toHaveLength(0)
    })

    it('class страницы ложится на dl', () => {
        const list = mount(DetailList, { attrs: { class: 'mt-4' } })

        expect(list.classes()).toContain('mt-4')
    })

    it('на корнях нет класса сброса пакета: в значении разметка приложения', () => {
        const list = mount(DetailList, { slots: { default: rows } })

        expect(list.classes()).not.toContain('bb-dashboard-ui')
        expect(list.find('.bb-dashboard-ui').exists()).toBe(false)
    })
})

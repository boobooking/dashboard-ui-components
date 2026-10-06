// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import DataTable from '../src/components/DataTable.vue'

enableAutoUnmount(afterEach)

const rows = [
    { uuid: 'a', phone: '+79990000001', vendor: 'Сбер', certificate: 'Карта', amount: '500 ₽', comment: 'В очереди' },
    { uuid: 'b', phone: '+79990000002', vendor: 'Озон', certificate: 'Подарок', amount: '1 000 ₽', comment: 'Доставлено' },
]

const columns = [
    { key: 'phone', label: 'Телефон' },
    { key: 'vendor', label: 'Вендор / Сертификат', secondary: (row) => row.certificate },
    { key: 'amount', label: 'Номинал', align: 'right', muted: true },
    { key: 'comment', label: 'Состояние', wrap: true },
    { key: 'actions', align: 'right', narrow: true },
]

// quiet глушит предупреждение Vue в тестах, которые нарочно передают
// недопустимое значение пропа: вывод тестов остаётся чистым.
function mountTable(props = {}, slots = {}, { quiet = false } = {}) {
    return mount(DataTable, {
        props: { rows, columns, rowKey: 'uuid', ...props },
        slots,
        global: quiet ? { config: { warnHandler: () => {} } } : {},
    })
}

function headerTexts(wrapper) {
    return wrapper.findAll('th').map((th) => th.text())
}

function cellsOf(wrapper, rowIndex) {
    return wrapper.findAll('tbody tr')[rowIndex].findAll('td')
}

function scrollerOf(wrapper) {
    return wrapper.get('table').element.parentElement
}

describe('DataTable: столбцы', () => {
    it('рисует заголовки по label и выравнивает th и td по align', () => {
        const wrapper = mountTable()

        expect(headerTexts(wrapper)).toEqual(['Телефон', 'Вендор / Сертификат', 'Номинал', 'Состояние', ''])
        expect(wrapper.findAll('th')[0].classes()).toContain('bb:text-left')
        expect(wrapper.findAll('th')[2].classes()).toContain('bb:text-right')
        expect(wrapper.findAll('th')[0].attributes('scope')).toBe('col')
        expect(cellsOf(wrapper, 0)[2].classes()).toContain('bb:text-right')
    })

    it('узкий столбец — w-px, переносимый — без whitespace-nowrap', () => {
        const wrapper = mountTable()

        expect(wrapper.findAll('th')[4].classes()).toContain('bb:w-px')
        expect(cellsOf(wrapper, 0)[4].classes()).toContain('bb:w-px')
        expect(cellsOf(wrapper, 0)[3].classes()).not.toContain('bb:whitespace-nowrap')
        expect(cellsOf(wrapper, 0)[0].classes()).toContain('bb:whitespace-nowrap')
    })

    it('столбец с visible: false не рисуется вместе со своим слотом', () => {
        const wrapper = mountTable(
            { columns: [{ key: 'phone', label: 'Телефон' }, { key: 'cost', label: 'Стоимость', visible: false }] },
            { 'cell-cost': () => h('span', { class: 'cost' }, 'секрет') },
        )

        expect(headerTexts(wrapper)).toEqual(['Телефон'])
        expect(wrapper.find('.cost').exists()).toBe(false)
    })

    it('пропускает элементы columns без строкового key; align вне списка — left', () => {
        const wrapper = mountTable({
            columns: [null, 'phone', { label: 'Без ключа' }, { key: 'phone', label: 'Телефон', align: 'middle' }],
        })

        expect(headerTexts(wrapper)).toEqual(['Телефон'])
        expect(wrapper.findAll('th')[0].classes()).toContain('bb:text-left')
    })
})

describe('DataTable: ячейки', () => {
    it('ячейка по умолчанию: основная строка, серая вторая, muted', () => {
        const wrapper = mountTable()
        const [phone, vendor, amount] = cellsOf(wrapper, 0)

        expect(phone.get('div').text()).toBe('+79990000001')
        expect(phone.get('div').classes()).toContain('bb:text-gray-900')
        expect(vendor.findAll('div').map((div) => div.text())).toEqual(['Сбер', 'Карта'])
        expect(vendor.findAll('div')[1].classes()).toContain('bb:text-gray-400')
        expect(amount.get('div').classes()).toContain('bb:text-gray-400')
    })

    it('value-функция; null из неё — пустая ячейка', () => {
        const wrapper = mountTable({
            columns: [{ key: 'x', label: 'X', value: (row) => (row.uuid === 'a' ? null : row.uuid.toUpperCase()) }],
        })

        expect(cellsOf(wrapper, 0)[0].text()).toBe('')
        expect(cellsOf(wrapper, 1)[0].text()).toBe('B')
    })

    it('пустая вторая строка не рисуется', () => {
        const wrapper = mountTable({ columns: [{ key: 'phone', label: 'Т', secondary: () => '' }] })

        expect(cellsOf(wrapper, 0)[0].findAll('div')).toHaveLength(1)
    })

    it('слот cell-<key> получает row и index и заменяет ячейку', () => {
        const wrapper = mountTable({}, {
            'cell-actions': ({ row, index }) => h('button', `${row.uuid}-${index}`),
        })

        expect(cellsOf(wrapper, 1)[4].get('button').text()).toBe('b-1')
        expect(cellsOf(wrapper, 1)[4].find('div').exists()).toBe(false)
        expect(cellsOf(wrapper, 1)[4].classes()).toContain('bb:relative')
    })
})

describe('DataTable: строки', () => {
    it('строки полосатые; rowColor красит строку без полосатости', () => {
        const wrapper = mountTable({ rowColor: (row) => (row.uuid === 'a' ? 'red' : 'blue') })
        const [first, second] = wrapper.findAll('tbody tr')

        expect(first.classes()).toContain('bb:bg-red-50')
        expect(first.classes()).not.toContain('bb:even:bg-gray-50')
        expect(second.classes()).toContain('bb:bg-white')
        expect(second.classes()).toContain('bb:even:bg-gray-50')
    })

    it('green из rowColor — зелёная строка', () => {
        const wrapper = mountTable({ rowColor: () => 'green' })

        expect(wrapper.findAll('tbody tr')[0].classes()).toContain('bb:bg-green-50')
    })

    it('ключ строки по функции, по отсутствующему полю и по бросающей функции — без исключений', () => {
        expect(mountTable({ rowKey: (row) => row.uuid }).findAll('tbody tr')).toHaveLength(2)
        expect(mountTable({ rowKey: 'nothing' }).findAll('tbody tr')).toHaveLength(2)
        expect(mountTable({
            rowKey: () => {
                throw new Error('нет ключа')
            },
        }).findAll('tbody tr')).toHaveLength(2)
    })

    it('rows не массив — пустой список', () => {
        const wrapper = mountTable({ rows: null, emptyText: 'Не найдено записей' }, {}, { quiet: true })

        expect(wrapper.find('table').exists()).toBe(false)
        expect(wrapper.text()).toContain('Не найдено записей')
    })
})

describe('DataTable: бейдж, пустое состояние, пагинация', () => {
    const meta = { from: 1, to: 2, total: 40 }
    const links = { prev: null, next: '/list?page=2' }

    it('бейдж «Найдено» берёт число из meta.total, пагинация есть', () => {
        const wrapper = mountTable({ meta, links, foundText: 'Найдено ордеров' })

        expect(wrapper.text()).toContain('Найдено ордеров: 40')
        expect(wrapper.find('nav').exists()).toBe(true)
    })

    it('без meta число — длина rows, пагинации нет', () => {
        const wrapper = mountTable({ foundText: 'Найдено ордеров' })

        expect(wrapper.text()).toContain('Найдено ордеров: 2')
        expect(wrapper.find('nav').exists()).toBe(false)
    })

    it('пустой список — бейдж emptyText, нет таблицы и пагинации', () => {
        const wrapper = mountTable({
            rows: [],
            meta: { from: null, to: null, total: 0 },
            links: { prev: null, next: null },
            foundText: 'Найдено ордеров',
            emptyText: 'Не найдено ордеров',
        })

        expect(wrapper.text()).toContain('Не найдено ордеров')
        expect(wrapper.find('table').exists()).toBe(false)
        expect(wrapper.find('nav').exists()).toBe(false)
    })

    it('без текстов бейджа нет', () => {
        const wrapper = mountTable()

        expect(wrapper.find('.bb\\:rounded-full').exists()).toBe(false)
    })

    it('страница за последней: бейдж и пагинация без таблицы', () => {
        const wrapper = mountTable({
            rows: [],
            meta: { from: null, to: null, total: 40 },
            links: { prev: '/list?page=3', next: null },
            foundText: 'Найдено ордеров',
        })

        expect(wrapper.text()).toContain('Найдено ордеров: 40')
        expect(wrapper.find('table').exists()).toBe(false)
        expect(wrapper.find('nav').exists()).toBe(true)
    })

    it('#results-actions — только когда записи есть', () => {
        const slots = { 'results-actions': () => h('a', { class: 'export' }, 'скачать') }

        expect(mountTable({ foundText: 'Найдено' }, slots).find('.export').exists()).toBe(true)
        expect(mountTable({ rows: [], emptyText: 'Не найдено' }, slots).find('.export').exists()).toBe(false)
    })

    it('#results-actions, появившийся позже без foundText, даёт строку бейджа', async () => {
        const Page = defineComponent({
            props: { canExport: { type: Boolean, default: false } },
            render() {
                return h(
                    DataTable,
                    { rows, columns, rowKey: 'uuid' },
                    this.canExport ? { 'results-actions': () => h('a', { class: 'export' }, 'скачать') } : {},
                )
            },
        })
        const wrapper = mount(Page)

        expect(wrapper.find('.export').exists()).toBe(false)

        await wrapper.setProps({ canExport: true })
        await nextTick()

        expect(wrapper.find('.export').exists()).toBe(true)
    })
})

describe('DataTable: варианты', () => {
    it('page — тень и скругление, card — линия сверху; обе с прокруткой', () => {
        const page = mountTable()
        expect(scrollerOf(page).className).toContain('bb:overflow-x-auto')
        expect(scrollerOf(page).className).toContain('bb:shadow-sm')
        expect(scrollerOf(page).className).toContain('bb:sm:rounded-lg')

        const card = mountTable({ variant: 'card' })
        expect(scrollerOf(card).className).toContain('bb:overflow-x-auto')
        expect(scrollerOf(card).className).toContain('bb:border-t')
        expect(scrollerOf(card).className).not.toContain('bb:shadow-sm')
    })

    it('обёртка с прокруткой лежит в простом блоке, а не прямо в корне', () => {
        const wrapper = mountTable()

        expect(scrollerOf(wrapper).parentElement).not.toBe(wrapper.element)
        expect(scrollerOf(wrapper).parentElement.parentElement).toBe(wrapper.element)
    })

    it('отступы: page — бейдж my-4 и пагинация mt-6, card — блок таблицы и пагинация mt-4', () => {
        const meta = { from: 1, to: 2, total: 2 }
        const links = { prev: null, next: null }

        const page = mountTable({ meta, links, foundText: 'Найдено' })
        expect(page.get('nav').classes()).toContain('bb:mt-6')
        expect(page.element.firstElementChild.className).toContain('bb:my-4')

        const card = mountTable({ meta, links, foundText: 'Найдено', variant: 'card' })
        expect(card.get('nav').classes()).toContain('bb:mt-4')
        expect(scrollerOf(card).parentElement.className).toContain('bb:mt-4')
        expect(card.element.firstElementChild.className).not.toContain('bb:my-4')
    })

    it('variant вне списка — page', () => {
        const wrapper = mountTable({ variant: 'sheet' }, {}, { quiet: true })

        expect(scrollerOf(wrapper).className).toContain('bb:shadow-sm')
    })

    it('корень без класса сброса пакета', () => {
        const wrapper = mountTable()

        expect(wrapper.classes()).not.toContain('bb-dashboard-ui')
    })

    it('class и атрибуты страницы ложатся на единственный корень', () => {
        const wrapper = mount(DataTable, {
            props: { rows, columns, rowKey: 'uuid' },
            attrs: { class: 'page-table', 'data-test': 'users' },
        })

        expect(wrapper.element.tagName).toBe('DIV')
        expect(wrapper.classes()).toContain('page-table')
        expect(wrapper.attributes('data-test')).toBe('users')
    })
})

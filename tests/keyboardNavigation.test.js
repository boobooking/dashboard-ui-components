// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import ActionPill from '../src/components/ActionPill.vue'
import DropdownButtonWithAction from '../src/components/DropdownButtonWithAction.vue'
import HamburgerMenu from '../src/components/HamburgerMenu.vue'
import ListElement from '../src/components/ListElement.vue'
import NotificationMessage from '../src/components/NotificationMessage.vue'
import PageCard from '../src/components/PageCard.vue'
import Pagination from '../src/components/Pagination.vue'
import RussianMobileFilter from '../src/components/RussianMobileFilter.vue'
import Search from '../src/components/Search.vue'
import SelectDateInterval from '../src/components/SelectDateInterval.vue'
import SelectMultiple from '../src/components/SelectMultiple.vue'
import SelectSingle from '../src/components/SelectSingle.vue'
import TextPopover from '../src/components/TextPopover.vue'
import { installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

// Содержимое кнопок и ссылок пакета не ловит указатель и без курсора-руки;
// иконки скрыты от скринридера; у кнопки без текста подпись для скринридера —
// скрытый span.
//
// Курсор важен для Vimlike (расширение клавиатурной навигации Safari): он
// считает кнопкой любой элемент с cursor: pointer, а из вложенных таких
// элементов оставляет самый глубокий. Курсор наследуется, поэтому в кнопке
// с курсором-рукой — своим или от приложения (button { cursor: pointer }) —
// подсказка доставалась тексту, иконке (у <path> нет click()) или скрытой
// подписи, которую Vimlike считает невидимой. Без руки у содержимого
// подсказка одна — у самой кнопки. pointer-events-none оставляет мыши руку
// кнопки над содержимым. Оба свойства наследуются, поэтому правило — для
// дочерних элементов кнопки.
let uninstallPopover

beforeEach(() => {
    uninstallPopover = installPopoverStub()
})

afterEach(() => {
    uninstallPopover()
    document.body.innerHTML = ''
})

const CROSS_PATH = 'path[d="M6 18L18 6M6 6l12 12"]'

// Кнопка, внутри которой нарисован крестик.
const crossButton = (wrapper) => wrapper.findAll('button').find((button) => button.find(CROSS_PATH).exists())

// label — подпись кнопки без текста; null — у кнопки видимый текст.
const cases = [
    {
        name: 'PageCard — крестик',
        mount: () => mount(PageCard, { props: { fallbackUrl: '/list' } }),
        button: crossButton,
        label: 'Назад',
    },
    {
        name: 'Search — ластик',
        mount: () => mount(Search, { props: { header: 'Поиск', modelValue: 'abc' } }),
        button: crossButton,
        label: 'Очистить',
    },
    {
        name: 'RussianMobileFilter — ластик',
        mount: () => mount(RussianMobileFilter, { props: { header: 'Телефон', modelValue: '+79991234567' }, attachTo: document.body }),
        button: crossButton,
        label: 'Очистить',
    },
    {
        name: 'SelectMultiple — ластик',
        mount: () => mount(SelectMultiple, {
            props: { header: 'Бренд', items: [{ id: 'a', name: 'Сбер' }], modelValue: ['a'] },
            attachTo: document.body,
        }),
        button: crossButton,
        label: 'Очистить',
    },
    {
        name: 'SelectMultiple — кнопка списка',
        mount: () => mount(SelectMultiple, {
            props: { header: 'Бренд', items: [{ id: 'a', name: 'Сбер' }], modelValue: ['a'] },
            attachTo: document.body,
        }),
        button: (wrapper) => wrapper.find('button[popovertarget]'),
        label: null,
    },
    {
        name: 'SelectMultiple — ластик поиска',
        mount: () => {
            const wrapper = mount(SelectMultiple, {
                props: { header: 'Бренд', items: [{ id: 'a', name: 'Сбер' }], modelValue: [], withSearch: true },
                attachTo: document.body,
            })
            wrapper.get('input').setValue('а')
            return wrapper
        },
        button: crossButton,
        label: 'Очистить',
    },
    {
        name: 'SelectSingle — ластик',
        mount: () => mount(SelectSingle, {
            props: { header: 'Вендор', items: [{ id: 'a', name: 'Сбер' }], modelValue: 'a' },
            attachTo: document.body,
        }),
        button: crossButton,
        label: 'Очистить',
    },
    {
        name: 'SelectSingle — кнопка списка',
        mount: () => mount(SelectSingle, {
            props: { header: 'Вендор', items: [{ id: 'a', name: 'Сбер' }], modelValue: 'a' },
            attachTo: document.body,
        }),
        button: (wrapper) => wrapper.find('button[popovertarget]'),
        label: null,
    },
    {
        name: 'SelectSingle — пункт списка',
        mount: () => mount(ListElement, { props: { name: 'Сбер', isChecked: true } }),
        button: (wrapper) => wrapper.find('button'),
        label: null,
    },
    {
        name: 'SelectDateInterval — ластик даты',
        mount: () => mount(SelectDateInterval, { props: { header: 'Интервал', dateFrom: '01.10.2026' } }),
        button: crossButton,
        label: 'Очистить',
    },
    {
        name: 'SelectDateInterval — кнопка поля даты',
        mount: () => mount(SelectDateInterval, { props: { header: 'Интервал', dateFrom: '01.10.2026' } }),
        button: (wrapper) => wrapper.find('button[popovertarget]'),
        label: 'от 01.10.2026',
    },
    {
        name: 'HamburgerMenu — кнопка меню',
        mount: () => mount(HamburgerMenu, { props: { actions: [{ label: 'Выйти', onSelect: () => {} }] }, attachTo: document.body }),
        button: (wrapper) => wrapper.find('button[popovertarget]'),
        label: 'Открыть меню',
    },
    {
        name: 'DropdownButtonWithAction — стрелка меню',
        mount: () => mount(DropdownButtonWithAction, {
            props: { actions: [{ label: 'Посмотреть', href: '#view' }, { label: 'Пункт', onSelect: () => {} }] },
            attachTo: document.body,
        }),
        button: (wrapper) => wrapper.find('button[popovertarget]'),
        label: 'Открыть меню',
    },
    {
        name: 'NotificationMessage — крестик',
        mount: () => mount(NotificationMessage, { props: { modelValue: 'Текст', type: 'warning' }, attachTo: document.body }),
        button: (wrapper) => wrapper.find('button'),
        label: 'Закрыть',
    },
    {
        name: 'TextPopover — кнопка текста',
        mount: () => mount(TextPopover, { props: { text: 'Полный текст сообщения' }, attachTo: document.body }),
        button: (wrapper) => wrapper.find('button[popovertarget]'),
        label: 'Показать текст',
    },
    {
        name: 'ActionPill — иконка скачивания',
        mount: () => mount(ActionPill, { props: { title: 'скачать xlsx', icon: 'download' } }),
        button: (wrapper) => wrapper.find('button'),
        label: null,
    },
    {
        name: 'ActionPill — иконка обновления',
        mount: () => mount(ActionPill, { props: { title: 'запросить статусы', icon: 'refresh' } }),
        button: (wrapper) => wrapper.find('button'),
        label: null,
    },
    {
        name: 'ActionPill — часы на время работы',
        mount: () => mount(ActionPill, { props: { title: 'скачать xlsx', icon: 'download', isLoading: true } }),
        button: (wrapper) => wrapper.find('button'),
        label: null,
    },
    {
        name: 'Pagination — предыдущая страница',
        mount: () => mount(Pagination, { props: { links: { prev: '/list?page=1', next: '/list?page=3' }, meta: { from: 16, to: 30, total: 40 } } }),
        button: (wrapper) => wrapper.findAll('a')[0],
        label: null,
    },
    {
        name: 'Pagination — следующая страница',
        mount: () => mount(Pagination, { props: { links: { prev: '/list?page=1', next: '/list?page=3' }, meta: { from: 16, to: 30, total: 40 } } }),
        button: (wrapper) => wrapper.findAll('a')[1],
        label: null,
    },
]

describe('содержимое кнопок и ссылок', () => {
    for (const testCase of cases) {
        it(testCase.name, async () => {
            const wrapper = testCase.mount()
            // pikaday загружается в mounted() PickDay.
            await vi.dynamicImportSettled()
            await flushPromises()

            const button = testCase.button(wrapper)
            expect(button?.exists()).toBe(true)

            if (testCase.label !== null) {
                expect(button.get('.bb\\:sr-only').text()).toBe(testCase.label)
            }

            const children = [...button.element.children]
            expect(children.length).toBeGreaterThan(0)
            for (const child of children) {
                expect(child.classList.contains('bb:pointer-events-none')).toBe(true)
                expect(child.classList.contains('bb:cursor-default')).toBe(true)
            }

            for (const icon of button.findAll('svg')) {
                expect(icon.attributes('aria-hidden')).toBe('true')
            }
        })
    }
})

// Поле даты лежит не внутри кнопки календаря, а под ней: кнопка закрывает
// поле целиком. Поле внутри кнопки Vimlike считал кнопкой вместо неё — как
// самый глубокий кандидат — и отбрасывал как невидимое: указатель над полем
// достаётся кнопке. Поле остаётся обычным: в него можно перейти Tab и набрать
// дату.
describe('поле даты', () => {
    const dateField = (props = {}, global = {}) => mount(SelectDateInterval, { props: { header: 'Интервал', ...props }, global })

    it('кнопка календаря не содержит поля и лежит поверх него', async () => {
        const wrapper = dateField({ dateFrom: '01.10.2026' })
        await vi.dynamicImportSettled()
        await flushPromises()
        const button = wrapper.find('button[popovertarget]')

        expect(button.find('input').exists()).toBe(false)
        expect(button.find('label').exists()).toBe(false)
        expect(button.classes()).toEqual(expect.arrayContaining(['bb:absolute', 'bb:inset-0']))
        expect(button.element.parentElement.contains(wrapper.get('input').element)).toBe(true)
    })

    it('поле не только для чтения: дату можно набрать', async () => {
        const wrapper = dateField()
        await vi.dynamicImportSettled()
        await flushPromises()

        expect(wrapper.get('input').attributes('readonly')).toBeUndefined()
    })

    const nameCases = [
        { name: 'без даты — подсказка поля', props: {}, global: {}, expected: ['от', 'до'] },
        { name: 'с датой — подсказка и дата', props: { dateFrom: '01.10.2026', dateTo: '15.10.2026' }, global: {}, expected: ['от 01.10.2026', 'до 15.10.2026'] },
        { name: 'lang en', props: { lang: 'en', dateFrom: '01.10.2026' }, global: {}, expected: ['from 01.10.2026', 'to'] },
    ]

    for (const testCase of nameCases) {
        it(`доступное имя кнопки: ${testCase.name}`, async () => {
            const wrapper = dateField(testCase.props, testCase.global)
            await vi.dynamicImportSettled()
            await flushPromises()

            expect(wrapper.findAll('button[popovertarget]').map((button) => button.get('.bb\\:sr-only').text())).toEqual(testCase.expected)
        })
    }

    it('доступное имя кнопки следует за датой', async () => {
        const wrapper = dateField({ dateFrom: '01.10.2026' })
        await vi.dynamicImportSettled()
        await flushPromises()

        await wrapper.setProps({ dateFrom: '05.10.2026' })

        expect(wrapper.find('button[popovertarget]').get('.bb\\:sr-only').text()).toBe('от 05.10.2026')
    })
})

// Браузер собирает имя поля из всего текста его <label>, вместе со скрытыми
// подписями кнопок внутри. Ластик внутри <label> отдал бы полю своё имя
// «Очистить», поэтому кнопок в <label> поля нет.
describe('имя поля', () => {
    const fields = [
        { name: 'Search', mount: () => mount(Search, { props: { header: 'Поиск', modelValue: 'abc' } }) },
        { name: 'RussianMobileFilter', mount: () => mount(RussianMobileFilter, { props: { header: 'Телефон', modelValue: '+79991234567' }, attachTo: document.body }) },
        { name: 'SelectDateInterval', mount: () => mount(SelectDateInterval, { props: { header: 'Интервал', dateFrom: '01.10.2026', dateTo: '15.10.2026' } }) },
    ]

    for (const testCase of fields) {
        it(`${testCase.name}: ластик не в <label> поля`, async () => {
            const wrapper = testCase.mount()
            await vi.dynamicImportSettled()
            await flushPromises()

            expect(crossButton(wrapper)?.exists()).toBe(true)
            for (const input of wrapper.findAll('input')) {
                expect(input.element.closest('label')?.querySelector('button') ?? null).toBeNull()
            }
        })
    }
})

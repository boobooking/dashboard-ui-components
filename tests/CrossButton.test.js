// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { dashboardUi } from '../src/plugin.js'
import CrossButton from '../src/components/CrossButton.vue'
import PageCard from '../src/components/PageCard.vue'
import RussianMobileFilter from '../src/components/RussianMobileFilter.vue'
import Search from '../src/components/Search.vue'
import SelectDateInterval from '../src/components/SelectDateInterval.vue'
import SelectMultiple from '../src/components/SelectMultiple.vue'
import SelectSingle from '../src/components/SelectSingle.vue'
import { installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

// Кнопка-крестик: размер иконки — проп size, иконка в центре кнопки.
// Положение и размер самой кнопки задаёт тот, кто её использует.
let uninstallPopover

beforeEach(() => {
    uninstallPopover = installPopoverStub()
})

afterEach(() => {
    uninstallPopover()
    document.body.innerHTML = ''
})

const CROSS_PATH = 'path[d="M6 18L18 6M6 6l12 12"]'
const crossButton = (wrapper) => wrapper.findAll('button').find((button) => button.find(CROSS_PATH).exists())

// Утилиты положения и размера: их у корня крестика быть не должно.
const PLACEMENT = /^bb:(static|relative|absolute|fixed|sticky|inset|top-|right-|bottom-|left-|z-|w-|h-|size-|m[trblxy]?-|p[trblxy]?-)/

describe('CrossButton', () => {
    const sizes = [
        { size: 'small', icon: ['bb:w-6', 'bb:h-6'] },
        { size: 'large', icon: ['bb:w-8', 'bb:h-8'] },
    ]

    for (const testCase of sizes) {
        it(`size ${testCase.size} — иконка ${testCase.icon.join(' ')}`, () => {
            const wrapper = mount(CrossButton, { props: { size: testCase.size } })

            expect(wrapper.get('svg').classes()).toEqual(expect.arrayContaining(testCase.icon))
        })
    }

    it('size обязателен и только small или large', () => {
        const warnings = []
        const config = { warnHandler: (message) => warnings.push(message) }

        mount(CrossButton, { global: { config } })
        mount(CrossButton, { props: { size: 'medium' }, global: { config } })

        expect(warnings.some((message) => message.includes('Missing required prop: "size"'))).toBe(true)
        expect(warnings.some((message) => message.includes('Invalid prop: custom validator check failed for prop "size"'))).toBe(true)
    })

    it('иконка в центре кнопки', () => {
        const wrapper = mount(CrossButton, { props: { size: 'small' } })

        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb:flex', 'bb:items-center', 'bb:justify-center']))
    })

    it('цвет — серый 400, при наведении — 500', () => {
        const wrapper = mount(CrossButton, { props: { size: 'small' } })

        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb:text-gray-400', 'bb:hover:text-gray-500']))
    })

    it('положения и размера кнопки у корня нет', () => {
        for (const size of ['small', 'large']) {
            const wrapper = mount(CrossButton, { props: { size } })

            expect(wrapper.classes().filter((name) => PLACEMENT.test(name))).toEqual([])
        }
    })

    const labels = [
        { name: 'без плагина — «Очистить»', mount: () => mount(CrossButton, { props: { size: 'small' } }), expected: 'Очистить' },
        { name: 'плагин en — «Clear»', mount: () => mount(CrossButton, { props: { size: 'small' }, global: { plugins: [[dashboardUi, { lang: 'en' }]] } }), expected: 'Clear' },
        { name: 'проп lang en — «Clear»', mount: () => mount(CrossButton, { props: { size: 'small', lang: 'en' } }), expected: 'Clear' },
        { name: 'подпись из слота главнее языка', mount: () => mount(CrossButton, { props: { size: 'large' }, slots: { default: 'Назад' } }), expected: 'Назад' },
    ]

    for (const testCase of labels) {
        it(`подпись для скринридера: ${testCase.name}`, () => {
            const wrapper = testCase.mount()

            expect(wrapper.get('.bb\\:sr-only').text()).toBe(testCase.expected)
        })
    }
})

describe('CrossButton у тех, кто его использует', () => {
    // place — классы положения и размера кнопки, которые задаёт родитель.
    const cases = [
        {
            name: 'PageCard — крестик',
            mount: () => mount(PageCard, { props: { fallbackUrl: '/list' } }),
            icon: ['bb:w-8', 'bb:h-8'],
            place: ['bb:absolute', 'bb:top-0', 'bb:right-0', 'bb:w-8', 'bb:h-8'],
        },
        {
            name: 'Search — ластик',
            mount: () => mount(Search, { props: { header: 'Поиск', modelValue: 'abc' } }),
            icon: ['bb:w-6', 'bb:h-6'],
            place: ['bb:absolute', 'bb:top-0', 'bb:right-0', 'bb:h-full', 'bb:pr-2'],
        },
        {
            name: 'RussianMobileFilter — ластик',
            mount: () => mount(RussianMobileFilter, { props: { header: 'Телефон', modelValue: '+79991234567' }, attachTo: document.body }),
            icon: ['bb:w-6', 'bb:h-6'],
            place: ['bb:absolute', 'bb:top-0', 'bb:right-0', 'bb:h-full', 'bb:pr-2'],
        },
        {
            name: 'SelectMultiple — ластик',
            mount: () => mount(SelectMultiple, {
                props: { header: 'Бренд', items: [{ id: 'a', name: 'Сбер' }], modelValue: ['a'] },
                attachTo: document.body,
            }),
            icon: ['bb:w-6', 'bb:h-6'],
            place: ['bb:absolute', 'bb:top-0', 'bb:right-0', 'bb:h-full', 'bb:pr-2'],
        },
        {
            name: 'SelectSingle — ластик',
            mount: () => mount(SelectSingle, {
                props: { header: 'Вендор', items: [{ id: 'a', name: 'Сбер' }], modelValue: 'a' },
                attachTo: document.body,
            }),
            icon: ['bb:w-6', 'bb:h-6'],
            place: ['bb:absolute', 'bb:top-0', 'bb:right-0', 'bb:h-full', 'bb:pr-2'],
        },
        {
            name: 'SelectDateInterval — ластик даты',
            mount: () => mount(SelectDateInterval, { props: { header: 'Интервал', dateFrom: '01.10.2026' } }),
            icon: ['bb:w-6', 'bb:h-6'],
            place: ['bb:absolute', 'bb:top-0', 'bb:right-0', 'bb:h-full', 'bb:pr-2', 'bb:z-10'],
        },
    ]

    for (const testCase of cases) {
        it(testCase.name, async () => {
            const wrapper = testCase.mount()
            await vi.dynamicImportSettled()
            await flushPromises()
            const button = crossButton(wrapper)

            expect(button.get('svg').classes()).toEqual(expect.arrayContaining(testCase.icon))
            expect(button.classes()).toEqual(expect.arrayContaining(testCase.place))
        })
    }
})

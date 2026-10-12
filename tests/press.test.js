// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import CrossButton from '../src/components/CrossButton.vue'
import RussianMobileFilter from '../src/components/RussianMobileFilter.vue'
import Search from '../src/components/Search.vue'
import SelectDateInterval from '../src/components/SelectDateInterval.vue'
import SelectSingle from '../src/components/SelectSingle.vue'
import { installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

// Нажатие крестика: кнопка «вдавливается», действие — после анимации.
// Анимацию проигрывает happy-dom: её finished выполняется по окончании.
let uninstallPopover

beforeEach(() => {
    uninstallPopover = installPopoverStub()
})

afterEach(() => {
    uninstallPopover()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
})

async function pressFinished(element) {
    await Promise.all(element.getAnimations().map((animation) => animation.finished))
    await flushPromises()
}

function reduceMotion() {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener() {},
        removeEventListener() {},
    }))
}

const CROSS_PATH = 'path[d="M6 18L18 6M6 6l12 12"]'
const crossButton = (wrapper) => wrapper.findAll('button').find((button) => button.find(CROSS_PATH).exists())

const crosses = [
    { size: 'small', mount: (options = {}) => mount(CrossButton, { props: { size: 'small' }, attachTo: document.body, ...options }) },
    { size: 'large', mount: (options = {}) => mount(CrossButton, { props: { size: 'large' }, attachTo: document.body, ...options }) },
]

for (const cross of crosses) {
    describe(`CrossButton, size ${cross.size}: нажатие`, () => {
        it('кнопка «вдавливается», clicked — после анимации', async () => {
            const animate = vi.spyOn(Element.prototype, 'animate')
            const wrapper = cross.mount()

            await wrapper.trigger('click')

            expect(wrapper.emitted('clicked')).toBeUndefined()
            expect(animate).toHaveBeenCalledTimes(1)
            expect(animate.mock.calls[0]).toEqual([
                [{ transform: 'scale(1)' }, { transform: 'scale(0.8)' }, { transform: 'scale(1)' }],
                { duration: 150, easing: 'ease-out' },
            ])

            await pressFinished(wrapper.element)

            expect(wrapper.emitted('clicked')).toEqual([[]])
        })

        it('повторные нажатия во время анимации — одно событие, после неё — снова', async () => {
            const wrapper = cross.mount()

            await wrapper.trigger('click')
            await wrapper.trigger('click')
            await wrapper.trigger('click')
            await pressFinished(wrapper.element)

            expect(wrapper.emitted('clicked')).toHaveLength(1)

            await wrapper.trigger('click')
            await pressFinished(wrapper.element)

            expect(wrapper.emitted('clicked')).toHaveLength(2)
        })

        it('при «уменьшении движения» — без анимации и сразу', async () => {
            reduceMotion()
            const animate = vi.spyOn(Element.prototype, 'animate')
            const wrapper = cross.mount()

            await wrapper.trigger('click')
            await flushPromises()

            expect(animate).not.toHaveBeenCalled()
            expect(wrapper.emitted('clicked')).toEqual([[]])
        })

        it('размонтирование во время анимации — без события и без ошибок', async () => {
            const errors = []
            const wrapper = cross.mount({
                global: { config: { errorHandler: (error) => errors.push(error) } },
            })
            const element = wrapper.element

            await wrapper.trigger('click')
            const emitted = wrapper.emitted()
            wrapper.unmount()
            await pressFinished(element)

            expect(emitted.clicked).toBeUndefined()
            expect(errors).toEqual([])
        })
    })
}

describe('ластики фильтров: очистка после нажатия', () => {
    const cases = [
        {
            name: 'Search',
            mount: () => mount(Search, { props: { header: 'Поиск', modelValue: 'abc' }, attachTo: document.body }),
            expected: '',
        },
        {
            name: 'RussianMobileFilter',
            mount: () => mount(RussianMobileFilter, { props: { header: 'Телефон', modelValue: '+79991234567' }, attachTo: document.body }),
            expected: '',
        },
        {
            name: 'SelectSingle',
            mount: () => mount(SelectSingle, { props: { header: 'Вендор', items: [{ id: 'a', name: 'Сбер' }], modelValue: 'a' }, attachTo: document.body }),
            expected: null,
        },
        {
            name: 'SelectDateInterval',
            mount: () => mount(SelectDateInterval, { props: { header: 'Интервал', dateFrom: '01.10.2026' }, attachTo: document.body }),
            event: 'update:dateFrom',
            expected: '',
        },
    ]

    for (const testCase of cases) {
        it(testCase.name, async () => {
            const wrapper = testCase.mount()
            await vi.dynamicImportSettled()
            await flushPromises()
            const event = testCase.event ?? 'update:modelValue'
            const eraser = crossButton(wrapper)

            await eraser.trigger('click')

            expect(wrapper.emitted(event)).toBeUndefined()

            await pressFinished(eraser.element)

            expect(wrapper.emitted(event)).toEqual([[testCase.expected]])
        })
    }
})

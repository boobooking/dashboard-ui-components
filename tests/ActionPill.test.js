// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import ActionPill from '../src/components/ActionPill.vue'
import { COLOR_NAMES, colorClass } from '../src/colors.js'

enableAutoUnmount(afterEach)

const DOWNLOAD_PATH = 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'
const REFRESH_PATH = 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'

function mountPill(props = {}, warnings = null) {
    return mount(ActionPill, {
        props: { title: 'скачать xlsx', icon: 'download', ...props },
        global: warnings === null ? {} : { config: { warnHandler: (message) => warnings.push(message) } },
    })
}

function iconPath(wrapper) {
    return wrapper.find('svg path').attributes('d')
}

// Цветовые классы: фон и текст с тоном и наведение с тоном.
function colorClasses(wrapper) {
    return wrapper.classes().filter((name) => /^bb:(?:hover:)?(?:bg|text)-[a-z]+-\d+$/.test(name))
}

describe('ActionPill: вид', () => {
    it('кнопка с подписью, подсказкой и иконкой', () => {
        const wrapper = mountPill()

        expect(wrapper.element.tagName).toBe('BUTTON')
        expect(wrapper.attributes('type')).toBe('button')
        expect(wrapper.attributes('title')).toBe('скачать xlsx')
        expect(wrapper.text()).toBe('скачать xlsx')
        expect(iconPath(wrapper)).toBe(DOWNLOAD_PATH)
        expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true')
        expect(wrapper.classes()).toEqual(expect.arrayContaining([
            'bb-dashboard-ui', 'bb:inline-flex', 'bb:items-center', 'bb:px-3', 'bb:py-1.5', 'bb:rounded-full',
            'bb:text-xs', 'bb:font-medium', 'bb:leading-none', 'bb:select-none', 'bb:whitespace-nowrap', 'bb:cursor-pointer',
        ]))
    })

    it('icon refresh — стрелки обновления', () => {
        expect(iconPath(mountPill({ icon: 'refresh', title: 'запросить статусы' }))).toBe(REFRESH_PATH)
    })

    it('цвет по умолчанию — purple, с наведением', () => {
        expect(colorClasses(mountPill())).toEqual([...colorClass('purple', 'pill').split(' '), colorClass('purple', 'pillHover')])
    })

    it.each(COLOR_NAMES)('%s — классы pill и pillHover из списка', (color) => {
        expect(colorClasses(mountPill({ color }))).toEqual([...colorClass(color, 'pill').split(' '), colorClass(color, 'pillHover')])
    })

    it('клик — событие click без аргументов', async () => {
        const wrapper = mountPill()

        await wrapper.trigger('click')

        expect(wrapper.emitted('click')).toEqual([[]])
    })
})

describe('ActionPill: идёт работа', () => {
    it('погашена, недоступна, занята; часы и текст на время работы', () => {
        const wrapper = mountPill({ isLoading: true, loadingText: 'формируется отчёт' })

        expect(wrapper.attributes('disabled')).toBeDefined()
        expect(wrapper.attributes('aria-busy')).toBe('true')
        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb:opacity-60', 'bb:cursor-not-allowed']))
        expect(wrapper.classes()).not.toContain('bb:cursor-pointer')
        expect(colorClasses(wrapper)).toEqual(colorClass('purple', 'pill').split(' '))
        expect(wrapper.find('svg circle').exists()).toBe(true)
        expect(wrapper.find(`path[d="${DOWNLOAD_PATH}"]`).exists()).toBe(false)
        expect(wrapper.text()).toBe('формируется отчёт')
        expect(wrapper.attributes('title')).toBe('формируется отчёт')
    })

    it.each([null, ''])('loadingText %s — остаётся title', (loadingText) => {
        expect(mountPill({ isLoading: true, loadingText }).text()).toBe('скачать xlsx')
    })

    it('второй клик во время работы не проходит', async () => {
        const wrapper = mountPill()
        await wrapper.trigger('click')
        await wrapper.setProps({ isLoading: true })

        await wrapper.trigger('click')

        expect(wrapper.emitted('click')).toEqual([[]])
        expect(wrapper.classes()).toContain('bb:opacity-60')
    })

    it('работа кончилась — снова иконка, подпись и наведение', async () => {
        const wrapper = mountPill({ isLoading: true, loadingText: 'формируется отчёт' })

        await wrapper.setProps({ isLoading: false })

        expect(wrapper.attributes('disabled')).toBeUndefined()
        expect(wrapper.attributes('aria-busy')).toBeUndefined()
        expect(iconPath(wrapper)).toBe(DOWNLOAD_PATH)
        expect(wrapper.text()).toBe('скачать xlsx')
        expect(wrapper.classes()).toContain(colorClass('purple', 'pillHover'))
    })

    it('часы: стрелки крутятся вокруг центра, при «уменьшить движение» стоят', () => {
        const [hour, minute] = mountPill({ isLoading: true }).findAll('svg line')

        expect(minute.classes()).toEqual(['bb:origin-center', 'bb:animate-spin', 'bb:motion-reduce:animate-none'])
        expect(hour.classes()).toEqual(['bb:origin-center', 'bb:animate-[spin_12s_linear_infinite]', 'bb:motion-reduce:animate-none'])
        expect(minute.attributes()).toMatchObject({ x1: '12', y1: '12', x2: '12', y2: '6.5' })
        expect(hour.attributes()).toMatchObject({ x1: '12', y1: '12', x2: '15', y2: '12' })
    })
})

describe('ActionPill: неверные значения', () => {
    it('неизвестная иконка — предупреждение валидатора, пилюля без иконки', () => {
        const warnings = []
        const wrapper = mountPill({ icon: 'trash' }, warnings)

        expect(warnings.some((message) => message.includes('Invalid prop: custom validator check failed for prop "icon"'))).toBe(true)
        expect(wrapper.find('svg').exists()).toBe(false)
        expect(wrapper.text()).toBe('скачать xlsx')
    })

    it('цвет вне списка — предупреждение валидатора, без цветовых классов', () => {
        const warnings = []
        const wrapper = mountPill({ color: 'blue' }, warnings)

        expect(warnings.some((message) => message.includes('Invalid prop: custom validator check failed for prop "color"'))).toBe(true)
        expect(colorClasses(wrapper)).toEqual([])
    })

    it('title null — пустая подпись; Vue отмечает только тип title', () => {
        const warnings = []
        const wrapper = mountPill({ title: null }, warnings)

        expect(wrapper.text()).toBe('')
        expect(warnings.every((message) => message.includes('"title"'))).toBe(true)
    })
})

// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import TextPopover from '../src/components/TextPopover.vue'
import { dashboardUi } from '../src/plugin.js'
import { flushToggles, installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

let uninstallPopover

beforeEach(() => {
    uninstallPopover = installPopoverStub()
    // Стиль страницы, который подсказка обязана вернуть.
    document.documentElement.style.userSelect = 'text'
})

afterEach(() => {
    uninstallPopover()
    document.documentElement.style.userSelect = ''
    document.documentElement.style.webkitUserSelect = ''
})

async function settle() {
    await flushToggles()
    await flushPromises()
}

function mountPopover(props = {}, { warnings = null, global = {} } = {}) {
    return mount(TextPopover, {
        attachTo: document.body,
        props: { text: 'Полный текст сообщения', ...props },
        global: warnings === null ? global : { ...global, config: { warnHandler: (message) => warnings.push(message) } },
    })
}

// v-model, как у страницы: событие возвращается пропом.
function mountWithModel() {
    const wrapper = mountPopover({
        modelValue: false,
        'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
    })

    return wrapper
}

// Две подсказки в одном приложении, как на странице: useId() в разных
// приложениях дал бы обеим один и тот же id.
function mountPair() {
    return mount({
        data: () => ({ firstText: 'Полный текст сообщения', secondText: 'Другой текст' }),
        render() {
            return h('div', [h(TextPopover, { text: this.firstText }), h(TextPopover, { text: this.secondText })])
        },
    }, { attachTo: document.body })
}

const buttonOf = (wrapper) => wrapper.get('button[popovertarget]')
const panelOf = (wrapper) => wrapper.get('[popover]')
const isOpen = (wrapper) => panelOf(wrapper).element.matches(':popover-open')
const pageSelection = () => document.documentElement.style.userSelect

describe('TextPopover: вид и открытие', () => {
    it.each([
        ['пустая строка', '', (warnings) => expect(warnings).toEqual([])],
        ['null', null, (warnings) => {
            // Обязательный проп String с null Vue ругается на тип, компонента всё равно нет.
            expect(warnings.length).toBeGreaterThan(0)
            expect(warnings.every((message) => message.includes('"text"'))).toBe(true)
        }],
    ])('%s — компонента нет', (_, text, expectWarnings) => {
        const warnings = []
        mountPopover({ text }, { warnings })
        expectWarnings(warnings)

        expect(document.body.querySelector('button')).toBeNull()
        expect(document.body.querySelector('[popover]')).toBeNull()
    })

    it('кнопка с подписью для скринридера открывает область с текстом', async () => {
        const wrapper = mountPopover()
        expect(buttonOf(wrapper).get('.bb\\:sr-only').text()).toBe('Показать текст')
        expect(buttonOf(wrapper).get('svg').attributes('aria-hidden')).toBe('true')

        await buttonOf(wrapper).trigger('click')
        await settle()

        expect(isOpen(wrapper)).toBe(true)
        expect(panelOf(wrapper).text()).toBe('Полный текст сообщения')
        expect(panelOf(wrapper).attributes()).toMatchObject({ role: 'region', 'aria-label': 'Полный текст', tabindex: '0' })
        expect(panelOf(wrapper).classes()).toEqual(expect.arrayContaining(['bb:whitespace-normal', 'bb:break-words', 'bb:select-text']))
        expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    })

    it('lang en — тексты по-английски', () => {
        const wrapper = mountPopover({ lang: 'en' })

        expect(buttonOf(wrapper).get('.bb\\:sr-only').text()).toBe('Show text')
        expect(panelOf(wrapper).attributes('aria-label')).toBe('Full text')
    })

    it('язык плагина en', () => {
        const wrapper = mountPopover({}, { global: { plugins: [[dashboardUi, { lang: 'en' }]] } })

        expect(panelOf(wrapper).attributes('aria-label')).toBe('Full text')
    })
})

describe('TextPopover: v-model', () => {
    it('modelValue открывает и закрывает без эха', async () => {
        const wrapper = mountPopover()

        await wrapper.setProps({ modelValue: true })
        await settle()
        expect(isOpen(wrapper)).toBe(true)

        await wrapper.setProps({ modelValue: false })
        await settle()
        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('текст опустел при открытой подсказке — компонента нет, update:modelValue(false)', async () => {
        const wrapper = mountPopover()
        await buttonOf(wrapper).trigger('click')
        await settle()

        await wrapper.setProps({ text: '' })
        await settle()

        expect(document.body.querySelector('[popover]')).toBeNull()
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('modelValue true при пустом тексте — ничего не открывается', async () => {
        mountPopover({ text: '', modelValue: true })
        await settle()

        expect(document.body.querySelector('[popover]')).toBeNull()
        expect(pageSelection()).toBe('text')
    })
})

describe('TextPopover: запрет выделения страницы', () => {
    it('открыта кнопкой — страница не выделяется; закрыта кнопкой — стиль страницы вернулся', async () => {
        const wrapper = mountPopover()

        await buttonOf(wrapper).trigger('click')
        await settle()
        expect(pageSelection()).toBe('none')

        await buttonOf(wrapper).trigger('click')
        await settle()
        expect(pageSelection()).toBe('text')
    })

    it('modelValue true на монтировании — запрет стоит', async () => {
        mountPopover({ modelValue: true })
        await settle()

        expect(pageSelection()).toBe('none')
    })

    it('открыта через v-model — запрет; закрыта через v-model — снят', async () => {
        const wrapper = mountPopover()

        await wrapper.setProps({ modelValue: true })
        await settle()
        expect(pageSelection()).toBe('none')

        await wrapper.setProps({ modelValue: false })
        await settle()
        expect(pageSelection()).toBe('text')
    })

    it('открыта кнопкой, закрыта через v-model — запрет снят', async () => {
        const wrapper = mountWithModel()

        await buttonOf(wrapper).trigger('click')
        await settle()
        expect(pageSelection()).toBe('none')

        await wrapper.setProps({ modelValue: false })
        await settle()
        expect(pageSelection()).toBe('text')
    })

    it('текст опустел при открытой подсказке — запрет снят', async () => {
        const wrapper = mountPopover()
        await buttonOf(wrapper).trigger('click')
        await settle()

        await wrapper.setProps({ text: '' })
        await settle()

        expect(pageSelection()).toBe('text')
    })

    it('открытие → опустевший текст → запоздавший toggle: запрет снят один раз, у другой подсказки работает', async () => {
        const host = mountPair()
        await host.findAll('button[popovertarget]')[0].trigger('click')
        await settle()

        await host.findAll('button[popovertarget]')[0].trigger('click')
        host.vm.firstText = ''
        await settle()
        expect(pageSelection()).toBe('text')

        // Счётчик не ушёл в минус: вторая подсказка снова ставит запрет.
        const secondButton = host.get('button[popovertarget]')
        await secondButton.trigger('click')
        await settle()
        expect(pageSelection()).toBe('none')

        await secondButton.trigger('click')
        await settle()
        expect(pageSelection()).toBe('text')
    })

    it('две подсказки: открытие второй закрывает первую, запрет держится, пока открыта хоть одна', async () => {
        const host = mountPair()
        const [firstButton, secondButton] = host.findAll('button[popovertarget]')
        const [firstPanel, secondPanel] = host.findAll('[popover]')

        await firstButton.trigger('click')
        await settle()
        await secondButton.trigger('click')
        await settle()

        expect(firstPanel.element.matches(':popover-open')).toBe(false)
        expect(secondPanel.element.matches(':popover-open')).toBe(true)
        expect(pageSelection()).toBe('none')

        await secondButton.trigger('click')
        await settle()
        expect(pageSelection()).toBe('text')
    })

    it('размонтирование открытой подсказки — запрет снят', async () => {
        const wrapper = mountPopover()
        await buttonOf(wrapper).trigger('click')
        await settle()

        wrapper.unmount()
        await settle()

        expect(pageSelection()).toBe('text')
    })
})

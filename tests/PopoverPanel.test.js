// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import PopoverPanel from '../src/components/PopoverPanel.vue'
import DropdownButtonWithAction from '../src/components/DropdownButtonWithAction.vue'
import { flushToggles, installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

// Панель — popover="auto" Popover API. Его заменяет tests/popoverStub.js:
// toggle в нём приходит отложенно и объединённо, как в браузере. attachTo
// нужен показу: showPopover требует элемент в документе.
let uninstallPopover

beforeEach(() => {
    uninstallPopover = installPopoverStub()
})

afterEach(() => {
    uninstallPopover()
})

async function settle() {
    await flushToggles()
    await flushPromises()
}

// Кнопка из слота trigger и одна кнопка внутри панели.
function mountPanel({ props = {}, attrs = {}, warnings = null } = {}) {
    return mount(PopoverPanel, {
        attachTo: document.body,
        props,
        attrs,
        slots: {
            trigger: (trigger) => h('button', { type: 'button', id: trigger.id, popovertarget: trigger.popovertarget }, 'Открыть'),
            default: () => h('button', { type: 'button' }, 'Пункт'),
        },
        global: warnings === null ? {} : { config: { warnHandler: (message) => warnings.push(message) } },
    })
}

function buttonOf(wrapper) {
    return wrapper.get('button[popovertarget]')
}

function panelOf(wrapper) {
    return wrapper.get('[popover]')
}

function isOpen(wrapper) {
    return panelOf(wrapper).element.matches(':popover-open')
}

describe('PopoverPanel', () => {
    it('класс на <popover-panel> ложится на обёртку кнопки', () => {
        const wrapper = mountPanel({ attrs: { class: 'bb:flex bb:w-full' } })

        expect(buttonOf(wrapper).element.parentElement.className).toBe('bb:relative bb:flex bb:w-full')
    })

    it('классы DropdownButtonWithAction доходят до обёртки стрелки сквозь PopoverMenu', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [{ label: 'Удалить', onSelect: () => {} }] },
            slots: { button: () => 'Редактировать' },
        })

        expect(wrapper.get('button[popovertarget]').element.parentElement.className).toBe('bb:relative bb:-ml-px bb:block')
    })

    it('panel-role="menu" — роль, вертикальная ориентация и имя от кнопки', () => {
        const wrapper = mountPanel({ props: { panelRole: 'menu' } })

        expect(panelOf(wrapper).attributes('role')).toBe('menu')
        expect(panelOf(wrapper).attributes('aria-orientation')).toBe('vertical')
        expect(panelOf(wrapper).attributes('aria-labelledby')).toBe(buttonOf(wrapper).attributes('id'))
    })

    it('без panel-role — ни роли, ни ориентации', () => {
        const wrapper = mountPanel()

        expect(panelOf(wrapper).attributes('role')).toBeUndefined()
        expect(panelOf(wrapper).attributes('aria-orientation')).toBeUndefined()
    })

    it('клик внутри без close-on-click панель не закрывает', async () => {
        const wrapper = mountPanel()
        await buttonOf(wrapper).trigger('click')
        await settle()

        await panelOf(wrapper).get('button').trigger('click')
        await settle()

        expect(isOpen(wrapper)).toBe(true)
    })

    it('клик внутри с close-on-click закрывает панель и сообщает родителю', async () => {
        const wrapper = mountPanel({ props: { closeOnClick: true } })
        await buttonOf(wrapper).trigger('click')
        await settle()

        await panelOf(wrapper).get('button').trigger('click')
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('align вне списка — предупреждение Vue', () => {
        const warnings = []
        mountPanel({ props: { align: 'left' }, warnings })

        expect(warnings.some((message) => message.includes('Invalid prop: custom validator check failed for prop "align"'))).toBe(true)
    })

    it('без содержимого нет ни кнопки, ни панели', () => {
        mountPanel({ props: { hasContent: false } })

        expect(document.body.querySelector('button')).toBeNull()
        expect(document.body.querySelector('[popover]')).toBeNull()
    })
})

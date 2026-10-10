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
            props: { actions: [{ label: 'Редактировать', href: '#edit' }, { label: 'Удалить', onSelect: () => {} }] },
        })

        expect(wrapper.get('button[popovertarget]').element.parentElement.className).toBe('bb:relative bb:-ml-px bb:flex')
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

    it('panel-label — своё имя панели вместо имени кнопки', () => {
        const wrapper = mountPanel({ props: { panelRole: 'region', panelLabel: 'Полный текст' } })

        expect(panelOf(wrapper).attributes('aria-label')).toBe('Полный текст')
        expect(panelOf(wrapper).attributes('aria-labelledby')).toBeUndefined()
    })

    it('без panel-label имя панели — от кнопки', () => {
        const wrapper = mountPanel({ props: { panelRole: 'region' } })

        expect(panelOf(wrapper).attributes('aria-label')).toBeUndefined()
        expect(panelOf(wrapper).attributes('aria-labelledby')).toBe(buttonOf(wrapper).attributes('id'))
    })

    it('panel-focusable — tabindex="0" у панели, без него — нет', () => {
        expect(panelOf(mountPanel({ props: { panelFocusable: true } })).attributes('tabindex')).toBe('0')
        expect(panelOf(mountPanel()).attributes('tabindex')).toBeUndefined()
    })
})

describe('PopoverPanel: событие toggle', () => {
    // v-model, как у страницы: событие возвращается пропом.
    function mountWithModel() {
        const wrapper = mountPanel({
            props: {
                modelValue: false,
                'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
            },
        })

        return wrapper
    }

    it('кнопка открывает и закрывает — toggle(true), toggle(false)', async () => {
        const wrapper = mountPanel()

        await buttonOf(wrapper).trigger('click')
        await settle()
        await buttonOf(wrapper).trigger('click')
        await settle()

        expect(wrapper.emitted('toggle')).toEqual([[true], [false]])
    })

    it('modelValue true на монтировании — toggle(true), эха update:modelValue нет', async () => {
        const wrapper = mountPanel({ props: { modelValue: true } })
        await settle()

        expect(isOpen(wrapper)).toBe(true)
        expect(wrapper.emitted('toggle')).toEqual([[true]])
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('входящий modelValue открывает и закрывает — toggle на каждое, эха нет', async () => {
        const wrapper = mountPanel()

        await wrapper.setProps({ modelValue: true })
        await settle()
        await wrapper.setProps({ modelValue: false })
        await settle()

        expect(wrapper.emitted('toggle')).toEqual([[true], [false]])
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('открыли кнопкой, закрыли через v-model — toggle(false)', async () => {
        const wrapper = mountWithModel()

        await buttonOf(wrapper).trigger('click')
        await settle()
        await wrapper.setProps({ modelValue: false })
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.emitted('toggle')).toEqual([[true], [false]])
        expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    })

    it('состояние не изменилось — toggle нет', async () => {
        const wrapper = mountPanel()

        await wrapper.setProps({ modelValue: false })
        await settle()

        expect(wrapper.emitted('toggle')).toBeUndefined()
    })

    it('содержимое пропало у открытой панели — toggle(false) и update:modelValue(false)', async () => {
        const wrapper = mountPanel()
        await buttonOf(wrapper).trigger('click')
        await settle()

        await wrapper.setProps({ hasContent: false })
        await settle()

        expect(wrapper.emitted('toggle')).toEqual([[true], [false]])
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('открытие → пропажа содержимого → запоздавший браузерный toggle: второго toggle нет', async () => {
        const wrapper = mountPanel()
        await buttonOf(wrapper).trigger('click')
        await settle()

        // Закрытие поставлено в очередь браузера, и тут же пропало содержимое:
        // toggle закрытия приходит уже после пропажи.
        await buttonOf(wrapper).trigger('click')
        await wrapper.setProps({ hasContent: false })
        await settle()

        expect(wrapper.emitted('toggle')).toEqual([[true], [false]])
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('размонтирование открытой панели — toggle(false) нет', async () => {
        // @vue/test-utils очищает emitted() при размонтировании, поэтому вызовы пишет обработчик.
        const toggles = []
        const wrapper = mountPanel({ props: { onToggle: (isOpen) => toggles.push(isOpen) } })
        await buttonOf(wrapper).trigger('click')
        await settle()

        wrapper.unmount()
        await settle()

        expect(toggles).toEqual([true])
    })
})

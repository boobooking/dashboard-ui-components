// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import PickDay from '../src/components/PickDay.vue'
import Eraser from '../src/components/Eraser.vue'
import { formatDay } from '../src/date.js'
import { flushToggles, installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)
afterEach(() => {
    document.body.innerHTML = ''
})

// pikaday загружается в mounted(): дожидаемся загрузки и создания календаря.
async function pikadayLoaded() {
    await vi.dynamicImportSettled()
    await flushPromises()
}

describe('PickDay', () => {
    it('не падает, если родитель передал null', async () => {
        const errors = []
        const wrapper = mount(PickDay, {
            props: { modelValue: null },
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        await wrapper.setProps({ modelValue: '01.02.2026' })
        await wrapper.setProps({ modelValue: null })

        expect(errors).toEqual([])
        expect(wrapper.get('input').element.value).toBe('')
    })

    it('календарь создаётся после загрузки pikaday', async () => {
        const errors = []
        const wrapper = mount(PickDay, {
            props: { modelValue: '15.03.2026' },
            attachTo: document.body,
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        // Загрузка модуля асинхронна: сразу после mount() календаря ещё нет.
        expect(wrapper.vm.picker).toBeNull()
        expect(wrapper.find('.pika-single').exists()).toBe(false)

        await pikadayLoaded()

        expect(wrapper.find('.pika-single').exists()).toBe(true)
        expect(formatDay(wrapper.vm.picker.getDate())).toBe('15.03.2026')
        expect(errors).toEqual([])
    })

    it('значение, пришедшее до загрузки pikaday, — в календаре после загрузки', async () => {
        const errors = []
        const wrapper = mount(PickDay, {
            props: { modelValue: '' },
            attachTo: document.body,
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        // Календаря ещё нет: синхронизация и очистка не должны падать.
        wrapper.vm.syncPicker('01.02.2026')
        wrapper.setProps({ modelValue: '01.02.2026' })

        await pikadayLoaded()

        expect(formatDay(wrapper.vm.picker.getDate())).toBe('01.02.2026')
        expect(errors).toEqual([])
    })

    it('размонтирование до загрузки pikaday — без ошибок и без календаря', async () => {
        // createApp, а не mount: автоматическое размонтирование тестовых
        // обёрток размонтировало бы приложение второй раз.
        const errors = []
        const container = document.createElement('div')
        document.body.appendChild(container)
        const app = createApp(PickDay)
        app.config.errorHandler = (error) => errors.push(error)
        const vm = app.mount(container)

        app.unmount()
        await pikadayLoaded()

        expect(vm.picker).toBeNull()
        expect(document.querySelector('.pika-single')).toBeNull()
        expect(errors).toEqual([])
    })
})

describe('PickDay: календарь на Popover API', () => {
    // Панель — popover="auto" Popover API. Его заменяет tests/popoverStub.js.
    let uninstallPopover

    beforeEach(() => {
        uninstallPopover = installPopoverStub()
    })

    afterEach(() => {
        uninstallPopover()
    })

    // Утилита отображения на самой панели перебила бы display: none
    // закрытого popover, и закрытый календарь был бы виден.
    const DISPLAY = /^bb:(block|inline-block|inline|flex|inline-flex|grid|inline-grid|table|contents|flow-root|hidden)$/

    function triggerOf(wrapper) {
        return wrapper.get('button[popovertarget]')
    }

    function panelOf(wrapper) {
        return wrapper.get('[popover]')
    }

    function isOpen(wrapper) {
        return panelOf(wrapper).element.matches(':popover-open')
    }

    async function settle() {
        await flushToggles()
        await flushPromises()
    }

    async function mountOpen(props = {}) {
        const wrapper = mount(PickDay, { props, attachTo: document.body })
        await pikadayLoaded()
        await triggerOf(wrapper).trigger('click')
        await settle()
        return wrapper
    }

    // Pikaday выбирает дату и листает месяцы по mousedown.
    function mousedown(element) {
        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    }

    it('кнопка поля открывает календарь, выбор даты закрывает его и отдаёт дату', async () => {
        const wrapper = await mountOpen({ modelValue: '15.03.2026' })
        expect(isOpen(wrapper)).toBe(true)

        mousedown(wrapper.get('.pika-button[data-pika-day="20"]').element)
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toEqual([['20.03.2026']])
    })

    it('смена месяца внутри календаря его не закрывает', async () => {
        const wrapper = await mountOpen({ modelValue: '15.03.2026' })
        const before = wrapper.get('.pika-title').text()

        mousedown(wrapper.get('.pika-next').element)
        await wrapper.get('.pika-next').trigger('click')
        await settle()

        expect(isOpen(wrapper)).toBe(true)
        expect(wrapper.get('.pika-title').text()).not.toBe(before)
    })

    it('Escape закрывает календарь', async () => {
        const wrapper = await mountOpen()

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await settle()

        expect(isOpen(wrapper)).toBe(false)
    })

    it('клик вне календаря закрывает его', async () => {
        const wrapper = await mountOpen()

        document.body.click()
        await settle()

        expect(isOpen(wrapper)).toBe(false)
    })

    it('пока календарь открыт, поле отключено, а ластика нет', async () => {
        const wrapper = mount(PickDay, { props: { modelValue: '15.03.2026' }, attachTo: document.body })
        await pikadayLoaded()
        expect(wrapper.findComponent(Eraser).exists()).toBe(true)
        expect(wrapper.get('input').attributes('disabled')).toBeUndefined()

        await triggerOf(wrapper).trigger('click')
        await settle()

        expect(wrapper.get('input').attributes('disabled')).toBeDefined()
        expect(wrapper.findComponent(Eraser).exists()).toBe(false)
    })

    // Заглушка находит кнопку через closest('[popovertarget]') и откроет
    // календарь и по клику на поле. В браузере клик по полю достаётся
    // <label> и полю: у них своё поведение активации, и до popovertarget
    // кнопки он не дойдёт. Сам клик проверяется в браузере, тест закрепляет
    // класс.
    it('<label> с полем не принимает клики: они достаются кнопке', () => {
        const wrapper = mount(PickDay, { attachTo: document.body })

        expect(wrapper.get('label').classes()).toContain('bb:pointer-events-none')
    })

    it('у панели нет утилит отображения', () => {
        const wrapper = mount(PickDay, { attachTo: document.body })

        expect(panelOf(wrapper).classes().filter((name) => DISPLAY.test(name))).toEqual([])
    })

    // Панель лежит в DOM внутри обёртки поля и наследует её line-height
    // и cursor: календарь стал бы ниже, а курсор над ним — рукой.
    it('календарь не наследует межстрочный интервал и курсор поля', () => {
        const wrapper = mount(PickDay, { attachTo: document.body })
        const panel = panelOf(wrapper).element

        expect(panel.closest('.bb\\:leading-none')).toBeNull()
        expect(panel.closest('.bb\\:cursor-pointer')).toBeNull()
    })
})

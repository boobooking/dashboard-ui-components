// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import PickDay from '../src/components/PickDay.vue'
import { formatDay } from '../src/date.js'

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

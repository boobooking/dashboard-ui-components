// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import RussianMobileFilter from '../src/components/RussianMobileFilter.vue'

enableAutoUnmount(afterEach)

describe('RussianMobileFilter', () => {
    it('не падает, если родитель передал null', async () => {
        const errors = []
        const wrapper = mount(RussianMobileFilter, {
            props: { header: 'Телефон', modelValue: null },
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        await wrapper.setProps({ modelValue: '79031234567' })
        await wrapper.setProps({ modelValue: null })

        expect(errors).toEqual([])
        expect(wrapper.get('input').element.value).toBe('')
    })
})

describe('RussianMobileFilter: размонтирование поля в фокусе', () => {
    it('blur при удалении поля в фокусе — без ошибок и без changed (Chrome шлёт его во время размонтирования)', async () => {
        // createApp, а не mount: фильтр размонтирует v-if родителя, как при
        // уходе со страницы.
        const errors = []
        const warnings = []
        const updates = []
        const commits = []
        const container = document.createElement('div')
        document.body.appendChild(container)
        const shows = ref(true)
        const app = createApp({
            render: () => (shows.value
                ? h(RussianMobileFilter, {
                    header: 'Телефон',
                    'onUpdate:modelValue': (value) => updates.push(value),
                    onChanged: () => commits.push('changed'),
                })
                : null),
        })
        app.config.errorHandler = (error) => errors.push(error)
        app.config.warnHandler = (message) => warnings.push(message)
        app.mount(container)
        const input = container.querySelector('input')

        input.focus()
        await nextTick()
        // Две цифры — меньше порога дебаунса: родителю ещё не ушёл changed.
        input.value = '+7 (90___) ___ __ __'
        input.setSelectionRange(6, 6)
        input.dispatchEvent(new Event('input'))
        expect(updates.at(-1)).toBe('790')
        expect(commits).toEqual([])

        // Chrome шлёт blur, когда удаляет поле в фокусе: уже после
        // beforeUnmount, пока поле ещё в документе.
        const removeChild = container.removeChild.bind(container)
        container.removeChild = (child) => {
            input.blur()

            return removeChild(child)
        }
        shows.value = false
        await nextTick()

        expect(errors).toEqual([])
        expect(warnings).toEqual([])
        expect(commits).toEqual([])

        app.unmount()
        container.remove()
    })
})

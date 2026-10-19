// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
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

describe('RussianMobileFilter: фокус после ластика', () => {
    // Фокус на ластике — как после Tab; в happy-dom :focus-visible равен :focus.
    async function pressEraser(wrapper, { visible = true, moveFocusTo = null } = {}) {
        const eraser = wrapper.findAll('button').find((button) => button.find('path[d="M6 18L18 6M6 6l12 12"]').exists())
        const control = wrapper.get('input').element
        const focus = vi.spyOn(control, 'focus')
        if (!visible) {
            const matches = eraser.element.matches.bind(eraser.element)
            vi.spyOn(eraser.element, 'matches').mockImplementation((selector) => (selector === ':focus-visible' ? false : matches(selector)))
        }
        eraser.element.focus()

        await eraser.trigger('click')
        moveFocusTo?.focus()
        await Promise.all(eraser.element.getAnimations().map((animation) => animation.finished))
        await flushPromises()

        return focus
    }

    it('с клавиатуры фокус уходит на своё управление, события — по одному', async () => {
        const wrapper = mount(RussianMobileFilter, { props: { header: 'Телефон', modelValue: '+79991234567' }, attachTo: document.body })

        const focus = await pressEraser(wrapper)

        expect(document.activeElement).toBe(wrapper.get('input').element)
        expect(focus).toHaveBeenCalledTimes(1)
        expect(focus).toHaveBeenCalledWith({ preventScroll: true })
        expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
        expect(wrapper.emitted('changed')).toHaveLength(1)
    })

    it('без :focus-visible фокус не переводится', async () => {
        const wrapper = mount(RussianMobileFilter, { props: { header: 'Телефон', modelValue: '+79991234567' }, attachTo: document.body })

        const focus = await pressEraser(wrapper, { visible: false })

        expect(focus).not.toHaveBeenCalled()
        expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
        expect(wrapper.emitted('changed')).toHaveLength(1)
    })

    it('фокус ушёл с ластика до конца анимации: очистка выполнена, фокус на месте', async () => {
        const wrapper = mount(RussianMobileFilter, { props: { header: 'Телефон', modelValue: '+79991234567' }, attachTo: document.body })
        const outside = document.createElement('button')
        document.body.appendChild(outside)

        const focus = await pressEraser(wrapper, { moveFocusTo: outside })

        expect(focus).not.toHaveBeenCalled()
        expect(document.activeElement).toBe(outside)
        expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
        expect(wrapper.emitted('changed')).toHaveLength(1)
    })
})

describe('RussianMobileFilter: единый фокус', () => {
    it('поле показывает фокус утилитой пакета без outline-hidden', () => {
        const classes = mount(RussianMobileFilter, { props: { header: 'Телефон', modelValue: '' } }).get('input').classes()

        expect(classes).toContain('bb:focus:focus-ring')
        expect(classes).not.toContain('bb:focus:outline-hidden')
    })
})

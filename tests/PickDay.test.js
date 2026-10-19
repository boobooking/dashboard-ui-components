// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import PickDay from '../src/components/PickDay.vue'
import CrossButton from '../src/components/CrossButton.vue'
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
        expect(wrapper.findComponent(CrossButton).exists()).toBe(true)
        expect(wrapper.get('input').attributes('disabled')).toBeUndefined()

        await triggerOf(wrapper).trigger('click')
        await settle()

        expect(wrapper.get('input').attributes('disabled')).toBeDefined()
        expect(wrapper.findComponent(CrossButton).exists()).toBe(false)
    })

    // Кнопка лежит поверх поля, и в браузере клик по полю достаётся ей.
    // <label> и поле указатель не ловят: у них своё поведение активации, и
    // клик, доставшийся им, до popovertarget кнопки не дошёл бы. Сам клик
    // проверяется в браузере, тест закрепляет класс.
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

    describe('с клавиатуры', () => {
        // click без нажатия мыши: Enter и пробел на кнопке, element.click()
        // расширений клавиатурной навигации. У мыши и касания detail — 1.
        function click(element, detail) {
            const event = new MouseEvent('click', { bubbles: true, cancelable: true, detail })
            element.dispatchEvent(event)
        }

        function keydown(key) {
            const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
            ;(document.activeElement ?? document).dispatchEvent(event)
            return event
        }

        // Дата кнопки дня под фокусом: дд.мм.гггг. Месяц в data-pika-month — с нуля.
        function focusedDay() {
            const day = document.activeElement
            if (!day.classList.contains('pika-day')) {
                return null
            }

            return formatDay(new Date(day.dataset.pikaYear, day.dataset.pikaMonth, day.dataset.pikaDay))
        }

        it('click без мыши выбирает день, закрывает календарь и отдаёт дату', async () => {
            const wrapper = await mountOpen({ modelValue: '15.03.2026' })

            click(wrapper.get('.pika-button[data-pika-day="20"]').element, 0)
            await settle()

            expect(isOpen(wrapper)).toBe(false)
            expect(wrapper.emitted('update:modelValue')).toEqual([['20.03.2026']])
        })

        it('клик мышью выбирает день один раз: его обработал mousedown', async () => {
            const wrapper = await mountOpen({ modelValue: '15.03.2026' })
            const day = wrapper.get('.pika-button[data-pika-day="20"]').element

            mousedown(day)
            click(day, 1)
            await settle()

            expect(wrapper.emitted('update:modelValue')).toEqual([['20.03.2026']])
        })

        it('click без мыши по стрелке месяца листает месяц', async () => {
            const wrapper = await mountOpen({ modelValue: '15.03.2026' })
            const before = wrapper.get('.pika-title').text()

            click(wrapper.get('.pika-next').element, 0)
            await settle()

            expect(isOpen(wrapper)).toBe(true)
            expect(wrapper.get('.pika-title').text()).not.toBe(before)
        })

        it('после перелистывания с клавиатуры фокус — на новой стрелке месяца', async () => {
            const wrapper = await mountOpen({ modelValue: '15.03.2026' })
            const next = wrapper.get('.pika-next').element
            next.focus()

            click(next, 0)
            await settle()
            click(document.activeElement, 0)
            await settle()

            expect(document.activeElement).toBe(wrapper.get('.pika-next').element)
            expect(wrapper.get('.pika-title').text()).toContain('Май')
        })

        it('первая стрелка ставит фокус на выбранный день', async () => {
            await mountOpen({ modelValue: '15.03.2026' })

            const event = keydown('ArrowDown')

            expect(event.defaultPrevented).toBe(true)
            expect(focusedDay()).toBe('15.03.2026')
        })

        it('без выбранной даты первая стрелка ставит фокус на сегодня', async () => {
            await mountOpen()

            keydown('ArrowRight')

            expect(focusedDay()).toBe(formatDay(new Date()))
        })

        it('влево и вправо — на день, вверх и вниз — на неделю', async () => {
            await mountOpen({ modelValue: '15.03.2026' })
            keydown('ArrowDown')

            const visited = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].map((key) => {
                keydown(key)
                return focusedDay()
            })

            expect(visited).toEqual(['16.03.2026', '23.03.2026', '22.03.2026', '15.03.2026'])
        })

        it('с края месяца стрелка листает месяц и ставит фокус на день в нём', async () => {
            const wrapper = await mountOpen({ modelValue: '31.03.2026' })
            keydown('ArrowRight')

            keydown('ArrowRight')
            expect(focusedDay()).toBe('01.04.2026')
            expect(wrapper.get('.pika-title').text()).toContain('Апрель')

            keydown('ArrowUp')
            expect(focusedDay()).toBe('25.03.2026')
            expect(isOpen(wrapper)).toBe(true)
            expect(wrapper.emitted('update:modelValue')).toBeUndefined()
        })

        it('Enter по дню под фокусом выбирает его', async () => {
            const wrapper = await mountOpen({ modelValue: '15.03.2026' })
            keydown('ArrowDown')
            keydown('ArrowRight')

            // Enter на кнопке браузер превращает в click с detail 0.
            click(document.activeElement, 0)
            await settle()

            expect(wrapper.emitted('update:modelValue')).toEqual([['16.03.2026']])
            expect(document.activeElement).toBe(triggerOf(wrapper).element)
        })

        it('Escape закрывает календарь и возвращает фокус на кнопку поля', async () => {
            const wrapper = await mountOpen({ modelValue: '15.03.2026' })
            keydown('ArrowDown')

            keydown('Escape')
            await settle()

            expect(isOpen(wrapper)).toBe(false)
            expect(document.activeElement).toBe(triggerOf(wrapper).element)
        })

        it('у закрытого календаря стрелки не перехватываются', async () => {
            const wrapper = mount(PickDay, { props: { modelValue: '15.03.2026' }, attachTo: document.body })
            await pikadayLoaded()
            await triggerOf(wrapper).trigger('click')
            await settle()
            keydown('Escape')
            await settle()
            const active = document.activeElement

            const event = keydown('ArrowDown')

            expect(event.defaultPrevented).toBe(false)
            expect(document.activeElement).toBe(active)
        })

        it('стрелки в выпадающем списке месяца не перехватываются', async () => {
            const wrapper = await mountOpen({ modelValue: '15.03.2026' })
            wrapper.get('.pika-select-month').element.focus()

            const event = keydown('ArrowDown')

            expect(event.defaultPrevented).toBe(false)
            expect(document.activeElement).toBe(wrapper.get('.pika-select-month').element)
        })
    })

    describe('календарь клавишами из поля даты', () => {
        function fieldKeydown(wrapper, key, init = {}) {
            const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
            wrapper.get('input').element.dispatchEvent(event)
            return event
        }

        function keydown(key) {
            const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
            ;(document.activeElement ?? document).dispatchEvent(event)
            return event
        }

        async function mountWithFocusedField() {
            const wrapper = mount(PickDay, { props: { modelValue: '15.03.2026' }, attachTo: document.body })
            await pikadayLoaded()
            wrapper.get('input').element.focus()
            return wrapper
        }

        it('у кнопки календаря кольцо видимого фокуса', () => {
            const wrapper = mount(PickDay, { attachTo: document.body })

            expect(triggerOf(wrapper).classes()).toEqual(
                expect.arrayContaining(['bb:focus-visible:focus-ring']),
            )
        })

        describe.each([
            ['ArrowDown', 'ArrowDown'],
            ['Enter', 'Enter'],
            ['пробел', ' '],
        ])('%s', (_name, key) => {
            it('открывает календарь, не меняет поле и ставит фокус на кнопку', async () => {
                const wrapper = await mountWithFocusedField()

                const event = fieldKeydown(wrapper, key)
                await settle()

                expect(event.defaultPrevented).toBe(true)
                expect(isOpen(wrapper)).toBe(true)
                expect(wrapper.get('input').element.value).toBe('15.03.2026')
                expect(document.activeElement).toBe(triggerOf(wrapper).element)
            })

            it('Escape закрывает календарь, фокус на кнопке', async () => {
                const wrapper = await mountWithFocusedField()
                fieldKeydown(wrapper, key)
                await settle()

                keydown('Escape')
                await settle()

                expect(isOpen(wrapper)).toBe(false)
                expect(document.activeElement).toBe(triggerOf(wrapper).element)
            })

            it('стрелка ведёт на день, выбор закрывает календарь, фокус на кнопке', async () => {
                const wrapper = await mountWithFocusedField()
                fieldKeydown(wrapper, key)
                await settle()

                keydown('ArrowDown')
                keydown('ArrowRight')
                document.activeElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }))
                await settle()

                expect(isOpen(wrapper)).toBe(false)
                expect(wrapper.emitted('update:modelValue')).toEqual([['16.03.2026']])
                expect(document.activeElement).toBe(triggerOf(wrapper).element)
            })

            // Порядок обязателен: открытый календарь отключает поле, и фокус с него
            // теряется, поэтому кнопка получает фокус до открытия.
            it('фокус на кнопку ставится до открытия календаря', async () => {
                const wrapper = await mountWithFocusedField()
                const trigger = triggerOf(wrapper).element
                const original = trigger.focus.bind(trigger)
                const calls = []
                vi.spyOn(trigger, 'focus').mockImplementation((options) => {
                    calls.push({ options, openAtCall: wrapper.vm.popupIsOpen })
                    original(options)
                })

                fieldKeydown(wrapper, key)

                expect(calls).toEqual([{ options: { preventScroll: true }, openAtCall: false }])
                expect(wrapper.vm.popupIsOpen).toBe(true)
            })

            it('с Shift календарь открывается', async () => {
                const wrapper = await mountWithFocusedField()

                const event = fieldKeydown(wrapper, key, { shiftKey: true })
                await settle()

                expect(event.defaultPrevented).toBe(true)
                expect(isOpen(wrapper)).toBe(true)
            })

            it.each([
                ['Ctrl', { ctrlKey: true }],
                ['Alt', { altKey: true }],
                ['Meta', { metaKey: true }],
                ['набор через IME', { isComposing: true }],
            ])('с %s календарь не открывается', async (_modifier, init) => {
                const wrapper = await mountWithFocusedField()

                const event = fieldKeydown(wrapper, key, init)
                await settle()

                expect(event.defaultPrevented).toBe(false)
                expect(isOpen(wrapper)).toBe(false)
            })
        })

        it('буква не открывает календарь', async () => {
            const wrapper = await mountWithFocusedField()

            const event = fieldKeydown(wrapper, '1')
            await settle()

            expect(event.defaultPrevented).toBe(false)
            expect(isOpen(wrapper)).toBe(false)
        })
    })
})

async function mountFilled() {
    const wrapper = mount(PickDay, { props: { modelValue: '15.03.2026' }, attachTo: document.body })
    await pikadayLoaded()
    return wrapper
}

describe('PickDay: фокус после ластика', () => {
    // Фокус на ластике — как после Tab; в happy-dom :focus-visible равен :focus.
    async function pressEraser(wrapper, { visible = true, moveFocusTo = null } = {}) {
        const eraser = wrapper.findComponent(CrossButton)
        const control = wrapper.get('button[popovertarget]').element
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
        const wrapper = await mountFilled()

        const focus = await pressEraser(wrapper)

        expect(document.activeElement).toBe(wrapper.get('button[popovertarget]').element)
        expect(focus).toHaveBeenCalledTimes(1)
        expect(focus).toHaveBeenCalledWith({ preventScroll: true })
        expect(wrapper.emitted('update:modelValue')).toEqual([['']])
        expect(wrapper.emitted('changed')).toHaveLength(1)
    })

    it('без :focus-visible фокус не переводится', async () => {
        const wrapper = await mountFilled()

        const focus = await pressEraser(wrapper, { visible: false })

        expect(focus).not.toHaveBeenCalled()
        expect(wrapper.emitted('update:modelValue')).toEqual([['']])
        expect(wrapper.emitted('changed')).toHaveLength(1)
    })

    it('фокус ушёл с ластика до конца анимации: очистка выполнена, фокус на месте', async () => {
        const wrapper = await mountFilled()
        const outside = document.createElement('button')
        document.body.appendChild(outside)

        const focus = await pressEraser(wrapper, { moveFocusTo: outside })

        expect(focus).not.toHaveBeenCalled()
        expect(document.activeElement).toBe(outside)
        expect(wrapper.emitted('update:modelValue')).toEqual([['']])
        expect(wrapper.emitted('changed')).toHaveLength(1)
    })
})

describe('PickDay: единый фокус', () => {
    it('поле даты показывает фокус утилитой пакета без outline-hidden', () => {
        const classes = mount(PickDay, { props: { modelValue: '' } }).get('input').classes()

        expect(classes).toContain('bb:focus:focus-ring')
        expect(classes).not.toContain('bb:focus:outline-hidden')
    })
})

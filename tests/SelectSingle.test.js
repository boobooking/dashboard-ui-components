// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import SelectSingle from '../src/components/SelectSingle.vue'
import { flushToggles, installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

// Список — popover="auto" Popover API. Его заменяет tests/popoverStub.js:
// без него в happy-dom popovertarget список не откроет.
let uninstallPopover

beforeEach(() => {
    uninstallPopover = installPopoverStub()
})

afterEach(() => {
    uninstallPopover()
})

const items = [
    { id: 'a', name: 'Первый' },
    { id: 'b', name: 'Второй' },
    { id: 'c', name: 'Третий' },
]

// Утилита отображения на самой панели перебила бы display: none закрытого
// popover, и закрытый список был бы виден.
const DISPLAY = /^bb:(block|inline-block|inline|flex|inline-flex|grid|inline-grid|table|contents|flow-root|hidden)$/

// attachTo нужен фокусу: элементу вне документа его не дать.
function mountSelect(props = {}) {
    return mount(SelectSingle, { props: { header: 'Вендор', items, ...props }, attachTo: document.body })
}

function triggerOf(wrapper) {
    return wrapper.find('button')
}

function panelOf(wrapper) {
    return wrapper.get('[popover]')
}

function isOpen(wrapper) {
    return panelOf(wrapper).element.matches(':popover-open')
}

function press(key) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    document.activeElement.dispatchEvent(event)
    return event
}

// Сначала — рендер Vue: выбор пункта закрывает список через isOpen,
// и hidePopover зовётся при рендере, а toggle встаёт в очередь после него.
async function settle() {
    await flushPromises()
    await flushToggles()
    await flushPromises()
}

async function open(wrapper) {
    triggerOf(wrapper).element.focus()
    await triggerOf(wrapper).trigger('click')
    await settle()
}

describe('SelectSingle', () => {
    it('не падает, если вместо списка пришёл null', () => {
        const errors = []
        mount(SelectSingle, {
            props: { header: 'Вендор', items: null },
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: () => {} } },
        })

        expect(errors).toEqual([])
    })

    it('в открытом списке стрелка вниз ведёт на первый пункт и не прокручивает страницу', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        const event = press('ArrowDown')

        expect(event.defaultPrevented).toBe(true)
        expect(document.activeElement.textContent).toBe('Первый')
    })

    it('отсчёт идёт от выбранного пункта', async () => {
        const wrapper = mountSelect({ modelValue: 'b' })
        await open(wrapper)

        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Третий')
    })

    it('в закрытом списке стрелки прокручивают страницу', () => {
        const wrapper = mountSelect()
        triggerOf(wrapper).element.focus()

        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })

    it('после выбора стрелки снова прокручивают страницу, а фокус возвращается на кнопку', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        press('ArrowDown')

        document.activeElement.click()
        await settle()

        expect(wrapper.emitted('update:modelValue')).toEqual([['a']])
        expect(document.activeElement).toBe(triggerOf(wrapper).element)
        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })

    it('после закрытия по Escape фокус возвращается на кнопку', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        press('ArrowDown')

        press('Escape')
        await settle()

        expect(document.activeElement).toBe(triggerOf(wrapper).element)
    })
})

describe('SelectSingle: пункты пропали при открытом списке', () => {
    function press(key) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
        document.activeElement.dispatchEvent(event)
        return event
    }

    it('стрелки снова прокручивают страницу, а вернувшиеся пункты открываются заново и ходят по новому списку', async () => {
        const wrapper = mount(SelectSingle, { props: { header: 'Вендор', items }, attachTo: document.body })
        wrapper.find('button').element.focus()
        await wrapper.find('button').trigger('click')
        await settle()

        await wrapper.setProps({ items: [] })
        await settle()

        const field = document.createElement('textarea')
        document.body.append(field)
        try {
            field.focus()
            expect(press('ArrowDown').defaultPrevented).toBe(false)
        } finally {
            field.remove()
        }

        await wrapper.setProps({ items })
        await settle()
        wrapper.find('button').element.focus()
        await wrapper.find('button').trigger('click')
        await settle()
        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Первый')
    })
})

describe('SelectSingle: список на Popover API', () => {
    it('список — панель popover="auto", кнопка открывает и закрывает её', async () => {
        const wrapper = mountSelect()

        expect(triggerOf(wrapper).attributes('popovertarget')).toBe(panelOf(wrapper).attributes('id'))
        expect(panelOf(wrapper).attributes('popover')).toBe('auto')

        await open(wrapper)
        expect(isOpen(wrapper)).toBe(true)

        await triggerOf(wrapper).trigger('click')
        await settle()
        expect(isOpen(wrapper)).toBe(false)
    })

    it('выбор пункта закрывает список', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        press('ArrowDown')

        document.activeElement.click()
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.vm.isOpen).toBe(false)
    })

    it('клик вне списка закрывает его', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        document.body.click()
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.vm.isOpen).toBe(false)
    })

    it('прокрутка страницы закрывает список, прокрутка внутри списка — нет', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        panelOf(wrapper).element.dispatchEvent(new Event('scroll'))
        await settle()
        expect(isOpen(wrapper)).toBe(true)

        document.dispatchEvent(new Event('scroll'))
        await settle()
        expect(isOpen(wrapper)).toBe(false)
    })

    it('изменение размера окна закрывает список', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        window.dispatchEvent(new Event('resize'))
        await settle()

        expect(isOpen(wrapper)).toBe(false)
    })

    describe('место списка', () => {
        afterEach(() => {
            delete document.documentElement.clientWidth
            delete document.documentElement.clientHeight
        })

        function viewport(width, height) {
            Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: width })
            Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: height })
        }

        it('левым краем по полю, под ним', async () => {
            viewport(1000, 800)
            const wrapper = mountSelect()
            triggerOf(wrapper).element.getBoundingClientRect = () => ({ top: 100, bottom: 140, left: 50, right: 290 })

            await open(wrapper)

            expect(panelOf(wrapper).element.style.left).toBe('50px')
            expect(panelOf(wrapper).element.style.right).toBe('auto')
            expect(panelOf(wrapper).element.style.top).toBe('144px')
        })

        it('у нижнего края окна — вверх, высота ограничена местом до края', async () => {
            viewport(1000, 800)
            const wrapper = mountSelect()
            triggerOf(wrapper).element.getBoundingClientRect = () => ({ top: 700, bottom: 740, left: 50, right: 290 })

            await open(wrapper)

            expect(panelOf(wrapper).element.style.top).toBe('auto')
            expect(panelOf(wrapper).element.style.bottom).toBe('104px')
            expect(panelOf(wrapper).element.style.maxHeight).toBe('688px')
        })
    })

    it('открытие второго списка закрывает первый, id у панелей свои', async () => {
        const Page = {
            render: () => h('div', [
                h(SelectSingle, { header: 'Вендор', items }),
                h(SelectSingle, { header: 'Сертификат', items }),
            ]),
        }
        const page = mount(Page, { attachTo: document.body })
        const [first, second] = page.findAllComponents(SelectSingle)

        await first.find('button').trigger('click')
        await settle()
        await second.find('button').trigger('click')
        await settle()

        expect(second.get('[popover]').element.matches(':popover-open')).toBe(true)
        expect(first.get('[popover]').element.matches(':popover-open')).toBe(false)
        expect(first.vm.isOpen).toBe(false)
        expect(first.get('[popover]').attributes('id')).not.toBe(second.get('[popover]').attributes('id'))
    })

    it('у панели нет утилит отображения', () => {
        const wrapper = mountSelect()

        expect(panelOf(wrapper).classes().filter((name) => DISPLAY.test(name))).toEqual([])
    })

    // Так делает Safari: по клику фокус на кнопку не ставится, и при
    // закрытии popover браузер возвращает его туда, где он был до
    // открытия, — на body, раньше, чем придёт toggle.
    it('после Escape фокус возвращается на кнопку, даже если браузер увёл его на body', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        press('ArrowDown')

        press('Escape')
        document.activeElement.blur()
        await settle()

        expect(document.activeElement).toBe(triggerOf(wrapper).element)
    })

    it('фокус, ушедший при закрытии на другой элемент, остаётся там', async () => {
        const wrapper = mountSelect()
        const field = document.createElement('input')
        document.body.append(field)

        try {
            await open(wrapper)
            press('ArrowDown')

            press('Escape')
            field.focus()
            await settle()

            expect(document.activeElement).toBe(field)
        } finally {
            field.remove()
        }
    })
})

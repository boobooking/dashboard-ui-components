// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import DropdownButtonWithAction from '../src/components/DropdownButtonWithAction.vue'

enableAutoUnmount(afterEach)

// Popup и Overlay настоящие, без заглушек: на них проверяются эхо Popup и
// закрытие по Escape. attachTo нужен isVisible(): видимость меню задаёт v-show
// на самом меню внутри Popup, и проверяется она по предкам в документе.
const slots = {
    button: () => h('span', 'Редактировать'),
    actions: () => h('a', { href: '#' }, 'Удалить'),
}

function arrowOf(wrapper) {
    return wrapper.findAll('button').find((button) => button.text().includes('Открыть меню'))
}

function menuOf(wrapper) {
    return wrapper.get('[role="menu"]')
}

// Две строки с меню, которыми управляет родитель, как на Users/Index:
// открыто только меню активной строки, закрытие меню сбрасывает выбор.
const Rows = {
    data() {
        return { active: null, closes: 0 }
    },
    methods: {
        opened(row) {
            this.active = row
        },
        closed() {
            this.active = null
            this.closes++
        },
    },
    render() {
        return h('div', ['a', 'b'].map((row) => h(
            DropdownButtonWithAction,
            {
                key: row,
                'data-row': row,
                modelValue: this.active === row,
                'onUpdate:modelValue': (opened) => (opened ? this.opened(row) : this.closed()),
            },
            slots,
        )))
    },
}

function row(wrapper, name) {
    return wrapper.get(`[data-row="${name}"]`)
}

describe('DropdownButtonWithAction без привязки', () => {
    it('открывает и закрывает меню стрелкой', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots })

        await arrowOf(wrapper).trigger('click')
        await flushPromises()
        expect(menuOf(wrapper).isVisible()).toBe(true)

        await arrowOf(wrapper).trigger('click')
        await flushPromises()
        expect(menuOf(wrapper).isVisible()).toBe(false)
    })

    it('на клик по стрелке эмитит update:modelValue один раз', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots })

        await arrowOf(wrapper).trigger('click')
        await flushPromises()

        expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    })

    it('на закрытие по Escape эмитит false', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots })

        await arrowOf(wrapper).trigger('click')
        await flushPromises()
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await flushPromises()

        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
        expect(menuOf(wrapper).isVisible()).toBe(false)
    })
})

describe('DropdownButtonWithAction с привязкой', () => {
    it('принимает входящее значение без ответного события', async () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { modelValue: false },
            slots,
        })

        await wrapper.setProps({ modelValue: true })
        await flushPromises()
        expect(menuOf(wrapper).isVisible()).toBe(true)

        await wrapper.setProps({ modelValue: false })
        await flushPromises()
        expect(menuOf(wrapper).isVisible()).toBe(false)

        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    const switches = [
        { name: 'переключение A → B оставляет выбранной B', from: 'a', to: 'b' },
        { name: 'переключение B → A оставляет выбранной A', from: 'b', to: 'a' },
    ]

    for (const testCase of switches) {
        it(testCase.name, async () => {
            const wrapper = mount(Rows, { attachTo: document.body })

            await arrowOf(row(wrapper, testCase.from)).trigger('click')
            await flushPromises()
            await arrowOf(row(wrapper, testCase.to)).trigger('click')
            await flushPromises()

            expect(wrapper.vm.active).toBe(testCase.to)
            expect(menuOf(row(wrapper, testCase.from)).isVisible()).toBe(false)
            expect(menuOf(row(wrapper, testCase.to)).isVisible()).toBe(true)
        })
    }

    it('закрытие родителем не вызывает обработчик закрытия', async () => {
        const wrapper = mount(Rows, { attachTo: document.body })

        await arrowOf(row(wrapper, 'a')).trigger('click')
        await flushPromises()
        wrapper.vm.active = null
        await flushPromises()

        expect(menuOf(row(wrapper, 'a')).isVisible()).toBe(false)
        expect(wrapper.vm.closes).toBe(0)
    })

    it('даёт стрелке каждой кнопки свой id', () => {
        const wrapper = mount(Rows, { attachTo: document.body })

        const ids = ['a', 'b'].map((name) => {
            const arrowId = arrowOf(row(wrapper, name)).attributes('id')
            expect(arrowId).toBeTruthy()
            expect(menuOf(row(wrapper, name)).attributes('aria-labelledby')).toBe(arrowId)
            return arrowId
        })

        expect(ids[0]).not.toBe(ids[1])
    })
})

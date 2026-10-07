// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import Overlay from '../src/components/Overlay.vue'

enableAutoUnmount(afterEach)

describe('Overlay', () => {
    // Так делает расширение Safari: его обработчик на body останавливает
    // keydown, и до слушателей document на всплытии событие не доходит.
    it('закрывается по Escape, даже если keydown остановили на body', () => {
        const stop = (event) => event.stopPropagation()
        document.body.addEventListener('keydown', stop)

        try {
            const wrapper = mount(Overlay, { props: { isOpen: true }, attachTo: document.body })

            document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

            expect(wrapper.emitted('update:isOpen')).toEqual([[false]])
        } finally {
            document.body.removeEventListener('keydown', stop)
        }
    })
})

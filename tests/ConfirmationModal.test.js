// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h } from 'vue'
import ConfirmationModal from '../src/components/ConfirmationModal.vue'

enableAutoUnmount(afterEach)

// useId() уникален в пределах одного приложения. Два отдельных mount() — это
// два приложения, и разные id у них ничего бы не доказали: обе модалки
// должны жить внутри одного родителя, как две модалки на одной странице.
const TwoModals = {
    render() {
        return h('div', [
            h(ConfirmationModal, { isOpen: true, confirmationHeading: 'Первая', actionButtonText: 'Да' }),
            h(ConfirmationModal, { isOpen: true, confirmationHeading: 'Вторая', actionButtonText: 'Да' }),
        ])
    },
}

describe('ConfirmationModal', () => {
    it('даёт каждой модалке на странице свой id заголовка', () => {
        const wrapper = mount(TwoModals)

        const dialogs = wrapper.findAll('[role="dialog"]')
        expect(dialogs).toHaveLength(2)

        const pairs = dialogs.map((dialog) => ({
            labelledBy: dialog.attributes('aria-labelledby'),
            headingId: dialog.get('h3').attributes('id'),
        }))

        for (const pair of pairs) {
            expect(pair.labelledBy).toBeTruthy()
            expect(pair.labelledBy).toBe(pair.headingId)
        }
        expect(pairs[0].headingId).not.toBe(pairs[1].headingId)
    })

    // Панель Modal не обрезает содержимое, поэтому квадратные фоны блоков
    // закрыли бы её скругление: внешние углы скругляют сами блоки, тем же
    // радиусом, что у панели.
    it('скругляет внешние углы блоков как у панели', () => {
        const wrapper = mount(ConfirmationModal, { props: { isOpen: true, actionButtonText: 'Да' } })

        const panel = wrapper.get('[role="dialog"]')
        const blocks = panel.element.children
        expect(panel.classes()).toContain('bb:rounded-lg')
        expect(blocks).toHaveLength(2)
        expect(blocks[0].classList).toContain('bb:rounded-t-lg')
        expect(blocks[1].classList).toContain('bb:rounded-b-lg')
    })
})

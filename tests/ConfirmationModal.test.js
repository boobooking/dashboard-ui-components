// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

// Фокус модалка захватывает в следующем кадре: кадр наступает после всего
// клика, который её открыл. Кадры happy-dom идут в порядке запроса, поэтому
// кадр теста наступает после кадра модалки.
function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve))
}

function pressEscape() {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
}

describe('ConfirmationModal: фокус', () => {
    // Кнопка страницы, с которой открывают модалку: перед открытием фокус
    // на ней.
    let opener

    beforeEach(() => {
        opener = document.createElement('button')
        opener.textContent = 'Открыть'
        document.body.append(opener)
        opener.focus()
    })

    afterEach(() => {
        opener.remove()
    })

    function mountModal(isOpen, onActionCanceled = () => {}) {
        return mount(ConfirmationModal, {
            props: { isOpen, actionButtonText: 'Удалить', onActionCanceled },
            attachTo: document.body,
        })
    }

    function cancelButton(wrapper) {
        return wrapper.findAll('button').find((button) => button.text() === 'Отмена').element
    }

    it('открыта: до кадра фокус не тронут, после — на кнопке отмены', async () => {
        const wrapper = mountModal(false)
        await wrapper.setProps({ isOpen: true })

        expect(document.activeElement).toBe(opener)
        await nextFrame()
        expect(document.activeElement).toBe(cancelButton(wrapper))
    })

    it('смонтирована открытой: после кадра фокус на кнопке отмены', async () => {
        const wrapper = mountModal(true)
        await nextFrame()

        expect(document.activeElement).toBe(cancelButton(wrapper))
    })

    it('закрыта до кадра: фокус не тронут, Escape событий не даёт', async () => {
        const onActionCanceled = vi.fn()
        const wrapper = mountModal(false, onActionCanceled)
        await wrapper.setProps({ isOpen: true })
        await wrapper.setProps({ isOpen: false })
        await nextFrame()

        expect(document.activeElement).toBe(opener)
        pressEscape()
        expect(onActionCanceled).not.toHaveBeenCalled()
    })

    it('закрыта и открыта снова до кадра: один держатель фокуса', async () => {
        const onActionCanceled = vi.fn()
        const wrapper = mountModal(false, onActionCanceled)
        await wrapper.setProps({ isOpen: true })
        await wrapper.setProps({ isOpen: false })
        await wrapper.setProps({ isOpen: true })
        await nextFrame()

        expect(document.activeElement).toBe(cancelButton(wrapper))
        pressEscape()
        expect(onActionCanceled).toHaveBeenCalledTimes(1)
    })

    // Так открывает модалку пункт меню: меню закрывается позже в том же
    // клике, и браузер возвращает фокус на кнопку меню. Сохранить нужно её,
    // а не пункт, на котором фокус был при рендере.
    it('сохраняет фокус, каким он стал к концу клика', async () => {
        const menuButton = document.createElement('button')
        menuButton.textContent = 'Меню'
        document.body.append(menuButton)

        try {
            const wrapper = mountModal(false)
            await wrapper.setProps({ isOpen: true })
            menuButton.focus()
            await nextFrame()
            expect(document.activeElement).toBe(cancelButton(wrapper))
            await wrapper.setProps({ isOpen: false })

            expect(document.activeElement).toBe(menuButton)
        } finally {
            menuButton.remove()
        }
    })

    it('Escape: в закрытой — ни одного actionCanceled, в открытой — одно', async () => {
        const onActionCanceled = vi.fn()
        const wrapper = mountModal(false, onActionCanceled)
        await nextFrame()
        pressEscape()
        expect(onActionCanceled).not.toHaveBeenCalled()

        await wrapper.setProps({ isOpen: true })
        await nextFrame()
        pressEscape()
        expect(onActionCanceled).toHaveBeenCalledTimes(1)
    })

    it('после закрытия фокус на кнопке, которая была в фокусе до открытия', async () => {
        const wrapper = mountModal(false)
        await wrapper.setProps({ isOpen: true })
        await nextFrame()
        expect(document.activeElement).toBe(cancelButton(wrapper))
        await wrapper.setProps({ isOpen: false })

        expect(document.activeElement).toBe(opener)
    })

    it('размонтирована открытой: Escape событий не даёт, фокус на прежней кнопке', async () => {
        const onActionCanceled = vi.fn()
        const wrapper = mountModal(true, onActionCanceled)
        await nextFrame()
        expect(document.activeElement).toBe(cancelButton(wrapper))
        wrapper.unmount()

        pressEscape()
        expect(onActionCanceled).not.toHaveBeenCalled()
        expect(document.activeElement).toBe(opener)
    })

    // Уход со страницы сразу после открытия: кадр не наступил, модалки уже
    // нет. Кадр без отмены упал бы на панели, которой больше нет.
    it('размонтирована до кадра: фокус не тронут, Escape событий не даёт', async () => {
        const onActionCanceled = vi.fn()
        const wrapper = mountModal(true, onActionCanceled)
        wrapper.unmount()
        await nextFrame()

        expect(document.activeElement).toBe(opener)
        pressEscape()
        expect(onActionCanceled).not.toHaveBeenCalled()
    })

    // Подтверждение удалило строку вместе с кнопкой, с которой открыли модалку.
    it('кнопки, с которой открыли, уже нет: закрытие без ошибок, фокус не на ней', async () => {
        const errors = []
        const wrapper = mount(ConfirmationModal, {
            props: { isOpen: false, actionButtonText: 'Удалить' },
            attachTo: document.body,
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })
        await wrapper.setProps({ isOpen: true })
        await nextFrame()
        opener.remove()
        await wrapper.setProps({ isOpen: false })

        expect(errors).toEqual([])
        expect(document.activeElement).not.toBe(opener)
    })
})

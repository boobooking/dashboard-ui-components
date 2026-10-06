// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { canControlPopover, closeOnScrollAndResize, isPopoverOpen, placePopover } from '../src/popover.js'

// У happy-dom clientWidth и clientHeight корня — нули: окно задаётся явно.
function viewport(width, height) {
    Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: width })
    Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: height })
}

function anchorAt(rect) {
    return { getBoundingClientRect: () => ({ ...rect }) }
}

afterEach(() => {
    delete document.documentElement.clientWidth
    delete document.documentElement.clientHeight
    document.body.innerHTML = ''
})

describe('placePopover', () => {
    it('открывает вниз, когда снизу места не меньше, правый край — по кнопке', () => {
        viewport(1000, 800)
        const popover = document.createElement('div')

        placePopover(anchorAt({ top: 100, bottom: 120, left: 900, right: 920 }), popover)

        expect(popover.style.top).toBe('124px')
        expect(popover.style.bottom).toBe('auto')
        expect(popover.style.right).toBe('80px')
        expect(popover.style.left).toBe('auto')
        expect(popover.style.maxHeight).toBe('668px')
        expect(popover.style.maxWidth).toBe('')
    })

    it('открывает вверх, когда сверху места больше', () => {
        viewport(1000, 800)
        const popover = document.createElement('div')

        placePopover(anchorAt({ top: 700, bottom: 720, left: 900, right: 920 }), popover)

        expect(popover.style.top).toBe('auto')
        expect(popover.style.bottom).toBe('104px')
        expect(popover.style.maxHeight).toBe('688px')
    })

    it('не прижимает правый край ближе 8 px к краю окна', () => {
        viewport(1000, 800)
        const popover = document.createElement('div')

        placePopover(anchorAt({ top: 100, bottom: 120, left: 1080, right: 1100 }), popover)

        expect(popover.style.right).toBe('8px')
    })

    it('сужает до места слева, если maxWidth шире', () => {
        viewport(1000, 800)
        const popover = document.createElement('div')

        placePopover(anchorAt({ top: 100, bottom: 120, left: 120, right: 140 }), popover, { maxWidth: 224 })
        expect(popover.style.maxWidth).toBe('132px')

        placePopover(anchorAt({ top: 100, bottom: 120, left: 900, right: 920 }), popover, { maxWidth: 224 })
        expect(popover.style.maxWidth).toBe('224px')
    })

    it('в крошечном окне ширина и высота не уходят ниже нуля', () => {
        viewport(10, 10)
        const popover = document.createElement('div')

        placePopover(anchorAt({ top: 5, bottom: 9, left: 1, right: 9 }), popover, { maxWidth: 224 })

        expect(popover.style.maxHeight).toBe('0px')
        expect(popover.style.maxWidth).toBe('0px')
    })
})

describe('canControlPopover и isPopoverOpen', () => {
    it('без Popover API — нельзя управлять и закрыто', () => {
        const element = document.createElement('div')

        expect(canControlPopover(element)).toBe(false)
        expect(canControlPopover(null)).toBe(false)
        expect(isPopoverOpen(element)).toBe(false)
    })

    it('с API — открыто по :popover-open', () => {
        const element = { showPopover() {}, matches: (selector) => selector === ':popover-open' }

        expect(canControlPopover(element)).toBe(true)
        expect(isPopoverOpen(element)).toBe(true)
    })
})

describe('closeOnScrollAndResize', () => {
    it('закрывает при прокрутке вне элемента и при изменении размера окна', () => {
        const popover = document.createElement('div')
        const inside = document.createElement('p')
        popover.appendChild(inside)
        document.body.appendChild(popover)
        const close = vi.fn()

        const stop = closeOnScrollAndResize(popover, close)

        document.dispatchEvent(new Event('scroll'))
        expect(close).toHaveBeenCalledTimes(1)

        popover.dispatchEvent(new Event('scroll'))
        inside.dispatchEvent(new Event('scroll'))
        expect(close).toHaveBeenCalledTimes(1)

        window.dispatchEvent(new Event('resize'))
        expect(close).toHaveBeenCalledTimes(2)

        stop()
        document.dispatchEvent(new Event('scroll'))
        window.dispatchEvent(new Event('resize'))
        expect(close).toHaveBeenCalledTimes(2)
    })
})

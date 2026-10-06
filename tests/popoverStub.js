// Минимальная замена Popover API для happy-dom 20: в нём нет showPopover,
// hidePopover, событий beforetoggle и toggle и селектора :popover-open, а
// popoverTargetElement кнопки не связывается с атрибутом popovertarget.
// Поведение повторяет браузер в том, на что опираются компоненты пакета:
//
// - beforetoggle приходит синхронно, до смены состояния;
// - toggle приходит отложенной задачей, а переключения подряд до неё
//   объединяются в одно событие: oldState — первого, newState — последнего;
// - открытие popover="auto" закрывает другие открытые auto;
// - клик по кнопке с popovertarget переключает свой элемент;
// - клик вне открытых auto и Escape закрывают их.
//
// Синхронный toggle здесь недопустим: он пропустил бы компонент, который
// гасит ответное событие временным флагом вокруг showPopover().

const OPEN = Symbol('popoverOpen')
const PENDING = Symbol('pendingToggle')

function stateEvent(type, oldState, newState) {
    return Object.assign(new Event(type, { cancelable: type === 'beforetoggle' }), { oldState, newState })
}

function queueToggle(element, oldState, newState) {
    if (element[PENDING]) {
        element[PENDING].newState = newState
        return
    }

    element[PENDING] = { oldState, newState }
    setTimeout(() => {
        const pending = element[PENDING]
        delete element[PENDING]
        element.dispatchEvent(stateEvent('toggle', pending.oldState, pending.newState))
    }, 0)
}

function isAuto(element) {
    return element.getAttribute('popover') === 'auto' || element.getAttribute('popover') === ''
}

export function installPopoverStub() {
    const prototype = window.HTMLElement.prototype
    const originalMatches = window.Element.prototype.matches
    // Открытые auto в порядке открытия: Escape закрывает последний.
    const openAuto = []

    function hide(element) {
        if (element[OPEN] !== true) {
            return
        }

        element.dispatchEvent(stateEvent('beforetoggle', 'open', 'closed'))
        element[OPEN] = false
        const position = openAuto.indexOf(element)
        if (position !== -1) {
            openAuto.splice(position, 1)
        }
        queueToggle(element, 'open', 'closed')
    }

    function show(element) {
        if (element[OPEN] === true) {
            throw new DOMException('Элемент уже открыт', 'InvalidStateError')
        }
        if (!element.isConnected) {
            throw new DOMException('Элемент не в документе', 'InvalidStateError')
        }

        if (isAuto(element)) {
            for (const other of [...openAuto]) {
                hide(other)
            }
        }

        element.dispatchEvent(stateEvent('beforetoggle', 'closed', 'open'))
        element[OPEN] = true
        if (isAuto(element)) {
            openAuto.push(element)
        }
        queueToggle(element, 'closed', 'open')
    }

    prototype.showPopover = function () {
        show(this)
    }
    prototype.hidePopover = function () {
        hide(this)
    }
    window.Element.prototype.matches = function (selector) {
        if (selector === ':popover-open') {
            return this[OPEN] === true
        }

        return originalMatches.call(this, selector)
    }

    function onClick(event) {
        const invoker = event.target.closest?.('[popovertarget]')
        const target = invoker ? document.getElementById(invoker.getAttribute('popovertarget')) : null

        if (target) {
            if (target[OPEN] === true) {
                hide(target)
            } else {
                show(target)
            }
            return
        }

        for (const element of [...openAuto]) {
            if (!element.contains(event.target)) {
                hide(element)
            }
        }
    }

    function onKeydown(event) {
        if (event.key === 'Escape' && openAuto.length > 0) {
            hide(openAuto[openAuto.length - 1])
        }
    }

    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeydown)

    return () => {
        delete prototype.showPopover
        delete prototype.hidePopover
        window.Element.prototype.matches = originalMatches
        document.removeEventListener('click', onClick)
        document.removeEventListener('keydown', onKeydown)
    }
}

// Ждёт отложенные события toggle: таймер, поставленный раньше, срабатывает
// раньше этого.
export function flushToggles() {
    return new Promise((resolve) => setTimeout(resolve, 0))
}

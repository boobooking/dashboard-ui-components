// Фокус Safari (WebKit) в дополнение к popoverStub: при скрытии панели
// фокус с её элемента снимается на body — при любом способе закрытия
// (hidePopover, Escape, клик вне). Обработчик beforetoggle самой панели
// видит фокус ещё на месте, как в браузере, где фокус уходит при скрытии,
// уже после beforetoggle: снятие вешается на панель во время захвата на
// document и поэтому срабатывает после обработчиков, которые на ней уже
// стоят. Клик по элементу фокус и так не ставит: element.click()
// в happy-dom, как в Safari, фокус не двигает.
export function installSafariFocus() {
    function blurFocusedInside(event) {
        const active = document.activeElement

        if (event.newState === 'closed' && event.target.contains(active)) {
            active.blur()
        }
    }

    function onBeforeToggle(event) {
        event.target.addEventListener('beforetoggle', blurFocusedInside, { once: true })
    }

    document.addEventListener('beforetoggle', onBeforeToggle, true)

    return () => document.removeEventListener('beforetoggle', onBeforeToggle, true)
}

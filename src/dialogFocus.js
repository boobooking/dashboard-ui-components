// Фокус открытого диалога: начальный — на элемент с data-dialog-focus, без
// него — на первый; Tab и Shift+Tab — по кругу внутри панели; Escape —
// onEscape. Возвращает функцию, которая снимает слушатель и возвращает
// фокус туда, где он был до вызова.
// Внутренний модуль пакета: им держит фокус Modal (ConfirmationModal).

// Элементы фокуса модалок пакета — кнопки и ссылки. Отключённая кнопка
// фокус не принимает, и переход на неё оборвал бы круг.
const ITEMS = 'a[href], button:not(:disabled)'

// Слушатель висит на document в фазе захвата — как у moveMenuFocus:
// расширения браузера останавливают keydown на body, и до document на
// всплытии клавиша не доходит. Каждый Tab ведёт модуль, а не браузер:
// Safari по умолчанию пропускает кнопки и увёл бы фокус из панели. Фокус
// вне панели — Tab ставит его на первый элемент, Shift+Tab — на последний.
// Escape не отменяется: модалку закрывает родитель, а у браузера на Escape
// свои действия.
export function holdDialogFocus(panel, onEscape) {
    const previous = document.activeElement
    const initial = panel.querySelector('[data-dialog-focus]') ?? panel.querySelector(ITEMS)
    initial?.focus()

    const onKeydown = (event) => {
        if (event.key === 'Escape') {
            onEscape()
            return
        }

        if (event.key !== 'Tab') {
            return
        }

        const items = [...panel.querySelectorAll(ITEMS)]
        if (items.length === 0) {
            return
        }

        event.preventDefault()

        const step = event.shiftKey ? -1 : 1
        const current = items.indexOf(document.activeElement)
        const next = current === -1
            ? (step === 1 ? 0 : items.length - 1)
            : (current + step + items.length) % items.length

        items[next].focus()
    }

    document.addEventListener('keydown', onKeydown, true)

    let released = false

    // Фокус возвращается, только если он потерян или ещё в панели: фокус,
    // который страница поставила в другое место, не забирается. Прежнего
    // элемента может уже не быть — строку, из меню которой открыли диалог,
    // удалили. Страница к нему не прокручивается, как в PopoverPanel.
    return () => {
        if (released) {
            return
        }
        released = true

        document.removeEventListener('keydown', onKeydown, true)

        const active = document.activeElement
        const isLost = active === null || active === document.body || panel.contains(active)
        const canReturn = previous !== null && previous !== document.body && previous.isConnected
        if (isLost && canReturn) {
            previous.focus({ preventScroll: true })
        }
    }
}

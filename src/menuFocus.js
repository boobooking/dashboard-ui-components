// Фокус по пунктам открытого меню ведут стрелки вверх и вниз и мышь.
// Подсветка пункта — это фокус, поэтому подсвечен всегда один пункт: тот,
// на который последней указали клавиатура или мышь.
// Внутренний модуль пакета: им ходят по спискам SelectSingle и меню
// DropdownButtonWithAction.

// Пункты меню — кнопки и ссылки: Enter и пробел на них браузер превращает
// в клик сам, и выбор с клавиатуры идёт тем же путём, что и мышью.
const ITEMS = 'a[href], button'

// Слушатель стрелок висит на document: фокус в момент нажатия может быть где
// угодно, а Safari после клика мышью оставляет его на body. Фаза захвата —
// потому что расширения браузера останавливают keydown на body, и до document
// на всплытии стрелка не доходит. Стрелки, перехваченные меню, страницу
// не прокручивают. Пока фокус вне меню, отсчёт идёт от выбранного пункта,
// если он есть: вниз — следующий за ним, вверх — предыдущий; без выбранного
// вниз — первый пункт, вверх — последний. С краёв фокус уходит по кругу.
// Движение мыши по пункту ставит фокус на него: стрелки продолжают от пункта
// под курсором. Возвращает функцию, снимающую оба слушателя.
export function moveMenuFocus(menu, findSelected = () => null) {
    const onKeydown = (event) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
            return
        }

        const items = [...menu.querySelectorAll(ITEMS)]
        if (items.length === 0) {
            return
        }

        event.preventDefault()

        const step = event.key === 'ArrowDown' ? 1 : -1
        let current = items.indexOf(document.activeElement)
        if (current === -1) {
            current = items.indexOf(findSelected())
        }

        const next = current === -1
            ? (step === 1 ? 0 : items.length - 1)
            : (current + step + items.length) % items.length

        items[next].focus()
    }

    // mousemove, а не mouseover: после стрелки курсор стоит на прежнем пункте,
    // и сдвиг мыши в его пределах должен вернуть фокус под курсор.
    const onMousemove = (event) => {
        const item = event.target.closest(ITEMS)

        if (item !== null) {
            item.focus()
        }
    }

    document.addEventListener('keydown', onKeydown, true)
    menu.addEventListener('mousemove', onMousemove)

    return () => {
        document.removeEventListener('keydown', onKeydown, true)
        menu.removeEventListener('mousemove', onMousemove)
    }
}

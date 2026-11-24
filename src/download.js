// Скачивание файла запросом, а не переходом браузера: страница знает, когда
// файл пришёл, и показывает работу, например на ActionPill. Функция общая
// для дашбордов; компоненты о ней не знают, вызывает её страница. window
// и document — только при вызове: загрузке модуля на сервере это не мешает.

// Столько живёт blob-адрес после клика: немедленное освобождение в части
// браузеров обрывает скачивание (так же делает FileSaver.js).
const REVOKE_DELAY_MS = 40000

// Имя из Content-Disposition: сначала filename*=UTF-8''…, затем
// filename="…" или filename=… без кавычек — так отдаёт Laravel. Битое
// кодирование filename* — как его отсутствие.
function nameFromDisposition(header) {
    if (typeof header !== 'string') {
        return null
    }

    const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)
    if (encoded !== null) {
        try {
            return decodeURIComponent(encoded[1].trim())
        } catch {
            // ищем filename
        }
    }

    const quoted = /filename\s*=\s*"([^"]+)"/i.exec(header)
    if (quoted !== null) {
        return quoted[1]
    }

    const plain = /filename\s*=\s*([^;"\s]+)/i.exec(header)

    return plain === null ? null : plain[1]
}

// Последний непустой сегмент пути адреса.
function nameFromPath(url) {
    try {
        const segments = new URL(url, window.location.href).pathname.split('/').filter((segment) => segment !== '')

        return segments.length === 0 ? null : decodeURIComponent(segments[segments.length - 1])
    } catch {
        return null
    }
}

export async function downloadFile(url) {
    const response = await fetch(url, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })

    // Сервер перенаправил: без проверки под видом файла сохранилась бы
    // разметка страницы, куда он привёл. redirectUrl — куда в итоге привёл
    // сервер: страница может отправить пользователя туда же, куда отправила
    // бы ссылка.
    if (response.redirected) {
        throw Object.assign(new Error(`downloadFile: сервер перенаправил запрос ${url}`), { redirectUrl: response.url, status: null, sessionExpired: false })
    }

    // С заголовком X-Requested-With запрос для Laravel «ожидает JSON», и на
    // истёкшую сессию он отвечает 401, а не перенаправлением на страницу
    // входа: страница отличает этот отказ по sessionExpired.
    if (response.status === 401) {
        throw Object.assign(new Error(`downloadFile: сессия истекла, ответ 401 на ${url}`), { redirectUrl: null, status: 401, sessionExpired: true })
    }

    if (!response.ok) {
        throw Object.assign(new Error(`downloadFile: ответ ${response.status} на ${url}`), { redirectUrl: null, status: response.status, sessionExpired: false })
    }

    const name = nameFromDisposition(response.headers.get('Content-Disposition')) ?? nameFromPath(url) ?? 'download'
    const blobUrl = URL.createObjectURL(await response.blob())
    const link = document.createElement('a')

    link.href = blobUrl
    link.download = name
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()

    setTimeout(() => URL.revokeObjectURL(blobUrl), REVOKE_DELAY_MS)
}

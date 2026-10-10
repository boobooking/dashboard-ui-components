// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadFile } from '../src/download.js'

// fetch, blob-адреса и клик по ссылке подменяются: в happy-dom скачивания
// нет, а проверить нужно, что и как отдано браузеру.
const BLOB_URL = 'blob:https://dashboard.test/1'
const original = {}
let clicks
let fetchMock

function response({ status = 200, redirected = false, disposition = null } = {}) {
    const headers = new Headers()
    if (disposition !== null) {
        headers.set('Content-Disposition', disposition)
    }

    return { ok: status >= 200 && status < 300, status, redirected, headers, blob: async () => new Blob(['xlsx']) }
}

beforeEach(() => {
    vi.useFakeTimers()
    clicks = []
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    original.create = URL.createObjectURL
    original.revoke = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => BLOB_URL)
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
        clicks.push({ href: this.getAttribute('href'), download: this.getAttribute('download'), connected: this.isConnected })
    })
})

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    URL.createObjectURL = original.create
    URL.revokeObjectURL = original.revoke
    document.body.innerHTML = ''
})

describe('downloadFile: запрос и файл', () => {
    it('запрос с cookie сессии; скрытая ссылка на blob кликнута и убрана', async () => {
        fetchMock.mockResolvedValue(response({ disposition: 'attachment; filename=orders_export.xlsx' }))

        await downloadFile('/orders/export?phone=7')

        expect(fetchMock).toHaveBeenCalledWith('/orders/export?phone=7', { credentials: 'same-origin' })
        expect(clicks).toEqual([{ href: BLOB_URL, download: 'orders_export.xlsx', connected: true }])
        expect(document.body.querySelector('a')).toBeNull()
    })

    it.each([
        ['filename без кавычек (Laravel)', 'attachment; filename=orders_export.xlsx', '/export', 'orders_export.xlsx'],
        ['filename в кавычках', 'attachment; filename="orders export.xlsx"', '/export', 'orders export.xlsx'],
        ['filename* главнее filename', 'attachment; filename="fallback.xlsx"; filename*=UTF-8\'\'%D0%BE%D1%82%D1%87%D1%91%D1%82.xlsx', '/export', 'отчёт.xlsx'],
        ['битый filename* — берётся filename', 'attachment; filename="fallback.xlsx"; filename*=UTF-8\'\'%E0%A4%A', '/export', 'fallback.xlsx'],
        ['заголовок без имени — последний сегмент пути', 'attachment', '/files/orders%20report.xlsx?page=2', 'orders report.xlsx'],
        ['без заголовка — последний сегмент пути', null, '/build/ui-playground/report.csv', 'report.csv'],
        ['без заголовка и пути — download', null, '/', 'download'],
    ])('имя файла: %s', async (_, disposition, url, expected) => {
        fetchMock.mockResolvedValue(response({ disposition }))

        await downloadFile(url)

        expect(clicks[0].download).toBe(expected)
    })

    it('blob-адрес освобождается через 40 секунд, не раньше', async () => {
        fetchMock.mockResolvedValue(response())

        await downloadFile('/export')

        vi.advanceTimersByTime(39999)
        expect(URL.revokeObjectURL).not.toHaveBeenCalled()
        vi.advanceTimersByTime(1)
        expect(URL.revokeObjectURL).toHaveBeenCalledWith(BLOB_URL)
    })
})

describe('downloadFile: отказ', () => {
    it.each([404, 500])('ответ %s — отказ с кодом, файла нет', async (status) => {
        fetchMock.mockResolvedValue(response({ status }))

        await expect(downloadFile('/export')).rejects.toThrow(String(status))
        expect(URL.createObjectURL).not.toHaveBeenCalled()
        expect(clicks).toEqual([])
    })

    it('перенаправление (истёкшая сессия) — отказ, страница входа не сохраняется', async () => {
        fetchMock.mockResolvedValue(response({ redirected: true, disposition: null }))

        await expect(downloadFile('/export')).rejects.toThrow('перенаправил')
        expect(clicks).toEqual([])
    })

    it('сетевая ошибка — отказ той же ошибкой', async () => {
        const failure = new TypeError('Failed to fetch')
        fetchMock.mockRejectedValue(failure)

        await expect(downloadFile('/export')).rejects.toBe(failure)
        expect(clicks).toEqual([])
    })
})

import { createServer } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { downloadFile } from '../src/download.js'

// Настоящий fetch Node и настоящий HTTP-сервер: fetch по стандарту Fetch сам
// идёт за перенаправлением и заполняет redirected и url, как браузер.
// В tests/download.test.js эти значения ответа пишутся руками. До DOM
// функция здесь не доходит: отказ происходит раньше URL.createObjectURL.
let server
let origin

beforeAll(async () => {
    server = createServer((request, response) => {
        if (request.url === '/old-export') {
            response.writeHead(302, { Location: '/export' })
            response.end()
            return
        }

        if (request.url === '/export') {
            response.writeHead(302, { Location: '/login' })
            response.end()
            return
        }

        if (request.url === '/login') {
            response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            response.end('<form method="post" action="/login"></form>')
            return
        }

        response.writeHead(404)
        response.end()
    })

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    origin = `http://127.0.0.1:${server.address().port}`
})

// close закрывает и простаивающие соединения keep-alive, оставшиеся от fetch
// (Node 19+), поэтому ждать их таймаута не приходится.
afterAll(() => new Promise((resolve) => server.close(resolve)))

describe('downloadFile: отказ на настоящем сервере', () => {
    it('302 на /login — redirectUrl с полным адресом страницы входа, status null', async () => {
        const error = await downloadFile(`${origin}/export`).catch((failure) => failure)

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe(`downloadFile: сервер перенаправил запрос ${origin}/export`)
        expect(error.redirectUrl).toBe(`${origin}/login`)
        expect(error.status).toBeNull()
    })

    it('цепочка перенаправлений — redirectUrl с последним адресом', async () => {
        const error = await downloadFile(`${origin}/old-export`).catch((failure) => failure)

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe(`downloadFile: сервер перенаправил запрос ${origin}/old-export`)
        expect(error.redirectUrl).toBe(`${origin}/login`)
        expect(error.status).toBeNull()
    })

    it('404 — status с кодом, redirectUrl null', async () => {
        const error = await downloadFile(`${origin}/missing`).catch((failure) => failure)

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe(`downloadFile: ответ 404 на ${origin}/missing`)
        expect(error.status).toBe(404)
        expect(error.redirectUrl).toBeNull()
    })
})

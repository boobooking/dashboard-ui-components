import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    root: 'playground',
    plugins: [vue(), tailwindcss()],
    build: {
        rollupOptions: {
            // Обе страницы: статическую сборку playground отдают браузеру для
            // приёмки, и без входа страница хоста в неё не попадает.
            input: {
                index: fileURLToPath(new URL('./playground/index.html', import.meta.url)),
                host: fileURLToPath(new URL('./playground/host.html', import.meta.url)),
            },
        },
    },
})

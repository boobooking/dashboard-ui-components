import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [vue(), tailwindcss()],
    build: {
        lib: {
            entry: 'src/index.js',
            formats: ['es'],
            fileName: 'index',
            cssFileName: 'style',
        },
        rollupOptions: {
            // vue приходит от приложения, imask и pikaday резолвятся у
            // потребителя через npm: своя копия в каждом пакете означала бы
            // две маски в одном бандле.
            external: ['vue', 'imask', 'pikaday'],
        },
    },
})

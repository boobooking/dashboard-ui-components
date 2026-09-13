import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    root: 'playground',
    plugins: [vue(), tailwindcss()],
})

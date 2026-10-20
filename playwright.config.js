import { defineConfig, devices } from '@playwright/test'

// Браузерные тесты Playground. Суффикс `.e2e.js`, а не `.test.js` или
// `.spec.js`: эти два подхватил бы `vitest run`.
export default defineConfig({
    testDir: './e2e',
    testMatch: '**/*.e2e.js',
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    ],
    webServer: {
        command: 'vite --config vite.playground.config.js --host 127.0.0.1 --port 4179 --strictPort',
        url: 'http://127.0.0.1:4179/index.html',
        reuseExistingServer: false,
    },
    use: {
        baseURL: 'http://127.0.0.1:4179/',
    },
})

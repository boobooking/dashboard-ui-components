// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { dashboardUi } from '../src/plugin.js'

describe('dashboardUi', () => {
    const cases = [
        { name: 'без параметров', options: undefined, throws: null },
        { name: 'lang ru', options: { lang: 'ru' }, throws: null },
        { name: 'lang en и функция navigate', options: { lang: 'en', navigate: () => {} }, throws: null },
        { name: 'неизвестный lang', options: { lang: 'de' }, throws: /lang «de»/ },
        { name: 'navigate не функция', options: { navigate: '/next' }, throws: /navigate/ },
        // «Не передано» — только отсутствующий ключ. Явные null и undefined —
        // переданные значения и отклоняются, как любые другие.
        { name: 'lang: null', options: { lang: null }, throws: /lang «null»/ },
        { name: 'navigate: null', options: { navigate: null }, throws: /navigate/ },
        { name: 'lang: undefined', options: { lang: undefined }, throws: /lang «undefined»/ },
        { name: 'navigate: undefined', options: { navigate: undefined }, throws: /navigate/ },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            const install = () => createApp({ render: () => null }).use(dashboardUi, testCase.options)

            if (testCase.throws === null) {
                expect(install).not.toThrow()
            } else {
                expect(install).toThrow(testCase.throws)
            }
        })
    }
})

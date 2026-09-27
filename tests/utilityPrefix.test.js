import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { babelParse, parse } from 'vue/compiler-sfc'

// Утилиты пакета собраны с префиксом bb (src/styles/index.css). Класс без
// префикса Tailwind пакета не сгенерирует: в голом приложении стиль молча
// пропадёт, а в приложении с Tailwind его подменит одноимённый класс
// приложения. Тест проверяет каждый класс в разметке каждого компонента.

const componentsDir = fileURLToPath(new URL('../src/components', import.meta.url))

// Типы узлов AST шаблона из @vue/compiler-core.
const ELEMENT = 1
const ATTRIBUTE = 6
const DIRECTIVE = 7

function vueFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) return vueFiles(full)
        return entry.name.endsWith('.vue') ? [full] : []
    })
}

function walk(node, visit) {
    visit(node)
    for (const child of node.children ?? []) walk(child, visit)
}

// Классы в :class записываются литералами: ключи объекта, ветки тернарного
// оператора, элементы массива, строка. Условия — не классы, их не трогаем.
// Любая другая форма не проверяется статически, поэтому запрещена.
function classLiterals(node) {
    switch (node.type) {
        case 'ObjectExpression':
            return node.properties.map((property) => {
                if (property.type !== 'ObjectProperty' || property.key.type !== 'StringLiteral') {
                    throw new Error(`ключ в :class должен быть строковым литералом, а не ${property.key?.type ?? property.type}`)
                }
                return property.key.value
            })
        case 'ConditionalExpression':
            return [...classLiterals(node.consequent), ...classLiterals(node.alternate)]
        case 'ArrayExpression':
            return node.elements.flatMap(classLiterals)
        case 'StringLiteral':
            return [node.value]
        default:
            throw new Error(`форма ${node.type} в :class не проверяется — запишите классы литералами`)
    }
}

// Проп несёт классы: сам class, кебаб-пропсы <transition> вида enter-active-class
// или их camelCase-запись enterActiveClass (Vue допускает оба написания атрибута).
function isClassProp(name) {
    return name === 'class' || name.endsWith('-class') || name.endsWith('Class')
}

function classTokens(source) {
    const { descriptor, errors } = parse(source)
    if (errors.length > 0) throw errors[0]

    if (descriptor.template === null) {
        throw new Error('компонент без <template> — классы в render-функции тест не проверяет')
    }

    const tokens = []
    walk(descriptor.template.ast, (node) => {
        if (node.type !== ELEMENT) return

        for (const prop of node.props) {
            // class и пропсы <transition> вида enter-active-class / enterActiveClass
            if (prop.type === ATTRIBUTE && isClassProp(prop.name) && prop.value) {
                tokens.push(...prop.value.content.split(/\s+/))
            }

            if (prop.type === DIRECTIVE && prop.name === 'bind') {
                if (prop.arg) {
                    // v-bind:имя="…" — имя статически известно только если это не [динамика]
                    if (!prop.arg.isStatic) {
                        throw new Error(
                            `v-bind:[${prop.arg.content}] с динамическим именем пропа не проверяется — ` +
                                'имя статически неизвестно, замените на статический проп или :class',
                        )
                    }

                    if (isClassProp(prop.arg.content)) {
                        const expression = babelParse(`(${prop.exp.content})`).program.body[0].expression
                        tokens.push(...classLiterals(expression).flatMap((literal) => literal.split(/\s+/)))
                    }
                } else {
                    // v-bind="…" без аргумента — целиком объект пропов
                    const expression = babelParse(`(${prop.exp.content})`).program.body[0].expression

                    if (expression.type === 'Identifier' && expression.name === '$attrs') {
                        // разрешено: Popup.vue пробрасывает атрибуты приложения на меню
                    } else if (expression.type === 'ObjectExpression') {
                        const classKey = expression.properties.find((property) => {
                            if (property.type !== 'ObjectProperty') return false
                            if (property.key.type === 'StringLiteral') return isClassProp(property.key.value)
                            if (property.key.type === 'Identifier' && !property.computed) return isClassProp(property.key.name)
                            return false
                        })

                        if (classKey) {
                            throw new Error(
                                'v-bind="{ … }" содержит проп классов — перенесите его в class или :class, иначе он не проверяется',
                            )
                        }
                    } else {
                        throw new Error(
                            `выражение "${prop.exp.content}" в v-bind без аргумента не проверяется статически — ` +
                                'замените на class, :class или v-bind="$attrs"',
                        )
                    }
                }
            }
        }
    })

    return tokens.filter(Boolean)
}

const files = vueFiles(componentsDir)

describe('префикс bb у утилит в разметке компонентов', () => {
    it('компоненты найдены', () => {
        expect(files.length).toBeGreaterThan(0)
    })

    for (const file of files) {
        it(path.relative(componentsDir, file), () => {
            const unprefixed = classTokens(fs.readFileSync(file, 'utf8'))
                .filter((token) => token !== 'bb-dashboard-ui' && !token.startsWith('bb:'))

            expect(unprefixed).toEqual([])
        })
    }
})

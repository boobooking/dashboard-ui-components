// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h, nextTick, ref } from 'vue'
import { messages } from '../src/i18n.js'
import AmountInput from '../src/components/AmountInput.vue'
import CrossButton from '../src/components/CrossButton.vue'

let errors
let warnings

beforeEach(() => {
    errors = []
    warnings = []
})

afterEach(() => {
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
})

// Хуки afterEach идут в обратном порядке: размонтирование — до проверки выше.
enableAutoUnmount(afterEach)

// attachTo нужен фокусу: элементу вне документа его не дать.
function mountOptions() {
    return {
        attachTo: document.body,
        global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } },
    }
}

function mountAmount(props = {}) {
    return mount(AmountInput, { props, ...mountOptions() })
}

// Настоящая связка v-model: родитель сразу отвечает на update:modelValue.
function mountBound(props = {}, initial = null) {
    const value = ref(initial)
    const changes = []
    const wrapper = mount({
        render: () => h(AmountInput, {
            ...props,
            modelValue: value.value,
            'onUpdate:modelValue': (next) => {
                value.value = next
            },
            onChanged: () => changes.push(value.value),
        }),
    }, mountOptions())

    return { wrapper, value, changes }
}

const wholeOf = (wrapper) => wrapper.findAll('input')[0]
const fractionOf = (wrapper) => wrapper.findAll('input')[1]
const separatorOf = (wrapper) => fractionOf(wrapper).element.previousElementSibling
const eraserOf = (wrapper) => wrapper.findComponent(CrossButton)
const prefixOf = (wrapper) => wrapper.findAll('span').find((span) => span.text() === 'от').element
const rootOf = (wrapper) => wrapper.element

function parts(wrapper) {
    return wrapper.findAll('input').map((input) => input.element.value)
}

function expectNoEvents(wrapper) {
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('changed')).toBeUndefined()
}

async function focus(input) {
    input.element.focus()
    await nextTick()
}

async function blur(input) {
    input.element.blur()
    await nextTick()
}

function press(input, key, modifiers = {}) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers })

    input.element.dispatchEvent(event)

    return event
}

// Настоящая последовательность нажатия. По неотменённому mousedown браузер
// переводит фокус на элемент под указателем или снимает его, happy-dom — нет.
function pressMouse(element, button = 0) {
    const init = { bubbles: true, cancelable: true, button }
    const mousedown = new MouseEvent('mousedown', init)

    element.dispatchEvent(mousedown)
    if (!mousedown.defaultPrevented) {
        const focusable = element.closest('input, button')

        if (focusable) {
            focusable.focus()
        } else {
            document.activeElement?.blur()
        }
    }
    element.dispatchEvent(new MouseEvent('mouseup', init))
    if (button === 0) {
        element.dispatchEvent(new MouseEvent('click', init))
    }

    return mousedown
}

function paste(input, text) {
    const event = new Event('paste', { bubbles: true, cancelable: true })

    Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } })
    input.element.dispatchEvent(event)

    return event
}

// happy-dom шлёт select прямо из setSelectionRange, и поле вернуло бы курсор
// раньше проверяемого события; браузер шлёт его отдельной задачей.
function selectRange(wrapper, input, start, end) {
    const stop = (event) => event.stopPropagation()

    wrapper.element.addEventListener('select', stop, { capture: true })
    input.element.setSelectionRange(start, end)
    wrapper.element.removeEventListener('select', stop, { capture: true })
}

function selection(input) {
    return [input.element.selectionStart, input.element.selectionEnd]
}

function frame() {
    return new Promise((resolve) => requestAnimationFrame(resolve))
}

async function pressEraser(wrapper) {
    const eraser = eraserOf(wrapper)

    await eraser.trigger('click')
    await Promise.all(eraser.element.getAnimations().map((animation) => animation.finished))
    await flushPromises()
}

describe('AmountInput: ввод', () => {
    it.each([
        ['ru', '1 234'],
        ['en', '1,234'],
    ])('1234 в основной части, %s: поле %s, событие 123400', async (lang, shown) => {
        const wrapper = mountAmount({ lang })

        await wholeOf(wrapper).setValue('1234')

        expect(wholeOf(wrapper).element.value).toBe(shown)
        expect(wrapper.emitted('update:modelValue')).toEqual([[123400]])
    })

    it.each([
        ['основная часть', wholeOf, '1 234a'],
        ['копейки', fractionOf, '56a'],
    ])('буква в поле не остаётся на экране, значение и событие прежние: %s', async (_name, inputOf, typed) => {
        const wrapper = mountAmount({ modelValue: 123456 })

        await inputOf(wrapper).setValue(typed)

        expect(parts(wrapper)).toEqual(['1 234', '56'])
        expectNoEvents(wrapper)
    })

    it.each([
        ['основная часть', wholeOf],
        ['копейки', fractionOf],
    ])('буква в пустом поле стирается: %s', async (_name, inputOf) => {
        const wrapper = mountAmount()

        await inputOf(wrapper).setValue('a')

        expect(parts(wrapper)).toEqual(['', ''])
        expectNoEvents(wrapper)
    })

    it('ведущие нули убираются: 007 становится 7', async () => {
        const wrapper = mountAmount()
        const whole = wholeOf(wrapper)

        await whole.setValue('0')
        await whole.setValue('00')
        expect(whole.element.value).toBe('0')

        await whole.setValue('007')

        expect(whole.element.value).toBe('7')
        expect(wrapper.emitted('update:modelValue')).toEqual([[0], [700]])
    })

    it.each([
        [2, 13],
        [0, 15],
        [3, 12],
    ])('digits: %i — в основной части не больше %i цифр', async (digits, limit) => {
        const wrapper = mountAmount({ digits })

        await wholeOf(wrapper).setValue('1'.repeat(20))

        expect(wholeOf(wrapper).element.value.replace(/\D/g, '')).toBe('1'.repeat(limit))
        expect(wrapper.emitted('update:modelValue')).toEqual([[Number('1'.repeat(limit)) * 10 ** digits]])
    })

    it.each([
        ['ru', 2, ',', true],
        ['ru', 2, '.', true],
        ['en', 2, '.', true],
        ['en', 2, ',', false],
        ['ru', 0, ',', false],
        ['ru', 0, '.', false],
        ['en', 0, '.', false],
    ])('%s, digits: %i — клавиша «%s» переводит в копейки: %s', async (lang, digits, key, moves) => {
        const wrapper = mountAmount({ lang, digits })
        const whole = wholeOf(wrapper)

        await focus(whole)
        const event = press(whole, key)

        expect(document.activeElement).toBe(moves ? fractionOf(wrapper).element : whole.element)
        expect(event.defaultPrevented).toBe(moves)
    })

    it.each([
        ['metaKey', ','],
        ['metaKey', '.'],
        ['ctrlKey', ','],
        ['ctrlKey', '.'],
        ['altKey', ','],
        ['altKey', '.'],
    ])('%s с клавишей «%s» в копейки не ведёт и не отменяется', async (modifier, key) => {
        const wrapper = mountAmount()
        const whole = wholeOf(wrapper)

        await focus(whole)
        const event = press(whole, key, { [modifier]: true })

        expect(document.activeElement).toBe(whole.element)
        expect(event.defaultPrevented).toBe(false)
    })

    it.each([
        ['пустая основная часть становится нулём', '', '5', ['0', '50']],
        ['заполненная основная часть остаётся', '12', '5', ['12', '50']],
        ['полные копейки не меняются', '12', '56', ['12', '56']],
    ])('копейки при уходе дополняются нулями: %s', async (_name, whole, fraction, shown) => {
        const wrapper = mountAmount()

        await wholeOf(wrapper).setValue(whole)
        await focus(fractionOf(wrapper))
        await fractionOf(wrapper).setValue(fraction)
        const updates = wrapper.emitted('update:modelValue').length

        await blur(fractionOf(wrapper))

        expect(parts(wrapper)).toEqual(shown)
        expect(wrapper.emitted('update:modelValue')).toHaveLength(updates)
    })

    it.each([
        ['лишняя цифра', '123', '12'],
        ['цифры после букв', 'ab12', '12'],
    ])('копейки вмещают digits цифр: %s', async (_name, typed, shown) => {
        const wrapper = mountAmount()

        await fractionOf(wrapper).setValue(typed)

        expect(fractionOf(wrapper).element.value).toBe(shown)
        expect(wrapper.emitted('update:modelValue')).toEqual([[Number(shown)]])
    })

    it.each([
        [2, '2'],
        [3, '3'],
    ])('digits: %i — полные копейки не принимают новую цифру: maxlength %s', (digits, maxlength) => {
        expect(fractionOf(mountAmount({ digits })).attributes('maxlength')).toBe(maxlength)
    })

    it.each([
        ['буква в середине', '5a6', 2, '56', 1],
        ['две буквы в середине', '5ab6', 3, '56', 1],
        ['буква в начале', 'a56', 1, '56', 0],
        ['буква в конце', '56a', 3, '56', 2],
        ['цифра в середине', '576', 2, '576', 2],
    ])('курсор копеек остаётся на месте: %s', async (_name, typed, caret, shown, expected) => {
        const wrapper = mountAmount({ digits: 3 })
        const fraction = fractionOf(wrapper)

        fraction.element.value = typed
        fraction.element.setSelectionRange(caret, caret)
        await fraction.trigger('input')

        expect(fraction.element.value).toBe(shown)
        expect(selection(fraction)).toEqual([expected, expected])
    })

    it('уход из поля с пустой основной частью и копейками показывает ноль', async () => {
        const wrapper = mountAmount({ modelValue: 123456 })

        await focus(wholeOf(wrapper))
        await wholeOf(wrapper).setValue('')
        await blur(wholeOf(wrapper))

        expect(parts(wrapper)).toEqual(['0', '56'])
        expect(wrapper.emitted('update:modelValue')).toEqual([[56]])
    })

    it('уход из поля дополняет неполные копейки', async () => {
        const wrapper = mountAmount({ modelValue: 123456 })

        await focus(wholeOf(wrapper))
        await fractionOf(wrapper).setValue('5')
        await blur(wholeOf(wrapper))

        expect(parts(wrapper)).toEqual(['1 234', '50'])
    })

    it('переход на крестик внутри поля основную часть не заполняет', async () => {
        const wrapper = mountAmount({ modelValue: 123456 })

        await focus(wholeOf(wrapper))
        await wholeOf(wrapper).setValue('')
        await focus(eraserOf(wrapper))

        expect(parts(wrapper)).toEqual(['', '56'])
    })

    it('обход пустого поля: значение остаётся пустым, копейки снова скрыты, событий нет', async () => {
        const wrapper = mountAmount()

        await focus(wholeOf(wrapper))
        await focus(fractionOf(wrapper))
        await blur(fractionOf(wrapper))

        expect(parts(wrapper)).toEqual(['', ''])
        expect(fractionOf(wrapper).element.style.display).toBe('none')
        expectNoEvents(wrapper)
    })

    it('Backspace в пустых копейках переводит фокус в основную часть, символ не стирается', async () => {
        const wrapper = mountAmount()

        await wholeOf(wrapper).setValue('12')
        await focus(fractionOf(wrapper))
        const event = press(fractionOf(wrapper), 'Backspace')

        expect(document.activeElement).toBe(wholeOf(wrapper).element)
        expect(event.defaultPrevented).toBe(true)
    })

    it('Backspace в непустых копейках работает как обычно', async () => {
        const wrapper = mountAmount({ modelValue: 123456 })

        await focus(fractionOf(wrapper))
        const event = press(fractionOf(wrapper), 'Backspace')

        expect(document.activeElement).toBe(fractionOf(wrapper).element)
        expect(event.defaultPrevented).toBe(false)
    })
})

describe('AmountInput: курсор основной части', () => {
    const events = ['keydown', 'keyup', 'click', 'select']

    it.each(events)('%s возвращает курсор из середины в конец', async (name) => {
        const wrapper = mountAmount({ modelValue: 123456 })
        const whole = wholeOf(wrapper)

        selectRange(wrapper, whole, 2, 2)
        await whole.trigger(name)

        expect(selection(whole)).toEqual([5, 5])
    })

    it.each(events)('%s оставляет выделение всей основной части', async (name) => {
        const wrapper = mountAmount({ modelValue: 123456 })
        const whole = wholeOf(wrapper)

        selectRange(wrapper, whole, 0, 5)
        await whole.trigger(name)

        expect(selection(whole)).toEqual([0, 5])
    })

    it.each(events)('%s сворачивает частичное выделение в конец', async (name) => {
        const wrapper = mountAmount({ modelValue: 123456 })
        const whole = wholeOf(wrapper)

        selectRange(wrapper, whole, 1, 3)
        await whole.trigger(name)

        expect(selection(whole)).toEqual([5, 5])
    })

    it('фокус ставит курсор в конец, даже если браузер выделил всё поле', async () => {
        const wrapper = mountAmount({ modelValue: 123456 })
        const whole = wholeOf(wrapper)

        whole.element.focus()
        whole.element.select()
        await frame()

        expect(selection(whole)).toEqual([5, 5])
    })

    it('размонтирование до следующего кадра проходит без ошибок', async () => {
        const wrapper = mountAmount({ modelValue: 123456 })

        wholeOf(wrapper).element.focus()
        wrapper.unmount()
        await frame()
    })
})

describe('AmountInput: копейки и вид', () => {
    it('пустое поле показывает копейки только с фокусом внутри', async () => {
        const wrapper = mountAmount()

        expect(fractionOf(wrapper).element.style.display).toBe('none')
        expect(separatorOf(wrapper).style.display).toBe('none')

        await focus(wholeOf(wrapper))

        expect(fractionOf(wrapper).element.style.display).toBe('')
        expect(separatorOf(wrapper).style.display).toBe('')

        await blur(wholeOf(wrapper))

        expect(fractionOf(wrapper).element.style.display).toBe('none')
        expect(separatorOf(wrapper).style.display).toBe('none')
    })

    it('уход с суммой оставляет плейсхолдер', async () => {
        const wrapper = mountAmount()

        await focus(wholeOf(wrapper))
        await wholeOf(wrapper).setValue('12')
        await blur(wholeOf(wrapper))

        expect(fractionOf(wrapper).element.style.display).toBe('')
        expect(fractionOf(wrapper).element.value).toBe('')
        expect(fractionOf(wrapper).attributes('placeholder')).toBe('00')
    })

    it.each([
        ['ru', ','],
        ['en', '.'],
    ])('разделитель в %s — «%s»', (lang, separator) => {
        const wrapper = mountAmount({ lang, modelValue: 123456 })

        expect(separatorOf(wrapper).textContent).toBe(separator)
    })

    it('digits: 0 — блока копеек нет', () => {
        const wrapper = mountAmount({ digits: 0, modelValue: 123456 })

        expect(wrapper.findAll('input')).toHaveLength(1)
        expect(wrapper.text()).not.toContain(',')
    })

    it('digits: 3 — плейсхолдер из трёх нулей, ширина 3ch и запас 2px', () => {
        const wrapper = mountAmount({ digits: 3 })

        expect(fractionOf(wrapper).attributes('placeholder')).toBe('000')
        expect(fractionOf(wrapper).element.style.width).toBe('calc(3ch + 2px)')
    })

    it.each([
        ['пустому месту корня', rootOf],
        ['prefix', prefixOf],
    ])('нажатие по %s ставит фокус в основную часть', async (_name, targetOf) => {
        const wrapper = mountAmount({ prefix: 'от' })

        const event = pressMouse(targetOf(wrapper))
        await nextTick()

        expect(document.activeElement).toBe(wholeOf(wrapper).element)
        expect(event.defaultPrevented).toBe(true)
    })

    it.each([
        ['пустому месту корня', rootOf],
        ['prefix', prefixOf],
    ])('нажатие по %s при несохранённой правке — ни одного changed, настоящий уход — один', async (_name, targetOf) => {
        const { wrapper, changes } = mountBound({ prefix: 'от' })

        await focus(wholeOf(wrapper))
        await wholeOf(wrapper).setValue('1234')
        pressMouse(targetOf(wrapper))
        await nextTick()

        expect(changes).toEqual([])
        expect(document.activeElement).toBe(wholeOf(wrapper).element)

        await blur(wholeOf(wrapper))

        expect(changes).toEqual([123400])
    })

    it('нажатие по пустому месту из копеек — ни одного changed, фокус в основной части', async () => {
        const { wrapper, changes } = mountBound()

        await focus(fractionOf(wrapper))
        await fractionOf(wrapper).setValue('5')
        pressMouse(rootOf(wrapper))
        await nextTick()

        expect(document.activeElement).toBe(wholeOf(wrapper).element)
        expect(parts(wrapper)).toEqual(['0', '50'])
        expect(changes).toEqual([])
    })

    it('нажатие по пустому месту не скрывает копейки пустого поля в фокусе', async () => {
        const wrapper = mountAmount()

        await focus(wholeOf(wrapper))
        pressMouse(rootOf(wrapper))
        await nextTick()

        expect(fractionOf(wrapper).element.style.display).toBe('')
    })

    it.each([
        ['правая', 2],
        ['средняя', 1],
    ])('%s кнопка мыши фокус не трогает', async (_name, button) => {
        const wrapper = mountAmount()

        const event = pressMouse(rootOf(wrapper), button)
        await nextTick()

        expect(document.activeElement).not.toBe(wholeOf(wrapper).element)
        expect(event.defaultPrevented).toBe(false)
    })

    it('нажатие по копейкам фокус не уводит', async () => {
        const wrapper = mountAmount({ modelValue: 123456 })

        await focus(fractionOf(wrapper))
        const event = pressMouse(fractionOf(wrapper).element)

        expect(document.activeElement).toBe(fractionOf(wrapper).element)
        expect(event.defaultPrevented).toBe(false)
    })

    it('клик по крестику фокус не уводит', async () => {
        const wrapper = mountAmount({ modelValue: 123456 })

        await focus(fractionOf(wrapper))
        await pressEraser(wrapper)

        expect(document.activeElement).toBe(fractionOf(wrapper).element)
    })

    it('prefix виден и называет основную часть', () => {
        const wrapper = mountAmount({ prefix: 'от' })

        expect(wrapper.text()).toContain('от')
        expect(wholeOf(wrapper).attributes('aria-label')).toBe('от')
    })

    it('без prefix у основной части нет своего имени: её называет подпись', () => {
        const wrapper = mountAmount({ inputId: 'amount' })

        expect(wholeOf(wrapper).attributes('aria-label')).toBeUndefined()
        expect(wholeOf(wrapper).attributes('id')).toBe('amount')
    })

    it.each([
        ['ru', 'Копейки'],
        ['en', 'Fractional part'],
    ])('имя поля копеек в %s — «%s»', (lang, name) => {
        const wrapper = mountAmount({ lang })

        expect(fractionOf(wrapper).attributes('aria-label')).toBe(name)
    })
})

describe('AmountInput: значения', () => {
    it.each([
        [123456, 2, ['1 234', '56']],
        [5, 2, ['0', '05']],
        [0, 2, ['0', '00']],
        [123456, 0, ['123 456']],
        [123456, 3, ['123', '456']],
        [null, 2, ['', '']],
    ])('modelValue %s при digits %i', (modelValue, digits, shown) => {
        expect(parts(mountAmount({ modelValue, digits }))).toEqual(shown)
    })

    it.each([[-1], [1.5], [10 ** 15]])('недопустимое значение %s — пустое поле', (modelValue) => {
        expect(parts(mountAmount({ modelValue }))).toEqual(['', ''])
    })

    it.each([[-1], [1.5], [10 ** 15]])('недопустимое значение %s от родителя стирает сумму', async (modelValue) => {
        const wrapper = mountAmount({ modelValue: 123456 })

        await wrapper.setProps({ modelValue })

        expect(parts(wrapper)).toEqual(['', ''])
        expectNoEvents(wrapper)
    })

    it('эхо своего значения не заполняет копейки', async () => {
        const { wrapper, value } = mountBound()

        await wholeOf(wrapper).setValue('1234')
        await nextTick()

        expect(value.value).toBe(123400)
        expect(parts(wrapper)).toEqual(['1 234', ''])
    })

    it('другое значение родителя заменяет обе части', async () => {
        const wrapper = mountAmount()

        await wholeOf(wrapper).setValue('1234')
        await wrapper.setProps({ modelValue: 654321 })

        expect(parts(wrapper)).toEqual(['6 543', '21'])
    })

    it('смена digits сохраняет сумму и пересчитывает части, событий нет', async () => {
        const wrapper = mountAmount({ modelValue: 123456 })

        await wrapper.setProps({ digits: 0 })
        expect(parts(wrapper)).toEqual(['123 456'])

        await wrapper.setProps({ digits: 3 })
        expect(parts(wrapper)).toEqual(['123', '456'])

        await wrapper.setProps({ digits: 2 })
        expect(parts(wrapper)).toEqual(['1 234', '56'])

        expectNoEvents(wrapper)
    })

    it('пустые копейки при смене digits считаются нулями', async () => {
        const wrapper = mountAmount()

        await wholeOf(wrapper).setValue('1234')
        await wrapper.setProps({ digits: 0 })

        expect(parts(wrapper)).toEqual(['123 400'])
    })

    it('пустое поле при смене digits остаётся пустым', async () => {
        const wrapper = mountAmount()

        await wrapper.setProps({ digits: 3 })

        expect(parts(wrapper)).toEqual(['', ''])
    })

    const simultaneous = [
        ['сумма и точность', { modelValue: 123456, digits: 2 }, { modelValue: 654321, digits: 0 }, ['654 321']],
        ['точность и снятие блокировки', { modelValue: 123456, digits: 2, isDisabled: true }, { digits: 0, isDisabled: false }, ['123 456']],
        ['все три пропа', { modelValue: 123456, digits: 2, isDisabled: true }, { modelValue: 654321, digits: 3, isDisabled: false }, ['654', '321']],
    ]

    async function expectQuietExit(component) {
        await focus(wholeOf(component))
        await blur(wholeOf(component))

        expectNoEvents(component)
    }

    it.each(simultaneous)('одновременные изменения, setProps: %s', async (_name, initial, change, shown) => {
        const wrapper = mountAmount(initial)

        await wrapper.setProps(change)

        expect(parts(wrapper)).toEqual(shown)
        await expectQuietExit(wrapper)
    })

    it.each(simultaneous)('одновременные изменения, v-bind с обратным порядком ключей: %s', async (_name, initial, change, shown) => {
        const bound = ref(initial)
        const wrapper = mount({ render: () => h(AmountInput, bound.value) }, mountOptions())

        bound.value = Object.fromEntries(Object.entries({ ...initial, ...change }).reverse())
        await nextTick()

        expect(parts(wrapper)).toEqual(shown)
        await expectQuietExit(wrapper.findComponent(AmountInput))
    })
})

describe('AmountInput: changed', () => {
    it('ввод, эхо и уход — одно событие', async () => {
        const { wrapper, changes } = mountBound()

        await focus(wholeOf(wrapper))
        await wholeOf(wrapper).setValue('1234')
        await nextTick()
        await blur(wholeOf(wrapper))

        expect(changes).toEqual([123400])
    })

    it.each([
        ['основная часть', wholeOf],
        ['копейки', fractionOf],
    ])('Enter и затем уход — одно событие: %s', async (_name, inputOf) => {
        const { wrapper, changes } = mountBound()

        await focus(inputOf(wrapper))
        await inputOf(wrapper).setValue('12')
        await nextTick()
        const event = press(inputOf(wrapper), 'Enter')
        await nextTick()

        expect(changes).toHaveLength(1)
        expect(event.defaultPrevented).toBe(false)

        await blur(inputOf(wrapper))

        expect(changes).toHaveLength(1)
    })

    it('внешняя установка и затем уход — ни одного', async () => {
        const { wrapper, value, changes } = mountBound({}, 123456)

        await focus(wholeOf(wrapper))
        value.value = 654321
        await nextTick()
        await blur(wholeOf(wrapper))

        expect(parts(wrapper)).toEqual(['6 543', '21'])
        expect(changes).toEqual([])
    })

    it('переход между основной частью, копейками и крестиком — ни одного', async () => {
        const { wrapper, changes } = mountBound()

        await focus(wholeOf(wrapper))
        await wholeOf(wrapper).setValue('1234')
        await focus(fractionOf(wrapper))
        await focus(eraserOf(wrapper))
        await focus(wholeOf(wrapper))

        expect(changes).toEqual([])
    })

    it('уход без правок — ни одного', async () => {
        const { wrapper, changes } = mountBound({}, 123456)

        await focus(wholeOf(wrapper))
        await focus(fractionOf(wrapper))
        await blur(fractionOf(wrapper))

        expect(changes).toEqual([])
    })

    it.each([
        ['основная часть', wholeOf],
        ['копейки', fractionOf],
    ])('размонтирование при фокусе и несохранённой правке — ни одного: %s', async (_name, inputOf) => {
        const onChanged = vi.fn()
        const wrapper = mountAmount({ onChanged })
        const input = inputOf(wrapper).element

        await focus(inputOf(wrapper))
        await inputOf(wrapper).setValue('12')

        // Chrome шлёт blur и focusout, когда удаляет поле в фокусе: уже после
        // beforeUnmount. wrapper.unmount() отцепляет приложение от документа
        // раньше, и input.blur() тут ничего бы не сделал, поэтому события
        // отправлены напрямую.
        const parent = wrapper.element.parentElement
        const removeChild = parent.removeChild.bind(parent)
        parent.removeChild = (child) => {
            input.dispatchEvent(new FocusEvent('blur'))
            input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))

            return removeChild(child)
        }
        const shown = [wrapper.vm.whole, wrapper.vm.fraction]
        wrapper.unmount()

        expect(onChanged).not.toHaveBeenCalled()
        expect([wrapper.vm.whole, wrapper.vm.fraction]).toEqual(shown)
    })
})

describe('AmountInput: вставка', () => {
    it('заменяет всю сумму', async () => {
        const wrapper = mountAmount({ modelValue: 999 })

        const event = paste(wholeOf(wrapper), '1 234,56')
        await nextTick()

        expect(parts(wrapper)).toEqual(['1 234', '56'])
        expect(wrapper.emitted('update:modelValue')).toEqual([[123456]])
        expect(event.defaultPrevented).toBe(true)
    })

    it('неполные копейки дополняются нулями сразу, уход ничего не меняет', async () => {
        const wrapper = mountAmount()

        await focus(wholeOf(wrapper))
        paste(wholeOf(wrapper), '12,5')
        await nextTick()

        expect(parts(wrapper)).toEqual(['12', '50'])
        expect(wrapper.emitted('update:modelValue')).toEqual([[1250]])

        await blur(wholeOf(wrapper))

        expect(parts(wrapper)).toEqual(['12', '50'])
        expect(wrapper.emitted('update:modelValue')).toEqual([[1250]])
    })

    it('вставка без дробной части оставляет копейки пустыми', async () => {
        const wrapper = mountAmount()

        paste(wholeOf(wrapper), '12')
        await nextTick()

        expect(parts(wrapper)).toEqual(['12', ''])
        expect(wrapper.emitted('update:modelValue')).toEqual([[1200]])
    })

    it('разбирает текст по языку поля', async () => {
        const wrapper = mountAmount({ lang: 'en' })

        paste(wholeOf(wrapper), '1,234')
        await nextTick()

        expect(parts(wrapper)).toEqual(['1,234', ''])
        expect(wrapper.emitted('update:modelValue')).toEqual([[123400]])
    })

    it('отклонённая вставка не меняет поле и не шлёт событий', async () => {
        const wrapper = mountAmount({ modelValue: 123456 })

        const event = paste(wholeOf(wrapper), '-100.00')
        await nextTick()

        expect(parts(wrapper)).toEqual(['1 234', '56'])
        expectNoEvents(wrapper)
        expect(event.defaultPrevented).toBe(true)
    })
})

describe('AmountInput: крестик', () => {
    it('скрыт при пустом поле, виден при сумме', async () => {
        const wrapper = mountAmount()

        expect(eraserOf(wrapper).classes()).toContain('bb:invisible')

        await wholeOf(wrapper).setValue('1')

        expect(eraserOf(wrapper).classes()).not.toContain('bb:invisible')
    })

    it('клик шлёт null и changed, обе части пусты, при уходе повторного changed нет', async () => {
        const { wrapper, value, changes } = mountBound({}, 123456)

        await focus(wholeOf(wrapper))
        await pressEraser(wrapper)

        expect(value.value).toBeNull()
        expect(parts(wrapper)).toEqual(['', ''])
        expect(changes).toEqual([null])

        await blur(wholeOf(wrapper))

        expect(changes).toEqual([null])
    })

    it('ввод без прошлого changed и крестик — одно changed, при уходе повторного нет', async () => {
        const { wrapper, value, changes } = mountBound()

        await focus(wholeOf(wrapper))
        await wholeOf(wrapper).setValue('12')
        await pressEraser(wrapper)

        expect(value.value).toBeNull()
        expect(changes).toEqual([null])

        await blur(wholeOf(wrapper))

        expect(changes).toEqual([null])
    })

    it('блокировка за время анимации крестика — ни очистки, ни событий', async () => {
        const wrapper = mountAmount({ modelValue: 123456 })
        const eraser = eraserOf(wrapper)

        await eraser.trigger('click')
        const animations = eraser.element.getAnimations()
        await wrapper.setProps({ isDisabled: true })
        await Promise.all(animations.map((animation) => animation.finished))
        await flushPromises()

        expectNoEvents(wrapper)

        await wrapper.setProps({ isDisabled: false })

        expect(parts(wrapper)).toEqual(['1 234', '56'])
        expectNoEvents(wrapper)
    })

    it('в видимом фокусе клавиатуры фокус до очистки переходит в основную часть', async () => {
        const onUpdate = vi.fn()
        const wrapper = mountAmount({ modelValue: 123456, 'onUpdate:modelValue': onUpdate })
        const focusSpy = vi.spyOn(wholeOf(wrapper).element, 'focus')

        eraserOf(wrapper).element.focus()
        await pressEraser(wrapper)

        expect(document.activeElement).toBe(wholeOf(wrapper).element)
        expect(focusSpy).toHaveBeenCalledTimes(1)
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
        expect(focusSpy.mock.invocationCallOrder[0]).toBeLessThan(onUpdate.mock.invocationCallOrder[0])
    })

    it('без :focus-visible фокус не переводится', async () => {
        const wrapper = mountAmount({ modelValue: 123456 })
        const eraser = eraserOf(wrapper).element
        const focusSpy = vi.spyOn(wholeOf(wrapper).element, 'focus')
        const matches = eraser.matches.bind(eraser)
        vi.spyOn(eraser, 'matches').mockImplementation((selector) => (selector === ':focus-visible' ? false : matches(selector)))

        eraser.focus()
        await pressEraser(wrapper)

        expect(focusSpy).not.toHaveBeenCalled()
    })

    it('mousedown на крестике отменён', () => {
        const wrapper = mountAmount({ modelValue: 123456 })
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })

        eraserOf(wrapper).element.dispatchEvent(event)

        expect(event.defaultPrevented).toBe(true)
    })

    it('подпись крестика — на языке поля', () => {
        const wrapper = mountAmount({ lang: 'en', modelValue: 123456 })

        expect(eraserOf(wrapper).text()).toBe('Clear')
    })

    it('с крестиком у корня нет своего отступа справа', () => {
        expect(mountAmount().classes()).not.toContain('bb:pr-3')
    })

    it('withEraser: false — крестика нет, у корня отступ справа', () => {
        const wrapper = mountAmount({ withEraser: false, modelValue: 123456 })

        expect(eraserOf(wrapper).exists()).toBe(false)
        expect(wrapper.classes()).toContain('bb:pr-3')
    })
})

describe('AmountInput: блокировка', () => {
    it('оба поля отключены, поле пустое при сумме, крестик скрыт, событий нет', async () => {
        const wrapper = mountAmount({ modelValue: 123456, isDisabled: true })

        await nextTick()

        expect(wholeOf(wrapper).attributes('disabled')).toBeDefined()
        expect(fractionOf(wrapper).attributes('disabled')).toBeDefined()
        expect(parts(wrapper)).toEqual(['', ''])
        expect(eraserOf(wrapper).classes()).toContain('bb:invisible')
        expectNoEvents(wrapper)
    })

    it('включение блокировки очищает поле без событий', async () => {
        const wrapper = mountAmount({ modelValue: 123456 })

        await wrapper.setProps({ isDisabled: true })

        expect(parts(wrapper)).toEqual(['', ''])
        expect(fractionOf(wrapper).element.style.display).toBe('none')
        expectNoEvents(wrapper)
    })

    it('блокировка поля в фокусе скрывает копейки', async () => {
        const wrapper = mountAmount({ modelValue: 123456 })

        await focus(wholeOf(wrapper))
        await wrapper.setProps({ isDisabled: true })

        expect(fractionOf(wrapper).element.style.display).toBe('none')
    })

    // Отключённое поле пусто, поэтому запрет проверяется на заданном напрямую состоянии.
    it('заблокированное поле части не дополняет', async () => {
        const wrapper = mountAmount({ isDisabled: true })

        wrapper.vm.fraction = '5'
        fractionOf(wrapper).element.dispatchEvent(new FocusEvent('blur'))

        expect([wrapper.vm.whole, wrapper.vm.fraction]).toEqual(['', '5'])
    })

    it('уход фокуса при включении блокировки не даёт changed', async () => {
        const wrapper = mountAmount({ modelValue: 123456 })

        await focus(wholeOf(wrapper))
        await wrapper.setProps({ isDisabled: true })
        // Отключённое поле happy-dom не даёт снять фокус через blur().
        wholeOf(wrapper).element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
        await nextTick()

        expectNoEvents(wrapper)
    })

    it.each([
        [2, 2, ['1 234', '56']],
        [2, 0, ['123 456']],
        [2, 3, ['123', '456']],
    ])('снятие блокировки строит части из modelValue: digits %i → %i', async (from, to, shown) => {
        const wrapper = mountAmount({ modelValue: 123456, digits: from, isDisabled: true })

        await wrapper.setProps({ digits: to, isDisabled: false })

        expect(parts(wrapper)).toEqual(shown)
        expectNoEvents(wrapper)

        await focus(wholeOf(wrapper))
        await blur(wholeOf(wrapper))

        expectNoEvents(wrapper)
    })
})

describe('AmountInput: тексты', () => {
    it.each([
        ['amountFrom', 'от', 'from'],
        ['amountTo', 'до', 'to'],
        ['amountFraction', 'Копейки', 'Fractional part'],
        ['currency', 'Валюта', 'Currency'],
    ])('%s: «%s» и «%s»', (key, ru, en) => {
        expect(messages.ru[key]).toBe(ru)
        expect(messages.en[key]).toBe(en)
    })
})

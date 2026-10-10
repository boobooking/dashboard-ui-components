<template>
    <div>
        <!-- Корень без bb-dashboard-ui, как у PageCard: ресет пакета накрыл бы
             разметку приложения в ячейках. Поэтому таблица сама задаёт то, что
             обычно ставят браузер и preflight: border-collapse, начертание
             и выравнивание заголовков. Комментарий стоит внутри корня:
             перед ним он сделал бы шаблон фрагментом в сборке разработки,
             и class страницы не лёг бы на корень. -->

        <!-- Бейдж с числом найденного и действия рядом с ним — ссылки
             «скачать xlsx», — только когда записи есть. -->
        <div
            v-if="hasBadgeRow()"
            class="bb:flex bb:justify-center bb:items-center bb:space-x-2"
            :class="isCard ? '' : 'bb:my-4'"
        >
            <info-pill v-if="badgeText !== null" :text="badgeText" color="indigo"/>
            <slot v-if="hasRecords" name="results-actions"></slot>
        </div>

        <!-- Обёртка с прокруткой лежит в простом блоке: элемент flex-колонки
             с overflow-x-auto Safari считает без горизонтальной полосы
             прокрутки, полоса съедает низ таблицы, и рядом появляется
             вертикальная. Корень компонента часто стоит в flex-колонке. -->
        <div v-if="normalizedRows.length > 0" :class="isCard && hasBadgeRow() ? 'bb:mt-4' : ''">
            <div
                class="bb:overflow-x-auto"
                :class="isCard ? 'bb:border-t bb:border-gray-200' : 'bb:shadow-sm bb:border-b bb:border-gray-200 bb:sm:rounded-lg'"
            >
                <table class="bb:min-w-full bb:divide-y bb:divide-gray-200 bb:border-collapse">
                    <thead>
                        <tr class="bb:bg-gray-50">
                            <th
                                v-for="column in visibleColumns"
                                :key="column.key"
                                scope="col"
                                class="bb:px-6 bb:py-3 bb:text-xs bb:leading-4 bb:font-medium bb:text-gray-500 bb:uppercase bb:tracking-wider bb:whitespace-nowrap"
                                :class="[
                                    {
                                        'bb:text-left': column.align === 'left',
                                        'bb:text-center': column.align === 'center',
                                        'bb:text-right': column.align === 'right',
                                    },
                                    { 'bb:w-px': column.narrow },
                                ]"
                                v-text="column.label"
                            ></th>
                        </tr>
                    </thead>
                    <tbody class="bb:divide-y bb:divide-gray-200">
                        <tr
                            v-for="(row, index) in normalizedRows"
                            :key="keyOf(row, index)"
                            class="bb:bg-white bb:even:bg-gray-50"
                        >
                            <!-- relative: абсолютные элементы слота встают
                                 внутри ячейки, а скрытые подписи sr-only
                                 не выходят из обёртки с прокруткой. -->
                            <td
                                v-for="(column, columnIndex) in visibleColumns"
                                :key="column.key"
                                class="bb:px-6 bb:py-4 bb:align-top bb:relative bb:text-sm bb:leading-5"
                                :class="[
                                    { 'bb:whitespace-nowrap': !column.wrap },
                                    {
                                        'bb:text-left': column.align === 'left',
                                        'bb:text-center': column.align === 'center',
                                        'bb:text-right': column.align === 'right',
                                    },
                                    { 'bb:w-px': column.narrow },
                                ]"
                            >
                                <!-- Полоска строки — в первой видимой ячейке: ячейка
                                     relative, и полоска встаёт по её левому краю на
                                     всю высоту строки. Набор mark общего списка
                                     задаёт цвет текста, полоска берёт его через
                                     bg-current. -->
                                <span
                                    v-if="columnIndex === 0 && rowStripes[index] !== null"
                                    class="bb:absolute bb:left-0 bb:inset-y-0 bb:w-1 bb:bg-current"
                                    :class="colorClass(rowStripes[index], 'mark')"
                                    aria-hidden="true"
                                ></span>
                                <slot :name="`cell-${column.key}`" :row="row" :index="index">
                                    <div
                                        class="bb:font-medium"
                                        :class="column.muted ? 'bb:text-gray-400' : 'bb:text-gray-900'"
                                        v-text="textOf(column.value, row)"
                                    ></div>
                                    <div
                                        v-if="column.secondary !== null && textOf(column.secondary, row) !== ''"
                                        class="bb:text-gray-400"
                                        v-text="textOf(column.secondary, row)"
                                    ></div>
                                </slot>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <pagination
            v-if="hasMeta"
            :meta="meta"
            :links="links ?? {}"
            :lang="lang"
            :class="isCard ? 'bb:mt-4' : 'bb:mt-6'"
        />
    </div>
</template>

<script>
import Pagination from "./Pagination.vue";
import InfoPill from "./InfoPill.vue";
import { withLang } from "../lang.js";
import { isColor, withColors } from "../colors.js";

const ALIGNS = ["left", "center", "right"];

// Описание столбца со страницы — к полному виду. Элемент без строкового key
// пропускается: ему не дать ни слот, ни значение по умолчанию.
function normalizeColumn(column) {
    if (column === null || typeof column !== "object" || typeof column.key !== "string" || column.key === "") {
        return null;
    }

    const key = column.key;

    return {
        key,
        label: typeof column.label === "string" ? column.label : "",
        value: typeof column.value === "function" ? column.value : (row) => row?.[key],
        secondary: typeof column.secondary === "function" ? column.secondary : null,
        muted: column.muted === true,
        align: ALIGNS.includes(column.align) ? column.align : "left",
        wrap: column.wrap === true,
        narrow: column.narrow === true,
        visible: column.visible !== false,
    };
}

function nonEmptyText(value) {
    return typeof value === "string" && value !== "" ? value : null;
}

export default {
    components: {
        Pagination,
        InfoPill,
    },

    mixins: [withLang, withColors],

    props: {
        // Строки списка: обычные объекты или модели страницы.
        rows: {
            type: Array,
            required: true,
        },
        // Столбцы: { key, label, value, secondary, muted, align, wrap, narrow, visible }.
        columns: {
            type: Array,
            required: true,
        },
        // Имя поля ключа строки или функция row => ключ.
        rowKey: {
            type: [String, Function],
            required: true,
        },
        // meta и links — как их отдаёт Laravel API Resource:
        // meta: { from, to, total }, links: { prev, next }.
        meta: {
            type: Object,
            default: null,
        },
        links: {
            type: Object,
            default: null,
        },
        // «Найдено ордеров» — бейдж «Найдено ордеров: 100».
        foundText: {
            type: String,
            default: null,
        },
        // «Не найдено ордеров» — бейдж пустого списка.
        emptyText: {
            type: String,
            default: null,
        },
        // page — отдельный список на странице, card — таблица внутри
        // карточки страницы.
        variant: {
            type: String,
            default: "page",
            validator: (value) => ["page", "card"].indexOf(value) !== -1,
        },
        // row => имя цвета из общего списка или null: полоска слева в первой
        // ячейке строки. Строки полосатые всегда.
        rowStripe: {
            type: Function,
            default: null,
        },
    },

    computed: {
        normalizedRows() {
            return Array.isArray(this.rows) ? this.rows : [];
        },

        visibleColumns() {
            const columns = Array.isArray(this.columns) ? this.columns : [];

            return columns.map(normalizeColumn).filter((column) => column !== null && column.visible);
        },

        // Цвет полоски каждой строки по её номеру: rowStripe вызывается
        // один раз на строку за рендер.
        rowStripes() {
            return this.normalizedRows.map((row) => this.stripeOf(row));
        },

        isCard() {
            return this.variant === "card";
        },

        hasMeta() {
            return this.meta !== null && typeof this.meta === "object";
        },

        // Сколько записей всего: по meta.total, если он есть, иначе по строкам.
        recordCount() {
            return this.hasMeta && typeof this.meta.total === "number" ? this.meta.total : this.normalizedRows.length;
        },

        hasRecords() {
            return this.recordCount > 0;
        },

        badgeText() {
            if (this.hasRecords) {
                const found = nonEmptyText(this.foundText);

                return found === null ? null : `${found}: ${this.recordCount}`;
            }

            return nonEmptyText(this.emptyText);
        },
    },

    methods: {
        // Методом, а не вычисляемым свойством: $slots не реактивен, и кэш
        // не заметил бы слот, появившийся у страницы позже.
        hasBadgeRow() {
            return this.badgeText !== null || (this.hasRecords && this.$slots["results-actions"] !== undefined);
        },

        // Ключ строки; без ключа — по номеру строки, без исключения.
        keyOf(row, index) {
            let key;

            if (typeof this.rowKey === "function") {
                try {
                    key = this.rowKey(row);
                } catch {
                    key = undefined;
                }
            } else if (typeof this.rowKey === "string") {
                key = row?.[this.rowKey];
            }

            return key === null || key === undefined ? `row-${index}` : key;
        },

        // Не функция, null и имя вне списка — без полоски.
        stripeOf(row) {
            if (typeof this.rowStripe !== "function") {
                return null;
            }

            const color = this.rowStripe(row);

            return isColor(color) ? color : null;
        },

        // null и undefined — пустая ячейка.
        textOf(getter, row) {
            const value = getter(row);

            return value === null || value === undefined ? "" : String(value);
        },
    },
};
</script>

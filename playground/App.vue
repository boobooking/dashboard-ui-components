<template>
    <div class="page">
        <h1>dashboard-ui-components</h1>

        <section>
            <h2>Dot</h2>
            <dot color="red"/>
            <dot color="green"/>
            <dot color="red" :with-pulse="true"/>
        </section>

        <section>
            <h2>RussianMobileFilter</h2>
            <russian-mobile-filter v-model="phone" header="Телефон" @changed="phoneCommits++"/>
            <p>Значение: {{ phone === '' ? '(пусто)' : phone }}, запросов: {{ phoneCommits }}</p>
        </section>

        <section>
            <h2>Search</h2>
            <search v-model="search" header="Поиск"/>
            <p>Значение: {{ search === '' ? '(пусто)' : search }}</p>
        </section>

        <section>
            <h2>SelectDateInterval</h2>
            <select-date-interval
                header="Интервал"
                v-model:date-from="dateFrom"
                v-model:date-to="dateTo"
            />
            <p>С {{ dateFrom || '(пусто)' }} по {{ dateTo || '(пусто)' }}</p>
        </section>

        <section>
            <h2>SelectSingle</h2>
            <select-single
                header="Вендор"
                :items="vendorItems"
                v-model="vendor"
                @changed="vendorCommits++"
            />
            <p>Выбрано: {{ vendor === null ? '(ничего)' : vendor }}, запросов: {{ vendorCommits }}</p>
        </section>

        <section>
            <h2>SmallBadge</h2>
            <div class="demo-row">
                <small-badge text="Зелёный" color="green"/>
                <small-badge text="Индиго" color="indigo"/>
                <small-badge text="Серый" color="gray"/>
                <small-badge text="Синий" color="blue"/>
                <small-badge text="Красный" color="red"/>
                <small-badge text="Жёлтый с длинным текстом" color="yellow"/>
            </div>
        </section>

        <section>
            <h2>ErrorMessages</h2>
            <error-messages :messages="errorObject"/>
            <error-messages class="demo-gap" :messages="errorArray" type="dangerous"/>
        </section>

        <section>
            <h2>DownloadLink</h2>
            <download-link url="#download" title="скачать xlsx"/>
        </section>

        <section>
            <h2>ConfirmationModal</h2>
            <div class="demo-row">
                <button type="button" class="demo-button" @click="warningModalIsOpen = true">Жёлтая</button>
                <button type="button" class="demo-button" @click="dangerousModalIsOpen = true">Красная</button>
            </div>
            <p>Подтверждений: {{ modalConfirms }}, отмен: {{ modalCancels }}</p>
            <confirmation-modal
                :is-open="warningModalIsOpen"
                confirmation-heading="Начать отправку?"
                confirmation-text="Сообщения уйдут всем получателям группы."
                action-button-text="Начать отправку"
                @action-confirmed="modalConfirms++; warningModalIsOpen = false"
                @action-canceled="modalCancels++; warningModalIsOpen = false"
            />
            <confirmation-modal
                :is-open="dangerousModalIsOpen"
                type="dangerous"
                confirmation-heading="Удаление администратора"
                confirmation-text="Вы уверены, что хотите удалить администратора? Это действие необратимо."
                action-button-text="Удалить"
                @action-confirmed="modalConfirms++; dangerousModalIsOpen = false"
                @action-canceled="modalCancels++; dangerousModalIsOpen = false"
            />
        </section>

        <section>
            <h2>DropdownButtonWithAction</h2>
            <div class="demo-row">
                <dropdown-button-with-action :actions="menuActions">
                    <template #button><span class="demo-action">Без привязки</span></template>
                </dropdown-button-with-action>
                <dropdown-button-with-action v-model="dropdownIsOpen" :actions="[{ label: 'Действие', onSelect: countSelection }]">
                    <template #button><span class="demo-action">С v-model</span></template>
                </dropdown-button-with-action>
                <dropdown-button-with-action>
                    <template #button><span class="demo-action">Без действий</span></template>
                </dropdown-button-with-action>
            </div>
            <p>
                Меню с v-model: {{ dropdownIsOpen ? 'открыто' : 'закрыто' }}
                <button type="button" class="demo-button" @click="dropdownIsOpen = !dropdownIsOpen">Переключить снаружи</button>
            </p>
            <p>Выбрано действий: {{ menuSelections }}</p>
        </section>

        <section>
            <h2>HamburgerMenu</h2>
            <!-- Полоса как шапка проектов: кнопка ☰ у правого края, меню
                 профиля открывается под ней влево. -->
            <div class="demo-header">
                <span>Шапка</span>
                <hamburger-menu :actions="profileActions"/>
            </div>
            <p>Выбрано действий: {{ menuSelections }}</p>
        </section>

        <section>
            <h2>DataTable</h2>

            <h3>page: пагинация, бейдж, ссылка рядом с бейджем, меню действий</h3>
            <data-table
                :rows="tableRows"
                :columns="tableColumns"
                row-key="uuid"
                :meta="{ from: 16, to: 30, total: 40 }"
                :links="{ prev: '/list?page=1', next: '/list?page=3' }"
                found-text="Найдено ордеров"
                empty-text="Не найдено ордеров"
            >
                <template #results-actions>
                    <download-link url="/export.xlsx" title="скачать xlsx"/>
                </template>
                <template #cell-status="{ row }">
                    <small-badge :text="row.status" :color="row.statusColor"/>
                </template>
                <template #cell-actions>
                    <dropdown-button-with-action :actions="menuActions">
                        <template #button><span class="demo-action">Редактировать</span></template>
                    </dropdown-button-with-action>
                </template>
            </data-table>
            <p>Последний переход: {{ lastNavigation || '—' }}</p>

            <h3>card: внутри белой карточки с flex-колонкой</h3>
            <div class="demo-card">
                <div class="demo-card-column">
                    <data-table
                        variant="card"
                        :rows="tableRows"
                        :columns="tableColumns"
                        row-key="uuid"
                        found-text="Найдено ордеров"
                    >
                        <template #cell-status="{ row }">
                            <small-badge :text="row.status" :color="row.statusColor"/>
                        </template>
                        <template #cell-actions>
                            <dropdown-button-with-action :actions="[{ label: 'Удалить', danger: true, onSelect: countSelection }]">
                                <template #button><span class="demo-action">Редактировать</span></template>
                            </dropdown-button-with-action>
                        </template>
                    </data-table>
                </div>
            </div>

            <h3>Скрытый столбец, цвет строки, без пагинации</h3>
            <data-table
                :rows="tableRows"
                :columns="tableColumnsWithoutCost"
                row-key="uuid"
                :row-color="(row) => row.rowColor"
                found-text="Найдено анкет"
            />

            <h3>Пустой список</h3>
            <data-table
                :rows="[]"
                :columns="tableColumns"
                row-key="uuid"
                :meta="{ from: null, to: null, total: 0 }"
                :links="{ prev: null, next: null }"
                found-text="Найдено ордеров"
                empty-text="Не найдено ордеров"
            />
        </section>

        <section>
            <h2>NavigationMenuElement</h2>
            <div class="demo-row">
                <navigation-menu-element name="Активный" url="/section/active" :is-active="true"/>
                <navigation-menu-element name="Обычный" url="/section/other"/>
            </div>
        </section>

        <section>
            <h2>lang="en"</h2>
            <select-date-interval header="Period" lang="en" v-model:date-from="dateFrom" v-model:date-to="dateTo"/>
            <download-link url="/export.xlsx" lang="en"/>
            <dropdown-button-with-action lang="en" :actions="[{ label: 'Another action', onSelect: countSelection }]">
                <template #button><span class="demo-action">Action</span></template>
            </dropdown-button-with-action>
            <hamburger-menu lang="en" :actions="[{ label: 'Log out', onSelect: countSelection }]"/>
            <button type="button" class="demo-button" @click="englishModalIsOpen = true">Open modal</button>
            <confirmation-modal
                :is-open="englishModalIsOpen"
                lang="en"
                confirmation-heading="Delete?"
                confirmation-text="This cannot be undone."
                action-button-text="Delete"
                @action-confirmed="englishModalIsOpen = false"
                @action-canceled="englishModalIsOpen = false"
            />
            <data-table lang="en" :rows="tableRows.slice(0, 2)" :columns="tableColumnsWithoutCost" row-key="uuid" :links="{ prev: '/list?page=1', next: '/list?page=3' }" :meta="{ from: 16, to: 30, total: 40 }"/>
        </section>

        <section id="page-card">
            <h2>PageCard</h2>
            <!-- Адреса возврата в playground нет: currentUrl не подключён.
                 Крестик ведёт на fallback-url, переход виден в строке
                 «Последний переход». -->
            <page-card class="page-card-demo" fallback-url="#page-card">
                <h3 class="page-card-demo-heading">Длинный заголовок карточки: на узком экране он переносится и не заходит под крестик</h3>
                <input class="page-card-demo-input" type="text" value="Поле формы">
            </page-card>
        </section>

        <section>
            <h2>NotificationMessage</h2>
            <div class="demo-row">
                <button type="button" class="demo-button" @click="showNotice('confirmation')">Подтверждение</button>
                <button type="button" class="demo-button" @click="showNotice('warning')">Предупреждение</button>
                <button type="button" class="demo-button" @click="showNotice('dangerous')">Ошибка</button>
            </div>
            <!-- У каждого типа свой экземпляр: роль живой области задаётся типом. -->
            <notification-message v-model="confirmationNotice" type="confirmation" notification-heading="Письмо отправлено"/>
            <notification-message v-model="warningNotice" type="warning" notification-heading="Проверьте данные"/>
            <notification-message v-model="dangerousNotice" type="dangerous" notification-heading="Ошибка отправки"/>
        </section>
    </div>
</template>

<script>
import {
    Dot,
    RussianMobileFilter,
    Search,
    SelectDateInterval,
    SelectSingle,
    SmallBadge,
    ErrorMessages,
    DownloadLink,
    ConfirmationModal,
    DropdownButtonWithAction,
    HamburgerMenu,
    DataTable,
    NavigationMenuElement,
    PageCard,
    NotificationMessage,
} from '../dist/index.js';
import { lastNavigation } from './navigation-log.js';

export default {
    components: {
        Dot,
        RussianMobileFilter,
        Search,
        SelectDateInterval,
        SelectSingle,
        SmallBadge,
        ErrorMessages,
        DownloadLink,
        ConfirmationModal,
        DropdownButtonWithAction,
        HamburgerMenu,
        DataTable,
        NavigationMenuElement,
        PageCard,
        NotificationMessage,
    },

    setup() {
        return {
            lastNavigation,
        };
    },

    data() {
        return {
            englishModalIsOpen: false,
            confirmationNotice: '',
            warningNotice: '',
            dangerousNotice: '',
            phone: '',
            phoneCommits: 0,
            search: '',
            dateFrom: '',
            dateTo: '',
            vendorItems: [
                { id: 'a', name: 'Первый вендор' },
                { id: 'b', name: 'Второй вендор' },
                { id: 'c', name: 'Третий вендор с длинным именем' },
            ],
            vendor: null,
            vendorCommits: 0,
            errorObject: {
                email: 'Неверный email',
                password: 'Пароль слишком короткий',
            },
            errorArray: [
                'Слишком длинные ключи: xxxxxxxx…',
                'Ключи уже загружены в другие сертификаты: abc-123',
            ],
            warningModalIsOpen: false,
            dangerousModalIsOpen: false,
            modalConfirms: 0,
            modalCancels: 0,
            dropdownIsOpen: false,
            menuSelections: 0,
            // Десять строк: таблица выше окна, у нижних строк меню
            // открывается вверх. Ширину таблицы задают столбцы без переноса:
            // при узком окне она шире карточки — проверяется горизонтальная
            // прокрутка.
            tableRows: Array.from({ length: 10 }, (_, index) => ({
                uuid: `row-${index}`,
                phone: `+7999000${String(index).padStart(4, '0')}`,
                vendor: index % 2 === 0 ? 'Сбер' : 'Озон',
                certificate: index % 2 === 0 ? 'СберКарта' : 'Подарочная карта',
                amount: `${(index + 1) * 500} ₽`,
                cost: `${(index + 1) * 2},50 ₽`,
                status: index % 3 === 0 ? 'Доставлено' : 'В очереди',
                statusColor: index % 3 === 0 ? 'green' : 'gray',
                comment: 'Провайдер принял сообщение, итог доставки пока не получен — длинное пояснение переносится',
                createdAt: '06.10.2026',
                rowColor: index === 1 ? 'red' : index === 2 ? 'green' : null,
            })),
        };
    },

    computed: {
        // Как меню страницы администраторов: переход и опасное действие.
        // Длинный пункт показывает перенос строки в меню шириной w-56.
        // Переход — по hash: в голом окружении без navigate страница
        // не уходит.
        menuActions() {
            return [
                { label: 'Поменять пароль', href: '#password' },
                { label: 'Отправить письмо с новым паролем на старый и новый адрес', onSelect: this.countSelection },
                { label: 'Удалить', danger: true, onSelect: this.countSelection },
            ];
        },

        // Как меню профиля в шапке проектов: два перехода и выход действием.
        // Переходы — по hash, как у menuActions.
        profileActions() {
            return [
                { label: 'Администраторы', href: '#users' },
                { label: 'Поменять пароль', href: '#password' },
                { label: 'Выйти', onSelect: this.countSelection },
            ];
        },

        tableColumns() {
            return [
                { key: 'phone', label: 'Телефон' },
                { key: 'vendor', label: 'Вендор / Сертификат', secondary: (row) => row.certificate },
                { key: 'amount', label: 'Номинал', align: 'right', muted: true },
                { key: 'cost', label: 'Стоимость', align: 'right' },
                { key: 'status', label: 'Статус' },
                { key: 'comment', label: 'Состояние', wrap: true },
                { key: 'createdAt', label: 'Создан', muted: true },
                { key: 'actions', align: 'right', narrow: true },
            ];
        },

        tableColumnsWithoutCost() {
            return this.tableColumns
                .filter((column) => column.key !== 'actions')
                .map((column) => (column.key === 'cost' ? { ...column, visible: false } : column));
        },
    },

    methods: {
        // На экране одно уведомление: у всех трёх одно место в углу.
        showNotice(type) {
            this.confirmationNotice = type === 'confirmation' ? 'Письмо отправлено на адрес user@example.com' : '';
            this.warningNotice = type === 'warning' ? 'Заполните все обязательные поля.' : '';
            this.dangerousNotice = type === 'dangerous' ? 'Не удалось отправить письмо на адрес user@example.com' : '';
        },

        countSelection() {
            this.menuSelections++;
        },
    },
};
</script>

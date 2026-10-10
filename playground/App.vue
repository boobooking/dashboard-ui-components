<template>
    <div class="page">
        <h1>dashboard-ui-components</h1>

        <section>
            <h2>Dot</h2>
            <dot color="red"/>
            <dot color="green"/>
            <dot color="red" :with-pulse="true"/>
            <dot v-for="color in colors" :key="color" :color="color"/>
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

            <h3>У правого края: календарь прижимается правым краем к полю</h3>
            <div class="demo-end">
                <select-date-interval
                    header="Интервал у края"
                    v-model:date-from="edgeDateFrom"
                    v-model:date-to="edgeDateTo"
                />
            </div>
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

            <h3>Длинный список: прокрутка внутри, у нижнего края окна — вверх</h3>
            <select-single header="Сертификат" :items="longItems" v-model="longItem"/>
        </section>

        <section>
            <h2>Цвета</h2>
            <table class="demo-colors">
                <tr>
                    <th>имя</th><th>InfoPill</th><th>ActionPill</th><th>кнопка, стрелка и пункт меню</th><th>Dot</th>
                </tr>
                <tr>
                    <td>без цвета</td><td>—</td><td>—</td>
                    <td><dropdown-button-with-action :actions="[{ label: 'Посмотреть', href: '#view' }, { label: 'Пункт', onSelect: countSelection }]"/></td>
                    <td>—</td>
                </tr>
                <tr v-for="color in colors" :key="color">
                    <td>{{ color }}</td>
                    <td><info-pill :text="color === 'indigo' ? 'Найдено: 40' : 'статус'" :color="color"/></td>
                    <td><action-pill icon="download" title="скачать xlsx" :color="color" :is-loading="pillsLoading" loading-text="формируется отчёт"/></td>
                    <td><dropdown-button-with-action :actions="[{ label: 'Действие', color, onSelect: countSelection }, { label: 'Пункт', color, onSelect: countSelection }]"/></td>
                    <td><dot :color="color"/></td>
                </tr>
            </table>
            <p><button type="button" class="demo-button" @click="pillsLoading = !pillsLoading">isLoading у пилюль таблицы: {{ pillsLoading ? 'да' : 'нет' }}</button></p>
        </section>

        <section>
            <h2>ErrorMessages</h2>
            <error-messages :messages="errorObject"/>
            <error-messages class="demo-gap" :messages="errorArray" type="dangerous"/>
        </section>

        <section>
            <h2>ActionPill и downloadFile</h2>
            <div class="demo-row">
                <action-pill icon="download" title="скачать report.csv" loading-text="формируется отчёт" :is-loading="downloadLoading" @click="downloadSample('report.csv')"/>
                <action-pill icon="download" title="скачать отсутствующий" loading-text="формируется отчёт" :is-loading="downloadLoading" @click="downloadSample('missing.csv')"/>
                <action-pill icon="refresh" title="запросить статусы" loading-text="запрашиваем статусы" :is-loading="refreshLoading" @click="refreshForTwoSeconds"/>
            </div>
            <p>Скачивание: {{ downloadResult || '—' }}; запросов статусов: {{ refreshes }}</p>
        </section>

        <section>
            <h2>TextPopover</h2>
            <div class="demo-row">
                <text-popover text="Короткий текст"/>
                <text-popover :text="popoverText"/>
                <text-popover text=""/>
                <text-popover v-model="popoverIsOpen" :text="popoverText"/>
            </div>
            <p>
                Подсказка с v-model: {{ popoverIsOpen ? 'открыта' : 'закрыта' }}
                <button type="button" class="demo-button" @click="popoverIsOpen = !popoverIsOpen">Переключить снаружи</button>
                <button type="button" class="demo-button" @click="popoverText = popoverText === '' ? 'Текст вернулся' : ''">Опустошить или вернуть текст</button>
            </p>
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
            <h3>Одно действие: кнопка без стрелки в цвете действия</h3>
            <div class="demo-row">
                <dropdown-button-with-action :actions="[{ label: 'Посмотреть', href: '#view' }]"/>
                <dropdown-button-with-action :actions="[{ label: 'Отправить заново', color: 'yellow', onSelect: countSelection }]"/>
                <dropdown-button-with-action :actions="[{ label: 'Delete', color: 'red', onSelect: countSelection }]"/>
            </div>

            <h3>Несколько действий: первое — кнопка, стрелка открывает остальные</h3>
            <div class="demo-row">
                <dropdown-button-with-action :actions="menuActions"/>
                <dropdown-button-with-action :actions="retryActions"/>
                <dropdown-button-with-action :actions="deleteActions"/>
                <dropdown-button-with-action
                    v-model="dropdownIsOpen"
                    :actions="[{ label: 'С v-model', onSelect: countSelection }, { label: 'Действие', onSelect: countSelection }]"
                />
            </div>
            <p>
                Меню с v-model: {{ dropdownIsOpen ? 'открыто' : 'закрыто' }}
                <button type="button" class="demo-button" @click="dropdownIsOpen = !dropdownIsOpen">Переключить снаружи</button>
            </p>
            <p>Выбрано действий: {{ menuSelections }}, последний переход: {{ lastNavigation || '—' }}</p>
        </section>

        <section>
            <h2>HamburgerMenu</h2>
            <!-- Полоса как шапка проектов: кнопка ☰ у правого края, меню
                 профиля открывается под ней влево. -->
            <div class="demo-header">
                <span>Шапка</span>
                <hamburger-menu :actions="profileActions"/>
            </div>
            <p>Выбрано действий: {{ profileSelections }}</p>
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
                    <action-pill icon="download" title="скачать xlsx" loading-text="формируется отчёт" :is-loading="downloadLoading" @click="downloadSample('report.csv')"/>
                </template>
                <template #cell-status="{ row }">
                    <info-pill :text="row.status" :color="row.statusColor"/>
                </template>
                <template #cell-actions>
                    <dropdown-button-with-action :actions="menuActions"/>
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
                            <info-pill :text="row.status" :color="row.statusColor"/>
                        </template>
                        <template #cell-actions>
                            <dropdown-button-with-action :actions="[{ label: 'Редактировать', href: '#edit' }, { label: 'Удалить', color: 'red', onSelect: countSelection }]"/>
                        </template>
                    </data-table>
                </div>
            </div>

            <h3>Скрытый столбец, полоска строки, без пагинации</h3>
            <data-table
                :rows="tableRows"
                :columns="tableColumnsWithoutCost"
                row-key="uuid"
                :row-stripe="(row) => row.stripe"
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
            <text-popover lang="en" text="Full text in English"/>
            <dropdown-button-with-action lang="en" :actions="[{ label: 'Action', onSelect: countSelection }, { label: 'Another action', onSelect: countSelection }]"/>
            <hamburger-menu lang="en" :actions="[{ label: 'Log out', onSelect: countProfileSelection }]"/>
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
    InfoPill,
    ErrorMessages,
    ActionPill,
    ConfirmationModal,
    DropdownButtonWithAction,
    HamburgerMenu,
    DataTable,
    NavigationMenuElement,
    PageCard,
    NotificationMessage,
    TextPopover,
    downloadFile,
} from '../dist/index.js';
import { lastNavigation } from './navigation-log.js';

export default {
    components: {
        Dot,
        RussianMobileFilter,
        Search,
        SelectDateInterval,
        SelectSingle,
        InfoPill,
        ErrorMessages,
        ActionPill,
        ConfirmationModal,
        DropdownButtonWithAction,
        HamburgerMenu,
        DataTable,
        NavigationMenuElement,
        PageCard,
        NotificationMessage,
        TextPopover,
    },

    setup() {
        return {
            lastNavigation,
        };
    },

    data() {
        return {
            englishModalIsOpen: false,
            // Имена списка цветов пакета: таблица «Цвета».
            colors: ['gray', 'green', 'yellow', 'red', 'indigo', 'purple'],
            pillsLoading: false,
            downloadLoading: false,
            downloadResult: '',
            refreshLoading: false,
            refreshes: 0,
            popoverText: 'Провайдер принял сообщение, итог доставки пока не получен. Длинный текст переносится по словам и прокручивается внутри подсказки, если не помещается по высоте окна.',
            popoverIsOpen: false,
            confirmationNotice: '',
            warningNotice: '',
            dangerousNotice: '',
            phone: '',
            phoneCommits: 0,
            search: '',
            dateFrom: '',
            dateTo: '',
            edgeDateFrom: '',
            edgeDateTo: '',
            vendorItems: [
                { id: 'a', name: 'Первый вендор' },
                { id: 'b', name: 'Второй вендор' },
                { id: 'c', name: 'Третий вендор с длинным именем' },
            ],
            vendor: null,
            vendorCommits: 0,
            longItem: null,
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
            profileSelections: 0,
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
                stripe: [null, 'red', 'yellow', 'green', null, 'indigo', 'purple', 'gray', null, null][index],
            })),
        };
    },

    computed: {
        // Тридцать пунктов: список выше окна, высота ограничена местом до
        // края, и он прокручивается внутри.
        longItems() {
            return Array.from({ length: 30 }, (_, index) => ({ id: `c${index + 1}`, name: `Сертификат ${index + 1}` }));
        },

        // Как кнопка страницы администраторов: основная кнопка — переход,
        // в меню обычный, жёлтый и красный пункты. Длинный пункт показывает
        // перенос строки в меню шириной w-56. Переходы — по hash: в голом
        // окружении без navigate страница не уходит.
        menuActions() {
            return [
                { label: 'Редактировать', href: '#edit' },
                { label: 'Поменять пароль', href: '#password' },
                { label: 'Отправить письмо с новым паролем на старый и новый адрес', color: 'yellow', onSelect: this.countSelection },
                { label: 'Удалить', color: 'red', onSelect: this.countSelection },
            ];
        },

        // Как кнопка отправок certificates: основное действие — функция,
        // жёлтое.
        retryActions() {
            return [
                { label: 'Отправить заново', color: 'yellow', onSelect: this.countSelection },
                { label: 'Зафиксировать как неотправленное', onSelect: this.countSelection },
            ];
        },

        // Красное основное действие и переход в меню.
        deleteActions() {
            return [
                { label: 'Удалить', color: 'red', onSelect: this.countSelection },
                { label: 'Поменять пароль', href: '#password' },
            ];
        },

        // Как меню профиля в шапке проектов: два перехода и выход действием;
        // жёлтый пункт показывает цвет пунктов HamburgerMenu. Переходы —
        // по hash, как у menuActions.
        profileActions() {
            return [
                { label: 'Администраторы', href: '#users' },
                { label: 'Поменять пароль', href: '#password' },
                { label: 'Выйти на всех устройствах', color: 'yellow', onSelect: this.countProfileSelection },
                { label: 'Выйти', onSelect: this.countProfileSelection },
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
        // Скачивание файла сборки playground; missing.csv — ошибка 404.
        downloadSample(name) {
            this.downloadResult = '';
            this.downloadLoading = true;
            downloadFile(name)
                .then(() => { this.downloadResult = `скачан ${name}`; })
                .catch((error) => { this.downloadResult = `ошибка: ${error.message}`; })
                .finally(() => { this.downloadLoading = false; });
        },

        // Действие на две секунды — видно часы.
        refreshForTwoSeconds() {
            this.refreshLoading = true;
            setTimeout(() => {
                this.refreshLoading = false;
                this.refreshes++;
            }, 2000);
        },

        // На экране одно уведомление: у всех трёх одно место в углу.
        showNotice(type) {
            this.confirmationNotice = type === 'confirmation' ? 'Письмо отправлено на адрес user@example.com' : '';
            this.warningNotice = type === 'warning' ? 'Заполните все обязательные поля.' : '';
            this.dangerousNotice = type === 'dangerous' ? 'Не удалось отправить письмо на адрес user@example.com' : '';
        },

        countSelection() {
            this.menuSelections++;
        },

        // У меню профиля свой счётчик: по нему видно, что сработало именно оно.
        countProfileSelection() {
            this.profileSelections++;
        },
    },
};
</script>

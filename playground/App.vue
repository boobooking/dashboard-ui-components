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
            <h2>Popup</h2>
            <button type="button" class="demo-button" @click="popupIsOpen = !popupIsOpen">Открыть меню</button>
            <popup v-model="popupIsOpen">
                <div class="menu">Содержимое меню</div>
            </popup>
        </section>

        <section>
            <h2>PickDay</h2>
            <div class="field">
                <pick-day v-model="day" placeholder-text="от"/>
            </div>
            <p>Значение: {{ day === '' ? '(пусто)' : day }}</p>
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
            <h2>Closer</h2>
            <closer class="closer-demo" @clicked="closerClicks++"/>
            <p>Нажатий: {{ closerClicks }}</p>
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
                <dropdown-button-with-action>
                    <template #button><span class="demo-action">Без привязки</span></template>
                    <template #actions>
                        <a href="#" class="demo-action">Первое действие</a>
                        <a href="#" class="demo-action">Второе действие</a>
                    </template>
                </dropdown-button-with-action>
                <dropdown-button-with-action v-model="dropdownIsOpen">
                    <template #button><span class="demo-action">С v-model</span></template>
                    <template #actions>
                        <a href="#" class="demo-action">Действие</a>
                    </template>
                </dropdown-button-with-action>
                <dropdown-button-with-action>
                    <template #button><span class="demo-action">Без действий</span></template>
                </dropdown-button-with-action>
            </div>
            <p>
                Меню с v-model: {{ dropdownIsOpen ? 'открыто' : 'закрыто' }}
                <button type="button" class="demo-button" @click="dropdownIsOpen = !dropdownIsOpen">Переключить снаружи</button>
            </p>
        </section>
    </div>
</template>

<script>
import {
    Popup,
    Dot,
    PickDay,
    RussianMobileFilter,
    Search,
    SelectDateInterval,
    SelectSingle,
    SmallBadge,
    ErrorMessages,
    Closer,
    DownloadLink,
    ConfirmationModal,
    DropdownButtonWithAction,
} from '../dist/index.js';

export default {
    components: {
        Popup,
        Dot,
        PickDay,
        RussianMobileFilter,
        Search,
        SelectDateInterval,
        SelectSingle,
        SmallBadge,
        ErrorMessages,
        Closer,
        DownloadLink,
        ConfirmationModal,
        DropdownButtonWithAction,
    },

    data() {
        return {
            popupIsOpen: false,
            day: '',
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
            closerClicks: 0,
            warningModalIsOpen: false,
            dangerousModalIsOpen: false,
            modalConfirms: 0,
            modalCancels: 0,
            dropdownIsOpen: false,
        };
    },
};
</script>

<template>
    <div class="page">
        <h1>dashboard-ui-components</h1>

        <section>
            <h2>Dot</h2>
            <dot color="red"/>
            <dot color="green"/>
            <dot color="red" :add-pulse="true"/>
        </section>

        <section>
            <h2>Popup</h2>
            <button type="button" class="demo-button" @click="popupIsOpen = !popupIsOpen">Открыть меню</button>
            <popup v-model:is-open="popupIsOpen">
                <div class="menu">Содержимое меню</div>
            </popup>
        </section>

        <section>
            <h2>PickDay</h2>
            <div class="field">
                <pick-day v-model:day="day" placeholder-text="от"/>
            </div>
            <p>Значение: {{ day === '' ? '(пусто)' : day }}</p>
        </section>

        <section>
            <h2>RussianMobileFilter</h2>
            <russian-mobile-filter v-model="phone" @changed="phoneCommits++"/>
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
        };
    },
};
</script>

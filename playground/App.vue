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
    </div>
</template>

<script>
import { Popup, Dot, PickDay } from '../dist/index.js';

export default {
    components: { Popup, Dot, PickDay },

    data() {
        return {
            popupIsOpen: false,
            day: '',
        };
    },
};
</script>

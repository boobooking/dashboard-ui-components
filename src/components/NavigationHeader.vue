<template>
    <nav class="bb-dashboard-ui bb:bg-white bb:shadow-sm" :aria-label="texts.sections">
        <div class="bb:flex bb:h-16 bb:justify-between bb:px-8">
            <div class="bb:flex">
                <div v-if="$slots.logo" class="bb:flex bb:shrink-0 bb:items-center bb:mr-8">
                    <slot name="logo"/>
                </div>
                <div class="bb:flex bb:gap-8 bb:whitespace-nowrap">
                    <navigation-menu-element
                        v-for="item in itemList"
                        :key="item.key"
                        :name="item.name"
                        :url="item.url"
                        :is-active="item.key === activeKey"
                        :aria-current="item.key === activeKey ? 'page' : null"
                    />
                </div>
            </div>
            <div class="bb:flex bb:items-center bb:ml-6">
                <hamburger-menu :actions="actions" :lang="lang"/>
            </div>
        </div>
    </nav>
</template>

<script>
import { withLang } from "../lang.js";
import HamburgerMenu from "./HamburgerMenu.vue";
import NavigationMenuElement from "./NavigationMenuElement.vue";

// Шапка дашборда: логотип из слота logo, пункты разделов и меню профиля
// справа. Открытый раздел приносит страница пропом activeKey — сам компонент
// его не меняет. Пакет Inertia не импортирует: переходы идут через navigate
// плагина dashboardUi, как у остальных ссылок.
export default {
    components: {
        HamburgerMenu,
        NavigationMenuElement,
    },

    mixins: [withLang],

    props: {
        // [{ key, name, url }], все поля — строки. Ключ сравнивается
        // с activeKey строго.
        items: {
            type: Array,
            default: () => [],
        },
        activeKey: {
            type: String,
            default: null,
        },
        // Пункты меню профиля — передаются в HamburgerMenu как есть.
        actions: {
            type: Array,
            default: () => [],
        },
    },

    computed: {
        // Не массив — пустой список; элементы, которые не объекты, пропускаются.
        itemList() {
            if (!Array.isArray(this.items)) {
                return [];
            }

            return this.items.filter((item) => item !== null && typeof item === "object");
        },
    },
};
</script>

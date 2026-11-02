<template>
    <dl class="bb:m-0 bb:p-0 bb:overflow-hidden bb:rounded-b-lg">
        <slot></slot>
    </dl>
</template>

<script>
// Строки карточки записи: в слоте только DetailRow. Нижние углы обрезает сам
// список: у PageCard нет overflow-hidden, крестик выходит за край карточки,
// и серая последняя строка выступала бы за скругление. На корне нет
// bb-dashboard-ui: в значениях строк разметка приложения, ресет пакета снял
// бы её отступы.
export default {};
</script>

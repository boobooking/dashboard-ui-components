<template>
    <svg
        class="bb:w-4 bb:h-4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
    >
        <circle cx="12" cy="12" r="9"/>
        <line class="bb:origin-center bb:animate-[spin_12s_linear_infinite] bb:motion-reduce:animate-none" x1="12" y1="12" x2="15" y2="12"/>
        <line class="bb:origin-center bb:animate-spin bb:motion-reduce:animate-none" x1="12" y1="12" x2="12" y2="6.5"/>
    </svg>
</template>

<script>
// Часы с бегущими стрелками — пока идёт работа ActionPill. Минутная —
// оборот за секунду (animate-spin), часовая — за двенадцать. Стрелки
// крутятся вокруг центра циферблата: у SVG-элементов transform-box
// по умолчанию view-box, и origin-center — центр viewBox, (12, 12). Своих
// @keyframes нет: spin Tailwind генерирует вместе с animate-spin. При
// системной настройке «уменьшить движение» стрелки стоят.
export default {};
</script>

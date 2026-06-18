<template>
  <svg
    :class="['animate-spin', sizeClass]"
    fill="none"
    viewBox="0 0 24 24"
    role="status"
    aria-label="Loading"
  >
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
  </svg>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  size: { type: String, default: 'md' }, // sm | md | lg
});

const sizeClass = computed(() => ({
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}[props.size] || 'w-6 h-6'));
</script>

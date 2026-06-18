<template>
  <button
    type="button"
    @click="toggle"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :title="isDark ? 'Light mode' : 'Dark mode'"
    class="inline-flex items-center justify-center rounded-lg p-2 text-muted hover:text-content hover:bg-surface-2 transition"
  >
    <!-- Sun (shown in dark mode → click for light) -->
    <svg v-if="isDark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1.5m0 15V21m9-9h-1.5m-15 0H3m15.364 6.364l-1.06-1.06M6.696 6.696l-1.06-1.06m12.728 0l-1.06 1.06M6.696 17.304l-1.06 1.06M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
    <!-- Moon (shown in light mode → click for dark) -->
    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  </button>
</template>

<script setup>
import { useTheme } from '../../composables/useTheme';

const { isDark, toggle } = useTheme();
</script>

import { ref, computed } from 'vue';

const STORAGE_KEY = 'echobit-theme';

/** Shared, app-wide theme state. Single source of truth for dark/light. */
const theme = ref(readInitialTheme());

function readInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch { /* ignore */ }
  // Default to dark (matches the brand); fall back to OS preference.
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'light' : 'dark';
}

function apply(value) {
  if (typeof document === 'undefined') return;
  const dark = value === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  const meta = document.getElementById('theme-color-meta');
  if (meta) meta.setAttribute('content', dark ? '#05080a' : '#f8fafc');
}

function setTheme(value) {
  theme.value = value === 'dark' ? 'dark' : 'light';
  try { localStorage.setItem(STORAGE_KEY, theme.value); } catch { /* ignore */ }
  apply(theme.value);
}

/** Call once on app boot to sync the DOM with the resolved theme. */
export function initTheme() {
  apply(theme.value);
}

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark');
  const toggle = () => setTheme(isDark.value ? 'light' : 'dark');
  return { theme, isDark, toggle, setTheme };
}

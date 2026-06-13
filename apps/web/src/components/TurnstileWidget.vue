<!--
  Cloudflare Turnstile widget for the OTP-sending auth forms.
  No-op unless VITE_TURNSTILE_SITE_KEY is set, mirroring the backend's
  opt-in enforcement (lib/turnstile.ts) — so dev/self-host builds without
  a key render nothing and behave exactly as before.

  Emits the solved token via v-model; parent calls reset() after a failed
  submit since Turnstile tokens are single-use.
-->
<template>
  <div v-if="siteKey" ref="container" class="flex justify-center"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const emit = defineEmits(['update:modelValue']);
const container = ref(null);
let widgetId = null;

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

const loadScript = () =>
  new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Turnstile failed to load')));
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Turnstile failed to load'));
    document.head.appendChild(s);
  });

const render = () => {
  if (!siteKey || !container.value || !window.turnstile) return;
  window.turnstile.ready(() => {
    widgetId = window.turnstile.render(container.value, {
      sitekey: siteKey,
      theme: 'dark',
      callback: (token) => emit('update:modelValue', token),
      'expired-callback': () => emit('update:modelValue', ''),
      'error-callback': () => emit('update:modelValue', ''),
    });
  });
};

const reset = () => {
  if (widgetId !== null && window.turnstile) {
    window.turnstile.reset(widgetId);
    emit('update:modelValue', '');
  }
};

onMounted(async () => {
  if (!siteKey) return;
  try {
    await loadScript();
    render();
  } catch {
    // Script blocked/failed: leave token empty. The backend fails open on a
    // siteverify outage, and IP rate limits remain as the backstop.
  }
});

onBeforeUnmount(() => {
  if (widgetId !== null && window.turnstile) window.turnstile.remove(widgetId);
});

defineExpose({ reset });
</script>

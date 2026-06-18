<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
    <div class="card card-elevated max-w-sm w-full p-6 text-center" role="dialog" aria-modal="true" aria-label="Pro feature">
      <div class="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h3 class="text-lg font-bold text-content mb-2">Pro Feature</h3>
      <p class="text-muted text-sm mb-6">
        This feature requires a Pro plan. Upgrade to unlock meeting minutes, action items, and more.
      </p>
      <div class="flex items-center gap-3">
        <button @click="$emit('close')" class="btn-secondary flex-1 px-4 py-2.5 text-sm">Not now</button>
        <router-link to="/upgrade" class="btn-primary flex-1 px-4 py-2.5 text-sm" @click="$emit('close')">Upgrade</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
defineEmits(['close']);
</script>

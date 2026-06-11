<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
      <div class="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h3 class="text-lg font-bold text-gray-900 mb-2">Pro Feature</h3>
      <p class="text-gray-500 text-sm mb-6">
        This feature requires a Pro plan. Upgrade to unlock meeting minutes, action items, and more.
      </p>
      <div class="flex items-center space-x-3">
        <button
          @click="$emit('close')"
          class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition text-sm font-medium"
        >
          Not now
        </button>
        <router-link
          to="/pricing"
          class="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition text-sm font-medium"
          @click="$emit('close')"
        >
          Upgrade
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
defineEmits(['close']);
</script>

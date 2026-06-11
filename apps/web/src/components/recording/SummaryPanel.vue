<template>
  <div>
    <div v-if="recording.summary">
      <div class="prose prose-emerald max-w-none text-sm sm:text-base" v-html="formatMarkdown(recording.summary)"></div>
      <button
        @click="$emit('generate')"
        :disabled="busy || !recording.transcript"
        class="mt-4 px-4 py-2 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition disabled:opacity-50 flex items-center space-x-2 text-sm"
      >
        <svg v-if="busy" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <span>{{ busy ? 'Regenerating...' : 'Regenerate Summary' }}</span>
      </button>
    </div>
    <div v-else class="text-center py-8">
      <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <h3 class="font-semibold text-gray-900 mb-2">Generate AI Summary</h3>
      <p class="text-gray-500 text-sm mb-4">Get key points and insights from your recording</p>
      <button
        @click="$emit('generate')"
        :disabled="busy || !recording.transcript"
        class="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition disabled:opacity-50 flex items-center space-x-2 mx-auto"
      >
        <svg v-if="busy" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <span>{{ busy ? 'Generating...' : 'Generate Summary' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { formatMarkdown } from '../../services/markdown.js';

defineProps({
  recording: { type: Object, required: true },
  busy: { type: Boolean, default: false },
});
defineEmits(['generate']);
</script>

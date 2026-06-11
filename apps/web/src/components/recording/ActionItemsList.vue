<template>
  <div>
    <div v-if="recording.actionItems?.length">
      <div class="space-y-2 sm:space-y-3">
        <div
          v-for="(item, index) in recording.actionItems"
          :key="index"
          class="flex items-start space-x-3 p-2.5 sm:p-3 bg-gray-50 rounded-xl"
        >
          <div class="flex-shrink-0 mt-0.5">
            <div
              class="w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition"
              :class="item.completed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-emerald-500'"
              @click="$emit('toggle', index)"
            >
              <svg v-if="item.completed" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-900" :class="{ 'line-through text-gray-400': item.completed }">{{ item.task }}</p>
            <div class="flex flex-wrap items-center gap-2 mt-1">
              <span class="text-xs px-2 py-0.5 rounded-full" :class="priorityClass(item.priority)">{{ item.priority }}</span>
              <span v-if="item.assignee && item.assignee !== 'Unassigned'" class="text-xs text-gray-500">
                👤 {{ item.assignee }}
              </span>
              <span v-if="item.deadline" class="text-xs text-gray-500">
                📅 {{ item.deadline }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <button
        @click="$emit('extract')"
        :disabled="busy || !recording.transcript"
        class="mt-4 px-4 py-2 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition disabled:opacity-50 flex items-center space-x-2 text-sm"
      >
        <svg v-if="busy" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <span>{{ busy ? 'Re-extracting...' : 'Re-extract Actions' }}</span>
      </button>
    </div>
    <div v-else class="text-center py-8">
      <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>
      <h3 class="font-semibold text-gray-900 mb-2">Extract Action Items</h3>
      <p class="text-gray-500 text-sm mb-4">Find tasks and to-dos from your recording</p>
      <button
        @click="$emit('extract')"
        :disabled="busy || !recording.transcript"
        class="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition disabled:opacity-50 flex items-center space-x-2 mx-auto"
      >
        <svg v-if="busy" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <span>{{ busy ? 'Extracting...' : 'Extract Actions' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { priorityClass } from '../../services/format.js';

defineProps({
  recording: { type: Object, required: true },
  busy: { type: Boolean, default: false },
});
defineEmits(['toggle', 'extract']);
</script>

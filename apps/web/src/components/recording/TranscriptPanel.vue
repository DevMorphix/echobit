<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h2 class="font-semibold text-gray-900 text-sm sm:text-base">Transcript</h2>
      <div class="flex items-center space-x-3 flex-wrap gap-2">
        <button
          v-if="recording.audioUrl || recording.audioKey"
          @click="$emit('transcribe')"
          :disabled="transcribing"
          class="text-emerald-600 hover:text-emerald-700 text-xs sm:text-sm font-medium flex items-center space-x-1"
        >
          <svg v-if="transcribing" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span>{{ transcribing ? 'Transcribing...' : 'Transcribe with AI' }}</span>
        </button>
        <button
          v-if="!editing"
          @click="startEditing"
          class="text-gray-600 hover:text-gray-700 text-xs sm:text-sm font-medium"
        >
          Edit
        </button>
      </div>
    </div>

    <div v-if="editing">
      <textarea
        v-model="draft"
        rows="8"
        class="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition resize-none text-sm sm:text-base"
      ></textarea>
      <div class="flex justify-end space-x-2 mt-3 sm:mt-4">
        <button @click="cancelEditing" class="px-3 sm:px-4 py-2 text-gray-600 hover:text-gray-800 text-sm">
          Cancel
        </button>
        <button
          @click="$emit('save', draft); editing = false"
          class="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm"
        >
          Save
        </button>
      </div>
    </div>
    <div v-else>
      <div v-if="recording.transcript">
        <p
          class="text-gray-700 whitespace-pre-wrap text-sm sm:text-base"
          :class="{ 'line-clamp-4': !expanded }"
        >{{ recording.transcript }}</p>
        <button
          v-if="isLong"
          @click="expanded = !expanded"
          class="mt-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center space-x-1"
        >
          <span>{{ expanded ? 'Show less' : 'Show more' }}</span>
          <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': expanded }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      <p v-else class="text-gray-400 italic text-sm sm:text-base">No transcript available. Click Edit to add one.</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  recording: { type: Object, required: true },
  transcribing: { type: Boolean, default: false },
});
defineEmits(['transcribe', 'save']);

const editing = ref(false);
const expanded = ref(false);
const draft = ref('');

const startEditing = () => {
  draft.value = props.recording.transcript || '';
  editing.value = true;
};
const cancelEditing = () => {
  editing.value = false;
  draft.value = props.recording.transcript || '';
};

const isLong = computed(() => {
  const t = props.recording?.transcript;
  if (!t) return false;
  return t.split('\n').length > 4 || t.length > 400;
});
</script>

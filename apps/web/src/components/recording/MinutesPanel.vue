<template>
  <div>
    <div v-if="recording.minutes">
      <!-- Export toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-4 border-b border-line">
        <div class="flex items-center gap-2">
          <label class="text-sm text-muted">Template:</label>
          <select
            :value="selectedTemplate"
            @change="$emit('update:selectedTemplate', $event.target.value)"
            aria-label="Minutes template"
            class="text-sm bg-surface border border-line rounded-lg px-3 py-1.5 text-content focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option v-for="(template, key) in templates" :key="key" :value="key">
              {{ template.name }}
            </option>
          </select>
          <button @click="$emit('edit-template', selectedTemplate)" aria-label="Edit template"
            class="p-1.5 text-muted hover:text-content hover:bg-surface-2 rounded-lg transition" title="Edit template">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button @click="$emit('edit-template', null)" aria-label="Create new template"
            class="p-1.5 text-primary hover:opacity-80 hover:bg-primary/10 rounded-lg transition" title="Create new template">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="$emit('download-pdf')"
            :disabled="generatingPdf"
            :class="['px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm font-medium disabled:opacity-50',
              pdfEnabled ? 'bg-primary text-primary-fg hover:bg-primary-hover' : 'bg-surface-2 text-faint cursor-not-allowed']"
            :title="pdfEnabled ? '' : 'PDF export not available on your plan'"
          >
            <Spinner v-if="generatingPdf" size="sm" class="w-4 h-4" />
            <svg v-else-if="!pdfEnabled" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{{ generatingPdf ? 'Generating...' : pdfEnabled ? 'Download PDF' : 'PDF Locked' }}</span>
          </button>
          <button
            @click="$emit('download-md')"
            class="px-4 py-2 text-muted border border-line rounded-lg hover:bg-surface-2 transition flex items-center gap-2 text-sm"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Markdown</span>
          </button>
        </div>
      </div>

      <!-- Preview — a "paper" mock of the exported PDF; stays light in both themes. -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
        <div
          class="pb-4 mb-4"
          :class="{
            'border-b-2': activeTemplate?.headerStyle === 'underlined',
            'text-center': activeTemplate?.headerStyle === 'centered',
            'bg-gray-50 -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 px-6 sm:px-8 py-4 rounded-t-xl': activeTemplate?.headerStyle === 'boxed',
          }"
          :style="activeTemplate?.headerStyle === 'underlined' ? { borderColor: activeTemplate?.accentColor } : {}"
        >
          <h1 class="text-xl sm:text-2xl font-bold mb-2" :style="{ color: activeTemplate?.textColor }">{{ recording.title }}</h1>
          <p class="text-sm text-gray-500">{{ formatDate(recording.createdAt) }}</p>
        </div>
        <div
          class="prose max-w-none mt-6 text-sm sm:text-base"
          :style="{ color: activeTemplate?.textColor }"
          v-html="formatMarkdown(recording.minutes)"
        ></div>
      </div>

      <button
        @click="$emit('generate')"
        :disabled="busy || !recording.transcript"
        class="mt-4 px-4 py-2 text-green-600 dark:text-green-400 border border-green-600/30 rounded-lg hover:bg-green-600/10 transition disabled:opacity-50 flex items-center gap-2 text-sm"
      >
        <Spinner v-if="busy" size="sm" class="w-4 h-4" />
        <span>{{ busy ? 'Regenerating...' : 'Regenerate Minutes' }}</span>
      </button>
    </div>

    <div v-else class="text-center py-8">
      <div class="w-16 h-16 bg-green-100 dark:bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 class="font-semibold text-content mb-2">Generate Meeting Minutes</h3>
      <p class="text-muted text-sm mb-4">Create formal, structured meeting minutes</p>
      <button
        @click="$emit('generate')"
        :disabled="busy || !recording.transcript"
        class="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition disabled:opacity-50 flex items-center gap-2 mx-auto"
      >
        <Spinner v-if="busy" size="sm" />
        <span>{{ busy ? 'Generating...' : 'Generate Minutes' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatMarkdown } from '../../services/markdown.js';
import { formatDate } from '../../services/format.js';
import Spinner from '../ui/Spinner.vue';

const props = defineProps({
  recording: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  generatingPdf: { type: Boolean, default: false },
  pdfEnabled: { type: Boolean, default: true },
  templates: { type: Object, required: true },
  selectedTemplate: { type: String, required: true },
});
defineEmits(['generate', 'download-pdf', 'download-md', 'edit-template', 'update:selectedTemplate']);

const activeTemplate = computed(() => props.templates[props.selectedTemplate]);
</script>

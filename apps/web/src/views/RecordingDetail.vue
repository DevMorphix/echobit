<template>
  <div class="max-w-5xl mx-auto">
    <TemplateEditorModal
      v-if="showTemplateEditor"
      :template="editingTemplate"
      :initial-name="editingTemplateName"
      @close="showTemplateEditor = false"
      @save="saveTemplate"
      @delete="deleteTemplate"
    />
    <UpgradeModal v-if="showUpgradeModal" @close="showUpgradeModal = false" />

    <!-- Back Button -->
    <button
      @click="$router.push('/dashboard/recordings')"
      class="flex items-center text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 mt-6 transition text-sm sm:text-base"
    >
      <svg class="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Recordings
    </button>

    <div v-if="loading" class="bg-white rounded-2xl p-8 sm:p-12 text-center">
      <div class="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto"></div>
      <p class="text-gray-500 mt-2">Loading recording...</p>
    </div>

    <div v-else-if="!recording" class="bg-white rounded-2xl p-8 sm:p-12 text-center">
      <p class="text-gray-500">Recording not found.</p>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-xl sm:text-2xl font-bold text-gray-900 break-words">{{ recording.title }}</h1>
              <button
                v-if="recording.transcript && recording.transcript.length > 20"
                @click="regenerateTitle"
                :disabled="generatingTitle"
                class="text-emerald-600 hover:text-emerald-700 p-1 rounded-lg hover:bg-emerald-50 transition"
                title="Generate AI Title"
              >
                <svg v-if="generatingTitle" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <p class="text-gray-500 mt-1 text-sm sm:text-base">{{ formatDate(recording.createdAt) }}</p>
          </div>
          <span
            class="self-start px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap"
            :class="statusClass(recording.status)"
          >
            {{ recording.status }}
          </span>
        </div>
      </div>

      <!-- Audio Player -->
      <div v-if="recording.audioUrl || recording.audioData" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 class="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Audio Recording</h2>
        <audio :src="recording.audioUrl || recording.audioData" controls class="w-full"></audio>
        <p v-if="recording.duration" class="text-xs sm:text-sm text-gray-500 mt-2">Duration: {{ formatDuration(recording.duration) }}</p>
      </div>

      <TranscriptPanel
        :recording="recording"
        :transcribing="transcribing"
        @transcribe="transcribeWithAI"
        @save="saveTranscript"
      />

      <!-- AI Features -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 sm:mb-6">
        <!-- Tab Navigation -->
        <div class="flex border-b border-gray-100">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeAITab = tab.key"
            :class="[
              'flex-1 py-3 sm:py-4 px-4 text-sm sm:text-base font-medium transition-colors relative',
              activeAITab === tab.key ? tab.activeClass : 'text-gray-500 hover:text-gray-700',
            ]"
          >
            <div class="flex items-center justify-center space-x-2">
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
              </svg>
              <span>{{ tab.label }}</span>
              <span v-if="tab.hasContent()" class="w-2 h-2 rounded-full" :class="tab.dotClass"></span>
            </div>
            <div v-if="activeAITab === tab.key" class="absolute bottom-0 left-0 right-0 h-0.5" :class="tab.barClass"></div>
          </button>
        </div>

        <div class="p-4 sm:p-6">
          <SummaryPanel
            v-if="activeAITab === 'summary'"
            :recording="recording"
            :busy="summarizing"
            @generate="generateSummary"
          />
          <MinutesPanel
            v-if="activeAITab === 'minutes'"
            :recording="recording"
            :busy="generatingMinutes"
            :generating-pdf="generatingPDF"
            :pdf-enabled="pdfEnabled"
            :templates="customTemplates"
            v-model:selected-template="selectedTemplate"
            @generate="generateMinutes"
            @download-pdf="handleDownloadPdf"
            @download-md="downloadMarkdown(recording.title, recording.minutes)"
            @edit-template="openTemplateEditor"
          />
          <ActionItemsList
            v-if="activeAITab === 'actions'"
            :recording="recording"
            :busy="extractingActions"
            @toggle="toggleActionItem"
            @extract="extractActions"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { recordingsApi } from '../api';
import { formatDate, formatDuration, statusClass } from '../services/format.js';
import { downloadMinutesPdf, downloadMarkdown } from '../services/pdf.js';
import { loadTemplates, persistTemplates } from '../services/pdfTemplates.js';
import TemplateEditorModal from '../components/recording/TemplateEditorModal.vue';
import UpgradeModal from '../components/recording/UpgradeModal.vue';
import TranscriptPanel from '../components/recording/TranscriptPanel.vue';
import SummaryPanel from '../components/recording/SummaryPanel.vue';
import MinutesPanel from '../components/recording/MinutesPanel.vue';
import ActionItemsList from '../components/recording/ActionItemsList.vue';

const route = useRoute();
const recording = ref(null);
const loading = ref(true);
const summarizing = ref(false);
const generatingMinutes = ref(false);
const transcribing = ref(false);
const extractingActions = ref(false);
const generatingTitle = ref(false);
const activeAITab = ref('summary');
const selectedTemplate = ref('professional');
const generatingPDF = ref(false);
const pdfEnabled = ref(true);
const showTemplateEditor = ref(false);
const editingTemplate = ref(null);
const editingTemplateName = ref('');
const showUpgradeModal = ref(false);

const customTemplates = ref(loadTemplates());

const tabs = [
  {
    key: 'summary',
    label: 'Summary',
    icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    activeClass: 'text-emerald-600',
    dotClass: 'bg-emerald-500',
    barClass: 'bg-emerald-600',
    hasContent: () => !!recording.value?.summary,
  },
  {
    key: 'minutes',
    label: 'Minutes',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    activeClass: 'text-green-600',
    dotClass: 'bg-green-500',
    barClass: 'bg-green-600',
    hasContent: () => !!recording.value?.minutes,
  },
  {
    key: 'actions',
    label: 'Actions',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    activeClass: 'text-purple-600',
    dotClass: 'bg-purple-500',
    barClass: 'bg-purple-600',
    hasContent: () => !!recording.value?.actionItems?.length,
  },
];

const recordingId = () => recording.value._id || recording.value.id;

// ── Template management ──────────────────────────────────────────────────────

function openTemplateEditor(templateKey = null) {
  if (templateKey && customTemplates.value[templateKey]) {
    editingTemplate.value = {
      key: templateKey,
      ...JSON.parse(JSON.stringify(customTemplates.value[templateKey])),
    };
    editingTemplateName.value = customTemplates.value[templateKey].name;
  } else {
    editingTemplate.value = {
      key: null,
      name: '',
      accentColor: '#16a34a',
      textColor: '#111827',
      headerStyle: 'underlined',
      isDefault: false,
    };
    editingTemplateName.value = '';
  }
  showTemplateEditor.value = true;
}

function saveTemplate(name) {
  const key = editingTemplate.value.key || name.toLowerCase().replace(/\s+/g, '-');

  // Default templates can't be edited — save a copy instead
  if (editingTemplate.value.isDefault && editingTemplate.value.key) {
    const newKey = key + '-custom';
    customTemplates.value[newKey] = { ...editingTemplate.value, name, key: newKey, isDefault: false };
    selectedTemplate.value = newKey;
  } else {
    customTemplates.value[key] = { ...editingTemplate.value, name, isDefault: false };
    selectedTemplate.value = key;
  }

  persistTemplates(customTemplates.value);
  showTemplateEditor.value = false;
}

function deleteTemplate(key) {
  if (customTemplates.value[key]?.isDefault) {
    alert('Cannot delete default templates');
    return;
  }
  if (confirm(`Delete template "${customTemplates.value[key].name}"?`)) {
    delete customTemplates.value[key];
    if (selectedTemplate.value === key) selectedTemplate.value = 'professional';
    persistTemplates(customTemplates.value);
    showTemplateEditor.value = false;
  }
}

// ── Recording actions ────────────────────────────────────────────────────────

const saveTranscript = async (transcript) => {
  try {
    const result = await recordingsApi.update(recordingId(), { transcript });
    recording.value = result.recording;
  } catch (error) {
    console.error('Error saving transcript:', error);
    alert('Failed to save transcript.');
  }
};

const transcribeWithAI = async () => {
  transcribing.value = true;
  try {
    const result = await recordingsApi.transcribe(recordingId());
    recording.value = result.recording;
  } catch (error) {
    console.error('Error transcribing:', error);
    alert('Failed to transcribe: ' + error.message);
  } finally {
    transcribing.value = false;
  }
};

const generateSummary = async () => {
  summarizing.value = true;
  try {
    const result = await recordingsApi.summarize(recordingId(), recording.value.transcript);
    recording.value = result.recording;
  } catch (error) {
    console.error('Error generating summary:', error);
    alert('Failed to generate summary.');
  } finally {
    summarizing.value = false;
  }
};

const generateMinutes = async () => {
  generatingMinutes.value = true;
  try {
    const result = await recordingsApi.generateMinutes(recordingId());
    recording.value = result.recording;
  } catch (error) {
    console.error('Error generating minutes:', error);
    if (error.status === 403) {
      showUpgradeModal.value = true;
    } else {
      alert('Failed to generate minutes.');
    }
  } finally {
    generatingMinutes.value = false;
  }
};

const extractActions = async () => {
  extractingActions.value = true;
  try {
    const result = await recordingsApi.extractActions(recordingId());
    recording.value = result.recording;
  } catch (error) {
    console.error('Error extracting actions:', error);
    if (error.status === 403) {
      showUpgradeModal.value = true;
    } else {
      alert('Failed to extract action items.');
    }
  } finally {
    extractingActions.value = false;
  }
};

const regenerateTitle = async () => {
  generatingTitle.value = true;
  try {
    const result = await recordingsApi.generateTitle(recordingId());
    recording.value.title = result.title;
  } catch (error) {
    console.error('Error generating title:', error);
    alert('Failed to generate AI title.');
  } finally {
    generatingTitle.value = false;
  }
};

const toggleActionItem = async (index) => {
  const item = recording.value.actionItems[index];
  item.completed = !item.completed;
  try {
    await recordingsApi.update(recordingId(), { actionItems: recording.value.actionItems });
  } catch (error) {
    console.error('Error updating action item:', error);
    item.completed = !item.completed; // Revert on error
  }
};

const handleDownloadPdf = async () => {
  if (!pdfEnabled.value) {
    alert('PDF export is not available on your current plan. Upgrade to unlock it.');
    return;
  }
  generatingPDF.value = true;
  try {
    await downloadMinutesPdf({
      title: recording.value.title,
      createdAt: recording.value.createdAt,
      minutes: recording.value.minutes,
      template: customTemplates.value[selectedTemplate.value] || customTemplates.value.professional,
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  } finally {
    generatingPDF.value = false;
  }
};

onMounted(async () => {
  try {
    const result = await recordingsApi.getOne(route.params.id);
    recording.value = result.recording;

    // Async pipeline: keep polling while transcription is in flight
    if (recording.value.status === 'transcribing') {
      recordingsApi
        .waitForTranscript(recordingId(), { onUpdate: (r) => (recording.value = r) })
        .catch(() => {});
    }
  } catch (error) {
    console.error('Failed to load recording:', error);
  } finally {
    loading.value = false;
  }

  // Check if PDF export is enabled for this user's plan
  try {
    const limits = await recordingsApi.getLimits();
    pdfEnabled.value = limits.limits?.pdfExport ?? true;
  } catch { /* keep default true */ }
});
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 sm:mb-8 mt-6">
      <h1 class="text-2xl sm:text-3xl font-bold text-content">New Recording</h1>
      <p class="text-muted mt-1 text-sm sm:text-base">Record your voice or upload an existing audio file for AI transcription.</p>
    </div>

    <!-- Duration warning banner -->
    <div v-if="isRecording && nearingLimit && !atLimit" class="mb-6 flex items-start gap-3 bg-amber-100 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
      <svg class="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p class="text-amber-800 dark:text-amber-300 text-sm font-semibold">Less than 1 minute left on your {{ planLabel }} plan limit — recording will auto-save when time is up.</p>
    </div>

    <!-- Plan limit banner -->
    <div v-if="limitReached" class="mb-6 flex items-start gap-3 bg-amber-100 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
      <svg class="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <div class="flex-1">
        <p class="font-semibold text-amber-800 dark:text-amber-300 text-sm">Recording limit reached</p>
        <p class="text-amber-700 dark:text-amber-400 text-sm mt-0.5">
          You've used {{ usageCount }}/{{ limitCount }} recordings this month on the {{ planLabel }} plan.
        </p>
      </div>
      <router-link to="/upgrade" class="shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition">
        Upgrade
      </router-link>
    </div>

    <!-- Tab Selection -->
    <div class="flex gap-2 mb-4 sm:mb-6">
      <button
        @click="mode = 'record'"
        :class="[
          'flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 text-sm sm:text-base',
          mode === 'record'
            ? 'bg-primary text-primary-fg'
            : 'bg-surface-2 text-muted hover:text-content'
        ]"
      >
        <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <span>Record Live</span>
      </button>
      <button
        @click="mode = 'upload'"
        :class="[
          'flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 text-sm sm:text-base',
          mode === 'upload'
            ? 'bg-primary text-primary-fg'
            : 'bg-surface-2 text-muted hover:text-content'
        ]"
      >
        <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span>Upload File</span>
      </button>
      <button
        @click="mode = 'meeting'"
        :class="[
          'flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 text-sm sm:text-base',
          mode === 'meeting'
            ? 'bg-primary text-primary-fg'
            : 'bg-surface-2 text-muted hover:text-content'
        ]"
      >
        <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span>Record a Meeting</span>
      </button>
    </div>

    <!-- Recording Card -->
    <div class="card card-elevated p-4 sm:p-8">
      <!-- LIVE RECORDING MODE -->
      <div v-if="mode === 'record'" class="text-center py-4 sm:py-8">
        <!-- Waveform Visualization -->
        <div class="mb-6 sm:mb-8">
          <div class="flex items-center justify-center space-x-0.5 sm:space-x-1 h-16 sm:h-24">
            <div
              v-for="i in 20"
              :key="i"
              class="w-1 sm:w-1 bg-primary rounded-full transition-all duration-150"
              :style="{ height: getBarHeight(i) + 'px' }"
            ></div>
          </div>
        </div>

        <!-- Timer -->
        <div class="mb-4 sm:mb-6">
          <span class="text-3xl sm:text-4xl font-mono font-bold text-content">{{ formatTime(recordingTime) }}</span>
        </div>

        <!-- Controls -->
        <div class="flex items-center justify-center space-x-4">
          <button
            v-if="!isRecording && !audioBlob"
            @click="startRecording"
            :disabled="limitReached"
            class="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
          >
            <svg class="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </button>

          <button 
            v-if="isRecording"
            @click="stopRecording"
            class="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all animate-pulse"
          >
            <svg class="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </button>

          <button
            v-if="audioBlob && !isRecording"
            @click="resetRecording"
            aria-label="Discard recording"
            class="w-12 h-12 sm:w-16 sm:h-16 bg-surface-2 rounded-full flex items-center justify-center text-muted hover:text-content hover:bg-line transition"
          >
            <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <p class="text-muted mt-4 text-xs sm:text-sm">
          {{ isRecording ? 'Recording in progress... Click to stop' : audioBlob ? 'Recording complete' : 'Click to start recording' }}
        </p>
      </div>

      <!-- FILE UPLOAD MODE -->
      <div v-else-if="mode === 'upload'" class="py-4 sm:py-8">
        <!-- Drop Zone -->
        <div
          @dragover.prevent="!limitReached && (isDragging = true)"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="!limitReached && handleFileDrop($event)"
          @click="!limitReached && $refs.fileInput.click()"
          :class="[
            'border-2 border-dashed rounded-2xl p-6 sm:p-12 text-center transition',
            limitReached ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
            isDragging
              ? 'border-primary bg-primary/10'
              : uploadedFile
                ? 'border-primary/60 bg-primary/10'
                : 'border-line hover:border-primary/60 hover:bg-surface-2'
          ]"
        >
          <input
            ref="fileInput"
            type="file"
            accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.webm,.mp4,.mov,.avi"
            @change="handleFileSelect"
            class="hidden"
          />
          
          <div v-if="!uploadedFile">
            <div class="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p class="text-base sm:text-lg font-medium text-content">Drop your audio or video file here</p>
            <p class="text-muted mt-2 text-sm">or click to browse</p>
            <p class="text-xs sm:text-sm text-faint mt-3 sm:mt-4">Supports MP3, WAV, M4A, OGG, WebM, MP4, MOV (max 100MB)</p>
          </div>

          <div v-else class="flex items-center justify-center gap-4">
            <div class="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <div class="text-left">
              <p class="font-medium text-content">{{ uploadedFile.name }}</p>
              <p class="text-sm text-muted">{{ formatFileSize(uploadedFile.size) }}</p>
            </div>
            <button
              @click.stop="removeUploadedFile"
              aria-label="Remove file"
              class="p-2 text-faint hover:text-red-600 hover:bg-red-500/10 rounded-lg transition"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- RECORD A MEETING MODE -->
      <div v-else-if="mode === 'meeting'" class="py-4 sm:py-6">
        <!-- Locked: needs Pro/Growth -->
        <div v-if="!meetingBotAllowed" class="text-center py-6">
          <div class="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p class="text-base sm:text-lg font-semibold text-content">Auto-record your Google Meet calls</p>
          <p class="text-muted mt-2 text-sm max-w-md mx-auto">
            Send the Echobit bot to a Meet link — it joins, records the call, and gives you the transcript,
            summary, minutes and action items automatically. Available on Pro and Growth.
          </p>
          <router-link to="/upgrade" class="btn-primary inline-flex mt-5 px-6 py-3">Upgrade to unlock</router-link>
        </div>

        <!-- Schedule / join now form -->
        <div v-else>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-content mb-1.5">Google Meet link</label>
              <input
                v-model="meetingUrl"
                type="url"
                placeholder="https://meet.google.com/abc-defg-hij"
                class="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-content placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-content mb-1.5">Title <span class="text-faint font-normal">(optional)</span></label>
              <input
                v-model="meetingTitle"
                type="text"
                placeholder="Weekly standup"
                class="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-content placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-content mb-1.5">When <span class="text-faint font-normal">(leave blank to join now)</span></label>
              <input
                v-model="meetingWhen"
                type="datetime-local"
                class="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-content focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div class="mt-4 flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-xl p-4">
            <svg class="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm text-primary">"Echobit Notetaker" will ask to join the call — admit it so it can record. You'll get an email when the recording is ready.</p>
          </div>

          <div class="mt-5 flex justify-end">
            <button @click="scheduleMeeting" :disabled="meetingSaving || !meetingUrl" class="btn-primary px-6 py-3">
              <Spinner v-if="meetingSaving" size="sm" />
              <span>{{ meetingSaving ? 'Scheduling…' : (meetingWhen ? 'Schedule bot' : 'Join now') }}</span>
            </button>
          </div>

          <!-- Recent / upcoming bots -->
          <div v-if="meetingsList.length" class="mt-8">
            <h3 class="text-sm font-semibold text-content mb-3">Your meeting bots</h3>
            <div class="space-y-2">
              <div
                v-for="m in meetingsList"
                :key="m.id"
                class="flex items-center gap-3 p-3 bg-surface-2 rounded-xl"
              >
                <span :class="['px-2 py-0.5 rounded-full text-xs font-medium capitalize', statusClass(m.status)]">{{ m.status }}</span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-content truncate">{{ m.title || 'Meeting recording' }}</p>
                  <p class="text-xs text-muted truncate">{{ m.scheduledAt ? formatWhen(m.scheduledAt) : 'Join now' }}</p>
                </div>
                <router-link
                  v-if="m.recordingId"
                  :to="`/dashboard/recordings/${m.recordingId}`"
                  class="shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  Open
                </router-link>
                <button
                  v-else-if="['scheduled','joining','waiting','recording'].includes(m.status)"
                  @click="cancelMeeting(m.id)"
                  class="shrink-0 text-xs font-medium text-muted hover:text-red-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Audio Playback -->
      <div v-if="audioUrl" class="mt-6 p-4 bg-surface-2 rounded-xl">
        <p class="text-sm font-medium text-content mb-2">Preview Recording</p>
        <audio :src="audioUrl" controls class="w-full"></audio>
      </div>

      <!-- Info Message -->
      <div v-if="audioBlob || uploadedFile" class="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-xl">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm text-primary">Click save to upload and transcribe with AI. You'll see the transcript immediately.</p>
        </div>
      </div>

      <!-- Upload Progress Bar -->
      <div v-if="saving && uploadProgress > 0 && uploadProgress < 100" class="mt-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-content">{{ savingStatus }}</span>
          <span class="text-sm text-muted">{{ uploadProgress }}%</span>
        </div>
        <div class="w-full bg-surface-2 rounded-full h-2.5">
          <div
            class="bg-primary h-2.5 rounded-full transition-all duration-300"
            :style="{ width: uploadProgress + '%' }"
          ></div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div v-if="mode !== 'meeting'" class="mt-8 flex items-center justify-end gap-4">
        <button
          @click="$router.push('/dashboard')"
          class="px-6 py-3 text-muted hover:text-content font-medium transition"
        >
          Cancel
        </button>
        <button
          @click="saveRecording"
          :disabled="saving || (!audioBlob && !uploadedFile) || limitReached"
          class="btn-primary px-6 py-3"
        >
          <Spinner v-if="saving" size="sm" />
          <span>{{ saving ? (savingStatus || 'Saving...') : 'Save & Transcribe' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { recordingsApi, meetingsApi } from '../api';
import Spinner from '../components/ui/Spinner.vue';

const router = useRouter();

// Plan limits
const usageCount = ref(0);
const limitCount = ref(null);
const maxDurationSecs = ref(null);
const planLabel = ref('Free');
const limitReached = computed(() =>
  limitCount.value !== null && usageCount.value >= limitCount.value
);
const nearingLimit = computed(() =>
  maxDurationSecs.value !== null && recordingTime.value >= maxDurationSecs.value - 60
);
const atLimit = computed(() =>
  maxDurationSecs.value !== null && recordingTime.value >= maxDurationSecs.value
);

onMounted(async () => {
  try {
    const data = await recordingsApi.getLimits();
    usageCount.value = data.usage.recordingsThisMonth;
    limitCount.value = data.limits.recordingsPerMonth;
    maxDurationSecs.value = data.limits.maxDurationSecs ?? null;
    meetingBotAllowed.value = !!data.limits.meetingBot;
    planLabel.value = data.plan.charAt(0).toUpperCase() + data.plan.slice(1);
  } catch {
    // non-critical — page still works, backend will block at save
  }
  loadMeetings();
});

// Mode: 'record' | 'upload' | 'meeting'
const mode = ref('record');

// ── Meeting bot ──
const meetingBotAllowed = ref(false);
const meetingUrl = ref('');
const meetingTitle = ref('');
const meetingWhen = ref('');
const meetingSaving = ref(false);
const meetingsList = ref([]);

const loadMeetings = async () => {
  try {
    const { meetings } = await meetingsApi.list();
    meetingsList.value = meetings || [];
  } catch {
    // non-critical
  }
};

const scheduleMeeting = async () => {
  if (!meetingUrl.value) return;
  meetingSaving.value = true;
  try {
    const payload = { meetingUrl: meetingUrl.value.trim(), title: meetingTitle.value.trim() || undefined };
    if (meetingWhen.value) payload.scheduledAt = new Date(meetingWhen.value).toISOString();
    await meetingsApi.create(payload);
    meetingUrl.value = '';
    meetingTitle.value = '';
    meetingWhen.value = '';
    await loadMeetings();
  } catch (error) {
    alert(error.message || 'Failed to schedule the meeting bot. Please try again.');
  } finally {
    meetingSaving.value = false;
  }
};

const cancelMeeting = async (id) => {
  try {
    await meetingsApi.cancel(id);
    await loadMeetings();
  } catch (error) {
    alert(error.message || 'Failed to cancel.');
  }
};

const statusClass = (status) => {
  if (['done', 'processing'].includes(status)) return 'bg-primary/15 text-primary';
  if (status === 'failed') return 'bg-red-500/15 text-red-600 dark:text-red-400';
  if (status === 'cancelled') return 'bg-surface text-muted';
  return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
};

const formatWhen = (iso) => {
  try {
    return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
};

const isRecording = ref(false);
const recordingTime = ref(0);
const audioBlob = ref(null);
const audioUrl = ref(null);
const saving = ref(false);
const savingStatus = ref('');
const uploadProgress = ref(0);
const audioLevels = ref(Array(30).fill(10));

// File upload
const uploadedFile = ref(null);
const isDragging = ref(false);

let mediaRecorder = null;
let audioChunks = [];
let timerInterval = null;
let analyserInterval = null;

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getBarHeight = (index) => {
  if (isRecording.value) {
    return audioLevels.value[index] || 10;
  }
  return 10;
};

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    // Audio visualization
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    analyserInterval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      audioLevels.value = Array.from(dataArray.slice(0, 30)).map(v => Math.max(10, v / 3));
    }, 50);

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      audioBlob.value = new Blob(audioChunks, { type: 'audio/webm' });
      audioUrl.value = URL.createObjectURL(audioBlob.value);
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();
      clearInterval(analyserInterval);
      audioLevels.value = Array(30).fill(10);
    };

    mediaRecorder.start();
    isRecording.value = true;
    recordingTime.value = 0;
    
    timerInterval = setInterval(() => {
      recordingTime.value++;
      if (maxDurationSecs.value !== null && recordingTime.value >= maxDurationSecs.value) {
        stopRecording();
      }
    }, 1000);
  } catch (error) {
    console.error('Error accessing microphone:', error);
    alert('Could not access microphone. Please check permissions.');
  }
};

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    isRecording.value = false;
    clearInterval(timerInterval);
  }
};

const resetRecording = () => {
  audioBlob.value = null;
  audioUrl.value = null;
  recordingTime.value = 0;
  uploadedFile.value = null;
};

// File upload functions
const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    processFile(file);
  }
};

const handleFileDrop = (event) => {
  isDragging.value = false;
  const file = event.dataTransfer.files[0];
  if (file) {
    processFile(file);
  }
};

const processFile = (file) => {
  // Check file size (max 100MB)
  if (file.size > 100 * 1024 * 1024) {
    alert('File is too large. Maximum size is 100MB.');
    return;
  }
  
  // Check file type
  const validTypes = ['audio/', 'video/'];
  if (!validTypes.some(type => file.type.startsWith(type))) {
    alert('Invalid file type. Please upload an audio or video file.');
    return;
  }
  
  uploadedFile.value = file;
  audioBlob.value = file;
  audioUrl.value = URL.createObjectURL(file);
};

const removeUploadedFile = () => {
  uploadedFile.value = null;
  audioBlob.value = null;
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
    audioUrl.value = null;
  }
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const saveRecording = async () => {
  saving.value = true;
  uploadProgress.value = 0;
  
  try {
    let audioKey = null;
    const mimeType = audioBlob.value?.type || 'audio/webm';
    
    // Step 1: Get presigned URL and upload directly to R2
    if (audioBlob.value) {
      savingStatus.value = 'Preparing upload...';
      
      try {
        // Get presigned URL from backend
        const { uploadUrl, key } = await recordingsApi.getUploadUrl(mimeType);
        audioKey = key;
        
        savingStatus.value = 'Uploading audio...';
        
        // Upload directly to R2 with progress tracking
        await recordingsApi.uploadToR2(uploadUrl, audioBlob.value, (percent) => {
          uploadProgress.value = percent;
          savingStatus.value = `Uploading... ${percent}%`;
        });
        
        console.log('Direct upload to R2 complete:', audioKey);
      } catch (uploadError) {
        console.error('Direct upload failed:', uploadError);
        throw new Error('Failed to upload audio file. Please try again.');
      }
    }

    savingStatus.value = 'Processing and transcribing...';

    // Step 2: Create recording with audioKey (backend will transcribe)
    const now = new Date();
    const autoTitle = uploadedFile.value 
      ? uploadedFile.value.name.replace(/\.[^/.]+$/, '')
      : `Recording ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const recordingData = {
      title: autoTitle,
      audioKey,
      mimeType,
      duration: recordingTime.value || 0,
      audioSize: audioBlob.value?.size || 0
    };

    const result = await recordingsApi.create(recordingData);
    console.log('Create recording result:', result);
    const recordingId = result.recording._id || result.recording.id;
    if (!recordingId) {
      throw new Error('No recording ID returned from server');
    }
    router.push(`/dashboard/recordings/${recordingId}`);
  } catch (error) {
    console.error('Error saving recording:', error);
    alert(error.message || 'Failed to save recording. Please try again.');
  } finally {
    saving.value = false;
    savingStatus.value = '';
    uploadProgress.value = 0;
  }
};

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
  if (analyserInterval) clearInterval(analyserInterval);
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
  }
});
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 sm:mb-8 mt-6">
      <h1 class="text-2xl sm:text-3xl font-bold text-content">Dashboard</h1>
      <p class="text-muted mt-1 text-sm sm:text-base">Welcome back, {{ userName }}! Here's your recording overview.</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
      <div v-for="stat in statCards" :key="stat.label" class="card card-elevated p-4 sm:p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-muted text-xs sm:text-sm">{{ stat.label }}</p>
            <p class="text-2xl sm:text-3xl font-bold text-content mt-1">{{ stat.value }}</p>
          </div>
          <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center" :class="stat.iconBg">
            <svg class="w-5 h-5 sm:w-6 sm:h-6" :class="stat.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="stat.icon" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="bg-gradient-to-r from-emerald-600 to-green-700 rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8 text-white">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 text-white">Ready to record?</h2>
          <p class="text-white/80 text-sm sm:text-base">Start a new recording and let AI handle the rest.</p>
        </div>
        <router-link
          to="/dashboard/record"
          class="bg-white text-emerald-700 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-white/90 transition flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span>New Recording</span>
        </router-link>
      </div>
    </div>

    <!-- Recent Recordings -->
    <div class="card">
      <div class="p-4 sm:p-6 border-b border-line">
        <div class="flex items-center justify-between">
          <h2 class="text-lg sm:text-xl font-bold text-content">Recent Recordings</h2>
          <router-link to="/dashboard/recordings" class="text-primary hover:opacity-80 text-xs sm:text-sm font-medium">
            View All →
          </router-link>
        </div>
      </div>

      <div v-if="loading" class="p-6 sm:p-8 text-center">
        <Spinner size="lg" class="text-primary mx-auto" />
        <p class="text-muted mt-2 text-sm">Loading recordings...</p>
      </div>

      <div v-else-if="recordings.length === 0" class="p-8 sm:p-12 text-center">
        <div class="w-14 h-14 sm:w-16 sm:h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-6 h-6 sm:w-8 sm:h-8 text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h3 class="text-content font-semibold mb-1 text-sm sm:text-base">No recordings yet</h3>
        <p class="text-muted mb-4 text-sm">Start your first recording to see it here.</p>
        <router-link to="/dashboard/record" class="btn-primary text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Recording
        </router-link>
      </div>

      <div v-else class="divide-y divide-line">
        <div
          v-for="recording in recordings.slice(0, 5)"
          :key="recording._id"
          class="p-3 sm:p-4 hover:bg-surface-2 transition cursor-pointer"
          @click="$router.push(`/dashboard/recordings/${recording._id}`)"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 sm:gap-4 min-w-0">
              <div class="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="font-medium text-content text-sm sm:text-base truncate">{{ recording.title }}</h3>
                <p class="text-xs sm:text-sm text-muted">{{ formatDate(recording.createdAt) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 sm:gap-3 shrink-0">
              <span class="badge hidden sm:inline-flex" :class="statusClass(recording.status)">
                {{ recording.status }}
              </span>
              <svg class="w-4 h-4 sm:w-5 sm:h-5 text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { authState, recordingsApi } from '../api';
import { statusClass } from '../services/format';
import Spinner from '../components/ui/Spinner.vue';

const recordings = ref([]);
const loading = ref(true);

const userName = computed(() => authState.user?.name?.split(' ')[0] || 'User');

// List omits derived text (R2) — tally from the char counts it returns instead.
const stats = computed(() => ({
  total: recordings.value.length,
  summarized: recordings.value.filter(r => (r.summaryChars ?? 0) > 0).length,
  minutes: recordings.value.filter(r => (r.minutesChars ?? 0) > 0).length
}));

const statCards = computed(() => [
  {
    label: 'Total Recordings', value: stats.value.total,
    iconBg: 'bg-primary/10', iconColor: 'text-primary',
    icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
  },
  {
    label: 'Summarized', value: stats.value.summarized,
    iconBg: 'bg-sky-100 dark:bg-sky-500/15', iconColor: 'text-sky-600 dark:text-sky-300',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    label: 'Minutes Generated', value: stats.value.minutes,
    iconBg: 'bg-violet-100 dark:bg-violet-500/15', iconColor: 'text-violet-600 dark:text-violet-300',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
]);

const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

onMounted(async () => {
  try {
    const data = await recordingsApi.getAll();
    recordings.value = data.recordings || [];
  } catch (error) {
    console.error('Failed to load recordings:', error);
  } finally {
    loading.value = false;
  }
});
</script>

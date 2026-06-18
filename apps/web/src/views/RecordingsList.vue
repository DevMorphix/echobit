<template>
  <div>
    <!-- Header -->
    <div class="mb-6 mt-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-content">My Recordings</h1>
        <p class="text-muted mt-1 text-sm sm:text-base">Manage and review all your recordings.</p>
      </div>
      <router-link to="/dashboard/record" class="btn-primary w-full sm:w-auto py-2.5 sm:py-3">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>New Recording</span>
      </router-link>
    </div>

    <!-- Search & Filter -->
    <div class="card card-elevated p-3 sm:p-4 mb-6">
      <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div class="flex-1 relative">
          <svg class="w-5 h-5 text-faint absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input v-model="searchQuery" type="text" placeholder="Search recordings..." aria-label="Search recordings" class="field pl-10" />
        </div>
        <CustomSelect v-model="filterStatus" :options="statusOptions" aria-label="Filter by status" placeholder="All Status" class="w-full sm:w-52" />
      </div>
    </div>

    <!-- Recordings List -->
    <div class="card">
      <div v-if="loading && !recordings.length" class="p-12 text-center">
        <Spinner size="lg" class="text-primary mx-auto" />
        <p class="text-muted mt-2">Loading recordings...</p>
      </div>

      <div v-else-if="!recordings.length" class="p-12 text-center">
        <div class="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h3 class="text-content font-semibold mb-1">
          {{ searchQuery || filterStatus ? 'No recordings found' : 'No recordings yet' }}
        </h3>
        <p class="text-muted mb-4">
          {{ searchQuery || filterStatus ? 'Try adjusting your search or filter' : 'Start your first recording to see it here.' }}
        </p>
      </div>

      <template v-else>
        <div class="divide-y divide-line transition-opacity" :class="{ 'opacity-60 pointer-events-none': loading }">
          <div v-for="recording in recordings" :key="recording._id" class="p-4 sm:p-6 hover:bg-surface-2 transition">
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div class="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                <div class="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-content truncate text-sm sm:text-base">{{ recording.title }}</h3>
                  <p class="text-xs sm:text-sm text-muted mt-1">{{ formatDate(recording.createdAt) }}</p>
                </div>
              </div>

              <div class="flex items-center justify-between sm:justify-end sm:gap-3 sm:ml-4">
                <span class="badge" :class="statusClass(recording.status)">{{ recording.status }}</span>

                <div class="flex items-center gap-1 sm:gap-2">
                  <button @click="$router.push(`/dashboard/recordings/${recording._id}`)" aria-label="View details"
                    class="p-2 text-faint hover:text-primary hover:bg-primary/10 rounded-lg transition" title="View Details">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button @click="deleteRecording(recording._id)" aria-label="Delete recording"
                    class="p-2 text-faint hover:text-red-600 hover:bg-red-500/10 rounded-lg transition" title="Delete">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="pages > 1" class="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-line">
          <p class="text-xs sm:text-sm text-muted">Page {{ page }} of {{ pages }} · {{ total }} total</p>
          <div class="flex items-center gap-2">
            <button @click="go(page - 1)" :disabled="page <= 1 || loading" class="btn-secondary px-3 py-1.5 text-sm">Prev</button>
            <button @click="go(page + 1)" :disabled="page >= pages || loading" class="btn-secondary px-3 py-1.5 text-sm">Next</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { recordingsApi } from '../api';
import { statusClass } from '../services/format';
import Spinner from '../components/ui/Spinner.vue';
import CustomSelect from '../components/ui/CustomSelect.vue';

const LIMIT = 8;
const recordings = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const filterStatus = ref('');
const page = ref(1);
const pages = ref(1);
const total = ref(0);

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'transcribing', label: 'Transcribing' },
  { value: 'transcribed', label: 'Transcribed' },
  { value: 'summarized', label: 'Summarized' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
});

async function load() {
  loading.value = true;
  try {
    const data = await recordingsApi.list({
      page: page.value, limit: LIMIT, status: filterStatus.value, q: searchQuery.value.trim(),
    });
    recordings.value = data.recordings || [];
    total.value = data.total || 0;
    pages.value = data.pages || 1;
  } catch (error) {
    console.error('Failed to load recordings:', error);
  } finally {
    loading.value = false;
  }
}

function go(p) {
  const next = Math.min(pages.value, Math.max(1, p));
  if (next !== page.value) { page.value = next; load(); }
}

// Filter resets to page 1; search is debounced.
watch(filterStatus, () => { page.value = 1; load(); });
let searchTimer;
watch(searchQuery, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { page.value = 1; load(); }, 350);
});

const deleteRecording = async (id) => {
  if (!confirm('Are you sure you want to delete this recording?')) return;
  try {
    await recordingsApi.delete(id);
    // If we just removed the last row on a non-first page, step back.
    if (recordings.value.length === 1 && page.value > 1) page.value--;
    await load();
  } catch (error) {
    console.error('Error deleting recording:', error);
    alert('Failed to delete recording.');
  }
};

onMounted(load);
</script>

<template>
  <div class="space-y-6">
    <div v-if="error" class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl">{{ error }}</div>

    <div v-if="statsLoading" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div v-for="i in 8" :key="i" :class="['h-24 rounded-2xl', thm.skeleton]"></div>
    </div>
    <div v-else-if="stats" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total Users"       :value="stats.users.total"           color="emerald" :dark="isDark"/>
      <StatCard label="Verified"          :value="stats.users.verified"         color="green"   :dark="isDark"/>
      <StatCard label="Privacy Accepted"  :value="stats.users.privacyAccepted"  color="blue"    :dark="isDark"/>
      <StatCard label="New Today"         :value="stats.users.today"            color="yellow"  :dark="isDark"/>
      <StatCard label="Total Recordings"  :value="stats.recordings.total"       color="emerald" :dark="isDark"/>
      <StatCard label="Transcribed"       :value="stats.recordings.transcribed" color="green"   :dark="isDark"/>
      <StatCard label="Recordings Today"  :value="stats.recordings.today"       color="blue"    :dark="isDark"/>
      <StatCard label="This Week"         :value="stats.recordings.week"        color="yellow"  :dark="isDark"/>
    </div>

    <div :class="[thm.card, 'overflow-hidden']">
      <div :class="['flex items-center justify-between px-5 py-4', thm.borderB]">
        <h2 class="font-semibold" :class="thm.text">Recent Activity</h2>
        <button @click="loadActivity" :class="['text-xs transition', thm.accent]">Refresh</button>
      </div>
      <div v-if="activityLoading" class="p-5 space-y-3">
        <div v-for="i in 6" :key="i" :class="['h-10 rounded-xl', thm.skeleton]"></div>
      </div>
      <div v-else-if="!activity.length" class="px-5 py-10 text-center text-sm" :class="thm.textFaint">No activity yet.</div>
      <ul v-else :class="thm.divide">
        <li v-for="(ev, i) in activity" :key="i" class="px-5 py-3 flex items-start gap-3">
          <span :class="['mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0',
            ev.type==='register' ? (isDark?'bg-emerald-900 text-emerald-300':'bg-emerald-50 text-emerald-700') :
            ev.type==='error'    ? (isDark?'bg-red-900 text-red-300':'bg-red-50 text-red-600') :
                                   (isDark?'bg-blue-900 text-blue-300':'bg-blue-50 text-blue-700')]">
            <svg v-if="ev.type==='register'" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z"/></svg>
            <svg v-else-if="ev.type==='error'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-sm truncate" :class="ev.type==='error' ? 'text-red-400' : thm.textMuted">{{ ev.text }}</p>
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              <span class="text-xs" :class="thm.textFaint">{{ fmtDate(ev.timestamp) }}</span>
              <span v-if="ev.type==='error'" :class="['text-xs px-1.5 py-0.5 rounded font-medium', isDark?'bg-red-900/50 text-red-400':'bg-red-100 text-red-600']">error</span>
              <span v-if="ev.type==='register'&&!ev.verified" :class="['text-xs px-1.5 py-0.5 rounded', isDark?'bg-yellow-900/50 text-yellow-400':'bg-yellow-100 text-yellow-700']">unverified</span>
              <span v-if="ev.type==='register'&&!ev.privacyAccepted" :class="['text-xs px-1.5 py-0.5 rounded', isDark?'bg-red-900/50 text-red-400':'bg-red-100 text-red-700']">no consent</span>
              <span v-if="ev.status" :class="['text-xs px-1.5 py-0.5 rounded', statusClass(ev.status, isDark)]">{{ ev.status }}</span>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { adminApi } from '@/api';
import { useTheme } from '../../composables/useTheme';
import { useAdminTheme } from '../../components/admin/theme.js';
import { StatCard } from '../../components/admin/widgets.js';
import { fmtDate, statusClass } from '../../components/admin/format.js';

const { isDark } = useTheme();
const thm = useAdminTheme(isDark);
const error = ref('');

const stats = ref(null);
const statsLoading = ref(false);
async function loadStats() {
  statsLoading.value = true;
  try { stats.value = await adminApi.getStats(); }
  catch (e) { error.value = e.message || 'Failed to load stats'; }
  finally { statsLoading.value = false; }
}

const activity = ref([]);
const activityLoading = ref(false);
async function loadActivity() {
  activityLoading.value = true;
  try { const d = await adminApi.getActivity(40); activity.value = d.events; }
  catch (e) { error.value = e.message || 'Failed to load activity'; }
  finally { activityLoading.value = false; }
}

onMounted(() => { loadStats(); loadActivity(); });
</script>

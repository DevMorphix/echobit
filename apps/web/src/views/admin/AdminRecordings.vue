<template>
  <div class="space-y-4">
    <div v-if="error" class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl">{{ error }}</div>

    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <input v-model="recSearch" @input="debouncedRecSearch" type="text" placeholder="Search title…"
        :class="['w-full sm:w-72 px-4 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition', thm.input]"/>
      <span class="text-sm" :class="thm.textFaint">{{ recTotal }} recordings</span>
    </div>
    <div :class="[thm.card, 'overflow-hidden']">
      <div v-if="recsLoading" class="p-5 space-y-3">
        <div v-for="i in 5" :key="i" :class="['h-12 rounded-xl', thm.skeleton]"></div>
      </div>
      <div v-else-if="!recordings.length" class="px-5 py-10 text-center text-sm" :class="thm.textFaint">No recordings found.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr :class="[thm.borderB, 'text-left']">
            <th v-for="h in ['Title','Owner','Duration','Status','Size','Created']" :key="h" class="px-4 py-3 text-xs font-medium" :class="thm.textFaint">{{ h }}</th>
          </tr></thead>
          <tbody :class="thm.divide">
            <tr v-for="r in recordings" :key="r._id" :class="['transition', thm.rowHover]">
              <td class="px-4 py-3 font-medium max-w-[200px] truncate" :class="thm.text">{{ r.title }}</td>
              <td class="px-4 py-3">
                <div v-if="r.user"><p class="leading-none" :class="thm.textMuted">{{ r.user.name }}</p><p class="text-xs mt-0.5" :class="thm.textFaint">{{ r.user.email }}</p></div>
                <span v-else :class="thm.textFaint">—</span>
              </td>
              <td class="px-4 py-3" :class="thm.textMuted">{{ fmtDuration(r.duration) }}</td>
              <td class="px-4 py-3"><span :class="['text-xs px-2 py-1 rounded-full font-medium', statusClass(r.status, isDark)]">{{ r.status }}</span></td>
              <td class="px-4 py-3 text-xs" :class="thm.textFaint">{{ fmtBytes(r.audioSize) }}</td>
              <td class="px-4 py-3 text-xs" :class="thm.textFaint">{{ fmtDate(r.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="recPages>1" :class="['flex items-center justify-between px-4 py-3', thm.borderT]">
        <button @click="recPage--;loadRecordings()" :disabled="recPage<=1" :class="thm.btn">← Prev</button>
        <span class="text-xs" :class="thm.textFaint">Page {{ recPage }} / {{ recPages }}</span>
        <button @click="recPage++;loadRecordings()" :disabled="recPage>=recPages" :class="thm.btn">Next →</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { adminApi } from '@/api';
import { useTheme } from '../../composables/useTheme';
import { useAdminTheme } from '../../components/admin/theme.js';
import { fmtDate, fmtDuration, fmtBytes, statusClass } from '../../components/admin/format.js';

const { isDark } = useTheme();
const thm = useAdminTheme(isDark);
const error = ref('');

const recordings = ref([]);
const recsLoading = ref(false);
const recSearch = ref('');
const recPage = ref(1);
const recTotal = ref(0);
const recPages = ref(1);
let recSearchTimer = null;

async function loadRecordings() {
  recsLoading.value = true;
  try {
    const d = await adminApi.getRecordings(recPage.value, recSearch.value);
    recordings.value = d.recordings; recTotal.value = d.total; recPages.value = d.pages;
  } catch (e) { error.value = e.message || 'Failed to load recordings'; }
  finally { recsLoading.value = false; }
}

function debouncedRecSearch() {
  recPage.value = 1;
  clearTimeout(recSearchTimer);
  recSearchTimer = setTimeout(loadRecordings, 350);
}

onMounted(loadRecordings);
</script>

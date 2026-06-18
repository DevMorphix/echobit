<template>
  <div class="space-y-5">
    <div v-if="error" class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl">{{ error }}</div>

    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-sm" :class="thm.textMuted">Period:</span>
      <button v-for="d in [7,14,30,60,90]" :key="d" @click="analyticsDays=d;loadAnalytics()"
        :class="['px-3 py-1 rounded-lg text-xs font-medium transition', analyticsDays===d?'bg-emerald-600 text-white':thm.btn]">{{ d }}d</button>
    </div>
    <div v-if="analyticsLoading" class="space-y-4">
      <div v-for="i in 5" :key="i" :class="['h-36 rounded-2xl', thm.skeleton]"></div>
    </div>
    <template v-else-if="analytics">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div :class="[thm.card, 'p-5']">
          <p class="text-xs mb-1" :class="thm.textFaint">Total Audio</p>
          <p class="text-2xl font-bold" :class="thm.text">{{ fmtHours(analytics.totalDuration) }}<span class="text-sm font-normal ml-1" :class="thm.textFaint">hrs</span></p>
        </div>
        <div :class="[thm.card, 'p-5']">
          <p class="text-xs mb-1" :class="thm.textFaint">Storage Used</p>
          <p class="text-2xl font-bold" :class="thm.text">{{ fmtGB(analytics.totalSize) }}</p>
        </div>
        <div :class="[thm.card, 'p-5']">
          <p class="text-xs mb-1" :class="thm.textFaint">Privacy Consent</p>
          <p class="text-2xl font-bold" :class="thm.text">{{ analytics.privacyConsentRate }}<span class="text-sm font-normal ml-1" :class="thm.textFaint">%</span></p>
        </div>
        <div :class="[thm.card, 'p-5']">
          <p class="text-xs mb-1" :class="thm.textFaint">Google Sign-In</p>
          <p class="text-2xl font-bold" :class="thm.text">{{ analytics.authMethods.google }}<span class="text-sm font-normal ml-1" :class="thm.textFaint">users</span></p>
          <p class="text-xs mt-1" :class="thm.textFaint">vs {{ analytics.authMethods.email }} email</p>
        </div>
      </div>

      <div :class="[thm.card, 'p-5']">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold" :class="thm.text">New Signups</h3>
          <span class="text-xs" :class="thm.textFaint">Last {{ analyticsDays }} days · {{ analytics.signupsPerDay.reduce((a,d)=>a+d.count,0) }} total</span>
        </div>
        <BarChart :data="analytics.signupsPerDay" color="#10b981" :dark="isDark"/>
      </div>

      <div :class="[thm.card, 'p-5']">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold" :class="thm.text">Recordings Created</h3>
          <span class="text-xs" :class="thm.textFaint">Last {{ analyticsDays }} days · {{ analytics.recordingsPerDay.reduce((a,d)=>a+d.count,0) }} total</span>
        </div>
        <BarChart :data="analytics.recordingsPerDay" color="#3b82f6" :dark="isDark"/>
      </div>

      <div class="grid md:grid-cols-2 gap-5">
        <div :class="[thm.card, 'p-5']">
          <h3 class="font-semibold mb-4" :class="thm.text">Recording Status</h3>
          <div v-if="!analytics.statusBreakdown.length" class="text-sm" :class="thm.textFaint">No recordings.</div>
          <div v-else class="space-y-4">
            <div v-for="s in analytics.statusBreakdown" :key="s._id" class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="capitalize" :class="thm.textMuted">{{ s._id }}</span>
                <span :class="thm.textFaint">{{ s.count }}</span>
              </div>
              <div :class="['h-2 rounded-full overflow-hidden', isDark?'bg-gray-800':'bg-gray-200']">
                <div class="h-2 rounded-full" :class="statusBarColor(s._id)" :style="{width:Math.max(3,Math.round((s.count/analyticsMaxStatus)*100))+'%'}"></div>
              </div>
            </div>
          </div>
        </div>
        <div :class="[thm.card, 'p-5']">
          <h3 class="font-semibold mb-4" :class="thm.text">Top Users by Recordings</h3>
          <div v-if="!analytics.topUsers.length" class="text-sm" :class="thm.textFaint">No data.</div>
          <ul v-else class="space-y-3">
            <li v-for="(u,i) in analytics.topUsers.slice(0,8)" :key="u.email||i" class="flex items-center gap-3">
              <span class="w-5 shrink-0 text-xs text-right font-mono" :class="thm.textFaint">{{ i+1 }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm truncate leading-none" :class="thm.text">{{ u.name||'—' }}</p>
                <p class="text-xs truncate mt-0.5" :class="thm.textFaint">{{ u.email }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-bold" :class="thm.text">{{ u.count }}</p>
                <p class="text-xs" :class="thm.textFaint">{{ fmtDuration(u.totalDuration) }}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div :class="[thm.card, 'p-5']">
        <h3 class="font-semibold mb-5" :class="thm.text">Auth Method Distribution</h3>
        <div class="flex items-center gap-10">
          <AuthDonut :google="analytics.authMethods.google" :email="analytics.authMethods.email"/>
          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full bg-orange-500 shrink-0"></div>
              <div>
                <p class="text-sm font-medium" :class="thm.text">Google — {{ analytics.authMethods.google }}</p>
                <p class="text-xs" :class="thm.textFaint">{{ authPct(analytics.authMethods.google, analytics) }}% of users</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></div>
              <div>
                <p class="text-sm font-medium" :class="thm.text">Email — {{ analytics.authMethods.email }}</p>
                <p class="text-xs" :class="thm.textFaint">{{ authPct(analytics.authMethods.email, analytics) }}% of users</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { adminApi } from '@/api';
import { useTheme } from '../../composables/useTheme';
import { useAdminTheme } from '../../components/admin/theme.js';
import { BarChart, AuthDonut } from '../../components/admin/widgets.js';
import { fmtHours, fmtGB, fmtDuration, statusBarColor } from '../../components/admin/format.js';

const { isDark } = useTheme();
const thm = useAdminTheme(isDark);
const error = ref('');

const analytics = ref(null);
const analyticsLoading = ref(false);
const analyticsDays = ref(30);
const analyticsMaxStatus = computed(() =>
  !analytics.value?.statusBreakdown?.length ? 1 : Math.max(...analytics.value.statusBreakdown.map(s => s.count), 1)
);

function authPct(val, a) {
  const total = a.authMethods.google + a.authMethods.email;
  return total > 0 ? Math.round((val / total) * 100) : 0;
}

async function loadAnalytics() {
  analyticsLoading.value = true;
  try { analytics.value = await adminApi.getAnalytics(analyticsDays.value); }
  catch (e) { error.value = e.message || 'Failed to load analytics'; }
  finally { analyticsLoading.value = false; }
}

onMounted(loadAnalytics);
</script>

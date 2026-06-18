<template>
  <div class="space-y-5">
    <div v-if="error" class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl">{{ error }}</div>

    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-sm" :class="thm.textMuted">Period:</span>
      <button v-for="d in [7,14,30,60,90]" :key="d" @click="costsDays=d;loadCosts()"
        :class="['px-3 py-1 rounded-lg text-xs font-medium transition', costsDays===d?'bg-emerald-600 text-white':thm.btn]">{{ d }}d</button>
    </div>
    <div v-if="costsLoading" class="space-y-4">
      <div v-for="i in 6" :key="i" :class="['h-28 rounded-2xl', thm.skeleton]"></div>
    </div>
    <template v-else-if="costs">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div :class="[thm.card, 'p-5']">
          <p class="text-xs mb-1" :class="thm.textFaint">Sarvam API</p>
          <p class="text-2xl font-bold text-emerald-400">{{ fmtUSD2(costs.allTime.sarvamCost) }}</p>
          <p class="text-xs mt-1" :class="thm.textFaint">{{ fmtMin(costs.allTime.sarvamMinutes) }} transcribed</p>
        </div>
        <div :class="[thm.card, 'p-5']">
          <p class="text-xs mb-1" :class="thm.textFaint">Gemini AI</p>
          <p class="text-2xl font-bold text-blue-400">{{ fmtUSD2(costs.allTime.geminiCost) }}</p>
          <p class="text-xs mt-1" :class="thm.textFaint">{{ fmtM(costs.allTime.geminiInputTokens) }} in · {{ fmtM(costs.allTime.geminiOutputTokens) }} out</p>
        </div>
        <div :class="[thm.card, 'p-5']">
          <p class="text-xs mb-1" :class="thm.textFaint">R2 Storage</p>
          <p class="text-2xl font-bold text-green-400">{{ fmtUSD2(costs.allTime.storageCostMonthly) }}<span class="text-sm font-normal ml-1" :class="thm.textFaint">/mo</span></p>
          <p class="text-xs mt-1" :class="thm.textFaint">{{ costs.allTime.storageGB.toFixed(2) }} GB</p>
        </div>
        <div :class="[thm.card, 'p-5 ring-1 ring-emerald-600/40']">
          <p class="text-xs mb-1" :class="thm.textFaint">Total Expenses</p>
          <p class="text-2xl font-bold" :class="thm.text">{{ fmtUSD2(costs.allTime.totalCost) }}</p>
          <p class="text-xs mt-1" :class="thm.textFaint">all-time API + storage</p>
        </div>
      </div>

      <div class="grid md:grid-cols-3 gap-4">
        <div :class="[thm.card, 'p-5']">
          <p class="text-xs mb-2 font-medium" :class="thm.textFaint">Sarvam Transcription</p>
          <div class="space-y-2">
            <div class="flex justify-between text-sm"><span :class="thm.textMuted">Minutes</span><span class="font-medium" :class="thm.text">{{ costs.allTime.sarvamMinutes.toFixed(1) }} min</span></div>
            <div class="flex justify-between text-sm"><span :class="thm.textMuted">Rate</span><span class="font-medium" :class="thm.text">${{ costs.pricing.SARVAM_COST_PER_MIN }}/min</span></div>
            <div :class="['flex justify-between text-sm pt-2 mt-2', thm.borderT]"><span class="font-medium" :class="thm.textMuted">Total</span><span class="font-bold text-emerald-400">{{ fmtUSD(costs.allTime.sarvamCost) }}</span></div>
          </div>
        </div>
        <div :class="[thm.card, 'p-5']">
          <p class="text-xs mb-2 font-medium" :class="thm.textFaint">Gemini 2.5 Flash</p>
          <div class="space-y-2">
            <div class="flex justify-between text-sm"><span :class="thm.textMuted">Input</span><span class="font-medium" :class="thm.text">{{ fmtM(costs.allTime.geminiInputTokens) }} tok</span></div>
            <div class="flex justify-between text-sm"><span :class="thm.textMuted">Output</span><span class="font-medium" :class="thm.text">{{ fmtM(costs.allTime.geminiOutputTokens) }} tok</span></div>
            <div :class="['flex justify-between text-sm pt-2 mt-2', thm.borderT]"><span class="font-medium" :class="thm.textMuted">Total</span><span class="font-bold text-blue-400">{{ fmtUSD(costs.allTime.geminiCost) }}</span></div>
          </div>
        </div>
        <div :class="[thm.card, 'p-5']">
          <p class="text-xs mb-2 font-medium" :class="thm.textFaint">Cloudflare R2</p>
          <div class="space-y-2">
            <div class="flex justify-between text-sm"><span :class="thm.textMuted">Stored</span><span class="font-medium" :class="thm.text">{{ costs.allTime.storageGB.toFixed(2) }} GB</span></div>
            <div class="flex justify-between text-sm"><span :class="thm.textMuted">Rate</span><span class="font-medium" :class="thm.text">${{ costs.pricing.R2_COST_PER_GB_MONTH }}/GB/mo</span></div>
            <div :class="['flex justify-between text-sm pt-2 mt-2', thm.borderT]"><span class="font-medium" :class="thm.textMuted">Monthly</span><span class="font-bold text-green-400">{{ fmtUSD(costs.allTime.storageCostMonthly) }}</span></div>
          </div>
        </div>
      </div>

      <div :class="[thm.card, 'p-5']">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold" :class="thm.text">Daily API Costs</h3>
          <div class="flex items-center gap-4 text-xs" :class="thm.textFaint">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>Sarvam</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span>Gemini</span>
          </div>
        </div>
        <CostBarChart :data="costs.costsPerDay" :dark="isDark"/>
      </div>

      <div :class="[thm.card, 'overflow-hidden']">
        <div :class="['px-5 py-4', thm.borderB]"><h3 class="font-semibold" :class="thm.text">Top Users by API Cost</h3></div>
        <div v-if="!costs.topUsers.length" class="px-5 py-10 text-center text-sm" :class="thm.textFaint">No data.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr :class="[thm.borderB,'text-left']">
              <th v-for="h in ['#','User','Recordings','Minutes','Sarvam','Gemini','Total']" :key="h" class="px-4 py-3 text-xs font-medium" :class="thm.textFaint">{{ h }}</th>
            </tr></thead>
            <tbody :class="thm.divide">
              <tr v-for="(u,i) in costs.topUsers" :key="u.email||i" :class="['transition', thm.rowHover]">
                <td class="px-4 py-3 text-xs font-mono" :class="thm.textFaint">{{ i+1 }}</td>
                <td class="px-4 py-3"><p class="font-medium leading-none" :class="thm.text">{{ u.name||'—' }}</p><p class="text-xs mt-0.5" :class="thm.textFaint">{{ u.email }}</p></td>
                <td class="px-4 py-3" :class="thm.textMuted">{{ u.recordingCount }}</td>
                <td class="px-4 py-3" :class="thm.textMuted">{{ u.totalMinutes.toFixed(1) }} min</td>
                <td class="px-4 py-3 text-emerald-400 font-mono text-xs">{{ fmtUSD(u.sarvamCost) }}</td>
                <td class="px-4 py-3 text-blue-400 font-mono text-xs">{{ fmtUSD(u.geminiCost) }}</td>
                <td class="px-4 py-3 font-bold font-mono text-xs" :class="thm.text">{{ fmtUSD(u.totalCost) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div :class="[thm.card, 'p-5']">
        <p class="text-xs mb-3 font-medium uppercase tracking-wide" :class="thm.textFaint">Pricing Config</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div v-for="[label, val, unit] in [['Sarvam STT', costs.pricing.SARVAM_COST_PER_MIN, '/min'],['Gemini In', costs.pricing.GEMINI_INPUT_PER_1M, '/1M tok'],['Gemini Out', costs.pricing.GEMINI_OUTPUT_PER_1M, '/1M tok'],['R2 Storage', costs.pricing.R2_COST_PER_GB_MONTH, '/GB/mo']]" :key="label" :class="[thm.cardInner, 'px-4 py-3']">
            <p class="text-xs mb-1" :class="thm.textFaint">{{ label }}</p>
            <p class="font-mono text-sm" :class="thm.text">${{ val }}<span class="text-xs ml-1" :class="thm.textFaint">{{ unit }}</span></p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { adminApi } from '@/api';
import { useTheme } from '../../composables/useTheme';
import { useAdminTheme } from '../../components/admin/theme.js';
import { CostBarChart } from '../../components/admin/widgets.js';
import { fmtUSD, fmtUSD2, fmtM, fmtMin } from '../../components/admin/format.js';

const { isDark } = useTheme();
const thm = useAdminTheme(isDark);
const error = ref('');

const costs = ref(null);
const costsLoading = ref(false);
const costsDays = ref(30);

async function loadCosts() {
  costsLoading.value = true;
  try { costs.value = await adminApi.getCosts(costsDays.value); }
  catch (e) { error.value = e.message || 'Failed to load financials'; }
  finally { costsLoading.value = false; }
}

onMounted(loadCosts);
</script>

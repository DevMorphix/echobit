<template>
  <div class="space-y-6">
    <div v-if="error" class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl">{{ error }}</div>

    <div :class="[thm.card, 'p-5']">
      <h2 class="font-semibold mb-1" :class="thm.text">Plan Feature Editor</h2>
      <p class="text-xs mb-5" :class="thm.textFaint">Toggle features on/off, edit text, add or remove rows. Changes are saved per plan.</p>

      <!-- Plan selector -->
      <div class="flex gap-2 flex-wrap mb-6">
        <button v-for="p in planKeys" :key="p"
          @click="activePlanEdit = p"
          :class="['px-4 py-2 rounded-xl text-sm font-semibold transition', activePlanEdit === p ? 'bg-emerald-600 text-white' : thm.btn]">
          {{ p.charAt(0).toUpperCase() + p.slice(1) }}
        </button>
      </div>

      <!-- Prices -->
      <div class="grid grid-cols-2 gap-3 mb-2">
        <div>
          <label class="text-xs font-semibold mb-1 block" :class="thm.textFaint">Monthly Price <span class="font-normal">(e.g. ₹499)</span></label>
          <input v-model="editingMonthlyPrice" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" placeholder="₹499" />
        </div>
        <div>
          <label class="text-xs font-semibold mb-1 block" :class="thm.textFaint">Annual/mo <span class="font-normal">(e.g. ₹399)</span></label>
          <input v-model="editingAnnualMonthly" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" placeholder="₹399" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label class="text-xs font-semibold mb-1 block" :class="thm.textFaint">Annual Total <span class="font-normal">(e.g. ₹4,788)</span></label>
          <input v-model="editingAnnualTotal" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" placeholder="₹4,788" />
        </div>
        <div>
          <label class="text-xs font-semibold mb-1 block" :class="thm.textFaint">Monthly Paise <span class="font-normal">(for MRR)</span></label>
          <input v-model.number="editingMonthlyPaise" type="number" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" placeholder="49900" />
        </div>
      </div>

      <!-- Feature rows -->
      <div v-if="plansLoading" class="text-sm py-6 text-center" :class="thm.textFaint">Loading…</div>
      <div v-else class="space-y-2">
        <div v-for="(feat, idx) in editingFeatures" :key="idx"
          :class="['flex items-center gap-3 px-3 py-2.5 rounded-xl border', isDark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-gray-50']">
          <!-- tick/cross toggle -->
          <button @click="feat.included = !feat.included"
            :class="['w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition',
              feat.included ? 'bg-emerald-600 text-white' : (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-400')]">
            <svg v-if="feat.included" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <!-- text input -->
          <input v-model="feat.text" :class="['flex-1 bg-transparent text-sm outline-none', thm.text]" placeholder="Feature text" />
          <!-- delete -->
          <button @click="editingFeatures.splice(idx, 1)"
            class="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 transition shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>

        <!-- Add row -->
        <button @click="editingFeatures.push({ text: '', included: true })"
          :class="['w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition flex items-center justify-center gap-2',
            isDark ? 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400' : 'border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600']">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Add Feature
        </button>
      </div>

      <!-- Feature Gates -->
      <div :class="['mt-5 p-4 rounded-xl border', isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50']">
        <p class="text-xs font-bold mb-3 uppercase tracking-wide" :class="thm.textFaint">Feature Gates <span class="font-normal normal-case">(overrides plan defaults — leave as Default to keep plan defaults)</span></p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          <label v-for="gate in gateKeys" :key="gate.key"
            :class="['flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition',
              isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100 border border-gray-200']">
            <div>
              <span class="text-sm font-medium" :class="thm.text">{{ gate.label }}</span>
              <span class="text-xs block mt-0.5" :class="thm.textFaint">default: {{ defaultGates[activePlanEdit]?.[gate.key] ? 'ON' : 'OFF' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs" :class="thm.textFaint">{{ editingGates[gate.key] === null || editingGates[gate.key] === undefined ? 'Default' : editingGates[gate.key] ? 'ON' : 'OFF' }}</span>
              <button @click="cycleGate(gate.key)"
                :class="['w-10 h-6 rounded-full transition-all relative flex-shrink-0',
                  (editingGates[gate.key] === null || editingGates[gate.key] === undefined) ? (isDark ? 'bg-gray-600' : 'bg-gray-300') :
                  editingGates[gate.key] ? 'bg-emerald-500' : 'bg-red-400']">
                <span :class="['absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
                  (editingGates[gate.key] === null || editingGates[gate.key] === undefined) ? 'left-0.5' :
                  editingGates[gate.key] ? 'left-[18px]' : 'left-0.5']"></span>
              </button>
            </div>
          </label>
        </div>

        <!-- Numeric Limits -->
        <p class="text-xs font-bold mb-2 uppercase tracking-wide" :class="thm.textFaint">Usage Limits <span class="font-normal normal-case">(leave blank to use plan defaults)</span></p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="text-xs font-semibold mb-1 block" :class="thm.textFaint">
              Recordings / month
              <span :class="thm.textFaint + ' font-normal'"> (default: {{ PLAN_LIMITS_DISPLAY[activePlanEdit]?.recordings }})</span>
            </label>
            <input v-model.number="editingRecordingsPerMonth" type="number" min="0"
              :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]"
              placeholder="0 = unlimited, blank = default" />
          </div>
          <div>
            <label class="text-xs font-semibold mb-1 block" :class="thm.textFaint">
              Max duration (minutes)
              <span :class="thm.textFaint + ' font-normal'"> (default: {{ PLAN_LIMITS_DISPLAY[activePlanEdit]?.duration }})</span>
            </label>
            <input v-model.number="editingMaxDurationMins" type="number" min="1"
              :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]"
              placeholder="blank = default" />
          </div>
          <div>
            <label class="text-xs font-semibold mb-1 block" :class="thm.textFaint">
              Storage (GB)
              <span :class="thm.textFaint + ' font-normal'"> (default: {{ PLAN_LIMITS_DISPLAY[activePlanEdit]?.storage }})</span>
            </label>
            <input v-model.number="editingMaxStorageGB" type="number" min="1"
              :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]"
              placeholder="blank = default" />
          </div>
        </div>
      </div>

      <!-- Save -->
      <div class="flex items-center gap-3 mt-5">
        <button @click="savePlanFeatures" :disabled="plansSaving"
          class="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition disabled:opacity-50">
          {{ plansSaving ? 'Saving…' : 'Save Changes' }}
        </button>
        <span v-if="plansSaveMsg" :class="['text-xs font-medium', plansSaveMsg.ok ? 'text-emerald-400' : 'text-red-400']">{{ plansSaveMsg.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { plansApi } from '@/api';
import { useTheme } from '../../composables/useTheme';
import { useAdminTheme } from '../../components/admin/theme.js';

const { isDark } = useTheme();
const thm = useAdminTheme(isDark);
const error = ref('');

const planKeys = ['free', 'starter', 'pro', 'growth', 'team'];
const activePlanEdit = ref('free');
const allPlanData = ref({});
const plansLoading = ref(false);
const plansSaving = ref(false);
const plansSaveMsg = ref(null);

const editingFeatures = computed({
  get: () => allPlanData.value[activePlanEdit.value]?.features ?? [],
  set: (val) => {
    if (!allPlanData.value[activePlanEdit.value]) allPlanData.value[activePlanEdit.value] = {};
    allPlanData.value[activePlanEdit.value].features = val;
  },
});
const editingMonthlyPrice = computed({
  get: () => allPlanData.value[activePlanEdit.value]?.monthlyPrice ?? '',
  set: (val) => { if (!allPlanData.value[activePlanEdit.value]) allPlanData.value[activePlanEdit.value] = {}; allPlanData.value[activePlanEdit.value].monthlyPrice = val; },
});
const editingAnnualMonthly = computed({
  get: () => allPlanData.value[activePlanEdit.value]?.annualMonthly ?? '',
  set: (val) => { if (!allPlanData.value[activePlanEdit.value]) allPlanData.value[activePlanEdit.value] = {}; allPlanData.value[activePlanEdit.value].annualMonthly = val; },
});
const editingAnnualTotal = computed({
  get: () => allPlanData.value[activePlanEdit.value]?.annualTotal ?? '',
  set: (val) => { if (!allPlanData.value[activePlanEdit.value]) allPlanData.value[activePlanEdit.value] = {}; allPlanData.value[activePlanEdit.value].annualTotal = val; },
});
const editingMonthlyPaise = computed({
  get: () => allPlanData.value[activePlanEdit.value]?.monthlyPaise ?? 0,
  set: (val) => { if (!allPlanData.value[activePlanEdit.value]) allPlanData.value[activePlanEdit.value] = {}; allPlanData.value[activePlanEdit.value].monthlyPaise = val; },
});

const PLAN_LIMITS_DISPLAY = {
  free:    { recordings: '3',        duration: '20 min',  storage: '1 GB'  },
  starter: { recordings: '15',       duration: '45 min',  storage: '3 GB'  },
  pro:     { recordings: '40',       duration: '2 hrs',   storage: '10 GB' },
  growth:  { recordings: 'Unlimited', duration: '3 hrs',  storage: '25 GB' },
  team:    { recordings: 'Unlimited', duration: '3 hrs',  storage: '50 GB' },
};

const PLAN_DEFAULTS = {
  free:    { meetingMinutes: false, actionItems: false, pdfExport: false, indianLanguages: true  },
  starter: { meetingMinutes: false, actionItems: false, pdfExport: false, indianLanguages: true  },
  pro:     { meetingMinutes: true,  actionItems: true,  pdfExport: true,  indianLanguages: true  },
  growth:  { meetingMinutes: true,  actionItems: true,  pdfExport: true,  indianLanguages: true  },
  team:    { meetingMinutes: true,  actionItems: true,  pdfExport: true,  indianLanguages: true  },
};
const defaultGates = PLAN_DEFAULTS;

const gateKeys = [
  { key: 'meetingMinutes',  label: 'Meeting Minutes' },
  { key: 'actionItems',     label: 'Action Items (Tasks)' },
  { key: 'pdfExport',       label: 'PDF Export' },
  { key: 'indianLanguages', label: 'Indian Languages' },
];

const editingGates = computed(() => allPlanData.value[activePlanEdit.value]?.gates ?? {});

const editingRecordingsPerMonth = computed({
  get: () => allPlanData.value[activePlanEdit.value]?.gates?.recordingsPerMonth ?? '',
  set: (val) => {
    if (!allPlanData.value[activePlanEdit.value]) allPlanData.value[activePlanEdit.value] = {};
    if (!allPlanData.value[activePlanEdit.value].gates) allPlanData.value[activePlanEdit.value].gates = {};
    allPlanData.value[activePlanEdit.value].gates.recordingsPerMonth = val === '' ? null : Number(val);
  },
});
const editingMaxDurationMins = computed({
  get: () => allPlanData.value[activePlanEdit.value]?.gates?.maxDurationMins ?? '',
  set: (val) => {
    if (!allPlanData.value[activePlanEdit.value]) allPlanData.value[activePlanEdit.value] = {};
    if (!allPlanData.value[activePlanEdit.value].gates) allPlanData.value[activePlanEdit.value].gates = {};
    allPlanData.value[activePlanEdit.value].gates.maxDurationMins = val === '' ? null : Number(val);
  },
});
const editingMaxStorageGB = computed({
  get: () => allPlanData.value[activePlanEdit.value]?.gates?.maxStorageGB ?? '',
  set: (val) => {
    if (!allPlanData.value[activePlanEdit.value]) allPlanData.value[activePlanEdit.value] = {};
    if (!allPlanData.value[activePlanEdit.value].gates) allPlanData.value[activePlanEdit.value].gates = {};
    allPlanData.value[activePlanEdit.value].gates.maxStorageGB = val === '' ? null : Number(val);
  },
});

// Cycle: null (default) → true (ON) → false (OFF) → null
function cycleGate(key) {
  const p = activePlanEdit.value;
  if (!allPlanData.value[p]) allPlanData.value[p] = {};
  if (!allPlanData.value[p].gates) allPlanData.value[p].gates = {};
  const cur = allPlanData.value[p].gates[key];
  if (cur === null || cur === undefined) allPlanData.value[p].gates[key] = true;
  else if (cur === true)  allPlanData.value[p].gates[key] = false;
  else                   allPlanData.value[p].gates[key] = null;
}

async function loadPlanFeatures() {
  plansLoading.value = true;
  try { allPlanData.value = await plansApi.getAll(); }
  catch { /* ignore */ }
  finally { plansLoading.value = false; }
}

async function savePlanFeatures() {
  plansSaving.value = true;
  plansSaveMsg.value = null;
  const p = activePlanEdit.value;
  try {
    const d = allPlanData.value[p] ?? {};
    await plansApi.update(p, d.features ?? [], d.monthlyPrice, d.annualMonthly, d.annualTotal, d.monthlyPaise, d.gates);
    plansSaveMsg.value = { ok: true, text: 'Saved!' };
  } catch (e) {
    plansSaveMsg.value = { ok: false, text: e.message || 'Save failed' };
  } finally {
    plansSaving.value = false;
    setTimeout(() => { plansSaveMsg.value = null; }, 3000);
  }
}

onMounted(loadPlanFeatures);
</script>

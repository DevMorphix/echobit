<template>
  <div class="space-y-5">
    <div v-if="error" class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl">{{ error }}</div>

    <div v-if="subsLoading" class="space-y-4">
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div v-for="i in 5" :key="i" :class="['h-24 rounded-2xl', thm.skeleton]"></div>
      </div>
      <div v-for="i in 3" :key="i" :class="['h-40 rounded-2xl', thm.skeleton]"></div>
    </div>

    <template v-else-if="subscriptions">
      <!-- KPI row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div :class="[thm.card, 'p-5 ring-1 ring-yellow-500/30']">
          <p class="text-xs mb-1" :class="thm.textFaint">MRR</p>
          <p class="text-2xl font-bold text-yellow-400">₹{{ subscriptions.stats.mrrInr.toLocaleString('en-IN') }}</p>
          <p class="text-xs mt-1" :class="thm.textFaint">monthly recurring revenue</p>
        </div>
        <div :class="[thm.card, 'p-5 ring-1 ring-emerald-500/30']">
          <p class="text-xs mb-1" :class="thm.textFaint">ARR</p>
          <p class="text-2xl font-bold text-emerald-400">₹{{ subscriptions.stats.arrInr.toLocaleString('en-IN') }}</p>
          <p class="text-xs mt-1" :class="thm.textFaint">annual run rate</p>
        </div>
        <div :class="[thm.card, 'p-5 ring-1 ring-blue-500/30']">
          <p class="text-xs mb-1" :class="thm.textFaint">ARPU</p>
          <p class="text-2xl font-bold text-blue-400">₹{{ subscriptions.stats.arpuInr.toLocaleString('en-IN') }}</p>
          <p class="text-xs mt-1" :class="thm.textFaint">avg revenue per user</p>
        </div>
        <div :class="[thm.card, 'p-5']">
          <p class="text-xs mb-1" :class="thm.textFaint">Churn Rate</p>
          <p class="text-2xl font-bold" :class="[subscriptions.stats.churnRate > 10 ? 'text-red-400' : 'text-white']">{{ subscriptions.stats.churnRate }}%</p>
          <p class="text-xs mt-1" :class="thm.textFaint">{{ subscriptions.stats.churnedUsers }} churned</p>
        </div>
      </div>
      <!-- Secondary KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div :class="[thm.card, 'p-5']">
          <p class="text-xs mb-1" :class="thm.textFaint">Total Users</p>
          <p class="text-2xl font-bold" :class="thm.text">{{ subscriptions.stats.totalUsers }}</p>
          <p class="text-xs mt-1" :class="thm.textFaint">all accounts</p>
        </div>
        <div :class="[thm.card, 'p-5 ring-1 ring-emerald-500/20']">
          <p class="text-xs mb-1" :class="thm.textFaint">Active Pro</p>
          <p class="text-2xl font-bold text-emerald-400">{{ subscriptions.stats.activePro }}</p>
          <p class="text-xs mt-1" :class="thm.textFaint">subscribers</p>
        </div>
        <div :class="[thm.card, 'p-5 ring-1 ring-blue-500/20']">
          <p class="text-xs mb-1" :class="thm.textFaint">Active Team</p>
          <p class="text-2xl font-bold text-blue-400">{{ subscriptions.stats.activeTeam }}</p>
          <p class="text-xs mt-1" :class="thm.textFaint">subscribers</p>
        </div>
        <div :class="[thm.card, 'p-5']">
          <p class="text-xs mb-1" :class="thm.textFaint">Free Plan</p>
          <p class="text-2xl font-bold" :class="thm.text">{{ subscriptions.stats.freeUsers }}</p>
          <p class="text-xs mt-1 text-emerald-400">{{ subscriptions.stats.totalUsers > 0 ? Math.round(subscriptions.stats.activePaid/subscriptions.stats.totalUsers*100) : 0 }}% conversion</p>
        </div>
      </div>

      <!-- Plan distribution -->
      <div :class="[thm.card, 'p-5']">
        <h3 class="font-semibold mb-4" :class="thm.text">Plan Distribution</h3>
        <div class="flex flex-wrap items-center gap-4 mb-3 text-sm" :class="thm.textMuted">
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>Pro ({{ subscriptions.planBreakdown.pro }})</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span>Team ({{ subscriptions.planBreakdown.team }})</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-orange-400 inline-block"></span>Churned ({{ subscriptions.planBreakdown.expired }})</span>
          <span class="flex items-center gap-1.5"><span :class="['w-3 h-3 rounded-sm inline-block', isDark?'bg-gray-600':'bg-gray-400']"></span>Free ({{ subscriptions.planBreakdown.free }})</span>
        </div>
        <div :class="['w-full h-5 rounded-full overflow-hidden flex', isDark?'bg-gray-800':'bg-gray-200']">
          <div class="bg-emerald-500 h-full" :style="{width:planPct(subscriptions.planBreakdown.pro)+'%'}"></div>
          <div class="bg-blue-500 h-full" :style="{width:planPct(subscriptions.planBreakdown.team)+'%'}"></div>
          <div class="bg-orange-400 h-full" :style="{width:planPct(subscriptions.planBreakdown.expired)+'%'}"></div>
          <div :class="['h-full flex-1', isDark?'bg-gray-700':'bg-gray-300']"></div>
        </div>
        <div class="flex justify-between mt-2">
          <span class="text-xs" :class="thm.textFaint">
            Paid: {{ subscriptions.stats.activePaid }}
            ({{ subscriptions.stats.totalUsers > 0 ? Math.round(subscriptions.stats.activePaid/subscriptions.stats.totalUsers*100) : 0 }}% conversion)
          </span>
          <span class="text-xs text-orange-400">{{ subscriptions.stats.churnedUsers }} churned</span>
        </div>
      </div>

      <!-- Active Subscribers -->
      <div :class="[thm.card, 'overflow-hidden']">
        <div :class="['flex items-center justify-between px-5 py-4', thm.borderB]">
          <h3 class="font-semibold" :class="thm.text">Active Subscribers</h3>
          <span class="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">{{ subscriptions.subscribers.length }} active</span>
        </div>
        <div v-if="!subscriptions.subscribers.length" class="px-5 py-10 text-center text-sm" :class="thm.textFaint">No active paid subscribers yet.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr :class="[thm.borderB,'text-left']">
              <th v-for="h in ['User','Plan','Billing','Started','Expires','Days Left','₹/mo']" :key="h" class="px-4 py-3 text-xs font-medium" :class="thm.textFaint">{{ h }}</th>
            </tr></thead>
            <tbody :class="thm.divide">
              <tr v-for="u in subscriptions.subscribers" :key="u._id" :class="['transition', thm.rowHover]">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div :class="['w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0', thm.avatar]">{{ initials(u.name) }}</div>
                    <div><p class="font-medium leading-none" :class="thm.text">{{ u.name }}</p><p class="text-xs mt-0.5" :class="thm.textFaint">{{ u.email }}</p></div>
                  </div>
                </td>
                <td class="px-4 py-3"><span :class="['text-xs px-2 py-1 rounded-full font-medium capitalize', planBadgeClass(u.plan, isDark)]">{{ u.plan }}</span></td>
                <td class="px-4 py-3 capitalize text-xs" :class="thm.textMuted">{{ u.planBillingCycle||'monthly' }}</td>
                <td class="px-4 py-3 text-xs" :class="thm.textFaint">{{ fmtDateShort(u.planStartDate) }}</td>
                <td class="px-4 py-3 text-xs" :class="thm.textFaint">{{ fmtDateShort(u.planExpiresAt) }}</td>
                <td class="px-4 py-3">
                  <span :class="['text-xs font-mono font-bold', daysLeft(u.planExpiresAt)<=7?'text-orange-400':'text-emerald-400']">{{ daysLeft(u.planExpiresAt) }}d</span>
                </td>
                <td class="px-4 py-3 text-xs font-mono font-semibold" :class="thm.text">₹{{ subMonthlyValue(u) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Churned -->
      <div v-if="subscriptions.churned.length" :class="[thm.card, 'overflow-hidden']">
        <div :class="['flex items-center justify-between px-5 py-4', thm.borderB]">
          <h3 class="font-semibold" :class="thm.text">Recently Churned</h3>
          <span :class="['text-xs px-2 py-1 rounded-full', isDark?'bg-orange-900/40 text-orange-400':'bg-orange-100 text-orange-600']">{{ subscriptions.churned.length }} expired</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr :class="[thm.borderB,'text-left']">
              <th v-for="h in ['User','Was On','Billing','Expired','Days Ago']" :key="h" class="px-4 py-3 text-xs font-medium" :class="thm.textFaint">{{ h }}</th>
            </tr></thead>
            <tbody :class="thm.divide">
              <tr v-for="u in subscriptions.churned" :key="u._id" :class="['transition', thm.rowHover]">
                <td class="px-4 py-3"><p class="font-medium leading-none" :class="thm.text">{{ u.name }}</p><p class="text-xs mt-0.5" :class="thm.textFaint">{{ u.email }}</p></td>
                <td class="px-4 py-3"><span :class="['text-xs px-2 py-1 rounded-full capitalize', isDark?'bg-gray-800 text-gray-400':'bg-gray-100 text-gray-500']">{{ u.plan }}</span></td>
                <td class="px-4 py-3 capitalize text-xs" :class="thm.textMuted">{{ u.planBillingCycle||'monthly' }}</td>
                <td class="px-4 py-3 text-xs" :class="thm.textFaint">{{ fmtDateShort(u.planExpiresAt) }}</td>
                <td class="px-4 py-3 text-xs text-orange-400 font-mono">{{ Math.abs(daysLeft(u.planExpiresAt)) }}d ago</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Free users -->
      <div :class="[thm.card, 'overflow-hidden']">
        <div :class="['flex items-center justify-between px-5 py-4', thm.borderB]">
          <div>
            <h3 class="font-semibold" :class="thm.text">Free Plan Users</h3>
            <p class="text-xs mt-0.5" :class="thm.textFaint">Conversion opportunities · showing latest 50</p>
          </div>
          <span :class="['text-xs px-2 py-1 rounded-full', isDark?'bg-gray-800 text-gray-400':'bg-gray-100 text-gray-500']">{{ subscriptions.stats.freeUsers }} total</span>
        </div>
        <div v-if="!subscriptions.freeUsersList.length" class="px-5 py-10 text-center text-sm" :class="thm.textFaint">No free users.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr :class="[thm.borderB,'text-left']">
              <th v-for="h in ['User','Verified','Joined']" :key="h" class="px-4 py-3 text-xs font-medium" :class="thm.textFaint">{{ h }}</th>
            </tr></thead>
            <tbody :class="thm.divide">
              <tr v-for="u in subscriptions.freeUsersList" :key="u._id" :class="['transition', thm.rowHover]">
                <td class="px-4 py-3"><p class="font-medium leading-none" :class="thm.text">{{ u.name }}</p><p class="text-xs mt-0.5" :class="thm.textFaint">{{ u.email }}</p></td>
                <td class="px-4 py-3">
                  <span :class="['text-xs px-2 py-1 rounded-full font-medium', u.isVerified?(isDark?'bg-green-900/50 text-green-400':'bg-green-100 text-green-700'):(isDark?'bg-yellow-900/50 text-yellow-400':'bg-yellow-100 text-yellow-700')]">
                    {{ u.isVerified?'✓ Verified':'Unverified' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-xs" :class="thm.textFaint">{{ fmtDateShort(u.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
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
import { initials, fmtDateShort, planBadgeClass, daysLeft } from '../../components/admin/format.js';

const { isDark } = useTheme();
const thm = useAdminTheme(isDark);
const error = ref('');

const subscriptions = ref(null);
const subsLoading = ref(false);

async function loadSubscriptions() {
  subsLoading.value = true;
  try { subscriptions.value = await adminApi.getSubscriptions(); }
  catch (e) { error.value = e.message || 'Failed to load subscriptions'; }
  finally { subsLoading.value = false; }
}

function planPct(count) {
  const total = subscriptions.value?.stats?.totalUsers || 1;
  return Math.round((count / total) * 100);
}

function subMonthlyValue(u) {
  const PRICES = { pro_monthly: 749, pro_annual: 625, team_monthly: 1999, team_annual: 1667 };
  return (PRICES[`${u.plan}_${u.planBillingCycle || 'monthly'}`] || 0).toLocaleString('en-IN');
}

onMounted(loadSubscriptions);
</script>

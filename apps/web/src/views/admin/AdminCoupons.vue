<template>
  <div class="space-y-5">
    <div v-if="error" class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl">{{ error }}</div>

    <!-- Create form -->
    <div :class="[thm.card, 'p-5']">
      <h2 class="font-semibold mb-4" :class="thm.text">Create Coupon</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label class="text-xs mb-1 block" :class="thm.textFaint">Code *</label>
          <input v-model="couponForm.code" placeholder="LAUNCH20" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" />
        </div>
        <div>
          <label class="text-xs mb-1 block" :class="thm.textFaint">Type *</label>
          <CustomSelect v-model="couponForm.discountType" :options="discountTypeOptions" aria-label="Discount type" class="w-full" />
        </div>
        <div>
          <label class="text-xs mb-1 block" :class="thm.textFaint">Value * {{ couponForm.discountType === 'percent' ? '(%)' : '(paise)' }}</label>
          <input v-model="couponForm.discountValue" type="number" placeholder="20" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" />
        </div>
        <div>
          <label class="text-xs mb-1 block" :class="thm.textFaint">Plans (comma-separated, empty=all)</label>
          <input v-model="couponForm.applicablePlans" placeholder="pro_monthly,pro_annual" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" />
        </div>
        <div>
          <label class="text-xs mb-1 block" :class="thm.textFaint">Max Uses (empty=unlimited)</label>
          <input v-model="couponForm.maxUses" type="number" placeholder="100" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" />
        </div>
        <div>
          <label class="text-xs mb-1 block" :class="thm.textFaint">Expires At (empty=never)</label>
          <input v-model="couponForm.expiresAt" type="date" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" />
        </div>
      </div>
      <div v-if="couponFormError" class="text-red-400 text-xs mb-3">{{ couponFormError }}</div>
      <button @click="createCoupon" :disabled="couponSaving" class="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition disabled:opacity-50">
        {{ couponSaving ? 'Creating…' : 'Create Coupon' }}
      </button>
    </div>

    <!-- Coupons list -->
    <div :class="[thm.card, 'overflow-hidden']">
      <div :class="['px-5 py-4 flex items-center justify-between', thm.borderB]">
        <h2 class="font-semibold" :class="thm.text">All Coupons</h2>
        <span class="text-xs" :class="thm.textFaint">{{ coupons.length }} total</span>
      </div>
      <div v-if="couponsLoading" class="p-6 text-center text-sm" :class="thm.textFaint">Loading…</div>
      <div v-else-if="!coupons.length" class="p-6 text-center text-sm" :class="thm.textFaint">No coupons yet.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr :class="[thm.borderB, 'text-left']">
            <th v-for="h in ['Code','Type','Value','Plans','Uses','Expires','Status','']" :key="h" class="px-4 py-3 text-xs font-medium" :class="thm.textFaint">{{ h }}</th>
          </tr></thead>
          <tbody :class="thm.divide">
            <tr v-for="c in coupons" :key="c._id" :class="['transition', thm.rowHover]">
              <td class="px-4 py-3 font-mono font-bold" :class="thm.text">{{ c.code }}</td>
              <td class="px-4 py-3" :class="thm.textMuted">{{ c.discountType }}</td>
              <td class="px-4 py-3 font-semibold text-emerald-400">{{ c.discountType === 'percent' ? c.discountValue + '%' : '₹' + (c.discountValue / 100) }}</td>
              <td class="px-4 py-3 text-xs" :class="thm.textMuted">{{ c.applicablePlans.length ? c.applicablePlans.join(', ') : 'All' }}</td>
              <td class="px-4 py-3" :class="thm.textMuted">{{ c.usedCount }}<span class="text-xs ml-0.5">{{ c.maxUses !== null ? '/' + c.maxUses : '' }}</span></td>
              <td class="px-4 py-3 text-xs" :class="thm.textMuted">{{ c.expiresAt ? fmtDateShort(c.expiresAt) : '—' }}</td>
              <td class="px-4 py-3">
                <span :class="['text-xs px-2 py-0.5 rounded-full font-medium', c.isActive ? (isDark?'bg-green-900/50 text-green-400':'bg-green-100 text-green-700') : (isDark?'bg-gray-800 text-gray-400':'bg-gray-100 text-gray-500')]">
                  {{ c.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button @click="toggleCoupon(c)" :class="thm.btn">{{ c.isActive ? 'Disable' : 'Enable' }}</button>
                  <button @click="deleteCoupon(c)" class="px-3 py-1.5 text-xs rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { couponsApi } from '@/api';
import { useTheme } from '../../composables/useTheme';
import { useAdminTheme } from '../../components/admin/theme.js';
import { fmtDateShort } from '../../components/admin/format.js';
import CustomSelect from '../../components/ui/CustomSelect.vue';

const { isDark } = useTheme();
const thm = useAdminTheme(isDark);
const error = ref('');

const discountTypeOptions = [
  { value: 'percent', label: 'Percent (%)' },
  { value: 'flat', label: 'Flat (₹ paise)' },
];

const coupons = ref([]);
const couponsLoading = ref(false);
const couponForm = ref({ code: '', discountType: 'percent', discountValue: '', applicablePlans: '', maxUses: '', expiresAt: '' });
const couponFormError = ref('');
const couponSaving = ref(false);

async function loadCoupons() {
  couponsLoading.value = true;
  try { const d = await couponsApi.getAll(); coupons.value = d.coupons; }
  catch (e) { error.value = e.message || 'Failed to load coupons'; }
  finally { couponsLoading.value = false; }
}

async function createCoupon() {
  couponFormError.value = '';
  const f = couponForm.value;
  if (!f.code || !f.discountValue) { couponFormError.value = 'Code and discount value are required.'; return; }
  couponSaving.value = true;
  try {
    await couponsApi.create({
      code: f.code,
      discountType: f.discountType,
      discountValue: Number(f.discountValue),
      applicablePlans: f.applicablePlans ? f.applicablePlans.split(',').map(s => s.trim()).filter(Boolean) : [],
      maxUses: f.maxUses ? Number(f.maxUses) : null,
      expiresAt: f.expiresAt || null,
    });
    couponForm.value = { code: '', discountType: 'percent', discountValue: '', applicablePlans: '', maxUses: '', expiresAt: '' };
    await loadCoupons();
  } catch (e) { couponFormError.value = e.message || 'Failed to create coupon'; }
  finally { couponSaving.value = false; }
}

async function toggleCoupon(c) {
  try { await couponsApi.update(c._id, { isActive: !c.isActive }); await loadCoupons(); }
  catch (e) { error.value = e.message || 'Failed to update coupon'; }
}

async function deleteCoupon(c) {
  if (!confirm(`Delete coupon "${c.code}"?`)) return;
  try { await couponsApi.remove(c._id); await loadCoupons(); }
  catch (e) { error.value = e.message || 'Failed to delete coupon'; }
}

onMounted(loadCoupons);
</script>

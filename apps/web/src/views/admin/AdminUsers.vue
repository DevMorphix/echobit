<template>
  <div class="space-y-4">
    <div v-if="error" class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl">{{ error }}</div>

    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <input v-model="userSearch" @input="debouncedUserSearch" type="text" placeholder="Search name or email…"
        :class="['w-full sm:w-72 px-4 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition', thm.input]"/>
      <span class="text-sm" :class="thm.textFaint">{{ userTotal }} users</span>
    </div>
    <div :class="[thm.card, 'overflow-hidden']">
      <div v-if="usersLoading" class="p-5 space-y-3">
        <div v-for="i in 5" :key="i" :class="['h-12 rounded-xl', thm.skeleton]"></div>
      </div>
      <div v-else-if="!users.length" class="px-5 py-10 text-center text-sm" :class="thm.textFaint">No users found.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr :class="[thm.borderB, 'text-left']">
            <th v-for="h in ['User','Status','Privacy','Plan','Recordings','Joined','Actions']" :key="h" class="px-4 py-3 text-xs font-medium" :class="thm.textFaint">{{ h }}</th>
          </tr></thead>
          <tbody :class="thm.divide">
            <tr v-for="u in users" :key="u._id" :class="['transition cursor-pointer', thm.rowHover]" @click="openUser(u)">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div :class="['w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0', thm.avatar]">{{ initials(u.name) }}</div>
                  <div><p class="font-medium leading-none" :class="thm.text">{{ u.name }}</p><p class="text-xs mt-0.5" :class="thm.textFaint">{{ u.email }}</p></div>
                </div>
              </td>
              <td class="px-4 py-3"><span :class="['text-xs px-2 py-1 rounded-full font-medium', u.isVerified?(isDark?'bg-green-900/50 text-green-400':'bg-green-100 text-green-700'):(isDark?'bg-yellow-900/50 text-yellow-400':'bg-yellow-100 text-yellow-700')]">{{ u.isVerified?'Verified':'Unverified' }}</span></td>
              <td class="px-4 py-3"><span :class="['text-xs px-2 py-1 rounded-full font-medium', u.privacyAccepted?(isDark?'bg-blue-900/50 text-blue-400':'bg-blue-100 text-blue-700'):(isDark?'bg-red-900/50 text-red-400':'bg-red-100 text-red-700')]">{{ u.privacyAccepted?'Accepted':'Pending' }}</span></td>
              <td class="px-4 py-3"><span :class="['text-xs px-2 py-1 rounded-full font-medium capitalize', planBadgeClass(u.plan, isDark)]">{{ u.plan||'free' }}</span></td>
              <td class="px-4 py-3" :class="thm.textMuted">{{ u.recordingCount }}</td>
              <td class="px-4 py-3 text-xs" :class="thm.textFaint">{{ fmtDate(u.createdAt) }}</td>
              <td class="px-4 py-3" @click.stop>
                <button @click="confirmDeleteUser(u)" :class="['text-xs px-2.5 py-1 rounded-lg transition', isDark?'bg-red-900/40 text-red-400 hover:bg-red-800/60':'bg-red-100 text-red-600 hover:bg-red-200']">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="userPages>1" :class="['flex items-center justify-between px-4 py-3', thm.borderT]">
        <button @click="userPage--;loadUsers()" :disabled="userPage<=1" :class="thm.btn">← Prev</button>
        <span class="text-xs" :class="thm.textFaint">Page {{ userPage }} / {{ userPages }}</span>
        <button @click="userPage++;loadUsers()" :disabled="userPage>=userPages" :class="thm.btn">Next →</button>
      </div>
    </div>

    <!-- User detail drawer -->
    <transition name="drawer">
      <div v-if="selectedUser" class="fixed inset-0 z-50 flex justify-end" @click.self="selectedUser=null">
        <div :class="['w-full max-w-md h-full overflow-y-auto shadow-2xl', thm.drawer]">
          <div :class="['flex items-center justify-between px-5 py-4 sticky top-0 z-10', thm.borderB, isDark?'bg-gray-900':'bg-white']">
            <h3 class="font-semibold" :class="thm.text">User Detail</h3>
            <button @click="selectedUser=null" class="text-xl leading-none" :class="thm.textMuted">×</button>
          </div>
          <div class="p-5 space-y-5">
            <div class="flex items-center gap-4">
              <div :class="['w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold', thm.avatar]">{{ initials(selectedUser.user.name) }}</div>
              <div>
                <p class="font-bold text-lg leading-none" :class="thm.text">{{ selectedUser.user.name }}</p>
                <p class="text-sm mt-1" :class="thm.textMuted">{{ selectedUser.user.email }}</p>
                <div class="flex gap-2 mt-2 flex-wrap">
                  <span :class="['text-xs px-2 py-0.5 rounded-full', selectedUser.user.isVerified?(isDark?'bg-green-900/50 text-green-400':'bg-green-100 text-green-700'):(isDark?'bg-yellow-900/50 text-yellow-400':'bg-yellow-100 text-yellow-700')]">{{ selectedUser.user.isVerified?'Verified':'Unverified' }}</span>
                  <span :class="['text-xs px-2 py-0.5 rounded-full', selectedUser.user.privacyAccepted?(isDark?'bg-blue-900/50 text-blue-400':'bg-blue-100 text-blue-700'):(isDark?'bg-red-900/50 text-red-400':'bg-red-100 text-red-700')]">{{ selectedUser.user.privacyAccepted?'Privacy ✓':'No consent' }}</span>
                  <span v-if="selectedUser.user.googleId" :class="['text-xs px-2 py-0.5 rounded-full', isDark?'bg-orange-900/50 text-orange-400':'bg-orange-100 text-orange-700']">Google</span>
                  <span :class="['text-xs px-2 py-0.5 rounded-full capitalize', planBadgeClass(selectedUser.user.plan, isDark)]">{{ selectedUser.user.plan||'free' }}</span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <DetailRow :dark="isDark" label="Joined" :value="fmtDate(selectedUser.user.createdAt)"/>
              <DetailRow :dark="isDark" label="Role" :value="selectedUser.user.role||'user'"/>
              <DetailRow :dark="isDark" label="Plan" :value="selectedUser.user.plan||'free'"/>
              <DetailRow :dark="isDark" label="Expires" :value="selectedUser.user.planExpiresAt?fmtDateShort(selectedUser.user.planExpiresAt):'—'"/>
              <DetailRow :dark="isDark" label="Privacy Date" :value="selectedUser.user.privacyAcceptedAt?fmtDateShort(selectedUser.user.privacyAcceptedAt):'—'"/>
              <DetailRow :dark="isDark" label="Recordings" :value="String(selectedUser.recordings.length)"/>
            </div>

            <div>
              <h4 class="text-sm font-semibold mb-1" :class="thm.textMuted">
                Feature Overrides
                <span class="font-normal text-xs" :class="thm.textFaint"> — overrides plan for this user</span>
              </h4>
              <div class="space-y-1.5">
                <div v-for="f in overrideFields" :key="f.key"
                     :class="[thm.cardInner, 'px-4 py-2.5 flex items-center justify-between gap-3']">
                  <span class="text-sm" :class="thm.text">{{ f.label }}</span>
                  <CustomSelect
                    :model-value="selectedUser.user.featureOverrides?.[f.key] == null ? 'default' : String(selectedUser.user.featureOverrides[f.key])"
                    :options="overrideOptions"
                    :disabled="overrideSaving"
                    aria-label="Feature override"
                    class="w-40 shrink-0"
                    @update:model-value="applyOverride(f.key, $event)"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 class="text-sm font-semibold mb-3" :class="thm.textMuted">Recordings (last 20)</h4>
              <div v-if="!selectedUser.recordings.length" class="text-sm" :class="thm.textFaint">No recordings.</div>
              <ul v-else class="space-y-2">
                <li v-for="r in selectedUser.recordings" :key="r._id" :class="[thm.cardInner, 'px-4 py-3 flex items-center gap-3']">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm truncate" :class="thm.text">{{ r.title }}</p>
                    <p class="text-xs mt-0.5" :class="thm.textFaint">{{ fmtDuration(r.duration) }} · {{ fmtDate(r.createdAt) }}</p>
                  </div>
                  <span :class="['text-xs px-2 py-0.5 rounded-full', statusClass(r.status, isDark)]">{{ r.status }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Delete modal -->
    <div v-if="deleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" @click.self="deleteConfirm=null">
      <div :class="[thm.modal, 'rounded-2xl p-6 w-full max-w-sm shadow-2xl']">
        <h3 class="font-bold text-lg mb-2" :class="thm.text">Delete User?</h3>
        <p class="text-sm mb-5" :class="thm.textMuted">Permanently deletes <strong :class="thm.text">{{ deleteConfirm.name }}</strong> and all their recordings.</p>
        <div class="flex gap-3">
          <button @click="deleteConfirm=null" :class="['flex-1 py-2.5 rounded-xl text-sm font-medium transition', isDark?'bg-gray-800 text-gray-300 hover:bg-gray-700':'bg-gray-100 text-gray-700 hover:bg-gray-200']">Cancel</button>
          <button @click="executeDeleteUser" :disabled="deleteLoading" class="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition disabled:opacity-50">{{ deleteLoading?'Deleting…':'Delete' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { adminApi } from '@/api';
import { useTheme } from '../../composables/useTheme';
import { useAdminTheme } from '../../components/admin/theme.js';
import { DetailRow } from '../../components/admin/widgets.js';
import { initials, fmtDate, fmtDateShort, fmtDuration, planBadgeClass, statusClass } from '../../components/admin/format.js';
import CustomSelect from '../../components/ui/CustomSelect.vue';

const { isDark } = useTheme();
const thm = useAdminTheme(isDark);
const error = ref('');

const overrideOptions = [
  { value: 'default', label: 'Default (plan)' },
  { value: 'true', label: 'Force ON' },
  { value: 'false', label: 'Force OFF' },
];
const overrideFields = [
  { key: 'meetingMinutes',  label: 'Meeting Minutes'  },
  { key: 'actionItems',     label: 'Action Items'     },
  { key: 'pdfExport',       label: 'PDF Export'       },
  { key: 'indianLanguages', label: 'Indian Languages' },
];

const users = ref([]);
const usersLoading = ref(false);
const userSearch = ref('');
const userPage = ref(1);
const userTotal = ref(0);
const userPages = ref(1);
let userSearchTimer = null;

async function loadUsers() {
  usersLoading.value = true;
  try {
    const d = await adminApi.getUsers(userPage.value, userSearch.value);
    users.value = d.users; userTotal.value = d.total; userPages.value = d.pages;
  } catch (e) { error.value = e.message || 'Failed to load users'; }
  finally { usersLoading.value = false; }
}

function debouncedUserSearch() {
  userPage.value = 1;
  clearTimeout(userSearchTimer);
  userSearchTimer = setTimeout(loadUsers, 350);
}

const selectedUser = ref(null);
async function openUser(u) {
  selectedUser.value = { user: u, recordings: [] };
  try { selectedUser.value = await adminApi.getUser(u._id); } catch {}
}

const overrideSaving = ref(false);
async function applyOverride(field, rawValue) {
  if (!selectedUser.value) return;
  const value = rawValue === 'default' ? null : rawValue === 'true';
  overrideSaving.value = true;
  try {
    const { user } = await adminApi.updateUserOverrides(selectedUser.value.user._id, { [field]: value });
    if (!selectedUser.value.user.featureOverrides) selectedUser.value.user.featureOverrides = {};
    selectedUser.value.user.featureOverrides[field] = user.featureOverrides?.[field] ?? null;
  } catch (e) {
    error.value = 'Failed to save feature override';
  } finally {
    overrideSaving.value = false;
  }
}

const deleteConfirm = ref(null);
const deleteLoading = ref(false);
function confirmDeleteUser(u) { deleteConfirm.value = u; }
async function executeDeleteUser() {
  if (!deleteConfirm.value) return;
  deleteLoading.value = true;
  try {
    await adminApi.deleteUser(deleteConfirm.value._id);
    users.value = users.value.filter(u => u._id !== deleteConfirm.value._id);
    userTotal.value--;
    if (selectedUser.value?.user?._id === deleteConfirm.value._id) selectedUser.value = null;
    deleteConfirm.value = null;
  } catch (e) { error.value = e.message || 'Failed to delete user'; }
  finally { deleteLoading.value = false; }
}

onMounted(loadUsers);
</script>

<style scoped>
.drawer-enter-active, .drawer-leave-active { transition: opacity 0.25s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
</style>

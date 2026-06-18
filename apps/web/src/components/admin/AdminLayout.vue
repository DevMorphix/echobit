<template>
  <!-- Access gate: the whole admin surface sits behind Cloudflare Access. We
       confirm the Access identity before rendering anything sensitive. -->
  <div v-if="gate !== 'ok'" :class="['min-h-screen flex items-center justify-center px-4', thm.rootBg]">
    <div :class="[thm.card, 'max-w-md w-full p-8 text-center']">
      <template v-if="gate === 'checking'">
        <div class="w-10 h-10 mx-auto mb-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
        <p :class="thm.textMuted">Verifying access…</p>
      </template>
      <template v-else>
        <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        </div>
        <h1 class="text-xl font-bold mb-2" :class="thm.text">{{ gateTitle }}</h1>
        <p class="text-sm mb-6" :class="thm.textMuted">{{ gateMessage }}</p>
        <router-link to="/dashboard" :class="['inline-block px-5 py-2.5 rounded-xl text-sm font-semibold transition', thm.btn]">← Back to app</router-link>
      </template>
    </div>
  </div>

  <div v-else :class="['flex h-screen overflow-hidden', thm.rootBg]">
    <!-- Sidebar -->
    <aside :class="['flex flex-col w-56 shrink-0 overflow-y-auto', thm.sidebar]">
      <div :class="['flex items-center gap-3 px-4 py-5', thm.borderB]">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-sm shrink-0">A</div>
        <div class="min-w-0">
          <p class="text-sm font-bold leading-none" :class="thm.text">Admin</p>
          <p class="text-xs mt-0.5 truncate" :class="thm.textFaint">{{ adminEmail }}</p>
        </div>
      </div>

      <nav class="flex-1 p-3 space-y-1">
        <router-link v-for="item in nav" :key="item.to" :to="item.to"
          :class="['w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition', route.path === item.to ? thm.sidebarActive : thm.sidebarItem]">
          <span class="w-5 h-5 shrink-0" v-html="item.icon"></span>
          {{ item.label }}
        </router-link>
      </nav>

      <div :class="['p-3 space-y-1', thm.borderT]">
        <button @click="toggleTheme()" :class="['w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition', thm.sidebarItem]">
          <svg v-if="isDark" class="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>
          </svg>
          <svg v-else class="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
          </svg>
          {{ isDark ? 'Light mode' : 'Dark mode' }}
        </button>
        <router-link to="/dashboard" :class="['flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition', thm.sidebarItem]">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to app
        </router-link>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-y-auto">
      <div class="max-w-5xl mx-auto px-6 py-6">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { adminApi } from '@/api';
import { useTheme } from '../../composables/useTheme';
import { useAdminTheme } from './theme.js';

const route = useRoute();
const { isDark, toggle: toggleTheme } = useTheme();
const thm = useAdminTheme(isDark);

const nav = [
  { to: '/admin/overview',    label: 'Overview',    icon: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>' },
  { to: '/admin/users',       label: 'Users',       icon: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4.13a4 4 0 11-8 0 4 4 0 018 0zm6 4a4 4 0 00-3-3.87"/></svg>' },
  { to: '/admin/recordings',  label: 'Recordings',  icon: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>' },
  { to: '/admin/analytics',   label: 'Analytics',   icon: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>' },
  { to: '/admin/financials',  label: 'Financials',  icon: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' },
  { to: '/admin/revenue',     label: 'Revenue',     icon: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>' },
  { to: '/admin/coupons',     label: 'Coupons',     icon: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>' },
  { to: '/admin/plans',       label: 'Plans',       icon: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>' },
];

const gate = ref('checking'); // checking | ok | login | denied | unconfigured | error
const adminEmail = ref('');

const gateTitle = computed(() => ({
  login: 'Sign in required',
  denied: 'Access denied',
  unconfigured: 'Admin not configured',
  error: 'Something went wrong',
}[gate.value] || 'Access denied'));

const gateMessage = computed(() => ({
  login: 'This area is protected by Cloudflare Access. Sign in through Access to continue.',
  denied: 'Your account is not on the admin allowlist.',
  unconfigured: 'Cloudflare Access is not set up for the admin surface yet.',
  error: 'Could not verify admin access. Please try again.',
}[gate.value] || 'You are not authorized to view this page.'));

onMounted(async () => {
  try {
    const { email } = await adminApi.getMe();
    adminEmail.value = email;
    gate.value = 'ok';
  } catch (e) {
    gate.value = e.status === 401 ? 'login' : e.status === 403 ? 'denied' : e.status === 503 ? 'unconfigured' : 'error';
  }
});
</script>

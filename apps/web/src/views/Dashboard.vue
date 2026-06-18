<template>
  <div class="min-h-screen bg-canvas text-content">
    <!-- Mobile Header -->
    <header class="lg:hidden fixed top-0 left-0 right-0 h-16 bg-surface border-b border-line z-30 px-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <img src="/favicon.png" alt="Echobit" class="w-8 h-8 rounded-lg object-contain" />
        <span class="text-lg font-bold">Echobit</span>
      </div>
      <div class="flex items-center gap-1">
        <ThemeToggle />
        <button
          @click="mobileMenuOpen = !mobileMenuOpen"
          :aria-label="mobileMenuOpen ? 'Close menu' : 'Open menu'"
          :aria-expanded="mobileMenuOpen"
          class="p-2 rounded-lg text-muted hover:text-content hover:bg-surface-2 transition"
        >
          <svg v-if="!mobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Mobile Menu Overlay -->
    <div
      v-if="mobileMenuOpen"
      class="lg:hidden fixed inset-0 bg-black/50 z-40"
      @click="mobileMenuOpen = false"
    ></div>

    <!-- Mobile Sidebar -->
    <aside
      :class="[
        'lg:hidden fixed top-0 right-0 bottom-0 w-72 bg-surface border-l border-line z-50 flex flex-col transform transition-transform duration-300',
        mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
      ]"
    >
      <div class="p-4 border-b border-line flex justify-between items-center">
        <span class="font-bold">Menu</span>
        <button @click="mobileMenuOpen = false" aria-label="Close menu" class="p-2 rounded-lg text-muted hover:text-content hover:bg-surface-2 transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav class="p-4 space-y-1 flex-1 overflow-y-auto">
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          @click="mobileMenuOpen = false"
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition"
          :class="isActive(link) ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:bg-surface-2 hover:text-content'"
        >
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="link.icon" />
          </svg>
          <span class="font-medium">{{ link.label }}</span>
        </router-link>

        <!-- Plan / Upgrade row -->
        <router-link v-if="!isPaid" to="/upgrade" @click="mobileMenuOpen = false"
          class="flex items-center gap-3 px-4 py-3 rounded-xl text-primary hover:bg-primary/10 transition">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span class="font-medium">Upgrade</span>
          <span class="ml-auto text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-semibold">Pro</span>
        </router-link>
        <div v-else class="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 text-primary">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-medium">{{ planLabel }} Plan</span>
          <span class="ml-auto text-xs bg-primary text-primary-fg px-2 py-0.5 rounded-full font-semibold">Active</span>
        </div>
      </nav>

      <div class="px-4 pb-3">
        <router-link v-if="!isPaid" to="/upgrade" @click="mobileMenuOpen = false"
          class="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-400 hover:to-green-400 transition shadow-md shadow-emerald-500/20">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div>
            <p class="text-sm font-semibold leading-none">Upgrade to Pro</p>
            <p class="text-xs text-white/70 mt-0.5">Unlock all features</p>
          </div>
        </router-link>
        <div v-else class="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
          <svg class="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div>
            <p class="text-sm font-semibold text-primary leading-none">{{ planLabel }} Plan Active</p>
            <p class="text-xs text-muted mt-0.5">{{ subscription.daysRemaining }}d remaining</p>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-line">
        <div class="flex items-center gap-3 px-1">
          <div :class="isPaid ? 'shrink-0 ring-2 ring-primary rounded-full' : 'shrink-0'">
            <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">{{ userInitials }}</div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ userName }}</p>
            <p class="text-xs text-muted truncate">{{ userEmail }}</p>
          </div>
          <button @click="handleLogout" aria-label="Log out" class="p-2 rounded-lg text-muted hover:text-content hover:bg-surface-2 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Desktop Sidebar -->
    <aside class="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-surface border-r border-line z-20">
      <div class="p-6">
        <router-link to="/dashboard" class="flex items-center gap-2">
          <img src="/favicon.png" alt="Echobit" class="w-10 h-10 rounded-xl object-contain" />
          <span class="text-xl font-bold">Echobit</span>
        </router-link>
      </div>

      <nav class="px-4 space-y-1 flex-1 overflow-y-auto">
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition"
          :class="isActive(link) ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:bg-surface-2 hover:text-content'"
        >
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="link.icon" />
          </svg>
          <span class="font-medium">{{ link.label }}</span>
        </router-link>

        <router-link v-if="!isPaid" to="/upgrade"
          class="flex items-center gap-3 px-4 py-3 rounded-xl text-primary hover:bg-primary/10 transition">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span class="font-medium">Upgrade</span>
          <span class="ml-auto text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-semibold">Pro</span>
        </router-link>
        <div v-else class="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 text-primary">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-medium">{{ planLabel }} Plan</span>
          <span class="ml-auto text-xs bg-primary text-primary-fg px-2 py-0.5 rounded-full font-semibold">Active</span>
        </div>
      </nav>

      <div class="px-4 pb-3">
        <router-link v-if="!isPaid" to="/upgrade"
          class="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-400 hover:to-green-400 transition shadow-md shadow-emerald-500/20">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div>
            <p class="text-sm font-semibold leading-none">Upgrade to Pro</p>
            <p class="text-xs text-white/70 mt-0.5">Unlock all features</p>
          </div>
        </router-link>
        <div v-else class="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
          <svg class="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div>
            <p class="text-sm font-semibold text-primary leading-none">{{ planLabel }} Plan Active</p>
            <p class="text-xs text-muted mt-0.5">{{ subscription.daysRemaining }}d remaining</p>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-line">
        <div class="flex items-center gap-3 px-1">
          <div :class="isPaid ? 'shrink-0 ring-2 ring-primary rounded-full' : 'shrink-0'">
            <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold">{{ userInitials }}</div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ userName }}</p>
            <p class="text-xs text-muted truncate">{{ userEmail }}</p>
          </div>
          <ThemeToggle />
          <button @click="handleLogout" aria-label="Log out" class="p-2 rounded-lg text-muted hover:text-content hover:bg-surface-2 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="pt-16 lg:pt-0 lg:ml-64 p-4 sm:p-6 lg:p-8 min-h-screen">
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { authState, authApi, paymentsApi } from '../api';
import ThemeToggle from '../components/ui/ThemeToggle.vue';

const router = useRouter();
const route = useRoute();
const mobileMenuOpen = ref(false);

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/dashboard/record', label: 'New Recording', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
  { to: '/dashboard/recordings', label: 'My Recordings', match: '/recordings', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
];

function isActive(link) {
  if (link.match) return route.path.includes(link.match);
  return route.path === link.to;
}

const userName = computed(() => authState.user?.name || 'User');
const userEmail = computed(() => authState.user?.email || '');
const userInitials = computed(() => {
  const name = authState.user?.name || 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
});

function buildSubFromUser(user) {
  if (!user?.plan) return null;
  const exp = user.planExpiresAt;
  const active = user.plan !== 'free' && exp && new Date(exp) > new Date();
  return {
    plan: user.plan || 'free',
    isActive: !!active,
    daysRemaining: active ? Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000) : 0,
  };
}

const subscription = ref(
  buildSubFromUser(authState.user) ?? { plan: 'free', isActive: false, daysRemaining: 0 }
);
const isPaid = computed(() => subscription.value.plan !== 'free' && subscription.value.isActive);
const planLabel = computed(() => {
  const labels = { free: 'Free', starter: 'Starter', pro: 'Pro', growth: 'Growth', team: 'Team' };
  return labels[subscription.value.plan] || 'Free';
});

onMounted(async () => {
  try {
    subscription.value = await paymentsApi.getStatus();
  } catch { /* keep cached value */ }
});

const handleLogout = () => {
  authApi.logout();
  router.push('/');
};
</script>

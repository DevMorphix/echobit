<template>
  <div class="min-h-screen bg-gradient-to-br from-black via-gray-900 to-emerald-950 flex items-center justify-center px-4 py-8">
    <div class="max-w-md w-full">
      <!-- Logo -->
      <div class="text-center mb-8">
        <router-link to="/" class="inline-flex items-center space-x-2">
          <img src="/favicon.png" alt="Echobit" class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-contain" />
          <span class="text-2xl sm:text-3xl font-bold text-white">Echobit</span>
        </router-link>
        <p class="text-white/50 text-sm mt-2">Record. Transcribe. Understand.</p>
      </div>

      <!-- Login Card -->
      <div class="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
        <h2 class="text-xl sm:text-2xl font-bold text-white mb-1">Welcome back</h2>
        <p class="text-white/50 mb-6 text-sm">Sign in to access your recordings</p>

        <!-- Google Button -->
        <button
          type="button"
          @click="handleGoogleLogin"
          :disabled="googleLoading || loading"
          class="w-full flex items-center justify-center gap-3 bg-white text-gray-800 py-3.5 rounded-2xl font-semibold text-sm sm:text-base hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg mb-5"
        >
          <svg v-if="!googleLoading" class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <svg v-else class="animate-spin w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span>{{ googleLoading ? 'Signing in...' : 'Continue with Google' }}</span>
        </button>

        <!-- Divider -->
        <div class="flex items-center gap-3 mb-5">
          <div class="flex-1 h-px bg-white/10"></div>
          <span class="text-white/30 text-xs font-medium">or use email</span>
          <div class="flex-1 h-px bg-white/10"></div>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-white/70 text-sm font-medium mb-1.5">Email</label>
            <input
              v-model="email"
              type="email"
              required
              :disabled="loading || googleLoading"
              class="w-full px-4 py-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm sm:text-base disabled:opacity-50"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-white/70 text-sm font-medium">Password</label>
              <router-link to="/forgot-password" class="text-emerald-400 hover:text-emerald-300 text-xs transition">Forgot password?</router-link>
            </div>
            <input
              v-model="password"
              type="password"
              required
              :disabled="loading || googleLoading"
              class="w-full px-4 py-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm sm:text-base disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          <div v-if="error" class="flex items-center gap-2 bg-red-500/15 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading || googleLoading"
            class="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3.5 rounded-2xl font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base shadow-lg shadow-emerald-900/40"
          >
            <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
          </button>
        </form>

        <p class="text-center text-white/50 text-sm mt-6">
          Don't have an account?
          <router-link to="/register" class="text-emerald-400 hover:text-emerald-300 font-semibold transition ml-1">Sign up</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authApi } from '../api';

const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const googleLoading = ref(false);
const error = ref('');

const handleLogin = async () => {
  error.value = '';
  loading.value = true;
  try {
    await authApi.login(email.value, password.value);
    router.push('/dashboard');
  } catch (err) {
    error.value = err.message || 'Login failed. Please try again.';
  } finally {
    loading.value = false;
  }
};

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(s);
  });
}

const handleGoogleLogin = async () => {
  googleLoading.value = true;
  error.value = '';
  try {
    await loadGoogleScript();
  } catch {
    error.value = 'Failed to load Google Sign-In';
    googleLoading.value = false;
    return;
  }

  window.google.accounts.id.initialize({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    use_fedcm_for_prompt: false,
    callback: async (resp) => {
      try {
        await authApi.googleLogin(resp.credential);
        router.push('/dashboard');
      } catch (err) {
        error.value = err.message || 'Google sign-in failed';
      } finally {
        googleLoading.value = false;
      }
    },
  });

  window.google.accounts.id.prompt((n) => {
    if (n.isNotDisplayed()) {
      error.value = 'Google sign-in could not open. Try enabling third-party cookies or use Chrome.';
      googleLoading.value = false;
    } else if (n.isSkippedMoment() || n.isDismissedMoment()) {
      googleLoading.value = false;
    }
  });
};
</script>

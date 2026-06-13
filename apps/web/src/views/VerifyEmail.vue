<template>
  <div class="min-h-screen bg-gradient-to-br from-black via-gray-900 to-emerald-950 flex items-center justify-center px-4 py-8">
    <div class="max-w-md w-full">
      <!-- Logo -->
      <div class="text-center mb-6 sm:mb-8">
        <router-link to="/" class="inline-flex items-center space-x-2">
          <img src="/favicon.png" alt="Echobit" class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-contain" />
          <span class="text-2xl sm:text-3xl font-bold text-white">Echobit</span>
        </router-link>
      </div>

      <!-- Card -->
      <div class="bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-emerald-500/20 shadow-2xl">
        <!-- Icon -->
        <div class="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg class="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h2 class="text-xl sm:text-2xl font-bold text-white mb-2 text-center">Check your email</h2>
        <p class="text-white/60 mb-1 text-sm text-center">We sent a 6-digit code to</p>
        <p class="text-emerald-400 font-medium text-sm text-center mb-6 sm:mb-8 truncate">{{ email }}</p>

        <form @submit.prevent="handleVerify" class="space-y-5">
          <div>
            <label class="block text-white/80 text-sm font-medium mb-2">Verification Code</label>
            <input
              v-model="otp"
              type="text"
              inputmode="numeric"
              maxlength="6"
              required
              autofocus
              class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-center text-2xl tracking-[0.5em] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition font-mono"
              placeholder="······"
            />
          </div>

          <div v-if="error" class="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading || otp.length < 6"
            class="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ loading ? 'Verifying...' : 'Verify Email' }}</span>
          </button>
        </form>

        <div class="mt-6 flex justify-center">
          <TurnstileWidget ref="turnstileRef" v-model="turnstileToken" />
        </div>

        <div class="mt-4 text-center">
          <p class="text-white/50 text-sm">
            Didn't receive it?
            <button
              @click="resend"
              :disabled="resendCooldown > 0 || resending || (turnstileSiteKey && !turnstileToken)"
              class="text-emerald-400 hover:text-emerald-300 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ml-1"
            >
              {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : resending ? 'Sending…' : 'Resend code' }}
            </button>
          </p>
        </div>

        <div class="mt-4 text-center">
          <router-link to="/login" class="text-white/40 hover:text-white/70 text-sm transition">
            ← Back to sign in
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { authApi } from '../api';
import TurnstileWidget from '../components/TurnstileWidget.vue';

const router = useRouter();
const route = useRoute();

const email = ref(route.query.email || '');
const otp = ref('');
const loading = ref(false);
const resending = ref(false);
const error = ref('');
const resendCooldown = ref(0);
const turnstileToken = ref('');
const turnstileRef = ref(null);
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

let cooldownTimer = null;

function startCooldown() {
  resendCooldown.value = 60;
  cooldownTimer = setInterval(() => {
    resendCooldown.value--;
    if (resendCooldown.value <= 0) clearInterval(cooldownTimer);
  }, 1000);
}

onMounted(() => startCooldown());
onUnmounted(() => clearInterval(cooldownTimer));

async function handleVerify() {
  error.value = '';
  loading.value = true;
  try {
    await authApi.verifyEmail(email.value, otp.value.trim());
    router.push('/dashboard');
  } catch (err) {
    error.value = err.message || 'Invalid or expired code. Please try again.';
  } finally {
    loading.value = false;
  }
}

async function resend() {
  if (resendCooldown.value > 0 || resending.value) return;
  resending.value = true;
  error.value = '';
  try {
    await authApi.sendVerification(email.value, turnstileToken.value);
    startCooldown();
  } catch (err) {
    error.value = err.message || 'Failed to resend. Try again.';
  } finally {
    resending.value = false;
    turnstileRef.value?.reset(); // token is single-use; refresh for next resend
  }
}
</script>

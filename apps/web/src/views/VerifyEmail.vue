<template>
  <div class="relative min-h-screen bg-canvas text-content flex items-center justify-center px-4 py-8 overflow-hidden">
    <div class="pointer-events-none absolute inset-0 -z-10" style="background: radial-gradient(ellipse 55% 40% at 50% 25%, rgba(16,185,129,0.14), transparent 70%)"></div>
    <div class="absolute top-4 right-4"><ThemeToggle /></div>

    <div class="max-w-md w-full">
      <!-- Logo -->
      <div class="text-center mb-6 sm:mb-8">
        <a href="/" class="inline-flex items-center gap-2">
          <img src="/favicon.png" alt="Echobit" class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-contain" />
          <span class="text-2xl sm:text-3xl font-bold">Echobit</span>
        </a>
      </div>

      <!-- Card -->
      <div class="card card-elevated p-6 sm:p-8">
        <!-- Icon -->
        <div class="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg class="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h2 class="text-xl sm:text-2xl font-bold mb-2 text-center">Check your email</h2>
        <p class="text-muted mb-1 text-sm text-center">We sent a 6-digit code to</p>
        <p class="text-primary font-medium text-sm text-center mb-6 sm:mb-8 truncate">{{ email }}</p>

        <form @submit.prevent="handleVerify" class="space-y-5">
          <div>
            <label class="block text-muted text-sm font-medium mb-2">Verification Code</label>
            <input
              v-model="otp"
              type="text"
              inputmode="numeric"
              maxlength="6"
              required
              autofocus
              class="field text-center text-2xl tracking-[0.5em] font-mono"
              placeholder="······"
            />
          </div>

          <div v-if="error" class="bg-red-100 dark:bg-red-500/15 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
            {{ error }}
          </div>

          <button type="submit" :disabled="loading || otp.length < 6" class="btn-primary w-full py-3">
            <Spinner v-if="loading" size="sm" />
            <span>{{ loading ? 'Verifying...' : 'Verify Email' }}</span>
          </button>
        </form>

        <div class="mt-6 flex justify-center">
          <TurnstileWidget ref="turnstileRef" v-model="turnstileToken" />
        </div>

        <div class="mt-4 text-center">
          <p class="text-muted text-sm">
            Didn't receive it?
            <button
              @click="resend"
              :disabled="resendCooldown > 0 || resending || (turnstileSiteKey && !turnstileToken)"
              class="text-primary hover:opacity-80 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ml-1"
            >
              {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : resending ? 'Sending…' : 'Resend code' }}
            </button>
          </p>
        </div>

        <div class="mt-4 text-center">
          <router-link to="/login" class="text-muted hover:text-content text-sm transition">← Back to sign in</router-link>
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
import ThemeToggle from '../components/ui/ThemeToggle.vue';
import Spinner from '../components/ui/Spinner.vue';

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

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

      <!-- Step 1: Enter email -->
      <div v-if="step === 1" class="card card-elevated p-6 sm:p-8">
        <div class="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg class="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 class="text-xl sm:text-2xl font-bold mb-2 text-center">Forgot password?</h2>
        <p class="text-muted mb-6 sm:mb-8 text-sm text-center">Enter your email and we'll send you a reset code.</p>

        <form @submit.prevent="handleSendOtp" class="space-y-5">
          <div>
            <label class="block text-muted text-sm font-medium mb-2">Email</label>
            <input v-model="email" type="email" required autofocus class="field" placeholder="you@example.com" />
          </div>

          <div v-if="error" class="bg-red-100 dark:bg-red-500/15 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
            {{ error }}
          </div>

          <TurnstileWidget ref="turnstileRef" v-model="turnstileToken" />

          <button type="submit" :disabled="loading || (turnstileSiteKey && !turnstileToken)" class="btn-primary w-full py-3">
            <Spinner v-if="loading" size="sm" />
            <span>{{ loading ? 'Sending...' : 'Send Reset Code' }}</span>
          </button>
        </form>

        <div class="mt-6 text-center">
          <router-link to="/login" class="text-muted hover:text-content text-sm transition">← Back to sign in</router-link>
        </div>
      </div>

      <!-- Step 2: OTP + new password -->
      <div v-else-if="step === 2" class="card card-elevated p-6 sm:p-8">
        <div class="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg class="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 class="text-xl sm:text-2xl font-bold mb-2 text-center">Reset password</h2>
        <p class="text-muted mb-1 text-sm text-center">Enter the code sent to</p>
        <p class="text-primary font-medium text-sm text-center mb-6 truncate">{{ email }}</p>

        <form @submit.prevent="handleReset" class="space-y-5">
          <div>
            <label class="block text-muted text-sm font-medium mb-2">Reset Code</label>
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

          <div>
            <label class="block text-muted text-sm font-medium mb-2">New Password</label>
            <input v-model="newPassword" type="password" required minlength="6" class="field" placeholder="••••••••" />
          </div>

          <div>
            <label class="block text-muted text-sm font-medium mb-2">Confirm New Password</label>
            <input v-model="confirmPassword" type="password" required class="field" placeholder="••••••••" />
          </div>

          <div v-if="error" class="bg-red-100 dark:bg-red-500/15 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
            {{ error }}
          </div>

          <button type="submit" :disabled="loading" class="btn-primary w-full py-3">
            <Spinner v-if="loading" size="sm" />
            <span>{{ loading ? 'Resetting...' : 'Reset Password' }}</span>
          </button>
        </form>

        <div class="mt-6 text-center">
          <button @click="step = 1; error = ''" class="text-muted hover:text-content text-sm transition">← Use a different email</button>
        </div>
      </div>

      <!-- Step 3: Success -->
      <div v-else class="card card-elevated p-6 sm:p-8 text-center">
        <div class="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg class="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-xl sm:text-2xl font-bold mb-2">Password reset!</h2>
        <p class="text-muted text-sm mb-8">Your password has been updated. You can now sign in.</p>
        <router-link to="/login" class="btn-primary w-full py-3">Sign In</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { authApi } from '../api';
import TurnstileWidget from '../components/TurnstileWidget.vue';
import ThemeToggle from '../components/ui/ThemeToggle.vue';
import Spinner from '../components/ui/Spinner.vue';

const step = ref(1);
const email = ref('');
const otp = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');
const turnstileToken = ref('');
const turnstileRef = ref(null);
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

async function handleSendOtp() {
  error.value = '';
  loading.value = true;
  try {
    await authApi.forgotPassword(email.value, turnstileToken.value);
    step.value = 2;
  } catch (err) {
    error.value = err.message || 'Failed to send reset code. Please try again.';
    turnstileRef.value?.reset(); // token is single-use; get a fresh one
  } finally {
    loading.value = false;
  }
}

async function handleReset() {
  error.value = '';
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }
  loading.value = true;
  try {
    await authApi.resetPassword(email.value, otp.value.trim(), newPassword.value);
    step.value = 3;
  } catch (err) {
    error.value = err.message || 'Invalid or expired code. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

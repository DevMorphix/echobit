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

      <!-- Step 1: Enter email -->
      <div v-if="step === 1" class="bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-emerald-500/20 shadow-2xl">
        <div class="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg class="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 class="text-xl sm:text-2xl font-bold text-white mb-2 text-center">Forgot password?</h2>
        <p class="text-white/60 mb-6 sm:mb-8 text-sm text-center">Enter your email and we'll send you a reset code.</p>

        <form @submit.prevent="handleSendOtp" class="space-y-5">
          <div>
            <label class="block text-white/80 text-sm font-medium mb-2">Email</label>
            <input
              v-model="email"
              type="email"
              required
              autofocus
              class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder="you@example.com"
            />
          </div>

          <div v-if="error" class="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ loading ? 'Sending...' : 'Send Reset Code' }}</span>
          </button>
        </form>

        <div class="mt-6 text-center">
          <router-link to="/login" class="text-white/40 hover:text-white/70 text-sm transition">
            ← Back to sign in
          </router-link>
        </div>
      </div>

      <!-- Step 2: OTP + new password -->
      <div v-else-if="step === 2" class="bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-emerald-500/20 shadow-2xl">
        <div class="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg class="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 class="text-xl sm:text-2xl font-bold text-white mb-2 text-center">Reset password</h2>
        <p class="text-white/60 mb-1 text-sm text-center">Enter the code sent to</p>
        <p class="text-emerald-400 font-medium text-sm text-center mb-6 truncate">{{ email }}</p>

        <form @submit.prevent="handleReset" class="space-y-5">
          <div>
            <label class="block text-white/80 text-sm font-medium mb-2">Reset Code</label>
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

          <div>
            <label class="block text-white/80 text-sm font-medium mb-2">New Password</label>
            <input
              v-model="newPassword"
              type="password"
              required
              minlength="6"
              class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label class="block text-white/80 text-sm font-medium mb-2">Confirm New Password</label>
            <input
              v-model="confirmPassword"
              type="password"
              required
              class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          <div v-if="error" class="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ loading ? 'Resetting...' : 'Reset Password' }}</span>
          </button>
        </form>

        <div class="mt-6 text-center">
          <button @click="step = 1; error = ''" class="text-white/40 hover:text-white/70 text-sm transition">
            ← Use a different email
          </button>
        </div>
      </div>

      <!-- Step 3: Success -->
      <div v-else class="bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-emerald-500/20 shadow-2xl text-center">
        <div class="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg class="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-xl sm:text-2xl font-bold text-white mb-2">Password reset!</h2>
        <p class="text-white/60 text-sm mb-8">Your password has been updated. You can now sign in.</p>
        <router-link
          to="/login"
          class="inline-block w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition text-center"
        >
          Sign In
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { authApi } from '../api';

const step = ref(1);
const email = ref('');
const otp = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');

async function handleSendOtp() {
  error.value = '';
  loading.value = true;
  try {
    await authApi.forgotPassword(email.value);
    step.value = 2;
  } catch (err) {
    error.value = err.message || 'Failed to send reset code. Please try again.';
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

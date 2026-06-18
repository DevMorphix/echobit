<template>
  <div class="relative min-h-screen bg-canvas text-content flex items-center justify-center px-4 py-8 overflow-hidden">
    <div class="pointer-events-none absolute inset-0 -z-10" style="background: radial-gradient(ellipse 55% 40% at 50% 20%, rgba(16,185,129,0.14), transparent 70%)"></div>
    <div class="absolute top-4 right-4"><ThemeToggle /></div>

    <div class="max-w-md w-full">
      <!-- Logo -->
      <div class="text-center mb-8">
        <a href="/" class="inline-flex items-center gap-2">
          <img src="/favicon.png" alt="Echobit" class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-contain" />
          <span class="text-2xl sm:text-3xl font-bold">Echobit</span>
        </a>
        <p class="text-muted text-sm mt-2">Record. Transcribe. Understand.</p>
      </div>

      <!-- Register Card -->
      <div class="card card-elevated p-6 sm:p-8">
        <h2 class="text-xl sm:text-2xl font-bold mb-1">Create account</h2>
        <p class="text-muted mb-6 text-sm">Start recording and summarizing for free</p>

        <!-- Google Button -->
        <button
          type="button"
          @click="handleGoogleSignup"
          :disabled="googleLoading || loading"
          class="w-full flex items-center justify-center gap-3 bg-white text-gray-800 border border-line py-3 rounded-xl font-semibold text-sm sm:text-base hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm mb-5"
        >
          <svg v-if="!googleLoading" class="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <Spinner v-else size="sm" class="text-gray-500" />
          <span>{{ googleLoading ? 'Signing up...' : 'Sign up with Google' }}</span>
        </button>

        <!-- Divider -->
        <div class="flex items-center gap-3 mb-5">
          <div class="flex-1 h-px bg-line"></div>
          <span class="text-faint text-xs font-medium">or use email</span>
          <div class="flex-1 h-px bg-line"></div>
        </div>

        <form @submit.prevent="handleRegister" class="space-y-4">
          <div>
            <label class="block text-muted text-sm font-medium mb-1.5">Full Name</label>
            <input v-model="name" type="text" required :disabled="loading" class="field text-sm sm:text-base" placeholder="John Doe" />
          </div>

          <div>
            <label class="block text-muted text-sm font-medium mb-1.5">Email</label>
            <input v-model="email" type="email" required :disabled="loading" class="field text-sm sm:text-base" placeholder="you@example.com" />
          </div>

          <div>
            <label class="block text-muted text-sm font-medium mb-1.5">Password</label>
            <input v-model="password" type="password" required minlength="6" :disabled="loading" class="field text-sm sm:text-base" placeholder="Min 6 characters" />
            <!-- Password strength bar -->
            <div v-if="password" class="flex items-center gap-2 mt-2">
              <div class="flex-1 h-1 bg-line rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-300" :class="strengthBarColor" :style="{ width: passwordStrength + '%' }"></div>
              </div>
              <span class="text-xs font-medium" :class="strengthTextColor">{{ strengthLabel }}</span>
            </div>
          </div>

          <div>
            <label class="block text-muted text-sm font-medium mb-1.5">Confirm Password</label>
            <div class="relative">
              <input
                v-model="confirmPassword"
                type="password"
                required
                :disabled="loading"
                class="field text-sm sm:text-base"
                :class="confirmPassword && password !== confirmPassword ? 'field-danger' : ''"
                placeholder="Re-enter password"
              />
              <svg v-if="confirmPassword && password === confirmPassword" class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <div>
            <label class="block text-muted text-sm font-medium mb-1.5">Country</label>
            <CustomSelect v-model="country" :options="countryOptions" :disabled="loading" placeholder="Select your country" aria-label="Country" />
          </div>

          <div v-if="country === 'India'">
            <label class="block text-muted text-sm font-medium mb-1.5">Preferred Language</label>
            <CustomSelect v-model="preferredLanguage" :options="languageOptions" :disabled="loading" aria-label="Preferred language" />
          </div>

          <div>
            <label class="block text-muted text-sm font-medium mb-1.5">
              Profession <span class="text-faint font-normal">(optional)</span>
            </label>
            <input v-model="profession" type="text" :disabled="loading" class="field text-sm sm:text-base" placeholder="e.g. Doctor, Teacher, Engineer..." />
          </div>

          <div v-if="error" class="flex items-center gap-2 bg-red-100 dark:bg-red-500/15 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ error }}
          </div>

          <TurnstileWidget ref="turnstileRef" v-model="turnstileToken" />

          <button
            type="submit"
            :disabled="loading || (turnstileSiteKey && !turnstileToken)"
            class="btn-primary w-full py-3 text-sm sm:text-base"
          >
            <Spinner v-if="loading" size="sm" />
            <span>{{ loading ? 'Creating account...' : 'Create Account' }}</span>
          </button>
        </form>

        <p class="text-center text-muted text-sm mt-6">
          Already have an account?
          <router-link to="/login" class="text-primary hover:opacity-80 font-semibold transition ml-1">Sign in</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { authApi } from '../api';
import TurnstileWidget from '../components/TurnstileWidget.vue';
import ThemeToggle from '../components/ui/ThemeToggle.vue';
import Spinner from '../components/ui/Spinner.vue';
import CustomSelect from '../components/ui/CustomSelect.vue';

const countryOptions = [
  { value: 'India', label: '🇮🇳 India' },
  { value: 'United States', label: '🇺🇸 United States' },
  { value: 'United Kingdom', label: '🇬🇧 United Kingdom' },
  { value: 'Canada', label: '🇨🇦 Canada' },
  { value: 'Australia', label: '🇦🇺 Australia' },
  { value: 'Germany', label: '🇩🇪 Germany' },
  { value: 'France', label: '🇫🇷 France' },
  { value: 'Japan', label: '🇯🇵 Japan' },
  { value: 'Singapore', label: '🇸🇬 Singapore' },
  { value: 'UAE', label: '🇦🇪 UAE' },
  { value: 'Other', label: '🌍 Other' },
];

const languageOptions = [
  { value: 'English', label: 'English' },
  { value: 'Hindi', label: 'Hindi (हिन्दी)' },
  { value: 'Bengali', label: 'Bengali (বাংলা)' },
  { value: 'Tamil', label: 'Tamil (தமிழ்)' },
  { value: 'Telugu', label: 'Telugu (తెలుగు)' },
  { value: 'Kannada', label: 'Kannada (ಕನ್ನಡ)' },
  { value: 'Malayalam', label: 'Malayalam (മലയാളം)' },
  { value: 'Marathi', label: 'Marathi (मराठी)' },
  { value: 'Gujarati', label: 'Gujarati (ગુજરાતી)' },
  { value: 'Punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { value: 'Odia', label: 'Odia (ଓଡ଼ିଆ)' },
];

const router = useRouter();
const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const country = ref('');
const preferredLanguage = ref('English');
const profession = ref('');
const loading = ref(false);
const googleLoading = ref(false);
const error = ref('');
const turnstileToken = ref('');
const turnstileRef = ref(null);
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

const passwordStrength = computed(() => {
  const p = password.value;
  if (!p) return 0;
  let score = 0;
  if (p.length >= 6) score += 25;
  if (p.length >= 8) score += 15;
  if (/[A-Z]/.test(p)) score += 20;
  if (/[0-9]/.test(p)) score += 20;
  if (/[^A-Za-z0-9]/.test(p)) score += 20;
  return Math.min(100, score);
});

const strengthLabel = computed(() => {
  if (passwordStrength.value < 40) return 'Weak';
  if (passwordStrength.value < 70) return 'Medium';
  return 'Strong';
});

const strengthBarColor = computed(() => {
  if (passwordStrength.value < 40) return 'bg-red-500';
  if (passwordStrength.value < 70) return 'bg-amber-400';
  return 'bg-emerald-500';
});

const strengthTextColor = computed(() => {
  if (passwordStrength.value < 40) return 'text-red-500';
  if (passwordStrength.value < 70) return 'text-amber-500';
  return 'text-emerald-600 dark:text-emerald-400';
});

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

const handleGoogleSignup = async () => {
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
        error.value = err.message || 'Google sign-up failed';
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

const handleRegister = async () => {
  error.value = '';

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  loading.value = true;
  try {
    await authApi.register(name.value, email.value, password.value, {
      country: country.value || undefined,
      preferredLanguage: country.value === 'India' ? preferredLanguage.value : undefined,
      profession: profession.value || undefined,
    }, turnstileToken.value);
    router.push(`/verify-email?email=${encodeURIComponent(email.value)}`);
  } catch (err) {
    error.value = err.message || 'Registration failed. Please try again.';
    turnstileRef.value?.reset(); // token is single-use; get a fresh one
  } finally {
    loading.value = false;
  }
};
</script>

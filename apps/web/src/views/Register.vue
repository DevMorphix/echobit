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

      <!-- Register Card -->
      <div class="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
        <h2 class="text-xl sm:text-2xl font-bold text-white mb-1">Create account</h2>
        <p class="text-white/50 mb-6 text-sm">Start recording and summarizing for free</p>

        <!-- Google Button -->
        <button
          type="button"
          @click="handleGoogleSignup"
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
          <span>{{ googleLoading ? 'Signing up...' : 'Sign up with Google' }}</span>
        </button>

        <!-- Divider -->
        <div class="flex items-center gap-3 mb-5">
          <div class="flex-1 h-px bg-white/10"></div>
          <span class="text-white/30 text-xs font-medium">or use email</span>
          <div class="flex-1 h-px bg-white/10"></div>
        </div>

        <form @submit.prevent="handleRegister" class="space-y-4">
          <div>
            <label class="block text-white/70 text-sm font-medium mb-1.5">Full Name</label>
            <input
              v-model="name"
              type="text"
              required
              :disabled="loading"
              class="w-full px-4 py-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm sm:text-base"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label class="block text-white/70 text-sm font-medium mb-1.5">Email</label>
            <input
              v-model="email"
              type="email"
              required
              :disabled="loading"
              class="w-full px-4 py-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm sm:text-base"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label class="block text-white/70 text-sm font-medium mb-1.5">Password</label>
            <input
              v-model="password"
              type="password"
              required
              minlength="6"
              :disabled="loading"
              class="w-full px-4 py-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm sm:text-base"
              placeholder="Min 6 characters"
            />
            <!-- Password strength bar -->
            <div v-if="password" class="flex items-center gap-2 mt-2">
              <div class="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="strengthBarColor"
                  :style="{ width: passwordStrength + '%' }"
                ></div>
              </div>
              <span class="text-xs font-medium" :class="strengthTextColor">{{ strengthLabel }}</span>
            </div>
          </div>

          <div>
            <label class="block text-white/70 text-sm font-medium mb-1.5">Confirm Password</label>
            <div class="relative">
              <input
                v-model="confirmPassword"
                type="password"
                required
                :disabled="loading"
                class="w-full px-4 py-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm sm:text-base"
                :class="confirmPassword && password !== confirmPassword ? 'border-red-500/50 ring-1 ring-red-500/30' : confirmPassword && password === confirmPassword ? 'border-emerald-500/50' : ''"
                placeholder="Re-enter password"
              />
              <svg v-if="confirmPassword && password === confirmPassword" class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <div>
            <label class="block text-white/70 text-sm font-medium mb-1.5">Country</label>
            <select
              v-model="country"
              :disabled="loading"
              class="w-full px-4 py-3 bg-white/8 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm sm:text-base"
            >
              <option value="" class="bg-gray-900">Select your country</option>
              <option value="India" class="bg-gray-900">🇮🇳 India</option>
              <option value="United States" class="bg-gray-900">🇺🇸 United States</option>
              <option value="United Kingdom" class="bg-gray-900">🇬🇧 United Kingdom</option>
              <option value="Canada" class="bg-gray-900">🇨🇦 Canada</option>
              <option value="Australia" class="bg-gray-900">🇦🇺 Australia</option>
              <option value="Germany" class="bg-gray-900">🇩🇪 Germany</option>
              <option value="France" class="bg-gray-900">🇫🇷 France</option>
              <option value="Japan" class="bg-gray-900">🇯🇵 Japan</option>
              <option value="Singapore" class="bg-gray-900">🇸🇬 Singapore</option>
              <option value="UAE" class="bg-gray-900">🇦🇪 UAE</option>
              <option value="Other" class="bg-gray-900">🌍 Other</option>
            </select>
          </div>

          <div v-if="country === 'India'">
            <label class="block text-white/70 text-sm font-medium mb-1.5">Preferred Language</label>
            <select
              v-model="preferredLanguage"
              :disabled="loading"
              class="w-full px-4 py-3 bg-white/8 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm sm:text-base"
            >
              <option value="English" class="bg-gray-900">English</option>
              <option value="Hindi" class="bg-gray-900">Hindi (हिन्दी)</option>
              <option value="Bengali" class="bg-gray-900">Bengali (বাংলা)</option>
              <option value="Tamil" class="bg-gray-900">Tamil (தமிழ்)</option>
              <option value="Telugu" class="bg-gray-900">Telugu (తెలుగు)</option>
              <option value="Kannada" class="bg-gray-900">Kannada (ಕನ್ನಡ)</option>
              <option value="Malayalam" class="bg-gray-900">Malayalam (മലയാളം)</option>
              <option value="Marathi" class="bg-gray-900">Marathi (मराठी)</option>
              <option value="Gujarati" class="bg-gray-900">Gujarati (ગુજરાતી)</option>
              <option value="Punjabi" class="bg-gray-900">Punjabi (ਪੰਜਾਬੀ)</option>
              <option value="Odia" class="bg-gray-900">Odia (ଓଡ଼ିଆ)</option>
            </select>
          </div>

          <div>
            <label class="block text-white/70 text-sm font-medium mb-1.5">
              Profession <span class="text-white/30 font-normal">(optional)</span>
            </label>
            <input
              v-model="profession"
              type="text"
              :disabled="loading"
              class="w-full px-4 py-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm sm:text-base"
              placeholder="e.g. Doctor, Teacher, Engineer..."
            />
          </div>

          <div v-if="error" class="flex items-center gap-2 bg-red-500/15 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ error }}
          </div>

          <TurnstileWidget ref="turnstileRef" v-model="turnstileToken" />

          <button
            type="submit"
            :disabled="loading || (turnstileSiteKey && !turnstileToken)"
            class="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3.5 rounded-2xl font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base shadow-lg shadow-emerald-900/40"
          >
            <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ loading ? 'Creating account...' : 'Create Account' }}</span>
          </button>
        </form>

        <p class="text-center text-white/50 text-sm mt-6">
          Already have an account?
          <router-link to="/login" class="text-emerald-400 hover:text-emerald-300 font-semibold transition ml-1">Sign in</router-link>
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
  if (passwordStrength.value < 70) return 'bg-yellow-400';
  return 'bg-emerald-500';
});

const strengthTextColor = computed(() => {
  if (passwordStrength.value < 40) return 'text-red-400';
  if (passwordStrength.value < 70) return 'text-yellow-400';
  return 'text-emerald-400';
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

<template>
  <!-- Fixed elements outside overflow-x-hidden to avoid Android WebView fixed-positioning bug -->

  <!-- Payment status toast -->
  <transition name="fade">
    <div v-if="paymentStatus"
      class="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium max-w-sm w-full"
      :class="paymentStatus.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'"
    >
      <svg v-if="paymentStatus.type === 'success'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
      </svg>
      <svg v-else class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
      <span class="flex-1">{{ paymentStatus.message }}</span>
      <button @click="paymentStatus = null" class="opacity-70 hover:opacity-100 text-lg leading-none ml-2">×</button>
    </div>
  </transition>

  <!-- Fixed Navigation -->
  <nav class="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 pt-9 bg-canvas/70 backdrop-blur-md border-b border-line">
    <div class="max-w-7xl mx-auto flex justify-between items-center">
      <a href="/" class="flex items-center gap-2">
        <img src="/favicon.png" alt="Echobit" class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-contain" />
        <span class="text-xl sm:text-2xl font-bold text-content">Echobit</span>
      </a>
      <div class="flex items-center gap-2 sm:gap-4">
        <ThemeToggle />
        <a href="/contact" class="text-muted hover:text-content transition px-3 py-2 text-sm hidden sm:block">
          Contact
        </a>
        <template v-if="authState.isAuthenticated">
          <router-link to="/dashboard" class="text-muted hover:text-content transition px-3 sm:px-4 py-2 text-sm sm:text-base hidden sm:block">
            Dashboard
          </router-link>
          <router-link to="/dashboard" class="flex items-center gap-2 bg-surface-2 hover:bg-surface border border-line text-content px-3 py-2 rounded-full transition text-sm font-medium">
            <div class="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-fg text-xs font-bold leading-none">
              {{ (authState.user?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) }}
            </div>
            <span class="hidden sm:inline">{{ authState.user?.name?.split(' ')[0] }}</span>
          </router-link>
        </template>
        <template v-else>
          <router-link to="/login" class="text-muted hover:text-content transition px-3 sm:px-4 py-2 text-sm sm:text-base">
            Sign In
          </router-link>
          <router-link to="/register" class="btn-primary rounded-full px-4 sm:px-6 py-2 text-sm sm:text-base">
            Get Started
          </router-link>
        </template>
      </div>
    </div>
  </nav>

  <div class="bg-canvas text-content min-h-screen overflow-x-hidden">

    <!-- Hero -->
    <section class="pt-40 pb-16 px-4 sm:px-6 text-center relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div class="absolute -top-40 -right-40 w-96 h-96 bg-primary rounded-full filter blur-3xl opacity-10"></div>
        <div class="absolute -bottom-20 -left-40 w-80 h-80 bg-emerald-600 rounded-full filter blur-3xl opacity-10"></div>
      </div>
      <div class="relative z-10 max-w-3xl mx-auto">
        <div class="inline-flex items-center px-4 py-2 bg-surface-2 border border-line rounded-full text-muted text-sm mb-6">
          <span class="w-2 h-2 bg-primary rounded-full mr-2"></span>
          Simple, transparent pricing
        </div>
        <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold text-content mb-6 leading-tight">
          Plans for every
          <span class="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent"> need</span>
        </h1>
        <p class="text-lg sm:text-xl text-muted max-w-xl mx-auto">
          Start free and upgrade when you're ready. No credit card required.
        </p>

        <!-- Billing toggle -->
        <div class="flex items-center justify-center mt-8">
          <div class="flex bg-surface-2 rounded-full p-1 border border-line">
            <button
              @click="annual = false"
              class="px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200"
              :class="!annual ? 'bg-surface text-content shadow-sm' : 'text-muted hover:text-content'"
            >
              Monthly
            </button>
            <button
              @click="annual = true"
              class="px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2"
              :class="annual ? 'bg-surface text-content shadow-sm' : 'text-muted hover:text-content'"
            >
              Annual
              <span class="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">Save up to 33%</span>
            </button>
          </div>
        </div>

        <!-- Coupon input -->
        <div class="flex items-center justify-center mt-6">
          <div class="flex items-center gap-2 bg-surface border border-line rounded-2xl px-4 py-2.5 w-full max-w-sm">
            <svg class="w-4 h-4 text-faint shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z" />
            </svg>
            <input
              v-model="couponInput"
              @keyup.enter="applyCoupon"
              placeholder="Coupon code"
              aria-label="Coupon code"
              :disabled="couponApplied"
              class="flex-1 bg-transparent text-content placeholder:text-faint text-sm outline-none uppercase tracking-widest"
            />
            <button
              v-if="!couponApplied"
              @click="applyCoupon"
              :disabled="!couponInput.trim() || couponValidating"
              class="text-xs font-bold text-primary hover:opacity-80 disabled:opacity-40 transition shrink-0"
            >
              {{ couponValidating ? '…' : 'Apply' }}
            </button>
            <button
              v-else
              @click="removeCoupon"
              class="text-xs font-bold text-red-500 hover:text-red-400 transition shrink-0"
            >
              Remove
            </button>
          </div>
        </div>
        <div v-if="couponError" class="text-red-500 text-xs text-center mt-2">{{ couponError }}</div>
        <div v-if="couponApplied" class="flex items-center justify-center gap-1.5 mt-2">
          <span class="inline-flex items-center gap-1 bg-primary/15 border border-primary/40 text-primary text-xs font-semibold px-3 py-1 rounded-full">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
            {{ couponApplied.discountType === 'percent' ? couponApplied.discountValue + '% off' : '₹' + (couponApplied.discountValue / 100) + ' off' }} applied
          </span>
        </div>
      </div>
    </section>

    <!-- Pricing Cards -->
    <section class="pb-24 px-4 sm:px-6">
      <div class="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <PlanCard
          v-for="card in planCards"
          :key="card.key"
          v-bind="card.props"
          :annual="annual"
          :paying="paying && activePlan?.startsWith(card.key)"
          @select="pay(annual ? `${card.key}_annual` : `${card.key}_monthly`)"
        />
      </div>
    </section>

    <!-- Feature Comparison -->
    <section class="pb-24 px-4 sm:px-6">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-2xl sm:text-3xl font-bold text-content text-center mb-12">Full feature comparison</h2>

        <div class="card overflow-hidden overflow-x-auto">
          <div class="grid grid-cols-5 min-w-[600px] px-6 py-4 border-b border-line text-sm font-semibold">
            <div class="text-muted">Feature</div>
            <div class="text-center text-muted">Free</div>
            <div class="text-center text-blue-600 dark:text-blue-400">Starter</div>
            <div class="text-center text-primary">Pro</div>
            <div class="text-center text-purple-600 dark:text-purple-400">Growth</div>
          </div>

          <div v-for="(row, i) in comparison" :key="i"
               class="grid grid-cols-5 min-w-[600px] px-6 py-4 text-sm"
               :class="i % 2 === 0 ? '' : 'bg-surface-2/60'">
            <div class="text-muted">{{ row.feature }}</div>
            <div v-for="col in ['free', 'starter', 'pro', 'growth']" :key="col" class="text-center">
              <span v-if="row[col] === true">
                <svg class="w-5 h-5 text-primary mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span v-else-if="row[col] === false">
                <svg class="w-5 h-5 text-faint mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
              <span v-else :class="col === 'pro' ? 'text-primary font-medium' : col === 'growth' ? 'text-purple-600 dark:text-purple-400 font-medium' : col === 'starter' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-muted'">{{ row[col] }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="pb-24 px-4 sm:px-6">
      <div class="max-w-2xl mx-auto">
        <h2 class="text-2xl sm:text-3xl font-bold text-content text-center mb-12">Frequently asked questions</h2>
        <div class="space-y-4">
          <div v-for="(faq, i) in faqs" :key="i" class="card overflow-hidden">
            <button
              class="w-full flex items-center justify-between px-6 py-5 text-left"
              @click="openFaq = openFaq === i ? -1 : i"
            >
              <span class="text-content font-medium">{{ faq.q }}</span>
              <svg class="w-5 h-5 text-faint shrink-0 transition-transform duration-200"
                   :class="openFaq === i ? 'rotate-180' : ''"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="openFaq === i" class="px-6 pb-5 text-muted text-sm leading-relaxed">
              {{ faq.a }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="pb-32 px-4 sm:px-6 text-center">
      <div class="max-w-2xl mx-auto bg-primary/10 border border-primary/20 rounded-3xl p-12">
        <h2 class="text-3xl sm:text-4xl font-bold text-content mb-4">
          {{ authState.isAuthenticated ? 'Ready to do more?' : 'Start for free today' }}
        </h2>
        <p class="text-muted mb-8">
          {{ authState.isAuthenticated ? 'Upgrade your plan anytime from your dashboard.' : 'No credit card required. Upgrade anytime.' }}
        </p>
        <router-link :to="authState.isAuthenticated ? '/dashboard' : '/register'"
          class="btn-primary rounded-full px-8 py-4 text-lg shadow-xl shadow-primary/30">
          {{ authState.isAuthenticated ? 'Go to Dashboard' : 'Create Free Account' }}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </router-link>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-line px-4 sm:px-6 py-8">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-2">
          <img src="/favicon.png" alt="Echobit" class="w-7 h-7 rounded-lg object-contain" />
          <span class="text-content font-semibold">Echobit</span>
        </div>
        <div class="flex items-center gap-6 text-muted text-sm">
          <a href="/privacy-policy" class="hover:text-content transition">Privacy</a>
          <a href="/contact" class="hover:text-content transition">Contact</a>
          <a href="/request-deletion" class="hover:text-content transition">Data Deletion</a>
        </div>
        <p class="text-faint text-sm">&copy; 2026 Echobit. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { paymentsApi, authApi, authState, plansApi } from '@/api';
import { checkout } from '../services/razorpay.js';
import { useRouter } from 'vue-router';
import PlanCard from '../components/pricing/PlanCard.vue';
import ThemeToggle from '../components/ui/ThemeToggle.vue';

const annual = ref(false);
const openFaq = ref(-1);
const router = useRouter();

const paying = ref(false);
const activePlan = ref(null);
const paymentStatus = ref(null);

// ── Coupon ───────────────────────────────────────────────────────────────────
const couponInput = ref('');
const couponValidating = ref(false);
const couponError = ref('');
const couponApplied = ref(null);

async function applyCoupon() {
  const code = couponInput.value.trim();
  if (!code) return;
  couponValidating.value = true;
  couponError.value = '';
  // Try all paid plans — coupon may be restricted to a specific one
  const plansToTry = ['pro_monthly', 'starter_monthly', 'growth_monthly', 'pro_annual', 'starter_annual', 'growth_annual'];
  let lastError = 'Invalid coupon code';
  for (const plan of plansToTry) {
    try {
      const res = await paymentsApi.validateCoupon(code, plan);
      couponApplied.value = { discountType: res.discountType, discountValue: res.discountValue };
      couponValidating.value = false;
      return;
    } catch (err) {
      lastError = err.message || lastError;
    }
  }
  couponError.value = lastError;
  couponApplied.value = null;
  couponValidating.value = false;
}

function removeCoupon() {
  couponApplied.value = null;
  couponInput.value = '';
  couponError.value = '';
}

function applyDiscount(priceStr) {
  if (!couponApplied.value || !priceStr) return priceStr;
  const num = parseFloat(priceStr.replace(/[₹,]/g, ''));
  if (isNaN(num)) return priceStr;
  const paise = Math.round(num * 100);
  let final = paise;
  if (couponApplied.value.discountType === 'percent') {
    final = Math.round(paise * (1 - couponApplied.value.discountValue / 100));
  } else {
    final = Math.max(0, paise - couponApplied.value.discountValue);
  }
  return '₹' + Math.round(final / 100);
}

// ── Subscription state ───────────────────────────────────────────────────────
function buildSubFromUser(user) {
  if (!user) return null;
  const exp = user.planExpiresAt;
  const active = user.plan && user.plan !== 'free' && exp && new Date(exp) > new Date();
  return {
    plan: user.plan || 'free',
    isActive: !!active,
    daysRemaining: active ? Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000) : 0,
    planExpiresAt: exp || null,
    planBillingCycle: user.planBillingCycle || null,
  };
}

const subscription = ref(
  buildSubFromUser(authState.user) ?? { plan: 'free', isActive: false, daysRemaining: 0, planExpiresAt: null, planBillingCycle: null }
);

const isCurrentPlan = (tier) => {
  if (tier === 'free') return !subscription.value.isActive;
  return subscription.value.plan === tier && subscription.value.isActive;
};

const expiryLabel = computed(() => {
  if (!subscription.value.planExpiresAt) return '';
  return new Date(subscription.value.planExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
});

// ── Payments ─────────────────────────────────────────────────────────────────
async function pay(plan) {
  if (!authState.isAuthenticated) {
    router.push('/login');
    return;
  }

  paying.value = true;
  activePlan.value = plan;
  paymentStatus.value = null;

  const done = () => {
    paying.value = false;
    activePlan.value = null;
  };

  try {
    await checkout(plan, {
      couponCode: couponApplied.value ? couponInput.value.trim() : undefined,
      onSuccess: (message, status) => {
        paymentStatus.value = { type: 'success', message };
        if (status) subscription.value = status;
        done();
      },
      onError: (message) => {
        paymentStatus.value = { type: 'error', message };
        done();
      },
      onDismiss: done,
      onMock: (order) => {
        paymentStatus.value = { type: 'success', message: `[Mock] Order created (ID: ${order.order_id}). Razorpay keys pending activation.` };
        done();
      },
    });
  } catch (err) {
    paymentStatus.value = { type: 'error', message: err.message || 'Could not initiate payment. Please try again.' };
    done();
  }
}

// auto-dismiss payment toast after 6 s
let toastTimer = null;
watch(paymentStatus, (val) => {
  if (toastTimer) clearTimeout(toastTimer);
  if (val) toastTimer = setTimeout(() => { paymentStatus.value = null; }, 6000);
});

// ── Plan data (admin-editable features + prices) ────────────────────────────
const planData = ref({});

const pd = (key) => planData.value[key] ?? { features: [], monthlyPrice: '', annualMonthly: '', annualTotal: '' };
const price = (key, field, fallback) => pd(key)[field] || fallback;

// Theme-aware per-plan styling (works in both light and dark).
const THEMES = {
  free: {
    card: 'bg-surface',
    cardIdle: 'border-line hover:border-faint',
    cardCurrent: 'border-content/30',
    badge: 'bg-slate-500',
    iconBg: 'bg-surface-2',
    iconColor: 'text-muted',
    accentText: 'text-muted',
    currentBox: 'bg-surface-2 border border-line',
    currentText: 'text-muted',
    button: 'border border-line text-content hover:bg-surface-2',
  },
  starter: {
    card: 'bg-surface',
    cardIdle: 'border-line hover:border-blue-400/60',
    cardCurrent: 'border-blue-400/60',
    badge: 'bg-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-500/15',
    iconColor: 'text-blue-600 dark:text-blue-400',
    accentText: 'text-blue-600 dark:text-blue-400',
    currentBox: 'bg-blue-100 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/30',
    currentText: 'text-blue-700 dark:text-blue-300',
    button: 'bg-blue-600 hover:bg-blue-500 text-white',
  },
  pro: {
    card: 'bg-primary/5 dark:bg-primary/10 shadow-lg shadow-primary/10',
    cardIdle: 'border-primary/40',
    cardCurrent: 'border-primary/50',
    badge: 'bg-primary',
    iconBg: 'bg-primary/15',
    iconColor: 'text-primary',
    accentText: 'text-primary',
    currentBox: 'bg-primary/10 border border-primary/30',
    currentText: 'text-emerald-700 dark:text-emerald-300',
    button: 'bg-primary hover:bg-primary-hover text-primary-fg shadow-lg shadow-primary/30',
  },
  growth: {
    card: 'bg-surface',
    cardIdle: 'border-line hover:border-purple-400/60',
    cardCurrent: 'border-purple-400/60',
    badge: 'bg-purple-500',
    iconBg: 'bg-purple-100 dark:bg-purple-500/15',
    iconColor: 'text-purple-600 dark:text-purple-400',
    accentText: 'text-purple-600 dark:text-purple-400',
    currentBox: 'bg-purple-100 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/30',
    currentText: 'text-purple-700 dark:text-purple-300',
    button: 'bg-purple-600 hover:bg-purple-500 text-white',
  },
};

const ICONS = {
  free: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
  starter: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  pro: 'M13 10V3L4 14h7v7l9-11h-7z',
  growth: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
};

const PLAN_META = [
  { key: 'free', name: 'Free', tagline: 'Try it out, no card needed', fallbacks: { monthlyPrice: '₹0', annualMonthly: '₹0', annualTotal: '₹0' } },
  { key: 'starter', name: 'Starter', tagline: 'For regular users', fallbacks: { monthlyPrice: '₹149', annualMonthly: '₹99', annualTotal: '₹1,188' } },
  { key: 'pro', name: 'Pro', tagline: 'For power users', highlighted: true, fallbacks: { monthlyPrice: '₹499', annualMonthly: '₹399', annualTotal: '₹4,788' } },
  { key: 'growth', name: 'Growth', tagline: 'Unlimited power', fallbacks: { monthlyPrice: '₹999', annualMonthly: '₹799', annualTotal: '₹9,588' } },
];

const planCards = computed(() =>
  PLAN_META.map((meta) => {
    const monthly = price(meta.key, 'monthlyPrice', meta.fallbacks.monthlyPrice);
    const annualMo = price(meta.key, 'annualMonthly', meta.fallbacks.annualMonthly);
    const display = annual.value ? annualMo : monthly;
    const isFree = meta.key === 'free';
    return {
      key: meta.key,
      props: {
        name: meta.name,
        tagline: meta.tagline,
        icon: ICONS[meta.key],
        theme: THEMES[meta.key],
        features: pd(meta.key).features ?? [],
        displayPrice: display,
        discountedPrice: !isFree && couponApplied.value ? applyDiscount(display) : null,
        annualTotal: isFree ? '' : price(meta.key, 'annualTotal', meta.fallbacks.annualTotal),
        isCurrent: isCurrentPlan(meta.key),
        highlighted: !!meta.highlighted,
        daysRemaining: isFree ? 0 : subscription.value.daysRemaining,
        expiryLabel: isFree ? '' : expiryLabel.value,
        ctaLabel: isFree ? 'Get Started Free' : `Get ${meta.name}`,
        ctaRoute: isFree ? '/register' : null,
      },
    };
  }),
);

onMounted(async () => {
  // Auto-login when coming from the mobile app (?token=...)
  const params = new URLSearchParams(window.location.search);
  const appToken = params.get('token');
  if (appToken) {
    // Always attempt login with the app token — it's fresher than any cached session
    await authApi.loginWithToken(appToken);
    // Strip token from URL immediately so it doesn't sit in browser history
    params.delete('token');
    const clean = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
    window.history.replaceState({}, '', clean);
  }

  // Load admin-editable plan features
  try {
    planData.value = await plansApi.getAll();
  } catch { /* keep empty defaults */ }

  if (authState.isAuthenticated) {
    try { subscription.value = await paymentsApi.getStatus(); } catch { /* keep default */ }
  }
});

// ── Comparison + FAQ content ─────────────────────────────────────────────────
function fmtMins(mins) {
  if (mins < 60) return `${mins} min`;
  const h = mins / 60;
  return `${h % 1 === 0 ? h : h.toFixed(1)} hour${h !== 1 ? 's' : ''}`;
}

const comparison = computed(() => {
  const gates = (plan) => planData.value[plan]?.gates ?? {};
  const dur = (plan, fallbackMins) => {
    const m = gates(plan).maxDurationMins;
    return fmtMins(m != null ? m : fallbackMins);
  };
  return [
    { feature: 'Recordings / month',    free: '3',        starter: '15',       pro: '40',        growth: 'Unlimited' },
    { feature: 'Max recording length',  free: dur('free', 20), starter: dur('starter', 45), pro: dur('pro', 120), growth: dur('growth', 180) },
    { feature: 'AI Transcription',      free: true,       starter: true,       pro: true,        growth: true        },
    { feature: 'Languages',             free: 'Eng+Mal',  starter: '3 langs',  pro: '15+',       growth: '20+'       },
    { feature: 'AI Summary',            free: true,       starter: true,       pro: true,        growth: true        },
    { feature: 'AI Notes',              free: false,      starter: true,       pro: true,        growth: true        },
    { feature: 'Meeting Minutes',       free: false,      starter: false,      pro: true,        growth: true        },
    { feature: 'Action Items',          free: false,      starter: false,      pro: true,        growth: true        },
    { feature: 'PDF Export',            free: false,      starter: false,      pro: true,        growth: true        },
    { feature: 'Priority Processing',   free: false,      starter: false,      pro: true,        growth: true        },
    { feature: 'Priority Support',      free: false,      starter: false,      pro: false,       growth: true        },
    { feature: 'Storage',               free: '1 GB',     starter: '3 GB',     pro: '10 GB',     growth: '25 GB'     },
  ];
});

const faqs = [
  {
    q: 'Is the free plan really free forever?',
    a: 'Yes! The free plan is free forever with no credit card required. You get 3 recordings per month and basic AI features to explore what Echobit can do.',
  },
  {
    q: 'Can I change or cancel my plan anytime?',
    a: 'Absolutely. You can upgrade, downgrade, or cancel at any time from your account settings. Upgrades take effect immediately.',
  },
  {
    q: 'What languages are supported?',
    a: 'English and Malayalam are available on Free. Starter adds Hindi. Pro unlocks 15+ languages and Growth unlocks 20+ languages including Tamil, Telugu, Bengali, Kannada, Marathi, Gujarati, Punjabi, and more.',
  },
  {
    q: 'How does annual billing work?',
    get a() {
      const tt = (k, fb) => (planData.value[k]?.annualTotal || fb);
      return `Annual plans are billed as a single payment upfront — Starter at ${tt('starter', '₹1,188')}/yr, Pro at ${tt('pro', '₹4,788')}/yr, and Growth at ${tt('growth', '₹9,588')}/yr — saving you up to 33% versus monthly billing.`;
    },
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. Your recordings and transcripts are stored securely and are only accessible to you. We never sell your data. See our Privacy Policy for full details.',
  },
];
</script>

<template>
  <div
    class="relative border rounded-3xl p-7 flex flex-col transition-all duration-300"
    :class="[theme.card, isCurrent ? theme.cardCurrent : theme.cardIdle, highlighted ? 'hover:-translate-y-2' : 'hover:-translate-y-1']"
  >
    <!-- Badge -->
    <div v-if="isCurrent || highlighted" class="absolute -top-4 left-1/2 -translate-x-1/2">
      <span v-if="isCurrent" :class="theme.badge" class="text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
        Your Plan
      </span>
      <span v-else class="bg-primary text-primary-fg text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">Most Popular</span>
    </div>

    <!-- Icon + name -->
    <div class="mb-5">
      <div class="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" :class="theme.iconBg">
        <svg class="w-5 h-5" :class="theme.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="icon" />
        </svg>
      </div>
      <h3 class="text-lg font-bold text-content mb-0.5">{{ name }}</h3>
      <p class="text-muted text-xs">{{ tagline }}</p>
    </div>

    <!-- Price -->
    <div class="mb-5">
      <div class="flex items-end gap-1.5">
        <span v-if="discountedPrice && discountedPrice !== displayPrice" class="text-2xl font-bold text-faint line-through">{{ displayPrice }}</span>
        <span class="text-4xl font-bold text-content">{{ discountedPrice || displayPrice }}</span>
        <span class="text-muted mb-1.5">/mo</span>
      </div>
      <p v-if="annual && annualTotal" class="text-xs mt-1" :class="theme.accentText">Billed {{ annualTotal }}/year</p>
    </div>

    <!-- Features -->
    <ul class="space-y-2.5 flex-1 mb-7">
      <li
        v-for="f in features"
        :key="f.text"
        :class="['flex items-start gap-2.5 text-sm', f.included ? 'text-content' : 'text-faint']"
      >
        <svg v-if="f.included" class="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
        <svg v-else class="w-4 h-4 text-faint shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        {{ f.text }}
      </li>
    </ul>

    <!-- CTA -->
    <div v-if="isCurrent" class="rounded-2xl px-4 py-3 text-center" :class="theme.currentBox">
      <div class="flex items-center justify-center gap-2 font-semibold text-sm" :class="theme.currentText">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Current Plan
      </div>
      <p v-if="daysRemaining" class="text-xs text-muted mt-1">{{ daysRemaining }}d remaining · expires {{ expiryLabel }}</p>
    </div>
    <router-link v-else-if="ctaRoute" :to="ctaRoute" class="block text-center py-3 rounded-2xl border border-line text-content font-semibold hover:bg-surface-2 transition text-sm">
      {{ ctaLabel }}
    </router-link>
    <button
      v-else
      @click="$emit('select')"
      :disabled="paying"
      class="block w-full text-center py-3 rounded-2xl font-semibold transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
      :class="theme.button"
    >
      {{ paying ? 'Processing…' : ctaLabel }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  name: { type: String, required: true },
  tagline: { type: String, default: '' },
  icon: { type: String, required: true },
  theme: { type: Object, required: true },
  features: { type: Array, default: () => [] },
  displayPrice: { type: String, required: true },
  discountedPrice: { type: String, default: null },
  annual: { type: Boolean, default: false },
  annualTotal: { type: String, default: '' },
  isCurrent: { type: Boolean, default: false },
  highlighted: { type: Boolean, default: false },
  paying: { type: Boolean, default: false },
  daysRemaining: { type: Number, default: 0 },
  expiryLabel: { type: String, default: '' },
  ctaLabel: { type: String, default: 'Get Started' },
  ctaRoute: { type: String, default: null },
});
defineEmits(['select']);
</script>

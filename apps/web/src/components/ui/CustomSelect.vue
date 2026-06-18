<template>
  <div ref="root" class="relative" :class="{ 'opacity-50 pointer-events-none': disabled }">
    <!-- Trigger -->
    <button
      type="button"
      :disabled="disabled"
      :aria-label="ariaLabel || undefined"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="toggle"
      @keydown="onTriggerKeydown"
      class="w-full flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left text-sm text-content transition focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <span :class="{ 'text-faint': !selectedLabel }" class="truncate">{{ selectedLabel || placeholder }}</span>
      <svg class="w-4 h-4 shrink-0 text-faint transition-transform" :class="{ 'rotate-180': open }" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Panel -->
    <ul
      v-if="open"
      ref="list"
      role="listbox"
      :aria-label="ariaLabel || undefined"
      class="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-line bg-surface py-1 shadow-lg shadow-black/10"
    >
      <li
        v-for="(opt, i) in options"
        :key="String(opt.value)"
        role="option"
        :aria-selected="opt.value === modelValue"
        @click="select(opt.value)"
        @mousemove="highlighted = i"
        class="flex items-center justify-between gap-2 px-3.5 py-2 text-sm cursor-pointer"
        :class="[
          i === highlighted ? 'bg-surface-2' : '',
          opt.value === modelValue ? 'text-primary font-medium' : 'text-content',
        ]"
      >
        <span class="truncate">{{ opt.label }}</span>
        <svg v-if="opt.value === modelValue" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';

const props = defineProps({
  modelValue: { type: [String, Number, Boolean], default: '' },
  options: { type: Array, required: true }, // [{ value, label }]
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Select…' },
  ariaLabel: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue']);

const root = ref(null);
const list = ref(null);
const open = ref(false);
const highlighted = ref(-1);

const selectedLabel = computed(() => props.options.find(o => o.value === props.modelValue)?.label || '');

function openMenu() {
  if (props.disabled) return;
  open.value = true;
  highlighted.value = Math.max(0, props.options.findIndex(o => o.value === props.modelValue));
  document.addEventListener('click', onOutside, true);
}
function closeMenu() {
  open.value = false;
  document.removeEventListener('click', onOutside, true);
}
function toggle() {
  open.value ? closeMenu() : openMenu();
}
function select(value) {
  emit('update:modelValue', value);
  closeMenu();
}
function onOutside(e) {
  if (root.value && !root.value.contains(e.target)) closeMenu();
}

function move(delta) {
  const n = props.options.length;
  if (!n) return;
  highlighted.value = (highlighted.value + delta + n) % n;
  nextTick(() => list.value?.children[highlighted.value]?.scrollIntoView({ block: 'nearest' }));
}

function onTriggerKeydown(e) {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
    e.preventDefault();
    if (!open.value) { openMenu(); return; }
  }
  if (e.key === 'ArrowDown') move(1);
  else if (e.key === 'ArrowUp') move(-1);
  else if (e.key === 'Enter' || e.key === ' ') {
    if (open.value && props.options[highlighted.value]) select(props.options[highlighted.value].value);
  } else if (e.key === 'Escape') closeMenu();
  else if (e.key === 'Tab') closeMenu();
}

watch(() => props.disabled, (d) => { if (d) closeMenu(); });
onBeforeUnmount(() => document.removeEventListener('click', onOutside, true));
</script>

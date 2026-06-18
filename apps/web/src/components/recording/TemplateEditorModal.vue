<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
    <div class="card card-elevated max-w-lg w-full max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
      <div class="p-6 border-b border-line">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-content">
            {{ template?.key && !template?.isDefault ? 'Edit Template' : template?.isDefault ? 'Customize Template' : 'Create Template' }}
          </h2>
          <button @click="$emit('close')" aria-label="Close" class="text-faint hover:text-content">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p v-if="template?.isDefault" class="text-sm text-amber-600 dark:text-amber-400 mt-2">
          Default templates can't be modified. Your changes will be saved as a new template.
        </p>
      </div>

      <div class="p-6 space-y-5">
        <!-- Template Name -->
        <div>
          <label class="block text-sm font-medium text-muted mb-2">Template Name</label>
          <input v-model="name" type="text" placeholder="My Custom Template" class="field" />
        </div>

        <!-- Accent Color -->
        <div>
          <label class="block text-sm font-medium text-muted mb-2">Accent Color</label>
          <div class="flex items-center gap-3">
            <input v-model="template.accentColor" type="color" aria-label="Accent color" class="w-12 h-12 rounded-lg cursor-pointer border-2 border-line" />
            <input v-model="template.accentColor" type="text" aria-label="Accent color hex" class="field flex-1 font-mono text-sm" />
            <div class="flex gap-1">
              <button
                v-for="color in ['#16a34a', '#2563eb', '#9333ea', '#dc2626', '#ea580c', '#0891b2']"
                :key="color"
                @click="template.accentColor = color"
                :aria-label="`Accent ${color}`"
                class="w-8 h-8 rounded-lg border-2 transition"
                :class="template.accentColor === color ? 'border-content scale-110' : 'border-transparent hover:scale-105'"
                :style="{ backgroundColor: color }"
              ></button>
            </div>
          </div>
        </div>

        <!-- Text Color -->
        <div>
          <label class="block text-sm font-medium text-muted mb-2">Text Color</label>
          <div class="flex items-center gap-3">
            <input v-model="template.textColor" type="color" aria-label="Text color" class="w-12 h-12 rounded-lg cursor-pointer border-2 border-line" />
            <input v-model="template.textColor" type="text" aria-label="Text color hex" class="field flex-1 font-mono text-sm" />
            <div class="flex gap-1">
              <button
                v-for="color in ['#111827', '#374151', '#1e293b', '#0f172a']"
                :key="color"
                @click="template.textColor = color"
                :aria-label="`Text ${color}`"
                class="w-8 h-8 rounded-lg border-2 transition"
                :class="template.textColor === color ? 'border-content scale-110' : 'border-line hover:scale-105'"
                :style="{ backgroundColor: color }"
              ></button>
            </div>
          </div>
        </div>

        <!-- Header Style -->
        <div>
          <label class="block text-sm font-medium text-muted mb-2">Header Style</label>
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="style in headerStyles"
              :key="style.value"
              @click="template.headerStyle = style.value"
              class="p-3 border-2 rounded-xl text-left transition"
              :class="template.headerStyle === style.value ? 'border-primary bg-primary/10' : 'border-line hover:border-primary/50'"
            >
              <div class="font-medium text-sm text-content">{{ style.label }}</div>
              <div class="text-xs text-muted">{{ style.desc }}</div>
            </button>
          </div>
        </div>

        <!-- Preview — white "paper" preview of the PDF output; stays light. -->
        <div>
          <label class="block text-sm font-medium text-muted mb-2">Preview</label>
          <div class="border border-gray-200 rounded-xl p-4 bg-white">
            <div
              class="pb-3 mb-3"
              :class="{
                'border-b-2': template.headerStyle === 'underlined',
                'text-center': template.headerStyle === 'centered',
                'bg-gray-50 -mx-4 -mt-4 px-4 py-3 rounded-t-xl': template.headerStyle === 'boxed',
              }"
              :style="template.headerStyle === 'underlined' ? { borderColor: template.accentColor } : {}"
            >
              <h3 class="font-bold" :style="{ color: template.textColor }">Meeting Title</h3>
              <p class="text-xs text-gray-500">January 1, 2026</p>
            </div>
            <p class="text-sm" :style="{ color: template.textColor }">
              This is how your minutes content will appear...
            </p>
          </div>
        </div>
      </div>

      <div class="p-6 border-t border-line flex items-center justify-between">
        <div>
          <button
            v-if="template?.key && !template?.isDefault"
            @click="$emit('delete', template.key)"
            class="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition text-sm font-medium"
          >
            Delete Template
          </button>
        </div>
        <div class="flex items-center gap-3">
          <button @click="$emit('close')" class="px-4 py-2 text-muted hover:bg-surface-2 rounded-lg transition text-sm">
            Cancel
          </button>
          <button @click="save" class="btn-primary px-6 py-2 text-sm">
            {{ template?.isDefault ? 'Save as New' : 'Save Template' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  template: { type: Object, required: true },
  initialName: { type: String, default: '' },
});
const emit = defineEmits(['close', 'delete', 'save']);

const name = ref(props.initialName);

const headerStyles = [
  { value: 'simple', label: 'Simple', desc: 'Clean, no decoration' },
  { value: 'underlined', label: 'Underlined', desc: 'Accent color border' },
  { value: 'boxed', label: 'Boxed', desc: 'Background highlight' },
  { value: 'centered', label: 'Centered', desc: 'Center-aligned text' },
];

const save = () => {
  if (!name.value.trim()) {
    alert('Please enter a template name');
    return;
  }
  emit('save', name.value);
};
</script>

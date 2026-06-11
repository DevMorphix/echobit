<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6 border-b border-gray-100">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-900">
            {{ template?.key && !template?.isDefault ? 'Edit Template' : template?.isDefault ? 'Customize Template' : 'Create Template' }}
          </h2>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p v-if="template?.isDefault" class="text-sm text-amber-600 mt-2">
          Default templates can't be modified. Your changes will be saved as a new template.
        </p>
      </div>

      <div class="p-6 space-y-5">
        <!-- Template Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
          <input
            v-model="name"
            type="text"
            placeholder="My Custom Template"
            class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition"
          />
        </div>

        <!-- Accent Color -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
          <div class="flex items-center space-x-3">
            <input v-model="template.accentColor" type="color" class="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200" />
            <input v-model="template.accentColor" type="text" class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition font-mono text-sm" />
            <div class="flex space-x-1">
              <button
                v-for="color in ['#16a34a', '#2563eb', '#9333ea', '#dc2626', '#ea580c', '#0891b2']"
                :key="color"
                @click="template.accentColor = color"
                class="w-8 h-8 rounded-lg border-2 transition"
                :class="template.accentColor === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'"
                :style="{ backgroundColor: color }"
              ></button>
            </div>
          </div>
        </div>

        <!-- Text Color -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
          <div class="flex items-center space-x-3">
            <input v-model="template.textColor" type="color" class="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200" />
            <input v-model="template.textColor" type="text" class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition font-mono text-sm" />
            <div class="flex space-x-1">
              <button
                v-for="color in ['#111827', '#374151', '#1e293b', '#0f172a']"
                :key="color"
                @click="template.textColor = color"
                class="w-8 h-8 rounded-lg border-2 transition"
                :class="template.textColor === color ? 'border-gray-400 scale-110' : 'border-gray-200 hover:scale-105'"
                :style="{ backgroundColor: color }"
              ></button>
            </div>
          </div>
        </div>

        <!-- Header Style -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Header Style</label>
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="style in headerStyles"
              :key="style.value"
              @click="template.headerStyle = style.value"
              class="p-3 border-2 rounded-xl text-left transition"
              :class="template.headerStyle === style.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'"
            >
              <div class="font-medium text-sm text-gray-900">{{ style.label }}</div>
              <div class="text-xs text-gray-500">{{ style.desc }}</div>
            </button>
          </div>
        </div>

        <!-- Preview -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Preview</label>
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

      <div class="p-6 border-t border-gray-100 flex items-center justify-between">
        <div>
          <button
            v-if="template?.key && !template?.isDefault"
            @click="$emit('delete', template.key)"
            class="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium"
          >
            Delete Template
          </button>
        </div>
        <div class="flex items-center space-x-3">
          <button @click="$emit('close')" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm">
            Cancel
          </button>
          <button @click="save" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium">
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

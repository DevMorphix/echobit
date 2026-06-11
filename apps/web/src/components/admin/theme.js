import { computed } from 'vue';

/** Dark/light Tailwind class map used across all admin panel widgets. */
export const useAdminTheme = (isDark) =>
  computed(() => {
    const d = isDark.value;
    return {
      rootBg:    d ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900',
      sidebar:   d ? 'bg-gray-900 border-r border-gray-800' : 'bg-white border-r border-gray-200',
      sidebarActive: d ? 'bg-emerald-600/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700',
      sidebarItem:   d ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
      card:      d ? 'bg-gray-900 border border-gray-800 rounded-2xl' : 'bg-white border border-gray-200 rounded-2xl shadow-sm',
      cardInner: d ? 'bg-gray-800 rounded-xl' : 'bg-gray-100 rounded-xl',
      text:      d ? 'text-white'   : 'text-gray-900',
      textMuted: d ? 'text-gray-400' : 'text-gray-600',
      textFaint: d ? 'text-gray-500' : 'text-gray-400',
      input:     d ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                   : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',
      divide:    d ? 'divide-y divide-gray-800' : 'divide-y divide-gray-200',
      borderT:   d ? 'border-t border-gray-800' : 'border-t border-gray-200',
      borderB:   d ? 'border-b border-gray-800' : 'border-b border-gray-200',
      rowHover:  d ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50',
      btn:       d ? 'px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-300 disabled:opacity-40 hover:bg-gray-700 transition'
                   : 'px-3 py-1.5 text-xs rounded-lg bg-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-300 transition',
      avatar:    d ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-100 text-emerald-700',
      skeleton:  d ? 'animate-pulse bg-gray-800' : 'animate-pulse bg-gray-200',
      modal:     d ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200',
      drawer:    d ? 'bg-gray-900 border-l border-gray-800' : 'bg-white border-l border-gray-200',
      accent:    d ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-500',
    };
  });

// Render-function widgets for the admin panel (stat cards + SVG charts).
// Extracted verbatim from the old inline defineComponent blocks in AdminPanel.vue.

import { defineComponent, h } from 'vue';

export const StatCard = defineComponent({
  props: ['label', 'value', 'color', 'dark'],
  setup(props) {
    return () => {
      const d = props.dark !== false;
      const cardCls = d ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm';
      const textCls = d ? 'text-white' : 'text-gray-900';
      const mutedCls = d ? 'text-gray-500' : 'text-gray-400';
      const colorMap = {
        emerald: d ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
        green:   d ? 'bg-green-900/50 text-green-300'     : 'bg-green-50 text-green-700',
        blue:    d ? 'bg-blue-900/50 text-blue-300'       : 'bg-blue-50 text-blue-700',
        yellow:  d ? 'bg-yellow-900/50 text-yellow-300'   : 'bg-yellow-50 text-yellow-700',
      };
      const iconCls = colorMap[props.color] || colorMap.emerald;
      return h('div', { class: `${cardCls} rounded-2xl p-5 flex items-center gap-4` }, [
        h('div', { class: `w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconCls}` },
          h('span', { class: 'text-sm font-bold' }, props.value ?? '—'),
        ),
        h('div', {}, [
          h('p', { class: `text-2xl font-bold ${textCls} leading-none` }, props.value ?? '—'),
          h('p', { class: `text-xs ${mutedCls} mt-1` }, props.label),
        ]),
      ]);
    };
  },
});

export const DetailRow = defineComponent({
  props: ['label', 'value', 'dark'],
  setup(props) {
    return () => {
      const d = props.dark !== false;
      return h('div', { class: `${d ? 'bg-gray-800' : 'bg-gray-100'} rounded-xl px-4 py-3` }, [
        h('p', { class: `text-xs ${d ? 'text-gray-500' : 'text-gray-400'} mb-1` }, props.label),
        h('p', { class: `text-sm ${d ? 'text-white' : 'text-gray-900'} font-medium` }, props.value || '—'),
      ]);
    };
  },
});

export const BarChart = defineComponent({
  props: ['data', 'color', 'dark'],
  setup(props) {
    return () => {
      const data = props.data || [];
      if (!data.length) return h('div', { class: 'text-gray-500 text-sm py-4' }, 'No data');
      const W = 600, H = 80, gap = 1;
      const max = Math.max(...data.map((d) => d.count), 1);
      const barW = Math.floor((W - 20) / data.length) - gap;
      const labelEvery = Math.ceil(data.length / 7);
      const ax = props.dark !== false ? '#6b7280' : '#9ca3af';
      const nodes = [];
      data.forEach((d, i) => {
        const bH = Math.max(2, Math.round((d.count / max) * H));
        const x = 10 + i * (barW + gap);
        nodes.push(h('rect', { key: `b${i}`, x, y: H - bH, width: barW, height: bH, fill: props.color, rx: 2, opacity: 0.85 }));
        if (i % labelEvery === 0) nodes.push(h('text', { key: `l${i}`, x: x + barW / 2, y: H + 16, 'text-anchor': 'middle', 'font-size': 9, fill: ax }, d.date.slice(5)));
        if (d.count > 0) nodes.push(h('title', { key: `t${i}` }, `${d.date}: ${d.count}`));
      });
      nodes.push(h('text', { key: 'ymax', x: 4, y: 8, 'font-size': 9, fill: ax }, String(max)));
      return h('div', { class: 'overflow-x-auto' },
        h('svg', { viewBox: `0 0 ${W} ${H + 24}`, class: 'w-full', style: 'min-width:300px' }, nodes),
      );
    };
  },
});

export const AuthDonut = defineComponent({
  props: ['google', 'email'],
  setup(props) {
    return () => {
      const total = (props.google || 0) + (props.email || 0);
      if (!total) return h('div', { class: 'text-gray-500 text-sm' }, 'No data');
      const r = 36, cx = 50, cy = 50, circ = 2 * Math.PI * r;
      const googleArc = (props.google / total) * circ;
      return h('svg', { viewBox: '0 0 100 100', class: 'w-24 h-24 shrink-0', style: 'transform:rotate(-90deg)' }, [
        h('circle', { cx, cy, r, fill: 'none', stroke: '#10b981', 'stroke-width': 14, 'stroke-dasharray': `${circ} 0` }),
        h('circle', { cx, cy, r, fill: 'none', stroke: '#f97316', 'stroke-width': 14, 'stroke-dasharray': `${googleArc} ${circ - googleArc}` }),
      ]);
    };
  },
});

export const CostBarChart = defineComponent({
  props: ['data', 'dark'],
  setup(props) {
    return () => {
      const data = props.data || [];
      if (!data.length) return h('div', { class: 'text-gray-500 text-sm py-4' }, 'No data');
      const W = 600, H = 80, gap = 1;
      const maxVal = Math.max(...data.map((d) => d.total), 0.0001);
      const barW = Math.max(2, Math.floor((W - 20) / data.length) - gap);
      const labelEvery = Math.ceil(data.length / 7);
      const ax = props.dark !== false ? '#6b7280' : '#9ca3af';
      const nodes = [];
      data.forEach((d, i) => {
        const x = 10 + i * (barW + gap);
        const sH = Math.max(0, Math.round((d.sarvam / maxVal) * H));
        const gH = Math.max(0, Math.round((d.gemini / maxVal) * H));
        const stackH = Math.min(H, sH + gH);
        if (stackH > 0) {
          nodes.push(h('rect', { key: `g${i}`, x, y: H - stackH, width: barW, height: gH || stackH, fill: '#3b82f6', rx: 2, opacity: 0.85 }));
          if (sH > 0) nodes.push(h('rect', { key: `s${i}`, x, y: H - stackH + gH, width: barW, height: sH, fill: '#10b981', opacity: 0.85 }));
        }
        if (i % labelEvery === 0) nodes.push(h('text', { key: `l${i}`, x: x + barW / 2, y: H + 16, 'text-anchor': 'middle', 'font-size': 9, fill: ax }, d.date.slice(5)));
        if (d.total > 0) nodes.push(h('title', { key: `t${i}` }, `${d.date}: $${d.total.toFixed(5)}`));
      });
      nodes.push(h('text', { key: 'ymax', x: 4, y: 8, 'font-size': 9, fill: ax }, '$' + maxVal.toFixed(4)));
      return h('div', { class: 'overflow-x-auto' },
        h('svg', { viewBox: `0 0 ${W} ${H + 24}`, class: 'w-full', style: 'min-width:300px' }, nodes),
      );
    };
  },
});

// Shared formatting + badge-class helpers for the admin pages. Plain functions
// (the colour helpers take `isDark` since admin theming is class-based).

export function initials(name = '') {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function fmtDateShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDuration(sec) {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fmtHours(sec) { return ((sec || 0) / 3600).toFixed(1); }

export function fmtGB(bytes) {
  if (!bytes) return '0.00';
  if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(0) + ' MB';
  return (bytes / 1024 ** 3).toFixed(2) + ' GB';
}

export function fmtUSD(n) { return '$' + (n || 0).toFixed(4); }
export function fmtUSD2(n) { return '$' + (n || 0).toFixed(2); }

export function fmtM(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

export function fmtMin(m) {
  if (!m) return '0 min';
  if (m >= 60) return (m / 60).toFixed(1) + ' hr';
  return m.toFixed(1) + ' min';
}

export function daysLeft(d) {
  if (!d) return 0;
  return Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
}

export function planBadgeClass(plan, isDark) {
  if (plan === 'pro')  return isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700';
  if (plan === 'team') return isDark ? 'bg-blue-900/50 text-blue-400'       : 'bg-blue-100 text-blue-700';
  return isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500';
}

export function statusClass(s, isDark) {
  if (!s) return isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500';
  if (s === 'completed' || s === 'summarized') return isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700';
  if (s === 'transcribed') return isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700';
  if (s === 'failed')      return isDark ? 'bg-red-900/50 text-red-400'   : 'bg-red-100 text-red-700';
  if (s === 'pending')     return isDark ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-100 text-yellow-700';
  return isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500';
}

export function statusBarColor(s) {
  if (s === 'completed' || s === 'summarized') return 'bg-green-500';
  if (s === 'transcribed') return 'bg-blue-500';
  if (s === 'failed')      return 'bg-red-500';
  if (s === 'pending')     return 'bg-yellow-500';
  return 'bg-emerald-500';
}

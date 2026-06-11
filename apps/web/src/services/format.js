// Shared display formatters.

export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const statusClass = (status) => {
  const classes = {
    pending: 'bg-yellow-100 text-yellow-800',
    transcribing: 'bg-blue-100 text-blue-800',
    transcribed: 'bg-emerald-100 text-emerald-800',
    summarizing: 'bg-purple-100 text-purple-800',
    summarized: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };
  return classes[status] || classes.pending;
};

export const priorityClass = (priority) => {
  const classes = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };
  return classes[priority] || classes.medium;
};

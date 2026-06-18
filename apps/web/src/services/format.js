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

// Single source of truth for status/priority badge colours. Each value carries
// both a light and a `dark:` variant so badges stay legible in either theme.
// Pair with the `.badge` base class from style.css.

export const statusClass = (status) => {
  const classes = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    transcribing: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
    transcribed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    summarizing: 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300',
    summarized: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  };
  return classes[status] || classes.pending;
};

export const priorityClass = (priority) => {
  const classes = {
    high: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    low: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  };
  return classes[priority] || classes.medium;
};

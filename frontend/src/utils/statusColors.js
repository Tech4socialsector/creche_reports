// Maps a Select field's value to a badge color, by common word rather than
// per-doctype - any doctype's "status"-shaped Select field reuses the same
// handful of words (Active/Inactive/Pending/Completed/...). Applied to any
// field named "status" (case-insensitive) - not to every Select field, since
// most Select fields are categories, not states, and don't read naturally as
// "good/bad/pending".
const COLOR_BY_WORD = {
  active: 'green',
  approved: 'green',
  completed: 'green',
  submitted: 'green',
  paid: 'green',

  pending: 'amber',
  draft: 'amber',
  'in progress': 'amber',

  inactive: 'gray',
  closed: 'gray',
  cancelled: 'gray',

  rejected: 'red',
  overdue: 'red',
}

const BADGE_CLASSES = {
  green: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

// Same 4-color vocabulary as the badge, as raw hex - for the mobile card's
// left-border accent, which needs an actual color value (inline style)
// rather than a Tailwind class, so the whole card reads as "this record's
// status" at a glance without having to find the Status row inside it.
const BORDER_COLORS = {
  green: '#22c55e',
  amber: '#f59e0b',
  gray: '#9ca3af',
  red: '#ef4444',
}

export function statusBorderColor(value) {
  const color = COLOR_BY_WORD[String(value || '').toLowerCase()] || 'gray'
  return BORDER_COLORS[color]
}

export function isStatusLikeField(field) {
  if (field.fieldtype !== 'Select') return false
  return /(^|_)status$/i.test(field.fieldname)
}

// Falls back to gray (not blank/no styling) for a status value not in the
// shared vocabulary above - a doctype-specific word this list doesn't know
// yet should still read as "a status badge", just a neutral one, rather
// than silently rendering as plain unstyled text next to other fields that
// do have a badge.
export function statusBadgeClasses(value) {
  const color = COLOR_BY_WORD[String(value || '').toLowerCase()] || 'gray'
  return BADGE_CLASSES[color]
}

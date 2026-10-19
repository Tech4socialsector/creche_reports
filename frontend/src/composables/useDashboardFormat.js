// Shared formatting/threshold helpers for the Dashboard and its drill-down
// modals - kept as plain functions (not a composable needing setup-context)
// since none of this touches reactivity, just number/string formatting.
import { ref } from 'vue'

// Site-wide "show full numbers" toggle (the dashboard's own checkbox sets
// this). A plain module-level ref rather than a composable: formatInr is
// called directly from dozens of templates as a plain function, and Vue's
// render-effect tracks any ref `.value` read during render regardless of
// whether that read happens inside a wrapping function call - so flipping
// this ref alone is enough to re-render every formatInr(...) call site on
// the page without threading a prop through every component.
export const showFullNumbers = ref(false)

export function formatInr(value) {
  const v = parseFloat(value) || 0
  if (showFullNumbers.value) return '₹' + Math.round(v).toLocaleString('en-IN')
  const abs = Math.abs(v)
  if (abs >= 1e7) return '₹' + (v / 1e7).toFixed(2) + ' Cr'
  if (abs >= 1e5) return '₹' + (v / 1e5).toFixed(2) + ' L'
  if (abs >= 1e3) return '₹' + (v / 1e3).toFixed(1) + ' K'
  return '₹' + Math.round(v).toLocaleString('en-IN')
}

export function formatInrFull(value) {
  const v = parseFloat(value) || 0
  return '₹' + Math.round(v).toLocaleString('en-IN')
}

export function formatPct(value, digits = 1) {
  const v = parseFloat(value)
  if (!isFinite(v)) return '0%'
  return v.toFixed(digits) + '%'
}

export function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Green/amber/red thresholds for a utilisation-style percentage, used to
// color badges and card accents consistently across the dashboard.
export function pctColorClass(pct) {
  const v = parseFloat(pct) || 0
  if (v >= 85) return 'text-green-600 dark:text-green-400'
  if (v >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

export function pctBadgeClass(pct) {
  const v = parseFloat(pct) || 0
  if (v >= 85) return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  if (v >= 50) return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
}

// One accent identity per drill-metric type, reused across the donut
// charts, summary cards, breadcrumbs, and drill-modal headers so the same
// metric always "reads" the same color everywhere on the dashboard.
export const METRIC_THEME = {
  budget: { solid: '#2563eb', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', ring: 'ring-blue-100 dark:ring-blue-900/50', icon: 'indian-rupee' },
  disbursement: { solid: '#0891b2', text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/30', ring: 'ring-cyan-100 dark:ring-cyan-900/50', icon: 'banknote' },
  utilisation: { solid: '#16a34a', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30', ring: 'ring-green-100 dark:ring-green-900/50', icon: 'circle-check-big' },
  bank: { solid: '#db2777', text: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-900/30', ring: 'ring-pink-100 dark:ring-pink-900/50', icon: 'landmark' },
  warn: { solid: '#d97706', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', ring: 'ring-amber-100 dark:ring-amber-900/50', icon: 'triangle-alert' },
}

// Amount-cell coloring: negative is always a warning (over-utilised,
// over-spent, etc.), zero/positive uses the metric's own identity color
// where one is given, otherwise plain ink.
export function amountColorClass(value, metric) {
  if (value < 0) return 'text-red-600 dark:text-red-400'
  return metric ? METRIC_THEME[metric]?.text || 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
}

// A distinct accent per Operational Overview stat (separate from the
// financial METRIC_THEME palette above) so each of the 6 tiles - and its
// own drill-down modal - stays visually distinguishable at a glance.
// Colors are restricted to frappe-ui's own Tailwind preset palette (it
// replaces Tailwind's default `theme.colors` outright - no `indigo` or
// `rose` exist in this app at all, confirmed against
// node_modules/frappe-ui/tailwind/colorPalette.js's generateColorPalette()).
export const STAT_THEME = {
  partners: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', icon: 'users' },
  budgets: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', icon: 'briefcase' },
  creches: { bg: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', icon: 'house' },
  states: { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', icon: 'map-pin' },
  districts: { bg: 'bg-violet-50 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', icon: 'map' },
  blocks: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', icon: 'grid-3x3' },
}

export const MONTH_ORDER = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March',
]

export function sortMonthsFinancialYear(months) {
  return [...months].sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b))
}

// CSV-safe cell: wraps in quotes and escapes embedded quotes whenever the
// value itself contains a comma/quote/newline that would otherwise break
// column alignment on open in a spreadsheet app.
export function csvSafe(value) {
  const s = value == null ? '' : String(value)
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

export function buildMailto(email, subject, body) {
  const params = new URLSearchParams({ subject, body })
  return `mailto:${email}?${params.toString().replace(/\+/g, '%20')}`
}

// Relative "last updated" times for list rows, in a compact form: "23m", "5h".
//
// Frappe datetimes arrive as "YYYY-MM-DD HH:mm:ss[.ffffff]" in the site's time
// zone, with no zone marker - parsed here as local time, the same assumption
// the rest of the app makes for dates it shows.
export function parseServerDatetime(value) {
  if (!value) return null
  const date = new Date(String(value).replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? null : date
}

// Compact, like a chat app: "now", "23m", "5h", "3d", "2w", "4mo", "1y".
export function timeAgo(value) {
  const date = parseServerDatetime(value)
  if (!date) return ''
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  return `${Math.floor(days / 365)}y`
}

// The exact moment, for a hover tooltip.
export function fullDatetime(value) {
  const date = parseServerDatetime(value)
  return date ? date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''
}

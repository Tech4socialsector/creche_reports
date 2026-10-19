import { computed, watchEffect } from 'vue'
import { useCall } from 'frappe-ui'
import { currentTheme } from '@/data/theme'

// The app's configurable name/logo/login text, from App Setting
// (allow_guest=True on the backend so the Login page can show it too,
// before authentication).
export const brandingResource = useCall({
  url: '/api/v2/method/creche_reports.api.common.get_app_branding',
  method: 'GET',
  cacheKey: 'creche-reports-app-branding',
})

// Single source of truth for "which logo to render" - one fixed logo
// everywhere, in both light and dark mode (the Azim Premji Foundation mark
// already carries its own white card background, so it reads fine on any
// surface - no need for a separate dark-mode variant). No logo uploaded at
// all -> null, and callers fall back to a plain initial-letter mark (see
// AppSidebar.vue/Login.vue).
export const appLogo = computed(() => brandingResource.data?.app_logo)

export const appName = computed(() => brandingResource.data?.app_name || 'Creche Finance Reports')

// Kept as an alias of appLogo (not a separate dark-mode field) so every
// existing consumer - including the login page's always-colored brand
// panel - keeps working unchanged now that there's only one logo.
export const appLogoOnDark = appLogo

export const appVersion = computed(() => brandingResource.data?.app_version || null)

// Shown as a Help Desk shortcut in the sidebar - blank/unset hides it
// entirely rather than linking nowhere.
export const helpDeskUrl = computed(() => brandingResource.data?.help_desk_url || null)

// App Setting's Accent Color (a hex string, e.g. "#111827") drives
// the app's primary buttons, active nav state and other spots that used to
// hardcode gray-900 as "this is the brand color" - see index.css for
// exactly which classes read var(--app-accent)/var(--app-accent-hover).
//
// Falls back to the same near-black default the DocField itself declares
// (see creche_app_setting.json's accent_color field) so the app still
// looks exactly as it did before this setting existed when the branding
// call hasn't resolved yet (brandingResource.data is null on first load)
// or the field is left blank.
const DEFAULT_ACCENT = '#111827'
export const accentColor = computed(() => brandingResource.data?.accent_color || DEFAULT_ACCENT)

// A CSS custom property, not a Tailwind class swap - frappe-ui's own Button
// variant="solid" and this app's hand-rolled accent spots both read
// var(--app-accent)/var(--app-accent-hover) so one value picked in Creche
// App Setting re-colors every one of them at once, without a full Tailwind
// rebuild per color (impossible at runtime anyway - the color is
// admin-configurable data, not known at build time).
//
// Hover/active shades are computed from the same base color (not a
// second/third color field) - darkened for light backgrounds, lightened
// for dark ones.
function shade(hex, percent) {
  const clean = hex.replace('#', '')
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16)
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + percent))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + percent))
  const b = Math.max(0, Math.min(255, (num & 0xff) + percent))
  return `rgb(${r}, ${g}, ${b})`
}

watchEffect(() => {
  const color = accentColor.value
  const root = document.documentElement.style
  root.setProperty('--app-accent', color)
  const isDark = currentTheme.value === 'dark'
  root.setProperty('--app-accent-hover', shade(color, isDark ? 24 : -24))
  root.setProperty('--app-accent-active', shade(color, isDark ? 44 : -44))
})

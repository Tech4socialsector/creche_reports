import { useCall } from 'frappe-ui'
import { useRouter } from 'vue-router'
import { currentTheme } from '@/data/theme'
import { openCommandPalette } from '@/data/commandPalette'

// Admin-configurable keyboard shortcuts (see the "Keyboard Shortcut" doctype
// and creche_reports.api.keyboard_shortcuts.get_shortcuts) - fetched once via
// useCall, matching this app's existing data/*.js resource convention (see
// data/reportAccess.js, data/sidebarItems.js), then registered as ONE global
// keydown listener. Call useKeyboardShortcuts() exactly once, from the app's
// root shell (AppLayout.vue) - calling it from multiple components would
// register multiple competing listeners, each firing the same action once.
export const shortcutsResource = useCall({
  url: '/api/v2/method/creche_reports.api.keyboard_shortcuts.get_shortcuts',
  method: 'GET',
  cacheKey: 'creche-reports-keyboard-shortcuts',
})

// Only the fixed, small set of actions the "Action" Select field on the
// Keyboard Shortcut doctype offers - never a generic arbitrary-action
// executor. Each handler takes the Vue Router instance it needs to navigate.
//
// "Open Search" subtlety: CommandPalette (frappe-ui) already has its OWN
// hardcoded Ctrl+K/Cmd+K keydown listener built into the component itself
// (window.addEventListener('keydown', ...) checking e.key === 'k' &&
// (e.ctrlKey || e.metaKey)), which flips its own internal `show` v-model.
// Registering a SECOND independent listener here for the same combo would
// mean two listeners both calling preventDefault on the same keystroke -
// whichever runs first "wins" the browser default-prevention, and the two
// would fight over which one actually owns opening the palette. Instead,
// this action handler calls the exact same openCommandPalette() function
// AppSidebar's search button and MobileNav's search tab already call - so
// whether the user triggers it via a configured key_combo (this listener)
// or via CommandPalette's own built-in Ctrl+K (its internal listener), both
// paths converge on the same showCommandPalette ref, not two competing
// "open" writers each fighting the other's preventDefault.
const ACTIONS = {
  'Go to Dashboard': ({ router }) => router.push({ name: 'Dashboard' }),
  'Open Search': () => openCommandPalette(),
  'Toggle Theme': () => {
    currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
  },
}

// Parses a stored key_combo string (e.g. "mod+shift+k") the exact same way
// the desk client script captured it (keyboard_shortcut.js's
// normalize_combo()): "mod" matches either ctrlKey or metaKey (so one row
// works as Ctrl on Windows/Linux and Cmd on Mac), "shift"/"alt" match their
// own event flags, and the final token matches e.key.toLowerCase().
function comboMatches(combo, e) {
  const parts = combo.toLowerCase().split('+').map((p) => p.trim()).filter(Boolean)
  if (!parts.length) return false

  const key = parts[parts.length - 1]
  const modifiers = parts.slice(0, -1)

  if (e.key.toLowerCase() !== key) return false
  if (modifiers.includes('mod') && !(e.ctrlKey || e.metaKey)) return false
  if (!modifiers.includes('mod') && (e.ctrlKey || e.metaKey)) return false
  if (modifiers.includes('shift') !== e.shiftKey) return false
  if (modifiers.includes('alt') !== e.altKey) return false
  return true
}

// Guards against firing while the user is typing - same defensive pattern a
// real app needs, so a configured single-letter shortcut doesn't fire while
// someone's typing that letter into a search box or form field.
function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

// AppLayout.vue (where this is called) isn't a persistent wrapper mounted
// once around <router-view> - every page embeds its own <AppLayout>, so
// App.vue's keyed router-view actually tears down and remounts a fresh
// AppLayout instance on every navigation (see App.vue's :key on Component).
// Without this guard, calling useKeyboardShortcuts() from its setup() would
// add one more `window.addEventListener('keydown', ...)` on every single
// page visit, forever - this module-level flag makes registration a true
// once-per-app-load operation regardless of how many times the composable
// itself is invoked.
let listenerRegistered = false

// Call from the app's root shell (safe to call on every mount - see above).
// Registers the single global keydown listener for every enabled,
// admin-configured shortcut, exactly once for the life of the page.
export function useKeyboardShortcuts() {
  const router = useRouter()

  if (listenerRegistered) return
  listenerRegistered = true

  window.addEventListener('keydown', (e) => {
    if (isTypingTarget(e.target)) return
    const shortcuts = shortcutsResource.data || []
    for (const shortcut of shortcuts) {
      if (!comboMatches(shortcut.key_combo, e)) continue
      const action = ACTIONS[shortcut.action]
      if (!action) continue
      e.preventDefault()
      action({ router })
      return
    }
  })
}

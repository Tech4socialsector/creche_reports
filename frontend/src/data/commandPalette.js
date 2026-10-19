import { ref } from 'vue'

// Whether the shared CommandPalette (mounted once in AppLayout.vue) is open -
// same shared-ref-flips-a-mounted-once-component shape as data/mobileMenu.js's
// showMobileMenu and data/aiAssistant.js's assistantState.visible. Triggered
// from AppSidebar's search button (desktop), MobileNav's search tab (mobile),
// and useKeyboardShortcuts.js's "Open Search" action handler - see that
// composable's own comment on why it calls openCommandPalette() rather than
// registering a second, competing Ctrl+K listener alongside CommandPalette's
// own built-in one.
export const showCommandPalette = ref(false)

export function openCommandPalette() {
  showCommandPalette.value = true
}

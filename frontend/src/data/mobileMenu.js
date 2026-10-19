import { ref } from 'vue'

// Whether the mobile menu drawer (MobileNav.vue) is open. Shared so the menu
// button in the mobile top bar (MobileShell.vue) and the one in the bottom
// bar (if ever added) open the very same drawer.
export const showMobileMenu = ref(false)

export function openMobileMenu() {
  showMobileMenu.value = true
}

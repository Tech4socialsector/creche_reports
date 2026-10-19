<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t bg-white pb-[env(safe-area-inset-bottom)] dark:border-gray-800 dark:bg-gray-900"
  >
    <router-link
      :to="{ name: 'Dashboard' }"
      class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs"
      :class="route.name === 'Dashboard' ? 'nav-active' : 'text-gray-400 dark:text-gray-500'"
    >
      <LucideIcon name="panels-top-left" class="h-5 w-5" />
      Dashboard
    </router-link>

    <!-- Search used to only be reachable by opening the Menu drawer and
    tapping "Search" inside the embedded sidebar there (two taps) - a
    direct bottom-nav entry puts it one tap away, same as Dashboard/Menu. -->
    <button
      type="button"
      class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-gray-400 dark:text-gray-500"
      @click="openCommandPalette"
    >
      <LucideIcon name="search" class="h-5 w-5" />
      Search
    </button>

    <button
      v-if="assistantConfigResource.data?.enabled"
      type="button"
      class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-gray-400 dark:text-gray-500"
      @click="toggleAssistant"
    >
      <SparklesIcon class="h-5 w-5" />
      {{ assistantBotName }}
    </button>

    <button
      type="button"
      class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs"
      :class="showMenu ? 'nav-active' : 'text-gray-400 dark:text-gray-500'"
      @click="showMenu = true"
    >
      <LucideIcon name="menu" class="h-5 w-5" />
      Menu
    </button>
  </nav>

  <Transition name="menu-overlay">
    <div v-if="showMenu" class="fixed inset-0 z-40 bg-black/40" @click.self="showMenu = false">
      <Transition name="menu-drawer" appear>
        <div
          v-if="showMenu"
          class="h-full w-fit max-w-[80vw] overflow-y-auto bg-white pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] dark:bg-gray-900"
          @click="closeOnSelect"
        >
          <!-- frappe-ui's Sidebar renders at a fixed w-60 (240px) internally
          (disable-collapse keeps it from shrinking to w-12 below `sm`, but
          doesn't make it fill a wider wrapper). This panel needs w-fit, not
          just max-w-[80vw] alone - a block-level div with no width at all
          defaults to filling 100% of its parent (the fixed inset-0
          backdrop), so dropping the old fixed w-72 without replacing it
          left an invisible ~60px dead strip to the right of the actual
          w-60 menu content, inside the drawer's own hit/background area.
          w-fit shrinks the panel to its content's real width instead. -->
          <AppSidebar embedded />
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import LucideIcon from '@/components/LucideIcon.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import SparklesIcon from '@/components/SparklesIcon.vue'
import { showMobileMenu } from '@/data/mobileMenu'
import { showCommandPalette, openCommandPalette } from '@/data/commandPalette'
import { assistantState, assistantConfigResource, toggleAssistant } from '@/data/aiAssistant'
import { useBackButtonClose } from '@/composables/useBackButtonClose'

const route = useRoute()
const showMenu = showMobileMenu
const assistantBotName = computed(() => assistantConfigResource.data?.bot_name || 'Assistant')

// The device's back button/gesture closes this drawer first, the way it
// would dismiss any other overlay in a native app, instead of leaving the
// page or the app underneath it.
useBackButtonClose(showMenu)

// Picking anything in the drawer closes it, whatever it does - including a
// link to the page you're already on (which changes no route, so the route
// watch below would never fire).
function closeOnSelect(event) {
  const control = event.target instanceof Element ? event.target.closest('a, button') : null
  if (!control) return
  showMenu.value = false
}

// AppSidebar's own items navigate via router-link - close the drawer
// whenever that happens, the same way tapping a link in a mobile drawer
// normally dismisses it. CommandPalette closes itself on selection already,
// but a route change from elsewhere (e.g. the back button) should still
// dismiss it rather than leaving a stale overlay open over a new page.
watch(() => route.fullPath, () => {
  showMenu.value = false
  showCommandPalette.value = false
})

// The assistant trigger inside the embedded sidebar doesn't navigate - it
// just flips this shared ref, so the route watch above never fires for it.
watch(() => assistantState.visible, (open) => {
  if (open) showMenu.value = false
})
</script>

<style scoped>
.nav-active {
  color: theme('colors.gray.900');
}
:global(.dark) .nav-active {
  color: theme('colors.gray.100');
}

.menu-overlay-enter-active,
.menu-overlay-leave-active {
  transition: opacity 0.2s ease;
}
.menu-overlay-enter-from,
.menu-overlay-leave-to {
  opacity: 0;
}

.menu-drawer-enter-active,
.menu-drawer-leave-active {
  transition: transform 0.2s ease;
}
.menu-drawer-enter-from,
.menu-drawer-leave-to {
  transform: translateX(-100%);
}
</style>

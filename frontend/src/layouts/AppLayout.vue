<template>
  <MobileShell v-if="isMobile">
    <slot />
  </MobileShell>

  <!-- fixed inset-0, not h-screen: 100vh can go stale after the browser's
  viewport changes (closing DevTools, leaving responsive mode) and leave the
  shell stopping short of the window with a blank band below it. Pinning to
  the window edges always matches the real size. -->
  <div v-else class="fixed inset-0 flex bg-surface-white text-ink-gray-8">
    <AppSidebar />
    <div class="flex min-w-0 flex-1 flex-col">
      <TopNavbar />
      <main class="flex-1 overflow-y-auto bg-surface-white px-5 py-4 sm:px-6">
        <slot />
      </main>
    </div>
  </div>

  <!-- Mounted once here (not inside AppSidebar) so it exists regardless of
  which shell is active - AppSidebar itself renders a second time, embedded,
  inside MobileNav's drawer on mobile, and a <Dialog> mounted there would
  disappear the moment that drawer closes. -->
  <AiAssistant />

  <!-- The one shared CommandPalette instance for the whole app - same
  "mount once here, trigger from multiple places" pattern as AiAssistant
  above. AppSidebar's search button (desktop) and MobileNav's search tab
  (mobile) both just flip showCommandPalette open rather than each managing
  their own dropdown/overlay. -->
  <CommandPalette
    v-model:show="showCommandPalette"
    v-model:search-query="searchQuery"
    :groups="groups"
    @select="onSelect"
  />
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { CommandPalette } from 'frappe-ui'
import AppSidebar from '@/components/AppSidebar.vue'
import TopNavbar from '@/components/TopNavbar.vue'
import MobileShell from '@/components/MobileShell.vue'
import AiAssistant from '@/components/AiAssistant.vue'
import CommandPaletteItem from '@/components/CommandPaletteItem.vue'
import { showCommandPalette } from '@/data/commandPalette'
import { useGlobalSearch } from '@/composables/useGlobalSearch'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'

// Below Tailwind's own `sm` (640px) switches to the bottom-nav mobile
// shell instead of the persistent desktop sidebar - matches every other
// `sm:` breakpoint already used throughout this app's pages (grids,
// PageHeader actions, etc.), so content built for "desktop vs small
// screen" lines up with where the shell itself switches.
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')

const router = useRouter()

// Registers the single global keydown listener for admin-configured
// shortcuts (see the "Keyboard Shortcut" doctype) - called once here, the
// app's root shell, not per-component.
useKeyboardShortcuts()

// The same shared search logic the old per-shell search overlays used before
// migrating to one shared CommandPalette - only the RENDERING differs now
// (CommandPalette instead of each shell's own custom markup). See
// useGlobalSearch.js for the nav items + Frappe global search blend itself.
const { searchQuery, navSearchResults, recordSearchResults, reset, openHit } = useGlobalSearch()

// CommandPalette's groups/items shape: each item needs its own `name` (the
// Combobox option's unique value) plus whatever CommandPaletteItem.vue reads
// to render it (icon/title/description) - see that component.
const groups = computed(() => [
  {
    title: 'Pages',
    component: CommandPaletteItem,
    items: navSearchResults.value.map((item) => ({
      name: `nav-${item.label}`,
      kind: 'nav',
      icon: item.icon,
      title: item.label,
      navItem: item,
    })),
  },
  {
    title: 'Records',
    component: CommandPaletteItem,
    items: recordSearchResults.value.map((hit) => ({
      name: `record-${hit.doctype}-${hit.name}`,
      kind: 'record',
      title: hit.title,
      description: hit.doctype,
      hit,
    })),
  },
])

// CommandPalette itself only closes `show` on select (see its own select()) -
// it never navigates, since it has no idea what a `nav` item's `to` even
// means. This is the one place that actually pushes the route / opens the
// record, for whichever kind of item was picked.
function onSelect(item) {
  if (!item) return
  if (item.kind === 'nav') {
    router.push(item.navItem.to)
  } else if (item.kind === 'record') {
    openHit(item.hit)
  }
}

// CommandPalette only clears searchQuery on its Dialog's @after-leave (its
// own internal state) - it never clears recordSearchResults/stops a pending
// debounced search. reset() (useGlobalSearch's own) handles the rest, so a
// fresh open never flashes the previous query's stale results for a frame.
watch(showCommandPalette, (open) => {
  if (!open) reset()
})
</script>

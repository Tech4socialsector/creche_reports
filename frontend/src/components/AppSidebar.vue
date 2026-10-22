<template>
  <div class="app-sidebar flex h-full flex-shrink-0">
    <Sidebar v-model:collapsed="collapsed" :disable-collapse="embedded">
      <!-- frappe-ui's own SidebarHeader hardcodes a 32x32 square logo slot -
      too small/square for the Azim Premji Foundation wordmark (icon + full
      "Azim Premji Foundation" text), so this replaces it entirely with a
      wider layout that still keeps the same dropdown-menu behavior. -->
      <template #header>
        <Dropdown :options="menuItems" placement="left">
          <template #default="{ open }">
            <button
              type="button"
              class="flex h-12 w-full items-center gap-2 rounded-md px-2 py-2 duration-300 ease-in-out"
              :class="open ? 'bg-surface-white shadow-sm' : 'hover:bg-surface-gray-3'"
            >
              <!-- The full wordmark (icon + "Azim Premji Foundation" text)
              only reads properly at a wide aspect ratio - collapsed to the
              12px rail there's no honest way to show it, so collapsed falls
              back to the same initial-letter mark used when no logo is
              configured at all, rather than showing an unreadable sliver of
              a squeezed-down wordmark. -->
              <img
                v-if="appLogo && !collapsed"
                :src="appLogo"
                class="h-8 max-w-[4.5rem] flex-shrink-0 object-contain object-left"
                alt="App logo"
                @click.stop="goHome"
              />
              <span
                v-else
                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-surface-gray-4 text-ink-gray-7"
                @click.stop="goHome"
              >
                {{ appName.charAt(0).toUpperCase() }}
              </span>
              <div
                class="flex flex-1 flex-col truncate text-left duration-300 ease-in-out"
                :class="collapsed ? 'ml-0 w-0 overflow-hidden opacity-0' : 'ml-1 w-auto opacity-100'"
              >
                <!-- The app's own name, distinct from the account row below
                it (the signed-in user) - the branding button shows both,
                same as it did before the header was widened for the
                wordmark logo. Single line, truncated with an ellipsis if it
                doesn't fit (not wrapped to two lines) - a one-line header
                keeps this row's height fixed/predictable rather than
                varying with however long the configured app name happens to
                be. The Tooltip (disabled unless actually truncated, same
                convention frappe-ui's own SidebarItem uses for its nav
                labels) still surfaces the full name on hover/long-press. -->
                <Tooltip :text="appName" :disabled="!appNameTruncated" hover-delay="0.4">
                  <div ref="appNameRef" class="truncate text-sm font-medium text-ink-gray-8 leading-none">{{ appName }}</div>
                </Tooltip>
                <div class="mt-1 truncate text-[11px] text-ink-gray-5 leading-none">{{ session.full_name || session.user }}</div>
              </div>
              <LucideIcon
                name="chevron-down"
                class="h-4 w-4 flex-shrink-0 text-ink-gray-7 duration-300 ease-in-out"
                :class="collapsed ? 'ml-0 w-0 overflow-hidden opacity-0' : 'ml-1 w-auto opacity-100'"
              />
            </button>
          </template>
        </Dropdown>

        <!-- Search / Help Desk / Notifications, same shape as Frappe Cloud's
        and Helpdesk's own sidebars: a couple of fixed utility rows right
        under the branding button, a divider, then the doctype-driven nav
        below. Collapsed to the 12px rail there's no room for an inline
        search input, so this whole block hides there instead of rendering
        an unusable half-cut text field. This button no longer manages its
        own dropdown/results - it just opens the one shared CommandPalette
        (mounted once in AppLayout.vue), same as MobileNav's search tab. -->
        <template v-if="!collapsed">
          <div class="relative mt-2 flex flex-col gap-0.5">
            <button
              type="button"
              class="flex h-7 w-full items-center gap-2 rounded px-2 py-1 text-ink-gray-6 hover:bg-surface-gray-2"
              @click="openCommandPalette"
            >
              <LucideIcon name="search" class="size-4 flex-shrink-0" />
              <span class="flex-1 truncate text-left text-sm">Search</span>
              <KeyboardShortcut combo="Mod+K" bg />
            </button>

            <!-- A real <a> rather than SidebarItem's own :on-click +
            window.open() - some browsers' popup blockers can swallow a
            window.open() call made from inside a Vue click handler (it
            isn't always recognized as "the direct result of a user
            gesture" the way a native anchor's own navigation always is),
            which was silently no-opping this link. An anchor sidesteps
            that entirely. -->
            <a
              v-if="helpDeskUrl"
              :href="helpDeskUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="flex h-7 w-full items-center gap-2 rounded px-2 py-1 text-ink-gray-6 hover:bg-surface-gray-2"
            >
              <LucideIcon :name="'life-buoy'" class="size-4 flex-shrink-0" />
              <span class="flex-1 truncate text-left text-sm">Help Desk</span>
            </a>
            <SidebarItem
              label="Notifications"
              :icon="navIcon('bell')"
              :on-click="() => window.open('/app/notification-log', '_self')"
            />
          </div>

          <hr class="my-2 border-t border-outline-gray-1" />
        </template>

        <!-- One interleaved list, in sequence_id order (see navEntries'
        own comment for why leaves and groups used to never share an
        order at all) - everything renders inside #header now (the only
        slot Sidebar.vue places before its own :sections loop, which this
        app no longer uses for its nav at all), picking SidebarItem or
        SidebarGroupSection per entry's own `kind`. Groups still need
        SidebarGroupSection specifically (not frappe-ui's own
        SidebarSection) since a plain SidebarSection's header can't also
        navigate on click - see that component's own comment.

        Wrapped in its own scroll container (nav-scroll, styled below) -
        frappe-ui's Sidebar.vue puts overflow-y-auto on its OUTER root div,
        which wraps the branding button/search/help-desk block above AND
        the footer-items/Collapse row below this nav list, all as one
        scrolling unit. A long enough nav list (several groups expanded)
        then scrolls the WHOLE sidebar together, carrying the branding
        header and the Auditor/Collapse footer out of view with it, instead
        of just these nav rows scrolling while the chrome around them stays
        put - see this file's own <style> block for the fix (caps the
        outer root's own overflow, makes this div the one scrollable
        area). -->
        <div class="nav-scroll min-h-0 flex-1 overflow-y-auto">
          <template v-for="entry in navEntries" :key="entry.label">
            <SidebarItem
              v-if="entry.kind === 'leaf'"
              :label="entry.label"
              :icon="entry.icon"
              :to="entry.to"
              :is-active="entry.isActive"
            />
            <SidebarGroupSection
              v-else
              :label="entry.label"
              :icon="entry.icon"
              :items="entry.items"
              :first-item="entry.items[0]"
              :is-sidebar-collapsed="sidebarCollapsed"
            />
          </template>
        </div>
      </template>

      <template #footer-items="{ isCollapsed }">
        <!-- Same divider the header uses to separate search/Help Desk/
        Notifications from the nav list below it (line ~152) - without one
        here, the footer's own mt-auto bottom-pinning (frappe-ui's
        Sidebar.vue) leaves a visually unexplained gap between the last nav
        item and this card on any screen taller than the nav list itself,
        reading as a rendering glitch rather than an intentional "pinned to
        the bottom" section. -->
        <hr class="mb-2 border-t border-outline-gray-1" />
        <Tooltip :text="`Ask ${assistantBotName}`" :disabled="!isCollapsed">
          <button
            v-if="assistantConfigResource.data?.enabled"
            type="button"
            class="assistant-card relative flex w-full items-center gap-2 overflow-hidden rounded-lg border border-outline-gray-1 bg-surface-gray-1 px-2 py-1.5 text-left hover:bg-surface-gray-2"
            :class="{ 'justify-center': isCollapsed }"
            @click="toggleAssistant"
          >
            <span class="assistant-badge flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-white shadow-sm" :style="{ background: `linear-gradient(135deg, ${accentColor}, ${shade(accentColor, -30)})` }">
              <SparklesIcon class="h-3.5 w-3.5" />
            </span>
            <span v-if="!isCollapsed" class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-ink-gray-8">
                {{ assistantBotName }}
              </span>
              <span class="block text-xs leading-snug text-ink-gray-5">Ask about budgets and reports</span>
            </span>
            <LucideIcon v-if="!isCollapsed" name="arrow-up-right" class="h-3.5 w-3.5 flex-shrink-0 text-ink-gray-4" />
          </button>
        </Tooltip>
        <div v-if="!isCollapsed" class="mt-1 flex items-center justify-center gap-1.5 px-2 text-xs text-ink-gray-4">
          <span class="truncate">{{ appName }}</span>
          <span v-if="appVersion">· {{ appVersion }}</span>
        </div>
      </template>
    </Sidebar>
  </div>
</template>

<style>
/* Plain (unscoped), not scoped + :deep() - that combination was silently
vanishing from the production build's minified CSS (confirmed via direct
compiler testing: Vue's own compileStyleAsync produces correct
scoped+:deep() output for this exact rule, and it IS present in an
unminified dev build, but esbuild's CSS minifier drops it in the real
production build - something about the pairing of a plain class selector
before :deep() in THIS file specifically wasn't surviving minification,
unlike the same pattern in SidebarGroupSection.vue, which compiles/minifies
fine). An unscoped class selector reaches into child component markup
without any :deep() wrapper needed at all, sidestepping the bug entirely
rather than continuing to chase its root cause in the Vue/Vite toolchain.

frappe-ui's Sidebar.vue hardcodes its expanded rail to w-60 (240px) with no
prop to configure it - too narrow for the full app name ("Creche Finance
Reports") next to the logo/chevron in the header button, truncating it to
"Creche Financ...". Widened just the expanded state here; the collapsed
w-12 icon-only rail is untouched. MobileNav's embedded copy sizes itself
with w-fit off this same element, so it picks up the new width too instead
of needing a separate change there. 17rem is what the current app name
("Creche Finance MIS") measured as actually needing - at its own text-sm
(13px) size - to fit on one line with zero truncation, plus a small margin
so small cross-browser font-rendering differences can't tip it back into
an ellipsis. Narrower than that reintroduces the truncation this header is
specifically trying to avoid. */
.app-sidebar .w-60 {
  width: 17rem;
}
/* Windows' own display scaling (125%/150% is the common laptop default,
vs. 100% typical on Mac/Linux) reports a smaller effective window.innerWidth
in CSS pixels even on a physically large/high-res screen - the browser
itself already accounts for this correctly (CSS pixels, not device
pixels), but a FIXED 17rem sidebar then eats a visibly bigger share of
that smaller effective viewport, squeezing the remaining content into less
room than this app's own breakpoints (xl/2xl grids, modal widths, etc.)
assume is available - that's what reads as "everything looks too big" on a
scaled Windows screen, not a sizing bug specific to Windows itself. Giving
the sidebar back some of that room on tighter viewports keeps the content
area closer to what those breakpoints were actually designed around. Tied
to max-width (viewport), not a sidebar-local container query - this
version of Tailwind has no native container query support, and the
mismatch is fundamentally about viewport vs. content width anyway, which a
viewport media query already addresses directly. */
@media (max-width: 1600px) {
  .app-sidebar .w-60 {
    width: 12rem;
  }
}
@media (max-width: 1366px) {
  .app-sidebar .w-60 {
    width: 11rem;
  }
}

/* frappe-ui's own SidebarItem.vue hardcodes text-sm (0.875rem) on every nav
row's label with no size prop to configure it - this app's own nav list is
mostly single-line doctype names (not long sentences), so a smaller size
reads just as clearly while taking noticeably less of the now-narrower
rail's width, matching SidebarGroupSection.vue's own sub-item/group-header
sizing below. .nav-scroll scopes this to the actual nav rows only, not
every other text-sm element elsewhere in the sidebar (Search/Help Desk
labels, the Auditor card) which keep their original size. */
.app-sidebar .nav-scroll .text-sm {
  font-size: 0.8125rem;
}

/* frappe-ui's Sidebar.vue hardcodes overflow-y-auto on its own OUTER root
div (the one with flex h-full flex-col ... p-2), which wraps the branding
header, search/help-desk, the nav list, AND the footer-items/Collapse
block all together - the whole sidebar scrolls as one unit once the nav
list (the only part that can actually grow long - several expanded groups)
exceeds the viewport height, instead of just the nav rows scrolling while
the branding header stays fixed at top and the Auditor/Collapse footer
stays pinned at bottom. Capping the outer root's own overflow here and
letting .nav-scroll (wrapped around the nav entries in the template above)
be the one scrollable area reproduces the same outer-clip/inner-scroll
pattern already used for the dashboard drill-down modals and dialogs
elsewhere in this app. */
.app-sidebar .flex-col.overflow-y-auto {
  overflow: hidden;
}
.app-sidebar .nav-scroll {
  overscroll-behavior: contain;
}
</style>

<style scoped>

/* The assistant row reads as a real card (border + fill) rather than a
plain hover-only row like the other sidebar items - a soft glow sweeps
behind it on a loop via ::before (under the icon/text, which get
position:relative + z-index above it) so the whole card reads as
"alive," not just the small icon badge. */
.assistant-card {
  animation: assistant-card-glow 3.2s ease-in-out infinite;
}
.assistant-card::before {
  content: '';
  position: absolute;
  inset: -40% -10%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.35), transparent 70%);
  animation: assistant-card-sweep 3.2s ease-in-out infinite;
  pointer-events: none;
}
.assistant-card > * {
  position: relative;
  z-index: 1;
}

@keyframes assistant-card-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
  }
  50% {
    box-shadow: 0 0 12px 1px rgba(99, 102, 241, 0.25);
  }
}

@keyframes assistant-card-sweep {
  0%, 100% {
    transform: translateX(-20%);
    opacity: 0.5;
  }
  50% {
    transform: translateX(20%);
    opacity: 1;
  }
}

/* A breathing glow, not a literal on/off blink - a hard blink reads as an
alert/error state on something that's just inviting a tap. */
.assistant-badge {
  position: relative;
  animation: assistant-badge-breathe 2.4s ease-in-out infinite;
}
.assistant-badge::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: inherit;
  animation: assistant-badge-ping 2.4s ease-out infinite;
  pointer-events: none;
}

@keyframes assistant-badge-breathe {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
}

@keyframes assistant-badge-ping {
  0% {
    opacity: 0.35;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.7);
  }
}

@media (prefers-reduced-motion: reduce) {
  .assistant-card,
  .assistant-card::before,
  .assistant-badge,
  .assistant-badge::after {
    animation: none;
  }
}

</style>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { Dropdown, KeyboardShortcut, Sidebar, SidebarItem, Tooltip } from 'frappe-ui'
import LucideIcon from '@/components/LucideIcon.vue'
import SparklesIcon from '@/components/SparklesIcon.vue'
import SidebarGroupSection from '@/components/SidebarGroupSection.vue'
import navIcon from '@/components/navIcon'
import { session, logoutResource } from '@/data/session'
import { assistantConfigResource, toggleAssistant } from '@/data/aiAssistant'
import { appName, appLogo, appVersion, accentColor, helpDeskUrl } from '@/data/branding'
import { openCommandPalette } from '@/data/commandPalette'
import { sidebarItemsResource } from '@/data/sidebarItems'

const props = defineProps({
  // Rendered inside MobileNav's drawer rather than as the persistent
  // desktop rail: no collapse toggle (there's no room to re-expand it
  // without the desktop rail's own click target).
  embedded: { type: Boolean, default: false },
})

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)

// Drives the app-name Tooltip's :disabled above - only actually shows a
// tooltip when the name is genuinely cut off by its own truncate class
// (scrollWidth > clientWidth), not unconditionally on every hover. Checked
// via ResizeObserver (not just once on mount) since the comparison can flip
// either way after mount: the sidebar's own width changes at the
// Windows-scaling breakpoints (see this file's own .w-60 media queries),
// and collapsing/expanding the rail changes this element's width too.
const appNameRef = ref(null)
const appNameTruncated = ref(false)
let appNameResizeObserver = null
watch(appNameRef, (el) => {
  appNameResizeObserver?.disconnect()
  if (!el) return
  const check = () => {
    appNameTruncated.value = el.scrollWidth > el.clientWidth
  }
  appNameResizeObserver = new ResizeObserver(check)
  appNameResizeObserver.observe(el)
  check()
})
onBeforeUnmount(() => appNameResizeObserver?.disconnect())

// frappe-ui's own Sidebar.vue computes this same thing internally as
// `shouldCollapse` ((isCollapsed || isMobile) && !disableCollapse) and
// provides only the raw v-model `isCollapsed` ref under the
// 'isSidebarCollapsed' injection key - NOT this derived value. A naive
// `inject('isSidebarCollapsed')` (as SidebarSection.vue itself does, and as
// an earlier version of this app's own SidebarGroupSection.vue copied)
// misses the isMobile/disableCollapse auto-collapse case entirely: on a
// narrow desktop window the rail visually shrinks to w-12 via isMobile
// without the user ever toggling `collapsed`, so that injected value would
// stay false while the rail is actually icon-only - recomputed the same
// way here and passed down explicitly as a prop instead of relying on
// inject for this component's own group sections.
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobileViewport = breakpoints.smaller('sm')
const sidebarCollapsed = computed(() => (collapsed.value || isMobileViewport.value) && !props.embedded)

const assistantBotName = computed(() => assistantConfigResource.data?.bot_name || 'Assistant')

// Clicking the logo (not the rest of the header button) goes to the
// Dashboard instead of opening the account menu - @click.stop on the img/
// fallback span keeps this separate from the button's own Dropdown trigger.
function goHome() {
  router.push({ name: 'Dashboard' })
}

// Same small hex-shade helper duplicated in Login.vue/branding.js - used
// here for the assistant card's icon tile gradient (a darker variant of the
// app's own accent color), not worth promoting to a shared export for one
// line of math reused in a couple of places.
function shade(hex, percent) {
  const clean = hex.replace('#', '')
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16)
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + percent))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + percent))
  const b = Math.max(0, Math.min(255, (num & 0xff) + percent))
  return `rgb(${r}, ${g}, ${b})`
}

// Note: frappe-ui's Dropdown menu items only take the fast Lucide CSS-class
// path (see node_modules/frappe-ui's isLucideIconString()) for a string
// prefixed `lucide-`; anything else falls through to frappe-ui's own
// internal (feather-icons-based) FeatherIcon, which this app no longer
// wants to render from.
const menuItems = [
  {
    label: 'Go to Desk',
    icon: 'lucide-grid',
    onClick: () => window.open('/app', '_self'),
  },
  {
    label: 'Logout',
    icon: 'lucide-log-out',
    onClick: () => logoutResource.submit(),
  },
]

// get_sidebar_items() leaves have `doctype: null` for a built-in page (set
// via Sidebar Item's own Page select, see api/sidebar.py's CUSTOM_PAGES) -
// router.js has a dedicated named route for each of these, not the generic
// :doctypeRoute path a doctype-backed leaf uses, so this maps the route
// slug the backend already resolved (budget-import-template, etc.) to the
// matching named Vue route. Kept in sync with useGlobalSearch.js's own copy
// (duplicated rather than imported, same reasoning as every other small
// shared map in this app - see api/sidebar.py's own comment on
// ROUTE_BY_DOCTYPE).
const NAMED_ROUTE_BY_SLUG = {
  dashboard: 'Dashboard',
  'budget-import-template': 'BudgetImportTemplate',
  'utilisation-import-template': 'UtilisationImportTemplate',
  'budget-utilisation-report': 'BudgetUtilisationReport',
}

// Turn a plain nav entry into the shape SidebarItem/SidebarGroupSection need
// (resolved `to` route + `isActive`) - sidebarItemsResource's API-driven
// doctype-backed leaves (`{ label, icon, route }`, a :doctypeRoute slug) and
// its API-driven page_route-backed leaves (`{ label, icon, route }` too, but
// the slug resolves to a named route via NAMED_ROUTE_BY_SLUG instead).
function toNavItem(entry) {
  const namedRoute = entry.namedRoute || NAMED_ROUTE_BY_SLUG[entry.route]
  return {
    label: entry.label,
    icon: navIcon(entry.icon || 'file-text'),
    to: namedRoute ? { name: namedRoute } : { name: 'DoctypeList', params: { doctypeRoute: entry.route } },
    isActive: namedRoute ? route.name === namedRoute : route.params.doctypeRoute === entry.route,
  }
}

// ── FIX ──
// Top-level leaf items (Dashboard, etc.) and groups (Home, Creche Partners,
// etc.) used to render through two entirely separate mechanisms - leaves via
// frappe-ui's own :sections prop (rendered by Sidebar.vue AFTER its #header
// slot, unconditionally), groups via SidebarGroupSection inside #header
// (rendered BEFORE :sections, since a plain SidebarSection's header can't
// also navigate on click - see that component's own comment). That split
// meant every group always rendered before every leaf, regardless of each
// one's own sequence_id from the Sidebar Item doctype - an admin reordering
// Dashboard to sequence_id 1 would never actually move it above any group,
// since leaves and groups were never part of the same ordered list to begin
// with. navEntries below is ONE list, in the API's own order (which already
// reflects sequence_id - see get_sidebar_items' own order_by), each tagged
// `kind: 'leaf' | 'group'` so the template can pick SidebarItem vs
// SidebarGroupSection per entry while walking a single v-for - leaves and
// groups can now actually interleave in whatever order their sequence_id
// puts them in.
const navEntries = computed(() =>
  (sidebarItemsResource.data || []).map((item) =>
    item.is_group
      ? { kind: 'group', label: item.label, icon: item.icon, items: item.children.map(toNavItem) }
      : { kind: 'leaf', ...toNavItem(item) },
  ),
)
</script>

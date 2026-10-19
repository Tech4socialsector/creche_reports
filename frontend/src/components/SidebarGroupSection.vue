<template>
  <div class="flex flex-col mt-2">
    <!-- Same card look a leaf SidebarItem gets (rounded hover-fill button,
    an icon, consistent px-2 py-1 padding, and - like frappe-ui's own
    SidebarItem - a persistent selected background rather than just a hover
    one whenever the active route is inside this group) - this used to be a
    bare text label with no background/icon/selected-state at all, which
    read as a different, lesser kind of row than every other item in the
    sidebar instead of matching them. -->
    <button
      type="button"
      class="group flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-all ease-in-out"
      :class="isActive ? '!bg-surface-selected shadow-sm' : 'hover:bg-surface-gray-2'"
      @click="onHeaderClick"
    >
      <LucideIcon :name="icon || 'folder'" class="size-4 flex-shrink-0 text-ink-gray-7" />
      <!-- Same text-sm size as a sub-item's own label (below), but
      font-medium and a darker ink shade than a leaf's plain
      text-ink-gray-6 - the group header still reads as the "main item"
      through weight/color alone, not through a bigger font size. -->
      <h3
        class="h-4 flex-1 truncate text-sm font-medium text-ink-gray-8 transition-all duration-300 ease-in-out"
        :class="isSidebarCollapsed ? 'ml-0 w-0 overflow-hidden opacity-0' : 'ml-0 w-auto opacity-100'"
      >
        {{ label }}
      </h3>
      <LucideIcon
        v-if="!isSidebarCollapsed"
        name="chevron-right"
        class="h-5 w-5 flex-shrink-0 text-ink-gray-5 transition-all duration-300 ease-in-out"
        :class="{ 'rotate-90': !isCollapsed }"
      />
      <div
        v-if="isSidebarCollapsed"
        class="absolute top-0 left-0 flex h-full w-full items-center justify-center transition-all duration-300 ease-in-out"
      >
        <hr class="w-full border-t border-ink-gray-3" />
      </div>
    </button>
    <transition
      enter-active-class="duration-300 ease-in"
      leave-active-class="duration-300 ease-[cubic-bezier(0, 1, 0.5, 1)]"
      enter-to-class="max-h-[200px] overflow-hidden"
      leave-from-class="max-h-[200px] overflow-hidden"
      enter-from-class="max-h-0 overflow-hidden"
      leave-to-class="max-h-0 overflow-hidden"
    >
      <nav v-if="!isCollapsed" class="mt-1 space-y-0.5">
        <div
          v-for="item in items"
          :key="item.label"
          class="relative"
          :class="isSidebarCollapsed ? '' : 'pl-4'"
        >
          <template v-if="!isSidebarCollapsed">
            <!-- Tree connector lines - a vertical rail running down the
            group's full child stack plus a short horizontal branch into
            each item, so children read as nested under the group header
            instead of just being indented with no visible relationship. -->
            <span class="pointer-events-none absolute top-0 left-[7px] h-1/2 w-px bg-outline-gray-2" />
            <span
              v-if="!isLastItem(item)"
              class="pointer-events-none absolute top-1/2 left-[7px] bottom-0 w-px bg-outline-gray-2"
            />
            <span class="pointer-events-none absolute top-1/2 left-[7px] h-px w-2 bg-outline-gray-2" />
          </template>
          <SidebarItem
            class="sub-item"
            :label="item.label"
            :icon="item.icon"
            :to="item.to"
            :is-active="item.isActive"
            :is-collapsed="isSidebarCollapsed"
            :on-click="item.onClick"
          />
        </div>
      </nav>
    </transition>
  </div>
</template>

<style scoped>
/* frappe-ui's own SidebarItem has no fontWeight/color prop to set per
instance, so a sub-item's label is styled from here instead, via its own
rendered DOM - one step lighter/smaller than the group header's own
text-base font-medium text-ink-gray-8 above, completing the "main item vs
sub item" hierarchy the header alone can't express by itself. */
.sub-item :deep(span.text-sm) {
  font-size: 0.875rem;
  color: var(--ink-gray-6, #525252);
}
</style>

<script setup>
// A drop-in replacement for frappe-ui's own SidebarSection, used only for
// this app's doctype Groups - that component's header has no escape hatch
// for "also navigate somewhere on click" (its @click only ever toggles its
// own internal isCollapsed ref, see node_modules/frappe-ui's own
// SidebarSection.vue), so a Group header can't both expand AND jump to its
// first child through it. Everything else here is copied as-is from that
// component to keep the exact same look or behavior for the collapse
// animation, the collapsed-rail divider, etc.
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { SidebarItem } from 'frappe-ui'
import LucideIcon from '@/components/LucideIcon.vue'

const router = useRouter()

const props = defineProps({
  label: { type: String, default: '' },
  // A plain Lucide icon name string (unlike a leaf item's own `icon`, which
  // AppSidebar.vue resolves through navIcon() into a renderable component -
  // rendered directly via LucideIcon here instead, since this header has no
  // other use for navIcon()'s wrapper).
  icon: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  // The group's own first visible child nav item (already role/permission-
  // filtered server-side) - clicking the header both expands the group AND
  // routes here, so a Group always lands somewhere useful on the first
  // click instead of just toggling open with nothing shown.
  firstItem: { type: Object, default: null },
  // Passed explicitly from AppSidebar.vue rather than read via
  // inject('isSidebarCollapsed') - frappe-ui's Sidebar.vue only provides
  // the raw v-model ref under that key, not the derived "actually collapsed
  // right now" value (it also factors in isMobile/disableCollapse
  // internally as its own `shouldCollapse`), so an inject here would miss
  // the auto-collapse-on-narrow-viewport case entirely and render this
  // group's header/items as if space was plentiful inside an actually-w-12
  // icon-only rail.
  isSidebarCollapsed: { type: Boolean, default: false },
})

const isCollapsed = ref(false)

// The header itself reads as "selected" whenever the current route is one
// of this group's own children - same persistent background a leaf
// SidebarItem gets for its own active route, rather than only showing any
// background on hover regardless of whether you're actually inside this
// group right now.
const isActive = computed(() => props.items.some((item) => item.isActive))

function isLastItem(item) {
  return props.items[props.items.length - 1] === item
}

function onHeaderClick() {
  isCollapsed.value = !isCollapsed.value
  if (!isCollapsed.value && props.firstItem) {
    if (props.firstItem.onClick) props.firstItem.onClick()
    else if (props.firstItem.to) router.replace(props.firstItem.to)
  }
}
</script>

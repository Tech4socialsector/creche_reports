<template>
  <div
    class="flex w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm"
    :class="active ? 'bg-surface-gray-2' : ''"
  >
    <component :is="item.icon" v-if="item.icon" class="h-4 w-4 flex-shrink-0 text-ink-gray-5" />
    <LucideIcon v-else name="file-text" class="h-4 w-4 flex-shrink-0 text-ink-gray-5" />
    <span class="min-w-0 flex-1 truncate text-ink-gray-8">{{ item.title }}</span>
    <span v-if="item.description" class="flex-shrink-0 truncate text-xs text-ink-gray-4">
      {{ item.description }}
    </span>
  </div>
</template>

<script setup>
// The small per-row renderer CommandPalette (frappe-ui) needs for each group
// - it renders `<component :is="group.component" :item="item" :active="active" />`
// for every item, so this is that component. Same visual shape this app's old
// hand-rolled search dropdowns used before migrating to CommandPalette: an
// icon, the label/title, and (for a record hit) its doctype as a trailing
// badge-like label.
import LucideIcon from '@/components/LucideIcon.vue'

defineProps({
  item: { type: Object, required: true },
  active: { type: Boolean, default: false },
})
</script>

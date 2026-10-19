<template>
  <!-- Mobile: a table this wide (an expense head plus up to 12 months plus a
  total) forces endless horizontal scrolling on a phone - each expense-head
  group becomes its own card instead, keeping the same expand/collapse tree
  behavior as the desktop table, with line items nested inside the card and
  their monthly breakdown (when shown) as a compact label/value grid, same
  visual language as DoctypeList.vue's own mobile row cards. -->
  <div v-if="isMobile" class="space-y-2">
    <div v-if="!rows.length" class="rounded-xl border border-gray-200 px-3 py-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
      No line items to show.
    </div>
    <div
      v-for="group in groups"
      :key="group.head"
      class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
    >
      <button
        type="button"
        class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        :class="theme.bg"
        @click="toggle(group.head)"
      >
        <span class="flex min-w-0 items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200">
          <LucideIcon :name="isCollapsed(group.head) ? 'chevron-right' : 'chevron-down'" class="h-3.5 w-3.5 flex-shrink-0" :class="theme.text" />
          <span class="truncate">{{ group.head || 'Uncategorized' }}</span>
        </span>
        <span class="flex-shrink-0 font-semibold" :class="theme.text">{{ formatInr(group.total) }}</span>
      </button>

      <div v-if="!isCollapsed(group.head)" class="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
        <div v-for="row in group.rows" :key="rowKey(row)" class="px-3 py-2.5 pl-6">
          <div class="flex items-center justify-between gap-2">
            <span class="min-w-0 truncate text-sm text-gray-800 dark:text-gray-200">{{ row.type_of_expenses || '—' }}</span>
            <span class="flex-shrink-0 text-sm font-medium text-gray-900 dark:text-gray-100">{{ formatInr(row.total) }}</span>
          </div>
          <p v-if="row.budget_sub_head" class="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{{ row.budget_sub_head }}</p>
          <dl v-if="showMonths && months.length" class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
            <div v-for="m in months" :key="m" class="flex items-center justify-between gap-2 text-xs">
              <dt class="text-gray-400 dark:text-gray-500">{{ m }}</dt>
              <dd class="font-medium text-gray-600 dark:text-gray-400">{{ formatInr(row.monthly?.[m] || 0) }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>

    <div v-if="rows.length" class="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 font-semibold dark:text-gray-100" :class="theme.bg">
      <span class="text-gray-900 dark:text-gray-100">Total</span>
      <span :class="theme.text">{{ formatInr(grandTotal) }}</span>
    </div>
  </div>

  <div v-else class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
    <table class="w-full min-w-max text-left text-sm">
      <thead class="text-xs uppercase text-gray-500 dark:text-gray-400" :class="theme.bg">
        <tr>
          <th class="sticky left-0 z-10 min-w-[220px] px-3 py-2 font-medium" :class="theme.bg">
            Expense Head
          </th>
          <template v-if="showMonths">
            <th v-for="m in months" :key="m" class="min-w-[100px] whitespace-nowrap px-3 py-2 text-right font-medium">
              {{ m }}
            </th>
          </template>
          <th class="min-w-[110px] whitespace-nowrap px-3 py-2 text-right font-medium" :class="theme.text">Total</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
        <tr v-if="!rows.length">
          <td :colspan="(showMonths ? months.length : 0) + 2" class="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
            No line items to show.
          </td>
        </tr>
        <template v-for="group in groups" :key="group.head">
          <tr
            class="cursor-pointer hover:brightness-95 dark:hover:brightness-125"
            :class="theme.bg"
            @click="toggle(group.head)"
          >
            <td class="sticky left-0 z-10 flex items-center gap-1.5 px-3 py-2 font-semibold text-gray-800 dark:text-gray-200" :class="theme.bg">
              <LucideIcon :name="isCollapsed(group.head) ? 'chevron-right' : 'chevron-down'" class="h-3.5 w-3.5" :class="theme.text" />
              {{ group.head || 'Uncategorized' }}
            </td>
            <template v-if="showMonths">
              <td v-for="m in months" :key="m" class="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                {{ formatInr(group.monthly[m] || 0) }}
              </td>
            </template>
            <td class="px-3 py-2 text-right font-semibold" :class="theme.text">
              {{ formatInr(group.total) }}
            </td>
          </tr>
          <tr v-for="row in isCollapsed(group.head) ? [] : group.rows" :key="rowKey(row)" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td class="sticky left-0 z-10 bg-white px-3 py-2 pl-8 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <div>{{ row.type_of_expenses || '—' }}</div>
              <div v-if="row.budget_sub_head" class="text-xs text-gray-400 dark:text-gray-500">{{ row.budget_sub_head }}</div>
            </td>
            <template v-if="showMonths">
              <td v-for="m in months" :key="m" class="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                {{ formatInr(row.monthly?.[m] || 0) }}
              </td>
            </template>
            <td class="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
              {{ formatInr(row.total) }}
            </td>
          </tr>
        </template>
      </tbody>
      <tfoot v-if="rows.length" class="border-t-2 border-gray-300 font-semibold dark:border-gray-600" :class="theme.bg">
        <tr>
          <td class="sticky left-0 z-10 px-3 py-2 text-gray-900 dark:text-gray-100" :class="theme.bg">Total</td>
          <template v-if="showMonths">
            <td v-for="m in months" :key="m" class="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
              {{ formatInr(monthTotals[m] || 0) }}
            </td>
          </template>
          <td class="px-3 py-2 text-right" :class="theme.text">{{ formatInr(grandTotal) }}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import LucideIcon from '@/components/LucideIcon.vue'
import { formatInr, METRIC_THEME } from '@/composables/useDashboardFormat'

const props = defineProps({
  months: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  metric: { type: String, default: 'budget' },
  // Both toggles are owned by the parent (shown in the drill modal's own
  // header, before the Export button) rather than this table, since they
  // need to be visible even while this table is scrolled out of view.
  showMonths: { type: Boolean, default: true },
  showLineItems: { type: Boolean, default: true },
})

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')

const theme = computed(() => METRIC_THEME[props.metric] || METRIC_THEME.budget)

// Per-group collapse state, independent of the "Show line items" toggle -
// that toggle just sets every group's state at once (an "expand all" /
// "collapse all" action), but a single group can still be opened or closed
// by its own header afterward either way. Previously "Show line items" off
// also hid the expand/collapse chevron entirely, which made a group
// impossible to re-open without turning the toggle back on first.
const collapsed = reactive({})
function isCollapsed(head) {
  return head in collapsed ? collapsed[head] : !props.showLineItems
}
function toggle(head) {
  collapsed[head] = !isCollapsed(head)
}
watch(
  () => props.showLineItems,
  (value) => {
    for (const key of Object.keys(collapsed)) collapsed[key] = !value
  },
)

function rowKey(row) {
  return `${row.type_of_expenses_id || row.type_of_expenses}-${row.budget_sub_head}`
}

const groups = computed(() => {
  const byHead = new Map()
  for (const row of props.rows) {
    const head = row.budget_main_head || ''
    if (!byHead.has(head)) byHead.set(head, { head, rows: [], monthly: {}, total: 0 })
    const g = byHead.get(head)
    g.rows.push(row)
    g.total += row.total || 0
    for (const m of props.months) {
      g.monthly[m] = (g.monthly[m] || 0) + (row.monthly?.[m] || 0)
    }
  }
  return [...byHead.values()]
})

const monthTotals = computed(() => {
  const totals = {}
  for (const m of props.months) {
    totals[m] = props.rows.reduce((sum, r) => sum + (r.monthly?.[m] || 0), 0)
  }
  return totals
})

const grandTotal = computed(() => props.rows.reduce((sum, r) => sum + (r.total || 0), 0))
</script>

<template>
  <Dialog v-model="isOpen" :options="{ size: '7xl', title: 'Pending Utilization Submission' }">
    <template #body-content>
      <div class="pending-util-body flex flex-col">
      <div class="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b pb-3 dark:border-gray-800">
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/30">
            <LucideIcon name="clock" class="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </span>
          <p class="text-xs text-gray-500 dark:text-gray-400">Cutoff date: <span class="font-medium text-gray-700 dark:text-gray-300">{{ formatDate(displayCutoff) }}</span></p>
        </div>
        <Button
          v-if="partners.length"
          variant="outline"
          size="sm"
          icon-left="lucide-download"
          :loading="exporting"
          aria-label="Export Excel"
          @click="handleExport"
        >
          <span class="max-sm:hidden">Export Excel</span>
        </Button>
      </div>

      <ErrorMessage class="mt-3 flex-shrink-0" :message="exportError" />

      <div v-if="partners.length" class="mt-3 max-w-xs flex-shrink-0">
        <TextInput v-model="searchQuery" type="text" placeholder="Search partners...">
          <template #prefix>
            <LucideIcon name="search" class="h-4 w-4 text-ink-gray-5" />
          </template>
        </TextInput>
      </div>

      <div class="pending-util-scroll mt-3 min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <div v-if="!partners.length" class="flex flex-col items-center justify-center gap-2 py-12">
          <span class="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
            <LucideIcon name="circle-check-big" class="h-6 w-6 text-green-600 dark:text-green-400" />
          </span>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">All partners are up to date</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">No pending utilisation submissions found.</p>
        </div>

        <table v-else class="drill-table w-full min-w-max text-left text-sm">
          <thead class="sticky top-0 z-10 bg-amber-50 text-xs uppercase text-gray-500 dark:bg-amber-900/30 dark:text-gray-400">
            <tr>
              <th class="px-3 py-2 font-medium">#</th>
              <th class="px-3 py-2 font-medium">Partner</th>
              <th class="px-3 py-2 font-medium">Budget Reference</th>
              <th class="px-3 py-2 text-right font-medium text-amber-700 dark:text-amber-400">Months Pending</th>
              <th class="px-3 py-2 font-medium">Months</th>
              <th class="px-3 py-2 font-medium">Email</th>
              <th class="px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-if="!filteredPartners.length">
              <td colspan="7" class="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                No results for '{{ searchQuery }}'
              </td>
            </tr>
            <template v-for="(p, pi) in filteredPartners" :key="p.partner_id || pi">
              <tr v-for="(b, bi) in p.budgets" :key="b.budget_id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td v-if="bi === 0" :rowspan="p.budgets.length" class="px-3 py-2 align-top text-gray-500 dark:text-gray-400">
                  {{ pi + 1 }}
                </td>
                <td v-if="bi === 0" :rowspan="p.budgets.length" class="px-3 py-2 align-top font-medium text-gray-900 dark:text-gray-100">
                  {{ p.partner_name }}
                </td>
                <td class="px-3 py-2 text-gray-700 dark:text-gray-300">{{ b.budget_reference_name }}</td>
                <td class="px-3 py-2 text-right">
                  <span class="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {{ b.missing_months.length }}
                  </span>
                </td>
                <td class="px-3 py-2">
                  <div class="flex max-w-xs flex-wrap gap-1">
                    <span
                      v-for="(m, mi) in b.missing_months"
                      :key="mi"
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                      :class="m.days_overdue > 0
                        ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'"
                    >
                      {{ m.month }}<span v-if="m.year"> ({{ m.year }})</span><span v-if="m.days_overdue > 0" class="ml-1 font-semibold">· {{ m.days_overdue }}d</span>
                    </span>
                  </div>
                </td>
                <td v-if="bi === 0" :rowspan="p.budgets.length" class="px-3 py-2 align-top text-gray-600 dark:text-gray-400">
                  {{ p.email || '—' }}
                </td>
                <td v-if="bi === 0" :rowspan="p.budgets.length" class="px-3 py-2 align-top">
                  <Tooltip :text="p.email ? 'Send a reminder email' : 'No email on file for this partner'">
                    <Button size="sm" variant="outline" icon-left="lucide-mail" :disabled="!p.email" aria-label="Send Email" @click="sendEmail(p)">
                      <span class="max-sm:hidden">Send Email</span>
                    </Button>
                  </Tooltip>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
/* Only rules reaching this component's OWN rendered content belong here -
see the global block below for why frappe-ui's own wrapper elements can't
be reached with :deep() at all once reka-ui's DialogPortal teleports them
to document.body. */
.pending-util-body {
  min-height: 0;
  flex: 1;
}
.pending-util-scroll {
  overscroll-behavior: contain;
}
</style>

<style>
/* See DrillModal.vue's identical global block for the full reasoning:
reka-ui's DialogPortal teleports the dialog's overlay+content out to
document.body, outside this component's own DOM, so a scoped
:deep(.dialog-overlay)/:deep(.dialog-content) rule never matches (confirmed
live - the built CSS looked correct but getComputedStyle on the real
element showed none of it applied). These plain global rules reach the
teleported DOM fine; :has() scopes them to only the dialog hosting THIS
modal's own .pending-util-body, leaving any other Dialog in the app alone. */
.dialog-overlay:has(.pending-util-body) {
  overflow: hidden;
}
.dialog-overlay:has(.pending-util-body) .dialog-content {
  display: flex;
  flex-direction: column;
  /* 6rem, not 2rem: a 2rem margin left this dialog pinned almost flush to
  the top and bottom of the viewport with no breathing room, reading as
  "overflowing the window" even on an ordinary desktop screen - matches
  DrillModal.vue's own fix for the identical complaint. */
  max-height: calc(100vh - 6rem);
}
.dialog-overlay:has(.pending-util-body) .dialog-content.max-w-7xl {
  max-width: 75rem;
}
/* Windows' own 125%/150% display scaling (the common laptop default)
reports a smaller effective viewport width in CSS pixels even on a
physically large screen - a dialog still asking for the full width there
has less room than it expects, reading as "too big for my screen" even
though nothing is actually broken. Same fix as AiAssistant.vue/
AppSidebar.vue's own equivalent breakpoints. */
@media (max-width: 1600px) {
  .dialog-overlay:has(.pending-util-body) .dialog-content.max-w-7xl {
    max-width: 56rem;
  }
}
.dialog-overlay:has(.pending-util-body) .dialog-content > div:first-child,
.dialog-overlay:has(.pending-util-body) .dialog-content > div:first-child > .flex,
.dialog-overlay:has(.pending-util-body) .dialog-content > div:first-child > .flex > .flex-1 {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}
</style>

<script setup>
import { computed, watch } from 'vue'
import { Dialog, Button, ErrorMessage, Tooltip, TextInput } from 'frappe-ui'
import LucideIcon from '@/components/LucideIcon.vue'
import { formatDate, buildMailto } from '@/composables/useDashboardFormat'
import { useTableExport } from '@/composables/useTableExport'
import { useTableSearch } from '@/composables/useTableSearch'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  partners: { type: Array, default: () => [] },
  cutoff: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// Shown label only - the backend's own `cutoff` (the 5th of LAST month)
// still drives every actual check below (which months count as missing,
// days overdue, etc.) and is never changed. This just reframes what's
// displayed as "the 5th of this month" (today's month) rather than the
// month being checked, since that's the date partners actually see as
// their current deadline, even though what's actually being verified is
// still last month's submission.
const displayCutoff = computed(() => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 5)
})

const { searchQuery, filteredRows: filteredPartners } = useTableSearch(
  () => props.partners,
  ['partner_name', 'email', (p) => (p.budgets || []).map((b) => b.budget_reference_name).join(' ')],
)
watch(isOpen, (open) => {
  if (open) searchQuery.value = ''
})

function sendEmail(p) {
  if (!p.email) return
  const subject = `Pending Utilisation Submission — ${p.partner_name}`
  const budgetLines = p.budgets
    .map((b) => `${b.budget_reference_name}: ${b.missing_months.map((m) => `${m.month}${m.year ? ` (${m.year})` : ''}`).join(', ')}`)
    .join('\n')
  const body = `Dear ${p.partner_name},\n\nThe following utilisation submissions are pending:\n\n${budgetLines}\n\nPlease submit at the earliest.\n\nThanks.`
  window.location.href = buildMailto(p.email, subject, body)
}

const { exporting, error: exportError, exportGrid } = useTableExport()

function handleExport() {
  const columns = [
    { label: '#', key: 'idx' },
    { label: 'Partner', key: 'partner_name' },
    { label: 'Budget Reference', key: 'budget_reference_name' },
    { label: 'Months Pending', key: 'months_pending' },
    { label: 'Months', key: 'months' },
    { label: 'Email', key: 'email' },
  ]
  const grid = []
  const merges = []
  filteredPartners.value.forEach((p, pi) => {
    const startRow = grid.length
    p.budgets.forEach((b, bi) => {
      grid.push([
        bi === 0 ? pi + 1 : '',
        bi === 0 ? p.partner_name : '',
        b.budget_reference_name,
        b.missing_months.length,
        b.missing_months.map((m) => `${m.month}${m.year ? ` (${m.year})` : ''}`).join(', '),
        bi === 0 ? p.email || '' : '',
      ])
    })
    const endRow = grid.length - 1
    if (endRow > startRow) {
      merges.push([startRow, 0, endRow, 0])
      merges.push([startRow, 1, endRow, 1])
      merges.push([startRow, 5, endRow, 5])
    }
  })
  exportGrid('Pending Utilization Submission', columns, grid, merges)
}
</script>

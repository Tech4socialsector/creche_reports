<template>
  <Dialog v-model="isOpen" :options="{ size: '7xl', title: title }">
    <template #body-content>
      <div class="overview-strip-body flex flex-col">
      <div class="mb-3 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b pb-3 dark:border-gray-800">
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 items-center justify-center rounded-full" :class="statTheme.bg">
            <LucideIcon :name="statTheme.icon" class="h-3.5 w-3.5" :class="statTheme.text" />
          </span>
          <span class="text-sm font-semibold" :class="statTheme.text">{{ filteredRows.length }} {{ title.toLowerCase() }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <Switch v-model="showFullNumbers" label="Show full numbers" size="sm" />
          <div class="w-full max-w-xs sm:w-auto">
            <TextInput v-model="searchQuery" type="text" :placeholder="searchPlaceholder">
              <template #prefix>
                <LucideIcon name="search" class="h-4 w-4 text-ink-gray-5" />
              </template>
            </TextInput>
          </div>
          <Dropdown :options="exportOptions" :button="{ variant: 'outline', iconLeft: 'lucide-download', loading: exporting, label: 'Export' }" />
        </div>
      </div>

      <ErrorMessage class="mb-3 flex-shrink-0" :message="exportError" />

      <div class="overview-strip-scroll grid min-h-0 flex-1 grid-cols-1 items-start gap-4 overflow-y-auto" :class="stat === 'states' ? 'lg:grid-cols-4' : ''">
        <IndiaMap v-if="stat === 'states'" :state-data="stateMapData" class="lg:col-span-3" />

        <div class="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800" :class="stat === 'states' ? 'lg:col-span-1' : ''">
          <table class="drill-table w-full min-w-max text-left text-sm">
            <thead class="sticky top-0 z-10 text-xs uppercase text-gray-500 dark:text-gray-400" :class="statTheme.bg">
              <tr>
                <th v-for="col in columns" :key="col.key" class="px-3 py-2 font-medium" :class="col.align === 'right' ? 'text-right' : ''">
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr v-if="!filteredRows.length">
                <td :colspan="columns.length" class="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                  {{ searchQuery ? `No results for '${searchQuery}'` : 'No records to show.' }}
                </td>
              </tr>
              <tr v-for="(row, i) in filteredRows" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td
                  v-for="col in columns"
                  :key="col.key"
                  class="px-3 py-2"
                  :class="[col.align === 'right' ? 'text-right font-medium' : '', col.align === 'right' ? statTheme.text : 'text-gray-700 dark:text-gray-300']"
                >
                  {{ row[col.key] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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
.overview-strip-body {
  min-height: 0;
  flex: 1;
}
.overview-strip-scroll {
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
modal's own .overview-strip-body, leaving any other Dialog in the app alone. */
.dialog-overlay:has(.overview-strip-body) {
  overflow: hidden;
}
.dialog-overlay:has(.overview-strip-body) .dialog-content {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 2rem);
}
.dialog-overlay:has(.overview-strip-body) .dialog-content.max-w-7xl {
  max-width: 96rem;
}
.dialog-overlay:has(.overview-strip-body) .dialog-content > div:first-child,
.dialog-overlay:has(.overview-strip-body) .dialog-content > div:first-child > .flex,
.dialog-overlay:has(.overview-strip-body) .dialog-content > div:first-child > .flex > .flex-1 {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}
</style>

<script setup>
import { computed, watch } from 'vue'
import { Dialog, Dropdown, ErrorMessage, Switch, TextInput } from 'frappe-ui'
import LucideIcon from '@/components/LucideIcon.vue'
import IndiaMap from '@/components/dashboard/IndiaMap.vue'
import { formatInr, formatDate, STAT_THEME, showFullNumbers } from '@/composables/useDashboardFormat'
import { useTableSearch } from '@/composables/useTableSearch'
import { useTableExport } from '@/composables/useTableExport'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  stat: { type: String, default: '' }, // partners | budgets | creches | states | districts | blocks
  partners: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const titles = {
  partners: 'Partners',
  budgets: 'Allocated Budgets',
  creches: 'Approved Creches',
  states: 'Working States',
  districts: 'Districts',
  blocks: 'Blocks',
}
const title = computed(() => titles[props.stat] || '')
const statTheme = computed(() => STAT_THEME[props.stat] || STAT_THEME.partners)

function allBudgets() {
  const out = []
  for (const p of props.partners) {
    for (const b of p.budgets || []) out.push({ ...b, partner_name: p.partner_name, partner_id: p.partner_id })
  }
  return out
}

const columns = computed(() => {
  switch (props.stat) {
    case 'partners':
      return [
        { label: 'Partner', key: 'partner_name' },
        { label: 'Budgets', key: 'budget_count', align: 'right' },
        { label: 'Total Budget', key: 'total_budget', align: 'right' },
      ]
    case 'budgets':
      return [
        { label: 'Budget Reference', key: 'budget_reference_name' },
        { label: 'Partner', key: 'partner_name' },
        { label: 'Grant ID', key: 'grant_id' },
        { label: 'Start Date', key: 'start_date' },
        { label: 'End Date', key: 'end_date' },
        { label: 'Budget', key: 'budget', align: 'right' },
      ]
    case 'creches':
      return [
        { label: 'Budget Reference', key: 'budget_reference_name' },
        { label: 'Partner', key: 'partner_name' },
        { label: 'State', key: 'state' },
        { label: 'Start Date', key: 'start_date' },
        { label: 'End Date', key: 'end_date' },
        { label: 'Approved Creches', key: 'no_of_creches', align: 'right' },
      ]
    case 'states':
      return [
        { label: 'State', key: 'label' },
        { label: 'Partners', key: 'partners', align: 'right' },
        { label: 'Budgets', key: 'budgets', align: 'right' },
      ]
    case 'districts':
    case 'blocks':
      return [
        { label: props.stat === 'districts' ? 'District' : 'Block', key: 'label' },
        { label: 'State', key: 'state' },
        { label: 'Partners', key: 'partners', align: 'right' },
        { label: 'Budgets', key: 'budgets', align: 'right' },
      ]
    default:
      return []
  }
})

const rows = computed(() => {
  switch (props.stat) {
    case 'partners':
      return props.partners.map((p) => ({
        partner_name: p.partner_name,
        budget_count: (p.budgets || []).length,
        total_budget: formatInr(p.total_budget),
      }))
    case 'budgets':
      // Each budget's dates come through as grant_start/grant_end (see
      // creche_dashboard.py's get_partner_budget_summary) - renamed to the
      // column keys above since "grant_start"/"grant_end" would be a
      // confusing label-to-field mismatch for a plain "Start Date" column.
      return allBudgets().map((b) => ({
        budget_reference_name: b.budget_reference_name,
        partner_name: b.partner_name,
        grant_id: b.grant_id,
        start_date: formatDate(b.grant_start),
        end_date: formatDate(b.grant_end),
        budget: formatInr(b.budget),
      }))
    case 'creches':
      return allBudgets()
        .filter((b) => b.no_of_creches)
        .map((b) => ({
          budget_reference_name: b.budget_reference_name,
          partner_name: b.partner_name,
          state: b.state,
          start_date: formatDate(b.grant_start),
          end_date: formatDate(b.grant_end),
          no_of_creches: b.no_of_creches,
        }))
    case 'states':
      return groupByField('state')
    case 'districts':
      return groupByField('district')
    case 'blocks':
      return groupByField('block')
    default:
      return []
  }
})

function groupByField(field) {
  const map = new Map()
  for (const b of allBudgets()) {
    const label = b[field]
    if (!label) continue
    if (!map.has(label)) map.set(label, { label, state: b.state, partnerIds: new Set(), budgets: 0 })
    const g = map.get(label)
    g.partnerIds.add(b.partner_id)
    g.budgets += 1
  }
  return [...map.values()]
    .map((g) => ({ label: g.label, state: g.state, partners: g.partnerIds.size, budgets: g.budgets }))
    .sort((a, b) => a.state?.localeCompare(b.state || '') || a.label.localeCompare(b.label))
}

const stateMapData = computed(() => {
  const out = {}
  for (const row of groupByField('state')) {
    out[row.label] = { partners: row.partners, budgets: row.budgets }
  }
  return out
})

const searchPlaceholders = {
  partners: 'Search partners...',
  budgets: 'Search budgets...',
  creches: 'Search budgets...',
  states: 'Search states...',
  districts: 'Search districts...',
  blocks: 'Search blocks...',
}
const searchPlaceholder = computed(() => searchPlaceholders[props.stat] || 'Search...')

// Note: 'creches'/'budgets' rows expose budget_reference_name/partner_name
// (no grant_id key - see `rows` above), so the searchable fields below only
// reference keys that actually exist on each stat's row shape.
function fieldsForStat(stat) {
  switch (stat) {
    case 'partners':
      return ['partner_name']
    case 'budgets':
    case 'creches':
      return ['budget_reference_name', 'partner_name']
    case 'states':
      return ['label']
    case 'districts':
    case 'blocks':
      return ['label', 'state']
    default:
      return []
  }
}

const { searchQuery, filteredRows } = useTableSearch(rows, fieldsForStat(props.stat))
watch(isOpen, (open) => {
  if (open) searchQuery.value = ''
})

// Exports exactly what's currently visible (filteredRows, not the full
// unfiltered `rows`) - same "export respects the search box" behavior as
// every other drill-down modal (CardDrillModal, DrillModal, etc.).
const { exporting, error: exportError, exportTable } = useTableExport()

const exportOptions = [
  { label: 'Excel (.xlsx)', icon: 'lucide-download', onClick: () => exportTable(title.value, columns.value, filteredRows.value, 'xlsx') },
  { label: 'PDF (A4)', icon: 'lucide-file-text', onClick: () => exportTable(title.value, columns.value, filteredRows.value, 'pdf') },
]
</script>

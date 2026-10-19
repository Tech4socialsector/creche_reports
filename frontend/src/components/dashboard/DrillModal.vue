<template>
  <Dialog v-model="isOpen" :options="{ size: '7xl', title: dialogTitle }">
    <template #body-content>
      <div class="drill-modal-body flex flex-col">
      <div class="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b pb-3 dark:border-gray-800">
        <nav class="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          <span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full" :class="theme.bg">
            <LucideIcon :name="theme.icon" class="h-3.5 w-3.5" :class="theme.text" />
          </span>
          <button
            type="button"
            class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            :class="{ [`font-semibold ${theme.text}`]: level === 1 }"
            @click="goToLevel(1)"
          >
            {{ typeLabel }}
          </button>
          <template v-if="selectedPartner">
            <LucideIcon name="chevron-right" class="h-3.5 w-3.5 text-gray-400" />
            <button
              type="button"
              class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              :class="{ [`font-semibold ${theme.text}`]: level === 2 }"
              @click="goToLevel(2)"
            >
              {{ selectedPartner.partner_name || selectedPartner.partner_id }}
            </button>
          </template>
          <template v-if="selectedBudget">
            <LucideIcon name="chevron-right" class="h-3.5 w-3.5 text-gray-400" />
            <span class="font-semibold" :class="theme.text">
              {{ selectedBudget.budget_reference_name || selectedBudget.budget_id }}
            </span>
          </template>
          <template v-if="consolidatedView">
            <LucideIcon name="chevron-right" class="h-3.5 w-3.5 text-gray-400" />
            <span class="font-semibold" :class="theme.text">Consolidated Line Items</span>
          </template>
        </nav>
        <div class="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
          <Switch v-model="showFullNumbers" label="Show full numbers" size="sm" />
          <Button
            v-if="level === 2 && showsLineItems && selectedPartner?.budgets?.length > 1"
            variant="outline"
            size="sm"
            icon-left="lucide-layers"
            :loading="consolidatedLoading"
            aria-label="View Consolidated Line Items"
            @click="openConsolidated"
          >
            <span class="max-sm:hidden">View Consolidated Line Items ({{ selectedPartner?.budgets?.length }} budgets)</span>
          </Button>
          <div v-if="level === 3 && showsLineItems" class="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <label class="flex cursor-pointer items-center gap-1.5">
              <input v-model="showMonths" type="checkbox" class="form-checkbox h-3.5 w-3.5 !rounded-[3px] border-gray-300 text-gray-900 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-800" />
              Show months
            </label>
            <label class="flex cursor-pointer items-center gap-1.5">
              <input v-model="showLineItems" type="checkbox" class="form-checkbox h-3.5 w-3.5 !rounded-[3px] border-gray-300 text-gray-900 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-800" />
              Show line items
            </label>
          </div>
          <Dropdown :options="exportOptions" :button="{ variant: 'outline', iconLeft: 'lucide-download', loading: exporting, label: 'Export' }" />
        </div>
      </div>

      <ErrorMessage class="mt-3 flex-shrink-0" :message="exportErrorMsg || currentError" />

      <div v-if="showsSearch" class="mt-3 max-w-xs flex-shrink-0">
        <TextInput v-model="currentSearchQuery" type="text" :placeholder="searchPlaceholder">
          <template #prefix>
            <LucideIcon name="search" class="h-4 w-4 text-ink-gray-5" />
          </template>
        </TextInput>
      </div>

      <div class="drill-scroll mt-3 min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <div v-if="currentLoading" class="space-y-2">
          <Skeleton v-for="i in 6" :key="i" height="2.25rem" />
        </div>

        <!-- Mobile: 6-7 columns of partner/budget rows forces endless
        horizontal scrolling on a phone - each row becomes its own card
        instead, same convention as DoctypeList.vue's mobile rows. -->
        <template v-else-if="level === 1">
          <div v-if="isMobile" class="space-y-2">
            <div v-if="!filteredLevel1Rows.length" class="rounded-xl border border-gray-200 px-3 py-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
              {{ level1Search.searchQuery.value ? `No results for '${level1Search.searchQuery.value}'` : 'No partners to show.' }}
            </div>
            <button
              v-for="p in filteredLevel1Rows"
              :key="p.partner_id"
              type="button"
              class="w-full rounded-xl border border-gray-200 p-3.5 text-left active:bg-gray-50 dark:border-gray-800 dark:active:bg-gray-800/50"
              @click="selectPartner(p)"
            >
              <div class="flex items-start justify-between gap-2">
                <span class="min-w-0 flex-1 truncate font-semibold text-gray-900 dark:text-gray-100">{{ p.partner_name || p.partner_id }}</span>
                <span class="inline-flex flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold" :class="pctBadgeClass(p.utilisation_pct)">
                  {{ formatPct(p.utilisation_pct) }}
                </span>
              </div>
              <p class="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">{{ statesForPartner(p) }} · {{ p.grant_ids || '—' }}</p>
              <div class="mt-2.5 grid gap-2" :class="type !== 'budget' ? 'grid-cols-3' : 'grid-cols-2'">
                <div>
                  <dt class="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Budget</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-blue-600 dark:text-blue-400">{{ formatInr(p.total_budget) }}</dd>
                </div>
                <div v-if="type !== 'budget'">
                  <dt class="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Disbursed</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-cyan-600 dark:text-cyan-400">{{ formatInr(p.total_disbursement) }}</dd>
                </div>
                <div>
                  <dt class="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Utilised</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-green-600 dark:text-green-400">{{ formatInr(p.total_utilisation) }}</dd>
                </div>
              </div>
            </button>
          </div>

          <table v-else class="drill-table w-full min-w-max text-left text-sm">
            <thead class="sticky top-0 z-10 text-xs uppercase text-gray-500 dark:text-gray-400" :class="theme.bg">
              <tr>
                <th class="px-3 py-2 font-medium">Partner</th>
                <th class="px-3 py-2 font-medium">Grant IDs</th>
                <th class="px-3 py-2 font-medium">States</th>
                <th class="px-3 py-2 text-right font-medium text-blue-600 dark:text-blue-400">Budget</th>
                <th v-if="type !== 'budget'" class="px-3 py-2 text-right font-medium text-cyan-600 dark:text-cyan-400">Disbursement</th>
                <th class="px-3 py-2 text-right font-medium text-green-600 dark:text-green-400">Utilisation</th>
                <th class="px-3 py-2 text-right font-medium">Util %</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr v-if="!filteredLevel1Rows.length">
                <td colspan="7" class="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                  {{ level1Search.searchQuery.value ? `No results for '${level1Search.searchQuery.value}'` : 'No partners to show.' }}
                </td>
              </tr>
              <tr
                v-for="p in filteredLevel1Rows"
                :key="p.partner_id"
                class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                @click="selectPartner(p)"
              >
                <td class="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{{ p.partner_name || p.partner_id }}</td>
                <td class="px-3 py-2 text-gray-600 dark:text-gray-400">{{ p.grant_ids || '—' }}</td>
                <td class="px-3 py-2 text-gray-600 dark:text-gray-400">{{ statesForPartner(p) }}</td>
                <td class="px-3 py-2 text-right font-medium text-blue-700 dark:text-blue-400">{{ formatInr(p.total_budget) }}</td>
                <td v-if="type !== 'budget'" class="px-3 py-2 text-right font-medium text-cyan-700 dark:text-cyan-400">
                  {{ formatInr(p.total_disbursement) }}
                </td>
                <td class="px-3 py-2 text-right font-medium text-green-700 dark:text-green-400">{{ formatInr(p.total_utilisation) }}</td>
                <td class="px-3 py-2 text-right">
                  <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold" :class="pctBadgeClass(p.utilisation_pct)">
                    {{ formatPct(p.utilisation_pct) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </template>

        <template v-else-if="level === 2 && selectedPartner">
          <div v-if="isMobile" class="space-y-2">
            <div v-if="!filteredLevel2Rows.length" class="rounded-xl border border-gray-200 px-3 py-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
              {{ level2Search.searchQuery.value ? `No results for '${level2Search.searchQuery.value}'` : 'No budgets to show.' }}
            </div>
            <button
              v-for="b in filteredLevel2Rows"
              :key="b.budget_id"
              type="button"
              class="w-full rounded-xl border border-gray-200 p-3.5 text-left active:bg-gray-50 dark:border-gray-800 dark:active:bg-gray-800/50"
              @click="selectBudget(b)"
            >
              <div class="flex items-start justify-between gap-2">
                <span class="min-w-0 flex-1 truncate font-semibold text-gray-900 dark:text-gray-100">{{ b.budget_reference_name }}</span>
                <span class="inline-flex flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold" :class="pctBadgeClass(b.utilised_pct)">
                  {{ formatPct(b.utilised_pct) }}
                </span>
              </div>
              <p class="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
                {{ b.grant_id }} · {{ formatDate(b.grant_start) }} – {{ formatDate(b.grant_end) }}
              </p>
              <div class="mt-2.5 grid grid-cols-3 gap-2">
                <div>
                  <dt class="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Budget</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-blue-600 dark:text-blue-400">{{ formatInr(b.budget) }}</dd>
                </div>
                <div>
                  <dt class="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Disbursed</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-cyan-600 dark:text-cyan-400">{{ formatInr(b.disbursement) }}</dd>
                </div>
                <div>
                  <dt class="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Utilised</dt>
                  <dd class="mt-0.5 text-sm font-semibold text-green-600 dark:text-green-400">{{ formatInr(b.utilisation) }}</dd>
                </div>
              </div>
            </button>
          </div>

          <table v-else class="drill-table w-full min-w-max text-left text-sm">
            <thead class="sticky top-0 z-10 text-xs uppercase text-gray-500 dark:text-gray-400" :class="theme.bg">
              <tr>
                <th class="px-3 py-2 font-medium">Budget Reference</th>
                <th class="px-3 py-2 font-medium">Grant ID</th>
                <th class="px-3 py-2 font-medium">Dates</th>
                <th class="px-3 py-2 text-right font-medium text-blue-600 dark:text-blue-400">Budget</th>
                <th class="px-3 py-2 text-right font-medium text-cyan-600 dark:text-cyan-400">Disbursement</th>
                <th class="px-3 py-2 text-right font-medium text-green-600 dark:text-green-400">Utilisation</th>
                <th class="px-3 py-2 text-right font-medium">Util %</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr v-if="!filteredLevel2Rows.length">
                <td colspan="7" class="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                  {{ level2Search.searchQuery.value ? `No results for '${level2Search.searchQuery.value}'` : 'No budgets to show.' }}
                </td>
              </tr>
              <tr
                v-for="b in filteredLevel2Rows"
                :key="b.budget_id"
                class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                @click="selectBudget(b)"
              >
                <td class="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{{ b.budget_reference_name }}</td>
                <td class="px-3 py-2 text-gray-600 dark:text-gray-400">{{ b.grant_id }}</td>
                <td class="px-3 py-2 text-gray-600 dark:text-gray-400">{{ formatDate(b.grant_start) }} – {{ formatDate(b.grant_end) }}</td>
                <td class="px-3 py-2 text-right font-medium text-blue-700 dark:text-blue-400">{{ formatInr(b.budget) }}</td>
                <td class="px-3 py-2 text-right font-medium text-cyan-700 dark:text-cyan-400">{{ formatInr(b.disbursement) }}</td>
                <td class="px-3 py-2 text-right font-medium text-green-700 dark:text-green-400">{{ formatInr(b.utilisation) }}</td>
                <td class="px-3 py-2 text-right">
                  <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold" :class="pctBadgeClass(b.utilised_pct)">
                    {{ formatPct(b.utilised_pct) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </template>

        <template v-else-if="level === 3 && showsLineItems">
          <LineItemsTable
            :months="lineItemsData.months"
            :rows="filteredLineItemRows"
            :metric="type"
            :show-months="showMonths"
            :show-line-items="showLineItems"
          />
        </template>

        <template v-else-if="level === 3 && type === 'disbursement'">
          <table class="drill-table w-full text-left text-sm">
            <thead class="sticky top-0 z-10 text-xs uppercase text-gray-500 dark:text-gray-400" :class="theme.bg">
              <tr>
                <th class="px-3 py-2 font-medium">Date</th>
                <th class="px-3 py-2 text-right font-medium text-cyan-600 dark:text-cyan-400">Disbursed Amount</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr v-if="!filteredTrackerRows.length">
                <td colspan="2" class="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                  {{ level3Search.searchQuery.value ? `No results for '${level3Search.searchQuery.value}'` : 'No disbursement transactions.' }}
                </td>
              </tr>
              <tr v-for="(t, i) in filteredTrackerRows" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td class="px-3 py-2 text-gray-700 dark:text-gray-300">{{ formatDate(t.date_of_disbursement) }}</td>
                <td class="px-3 py-2 text-right font-medium text-cyan-700 dark:text-cyan-400">{{ formatInr(t.disbursed_amount) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="filteredTrackerRows.length" class="border-t-2 font-medium" :class="[theme.bg, 'border-cyan-200 dark:border-cyan-900']">
              <tr>
                <td class="px-3 py-2 text-gray-900 dark:text-gray-100">Total</td>
                <td class="px-3 py-2 text-right text-cyan-700 dark:text-cyan-400">{{ formatInr(filteredTrackerTotal) }}</td>
              </tr>
            </tfoot>
          </table>
        </template>
      </div>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
/* frappe-ui's Dialog only caps DialogContent's height implicitly (its own
my-8 margin inside an overflow-y-auto overlay) - on a short viewport
(mobile) the whole dialog, header included, scrolls as one block instead of
staying put while just the data below it scrolls. Capping dialog-content's
own height and making it a flex column lets the header (outside
.drill-scroll) stay fixed while only .drill-scroll's content moves. */
:deep(.dialog-content) {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 2rem);
}
/* A little wider than frappe-ui's own max-w-7xl preset (its widest step) -
there's no larger size option to switch to, so this stretches the same
preset further instead. */
:deep(.dialog-content.max-w-7xl) {
  max-width: 90rem;
}
/* bg-surface-modal wrapper -> its .flex row (single child) -> .w-full.flex-1
(holds the title bar, then our #body-content slot) - each needs to become a
flex column with min-height:0 in turn, or flex:1 on drill-modal-body further
down has nothing to actually grow/shrink within. */
:deep(.dialog-content > div:first-child),
:deep(.dialog-content > div:first-child > .flex),
:deep(.dialog-content > div:first-child > .flex > .flex-1) {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}
.drill-modal-body {
  min-height: 0;
  flex: 1;
}
.drill-scroll {
  overscroll-behavior: contain;
}
</style>

<script setup>
import { computed, ref, watch } from 'vue'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { Dialog, Button, Dropdown, ErrorMessage, Switch, TextInput, useCall } from 'frappe-ui'
import LucideIcon from '@/components/LucideIcon.vue'
import { fetchV2 } from '@/composables/useApiV2'
import Skeleton from '@/components/Skeleton.vue'
import LineItemsTable from '@/components/dashboard/LineItemsTable.vue'
import { formatInr, formatDate, formatPct, pctColorClass, pctBadgeClass, METRIC_THEME, showFullNumbers } from '@/composables/useDashboardFormat'

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')
import { useTableExport } from '@/composables/useTableExport'
import { mergeLineItems } from '@/composables/useLineItemsMerge'
import { useTableSearch } from '@/composables/useTableSearch'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  type: { type: String, required: true }, // 'budget' | 'utilisation' | 'disbursement'
  partners: { type: Array, default: () => [] },
  activeFilters: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const level = ref(1)
const selectedPartner = ref(null)
const selectedBudget = ref(null)
const consolidatedView = ref(false)
const showMonths = ref(true)
const showLineItems = ref(true)

watch(isOpen, (open) => {
  if (open) {
    level.value = 1
    selectedPartner.value = null
    selectedBudget.value = null
    consolidatedView.value = false
    level1Search.searchQuery.value = ''
    level2Search.searchQuery.value = ''
    level3Search.searchQuery.value = ''
  }
})

const typeLabel = computed(() => ({ budget: 'Approved Budget', utilisation: 'Total Utilisation', disbursement: 'Total Disbursement' }[props.type]))
const showsLineItems = computed(() => props.type === 'budget' || props.type === 'utilisation')
const theme = computed(() => METRIC_THEME[props.type])

const dialogTitle = computed(() => {
  if (consolidatedView.value) return `${typeLabel.value} — Consolidated Line Items`
  if (selectedBudget.value) return `${typeLabel.value} — ${selectedBudget.value.budget_reference_name}`
  if (selectedPartner.value) return `${typeLabel.value} — ${selectedPartner.value.partner_name}`
  return typeLabel.value
})

function statesForPartner(p) {
  const states = new Set((p.budgets || []).map((b) => b.state).filter(Boolean))
  return [...states].join(', ') || '—'
}

function goToLevel(n) {
  level.value = n
  consolidatedView.value = false
  if (n === 1) {
    selectedPartner.value = null
    selectedBudget.value = null
    level2Search.searchQuery.value = ''
    level3Search.searchQuery.value = ''
  } else if (n === 2) {
    selectedBudget.value = null
    level3Search.searchQuery.value = ''
  }
}

function selectPartner(p) {
  selectedPartner.value = p
  selectedBudget.value = null
  consolidatedView.value = false
  level2Search.searchQuery.value = ''
  level.value = 2
}

const lineItemsCall = useCall({
  url: computed(() =>
    `/api/v2/method/creche_reports.api.creche_dashboard.${props.type === 'utilisation' ? 'get_utilisation_line_items' : 'get_budget_line_items'}`,
  ),
  method: 'GET',
  params: () => ({
    budget_id: selectedBudget.value?.budget_id || '',
    start_date: props.activeFilters.start_date || undefined,
    end_date: props.activeFilters.end_date || undefined,
    financial_year: props.activeFilters.financial_year || undefined,
    month: props.activeFilters.month || undefined,
  }),
  immediate: false,
})

const disbursementCall = useCall({
  url: '/api/v2/method/creche_reports.api.creche_dashboard.get_disbursement_panel_data',
  method: 'GET',
  params: () => ({
    budget_ids: JSON.stringify(selectedBudget.value ? [selectedBudget.value.budget_id] : []),
    start_date: props.activeFilters.start_date || undefined,
    end_date: props.activeFilters.end_date || undefined,
    financial_year: props.activeFilters.financial_year || undefined,
    month: props.activeFilters.month || undefined,
  }),
  immediate: false,
})

function selectBudget(b) {
  selectedBudget.value = b
  consolidatedView.value = false
  level3Search.searchQuery.value = ''
  level.value = 3
  if (showsLineItems.value) lineItemsCall.reload()
  else disbursementCall.reload()
}

const trackerRows = computed(() => disbursementCall.data?.[0]?.tracker || [])
const trackerTotal = computed(() => trackerRows.value.reduce((s, t) => s + (t.disbursed_amount || 0), 0))

const consolidatedData = ref({ months: [], rows: [] })
const consolidatedLoading = ref(false)
const consolidatedError = ref(null)

async function openConsolidated() {
  if (!selectedPartner.value?.budgets?.length) return
  consolidatedLoading.value = true
  consolidatedError.value = null
  try {
    const method = props.type === 'utilisation' ? 'get_utilisation_line_items' : 'get_budget_line_items'
    const responses = await Promise.all(
      selectedPartner.value.budgets.map((b) =>
        fetchV2(`creche_reports.api.creche_dashboard.${method}`, {
          budget_id: b.budget_id,
          start_date: props.activeFilters.start_date || undefined,
          end_date: props.activeFilters.end_date || undefined,
          financial_year: props.activeFilters.financial_year || undefined,
          month: props.activeFilters.month || undefined,
        }),
      ),
    )
    consolidatedData.value = mergeLineItems(responses)
    consolidatedView.value = true
    level3Search.searchQuery.value = ''
    level.value = 3
  } catch (e) {
    consolidatedError.value = e
  } finally {
    consolidatedLoading.value = false
  }
}

const lineItemsData = computed(() => (consolidatedView.value ? consolidatedData.value : lineItemsCall.data || { months: [], rows: [] }))

// Each drill level keeps its own independent search query - level1Search is
// never cleared just because the user drills into a partner (level 2) or a
// budget (level 3), but switching levels never carries a stale query INTO
// the newly shown table either, since every level has its own query (reset
// together on open, and level2/level3 also reset whenever their underlying
// selection changes - see selectPartner/selectBudget/goToLevel below).
const level1Search = useTableSearch(() => props.partners, ['partner_name', 'partner_id', 'grant_ids'])
const level2Search = useTableSearch(() => selectedPartner.value?.budgets || [], ['budget_reference_name', 'grant_id'])
const level3Search = useTableSearch(
  () => (showsLineItems.value ? lineItemsData.value.rows || [] : trackerRows.value),
  [(row) => (showsLineItems.value ? row.type_of_expenses : formatDate(row.date_of_disbursement))],
)

const filteredLevel1Rows = level1Search.filteredRows
const filteredLevel2Rows = level2Search.filteredRows
const filteredLineItemRows = level3Search.filteredRows
const filteredTrackerRows = level3Search.filteredRows
const filteredTrackerTotal = computed(() => filteredTrackerRows.value.reduce((s, t) => s + (t.disbursed_amount || 0), 0))

// Every level always has exactly one visible table (partners, budgets, or
// level 3's line items / disbursement tracker, consolidated or not), so the
// search box is shown at every level.
const showsSearch = computed(() => level.value >= 1 && level.value <= 3)
const searchPlaceholder = computed(() => {
  if (level.value === 1) return 'Search partners...'
  if (level.value === 2) return 'Search budgets...'
  if (showsLineItems.value) return 'Search expense heads...'
  return 'Search transactions...'
})
const currentSearchQuery = computed({
  get: () => {
    if (level.value === 1) return level1Search.searchQuery.value
    if (level.value === 2) return level2Search.searchQuery.value
    return level3Search.searchQuery.value
  },
  set: (v) => {
    if (level.value === 1) level1Search.searchQuery.value = v
    else if (level.value === 2) level2Search.searchQuery.value = v
    else level3Search.searchQuery.value = v
  },
})

const currentLoading = computed(() => {
  if (level.value !== 3) return false
  if (consolidatedView.value) return consolidatedLoading.value
  return showsLineItems.value ? lineItemsCall.loading : disbursementCall.loading
})
const currentError = computed(() => {
  if (level.value !== 3) return null
  if (consolidatedView.value) return consolidatedError.value
  return showsLineItems.value ? lineItemsCall.error : disbursementCall.error
})

const { exporting, error: exportError, exportTable } = useTableExport()
const exportErrorMsg = computed(() => exportError.value)

const exportOptions = [
  { label: 'Excel (.xlsx)', icon: 'lucide-download', onClick: () => handleExport('xlsx') },
  { label: 'PDF (A4)', icon: 'lucide-file-text', onClick: () => handleExport('pdf') },
]

function handleExport(format) {
  if (level.value === 1) {
    const columns = [
      { label: 'Partner', key: 'partner_name', align: 'left' },
      { label: 'Grant IDs', key: 'grant_ids', align: 'left' },
      { label: 'Budget', key: 'total_budget', align: 'right' },
      { label: 'Disbursement', key: 'total_disbursement', align: 'right' },
      { label: 'Utilisation', key: 'total_utilisation', align: 'right' },
      { label: 'Util %', key: 'utilisation_pct', align: 'right' },
    ]
    const rows = filteredLevel1Rows.value.map((p) => ({
      partner_name: p.partner_name,
      grant_ids: p.grant_ids,
      total_budget: p.total_budget,
      total_disbursement: p.total_disbursement,
      total_utilisation: p.total_utilisation,
      utilisation_pct: p.utilisation_pct,
    }))
    exportTable(typeLabel.value, columns, rows, format)
  } else if (level.value === 2 && selectedPartner.value) {
    const columns = [
      { label: 'Budget Reference', key: 'budget_reference_name', align: 'left' },
      { label: 'Grant ID', key: 'grant_id', align: 'left' },
      { label: 'Budget', key: 'budget', align: 'right' },
      { label: 'Disbursement', key: 'disbursement', align: 'right' },
      { label: 'Utilisation', key: 'utilisation', align: 'right' },
      { label: 'Util %', key: 'utilised_pct', align: 'right' },
    ]
    exportTable(`${typeLabel.value} — ${selectedPartner.value.partner_name}`, columns, filteredLevel2Rows.value, format)
  } else if (level.value === 3) {
    if (showsLineItems.value) {
      const months = lineItemsData.value.months || []
      const columns = [
        { label: 'Expense Head', key: 'type_of_expenses', align: 'left' },
        ...months.map((m) => ({ label: m, key: m, align: 'right' })),
        { label: 'Total', key: 'total', align: 'right' },
      ]
      const rows = filteredLineItemRows.value.map((r) => {
        const row = { type_of_expenses: r.type_of_expenses, total: r.total }
        for (const m of months) row[m] = r.monthly?.[m] || 0
        return row
      })
      exportTable(dialogTitle.value, columns, rows, format)
    } else {
      const columns = [
        { label: 'Date', key: 'date_of_disbursement', align: 'left' },
        { label: 'Disbursed Amount', key: 'disbursed_amount', align: 'right' },
      ]
      exportTable(dialogTitle.value, columns, filteredTrackerRows.value, format)
    }
  }
}
</script>

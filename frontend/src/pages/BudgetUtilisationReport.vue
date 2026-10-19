<template>
  <AppLayout>
    <PageHeader>
      <template #title>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="opt in LEVEL_OPTIONS"
            :key="opt.value"
            type="button"
            class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
            :class="reportApi.filters.level !== opt.value && 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600'"
            :style="reportApi.filters.level === opt.value ? { borderColor: '#1a4f8a', background: '#1a4f8a', color: '#fff' } : {}"
            @click="reportApi.filters.level = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </template>
      <template #actions>
        <Switch v-model="showFullNumbers" label="Show full numbers" size="sm" />
        <Button variant="outline" size="sm" icon-left="lucide-rotate-ccw" aria-label="Clear all" @click="reportApi.clearAll()">
          <span class="max-sm:hidden">Clear all</span>
        </Button>
        <Button variant="outline" icon-left="lucide-download" :loading="exporting" aria-label="Export" @click="handleExport">
          <span class="max-sm:hidden">Export</span>
        </Button>
        <Button variant="outline" icon-left="lucide-refresh-cw" :loading="reportApi.loading.value" aria-label="Refresh" @click="reportApi.reload()">
          <span class="max-sm:hidden">Refresh</span>
        </Button>
      </template>
    </PageHeader>

    <div v-if="noAccess" class="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 py-16 dark:border-gray-800">
      <LucideIcon name="lock" class="h-8 w-8 text-gray-400" />
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">No access</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">You don't have permission to view this report.</p>
    </div>

    <template v-else>
      <!-- Mobile: 9 always-expanded filter fields means a long scroll before
      reaching any data - collapsed behind a disclosure instead, same spirit
      as DoctypeList.vue's own mobile Filter sheet, just inline rather than
      a separate Dialog since this is already a single self-contained grid. -->
      <button
        v-if="isMobile"
        type="button"
        class="mb-3 flex w-full items-center justify-between rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-300"
        @click="showMobileFilters = !showMobileFilters"
      >
        <span class="flex items-center gap-2">
          <LucideIcon name="sliders-horizontal" class="h-4 w-4" />
          Filters
          <span v-if="activeFilterCount" class="rounded-full px-1.5 py-0.5 text-xs font-semibold text-white" style="background: #1a4f8a">
            {{ activeFilterCount }}
          </span>
        </span>
        <LucideIcon :name="showMobileFilters ? 'chevron-up' : 'chevron-down'" class="h-4 w-4 text-gray-400" />
      </button>

      <div class="space-y-3" :class="{ 'hidden sm:block': isMobile && !showMobileFilters }">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Partner</label>
            <MultiSelect v-model="reportApi.filters.partner_id" :options="reportApi.partnerOptions.value" placeholder="All partners" class="w-full" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Budget Reference</label>
            <MultiSelect
              v-model="reportApi.filters.budget_reference"
              :options="reportApi.budgetRefOptions.value"
              :loading="reportApi.dependentOptionsLoading.value"
              placeholder="All budgets"
              class="w-full"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Grant ID</label>
            <MultiSelect
              v-model="reportApi.filters.grant_id"
              :options="reportApi.grantIdOptions.value"
              :loading="reportApi.dependentOptionsLoading.value"
              placeholder="All grants"
              class="w-full"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">State</label>
            <MultiSelect
              v-model="reportApi.filters.state"
              :options="reportApi.stateOptions.value"
              :loading="reportApi.dependentOptionsLoading.value"
              placeholder="All states"
              class="w-full"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">District</label>
            <MultiSelect
              v-model="reportApi.filters.district"
              :options="reportApi.districtOptions.value"
              :loading="reportApi.dependentOptionsLoading.value"
              placeholder="All districts"
              class="w-full"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Block</label>
            <MultiSelect
              v-model="reportApi.filters.block"
              :options="reportApi.blockOptions.value"
              :loading="reportApi.dependentOptionsLoading.value"
              placeholder="All blocks"
              class="w-full"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Financial Year</label>
            <MultiSelect v-model="reportApi.filters.financial_year" :options="reportApi.financialYearOptions.value" placeholder="All years" class="w-full" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Month</label>
            <MultiSelect v-model="reportApi.filters.month" :options="reportApi.monthOptions.value" placeholder="All months" class="w-full" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Start Date</label>
            <DatePicker v-model="reportApi.filters.start_date" placeholder="Select date" class="w-full" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">End Date</label>
            <DatePicker v-model="reportApi.filters.end_date" placeholder="Select date" class="w-full" />
          </div>
        </div>
      </div>

      <ErrorMessage class="mt-3" :message="exportError || reportApi.error.value" />

      <div v-if="reportApi.loading.value" class="mt-4 space-y-2">
        <Skeleton v-for="i in 8" :key="i" height="2.25rem" />
      </div>

      <!-- Mobile: a table with up to 16 columns forces endless horizontal
      scrolling on a phone - each row becomes its own card instead, same
      convention as DoctypeList.vue's mobile rows and LineItemsTable.vue's
      mobile groups. The tree structure (parent rows with nested children)
      is kept via the same expand/collapse chevron and an indent. Rather
      than dumping all ~13 remaining columns into one flat grid, the card
      leads with the 4 headline money metrics (what someone actually scans
      for) and tucks the rest - dates, grant ID, state, creches, the two
      percent ratios - behind its own "More details" disclosure. -->
      <div v-else-if="isMobile" class="mt-4 space-y-2">
        <div v-if="!visibleRows.length" class="rounded-xl border border-gray-200 px-3 py-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          No data to show.
        </div>
        <div
          v-for="(row, i) in visibleRows"
          :key="i"
          class="overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-800"
        >
          <button
            type="button"
            class="flex w-full items-center gap-1.5 px-3.5 py-2.5 text-left"
            :class="rowClass(row)"
            :style="{ paddingLeft: row.indent ? '2rem' : undefined, ...rowStyle(row) }"
            @click="hasChildren(row) ? toggle(row.row_name) : null"
          >
            <LucideIcon
              v-if="row.indent === 0 && !row.is_grand_total && hasChildren(row)"
              :name="collapsed[row.row_name] ? 'chevron-right' : 'chevron-down'"
              class="h-3.5 w-3.5 flex-shrink-0"
            />
            <span class="min-w-0 flex-1 truncate font-semibold">{{ formatCell(row, reportApi.columns.value[0]) }}</span>
          </button>

          <div class="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-800">
            <div v-for="col in headlineCols" :key="col.fieldname" class="bg-white px-3.5 py-2.5 dark:bg-gray-900">
              <dt class="truncate text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">{{ col.label }}</dt>
              <dd class="mt-0.5 truncate text-sm font-semibold" :class="moneyValueClass(row, col)">
                {{ formatCell(row, col) || '—' }}
              </dd>
            </div>
          </div>

          <button
            v-if="detailCols.length"
            type="button"
            class="flex w-full items-center justify-center gap-1 border-t border-gray-100 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800/50"
            @click="toggleDetails(i)"
          >
            {{ expandedDetails[i] ? 'Hide details' : 'More details' }}
            <LucideIcon :name="expandedDetails[i] ? 'chevron-up' : 'chevron-down'" class="h-3 w-3" />
          </button>

          <dl v-if="expandedDetails[i]" class="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-gray-100 bg-gray-50/60 px-3.5 py-2.5 text-xs dark:border-gray-800 dark:bg-gray-800/30">
            <template v-for="col in detailCols" :key="col.fieldname">
              <div class="min-w-0">
                <dt class="truncate text-gray-400 dark:text-gray-500">{{ col.label }}</dt>
                <dd class="mt-0.5 truncate font-medium text-gray-700 dark:text-gray-300">
                  <span v-if="col.fieldtype === 'Percent'" class="inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold" style="background: #e8f0fb; color: #1a4f8a">
                    {{ formatCell(row, col) }}
                  </span>
                  <template v-else>{{ formatCell(row, col) || '—' }}</template>
                </dd>
              </div>
            </template>
          </dl>
        </div>
      </div>

      <div v-else class="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table class="w-full min-w-max text-left text-sm">
          <!-- Same blue header banner pattern as the Import Template pages
          (#1a4f8a) instead of a flat gray header, for a consistent look
          across the app's reporting pages. -->
          <thead class="sticky top-0 z-20 text-xs uppercase text-white">
            <tr>
              <th
                v-for="(col, ci) in reportApi.columns.value"
                :key="col.fieldname"
                class="whitespace-nowrap px-3 py-2 font-medium"
                :class="[alignClass(col), ci === 0 ? 'sticky left-0 z-10' : '']"
                :style="{ minWidth: (col.width || 120) + 'px', background: '#1a4f8a' }"
              >
                {{ col.label }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-if="!visibleRows.length">
              <td :colspan="reportApi.columns.value.length || 1" class="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                No data to show.
              </td>
            </tr>
            <tr
              v-for="(row, i) in visibleRows"
              :key="i"
              :class="rowClass(row)"
              :style="rowStyle(row)"
            >
              <td
                v-for="(col, ci) in reportApi.columns.value"
                :key="col.fieldname"
                class="whitespace-nowrap px-3 py-2"
                :class="[alignClass(col), ci === 0 ? 'sticky left-0 z-10' : '']"
                :style="ci === 0 ? stickyCellStyle(row) : {}"
              >
                <span v-if="ci === 0" class="flex items-center gap-1.5" :style="{ paddingLeft: row.indent ? '1.25rem' : 0 }">
                  <LucideIcon
                    v-if="ci === 0 && row.indent === 0 && !row.is_grand_total && hasChildren(row)"
                    :name="collapsed[row.row_name] ? 'chevron-right' : 'chevron-down'"
                    class="h-3.5 w-3.5 flex-shrink-0 text-gray-400"
                    @click.stop="toggle(row.row_name)"
                  />
                  <span class="truncate">{{ formatCell(row, col) }}</span>
                </span>
                <span v-else-if="col.fieldtype === 'Percent'" class="inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold" style="background: #e8f0fb; color: #1a4f8a">
                  {{ formatCell(row, col) }}
                </span>
                <template v-else>{{ formatCell(row, col) }}</template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { Button, DatePicker, ErrorMessage, MultiSelect, Switch } from 'frappe-ui'
import AppLayout from '@/layouts/AppLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import Skeleton from '@/components/Skeleton.vue'
import { useBudgetUtilisationReport, LEVEL_OPTIONS } from '@/composables/useBudgetUtilisationReport'
import { formatInr, formatDate, formatPct, showFullNumbers } from '@/composables/useDashboardFormat'

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')

const reportApi = useBudgetUtilisationReport()
const noAccess = ref(false)

const showMobileFilters = ref(false)
// Every filter field except `level` (that's the Group By control, shown
// separately in the page header, not counted as an active "filter").
const activeFilterCount = computed(() =>
  Object.entries(reportApi.filters).reduce((count, [key, value]) => {
    if (key === 'level') return count
    return count + (Array.isArray(value) ? (value.length ? 1 : 0) : value ? 1 : 0)
  }, 0),
)

// Mobile card layout: the row-name column is the card's own title, these
// four are what someone actually scans a budget row for first, everything
// else (dates, grant ID, state, creches, the two percent ratios) sits behind
// the card's own "More details" disclosure instead of a 13-field wall.
const HEADLINE_FIELDS = ['total_budget', 'total_utilisation', 'total_disbursed', 'bank_balance']

const headlineCols = computed(() =>
  HEADLINE_FIELDS.map((f) => reportApi.columns.value.find((c) => c.fieldname === f)).filter(Boolean),
)
const detailCols = computed(() =>
  reportApi.columns.value.filter((c, i) => i !== 0 && !HEADLINE_FIELDS.includes(c.fieldname)),
)

// Color each headline figure like the desktop table's own METRIC_THEME
// accents would, instead of flat gray-900 text for every number - makes the
// 2x2 stat grid scannable at a glance the same way the dashboard's own
// summary cards are.
const HEADLINE_TONE = {
  total_budget: 'text-blue-600 dark:text-blue-400',
  total_utilisation: 'text-green-600 dark:text-green-400',
  total_disbursed: 'text-cyan-600 dark:text-cyan-400',
  bank_balance: 'text-pink-600 dark:text-pink-400',
}
function moneyValueClass(row, col) {
  if (row.is_grand_total) return 'text-inherit'
  return HEADLINE_TONE[col.fieldname] || 'text-gray-900 dark:text-gray-100'
}

const expandedDetails = reactive({})
function toggleDetails(i) {
  expandedDetails[i] = !expandedDetails[i]
}

onMounted(async () => {
  try {
    await reportApi.init()
  } catch (e) {
    if (e?.exc_type === 'PermissionError' || /permission/i.test(e?.message || '')) noAccess.value = true
  }
})

// A parent row (indent 0, not the grand total row) "has children" if a
// following indent-1 row exists before the next indent-0 row - mirrors how
// the desk report's own `tree: true` datatable config infers expandability
// purely from row order, since the backend never sends an explicit
// has_children flag (see get_data()'s indent-based flattening).
function hasChildren(row) {
  const rows = reportApi.rows.value
  const idx = rows.indexOf(row)
  const next = rows[idx + 1]
  return !!next && next.indent === 1
}

const collapsed = reactive({})
function toggle(rowName) {
  collapsed[rowName] = !collapsed[rowName]
}

const visibleRows = computed(() => {
  const rows = reportApi.rows.value
  const out = []
  let hideUntilNextParent = false
  for (const row of rows) {
    if (row.indent === 0) hideUntilNextParent = !!collapsed[row.row_name]
    else if (hideUntilNextParent) continue
    out.push(row)
  }
  return out
})

// Hover state is baked in per row type (not a single shared `hover:` class
// on every <tr>) so it never fights the row's own semantic background -
// the grand total row previously lightened to gray on hover despite being
// deliberately styled as a solid dark bar, and the sticky first column
// (which paints its own opaque background over the row, see stickyCellBg)
// never picked up a plain hover: utility at all since hover only applies to
// the element it's written on.
// Same blue palette as the Import Template pages: the grand total row as a
// solid #1a4f8a bar (previously plain black/white), section rows tinted with
// the same light-blue badge color (#e8f0fb/#1a4f8a) the import pages use for
// their own pill labels, instead of plain gray.
function rowClass(row) {
  if (row.is_grand_total) return 'font-semibold text-white hover:brightness-110 dark:hover:brightness-110'
  if (row.indent === 0) return 'font-semibold hover:brightness-95 dark:hover:brightness-110'
  return 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50'
}

function rowStyle(row) {
  if (row.is_grand_total) return { background: '#1a4f8a' }
  if (row.indent === 0) return { background: '#e8f0fb', color: '#1a4f8a' }
  return {}
}

// The sticky first column needs its own opaque background (a sticky cell
// paints over whatever scrolls underneath it, so it can't rely on the
// <tr>'s background showing through) - same colors as rowStyle, since a
// semi-transparent bg would let the scrolled-under row-name text ghost
// through the sticky cell.
function stickyCellStyle(row) {
  if (row.is_grand_total) return { background: '#1a4f8a' }
  if (row.indent === 0) return { background: '#e8f0fb', color: '#1a4f8a' }
  return {}
}

function alignClass(col) {
  return ['Currency', 'Int', 'Percent'].includes(col.fieldtype) ? 'text-right' : 'text-left'
}

function formatCell(row, col) {
  const value = row[col.fieldname]
  if (col.fieldtype === 'Currency') return formatInr(value)
  if (col.fieldtype === 'Percent') return formatPct(value, 0)
  if (col.fieldtype === 'Date') return formatDate(value)
  return value ?? ''
}

const exporting = ref(false)
const exportError = ref(null)

async function handleExport() {
  exporting.value = true
  exportError.value = null
  try {
    const qs = new URLSearchParams({ filters: JSON.stringify(reportApi.filters) })
    const res = await fetch(`/api/method/creche_reports.api.budget_utilisation_report.download_excel?${qs.toString()}`, {
      headers: { 'X-Frappe-CSRF-Token': window.csrf_token || '' },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?._error_message || body?.exception || 'Export failed')
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Budget_Utilisation_Report.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    exportError.value = e
  } finally {
    exporting.value = false
  }
}
</script>

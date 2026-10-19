<template>
  <AppLayout>
    <PageHeader description="Pick a budget to generate a pre-filled Excel template for bulk utilisation entry.">
      <template #actions>
        <!-- Same solid navy gradient as the desk page's own primary action
        button (.ut-btn-confirm) - plain variant="solid" theme="blue" (the
        built-in Button theme) renders a brighter Tailwind blue-500, not
        this app's own #1a4f8a brand navy, so the exact gradient is applied
        as an inline style instead. -->
        <Button
          variant="solid"
          icon-left="lucide-download"
          :loading="downloading"
          class="desk-primary-btn"
          @click="openConfirm"
        >
          Generate Import Template
        </Button>
      </template>
    </PageHeader>

    <ErrorMessage class="mb-4" :message="downloadError" />

    <!-- Filters - plain fields in a grid, no card/border wrapper around
    them (every field already carries its own label/box via FormControl/
    LinkField, so an outer bordered card was just a redundant second box).
    items-end on the grid keeps every field's own input row bottom-aligned
    across a line, so a field with no description/helper text lines up
    evenly with one that has one, instead of one looking "shorter/taller"
    purely from label wrapping or absent helper text. -->
    <div class="filter-grid grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <FormControl
        type="select"
        label="Budget Reference Name"
        required
        v-model="selectedBudget"
        :options="budgetOptions"
      />
      <FormControl type="text" label="Partner Name" v-model="budget.partner_name" read-only />
      <FormControl type="text" label="Grant ID" v-model="budget.grant_id" read-only />
      <FormControl type="text" label="State" v-model="budget.state" read-only />
      <FormControl type="text" label="No. of Crèches" v-model="budget.no_of_creches" read-only />
      <FormControl type="text" label="Block" v-model="budget.block" read-only />
      <FormControl type="text" label="District" v-model="budget.district" read-only />
      <LinkField
        :field="{ fieldname: 'financial_year', label: 'Financial Year', options: 'Financial year', reqd: true }"
        v-model="form.financial_year"
      />
      <FormControl
        type="select"
        label="Month"
        required
        v-model="form.month"
        :options="MONTH_OPTIONS"
      />
    </div>

    <!-- Summary card - same blue gradient header bar as the original desk
    page (creche_finance_reports/page/utilisation_import_template), not the
    admin's configurable accent color. -->
    <div class="mt-5 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2 border-b border-gray-200 px-4 py-2.5 dark:border-gray-800" style="background: linear-gradient(90deg, #1a4f8a 0%, #1e5fa8 100%)">
        <LucideIcon name="landmark" class="h-3.5 w-3.5 flex-shrink-0 text-white/80" />
        <p class="text-xs font-bold uppercase tracking-wide text-white">
          Partner &amp; Utilisation Details
        </p>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3">
        <SummaryCell label="Budget Ref. Name" :value="budget.budget_reference_name" />
        <SummaryCell label="Partner Name" :value="budget.partner_name" />
        <SummaryCell label="Grant ID" :value="budget.grant_id" />
        <SummaryCell label="State" :value="budget.state" />
        <SummaryCell label="No. of Crèches" :value="budget.no_of_creches" />
        <SummaryCell label="Block" :value="budget.block" />
        <SummaryCell label="District" :value="budget.district" />
        <SummaryCell label="Financial Year" :value="form.financial_year" />
        <SummaryCell label="Month" :value="form.month" />
      </div>
    </div>

    <!-- Utilisation items preview - section heading matches the desk page's
    own bold-uppercase title + blue underline (.ut-section-heading). -->
    <div class="mt-5">
      <div class="mb-4 flex items-center justify-between border-b-2 pb-2.5" style="border-color: #1a4f8a">
        <h2 class="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide" style="color: #1a4f8a">
          <LucideIcon name="list-tree" class="h-4 w-4 flex-shrink-0" />
          Utilisation Items Lines
        </h2>
        <span v-if="budgetItems.length" class="text-xs text-gray-400 dark:text-gray-500">{{ budgetItems.length }} items</span>
      </div>
      <div class="overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-800">
        <!-- min-w-[720px] (not 480px) + whitespace-nowrap on every cell -
        on a narrow phone this means the table scrolls horizontally inside
        its own card (the outer overflow-x-auto) instead of each column
        squeezing down and wrapping badge/label text across several lines,
        which made rows tall and hard to scan at 320-375px widths. -->
        <!-- max-h scales with the viewport (not a fixed 22rem) - a fixed
        height left a lot of unused space below the table on a tall/full-
        screen window while still clipping the pagination footer near the
        bottom edge, forcing an extra scroll to reach controls that should
        read as part of the same screenful. calc(100vh - 22rem) reserves
        room for the page header/filters/summary card above the table and
        the footer+page chrome below it, so the table's own inner scrollbar
        only kicks in once a long page of rows would otherwise genuinely
        overflow the viewport, with the sticky thead staying visible while
        scrolling through it. -->
        <div class="max-h-[calc(100vh-22rem)] min-h-[16rem] overflow-auto">
          <table class="w-full min-w-[720px] border-collapse text-sm">
            <thead class="sticky top-0 z-10">
              <tr class="text-xs uppercase tracking-wide text-white" style="background: #1a4f8a">
                <th class="w-12 whitespace-nowrap px-4 py-2.5 text-center font-semibold">#</th>
                <th class="whitespace-nowrap px-4 py-2.5 text-left font-semibold">Budget Main Head</th>
                <th class="whitespace-nowrap px-4 py-2.5 text-left font-semibold">Budget Sub Head</th>
                <th class="whitespace-nowrap px-4 py-2.5 text-left font-semibold">Type of Expenses</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr v-if="itemsLoading">
                <td colspan="4" class="px-4 py-10 text-center text-gray-400">
                  <LucideIcon name="loader-circle" class="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Loading...
                </td>
              </tr>
              <tr v-else-if="!budgetItems.length">
                <td colspan="4" class="px-4 py-10 text-center text-gray-400">No budget items found</td>
              </tr>
              <tr
                v-for="(row, i) in pagedBudgetItems"
                :key="row.name || i"
                class="row-desk-hover bg-white transition-colors dark:bg-gray-900/20"
              >
                <td class="whitespace-nowrap px-4 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400">{{ pageStart + i + 1 }}</td>
                <td class="whitespace-nowrap px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                  <span class="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold" style="background: #e8f0fb; color: #1a4f8a">
                    {{ row.budget_main_head || '—' }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-4 py-2.5 text-gray-600 dark:text-gray-400">{{ row.budget_sub_head || '—' }}</td>
                <td class="whitespace-nowrap px-4 py-2.5 text-gray-600 dark:text-gray-400">{{ row.type_of_expenses || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- flex-wrap + the footer-row class below (scoped style further
        down) lets the page-size tabs and the count/prev-next controls drop
        to a second line on a narrow phone instead of being forced onto one
        row, where frappe-ui's own ListFooter (a plain non-wrapping
        `flex justify-between`) was clipping the "next page" button
        entirely off the right edge at 320-375px widths. -->
        <div v-if="budgetItems.length" class="footer-wrap border-t border-gray-200 bg-gray-50/60 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900/40">
          <ListFooter
            :model-value="pageSize"
            :options="{ rowCount: pagedBudgetItems.length, totalCount: budgetItems.length, pageLengthOptions: PAGE_SIZE_OPTIONS }"
            @update:model-value="setPageSize"
          >
            <template #right>
              <div class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <span>{{ pageStart + 1 }}–{{ pageStart + pagedBudgetItems.length }}</span>
                <span>of</span>
                <span>{{ budgetItems.length }}</span>
              </div>
              <div class="ml-3 flex items-center gap-1">
                <Button variant="outline" size="sm" icon="lucide-chevron-left" :disabled="currentPage === 1" @click="currentPage--" />
                <Button variant="outline" size="sm" icon="lucide-chevron-right" :disabled="currentPage >= totalPages" @click="currentPage++" />
              </div>
            </template>
          </ListFooter>
        </div>
      </div>
    </div>

    <!-- Confirm & download dialog -->
    <Dialog v-model="showConfirm" :options="{ title: 'Check Basic Details', size: 'lg' }">
      <template #body-content>
        <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Review all details carefully. Once you confirm, the utilisation import template will be generated and downloaded.
        </p>
        <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <ConfirmCell label="Budget Ref. Name" :value="budget.budget_reference_name" />
          <ConfirmCell label="Partner Name" :value="budget.partner_name" />
          <ConfirmCell label="Partner ID" :value="budget.partner_id" />
          <ConfirmCell label="Grant ID" :value="budget.grant_id" />
          <ConfirmCell label="State" :value="budget.state" />
          <ConfirmCell label="No. of Crèches" :value="budget.no_of_creches" />
          <ConfirmCell label="Block" :value="budget.block" />
          <ConfirmCell label="District" :value="budget.district" />
          <ConfirmCell label="Financial Year" :value="form.financial_year" />
          <ConfirmCell label="Month" :value="form.month" />
        </div>
        <!-- Same light-blue declaration box as the desk page's own
        .ut-declaration (#f0f5fc bg / #c0d0e8 border / #1a4f8a accent). -->
        <label
          class="mt-5 flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-xs text-gray-600 dark:text-gray-400"
          style="background: #f0f5fc; border-color: #c0d0e8"
        >
          <input type="checkbox" v-model="declared" class="mt-0.5 accent-[#1a4f8a]" />
          <span>
            I hereby declare that <strong style="color: #1a4f8a">all the details provided above are correct</strong>
            and I take full responsibility for the accuracy of the information submitted for generating this utilisation import template.
          </span>
        </label>
      </template>
      <template #actions>
        <div class="flex w-full justify-end gap-2">
          <Button @click="showConfirm = false">Cancel</Button>
          <Button variant="solid" icon-left="lucide-check" class="desk-primary-btn" :disabled="!declared" :loading="downloading" @click="confirmDownload">
            Confirm &amp; Download
          </Button>
        </div>
      </template>
    </Dialog>
  </AppLayout>
</template>

<style scoped>
/* frappe-ui's Select/Combobox trigger is `inline-flex` with no width class
of its own, so it shrinks to fit its own content (e.g. "October") instead
of stretching to fill its grid cell - barely noticeable when a field sits
next to others with longer values, but obvious for a field like Month that
ends up alone in the grid's last row with empty space beside it.
FormControl itself has no way to pass a width class through to this inner
trigger (its own `class` prop is deliberately NOT forwarded past the outer
wrapper - see FormControl.vue's controlAttrs), so this targets the stable
data-slot="trigger" attribute both Select and Combobox expose, scoped to
just this page's filter grid. */
.filter-grid :deep([data-slot='trigger']) {
  width: 100% !important;
}

/* Same light-blue row-hover tint as the original desk page's
.ut-table-scroll tbody tr:hover (#e8f0fb) - a fixed color, not the app's
admin-configurable accent, matching this page's own blue "import template"
identity rather than whatever Accent Color is set in Creche App Setting. */
.row-desk-hover:hover {
  background-color: #e8f0fb !important;
}
:global(.dark) .row-desk-hover:hover {
  background-color: rgba(232, 240, 251, 0.12) !important;
}

/* frappe-ui's ListFooter root is a plain non-wrapping `flex justify-between`
with no prop to change that - forced to wrap here instead, so the page-size
tabs and the count/prev-next controls stack on a narrow phone rather than
one of them getting clipped off the edge. */
.footer-wrap :deep(.flex.justify-between) {
  flex-wrap: wrap;
  row-gap: 0.5rem;
}

/* This page's primary action buttons ("Generate Import Template",
"Confirm & Download") use the exact navy gradient the desk page's own
.ut-btn-confirm does, not frappe-ui's built-in Button theme colors (gray's
near-black solid, or blue theme's brighter Tailwind blue-500) - !important
to beat Button.vue's own Tailwind utility classes (bg-surface-gray-7 etc.),
which carry equal selector specificity and would otherwise win by being
the later rule in the compiled stylesheet. */
.desk-primary-btn {
  background: linear-gradient(135deg, #1a4f8a 0%, #1e5fa8 100%) !important;
  color: #ffffff !important;
}
.desk-primary-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #163f70 0%, #1a4f8a 100%) !important;
}
.desk-primary-btn:disabled {
  background: #9ab3d0 !important;
  color: #ffffff !important;
}
</style>

<script setup>
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { FormControl, Button, ErrorMessage, Dialog, ListFooter, toast } from 'frappe-ui'
import AppLayout from '@/layouts/AppLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import LinkField from '@/components/LinkField.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { fetchV2 } from '@/composables/useApiV2'
import { useImportTemplateDownload, useBudgetItemsPreview } from '@/composables/useImportTemplate'

// Border removal has to match the grid's own responsive column count (9
// cells in grid-cols-2 sm:grid-cols-3) - a plain `last:border-r-0` only
// strips the right border off the very last DOM cell, leaving every other
// row-end cell (every 2nd cell below sm, every 3rd cell at sm+) with a
// stray border flush against the card's own outer edge. Each nth-child
// override selector (e.g. `.foo:nth-child(3n)`) has higher specificity
// than the plain `.foo` utility it overrides, so this is safe regardless
// of generated-CSS source order.
const SUMMARY_CELL_CLASS =
  'border-gray-200 p-4 dark:border-gray-800 ' +
  'border-r [&:nth-child(2n)]:border-r-0 sm:border-r sm:[&:nth-child(3n)]:border-r-0 ' +
  'border-b [&:nth-last-child(-n+1)]:border-b-0 sm:border-b sm:[&:nth-last-child(-n+3)]:border-b-0'

const SummaryCell = (props) =>
  h('div', { class: SUMMARY_CELL_CLASS }, [
    h('p', { class: 'mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400' }, props.label),
    h(
      'p',
      { class: props.value ? 'truncate text-sm font-semibold text-gray-900 dark:text-gray-100' : 'text-xs italic text-gray-400 dark:text-gray-600' },
      props.value || 'Not set',
    ),
  ])
SummaryCell.props = ['label', 'value']

const ConfirmCell = (props) =>
  h('div', { class: 'min-w-0 rounded-lg border border-gray-200 p-3 dark:border-gray-800' }, [
    h('p', { class: 'mb-1 truncate text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400' }, props.label),
    h(
      'p',
      { class: props.value ? 'truncate text-sm font-semibold text-gray-900 dark:text-gray-100' : 'text-xs italic text-gray-400 dark:text-gray-600' },
      props.value || '—',
    ),
  ])
ConfirmCell.props = ['label', 'value']

const MONTH_OPTIONS = [
  { label: 'Select Month', value: '' },
  ...[
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ].map((m) => ({ label: m, value: m })),
]

// Every row get_all_budgets returns - picking one fills the read-only
// fields below, same as the desk page's on_budget_change().
const budgets = ref([])
const selectedBudget = ref('')
const budgetOptions = computed(() => [
  { label: 'Select Budget', value: '' },
  ...budgets.value.map((b) => ({ label: (b.budget_reference_name || b.name).trim(), value: b.name })),
])
const budget = computed(() => budgets.value.find((b) => b.name === selectedBudget.value) || {})

const form = reactive({
  financial_year: null,
  month: '',
})

onMounted(async () => {
  try {
    budgets.value = (await fetchV2('creche_reports.api.common.get_all_budgets')) || []
  } catch (e) {
    budgets.value = []
  }
})

// Defaults to the current month/financial-year, matching the desk page's
// auto_fill_date_fields() - saves a step for the common case of generating
// this month's template.
onMounted(() => {
  const now = new Date()
  form.month = now.toLocaleString('en-US', { month: 'long' })
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  form.financial_year = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`
})


const { items: budgetItems, loading: itemsLoading, load: loadBudgetItems } = useBudgetItemsPreview()
onMounted(loadBudgetItems)

// get_all_budget_items returns every configured row in one call (no
// server-side paging on that endpoint) - paginated client-side here,
// same page-size choices and footer UI as the generic DoctypeList.vue so
// a long items list (the master "Budget and Expense items list" can run
// well past a screenful) doesn't just dump every row unbounded.
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
const pageSize = ref(10)
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(budgetItems.value.length / pageSize.value)))
const pageStart = computed(() => (currentPage.value - 1) * pageSize.value)
const pagedBudgetItems = computed(() => budgetItems.value.slice(pageStart.value, pageStart.value + pageSize.value))

function setPageSize(size) {
  pageSize.value = size
  currentPage.value = 1
}

watch(budgetItems, () => {
  currentPage.value = 1
})

const REQUIRED = [
  ['budget_reference_name', 'Budget Reference Name'],
  ['financial_year', 'Financial Year'],
  ['month', 'Month'],
]

const showConfirm = ref(false)
const declared = ref(false)

function openConfirm() {
  const values = { budget_reference_name: budget.value.budget_reference_name, ...form }
  const missing = REQUIRED.filter(([key]) => !values[key]).map(([, label]) => label)
  if (missing.length) {
    toast.error(`Please fill mandatory fields: ${missing.join(', ')}`)
    return
  }
  declared.value = false
  showConfirm.value = true
}

watch(showConfirm, (open) => {
  if (!open) declared.value = false
})

const { download, downloading, downloadError } = useImportTemplateDownload(
  'creche_reports.api.import_template.download_utilisation_template',
)

async function confirmDownload() {
  try {
    await download(
      {
        budget_reference_id: budget.value.name || '',
        budget_reference_name: (budget.value.budget_reference_name || '').trim(),
        partner_name: budget.value.partner_name || '',
        partner_id: budget.value.partner_id || '',
        grant_id: budget.value.grant_id || '',
        block: budget.value.block || '',
        district: budget.value.district || '',
        state: budget.value.state || '',
        no_of_creches: parseInt(budget.value.no_of_creches) || 0,
        financial_year: form.financial_year,
        month: form.month,
      },
      'utilisation_template.xlsx',
    )
    showConfirm.value = false
    toast.success('Template downloaded successfully.')
  } catch (e) {
    // downloadError already surfaces the message inline; dialog stays open.
  }
}
</script>

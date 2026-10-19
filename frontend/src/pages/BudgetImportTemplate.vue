<template>
  <AppLayout>
    <PageHeader description="Fill in the details below to generate a pre-filled Excel template for bulk budget entry.">
      <template #actions>
        <!-- Same solid navy gradient as the desk page's own primary action
        button (.bt-btn-confirm) - plain variant="solid" theme="blue" (the
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
        type="text"
        label="Budget Reference Name"
        required
        v-model="form.budget_reference_name"
      />
      <FormControl
        type="select"
        label="Partner Name"
        required
        v-model="form.partner_id"
        :options="partnerOptions"
      />
      <FormControl type="text" label="Grant ID" v-model="form.grant_id" read-only />
      <LinkField
        :field="{ fieldname: 'state', label: 'State', options: 'State', reqd: true }"
        v-model="form.state"
      />
      <FormControl
        type="number"
        label="No. of Crèches"
        required
        v-model="form.no_of_creches"
      />
      <LinkField
        :field="{ fieldname: 'financial_year', label: 'Financial Year', options: 'Financial year', reqd: true }"
        v-model="form.financial_year"
      />
      <!-- frappe-ui's own styled DatePicker (a calendar popover) instead of
      FormControl type="date", which renders the browser's native date
      input - plain and visually inconsistent with the rest of this form
      (see BudgetUtilisationReport.vue for the same component already used
      elsewhere in this app). DatePicker has no `required` prop of its own,
      so the label + red asterisk is written out manually here, matching
      FormLabel.vue's exact markup (the same component FormControl's own
      label uses) so it looks identical to every other field's label. -->
      <div>
        <label class="mb-1.5 block text-xs text-ink-gray-5">Date of Approval<span class="text-ink-red-3 select-none"> *</span></label>
        <DatePicker v-model="form.date_of_approval" placeholder="Select date" class="w-full" />
      </div>
      <div>
        <label class="mb-1.5 block text-xs text-ink-gray-5">Start Date<span class="text-ink-red-3 select-none"> *</span></label>
        <DatePicker v-model="form.start_date" placeholder="Select date" class="w-full" />
      </div>
      <div>
        <label class="mb-1.5 block text-xs text-ink-gray-5">End Date<span class="text-ink-red-3 select-none"> *</span></label>
        <DatePicker v-model="form.end_date" placeholder="Select date" class="w-full" />
      </div>
    </div>

    <!-- Summary card - same blue gradient header bar as the original desk
    page (creche_finance_reports/page/budget_template), not the admin's
    configurable accent color: this is this app's own established "import
    template" visual identity (also used for the table header and the
    confirm dialog below), independent of whatever Accent Color is set in
    Creche App Setting. -->
    <div class="mt-5 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2 border-b border-gray-200 px-4 py-2.5 dark:border-gray-800" style="background: linear-gradient(90deg, #1a4f8a 0%, #1e5fa8 100%)">
        <LucideIcon name="landmark" class="h-3.5 w-3.5 flex-shrink-0 text-white/80" />
        <p class="text-xs font-bold uppercase tracking-wide text-white">
          Partner &amp; Budget Details
        </p>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3">
        <SummaryCell label="Budget Ref. Name" :value="form.budget_reference_name" />
        <SummaryCell label="Partner Name" :value="partnerName" />
        <SummaryCell label="Grant ID" :value="form.grant_id" />
        <SummaryCell label="Financial Year" :value="form.financial_year" />
        <SummaryCell label="State" :value="form.state" />
        <SummaryCell label="No. of Crèches" :value="form.no_of_creches" />
        <SummaryCell label="Date of Approval" :value="form.date_of_approval" />
        <SummaryCell label="Start Date" :value="form.start_date" />
        <SummaryCell label="End Date" :value="form.end_date" />
      </div>
    </div>

    <!-- Budget items preview - section heading matches the desk page's own
    bold-uppercase title + blue underline (.bt-section-heading). -->
    <div class="mt-5">
      <div class="mb-4 flex items-center justify-between border-b-2 pb-2.5" style="border-color: #1a4f8a">
        <h2 class="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide" style="color: #1a4f8a">
          <LucideIcon name="list-tree" class="h-4 w-4 flex-shrink-0" />
          Budget Items Lines
        </h2>
        <span v-if="budgetItems.length" class="text-xs text-gray-400 dark:text-gray-500">{{ budgetItems.length }} items</span>
      </div>
      <div class="overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-800">
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
          Review all details carefully. Once you confirm, the budget import template will be generated and downloaded.
        </p>
        <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <ConfirmCell label="Budget Ref. Name" :value="form.budget_reference_name" />
          <ConfirmCell label="Partner Name" :value="partnerName" />
          <ConfirmCell label="Partner ID" :value="form.partner_id" />
          <ConfirmCell label="Grant ID" :value="form.grant_id" />
          <ConfirmCell label="Financial Year" :value="form.financial_year" />
          <ConfirmCell label="State" :value="form.state" />
          <ConfirmCell label="No. of Crèches" :value="form.no_of_creches" />
          <ConfirmCell label="Date of Approval" :value="form.date_of_approval" />
          <ConfirmCell label="Start Date" :value="form.start_date" />
          <ConfirmCell label="End Date" :value="form.end_date" />
        </div>
        <!-- Same light-blue declaration box as the desk page's own
        .bt-declaration (#f0f5fc bg / #c0d0e8 border / #1a4f8a accent). -->
        <label
          class="mt-5 flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-xs text-gray-600 dark:text-gray-400"
          style="background: #f0f5fc; border-color: #c0d0e8"
        >
          <input type="checkbox" v-model="declared" class="mt-0.5 accent-[#1a4f8a]" />
          <span>
            I hereby declare that <strong style="color: #1a4f8a">all the details provided above are correct</strong>
            and I take full responsibility for the accuracy of the information submitted for generating this budget import template.
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
.bt-table-scroll tbody tr:hover (#e8f0fb) - a fixed color, not the app's
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
.bt-btn-confirm does, not frappe-ui's built-in Button theme colors (gray's
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
import { FormControl, Button, ErrorMessage, Dialog, DatePicker, ListFooter, toast } from 'frappe-ui'
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
// stray border flush against the card's own outer edge. Below sm and at
// sm+ each only ever set border-right/border-bottom once (not two
// competing nth-child rules for the same property at the same breakpoint,
// which would depend on unpredictable generated-CSS source order) - start
// with every border off, then switch ON only the ones each breakpoint
// actually needs via its own un-prefixed/sm: pair.
const SUMMARY_CELL_CLASS =
  'border-gray-200 p-4 dark:border-gray-800 ' +
  // Right border: on by default, off at the 2-col row end (even cells),
  // off at the 3-col row end instead once sm kicks in (multiples of 3).
  'border-r [&:nth-child(2n)]:border-r-0 sm:border-r sm:[&:nth-child(3n)]:border-r-0 ' +
  // Bottom border: on by default, off for the last row of 9 cells at 2
  // cols (cell 9 alone, row 5), off for the last row at 3 cols instead
  // once sm kicks in (cells 7-9, row 3).
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

const form = reactive({
  budget_reference_name: '',
  partner_id: '',
  grant_id: '',
  state: null,
  no_of_creches: '',
  financial_year: null,
  date_of_approval: '',
  start_date: '',
  end_date: '',
})

const partners = ref([])
const partnerOptions = computed(() => [
  { label: 'Select Partner', value: '' },
  ...partners.value.map((p) => ({ label: p.partner_name, value: p.name })),
])
const partnerName = computed(() => partners.value.find((p) => p.name === form.partner_id)?.partner_name || '')

onMounted(async () => {
  try {
    partners.value = (await fetchV2('creche_reports.api.common.get_all_partners')) || []
  } catch (e) {
    partners.value = []
  }
})

// Partner has no grant_id/state of its own in get_all_partners - those
// values live on the Creche Budget doctype, so unlike the utilisation page
// (which picks an EXISTING budget), this page leaves Grant ID/State as
// plain user-entered fields rather than something auto-filled from the
// partner.

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
  ['partner_id', 'Partner Name'],
  ['state', 'State'],
  ['no_of_creches', 'No. of Crèches'],
  ['financial_year', 'Financial Year'],
  ['date_of_approval', 'Date of Approval'],
  ['start_date', 'Start Date'],
  ['end_date', 'End Date'],
]

const showConfirm = ref(false)
const declared = ref(false)

function openConfirm() {
  const missing = REQUIRED.filter(([key]) => !form[key]).map(([, label]) => label)
  if (missing.length) {
    toast.error(`Please fill mandatory fields: ${missing.join(', ')}`)
    return
  }
  if (form.start_date && form.end_date && form.start_date > form.end_date) {
    toast.error('Start Date cannot be after End Date.')
    return
  }
  declared.value = false
  showConfirm.value = true
}

watch(showConfirm, (open) => {
  if (!open) declared.value = false
})

const { download, downloading, downloadError } = useImportTemplateDownload(
  'creche_reports.api.import_template.download_budget_template',
)

async function confirmDownload() {
  try {
    await download(
      {
        budget_reference_name: form.budget_reference_name,
        partner_name: partnerName.value,
        partner_id: form.partner_id,
        grant_id: form.grant_id,
        no_of_creches: parseInt(form.no_of_creches) || 0,
        state: form.state,
        financial_year: form.financial_year,
        date_of_approval: form.date_of_approval,
        start_date: form.start_date,
        end_date: form.end_date,
      },
      'budget_template.xlsx',
    )
    showConfirm.value = false
    toast.success('Template downloaded successfully.')
  } catch (e) {
    // downloadError already surfaces the message inline; dialog stays open.
  }
}
</script>

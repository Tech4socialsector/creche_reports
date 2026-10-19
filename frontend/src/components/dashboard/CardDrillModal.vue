<template>
  <Dialog v-model="isOpen" :options="{ size: '6xl', title: dialogTitle }">
    <template #body-content>
      <div class="flex flex-wrap items-center justify-between gap-3 border-b pb-3 dark:border-gray-800">
        <nav class="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          <span class="flex h-6 w-6 items-center justify-center rounded-full" :class="theme.bg">
            <LucideIcon :name="theme.icon" class="h-3.5 w-3.5" :class="theme.text" />
          </span>
          <button
            type="button"
            class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            :class="{ [`font-semibold ${theme.text}`]: !selectedPartner }"
            @click="selectedPartner = null"
          >
            {{ cardLabel }}
          </button>
          <template v-if="selectedPartner">
            <LucideIcon name="chevron-right" class="h-3.5 w-3.5 text-gray-400" />
            <span class="font-semibold" :class="theme.text">
              {{ selectedPartner.partner_name || selectedPartner.partner_id }}
            </span>
          </template>
        </nav>
        <div class="flex flex-shrink-0 items-center gap-2">
          <Dropdown :options="exportOptions" :button="{ variant: 'outline', iconLeft: 'lucide-download', loading: exporting, label: 'Export' }" />
        </div>
      </div>

      <ErrorMessage class="mt-3" :message="exportError" />

      <div class="mt-3 max-w-xs">
        <TextInput
          v-if="!selectedPartner"
          v-model="partnerSearch.searchQuery.value"
          type="text"
          placeholder="Search partners..."
        >
          <template #prefix>
            <LucideIcon name="search" class="h-4 w-4 text-ink-gray-5" />
          </template>
        </TextInput>
        <TextInput
          v-else
          v-model="budgetSearch.searchQuery.value"
          type="text"
          placeholder="Search budgets..."
        >
          <template #prefix>
            <LucideIcon name="search" class="h-4 w-4 text-ink-gray-5" />
          </template>
        </TextInput>
      </div>

      <div class="mt-3 max-h-[65vh] overflow-x-auto overflow-y-auto">
        <table v-if="!selectedPartner" class="w-full min-w-max text-left text-sm">
          <thead class="sticky top-0 z-10 text-xs uppercase text-gray-500 dark:text-gray-400" :class="theme.bg">
            <tr>
              <th class="px-3 py-2 font-medium">Partner</th>
              <th class="px-3 py-2 text-right font-medium">{{ cardLabel }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-if="!filteredPartnerRows.length">
              <td colspan="2" class="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                {{ partnerSearch.searchQuery.value ? `No results for '${partnerSearch.searchQuery.value}'` : 'No partners to show.' }}
              </td>
            </tr>
            <tr
              v-for="row in filteredPartnerRows"
              :key="row.partner.partner_id"
              class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
              @click="selectedPartner = row.partner"
            >
              <td class="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{{ row.partner.partner_name }}</td>
              <td class="px-3 py-2 text-right font-medium" :class="amountColorClass(row.value, metricTone)">
                {{ formatInr(row.value) }}
              </td>
            </tr>
          </tbody>
        </table>

        <table v-else class="w-full min-w-max text-left text-sm">
          <thead class="sticky top-0 z-10 text-xs uppercase text-gray-500 dark:text-gray-400" :class="theme.bg">
            <tr>
              <th class="px-3 py-2 font-medium">Budget Reference</th>
              <th class="px-3 py-2 font-medium">Grant ID</th>
              <th class="px-3 py-2 text-right font-medium">{{ cardLabel }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-if="!filteredBudgetRows.length">
              <td colspan="3" class="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                {{ budgetSearch.searchQuery.value ? `No results for '${budgetSearch.searchQuery.value}'` : 'No budgets to show.' }}
              </td>
            </tr>
            <tr v-for="row in filteredBudgetRows" :key="row.budget.budget_id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td class="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{{ row.budget.budget_reference_name }}</td>
              <td class="px-3 py-2 text-gray-600 dark:text-gray-400">{{ row.budget.grant_id }}</td>
              <td class="px-3 py-2 text-right font-medium" :class="amountColorClass(row.value, metricTone)">
                {{ formatInr(row.value) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Dialog, Dropdown, ErrorMessage, TextInput } from 'frappe-ui'
import LucideIcon from '@/components/LucideIcon.vue'
import { formatInr, amountColorClass, METRIC_THEME } from '@/composables/useDashboardFormat'
import { useTableExport } from '@/composables/useTableExport'
import { useTableSearch } from '@/composables/useTableSearch'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  metric: { type: String, required: true }, // 'balance_budget' | 'expected_bank_balance' | 'reported_bank_balance' | 'bank_balance_diff'
  partners: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const selectedPartner = ref(null)
watch(isOpen, (open) => {
  if (open) selectedPartner.value = null
})

// Partner-level and budget-level tables each keep their own independent
// search query - switching between them (drilling into a partner, or
// backing out) must not carry a stale query over from the other table.
watch(selectedPartner, () => {
  partnerSearch.searchQuery.value = ''
  budgetSearch.searchQuery.value = ''
})

const cardLabel = computed(() => ({
  balance_budget: 'Balance Budget to be Disbursed',
  expected_bank_balance: 'Expected Bank Balance',
  reported_bank_balance: 'Reported Bank Balance',
  bank_balance_diff: 'Bank Balance Difference',
}[props.metric]))

// Which of the shared accent identities this card's values read as -
// balance_budget is "what's left of the Approved Budget" so it borrows
// that color; the three bank-balance-flavored cards all share the bank/pink
// identity since they're all describing the same cash-position story.
const metricTone = computed(() => (props.metric === 'balance_budget' ? 'budget' : 'bank'))
const theme = computed(() => METRIC_THEME[metricTone.value])

const dialogTitle = computed(() => (selectedPartner.value ? `${cardLabel.value} — ${selectedPartner.value.partner_name}` : cardLabel.value))

function metricForPartner(p) {
  switch (props.metric) {
    case 'balance_budget': return p.total_budget - p.total_utilisation
    case 'expected_bank_balance': return p.total_disbursement - p.total_utilisation
    case 'reported_bank_balance': return p.total_bank_balance
    case 'bank_balance_diff': return (p.total_disbursement - p.total_utilisation) - p.total_bank_balance
    default: return 0
  }
}

function metricForBudget(b) {
  switch (props.metric) {
    case 'balance_budget': return b.budget - b.utilisation
    case 'expected_bank_balance': return b.disbursement - b.utilisation
    case 'reported_bank_balance': return b.bank_balance
    case 'bank_balance_diff': return (b.disbursement - b.utilisation) - b.bank_balance
    default: return 0
  }
}

const partnerRows = computed(() => props.partners.map((partner) => ({ partner, value: metricForPartner(partner) })))
const budgetRows = computed(() =>
  (selectedPartner.value?.budgets || []).map((budget) => ({ budget, value: metricForBudget(budget) })),
)

const partnerSearch = useTableSearch(partnerRows, [(row) => row.partner.partner_name])
const budgetSearch = useTableSearch(budgetRows, [(row) => row.budget.budget_reference_name, (row) => row.budget.grant_id])
const filteredPartnerRows = partnerSearch.filteredRows
const filteredBudgetRows = budgetSearch.filteredRows

const { exporting, error: exportError, exportTable } = useTableExport()

const exportOptions = [
  { label: 'Excel (.xlsx)', icon: 'lucide-download', onClick: () => handleExport('xlsx') },
  { label: 'PDF (A4)', icon: 'lucide-file-text', onClick: () => handleExport('pdf') },
]

function handleExport(format) {
  if (!selectedPartner.value) {
    const columns = [
      { label: 'Partner', key: 'partner_name', align: 'left' },
      { label: cardLabel.value, key: 'value', align: 'right' },
    ]
    const rows = filteredPartnerRows.value.map((r) => ({ partner_name: r.partner.partner_name, value: r.value }))
    exportTable(cardLabel.value, columns, rows, format)
  } else {
    const columns = [
      { label: 'Budget Reference', key: 'budget_reference_name', align: 'left' },
      { label: 'Grant ID', key: 'grant_id', align: 'left' },
      { label: cardLabel.value, key: 'value', align: 'right' },
    ]
    const rows = filteredBudgetRows.value.map((r) => ({
      budget_reference_name: r.budget.budget_reference_name,
      grant_id: r.budget.grant_id,
      value: r.value,
    }))
    exportTable(`${cardLabel.value} — ${selectedPartner.value.partner_name}`, columns, rows, format)
  }
}
</script>

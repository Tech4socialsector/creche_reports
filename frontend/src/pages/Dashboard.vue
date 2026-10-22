<template>
  <AppLayout>
    <PageHeader description="Budgets, disbursement and utilisation across all partners.">
      <template #actions>
        <Switch v-model="showFullNumbers" label="Show full numbers" size="sm" />
        <Button variant="outline" size="sm" icon-left="lucide-rotate-ccw" aria-label="Clear all" @click="filtersApi.clearAll()">
          <span class="max-sm:hidden">Clear all</span>
        </Button>
        <Button variant="outline" icon-left="lucide-refresh-cw" :loading="summary.loading" aria-label="Refresh" @click="summary.reload()">
          <span class="max-sm:hidden">Refresh</span>
        </Button>
      </template>
    </PageHeader>

    <div v-if="initializing" class="space-y-4">
      <Skeleton height="6rem" />
      <div class="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        <Skeleton v-for="i in 6" :key="i" height="4rem" />
      </div>
      <div class="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        <Skeleton v-for="i in 9" :key="i" height="5.5rem" />
      </div>
    </div>

    <div v-else-if="noAccess" class="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 py-16 dark:border-gray-800">
      <LucideIcon name="lock" class="h-8 w-8 text-gray-400" />
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">No access</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">You don't have permission to view any partner's data.</p>
    </div>

    <template v-else>
      <FilterBar
        :filters="filtersApi.filters"
        :partner-options="filtersApi.partnerOptions.value"
        :loading-partner-options="filtersApi.loadingPartnerOptions.loading"
        :budget-ref-options="filtersApi.budgetRefOptions.value"
        :grant-id-options="filtersApi.grantIdOptions.value"
        :budget-status-options="filtersApi.budgetStatusOptions"
        :state-options="filtersApi.stateOptions.value"
        :district-options="filtersApi.districtOptions.value"
        :block-options="filtersApi.blockOptions.value"
        :dependent-options-loading="filtersApi.dependentOptionsLoading.value"
      />

      <section class="mt-6">
        <h2 class="mb-3 text-base font-semibold text-gray-700 dark:text-gray-300">Operational Overview</h2>
        <div v-if="summary.loading && !summary.data" class="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          <Skeleton v-for="i in 6" :key="i" height="4rem" />
        </div>
        <div v-else class="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          <button
            v-for="tile in overviewTiles"
            :key="tile.key"
            type="button"
            class="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 text-left hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
            @click="openOverviewModal(tile.key)"
          >
            <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" :class="tile.theme.bg">
              <LucideIcon :name="tile.theme.icon" class="h-4 w-4" :class="tile.theme.text" />
            </span>
            <span class="min-w-0">
              <p class="truncate text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ tile.label }}</p>
              <p class="mt-0.5 text-base font-semibold" :class="tile.theme.text">{{ tile.value }}</p>
            </span>
          </button>
        </div>
      </section>

      <ErrorMessage v-if="summary.error" class="mt-4" :message="summary.error" />

      <template v-if="summary.data">
        <section class="mt-6">
          <h2 class="mb-3 text-base font-semibold text-gray-700 dark:text-gray-300">Financial Overview</h2>
          <div class="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            <SummaryCard
              label="Approved Budget"
              :value="s.total_budget"
              subtitle="Total sanctioned grant amount"
              metric="budget"
              @click="openDrill('budget')"
            />
            <SummaryCard
              label="Total Disbursement"
              :value="s.total_disbursement"
              :subtitle="`${formatPct(s.disbursement_pct)} of approved budget transferred`"
              metric="disbursement"
              @click="openDrill('disbursement')"
            />
            <SummaryCard
              label="Total Utilisation"
              :value="s.total_utilisation"
              :subtitle="`${utilOfDisbursementPct}% of disbursed amount utilised`"
              metric="utilisation"
              @click="openDrill('utilisation')"
            />
            <SummaryCard
              label="Balance Budget to be Disbursed"
              :value="balanceBudget"
              :subtitle="balanceBudget < 0 ? '⚠ Over-utilized beyond approved budget' : 'Approved budget yet to be spent'"
              :tone="balanceBudget < 0 ? 'bad' : 'neutral'"
              :metric="balanceBudget < 0 ? '' : 'budget'"
              :icon="balanceBudget < 0 ? 'triangle-alert' : 'wallet'"
              @click="openCardDrill('balance_budget')"
            />
            <SummaryCard
              label="Expected Bank Balance"
              :value="expectedBankBalance"
              :subtitle="expectedBankBalance < 0 ? '⚠ Partners spent more than released' : 'Released but not yet reported as spent'"
              :tone="expectedBankBalance < 0 ? 'bad' : 'neutral'"
              :metric="expectedBankBalance < 0 ? '' : 'bank'"
              :icon="expectedBankBalance < 0 ? 'triangle-alert' : 'landmark'"
              @click="openCardDrill('expected_bank_balance')"
            />
            <SummaryCard
              label="Reported Bank Balance"
              :value="s.total_bank_balance"
              subtitle="Self-reported cash balance in partner accounts"
              metric="bank"
              @click="openCardDrill('reported_bank_balance')"
            />
            <SummaryCard
              label="Bank Balance Difference"
              :value="bankBalanceDiff"
              :subtitle="bankBalanceDiffSubtitle"
              :tone="bankBalanceDiffTone"
              icon="scale"
              @click="openCardDrill('bank_balance_diff')"
            />
            <SummaryCard
              label="Partners with 85%+ Disbursement Utilization"
              :value="partners85Count"
              subtitle="Click to view the list"
              tone="good"
              icon="award"
              is-count
              @click="showPartnersThreshold = true"
            />
            <SummaryCard
              v-if="pendingUtil.loading && !pendingUtil.data"
              label="Pending Utilization Submission"
              :value="0"
              subtitle="Loading…"
              icon="clock"
              is-count
            />
            <SummaryCard
              v-else
              label="Pending Utilization Submission"
              :value="pendingPartnerCount"
              :subtitle="`${pendingPartnerCount} partners — through ${pendingThroughLabel}`"
              :tone="pendingPartnerCount > 0 ? 'warn' : 'good'"
              icon="clock"
              is-count
              @click="showPendingUtil = true"
            />
          </div>
        </section>

        <section class="mt-6">
          <h2 class="mb-3 text-base font-semibold text-gray-700 dark:text-gray-300">Comparison</h2>
          <div class="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3">
            <SplitBarCard
              title="Budget vs Utilisation"
              base-label="Approved Budget"
              :base="s.total_budget"
              :used="s.total_utilisation"
              color="#16a34a"
              @click="openDrill('budget')"
            />
            <SplitBarCard
              title="Disbursement vs Utilisation"
              base-label="Total Disbursement"
              :base="s.total_disbursement"
              :used="s.total_utilisation"
              color="#0891b2"
              @click="openDrill('disbursement')"
            />
            <SplitBarCard
              title="Expected vs Reported Bank Balance"
              base-label="Expected Bank Balance"
              :base="expectedBankBalance"
              :used="s.total_bank_balance"
              color="#db2777"
              @click="openCardDrill('reported_bank_balance')"
            />
          </div>
        </section>
      </template>
    </template>

    <DrillModal
      v-model="showDrill"
      :type="drillType"
      :partners="partners"
      :active-filters="filtersApi.filters"
    />
    <CardDrillModal v-model="showCardDrill" :metric="cardDrillMetric" :partners="partners" />
    <PartnersThresholdModal v-model="showPartnersThreshold" :partners="partners" />
    <PendingUtilisationModal v-model="showPendingUtil" :partners="pendingUtil.data?.partners || []" :cutoff="pendingUtil.data?.cutoff || ''" />
    <OverviewStripModal v-model="showOverviewModal" :stat="overviewStat" :partners="partners" />
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Button, ErrorMessage, Switch, useCall } from 'frappe-ui'
import LucideIcon from '@/components/LucideIcon.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import Skeleton from '@/components/Skeleton.vue'
import FilterBar from '@/components/dashboard/FilterBar.vue'
import SummaryCard from '@/components/dashboard/SummaryCard.vue'
import SplitBarCard from '@/components/dashboard/SplitBarCard.vue'
import DrillModal from '@/components/dashboard/DrillModal.vue'
import CardDrillModal from '@/components/dashboard/CardDrillModal.vue'
import PartnersThresholdModal from '@/components/dashboard/PartnersThresholdModal.vue'
import PendingUtilisationModal from '@/components/dashboard/PendingUtilisationModal.vue'
import OverviewStripModal from '@/components/dashboard/OverviewStripModal.vue'
import { useDashboardFilters } from '@/composables/useDashboardFilters'
import { formatPct, STAT_THEME, showFullNumbers } from '@/composables/useDashboardFormat'

const initializing = ref(true)
const noAccess = ref(false)

// Declared before the useCall()s below, which close over it in their
// `params` functions - some of frappe-ui's internals evaluate those
// eagerly during setup rather than lazily on first read, so a `const`
// declared later here hits the temporal dead zone instead of just being
// "not populated yet".
const filtersApi = useDashboardFilters(reloadAll)

const summary = useCall({
  url: '/api/v2/method/creche_reports.api.creche_dashboard.get_partner_budget_summary',
  method: 'GET',
  params: () => ({ filters: JSON.stringify(filtersApi.effectiveFilters()) }),
  immediate: false,
})

const pendingUtil = useCall({
  url: '/api/v2/method/creche_reports.api.creche_dashboard.get_pending_utilisation_summary',
  method: 'GET',
  params: () => ({ filters: JSON.stringify(filtersApi.effectiveFilters()) }),
  immediate: false,
})

function reloadAll() {
  summary.reload()
  pendingUtil.reload()
}

onMounted(async () => {
  await filtersApi.init()
  if (!filtersApi.permittedPartnerIds.value || filtersApi.permittedPartnerIds.value.length === 0) {
    noAccess.value = true
    initializing.value = false
    return
  }
  reloadAll()
  initializing.value = false
})

const s = computed(() => summary.data?.summary || {})
const partners = computed(() => summary.data?.partners || [])

const balanceBudget = computed(() => (s.value.total_budget || 0) - (s.value.total_utilisation || 0))
const expectedBankBalance = computed(() => (s.value.total_disbursement || 0) - (s.value.total_utilisation || 0))
const bankBalanceDiff = computed(() => expectedBankBalance.value - (s.value.total_bank_balance || 0))

const utilOfDisbursementPct = computed(() => {
  const disb = s.value.total_disbursement || 0
  if (!disb) return '0.0'
  return ((s.value.total_utilisation / disb) * 100).toFixed(1)
})

const bankBalanceDiffTone = computed(() => {
  if (Math.abs(bankBalanceDiff.value) < 1) return 'good'
  return bankBalanceDiff.value < 0 ? 'bad' : 'warn'
})
const bankBalanceDiffSubtitle = computed(() => {
  if (Math.abs(bankBalanceDiff.value) < 1) return '✓ Bank matches expected amount'
  if (bankBalanceDiff.value < 0) return '⚠ Bank higher than expected — review funds'
  return '⚠ Bank lower than expected — possible unreported spend'
})

const partners85Count = computed(
  () => partners.value.filter((p) => p.total_disbursement > 0 && p.total_utilisation / p.total_disbursement >= 0.85).length,
)

const pendingPartnerCount = computed(() => pendingUtil.data?.partners?.length || 0)
const pendingThroughLabel = computed(() => {
  const cutoff = pendingUtil.data?.cutoff
  if (!cutoff) return '—'
  const d = new Date(cutoff)
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
})

const overviewTiles = computed(() => {
  const allBudgets = partners.value.flatMap((p) => p.budgets || [])
  const states = new Set(allBudgets.map((b) => b.state).filter(Boolean))
  const districts = new Set(allBudgets.map((b) => b.district).filter(Boolean))
  const blocks = new Set(allBudgets.map((b) => b.block).filter(Boolean))
  const creches = allBudgets.reduce((sum, b) => sum + (b.no_of_creches || 0), 0)
  return [
    { key: 'partners', label: 'Partners', value: partners.value.length, theme: STAT_THEME.partners },
    { key: 'budgets', label: 'Allocated Budgets', value: allBudgets.length, theme: STAT_THEME.budgets },
    { key: 'creches', label: 'Approved Creches', value: creches, theme: STAT_THEME.creches },
    { key: 'states', label: 'Working States', value: states.size, theme: STAT_THEME.states },
    { key: 'districts', label: 'Districts', value: districts.size, theme: STAT_THEME.districts },
    { key: 'blocks', label: 'Blocks', value: blocks.size, theme: STAT_THEME.blocks },
  ]
})

const showDrill = ref(false)
const drillType = ref('budget')
function openDrill(type) {
  drillType.value = type
  showDrill.value = true
}

const showCardDrill = ref(false)
const cardDrillMetric = ref('balance_budget')
function openCardDrill(metric) {
  cardDrillMetric.value = metric
  showCardDrill.value = true
}

const showPartnersThreshold = ref(false)
const showPendingUtil = ref(false)

const showOverviewModal = ref(false)
const overviewStat = ref('partners')
function openOverviewModal(stat) {
  overviewStat.value = stat
  showOverviewModal.value = true
}
</script>

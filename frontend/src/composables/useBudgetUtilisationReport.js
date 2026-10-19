import { computed, reactive, ref, watch } from 'vue'
import { useCall } from 'frappe-ui'
import { useDebounceFn } from '@vueuse/core'
import { fetchV2 } from '@/composables/useApiV2'

// Mirrors the desk Script Report's own `level` Select options exactly -
// the backend's get_columns()/get_data() branch on this same lowercased
// string (see creche_budget_utilisation_report.py's execute()).
export const LEVEL_OPTIONS = [
  { label: 'Partner Wise', value: 'partner wise' },
  { label: 'Budget Wise', value: 'budget wise' },
  { label: 'State', value: 'state' },
  { label: 'District', value: 'district' },
  { label: 'Block', value: 'block' },
]

export function useBudgetUtilisationReport() {
  const filters = reactive({
    level: 'partner wise',
    partner_id: [],
    budget_reference: [],
    grant_id: [],
    financial_year: [],
    month: [],
    state: [],
    district: [],
    block: [],
    start_date: '',
    end_date: '',
  })

  const reportCall = useCall({
    url: '/api/v2/method/creche_reports.api.budget_utilisation_report.get_report_data',
    method: 'GET',
    params: () => ({ filters: JSON.stringify(filters) }),
    immediate: false,
  })

  const columns = computed(() => reportCall.data?.columns || [])
  const rows = computed(() => reportCall.data?.data || [])

  // Budget Reference / Grant ID / State / District / Block all live on
  // Creche Budget and the report matches them against partner_name (a plain
  // Data field mirrored onto Creche Budget), not the partner_id docname - so
  // these dependent lookups filter by partner_name too, the same value the
  // Partner filter itself carries.
  function budgetFieldFilters() {
    const f = {}
    if (filters.partner_id.length) f.partner_name = ['in', filters.partner_id]
    return f
  }

  function uniqueSorted(rows, key) {
    const vals = new Set()
    for (const r of rows || []) {
      if (r[key]) vals.add(r[key])
    }
    return [...vals].sort().map((v) => ({ label: v, value: v }))
  }

  const partnerOptions = ref([])
  const budgetRefOptions = ref([])
  const grantIdOptions = ref([])
  const stateOptions = ref([])
  const districtOptions = ref([])
  const blockOptions = ref([])
  const financialYearOptions = ref([])
  const monthOptions = ref([])
  const dependentOptionsLoading = ref(false)

  async function reloadPartnerOptions() {
    const names = await fetchV2('creche_reports.api.budget_utilisation_report.get_filter_options', {
      doctype: 'Creche Partners',
    })
    partnerOptions.value = (names || []).map((v) => ({ label: v, value: v }))
  }

  async function fetchDocList(doctype, fields, params = {}) {
    const qs = new URLSearchParams({ fields: JSON.stringify(fields), limit: '1000', ...params })
    const res = await fetch(`/api/v2/document/${encodeURIComponent(doctype)}?${qs.toString()}`, {
      headers: { 'X-Frappe-CSRF-Token': window.csrf_token || '' },
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) return []
    return body?.data || []
  }

  async function reloadDependentOptions() {
    dependentOptionsLoading.value = true
    try {
      const budgetFilters = budgetFieldFilters()
      const [budgets, states, districts, blocks] = await Promise.all([
        fetchDocList('Creche Budget', ['budget_reference_name', 'grant_id'], {
          filters: JSON.stringify(budgetFilters),
        }).catch(() => []),
        fetchV2('creche_reports.api.budget_utilisation_report.get_filter_options', { doctype: 'State' }),
        fetchV2('creche_reports.api.budget_utilisation_report.get_filter_options', { doctype: 'District' }),
        fetchV2('creche_reports.api.budget_utilisation_report.get_filter_options', { doctype: 'Block' }),
      ])
      budgetRefOptions.value = uniqueSorted(budgets, 'budget_reference_name')
      grantIdOptions.value = uniqueSorted(budgets, 'grant_id')
      stateOptions.value = (states || []).map((v) => ({ label: v, value: v }))
      districtOptions.value = (districts || []).map((v) => ({ label: v, value: v }))
      blockOptions.value = (blocks || []).map((v) => ({ label: v, value: v }))
    } finally {
      dependentOptionsLoading.value = false
    }
  }

  async function reloadFyAndMonthOptions() {
    const [fys, months] = await Promise.all([
      fetchDocList('Financial year', ['name']).catch(() => []),
      fetchDocList('Months', ['name']).catch(() => []),
    ])
    financialYearOptions.value = (fys || []).map((r) => ({ label: r.name, value: r.name }))
    monthOptions.value = (months || []).map((r) => ({ label: r.name, value: r.name }))
  }

  async function init() {
    await Promise.all([reloadPartnerOptions(), reloadDependentOptions(), reloadFyAndMonthOptions()])
    reportCall.reload()
  }

  const debouncedReload = useDebounceFn(() => reportCall.reload(), 500)

  watch(
    () => filters.partner_id.slice(),
    () => {
      filters.budget_reference = []
      filters.grant_id = []
      filters.state = []
      filters.district = []
      filters.block = []
      reloadDependentOptions()
      debouncedReload()
    },
  )

  watch(
    () => [
      filters.level,
      filters.budget_reference.slice(),
      filters.grant_id.slice(),
      filters.financial_year.slice(),
      filters.month.slice(),
      filters.state.slice(),
      filters.district.slice(),
      filters.block.slice(),
      filters.start_date,
      filters.end_date,
    ],
    () => debouncedReload(),
    { deep: true },
  )

  function clearAll() {
    filters.level = 'partner wise'
    filters.partner_id = []
    filters.budget_reference = []
    filters.grant_id = []
    filters.financial_year = []
    filters.month = []
    filters.state = []
    filters.district = []
    filters.block = []
    filters.start_date = ''
    filters.end_date = ''
    reloadDependentOptions()
    reportCall.reload()
  }

  return {
    filters,
    clearAll,
    init,
    columns,
    rows,
    loading: computed(() => reportCall.loading),
    error: computed(() => reportCall.error),
    reload: () => reportCall.reload(),
    partnerOptions,
    budgetRefOptions,
    grantIdOptions,
    stateOptions,
    districtOptions,
    blockOptions,
    financialYearOptions,
    monthOptions,
    dependentOptionsLoading,
  }
}

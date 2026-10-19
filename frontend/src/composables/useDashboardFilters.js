import { computed, reactive, ref, watch } from 'vue'
import { useCall } from 'frappe-ui'
import { useDebounceFn } from '@vueuse/core'

// Centralizes every dashboard filter field plus the dependent (partner-
// scoped) dropdown option fetches and the debounced summary reload - shared
// between Dashboard.vue (which owns the actual summary/pending-utilisation
// calls) and FilterBar.vue (which only renders the controls).
export function useDashboardFilters(onFiltersChanged) {
  const filters = reactive({
    partner_id: [],
    budget_ref: [],
    grant_id: [],
    budget_status: [],
    state: [],
    district: [],
    block: [],
    start_date: '',
    end_date: '',
  })

  // A fixed enum (Creche Budget's own Budget Status select options), not
  // fetched from the server like the other dropdowns - there are only ever
  // these two values.
  const budgetStatusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Closed', value: 'Closed' },
  ]

  const permittedPartnerIds = ref(null)

  const partnerOptionsCall = useCall({
    url: '/api/v2/method/creche_reports.api.creche_dashboard.get_partner_options',
    method: 'GET',
    params: () => ({ txt: '' }),
    immediate: false,
  })

  function budgetFieldFilters() {
    const f = {}
    if (filters.partner_id.length) f.partner_id = ['in', filters.partner_id]
    return f
  }

  const budgetRefCall = useCall({
    url: '/api/v2/document/Creche Budget',
    method: 'GET',
    params: () => ({
      fields: JSON.stringify(['budget_reference_name']),
      filters: JSON.stringify(budgetFieldFilters()),
      limit: 1000,
    }),
    immediate: false,
  })
  const grantIdCall = useCall({
    url: '/api/v2/document/Creche Budget',
    method: 'GET',
    params: () => ({
      fields: JSON.stringify(['grant_id']),
      filters: JSON.stringify(budgetFieldFilters()),
      limit: 1000,
    }),
    immediate: false,
  })
  const stateCall = useCall({
    url: '/api/v2/document/Creche Budget',
    method: 'GET',
    params: () => ({
      fields: JSON.stringify(['state']),
      filters: JSON.stringify(budgetFieldFilters()),
      limit: 1000,
    }),
    immediate: false,
  })
  const districtCall = useCall({
    url: '/api/v2/document/Creche Budget',
    method: 'GET',
    params: () => ({
      fields: JSON.stringify(['district']),
      filters: JSON.stringify(budgetFieldFilters()),
      limit: 1000,
    }),
    immediate: false,
  })
  const blockCall = useCall({
    url: '/api/v2/document/Creche Budget',
    method: 'GET',
    params: () => ({
      fields: JSON.stringify(['block']),
      filters: JSON.stringify(budgetFieldFilters()),
      limit: 1000,
    }),
    immediate: false,
  })

  function uniqueSorted(rows, key) {
    const vals = new Set()
    for (const r of rows || []) {
      if (r[key]) vals.add(r[key])
    }
    return [...vals].sort().map((v) => ({ label: v, value: v }))
  }

  function reloadDependentOptions() {
    budgetRefCall.reload()
    grantIdCall.reload()
    stateCall.reload()
    districtCall.reload()
    blockCall.reload()
  }

  async function init() {
    const data = await partnerOptionsCall.submit()
    permittedPartnerIds.value = (data || []).map((p) => p.name)
    reloadDependentOptions()
  }

  const debouncedEmit = useDebounceFn(() => {
    onFiltersChanged(effectiveFilters())
  }, 700)

  // partner_id empty means "everything I'm permitted to see" - never an
  // unscoped all-partners call (see get_partner_options' own permission
  // scoping), so an empty selection still sends the permitted id list.
  function effectiveFilters() {
    const out = { ...filters }
    if (!out.partner_id.length) {
      out.partner_id = permittedPartnerIds.value || []
    }
    return out
  }

  watch(
    () => filters.partner_id.slice(),
    () => {
      filters.budget_ref = []
      filters.grant_id = []
      filters.state = []
      filters.district = []
      filters.block = []
      reloadDependentOptions()
      debouncedEmit()
    },
  )

  watch(
    () => [
      filters.budget_ref.slice(),
      filters.grant_id.slice(),
      filters.budget_status.slice(),
      filters.state.slice(),
      filters.district.slice(),
      filters.block.slice(),
      filters.start_date,
      filters.end_date,
    ],
    () => debouncedEmit(),
    { deep: true },
  )

  function clearAll() {
    filters.partner_id = []
    filters.budget_ref = []
    filters.grant_id = []
    filters.budget_status = []
    filters.state = []
    filters.district = []
    filters.block = []
    filters.start_date = ''
    filters.end_date = ''
    reloadDependentOptions()
    onFiltersChanged(effectiveFilters())
  }

  const partnerOptions = ref([])
  watch(
    () => partnerOptionsCall.data,
    (data) => {
      partnerOptions.value = (data || []).map((p) => ({ label: p.partner_name, value: p.name }))
    },
  )

  const budgetRefOptions = computed(() => uniqueSorted(budgetRefCall.data, 'budget_reference_name'))
  const grantIdOptions = computed(() => uniqueSorted(grantIdCall.data, 'grant_id'))
  const stateOptions = computed(() => uniqueSorted(stateCall.data, 'state'))
  const districtOptions = computed(() => uniqueSorted(districtCall.data, 'district'))
  const blockOptions = computed(() => uniqueSorted(blockCall.data, 'block'))

  return {
    filters,
    effectiveFilters,
    init,
    clearAll,
    permittedPartnerIds,
    loadingPartnerOptions: partnerOptionsCall,
    partnerOptions,
    budgetStatusOptions,
    budgetRefOptions,
    grantIdOptions,
    stateOptions,
    districtOptions,
    blockOptions,
    dependentOptionsLoading: computed(
      () =>
        budgetRefCall.loading ||
        grantIdCall.loading ||
        stateCall.loading ||
        districtCall.loading ||
        blockCall.loading,
    ),
  }
}

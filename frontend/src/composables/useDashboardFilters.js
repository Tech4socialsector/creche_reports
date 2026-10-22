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
      fields: JSON.stringify(['budget_reference_name', 'start_date', 'end_date']),
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
  // budgetStatusOptions (below) is a fixed Active/Closed pair - always 2
  // choices, so the "exactly one option -> auto-select it" rule can never
  // fire off it alone. This instead fetches the REAL budget_status value(s)
  // actually present among the currently-scoped budgets, the same way
  // state/district/block do above, purely to tell whether that set happens
  // to be all-one-status right now - the dropdown itself still always
  // offers both Active and Closed to pick from manually.
  const budgetStatusCall = useCall({
    url: '/api/v2/document/Creche Budget',
    method: 'GET',
    params: () => ({
      fields: JSON.stringify(['budget_status']),
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
    budgetStatusCall.reload()
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

  // false right after clearAll() resets partner_id to [] (below); true for
  // every other partner_id change (including the app's own initial load).
  // The auto-select watchers (further down) only act while this is true -
  // without this distinction, clearing every filter back to empty often
  // doesn't LOOK cleared at all: the dependent option calls triggered by
  // reloadDependentOptions() below are async, so by the time one of them
  // resolves with exactly one value (e.g. every budget in the whole
  // unfiltered dataset happens to be "Active"), a plain one-shot/transient
  // suppress flag would already have been cleared - this instead stays
  // false across that whole async round trip, until a genuine NEW
  // partner_id selection (not a clear) sets it true again.
  const autoSelectArmed = ref(true)

  watch(
    () => filters.partner_id.slice(),
    (value, oldValue) => {
      autoSelectArmed.value = value.length > 0 || oldValue === undefined
      filters.budget_ref = []
      filters.grant_id = []
      filters.budget_status = []
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
  // The REAL status value(s) present in the currently-scoped budgets - NOT
  // what the Budget Status dropdown itself shows (that's the fixed
  // budgetStatusOptions pair below, always both Active and Closed, since a
  // user can always deliberately filter for either regardless of what the
  // current selection happens to contain). Used only to drive
  // autoSelectIfOnlyOption below.
  const budgetStatusDynamicOptions = computed(() => uniqueSorted(budgetStatusCall.data, 'budget_status'))

  // When narrowing by a filter (e.g. picking a Partner) leaves one of these
  // dependent dropdowns with exactly one real choice, that choice is
  // effectively already made - selecting it automatically saves the user
  // the extra click instead of making them open the dropdown just to pick
  // the only thing in it. Only fires while the field is still empty: this
  // app's own filters.partner_id watcher (above) already clears all of
  // these back to [] right before the options reload after a Partner
  // change, so "empty" here means "not yet explicitly set since that
  // reset," not "the user cleared it on purpose and wants it to stay
  // empty" - this never overwrites a value the user picked themselves.
  function autoSelectIfOnlyOption(field, options) {
    watch(
      options,
      (opts) => {
        if (autoSelectArmed.value && filters[field].length === 0 && opts.length === 1) {
          filters[field] = [opts[0].value]
        }
      },
    )
  }
  autoSelectIfOnlyOption('budget_ref', budgetRefOptions)
  autoSelectIfOnlyOption('grant_id', grantIdOptions)
  autoSelectIfOnlyOption('state', stateOptions)
  autoSelectIfOnlyOption('district', districtOptions)
  autoSelectIfOnlyOption('block', blockOptions)
  autoSelectIfOnlyOption('budget_status', budgetStatusDynamicOptions)

  // Picking a single Budget Reference pins down one specific budget, which
  // already has its own fixed start/end date on the Creche Budget record -
  // filling the date range in for the user saves them re-entering what the
  // budget itself already says, instead of making them look it up elsewhere
  // and type it in by hand. Only fires when the reference resolves to a
  // single row with both dates set, and never overwrites dates the user
  // already chose themselves (same "don't clobber an explicit choice" rule
  // as autoSelectIfOnlyOption above).
  //
  // Conversely, clearing Budget Reference back to empty (picking it was what
  // pinned those fields down in the first place - directly or via
  // autoSelectIfOnlyOption above) clears Grant ID/Budget Status/State/
  // District/Block/the date range right along with it, the same way
  // changing Partner already resets everything beneath it: left alone,
  // those fields would keep showing values scoped to a budget reference
  // that's no longer selected. Skipped when partner_id itself just changed -
  // that watcher (above) already clears every one of these fields itself,
  // and reacting here too would just be redundant.
  watch(
    () => filters.budget_ref.slice(),
    (refs, oldRefs) => {
      if (refs.length !== 1) {
        if (refs.length === 0 && oldRefs?.length > 0) {
          filters.grant_id = []
          filters.budget_status = []
          filters.state = []
          filters.district = []
          filters.block = []
          filters.start_date = ''
          filters.end_date = ''
        }
        return
      }
      const rows = (budgetRefCall.data || []).filter(
        (r) => r.budget_reference_name === refs[0],
      )
      if (rows.length !== 1) return
      const [row] = rows
      if (!filters.start_date && row.start_date) filters.start_date = row.start_date
      if (!filters.end_date && row.end_date) filters.end_date = row.end_date
    },
  )

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
        blockCall.loading ||
        budgetStatusCall.loading,
    ),
  }
}

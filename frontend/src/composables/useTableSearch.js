import { computed, ref } from 'vue'

// Shared "type to filter a table" composable for the dashboard drill-down
// modals - same simple case-insensitive substring convention already used
// by DoctypeList.vue's quick filter and useGlobalSearch.js (searchQuery +
// toLowerCase().includes()), just generalized to match across a list of
// field keys per row instead of one hardcoded field.
//
// `rowsSource` can be a plain array, a ref/computed of an array, or a getter
// function returning an array - this lets a modal pass its own `partners`
// prop, a computed like `partnerRows`, or a function that reads whichever
// table is currently active (e.g. switching between partner-level and
// budget-level rows).
//
// `fields` is the list of keys to match against each row. A field can read
// a nested value by passing a getter function instead of a string key.
export function useTableSearch(rowsSource, fields = []) {
  const searchQuery = ref('')

  function resolveRows() {
    if (typeof rowsSource === 'function') return rowsSource() || []
    if (rowsSource && 'value' in rowsSource) return rowsSource.value || []
    return rowsSource || []
  }

  function fieldValue(row, field) {
    const value = typeof field === 'function' ? field(row) : row?.[field]
    return value === null || value === undefined ? '' : String(value)
  }

  const filteredRows = computed(() => {
    const rows = resolveRows()
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => fields.some((field) => fieldValue(row, field).toLowerCase().includes(q)))
  })

  return { searchQuery, filteredRows }
}

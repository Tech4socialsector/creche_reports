<template>
  <div class="flex flex-col">
    <div class="min-h-0 flex-1 space-y-2 overflow-y-auto">
      <div
        v-for="row in rows"
        :key="row.id"
        class="flex items-center gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-800"
      >
        <FormControl
          type="select"
          class="w-0 min-w-0 flex-[1.3] [&_[data-slot=trigger]]:w-full [&_[data-slot=trigger]_span]:truncate"
          :options="fieldOptions"
          :model-value="row.fieldname"
          @update:model-value="setField(row, $event)"
        />
        <FormControl
          type="select"
          class="w-24 flex-shrink-0 [&_[data-slot=trigger]]:w-full [&_[data-slot=trigger]_span]:truncate"
          :options="operatorOptions(row)"
          :model-value="row.operator"
          @update:model-value="setOperator(row, $event)"
        />
        <MultiSelect
          v-if="isMultiValueRow(row)"
          class="w-0 min-w-0 flex-[1.3] [&_button]:w-full"
          :model-value="asArray(row.value)"
          :options="valueOptionsFor(row)"
          :loading="valueOptionsLoading(row)"
          :placeholder="`Any ${fieldLabel(row.fieldname)}`"
          @update:model-value="row.value = $event"
        />
        <FormControl
          v-else-if="fieldFor(row.fieldname)?.fieldtype === 'Check'"
          type="select"
          class="w-0 min-w-0 flex-[1.3] [&_[data-slot=trigger]]:w-full [&_[data-slot=trigger]_span]:truncate"
          :options="[{ label: 'Yes', value: '1' }, { label: 'No', value: '0' }]"
          v-model="row.value"
        />
        <FormControl
          v-else-if="fieldFor(row.fieldname)?.fieldtype === 'Select'"
          type="select"
          class="w-0 min-w-0 flex-[1.3] [&_[data-slot=trigger]]:w-full [&_[data-slot=trigger]_span]:truncate"
          :options="valueOptionsFor(row)"
          v-model="row.value"
        />
        <DatePicker
          v-else-if="fieldFor(row.fieldname)?.fieldtype === 'Date' || fieldFor(row.fieldname)?.fieldtype === 'Datetime'"
          class="w-0 min-w-0 flex-[1.3]"
          format="DD MMM YYYY"
          v-model="row.value"
        />
        <FormControl
          v-else
          type="text"
          class="w-0 min-w-0 flex-[1.3]"
          placeholder="Value"
          v-model="row.value"
        />
        <Button variant="ghost" size="sm" icon="lucide-x" tooltip="Remove this filter" @click="removeRow(row.id)" />
      </div>

      <div v-if="rows.length === 0" class="px-1 py-2 text-sm text-gray-400 dark:text-gray-500">
        No filters applied.
      </div>
    </div>

    <Button class="mt-3" variant="subtle" icon-left="lucide-plus" @click="addRow">Add a Filter</Button>

    <div class="mt-4 flex flex-shrink-0 justify-end gap-2 border-t pt-3 dark:border-gray-800">
      <Button icon-left="lucide-rotate-ccw" v-if="rows.length" @click="clearAll">Clear Filters</Button>
      <Button icon-left="lucide-check" variant="solid" @click="apply">Apply Filters</Button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Button, FormControl, DatePicker, MultiSelect, useCall } from 'frappe-ui'

// A row-based field/operator/value filter editor - one row per filter,
// AND'd together, matching Frappe desk's own list-view filter UX (field
// dropdown + operator dropdown + value). Used both from a desktop Popover
// and a mobile bottom sheet (see DoctypeList.vue) so the filter-building UI
// and its underlying frappe.get_list filter shape stay identical between
// them - only the container chrome differs.
const props = defineProps({
  // Every field on the doctype a filter could reasonably target - "+ Add a
  // Filter" lets a user pick any field explicitly, the same way the desk's
  // own filter picker isn't limited to a preconfigured subset.
  fields: { type: Array, required: true },
  // { fieldname: filterValue } - filterValue is a Frappe filter operand,
  // e.g. ['like', '%x%'] or ['in', [...]] or a plain scalar - same shape
  // DoctypeList.vue builds, so this component both reads and writes that
  // exact shape rather than introducing a parallel one.
  modelValue: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue'])

const FILTERABLE_FIELDTYPES = new Set(['Select', 'Link', 'Check', 'Date', 'Datetime', 'Data', 'Int', 'Float', 'Currency'])

const filterableFields = computed(() =>
  props.fields.filter((f) => FILTERABLE_FIELDTYPES.has(f.fieldtype)),
)

const fieldOptions = computed(() =>
  filterableFields.value.map((f) => ({ label: f.label, value: f.fieldname })),
)

function fieldFor(fieldname) {
  return filterableFields.value.find((f) => f.fieldname === fieldname)
}
function fieldLabel(fieldname) {
  return fieldFor(fieldname)?.label || fieldname
}

const OPERATORS_BY_TYPE = {
  Select: [{ label: 'Equals', value: '=' }, { label: 'In', value: 'in' }],
  Link: [{ label: 'Equals', value: '=' }, { label: 'In', value: 'in' }],
  Check: [{ label: 'Equals', value: '=' }],
  Date: [{ label: 'Equals', value: '=' }, { label: 'Before', value: '<' }, { label: 'After', value: '>' }],
  Datetime: [{ label: 'Equals', value: '=' }, { label: 'Before', value: '<' }, { label: 'After', value: '>' }],
  Data: [{ label: 'Equals', value: '=' }, { label: 'Like', value: 'like' }],
  Int: [{ label: 'Equals', value: '=' }, { label: '>', value: '>' }, { label: '<', value: '<' }],
  Float: [{ label: 'Equals', value: '=' }, { label: '>', value: '>' }, { label: '<', value: '<' }],
  Currency: [{ label: 'Equals', value: '=' }, { label: '>', value: '>' }, { label: '<', value: '<' }],
}
const DEFAULT_OPERATORS = [{ label: 'Equals', value: '=' }]

function operatorOptions(row) {
  const field = fieldFor(row.fieldname)
  return (field && OPERATORS_BY_TYPE[field.fieldtype]) || DEFAULT_OPERATORS
}

function isMultiValueRow(row) {
  const field = fieldFor(row.fieldname)
  return !!field && (field.fieldtype === 'Select' || field.fieldtype === 'Link') && row.operator === 'in'
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : []
}

// Select options are static (field.options, newline-separated); Link
// options need a live fetch per doctype - cached per fieldname so
// switching a row's field back and forth (or having several Link rows)
// doesn't refetch the same doctype's records repeatedly.
const linkOptionsCache = ref({})
function ensureLinkOptionsLoaded(field) {
  if (!field || field.fieldtype !== 'Link') return
  if (linkOptionsCache.value[field.fieldname]) return
  const entry = { loading: true, options: [] }
  linkOptionsCache.value = { ...linkOptionsCache.value, [field.fieldname]: entry }
  useCall({
    url: `/api/v2/doctype/${field.options}/meta`,
    method: 'GET',
    cacheKey: `creche-reports-meta-${field.options}`,
  })
    .fetch()
    .then((meta) => {
      const titleField = meta?.title_field || 'name'
      return useCall({
        url: `/api/v2/document/${field.options}`,
        method: 'GET',
        params: { fields: JSON.stringify(['name', titleField]), limit: 1000 },
      })
        .fetch()
        .then((rows) => {
          entry.options = (rows || []).map((r) => ({ label: r[titleField] || r.name, value: r.name }))
        })
    })
    .finally(() => {
      entry.loading = false
      linkOptionsCache.value = { ...linkOptionsCache.value }
    })
}

function valueOptionsFor(row) {
  const field = fieldFor(row.fieldname)
  if (!field) return []
  if (field.fieldtype === 'Select') {
    return (field.options || '')
      .split('\n')
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => ({ label: v, value: v }))
  }
  if (field.fieldtype === 'Link') {
    ensureLinkOptionsLoaded(field)
    return linkOptionsCache.value[field.fieldname]?.options || []
  }
  return []
}
function valueOptionsLoading(row) {
  const field = fieldFor(row.fieldname)
  return field?.fieldtype === 'Link' && !!linkOptionsCache.value[field.fieldname]?.loading
}

let nextId = 0
function newRow(fieldname, operator, value) {
  return { id: nextId++, fieldname, operator, value }
}

const rows = ref([])

// Rebuild the row list from modelValue - only when it actually differs
// from what these rows would themselves produce, so typing into a value
// input doesn't get clobbered by the round-trip through the parent's
// v-model on every keystroke (apply() is what pushes rows -> modelValue;
// this direction only needs to run for an external reset, e.g. "Clear
// Filters" elsewhere or navigating to a different doctype).
function rowsToFilters(list) {
  const result = {}
  for (const row of list) {
    if (row.value == null || row.value === '' || (Array.isArray(row.value) && row.value.length === 0)) continue
    if (row.operator === 'in') {
      result[row.fieldname] = ['in', asArray(row.value)]
    } else if (row.operator === 'like') {
      result[row.fieldname] = ['like', `%${row.value}%`]
    } else {
      result[row.fieldname] = row.operator === '=' ? row.value : [row.operator, row.value]
    }
  }
  return result
}

function filtersToRows(filters) {
  return Object.entries(filters || {}).map(([fieldname, value]) => {
    if (Array.isArray(value)) {
      const [op, val] = value
      if (op === 'like') return newRow(fieldname, 'like', String(val).replace(/^%|%$/g, ''))
      if (op === 'in') return newRow(fieldname, 'in', val)
      return newRow(fieldname, op, val)
    }
    return newRow(fieldname, '=', value)
  })
}

watch(
  () => props.modelValue,
  (value) => {
    const current = JSON.stringify(rowsToFilters(rows.value))
    const incoming = JSON.stringify(value || {})
    if (current !== incoming) rows.value = filtersToRows(value)
  },
  { immediate: true, deep: true },
)

function setField(row, fieldname) {
  row.fieldname = fieldname
  const field = fieldFor(fieldname)
  const validOps = (field && OPERATORS_BY_TYPE[field.fieldtype]) || DEFAULT_OPERATORS
  if (!validOps.some((o) => o.value === row.operator)) {
    row.operator = validOps[0].value
  }
  row.value = defaultValueFor(row.operator)
}

// [] only for the multi-value "in" operator (bound to a MultiSelect) -
// every other operator, including single-value Select/Link ('='), binds
// a plain string to a single-select/text/date FormControl instead, so
// the value shape must follow the chosen operator, not just the
// fieldtype.
function defaultValueFor(operator) {
  return operator === 'in' ? [] : ''
}

// Switching a row's operator (e.g. Select field from "Equals" to "In")
// changes which control renders (single-select vs MultiSelect) and thus
// what shape row.value needs to be - resetting it here rather than
// trying to convert a string <-> array keeps this simple and matches
// setField's own reset-on-type-change behavior above.
function setOperator(row, operator) {
  row.operator = operator
  row.value = defaultValueFor(operator)
}

function addRow() {
  const first = filterableFields.value[0]
  if (!first) return
  const operator = operatorOptions({ fieldname: first.fieldname })[0].value
  rows.value.push(newRow(first.fieldname, operator, defaultValueFor(operator)))
}

function removeRow(id) {
  rows.value = rows.value.filter((r) => r.id !== id)
}

function clearAll() {
  rows.value = []
  emit('update:modelValue', {})
}

function apply() {
  emit('update:modelValue', rowsToFilters(rows.value))
}
</script>

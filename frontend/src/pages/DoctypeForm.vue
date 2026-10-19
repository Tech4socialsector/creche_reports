<template>
  <AppLayout>
    <PageHeader>
      <template #title>
        <div class="flex items-center gap-2">
          <Button v-if="!isSingle" variant="ghost" aria-label="Back" @click="goBack">
            <template #prefix>
              <LucideIcon name="arrow-left" class="h-4 w-4" />
            </template>
            <span class="max-sm:hidden">Back</span>
          </Button>
          <!-- Record ID next to the doctype name, click to copy - the title
          field is what the page shows as its heading, but the ID is what
          links and reports refer to. A Single doctype has no meaningful ID
          of its own (it's always just the doctype name), so none of this
          shows for one. -->
          <span v-if="!isSingle" class="hidden text-sm text-gray-500 dark:text-gray-400 sm:inline">{{ metaResource.data?.name || doctype }}</span>
          <Button
            v-if="!isSingle && !isNew && name"
            variant="subtle"
            size="sm"
            icon-right="lucide-copy"
            class="font-mono"
            tooltip="Copy record ID"
            @click="copyRecordId"
          >
            {{ name }}
          </Button>
          <span
            v-else-if="!isSingle && isNew"
            class="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          >
            New
          </span>
          <span v-if="isSingle" class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ doctype }}</span>
          <span
            v-if="isDirty"
            class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
          >
            Not Saved
          </span>
        </div>
      </template>
      <template #actions>
        <Button
          v-if="!isSingle && !isNew && !loadError && canDelete"
          variant="subtle"
          theme="red"
          :loading="deleting"
          aria-label="Delete"
          @click="showDeleteConfirm = true"
        >
          <template #prefix>
            <LucideIcon name="trash-2" class="h-4 w-4" />
          </template>
          <span class="max-sm:hidden">Delete</span>
        </Button>
        <Button v-if="!loadError" variant="solid" :loading="saving" aria-label="Save" @click="save">
          <template #prefix>
            <LucideIcon name="save" class="h-4 w-4" />
          </template>
          <span class="max-sm:hidden">Save</span>
        </Button>
      </template>
    </PageHeader>

    <Dialog v-model="showDeleteConfirm" :options="{ title: 'Delete this record?', size: 'sm' }">
      <template #body-content>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          This permanently deletes {{ name }}. This cannot be undone.
        </p>
        <ErrorMessage class="mt-3" :message="deleteError" />
        <div class="mt-4 flex justify-end gap-2">
          <Button icon-left="lucide-x" @click="showDeleteConfirm = false" size="sm">Close</Button>
          <Button icon-left="lucide-trash-2" variant="solid" theme="red" :loading="deleting" @click="confirmDelete" size="sm">Delete</Button>
        </div>
      </template>
    </Dialog>

    <div v-if="metaResource.loading && !metaResource.data" class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      <div v-for="i in 6" :key="i" class="space-y-1.5">
        <Skeleton width="30%" height="0.75rem" />
        <Skeleton height="2.25rem" />
      </div>
    </div>
    <ErrorMessage v-else-if="loadError" :message="loadError" />

    <div v-else-if="!isNew && existingDoc?.loading && !existingDoc?.doc" class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      <div v-for="i in 6" :key="i" class="space-y-1.5">
        <Skeleton width="30%" height="0.75rem" />
        <Skeleton height="2.25rem" />
      </div>
    </div>

    <form v-else @submit.prevent="save">
      <!-- Doctypes with more than one Tab Break (useFormTabs) get an actual
      tab switcher instead of every field flattening into one long scroll -
      the common case (no tabs, or just the implicit first one) skips this
      nav entirely. Desktop-only (sm:flex, hidden by default): mobile gets
      an accordion instead, right below. -->
      <div v-if="tabs.length > 1" class="mb-4 hidden gap-1 border-b sm:flex dark:border-gray-800">
        <button
          v-for="(tab, idx) in tabs"
          v-show="isTabVisible(tab)"
          :key="idx"
          type="button"
          class="border-b-2 px-3 py-2 text-base font-medium"
          :class="idx === activeTabIdx
            ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
          @click="activeTabIdx = idx"
        >
          {{ tab.label || 'Details' }}
        </button>
      </div>

      <!-- Renders in the doctype's own field_order, the same way Frappe
      desk does: each Section Break starts a fresh block of 1-2 columns, and
      fields fill down each column top-to-bottom in declaration order. -->
      <FormTabSections
        v-if="tabs.length <= 1"
        :sections="activeTabSections"
        :doctype="doctype"
        :name="name"
        :is-new="isNew"
        v-model:new-doc-name="newDocName"
        :values="values"
        :show-name-field="isPromptNamed"
      />
      <!-- A child table renders where it was declared (after the section it follows), not at the end of the tab -->
      <div v-else class="hidden sm:block">
        <template v-for="(segment, si) in tabSegments(tabs[activeTabIdx])" :key="si">
          <FormTabSections
            v-if="segment.sections.length"
            :sections="segment.sections"
            :doctype="doctype"
            :name="name"
            :is-new="isNew"
            v-model:new-doc-name="newDocName"
            :values="values"
            :show-name-field="activeTabIdx === 0 && si === 0 && isPromptNamed"
          />
          <div v-if="segment.tables.length" class="my-6 space-y-6">
            <template v-for="field in segment.tables" :key="field.fieldname">
              <ChildTable v-if="isTableVisible(field)" :field="field" :parent-values="values" v-model="values[field.fieldname]" />
            </template>
          </div>
        </template>
      </div>

      <!-- Mobile accordion (sm:hidden): every tab renders as its own
      collapsible header instead of only the active one. -->
      <div v-if="tabs.length > 1" class="space-y-3 sm:hidden">
        <div
          v-for="(tab, idx) in tabs"
          v-show="isTabVisible(tab)"
          :key="idx"
          class="rounded-lg border dark:border-gray-800"
        >
          <button
            type="button"
            class="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100"
            @click="expandedMobileTabs[idx] = !expandedMobileTabs[idx]"
          >
            {{ tab.label || 'Details' }}
            <LucideIcon
              :name="expandedMobileTabs[idx] ? 'chevron-up' : 'chevron-down'"
              class="h-4 w-4 flex-shrink-0 text-gray-400"
            />
          </button>
          <div v-if="expandedMobileTabs[idx]" class="border-t px-4 py-4 dark:border-gray-800">
            <template v-for="(segment, si) in tabSegments(tab)" :key="si">
              <FormTabSections
                v-if="segment.sections.length"
                :sections="segment.sections"
                :doctype="doctype"
                :name="name"
                :is-new="isNew"
                v-model:new-doc-name="newDocName"
                :values="values"
                :show-name-field="idx === 0 && si === 0 && isPromptNamed"
              />
              <div v-if="segment.tables.length" class="my-6 space-y-6">
                <template v-for="field in segment.tables" :key="field.fieldname">
                  <ChildTable v-if="isTableVisible(field)" :field="field" :parent-values="values" v-model="values[field.fieldname]" />
                </template>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div v-if="bottomTableFields.length" class="mt-6 space-y-6">
        <template v-for="field in bottomTableFields" :key="field.fieldname">
          <ChildTable v-if="isTableVisible(field)" :field="field" :parent-values="values" v-model="values[field.fieldname]" />
        </template>
      </div>

      <ErrorMessage class="mt-4" :message="saveError" />

      <ConnectionsPanel
        v-if="!isNew && !isSingle && metaResource.data?.links?.length"
        :doctype="doctype"
        :name="name"
        :links="metaResource.data.links"
      />
    </form>
  </AppLayout>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { onKeyStroke } from '@vueuse/core'
import { useDoc, useNewDoc, useCall, call, Button, Dialog, ErrorMessage, toast } from 'frappe-ui'
import LucideIcon from '@/components/LucideIcon.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import Skeleton from '@/components/Skeleton.vue'
import ChildTable from '@/components/ChildTable.vue'
import FormTabSections from '@/components/FormTabSections.vue'
import ConnectionsPanel from '@/components/ConnectionsPanel.vue'
import { useMeta, useFormFields, useFormTabs, useTableFields } from '@/data/useMeta'
import { childTableErrors } from '@/utils/childRows'
import { pageTitle as pageTitleRef } from '@/data/pageTitle'
import { useCommonFieldDefaults } from '@/composables/useCommonFieldDefaults'
import { useFetchFromFields } from '@/composables/useFetchFromFields'
import { getValidatorForField } from '@/utils/validation'
import { evaluateDependsOn } from '@/utils/dependsOn'

const { doctype, isNew, name } = defineProps({
  doctype: { type: String, required: true },
  isNew: { type: Boolean, default: false },
  name: { type: String, default: null },
})

const route = useRoute()
const router = useRouter()

function goBack() {
  router.push({ name: 'DoctypeList', params: { doctypeRoute: route.params.doctypeRoute } })
}

const metaResource = useMeta(doctype)
// A Single doctype (e.g. Creche Reminder Settings) has exactly one document,
// whose docname is the doctype's own name - no "new", no list, no delete.
const isSingle = computed(() => !!metaResource.data?.issingle)

const fields = useFormFields(metaResource)
const formTabs = useFormTabs(metaResource)
const tabs = formTabs
const tableFields = useTableFields(metaResource)
const { applyFetchFrom, applyInitialFetchFrom } = useFetchFromFields({ metaResource })

// Only the active tab's sections render, but `fields` (every field, flat)
// stays the source for the save-time validation below - a field on a tab
// that isn't currently showing can still carry a value from before its
// condition changed.
const activeTabIdx = ref(0)
// Reset to the first tab only when the tab *structure* changes (a different
// doctype, tabs added/removed) - not every time `tabs` merely recomputes.
const tabSignature = computed(() => tabs.value.map((t) => t.label || '').join('\u0000'))
watch(tabSignature, () => { activeTabIdx.value = 0 })

// Tables declared inside a tab render in that tab; the rest (doctypes with
// no real tabs) stay in the list below the form. A table can also carry its
// own depends_on - checked here so it only shows while its condition holds.
// A tab's sections split around its child tables, so each table sits right after the section it follows.
function tabSegments(tab) {
  const sections = tab?.sections || []
  const tables = tab?.tables || []
  if (!tables.length) return [{ sections, tables: [] }]
  const at = (t) => {
    let idx = -1
    const limit = t.afterSection ?? Infinity
    sections.forEach((s, i) => { if (s.id <= limit) idx = i })
    return idx
  }
  const groups = new Map()
  for (const t of tables) groups.set(at(t), [...(groups.get(at(t)) || []), t])
  const segments = []
  let start = 0
  for (const idx of [...groups.keys()].sort((a, b) => a - b)) {
    segments.push({ sections: sections.slice(start, idx + 1), tables: groups.get(idx) })
    start = idx + 1
  }
  if (start < sections.length) segments.push({ sections: sections.slice(start), tables: [] })
  return segments
}
const bottomTableFields = computed(() => {
  const inTabs = new Set(tabs.value.flatMap((t) => t.tables.map((f) => f.fieldname)))
  return tableFields.value.filter((f) => !inTabs.has(f.fieldname))
})
function isTableVisible(field) {
  return evaluateDependsOn(field.depends_on, values)
}
const activeTabSections = computed(
  () => tabs.value[activeTabIdx.value]?.sections || [{ label: null, columns: [fields.value] }],
)

// Mobile accordion's own open/closed state per tab - kept separate from
// activeTabIdx since a phone-width user can have any number of these
// open/closed independently.
const expandedMobileTabs = ref({ 0: true })
watch(tabSignature, () => { expandedMobileTabs.value = { 0: true } })

// "Prompt" autoname doctypes (simple master/lookup tables) have no field
// backing their name at all - Frappe desk handles this with a "Set Name"
// popup on create. This generic form has no such popup, so without this
// the record's name is never collected or shown anywhere.
const isPromptNamed = computed(() => metaResource.data?.autoname === 'prompt')
const newDocName = ref('')

const newDoc = isNew ? useNewDoc(doctype) : null
// A Single doctype is always loaded by its own doctype name as the docname,
// regardless of what the route's :name param says (there's only ever one
// document) - matching how the old hand-built ReminderSettings.vue page
// used useDoc({ doctype, name: doctype }).
const existingDoc = isNew ? null : useDoc({ doctype, name: isSingle.value ? doctype : name })

// A failed record fetch (permission denied, the record renamed/deleted
// since the link that led here was created, etc.) shows a clear error
// instead of a blank, fieldless form with a Save button that would only
// fail again once clicked.
const loadError = computed(() => metaResource.error || existingDoc?.error)

// Delete gated on the same frappe.client.has_permission check used
// everywhere permission needs checking, so a user without delete rights on
// this doctype never sees a button that would only 403 when clicked.
const deletePermissionResource = isNew || isSingle.value
  ? null
  : useCall({
      url: '/api/v2/method/frappe.client.has_permission',
      method: 'GET',
      params: () => ({ doctype, docname: name, perm_type: 'delete' }),
      immediate: false,
      transform: (data) => data?.has_permission,
    })
if (deletePermissionResource) deletePermissionResource.fetch()
const canDelete = computed(() => !!deletePermissionResource?.data)

const showDeleteConfirm = ref(false)
const deleting = ref(false)
const deleteError = ref(null)

// navigator.clipboard only exists in secure contexts and can be refused
// when the page lacks focus/permission - fall back to a hidden textarea +
// execCommand('copy'), which works everywhere (incl. plain-http dev hosts).
async function copyRecordId() {
  const text = name
  let copied = false
  try {
    await navigator.clipboard.writeText(text)
    copied = true
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    try {
      copied = document.execCommand('copy')
    } catch {
      copied = false
    }
    document.body.removeChild(el)
  }
  if (copied) toast.success('Record ID copied')
  else toast.error('Could not copy the ID')
}

async function confirmDelete() {
  deleting.value = true
  deleteError.value = null
  try {
    await existingDoc.delete.submit()
    toast.success('Deleted')
    showDeleteConfirm.value = false
    goBack()
  } catch (e) {
    deleteError.value = e
  } finally {
    deleting.value = false
  }
}

// `values` is the single source of truth the form binds to - a plain
// reactive object kept in sync with newDoc.doc / existingDoc.doc below,
// rather than binding the form directly to either, so both code paths
// (new vs. existing) look identical to DynamicField/ChildTable.
const values = reactive({})

// Same depends_on convention as DynamicField.vue's fields and
// FormTabSections.vue's sections, applied to a Tab Break itself - a tab
// with no condition always shows.
function isTabVisible(tab) {
  return evaluateDependsOn(tab.dependsOn, values)
}

// If the tab being viewed stops being visible, fall back to the first tab
// instead of leaving the user on a hidden, empty pane.
watch(
  () => !!tabs.value[activeTabIdx.value] && isTabVisible(tabs.value[activeTabIdx.value]),
  (visible) => {
    if (!visible) activeTabIdx.value = 0
  },
)

// The doctype's own title_field is what a record is actually recognized
// by - falls back to the record's id when title_field isn't set, or is set
// but genuinely empty on this particular record.
const recordTitle = computed(() => (metaResource.data?.title_field && values[metaResource.data.title_field]) || name)

watchEffect(() => {
  pageTitleRef.value = isSingle.value ? doctype : isNew ? `New ${metaResource.data?.name || doctype}` : recordTitle.value
})

function scalarSnapshot() {
  const snap = {}
  for (const f of fields.value) snap[f.fieldname] = values[f.fieldname]
  return snap
}

function childRowsSnapshot() {
  const snap = {}
  for (const f of tableFields.value) {
    snap[f.fieldname] = (values[f.fieldname] || []).map((row) => ({ ...row }))
  }
  return snap
}

// --- fetch_from diffing -------------------------------------------------
// fetch_from applies to every doctype regardless of custom logic, and the
// lookup itself is a server round trip - diffed against the last-seen
// scalar snapshot on every reactive tick, same idea as the dirty-tracking
// snapshot below.
let lastFetchFromSnapshot = null
async function runFetchFromDiff() {
  const current = scalarSnapshot()
  if (!lastFetchFromSnapshot) {
    lastFetchFromSnapshot = current
    return
  }
  const changedField = Object.keys(current).find((k) => current[k] !== lastFetchFromSnapshot[k])
  lastFetchFromSnapshot = current
  if (changedField) await applyFetchFrom(changedField, values)
}

watch(
  () => [scalarSnapshot(), childRowsSnapshot()],
  () => {
    runFetchFromDiff()
  },
  { deep: true },
)

// --- Unsaved-changes indicator ----------------------------------------
// Same convention as Frappe desk's own form: a "Not Saved" badge next to
// the title once the form differs from what's actually on the server (or,
// for a new record, from wherever it started). `cleanSnapshot` is a plain
// JSON string of `values` at the last point the form was known to match
// the server; isDirty just compares the live JSON against it.
const cleanSnapshot = ref(null)
const suppressDirtyTracking = ref(false)

function markClean() {
  cleanSnapshot.value = JSON.stringify(values)
  suppressDirtyTracking.value = false
}

const isDirty = computed(() => {
  if (suppressDirtyTracking.value || cleanSnapshot.value === null) return false
  return JSON.stringify(values) !== cleanSnapshot.value
})

// Same as desk's own "leave site?" browser prompt for an unsaved form -
// only wired for a hard navigation away (closing the tab, typing a new
// URL, refreshing).
function confirmLeaveIfDirty(e) {
  if (!isDirty.value) return
  e.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', confirmLeaveIfDirty))
onBeforeUnmount(() => window.removeEventListener('beforeunload', confirmLeaveIfDirty))

const { applyCommonFieldDefaults } = useCommonFieldDefaults({
  fields,
  values,
  isNew,
  // After defaults land (e.g. a date field defaulted to Today), fill any
  // fetch_from fields that depend on them, then take the clean snapshot so
  // that fetch doesn't make a brand-new form look edited.
  onApplied: () => {
    markClean()
    applyInitialFetchFrom(values).then(markClean)
  },
})

// A query param that matches a real field on this doctype prefills it
// (e.g. a "New" link from the Connections panel opens this form with the
// originating record's own id in the query string) - only applied to a
// real field, so an unrelated query param doesn't pollute `values`.
function applyQueryPrefill() {
  if (!isNew) return
  for (const [key, value] of Object.entries(route.query)) {
    if (fields.value.some((f) => f.fieldname === key) && !values[key]) {
      values[key] = value
    }
  }
}
watch(fields, applyQueryPrefill)

// A brand-new record's own doc starts as a bare {} - it has no key at all
// for a Table field until something adds a row, so this explicitly seeds
// every Table field to a real array up front, the same way the doc-load
// watcher below seeds every other field this doc happens to have.
function initEmptyTableFields() {
  if (!isNew) return
  for (const tableField of tableFields.value) {
    if (values[tableField.fieldname] === undefined) {
      values[tableField.fieldname] = []
    }
  }
}
watch(tableFields, initEmptyTableFields)

// --- Load doc into `values` -------------------------------------------
watch(
  () => (isNew ? newDoc?.doc : existingDoc?.doc),
  (doc) => {
    if (!doc) return
    suppressDirtyTracking.value = true
    // Child-table rows are copied, not shared: if `values[table]` were the
    // very same array as doc[table], adding/editing a row would mutate the
    // loaded doc itself and re-fire this (deep) watcher, silently wiping
    // unsaved edits elsewhere on the form.
    Object.keys(doc).forEach((k) => {
      values[k] = Array.isArray(doc[k]) ? JSON.parse(JSON.stringify(doc[k])) : doc[k]
    })
    initEmptyTableFields()
    applyCommonFieldDefaults()
    applyQueryPrefill()
    nextTick(markClean)
  },
  { immediate: true, deep: true },
)

const saving = ref(false)
const saveError = ref(null)

// Same format validators DynamicField.vue shows inline (see
// utils/validation.js) - re-checked here so a bad value can't slip through
// on save via Ctrl+S or a pasted value the user never actually blurred out
// of.
const LAYOUT_FIELDTYPES = new Set(['Section Break', 'Column Break', 'Tab Break', 'HTML', 'Button', 'Heading', 'Image'])

// Mandatory fields (`reqd`, or `mandatory_depends_on` evaluating true) that
// are currently shown and empty - checked here on the client so the user
// sees every missing field at once, instead of the server rejecting the
// save one field at a time.
function missingRequiredFields() {
  return fields.value.filter((field) => {
    if (LAYOUT_FIELDTYPES.has(field.fieldtype) || field.fieldtype === 'Check') return false
    if (!evaluateDependsOn(field.depends_on, values)) return false
    const required =
      !!field.reqd ||
      (!!field.mandatory_depends_on && evaluateDependsOn(field.mandatory_depends_on, values))
    if (!required) return false
    const value = values[field.fieldname]
    if (Array.isArray(value)) return value.length === 0
    return value === undefined || value === null || String(value).trim() === ''
  })
}

function firstValidationError() {
  const missing = missingRequiredFields()
  if (missing.length) {
    // One toast per empty mandatory field, so each is called out on its own.
    missing.forEach((f) => toast.error(`${f.label || f.fieldname} is required`))
    return `Required: ${missing.map((f) => f.label || f.fieldname).join(', ')}`
  }
  for (const field of fields.value) {
    const validator = getValidatorForField(field)
    if (!validator) continue
    const error = validator(values[field.fieldname])
    if (error) return `${field.label}: ${error}`
  }
  return null
}

// Empty rows / missing mandatory fields across every visible child table,
// as one message per problem (see utils/childRows.js).
async function collectChildErrors() {
  const errors = []
  for (const tableField of tableFields.value) {
    if (!isTableVisible(tableField)) continue
    errors.push(...(await childTableErrors(tableField, values[tableField.fieldname], values)))
  }
  return errors
}

async function save() {
  if (isNew && isPromptNamed.value && !newDocName.value.trim()) {
    saveError.value = 'Name is required.'
    return
  }
  const validationError = firstValidationError()
  if (validationError) {
    saveError.value = validationError
    // Missing-field toasts were already shown one per field above.
    if (!validationError.startsWith('Required: ')) toast.error(validationError)
    return
  }
  const childErrors = await collectChildErrors()
  if (childErrors.length) {
    saveError.value = childErrors.join('\n')
    // One toast each, capped so a badly broken table doesn't bury the page.
    childErrors.slice(0, 5).forEach((message) => toast.error(message))
    if (childErrors.length > 5) toast.error(`...and ${childErrors.length - 5} more - see the list below the form.`)
    return
  }
  saving.value = true
  saveError.value = null
  try {
    if (isNew) {
      Object.assign(newDoc.doc, values)
      if (isPromptNamed.value) newDoc.doc.name = newDocName.value.trim()
      // A plain insert call: when the server rejects the record, its own
      // message comes back as the error and is shown as it is.
      const inserted = await call('frappe.client.insert', { doc: { ...JSON.parse(JSON.stringify(newDoc.doc)), doctype } })
      const created = inserted?.message ?? inserted
      toast.success('Created')
      router.replace({
        name: 'DoctypeForm',
        params: { doctypeRoute: route.params.doctypeRoute, name: created.name },
      })
    } else {
      await existingDoc.setValue.submit(values)
      // useCall's submit() resolving doesn't mean the save actually
      // succeeded server-side - it only ever populates the resource's own
      // `.error`, so a validation failure would otherwise fall straight
      // through to the success toast below.
      if (existingDoc.setValue.error) throw existingDoc.setValue.error
      toast.success('Saved')
      markClean()
    }
  } catch (e) {
    // When the server rejects a save, frappe-ui can throw its own cache
    // error ("Invalid doc: must have doctype and name") while trying to
    // store the error response; the server's real message is on the
    // resource's `.error`, so show that one.
    const serverError = isNew ? newDoc.error : existingDoc?.setValue?.error
    const shown = e?.messages?.length || !serverError ? e : serverError
    const unhelpful = /^Invalid doc/.test(String(shown?.message || ''))
    saveError.value = unhelpful ? new Error('The server did not accept this record. Check the answers marked required and try again.') : shown
    // The inline message sits at the very bottom of the form, easy to miss
    // on a long one - toast it too so a failed save is never silent.
    toast.error(String(unhelpful ? 'The server did not accept this record. Check the answers marked required and try again.' : shown?.messages?.[0] || shown?.message || 'Could not save').replace(/<[^>]+>/g, ''))
  } finally {
    saving.value = false
  }
}

onKeyStroke((e) => (e.key === 's' || e.key === 'S') && (e.metaKey || e.ctrlKey), (e) => {
  e.preventDefault()
  if (!saving.value) save()
})
</script>

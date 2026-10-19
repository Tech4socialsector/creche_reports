<template>
  <div>
    <label class="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">
      {{ field.label }}<span v-if="field.reqd" class="text-red-500">*</span>
    </label>
    <div class="flex items-center gap-1.5">
      <div class="link-field-combobox min-w-0 flex-1">
        <Combobox
          open-on-focus
          open-on-click
          :options="options"
          :loading="recordsResource.loading"
          :disabled="disabled"
          :placeholder="filtersPending ? 'Select a value above first' : `Select ${field.label}`"
          :model-value="modelValue"
          @update:model-value="(value) => $emit('update:modelValue', value || null)"
        />
      </div>
      <Tooltip v-if="linkedRoute" :text="`Open ${field.label}`">
        <Button variant="ghost" size="sm" icon="lucide-arrow-up-right" @click="openLinkedRecord" />
      </Tooltip>
      <!-- Extension point for a caller-supplied affordance next to the
      combobox (e.g. DynamicField.vue's isUserLink case - a user hover-card
      preview). -->
      <slot name="suffix" />
    </div>
    <p v-if="field.description" class="mt-1.5 text-p-xs text-ink-gray-5">
      {{ field.description }}
    </p>

    <Dialog v-model="showCreateDialog" :options="{ size: 'lg', title: 'link-quick-create' }">
      <template #body>
        <div class="link-quick-create-panel flex flex-col">
          <div class="flex h-12 flex-shrink-0 items-center justify-between border-b px-4 dark:border-gray-800">
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
              New {{ field.options }}
            </h3>
            <Button variant="ghost" size="sm" icon="lucide-x" tooltip="Close" @click="showCreateDialog = false" />
          </div>

          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div v-if="isPromptNamed">
              <FormControl type="text" label="Name" required v-model="newRecordName" />
            </div>
            <DynamicField
              v-for="createField in createFields"
              :key="createField.fieldname"
              :field="createField"
              :doctype="field.options"
              v-model="newRecordValues[createField.fieldname]"
            />
            <ErrorMessage :message="createError" />
          </div>

          <div class="flex flex-shrink-0 justify-end gap-2 border-t px-4 py-3 dark:border-gray-800">
            <Button icon-left="lucide-x" @click="showCreateDialog = false" size="sm">Close</Button>
            <Button icon-left="lucide-plus" variant="solid" :loading="creating" @click="submitNewRecord" size="sm">Create</Button>
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* Combobox's own trigger (a ComboboxAnchor, styled as a text-input-shaped
box in "input" trigger mode) doesn't fill this field on its own - without
an explicit width the whole chain shrinks to content size instead of
resolving "100%" to something real. Every ancestor down to the actual
trigger element needs an explicit block/full width for that to work. */
.link-field-combobox :deep(> div) {
  display: block;
  width: 100%;
}
.link-field-combobox :deep([data-slot='trigger']) {
  width: 100%;
}
</style>

<style>
/* Same data-dialog hook pattern as ChildTable.vue's row editor - takes over
#body entirely (frappe-ui's default #body-content wrapper has no
independent scroll region) so a linked doctype with many fields still
scrolls inside the dialog instead of overflowing past it. */
[data-dialog='link-quick-create'].dialog-overlay {
  z-index: 1050;
}
.link-quick-create-panel {
  width: 100%;
  height: 32rem;
  max-height: 85vh;
}
@media (max-width: 639px), (max-height: 480px) {
  [data-dialog='link-quick-create'].dialog-overlay > div {
    padding: 0;
  }
  [data-dialog='link-quick-create'] .dialog-content {
    margin: 0;
    max-width: none;
    width: 100vw;
    height: 100dvh;
    border-radius: 0;
  }
  .link-quick-create-panel {
    height: 100dvh;
    max-height: none;
  }
}
</style>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Combobox, Dialog, Button, ErrorMessage, FormControl, Tooltip, call, useCall, toast } from 'frappe-ui'
import { routeSlugForDoctype } from '@/data/doctypeRoutes'
import DynamicField from '@/components/DynamicField.vue'

const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { default: null },
  // Extra Frappe filters applied server-side (e.g. District filtered by the
  // currently selected State) - a plain object of {fieldname: value}, ANDed
  // together, matching frappe.client.get_list's filters shape.
  filters: { type: Object, default: () => ({}) },
  // Used on list-view filter bars, where "no value picked" is itself a
  // valid, meaningful choice ("All Partners") rather than an incomplete
  // required field - adds that as a selectable option instead of just
  // leaving the field blank with no way back to "unfiltered".
  allowClear: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

// The linked doctype's own title_field (if set) is what a user actually
// recognizes a record by - falling back to `name` (Frappe's own default
// display rule) when the doctype doesn't define one.
const metaResource = useCall({
  url: `/api/v2/doctype/${props.field.options}/meta`,
  method: 'GET',
  cacheKey: `creche-reports-meta-${props.field.options}`,
})
const titleField = computed(() => metaResource.data?.title_field || 'name')

// A cascading filter (e.g. District's `state`) resolves to undefined/null
// until the field it depends on is actually filled in - fetching with that
// missing means "no filter" server-side, which would show every option
// instead of none, letting a user pick one that doesn't match.
const filtersPending = computed(() => Object.values(props.filters).some((v) => v == null || v === ''))

// useCall's `url` is passed through Vue's unref() internally, which only
// unwraps a ref/computed - a plain arrow function is returned as-is and
// gets template-string-stringified into the request path, never actually
// invoked. A computed() is what unref() actually resolves.
const recordsResource = useCall({
  url: computed(() => `/api/v2/document/${props.field.options}`),
  method: 'GET',
  params: () => ({
    fields: JSON.stringify(['name', titleField.value]),
    filters: JSON.stringify(props.filters),
    // Bounded master/lookup lists, not a paged view - the v2 API has no
    // unlimited sentinel, so a large fixed limit stands in for "effectively all".
    limit: 1000,
  }),
  immediate: false,
})

// Re-fetch whenever the doctype or the cascading filters change (e.g.
// District's State filter) - a stale options list from before the filter
// changed would let a value get picked that no longer matches. Gated on
// metaResource.data being loaded so the very first records fetch already
// has the doctype's real title_field.
watch(
  () => [props.field.options, JSON.stringify(props.filters), filtersPending.value, !!metaResource.data],
  () => {
    if (!props.field.options || filtersPending.value || !metaResource.data) return
    recordsResource.fetch()
  },
  { immediate: true },
)

// Frappe desk only offers "Create a New X" from a Link field when the
// current user actually holds create permission on that doctype.
const createPermissionResource = useCall({
  url: '/api/v2/method/frappe.client.has_permission',
  method: 'GET',
  params: () => ({ doctype: props.field.options, docname: '', perm_type: 'create' }),
  immediate: false,
  transform: (data) => data?.has_permission,
})
watch(
  () => props.field.options,
  (doctype) => {
    if (doctype) createPermissionResource.fetch()
  },
  { immediate: true },
)
const canCreate = computed(() => !!createPermissionResource.data)

const options = computed(() => {
  if (filtersPending.value) return []
  const rows = recordsResource.data || []
  // r.name is coerced to a string - an autoincrement-named doctype comes
  // back from the API as a JSON number, while modelValue is always a
  // string. Combobox matches modelValue against each option's `value` by
  // strict equality, so a number vs string mismatch would otherwise show
  // the raw stored value instead of the record's title_field label.
  const opts = rows.map((r) => ({ label: r[titleField.value] || r.name, value: String(r.name) }))
  if (props.allowClear) {
    opts.unshift({ label: `All ${props.field.label}`, value: '' })
  } else {
    // Every Link needs a real way back to "no value" once something's been
    // picked, matching DynamicField.vue's own Select fields.
    opts.unshift({ label: 'Select option', value: '' })
  }
  if (canCreate.value && !props.allowClear && !filtersPending.value) {
    opts.push({
      type: 'custom',
      key: '__create__',
      label: `+ Create New ${props.field.label}`,
      condition: () => true,
      onClick: openCreateDialog,
    })
  }
  return opts
})

// Opens the linked record's own generic form page - only for a doctype this
// app actually has a page for (routeSlugForDoctype), rather than linking
// somewhere that 404s.
const router = useRouter()
const linkedSlug = computed(() => routeSlugForDoctype(props.field.options))
const linkedRoute = computed(() => (props.modelValue && linkedSlug.value ? linkedSlug.value : null))

function openLinkedRecord() {
  if (!linkedRoute.value) return
  router.push({ name: 'DoctypeForm', params: { doctypeRoute: linkedRoute.value, name: props.modelValue } })
}

// --- Quick create ------------------------------------------------------
// A lightweight version of DoctypeForm.vue's own new-record form, scoped to
// just the linked doctype's required fields (Frappe desk's Quick Entry
// dialog does the same). Reuses DynamicField so every fieldtype still
// renders and behaves exactly like it would on a full form.
const showCreateDialog = ref(false)
const newRecordValues = reactive({})
const newRecordName = ref('')
const creating = ref(false)
const createError = ref(null)

const isPromptNamed = computed(() => metaResource.data?.autoname === 'prompt')

const createFields = computed(() => {
  const metaFields = metaResource.data?.fields || []
  const SKIP_FIELDTYPES = new Set(['Section Break', 'Column Break', 'Tab Break', 'HTML', 'Heading', 'Button'])
  return metaFields.filter((f) => f.reqd && !SKIP_FIELDTYPES.has(f.fieldtype) && f.fieldtype !== 'Table')
})

function openCreateDialog() {
  // A doctype with its own generic page here: go to its full "new" form.
  // Only an unregistered one falls back to the quick popup.
  if (linkedSlug.value) {
    router.push({ name: 'DoctypeNew', params: { doctypeRoute: linkedSlug.value } })
    return
  }
  for (const key of Object.keys(newRecordValues)) delete newRecordValues[key]
  newRecordName.value = ''
  createError.value = null
  showCreateDialog.value = true
}

async function submitNewRecord() {
  if (isPromptNamed.value && !newRecordName.value.trim()) {
    createError.value = 'Name is required.'
    return
  }
  creating.value = true
  createError.value = null
  try {
    const doc = { doctype: props.field.options, ...newRecordValues }
    if (isPromptNamed.value) doc.name = newRecordName.value.trim()
    const created = await call('frappe.client.insert', { doc })
    toast.success(`${props.field.options} created`)
    showCreateDialog.value = false
    recordsResource.fetch()
    emit('update:modelValue', String(created.name))
  } catch (e) {
    createError.value = e
  } finally {
    creating.value = false
  }
}
</script>

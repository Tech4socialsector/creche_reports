import { watch } from 'vue'
import { session } from '@/data/session'

// Frappe's own field-level `default` property (set in the DocType editor) -
// resolved for the same handful of special keywords Frappe desk's own
// frappe.model.get_default_value() does, rather than a fixed list of
// fieldnames this file would need updating every time a doctype adds a new
// auto-captured date/user field. Any other literal default (a Select's
// first option value, a fixed Data string, etc.) is returned as-is, same as
// Frappe desk does.
export function resolveFrappeDefault(rawDefault, fieldtype) {
  const value = String(rawDefault)
  if (value === '__user' || value.toLowerCase() === 'user') return session.user
  if (value === 'Today') {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  if (value === 'Now' || value === 'now') {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    if (fieldtype === 'Time') return time
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`
  }
  return rawDefault
}

// `fields`/`values` are the same refs/reactive objects DoctypeForm.vue
// already builds - passed in rather than re-derived so this stays a plain
// function of the form's own state instead of a second source of truth.
// `onApplied` (optional) fires every time applyDefaults() actually runs.
export function useCommonFieldDefaults({ fields, values, isNew, onApplied }) {
  function applyDefaults() {
    if (!isNew) return
    // Every field's own declared `default` (Frappe's native, doctype-level
    // mechanism) applies generically: whichever doctype adds a field with
    // e.g. "default": "Today" just works.
    for (const field of fields.value) {
      if (!field.default) continue
      if (values[field.fieldname]) continue
      const defaultValue = resolveFrappeDefault(field.default, field.fieldtype)
      if (defaultValue) values[field.fieldname] = defaultValue
    }
    onApplied?.()
  }

  // Re-run whenever `fields` itself changes - it's a computed() over the
  // doctype's meta fetch, which is still empty on first render and only
  // becomes populated once that fetch resolves (see useFormFields).
  watch(fields, applyDefaults)

  return { applyCommonFieldDefaults: applyDefaults }
}

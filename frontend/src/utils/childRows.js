// Save-time checks for child-table rows, so the form can say exactly what's
// wrong - which table, which row, which field - before anything is sent to
// the server:
//   - a required table with no rows
//   - a row that's completely empty (added, never filled in)
//   - a row with a mandatory field missing (`reqd`, or `mandatory_depends_on`
//     evaluating true; fields hidden by `depends_on` are skipped)
// Returns an array of human-readable messages (empty when everything's fine).
import { loadDoctypeMeta } from '@/data/doctypeMeta'
import { evaluateDependsOn } from '@/utils/dependsOn'

const LAYOUT_FIELDTYPES = new Set(['Section Break', 'Column Break', 'Tab Break', 'HTML', 'Heading', 'Button', 'Image'])

function isBlank(value) {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

// "Nothing the user entered": blank, or just the field's own default (a
// freshly added row already carries defaults), or an unticked checkbox.
function isUntouched(field, value) {
  if (field.fieldtype === 'Check') return !value
  if (isBlank(value)) return true
  return field.default !== undefined && field.default !== null && String(value) === String(field.default)
}

export async function childTableErrors(tableField, rows, parentValues) {
  const meta = await loadDoctypeMeta(tableField.options)
  if (!meta) return []

  const tableLabel = tableField.label || tableField.fieldname
  const list = rows || []
  const errors = []

  if (tableField.reqd && list.length === 0) {
    errors.push(`${tableLabel} is empty - please add at least one row.`)
  }

  const fields = (meta.fields || []).filter((f) => !LAYOUT_FIELDTYPES.has(f.fieldtype) && !f.hidden)
  const entryFields = fields.filter((f) => !f.read_only)

  list.forEach((row, i) => {
    const n = i + 1
    if (entryFields.every((f) => isUntouched(f, row[f.fieldname]))) {
      errors.push(`${tableLabel}, row ${n} is empty - please fill it in or remove the row.`)
      return
    }
    for (const f of fields) {
      if (f.fieldtype === 'Check') continue
      if (!evaluateDependsOn(f.depends_on, row, parentValues)) continue
      const required =
        !!f.reqd || (!!f.mandatory_depends_on && evaluateDependsOn(f.mandatory_depends_on, row, parentValues))
      if (required && isBlank(row[f.fieldname])) {
        errors.push(`${tableLabel}, row ${n}: ${f.label || f.fieldname} is required.`)
      }
    }
  })
  return errors
}

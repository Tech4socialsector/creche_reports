import { computed } from 'vue'
import { call } from 'frappe-ui'

// Implements Frappe's standard `fetch_from` DocField property generically -
// e.g. a field declaring fetch_from: "partner.partner_name" should pull that
// partner's own name into this doctype's field automatically, the same way
// Desk does it. This Vue app has no field-level @change event to hook into
// (DynamicField/ChildTable are metadata-driven, not aware of business
// logic), so DoctypeForm.vue's own field-diffing loop calls
// applyFetchFrom(changedField, ...) whenever a scalar field changes.
//
// Takes `metaResource` (not the pre-filtered `fields`/useFormFields list)
// because a fetch_from target is very often hidden - useFormFields drops
// hidden fields entirely, which would make this silently do nothing for
// exactly the fields it exists for.
export function useFetchFromFields({ metaResource }) {
  const allFields = computed(() => metaResource.data?.fields || [])

  function parseFetchFrom(fetchFrom) {
    const [linkFieldname, sourceFieldname] = (fetchFrom || '').split('.')
    if (!linkFieldname || !sourceFieldname) return null
    return { linkFieldname, sourceFieldname }
  }

  async function applyFetchFrom(changedFieldname, values) {
    const targets = allFields.value.filter((f) => {
      const parsed = parseFetchFrom(f.fetch_from)
      return parsed?.linkFieldname === changedFieldname
    })
    if (!targets.length) return

    for (const target of targets) {
      const { linkFieldname, sourceFieldname } = parseFetchFrom(target.fetch_from)
      const linkValue = values[linkFieldname]
      if (!linkValue) {
        if (!target.fetch_if_empty) values[target.fieldname] = ''
        continue
      }
      if (target.fetch_if_empty && values[target.fieldname]) continue

      const linkField = allFields.value.find((f) => f.fieldname === linkFieldname)
      if (!linkField?.options) continue

      try {
        const res = await call('frappe.client.get_value', {
          doctype: linkField.options,
          filters: linkValue,
          fieldname: sourceFieldname,
        })
        if (res && sourceFieldname in res) values[target.fieldname] = res[sourceFieldname]
      } catch {
        // linked record may have been deleted/renamed since - leave the
        // dependent field as-is rather than surfacing an error for this
        // background convenience fetch
      }
    }
  }

  // One-off pass for a form that has just loaded/defaulted: any fetch_from
  // target that's still empty while its link field already has a value
  // gets fetched. applyFetchFrom alone only reacts to a *change*, which a
  // value set by a default - before the diff loop's baseline - never looks
  // like.
  async function applyInitialFetchFrom(values) {
    const links = new Set()
    for (const f of allFields.value) {
      const parsed = parseFetchFrom(f.fetch_from)
      if (parsed && values[parsed.linkFieldname] && !values[f.fieldname]) links.add(parsed.linkFieldname)
    }
    for (const link of links) await applyFetchFrom(link, values)
  }

  return { applyFetchFrom, applyInitialFetchFrom }
}

// Imperative doctype meta loader, for code that only learns which doctype it
// needs at runtime (save-time child-row validation, etc.) and so can't use
// useMeta()'s fixed-at-setup useCall. Shares the same endpoint as useMeta;
// cached per doctype for the page's lifetime, and a failed fetch isn't
// cached so it can be retried.
const cache = new Map()

export function loadDoctypeMeta(doctype) {
  if (!doctype) return Promise.resolve(null)
  if (!cache.has(doctype)) {
    const pending = fetch(`/api/v2/doctype/${encodeURIComponent(doctype)}/meta`, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => json?.data || null)
      .catch(() => null)
    cache.set(doctype, pending)
    pending.then((meta) => {
      if (!meta) cache.delete(doctype)
    })
  }
  return cache.get(doctype)
}

const LAYOUT_FIELDTYPES = new Set(['Section Break', 'Column Break', 'Tab Break', 'HTML', 'Heading', 'Button'])

// A doctype's real, non-layout fields, for pickers.
export async function loadDoctypeFields(doctype) {
  const meta = await loadDoctypeMeta(doctype)
  return (meta?.fields || []).filter((f) => !LAYOUT_FIELDTYPES.has(f.fieldtype))
}

// The one static map from a URL slug to a real Frappe doctype name, used by
// router.js to resolve /:doctypeRoute, and by any component (LinkField,
// ConnectionsPanel) that needs to link to another doctype's generic list/
// form pages. Kept as a single small object (not a per-doctype Vue route or
// a dynamic "module" registry like janadhikara's) since creche_reports has a
// small, fixed set of doctypes - adding one just means adding a line here.
export const DOCTYPE_ROUTES = {
  'caregiver-salary': 'Creche Caregiver Salary and Benefits',
  'creche-budget': 'Creche Budget',
  'creche-utilisation': 'Creche utilisation',
  'creche-disbursement': 'Creche Disbursement',
  'creche-partners': 'Creche Partners',
  'reminder-settings': 'Creche Reminder Settings',
}

const ROUTE_BY_DOCTYPE = Object.fromEntries(
  Object.entries(DOCTYPE_ROUTES).map(([slug, doctype]) => [doctype, slug]),
)

// The slug for a doctype, if it's one of the ones this app has a generic
// page for - null for anything else (e.g. User, ToDo), so callers (a Link
// field's "open" affordance) can tell there's nowhere to navigate to.
export function routeSlugForDoctype(doctype) {
  return ROUTE_BY_DOCTYPE[doctype] || null
}

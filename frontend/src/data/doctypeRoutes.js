import { useCall } from 'frappe-ui'

// {slug: doctype} for every doctype this app's generic DoctypeList/DoctypeForm
// pages can render - used by router.js to resolve /:doctypeRoute, and by any
// component (LinkField, ConnectionsPanel, AiAssistant) that needs to link to
// another doctype's generic list/form page. Backed by
// creche_reports.api.sidebar.get_routable_doctypes() - an admin makes a
// doctype navigable by pointing a Sidebar Item's Target Doctype at it in
// Desk, not by editing this file - mirrors janadhikara's own App Module
// Setting-driven routing instead of a fixed JS allowlist.
export const routableDoctypesResource = useCall({
  url: '/api/v2/method/creche_reports.api.sidebar.get_routable_doctypes',
  method: 'GET',
  cacheKey: 'creche-reports-routable-doctypes',
})

// router.js's beforeEach guard awaits this once, the same way session.js's
// initialUserCheck is awaited before the app's first navigation decision -
// without it, a hard page load landing straight on /:doctypeRoute could run
// the guard before this resource's own GET has resolved, resolving the slug
// against an empty map and bouncing to Dashboard even for a valid route.
// useCall's own `promise` is internally a ref (resolved/rejected by
// onFetchResponse/onFetchError each time a new fetch starts), but useCall
// returns it through reactive({ promise, ... }) - Vue's reactive() auto-
// unwraps a top-level ref property, so reading it here already gives the
// promise itself, not a ref wrapping it. This captures the GET this
// resource already fired on creation (immediate defaults to true).
export const initialRoutableDoctypesLoad = routableDoctypesResource.promise.catch(() => {})

function slugMap() {
  return routableDoctypesResource.data || {}
}

// The real doctype for a URL slug, or null if it isn't (yet, or ever) one
// this app can render - router.js's own "unmapped slug -> Dashboard" guard.
export function doctypeForRouteSlug(slug) {
  return slugMap()[slug] || null
}

// The slug for a doctype, if it's one this app has a generic page for - null
// for anything else (e.g. User, ToDo, or a doctype no Sidebar Item points
// at), so callers (a Link field's "open" affordance) can tell there's
// nowhere to navigate to.
export function routeSlugForDoctype(doctype) {
  const map = slugMap()
  for (const slug in map) {
    if (map[slug] === doctype) return slug
  }
  return null
}

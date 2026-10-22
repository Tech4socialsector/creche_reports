// window.csrf_token is stamped once at initial page load and never refreshed
// on its own - logging in elsewhere, a server restart, or the session simply
// expiring can all reissue the session with a new CSRF token server-side, so
// a tab that has been open since before that keeps sending the old one and
// gets rejected with CSRFTokenError on its next POST. A long-lived dashboard
// tab (left open across an extended work session, through backend restarts
// and deploys) hits this far more easily than a page that's freshly loaded
// each time - every whitelisted POST call in this app should refresh the
// token immediately beforehand rather than wait for that rejection and react
// to it (which depends on the error's shape round-tripping through useCall
// exactly as expected, and still sends one guaranteed-to-fail request first).
// frappe-ui's own useFrappeFetch reads window.csrf_token fresh on every
// request (see its beforeFetch hook), so overwriting it here is picked up
// immediately by the POST that follows, with no dependency on reload timing.
export async function refreshCsrfToken() {
  try {
    const res = await fetch('/api/v2/method/creche_reports.api.common.get_csrf_token', {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const body = await res.json()
    const token = body?.data ?? body?.message
    if (token) window.csrf_token = token
    return token || null
  } catch {
    return null
  }
}

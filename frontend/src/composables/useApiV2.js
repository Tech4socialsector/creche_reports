// A tiny GET helper for the rare spot where a component needs several
// dynamic calls to the same whitelisted method at once (e.g. consolidating
// N budgets' line items) and useCall's one-resource-per-call-site shape
// doesn't fit. frappe-ui's own `call()` helper defaults to the legacy
// `/api/method/` path and reads the result from `data.message` - wrong here,
// since /api/v2/method puts the whitelisted method's return value under
// `data` (see frappe.api.handle in frappe/api/__init__.py), not `message`.
// This always hits v2 explicitly and reads `.data`, and must stay that way:
// going through `/api/method/...` would get the response silently encrypted
// by this app's after_request hook (see creche_dashboard.py's module docstring).
export async function fetchV2(dottedMethod, params = {}) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    qs.set(key, Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : value)
  }
  const res = await fetch(`/api/v2/method/${dottedMethod}?${qs.toString()}`, {
    headers: { 'X-Frappe-CSRF-Token': window.csrf_token || '' },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    // A dead session (expired/cleared cookie, server restart invalidating
    // sessions, etc.) falls back to Guest server-side and stamps
    // `session_expired: 1` on the response (see frappe.sessions.Session.
    // get_session_record) - normally alongside a 403 PermissionError for a
    // whitelisted-but-not-guest-allowed method. Router.js's own
    // beforeEach guard only re-checks auth on navigation/tab-focus, so a
    // session dying while the user sits on the same page with no
    // navigation would otherwise just fail silently request after request.
    // Reloading re-runs the app's boot sequence, which resolves session.user
    // to null and lets the router's existing guard redirect to /login.
    if (body?.session_expired) {
      window.location.reload()
      throw new Error('Your session has expired - redirecting to login…')
    }
    const message = body?.exception || body?._error_message || body?.message || 'Request failed'
    throw new Error(message)
  }
  return body?.data
}

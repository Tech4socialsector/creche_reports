import { reactive, watch } from 'vue'
import { createResource, setConfig, frappeRequest } from 'frappe-ui'
import router from '@/router'

// createResource() below fires an immediate fetch at module-evaluation time
// (see initialUserCheck) - that's before main.js reaches its own imports
// finishing, so the resourceFetcher must be configured here, at first point
// of use, to guarantee it's set before any resource in this app can fetch.
setConfig('resourceFetcher', frappeRequest)

// `window.user` is set by frappe-ui's jinjaBootData Vite plugin from the
// www/creche-reports.html Jinja context's `boot` dict in production builds
// only - it's just a first-paint optimization. userResource.fetch() below
// is the authoritative check.
export const session = reactive({
  user: window.user && window.user !== 'Guest' ? window.user : null,
  user_image: null,
  full_name: null,
})

export const userResource = createResource({
  url: 'frappe.auth.get_logged_user',
  cache: 'frappe-user',
  onSuccess(user) {
    session.user = user
    fetchUserDetails()
  },
  onError() {
    session.user = null
  },
})

// `window.location.reload()` isn't awaited on purpose below - once this
// starts resolving, letting the current call stack finish doesn't matter;
// the page is about to be torn down anyway.
export const initialUserCheck = userResource.fetch()

export const userDetailsResource = createResource({
  url: 'frappe.client.get_value',
  makeParams: () => ({
    doctype: 'User',
    filters: session.user,
    fieldname: ['user_image', 'full_name'],
  }),
  onSuccess(data) {
    session.user_image = data?.user_image || null
    session.full_name = data?.full_name || null
  },
})

function fetchUserDetails() {
  if (session.user) userDetailsResource.reload()
}

export const loginResource = createResource({
  url: 'login',
  makeParams({ email, password }) {
    return {
      usr: email,
      pwd: password,
    }
  },
  onSuccess() {
    loginResource.error = null
    userResource.reload().then(() => {
      router.replace({ name: 'Dashboard' })
    })
  },
})

export const logoutResource = createResource({
  url: 'logout',
  onSuccess() {
    session.user = null
    userResource.reset()
    window.location.reload()
  },
})

// router.js's own beforeEach guard only re-checks auth (and therefore only
// ever redirects to /login) on navigation or when the tab regains focus -
// a session that dies while the user sits still on the same page (no
// clicks, no tab switch) previously just left them staring at a page whose
// API calls silently start failing one by one, with no visible prompt to
// re-authenticate. Watching session.user directly catches every path that
// can null it out - userResource's own onError above, fetchV2's explicit
// session_expired detection (see useApiV2.js), a manual logout - and reacts
// the same way regardless of which one fired. Guarded on oldValue being a
// real user (not the initial `null -> null` or `null -> <user>` boot
// transitions, which are normal startup, not an expiry) and on not already
// being on the Login route (nothing to redirect away from there).
watch(
  () => session.user,
  (user, oldUser) => {
    if (user || !oldUser) return
    if (router.currentRoute.value.name === 'Login') return
    router.replace({ name: 'Login' })
  },
)

import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'
import { session, initialUserCheck, userResource } from '@/data/session'
import { doctypeForRouteSlug, initialRoutableDoctypesLoad } from '@/data/doctypeRoutes'
import { pageTitle } from '@/data/pageTitle'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/Login.vue'),
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  // Dashboard is the only landing page now - an old bookmark/link to the
  // former standalone Home page still resolves instead of 404ing.
  {
    path: '/home',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/pages/Dashboard.vue'),
  },
  {
    path: '/budget-utilisation-report',
    name: 'BudgetUtilisationReport',
    component: () => import('@/pages/BudgetUtilisationReport.vue'),
  },
  {
    path: '/budget-import-template',
    name: 'BudgetImportTemplate',
    component: () => import('@/pages/BudgetImportTemplate.vue'),
  },
  {
    path: '/utilisation-import-template',
    name: 'UtilisationImportTemplate',
    component: () => import('@/pages/UtilisationImportTemplate.vue'),
  },
  // Generic doctype list/form - any doctype get_routable_doctypes() returns
  // (see data/doctypeRoutes.js, backed by the admin-configurable Sidebar
  // Item doctype) renders here purely from its live Frappe metadata, no
  // per-doctype Vue page needed. `remountOnParamChange` forces
  // a fresh component instance when only :name or :doctypeRoute changes
  // (e.g. navigating from one record straight to another via a Link field's
  // "open" button) - without it, Vue Router reuses the existing
  // DoctypeForm/DoctypeList instance and its internal state (loaded doc,
  // `values`, active tab, etc.) would otherwise carry over from the
  // previous record.
  {
    path: '/:doctypeRoute',
    name: 'DoctypeList',
    component: () => import('@/pages/DoctypeList.vue'),
    meta: { remountOnParamChange: true },
    props: (route) => ({ doctype: route.meta.resolvedDoctype }),
  },
  {
    path: '/:doctypeRoute/new',
    name: 'DoctypeNew',
    component: () => import('@/pages/DoctypeForm.vue'),
    meta: { remountOnParamChange: true },
    props: (route) => ({ doctype: route.meta.resolvedDoctype, isNew: true }),
  },
  {
    path: '/:doctypeRoute/:name',
    name: 'DoctypeForm',
    component: () => import('@/pages/DoctypeForm.vue'),
    meta: { remountOnParamChange: true },
    props: (route) => ({ doctype: route.meta.resolvedDoctype, name: route.params.name }),
  },
  // Anything else (a mistyped or stale URL, an old bookmark) lands on the
  // Dashboard, same as the post-login landing page.
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

let router = createRouter({
  history: createWebHistory('/creche-reports'),
  routes,
})

// Browser Back/Forward (and other in-SPA navigations) never re-check the
// server session on their own - Vue Router just swaps the client-side
// route from cached history state. Re-validate only when it can actually
// have changed: on the app's very first navigation, and when the tab
// regains focus after being hidden (the moment a session could have died
// elsewhere) - not on every single navigation, which would make each click
// wait on a round trip.
const REVALIDATE_INTERVAL_MS = 60_000
let lastCheckedAt = 0

async function recheckAuthIfStale() {
  const now = Date.now()
  if (now - lastCheckedAt < REVALIDATE_INTERVAL_MS) return
  lastCheckedAt = now
  await userResource.fetch().catch(() => {})
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      lastCheckedAt = 0
      userResource.fetch().catch(() => {})
    }
  })
}

router.beforeEach(async (to, from, next) => {
  // DoctypeList/DoctypeForm set this themselves once their record loads, but
  // nothing ever cleared it again - navigating away to a route that doesn't
  // set its own (Dashboard, the report page) left the PREVIOUS page's title
  // showing in MobileShell's header bar. Resetting it here, before the next
  // route's component even mounts, means a page that sets its own title
  // still overwrites this synchronously on its next tick, and one that
  // doesn't correctly falls through to routeLabel instead of stale text.
  if (to.name !== from.name) pageTitle.value = ''

  if (from === START_LOCATION) {
    // On the app's very first navigation, session.user isn't known yet - it's
    // only set once the initial frappe.auth.get_logged_user call resolves.
    // Awaiting that here (a no-op after it's settled) avoids treating "not
    // checked yet" as "logged out" and bouncing a real session to /login.
    // Same reasoning for the routable-doctypes map: a hard page load landing
    // straight on /:doctypeRoute could otherwise run the resolution below
    // before get_routable_doctypes()'s own GET has come back, bouncing a
    // perfectly valid route to Dashboard just because the map was still
    // empty at that instant.
    await Promise.all([initialUserCheck.catch(() => {}), initialRoutableDoctypesLoad])
  } else {
    await recheckAuthIfStale()
  }

  if (to.name !== 'Login' && !session.user) {
    next({ name: 'Login' })
    return
  }
  if (to.name === 'Login' && session.user) {
    next({ name: 'Dashboard' })
    return
  }

  // Resolve the generic /:doctypeRoute/... routes' slug against the live
  // routable-doctypes map (see data/doctypeRoutes.js, backed by the
  // admin-configurable Sidebar Item doctype) - not a fixed JS allowlist, so
  // any doctype an admin points a Sidebar Item at becomes navigable without
  // a frontend code change. An unmapped slug (mistyped, old bookmark, a
  // doctype no Sidebar Item references, or one the signed-in user can't
  // read) lands on Dashboard instead of rendering a page with no doctype to
  // fetch metadata for.
  if (to.params.doctypeRoute) {
    const doctype = doctypeForRouteSlug(to.params.doctypeRoute)
    if (!doctype) {
      next({ name: 'Dashboard' })
      return
    }
    to.meta.resolvedDoctype = doctype
  }

  next()
})

export default router

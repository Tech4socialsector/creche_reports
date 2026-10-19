<template>
  <!-- A full breadcrumb trail, derived fresh on every render from the
  current route + pageTitle.value - NOT a value computed once and cached,
  which is exactly the bug that got the old hand-built Breadcrumbs.vue
  deleted earlier (it kept showing the previous page's crumb right after
  navigating). breadcrumbItems below is a computed() reading route.name/
  route.params/pageTitle.value directly, same reactivity source the old
  plain `title` computed already used - just reshaped into a crumb array. See
  pageTitle.value reset in router.js's beforeEach, which is what keeps this
  from going stale across navigation. -->
  <div class="flex h-[3.25rem] flex-shrink-0 items-center justify-between gap-3 border-b border-outline-gray-1 bg-surface-white px-5">
    <Breadcrumbs class="min-w-0" :items="breadcrumbItems" />
    <Button
      variant="ghost"
      :icon="theme === 'dark' ? 'lucide-moon' : 'lucide-sun'"
      :tooltip="theme === 'dark' ? 'Dark theme - switch to light' : 'Light theme - switch to dark'"
      aria-label="Switch theme"
      class="flex-shrink-0"
      @click="theme = theme === 'dark' ? 'light' : 'dark'"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Breadcrumbs, Button } from 'frappe-ui'
import { currentTheme } from '@/data/theme'
import { pageTitle } from '@/data/pageTitle'
import { DOCTYPE_ROUTES } from '@/data/doctypeRoutes'

const route = useRoute()

const theme = computed({
  get: () => currentTheme.value,
  set: (v) => (currentTheme.value = v),
})

// Static label per named route, for anything that doesn't set pageTitle
// itself (DoctypeList/DoctypeForm set it dynamically once their record/
// doctype metadata loads - see data/pageTitle.js) - mirrors MobileShell.vue's
// own ROUTE_LABELS map so desktop and mobile always agree on a page's title.
const ROUTE_LABELS = {
  Dashboard: 'Dashboard',
  BudgetUtilisationReport: 'Budget Utilisation Report',
  BudgetImportTemplate: 'Budget Import Template',
  UtilisationImportTemplate: 'Utilisation Import Template',
}
const title = computed(() => pageTitle.value || ROUTE_LABELS[route.name] || route.name || '')

// Breadcrumb trail per route - always derived fresh from route.name/
// route.params/pageTitle.value (a computed, never a value set once and left
// stale - see the template's own comment above for why that matters here).
// Dashboard is the landing page, so it gets no trail at all (just its own
// title, same as every other route's final crumb).
const breadcrumbItems = computed(() => {
  const doctype = route.params.doctypeRoute ? DOCTYPE_ROUTES[route.params.doctypeRoute] : null

  if (route.name === 'Dashboard') {
    return [{ label: 'Dashboard' }]
  }

  if (route.name === 'DoctypeList') {
    return [
      { label: 'Dashboard', route: { name: 'Dashboard' } },
      { label: doctype || route.params.doctypeRoute },
    ]
  }

  if (route.name === 'DoctypeForm' || route.name === 'DoctypeNew') {
    return [
      { label: 'Dashboard', route: { name: 'Dashboard' } },
      {
        label: doctype || route.params.doctypeRoute,
        route: { name: 'DoctypeList', params: { doctypeRoute: route.params.doctypeRoute } },
      },
      { label: pageTitle.value || (route.name === 'DoctypeNew' ? 'New' : route.params.name) },
    ]
  }

  // BudgetUtilisationReport / BudgetImportTemplate / UtilisationImportTemplate
  // and anything else named - one level under Dashboard, using the same
  // title this navbar already shows as that page's own label.
  return [{ label: 'Dashboard', route: { name: 'Dashboard' } }, { label: title.value }]
})
</script>

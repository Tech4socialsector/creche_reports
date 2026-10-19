import { computed, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import navIcon from '@/components/navIcon'
import { fetchV2 } from '@/composables/useApiV2'
import { SIDEBAR_NAV_GROUPS } from '@/data/sidebarNav'
import { reportAccessResource } from '@/data/reportAccess'
import { sidebarItemsResource } from '@/data/sidebarItems'

// Shared "awesome bar" search logic - originally built inline inside
// AppSidebar.vue (the desktop rail's own Search box), extracted here so it
// can be reused by every shell's search trigger instead of being duplicated.
// Now the data source for the single shared CommandPalette instance (mounted
// once in AppLayout.vue) - see that file for how its output below is adapted
// into CommandPalette's groups/items shape. Re-derives the same nav item list
// AppSidebar.vue used to compute inline - the admin-configurable doctype
// items/groups from sidebarItemsResource
// (creche_reports.api.sidebar.get_sidebar_items) merged with the one
// hardcoded "Data Import & Templates" group (sidebarNav.js).
// get_sidebar_items() leaves have `doctype: null` for a built-in page (e.g.
// an import template, set via Sidebar Item's own Page select) - router.js
// has a dedicated named route for each of these, not the generic
// :doctypeRoute path a doctype-backed leaf uses. Kept in sync with
// AppSidebar.vue's own NAMED_ROUTE_BY_SLUG (duplicated rather than
// imported, same reasoning as every other small shared map in this app -
// see api/sidebar.py's own comment on ROUTE_BY_DOCTYPE).
const NAMED_ROUTE_BY_SLUG = {
  'budget-import-template': 'BudgetImportTemplate',
  'utilisation-import-template': 'UtilisationImportTemplate',
}

export function useGlobalSearch() {
  const route = useRoute()
  const router = useRouter()

  function toNavItem(entry) {
    const namedRoute = entry.namedRoute || NAMED_ROUTE_BY_SLUG[entry.route]
    return {
      label: entry.label,
      icon: navIcon(entry.icon || 'file-text'),
      to: namedRoute ? { name: namedRoute } : { name: 'DoctypeList', params: { doctypeRoute: entry.route } },
      isActive: namedRoute ? route.name === namedRoute : route.params.doctypeRoute === entry.route,
    }
  }

  const fixedNavItems = computed(() => [
    {
      label: 'Dashboard',
      icon: navIcon('panels-top-left'),
      to: { name: 'Dashboard' },
      isActive: route.name === 'Dashboard',
    },
    ...(reportAccessResource.data?.allowed
      ? [
          {
            label: 'Budget Utilisation Report',
            icon: navIcon('file-chart-column'),
            to: { name: 'BudgetUtilisationReport' },
            isActive: route.name === 'BudgetUtilisationReport',
          },
        ]
      : []),
  ])

  const topLevelDoctypeItems = computed(() =>
    (sidebarItemsResource.data || []).filter((item) => !item.is_group).map(toNavItem),
  )
  const doctypeGroupItems = computed(() => [
    ...(sidebarItemsResource.data || [])
      .filter((item) => item.is_group)
      .flatMap((group) => group.children.map(toNavItem)),
    ...SIDEBAR_NAV_GROUPS.flatMap((group) => group.items.map(toNavItem)),
  ])

  const searchQuery = ref('')
  const recordSearchResults = ref([])
  const recordSearchLoading = ref(false)

  const navSearchResults = computed(() => {
    const all = [...fixedNavItems.value, ...topLevelDoctypeItems.value, ...doctypeGroupItems.value]
    const q = searchQuery.value.trim().toLowerCase()
    // No query yet -> show every page as a browsable list (same "recent/
    // default items" pattern as Linear/VSCode's own command palettes),
    // instead of CommandPalette rendering completely blank (just the input,
    // no groups at all) until the user types the first character.
    if (!q) return all
    return all.filter((item) => item.label.toLowerCase().includes(q))
  })

  const runRecordSearch = useDebounceFn(async (query) => {
    recordSearchLoading.value = true
    try {
      recordSearchResults.value = await fetchV2('creche_reports.api.sidebar.global_search', { query })
    } catch (e) {
      recordSearchResults.value = []
    } finally {
      recordSearchLoading.value = false
    }
  }, 350)

  watch(searchQuery, (q) => {
    const query = q.trim()
    if (!query) {
      recordSearchResults.value = []
      recordSearchLoading.value = false
      return
    }
    runRecordSearch(query)
  })

  function reset() {
    searchQuery.value = ''
    recordSearchResults.value = []
    recordSearchLoading.value = false
  }

  function openHit(hit) {
    router.push({ name: 'DoctypeForm', params: { doctypeRoute: hit.route, name: hit.name } })
  }

  return {
    searchQuery,
    navSearchResults,
    recordSearchResults,
    recordSearchLoading,
    reset,
    openHit,
  }
}

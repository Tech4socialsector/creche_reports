// The ONE hardcoded nav group left: "Data Import & Templates". The 5
// doctype-backed nav items this file used to also hardcode (Creche Budget,
// Creche Utilisation, Creche Disbursement, Caregiver Salary, Creche
// Partners) are now admin-configurable via the "Sidebar Item" doctype
// instead - see data/sidebarItems.js's sidebarItemsResource
// (creche_reports.api.sidebar.get_sidebar_items). This group stays
// hardcoded because its two pages (Budget/Utilisation Import Template)
// aren't doctype-backed Vue pages - they're named Vue routes (see
// router.js) - and the Sidebar Item schema only supports linking to a real
// doctype's list/form page (`target_doctype`), not an arbitrary named
// route, so there's no way to represent these two from that doctype as it's
// currently specified.
//
// Shared by AppSidebar.vue (desktop rail) and useGlobalSearch.js (mobile
// search overlay), merged there with the doctype-driven groups/items from
// sidebarItemsResource, so the two stay in sync automatically.
//
// Each item's `namedRoute` is a named Vue route from router.js, resolved to
// { name: namedRoute } (as opposed to a doctype-backed item's `route` slug,
// resolved to { name: 'DoctypeList', params: { doctypeRoute } }).
export const SIDEBAR_NAV_GROUPS = [
  {
    label: 'Data Import & Templates',
    icon: 'folder-up',
    items: [
      { label: 'Budget Import Template', namedRoute: 'BudgetImportTemplate' },
      { label: 'Utilisation Import Template', namedRoute: 'UtilisationImportTemplate' },
    ],
  },
]

import { useCall } from 'frappe-ui'

// The admin-configurable "Sidebar Item" doctype's own nav list for the
// signed-in user (see creche_reports.api.sidebar.get_sidebar_items) - each
// entry is either a plain leaf ({ is_group: false, doctype, label, icon,
// route }) or a group ({ is_group: true, label, icon, children: [...] }),
// already filtered server-side by enabled/allowed_roles/has_permission.
// Does NOT include the "Data Import & Templates" group or its two Import
// Template pages - those aren't doctype-backed Vue pages (no target_doctype
// to point a Sidebar Item at), so they stay hardcoded in sidebarNav.js and
// get merged in alongside this resource's data by whatever renders the nav
// (see AppSidebar.vue / useGlobalSearch.js).
export const sidebarItemsResource = useCall({
  url: '/api/v2/method/creche_reports.api.sidebar.get_sidebar_items',
  method: 'GET',
  cacheKey: 'creche-reports-sidebar-items',
})

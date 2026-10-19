import { useCall } from 'frappe-ui'

// The admin-configurable "Sidebar Item" doctype's own nav list for the
// signed-in user (see creche_reports.api.sidebar.get_sidebar_items) - each
// entry is either a plain leaf ({ is_group: false, doctype, label, icon,
// route }) or a group ({ is_group: true, label, icon, children: [...] }),
// already filtered server-side by enabled/allowed_roles/has_permission. A
// leaf's `doctype` is null for a built-in page (e.g. an Import Template) set
// via that item's own Page select rather than a Target Doctype - see
// api/sidebar.py's CUSTOM_PAGES.
export const sidebarItemsResource = useCall({
  url: '/api/v2/method/creche_reports.api.sidebar.get_sidebar_items',
  method: 'GET',
  cacheKey: 'creche-reports-sidebar-items',
})

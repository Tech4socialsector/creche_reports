import { useCall } from 'frappe-ui'

// Cheap, safe-for-every-user check: does this user hold one of the Creche
// Budget Utilisation Report's own roles - lets the sidebar hide the link
// instead of showing it and then failing on the first load. The report
// itself is still independently enforced server-side on every data/export
// call (see creche_reports.api.budget_utilisation_report._assert_report_access).
export const reportAccessResource = useCall({
  url: '/api/v2/method/creche_reports.api.budget_utilisation_report.get_report_access',
  method: 'GET',
  cacheKey: 'creche-reports-budget-utilisation-report-access',
})

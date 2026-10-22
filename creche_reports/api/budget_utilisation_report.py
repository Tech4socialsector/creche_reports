"""Whitelisted bridge between the Vue frontend and the existing
"Creche Budget Utilisation Report" Script Report.

The report's own `execute`/`download_excel` functions are written to run
under Frappe's standard report machinery (`frappe.desk.query_report.run`),
which enforces the Report doctype's own role list before calling them -
`execute` itself carries no `@frappe.whitelist()` and must never be called
directly from here without re-checking those same roles, or any logged-in
user could read this report's data by hitting this module instead.
"""

import frappe
from frappe import _

from creche_reports.creche_finance_reports.report.creche_budget_utilisation_report import (
	creche_budget_utilisation_report as _report,
)

# Mirrors the `roles` list in creche_budget_utilisation_report.json exactly -
# kept here (not read from the Report doc on every call) since that list is
# effectively fixed and re-fetching it would be one extra query per request
# for no practical benefit; if the report's roles ever change, update both.
REPORT_ROLES = {
	"System Manager",
	"Creche Finance Head",
	"Creche Finance SPOCS",
	"Creche Finance PFO",
}


def _assert_report_access(user=None):
	user_roles = set(frappe.get_roles(user or frappe.session.user))
	if not (REPORT_ROLES & user_roles):
		frappe.throw(
			_("You do not have permission to access this report."),
			frappe.PermissionError,
		)


@frappe.whitelist()
def get_report_data(filters=None):
	_assert_report_access()
	if isinstance(filters, str):
		filters = frappe.parse_json(filters)
	columns, data = _report.execute(filters)
	return {"columns": columns, "data": data}


@frappe.whitelist()
def get_filter_options(doctype):
	_assert_report_access()
	return _report.get_permitted_filter_values(doctype)


@frappe.whitelist()
def download_excel(filters=None):
	_assert_report_access()
	return _report.download_excel(filters)

# Copyright (c) 2026, TFSS and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class CrecheDisbursement(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from creche_reports.creche_child.doctype.disbursement_tracker.disbursement_tracker import DisbursementTracker
		from frappe.types import DF

		balence_budget: DF.Currency
		budget_reference_id: DF.Link
		budget_reference_name: DF.Data | None
		disbursement: DF.Table[DisbursementTracker]
		financial_year: DF.Link
		grant_id: DF.Data
		partner_id: DF.Link
		partner_name: DF.Data | None
		state: DF.Link
		total_budget: DF.Currency
		total_disbursement: DF.Currency
	# end: auto-generated types

	pass

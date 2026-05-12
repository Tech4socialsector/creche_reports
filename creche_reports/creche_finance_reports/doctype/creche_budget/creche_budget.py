# Copyright (c) 2026, TFSS and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class CrecheBudget(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from creche_reports.creche_child.doctype.budget_items.budget_items import BudgetItems
		from frappe.types import DF

		budget_items_list: DF.Table[BudgetItems]
		budget_reference_name: DF.Data
		date_of_approval: DF.Date
		end_date: DF.Date
		financial_year: DF.Data
		grant_id: DF.Data
		no_of_creches: DF.Int
		partner_id: DF.Link
		partner_name: DF.Data | None
		start_date: DF.Date
		state: DF.Link
		total_budget: DF.Currency
	# end: auto-generated types

	pass

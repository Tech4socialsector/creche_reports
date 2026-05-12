# Copyright (c) 2026, TFSS and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class Crecheutilisation(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from creche_reports.creche_child.doctype.utilisation_items.utilisation_items import UtilisationItems
		from frappe.types import DF

		balance_amount: DF.Currency
		budget_reference_id: DF.Link
		budget_reference_name: DF.Data
		date: DF.Date | None
		declaration: DF.Check
		financial_year: DF.Link
		grant_id: DF.Data | None
		month: DF.Link
		no_of_creches: DF.Int
		partner_id: DF.Link
		partner_name: DF.Data | None
		state: DF.Link
		total_utilisation: DF.Currency
		utilisation_items_list: DF.Table[UtilisationItems]
	# end: auto-generated types

	pass

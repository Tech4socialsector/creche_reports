# Copyright (c) 2026, TFSS and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class BudgetItems(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		budget_main_head: DF.Data | None
		budget_sub_head: DF.Data | None
		notes: DF.SmallText | None
		parent: DF.Data
		parentfield: DF.Data
		parenttype: DF.Data
		total_amount: DF.Currency
		type_of_expenses: DF.Data | None
		type_of_expenses_id: DF.Link
		year_1: DF.Currency
		year_2: DF.Currency
		year_3: DF.Currency
	# end: auto-generated types

	pass

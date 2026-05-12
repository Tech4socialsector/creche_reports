# Copyright (c) 2026, TFSS and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class BudgetandExpenseitemslist(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		budget_main_head: DF.Data
		budget_sub_head: DF.Data
		type_of_expenses: DF.Data
	# end: auto-generated types

	pass

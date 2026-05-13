# Copyright (c) 2026, TFSS and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class CrechePartners(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		grant_id: DF.Data
		partner_name: DF.Data
	# end: auto-generated types

	pass

# Copyright (c) 2026, TFSS and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class CrecheDataImport(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		attach_file: DF.Attach | None
		import_type: DF.Literal["", "Budget Import", "Utilisation Import"]
	# end: auto-generated types

	pass

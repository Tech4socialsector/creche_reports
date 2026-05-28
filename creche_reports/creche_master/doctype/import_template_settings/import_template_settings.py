# Copyright (c) 2026, TFSS and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class ImportTemplatesettings(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from creche_reports.creche_child.doctype.import_template_items.import_template_items import ImportTemplateItems
		from frappe.types import DF

		table_jndv: DF.Table[ImportTemplateItems]
		user: DF.Link | None
	# end: auto-generated types

	pass

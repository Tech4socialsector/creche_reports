# Copyright (c) 2026, TFSS and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class CaregiversSalary(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from creche_reports.creche_child.doctype.caregivers_salary_batch_items.caregivers_salary_batch_items import CaregiversSalarybatchitems
		from frappe.types import DF

		block: DF.Link | None
		current_operartional_creches: DF.Int
		district: DF.Link | None
		noof_approved_creches: DF.Int
		partener__name: DF.Data | None
		partner_id: DF.Link | None
		project_approved_since: DF.Date | None
		state: DF.Link | None
		table_isll: DF.Table[CaregiversSalarybatchitems]
	# end: auto-generated types

	pass

# Copyright (c) 2026, TFSS and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class CrecheReportsExport(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		completed_on: DF.Datetime | None
		error_log: DF.LongText | None
		export_file: DF.Data | None
		export_type: DF.Data | None
		reference_names: DF.SmallText | None
		started_on: DF.Datetime | None
		status: DF.Literal["", "Queued", "Processing", "Completed", "Failed"]
		total_records: DF.Int
	# end: auto-generated types

	pass

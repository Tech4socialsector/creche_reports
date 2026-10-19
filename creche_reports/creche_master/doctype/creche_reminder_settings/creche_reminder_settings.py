# Copyright (c) 2026, TFSS and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class CrecheReminderSettings(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		days_before_month_end: DF.Int
		enable_month_end_reminder: DF.Check
		last_run_on: DF.Datetime | None
		last_run_summary: DF.SmallText | None
		reminder_email_message: DF.TextEditor | None
		reminder_email_subject: DF.Data | None
	# end: auto-generated types

	pass

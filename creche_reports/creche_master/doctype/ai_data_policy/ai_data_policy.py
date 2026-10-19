# Copyright (c) 2026, TFSS and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

from creche_reports.ai.data_service import ALWAYS_BLOCKED, MAX_ROWS_HARD, POLICY_CACHE_KEY


class AIDataPolicy(Document):
	def validate(self):
		if self.enabled and self.target_doctype in ALWAYS_BLOCKED:
			frappe.throw(_("{0} can never be enabled for the assistant.").format(self.target_doctype))
		if self.can_write and not self.can_read:
			frappe.throw(_("Can Create / Edit requires Can Read."))
		self.max_rows = min(max(frappe.utils.cint(self.max_rows) or 20, 1), MAX_ROWS_HARD)

	def on_update(self):
		frappe.cache().delete_value(POLICY_CACHE_KEY)

	def on_trash(self):
		frappe.cache().delete_value(POLICY_CACHE_KEY)

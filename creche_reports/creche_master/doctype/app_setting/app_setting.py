# Copyright (c) 2026, TFSS and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class AppSetting(Document):
	def validate(self):
		self.drop_key_of_previous_provider()

	def drop_key_of_previous_provider(self):
		"""An API key belongs to one provider's Base URL: if an admin points
		ai_api_base_url at a different endpoint without also typing a new key
		in the same save, the OLD key would otherwise keep being sent -
		unchanged - to a now-UNRELATED provider by _get_ai_credentials(), a
		real credential leak. Clearing the stored key here whenever the base
		URL changes without a fresh key typed in the same save means the
		worst case is the assistant stops working until a new key is entered
		for the new endpoint, not a secret silently handed to the wrong
		company."""
		old = self.get_doc_before_save()
		if not old or old.ai_api_base_url == self.ai_api_base_url:
			return
		new_key_typed = bool(self.ai_api_key) and set(str(self.ai_api_key)) != {"*"}
		if not new_key_typed:
			frappe.db.delete("__Auth", {"doctype": "App Setting", "name": "App Setting", "fieldname": "ai_api_key"})
			self.ai_api_key = ""

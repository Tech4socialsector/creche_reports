# Copyright (c) 2026, TFSS and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class KeyboardShortcut(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		action: DF.Literal["Go to Dashboard", "Open Search", "Toggle Theme"]
		enabled: DF.Check
		key_combo: DF.Data
		label: DF.Data
	# end: auto-generated types

	def on_update(self):
		_bust_keyboard_shortcuts_cache()

	def on_trash(self):
		_bust_keyboard_shortcuts_cache()


def _bust_keyboard_shortcuts_cache():
	# Same single-key convention as api/sidebar.py's sidebar-items cache:
	# get_shortcuts() isn't user-specific (every signed-in user sees the same
	# enabled shortcuts), so this is one plain cache key, not a per-user
	# prefix - a straight delete_value is enough, no delete_keys wildcard
	# needed.
	from creche_reports.api.keyboard_shortcuts import KEYBOARD_SHORTCUTS_CACHE_KEY

	frappe.cache().delete_value(KEYBOARD_SHORTCUTS_CACHE_KEY)

"""Backend for the admin-configurable "Keyboard Shortcut" doctype - returns
the enabled shortcuts for the Vue frontend's global keydown listener (see
frontend/src/composables/useKeyboardShortcuts.js). Same cache-then-bust shape
as api/sidebar.py's get_sidebar_items(), simplified to a single cache key
since (unlike the sidebar) a shortcut's visibility doesn't depend on the
signed-in user's roles - every signed-in user sees the same enabled set.
"""

import frappe

KEYBOARD_SHORTCUTS_CACHE_KEY = "creche_reports_keyboard_shortcuts"


@frappe.whitelist()
def get_shortcuts():
	"""Every enabled Keyboard Shortcut, as [{label, action, key_combo}], for
	the frontend's global listener to register. Cached (busted on the
	doctype's own on_update/on_trash - see keyboard_shortcut.py) since this is
	fetched once per app load but otherwise rarely changes."""
	cached = frappe.cache().get_value(KEYBOARD_SHORTCUTS_CACHE_KEY)
	if cached is not None:
		return cached

	rows = frappe.get_all(
		"Keyboard Shortcut",
		filters={"enabled": 1},
		fields=["label", "action", "key_combo"],
		order_by="label asc",
	)

	frappe.cache().set_value(KEYBOARD_SHORTCUTS_CACHE_KEY, rows, expires_in_sec=3600)
	return rows


def ensure_default_keyboard_shortcuts():
	"""Called from hooks.py's after_migrate - idempotently seeds one example
	shortcut ("Open Search" bound to mod+k) so the feature is discoverable out
	of the box, without overwriting an admin's own edits. Same self-healing
	pattern as api/sidebar.py's ensure_default_sidebar_items(): only creates a
	row that doesn't already exist by its (unique, autoname) label, safe to
	call on every migrate.

	mod+k deliberately matches CommandPalette's own built-in Ctrl+K/Cmd+K
	listener (see frontend's CommandPalette usage and useKeyboardShortcuts.js's
	own comment on why "Open Search" doesn't register a second, competing
	listener for the same combo).
	"""
	if frappe.db.exists("Keyboard Shortcut", "Open Search"):
		return
	doc = frappe.new_doc("Keyboard Shortcut")
	doc.label = "Open Search"
	doc.action = "Open Search"
	doc.key_combo = "mod+k"
	doc.enabled = 1
	doc.insert(ignore_permissions=True)

"""Opens up Frappe core's own "Data Import" doctype to this app's finance
roles, scoped the way the rest of this app already scopes things:

- Creche Finance SPOCS / Creche Finance PFO: can create Data Import records
  and see/edit only their OWN (if_owner=1 - Frappe's own native "only the
  creator" permission dimension, not a custom filter this app has to
  maintain).
- Creche Finance Head: sees and edits EVERYONE's, same "oversees the whole
  program" rule already applied via permissions.is_unrestricted_user()
  elsewhere in this app - Administrator/System Manager already bypass every
  permission check by default, so they need no DocPerm row of their own here.

On top of row-level scoping, the form itself is trimmed to 3 fields
(Document Type/reference_doctype, Import Type/import_type, Import File/
import_file) for everyone except System Manager/Administrator/Finance Head:
every other field on the doctype is moved to permlevel 1 via a Property
Setter, and only System Manager and Finance Head are granted write at that
permlevel - SPOCS/PFO can still READ those fields (permlevel 0's own read
covers permlevel 1 fields too, same as any Frappe doctype), they just can't
change them, which is what "read-only except for these 3 roles" means in
Frappe's own permission model.

Applied idempotently from after_migrate (see hooks.py), same as this app's
own ensure_* setup functions - not exported as fixtures, since every other
one-time setup in this app already follows the idempotent-function
convention rather than introducing fixtures for the first time here.
"""

import frappe

UNRESTRICTED_ROLE = "Creche Finance Head"
OWN_RECORDS_ONLY_ROLES = ("Creche Finance SPOCS", "Creche Finance PFO")

# Every other field a System Manager/Finance Head may still edit but
# SPOCS/PFO may only read - see this module's own docstring for why these
# specific 3 (reference_doctype, import_type, import_file) are left alone.
RESTRICTED_FIELDS = [
	"google_sheets_url",
	"use_csv_sniffer",
	"custom_delimiters",
	"delimiter_options",
	"submit_after_import",
	"mute_emails",
	"show_failed_logs",
]


def ensure_data_import_permissions():
	if not frappe.db.exists("DocType", "Data Import"):
		return

	for fieldname in RESTRICTED_FIELDS:
		# make_property_setter() always inserts a new Property Setter - no
		# built-in "already set" check - so this app's own idempotency has to
		# come from checking its docname first (Property Setter autonames as
		# "<doctype>-<fieldname>-<property>"), same as _ensure_doc_perm below
		# does for Custom DocPerm rows.
		if frappe.db.exists("Property Setter", f"Data Import-{fieldname}-permlevel"):
			continue
		frappe.make_property_setter(
			{
				"doctype": "Data Import",
				"doctype_or_field": "DocField",
				"fieldname": fieldname,
				"property": "permlevel",
				"value": "1",
				"property_type": "Int",
			},
			ignore_validate=True,
		)

	for role in OWN_RECORDS_ONLY_ROLES:
		_ensure_doc_perm(role, permlevel=0, read=1, write=1, create=1, if_owner=1)

	_ensure_doc_perm(UNRESTRICTED_ROLE, permlevel=0, read=1, write=1, create=1, if_owner=0)
	_ensure_doc_perm(UNRESTRICTED_ROLE, permlevel=1, read=1, write=1)
	_ensure_doc_perm("System Manager", permlevel=1, read=1, write=1)

	frappe.clear_cache(doctype="Data Import")


def _ensure_doc_perm(role, permlevel, read=0, write=0, create=0, if_owner=0):
	existing = frappe.db.exists("Custom DocPerm", {"parent": "Data Import", "role": role, "permlevel": permlevel})
	if existing:
		return
	frappe.get_doc({
		"doctype": "Custom DocPerm",
		"parent": "Data Import",
		"parenttype": "DocType",
		"parentfield": "permissions",
		"role": role,
		"permlevel": permlevel,
		"read": read,
		"write": write,
		"create": create,
		"if_owner": if_owner,
	}).insert(ignore_permissions=True)

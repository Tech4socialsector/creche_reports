"""AI Data Policy lifecycle: seeds for the doctypes that exist today, and the
guarantee that every doctype added later starts invisible to the assistant.

Rule for this codebase: whenever a doctype is created, it gets an AI Data
Policy. `ensure_policies` (run after every migrate) and `on_doctype_created`
(run when a DocType is inserted) create one automatically - *disabled*, so a
new doctype is off-limits to the assistant until a System Manager reviews it,
decides what the assistant may do, and lists its confidential fields. To make
a doctype available from the start, add it to SEED below.
"""

import frappe

from creche_reports.ai.data_service import ALWAYS_BLOCKED, POLICY_CACHE_KEY

# Modules whose doctypes get an auto-created (disabled-by-default) policy.
# Deliberately excludes "Creche Child" - child-table doctypes get a policy
# only through their parent's policy (include_child_tables) and don't need
# their own entry to show up in the assistant's own navigation.
APP_MODULES = ("Creche Finance Reports", "Creche Master")

# doctype -> what the assistant may do, and its confidential / protected fields.
# `hidden`: never seen, filtered on or set. `read_only`: seen, never set.
# creche_reports data is organizational/financial (partner-level budgets,
# disbursements, utilisation, aggregate caregiver salary figures), not
# individual case data, so there is little here that needs hiding outright -
# mostly system-set/reference fields that the assistant shouldn't rewrite.
SEED = {
	"Creche Budget": {
		"read_only": {
			"partner_id": "set when the budget is created", "partner_name": "set when the budget is created",
			"budget_reference_name": "generated", "grant_id": "set by the import/approval process",
		},
	},
	"Creche Disbursement": {
		"read_only": {
			"partner_id": "set when the disbursement is created", "partner_name": "set when the disbursement is created",
			"budget_reference_id": "links back to the approved budget", "budget_reference_name": "generated",
			"total_budget": "carried over from the linked budget",
		},
	},
	"Creche utilisation": {
		"read_only": {
			"partner_id": "set when the utilisation report is created", "partner_name": "set when the utilisation report is created",
			"budget_reference_id": "links back to the approved budget", "budget_reference_name": "generated",
		},
	},
	"Creche Caregiver Salary and Benefits": {
		"hidden": {
			"partner_name": "reported partner contact detail", "block": "reported partner location", "district": "reported partner location",
		},
		"read_only": {"partner_id": "set when the record is created"},
	},
	"Creche Partners": {},
	# Creche Reminder Settings is deliberately not seeded here: it's a Single
	# doctype (one document, named after the doctype itself), and search/
	# count_by/create in data_service assume a real table of records - the
	# same reason janadhikara's own SEED never included its Single doctype
	# (App Setting). The assistant can still be asked to read_record it
	# directly by name if this needs revisiting later.
}


def _rules(policy_fields):
	return [
		{"policy_field": field, "handling": handling, "reason": reason}
		for handling, mapping in policy_fields
		for field, reason in mapping.items()
	]


def seed_policies():
	"""Create the policies above for doctypes that don't have one yet. Never
	touches an existing policy, so an admin's edits survive."""
	created = []
	for doctype, spec in SEED.items():
		if frappe.db.exists("AI Data Policy", doctype) or not frappe.db.exists("DocType", doctype):
			continue
		frappe.get_doc({
			"doctype": "AI Data Policy",
			"target_doctype": doctype,
			"enabled": 1,
			"can_read": 1,
			"can_write": spec.get("can_write", 0),
			"include_child_tables": 1,
			"max_rows": 20,
			"description": "Seeded default - review before widening.",
			"field_rules": _rules([("Hidden", spec.get("hidden", {})), ("Read Only", spec.get("read_only", {}))]),
		}).insert(ignore_permissions=True)
		created.append(doctype)
	if created:
		frappe.cache().delete_value(POLICY_CACHE_KEY)
	return created


def _create_disabled_policy(doctype):
	if doctype in ALWAYS_BLOCKED or frappe.db.exists("AI Data Policy", doctype):
		return False
	frappe.get_doc({
		"doctype": "AI Data Policy",
		"target_doctype": doctype,
		"enabled": 0,
		"can_read": 1,
		"can_write": 0,
		"include_child_tables": 1,
		"max_rows": 20,
		"description": "Created automatically with the doctype. The assistant cannot see it until a System Manager reviews it and turns it on.",
	}).insert(ignore_permissions=True)
	return True


def ensure_policies():
	"""after_migrate: every doctype in this app's modules has a policy - new
	ones get a disabled one. Idempotent."""
	if not frappe.db.exists("DocType", "AI Data Policy"):
		return
	for doctype in frappe.get_all("DocType", filters={"module": ["in", APP_MODULES], "issingle": 0, "istable": 0}, pluck="name"):
		_create_disabled_policy(doctype)
	frappe.cache().delete_value(POLICY_CACHE_KEY)


def on_doctype_created(doc, method=None):
	"""DocType after_insert: a doctype created in one of this app's modules
	(e.g. through the desk's DocType editor) gets its disabled policy at once,
	without waiting for the next migrate."""
	if doc.module in APP_MODULES and not doc.issingle and not doc.istable and frappe.db.exists("DocType", "AI Data Policy"):
		_create_disabled_policy(doc.name)

"""The one door between the AI assistant and the app's data.

Everything the assistant can read or change goes through here, and the rule
is "the assistant gets no more than the signed-in person could get by hand,
and often less" - because whatever it reads is also sent to an external
language model.

Layers, all of which must agree:
  1. Default deny. A doctype is visible to the assistant only if an enabled
     AI Data Policy exists for it, it is one of this app's own frontend
     routes (DOCTYPE_ROUTES), and it isn't on ALWAYS_BLOCKED (access,
     configuration and the assistant's own guardrails can never be exposed
     or edited).
  2. The user's own permissions: frappe.has_permission / get_list (roles,
     User Permissions, sharing) - never ignore_permissions, never a user
     switch - plus field-level (permlevel) read/write permission.
  3. Field rules from the policy: Hidden fields are invisible (not returned,
     not filterable, not writable); Read Only fields can be seen, never set.
     Passwords, attachments and signatures are always hidden.
  4. Shape limits: only named, readable fields can be selected or filtered
     on, filter operators are whitelisted, row counts are capped.
  5. Child tables are only included if the child doctype has its own
     enabled policy - otherwise its rows are left out entirely.

Every access is written to the `creche_reports.ai` log for audit.
"""

import json

import frappe
from frappe import _

from creche_reports.ai.privacy import NAME_FIELDNAMES, TOKEN_RE, is_personal_field, token
from creche_reports.api import permissions as _perm

POLICY_CACHE_KEY = "creche_reports_ai_policies"
MAX_ROWS_HARD = 50
MAX_CHILD_ROWS = 100

# Never available to the assistant, whatever a policy says (the policy form
# refuses to enable them too): identity/access, framework configuration, and
# the assistant's own guardrails and settings.
ALWAYS_BLOCKED = {
	"User", "Role", "Has Role", "DocType", "DocField", "DocPerm", "Custom Field", "Custom DocPerm",
	"User Permission", "Role Permission for Page and Report", "System Settings", "Email Account",
	"Email Domain", "OAuth Client", "OAuth Bearer Token", "API Request Log", "Access Log", "Error Log",
	"Activity Log", "Version", "Patch Log", "Scheduled Job Type", "Server Script", "Client Script",
	"App Setting", "AI Guide Section", "AI Guide Instruction", "AI Data Policy", "AI Data Policy Field",
}

# This app's own custom doctypes only grant standard Frappe "read"
# permission (DocPerm) to System Manager - every other role's access to
# these 4 is scoped entirely through permissions.py's own User-Permission
# based logic (partner/budget/state/district/block), the same mechanism the
# Dashboard and reports already rely on (both fetch with ignore_permissions=
# True, then narrow by hand through that module's helpers - see its own
# docstring). frappe.has_permission()/frappe.get_list()'s own built-in
# permission check would each independently say no for any non-admin user on
# these 4, even when that same user can see this data perfectly well
# elsewhere in the app - so these 4 go through _can_read()/_can_read_record()
# for the "is this doctype/record visible at all" gate below, AND
# _scoped_get_list() (further down) instead of a bare frappe.get_list() for
# the actual row fetch, mirroring the Dashboard's own ignore_permissions=True
# + manual narrowing rather than relying on frappe.get_list()'s own
# (unusable, for these 4) permission enforcement. Every other doctype
# (Caregiver Salary, Reminder Settings, any future one) isn't part of this
# app's custom scoping scheme and keeps using frappe.has_permission()/a plain
# frappe.get_list() as normal.
_CUSTOM_SCOPED_DOCTYPES = {"Creche Budget", "Creche utilisation", "Creche Disbursement", "Creche Partners"}

# The column on each custom-scoped doctype that identifies it for
# permissions.py's own narrowing functions - "name" for Creche Budget/
# Partners (the docname IS the identity to filter by), "budget_reference_id"
# for Creche utilisation/Disbursement (both carry a link to their own
# Creche Budget, which is what's actually permission-scoped).
_SCOPE_COLUMN_BY_DOCTYPE = {
	"Creche Budget": "name",
	"Creche utilisation": "budget_reference_id",
	"Creche Disbursement": "budget_reference_id",
	"Creche Partners": "name",
}


def _apply_scope(doctype, filters):
	"""Narrow `filters` by this app's own permission scoping for a
	custom-scoped doctype - Creche Budget/utilisation/Disbursement all
	resolve to a permitted Creche Budget id set (permissions.py's own
	apply_budget_id_scope, already used by the Dashboard), Creche Partners to
	a permitted partner id set directly."""
	column = _SCOPE_COLUMN_BY_DOCTYPE[doctype]
	if doctype == "Creche Partners":
		effective = _perm.get_effective_partner_ids()
		f = dict(filters)
		if effective is None:
			return f
		existing = f.get(column)
		requested = existing[1] if isinstance(existing, list) and existing and existing[0] == "in" else ([existing] if existing else [])
		f[column] = ["in", _perm.intersect(requested, effective) or ["__none__"]]
		return f
	return _perm.apply_budget_id_scope(filters, column=column)


def _scoped_get_list(doctype, **kwargs):
	"""frappe.get_list() for a custom-scoped doctype - ignore_permissions=True
	(frappe.get_list's own permission check would reject every non-admin role
	on these 4, the same problem _can_read()/_can_read_record() solve for the
	doctype/record-level gates above) plus _apply_scope() on the filters, so
	"no DocPerm row for this role" never means "see everything" - only
	whatever this app's own permission scoping already grants this user
	elsewhere."""
	kwargs["filters"] = _apply_scope(doctype, kwargs.get("filters") or {})
	kwargs["ignore_permissions"] = True
	return frappe.get_list(doctype, **kwargs)


def _get_list_for(doctype, **kwargs):
	"""search()/count_by()'s own fetch - routes a custom-scoped doctype
	through _scoped_get_list(), everything else through a plain
	frappe.get_list() (which already enforces that doctype's own normal
	permissions, unaffected by any of this)."""
	if doctype in _CUSTOM_SCOPED_DOCTYPES:
		return _scoped_get_list(doctype, **kwargs)
	return frappe.get_list(doctype, **kwargs)


def _can_read(doctype):
	"""Whether the signed-in user may read ANYTHING of `doctype` at all (the
	"is this doctype visible to the assistant" gate) - mirrors is_unrestricted_user()
	plus "has at least one User Permission scoping them into this app's data"
	for the 4 custom-scoped doctypes, frappe.has_permission() for everything
	else."""
	if doctype not in _CUSTOM_SCOPED_DOCTYPES:
		return frappe.has_permission(doctype, "read")
	if _perm.is_unrestricted_user():
		return True
	return any(v is not None for v in _perm.get_permission_scope().values())


def _can_read_record(doctype, name):
	"""Whether the signed-in user may read this SPECIFIC record of `doctype` -
	same split as _can_read(), but record-level: permissions.py's own
	assert_* helpers (which already apply the OR-across-dimension semantics
	the rest of the app uses for these doctypes) instead of frappe.has_permission's
	doc-level check, which would again always say no for a non-admin role
	with zero DocPerm rows on these doctypes."""
	if doctype not in _CUSTOM_SCOPED_DOCTYPES:
		return frappe.has_permission(doctype, "read", doc=name)
	try:
		if doctype == "Creche Partners":
			_perm.assert_permitted("partner_id", name)
		else:
			# Creche Budget itself, or Creche utilisation/Disbursement (both
			# carry budget_reference_id) - assert_budget_permitted already
			# applies the same OR-across-dimension check for all three.
			_perm.assert_budget_permitted(name)
		return True
	except frappe.PermissionError:
		return False


LAYOUT_FIELDTYPES = {"Section Break", "Column Break", "Tab Break", "HTML", "Heading", "Button", "Image"}
# Values that must never leave the server for the model, whatever the policy.
ALWAYS_HIDDEN_FIELDTYPES = {"Password", "Attach", "Attach Image", "Signature", "Barcode"}
TABLE_FIELDTYPES = {"Table", "Table MultiSelect"}

ALLOWED_OPERATORS = {"=", "!=", ">", "<", ">=", "<=", "like", "not like", "in", "not in", "between", "is"}
MAX_IN_VALUES = 50

logger = frappe.logger("creche_reports.ai", allow_site=True, file_count=10)


def audit(action, doctype, detail=None):
	"""One line per assistant data access: who, what, which doctype."""
	logger.info(json.dumps({
		"user": frappe.session.user,
		"action": action,
		"doctype": doctype,
		"detail": detail,
	}, default=str))


# --- policies -----------------------------------------------------------

def _load_policies():
	cached = frappe.cache().get_value(POLICY_CACHE_KEY)
	if cached is not None:
		return cached
	policies = {}
	for name in frappe.get_all("AI Data Policy", pluck="name"):
		doc = frappe.get_doc("AI Data Policy", name)
		policies[doc.target_doctype] = {
			"enabled": bool(doc.enabled),
			"can_read": bool(doc.can_read),
			"can_write": bool(doc.can_write),
			"include_child_tables": bool(doc.include_child_tables),
			"max_rows": min(max(frappe.utils.cint(doc.max_rows) or 20, 1), MAX_ROWS_HARD),
			"hidden": {r.policy_field for r in doc.field_rules if r.handling == "Hidden"},
			"read_only": {r.policy_field for r in doc.field_rules if r.handling == "Read Only"},
		}
	frappe.cache().set_value(POLICY_CACHE_KEY, policies)
	return policies


def get_policy(doctype):
	"""The enabled policy for `doctype`, or None (= invisible to the assistant)."""
	if doctype in ALWAYS_BLOCKED:
		return None
	policy = _load_policies().get(doctype)
	if not policy or not policy["enabled"]:
		return None
	return frappe._dict(policy)


# Mirrors frontend/src/data/doctypeRoutes.js's DOCTYPE_ROUTES exactly - the
# generic list/form pages this app's frontend actually exposes. A doctype
# only here is visible to the assistant only if it also has an enabled AI
# Data Policy; being in this set is necessary, not sufficient.
APP_FRONTEND_DOCTYPES = {
	"Creche Caregiver Salary and Benefits",
	"Creche Budget",
	"Creche utilisation",
	"Creche Disbursement",
	"Creche Partners",
	"Creche Reminder Settings",
	# Location reference doctypes - low-risk (no financial/personal data),
	# genuinely useful for answering "which partners are in <state>" style
	# questions. Each still needs its own enabled AI Data Policy on top of
	# being listed here (see ensure_policies' auto-created disabled default) -
	# being in this set is necessary, not sufficient.
	"State",
	"District",
	"Block",
}


def _in_app_navigation(doctype):
	return doctype in APP_FRONTEND_DOCTYPES


def require_access(doctype, write=False):
	"""Raise unless the assistant may use `doctype` (for writing if `write`).
	Deliberately one generic message for every refusal - it doesn't reveal
	whether the doctype exists or why it's off."""
	unavailable = frappe.PermissionError(_("{0} is not available to the assistant").format(doctype))
	policy = get_policy(doctype)
	if not policy or not policy.can_read or not _in_app_navigation(doctype):
		raise unavailable
	if write and not policy.can_write:
		raise frappe.PermissionError(_("The assistant is not allowed to change {0}").format(doctype))
	return policy


# --- fields -------------------------------------------------------------

def _is_exposable(df):
	return (
		df.fieldtype not in LAYOUT_FIELDTYPES
		and df.fieldtype not in ALWAYS_HIDDEN_FIELDTYPES
		and not df.get("hidden")
	)


def readable_fields(doctype, policy, parenttype=None):
	"""Fields of `doctype` the assistant may see: not layout/hidden/secret
	types, not hidden by policy, and readable by this user at their
	permission level. Child tables are returned separately."""
	meta = frappe.get_meta(doctype)
	if doctype in _CUSTOM_SCOPED_DOCTYPES and not parenttype:
		# get_permitted_fieldnames() walks this doctype's DocPerm permlevel
		# rows - which here only ever list System Manager (see
		# _CUSTOM_SCOPED_DOCTYPES' own comment) - so for any other role it
		# would return NO fields at all, not just gate the doctype as a
		# whole. None of these doctypes actually use permlevel tiers (every
		# field is permlevel 0), so "every field with a value" is the exact
		# same fallback Frappe's own get_permitted_fieldnames() uses when a
		# doctype has no permissions defined at all - just applied
		# explicitly here, since these doctypes DO have permissions defined
		# (for System Manager), just not for the role actually asking.
		permitted = {df.fieldname for df in meta.get_fieldnames_with_value(with_field_meta=True)}
	else:
		permitted = set(meta.get_permitted_fieldnames(parenttype=parenttype, permission_type="read"))
	return [
		df for df in meta.fields
		if _is_exposable(df)
		and df.fieldtype not in TABLE_FIELDTYPES
		and df.fieldname in permitted
		# personal fields are always returned as placeholders, never as values, so a policy's Hidden rule
		# (which exists to keep a value from the model) is not needed for them
		and (df.fieldname not in policy.hidden or is_personal_field(df))
	]


def writable_fields(doctype, policy):
	"""Subset of readable fields the assistant may set: not read-only on the
	form, not marked Read Only by policy, and writable at this user's
	permission level. Tables are never written through the assistant."""
	meta = frappe.get_meta(doctype)
	can_write_levels = set(meta.get_permitted_fieldnames(permission_type="write"))
	return [
		df for df in readable_fields(doctype, policy)
		if not is_personal_field(df)  # the model never has such a value to write
		and not df.read_only
		and df.fieldname not in policy.read_only
		and df.fieldname in can_write_levels
	]


# --- personal values: placeholders out, real values back in -------------

def _placeholder(doctype, name, fieldname, value):
	return token(doctype, name, fieldname) if value not in (None, "") else value


def _reveal(doctype, name, fieldname):
	"""The real value behind a placeholder - only if the signed-in user may read that record and field."""
	unavailable = _("[not available]")
	try:
		require_access(doctype)
		df = frappe.get_meta(doctype).get_field(fieldname)
		if not df or not is_personal_field(df) or df.fieldtype in ALWAYS_HIDDEN_FIELDTYPES or df.fieldtype in TABLE_FIELDTYPES:
			return unavailable
		if not _can_read_record(doctype, name):
			return unavailable
		if fieldname not in frappe.get_meta(doctype).get_permitted_fieldnames(permission_type="read"):
			return unavailable
		value = frappe.db.get_value(doctype, name, fieldname)
	except Exception:
		return unavailable
	audit("reveal", doctype, {"name": name, "field": fieldname})
	if value in (None, ""):
		return _("(empty)")
	return frappe.format(value, df) if df.fieldtype in ("Date", "Datetime") else str(value)


def rehydrate(text):
	"""Replace placeholders in the assistant's reply with the real values, for this signed-in user only."""
	if not text or "[[" not in text:
		return text
	return TOKEN_RE.sub(lambda m: _reveal(m.group(1), m.group(2), m.group(3)), text)


# --- queries ------------------------------------------------------------

def _clean_filters(filters, allowed_names):
	if not filters:
		return {}
	if not isinstance(filters, dict):
		raise frappe.ValidationError(_("Filters must be an object of fieldname: value pairs."))
	clean = {}
	for key, value in filters.items():
		if key not in allowed_names:
			raise frappe.PermissionError(_("The assistant cannot filter by {0}").format(key))
		if isinstance(value, (list, tuple)):
			if len(value) != 2 or str(value[0]).lower() not in ALLOWED_OPERATORS:
				raise frappe.ValidationError(_("Unsupported filter for {0}").format(key))
			operator, operand = str(value[0]).lower(), value[1]
			if operator in ("in", "not in", "between"):
				if not isinstance(operand, (list, tuple)) or len(operand) > MAX_IN_VALUES:
					raise frappe.ValidationError(_("Unsupported filter for {0}").format(key))
				if not all(isinstance(v, (str, int, float)) for v in operand):
					raise frappe.ValidationError(_("Unsupported filter for {0}").format(key))
			elif isinstance(operand, (dict, list, tuple)):
				raise frappe.ValidationError(_("Unsupported filter for {0}").format(key))
			clean[key] = [operator, list(operand) if isinstance(operand, tuple) else operand]
		elif isinstance(value, (dict,)):
			raise frappe.ValidationError(_("Unsupported filter for {0}").format(key))
		else:
			clean[key] = value
	return clean


def list_available_doctypes():
	out = []
	for doctype in APP_FRONTEND_DOCTYPES:
		policy = get_policy(doctype)
		if policy and policy.can_read and _can_read(doctype):
			out.append({
				"doctype": doctype,
				"label": doctype,
				"can_write": bool(policy.can_write) and bool(frappe.has_permission(doctype, "write")),
			})
	return out


def describe_doctype(doctype):
	policy = require_access(doctype)
	writable = {df.fieldname for df in writable_fields(doctype, policy)} if policy.can_write else set()
	return {
		"doctype": doctype,
		"can_write": bool(policy.can_write),
		"fields": [
			{
				"fieldname": df.fieldname,
				"label": df.label,
				"fieldtype": df.fieldtype,
				"required": bool(df.reqd),
				"writable": df.fieldname in writable,
				"options": df.options if df.fieldtype in ("Select", "Link") else None,
			}
			for df in readable_fields(doctype, policy)
		],
	}


def search(doctype, filters=None, fields=None, limit=20):
	policy = require_access(doctype)
	if not _can_read(doctype):
		raise frappe.PermissionError(_("You do not have permission to view {0}").format(doctype))

	readable = readable_fields(doctype, policy)
	allowed = {df.fieldname for df in readable} | {"name"}
	# a name may be searched for; phone, address and bank-account-shaped fields may not be filtered on
	filterable = {df.fieldname for df in readable if not is_personal_field(df) or df.fieldname in NAME_FIELDNAMES} | {"name"}
	personal = {df.fieldname for df in readable if is_personal_field(df)}

	if fields:
		bad = [f for f in fields if f not in allowed]
		if bad:
			raise frappe.PermissionError(_("The assistant cannot read: {0}").format(", ".join(map(str, bad))))
		select = list(dict.fromkeys(["name", *fields]))
	else:
		listed = [df.fieldname for df in readable if df.in_list_view][:6]
		select = list(dict.fromkeys(["name", *listed]))

	limit = min(frappe.utils.cint(limit) or 20, policy.max_rows, MAX_ROWS_HARD)
	rows = _get_list_for(
		doctype,
		filters=_clean_filters(filters, filterable),
		fields=select,
		limit_page_length=limit,
		order_by="modified desc",
	)
	for row in rows:
		for fieldname in personal & set(row):
			row[fieldname] = _placeholder(doctype, row["name"], fieldname, row[fieldname])
	audit("search", doctype, {"returned": len(rows), "filtered_on": sorted((filters or {}).keys())})
	return rows


MAX_GROUPS = 30
GROUPABLE_FIELDTYPES = {"Select", "Link", "Check", "Data", "Int"}


def count_by(doctype, group_by, filters=None):
	"""How many records fall under each value of one field (for charts and summaries): [{value, count}].
	Only a plain, non-personal field can be grouped on."""
	policy = require_access(doctype)
	if not _can_read(doctype):
		raise frappe.PermissionError(_("You do not have permission to view {0}").format(doctype))
	readable = {df.fieldname: df for df in readable_fields(doctype, policy)}
	df = readable.get(group_by)
	if not df or is_personal_field(df) or df.fieldtype not in GROUPABLE_FIELDTYPES:
		raise frappe.PermissionError(_("The assistant cannot group by {0}").format(group_by))
	filterable = {n for n, f in readable.items() if not is_personal_field(f)} | {"name"}
	rows = _get_list_for(
		doctype,
		filters=_clean_filters(filters, filterable),
		fields=[group_by, {"COUNT": "name", "as": "count"}],
		group_by=group_by,
		order_by="count desc",
		limit_page_length=MAX_GROUPS,
	)
	audit("count_by", doctype, {"group_by": group_by, "filtered_on": sorted((filters or {}).keys())})
	return [{"value": r.get(group_by) if r.get(group_by) not in (None, "") else "(empty)", "count": r["count"]} for r in rows]


def _child_rows(parent_doctype, doc, table_df):
	child_policy = get_policy(table_df.options)
	if not child_policy or not child_policy.can_read:
		return None
	visible = [
		df for df in readable_fields(table_df.options, child_policy, parenttype=parent_doctype)
		if not is_personal_field(df)  # rows of a child table are not placeholdered: personal values are left out
	]
	return [
		{"name": row.name, **{df.fieldname: row.get(df.fieldname) for df in visible}}
		for row in (doc.get(table_df.fieldname) or [])[:MAX_CHILD_ROWS]
	]


def read(doctype, name):
	policy = require_access(doctype)
	if not _can_read_record(doctype, name):
		raise frappe.PermissionError(_("You do not have permission to view this record"))

	doc = frappe.get_doc(doctype, name)
	if doctype not in _CUSTOM_SCOPED_DOCTYPES:
		doc.check_permission("read")
	doc.apply_fieldlevel_read_permissions()

	data = {"name": doc.name}
	for df in readable_fields(doctype, policy):
		value = doc.get(df.fieldname)
		data[df.fieldname] = _placeholder(doctype, doc.name, df.fieldname, value) if is_personal_field(df) else value

	if policy.include_child_tables:
		for table_df in frappe.get_meta(doctype).get_table_fields():
			rows = _child_rows(doctype, doc, table_df)
			if rows is not None:
				data[table_df.fieldname] = rows

	audit("read", doctype, {"name": name})
	return data


def _check_writable(doctype, values, policy):
	allowed = {df.fieldname for df in writable_fields(doctype, policy)}
	denied = sorted(k for k in (values or {}) if k not in allowed)
	if denied:
		raise frappe.PermissionError(
			_("The assistant cannot set: {0}. These are read-only, hidden, restricted, or not fields of this form.").format(
				", ".join(denied)
			)
		)


def create(doctype, values):
	policy = require_access(doctype, write=True)
	if not frappe.has_permission(doctype, "create"):
		raise frappe.PermissionError(_("You do not have permission to create {0}").format(doctype))
	_check_writable(doctype, values, policy)
	doc = frappe.new_doc(doctype)
	doc.update(values or {})
	doc.insert()
	audit("create", doctype, {"name": doc.name, "fields": sorted((values or {}).keys())})
	return {"doctype": doctype, "name": doc.name}


def update(doctype, name, values):
	policy = require_access(doctype, write=True)
	if not frappe.has_permission(doctype, "write", doc=name):
		raise frappe.PermissionError(_("You do not have permission to edit this record"))
	_check_writable(doctype, values, policy)
	doc = frappe.get_doc(doctype, name)
	doc.check_permission("write")
	doc.update(values or {})
	doc.save()
	audit("update", doctype, {"name": name, "fields": sorted((values or {}).keys())})
	return {"doctype": doctype, "name": doc.name}

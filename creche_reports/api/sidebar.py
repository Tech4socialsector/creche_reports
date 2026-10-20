"""Sidebar search support (the slug<->doctype map and global-search backend
the Vue app's sidebar search box uses), PLUS the admin-configurable "Sidebar
Item" doctype's own backend: get_sidebar_items() below returns the
per-user-filtered nav list that doctype produces. A Sidebar Item (or its
child) links to EITHER a real doctype's list/form page (`target_doctype`)
OR one of the handful of built-in Vue pages that aren't doctype-backed
(`page_route`, see CUSTOM_PAGES below) - never both.
"""

import frappe

# Slugs for the 6 doctypes this app shipped with BEFORE the generic
# Sidebar-Item-driven resolution below existed - kept exact (not re-derived
# via _slug_for_doctype's scrub, which would rename 2 of these: "Creche
# Caregiver Salary and Benefits" would scrub to
# "creche-caregiver-salary-and-benefits", not "caregiver-salary", and
# "Creche Reminder Settings" to "creche-reminder-settings", not
# "reminder-settings") so URLs bookmarked/shared before this change, and any
# other app code still assuming these exact strings, keep working unchanged.
# Still mirrored (not imported) by creche_reports.ai.data_service's
# APP_FRONTEND_DOCTYPES, which is a DIFFERENT, deliberately-separate
# allowlist - that one gates what an external LLM may read, not what a
# Sidebar Item can route to, so it must stay admin-curated even now that
# this module's own routing is no longer a fixed list.
ROUTE_BY_DOCTYPE = {
	"Creche Budget": "creche-budget",
	"Creche utilisation": "creche-utilisation",
	"Creche Disbursement": "creche-disbursement",
	"Creche Caregiver Salary and Benefits": "caregiver-salary",
	"Creche Partners": "creche-partners",
	"Creche Reminder Settings": "reminder-settings",
}


def _slug_for_doctype(doctype):
	"""The URL slug a doctype's generic list/form page resolves against - one
	of the 6 pinned legacy slugs above if this doctype is one of them,
	otherwise derived the same way janadhikara's own App Module Setting
	does (frappe.scrub -> kebab-case), so ANY doctype an admin points a
	Sidebar Item's Target Doctype at (not just the original 6) gets a
	working route instead of the dead link ROUTE_BY_DOCTYPE.get() used to
	produce for anything outside that fixed map."""
	if doctype in ROUTE_BY_DOCTYPE:
		return ROUTE_BY_DOCTYPE[doctype]
	return frappe.scrub(doctype).replace("_", "-")


def _configured_target_doctypes():
	"""Every target_doctype an ENABLED Sidebar Item (top-level or nested in a
	group's Group Items List) actually points at - this is this app's own
	analogue of janadhikara's App Module Setting "doctypes" list: an admin
	adds a doctype to the nav by creating/editing a Sidebar Item record in
	Desk, and that alone is what makes it routable/searchable here, not a
	code change. Not user- or role-filtered (unlike get_sidebar_items()) -
	callers needing that (global_search) apply frappe.has_permission
	themselves per-hit, same as before this was dynamic."""
	top_level = frappe.get_all("Sidebar Item", filters={"enabled": 1}, pluck="target_doctype")
	nested = frappe.get_all(
		"Sidebar Item Child",
		filters={"enabled": 1, "parenttype": "Sidebar Item", "parentfield": "group_items"},
		pluck="target_doctype",
	)
	return {d for d in (*top_level, *nested) if d}


def _routable_doctypes():
	"""{slug: doctype} for every doctype currently configured in the nav
	(see _configured_target_doctypes), PLUS the 6 legacy ones even if no
	Sidebar Item currently references them - they were always routable
	before this became dynamic, and a page/report (Budget Utilisation
	Report, the import templates) or a Link field pointing at e.g. Creche
	Budget shouldn't go dead just because no Sidebar Item happens to
	reference it as a nav entry right now."""
	doctypes = _configured_target_doctypes() | set(ROUTE_BY_DOCTYPE)
	return {_slug_for_doctype(d): d for d in doctypes}


@frappe.whitelist()
def get_routable_doctypes():
	"""The frontend's one source of truth for resolving /:doctypeRoute (see
	router.js) and for routeSlugForDoctype (LinkField's "open" button,
	ConnectionsPanel, the AI assistant's navigate action) - replaces the
	static DOCTYPE_ROUTES JS map with this live, admin-configurable list.
	Returns every doctype this call is ALLOWED to see (frappe.has_permission
	read) among the ones configured, not just every configured one - picking
	"Data Import" as a Sidebar Item's Target Doctype, say, only makes it
	navigable for users who can actually read Data Import, same bar
	get_sidebar_items() already applies to the nav entry itself."""
	user = frappe.session.user
	return {
		slug: doctype
		for slug, doctype in _routable_doctypes().items()
		if frappe.has_permission(doctype, "read", user=user)
	}


# The handful of built-in Vue pages that aren't a generic doctype list/form -
# Sidebar Item's (and Sidebar Item Child's) own `page_route` Select field
# options must match these keys exactly. Each one's "permission doctype" is
# the doctype the page actually reads/writes (Budget Import Template only
# ever downloads a Creche Budget template, etc.) - same read-permission bar
# a doctype-backed item already needs, so a role that can't see Creche
# Budget at all doesn't see its import template link either. An entry can
# use `permission_roles` instead of `permission_doctype` for a page gated by
# a fixed role list rather than a doctype's own read permission (the Budget
# Utilisation Report is a Script Report with its own `roles` list, not a
# doctype a user reads/writes - see budget_utilisation_report.py's
# REPORT_ROLES, mirrored here for the same reason that module mirrors the
# Report doc's own role list rather than re-fetching it every call).
# An entry with neither permission_doctype nor permission_roles is readable
# by anyone already signed in - Dashboard has no doctype/role gate of its own
# (router.js only requires session.user, same as the rest of the app), so
# adding it here just lets it be represented as an ordinary Sidebar Item
# record (orderable, nestable in a group, still subject to that item's own
# Allowed Roles like any other) instead of staying hardcoded.
CUSTOM_PAGES = {
	"Budget Import Template": {"route": "budget-import-template", "permission_doctype": "Creche Budget"},
	"Utilisation Import Template": {"route": "utilisation-import-template", "permission_doctype": "Creche utilisation"},
	"Budget Utilisation Report": {
		"route": "budget-utilisation-report",
		"permission_roles": {"System Manager", "Creche Finance Head", "Creche Finance SPOCS", "Creche Finance PFO"},
	},
	"Dashboard": {"route": "dashboard"},
}


def ensure_global_search_doctypes():
	"""Called from hooks.py's after_migrate. Declaring doctypes under this
	app's own global_search_doctypes hook (see hooks.py) only has any effect
	once Global Search Settings' own allow-list is rebuilt from every
	installed app's hooks - that rebuild is otherwise a manual admin action
	(the "Reset" button on the Global Search Settings desk page), so a fresh
	install/migrate would silently have working in_global_search field flags
	but an empty allow-list, and global_search() below would keep returning
	nothing until someone clicked that button by hand."""
	from frappe.desk.doctype.global_search_settings.global_search_settings import (
		update_global_search_doctypes,
	)

	update_global_search_doctypes()


@frappe.whitelist()
def global_search(query, limit=10):
	"""Backs the sidebar's search box - Frappe's own global search
	(frappe.utils.global_search.search), the same full-text index behind
	desk's awesome bar, already permission-scoped to what the signed-in user
	can read. Narrowed to _routable_doctypes() only: a hit in some other
	doctype this app's Vue frontend has no page for would have nowhere to
	actually send the user. One unscoped call (not one per doctype) - Frappe's
	own search() already searches across every allowed doctype in a single
	query when `doctype` is left blank."""
	from frappe.utils.global_search import search as _frappe_global_search

	query = (query or "").strip()
	if not query:
		return []

	limit = int(limit)
	route_by_doctype = {d: s for s, d in _routable_doctypes().items()}
	hits = _frappe_global_search(query, limit=limit * 3)
	out = []
	for hit in hits:
		if hit["doctype"] not in route_by_doctype:
			continue
		out.append({
			"doctype": hit["doctype"],
			"name": hit["name"],
			"title": hit.get("title") or hit["name"],
			"route": route_by_doctype[hit["doctype"]],
		})
		if len(out) >= limit:
			break
	return out


# --- Sidebar Item (admin-configurable nav) -------------------------------
#
# A plain string prefix, not a single Redis key: get_sidebar_items()'s result
# depends on the signed-in user (role + has_permission filtering), so each
# user gets their own cache entry at f"{SIDEBAR_ITEMS_CACHE_KEY}:{user}".
# Busting on save/delete uses frappe.cache().delete_keys(SIDEBAR_ITEMS_CACHE_KEY)
# (a prefix wildcard match), which clears every user's entry at once - the
# simplest correct option since a single Sidebar Item's role/doctype change
# can affect what ANY user sees, not just the user who saved it.
SIDEBAR_ITEMS_CACHE_KEY = "creche_reports_sidebar_items"
DEFAULT_ICON = "file-text"


def _user_can_see(allowed_roles, user_roles, user):
	"""An item (group or leaf) is visible to `user` if its allowed_roles list
	is empty (shown to everyone), OR the user holds at least one of those
	roles, OR the user is System Manager (always sees everything) - same
	precedence as the rest of this app's role-gating (see
	creche_reports.api.permissions.is_unrestricted_user)."""
	if "System Manager" in user_roles or user == "Administrator":
		return True
	if not allowed_roles:
		return True
	return bool(set(allowed_roles) & set(user_roles))


def _leaf_shape(item_name, target_doctype, icon, page_route=None):
	if page_route:
		page = CUSTOM_PAGES.get(page_route)
		return {
			"is_group": False,
			"doctype": None,
			"label": item_name,
			"icon": icon or DEFAULT_ICON,
			"route": page["route"] if page else None,
		}
	return {
		"is_group": False,
		"doctype": target_doctype,
		"label": item_name,
		"icon": icon or DEFAULT_ICON,
		"route": _slug_for_doctype(target_doctype) if target_doctype else None,
	}


def _leaf_readable(target_doctype, page_route, user):
	"""Whether `user` has read access to whatever this leaf is backed by -
	the doctype itself for a target_doctype leaf, or the CUSTOM_PAGES entry's
	own permission_doctype/permission_roles for a page_route leaf (see
	CUSTOM_PAGES' own comment for why each page picks whichever of the two
	actually matches how that page gates access)."""
	if page_route:
		page = CUSTOM_PAGES.get(page_route)
		if not page:
			return False
		if "permission_roles" in page:
			return bool(page["permission_roles"] & set(frappe.get_roles(user)))
		if "permission_doctype" in page:
			return frappe.has_permission(page["permission_doctype"], "read", user=user)
		return True
	return bool(target_doctype) and frappe.has_permission(target_doctype, "read", user=user)


@frappe.whitelist()
def get_sidebar_items():
	"""Returns the signed-in user's own sidebar nav list, built from the
	"Sidebar Item" doctype: each enabled, role-permitted top-level row,
	sorted by sequence_id, as either a plain leaf (`is_group: false`) or a
	group (`is_group: true`) whose `children` are that group's own
	`group_items` rows, independently filtered by their OWN enabled/
	allowed_roles/has_permission - NOT the parent group's. A user must pass
	BOTH the group's allowed_roles check AND a child's own role restriction
	check to see that specific child (AND, not OR): the child-level
	restriction is explicitly in addition to the group-level one, not a
	replacement for it. A group with zero visible children after filtering
	is dropped entirely (no empty expandable group shown).

	A child's own role restriction is a single `role` Link field directly on
	its own "Sidebar Item Child" row - not a Table MultiSelect, since Frappe
	doesn't allow a child table row to hold another table field at all (a
	hard framework limit: see frappe.model.base_document.
	TABLE_DOCTYPES_FOR_CHILD_TABLES, which is unconditionally empty -
	"child tables cannot have child tables"). A plain Link field has no such
	restriction, so each child item can have at most one restricting role
	(not several) - an earlier two-table design allowed multiple roles per
	child but needed a second grid matched by name to work around the
	same-table-can't-nest-a-table limit; merged into this single field/table
	per an explicit user tradeoff (one role per child, one table to manage).
	"""
	user = frappe.session.user
	cache_key = f"{SIDEBAR_ITEMS_CACHE_KEY}:{user}"
	cached = frappe.cache().get_value(cache_key)
	if cached is not None:
		return cached

	user_roles = frappe.get_roles(user)

	rows = frappe.get_all(
		"Sidebar Item",
		filters={"enabled": 1},
		fields=["name", "item_name", "is_group", "sequence_id", "target_doctype", "page_route", "icon"],
		order_by="sequence_id asc, item_name asc",
	)

	result = []
	for row in rows:
		if not _user_can_see(
			frappe.get_all(
				"Has Role",
				filters={"parent": row.name, "parenttype": "Sidebar Item"},
				pluck="role",
			),
			user_roles,
			user,
		):
			continue

		if row.is_group:
			children = []
			child_rows = frappe.get_all(
				"Sidebar Item Child",
				filters={"parent": row.name, "parenttype": "Sidebar Item", "parentfield": "group_items", "enabled": 1},
				fields=["name", "item_name", "target_doctype", "page_route", "icon", "sequence_id", "role"],
				order_by="sequence_id asc, item_name asc",
			)

			for child in child_rows:
				child_roles = [child.role] if child.role else []
				if not _user_can_see(child_roles, user_roles, user):
					continue
				if not _leaf_readable(child.target_doctype, child.page_route, user):
					continue
				children.append(_leaf_shape(child.item_name, child.target_doctype, child.icon, child.page_route))

			if not children:
				continue

			result.append({
				"is_group": True,
				"label": row.item_name,
				"icon": row.icon or DEFAULT_ICON,
				"children": children,
			})
		else:
			if not _leaf_readable(row.target_doctype, row.page_route, user):
				continue
			result.append(_leaf_shape(row.item_name, row.target_doctype, row.icon, row.page_route))

	frappe.cache().set_value(cache_key, result, expires_in_sec=3600)
	return result


def ensure_default_sidebar_items():
	"""Called from hooks.py's after_migrate - idempotently creates the
	Sidebar Item rows for the 5 real doctype-linked items the hardcoded Vue
	nav (frontend/src/data/sidebarNav.js's SIDEBAR_NAV_ITEMS) used to show,
	the FIRST time this app is installed/migrated. Self-healing was
	originally keyed on `item_name` as a docname existence check alone - but
	an admin who later restructures these (e.g. renaming "Creche Budget" into
	a new "Home" group via Frappe's rename, with Creche Budget itself moved
	into that group's own Group Items List) changes that record's docname,
	so a plain existence-by-name check would no longer see it as "already
	exists" and would happily recreate a duplicate top-level item right next
	to the admin's own restructured one on the very next migrate.
	Checking by `target_doctype` instead - as either a top-level item OR
	nested inside ANY group's Group Items List - catches a item that has been
	moved/renamed this way, not just one still sitting under its original
	default name.

	"Data Import & Templates" (and its two Import Template pages) isn't
	seeded here either - it's no longer hardcoded anywhere in the frontend,
	just an ordinary admin-created Sidebar Item group like any other (via
	`page_route`, see CUSTOM_PAGES), so there's nothing default to recreate
	for it on a fresh install - an admin adds it like any other group/item.
	"""
	defaults = [
		("Creche Budget", "Creche Budget", "indian-rupee", 10),
		("Creche Utilisation", "Creche utilisation", "chart-pie", 20),
		("Creche Disbursement", "Creche Disbursement", "send", 30),
		("Caregiver Salary", "Creche Caregiver Salary and Benefits", "dollar-sign", 40),
		("Creche Partners", "Creche Partners", "briefcase", 50),
	]
	existing_top_level = set(
		frappe.get_all("Sidebar Item", filters={"is_group": 0}, pluck="target_doctype")
	)
	existing_nested = set(
		frappe.get_all("Sidebar Item Child", pluck="target_doctype")
	)
	already_represented = existing_top_level | existing_nested
	for item_name, target_doctype, icon, sequence_id in defaults:
		if target_doctype in already_represented:
			continue
		if frappe.db.exists("Sidebar Item", item_name):
			continue
		doc = frappe.new_doc("Sidebar Item")
		doc.item_name = item_name
		doc.is_group = 0
		doc.link_type = "Doctype"
		doc.target_doctype = target_doctype
		doc.icon = icon
		doc.sequence_id = sequence_id
		doc.enabled = 1
		doc.insert(ignore_permissions=True)

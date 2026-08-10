"""Shared User-Permission scoping for the Creche Finance dashboards and reports.

A user can be restricted via standard Frappe "User Permission" records on any
combination of: Creche Partners, Creche Budget, State, District, Block. All
five are enforced together — a permission on any one of them narrows what the
user can see on Creche Budget / Creche Disbursement / Creche utilisation,
since all three doctypes carry (or fetch from) partner_id/state/district/block,
and Creche Disbursement / Creche utilisation carry budget_reference_id.

Grant ID is intentionally NOT scoped here: it is a plain Data field on Creche
Budget (not a Link), so Frappe's User Permission mechanism has nothing to
restrict it against.
"""

import frappe
from typing import Optional

# Dashboard/report field -> doctype governing its User Permission restriction.
PERMISSION_DOCTYPE_MAP: dict[str, str] = {
    "partner_id":           "Creche Partners",
    "budget_reference_id":  "Creche Budget",
    "state":                "State",
    "district":             "District",
    "block":                "Block",
}


def is_unrestricted_user(user: Optional[str] = None) -> bool:
    user = user or frappe.session.user
    return user == "Administrator" or "System Manager" in frappe.get_roles(user)


def get_permitted_values(doctype: str, user: Optional[str] = None) -> Optional[list[str]]:
    """Docnames the user is restricted to for `doctype` via User Permission,
    or None if unrestricted (no such records, or an unrestricted user)."""
    user = user or frappe.session.user
    if is_unrestricted_user(user):
        return None
    permitted = frappe.permissions.get_user_permissions(user).get(doctype)
    if not permitted:
        return None
    return [p.get("doc") for p in permitted if p.get("doc")]


def get_permission_scope(user: Optional[str] = None) -> dict[str, Optional[list[str]]]:
    """Map each scopable field to its permitted values (None = unrestricted)."""
    return {field: get_permitted_values(doctype, user) for field, doctype in PERMISSION_DOCTYPE_MAP.items()}


def intersect(requested: Optional[list[str]], permitted: Optional[list[str]]) -> Optional[list[str]]:
    """Narrow a user-requested list against permitted values.

    Returns the requested list unchanged if unrestricted, the intersection if
    both are present, the permitted list if nothing was requested, or a
    sentinel single-item list that matches nothing if the intersection is empty.
    """
    if permitted is None:
        return requested or None
    if not requested:
        return list(permitted)
    narrowed = [v for v in requested if v in set(permitted)]
    return narrowed or ["__none__"]


def get_permitted_budgets(user: Optional[str] = None) -> Optional[list[dict]]:
    """Fetch every Creche Budget matching ANY granted permission dimension —
    a direct grant on the budget itself, OR its partner, OR its state, OR its
    district, OR its block — since each User Permission record is an
    independent grant, not a combined AND filter across dimensions.

    Returns None if the user is fully unrestricted (no permission records on
    any of the five scoped doctypes); otherwise the list of matching budget
    rows (possibly empty), each with name/partner_id/state/district/block.
    """
    if is_unrestricted_user(user):
        return None

    scope = get_permission_scope(user)
    if all(v is None for v in scope.values()):
        return None

    field_to_column = {
        "budget_reference_id": "name",
        "partner_id":          "partner_id",
        "state":               "state",
        "district":            "district",
        "block":               "block",
    }

    budgets_by_name: dict[str, dict] = {}
    matched_any_dimension = False
    for field, column in field_to_column.items():
        permitted = scope[field]
        if permitted is None:
            continue
        matched_any_dimension = True
        if not permitted:
            continue
        rows = frappe.get_all(
            "Creche Budget", filters={column: ["in", permitted]},
            fields=["name", "partner_id", "state", "district", "block"],
            ignore_permissions=True,
        )
        for r in rows:
            budgets_by_name[r.name] = r

    if not matched_any_dimension:
        return None
    return list(budgets_by_name.values())


def get_effective_partner_ids(user: Optional[str] = None) -> Optional[list[str]]:
    """Effective set of Creche Partners docnames the user may see: the union of
    any partner granted directly, plus every partner behind a budget matched
    by ANY granted dimension (direct budget grant, or state/district/block).

    Returns None if the user is fully unrestricted; otherwise a list
    (possibly empty).
    """
    budgets = get_permitted_budgets(user)
    if budgets is None:
        return None

    scope = get_permission_scope(user)
    partner_ids = set(scope["partner_id"] or [])
    partner_ids |= {b["partner_id"] for b in budgets if b.get("partner_id")}
    return list(partner_ids)


def get_effective_budget_ids(user: Optional[str] = None) -> Optional[list[str]]:
    """Effective set of Creche Budget docnames the user may see (union across
    every granted dimension). Returns None if fully unrestricted."""
    budgets = get_permitted_budgets(user)
    if budgets is None:
        return None
    return [b["name"] for b in budgets]


def apply_budget_id_scope(filters: dict, column: str = "name", user: Optional[str] = None) -> dict:
    """Narrow a filters dict for a Creche-Budget-linked table by budget
    identity — NOT by re-deriving partner_id/state/district/block value sets
    and AND-ing them independently, which is unsound: a partner permitted via
    one budget can have OTHER budgets in a non-permitted state, and
    intersecting column-value-sets separately would incorrectly let those
    other budgets' rows through (verified: a partner_id match alone doesn't
    imply the row's specific state/district/block combination was granted).

    `column` is the field holding the Creche Budget docname on the table
    being filtered — "name" for Creche Budget itself, "budget_reference_id"
    for Creche Disbursement / Creche utilisation. Returns a NEW dict; if the
    user has permission records but zero matching budgets, the resulting
    filter matches nothing (via the "__none__" sentinel).
    """
    effective_budget_ids = get_effective_budget_ids(user)
    f = dict(filters)
    if effective_budget_ids is None:
        return f

    existing = f.get(column)
    if isinstance(existing, list) and existing and existing[0] == "in":
        requested = existing[1]
    elif isinstance(existing, list) and existing and existing[0] != "in":
        # A non-"in" operator (e.g. ["!=", ...], ["like", ...]) on the scoped
        # column can't be safely narrowed by value-intersection here — deny
        # rather than silently misinterpreting it as an empty/absent filter.
        f[column] = ["in", ["__none__"]]
        return f
    else:
        requested = [existing] if existing else []
    f[column] = ["in", intersect(requested, effective_budget_ids) or ["__none__"]]
    return f


def assert_permitted(field: str, value: Optional[str], user: Optional[str] = None) -> None:
    """Raise PermissionError if `value` is outside the user's permitted values
    for `field` (partner_id, budget_reference_id, state, district, or block).
    Only meaningful for single-dimension checks; for a specific budget
    document prefer assert_budget_permitted, which applies OR-across-dimension
    semantics instead of requiring every dimension to pass independently."""
    if not value:
        return
    permitted = get_permitted_values(PERMISSION_DOCTYPE_MAP[field], user)
    if permitted is not None and value not in permitted:
        frappe.throw(
            frappe._("You do not have permission to access this record."),
            frappe.PermissionError,
        )


def assert_budget_permitted(budget_reference_id: str, user: Optional[str] = None) -> None:
    """Raise PermissionError unless this specific budget is reachable through
    ANY granted permission dimension (direct grant on the budget itself, its
    partner, its state, its district, or its block)."""
    effective_budget_ids = get_effective_budget_ids(user)
    if effective_budget_ids is None:
        return
    if budget_reference_id not in effective_budget_ids:
        frappe.throw(
            frappe._("You do not have permission to access this record."),
            frappe.PermissionError,
        )

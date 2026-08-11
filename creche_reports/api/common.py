import frappe

from creche_reports.api import permissions as _perm


@frappe.whitelist()
def get_all_partners():
    filters = {}
    permitted_partner_ids = _perm.get_effective_partner_ids()
    if permitted_partner_ids is not None:
        filters["name"] = ["in", permitted_partner_ids or ["__none__"]]
    data = frappe.get_list(
        "Creche Partners",
        filters=filters,
        fields=[
            "name",
            "partner_name",
        ],
        order_by="name asc"
    )

    return data



@frappe.whitelist()
def get_all_budgets():
    filters = _perm.apply_budget_id_scope({}, column="name")
    return frappe.get_list(
        "Creche Budget",
        filters=filters,
        fields=[
            "name",
            "budget_reference_name",
            "partner_id",
            "partner_name",
            "grant_id",
            "state",
            "district",
            "block",
            "no_of_creches",
        ],
        order_by="name asc"
    )



import frappe
from datetime import date
from dateutil.relativedelta import relativedelta


MONTH_ORDER = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


@frappe.whitelist()
def get_pending_utilisation(cutoff_date=None):

    today = date.today()

    # --- Resolve cutoff ---------------------------------------------------
    if cutoff_date:
        try:
            cutoff = date.fromisoformat(str(cutoff_date)).replace(day=1)
        except ValueError:
            frappe.throw("Invalid cutoff_date format. Use YYYY-MM-DD.")
    else:
        # if today >= 5th → last month is due; else month before last
        months_back = 1 if today.day >= 5 else 2
        cutoff = (today.replace(day=1) - relativedelta(months=months_back))

    # --- Fetch all budgets ------------------------------------------------
    budget_filters = [
        ["start_date", "is", "set"],
        ["end_date",   "is", "set"],
        ["start_date", "<=", cutoff],   # budget must have started by cutoff
    ]
    permitted_budget_ids = _perm.get_effective_budget_ids()
    if permitted_budget_ids is not None:
        budget_filters.append(["name", "in", permitted_budget_ids or ["__none__"]])
    budgets = frappe.get_all(
        "Creche Budget",
        fields=[
            "name",
            "budget_reference_name",
            "partner_id",
            "partner_name",
            "grant_id",
            "state",
            "district",
            "block",
            "start_date",
            "end_date",
        ],
        filters=budget_filters,
        ignore_permissions=True,
        limit_page_length=0,
    )

    if not budgets:
        return []

    # --- Fetch all existing utilisations in one query ---------------------
    budget_names = [b["name"] for b in budgets]

    existing = set(
        (r["budget_reference_id"], r["financial_year"], r["month"])
        for r in frappe.get_all(
            "Creche utilisation",
            filters={"budget_reference_id": ["in", budget_names]},
            fields=["budget_reference_id", "financial_year", "month"],
            ignore_permissions=True,
            limit_page_length=0,
        )
    )

    # --- Build pending list -----------------------------------------------
    pending = []

    for b in budgets:
        # Normalise to date objects
        start = b["start_date"]
        end   = b["end_date"]
        if not isinstance(start, date):
            start = date.fromisoformat(str(start))
        if not isinstance(end, date):
            end = date.fromisoformat(str(end))

        # ── KEY FIX ──────────────────────────────────────────────────────
        # Cursor starts at the budget's own start_date month (not cutoff).
        # Cursor stops at the EARLIEST of: budget end_date OR cutoff.
        # This means we never go beyond the budget's own end_date.
        # ─────────────────────────────────────────────────────────────────
        effective_end = min(end.replace(day=1), cutoff)
        cursor        = start.replace(day=1)

        while cursor <= effective_end:
            month_name = MONTH_ORDER[cursor.month - 1]
            fy_label   = (
                f"{cursor.year}-{cursor.year + 1}"
                if cursor.month >= 4
                else f"{cursor.year - 1}-{cursor.year}"
            )

            if (b["name"], fy_label, month_name) not in existing:
                deadline     = (cursor + relativedelta(months=1)).replace(day=5)
                days_overdue = (today - deadline).days

                pending.append({
                    "budget_reference_id":   b["name"],
                    "budget_reference_name": b["budget_reference_name"],
                    "partner_id":            b["partner_id"],
                    "partner_name":          b["partner_name"],
                    "grant_id":              b["grant_id"],
                    "state":                 b["state"],
                    "district":              b["district"],
                    "block":                 b["block"],
                    "financial_year":        fy_label,
                    "month":                 month_name,
                    "deadline":              deadline.isoformat(),
                    "days_overdue":          days_overdue,
                })

            cursor += relativedelta(months=1)

    pending.sort(key=lambda r: r["days_overdue"], reverse=True)
    return pending
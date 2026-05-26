import frappe
from collections import defaultdict
from typing import Optional

MONTH_ORDER = [
    "April", "May", "June", "July", "August", "September",
    "October", "November", "December", "January", "February", "March",
]

QUARTER_MONTHS: dict[str, list[str]] = {
    "Q1": ["April", "May", "June"],
    "Q2": ["July", "August", "September"],
    "Q3": ["October", "November", "December"],
    "Q4": ["January", "February", "March"],
}


def _parse_list(value: Optional[str]) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if v]
    return [v.strip() for v in str(value).split(",") if v.strip()]


def _build_base_filters(
    partner_id: Optional[str] = None,
    grant_id: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    block: Optional[str] = None,
    financial_year: Optional[str] = None,
) -> dict:
    f: dict = {}
    p = _parse_list(partner_id)
    if p:
        f["partner_id"] = ["in", p]
    g = _parse_list(grant_id)
    if g:
        f["grant_id"] = ["in", g]
    s = _parse_list(state)
    if s:
        f["state"] = ["in", s]
    d = _parse_list(district)
    if d:
        f["district"] = ["in", d]
    b = _parse_list(block)
    if b:
        f["block"] = ["in", b]
    fy = _parse_list(financial_year)
    if fy:
        f["financial_year"] = ["in", fy]
    return f


def _add_month_filter(filters: dict, month: Optional[str], quarter: Optional[str]) -> dict:
    f = dict(filters)
    months = _parse_list(month)
    quarters = _parse_list(quarter)
    if months:
        f["month"] = ["in", months]
    elif quarters:
        expanded: list[str] = []
        for q in quarters:
            expanded.extend(QUARTER_MONTHS.get(q, []))
        if expanded:
            f["month"] = ["in", expanded]
    return f


def get_expense_summary(items: list) -> list:
    summary: dict = defaultdict(lambda: {
        "type_of_expenses_id": "",
        "type_of_expenses": "",
        "budget_main_head": "",
        "budget_sub_head": "",
        "total_amount": 0,
    })
    for row in items:
        item = summary[row["type_of_expenses_id"]]
        item.update({
            "type_of_expenses_id": row["type_of_expenses_id"],
            "type_of_expenses": row["type_of_expenses"],
            "budget_main_head": row["budget_main_head"],
            "budget_sub_head": row["budget_sub_head"],
        })
        item["total_amount"] += row["total_amount"] or 0
    return list(summary.values())


# ---------------------------------------------------------------------------
# FILTER OPTIONS
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def get_dashboard_filters(
    financial_year: str = None,
    partner_id: str = None,
    grant_id: str = None,
    state: str = None,
    district: str = None,
    block: str = None,
) -> dict:
    """Return distinct filter options, cascaded by all OTHER currently-selected filters.

    Each field shows only the values that are valid given everything *except* its own
    current selection, so the user can always change any filter freely.
    """

    def _make_filters(exclude_key: str) -> dict:
        f: dict = {}
        mapping = {
            "financial_year": financial_year,
            "partner_id":     partner_id,
            "grant_id":       grant_id,
            "state":          state,
            "district":       district,
            "block":          block,
        }
        for key, val in mapping.items():
            if key == exclude_key:
                continue
            lst = _parse_list(val)
            if lst:
                f[key] = ["in", lst]
        return f

    def distinct(field: str) -> list[str]:
        rows = frappe.get_all(
            "Creche Budget",
            filters=_make_filters(field),
            fields=[field],
            distinct=True,
        )
        return sorted({r[field] for r in rows if r[field]})

    partner_rows = frappe.get_all(
        "Creche Budget",
        filters=_make_filters("partner_id"),
        fields=["partner_id", "partner_name"],
        distinct=True,
    )
    seen: set[str] = set()
    partners: list[dict] = []
    for r in partner_rows:
        if r.partner_id and r.partner_id not in seen:
            seen.add(r.partner_id)
            partners.append({"id": r.partner_id, "name": r.partner_name or r.partner_id})

    return {
        "partners":        sorted(partners, key=lambda x: x["name"]),
        "grants":          distinct("grant_id"),
        "states":          distinct("state"),
        "districts":       distinct("district"),
        "blocks":          distinct("block"),
        "financial_years": frappe.get_all("Financial year", fields=["name"], pluck="name"),
        "months":          MONTH_ORDER,
        "quarters":        ["Q1 (Apr–Jun)", "Q2 (Jul–Sep)", "Q3 (Oct–Dec)", "Q4 (Jan–Mar)"],
    }


# ---------------------------------------------------------------------------
# SUMMARY CARDS
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def get_dashboard_summary(
    partner_id: str = None,
    grant_id: str = None,
    state: str = None,
    district: str = None,
    block: str = None,
    month: str = None,
    quarter: str = None,
    financial_year: str = None,
) -> dict:
    """Return aggregated numbers for the six summary cards."""
    base = _build_base_filters(partner_id, grant_id, state, district, block, financial_year)

    budgets = frappe.get_all(
        "Creche Budget",
        filters=base,
        fields=["total_budget", "partner_id"],
    )
    total_budget = sum(b.total_budget or 0 for b in budgets)
    all_budget_partners = {b.partner_id for b in budgets}

    disbursements = frappe.get_all(
        "Creche Disbursement",
        filters=base,
        fields=["total_disbursement"],
    )
    total_disbursed = sum(d.total_disbursement or 0 for d in disbursements)

    util_filters = _add_month_filter(base, month, quarter)
    utilisations = frappe.get_all(
        "Creche utilisation",
        filters=util_filters,
        fields=["total_utilisation", "balance_amount", "partner_id", "declaration"],
    )
    total_utilisation = sum(u.total_utilisation or 0 for u in utilisations)
    total_balance_bank = sum(u.balance_amount or 0 for u in utilisations)
    partners_declared = {u.partner_id for u in utilisations if u.declaration}
    delinquent = len(all_budget_partners - partners_declared)

    return {
        "total_budget": total_budget,
        "total_utilisation": total_utilisation,
        "total_disbursed": total_disbursed,
        "balance_available": total_budget - total_utilisation,
        "delinquent_partners": delinquent,
        "total_balance_bank": total_balance_bank,
        "total_partners": len(all_budget_partners),
    }


# ---------------------------------------------------------------------------
# DRILL-DOWN: PARTNER LEVEL
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def get_partner_breakdown(
    partner_id: str = None,
    grant_id: str = None,
    state: str = None,
    district: str = None,
    block: str = None,
    month: str = None,
    quarter: str = None,
    financial_year: str = None,
) -> list:
    """Return one row per partner with aggregated budget / disbursed / utilised figures."""
    base = _build_base_filters(partner_id, grant_id, state, district, block, financial_year)

    budgets = frappe.get_all(
        "Creche Budget",
        filters=base,
        fields=["partner_id", "partner_name", "grant_id", "state", "district", "block",
                "total_budget", "no_of_creches"],
    )

    pmap: dict[str, dict] = {}
    for b in budgets:
        pid = b.partner_id
        if pid not in pmap:
            pmap[pid] = {
                "partner_id": pid,
                "partner_name": b.partner_name or pid,
                "grant_ids": set(),
                "states": set(),
                "districts": set(),
                "blocks": set(),
                "total_budget": 0,
                "total_disbursed": 0,
                "total_utilisation": 0,
                "balance_available": 0,
                "balance_bank": 0,
                "no_of_creches": 0,
                "months_submitted": 0,
            }
        p = pmap[pid]
        p["total_budget"] += b.total_budget or 0
        p["no_of_creches"] += b.no_of_creches or 0
        if b.grant_id:
            p["grant_ids"].add(b.grant_id)
        if b.state:
            p["states"].add(b.state)
        if b.district:
            p["districts"].add(b.district)
        if b.block:
            p["blocks"].add(b.block)

    for d in frappe.get_all(
        "Creche Disbursement", filters=base, fields=["partner_id", "total_disbursement"]
    ):
        if d.partner_id in pmap:
            pmap[d.partner_id]["total_disbursed"] += d.total_disbursement or 0

    util_filters = _add_month_filter(base, month, quarter)
    for u in frappe.get_all(
        "Creche utilisation",
        filters=util_filters,
        fields=["partner_id", "total_utilisation", "balance_amount"],
    ):
        if u.partner_id in pmap:
            pmap[u.partner_id]["total_utilisation"] += u.total_utilisation or 0
            pmap[u.partner_id]["balance_bank"] += u.balance_amount or 0
            pmap[u.partner_id]["months_submitted"] += 1

    result = []
    for p in pmap.values():
        p["balance_available"] = p["total_budget"] - p["total_utilisation"]
        p["grant_ids"] = ", ".join(sorted(p["grant_ids"]))
        p["states"] = ", ".join(sorted(p["states"]))
        p["districts"] = ", ".join(sorted(p["districts"]))
        p["blocks"] = ", ".join(sorted(p["blocks"]))
        result.append(p)

    return sorted(result, key=lambda x: (x["partner_name"] or "").lower())


# ---------------------------------------------------------------------------
# DRILL-DOWN: BUDGET LEVEL (for a single partner)
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def get_budget_breakdown(
    partner_id: str,
    grant_id: str = None,
    state: str = None,
    district: str = None,
    block: str = None,
    month: str = None,
    quarter: str = None,
    financial_year: str = None,
) -> list:
    """Return one row per budget/grant for the given partner."""
    filters: dict = {"partner_id": partner_id}
    gl = _parse_list(grant_id)
    if gl:
        filters["grant_id"] = ["in", gl]
    sl = _parse_list(state)
    if sl:
        filters["state"] = ["in", sl]
    dl = _parse_list(district)
    if dl:
        filters["district"] = ["in", dl]
    bl = _parse_list(block)
    if bl:
        filters["block"] = ["in", bl]
    fl = _parse_list(financial_year)
    if fl:
        filters["financial_year"] = ["in", fl]

    budgets = frappe.get_all(
        "Creche Budget",
        filters=filters,
        fields=["name", "grant_id", "state", "district", "block",
                "total_budget", "financial_year", "no_of_creches", "budget_reference_name"],
    )
    if not budgets:
        return []

    bmap = {
        b.name: {
            "budget_reference_id": b.name,
            "budget_reference_name": b.budget_reference_name or b.name,
            "grant_id": b.grant_id,
            "state": b.state,
            "district": b.district,
            "block": b.block,
            "financial_year": b.financial_year,
            "no_of_creches": b.no_of_creches or 0,
            "total_budget": b.total_budget or 0,
            "total_disbursed": 0,
            "total_utilisation": 0,
            "balance_available": 0,
            "balance_bank": 0,
            "months_submitted": 0,
        }
        for b in budgets
    }
    budget_ids = list(bmap.keys())

    for d in frappe.get_all(
        "Creche Disbursement",
        filters={"partner_id": partner_id, "budget_reference_id": ["in", budget_ids]},
        fields=["budget_reference_id", "total_disbursement"],
    ):
        if d.budget_reference_id in bmap:
            bmap[d.budget_reference_id]["total_disbursed"] += d.total_disbursement or 0

    util_filters: dict = {
        "partner_id": partner_id,
        "budget_reference_id": ["in", budget_ids],
    }
    util_filters = _add_month_filter(util_filters, month, quarter)
    for u in frappe.get_all(
        "Creche utilisation",
        filters=util_filters,
        fields=["budget_reference_id", "total_utilisation", "balance_amount"],
    ):
        if u.budget_reference_id in bmap:
            bmap[u.budget_reference_id]["total_utilisation"] += u.total_utilisation or 0
            bmap[u.budget_reference_id]["balance_bank"] += u.balance_amount or 0
            bmap[u.budget_reference_id]["months_submitted"] += 1

    result = []
    for b in bmap.values():
        b["balance_available"] = b["total_budget"] - b["total_utilisation"]
        result.append(b)

    return sorted(result, key=lambda x: x["grant_id"] or "")


# ---------------------------------------------------------------------------
# DRILL-DOWN: MONTH LEVEL (for a single budget)
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def get_month_breakdown(
    budget_reference_id: str,
    month: str = None,
    quarter: str = None,
) -> list:
    """Return one row per month submitted for the given budget."""
    filters: dict = {"budget_reference_id": budget_reference_id}
    filters = _add_month_filter(filters, month, quarter)

    records = frappe.get_all(
        "Creche utilisation",
        filters=filters,
        fields=[
            "name", "month", "date", "total_utilisation",
            "balance_amount", "interest_from_bank", "declaration", "no_of_creches",
        ],
    )

    midx = {m: i for i, m in enumerate(MONTH_ORDER)}
    records.sort(key=lambda x: midx.get(x.month, 99))
    return [dict(r) for r in records]


# ---------------------------------------------------------------------------
# DRILL-DOWN: EXPENSE LINE-ITEM BREAKDOWN (budget vs utilisation for a budget)
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def get_budget_expense_breakdown(
    budget_reference_id: str,
    month: str = None,
    quarter: str = None,
) -> dict:
    """Return expense-level budget vs utilisation breakdown for a single budget.

    Determines the current budget year from start_date, computes the monthly
    pro-rated allocation per expense line, then compares against actual utilisation
    items.  Returns two datasets:
      - expense_breakdown: one row per expense type (budget Y1/Y2/Y3, utilised, balance)
      - monthly_summary:   one row per submitted month (pro-rated budget, utilised, balance)
                           each with an `items` list of expense-level detail for that month
    """
    from frappe.utils import getdate, today as frappe_today, date_diff

    # ── Budget meta ───────────────────────────────────────────────────────
    budget = frappe.get_doc("Creche Budget", budget_reference_id)
    start_date = budget.start_date
    end_date   = budget.end_date

    today_date = getdate(frappe_today())

    if start_date:
        start = getdate(start_date)
        days_elapsed = date_diff(today_date, start)
        if days_elapsed < 0:
            current_year, months_in_year = 1, 1
        elif days_elapsed < 365:
            current_year     = 1
            months_in_year   = min(12, max(1, days_elapsed // 30 + 1))
        elif days_elapsed < 730:
            current_year     = 2
            months_in_year   = min(12, max(1, (days_elapsed - 365) // 30 + 1))
        else:
            current_year     = 3
            months_in_year   = min(12, max(1, (days_elapsed - 730) // 30 + 1))
    else:
        current_year, months_in_year = 1, 12

    # ── Budget items (child table) ────────────────────────────────────────
    budget_items = frappe.get_all(
        "Budget Items",
        filters={"parent": budget_reference_id, "parenttype": "Creche Budget"},
        fields=[
            "type_of_expenses_id", "type_of_expenses",
            "budget_main_head", "budget_sub_head",
            "year_1", "year_2", "year_3", "total_amount",
        ],
    )

    # ── Utilisation records (with optional month / quarter filter) ────────
    util_filters: dict = {"budget_reference_id": budget_reference_id}
    util_filters = _add_month_filter(util_filters, month, quarter)

    util_records = frappe.get_all(
        "Creche utilisation",
        filters=util_filters,
        fields=["name", "month", "financial_year", "total_utilisation",
                "balance_amount", "interest_from_bank", "declaration"],
    )

    util_names = [r.name for r in util_records]

    util_items: list = []
    if util_names:
        util_items = frappe.get_all(
            "Utilisation Items",
            filters={"parent": ["in", util_names], "parenttype": "Creche utilisation"},
            fields=[
                "parent", "type_of_expenses_id", "type_of_expenses",
                "budget_main_head", "budget_sub_head", "total_amount",
            ],
        )

    # ── Build expense map (keyed by type_of_expenses_id) ─────────────────
    expense_map: dict = {}
    for bi in budget_items:
        key     = bi.type_of_expenses_id or bi.type_of_expenses or bi.budget_main_head or "other"
        yr1     = float(bi.year_1 or 0)
        yr2     = float(bi.year_2 or 0)
        yr3     = float(bi.year_3 or 0)
        cur_yr  = [yr1, yr2, yr3][current_year - 1]
        monthly = cur_yr / 12 if cur_yr else 0

        expense_map[key] = {
            "type_of_expenses_id":  bi.type_of_expenses_id,
            "type_of_expenses":     bi.type_of_expenses,
            "budget_main_head":     bi.budget_main_head,
            "budget_sub_head":      bi.budget_sub_head,
            "year_1":               yr1,
            "year_2":               yr2,
            "year_3":               yr3,
            "total_budget":         float(bi.total_amount or (yr1 + yr2 + yr3)),
            "current_year_budget":  cur_yr,
            "monthly_budget":       monthly,
            "budget_to_date":       round(monthly * months_in_year, 2),
            "total_utilised":       0.0,
            "balance":              0.0,
            "pct_utilised":         0.0,
        }

    # ── Aggregate utilisation items → expense map + monthly breakdown ─────
    parent_map: dict = {r.name: r for r in util_records}
    monthly_map: dict = {}     # key = month string

    for ui in util_items:
        exp_key = ui.type_of_expenses_id or ui.type_of_expenses or ui.budget_main_head or "other"
        amount  = float(ui.total_amount or 0)

        # Expense-level aggregation
        if exp_key in expense_map:
            expense_map[exp_key]["total_utilised"] += amount

        # Monthly aggregation
        parent = parent_map.get(ui.parent)
        if not parent:
            continue

        mk = parent.month
        if mk not in monthly_map:
            monthly_map[mk] = {
                "month":            parent.month,
                "financial_year":   parent.financial_year,
                "declaration":      bool(parent.declaration),
                "balance_amount":   float(parent.balance_amount or 0),
                "interest":         float(parent.interest_from_bank or 0),
                "total_utilised":   0.0,
                "items":            {},
            }

        monthly_map[mk]["total_utilised"] += amount

        ek = exp_key
        if ek not in monthly_map[mk]["items"]:
            monthly_map[mk]["items"][ek] = {
                "type_of_expenses_id": ui.type_of_expenses_id,
                "type_of_expenses":    ui.type_of_expenses,
                "budget_main_head":    ui.budget_main_head,
                "budget_sub_head":     ui.budget_sub_head,
                "monthly_budget":      expense_map.get(ek, {}).get("monthly_budget", 0),
                "utilised":            0.0,
            }
        monthly_map[mk]["items"][ek]["utilised"] += amount

    # ── Compute balance / pct on expense rows ─────────────────────────────
    total_monthly_budget = sum(e["monthly_budget"] for e in expense_map.values())

    for e in expense_map.values():
        tb = e["total_budget"]
        e["balance"]     = round(tb - e["total_utilised"], 2)
        e["pct_utilised"] = round(e["total_utilised"] / tb * 100, 1) if tb else 0.0
        e["total_utilised"] = round(e["total_utilised"], 2)

    # ── Build monthly summary list ────────────────────────────────────────
    midx = {m: i for i, m in enumerate(MONTH_ORDER)}
    monthly_summary: list = []

    for mk, mv in monthly_map.items():
        budget_this_month = total_monthly_budget
        utilised          = round(mv["total_utilised"], 2)
        mv["monthly_budget"] = round(budget_this_month, 2)
        mv["balance"]        = round(budget_this_month - utilised, 2)
        mv["pct_utilised"]   = round(utilised / budget_this_month * 100, 1) if budget_this_month else 0.0
        mv["total_utilised"] = utilised
        # items: dict → sorted list
        mv["items"] = sorted(
            [
                {**v, "balance": round(v["monthly_budget"] - v["utilised"], 2)}
                for v in mv["items"].values()
            ],
            key=lambda x: (x["budget_main_head"] or "", x["type_of_expenses"] or ""),
        )
        monthly_summary.append(mv)

    monthly_summary.sort(key=lambda x: midx.get(x["month"], 99))

    return {
        "budget_meta": {
            "budget_reference_id":  budget_reference_id,
            "budget_reference_name": budget.budget_reference_name,
            "partner_name":         budget.partner_name,
            "grant_id":             budget.grant_id,
            "start_date":           str(start_date) if start_date else None,
            "end_date":             str(end_date) if end_date else None,
            "current_year":         current_year,
            "months_elapsed":       months_in_year,
            "monthly_budget_total": round(total_monthly_budget, 2),
        },
        "expense_breakdown": sorted(
            list(expense_map.values()),
            key=lambda x: (x["budget_main_head"] or "", x["type_of_expenses"] or ""),
        ),
        "monthly_summary": monthly_summary,
    }


# ---------------------------------------------------------------------------
# LEGACY — kept for backward compatibility with other pages
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def get_creche_utilisation(
    budget_reference_id: str = None,
    partner_id: str = None,
    state: str = None,
    financial_year: str = None,
    month: str = None,
    report_type: str = None,
) -> dict:

    filters = {
        k: v for k, v in {
            "budget_reference_id": budget_reference_id,
            "partner_id": partner_id,
            "state": state,
            "financial_year": financial_year,
        }.items() if v
    }

    if month:
        if isinstance(month, str) and "," in month:
            month = [m.strip() for m in month.split(",")]
        if isinstance(month, list):
            filters["month"] = ["in", [m for m in MONTH_ORDER if m in month]]
        elif report_type == "Month wise":
            filters["month"] = month
        elif report_type == "YTD":
            filters["month"] = ["in", MONTH_ORDER[:MONTH_ORDER.index(month) + 1]]

    parent_docs = frappe.get_all(
        "Creche utilisation",
        filters=filters,
        fields=[
            "name", "budget_reference_id", "budget_reference_name",
            "partner_id", "partner_name", "grant_id", "state",
            "financial_year", "month", "date", "total_utilisation",
            "balance_amount", "interest_from_bank",
        ],
        order_by="date desc",
    )

    if not parent_docs:
        return {}

    parent_names = [d.name for d in parent_docs]

    child_rows = frappe.get_all(
        "Utilisation Items",
        filters={"parent": ["in", parent_names], "parenttype": "Creche utilisation"},
        fields=[
            "parent", "type_of_expenses_id", "type_of_expenses",
            "budget_main_head", "budget_sub_head", "total_amount",
        ],
    )

    parent_items: dict = defaultdict(list)
    for row in child_rows:
        parent_items[row.parent].append({
            "type_of_expenses_id": row.type_of_expenses_id,
            "type_of_expenses": row.type_of_expenses,
            "budget_main_head": row.budget_main_head,
            "budget_sub_head": row.budget_sub_head,
            "total_amount": row.total_amount or 0,
        })

    all_items: list = []
    for items in parent_items.values():
        all_items.extend(items)

    overview = {
        "total_records": len(parent_docs),
        "total_utilisation": sum(d.total_utilisation or 0 for d in parent_docs),
        "total_balance_amount": sum(d.balance_amount or 0 for d in parent_docs),
        "total_interest_from_bank": sum(d.interest_from_bank or 0 for d in parent_docs),
        "expense_items": get_expense_summary(all_items),
    }

    partner_summary: dict = {}
    for doc in parent_docs:
        partner_key = doc.partner_id
        if partner_key not in partner_summary:
            partner_summary[partner_key] = {
                "partner_id": doc.partner_id,
                "partner_name": doc.partner_name,
                "total_records": 0, "total_utilisation": 0,
                "total_balance_amount": 0, "total_interest_from_bank": 0,
                "expense_items": [], "budgets": {}, "_items": [],
            }
        partner = partner_summary[partner_key]
        partner["total_records"] += 1
        partner["total_utilisation"] += doc.total_utilisation or 0
        partner["total_balance_amount"] += doc.balance_amount or 0
        partner["total_interest_from_bank"] += doc.interest_from_bank or 0
        partner["_items"].extend(parent_items.get(doc.name, []))

        budget_key = doc.budget_reference_id
        if budget_key not in partner["budgets"]:
            partner["budgets"][budget_key] = {
                "budget_reference_id": doc.budget_reference_id,
                "budget_reference_name": doc.budget_reference_name,
                "grant_id": doc.grant_id, "state": doc.state,
                "financial_year": doc.financial_year,
                "total_records": 0, "total_utilisation": 0,
                "total_balance_amount": 0, "total_interest_from_bank": 0,
                "expense_items": [], "months": [], "_items": [],
            }
        budget = partner["budgets"][budget_key]
        budget["total_records"] += 1
        budget["total_utilisation"] += doc.total_utilisation or 0
        budget["total_balance_amount"] += doc.balance_amount or 0
        budget["total_interest_from_bank"] += doc.interest_from_bank or 0
        budget["_items"].extend(parent_items.get(doc.name, []))
        budget["months"].append({
            "name": doc.name, "month": doc.month, "date": doc.date,
            "total_utilisation": doc.total_utilisation,
            "balance_amount": doc.balance_amount,
            "interest_from_bank": doc.interest_from_bank,
            "expense_items": get_expense_summary(parent_items.get(doc.name, [])),
            "utilisation_items": parent_items.get(doc.name, []),
        })

    final_partners = []
    for partner in partner_summary.values():
        partner["expense_items"] = get_expense_summary(partner["_items"])
        del partner["_items"]
        budgets = []
        for budget in partner["budgets"].values():
            budget["expense_items"] = get_expense_summary(budget["_items"])
            del budget["_items"]
            budgets.append(budget)
        partner["budgets"] = budgets
        final_partners.append(partner)

    return {"overview": overview, "partners": final_partners}

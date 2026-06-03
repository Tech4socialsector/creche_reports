
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



# import frappe
# import json
# from collections import defaultdict


# # ─────────────────────────────────────────────────────────────────────────────
# #  HELPERS
# # ─────────────────────────────────────────────────────────────────────────────

# def _p(s):
#     try:
#         return json.loads(s or '{}')
#     except Exception:
#         return {}


# def _inr(v):
#     try:
#         return '₹{:,.0f}'.format(float(v or 0))
#     except Exception:
#         return '₹0'


# def _pct(part, whole):
#     try:
#         return round(float(part or 0) / float(whole) * 100, 1) if whole else 0.0
#     except Exception:
#         return 0.0


# def _list_filter(val):
#     """Return frappe filter: ['in', [...]] for list, scalar for single value."""
#     if isinstance(val, list) and len(val) == 1:
#         return val[0]
#     if isinstance(val, list):
#         return ['in', val]
#     return val


# def _budget_filters(f):
#     out = {}
#     if f.get('financial_year'):
#         out['financial_year'] = f['financial_year']
#     for k in ('partner_id', 'grant_id', 'state', 'district', 'block'):
#         if f.get(k):
#             out[k] = _list_filter(f[k])
#     return out


# def _util_filters(f):
#     out = {}
#     if f.get('financial_year'):
#         out['financial_year'] = f['financial_year']
#     if f.get('month'):
#         out['month'] = _list_filter(f['month'])
#     for k in ('partner_id', 'grant_id', 'state', 'district', 'block'):
#         if f.get(k):
#             out[k] = _list_filter(f[k])
#     return out


# def _disb_filters(f):
#     out = {}
#     if f.get('financial_year'):
#         out['financial_year'] = f['financial_year']
#     for k in ('partner_id', 'grant_id', 'state', 'district', 'block'):
#         if f.get(k):
#             out[k] = _list_filter(f[k])
#     return out


# def _get_expense_map(ids):
#     """
#     Resolve Budget and Expense items list records by name.
#     Returns dict: name → {type_of_expenses, budget_main_head, budget_sub_head}
#     Falls back to fetching ALL records if filter returns nothing.
#     """
#     if not ids:
#         return {}
#     docs = frappe.db.get_list(
#         'Budget and Expense items list',
#         filters={'name': ['in', list(ids)]},
#         fields=['name', 'type_of_expenses', 'budget_main_head', 'budget_sub_head'],
#         limit=0,
#     )
#     if docs:
#         return {d['name']: d for d in docs}
#     # Fallback: load all (needed when naming differs from stored id)
#     all_docs = frappe.db.get_list(
#         'Budget and Expense items list',
#         fields=['name', 'type_of_expenses', 'budget_main_head', 'budget_sub_head'],
#         limit=0,
#     )
#     return {d['name']: d for d in all_docs}


# def _enrich_items(items, exp_map):
#     """
#     Fill type_of_expenses / budget_main_head / budget_sub_head from exp_map.
#     Modifies items in-place.
#     """
#     for item in items:
#         eid = item.get('type_of_expenses_id') or ''
#         rec = exp_map.get(eid) or {}

#         if not item.get('type_of_expenses'):
#             item['type_of_expenses'] = (
#                 rec.get('type_of_expenses') or
#                 item.get('type_of_expenses') or
#                 eid or 'Unknown'
#             )
#         if not item.get('budget_main_head'):
#             item['budget_main_head'] = rec.get('budget_main_head') or 'Other'
#         if not item.get('budget_sub_head'):
#             item['budget_sub_head'] = rec.get('budget_sub_head') or 'General'
#     return items


# def _group_items(items, main_f, sub_f, name_f, amt_f, palette):
#     """
#     Group flat rows into:
#       [{label, color, total, subs:[{label, items:[{name, amount}]}]}]
#     """
#     main_order = []
#     main_map = {}

#     for item in items:
#         main = item.get(main_f) or 'Other'
#         sub  = item.get(sub_f)  or 'General'
#         name = item.get(name_f) or item.get('type_of_expenses_id') or ''
#         amt  = float(item.get(amt_f) or 0)

#         if main not in main_map:
#             main_map[main] = {'sub_order': [], 'sub_map': {}}
#             main_order.append(main)
#         if sub not in main_map[main]['sub_map']:
#             main_map[main]['sub_map'][sub] = []
#             main_map[main]['sub_order'].append(sub)
#         main_map[main]['sub_map'][sub].append({'name': name, 'amount': amt})

#     groups = []
#     for ci, main in enumerate(main_order):
#         subs = [
#             {'label': sub, 'items': main_map[main]['sub_map'][sub]}
#             for sub in main_map[main]['sub_order']
#         ]
#         total = sum(i['amount'] for s in subs for i in s['items'])
#         groups.append({
#             'label': main,
#             'color': palette[ci % len(palette)],
#             'total': total,
#             'subs':  subs,
#         })
#     return groups


# # ─────────────────────────────────────────────────────────────────────────────
# #  1. FILTER OPTIONS
# # ─────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_filter_options(financial_year=None):
#     """
#     Returns dropdown options for all filter controls.
#     financial_year: optional string to scope partner/state/district/block lists.
#     """
#     bf = {'financial_year': financial_year} if financial_year else {}

#     # Financial years — from all Creche Budget records
#     all_fy = frappe.db.get_list(
#         'Creche Budget', fields=['financial_year'], limit=0,
#     )
#     fy_list = sorted(
#         {r['financial_year'] for r in all_fy if r.get('financial_year')},
#         reverse=True,
#     )

#     # Months — distinct values used in Creche utilisation
#     month_order = [
#         'April', 'May', 'June', 'July', 'August', 'September',
#         'October', 'November', 'December', 'January', 'February', 'March',
#     ]
#     used_months_docs = frappe.db.get_list(
#         'Creche utilisation', fields=['month'], limit=0,
#     )
#     used_months = sorted(
#         {r['month'] for r in used_months_docs if r.get('month')},
#         key=lambda m: month_order.index(m) if m in month_order else 99,
#     )

#     # Partners, grant IDs, states, districts, blocks — from Creche Budget
#     budgets = frappe.db.get_list(
#         'Creche Budget', filters=bf,
#         fields=['partner_id', 'partner_name', 'grant_id',
#                 'state', 'district', 'block'],
#         limit=0,
#     )

#     # Deduplicate partners preserving label
#     partner_map = {}
#     for b in budgets:
#         pid = b.get('partner_id') or ''
#         if pid and pid not in partner_map:
#             partner_map[pid] = b.get('partner_name') or pid

#     def opts(values):
#         return [{'value': v, 'label': v, 'description': ''} for v in sorted(values) if v]

#     return {
#         'financial_years': fy_list,
#         'months':   [{'value': m, 'label': m, 'description': ''} for m in used_months],
#         'partners': [{'value': k, 'label': v, 'description': ''} for k, v in sorted(partner_map.items())],
#         'grant_ids': opts({b['grant_id'] for b in budgets if b.get('grant_id')}),
#         'states':    opts({b['state']    for b in budgets if b.get('state')}),
#         'districts': opts({b['district'] for b in budgets if b.get('district')}),
#         'blocks':    opts({b['block']    for b in budgets if b.get('block')}),
#     }


# # ─────────────────────────────────────────────────────────────────────────────
# #  2. DASHBOARD DATA  (summary strip + 6 cards)
# # ─────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_dashboard_data(filters='{}'):
#     f  = _p(filters)
#     bf = _budget_filters(f)
#     uf = _util_filters(f)
#     df = _disb_filters(f)

#     # ── Creche Budget ──────────────────────────────────────────────────────────
#     budgets = frappe.db.get_list(
#         'Creche Budget', filters=bf,
#         fields=['partner_id', 'state', 'district', 'block',
#                 'no_of_creches', 'total_budget'],
#         limit=0,
#     )
#     total_budget = sum(float(b.get('total_budget') or 0) for b in budgets)

#     # ── Creche utilisation ─────────────────────────────────────────────────────
#     util_docs = frappe.db.get_list(
#         'Creche utilisation', filters=uf,
#         fields=['total_utilisation', 'balance_amount', 'interest_from_bank'],
#         limit=0,
#     )
#     total_util   = sum(float(u.get('total_utilisation') or 0) for u in util_docs)
#     # balance_amount = "Bank + Cash Balance at end of month"
#     # interest_from_bank = separate interest field
#     total_bank   = sum(
#         float(u.get('balance_amount') or 0) + float(u.get('interest_from_bank') or 0)
#         for u in util_docs
#     )

#     # ── Creche Disbursement ────────────────────────────────────────────────────
#     # total_disbursement is a stored computed field — use directly
#     disb_docs = frappe.db.get_list(
#         'Creche Disbursement', filters=df,
#         fields=['total_disbursement'],
#         limit=0,
#     )
#     total_disbursed = sum(float(d.get('total_disbursement') or 0) for d in disb_docs)

#     return {
#         'summary': {
#             'partners':  len({b['partner_id'] for b in budgets if b.get('partner_id')}),
#             'states':    len({b['state']      for b in budgets if b.get('state')}),
#             'districts': len({b['district']   for b in budgets if b.get('district')}),
#             'blocks':    len({b['block']      for b in budgets if b.get('block')}),
#             'creches':   sum(int(b.get('no_of_creches') or 0) for b in budgets),
#         },
#         'cards': {
#             'budget':         {'value': total_budget,               'pct': None},
#             'utilisation':    {'value': total_util,                 'pct': _pct(total_util, total_budget)},
#             'disbursed':      {'value': total_disbursed,            'pct': _pct(total_disbursed, total_budget)},
#             'budget_balance': {'value': total_budget - total_util,  'pct': None},
#             'bank_balance':   {'value': total_bank,                 'pct': None},
#             'balance_amount': {'value': total_budget - total_disbursed, 'pct': None},
#         },
#     }


# # ─────────────────────────────────────────────────────────────────────────────
# #  3. DRILL-DOWN DATA
# # ─────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_drill_data(drill_key, filters='{}'):
#     f  = _p(filters)
#     bf = _budget_filters(f)
#     uf = _util_filters(f)
#     df = _disb_filters(f)

#     # ── partners ────────────────────────────────────────────────────────────────
#     if drill_key == 'partners':
#         rows_raw = frappe.db.get_list(
#             'Creche Budget', filters=bf,
#             fields=['partner_id', 'partner_name', 'grant_id',
#                     'state', 'district', 'block', 'no_of_creches', 'total_budget'],
#             limit=0,
#         )
#         pm = {}
#         for b in rows_raw:
#             pid = b.get('partner_id') or ''
#             if pid not in pm:
#                 pm[pid] = {
#                     'name': b.get('partner_name') or pid,
#                     'grant_id': b.get('grant_id'), 'state': b.get('state'),
#                     'district': b.get('district'), 'block': b.get('block'),
#                     'creches': 0, 'budget': 0,
#                 }
#             pm[pid]['creches'] += int(b.get('no_of_creches') or 0)
#             pm[pid]['budget']  += float(b.get('total_budget') or 0)
#         rows = [[v['name'], pid, v['grant_id'], v['state'], v['district'],
#                  v['block'], v['creches'], _inr(v['budget'])]
#                 for pid, v in pm.items()]
#         tc = sum(v['creches'] for v in pm.values())
#         tb = sum(v['budget']  for v in pm.values())
#         return {
#             'heads':  ['#', 'Partner name', 'Partner ID', 'Grant ID',
#                        'State', 'District', 'Block', 'Crèches', 'Total budget'],
#             'rows':   rows,
#             'totals': ['Total', None, None, None, None, None, tc, _inr(tb)],
#         }

#     # ── states ──────────────────────────────────────────────────────────────────
#     if drill_key == 'states':
#         rows_raw = frappe.db.get_list(
#             'Creche Budget', filters=bf,
#             fields=['state', 'partner_id', 'district', 'no_of_creches', 'total_budget'],
#             limit=0,
#         )
#         sm = defaultdict(lambda: {'partners': set(), 'districts': set(), 'creches': 0, 'budget': 0})
#         for b in rows_raw:
#             s = b.get('state') or 'Unknown'
#             sm[s]['partners'].add(b.get('partner_id'))
#             sm[s]['districts'].add(b.get('district'))
#             sm[s]['creches'] += int(b.get('no_of_creches') or 0)
#             sm[s]['budget']  += float(b.get('total_budget') or 0)
#         rows = [[s, len(v['partners']), v['creches'], len(v['districts']), _inr(v['budget'])]
#                 for s, v in sm.items()]
#         return {
#             'heads':  ['#', 'State', 'Partners', 'Crèches', 'Districts', 'Total budget'],
#             'rows':   rows,
#             'totals': ['Total', None,
#                        sum(v['creches'] for v in sm.values()), None,
#                        _inr(sum(v['budget'] for v in sm.values()))],
#         }

#     # ── districts ────────────────────────────────────────────────────────────────
#     if drill_key == 'districts':
#         rows_raw = frappe.db.get_list(
#             'Creche Budget', filters=bf,
#             fields=['district', 'state', 'partner_name', 'block', 'no_of_creches'],
#             limit=0,
#         )
#         rows = [[b.get('district'), b.get('state'), b.get('partner_name'),
#                  b.get('block'), b.get('no_of_creches')] for b in rows_raw]
#         return {
#             'heads':  ['#', 'District', 'State', 'Partner', 'Block', 'Crèches'],
#             'rows':   rows,
#             'totals': ['Total', None, None, None,
#                        sum(int(b.get('no_of_creches') or 0) for b in rows_raw)],
#         }

#     # ── blocks ───────────────────────────────────────────────────────────────────
#     if drill_key == 'blocks':
#         rows_raw = frappe.db.get_list(
#             'Creche Budget', filters=bf,
#             fields=['block', 'district', 'state', 'partner_name', 'no_of_creches'],
#             limit=0,
#         )
#         rows = [[b.get('block'), b.get('district'), b.get('state'),
#                  b.get('partner_name'), b.get('no_of_creches')] for b in rows_raw]
#         return {
#             'heads':  ['#', 'Block', 'District', 'State', 'Partner', 'Crèches'],
#             'rows':   rows,
#             'totals': ['Total', None, None, None,
#                        sum(int(b.get('no_of_creches') or 0) for b in rows_raw)],
#         }

#     # ── creches ──────────────────────────────────────────────────────────────────
#     if drill_key == 'creches':
#         rows_raw = frappe.db.get_list(
#             'Creche Budget', filters=bf,
#             fields=['partner_name', 'state', 'district', 'block',
#                     'grant_id', 'financial_year', 'no_of_creches'],
#             limit=0,
#         )
#         rows = [[b.get('partner_name'), b.get('state'), b.get('district'), b.get('block'),
#                  b.get('grant_id'), b.get('financial_year'), b.get('no_of_creches')]
#                 for b in rows_raw]
#         return {
#             'heads':  ['#', 'Partner', 'State', 'District', 'Block',
#                        'Grant ID', 'Financial year', 'Crèches'],
#             'rows':   rows,
#             'totals': ['Total', None, None, None, None, None,
#                        sum(int(b.get('no_of_creches') or 0) for b in rows_raw)],
#         }

#     # ── budget ───────────────────────────────────────────────────────────────────
#     # budget_reference_name = partner's display name (Data field on Creche Budget)
#     # name = actual docname e.g. BGD-0001  → used as _ref for child item lookup
#     if drill_key == 'budget':
#         rows_raw = frappe.db.get_list(
#             'Creche Budget', filters=bf,
#             fields=['name', 'partner_name', 'grant_id', 'budget_reference_name',
#                     'financial_year', 'no_of_creches', 'total_budget', 'state'],
#             limit=0,
#         )
#         rows = [[
#             b.get('partner_name'),
#             b.get('grant_id'),
#             b.get('budget_reference_name') or b.get('name'),
#             b.get('financial_year'),
#             b.get('no_of_creches'),
#             _inr(b.get('total_budget')),
#             b.get('state'),
#             b.get('name'),      # _ref — hidden, used by view button for child lookup
#         ] for b in rows_raw]
#         tc = sum(int(b.get('no_of_creches') or 0) for b in rows_raw)
#         tb = sum(float(b.get('total_budget') or 0) for b in rows_raw)
#         return {
#             'heads':  ['#', 'Partner name', 'Grant ID', 'Budget ref.',
#                        'Financial year', 'Crèches', 'Total budget', 'State', '_ref'],
#             'rows':   rows,
#             'totals': ['Total', None, None, None, tc, _inr(tb), None, None],
#         }

#     # ── utilisation ─────────────────────────────────────────────────────────────
#     # Shows parent-level fields. name = actual doc name → _ref for child lookup.
#     # partner_name & grant_id are fetched from budget_reference_id.
#     # balance_amount = "Bank + Cash Balance at end of month"
#     if drill_key == 'utilisation':
#         rows_raw = frappe.db.get_list(
#             'Creche utilisation', filters=uf,
#             fields=['name', 'partner_id', 'partner_name', 'grant_id',
#                     'budget_reference_name', 'month', 'financial_year',
#                     'state', 'district', 'block', 'no_of_creches',
#                     'total_utilisation', 'balance_amount', 'interest_from_bank'],
#             limit=0,
#         )
#         rows = [[
#             u.get('partner_name') or u.get('partner_id'),
#             u.get('month'),
#             u.get('financial_year'),
#             u.get('state'),
#             u.get('district'),
#             u.get('block'),
#             _inr(u.get('total_utilisation')),
#             _inr(u.get('balance_amount')) if float(u.get('balance_amount') or 0) > 0 else '—',
#             u.get('name'),      # _ref
#         ] for u in rows_raw]
#         tt = sum(float(u.get('total_utilisation') or 0) for u in rows_raw)
#         return {
#             'heads':  ['#', 'Partner', 'Month', 'Financial year',
#                        'State', 'District', 'Block',
#                        'Total utilisation', 'Bank balance', '_ref'],
#             'rows':   rows,
#             'totals': ['Total', None, None, None, None, None, _inr(tt), None, None],
#         }

#     # ── disbursed ────────────────────────────────────────────────────────────────
#     # Child table fieldname: disbursement  (Disbursement Tracker)
#     # Tracker fields: date_of_disbursement, disbursed_amount
#     if drill_key == 'disbursed':
#         disb_docs = frappe.db.get_list(
#             'Creche Disbursement', filters=df,
#             fields=['name', 'partner_id', 'partner_name', 'grant_id',
#                     'budget_reference_name', 'budget_reference_id',
#                     'total_disbursement'],
#             limit=0,
#         )
#         disb_names = [d['name'] for d in disb_docs]
#         tracker = frappe.db.get_list(
#             'Disbursement Tracker',
#             filters={'parent': ['in', disb_names]} if disb_names else {'parent': 'NONE'},
#             fields=['parent', 'date_of_disbursement', 'disbursed_amount'],
#             order_by='date_of_disbursement asc',
#             limit=0,
#         ) if disb_names else []

#         parent_map = {d['name']: d for d in disb_docs}
#         cum = defaultdict(float)
#         rows = []
#         for t in tracker:
#             p   = parent_map.get(t.get('parent'), {})
#             amt = float(t.get('disbursed_amount') or 0)
#             pid = t.get('parent')
#             cum[pid] += amt
#             rows.append([
#                 p.get('partner_name') or p.get('partner_id'),
#                 p.get('grant_id'),
#                 p.get('budget_reference_name') or p.get('budget_reference_id'),
#                 frappe.utils.formatdate(t.get('date_of_disbursement')),
#                 _inr(amt),
#                 _inr(cum[pid]),
#             ])
#         total_disb = sum(float(d.get('total_disbursement') or 0) for d in disb_docs)
#         return {
#             'heads':  ['#', 'Partner name', 'Grant ID', 'Budget ref.',
#                        'Date', 'Disbursed amount', 'Cumulative total'],
#             'rows':   rows,
#             'totals': ['Total', None, None, None, _inr(total_disb), None],
#         }

#     # ── budget_balance ───────────────────────────────────────────────────────────
#     if drill_key == 'budget_balance':
#         budgets = frappe.db.get_list(
#             'Creche Budget', filters=bf,
#             fields=['name', 'partner_name', 'grant_id', 'total_budget'],
#             limit=0,
#         )
#         bnames = [b['name'] for b in budgets]
#         util_docs = frappe.db.get_list(
#             'Creche utilisation',
#             filters={'budget_reference_id': ['in', bnames]} if bnames else {'name': 'NONE'},
#             fields=['budget_reference_id', 'total_utilisation'],
#             limit=0,
#         ) if bnames else []
#         util_by = defaultdict(float)
#         for u in util_docs:
#             util_by[u['budget_reference_id']] += float(u.get('total_utilisation') or 0)
#         rows = []
#         for b in budgets:
#             bv  = float(b.get('total_budget') or 0)
#             uv  = util_by.get(b['name'], 0.0)
#             pct = '{}%'.format(round(uv / bv * 100, 1)) if bv else '0%'
#             rows.append([b.get('partner_name'), b.get('grant_id'),
#                          _inr(bv), _inr(uv), _inr(bv - uv), pct])
#         tb = sum(float(b.get('total_budget') or 0) for b in budgets)
#         tu = sum(util_by.values())
#         return {
#             'heads':  ['#', 'Partner name', 'Grant ID',
#                        'Total budget', 'Total utilised', 'Balance', '% used'],
#             'rows':   rows,
#             'totals': ['Total', None, _inr(tb), _inr(tu), _inr(tb - tu), None],
#         }

#     # ── bank_balance ─────────────────────────────────────────────────────────────
#     # balance_amount = "Bank + Cash Balance at end of month"
#     if drill_key == 'bank_balance':
#         rows_raw = frappe.db.get_list(
#             'Creche utilisation', filters=uf,
#             fields=['partner_name', 'partner_id', 'grant_id', 'month',
#                     'financial_year', 'balance_amount', 'interest_from_bank'],
#             limit=0,
#         )
#         rows = [[
#             u.get('partner_name') or u.get('partner_id'),
#             u.get('grant_id'),
#             u.get('month'),
#             u.get('financial_year'),
#             _inr(u.get('balance_amount')),
#             _inr(u.get('interest_from_bank')),
#         ] for u in rows_raw if float(u.get('balance_amount') or 0) > 0]
#         tb = sum(float(u.get('balance_amount') or 0) for u in rows_raw)
#         ti = sum(float(u.get('interest_from_bank') or 0) for u in rows_raw)
#         return {
#             'heads':  ['#', 'Partner name', 'Grant ID', 'Month',
#                        'Financial year', 'Bank + cash balance', 'Interest from bank'],
#             'rows':   rows,
#             'totals': ['Total', None, None, None, _inr(tb), _inr(ti)],
#         }

#     # ── balance_amount ───────────────────────────────────────────────────────────
#     # balence_budget = stored computed field (typo in doctype preserved)
#     if drill_key == 'balance_amount':
#         rows_raw = frappe.db.get_list(
#             'Creche Disbursement', filters=df,
#             fields=['partner_id', 'partner_name', 'grant_id',
#                     'budget_reference_name', 'budget_reference_id',
#                     'total_budget', 'total_disbursement', 'balence_budget'],
#             limit=0,
#         )
#         rows = [[
#             r.get('partner_name') or r.get('partner_id'),
#             r.get('grant_id'),
#             r.get('budget_reference_name') or r.get('budget_reference_id'),
#             _inr(r.get('total_budget')),
#             _inr(r.get('total_disbursement')),
#             _inr(r.get('balence_budget')),
#         ] for r in rows_raw]
#         tb = sum(float(r.get('total_budget') or 0) for r in rows_raw)
#         td = sum(float(r.get('total_disbursement') or 0) for r in rows_raw)
#         return {
#             'heads':  ['#', 'Partner name', 'Grant ID', 'Budget ref.',
#                        'Total budget', 'Total disbursed', 'Balance available'],
#             'rows':   rows,
#             'totals': ['Total', None, None, _inr(tb), _inr(td), _inr(tb - td)],
#         }

#     return {'heads': [], 'rows': [], 'totals': []}


# # ─────────────────────────────────────────────────────────────────────────────
# #  4. LINE ITEMS  (slide panel — child table rows)
# # ─────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_line_items(doctype_key, parent_name):
#     """
#     Returns groups for the slide panel.
#     doctype_key: 'budget' | 'utilisation' | 'disbursement'
#     parent_name: the Frappe name of the parent doc (e.g. BGD-0001, CUT-0001)
#     """
#     PALETTE = [
#         '#1a4f8a', '#f59e0b', '#10b981', '#7c3aed',
#         '#ef4444', '#ec4899', '#0891b2', '#d97706',
#     ]

#     # ── Budget Items (child of Creche Budget via budget_items_list) ─────────────
#     if doctype_key == 'budget':
#         logger = frappe.logger('dashboard', allow_site=True)
#         logger.info(f'[LINE_ITEMS] budget parent_name={parent_name}')

#         # DB raw — what's actually stored in columns
#         db_rows = frappe.db.get_list(
#             'Budget Items',
#             filters={'parent': parent_name},
#             fields=['name', 'idx', 'type_of_expenses_id', 'type_of_expenses',
#                     'budget_main_head', 'budget_sub_head',
#                     'year_1', 'year_2', 'year_3', 'total_amount'],
#             order_by='idx asc', limit=0,
#         )
#         logger.info(f'[LINE_ITEMS] DB rows count={len(db_rows)}')
#         for row in db_rows:
#             logger.info(f'[LINE_ITEMS] DB row: idx={row.get("idx")} '
#                         f'eid={row.get("type_of_expenses_id")} '
#                         f'texp={row.get("type_of_expenses")} '
#                         f'main={row.get("budget_main_head")} '
#                         f'sub={row.get("budget_sub_head")} '
#                         f'total_amount={row.get("total_amount")} '
#                         f'y1={row.get("year_1")} y2={row.get("year_2")} y3={row.get("year_3")}')

#         # Use frappe.get_doc so all fetched fields are computed on the doc object
#         try:
#             doc = frappe.get_doc('Creche Budget', parent_name)
#         except frappe.DoesNotExistError:
#             logger.info(f'[LINE_ITEMS] Creche Budget {parent_name} not found')
#             return []

#         raw_items = doc.get('budget_items_list') or []
#         logger.info(f'[LINE_ITEMS] get_doc items count={len(raw_items)}')
#         for r in raw_items:
#             logger.info(f'[LINE_ITEMS] DOC row: idx={r.idx} '
#                         f'eid={r.type_of_expenses_id} '
#                         f'texp={r.type_of_expenses} '
#                         f'main={r.budget_main_head} '
#                         f'sub={r.budget_sub_head} '
#                         f'total_amount={r.total_amount} '
#                         f'y1={r.year_1} y2={r.year_2} y3={r.year_3}')

#         if not raw_items:
#             return []

#         # Build enrichment map from Budget and Expense items list
#         all_ids = {r.type_of_expenses_id for r in raw_items if r.type_of_expenses_id}
#         logger.info(f'[LINE_ITEMS] type_of_expenses_ids={all_ids}')

#         exp_map = _get_expense_map(all_ids)
#         logger.info(f'[LINE_ITEMS] exp_map keys={list(exp_map.keys())}')

#         items = []
#         for r in raw_items:
#             eid = r.type_of_expenses_id or ''
#             rec = exp_map.get(eid) or {}

#             texp = r.type_of_expenses or rec.get('type_of_expenses') or eid or 'Unknown'
#             main = r.budget_main_head or rec.get('budget_main_head') or 'Other'
#             sub  = r.budget_sub_head  or rec.get('budget_sub_head')  or 'General'

#             amt = float(r.total_amount or 0)
#             if amt == 0:
#                 amt = float(r.year_1 or 0) + float(r.year_2 or 0) + float(r.year_3 or 0)

#             logger.info(f'[LINE_ITEMS] resolved: texp={texp} main={main} sub={sub} amt={amt}')
#             items.append({
#                 'type_of_expenses': texp,
#                 'budget_main_head': main,
#                 'budget_sub_head':  sub,
#                 'total_amount':     amt,
#             })

#         return _group_items(
#             items, 'budget_main_head', 'budget_sub_head',
#             'type_of_expenses', 'total_amount', PALETTE,
#         )

#     # ── Utilisation Items (child of Creche utilisation via utilisation_items_list) ─
#     if doctype_key == 'utilisation':
#         try:
#             doc = frappe.get_doc('Creche utilisation', parent_name)
#         except frappe.DoesNotExistError:
#             return []

#         raw_items = doc.get('utilisation_items_list') or []
#         if not raw_items:
#             return []

#         all_ids = {r.type_of_expenses_id for r in raw_items if r.type_of_expenses_id}
#         exp_map = _get_expense_map(all_ids)

#         items = []
#         for r in raw_items:
#             eid = r.type_of_expenses_id or ''
#             rec = exp_map.get(eid) or {}

#             texp = r.type_of_expenses or rec.get('type_of_expenses') or eid or 'Unknown'
#             main = r.budget_main_head or rec.get('budget_main_head') or 'Other'
#             sub  = r.budget_sub_head  or rec.get('budget_sub_head')  or 'General'
#             amt  = float(r.total_amount or 0)

#             items.append({
#                 'type_of_expenses': texp,
#                 'budget_main_head': main,
#                 'budget_sub_head':  sub,
#                 'total_amount':     amt,
#             })

#         return _group_items(
#             items, 'budget_main_head', 'budget_sub_head',
#             'type_of_expenses', 'total_amount', PALETTE,
#         )

#     # ── Disbursement Tracker (child of Creche Disbursement via disbursement) ─────
#     if doctype_key == 'disbursement':
#         items = frappe.db.get_list(
#             'Disbursement Tracker',
#             filters={'parent': parent_name},
#             fields=['date_of_disbursement', 'disbursed_amount'],
#             order_by='date_of_disbursement asc',
#             limit=0,
#         )
#         if not items:
#             return []
#         line_items = [
#             {
#                 'name':   frappe.utils.formatdate(i.get('date_of_disbursement')),
#                 'amount': float(i.get('disbursed_amount') or 0),
#             }
#             for i in items
#         ]
#         total = sum(x['amount'] for x in line_items)
#         return [{
#             'label': 'Disbursements',
#             'color': '#1a4f8a',
#             'total': total,
#             'subs':  [{'label': 'Payment history', 'items': line_items}],
#         }]

#     return []


# # ─────────────────────────────────────────────────────────────────────────────
# #  5. DEBUG ENDPOINT  (remove after confirming data)
# # ─────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def debug_line_items(parent_name):
#     """
#     Direct DB inspection — bypasses all ORM to show raw values.
#     """
#     import frappe.db as fdb

#     # 1. Raw DB columns from tabBudget Items
#     budget_raw = frappe.db.sql("""
#         SELECT name, idx, parent,
#                type_of_expenses_id,
#                type_of_expenses,
#                budget_main_head,
#                budget_sub_head,
#                year_1, year_2, year_3,
#                total_amount
#         FROM `tabBudget Items`
#         WHERE parent = %(parent)s
#         ORDER BY idx
#     """, {'parent': parent_name}, as_dict=True)

#     # 2. Raw DB columns from tabUtilisation Items
#     util_raw = frappe.db.sql("""
#         SELECT name, idx, parent,
#                type_of_expenses_id,
#                type_of_expenses,
#                budget_main_head,
#                budget_sub_head,
#                total_amount
#         FROM `tabUtilisation Items`
#         WHERE parent = %(parent)s
#         ORDER BY idx
#     """, {'parent': parent_name}, as_dict=True)

#     # 3. All columns in Budget and Expense items list
#     expense_master = frappe.db.sql("""
#         SELECT * FROM `tabBudget and Expense items list` LIMIT 5
#     """, as_dict=True)

#     # 4. Check if type_of_expenses_id values exist in master
#     all_ids = list({r.get('type_of_expenses_id') for r in (budget_raw + util_raw) if r.get('type_of_expenses_id')})
#     matched = []
#     if all_ids:
#         matched = frappe.db.sql("""
#             SELECT * FROM `tabBudget and Expense items list`
#             WHERE name IN %(ids)s
#         """, {'ids': all_ids}, as_dict=True)

#     return {
#         'parent_name': parent_name,
#         'budget_items_raw_db': budget_raw,
#         'util_items_raw_db': util_raw,
#         'expense_master_first_5': expense_master,
#         'type_of_expenses_ids_found': all_ids,
#         'matched_in_master': matched,
#     }


# @frappe.whitelist()
# def debug_line_items_old(parent_name):
#     """
#     Inspect child rows via frappe.get_doc (shows resolved fetched fields).
#     Usage in browser console:
#       frappe.call({
#         method: 'creche_reports.api.dashboard.debug_line_items',
#         args: { parent_name: 'BGD-0001' },
#         callback(r) { console.log(r.message); }
#       })
#     """
#     result = {'parent_name': parent_name}

#     # Try as Creche Budget
#     try:
#         doc = frappe.get_doc('Creche Budget', parent_name)
#         raw = doc.get('budget_items_list') or []
#         result['doctype'] = 'Creche Budget'
#         result['budget_items_via_get_doc'] = [
#             {
#                 'idx': r.idx,
#                 'type_of_expenses_id': r.type_of_expenses_id,
#                 'type_of_expenses':    r.type_of_expenses,
#                 'budget_main_head':    r.budget_main_head,
#                 'budget_sub_head':     r.budget_sub_head,
#                 'year_1': r.year_1, 'year_2': r.year_2, 'year_3': r.year_3,
#                 'total_amount': r.total_amount,
#             }
#             for r in raw
#         ]
#     except frappe.DoesNotExistError:
#         result['budget_doc'] = 'not found'

#     # Try as Creche utilisation
#     try:
#         udoc = frappe.get_doc('Creche utilisation', parent_name)
#         uraw = udoc.get('utilisation_items_list') or []
#         result['util_items_via_get_doc'] = [
#             {
#                 'idx': r.idx,
#                 'type_of_expenses_id': r.type_of_expenses_id,
#                 'type_of_expenses':    r.type_of_expenses,
#                 'budget_main_head':    r.budget_main_head,
#                 'budget_sub_head':     r.budget_sub_head,
#                 'total_amount':        r.total_amount,
#             }
#             for r in uraw
#         ]
#     except frappe.DoesNotExistError:
#         result['util_doc'] = 'not found'

#     # DB raw comparison
#     result['budget_items_db'] = frappe.db.get_list(
#         'Budget Items',
#         filters={'parent': parent_name},
#         fields=['name', 'idx', 'type_of_expenses_id', 'type_of_expenses',
#                 'budget_main_head', 'budget_sub_head',
#                 'year_1', 'year_2', 'year_3', 'total_amount'],
#         order_by='idx asc', limit=0,
#     )

#     # Expense master sample
#     result['expense_master_sample'] = frappe.db.get_list(
#         'Budget and Expense items list',
#         fields=['name', 'type_of_expenses', 'budget_main_head', 'budget_sub_head'],
#         limit=10,
#     )

#     all_ids = list({
#         i.get('type_of_expenses_id')
#         for i in result.get('budget_items_db', [])
#         if i.get('type_of_expenses_id')
#     })
#     result['type_of_expenses_ids'] = all_ids

#     if all_ids:
#         result['matched_from_master'] = frappe.db.get_list(
#             'Budget and Expense items list',
#             filters={'name': ['in', all_ids]},
#             fields=['name', 'type_of_expenses', 'budget_main_head', 'budget_sub_head'],
#             limit=0,
#         )

#     return result
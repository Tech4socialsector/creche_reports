import frappe
from frappe import _
from collections import OrderedDict

# Labels shown in the Excel filter summary header
_FILTER_LABELS = {
	"partner_id":       "Partner",
	"budget_reference": "Budget Reference",
	"financial_year":   "Financial Year",
	"grant_id":         "Grant ID",
	"state":            "State",
	"district":         "District",
	"block":            "Block",
	"start_date":       "Start Date",
	"end_date":         "End Date",
}


def execute(filters=None):
	filters = filters or {}
	return get_columns(), get_data(filters)


def get_columns():
	return [
		{"label": _("Partner / Budget"), "fieldname": "row_name",             "fieldtype": "Data",     "width": 260},
		{"label": _("Partner ID"),        "fieldname": "partner_id",           "fieldtype": "Data",     "width": 150},
		{"label": _("State"),             "fieldname": "state",                "fieldtype": "Data",     "width": 120},
		{"label": _("FY"),                "fieldname": "financial_year",       "fieldtype": "Data",     "width": 100},
		{"label": _("No of Creches"),     "fieldname": "no_of_creches",        "fieldtype": "Int",      "width": 120},
		{"label": _("Start Date"),        "fieldname": "start_date",           "fieldtype": "Date",     "width": 100},
		{"label": _("End Date"),          "fieldname": "end_date",             "fieldtype": "Date",     "width": 100},
		{"label": _("Grant ID"),          "fieldname": "grant_id",             "fieldtype": "Data",     "width": 120},
		{"label": _("Budget"),            "fieldname": "total_budget",         "fieldtype": "Currency", "width": 150},
		{"label": _("Utilisation"),       "fieldname": "total_utilisation",    "fieldtype": "Currency", "width": 150},
		{"label": _("Disbursed Amount"),  "fieldname": "total_disbursed",      "fieldtype": "Currency", "width": 160},
		{"label": _("Bank Balance"),      "fieldname": "bank_balance",         "fieldtype": "Currency", "width": 150},
		{"label": _("Utilized vs Budget %"),    "fieldname": "utilised_vs_budget",    "fieldtype": "Percent", "width": 170},
		{"label": _("Utilized vs Disbursed %"), "fieldname": "utilised_vs_disbursed", "fieldtype": "Percent", "width": 180},
	]


# ─── Condition builder ─────────────────────────────────────────────────────────

def build_conditions(filters):
	"""
	Returns (where_clause, params_dict).
	Handles both scalar values and lists (from MultiSelectList filters).
	Partner filter uses CB.partner_name because the JS MultiSelectList stores
	partner_name as the value (human-readable pill labels).
	Date range uses overlap logic: show budgets active during the selected period.
	"""
	conditions = []
	params = {}

	def _add(db_field, key):
		val = filters.get(key)
		if not val:
			return
		if isinstance(val, str):
			val = [val]
		val = [str(v) for v in val if v not in (None, "")]
		if not val:
			return
		if len(val) == 1:
			p = f"p_{key}"
			params[p] = val[0]
			conditions.append(f"{db_field} = %({p})s")
		else:
			sub = []
			for i, v in enumerate(val):
				p = f"p_{key}_{i}"
				params[p] = v
				sub.append(f"{db_field} = %({p})s")
			conditions.append("(" + " OR ".join(sub) + ")")

	# Partner MultiSelectList stores partner_name as value → filter on CB.partner_name
	_add("CB.partner_name",           "partner_id")
	_add("CB.budget_reference_name",  "budget_reference")
	_add("CB.financial_year",         "financial_year")
	_add("CB.grant_id",               "grant_id")
	_add("CB.state",                  "state")
	_add("CB.district",               "district")
	_add("CB.block",                  "block")

	# Overlap logic: include budgets whose period intersects the selected date range
	if filters.get("start_date"):
		params["start_date"] = filters["start_date"]
		conditions.append("CB.end_date >= %(start_date)s")
	if filters.get("end_date"):
		params["end_date"] = filters["end_date"]
		conditions.append("CB.start_date <= %(end_date)s")

	where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
	return where, params


# ─── Percent helper ────────────────────────────────────────────────────────────

def calc_percents(row):
	budget      = row.get("total_budget")      or 0
	utilisation = row.get("total_utilisation") or 0
	disbursed   = row.get("total_disbursed")   or 0
	row["utilised_vs_budget"]    = round((utilisation / budget)   * 100, 0) if budget   > 0 else 0
	row["utilised_vs_disbursed"] = round((utilisation / disbursed)* 100, 0) if disbursed > 0 else 0


# ─── Data fetching ─────────────────────────────────────────────────────────────

def get_data(filters):
	conditions, params = build_conditions(filters)

	# Date filters applied to utilisation and disbursement subqueries (by creation date)
	util_date = ""
	disb_date = ""
	if filters.get("start_date"):
		util_date += " AND creation >= %(start_date)s"
		disb_date += " AND creation >= %(start_date)s"
	if filters.get("end_date"):
		util_date += " AND creation <= %(end_date)s"
		disb_date += " AND creation <= %(end_date)s"

	budgets = frappe.db.sql(
		"""
		SELECT
			CB.partner_id,
			CB.partner_name,
			CB.budget_reference_name,
			CB.state,
			CB.financial_year,
			COALESCE(CB.no_of_creches, 0)       AS no_of_creches,
			CB.start_date,
			CB.end_date,
			CB.grant_id,
			COALESCE(CB.total_budget, 0)         AS total_budget,
			COALESCE(CU.total_utilisation, 0)    AS total_utilisation,
			COALESCE(CD.total_disbursed, 0)      AS total_disbursed,
			COALESCE(UB.balance_amount, 0)       AS bank_balance
		FROM `tabCreche Budget` CB
		LEFT JOIN (
			SELECT budget_reference_id, SUM(total_utilisation) AS total_utilisation
			FROM `tabCreche utilisation`
			WHERE 1=1 {util_date}
			GROUP BY budget_reference_id
		) CU ON CU.budget_reference_id = CB.name
		LEFT JOIN (
			SELECT budget_reference_id, SUM(total_disbursement) AS total_disbursed
			FROM `tabCreche Disbursement`
			WHERE 1=1 {disb_date}
			GROUP BY budget_reference_id
		) CD ON CD.budget_reference_id = CB.name
		LEFT JOIN (
			SELECT u1.budget_reference_id, u1.balance_amount
			FROM `tabCreche utilisation` u1
			INNER JOIN (
				SELECT budget_reference_id, MAX(modified) AS max_modified
				FROM `tabCreche utilisation`
				WHERE 1=1 {util_date}
				GROUP BY budget_reference_id
			) u2 ON u1.budget_reference_id = u2.budget_reference_id
				AND u1.modified = u2.max_modified
			WHERE 1=1 {util_date}
		) UB ON UB.budget_reference_id = CB.name
		{conditions}
		ORDER BY CB.partner_name ASC, CB.budget_reference_name ASC
		""".format(conditions=conditions, util_date=util_date, disb_date=disb_date),
		params,
		as_dict=True,
	)

	partner_map = OrderedDict()
	for b in budgets:
		pid = b["partner_id"]
		if pid not in partner_map:
			partner_map[pid] = {"meta": b, "rows": []}
		partner_map[pid]["rows"].append(b)

	result = []
	grand_budget = grand_utilisation = grand_disbursed = grand_balance = grand_creches = 0

	for pid, info in partner_map.items():
		rows = info["rows"]
		meta = info["meta"]

		total_budget      = sum(r["total_budget"]      for r in rows)
		total_utilisation = sum(r["total_utilisation"] for r in rows)
		total_disbursed   = sum(r["total_disbursed"]   for r in rows)
		bank_balance      = sum(r["bank_balance"]      for r in rows)
		no_of_creches     = sum(r["no_of_creches"]     for r in rows)
		unique_states     = sorted({r["state"] for r in rows if r.get("state")})

		partner_row = {
			"row_name":          meta["partner_name"],
			"partner_id":        pid,
			"state":             ", ".join(unique_states),
			"financial_year":    "",
			"no_of_creches":     no_of_creches,
			"start_date":        None,
			"end_date":          None,
			"grant_id":          "",
			"total_budget":      total_budget,
			"total_utilisation": total_utilisation,
			"total_disbursed":   total_disbursed,
			"bank_balance":      bank_balance,
			"indent":            0,
		}
		calc_percents(partner_row)
		result.append(partner_row)

		grand_budget      += total_budget
		grand_utilisation += total_utilisation
		grand_disbursed   += total_disbursed
		grand_balance     += bank_balance
		grand_creches     += no_of_creches

		for b in rows:
			child_row = {
				"row_name":          b["budget_reference_name"],
				"partner_id":        b["partner_id"],
				"state":             b["state"],
				"financial_year":    b["financial_year"],
				"no_of_creches":     b["no_of_creches"],
				"start_date":        b["start_date"],
				"end_date":          b["end_date"],
				"grant_id":          b["grant_id"],
				"total_budget":      b["total_budget"],
				"total_utilisation": b["total_utilisation"],
				"total_disbursed":   b["total_disbursed"],
				"bank_balance":      b["bank_balance"],
				"indent":            1,
			}
			calc_percents(child_row)
			result.append(child_row)

	if result:
		grand_row = {
			"row_name":          "Grand Total",
			"partner_id":        "",
			"state":             "",
			"financial_year":    "",
			"no_of_creches":     grand_creches,
			"start_date":        None,
			"end_date":          None,
			"grant_id":          "",
			"total_budget":      grand_budget,
			"total_utilisation": grand_utilisation,
			"total_disbursed":   grand_disbursed,
			"bank_balance":      grand_balance,
			"indent":            0,
			"is_grand_total":    1,
		}
		calc_percents(grand_row)
		result.append(grand_row)

	return result


# ─── Excel export ──────────────────────────────────────────────────────────────

@frappe.whitelist()
def download_excel(filters=None):
	import io
	import json

	import openpyxl
	from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
	from openpyxl.utils import get_column_letter

	if isinstance(filters, str):
		filters = json.loads(filters)
	filters = filters or {}

	data = get_data(filters)

	wb = openpyxl.Workbook()
	ws = wb.active
	ws.title = "Budget Utilisation"

	# ── Style helpers ──────────────────────────────────────────────────────────
	def solid(h):
		return PatternFill("solid", fgColor=h)

	def fnt(bold=False, color="000000", size=10):
		return Font(bold=bold, color=color, size=size)

	thin   = Side(style="thin",   color="D5D8DC")
	BORDER = Border(bottom=thin,  left=thin, right=thin)
	CENTER   = Alignment(horizontal="center", vertical="center", wrap_text=True)
	RIGHT_VC = Alignment(horizontal="right",  vertical="center", wrap_text=True)
	LEFT_VC  = Alignment(horizontal="left",   vertical="center", wrap_text=True)

	HDR_FILL = solid("2C3E50"); HDR_FONT = fnt(bold=True, color="FFFFFF", size=11)
	PAR_FILL = solid("D4E6F1"); PAR_FONT = fnt(bold=True, color="1A5276", size=10)
	BUD_FILL_ODD  = solid("FFFFFF")
	BUD_FILL_EVEN = solid("EBF5FB")
	BUD_FONT = fnt(size=10)
	G_FILL = solid("D5F5E3"); G_FONT = fnt(bold=True, color="1E8449")
	O_FILL = solid("FEF9E7"); O_FONT = fnt(bold=True, color="D35400")
	R_FILL = solid("FADBD8"); R_FONT = fnt(bold=True, color="C0392B")
	TOT_FILL = solid("1A5276"); TOT_FONT = fnt(bold=True, color="FFFFFF", size=11)

	FLT_FILL = solid("EBF5FB"); FLT_FONT = fnt(size=10, color="1A5276")
	TTL_FONT = fnt(bold=True, color="1A5276", size=13)

	# ── Column schema ──────────────────────────────────────────────────────────
	# (header, fieldname, excel_width, dtype)
	COLS = [
		("Partner / Budget",        "row_name",             40, "str"),
		("Partner ID",              "partner_id",            18, "str"),
		("State",                   "state",                 18, "str"),
		("FY",                      "financial_year",        10, "str"),
		("No of Creches",           "no_of_creches",         14, "int"),
		("Start Date",              "start_date",            14, "date"),
		("End Date",                "end_date",              14, "date"),
		("Grant ID",                "grant_id",              16, "str"),
		("Budget (₹)",              "total_budget",          22, "cur"),
		("Utilisation (₹)",         "total_utilisation",     22, "cur"),
		("Disbursed Amount (₹)",    "total_disbursed",       26, "cur"),
		("Bank Balance (₹)",        "bank_balance",          22, "cur"),
		("Utilized vs Budget %",    "utilised_vs_budget",    24, "pct"),
		("Utilized vs Disbursed %", "utilised_vs_disbursed", 26, "pct"),
	]
	N_COLS = len(COLS)

	for i, (_h, _fn, width, _dt) in enumerate(COLS, 1):
		ws.column_dimensions[get_column_letter(i)].width = width

	cur_row = 0

	def next_row(height=16):
		nonlocal cur_row
		cur_row += 1
		ws.row_dimensions[cur_row].height = height
		return cur_row

	def merge_row(r, value, fill, font, height=18):
		ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=N_COLS)
		cell = ws.cell(row=r, column=1, value=value)
		cell.fill = fill; cell.font = font
		cell.alignment = LEFT_VC
		ws.row_dimensions[r].height = height

	# ── Report title ───────────────────────────────────────────────────────────
	r = next_row(28)
	merge_row(r, "Creche Budget Utilisation Report", solid("D4E6F1"), TTL_FONT, 28)

	# ── Active filters section ─────────────────────────────────────────────────
	active = {k: v for k, v in filters.items()
	          if v not in (None, "", []) and not (isinstance(v, list) and len(v) == 0)}

	if active:
		r = next_row(14)
		merge_row(r, "Filters Applied", solid("AED6F1"), fnt(bold=True, color="1A5276", size=10), 14)

		for key, val in active.items():
			label = _FILTER_LABELS.get(key, key.replace("_", " ").title())
			if isinstance(val, list):
				display_val = ", ".join(str(v) for v in val)
			else:
				display_val = str(val)
			r = next_row(16)
			ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=N_COLS)
			cell = ws.cell(row=r, column=1, value=f"  {label}:  {display_val}")
			cell.fill = FLT_FILL; cell.font = FLT_FONT
			cell.alignment = LEFT_VC

	# Blank spacer
	next_row(8)

	# ── Column header row ──────────────────────────────────────────────────────
	r = next_row(26)
	for i, (hdr, *_rest) in enumerate(COLS, 1):
		cell = ws.cell(row=r, column=i, value=hdr)
		cell.fill = HDR_FILL; cell.font = HDR_FONT
		cell.alignment = CENTER; cell.border = BORDER
	ws.freeze_panes = f"A{r + 1}"

	# ── Data rows + track groups for Partner ID merge ──────────────────────────
	group_spans = []
	partner_r = None; last_b_r = None
	alt = 0

	for row_data in data:
		is_grand_total = bool(row_data.get("is_grand_total"))
		r = next_row(24 if is_grand_total else (22 if row_data.get("indent", 0) == 0 else 18))
		is_partner = row_data.get("indent", 0) == 0

		if is_partner and not is_grand_total:
			if partner_r and last_b_r:
				group_spans.append((partner_r, last_b_r))
			partner_r = r; last_b_r = None; alt = 0
		elif not is_partner:
			last_b_r = r; alt += 1

		for col_idx, (_hdr, fieldname, _w, dtype) in enumerate(COLS, 1):
			raw  = row_data.get(fieldname)
			cell = ws.cell(row=r, column=col_idx)
			cell.border = BORDER

			if dtype == "cur":
				cell.value = float(raw or 0); cell.number_format = "#,##0.00"
			elif dtype == "pct":
				cell.value = float(raw or 0); cell.number_format = '0.00"%"'
			elif dtype == "int":
				cell.value = int(raw or 0)
			elif dtype == "date":
				cell.value = raw if raw else ""; cell.number_format = "DD-MMM-YYYY"
			else:
				val = str(raw) if raw not in (None, "") else ""
				if fieldname == "row_name" and not is_partner:
					val = "    " + val
				cell.value = val

			if is_grand_total:
				cell.fill = TOT_FILL; cell.font = TOT_FONT
				cell.alignment = RIGHT_VC if dtype in ("cur", "pct", "int") else LEFT_VC
			elif is_partner:
				cell.fill = PAR_FILL; cell.font = PAR_FONT
				cell.alignment = RIGHT_VC if dtype in ("cur", "pct", "int") else LEFT_VC
			else:
				cell.fill = BUD_FILL_ODD if alt % 2 == 1 else BUD_FILL_EVEN
				cell.font = BUD_FONT
				cell.alignment = RIGHT_VC if dtype in ("cur", "pct", "int") else LEFT_VC

			# Traffic-light override for percent in budget rows only
			if dtype == "pct" and not is_partner and not is_grand_total:
				pct = float(raw or 0)
				cell.fill, cell.font = (
					(G_FILL, G_FONT) if pct >= 75 else
					(O_FILL, O_FONT) if pct >= 50 else
					(R_FILL, R_FONT)
				)
				cell.alignment = RIGHT_VC

	if partner_r and last_b_r:
		group_spans.append((partner_r, last_b_r))

	# ── Vertical merge: Partner ID column (col 2) per partner group ────────────
	for p_r, last_b in group_spans:
		if last_b > p_r:
			ws.merge_cells(start_row=p_r, start_column=2, end_row=last_b, end_column=2)
			ws.cell(row=p_r, column=2).alignment = CENTER

	# ── Stream to browser ──────────────────────────────────────────────────────
	buf = io.BytesIO()
	wb.save(buf)
	buf.seek(0)

	frappe.response["filename"]    = "Budget_Utilisation_Report.xlsx"
	frappe.response["filecontent"] = buf.getvalue()
	frappe.response["type"]        = "binary"

# import frappe
# from frappe import _
# from collections import OrderedDict

# # Labels shown in the Excel filter summary header
# _FILTER_LABELS = {
# 	"partner_id":       "Partner",
# 	"budget_reference": "Budget Reference",
# 	"financial_year":   "Financial Year",
# 	"grant_id":         "Grant ID",
# 	"state":            "State",
# 	"district":         "District",
# 	"block":            "Block",
# 	"start_date":       "Start Date",
# 	"end_date":         "End Date",
# }


# def execute(filters=None):
# 	filters = filters or {}
# 	return get_columns(), get_data(filters)


# def get_columns():
# 	return [
# 		{"label": _("Partner / Budget"), "fieldname": "row_name",             "fieldtype": "Data",     "width": 260},
# 		{"label": _("Partner ID"),        "fieldname": "partner_id",           "fieldtype": "Data",     "width": 150},
# 		{"label": _("State"),             "fieldname": "state",                "fieldtype": "Data",     "width": 120},
# 		{"label": _("FY"),                "fieldname": "financial_year",       "fieldtype": "Data",     "width": 100},
# 		{"label": _("No of Creches"),     "fieldname": "no_of_creches",        "fieldtype": "Int",      "width": 120},
# 		{"label": _("Start Date"),        "fieldname": "start_date",           "fieldtype": "Date",     "width": 100},
# 		{"label": _("End Date"),          "fieldname": "end_date",             "fieldtype": "Date",     "width": 100},
# 		{"label": _("Grant ID"),          "fieldname": "grant_id",             "fieldtype": "Data",     "width": 120},
# 		{"label": _("Budget"),            "fieldname": "total_budget",         "fieldtype": "Currency", "width": 150},
# 		{"label": _("Utilisation"),       "fieldname": "total_utilisation",    "fieldtype": "Currency", "width": 150},
# 		{"label": _("Disbursed Amount"),  "fieldname": "total_disbursed",      "fieldtype": "Currency", "width": 160},
# 		{"label": _("Bank Balance"),      "fieldname": "bank_balance",         "fieldtype": "Currency", "width": 150},
# 		{"label": _("Utilized vs Budget %"),    "fieldname": "utilised_vs_budget",    "fieldtype": "Percent", "width": 170},
# 		{"label": _("Utilized vs Disbursed %"), "fieldname": "utilised_vs_disbursed", "fieldtype": "Percent", "width": 180},
# 	]


# # ─── Condition builder ─────────────────────────────────────────────────────────

# def build_conditions(filters):
# 	"""
# 	Returns (where_clause, params_dict).
# 	Handles both scalar values and lists (from MultiSelectList filters).
# 	Partner filter uses CB.partner_name because the JS MultiSelectList stores
# 	partner_name as the value (human-readable pill labels).
# 	Date range uses overlap logic: show budgets active during the selected period.
# 	"""
# 	conditions = []
# 	params = {}

# 	def _add(db_field, key):
# 		val = filters.get(key)
# 		if not val:
# 			return
# 		if isinstance(val, str):
# 			val = [val]
# 		val = [str(v) for v in val if v not in (None, "")]
# 		if not val:
# 			return
# 		if len(val) == 1:
# 			p = f"p_{key}"
# 			params[p] = val[0]
# 			conditions.append(f"{db_field} = %({p})s")
# 		else:
# 			sub = []
# 			for i, v in enumerate(val):
# 				p = f"p_{key}_{i}"
# 				params[p] = v
# 				sub.append(f"{db_field} = %({p})s")
# 			conditions.append("(" + " OR ".join(sub) + ")")

# 	# Partner MultiSelectList stores partner_name as value → filter on CB.partner_name
# 	_add("CB.partner_name",           "partner_id")
# 	_add("CB.budget_reference_name",  "budget_reference")
# 	_add("CB.financial_year",         "financial_year")
# 	_add("CB.grant_id",               "grant_id")
# 	_add("CB.state",                  "state")
# 	_add("CB.district",               "district")
# 	_add("CB.block",                  "block")

# 	# Overlap logic: include budgets whose period intersects the selected date range
# 	if filters.get("start_date"):
# 		params["start_date"] = filters["start_date"]
# 		conditions.append("CB.end_date >= %(start_date)s")
# 	if filters.get("end_date"):
# 		params["end_date"] = filters["end_date"]
# 		conditions.append("CB.start_date <= %(end_date)s")

# 	where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
# 	return where, params


# # ─── Percent helper ────────────────────────────────────────────────────────────

# def calc_percents(row):
# 	budget      = row.get("total_budget")      or 0
# 	utilisation = row.get("total_utilisation") or 0
# 	disbursed   = row.get("total_disbursed")   or 0
# 	row["utilised_vs_budget"]    = round((utilisation / budget)   * 100, 0) if budget   > 0 else 0
# 	row["utilised_vs_disbursed"] = round((utilisation / disbursed)* 100, 0) if disbursed > 0 else 0


# # ─── Data fetching ─────────────────────────────────────────────────────────────

# def get_data(filters):
# 	conditions, params = build_conditions(filters)

# 	# Date filters applied to utilisation and disbursement subqueries (by creation date)
# 	util_date = ""
# 	disb_date = ""
# 	if filters.get("start_date"):
# 		util_date += " AND creation >= %(start_date)s"
# 		disb_date += " AND creation >= %(start_date)s"
# 	if filters.get("end_date"):
# 		util_date += " AND creation <= %(end_date)s"
# 		disb_date += " AND creation <= %(end_date)s"

# 	budgets = frappe.db.sql(
# 		"""
# 		SELECT
# 			CB.partner_id,
# 			CB.partner_name,
# 			CB.budget_reference_name,
# 			CB.state,
# 			CB.financial_year,
# 			COALESCE(CB.no_of_creches, 0)       AS no_of_creches,
# 			CB.start_date,
# 			CB.end_date,
# 			CB.grant_id,
# 			COALESCE(CB.total_budget, 0)         AS total_budget,
# 			COALESCE(CU.total_utilisation, 0)    AS total_utilisation,
# 			COALESCE(CD.total_disbursed, 0)      AS total_disbursed,
# 			COALESCE(UB.balance_amount, 0)       AS bank_balance
# 		FROM `tabCreche Budget` CB
# 		LEFT JOIN (
# 			SELECT budget_reference_id, SUM(total_utilisation) AS total_utilisation
# 			FROM `tabCreche utilisation`
# 			WHERE 1=1 {util_date}
# 			GROUP BY budget_reference_id
# 		) CU ON CU.budget_reference_id = CB.name
# 		LEFT JOIN (
# 			SELECT budget_reference_id, SUM(total_disbursement) AS total_disbursed
# 			FROM `tabCreche Disbursement`
# 			WHERE 1=1 {disb_date}
# 			GROUP BY budget_reference_id
# 		) CD ON CD.budget_reference_id = CB.name
# 		LEFT JOIN (
# 			SELECT u1.budget_reference_id, u1.balance_amount
# 			FROM `tabCreche utilisation` u1
# 			INNER JOIN (
# 				SELECT budget_reference_id, MAX(modified) AS max_modified
# 				FROM `tabCreche utilisation`
# 				WHERE 1=1 {util_date}
# 				GROUP BY budget_reference_id
# 			) u2 ON u1.budget_reference_id = u2.budget_reference_id
# 				AND u1.modified = u2.max_modified
# 			WHERE 1=1 {util_date}
# 		) UB ON UB.budget_reference_id = CB.name
# 		{conditions}
# 		ORDER BY CB.partner_name ASC, CB.budget_reference_name ASC
# 		""".format(conditions=conditions, util_date=util_date, disb_date=disb_date),
# 		params,
# 		as_dict=True,
# 	)

# 	partner_map = OrderedDict()
# 	for b in budgets:
# 		pid = b["partner_id"]
# 		if pid not in partner_map:
# 			partner_map[pid] = {"meta": b, "rows": []}
# 		partner_map[pid]["rows"].append(b)

# 	result = []
# 	grand_budget = grand_utilisation = grand_disbursed = grand_balance = grand_creches = 0

# 	for pid, info in partner_map.items():
# 		rows = info["rows"]
# 		meta = info["meta"]

# 		total_budget      = sum(r["total_budget"]      for r in rows)
# 		total_utilisation = sum(r["total_utilisation"] for r in rows)
# 		total_disbursed   = sum(r["total_disbursed"]   for r in rows)
# 		bank_balance      = sum(r["bank_balance"]      for r in rows)
# 		no_of_creches     = sum(r["no_of_creches"]     for r in rows)
# 		unique_states     = sorted({r["state"] for r in rows if r.get("state")})

# 		partner_row = {
# 			"row_name":          meta["partner_name"],
# 			"partner_id":        pid,
# 			"state":             ", ".join(unique_states),
# 			"financial_year":    "",
# 			"no_of_creches":     no_of_creches,
# 			"start_date":        None,
# 			"end_date":          None,
# 			"grant_id":          "",
# 			"total_budget":      total_budget,
# 			"total_utilisation": total_utilisation,
# 			"total_disbursed":   total_disbursed,
# 			"bank_balance":      bank_balance,
# 			"indent":            0,
# 		}
# 		calc_percents(partner_row)
# 		result.append(partner_row)

# 		grand_budget      += total_budget
# 		grand_utilisation += total_utilisation
# 		grand_disbursed   += total_disbursed
# 		grand_balance     += bank_balance
# 		grand_creches     += no_of_creches

# 		for b in rows:
# 			child_row = {
# 				"row_name":          b["budget_reference_name"],
# 				"partner_id":        b["partner_id"],
# 				"state":             b["state"],
# 				"financial_year":    b["financial_year"],
# 				"no_of_creches":     b["no_of_creches"],
# 				"start_date":        b["start_date"],
# 				"end_date":          b["end_date"],
# 				"grant_id":          b["grant_id"],
# 				"total_budget":      b["total_budget"],
# 				"total_utilisation": b["total_utilisation"],
# 				"total_disbursed":   b["total_disbursed"],
# 				"bank_balance":      b["bank_balance"],
# 				"indent":            1,
# 			}
# 			calc_percents(child_row)
# 			result.append(child_row)

# 	if result:
# 		grand_row = {
# 			"row_name":          "Grand Total",
# 			"partner_id":        "",
# 			"state":             "",
# 			"financial_year":    "",
# 			"no_of_creches":     grand_creches,
# 			"start_date":        None,
# 			"end_date":          None,
# 			"grant_id":          "",
# 			"total_budget":      grand_budget,
# 			"total_utilisation": grand_utilisation,
# 			"total_disbursed":   grand_disbursed,
# 			"bank_balance":      grand_balance,
# 			"indent":            0,
# 			"is_grand_total":    1,
# 		}
# 		calc_percents(grand_row)
# 		result.append(grand_row)

# 	return result


# # ─── Excel export ──────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def download_excel(filters=None):
# 	import io
# 	import json

# 	import openpyxl
# 	from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
# 	from openpyxl.utils import get_column_letter

# 	if isinstance(filters, str):
# 		filters = json.loads(filters)
# 	filters = filters or {}

# 	data = get_data(filters)

# 	wb = openpyxl.Workbook()
# 	ws = wb.active
# 	ws.title = "Budget Utilisation"

# 	# ── Style helpers ──────────────────────────────────────────────────────────
# 	def solid(h):
# 		return PatternFill("solid", fgColor=h)

# 	def fnt(bold=False, color="000000", size=10):
# 		return Font(bold=bold, color=color, size=size)

# 	thin   = Side(style="thin",   color="D5D8DC")
# 	BORDER = Border(bottom=thin,  left=thin, right=thin)
# 	CENTER   = Alignment(horizontal="center", vertical="center", wrap_text=True)
# 	RIGHT_VC = Alignment(horizontal="right",  vertical="center", wrap_text=True)
# 	LEFT_VC  = Alignment(horizontal="left",   vertical="center", wrap_text=True)

# 	HDR_FILL = solid("2C3E50"); HDR_FONT = fnt(bold=True, color="FFFFFF", size=11)
# 	PAR_FILL = solid("D4E6F1"); PAR_FONT = fnt(bold=True, color="1A5276", size=10)
# 	BUD_FILL_ODD  = solid("FFFFFF")
# 	BUD_FILL_EVEN = solid("EBF5FB")
# 	BUD_FONT = fnt(size=10)
# 	G_FILL = solid("D5F5E3"); G_FONT = fnt(bold=True, color="1E8449")
# 	O_FILL = solid("FEF9E7"); O_FONT = fnt(bold=True, color="D35400")
# 	R_FILL = solid("FADBD8"); R_FONT = fnt(bold=True, color="C0392B")
# 	TOT_FILL = solid("1A5276"); TOT_FONT = fnt(bold=True, color="FFFFFF", size=11)

# 	FLT_FILL = solid("EBF5FB"); FLT_FONT = fnt(size=10, color="1A5276")
# 	TTL_FONT = fnt(bold=True, color="1A5276", size=13)

# 	# ── Column schema ──────────────────────────────────────────────────────────
# 	# (header, fieldname, excel_width, dtype)
# 	COLS = [
# 		("Partner / Budget",        "row_name",             40, "str"),
# 		("Partner ID",              "partner_id",            18, "str"),
# 		("State",                   "state",                 18, "str"),
# 		("FY",                      "financial_year",        10, "str"),
# 		("No of Creches",           "no_of_creches",         14, "int"),
# 		("Start Date",              "start_date",            14, "date"),
# 		("End Date",                "end_date",              14, "date"),
# 		("Grant ID",                "grant_id",              16, "str"),
# 		("Budget (₹)",              "total_budget",          22, "cur"),
# 		("Utilisation (₹)",         "total_utilisation",     22, "cur"),
# 		("Disbursed Amount (₹)",    "total_disbursed",       26, "cur"),
# 		("Bank Balance (₹)",        "bank_balance",          22, "cur"),
# 		("Utilized vs Budget %",    "utilised_vs_budget",    24, "pct"),
# 		("Utilized vs Disbursed %", "utilised_vs_disbursed", 26, "pct"),
# 	]
# 	N_COLS = len(COLS)

# 	for i, (_h, _fn, width, _dt) in enumerate(COLS, 1):
# 		ws.column_dimensions[get_column_letter(i)].width = width

# 	cur_row = 0

# 	def next_row(height=16):
# 		nonlocal cur_row
# 		cur_row += 1
# 		ws.row_dimensions[cur_row].height = height
# 		return cur_row

# 	def merge_row(r, value, fill, font, height=18):
# 		ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=N_COLS)
# 		cell = ws.cell(row=r, column=1, value=value)
# 		cell.fill = fill; cell.font = font
# 		cell.alignment = LEFT_VC
# 		ws.row_dimensions[r].height = height

# 	# ── Report title ───────────────────────────────────────────────────────────
# 	r = next_row(28)
# 	merge_row(r, "Creche Budget Utilisation Report", solid("D4E6F1"), TTL_FONT, 28)

# 	# ── Active filters section ─────────────────────────────────────────────────
# 	active = {k: v for k, v in filters.items()
# 	          if v not in (None, "", []) and not (isinstance(v, list) and len(v) == 0)}

# 	if active:
# 		r = next_row(14)
# 		merge_row(r, "Filters Applied", solid("AED6F1"), fnt(bold=True, color="1A5276", size=10), 14)

# 		for key, val in active.items():
# 			label = _FILTER_LABELS.get(key, key.replace("_", " ").title())
# 			if isinstance(val, list):
# 				display_val = ", ".join(str(v) for v in val)
# 			else:
# 				display_val = str(val)
# 			r = next_row(16)
# 			ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=N_COLS)
# 			cell = ws.cell(row=r, column=1, value=f"  {label}:  {display_val}")
# 			cell.fill = FLT_FILL; cell.font = FLT_FONT
# 			cell.alignment = LEFT_VC

# 	# Blank spacer
# 	next_row(8)

# 	# ── Column header row ──────────────────────────────────────────────────────
# 	r = next_row(26)
# 	for i, (hdr, *_rest) in enumerate(COLS, 1):
# 		cell = ws.cell(row=r, column=i, value=hdr)
# 		cell.fill = HDR_FILL; cell.font = HDR_FONT
# 		cell.alignment = CENTER; cell.border = BORDER
# 	ws.freeze_panes = f"A{r + 1}"

# 	# ── Data rows + track groups for Partner ID merge ──────────────────────────
# 	group_spans = []
# 	partner_r = None; last_b_r = None
# 	alt = 0

# 	for row_data in data:
# 		is_grand_total = bool(row_data.get("is_grand_total"))
# 		r = next_row(24 if is_grand_total else (22 if row_data.get("indent", 0) == 0 else 18))
# 		is_partner = row_data.get("indent", 0) == 0

# 		if is_partner and not is_grand_total:
# 			if partner_r and last_b_r:
# 				group_spans.append((partner_r, last_b_r))
# 			partner_r = r; last_b_r = None; alt = 0
# 		elif not is_partner:
# 			last_b_r = r; alt += 1

# 		for col_idx, (_hdr, fieldname, _w, dtype) in enumerate(COLS, 1):
# 			raw  = row_data.get(fieldname)
# 			cell = ws.cell(row=r, column=col_idx)
# 			cell.border = BORDER

# 			if dtype == "cur":
# 				cell.value = float(raw or 0); cell.number_format = "#,##0.00"
# 			elif dtype == "pct":
# 				cell.value = float(raw or 0); cell.number_format = '0.00"%"'
# 			elif dtype == "int":
# 				cell.value = int(raw or 0)
# 			elif dtype == "date":
# 				cell.value = raw if raw else ""; cell.number_format = "DD-MMM-YYYY"
# 			else:
# 				val = str(raw) if raw not in (None, "") else ""
# 				if fieldname == "row_name" and not is_partner:
# 					val = "    " + val
# 				cell.value = val

# 			if is_grand_total:
# 				cell.fill = TOT_FILL; cell.font = TOT_FONT
# 				cell.alignment = RIGHT_VC if dtype in ("cur", "pct", "int") else LEFT_VC
# 			elif is_partner:
# 				cell.fill = PAR_FILL; cell.font = PAR_FONT
# 				cell.alignment = RIGHT_VC if dtype in ("cur", "pct", "int") else LEFT_VC
# 			else:
# 				cell.fill = BUD_FILL_ODD if alt % 2 == 1 else BUD_FILL_EVEN
# 				cell.font = BUD_FONT
# 				cell.alignment = RIGHT_VC if dtype in ("cur", "pct", "int") else LEFT_VC

# 			# Traffic-light override for percent in budget rows only
# 			if dtype == "pct" and not is_partner and not is_grand_total:
# 				pct = float(raw or 0)
# 				cell.fill, cell.font = (
# 					(G_FILL, G_FONT) if pct >= 75 else
# 					(O_FILL, O_FONT) if pct >= 50 else
# 					(R_FILL, R_FONT)
# 				)
# 				cell.alignment = RIGHT_VC

# 	if partner_r and last_b_r:
# 		group_spans.append((partner_r, last_b_r))

# 	# ── Vertical merge: Partner ID column (col 2) per partner group ────────────
# 	for p_r, last_b in group_spans:
# 		if last_b > p_r:
# 			ws.merge_cells(start_row=p_r, start_column=2, end_row=last_b, end_column=2)
# 			ws.cell(row=p_r, column=2).alignment = CENTER

# 	# ── Stream to browser ──────────────────────────────────────────────────────
# 	buf = io.BytesIO()
# 	wb.save(buf)
# 	buf.seek(0)

# 	frappe.response["filename"]    = "Budget_Utilisation_Report.xlsx"
# 	frappe.response["filecontent"] = buf.getvalue()
# 	frappe.response["type"]        = "binary"




# last working ==================================================================================================================================

# import frappe
# from frappe import _
# from collections import OrderedDict
# import calendar
# from datetime import date, timedelta

# # Labels shown in the Excel filter summary header
# _FILTER_LABELS = {
# 	"level":            "Level",
# 	"partner_id":       "Partner",
# 	"budget_reference": "Budget Reference",
# 	"financial_year":   "Financial Year",
# 	"grant_id":         "Grant ID",
# 	"state":            "State",
# 	"district":         "District",
# 	"block":            "Block",
# 	"start_date":       "Start Date",
# 	"end_date":         "End Date",
# }

# # Indian FY month order (April = position 0)
# _FY_MONTH_NAMES = [
# 	"April", "May", "June", "July", "August", "September",
# 	"October", "November", "December", "January", "February", "March",
# ]
# _FY_MONTH_POS = {m: i for i, m in enumerate(_FY_MONTH_NAMES)}  # April→0, March→11


# # ─── Financial-year helpers ────────────────────────────────────────────────────

# def _date_to_fy(d):
# 	"""Return FY string (e.g. '2024-25') for a date object."""
# 	if d is None:
# 		return None
# 	if isinstance(d, str):
# 		d = date.fromisoformat(str(d)[:10])
# 	if d.month >= 4:
# 		return f"{d.year}-{str(d.year + 1)[2:]}"
# 	return f"{d.year - 1}-{str(d.year)[2:]}"


# def _fy_start_end(fy_str):
# 	"""Return (start_date, end_date) for a FY string like '2024-25'."""
# 	start_year = int(fy_str.split("-")[0])
# 	return date(start_year, 4, 1), date(start_year + 1, 3, 31)


# def _fy_for_year_col(budget_start_date, col_offset):
# 	"""
# 	Year 1 = FY containing budget start_date (col_offset=0)
# 	Year 2 = next FY                         (col_offset=1)
# 	Year 3 = FY after that                   (col_offset=2)
# 	Returns the FY string.
# 	"""
# 	if budget_start_date is None:
# 		return None
# 	if isinstance(budget_start_date, str):
# 		budget_start_date = date.fromisoformat(str(budget_start_date)[:10])
# 	base_fy_str = _date_to_fy(budget_start_date)
# 	base_year   = int(base_fy_str.split("-")[0])
# 	y = base_year + col_offset
# 	return f"{y}-{str(y + 1)[2:]}"


# def _fy_month_pairs_in_range(start_d, end_d):
# 	"""
# 	Return a list of (fy_string, month_name) tuples covering every month
# 	from start_d to end_d inclusive.
# 	"""
# 	if isinstance(start_d, str):
# 		start_d = date.fromisoformat(str(start_d)[:10])
# 	if isinstance(end_d, str):
# 		end_d = date.fromisoformat(str(end_d)[:10])

# 	pairs = []
# 	# Walk month by month
# 	cur = date(start_d.year, start_d.month, 1)
# 	end_month_start = date(end_d.year, end_d.month, 1)
# 	while cur <= end_month_start:
# 		fy = _date_to_fy(cur)
# 		month_name = calendar.month_name[cur.month]   # "April", "May", …
# 		pairs.append((fy, month_name))
# 		# Advance one month
# 		if cur.month == 12:
# 			cur = date(cur.year + 1, 1, 1)
# 		else:
# 			cur = date(cur.year, cur.month + 1, 1)
# 	return pairs


# def execute(filters=None):
# 	filters = filters or {}
# 	return get_columns(filters), get_data(filters)


# def get_columns(filters=None):
# 	level = ((filters or {}).get("level") or "partner wise").lower()
# 	first_label = {
# 		"budget wise": "Budget Reference",
# 		"state":       "State / Partner",
# 		"district":    "District / Partner",
# 		"block":       "Block / Partner",
# 	}.get(level, "Partner / Budget")

# 	return [
# 		{"label": _(first_label),                   "fieldname": "row_name",             "fieldtype": "Data",     "width": 260},
# 		{"label": _("Partner ID"),                  "fieldname": "partner_id",           "fieldtype": "Data",     "width": 150},
# 		{"label": _("State"),                       "fieldname": "state",                "fieldtype": "Data",     "width": 120},
# 		{"label": _("FY"),                          "fieldname": "financial_year",       "fieldtype": "Data",     "width": 100},
# 		{"label": _("No of Creches"),               "fieldname": "no_of_creches",        "fieldtype": "Int",      "width": 120},
# 		{"label": _("Start Date"),                  "fieldname": "start_date",           "fieldtype": "Date",     "width": 100},
# 		{"label": _("End Date"),                    "fieldname": "end_date",             "fieldtype": "Date",     "width": 100},
# 		{"label": _("Grant ID"),                    "fieldname": "grant_id",             "fieldtype": "Data",     "width": 120},
# 		{"label": _("Budget"),                      "fieldname": "total_budget",         "fieldtype": "Currency", "width": 150},
# 		{"label": _("Utilisation"),                 "fieldname": "total_utilisation",    "fieldtype": "Currency", "width": 150},
# 		{"label": _("Disbursed Amount"),            "fieldname": "total_disbursed",      "fieldtype": "Currency", "width": 160},
# 		{"label": _("Bank Balance"),                "fieldname": "bank_balance",         "fieldtype": "Currency", "width": 150},
# 		{"label": _("Utilized vs Budget %"),        "fieldname": "utilised_vs_budget",   "fieldtype": "Percent",  "width": 170},
# 		{"label": _("Utilized vs Disbursed %"),     "fieldname": "utilised_vs_disbursed","fieldtype": "Percent",  "width": 180},
# 	]


# # ─── Condition builder (for CB-level filters) ──────────────────────────────────

# def build_conditions(filters):
# 	"""
# 	Returns (where_clause, params_dict) for filtering tabCreche Budget rows.
# 	Does NOT include date-range logic — that is applied per-amount field.
# 	"""
# 	conditions = []
# 	params = {}

# 	def _add(db_field, key):
# 		val = filters.get(key)
# 		if not val:
# 			return
# 		if isinstance(val, str):
# 			val = [val]
# 		val = [str(v) for v in val if v not in (None, "")]
# 		if not val:
# 			return
# 		if len(val) == 1:
# 			p = f"p_{key}"
# 			params[p] = val[0]
# 			conditions.append(f"{db_field} = %({p})s")
# 		else:
# 			sub = []
# 			for i, v in enumerate(val):
# 				p = f"p_{key}_{i}"
# 				params[p] = v
# 				sub.append(f"{db_field} = %({p})s")
# 			conditions.append("(" + " OR ".join(sub) + ")")

# 	_add("CB.partner_name",           "partner_id")
# 	_add("CB.budget_reference_name",  "budget_reference")
# 	_add("CB.grant_id",               "grant_id")
# 	_add("CB.state",                  "state")
# 	_add("CB.district",               "district")
# 	_add("CB.block",                  "block")

# 	# NOTE: financial_year is intentionally NOT filtered here at the SQL level.
# 	# A budget spans up to 3 FYs (year_1/year_2/year_3). Filtering CB.financial_year
# 	# would exclude budgets whose selected FY falls in year_2 or year_3.
# 	# _budget_amounts_bulk / _utilisation_amounts_bulk handle FY filtering correctly
# 	# by summing only the year columns that match the selected FY(s).
# 	# Budgets where no year column matches will simply contribute 0 to all amounts.

# 	# Overlap logic: include budgets whose period intersects the selected date range
# 	if filters.get("start_date"):
# 		params["start_date"] = filters["start_date"]
# 		conditions.append("CB.end_date >= %(start_date)s")
# 	if filters.get("end_date"):
# 		params["end_date"] = filters["end_date"]
# 		conditions.append("CB.start_date <= %(end_date)s")

# 	where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
# 	return where, params


# # ─── Percent helper ────────────────────────────────────────────────────────────

# def calc_percents(row):
# 	budget      = row.get("total_budget")      or 0
# 	utilisation = row.get("total_utilisation") or 0
# 	disbursed   = row.get("total_disbursed")   or 0
# 	row["utilised_vs_budget"]    = round((utilisation / budget)    * 100, 0) if budget    > 0 else 0
# 	row["utilised_vs_disbursed"] = round((utilisation / disbursed) * 100, 0) if disbursed > 0 else 0


# # ─── Budget amount: sum correct year columns ───────────────────────────────────

# def _budget_amount_for_budget(cb_name, budget_start_date, filters):
# 	"""
# 	Sum year_1 / year_2 / year_3 from Budget Items for a single Creche Budget,
# 	considering which year columns fall within the filtered FYs / date range.

# 	Rules:
# 	  - year_1 → FY containing budget_start_date
# 	  - year_2 → next FY
# 	  - year_3 → FY after that

# 	If financial_year filter is set  → only include columns whose FY is in the list.
# 	If start_date / end_date filter is set → only include columns whose FY overlaps
# 	  the selected date range (FY start ≤ filter end_date AND FY end ≥ filter start_date).
# 	If neither filter is set         → sum all three columns.
# 	"""
# 	filter_fys  = filters.get("financial_year") or []
# 	if isinstance(filter_fys, str):
# 		filter_fys = [filter_fys]
# 	filter_fys = set(filter_fys)

# 	filter_start = filters.get("start_date")
# 	filter_end   = filters.get("end_date")
# 	if isinstance(filter_start, str) and filter_start:
# 		filter_start = date.fromisoformat(str(filter_start)[:10])
# 	if isinstance(filter_end, str) and filter_end:
# 		filter_end = date.fromisoformat(str(filter_end)[:10])

# 	# Determine which columns to include
# 	cols_to_sum = []
# 	for offset, col in enumerate(["year_1", "year_2", "year_3"]):
# 		col_fy = _fy_for_year_col(budget_start_date, offset)
# 		if col_fy is None:
# 			continue

# 		# Financial year filter
# 		if filter_fys and col_fy not in filter_fys:
# 			continue

# 		# Date range filter — check if this year column's FY overlaps the range
# 		if filter_start or filter_end:
# 			fy_s, fy_e = _fy_start_end(col_fy)
# 			if filter_end and fy_s > filter_end:
# 				continue
# 			if filter_start and fy_e < filter_start:
# 				continue

# 		cols_to_sum.append(col)

# 	if not cols_to_sum:
# 		return 0.0

# 	col_expr = " + ".join([f"COALESCE(bi.{c}, 0)" for c in cols_to_sum])
# 	result = frappe.db.sql(
# 		f"""
# 		SELECT SUM({col_expr}) AS total
# 		FROM `tabBudget Items` bi
# 		WHERE bi.parent = %(cb_name)s
# 		  AND bi.parenttype = 'Creche Budget'
# 		""",
# 		{"cb_name": cb_name},
# 		as_dict=True,
# 	)
# 	return float((result[0]["total"] or 0) if result else 0)


# def _budget_amounts_bulk(cb_names_start_dates, filters):
# 	"""
# 	Fetch budget amounts for a list of (cb_name, start_date, end_date) tuples.
# 	Returns dict {cb_name: amount}.

# 	year_1/year_2/year_3 columns are selected purely by whether their FY period
# 	overlaps the filter date range (start_date / end_date).
# 	financial_year filter is intentionally IGNORED here — budget amounts are
# 	determined by the budget's own start/end dates, not its FY field.

# 	Groups budgets by their (year_cols_to_sum) signature to minimise DB queries.
# 	"""
# 	if not cb_names_start_dates:
# 		return {}

# 	from collections import defaultdict
# 	groups = defaultdict(list)   # col_tuple → [cb_name, …]

# 	filter_start = filters.get("start_date")
# 	filter_end   = filters.get("end_date")
# 	if isinstance(filter_start, str) and filter_start:
# 		filter_start = date.fromisoformat(str(filter_start)[:10])
# 	if isinstance(filter_end, str) and filter_end:
# 		filter_end = date.fromisoformat(str(filter_end)[:10])

# 	# financial_year filter → convert to date range (April 1 → March 31 of each selected FY)
# 	# This is intersected with any explicit start_date/end_date filter.
# 	filter_fys = filters.get("financial_year") or []
# 	if isinstance(filter_fys, str):
# 		filter_fys = [filter_fys]
# 	filter_fys = set(filter_fys)
# 	if filter_fys:
# 		# Union of all selected FY date ranges
# 		fy_starts = [_fy_start_end(fy)[0] for fy in filter_fys]
# 		fy_ends   = [_fy_start_end(fy)[1] for fy in filter_fys]
# 		fy_start  = min(fy_starts)
# 		fy_end    = max(fy_ends)
# 		# Intersect with explicit date filters if both present
# 		filter_start = max(filter_start, fy_start) if filter_start else fy_start
# 		filter_end   = min(filter_end,   fy_end)   if filter_end   else fy_end

# 	for cb_name, start_d in cb_names_start_dates:
# 		cols = []
# 		for offset, col in enumerate(["year_1", "year_2", "year_3"]):
# 			col_fy = _fy_for_year_col(start_d, offset)
# 			if col_fy is None:
# 				continue
# 			# Include this year column only if its FY overlaps the filter date range.
# 			# When no date filter is set, include all three columns (full budget).
# 			if filter_start or filter_end:
# 				fy_s, fy_e = _fy_start_end(col_fy)
# 				if filter_end and fy_s > filter_end:
# 					continue   # FY starts after filter window
# 				if filter_start and fy_e < filter_start:
# 					continue   # FY ends before filter window
# 			cols.append(col)
# 		col_tuple = tuple(cols)
# 		groups[col_tuple].append(cb_name)

# 	result = {}
# 	for col_tuple, names in groups.items():
# 		if not col_tuple:
# 			for n in names:
# 				result[n] = 0.0
# 			continue

# 		col_expr = " + ".join([f"COALESCE(bi.{c}, 0)" for c in col_tuple])
# 		placeholders = ", ".join([f"%(n{i})s" for i in range(len(names))])
# 		params = {f"n{i}": n for i, n in enumerate(names)}
# 		rows = frappe.db.sql(
# 			f"""
# 			SELECT bi.parent AS cb_name, SUM({col_expr}) AS total
# 			FROM `tabBudget Items` bi
# 			WHERE bi.parent IN ({placeholders})
# 			  AND bi.parenttype = 'Creche Budget'
# 			GROUP BY bi.parent
# 			""",
# 			params,
# 			as_dict=True,
# 		)
# 		fetched = {r["cb_name"]: float(r["total"] or 0) for r in rows}
# 		for n in names:
# 			result[n] = fetched.get(n, 0.0)

# 	return result


# # ─── Utilisation: filter by FY + month ────────────────────────────────────────

# def _utilisation_amounts_bulk(cb_names, filters):
# 	"""
# 	Returns dict {cb_name: (total_utilisation, bank_balance)}.

# 	Filters:
# 	  - financial_year filter → restrict to those FYs
# 	  - start_date / end_date → derive (FY, month) pairs covering the range,
# 	    and restrict to those
# 	  - Both can apply simultaneously (intersection)
# 	"""
# 	if not cb_names:
# 		return {}

# 	filter_fys  = filters.get("financial_year") or []
# 	if isinstance(filter_fys, str):
# 		filter_fys = [filter_fys]
# 	filter_fys = set(filter_fys)

# 	filter_start = filters.get("start_date")
# 	filter_end   = filters.get("end_date")

# 	extra_conditions = []
# 	params = {}

# 	# Utilisation: filter by CU.financial_year and CU.month (stored fields on the doc).
# 	# financial_year filter → match CU.financial_year directly.
# 	# month filter → match CU.month directly.
# 	# start_date / end_date → derive (FY, month) pairs covering the range and filter by those.
# 	# When financial_year + month are both set they are treated as a linked pair:
# 	#   e.g. FY=2025-26 + month=June  →  only "June of FY 2025-26"
# 	#   e.g. FY=2025-26 only          →  all months of that FY
# 	#   e.g. month=June only          →  June across all FYs
# 	# Date range overrides / intersects the FY+month selection.

# 	filter_fys = filters.get("financial_year") or []
# 	if isinstance(filter_fys, str):
# 		filter_fys = [filter_fys]
# 	filter_fys = set(filter_fys)

# 	# month is now MultiSelectList → can be a list of month names
# 	month_filter_raw = filters.get("month") or []
# 	if isinstance(month_filter_raw, str):
# 		month_filter_raw = [month_filter_raw] if month_filter_raw.strip() else []
# 	month_filters = [m.strip() for m in month_filter_raw if str(m).strip()]
# 	# For backward compatibility keep month_filter as first value for single checks
# 	month_filter = month_filters[0] if len(month_filters) == 1 else ""

# 	if filter_start and filter_end:
# 		# Date range → enumerate every (FY, month) in the range
# 		pairs = _fy_month_pairs_in_range(filter_start, filter_end)
# 		if pairs:
# 			pair_clauses = []
# 			for i, (fy, mn) in enumerate(pairs):
# 				params[f"pfy{i}"] = fy
# 				params[f"pmn{i}"] = mn
# 				pair_clauses.append(
# 					f"(CU.financial_year = %(pfy{i})s AND CU.month = %(pmn{i})s)"
# 				)
# 			extra_conditions.append("(" + " OR ".join(pair_clauses) + ")")
# 		else:
# 			extra_conditions.append("1 = 0")

# 	elif filter_start:
# 		# Only lower bound — from this (FY, month) onwards
# 		d  = date.fromisoformat(str(filter_start)[:10]) if isinstance(filter_start, str) else filter_start
# 		fy = _date_to_fy(d)
# 		mn = calendar.month_name[d.month]
# 		pos = _FY_MONTH_POS.get(mn, 0)
# 		later = _FY_MONTH_NAMES[pos:]
# 		lm_ph = ", ".join([f"%(slm{i})s" for i in range(len(later))])
# 		for i, m in enumerate(later):
# 			params[f"slm{i}"] = m
# 		params["fy_start"] = fy
# 		extra_conditions.append(
# 			f"(CU.financial_year > %(fy_start)s OR "
# 			f"(CU.financial_year = %(fy_start)s AND CU.month IN ({lm_ph})))"
# 		)

# 	elif filter_end:
# 		# Only upper bound — up to this (FY, month)
# 		d  = date.fromisoformat(str(filter_end)[:10]) if isinstance(filter_end, str) else filter_end
# 		fy = _date_to_fy(d)
# 		mn = calendar.month_name[d.month]
# 		pos = _FY_MONTH_POS.get(mn, 0)
# 		earlier = _FY_MONTH_NAMES[:pos + 1]
# 		em_ph = ", ".join([f"%(elm{i})s" for i in range(len(earlier))])
# 		for i, m in enumerate(earlier):
# 			params[f"elm{i}"] = m
# 		params["fy_end"] = fy
# 		extra_conditions.append(
# 			f"(CU.financial_year < %(fy_end)s OR "
# 			f"(CU.financial_year = %(fy_end)s AND CU.month IN ({em_ph})))"
# 		)

# 	else:
# 		# No date range — use FY + month filters directly
# 		if filter_fys and month_filters:
# 			# Linked pairs: each FY × each selected month
# 			pair_clauses = []
# 			k = 0
# 			for fy in sorted(filter_fys):
# 				for mn in month_filters:
# 					params[f"pfy{k}"] = fy
# 					params[f"pmn{k}"] = mn
# 					pair_clauses.append(
# 						f"(CU.financial_year = %(pfy{k})s AND CU.month = %(pmn{k})s)"
# 					)
# 					k += 1
# 			extra_conditions.append("(" + " OR ".join(pair_clauses) + ")")
# 		elif filter_fys:
# 			# FY only — all months
# 			ph = ", ".join([f"%(fy{i})s" for i in range(len(filter_fys))])
# 			for i, fy in enumerate(sorted(filter_fys)):
# 				params[f"fy{i}"] = fy
# 			extra_conditions.append(f"CU.financial_year IN ({ph})")
# 		elif month_filters:
# 			# Month(s) only — across all FYs
# 			ph = ", ".join([f"%(mf{i})s" for i in range(len(month_filters))])
# 			for i, m in enumerate(month_filters):
# 				params[f"mf{i}"] = m
# 			extra_conditions.append(f"CU.month IN ({ph})")

# 	# where_extra uses "CU." prefix for outer queries aliased as CU.
# 	# where_extra_bare strips "CU." for use inside subqueries without an alias.
# 	where_extra      = (" AND " + " AND ".join(extra_conditions)) if extra_conditions else ""
# 	where_extra_bare = where_extra.replace("CU.", "") if where_extra else ""

# 	# Build IN clause for cb_names
# 	name_ph = ", ".join([f"%(cb{i})s" for i in range(len(cb_names))])
# 	for i, n in enumerate(cb_names):
# 		params[f"cb{i}"] = n

# 	rows = frappe.db.sql(
# 		f"""
# 		SELECT
# 			CU.budget_reference_id          AS cb_name,
# 			SUM(CU.total_utilisation)        AS total_utilisation
# 		FROM `tabCreche utilisation` CU
# 		WHERE CU.budget_reference_id IN ({name_ph})
# 		  {where_extra}
# 		GROUP BY CU.budget_reference_id
# 		""",
# 		params,
# 		as_dict=True,
# 	)

# 	# Fetch bank balance separately: latest record per budget within the period.
# 	# The inner subquery has no alias so we use where_extra_bare (no "CU." prefix).
# 	bal_rows = frappe.db.sql(
# 		f"""
# 		SELECT CU.budget_reference_id AS cb_name, CU.balance_amount
# 		FROM `tabCreche utilisation` CU
# 		INNER JOIN (
# 			SELECT budget_reference_id, MAX(modified) AS max_mod
# 			FROM `tabCreche utilisation`
# 			WHERE budget_reference_id IN ({name_ph})
# 			  {where_extra_bare}
# 			GROUP BY budget_reference_id
# 		) latest ON CU.budget_reference_id = latest.budget_reference_id
# 			AND CU.modified = latest.max_mod
# 		WHERE CU.budget_reference_id IN ({name_ph})
# 		  {where_extra}
# 		""",
# 		params,
# 		as_dict=True,
# 	)
# 	bal_map = {r["cb_name"]: float(r["balance_amount"] or 0) for r in bal_rows}

# 	result = {}
# 	for r in rows:
# 		n = r["cb_name"]
# 		result[n] = (
# 			float(r["total_utilisation"] or 0),
# 			bal_map.get(n, 0.0),
# 		)
# 	# Fill zeros for budgets with no utilisation records
# 	for n in cb_names:
# 		if n not in result:
# 			result[n] = (0.0, 0.0)
# 	return result


# # ─── Disbursement: filter by date_of_disbursement ────────────────────────────

# def _disbursement_amounts_bulk(cb_names, filters):
# 	"""
# 	Returns dict {cb_name: total_disbursed}.

# 	Disbursement Tracker child rows have date_of_disbursement + disbursed_amount.
# 	Parent Creche Disbursement has budget_reference_id + financial_year.

# 	Filters applied:
# 	  - financial_year filter → restrict parent CD.financial_year
# 	  - start_date / end_date → restrict DT.date_of_disbursement
# 	"""
# 	if not cb_names:
# 		return {}

# 	# Disbursement has no month field — filter is always on DT.date_of_disbursement.
# 	# Priority:
# 	#   1. start_date / end_date  → direct date range on date_of_disbursement
# 	#   2. financial_year + month → convert each (FY, month) pair to its calendar
# 	#      date range (1st of month → last of month) and filter by those ranges
# 	#   3. financial_year only    → filter by the full April–March date span of each FY
# 	#   4. month only             → filter by that calendar month number across all years

# 	filter_start = filters.get("start_date")
# 	filter_end   = filters.get("end_date")
# 	if isinstance(filter_start, str) and filter_start:
# 		filter_start = date.fromisoformat(str(filter_start)[:10])
# 	if isinstance(filter_end, str) and filter_end:
# 		filter_end = date.fromisoformat(str(filter_end)[:10])

# 	filter_fys = filters.get("financial_year") or []
# 	if isinstance(filter_fys, str):
# 		filter_fys = [filter_fys]
# 	filter_fys = set(filter_fys)

# 	month_filter_raw = filters.get("month") or []
# 	if isinstance(month_filter_raw, str):
# 		month_filter_raw = [month_filter_raw] if month_filter_raw.strip() else []
# 	month_filters = [m.strip() for m in month_filter_raw if str(m).strip()]

# 	extra_conditions = []
# 	params = {}

# 	if filter_start or filter_end:
# 		# Explicit date range takes priority — simple bounds on date_of_disbursement
# 		if filter_start:
# 			params["d_start"] = filter_start
# 			extra_conditions.append("DT.date_of_disbursement >= %(d_start)s")
# 		if filter_end:
# 			params["d_end"] = filter_end
# 			extra_conditions.append("DT.date_of_disbursement <= %(d_end)s")

# 	elif filter_fys and month_filters:
# 		# FY + month(s) → convert to (first_of_month, last_of_month) date ranges
# 		date_clauses = []
# 		k = 0
# 		for fy in sorted(filter_fys):
# 			fy_start_year = int(fy.split("-")[0])
# 			for mn in month_filters:
# 				month_num = list(calendar.month_name).index(mn)  # April=4, …, March=3
# 				# Determine which calendar year this month falls in within the FY
# 				year = fy_start_year if month_num >= 4 else fy_start_year + 1
# 				last_day = calendar.monthrange(year, month_num)[1]
# 				params[f"dds{k}"] = date(year, month_num, 1)
# 				params[f"dde{k}"] = date(year, month_num, last_day)
# 				date_clauses.append(
# 					f"(DT.date_of_disbursement >= %(dds{k})s "
# 					f"AND DT.date_of_disbursement <= %(dde{k})s)"
# 				)
# 				k += 1
# 		if date_clauses:
# 			extra_conditions.append("(" + " OR ".join(date_clauses) + ")")
# 		else:
# 			extra_conditions.append("1 = 0")

# 	elif filter_fys:
# 		# FY only → full April–March span of each FY
# 		date_clauses = []
# 		for k, fy in enumerate(sorted(filter_fys)):
# 			fy_start_year = int(fy.split("-")[0])
# 			params[f"fys{k}"] = date(fy_start_year, 4, 1)
# 			params[f"fye{k}"] = date(fy_start_year + 1, 3, 31)
# 			date_clauses.append(
# 				f"(DT.date_of_disbursement >= %(fys{k})s "
# 				f"AND DT.date_of_disbursement <= %(fye{k})s)"
# 			)
# 		extra_conditions.append("(" + " OR ".join(date_clauses) + ")")

# 	elif month_filters:
# 		# Month(s) only → filter by calendar month number, any year
# 		month_nums = [list(calendar.month_name).index(mn) for mn in month_filters if mn in calendar.month_name]
# 		if month_nums:
# 			mn_ph = ", ".join([f"%(dmn{i})s" for i in range(len(month_nums))])
# 			for i, mn in enumerate(month_nums):
# 				params[f"dmn{i}"] = mn
# 			extra_conditions.append(f"MONTH(DT.date_of_disbursement) IN ({mn_ph})")

# 	where_extra = (" AND " + " AND ".join(extra_conditions)) if extra_conditions else ""

# 	name_ph = ", ".join([f"%(dcb{i})s" for i in range(len(cb_names))])
# 	for i, n in enumerate(cb_names):
# 		params[f"dcb{i}"] = n

# 	rows = frappe.db.sql(
# 		f"""
# 		SELECT
# 			CD.budget_reference_id  AS cb_name,
# 			SUM(DT.disbursed_amount) AS total_disbursed
# 		FROM `tabCreche Disbursement` CD
# 		INNER JOIN `tabDisbursement Tracker` DT
# 			ON DT.parent = CD.name
# 			AND DT.parenttype = 'Creche Disbursement'
# 		WHERE CD.budget_reference_id IN ({name_ph})
# 		  {where_extra}
# 		GROUP BY CD.budget_reference_id
# 		""",
# 		params,
# 		as_dict=True,
# 	)

# 	result = {r["cb_name"]: float(r["total_disbursed"] or 0) for r in rows}
# 	for n in cb_names:
# 		if n not in result:
# 			result[n] = 0.0
# 	return result


# # ─── Main data fetch ───────────────────────────────────────────────────────────

# def _fetch_budgets(filters):
# 	"""Fetch base budget rows (metadata only, no amounts yet)."""
# 	conditions, params = build_conditions(filters)
# 	return frappe.db.sql(
# 		f"""
# 		SELECT
# 			CB.name                                          AS cb_name,
# 			CB.partner_id,
# 			CB.partner_name,
# 			CB.budget_reference_name,
# 			CB.state,
# 			CB.district,
# 			CB.block,
# 			CB.financial_year,
# 			COALESCE(CB.no_of_creches, 0)                   AS no_of_creches,
# 			CB.start_date,
# 			CB.end_date,
# 			CB.grant_id
# 		FROM `tabCreche Budget` CB
# 		{conditions}
# 		ORDER BY CB.partner_name ASC, CB.budget_reference_name ASC
# 		""",
# 		params,
# 		as_dict=True,
# 	)


# def _sum_rows(rows):
# 	return {
# 		"total_budget":      sum(r["total_budget"]      for r in rows),
# 		"total_utilisation": sum(r["total_utilisation"] for r in rows),
# 		"total_disbursed":   sum(r["total_disbursed"]   for r in rows),
# 		"bank_balance":      sum(r["bank_balance"]      for r in rows),
# 		"no_of_creches":     sum(r["no_of_creches"]     for r in rows),
# 	}


# def get_data(filters):
# 	level       = (filters.get("level") or "partner wise").lower()
# 	budgets     = _fetch_budgets(filters)

# 	if not budgets:
# 		return []

# 	cb_names = [b["cb_name"] for b in budgets]

# 	# ── Bulk-fetch all amounts ─────────────────────────────────────────────────
# 	budget_amounts  = _budget_amounts_bulk(
# 		[(b["cb_name"], b["start_date"]) for b in budgets], filters
# 	)
# 	util_amounts    = _utilisation_amounts_bulk(cb_names, filters)
# 	disb_amounts    = _disbursement_amounts_bulk(cb_names, filters)

# 	# Attach amounts to each budget row
# 	for b in budgets:
# 		n = b["cb_name"]
# 		b["total_budget"]      = budget_amounts.get(n, 0.0)
# 		b["total_utilisation"], b["bank_balance"] = util_amounts.get(n, (0.0, 0.0))
# 		b["total_disbursed"]   = disb_amounts.get(n, 0.0)

# 	# Drop zero-amount budgets when any period filter is active (FY, month, or date range).
# 	# Prevents showing ₹0 ghost rows for budgets outside the selected period.
# 	period_filter_active = bool(
# 		filters.get("financial_year") or
# 		filters.get("month") or
# 		filters.get("start_date") or
# 		filters.get("end_date")
# 	)
# 	if period_filter_active:
# 		budgets = [
# 			b for b in budgets
# 			if b["total_budget"] > 0
# 			or b["total_utilisation"] > 0
# 			or b["total_disbursed"] > 0
# 		]

# 	result = []
# 	grand_budget = grand_utilisation = grand_disbursed = grand_balance = grand_creches = 0

# 	if level == "budget wise":
# 		for b in budgets:
# 			row = {
# 				"row_name":          b["budget_reference_name"],
# 				"partner_id":        b["partner_id"],
# 				"state":             b["state"],
# 				"financial_year":    b["financial_year"],
# 				"no_of_creches":     b["no_of_creches"],
# 				"start_date":        b["start_date"],
# 				"end_date":          b["end_date"],
# 				"grant_id":          b["grant_id"],
# 				"total_budget":      b["total_budget"],
# 				"total_utilisation": b["total_utilisation"],
# 				"total_disbursed":   b["total_disbursed"],
# 				"bank_balance":      b["bank_balance"],
# 				"indent":            0,
# 				"is_budget_row":     1,
# 			}
# 			calc_percents(row)
# 			result.append(row)
# 			grand_budget      += b["total_budget"]
# 			grand_utilisation += b["total_utilisation"]
# 			grand_disbursed   += b["total_disbursed"]
# 			grand_balance     += b["bank_balance"]
# 			grand_creches     += b["no_of_creches"]

# 	elif level in ("partner wise", "partner"):
# 		partner_map = OrderedDict()
# 		for b in budgets:
# 			pid = b["partner_id"]
# 			if pid not in partner_map:
# 				partner_map[pid] = {"meta": b, "rows": []}
# 			partner_map[pid]["rows"].append(b)

# 		for pid, info in partner_map.items():
# 			rows  = info["rows"]
# 			meta  = info["meta"]
# 			totals = _sum_rows(rows)
# 			unique_states = sorted({r["state"] for r in rows if r.get("state")})

# 			parent_row = {
# 				"row_name":          meta["partner_name"],
# 				"partner_id":        pid,
# 				"state":             ", ".join(unique_states),
# 				"financial_year":    "",
# 				"no_of_creches":     totals["no_of_creches"],
# 				"start_date":        None,
# 				"end_date":          None,
# 				"grant_id":          "",
# 				"total_budget":      totals["total_budget"],
# 				"total_utilisation": totals["total_utilisation"],
# 				"total_disbursed":   totals["total_disbursed"],
# 				"bank_balance":      totals["bank_balance"],
# 				"indent":            0,
# 			}
# 			calc_percents(parent_row)
# 			result.append(parent_row)
# 			grand_budget      += totals["total_budget"]
# 			grand_utilisation += totals["total_utilisation"]
# 			grand_disbursed   += totals["total_disbursed"]
# 			grand_balance     += totals["bank_balance"]
# 			grand_creches     += totals["no_of_creches"]

# 			for idx, b in enumerate(rows):
# 				child_row = {
# 					"row_name":          b["budget_reference_name"],
# 					"partner_id":        b["partner_id"],
# 					"state":             b["state"],
# 					"financial_year":    b["financial_year"],
# 					"no_of_creches":     b["no_of_creches"],
# 					"start_date":        b["start_date"],
# 					"end_date":          b["end_date"],
# 					"grant_id":          b["grant_id"],
# 					"total_budget":      b["total_budget"],
# 					"total_utilisation": b["total_utilisation"],
# 					"total_disbursed":   b["total_disbursed"],
# 					"bank_balance":      b["bank_balance"],
# 					"indent":            1,
# 					"_row_idx":          idx,
# 				}
# 				calc_percents(child_row)
# 				result.append(child_row)

# 	else:
# 		# State / District / Block grouping
# 		location_field = level
# 		group_map = OrderedDict()
# 		for b in budgets:
# 			group_val = b.get(location_field) or "Unknown"
# 			pid = b["partner_id"]
# 			if group_val not in group_map:
# 				group_map[group_val] = OrderedDict()
# 			if pid not in group_map[group_val]:
# 				group_map[group_val][pid] = {"meta": b, "rows": []}
# 			group_map[group_val][pid]["rows"].append(b)

# 		for group_val in sorted(group_map.keys()):
# 			partners = group_map[group_val]
# 			all_rows = [r for p_data in partners.values() for r in p_data["rows"]]
# 			g_totals = _sum_rows(all_rows)

# 			parent_row = {
# 				"row_name":          group_val,
# 				"partner_id":        "",
# 				"state":             group_val if location_field == "state" else "",
# 				"financial_year":    "",
# 				"no_of_creches":     g_totals["no_of_creches"],
# 				"start_date":        None,
# 				"end_date":          None,
# 				"grant_id":          "",
# 				"total_budget":      g_totals["total_budget"],
# 				"total_utilisation": g_totals["total_utilisation"],
# 				"total_disbursed":   g_totals["total_disbursed"],
# 				"bank_balance":      g_totals["bank_balance"],
# 				"indent":            0,
# 			}
# 			calc_percents(parent_row)
# 			result.append(parent_row)
# 			grand_budget      += g_totals["total_budget"]
# 			grand_utilisation += g_totals["total_utilisation"]
# 			grand_disbursed   += g_totals["total_disbursed"]
# 			grand_balance     += g_totals["bank_balance"]
# 			grand_creches     += g_totals["no_of_creches"]

# 			for idx, (pid, p_data) in enumerate(partners.items()):
# 				rows   = p_data["rows"]
# 				meta   = p_data["meta"]
# 				p_totals = _sum_rows(rows)
# 				child_row = {
# 					"row_name":          meta["partner_name"],
# 					"partner_id":        pid,
# 					"state":             meta.get("state", ""),
# 					"financial_year":    "",
# 					"no_of_creches":     p_totals["no_of_creches"],
# 					"start_date":        None,
# 					"end_date":          None,
# 					"grant_id":          "",
# 					"total_budget":      p_totals["total_budget"],
# 					"total_utilisation": p_totals["total_utilisation"],
# 					"total_disbursed":   p_totals["total_disbursed"],
# 					"bank_balance":      p_totals["bank_balance"],
# 					"indent":            1,
# 					"_row_idx":          idx,
# 				}
# 				calc_percents(child_row)
# 				result.append(child_row)

# 	if result:
# 		grand_row = {
# 			"row_name":          "Grand Total",
# 			"partner_id":        "",
# 			"state":             "",
# 			"financial_year":    "",
# 			"no_of_creches":     grand_creches,
# 			"start_date":        None,
# 			"end_date":          None,
# 			"grant_id":          "",
# 			"total_budget":      grand_budget,
# 			"total_utilisation": grand_utilisation,
# 			"total_disbursed":   grand_disbursed,
# 			"bank_balance":      grand_balance,
# 			"indent":            0,
# 			"is_grand_total":    1,
# 		}
# 		calc_percents(grand_row)
# 		result.append(grand_row)

# 	return result


# # ─── Excel export ──────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def download_excel(filters=None):
# 	import io
# 	import json

# 	import openpyxl
# 	from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
# 	from openpyxl.utils import get_column_letter

# 	if isinstance(filters, str):
# 		filters = json.loads(filters)
# 	filters = filters or {}

# 	level = (filters.get("level") or "partner wise").lower()
# 	data  = get_data(filters)

# 	level_titles = {
# 		"partner wise": "Partner Wise",
# 		"budget wise":  "Budget Wise",
# 		"state":        "State Wise",
# 		"district":     "District Wise",
# 		"block":        "Block Wise",
# 	}
# 	level_label = level_titles.get(level, level.title())

# 	wb = openpyxl.Workbook()
# 	ws = wb.active
# 	ws.title = level_label[:31]

# 	def solid(h):
# 		return PatternFill("solid", fgColor=h)

# 	def fnt(bold=False, color="000000", size=10):
# 		return Font(bold=bold, color=color, size=size)

# 	thin   = Side(style="thin", color="C8E6C9")
# 	BORDER = Border(bottom=thin, left=thin, right=thin)
# 	CENTER   = Alignment(horizontal="center", vertical="center", wrap_text=True)
# 	RIGHT_VC = Alignment(horizontal="right",  vertical="center", wrap_text=True)
# 	LEFT_VC  = Alignment(horizontal="left",   vertical="center", wrap_text=True)

# 	HDR_FILL = solid("1B5E20"); HDR_FONT = fnt(bold=True, color="FFFFFF", size=11)
# 	PAR_FILL = solid("C8E6C9"); PAR_FONT = fnt(bold=True, color="1B5E20", size=10)
# 	BUD_FILL_ODD  = solid("FFFFFF")
# 	BUD_FILL_EVEN = solid("F1F8E9")
# 	BUD_FONT = fnt(size=10)
# 	G_FILL = solid("DCFCE7"); G_FONT = fnt(bold=True, color="166534")
# 	O_FILL = solid("FEF9C3"); O_FONT = fnt(bold=True, color="854D0E")
# 	R_FILL = solid("FEE2E2"); R_FONT = fnt(bold=True, color="991B1B")
# 	TOT_FILL = solid("1B5E20"); TOT_FONT = fnt(bold=True, color="FFFFFF", size=11)
# 	FLT_FILL = solid("F1F8E9"); FLT_FONT = fnt(size=10, color="1B5E20")
# 	TTL_FILL = solid("C8E6C9"); TTL_FONT = fnt(bold=True, color="1B5E20", size=13)
# 	SUB_FILL = solid("E8F5E9")

# 	first_col_hdr = {
# 		"budget wise": "Budget Reference",
# 		"state":       "State / Partner",
# 		"district":    "District / Partner",
# 		"block":       "Block / Partner",
# 	}.get(level, "Partner / Budget")

# 	COLS = [
# 		(first_col_hdr,             "row_name",              40, "str"),
# 		("Partner ID",              "partner_id",            18, "str"),
# 		("State",                   "state",                 18, "str"),
# 		("FY",                      "financial_year",        10, "str"),
# 		("No of Creches",           "no_of_creches",         14, "int"),
# 		("Start Date",              "start_date",            14, "date"),
# 		("End Date",                "end_date",              14, "date"),
# 		("Grant ID",                "grant_id",              16, "str"),
# 		("Budget (₹)",              "total_budget",          22, "cur"),
# 		("Utilisation (₹)",         "total_utilisation",     22, "cur"),
# 		("Disbursed Amount (₹)",    "total_disbursed",       26, "cur"),
# 		("Bank Balance (₹)",        "bank_balance",          22, "cur"),
# 		("Utilized vs Budget %",    "utilised_vs_budget",    24, "pct"),
# 		("Utilized vs Disbursed %", "utilised_vs_disbursed", 26, "pct"),
# 	]
# 	N_COLS = len(COLS)

# 	for i, (_h, _fn, width, _dt) in enumerate(COLS, 1):
# 		ws.column_dimensions[get_column_letter(i)].width = width

# 	cur_row = 0

# 	def next_row(height=16):
# 		nonlocal cur_row
# 		cur_row += 1
# 		ws.row_dimensions[cur_row].height = height
# 		return cur_row

# 	def merge_row(r, value, fill, font, height=18, align=LEFT_VC):
# 		ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=N_COLS)
# 		cell = ws.cell(row=r, column=1, value=value)
# 		cell.fill = fill; cell.font = font; cell.alignment = align
# 		ws.row_dimensions[r].height = height

# 	r = next_row(30)
# 	merge_row(r, f"Creche Budget Utilisation Report — {level_label}", TTL_FILL, TTL_FONT, 30)

# 	active = {k: v for k, v in filters.items()
# 	          if v not in (None, "", []) and not (isinstance(v, list) and len(v) == 0)}

# 	if active:
# 		r = next_row(14)
# 		merge_row(r, "Filters Applied", SUB_FILL, fnt(bold=True, color="1B5E20", size=10), 14)
# 		for key, val in active.items():
# 			label = _FILTER_LABELS.get(key, key.replace("_", " ").title())
# 			display_val = ", ".join(str(v) for v in val) if isinstance(val, list) else str(val)
# 			r = next_row(16)
# 			ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=N_COLS)
# 			cell = ws.cell(row=r, column=1, value=f"  {label}:  {display_val}")
# 			cell.fill = FLT_FILL; cell.font = FLT_FONT; cell.alignment = LEFT_VC

# 	next_row(8)

# 	r = next_row(28)
# 	for i, (hdr, *_rest) in enumerate(COLS, 1):
# 		cell = ws.cell(row=r, column=i, value=hdr)
# 		cell.fill = HDR_FILL; cell.font = HDR_FONT
# 		cell.alignment = CENTER; cell.border = BORDER
# 	ws.freeze_panes = f"A{r + 1}"

# 	do_pid_merge = (level in ("partner wise", "partner"))
# 	group_spans  = []
# 	parent_r     = None
# 	last_child_r = None
# 	alt          = 0

# 	for row_data in data:
# 		is_grand_total = bool(row_data.get("is_grand_total"))
# 		is_parent      = row_data.get("indent", 0) == 0
# 		is_budget_row  = bool(row_data.get("is_budget_row"))

# 		r = next_row(24 if is_grand_total else (22 if is_parent else 18))

# 		if is_parent and not is_grand_total:
# 			if do_pid_merge and parent_r and last_child_r:
# 				group_spans.append((parent_r, last_child_r))
# 			parent_r = r; last_child_r = None; alt = 0
# 		elif not is_parent:
# 			last_child_r = r; alt += 1

# 		for col_idx, (_hdr, fieldname, _w, dtype) in enumerate(COLS, 1):
# 			raw  = row_data.get(fieldname)
# 			cell = ws.cell(row=r, column=col_idx)
# 			cell.border = BORDER

# 			if dtype == "cur":
# 				cell.value = float(raw or 0); cell.number_format = "#,##0.00"
# 			elif dtype == "pct":
# 				cell.value = float(raw or 0); cell.number_format = '0.00"%"'
# 			elif dtype == "int":
# 				cell.value = int(raw or 0)
# 			elif dtype == "date":
# 				cell.value = raw if raw else ""; cell.number_format = "DD-MMM-YYYY"
# 			else:
# 				val = str(raw) if raw not in (None, "") else ""
# 				if fieldname == "row_name" and not is_parent:
# 					val = "    " + val
# 				cell.value = val

# 			if is_grand_total:
# 				cell.fill = TOT_FILL; cell.font = TOT_FONT
# 				cell.alignment = RIGHT_VC if dtype in ("cur", "pct", "int") else LEFT_VC
# 			elif is_parent and not is_budget_row:
# 				cell.fill = PAR_FILL; cell.font = PAR_FONT
# 				cell.alignment = RIGHT_VC if dtype in ("cur", "pct", "int") else LEFT_VC
# 			else:
# 				cell.fill = BUD_FILL_ODD if alt % 2 == 1 else BUD_FILL_EVEN
# 				cell.font = BUD_FONT
# 				cell.alignment = RIGHT_VC if dtype in ("cur", "pct", "int") else LEFT_VC

# 			if dtype == "pct" and not (is_parent and not is_budget_row) and not is_grand_total:
# 				pct_val = float(raw or 0)
# 				cell.fill, cell.font = (
# 					(G_FILL, G_FONT) if pct_val >= 75 else
# 					(O_FILL, O_FONT) if pct_val >= 50 else
# 					(R_FILL, R_FONT)
# 				)
# 				cell.alignment = RIGHT_VC

# 	if do_pid_merge and parent_r and last_child_r:
# 		group_spans.append((parent_r, last_child_r))

# 	for p_r, last_c in group_spans:
# 		if last_c > p_r:
# 			ws.merge_cells(start_row=p_r, start_column=2, end_row=last_c, end_column=2)
# 			ws.cell(row=p_r, column=2).alignment = CENTER

# 	buf = io.BytesIO()
# 	wb.save(buf)
# 	buf.seek(0)

# 	safe_level = level_label.replace(" ", "_")
# 	frappe.response["filename"]    = f"Budget_Utilisation_{safe_level}.xlsx"
# 	frappe.response["filecontent"] = buf.getvalue()
# 	frappe.response["type"]        = "binary"

import frappe
from frappe import _
from collections import OrderedDict
import calendar
from datetime import date, timedelta

# Labels shown in the Excel filter summary header
_FILTER_LABELS = {
	"level":            "Level",
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

# Indian FY month order (April = position 0)
_FY_MONTH_NAMES = [
	"April", "May", "June", "July", "August", "September",
	"October", "November", "December", "January", "February", "March",
]
_FY_MONTH_POS = {m: i for i, m in enumerate(_FY_MONTH_NAMES)}  # April→0, March→11


# ─── Financial-year helpers ────────────────────────────────────────────────────

def _date_to_fy(d):
	"""Return FY string (e.g. '2024-25') for a date object."""
	if d is None:
		return None
	if isinstance(d, str):
		d = date.fromisoformat(str(d)[:10])
	if d.month >= 4:
		return f"{d.year}-{str(d.year + 1)[2:]}"
	return f"{d.year - 1}-{str(d.year)[2:]}"


def _fy_start_end(fy_str):
	"""Return (start_date, end_date) for a FY string like '2024-25'."""
	start_year = int(fy_str.split("-")[0])
	return date(start_year, 4, 1), date(start_year + 1, 3, 31)


def _fy_for_year_col(budget_start_date, col_offset):
	"""
	Year 1 = FY containing budget start_date (col_offset=0)
	Year 2 = next FY                         (col_offset=1)
	Year 3 = FY after that                   (col_offset=2)
	Returns the FY string.
	"""
	if budget_start_date is None:
		return None
	if isinstance(budget_start_date, str):
		budget_start_date = date.fromisoformat(str(budget_start_date)[:10])
	base_fy_str = _date_to_fy(budget_start_date)
	base_year   = int(base_fy_str.split("-")[0])
	y = base_year + col_offset
	return f"{y}-{str(y + 1)[2:]}"


def _fy_month_pairs_in_range(start_d, end_d):
	"""
	Return a list of (fy_string, month_name) tuples covering every month
	from start_d to end_d inclusive.
	"""
	if isinstance(start_d, str):
		start_d = date.fromisoformat(str(start_d)[:10])
	if isinstance(end_d, str):
		end_d = date.fromisoformat(str(end_d)[:10])

	pairs = []
	cur = date(start_d.year, start_d.month, 1)
	end_month_start = date(end_d.year, end_d.month, 1)
	while cur <= end_month_start:
		fy = _date_to_fy(cur)
		month_name = calendar.month_name[cur.month]
		pairs.append((fy, month_name))
		if cur.month == 12:
			cur = date(cur.year + 1, 1, 1)
		else:
			cur = date(cur.year, cur.month + 1, 1)
	return pairs


def execute(filters=None):
	filters = filters or {}
	return get_columns(filters), get_data(filters)


def get_columns(filters=None):
	level = ((filters or {}).get("level") or "partner wise").lower()
	first_label = {
		"budget wise": "Budget Reference",
		"state":       "State / Partner",
		"district":    "District / Partner",
		"block":       "Block / Partner",
	}.get(level, "Partner / Budget")

	return [
		{"label": _(first_label),                   "fieldname": "row_name",             "fieldtype": "Data",     "width": 260},
		{"label": _("Partner ID"),                  "fieldname": "partner_id",           "fieldtype": "Data",     "width": 150},
		{"label": _("State"),                       "fieldname": "state",                "fieldtype": "Data",     "width": 200},
		{"label": _("Budget Approval FY"),          "fieldname": "financial_year",       "fieldtype": "Data",     "width": 190},
		{"label": _("No of Creches"),               "fieldname": "no_of_creches",        "fieldtype": "Int",      "width": 120},
		{"label": _("Start Date"),                  "fieldname": "start_date",           "fieldtype": "Date",     "width": 150},
		{"label": _("End Date"),                    "fieldname": "end_date",             "fieldtype": "Date",     "width": 150},
		{"label": _("Grant ID"),                    "fieldname": "grant_id",             "fieldtype": "Data",     "width": 160},
		{"label": _("Approved Budget"),             "fieldname": "total_budget",         "fieldtype": "Currency", "width": 160},
		{"label": _("Utilisation"),                 "fieldname": "total_utilisation",    "fieldtype": "Currency", "width": 150},
		{"label": _("Disbursed Amount"),            "fieldname": "total_disbursed",      "fieldtype": "Currency", "width": 200},
		{"label": _("Unutilized Disbursement"),     "fieldname": "disb_minus_util",      "fieldtype": "Currency", "width": 230},
		{"label": _("Reported Bank Balance"),       "fieldname": "bank_balance",         "fieldtype": "Currency", "width": 230},
		{"label": _("Budget vs Utilized %"),        "fieldname": "utilised_vs_budget",   "fieldtype": "Percent",  "width": 230},
		{"label": _("Disbursed vs Utilized %"),     "fieldname": "utilised_vs_disbursed","fieldtype": "Percent",  "width": 230},
	]


# ─── Condition builder ─────────────────────────────────────────────────────────

def build_conditions(filters):
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

	_add("CB.partner_name",           "partner_id")
	_add("CB.budget_reference_name",  "budget_reference")
	_add("CB.grant_id",               "grant_id")
	_add("CB.state",                  "state")
	_add("CB.district",               "district")
	_add("CB.block",                  "block")

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
	row["disb_minus_util"]       = disbursed - utilisation
	row["utilised_vs_budget"]    = round((utilisation / budget)    * 100, 0) if budget    > 0 else 0
	row["utilised_vs_disbursed"] = round((utilisation / disbursed) * 100, 0) if disbursed > 0 else 0


# ─── Pro-rata budget amount calculation ───────────────────────────────────────

def _months_overlap(a_start, a_end, b_start, b_end):
	overlap_start = max(a_start, b_start)
	overlap_end   = min(a_end,   b_end)
	if overlap_start > overlap_end:
		return 0
	months = 0
	y, m = overlap_start.year, overlap_start.month
	ey, em = overlap_end.year, overlap_end.month
	while (y, m) <= (ey, em):
		months += 1
		m += 1
		if m > 12:
			m = 1; y += 1
	return months


def _active_months_in_fy(budget_start, budget_end, fy_start, fy_end):
	return _months_overlap(budget_start, budget_end, fy_start, fy_end)


def _prorata_for_fy(year_amount, budget_start, budget_end,
                    fy_start, fy_end, filter_start, filter_end):
	if not year_amount:
		return 0.0
	active = _active_months_in_fy(budget_start, budget_end, fy_start, fy_end)
	if active == 0:
		return 0.0
	eff_start = max(filter_start, fy_start)
	eff_end   = min(filter_end,   fy_end)
	if eff_start > eff_end:
		return 0.0
	selected = _months_overlap(budget_start, budget_end, eff_start, eff_end)
	if selected == 0:
		return 0.0
	return float(year_amount) / active * selected


def _budget_amounts_bulk(cb_names_start_dates, filters):
	if not cb_names_start_dates:
		return {}

	filter_fys = filters.get("financial_year") or []
	if isinstance(filter_fys, str):
		filter_fys = [filter_fys]
	filter_fys = set(filter_fys)

	month_filter_raw = filters.get("month") or []
	if isinstance(month_filter_raw, str):
		month_filter_raw = [month_filter_raw] if month_filter_raw.strip() else []
	month_filters = [m.strip() for m in month_filter_raw if str(m).strip()]

	raw_start = filters.get("start_date")
	raw_end   = filters.get("end_date")

	def _to_date(v):
		if not v: return None
		if isinstance(v, date): return v
		return date.fromisoformat(str(v)[:10])

	raw_start = _to_date(raw_start)
	raw_end   = _to_date(raw_end)

	filter_segments = []

	if raw_start or raw_end:
		seg_start = raw_start or (raw_end - timedelta(days=3*366))
		seg_end   = raw_end   or (raw_start + timedelta(days=3*366))
		filter_segments = [(seg_start, seg_end)]

	elif filter_fys and month_filters:
		for fy in sorted(filter_fys):
			fy_start_year = int(fy.split("-")[0])
			for mn in month_filters:
				month_num = list(calendar.month_name).index(mn)
				year      = fy_start_year if month_num >= 4 else fy_start_year + 1
				last_day  = calendar.monthrange(year, month_num)[1]
				filter_segments.append((date(year, month_num, 1),
				                        date(year, month_num, last_day)))

	elif filter_fys:
		for fy in sorted(filter_fys):
			fy_s, fy_e = _fy_start_end(fy)
			filter_segments.append((fy_s, fy_e))

	apply_prorata = bool(filter_segments)

	cb_names = [t[0] for t in cb_names_start_dates]
	placeholders = ", ".join([f"%(n{i})s" for i in range(len(cb_names))])
	params = {f"n{i}": n for i, n in enumerate(cb_names)}

	raw_rows = frappe.db.sql(
		f"""
		SELECT
			bi.parent                       AS cb_name,
			SUM(COALESCE(bi.year_1, 0))     AS year_1,
			SUM(COALESCE(bi.year_2, 0))     AS year_2,
			SUM(COALESCE(bi.year_3, 0))     AS year_3
		FROM `tabBudget Items` bi
		WHERE bi.parent IN ({placeholders})
		  AND bi.parenttype = 'Creche Budget'
		GROUP BY bi.parent
		""",
		params,
		as_dict=True,
	)
	raw_map = {r["cb_name"]: r for r in raw_rows}

	result = {}
	date_map = {}
	for cb_name, start_d, end_d in cb_names_start_dates:
		def _d(v):
			if not v: return None
			if isinstance(v, date): return v
			return date.fromisoformat(str(v)[:10])
		date_map[cb_name] = (_d(start_d), _d(end_d))

	for cb_name in cb_names:
		raw = raw_map.get(cb_name)
		if not raw:
			result[cb_name] = 0.0
			continue

		if not apply_prorata:
			result[cb_name] = float((raw["year_1"] or 0) +
			                        (raw["year_2"] or 0) +
			                        (raw["year_3"] or 0))
			continue

		bud_start, bud_end = date_map.get(cb_name, (None, None))
		if not bud_start or not bud_end:
			result[cb_name] = 0.0
			continue

		total = 0.0
		for offset, col in enumerate(["year_1", "year_2", "year_3"]):
			year_amt = float(raw.get(col) or 0)
			if not year_amt:
				continue
			col_fy  = _fy_for_year_col(bud_start, offset)
			if col_fy is None:
				continue
			fy_s, fy_e = _fy_start_end(col_fy)
			for seg_start, seg_end in filter_segments:
				if seg_end < fy_s or seg_start > fy_e:
					continue
				total += _prorata_for_fy(
					year_amt, bud_start, bud_end,
					fy_s, fy_e, seg_start, seg_end
				)

		result[cb_name] = round(total, 2)

	return result


# ─── Utilisation ──────────────────────────────────────────────────────────────

def _utilisation_amounts_bulk(cb_names, filters):
	if not cb_names:
		return {}

	filter_fys  = filters.get("financial_year") or []
	if isinstance(filter_fys, str):
		filter_fys = [filter_fys]
	filter_fys = set(filter_fys)

	filter_start = filters.get("start_date")
	filter_end   = filters.get("end_date")

	extra_conditions = []
	params = {}

	filter_fys = filters.get("financial_year") or []
	if isinstance(filter_fys, str):
		filter_fys = [filter_fys]
	filter_fys = set(filter_fys)

	month_filter_raw = filters.get("month") or []
	if isinstance(month_filter_raw, str):
		month_filter_raw = [month_filter_raw] if month_filter_raw.strip() else []
	month_filters = [m.strip() for m in month_filter_raw if str(m).strip()]
	month_filter = month_filters[0] if len(month_filters) == 1 else ""

	if filter_start and filter_end:
		pairs = _fy_month_pairs_in_range(filter_start, filter_end)
		if pairs:
			pair_clauses = []
			for i, (fy, mn) in enumerate(pairs):
				params[f"pfy{i}"] = fy
				params[f"pmn{i}"] = mn
				pair_clauses.append(
					f"(CU.financial_year = %(pfy{i})s AND CU.month = %(pmn{i})s)"
				)
			extra_conditions.append("(" + " OR ".join(pair_clauses) + ")")
		else:
			extra_conditions.append("1 = 0")

	elif filter_start:
		d  = date.fromisoformat(str(filter_start)[:10]) if isinstance(filter_start, str) else filter_start
		fy = _date_to_fy(d)
		mn = calendar.month_name[d.month]
		pos = _FY_MONTH_POS.get(mn, 0)
		later = _FY_MONTH_NAMES[pos:]
		lm_ph = ", ".join([f"%(slm{i})s" for i in range(len(later))])
		for i, m in enumerate(later):
			params[f"slm{i}"] = m
		params["fy_start"] = fy
		extra_conditions.append(
			f"(CU.financial_year > %(fy_start)s OR "
			f"(CU.financial_year = %(fy_start)s AND CU.month IN ({lm_ph})))"
		)

	elif filter_end:
		d  = date.fromisoformat(str(filter_end)[:10]) if isinstance(filter_end, str) else filter_end
		fy = _date_to_fy(d)
		mn = calendar.month_name[d.month]
		pos = _FY_MONTH_POS.get(mn, 0)
		earlier = _FY_MONTH_NAMES[:pos + 1]
		em_ph = ", ".join([f"%(elm{i})s" for i in range(len(earlier))])
		for i, m in enumerate(earlier):
			params[f"elm{i}"] = m
		params["fy_end"] = fy
		extra_conditions.append(
			f"(CU.financial_year < %(fy_end)s OR "
			f"(CU.financial_year = %(fy_end)s AND CU.month IN ({em_ph})))"
		)

	else:
		if filter_fys and month_filters:
			pair_clauses = []
			k = 0
			for fy in sorted(filter_fys):
				for mn in month_filters:
					params[f"pfy{k}"] = fy
					params[f"pmn{k}"] = mn
					pair_clauses.append(
						f"(CU.financial_year = %(pfy{k})s AND CU.month = %(pmn{k})s)"
					)
					k += 1
			extra_conditions.append("(" + " OR ".join(pair_clauses) + ")")
		elif filter_fys:
			ph = ", ".join([f"%(fy{i})s" for i in range(len(filter_fys))])
			for i, fy in enumerate(sorted(filter_fys)):
				params[f"fy{i}"] = fy
			extra_conditions.append(f"CU.financial_year IN ({ph})")
		elif month_filters:
			ph = ", ".join([f"%(mf{i})s" for i in range(len(month_filters))])
			for i, m in enumerate(month_filters):
				params[f"mf{i}"] = m
			extra_conditions.append(f"CU.month IN ({ph})")

	where_extra      = (" AND " + " AND ".join(extra_conditions)) if extra_conditions else ""
	where_extra_bare = where_extra.replace("CU.", "") if where_extra else ""

	name_ph = ", ".join([f"%(cb{i})s" for i in range(len(cb_names))])
	for i, n in enumerate(cb_names):
		params[f"cb{i}"] = n

	rows = frappe.db.sql(
		f"""
		SELECT
			CU.budget_reference_id    AS cb_name,
			SUM(CU.total_utilisation) AS total_utilisation
		FROM `tabCreche utilisation` CU
		WHERE CU.budget_reference_id IN ({name_ph})
		  {where_extra}
		GROUP BY CU.budget_reference_id
		""",
		params,
		as_dict=True,
	)

	# Bank balance: last month in filter window, resolved in Python
	_FY_POS = {
		"April":1,"May":2,"June":3,"July":4,"August":5,"September":6,
		"October":7,"November":8,"December":9,"January":10,"February":11,"March":12,
	}
	bal_candidates = frappe.db.sql(
		f"""
		SELECT
			budget_reference_id AS cb_name,
			financial_year,
			month,
			balance_amount
		FROM `tabCreche utilisation`
		WHERE budget_reference_id IN ({name_ph})
		  {where_extra_bare}
		""",
		params,
		as_dict=True,
	)
	bal_map = {}
	for r in bal_candidates:
		n   = r["cb_name"]
		fy  = r["financial_year"] or ""
		mp  = _FY_POS.get(r["month"], 0)
		key = (fy, mp)
		if n not in bal_map or key > bal_map[n][0]:
			bal_map[n] = (key, float(r["balance_amount"] or 0))
	bal_map = {n: v[1] for n, v in bal_map.items()}

	result = {}
	for r in rows:
		n = r["cb_name"]
		result[n] = (float(r["total_utilisation"] or 0), bal_map.get(n, 0.0))
	for n in cb_names:
		if n not in result:
			result[n] = (0.0, 0.0)
	return result


# ─── Disbursement ─────────────────────────────────────────────────────────────

def _disbursement_amounts_bulk(cb_names, filters):
	if not cb_names:
		return {}

	filter_start = filters.get("start_date")
	filter_end   = filters.get("end_date")
	if isinstance(filter_start, str) and filter_start:
		filter_start = date.fromisoformat(str(filter_start)[:10])
	if isinstance(filter_end, str) and filter_end:
		filter_end = date.fromisoformat(str(filter_end)[:10])

	filter_fys = filters.get("financial_year") or []
	if isinstance(filter_fys, str):
		filter_fys = [filter_fys]
	filter_fys = set(filter_fys)

	month_filter_raw = filters.get("month") or []
	if isinstance(month_filter_raw, str):
		month_filter_raw = [month_filter_raw] if month_filter_raw.strip() else []
	month_filters = [m.strip() for m in month_filter_raw if str(m).strip()]

	extra_conditions = []
	params = {}

	if filter_start or filter_end:
		if filter_start:
			params["d_start"] = filter_start
			extra_conditions.append("DT.date_of_disbursement >= %(d_start)s")
		if filter_end:
			params["d_end"] = filter_end
			extra_conditions.append("DT.date_of_disbursement <= %(d_end)s")

	elif filter_fys and month_filters:
		date_clauses = []
		k = 0
		for fy in sorted(filter_fys):
			fy_start_year = int(fy.split("-")[0])
			for mn in month_filters:
				month_num = list(calendar.month_name).index(mn)
				year = fy_start_year if month_num >= 4 else fy_start_year + 1
				last_day = calendar.monthrange(year, month_num)[1]
				params[f"dds{k}"] = date(year, month_num, 1)
				params[f"dde{k}"] = date(year, month_num, last_day)
				date_clauses.append(
					f"(DT.date_of_disbursement >= %(dds{k})s "
					f"AND DT.date_of_disbursement <= %(dde{k})s)"
				)
				k += 1
		if date_clauses:
			extra_conditions.append("(" + " OR ".join(date_clauses) + ")")
		else:
			extra_conditions.append("1 = 0")

	elif filter_fys:
		date_clauses = []
		for k, fy in enumerate(sorted(filter_fys)):
			fy_start_year = int(fy.split("-")[0])
			params[f"fys{k}"] = date(fy_start_year, 4, 1)
			params[f"fye{k}"] = date(fy_start_year + 1, 3, 31)
			date_clauses.append(
				f"(DT.date_of_disbursement >= %(fys{k})s "
				f"AND DT.date_of_disbursement <= %(fye{k})s)"
			)
		extra_conditions.append("(" + " OR ".join(date_clauses) + ")")

	elif month_filters:
		month_nums = [list(calendar.month_name).index(mn) for mn in month_filters if mn in calendar.month_name]
		if month_nums:
			mn_ph = ", ".join([f"%(dmn{i})s" for i in range(len(month_nums))])
			for i, mn in enumerate(month_nums):
				params[f"dmn{i}"] = mn
			extra_conditions.append(f"MONTH(DT.date_of_disbursement) IN ({mn_ph})")

	where_extra = (" AND " + " AND ".join(extra_conditions)) if extra_conditions else ""

	name_ph = ", ".join([f"%(dcb{i})s" for i in range(len(cb_names))])
	for i, n in enumerate(cb_names):
		params[f"dcb{i}"] = n

	rows = frappe.db.sql(
		f"""
		SELECT
			CD.budget_reference_id   AS cb_name,
			SUM(DT.disbursed_amount) AS total_disbursed
		FROM `tabCreche Disbursement` CD
		INNER JOIN `tabDisbursement Tracker` DT
			ON DT.parent = CD.name
			AND DT.parenttype = 'Creche Disbursement'
		WHERE CD.budget_reference_id IN ({name_ph})
		  {where_extra}
		GROUP BY CD.budget_reference_id
		""",
		params,
		as_dict=True,
	)

	result = {r["cb_name"]: float(r["total_disbursed"] or 0) for r in rows}
	for n in cb_names:
		if n not in result:
			result[n] = 0.0
	return result


# ─── Main data fetch ───────────────────────────────────────────────────────────

def _fetch_budgets(filters):
	conditions, params = build_conditions(filters)
	return frappe.db.sql(
		f"""
		SELECT
			CB.name                         AS cb_name,
			CB.partner_id,
			CB.partner_name,
			CB.budget_reference_name,
			CB.state,
			CB.district,
			CB.block,
			CB.financial_year,
			COALESCE(CB.no_of_creches, 0)   AS no_of_creches,
			CB.start_date,
			CB.end_date,
			CB.grant_id
		FROM `tabCreche Budget` CB
		{conditions}
		ORDER BY CB.partner_name ASC, CB.budget_reference_name ASC
		""",
		params,
		as_dict=True,
	)


def _sum_rows(rows):
	return {
		"total_budget":      sum(r["total_budget"]      for r in rows),
		"total_utilisation": sum(r["total_utilisation"] for r in rows),
		"total_disbursed":   sum(r["total_disbursed"]   for r in rows),
		"bank_balance":      sum(r["bank_balance"]      for r in rows),
		"no_of_creches":     sum(r["no_of_creches"]     for r in rows),
	}


def get_data(filters):
	level   = (filters.get("level") or "partner wise").lower()
	budgets = _fetch_budgets(filters)

	if not budgets:
		return []

	cb_names = [b["cb_name"] for b in budgets]

	budget_amounts = _budget_amounts_bulk(
		[(b["cb_name"], b["start_date"], b["end_date"]) for b in budgets], filters
	)
	util_amounts   = _utilisation_amounts_bulk(cb_names, filters)
	disb_amounts   = _disbursement_amounts_bulk(cb_names, filters)

	for b in budgets:
		n = b["cb_name"]
		b["total_budget"]      = budget_amounts.get(n, 0.0)
		b["total_utilisation"], b["bank_balance"] = util_amounts.get(n, (0.0, 0.0))
		b["total_disbursed"]   = disb_amounts.get(n, 0.0)

	period_filter_active = bool(
		filters.get("financial_year") or filters.get("month") or
		filters.get("start_date")     or filters.get("end_date")
	)
	if period_filter_active:
		budgets = [
			b for b in budgets
			if b["total_budget"] > 0 or b["total_utilisation"] > 0 or b["total_disbursed"] > 0
		]

	result = []
	grand_budget = grand_utilisation = grand_disbursed = grand_balance = grand_creches = 0

	if level == "budget wise":
		for b in budgets:
			row = {
				"row_name": b["budget_reference_name"], "partner_id": b["partner_id"],
				"state": b["state"], "financial_year": b["financial_year"],
				"no_of_creches": b["no_of_creches"], "start_date": b["start_date"],
				"end_date": b["end_date"], "grant_id": b["grant_id"],
				"total_budget": b["total_budget"], "total_utilisation": b["total_utilisation"],
				"total_disbursed": b["total_disbursed"], "bank_balance": b["bank_balance"],
				"indent": 0, "is_budget_row": 1,
			}
			calc_percents(row)
			result.append(row)
			grand_budget      += b["total_budget"];  grand_utilisation += b["total_utilisation"]
			grand_disbursed   += b["total_disbursed"]; grand_balance   += b["bank_balance"]
			grand_creches     += b["no_of_creches"]

	elif level in ("partner wise", "partner"):
		partner_map = OrderedDict()
		for b in budgets:
			pid = b["partner_id"]
			if pid not in partner_map:
				partner_map[pid] = {"meta": b, "rows": []}
			partner_map[pid]["rows"].append(b)

		for pid, info in partner_map.items():
			rows  = info["rows"]; meta = info["meta"]
			totals = _sum_rows(rows)
			unique_states = sorted({r["state"] for r in rows if r.get("state")})
			parent_row = {
				"row_name": meta["partner_name"], "partner_id": pid,
				"state": ", ".join(unique_states), "financial_year": "",
				"no_of_creches": totals["no_of_creches"], "start_date": None, "end_date": None,
				"grant_id": "", "total_budget": totals["total_budget"],
				"total_utilisation": totals["total_utilisation"],
				"total_disbursed": totals["total_disbursed"], "bank_balance": totals["bank_balance"],
				"indent": 0,
			}
			calc_percents(parent_row)
			result.append(parent_row)
			grand_budget      += totals["total_budget"];  grand_utilisation += totals["total_utilisation"]
			grand_disbursed   += totals["total_disbursed"]; grand_balance   += totals["bank_balance"]
			grand_creches     += totals["no_of_creches"]

			for idx, b in enumerate(rows):
				child_row = {
					"row_name": b["budget_reference_name"], "partner_id": b["partner_id"],
					"state": b["state"], "financial_year": b["financial_year"],
					"no_of_creches": b["no_of_creches"], "start_date": b["start_date"],
					"end_date": b["end_date"], "grant_id": b["grant_id"],
					"total_budget": b["total_budget"], "total_utilisation": b["total_utilisation"],
					"total_disbursed": b["total_disbursed"], "bank_balance": b["bank_balance"],
					"indent": 1, "_row_idx": idx,
				}
				calc_percents(child_row)
				result.append(child_row)

	else:
		location_field = level
		group_map = OrderedDict()
		for b in budgets:
			group_val = b.get(location_field) or "Unknown"
			pid = b["partner_id"]
			if group_val not in group_map:
				group_map[group_val] = OrderedDict()
			if pid not in group_map[group_val]:
				group_map[group_val][pid] = {"meta": b, "rows": []}
			group_map[group_val][pid]["rows"].append(b)

		for group_val in sorted(group_map.keys()):
			partners = group_map[group_val]
			all_rows = [r for p_data in partners.values() for r in p_data["rows"]]
			g_totals = _sum_rows(all_rows)
			parent_row = {
				"row_name": group_val, "partner_id": "",
				"state": group_val if location_field == "state" else "",
				"financial_year": "", "no_of_creches": g_totals["no_of_creches"],
				"start_date": None, "end_date": None, "grant_id": "",
				"total_budget": g_totals["total_budget"],
				"total_utilisation": g_totals["total_utilisation"],
				"total_disbursed": g_totals["total_disbursed"],
				"bank_balance": g_totals["bank_balance"], "indent": 0,
			}
			calc_percents(parent_row)
			result.append(parent_row)
			grand_budget      += g_totals["total_budget"];  grand_utilisation += g_totals["total_utilisation"]
			grand_disbursed   += g_totals["total_disbursed"]; grand_balance   += g_totals["bank_balance"]
			grand_creches     += g_totals["no_of_creches"]

			for idx, (pid, p_data) in enumerate(partners.items()):
				rows = p_data["rows"]; meta = p_data["meta"]
				p_totals = _sum_rows(rows)
				child_row = {
					"row_name": meta["partner_name"], "partner_id": pid,
					"state": meta.get("state", ""), "financial_year": "",
					"no_of_creches": p_totals["no_of_creches"], "start_date": None, "end_date": None,
					"grant_id": "", "total_budget": p_totals["total_budget"],
					"total_utilisation": p_totals["total_utilisation"],
					"total_disbursed": p_totals["total_disbursed"],
					"bank_balance": p_totals["bank_balance"], "indent": 1, "_row_idx": idx,
				}
				calc_percents(child_row)
				result.append(child_row)

	if result:
		grand_row = {
			"row_name": "Grand Total", "partner_id": "", "state": "", "financial_year": "",
			"no_of_creches": grand_creches, "start_date": None, "end_date": None, "grant_id": "",
			"total_budget": grand_budget, "total_utilisation": grand_utilisation,
			"total_disbursed": grand_disbursed, "bank_balance": grand_balance,
			"indent": 0, "is_grand_total": 1,
		}
		calc_percents(grand_row)
		result.append(grand_row)

	return result


# ─── Excel export ──────────────────────────────────────────────────────────────

@frappe.whitelist()
def download_excel(filters=None):
	import io, json
	import openpyxl
	from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
	from openpyxl.utils import get_column_letter

	if isinstance(filters, str):
		filters = json.loads(filters)
	filters = filters or {}

	level = (filters.get("level") or "partner wise").lower()
	data  = get_data(filters)

	level_titles = {
		"partner wise": "Partner Wise", "budget wise": "Budget Wise",
		"state": "State Wise", "district": "District Wise", "block": "Block Wise",
	}
	level_label = level_titles.get(level, level.title())

	wb = openpyxl.Workbook()
	ws = wb.active
	ws.title = level_label[:31]

	# ── Style helpers ──────────────────────────────────────────────────────────
	def solid(h):
		return PatternFill("solid", fgColor=h)

	def fnt(bold=False, color="000000", size=10):
		return Font(bold=bold, color=color, size=size)

	def border(color="D6DCE4", style="thin"):
		"""Full 4-sided border with the given colour."""
		s = Side(style=style, color=color)
		return Border(top=s, bottom=s, left=s, right=s)

	def thick_left_border(left_color="4A7AB5", cell_color="D6DCE4"):
		"""Border with a thick coloured left side and thin other sides."""
		cell = Side(style="thin",   color=cell_color)
		left = Side(style="medium", color=left_color)
		return Border(top=cell, bottom=cell, left=left, right=cell)

	CENTER   = Alignment(horizontal="center", vertical="center", wrap_text=True)
	RIGHT_VC = Alignment(horizontal="right",  vertical="center", wrap_text=True)
	LEFT_VC  = Alignment(horizontal="left",   vertical="center", wrap_text=True)

	# ── Colour palette (grey / neutral) ───────────────────────────────────────
	HDR_FILL = solid("2C3E50");  HDR_FONT = fnt(bold=True,  color="FFFFFF", size=11)
	PAR_FILL = solid("D6DCE4");  PAR_FONT = fnt(bold=True,  color="1E3A5F", size=10)
	ODD_FILL = solid("F5F6F8");  EVEN_FILL = solid("FFFFFF")
	BUD_FONT = fnt(size=10)
	TOT_FILL = solid("2C3E50");  TOT_FONT = fnt(bold=True,  color="FFFFFF", size=11)
	FLT_FILL = solid("EEF2F7");  FLT_FONT = fnt(size=10, color="1E3A5F")
	TTL_FILL = solid("D6DCE4");  TTL_FONT = fnt(bold=True,  color="1E3A5F", size=13)
	SUB_FILL = solid("EEF2F7")

	# Traffic-light fills for % columns
	G_FILL = solid("D6EAF8"); G_FONT = fnt(bold=True, color="1A5276")
	O_FILL = solid("FDEBD0"); O_FONT = fnt(bold=True, color="784212")
	R_FILL = solid("FADBD8"); R_FONT = fnt(bold=True, color="922B21")

	# Pre-built border objects (reused for every cell)
	HDR_BORDER  = border("4A7AB5", "medium")   # thick blue-grey for header row
	PAR_BORDER  = border("B0BEC5", "thin")      # standard thin for parent rows
	DATA_BORDER = border("D6DCE4", "thin")      # lightest for data cells
	TOT_BORDER  = border("1A252F", "medium")    # dark for grand total

	first_col_hdr = {
		"budget wise": "Budget Reference", "state": "State / Partner",
		"district": "District / Partner", "block": "Block / Partner",
	}.get(level, "Partner / Budget")

	COLS = [
		(first_col_hdr,                "row_name",             40, "str"),
		("Partner ID",                 "partner_id",           18, "str"),
		("State",                      "state",                18, "str"),
		("Budget Approval FY",         "financial_year",       14, "str"),
		("No of Creches",              "no_of_creches",        14, "int"),
		("Start Date",                 "start_date",           14, "date"),
		("End Date",                   "end_date",             14, "date"),
		("Grant ID",                   "grant_id",             16, "str"),
		("Approved Budget (₹)",        "total_budget",         22, "cur"),
		("Utilisation (₹)",            "total_utilisation",    22, "cur"),
		("Disbursed Amount (₹)",       "total_disbursed",      26, "cur"),
		("Unutilized Disbursement (₹)","disb_minus_util",      28, "cur"),
		("Reported Bank Balance (₹)",  "bank_balance",         26, "cur"),
		("Budget vs Utilized %",       "utilised_vs_budget",   24, "pct"),
		("Disbursed vs Utilized %",    "utilised_vs_disbursed",26, "pct"),
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

	def merge_row(r, value, fill, font, height=18, align=LEFT_VC, bdr=None):
		ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=N_COLS)
		cell = ws.cell(row=r, column=1, value=value)
		cell.fill = fill; cell.font = font; cell.alignment = align
		if bdr:
			cell.border = bdr
		ws.row_dimensions[r].height = height

	# ── Title ─────────────────────────────────────────────────────────────────
	r = next_row(32)
	merge_row(r, f"Creche Budget Utilisation Report — {level_label}",
	          TTL_FILL, TTL_FONT, 32, CENTER, border("4A7AB5", "medium"))

	# ── Active filters ────────────────────────────────────────────────────────
	active = {k: v for k, v in filters.items()
	          if v not in (None, "", []) and not (isinstance(v, list) and len(v) == 0)}
	if active:
		r = next_row(16)
		merge_row(r, "Filters Applied", SUB_FILL,
		          fnt(bold=True, color="1E3A5F", size=10), 16, LEFT_VC, border("B0BEC5"))
		for key, val in active.items():
			label       = _FILTER_LABELS.get(key, key.replace("_", " ").title())
			display_val = ", ".join(str(v) for v in val) if isinstance(val, list) else str(val)
			r = next_row(16)
			ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=N_COLS)
			cell = ws.cell(row=r, column=1, value=f"  {label}:  {display_val}")
			cell.fill = FLT_FILL; cell.font = FLT_FONT
			cell.alignment = LEFT_VC; cell.border = border("D6DCE4")

	# ── Spacer ────────────────────────────────────────────────────────────────
	next_row(6)

	# ── Column headers ────────────────────────────────────────────────────────
	r = next_row(32)
	for i, (hdr, *_rest) in enumerate(COLS, 1):
		cell = ws.cell(row=r, column=i, value=hdr)
		cell.fill = HDR_FILL; cell.font = HDR_FONT
		cell.alignment = CENTER; cell.border = HDR_BORDER
	ws.freeze_panes = f"A{r + 1}"

	# ── Data rows ─────────────────────────────────────────────────────────────
	do_pid_merge = (level in ("partner wise", "partner"))
	group_spans  = []
	parent_r = last_child_r = None
	alt = 0

	for row_data in data:
		is_grand   = bool(row_data.get("is_grand_total"))
		is_parent  = row_data.get("indent", 0) == 0
		is_bud_row = bool(row_data.get("is_budget_row"))

		r = next_row(26 if is_grand else (22 if is_parent else 18))

		if is_parent and not is_grand:
			if do_pid_merge and parent_r and last_child_r:
				group_spans.append((parent_r, last_child_r))
			parent_r = r; last_child_r = None; alt = 0
		elif not is_parent:
			last_child_r = r; alt += 1

		for col_idx, (_hdr, fieldname, _w, dtype) in enumerate(COLS, 1):
			raw  = row_data.get(fieldname)
			cell = ws.cell(row=r, column=col_idx)

			# ── Value ─────────────────────────────────────────────────────────
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
				if fieldname == "row_name" and not is_parent:
					val = "    " + val
				cell.value = val

			# ── Style ─────────────────────────────────────────────────────────
			is_num = dtype in ("cur", "pct", "int")

			if is_grand:
				cell.fill      = TOT_FILL
				cell.font      = TOT_FONT
				cell.border    = TOT_BORDER
				cell.alignment = RIGHT_VC if is_num else LEFT_VC

			elif is_parent and not is_bud_row:
				cell.fill   = PAR_FILL
				cell.font   = PAR_FONT
				cell.border = (thick_left_border() if col_idx == 1 else PAR_BORDER)
				cell.alignment = RIGHT_VC if is_num else LEFT_VC

			else:
				cell.fill      = ODD_FILL if alt % 2 == 1 else EVEN_FILL
				cell.font      = BUD_FONT
				cell.border    = DATA_BORDER
				cell.alignment = RIGHT_VC if is_num else LEFT_VC

			# ── Traffic-light override for % cells ────────────────────────────
			if dtype == "pct" and not (is_parent and not is_bud_row) and not is_grand:
				pct_val = float(raw or 0)
				cell.fill, cell.font = (
					(G_FILL, G_FONT) if pct_val >= 75 else
					(O_FILL, O_FONT) if pct_val >= 50 else
					(R_FILL, R_FONT)
				)
				cell.border    = DATA_BORDER
				cell.alignment = RIGHT_VC

	# ── Partner-ID column merge (Partner Wise view) ───────────────────────────
	if do_pid_merge and parent_r and last_child_r:
		group_spans.append((parent_r, last_child_r))
	for p_r, last_c in group_spans:
		if last_c > p_r:
			ws.merge_cells(start_row=p_r, start_column=2, end_row=last_c, end_column=2)
			ws.cell(row=p_r, column=2).alignment = CENTER

	# ── Stream to browser ─────────────────────────────────────────────────────
	buf = io.BytesIO()
	wb.save(buf)
	buf.seek(0)

	safe_level = level_label.replace(" ", "_")
	frappe.response["filename"]    = f"Budget_Utilisation_{safe_level}.xlsx"
	frappe.response["filecontent"] = buf.getvalue()
	frappe.response["type"]        = "binary"
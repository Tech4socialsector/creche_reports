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
# 	cur = date(start_d.year, start_d.month, 1)
# 	end_month_start = date(end_d.year, end_d.month, 1)
# 	while cur <= end_month_start:
# 		fy = _date_to_fy(cur)
# 		month_name = calendar.month_name[cur.month]
# 		pairs.append((fy, month_name))
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
# 		{"label": _("State"),                       "fieldname": "state",                "fieldtype": "Data",     "width": 200},
# 		{"label": _("Budget Approval FY"),          "fieldname": "financial_year",       "fieldtype": "Data",     "width": 190},
# 		{"label": _("No of Creches"),               "fieldname": "no_of_creches",        "fieldtype": "Int",      "width": 120},
# 		{"label": _("Start Date"),                  "fieldname": "start_date",           "fieldtype": "Date",     "width": 150},
# 		{"label": _("End Date"),                    "fieldname": "end_date",             "fieldtype": "Date",     "width": 150},
# 		{"label": _("Grant ID"),                    "fieldname": "grant_id",             "fieldtype": "Data",     "width": 160},
# 		{"label": _("Approved Budget"),             "fieldname": "total_budget",         "fieldtype": "Currency", "width": 160},
# 		{"label": _("Utilisation"),                 "fieldname": "total_utilisation",    "fieldtype": "Currency", "width": 150},
# 		{"label": _("Disbursed Amount"),            "fieldname": "total_disbursed",      "fieldtype": "Currency", "width": 200},
# 		{"label": _("Unutilized Disbursement"),     "fieldname": "disb_minus_util",      "fieldtype": "Currency", "width": 230},
# 		{"label": _("Reported Bank Balance"),       "fieldname": "bank_balance",         "fieldtype": "Currency", "width": 230},
# 		{"label": _("Budget vs Utilized %"),        "fieldname": "utilised_vs_budget",   "fieldtype": "Percent",  "width": 230},
# 		{"label": _("Disbursed vs Utilized %"),     "fieldname": "utilised_vs_disbursed","fieldtype": "Percent",  "width": 230},
# 	]


# # ─── Condition builder ─────────────────────────────────────────────────────────

# def build_conditions(filters):
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
# 	row["disb_minus_util"]       = disbursed - utilisation
# 	row["utilised_vs_budget"]    = round((utilisation / budget)    * 100, 0) if budget    > 0 else 0
# 	row["utilised_vs_disbursed"] = round((utilisation / disbursed) * 100, 0) if disbursed > 0 else 0


# # ─── Pro-rata budget amount calculation ───────────────────────────────────────

# def _months_overlap(a_start, a_end, b_start, b_end):
# 	overlap_start = max(a_start, b_start)
# 	overlap_end   = min(a_end,   b_end)
# 	if overlap_start > overlap_end:
# 		return 0
# 	months = 0
# 	y, m = overlap_start.year, overlap_start.month
# 	ey, em = overlap_end.year, overlap_end.month
# 	while (y, m) <= (ey, em):
# 		months += 1
# 		m += 1
# 		if m > 12:
# 			m = 1; y += 1
# 	return months


# def _active_months_in_fy(budget_start, budget_end, fy_start, fy_end):
# 	return _months_overlap(budget_start, budget_end, fy_start, fy_end)


# def _prorata_for_fy(year_amount, budget_start, budget_end,
#                     fy_start, fy_end, filter_start, filter_end):
# 	if not year_amount:
# 		return 0.0
# 	active = _active_months_in_fy(budget_start, budget_end, fy_start, fy_end)
# 	if active == 0:
# 		return 0.0
# 	eff_start = max(filter_start, fy_start)
# 	eff_end   = min(filter_end,   fy_end)
# 	if eff_start > eff_end:
# 		return 0.0
# 	selected = _months_overlap(budget_start, budget_end, eff_start, eff_end)
# 	if selected == 0:
# 		return 0.0
# 	return float(year_amount) / active * selected


# def _budget_amounts_bulk(cb_names_start_dates, filters):
# 	if not cb_names_start_dates:
# 		return {}

# 	filter_fys = filters.get("financial_year") or []
# 	if isinstance(filter_fys, str):
# 		filter_fys = [filter_fys]
# 	filter_fys = set(filter_fys)

# 	month_filter_raw = filters.get("month") or []
# 	if isinstance(month_filter_raw, str):
# 		month_filter_raw = [month_filter_raw] if month_filter_raw.strip() else []
# 	month_filters = [m.strip() for m in month_filter_raw if str(m).strip()]

# 	raw_start = filters.get("start_date")
# 	raw_end   = filters.get("end_date")

# 	def _to_date(v):
# 		if not v: return None
# 		if isinstance(v, date): return v
# 		return date.fromisoformat(str(v)[:10])

# 	raw_start = _to_date(raw_start)
# 	raw_end   = _to_date(raw_end)

# 	filter_segments = []

# 	if raw_start or raw_end:
# 		seg_start = raw_start or (raw_end - timedelta(days=3*366))
# 		seg_end   = raw_end   or (raw_start + timedelta(days=3*366))
# 		filter_segments = [(seg_start, seg_end)]

# 	elif filter_fys and month_filters:
# 		for fy in sorted(filter_fys):
# 			fy_start_year = int(fy.split("-")[0])
# 			for mn in month_filters:
# 				month_num = list(calendar.month_name).index(mn)
# 				year      = fy_start_year if month_num >= 4 else fy_start_year + 1
# 				last_day  = calendar.monthrange(year, month_num)[1]
# 				filter_segments.append((date(year, month_num, 1),
# 				                        date(year, month_num, last_day)))

# 	elif filter_fys:
# 		for fy in sorted(filter_fys):
# 			fy_s, fy_e = _fy_start_end(fy)
# 			filter_segments.append((fy_s, fy_e))

# 	apply_prorata = bool(filter_segments)

# 	cb_names = [t[0] for t in cb_names_start_dates]
# 	placeholders = ", ".join([f"%(n{i})s" for i in range(len(cb_names))])
# 	params = {f"n{i}": n for i, n in enumerate(cb_names)}

# 	raw_rows = frappe.db.sql(
# 		f"""
# 		SELECT
# 			bi.parent                       AS cb_name,
# 			SUM(COALESCE(bi.year_1, 0))     AS year_1,
# 			SUM(COALESCE(bi.year_2, 0))     AS year_2,
# 			SUM(COALESCE(bi.year_3, 0))     AS year_3
# 		FROM `tabBudget Items` bi
# 		WHERE bi.parent IN ({placeholders})
# 		  AND bi.parenttype = 'Creche Budget'
# 		GROUP BY bi.parent
# 		""",
# 		params,
# 		as_dict=True,
# 	)
# 	raw_map = {r["cb_name"]: r for r in raw_rows}

# 	result = {}
# 	date_map = {}
# 	for cb_name, start_d, end_d in cb_names_start_dates:
# 		def _d(v):
# 			if not v: return None
# 			if isinstance(v, date): return v
# 			return date.fromisoformat(str(v)[:10])
# 		date_map[cb_name] = (_d(start_d), _d(end_d))

# 	for cb_name in cb_names:
# 		raw = raw_map.get(cb_name)
# 		if not raw:
# 			result[cb_name] = 0.0
# 			continue

# 		if not apply_prorata:
# 			result[cb_name] = float((raw["year_1"] or 0) +
# 			                        (raw["year_2"] or 0) +
# 			                        (raw["year_3"] or 0))
# 			continue

# 		bud_start, bud_end = date_map.get(cb_name, (None, None))
# 		if not bud_start or not bud_end:
# 			result[cb_name] = 0.0
# 			continue

# 		total = 0.0
# 		for offset, col in enumerate(["year_1", "year_2", "year_3"]):
# 			year_amt = float(raw.get(col) or 0)
# 			if not year_amt:
# 				continue
# 			col_fy  = _fy_for_year_col(bud_start, offset)
# 			if col_fy is None:
# 				continue
# 			fy_s, fy_e = _fy_start_end(col_fy)
# 			for seg_start, seg_end in filter_segments:
# 				if seg_end < fy_s or seg_start > fy_e:
# 					continue
# 				total += _prorata_for_fy(
# 					year_amt, bud_start, bud_end,
# 					fy_s, fy_e, seg_start, seg_end
# 				)

# 		result[cb_name] = round(total, 2)

# 	return result


# # ─── Utilisation ──────────────────────────────────────────────────────────────
# # FIX: sum from tabUtilisation Items child rows (ui.total_amount) instead of
# #      the header-level CU.total_utilisation field, so this matches the
# #      dashboard number cards exactly.

# def _utilisation_amounts_bulk(cb_names, filters):
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

# 	filter_fys = filters.get("financial_year") or []
# 	if isinstance(filter_fys, str):
# 		filter_fys = [filter_fys]
# 	filter_fys = set(filter_fys)

# 	month_filter_raw = filters.get("month") or []
# 	if isinstance(month_filter_raw, str):
# 		month_filter_raw = [month_filter_raw] if month_filter_raw.strip() else []
# 	month_filters = [m.strip() for m in month_filter_raw if str(m).strip()]

# 	if filter_start and filter_end:
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
# 		if filter_fys and month_filters:
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
# 			ph = ", ".join([f"%(fy{i})s" for i in range(len(filter_fys))])
# 			for i, fy in enumerate(sorted(filter_fys)):
# 				params[f"fy{i}"] = fy
# 			extra_conditions.append(f"CU.financial_year IN ({ph})")
# 		elif month_filters:
# 			ph = ", ".join([f"%(mf{i})s" for i in range(len(month_filters))])
# 			for i, m in enumerate(month_filters):
# 				params[f"mf{i}"] = m
# 			extra_conditions.append(f"CU.month IN ({ph})")

# 	where_extra      = (" AND " + " AND ".join(extra_conditions)) if extra_conditions else ""
# 	# Bank balance query doesn't need CU. alias prefix
# 	where_extra_bare = where_extra.replace("CU.", "") if where_extra else ""

# 	name_ph = ", ".join([f"%(cb{i})s" for i in range(len(cb_names))])
# 	for i, n in enumerate(cb_names):
# 		params[f"cb{i}"] = n

# 	# ── FIX: join to tabUtilisation Items and sum ui.total_amount ─────────────
# 	# Previously used SUM(CU.total_utilisation) which reads the stored header
# 	# field — that can drift from the actual line-item sum when items are
# 	# added/edited after the parent doc is saved.  The dashboard number cards
# 	# use SUM(ui.total_amount) so this now matches them exactly.
# 	rows = frappe.db.sql(
# 		f"""
# 		SELECT
# 			CU.budget_reference_id        AS cb_name,
# 			SUM(ui.total_amount)          AS total_utilisation
# 		FROM `tabCreche utilisation` CU
# 		INNER JOIN `tabUtilisation Items` ui
# 			ON ui.parent = CU.name AND ui.parenttype = 'Creche utilisation'
# 		WHERE CU.budget_reference_id IN ({name_ph})
# 		  {where_extra}
# 		GROUP BY CU.budget_reference_id
# 		""",
# 		params,
# 		as_dict=True,
# 	)

# 	# Bank balance: last month in filter window, resolved in Python
# 	_FY_POS = {
# 		"April":1,"May":2,"June":3,"July":4,"August":5,"September":6,
# 		"October":7,"November":8,"December":9,"January":10,"February":11,"March":12,
# 	}
# 	bal_candidates = frappe.db.sql(
# 		f"""
# 		SELECT
# 			budget_reference_id AS cb_name,
# 			financial_year,
# 			month,
# 			balance_amount
# 		FROM `tabCreche utilisation`
# 		WHERE budget_reference_id IN ({name_ph})
# 		  {where_extra_bare}
# 		""",
# 		params,
# 		as_dict=True,
# 	)
# 	bal_map = {}
# 	for r in bal_candidates:
# 		n   = r["cb_name"]
# 		fy  = r["financial_year"] or ""
# 		mp  = _FY_POS.get(r["month"], 0)
# 		key = (fy, mp)
# 		if n not in bal_map or key > bal_map[n][0]:
# 			bal_map[n] = (key, float(r["balance_amount"] or 0))
# 	bal_map = {n: v[1] for n, v in bal_map.items()}

# 	result = {}
# 	for r in rows:
# 		n = r["cb_name"]
# 		result[n] = (float(r["total_utilisation"] or 0), bal_map.get(n, 0.0))
# 	for n in cb_names:
# 		if n not in result:
# 			result[n] = (0.0, 0.0)
# 	return result


# # ─── Disbursement ─────────────────────────────────────────────────────────────

# def _disbursement_amounts_bulk(cb_names, filters):
# 	if not cb_names:
# 		return {}

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
# 		if filter_start:
# 			params["d_start"] = filter_start
# 			extra_conditions.append("DT.date_of_disbursement >= %(d_start)s")
# 		if filter_end:
# 			params["d_end"] = filter_end
# 			extra_conditions.append("DT.date_of_disbursement <= %(d_end)s")

# 	elif filter_fys and month_filters:
# 		date_clauses = []
# 		k = 0
# 		for fy in sorted(filter_fys):
# 			fy_start_year = int(fy.split("-")[0])
# 			for mn in month_filters:
# 				month_num = list(calendar.month_name).index(mn)
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
# 			CD.budget_reference_id   AS cb_name,
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
# 	conditions, params = build_conditions(filters)
# 	return frappe.db.sql(
# 		f"""
# 		SELECT
# 			CB.name                         AS cb_name,
# 			CB.partner_id,
# 			CB.partner_name,
# 			CB.budget_reference_name,
# 			CB.state,
# 			CB.district,
# 			CB.block,
# 			CB.financial_year,
# 			COALESCE(CB.no_of_creches, 0)   AS no_of_creches,
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
# 	level   = (filters.get("level") or "partner wise").lower()
# 	budgets = _fetch_budgets(filters)

# 	if not budgets:
# 		return []

# 	cb_names = [b["cb_name"] for b in budgets]

# 	budget_amounts = _budget_amounts_bulk(
# 		[(b["cb_name"], b["start_date"], b["end_date"]) for b in budgets], filters
# 	)
# 	util_amounts   = _utilisation_amounts_bulk(cb_names, filters)
# 	disb_amounts   = _disbursement_amounts_bulk(cb_names, filters)

# 	for b in budgets:
# 		n = b["cb_name"]
# 		b["total_budget"]      = budget_amounts.get(n, 0.0)
# 		b["total_utilisation"], b["bank_balance"] = util_amounts.get(n, (0.0, 0.0))
# 		b["total_disbursed"]   = disb_amounts.get(n, 0.0)

# 	period_filter_active = bool(
# 		filters.get("financial_year") or filters.get("month") or
# 		filters.get("start_date")     or filters.get("end_date")
# 	)
# 	if period_filter_active:
# 		budgets = [
# 			b for b in budgets
# 			if b["total_budget"] > 0 or b["total_utilisation"] > 0 or b["total_disbursed"] > 0
# 		]

# 	result = []
# 	grand_budget = grand_utilisation = grand_disbursed = grand_balance = grand_creches = 0

# 	if level == "budget wise":
# 		for b in budgets:
# 			row = {
# 				"row_name": b["budget_reference_name"], "partner_id": b["partner_id"],
# 				"state": b["state"], "financial_year": b["financial_year"],
# 				"no_of_creches": b["no_of_creches"], "start_date": b["start_date"],
# 				"end_date": b["end_date"], "grant_id": b["grant_id"],
# 				"total_budget": b["total_budget"], "total_utilisation": b["total_utilisation"],
# 				"total_disbursed": b["total_disbursed"], "bank_balance": b["bank_balance"],
# 				"indent": 0, "is_budget_row": 1,
# 			}
# 			calc_percents(row)
# 			result.append(row)
# 			grand_budget      += b["total_budget"];  grand_utilisation += b["total_utilisation"]
# 			grand_disbursed   += b["total_disbursed"]; grand_balance   += b["bank_balance"]
# 			grand_creches     += b["no_of_creches"]

# 	elif level in ("partner wise", "partner"):
# 		partner_map = OrderedDict()
# 		for b in budgets:
# 			pid = b["partner_id"]
# 			if pid not in partner_map:
# 				partner_map[pid] = {"meta": b, "rows": []}
# 			partner_map[pid]["rows"].append(b)

# 		for pid, info in partner_map.items():
# 			rows  = info["rows"]; meta = info["meta"]
# 			totals = _sum_rows(rows)
# 			unique_states = sorted({r["state"] for r in rows if r.get("state")})
# 			parent_row = {
# 				"row_name": meta["partner_name"], "partner_id": pid,
# 				"state": ", ".join(unique_states), "financial_year": "",
# 				"no_of_creches": totals["no_of_creches"], "start_date": None, "end_date": None,
# 				"grant_id": "", "total_budget": totals["total_budget"],
# 				"total_utilisation": totals["total_utilisation"],
# 				"total_disbursed": totals["total_disbursed"], "bank_balance": totals["bank_balance"],
# 				"indent": 0,
# 			}
# 			calc_percents(parent_row)
# 			result.append(parent_row)
# 			grand_budget      += totals["total_budget"];  grand_utilisation += totals["total_utilisation"]
# 			grand_disbursed   += totals["total_disbursed"]; grand_balance   += totals["bank_balance"]
# 			grand_creches     += totals["no_of_creches"]

# 			for idx, b in enumerate(rows):
# 				child_row = {
# 					"row_name": b["budget_reference_name"], "partner_id": b["partner_id"],
# 					"state": b["state"], "financial_year": b["financial_year"],
# 					"no_of_creches": b["no_of_creches"], "start_date": b["start_date"],
# 					"end_date": b["end_date"], "grant_id": b["grant_id"],
# 					"total_budget": b["total_budget"], "total_utilisation": b["total_utilisation"],
# 					"total_disbursed": b["total_disbursed"], "bank_balance": b["bank_balance"],
# 					"indent": 1, "_row_idx": idx,
# 				}
# 				calc_percents(child_row)
# 				result.append(child_row)

# 	else:
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
# 				"row_name": group_val, "partner_id": "",
# 				"state": group_val if location_field == "state" else "",
# 				"financial_year": "", "no_of_creches": g_totals["no_of_creches"],
# 				"start_date": None, "end_date": None, "grant_id": "",
# 				"total_budget": g_totals["total_budget"],
# 				"total_utilisation": g_totals["total_utilisation"],
# 				"total_disbursed": g_totals["total_disbursed"],
# 				"bank_balance": g_totals["bank_balance"], "indent": 0,
# 			}
# 			calc_percents(parent_row)
# 			result.append(parent_row)
# 			grand_budget      += g_totals["total_budget"];  grand_utilisation += g_totals["total_utilisation"]
# 			grand_disbursed   += g_totals["total_disbursed"]; grand_balance   += g_totals["bank_balance"]
# 			grand_creches     += g_totals["no_of_creches"]

# 			for idx, (pid, p_data) in enumerate(partners.items()):
# 				rows = p_data["rows"]; meta = p_data["meta"]
# 				p_totals = _sum_rows(rows)
# 				child_row = {
# 					"row_name": meta["partner_name"], "partner_id": pid,
# 					"state": meta.get("state", ""), "financial_year": "",
# 					"no_of_creches": p_totals["no_of_creches"], "start_date": None, "end_date": None,
# 					"grant_id": "", "total_budget": p_totals["total_budget"],
# 					"total_utilisation": p_totals["total_utilisation"],
# 					"total_disbursed": p_totals["total_disbursed"],
# 					"bank_balance": p_totals["bank_balance"], "indent": 1, "_row_idx": idx,
# 				}
# 				calc_percents(child_row)
# 				result.append(child_row)

# 	if result:
# 		grand_row = {
# 			"row_name": "Grand Total", "partner_id": "", "state": "", "financial_year": "",
# 			"no_of_creches": grand_creches, "start_date": None, "end_date": None, "grant_id": "",
# 			"total_budget": grand_budget, "total_utilisation": grand_utilisation,
# 			"total_disbursed": grand_disbursed, "bank_balance": grand_balance,
# 			"indent": 0, "is_grand_total": 1,
# 		}
# 		calc_percents(grand_row)
# 		result.append(grand_row)

# 	return result


# # ─── Excel export ──────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def download_excel(filters=None):
# 	import io, json
# 	from datetime import date as _date_cls
# 	import openpyxl
# 	from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
# 	from openpyxl.utils import get_column_letter

# 	if isinstance(filters, str):
# 		filters = json.loads(filters)
# 	filters = filters or {}

# 	level = (filters.get("level") or "partner wise").lower()
# 	data  = get_data(filters)

# 	level_titles = {
# 		"partner wise": "Partner Wise", "budget wise": "Budget Wise",
# 		"state": "State Wise", "district": "District Wise", "block": "Block Wise",
# 	}
# 	level_label = level_titles.get(level, level.title())

# 	wb = openpyxl.Workbook()
# 	ws = wb.active
# 	ws.title = level_label[:31]
# 	ws.sheet_view.showGridLines = False

# 	# ── Style primitives ───────────────────────────────────────────────────────
# 	def S(h):
# 		return PatternFill("solid", fgColor=h)

# 	def F(bold=False, color="1E293B", size=10, italic=False):
# 		return Font(bold=bold, color=color, size=size, italic=italic, name="Calibri")

# 	def sd(c, st="thin"):
# 		return Side(style=st, color=c)

# 	def B(t="CBD5E1", b="CBD5E1", l="CBD5E1", r="CBD5E1",
# 	      ts="thin", bs="thin", ls="thin", rs="thin"):
# 		return Border(top=sd(t, ts), bottom=sd(b, bs), left=sd(l, ls), right=sd(r, rs))

# 	MID  = Alignment(horizontal="center", vertical="center", wrap_text=True)
# 	RVC  = Alignment(horizontal="right",  vertical="center")
# 	LVC  = Alignment(horizontal="left",   vertical="center")
# 	LIND = Alignment(horizontal="left",   vertical="center", indent=1)

# 	# ── Palette — light throughout ─────────────────────────────────────────────
# 	# Backgrounds
# 	BG_TITLE  = "2D5F8A"   # soft steel-blue title bar
# 	BG_META   = "F4F7FA"   # very pale grey-blue — meta / filter rows
# 	BG_HDR_GR = "E8EFF6"   # soft silver-blue — column group row
# 	BG_HDR    = "4A86C8"   # medium cornflower blue — column headers
# 	BG_PAR    = "E3EEF9"   # soft ice-blue tint — partner / group rows
# 	BG_ODD    = "F7FAFD"   # near-white with blue tint — odd child rows
# 	BG_EVEN   = "FFFFFF"   # pure white — even child rows
# 	BG_GTOT   = "2D5F8A"   # same steel-blue as title — grand total

# 	# Text
# 	FG_TITLE  = "FFFFFF"
# 	FG_META   = "5A6E82"   # soft blue-grey
# 	FG_GRP    = "3D5A73"   # muted blue-slate — group header label
# 	FG_HDR    = "FFFFFF"
# 	FG_PAR    = "1F4E79"   # dark ink-blue — partner row
# 	FG_CHILD  = "3D5A73"   # muted blue-slate — body text
# 	FG_GTOT   = "FFFFFF"
# 	FG_FILTER = "2D6A9F"   # medium blue — filter chip text

# 	# Accents / rules
# 	AC_BLUE   = "4A86C8"   # cornflower blue separators
# 	AC_TEAL   = "3A9DA8"   # soft teal rule & bookend bars
# 	AC_NAVY   = "2D5F8A"   # steel-blue left-stripe on partner rows
# 	RULE_MED  = "AABDD0"   # medium blue-grey rule
# 	RULE_LT   = "D6E4F0"   # light blue-grey cell border
# 	CHIP_BG   = "D6E8F7"   # pale blue — filter chip background

# 	# Traffic lights
# 	TL_G_BG   = "DCFCE7";  TL_G_FG = "166534"
# 	TL_A_BG   = "FEF9C3";  TL_A_FG = "854D0E"
# 	TL_R_BG   = "FEE2E2";  TL_R_FG = "991B1B"

# 	# ── Column definitions ─────────────────────────────────────────────────────
# 	first_col_hdr = {
# 		"budget wise": "Budget Reference", "state": "State / Partner",
# 		"district":    "District / Partner", "block": "Block / Partner",
# 	}.get(level, "Partner / Budget")

# 	COLS = [
# 		(first_col_hdr,              "row_name",              36, "str"),
# 		("Partner ID",               "partner_id",            16, "str"),
# 		("State",                    "state",                 18, "str"),
# 		("Budget\nFY",               "financial_year",        11, "str"),
# 		("Creches",                  "no_of_creches",          9, "int"),
# 		("Start\nDate",              "start_date",            12, "date"),
# 		("End\nDate",                "end_date",              12, "date"),
# 		("Grant ID",                 "grant_id",              15, "str"),
# 		("Approved\nBudget (\u20b9)",     "total_budget",          20, "cur"),
# 		("Utilisation\n(\u20b9)",         "total_utilisation",     18, "cur"),
# 		("Disbursed\n(\u20b9)",           "total_disbursed",       20, "cur"),
# 		("Unutilized\nDisb. (\u20b9)",    "disb_minus_util",       20, "cur"),
# 		("Bank\nBalance (\u20b9)",        "bank_balance",          19, "cur"),
# 		("Budget\nvs Util %",        "utilised_vs_budget",    13, "pct"),
# 		("Disb.\nvs Util %",         "utilised_vs_disbursed", 13, "pct"),
# 	]
# 	N = len(COLS)

# 	COL_GROUPS = [
# 		(1,  8,  "BUDGET IDENTITY"),
# 		(9,  13, "FINANCIAL SUMMARY  (\u20b9)"),
# 		(14, 15, "PERFORMANCE"),
# 	]
# 	GS = {g[0] for g in COL_GROUPS}
# 	GE = {g[1] for g in COL_GROUPS}

# 	for i, (_, _, w, _) in enumerate(COLS, 1):
# 		ws.column_dimensions[get_column_letter(i)].width = w

# 	# ── Row helper ─────────────────────────────────────────────────────────────
# 	cur_row = 0
# 	def nr(h=15):
# 		nonlocal cur_row
# 		cur_row += 1
# 		ws.row_dimensions[cur_row].height = h
# 		return cur_row

# 	def fill_row(r, fill, c1=1, c2=None):
# 		for c in range(c1, (c2 or N) + 1):
# 			ws.cell(row=r, column=c).fill = fill

# 	def mrow(r, val, fill, font, align=LVC, c1=1, c2=None):
# 		c2 = c2 or N
# 		ws.merge_cells(start_row=r, start_column=c1, end_row=r, end_column=c2)
# 		cell = ws.cell(row=r, column=c1, value=val)
# 		cell.fill = fill; cell.font = font; cell.alignment = align
# 		fill_row(r, fill, c1, c2)
# 		return cell

# 	# ── TITLE ──────────────────────────────────────────────────────────────────
# 	r = nr(30)
# 	mrow(r, "  Creche Budget Utilisation Report",
# 	     S(BG_TITLE), F(bold=True, color=FG_TITLE, size=14))

# 	# Teal accent rule
# 	r = nr(3)
# 	mrow(r, None, S(AC_TEAL), F())

# 	# Meta row: view (left) | generated date (right)
# 	r = nr(18)
# 	half = N // 2
# 	ws.merge_cells(start_row=r, start_column=1,      end_row=r, end_column=half)
# 	ws.merge_cells(start_row=r, start_column=half+1, end_row=r, end_column=N)
# 	lc = ws.cell(row=r, column=1,      value=f"  View: {level_label}")
# 	rc = ws.cell(row=r, column=half+1, value=f"Generated: {_date_cls.today().strftime('%d %B %Y')}  ")
# 	for cell, al in ((lc, LVC), (rc, Alignment(horizontal="right", vertical="center"))):
# 		cell.fill = S(BG_META); cell.font = F(color=FG_META, size=10); cell.alignment = al
# 	fill_row(r, S(BG_META))

# 	# ── FILTERS ────────────────────────────────────────────────────────────────
# 	active = {k: v for k, v in filters.items()
# 	          if v not in (None, "", []) and not (isinstance(v, list) and len(v) == 0)}
# 	if active:
# 		r = nr(18)
# 		mrow(r, "  Filters Applied", S(BG_META), F(bold=True, color=AC_BLUE, size=9))
# 		for c in range(1, N + 1):
# 			ws.cell(row=r, column=c).border = B(b=RULE_MED, bs="thin")

# 		r = nr(16)
# 		fill_row(r, S(BG_META))
# 		col_pos = 1
# 		for key, val in active.items():
# 			if col_pos > N:
# 				break
# 			label = _FILTER_LABELS.get(key, key.replace("_", " ").title())
# 			dval  = ", ".join(str(x) for x in val) if isinstance(val, list) else str(val)
# 			end_p = min(col_pos + 2, N)
# 			ws.merge_cells(start_row=r, start_column=col_pos, end_row=r, end_column=end_p)
# 			cc = ws.cell(row=r, column=col_pos, value=f"  {label}: {dval}  ")
# 			cc.fill = S(CHIP_BG); cc.font = F(color=FG_FILTER, size=9, bold=True)
# 			cc.alignment = LVC
# 			cc.border = B(t=AC_BLUE, b=AC_BLUE, l=AC_BLUE, r=AC_BLUE)
# 			col_pos = end_p + 1

# 	# spacer
# 	nr(8)

# 	# ── COLUMN GROUP HEADERS ───────────────────────────────────────────────────
# 	rg = nr(14)
# 	fill_row(rg, S(BG_HDR_GR))
# 	for c1, c2, label in COL_GROUPS:
# 		ws.merge_cells(start_row=rg, start_column=c1, end_row=rg, end_column=c2)
# 		gc = ws.cell(row=rg, column=c1, value=label)
# 		gc.fill = S(BG_HDR_GR); gc.font = F(bold=True, color=FG_GRP, size=8)
# 		gc.alignment = MID
# 		rule = AC_TEAL if "FINANCIAL" in label else AC_BLUE
# 		for c in range(c1, c2 + 1):
# 			ws.cell(row=rg, column=c).fill   = S(BG_HDR_GR)
# 			ws.cell(row=rg, column=c).border = B(t=BG_HDR_GR, b=rule,
# 			                                     l=BG_HDR_GR, r=BG_HDR_GR, bs="medium")

# 	# ── COLUMN HEADERS ─────────────────────────────────────────────────────────
# 	rh = nr(36)
# 	for i, (hdr, _, _, _) in enumerate(COLS, 1):
# 		hc = ws.cell(row=rh, column=i, value=hdr)
# 		hc.fill = S(BG_HDR); hc.font = F(bold=True, color=FG_HDR, size=9)
# 		hc.alignment = MID
# 		l_st = "medium" if i in GS else "thin"
# 		r_st = "medium" if i in GE else "thin"
# 		l_cl = RULE_LT  if i in GS else BG_HDR
# 		r_cl = RULE_LT  if i in GE else BG_HDR
# 		hc.border = B(t=BG_HDR, b=RULE_LT, l=l_cl, r=r_cl,
# 		              ts="thin", bs="medium", ls=l_st, rs=r_st)

# 	ws.freeze_panes = f"A{rh + 1}"

# 	# ── DATA ROWS ──────────────────────────────────────────────────────────────
# 	do_pid_merge = level in ("partner wise", "partner")
# 	group_spans  = []
# 	par_r        = None
# 	lch_r        = None
# 	alt          = 0

# 	for row_data in data:
# 		is_grand   = bool(row_data.get("is_grand_total"))
# 		is_parent  = row_data.get("indent", 0) == 0
# 		is_bud_row = bool(row_data.get("is_budget_row"))

# 		r = nr(24 if is_grand else (21 if is_parent else 16))

# 		if is_parent and not is_grand:
# 			if do_pid_merge and par_r and lch_r:
# 				group_spans.append((par_r, lch_r))
# 			par_r = r; lch_r = None; alt = 0
# 		elif not is_parent:
# 			lch_r = r; alt += 1

# 		for ci, (_, fn, _, dtype) in enumerate(COLS, 1):
# 			raw  = row_data.get(fn)
# 			cell = ws.cell(row=r, column=ci)

# 			if dtype == "cur":
# 				cell.value = float(raw or 0); cell.number_format = '\u20b9#,##0'
# 			elif dtype == "pct":
# 				cell.value = float(raw or 0); cell.number_format = '0.0"%"'
# 			elif dtype == "int":
# 				cell.value = int(raw or 0)
# 			elif dtype == "date":
# 				cell.value = raw if raw else ""; cell.number_format = "DD-MMM-YY"
# 			else:
# 				val = str(raw) if raw not in (None, "") else ""
# 				if fn == "row_name" and not is_parent:
# 					val = "       " + val.lstrip()
# 				cell.value = val

# 			is_num = dtype in ("cur", "pct", "int")
# 			l_st   = "medium" if ci in GS else "thin"
# 			r_st   = "medium" if ci in GE else "thin"
# 			sep_l  = RULE_MED if ci in GS else RULE_LT
# 			sep_r  = RULE_MED if ci in GE else RULE_LT

# 			if is_grand:
# 				cell.fill      = S(BG_GTOT)
# 				cell.font      = F(bold=True, color=FG_GTOT, size=10)
# 				cell.alignment = RVC if is_num else LIND
# 				lc_ = AC_TEAL if ci == 1 else sep_l
# 				ls_ = "medium" if ci == 1 else l_st
# 				cell.border = B(t=AC_TEAL, b=AC_TEAL, l=lc_, r=sep_r,
# 				                ts="medium", bs="medium", ls=ls_, rs=r_st)

# 			elif is_parent:
# 				cell.fill      = S(BG_PAR)
# 				cell.font      = F(bold=True, color=FG_PAR, size=10)
# 				cell.alignment = RVC if is_num else LIND
# 				lc_ = AC_NAVY if ci == 1 else sep_l
# 				ls_ = "medium" if ci == 1 else l_st
# 				cell.border = B(t=RULE_LT, b=RULE_LT, l=lc_, r=sep_r,
# 				                ts="thin", bs="thin", ls=ls_, rs=r_st)

# 			else:
# 				bg = BG_ODD if alt % 2 == 1 else BG_EVEN
# 				cell.fill      = S(bg)
# 				cell.font      = F(color=FG_CHILD, size=9)
# 				cell.alignment = RVC if is_num else LIND
# 				cell.border    = B(t=RULE_LT, b=RULE_LT, l=sep_l, r=sep_r,
# 				                   ts="thin", bs="thin", ls=l_st, rs=r_st)

# 			if dtype == "pct" and not is_grand:
# 				pct_val = float(raw or 0)
# 				tl_bg, tl_fg = (
# 					(TL_G_BG, TL_G_FG) if pct_val >= 75 else
# 					(TL_A_BG, TL_A_FG) if pct_val >= 50 else
# 					(TL_R_BG, TL_R_FG)
# 				)
# 				cell.fill      = S(tl_bg)
# 				cell.font      = F(bold=True, color=tl_fg, size=9)
# 				cell.alignment = MID
# 				cell.border    = B(t=tl_bg, b=tl_bg, l=tl_bg, r=tl_bg)

# 	# ── Partner-ID column merge ────────────────────────────────────────────────
# 	if do_pid_merge and par_r and lch_r:
# 		group_spans.append((par_r, lch_r))
# 	for p_r, lc_r in group_spans:
# 		if lc_r > p_r:
# 			ws.merge_cells(start_row=p_r, start_column=2, end_row=lc_r, end_column=2)
# 			ws.cell(row=p_r, column=2).alignment = MID

# 	# ── BOTTOM RULE ────────────────────────────────────────────────────────────
# 	r = nr(3)
# 	mrow(r, None, S(AC_TEAL), F())

# 	# ── FOOTER ─────────────────────────────────────────────────────────────────
# 	r = nr(14)
# 	mrow(r,
# 	     f"  Creche Budget Utilisation  \u00b7  {level_label}  \u00b7  "
# 	     f"Generated {_date_cls.today().strftime('%d %B %Y')}  \u00b7  Confidential",
# 	     S(BG_META), F(color=FG_META, size=8, italic=True))

# 	# ── Print / page setup ─────────────────────────────────────────────────────
# 	ws.page_setup.orientation = "landscape"
# 	ws.page_setup.paperSize   = 9
# 	ws.page_setup.fitToPage   = True
# 	ws.page_setup.fitToWidth  = 1
# 	ws.page_setup.fitToHeight = 0
# 	ws.print_title_rows       = f"{rh}:{rh}"
# 	ws.page_margins.left      = 0.4
# 	ws.page_margins.right     = 0.4
# 	ws.page_margins.top       = 0.5
# 	ws.page_margins.bottom    = 0.5

# 	# ── Stream to browser ──────────────────────────────────────────────────────
# 	buf = io.BytesIO()
# 	wb.save(buf)
# 	buf.seek(0)

# 	safe_level = level_label.replace(" ", "_")
# 	frappe.response["filename"]    = f"Budget_Utilisation_{safe_level}.xlsx"
# 	frappe.response["filecontent"] = buf.getvalue()
# 	frappe.response["type"]        = "binary"





























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
# 	cur = date(start_d.year, start_d.month, 1)
# 	end_month_start = date(end_d.year, end_d.month, 1)
# 	while cur <= end_month_start:
# 		fy = _date_to_fy(cur)
# 		month_name = calendar.month_name[cur.month]
# 		pairs.append((fy, month_name))
# 		if cur.month == 12:
# 			cur = date(cur.year + 1, 1, 1)
# 		else:
# 			cur = date(cur.year, cur.month + 1, 1)
# 	return pairs


# # ─── Calendar-month helpers for budget pro-rata ───────────────────────────────

# def _add_months(d, months):
# 	"""Return the date exactly `months` calendar months after d."""
# 	m = d.month - 1 + months
# 	year = d.year + m // 12
# 	month = m % 12 + 1
# 	last = calendar.monthrange(year, month)[1]
# 	return date(year, month, min(d.day, last))


# def _whole_months_overlap(a_start, a_end, b_start, b_end):
# 	"""
# 	Count whole calendar months whose 1st day falls within both
# 	[a_start, a_end] and [b_start, b_end].
# 	"""
# 	start = max(date(a_start.year, a_start.month, 1),
# 	            date(b_start.year, b_start.month, 1))
# 	end   = min(date(a_end.year,   a_end.month,   1),
# 	            date(b_end.year,   b_end.month,   1))
# 	if start > end:
# 		return 0
# 	return (end.year - start.year) * 12 + (end.month - start.month) + 1


# # ─── Entry point ──────────────────────────────────────────────────────────────

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
# 		{"label": _(first_label),                          "fieldname": "row_name",               "fieldtype": "Data",     "width": 260},
# 		{"label": _("Partner ID"),                         "fieldname": "partner_id",             "fieldtype": "Data",     "width": 150},
# 		{"label": _("State"),                              "fieldname": "state",                  "fieldtype": "Data",     "width": 200},
# 		{"label": _("Budget Approval FY"),                 "fieldname": "financial_year",         "fieldtype": "Data",     "width": 190},
# 		{"label": _("No of Creches"),                      "fieldname": "no_of_creches",          "fieldtype": "Int",      "width": 120},
# 		{"label": _("Start Date"),                         "fieldname": "start_date",             "fieldtype": "Date",     "width": 150},
# 		{"label": _("End Date"),                           "fieldname": "end_date",               "fieldtype": "Date",     "width": 150},
# 		{"label": _("Grant ID"),                           "fieldname": "grant_id",               "fieldtype": "Data",     "width": 160},
# 		{"label": _("Approved Budget"),                    "fieldname": "total_budget",           "fieldtype": "Currency", "width": 160},
# 		{"label": _("Utilisation"),                        "fieldname": "total_utilisation",      "fieldtype": "Currency", "width": 150},
# 		{"label": _("Disbursed Amount"),                   "fieldname": "total_disbursed",        "fieldtype": "Currency", "width": 200},
# 		{"label": _("Unutilized Disbursement"),            "fieldname": "disb_minus_util",        "fieldtype": "Currency", "width": 230},
# 		{"label": _("Unutilized Disb. - Bank Balance"),    "fieldname": "unutil_disb_minus_bank", "fieldtype": "Currency", "width": 260},
# 		{"label": _("Reported Bank Balance"),              "fieldname": "bank_balance",           "fieldtype": "Currency", "width": 230},
# 		{"label": _("Budget vs Utilized %"),               "fieldname": "utilised_vs_budget",     "fieldtype": "Percent",  "width": 230},
# 		{"label": _("Disbursed vs Utilized %"),            "fieldname": "utilised_vs_disbursed",  "fieldtype": "Percent",  "width": 230},
# 	]


# # ─── Condition builder ─────────────────────────────────────────────────────────

# def build_conditions(filters):
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
# 	bank_bal    = row.get("bank_balance")       or 0
# 	row["disb_minus_util"]        = disbursed - utilisation
# 	row["unutil_disb_minus_bank"] = row["disb_minus_util"] - bank_bal
# 	row["utilised_vs_budget"]     = round((utilisation / budget)    * 100, 0) if budget    > 0 else 0
# 	row["utilised_vs_disbursed"]  = round((utilisation / disbursed) * 100, 0) if disbursed > 0 else 0


# # ─── Budget pro-rata (calendar-month blocks, not FY-based) ────────────────────

# def _budget_amounts_bulk(cb_names_start_dates, filters):
# 	if not cb_names_start_dates:
# 		return {}

# 	def _to_date(v):
# 		if not v: return None
# 		if isinstance(v, date): return v
# 		return date.fromisoformat(str(v)[:10])

# 	filter_fys = filters.get("financial_year") or []
# 	if isinstance(filter_fys, str):
# 		filter_fys = [filter_fys]
# 	filter_fys = set(filter_fys)

# 	month_filter_raw = filters.get("month") or []
# 	if isinstance(month_filter_raw, str):
# 		month_filter_raw = [month_filter_raw] if month_filter_raw.strip() else []
# 	month_filters = [m.strip() for m in month_filter_raw if str(m).strip()]

# 	raw_start = _to_date(filters.get("start_date"))
# 	raw_end   = _to_date(filters.get("end_date"))

# 	# ── Build filter segments ──────────────────────────────────────────────────
# 	filter_segments = []

# 	if raw_start or raw_end:
# 		seg_start = raw_start or (raw_end   - timedelta(days=3 * 366))
# 		seg_end   = raw_end   or (raw_start + timedelta(days=3 * 366))
# 		filter_segments = [(seg_start, seg_end)]

# 	elif filter_fys and month_filters:
# 		for fy in sorted(filter_fys):
# 			fy_start_year = int(fy.split("-")[0])
# 			for mn in month_filters:
# 				month_num = list(calendar.month_name).index(mn)
# 				year      = fy_start_year if month_num >= 4 else fy_start_year + 1
# 				last_day  = calendar.monthrange(year, month_num)[1]
# 				filter_segments.append((date(year, month_num, 1),
# 				                        date(year, month_num, last_day)))

# 	elif filter_fys:
# 		for fy in sorted(filter_fys):
# 			fy_s, fy_e = _fy_start_end(fy)
# 			filter_segments.append((fy_s, fy_e))

# 	apply_prorata = bool(filter_segments)

# 	# ── Fetch year_1 / year_2 / year_3 from DB ────────────────────────────────
# 	cb_names     = [t[0] for t in cb_names_start_dates]
# 	placeholders = ", ".join([f"%(n{i})s" for i in range(len(cb_names))])
# 	params       = {f"n{i}": n for i, n in enumerate(cb_names)}

# 	raw_rows = frappe.db.sql(
# 		f"""
# 		SELECT
# 			bi.parent                       AS cb_name,
# 			SUM(COALESCE(bi.year_1, 0))     AS year_1,
# 			SUM(COALESCE(bi.year_2, 0))     AS year_2,
# 			SUM(COALESCE(bi.year_3, 0))     AS year_3
# 		FROM `tabBudget Items` bi
# 		WHERE bi.parent IN ({placeholders})
# 		  AND bi.parenttype = 'Creche Budget'
# 		GROUP BY bi.parent
# 		""",
# 		params,
# 		as_dict=True,
# 	)
# 	raw_map = {r["cb_name"]: r for r in raw_rows}

# 	date_map = {}
# 	for cb_name, start_d, end_d in cb_names_start_dates:
# 		def _d(v):
# 			if not v: return None
# 			if isinstance(v, date): return v
# 			return date.fromisoformat(str(v)[:10])
# 		date_map[cb_name] = (_d(start_d), _d(end_d))

# 	result = {}

# 	for cb_name in cb_names:
# 		raw = raw_map.get(cb_name)
# 		if not raw:
# 			result[cb_name] = 0.0
# 			continue

# 		total_approved = float((raw["year_1"] or 0) +
# 		                       (raw["year_2"] or 0) +
# 		                       (raw["year_3"] or 0))

# 		if not apply_prorata:
# 			result[cb_name] = total_approved
# 			continue

# 		bud_start, bud_end = date_map.get(cb_name, (None, None))
# 		if not bud_start or not bud_end:
# 			result[cb_name] = 0.0
# 			continue

# 		# ── Three fixed 12-month calendar blocks from budget start ─────────
# 		#
# 		#   Block-1: bud_start          →  bud_start + 12m - 1 day
# 		#   Block-2: bud_start + 12m    →  bud_start + 24m - 1 day
# 		#   Block-3: bud_start + 24m    →  bud_end
# 		#
# 		#   Each block is always treated as 12 months for the per-month rate:
# 		#       monthly_rate = year_amount / 12
# 		#
# 		#   YTD contribution = monthly_rate × months overlapping the filter window

# 		blk_starts = [
# 			bud_start,
# 			_add_months(bud_start, 12),
# 			_add_months(bud_start, 24),
# 		]
# 		blk_ends = [
# 			_add_months(bud_start, 12) - timedelta(days=1),
# 			_add_months(bud_start, 24) - timedelta(days=1),
# 			bud_end,
# 		]
# 		year_cols = ["year_1", "year_2", "year_3"]

# 		total_ytd = 0.0

# 		for blk_start, blk_end, col in zip(blk_starts, blk_ends, year_cols):
# 			year_amt = float(raw.get(col) or 0)
# 			if not year_amt:
# 				continue

# 			monthly_rate = year_amt / 12  # always divide by 12

# 			for seg_start, seg_end in filter_segments:
# 				sel_months = _whole_months_overlap(
# 					blk_start, blk_end, seg_start, seg_end
# 				)
# 				if sel_months == 0:
# 					continue
# 				total_ytd += monthly_rate * sel_months

# 		result[cb_name] = round(total_ytd, 2)

# 	return result


# # ─── Utilisation ──────────────────────────────────────────────────────────────

# def _utilisation_amounts_bulk(cb_names, filters):
# 	if not cb_names:
# 		return {}

# 	filter_fys = filters.get("financial_year") or []
# 	if isinstance(filter_fys, str):
# 		filter_fys = [filter_fys]
# 	filter_fys = set(filter_fys)

# 	filter_start = filters.get("start_date")
# 	filter_end   = filters.get("end_date")

# 	extra_conditions = []
# 	params = {}

# 	month_filter_raw = filters.get("month") or []
# 	if isinstance(month_filter_raw, str):
# 		month_filter_raw = [month_filter_raw] if month_filter_raw.strip() else []
# 	month_filters = [m.strip() for m in month_filter_raw if str(m).strip()]

# 	if filter_start and filter_end:
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
# 		if filter_fys and month_filters:
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
# 			ph = ", ".join([f"%(fy{i})s" for i in range(len(filter_fys))])
# 			for i, fy in enumerate(sorted(filter_fys)):
# 				params[f"fy{i}"] = fy
# 			extra_conditions.append(f"CU.financial_year IN ({ph})")
# 		elif month_filters:
# 			ph = ", ".join([f"%(mf{i})s" for i in range(len(month_filters))])
# 			for i, m in enumerate(month_filters):
# 				params[f"mf{i}"] = m
# 			extra_conditions.append(f"CU.month IN ({ph})")

# 	where_extra      = (" AND " + " AND ".join(extra_conditions)) if extra_conditions else ""
# 	where_extra_bare = where_extra.replace("CU.", "") if where_extra else ""

# 	name_ph = ", ".join([f"%(cb{i})s" for i in range(len(cb_names))])
# 	for i, n in enumerate(cb_names):
# 		params[f"cb{i}"] = n

# 	rows = frappe.db.sql(
# 		f"""
# 		SELECT
# 			CU.budget_reference_id        AS cb_name,
# 			SUM(ui.total_amount)          AS total_utilisation
# 		FROM `tabCreche utilisation` CU
# 		INNER JOIN `tabUtilisation Items` ui
# 			ON ui.parent = CU.name AND ui.parenttype = 'Creche utilisation'
# 		WHERE CU.budget_reference_id IN ({name_ph})
# 		  {where_extra}
# 		GROUP BY CU.budget_reference_id
# 		""",
# 		params,
# 		as_dict=True,
# 	)

# 	_FY_POS = {
# 		"April":1,"May":2,"June":3,"July":4,"August":5,"September":6,
# 		"October":7,"November":8,"December":9,"January":10,"February":11,"March":12,
# 	}
# 	bal_candidates = frappe.db.sql(
# 		f"""
# 		SELECT
# 			budget_reference_id AS cb_name,
# 			financial_year,
# 			month,
# 			balance_amount
# 		FROM `tabCreche utilisation`
# 		WHERE budget_reference_id IN ({name_ph})
# 		  {where_extra_bare}
# 		""",
# 		params,
# 		as_dict=True,
# 	)
# 	bal_map = {}
# 	for r in bal_candidates:
# 		n   = r["cb_name"]
# 		fy  = r["financial_year"] or ""
# 		mp  = _FY_POS.get(r["month"], 0)
# 		key = (fy, mp)
# 		if n not in bal_map or key > bal_map[n][0]:
# 			bal_map[n] = (key, float(r["balance_amount"] or 0))
# 	bal_map = {n: v[1] for n, v in bal_map.items()}

# 	result = {}
# 	for r in rows:
# 		n = r["cb_name"]
# 		result[n] = (float(r["total_utilisation"] or 0), bal_map.get(n, 0.0))
# 	for n in cb_names:
# 		if n not in result:
# 			result[n] = (0.0, 0.0)
# 	return result


# # ─── Disbursement ─────────────────────────────────────────────────────────────

# def _disbursement_amounts_bulk(cb_names, filters):
# 	if not cb_names:
# 		return {}

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
# 		if filter_start:
# 			params["d_start"] = filter_start
# 			extra_conditions.append("DT.date_of_disbursement >= %(d_start)s")
# 		if filter_end:
# 			params["d_end"] = filter_end
# 			extra_conditions.append("DT.date_of_disbursement <= %(d_end)s")

# 	elif filter_fys and month_filters:
# 		date_clauses = []
# 		k = 0
# 		for fy in sorted(filter_fys):
# 			fy_start_year = int(fy.split("-")[0])
# 			for mn in month_filters:
# 				month_num = list(calendar.month_name).index(mn)
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
# 			CD.budget_reference_id   AS cb_name,
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
# 	conditions, params = build_conditions(filters)
# 	return frappe.db.sql(
# 		f"""
# 		SELECT
# 			CB.name                         AS cb_name,
# 			CB.partner_id,
# 			CB.partner_name,
# 			CB.budget_reference_name,
# 			CB.state,
# 			CB.district,
# 			CB.block,
# 			CB.financial_year,
# 			COALESCE(CB.no_of_creches, 0)   AS no_of_creches,
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
# 	level   = (filters.get("level") or "partner wise").lower()
# 	budgets = _fetch_budgets(filters)

# 	if not budgets:
# 		return []

# 	cb_names = [b["cb_name"] for b in budgets]

# 	budget_amounts = _budget_amounts_bulk(
# 		[(b["cb_name"], b["start_date"], b["end_date"]) for b in budgets], filters
# 	)
# 	util_amounts   = _utilisation_amounts_bulk(cb_names, filters)
# 	disb_amounts   = _disbursement_amounts_bulk(cb_names, filters)

# 	for b in budgets:
# 		n = b["cb_name"]
# 		b["total_budget"]      = budget_amounts.get(n, 0.0)
# 		b["total_utilisation"], b["bank_balance"] = util_amounts.get(n, (0.0, 0.0))
# 		b["total_disbursed"]   = disb_amounts.get(n, 0.0)

# 	period_filter_active = bool(
# 		filters.get("financial_year") or filters.get("month") or
# 		filters.get("start_date")     or filters.get("end_date")
# 	)
# 	if period_filter_active:
# 		budgets = [
# 			b for b in budgets
# 			if b["total_budget"] > 0 or b["total_utilisation"] > 0 or b["total_disbursed"] > 0
# 		]

# 	result = []
# 	grand_budget = grand_utilisation = grand_disbursed = grand_balance = grand_creches = 0

# 	if level == "budget wise":
# 		for b in budgets:
# 			row = {
# 				"row_name": b["budget_reference_name"], "partner_id": b["partner_id"],
# 				"state": b["state"], "financial_year": b["financial_year"],
# 				"no_of_creches": b["no_of_creches"], "start_date": b["start_date"],
# 				"end_date": b["end_date"], "grant_id": b["grant_id"],
# 				"total_budget": b["total_budget"], "total_utilisation": b["total_utilisation"],
# 				"total_disbursed": b["total_disbursed"], "bank_balance": b["bank_balance"],
# 				"indent": 0, "is_budget_row": 1,
# 			}
# 			calc_percents(row)
# 			result.append(row)
# 			grand_budget      += b["total_budget"];  grand_utilisation += b["total_utilisation"]
# 			grand_disbursed   += b["total_disbursed"]; grand_balance   += b["bank_balance"]
# 			grand_creches     += b["no_of_creches"]

# 	elif level in ("partner wise", "partner"):
# 		partner_map = OrderedDict()
# 		for b in budgets:
# 			pid = b["partner_id"]
# 			if pid not in partner_map:
# 				partner_map[pid] = {"meta": b, "rows": []}
# 			partner_map[pid]["rows"].append(b)

# 		for pid, info in partner_map.items():
# 			rows  = info["rows"]; meta = info["meta"]
# 			totals = _sum_rows(rows)
# 			unique_states = sorted({r["state"] for r in rows if r.get("state")})
# 			parent_row = {
# 				"row_name": meta["partner_name"], "partner_id": pid,
# 				"state": ", ".join(unique_states), "financial_year": "",
# 				"no_of_creches": totals["no_of_creches"], "start_date": None, "end_date": None,
# 				"grant_id": "", "total_budget": totals["total_budget"],
# 				"total_utilisation": totals["total_utilisation"],
# 				"total_disbursed": totals["total_disbursed"], "bank_balance": totals["bank_balance"],
# 				"indent": 0,
# 			}
# 			calc_percents(parent_row)
# 			result.append(parent_row)
# 			grand_budget      += totals["total_budget"];  grand_utilisation += totals["total_utilisation"]
# 			grand_disbursed   += totals["total_disbursed"]; grand_balance   += totals["bank_balance"]
# 			grand_creches     += totals["no_of_creches"]

# 			for idx, b in enumerate(rows):
# 				child_row = {
# 					"row_name": b["budget_reference_name"], "partner_id": b["partner_id"],
# 					"state": b["state"], "financial_year": b["financial_year"],
# 					"no_of_creches": b["no_of_creches"], "start_date": b["start_date"],
# 					"end_date": b["end_date"], "grant_id": b["grant_id"],
# 					"total_budget": b["total_budget"], "total_utilisation": b["total_utilisation"],
# 					"total_disbursed": b["total_disbursed"], "bank_balance": b["bank_balance"],
# 					"indent": 1, "_row_idx": idx,
# 				}
# 				calc_percents(child_row)
# 				result.append(child_row)

# 	else:
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
# 				"row_name": group_val, "partner_id": "",
# 				"state": group_val if location_field == "state" else "",
# 				"financial_year": "", "no_of_creches": g_totals["no_of_creches"],
# 				"start_date": None, "end_date": None, "grant_id": "",
# 				"total_budget": g_totals["total_budget"],
# 				"total_utilisation": g_totals["total_utilisation"],
# 				"total_disbursed": g_totals["total_disbursed"],
# 				"bank_balance": g_totals["bank_balance"], "indent": 0,
# 			}
# 			calc_percents(parent_row)
# 			result.append(parent_row)
# 			grand_budget      += g_totals["total_budget"];  grand_utilisation += g_totals["total_utilisation"]
# 			grand_disbursed   += g_totals["total_disbursed"]; grand_balance   += g_totals["bank_balance"]
# 			grand_creches     += g_totals["no_of_creches"]

# 			for idx, (pid, p_data) in enumerate(partners.items()):
# 				rows = p_data["rows"]; meta = p_data["meta"]
# 				p_totals = _sum_rows(rows)
# 				child_row = {
# 					"row_name": meta["partner_name"], "partner_id": pid,
# 					"state": meta.get("state", ""), "financial_year": "",
# 					"no_of_creches": p_totals["no_of_creches"], "start_date": None, "end_date": None,
# 					"grant_id": "", "total_budget": p_totals["total_budget"],
# 					"total_utilisation": p_totals["total_utilisation"],
# 					"total_disbursed": p_totals["total_disbursed"],
# 					"bank_balance": p_totals["bank_balance"], "indent": 1, "_row_idx": idx,
# 				}
# 				calc_percents(child_row)
# 				result.append(child_row)

# 	if result:
# 		grand_row = {
# 			"row_name": "Grand Total", "partner_id": "", "state": "", "financial_year": "",
# 			"no_of_creches": grand_creches, "start_date": None, "end_date": None, "grant_id": "",
# 			"total_budget": grand_budget, "total_utilisation": grand_utilisation,
# 			"total_disbursed": grand_disbursed, "bank_balance": grand_balance,
# 			"indent": 0, "is_grand_total": 1,
# 		}
# 		calc_percents(grand_row)
# 		result.append(grand_row)

# 	return result


# # ─── Excel export ──────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def download_excel(filters=None):
# 	import io, json
# 	from datetime import date as _date_cls
# 	import openpyxl
# 	from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
# 	from openpyxl.utils import get_column_letter

# 	if isinstance(filters, str):
# 		filters = json.loads(filters)
# 	filters = filters or {}

# 	level = (filters.get("level") or "partner wise").lower()
# 	data  = get_data(filters)

# 	level_titles = {
# 		"partner wise": "Partner Wise", "budget wise": "Budget Wise",
# 		"state": "State Wise", "district": "District Wise", "block": "Block Wise",
# 	}
# 	level_label = level_titles.get(level, level.title())

# 	wb = openpyxl.Workbook()
# 	ws = wb.active
# 	ws.title = level_label[:31]
# 	ws.sheet_view.showGridLines = False

# 	# ── Style primitives ───────────────────────────────────────────────────────
# 	def S(h):
# 		return PatternFill("solid", fgColor=h)

# 	def F(bold=False, color="1E293B", size=10, italic=False):
# 		return Font(bold=bold, color=color, size=size, italic=italic, name="Calibri")

# 	def sd(c, st="thin"):
# 		return Side(style=st, color=c)

# 	def B(t="CBD5E1", b="CBD5E1", l="CBD5E1", r="CBD5E1",
# 	      ts="thin", bs="thin", ls="thin", rs="thin"):
# 		return Border(top=sd(t, ts), bottom=sd(b, bs), left=sd(l, ls), right=sd(r, rs))

# 	MID  = Alignment(horizontal="center", vertical="center", wrap_text=True)
# 	RVC  = Alignment(horizontal="right",  vertical="center")
# 	LVC  = Alignment(horizontal="left",   vertical="center")
# 	LIND = Alignment(horizontal="left",   vertical="center", indent=1)

# 	# ── Palette ────────────────────────────────────────────────────────────────
# 	BG_TITLE  = "2D5F8A"
# 	BG_META   = "F4F7FA"
# 	BG_HDR_GR = "E8EFF6"
# 	BG_HDR    = "4A86C8"
# 	BG_PAR    = "E3EEF9"
# 	BG_ODD    = "F7FAFD"
# 	BG_EVEN   = "FFFFFF"
# 	BG_GTOT   = "2D5F8A"

# 	FG_TITLE  = "FFFFFF"
# 	FG_META   = "5A6E82"
# 	FG_GRP    = "3D5A73"
# 	FG_HDR    = "FFFFFF"
# 	FG_PAR    = "1F4E79"
# 	FG_CHILD  = "3D5A73"
# 	FG_GTOT   = "FFFFFF"
# 	FG_FILTER = "2D6A9F"

# 	AC_BLUE   = "4A86C8"
# 	AC_TEAL   = "3A9DA8"
# 	AC_NAVY   = "2D5F8A"
# 	RULE_MED  = "AABDD0"
# 	RULE_LT   = "D6E4F0"
# 	CHIP_BG   = "D6E8F7"

# 	TL_G_BG   = "DCFCE7";  TL_G_FG = "166534"
# 	TL_A_BG   = "FEF9C3";  TL_A_FG = "854D0E"
# 	TL_R_BG   = "FEE2E2";  TL_R_FG = "991B1B"

# 	# ── Column definitions ─────────────────────────────────────────────────────
# 	first_col_hdr = {
# 		"budget wise": "Budget Reference", "state": "State / Partner",
# 		"district":    "District / Partner", "block": "Block / Partner",
# 	}.get(level, "Partner / Budget")

# 	COLS = [
# 		(first_col_hdr,                           "row_name",               36, "str"),
# 		("Partner ID",                             "partner_id",             16, "str"),
# 		("State",                                  "state",                  18, "str"),
# 		("Budget\nFY",                             "financial_year",         11, "str"),
# 		("Creches",                                "no_of_creches",           9, "int"),
# 		("Start\nDate",                            "start_date",             12, "date"),
# 		("End\nDate",                              "end_date",               12, "date"),
# 		("Grant ID",                               "grant_id",               15, "str"),
# 		("Approved\nBudget (\u20b9)",              "total_budget",           20, "cur"),
# 		("Utilisation\n(\u20b9)",                  "total_utilisation",      18, "cur"),
# 		("Disbursed\n(\u20b9)",                    "total_disbursed",        20, "cur"),
# 		("Unutilized\nDisb. (\u20b9)",             "disb_minus_util",        20, "cur"),
# 		("Unutilized Disb.\n- Bank Bal. (\u20b9)", "unutil_disb_minus_bank", 24, "cur"),
# 		("Bank\nBalance (\u20b9)",                 "bank_balance",           19, "cur"),
# 		("Budget\nvs Util %",                      "utilised_vs_budget",     13, "pct"),
# 		("Disb.\nvs Util %",                       "utilised_vs_disbursed",  13, "pct"),
# 	]
# 	N = len(COLS)

# 	COL_GROUPS = [
# 		(1,  8,  "BUDGET IDENTITY"),
# 		(9,  14, "FINANCIAL SUMMARY  (\u20b9)"),
# 		(15, 16, "PERFORMANCE"),
# 	]
# 	GS = {g[0] for g in COL_GROUPS}
# 	GE = {g[1] for g in COL_GROUPS}

# 	for i, (_, _, w, _) in enumerate(COLS, 1):
# 		ws.column_dimensions[get_column_letter(i)].width = w

# 	# ── Row helpers ────────────────────────────────────────────────────────────
# 	cur_row = 0
# 	def nr(h=15):
# 		nonlocal cur_row
# 		cur_row += 1
# 		ws.row_dimensions[cur_row].height = h
# 		return cur_row

# 	def fill_row(r, fill, c1=1, c2=None):
# 		for c in range(c1, (c2 or N) + 1):
# 			ws.cell(row=r, column=c).fill = fill

# 	def mrow(r, val, fill, font, align=LVC, c1=1, c2=None):
# 		c2 = c2 or N
# 		ws.merge_cells(start_row=r, start_column=c1, end_row=r, end_column=c2)
# 		cell = ws.cell(row=r, column=c1, value=val)
# 		cell.fill = fill; cell.font = font; cell.alignment = align
# 		fill_row(r, fill, c1, c2)
# 		return cell

# 	# ── TITLE ──────────────────────────────────────────────────────────────────
# 	r = nr(30)
# 	mrow(r, "  Creche Budget Utilisation Report",
# 	     S(BG_TITLE), F(bold=True, color=FG_TITLE, size=14))

# 	r = nr(3)
# 	mrow(r, None, S(AC_TEAL), F())

# 	r = nr(18)
# 	half = N // 2
# 	ws.merge_cells(start_row=r, start_column=1,      end_row=r, end_column=half)
# 	ws.merge_cells(start_row=r, start_column=half+1, end_row=r, end_column=N)
# 	lc = ws.cell(row=r, column=1,      value=f"  View: {level_label}")
# 	rc = ws.cell(row=r, column=half+1, value=f"Generated: {_date_cls.today().strftime('%d %B %Y')}  ")
# 	for cell, al in ((lc, LVC), (rc, Alignment(horizontal="right", vertical="center"))):
# 		cell.fill = S(BG_META); cell.font = F(color=FG_META, size=10); cell.alignment = al
# 	fill_row(r, S(BG_META))

# 	# ── FILTERS ────────────────────────────────────────────────────────────────
# 	active = {k: v for k, v in filters.items()
# 	          if v not in (None, "", []) and not (isinstance(v, list) and len(v) == 0)}
# 	if active:
# 		r = nr(18)
# 		mrow(r, "  Filters Applied", S(BG_META), F(bold=True, color=AC_BLUE, size=9))
# 		for c in range(1, N + 1):
# 			ws.cell(row=r, column=c).border = B(b=RULE_MED, bs="thin")

# 		r = nr(16)
# 		fill_row(r, S(BG_META))
# 		col_pos = 1
# 		for key, val in active.items():
# 			if col_pos > N:
# 				break
# 			label = _FILTER_LABELS.get(key, key.replace("_", " ").title())
# 			dval  = ", ".join(str(x) for x in val) if isinstance(val, list) else str(val)
# 			end_p = min(col_pos + 2, N)
# 			ws.merge_cells(start_row=r, start_column=col_pos, end_row=r, end_column=end_p)
# 			cc = ws.cell(row=r, column=col_pos, value=f"  {label}: {dval}  ")
# 			cc.fill = S(CHIP_BG); cc.font = F(color=FG_FILTER, size=9, bold=True)
# 			cc.alignment = LVC
# 			cc.border = B(t=AC_BLUE, b=AC_BLUE, l=AC_BLUE, r=AC_BLUE)
# 			col_pos = end_p + 1

# 	nr(8)

# 	# ── COLUMN GROUP HEADERS ───────────────────────────────────────────────────
# 	rg = nr(14)
# 	fill_row(rg, S(BG_HDR_GR))
# 	for c1, c2, label in COL_GROUPS:
# 		ws.merge_cells(start_row=rg, start_column=c1, end_row=rg, end_column=c2)
# 		gc = ws.cell(row=rg, column=c1, value=label)
# 		gc.fill = S(BG_HDR_GR); gc.font = F(bold=True, color=FG_GRP, size=8)
# 		gc.alignment = MID
# 		rule = AC_TEAL if "FINANCIAL" in label else AC_BLUE
# 		for c in range(c1, c2 + 1):
# 			ws.cell(row=rg, column=c).fill   = S(BG_HDR_GR)
# 			ws.cell(row=rg, column=c).border = B(t=BG_HDR_GR, b=rule,
# 			                                     l=BG_HDR_GR, r=BG_HDR_GR, bs="medium")

# 	# ── COLUMN HEADERS ─────────────────────────────────────────────────────────
# 	rh = nr(36)
# 	for i, (hdr, _, _, _) in enumerate(COLS, 1):
# 		hc = ws.cell(row=rh, column=i, value=hdr)
# 		hc.fill = S(BG_HDR); hc.font = F(bold=True, color=FG_HDR, size=9)
# 		hc.alignment = MID
# 		l_st = "medium" if i in GS else "thin"
# 		r_st = "medium" if i in GE else "thin"
# 		l_cl = RULE_LT  if i in GS else BG_HDR
# 		r_cl = RULE_LT  if i in GE else BG_HDR
# 		hc.border = B(t=BG_HDR, b=RULE_LT, l=l_cl, r=r_cl,
# 		              ts="thin", bs="medium", ls=l_st, rs=r_st)

# 	ws.freeze_panes = f"A{rh + 1}"

# 	# ── DATA ROWS ──────────────────────────────────────────────────────────────
# 	do_pid_merge = level in ("partner wise", "partner")
# 	group_spans  = []
# 	par_r        = None
# 	lch_r        = None
# 	alt          = 0

# 	for row_data in data:
# 		is_grand   = bool(row_data.get("is_grand_total"))
# 		is_parent  = row_data.get("indent", 0) == 0
# 		is_bud_row = bool(row_data.get("is_budget_row"))

# 		r = nr(24 if is_grand else (21 if is_parent else 16))

# 		if is_parent and not is_grand:
# 			if do_pid_merge and par_r and lch_r:
# 				group_spans.append((par_r, lch_r))
# 			par_r = r; lch_r = None; alt = 0
# 		elif not is_parent:
# 			lch_r = r; alt += 1

# 		for ci, (_, fn, _, dtype) in enumerate(COLS, 1):
# 			raw  = row_data.get(fn)
# 			cell = ws.cell(row=r, column=ci)

# 			if dtype == "cur":
# 				cell.value = float(raw or 0); cell.number_format = '\u20b9#,##0'
# 			elif dtype == "pct":
# 				cell.value = float(raw or 0); cell.number_format = '0.0"%"'
# 			elif dtype == "int":
# 				cell.value = int(raw or 0)
# 			elif dtype == "date":
# 				cell.value = raw if raw else ""; cell.number_format = "DD-MMM-YY"
# 			else:
# 				val = str(raw) if raw not in (None, "") else ""
# 				if fn == "row_name" and not is_parent:
# 					val = "       " + val.lstrip()
# 				cell.value = val

# 			is_num = dtype in ("cur", "pct", "int")
# 			l_st   = "medium" if ci in GS else "thin"
# 			r_st   = "medium" if ci in GE else "thin"
# 			sep_l  = RULE_MED if ci in GS else RULE_LT
# 			sep_r  = RULE_MED if ci in GE else RULE_LT

# 			if is_grand:
# 				cell.fill      = S(BG_GTOT)
# 				cell.font      = F(bold=True, color=FG_GTOT, size=10)
# 				cell.alignment = RVC if is_num else LIND
# 				lc_ = AC_TEAL if ci == 1 else sep_l
# 				ls_ = "medium" if ci == 1 else l_st
# 				cell.border = B(t=AC_TEAL, b=AC_TEAL, l=lc_, r=sep_r,
# 				                ts="medium", bs="medium", ls=ls_, rs=r_st)

# 			elif is_parent:
# 				cell.fill      = S(BG_PAR)
# 				cell.font      = F(bold=True, color=FG_PAR, size=10)
# 				cell.alignment = RVC if is_num else LIND
# 				lc_ = AC_NAVY if ci == 1 else sep_l
# 				ls_ = "medium" if ci == 1 else l_st
# 				cell.border = B(t=RULE_LT, b=RULE_LT, l=lc_, r=sep_r,
# 				                ts="thin", bs="thin", ls=ls_, rs=r_st)

# 			else:
# 				bg = BG_ODD if alt % 2 == 1 else BG_EVEN
# 				cell.fill      = S(bg)
# 				cell.font      = F(color=FG_CHILD, size=9)
# 				cell.alignment = RVC if is_num else LIND
# 				cell.border    = B(t=RULE_LT, b=RULE_LT, l=sep_l, r=sep_r,
# 				                   ts="thin", bs="thin", ls=l_st, rs=r_st)

# 			if dtype == "pct" and not is_grand:
# 				pct_val = float(raw or 0)
# 				tl_bg, tl_fg = (
# 					(TL_G_BG, TL_G_FG) if pct_val >= 75 else
# 					(TL_A_BG, TL_A_FG) if pct_val >= 50 else
# 					(TL_R_BG, TL_R_FG)
# 				)
# 				cell.fill      = S(tl_bg)
# 				cell.font      = F(bold=True, color=tl_fg, size=9)
# 				cell.alignment = MID
# 				cell.border    = B(t=tl_bg, b=tl_bg, l=tl_bg, r=tl_bg)

# 	# ── Partner-ID column merge ────────────────────────────────────────────────
# 	if do_pid_merge and par_r and lch_r:
# 		group_spans.append((par_r, lch_r))
# 	for p_r, lc_r in group_spans:
# 		if lc_r > p_r:
# 			ws.merge_cells(start_row=p_r, start_column=2, end_row=lc_r, end_column=2)
# 			ws.cell(row=p_r, column=2).alignment = MID

# 	# ── BOTTOM RULE ────────────────────────────────────────────────────────────
# 	r = nr(3)
# 	mrow(r, None, S(AC_TEAL), F())

# 	# ── FOOTER ─────────────────────────────────────────────────────────────────
# 	r = nr(14)
# 	mrow(r,
# 	     f"  Creche Budget Utilisation  \u00b7  {level_label}  \u00b7  "
# 	     f"Generated {_date_cls.today().strftime('%d %B %Y')}  \u00b7  Confidential",
# 	     S(BG_META), F(color=FG_META, size=8, italic=True))

# 	# ── Print / page setup ─────────────────────────────────────────────────────
# 	ws.page_setup.orientation = "landscape"
# 	ws.page_setup.paperSize   = 9
# 	ws.page_setup.fitToPage   = True
# 	ws.page_setup.fitToWidth  = 1
# 	ws.page_setup.fitToHeight = 0
# 	ws.print_title_rows       = f"{rh}:{rh}"
# 	ws.page_margins.left      = 0.4
# 	ws.page_margins.right     = 0.4
# 	ws.page_margins.top       = 0.5
# 	ws.page_margins.bottom    = 0.5

# 	# ── Stream to browser ──────────────────────────────────────────────────────
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

from creche_reports.api import permissions as _perm

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


# ─── User-permission enforcement ───────────────────────────────────────────────
#
# Partner / Budget / State / District / Block scoping is delegated to the
# shared creche_reports.api.permissions module (also used by both
# dashboards), which unions every granted dimension into a single permitted
# Creche Budget *name* list rather than independently AND-ing column value
# sets — a partner permitted via one budget can have OTHER budgets outside
# any permitted state/district/block, and an AND-based approach would
# incorrectly leak those. See that module's docstring for the full rationale.


def _partner_docnames_to_display_names(docnames):
	"""
	Creche Budget's `partner_id` filter is matched against CB.partner_name
	(a plain display string fetched from Creche Partners), not against the
	Creche Partners docname itself (CRP-00001). User Permission always
	stores the docname, so it has to be translated to the display name
	before it can be used to filter this report — otherwise a permitted
	docname simply never matches CB.partner_name and the query silently
	returns nothing instead of the user's permitted records.
	"""
	if not docnames:
		return []
	rows = frappe.get_all(
		"Creche Partners",
		filters={"name": ["in", list(docnames)]},
		pluck="partner_name",
	)
	return [r for r in rows if r]


def apply_user_permission_filters(filters):
	"""
	Narrow `filters` so the query only ever returns budgets the current user
	is permitted to see, via a single `__permitted_budget_names__` key
	consumed by build_conditions() as `CB.name IN (...)`. Requested
	partner_id/state/district/block values pass through unchanged as normal
	report filters — the permission boundary is enforced independently as
	the budget-name constraint, not by narrowing those value sets (which
	would be unsound — see module docstring).
	"""
	filters = dict(filters or {})

	effective_budget_ids = _perm.get_effective_budget_ids()
	if effective_budget_ids is not None:
		filters["__permitted_budget_names__"] = effective_budget_ids
		filters["__deny_all__"] = not effective_budget_ids
	else:
		filters["__deny_all__"] = False

	return filters


@frappe.whitelist()
def get_permitted_filter_values(doctype):
	"""
	Called from the report's client script (report .js) to populate the
	Partner / State / District / Block filter dropdowns with only the
	values the current user is permitted to see (derived from the union of
	every budget reachable through ANY granted permission dimension, not
	just a direct permission on `doctype` itself — e.g. a State permission
	should also narrow the Partner dropdown to that state's partners).

	Usage from the report's .js, e.g. for a Link/Select filter:

	    frappe.query_reports["Creche Budget Utilisation"].filters = [
	        {
	            fieldname: "partner_id",
	            label: "Partner",
	            fieldtype: "MultiSelectList",
	            get_data: function() {
	                return frappe.call({
	                    method: "<module_path>.get_permitted_filter_values",
	                    args: { doctype: "Creche Partners" }
	                }).then(r => r.message);
	            }
	        },
	        ...
	    ]

	Note: for `doctype="Creche Partners"` this returns partner_name display
	values (matching what the report's filters actually compare against),
	not docnames.
	"""
	budgets = _perm.get_permitted_budgets()

	if doctype == "Creche Partners":
		if budgets is None:
			return frappe.get_all("Creche Partners", pluck="partner_name", order_by="partner_name asc")
		partner_ids = {b["partner_id"] for b in budgets if b.get("partner_id")}
		return sorted(_partner_docnames_to_display_names(partner_ids))

	column = {"State": "state", "District": "district", "Block": "block"}.get(doctype)
	if column is None:
		return frappe.get_all(doctype, pluck="name", order_by="name asc")

	if budgets is None:
		return frappe.get_all(doctype, pluck="name", order_by="name asc")
	return sorted({b[column] for b in budgets if b.get(column)})


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


# ─── Calendar-month helpers for budget pro-rata ───────────────────────────────

def _add_months(d, months):
	"""Return the date exactly `months` calendar months after d."""
	m = d.month - 1 + months
	year = d.year + m // 12
	month = m % 12 + 1
	last = calendar.monthrange(year, month)[1]
	return date(year, month, min(d.day, last))


def _whole_months_overlap(a_start, a_end, b_start, b_end):
	"""
	Count whole calendar months whose 1st day falls within both
	[a_start, a_end] and [b_start, b_end].
	"""
	start = max(date(a_start.year, a_start.month, 1),
	            date(b_start.year, b_start.month, 1))
	end   = min(date(a_end.year,   a_end.month,   1),
	            date(b_end.year,   b_end.month,   1))
	if start > end:
		return 0
	return (end.year - start.year) * 12 + (end.month - start.month) + 1


# ─── Entry point ──────────────────────────────────────────────────────────────

def execute(filters=None):
	filters = apply_user_permission_filters(filters or {})
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
		{"label": _(first_label),                          "fieldname": "row_name",               "fieldtype": "Data",     "width": 260},
		{"label": _("Partner ID"),                         "fieldname": "partner_id",             "fieldtype": "Data",     "width": 150},
		{"label": _("State"),                              "fieldname": "state",                  "fieldtype": "Data",     "width": 200},
		{"label": _("Budget Approval FY"),                 "fieldname": "financial_year",         "fieldtype": "Data",     "width": 190},
		{"label": _("No of Creches"),                      "fieldname": "no_of_creches",          "fieldtype": "Int",      "width": 120},
		{"label": _("Start Date"),                         "fieldname": "start_date",             "fieldtype": "Date",     "width": 150},
		{"label": _("End Date"),                           "fieldname": "end_date",               "fieldtype": "Date",     "width": 150},
		{"label": _("Grant ID"),                           "fieldname": "grant_id",               "fieldtype": "Data",     "width": 160},
		{"label": _("Approved Budget"),                    "fieldname": "total_budget",           "fieldtype": "Currency", "width": 160},
		{"label": _("Utilisation"),                        "fieldname": "total_utilisation",      "fieldtype": "Currency", "width": 150},
		{"label": _("Disbursed Amount"),                   "fieldname": "total_disbursed",        "fieldtype": "Currency", "width": 200},
		{"label": _("Unutilized Disbursement"),            "fieldname": "disb_minus_util",        "fieldtype": "Currency", "width": 230},
		{"label": _("Unutilized Disb. - Bank Balance"),    "fieldname": "unutil_disb_minus_bank", "fieldtype": "Currency", "width": 260},
		{"label": _("Reported Bank Balance"),              "fieldname": "bank_balance",           "fieldtype": "Currency", "width": 230},
		{"label": _("Budget vs Utilized %"),               "fieldname": "utilised_vs_budget",     "fieldtype": "Percent",  "width": 230},
		{"label": _("Disbursed vs Utilized %"),            "fieldname": "utilised_vs_disbursed",  "fieldtype": "Percent",  "width": 230},
	]


# ─── Condition builder ─────────────────────────────────────────────────────────

def build_conditions(filters):
	conditions = []
	params = {}

	if filters.get("__deny_all__"):
		return "WHERE 1 = 0", {}

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

	permitted_budget_names = filters.get("__permitted_budget_names__")
	if permitted_budget_names is not None:
		if not permitted_budget_names:
			return "WHERE 1 = 0", {}
		for i, name in enumerate(permitted_budget_names):
			params[f"p_permitted_{i}"] = name
		placeholders = ", ".join(f"%(p_permitted_{i})s" for i in range(len(permitted_budget_names)))
		conditions.append(f"CB.name IN ({placeholders})")

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
	bank_bal    = row.get("bank_balance")       or 0
	row["disb_minus_util"]        = disbursed - utilisation
	row["unutil_disb_minus_bank"] = row["disb_minus_util"] - bank_bal
	row["utilised_vs_budget"]     = round((utilisation / budget)    * 100, 0) if budget    > 0 else 0
	row["utilised_vs_disbursed"]  = round((utilisation / disbursed) * 100, 0) if disbursed > 0 else 0


# ─── Budget pro-rata (calendar-month blocks, not FY-based) ────────────────────

def _budget_amounts_bulk(cb_names_start_dates, filters):
	if not cb_names_start_dates:
		return {}

	def _to_date(v):
		if not v: return None
		if isinstance(v, date): return v
		return date.fromisoformat(str(v)[:10])

	filter_fys = filters.get("financial_year") or []
	if isinstance(filter_fys, str):
		filter_fys = [filter_fys]
	filter_fys = set(filter_fys)

	month_filter_raw = filters.get("month") or []
	if isinstance(month_filter_raw, str):
		month_filter_raw = [month_filter_raw] if month_filter_raw.strip() else []
	month_filters = [m.strip() for m in month_filter_raw if str(m).strip()]

	raw_start = _to_date(filters.get("start_date"))
	raw_end   = _to_date(filters.get("end_date"))

	# ── Build filter segments ──────────────────────────────────────────────────
	filter_segments = []

	if raw_start or raw_end:
		seg_start = raw_start or (raw_end   - timedelta(days=3 * 366))
		seg_end   = raw_end   or (raw_start + timedelta(days=3 * 366))
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

	# ── Fetch year_1 / year_2 / year_3 from DB ────────────────────────────────
	cb_names     = [t[0] for t in cb_names_start_dates]
	placeholders = ", ".join([f"%(n{i})s" for i in range(len(cb_names))])
	params       = {f"n{i}": n for i, n in enumerate(cb_names)}

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

	date_map = {}
	for cb_name, start_d, end_d in cb_names_start_dates:
		def _d(v):
			if not v: return None
			if isinstance(v, date): return v
			return date.fromisoformat(str(v)[:10])
		date_map[cb_name] = (_d(start_d), _d(end_d))

	result = {}

	for cb_name in cb_names:
		raw = raw_map.get(cb_name)
		if not raw:
			result[cb_name] = 0.0
			continue

		total_approved = float((raw["year_1"] or 0) +
		                       (raw["year_2"] or 0) +
		                       (raw["year_3"] or 0))

		if not apply_prorata:
			result[cb_name] = total_approved
			continue

		bud_start, bud_end = date_map.get(cb_name, (None, None))
		if not bud_start or not bud_end:
			result[cb_name] = 0.0
			continue

		# ── Three fixed 12-month calendar blocks from budget start ─────────
		#
		#   Block-1: bud_start          →  bud_start + 12m - 1 day
		#   Block-2: bud_start + 12m    →  bud_start + 24m - 1 day
		#   Block-3: bud_start + 24m    →  bud_end
		#
		#   Each block is always treated as 12 months for the per-month rate:
		#       monthly_rate = year_amount / 12
		#
		#   YTD contribution = monthly_rate × months overlapping the filter window

		blk_starts = [
			bud_start,
			_add_months(bud_start, 12),
			_add_months(bud_start, 24),
		]
		blk_ends = [
			_add_months(bud_start, 12) - timedelta(days=1),
			_add_months(bud_start, 24) - timedelta(days=1),
			bud_end,
		]
		year_cols = ["year_1", "year_2", "year_3"]

		total_ytd = 0.0

		for blk_start, blk_end, col in zip(blk_starts, blk_ends, year_cols):
			year_amt = float(raw.get(col) or 0)
			if not year_amt:
				continue

			monthly_rate = year_amt / 12  # always divide by 12

			for seg_start, seg_end in filter_segments:
				sel_months = _whole_months_overlap(
					blk_start, blk_end, seg_start, seg_end
				)
				if sel_months == 0:
					continue
				total_ytd += monthly_rate * sel_months

		result[cb_name] = round(total_ytd, 2)

	return result


# ─── Utilisation ──────────────────────────────────────────────────────────────

def _utilisation_amounts_bulk(cb_names, filters):
	if not cb_names:
		return {}

	filter_fys = filters.get("financial_year") or []
	if isinstance(filter_fys, str):
		filter_fys = [filter_fys]
	filter_fys = set(filter_fys)

	filter_start = filters.get("start_date")
	filter_end   = filters.get("end_date")

	extra_conditions = []
	params = {}

	month_filter_raw = filters.get("month") or []
	if isinstance(month_filter_raw, str):
		month_filter_raw = [month_filter_raw] if month_filter_raw.strip() else []
	month_filters = [m.strip() for m in month_filter_raw if str(m).strip()]

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
			CU.budget_reference_id        AS cb_name,
			SUM(ui.total_amount)          AS total_utilisation
		FROM `tabCreche utilisation` CU
		INNER JOIN `tabUtilisation Items` ui
			ON ui.parent = CU.name AND ui.parenttype = 'Creche utilisation'
		WHERE CU.budget_reference_id IN ({name_ph})
		  {where_extra}
		GROUP BY CU.budget_reference_id
		""",
		params,
		as_dict=True,
	)

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
	from datetime import date as _date_cls
	import openpyxl
	from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
	from openpyxl.utils import get_column_letter

	if isinstance(filters, str):
		filters = json.loads(filters)
	filters = apply_user_permission_filters(filters or {})

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
	ws.sheet_view.showGridLines = False

	# ── Style primitives ───────────────────────────────────────────────────────
	def S(h):
		return PatternFill("solid", fgColor=h)

	def F(bold=False, color="1E293B", size=10, italic=False):
		return Font(bold=bold, color=color, size=size, italic=italic, name="Calibri")

	def sd(c, st="thin"):
		return Side(style=st, color=c)

	def B(t="CBD5E1", b="CBD5E1", l="CBD5E1", r="CBD5E1",
	      ts="thin", bs="thin", ls="thin", rs="thin"):
		return Border(top=sd(t, ts), bottom=sd(b, bs), left=sd(l, ls), right=sd(r, rs))

	MID  = Alignment(horizontal="center", vertical="center", wrap_text=True)
	RVC  = Alignment(horizontal="right",  vertical="center")
	LVC  = Alignment(horizontal="left",   vertical="center")
	LIND = Alignment(horizontal="left",   vertical="center", indent=1)

	# ── Palette ────────────────────────────────────────────────────────────────
	BG_TITLE  = "2D5F8A"
	BG_META   = "F4F7FA"
	BG_HDR_GR = "E8EFF6"
	BG_HDR    = "4A86C8"
	BG_PAR    = "E3EEF9"
	BG_ODD    = "F7FAFD"
	BG_EVEN   = "FFFFFF"
	BG_GTOT   = "2D5F8A"

	FG_TITLE  = "FFFFFF"
	FG_META   = "5A6E82"
	FG_GRP    = "3D5A73"
	FG_HDR    = "FFFFFF"
	FG_PAR    = "1F4E79"
	FG_CHILD  = "3D5A73"
	FG_GTOT   = "FFFFFF"
	FG_FILTER = "2D6A9F"

	AC_BLUE   = "4A86C8"
	AC_TEAL   = "3A9DA8"
	AC_NAVY   = "2D5F8A"
	RULE_MED  = "AABDD0"
	RULE_LT   = "D6E4F0"
	CHIP_BG   = "D6E8F7"

	TL_G_BG   = "DCFCE7";  TL_G_FG = "166534"
	TL_A_BG   = "FEF9C3";  TL_A_FG = "854D0E"
	TL_R_BG   = "FEE2E2";  TL_R_FG = "991B1B"

	# ── Column definitions ─────────────────────────────────────────────────────
	first_col_hdr = {
		"budget wise": "Budget Reference", "state": "State / Partner",
		"district":    "District / Partner", "block": "Block / Partner",
	}.get(level, "Partner / Budget")

	COLS = [
		(first_col_hdr,                           "row_name",               36, "str"),
		("Partner ID",                             "partner_id",             16, "str"),
		("State",                                  "state",                  18, "str"),
		("Budget\nFY",                             "financial_year",         11, "str"),
		("Creches",                                "no_of_creches",           9, "int"),
		("Start\nDate",                            "start_date",             12, "date"),
		("End\nDate",                              "end_date",               12, "date"),
		("Grant ID",                               "grant_id",               15, "str"),
		("Approved\nBudget (\u20b9)",              "total_budget",           20, "cur"),
		("Utilisation\n(\u20b9)",                  "total_utilisation",      18, "cur"),
		("Disbursed\n(\u20b9)",                    "total_disbursed",        20, "cur"),
		("Unutilized\nDisb. (\u20b9)",             "disb_minus_util",        20, "cur"),
		("Unutilized Disb.\n- Bank Bal. (\u20b9)", "unutil_disb_minus_bank", 24, "cur"),
		("Bank\nBalance (\u20b9)",                 "bank_balance",           19, "cur"),
		("Budget\nvs Util %",                      "utilised_vs_budget",     13, "pct"),
		("Disb.\nvs Util %",                       "utilised_vs_disbursed",  13, "pct"),
	]
	N = len(COLS)

	COL_GROUPS = [
		(1,  8,  "BUDGET IDENTITY"),
		(9,  14, "FINANCIAL SUMMARY  (\u20b9)"),
		(15, 16, "PERFORMANCE"),
	]
	GS = {g[0] for g in COL_GROUPS}
	GE = {g[1] for g in COL_GROUPS}

	for i, (_, _, w, _) in enumerate(COLS, 1):
		ws.column_dimensions[get_column_letter(i)].width = w

	# ── Row helpers ────────────────────────────────────────────────────────────
	cur_row = 0
	def nr(h=15):
		nonlocal cur_row
		cur_row += 1
		ws.row_dimensions[cur_row].height = h
		return cur_row

	def fill_row(r, fill, c1=1, c2=None):
		for c in range(c1, (c2 or N) + 1):
			ws.cell(row=r, column=c).fill = fill

	def mrow(r, val, fill, font, align=LVC, c1=1, c2=None):
		c2 = c2 or N
		ws.merge_cells(start_row=r, start_column=c1, end_row=r, end_column=c2)
		cell = ws.cell(row=r, column=c1, value=val)
		cell.fill = fill; cell.font = font; cell.alignment = align
		fill_row(r, fill, c1, c2)
		return cell

	# ── TITLE ──────────────────────────────────────────────────────────────────
	r = nr(30)
	mrow(r, "  Creche Budget Utilisation Report",
	     S(BG_TITLE), F(bold=True, color=FG_TITLE, size=14))

	r = nr(3)
	mrow(r, None, S(AC_TEAL), F())

	r = nr(18)
	half = N // 2
	ws.merge_cells(start_row=r, start_column=1,      end_row=r, end_column=half)
	ws.merge_cells(start_row=r, start_column=half+1, end_row=r, end_column=N)
	lc = ws.cell(row=r, column=1,      value=f"  View: {level_label}")
	rc = ws.cell(row=r, column=half+1, value=f"Generated: {_date_cls.today().strftime('%d %B %Y')}  ")
	for cell, al in ((lc, LVC), (rc, Alignment(horizontal="right", vertical="center"))):
		cell.fill = S(BG_META); cell.font = F(color=FG_META, size=10); cell.alignment = al
	fill_row(r, S(BG_META))

	# ── FILTERS ────────────────────────────────────────────────────────────────
	active = {k: v for k, v in filters.items()
	          if k != "__deny_all__" and v not in (None, "", []) and not (isinstance(v, list) and len(v) == 0)}
	if active:
		r = nr(18)
		mrow(r, "  Filters Applied", S(BG_META), F(bold=True, color=AC_BLUE, size=9))
		for c in range(1, N + 1):
			ws.cell(row=r, column=c).border = B(b=RULE_MED, bs="thin")

		r = nr(16)
		fill_row(r, S(BG_META))
		col_pos = 1
		for key, val in active.items():
			if col_pos > N:
				break
			label = _FILTER_LABELS.get(key, key.replace("_", " ").title())
			dval  = ", ".join(str(x) for x in val) if isinstance(val, list) else str(val)
			end_p = min(col_pos + 2, N)
			ws.merge_cells(start_row=r, start_column=col_pos, end_row=r, end_column=end_p)
			cc = ws.cell(row=r, column=col_pos, value=f"  {label}: {dval}  ")
			cc.fill = S(CHIP_BG); cc.font = F(color=FG_FILTER, size=9, bold=True)
			cc.alignment = LVC
			cc.border = B(t=AC_BLUE, b=AC_BLUE, l=AC_BLUE, r=AC_BLUE)
			col_pos = end_p + 1

	nr(8)

	# ── COLUMN GROUP HEADERS ───────────────────────────────────────────────────
	rg = nr(14)
	fill_row(rg, S(BG_HDR_GR))
	for c1, c2, label in COL_GROUPS:
		ws.merge_cells(start_row=rg, start_column=c1, end_row=rg, end_column=c2)
		gc = ws.cell(row=rg, column=c1, value=label)
		gc.fill = S(BG_HDR_GR); gc.font = F(bold=True, color=FG_GRP, size=8)
		gc.alignment = MID
		rule = AC_TEAL if "FINANCIAL" in label else AC_BLUE
		for c in range(c1, c2 + 1):
			ws.cell(row=rg, column=c).fill   = S(BG_HDR_GR)
			ws.cell(row=rg, column=c).border = B(t=BG_HDR_GR, b=rule,
			                                     l=BG_HDR_GR, r=BG_HDR_GR, bs="medium")

	# ── COLUMN HEADERS ─────────────────────────────────────────────────────────
	rh = nr(36)
	for i, (hdr, _, _, _) in enumerate(COLS, 1):
		hc = ws.cell(row=rh, column=i, value=hdr)
		hc.fill = S(BG_HDR); hc.font = F(bold=True, color=FG_HDR, size=9)
		hc.alignment = MID
		l_st = "medium" if i in GS else "thin"
		r_st = "medium" if i in GE else "thin"
		l_cl = RULE_LT  if i in GS else BG_HDR
		r_cl = RULE_LT  if i in GE else BG_HDR
		hc.border = B(t=BG_HDR, b=RULE_LT, l=l_cl, r=r_cl,
		              ts="thin", bs="medium", ls=l_st, rs=r_st)

	ws.freeze_panes = f"A{rh + 1}"

	# ── DATA ROWS ──────────────────────────────────────────────────────────────
	do_pid_merge = level in ("partner wise", "partner")
	group_spans  = []
	par_r        = None
	lch_r        = None
	alt          = 0

	for row_data in data:
		is_grand   = bool(row_data.get("is_grand_total"))
		is_parent  = row_data.get("indent", 0) == 0
		is_bud_row = bool(row_data.get("is_budget_row"))

		r = nr(24 if is_grand else (21 if is_parent else 16))

		if is_parent and not is_grand:
			if do_pid_merge and par_r and lch_r:
				group_spans.append((par_r, lch_r))
			par_r = r; lch_r = None; alt = 0
		elif not is_parent:
			lch_r = r; alt += 1

		for ci, (_, fn, _, dtype) in enumerate(COLS, 1):
			raw  = row_data.get(fn)
			cell = ws.cell(row=r, column=ci)

			if dtype == "cur":
				cell.value = float(raw or 0); cell.number_format = '\u20b9#,##0'
			elif dtype == "pct":
				cell.value = float(raw or 0); cell.number_format = '0.0"%"'
			elif dtype == "int":
				cell.value = int(raw or 0)
			elif dtype == "date":
				cell.value = raw if raw else ""; cell.number_format = "DD-MMM-YY"
			else:
				val = str(raw) if raw not in (None, "") else ""
				if fn == "row_name" and not is_parent:
					val = "       " + val.lstrip()
				cell.value = val

			is_num = dtype in ("cur", "pct", "int")
			l_st   = "medium" if ci in GS else "thin"
			r_st   = "medium" if ci in GE else "thin"
			sep_l  = RULE_MED if ci in GS else RULE_LT
			sep_r  = RULE_MED if ci in GE else RULE_LT

			if is_grand:
				cell.fill      = S(BG_GTOT)
				cell.font      = F(bold=True, color=FG_GTOT, size=10)
				cell.alignment = RVC if is_num else LIND
				lc_ = AC_TEAL if ci == 1 else sep_l
				ls_ = "medium" if ci == 1 else l_st
				cell.border = B(t=AC_TEAL, b=AC_TEAL, l=lc_, r=sep_r,
				                ts="medium", bs="medium", ls=ls_, rs=r_st)

			elif is_parent:
				cell.fill      = S(BG_PAR)
				cell.font      = F(bold=True, color=FG_PAR, size=10)
				cell.alignment = RVC if is_num else LIND
				lc_ = AC_NAVY if ci == 1 else sep_l
				ls_ = "medium" if ci == 1 else l_st
				cell.border = B(t=RULE_LT, b=RULE_LT, l=lc_, r=sep_r,
				                ts="thin", bs="thin", ls=ls_, rs=r_st)

			else:
				bg = BG_ODD if alt % 2 == 1 else BG_EVEN
				cell.fill      = S(bg)
				cell.font      = F(color=FG_CHILD, size=9)
				cell.alignment = RVC if is_num else LIND
				cell.border    = B(t=RULE_LT, b=RULE_LT, l=sep_l, r=sep_r,
				                   ts="thin", bs="thin", ls=l_st, rs=r_st)

			if dtype == "pct" and not is_grand:
				pct_val = float(raw or 0)
				tl_bg, tl_fg = (
					(TL_G_BG, TL_G_FG) if pct_val >= 75 else
					(TL_A_BG, TL_A_FG) if pct_val >= 50 else
					(TL_R_BG, TL_R_FG)
				)
				cell.fill      = S(tl_bg)
				cell.font      = F(bold=True, color=tl_fg, size=9)
				cell.alignment = MID
				cell.border    = B(t=tl_bg, b=tl_bg, l=tl_bg, r=tl_bg)

	# ── Partner-ID column merge ────────────────────────────────────────────────
	if do_pid_merge and par_r and lch_r:
		group_spans.append((par_r, lch_r))
	for p_r, lc_r in group_spans:
		if lc_r > p_r:
			ws.merge_cells(start_row=p_r, start_column=2, end_row=lc_r, end_column=2)
			ws.cell(row=p_r, column=2).alignment = MID

	# ── BOTTOM RULE ────────────────────────────────────────────────────────────
	r = nr(3)
	mrow(r, None, S(AC_TEAL), F())

	# ── FOOTER ─────────────────────────────────────────────────────────────────
	r = nr(14)
	mrow(r,
	     f"  Creche Budget Utilisation  \u00b7  {level_label}  \u00b7  "
	     f"Generated {_date_cls.today().strftime('%d %B %Y')}  \u00b7  Confidential",
	     S(BG_META), F(color=FG_META, size=8, italic=True))

	# ── Print / page setup ─────────────────────────────────────────────────────
	ws.page_setup.orientation = "landscape"
	ws.page_setup.paperSize   = 9
	ws.page_setup.fitToPage   = True
	ws.page_setup.fitToWidth  = 1
	ws.page_setup.fitToHeight = 0
	ws.print_title_rows       = f"{rh}:{rh}"
	ws.page_margins.left      = 0.4
	ws.page_margins.right     = 0.4
	ws.page_margins.top       = 0.5
	ws.page_margins.bottom    = 0.5

	# ── Stream to browser ──────────────────────────────────────────────────────
	buf = io.BytesIO()
	wb.save(buf)
	buf.seek(0)

	safe_level = level_label.replace(" ", "_")
	frappe.response["filename"]    = f"Budget_Utilisation_{safe_level}.xlsx"
	frappe.response["filecontent"] = buf.getvalue()
	frappe.response["type"]        = "binary"
# """
# creche_reports/api/creche_dashboard.py

# All server-side methods for the Creche Dashboard page, consolidated into
# a single module:
#   - Partner/permission helpers + main budget-utilisation-disbursement summary
#   - Disbursement panel + budget/utilisation line item drill-downs
#   - Pending Utilization (missing submissions) summary + reminder emails
#   - Excel/PDF export for drill-down tables
# """

# import frappe
# from frappe.utils import flt, getdate, nowdate, add_days, now_datetime, get_datetime, get_url
# from datetime import date as _date, datetime
# import calendar as _calendar
# import json
# import io

# try:
# 	from dateutil.relativedelta import relativedelta
# except ImportError:  # pragma: no cover - dateutil ships with Frappe by default
# 	relativedelta = None

# MONTH_ORDER = [
# 	"January", "February", "March", "April", "May", "June",
# 	"July", "August", "September", "October", "November", "December",
# ]


# # ══════════════════════════════════════════════════════════════════════════
# # PRO-RATA / PERMISSION HELPERS + MAIN SUMMARY + LINE ITEMS + DISBURSEMENT
# # (formerly budget_utilisation_summary.py)
# # ══════════════════════════════════════════════════════════════════════════

# # ──────────────────────────────────────────────────────────────────────────────
# # PRO-RATA BUDGET HELPERS
# # ──────────────────────────────────────────────────────────────────────────────

# _FY_MONTH_NAMES = [
# 	"April","May","June","July","August","September",
# 	"October","November","December","January","February","March",
# ]
# _FY_MONTH_POS = {m: i for i, m in enumerate(_FY_MONTH_NAMES)}

# def _to_date(v):
# 	if not v: return None
# 	if isinstance(v, _date): return v
# 	return _date.fromisoformat(str(v)[:10])

# def _date_to_fy(d):
# 	d = _to_date(d)
# 	if d is None: return None
# 	if d.month >= 4:
# 		return f"{d.year}-{str(d.year + 1)[2:]}"
# 	return f"{d.year - 1}-{str(d.year)[2:]}"

# def _fy_start_end(fy_str):
# 	y = int(fy_str.split("-")[0])
# 	return _date(y, 4, 1), _date(y + 1, 3, 31)

# def _fy_for_year_col(budget_start, col_offset):
# 	budget_start = _to_date(budget_start)
# 	if budget_start is None: return None
# 	base_fy = _date_to_fy(budget_start)
# 	base_y  = int(base_fy.split("-")[0])
# 	y = base_y + col_offset
# 	return f"{y}-{str(y + 1)[2:]}"

# def _months_overlap(a_start, a_end, b_start, b_end):
# 	"""Count distinct calendar months in overlap of two date ranges."""
# 	os = max(a_start, b_start)
# 	oe = min(a_end,   b_end)
# 	if os > oe: return 0
# 	count = 0
# 	y, m = os.year, os.month
# 	ey, em = oe.year, oe.month
# 	while (y, m) <= (ey, em):
# 		count += 1
# 		m += 1
# 		if m > 12: m = 1; y += 1
# 	return count

# def _prorata_for_fy(year_amount, bud_start, bud_end, fy_start, fy_end, filt_start, filt_end):
# 	if not year_amount: return 0.0
# 	active = _months_overlap(bud_start, bud_end, fy_start, fy_end)
# 	if active == 0: return 0.0
# 	eff_s = max(filt_start, fy_start)
# 	eff_e = min(filt_end,   fy_end)
# 	if eff_s > eff_e: return 0.0
# 	selected = _months_overlap(bud_start, bud_end, eff_s, eff_e)
# 	if selected == 0: return 0.0
# 	return float(year_amount) / active * selected

# def _compute_prorata_budget(budget_name, bud_start, bud_end, filter_segments):
# 	if not filter_segments:
# 		return None

# 	rows = frappe.db.sql(
# 		"""
# 		SELECT
# 			SUM(COALESCE(year_1,0)) AS year_1,
# 			SUM(COALESCE(year_2,0)) AS year_2,
# 			SUM(COALESCE(year_3,0)) AS year_3
# 		FROM `tabBudget Items`
# 		WHERE parent = %s AND parenttype = 'Creche Budget'
# 		""",
# 		(budget_name,), as_dict=True,
# 	)
# 	if not rows or not rows[0]: return 0.0
# 	raw = rows[0]

# 	bud_s = _to_date(bud_start)
# 	bud_e = _to_date(bud_end)
# 	if not bud_s or not bud_e: return 0.0

# 	total = 0.0
# 	for offset, col in enumerate(["year_1","year_2","year_3"]):
# 		amt = float(raw.get(col) or 0)
# 		if not amt: continue
# 		col_fy = _fy_for_year_col(bud_s, offset)
# 		if not col_fy: continue
# 		fy_s, fy_e = _fy_start_end(col_fy)
# 		for seg_s, seg_e in filter_segments:
# 			if seg_e < fy_s or seg_s > fy_e: continue
# 			total += _prorata_for_fy(amt, bud_s, bud_e, fy_s, fy_e, seg_s, seg_e)

# 	return round(total, 2)

# def _build_filter_segments(filters):
# 	raw_start = _to_date(filters.get("start_date"))
# 	raw_end   = _to_date(filters.get("end_date"))

# 	filter_fys = filters.get("financial_year") or []
# 	if isinstance(filter_fys, str): filter_fys = [filter_fys]
# 	filter_fys = list(filter_fys)

# 	month_raw = filters.get("month") or []
# 	if isinstance(month_raw, str): month_raw = [month_raw] if month_raw.strip() else []
# 	month_filters = [m.strip() for m in month_raw if str(m).strip()]

# 	if raw_start or raw_end:
# 		from datetime import timedelta
# 		seg_s = raw_start or (raw_end - timedelta(days=3*366))
# 		seg_e = raw_end   or (raw_start + timedelta(days=3*366))
# 		return [(seg_s, seg_e)]

# 	if filter_fys and month_filters:
# 		segs = []
# 		for fy in filter_fys:
# 			fy_start_year = int(fy.split("-")[0])
# 			for mn in month_filters:
# 				month_num = list(_calendar.month_name).index(mn)
# 				year      = fy_start_year if month_num >= 4 else fy_start_year + 1
# 				last_day  = _calendar.monthrange(year, month_num)[1]
# 				segs.append((_date(year, month_num, 1), _date(year, month_num, last_day)))
# 		return segs

# 	if filter_fys:
# 		segs = []
# 		for fy in filter_fys:
# 			fy_s, fy_e = _fy_start_end(fy)
# 			segs.append((fy_s, fy_e))
# 		return segs

# 	return []

# # ──────────────────────────────────────────────────────────────────────────────
# # PERMISSION HELPERS
# # ──────────────────────────────────────────────────────────────────────────────

# def _get_user_permitted_partners():
# 	user  = frappe.session.user
# 	roles = frappe.get_roles(user)
# 	if "System Manager" in roles or user == "Administrator":
# 		return None
# 	rows = frappe.db.sql(
# 		"""
# 		SELECT for_value FROM `tabUser Permission`
# 		WHERE user = %s AND allow = 'Creche Partners'
# 		""",
# 		(user,), as_dict=True,
# 	)
# 	if not rows: return None
# 	return [r.for_value for r in rows if r.for_value]

# def _intersect(filter_list, permitted):
# 	if permitted is None: return filter_list
# 	if not permitted: return []
# 	if not filter_list: return permitted
# 	pset = set(permitted)
# 	return [p for p in filter_list if p in pset]

# def _empty_summary():
# 	return {
# 		"total_budget":0,"total_disbursement":0,
# 		"total_utilisation":0,"total_bank_balance":0,
# 		"total_interest":0,"total_creches":0,
# 		"utilisation_pct":0,"disbursement_pct":0,
# 	}

# def _assert_partner_access(partner_id: str):
# 	permitted = _get_user_permitted_partners()
# 	if permitted is None: return
# 	if partner_id not in permitted:
# 		frappe.throw(frappe._("You do not have permission to access this partner"), frappe.PermissionError)

# # ──────────────────────────────────────────────────────────────────────────────
# # PARTNER OPTIONS
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def debug_user_permissions():
# 	user = frappe.session.user
# 	roles = frappe.get_roles(user)
# 	rows     = frappe.db.sql("SELECT * FROM `tabUser Permission` WHERE user = %s", (user,), as_dict=True)
# 	filtered = frappe.db.sql("SELECT * FROM `tabUser Permission` WHERE user = %s AND allow = %s", (user,"Creche Partners"), as_dict=True)
# 	distinct = frappe.db.sql("SELECT DISTINCT allow FROM `tabUser Permission` WHERE user = %s", (user,), as_dict=True)
# 	return {"user":user,"roles":roles,"all_permissions":rows,"creche_partners_permissions":filtered,"distinct_allows":distinct}

# @frappe.whitelist()
# def get_partner_options(txt=""):
# 	permitted = _get_user_permitted_partners()
# 	filters   = {}
# 	if permitted is not None:
# 		if not permitted: return []
# 		filters["name"] = ["in", permitted]
# 	if txt:
# 		filters["partner_name"] = ["like", f"%{txt}%"]
# 	rows = frappe.get_all("Creche Partners", filters=filters, fields=["name","partner_name"],
# 	                      order_by="partner_name asc", limit=500, ignore_permissions=True)
# 	return [{"name": r.name, "partner_name": r.partner_name or r.name} for r in rows]

# @frappe.whitelist()
# def get_user_permission_scope():
# 	permitted = _get_user_permitted_partners()
# 	if permitted is None: return {"restricted": False, "partner_ids": []}
# 	return {"restricted": True, "partner_ids": permitted}

# # ──────────────────────────────────────────────────────────────────────────────
# # MAIN SUMMARY
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_partner_budget_summary(filters=None):
# 	if isinstance(filters, str):
# 		import json; filters = json.loads(filters)
# 	filters = filters or {}

# 	permitted          = _get_user_permitted_partners()
# 	filter_partners    = filters.get("partner_id") or None
# 	effective_partners = _intersect(filter_partners, permitted)

# 	if effective_partners is not None and len(effective_partners) == 0:
# 		return {"summary": _empty_summary(), "partners": []}

# 	start_date = filters.get("start_date") or None
# 	end_date   = filters.get("end_date")   or None

# 	filter_segments = _build_filter_segments(filters)
# 	apply_prorata   = bool(filter_segments)

# 	budget_filters = {}
# 	if effective_partners:
# 		budget_filters["partner_id"] = ["in", effective_partners]
# 	if filters.get("budget_ref"):
# 		budget_filters["budget_reference_name"] = ["in", filters["budget_ref"]]
# 	if filters.get("grant_id"):
# 		budget_filters["grant_id"] = ["in", filters["grant_id"]]
# 	if filters.get("state"):
# 		budget_filters["state"] = ["in", filters["state"]]
# 	if filters.get("district"):
# 		budget_filters["district"] = ["in", filters["district"]]
# 	if filters.get("block"):
# 		budget_filters["block"] = ["in", filters["block"]]
# 	if start_date:
# 		budget_filters["end_date"]   = [">=", start_date]
# 	if end_date:
# 		budget_filters["start_date"] = ["<=", end_date]

# 	budgets = frappe.get_all(
# 		"Creche Budget", filters=budget_filters,
# 		fields=["name","partner_id","partner_name","grant_id","budget_reference_name",
# 		        "state","district","block","start_date","end_date","financial_year",
# 		        "no_of_creches","total_budget"],
# 		order_by="partner_name asc, budget_reference_name asc",
# 		ignore_permissions=True,
# 	)

# 	budget_ids = [b.name for b in budgets]

# 	# ── Budget Items sums (bulk) ──────────────────────────────────────────────
# 	budget_items_map = {}
# 	if budget_ids:
# 		ph_bi = ", ".join([f"%(bim{i})s" for i in range(len(budget_ids))])
# 		bim_params = {f"bim{i}": n for i, n in enumerate(budget_ids)}
# 		bi_rows = frappe.db.sql(
# 			"SELECT parent,"
# 			" SUM(COALESCE(year_1,0)) AS year_1,"
# 			" SUM(COALESCE(year_2,0)) AS year_2,"
# 			" SUM(COALESCE(year_3,0)) AS year_3"
# 			" FROM `tabBudget Items`"
# 			f" WHERE parent IN ({ph_bi}) AND parenttype = 'Creche Budget'"
# 			" GROUP BY parent",
# 			bim_params, as_dict=True,
# 		)
# 		for r in bi_rows:
# 			budget_items_map[r.parent] = (
# 				float(r.year_1 or 0) + float(r.year_2 or 0) + float(r.year_3 or 0)
# 			)

# 	# ── Disbursement (date-based) ─────────────────────────────────────────────
# 	disbursement_map = {}
# 	if budget_ids:
# 		disb_headers = frappe.get_all("Creche Disbursement",
# 			filters={"budget_reference_id": ["in", budget_ids]},
# 			fields=["name","budget_reference_id"], ignore_permissions=True)
# 		disb_parent_names = [d.name for d in disb_headers]
# 		disb_bid_map = {d.name: d.budget_reference_id for d in disb_headers}

# 		if disb_parent_names:
# 			tracker_rows = frappe.get_all("Disbursement Tracker",
# 				filters={"parent": ["in", disb_parent_names], "parenttype": "Creche Disbursement"},
# 				fields=["parent","date_of_disbursement","disbursed_amount"],
# 				ignore_permissions=True)

# 			if filter_segments:
# 				tracker_rows = [
# 					t for t in tracker_rows
# 					if t.date_of_disbursement and any(
# 						seg_s <= getdate(str(t.date_of_disbursement)) <= seg_e
# 						for seg_s, seg_e in filter_segments
# 					)
# 				]
# 			elif start_date or end_date:
# 				tracker_rows = [
# 					t for t in tracker_rows
# 					if t.date_of_disbursement
# 					and (not start_date or getdate(str(t.date_of_disbursement)) >= getdate(start_date))
# 					and (not end_date   or getdate(str(t.date_of_disbursement)) <= getdate(end_date))
# 				]

# 			for t in tracker_rows:
# 				bid = disb_bid_map.get(t.parent)
# 				if bid:
# 					disbursement_map[bid] = disbursement_map.get(bid, 0.0) + flt(t.disbursed_amount)

# 	# ── Utilisation: sum from Utilisation Items child rows ────────────────────
# 	utilisation_map  = {}
# 	bank_balance_map = {}
# 	interest_map     = {}

# 	if budget_ids:
# 		filter_fys = filters.get("financial_year") or []
# 		if isinstance(filter_fys, str): filter_fys = [filter_fys]
# 		month_raw = filters.get("month") or []
# 		if isinstance(month_raw, str): month_raw = [month_raw] if month_raw.strip() else []
# 		month_filters = [m.strip() for m in month_raw if str(m).strip()]

# 		util_extra  = ""
# 		util_params = {}

# 		if start_date and end_date:
# 			def _local_fy_month_pairs(sd, ed):
# 				sd = _to_date(sd); ed = _to_date(ed)
# 				if not sd or not ed: return []
# 				import calendar as _cal
# 				pairs = []; cur = _date(sd.year, sd.month, 1)
# 				end_mo = _date(ed.year, ed.month, 1)
# 				while cur <= end_mo:
# 					fy = _date_to_fy(cur)
# 					pairs.append((fy, _cal.month_name[cur.month]))
# 					cur = _date(cur.year + 1, 1, 1) if cur.month == 12 else _date(cur.year, cur.month + 1, 1)
# 				return pairs

# 			pairs = _local_fy_month_pairs(start_date, end_date)
# 			if pairs:
# 				clauses = []
# 				for i, (fy, mn) in enumerate(pairs):
# 					util_params[f"ufy{i}"] = fy
# 					util_params[f"umn{i}"] = mn
# 					clauses.append(f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)")
# 				util_extra = " AND (" + " OR ".join(clauses) + ")"
# 			else:
# 				util_extra = " AND 1=0"

# 		elif filter_fys and month_filters:
# 			clauses = []
# 			k = 0
# 			for fy in sorted(filter_fys):
# 				for mn in month_filters:
# 					util_params[f"ufy{k}"] = fy
# 					util_params[f"umn{k}"] = mn
# 					clauses.append(f"(cu.financial_year = %(ufy{k})s AND cu.month = %(umn{k})s)")
# 					k += 1
# 			util_extra = " AND (" + " OR ".join(clauses) + ")"

# 		elif filter_fys:
# 			ph = ", ".join([f"%(ufy{i})s" for i in range(len(filter_fys))])
# 			for i, fy in enumerate(filter_fys): util_params[f"ufy{i}"] = fy
# 			util_extra = f" AND cu.financial_year IN ({ph})"

# 		elif month_filters:
# 			ph = ", ".join([f"%(umn{i})s" for i in range(len(month_filters))])
# 			for i, m in enumerate(month_filters): util_params[f"umn{i}"] = m
# 			util_extra = f" AND cu.month IN ({ph})"

# 		elif start_date:
# 			from datetime import date as _dt_today
# 			today = _dt_today.today()
# 			def _local_fy_month_pairs2(sd, ed):
# 				sd = _to_date(sd); ed = _to_date(ed)
# 				if not sd or not ed: return []
# 				import calendar as _cal
# 				pairs = []; cur = _date(sd.year, sd.month, 1)
# 				end_mo = _date(ed.year, ed.month, 1)
# 				while cur <= end_mo:
# 					fy = _date_to_fy(cur)
# 					pairs.append((fy, _cal.month_name[cur.month]))
# 					cur = _date(cur.year + 1, 1, 1) if cur.month == 12 else _date(cur.year, cur.month + 1, 1)
# 				return pairs
# 			pairs = _local_fy_month_pairs2(start_date, today)
# 			if pairs:
# 				clauses = []
# 				for i, (fy, mn) in enumerate(pairs):
# 					util_params[f"ufy{i}"] = fy
# 					util_params[f"umn{i}"] = mn
# 					clauses.append(f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)")
# 				util_extra = " AND (" + " OR ".join(clauses) + ")"

# 		if not util_extra and not filter_fys and not month_filters and not start_date and end_date:
# 			all_starts = [b.start_date for b in budgets if b.start_date]
# 			from datetime import date as _dt_ed
# 			earliestd = min((_to_date(s) for s in all_starts), default=_dt_ed.today())
# 			import calendar as _cal2
# 			pairs_ed = []
# 			cur = _date(earliestd.year, earliestd.month, 1)
# 			end_mo2 = _date(_to_date(end_date).year, _to_date(end_date).month, 1)
# 			while cur <= end_mo2:
# 				idx = len(pairs_ed)
# 				fy_val = _date_to_fy(cur)
# 				mn_val = _cal2.month_name[cur.month]
# 				util_params[f"ufy{idx}"] = fy_val
# 				util_params[f"umn{idx}"] = mn_val
# 				pairs_ed.append((fy_val, mn_val))
# 				cur = _date(cur.year + 1, 1, 1) if cur.month == 12 else _date(cur.year, cur.month + 1, 1)
# 			if pairs_ed:
# 				util_extra = " AND (" + " OR ".join(
# 					f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)"
# 					for i in range(len(pairs_ed))
# 				) + ")"

# 		bid_ph = ", ".join([f"%(bid{i})s" for i in range(len(budget_ids))])
# 		for i, n in enumerate(budget_ids): util_params[f"bid{i}"] = n

# 		util_rows = frappe.db.sql(
# 			f"""
# 			SELECT
# 				cu.budget_reference_id,
# 				SUM(ui.total_amount) AS total_util
# 			FROM `tabCreche utilisation` cu
# 			INNER JOIN `tabUtilisation Items` ui
# 				ON ui.parent = cu.name AND ui.parenttype = 'Creche utilisation'
# 			WHERE cu.budget_reference_id IN ({bid_ph})
# 			  {util_extra}
# 			GROUP BY cu.budget_reference_id
# 			""",
# 			util_params, as_dict=True,
# 		)
# 		for r in util_rows:
# 			utilisation_map[r.budget_reference_id] = flt(r.total_util)

# 		interest_rows = frappe.db.sql(
# 			f"""
# 			SELECT
# 				budget_reference_id,
# 				SUM(interest_from_bank) AS total_interest
# 			FROM `tabCreche utilisation`
# 			WHERE budget_reference_id IN ({bid_ph})
# 			  {util_extra.replace("cu.", "")}
# 			GROUP BY budget_reference_id
# 			""",
# 			util_params, as_dict=True,
# 		)
# 		for r in interest_rows:
# 			interest_map[r.budget_reference_id] = flt(r.total_interest)

# 		_FY_POS = {
# 			"April":1,"May":2,"June":3,"July":4,"August":5,"September":6,
# 			"October":7,"November":8,"December":9,"January":10,"February":11,"March":12,
# 		}
# 		bal_rows = frappe.db.sql(
# 			f"""
# 			SELECT
# 				budget_reference_id,
# 				financial_year,
# 				month,
# 				balance_amount
# 			FROM `tabCreche utilisation`
# 			WHERE budget_reference_id IN ({bid_ph})
# 			  {util_extra.replace("cu.", "")}
# 			""",
# 			util_params, as_dict=True,
# 		)
# 		bal_best = {}
# 		for r in bal_rows:
# 			bid = r.budget_reference_id
# 			fy  = r.financial_year or ""
# 			mp  = _FY_POS.get(r.month, 0)
# 			key = (fy, mp)
# 			if bid not in bal_best or key > bal_best[bid][0]:
# 				bal_best[bid] = (key, flt(r.balance_amount))
# 		bank_balance_map = {bid: v[1] for bid, v in bal_best.items()}

# 	# ── Assemble results ──────────────────────────────────────────────────────
# 	partners = {}
# 	grand = dict(budget=0.0, disbursement=0.0, utilisation=0.0, bank_balance=0.0, interest=0.0, creches=0)

# 	for budget in budgets:
# 		bid = budget.name

# 		raw_items_total = budget_items_map.get(bid)
# 		if raw_items_total is None:
# 			raw_items_total = flt(budget.total_budget)

# 		if apply_prorata:
# 			budget_amount = _compute_prorata_budget(bid, budget.start_date, budget.end_date, filter_segments)
# 			if budget_amount is None:
# 				budget_amount = raw_items_total
# 		else:
# 			budget_amount = raw_items_total

# 		disbursement = flt(disbursement_map.get(bid, 0))
# 		utilisation  = flt(utilisation_map.get(bid, 0))
# 		bank_balance = flt(bank_balance_map.get(bid, 0))
# 		interest     = flt(interest_map.get(bid, 0))
# 		creches      = int(budget.no_of_creches or 0)

# 		balance_budget            = budget_amount - utilisation
# 		utilised_pct              = round((utilisation / budget_amount * 100) if budget_amount else 0, 2)
# 		utilised_disbursement_pct = round((utilisation / disbursement * 100)  if disbursement  else 0, 2)

# 		partner_key = budget.partner_id or budget.partner_name or "Unknown"
# 		if partner_key not in partners:
# 			partners[partner_key] = {
# 				"partner_id": budget.partner_id, "partner_name": budget.partner_name,
# 				"total_budget":0.0,"total_disbursement":0.0,"total_utilisation":0.0,
# 				"total_balance_budget":0.0,"total_bank_balance":0.0,
# 				"total_interest":0.0,"total_creches":0,"budgets":[],
# 			}
# 		p = partners[partner_key]
# 		p["total_budget"]         += budget_amount
# 		p["total_disbursement"]   += disbursement
# 		p["total_utilisation"]    += utilisation
# 		p["total_balance_budget"] += balance_budget
# 		if bank_balance > 0:
# 			p["total_bank_balance"] = max(p["total_bank_balance"], bank_balance)
# 		elif p["total_bank_balance"] == 0:
# 			p["total_bank_balance"] = bank_balance
# 		p["total_interest"]       += interest
# 		p["total_creches"]        += creches
# 		p["budgets"].append({
# 			"budget_id": bid, "grant_id": budget.grant_id,
# 			"budget_reference_name": budget.budget_reference_name,
# 			"state": budget.state, "district": budget.district, "block": budget.block,
# 			"grant_start": budget.start_date, "grant_end": budget.end_date,
# 			"financial_year": budget.financial_year, "no_of_creches": creches,
# 			"budget": budget_amount, "disbursement": disbursement,
# 			"utilisation": utilisation, "utilised_pct": utilised_pct,
# 			"utilised_disbursement_pct": utilised_disbursement_pct,
# 			"balance_budget_amount": balance_budget,
# 			"bank_balance": bank_balance, "interest_from_bank": interest,
# 		})

# 		grand["budget"]       += budget_amount
# 		grand["disbursement"] += disbursement
# 		grand["utilisation"]  += utilisation
# 		grand["bank_balance"] += bank_balance
# 		grand["interest"]     += interest
# 		grand["creches"]      += creches

# 	result = []
# 	for p in partners.values():
# 		p["utilised_pct"] = round((p["total_utilisation"] / p["total_budget"] * 100) if p["total_budget"] else 0, 2)
# 		p["grant_ids"]    = ", ".join(sorted(set(b["grant_id"] for b in p["budgets"] if b["grant_id"])))
# 		p["budgets"]      = sorted(p["budgets"], key=lambda x: x["budget_reference_name"] or "")
# 		result.append(p)
# 	result.sort(key=lambda x: x["partner_name"] or "")

# 	gb = grand["budget"]
# 	return {
# 		"summary": {
# 			"total_budget":       grand["budget"],
# 			"total_disbursement": grand["disbursement"],
# 			"total_utilisation":  grand["utilisation"],
# 			"total_bank_balance": grand["bank_balance"],
# 			"total_interest":     grand["interest"],
# 			"total_creches":      grand["creches"],
# 			"utilisation_pct":    round((grand["utilisation"]  / gb * 100) if gb else 0, 2),
# 			"disbursement_pct":   round((grand["disbursement"] / gb * 100) if gb else 0, 2),
# 		},
# 		"partners": result,
# 	}

# # ──────────────────────────────────────────────────────────────────────────────
# # DISBURSEMENT PANEL DATA
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_disbursement_panel_data(budget_ids=None, partner_ids=None, start_date=None, end_date=None,
#                                 financial_year=None, month=None):
# 	permitted = _get_user_permitted_partners()
# 	def _to_list(v):
# 		if not v: return []
# 		if isinstance(v, str):
# 			try:
# 				p = json.loads(v)
# 				if isinstance(p, list): return [x for x in p if x]
# 			except: pass
# 			return [x.strip() for x in v.split(",") if x.strip()]
# 		return [x for x in v if x]

# 	budget_ids_list  = _to_list(budget_ids)
# 	partner_ids_list = _to_list(partner_ids)
# 	filter_fys       = _to_list(financial_year)
# 	month_filters    = [m.strip() for m in _to_list(month) if str(m).strip()]

# 	disb_filters = {}
# 	if budget_ids_list:
# 		if permitted is not None:
# 			br = frappe.get_all("Creche Budget",
# 				filters={"name":["in",budget_ids_list]},
# 				fields=["name","partner_id"], ignore_permissions=True)
# 			budget_ids_list = [r.name for r in br if r.partner_id in permitted]
# 			if not budget_ids_list: return []
# 		disb_filters["budget_reference_id"] = ["in", budget_ids_list]
# 	elif partner_ids_list:
# 		eff = _intersect(partner_ids_list, permitted)
# 		if eff is not None and not eff: return []
# 		if eff: disb_filters["partner_id"] = ["in", eff]
# 		elif permitted is not None: return []
# 	else:
# 		if permitted is not None:
# 			if not permitted: return []
# 			disb_filters["partner_id"] = ["in", permitted]

# 	disb_docs = frappe.get_all("Creche Disbursement", filters=disb_filters,
# 		fields=["name","budget_reference_id","budget_reference_name","partner_id","partner_name",
# 		        "grant_id","state","district","block","financial_year",
# 		        "total_disbursement","balence_budget","total_budget"],
# 		order_by="partner_name asc, budget_reference_name asc", ignore_permissions=True)
# 	if not disb_docs: return []

# 	parent_names = [d.name for d in disb_docs]
# 	tracker_rows = frappe.get_all("Disbursement Tracker",
# 		filters={"parent":["in",parent_names],"parenttype":"Creche Disbursement"},
# 		fields=["parent","date_of_disbursement","disbursed_amount"],
# 		order_by="date_of_disbursement asc", ignore_permissions=True)

# 	filter_segments = _build_filter_segments({
# 		"start_date": start_date, "end_date": end_date,
# 		"financial_year": filter_fys, "month": month_filters,
# 	})
# 	period_active = bool(filter_segments) or bool(start_date) or bool(end_date)

# 	if filter_segments:
# 		tracker_rows = [
# 			t for t in tracker_rows
# 			if t.date_of_disbursement and any(
# 				seg_s <= getdate(str(t.date_of_disbursement)) <= seg_e
# 				for seg_s, seg_e in filter_segments
# 			)
# 		]
# 	elif start_date or end_date:
# 		tracker_rows = [t for t in tracker_rows
# 			if t.date_of_disbursement
# 			and (not start_date or getdate(str(t.date_of_disbursement)) >= getdate(start_date))
# 			and (not end_date   or getdate(str(t.date_of_disbursement)) <= getdate(end_date))]

# 	tracker_map = {}
# 	for t in tracker_rows:
# 		tracker_map.setdefault(t.parent, []).append({
# 			"date_of_disbursement": str(t.date_of_disbursement) if t.date_of_disbursement else "",
# 			"disbursed_amount": flt(t.disbursed_amount),
# 		})

# 	result = []
# 	for doc in disb_docs:
# 		ft = tracker_map.get(doc.name, [])
# 		ftotal = sum(flt(t["disbursed_amount"]) for t in ft) if period_active else flt(doc.total_disbursement)
# 		result.append({
# 			"name": doc.name, "budget_reference_id": doc.budget_reference_id or "",
# 			"budget_reference_name": doc.budget_reference_name or "",
# 			"partner_id": doc.partner_id or "", "partner_name": doc.partner_name or "",
# 			"grant_id": doc.grant_id or "", "state": doc.state or "",
# 			"district": doc.district or "", "block": doc.block or "",
# 			"financial_year": doc.financial_year or "",
# 			"total_budget": flt(doc.total_budget), "total_disbursement": ftotal,
# 			"balence_budget": flt(doc.total_budget) - ftotal,
# 			"tracker": ft,
# 		})
# 	if period_active:
# 		result = [r for r in result if r["tracker"]]
# 	return result

# # ──────────────────────────────────────────────────────────────────────────────
# # BUDGET LINE ITEMS
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_budget_line_items(budget_id: str, start_date=None, end_date=None,
#                           financial_year=None, month=None):
# 	if not budget_id: return []
# 	partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
# 	_assert_partner_access(partner_id)

# 	def _pl(v):
# 		if not v: return []
# 		if isinstance(v, list): return [x for x in v if x]
# 		try:
# 			p = json.loads(v)
# 			if isinstance(p, list): return [x for x in p if x]
# 		except: pass
# 		return [x.strip() for x in str(v).split(",") if x.strip()]

# 	filter_fys    = _pl(financial_year)
# 	month_filters = [m.strip() for m in _pl(month) if str(m).strip()]

# 	rows = frappe.get_all("Budget Items",
# 		filters={"parent": budget_id, "parenttype": "Creche Budget"},
# 		fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
# 		        "budget_sub_head","year_1","year_2","year_3","total_amount","notes"],
# 		order_by="budget_main_head asc, type_of_expenses asc", ignore_permissions=True)

# 	filter_segments = _build_filter_segments({
# 		"start_date": start_date, "end_date": end_date,
# 		"financial_year": filter_fys, "month": month_filters,
# 	})
# 	bud_start, bud_end = frappe.db.get_value(
# 		"Creche Budget", budget_id, ["start_date", "end_date"])

# 	result = []
# 	for r in rows:
# 		if filter_segments and bud_start and bud_end:
# 			raw_total = flt(r.year_1) + flt(r.year_2) + flt(r.year_3)
# 			if raw_total > 0:
# 				prorated = 0.0
# 				for offset, col in enumerate(["year_1","year_2","year_3"]):
# 					amt = flt(getattr(r, col, 0))
# 					if not amt: continue
# 					col_fy = _fy_for_year_col(bud_start, offset)
# 					if not col_fy: continue
# 					fy_s, fy_e = _fy_start_end(col_fy)
# 					for seg_s, seg_e in filter_segments:
# 						if seg_e < fy_s or seg_s > fy_e: continue
# 						prorated += _prorata_for_fy(amt, _to_date(bud_start), _to_date(bud_end), fy_s, fy_e, seg_s, seg_e)
# 				scale = prorated / raw_total if raw_total else 0
# 				display_total = round(prorated, 2)
# 				y1 = round(flt(r.year_1) * scale, 2)
# 				y2 = round(flt(r.year_2) * scale, 2)
# 				y3 = round(flt(r.year_3) * scale, 2)
# 			else:
# 				display_total, y1, y2, y3 = flt(r.total_amount), flt(r.year_1), flt(r.year_2), flt(r.year_3)
# 		else:
# 			display_total, y1, y2, y3 = flt(r.total_amount), flt(r.year_1), flt(r.year_2), flt(r.year_3)

# 		result.append({
# 			"type_of_expenses_id": r.type_of_expenses_id,
# 			"type_of_expenses": r.type_of_expenses, "budget_main_head": r.budget_main_head,
# 			"budget_sub_head": r.budget_sub_head, "year_1": y1, "year_2": y2, "year_3": y3,
# 			"total_amount": display_total, "notes": r.notes or "",
# 		})
# 	return result

# # ──────────────────────────────────────────────────────────────────────────────
# # UTILISATION LINE ITEMS
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_utilisation_line_items(budget_id: str, start_date=None, end_date=None,
#                                financial_year=None, month=None):
# 	if not budget_id: return {"months": [], "records": []}
# 	partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
# 	_assert_partner_access(partner_id)

# 	def _parse_list(v):
# 		if not v: return []
# 		if isinstance(v, list): return [x for x in v if x]
# 		try:
# 			p = json.loads(v)
# 			if isinstance(p, list): return [x for x in p if x]
# 		except: pass
# 		return [x.strip() for x in str(v).split(",") if x.strip()]

# 	fy_list    = _parse_list(financial_year)
# 	month_list = _parse_list(month)

# 	util_filters = {"budget_reference_id": budget_id}
# 	if fy_list:    util_filters["financial_year"] = ["in", fy_list]
# 	if month_list: util_filters["month"]          = ["in", month_list]

# 	util_docs = frappe.get_all("Creche utilisation", filters=util_filters,
# 		fields=["name","month","financial_year","creation"],
# 		order_by="financial_year asc, month asc", ignore_permissions=True)

# 	if (start_date or end_date) and util_docs:
# 		util_docs = [d for d in util_docs if d.creation
# 			and (not start_date or getdate(str(d.creation)[:10]) >= getdate(start_date))
# 			and (not end_date   or getdate(str(d.creation)[:10]) <= getdate(end_date))]

# 	if not util_docs: return {"months": [], "records": []}

# 	MONTH_ORDER = ["January","February","March","April","May","June",
# 	               "July","August","September","October","November","December"]
# 	records = []; seen = []
# 	for doc in util_docs:
# 		items = frappe.get_all("Utilisation Items",
# 			filters={"parent": doc.name, "parenttype": "Creche utilisation"},
# 			fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
# 			        "budget_sub_head","total_amount","notes"],
# 			order_by="budget_main_head asc, type_of_expenses asc", ignore_permissions=True)
# 		ml = doc.month or "Unknown"
# 		records.append({"month": ml, "financial_year": doc.financial_year or "",
# 		                "utilisation_id": doc.name,
# 		                "items": [{"type_of_expenses_id": r.type_of_expenses_id,
# 		                           "type_of_expenses": r.type_of_expenses,
# 		                           "budget_main_head": r.budget_main_head,
# 		                           "budget_sub_head": r.budget_sub_head,
# 		                           "total_amount": flt(r.total_amount), "notes": r.notes or ""}
# 		                          for r in items]})
# 		if ml not in seen: seen.append(ml)

# 	def msort(m):
# 		try: return MONTH_ORDER.index(m)
# 		except: return 99
# 	seen.sort(key=msort)
# 	records.sort(key=lambda r: (r["financial_year"], msort(r["month"])))
# 	return {"months": seen, "records": records}


# # ══════════════════════════════════════════════════════════════════════════
# # PENDING UTILIZATION  (formerly pending_utilisation.py)
# # ══════════════════════════════════════════════════════════════════════════

# def _get_partner_emails(partner_ids):
#     """
#     Returns {partner_id: email}.
#     Strategy 1: User Permission (allow='Creche Partners') -> User.email
#     Strategy 2: direct email field on the Creche Partners doctype (fallback)
#     """
#     email_map = {}
#     if not partner_ids:
#         return email_map

#     perm_rows = frappe.db.sql(
#         """
#         SELECT up.for_value AS partner_id, u.email
#         FROM `tabUser Permission` up
#         INNER JOIN `tabUser` u ON u.name = up.user AND u.enabled = 1
#         WHERE up.allow = 'Creche Partners'
#           AND up.for_value IN %(pids)s
#         ORDER BY u.name
#         """,
#         {"pids": partner_ids},
#         as_dict=True,
#     )
#     for row in perm_rows:
#         if row.partner_id not in email_map and row.email:
#             email_map[row.partner_id] = row.email

#     missing = [p for p in partner_ids if p not in email_map]
#     if missing:
#         for field in ("email", "email_id", "contact_email"):
#             try:
#                 rows = frappe.get_all(
#                     "Creche Partners",
#                     filters={"name": ["in", missing]},
#                     fields=["name", field],
#                     ignore_permissions=True,
#                 )
#                 hit = False
#                 for r in rows:
#                     v = r.get(field, "")
#                     if v and r.name not in email_map:
#                         email_map[r.name] = v
#                         hit = True
#                 if hit:
#                     break
#             except Exception:
#                 continue

#     return email_map


# def _fy_for_month(d):
#     return f"{d.year}-{str(d.year + 1)[2:]}" if d.month >= 4 else f"{d.year - 1}-{str(d.year)[2:]}"


# def _add_month(d):
#     if relativedelta:
#         return d + relativedelta(months=1)
#     y, m = d.year, d.month + 1
#     if m > 12:
#         y += 1
#         m = 1
#     return date(y, m, 1)


# # ──────────────────────────────────────────────────────────────────────────
# # Pending utilisation summary
# # ──────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_pending_utilisation_summary(cutoff_date=None):
#     """
#     Finds every (budget, financial_year, month) combination that should
#     have a "Creche utilisation" submission by the given cutoff, but
#     doesn't, and groups the result by partner with their resolved email
#     address.

#     cutoff_date: explicit "as of" date (string, e.g. "2026-06-05"). If not
#     supplied, defaults to the 5th of the current month if today is on/after
#     the 5th, otherwise the 5th of the previous month — matching the
#     dashboard's default "as of" control.
#     """
#     today = getdate(frappe.utils.nowdate())

#     if cutoff_date:
#         cutoff = getdate(cutoff_date)
#     else:
#         if today.day >= 5:
#             cutoff = today.replace(day=5)
#         else:
#             prev = _add_month(today.replace(day=1).replace(year=today.year, month=today.month))
#             # step back one month from today's 1st
#             y, m = today.year, today.month - 1
#             if m < 1:
#                 y -= 1
#                 m = 12
#             cutoff = date(y, m, 5)

#     # The cutoff itself defines the boundary month: any (budget, FY, month)
#     # whose month-start is on/before the cutoff's month-start is considered
#     # "due" — this is what makes the date control meaningfully change the
#     # drill-down rather than always falling back to the old hardcoded rule.
#     boundary_month_start = cutoff.replace(day=1)

#     permitted = _get_user_permitted_partners()
#     budget_filters = [
#         ["start_date", "is", "set"],
#         ["end_date", "is", "set"],
#         ["start_date", "<=", cutoff],
#     ]
#     if permitted is not None:
#         if not permitted:
#             return {"partners": [], "cutoff": str(cutoff)}
#         budget_filters.append(["partner_id", "in", permitted])

#     budgets = frappe.get_all(
#         "Creche Budget",
#         fields=["name", "budget_reference_name", "partner_id", "partner_name",
#                  "grant_id", "state", "district", "block", "start_date", "end_date"],
#         filters=budget_filters,
#         ignore_permissions=True,
#         limit_page_length=0,
#     )
#     if not budgets:
#         return {"partners": [], "cutoff": str(cutoff)}

#     budget_names = [b["name"] for b in budgets]
#     existing = set(
#         (r["budget_reference_id"], r["financial_year"], r["month"])
#         for r in frappe.get_all(
#             "Creche utilisation",
#             filters={"budget_reference_id": ["in", budget_names]},
#             fields=["budget_reference_id", "financial_year", "month"],
#             ignore_permissions=True,
#             limit_page_length=0,
#         )
#     )

#     by_partner = {}
#     for b in budgets:
#         start = getdate(b["start_date"])
#         end = getdate(b["end_date"])
#         # A month is "due" once its month-start is on/before the boundary
#         # derived from the chosen cutoff date.
#         effective_end = min(end.replace(day=1), boundary_month_start)
#         cursor = start.replace(day=1)

#         missing_for_budget = []
#         while cursor <= effective_end:
#             month_name = MONTH_ORDER[cursor.month - 1]
#             fy_label = _fy_for_month(cursor)
#             if (b["name"], fy_label, month_name) not in existing:
#                 deadline = _add_month(cursor).replace(day=5)
#                 days_overdue = (cutoff - deadline).days
#                 missing_for_budget.append({
#                     "financial_year": fy_label,
#                     "month": month_name,
#                     "deadline": deadline.isoformat(),
#                     "days_overdue": max(days_overdue, 0),
#                 })
#             cursor = _add_month(cursor)

#         if not missing_for_budget:
#             continue

#         pid = b["partner_id"] or b["partner_name"] or "Unknown"
#         if pid not in by_partner:
#             by_partner[pid] = {
#                 "partner_id": b["partner_id"],
#                 "partner_name": b["partner_name"],
#                 "missing_count": 0,
#                 "max_days_overdue": 0,
#                 "budgets": [],
#             }
#         entry = by_partner[pid]
#         entry["budgets"].append({
#             "budget_id": b["name"],
#             "budget_reference_name": b["budget_reference_name"],
#             "grant_id": b["grant_id"],
#             "state": b["state"],
#             "missing_months": missing_for_budget,
#         })
#         entry["missing_count"] += len(missing_for_budget)
#         entry["max_days_overdue"] = max(
#             entry["max_days_overdue"],
#             max((m["days_overdue"] for m in missing_for_budget), default=0),
#         )

#     partner_ids = [pid for pid in by_partner if pid]
#     email_map = _get_partner_emails(partner_ids)

#     result = []
#     for pid, entry in by_partner.items():
#         entry["email"] = email_map.get(pid, "")
#         result.append(entry)

#     result.sort(key=lambda r: (-r["max_days_overdue"], r["partner_name"] or ""))

#     return {"partners": result, "cutoff": str(cutoff)}


# # ──────────────────────────────────────────────────────────────────────────
# # Send reminder emails
# # ──────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def send_utilisation_reminder(partner_ids=None, custom_message=None):
#     if isinstance(partner_ids, str):
#         try:
#             partner_ids = json.loads(partner_ids)
#         except Exception:
#             partner_ids = [p.strip() for p in partner_ids.split(",") if p.strip()]
#     partner_ids = partner_ids or []
#     if not partner_ids:
#         frappe.throw(frappe._("No partners selected"))

#     permitted = _get_user_permitted_partners()
#     if permitted is not None:
#         partner_ids = [p for p in partner_ids if p in permitted]
#         if not partner_ids:
#             frappe.throw(frappe._("You do not have permission to email these partners"))

#     email_map = _get_partner_emails(partner_ids)
#     partner_names = {
#         r.name: r.partner_name
#         for r in frappe.get_all(
#             "Creche Partners",
#             filters={"name": ["in", partner_ids]},
#             fields=["name", "partner_name"],
#             ignore_permissions=True,
#         )
#     }

#     default_message = (
#         "This is a reminder that your utilisation report submission is pending. "
#         "Kindly submit it at the earliest to keep your budget records up to date."
#     )
#     message_body = custom_message or default_message

#     sent, failed = [], []
#     for pid in partner_ids:
#         email = email_map.get(pid)
#         pname = partner_names.get(pid, pid)
#         if not email:
#             failed.append({"partner_id": pid, "partner_name": pname, "reason": "No email on file"})
#             continue
#         try:
#             frappe.sendmail(
#                 recipients=[email],
#                 subject="Utilisation Report Submission Reminder",
#                 message=f"<p>Dear {frappe.utils.escape_html(pname)},</p><p>{frappe.utils.escape_html(message_body)}</p>",
#                 now=True,
#             )
#             sent.append({"partner_id": pid, "partner_name": pname, "email": email})
#         except Exception as e:
#             failed.append({"partner_id": pid, "partner_name": pname, "reason": str(e)})

#     return {"sent": sent, "failed": failed}


# # ══════════════════════════════════════════════════════════════════════════
# # EXCEL / PDF EXPORT  (formerly export_utils.py)
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def export_table(title="Report", columns=None, rows=None, format="xlsx"):
# 	"""
# 	Generate an .xlsx or .pdf file from tabular data and save it as a
# 	private File doc, returning the file_url for the browser to open.

# 	columns: JSON list of {"label": str, "key": str, "align": "left"|"right"}
# 	rows:    JSON list of dicts keyed by column `key`, OR group-band rows
# 	         shaped as {"__group__": true, "label": str, "subtotal": str}
# 	format:  "xlsx" or "pdf"
# 	"""
# 	if isinstance(columns, str):
# 		columns = json.loads(columns)
# 	if isinstance(rows, str):
# 		rows = json.loads(rows)

# 	columns = columns or []
# 	rows = rows or []

# 	if format == "pdf":
# 		file_url = _export_pdf(title, columns, rows)
# 	else:
# 		file_url = _export_xlsx(title, columns, rows)

# 	return {"file_url": file_url}


# def _is_total_row(row, columns):
# 	if not columns:
# 		return False
# 	return str(row.get(columns[0].get("key"), "")).strip().lower() == "total"


# # ──────────────────────────────────────────────────────────────────────────
# # EXCEL EXPORT  (openpyxl — navy header / light-blue total row / group band)
# # ──────────────────────────────────────────────────────────────────────────

# def _export_xlsx(title, columns, rows):
# 	try:
# 		from openpyxl import Workbook
# 		from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
# 		from openpyxl.utils import get_column_letter
# 	except ImportError:
# 		frappe.throw(
# 			frappe._("openpyxl is required for Excel export. Install it with: pip install openpyxl")
# 		)

# 	wb = Workbook()
# 	ws = wb.active
# 	ws.title = (title or "Data")[:31]

# 	NAVY       = "1E3A5F"
# 	LIGHTBLUE  = "BFDBFE"
# 	BORDER_C   = "93C5FD"
# 	GRID_C     = "E2E8F0"
# 	GROUP_FILL = "DBEAFE"   # main-head group band — lighter than the Total row

# 	thin_grid = Border(
# 		left=Side(style="thin", color=GRID_C),
# 		right=Side(style="thin", color=GRID_C),
# 		top=Side(style="thin", color=GRID_C),
# 		bottom=Side(style="thin", color=GRID_C),
# 	)
# 	thin_header_border = Border(
# 		left=Side(style="thin", color=BORDER_C),
# 		right=Side(style="thin", color=BORDER_C),
# 		top=Side(style="thin", color=BORDER_C),
# 		bottom=Side(style="thin", color=BORDER_C),
# 	)

# 	header_font = Font(bold=True, color="FFFFFF", size=10)
# 	header_fill = PatternFill(start_color=NAVY, end_color=NAVY, fill_type="solid")
# 	total_font  = Font(bold=True, color=NAVY, size=11)
# 	total_fill  = PatternFill(start_color=LIGHTBLUE, end_color=LIGHTBLUE, fill_type="solid")
# 	group_font  = Font(bold=True, color=NAVY, size=10.5)
# 	group_fill  = PatternFill(start_color=GROUP_FILL, end_color=GROUP_FILL, fill_type="solid")

# 	# header row
# 	for ci, col in enumerate(columns, start=1):
# 		c = ws.cell(row=1, column=ci, value=col.get("label", ""))
# 		c.font = header_font
# 		c.fill = header_fill
# 		c.border = thin_header_border
# 		c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

# 	ncols = max(len(columns), 1)
# 	r_idx = 2

# 	for row in rows:
# 		# Main-head group band — merged, full-width, highlighted row with
# 		# the group title on the left and its subtotal on the right.
# 		if row.get("__group__"):
# 			ws.merge_cells(start_row=r_idx, start_column=1, end_row=r_idx, end_column=max(ncols - 1, 1))
# 			label_cell = ws.cell(row=r_idx, column=1, value=row.get("label", ""))
# 			label_cell.font = group_font
# 			label_cell.fill = group_fill
# 			label_cell.border = thin_header_border
# 			label_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)

# 			subtotal_cell = ws.cell(row=r_idx, column=ncols, value=row.get("subtotal", ""))
# 			subtotal_cell.font = group_font
# 			subtotal_cell.fill = group_fill
# 			subtotal_cell.border = thin_header_border
# 			subtotal_cell.alignment = Alignment(horizontal="right", vertical="center")
# 			r_idx += 1
# 			continue

# 		total_row = _is_total_row(row, columns)
# 		for ci, col in enumerate(columns, start=1):
# 			val = row.get(col.get("key"), "")
# 			align = col.get("align", "left")
# 			cell = ws.cell(row=r_idx, column=ci)
# 			if align == "right" and isinstance(val, (int, float)):
# 				cell.value = val
# 				cell.number_format = "#,##0.00"
# 			else:
# 				cell.value = val
# 			cell.alignment = Alignment(horizontal=align)
# 			if total_row:
# 				cell.font = total_font
# 				cell.fill = total_fill
# 				cell.border = thin_header_border
# 			else:
# 				cell.border = thin_grid
# 		r_idx += 1

# 	# auto column width (ignore group-band rows when measuring)
# 	for ci, col in enumerate(columns, start=1):
# 		letter = get_column_letter(ci)
# 		max_len = len(str(col.get("label", "")))
# 		for row in rows:
# 			if row.get("__group__"):
# 				continue
# 			v = row.get(col.get("key"), "")
# 			max_len = max(max_len, len(str(v)))
# 		ws.column_dimensions[letter].width = min(max_len + 4, 42)

# 	ws.freeze_panes = "A2"

# 	buf = io.BytesIO()
# 	wb.save(buf)
# 	buf.seek(0)

# 	fname = f"{_safe_fname(title)}.xlsx"
# 	return _save_file(fname, buf.getvalue())


# # ──────────────────────────────────────────────────────────────────────────
# # PDF EXPORT  (HTML → wkhtmltopdf, A4 portrait, same navy/blue palette)
# # ──────────────────────────────────────────────────────────────────────────

# def _export_pdf(title, columns, rows):
# 	thead = "".join(f"<th>{frappe.utils.escape_html(c.get('label',''))}</th>" for c in columns)
# 	ncols = max(len(columns), 1)

# 	body_rows = []
# 	for row in rows:
# 		if row.get("__group__"):
# 			label = frappe.utils.escape_html(row.get("label", ""))
# 			subtotal = frappe.utils.escape_html(row.get("subtotal", ""))
# 			body_rows.append(
# 				f'<tr class="group-row"><td colspan="{ncols}">'
# 				f'<span class="group-row__label">{label}</span>'
# 				f'<span class="group-row__subtotal">{subtotal}</span>'
# 				f'</td></tr>'
# 			)
# 			continue

# 		total_row = _is_total_row(row, columns)
# 		tds = []
# 		for c in columns:
# 			val = row.get(c.get("key"), "")
# 			align = c.get("align", "left")
# 			tds.append(f'<td style="text-align:{align}">{frappe.utils.escape_html(str(val))}</td>')
# 		cls = ' class="total-row"' if total_row else ""
# 		body_rows.append(f"<tr{cls}>{''.join(tds)}</tr>")

# 	html = f"""
# 	<html><head><meta charset="utf-8">
# 	<style>
# 		@page {{ size: A4 portrait; margin: 14mm 10mm; }}
# 		* {{ box-sizing:border-box; margin:0; padding:0; font-family:Arial,Helvetica,sans-serif; }}
# 		body {{ color:#1f2937; }}
# 		h1 {{ font-size:16px; font-weight:700; color:#1e3a5f; margin-bottom:4px; }}
# 		.meta {{ font-size:9px; color:#94a3b8; margin-bottom:12px; }}
# 		table {{ width:100%; border-collapse:collapse; font-size:10px; }}
# 		th {{
# 			background:#1e3a5f; color:#fff; font-weight:700; text-transform:uppercase;
# 			font-size:8.5px; letter-spacing:.4px; padding:6px 8px; text-align:left;
# 			border:1px solid #93c5fd;
# 		}}
# 		td {{ padding:5px 8px; border:1px solid #e2e8f0; }}
# 		tr.total-row td {{
# 			background:#bfdbfe; color:#1e3a5f; font-weight:700; border:1px solid #93c5fd;
# 		}}
# 		tr.group-row td {{
# 			background:#dbeafe; color:#1e3a5f; font-weight:700; border:1px solid #93c5fd;
# 			padding:6px 8px;
# 		}}
# 		tr.group-row .group-row__label {{ display:inline-block; }}
# 		tr.group-row .group-row__subtotal {{ float:right; }}
# 		tr:nth-child(even):not(.total-row):not(.group-row) td {{ background:#f8fafc; }}
# 	</style></head>
# 	<body>
# 		<h1>{frappe.utils.escape_html(title or 'Report')}</h1>
# 		<div class="meta">Exported {frappe.utils.now_datetime().strftime('%d %b %Y, %I:%M %p')} by {frappe.session.user}</div>
# 		<table>
# 			<thead><tr>{thead}</tr></thead>
# 			<tbody>{''.join(body_rows)}</tbody>
# 		</table>
# 	</body></html>
# 	"""

# 	from frappe.utils.pdf import get_pdf
# 	pdf_content = get_pdf(html, options={"page-size": "A4", "orientation": "Portrait"})

# 	fname = f"{_safe_fname(title)}.pdf"
# 	return _save_file(fname, pdf_content)


# # ──────────────────────────────────────────────────────────────────────────
# # Helpers
# # ──────────────────────────────────────────────────────────────────────────

# def _safe_fname(title):
# 	import re
# 	base = re.sub(r"[^A-Za-z0-9_-]+", "_", title or "report").strip("_") or "report"
# 	return base[:80]


# def _save_file(fname, content):
# 	f = frappe.get_doc({
# 		"doctype": "File",
# 		"file_name": fname,
# 		"is_private": 0,
# 		"content": content,
# 	})
# 	f.save(ignore_permissions=True)
# 	return f.file_url


















# """
# creche_reports/api/creche_dashboard.py

# All server-side methods for the Creche Dashboard page.
# """

# import frappe
# from frappe.utils import flt, getdate, nowdate, add_days, now_datetime, get_datetime, get_url
# from datetime import date as _date, datetime, timedelta as _timedelta
# import calendar as _calendar
# import json
# import io

# try:
#     from dateutil.relativedelta import relativedelta
# except ImportError:
#     relativedelta = None

# MONTH_ORDER = [
#     "January","February","March","April","May","June",
#     "July","August","September","October","November","December",
# ]

# # ══════════════════════════════════════════════════════════════════════════
# # DATE / PRORATA HELPERS
# # ══════════════════════════════════════════════════════════════════════════

# def _to_date(v):
#     if not v: return None
#     if isinstance(v, _date): return v
#     return _date.fromisoformat(str(v)[:10])

# def _add_months_safe(d, n):
#     """Add n calendar months to date d, clamping day to month-end."""
#     if relativedelta:
#         return d + relativedelta(months=n)
#     m = d.month - 1 + n
#     year  = d.year + m // 12
#     month = m % 12 + 1
#     day   = min(d.day, _calendar.monthrange(year, month)[1])
#     return _date(year, month, day)

# def _count_calendar_months(start, end):
#     """Count distinct calendar months from start to end inclusive."""
#     if not start or not end or start > end:
#         return 0
#     count = 0
#     y, m = start.year, start.month
#     ey, em = end.year, end.month
#     while (y, m) <= (ey, em):
#         count += 1
#         m += 1
#         if m > 12:
#             m, y = 1, y + 1
#     return count

# def _prorata_by_budget_year(year_1, year_2, year_3, bud_start, bud_end, filter_segments):
#     """
#     Calculate prorated budget using budget-year periods (NOT financial-year periods).

#     Y1 = first 12 months from budget start date
#     Y2 = months 13-24 from budget start date
#     Y3 = months 25-36 from budget start date

#     For each year period that overlaps a filter segment:
#         contribution = year_amount / 12 * months_in_overlap

#     Returns dict with keys: total, year_1, year_2, year_3
#     """
#     empty = {"total": 0.0, "year_1": 0.0, "year_2": 0.0, "year_3": 0.0}
#     bud_s = _to_date(bud_start)
#     bud_e = _to_date(bud_end)
#     if not bud_s or not bud_e:
#         return empty

#     year_amounts = [float(year_1 or 0), float(year_2 or 0), float(year_3 or 0)]
#     scaled = [0.0, 0.0, 0.0]

#     for i, yr_amt in enumerate(year_amounts):
#         if not yr_amt:
#             continue
#         yr_s = _add_months_safe(bud_s, i * 12)
#         yr_e = _add_months_safe(bud_s, (i + 1) * 12) - _timedelta(days=1)
#         yr_e = min(yr_e, bud_e)
#         if yr_s > bud_e:
#             break  # all remaining years are also beyond budget end

#         for seg_s, seg_e in filter_segments:
#             ov_s = max(seg_s, yr_s)
#             ov_e = min(seg_e, yr_e)
#             if ov_s > ov_e:
#                 continue
#             months = _count_calendar_months(ov_s, ov_e)
#             if months > 0:
#                 scaled[i] += yr_amt / 12.0 * months

#     return {
#         "total":  round(scaled[0] + scaled[1] + scaled[2], 2),
#         "year_1": round(scaled[0], 2),
#         "year_2": round(scaled[1], 2),
#         "year_3": round(scaled[2], 2),
#     }

# def _compute_prorata_budget(budget_name, bud_start, bud_end, filter_segments):
#     """
#     Compute prorated total budget for a Creche Budget document.
#     Uses budget-year-based proration (not financial-year-based).
#     """
#     if not filter_segments:
#         return None

#     rows = frappe.db.sql(
#         """SELECT SUM(COALESCE(year_1,0)) AS year_1,
#                   SUM(COALESCE(year_2,0)) AS year_2,
#                   SUM(COALESCE(year_3,0)) AS year_3
#            FROM `tabBudget Items`
#            WHERE parent = %s AND parenttype = 'Creche Budget'""",
#         (budget_name,), as_dict=True,
#     )
#     if not rows or not rows[0]:
#         return 0.0

#     raw = rows[0]
#     result = _prorata_by_budget_year(
#         raw.get("year_1") or 0,
#         raw.get("year_2") or 0,
#         raw.get("year_3") or 0,
#         bud_start, bud_end, filter_segments,
#     )
#     return result["total"]

# def _build_filter_segments(filters):
#     raw_start = _to_date(filters.get("start_date"))
#     raw_end   = _to_date(filters.get("end_date"))

#     filter_fys = filters.get("financial_year") or []
#     if isinstance(filter_fys, str): filter_fys = [filter_fys]
#     filter_fys = list(filter_fys)

#     month_raw = filters.get("month") or []
#     if isinstance(month_raw, str): month_raw = [month_raw] if month_raw.strip() else []
#     month_filters = [m.strip() for m in month_raw if str(m).strip()]

#     if raw_start or raw_end:
#         from datetime import timedelta
#         seg_s = raw_start or (raw_end - timedelta(days=3*366))
#         seg_e = raw_end   or (raw_start + timedelta(days=3*366))
#         return [(seg_s, seg_e)]

#     if filter_fys and month_filters:
#         segs = []
#         for fy in filter_fys:
#             fy_start_year = int(fy.split("-")[0])
#             for mn in month_filters:
#                 month_num = list(_calendar.month_name).index(mn)
#                 year      = fy_start_year if month_num >= 4 else fy_start_year + 1
#                 last_day  = _calendar.monthrange(year, month_num)[1]
#                 segs.append((_date(year, month_num, 1), _date(year, month_num, last_day)))
#         return segs

#     if filter_fys:
#         segs = []
#         for fy in filter_fys:
#             y = int(fy.split("-")[0])
#             segs.append((_date(y, 4, 1), _date(y + 1, 3, 31)))
#         return segs

#     return []

# # ══════════════════════════════════════════════════════════════════════════
# # PERMISSION HELPERS
# # ══════════════════════════════════════════════════════════════════════════

# def _get_user_permitted_partners():
#     user  = frappe.session.user
#     roles = frappe.get_roles(user)
#     if "System Manager" in roles or user == "Administrator":
#         return None
#     rows = frappe.db.sql(
#         "SELECT for_value FROM `tabUser Permission` WHERE user = %s AND allow = 'Creche Partners'",
#         (user,), as_dict=True,
#     )
#     if not rows: return None
#     return [r.for_value for r in rows if r.for_value]

# def _intersect(filter_list, permitted):
#     if permitted is None: return filter_list
#     if not permitted: return []
#     if not filter_list: return permitted
#     pset = set(permitted)
#     return [p for p in filter_list if p in pset]

# def _empty_summary():
#     return {
#         "total_budget":0,"total_disbursement":0,
#         "total_utilisation":0,"total_bank_balance":0,
#         "total_interest":0,"total_creches":0,
#         "utilisation_pct":0,"disbursement_pct":0,
#     }

# def _assert_partner_access(partner_id: str):
#     permitted = _get_user_permitted_partners()
#     if permitted is None: return
#     if partner_id not in permitted:
#         frappe.throw(frappe._("You do not have permission to access this partner"), frappe.PermissionError)

# # ══════════════════════════════════════════════════════════════════════════
# # PARTNER OPTIONS
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_partner_options(txt=""):
#     permitted = _get_user_permitted_partners()
#     filters   = {}
#     if permitted is not None:
#         if not permitted: return []
#         filters["name"] = ["in", permitted]
#     if txt:
#         filters["partner_name"] = ["like", f"%{txt}%"]
#     rows = frappe.get_all("Creche Partners", filters=filters, fields=["name","partner_name"],
#                           order_by="partner_name asc", limit=500, ignore_permissions=True)
#     return [{"name": r.name, "partner_name": r.partner_name or r.name} for r in rows]

# @frappe.whitelist()
# def get_user_permission_scope():
#     permitted = _get_user_permitted_partners()
#     if permitted is None: return {"restricted": False, "partner_ids": []}
#     return {"restricted": True, "partner_ids": permitted}

# # ══════════════════════════════════════════════════════════════════════════
# # MAIN SUMMARY
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_partner_budget_summary(filters=None):
#     if isinstance(filters, str):
#         filters = json.loads(filters)
#     filters = filters or {}

#     permitted          = _get_user_permitted_partners()
#     filter_partners    = filters.get("partner_id") or None
#     effective_partners = _intersect(filter_partners, permitted)

#     if effective_partners is not None and len(effective_partners) == 0:
#         return {"summary": _empty_summary(), "partners": []}

#     start_date = filters.get("start_date") or None
#     end_date   = filters.get("end_date")   or None

#     filter_segments = _build_filter_segments(filters)
#     apply_prorata   = bool(filter_segments)

#     budget_filters = {}
#     if effective_partners:
#         budget_filters["partner_id"] = ["in", effective_partners]
#     if filters.get("budget_ref"):
#         budget_filters["budget_reference_name"] = ["in", filters["budget_ref"]]
#     if filters.get("grant_id"):
#         budget_filters["grant_id"] = ["in", filters["grant_id"]]
#     if filters.get("state"):
#         budget_filters["state"] = ["in", filters["state"]]
#     if filters.get("district"):
#         budget_filters["district"] = ["in", filters["district"]]
#     if filters.get("block"):
#         budget_filters["block"] = ["in", filters["block"]]
#     if start_date:
#         budget_filters["end_date"]   = [">=", start_date]
#     if end_date:
#         budget_filters["start_date"] = ["<=", end_date]

#     budgets = frappe.get_all(
#         "Creche Budget", filters=budget_filters,
#         fields=["name","partner_id","partner_name","grant_id","budget_reference_name",
#                 "state","district","block","start_date","end_date","financial_year",
#                 "no_of_creches","total_budget"],
#         order_by="partner_name asc, budget_reference_name asc",
#         ignore_permissions=True,
#     )

#     budget_ids = [b.name for b in budgets]

#     # ── Budget Items sums (bulk) ──────────────────────────────────────────
#     budget_items_map = {}
#     if budget_ids:
#         ph_bi = ", ".join([f"%(bim{i})s" for i in range(len(budget_ids))])
#         bim_params = {f"bim{i}": n for i, n in enumerate(budget_ids)}
#         bi_rows = frappe.db.sql(
#             "SELECT parent,"
#             " SUM(COALESCE(year_1,0)) AS year_1,"
#             " SUM(COALESCE(year_2,0)) AS year_2,"
#             " SUM(COALESCE(year_3,0)) AS year_3"
#             " FROM `tabBudget Items`"
#             f" WHERE parent IN ({ph_bi}) AND parenttype = 'Creche Budget'"
#             " GROUP BY parent",
#             bim_params, as_dict=True,
#         )
#         for r in bi_rows:
#             budget_items_map[r.parent] = {
#                 "year_1": float(r.year_1 or 0),
#                 "year_2": float(r.year_2 or 0),
#                 "year_3": float(r.year_3 or 0),
#                 "total":  float(r.year_1 or 0) + float(r.year_2 or 0) + float(r.year_3 or 0),
#             }

#     # ── Disbursement (date-based) ─────────────────────────────────────────
#     disbursement_map = {}
#     if budget_ids:
#         disb_headers = frappe.get_all("Creche Disbursement",
#             filters={"budget_reference_id": ["in", budget_ids]},
#             fields=["name","budget_reference_id"], ignore_permissions=True)
#         disb_parent_names = [d.name for d in disb_headers]
#         disb_bid_map = {d.name: d.budget_reference_id for d in disb_headers}

#         if disb_parent_names:
#             tracker_rows = frappe.get_all("Disbursement Tracker",
#                 filters={"parent": ["in", disb_parent_names], "parenttype": "Creche Disbursement"},
#                 fields=["parent","date_of_disbursement","disbursed_amount"],
#                 ignore_permissions=True)

#             if filter_segments:
#                 tracker_rows = [
#                     t for t in tracker_rows
#                     if t.date_of_disbursement and any(
#                         seg_s <= getdate(str(t.date_of_disbursement)) <= seg_e
#                         for seg_s, seg_e in filter_segments
#                     )
#                 ]
#             elif start_date or end_date:
#                 tracker_rows = [
#                     t for t in tracker_rows
#                     if t.date_of_disbursement
#                     and (not start_date or getdate(str(t.date_of_disbursement)) >= getdate(start_date))
#                     and (not end_date   or getdate(str(t.date_of_disbursement)) <= getdate(end_date))
#                 ]

#             for t in tracker_rows:
#                 bid = disb_bid_map.get(t.parent)
#                 if bid:
#                     disbursement_map[bid] = disbursement_map.get(bid, 0.0) + flt(t.disbursed_amount)

#     # ── Utilisation ───────────────────────────────────────────────────────
#     utilisation_map  = {}
#     bank_balance_map = {}
#     interest_map     = {}

#     if budget_ids:
#         filter_fys = filters.get("financial_year") or []
#         if isinstance(filter_fys, str): filter_fys = [filter_fys]
#         month_raw = filters.get("month") or []
#         if isinstance(month_raw, str): month_raw = [month_raw] if month_raw.strip() else []
#         month_filters = [m.strip() for m in month_raw if str(m).strip()]

#         util_extra  = ""
#         util_params = {}

#         if start_date and end_date:
#             def _local_fy_month_pairs(sd, ed):
#                 sd = _to_date(sd); ed = _to_date(ed)
#                 if not sd or not ed: return []
#                 pairs = []; cur = _date(sd.year, sd.month, 1)
#                 end_mo = _date(ed.year, ed.month, 1)
#                 while cur <= end_mo:
#                     fy = (f"{cur.year}-{str(cur.year+1)[2:]}" if cur.month >= 4
#                           else f"{cur.year-1}-{str(cur.year)[2:]}")
#                     pairs.append((fy, _calendar.month_name[cur.month]))
#                     cur = (_date(cur.year+1,1,1) if cur.month==12
#                            else _date(cur.year, cur.month+1, 1))
#                 return pairs
#             pairs = _local_fy_month_pairs(start_date, end_date)
#             if pairs:
#                 clauses = []
#                 for i, (fy, mn) in enumerate(pairs):
#                     util_params[f"ufy{i}"] = fy; util_params[f"umn{i}"] = mn
#                     clauses.append(f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)")
#                 util_extra = " AND (" + " OR ".join(clauses) + ")"
#             else:
#                 util_extra = " AND 1=0"
#         elif filter_fys and month_filters:
#             clauses = []; k = 0
#             for fy in sorted(filter_fys):
#                 for mn in month_filters:
#                     util_params[f"ufy{k}"] = fy; util_params[f"umn{k}"] = mn
#                     clauses.append(f"(cu.financial_year = %(ufy{k})s AND cu.month = %(umn{k})s)")
#                     k += 1
#             util_extra = " AND (" + " OR ".join(clauses) + ")"
#         elif filter_fys:
#             ph = ", ".join([f"%(ufy{i})s" for i in range(len(filter_fys))])
#             for i, fy in enumerate(filter_fys): util_params[f"ufy{i}"] = fy
#             util_extra = f" AND cu.financial_year IN ({ph})"
#         elif month_filters:
#             ph = ", ".join([f"%(umn{i})s" for i in range(len(month_filters))])
#             for i, m in enumerate(month_filters): util_params[f"umn{i}"] = m
#             util_extra = f" AND cu.month IN ({ph})"
#         elif start_date:
#             from datetime import date as _dt_today
#             today = _dt_today.today()
#             def _lp(sd, ed):
#                 sd = _to_date(sd); ed = _to_date(ed)
#                 if not sd or not ed: return []
#                 pairs = []; cur = _date(sd.year, sd.month, 1)
#                 end_mo = _date(ed.year, ed.month, 1)
#                 while cur <= end_mo:
#                     fy = (f"{cur.year}-{str(cur.year+1)[2:]}" if cur.month >= 4
#                           else f"{cur.year-1}-{str(cur.year)[2:]}")
#                     pairs.append((fy, _calendar.month_name[cur.month]))
#                     cur = (_date(cur.year+1,1,1) if cur.month==12
#                            else _date(cur.year, cur.month+1, 1))
#                 return pairs
#             pairs = _lp(start_date, today)
#             if pairs:
#                 clauses = []
#                 for i, (fy, mn) in enumerate(pairs):
#                     util_params[f"ufy{i}"] = fy; util_params[f"umn{i}"] = mn
#                     clauses.append(f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)")
#                 util_extra = " AND (" + " OR ".join(clauses) + ")"

#         bid_ph = ", ".join([f"%(bid{i})s" for i in range(len(budget_ids))])
#         for i, n in enumerate(budget_ids): util_params[f"bid{i}"] = n

#         util_rows = frappe.db.sql(
#             f"""SELECT cu.budget_reference_id, SUM(ui.total_amount) AS total_util
#                 FROM `tabCreche utilisation` cu
#                 INNER JOIN `tabUtilisation Items` ui ON ui.parent = cu.name AND ui.parenttype = 'Creche utilisation'
#                 WHERE cu.budget_reference_id IN ({bid_ph}) {util_extra}
#                 GROUP BY cu.budget_reference_id""",
#             util_params, as_dict=True,
#         )
#         for r in util_rows:
#             utilisation_map[r.budget_reference_id] = flt(r.total_util)

#         interest_rows = frappe.db.sql(
#             f"""SELECT budget_reference_id, SUM(interest_from_bank) AS total_interest
#                 FROM `tabCreche utilisation`
#                 WHERE budget_reference_id IN ({bid_ph}) {util_extra.replace("cu.", "")}
#                 GROUP BY budget_reference_id""",
#             util_params, as_dict=True,
#         )
#         for r in interest_rows:
#             interest_map[r.budget_reference_id] = flt(r.total_interest)

#         _FY_POS = {
#             "April":1,"May":2,"June":3,"July":4,"August":5,"September":6,
#             "October":7,"November":8,"December":9,"January":10,"February":11,"March":12,
#         }
#         bal_rows = frappe.db.sql(
#             f"""SELECT budget_reference_id, financial_year, month, balance_amount
#                 FROM `tabCreche utilisation`
#                 WHERE budget_reference_id IN ({bid_ph}) {util_extra.replace("cu.", "")}""",
#             util_params, as_dict=True,
#         )
#         bal_best = {}
#         for r in bal_rows:
#             bid = r.budget_reference_id
#             key = (r.financial_year or "", _FY_POS.get(r.month, 0))
#             if bid not in bal_best or key > bal_best[bid][0]:
#                 bal_best[bid] = (key, flt(r.balance_amount))
#         bank_balance_map = {bid: v[1] for bid, v in bal_best.items()}

#     # ── Assemble results ──────────────────────────────────────────────────
#     partners = {}
#     grand = dict(budget=0.0, disbursement=0.0, utilisation=0.0, bank_balance=0.0, interest=0.0, creches=0)

#     for budget in budgets:
#         bid = budget.name
#         bi  = budget_items_map.get(bid, {"year_1":0,"year_2":0,"year_3":0,"total":flt(budget.total_budget)})

#         if apply_prorata:
#             pr = _prorata_by_budget_year(
#                 bi["year_1"], bi["year_2"], bi["year_3"],
#                 budget.start_date, budget.end_date, filter_segments,
#             )
#             budget_amount = pr["total"]
#         else:
#             budget_amount = bi["total"] if bi["total"] else flt(budget.total_budget)

#         disbursement = flt(disbursement_map.get(bid, 0))
#         utilisation  = flt(utilisation_map.get(bid, 0))
#         bank_balance = flt(bank_balance_map.get(bid, 0))
#         interest     = flt(interest_map.get(bid, 0))
#         creches      = int(budget.no_of_creches or 0)

#         balance_budget            = budget_amount - utilisation
#         utilised_pct              = round((utilisation / budget_amount * 100) if budget_amount else 0, 2)
#         utilised_disbursement_pct = round((utilisation / disbursement * 100)  if disbursement  else 0, 2)

#         partner_key = budget.partner_id or budget.partner_name or "Unknown"
#         if partner_key not in partners:
#             partners[partner_key] = {
#                 "partner_id": budget.partner_id, "partner_name": budget.partner_name,
#                 "total_budget":0.0,"total_disbursement":0.0,"total_utilisation":0.0,
#                 "total_balance_budget":0.0,"total_bank_balance":0.0,
#                 "total_interest":0.0,"total_creches":0,"budgets":[],
#             }
#         p = partners[partner_key]
#         p["total_budget"]         += budget_amount
#         p["total_disbursement"]   += disbursement
#         p["total_utilisation"]    += utilisation
#         p["total_balance_budget"] += balance_budget
#         if bank_balance > 0:
#             p["total_bank_balance"] = max(p["total_bank_balance"], bank_balance)
#         elif p["total_bank_balance"] == 0:
#             p["total_bank_balance"] = bank_balance
#         p["total_interest"]       += interest
#         p["total_creches"]        += creches
#         p["budgets"].append({
#             "budget_id": bid, "grant_id": budget.grant_id,
#             "budget_reference_name": budget.budget_reference_name,
#             "state": budget.state, "district": budget.district, "block": budget.block,
#             "grant_start": budget.start_date, "grant_end": budget.end_date,
#             "financial_year": budget.financial_year, "no_of_creches": creches,
#             "budget": budget_amount, "disbursement": disbursement,
#             "utilisation": utilisation, "utilised_pct": utilised_pct,
#             "utilised_disbursement_pct": utilised_disbursement_pct,
#             "balance_budget_amount": balance_budget,
#             "bank_balance": bank_balance, "interest_from_bank": interest,
#         })

#         grand["budget"]       += budget_amount
#         grand["disbursement"] += disbursement
#         grand["utilisation"]  += utilisation
#         grand["bank_balance"] += bank_balance
#         grand["interest"]     += interest
#         grand["creches"]      += creches

#     result = []
#     for p in partners.values():
#         p["utilised_pct"] = round((p["total_utilisation"] / p["total_budget"] * 100) if p["total_budget"] else 0, 2)
#         p["grant_ids"]    = ", ".join(sorted(set(b["grant_id"] for b in p["budgets"] if b["grant_id"])))
#         p["budgets"]      = sorted(p["budgets"], key=lambda x: x["budget_reference_name"] or "")
#         result.append(p)
#     result.sort(key=lambda x: x["partner_name"] or "")

#     gb = grand["budget"]
#     # Get running creches from most recent utilisation records
#     running_creches = _get_running_creches_count(
#         effective_partners if effective_partners else None
#     )
#     return {
#         "summary": {
#             "total_budget":       grand["budget"],
#             "total_disbursement": grand["disbursement"],
#             "total_utilisation":  grand["utilisation"],
#             "total_bank_balance": grand["bank_balance"],
#             "total_interest":     grand["interest"],
#             "total_creches":      grand["creches"],
#             "running_creches":    running_creches,
#             "utilisation_pct":    round((grand["utilisation"]  / gb * 100) if gb else 0, 2),
#             "disbursement_pct":   round((grand["disbursement"] / gb * 100) if gb else 0, 2),
#         },
#         "partners": result,
#     }

# # ══════════════════════════════════════════════════════════════════════════
# # DISBURSEMENT PANEL DATA
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_disbursement_panel_data(budget_ids=None, partner_ids=None, start_date=None, end_date=None,
#                                 financial_year=None, month=None):
#     permitted = _get_user_permitted_partners()
#     def _to_list(v):
#         if not v: return []
#         if isinstance(v, str):
#             try:
#                 p = json.loads(v)
#                 if isinstance(p, list): return [x for x in p if x]
#             except: pass
#             return [x.strip() for x in v.split(",") if x.strip()]
#         return [x for x in v if x]

#     budget_ids_list  = _to_list(budget_ids)
#     partner_ids_list = _to_list(partner_ids)
#     filter_fys       = _to_list(financial_year)
#     month_filters    = [m.strip() for m in _to_list(month) if str(m).strip()]

#     disb_filters = {}
#     if budget_ids_list:
#         if permitted is not None:
#             br = frappe.get_all("Creche Budget",
#                 filters={"name":["in",budget_ids_list]},
#                 fields=["name","partner_id"], ignore_permissions=True)
#             budget_ids_list = [r.name for r in br if r.partner_id in permitted]
#             if not budget_ids_list: return []
#         disb_filters["budget_reference_id"] = ["in", budget_ids_list]
#     elif partner_ids_list:
#         eff = _intersect(partner_ids_list, permitted)
#         if eff is not None and not eff: return []
#         if eff: disb_filters["partner_id"] = ["in", eff]
#         elif permitted is not None: return []
#     else:
#         if permitted is not None:
#             if not permitted: return []
#             disb_filters["partner_id"] = ["in", permitted]

#     disb_docs = frappe.get_all("Creche Disbursement", filters=disb_filters,
#         fields=["name","budget_reference_id","budget_reference_name","partner_id","partner_name",
#                 "grant_id","state","district","block","financial_year",
#                 "total_disbursement","balence_budget","total_budget"],
#         order_by="partner_name asc, budget_reference_name asc", ignore_permissions=True)
#     if not disb_docs: return []

#     parent_names = [d.name for d in disb_docs]
#     tracker_rows = frappe.get_all("Disbursement Tracker",
#         filters={"parent":["in",parent_names],"parenttype":"Creche Disbursement"},
#         fields=["parent","date_of_disbursement","disbursed_amount"],
#         order_by="date_of_disbursement asc", ignore_permissions=True)

#     filter_segments = _build_filter_segments({
#         "start_date": start_date, "end_date": end_date,
#         "financial_year": filter_fys, "month": month_filters,
#     })
#     period_active = bool(filter_segments) or bool(start_date) or bool(end_date)

#     if filter_segments:
#         tracker_rows = [
#             t for t in tracker_rows
#             if t.date_of_disbursement and any(
#                 seg_s <= getdate(str(t.date_of_disbursement)) <= seg_e
#                 for seg_s, seg_e in filter_segments
#             )
#         ]
#     elif start_date or end_date:
#         tracker_rows = [t for t in tracker_rows
#             if t.date_of_disbursement
#             and (not start_date or getdate(str(t.date_of_disbursement)) >= getdate(start_date))
#             and (not end_date   or getdate(str(t.date_of_disbursement)) <= getdate(end_date))]

#     tracker_map = {}
#     for t in tracker_rows:
#         tracker_map.setdefault(t.parent, []).append({
#             "date_of_disbursement": str(t.date_of_disbursement) if t.date_of_disbursement else "",
#             "disbursed_amount": flt(t.disbursed_amount),
#         })

#     result = []
#     for doc in disb_docs:
#         ft = tracker_map.get(doc.name, [])
#         ftotal = sum(flt(t["disbursed_amount"]) for t in ft) if period_active else flt(doc.total_disbursement)
#         result.append({
#             "name": doc.name, "budget_reference_id": doc.budget_reference_id or "",
#             "budget_reference_name": doc.budget_reference_name or "",
#             "partner_id": doc.partner_id or "", "partner_name": doc.partner_name or "",
#             "grant_id": doc.grant_id or "", "state": doc.state or "",
#             "district": doc.district or "", "block": doc.block or "",
#             "financial_year": doc.financial_year or "",
#             "total_budget": flt(doc.total_budget), "total_disbursement": ftotal,
#             "balence_budget": flt(doc.total_budget) - ftotal,
#             "tracker": ft,
#         })
#     if period_active:
#         result = [r for r in result if r["tracker"]]
#     return result

# # ══════════════════════════════════════════════════════════════════════════
# # BUDGET LINE ITEMS — UPDATED: uses _prorata_by_budget_year
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_budget_line_items(budget_id: str, start_date=None, end_date=None,
#                           financial_year=None, month=None):
#     if not budget_id: return []
#     partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
#     _assert_partner_access(partner_id)

#     def _pl(v):
#         if not v: return []
#         if isinstance(v, list): return [x for x in v if x]
#         try:
#             p = json.loads(v)
#             if isinstance(p, list): return [x for x in p if x]
#         except: pass
#         return [x.strip() for x in str(v).split(",") if x.strip()]

#     filter_fys    = _pl(financial_year)
#     month_filters = [m.strip() for m in _pl(month) if str(m).strip()]

#     rows = frappe.get_all("Budget Items",
#         filters={"parent": budget_id, "parenttype": "Creche Budget"},
#         fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
#                 "budget_sub_head","year_1","year_2","year_3","total_amount","notes"],
#         order_by="budget_main_head asc, type_of_expenses asc", ignore_permissions=True)

#     filter_segments = _build_filter_segments({
#         "start_date": start_date, "end_date": end_date,
#         "financial_year": filter_fys, "month": month_filters,
#     })
#     bud_start, bud_end = frappe.db.get_value(
#         "Creche Budget", budget_id, ["start_date", "end_date"])

#     result = []
#     for r in rows:
#         if filter_segments and bud_start and bud_end:
#             # Use budget-year-based prorata (not FY-based)
#             pr = _prorata_by_budget_year(
#                 r.year_1, r.year_2, r.year_3,
#                 bud_start, bud_end, filter_segments,
#             )
#             display_total = pr["total"]
#             y1 = pr["year_1"]
#             y2 = pr["year_2"]
#             y3 = pr["year_3"]
#         else:
#             display_total = flt(r.total_amount)
#             y1, y2, y3 = flt(r.year_1), flt(r.year_2), flt(r.year_3)

#         result.append({
#             "type_of_expenses_id": r.type_of_expenses_id,
#             "type_of_expenses": r.type_of_expenses, "budget_main_head": r.budget_main_head,
#             "budget_sub_head": r.budget_sub_head, "year_1": y1, "year_2": y2, "year_3": y3,
#             "total_amount": display_total, "notes": r.notes or "",
#         })
#     return result

# # ══════════════════════════════════════════════════════════════════════════
# # UTILISATION LINE ITEMS
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_utilisation_line_items(budget_id: str, start_date=None, end_date=None,
#                                financial_year=None, month=None):
#     if not budget_id: return {"months": [], "records": []}
#     partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
#     _assert_partner_access(partner_id)

#     def _parse_list(v):
#         if not v: return []
#         if isinstance(v, list): return [x for x in v if x]
#         try:
#             p = json.loads(v)
#             if isinstance(p, list): return [x for x in p if x]
#         except: pass
#         return [x.strip() for x in str(v).split(",") if x.strip()]

#     fy_list    = _parse_list(financial_year)
#     month_list = _parse_list(month)

#     util_filters = {"budget_reference_id": budget_id}
#     if fy_list:    util_filters["financial_year"] = ["in", fy_list]
#     if month_list: util_filters["month"]          = ["in", month_list]

#     util_docs = frappe.get_all("Creche utilisation", filters=util_filters,
#         fields=["name","month","financial_year","creation"],
#         order_by="financial_year asc, month asc", ignore_permissions=True)

#     if (start_date or end_date) and util_docs:
#         util_docs = [d for d in util_docs if d.creation
#             and (not start_date or getdate(str(d.creation)[:10]) >= getdate(start_date))
#             and (not end_date   or getdate(str(d.creation)[:10]) <= getdate(end_date))]

#     if not util_docs: return {"months": [], "records": []}

#     records = []; seen = []
#     for doc in util_docs:
#         items = frappe.get_all("Utilisation Items",
#             filters={"parent": doc.name, "parenttype": "Creche utilisation"},
#             fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
#                     "budget_sub_head","total_amount","notes"],
#             order_by="budget_main_head asc, type_of_expenses asc", ignore_permissions=True)
#         ml = doc.month or "Unknown"
#         records.append({"month": ml, "financial_year": doc.financial_year or "",
#                         "utilisation_id": doc.name,
#                         "items": [{"type_of_expenses_id": r.type_of_expenses_id,
#                                    "type_of_expenses": r.type_of_expenses,
#                                    "budget_main_head": r.budget_main_head,
#                                    "budget_sub_head": r.budget_sub_head,
#                                    "total_amount": flt(r.total_amount), "notes": r.notes or ""}
#                                   for r in items]})
#         if ml not in seen: seen.append(ml)

#     def msort(m):
#         try: return MONTH_ORDER.index(m)
#         except: return 99
#     seen.sort(key=msort)
#     records.sort(key=lambda r: (r["financial_year"], msort(r["month"])))
#     return {"months": seen, "records": records}

# # ══════════════════════════════════════════════════════════════════════════
# # PENDING UTILIZATION
# # ══════════════════════════════════════════════════════════════════════════

# def _get_partner_emails(partner_ids):
#     email_map = {}
#     if not partner_ids: return email_map
#     perm_rows = frappe.db.sql(
#         """SELECT up.for_value AS partner_id, u.email
#            FROM `tabUser Permission` up
#            INNER JOIN `tabUser` u ON u.name = up.user AND u.enabled = 1
#            WHERE up.allow = 'Creche Partners' AND up.for_value IN %(pids)s
#            ORDER BY u.name""",
#         {"pids": partner_ids}, as_dict=True,
#     )
#     for row in perm_rows:
#         if row.partner_id not in email_map and row.email:
#             email_map[row.partner_id] = row.email

#     missing = [p for p in partner_ids if p not in email_map]
#     if missing:
#         for field in ("email", "email_id", "contact_email"):
#             try:
#                 rows = frappe.get_all("Creche Partners", filters={"name": ["in", missing]},
#                                       fields=["name", field], ignore_permissions=True)
#                 for r in rows:
#                     v = r.get(field, "")
#                     if v and r.name not in email_map:
#                         email_map[r.name] = v
#             except Exception:
#                 continue
#     return email_map

# def _get_partner_mobiles(partner_ids):
#     """
#     Return {partner_id: mobile_no} for given partner IDs.
#     Priority: User.mobile_no (via User Permission) → Creche Partners direct field.
#     """
#     mobile_map = {}
#     if not partner_ids:
#         return mobile_map

#     # Strategy 1: Get mobile_no from User doctype via User Permission link
#     try:
#         perm_rows = frappe.db.sql(
#             """
#             SELECT up.for_value AS partner_id, u.mobile_no
#             FROM `tabUser Permission` up
#             INNER JOIN `tabUser` u ON u.name = up.user AND u.enabled = 1
#             WHERE up.allow = 'Creche Partners'
#               AND up.for_value IN %(pids)s
#             ORDER BY u.name
#             """,
#             {"pids": partner_ids},
#             as_dict=True,
#         )
#         for row in perm_rows:
#             if row.partner_id not in mobile_map and row.mobile_no:
#                 mobile_map[row.partner_id] = str(row.mobile_no)
#     except Exception:
#         pass

#     # Strategy 2: fallback to direct field on Creche Partners doctype
#     missing = [p for p in partner_ids if p not in mobile_map]
#     if missing:
#         for field in ("mobile_no", "mobile", "phone", "contact_mobile"):
#             try:
#                 rows = frappe.get_all(
#                     "Creche Partners",
#                     filters={"name": ["in", missing]},
#                     fields=["name", field],
#                     ignore_permissions=True,
#                 )
#                 for r in rows:
#                     v = r.get(field, "")
#                     if v and r.name not in mobile_map:
#                         mobile_map[r.name] = str(v)
#             except Exception:
#                 continue

#     return mobile_map


# def _get_running_creches_count(permitted_partners=None):
#     """
#     Get count of running creches from the most recently submitted utilization
#     record per budget. Tries common field names for running creche count.
#     """
#     for field_name in ("no_of_running_creches", "running_creches", "no_of_creches_operational"):
#         try:
#             filters_clause = ""
#             params = []
#             if permitted_partners:
#                 ph = ",".join(["%s"] * len(permitted_partners))
#                 filters_clause = f"WHERE cu.partner_id IN ({ph})"
#                 params = list(permitted_partners)
#             result = frappe.db.sql(
#                 f"""
#                 SELECT COALESCE(SUM(cu.{field_name}), 0) AS total
#                 FROM `tabCreche utilisation` cu
#                 INNER JOIN (
#                     SELECT budget_reference_id, MAX(creation) AS max_c
#                     FROM `tabCreche utilisation`
#                     {filters_clause}
#                     GROUP BY budget_reference_id
#                 ) latest ON cu.budget_reference_id = latest.budget_reference_id
#                          AND cu.creation = latest.max_c
#                 """,
#                 params, as_dict=True,
#             )
#             return int(result[0].total or 0) if result else 0
#         except Exception:
#             continue
#     return 0



# def _add_month(d):
#     if relativedelta:
#         return d + relativedelta(months=1)
#     y, m = d.year, d.month + 1
#     if m > 12: y += 1; m = 1
#     return _date(y, m, 1)

# @frappe.whitelist()
# def get_pending_utilisation_summary(cutoff_date=None, target_fy=None, target_month=None):
#     today = getdate(frappe.utils.nowdate())
#     if cutoff_date:
#         cutoff = getdate(cutoff_date)
#     else:
#         if today.day >= 5:
#             cutoff = today.replace(day=5)
#         else:
#             y, m = today.year, today.month - 1
#             if m < 1: y -= 1; m = 12
#             cutoff = _date(y, m, 5)

#     boundary_month_start = cutoff.replace(day=1)
#     permitted = _get_user_permitted_partners()
#     budget_filters = [
#         ["start_date", "is", "set"],
#         ["end_date", "is", "set"],
#         ["start_date", "<=", cutoff],
#     ]
#     if permitted is not None:
#         if not permitted:
#             return {"partners": [], "cutoff": str(cutoff)}
#         budget_filters.append(["partner_id", "in", permitted])

#     budgets = frappe.get_all(
#         "Creche Budget",
#         fields=["name","budget_reference_name","partner_id","partner_name",
#                 "grant_id","state","district","block","start_date","end_date"],
#         filters=budget_filters, ignore_permissions=True, limit_page_length=0,
#     )
#     if not budgets:
#         return {"partners": [], "cutoff": str(cutoff)}

#     budget_names = [b["name"] for b in budgets]
#     existing = set(
#         (r["budget_reference_id"], r["financial_year"], r["month"])
#         for r in frappe.get_all("Creche utilisation",
#             filters={"budget_reference_id": ["in", budget_names]},
#             fields=["budget_reference_id","financial_year","month"],
#             ignore_permissions=True, limit_page_length=0)
#     )

#     # When target_fy and target_month are given, only check that specific month
#     check_specific = bool(target_fy and target_month)

#     by_partner = {}
#     for b in budgets:
#         bud_start = getdate(b["start_date"])
#         bud_end   = getdate(b["end_date"])

#         missing_for_budget = []

#         if check_specific:
#             # Only check the one selected month
#             try:
#                 month_num = list(_calendar.month_name).index(target_month)  # 1-12
#             except ValueError:
#                 continue
#             fy_start_year = int(target_fy.split("-")[0])
#             year = fy_start_year if month_num >= 4 else fy_start_year + 1
#             month_start = _date(year, month_num, 1)

#             # Skip if this month is outside the budget period
#             if month_start < bud_start.replace(day=1) or month_start > bud_end.replace(day=1):
#                 continue
#             # Skip if submission already exists
#             if (b["name"], target_fy, target_month) in existing:
#                 continue

#             deadline = _add_month(month_start).replace(day=5)
#             days_overdue = (cutoff - deadline).days
#             missing_for_budget.append({
#                 "financial_year": target_fy, "month": target_month,
#                 "deadline": deadline.isoformat(),
#                 "days_overdue": max(days_overdue, 0),
#             })
#         else:
#             # Original logic: check all months from budget start to boundary
#             start = bud_start
#             end   = bud_end
#             effective_end = min(end.replace(day=1), boundary_month_start)
#             cursor = start.replace(day=1)
#             while cursor <= effective_end:
#                 month_name = MONTH_ORDER[cursor.month - 1]
#                 fy_label = (f"{cursor.year}-{str(cursor.year+1)[2:]}" if cursor.month >= 4
#                             else f"{cursor.year-1}-{str(cursor.year)[2:]}")
#                 if (b["name"], fy_label, month_name) not in existing:
#                     deadline = _add_month(cursor).replace(day=5)
#                     days_overdue = (cutoff - deadline).days
#                     missing_for_budget.append({
#                         "financial_year": fy_label, "month": month_name,
#                         "deadline": deadline.isoformat(),
#                         "days_overdue": max(days_overdue, 0),
#                     })
#                 cursor = _add_month(cursor)

#         if not missing_for_budget:
#             continue

#         pid = b["partner_id"] or b["partner_name"] or "Unknown"
#         if pid not in by_partner:
#             by_partner[pid] = {
#                 "partner_id": b["partner_id"], "partner_name": b["partner_name"],
#                 "missing_count": 0, "max_days_overdue": 0, "budgets": [],
#             }
#         entry = by_partner[pid]
#         entry["budgets"].append({
#             "budget_id": b["name"], "budget_reference_name": b["budget_reference_name"],
#             "grant_id": b["grant_id"], "state": b["state"],
#             "missing_months": missing_for_budget,
#         })
#         entry["missing_count"] += len(missing_for_budget)
#         entry["max_days_overdue"] = max(
#             entry["max_days_overdue"],
#             max((m["days_overdue"] for m in missing_for_budget), default=0),
#         )

#     partner_ids = [pid for pid in by_partner if pid]
#     email_map   = _get_partner_emails(partner_ids)
#     mobile_map  = _get_partner_mobiles(partner_ids)

#     result = []
#     for pid, entry in by_partner.items():
#         entry["email"]  = email_map.get(pid, "")
#         entry["mobile"] = mobile_map.get(pid, "")
#         result.append(entry)
#     result.sort(key=lambda r: (-r["max_days_overdue"], r["partner_name"] or ""))
#     return {"partners": result, "cutoff": str(cutoff)}

# @frappe.whitelist()
# def send_utilisation_reminder(partner_ids=None, custom_message=None):
#     if isinstance(partner_ids, str):
#         try: partner_ids = json.loads(partner_ids)
#         except Exception: partner_ids = [p.strip() for p in partner_ids.split(",") if p.strip()]
#     partner_ids = partner_ids or []
#     if not partner_ids: frappe.throw(frappe._("No partners selected"))

#     permitted = _get_user_permitted_partners()
#     if permitted is not None:
#         partner_ids = [p for p in partner_ids if p in permitted]
#         if not partner_ids: frappe.throw(frappe._("You do not have permission to email these partners"))

#     email_map = _get_partner_emails(partner_ids)
#     partner_names = {r.name: r.partner_name for r in frappe.get_all(
#         "Creche Partners", filters={"name": ["in", partner_ids]},
#         fields=["name","partner_name"], ignore_permissions=True)}

#     default_message = ("This is a reminder that your utilisation report submission is pending. "
#                        "Kindly submit it at the earliest to keep your budget records up to date.")
#     message_body = custom_message or default_message

#     sent, failed = [], []
#     for pid in partner_ids:
#         email = email_map.get(pid)
#         pname = partner_names.get(pid, pid)
#         if not email:
#             failed.append({"partner_id": pid, "partner_name": pname, "reason": "No email on file"})
#             continue
#         try:
#             frappe.sendmail(
#                 recipients=[email],
#                 subject="Utilisation Report Submission Reminder",
#                 message=f"<p>Dear {frappe.utils.escape_html(pname)},</p><p>{frappe.utils.escape_html(message_body)}</p>",
#                 now=True,
#             )
#             sent.append({"partner_id": pid, "partner_name": pname, "email": email})
#         except Exception as e:
#             failed.append({"partner_id": pid, "partner_name": pname, "reason": str(e)})

#     return {"sent": sent, "failed": failed}

# # ══════════════════════════════════════════════════════════════════════════
# # EXPORT
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def export_table(title="Report", columns=None, rows=None, format="xlsx"):
#     if isinstance(columns, str): columns = json.loads(columns)
#     if isinstance(rows, str):    rows    = json.loads(rows)
#     columns = columns or []; rows = rows or []

#     if format == "pdf":
#         file_url = _export_pdf(title, columns, rows)
#     else:
#         file_url = _export_xlsx(title, columns, rows)
#     return {"file_url": file_url}

# def _is_total_row(row, columns):
#     if not columns: return False
#     return str(row.get(columns[0].get("key"), "")).strip().lower() == "total"

# def _export_xlsx(title, columns, rows):
#     try:
#         from openpyxl import Workbook
#         from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
#         from openpyxl.utils import get_column_letter
#     except ImportError:
#         frappe.throw(frappe._("openpyxl is required for Excel export."))

#     wb = Workbook(); ws = wb.active; ws.title = (title or "Data")[:31]
#     NAVY="1E3A5F"; LIGHTBLUE="BFDBFE"; BORDER_C="93C5FD"; GRID_C="E2E8F0"; GROUP_FILL="DBEAFE"
#     thin_grid = Border(left=Side(style="thin",color=GRID_C),right=Side(style="thin",color=GRID_C),
#                        top=Side(style="thin",color=GRID_C),bottom=Side(style="thin",color=GRID_C))
#     thin_hdr  = Border(left=Side(style="thin",color=BORDER_C),right=Side(style="thin",color=BORDER_C),
#                        top=Side(style="thin",color=BORDER_C),bottom=Side(style="thin",color=BORDER_C))
#     header_font = Font(bold=True,color="FFFFFF",size=10)
#     header_fill = PatternFill(start_color=NAVY,end_color=NAVY,fill_type="solid")
#     total_font  = Font(bold=True,color=NAVY,size=11)
#     total_fill  = PatternFill(start_color=LIGHTBLUE,end_color=LIGHTBLUE,fill_type="solid")
#     group_font  = Font(bold=True,color=NAVY,size=10.5)
#     group_fill  = PatternFill(start_color=GROUP_FILL,end_color=GROUP_FILL,fill_type="solid")

#     for ci, col in enumerate(columns, start=1):
#         c = ws.cell(row=1,column=ci,value=col.get("label",""))
#         c.font=header_font; c.fill=header_fill; c.border=thin_hdr
#         c.alignment=Alignment(horizontal="center",vertical="center",wrap_text=True)

#     ncols = max(len(columns),1); r_idx = 2
#     for row in rows:
#         if row.get("__group__"):
#             ws.merge_cells(start_row=r_idx,start_column=1,end_row=r_idx,end_column=max(ncols-1,1))
#             lc = ws.cell(row=r_idx,column=1,value=row.get("label",""))
#             lc.font=group_font; lc.fill=group_fill; lc.border=thin_hdr
#             lc.alignment=Alignment(horizontal="left",vertical="center",indent=1)
#             sc = ws.cell(row=r_idx,column=ncols,value=row.get("subtotal",""))
#             sc.font=group_font; sc.fill=group_fill; sc.border=thin_hdr
#             sc.alignment=Alignment(horizontal="right",vertical="center")
#             r_idx += 1; continue

#         total_row = _is_total_row(row, columns)
#         for ci, col in enumerate(columns, start=1):
#             val = row.get(col.get("key"),"")
#             align = col.get("align","left")
#             cell = ws.cell(row=r_idx,column=ci)
#             if align=="right" and isinstance(val,(int,float)):
#                 cell.value=val; cell.number_format="#,##0.00"
#             else:
#                 cell.value=val
#             cell.alignment=Alignment(horizontal=align)
#             if total_row: cell.font=total_font; cell.fill=total_fill; cell.border=thin_hdr
#             else: cell.border=thin_grid
#         r_idx += 1

#     for ci, col in enumerate(columns, start=1):
#         letter = get_column_letter(ci)
#         max_len = len(str(col.get("label","")))
#         for row in rows:
#             if row.get("__group__"): continue
#             v = row.get(col.get("key"),"")
#             max_len = max(max_len, len(str(v)))
#         ws.column_dimensions[letter].width = min(max_len+4, 42)
#     ws.freeze_panes = "A2"

#     buf = io.BytesIO(); wb.save(buf); buf.seek(0)
#     return _save_file(f"{_safe_fname(title)}.xlsx", buf.getvalue())

# def _export_pdf(title, columns, rows):
#     thead = "".join(f"<th>{frappe.utils.escape_html(c.get('label',''))}</th>" for c in columns)
#     ncols = max(len(columns), 1); body_rows = []
#     for row in rows:
#         if row.get("__group__"):
#             label   = frappe.utils.escape_html(row.get("label",""))
#             subtotal= frappe.utils.escape_html(row.get("subtotal",""))
#             body_rows.append(f'<tr class="group-row"><td colspan="{ncols}">'
#                              f'<span class="group-row__label">{label}</span>'
#                              f'<span class="group-row__subtotal">{subtotal}</span></td></tr>')
#             continue
#         total_row = _is_total_row(row, columns)
#         tds = [f'<td style="text-align:{c.get("align","left")}">{frappe.utils.escape_html(str(row.get(c.get("key"),"" )))}</td>'
#                for c in columns]
#         body_rows.append(f'<tr{"  class=\"total-row\"" if total_row else ""}>{"".join(tds)}</tr>')

#     html = f"""<html><head><meta charset="utf-8">
#     <style>@page{{size:A4 portrait;margin:14mm 10mm}}*{{box-sizing:border-box;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif}}body{{color:#1f2937}}h1{{font-size:16px;font-weight:700;color:#1e3a5f;margin-bottom:4px}}.meta{{font-size:9px;color:#94a3b8;margin-bottom:12px}}table{{width:100%;border-collapse:collapse;font-size:10px}}th{{background:#1e3a5f;color:#fff;font-weight:700;text-transform:uppercase;font-size:8.5px;letter-spacing:.4px;padding:6px 8px;text-align:left;border:1px solid #93c5fd}}td{{padding:5px 8px;border:1px solid #e2e8f0}}tr.total-row td{{background:#bfdbfe;color:#1e3a5f;font-weight:700;border:1px solid #93c5fd}}tr.group-row td{{background:#dbeafe;color:#1e3a5f;font-weight:700;border:1px solid #93c5fd;padding:6px 8px}}.group-row__label{{display:inline-block}}.group-row__subtotal{{float:right}}tr:nth-child(even):not(.total-row):not(.group-row) td{{background:#f8fafc}}</style>
#     </head><body>
#     <h1>{frappe.utils.escape_html(title or "Report")}</h1>
#     <div class="meta">Exported {frappe.utils.now_datetime().strftime("%d %b %Y, %I:%M %p")} by {frappe.session.user}</div>
#     <table><thead><tr>{thead}</tr></thead><tbody>{"".join(body_rows)}</tbody></table>
#     </body></html>"""

#     from frappe.utils.pdf import get_pdf
#     pdf_content = get_pdf(html, options={"page-size":"A4","orientation":"Portrait"})
#     return _save_file(f"{_safe_fname(title)}.pdf", pdf_content)

# def _safe_fname(title):
#     import re
#     base = re.sub(r"[^A-Za-z0-9_-]+","_",title or "report").strip("_") or "report"
#     return base[:80]

# def _save_file(fname, content):
#     f = frappe.get_doc({"doctype":"File","file_name":fname,"is_private":0,"content":content})
#     f.save(ignore_permissions=True)
#     return f.file_url




























# """
# creche_reports/api/creche_dashboard.py

# All server-side methods for the Creche Dashboard page.
# """

# import frappe
# from frappe.utils import flt, getdate, nowdate, add_days, now_datetime, get_datetime, get_url
# from datetime import date as _date, datetime, timedelta as _timedelta
# import calendar as _calendar
# import json
# import io

# try:
#     from dateutil.relativedelta import relativedelta
# except ImportError:
#     relativedelta = None

# MONTH_ORDER = [
#     "January","February","March","April","May","June",
#     "July","August","September","October","November","December",
# ]

# # ══════════════════════════════════════════════════════════════════════════
# # DATE / PRORATA HELPERS
# # ══════════════════════════════════════════════════════════════════════════

# def _to_date(v):
#     if not v: return None
#     if isinstance(v, _date): return v
#     return _date.fromisoformat(str(v)[:10])

# def _add_months_safe(d, n):
#     """Add n calendar months to date d, clamping day to month-end."""
#     if relativedelta:
#         return d + relativedelta(months=n)
#     m = d.month - 1 + n
#     year  = d.year + m // 12
#     month = m % 12 + 1
#     day   = min(d.day, _calendar.monthrange(year, month)[1])
#     return _date(year, month, day)

# def _count_calendar_months(start, end):
#     """Count distinct calendar months from start to end inclusive."""
#     if not start or not end or start > end:
#         return 0
#     count = 0
#     y, m = start.year, start.month
#     ey, em = end.year, end.month
#     while (y, m) <= (ey, em):
#         count += 1
#         m += 1
#         if m > 12:
#             m, y = 1, y + 1
#     return count

# def _prorata_by_budget_year(year_1, year_2, year_3, bud_start, bud_end, filter_segments):
#     """
#     Calculate prorated budget using budget-year periods (NOT financial-year periods).

#     Y1 = first 12 months from budget start date
#     Y2 = months 13-24 from budget start date
#     Y3 = months 25-36 from budget start date

#     For each year period that overlaps a filter segment:
#         contribution = year_amount / 12 * months_in_overlap

#     Returns dict with keys: total, year_1, year_2, year_3
#     """
#     empty = {"total": 0.0, "year_1": 0.0, "year_2": 0.0, "year_3": 0.0}
#     bud_s = _to_date(bud_start)
#     bud_e = _to_date(bud_end)
#     if not bud_s or not bud_e:
#         return empty

#     year_amounts = [float(year_1 or 0), float(year_2 or 0), float(year_3 or 0)]
#     scaled = [0.0, 0.0, 0.0]

#     for i, yr_amt in enumerate(year_amounts):
#         if not yr_amt:
#             continue
#         yr_s = _add_months_safe(bud_s, i * 12)
#         yr_e = _add_months_safe(bud_s, (i + 1) * 12) - _timedelta(days=1)
#         yr_e = min(yr_e, bud_e)
#         if yr_s > bud_e:
#             break  # all remaining years are also beyond budget end

#         for seg_s, seg_e in filter_segments:
#             ov_s = max(seg_s, yr_s)
#             ov_e = min(seg_e, yr_e)
#             if ov_s > ov_e:
#                 continue
#             months = _count_calendar_months(ov_s, ov_e)
#             if months > 0:
#                 scaled[i] += yr_amt / 12.0 * months

#     return {
#         "total":  round(scaled[0] + scaled[1] + scaled[2], 2),
#         "year_1": round(scaled[0], 2),
#         "year_2": round(scaled[1], 2),
#         "year_3": round(scaled[2], 2),
#     }

# def _compute_prorata_budget(budget_name, bud_start, bud_end, filter_segments):
#     """
#     Compute prorated total budget for a Creche Budget document.
#     Uses budget-year-based proration (not financial-year-based).
#     """
#     if not filter_segments:
#         return None

#     rows = frappe.db.sql(
#         """SELECT SUM(COALESCE(year_1,0)) AS year_1,
#                   SUM(COALESCE(year_2,0)) AS year_2,
#                   SUM(COALESCE(year_3,0)) AS year_3
#            FROM `tabBudget Items`
#            WHERE parent = %s AND parenttype = 'Creche Budget'""",
#         (budget_name,), as_dict=True,
#     )
#     if not rows or not rows[0]:
#         return 0.0

#     raw = rows[0]
#     result = _prorata_by_budget_year(
#         raw.get("year_1") or 0,
#         raw.get("year_2") or 0,
#         raw.get("year_3") or 0,
#         bud_start, bud_end, filter_segments,
#     )
#     return result["total"]

# def _build_filter_segments(filters):
#     raw_start = _to_date(filters.get("start_date"))
#     raw_end   = _to_date(filters.get("end_date"))

#     filter_fys = filters.get("financial_year") or []
#     if isinstance(filter_fys, str): filter_fys = [filter_fys]
#     filter_fys = list(filter_fys)

#     month_raw = filters.get("month") or []
#     if isinstance(month_raw, str): month_raw = [month_raw] if month_raw.strip() else []
#     month_filters = [m.strip() for m in month_raw if str(m).strip()]

#     if raw_start or raw_end:
#         from datetime import timedelta
#         seg_s = raw_start or (raw_end - timedelta(days=3*366))
#         seg_e = raw_end   or (raw_start + timedelta(days=3*366))
#         return [(seg_s, seg_e)]

#     if filter_fys and month_filters:
#         segs = []
#         for fy in filter_fys:
#             fy_start_year = int(fy.split("-")[0])
#             for mn in month_filters:
#                 month_num = list(_calendar.month_name).index(mn)
#                 year      = fy_start_year if month_num >= 4 else fy_start_year + 1
#                 last_day  = _calendar.monthrange(year, month_num)[1]
#                 segs.append((_date(year, month_num, 1), _date(year, month_num, last_day)))
#         return segs

#     if filter_fys:
#         segs = []
#         for fy in filter_fys:
#             y = int(fy.split("-")[0])
#             segs.append((_date(y, 4, 1), _date(y + 1, 3, 31)))
#         return segs

#     return []

# # ══════════════════════════════════════════════════════════════════════════
# # PERMISSION HELPERS
# # ══════════════════════════════════════════════════════════════════════════

# def _get_user_permitted_partners():
#     user  = frappe.session.user
#     roles = frappe.get_roles(user)
#     if "System Manager" in roles or user == "Administrator":
#         return None
#     rows = frappe.db.sql(
#         "SELECT for_value FROM `tabUser Permission` WHERE user = %s AND allow = 'Creche Partners'",
#         (user,), as_dict=True,
#     )
#     if not rows: return None
#     return [r.for_value for r in rows if r.for_value]

# def _intersect(filter_list, permitted):
#     if permitted is None: return filter_list
#     if not permitted: return []
#     if not filter_list: return permitted
#     pset = set(permitted)
#     return [p for p in filter_list if p in pset]

# def _empty_summary():
#     return {
#         "total_budget":0,"total_disbursement":0,
#         "total_utilisation":0,"total_bank_balance":0,
#         "total_interest":0,"total_creches":0,
#         "utilisation_pct":0,"disbursement_pct":0,
#     }

# def _assert_partner_access(partner_id: str):
#     permitted = _get_user_permitted_partners()
#     if permitted is None: return
#     if partner_id not in permitted:
#         frappe.throw(frappe._("You do not have permission to access this partner"), frappe.PermissionError)

# # ══════════════════════════════════════════════════════════════════════════
# # PARTNER OPTIONS
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_partner_options(txt=""):
#     permitted = _get_user_permitted_partners()
#     filters   = {}
#     if permitted is not None:
#         if not permitted: return []
#         filters["name"] = ["in", permitted]
#     if txt:
#         filters["partner_name"] = ["like", f"%{txt}%"]
#     rows = frappe.get_all("Creche Partners", filters=filters, fields=["name","partner_name"],
#                           order_by="partner_name asc", limit=500, ignore_permissions=True)
#     return [{"name": r.name, "partner_name": r.partner_name or r.name} for r in rows]

# @frappe.whitelist()
# def get_user_permission_scope():
#     permitted = _get_user_permitted_partners()
#     if permitted is None: return {"restricted": False, "partner_ids": []}
#     return {"restricted": True, "partner_ids": permitted}

# # ══════════════════════════════════════════════════════════════════════════
# # MAIN SUMMARY
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_partner_budget_summary(filters=None):
#     if isinstance(filters, str):
#         filters = json.loads(filters)
#     filters = filters or {}

#     permitted          = _get_user_permitted_partners()
#     filter_partners    = filters.get("partner_id") or None
#     effective_partners = _intersect(filter_partners, permitted)

#     if effective_partners is not None and len(effective_partners) == 0:
#         return {"summary": _empty_summary(), "partners": []}

#     start_date = filters.get("start_date") or None
#     end_date   = filters.get("end_date")   or None

#     filter_segments = _build_filter_segments(filters)
#     apply_prorata   = bool(filter_segments)

#     budget_filters = {}
#     if effective_partners:
#         budget_filters["partner_id"] = ["in", effective_partners]
#     if filters.get("budget_ref"):
#         budget_filters["budget_reference_name"] = ["in", filters["budget_ref"]]
#     if filters.get("grant_id"):
#         budget_filters["grant_id"] = ["in", filters["grant_id"]]
#     if filters.get("state"):
#         budget_filters["state"] = ["in", filters["state"]]
#     if filters.get("district"):
#         budget_filters["district"] = ["in", filters["district"]]
#     if filters.get("block"):
#         budget_filters["block"] = ["in", filters["block"]]
#     if start_date:
#         budget_filters["end_date"]   = [">=", start_date]
#     if end_date:
#         budget_filters["start_date"] = ["<=", end_date]

#     budgets = frappe.get_all(
#         "Creche Budget", filters=budget_filters,
#         fields=["name","partner_id","partner_name","grant_id","budget_reference_name",
#                 "state","district","block","start_date","end_date","financial_year",
#                 "no_of_creches","total_budget"],
#         order_by="partner_name asc, budget_reference_name asc",
#         ignore_permissions=True,
#     )

#     budget_ids = [b.name for b in budgets]

#     # ── Budget Items sums (bulk) ──────────────────────────────────────────
#     budget_items_map = {}
#     if budget_ids:
#         ph_bi = ", ".join([f"%(bim{i})s" for i in range(len(budget_ids))])
#         bim_params = {f"bim{i}": n for i, n in enumerate(budget_ids)}
#         bi_rows = frappe.db.sql(
#             "SELECT parent,"
#             " SUM(COALESCE(year_1,0)) AS year_1,"
#             " SUM(COALESCE(year_2,0)) AS year_2,"
#             " SUM(COALESCE(year_3,0)) AS year_3"
#             " FROM `tabBudget Items`"
#             f" WHERE parent IN ({ph_bi}) AND parenttype = 'Creche Budget'"
#             " GROUP BY parent",
#             bim_params, as_dict=True,
#         )
#         for r in bi_rows:
#             budget_items_map[r.parent] = {
#                 "year_1": float(r.year_1 or 0),
#                 "year_2": float(r.year_2 or 0),
#                 "year_3": float(r.year_3 or 0),
#                 "total":  float(r.year_1 or 0) + float(r.year_2 or 0) + float(r.year_3 or 0),
#             }

#     # ── Disbursement (date-based) ─────────────────────────────────────────
#     disbursement_map = {}
#     if budget_ids:
#         disb_headers = frappe.get_all("Creche Disbursement",
#             filters={"budget_reference_id": ["in", budget_ids]},
#             fields=["name","budget_reference_id"], ignore_permissions=True)
#         disb_parent_names = [d.name for d in disb_headers]
#         disb_bid_map = {d.name: d.budget_reference_id for d in disb_headers}

#         if disb_parent_names:
#             tracker_rows = frappe.get_all("Disbursement Tracker",
#                 filters={"parent": ["in", disb_parent_names], "parenttype": "Creche Disbursement"},
#                 fields=["parent","date_of_disbursement","disbursed_amount"],
#                 ignore_permissions=True)

#             if filter_segments:
#                 tracker_rows = [
#                     t for t in tracker_rows
#                     if t.date_of_disbursement and any(
#                         seg_s <= getdate(str(t.date_of_disbursement)) <= seg_e
#                         for seg_s, seg_e in filter_segments
#                     )
#                 ]
#             elif start_date or end_date:
#                 tracker_rows = [
#                     t for t in tracker_rows
#                     if t.date_of_disbursement
#                     and (not start_date or getdate(str(t.date_of_disbursement)) >= getdate(start_date))
#                     and (not end_date   or getdate(str(t.date_of_disbursement)) <= getdate(end_date))
#                 ]

#             for t in tracker_rows:
#                 bid = disb_bid_map.get(t.parent)
#                 if bid:
#                     disbursement_map[bid] = disbursement_map.get(bid, 0.0) + flt(t.disbursed_amount)

#     # ── Utilisation ───────────────────────────────────────────────────────
#     utilisation_map  = {}
#     bank_balance_map = {}
#     interest_map     = {}

#     if budget_ids:
#         filter_fys = filters.get("financial_year") or []
#         if isinstance(filter_fys, str): filter_fys = [filter_fys]
#         month_raw = filters.get("month") or []
#         if isinstance(month_raw, str): month_raw = [month_raw] if month_raw.strip() else []
#         month_filters = [m.strip() for m in month_raw if str(m).strip()]

#         util_extra  = ""
#         util_params = {}

#         if start_date and end_date:
#             def _local_fy_month_pairs(sd, ed):
#                 sd = _to_date(sd); ed = _to_date(ed)
#                 if not sd or not ed: return []
#                 pairs = []; cur = _date(sd.year, sd.month, 1)
#                 end_mo = _date(ed.year, ed.month, 1)
#                 while cur <= end_mo:
#                     fy = (f"{cur.year}-{str(cur.year+1)[2:]}" if cur.month >= 4
#                           else f"{cur.year-1}-{str(cur.year)[2:]}")
#                     pairs.append((fy, _calendar.month_name[cur.month]))
#                     cur = (_date(cur.year+1,1,1) if cur.month==12
#                            else _date(cur.year, cur.month+1, 1))
#                 return pairs
#             pairs = _local_fy_month_pairs(start_date, end_date)
#             if pairs:
#                 clauses = []
#                 for i, (fy, mn) in enumerate(pairs):
#                     util_params[f"ufy{i}"] = fy; util_params[f"umn{i}"] = mn
#                     clauses.append(f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)")
#                 util_extra = " AND (" + " OR ".join(clauses) + ")"
#             else:
#                 util_extra = " AND 1=0"
#         elif filter_fys and month_filters:
#             clauses = []; k = 0
#             for fy in sorted(filter_fys):
#                 for mn in month_filters:
#                     util_params[f"ufy{k}"] = fy; util_params[f"umn{k}"] = mn
#                     clauses.append(f"(cu.financial_year = %(ufy{k})s AND cu.month = %(umn{k})s)")
#                     k += 1
#             util_extra = " AND (" + " OR ".join(clauses) + ")"
#         elif filter_fys:
#             ph = ", ".join([f"%(ufy{i})s" for i in range(len(filter_fys))])
#             for i, fy in enumerate(filter_fys): util_params[f"ufy{i}"] = fy
#             util_extra = f" AND cu.financial_year IN ({ph})"
#         elif month_filters:
#             ph = ", ".join([f"%(umn{i})s" for i in range(len(month_filters))])
#             for i, m in enumerate(month_filters): util_params[f"umn{i}"] = m
#             util_extra = f" AND cu.month IN ({ph})"
#         elif start_date:
#             from datetime import date as _dt_today
#             today = _dt_today.today()
#             def _lp(sd, ed):
#                 sd = _to_date(sd); ed = _to_date(ed)
#                 if not sd or not ed: return []
#                 pairs = []; cur = _date(sd.year, sd.month, 1)
#                 end_mo = _date(ed.year, ed.month, 1)
#                 while cur <= end_mo:
#                     fy = (f"{cur.year}-{str(cur.year+1)[2:]}" if cur.month >= 4
#                           else f"{cur.year-1}-{str(cur.year)[2:]}")
#                     pairs.append((fy, _calendar.month_name[cur.month]))
#                     cur = (_date(cur.year+1,1,1) if cur.month==12
#                            else _date(cur.year, cur.month+1, 1))
#                 return pairs
#             pairs = _lp(start_date, today)
#             if pairs:
#                 clauses = []
#                 for i, (fy, mn) in enumerate(pairs):
#                     util_params[f"ufy{i}"] = fy; util_params[f"umn{i}"] = mn
#                     clauses.append(f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)")
#                 util_extra = " AND (" + " OR ".join(clauses) + ")"

#         bid_ph = ", ".join([f"%(bid{i})s" for i in range(len(budget_ids))])
#         for i, n in enumerate(budget_ids): util_params[f"bid{i}"] = n

#         util_rows = frappe.db.sql(
#             f"""SELECT cu.budget_reference_id, SUM(ui.total_amount) AS total_util
#                 FROM `tabCreche utilisation` cu
#                 INNER JOIN `tabUtilisation Items` ui ON ui.parent = cu.name AND ui.parenttype = 'Creche utilisation'
#                 WHERE cu.budget_reference_id IN ({bid_ph}) {util_extra}
#                 GROUP BY cu.budget_reference_id""",
#             util_params, as_dict=True,
#         )
#         for r in util_rows:
#             utilisation_map[r.budget_reference_id] = flt(r.total_util)

#         interest_rows = frappe.db.sql(
#             f"""SELECT budget_reference_id, SUM(interest_from_bank) AS total_interest
#                 FROM `tabCreche utilisation`
#                 WHERE budget_reference_id IN ({bid_ph}) {util_extra.replace("cu.", "")}
#                 GROUP BY budget_reference_id""",
#             util_params, as_dict=True,
#         )
#         for r in interest_rows:
#             interest_map[r.budget_reference_id] = flt(r.total_interest)

#         _FY_POS = {
#             "April":1,"May":2,"June":3,"July":4,"August":5,"September":6,
#             "October":7,"November":8,"December":9,"January":10,"February":11,"March":12,
#         }
#         bal_rows = frappe.db.sql(
#             f"""SELECT budget_reference_id, financial_year, month, balance_amount
#                 FROM `tabCreche utilisation`
#                 WHERE budget_reference_id IN ({bid_ph}) {util_extra.replace("cu.", "")}""",
#             util_params, as_dict=True,
#         )
#         bal_best = {}
#         for r in bal_rows:
#             bid = r.budget_reference_id
#             key = (r.financial_year or "", _FY_POS.get(r.month, 0))
#             if bid not in bal_best or key > bal_best[bid][0]:
#                 bal_best[bid] = (key, flt(r.balance_amount))
#         bank_balance_map = {bid: v[1] for bid, v in bal_best.items()}

#     # ── Running creches per budget (from latest modified utilization) ──────
#     running_creches_map = {}
#     if budget_ids:
#         try:
#             rc_ph = ", ".join(["%s"] * len(budget_ids))
#             rc_rows = frappe.db.sql(
#                 f"""
#                 SELECT cu.budget_reference_id, COALESCE(cu.no_of_running_creches, 0) AS rc
#                 FROM `tabCreche utilisation` cu
#                 INNER JOIN (
#                     SELECT budget_reference_id, MAX(modified) AS max_m
#                     FROM `tabCreche utilisation`
#                     WHERE budget_reference_id IN ({rc_ph})
#                     GROUP BY budget_reference_id
#                 ) latest ON cu.budget_reference_id = latest.budget_reference_id
#                          AND cu.modified = latest.max_m
#                 """,
#                 budget_ids, as_dict=True,
#             )
#             for r in rc_rows:
#                 running_creches_map[r.budget_reference_id] = int(r.rc or 0)
#         except Exception:
#             pass

#     # ── Assemble results ──────────────────────────────────────────────────

#     partners = {}
#     grand = dict(budget=0.0, disbursement=0.0, utilisation=0.0, bank_balance=0.0, interest=0.0, creches=0)

#     for budget in budgets:
#         bid = budget.name
#         bi  = budget_items_map.get(bid, {"year_1":0,"year_2":0,"year_3":0,"total":flt(budget.total_budget)})

#         if apply_prorata:
#             pr = _prorata_by_budget_year(
#                 bi["year_1"], bi["year_2"], bi["year_3"],
#                 budget.start_date, budget.end_date, filter_segments,
#             )
#             budget_amount = pr["total"]
#         else:
#             budget_amount = bi["total"] if bi["total"] else flt(budget.total_budget)

#         disbursement = flt(disbursement_map.get(bid, 0))
#         utilisation  = flt(utilisation_map.get(bid, 0))
#         bank_balance = flt(bank_balance_map.get(bid, 0))
#         interest     = flt(interest_map.get(bid, 0))
#         creches      = int(budget.no_of_creches or 0)

#         balance_budget            = budget_amount - utilisation
#         utilised_pct              = round((utilisation / budget_amount * 100) if budget_amount else 0, 2)
#         utilised_disbursement_pct = round((utilisation / disbursement * 100)  if disbursement  else 0, 2)

#         partner_key = budget.partner_id or budget.partner_name or "Unknown"
#         if partner_key not in partners:
#             partners[partner_key] = {
#                 "partner_id": budget.partner_id, "partner_name": budget.partner_name,
#                 "total_budget":0.0,"total_disbursement":0.0,"total_utilisation":0.0,
#                 "total_balance_budget":0.0,"total_bank_balance":0.0,
#                 "total_interest":0.0,"total_creches":0,"budgets":[],
#             }
#         p = partners[partner_key]
#         p["total_budget"]         += budget_amount
#         p["total_disbursement"]   += disbursement
#         p["total_utilisation"]    += utilisation
#         p["total_balance_budget"] += balance_budget
#         if bank_balance > 0:
#             p["total_bank_balance"] = max(p["total_bank_balance"], bank_balance)
#         elif p["total_bank_balance"] == 0:
#             p["total_bank_balance"] = bank_balance
#         budget_running = running_creches_map.get(bid, 0)
#         p["total_interest"]       += interest
#         p["total_creches"]        += creches
#         p.setdefault("total_running_creches", 0)
#         p["total_running_creches"] += budget_running
#         p["budgets"].append({
#             "budget_id": bid, "grant_id": budget.grant_id,
#             "budget_reference_name": budget.budget_reference_name,
#             "state": budget.state, "district": budget.district, "block": budget.block,
#             "grant_start": budget.start_date, "grant_end": budget.end_date,
#             "financial_year": budget.financial_year, "no_of_creches": creches,
#             "budget": budget_amount, "disbursement": disbursement,
#             "utilisation": utilisation, "utilised_pct": utilised_pct,
#             "utilised_disbursement_pct": utilised_disbursement_pct,
#             "balance_budget_amount": balance_budget,
#             "bank_balance": bank_balance, "interest_from_bank": interest,
#             "running_creches": budget_running,
#         })

#         grand["budget"]       += budget_amount
#         grand["disbursement"] += disbursement
#         grand["utilisation"]  += utilisation
#         grand["bank_balance"] += bank_balance
#         grand["interest"]     += interest
#         grand["creches"]      += creches

#     result = []
#     for p in partners.values():
#         p["utilised_pct"] = round((p["total_utilisation"] / p["total_budget"] * 100) if p["total_budget"] else 0, 2)
#         p["grant_ids"]    = ", ".join(sorted(set(b["grant_id"] for b in p["budgets"] if b["grant_id"])))
#         p["budgets"]      = sorted(p["budgets"], key=lambda x: x["budget_reference_name"] or "")
#         result.append(p)
#     result.sort(key=lambda x: x["partner_name"] or "")

#     gb = grand["budget"]
#     # Get running creches from most recent utilisation records
#     running_creches = _get_running_creches_count(
#         effective_partners if effective_partners else None
#     )
#     return {
#         "summary": {
#             "total_budget":       grand["budget"],
#             "total_disbursement": grand["disbursement"],
#             "total_utilisation":  grand["utilisation"],
#             "total_bank_balance": grand["bank_balance"],
#             "total_interest":     grand["interest"],
#             "total_creches":      grand["creches"],
#             "running_creches":    running_creches,
#             "utilisation_pct":    round((grand["utilisation"]  / gb * 100) if gb else 0, 2),
#             "disbursement_pct":   round((grand["disbursement"] / gb * 100) if gb else 0, 2),
#         },
#         "partners": result,
#     }

# # ══════════════════════════════════════════════════════════════════════════
# # DISBURSEMENT PANEL DATA
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_disbursement_panel_data(budget_ids=None, partner_ids=None, start_date=None, end_date=None,
#                                 financial_year=None, month=None):
#     permitted = _get_user_permitted_partners()
#     def _to_list(v):
#         if not v: return []
#         if isinstance(v, str):
#             try:
#                 p = json.loads(v)
#                 if isinstance(p, list): return [x for x in p if x]
#             except: pass
#             return [x.strip() for x in v.split(",") if x.strip()]
#         return [x for x in v if x]

#     budget_ids_list  = _to_list(budget_ids)
#     partner_ids_list = _to_list(partner_ids)
#     filter_fys       = _to_list(financial_year)
#     month_filters    = [m.strip() for m in _to_list(month) if str(m).strip()]

#     disb_filters = {}
#     if budget_ids_list:
#         if permitted is not None:
#             br = frappe.get_all("Creche Budget",
#                 filters={"name":["in",budget_ids_list]},
#                 fields=["name","partner_id"], ignore_permissions=True)
#             budget_ids_list = [r.name for r in br if r.partner_id in permitted]
#             if not budget_ids_list: return []
#         disb_filters["budget_reference_id"] = ["in", budget_ids_list]
#     elif partner_ids_list:
#         eff = _intersect(partner_ids_list, permitted)
#         if eff is not None and not eff: return []
#         if eff: disb_filters["partner_id"] = ["in", eff]
#         elif permitted is not None: return []
#     else:
#         if permitted is not None:
#             if not permitted: return []
#             disb_filters["partner_id"] = ["in", permitted]

#     disb_docs = frappe.get_all("Creche Disbursement", filters=disb_filters,
#         fields=["name","budget_reference_id","budget_reference_name","partner_id","partner_name",
#                 "grant_id","state","district","block","financial_year",
#                 "total_disbursement","balence_budget","total_budget"],
#         order_by="partner_name asc, budget_reference_name asc", ignore_permissions=True)
#     if not disb_docs: return []

#     parent_names = [d.name for d in disb_docs]
#     tracker_rows = frappe.get_all("Disbursement Tracker",
#         filters={"parent":["in",parent_names],"parenttype":"Creche Disbursement"},
#         fields=["parent","date_of_disbursement","disbursed_amount"],
#         order_by="date_of_disbursement asc", ignore_permissions=True)

#     filter_segments = _build_filter_segments({
#         "start_date": start_date, "end_date": end_date,
#         "financial_year": filter_fys, "month": month_filters,
#     })
#     period_active = bool(filter_segments) or bool(start_date) or bool(end_date)

#     if filter_segments:
#         tracker_rows = [
#             t for t in tracker_rows
#             if t.date_of_disbursement and any(
#                 seg_s <= getdate(str(t.date_of_disbursement)) <= seg_e
#                 for seg_s, seg_e in filter_segments
#             )
#         ]
#     elif start_date or end_date:
#         tracker_rows = [t for t in tracker_rows
#             if t.date_of_disbursement
#             and (not start_date or getdate(str(t.date_of_disbursement)) >= getdate(start_date))
#             and (not end_date   or getdate(str(t.date_of_disbursement)) <= getdate(end_date))]

#     tracker_map = {}
#     for t in tracker_rows:
#         tracker_map.setdefault(t.parent, []).append({
#             "date_of_disbursement": str(t.date_of_disbursement) if t.date_of_disbursement else "",
#             "disbursed_amount": flt(t.disbursed_amount),
#         })

#     result = []
#     for doc in disb_docs:
#         ft = tracker_map.get(doc.name, [])
#         ftotal = sum(flt(t["disbursed_amount"]) for t in ft) if period_active else flt(doc.total_disbursement)
#         result.append({
#             "name": doc.name, "budget_reference_id": doc.budget_reference_id or "",
#             "budget_reference_name": doc.budget_reference_name or "",
#             "partner_id": doc.partner_id or "", "partner_name": doc.partner_name or "",
#             "grant_id": doc.grant_id or "", "state": doc.state or "",
#             "district": doc.district or "", "block": doc.block or "",
#             "financial_year": doc.financial_year or "",
#             "total_budget": flt(doc.total_budget), "total_disbursement": ftotal,
#             "balence_budget": flt(doc.total_budget) - ftotal,
#             "tracker": ft,
#         })
#     if period_active:
#         result = [r for r in result if r["tracker"]]
#     return result

# # ══════════════════════════════════════════════════════════════════════════
# # BUDGET LINE ITEMS — UPDATED: uses _prorata_by_budget_year
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_budget_line_items(budget_id: str, start_date=None, end_date=None,
#                           financial_year=None, month=None):
#     if not budget_id: return []
#     partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
#     _assert_partner_access(partner_id)

#     def _pl(v):
#         if not v: return []
#         if isinstance(v, list): return [x for x in v if x]
#         try:
#             p = json.loads(v)
#             if isinstance(p, list): return [x for x in p if x]
#         except: pass
#         return [x.strip() for x in str(v).split(",") if x.strip()]

#     filter_fys    = _pl(financial_year)
#     month_filters = [m.strip() for m in _pl(month) if str(m).strip()]

#     rows = frappe.get_all("Budget Items",
#         filters={"parent": budget_id, "parenttype": "Creche Budget"},
#         fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
#                 "budget_sub_head","year_1","year_2","year_3","total_amount","notes"],
#         order_by="budget_main_head asc, type_of_expenses asc", ignore_permissions=True)

#     filter_segments = _build_filter_segments({
#         "start_date": start_date, "end_date": end_date,
#         "financial_year": filter_fys, "month": month_filters,
#     })
#     bud_start, bud_end = frappe.db.get_value(
#         "Creche Budget", budget_id, ["start_date", "end_date"])

#     result = []
#     for r in rows:
#         if filter_segments and bud_start and bud_end:
#             # Use budget-year-based prorata (not FY-based)
#             pr = _prorata_by_budget_year(
#                 r.year_1, r.year_2, r.year_3,
#                 bud_start, bud_end, filter_segments,
#             )
#             display_total = pr["total"]
#             y1 = pr["year_1"]
#             y2 = pr["year_2"]
#             y3 = pr["year_3"]
#         else:
#             display_total = flt(r.total_amount)
#             y1, y2, y3 = flt(r.year_1), flt(r.year_2), flt(r.year_3)

#         result.append({
#             "type_of_expenses_id": r.type_of_expenses_id,
#             "type_of_expenses": r.type_of_expenses, "budget_main_head": r.budget_main_head,
#             "budget_sub_head": r.budget_sub_head, "year_1": y1, "year_2": y2, "year_3": y3,
#             "total_amount": display_total, "notes": r.notes or "",
#         })
#     return result

# # ══════════════════════════════════════════════════════════════════════════
# # UTILISATION LINE ITEMS
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_utilisation_line_items(budget_id: str, start_date=None, end_date=None,
#                                financial_year=None, month=None):
#     if not budget_id: return {"months": [], "records": []}
#     partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
#     _assert_partner_access(partner_id)

#     def _parse_list(v):
#         if not v: return []
#         if isinstance(v, list): return [x for x in v if x]
#         try:
#             p = json.loads(v)
#             if isinstance(p, list): return [x for x in p if x]
#         except: pass
#         return [x.strip() for x in str(v).split(",") if x.strip()]

#     fy_list    = _parse_list(financial_year)
#     month_list = _parse_list(month)

#     util_filters = {"budget_reference_id": budget_id}
#     if fy_list:    util_filters["financial_year"] = ["in", fy_list]
#     if month_list: util_filters["month"]          = ["in", month_list]

#     util_docs = frappe.get_all("Creche utilisation", filters=util_filters,
#         fields=["name","month","financial_year","creation"],
#         order_by="financial_year asc, month asc", ignore_permissions=True)

#     if (start_date or end_date) and util_docs:
#         util_docs = [d for d in util_docs if d.creation
#             and (not start_date or getdate(str(d.creation)[:10]) >= getdate(start_date))
#             and (not end_date   or getdate(str(d.creation)[:10]) <= getdate(end_date))]

#     if not util_docs: return {"months": [], "records": []}

#     records = []; seen = []
#     for doc in util_docs:
#         items = frappe.get_all("Utilisation Items",
#             filters={"parent": doc.name, "parenttype": "Creche utilisation"},
#             fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
#                     "budget_sub_head","total_amount","notes"],
#             order_by="budget_main_head asc, type_of_expenses asc", ignore_permissions=True)
#         ml = doc.month or "Unknown"
#         records.append({"month": ml, "financial_year": doc.financial_year or "",
#                         "utilisation_id": doc.name,
#                         "items": [{"type_of_expenses_id": r.type_of_expenses_id,
#                                    "type_of_expenses": r.type_of_expenses,
#                                    "budget_main_head": r.budget_main_head,
#                                    "budget_sub_head": r.budget_sub_head,
#                                    "total_amount": flt(r.total_amount), "notes": r.notes or ""}
#                                   for r in items]})
#         if ml not in seen: seen.append(ml)

#     def msort(m):
#         try: return MONTH_ORDER.index(m)
#         except: return 99
#     seen.sort(key=msort)
#     records.sort(key=lambda r: (r["financial_year"], msort(r["month"])))
#     return {"months": seen, "records": records}

# # ══════════════════════════════════════════════════════════════════════════
# # PENDING UTILIZATION
# # ══════════════════════════════════════════════════════════════════════════

# def _get_partner_emails(partner_ids):
#     email_map = {}
#     if not partner_ids: return email_map
#     perm_rows = frappe.db.sql(
#         """SELECT up.for_value AS partner_id, u.email
#            FROM `tabUser Permission` up
#            INNER JOIN `tabUser` u ON u.name = up.user AND u.enabled = 1
#            WHERE up.allow = 'Creche Partners' AND up.for_value IN %(pids)s
#            ORDER BY u.name""",
#         {"pids": partner_ids}, as_dict=True,
#     )
#     for row in perm_rows:
#         if row.partner_id not in email_map and row.email:
#             email_map[row.partner_id] = row.email

#     missing = [p for p in partner_ids if p not in email_map]
#     if missing:
#         for field in ("email", "email_id", "contact_email"):
#             try:
#                 rows = frappe.get_all("Creche Partners", filters={"name": ["in", missing]},
#                                       fields=["name", field], ignore_permissions=True)
#                 for r in rows:
#                     v = r.get(field, "")
#                     if v and r.name not in email_map:
#                         email_map[r.name] = v
#             except Exception:
#                 continue
#     return email_map

# def _get_partner_mobiles(partner_ids):
#     """
#     Return {partner_id: mobile_no} for given partner IDs.
#     Priority: User.mobile_no (via User Permission) → Creche Partners direct field.
#     """
#     mobile_map = {}
#     if not partner_ids:
#         return mobile_map

#     # Strategy 1: Get mobile_no from User doctype via User Permission link
#     try:
#         perm_rows = frappe.db.sql(
#             """
#             SELECT up.for_value AS partner_id, u.mobile_no
#             FROM `tabUser Permission` up
#             INNER JOIN `tabUser` u ON u.name = up.user AND u.enabled = 1
#             WHERE up.allow = 'Creche Partners'
#               AND up.for_value IN %(pids)s
#             ORDER BY u.name
#             """,
#             {"pids": partner_ids},
#             as_dict=True,
#         )
#         for row in perm_rows:
#             if row.partner_id not in mobile_map and row.mobile_no:
#                 mobile_map[row.partner_id] = str(row.mobile_no)
#     except Exception:
#         pass

#     # Strategy 2: fallback to direct field on Creche Partners doctype
#     missing = [p for p in partner_ids if p not in mobile_map]
#     if missing:
#         for field in ("mobile_no", "mobile", "phone", "contact_mobile"):
#             try:
#                 rows = frappe.get_all(
#                     "Creche Partners",
#                     filters={"name": ["in", missing]},
#                     fields=["name", field],
#                     ignore_permissions=True,
#                 )
#                 for r in rows:
#                     v = r.get(field, "")
#                     if v and r.name not in mobile_map:
#                         mobile_map[r.name] = str(v)
#             except Exception:
#                 continue

#     return mobile_map


# def _get_running_creches_count(permitted_partners=None):
#     """
#     Sum no_of_running_creches from the MOST RECENTLY MODIFIED utilization
#     record per budget. Uses `modified` (last updated) rather than `creation`.
#     """
#     try:
#         # Build optional partner filter
#         where_partner = ""
#         params_partner = []
#         if permitted_partners:
#             ph = ",".join(["%s"] * len(permitted_partners))
#             where_partner = f"WHERE partner_id IN ({ph})"
#             params_partner = list(permitted_partners)

#         # Get the latest modified record per budget, then sum the field
#         rows = frappe.db.sql(
#             f"""
#             SELECT cu.no_of_running_creches
#             FROM `tabCreche utilisation` cu
#             INNER JOIN (
#                 SELECT budget_reference_id, MAX(modified) AS max_m
#                 FROM `tabCreche utilisation`
#                 {where_partner}
#                 GROUP BY budget_reference_id
#             ) latest ON cu.budget_reference_id = latest.budget_reference_id
#                      AND cu.modified = latest.max_m
#             """,
#             params_partner,
#             as_dict=True,
#         )
#         return int(sum(int(r.no_of_running_creches or 0) for r in rows))
#     except Exception as e:
#         frappe.log_error(str(e), "get_running_creches_count")
#         return 0



# def _add_month(d):
#     if relativedelta:
#         return d + relativedelta(months=1)
#     y, m = d.year, d.month + 1
#     if m > 12: y += 1; m = 1
#     return _date(y, m, 1)

# @frappe.whitelist()
# def get_pending_utilisation_summary(cutoff_date=None, target_fy=None, target_month=None):
#     today = getdate(frappe.utils.nowdate())
#     if cutoff_date:
#         cutoff = getdate(cutoff_date)
#     else:
#         if today.day >= 5:
#             cutoff = today.replace(day=5)
#         else:
#             y, m = today.year, today.month - 1
#             if m < 1: y -= 1; m = 12
#             cutoff = _date(y, m, 5)

#     boundary_month_start = cutoff.replace(day=1)
#     permitted = _get_user_permitted_partners()
#     budget_filters = [
#         ["start_date", "is", "set"],
#         ["end_date", "is", "set"],
#         ["start_date", "<=", cutoff],
#     ]
#     if permitted is not None:
#         if not permitted:
#             return {"partners": [], "cutoff": str(cutoff)}
#         budget_filters.append(["partner_id", "in", permitted])

#     budgets = frappe.get_all(
#         "Creche Budget",
#         fields=["name","budget_reference_name","partner_id","partner_name",
#                 "grant_id","state","district","block","start_date","end_date"],
#         filters=budget_filters, ignore_permissions=True, limit_page_length=0,
#     )
#     if not budgets:
#         return {"partners": [], "cutoff": str(cutoff)}

#     budget_names = [b["name"] for b in budgets]
#     existing = set(
#         (r["budget_reference_id"], r["financial_year"], r["month"])
#         for r in frappe.get_all("Creche utilisation",
#             filters={"budget_reference_id": ["in", budget_names]},
#             fields=["budget_reference_id","financial_year","month"],
#             ignore_permissions=True, limit_page_length=0)
#     )

#     # When target_fy and target_month are given, only check that specific month
#     check_specific = bool(target_fy and target_month)

#     by_partner = {}
#     for b in budgets:
#         bud_start = getdate(b["start_date"])
#         bud_end   = getdate(b["end_date"])

#         missing_for_budget = []

#         if check_specific:
#             # Only check the one selected month
#             try:
#                 month_num = list(_calendar.month_name).index(target_month)  # 1-12
#             except ValueError:
#                 continue
#             fy_start_year = int(target_fy.split("-")[0])
#             year = fy_start_year if month_num >= 4 else fy_start_year + 1
#             month_start = _date(year, month_num, 1)

#             # Skip if this month is outside the budget period
#             if month_start < bud_start.replace(day=1) or month_start > bud_end.replace(day=1):
#                 continue
#             # Skip if submission already exists
#             if (b["name"], target_fy, target_month) in existing:
#                 continue

#             deadline = _add_month(month_start).replace(day=5)
#             days_overdue = (cutoff - deadline).days
#             missing_for_budget.append({
#                 "financial_year": target_fy, "month": target_month,
#                 "deadline": deadline.isoformat(),
#                 "days_overdue": max(days_overdue, 0),
#             })
#         else:
#             # Original logic: check all months from budget start to boundary
#             start = bud_start
#             end   = bud_end
#             effective_end = min(end.replace(day=1), boundary_month_start)
#             cursor = start.replace(day=1)
#             while cursor <= effective_end:
#                 month_name = MONTH_ORDER[cursor.month - 1]
#                 fy_label = (f"{cursor.year}-{str(cursor.year+1)[2:]}" if cursor.month >= 4
#                             else f"{cursor.year-1}-{str(cursor.year)[2:]}")
#                 if (b["name"], fy_label, month_name) not in existing:
#                     deadline = _add_month(cursor).replace(day=5)
#                     days_overdue = (cutoff - deadline).days
#                     missing_for_budget.append({
#                         "financial_year": fy_label, "month": month_name,
#                         "deadline": deadline.isoformat(),
#                         "days_overdue": max(days_overdue, 0),
#                     })
#                 cursor = _add_month(cursor)

#         if not missing_for_budget:
#             continue

#         pid = b["partner_id"] or b["partner_name"] or "Unknown"
#         if pid not in by_partner:
#             by_partner[pid] = {
#                 "partner_id": b["partner_id"], "partner_name": b["partner_name"],
#                 "missing_count": 0, "max_days_overdue": 0, "budgets": [],
#             }
#         entry = by_partner[pid]
#         entry["budgets"].append({
#             "budget_id": b["name"], "budget_reference_name": b["budget_reference_name"],
#             "grant_id": b["grant_id"], "state": b["state"],
#             "missing_months": missing_for_budget,
#         })
#         entry["missing_count"] += len(missing_for_budget)
#         entry["max_days_overdue"] = max(
#             entry["max_days_overdue"],
#             max((m["days_overdue"] for m in missing_for_budget), default=0),
#         )

#     partner_ids = [pid for pid in by_partner if pid]
#     email_map   = _get_partner_emails(partner_ids)
#     mobile_map  = _get_partner_mobiles(partner_ids)

#     result = []
#     for pid, entry in by_partner.items():
#         entry["email"]  = email_map.get(pid, "")
#         entry["mobile"] = mobile_map.get(pid, "")
#         result.append(entry)
#     result.sort(key=lambda r: (-r["max_days_overdue"], r["partner_name"] or ""))
#     return {"partners": result, "cutoff": str(cutoff)}

# @frappe.whitelist()
# def send_utilisation_reminder(partner_ids=None, custom_message=None):
#     if isinstance(partner_ids, str):
#         try: partner_ids = json.loads(partner_ids)
#         except Exception: partner_ids = [p.strip() for p in partner_ids.split(",") if p.strip()]
#     partner_ids = partner_ids or []
#     if not partner_ids: frappe.throw(frappe._("No partners selected"))

#     permitted = _get_user_permitted_partners()
#     if permitted is not None:
#         partner_ids = [p for p in partner_ids if p in permitted]
#         if not partner_ids: frappe.throw(frappe._("You do not have permission to email these partners"))

#     email_map = _get_partner_emails(partner_ids)
#     partner_names = {r.name: r.partner_name for r in frappe.get_all(
#         "Creche Partners", filters={"name": ["in", partner_ids]},
#         fields=["name","partner_name"], ignore_permissions=True)}

#     default_message = ("This is a reminder that your utilisation report submission is pending. "
#                        "Kindly submit it at the earliest to keep your budget records up to date.")
#     message_body = custom_message or default_message

#     sent, failed = [], []
#     for pid in partner_ids:
#         email = email_map.get(pid)
#         pname = partner_names.get(pid, pid)
#         if not email:
#             failed.append({"partner_id": pid, "partner_name": pname, "reason": "No email on file"})
#             continue
#         try:
#             frappe.sendmail(
#                 recipients=[email],
#                 subject="Utilisation Report Submission Reminder",
#                 message=f"<p>Dear {frappe.utils.escape_html(pname)},</p><p>{frappe.utils.escape_html(message_body)}</p>",
#                 now=True,
#             )
#             sent.append({"partner_id": pid, "partner_name": pname, "email": email})
#         except Exception as e:
#             failed.append({"partner_id": pid, "partner_name": pname, "reason": str(e)})

#     return {"sent": sent, "failed": failed}

# # ══════════════════════════════════════════════════════════════════════════
# # EXPORT
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def export_table(title="Report", columns=None, rows=None, format="xlsx"):
#     if isinstance(columns, str): columns = json.loads(columns)
#     if isinstance(rows, str):    rows    = json.loads(rows)
#     columns = columns or []; rows = rows or []

#     if format == "pdf":
#         file_url = _export_pdf(title, columns, rows)
#     else:
#         file_url = _export_xlsx(title, columns, rows)
#     return {"file_url": file_url}

# def _is_total_row(row, columns):
#     if not columns: return False
#     return str(row.get(columns[0].get("key"), "")).strip().lower() == "total"

# def _export_xlsx(title, columns, rows):
#     try:
#         from openpyxl import Workbook
#         from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
#         from openpyxl.utils import get_column_letter
#     except ImportError:
#         frappe.throw(frappe._("openpyxl is required for Excel export."))

#     wb = Workbook(); ws = wb.active; ws.title = (title or "Data")[:31]
#     NAVY="1E3A5F"; LIGHTBLUE="BFDBFE"; BORDER_C="93C5FD"; GRID_C="E2E8F0"; GROUP_FILL="DBEAFE"
#     thin_grid = Border(left=Side(style="thin",color=GRID_C),right=Side(style="thin",color=GRID_C),
#                        top=Side(style="thin",color=GRID_C),bottom=Side(style="thin",color=GRID_C))
#     thin_hdr  = Border(left=Side(style="thin",color=BORDER_C),right=Side(style="thin",color=BORDER_C),
#                        top=Side(style="thin",color=BORDER_C),bottom=Side(style="thin",color=BORDER_C))
#     header_font = Font(bold=True,color="FFFFFF",size=10)
#     header_fill = PatternFill(start_color=NAVY,end_color=NAVY,fill_type="solid")
#     total_font  = Font(bold=True,color=NAVY,size=11)
#     total_fill  = PatternFill(start_color=LIGHTBLUE,end_color=LIGHTBLUE,fill_type="solid")
#     group_font  = Font(bold=True,color=NAVY,size=10.5)
#     group_fill  = PatternFill(start_color=GROUP_FILL,end_color=GROUP_FILL,fill_type="solid")

#     for ci, col in enumerate(columns, start=1):
#         c = ws.cell(row=1,column=ci,value=col.get("label",""))
#         c.font=header_font; c.fill=header_fill; c.border=thin_hdr
#         c.alignment=Alignment(horizontal="center",vertical="center",wrap_text=True)

#     ncols = max(len(columns),1); r_idx = 2
#     for row in rows:
#         if row.get("__group__"):
#             ws.merge_cells(start_row=r_idx,start_column=1,end_row=r_idx,end_column=max(ncols-1,1))
#             lc = ws.cell(row=r_idx,column=1,value=row.get("label",""))
#             lc.font=group_font; lc.fill=group_fill; lc.border=thin_hdr
#             lc.alignment=Alignment(horizontal="left",vertical="center",indent=1)
#             sc = ws.cell(row=r_idx,column=ncols,value=row.get("subtotal",""))
#             sc.font=group_font; sc.fill=group_fill; sc.border=thin_hdr
#             sc.alignment=Alignment(horizontal="right",vertical="center")
#             r_idx += 1; continue

#         total_row = _is_total_row(row, columns)
#         for ci, col in enumerate(columns, start=1):
#             val = row.get(col.get("key"),"")
#             align = col.get("align","left")
#             cell = ws.cell(row=r_idx,column=ci)
#             if align=="right" and isinstance(val,(int,float)):
#                 cell.value=val; cell.number_format="#,##0.00"
#             else:
#                 cell.value=val
#             cell.alignment=Alignment(horizontal=align)
#             if total_row: cell.font=total_font; cell.fill=total_fill; cell.border=thin_hdr
#             else: cell.border=thin_grid
#         r_idx += 1

#     for ci, col in enumerate(columns, start=1):
#         letter = get_column_letter(ci)
#         max_len = len(str(col.get("label","")))
#         for row in rows:
#             if row.get("__group__"): continue
#             v = row.get(col.get("key"),"")
#             max_len = max(max_len, len(str(v)))
#         ws.column_dimensions[letter].width = min(max_len+4, 42)
#     ws.freeze_panes = "A2"

#     buf = io.BytesIO(); wb.save(buf); buf.seek(0)
#     return _save_file(f"{_safe_fname(title)}.xlsx", buf.getvalue())

# def _export_pdf(title, columns, rows):
#     thead = "".join(f"<th>{frappe.utils.escape_html(c.get('label',''))}</th>" for c in columns)
#     ncols = max(len(columns), 1); body_rows = []
#     for row in rows:
#         if row.get("__group__"):
#             label   = frappe.utils.escape_html(row.get("label",""))
#             subtotal= frappe.utils.escape_html(row.get("subtotal",""))
#             body_rows.append(f'<tr class="group-row"><td colspan="{ncols}">'
#                              f'<span class="group-row__label">{label}</span>'
#                              f'<span class="group-row__subtotal">{subtotal}</span></td></tr>')
#             continue
#         total_row = _is_total_row(row, columns)
#         tds = [f'<td style="text-align:{c.get("align","left")}">{frappe.utils.escape_html(str(row.get(c.get("key"),"" )))}</td>'
#                for c in columns]
#         body_rows.append(f'<tr{"  class=\"total-row\"" if total_row else ""}>{"".join(tds)}</tr>')

#     html = f"""<html><head><meta charset="utf-8">
#     <style>@page{{size:A4 portrait;margin:14mm 10mm}}*{{box-sizing:border-box;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif}}body{{color:#1f2937}}h1{{font-size:16px;font-weight:700;color:#1e3a5f;margin-bottom:4px}}.meta{{font-size:9px;color:#94a3b8;margin-bottom:12px}}table{{width:100%;border-collapse:collapse;font-size:10px}}th{{background:#1e3a5f;color:#fff;font-weight:700;text-transform:uppercase;font-size:8.5px;letter-spacing:.4px;padding:6px 8px;text-align:left;border:1px solid #93c5fd}}td{{padding:5px 8px;border:1px solid #e2e8f0}}tr.total-row td{{background:#bfdbfe;color:#1e3a5f;font-weight:700;border:1px solid #93c5fd}}tr.group-row td{{background:#dbeafe;color:#1e3a5f;font-weight:700;border:1px solid #93c5fd;padding:6px 8px}}.group-row__label{{display:inline-block}}.group-row__subtotal{{float:right}}tr:nth-child(even):not(.total-row):not(.group-row) td{{background:#f8fafc}}</style>
#     </head><body>
#     <h1>{frappe.utils.escape_html(title or "Report")}</h1>
#     <div class="meta">Exported {frappe.utils.now_datetime().strftime("%d %b %Y, %I:%M %p")} by {frappe.session.user}</div>
#     <table><thead><tr>{thead}</tr></thead><tbody>{"".join(body_rows)}</tbody></table>
#     </body></html>"""

#     from frappe.utils.pdf import get_pdf
#     pdf_content = get_pdf(html, options={"page-size":"A4","orientation":"Portrait"})
#     return _save_file(f"{_safe_fname(title)}.pdf", pdf_content)

# def _safe_fname(title):
#     import re
#     base = re.sub(r"[^A-Za-z0-9_-]+","_",title or "report").strip("_") or "report"
#     return base[:80]

# def _save_file(fname, content):
#     f = frappe.get_doc({"doctype":"File","file_name":fname,"is_private":0,"content":content})
#     f.save(ignore_permissions=True)
#     return f.file_url

























# """
# creche_reports/api/creche_dashboard.py

# All server-side methods for the Creche Dashboard page.
# """

# import frappe
# from frappe.utils import flt, getdate, nowdate, add_days, now_datetime, get_datetime, get_url
# from datetime import date as _date, datetime, timedelta as _timedelta
# import calendar as _calendar
# import json
# import io

# try:
#     from dateutil.relativedelta import relativedelta
# except ImportError:
#     relativedelta = None

# MONTH_ORDER = [
#     "January","February","March","April","May","June",
#     "July","August","September","October","November","December",
# ]

# # ══════════════════════════════════════════════════════════════════════════
# # DATE / PRORATA HELPERS
# # ══════════════════════════════════════════════════════════════════════════

# def _to_date(v):
#     if not v: return None
#     if isinstance(v, _date): return v
#     return _date.fromisoformat(str(v)[:10])

# def _add_months_safe(d, n):
#     """Add n calendar months to date d, clamping day to month-end."""
#     if relativedelta:
#         return d + relativedelta(months=n)
#     m = d.month - 1 + n
#     year  = d.year + m // 12
#     month = m % 12 + 1
#     day   = min(d.day, _calendar.monthrange(year, month)[1])
#     return _date(year, month, day)

# def _count_calendar_months(start, end):
#     """Count distinct calendar months from start to end inclusive."""
#     if not start or not end or start > end:
#         return 0
#     count = 0
#     y, m = start.year, start.month
#     ey, em = end.year, end.month
#     while (y, m) <= (ey, em):
#         count += 1
#         m += 1
#         if m > 12:
#             m, y = 1, y + 1
#     return count

# def _prorata_by_budget_year(year_1, year_2, year_3, bud_start, bud_end, filter_segments):
#     """
#     Calculate prorated budget using budget-year periods (NOT financial-year periods).

#     Y1 = first 12 months from budget start date
#     Y2 = months 13-24 from budget start date
#     Y3 = months 25-36 from budget start date

#     For each year period that overlaps a filter segment:
#         contribution = year_amount / 12 * months_in_overlap

#     Returns dict with keys: total, year_1, year_2, year_3
#     """
#     empty = {"total": 0.0, "year_1": 0.0, "year_2": 0.0, "year_3": 0.0}
#     bud_s = _to_date(bud_start)
#     bud_e = _to_date(bud_end)
#     if not bud_s or not bud_e:
#         return empty

#     year_amounts = [float(year_1 or 0), float(year_2 or 0), float(year_3 or 0)]
#     scaled = [0.0, 0.0, 0.0]

#     for i, yr_amt in enumerate(year_amounts):
#         if not yr_amt:
#             continue
#         yr_s = _add_months_safe(bud_s, i * 12)
#         yr_e = _add_months_safe(bud_s, (i + 1) * 12) - _timedelta(days=1)
#         yr_e = min(yr_e, bud_e)
#         if yr_s > bud_e:
#             break  # all remaining years are also beyond budget end

#         for seg_s, seg_e in filter_segments:
#             ov_s = max(seg_s, yr_s)
#             ov_e = min(seg_e, yr_e)
#             if ov_s > ov_e:
#                 continue
#             months = _count_calendar_months(ov_s, ov_e)
#             if months > 0:
#                 scaled[i] += yr_amt / 12.0 * months

#     return {
#         "total":  round(scaled[0] + scaled[1] + scaled[2], 2),
#         "year_1": round(scaled[0], 2),
#         "year_2": round(scaled[1], 2),
#         "year_3": round(scaled[2], 2),
#     }

# def _compute_prorata_budget(budget_name, bud_start, bud_end, filter_segments):
#     """
#     Compute prorated total budget for a Creche Budget document.
#     Uses budget-year-based proration (not financial-year-based).
#     """
#     if not filter_segments:
#         return None

#     rows = frappe.db.sql(
#         """SELECT SUM(COALESCE(year_1,0)) AS year_1,
#                   SUM(COALESCE(year_2,0)) AS year_2,
#                   SUM(COALESCE(year_3,0)) AS year_3
#            FROM `tabBudget Items`
#            WHERE parent = %s AND parenttype = 'Creche Budget'""",
#         (budget_name,), as_dict=True,
#     )
#     if not rows or not rows[0]:
#         return 0.0

#     raw = rows[0]
#     result = _prorata_by_budget_year(
#         raw.get("year_1") or 0,
#         raw.get("year_2") or 0,
#         raw.get("year_3") or 0,
#         bud_start, bud_end, filter_segments,
#     )
#     return result["total"]

# def _build_filter_segments(filters):
#     raw_start = _to_date(filters.get("start_date"))
#     raw_end   = _to_date(filters.get("end_date"))

#     filter_fys = filters.get("financial_year") or []
#     if isinstance(filter_fys, str): filter_fys = [filter_fys]
#     filter_fys = list(filter_fys)

#     month_raw = filters.get("month") or []
#     if isinstance(month_raw, str): month_raw = [month_raw] if month_raw.strip() else []
#     month_filters = [m.strip() for m in month_raw if str(m).strip()]

#     if raw_start or raw_end:
#         from datetime import timedelta
#         seg_s = raw_start or (raw_end - timedelta(days=3*366))
#         seg_e = raw_end   or (raw_start + timedelta(days=3*366))
#         return [(seg_s, seg_e)]

#     if filter_fys and month_filters:
#         segs = []
#         for fy in filter_fys:
#             fy_start_year = int(fy.split("-")[0])
#             for mn in month_filters:
#                 month_num = list(_calendar.month_name).index(mn)
#                 year      = fy_start_year if month_num >= 4 else fy_start_year + 1
#                 last_day  = _calendar.monthrange(year, month_num)[1]
#                 segs.append((_date(year, month_num, 1), _date(year, month_num, last_day)))
#         return segs

#     if filter_fys:
#         segs = []
#         for fy in filter_fys:
#             y = int(fy.split("-")[0])
#             segs.append((_date(y, 4, 1), _date(y + 1, 3, 31)))
#         return segs

#     return []

# # ══════════════════════════════════════════════════════════════════════════
# # PERMISSION HELPERS
# # ══════════════════════════════════════════════════════════════════════════

# def _get_user_permitted_partners():
#     user  = frappe.session.user
#     roles = frappe.get_roles(user)
#     if "System Manager" in roles or user == "Administrator":
#         return None
#     rows = frappe.db.sql(
#         "SELECT for_value FROM `tabUser Permission` WHERE user = %s AND allow = 'Creche Partners'",
#         (user,), as_dict=True,
#     )
#     if not rows: return None
#     return [r.for_value for r in rows if r.for_value]

# def _intersect(filter_list, permitted):
#     if permitted is None: return filter_list
#     if not permitted: return []
#     if not filter_list: return permitted
#     pset = set(permitted)
#     return [p for p in filter_list if p in pset]

# def _empty_summary():
#     return {
#         "total_budget":0,"total_disbursement":0,
#         "total_utilisation":0,"total_bank_balance":0,
#         "total_interest":0,"total_creches":0,
#         "utilisation_pct":0,"disbursement_pct":0,
#     }

# def _assert_partner_access(partner_id: str):
#     permitted = _get_user_permitted_partners()
#     if permitted is None: return
#     if partner_id not in permitted:
#         frappe.throw(frappe._("You do not have permission to access this partner"), frappe.PermissionError)

# # ══════════════════════════════════════════════════════════════════════════
# # PARTNER OPTIONS
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_partner_options(txt=""):
#     permitted = _get_user_permitted_partners()
#     filters   = {}
#     if permitted is not None:
#         if not permitted: return []
#         filters["name"] = ["in", permitted]
#     if txt:
#         filters["partner_name"] = ["like", f"%{txt}%"]
#     rows = frappe.get_all("Creche Partners", filters=filters, fields=["name","partner_name"],
#                           order_by="partner_name asc", limit=500, ignore_permissions=True)
#     return [{"name": r.name, "partner_name": r.partner_name or r.name} for r in rows]

# @frappe.whitelist()
# def get_user_permission_scope():
#     permitted = _get_user_permitted_partners()
#     if permitted is None: return {"restricted": False, "partner_ids": []}
#     return {"restricted": True, "partner_ids": permitted}

# # ══════════════════════════════════════════════════════════════════════════
# # MAIN SUMMARY
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_partner_budget_summary(filters=None):
#     if isinstance(filters, str):
#         filters = json.loads(filters)
#     filters = filters or {}

#     permitted          = _get_user_permitted_partners()
#     filter_partners    = filters.get("partner_id") or None
#     effective_partners = _intersect(filter_partners, permitted)

#     if effective_partners is not None and len(effective_partners) == 0:
#         return {"summary": _empty_summary(), "partners": []}

#     start_date = filters.get("start_date") or None
#     end_date   = filters.get("end_date")   or None

#     filter_segments = _build_filter_segments(filters)
#     apply_prorata   = bool(filter_segments)

#     budget_filters = {}
#     if effective_partners:
#         budget_filters["partner_id"] = ["in", effective_partners]
#     if filters.get("budget_ref"):
#         budget_filters["budget_reference_name"] = ["in", filters["budget_ref"]]
#     if filters.get("grant_id"):
#         budget_filters["grant_id"] = ["in", filters["grant_id"]]
#     if filters.get("state"):
#         budget_filters["state"] = ["in", filters["state"]]
#     if filters.get("district"):
#         budget_filters["district"] = ["in", filters["district"]]
#     if filters.get("block"):
#         budget_filters["block"] = ["in", filters["block"]]
#     if start_date:
#         budget_filters["end_date"]   = [">=", start_date]
#     if end_date:
#         budget_filters["start_date"] = ["<=", end_date]

#     budgets = frappe.get_all(
#         "Creche Budget", filters=budget_filters,
#         fields=["name","partner_id","partner_name","grant_id","budget_reference_name",
#                 "state","district","block","start_date","end_date","financial_year",
#                 "no_of_creches","total_budget"],
#         order_by="partner_name asc, budget_reference_name asc",
#         ignore_permissions=True,
#     )

#     budget_ids = [b.name for b in budgets]

#     # ── Budget Items sums (bulk) ──────────────────────────────────────────
#     budget_items_map = {}
#     if budget_ids:
#         ph_bi = ", ".join([f"%(bim{i})s" for i in range(len(budget_ids))])
#         bim_params = {f"bim{i}": n for i, n in enumerate(budget_ids)}
#         bi_rows = frappe.db.sql(
#             "SELECT parent,"
#             " SUM(COALESCE(year_1,0)) AS year_1,"
#             " SUM(COALESCE(year_2,0)) AS year_2,"
#             " SUM(COALESCE(year_3,0)) AS year_3"
#             " FROM `tabBudget Items`"
#             f" WHERE parent IN ({ph_bi}) AND parenttype = 'Creche Budget'"
#             " GROUP BY parent",
#             bim_params, as_dict=True,
#         )
#         for r in bi_rows:
#             budget_items_map[r.parent] = {
#                 "year_1": float(r.year_1 or 0),
#                 "year_2": float(r.year_2 or 0),
#                 "year_3": float(r.year_3 or 0),
#                 "total":  float(r.year_1 or 0) + float(r.year_2 or 0) + float(r.year_3 or 0),
#             }

#     # ── Disbursement (date-based) ─────────────────────────────────────────
#     disbursement_map = {}
#     if budget_ids:
#         disb_headers = frappe.get_all("Creche Disbursement",
#             filters={"budget_reference_id": ["in", budget_ids]},
#             fields=["name","budget_reference_id"], ignore_permissions=True)
#         disb_parent_names = [d.name for d in disb_headers]
#         disb_bid_map = {d.name: d.budget_reference_id for d in disb_headers}

#         if disb_parent_names:
#             tracker_rows = frappe.get_all("Disbursement Tracker",
#                 filters={"parent": ["in", disb_parent_names], "parenttype": "Creche Disbursement"},
#                 fields=["parent","date_of_disbursement","disbursed_amount"],
#                 ignore_permissions=True)

#             if filter_segments:
#                 tracker_rows = [
#                     t for t in tracker_rows
#                     if t.date_of_disbursement and any(
#                         seg_s <= getdate(str(t.date_of_disbursement)) <= seg_e
#                         for seg_s, seg_e in filter_segments
#                     )
#                 ]
#             elif start_date or end_date:
#                 tracker_rows = [
#                     t for t in tracker_rows
#                     if t.date_of_disbursement
#                     and (not start_date or getdate(str(t.date_of_disbursement)) >= getdate(start_date))
#                     and (not end_date   or getdate(str(t.date_of_disbursement)) <= getdate(end_date))
#                 ]

#             for t in tracker_rows:
#                 bid = disb_bid_map.get(t.parent)
#                 if bid:
#                     disbursement_map[bid] = disbursement_map.get(bid, 0.0) + flt(t.disbursed_amount)

#     # ── Utilisation ───────────────────────────────────────────────────────
#     utilisation_map  = {}
#     bank_balance_map = {}
#     interest_map     = {}

#     if budget_ids:
#         filter_fys = filters.get("financial_year") or []
#         if isinstance(filter_fys, str): filter_fys = [filter_fys]
#         month_raw = filters.get("month") or []
#         if isinstance(month_raw, str): month_raw = [month_raw] if month_raw.strip() else []
#         month_filters = [m.strip() for m in month_raw if str(m).strip()]

#         util_extra  = ""
#         util_params = {}

#         if start_date and end_date:
#             def _local_fy_month_pairs(sd, ed):
#                 sd = _to_date(sd); ed = _to_date(ed)
#                 if not sd or not ed: return []
#                 pairs = []; cur = _date(sd.year, sd.month, 1)
#                 end_mo = _date(ed.year, ed.month, 1)
#                 while cur <= end_mo:
#                     fy = (f"{cur.year}-{str(cur.year+1)[2:]}" if cur.month >= 4
#                           else f"{cur.year-1}-{str(cur.year)[2:]}")
#                     pairs.append((fy, _calendar.month_name[cur.month]))
#                     cur = (_date(cur.year+1,1,1) if cur.month==12
#                            else _date(cur.year, cur.month+1, 1))
#                 return pairs
#             pairs = _local_fy_month_pairs(start_date, end_date)
#             if pairs:
#                 clauses = []
#                 for i, (fy, mn) in enumerate(pairs):
#                     util_params[f"ufy{i}"] = fy; util_params[f"umn{i}"] = mn
#                     clauses.append(f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)")
#                 util_extra = " AND (" + " OR ".join(clauses) + ")"
#             else:
#                 util_extra = " AND 1=0"
#         elif filter_fys and month_filters:
#             clauses = []; k = 0
#             for fy in sorted(filter_fys):
#                 for mn in month_filters:
#                     util_params[f"ufy{k}"] = fy; util_params[f"umn{k}"] = mn
#                     clauses.append(f"(cu.financial_year = %(ufy{k})s AND cu.month = %(umn{k})s)")
#                     k += 1
#             util_extra = " AND (" + " OR ".join(clauses) + ")"
#         elif filter_fys:
#             ph = ", ".join([f"%(ufy{i})s" for i in range(len(filter_fys))])
#             for i, fy in enumerate(filter_fys): util_params[f"ufy{i}"] = fy
#             util_extra = f" AND cu.financial_year IN ({ph})"
#         elif month_filters:
#             ph = ", ".join([f"%(umn{i})s" for i in range(len(month_filters))])
#             for i, m in enumerate(month_filters): util_params[f"umn{i}"] = m
#             util_extra = f" AND cu.month IN ({ph})"
#         elif start_date:
#             from datetime import date as _dt_today
#             today = _dt_today.today()
#             def _lp(sd, ed):
#                 sd = _to_date(sd); ed = _to_date(ed)
#                 if not sd or not ed: return []
#                 pairs = []; cur = _date(sd.year, sd.month, 1)
#                 end_mo = _date(ed.year, ed.month, 1)
#                 while cur <= end_mo:
#                     fy = (f"{cur.year}-{str(cur.year+1)[2:]}" if cur.month >= 4
#                           else f"{cur.year-1}-{str(cur.year)[2:]}")
#                     pairs.append((fy, _calendar.month_name[cur.month]))
#                     cur = (_date(cur.year+1,1,1) if cur.month==12
#                            else _date(cur.year, cur.month+1, 1))
#                 return pairs
#             pairs = _lp(start_date, today)
#             if pairs:
#                 clauses = []
#                 for i, (fy, mn) in enumerate(pairs):
#                     util_params[f"ufy{i}"] = fy; util_params[f"umn{i}"] = mn
#                     clauses.append(f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)")
#                 util_extra = " AND (" + " OR ".join(clauses) + ")"

#         bid_ph = ", ".join([f"%(bid{i})s" for i in range(len(budget_ids))])
#         for i, n in enumerate(budget_ids): util_params[f"bid{i}"] = n

#         util_rows = frappe.db.sql(
#             f"""SELECT cu.budget_reference_id, SUM(ui.total_amount) AS total_util
#                 FROM `tabCreche utilisation` cu
#                 INNER JOIN `tabUtilisation Items` ui ON ui.parent = cu.name AND ui.parenttype = 'Creche utilisation'
#                 WHERE cu.budget_reference_id IN ({bid_ph}) {util_extra}
#                 GROUP BY cu.budget_reference_id""",
#             util_params, as_dict=True,
#         )
#         for r in util_rows:
#             utilisation_map[r.budget_reference_id] = flt(r.total_util)

#         interest_rows = frappe.db.sql(
#             f"""SELECT budget_reference_id, SUM(interest_from_bank) AS total_interest
#                 FROM `tabCreche utilisation`
#                 WHERE budget_reference_id IN ({bid_ph}) {util_extra.replace("cu.", "")}
#                 GROUP BY budget_reference_id""",
#             util_params, as_dict=True,
#         )
#         for r in interest_rows:
#             interest_map[r.budget_reference_id] = flt(r.total_interest)

#         # Bank balance: from the MOST RECENTLY MODIFIED utilisation record per budget
#         # (within the active filter period if one is set; otherwise globally latest)
#         try:
#             bank_balance_map = {}
#             bb_rows = frappe.db.sql(
#                 f"""
#                 SELECT cu.budget_reference_id, cu.balance_amount
#                 FROM `tabCreche utilisation` cu
#                 INNER JOIN (
#                     SELECT budget_reference_id, MAX(modified) AS max_m
#                     FROM `tabCreche utilisation`
#                     WHERE budget_reference_id IN ({bid_ph})
#                     {util_extra.replace("cu.", "") if util_extra else ""}
#                     GROUP BY budget_reference_id
#                 ) latest ON cu.budget_reference_id = latest.budget_reference_id
#                          AND cu.modified = latest.max_m
#                 """,
#                 util_params, as_dict=True,
#             )
#             for r in bb_rows:
#                 bank_balance_map[r.budget_reference_id] = flt(r.balance_amount)
#         except Exception as e:
#             frappe.log_error(str(e), "bank_balance_map_error")
#             bank_balance_map = {}

#     # ── Running creches per budget (from latest modified utilization) ──────
#     running_creches_map = {}
#     if budget_ids:
#         try:
#             rc_ph = ", ".join(["%s"] * len(budget_ids))
#             rc_rows = frappe.db.sql(
#                 f"""
#                 SELECT cu.budget_reference_id, COALESCE(cu.no_of_running_creches, 0) AS rc
#                 FROM `tabCreche utilisation` cu
#                 INNER JOIN (
#                     SELECT budget_reference_id, MAX(modified) AS max_m
#                     FROM `tabCreche utilisation`
#                     WHERE budget_reference_id IN ({rc_ph})
#                     GROUP BY budget_reference_id
#                 ) latest ON cu.budget_reference_id = latest.budget_reference_id
#                          AND cu.modified = latest.max_m
#                 """,
#                 budget_ids, as_dict=True,
#             )
#             for r in rc_rows:
#                 running_creches_map[r.budget_reference_id] = int(r.rc or 0)
#         except Exception:
#             pass

#     # ── Assemble results ──────────────────────────────────────────────────

#     partners = {}
#     grand = dict(budget=0.0, disbursement=0.0, utilisation=0.0, bank_balance=0.0, interest=0.0, creches=0)

#     for budget in budgets:
#         bid = budget.name
#         bi  = budget_items_map.get(bid, {"year_1":0,"year_2":0,"year_3":0,"total":flt(budget.total_budget)})

#         if apply_prorata:
#             pr = _prorata_by_budget_year(
#                 bi["year_1"], bi["year_2"], bi["year_3"],
#                 budget.start_date, budget.end_date, filter_segments,
#             )
#             budget_amount = pr["total"]
#         else:
#             budget_amount = bi["total"] if bi["total"] else flt(budget.total_budget)

#         disbursement = flt(disbursement_map.get(bid, 0))
#         utilisation  = flt(utilisation_map.get(bid, 0))
#         bank_balance = flt(bank_balance_map.get(bid, 0))
#         interest     = flt(interest_map.get(bid, 0))
#         creches      = int(budget.no_of_creches or 0)

#         balance_budget            = budget_amount - utilisation
#         utilised_pct              = round((utilisation / budget_amount * 100) if budget_amount else 0, 2)
#         utilised_disbursement_pct = round((utilisation / disbursement * 100)  if disbursement  else 0, 2)

#         partner_key = budget.partner_id or budget.partner_name or "Unknown"
#         if partner_key not in partners:
#             partners[partner_key] = {
#                 "partner_id": budget.partner_id, "partner_name": budget.partner_name,
#                 "total_budget":0.0,"total_disbursement":0.0,"total_utilisation":0.0,
#                 "total_balance_budget":0.0,"total_bank_balance":0.0,
#                 "total_interest":0.0,"total_creches":0,"total_running_creches":0,"budgets":[],
#             }
#         p = partners[partner_key]
#         p["total_budget"]         += budget_amount
#         p["total_disbursement"]   += disbursement
#         p["total_utilisation"]    += utilisation
#         p["total_balance_budget"] += balance_budget
#         # SUM bank balances per partner (consistent with grand total which also sums)
#         p["total_bank_balance"] += bank_balance
#         budget_running = running_creches_map.get(bid, 0)
#         p["total_interest"]       += interest
#         p["total_creches"]        += creches
#         p.setdefault("total_running_creches", 0)
#         p["total_running_creches"] += budget_running
#         p["budgets"].append({
#             "budget_id": bid, "grant_id": budget.grant_id,
#             "budget_reference_name": budget.budget_reference_name,
#             "state": budget.state, "district": budget.district, "block": budget.block,
#             "grant_start": budget.start_date, "grant_end": budget.end_date,
#             "financial_year": budget.financial_year, "no_of_creches": creches,
#             "budget": budget_amount, "disbursement": disbursement,
#             "utilisation": utilisation, "utilised_pct": utilised_pct,
#             "utilised_disbursement_pct": utilised_disbursement_pct,
#             "balance_budget_amount": balance_budget,
#             "bank_balance": bank_balance, "interest_from_bank": interest,
#             "running_creches": budget_running,
#         })

#         grand["budget"]       += budget_amount
#         grand["disbursement"] += disbursement
#         grand["utilisation"]  += utilisation
#         grand["bank_balance"] += bank_balance
#         grand["interest"]     += interest
#         grand["creches"]      += creches

#     result = []
#     for p in partners.values():
#         p["utilised_pct"] = round((p["total_utilisation"] / p["total_budget"] * 100) if p["total_budget"] else 0, 2)
#         p["grant_ids"]    = ", ".join(sorted(set(b["grant_id"] for b in p["budgets"] if b["grant_id"])))
#         p["budgets"]      = sorted(p["budgets"], key=lambda x: x["budget_reference_name"] or "")
#         result.append(p)
#     result.sort(key=lambda x: x["partner_name"] or "")

#     gb = grand["budget"]
#     # Get running creches from most recent utilisation records
#     running_creches = _get_running_creches_count(
#         effective_partners if effective_partners else None
#     )
#     return {
#         "summary": {
#             "total_budget":       grand["budget"],
#             "total_disbursement": grand["disbursement"],
#             "total_utilisation":  grand["utilisation"],
#             "total_bank_balance": grand["bank_balance"],
#             "total_interest":     grand["interest"],
#             "total_creches":      grand["creches"],
#             "running_creches":    running_creches,
#             "utilisation_pct":    round((grand["utilisation"]  / gb * 100) if gb else 0, 2),
#             "disbursement_pct":   round((grand["disbursement"] / gb * 100) if gb else 0, 2),
#         },
#         "partners": result,
#     }

# # ══════════════════════════════════════════════════════════════════════════
# # DISBURSEMENT PANEL DATA
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_disbursement_panel_data(budget_ids=None, partner_ids=None, start_date=None, end_date=None,
#                                 financial_year=None, month=None):
#     permitted = _get_user_permitted_partners()
#     def _to_list(v):
#         if not v: return []
#         if isinstance(v, str):
#             try:
#                 p = json.loads(v)
#                 if isinstance(p, list): return [x for x in p if x]
#             except: pass
#             return [x.strip() for x in v.split(",") if x.strip()]
#         return [x for x in v if x]

#     budget_ids_list  = _to_list(budget_ids)
#     partner_ids_list = _to_list(partner_ids)
#     filter_fys       = _to_list(financial_year)
#     month_filters    = [m.strip() for m in _to_list(month) if str(m).strip()]

#     disb_filters = {}
#     if budget_ids_list:
#         if permitted is not None:
#             br = frappe.get_all("Creche Budget",
#                 filters={"name":["in",budget_ids_list]},
#                 fields=["name","partner_id"], ignore_permissions=True)
#             budget_ids_list = [r.name for r in br if r.partner_id in permitted]
#             if not budget_ids_list: return []
#         disb_filters["budget_reference_id"] = ["in", budget_ids_list]
#     elif partner_ids_list:
#         eff = _intersect(partner_ids_list, permitted)
#         if eff is not None and not eff: return []
#         if eff: disb_filters["partner_id"] = ["in", eff]
#         elif permitted is not None: return []
#     else:
#         if permitted is not None:
#             if not permitted: return []
#             disb_filters["partner_id"] = ["in", permitted]

#     disb_docs = frappe.get_all("Creche Disbursement", filters=disb_filters,
#         fields=["name","budget_reference_id","budget_reference_name","partner_id","partner_name",
#                 "grant_id","state","district","block","financial_year",
#                 "total_disbursement","balence_budget","total_budget"],
#         order_by="partner_name asc, budget_reference_name asc", ignore_permissions=True)
#     if not disb_docs: return []

#     parent_names = [d.name for d in disb_docs]
#     tracker_rows = frappe.get_all("Disbursement Tracker",
#         filters={"parent":["in",parent_names],"parenttype":"Creche Disbursement"},
#         fields=["parent","date_of_disbursement","disbursed_amount"],
#         order_by="date_of_disbursement asc", ignore_permissions=True)

#     filter_segments = _build_filter_segments({
#         "start_date": start_date, "end_date": end_date,
#         "financial_year": filter_fys, "month": month_filters,
#     })
#     period_active = bool(filter_segments) or bool(start_date) or bool(end_date)

#     if filter_segments:
#         tracker_rows = [
#             t for t in tracker_rows
#             if t.date_of_disbursement and any(
#                 seg_s <= getdate(str(t.date_of_disbursement)) <= seg_e
#                 for seg_s, seg_e in filter_segments
#             )
#         ]
#     elif start_date or end_date:
#         tracker_rows = [t for t in tracker_rows
#             if t.date_of_disbursement
#             and (not start_date or getdate(str(t.date_of_disbursement)) >= getdate(start_date))
#             and (not end_date   or getdate(str(t.date_of_disbursement)) <= getdate(end_date))]

#     tracker_map = {}
#     for t in tracker_rows:
#         tracker_map.setdefault(t.parent, []).append({
#             "date_of_disbursement": str(t.date_of_disbursement) if t.date_of_disbursement else "",
#             "disbursed_amount": flt(t.disbursed_amount),
#         })

#     result = []
#     for doc in disb_docs:
#         ft = tracker_map.get(doc.name, [])
#         ftotal = sum(flt(t["disbursed_amount"]) for t in ft) if period_active else flt(doc.total_disbursement)
#         result.append({
#             "name": doc.name, "budget_reference_id": doc.budget_reference_id or "",
#             "budget_reference_name": doc.budget_reference_name or "",
#             "partner_id": doc.partner_id or "", "partner_name": doc.partner_name or "",
#             "grant_id": doc.grant_id or "", "state": doc.state or "",
#             "district": doc.district or "", "block": doc.block or "",
#             "financial_year": doc.financial_year or "",
#             "total_budget": flt(doc.total_budget), "total_disbursement": ftotal,
#             "balence_budget": flt(doc.total_budget) - ftotal,
#             "tracker": ft,
#         })
#     if period_active:
#         result = [r for r in result if r["tracker"]]
#     return result

# # ══════════════════════════════════════════════════════════════════════════
# # BUDGET LINE ITEMS — UPDATED: uses _prorata_by_budget_year
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_budget_line_items(budget_id: str, start_date=None, end_date=None,
#                           financial_year=None, month=None):
#     if not budget_id: return []
#     partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
#     _assert_partner_access(partner_id)

#     def _pl(v):
#         if not v: return []
#         if isinstance(v, list): return [x for x in v if x]
#         try:
#             p = json.loads(v)
#             if isinstance(p, list): return [x for x in p if x]
#         except: pass
#         return [x.strip() for x in str(v).split(",") if x.strip()]

#     filter_fys    = _pl(financial_year)
#     month_filters = [m.strip() for m in _pl(month) if str(m).strip()]

#     rows = frappe.get_all("Budget Items",
#         filters={"parent": budget_id, "parenttype": "Creche Budget"},
#         fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
#                 "budget_sub_head","year_1","year_2","year_3","total_amount","notes"],
#         order_by="budget_main_head asc, type_of_expenses asc", ignore_permissions=True)

#     filter_segments = _build_filter_segments({
#         "start_date": start_date, "end_date": end_date,
#         "financial_year": filter_fys, "month": month_filters,
#     })
#     bud_start, bud_end = frappe.db.get_value(
#         "Creche Budget", budget_id, ["start_date", "end_date"])

#     result = []
#     for r in rows:
#         if filter_segments and bud_start and bud_end:
#             # Use budget-year-based prorata (not FY-based)
#             pr = _prorata_by_budget_year(
#                 r.year_1, r.year_2, r.year_3,
#                 bud_start, bud_end, filter_segments,
#             )
#             display_total = pr["total"]
#             y1 = pr["year_1"]
#             y2 = pr["year_2"]
#             y3 = pr["year_3"]
#         else:
#             display_total = flt(r.total_amount)
#             y1, y2, y3 = flt(r.year_1), flt(r.year_2), flt(r.year_3)

#         result.append({
#             "type_of_expenses_id": r.type_of_expenses_id,
#             "type_of_expenses": r.type_of_expenses, "budget_main_head": r.budget_main_head,
#             "budget_sub_head": r.budget_sub_head, "year_1": y1, "year_2": y2, "year_3": y3,
#             "total_amount": display_total, "notes": r.notes or "",
#         })
#     return result

# # ══════════════════════════════════════════════════════════════════════════
# # UTILISATION LINE ITEMS
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_utilisation_line_items(budget_id: str, start_date=None, end_date=None,
#                                financial_year=None, month=None):
#     if not budget_id: return {"months": [], "records": []}
#     partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
#     _assert_partner_access(partner_id)

#     def _parse_list(v):
#         if not v: return []
#         if isinstance(v, list): return [x for x in v if x]
#         try:
#             p = json.loads(v)
#             if isinstance(p, list): return [x for x in p if x]
#         except: pass
#         return [x.strip() for x in str(v).split(",") if x.strip()]

#     fy_list    = _parse_list(financial_year)
#     month_list = _parse_list(month)

#     util_filters = {"budget_reference_id": budget_id}
#     if fy_list:    util_filters["financial_year"] = ["in", fy_list]
#     if month_list: util_filters["month"]          = ["in", month_list]

#     util_docs = frappe.get_all("Creche utilisation", filters=util_filters,
#         fields=["name","month","financial_year","creation"],
#         order_by="financial_year asc, month asc", ignore_permissions=True)

#     if (start_date or end_date) and util_docs:
#         util_docs = [d for d in util_docs if d.creation
#             and (not start_date or getdate(str(d.creation)[:10]) >= getdate(start_date))
#             and (not end_date   or getdate(str(d.creation)[:10]) <= getdate(end_date))]

#     if not util_docs: return {"months": [], "records": []}

#     records = []; seen = []
#     for doc in util_docs:
#         items = frappe.get_all("Utilisation Items",
#             filters={"parent": doc.name, "parenttype": "Creche utilisation"},
#             fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
#                     "budget_sub_head","total_amount","notes"],
#             order_by="budget_main_head asc, type_of_expenses asc", ignore_permissions=True)
#         ml = doc.month or "Unknown"
#         records.append({"month": ml, "financial_year": doc.financial_year or "",
#                         "utilisation_id": doc.name,
#                         "items": [{"type_of_expenses_id": r.type_of_expenses_id,
#                                    "type_of_expenses": r.type_of_expenses,
#                                    "budget_main_head": r.budget_main_head,
#                                    "budget_sub_head": r.budget_sub_head,
#                                    "total_amount": flt(r.total_amount), "notes": r.notes or ""}
#                                   for r in items]})
#         if ml not in seen: seen.append(ml)

#     def msort(m):
#         try: return MONTH_ORDER.index(m)
#         except: return 99
#     seen.sort(key=msort)
#     records.sort(key=lambda r: (r["financial_year"], msort(r["month"])))
#     return {"months": seen, "records": records}

# # ══════════════════════════════════════════════════════════════════════════
# # PENDING UTILIZATION
# # ══════════════════════════════════════════════════════════════════════════

# def _get_partner_emails(partner_ids):
#     email_map = {}
#     if not partner_ids: return email_map
#     perm_rows = frappe.db.sql(
#         """SELECT up.for_value AS partner_id, u.email
#            FROM `tabUser Permission` up
#            INNER JOIN `tabUser` u ON u.name = up.user AND u.enabled = 1
#            WHERE up.allow = 'Creche Partners' AND up.for_value IN %(pids)s
#            ORDER BY u.name""",
#         {"pids": partner_ids}, as_dict=True,
#     )
#     for row in perm_rows:
#         if row.partner_id not in email_map and row.email:
#             email_map[row.partner_id] = row.email

#     missing = [p for p in partner_ids if p not in email_map]
#     if missing:
#         for field in ("email", "email_id", "contact_email"):
#             try:
#                 rows = frappe.get_all("Creche Partners", filters={"name": ["in", missing]},
#                                       fields=["name", field], ignore_permissions=True)
#                 for r in rows:
#                     v = r.get(field, "")
#                     if v and r.name not in email_map:
#                         email_map[r.name] = v
#             except Exception:
#                 continue
#     return email_map

# def _get_partner_mobiles(partner_ids):
#     """
#     Return {partner_id: mobile_no} for given partner IDs.
#     Priority: User.mobile_no (via User Permission) → Creche Partners direct field.
#     """
#     mobile_map = {}
#     if not partner_ids:
#         return mobile_map

#     # Strategy 1: Get mobile_no from User doctype via User Permission link
#     try:
#         perm_rows = frappe.db.sql(
#             """
#             SELECT up.for_value AS partner_id, u.mobile_no
#             FROM `tabUser Permission` up
#             INNER JOIN `tabUser` u ON u.name = up.user AND u.enabled = 1
#             WHERE up.allow = 'Creche Partners'
#               AND up.for_value IN %(pids)s
#             ORDER BY u.name
#             """,
#             {"pids": partner_ids},
#             as_dict=True,
#         )
#         for row in perm_rows:
#             if row.partner_id not in mobile_map and row.mobile_no:
#                 mobile_map[row.partner_id] = str(row.mobile_no)
#     except Exception:
#         pass

#     # Strategy 2: fallback to direct field on Creche Partners doctype
#     missing = [p for p in partner_ids if p not in mobile_map]
#     if missing:
#         for field in ("mobile_no", "mobile", "phone", "contact_mobile"):
#             try:
#                 rows = frappe.get_all(
#                     "Creche Partners",
#                     filters={"name": ["in", missing]},
#                     fields=["name", field],
#                     ignore_permissions=True,
#                 )
#                 for r in rows:
#                     v = r.get(field, "")
#                     if v and r.name not in mobile_map:
#                         mobile_map[r.name] = str(v)
#             except Exception:
#                 continue

#     return mobile_map


# def _get_running_creches_count(permitted_partners=None):
#     """
#     Sum no_of_running_creches from the MOST RECENTLY MODIFIED utilization
#     record per budget. Uses `modified` (last updated) rather than `creation`.
#     """
#     try:
#         # Build optional partner filter
#         where_partner = ""
#         params_partner = []
#         if permitted_partners:
#             ph = ",".join(["%s"] * len(permitted_partners))
#             where_partner = f"WHERE partner_id IN ({ph})"
#             params_partner = list(permitted_partners)

#         # Get the latest modified record per budget, then sum the field
#         rows = frappe.db.sql(
#             f"""
#             SELECT cu.no_of_running_creches
#             FROM `tabCreche utilisation` cu
#             INNER JOIN (
#                 SELECT budget_reference_id, MAX(modified) AS max_m
#                 FROM `tabCreche utilisation`
#                 {where_partner}
#                 GROUP BY budget_reference_id
#             ) latest ON cu.budget_reference_id = latest.budget_reference_id
#                      AND cu.modified = latest.max_m
#             """,
#             params_partner,
#             as_dict=True,
#         )
#         return int(sum(int(r.no_of_running_creches or 0) for r in rows))
#     except Exception as e:
#         frappe.log_error(str(e), "get_running_creches_count")
#         return 0



# def _add_month(d):
#     if relativedelta:
#         return d + relativedelta(months=1)
#     y, m = d.year, d.month + 1
#     if m > 12: y += 1; m = 1
#     return _date(y, m, 1)

# @frappe.whitelist()
# def get_pending_utilisation_summary(cutoff_date=None, target_fy=None, target_month=None):
#     today = getdate(frappe.utils.nowdate())
#     if cutoff_date:
#         cutoff = getdate(cutoff_date)
#     else:
#         if today.day >= 5:
#             cutoff = today.replace(day=5)
#         else:
#             y, m = today.year, today.month - 1
#             if m < 1: y -= 1; m = 12
#             cutoff = _date(y, m, 5)

#     boundary_month_start = cutoff.replace(day=1)
#     permitted = _get_user_permitted_partners()
#     budget_filters = [
#         ["start_date", "is", "set"],
#         ["end_date", "is", "set"],
#         ["start_date", "<=", cutoff],
#     ]
#     if permitted is not None:
#         if not permitted:
#             return {"partners": [], "cutoff": str(cutoff)}
#         budget_filters.append(["partner_id", "in", permitted])

#     budgets = frappe.get_all(
#         "Creche Budget",
#         fields=["name","budget_reference_name","partner_id","partner_name",
#                 "grant_id","state","district","block","start_date","end_date"],
#         filters=budget_filters, ignore_permissions=True, limit_page_length=0,
#     )
#     if not budgets:
#         return {"partners": [], "cutoff": str(cutoff)}

#     budget_names = [b["name"] for b in budgets]
#     existing = set(
#         (r["budget_reference_id"], r["financial_year"], r["month"])
#         for r in frappe.get_all("Creche utilisation",
#             filters={"budget_reference_id": ["in", budget_names]},
#             fields=["budget_reference_id","financial_year","month"],
#             ignore_permissions=True, limit_page_length=0)
#     )

#     # When target_fy and target_month are given, only check that specific month
#     check_specific = bool(target_fy and target_month)

#     by_partner = {}
#     for b in budgets:
#         bud_start = getdate(b["start_date"])
#         bud_end   = getdate(b["end_date"])

#         missing_for_budget = []

#         if check_specific:
#             # Only check the one selected month
#             try:
#                 month_num = list(_calendar.month_name).index(target_month)  # 1-12
#             except ValueError:
#                 continue
#             fy_start_year = int(target_fy.split("-")[0])
#             year = fy_start_year if month_num >= 4 else fy_start_year + 1
#             month_start = _date(year, month_num, 1)

#             # Skip if this month is outside the budget period
#             if month_start < bud_start.replace(day=1) or month_start > bud_end.replace(day=1):
#                 continue
#             # Skip if submission already exists
#             if (b["name"], target_fy, target_month) in existing:
#                 continue

#             deadline = _add_month(month_start).replace(day=5)
#             days_overdue = (cutoff - deadline).days
#             missing_for_budget.append({
#                 "financial_year": target_fy, "month": target_month,
#                 "deadline": deadline.isoformat(),
#                 "days_overdue": max(days_overdue, 0),
#             })
#         else:
#             # Original logic: check all months from budget start to boundary
#             start = bud_start
#             end   = bud_end
#             effective_end = min(end.replace(day=1), boundary_month_start)
#             cursor = start.replace(day=1)
#             while cursor <= effective_end:
#                 month_name = MONTH_ORDER[cursor.month - 1]
#                 fy_label = (f"{cursor.year}-{str(cursor.year+1)[2:]}" if cursor.month >= 4
#                             else f"{cursor.year-1}-{str(cursor.year)[2:]}")
#                 if (b["name"], fy_label, month_name) not in existing:
#                     deadline = _add_month(cursor).replace(day=5)
#                     days_overdue = (cutoff - deadline).days
#                     missing_for_budget.append({
#                         "financial_year": fy_label, "month": month_name,
#                         "deadline": deadline.isoformat(),
#                         "days_overdue": max(days_overdue, 0),
#                     })
#                 cursor = _add_month(cursor)

#         if not missing_for_budget:
#             continue

#         pid = b["partner_id"] or b["partner_name"] or "Unknown"
#         if pid not in by_partner:
#             by_partner[pid] = {
#                 "partner_id": b["partner_id"], "partner_name": b["partner_name"],
#                 "missing_count": 0, "max_days_overdue": 0, "budgets": [],
#             }
#         entry = by_partner[pid]
#         entry["budgets"].append({
#             "budget_id": b["name"], "budget_reference_name": b["budget_reference_name"],
#             "grant_id": b["grant_id"], "state": b["state"],
#             "missing_months": missing_for_budget,
#         })
#         entry["missing_count"] += len(missing_for_budget)
#         entry["max_days_overdue"] = max(
#             entry["max_days_overdue"],
#             max((m["days_overdue"] for m in missing_for_budget), default=0),
#         )

#     partner_ids = [pid for pid in by_partner if pid]
#     email_map   = _get_partner_emails(partner_ids)
#     mobile_map  = _get_partner_mobiles(partner_ids)

#     result = []
#     for pid, entry in by_partner.items():
#         entry["email"]  = email_map.get(pid, "")
#         entry["mobile"] = mobile_map.get(pid, "")
#         result.append(entry)
#     result.sort(key=lambda r: (-r["max_days_overdue"], r["partner_name"] or ""))
#     return {"partners": result, "cutoff": str(cutoff)}

# @frappe.whitelist()
# def send_utilisation_reminder(partner_ids=None, custom_message=None):
#     if isinstance(partner_ids, str):
#         try: partner_ids = json.loads(partner_ids)
#         except Exception: partner_ids = [p.strip() for p in partner_ids.split(",") if p.strip()]
#     partner_ids = partner_ids or []
#     if not partner_ids: frappe.throw(frappe._("No partners selected"))

#     permitted = _get_user_permitted_partners()
#     if permitted is not None:
#         partner_ids = [p for p in partner_ids if p in permitted]
#         if not partner_ids: frappe.throw(frappe._("You do not have permission to email these partners"))

#     email_map = _get_partner_emails(partner_ids)
#     partner_names = {r.name: r.partner_name for r in frappe.get_all(
#         "Creche Partners", filters={"name": ["in", partner_ids]},
#         fields=["name","partner_name"], ignore_permissions=True)}

#     default_message = ("This is a reminder that your utilisation report submission is pending. "
#                        "Kindly submit it at the earliest to keep your budget records up to date.")
#     message_body = custom_message or default_message

#     sent, failed = [], []
#     for pid in partner_ids:
#         email = email_map.get(pid)
#         pname = partner_names.get(pid, pid)
#         if not email:
#             failed.append({"partner_id": pid, "partner_name": pname, "reason": "No email on file"})
#             continue
#         try:
#             frappe.sendmail(
#                 recipients=[email],
#                 subject="Utilisation Report Submission Reminder",
#                 message=f"<p>Dear {frappe.utils.escape_html(pname)},</p><p>{frappe.utils.escape_html(message_body)}</p>",
#                 now=True,
#             )
#             sent.append({"partner_id": pid, "partner_name": pname, "email": email})
#         except Exception as e:
#             failed.append({"partner_id": pid, "partner_name": pname, "reason": str(e)})

#     return {"sent": sent, "failed": failed}

# # ══════════════════════════════════════════════════════════════════════════
# # EXPORT
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def export_table(title="Report", columns=None, rows=None, format="xlsx"):
#     if isinstance(columns, str): columns = json.loads(columns)
#     if isinstance(rows, str):    rows    = json.loads(rows)
#     columns = columns or []; rows = rows or []

#     if format == "pdf":
#         file_url = _export_pdf(title, columns, rows)
#     else:
#         file_url = _export_xlsx(title, columns, rows)
#     return {"file_url": file_url}

# def _is_total_row(row, columns):
#     if not columns: return False
#     return str(row.get(columns[0].get("key"), "")).strip().lower() == "total"

# def _export_xlsx(title, columns, rows):
#     try:
#         from openpyxl import Workbook
#         from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
#         from openpyxl.utils import get_column_letter
#     except ImportError:
#         frappe.throw(frappe._("openpyxl is required for Excel export."))

#     wb = Workbook(); ws = wb.active; ws.title = (title or "Data")[:31]
#     NAVY="1E3A5F"; LIGHTBLUE="BFDBFE"; BORDER_C="93C5FD"; GRID_C="E2E8F0"; GROUP_FILL="DBEAFE"
#     thin_grid = Border(left=Side(style="thin",color=GRID_C),right=Side(style="thin",color=GRID_C),
#                        top=Side(style="thin",color=GRID_C),bottom=Side(style="thin",color=GRID_C))
#     thin_hdr  = Border(left=Side(style="thin",color=BORDER_C),right=Side(style="thin",color=BORDER_C),
#                        top=Side(style="thin",color=BORDER_C),bottom=Side(style="thin",color=BORDER_C))
#     header_font = Font(bold=True,color="FFFFFF",size=10)
#     header_fill = PatternFill(start_color=NAVY,end_color=NAVY,fill_type="solid")
#     total_font  = Font(bold=True,color=NAVY,size=11)
#     total_fill  = PatternFill(start_color=LIGHTBLUE,end_color=LIGHTBLUE,fill_type="solid")
#     group_font  = Font(bold=True,color=NAVY,size=10.5)
#     group_fill  = PatternFill(start_color=GROUP_FILL,end_color=GROUP_FILL,fill_type="solid")

#     for ci, col in enumerate(columns, start=1):
#         c = ws.cell(row=1,column=ci,value=col.get("label",""))
#         c.font=header_font; c.fill=header_fill; c.border=thin_hdr
#         c.alignment=Alignment(horizontal="center",vertical="center",wrap_text=True)

#     ncols = max(len(columns),1); r_idx = 2
#     for row in rows:
#         if row.get("__group__"):
#             ws.merge_cells(start_row=r_idx,start_column=1,end_row=r_idx,end_column=max(ncols-1,1))
#             lc = ws.cell(row=r_idx,column=1,value=row.get("label",""))
#             lc.font=group_font; lc.fill=group_fill; lc.border=thin_hdr
#             lc.alignment=Alignment(horizontal="left",vertical="center",indent=1)
#             sc = ws.cell(row=r_idx,column=ncols,value=row.get("subtotal",""))
#             sc.font=group_font; sc.fill=group_fill; sc.border=thin_hdr
#             sc.alignment=Alignment(horizontal="right",vertical="center")
#             r_idx += 1; continue

#         total_row = _is_total_row(row, columns)
#         for ci, col in enumerate(columns, start=1):
#             val = row.get(col.get("key"),"")
#             align = col.get("align","left")
#             cell = ws.cell(row=r_idx,column=ci)
#             if align=="right" and isinstance(val,(int,float)):
#                 cell.value=val; cell.number_format="#,##0.00"
#             else:
#                 cell.value=val
#             cell.alignment=Alignment(horizontal=align)
#             if total_row: cell.font=total_font; cell.fill=total_fill; cell.border=thin_hdr
#             else: cell.border=thin_grid
#         r_idx += 1

#     for ci, col in enumerate(columns, start=1):
#         letter = get_column_letter(ci)
#         max_len = len(str(col.get("label","")))
#         for row in rows:
#             if row.get("__group__"): continue
#             v = row.get(col.get("key"),"")
#             max_len = max(max_len, len(str(v)))
#         ws.column_dimensions[letter].width = min(max_len+4, 42)
#     ws.freeze_panes = "A2"

#     buf = io.BytesIO(); wb.save(buf); buf.seek(0)
#     return _save_file(f"{_safe_fname(title)}.xlsx", buf.getvalue())

# def _export_pdf(title, columns, rows):
#     thead = "".join(f"<th>{frappe.utils.escape_html(c.get('label',''))}</th>" for c in columns)
#     ncols = max(len(columns), 1); body_rows = []
#     for row in rows:
#         if row.get("__group__"):
#             label   = frappe.utils.escape_html(row.get("label",""))
#             subtotal= frappe.utils.escape_html(row.get("subtotal",""))
#             body_rows.append(f'<tr class="group-row"><td colspan="{ncols}">'
#                              f'<span class="group-row__label">{label}</span>'
#                              f'<span class="group-row__subtotal">{subtotal}</span></td></tr>')
#             continue
#         total_row = _is_total_row(row, columns)
#         tds = [f'<td style="text-align:{c.get("align","left")}">{frappe.utils.escape_html(str(row.get(c.get("key"),"" )))}</td>'
#                for c in columns]
#         body_rows.append(f'<tr{"  class=\"total-row\"" if total_row else ""}>{"".join(tds)}</tr>')

#     html = f"""<html><head><meta charset="utf-8">
#     <style>@page{{size:A4 portrait;margin:14mm 10mm}}*{{box-sizing:border-box;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif}}body{{color:#1f2937}}h1{{font-size:16px;font-weight:700;color:#1e3a5f;margin-bottom:4px}}.meta{{font-size:9px;color:#94a3b8;margin-bottom:12px}}table{{width:100%;border-collapse:collapse;font-size:10px}}th{{background:#1e3a5f;color:#fff;font-weight:700;text-transform:uppercase;font-size:8.5px;letter-spacing:.4px;padding:6px 8px;text-align:left;border:1px solid #93c5fd}}td{{padding:5px 8px;border:1px solid #e2e8f0}}tr.total-row td{{background:#bfdbfe;color:#1e3a5f;font-weight:700;border:1px solid #93c5fd}}tr.group-row td{{background:#dbeafe;color:#1e3a5f;font-weight:700;border:1px solid #93c5fd;padding:6px 8px}}.group-row__label{{display:inline-block}}.group-row__subtotal{{float:right}}tr:nth-child(even):not(.total-row):not(.group-row) td{{background:#f8fafc}}</style>
#     </head><body>
#     <h1>{frappe.utils.escape_html(title or "Report")}</h1>
#     <div class="meta">Exported {frappe.utils.now_datetime().strftime("%d %b %Y, %I:%M %p")} by {frappe.session.user}</div>
#     <table><thead><tr>{thead}</tr></thead><tbody>{"".join(body_rows)}</tbody></table>
#     </body></html>"""

#     from frappe.utils.pdf import get_pdf
#     pdf_content = get_pdf(html, options={"page-size":"A4","orientation":"Portrait"})
#     return _save_file(f"{_safe_fname(title)}.pdf", pdf_content)

# def _safe_fname(title):
#     import re
#     base = re.sub(r"[^A-Za-z0-9_-]+","_",title or "report").strip("_") or "report"
#     return base[:80]

# def _save_file(fname, content):
#     f = frappe.get_doc({"doctype":"File","file_name":fname,"is_private":0,"content":content})
#     f.save(ignore_permissions=True)
#     return f.file_url























# """
# creche_reports/api/creche_dashboard.py

# All server-side methods for the Creche Dashboard page.
# """

# import frappe
# from frappe.utils import flt, getdate, nowdate, add_days, now_datetime, get_datetime, get_url
# from datetime import date as _date, datetime, timedelta as _timedelta
# import calendar as _calendar
# import json
# import io

# try:
#     from dateutil.relativedelta import relativedelta
# except ImportError:
#     relativedelta = None

# MONTH_ORDER = [
#     "January","February","March","April","May","June",
#     "July","August","September","October","November","December",
# ]

# # ══════════════════════════════════════════════════════════════════════════
# # DATE / PRORATA HELPERS
# # ══════════════════════════════════════════════════════════════════════════

# def _to_date(v):
#     if not v: return None
#     if isinstance(v, _date): return v
#     return _date.fromisoformat(str(v)[:10])

# def _add_months_safe(d, n):
#     """Add n calendar months to date d, clamping day to month-end."""
#     if relativedelta:
#         return d + relativedelta(months=n)
#     m = d.month - 1 + n
#     year  = d.year + m // 12
#     month = m % 12 + 1
#     day   = min(d.day, _calendar.monthrange(year, month)[1])
#     return _date(year, month, day)

# def _count_calendar_months(start, end):
#     """Count distinct calendar months from start to end inclusive."""
#     if not start or not end or start > end:
#         return 0
#     count = 0
#     y, m = start.year, start.month
#     ey, em = end.year, end.month
#     while (y, m) <= (ey, em):
#         count += 1
#         m += 1
#         if m > 12:
#             m, y = 1, y + 1
#     return count

# def _prorata_by_budget_year(year_1, year_2, year_3, bud_start, bud_end, filter_segments):
#     """
#     Calculate prorated budget using budget-year periods (NOT financial-year periods).

#     Y1 = first 12 months from budget start date
#     Y2 = months 13-24 from budget start date
#     Y3 = months 25-36 from budget start date

#     For each year period that overlaps a filter segment:
#         contribution = year_amount / 12 * months_in_overlap

#     Returns dict with keys: total, year_1, year_2, year_3
#     """
#     empty = {"total": 0.0, "year_1": 0.0, "year_2": 0.0, "year_3": 0.0}
#     bud_s = _to_date(bud_start)
#     bud_e = _to_date(bud_end)
#     if not bud_s or not bud_e:
#         return empty

#     year_amounts = [float(year_1 or 0), float(year_2 or 0), float(year_3 or 0)]
#     scaled = [0.0, 0.0, 0.0]

#     for i, yr_amt in enumerate(year_amounts):
#         if not yr_amt:
#             continue
#         yr_s = _add_months_safe(bud_s, i * 12)
#         yr_e = _add_months_safe(bud_s, (i + 1) * 12) - _timedelta(days=1)
#         yr_e = min(yr_e, bud_e)
#         if yr_s > bud_e:
#             break  # all remaining years are also beyond budget end

#         for seg_s, seg_e in filter_segments:
#             ov_s = max(seg_s, yr_s)
#             ov_e = min(seg_e, yr_e)
#             if ov_s > ov_e:
#                 continue
#             months = _count_calendar_months(ov_s, ov_e)
#             if months > 0:
#                 scaled[i] += yr_amt / 12.0 * months

#     return {
#         "total":  round(scaled[0] + scaled[1] + scaled[2], 2),
#         "year_1": round(scaled[0], 2),
#         "year_2": round(scaled[1], 2),
#         "year_3": round(scaled[2], 2),
#     }

# def _compute_prorata_budget(budget_name, bud_start, bud_end, filter_segments):
#     """
#     Compute prorated total budget for a Creche Budget document.
#     Uses budget-year-based proration (not financial-year-based).
#     """
#     if not filter_segments:
#         return None

#     rows = frappe.db.sql(
#         """SELECT SUM(COALESCE(year_1,0)) AS year_1,
#                   SUM(COALESCE(year_2,0)) AS year_2,
#                   SUM(COALESCE(year_3,0)) AS year_3
#            FROM `tabBudget Items`
#            WHERE parent = %s AND parenttype = 'Creche Budget'""",
#         (budget_name,), as_dict=True,
#     )
#     if not rows or not rows[0]:
#         return 0.0

#     raw = rows[0]
#     result = _prorata_by_budget_year(
#         raw.get("year_1") or 0,
#         raw.get("year_2") or 0,
#         raw.get("year_3") or 0,
#         bud_start, bud_end, filter_segments,
#     )
#     return result["total"]

# def _build_filter_segments(filters):
#     raw_start = _to_date(filters.get("start_date"))
#     raw_end   = _to_date(filters.get("end_date"))

#     filter_fys = filters.get("financial_year") or []
#     if isinstance(filter_fys, str): filter_fys = [filter_fys]
#     filter_fys = list(filter_fys)

#     month_raw = filters.get("month") or []
#     if isinstance(month_raw, str): month_raw = [month_raw] if month_raw.strip() else []
#     month_filters = [m.strip() for m in month_raw if str(m).strip()]

#     if raw_start or raw_end:
#         from datetime import timedelta
#         seg_s = raw_start or (raw_end - timedelta(days=3*366))
#         seg_e = raw_end   or (raw_start + timedelta(days=3*366))
#         return [(seg_s, seg_e)]

#     if filter_fys and month_filters:
#         segs = []
#         for fy in filter_fys:
#             fy_start_year = int(fy.split("-")[0])
#             for mn in month_filters:
#                 month_num = list(_calendar.month_name).index(mn)
#                 year      = fy_start_year if month_num >= 4 else fy_start_year + 1
#                 last_day  = _calendar.monthrange(year, month_num)[1]
#                 segs.append((_date(year, month_num, 1), _date(year, month_num, last_day)))
#         return segs

#     if filter_fys:
#         segs = []
#         for fy in filter_fys:
#             y = int(fy.split("-")[0])
#             segs.append((_date(y, 4, 1), _date(y + 1, 3, 31)))
#         return segs

#     return []

# # ══════════════════════════════════════════════════════════════════════════
# # PERMISSION HELPERS
# # ══════════════════════════════════════════════════════════════════════════

# def _get_user_permitted_partners():
#     user  = frappe.session.user
#     roles = frappe.get_roles(user)
#     if "System Manager" in roles or user == "Administrator":
#         return None
#     rows = frappe.db.sql(
#         "SELECT for_value FROM `tabUser Permission` WHERE user = %s AND allow = 'Creche Partners'",
#         (user,), as_dict=True,
#     )
#     if not rows: return None
#     return [r.for_value for r in rows if r.for_value]

# def _intersect(filter_list, permitted):
#     if permitted is None: return filter_list
#     if not permitted: return []
#     if not filter_list: return permitted
#     pset = set(permitted)
#     return [p for p in filter_list if p in pset]

# def _empty_summary():
#     return {
#         "total_budget":0,"total_disbursement":0,
#         "total_utilisation":0,"total_bank_balance":0,
#         "total_interest":0,"total_creches":0,
#         "utilisation_pct":0,"disbursement_pct":0,
#     }

# def _assert_partner_access(partner_id: str):
#     permitted = _get_user_permitted_partners()
#     if permitted is None: return
#     if partner_id not in permitted:
#         frappe.throw(frappe._("You do not have permission to access this partner"), frappe.PermissionError)

# # ══════════════════════════════════════════════════════════════════════════
# # PARTNER OPTIONS
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_partner_options(txt=""):
#     permitted = _get_user_permitted_partners()
#     filters   = {}
#     if permitted is not None:
#         if not permitted: return []
#         filters["name"] = ["in", permitted]
#     if txt:
#         filters["partner_name"] = ["like", f"%{txt}%"]
#     rows = frappe.get_all("Creche Partners", filters=filters, fields=["name","partner_name"],
#                           order_by="partner_name asc", limit=500, ignore_permissions=True)
#     return [{"name": r.name, "partner_name": r.partner_name or r.name} for r in rows]

# @frappe.whitelist()
# def get_user_permission_scope():
#     permitted = _get_user_permitted_partners()
#     if permitted is None: return {"restricted": False, "partner_ids": []}
#     return {"restricted": True, "partner_ids": permitted}

# # ══════════════════════════════════════════════════════════════════════════
# # MAIN SUMMARY
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_partner_budget_summary(filters=None):
#     if isinstance(filters, str):
#         filters = json.loads(filters)
#     filters = filters or {}

#     permitted          = _get_user_permitted_partners()
#     filter_partners    = filters.get("partner_id") or None
#     effective_partners = _intersect(filter_partners, permitted)

#     if effective_partners is not None and len(effective_partners) == 0:
#         return {"summary": _empty_summary(), "partners": []}

#     start_date = filters.get("start_date") or None
#     end_date   = filters.get("end_date")   or None

#     filter_segments = _build_filter_segments(filters)
#     apply_prorata   = bool(filter_segments)

#     budget_filters = {}
#     if effective_partners:
#         budget_filters["partner_id"] = ["in", effective_partners]
#     if filters.get("budget_ref"):
#         budget_filters["budget_reference_name"] = ["in", filters["budget_ref"]]
#     if filters.get("grant_id"):
#         budget_filters["grant_id"] = ["in", filters["grant_id"]]
#     if filters.get("state"):
#         budget_filters["state"] = ["in", filters["state"]]
#     if filters.get("district"):
#         budget_filters["district"] = ["in", filters["district"]]
#     if filters.get("block"):
#         budget_filters["block"] = ["in", filters["block"]]
#     if start_date:
#         budget_filters["end_date"]   = [">=", start_date]
#     if end_date:
#         budget_filters["start_date"] = ["<=", end_date]

#     budgets = frappe.get_all(
#         "Creche Budget", filters=budget_filters,
#         fields=["name","partner_id","partner_name","grant_id","budget_reference_name",
#                 "state","district","block","start_date","end_date","financial_year",
#                 "no_of_creches","total_budget"],
#         order_by="partner_name asc, budget_reference_name asc",
#         ignore_permissions=True,
#     )

#     budget_ids = [b.name for b in budgets]

#     # ── Budget Items sums (bulk) ──────────────────────────────────────────
#     budget_items_map = {}
#     if budget_ids:
#         ph_bi = ", ".join([f"%(bim{i})s" for i in range(len(budget_ids))])
#         bim_params = {f"bim{i}": n for i, n in enumerate(budget_ids)}
#         bi_rows = frappe.db.sql(
#             "SELECT parent,"
#             " SUM(COALESCE(year_1,0)) AS year_1,"
#             " SUM(COALESCE(year_2,0)) AS year_2,"
#             " SUM(COALESCE(year_3,0)) AS year_3"
#             " FROM `tabBudget Items`"
#             f" WHERE parent IN ({ph_bi}) AND parenttype = 'Creche Budget'"
#             " GROUP BY parent",
#             bim_params, as_dict=True,
#         )
#         for r in bi_rows:
#             budget_items_map[r.parent] = {
#                 "year_1": float(r.year_1 or 0),
#                 "year_2": float(r.year_2 or 0),
#                 "year_3": float(r.year_3 or 0),
#                 "total":  float(r.year_1 or 0) + float(r.year_2 or 0) + float(r.year_3 or 0),
#             }

#     # ── Disbursement (date-based) ─────────────────────────────────────────
#     disbursement_map = {}
#     if budget_ids:
#         disb_headers = frappe.get_all("Creche Disbursement",
#             filters={"budget_reference_id": ["in", budget_ids]},
#             fields=["name","budget_reference_id"], ignore_permissions=True)
#         disb_parent_names = [d.name for d in disb_headers]
#         disb_bid_map = {d.name: d.budget_reference_id for d in disb_headers}

#         if disb_parent_names:
#             tracker_rows = frappe.get_all("Disbursement Tracker",
#                 filters={"parent": ["in", disb_parent_names], "parenttype": "Creche Disbursement"},
#                 fields=["parent","date_of_disbursement","disbursed_amount"],
#                 ignore_permissions=True)

#             if filter_segments:
#                 tracker_rows = [
#                     t for t in tracker_rows
#                     if t.date_of_disbursement and any(
#                         seg_s <= getdate(str(t.date_of_disbursement)) <= seg_e
#                         for seg_s, seg_e in filter_segments
#                     )
#                 ]
#             elif start_date or end_date:
#                 tracker_rows = [
#                     t for t in tracker_rows
#                     if t.date_of_disbursement
#                     and (not start_date or getdate(str(t.date_of_disbursement)) >= getdate(start_date))
#                     and (not end_date   or getdate(str(t.date_of_disbursement)) <= getdate(end_date))
#                 ]

#             for t in tracker_rows:
#                 bid = disb_bid_map.get(t.parent)
#                 if bid:
#                     disbursement_map[bid] = disbursement_map.get(bid, 0.0) + flt(t.disbursed_amount)

#     # ── Utilisation ───────────────────────────────────────────────────────
#     utilisation_map  = {}
#     bank_balance_map = {}
#     interest_map     = {}

#     if budget_ids:
#         filter_fys = filters.get("financial_year") or []
#         if isinstance(filter_fys, str): filter_fys = [filter_fys]
#         month_raw = filters.get("month") or []
#         if isinstance(month_raw, str): month_raw = [month_raw] if month_raw.strip() else []
#         month_filters = [m.strip() for m in month_raw if str(m).strip()]

#         util_extra  = ""
#         util_params = {}

#         if start_date and end_date:
#             def _local_fy_month_pairs(sd, ed):
#                 sd = _to_date(sd); ed = _to_date(ed)
#                 if not sd or not ed: return []
#                 pairs = []; cur = _date(sd.year, sd.month, 1)
#                 end_mo = _date(ed.year, ed.month, 1)
#                 while cur <= end_mo:
#                     fy = (f"{cur.year}-{str(cur.year+1)[2:]}" if cur.month >= 4
#                           else f"{cur.year-1}-{str(cur.year)[2:]}")
#                     pairs.append((fy, _calendar.month_name[cur.month]))
#                     cur = (_date(cur.year+1,1,1) if cur.month==12
#                            else _date(cur.year, cur.month+1, 1))
#                 return pairs
#             pairs = _local_fy_month_pairs(start_date, end_date)
#             if pairs:
#                 clauses = []
#                 for i, (fy, mn) in enumerate(pairs):
#                     util_params[f"ufy{i}"] = fy; util_params[f"umn{i}"] = mn
#                     clauses.append(f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)")
#                 util_extra = " AND (" + " OR ".join(clauses) + ")"
#             else:
#                 util_extra = " AND 1=0"
#         elif filter_fys and month_filters:
#             clauses = []; k = 0
#             for fy in sorted(filter_fys):
#                 for mn in month_filters:
#                     util_params[f"ufy{k}"] = fy; util_params[f"umn{k}"] = mn
#                     clauses.append(f"(cu.financial_year = %(ufy{k})s AND cu.month = %(umn{k})s)")
#                     k += 1
#             util_extra = " AND (" + " OR ".join(clauses) + ")"
#         elif filter_fys:
#             ph = ", ".join([f"%(ufy{i})s" for i in range(len(filter_fys))])
#             for i, fy in enumerate(filter_fys): util_params[f"ufy{i}"] = fy
#             util_extra = f" AND cu.financial_year IN ({ph})"
#         elif month_filters:
#             ph = ", ".join([f"%(umn{i})s" for i in range(len(month_filters))])
#             for i, m in enumerate(month_filters): util_params[f"umn{i}"] = m
#             util_extra = f" AND cu.month IN ({ph})"
#         elif start_date:
#             from datetime import date as _dt_today
#             today = _dt_today.today()
#             def _lp(sd, ed):
#                 sd = _to_date(sd); ed = _to_date(ed)
#                 if not sd or not ed: return []
#                 pairs = []; cur = _date(sd.year, sd.month, 1)
#                 end_mo = _date(ed.year, ed.month, 1)
#                 while cur <= end_mo:
#                     fy = (f"{cur.year}-{str(cur.year+1)[2:]}" if cur.month >= 4
#                           else f"{cur.year-1}-{str(cur.year)[2:]}")
#                     pairs.append((fy, _calendar.month_name[cur.month]))
#                     cur = (_date(cur.year+1,1,1) if cur.month==12
#                            else _date(cur.year, cur.month+1, 1))
#                 return pairs
#             pairs = _lp(start_date, today)
#             if pairs:
#                 clauses = []
#                 for i, (fy, mn) in enumerate(pairs):
#                     util_params[f"ufy{i}"] = fy; util_params[f"umn{i}"] = mn
#                     clauses.append(f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)")
#                 util_extra = " AND (" + " OR ".join(clauses) + ")"

#         bid_ph = ", ".join([f"%(bid{i})s" for i in range(len(budget_ids))])
#         for i, n in enumerate(budget_ids): util_params[f"bid{i}"] = n

#         util_rows = frappe.db.sql(
#             f"""SELECT cu.budget_reference_id, SUM(ui.total_amount) AS total_util
#                 FROM `tabCreche utilisation` cu
#                 INNER JOIN `tabUtilisation Items` ui ON ui.parent = cu.name AND ui.parenttype = 'Creche utilisation'
#                 WHERE cu.budget_reference_id IN ({bid_ph}) {util_extra}
#                 GROUP BY cu.budget_reference_id""",
#             util_params, as_dict=True,
#         )
#         for r in util_rows:
#             utilisation_map[r.budget_reference_id] = flt(r.total_util)

#         interest_rows = frappe.db.sql(
#             f"""SELECT budget_reference_id, SUM(interest_from_bank) AS total_interest
#                 FROM `tabCreche utilisation`
#                 WHERE budget_reference_id IN ({bid_ph}) {util_extra.replace("cu.", "")}
#                 GROUP BY budget_reference_id""",
#             util_params, as_dict=True,
#         )
#         for r in interest_rows:
#             interest_map[r.budget_reference_id] = flt(r.total_interest)

#         # Bank balance: from the MOST RECENTLY MODIFIED utilisation record per budget
#         # (within the active filter period if one is set; otherwise globally latest)
#         try:
#             bank_balance_map = {}
#             bb_rows = frappe.db.sql(
#                 f"""
#                 SELECT cu.budget_reference_id, cu.balance_amount
#                 FROM `tabCreche utilisation` cu
#                 INNER JOIN (
#                     SELECT budget_reference_id, MAX(modified) AS max_m
#                     FROM `tabCreche utilisation`
#                     WHERE budget_reference_id IN ({bid_ph})
#                     {util_extra.replace("cu.", "") if util_extra else ""}
#                     GROUP BY budget_reference_id
#                 ) latest ON cu.budget_reference_id = latest.budget_reference_id
#                          AND cu.modified = latest.max_m
#                 """,
#                 util_params, as_dict=True,
#             )
#             for r in bb_rows:
#                 bank_balance_map[r.budget_reference_id] = flt(r.balance_amount)
#         except Exception as e:
#             frappe.log_error(str(e), "bank_balance_map_error")
#             bank_balance_map = {}

#     # ── Running creches per budget (from latest modified utilization) ──────
#     running_creches_map = {}
#     if budget_ids:
#         try:
#             rc_ph = ", ".join(["%s"] * len(budget_ids))
#             rc_rows = frappe.db.sql(
#                 f"""
#                 SELECT cu.budget_reference_id, COALESCE(cu.no_of_running_creches, 0) AS rc
#                 FROM `tabCreche utilisation` cu
#                 INNER JOIN (
#                     SELECT budget_reference_id, MAX(modified) AS max_m
#                     FROM `tabCreche utilisation`
#                     WHERE budget_reference_id IN ({rc_ph})
#                     GROUP BY budget_reference_id
#                 ) latest ON cu.budget_reference_id = latest.budget_reference_id
#                          AND cu.modified = latest.max_m
#                 """,
#                 budget_ids, as_dict=True,
#             )
#             for r in rc_rows:
#                 running_creches_map[r.budget_reference_id] = int(r.rc or 0)
#         except Exception:
#             pass

#     # ── Assemble results ──────────────────────────────────────────────────

#     partners = {}
#     grand = dict(budget=0.0, disbursement=0.0, utilisation=0.0, bank_balance=0.0, interest=0.0, creches=0)

#     for budget in budgets:
#         bid = budget.name
#         bi  = budget_items_map.get(bid)
#         if bi is None:
#             # No Budget Items rows found at all for this budget — fall back to
#             # the stored total_budget field only in this edge case (a budget
#             # with zero configured line items still needs *some* number).
#             bi = {"year_1": 0, "year_2": 0, "year_3": 0, "total": flt(budget.total_budget)}

#         if apply_prorata:
#             pr = _prorata_by_budget_year(
#                 bi["year_1"], bi["year_2"], bi["year_3"],
#                 budget.start_date, budget.end_date, filter_segments,
#             )
#             budget_amount = pr["total"]
#         else:
#             # ── FIX #1/#2 ──
#             # Always derive the budget amount from Budget Items
#             # (year_1 + year_2 + year_3), never silently substitute the
#             # stored total_budget field just because the line-item sum is
#             # zero. Falling back on a "truthy" check meant any budget whose
#             # line items legitimately summed to 0 would show the stale
#             # total_budget value on the summary card while the drill-down
#             # (which always sums line items) showed 0 — causing the
#             # card-vs-drilldown mismatch. Now both always agree.
#             budget_amount = bi["total"]

#         disbursement = flt(disbursement_map.get(bid, 0))
#         utilisation  = flt(utilisation_map.get(bid, 0))
#         bank_balance = flt(bank_balance_map.get(bid, 0))
#         interest     = flt(interest_map.get(bid, 0))
#         creches      = int(budget.no_of_creches or 0)

#         balance_budget            = budget_amount - utilisation
#         utilised_pct              = round((utilisation / budget_amount * 100) if budget_amount else 0, 2)
#         utilised_disbursement_pct = round((utilisation / disbursement * 100)  if disbursement  else 0, 2)

#         partner_key = budget.partner_id or budget.partner_name or "Unknown"
#         if partner_key not in partners:
#             partners[partner_key] = {
#                 "partner_id": budget.partner_id, "partner_name": budget.partner_name,
#                 "total_budget":0.0,"total_disbursement":0.0,"total_utilisation":0.0,
#                 "total_balance_budget":0.0,"total_bank_balance":0.0,
#                 "total_interest":0.0,"total_creches":0,"total_running_creches":0,"budgets":[],
#             }
#         p = partners[partner_key]
#         p["total_budget"]         += budget_amount
#         p["total_disbursement"]   += disbursement
#         p["total_utilisation"]    += utilisation
#         p["total_balance_budget"] += balance_budget
#         # SUM bank balances per partner (consistent with grand total which also sums)
#         p["total_bank_balance"] += bank_balance
#         budget_running = running_creches_map.get(bid, 0)
#         p["total_interest"]       += interest
#         p["total_creches"]        += creches
#         p.setdefault("total_running_creches", 0)
#         p["total_running_creches"] += budget_running
#         p["budgets"].append({
#             "budget_id": bid, "grant_id": budget.grant_id,
#             "budget_reference_name": budget.budget_reference_name,
#             "state": budget.state, "district": budget.district, "block": budget.block,
#             "grant_start": budget.start_date, "grant_end": budget.end_date,
#             "financial_year": budget.financial_year, "no_of_creches": creches,
#             "budget": budget_amount, "disbursement": disbursement,
#             "utilisation": utilisation, "utilised_pct": utilised_pct,
#             "utilised_disbursement_pct": utilised_disbursement_pct,
#             "balance_budget_amount": balance_budget,
#             "bank_balance": bank_balance, "interest_from_bank": interest,
#             "running_creches": budget_running,
#         })

#         grand["budget"]       += budget_amount
#         grand["disbursement"] += disbursement
#         grand["utilisation"]  += utilisation
#         grand["bank_balance"] += bank_balance
#         grand["interest"]     += interest
#         grand["creches"]      += creches

#     result = []
#     for p in partners.values():
#         p["utilised_pct"] = round((p["total_utilisation"] / p["total_budget"] * 100) if p["total_budget"] else 0, 2)
#         p["grant_ids"]    = ", ".join(sorted(set(b["grant_id"] for b in p["budgets"] if b["grant_id"])))
#         p["budgets"]      = sorted(p["budgets"], key=lambda x: x["budget_reference_name"] or "")
#         result.append(p)
#     result.sort(key=lambda x: x["partner_name"] or "")

#     gb = grand["budget"]
#     # Get running creches from most recent utilisation records
#     running_creches = _get_running_creches_count(
#         effective_partners if effective_partners else None
#     )
#     return {
#         "summary": {
#             "total_budget":       grand["budget"],
#             "total_disbursement": grand["disbursement"],
#             "total_utilisation":  grand["utilisation"],
#             "total_bank_balance": grand["bank_balance"],
#             "total_interest":     grand["interest"],
#             "total_creches":      grand["creches"],
#             "running_creches":    running_creches,
#             "utilisation_pct":    round((grand["utilisation"]  / gb * 100) if gb else 0, 2),
#             "disbursement_pct":   round((grand["disbursement"] / gb * 100) if gb else 0, 2),
#         },
#         "partners": result,
#     }

# # ══════════════════════════════════════════════════════════════════════════
# # DISBURSEMENT PANEL DATA
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_disbursement_panel_data(budget_ids=None, partner_ids=None, start_date=None, end_date=None,
#                                 financial_year=None, month=None):
#     permitted = _get_user_permitted_partners()
#     def _to_list(v):
#         if not v: return []
#         if isinstance(v, str):
#             try:
#                 p = json.loads(v)
#                 if isinstance(p, list): return [x for x in p if x]
#             except: pass
#             return [x.strip() for x in v.split(",") if x.strip()]
#         return [x for x in v if x]

#     budget_ids_list  = _to_list(budget_ids)
#     partner_ids_list = _to_list(partner_ids)
#     filter_fys       = _to_list(financial_year)
#     month_filters    = [m.strip() for m in _to_list(month) if str(m).strip()]

#     disb_filters = {}
#     if budget_ids_list:
#         if permitted is not None:
#             br = frappe.get_all("Creche Budget",
#                 filters={"name":["in",budget_ids_list]},
#                 fields=["name","partner_id"], ignore_permissions=True)
#             budget_ids_list = [r.name for r in br if r.partner_id in permitted]
#             if not budget_ids_list: return []
#         disb_filters["budget_reference_id"] = ["in", budget_ids_list]
#     elif partner_ids_list:
#         eff = _intersect(partner_ids_list, permitted)
#         if eff is not None and not eff: return []
#         if eff: disb_filters["partner_id"] = ["in", eff]
#         elif permitted is not None: return []
#     else:
#         if permitted is not None:
#             if not permitted: return []
#             disb_filters["partner_id"] = ["in", permitted]

#     disb_docs = frappe.get_all("Creche Disbursement", filters=disb_filters,
#         fields=["name","budget_reference_id","budget_reference_name","partner_id","partner_name",
#                 "grant_id","state","district","block","financial_year",
#                 "total_disbursement","balence_budget","total_budget"],
#         order_by="partner_name asc, budget_reference_name asc", ignore_permissions=True)
#     if not disb_docs: return []

#     parent_names = [d.name for d in disb_docs]
#     tracker_rows = frappe.get_all("Disbursement Tracker",
#         filters={"parent":["in",parent_names],"parenttype":"Creche Disbursement"},
#         fields=["parent","date_of_disbursement","disbursed_amount"],
#         order_by="date_of_disbursement asc", ignore_permissions=True)

#     filter_segments = _build_filter_segments({
#         "start_date": start_date, "end_date": end_date,
#         "financial_year": filter_fys, "month": month_filters,
#     })
#     period_active = bool(filter_segments) or bool(start_date) or bool(end_date)

#     if filter_segments:
#         tracker_rows = [
#             t for t in tracker_rows
#             if t.date_of_disbursement and any(
#                 seg_s <= getdate(str(t.date_of_disbursement)) <= seg_e
#                 for seg_s, seg_e in filter_segments
#             )
#         ]
#     elif start_date or end_date:
#         tracker_rows = [t for t in tracker_rows
#             if t.date_of_disbursement
#             and (not start_date or getdate(str(t.date_of_disbursement)) >= getdate(start_date))
#             and (not end_date   or getdate(str(t.date_of_disbursement)) <= getdate(end_date))]

#     tracker_map = {}
#     for t in tracker_rows:
#         tracker_map.setdefault(t.parent, []).append({
#             "date_of_disbursement": str(t.date_of_disbursement) if t.date_of_disbursement else "",
#             "disbursed_amount": flt(t.disbursed_amount),
#         })

#     result = []
#     for doc in disb_docs:
#         ft = tracker_map.get(doc.name, [])
#         # ── FIX #1/#2 ──
#         # Always sum from Disbursement Tracker rows, never fall back to the
#         # stored total_disbursement field on the parent doc. Previously this
#         # fell back to the stored field whenever no period filter was
#         # active, while the summary card (get_partner_budget_summary)
#         # always summed tracker rows — any drift between the stored field
#         # and the tracker rows showed up as a card-vs-drilldown mismatch.
#         ftotal = sum(flt(t["disbursed_amount"]) for t in ft)
#         result.append({
#             "name": doc.name, "budget_reference_id": doc.budget_reference_id or "",
#             "budget_reference_name": doc.budget_reference_name or "",
#             "partner_id": doc.partner_id or "", "partner_name": doc.partner_name or "",
#             "grant_id": doc.grant_id or "", "state": doc.state or "",
#             "district": doc.district or "", "block": doc.block or "",
#             "financial_year": doc.financial_year or "",
#             "total_budget": flt(doc.total_budget), "total_disbursement": ftotal,
#             "balence_budget": flt(doc.total_budget) - ftotal,
#             "tracker": ft,
#         })
#     if period_active:
#         result = [r for r in result if r["tracker"]]
#     return result

# # ══════════════════════════════════════════════════════════════════════════
# # BUDGET LINE ITEMS — UPDATED: uses _prorata_by_budget_year
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_budget_line_items(budget_id: str, start_date=None, end_date=None,
#                           financial_year=None, month=None):
#     if not budget_id: return []
#     partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
#     _assert_partner_access(partner_id)

#     def _pl(v):
#         if not v: return []
#         if isinstance(v, list): return [x for x in v if x]
#         try:
#             p = json.loads(v)
#             if isinstance(p, list): return [x for x in p if x]
#         except: pass
#         return [x.strip() for x in str(v).split(",") if x.strip()]

#     filter_fys    = _pl(financial_year)
#     month_filters = [m.strip() for m in _pl(month) if str(m).strip()]

#     rows = frappe.get_all("Budget Items",
#         filters={"parent": budget_id, "parenttype": "Creche Budget"},
#         fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
#                 "budget_sub_head","year_1","year_2","year_3","total_amount","notes"],
#         order_by="budget_main_head asc, type_of_expenses asc", ignore_permissions=True)

#     filter_segments = _build_filter_segments({
#         "start_date": start_date, "end_date": end_date,
#         "financial_year": filter_fys, "month": month_filters,
#     })
#     bud_start, bud_end = frappe.db.get_value(
#         "Creche Budget", budget_id, ["start_date", "end_date"])

#     result = []
#     for r in rows:
#         if filter_segments and bud_start and bud_end:
#             # Use budget-year-based prorata (not FY-based)
#             pr = _prorata_by_budget_year(
#                 r.year_1, r.year_2, r.year_3,
#                 bud_start, bud_end, filter_segments,
#             )
#             display_total = pr["total"]
#             y1 = pr["year_1"]
#             y2 = pr["year_2"]
#             y3 = pr["year_3"]
#         else:
#             # ── FIX #1/#2 ──
#             # Always compute the displayed total from year_1+year_2+year_3
#             # (the actual Budget Items line-item fields), never the stored
#             # total_amount field on the row. The stored field can drift out
#             # of sync with the year fields (manual edits, imports, etc.),
#             # and the summary aggregate (get_partner_budget_summary) always
#             # sums year_1/2/3 — so using total_amount here caused the line
#             # items total to disagree with the summary card.
#             y1, y2, y3 = flt(r.year_1), flt(r.year_2), flt(r.year_3)
#             display_total = y1 + y2 + y3

#         result.append({
#             "type_of_expenses_id": r.type_of_expenses_id,
#             "type_of_expenses": r.type_of_expenses, "budget_main_head": r.budget_main_head,
#             "budget_sub_head": r.budget_sub_head, "year_1": y1, "year_2": y2, "year_3": y3,
#             "total_amount": display_total, "notes": r.notes or "",
#         })
#     return result

# # ══════════════════════════════════════════════════════════════════════════
# # UTILISATION LINE ITEMS
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_utilisation_line_items(budget_id: str, start_date=None, end_date=None,
#                                financial_year=None, month=None):
#     if not budget_id: return {"months": [], "records": []}
#     partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
#     _assert_partner_access(partner_id)

#     def _parse_list(v):
#         if not v: return []
#         if isinstance(v, list): return [x for x in v if x]
#         try:
#             p = json.loads(v)
#             if isinstance(p, list): return [x for x in p if x]
#         except: pass
#         return [x.strip() for x in str(v).split(",") if x.strip()]

#     fy_list    = _parse_list(financial_year)
#     month_list = _parse_list(month)

#     util_filters = {"budget_reference_id": budget_id}
#     if fy_list:    util_filters["financial_year"] = ["in", fy_list]
#     if month_list: util_filters["month"]          = ["in", month_list]

#     util_docs = frappe.get_all("Creche utilisation", filters=util_filters,
#         fields=["name","month","financial_year","creation"],
#         order_by="financial_year asc, month asc", ignore_permissions=True)

#     if (start_date or end_date) and util_docs:
#         util_docs = [d for d in util_docs if d.creation
#             and (not start_date or getdate(str(d.creation)[:10]) >= getdate(start_date))
#             and (not end_date   or getdate(str(d.creation)[:10]) <= getdate(end_date))]

#     if not util_docs: return {"months": [], "records": []}

#     records = []; seen = []
#     for doc in util_docs:
#         items = frappe.get_all("Utilisation Items",
#             filters={"parent": doc.name, "parenttype": "Creche utilisation"},
#             fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
#                     "budget_sub_head","total_amount","notes"],
#             order_by="budget_main_head asc, type_of_expenses asc", ignore_permissions=True)
#         ml = doc.month or "Unknown"
#         records.append({"month": ml, "financial_year": doc.financial_year or "",
#                         "utilisation_id": doc.name,
#                         "items": [{"type_of_expenses_id": r.type_of_expenses_id,
#                                    "type_of_expenses": r.type_of_expenses,
#                                    "budget_main_head": r.budget_main_head,
#                                    "budget_sub_head": r.budget_sub_head,
#                                    "total_amount": flt(r.total_amount), "notes": r.notes or ""}
#                                   for r in items]})
#         if ml not in seen: seen.append(ml)

#     def msort(m):
#         try: return MONTH_ORDER.index(m)
#         except: return 99
#     seen.sort(key=msort)
#     records.sort(key=lambda r: (r["financial_year"], msort(r["month"])))
#     return {"months": seen, "records": records}

# # ══════════════════════════════════════════════════════════════════════════
# # PENDING UTILIZATION
# # ══════════════════════════════════════════════════════════════════════════

# def _get_partner_emails(partner_ids):
#     email_map = {}
#     if not partner_ids: return email_map
#     perm_rows = frappe.db.sql(
#         """SELECT up.for_value AS partner_id, u.email
#            FROM `tabUser Permission` up
#            INNER JOIN `tabUser` u ON u.name = up.user AND u.enabled = 1
#            WHERE up.allow = 'Creche Partners' AND up.for_value IN %(pids)s
#            ORDER BY u.name""",
#         {"pids": partner_ids}, as_dict=True,
#     )
#     for row in perm_rows:
#         if row.partner_id not in email_map and row.email:
#             email_map[row.partner_id] = row.email

#     missing = [p for p in partner_ids if p not in email_map]
#     if missing:
#         for field in ("email", "email_id", "contact_email"):
#             try:
#                 rows = frappe.get_all("Creche Partners", filters={"name": ["in", missing]},
#                                       fields=["name", field], ignore_permissions=True)
#                 for r in rows:
#                     v = r.get(field, "")
#                     if v and r.name not in email_map:
#                         email_map[r.name] = v
#             except Exception:
#                 continue
#     return email_map

# def _get_partner_mobiles(partner_ids):
#     """
#     Return {partner_id: mobile_no} for given partner IDs.
#     Priority: User.mobile_no (via User Permission) → Creche Partners direct field.
#     """
#     mobile_map = {}
#     if not partner_ids:
#         return mobile_map

#     # Strategy 1: Get mobile_no from User doctype via User Permission link
#     try:
#         perm_rows = frappe.db.sql(
#             """
#             SELECT up.for_value AS partner_id, u.mobile_no
#             FROM `tabUser Permission` up
#             INNER JOIN `tabUser` u ON u.name = up.user AND u.enabled = 1
#             WHERE up.allow = 'Creche Partners'
#               AND up.for_value IN %(pids)s
#             ORDER BY u.name
#             """,
#             {"pids": partner_ids},
#             as_dict=True,
#         )
#         for row in perm_rows:
#             if row.partner_id not in mobile_map and row.mobile_no:
#                 mobile_map[row.partner_id] = str(row.mobile_no)
#     except Exception:
#         pass

#     # Strategy 2: fallback to direct field on Creche Partners doctype
#     missing = [p for p in partner_ids if p not in mobile_map]
#     if missing:
#         for field in ("mobile_no", "mobile", "phone", "contact_mobile"):
#             try:
#                 rows = frappe.get_all(
#                     "Creche Partners",
#                     filters={"name": ["in", missing]},
#                     fields=["name", field],
#                     ignore_permissions=True,
#                 )
#                 for r in rows:
#                     v = r.get(field, "")
#                     if v and r.name not in mobile_map:
#                         mobile_map[r.name] = str(v)
#             except Exception:
#                 continue

#     return mobile_map


# def _get_running_creches_count(permitted_partners=None):
#     """
#     Sum no_of_running_creches from the MOST RECENTLY MODIFIED utilization
#     record per budget. Uses `modified` (last updated) rather than `creation`.
#     """
#     try:
#         # Build optional partner filter
#         where_partner = ""
#         params_partner = []
#         if permitted_partners:
#             ph = ",".join(["%s"] * len(permitted_partners))
#             where_partner = f"WHERE partner_id IN ({ph})"
#             params_partner = list(permitted_partners)

#         # Get the latest modified record per budget, then sum the field
#         rows = frappe.db.sql(
#             f"""
#             SELECT cu.no_of_running_creches
#             FROM `tabCreche utilisation` cu
#             INNER JOIN (
#                 SELECT budget_reference_id, MAX(modified) AS max_m
#                 FROM `tabCreche utilisation`
#                 {where_partner}
#                 GROUP BY budget_reference_id
#             ) latest ON cu.budget_reference_id = latest.budget_reference_id
#                      AND cu.modified = latest.max_m
#             """,
#             params_partner,
#             as_dict=True,
#         )
#         return int(sum(int(r.no_of_running_creches or 0) for r in rows))
#     except Exception as e:
#         frappe.log_error(str(e), "get_running_creches_count")
#         return 0



# def _add_month(d):
#     if relativedelta:
#         return d + relativedelta(months=1)
#     y, m = d.year, d.month + 1
#     if m > 12: y += 1; m = 1
#     return _date(y, m, 1)

# @frappe.whitelist()
# def get_pending_utilisation_summary(cutoff_date=None, target_fy=None, target_month=None):
#     today = getdate(frappe.utils.nowdate())
#     if cutoff_date:
#         cutoff = getdate(cutoff_date)
#     else:
#         if today.day >= 5:
#             cutoff = today.replace(day=5)
#         else:
#             y, m = today.year, today.month - 1
#             if m < 1: y -= 1; m = 12
#             cutoff = _date(y, m, 5)

#     boundary_month_start = cutoff.replace(day=1)
#     permitted = _get_user_permitted_partners()
#     budget_filters = [
#         ["start_date", "is", "set"],
#         ["end_date", "is", "set"],
#         ["start_date", "<=", cutoff],
#     ]
#     if permitted is not None:
#         if not permitted:
#             return {"partners": [], "cutoff": str(cutoff)}
#         budget_filters.append(["partner_id", "in", permitted])

#     budgets = frappe.get_all(
#         "Creche Budget",
#         fields=["name","budget_reference_name","partner_id","partner_name",
#                 "grant_id","state","district","block","start_date","end_date"],
#         filters=budget_filters, ignore_permissions=True, limit_page_length=0,
#     )
#     if not budgets:
#         return {"partners": [], "cutoff": str(cutoff)}

#     budget_names = [b["name"] for b in budgets]
#     existing = set(
#         (r["budget_reference_id"], r["financial_year"], r["month"])
#         for r in frappe.get_all("Creche utilisation",
#             filters={"budget_reference_id": ["in", budget_names]},
#             fields=["budget_reference_id","financial_year","month"],
#             ignore_permissions=True, limit_page_length=0)
#     )

#     # When target_fy and target_month are given, only check that specific month
#     check_specific = bool(target_fy and target_month)

#     by_partner = {}
#     for b in budgets:
#         bud_start = getdate(b["start_date"])
#         bud_end   = getdate(b["end_date"])

#         missing_for_budget = []

#         if check_specific:
#             # Only check the one selected month
#             try:
#                 month_num = list(_calendar.month_name).index(target_month)  # 1-12
#             except ValueError:
#                 continue
#             fy_start_year = int(target_fy.split("-")[0])
#             year = fy_start_year if month_num >= 4 else fy_start_year + 1
#             month_start = _date(year, month_num, 1)

#             # Skip if this month is outside the budget period
#             if month_start < bud_start.replace(day=1) or month_start > bud_end.replace(day=1):
#                 continue
#             # Skip if submission already exists
#             if (b["name"], target_fy, target_month) in existing:
#                 continue

#             deadline = _add_month(month_start).replace(day=5)
#             days_overdue = (cutoff - deadline).days
#             missing_for_budget.append({
#                 "financial_year": target_fy, "month": target_month,
#                 "deadline": deadline.isoformat(),
#                 "days_overdue": max(days_overdue, 0),
#             })
#         else:
#             # Original logic: check all months from budget start to boundary
#             start = bud_start
#             end   = bud_end
#             effective_end = min(end.replace(day=1), boundary_month_start)
#             cursor = start.replace(day=1)
#             while cursor <= effective_end:
#                 month_name = MONTH_ORDER[cursor.month - 1]
#                 fy_label = (f"{cursor.year}-{str(cursor.year+1)[2:]}" if cursor.month >= 4
#                             else f"{cursor.year-1}-{str(cursor.year)[2:]}")
#                 if (b["name"], fy_label, month_name) not in existing:
#                     deadline = _add_month(cursor).replace(day=5)
#                     days_overdue = (cutoff - deadline).days
#                     missing_for_budget.append({
#                         "financial_year": fy_label, "month": month_name,
#                         "deadline": deadline.isoformat(),
#                         "days_overdue": max(days_overdue, 0),
#                     })
#                 cursor = _add_month(cursor)

#         if not missing_for_budget:
#             continue

#         pid = b["partner_id"] or b["partner_name"] or "Unknown"
#         if pid not in by_partner:
#             by_partner[pid] = {
#                 "partner_id": b["partner_id"], "partner_name": b["partner_name"],
#                 "missing_count": 0, "max_days_overdue": 0, "budgets": [],
#             }
#         entry = by_partner[pid]
#         entry["budgets"].append({
#             "budget_id": b["name"], "budget_reference_name": b["budget_reference_name"],
#             "grant_id": b["grant_id"], "state": b["state"],
#             "missing_months": missing_for_budget,
#         })
#         entry["missing_count"] += len(missing_for_budget)
#         entry["max_days_overdue"] = max(
#             entry["max_days_overdue"],
#             max((m["days_overdue"] for m in missing_for_budget), default=0),
#         )

#     partner_ids = [pid for pid in by_partner if pid]
#     email_map   = _get_partner_emails(partner_ids)
#     mobile_map  = _get_partner_mobiles(partner_ids)

#     result = []
#     for pid, entry in by_partner.items():
#         entry["email"]  = email_map.get(pid, "")
#         entry["mobile"] = mobile_map.get(pid, "")
#         result.append(entry)
#     result.sort(key=lambda r: (-r["max_days_overdue"], r["partner_name"] or ""))
#     return {"partners": result, "cutoff": str(cutoff)}

# @frappe.whitelist()
# def send_utilisation_reminder(partner_ids=None, custom_message=None):
#     if isinstance(partner_ids, str):
#         try: partner_ids = json.loads(partner_ids)
#         except Exception: partner_ids = [p.strip() for p in partner_ids.split(",") if p.strip()]
#     partner_ids = partner_ids or []
#     if not partner_ids: frappe.throw(frappe._("No partners selected"))

#     permitted = _get_user_permitted_partners()
#     if permitted is not None:
#         partner_ids = [p for p in partner_ids if p in permitted]
#         if not partner_ids: frappe.throw(frappe._("You do not have permission to email these partners"))

#     email_map = _get_partner_emails(partner_ids)
#     partner_names = {r.name: r.partner_name for r in frappe.get_all(
#         "Creche Partners", filters={"name": ["in", partner_ids]},
#         fields=["name","partner_name"], ignore_permissions=True)}

#     default_message = ("This is a reminder that your utilisation report submission is pending. "
#                        "Kindly submit it at the earliest to keep your budget records up to date.")
#     message_body = custom_message or default_message

#     sent, failed = [], []
#     for pid in partner_ids:
#         email = email_map.get(pid)
#         pname = partner_names.get(pid, pid)
#         if not email:
#             failed.append({"partner_id": pid, "partner_name": pname, "reason": "No email on file"})
#             continue
#         try:
#             frappe.sendmail(
#                 recipients=[email],
#                 subject="Utilisation Report Submission Reminder",
#                 message=f"<p>Dear {frappe.utils.escape_html(pname)},</p><p>{frappe.utils.escape_html(message_body)}</p>",
#                 now=True,
#             )
#             sent.append({"partner_id": pid, "partner_name": pname, "email": email})
#         except Exception as e:
#             failed.append({"partner_id": pid, "partner_name": pname, "reason": str(e)})

#     return {"sent": sent, "failed": failed}

# # ══════════════════════════════════════════════════════════════════════════
# # EXPORT
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def export_table(title="Report", columns=None, rows=None, format="xlsx"):
#     if isinstance(columns, str): columns = json.loads(columns)
#     if isinstance(rows, str):    rows    = json.loads(rows)
#     columns = columns or []; rows = rows or []

#     if format == "pdf":
#         file_url = _export_pdf(title, columns, rows)
#     else:
#         file_url = _export_xlsx(title, columns, rows)
#     return {"file_url": file_url}

# def _is_total_row(row, columns):
#     if not columns: return False
#     return str(row.get(columns[0].get("key"), "")).strip().lower() == "total"

# def _export_xlsx(title, columns, rows):
#     try:
#         from openpyxl import Workbook
#         from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
#         from openpyxl.utils import get_column_letter
#     except ImportError:
#         frappe.throw(frappe._("openpyxl is required for Excel export."))

#     wb = Workbook(); ws = wb.active; ws.title = (title or "Data")[:31]
#     NAVY="1E3A5F"; LIGHTBLUE="BFDBFE"; BORDER_C="93C5FD"; GRID_C="E2E8F0"; GROUP_FILL="DBEAFE"
#     thin_grid = Border(left=Side(style="thin",color=GRID_C),right=Side(style="thin",color=GRID_C),
#                        top=Side(style="thin",color=GRID_C),bottom=Side(style="thin",color=GRID_C))
#     thin_hdr  = Border(left=Side(style="thin",color=BORDER_C),right=Side(style="thin",color=BORDER_C),
#                        top=Side(style="thin",color=BORDER_C),bottom=Side(style="thin",color=BORDER_C))
#     header_font = Font(bold=True,color="FFFFFF",size=10)
#     header_fill = PatternFill(start_color=NAVY,end_color=NAVY,fill_type="solid")
#     total_font  = Font(bold=True,color=NAVY,size=11)
#     total_fill  = PatternFill(start_color=LIGHTBLUE,end_color=LIGHTBLUE,fill_type="solid")
#     group_font  = Font(bold=True,color=NAVY,size=10.5)
#     group_fill  = PatternFill(start_color=GROUP_FILL,end_color=GROUP_FILL,fill_type="solid")

#     for ci, col in enumerate(columns, start=1):
#         c = ws.cell(row=1,column=ci,value=col.get("label",""))
#         c.font=header_font; c.fill=header_fill; c.border=thin_hdr
#         c.alignment=Alignment(horizontal="center",vertical="center",wrap_text=True)

#     ncols = max(len(columns),1); r_idx = 2
#     for row in rows:
#         if row.get("__group__"):
#             ws.merge_cells(start_row=r_idx,start_column=1,end_row=r_idx,end_column=max(ncols-1,1))
#             lc = ws.cell(row=r_idx,column=1,value=row.get("label",""))
#             lc.font=group_font; lc.fill=group_fill; lc.border=thin_hdr
#             lc.alignment=Alignment(horizontal="left",vertical="center",indent=1)
#             sc = ws.cell(row=r_idx,column=ncols,value=row.get("subtotal",""))
#             sc.font=group_font; sc.fill=group_fill; sc.border=thin_hdr
#             sc.alignment=Alignment(horizontal="right",vertical="center")
#             r_idx += 1; continue

#         total_row = _is_total_row(row, columns)
#         for ci, col in enumerate(columns, start=1):
#             val = row.get(col.get("key"),"")
#             align = col.get("align","left")
#             cell = ws.cell(row=r_idx,column=ci)
#             if align=="right" and isinstance(val,(int,float)):
#                 cell.value=val; cell.number_format="#,##0.00"
#             else:
#                 cell.value=val
#             cell.alignment=Alignment(horizontal=align)
#             if total_row: cell.font=total_font; cell.fill=total_fill; cell.border=thin_hdr
#             else: cell.border=thin_grid
#         r_idx += 1

#     for ci, col in enumerate(columns, start=1):
#         letter = get_column_letter(ci)
#         max_len = len(str(col.get("label","")))
#         for row in rows:
#             if row.get("__group__"): continue
#             v = row.get(col.get("key"),"")
#             max_len = max(max_len, len(str(v)))
#         ws.column_dimensions[letter].width = min(max_len+4, 42)
#     ws.freeze_panes = "A2"

#     buf = io.BytesIO(); wb.save(buf); buf.seek(0)
#     return _save_file(f"{_safe_fname(title)}.xlsx", buf.getvalue())

# def _export_pdf(title, columns, rows):
#     thead = "".join(f"<th>{frappe.utils.escape_html(c.get('label',''))}</th>" for c in columns)
#     ncols = max(len(columns), 1); body_rows = []
#     for row in rows:
#         if row.get("__group__"):
#             label   = frappe.utils.escape_html(row.get("label",""))
#             subtotal= frappe.utils.escape_html(row.get("subtotal",""))
#             body_rows.append(f'<tr class="group-row"><td colspan="{ncols}">'
#                              f'<span class="group-row__label">{label}</span>'
#                              f'<span class="group-row__subtotal">{subtotal}</span></td></tr>')
#             continue
#         total_row = _is_total_row(row, columns)
#         tds = [f'<td style="text-align:{c.get("align","left")}">{frappe.utils.escape_html(str(row.get(c.get("key"),"" )))}</td>'
#                for c in columns]
#         body_rows.append(f'<tr{"  class=\"total-row\"" if total_row else ""}>{"".join(tds)}</tr>')

#     html = f"""<html><head><meta charset="utf-8">
#     <style>@page{{size:A4 portrait;margin:14mm 10mm}}*{{box-sizing:border-box;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif}}body{{color:#1f2937}}h1{{font-size:16px;font-weight:700;color:#1e3a5f;margin-bottom:4px}}.meta{{font-size:9px;color:#94a3b8;margin-bottom:12px}}table{{width:100%;border-collapse:collapse;font-size:10px}}th{{background:#1e3a5f;color:#fff;font-weight:700;text-transform:uppercase;font-size:8.5px;letter-spacing:.4px;padding:6px 8px;text-align:left;border:1px solid #93c5fd}}td{{padding:5px 8px;border:1px solid #e2e8f0}}tr.total-row td{{background:#bfdbfe;color:#1e3a5f;font-weight:700;border:1px solid #93c5fd}}tr.group-row td{{background:#dbeafe;color:#1e3a5f;font-weight:700;border:1px solid #93c5fd;padding:6px 8px}}.group-row__label{{display:inline-block}}.group-row__subtotal{{float:right}}tr:nth-child(even):not(.total-row):not(.group-row) td{{background:#f8fafc}}</style>
#     </head><body>
#     <h1>{frappe.utils.escape_html(title or "Report")}</h1>
#     <div class="meta">Exported {frappe.utils.now_datetime().strftime("%d %b %Y, %I:%M %p")} by {frappe.session.user}</div>
#     <table><thead><tr>{thead}</tr></thead><tbody>{"".join(body_rows)}</tbody></table>
#     </body></html>"""

#     from frappe.utils.pdf import get_pdf
#     pdf_content = get_pdf(html, options={"page-size":"A4","orientation":"Portrait"})
#     return _save_file(f"{_safe_fname(title)}.pdf", pdf_content)

# def _safe_fname(title):
#     import re
#     base = re.sub(r"[^A-Za-z0-9_-]+","_",title or "report").strip("_") or "report"
#     return base[:80]

# def _save_file(fname, content):
#     f = frappe.get_doc({"doctype":"File","file_name":fname,"is_private":0,"content":content})
#     f.save(ignore_permissions=True)
#     return f.file_url











# """
# creche_reports/api/creche_dashboard.py

# All server-side methods for the Creche Dashboard page.
# """

# import frappe
# from frappe.utils import flt, getdate, nowdate, add_days, now_datetime, get_datetime, get_url
# from datetime import date as _date, datetime, timedelta as _timedelta
# import calendar as _calendar
# import json
# import io

# try:
#     from dateutil.relativedelta import relativedelta
# except ImportError:
#     relativedelta = None

# MONTH_ORDER = [
#     "January","February","March","April","May","June",
#     "July","August","September","October","November","December",
# ]

# # ══════════════════════════════════════════════════════════════════════════
# # DATE / PRORATA HELPERS
# # ══════════════════════════════════════════════════════════════════════════

# def _to_date(v):
#     if not v: return None
#     if isinstance(v, _date): return v
#     return _date.fromisoformat(str(v)[:10])

# def _add_months_safe(d, n):
#     """Add n calendar months to date d, clamping day to month-end."""
#     if relativedelta:
#         return d + relativedelta(months=n)
#     m = d.month - 1 + n
#     year  = d.year + m // 12
#     month = m % 12 + 1
#     day   = min(d.day, _calendar.monthrange(year, month)[1])
#     return _date(year, month, day)

# def _count_calendar_months(start, end):
#     """Count distinct calendar months from start to end inclusive."""
#     if not start or not end or start > end:
#         return 0
#     count = 0
#     y, m = start.year, start.month
#     ey, em = end.year, end.month
#     while (y, m) <= (ey, em):
#         count += 1
#         m += 1
#         if m > 12:
#             m, y = 1, y + 1
#     return count

# def _prorata_by_budget_year(year_1, year_2, year_3, bud_start, bud_end, filter_segments):
#     """
#     Calculate prorated budget using budget-year periods (NOT financial-year periods).

#     Y1 = first 12 months from budget start date
#     Y2 = months 13-24 from budget start date
#     Y3 = months 25-36 from budget start date

#     For each year period that overlaps a filter segment:
#         contribution = year_amount / 12 * months_in_overlap

#     Returns dict with keys: total, year_1, year_2, year_3
#     """
#     empty = {"total": 0.0, "year_1": 0.0, "year_2": 0.0, "year_3": 0.0}
#     bud_s = _to_date(bud_start)
#     bud_e = _to_date(bud_end)
#     if not bud_s or not bud_e:
#         return empty

#     year_amounts = [float(year_1 or 0), float(year_2 or 0), float(year_3 or 0)]
#     scaled = [0.0, 0.0, 0.0]

#     for i, yr_amt in enumerate(year_amounts):
#         if not yr_amt:
#             continue
#         yr_s = _add_months_safe(bud_s, i * 12)
#         yr_e = _add_months_safe(bud_s, (i + 1) * 12) - _timedelta(days=1)
#         yr_e = min(yr_e, bud_e)
#         if yr_s > bud_e:
#             break  # all remaining years are also beyond budget end

#         for seg_s, seg_e in filter_segments:
#             ov_s = max(seg_s, yr_s)
#             ov_e = min(seg_e, yr_e)
#             if ov_s > ov_e:
#                 continue
#             months = _count_calendar_months(ov_s, ov_e)
#             if months > 0:
#                 scaled[i] += yr_amt / 12.0 * months

#     return {
#         "total":  round(scaled[0] + scaled[1] + scaled[2], 2),
#         "year_1": round(scaled[0], 2),
#         "year_2": round(scaled[1], 2),
#         "year_3": round(scaled[2], 2),
#     }

# def _compute_prorata_budget(budget_name, bud_start, bud_end, filter_segments):
#     """
#     Compute prorated total budget for a Creche Budget document.
#     Uses budget-year-based proration (not financial-year-based).
#     """
#     if not filter_segments:
#         return None

#     rows = frappe.db.sql(
#         """SELECT SUM(COALESCE(year_1,0)) AS year_1,
#                   SUM(COALESCE(year_2,0)) AS year_2,
#                   SUM(COALESCE(year_3,0)) AS year_3
#            FROM `tabBudget Items`
#            WHERE parent = %s AND parenttype = 'Creche Budget'""",
#         (budget_name,), as_dict=True,
#     )
#     if not rows or not rows[0]:
#         return 0.0

#     raw = rows[0]
#     result = _prorata_by_budget_year(
#         raw.get("year_1") or 0,
#         raw.get("year_2") or 0,
#         raw.get("year_3") or 0,
#         bud_start, bud_end, filter_segments,
#     )
#     return result["total"]

# def _build_filter_segments(filters):
#     raw_start = _to_date(filters.get("start_date"))
#     raw_end   = _to_date(filters.get("end_date"))

#     filter_fys = filters.get("financial_year") or []
#     if isinstance(filter_fys, str): filter_fys = [filter_fys]
#     filter_fys = list(filter_fys)

#     month_raw = filters.get("month") or []
#     if isinstance(month_raw, str): month_raw = [month_raw] if month_raw.strip() else []
#     month_filters = [m.strip() for m in month_raw if str(m).strip()]

#     if raw_start or raw_end:
#         from datetime import timedelta
#         seg_s = raw_start or (raw_end - timedelta(days=3*366))
#         seg_e = raw_end   or (raw_start + timedelta(days=3*366))
#         return [(seg_s, seg_e)]

#     if filter_fys and month_filters:
#         segs = []
#         for fy in filter_fys:
#             fy_start_year = int(fy.split("-")[0])
#             for mn in month_filters:
#                 month_num = list(_calendar.month_name).index(mn)
#                 year      = fy_start_year if month_num >= 4 else fy_start_year + 1
#                 last_day  = _calendar.monthrange(year, month_num)[1]
#                 segs.append((_date(year, month_num, 1), _date(year, month_num, last_day)))
#         return segs

#     if filter_fys:
#         segs = []
#         for fy in filter_fys:
#             y = int(fy.split("-")[0])
#             segs.append((_date(y, 4, 1), _date(y + 1, 3, 31)))
#         return segs

#     return []

# # ══════════════════════════════════════════════════════════════════════════
# # PERMISSION HELPERS
# # ══════════════════════════════════════════════════════════════════════════

# def _get_user_permitted_partners():
#     user  = frappe.session.user
#     roles = frappe.get_roles(user)
#     if "System Manager" in roles or user == "Administrator":
#         return None
#     rows = frappe.db.sql(
#         "SELECT for_value FROM `tabUser Permission` WHERE user = %s AND allow = 'Creche Partners'",
#         (user,), as_dict=True,
#     )
#     if not rows: return None
#     return [r.for_value for r in rows if r.for_value]

# def _intersect(filter_list, permitted):
#     if permitted is None: return filter_list
#     if not permitted: return []
#     if not filter_list: return permitted
#     pset = set(permitted)
#     return [p for p in filter_list if p in pset]

# def _empty_summary():
#     return {
#         "total_budget":0,"total_disbursement":0,
#         "total_utilisation":0,"total_bank_balance":0,
#         "total_interest":0,"total_creches":0,
#         "utilisation_pct":0,"disbursement_pct":0,
#     }

# def _assert_partner_access(partner_id: str):
#     permitted = _get_user_permitted_partners()
#     if permitted is None: return
#     if partner_id not in permitted:
#         frappe.throw(frappe._("You do not have permission to access this partner"), frappe.PermissionError)

# # ══════════════════════════════════════════════════════════════════════════
# # PARTNER OPTIONS
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_partner_options(txt=""):
#     permitted = _get_user_permitted_partners()
#     filters   = {}
#     if permitted is not None:
#         if not permitted: return []
#         filters["name"] = ["in", permitted]
#     if txt:
#         filters["partner_name"] = ["like", f"%{txt}%"]
#     rows = frappe.get_all("Creche Partners", filters=filters, fields=["name","partner_name"],
#                           order_by="partner_name asc", limit=500, ignore_permissions=True)
#     return [{"name": r.name, "partner_name": r.partner_name or r.name} for r in rows]

# @frappe.whitelist()
# def get_user_permission_scope():
#     permitted = _get_user_permitted_partners()
#     if permitted is None: return {"restricted": False, "partner_ids": []}
#     return {"restricted": True, "partner_ids": permitted}

# # ══════════════════════════════════════════════════════════════════════════
# # MAIN SUMMARY
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_partner_budget_summary(filters=None):
#     if isinstance(filters, str):
#         filters = json.loads(filters)
#     filters = filters or {}

#     permitted          = _get_user_permitted_partners()
#     filter_partners    = filters.get("partner_id") or None
#     effective_partners = _intersect(filter_partners, permitted)

#     if effective_partners is not None and len(effective_partners) == 0:
#         return {"summary": _empty_summary(), "partners": []}

#     start_date = filters.get("start_date") or None
#     end_date   = filters.get("end_date")   or None

#     filter_segments = _build_filter_segments(filters)
#     apply_prorata   = bool(filter_segments)

#     budget_filters = {}
#     if effective_partners:
#         budget_filters["partner_id"] = ["in", effective_partners]
#     if filters.get("budget_ref"):
#         budget_filters["budget_reference_name"] = ["in", filters["budget_ref"]]
#     if filters.get("grant_id"):
#         budget_filters["grant_id"] = ["in", filters["grant_id"]]
#     if filters.get("state"):
#         budget_filters["state"] = ["in", filters["state"]]
#     if filters.get("district"):
#         budget_filters["district"] = ["in", filters["district"]]
#     if filters.get("block"):
#         budget_filters["block"] = ["in", filters["block"]]
#     if start_date:
#         budget_filters["end_date"]   = [">=", start_date]
#     if end_date:
#         budget_filters["start_date"] = ["<=", end_date]

#     budgets = frappe.get_all(
#         "Creche Budget", filters=budget_filters,
#         fields=["name","partner_id","partner_name","grant_id","budget_reference_name",
#                 "state","district","block","start_date","end_date","financial_year",
#                 "no_of_creches","total_budget"],
#         order_by="partner_name asc, budget_reference_name asc",
#         ignore_permissions=True,
#     )

#     budget_ids = [b.name for b in budgets]

#     # ── Budget Items sums (bulk) ──────────────────────────────────────────
#     budget_items_map = {}
#     if budget_ids:
#         ph_bi = ", ".join([f"%(bim{i})s" for i in range(len(budget_ids))])
#         bim_params = {f"bim{i}": n for i, n in enumerate(budget_ids)}
#         bi_rows = frappe.db.sql(
#             "SELECT parent,"
#             " SUM(COALESCE(year_1,0)) AS year_1,"
#             " SUM(COALESCE(year_2,0)) AS year_2,"
#             " SUM(COALESCE(year_3,0)) AS year_3"
#             " FROM `tabBudget Items`"
#             f" WHERE parent IN ({ph_bi}) AND parenttype = 'Creche Budget'"
#             " GROUP BY parent",
#             bim_params, as_dict=True,
#         )
#         for r in bi_rows:
#             budget_items_map[r.parent] = {
#                 "year_1": float(r.year_1 or 0),
#                 "year_2": float(r.year_2 or 0),
#                 "year_3": float(r.year_3 or 0),
#                 "total":  float(r.year_1 or 0) + float(r.year_2 or 0) + float(r.year_3 or 0),
#             }

#     # ── Disbursement (date-based) ─────────────────────────────────────────
#     disbursement_map = {}
#     if budget_ids:
#         disb_headers = frappe.get_all("Creche Disbursement",
#             filters={"budget_reference_id": ["in", budget_ids]},
#             fields=["name","budget_reference_id"], ignore_permissions=True)
#         disb_parent_names = [d.name for d in disb_headers]
#         disb_bid_map = {d.name: d.budget_reference_id for d in disb_headers}

#         if disb_parent_names:
#             tracker_rows = frappe.get_all("Disbursement Tracker",
#                 filters={"parent": ["in", disb_parent_names], "parenttype": "Creche Disbursement"},
#                 fields=["parent","date_of_disbursement","disbursed_amount"],
#                 ignore_permissions=True)

#             if filter_segments:
#                 tracker_rows = [
#                     t for t in tracker_rows
#                     if t.date_of_disbursement and any(
#                         seg_s <= getdate(str(t.date_of_disbursement)) <= seg_e
#                         for seg_s, seg_e in filter_segments
#                     )
#                 ]
#             elif start_date or end_date:
#                 tracker_rows = [
#                     t for t in tracker_rows
#                     if t.date_of_disbursement
#                     and (not start_date or getdate(str(t.date_of_disbursement)) >= getdate(start_date))
#                     and (not end_date   or getdate(str(t.date_of_disbursement)) <= getdate(end_date))
#                 ]

#             for t in tracker_rows:
#                 bid = disb_bid_map.get(t.parent)
#                 if bid:
#                     disbursement_map[bid] = disbursement_map.get(bid, 0.0) + flt(t.disbursed_amount)

#     # ── Utilisation ───────────────────────────────────────────────────────
#     utilisation_map  = {}
#     bank_balance_map = {}
#     interest_map     = {}

#     if budget_ids:
#         filter_fys = filters.get("financial_year") or []
#         if isinstance(filter_fys, str): filter_fys = [filter_fys]
#         month_raw = filters.get("month") or []
#         if isinstance(month_raw, str): month_raw = [month_raw] if month_raw.strip() else []
#         month_filters = [m.strip() for m in month_raw if str(m).strip()]

#         util_extra  = ""
#         util_params = {}

#         if start_date and end_date:
#             def _local_fy_month_pairs(sd, ed):
#                 sd = _to_date(sd); ed = _to_date(ed)
#                 if not sd or not ed: return []
#                 pairs = []; cur = _date(sd.year, sd.month, 1)
#                 end_mo = _date(ed.year, ed.month, 1)
#                 while cur <= end_mo:
#                     fy = (f"{cur.year}-{str(cur.year+1)[2:]}" if cur.month >= 4
#                           else f"{cur.year-1}-{str(cur.year)[2:]}")
#                     pairs.append((fy, _calendar.month_name[cur.month]))
#                     cur = (_date(cur.year+1,1,1) if cur.month==12
#                            else _date(cur.year, cur.month+1, 1))
#                 return pairs
#             pairs = _local_fy_month_pairs(start_date, end_date)
#             if pairs:
#                 clauses = []
#                 for i, (fy, mn) in enumerate(pairs):
#                     util_params[f"ufy{i}"] = fy; util_params[f"umn{i}"] = mn
#                     clauses.append(f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)")
#                 util_extra = " AND (" + " OR ".join(clauses) + ")"
#             else:
#                 util_extra = " AND 1=0"
#         elif filter_fys and month_filters:
#             clauses = []; k = 0
#             for fy in sorted(filter_fys):
#                 for mn in month_filters:
#                     util_params[f"ufy{k}"] = fy; util_params[f"umn{k}"] = mn
#                     clauses.append(f"(cu.financial_year = %(ufy{k})s AND cu.month = %(umn{k})s)")
#                     k += 1
#             util_extra = " AND (" + " OR ".join(clauses) + ")"
#         elif filter_fys:
#             ph = ", ".join([f"%(ufy{i})s" for i in range(len(filter_fys))])
#             for i, fy in enumerate(filter_fys): util_params[f"ufy{i}"] = fy
#             util_extra = f" AND cu.financial_year IN ({ph})"
#         elif month_filters:
#             ph = ", ".join([f"%(umn{i})s" for i in range(len(month_filters))])
#             for i, m in enumerate(month_filters): util_params[f"umn{i}"] = m
#             util_extra = f" AND cu.month IN ({ph})"
#         elif start_date:
#             from datetime import date as _dt_today
#             today = _dt_today.today()
#             def _lp(sd, ed):
#                 sd = _to_date(sd); ed = _to_date(ed)
#                 if not sd or not ed: return []
#                 pairs = []; cur = _date(sd.year, sd.month, 1)
#                 end_mo = _date(ed.year, ed.month, 1)
#                 while cur <= end_mo:
#                     fy = (f"{cur.year}-{str(cur.year+1)[2:]}" if cur.month >= 4
#                           else f"{cur.year-1}-{str(cur.year)[2:]}")
#                     pairs.append((fy, _calendar.month_name[cur.month]))
#                     cur = (_date(cur.year+1,1,1) if cur.month==12
#                            else _date(cur.year, cur.month+1, 1))
#                 return pairs
#             pairs = _lp(start_date, today)
#             if pairs:
#                 clauses = []
#                 for i, (fy, mn) in enumerate(pairs):
#                     util_params[f"ufy{i}"] = fy; util_params[f"umn{i}"] = mn
#                     clauses.append(f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)")
#                 util_extra = " AND (" + " OR ".join(clauses) + ")"

#         bid_ph = ", ".join([f"%(bid{i})s" for i in range(len(budget_ids))])
#         for i, n in enumerate(budget_ids): util_params[f"bid{i}"] = n

#         util_rows = frappe.db.sql(
#             f"""SELECT cu.budget_reference_id, SUM(ui.total_amount) AS total_util
#                 FROM `tabCreche utilisation` cu
#                 INNER JOIN `tabUtilisation Items` ui ON ui.parent = cu.name AND ui.parenttype = 'Creche utilisation'
#                 WHERE cu.budget_reference_id IN ({bid_ph}) {util_extra}
#                 GROUP BY cu.budget_reference_id""",
#             util_params, as_dict=True,
#         )
#         for r in util_rows:
#             utilisation_map[r.budget_reference_id] = flt(r.total_util)

#         interest_rows = frappe.db.sql(
#             f"""SELECT budget_reference_id, SUM(interest_from_bank) AS total_interest
#                 FROM `tabCreche utilisation`
#                 WHERE budget_reference_id IN ({bid_ph}) {util_extra.replace("cu.", "")}
#                 GROUP BY budget_reference_id""",
#             util_params, as_dict=True,
#         )
#         for r in interest_rows:
#             interest_map[r.budget_reference_id] = flt(r.total_interest)

#         # Bank balance: from the MOST RECENTLY MODIFIED utilisation record per budget
#         # (within the active filter period if one is set; otherwise globally latest)
#         try:
#             bank_balance_map = {}
#             bb_rows = frappe.db.sql(
#                 f"""
#                 SELECT cu.budget_reference_id, cu.balance_amount
#                 FROM `tabCreche utilisation` cu
#                 INNER JOIN (
#                     SELECT budget_reference_id, MAX(modified) AS max_m
#                     FROM `tabCreche utilisation`
#                     WHERE budget_reference_id IN ({bid_ph})
#                     {util_extra.replace("cu.", "") if util_extra else ""}
#                     GROUP BY budget_reference_id
#                 ) latest ON cu.budget_reference_id = latest.budget_reference_id
#                          AND cu.modified = latest.max_m
#                 """,
#                 util_params, as_dict=True,
#             )
#             for r in bb_rows:
#                 bank_balance_map[r.budget_reference_id] = flt(r.balance_amount)
#         except Exception as e:
#             frappe.log_error(str(e), "bank_balance_map_error")
#             bank_balance_map = {}

#     # ── Running creches per budget (from latest modified utilization) ──────
#     running_creches_map = {}
#     if budget_ids:
#         try:
#             rc_ph = ", ".join(["%s"] * len(budget_ids))
#             rc_rows = frappe.db.sql(
#                 f"""
#                 SELECT cu.budget_reference_id, COALESCE(cu.no_of_running_creches, 0) AS rc
#                 FROM `tabCreche utilisation` cu
#                 INNER JOIN (
#                     SELECT budget_reference_id, MAX(modified) AS max_m
#                     FROM `tabCreche utilisation`
#                     WHERE budget_reference_id IN ({rc_ph})
#                     GROUP BY budget_reference_id
#                 ) latest ON cu.budget_reference_id = latest.budget_reference_id
#                          AND cu.modified = latest.max_m
#                 """,
#                 budget_ids, as_dict=True,
#             )
#             for r in rc_rows:
#                 running_creches_map[r.budget_reference_id] = int(r.rc or 0)
#         except Exception:
#             pass

#     # ── Assemble results ──────────────────────────────────────────────────

#     partners = {}
#     grand = dict(budget=0.0, disbursement=0.0, utilisation=0.0, bank_balance=0.0, interest=0.0, creches=0)

#     for budget in budgets:
#         bid = budget.name
#         bi  = budget_items_map.get(bid)
#         if bi is None:
#             # No Budget Items rows found at all for this budget — fall back to
#             # the stored total_budget field only in this edge case (a budget
#             # with zero configured line items still needs *some* number).
#             bi = {"year_1": 0, "year_2": 0, "year_3": 0, "total": flt(budget.total_budget)}

#         if apply_prorata:
#             pr = _prorata_by_budget_year(
#                 bi["year_1"], bi["year_2"], bi["year_3"],
#                 budget.start_date, budget.end_date, filter_segments,
#             )
#             budget_amount = pr["total"]
#         else:
#             # ── FIX #1/#2 ──
#             # Always derive the budget amount from Budget Items
#             # (year_1 + year_2 + year_3), never silently substitute the
#             # stored total_budget field just because the line-item sum is
#             # zero. Falling back on a "truthy" check meant any budget whose
#             # line items legitimately summed to 0 would show the stale
#             # total_budget value on the summary card while the drill-down
#             # (which always sums line items) showed 0 — causing the
#             # card-vs-drilldown mismatch. Now both always agree.
#             budget_amount = bi["total"]

#         disbursement = flt(disbursement_map.get(bid, 0))
#         utilisation  = flt(utilisation_map.get(bid, 0))
#         bank_balance = flt(bank_balance_map.get(bid, 0))
#         interest     = flt(interest_map.get(bid, 0))
#         creches      = int(budget.no_of_creches or 0)

#         balance_budget            = budget_amount - utilisation
#         utilised_pct              = round((utilisation / budget_amount * 100) if budget_amount else 0, 2)
#         utilised_disbursement_pct = round((utilisation / disbursement * 100)  if disbursement  else 0, 2)

#         partner_key = budget.partner_id or budget.partner_name or "Unknown"
#         if partner_key not in partners:
#             partners[partner_key] = {
#                 "partner_id": budget.partner_id, "partner_name": budget.partner_name,
#                 "total_budget":0.0,"total_disbursement":0.0,"total_utilisation":0.0,
#                 "total_balance_budget":0.0,"total_bank_balance":0.0,
#                 "total_interest":0.0,"total_creches":0,"total_running_creches":0,"budgets":[],
#             }
#         p = partners[partner_key]
#         p["total_budget"]         += budget_amount
#         p["total_disbursement"]   += disbursement
#         p["total_utilisation"]    += utilisation
#         p["total_balance_budget"] += balance_budget
#         # SUM bank balances per partner (consistent with grand total which also sums)
#         p["total_bank_balance"] += bank_balance
#         budget_running = running_creches_map.get(bid, 0)
#         p["total_interest"]       += interest
#         p["total_creches"]        += creches
#         p.setdefault("total_running_creches", 0)
#         p["total_running_creches"] += budget_running
#         p["budgets"].append({
#             "budget_id": bid, "grant_id": budget.grant_id,
#             "budget_reference_name": budget.budget_reference_name,
#             "state": budget.state, "district": budget.district, "block": budget.block,
#             "grant_start": budget.start_date, "grant_end": budget.end_date,
#             "financial_year": budget.financial_year, "no_of_creches": creches,
#             "budget": budget_amount, "disbursement": disbursement,
#             "utilisation": utilisation, "utilised_pct": utilised_pct,
#             "utilised_disbursement_pct": utilised_disbursement_pct,
#             "balance_budget_amount": balance_budget,
#             "bank_balance": bank_balance, "interest_from_bank": interest,
#             "running_creches": budget_running,
#         })

#         grand["budget"]       += budget_amount
#         grand["disbursement"] += disbursement
#         grand["utilisation"]  += utilisation
#         grand["bank_balance"] += bank_balance
#         grand["interest"]     += interest
#         grand["creches"]      += creches

#     result = []
#     for p in partners.values():
#         p["utilised_pct"] = round((p["total_utilisation"] / p["total_budget"] * 100) if p["total_budget"] else 0, 2)
#         p["grant_ids"]    = ", ".join(sorted(set(b["grant_id"] for b in p["budgets"] if b["grant_id"])))
#         p["budgets"]      = sorted(p["budgets"], key=lambda x: x["budget_reference_name"] or "")
#         result.append(p)
#     result.sort(key=lambda x: x["partner_name"] or "")

#     gb = grand["budget"]
#     # Get running creches from most recent utilisation records
#     running_creches = _get_running_creches_count(
#         effective_partners if effective_partners else None
#     )
#     return {
#         "summary": {
#             "total_budget":       grand["budget"],
#             "total_disbursement": grand["disbursement"],
#             "total_utilisation":  grand["utilisation"],
#             "total_bank_balance": grand["bank_balance"],
#             "total_interest":     grand["interest"],
#             "total_creches":      grand["creches"],
#             "running_creches":    running_creches,
#             "utilisation_pct":    round((grand["utilisation"]  / gb * 100) if gb else 0, 2),
#             "disbursement_pct":   round((grand["disbursement"] / gb * 100) if gb else 0, 2),
#         },
#         "partners": result,
#     }

# # ══════════════════════════════════════════════════════════════════════════
# # DISBURSEMENT PANEL DATA
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_disbursement_panel_data(budget_ids=None, partner_ids=None, start_date=None, end_date=None,
#                                 financial_year=None, month=None):
#     permitted = _get_user_permitted_partners()
#     def _to_list(v):
#         if not v: return []
#         if isinstance(v, str):
#             try:
#                 p = json.loads(v)
#                 if isinstance(p, list): return [x for x in p if x]
#             except: pass
#             return [x.strip() for x in v.split(",") if x.strip()]
#         return [x for x in v if x]

#     budget_ids_list  = _to_list(budget_ids)
#     partner_ids_list = _to_list(partner_ids)
#     filter_fys       = _to_list(financial_year)
#     month_filters    = [m.strip() for m in _to_list(month) if str(m).strip()]

#     disb_filters = {}
#     if budget_ids_list:
#         if permitted is not None:
#             br = frappe.get_all("Creche Budget",
#                 filters={"name":["in",budget_ids_list]},
#                 fields=["name","partner_id"], ignore_permissions=True)
#             budget_ids_list = [r.name for r in br if r.partner_id in permitted]
#             if not budget_ids_list: return []
#         disb_filters["budget_reference_id"] = ["in", budget_ids_list]
#     elif partner_ids_list:
#         eff = _intersect(partner_ids_list, permitted)
#         if eff is not None and not eff: return []
#         if eff: disb_filters["partner_id"] = ["in", eff]
#         elif permitted is not None: return []
#     else:
#         if permitted is not None:
#             if not permitted: return []
#             disb_filters["partner_id"] = ["in", permitted]

#     disb_docs = frappe.get_all("Creche Disbursement", filters=disb_filters,
#         fields=["name","budget_reference_id","budget_reference_name","partner_id","partner_name",
#                 "grant_id","state","district","block","financial_year",
#                 "total_disbursement","balence_budget","total_budget"],
#         order_by="partner_name asc, budget_reference_name asc", ignore_permissions=True)
#     if not disb_docs: return []

#     parent_names = [d.name for d in disb_docs]
#     tracker_rows = frappe.get_all("Disbursement Tracker",
#         filters={"parent":["in",parent_names],"parenttype":"Creche Disbursement"},
#         fields=["parent","date_of_disbursement","disbursed_amount"],
#         order_by="date_of_disbursement asc", ignore_permissions=True)

#     filter_segments = _build_filter_segments({
#         "start_date": start_date, "end_date": end_date,
#         "financial_year": filter_fys, "month": month_filters,
#     })
#     period_active = bool(filter_segments) or bool(start_date) or bool(end_date)

#     if filter_segments:
#         tracker_rows = [
#             t for t in tracker_rows
#             if t.date_of_disbursement and any(
#                 seg_s <= getdate(str(t.date_of_disbursement)) <= seg_e
#                 for seg_s, seg_e in filter_segments
#             )
#         ]
#     elif start_date or end_date:
#         tracker_rows = [t for t in tracker_rows
#             if t.date_of_disbursement
#             and (not start_date or getdate(str(t.date_of_disbursement)) >= getdate(start_date))
#             and (not end_date   or getdate(str(t.date_of_disbursement)) <= getdate(end_date))]

#     tracker_map = {}
#     for t in tracker_rows:
#         tracker_map.setdefault(t.parent, []).append({
#             "date_of_disbursement": str(t.date_of_disbursement) if t.date_of_disbursement else "",
#             "disbursed_amount": flt(t.disbursed_amount),
#         })

#     result = []
#     for doc in disb_docs:
#         ft = tracker_map.get(doc.name, [])
#         # ── FIX #1/#2 ──
#         # Always sum from Disbursement Tracker rows, never fall back to the
#         # stored total_disbursement field on the parent doc. Previously this
#         # fell back to the stored field whenever no period filter was
#         # active, while the summary card (get_partner_budget_summary)
#         # always summed tracker rows — any drift between the stored field
#         # and the tracker rows showed up as a card-vs-drilldown mismatch.
#         ftotal = sum(flt(t["disbursed_amount"]) for t in ft)
#         result.append({
#             "name": doc.name, "budget_reference_id": doc.budget_reference_id or "",
#             "budget_reference_name": doc.budget_reference_name or "",
#             "partner_id": doc.partner_id or "", "partner_name": doc.partner_name or "",
#             "grant_id": doc.grant_id or "", "state": doc.state or "",
#             "district": doc.district or "", "block": doc.block or "",
#             "financial_year": doc.financial_year or "",
#             "total_budget": flt(doc.total_budget), "total_disbursement": ftotal,
#             "balence_budget": flt(doc.total_budget) - ftotal,
#             "tracker": ft,
#         })
#     if period_active:
#         result = [r for r in result if r["tracker"]]
#     return result

# # ══════════════════════════════════════════════════════════════════════════
# # BUDGET LINE ITEMS — UPDATED: uses _prorata_by_budget_year
# # ══════════════════════════════════════════════════════════════════════════

# def _budget_month_labels(bud_start, bud_end):
#     """
#     List of {"label","year","month"} dicts for every calendar month from
#     bud_start to bud_end inclusive (e.g. "Apr 2025"). Capped at 60 months
#     as a sane upper bound so a bad/blank end_date can't runaway-loop.
#     """
#     months = []
#     if not bud_start or not bud_end or bud_start > bud_end:
#         return months
#     cur = _date(bud_start.year, bud_start.month, 1)
#     end_marker = _date(bud_end.year, bud_end.month, 1)
#     guard = 0
#     while cur <= end_marker and guard < 60:
#         months.append({
#             "label": f"{MONTH_ORDER[cur.month-1][:3]} {cur.year}",
#             "year": cur.year, "month": cur.month,
#         })
#         cur = _add_months_safe(cur, 1)
#         guard += 1
#     return months

# def _parse_list_param(v):
#     if not v: return []
#     if isinstance(v, list): return [x for x in v if x]
#     try:
#         p = json.loads(v)
#         if isinstance(p, list): return [x for x in p if x]
#     except Exception:
#         pass
#     return [x.strip() for x in str(v).split(",") if x.strip()]

# def _filter_budget_months(months, bud_start, bud_end, start_date=None, end_date=None,
#                            financial_year=None, month=None):
#     """
#     Narrow an already-computed month list (see _budget_month_labels) down
#     to whatever the dashboard's active filters ask for. Never widens
#     beyond the budget's own start/end — that's already baked into
#     `months` before this is called.
#     """
#     filter_fys    = _parse_list_param(financial_year)
#     month_filters = [m.strip() for m in _parse_list_param(month) if str(m).strip()]

#     if start_date or end_date:
#         sd = getdate(start_date) if start_date else bud_start
#         ed = getdate(end_date) if end_date else bud_end
#         sd_m = _date(sd.year, sd.month, 1)
#         ed_m = _date(ed.year, ed.month, 1)
#         return [m for m in months if sd_m <= _date(m["year"], m["month"], 1) <= ed_m]

#     if filter_fys or month_filters:
#         def _fy_of(y, mo):
#             return f"{y}-{str(y+1)[2:]}" if mo >= 4 else f"{y-1}-{str(y)[2:]}"
#         return [
#             m for m in months
#             if (not filter_fys or _fy_of(m["year"], m["month"]) in filter_fys)
#             and (not month_filters or MONTH_ORDER[m["month"]-1] in month_filters)
#         ]

#     return months

# @frappe.whitelist()
# def get_budget_line_items(budget_id: str, start_date=None, end_date=None,
#                           financial_year=None, month=None):
#     # ── Month-wise redesign ──
#     # Budget Items only ever store annual buckets (year_1/year_2/year_3),
#     # not real month-level figures, so each year's amount is spread evenly
#     # across its 12 months (year_amount / 12). The set of months shown is
#     # always bounded by the budget's own start_date/end_date — the
#     # dashboard's date/FY/month filters can only narrow that range
#     # further, never extend past it.
#     empty = {"months": [], "rows": []}
#     if not budget_id: return empty
#     partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
#     _assert_partner_access(partner_id)

#     bud_start, bud_end = frappe.db.get_value("Creche Budget", budget_id, ["start_date", "end_date"])
#     bud_start = getdate(bud_start) if bud_start else None
#     bud_end   = getdate(bud_end) if bud_end else None
#     if not bud_start or not bud_end:
#         return empty

#     all_months = _budget_month_labels(bud_start, bud_end)
#     shown_months = _filter_budget_months(
#         all_months, bud_start, bud_end,
#         start_date=start_date, end_date=end_date,
#         financial_year=financial_year, month=month,
#     )
#     shown_labels = [m["label"] for m in shown_months]

#     rows = frappe.get_all("Budget Items",
#         filters={"parent": budget_id, "parenttype": "Creche Budget"},
#         fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
#                 "budget_sub_head","year_1","year_2","year_3","notes"],
#         order_by="budget_main_head asc, type_of_expenses asc", ignore_permissions=True)

#     result_rows = []
#     for r in rows:
#         year_amounts = [flt(r.year_1), flt(r.year_2), flt(r.year_3)]
#         monthly = {}
#         for m in shown_months:
#             months_since_start = (m["year"] * 12 + m["month"]) - (bud_start.year * 12 + bud_start.month)
#             year_idx = months_since_start // 12
#             amt = round(year_amounts[year_idx] / 12.0, 2) if 0 <= year_idx < 3 else 0.0
#             monthly[m["label"]] = amt
#         total = round(sum(monthly.values()), 2)
#         result_rows.append({
#             "type_of_expenses_id": r.type_of_expenses_id,
#             "type_of_expenses": r.type_of_expenses, "budget_main_head": r.budget_main_head,
#             "budget_sub_head": r.budget_sub_head, "monthly": monthly, "total": total,
#             "notes": r.notes or "",
#         })

#     return {"months": shown_labels, "rows": result_rows}

# # ══════════════════════════════════════════════════════════════════════════
# # UTILISATION LINE ITEMS
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def get_utilisation_line_items(budget_id: str, start_date=None, end_date=None,
#                                financial_year=None, month=None):
#     # ── Month-wise redesign ──
#     # Unlike Budget Items, real submitted utilisation IS recorded per
#     # calendar month (one Creche utilisation doc per month), so this pivots
#     # actual data rather than prorating — each cell is the real amount
#     # submitted for that expense line in that month, 0 if nothing was
#     # submitted. Months shown are bounded by the budget's own start/end
#     # date the same way as the budget-items endpoint above.
#     empty = {"months": [], "rows": []}
#     if not budget_id: return empty
#     partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
#     _assert_partner_access(partner_id)

#     bud_start, bud_end = frappe.db.get_value("Creche Budget", budget_id, ["start_date", "end_date"])
#     bud_start = getdate(bud_start) if bud_start else None
#     bud_end   = getdate(bud_end) if bud_end else None
#     if not bud_start or not bud_end:
#         return empty

#     all_months = _budget_month_labels(bud_start, bud_end)
#     shown_months = _filter_budget_months(
#         all_months, bud_start, bud_end,
#         start_date=start_date, end_date=end_date,
#         financial_year=financial_year, month=month,
#     )
#     shown_labels = set(m["label"] for m in shown_months)

#     util_docs = frappe.get_all("Creche utilisation",
#         filters={"budget_reference_id": budget_id},
#         fields=["name", "month", "financial_year"], ignore_permissions=True)

#     # Map each utilisation doc to the "Mon YYYY" label it actually falls on
#     doc_month_label = {}
#     for d in util_docs:
#         try:
#             mo_num = list(_calendar.month_name).index(d.month)  # 1-12
#             fy_start_year = int(str(d.financial_year).split("-")[0])
#             year = fy_start_year if mo_num >= 4 else fy_start_year + 1
#             doc_month_label[d.name] = f"{MONTH_ORDER[mo_num-1][:3]} {year}"
#         except Exception:
#             continue

#     relevant_doc_names = [name for name, label in doc_month_label.items() if label in shown_labels]

#     items = []
#     if relevant_doc_names:
#         items = frappe.get_all("Utilisation Items",
#             filters={"parent": ["in", relevant_doc_names], "parenttype": "Creche utilisation"},
#             fields=["parent", "type_of_expenses_id", "type_of_expenses",
#                     "budget_main_head", "budget_sub_head", "total_amount"],
#             ignore_permissions=True)

#     agg = {}   # key -> {label: amount}
#     meta = {}  # key -> display fields
#     for it in items:
#         label = doc_month_label.get(it.parent)
#         if not label:
#             continue
#         key = (it.type_of_expenses or "", it.budget_sub_head or "", it.budget_main_head or "")
#         agg.setdefault(key, {})
#         agg[key][label] = agg[key].get(label, 0.0) + flt(it.total_amount)
#         if key not in meta:
#             meta[key] = {
#                 "type_of_expenses_id": it.type_of_expenses_id,
#                 "type_of_expenses": it.type_of_expenses,
#                 "budget_sub_head": it.budget_sub_head,
#                 "budget_main_head": it.budget_main_head,
#             }

#     result_rows = []
#     for key, monthly_amounts in agg.items():
#         monthly = {label: round(monthly_amounts.get(label, 0.0), 2) for label in shown_labels}
#         total = round(sum(monthly.values()), 2)
#         row = dict(meta[key])
#         row["monthly"] = monthly
#         row["total"] = total
#         result_rows.append(row)

#     # Keep column order chronological regardless of dict iteration order
#     ordered_labels = [m["label"] for m in shown_months]
#     return {"months": ordered_labels, "rows": result_rows}

# # ══════════════════════════════════════════════════════════════════════════
# # PENDING UTILIZATION
# # ══════════════════════════════════════════════════════════════════════════

# def _get_partner_emails(partner_ids):
#     email_map = {}
#     if not partner_ids: return email_map
#     perm_rows = frappe.db.sql(
#         """SELECT up.for_value AS partner_id, u.email
#            FROM `tabUser Permission` up
#            INNER JOIN `tabUser` u ON u.name = up.user AND u.enabled = 1
#            WHERE up.allow = 'Creche Partners' AND up.for_value IN %(pids)s
#            ORDER BY u.name""",
#         {"pids": partner_ids}, as_dict=True,
#     )
#     for row in perm_rows:
#         if row.partner_id not in email_map and row.email:
#             email_map[row.partner_id] = row.email

#     missing = [p for p in partner_ids if p not in email_map]
#     if missing:
#         for field in ("email", "email_id", "contact_email"):
#             try:
#                 rows = frappe.get_all("Creche Partners", filters={"name": ["in", missing]},
#                                       fields=["name", field], ignore_permissions=True)
#                 for r in rows:
#                     v = r.get(field, "")
#                     if v and r.name not in email_map:
#                         email_map[r.name] = v
#             except Exception:
#                 continue
#     return email_map

# def _get_partner_mobiles(partner_ids):
#     """
#     Return {partner_id: mobile_no} for given partner IDs.
#     Priority: User.mobile_no (via User Permission) → Creche Partners direct field.
#     """
#     mobile_map = {}
#     if not partner_ids:
#         return mobile_map

#     # Strategy 1: Get mobile_no from User doctype via User Permission link
#     try:
#         perm_rows = frappe.db.sql(
#             """
#             SELECT up.for_value AS partner_id, u.mobile_no
#             FROM `tabUser Permission` up
#             INNER JOIN `tabUser` u ON u.name = up.user AND u.enabled = 1
#             WHERE up.allow = 'Creche Partners'
#               AND up.for_value IN %(pids)s
#             ORDER BY u.name
#             """,
#             {"pids": partner_ids},
#             as_dict=True,
#         )
#         for row in perm_rows:
#             if row.partner_id not in mobile_map and row.mobile_no:
#                 mobile_map[row.partner_id] = str(row.mobile_no)
#     except Exception:
#         pass

#     # Strategy 2: fallback to direct field on Creche Partners doctype
#     missing = [p for p in partner_ids if p not in mobile_map]
#     if missing:
#         for field in ("mobile_no", "mobile", "phone", "contact_mobile"):
#             try:
#                 rows = frappe.get_all(
#                     "Creche Partners",
#                     filters={"name": ["in", missing]},
#                     fields=["name", field],
#                     ignore_permissions=True,
#                 )
#                 for r in rows:
#                     v = r.get(field, "")
#                     if v and r.name not in mobile_map:
#                         mobile_map[r.name] = str(v)
#             except Exception:
#                 continue

#     return mobile_map


# def _get_running_creches_count(permitted_partners=None):
#     """
#     Sum no_of_running_creches from the MOST RECENTLY MODIFIED utilization
#     record per budget. Uses `modified` (last updated) rather than `creation`.
#     """
#     try:
#         # Build optional partner filter
#         where_partner = ""
#         params_partner = []
#         if permitted_partners:
#             ph = ",".join(["%s"] * len(permitted_partners))
#             where_partner = f"WHERE partner_id IN ({ph})"
#             params_partner = list(permitted_partners)

#         # Get the latest modified record per budget, then sum the field
#         rows = frappe.db.sql(
#             f"""
#             SELECT cu.no_of_running_creches
#             FROM `tabCreche utilisation` cu
#             INNER JOIN (
#                 SELECT budget_reference_id, MAX(modified) AS max_m
#                 FROM `tabCreche utilisation`
#                 {where_partner}
#                 GROUP BY budget_reference_id
#             ) latest ON cu.budget_reference_id = latest.budget_reference_id
#                      AND cu.modified = latest.max_m
#             """,
#             params_partner,
#             as_dict=True,
#         )
#         return int(sum(int(r.no_of_running_creches or 0) for r in rows))
#     except Exception as e:
#         frappe.log_error(str(e), "get_running_creches_count")
#         return 0



# def _add_month(d):
#     if relativedelta:
#         return d + relativedelta(months=1)
#     y, m = d.year, d.month + 1
#     if m > 12: y += 1; m = 1
#     return _date(y, m, 1)

# @frappe.whitelist()
# def get_pending_utilisation_summary(cutoff_date=None, target_fy=None, target_month=None, filters=None):
#     if isinstance(filters, str):
#         filters = json.loads(filters) if filters else {}
#     filters = filters or {}

#     today = getdate(frappe.utils.nowdate())
#     if cutoff_date:
#         cutoff = getdate(cutoff_date)
#     else:
#         if today.day >= 5:
#             cutoff = today.replace(day=5)
#         else:
#             y, m = today.year, today.month - 1
#             if m < 1: y -= 1; m = 12
#             cutoff = _date(y, m, 5)

#     boundary_month_start = cutoff.replace(day=1)

#     # ── FIX ──
#     # The pending-utilisation card/popup previously ignored the dashboard's
#     # own filters entirely (only permission-based partner restriction was
#     # applied). Now it respects Partner / Budget Reference / Grant ID /
#     # State / District / Block exactly like the rest of the dashboard,
#     # using the same _intersect() helper so "no partner selected" still
#     # correctly means "all partners I'm permitted to see" rather than zero.
#     permitted = _get_user_permitted_partners()
#     filter_partners = filters.get("partner_id") or None
#     effective_partners = _intersect(filter_partners, permitted)
#     if effective_partners is not None and len(effective_partners) == 0:
#         return {"partners": [], "cutoff": str(cutoff)}

#     budget_filters = [
#         ["start_date", "is", "set"],
#         ["end_date", "is", "set"],
#         ["start_date", "<=", cutoff],
#     ]
#     if effective_partners:
#         budget_filters.append(["partner_id", "in", effective_partners])
#     if filters.get("budget_ref"):
#         budget_filters.append(["budget_reference_name", "in", filters["budget_ref"]])
#     if filters.get("grant_id"):
#         budget_filters.append(["grant_id", "in", filters["grant_id"]])
#     if filters.get("state"):
#         budget_filters.append(["state", "in", filters["state"]])
#     if filters.get("district"):
#         budget_filters.append(["district", "in", filters["district"]])
#     if filters.get("block"):
#         budget_filters.append(["block", "in", filters["block"]])

#     budgets = frappe.get_all(
#         "Creche Budget",
#         fields=["name","budget_reference_name","partner_id","partner_name",
#                 "grant_id","state","district","block","start_date","end_date"],
#         filters=budget_filters, ignore_permissions=True, limit_page_length=0,
#     )
#     if not budgets:
#         return {"partners": [], "cutoff": str(cutoff)}

#     budget_names = [b["name"] for b in budgets]
#     existing = set(
#         (r["budget_reference_id"], r["financial_year"], r["month"])
#         for r in frappe.get_all("Creche utilisation",
#             filters={"budget_reference_id": ["in", budget_names]},
#             fields=["budget_reference_id","financial_year","month"],
#             ignore_permissions=True, limit_page_length=0)
#     )

#     # When target_fy and target_month are given, only check that specific month
#     check_specific = bool(target_fy and target_month)

#     by_partner = {}
#     for b in budgets:
#         bud_start = getdate(b["start_date"])
#         bud_end   = getdate(b["end_date"])

#         missing_for_budget = []
#         total_months_checked = 0

#         if check_specific:
#             # Only check the one selected month
#             try:
#                 month_num = list(_calendar.month_name).index(target_month)  # 1-12
#             except ValueError:
#                 continue
#             fy_start_year = int(target_fy.split("-")[0])
#             year = fy_start_year if month_num >= 4 else fy_start_year + 1
#             month_start = _date(year, month_num, 1)

#             # Skip if this month is outside the budget period
#             if month_start < bud_start.replace(day=1) or month_start > bud_end.replace(day=1):
#                 continue
#             total_months_checked = 1
#             # Skip if submission already exists
#             if (b["name"], target_fy, target_month) in existing:
#                 continue

#             deadline = _add_month(month_start).replace(day=5)
#             days_overdue = (cutoff - deadline).days
#             missing_for_budget.append({
#                 "financial_year": target_fy, "month": target_month,
#                 "deadline": deadline.isoformat(),
#                 "days_overdue": max(days_overdue, 0),
#             })
#         else:
#             # Original logic: check all months from budget start to boundary
#             start = bud_start
#             end   = bud_end
#             effective_end = min(end.replace(day=1), boundary_month_start)
#             cursor = start.replace(day=1)
#             while cursor <= effective_end:
#                 total_months_checked += 1
#                 month_name = MONTH_ORDER[cursor.month - 1]
#                 fy_label = (f"{cursor.year}-{str(cursor.year+1)[2:]}" if cursor.month >= 4
#                             else f"{cursor.year-1}-{str(cursor.year)[2:]}")
#                 if (b["name"], fy_label, month_name) not in existing:
#                     deadline = _add_month(cursor).replace(day=5)
#                     days_overdue = (cutoff - deadline).days
#                     missing_for_budget.append({
#                         "financial_year": fy_label, "month": month_name,
#                         "deadline": deadline.isoformat(),
#                         "days_overdue": max(days_overdue, 0),
#                     })
#                 cursor = _add_month(cursor)

#         if not missing_for_budget:
#             continue

#         pid = b["partner_id"] or b["partner_name"] or "Unknown"
#         if pid not in by_partner:
#             by_partner[pid] = {
#                 "partner_id": b["partner_id"], "partner_name": b["partner_name"],
#                 "missing_count": 0, "max_days_overdue": 0, "budgets": [],
#             }
#         entry = by_partner[pid]
#         entry["budgets"].append({
#             "budget_id": b["name"], "budget_reference_name": b["budget_reference_name"],
#             "grant_id": b["grant_id"], "state": b["state"],
#             "missing_months": missing_for_budget,
#             "total_months_checked": total_months_checked,
#         })
#         entry["missing_count"] += len(missing_for_budget)
#         entry["max_days_overdue"] = max(
#             entry["max_days_overdue"],
#             max((m["days_overdue"] for m in missing_for_budget), default=0),
#         )

#     partner_ids = [pid for pid in by_partner if pid]
#     email_map   = _get_partner_emails(partner_ids)
#     mobile_map  = _get_partner_mobiles(partner_ids)

#     result = []
#     for pid, entry in by_partner.items():
#         entry["email"]  = email_map.get(pid, "")
#         entry["mobile"] = mobile_map.get(pid, "")
#         result.append(entry)
#     result.sort(key=lambda r: (-r["max_days_overdue"], r["partner_name"] or ""))
#     return {"partners": result, "cutoff": str(cutoff)}

# @frappe.whitelist()
# def send_utilisation_reminder(partner_ids=None, custom_message=None):
#     if isinstance(partner_ids, str):
#         try: partner_ids = json.loads(partner_ids)
#         except Exception: partner_ids = [p.strip() for p in partner_ids.split(",") if p.strip()]
#     partner_ids = partner_ids or []
#     if not partner_ids: frappe.throw(frappe._("No partners selected"))

#     permitted = _get_user_permitted_partners()
#     if permitted is not None:
#         partner_ids = [p for p in partner_ids if p in permitted]
#         if not partner_ids: frappe.throw(frappe._("You do not have permission to email these partners"))

#     email_map = _get_partner_emails(partner_ids)
#     partner_names = {r.name: r.partner_name for r in frappe.get_all(
#         "Creche Partners", filters={"name": ["in", partner_ids]},
#         fields=["name","partner_name"], ignore_permissions=True)}

#     default_message = ("This is a reminder that your utilisation report submission is pending. "
#                        "Kindly submit it at the earliest to keep your budget records up to date.")
#     message_body = custom_message or default_message

#     sent, failed = [], []
#     for pid in partner_ids:
#         email = email_map.get(pid)
#         pname = partner_names.get(pid, pid)
#         if not email:
#             failed.append({"partner_id": pid, "partner_name": pname, "reason": "No email on file"})
#             continue
#         try:
#             frappe.sendmail(
#                 recipients=[email],
#                 subject="Utilisation Report Submission Reminder",
#                 message=f"<p>Dear {frappe.utils.escape_html(pname)},</p><p>{frappe.utils.escape_html(message_body)}</p>",
#                 now=True,
#             )
#             sent.append({"partner_id": pid, "partner_name": pname, "email": email})
#         except Exception as e:
#             failed.append({"partner_id": pid, "partner_name": pname, "reason": str(e)})

#     return {"sent": sent, "failed": failed}

# # ══════════════════════════════════════════════════════════════════════════
# # EXPORT
# # ══════════════════════════════════════════════════════════════════════════

# @frappe.whitelist()
# def export_table(title="Report", columns=None, rows=None, format="xlsx"):
#     if isinstance(columns, str): columns = json.loads(columns)
#     if isinstance(rows, str):    rows    = json.loads(rows)
#     columns = columns or []; rows = rows or []

#     if format == "pdf":
#         file_url = _export_pdf(title, columns, rows)
#     else:
#         file_url = _export_xlsx(title, columns, rows)
#     return {"file_url": file_url}

# @frappe.whitelist()
# def export_pending_utilisation_grid(title="Pending Utilization Submission", columns=None, grid=None, merges=None):
#     # ── Rowspan-preserving export ──
#     # Unlike export_table (flat columns+rows), this mirrors the on-screen
#     # partner-grouped table exactly: Partner Name / Total Pending Months /
#     # Email are each a single merged cell spanning all of that partner's
#     # budget rows, matching the requested Excel layout.
#     try:
#         from openpyxl import Workbook
#         from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
#         from openpyxl.utils import get_column_letter
#     except ImportError:
#         frappe.throw(frappe._("openpyxl is required for Excel export."))

#     if isinstance(columns, str): columns = json.loads(columns)
#     if isinstance(grid, str):    grid    = json.loads(grid)
#     if isinstance(merges, str):  merges  = json.loads(merges) if merges else []
#     columns = columns or []; grid = grid or []; merges = merges or []

#     wb = Workbook(); ws = wb.active; ws.title = (title or "Data")[:31]
#     NAVY = "1E3A5F"; GRID_C = "E2E8F0"; BORDER_C = "93C5FD"
#     thin_grid = Border(left=Side(style="thin",color=GRID_C),right=Side(style="thin",color=GRID_C),
#                        top=Side(style="thin",color=GRID_C),bottom=Side(style="thin",color=GRID_C))
#     thin_hdr  = Border(left=Side(style="thin",color=BORDER_C),right=Side(style="thin",color=BORDER_C),
#                        top=Side(style="thin",color=BORDER_C),bottom=Side(style="thin",color=BORDER_C))
#     header_font = Font(bold=True,color="FFFFFF",size=10)
#     header_fill = PatternFill(start_color=NAVY,end_color=NAVY,fill_type="solid")

#     for ci, col in enumerate(columns, start=1):
#         label = col.get("label","") if isinstance(col, dict) else col
#         c = ws.cell(row=1, column=ci, value=label)
#         c.font = header_font; c.fill = header_fill; c.border = thin_hdr
#         c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

#     for ri, row_vals in enumerate(grid, start=2):
#         for ci, val in enumerate(row_vals, start=1):
#             cell = ws.cell(row=ri, column=ci)
#             if val not in (None, ""):
#                 # Numbers (Months Pending / Total Pending Months) stay numeric for correct spreadsheet math
#                 try:
#                     cell.value = int(val) if str(val).strip().lstrip('-').isdigit() else val
#                 except Exception:
#                     cell.value = val
#             cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
#             cell.border = thin_grid

#     for m in merges:
#         if len(m) != 4: continue
#         r0, c0, r1, c1 = m
#         if r0 == r1 and c0 == c1: continue
#         ws.merge_cells(start_row=r0+2, start_column=c0+1, end_row=r1+2, end_column=c1+1)
#         # Re-apply the border to every cell in the merged range (not just the
#         # anchor) so Excel draws a clean, unbroken border around the whole
#         # merged block instead of only the top-left cell.
#         for r in range(r0 + 2, r1 + 3):
#             for c in range(c0 + 1, c1 + 2):
#                 ws.cell(row=r, column=c).border = thin_grid

#     widths = [6, 20, 20, 14, 42, 18, 30]
#     for ci in range(1, len(columns) + 1):
#         ws.column_dimensions[get_column_letter(ci)].width = widths[ci-1] if ci-1 < len(widths) else 18
#     ws.freeze_panes = "A2"

#     buf = io.BytesIO(); wb.save(buf); buf.seek(0)
#     return {"file_url": _save_file(f"{_safe_fname(title)}.xlsx", buf.getvalue())}

# def _is_total_row(row, columns):
#     if not columns: return False
#     return str(row.get(columns[0].get("key"), "")).strip().lower() == "total"

# def _export_xlsx(title, columns, rows):
#     try:
#         from openpyxl import Workbook
#         from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
#         from openpyxl.utils import get_column_letter
#     except ImportError:
#         frappe.throw(frappe._("openpyxl is required for Excel export."))

#     wb = Workbook(); ws = wb.active; ws.title = (title or "Data")[:31]
#     NAVY="1E3A5F"; LIGHTBLUE="BFDBFE"; BORDER_C="93C5FD"; GRID_C="E2E8F0"; GROUP_FILL="DBEAFE"
#     thin_grid = Border(left=Side(style="thin",color=GRID_C),right=Side(style="thin",color=GRID_C),
#                        top=Side(style="thin",color=GRID_C),bottom=Side(style="thin",color=GRID_C))
#     thin_hdr  = Border(left=Side(style="thin",color=BORDER_C),right=Side(style="thin",color=BORDER_C),
#                        top=Side(style="thin",color=BORDER_C),bottom=Side(style="thin",color=BORDER_C))
#     header_font = Font(bold=True,color="FFFFFF",size=10)
#     header_fill = PatternFill(start_color=NAVY,end_color=NAVY,fill_type="solid")
#     total_font  = Font(bold=True,color=NAVY,size=11)
#     total_fill  = PatternFill(start_color=LIGHTBLUE,end_color=LIGHTBLUE,fill_type="solid")
#     group_font  = Font(bold=True,color=NAVY,size=10.5)
#     group_fill  = PatternFill(start_color=GROUP_FILL,end_color=GROUP_FILL,fill_type="solid")

#     for ci, col in enumerate(columns, start=1):
#         c = ws.cell(row=1,column=ci,value=col.get("label",""))
#         c.font=header_font; c.fill=header_fill; c.border=thin_hdr
#         c.alignment=Alignment(horizontal="center",vertical="center",wrap_text=True)

#     ncols = max(len(columns),1); r_idx = 2
#     for row in rows:
#         if row.get("__group__"):
#             ws.merge_cells(start_row=r_idx,start_column=1,end_row=r_idx,end_column=max(ncols-1,1))
#             lc = ws.cell(row=r_idx,column=1,value=row.get("label",""))
#             lc.font=group_font; lc.fill=group_fill; lc.border=thin_hdr
#             lc.alignment=Alignment(horizontal="left",vertical="center",indent=1)
#             sc = ws.cell(row=r_idx,column=ncols,value=row.get("subtotal",""))
#             sc.font=group_font; sc.fill=group_fill; sc.border=thin_hdr
#             sc.alignment=Alignment(horizontal="right",vertical="center")
#             r_idx += 1; continue

#         total_row = _is_total_row(row, columns)
#         for ci, col in enumerate(columns, start=1):
#             val = row.get(col.get("key"),"")
#             align = col.get("align","left")
#             cell = ws.cell(row=r_idx,column=ci)
#             if align=="right" and isinstance(val,(int,float)):
#                 cell.value=val; cell.number_format="#,##0.00"
#             else:
#                 cell.value=val
#             cell.alignment=Alignment(horizontal=align)
#             if total_row: cell.font=total_font; cell.fill=total_fill; cell.border=thin_hdr
#             else: cell.border=thin_grid
#         r_idx += 1

#     for ci, col in enumerate(columns, start=1):
#         letter = get_column_letter(ci)
#         max_len = len(str(col.get("label","")))
#         for row in rows:
#             if row.get("__group__"): continue
#             v = row.get(col.get("key"),"")
#             max_len = max(max_len, len(str(v)))
#         ws.column_dimensions[letter].width = min(max_len+4, 42)
#     ws.freeze_panes = "A2"

#     buf = io.BytesIO(); wb.save(buf); buf.seek(0)
#     return _save_file(f"{_safe_fname(title)}.xlsx", buf.getvalue())

# def _export_pdf(title, columns, rows):
#     thead = "".join(f"<th>{frappe.utils.escape_html(c.get('label',''))}</th>" for c in columns)
#     ncols = max(len(columns), 1); body_rows = []
#     for row in rows:
#         if row.get("__group__"):
#             label   = frappe.utils.escape_html(row.get("label",""))
#             subtotal= frappe.utils.escape_html(row.get("subtotal",""))
#             body_rows.append(f'<tr class="group-row"><td colspan="{ncols}">'
#                              f'<span class="group-row__label">{label}</span>'
#                              f'<span class="group-row__subtotal">{subtotal}</span></td></tr>')
#             continue
#         total_row = _is_total_row(row, columns)
#         tds = [f'<td style="text-align:{c.get("align","left")}">{frappe.utils.escape_html(str(row.get(c.get("key"),"" )))}</td>'
#                for c in columns]
#         body_rows.append(f'<tr{"  class=\"total-row\"" if total_row else ""}>{"".join(tds)}</tr>')

#     html = f"""<html><head><meta charset="utf-8">
#     <style>@page{{size:A4 portrait;margin:14mm 10mm}}*{{box-sizing:border-box;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif}}body{{color:#1f2937}}h1{{font-size:16px;font-weight:700;color:#1e3a5f;margin-bottom:4px}}.meta{{font-size:9px;color:#94a3b8;margin-bottom:12px}}table{{width:100%;border-collapse:collapse;font-size:10px}}th{{background:#1e3a5f;color:#fff;font-weight:700;text-transform:uppercase;font-size:8.5px;letter-spacing:.4px;padding:6px 8px;text-align:left;border:1px solid #93c5fd}}td{{padding:5px 8px;border:1px solid #e2e8f0}}tr.total-row td{{background:#bfdbfe;color:#1e3a5f;font-weight:700;border:1px solid #93c5fd}}tr.group-row td{{background:#dbeafe;color:#1e3a5f;font-weight:700;border:1px solid #93c5fd;padding:6px 8px}}.group-row__label{{display:inline-block}}.group-row__subtotal{{float:right}}tr:nth-child(even):not(.total-row):not(.group-row) td{{background:#f8fafc}}</style>
#     </head><body>
#     <h1>{frappe.utils.escape_html(title or "Report")}</h1>
#     <div class="meta">Exported {frappe.utils.now_datetime().strftime("%d %b %Y, %I:%M %p")} by {frappe.session.user}</div>
#     <table><thead><tr>{thead}</tr></thead><tbody>{"".join(body_rows)}</tbody></table>
#     </body></html>"""

#     from frappe.utils.pdf import get_pdf
#     pdf_content = get_pdf(html, options={"page-size":"A4","orientation":"Portrait"})
#     return _save_file(f"{_safe_fname(title)}.pdf", pdf_content)

# def _safe_fname(title):
#     import re
#     base = re.sub(r"[^A-Za-z0-9_-]+","_",title or "report").strip("_") or "report"
#     return base[:80]

# def _save_file(fname, content):
#     f = frappe.get_doc({"doctype":"File","file_name":fname,"is_private":0,"content":content})
#     f.save(ignore_permissions=True)
#     return f.file_url





"""
creche_reports/api/creche_dashboard.py

All server-side methods for the Creche Dashboard page.
"""

import frappe
from frappe.utils import flt, getdate, nowdate, add_days, now_datetime, get_datetime, get_url
from datetime import date as _date, datetime, timedelta as _timedelta
import calendar as _calendar
import json
import io

try:
    from dateutil.relativedelta import relativedelta
except ImportError:
    relativedelta = None

MONTH_ORDER = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
]

# ══════════════════════════════════════════════════════════════════════════
# DATE / PRORATA HELPERS
# ══════════════════════════════════════════════════════════════════════════

def _to_date(v):
    if not v: return None
    if isinstance(v, _date): return v
    return _date.fromisoformat(str(v)[:10])

def _add_months_safe(d, n):
    """Add n calendar months to date d, clamping day to month-end."""
    if relativedelta:
        return d + relativedelta(months=n)
    m = d.month - 1 + n
    year  = d.year + m // 12
    month = m % 12 + 1
    day   = min(d.day, _calendar.monthrange(year, month)[1])
    return _date(year, month, day)

def _count_calendar_months(start, end):
    """Count distinct calendar months from start to end inclusive."""
    if not start or not end or start > end:
        return 0
    count = 0
    y, m = start.year, start.month
    ey, em = end.year, end.month
    while (y, m) <= (ey, em):
        count += 1
        m += 1
        if m > 12:
            m, y = 1, y + 1
    return count

def _prorata_by_budget_year(year_1, year_2, year_3, bud_start, bud_end, filter_segments):
    """
    Calculate prorated budget using budget-year periods (NOT financial-year periods).

    Y1 = first 12 months from budget start date
    Y2 = months 13-24 from budget start date
    Y3 = months 25-36 from budget start date

    For each year period that overlaps a filter segment:
        contribution = year_amount / 12 * months_in_overlap

    Returns dict with keys: total, year_1, year_2, year_3
    """
    empty = {"total": 0.0, "year_1": 0.0, "year_2": 0.0, "year_3": 0.0}
    bud_s = _to_date(bud_start)
    bud_e = _to_date(bud_end)
    if not bud_s or not bud_e:
        return empty

    year_amounts = [float(year_1 or 0), float(year_2 or 0), float(year_3 or 0)]
    scaled = [0.0, 0.0, 0.0]

    for i, yr_amt in enumerate(year_amounts):
        if not yr_amt:
            continue
        yr_s = _add_months_safe(bud_s, i * 12)
        yr_e = _add_months_safe(bud_s, (i + 1) * 12) - _timedelta(days=1)
        yr_e = min(yr_e, bud_e)
        if yr_s > bud_e:
            break  # all remaining years are also beyond budget end

        for seg_s, seg_e in filter_segments:
            ov_s = max(seg_s, yr_s)
            ov_e = min(seg_e, yr_e)
            if ov_s > ov_e:
                continue
            months = _count_calendar_months(ov_s, ov_e)
            if months > 0:
                scaled[i] += yr_amt / 12.0 * months

    return {
        "total":  round(scaled[0] + scaled[1] + scaled[2], 2),
        "year_1": round(scaled[0], 2),
        "year_2": round(scaled[1], 2),
        "year_3": round(scaled[2], 2),
    }

def _compute_prorata_budget(budget_name, bud_start, bud_end, filter_segments):
    """
    Compute prorated total budget for a Creche Budget document.
    Uses budget-year-based proration (not financial-year-based).
    """
    if not filter_segments:
        return None

    rows = frappe.db.sql(
        """SELECT SUM(COALESCE(year_1,0)) AS year_1,
                  SUM(COALESCE(year_2,0)) AS year_2,
                  SUM(COALESCE(year_3,0)) AS year_3
           FROM `tabBudget Items`
           WHERE parent = %s AND parenttype = 'Creche Budget'""",
        (budget_name,), as_dict=True,
    )
    if not rows or not rows[0]:
        return 0.0

    raw = rows[0]
    result = _prorata_by_budget_year(
        raw.get("year_1") or 0,
        raw.get("year_2") or 0,
        raw.get("year_3") or 0,
        bud_start, bud_end, filter_segments,
    )
    return result["total"]

def _build_filter_segments(filters):
    raw_start = _to_date(filters.get("start_date"))
    raw_end   = _to_date(filters.get("end_date"))

    filter_fys = filters.get("financial_year") or []
    if isinstance(filter_fys, str): filter_fys = [filter_fys]
    filter_fys = list(filter_fys)

    month_raw = filters.get("month") or []
    if isinstance(month_raw, str): month_raw = [month_raw] if month_raw.strip() else []
    month_filters = [m.strip() for m in month_raw if str(m).strip()]

    if raw_start or raw_end:
        from datetime import timedelta
        seg_s = raw_start or (raw_end - timedelta(days=3*366))
        seg_e = raw_end   or (raw_start + timedelta(days=3*366))
        return [(seg_s, seg_e)]

    if filter_fys and month_filters:
        segs = []
        for fy in filter_fys:
            fy_start_year = int(fy.split("-")[0])
            for mn in month_filters:
                month_num = list(_calendar.month_name).index(mn)
                year      = fy_start_year if month_num >= 4 else fy_start_year + 1
                last_day  = _calendar.monthrange(year, month_num)[1]
                segs.append((_date(year, month_num, 1), _date(year, month_num, last_day)))
        return segs

    if filter_fys:
        segs = []
        for fy in filter_fys:
            y = int(fy.split("-")[0])
            segs.append((_date(y, 4, 1), _date(y + 1, 3, 31)))
        return segs

    return []

# ══════════════════════════════════════════════════════════════════════════
# PERMISSION HELPERS
#
# Partner / Budget / State / District / Block scoping is delegated to the
# shared creche_reports.api.permissions module (used by both dashboards and
# the Creche Budget Utilisation report), which unions every granted
# dimension rather than AND-ing independent column-value sets — a partner
# permitted via one budget can have OTHER budgets outside a permitted
# state/district/block, so an AND-based approach would incorrectly leak
# those. See that module's docstring for the full rationale.
# ══════════════════════════════════════════════════════════════════════════

from creche_reports.api import permissions as _perm

def _get_user_permitted_partners():
    return _perm.get_effective_partner_ids()

def _intersect(filter_list, permitted):
    """Preserves this module's original three-way contract: None means
    "unrestricted, no filter needed" (callers treat `is not None` as "apply
    this filter"); an empty list means "restricted to nothing" or "requested
    values don't overlap permitted ones". filter_list is None exactly when
    the caller passed no value at all (distinct from an empty list, meaning
    the user actively selected nothing) — that distinction must be
    preserved, so this reimplements the logic directly rather than
    delegating to permissions.intersect(), whose contract collapses it."""
    if permitted is None:
        return filter_list
    if not permitted:
        return []
    if not filter_list:
        return list(permitted)
    pset = set(permitted)
    return [p for p in filter_list if p in pset]

def _empty_summary():
    return {
        "total_budget":0,"total_disbursement":0,
        "total_utilisation":0,"total_bank_balance":0,
        "total_interest":0,"total_creches":0,
        "utilisation_pct":0,"disbursement_pct":0,
    }

def _apply_budget_permission_scope(filters: dict) -> dict:
    """Add the permitted-budget-name constraint to a Creche Budget filters dict."""
    return _perm.apply_budget_id_scope(dict(filters), column="name")

# ══════════════════════════════════════════════════════════════════════════
# PARTNER OPTIONS
# ══════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_partner_options(txt=""):
    permitted = _get_user_permitted_partners()
    filters   = {}
    if permitted is not None:
        if not permitted: return []
        filters["name"] = ["in", permitted]
    if txt:
        filters["partner_name"] = ["like", f"%{txt}%"]
    rows = frappe.get_all("Creche Partners", filters=filters, fields=["name","partner_name"],
                          order_by="partner_name asc", limit=500, ignore_permissions=True)
    return [{"name": r.name, "partner_name": r.partner_name or r.name} for r in rows]

@frappe.whitelist()
def get_user_permission_scope():
    permitted = _get_user_permitted_partners()
    if permitted is None: return {"restricted": False, "partner_ids": []}
    return {"restricted": True, "partner_ids": permitted}

# ══════════════════════════════════════════════════════════════════════════
# MAIN SUMMARY
# ══════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_partner_budget_summary(filters=None):
    if isinstance(filters, str):
        filters = json.loads(filters)
    filters = filters or {}

    permitted          = _get_user_permitted_partners()
    filter_partners    = filters.get("partner_id") or None
    effective_partners = _intersect(filter_partners, permitted)

    if permitted is not None and filter_partners and not effective_partners:
        return {"summary": _empty_summary(), "partners": []}

    start_date = filters.get("start_date") or None
    end_date   = filters.get("end_date")   or None

    filter_segments = _build_filter_segments(filters)
    apply_prorata   = bool(filter_segments)

    budget_filters = {}
    if effective_partners:
        budget_filters["partner_id"] = ["in", effective_partners]
    if filters.get("budget_ref"):
        budget_filters["budget_reference_name"] = ["in", filters["budget_ref"]]
    if filters.get("grant_id"):
        budget_filters["grant_id"] = ["in", filters["grant_id"]]
    if filters.get("state"):
        budget_filters["state"] = ["in", filters["state"]]
    if filters.get("district"):
        budget_filters["district"] = ["in", filters["district"]]
    if filters.get("block"):
        budget_filters["block"] = ["in", filters["block"]]
    if start_date:
        budget_filters["end_date"]   = [">=", start_date]
    if end_date:
        budget_filters["start_date"] = ["<=", end_date]

    budget_filters = _apply_budget_permission_scope(budget_filters)
    if budget_filters.get("name") == ["in", ["__none__"]]:
        return {"summary": _empty_summary(), "partners": []}

    budgets = frappe.get_all(
        "Creche Budget", filters=budget_filters,
        fields=["name","partner_id","partner_name","grant_id","budget_reference_name",
                "state","district","block","start_date","end_date","financial_year",
                "no_of_creches","total_budget"],
        order_by="partner_name asc, budget_reference_name asc",
        ignore_permissions=True,
    )

    budget_ids = [b.name for b in budgets]

    # ── Budget Items sums (bulk) ──────────────────────────────────────────
    budget_items_map = {}
    if budget_ids:
        ph_bi = ", ".join([f"%(bim{i})s" for i in range(len(budget_ids))])
        bim_params = {f"bim{i}": n for i, n in enumerate(budget_ids)}
        bi_rows = frappe.db.sql(
            "SELECT parent,"
            " SUM(COALESCE(year_1,0)) AS year_1,"
            " SUM(COALESCE(year_2,0)) AS year_2,"
            " SUM(COALESCE(year_3,0)) AS year_3"
            " FROM `tabBudget Items`"
            f" WHERE parent IN ({ph_bi}) AND parenttype = 'Creche Budget'"
            " GROUP BY parent",
            bim_params, as_dict=True,
        )
        for r in bi_rows:
            budget_items_map[r.parent] = {
                "year_1": float(r.year_1 or 0),
                "year_2": float(r.year_2 or 0),
                "year_3": float(r.year_3 or 0),
                "total":  float(r.year_1 or 0) + float(r.year_2 or 0) + float(r.year_3 or 0),
            }

    # ── Disbursement (date-based) ─────────────────────────────────────────
    disbursement_map = {}
    if budget_ids:
        disb_headers = frappe.get_all("Creche Disbursement",
            filters={"budget_reference_id": ["in", budget_ids]},
            fields=["name","budget_reference_id"], ignore_permissions=True)
        disb_parent_names = [d.name for d in disb_headers]
        disb_bid_map = {d.name: d.budget_reference_id for d in disb_headers}

        if disb_parent_names:
            tracker_rows = frappe.get_all("Disbursement Tracker",
                filters={"parent": ["in", disb_parent_names], "parenttype": "Creche Disbursement"},
                fields=["parent","date_of_disbursement","disbursed_amount"],
                ignore_permissions=True)

            if filter_segments:
                tracker_rows = [
                    t for t in tracker_rows
                    if t.date_of_disbursement and any(
                        seg_s <= getdate(str(t.date_of_disbursement)) <= seg_e
                        for seg_s, seg_e in filter_segments
                    )
                ]
            elif start_date or end_date:
                tracker_rows = [
                    t for t in tracker_rows
                    if t.date_of_disbursement
                    and (not start_date or getdate(str(t.date_of_disbursement)) >= getdate(start_date))
                    and (not end_date   or getdate(str(t.date_of_disbursement)) <= getdate(end_date))
                ]

            for t in tracker_rows:
                bid = disb_bid_map.get(t.parent)
                if bid:
                    disbursement_map[bid] = disbursement_map.get(bid, 0.0) + flt(t.disbursed_amount)

    # ── Utilisation ───────────────────────────────────────────────────────
    utilisation_map  = {}
    bank_balance_map = {}
    interest_map     = {}

    if budget_ids:
        filter_fys = filters.get("financial_year") or []
        if isinstance(filter_fys, str): filter_fys = [filter_fys]
        month_raw = filters.get("month") or []
        if isinstance(month_raw, str): month_raw = [month_raw] if month_raw.strip() else []
        month_filters = [m.strip() for m in month_raw if str(m).strip()]

        util_extra  = ""
        util_params = {}

        if start_date and end_date:
            def _local_fy_month_pairs(sd, ed):
                sd = _to_date(sd); ed = _to_date(ed)
                if not sd or not ed: return []
                pairs = []; cur = _date(sd.year, sd.month, 1)
                end_mo = _date(ed.year, ed.month, 1)
                while cur <= end_mo:
                    fy = (f"{cur.year}-{str(cur.year+1)[2:]}" if cur.month >= 4
                          else f"{cur.year-1}-{str(cur.year)[2:]}")
                    pairs.append((fy, _calendar.month_name[cur.month]))
                    cur = (_date(cur.year+1,1,1) if cur.month==12
                           else _date(cur.year, cur.month+1, 1))
                return pairs
            pairs = _local_fy_month_pairs(start_date, end_date)
            if pairs:
                clauses = []
                for i, (fy, mn) in enumerate(pairs):
                    util_params[f"ufy{i}"] = fy; util_params[f"umn{i}"] = mn
                    clauses.append(f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)")
                util_extra = " AND (" + " OR ".join(clauses) + ")"
            else:
                util_extra = " AND 1=0"
        elif filter_fys and month_filters:
            clauses = []; k = 0
            for fy in sorted(filter_fys):
                for mn in month_filters:
                    util_params[f"ufy{k}"] = fy; util_params[f"umn{k}"] = mn
                    clauses.append(f"(cu.financial_year = %(ufy{k})s AND cu.month = %(umn{k})s)")
                    k += 1
            util_extra = " AND (" + " OR ".join(clauses) + ")"
        elif filter_fys:
            ph = ", ".join([f"%(ufy{i})s" for i in range(len(filter_fys))])
            for i, fy in enumerate(filter_fys): util_params[f"ufy{i}"] = fy
            util_extra = f" AND cu.financial_year IN ({ph})"
        elif month_filters:
            ph = ", ".join([f"%(umn{i})s" for i in range(len(month_filters))])
            for i, m in enumerate(month_filters): util_params[f"umn{i}"] = m
            util_extra = f" AND cu.month IN ({ph})"
        elif start_date:
            from datetime import date as _dt_today
            today = _dt_today.today()
            def _lp(sd, ed):
                sd = _to_date(sd); ed = _to_date(ed)
                if not sd or not ed: return []
                pairs = []; cur = _date(sd.year, sd.month, 1)
                end_mo = _date(ed.year, ed.month, 1)
                while cur <= end_mo:
                    fy = (f"{cur.year}-{str(cur.year+1)[2:]}" if cur.month >= 4
                          else f"{cur.year-1}-{str(cur.year)[2:]}")
                    pairs.append((fy, _calendar.month_name[cur.month]))
                    cur = (_date(cur.year+1,1,1) if cur.month==12
                           else _date(cur.year, cur.month+1, 1))
                return pairs
            pairs = _lp(start_date, today)
            if pairs:
                clauses = []
                for i, (fy, mn) in enumerate(pairs):
                    util_params[f"ufy{i}"] = fy; util_params[f"umn{i}"] = mn
                    clauses.append(f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)")
                util_extra = " AND (" + " OR ".join(clauses) + ")"

        bid_ph = ", ".join([f"%(bid{i})s" for i in range(len(budget_ids))])
        for i, n in enumerate(budget_ids): util_params[f"bid{i}"] = n

        util_rows = frappe.db.sql(
            f"""SELECT cu.budget_reference_id, SUM(ui.total_amount) AS total_util
                FROM `tabCreche utilisation` cu
                INNER JOIN `tabUtilisation Items` ui ON ui.parent = cu.name AND ui.parenttype = 'Creche utilisation'
                WHERE cu.budget_reference_id IN ({bid_ph}) {util_extra}
                GROUP BY cu.budget_reference_id""",
            util_params, as_dict=True,
        )
        for r in util_rows:
            utilisation_map[r.budget_reference_id] = flt(r.total_util)

        interest_rows = frappe.db.sql(
            f"""SELECT budget_reference_id, SUM(interest_from_bank) AS total_interest
                FROM `tabCreche utilisation`
                WHERE budget_reference_id IN ({bid_ph}) {util_extra.replace("cu.", "")}
                GROUP BY budget_reference_id""",
            util_params, as_dict=True,
        )
        for r in interest_rows:
            interest_map[r.budget_reference_id] = flt(r.total_interest)

        # Bank balance: from the MOST RECENTLY MODIFIED utilisation record per budget
        # (within the active filter period if one is set; otherwise globally latest)
        try:
            bank_balance_map = {}
            bb_rows = frappe.db.sql(
                f"""
                SELECT cu.budget_reference_id, cu.balance_amount
                FROM `tabCreche utilisation` cu
                INNER JOIN (
                    SELECT budget_reference_id, MAX(modified) AS max_m
                    FROM `tabCreche utilisation`
                    WHERE budget_reference_id IN ({bid_ph})
                    {util_extra.replace("cu.", "") if util_extra else ""}
                    GROUP BY budget_reference_id
                ) latest ON cu.budget_reference_id = latest.budget_reference_id
                         AND cu.modified = latest.max_m
                """,
                util_params, as_dict=True,
            )
            for r in bb_rows:
                bank_balance_map[r.budget_reference_id] = flt(r.balance_amount)
        except Exception as e:
            frappe.log_error(str(e), "bank_balance_map_error")
            bank_balance_map = {}

    # ── Running creches per budget (from latest modified utilization) ──────
    running_creches_map = {}
    if budget_ids:
        try:
            rc_ph = ", ".join(["%s"] * len(budget_ids))
            rc_rows = frappe.db.sql(
                f"""
                SELECT cu.budget_reference_id, COALESCE(cu.no_of_running_creches, 0) AS rc
                FROM `tabCreche utilisation` cu
                INNER JOIN (
                    SELECT budget_reference_id, MAX(modified) AS max_m
                    FROM `tabCreche utilisation`
                    WHERE budget_reference_id IN ({rc_ph})
                    GROUP BY budget_reference_id
                ) latest ON cu.budget_reference_id = latest.budget_reference_id
                         AND cu.modified = latest.max_m
                """,
                budget_ids, as_dict=True,
            )
            for r in rc_rows:
                running_creches_map[r.budget_reference_id] = int(r.rc or 0)
        except Exception:
            pass

    # ── Assemble results ──────────────────────────────────────────────────

    partners = {}
    grand = dict(budget=0.0, disbursement=0.0, utilisation=0.0, bank_balance=0.0,
                 expected_bank_balance=0.0, interest=0.0, creches=0)

    for budget in budgets:
        bid = budget.name
        bi  = budget_items_map.get(bid)
        if bi is None:
            # No Budget Items rows found at all for this budget — fall back to
            # the stored total_budget field only in this edge case (a budget
            # with zero configured line items still needs *some* number).
            bi = {"year_1": 0, "year_2": 0, "year_3": 0, "total": flt(budget.total_budget)}

        if apply_prorata:
            pr = _prorata_by_budget_year(
                bi["year_1"], bi["year_2"], bi["year_3"],
                budget.start_date, budget.end_date, filter_segments,
            )
            budget_amount = pr["total"]
        else:
            # ── FIX #1/#2 ──
            # Always derive the budget amount from Budget Items
            # (year_1 + year_2 + year_3), never silently substitute the
            # stored total_budget field just because the line-item sum is
            # zero. Falling back on a "truthy" check meant any budget whose
            # line items legitimately summed to 0 would show the stale
            # total_budget value on the summary card while the drill-down
            # (which always sums line items) showed 0 — causing the
            # card-vs-drilldown mismatch. Now both always agree.
            budget_amount = bi["total"]

        disbursement = flt(disbursement_map.get(bid, 0))
        utilisation  = flt(utilisation_map.get(bid, 0))
        bank_balance = flt(bank_balance_map.get(bid, 0))
        interest     = flt(interest_map.get(bid, 0))
        creches      = int(budget.no_of_creches or 0)

        balance_budget            = budget_amount - utilisation
        utilised_pct              = round((utilisation / budget_amount * 100) if budget_amount else 0, 2)
        utilised_disbursement_pct = round((utilisation / disbursement * 100)  if disbursement  else 0, 2)
        # Expected Bank Balance: what should still be sitting in the bank if
        # every disbursed rupee that hasn't been utilised yet is still there.
        expected_bank_balance = disbursement - utilisation

        partner_key = budget.partner_id or budget.partner_name or "Unknown"
        if partner_key not in partners:
            partners[partner_key] = {
                "partner_id": budget.partner_id, "partner_name": budget.partner_name,
                "total_budget":0.0,"total_disbursement":0.0,"total_utilisation":0.0,
                "total_balance_budget":0.0,"total_bank_balance":0.0,
                "total_expected_bank_balance":0.0,
                "total_interest":0.0,"total_creches":0,"total_running_creches":0,"budgets":[],
            }
        p = partners[partner_key]
        p["total_budget"]         += budget_amount
        p["total_disbursement"]   += disbursement
        p["total_utilisation"]    += utilisation
        p["total_balance_budget"] += balance_budget
        # SUM bank balances per partner (consistent with grand total which also sums)
        p["total_bank_balance"] += bank_balance
        p["total_expected_bank_balance"] += expected_bank_balance
        budget_running = running_creches_map.get(bid, 0)
        p["total_interest"]       += interest
        p["total_creches"]        += creches
        p.setdefault("total_running_creches", 0)
        p["total_running_creches"] += budget_running
        p["budgets"].append({
            "budget_id": bid, "grant_id": budget.grant_id,
            "budget_reference_name": budget.budget_reference_name,
            "state": budget.state, "district": budget.district, "block": budget.block,
            "grant_start": budget.start_date, "grant_end": budget.end_date,
            "financial_year": budget.financial_year, "no_of_creches": creches,
            "budget": budget_amount, "disbursement": disbursement,
            "utilisation": utilisation, "utilised_pct": utilised_pct,
            "utilised_disbursement_pct": utilised_disbursement_pct,
            "balance_budget_amount": balance_budget,
            "bank_balance": bank_balance, "expected_bank_balance": expected_bank_balance,
            "interest_from_bank": interest,
            "running_creches": budget_running,
        })

        grand["budget"]       += budget_amount
        grand["disbursement"] += disbursement
        grand["utilisation"]  += utilisation
        grand["bank_balance"] += bank_balance
        grand["expected_bank_balance"] += expected_bank_balance
        grand["interest"]     += interest
        grand["creches"]      += creches

    result = []
    for p in partners.values():
        p["utilised_pct"] = round((p["total_utilisation"] / p["total_budget"] * 100) if p["total_budget"] else 0, 2)
        p["grant_ids"]    = ", ".join(sorted(set(b["grant_id"] for b in p["budgets"] if b["grant_id"])))
        p["budgets"]      = sorted(p["budgets"], key=lambda x: x["budget_reference_name"] or "")
        result.append(p)
    result.sort(key=lambda x: x["partner_name"] or "")

    gb = grand["budget"]
    # Get running creches from most recent utilisation records
    running_creches = _get_running_creches_count(
        effective_partners if effective_partners else None
    )
    return {
        "summary": {
            "total_budget":       grand["budget"],
            "total_disbursement": grand["disbursement"],
            "total_utilisation":  grand["utilisation"],
            "total_bank_balance": grand["bank_balance"],
            "total_expected_bank_balance": grand["expected_bank_balance"],
            "total_interest":     grand["interest"],
            "total_creches":      grand["creches"],
            "running_creches":    running_creches,
            "utilisation_pct":    round((grand["utilisation"]  / gb * 100) if gb else 0, 2),
            "disbursement_pct":   round((grand["disbursement"] / gb * 100) if gb else 0, 2),
        },
        "partners": result,
    }

# ══════════════════════════════════════════════════════════════════════════
# DISBURSEMENT PANEL DATA
# ══════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_disbursement_panel_data(budget_ids=None, partner_ids=None, start_date=None, end_date=None,
                                financial_year=None, month=None):
    def _to_list(v):
        if not v: return []
        if isinstance(v, str):
            try:
                p = json.loads(v)
                if isinstance(p, list): return [x for x in p if x]
            except: pass
            return [x.strip() for x in v.split(",") if x.strip()]
        return [x for x in v if x]

    budget_ids_list  = _to_list(budget_ids)
    partner_ids_list = _to_list(partner_ids)
    filter_fys       = _to_list(financial_year)
    month_filters    = [m.strip() for m in _to_list(month) if str(m).strip()]

    effective_budget_ids = _perm.get_effective_budget_ids()

    disb_filters = {}
    if budget_ids_list:
        if effective_budget_ids is not None:
            budget_ids_list = [b for b in budget_ids_list if b in set(effective_budget_ids)]
            if not budget_ids_list: return []
        disb_filters["budget_reference_id"] = ["in", budget_ids_list]
    elif partner_ids_list:
        if effective_budget_ids is not None:
            partner_budget_ids = frappe.get_all("Creche Budget",
                filters={"partner_id": ["in", partner_ids_list], "name": ["in", effective_budget_ids or ["__none__"]]},
                pluck="name")
            if not partner_budget_ids: return []
            disb_filters["budget_reference_id"] = ["in", partner_budget_ids]
        else:
            disb_filters["partner_id"] = ["in", partner_ids_list]
    else:
        if effective_budget_ids is not None:
            if not effective_budget_ids: return []
            disb_filters["budget_reference_id"] = ["in", effective_budget_ids]

    disb_docs = frappe.get_all("Creche Disbursement", filters=disb_filters,
        fields=["name","budget_reference_id","budget_reference_name","partner_id","partner_name",
                "grant_id","state","district","block","financial_year",
                "total_disbursement","balence_budget","total_budget"],
        order_by="partner_name asc, budget_reference_name asc", ignore_permissions=True)
    if not disb_docs: return []

    parent_names = [d.name for d in disb_docs]
    tracker_rows = frappe.get_all("Disbursement Tracker",
        filters={"parent":["in",parent_names],"parenttype":"Creche Disbursement"},
        fields=["parent","date_of_disbursement","disbursed_amount"],
        order_by="date_of_disbursement asc", ignore_permissions=True)

    filter_segments = _build_filter_segments({
        "start_date": start_date, "end_date": end_date,
        "financial_year": filter_fys, "month": month_filters,
    })
    period_active = bool(filter_segments) or bool(start_date) or bool(end_date)

    if filter_segments:
        tracker_rows = [
            t for t in tracker_rows
            if t.date_of_disbursement and any(
                seg_s <= getdate(str(t.date_of_disbursement)) <= seg_e
                for seg_s, seg_e in filter_segments
            )
        ]
    elif start_date or end_date:
        tracker_rows = [t for t in tracker_rows
            if t.date_of_disbursement
            and (not start_date or getdate(str(t.date_of_disbursement)) >= getdate(start_date))
            and (not end_date   or getdate(str(t.date_of_disbursement)) <= getdate(end_date))]

    tracker_map = {}
    for t in tracker_rows:
        tracker_map.setdefault(t.parent, []).append({
            "date_of_disbursement": str(t.date_of_disbursement) if t.date_of_disbursement else "",
            "disbursed_amount": flt(t.disbursed_amount),
        })

    result = []
    for doc in disb_docs:
        ft = tracker_map.get(doc.name, [])
        # ── FIX #1/#2 ──
        # Always sum from Disbursement Tracker rows, never fall back to the
        # stored total_disbursement field on the parent doc. Previously this
        # fell back to the stored field whenever no period filter was
        # active, while the summary card (get_partner_budget_summary)
        # always summed tracker rows — any drift between the stored field
        # and the tracker rows showed up as a card-vs-drilldown mismatch.
        ftotal = sum(flt(t["disbursed_amount"]) for t in ft)
        result.append({
            "name": doc.name, "budget_reference_id": doc.budget_reference_id or "",
            "budget_reference_name": doc.budget_reference_name or "",
            "partner_id": doc.partner_id or "", "partner_name": doc.partner_name or "",
            "grant_id": doc.grant_id or "", "state": doc.state or "",
            "district": doc.district or "", "block": doc.block or "",
            "financial_year": doc.financial_year or "",
            "total_budget": flt(doc.total_budget), "total_disbursement": ftotal,
            "balence_budget": flt(doc.total_budget) - ftotal,
            "tracker": ft,
        })
    if period_active:
        result = [r for r in result if r["tracker"]]
    return result

# ══════════════════════════════════════════════════════════════════════════
# BUDGET LINE ITEMS — UPDATED: uses _prorata_by_budget_year
# ══════════════════════════════════════════════════════════════════════════

def _budget_month_labels(bud_start, bud_end):
    """
    List of {"label","year","month"} dicts for every calendar month from
    bud_start to bud_end inclusive (e.g. "Apr 2025"). Capped at 60 months
    as a sane upper bound so a bad/blank end_date can't runaway-loop.
    """
    months = []
    if not bud_start or not bud_end or bud_start > bud_end:
        return months
    cur = _date(bud_start.year, bud_start.month, 1)
    end_marker = _date(bud_end.year, bud_end.month, 1)
    guard = 0
    while cur <= end_marker and guard < 60:
        months.append({
            "label": f"{MONTH_ORDER[cur.month-1][:3]} {cur.year}",
            "year": cur.year, "month": cur.month,
        })
        cur = _add_months_safe(cur, 1)
        guard += 1
    return months

def _parse_list_param(v):
    if not v: return []
    if isinstance(v, list): return [x for x in v if x]
    try:
        p = json.loads(v)
        if isinstance(p, list): return [x for x in p if x]
    except Exception:
        pass
    return [x.strip() for x in str(v).split(",") if x.strip()]

def _filter_budget_months(months, bud_start, bud_end, start_date=None, end_date=None,
                           financial_year=None, month=None):
    """
    Narrow an already-computed month list (see _budget_month_labels) down
    to whatever the dashboard's active filters ask for. Never widens
    beyond the budget's own start/end — that's already baked into
    `months` before this is called.
    """
    filter_fys    = _parse_list_param(financial_year)
    month_filters = [m.strip() for m in _parse_list_param(month) if str(m).strip()]

    if start_date or end_date:
        sd = getdate(start_date) if start_date else bud_start
        ed = getdate(end_date) if end_date else bud_end
        sd_m = _date(sd.year, sd.month, 1)
        ed_m = _date(ed.year, ed.month, 1)
        return [m for m in months if sd_m <= _date(m["year"], m["month"], 1) <= ed_m]

    if filter_fys or month_filters:
        def _fy_of(y, mo):
            return f"{y}-{str(y+1)[2:]}" if mo >= 4 else f"{y-1}-{str(y)[2:]}"
        return [
            m for m in months
            if (not filter_fys or _fy_of(m["year"], m["month"]) in filter_fys)
            and (not month_filters or MONTH_ORDER[m["month"]-1] in month_filters)
        ]

    return months

@frappe.whitelist()
def get_budget_line_items(budget_id: str, start_date=None, end_date=None,
                          financial_year=None, month=None):
    # ── Month-wise redesign ──
    # Budget Items only ever store annual buckets (year_1/year_2/year_3),
    # not real month-level figures, so each year's amount is spread evenly
    # across its 12 months (year_amount / 12). The set of months shown is
    # always bounded by the budget's own start_date/end_date — the
    # dashboard's date/FY/month filters can only narrow that range
    # further, never extend past it.
    empty = {"months": [], "rows": []}
    if not budget_id: return empty
    _perm.assert_budget_permitted(budget_id)

    bud_start, bud_end = frappe.db.get_value("Creche Budget", budget_id, ["start_date", "end_date"])
    bud_start = getdate(bud_start) if bud_start else None
    bud_end   = getdate(bud_end) if bud_end else None
    if not bud_start or not bud_end:
        return empty

    all_months = _budget_month_labels(bud_start, bud_end)
    shown_months = _filter_budget_months(
        all_months, bud_start, bud_end,
        start_date=start_date, end_date=end_date,
        financial_year=financial_year, month=month,
    )
    shown_labels = [m["label"] for m in shown_months]

    rows = frappe.get_all("Budget Items",
        filters={"parent": budget_id, "parenttype": "Creche Budget"},
        fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
                "budget_sub_head","year_1","year_2","year_3","notes"],
        order_by="budget_main_head asc, type_of_expenses asc", ignore_permissions=True)

    result_rows = []
    for r in rows:
        year_amounts = [flt(r.year_1), flt(r.year_2), flt(r.year_3)]
        monthly = {}
        for m in shown_months:
            months_since_start = (m["year"] * 12 + m["month"]) - (bud_start.year * 12 + bud_start.month)
            year_idx = months_since_start // 12
            amt = round(year_amounts[year_idx] / 12.0, 2) if 0 <= year_idx < 3 else 0.0
            monthly[m["label"]] = amt
        total = round(sum(monthly.values()), 2)
        result_rows.append({
            "type_of_expenses_id": r.type_of_expenses_id,
            "type_of_expenses": r.type_of_expenses, "budget_main_head": r.budget_main_head,
            "budget_sub_head": r.budget_sub_head, "monthly": monthly, "total": total,
            "notes": r.notes or "",
        })

    return {"months": shown_labels, "rows": result_rows}

# ══════════════════════════════════════════════════════════════════════════
# UTILISATION LINE ITEMS
# ══════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_utilisation_line_items(budget_id: str, start_date=None, end_date=None,
                               financial_year=None, month=None):
    # ── Month-wise redesign ──
    # Unlike Budget Items, real submitted utilisation IS recorded per
    # calendar month (one Creche utilisation doc per month), so this pivots
    # actual data rather than prorating — each cell is the real amount
    # submitted for that expense line in that month, 0 if nothing was
    # submitted. Months shown are bounded by the budget's own start/end
    # date the same way as the budget-items endpoint above.
    empty = {"months": [], "rows": []}
    if not budget_id: return empty
    _perm.assert_budget_permitted(budget_id)

    bud_start, bud_end = frappe.db.get_value("Creche Budget", budget_id, ["start_date", "end_date"])
    bud_start = getdate(bud_start) if bud_start else None
    bud_end   = getdate(bud_end) if bud_end else None
    if not bud_start or not bud_end:
        return empty

    all_months = _budget_month_labels(bud_start, bud_end)
    shown_months = _filter_budget_months(
        all_months, bud_start, bud_end,
        start_date=start_date, end_date=end_date,
        financial_year=financial_year, month=month,
    )
    shown_labels = set(m["label"] for m in shown_months)

    util_docs = frappe.get_all("Creche utilisation",
        filters={"budget_reference_id": budget_id},
        fields=["name", "month", "financial_year"], ignore_permissions=True)

    # Map each utilisation doc to the "Mon YYYY" label it actually falls on
    doc_month_label = {}
    for d in util_docs:
        try:
            mo_num = list(_calendar.month_name).index(d.month)  # 1-12
            fy_start_year = int(str(d.financial_year).split("-")[0])
            year = fy_start_year if mo_num >= 4 else fy_start_year + 1
            doc_month_label[d.name] = f"{MONTH_ORDER[mo_num-1][:3]} {year}"
        except Exception:
            continue

    relevant_doc_names = [name for name, label in doc_month_label.items() if label in shown_labels]

    items = []
    if relevant_doc_names:
        items = frappe.get_all("Utilisation Items",
            filters={"parent": ["in", relevant_doc_names], "parenttype": "Creche utilisation"},
            fields=["parent", "type_of_expenses_id", "type_of_expenses",
                    "budget_main_head", "budget_sub_head", "total_amount"],
            ignore_permissions=True)

    agg = {}   # key -> {label: amount}
    meta = {}  # key -> display fields
    for it in items:
        label = doc_month_label.get(it.parent)
        if not label:
            continue
        key = (it.type_of_expenses or "", it.budget_sub_head or "", it.budget_main_head or "")
        agg.setdefault(key, {})
        agg[key][label] = agg[key].get(label, 0.0) + flt(it.total_amount)
        if key not in meta:
            meta[key] = {
                "type_of_expenses_id": it.type_of_expenses_id,
                "type_of_expenses": it.type_of_expenses,
                "budget_sub_head": it.budget_sub_head,
                "budget_main_head": it.budget_main_head,
            }

    result_rows = []
    for key, monthly_amounts in agg.items():
        monthly = {label: round(monthly_amounts.get(label, 0.0), 2) for label in shown_labels}
        total = round(sum(monthly.values()), 2)
        row = dict(meta[key])
        row["monthly"] = monthly
        row["total"] = total
        result_rows.append(row)

    # Keep column order chronological regardless of dict iteration order
    ordered_labels = [m["label"] for m in shown_months]
    return {"months": ordered_labels, "rows": result_rows}

# ══════════════════════════════════════════════════════════════════════════
# PENDING UTILIZATION
# ══════════════════════════════════════════════════════════════════════════

def _get_partner_emails(partner_ids):
    email_map = {}
    if not partner_ids: return email_map
    perm_rows = frappe.db.sql(
        """SELECT up.for_value AS partner_id, u.email
           FROM `tabUser Permission` up
           INNER JOIN `tabUser` u ON u.name = up.user AND u.enabled = 1
           WHERE up.allow = 'Creche Partners' AND up.for_value IN %(pids)s
           ORDER BY u.name""",
        {"pids": partner_ids}, as_dict=True,
    )
    for row in perm_rows:
        if row.partner_id not in email_map and row.email:
            email_map[row.partner_id] = row.email

    missing = [p for p in partner_ids if p not in email_map]
    if missing:
        for field in ("email", "email_id", "contact_email"):
            try:
                rows = frappe.get_all("Creche Partners", filters={"name": ["in", missing]},
                                      fields=["name", field], ignore_permissions=True)
                for r in rows:
                    v = r.get(field, "")
                    if v and r.name not in email_map:
                        email_map[r.name] = v
            except Exception:
                continue
    return email_map

def _get_partner_mobiles(partner_ids):
    """
    Return {partner_id: mobile_no} for given partner IDs.
    Priority: User.mobile_no (via User Permission) → Creche Partners direct field.
    """
    mobile_map = {}
    if not partner_ids:
        return mobile_map

    # Strategy 1: Get mobile_no from User doctype via User Permission link
    try:
        perm_rows = frappe.db.sql(
            """
            SELECT up.for_value AS partner_id, u.mobile_no
            FROM `tabUser Permission` up
            INNER JOIN `tabUser` u ON u.name = up.user AND u.enabled = 1
            WHERE up.allow = 'Creche Partners'
              AND up.for_value IN %(pids)s
            ORDER BY u.name
            """,
            {"pids": partner_ids},
            as_dict=True,
        )
        for row in perm_rows:
            if row.partner_id not in mobile_map and row.mobile_no:
                mobile_map[row.partner_id] = str(row.mobile_no)
    except Exception:
        pass

    # Strategy 2: fallback to direct field on Creche Partners doctype
    missing = [p for p in partner_ids if p not in mobile_map]
    if missing:
        for field in ("mobile_no", "mobile", "phone", "contact_mobile"):
            try:
                rows = frappe.get_all(
                    "Creche Partners",
                    filters={"name": ["in", missing]},
                    fields=["name", field],
                    ignore_permissions=True,
                )
                for r in rows:
                    v = r.get(field, "")
                    if v and r.name not in mobile_map:
                        mobile_map[r.name] = str(v)
            except Exception:
                continue

    return mobile_map


def _get_running_creches_count(permitted_partners=None):
    """
    Sum no_of_running_creches from the MOST RECENTLY MODIFIED utilization
    record per budget. Uses `modified` (last updated) rather than `creation`.
    """
    try:
        # Build optional partner filter
        where_partner = ""
        params_partner = []
        if permitted_partners:
            ph = ",".join(["%s"] * len(permitted_partners))
            where_partner = f"WHERE partner_id IN ({ph})"
            params_partner = list(permitted_partners)

        # Get the latest modified record per budget, then sum the field
        rows = frappe.db.sql(
            f"""
            SELECT cu.no_of_running_creches
            FROM `tabCreche utilisation` cu
            INNER JOIN (
                SELECT budget_reference_id, MAX(modified) AS max_m
                FROM `tabCreche utilisation`
                {where_partner}
                GROUP BY budget_reference_id
            ) latest ON cu.budget_reference_id = latest.budget_reference_id
                     AND cu.modified = latest.max_m
            """,
            params_partner,
            as_dict=True,
        )
        return int(sum(int(r.no_of_running_creches or 0) for r in rows))
    except Exception as e:
        frappe.log_error(str(e), "get_running_creches_count")
        return 0



def _add_month(d):
    if relativedelta:
        return d + relativedelta(months=1)
    y, m = d.year, d.month + 1
    if m > 12: y += 1; m = 1
    return _date(y, m, 1)

@frappe.whitelist()
def get_pending_utilisation_summary(cutoff_date=None, target_fy=None, target_month=None, filters=None):
    if isinstance(filters, str):
        filters = json.loads(filters) if filters else {}
    filters = filters or {}

    today = getdate(frappe.utils.nowdate())
    if cutoff_date:
        cutoff = getdate(cutoff_date)
    else:
        if today.day >= 5:
            cutoff = today.replace(day=5)
        else:
            y, m = today.year, today.month - 1
            if m < 1: y -= 1; m = 12
            cutoff = _date(y, m, 5)

    boundary_month_start = cutoff.replace(day=1)

    # ── FIX ──
    # The pending-utilisation card/popup previously ignored the dashboard's
    # own filters entirely (only permission-based partner restriction was
    # applied). Now it respects Partner / Budget Reference / Grant ID /
    # State / District / Block exactly like the rest of the dashboard,
    # using the same _intersect() helper so "no partner selected" still
    # correctly means "all partners I'm permitted to see" rather than zero.
    permitted = _get_user_permitted_partners()
    filter_partners = filters.get("partner_id") or None
    effective_partners = _intersect(filter_partners, permitted)
    if effective_partners is not None and len(effective_partners) == 0:
        return {"partners": [], "cutoff": str(cutoff)}

    budget_filters = [
        ["start_date", "is", "set"],
        ["end_date", "is", "set"],
        ["start_date", "<=", cutoff],
    ]
    if effective_partners:
        budget_filters.append(["partner_id", "in", effective_partners])
    if filters.get("budget_ref"):
        budget_filters.append(["budget_reference_name", "in", filters["budget_ref"]])
    if filters.get("grant_id"):
        budget_filters.append(["grant_id", "in", filters["grant_id"]])
    if filters.get("state"):
        budget_filters.append(["state", "in", filters["state"]])
    if filters.get("district"):
        budget_filters.append(["district", "in", filters["district"]])
    if filters.get("block"):
        budget_filters.append(["block", "in", filters["block"]])

    effective_budget_ids = _perm.get_effective_budget_ids()
    if effective_budget_ids is not None:
        budget_filters.append(["name", "in", effective_budget_ids or ["__none__"]])

    budgets = frappe.get_all(
        "Creche Budget",
        fields=["name","budget_reference_name","partner_id","partner_name",
                "grant_id","state","district","block","start_date","end_date"],
        filters=budget_filters, ignore_permissions=True, limit_page_length=0,
    )
    if not budgets:
        return {"partners": [], "cutoff": str(cutoff)}

    budget_names = [b["name"] for b in budgets]
    existing = set(
        (r["budget_reference_id"], r["financial_year"], r["month"])
        for r in frappe.get_all("Creche utilisation",
            filters={"budget_reference_id": ["in", budget_names]},
            fields=["budget_reference_id","financial_year","month"],
            ignore_permissions=True, limit_page_length=0)
    )

    # ── Last disbursement date per budget ──────────────────────────────────
    # Utilisation is only "pending" from the point money was actually
    # disbursed — a budget with no disbursement yet has nothing to utilise
    # against, so it's excluded rather than counted pending from its
    # start_date.
    disb_docs = frappe.get_all("Creche Disbursement",
        filters={"budget_reference_id": ["in", budget_names]},
        fields=["name", "budget_reference_id"], ignore_permissions=True, limit_page_length=0)
    disb_to_budget = {d["name"]: d["budget_reference_id"] for d in disb_docs}
    last_disbursement_by_budget = {}
    if disb_to_budget:
        for t in frappe.get_all("Disbursement Tracker",
                filters={"parent": ["in", list(disb_to_budget.keys())], "parenttype": "Creche Disbursement"},
                fields=["parent", "date_of_disbursement"], ignore_permissions=True, limit_page_length=0):
            if not t["date_of_disbursement"]:
                continue
            bid = disb_to_budget.get(t["parent"])
            if not bid:
                continue
            d = getdate(t["date_of_disbursement"])
            if bid not in last_disbursement_by_budget or d > last_disbursement_by_budget[bid]:
                last_disbursement_by_budget[bid] = d

    # When target_fy and target_month are given, only check that specific month
    check_specific = bool(target_fy and target_month)

    by_partner = {}
    for b in budgets:
        last_disbursement = last_disbursement_by_budget.get(b["name"])
        if not last_disbursement:
            continue  # nothing disbursed yet — nothing to utilise/report pending

        bud_start = last_disbursement
        bud_end   = getdate(b["end_date"])

        missing_for_budget = []
        total_months_checked = 0

        if check_specific:
            # Only check the one selected month
            try:
                month_num = list(_calendar.month_name).index(target_month)  # 1-12
            except ValueError:
                continue
            fy_start_year = int(target_fy.split("-")[0])
            year = fy_start_year if month_num >= 4 else fy_start_year + 1
            month_start = _date(year, month_num, 1)

            # Skip if this month is outside the disbursed-to-end period
            if month_start < bud_start.replace(day=1) or month_start > bud_end.replace(day=1):
                continue
            total_months_checked = 1
            # Skip if submission already exists
            if (b["name"], target_fy, target_month) in existing:
                continue

            deadline = _add_month(month_start).replace(day=5)
            days_overdue = (cutoff - deadline).days
            missing_for_budget.append({
                "financial_year": target_fy, "month": target_month,
                "deadline": deadline.isoformat(),
                "days_overdue": max(days_overdue, 0),
            })
        else:
            # Check all months from the last disbursement date to boundary
            start = bud_start
            end   = bud_end
            effective_end = min(end.replace(day=1), boundary_month_start)
            cursor = start.replace(day=1)
            while cursor <= effective_end:
                total_months_checked += 1
                month_name = MONTH_ORDER[cursor.month - 1]
                fy_label = (f"{cursor.year}-{str(cursor.year+1)[2:]}" if cursor.month >= 4
                            else f"{cursor.year-1}-{str(cursor.year)[2:]}")
                if (b["name"], fy_label, month_name) not in existing:
                    deadline = _add_month(cursor).replace(day=5)
                    days_overdue = (cutoff - deadline).days
                    missing_for_budget.append({
                        "financial_year": fy_label, "month": month_name,
                        "deadline": deadline.isoformat(),
                        "days_overdue": max(days_overdue, 0),
                    })
                cursor = _add_month(cursor)

        if not missing_for_budget:
            continue

        pid = b["partner_id"] or b["partner_name"] or "Unknown"
        if pid not in by_partner:
            by_partner[pid] = {
                "partner_id": b["partner_id"], "partner_name": b["partner_name"],
                "missing_count": 0, "max_days_overdue": 0, "budgets": [],
            }
        entry = by_partner[pid]
        entry["budgets"].append({
            "budget_id": b["name"], "budget_reference_name": b["budget_reference_name"],
            "grant_id": b["grant_id"], "state": b["state"],
            "missing_months": missing_for_budget,
            "total_months_checked": total_months_checked,
        })
        entry["missing_count"] += len(missing_for_budget)
        entry["max_days_overdue"] = max(
            entry["max_days_overdue"],
            max((m["days_overdue"] for m in missing_for_budget), default=0),
        )

    partner_ids = [pid for pid in by_partner if pid]
    email_map   = _get_partner_emails(partner_ids)
    mobile_map  = _get_partner_mobiles(partner_ids)

    result = []
    for pid, entry in by_partner.items():
        entry["email"]  = email_map.get(pid, "")
        entry["mobile"] = mobile_map.get(pid, "")
        result.append(entry)
    result.sort(key=lambda r: (-r["max_days_overdue"], r["partner_name"] or ""))
    return {"partners": result, "cutoff": str(cutoff)}

@frappe.whitelist()
def send_utilisation_reminder(partner_ids=None, custom_message=None):
    if isinstance(partner_ids, str):
        try: partner_ids = json.loads(partner_ids)
        except Exception: partner_ids = [p.strip() for p in partner_ids.split(",") if p.strip()]
    partner_ids = partner_ids or []
    if not partner_ids: frappe.throw(frappe._("No partners selected"))

    permitted = _get_user_permitted_partners()
    if permitted is not None:
        partner_ids = [p for p in partner_ids if p in permitted]
        if not partner_ids: frappe.throw(frappe._("You do not have permission to email these partners"))

    email_map = _get_partner_emails(partner_ids)
    partner_names = {r.name: r.partner_name for r in frappe.get_all(
        "Creche Partners", filters={"name": ["in", partner_ids]},
        fields=["name","partner_name"], ignore_permissions=True)}

    default_message = ("This is a reminder that your utilisation report submission is pending. "
                       "Kindly submit it at the earliest to keep your budget records up to date.")
    message_body = custom_message or default_message

    sent, failed = [], []
    for pid in partner_ids:
        email = email_map.get(pid)
        pname = partner_names.get(pid, pid)
        if not email:
            failed.append({"partner_id": pid, "partner_name": pname, "reason": "No email on file"})
            continue
        try:
            frappe.sendmail(
                recipients=[email],
                subject="Utilisation Report Submission Reminder",
                message=f"<p>Dear {frappe.utils.escape_html(pname)},</p><p>{frappe.utils.escape_html(message_body)}</p>",
                now=True,
            )
            sent.append({"partner_id": pid, "partner_name": pname, "email": email})
        except Exception as e:
            failed.append({"partner_id": pid, "partner_name": pname, "reason": str(e)})

    return {"sent": sent, "failed": failed}

# ══════════════════════════════════════════════════════════════════════════
# EXPORT
# ══════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def export_table(title="Report", columns=None, rows=None, format="xlsx"):
    if isinstance(columns, str): columns = json.loads(columns)
    if isinstance(rows, str):    rows    = json.loads(rows)
    columns = columns or []; rows = rows or []

    if format == "pdf":
        file_url = _export_pdf(title, columns, rows)
    else:
        file_url = _export_xlsx(title, columns, rows)
    return {"file_url": file_url}

@frappe.whitelist()
def export_pending_utilisation_grid(title="Pending Utilization Submission", columns=None, grid=None, merges=None):
    # ── Rowspan-preserving export ──
    # Unlike export_table (flat columns+rows), this mirrors the on-screen
    # partner-grouped table exactly: Partner Name / Total Pending Months /
    # Email are each a single merged cell spanning all of that partner's
    # budget rows, matching the requested Excel layout.
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter
    except ImportError:
        frappe.throw(frappe._("openpyxl is required for Excel export."))

    if isinstance(columns, str): columns = json.loads(columns)
    if isinstance(grid, str):    grid    = json.loads(grid)
    if isinstance(merges, str):  merges  = json.loads(merges) if merges else []
    columns = columns or []; grid = grid or []; merges = merges or []

    wb = Workbook(); ws = wb.active; ws.title = (title or "Data")[:31]
    NAVY = "1E3A5F"; GRID_C = "94A3B8"; BORDER_C = "1E3A5F"
    thin_grid = Border(left=Side(style="thin",color=GRID_C),right=Side(style="thin",color=GRID_C),
                       top=Side(style="thin",color=GRID_C),bottom=Side(style="thin",color=GRID_C))
    thin_hdr  = Border(left=Side(style="thin",color=BORDER_C),right=Side(style="thin",color=BORDER_C),
                       top=Side(style="thin",color=BORDER_C),bottom=Side(style="thin",color=BORDER_C))
    header_font = Font(bold=True,color="FFFFFF",size=10)
    header_fill = PatternFill(start_color=NAVY,end_color=NAVY,fill_type="solid")

    for ci, col in enumerate(columns, start=1):
        label = col.get("label","") if isinstance(col, dict) else col
        c = ws.cell(row=1, column=ci, value=label)
        c.font = header_font; c.fill = header_fill; c.border = thin_hdr
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for ri, row_vals in enumerate(grid, start=2):
        for ci, val in enumerate(row_vals, start=1):
            cell = ws.cell(row=ri, column=ci)
            if val not in (None, ""):
                # Numbers (Months Pending / Total Pending Months) stay numeric for correct spreadsheet math
                try:
                    cell.value = int(val) if str(val).strip().lstrip('-').isdigit() else val
                except Exception:
                    cell.value = val
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = thin_grid

    for m in merges:
        if len(m) != 4: continue
        r0, c0, r1, c1 = m
        if r0 == r1 and c0 == c1: continue
        ws.merge_cells(start_row=r0+2, start_column=c0+1, end_row=r1+2, end_column=c1+1)
        # Re-apply the border to every cell in the merged range (not just the
        # anchor) so Excel draws a clean, unbroken border around the whole
        # merged block instead of only the top-left cell.
        for r in range(r0 + 2, r1 + 3):
            for c in range(c0 + 1, c1 + 2):
                ws.cell(row=r, column=c).border = thin_grid

    widths = [6, 20, 20, 14, 42, 18, 30]
    for ci in range(1, len(columns) + 1):
        ws.column_dimensions[get_column_letter(ci)].width = widths[ci-1] if ci-1 < len(widths) else 18
    ws.freeze_panes = "A2"

    buf = io.BytesIO(); wb.save(buf); buf.seek(0)
    return {"file_url": _save_file(f"{_safe_fname(title)}.xlsx", buf.getvalue())}

def _is_total_row(row, columns):
    if not columns: return False
    return str(row.get(columns[0].get("key"), "")).strip().lower() == "total"

def _export_xlsx(title, columns, rows):
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter
    except ImportError:
        frappe.throw(frappe._("openpyxl is required for Excel export."))

    wb = Workbook(); ws = wb.active; ws.title = (title or "Data")[:31]
    NAVY="1E3A5F"; LIGHTBLUE="BFDBFE"; BORDER_C="1E3A5F"; GRID_C="94A3B8"; GROUP_FILL="DBEAFE"
    thin_grid = Border(left=Side(style="thin",color=GRID_C),right=Side(style="thin",color=GRID_C),
                       top=Side(style="thin",color=GRID_C),bottom=Side(style="thin",color=GRID_C))
    thin_hdr  = Border(left=Side(style="thin",color=BORDER_C),right=Side(style="thin",color=BORDER_C),
                       top=Side(style="thin",color=BORDER_C),bottom=Side(style="thin",color=BORDER_C))
    header_font = Font(bold=True,color="FFFFFF",size=10)
    header_fill = PatternFill(start_color=NAVY,end_color=NAVY,fill_type="solid")
    total_font  = Font(bold=True,color=NAVY,size=11)
    total_fill  = PatternFill(start_color=LIGHTBLUE,end_color=LIGHTBLUE,fill_type="solid")
    group_font  = Font(bold=True,color=NAVY,size=10.5)
    group_fill  = PatternFill(start_color=GROUP_FILL,end_color=GROUP_FILL,fill_type="solid")

    for ci, col in enumerate(columns, start=1):
        c = ws.cell(row=1,column=ci,value=col.get("label",""))
        c.font=header_font; c.fill=header_fill; c.border=thin_hdr
        c.alignment=Alignment(horizontal="center",vertical="center",wrap_text=True)

    ncols = max(len(columns),1); r_idx = 2
    for row in rows:
        if row.get("__group__"):
            ws.merge_cells(start_row=r_idx,start_column=1,end_row=r_idx,end_column=max(ncols-1,1))
            lc = ws.cell(row=r_idx,column=1,value=row.get("label",""))
            lc.font=group_font; lc.fill=group_fill; lc.border=thin_hdr
            lc.alignment=Alignment(horizontal="left",vertical="center",indent=1)
            sc = ws.cell(row=r_idx,column=ncols,value=row.get("subtotal",""))
            sc.font=group_font; sc.fill=group_fill; sc.border=thin_hdr
            sc.alignment=Alignment(horizontal="right",vertical="center")
            r_idx += 1; continue

        total_row = _is_total_row(row, columns)
        for ci, col in enumerate(columns, start=1):
            val = row.get(col.get("key"),"")
            align = col.get("align","left")
            cell = ws.cell(row=r_idx,column=ci)
            if align=="right" and isinstance(val,(int,float)):
                cell.value=val; cell.number_format="#,##0.00"
            else:
                cell.value=val
            cell.alignment=Alignment(horizontal=align)
            if total_row: cell.font=total_font; cell.fill=total_fill; cell.border=thin_hdr
            else: cell.border=thin_grid
        r_idx += 1

    for ci, col in enumerate(columns, start=1):
        letter = get_column_letter(ci)
        max_len = len(str(col.get("label","")))
        for row in rows:
            if row.get("__group__"): continue
            v = row.get(col.get("key"),"")
            max_len = max(max_len, len(str(v)))
        ws.column_dimensions[letter].width = min(max_len+4, 42)
    ws.freeze_panes = "A2"

    buf = io.BytesIO(); wb.save(buf); buf.seek(0)
    return _save_file(f"{_safe_fname(title)}.xlsx", buf.getvalue())

def _export_pdf(title, columns, rows):
    thead = "".join(f"<th>{frappe.utils.escape_html(c.get('label',''))}</th>" for c in columns)
    ncols = max(len(columns), 1); body_rows = []
    for row in rows:
        if row.get("__group__"):
            label   = frappe.utils.escape_html(row.get("label",""))
            subtotal= frappe.utils.escape_html(row.get("subtotal",""))
            body_rows.append(f'<tr class="group-row"><td colspan="{ncols}">'
                             f'<span class="group-row__label">{label}</span>'
                             f'<span class="group-row__subtotal">{subtotal}</span></td></tr>')
            continue
        total_row = _is_total_row(row, columns)
        tds = [f'<td style="text-align:{c.get("align","left")}">{frappe.utils.escape_html(str(row.get(c.get("key"),"" )))}</td>'
               for c in columns]
        body_rows.append(f'<tr{"  class=\"total-row\"" if total_row else ""}>{"".join(tds)}</tr>')

    html = f"""<html><head><meta charset="utf-8">
    <style>@page{{size:A4 portrait;margin:14mm 10mm}}*{{box-sizing:border-box;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif}}body{{color:#1f2937}}h1{{font-size:16px;font-weight:700;color:#1e3a5f;margin-bottom:4px}}.meta{{font-size:9px;color:#94a3b8;margin-bottom:12px}}table{{width:100%;border-collapse:collapse;font-size:10px}}th{{background:#1e3a5f;color:#fff;font-weight:700;text-transform:uppercase;font-size:8.5px;letter-spacing:.4px;padding:6px 8px;text-align:left;border:1px solid #93c5fd}}td{{padding:5px 8px;border:1px solid #e2e8f0}}tr.total-row td{{background:#bfdbfe;color:#1e3a5f;font-weight:700;border:1px solid #93c5fd}}tr.group-row td{{background:#dbeafe;color:#1e3a5f;font-weight:700;border:1px solid #93c5fd;padding:6px 8px}}.group-row__label{{display:inline-block}}.group-row__subtotal{{float:right}}tr:nth-child(even):not(.total-row):not(.group-row) td{{background:#f8fafc}}</style>
    </head><body>
    <h1>{frappe.utils.escape_html(title or "Report")}</h1>
    <div class="meta">Exported {frappe.utils.now_datetime().strftime("%d %b %Y, %I:%M %p")} by {frappe.session.user}</div>
    <table><thead><tr>{thead}</tr></thead><tbody>{"".join(body_rows)}</tbody></table>
    </body></html>"""

    from frappe.utils.pdf import get_pdf
    pdf_content = get_pdf(html, options={"page-size":"A4","orientation":"Portrait"})
    return _save_file(f"{_safe_fname(title)}.pdf", pdf_content)

def _safe_fname(title):
    import re
    base = re.sub(r"[^A-Za-z0-9_-]+","_",title or "report").strip("_") or "report"
    return base[:80]

def _save_file(fname, content):
    f = frappe.get_doc({"doctype":"File","file_name":fname,"is_private":0,"content":content})
    f.save(ignore_permissions=True)
    return f.file_url
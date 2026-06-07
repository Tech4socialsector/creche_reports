# import frappe
# from frappe.utils import flt, getdate


# # ──────────────────────────────────────────────────────────────────────────────
# # PERMISSION HELPERS
# # ──────────────────────────────────────────────────────────────────────────────

# def _get_user_permitted_partners():
# 	user  = frappe.session.user
# 	roles = frappe.get_roles(user)

# 	if "System Manager" in roles or user == "Administrator":
# 		return None

# 	# Direct SQL — bypasses all ORM permission layers, guaranteed to work
# 	rows = frappe.db.sql(
# 		"""
# 			SELECT for_value
# 			FROM `tabUser Permission`
# 			WHERE user = %s
# 			  AND allow = 'Creche Partners'
# 			  AND (is_default = 1 OR is_default = 0 OR is_default IS NULL)
# 		""",
# 		(user,),
# 		as_dict=True,
# 	)

# 	if not rows:
# 		# No User Permissions configured for this user on Creche Partners
# 		# → unrestricted: show all data
# 		return None

# 	# Return the list of permitted Creche Partners document names (IDs)
# 	return [r.for_value for r in rows if r.for_value]


# def _intersect(filter_list, permitted):
# 	if permitted is None:
# 		return filter_list
# 	if not permitted:
# 		return []
# 	if not filter_list:
# 		return permitted
# 	pset = set(permitted)
# 	return [p for p in filter_list if p in pset]


# def _empty_summary():
# 	return {
# 		"total_budget": 0, "total_disbursement": 0,
# 		"total_utilisation": 0, "total_bank_balance": 0,
# 		"total_interest": 0, "total_creches": 0,
# 		"utilisation_pct": 0, "disbursement_pct": 0,
# 	}


# # ──────────────────────────────────────────────────────────────────────────────
# # PARTNER OPTIONS  (filter dropdown — permission-aware)
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def debug_user_permissions():
# 	"""Temporary debug endpoint — remove after fixing."""
# 	user = frappe.session.user
# 	roles = frappe.get_roles(user)

# 	# Raw SQL result
# 	rows = frappe.db.sql(
# 		"SELECT * FROM `tabUser Permission` WHERE user = %s",
# 		(user,), as_dict=True
# 	)

# 	# Also check with allow filter
# 	filtered = frappe.db.sql(
# 		"SELECT * FROM `tabUser Permission` WHERE user = %s AND allow = %s",
# 		(user, "Creche Partners"), as_dict=True
# 	)

# 	# Check all distinct allow values for this user
# 	distinct_allows = frappe.db.sql(
# 		"SELECT DISTINCT allow FROM `tabUser Permission` WHERE user = %s",
# 		(user,), as_dict=True
# 	)

# 	return {
# 		"user": user,
# 		"roles": roles,
# 		"all_permissions": rows,
# 		"creche_partners_permissions": filtered,
# 		"distinct_allows": distinct_allows,
# 	}

# @frappe.whitelist()
# def get_partner_options(txt=""):
# 	"""
# 	Returns permission-filtered partner list for the Partner filter dropdown.
# 	Restricted users only see their assigned partners.
# 	Response: [{ "name": "CRP-00001", "partner_name": "Test One" }, ...]
# 	"""
# 	permitted = _get_user_permitted_partners()
# 	filters   = {}

# 	if permitted is not None:
# 		if not permitted:
# 			return []
# 		filters["name"] = ["in", permitted]

# 	if txt:
# 		filters["partner_name"] = ["like", f"%{txt}%"]

# 	rows = frappe.get_all(
# 		"Creche Partners",
# 		filters=filters,
# 		fields=["name", "partner_name"],
# 		order_by="partner_name asc",
# 		limit=500,
# 		ignore_permissions=True,
# 	)
# 	return [{"name": r.name, "partner_name": r.partner_name or r.name} for r in rows]


# # ──────────────────────────────────────────────────────────────────────────────
# # USER PERMISSION SCOPE
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_user_permission_scope():
# 	permitted = _get_user_permitted_partners()
# 	if permitted is None:
# 		return {"restricted": False, "partner_ids": []}
# 	return {"restricted": True, "partner_ids": permitted}


# # ──────────────────────────────────────────────────────────────────────────────
# # MAIN SUMMARY
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_partner_budget_summary(filters=None):
# 	if isinstance(filters, str):
# 		import json
# 		filters = json.loads(filters)
# 	filters = filters or {}

# 	permitted        = _get_user_permitted_partners()
# 	filter_partners  = filters.get("partner_id") or None
# 	effective_partners = _intersect(filter_partners, permitted)

# 	if effective_partners is not None and len(effective_partners) == 0:
# 		return {"summary": _empty_summary(), "partners": []}

# 	start_date = filters.get("start_date") or None
# 	end_date   = filters.get("end_date")   or None

# 	# ── Creche Budget filters ────────────────────────────────────────────────
# 	budget_filters = {}
# 	if effective_partners:
# 		budget_filters["partner_id"] = ["in", effective_partners]
# 	if filters.get("budget_ref"):
# 		budget_filters["budget_reference_name"] = ["in", filters["budget_ref"]]
# 	if filters.get("grant_id"):
# 		budget_filters["grant_id"] = ["in", filters["grant_id"]]
# 	if filters.get("financial_year"):
# 		budget_filters["financial_year"] = ["in", filters["financial_year"]]
# 	if filters.get("state"):
# 		budget_filters["state"] = ["in", filters["state"]]
# 	if filters.get("district"):
# 		budget_filters["district"] = ["in", filters["district"]]
# 	if filters.get("block"):
# 		budget_filters["block"] = ["in", filters["block"]]
# 	# Budget date range: filter on budget start_date and end_date
# 	if start_date:
# 		budget_filters["start_date"] = [">=", start_date]
# 	if end_date:
# 		budget_filters["end_date"]   = ["<=", end_date]

# 	budgets = frappe.get_all(
# 		"Creche Budget",
# 		filters=budget_filters,
# 		fields=[
# 			"name", "partner_id", "partner_name", "grant_id",
# 			"budget_reference_name", "state", "district", "block",
# 			"start_date", "end_date", "financial_year",
# 			"no_of_creches", "total_budget",
# 		],
# 		order_by="partner_name asc, budget_reference_name asc",
# 		ignore_permissions=True,
# 	)

# 	# ── Disbursement — filter by creation date (no dedicated date field) ────────
# 	# Fetch all and filter in Python by creation date if date range is set
# 	disbursements_raw = frappe.get_all(
# 		"Creche Disbursement",
# 		fields=["budget_reference_id", "total_disbursement", "creation"],
# 		ignore_permissions=True,
# 	)
# 	disbursements = [
# 		d for d in disbursements_raw
# 		if (not start_date or (d.creation and getdate(str(d.creation)[:10]) >= getdate(start_date)))
# 		and (not end_date   or (d.creation and getdate(str(d.creation)[:10]) <= getdate(end_date)))
# 	] if (start_date or end_date) else disbursements_raw

# 	# ── Utilisation filters (creation = created on date) ─────────────────────
# 	util_filters = {}
# 	if filters.get("month"):
# 		util_filters["month"] = ["in", filters["month"]]
# 	utilisations_raw = frappe.get_all(
# 		"Creche utilisation",
# 		filters=util_filters,
# 		fields=["budget_reference_id", "total_utilisation", "balance_amount",
# 				"interest_from_bank", "creation"],
# 		ignore_permissions=True,
# 	)
# 	utilisations = [
# 		u for u in utilisations_raw
# 		if (not start_date or (u.creation and getdate(str(u.creation)[:10]) >= getdate(start_date)))
# 		and (not end_date   or (u.creation and getdate(str(u.creation)[:10]) <= getdate(end_date)))
# 	] if (start_date or end_date) else utilisations_raw

# 	# ── Lookup maps ──────────────────────────────────────────────────────────
# 	disbursement_map: dict[str, float] = {}
# 	for row in disbursements:
# 		k = row.budget_reference_id
# 		disbursement_map[k] = disbursement_map.get(k, 0.0) + flt(row.total_disbursement)

# 	utilisation_map:  dict[str, float] = {}
# 	bank_balance_map: dict[str, float] = {}
# 	interest_map:     dict[str, float] = {}
# 	for row in utilisations:
# 		k = row.budget_reference_id
# 		utilisation_map[k]  = utilisation_map.get(k, 0.0)  + flt(row.total_utilisation)
# 		bank_balance_map[k] = bank_balance_map.get(k, 0.0) + flt(row.balance_amount)
# 		interest_map[k]     = interest_map.get(k, 0.0)     + flt(row.interest_from_bank)

# 	# ── Aggregate per partner ────────────────────────────────────────────────
# 	partners: dict[str, dict] = {}
# 	grand = dict(budget=0.0, disbursement=0.0, utilisation=0.0,
# 				 bank_balance=0.0, interest=0.0, creches=0)

# 	for budget in budgets:
# 		bid           = budget.name
# 		budget_amount = flt(budget.total_budget)
# 		disbursement  = flt(disbursement_map.get(bid, 0))
# 		utilisation   = flt(utilisation_map.get(bid, 0))
# 		bank_balance  = flt(bank_balance_map.get(bid, 0))
# 		interest      = flt(interest_map.get(bid, 0))
# 		creches       = int(budget.no_of_creches or 0)

# 		balance_budget            = budget_amount - utilisation
# 		utilised_pct              = round((utilisation / budget_amount * 100)  if budget_amount  else 0, 2)
# 		utilised_disbursement_pct = round((utilisation / disbursement * 100)   if disbursement   else 0, 2)

# 		partner_key = budget.partner_id or budget.partner_name or "Unknown"

# 		if partner_key not in partners:
# 			partners[partner_key] = {
# 				"partner_id": budget.partner_id, "partner_name": budget.partner_name,
# 				"total_budget": 0.0, "total_disbursement": 0.0, "total_utilisation": 0.0,
# 				"total_balance_budget": 0.0, "total_bank_balance": 0.0,
# 				"total_interest": 0.0, "total_creches": 0, "budgets": [],
# 			}

# 		p = partners[partner_key]
# 		p["total_budget"]         += budget_amount
# 		p["total_disbursement"]   += disbursement
# 		p["total_utilisation"]    += utilisation
# 		p["total_balance_budget"] += balance_budget
# 		p["total_bank_balance"]   += bank_balance
# 		p["total_interest"]       += interest
# 		p["total_creches"]        += creches

# 		p["budgets"].append({
# 			"budget_id": bid, "grant_id": budget.grant_id,
# 			"budget_reference_name": budget.budget_reference_name,
# 			"state": budget.state, "district": budget.district, "block": budget.block,
# 			"grant_start": budget.start_date, "grant_end": budget.end_date,
# 			"financial_year": budget.financial_year, "no_of_creches": creches,
# 			"budget": budget_amount, "disbursement": disbursement,
# 			"utilisation": utilisation,
# 			"utilised_pct": utilised_pct,
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

# 	# ── Finalise ─────────────────────────────────────────────────────────────
# 	result = []
# 	for p in partners.values():
# 		p["utilised_pct"] = round(
# 			(p["total_utilisation"] / p["total_budget"] * 100) if p["total_budget"] else 0, 2)
# 		p["grant_ids"] = ", ".join(sorted(set(b["grant_id"] for b in p["budgets"] if b["grant_id"])))
# 		p["budgets"]   = sorted(p["budgets"], key=lambda x: x["budget_reference_name"] or "")
# 		result.append(p)
# 	result.sort(key=lambda x: x["partner_name"] or "")

# 	gb = grand["budget"]
# 	return {
# 		"summary": {
# 			"total_budget":        grand["budget"],
# 			"total_disbursement":  grand["disbursement"],
# 			"total_utilisation":   grand["utilisation"],
# 			"total_bank_balance":  grand["bank_balance"],
# 			"total_interest":      grand["interest"],
# 			"total_creches":       grand["creches"],
# 			"utilisation_pct":     round((grand["utilisation"]  / gb * 100) if gb else 0, 2),
# 			"disbursement_pct":    round((grand["disbursement"] / gb * 100) if gb else 0, 2),
# 		},
# 		"partners": result,
# 	}


# # ──────────────────────────────────────────────────────────────────────────────
# # BUDGET LINE ITEMS
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_budget_line_items(budget_id: str):
# 	if not budget_id:
# 		return []
# 	partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
# 	_assert_partner_access(partner_id)
# 	rows = frappe.get_all(
# 		"Budget Items",
# 		filters={"parent": budget_id, "parenttype": "Creche Budget"},
# 		fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
# 				"budget_sub_head","year_1","year_2","year_3","total_amount","notes"],
# 		order_by="budget_main_head asc, type_of_expenses asc",
# 		ignore_permissions=True,
# 	)
# 	return [{
# 		"type_of_expenses_id": r.type_of_expenses_id,
# 		"type_of_expenses":    r.type_of_expenses,
# 		"budget_main_head":    r.budget_main_head,
# 		"budget_sub_head":     r.budget_sub_head,
# 		"year_1": flt(r.year_1), "year_2": flt(r.year_2), "year_3": flt(r.year_3),
# 		"total_amount": flt(r.total_amount), "notes": r.notes or "",
# 	} for r in rows]


# # ──────────────────────────────────────────────────────────────────────────────
# # UTILISATION LINE ITEMS
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_utilisation_line_items(budget_id: str):
# 	if not budget_id:
# 		return {"months": [], "records": []}
# 	partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
# 	_assert_partner_access(partner_id)

# 	util_docs = frappe.get_all(
# 		"Creche utilisation",
# 		filters={"budget_reference_id": budget_id},
# 		fields=["name", "month", "financial_year"],
# 		order_by="month asc",
# 		ignore_permissions=True,
# 	)
# 	if not util_docs:
# 		return {"months": [], "records": []}

# 	MONTH_ORDER = ["January","February","March","April","May","June",
# 				   "July","August","September","October","November","December"]

# 	records, seen_months = [], []
# 	for doc in util_docs:
# 		items = frappe.get_all(
# 			"Utilisation Items",
# 			filters={"parent": doc.name, "parenttype": "Creche utilisation"},
# 			fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
# 					"budget_sub_head","total_amount","notes"],
# 			order_by="budget_main_head asc, type_of_expenses asc",
# 			ignore_permissions=True,
# 		)
# 		month_label = doc.month or "Unknown"
# 		records.append({
# 			"month": month_label, "financial_year": doc.financial_year or "",
# 			"utilisation_id": doc.name,
# 			"items": [{"type_of_expenses_id": r.type_of_expenses_id,
# 					   "type_of_expenses": r.type_of_expenses,
# 					   "budget_main_head": r.budget_main_head,
# 					   "budget_sub_head": r.budget_sub_head,
# 					   "total_amount": flt(r.total_amount), "notes": r.notes or ""}
# 					  for r in items],
# 		})
# 		if month_label not in seen_months:
# 			seen_months.append(month_label)

# 	def msort(m):
# 		try: return MONTH_ORDER.index(m)
# 		except: return 99

# 	seen_months.sort(key=msort)
# 	records.sort(key=lambda r: msort(r["month"]))
# 	return {"months": seen_months, "records": records}


# # ──────────────────────────────────────────────────────────────────────────────
# # INTERNAL
# # ──────────────────────────────────────────────────────────────────────────────

# def _assert_partner_access(partner_id: str):
# 	permitted = _get_user_permitted_partners()
# 	if permitted is None:
# 		return
# 	if partner_id not in permitted:
# 		frappe.throw(frappe._("You do not have permission to access this partner"),
# 					 frappe.PermissionError)



import frappe
from frappe.utils import flt, getdate


# ──────────────────────────────────────────────────────────────────────────────
# PERMISSION HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def _get_user_permitted_partners():
	user  = frappe.session.user
	roles = frappe.get_roles(user)
	if "System Manager" in roles or user == "Administrator":
		return None
	rows = frappe.db.sql(
		"""
			SELECT for_value FROM `tabUser Permission`
			WHERE user = %s AND allow = 'Creche Partners'
			AND (is_default = 1 OR is_default = 0 OR is_default IS NULL)
		""",
		(user,), as_dict=True,
	)
	if not rows:
		return None
	return [r.for_value for r in rows if r.for_value]


def _intersect(filter_list, permitted):
	if permitted is None:
		return filter_list
	if not permitted:
		return []
	if not filter_list:
		return permitted
	pset = set(permitted)
	return [p for p in filter_list if p in pset]


def _empty_summary():
	return {
		"total_budget": 0, "total_disbursement": 0,
		"total_utilisation": 0, "total_bank_balance": 0,
		"total_interest": 0, "total_creches": 0,
		"utilisation_pct": 0, "disbursement_pct": 0,
	}


# ──────────────────────────────────────────────────────────────────────────────
# PARTNER OPTIONS
# ──────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def debug_user_permissions():
	user = frappe.session.user
	roles = frappe.get_roles(user)
	rows = frappe.db.sql("SELECT * FROM `tabUser Permission` WHERE user = %s", (user,), as_dict=True)
	filtered = frappe.db.sql("SELECT * FROM `tabUser Permission` WHERE user = %s AND allow = %s", (user, "Creche Partners"), as_dict=True)
	distinct_allows = frappe.db.sql("SELECT DISTINCT allow FROM `tabUser Permission` WHERE user = %s", (user,), as_dict=True)
	return {"user": user, "roles": roles, "all_permissions": rows, "creche_partners_permissions": filtered, "distinct_allows": distinct_allows}


@frappe.whitelist()
def get_partner_options(txt=""):
	permitted = _get_user_permitted_partners()
	filters   = {}
	if permitted is not None:
		if not permitted:
			return []
		filters["name"] = ["in", permitted]
	if txt:
		filters["partner_name"] = ["like", f"%{txt}%"]
	rows = frappe.get_all("Creche Partners", filters=filters, fields=["name", "partner_name"], order_by="partner_name asc", limit=500, ignore_permissions=True)
	return [{"name": r.name, "partner_name": r.partner_name or r.name} for r in rows]


@frappe.whitelist()
def get_user_permission_scope():
	permitted = _get_user_permitted_partners()
	if permitted is None:
		return {"restricted": False, "partner_ids": []}
	return {"restricted": True, "partner_ids": permitted}


# ──────────────────────────────────────────────────────────────────────────────
# MAIN SUMMARY
# ──────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_partner_budget_summary(filters=None):
	if isinstance(filters, str):
		import json
		filters = json.loads(filters)
	filters = filters or {}

	permitted          = _get_user_permitted_partners()
	filter_partners    = filters.get("partner_id") or None
	effective_partners = _intersect(filter_partners, permitted)

	if effective_partners is not None and len(effective_partners) == 0:
		return {"summary": _empty_summary(), "partners": []}

	start_date = filters.get("start_date") or None
	end_date   = filters.get("end_date")   or None

	budget_filters = {}
	if effective_partners:
		budget_filters["partner_id"] = ["in", effective_partners]
	if filters.get("budget_ref"):
		budget_filters["budget_reference_name"] = ["in", filters["budget_ref"]]
	if filters.get("grant_id"):
		budget_filters["grant_id"] = ["in", filters["grant_id"]]
	if filters.get("financial_year"):
		budget_filters["financial_year"] = ["in", filters["financial_year"]]
	if filters.get("state"):
		budget_filters["state"] = ["in", filters["state"]]
	if filters.get("district"):
		budget_filters["district"] = ["in", filters["district"]]
	if filters.get("block"):
		budget_filters["block"] = ["in", filters["block"]]
	if start_date:
		budget_filters["start_date"] = [">=", start_date]
	if end_date:
		budget_filters["end_date"]   = ["<=", end_date]

	budgets = frappe.get_all(
		"Creche Budget", filters=budget_filters,
		fields=["name","partner_id","partner_name","grant_id","budget_reference_name",
				"state","district","block","start_date","end_date","financial_year",
				"no_of_creches","total_budget"],
		order_by="partner_name asc, budget_reference_name asc",
		ignore_permissions=True,
	)

	disbursements_raw = frappe.get_all("Creche Disbursement", fields=["budget_reference_id","total_disbursement","creation"], ignore_permissions=True)
	disbursements = [
		d for d in disbursements_raw
		if (not start_date or (d.creation and getdate(str(d.creation)[:10]) >= getdate(start_date)))
		and (not end_date   or (d.creation and getdate(str(d.creation)[:10]) <= getdate(end_date)))
	] if (start_date or end_date) else disbursements_raw

	util_filters = {}
	if filters.get("month"):
		util_filters["month"] = ["in", filters["month"]]
	utilisations_raw = frappe.get_all("Creche utilisation", filters=util_filters, fields=["budget_reference_id","total_utilisation","balance_amount","interest_from_bank","creation"], ignore_permissions=True)
	utilisations = [
		u for u in utilisations_raw
		if (not start_date or (u.creation and getdate(str(u.creation)[:10]) >= getdate(start_date)))
		and (not end_date   or (u.creation and getdate(str(u.creation)[:10]) <= getdate(end_date)))
	] if (start_date or end_date) else utilisations_raw

	disbursement_map: dict = {}
	for row in disbursements:
		k = row.budget_reference_id
		disbursement_map[k] = disbursement_map.get(k, 0.0) + flt(row.total_disbursement)

	utilisation_map: dict = {}
	bank_balance_map: dict = {}
	interest_map: dict = {}
	for row in utilisations:
		k = row.budget_reference_id
		utilisation_map[k]  = utilisation_map.get(k, 0.0)  + flt(row.total_utilisation)
		bank_balance_map[k] = bank_balance_map.get(k, 0.0) + flt(row.balance_amount)
		interest_map[k]     = interest_map.get(k, 0.0)     + flt(row.interest_from_bank)

	partners: dict = {}
	grand = dict(budget=0.0, disbursement=0.0, utilisation=0.0, bank_balance=0.0, interest=0.0, creches=0)

	for budget in budgets:
		bid           = budget.name
		budget_amount = flt(budget.total_budget)
		disbursement  = flt(disbursement_map.get(bid, 0))
		utilisation   = flt(utilisation_map.get(bid, 0))
		bank_balance  = flt(bank_balance_map.get(bid, 0))
		interest      = flt(interest_map.get(bid, 0))
		creches       = int(budget.no_of_creches or 0)

		balance_budget            = budget_amount - utilisation
		utilised_pct              = round((utilisation / budget_amount * 100) if budget_amount else 0, 2)
		utilised_disbursement_pct = round((utilisation / disbursement * 100)  if disbursement  else 0, 2)

		partner_key = budget.partner_id or budget.partner_name or "Unknown"
		if partner_key not in partners:
			partners[partner_key] = {
				"partner_id": budget.partner_id, "partner_name": budget.partner_name,
				"total_budget": 0.0, "total_disbursement": 0.0, "total_utilisation": 0.0,
				"total_balance_budget": 0.0, "total_bank_balance": 0.0,
				"total_interest": 0.0, "total_creches": 0, "budgets": [],
			}

		p = partners[partner_key]
		p["total_budget"]         += budget_amount
		p["total_disbursement"]   += disbursement
		p["total_utilisation"]    += utilisation
		p["total_balance_budget"] += balance_budget
		p["total_bank_balance"]   += bank_balance
		p["total_interest"]       += interest
		p["total_creches"]        += creches

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
			"bank_balance": bank_balance, "interest_from_bank": interest,
		})

		grand["budget"]       += budget_amount
		grand["disbursement"] += disbursement
		grand["utilisation"]  += utilisation
		grand["bank_balance"] += bank_balance
		grand["interest"]     += interest
		grand["creches"]      += creches

	result = []
	for p in partners.values():
		p["utilised_pct"] = round((p["total_utilisation"] / p["total_budget"] * 100) if p["total_budget"] else 0, 2)
		p["grant_ids"] = ", ".join(sorted(set(b["grant_id"] for b in p["budgets"] if b["grant_id"])))
		p["budgets"]   = sorted(p["budgets"], key=lambda x: x["budget_reference_name"] or "")
		result.append(p)
	result.sort(key=lambda x: x["partner_name"] or "")

	gb = grand["budget"]
	return {
		"summary": {
			"total_budget":       grand["budget"],
			"total_disbursement": grand["disbursement"],
			"total_utilisation":  grand["utilisation"],
			"total_bank_balance": grand["bank_balance"],
			"total_interest":     grand["interest"],
			"total_creches":      grand["creches"],
			"utilisation_pct":    round((grand["utilisation"]  / gb * 100) if gb else 0, 2),
			"disbursement_pct":   round((grand["disbursement"] / gb * 100) if gb else 0, 2),
		},
		"partners": result,
	}


# ──────────────────────────────────────────────────────────────────────────────
# DISBURSEMENT PANEL DATA  ← NEW
# ──────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_disbursement_panel_data(budget_ids=None, partner_ids=None):
	"""
	Returns Creche Disbursement docs with Disbursement Tracker child rows.

	budget_ids  — list/comma-string of Creche Budget names
	             (used for single-budget or consolidated partner view)
	partner_ids — list/comma-string of Creche Partners names
	             (used for overall card drill-down)

	Enforces user permissions in all cases.
	"""
	import json

	permitted = _get_user_permitted_partners()

	def _to_list(v):
		if not v:
			return []
		if isinstance(v, str):
			try:
				parsed = json.loads(v)
				if isinstance(parsed, list):
					return [x for x in parsed if x]
			except Exception:
				pass
			return [x.strip() for x in v.split(",") if x.strip()]
		if isinstance(v, list):
			return [x for x in v if x]
		return []

	budget_ids_list  = _to_list(budget_ids)
	partner_ids_list = _to_list(partner_ids)

	disb_filters = {}

	if budget_ids_list:
		# Permission check: get partner_ids for these budgets and verify
		if permitted is not None:
			budget_rows = frappe.get_all(
				"Creche Budget",
				filters={"name": ["in", budget_ids_list]},
				fields=["name", "partner_id"],
				ignore_permissions=True,
			)
			allowed_bids = [r.name for r in budget_rows if r.partner_id in permitted]
			if not allowed_bids:
				return []
			budget_ids_list = allowed_bids
		disb_filters["budget_reference_id"] = ["in", budget_ids_list]

	elif partner_ids_list:
		effective = _intersect(partner_ids_list, permitted)
		if effective is not None and len(effective) == 0:
			return []
		if effective:
			disb_filters["partner_id"] = ["in", effective]
		elif permitted is not None:
			return []

	else:
		# No specific filter — apply permission scope
		if permitted is not None:
			if not permitted:
				return []
			disb_filters["partner_id"] = ["in", permitted]

	disb_docs = frappe.get_all(
		"Creche Disbursement",
		filters=disb_filters,
		fields=[
			"name", "budget_reference_id", "budget_reference_name",
			"partner_id", "partner_name", "grant_id",
			"state", "district", "block", "financial_year",
			"total_disbursement", "balence_budget", "total_budget",
		],
		order_by="partner_name asc, budget_reference_name asc",
		ignore_permissions=True,
	)

	if not disb_docs:
		return []

	# Fetch all Disbursement Tracker child rows in one query
	parent_names = [d.name for d in disb_docs]
	tracker_rows = frappe.get_all(
		"Disbursement Tracker",
		filters={"parent": ["in", parent_names], "parenttype": "Creche Disbursement"},
		fields=["parent", "date_of_disbursement", "disbursed_amount"],
		order_by="date_of_disbursement asc",
		ignore_permissions=True,
	)

	tracker_map: dict = {}
	for row in tracker_rows:
		tracker_map.setdefault(row.parent, []).append({
			"date_of_disbursement": str(row.date_of_disbursement) if row.date_of_disbursement else "",
			"disbursed_amount":     flt(row.disbursed_amount),
		})

	result = []
	for doc in disb_docs:
		result.append({
			"name":                  doc.name,
			"budget_reference_id":   doc.budget_reference_id or "",
			"budget_reference_name": doc.budget_reference_name or "",
			"partner_id":            doc.partner_id or "",
			"partner_name":          doc.partner_name or "",
			"grant_id":              doc.grant_id or "",
			"state":                 doc.state or "",
			"district":              doc.district or "",
			"block":                 doc.block or "",
			"financial_year":        doc.financial_year or "",
			"total_budget":          flt(doc.total_budget),
			"total_disbursement":    flt(doc.total_disbursement),
			"balence_budget":        flt(doc.balence_budget),
			"tracker":               tracker_map.get(doc.name, []),
		})

	return result


# ──────────────────────────────────────────────────────────────────────────────
# BUDGET LINE ITEMS
# ──────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_budget_line_items(budget_id: str):
	if not budget_id:
		return []
	partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
	_assert_partner_access(partner_id)
	rows = frappe.get_all(
		"Budget Items",
		filters={"parent": budget_id, "parenttype": "Creche Budget"},
		fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
				"budget_sub_head","year_1","year_2","year_3","total_amount","notes"],
		order_by="budget_main_head asc, type_of_expenses asc",
		ignore_permissions=True,
	)
	return [{
		"type_of_expenses_id": r.type_of_expenses_id,
		"type_of_expenses":    r.type_of_expenses,
		"budget_main_head":    r.budget_main_head,
		"budget_sub_head":     r.budget_sub_head,
		"year_1": flt(r.year_1), "year_2": flt(r.year_2), "year_3": flt(r.year_3),
		"total_amount": flt(r.total_amount), "notes": r.notes or "",
	} for r in rows]


# ──────────────────────────────────────────────────────────────────────────────
# UTILISATION LINE ITEMS
# ──────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_utilisation_line_items(budget_id: str):
	if not budget_id:
		return {"months": [], "records": []}
	partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
	_assert_partner_access(partner_id)

	util_docs = frappe.get_all(
		"Creche utilisation",
		filters={"budget_reference_id": budget_id},
		fields=["name", "month", "financial_year"],
		order_by="month asc",
		ignore_permissions=True,
	)
	if not util_docs:
		return {"months": [], "records": []}

	MONTH_ORDER = ["January","February","March","April","May","June",
				   "July","August","September","October","November","December"]

	records, seen_months = [], []
	for doc in util_docs:
		items = frappe.get_all(
			"Utilisation Items",
			filters={"parent": doc.name, "parenttype": "Creche utilisation"},
			fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
					"budget_sub_head","total_amount","notes"],
			order_by="budget_main_head asc, type_of_expenses asc",
			ignore_permissions=True,
		)
		month_label = doc.month or "Unknown"
		records.append({
			"month": month_label, "financial_year": doc.financial_year or "",
			"utilisation_id": doc.name,
			"items": [{"type_of_expenses_id": r.type_of_expenses_id,
					   "type_of_expenses": r.type_of_expenses,
					   "budget_main_head": r.budget_main_head,
					   "budget_sub_head": r.budget_sub_head,
					   "total_amount": flt(r.total_amount), "notes": r.notes or ""}
					  for r in items],
		})
		if month_label not in seen_months:
			seen_months.append(month_label)

	def msort(m):
		try: return MONTH_ORDER.index(m)
		except: return 99

	seen_months.sort(key=msort)
	records.sort(key=lambda r: msort(r["month"]))
	return {"months": seen_months, "records": records}


# ──────────────────────────────────────────────────────────────────────────────
# INTERNAL
# ──────────────────────────────────────────────────────────────────────────────

def _assert_partner_access(partner_id: str):
	permitted = _get_user_permitted_partners()
	if permitted is None:
		return
	if partner_id not in permitted:
		frappe.throw(frappe._("You do not have permission to access this partner"),
					 frappe.PermissionError)
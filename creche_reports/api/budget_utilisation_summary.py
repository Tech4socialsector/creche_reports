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
# 	rows = frappe.db.sql(
# 		"""
# 			SELECT for_value FROM `tabUser Permission`
# 			WHERE user = %s AND allow = 'Creche Partners'
# 			AND (is_default = 1 OR is_default = 0 OR is_default IS NULL)
# 		""",
# 		(user,), as_dict=True,
# 	)
# 	if not rows:
# 		return None
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
# # PARTNER OPTIONS
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def debug_user_permissions():
# 	user = frappe.session.user
# 	roles = frappe.get_roles(user)
# 	rows = frappe.db.sql("SELECT * FROM `tabUser Permission` WHERE user = %s", (user,), as_dict=True)
# 	filtered = frappe.db.sql("SELECT * FROM `tabUser Permission` WHERE user = %s AND allow = %s", (user, "Creche Partners"), as_dict=True)
# 	distinct_allows = frappe.db.sql("SELECT DISTINCT allow FROM `tabUser Permission` WHERE user = %s", (user,), as_dict=True)
# 	return {"user": user, "roles": roles, "all_permissions": rows, "creche_partners_permissions": filtered, "distinct_allows": distinct_allows}


# @frappe.whitelist()
# def get_partner_options(txt=""):
# 	permitted = _get_user_permitted_partners()
# 	filters   = {}
# 	if permitted is not None:
# 		if not permitted:
# 			return []
# 		filters["name"] = ["in", permitted]
# 	if txt:
# 		filters["partner_name"] = ["like", f"%{txt}%"]
# 	rows = frappe.get_all("Creche Partners", filters=filters, fields=["name", "partner_name"], order_by="partner_name asc", limit=500, ignore_permissions=True)
# 	return [{"name": r.name, "partner_name": r.partner_name or r.name} for r in rows]


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

# 	permitted          = _get_user_permitted_partners()
# 	filter_partners    = filters.get("partner_id") or None
# 	effective_partners = _intersect(filter_partners, permitted)

# 	if effective_partners is not None and len(effective_partners) == 0:
# 		return {"summary": _empty_summary(), "partners": []}

# 	start_date = filters.get("start_date") or None
# 	end_date   = filters.get("end_date")   or None

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
# 	if start_date:
# 		budget_filters["start_date"] = [">=", start_date]
# 	if end_date:
# 		budget_filters["end_date"]   = ["<=", end_date]

# 	budgets = frappe.get_all(
# 		"Creche Budget", filters=budget_filters,
# 		fields=["name","partner_id","partner_name","grant_id","budget_reference_name",
# 				"state","district","block","start_date","end_date","financial_year",
# 				"no_of_creches","total_budget"],
# 		order_by="partner_name asc, budget_reference_name asc",
# 		ignore_permissions=True,
# 	)

# 	disbursements_raw = frappe.get_all("Creche Disbursement", fields=["budget_reference_id","total_disbursement","creation"], ignore_permissions=True)
# 	disbursements = [
# 		d for d in disbursements_raw
# 		if (not start_date or (d.creation and getdate(str(d.creation)[:10]) >= getdate(start_date)))
# 		and (not end_date   or (d.creation and getdate(str(d.creation)[:10]) <= getdate(end_date)))
# 	] if (start_date or end_date) else disbursements_raw

# 	util_filters = {}
# 	if filters.get("month"):
# 		util_filters["month"] = ["in", filters["month"]]
# 	utilisations_raw = frappe.get_all("Creche utilisation", filters=util_filters, fields=["budget_reference_id","total_utilisation","balance_amount","interest_from_bank","creation"], ignore_permissions=True)
# 	utilisations = [
# 		u for u in utilisations_raw
# 		if (not start_date or (u.creation and getdate(str(u.creation)[:10]) >= getdate(start_date)))
# 		and (not end_date   or (u.creation and getdate(str(u.creation)[:10]) <= getdate(end_date)))
# 	] if (start_date or end_date) else utilisations_raw

# 	disbursement_map: dict = {}
# 	for row in disbursements:
# 		k = row.budget_reference_id
# 		disbursement_map[k] = disbursement_map.get(k, 0.0) + flt(row.total_disbursement)

# 	utilisation_map: dict = {}
# 	bank_balance_map: dict = {}
# 	interest_map: dict = {}
# 	for row in utilisations:
# 		k = row.budget_reference_id
# 		utilisation_map[k]  = utilisation_map.get(k, 0.0)  + flt(row.total_utilisation)
# 		bank_balance_map[k] = bank_balance_map.get(k, 0.0) + flt(row.balance_amount)
# 		interest_map[k]     = interest_map.get(k, 0.0)     + flt(row.interest_from_bank)

# 	partners: dict = {}
# 	grand = dict(budget=0.0, disbursement=0.0, utilisation=0.0, bank_balance=0.0, interest=0.0, creches=0)

# 	for budget in budgets:
# 		bid           = budget.name
# 		budget_amount = flt(budget.total_budget)
# 		disbursement  = flt(disbursement_map.get(bid, 0))
# 		utilisation   = flt(utilisation_map.get(bid, 0))
# 		bank_balance  = flt(bank_balance_map.get(bid, 0))
# 		interest      = flt(interest_map.get(bid, 0))
# 		creches       = int(budget.no_of_creches or 0)

# 		balance_budget            = budget_amount - utilisation
# 		utilised_pct              = round((utilisation / budget_amount * 100) if budget_amount else 0, 2)
# 		utilised_disbursement_pct = round((utilisation / disbursement * 100)  if disbursement  else 0, 2)

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
# 		p["grant_ids"] = ", ".join(sorted(set(b["grant_id"] for b in p["budgets"] if b["grant_id"])))
# 		p["budgets"]   = sorted(p["budgets"], key=lambda x: x["budget_reference_name"] or "")
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
# # DISBURSEMENT PANEL DATA  ← NEW
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_disbursement_panel_data(budget_ids=None, partner_ids=None):
# 	"""
# 	Returns Creche Disbursement docs with Disbursement Tracker child rows.

# 	budget_ids  — list/comma-string of Creche Budget names
# 	             (used for single-budget or consolidated partner view)
# 	partner_ids — list/comma-string of Creche Partners names
# 	             (used for overall card drill-down)

# 	Enforces user permissions in all cases.
# 	"""
# 	import json

# 	permitted = _get_user_permitted_partners()

# 	def _to_list(v):
# 		if not v:
# 			return []
# 		if isinstance(v, str):
# 			try:
# 				parsed = json.loads(v)
# 				if isinstance(parsed, list):
# 					return [x for x in parsed if x]
# 			except Exception:
# 				pass
# 			return [x.strip() for x in v.split(",") if x.strip()]
# 		if isinstance(v, list):
# 			return [x for x in v if x]
# 		return []

# 	budget_ids_list  = _to_list(budget_ids)
# 	partner_ids_list = _to_list(partner_ids)

# 	disb_filters = {}

# 	if budget_ids_list:
# 		# Permission check: get partner_ids for these budgets and verify
# 		if permitted is not None:
# 			budget_rows = frappe.get_all(
# 				"Creche Budget",
# 				filters={"name": ["in", budget_ids_list]},
# 				fields=["name", "partner_id"],
# 				ignore_permissions=True,
# 			)
# 			allowed_bids = [r.name for r in budget_rows if r.partner_id in permitted]
# 			if not allowed_bids:
# 				return []
# 			budget_ids_list = allowed_bids
# 		disb_filters["budget_reference_id"] = ["in", budget_ids_list]

# 	elif partner_ids_list:
# 		effective = _intersect(partner_ids_list, permitted)
# 		if effective is not None and len(effective) == 0:
# 			return []
# 		if effective:
# 			disb_filters["partner_id"] = ["in", effective]
# 		elif permitted is not None:
# 			return []

# 	else:
# 		# No specific filter — apply permission scope
# 		if permitted is not None:
# 			if not permitted:
# 				return []
# 			disb_filters["partner_id"] = ["in", permitted]

# 	disb_docs = frappe.get_all(
# 		"Creche Disbursement",
# 		filters=disb_filters,
# 		fields=[
# 			"name", "budget_reference_id", "budget_reference_name",
# 			"partner_id", "partner_name", "grant_id",
# 			"state", "district", "block", "financial_year",
# 			"total_disbursement", "balence_budget", "total_budget",
# 		],
# 		order_by="partner_name asc, budget_reference_name asc",
# 		ignore_permissions=True,
# 	)

# 	if not disb_docs:
# 		return []

# 	# Fetch all Disbursement Tracker child rows in one query
# 	parent_names = [d.name for d in disb_docs]
# 	tracker_rows = frappe.get_all(
# 		"Disbursement Tracker",
# 		filters={"parent": ["in", parent_names], "parenttype": "Creche Disbursement"},
# 		fields=["parent", "date_of_disbursement", "disbursed_amount"],
# 		order_by="date_of_disbursement asc",
# 		ignore_permissions=True,
# 	)

# 	tracker_map: dict = {}
# 	for row in tracker_rows:
# 		tracker_map.setdefault(row.parent, []).append({
# 			"date_of_disbursement": str(row.date_of_disbursement) if row.date_of_disbursement else "",
# 			"disbursed_amount":     flt(row.disbursed_amount),
# 		})

# 	result = []
# 	for doc in disb_docs:
# 		result.append({
# 			"name":                  doc.name,
# 			"budget_reference_id":   doc.budget_reference_id or "",
# 			"budget_reference_name": doc.budget_reference_name or "",
# 			"partner_id":            doc.partner_id or "",
# 			"partner_name":          doc.partner_name or "",
# 			"grant_id":              doc.grant_id or "",
# 			"state":                 doc.state or "",
# 			"district":              doc.district or "",
# 			"block":                 doc.block or "",
# 			"financial_year":        doc.financial_year or "",
# 			"total_budget":          flt(doc.total_budget),
# 			"total_disbursement":    flt(doc.total_disbursement),
# 			"balence_budget":        flt(doc.balence_budget),
# 			"tracker":               tracker_map.get(doc.name, []),
# 		})

# 	return result


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
from frappe.utils import flt, getdate, nowdate, add_days, now_datetime, get_datetime
from datetime import date as _date, datetime
import calendar as _calendar
import json

# ──────────────────────────────────────────────────────────────────────────────
# PRO-RATA BUDGET HELPERS
# ──────────────────────────────────────────────────────────────────────────────

_FY_MONTH_NAMES = [
	"April","May","June","July","August","September",
	"October","November","December","January","February","March",
]
_FY_MONTH_POS = {m: i for i, m in enumerate(_FY_MONTH_NAMES)}

def _to_date(v):
	if not v: return None
	if isinstance(v, _date): return v
	return _date.fromisoformat(str(v)[:10])

def _date_to_fy(d):
	d = _to_date(d)
	if d is None: return None
	if d.month >= 4:
		return f"{d.year}-{str(d.year + 1)[2:]}"
	return f"{d.year - 1}-{str(d.year)[2:]}"

def _fy_start_end(fy_str):
	y = int(fy_str.split("-")[0])
	return _date(y, 4, 1), _date(y + 1, 3, 31)

def _fy_for_year_col(budget_start, col_offset):
	budget_start = _to_date(budget_start)
	if budget_start is None: return None
	base_fy = _date_to_fy(budget_start)
	base_y  = int(base_fy.split("-")[0])
	y = base_y + col_offset
	return f"{y}-{str(y + 1)[2:]}"

def _months_overlap(a_start, a_end, b_start, b_end):
	"""Count distinct calendar months in overlap of two date ranges."""
	os = max(a_start, b_start)
	oe = min(a_end,   b_end)
	if os > oe: return 0
	count = 0
	y, m = os.year, os.month
	ey, em = oe.year, oe.month
	while (y, m) <= (ey, em):
		count += 1
		m += 1
		if m > 12: m = 1; y += 1
	return count

def _prorata_for_fy(year_amount, bud_start, bud_end, fy_start, fy_end, filt_start, filt_end):
	if not year_amount: return 0.0
	active = _months_overlap(bud_start, bud_end, fy_start, fy_end)
	if active == 0: return 0.0
	eff_s = max(filt_start, fy_start)
	eff_e = min(filt_end,   fy_end)
	if eff_s > eff_e: return 0.0
	selected = _months_overlap(bud_start, bud_end, eff_s, eff_e)
	if selected == 0: return 0.0
	return float(year_amount) / active * selected

def _compute_prorata_budget(budget_name, bud_start, bud_end, filter_segments):
	if not filter_segments:
		return None

	rows = frappe.db.sql(
		"""
		SELECT
			SUM(COALESCE(year_1,0)) AS year_1,
			SUM(COALESCE(year_2,0)) AS year_2,
			SUM(COALESCE(year_3,0)) AS year_3
		FROM `tabBudget Items`
		WHERE parent = %s AND parenttype = 'Creche Budget'
		""",
		(budget_name,), as_dict=True,
	)
	if not rows or not rows[0]: return 0.0
	raw = rows[0]

	bud_s = _to_date(bud_start)
	bud_e = _to_date(bud_end)
	if not bud_s or not bud_e: return 0.0

	total = 0.0
	for offset, col in enumerate(["year_1","year_2","year_3"]):
		amt = float(raw.get(col) or 0)
		if not amt: continue
		col_fy = _fy_for_year_col(bud_s, offset)
		if not col_fy: continue
		fy_s, fy_e = _fy_start_end(col_fy)
		for seg_s, seg_e in filter_segments:
			if seg_e < fy_s or seg_s > fy_e: continue
			total += _prorata_for_fy(amt, bud_s, bud_e, fy_s, fy_e, seg_s, seg_e)

	return round(total, 2)

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
			fy_s, fy_e = _fy_start_end(fy)
			segs.append((fy_s, fy_e))
		return segs

	return []

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
		""",
		(user,), as_dict=True,
	)
	if not rows: return None
	return [r.for_value for r in rows if r.for_value]

def _intersect(filter_list, permitted):
	if permitted is None: return filter_list
	if not permitted: return []
	if not filter_list: return permitted
	pset = set(permitted)
	return [p for p in filter_list if p in pset]

def _empty_summary():
	return {
		"total_budget":0,"total_disbursement":0,
		"total_utilisation":0,"total_bank_balance":0,
		"total_interest":0,"total_creches":0,
		"utilisation_pct":0,"disbursement_pct":0,
	}

def _assert_partner_access(partner_id: str):
	permitted = _get_user_permitted_partners()
	if permitted is None: return
	if partner_id not in permitted:
		frappe.throw(frappe._("You do not have permission to access this partner"), frappe.PermissionError)

# ──────────────────────────────────────────────────────────────────────────────
# PARTNER OPTIONS
# ──────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def debug_user_permissions():
	user = frappe.session.user
	roles = frappe.get_roles(user)
	rows     = frappe.db.sql("SELECT * FROM `tabUser Permission` WHERE user = %s", (user,), as_dict=True)
	filtered = frappe.db.sql("SELECT * FROM `tabUser Permission` WHERE user = %s AND allow = %s", (user,"Creche Partners"), as_dict=True)
	distinct = frappe.db.sql("SELECT DISTINCT allow FROM `tabUser Permission` WHERE user = %s", (user,), as_dict=True)
	return {"user":user,"roles":roles,"all_permissions":rows,"creche_partners_permissions":filtered,"distinct_allows":distinct}

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

# ──────────────────────────────────────────────────────────────────────────────
# MAIN SUMMARY
# ──────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_partner_budget_summary(filters=None):
	if isinstance(filters, str):
		import json; filters = json.loads(filters)
	filters = filters or {}

	permitted          = _get_user_permitted_partners()
	filter_partners    = filters.get("partner_id") or None
	effective_partners = _intersect(filter_partners, permitted)

	if effective_partners is not None and len(effective_partners) == 0:
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

	budgets = frappe.get_all(
		"Creche Budget", filters=budget_filters,
		fields=["name","partner_id","partner_name","grant_id","budget_reference_name",
		        "state","district","block","start_date","end_date","financial_year",
		        "no_of_creches","total_budget"],
		order_by="partner_name asc, budget_reference_name asc",
		ignore_permissions=True,
	)

	budget_ids = [b.name for b in budgets]

	# ── Budget Items sums (bulk) ──────────────────────────────────────────────
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
			budget_items_map[r.parent] = (
				float(r.year_1 or 0) + float(r.year_2 or 0) + float(r.year_3 or 0)
			)

	# ── Disbursement (date-based) ─────────────────────────────────────────────
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

	# ── Utilisation: sum from Utilisation Items child rows ────────────────────
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
				import calendar as _cal
				pairs = []; cur = _date(sd.year, sd.month, 1)
				end_mo = _date(ed.year, ed.month, 1)
				while cur <= end_mo:
					fy = _date_to_fy(cur)
					pairs.append((fy, _cal.month_name[cur.month]))
					cur = _date(cur.year + 1, 1, 1) if cur.month == 12 else _date(cur.year, cur.month + 1, 1)
				return pairs

			pairs = _local_fy_month_pairs(start_date, end_date)
			if pairs:
				clauses = []
				for i, (fy, mn) in enumerate(pairs):
					util_params[f"ufy{i}"] = fy
					util_params[f"umn{i}"] = mn
					clauses.append(f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)")
				util_extra = " AND (" + " OR ".join(clauses) + ")"
			else:
				util_extra = " AND 1=0"

		elif filter_fys and month_filters:
			clauses = []
			k = 0
			for fy in sorted(filter_fys):
				for mn in month_filters:
					util_params[f"ufy{k}"] = fy
					util_params[f"umn{k}"] = mn
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
			def _local_fy_month_pairs2(sd, ed):
				sd = _to_date(sd); ed = _to_date(ed)
				if not sd or not ed: return []
				import calendar as _cal
				pairs = []; cur = _date(sd.year, sd.month, 1)
				end_mo = _date(ed.year, ed.month, 1)
				while cur <= end_mo:
					fy = _date_to_fy(cur)
					pairs.append((fy, _cal.month_name[cur.month]))
					cur = _date(cur.year + 1, 1, 1) if cur.month == 12 else _date(cur.year, cur.month + 1, 1)
				return pairs
			pairs = _local_fy_month_pairs2(start_date, today)
			if pairs:
				clauses = []
				for i, (fy, mn) in enumerate(pairs):
					util_params[f"ufy{i}"] = fy
					util_params[f"umn{i}"] = mn
					clauses.append(f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)")
				util_extra = " AND (" + " OR ".join(clauses) + ")"

		if not util_extra and not filter_fys and not month_filters and not start_date and end_date:
			all_starts = [b.start_date for b in budgets if b.start_date]
			from datetime import date as _dt_ed
			earliestd = min((_to_date(s) for s in all_starts), default=_dt_ed.today())
			import calendar as _cal2
			pairs_ed = []
			cur = _date(earliestd.year, earliestd.month, 1)
			end_mo2 = _date(_to_date(end_date).year, _to_date(end_date).month, 1)
			while cur <= end_mo2:
				idx = len(pairs_ed)
				fy_val = _date_to_fy(cur)
				mn_val = _cal2.month_name[cur.month]
				util_params[f"ufy{idx}"] = fy_val
				util_params[f"umn{idx}"] = mn_val
				pairs_ed.append((fy_val, mn_val))
				cur = _date(cur.year + 1, 1, 1) if cur.month == 12 else _date(cur.year, cur.month + 1, 1)
			if pairs_ed:
				util_extra = " AND (" + " OR ".join(
					f"(cu.financial_year = %(ufy{i})s AND cu.month = %(umn{i})s)"
					for i in range(len(pairs_ed))
				) + ")"

		bid_ph = ", ".join([f"%(bid{i})s" for i in range(len(budget_ids))])
		for i, n in enumerate(budget_ids): util_params[f"bid{i}"] = n

		util_rows = frappe.db.sql(
			f"""
			SELECT
				cu.budget_reference_id,
				SUM(ui.total_amount) AS total_util
			FROM `tabCreche utilisation` cu
			INNER JOIN `tabUtilisation Items` ui
				ON ui.parent = cu.name AND ui.parenttype = 'Creche utilisation'
			WHERE cu.budget_reference_id IN ({bid_ph})
			  {util_extra}
			GROUP BY cu.budget_reference_id
			""",
			util_params, as_dict=True,
		)
		for r in util_rows:
			utilisation_map[r.budget_reference_id] = flt(r.total_util)

		interest_rows = frappe.db.sql(
			f"""
			SELECT
				budget_reference_id,
				SUM(interest_from_bank) AS total_interest
			FROM `tabCreche utilisation`
			WHERE budget_reference_id IN ({bid_ph})
			  {util_extra.replace("cu.", "")}
			GROUP BY budget_reference_id
			""",
			util_params, as_dict=True,
		)
		for r in interest_rows:
			interest_map[r.budget_reference_id] = flt(r.total_interest)

		_FY_POS = {
			"April":1,"May":2,"June":3,"July":4,"August":5,"September":6,
			"October":7,"November":8,"December":9,"January":10,"February":11,"March":12,
		}
		bal_rows = frappe.db.sql(
			f"""
			SELECT
				budget_reference_id,
				financial_year,
				month,
				balance_amount
			FROM `tabCreche utilisation`
			WHERE budget_reference_id IN ({bid_ph})
			  {util_extra.replace("cu.", "")}
			""",
			util_params, as_dict=True,
		)
		bal_best = {}
		for r in bal_rows:
			bid = r.budget_reference_id
			fy  = r.financial_year or ""
			mp  = _FY_POS.get(r.month, 0)
			key = (fy, mp)
			if bid not in bal_best or key > bal_best[bid][0]:
				bal_best[bid] = (key, flt(r.balance_amount))
		bank_balance_map = {bid: v[1] for bid, v in bal_best.items()}

	# ── Assemble results ──────────────────────────────────────────────────────
	partners = {}
	grand = dict(budget=0.0, disbursement=0.0, utilisation=0.0, bank_balance=0.0, interest=0.0, creches=0)

	for budget in budgets:
		bid = budget.name

		raw_items_total = budget_items_map.get(bid)
		if raw_items_total is None:
			raw_items_total = flt(budget.total_budget)

		if apply_prorata:
			budget_amount = _compute_prorata_budget(bid, budget.start_date, budget.end_date, filter_segments)
			if budget_amount is None:
				budget_amount = raw_items_total
		else:
			budget_amount = raw_items_total

		disbursement = flt(disbursement_map.get(bid, 0))
		utilisation  = flt(utilisation_map.get(bid, 0))
		bank_balance = flt(bank_balance_map.get(bid, 0))
		interest     = flt(interest_map.get(bid, 0))
		creches      = int(budget.no_of_creches or 0)

		balance_budget            = budget_amount - utilisation
		utilised_pct              = round((utilisation / budget_amount * 100) if budget_amount else 0, 2)
		utilised_disbursement_pct = round((utilisation / disbursement * 100)  if disbursement  else 0, 2)

		partner_key = budget.partner_id or budget.partner_name or "Unknown"
		if partner_key not in partners:
			partners[partner_key] = {
				"partner_id": budget.partner_id, "partner_name": budget.partner_name,
				"total_budget":0.0,"total_disbursement":0.0,"total_utilisation":0.0,
				"total_balance_budget":0.0,"total_bank_balance":0.0,
				"total_interest":0.0,"total_creches":0,"budgets":[],
			}
		p = partners[partner_key]
		p["total_budget"]         += budget_amount
		p["total_disbursement"]   += disbursement
		p["total_utilisation"]    += utilisation
		p["total_balance_budget"] += balance_budget
		if bank_balance > 0:
			p["total_bank_balance"] = max(p["total_bank_balance"], bank_balance)
		elif p["total_bank_balance"] == 0:
			p["total_bank_balance"] = bank_balance
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
		p["grant_ids"]    = ", ".join(sorted(set(b["grant_id"] for b in p["budgets"] if b["grant_id"])))
		p["budgets"]      = sorted(p["budgets"], key=lambda x: x["budget_reference_name"] or "")
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
# DISBURSEMENT PANEL DATA
# ──────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_disbursement_panel_data(budget_ids=None, partner_ids=None, start_date=None, end_date=None,
                                financial_year=None, month=None):
	permitted = _get_user_permitted_partners()
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

	disb_filters = {}
	if budget_ids_list:
		if permitted is not None:
			br = frappe.get_all("Creche Budget",
				filters={"name":["in",budget_ids_list]},
				fields=["name","partner_id"], ignore_permissions=True)
			budget_ids_list = [r.name for r in br if r.partner_id in permitted]
			if not budget_ids_list: return []
		disb_filters["budget_reference_id"] = ["in", budget_ids_list]
	elif partner_ids_list:
		eff = _intersect(partner_ids_list, permitted)
		if eff is not None and not eff: return []
		if eff: disb_filters["partner_id"] = ["in", eff]
		elif permitted is not None: return []
	else:
		if permitted is not None:
			if not permitted: return []
			disb_filters["partner_id"] = ["in", permitted]

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
		ftotal = sum(flt(t["disbursed_amount"]) for t in ft) if period_active else flt(doc.total_disbursement)
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

# ──────────────────────────────────────────────────────────────────────────────
# BUDGET LINE ITEMS
# ──────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_budget_line_items(budget_id: str, start_date=None, end_date=None,
                          financial_year=None, month=None):
	if not budget_id: return []
	partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
	_assert_partner_access(partner_id)

	def _pl(v):
		if not v: return []
		if isinstance(v, list): return [x for x in v if x]
		try:
			p = json.loads(v)
			if isinstance(p, list): return [x for x in p if x]
		except: pass
		return [x.strip() for x in str(v).split(",") if x.strip()]

	filter_fys    = _pl(financial_year)
	month_filters = [m.strip() for m in _pl(month) if str(m).strip()]

	rows = frappe.get_all("Budget Items",
		filters={"parent": budget_id, "parenttype": "Creche Budget"},
		fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
		        "budget_sub_head","year_1","year_2","year_3","total_amount","notes"],
		order_by="budget_main_head asc, type_of_expenses asc", ignore_permissions=True)

	filter_segments = _build_filter_segments({
		"start_date": start_date, "end_date": end_date,
		"financial_year": filter_fys, "month": month_filters,
	})
	bud_start, bud_end = frappe.db.get_value(
		"Creche Budget", budget_id, ["start_date", "end_date"])

	result = []
	for r in rows:
		if filter_segments and bud_start and bud_end:
			raw_total = flt(r.year_1) + flt(r.year_2) + flt(r.year_3)
			if raw_total > 0:
				prorated = 0.0
				for offset, col in enumerate(["year_1","year_2","year_3"]):
					amt = flt(getattr(r, col, 0))
					if not amt: continue
					col_fy = _fy_for_year_col(bud_start, offset)
					if not col_fy: continue
					fy_s, fy_e = _fy_start_end(col_fy)
					for seg_s, seg_e in filter_segments:
						if seg_e < fy_s or seg_s > fy_e: continue
						prorated += _prorata_for_fy(amt, _to_date(bud_start), _to_date(bud_end), fy_s, fy_e, seg_s, seg_e)
				scale = prorated / raw_total if raw_total else 0
				display_total = round(prorated, 2)
				y1 = round(flt(r.year_1) * scale, 2)
				y2 = round(flt(r.year_2) * scale, 2)
				y3 = round(flt(r.year_3) * scale, 2)
			else:
				display_total, y1, y2, y3 = flt(r.total_amount), flt(r.year_1), flt(r.year_2), flt(r.year_3)
		else:
			display_total, y1, y2, y3 = flt(r.total_amount), flt(r.year_1), flt(r.year_2), flt(r.year_3)

		result.append({
			"type_of_expenses_id": r.type_of_expenses_id,
			"type_of_expenses": r.type_of_expenses, "budget_main_head": r.budget_main_head,
			"budget_sub_head": r.budget_sub_head, "year_1": y1, "year_2": y2, "year_3": y3,
			"total_amount": display_total, "notes": r.notes or "",
		})
	return result

# ──────────────────────────────────────────────────────────────────────────────
# UTILISATION LINE ITEMS
# ──────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_utilisation_line_items(budget_id: str, start_date=None, end_date=None,
                               financial_year=None, month=None):
	if not budget_id: return {"months": [], "records": []}
	partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
	_assert_partner_access(partner_id)

	def _parse_list(v):
		if not v: return []
		if isinstance(v, list): return [x for x in v if x]
		try:
			p = json.loads(v)
			if isinstance(p, list): return [x for x in p if x]
		except: pass
		return [x.strip() for x in str(v).split(",") if x.strip()]

	fy_list    = _parse_list(financial_year)
	month_list = _parse_list(month)

	util_filters = {"budget_reference_id": budget_id}
	if fy_list:    util_filters["financial_year"] = ["in", fy_list]
	if month_list: util_filters["month"]          = ["in", month_list]

	util_docs = frappe.get_all("Creche utilisation", filters=util_filters,
		fields=["name","month","financial_year","creation"],
		order_by="financial_year asc, month asc", ignore_permissions=True)

	if (start_date or end_date) and util_docs:
		util_docs = [d for d in util_docs if d.creation
			and (not start_date or getdate(str(d.creation)[:10]) >= getdate(start_date))
			and (not end_date   or getdate(str(d.creation)[:10]) <= getdate(end_date))]

	if not util_docs: return {"months": [], "records": []}

	MONTH_ORDER = ["January","February","March","April","May","June",
	               "July","August","September","October","November","December"]
	records = []; seen = []
	for doc in util_docs:
		items = frappe.get_all("Utilisation Items",
			filters={"parent": doc.name, "parenttype": "Creche utilisation"},
			fields=["type_of_expenses_id","type_of_expenses","budget_main_head",
			        "budget_sub_head","total_amount","notes"],
			order_by="budget_main_head asc, type_of_expenses asc", ignore_permissions=True)
		ml = doc.month or "Unknown"
		records.append({"month": ml, "financial_year": doc.financial_year or "",
		                "utilisation_id": doc.name,
		                "items": [{"type_of_expenses_id": r.type_of_expenses_id,
		                           "type_of_expenses": r.type_of_expenses,
		                           "budget_main_head": r.budget_main_head,
		                           "budget_sub_head": r.budget_sub_head,
		                           "total_amount": flt(r.total_amount), "notes": r.notes or ""}
		                          for r in items]})
		if ml not in seen: seen.append(ml)

	def msort(m):
		try: return MONTH_ORDER.index(m)
		except: return 99
	seen.sort(key=msort)
	records.sort(key=lambda r: (r["financial_year"], msort(r["month"])))
	return {"months": seen, "records": records}



"""
creche_reports/api/export_utils.py

Server-side export endpoints for the Creche Dashboard drill-down tables.
Generates real .xlsx (via openpyxl) and PDF (via wkhtmltopdf through
frappe.utils.pdf) files and returns a download URL.

Usage from the client:
    frappe.call({
        method: 'creche_reports.api.export_utils.export_table',
        args: {
            title: 'Total Budget',
            columns: [{label:'Partner', key:'partner'}, ...],
            rows: [{partner:'ABC', budget:1234.5}, ...],
            format: 'xlsx'   // or 'pdf'
        },
        callback: (r) => { window.open(r.message.file_url); }
    });
"""

import frappe
from frappe.utils import get_url
import io
import json


@frappe.whitelist()
def export_table(title="Report", columns=None, rows=None, format="xlsx"):
	"""
	Generate an .xlsx or .pdf file from tabular data and save it as a
	private File doc, returning the file_url for the browser to open.

	columns: JSON list of {"label": str, "key": str, "align": "left"|"right"}
	rows:    JSON list of dicts keyed by column `key`
	format:  "xlsx" or "pdf"
	"""
	if isinstance(columns, str):
		columns = json.loads(columns)
	if isinstance(rows, str):
		rows = json.loads(rows)

	columns = columns or []
	rows = rows or []

	if format == "pdf":
		file_url = _export_pdf(title, columns, rows)
	else:
		file_url = _export_xlsx(title, columns, rows)

	return {"file_url": file_url}


# ──────────────────────────────────────────────────────────────────────────
# EXCEL EXPORT  (openpyxl — navy header / light-blue total row)
# ──────────────────────────────────────────────────────────────────────────

def _export_xlsx(title, columns, rows):
	try:
		from openpyxl import Workbook
		from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
		from openpyxl.utils import get_column_letter
	except ImportError:
		frappe.throw(
			frappe._("openpyxl is required for Excel export. Install it with: pip install openpyxl")
		)

	wb = Workbook()
	ws = wb.active
	ws.title = (title or "Data")[:31]

	NAVY      = "1E3A5F"
	LIGHTBLUE = "BFDBFE"
	BORDER_C  = "93C5FD"
	GRID_C    = "E2E8F0"

	thin_grid = Border(
		left=Side(style="thin", color=GRID_C),
		right=Side(style="thin", color=GRID_C),
		top=Side(style="thin", color=GRID_C),
		bottom=Side(style="thin", color=GRID_C),
	)
	thin_header_border = Border(
		left=Side(style="thin", color=BORDER_C),
		right=Side(style="thin", color=BORDER_C),
		top=Side(style="thin", color=BORDER_C),
		bottom=Side(style="thin", color=BORDER_C),
	)

	header_font = Font(bold=True, color="FFFFFF", size=10)
	header_fill = PatternFill(start_color=NAVY, end_color=NAVY, fill_type="solid")
	total_font  = Font(bold=True, color=NAVY, size=11)
	total_fill  = PatternFill(start_color=LIGHTBLUE, end_color=LIGHTBLUE, fill_type="solid")

	# header row
	for ci, col in enumerate(columns, start=1):
		c = ws.cell(row=1, column=ci, value=col.get("label", ""))
		c.font = header_font
		c.fill = header_fill
		c.border = thin_header_border
		c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

	# data rows — last row treated as Total if its first cell value == "Total"
	is_total_row = lambda r: str(r.get(columns[0]["key"], "")).strip().lower() == "total"

	r_idx = 2
	for row in rows:
		total_row = is_total_row(row)
		for ci, col in enumerate(columns, start=1):
			val = row.get(col.get("key"), "")
			# try numeric coercion for right-aligned columns
			align = col.get("align", "left")
			cell = ws.cell(row=r_idx, column=ci)
			if align == "right" and isinstance(val, (int, float)):
				cell.value = val
				cell.number_format = "#,##0.00"
			else:
				cell.value = val
			cell.alignment = Alignment(horizontal=align)
			if total_row:
				cell.font = total_font
				cell.fill = total_fill
				cell.border = thin_header_border
			else:
				cell.border = thin_grid
		r_idx += 1

	# auto column width
	for ci, col in enumerate(columns, start=1):
		letter = get_column_letter(ci)
		max_len = len(str(col.get("label", "")))
		for row in rows:
			v = row.get(col.get("key"), "")
			max_len = max(max_len, len(str(v)))
		ws.column_dimensions[letter].width = min(max_len + 4, 42)

	ws.freeze_panes = "A2"

	buf = io.BytesIO()
	wb.save(buf)
	buf.seek(0)

	fname = f"{_safe_fname(title)}.xlsx"
	return _save_file(fname, buf.getvalue())


# ──────────────────────────────────────────────────────────────────────────
# PDF EXPORT  (HTML → wkhtmltopdf, A4 portrait, same navy/blue palette)
# ──────────────────────────────────────────────────────────────────────────

def _export_pdf(title, columns, rows):
	is_total_row = lambda r: str(r.get(columns[0]["key"], "")).strip().lower() == "total"

	thead = "".join(f"<th>{frappe.utils.escape_html(c.get('label',''))}</th>" for c in columns)

	body_rows = []
	for row in rows:
		total_row = is_total_row(row)
		tds = []
		for c in columns:
			val = row.get(c.get("key"), "")
			align = c.get("align", "left")
			tds.append(f'<td style="text-align:{align}">{frappe.utils.escape_html(str(val))}</td>')
		cls = ' class="total-row"' if total_row else ""
		body_rows.append(f"<tr{cls}>{''.join(tds)}</tr>")

	html = f"""
	<html><head><meta charset="utf-8">
	<style>
		@page {{ size: A4 portrait; margin: 14mm 10mm; }}
		* {{ box-sizing:border-box; margin:0; padding:0; font-family:Arial,Helvetica,sans-serif; }}
		body {{ color:#1f2937; }}
		h1 {{ font-size:16px; font-weight:700; color:#1e3a5f; margin-bottom:4px; }}
		.meta {{ font-size:9px; color:#94a3b8; margin-bottom:12px; }}
		table {{ width:100%; border-collapse:collapse; font-size:10px; }}
		th {{
			background:#1e3a5f; color:#fff; font-weight:700; text-transform:uppercase;
			font-size:8.5px; letter-spacing:.4px; padding:6px 8px; text-align:left;
			border:1px solid #93c5fd;
		}}
		td {{ padding:5px 8px; border:1px solid #e2e8f0; }}
		tr.total-row td {{
			background:#bfdbfe; color:#1e3a5f; font-weight:700; border:1px solid #93c5fd;
		}}
		tr:nth-child(even):not(.total-row) td {{ background:#f8fafc; }}
	</style></head>
	<body>
		<h1>{frappe.utils.escape_html(title or 'Report')}</h1>
		<div class="meta">Exported {frappe.utils.now_datetime().strftime('%d %b %Y, %I:%M %p')} by {frappe.session.user}</div>
		<table>
			<thead><tr>{thead}</tr></thead>
			<tbody>{''.join(body_rows)}</tbody>
		</table>
	</body></html>
	"""

	from frappe.utils.pdf import get_pdf
	pdf_content = get_pdf(html, options={"page-size": "A4", "orientation": "Portrait"})

	fname = f"{_safe_fname(title)}.pdf"
	return _save_file(fname, pdf_content)


# ──────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────

def _safe_fname(title):
	import re
	base = re.sub(r"[^A-Za-z0-9_-]+", "_", title or "report").strip("_") or "report"
	return base[:80]


def _save_file(fname, content):
	f = frappe.get_doc({
		"doctype": "File",
		"file_name": fname,
		"is_private": 0,
		"content": content,
	})
	f.save(ignore_permissions=True)
	return f.file_url







"""
creche_reports/api/pending_utilisation.py

Backend endpoints for the "Pending Utilization" dashboard card.

Unlike the old client-side definition (partners whose utilised_pct < 100,
which is really just "not fully spent yet"), this module answers the
actual operational question: "which partners have NOT SUBMITTED their
utilisation report for an expected month, and what's their email?"

Endpoints
---------
get_pending_utilisation_summary(cutoff_date=None)
    Returns the list of missing (budget, financial_year, month) submissions,
    grouped by partner, with each partner's email resolved from
    User Permission (allow='Creche Partners') -> User.email.

send_utilisation_reminder(partner_ids, custom_message=None)
    Sends a reminder email to each partner's resolved email address via
    frappe.sendmail, and returns a per-partner success/failure report.

Usage from the client
----------------------
    frappe.call({
        method: 'creche_reports.api.pending_utilisation.get_pending_utilisation_summary',
        callback: (r) => { ... r.message.partners ... }
    });

    frappe.call({
        method: 'creche_reports.api.pending_utilisation.send_utilisation_reminder',
        args: { partner_ids: JSON.stringify(['CP-0001','CP-0002']) },
        callback: (r) => { ... r.message.sent / r.message.failed ... }
    });
"""

import json
from datetime import date

import frappe
from frappe.utils import getdate

try:
    from dateutil.relativedelta import relativedelta
except ImportError:  # pragma: no cover - dateutil ships with Frappe by default
    relativedelta = None

MONTH_ORDER = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


# ──────────────────────────────────────────────────────────────────────────
# Permission helpers (mirrors budget_utilisation_summary.py conventions)
# ──────────────────────────────────────────────────────────────────────────

def _get_user_permitted_partners():
    user = frappe.session.user
    roles = frappe.get_roles(user)
    if "System Manager" in roles or user == "Administrator":
        return None
    rows = frappe.db.sql(
        """
        SELECT for_value FROM `tabUser Permission`
        WHERE user = %s AND allow = 'Creche Partners'
        """,
        (user,), as_dict=True,
    )
    if not rows:
        return None
    return [r.for_value for r in rows if r.for_value]


def _get_partner_emails(partner_ids):
    """
    Returns {partner_id: email}.
    Strategy 1: User Permission (allow='Creche Partners') -> User.email
    Strategy 2: direct email field on the Creche Partners doctype (fallback)
    """
    email_map = {}
    if not partner_ids:
        return email_map

    perm_rows = frappe.db.sql(
        """
        SELECT up.for_value AS partner_id, u.email
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
        if row.partner_id not in email_map and row.email:
            email_map[row.partner_id] = row.email

    missing = [p for p in partner_ids if p not in email_map]
    if missing:
        for field in ("email", "email_id", "contact_email"):
            try:
                rows = frappe.get_all(
                    "Creche Partners",
                    filters={"name": ["in", missing]},
                    fields=["name", field],
                    ignore_permissions=True,
                )
                hit = False
                for r in rows:
                    v = r.get(field, "")
                    if v and r.name not in email_map:
                        email_map[r.name] = v
                        hit = True
                if hit:
                    break
            except Exception:
                continue

    return email_map


def _fy_for_month(d):
    return f"{d.year}-{str(d.year + 1)[2:]}" if d.month >= 4 else f"{d.year - 1}-{str(d.year)[2:]}"


def _add_month(d):
    if relativedelta:
        return d + relativedelta(months=1)
    y, m = d.year, d.month + 1
    if m > 12:
        y += 1
        m = 1
    return date(y, m, 1)


# ──────────────────────────────────────────────────────────────────────────
# Pending utilisation summary
# ──────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_pending_utilisation_summary(cutoff_date=None):
    """
    Finds every (budget, financial_year, month) combination that should
    have a "Creche utilisation" submission by now, but doesn't, and groups
    the result by partner with their resolved email address.

    cutoff: defaults to "last fully-completed month" — if today is on/after
    the 5th, last calendar month is due; otherwise the month before that.
    """
    today = getdate(frappe.utils.nowdate())

    if cutoff_date:
        cutoff = getdate(cutoff_date).replace(day=1)
    else:
        months_back = 1 if today.day >= 5 else 2
        cur = today.replace(day=1)
        for _ in range(months_back):
            y, m = cur.year, cur.month - 1
            if m < 1:
                y -= 1
                m = 12
            cur = date(y, m, 1)
        cutoff = cur

    permitted = _get_user_permitted_partners()
    budget_filters = [
        ["start_date", "is", "set"],
        ["end_date", "is", "set"],
        ["start_date", "<=", cutoff],
    ]
    if permitted is not None:
        if not permitted:
            return {"partners": [], "cutoff": str(cutoff)}
        budget_filters.append(["partner_id", "in", permitted])

    budgets = frappe.get_all(
        "Creche Budget",
        fields=["name", "budget_reference_name", "partner_id", "partner_name",
                 "grant_id", "state", "district", "block", "start_date", "end_date"],
        filters=budget_filters,
        ignore_permissions=True,
        limit_page_length=0,
    )
    if not budgets:
        return {"partners": [], "cutoff": str(cutoff)}

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

    by_partner = {}
    for b in budgets:
        start = getdate(b["start_date"])
        end = getdate(b["end_date"])
        effective_end = min(end.replace(day=1), cutoff)
        cursor = start.replace(day=1)

        missing_for_budget = []
        while cursor <= effective_end:
            month_name = MONTH_ORDER[cursor.month - 1]
            fy_label = _fy_for_month(cursor)
            if (b["name"], fy_label, month_name) not in existing:
                deadline = _add_month(cursor).replace(day=5)
                days_overdue = (today - deadline).days
                missing_for_budget.append({
                    "financial_year": fy_label,
                    "month": month_name,
                    "deadline": deadline.isoformat(),
                    "days_overdue": max(days_overdue, 0),
                })
            cursor = _add_month(cursor)

        if not missing_for_budget:
            continue

        pid = b["partner_id"] or b["partner_name"] or "Unknown"
        if pid not in by_partner:
            by_partner[pid] = {
                "partner_id": b["partner_id"],
                "partner_name": b["partner_name"],
                "missing_count": 0,
                "max_days_overdue": 0,
                "budgets": [],
            }
        entry = by_partner[pid]
        entry["budgets"].append({
            "budget_id": b["name"],
            "budget_reference_name": b["budget_reference_name"],
            "grant_id": b["grant_id"],
            "state": b["state"],
            "missing_months": missing_for_budget,
        })
        entry["missing_count"] += len(missing_for_budget)
        entry["max_days_overdue"] = max(
            entry["max_days_overdue"],
            max((m["days_overdue"] for m in missing_for_budget), default=0),
        )

    partner_ids = [pid for pid in by_partner if pid]
    email_map = _get_partner_emails(partner_ids)

    result = []
    for pid, entry in by_partner.items():
        entry["email"] = email_map.get(pid, "")
        result.append(entry)

    result.sort(key=lambda r: (-r["max_days_overdue"], r["partner_name"] or ""))

    return {"partners": result, "cutoff": str(cutoff)}


# ──────────────────────────────────────────────────────────────────────────
# Send reminder emails
# ──────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def send_utilisation_reminder(partner_ids=None, custom_message=None):
    if isinstance(partner_ids, str):
        try:
            partner_ids = json.loads(partner_ids)
        except Exception:
            partner_ids = [p.strip() for p in partner_ids.split(",") if p.strip()]
    partner_ids = partner_ids or []
    if not partner_ids:
        frappe.throw(frappe._("No partners selected"))

    permitted = _get_user_permitted_partners()
    if permitted is not None:
        partner_ids = [p for p in partner_ids if p in permitted]
        if not partner_ids:
            frappe.throw(frappe._("You do not have permission to email these partners"))

    email_map = _get_partner_emails(partner_ids)
    partner_names = {
        r.name: r.partner_name
        for r in frappe.get_all(
            "Creche Partners",
            filters={"name": ["in", partner_ids]},
            fields=["name", "partner_name"],
            ignore_permissions=True,
        )
    }

    default_message = (
        "This is a reminder that your utilisation report submission is pending. "
        "Kindly submit it at the earliest to keep your budget records up to date."
    )
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
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
from frappe.utils import flt, getdate, now_datetime
from datetime import date as _date, datetime
import calendar as _calendar

# ──────────────────────────────────────────────────────────────────────────────
# PRO-RATA BUDGET HELPERS  (same logic as the report)
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
	"""
	Fetch Budget Items for budget_name and compute pro-rata budget for the
	given filter_segments (list of (start, end) date tuples).
	Returns 0.0 if no filter_segments (caller must use raw total_budget).
	"""
	if not filter_segments:
		return None  # signal: use raw total_budget

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
	"""
	Convert the active filters into a list of (start_date, end_date) segments
	for pro-rata budget calculation. Returns [] if no period filter is active.
	"""
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

	return []   # no period filter → use raw total_budget

# ──────────────────────────────────────────────────────────────────────────────
# PERMISSION HELPERS  (unchanged)
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

# ──────────────────────────────────────────────────────────────────────────────
# PARTNER OPTIONS  (unchanged)
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
# MAIN SUMMARY  (patched: pro-rata budget + correct util/bank-balance)
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

	# Build filter segments for pro-rata calculation
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

	# ── Disbursement (unchanged — date-based) ─────────────────────────────────
	disbursement_map = {}
	if budget_ids:
		disb_headers = frappe.get_all("Creche Disbursement",
			filters={"budget_reference_id": ["in", budget_ids]},
			fields=["name","budget_reference_id"], ignore_permissions=True)
		disb_parent_names = [d.name for d in disb_headers]
		disb_bid_map = {d.name: d.budget_reference_id for d in disb_headers}

		if disb_parent_names:
			# Fetch all tracker rows then post-filter by date range
			tracker_rows = frappe.get_all("Disbursement Tracker",
				filters={"parent": ["in", disb_parent_names], "parenttype": "Creche Disbursement"},
				fields=["parent","date_of_disbursement","disbursed_amount"],
				ignore_permissions=True)

			# Apply FY / month filter to disbursements via date range
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

	# ── Utilisation (patched: FY+month linked-pair filtering) ─────────────────
	utilisation_map = {}
	bank_balance_map = {}
	interest_map = {}

	if budget_ids:
		filter_fys = filters.get("financial_year") or []
		if isinstance(filter_fys, str): filter_fys = [filter_fys]
		month_raw = filters.get("month") or []
		if isinstance(month_raw, str): month_raw = [month_raw] if month_raw.strip() else []
		month_filters = [m.strip() for m in month_raw if str(m).strip()]

		util_extra = ""
		util_params = {}

		if start_date and end_date:
			# Derive (FY, month) pairs for date range — inlined to avoid fragile import
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
					clauses.append(f"(financial_year = %(ufy{i})s AND month = %(umn{i})s)")
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
					clauses.append(f"(financial_year = %(ufy{k})s AND month = %(umn{k})s)")
					k += 1
			util_extra = " AND (" + " OR ".join(clauses) + ")"

		elif filter_fys:
			ph = ", ".join([f"%(ufy{i})s" for i in range(len(filter_fys))])
			for i, fy in enumerate(filter_fys): util_params[f"ufy{i}"] = fy
			util_extra = f" AND financial_year IN ({ph})"

		elif month_filters:
			ph = ", ".join([f"%(umn{i})s" for i in range(len(month_filters))])
			for i, m in enumerate(month_filters): util_params[f"umn{i}"] = m
			util_extra = f" AND month IN ({ph})"

		elif start_date:
			# Only start_date — derive (FY, month) pairs from start_date to today
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
					clauses.append(f"(financial_year = %(ufy{i})s AND month = %(umn{i})s)")
				util_extra = " AND (" + " OR ".join(clauses) + ")"
			else:
				util_extra = ""

		# Only end_date (no start_date) — derive FY+month pairs from earliest budget start to end_date
		if not util_extra and not filter_fys and not month_filters and not start_date and end_date:
			from datetime import date as _dt_ed
			# Find earliest budget start date among current budgets
			all_starts = [b.start_date for b in budgets if b.start_date]
			earliestd = min((_to_date(s) for s in all_starts), default=_dt_ed.today())
			import calendar as _cal2
			pairs_ed = []; cur = _date(earliestd.year, earliestd.month, 1)
			end_mo2 = _date(_to_date(end_date).year, _to_date(end_date).month, 1)
			while cur <= end_mo2:
				util_params[f"ufy{len(pairs_ed)}"] = _date_to_fy(cur)
				util_params[f"umn{len(pairs_ed)}"] = _cal2.month_name[cur.month]
				pairs_ed.append((util_params[f"ufy{len(pairs_ed)-1}"], util_params[f"umn{len(pairs_ed)-1}"]))
				cur = _date(cur.year+1,1,1) if cur.month==12 else _date(cur.year,cur.month+1,1)
			if pairs_ed:
				util_extra = " AND (" + " OR ".join(
					f"(financial_year = %(ufy{i})s AND month = %(umn{i})s)" for i in range(len(pairs_ed))
				) + ")"

		# Sum utilisation per budget
		# Build IN clause for budget_ids
		bid_ph = ", ".join([f"%(bid{i})s" for i in range(len(budget_ids))])
		for i, n in enumerate(budget_ids): util_params[f"bid{i}"] = n

		util_rows = frappe.db.sql(
			f"""
			SELECT
				budget_reference_id,
				SUM(total_utilisation) AS total_util,
				SUM(interest_from_bank) AS total_interest
			FROM `tabCreche utilisation`
			WHERE budget_reference_id IN ({bid_ph})
			  {util_extra}
			GROUP BY budget_reference_id
			""",
			util_params, as_dict=True,
		)
		for r in util_rows:
			utilisation_map[r.budget_reference_id] = flt(r.total_util)
			interest_map[r.budget_reference_id]    = flt(r.total_interest)

		# Bank balance: last month in filter window (Python-side sort)
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
			  {util_extra}
			""",
			util_params, as_dict=True,
		)
		bal_best = {}  # bid → (fy, month_pos, balance)
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

		# Pro-rata or raw budget amount
		if apply_prorata:
			budget_amount = _compute_prorata_budget(bid, budget.start_date, budget.end_date, filter_segments)
			if budget_amount is None:
				budget_amount = flt(budget.total_budget)
		else:
			budget_amount = flt(budget.total_budget)

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
		# Bank balance = last reported value, not a running sum.
		# Keep the highest (most recent) bank balance across budgets for this partner.
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
# ALL REMAINING FUNCTIONS — unchanged from original
# (paste get_disbursement_panel_data, get_budget_line_items,
#  get_utilisation_line_items, get_utilisation_submission_status,
#  send_utilisation_reminder, all messaging functions here)
# ──────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_disbursement_panel_data(budget_ids=None, partner_ids=None, start_date=None, end_date=None,
                                financial_year=None, month=None):
	import json
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

	# Build date filter segments from start/end date OR financial_year + month
	filter_segments = _build_filter_segments({
		"start_date": start_date, "end_date": end_date,
		"financial_year": filter_fys, "month": month_filters,
	})
	period_active = bool(filter_segments) or bool(start_date) or bool(end_date)

	if filter_segments:
		# Filter tracker rows to only those within any filter segment
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

@frappe.whitelist()
def get_budget_line_items(budget_id: str, start_date=None, end_date=None,
                          financial_year=None, month=None):
	if not budget_id: return []
	partner_id = frappe.db.get_value("Creche Budget", budget_id, "partner_id")
	_assert_partner_access(partner_id)

	import json
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

@frappe.whitelist()
def get_utilisation_line_items(budget_id: str, start_date=None, end_date=None,
                               financial_year=None, month=None):
	import json
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

# ── Utilisation submission status, messaging, and other endpoints are
#    identical to the original — include them verbatim from the original file.

def _assert_partner_access(partner_id: str):
	permitted = _get_user_permitted_partners()
	if permitted is None: return
	if partner_id not in permitted:
		frappe.throw(frappe._("You do not have permission to access this partner"), frappe.PermissionError)	
# import frappe
# from frappe.utils import flt


# @frappe.whitelist()
# def get_partner_budget_summary():

#     budgets = frappe.get_all(
#         "Creche Budget",
#         fields=[
#             "name",
#             "partner_id",
#             "partner_name",
#             "grant_id",
#             "budget_reference_name",
#             "state",
#             "start_date",
#             "end_date",
#             "financial_year",
#             "no_of_creches",
#             "total_budget"
#         ],
#         order_by="partner_name asc"
#     )

#     disbursements = frappe.get_all(
#         "Creche Disbursement",
#         fields=[
#             "budget_reference_id",
#             "total_disbursement"
#         ]
#     )

#     utilisations = frappe.get_all(
#         "Creche utilisation",
#         fields=[
#             "budget_reference_id",
#             "total_utilisation",
#             "balance_amount",
#             "interest_from_bank"
#         ]
#     )

#     # --------------------------
#     # MAPS
#     # --------------------------

#     disbursement_map = {}

#     for row in disbursements:

#         disbursement_map[row.budget_reference_id] = (
#             disbursement_map.get(
#                 row.budget_reference_id, 0
#             )
#             + flt(row.total_disbursement)
#         )

#     utilisation_map = {}
#     bank_balance_map = {}
#     interest_map = {}

#     for row in utilisations:

#         utilisation_map[row.budget_reference_id] = (
#             utilisation_map.get(
#                 row.budget_reference_id, 0
#             )
#             + flt(row.total_utilisation)
#         )

#         bank_balance_map[row.budget_reference_id] = (
#             bank_balance_map.get(
#                 row.budget_reference_id, 0
#             )
#             + flt(row.balance_amount)
#         )

#         interest_map[row.budget_reference_id] = (
#             interest_map.get(
#                 row.budget_reference_id, 0
#             )
#             + flt(row.interest_from_bank)
#         )

#     # --------------------------
#     # BUILD DATA
#     # --------------------------

#     partners = {}

#     grand_budget = 0
#     grand_disbursement = 0
#     grand_utilisation = 0
#     grand_bank_balance = 0
#     grand_interest = 0

#     for budget in budgets:

#         budget_id = budget.name

#         budget_amount = flt(
#             budget.total_budget
#         )

#         disbursement = flt(
#             disbursement_map.get(
#                 budget_id, 0
#             )
#         )

#         utilisation = flt(
#             utilisation_map.get(
#                 budget_id, 0
#             )
#         )

#         bank_balance = flt(
#             bank_balance_map.get(
#                 budget_id, 0
#             )
#         )

#         interest = flt(
#             interest_map.get(
#                 budget_id, 0
#             )
#         )

#         balance_budget_amount = (
#             budget_amount
#             - utilisation
#         )

#         utilised_pct = round(
#             (
#                 utilisation
#                 / budget_amount
#                 * 100
#             )
#             if budget_amount else 0,
#             2
#         )

#         utilised_disbursement_pct = round(
#             (
#                 utilisation
#                 / disbursement
#                 * 100
#             )
#             if disbursement else 0,
#             2
#         )

#         partner_key = (
#             budget.partner_id
#             or budget.partner_name
#             or "Unknown"
#         )

#         if partner_key not in partners:

#             partners[partner_key] = {

#                 "partner_id":
#                     budget.partner_id,

#                 "partner_name":
#                     budget.partner_name,

#                 "total_budget":
#                     0,

#                 "total_disbursement":
#                     0,

#                 "total_utilisation":
#                     0,

#                 "total_balance_budget":
#                     0,

#                 "total_bank_balance":
#                     0,

#                 "total_interest":
#                     0,

#                 "budgets":
#                     []
#             }

#         partner = partners[partner_key]

#         partner["total_budget"] += budget_amount

#         partner["total_disbursement"] += (
#             disbursement
#         )

#         partner["total_utilisation"] += (
#             utilisation
#         )

#         partner["total_balance_budget"] += (
#             balance_budget_amount
#         )

#         partner["total_bank_balance"] += (
#             bank_balance
#         )

#         partner["total_interest"] += (
#             interest
#         )

#         partner["budgets"].append({

#             "budget_id":
#                 budget.name,

#             "grant_id":
#                 budget.grant_id,

#             "budget_reference_name":
#                 budget.budget_reference_name,

#             "state":
#                 budget.state,

#             "grant_start":
#                 budget.start_date,

#             "grant_end":
#                 budget.end_date,

#             "financial_year":
#                 budget.financial_year,

#             "no_of_creches":
#                 budget.no_of_creches,

#             "budget":
#                 budget_amount,

#             "disbursement":
#                 disbursement,

#             "utilisation":
#                 utilisation,

#             "utilised_pct":
#                 utilised_pct,

#             "utilised_disbursement_pct":
#                 utilised_disbursement_pct,

#             "balance_budget_amount":
#                 balance_budget_amount,

#             "bank_balance":
#                 bank_balance,

#             "interest_from_bank":
#                 interest
#         })

#         grand_budget += budget_amount

#         grand_disbursement += disbursement

#         grand_utilisation += utilisation

#         grand_bank_balance += bank_balance

#         grand_interest += interest

#     # --------------------------
#     # FINAL RESULT
#     # --------------------------

#     result = []

#     for partner in partners.values():

#         partner["utilised_pct"] = round(
#             (
#                 partner["total_utilisation"]
#                 / partner["total_budget"]
#                 * 100
#             )
#             if partner["total_budget"] else 0,
#             2
#         )

#         partner["grant_ids"] = ", ".join(
#             sorted(
#                 set(
#                     b["grant_id"]
#                     for b in partner["budgets"]
#                     if b["grant_id"]
#                 )
#             )
#         )

#         partner["budgets"] = sorted(
#             partner["budgets"],
#             key=lambda x:
#             x["budget_reference_name"] or ""
#         )

#         result.append(partner)

#     result = sorted(
#         result,
#         key=lambda x:
#         x["partner_name"] or ""
#     )

#     return {

#         "summary": {

#             "total_budget":
#                 grand_budget,

#             "total_disbursement":
#                 grand_disbursement,

#             "total_utilisation":
#                 grand_utilisation,

#             "total_bank_balance":
#                 grand_bank_balance,

#             "total_interest":
#                 grand_interest,

#             "utilisation_pct": round(
#                 (
#                     grand_utilisation
#                     / grand_budget
#                     * 100
#                 )
#                 if grand_budget else 0,
#                 2
#             ),

#             "disbursement_pct": round(
#                 (
#                     grand_disbursement
#                     / grand_budget
#                     * 100
#                 )
#                 if grand_budget else 0,
#                 2
#             )
#         },

#         "partners":
#             result
#     }






# import frappe
# from frappe.utils import flt


# @frappe.whitelist()
# def get_partner_budget_summary():
#     """
#     Returns a consolidated budget & utilisation summary grouped by partner.

#     Response shape:
#     {
#         "summary": {
#             "total_budget":        float,
#             "total_disbursement":  float,
#             "total_utilisation":   float,
#             "total_bank_balance":  float,
#             "total_interest":      float,
#             "utilisation_pct":     float,   # utilisation / budget × 100
#             "disbursement_pct":    float,   # disbursement / budget × 100
#         },
#         "partners": [
#             {
#                 "partner_id":            str,
#                 "partner_name":          str,
#                 "grant_ids":             str,   # comma-joined sorted grant IDs
#                 "total_budget":          float,
#                 "total_disbursement":    float,
#                 "total_utilisation":     float,
#                 "total_balance_budget":  float,
#                 "total_bank_balance":    float,
#                 "total_interest":        float,
#                 "utilised_pct":          float,
#                 "budgets": [
#                     {
#                         "budget_id":                   str,
#                         "grant_id":                    str,
#                         "budget_reference_name":       str,
#                         "state":                       str,
#                         "grant_start":                 date,
#                         "grant_end":                   date,
#                         "financial_year":              str,
#                         "no_of_creches":               int,
#                         "budget":                      float,
#                         "disbursement":                float,
#                         "utilisation":                 float,
#                         "utilised_pct":                float,
#                         "utilised_disbursement_pct":   float,
#                         "balance_budget_amount":       float,
#                         "bank_balance":                float,
#                         "interest_from_bank":          float,
#                     },
#                     ...
#                 ]
#             },
#             ...
#         ]
#     }
#     """

#     # ──────────────────────────────────────────────
#     # 1. FETCH RAW DATA
#     # ──────────────────────────────────────────────

#     budgets = frappe.get_all(
#         "Creche Budget",
#         fields=[
#             "name",
#             "partner_id",
#             "partner_name",
#             "grant_id",
#             "budget_reference_name",
#             "state",
#             "start_date",
#             "end_date",
#             "financial_year",
#             "no_of_creches",
#             "total_budget",
#         ],
#         order_by="partner_name asc, budget_reference_name asc",
#     )

#     disbursements = frappe.get_all(
#         "Creche Disbursement",
#         fields=["budget_reference_id", "total_disbursement"],
#     )

#     utilisations = frappe.get_all(
#         "Creche utilisation",
#         fields=[
#             "budget_reference_id",
#             "total_utilisation",
#             "balance_amount",
#             "interest_from_bank",
#         ],
#     )

#     # ──────────────────────────────────────────────
#     # 2. BUILD LOOKUP MAPS  (budget_id → aggregated value)
#     # ──────────────────────────────────────────────

#     disbursement_map: dict[str, float] = {}
#     for row in disbursements:
#         key = row.budget_reference_id
#         disbursement_map[key] = (
#             disbursement_map.get(key, 0.0) + flt(row.total_disbursement)
#         )

#     utilisation_map:  dict[str, float] = {}
#     bank_balance_map: dict[str, float] = {}
#     interest_map:     dict[str, float] = {}

#     for row in utilisations:
#         key = row.budget_reference_id
#         utilisation_map[key]  = utilisation_map.get(key, 0.0)  + flt(row.total_utilisation)
#         bank_balance_map[key] = bank_balance_map.get(key, 0.0) + flt(row.balance_amount)
#         interest_map[key]     = interest_map.get(key, 0.0)     + flt(row.interest_from_bank)

#     # ──────────────────────────────────────────────
#     # 3. AGGREGATE PER PARTNER
#     # ──────────────────────────────────────────────

#     partners:  dict[str, dict] = {}
#     grand_budget       = 0.0
#     grand_disbursement = 0.0
#     grand_utilisation  = 0.0
#     grand_bank_balance = 0.0
#     grand_interest     = 0.0

#     for budget in budgets:

#         budget_id = budget.name

#         budget_amount = flt(budget.total_budget)
#         disbursement  = flt(disbursement_map.get(budget_id, 0))
#         utilisation   = flt(utilisation_map.get(budget_id, 0))
#         bank_balance  = flt(bank_balance_map.get(budget_id, 0))
#         interest      = flt(interest_map.get(budget_id, 0))

#         balance_budget_amount = budget_amount - utilisation

#         utilised_pct = round(
#             (utilisation / budget_amount * 100) if budget_amount else 0, 2
#         )
#         utilised_disbursement_pct = round(
#             (utilisation / disbursement * 100) if disbursement else 0, 2
#         )

#         # Partner key — prefer partner_id (stable), fall back to name
#         partner_key = budget.partner_id or budget.partner_name or "Unknown"

#         if partner_key not in partners:
#             partners[partner_key] = {
#                 "partner_id":           budget.partner_id,
#                 "partner_name":         budget.partner_name,
#                 "total_budget":         0.0,
#                 "total_disbursement":   0.0,
#                 "total_utilisation":    0.0,
#                 "total_balance_budget": 0.0,
#                 "total_bank_balance":   0.0,
#                 "total_interest":       0.0,
#                 "budgets":              [],
#             }

#         p = partners[partner_key]
#         p["total_budget"]         += budget_amount
#         p["total_disbursement"]   += disbursement
#         p["total_utilisation"]    += utilisation
#         p["total_balance_budget"] += balance_budget_amount
#         p["total_bank_balance"]   += bank_balance
#         p["total_interest"]       += interest

#         p["budgets"].append({
#             "budget_id":                  budget_id,
#             "grant_id":                   budget.grant_id,
#             "budget_reference_name":      budget.budget_reference_name,
#             "state":                      budget.state,
#             "grant_start":                budget.start_date,
#             "grant_end":                  budget.end_date,
#             "financial_year":             budget.financial_year,
#             "no_of_creches":              budget.no_of_creches,
#             "budget":                     budget_amount,
#             "disbursement":               disbursement,
#             "utilisation":                utilisation,
#             "utilised_pct":               utilised_pct,
#             "utilised_disbursement_pct":  utilised_disbursement_pct,
#             "balance_budget_amount":      balance_budget_amount,
#             "bank_balance":               bank_balance,
#             "interest_from_bank":         interest,
#         })

#         grand_budget       += budget_amount
#         grand_disbursement += disbursement
#         grand_utilisation  += utilisation
#         grand_bank_balance += bank_balance
#         grand_interest     += interest

#     # ──────────────────────────────────────────────
#     # 4. FINALISE PARTNER LIST
#     # ──────────────────────────────────────────────

#     result = []

#     for p in partners.values():

#         p["utilised_pct"] = round(
#             (p["total_utilisation"] / p["total_budget"] * 100)
#             if p["total_budget"] else 0,
#             2,
#         )

#         # Collect and de-duplicate grant IDs across all budget rows
#         p["grant_ids"] = ", ".join(
#             sorted(
#                 set(b["grant_id"] for b in p["budgets"] if b["grant_id"])
#             )
#         )

#         # Sort budget rows alphabetically by reference name
#         p["budgets"] = sorted(
#             p["budgets"],
#             key=lambda x: x["budget_reference_name"] or "",
#         )

#         result.append(p)

#     # Sort partners alphabetically
#     result.sort(key=lambda x: x["partner_name"] or "")

#     # ──────────────────────────────────────────────
#     # 5. GRAND SUMMARY
#     # ──────────────────────────────────────────────

#     summary = {
#         "total_budget":        grand_budget,
#         "total_disbursement":  grand_disbursement,
#         "total_utilisation":   grand_utilisation,
#         "total_bank_balance":  grand_bank_balance,
#         "total_interest":      grand_interest,
#         "utilisation_pct": round(
#             (grand_utilisation / grand_budget * 100) if grand_budget else 0, 2
#         ),
#         "disbursement_pct": round(
#             (grand_disbursement / grand_budget * 100) if grand_budget else 0, 2
#         ),
#     }

#     return {"summary": summary, "partners": result}







# import frappe
# from frappe.utils import flt


# # ──────────────────────────────────────────────────────────────────────────────
# # MAIN SUMMARY
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_partner_budget_summary():
# 	"""
# 	Returns consolidated budget & utilisation summary grouped by partner.
# 	"""

# 	budgets = frappe.get_all(
# 		"Creche Budget",
# 		fields=[
# 			"name", "partner_id", "partner_name", "grant_id",
# 			"budget_reference_name", "state", "start_date", "end_date",
# 			"financial_year", "no_of_creches", "total_budget",
# 		],
# 		order_by="partner_name asc, budget_reference_name asc",
# 	)

# 	disbursements = frappe.get_all(
# 		"Creche Disbursement",
# 		fields=["budget_reference_id", "total_disbursement"],
# 	)

# 	utilisations = frappe.get_all(
# 		"Creche utilisation",
# 		fields=["budget_reference_id", "total_utilisation", "balance_amount", "interest_from_bank"],
# 	)

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

# 	# ── Aggregate ────────────────────────────────────────────────────────────

# 	partners:          dict[str, dict] = {}
# 	grand_budget       = 0.0
# 	grand_disbursement = 0.0
# 	grand_utilisation  = 0.0
# 	grand_bank_balance = 0.0
# 	grand_interest     = 0.0

# 	for budget in budgets:
# 		budget_id     = budget.name
# 		budget_amount = flt(budget.total_budget)
# 		disbursement  = flt(disbursement_map.get(budget_id, 0))
# 		utilisation   = flt(utilisation_map.get(budget_id, 0))
# 		bank_balance  = flt(bank_balance_map.get(budget_id, 0))
# 		interest      = flt(interest_map.get(budget_id, 0))

# 		balance_budget_amount     = budget_amount - utilisation
# 		utilised_pct              = round((utilisation / budget_amount * 100) if budget_amount else 0, 2)
# 		utilised_disbursement_pct = round((utilisation / disbursement * 100) if disbursement else 0, 2)

# 		partner_key = budget.partner_id or budget.partner_name or "Unknown"

# 		if partner_key not in partners:
# 			partners[partner_key] = {
# 				"partner_id": budget.partner_id, "partner_name": budget.partner_name,
# 				"total_budget": 0.0, "total_disbursement": 0.0, "total_utilisation": 0.0,
# 				"total_balance_budget": 0.0, "total_bank_balance": 0.0, "total_interest": 0.0,
# 				"budgets": [],
# 			}

# 		p = partners[partner_key]
# 		p["total_budget"]         += budget_amount
# 		p["total_disbursement"]   += disbursement
# 		p["total_utilisation"]    += utilisation
# 		p["total_balance_budget"] += balance_budget_amount
# 		p["total_bank_balance"]   += bank_balance
# 		p["total_interest"]       += interest

# 		p["budgets"].append({
# 			"budget_id":                  budget_id,
# 			"grant_id":                   budget.grant_id,
# 			"budget_reference_name":      budget.budget_reference_name,
# 			"state":                      budget.state,
# 			"grant_start":                budget.start_date,
# 			"grant_end":                  budget.end_date,
# 			"financial_year":             budget.financial_year,
# 			"no_of_creches":              budget.no_of_creches,
# 			"budget":                     budget_amount,
# 			"disbursement":               disbursement,
# 			"utilisation":                utilisation,
# 			"utilised_pct":               utilised_pct,
# 			"utilised_disbursement_pct":  utilised_disbursement_pct,
# 			"balance_budget_amount":      balance_budget_amount,
# 			"bank_balance":               bank_balance,
# 			"interest_from_bank":         interest,
# 		})

# 		grand_budget       += budget_amount
# 		grand_disbursement += disbursement
# 		grand_utilisation  += utilisation
# 		grand_bank_balance += bank_balance
# 		grand_interest     += interest

# 	# ── Finalise ─────────────────────────────────────────────────────────────

# 	result = []
# 	for p in partners.values():
# 		p["utilised_pct"] = round(
# 			(p["total_utilisation"] / p["total_budget"] * 100) if p["total_budget"] else 0, 2
# 		)
# 		p["grant_ids"] = ", ".join(sorted(set(b["grant_id"] for b in p["budgets"] if b["grant_id"])))
# 		p["budgets"]   = sorted(p["budgets"], key=lambda x: x["budget_reference_name"] or "")
# 		result.append(p)

# 	result.sort(key=lambda x: x["partner_name"] or "")

# 	return {
# 		"summary": {
# 			"total_budget":        grand_budget,
# 			"total_disbursement":  grand_disbursement,
# 			"total_utilisation":   grand_utilisation,
# 			"total_bank_balance":  grand_bank_balance,
# 			"total_interest":      grand_interest,
# 			"utilisation_pct":  round((grand_utilisation  / grand_budget * 100) if grand_budget else 0, 2),
# 			"disbursement_pct": round((grand_disbursement / grand_budget * 100) if grand_budget else 0, 2),
# 		},
# 		"partners": result,
# 	}


# # ──────────────────────────────────────────────────────────────────────────────
# # BUDGET LINE ITEMS  (left panel)
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_budget_line_items(budget_id: str):
# 	"""
# 	Returns Budget Items child table rows for a given Creche Budget document.

# 	Each row:
# 	  type_of_expenses_id, type_of_expenses, budget_main_head, budget_sub_head,
# 	  year_1, year_2, year_3, total_amount, notes
# 	"""
# 	if not budget_id:
# 		return []

# 	rows = frappe.get_all(
# 		"Budget Items",
# 		filters={"parent": budget_id, "parenttype": "Creche Budget"},
# 		fields=[
# 			"type_of_expenses_id", "type_of_expenses",
# 			"budget_main_head", "budget_sub_head",
# 			"year_1", "year_2", "year_3",
# 			"total_amount", "notes",
# 		],
# 		order_by="budget_main_head asc, type_of_expenses asc",
# 	)

# 	return [
# 		{
# 			"type_of_expenses_id": r.type_of_expenses_id,
# 			"type_of_expenses":    r.type_of_expenses,
# 			"budget_main_head":    r.budget_main_head,
# 			"budget_sub_head":     r.budget_sub_head,
# 			"year_1":              flt(r.year_1),
# 			"year_2":              flt(r.year_2),
# 			"year_3":              flt(r.year_3),
# 			"total_amount":        flt(r.total_amount),
# 			"notes":               r.notes or "",
# 		}
# 		for r in rows
# 	]


# # ──────────────────────────────────────────────────────────────────────────────
# # UTILISATION LINE ITEMS  (right panel)
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_utilisation_line_items(budget_id: str):
# 	"""
# 	Returns Utilisation Items grouped by month for a given Creche Budget.

# 	Response:
# 	{
# 	  "months":  ["January", "February", ...],   # sorted distinct months
# 	  "records": [
# 	    {
# 	      "month": "January",
# 	      "utilisation_id": "CUT-0001",
# 	      "items": [
# 	        {
# 	          "type_of_expenses_id", "type_of_expenses",
# 	          "budget_main_head", "budget_sub_head",
# 	          "total_amount", "notes"
# 	        }, ...
# 	      ]
# 	    }, ...
# 	  ]
# 	}
# 	"""
# 	if not budget_id:
# 		return {"months": [], "records": []}

# 	# Fetch all Creche utilisation docs linked to this budget
# 	util_docs = frappe.get_all(
# 		"Creche utilisation",
# 		filters={"budget_reference_id": budget_id},
# 		fields=["name", "month", "financial_year"],
# 		order_by="month asc",
# 	)

# 	if not util_docs:
# 		return {"months": [], "records": []}

# 	# Month display order for sorting
# 	MONTH_ORDER = [
# 		"January", "February", "March", "April", "May", "June",
# 		"July", "August", "September", "October", "November", "December",
# 	]

# 	records = []
# 	seen_months = []

# 	for doc in util_docs:
# 		items = frappe.get_all(
# 			"Utilisation Items",
# 			filters={"parent": doc.name, "parenttype": "Creche utilisation"},
# 			fields=[
# 				"type_of_expenses_id", "type_of_expenses",
# 				"budget_main_head", "budget_sub_head",
# 				"total_amount", "notes",
# 			],
# 			order_by="budget_main_head asc, type_of_expenses asc",
# 		)

# 		month_label = doc.month or "Unknown"
# 		records.append({
# 			"month":           month_label,
# 			"financial_year":  doc.financial_year or "",
# 			"utilisation_id":  doc.name,
# 			"items": [
# 				{
# 					"type_of_expenses_id": r.type_of_expenses_id,
# 					"type_of_expenses":    r.type_of_expenses,
# 					"budget_main_head":    r.budget_main_head,
# 					"budget_sub_head":     r.budget_sub_head,
# 					"total_amount":        flt(r.total_amount),
# 					"notes":               r.notes or "",
# 				}
# 				for r in items
# 			],
# 		})

# 		if month_label not in seen_months:
# 			seen_months.append(month_label)

# 	# Sort months in calendar order
# 	def month_sort_key(m):
# 		try:
# 			return MONTH_ORDER.index(m)
# 		except ValueError:
# 			return 99

# 	seen_months.sort(key=month_sort_key)
# 	records.sort(key=lambda r: month_sort_key(r["month"]))

# 	return {"months": seen_months, "records": records}

















# last working --------------

# import frappe
# from frappe.utils import flt


# # ──────────────────────────────────────────────────────────────────────────────
# # MAIN SUMMARY
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_partner_budget_summary(filters=None):
# 	"""
# 	Returns consolidated budget & utilisation summary grouped by partner.
# 	Accepts optional filters dict from the frontend filter bar.
# 	"""
# 	if isinstance(filters, str):
# 		import json
# 		filters = json.loads(filters)
# 	filters = filters or {}

# 	# ── Build Creche Budget filters ─────────────────────────────────────────
# 	budget_filters = {}

# 	if filters.get("partner_id"):
# 		budget_filters["partner_id"] = ["in", filters["partner_id"]]

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

# 	# Date range filters on start_date / end_date
# 	if filters.get("start_date"):
# 		budget_filters["start_date"] = [">=", filters["start_date"]]

# 	if filters.get("end_date"):
# 		budget_filters["end_date"] = ["<=", filters["end_date"]]

# 	budgets = frappe.get_all(
# 		"Creche Budget",
# 		filters=budget_filters,
# 		fields=[
# 			"name", "partner_id", "partner_name", "grant_id",
# 			"budget_reference_name", "state", "start_date", "end_date",
# 			"financial_year", "no_of_creches", "total_budget",
# 		],
# 		order_by="partner_name asc, budget_reference_name asc",
# 	)

# 	disbursements = frappe.get_all(
# 		"Creche Disbursement",
# 		fields=["budget_reference_id", "total_disbursement"],
# 	)

# 	util_filters = {}
# 	if filters.get("month"):
# 		util_filters["month"] = ["in", filters["month"]]

# 	utilisations = frappe.get_all(
# 		"Creche utilisation",
# 		filters=util_filters,
# 		fields=["budget_reference_id", "total_utilisation", "balance_amount", "interest_from_bank"],
# 	)

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

# 	# ── Aggregate ────────────────────────────────────────────────────────────

# 	partners:          dict[str, dict] = {}
# 	grand_budget       = 0.0
# 	grand_disbursement = 0.0
# 	grand_utilisation  = 0.0
# 	grand_bank_balance = 0.0
# 	grand_interest     = 0.0

# 	for budget in budgets:
# 		budget_id     = budget.name
# 		budget_amount = flt(budget.total_budget)
# 		disbursement  = flt(disbursement_map.get(budget_id, 0))
# 		utilisation   = flt(utilisation_map.get(budget_id, 0))
# 		bank_balance  = flt(bank_balance_map.get(budget_id, 0))
# 		interest      = flt(interest_map.get(budget_id, 0))

# 		balance_budget_amount     = budget_amount - utilisation
# 		utilised_pct              = round((utilisation / budget_amount * 100) if budget_amount else 0, 2)
# 		utilised_disbursement_pct = round((utilisation / disbursement * 100) if disbursement else 0, 2)

# 		partner_key = budget.partner_id or budget.partner_name or "Unknown"

# 		if partner_key not in partners:
# 			partners[partner_key] = {
# 				"partner_id": budget.partner_id, "partner_name": budget.partner_name,
# 				"total_budget": 0.0, "total_disbursement": 0.0, "total_utilisation": 0.0,
# 				"total_balance_budget": 0.0, "total_bank_balance": 0.0, "total_interest": 0.0,
# 				"budgets": [],
# 			}

# 		p = partners[partner_key]
# 		p["total_budget"]         += budget_amount
# 		p["total_disbursement"]   += disbursement
# 		p["total_utilisation"]    += utilisation
# 		p["total_balance_budget"] += balance_budget_amount
# 		p["total_bank_balance"]   += bank_balance
# 		p["total_interest"]       += interest

# 		p["budgets"].append({
# 			"budget_id":                  budget_id,
# 			"grant_id":                   budget.grant_id,
# 			"budget_reference_name":      budget.budget_reference_name,
# 			"state":                      budget.state,
# 			"grant_start":                budget.start_date,
# 			"grant_end":                  budget.end_date,
# 			"financial_year":             budget.financial_year,
# 			"no_of_creches":              budget.no_of_creches,
# 			"budget":                     budget_amount,
# 			"disbursement":               disbursement,
# 			"utilisation":                utilisation,
# 			"utilised_pct":               utilised_pct,
# 			"utilised_disbursement_pct":  utilised_disbursement_pct,
# 			"balance_budget_amount":      balance_budget_amount,
# 			"bank_balance":               bank_balance,
# 			"interest_from_bank":         interest,
# 		})

# 		grand_budget       += budget_amount
# 		grand_disbursement += disbursement
# 		grand_utilisation  += utilisation
# 		grand_bank_balance += bank_balance
# 		grand_interest     += interest

# 	# ── Finalise ─────────────────────────────────────────────────────────────

# 	result = []
# 	for p in partners.values():
# 		p["utilised_pct"] = round(
# 			(p["total_utilisation"] / p["total_budget"] * 100) if p["total_budget"] else 0, 2
# 		)
# 		p["grant_ids"] = ", ".join(sorted(set(b["grant_id"] for b in p["budgets"] if b["grant_id"])))
# 		p["budgets"]   = sorted(p["budgets"], key=lambda x: x["budget_reference_name"] or "")
# 		result.append(p)

# 	result.sort(key=lambda x: x["partner_name"] or "")

# 	return {
# 		"summary": {
# 			"total_budget":        grand_budget,
# 			"total_disbursement":  grand_disbursement,
# 			"total_utilisation":   grand_utilisation,
# 			"total_bank_balance":  grand_bank_balance,
# 			"total_interest":      grand_interest,
# 			"utilisation_pct":  round((grand_utilisation  / grand_budget * 100) if grand_budget else 0, 2),
# 			"disbursement_pct": round((grand_disbursement / grand_budget * 100) if grand_budget else 0, 2),
# 		},
# 		"partners": result,
# 	}


# # ──────────────────────────────────────────────────────────────────────────────
# # BUDGET LINE ITEMS  (left panel)
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_budget_line_items(budget_id: str):
# 	"""
# 	Returns Budget Items child table rows for a given Creche Budget document.

# 	Each row:
# 	  type_of_expenses_id, type_of_expenses, budget_main_head, budget_sub_head,
# 	  year_1, year_2, year_3, total_amount, notes
# 	"""
# 	if not budget_id:
# 		return []

# 	rows = frappe.get_all(
# 		"Budget Items",
# 		filters={"parent": budget_id, "parenttype": "Creche Budget"},
# 		fields=[
# 			"type_of_expenses_id", "type_of_expenses",
# 			"budget_main_head", "budget_sub_head",
# 			"year_1", "year_2", "year_3",
# 			"total_amount", "notes",
# 		],
# 		order_by="budget_main_head asc, type_of_expenses asc",
# 	)

# 	return [
# 		{
# 			"type_of_expenses_id": r.type_of_expenses_id,
# 			"type_of_expenses":    r.type_of_expenses,
# 			"budget_main_head":    r.budget_main_head,
# 			"budget_sub_head":     r.budget_sub_head,
# 			"year_1":              flt(r.year_1),
# 			"year_2":              flt(r.year_2),
# 			"year_3":              flt(r.year_3),
# 			"total_amount":        flt(r.total_amount),
# 			"notes":               r.notes or "",
# 		}
# 		for r in rows
# 	]


# # ──────────────────────────────────────────────────────────────────────────────
# # UTILISATION LINE ITEMS  (right panel)
# # ──────────────────────────────────────────────────────────────────────────────

# @frappe.whitelist()
# def get_utilisation_line_items(budget_id: str):
# 	"""
# 	Returns Utilisation Items grouped by month for a given Creche Budget.

# 	Response:
# 	{
# 	  "months":  ["January", "February", ...],   # sorted distinct months
# 	  "records": [
# 	    {
# 	      "month": "January",
# 	      "utilisation_id": "CUT-0001",
# 	      "items": [
# 	        {
# 	          "type_of_expenses_id", "type_of_expenses",
# 	          "budget_main_head", "budget_sub_head",
# 	          "total_amount", "notes"
# 	        }, ...
# 	      ]
# 	    }, ...
# 	  ]
# 	}
# 	"""
# 	if not budget_id:
# 		return {"months": [], "records": []}

# 	# Fetch all Creche utilisation docs linked to this budget
# 	util_docs = frappe.get_all(
# 		"Creche utilisation",
# 		filters={"budget_reference_id": budget_id},
# 		fields=["name", "month", "financial_year"],
# 		order_by="month asc",
# 	)

# 	if not util_docs:
# 		return {"months": [], "records": []}

# 	# Month display order for sorting
# 	MONTH_ORDER = [
# 		"January", "February", "March", "April", "May", "June",
# 		"July", "August", "September", "October", "November", "December",
# 	]

# 	records = []
# 	seen_months = []

# 	for doc in util_docs:
# 		items = frappe.get_all(
# 			"Utilisation Items",
# 			filters={"parent": doc.name, "parenttype": "Creche utilisation"},
# 			fields=[
# 				"type_of_expenses_id", "type_of_expenses",
# 				"budget_main_head", "budget_sub_head",
# 				"total_amount", "notes",
# 			],
# 			order_by="budget_main_head asc, type_of_expenses asc",
# 		)

# 		month_label = doc.month or "Unknown"
# 		records.append({
# 			"month":           month_label,
# 			"financial_year":  doc.financial_year or "",
# 			"utilisation_id":  doc.name,
# 			"items": [
# 				{
# 					"type_of_expenses_id": r.type_of_expenses_id,
# 					"type_of_expenses":    r.type_of_expenses,
# 					"budget_main_head":    r.budget_main_head,
# 					"budget_sub_head":     r.budget_sub_head,
# 					"total_amount":        flt(r.total_amount),
# 					"notes":               r.notes or "",
# 				}
# 				for r in items
# 			],
# 		})

# 		if month_label not in seen_months:
# 			seen_months.append(month_label)

# 	# Sort months in calendar order
# 	def month_sort_key(m):
# 		try:
# 			return MONTH_ORDER.index(m)
# 		except ValueError:
# 			return 99

# 	seen_months.sort(key=month_sort_key)
# 	records.sort(key=lambda r: month_sort_key(r["month"]))

# 	return {"months": seen_months, "records": records}







import frappe
from frappe.utils import flt


# ──────────────────────────────────────────────────────────────────────────────
# MAIN SUMMARY
# ──────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_partner_budget_summary(filters=None):
	"""
	Returns consolidated budget & utilisation summary grouped by partner.
	Accepts optional filters dict from the frontend filter bar.
	Enforces Frappe row-level permissions on Creche Budget and Creche Partners.
	"""
	if isinstance(filters, str):
		import json
		filters = json.loads(filters)
	filters = filters or {}

	# ── Permission: restrict to partners the user can see ───────────────────
	# Frappe's has_permission check happens automatically via get_all when
	# ignore_permissions is NOT set. We additionally restrict by partner_id
	# to only partners the logged-in user has read access to.
	allowed_partners = _get_allowed_partners()

	# ── Build Creche Budget filters ─────────────────────────────────────────
	budget_filters = {}

	# Always scope to allowed partners (unless System Manager / Administrator)
	if allowed_partners is not None:
		if not allowed_partners:
			# User has no partner access at all
			return {"summary": _empty_summary(), "partners": []}
		budget_filters["partner_id"] = ["in", allowed_partners]

	if filters.get("partner_id"):
		budget_filters["partner_id"] = ["in", filters["partner_id"]]

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

	# Date range filters on start_date / end_date
	if filters.get("start_date"):
		budget_filters["start_date"] = [">=", filters["start_date"]]

	if filters.get("end_date"):
		budget_filters["end_date"] = ["<=", filters["end_date"]]

	budgets = frappe.get_all(
		"Creche Budget",
		filters=budget_filters,
		fields=[
			"name", "partner_id", "partner_name", "grant_id",
			"budget_reference_name", "state", "start_date", "end_date",
			"financial_year", "no_of_creches", "total_budget",
		],
		order_by="partner_name asc, budget_reference_name asc",
	)

	disbursements = frappe.get_all(
		"Creche Disbursement",
		fields=["budget_reference_id", "total_disbursement"],
	)

	util_filters = {}
	if filters.get("month"):
		util_filters["month"] = ["in", filters["month"]]

	utilisations = frappe.get_all(
		"Creche utilisation",
		filters=util_filters,
		fields=["budget_reference_id", "total_utilisation", "balance_amount", "interest_from_bank"],
	)

	# ── Lookup maps ──────────────────────────────────────────────────────────

	disbursement_map: dict[str, float] = {}
	for row in disbursements:
		k = row.budget_reference_id
		disbursement_map[k] = disbursement_map.get(k, 0.0) + flt(row.total_disbursement)

	utilisation_map:  dict[str, float] = {}
	bank_balance_map: dict[str, float] = {}
	interest_map:     dict[str, float] = {}
	for row in utilisations:
		k = row.budget_reference_id
		utilisation_map[k]  = utilisation_map.get(k, 0.0)  + flt(row.total_utilisation)
		bank_balance_map[k] = bank_balance_map.get(k, 0.0) + flt(row.balance_amount)
		interest_map[k]     = interest_map.get(k, 0.0)     + flt(row.interest_from_bank)

	# ── Aggregate ────────────────────────────────────────────────────────────

	partners:          dict[str, dict] = {}
	grand_budget       = 0.0
	grand_disbursement = 0.0
	grand_utilisation  = 0.0
	grand_bank_balance = 0.0
	grand_interest     = 0.0

	for budget in budgets:
		budget_id     = budget.name
		budget_amount = flt(budget.total_budget)
		disbursement  = flt(disbursement_map.get(budget_id, 0))
		utilisation   = flt(utilisation_map.get(budget_id, 0))
		bank_balance  = flt(bank_balance_map.get(budget_id, 0))
		interest      = flt(interest_map.get(budget_id, 0))

		balance_budget_amount     = budget_amount - utilisation
		utilised_pct              = round((utilisation / budget_amount * 100) if budget_amount else 0, 2)
		utilised_disbursement_pct = round((utilisation / disbursement * 100) if disbursement else 0, 2)

		partner_key = budget.partner_id or budget.partner_name or "Unknown"

		if partner_key not in partners:
			partners[partner_key] = {
				"partner_id": budget.partner_id, "partner_name": budget.partner_name,
				"total_budget": 0.0, "total_disbursement": 0.0, "total_utilisation": 0.0,
				"total_balance_budget": 0.0, "total_bank_balance": 0.0, "total_interest": 0.0,
				"budgets": [],
			}

		p = partners[partner_key]
		p["total_budget"]         += budget_amount
		p["total_disbursement"]   += disbursement
		p["total_utilisation"]    += utilisation
		p["total_balance_budget"] += balance_budget_amount
		p["total_bank_balance"]   += bank_balance
		p["total_interest"]       += interest

		p["budgets"].append({
			"budget_id":                  budget_id,
			"grant_id":                   budget.grant_id,
			"budget_reference_name":      budget.budget_reference_name,
			"state":                      budget.state,
			"grant_start":                budget.start_date,
			"grant_end":                  budget.end_date,
			"financial_year":             budget.financial_year,
			"no_of_creches":              budget.no_of_creches,
			"budget":                     budget_amount,
			"disbursement":               disbursement,
			"utilisation":                utilisation,
			"utilised_pct":               utilised_pct,
			"utilised_disbursement_pct":  utilised_disbursement_pct,
			"balance_budget_amount":      balance_budget_amount,
			"bank_balance":               bank_balance,
			"interest_from_bank":         interest,
		})

		grand_budget       += budget_amount
		grand_disbursement += disbursement
		grand_utilisation  += utilisation
		grand_bank_balance += bank_balance
		grand_interest     += interest

	# ── Finalise ─────────────────────────────────────────────────────────────

	result = []
	for p in partners.values():
		p["utilised_pct"] = round(
			(p["total_utilisation"] / p["total_budget"] * 100) if p["total_budget"] else 0, 2
		)
		p["grant_ids"] = ", ".join(sorted(set(b["grant_id"] for b in p["budgets"] if b["grant_id"])))
		p["budgets"]   = sorted(p["budgets"], key=lambda x: x["budget_reference_name"] or "")
		result.append(p)

	result.sort(key=lambda x: x["partner_name"] or "")

	return {
		"summary": {
			"total_budget":        grand_budget,
			"total_disbursement":  grand_disbursement,
			"total_utilisation":   grand_utilisation,
			"total_bank_balance":  grand_bank_balance,
			"total_interest":      grand_interest,
			"utilisation_pct":  round((grand_utilisation  / grand_budget * 100) if grand_budget else 0, 2),
			"disbursement_pct": round((grand_disbursement / grand_budget * 100) if grand_budget else 0, 2),
		},
		"partners": result,
	}


# ──────────────────────────────────────────────────────────────────────────────
# BUDGET LINE ITEMS  (left panel)
# ──────────────────────────────────────────────────────────────────────────────


def _get_allowed_partners():
	"""
	Returns a list of partner IDs the current user is allowed to see,
	or None if the user has unrestricted access (System Manager / Administrator).
	"""
	user  = frappe.session.user
	roles = frappe.get_roles(user)

	# System Manager and Administrator see everything
	if "System Manager" in roles or user == "Administrator":
		return None

	# Check if Creche Partners has row-level permissions (User Permissions)
	# frappe.get_list respects has_permission automatically
	try:
		allowed = frappe.get_all(
			"Creche Partners",
			fields=["name"],
			ignore_permissions=False,  # enforce permissions
			limit=0,
		)
		return [r.name for r in allowed]
	except Exception:
		return []


def _empty_summary():
	return {
		"total_budget":        0,
		"total_disbursement":  0,
		"total_utilisation":   0,
		"total_bank_balance":  0,
		"total_interest":      0,
		"utilisation_pct":     0,
		"disbursement_pct":    0,
	}


@frappe.whitelist()
def get_budget_line_items(budget_id: str):
	"""
	Returns Budget Items child table rows for a given Creche Budget document.

	Each row:
	  type_of_expenses_id, type_of_expenses, budget_main_head, budget_sub_head,
	  year_1, year_2, year_3, total_amount, notes
	"""
	if not budget_id:
		return []

	# Verify user can read this budget document
	if not frappe.has_permission("Creche Budget", "read", budget_id):
		frappe.throw(frappe._("Not permitted"), frappe.PermissionError)

	rows = frappe.get_all(
		"Budget Items",
		filters={"parent": budget_id, "parenttype": "Creche Budget"},
		fields=[
			"type_of_expenses_id", "type_of_expenses",
			"budget_main_head", "budget_sub_head",
			"year_1", "year_2", "year_3",
			"total_amount", "notes",
		],
		order_by="budget_main_head asc, type_of_expenses asc",
	)

	return [
		{
			"type_of_expenses_id": r.type_of_expenses_id,
			"type_of_expenses":    r.type_of_expenses,
			"budget_main_head":    r.budget_main_head,
			"budget_sub_head":     r.budget_sub_head,
			"year_1":              flt(r.year_1),
			"year_2":              flt(r.year_2),
			"year_3":              flt(r.year_3),
			"total_amount":        flt(r.total_amount),
			"notes":               r.notes or "",
		}
		for r in rows
	]


# ──────────────────────────────────────────────────────────────────────────────
# UTILISATION LINE ITEMS  (right panel)
# ──────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_utilisation_line_items(budget_id: str):
	"""
	Returns Utilisation Items grouped by month for a given Creche Budget.

	Response:
	{
	  "months":  ["January", "February", ...],   # sorted distinct months
	  "records": [
	    {
	      "month": "January",
	      "utilisation_id": "CUT-0001",
	      "items": [
	        {
	          "type_of_expenses_id", "type_of_expenses",
	          "budget_main_head", "budget_sub_head",
	          "total_amount", "notes"
	        }, ...
	      ]
	    }, ...
	  ]
	}
	"""
	if not budget_id:
		return {"months": [], "records": []}

	# Verify user can read the parent budget
	if not frappe.has_permission("Creche Budget", "read", budget_id):
		frappe.throw(frappe._("Not permitted"), frappe.PermissionError)

	# Fetch all Creche utilisation docs linked to this budget
	util_docs = frappe.get_all(
		"Creche utilisation",
		filters={"budget_reference_id": budget_id},
		fields=["name", "month", "financial_year"],
		order_by="month asc",
	)

	if not util_docs:
		return {"months": [], "records": []}

	# Month display order for sorting
	MONTH_ORDER = [
		"January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December",
	]

	records = []
	seen_months = []

	for doc in util_docs:
		items = frappe.get_all(
			"Utilisation Items",
			filters={"parent": doc.name, "parenttype": "Creche utilisation"},
			fields=[
				"type_of_expenses_id", "type_of_expenses",
				"budget_main_head", "budget_sub_head",
				"total_amount", "notes",
			],
			order_by="budget_main_head asc, type_of_expenses asc",
		)

		month_label = doc.month or "Unknown"
		records.append({
			"month":           month_label,
			"financial_year":  doc.financial_year or "",
			"utilisation_id":  doc.name,
			"items": [
				{
					"type_of_expenses_id": r.type_of_expenses_id,
					"type_of_expenses":    r.type_of_expenses,
					"budget_main_head":    r.budget_main_head,
					"budget_sub_head":     r.budget_sub_head,
					"total_amount":        flt(r.total_amount),
					"notes":               r.notes or "",
				}
				for r in items
			],
		})

		if month_label not in seen_months:
			seen_months.append(month_label)

	# Sort months in calendar order
	def month_sort_key(m):
		try:
			return MONTH_ORDER.index(m)
		except ValueError:
			return 99

	seen_months.sort(key=month_sort_key)
	records.sort(key=lambda r: month_sort_key(r["month"]))

	return {"months": seen_months, "records": records}
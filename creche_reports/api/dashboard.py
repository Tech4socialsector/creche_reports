# import frappe
# from collections import defaultdict

# MONTH_ORDER = [
#     "April", "May", "June", "July", "August", "September",
#     "October", "November", "December",
#     "January", "February", "March"
# ]


# @frappe.whitelist(allow_guest=True)
# def get_creche_utilisation(
#     budget_reference_id=None,
#     partner_id=None,
#     state=None,
#     financial_year=None,
#     month=None,
#     report_type=None,  # Monthwise / YTD
# ):

#     # -----------------------------
#     # Filters
#     # -----------------------------
#     filters = {
#         k: v for k, v in {
#             "budget_reference_id": budget_reference_id,
#             "partner_id": partner_id,
#             "state": state,
#             "financial_year": financial_year,
#         }.items() if v
#     }

#     # Month Filter
#     if month:

#         if report_type == "Month wise":
#             filters["month"] = month

#         elif report_type == "YTD":
#             filters["month"] = [
#                 "in",
#                 MONTH_ORDER[:MONTH_ORDER.index(month) + 1]
#             ]

#     # -----------------------------
#     # Parent Records
#     # -----------------------------
#     parent_docs = frappe.get_all(
#         "Creche utilisation",
#         filters=filters,
#         fields=[
#             "name",
#             "budget_reference_id",
#             "budget_reference_name",
#             "partner_id",
#             "partner_name",
#             "grant_id",
#             "state",
#             "financial_year",
#             "month",
#             "date",
#             "total_utilisation",
#             "balance_amount",
#             "interest_from_bank",
#         ],
#         order_by="date desc",
#     )

#     if not parent_docs:
#         return {}

#     parent_names = [d.name for d in parent_docs]

#     # -----------------------------
#     # Child Records
#     # -----------------------------
#     child_rows = frappe.get_all(
#         "Utilisation Items",
#         filters={
#             "parent": ["in", parent_names],
#             "parenttype": "Creche utilisation",
#         },
#         fields=[
#             "parent",
#             "type_of_expenses_id",
#             "type_of_expenses",
#             "budget_main_head",
#             "budget_sub_head",
#             "total_amount",
#         ],
#     )

#     # -----------------------------
#     # Expense Summary
#     # -----------------------------
#     expense_summary = defaultdict(lambda: {
#         "type_of_expenses_id": "",
#         "type_of_expenses": "",
#         "budget_main_head": "",
#         "budget_sub_head": "",
#         "total_amount": 0,
#     })

#     # -----------------------------
#     # Parent Wise Items
#     # -----------------------------
#     parent_items = defaultdict(list)

#     for row in child_rows:

#         # Overview Summary
#         item = expense_summary[row.type_of_expenses_id]

#         item.update({
#             "type_of_expenses_id": row.type_of_expenses_id,
#             "type_of_expenses": row.type_of_expenses,
#             "budget_main_head": row.budget_main_head,
#             "budget_sub_head": row.budget_sub_head,
#         })

#         item["total_amount"] += row.total_amount or 0

#         # Detailed Definition
#         parent_items[row.parent].append({
#             "type_of_expenses_id": row.type_of_expenses_id,
#             "type_of_expenses": row.type_of_expenses,
#             "budget_main_head": row.budget_main_head,
#             "budget_sub_head": row.budget_sub_head,
#             "total_amount": row.total_amount,
#         })

#     # -----------------------------
#     # Overview
#     # -----------------------------
#     first_doc = parent_docs[0]

#     overview = {
#         "budget_reference_id": first_doc.budget_reference_id,
#         "budget_reference_name": first_doc.budget_reference_name,
#         "partner_id": first_doc.partner_id,
#         "partner_name": first_doc.partner_name,
#         "grant_id": first_doc.grant_id,
#         "state": first_doc.state,
#         "financial_year": first_doc.financial_year,

#         "month": sorted(
#             list({d.month for d in parent_docs}),
#             key=lambda x: MONTH_ORDER.index(x)
#         ),

#         "total_records": len(parent_docs),
#         "total_utilisation": sum(d.total_utilisation or 0 for d in parent_docs),
#         "total_balance_amount": sum(d.balance_amount or 0 for d in parent_docs),
#         "total_interest_from_bank": sum(d.interest_from_bank or 0 for d in parent_docs),

#         "expense_items": list(expense_summary.values()),
#     }

#     # -----------------------------
#     # Detailed Definition
#     # -----------------------------
#     definition = []

#     for doc in parent_docs:
#         definition.append({
#             **doc,
#             "utilisation_items": parent_items.get(doc.name, [])
#         })

#     # -----------------------------
#     # Final Response
#     # -----------------------------
#     return {
#         "overview": overview,
#         "definition": definition,
#     }




import frappe
from collections import defaultdict

MONTH_ORDER = [
    "April", "May", "June", "July", "August", "September",
    "October", "November", "December",
    "January", "February", "March"
]


def get_expense_summary(items):

    summary = defaultdict(lambda: {
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


@frappe.whitelist(allow_guest=True)
def get_creche_utilisation(
    budget_reference_id=None,
    partner_id=None,
    state=None,
    financial_year=None,
    month=None,
    report_type=None,
):

    # -------------------------------------------------
    # Filters
    # -------------------------------------------------
    filters = {
        k: v for k, v in {
            "budget_reference_id": budget_reference_id,
            "partner_id": partner_id,
            "state": state,
            "financial_year": financial_year,
        }.items() if v
    }

    # -------------------------------------------------
    # Month Filter
    # -------------------------------------------------
    if month:

        if isinstance(month, str) and "," in month:
            month = [m.strip() for m in month.split(",")]

        if isinstance(month, list):

            filters["month"] = [
                "in",
                [m for m in MONTH_ORDER if m in month]
            ]

        elif report_type == "Month wise":

            filters["month"] = month

        elif report_type == "YTD":

            filters["month"] = [
                "in",
                MONTH_ORDER[:MONTH_ORDER.index(month) + 1]
            ]

    # -------------------------------------------------
    # Parent Records
    # -------------------------------------------------
    parent_docs = frappe.get_all(
        "Creche utilisation",
        filters=filters,
        fields=[
            "name",
            "budget_reference_id",
            "budget_reference_name",
            "partner_id",
            "partner_name",
            "grant_id",
            "state",
            "financial_year",
            "month",
            "date",
            "total_utilisation",
            "balance_amount",
            "interest_from_bank",
        ],
        order_by="date desc",
    )

    if not parent_docs:
        return {}

    parent_names = [d.name for d in parent_docs]

    # -------------------------------------------------
    # Child Records
    # -------------------------------------------------
    child_rows = frappe.get_all(
        "Utilisation Items",
        filters={
            "parent": ["in", parent_names],
            "parenttype": "Creche utilisation",
        },
        fields=[
            "parent",
            "type_of_expenses_id",
            "type_of_expenses",
            "budget_main_head",
            "budget_sub_head",
            "total_amount",
        ],
    )

    # -------------------------------------------------
    # Parent Wise Items
    # -------------------------------------------------
    parent_items = defaultdict(list)

    for row in child_rows:

        item = {
            "type_of_expenses_id": row.type_of_expenses_id,
            "type_of_expenses": row.type_of_expenses,
            "budget_main_head": row.budget_main_head,
            "budget_sub_head": row.budget_sub_head,
            "total_amount": row.total_amount or 0,
        }

        parent_items[row.parent].append(item)

    # -------------------------------------------------
    # TOP LEVEL
    # -------------------------------------------------
    all_items = []

    for items in parent_items.values():
        all_items.extend(items)

    overview = {
        "total_records": len(parent_docs),
        "total_utilisation": sum(d.total_utilisation or 0 for d in parent_docs),
        "total_balance_amount": sum(d.balance_amount or 0 for d in parent_docs),
        "total_interest_from_bank": sum(d.interest_from_bank or 0 for d in parent_docs),

        "expense_items": get_expense_summary(all_items)
    }

    # -------------------------------------------------
    # PARTNER LEVEL
    # -------------------------------------------------
    partner_summary = {}

    for doc in parent_docs:

        partner_key = doc.partner_id

        if partner_key not in partner_summary:

            partner_summary[partner_key] = {
                "partner_id": doc.partner_id,
                "partner_name": doc.partner_name,

                "total_records": 0,
                "total_utilisation": 0,
                "total_balance_amount": 0,
                "total_interest_from_bank": 0,

                "expense_items": [],
                "budgets": {},

                "_items": []
            }

        partner = partner_summary[partner_key]

        partner["total_records"] += 1
        partner["total_utilisation"] += doc.total_utilisation or 0
        partner["total_balance_amount"] += doc.balance_amount or 0
        partner["total_interest_from_bank"] += doc.interest_from_bank or 0

        partner["_items"].extend(parent_items.get(doc.name, []))

        # -------------------------------------------------
        # Budget Level
        # -------------------------------------------------
        budget_key = doc.budget_reference_id

        if budget_key not in partner["budgets"]:

            partner["budgets"][budget_key] = {
                "budget_reference_id": doc.budget_reference_id,
                "budget_reference_name": doc.budget_reference_name,
                "grant_id": doc.grant_id,
                "state": doc.state,
                "financial_year": doc.financial_year,

                "total_records": 0,
                "total_utilisation": 0,
                "total_balance_amount": 0,
                "total_interest_from_bank": 0,

                "expense_items": [],
                "months": [],

                "_items": []
            }

        budget = partner["budgets"][budget_key]

        budget["total_records"] += 1
        budget["total_utilisation"] += doc.total_utilisation or 0
        budget["total_balance_amount"] += doc.balance_amount or 0
        budget["total_interest_from_bank"] += doc.interest_from_bank or 0

        budget["_items"].extend(parent_items.get(doc.name, []))

        # -------------------------------------------------
        # Month Level
        # -------------------------------------------------
        month_data = {
            "name": doc.name,
            "month": doc.month,
            "date": doc.date,

            "total_utilisation": doc.total_utilisation,
            "balance_amount": doc.balance_amount,
            "interest_from_bank": doc.interest_from_bank,

            "expense_items": get_expense_summary(
                parent_items.get(doc.name, [])
            ),

            "utilisation_items": parent_items.get(doc.name, [])
        }

        budget["months"].append(month_data)

    # -------------------------------------------------
    # Final Cleanup
    # -------------------------------------------------
    final_partners = []

    for partner in partner_summary.values():

        partner["expense_items"] = get_expense_summary(
            partner["_items"]
        )

        del partner["_items"]

        budgets = []

        for budget in partner["budgets"].values():

            budget["expense_items"] = get_expense_summary(
                budget["_items"]
            )

            del budget["_items"]

            budgets.append(budget)

        partner["budgets"] = budgets

        final_partners.append(partner)

    # -------------------------------------------------
    # Final Response
    # -------------------------------------------------
    return {
        "overview": overview,
        "partners": final_partners
    }
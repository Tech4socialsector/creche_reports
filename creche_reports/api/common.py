import frappe

# @frappe.whitelist(allow_guest=True)
@frappe.whitelist()
def get_all_partners():
    data = frappe.get_list(
        "Creche Partners",
        fields=[
            "name",
            "partner_name",
            "grant_id",
            "state",
        ],
        order_by="name asc"
    )

    return data



# @frappe.whitelist(allow_guest=True)
@frappe.whitelist()
def get_all_budgets():
    return frappe.get_list(
        "Creche Budget",
        fields=[
            "name",
            "budget_reference_name",
            "partner_id",
            "partner_name",
            "grant_id",
            "state",
            "no_of_creches",
        ],
        order_by="name asc"
    )
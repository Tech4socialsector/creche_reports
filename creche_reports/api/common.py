import frappe

@frappe.whitelist(allow_guest=True)
def get_all_partners():
    data = frappe.get_all(
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

import frappe
from frappe.core.doctype.data_import.data_import import import_file


@frappe.whitelist()
def dynamic_import(
    file_url,
    target_doctype
):

    try:

        # -----------------------------------
        # CREATE DATA IMPORT DOC
        # -----------------------------------

        data_import = frappe.get_doc({

            "doctype": "Data Import",

            "reference_doctype":
                target_doctype,

            "import_type":
                "Insert New Records",

            "import_file":
                file_url,

            "mute_emails": 1,

            "submit_after_import": 0

        })

        data_import.insert(
            ignore_permissions=True
        )

        # -----------------------------------
        # RUN IMPORT
        # -----------------------------------

        import_file(
            data_import.name,
            data_import.import_type
        )

        return {
            "status": "success",
            "message":
                "Import Completed Successfully"
        }

    except Exception as e:

        frappe.log_error(
            frappe.get_traceback(),
            "Dynamic Import Error"
        )

        return {
            "status": "error",
            "message": str(e)
        }
    


@frappe.whitelist(allow_guest=True)
def get_all_budgets():

    return frappe.get_all(
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

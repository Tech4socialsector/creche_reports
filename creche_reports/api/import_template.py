import frappe

@frappe.whitelist(allow_guest=True)
def get_all_budget_items():

    return frappe.get_all(
        "Budget and Expense items list",
        fields=[
            "name",
            "budget_main_head",
            "budget_sub_head",
            "type_of_expenses"
        ],
        order_by="name asc"
    )

# ==================================================== Budget Import Template ===============================================================================
import frappe
import json
from openpyxl import Workbook
from openpyxl.styles import Protection
from io import BytesIO


@frappe.whitelist(allow_guest=True)
def download_budget_template(data=None):

    # -----------------------------------
    # CONVERT JSON STRING TO DICT
    # -----------------------------------

    if isinstance(data, str):
        data = json.loads(data)

    # -----------------------------------
    # FETCH BUDGET ITEMS
    # -----------------------------------

    budget_items = frappe.get_all(
        "Budget and Expense items list",
        fields=[
            "name",
            "budget_main_head",
            "budget_sub_head",
            "type_of_expenses"
        ],
        order_by="name asc"
    )

    # -----------------------------------
    # CREATE WORKBOOK
    # -----------------------------------

    wb = Workbook()
    ws = wb.active
    ws.title = "Creche Budget"

    # -----------------------------------
    # HEADERS
    # -----------------------------------

    headers = [
        "Budget reference name",
        "Partner ID",
        "Partner Name",
        "Grant ID",
        "No of creches",
        "State",
        "Financial year",
        "Date of approval",
        "Start Date",
        "End Date",

        # Child Table Fields
        "Type of expenses ID (Budget Items List)",
        "Budget main head (Budget Items List)",
        "Budget sub head (Budget Items List)",
        "Type of expenses (Budget Items List)",
        "Year 1 (Budget Items List)",
        "Year 2 (Budget Items List)",
        "Year 3 (Budget Items List)",
        "Total Amount (Budget Items List)",
        "Notes (Budget Items List)",

        "Total budget"
    ]

    ws.append(headers)

    # -----------------------------------
    # CREATE ROWS
    # -----------------------------------

    first_row = True
    start_child_row = 2
    excel_row = 2

    for item in budget_items:

        row = []

        # -----------------------------------
        # PARENT FIELDS ONLY FIRST ROW
        # -----------------------------------

        if first_row:

            row.extend([
                data.get("budget_reference_name"),
                data.get("partner_id"),
                data.get("partner_name"),
                data.get("grant_id"),
                data.get("no_of_creches"),
                data.get("state"),
                data.get("financial_year"),
                data.get("date_of_approval"),
                data.get("start_date"),
                data.get("end_date")
            ])

            first_row = False

        else:
            row.extend([""] * 10)

        # -----------------------------------
        # YEAR FORMULAS
        # -----------------------------------

        # R column = Total Amount
        year_formula = f'=IF(R{excel_row}="","",R{excel_row}/3)'

        # -----------------------------------
        # CHILD TABLE FIELDS
        # -----------------------------------

        row.extend([
            item.name,
            item.budget_main_head,
            item.budget_sub_head,
            item.type_of_expenses,

            # Formula Fields
            year_formula,
            year_formula,
            year_formula,

            "",  # Total Amount
            ""   # Notes
        ])

        # -----------------------------------
        # TOTAL BUDGET FORMULA
        # -----------------------------------

        total_budget_formula = (
            f'=SUM(R{start_child_row}:R{start_child_row + len(budget_items)-1})'
        )

        if excel_row == 2:
            row.append(total_budget_formula)
        else:
            row.append("")

        ws.append(row)

        excel_row += 1

    # -----------------------------------
    # UNLOCK ALL CELLS FIRST
    # -----------------------------------

    for row_cells in ws.iter_rows():
        for cell in row_cells:
            cell.protection = Protection(locked=False)

    # -----------------------------------
    # HEADER ROW READ ONLY
    # -----------------------------------

    for cell in ws[1]:
        cell.protection = Protection(locked=True)

    # -----------------------------------
    # PARENT COLUMNS READ ONLY
    # -----------------------------------

    parent_columns = [
        "A", "B", "C", "D", "E",
        "F", "G", "H", "I", "J"
    ]

    for col in parent_columns:
        for row_no in range(2, excel_row):
            ws[f"{col}{row_no}"].protection = Protection(
                locked=True
            )

    # -----------------------------------
    # CHILD MASTER FIELDS READ ONLY
    # -----------------------------------

    child_master_columns = ["K", "L", "M", "N"]

    for col in child_master_columns:
        for row_no in range(2, excel_row):
            ws[f"{col}{row_no}"].protection = Protection(
                locked=True
            )

    # -----------------------------------
    # FORMULA COLUMNS READ ONLY
    # -----------------------------------

    formula_columns = ["O", "P", "Q", "T"]

    for col in formula_columns:
        for row_no in range(2, excel_row):
            ws[f"{col}{row_no}"].protection = Protection(
                locked=True
            )

    # -----------------------------------
    # EDITABLE COLUMNS
    # -----------------------------------

    # R = Total Amount
    # S = Notes

    # -----------------------------------
    # ENABLE SHEET PROTECTION
    # -----------------------------------

    ws.protection.sheet = True
    ws.protection.password = "1234"

    # -----------------------------------
    # AUTO COLUMN WIDTH
    # -----------------------------------

    for column_cells in ws.columns:

        max_length = max(
            len(str(cell.value or ""))
            for cell in column_cells
        )

        column_letter = column_cells[0].column_letter

        ws.column_dimensions[column_letter].width = max_length + 5

    # -----------------------------------
    # SAVE FILE
    # -----------------------------------

    file_stream = BytesIO()
    wb.save(file_stream)

    frappe.response["filename"] = "creche_budget_template.xlsx"
    frappe.response["filecontent"] = file_stream.getvalue()
    frappe.response["type"] = "binary"



import frappe
import json
from openpyxl import Workbook
from openpyxl.styles import Protection
from io import BytesIO


@frappe.whitelist(allow_guest=True)
def download_utilisation_template(data=None):

    # -----------------------------------
    # CONVERT JSON STRING TO DICT
    # -----------------------------------

    if isinstance(data, str):
        data = json.loads(data)

    # -----------------------------------
    # FETCH UTILISATION ITEMS
    # -----------------------------------

    utilisation_items = frappe.get_all(
        "Budget and Expense items list",
        fields=[
            "name",
            "budget_main_head",
            "budget_sub_head",
            "type_of_expenses"
        ],
        order_by="name asc"
    )

    # -----------------------------------
    # CREATE WORKBOOK
    # -----------------------------------

    wb = Workbook()
    ws = wb.active
    ws.title = "Creche Utilisation"

    # -----------------------------------
    # HEADERS
    # -----------------------------------

    headers = [

        # Parent Fields
        "Budget reference name",
        "Partner ID",
        "Partner Name",
        "Grant ID",
        "State",
        "No of creches",
        "Month",
        "Financial year",
        "Date",

        # Child Table Fields
        "Type of expenses ID (Utilisation Items List)",
        "Budget main head (Utilisation Items List)",
        "Budget sub head (Utilisation Items List)",
        "Type of expenses (Utilisation Items List)",
        "Total Amount (Utilisation Items List)",
        "Notes (Utilisation Items List)",

        # Parent Fields After Child Table
        "Total Utilisation",
        "Bank + Cash Balance as at end of month reported",
        "Declaration"
    ]

    ws.append(headers)

    # -----------------------------------
    # CREATE ROWS
    # -----------------------------------

    first_row = True
    start_child_row = 2
    excel_row = 2

    for item in utilisation_items:

        row = []

        # -----------------------------------
        # PARENT FIELDS ONLY FIRST ROW
        # -----------------------------------

        if first_row:

            row.extend([
                data.get("budget_reference_name"),
                data.get("partner_id"),
                data.get("partner_name"),
                data.get("grant_id"),
                data.get("state"),
                data.get("no_of_creches"),
                data.get("month"),
                data.get("financial_year"),
                data.get("date")
            ])

            first_row = False

        else:
            row.extend([""] * 9)

        # -----------------------------------
        # CHILD TABLE FIELDS
        # -----------------------------------

        row.extend([
            item.name,
            item.budget_main_head,
            item.budget_sub_head,
            item.type_of_expenses,

            0,   # Total Amount mandatory
            ""   # Notes
        ])

        # -----------------------------------
        # FINAL PARENT FIELDS
        # -----------------------------------

        if excel_row == 2:

            # Total Utilisation Formula
            total_utilisation_formula = (
                f'=SUM(N{start_child_row}:N{start_child_row + len(utilisation_items)-1})'
            )

            row.extend([
                total_utilisation_formula,
                "",  # Editable Bank + Cash Balance
                0    # Declaration always 0
            ])

        else:
            row.extend([
                "",
                "",
                ""
            ])

        ws.append(row)

        excel_row += 1

    # -----------------------------------
    # UNLOCK ALL CELLS FIRST
    # -----------------------------------

    for row_cells in ws.iter_rows():
        for cell in row_cells:
            cell.protection = Protection(locked=False)

    # -----------------------------------
    # HEADER ROW READ ONLY
    # -----------------------------------

    for cell in ws[1]:
        cell.protection = Protection(locked=True)

    # -----------------------------------
    # PARENT COLUMNS READ ONLY
    # -----------------------------------

    parent_columns = [
        "A", "B", "C", "D", "E",
        "F", "G", "H", "I",
        "P", "R"
    ]

    for col in parent_columns:
        for row_no in range(2, excel_row):
            ws[f"{col}{row_no}"].protection = Protection(
                locked=True
            )

    # -----------------------------------
    # CHILD MASTER FIELDS READ ONLY
    # -----------------------------------

    child_master_columns = ["J", "K", "L", "M"]

    for col in child_master_columns:
        for row_no in range(2, excel_row):
            ws[f"{col}{row_no}"].protection = Protection(
                locked=True
            )

    # -----------------------------------
    # TOTAL UTILISATION / DECLARATION
    # -----------------------------------

    for row_no in range(2, excel_row):

        # Total Utilisation Read Only
        ws[f"P{row_no}"].protection = Protection(
            locked=True
        )

        # Declaration Read Only
        ws[f"R{row_no}"].protection = Protection(
            locked=True
        )

        # Q = Bank + Cash Balance Editable
        ws[f"Q{row_no}"].protection = Protection(
            locked=False
        )

    # -----------------------------------
    # ENABLE SHEET PROTECTION
    # -----------------------------------

    ws.protection.sheet = True
    ws.protection.password = "1234"

    # -----------------------------------
    # AUTO WIDTH
    # -----------------------------------

    for column_cells in ws.columns:

        max_length = max(
            len(str(cell.value or ""))
            for cell in column_cells
        )

        column_letter = column_cells[0].column_letter

        ws.column_dimensions[column_letter].width = max_length + 5

    # -----------------------------------
    # SAVE FILE
    # -----------------------------------

    file_stream = BytesIO()
    wb.save(file_stream)

    frappe.response["filename"] = "creche_utilisation_template.xlsx"
    frappe.response["filecontent"] = file_stream.getvalue()
    frappe.response["type"] = "binary"



    


    
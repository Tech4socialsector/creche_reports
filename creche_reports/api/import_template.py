import frappe
import frappe
import json
from openpyxl import Workbook
from openpyxl.styles import Protection
from io import BytesIO

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
@frappe.whitelist(allow_guest=True)
def download_budget_template(data=None):

    if isinstance(data, str):
        data = json.loads(data)

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

    wb = Workbook()
    ws = wb.active
    ws.title = "Creche Budget"

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

    first_row = True
    start_child_row = 2
    excel_row = 2

    for item in budget_items:

        row = []

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

        # Total Amount = Year1 + Year2 + Year3
        total_amount_formula = f'=SUM(O{excel_row}:Q{excel_row})'

        row.extend([
            item.name,
            item.budget_main_head,
            item.budget_sub_head,
            item.type_of_expenses,

            "",  # Year 1
            "",  # Year 2
            "",  # Year 3

            total_amount_formula,
            ""   # Notes
        ])

        total_budget_formula = (
            f'=SUM(R{start_child_row}:R{start_child_row + len(budget_items)-1})'
        )

        if excel_row == 2:
            row.append(total_budget_formula)
        else:
            row.append("")

        ws.append(row)

        excel_row += 1

    # Unlock all cells
    for row_cells in ws.iter_rows():
        for cell in row_cells:
            cell.protection = Protection(locked=False)

    # Lock header
    for cell in ws[1]:
        cell.protection = Protection(locked=True)

    # Lock parent fields
    parent_columns = [
        "A", "B", "C", "D", "E",
        "F", "G", "H", "I", "J"
    ]

    for col in parent_columns:
        for row_no in range(2, excel_row):
            ws[f"{col}{row_no}"].protection = Protection(locked=True)

    # Lock child master fields
    child_master_columns = ["K", "L", "M", "N"]

    for col in child_master_columns:
        for row_no in range(2, excel_row):
            ws[f"{col}{row_no}"].protection = Protection(locked=True)

    # Lock formula columns
    formula_columns = ["R", "T"]

    for col in formula_columns:
        for row_no in range(2, excel_row):
            ws[f"{col}{row_no}"].protection = Protection(locked=True)

    # Editable:
    # O = Year 1
    # P = Year 2
    # Q = Year 3
    # S = Notes

    ws.protection.sheet = True
    ws.protection.password = "1234"

    for column_cells in ws.columns:

        max_length = max(
            len(str(cell.value or ""))
            for cell in column_cells
        )

        column_letter = column_cells[0].column_letter

        ws.column_dimensions[column_letter].width = max_length + 5

    file_stream = BytesIO()
    wb.save(file_stream)

    frappe.response["filename"] = "creche_budget_template.xlsx"
    frappe.response["filecontent"] = file_stream.getvalue()
    frappe.response["type"] = "binary"
# ==================================================== Utilisation Import Template ===============================================================================

# import frappe

# @frappe.whitelist(allow_guest=True)
# def download_utilisation_template(data=None):

#     import json
#     from io import BytesIO
#     from openpyxl import Workbook
#     from openpyxl.styles import Protection

#     if isinstance(data, str):
#         data = json.loads(data)

#     items = frappe.get_all(
#         "Budget and Expense items list",
#         fields=[
#             "name",
#             "budget_main_head",
#             "budget_sub_head",
#             "type_of_expenses"
#         ],
#         order_by="name asc"
#     )

#     wb = Workbook()
#     ws = wb.active
#     ws.title = "Creche Utilisation"

#     headers = [
#         "Budget reference ID",
#         "Budget reference Name",
#         "Partner ID",
#         "Partner Name",
#         "Grant ID",
#         "State",
#         "No of creches",
#         "Month",
#         "Financial year",
#         "Date",

#         "Type of expenses ID (Utilisation Items List)",
#         "Budget main head (Utilisation Items List)",
#         "Budget sub head (Utilisation Items List)",
#         "Type of expenses (Utilisation Items List)",

#         "Total Amount (Utilisation Items List)",
#         "Notes (Utilisation Items List)",

#         "Total Utilisation",
#         "Bank + Cash Balance as at end of month reported",
#         "Interest from Bank"
#         "Declaration"
#     ]

#     ws.append(headers)

#     parent_data = [
#         data.get("budget_reference_id"),
#         data.get("budget_reference_name"),
#         data.get("partner_id"),
#         data.get("partner_name"),
#         data.get("grant_id"),
#         data.get("state"),
#         data.get("no_of_creches"),
#         data.get("month"),
#         data.get("financial_year"),
#         data.get("date")
#     ]

#     start_row = 2
#     end_row = start_row + len(items) - 1

#     for idx, item in enumerate(items, start=start_row):

#         row = []

#         row.extend(parent_data if idx == start_row else [""] * 10)

#         row.extend([
#             item.name,
#             item.budget_main_head,
#             item.budget_sub_head,
#             item.type_of_expenses,
#         ])

#         # Editable Total Amount
#         row.append(0)

#         # Notes
#         row.append("")

#         # Final columns
#         if idx == start_row:
#             row.extend([
#                 f"=SUM(O{start_row}:O{end_row})",
#                 "",
#                 0
#             ])
#         else:
#             row.extend(["", "", ""])

#         ws.append(row)

#     # Unlock all cells
#     for row in ws.iter_rows():
#         for cell in row:
#             cell.protection = Protection(locked=False)

#     # Lock header row
#     for cell in ws[1]:
#         cell.protection = Protection(locked=True)

#     # Read-only columns
#     readonly_columns = [
#         "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
#         "K", "L", "M", "N",
#         "Q"
#     ]

#     for col in readonly_columns:
#         for row_no in range(2, end_row + 1):
#             ws[f"{col}{row_no}"].protection = Protection(locked=True)

#     ws.protection.sheet = True
#     ws.protection.password = "1234"

#     # Auto width
#     for col in ws.columns:
#         width = max(len(str(cell.value or "")) for cell in col) + 5
#         ws.column_dimensions[col[0].column_letter].width = width

#     output = BytesIO()
#     wb.save(output)

#     frappe.response["filename"] = "creche_utilisation_template.xlsx"
#     frappe.response["filecontent"] = output.getvalue()
#     frappe.response["type"] = "binary"




import frappe


@frappe.whitelist(allow_guest=True)
def download_utilisation_template(data=None):

    import json
    from io import BytesIO
    from openpyxl import Workbook
    from openpyxl.styles import Protection

    if isinstance(data, str):
        data = json.loads(data)

    items = frappe.get_all(
        "Budget and Expense items list",
        fields=[
            "name",
            "budget_main_head",
            "budget_sub_head",
            "type_of_expenses"
        ],
        order_by="name asc"
    )

    wb = Workbook()
    ws = wb.active
    ws.title = "Creche Utilisation"

    headers = [
        "Budget reference ID",
        "Budget reference Name",
        "Partner ID",
        "Partner Name",
        "Grant ID",
        "State",
        "No of creches",
        "Month",
        "Financial year",
        "Date",

        "Type of expenses ID (Utilisation Items List)",
        "Budget main head (Utilisation Items List)",
        "Budget sub head (Utilisation Items List)",
        "Type of expenses (Utilisation Items List)",

        "Total Amount (Utilisation Items List)",
        "Notes (Utilisation Items List)",

        "Total Utilisation",
        "Bank + Cash Balance as at end of month reported",
        "Interest from Bank",
        "Declaration"
    ]

    ws.append(headers)

    parent_data = [
        data.get("budget_reference_id"),
        data.get("budget_reference_name"),
        data.get("partner_id"),
        data.get("partner_name"),
        data.get("grant_id"),
        data.get("state"),
        data.get("no_of_creches"),
        data.get("month"),
        data.get("financial_year"),
        data.get("date")
    ]

    start_row = 2
    end_row = start_row + len(items) - 1

    for idx, item in enumerate(items, start=start_row):

        row = []

        # Parent data only in first row
        row.extend(parent_data if idx == start_row else [""] * 10)

        # Child table values
        row.extend([
            item.name,
            item.budget_main_head,
            item.budget_sub_head,
            item.type_of_expenses,
        ])

        # Editable Total Amount
        row.append(0)

        # Notes
        row.append("")

        # Final columns
        if idx == start_row:
            row.extend([
                f"=SUM(O{start_row}:O{end_row})",  # Total Utilisation
                0,                                # Bank + Cash Balance
                0,                                # Interest from Bank
                0                                # Declaration
            ])
        else:
            row.extend(["", "", "", ""])

        ws.append(row)

    # Unlock all cells
    for row in ws.iter_rows():
        for cell in row:
            cell.protection = Protection(locked=False)

    # Lock header row
    for cell in ws[1]:
        cell.protection = Protection(locked=True)

    # Read-only columns
    readonly_columns = [
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
        "K", "L", "M", "N",
        "Q"
    ]

    for col in readonly_columns:
        for row_no in range(2, end_row + 1):
            ws[f"{col}{row_no}"].protection = Protection(locked=True)

    # Protect sheet
    ws.protection.sheet = True
    ws.protection.password = "1234"

    # Auto column width
    for col in ws.columns:
        width = max(len(str(cell.value or "")) for cell in col) + 5
        ws.column_dimensions[col[0].column_letter].width = width

    output = BytesIO()
    wb.save(output)

    frappe.response["filename"] = "creche_utilisation_template.xlsx"
    frappe.response["filecontent"] = output.getvalue()
    frappe.response["type"] = "binary"
    
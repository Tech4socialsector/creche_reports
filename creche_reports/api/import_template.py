import frappe
import frappe
import json
from openpyxl import Workbook
from openpyxl.styles import Protection
from io import BytesIO

# @frappe.whitelist(allow_guest=True)
# def get_all_budget_items():

#     return frappe.get_all(
#         "Budget and Expense items list",
#         fields=[
#             "name",
#             "budget_main_head",
#             "budget_sub_head",
#             "type_of_expenses"
#         ],
#         order_by="name asc"
#     )


@frappe.whitelist(allow_guest=True)
def get_all_budget_items():

    # Get main head sequence mapping
    main_head_sequence = {
        d.name: (d.sequence_id or 0)
        for d in frappe.get_all(
            "Budget main head",
            fields=["name", "sequence_id"]
        )
    }

    # Fetch budget items
    budget_items = frappe.get_all(
        "Budget and Expense items list",
        fields=[
            "name",
            "budget_main_head",
            "budget_sub_head",
            "type_of_expenses"
        ]
    )

    # Sort by:
    # 1. Main Head Sequence
    # 2. Sub Head
    # 3. Item Name
    return sorted(
        budget_items,
        key=lambda d: (
            main_head_sequence.get(d.get("budget_main_head"), 0),
            d.get("budget_sub_head") or "",
            d.get("name") or ""
        )
    )

# ==================================================== Budget Import Template ===============================================================================
# @frappe.whitelist(allow_guest=True)
# def download_budget_template(data=None):

#     if isinstance(data, str):
#         data = json.loads(data)

#     budget_items = frappe.get_all(
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
#     ws.title = "Creche Budget"

#     headers = [
#         "Budget reference name",
#         "Partner ID",
#         "Partner Name",
#         "Grant ID",
#         "No of creches",
#         "State",
#         "Financial year",
#         "Date of approval",
#         "Start Date",
#         "End Date",

#         "Type of expenses ID (Budget Items List)",
#         "Budget main head (Budget Items List)",
#         "Budget sub head (Budget Items List)",
#         "Type of expenses (Budget Items List)",
#         "Year 1 (Budget Items List)",
#         "Year 2 (Budget Items List)",
#         "Year 3 (Budget Items List)",
#         "Total Amount (Budget Items List)",
#         "Notes (Budget Items List)",

#         "Total budget"
#     ]

#     ws.append(headers)

#     first_row = True
#     start_child_row = 2
#     excel_row = 2

#     for item in budget_items:

#         row = []

#         if first_row:

#             row.extend([
#                 data.get("budget_reference_name"),
#                 data.get("partner_id"),
#                 data.get("partner_name"),
#                 data.get("grant_id"),
#                 data.get("no_of_creches"),
#                 data.get("state"),
#                 data.get("financial_year"),
#                 data.get("date_of_approval"),
#                 data.get("start_date"),
#                 data.get("end_date")
#             ])

#             first_row = False

#         else:
#             row.extend([""] * 10)

#         # Total Amount = Year1 + Year2 + Year3
#         total_amount_formula = f'=SUM(O{excel_row}:Q{excel_row})'

#         row.extend([
#             item.name,
#             item.budget_main_head,
#             item.budget_sub_head,
#             item.type_of_expenses,

#             "",  # Year 1
#             "",  # Year 2
#             "",  # Year 3

#             total_amount_formula,
#             ""   # Notes
#         ])

#         total_budget_formula = (
#             f'=SUM(R{start_child_row}:R{start_child_row + len(budget_items)-1})'
#         )

#         if excel_row == 2:
#             row.append(total_budget_formula)
#         else:
#             row.append("")

#         ws.append(row)

#         excel_row += 1

#     # Unlock all cells
#     for row_cells in ws.iter_rows():
#         for cell in row_cells:
#             cell.protection = Protection(locked=False)

#     # Lock header
#     for cell in ws[1]:
#         cell.protection = Protection(locked=True)

#     # Lock parent fields
#     parent_columns = [
#         "A", "B", "C", "D", "E",
#         "F", "G", "H", "I", "J"
#     ]

#     for col in parent_columns:
#         for row_no in range(2, excel_row):
#             ws[f"{col}{row_no}"].protection = Protection(locked=True)

#     # Lock child master fields
#     child_master_columns = ["K", "L", "M", "N"]

#     for col in child_master_columns:
#         for row_no in range(2, excel_row):
#             ws[f"{col}{row_no}"].protection = Protection(locked=True)

#     # Lock formula columns
#     formula_columns = ["R", "T"]

#     for col in formula_columns:
#         for row_no in range(2, excel_row):
#             ws[f"{col}{row_no}"].protection = Protection(locked=True)

#     # Editable:
#     # O = Year 1
#     # P = Year 2
#     # Q = Year 3
#     # S = Notes

#     ws.protection.sheet = True
#     ws.protection.password = "1234"

#     for column_cells in ws.columns:

#         max_length = max(
#             len(str(cell.value or ""))
#             for cell in column_cells
#         )

#         column_letter = column_cells[0].column_letter

#         ws.column_dimensions[column_letter].width = max_length + 5

#     file_stream = BytesIO()
#     wb.save(file_stream)

#     frappe.response["filename"] = "creche_budget_template.xlsx"
#     frappe.response["filecontent"] = file_stream.getvalue()
#     frappe.response["type"] = "binary"



# @frappe.whitelist(allow_guest=True)
# def download_budget_template(data=None):

#     import json

#     from io import BytesIO

#     from openpyxl import Workbook
#     from openpyxl.styles import (
#         Font,
#         PatternFill
#     )

#     if isinstance(data, str):
#         data = json.loads(data)

#     data = data or {}

#     # --------------------------------------------------
#     # GET MAIN HEAD SEQUENCE
#     # --------------------------------------------------

#     main_head_sequence = {
#         d.name: d.sequence_id or 0
#         for d in frappe.get_all(
#             "Budget main head",
#             fields=["name", "sequence_id"]
#         )
#     }

#     # --------------------------------------------------
#     # GET ITEMS
#     # --------------------------------------------------

#     budget_items = frappe.get_all(
#         "Budget and Expense items list",
#         fields=[
#             "name",
#             "budget_main_head",
#             "budget_sub_head",
#             "type_of_expenses"
#         ]
#     )

#     # --------------------------------------------------
#     # SORT ITEMS
#     # --------------------------------------------------

#     budget_items = sorted(
#         budget_items,
#         key=lambda d: (
#             main_head_sequence.get(
#                 d.budget_main_head, 0
#             ),
#             d.budget_sub_head or "",
#             d.name or ""
#         )
#     )

#     # --------------------------------------------------
#     # CREATE WORKBOOK
#     # --------------------------------------------------

#     wb = Workbook()

#     ws = wb.active
#     ws.title = "Creche Budget"

#     # --------------------------------------------------
#     # HEADERS
#     # --------------------------------------------------

#     headers = [

#         "Budget reference name",
#         "Partner ID",
#         "Partner Name",
#         "Grant ID",
#         "No of creches",
#         "State",
#         "Financial year",
#         "Date of approval",
#         "Start Date",
#         "End Date",

#         "Type of expenses ID (Budget Items List)",
#         "Budget main head (Budget Items List)",
#         "Budget sub head (Budget Items List)",
#         "Type of expenses (Budget Items List)",

#         "Year 1 (Budget Items List)",
#         "Year 2 (Budget Items List)",
#         "Year 3 (Budget Items List)",

#         "Total Amount (Budget Items List)",

#         "Notes (Budget Items List)",

#         "Total budget"
#     ]

#     ws.append(headers)

#     # --------------------------------------------------
#     # HEADER STYLE
#     # --------------------------------------------------

#     header_fill = PatternFill(
#         start_color="D9EAF7",
#         end_color="D9EAF7",
#         fill_type="solid"
#     )

#     for cell in ws[1]:

#         cell.font = Font(bold=True)
#         cell.fill = header_fill

#     # --------------------------------------------------
#     # ADD ROWS
#     # --------------------------------------------------

#     for idx, item in enumerate(
#         budget_items,
#         start=2
#     ):

#         row = [

#             # Parent fields only first row
#             data.get("budget_reference_name")
#             if idx == 2 else "",

#             data.get("partner_id")
#             if idx == 2 else "",

#             data.get("partner_name")
#             if idx == 2 else "",

#             data.get("grant_id")
#             if idx == 2 else "",

#             data.get("no_of_creches")
#             if idx == 2 else "",

#             data.get("state")
#             if idx == 2 else "",

#             data.get("financial_year")
#             if idx == 2 else "",

#             data.get("date_of_approval")
#             if idx == 2 else "",

#             data.get("start_date")
#             if idx == 2 else "",

#             data.get("end_date")
#             if idx == 2 else "",

#             # Child table fields
#             item.name,
#             item.budget_main_head,
#             item.budget_sub_head,
#             item.type_of_expenses,

#             # Editable currency fields
#             0.0,
#             0.0,
#             0.0,

#             # Total Amount
#             0.0,

#             # Notes
#             "",

#             # Total Budget
#             0.0 if idx == 2 else ""
#         ]

#         ws.append(row)

#     # --------------------------------------------------
#     # TOTAL COLUMN STYLE
#     # --------------------------------------------------

#     total_fill = PatternFill(
#         start_color="E8F4EA",
#         end_color="E8F4EA",
#         fill_type="solid"
#     )

#     currency_columns = [
#         "O", "P", "Q", "R", "T"
#     ]

#     for col in currency_columns:

#         for row_no in range(
#             2,
#             ws.max_row + 1
#         ):

#             cell = ws[f"{col}{row_no}"]

#             cell.fill = total_fill
#             cell.number_format = '#,##0.00'

#     # --------------------------------------------------
#     # FILTERS + FREEZE
#     # --------------------------------------------------

#     ws.auto_filter.ref = ws.dimensions
#     ws.freeze_panes = "A2"

#     # --------------------------------------------------
#     # AUTO WIDTH
#     # --------------------------------------------------

#     for column in ws.columns:

#         length = max(
#             len(str(cell.value or ""))
#             for cell in column
#         )

#         ws.column_dimensions[
#             column[0].column_letter
#         ].width = min(length + 5, 50)

#     # --------------------------------------------------
#     # HIDE COLUMNS
#     # --------------------------------------------------

#     hidden_columns = [

#         "B",  # Partner ID
#         "K",  # Expense Item ID
#         "S",  # Notes
#         "T"   # Total Budget
#     ]

#     for col in hidden_columns:

#         ws.column_dimensions[
#             col
#         ].hidden = True

#     # --------------------------------------------------
#     # FILE NAME
#     # --------------------------------------------------

#     filename = frappe.scrub(
#         data.get(
#             "budget_reference_name"
#         ) or "budget"
#     ).replace("-", "_")

#     # --------------------------------------------------
#     # DOWNLOAD
#     # --------------------------------------------------

#     output = BytesIO()

#     wb.save(output)

#     frappe.response["filename"] = (
#         f"{filename}_creche_budget_template.xlsx"
#     )

#     frappe.response["filecontent"] = (
#         output.getvalue()
#     )

#     frappe.response["type"] = "binary"


# @frappe.whitelist(allow_guest=True)
# def download_budget_template(data=None):

#     import json
#     from io import BytesIO
#     from openpyxl import Workbook
#     from openpyxl.styles import Font, PatternFill

#     if isinstance(data, str):
#         data = json.loads(data)

#     # --------------------------------------------------
#     # GET MAIN HEAD SEQUENCE
#     # --------------------------------------------------

#     main_head_sequence = {
#         d.name: d.sequence_id or 0
#         for d in frappe.get_all(
#             "Budget main head",
#             fields=["name", "sequence_id"]
#         )
#     }

#     # --------------------------------------------------
#     # GET ITEMS
#     # --------------------------------------------------

#     budget_items = frappe.get_all(
#         "Budget and Expense items list",
#         fields=[
#             "name",
#             "budget_main_head",
#             "budget_sub_head",
#             "type_of_expenses"
#         ]
#     )

#     # --------------------------------------------------
#     # SORT ITEMS
#     # --------------------------------------------------

#     budget_items = sorted(
#         budget_items,
#         key=lambda d: (
#             main_head_sequence.get(d.budget_main_head, 0),
#             d.budget_sub_head or "",
#             d.name or ""
#         )
#     )

#     # --------------------------------------------------
#     # CREATE WORKBOOK
#     # --------------------------------------------------

#     wb = Workbook()
#     ws = wb.active
#     ws.title = "Creche Budget"

#     headers = [
#        "Budget reference name",
#         "Partner ID",
#         "Partner Name",
#         "Grant ID",
#         "No of creches",
#         "State",
#         "Financial year",
#         "Date of approval",
#         "Start Date",
#         "End Date",

#         "Type of expenses ID (Budget Items List)",
#         "Budget main head (Budget Items List)",
#         "Budget sub head (Budget Items List)",
#         "Type of expenses (Budget Items List)",
#         "Year 1 (Budget Items List)",
#         "Year 2 (Budget Items List)",
#         "Year 3 (Budget Items List)",
#         "Total Amount (Budget Items List)",
#         "Notes (Budget Items List)",
#         "Total budget"
#     ]

#     ws.append(headers)

#     # --------------------------------------------------
#     # HEADER STYLE
#     # --------------------------------------------------

#     header_fill = PatternFill(
#         start_color="D9EAF7",
#         end_color="D9EAF7",
#         fill_type="solid"
#     )

#     for cell in ws[1]:
#         cell.font = Font(bold=True)
#         cell.fill = header_fill

#     # --------------------------------------------------
#     # ADD ROWS
#     # --------------------------------------------------

#     start_row = 2

#     for idx, item in enumerate(budget_items, start=2):

#         row = [

#             data.get("budget_reference_name") if idx == 2 else "",
#             data.get("partner_id") if idx == 2 else "",
#             data.get("partner_name") if idx == 2 else "",
#             data.get("grant_id") if idx == 2 else "",
#             data.get("no_of_creches") if idx == 2 else "",
#             data.get("state") if idx == 2 else "",
#             data.get("financial_year") if idx == 2 else "",
#             data.get("date_of_approval") if idx == 2 else "",
#             data.get("start_date") if idx == 2 else "",
#             data.get("end_date") if idx == 2 else "",

#             item.name,
#             item.budget_main_head,
#             item.budget_sub_head,
#             item.type_of_expenses,

#             0,  # Year 1
#             0,  # Year 2
#             0,  # Year 3

#             f'=SUM(O{idx}:Q{idx})',

#             "",  # Notes

#             f'=SUM(R{start_row}:R{len(budget_items)+1})'
#             if idx == 2 else 0
#         ]

#         ws.append(row)

#     # --------------------------------------------------
#     # TOTAL AMOUNT COLUMN COLOR
#     # --------------------------------------------------

#     total_fill = PatternFill(
#         start_color="E8F4EA",
#         end_color="E8F4EA",
#         fill_type="solid"
#     )

#     for row in range(2, ws.max_row + 1):
#         ws[f"R{row}"].fill = total_fill

#     # --------------------------------------------------
#     # FILTERS + FREEZE
#     # --------------------------------------------------

#     ws.auto_filter.ref = ws.dimensions
#     ws.freeze_panes = "A2"

#     # --------------------------------------------------
#     # AUTO WIDTH
#     # --------------------------------------------------

#     for column in ws.columns:

#         length = max(
#             len(str(cell.value or ""))
#             for cell in column
#         )

#         ws.column_dimensions[
#             column[0].column_letter
#         ].width = min(length + 5, 50)

#     # --------------------------------------------------
#     # HIDE COLUMNS
#     # --------------------------------------------------

#     hidden_columns = [
#         "B",  # Partner ID
#         "K",  # Type of expenses ID
#         "S",  # Notes
#         "T"   # Total budget
#     ]

#     for col in hidden_columns:
#         ws.column_dimensions[col].hidden = True

#     # --------------------------------------------------
#     # FILE NAME
#     # --------------------------------------------------

#     filename = frappe.scrub(
#         data.get("budget_reference_name") or "budget"
#     ).replace("-", "_")

#     # --------------------------------------------------
#     # DOWNLOAD
#     # --------------------------------------------------

#     output = BytesIO()
#     wb.save(output)

#     frappe.response["filename"] = (
#         f"{filename}_creche_budget_template.xlsx"
#     )

#     frappe.response["filecontent"] = output.getvalue()
#     frappe.response["type"] = "binary"






# @frappe.whitelist(allow_guest=True)
# def download_budget_template(data=None):

#     import json
#     from io import BytesIO
#     from openpyxl import Workbook
#     from openpyxl.styles import Font, PatternFill

#     # --------------------------------------------------
#     # PARSE DATA
#     # --------------------------------------------------

#     if isinstance(data, str):
#         data = json.loads(data)

#     data = data or {}

#     # --------------------------------------------------
#     # GET MAIN HEAD SEQUENCE
#     # --------------------------------------------------

#     main_head_sequence = {
#         d.name: d.sequence_id or 0
#         for d in frappe.get_all(
#             "Budget main head",
#             fields=["name", "sequence_id"]
#         )
#     }

#     # --------------------------------------------------
#     # GET BUDGET ITEMS
#     # --------------------------------------------------

#     budget_items = frappe.get_all(
#         "Budget and Expense items list",
#         fields=[
#             "name",
#             "budget_main_head",
#             "budget_sub_head",
#             "type_of_expenses"
#         ]
#     )

#     # --------------------------------------------------
#     # SORT ITEMS
#     # --------------------------------------------------

#     budget_items = sorted(
#         budget_items,
#         key=lambda d: (
#             main_head_sequence.get(
#                 d.get("budget_main_head"), 0
#             ),
#             d.get("budget_sub_head") or "",
#             d.get("name") or ""
#         )
#     )

#     # --------------------------------------------------
#     # CREATE WORKBOOK
#     # --------------------------------------------------

#     wb = Workbook()
#     ws = wb.active
#     ws.title = "Creche Budget"

#     # --------------------------------------------------
#     # HEADERS
#     # --------------------------------------------------

#     headers = [

#         "Budget reference name",
#         "Partner ID",
#         "Partner Name",
#         "Grant ID",
#         "No of creches",
#         "State",
#         "Financial year",
#         "Date of approval",
#         "Start Date",
#         "End Date",

#         "Type of expenses ID (Budget Items List)",
#         "Budget main head (Budget Items List)",
#         "Budget sub head (Budget Items List)",
#         "Type of expenses (Budget Items List)",

#         "Year 1 (Budget Items List)",
#         "Year 2 (Budget Items List)",
#         "Year 3 (Budget Items List)",

#         "Total Amount (Budget Items List)",
#         "Notes (Budget Items List)",

#         "Total budget"
#     ]

#     ws.append(headers)

#     # --------------------------------------------------
#     # HEADER STYLE
#     # --------------------------------------------------

#     header_fill = PatternFill(
#         start_color="D9EAF7",
#         end_color="D9EAF7",
#         fill_type="solid"
#     )

#     for cell in ws[1]:

#         cell.font = Font(bold=True)
#         cell.fill = header_fill

#     # --------------------------------------------------
#     # TOTAL BUDGET FORMULA
#     # --------------------------------------------------

#     total_budget_formula = (
#         f"=SUM(R2:R{len(budget_items)+1})"
#     )

#     # --------------------------------------------------
#     # ADD DATA ROWS
#     # --------------------------------------------------

#     for idx, item in enumerate(budget_items, start=2):

#         row = [

#             # ------------------------------------------
#             # PARENT FIELDS
#             # ------------------------------------------

#             data.get("budget_reference_name")
#             if idx == 2 else "",

#             data.get("partner_id")
#             if idx == 2 else "",

#             data.get("partner_name")
#             if idx == 2 else "",

#             data.get("grant_id")
#             if idx == 2 else "",

#             data.get("no_of_creches")
#             if idx == 2 else "",

#             data.get("state")
#             if idx == 2 else "",

#             data.get("financial_year")
#             if idx == 2 else "",

#             data.get("date_of_approval")
#             if idx == 2 else "",

#             data.get("start_date")
#             if idx == 2 else "",

#             data.get("end_date")
#             if idx == 2 else "",

#             # ------------------------------------------
#             # CHILD TABLE FIELDS
#             # ------------------------------------------

#             item.get("name"),

#             item.get("budget_main_head"),

#             item.get("budget_sub_head"),

#             item.get("type_of_expenses"),

#             # ------------------------------------------
#             # YEAR VALUES
#             # ------------------------------------------

#             0,  # Year 1  -> O Column

#             0,  # Year 2  -> P Column

#             0,  # Year 3  -> Q Column

#             # ------------------------------------------
#             # TOTAL AMOUNT
#             # SUM OF YEAR 1 + YEAR 2 + YEAR 3
#             # ------------------------------------------

#             f"=SUM(O{idx}:Q{idx})",

#             # ------------------------------------------
#             # NOTES
#             # ------------------------------------------

#             "",

#             # ------------------------------------------
#             # TOTAL BUDGET
#             # SUM OF ALL TOTAL AMOUNT VALUES
#             # ------------------------------------------

#             total_budget_formula
#             if idx == 2 else ""
#         ]

#         ws.append(row)

#     # --------------------------------------------------
#     # STYLE TOTAL AMOUNT COLUMN
#     # --------------------------------------------------

#     total_fill = PatternFill(
#         start_color="E8F4EA",
#         end_color="E8F4EA",
#         fill_type="solid"
#     )

#     for row in range(2, ws.max_row + 1):

#         ws[f"R{row}"].fill = total_fill

#     # --------------------------------------------------
#     # STYLE TOTAL BUDGET COLUMN
#     # --------------------------------------------------

#     budget_fill = PatternFill(
#         start_color="FFF2CC",
#         end_color="FFF2CC",
#         fill_type="solid"
#     )

#     for row in range(2, ws.max_row + 1):

#         ws[f"T{row}"].fill = budget_fill

#     # --------------------------------------------------
#     # FREEZE HEADER
#     # --------------------------------------------------

#     ws.freeze_panes = "A2"

#     # --------------------------------------------------
#     # ENABLE FILTERS
#     # --------------------------------------------------

#     ws.auto_filter.ref = ws.dimensions

#     # --------------------------------------------------
#     # AUTO WIDTH
#     # --------------------------------------------------

#     for column in ws.columns:

#         max_length = max(
#             len(str(cell.value or ""))
#             for cell in column
#         )

#         adjusted_width = min(max_length + 5, 50)

#         ws.column_dimensions[
#             column[0].column_letter
#         ].width = adjusted_width

#     # --------------------------------------------------
#     # HIDE COLUMNS
#     # --------------------------------------------------

#     hidden_columns = [

#         "B",  # Partner ID
#         "K",  # Type of expenses ID
#         "S"   # Notes
#     ]

#     for col in hidden_columns:

#         ws.column_dimensions[col].hidden = True

#     # --------------------------------------------------
#     # FILE NAME
#     # --------------------------------------------------

#     filename = frappe.scrub(
#         data.get("budget_reference_name")
#         or "budget"
#     ).replace("-", "_")

#     # --------------------------------------------------
#     # SAVE FILE
#     # --------------------------------------------------

#     output = BytesIO()

#     wb.save(output)

#     frappe.response["filename"] = (
#         f"{filename}_creche_budget_template.xlsx"
#     )

#     frappe.response["filecontent"] = output.getvalue()

#     frappe.response["type"] = "binary"






@frappe.whitelist(allow_guest=True)
def download_budget_template(data=None):

    import json
    from io import BytesIO
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill

    # --------------------------------------------------
    # PARSE DATA
    # --------------------------------------------------

    if isinstance(data, str):
        data = json.loads(data)

    data = data or {}

    # --------------------------------------------------
    # GET MAIN HEAD SEQUENCE
    # --------------------------------------------------

    main_head_sequence = {
        d.name: (d.sequence_id or 0)
        for d in frappe.get_all(
            "Budget main head",
            fields=[
                "name",
                "sequence_id"
            ]
        )
    }

    # --------------------------------------------------
    # FETCH BUDGET ITEMS
    # --------------------------------------------------

    budget_items = frappe.get_all(
        "Budget and Expense items list",
        fields=[
            "name",
            "budget_main_head",
            "budget_sub_head",
            "type_of_expenses"
        ]
    )

    # --------------------------------------------------
    # SORT ITEMS
    #
    # 1. Main Head Sequence
    # 2. Main Head Name
    # 3. Sub Head
    # 4. Expense Type
    # 5. Item Name
    # --------------------------------------------------

    budget_items = sorted(
        budget_items,
        key=lambda d: (

            main_head_sequence.get(
                d.get("budget_main_head"), 0
            ),

            d.get("budget_main_head") or "",

            d.get("budget_sub_head") or "",

            d.get("type_of_expenses") or "",

            d.get("name") or ""
        )
    )

    # --------------------------------------------------
    # CREATE WORKBOOK
    # --------------------------------------------------

    wb = Workbook()
    ws = wb.active
    ws.title = "Creche Budget"

    # --------------------------------------------------
    # HEADERS
    # --------------------------------------------------

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

    # --------------------------------------------------
    # HEADER STYLE
    # --------------------------------------------------

    header_fill = PatternFill(
        start_color="D9EAF7",
        end_color="D9EAF7",
        fill_type="solid"
    )

    for cell in ws[1]:

        cell.font = Font(bold=True)
        cell.fill = header_fill

    # --------------------------------------------------
    # TOTAL BUDGET FORMULA
    # --------------------------------------------------

    total_budget_formula = (
        f"=SUM(R2:R{len(budget_items)+1})"
    )

    # --------------------------------------------------
    # ADD DATA ROWS
    # --------------------------------------------------

    for idx, item in enumerate(budget_items, start=2):

        row = [

            # ------------------------------------------
            # PARENT FIELDS
            # ONLY FIRST ROW SHOULD HAVE VALUES
            # ------------------------------------------

            data.get("budget_reference_name")
            if idx == 2 else "",

            data.get("partner_id")
            if idx == 2 else "",

            data.get("partner_name")
            if idx == 2 else "",

            data.get("grant_id")
            if idx == 2 else "",

            data.get("no_of_creches")
            if idx == 2 else "",

            data.get("state")
            if idx == 2 else "",

            data.get("financial_year")
            if idx == 2 else "",

            data.get("date_of_approval")
            if idx == 2 else "",

            data.get("start_date")
            if idx == 2 else "",

            data.get("end_date")
            if idx == 2 else "",

            # ------------------------------------------
            # CHILD TABLE FIELDS
            # ------------------------------------------

            item.get("name"),

            item.get("budget_main_head"),

            item.get("budget_sub_head"),

            item.get("type_of_expenses"),

            # ------------------------------------------
            # YEAR VALUES
            # ------------------------------------------

            0,  # Year 1

            0,  # Year 2

            0,  # Year 3

            # ------------------------------------------
            # TOTAL AMOUNT
            # YEAR1 + YEAR2 + YEAR3
            # ------------------------------------------

            f"=SUM(O{idx}:Q{idx})",

            # ------------------------------------------
            # NOTES
            # ------------------------------------------

            "",

            # ------------------------------------------
            # TOTAL BUDGET
            # SUM OF ALL TOTAL AMOUNTS
            # ------------------------------------------

            total_budget_formula
            if idx == 2 else ""
        ]

        ws.append(row)

    # --------------------------------------------------
    # STYLE TOTAL AMOUNT COLUMN
    # --------------------------------------------------

    total_fill = PatternFill(
        start_color="E8F4EA",
        end_color="E8F4EA",
        fill_type="solid"
    )

    for row in range(2, ws.max_row + 1):

        ws[f"R{row}"].fill = total_fill

    # --------------------------------------------------
    # STYLE TOTAL BUDGET COLUMN
    # --------------------------------------------------

    budget_fill = PatternFill(
        start_color="FFF2CC",
        end_color="FFF2CC",
        fill_type="solid"
    )

    for row in range(2, ws.max_row + 1):

        ws[f"T{row}"].fill = budget_fill

    # --------------------------------------------------
    # FREEZE HEADER
    # --------------------------------------------------

    ws.freeze_panes = "A2"

    # --------------------------------------------------
    # ENABLE FILTERS
    # --------------------------------------------------

    ws.auto_filter.ref = ws.dimensions

    # --------------------------------------------------
    # AUTO WIDTH
    # --------------------------------------------------

    for column in ws.columns:

        max_length = max(
            len(str(cell.value or ""))
            for cell in column
        )

        adjusted_width = min(
            max_length + 5,
            50
        )

        ws.column_dimensions[
            column[0].column_letter
        ].width = adjusted_width

    # --------------------------------------------------
    # HIDE COLUMNS
    # --------------------------------------------------

    hidden_columns = [

        "B",  # Partner ID
        "K",  # Type of expenses ID
        "S"   # Notes
    ]

    for col in hidden_columns:

        ws.column_dimensions[col].hidden = True

    # --------------------------------------------------
    # FILE NAME
    # --------------------------------------------------

    filename = frappe.scrub(
        data.get("budget_reference_name")
        or "budget"
    ).replace("-", "_")

    # --------------------------------------------------
    # SAVE FILE
    # --------------------------------------------------

    output = BytesIO()

    wb.save(output)

    frappe.response["filename"] = (
        f"{filename}_creche_budget_template.xlsx"
    )

    frappe.response["filecontent"] = output.getvalue()

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
    
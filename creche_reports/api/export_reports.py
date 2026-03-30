# import frappe
# import io
# from typing import Any
# from openpyxl import Workbook
# from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
# from openpyxl.utils import get_column_letter


# @frappe.whitelist(allow_guest=True)
# def export_creche_utilisation_excel(names: Any = None):

#     # -----------------------
#     # GET MULTIPLE IDS
#     # -----------------------
#     if not names:
#         frappe.throw("Missing document names")

#     if isinstance(names, str):
#         names = names.split(",")
#     wb = Workbook()
#     wb.remove(wb.active)  # remove default sheet

#     # -----------------------
#     # STYLES
#     # -----------------------
#     center = Alignment(horizontal="center", vertical="center")
#     left = Alignment(horizontal="left", vertical="center")
#     bold = Font(bold=True)
#     header_fill = PatternFill("solid", fgColor="D6DBDF")

#     thin = Side(style="thin")
#     border = Border(left=thin, right=thin, top=thin, bottom=thin)

#     def style(cell, bold_font=False, fill=None, align=None):
#         cell.border = border
#         if bold_font:
#             cell.font = bold
#         if fill:
#             cell.fill = fill
#         if align:
#             cell.alignment = align
#     # -----------------------
#     # LOOP EACH DOCUMENT
#     # -----------------------
#     for name in names:

#         doc = frappe.get_doc("Creche utilisation", name)

#         ws = wb.create_sheet(title=name[:31])  # sheet name max 31 chars

#         row = 1
#         col_offset = 2

#         # -----------------------
#         # TITLE
#         # -----------------------
#         ws.cell(row=row, column=col_offset, value="Creche Utilisation Report")
#         ws.cell(row=row, column=col_offset).font = Font(size=10, bold=True)
#         row += 2

#         # -----------------------
#         # PARENT FIELDS
#         # -----------------------
#         parent_fields = [
#             ("Partner Name", doc.partner_name),
#             ("State", doc.state),
#             ("No of Creches", doc.no_of_creches),
#             ("Month", doc.monthu),
#             ("Financial Year", doc.fy),
#         ]

#         for label, value in parent_fields:
#             ws.cell(row=row, column=col_offset, value=label)
#             ws.cell(row=row, column=col_offset + 1, value=value)

#             style(ws.cell(row=row, column=col_offset), bold_font=True, align=left)
#             style(ws.cell(row=row, column=col_offset + 1), align=left)

#             row += 1

#         row += 1

#         # -----------------------
#         # HEADER
#         # -----------------------
#         headers = ["Budget Head", "Main Head", "Cost Category", "Amount"]

#         for col, h in enumerate(headers):
#             cell = ws.cell(row=row, column=col_offset + col, value=h)
#             style(cell, bold_font=True, fill=header_fill, align=center)

#         row += 1

#         # -----------------------
#         # DATA
#         # -----------------------
#         data_start_row = row

#         for item in (doc.get("budgets") or []):
#             ws.cell(row=row, column=col_offset, value=item.budget_head)
#             ws.cell(row=row, column=col_offset + 1, value=item.budget_main_head)
#             ws.cell(row=row, column=col_offset + 2, value=item.cost_category)
#             ws.cell(row=row, column=col_offset + 3, value=item.amount)

#             for col in range(4):
#                 style(ws.cell(row=row, column=col_offset + col))

#             row += 1

#         data_end_row = row - 1
#         row += 1

#         # -----------------------
#         # TOTAL
#         # -----------------------
#         amount_col = get_column_letter(col_offset + 3)

#         ws.cell(row=row, column=col_offset + 2, value="Total Utilisation")
#         ws.cell(
#             row=row,
#             column=col_offset + 3,
#             value=f"=SUM({amount_col}{data_start_row}:{amount_col}{data_end_row})"
#         )

#         style(ws.cell(row=row, column=col_offset + 2), bold_font=True)
#         style(ws.cell(row=row, column=col_offset + 3), bold_font=True)

#         row += 1

#         # -----------------------
#         # BANK BALANCE
#         # -----------------------
#         ws.cell(row=row, column=col_offset + 2, value="Bank Balance")
#         ws.cell(row=row, column=col_offset + 3, value=doc.bankbalance)

#         style(ws.cell(row=row, column=col_offset + 2), bold_font=True)
#         style(ws.cell(row=row, column=col_offset + 3), bold_font=True)

#         # -----------------------
#         # WIDTH
#         # -----------------------
#         for col in ws.columns:
#             max_len = 0
#             col_letter = col[0].column_letter

#             for cell in col:
#                 if cell.value:
#                     max_len = max(max_len, len(str(cell.value)))

#             ws.column_dimensions[col_letter].width = max_len + 3

#     # -----------------------
#     # OUTPUT
#     # -----------------------
#     stream = io.BytesIO()
#     wb.save(stream)
#     stream.seek(0)

#     frappe.response["filename"] = "Creche_Utilisation.xlsx"
#     frappe.response["filecontent"] = stream.getvalue()
#     frappe.response["type"] = "binary"

import frappe
import io
from typing import Any
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter


@frappe.whitelist(allow_guest=True)
def export_creche_utilisation_excel(names: Any = None):

    # -----------------------
    # GET MULTIPLE IDS
    # -----------------------
    if not names:
        frappe.throw("Missing document names")

    if isinstance(names, str):
        names = names.split(",")

    # -----------------------
    # WORKBOOK
    # -----------------------
    wb = Workbook()
    wb.remove(wb.active)

    # -----------------------
    # STYLES
    # -----------------------
    center = Alignment(horizontal="center", vertical="center")
    left = Alignment(horizontal="left", vertical="center")
    bold = Font(bold=True)
    header_fill = PatternFill("solid", fgColor="D6DBDF")

    thin = Side(style="thin")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    def style(cell, bold_font=False, fill=None, align=None):
        cell.border = border
        if bold_font:
            cell.font = bold
        if fill:
            cell.fill = fill
        if align:
            cell.alignment = align

    # -----------------------
    # LOOP DOCUMENTS
    # -----------------------
    for name in names:

        doc = frappe.get_doc("Creche utilisation", name)

        # -----------------------
        # SAFE SHEET NAME ✅
        # -----------------------
        sheet_name = f"{doc.partner_name}_{doc.monthu}_{doc.fy}"

        # Remove invalid characters
        for ch in ['\\', '/', '*', '?', ':', '[', ']']:
            sheet_name = sheet_name.replace(ch, '')

        # Optional: remove spaces
        sheet_name = sheet_name.replace(" ", "")

        # Limit to 31 characters
        sheet_name = sheet_name[:31]

        ws = wb.create_sheet(title=sheet_name)

        row = 1
        col_offset = 2  # Start from column B

        # -----------------------
        # TITLE
        # -----------------------
        ws.cell(row=row, column=col_offset, value="Creche Utilisation Report")
        ws.cell(row=row, column=col_offset).font = Font(size=10, bold=True)
        row += 2

        # -----------------------
        # PARENT FIELDS
        # -----------------------
        parent_fields = [
            ("Partner Name", doc.partner_name),
            ("State", doc.state),
            ("No of Creches", doc.no_of_creches),
            ("Month", doc.monthu),
            ("Financial Year", doc.fy),
        ]

        for label, value in parent_fields:
            ws.cell(row=row, column=col_offset, value=label)
            ws.cell(row=row, column=col_offset + 1, value=value)

            style(ws.cell(row=row, column=col_offset), bold_font=True, align=left)
            style(ws.cell(row=row, column=col_offset + 1), align=left)

            row += 1

        row += 1

        # -----------------------
        # HEADER
        # -----------------------
        headers = ["S.No", "Budget Head", "Main Head", "Cost Category", "Amount"]

        for col, h in enumerate(headers):
            cell = ws.cell(row=row, column=col_offset + col, value=h)
            style(cell, bold_font=True, fill=header_fill, align=center)

        row += 1

        # -----------------------
        # DATA
        # -----------------------
        data_start_row = row

        for idx, item in enumerate((doc.get("budgets") or []), start=1):

            ws.cell(row=row, column=col_offset, value=idx)
            ws.cell(row=row, column=col_offset + 1, value=item.budget_head)
            ws.cell(row=row, column=col_offset + 2, value=item.budget_main_head)
            ws.cell(row=row, column=col_offset + 3, value=item.cost_category)
            ws.cell(row=row, column=col_offset + 4, value=item.amount)

            for col in range(5):
                style(ws.cell(row=row, column=col_offset + col))

            # Center align S.No
            style(ws.cell(row=row, column=col_offset), align=center)

            row += 1

        data_end_row = row - 1
        row += 1

        # -----------------------
        # TOTAL
        # -----------------------
        amount_col = get_column_letter(col_offset + 4)

        ws.cell(row=row, column=col_offset + 3, value="Total Utilisation")
        ws.cell(
            row=row,
            column=col_offset + 4,
            value=f"=SUM({amount_col}{data_start_row}:{amount_col}{data_end_row})"
        )

        style(ws.cell(row=row, column=col_offset + 3), bold_font=True)
        style(ws.cell(row=row, column=col_offset + 4), bold_font=True)

        row += 1

        # -----------------------
        # BANK BALANCE
        # -----------------------
        ws.cell(row=row, column=col_offset + 3, value="Bank Balance")
        ws.cell(row=row, column=col_offset + 4, value=doc.bankbalance)

        style(ws.cell(row=row, column=col_offset + 3), bold_font=True)
        style(ws.cell(row=row, column=col_offset + 4), bold_font=True)

        # -----------------------
        # AUTO WIDTH
        # -----------------------
        for col in ws.columns:
            max_len = 0
            col_letter = col[0].column_letter

            for cell in col:
                if cell.value:
                    max_len = max(max_len, len(str(cell.value)))

            ws.column_dimensions[col_letter].width = max_len + 3

        ws.column_dimensions['B'].width = 10
        ws.column_dimensions['C'].width = 25
        ws.column_dimensions['D'].width = 30

    # -----------------------
    # OUTPUT
    # -----------------------
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    frappe.response["filename"] = "Creche_Utilisation.xlsx"
    frappe.response["filecontent"] = stream.getvalue()
    frappe.response["type"] = "binary"
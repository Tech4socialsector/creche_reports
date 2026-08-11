import frappe
import io
import json
from typing import Any
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

from creche_reports.api import permissions as _perm

# Excel/Sheets treats a cell starting with =, +, -, or @ as a formula. A
# value containing one of these (e.g. from a Notes free-text field) would
# execute as a formula for whoever opens the exported file — prefix with a
# leading apostrophe (Excel's own "treat as text" escape) so it's never
# interpreted as one.
_FORMULA_PREFIXES = ("=", "+", "-", "@")


def _safe_cell_value(value):
    if isinstance(value, str) and value.startswith(_FORMULA_PREFIXES):
        return "'" + value
    return value


# Hard ceiling on how many records a single export request may process
# synchronously (or per background job run) — prevents an unbounded
# `names`/row list from tying up a worker or the request thread indefinitely.
MAX_EXPORT_RECORDS = 500


@frappe.whitelist()
def export_creche_utilisation_excel_object(names: Any = None):

    # -----------------------
    # HANDLE INPUT (OBJECT / STRING)
    # -----------------------
    if not names:
        frappe.throw("Please select at least one record")

    if isinstance(names, str):
        try:
            names = json.loads(names)
        except:
            names = [n.strip() for n in names.split(",") if n.strip()]

    if not isinstance(names, list):
        frappe.throw("Invalid names format")

    if not names:
        frappe.throw("No valid records found")

    if len(names) > MAX_EXPORT_RECORDS:
        frappe.throw(frappe._("Cannot export more than {0} records at once.").format(MAX_EXPORT_RECORDS))

    # Every requested record must resolve to a budget the caller is
    # permitted to see — a name the caller merely guessed/enumerated (rather
    # than picked from their own scoped UI) is rejected outright.
    budget_by_name = {
        r.name: r.budget_reference_id
        for r in frappe.get_all(
            "Creche utilisation", filters={"name": ["in", names]},
            fields=["name", "budget_reference_id"], ignore_permissions=True,
        )
    }
    for n in names:
        _perm.assert_budget_permitted(budget_by_name.get(n))

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
        # SHEET NAME
        # -----------------------
        sheet_name = f"{doc.partner_name}_{doc.monthu}_{doc.fy}"

        for ch in ['\\', '/', '*', '?', ':', '[', ']']:
            sheet_name = sheet_name.replace(ch, '')

        sheet_name = sheet_name.replace(" ", "")
        sheet_name = sheet_name[:31]

        ws = wb.create_sheet(title=sheet_name)

        row = 1
        col_offset = 1  # ✅ START FROM COLUMN A

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
            ws.cell(row=row, column=col_offset + 1, value=_safe_cell_value(value))

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
            ws.cell(row=row, column=col_offset + 1, value=_safe_cell_value(item.budget_head))
            ws.cell(row=row, column=col_offset + 2, value=_safe_cell_value(item.budget_main_head))
            ws.cell(row=row, column=col_offset + 3, value=_safe_cell_value(item.cost_category))
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

        ws.column_dimensions['A'].width = 10
        ws.column_dimensions['B'].width = 25
        ws.column_dimensions['C'].width = 30

    # -----------------------
    # OUTPUT
    # -----------------------
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    frappe.response["filename"] = "Creche_Utilisation.xlsx"
    frappe.response["filecontent"] = stream.getvalue()
    frappe.response["type"] = "binary"
































    import frappe
import io
import json

from frappe.utils.background_jobs import enqueue
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter


# =========================================================
# CONSTANTS
# =========================================================

DOCTYPE_TRACKER     = "Creche Reports Export"
DOCTYPE_UTILISATION = "Creche utilisation"


# =========================================================
# SHARED — STATUS & HISTORY
# =========================================================

@frappe.whitelist()
def get_export_status(export_id):
    doc = frappe.get_doc(DOCTYPE_TRACKER, export_id)
    if doc.owner != frappe.session.user and not _perm.is_unrestricted_user():
        frappe.throw(frappe._("You do not have permission to access this record."), frappe.PermissionError)
    return {
        "status":       doc.status,
        "export_file":  doc.export_file  or None,
        "error_log":    doc.error_log    or None,
        "completed_on": str(doc.completed_on) if doc.completed_on else None,
    }


@frappe.whitelist()
def get_recent_exports(export_type=None, limit=20):
    filters = {}
    if export_type:
        filters["export_type"] = export_type
    if not _perm.is_unrestricted_user():
        filters["owner"] = frappe.session.user
    limit = min(int(limit), 100)
    return frappe.get_all(
        DOCTYPE_TRACKER,
        filters=filters,
        fields=[
            "name", "status", "export_type",
            "total_records", "export_file",
            "reference_names",          # stores filter snapshot JSON
            "creation", "started_on", "completed_on",
        ],
        order_by="creation desc",
        limit_page_length=int(limit),
    )


# =========================================================
# BUDGETS  (for the filter dropdown)
# =========================================================

@frappe.whitelist()
def get_all_budgets():
    """
    Returns all Budget Reference docs for the dropdown.
    Adjust doctype name / fields to match your schema.
    """
    return frappe.get_all(
        "Budget Reference",          # ← change to your actual doctype
        fields=[
            "name",
            "budget_reference_name",
            "partner_name",
            "partner_id",
            "grant_id",
            "state",
            "no_of_creches",
        ],
        order_by="budget_reference_name asc",
    )


# =========================================================
# CRECHE UTILISATION — QUEUE EXPORT  (filter-based)
# =========================================================

@frappe.whitelist()
def create_creche_utilisation_export(
    report_type_name=None,
    budget_name=None,
    budget_reference_name=None,
    partner_name=None,
    grant_id=None,
    financial_year=None,
    month=None,
):
    """
    Queue a Creche Utilisation export.
    All budget details are passed from the frontend (already loaded in the dropdown).
    Records are fetched inside the background job using the filters.
    """
    if not report_type_name:
        frappe.throw("Report Type Name is required")
    if not budget_name:
        frappe.throw("Budget Reference Name is required")
    if not financial_year:
        frappe.throw("Financial Year is required")
    if not month:
        frappe.throw("Month is required")

    # budget_name is the budget's display name (budget_reference_name), not
    # its docname — resolve it to the underlying Creche Budget doc(s) and
    # reject the request up front if the caller isn't permitted to see any
    # of them (the background job re-checks this again per-record).
    matching_budget_ids = frappe.get_all(
        "Creche Budget", filters={"budget_reference_name": budget_name}, pluck="name",
    )
    if not matching_budget_ids:
        frappe.throw(frappe._("No matching budget found."))
    for bid in matching_budget_ids:
        _perm.assert_budget_permitted(bid)

    # Budget details come directly from the frontend — no extra DB fetch needed
    filter_snapshot = {
        "report_type_name":      report_type_name,
        "budget_name":           budget_name,
        "budget_reference_name": (budget_reference_name or "").strip(),
        "partner_name":          partner_name  or "",
        "grant_id":              grant_id      or "",
        "financial_year":        financial_year,
        "month":                 month,
    }

    tracker = frappe.get_doc({
        "doctype":         DOCTYPE_TRACKER,
        "status":          "Queued",
        "export_type":     "Creche Utilisation",
        "total_records":   0,
        "reference_names": json.dumps(filter_snapshot),
    })
    tracker.insert(ignore_permissions=True)
    frappe.db.commit()

    enqueue(
        method="creche_reports.api.export_reports.generate_creche_utilisation_file",
        queue="long",
        timeout=5000,
        export_id=tracker.name,
        filter_snapshot=filter_snapshot,
    )

    return {"success": 1, "export_id": tracker.name}


# =========================================================
# CRECHE UTILISATION — BACKGROUND JOB
# =========================================================

def generate_creche_utilisation_file(export_id, filter_snapshot):
    tracker = frappe.get_doc(DOCTYPE_TRACKER, export_id)

    try:
        # ── Mark processing ─────────────────────────────────
        tracker.status     = "Processing"
        tracker.started_on = frappe.utils.now()
        tracker.save(ignore_permissions=True)
        frappe.db.commit()

        # ── Fetch matching records using filters ─────────────
        # Get actual field names from the doctype meta to avoid wrong fieldname errors
        meta   = frappe.get_meta(DOCTYPE_UTILISATION)
        fields = {f.fieldname for f in meta.fields}

        filters = {}

        # Match financial_year field — try common variants
        for fn in ("financial_year", "year", "fy"):
            if fn in fields:
                filters[fn] = filter_snapshot["financial_year"]
                break

        # Match month field — try common variants
        for fn in ("month",):
            if fn in fields:
                filters[fn] = filter_snapshot["month"]
                break

        # Match budget link field — try common variants
        # Try both the doc name (budget_name) and the display name (budget_reference_name)
        # as the stored value may be either one depending on how the field is set
        if filter_snapshot.get("budget_name"):
            for fn in ("budget_reference_name", "budget_reference", "budget_name",
                       "budget", "budget_ref"):
                if fn in fields:
                    # Try display name first, fall back to doc name
                    filters[fn] = filter_snapshot.get("budget_reference_name") or filter_snapshot["budget_name"]
                    break

        # ── Debug: log filters + a sample of actual stored values ──
        sample = frappe.get_all(
            DOCTYPE_UTILISATION,
            fields=["name", "financial_year", "month", "budget_reference_name",
                    "budget_reference", "budget_name", "budget"],
            limit=3,
            ignore_ifnull=True,
        )
        frappe.log_error(
            f"Filters applied: {filters}\n"
            f"Available fields (subset): {sorted(fields)[:60]}\n"
            f"Sample records (first 3, no filter): {sample}",
            "Export Debug"
        )

        # Defense in depth: even though create_creche_utilisation_export
        # already checked this before enqueueing, re-apply the enqueuing
        # user's permission scope here too, since this job is the actual
        # point where records are read and written into the exported file.
        effective_budget_ids = _perm.get_effective_budget_ids()
        if effective_budget_ids is not None:
            filters["budget_reference_id"] = ["in", effective_budget_ids or ["__none__"]]

        records = frappe.get_all(
            DOCTYPE_UTILISATION,
            filters=filters,
            fields=["name"],
            order_by="creation asc",
            limit_page_length=MAX_EXPORT_RECORDS,
        )

        if not records:
            # Log what fields exist to help debug fieldname mismatches
            frappe.throw(
                f"No Creche Utilisation records found for "
                f"{filter_snapshot['month']} {filter_snapshot['financial_year']}. "
                f"Filters applied: {filters}. "
                f"Check the Frappe error log for available field names."
            )

        names = [r["name"] for r in records]

        # Update total_records now that we know
        tracker.total_records = len(names)
        tracker.save(ignore_permissions=True)
        frappe.db.commit()

        # ── Build workbook ───────────────────────────────────
        wb = Workbook()
        wb.remove(wb.active)

        center = Alignment(horizontal="center", vertical="center")
        left   = Alignment(horizontal="left",   vertical="center")
        bold   = Font(bold=True)
        header_fill = PatternFill("solid", fgColor="D6DBDF")
        thin   = Side(style="thin")
        border = Border(left=thin, right=thin, top=thin, bottom=thin)

        def style(cell, bold_font=False, fill=None, align=None):
            cell.border = border
            if bold_font: cell.font = bold
            if fill:      cell.fill = fill
            if align:     cell.alignment = align

        for name in names:
            doc = frappe.get_doc(DOCTYPE_UTILISATION, name)

            # ── Sheet name ───────────────────────────────────
            sheet_name = f"{doc.partner_name}_{doc.month}_{doc.financial_year}"
            for ch in ['\\', '/', '*', '?', ':', '[', ']']:
                sheet_name = sheet_name.replace(ch, '')
            sheet_name = sheet_name.replace(" ", "")[:31]

            ws = wb.create_sheet(title=sheet_name)
            row = 1

            # Title
            ws.cell(row=row, column=1, value="Creche Utilisation Report").font = Font(size=12, bold=True)
            row += 2

            # Parent fields
            for label, value in [
                ("Partner Name",     doc.partner_name),
                ("Partner ID",       doc.partner_id),
                ("Budget Reference", doc.budget_reference_name),
                ("Grant ID",         doc.grant_id),
                ("State",            doc.state),
                ("No of Creches",    doc.no_of_creches),
                ("Month",            doc.month),
                ("Financial Year",   doc.financial_year),
                ("Date",             doc.date),
            ]:
                ws.cell(row=row, column=1, value=label)
                ws.cell(row=row, column=2, value=_safe_cell_value(value))
                style(ws.cell(row=row, column=1), bold_font=True, align=left)
                style(ws.cell(row=row, column=2), align=left)
                row += 1

            row += 1

            # Table headers
            headers = ["S.No", "Type of Expenses", "Budget Main Head",
                       "Budget Sub Head", "Total Amount", "Notes"]
            for col, header in enumerate(headers):
                style(ws.cell(row=row, column=col + 1, value=header),
                      bold_font=True, fill=header_fill, align=center)
            row += 1
            data_start = row

            # Child rows
            for idx, item in enumerate(doc.get("utilisation_items_list") or [], start=1):
                for col, val in enumerate([
                    idx, item.type_of_expenses, item.budget_main_head,
                    item.budget_sub_head, item.total_amount, item.notes
                ]):
                    style(ws.cell(row=row, column=col + 1, value=_safe_cell_value(val)))
                style(ws.cell(row=row, column=1), align=center)
                row += 1

            data_end = row - 1
            row += 1

            # Totals
            amt_col = get_column_letter(5)
            for label, value in [
                ("Total Utilisation",   f"=SUM({amt_col}{data_start}:{amt_col}{data_end})"),
                ("Bank + Cash Balance",  doc.balance_amount),
                ("Interest from Bank",   doc.interest_from_bank),
            ]:
                ws.cell(row=row, column=4, value=label)
                ws.cell(row=row, column=5, value=value)
                style(ws.cell(row=row, column=4), bold_font=True)
                style(ws.cell(row=row, column=5), bold_font=True)
                row += 1

            # Auto column width
            for col in ws.columns:
                max_len = max((len(str(c.value)) for c in col if c.value), default=0)
                ws.column_dimensions[col[0].column_letter].width = max_len + 5

        # ── Save file ────────────────────────────────────────
        fs  = filter_snapshot
        filename = (
            f"Creche_Utilisation"
            f"_{(fs.get('report_type_name') or 'Export').replace(' ', '_')}"
            f"_{(fs.get('budget_reference_name') or 'ALL').replace(' ', '_')}"
            f"_{fs.get('month', '')}"
            f"_{fs.get('financial_year', '')}"
            f"_{tracker.name}.xlsx"
        )

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)

        file_doc = frappe.get_doc({
            "doctype":    "File",
            "file_name":  filename,
            "content":    stream.getvalue(),
            "is_private": 1,
        })
        file_doc.insert(ignore_permissions=True)
        frappe.db.commit()

        # ── Mark completed ───────────────────────────────────
        tracker.status       = "Completed"
        tracker.completed_on = frappe.utils.now()
        tracker.export_file  = file_doc.file_url
        tracker.save(ignore_permissions=True)
        frappe.db.commit()

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Creche Utilisation Export Error")
        tracker.status       = "Failed"
        tracker.error_log    = frappe.get_traceback()
        tracker.completed_on = frappe.utils.now()
        tracker.save(ignore_permissions=True)
        frappe.db.commit()


# =========================================================
# CRECHE BUDGET EXPORT
# =========================================================

@frappe.whitelist()
def export_creche_budget_excel(names: Any = None):

    # -----------------------
    # HANDLE INPUT (OBJECT / STRING)
    # -----------------------
    if not names:
        frappe.throw("Please select at least one record")

    if isinstance(names, str):
        try:
            names = json.loads(names)
        except Exception:
            names = [n.strip() for n in names.split(",") if n.strip()]

    if not isinstance(names, list):
        frappe.throw("Invalid names format")

    if not names:
        frappe.throw("No valid records found")

    if len(names) > MAX_EXPORT_RECORDS:
        frappe.throw(frappe._("Cannot export more than {0} records at once.").format(MAX_EXPORT_RECORDS))

    for n in names:
        _perm.assert_budget_permitted(n)

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

        doc = frappe.get_doc("Creche Budget", name)

        # -----------------------
        # SHEET NAME
        # -----------------------
        sheet_name = doc.name

        for ch in ['\\', '/', '*', '?', ':', '[', ']']:
            sheet_name = sheet_name.replace(ch, '')

        sheet_name = sheet_name[:31]

        ws = wb.create_sheet(title=sheet_name)

        row = 1
        col_offset = 1

        # -----------------------
        # PARENT FIELDS
        # -----------------------
        parent_fields = [
            ("ID", doc.name),
            ("Budget reference name", doc.budget_reference_name),
            ("Grant ID", doc.grant_id),
            ("Financial year", doc.financial_year),
            ("No of creches", doc.no_of_creches),
            ("Start Date", doc.start_date),
            ("End Date", doc.end_date),
            ("Date of approval", doc.date_of_approval),
        ]

        for label, value in parent_fields:
            ws.cell(row=row, column=col_offset, value=label)
            ws.cell(row=row, column=col_offset + 1, value=_safe_cell_value(value))

            style(ws.cell(row=row, column=col_offset), bold_font=True, align=left)
            style(ws.cell(row=row, column=col_offset + 1), align=left)

            row += 1

        row += 1

        # -----------------------
        # HEADER
        # -----------------------
        headers = [
            "Type of expenses ID", "Budget main head", "Budget sub head",
            "Type of expenses", "Year 1", "Year 2", "Year 3", "Total Amount",
        ]

        for col, h in enumerate(headers):
            cell = ws.cell(row=row, column=col_offset + col, value=h)
            style(cell, bold_font=True, fill=header_fill, align=center)

        row += 1

        # -----------------------
        # DATA
        # -----------------------
        data_start_row = row

        for item in (doc.get("budget_items_list") or []):

            ws.cell(row=row, column=col_offset,     value=_safe_cell_value(item.type_of_expenses_id))
            ws.cell(row=row, column=col_offset + 1, value=_safe_cell_value(item.budget_main_head))
            ws.cell(row=row, column=col_offset + 2, value=_safe_cell_value(item.budget_sub_head))
            ws.cell(row=row, column=col_offset + 3, value=_safe_cell_value(item.type_of_expenses))
            ws.cell(row=row, column=col_offset + 4, value=item.year_1)
            ws.cell(row=row, column=col_offset + 5, value=item.year_2)
            ws.cell(row=row, column=col_offset + 6, value=item.year_3)
            ws.cell(row=row, column=col_offset + 7, value=item.total_amount)

            for col in range(8):
                style(ws.cell(row=row, column=col_offset + col))

            row += 1

        data_end_row = row - 1
        row += 1

        # -----------------------
        # TOTAL
        # -----------------------
        if data_end_row >= data_start_row:
            y1_col = get_column_letter(col_offset + 4)
            y2_col = get_column_letter(col_offset + 5)
            y3_col = get_column_letter(col_offset + 6)
            amt_col = get_column_letter(col_offset + 7)

            ws.cell(row=row, column=col_offset, value="Total")
            ws.cell(row=row, column=col_offset + 4, value=f"=SUM({y1_col}{data_start_row}:{y1_col}{data_end_row})")
            ws.cell(row=row, column=col_offset + 5, value=f"=SUM({y2_col}{data_start_row}:{y2_col}{data_end_row})")
            ws.cell(row=row, column=col_offset + 6, value=f"=SUM({y3_col}{data_start_row}:{y3_col}{data_end_row})")
            ws.cell(row=row, column=col_offset + 7, value=f"=SUM({amt_col}{data_start_row}:{amt_col}{data_end_row})")

            for col in (0, 4, 5, 6, 7):
                style(ws.cell(row=row, column=col_offset + col), bold_font=True)

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

    # -----------------------
    # OUTPUT
    # -----------------------
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    filename = "Creche_Budget.xlsx" if len(names) > 1 else f"{names[0]}_Creche_Budget.xlsx"

    frappe.response["filename"] = filename
    frappe.response["filecontent"] = stream.getvalue()
    frappe.response["type"] = "binary"
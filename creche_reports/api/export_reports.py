import frappe
import io
import json
from typing import Any
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from frappe.utils.background_jobs import enqueue

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


# =========================================================
# CRECHE CAREGIVER SALARY AND BENEFITS EXPORT
# =========================================================

def _is_caregiver_record_permitted(doc):
    """A Creche Caregiver Salary and Benefits row is scoped like a budget:
    a permission on any ONE of partner/state/district/block should grant
    visibility, matched via the same union logic permissions.py uses for
    budgets (see assert_budget_permitted) — checking partner_id alone would
    incorrectly deny a user who was only granted access via State/District/
    Block, and checking every field independently would incorrectly deny a
    user whose only permission is on the partner.

    Note this is intentionally NOT the same thing as "doc.partner_id is one
    of the partners get_effective_partner_ids() returns" — that set is
    itself a union across dimensions, so a partner can appear in it via a
    completely different record's state/district/block than this one's.
    This function re-checks the specific record's own four fields instead.
    """
    scope = _perm.get_permission_scope()
    if all(v is None for v in scope.values()):
        return True  # fully unrestricted

    checks = {
        "partner_id": doc.partner_id,
        "state":      doc.state,
        "district":   doc.district,
        "block":      doc.block,
    }
    for field, value in checks.items():
        permitted = scope.get(field)
        if permitted is None:
            continue
        if value in permitted:
            return True  # matched via this dimension — permitted
    return False


def _assert_caregiver_record_permitted(doc):
    if not _is_caregiver_record_permitted(doc):
        frappe.throw(
            frappe._("You do not have permission to access this record."),
            frappe.PermissionError,
        )


@frappe.whitelist()
def export_creche_caregiver_salary_excel(names: Any = None, scope: str = "selected"):
    """Export Creche Caregiver Salary and Benefits records to a single
    Excel sheet, one row per record, laid out to match the standard
    "Partner Details / Deductions if any from the salary/honorarium"
    data-collection format (grouped headers with an Employer/Employee
    Contribution sub-header under each of PF and ESI).

    scope: "selected" (default) uses the caller-supplied `names` list;
    "all" or "submitted" instead resolve the record list server-side
    (restricted to submitted docs for "submitted"), permission-scoped the
    same way either way — the caller never needs to enumerate names for
    those two.
    """
    scope = (scope or "selected").lower()

    if scope in ("all", "submitted"):
        filters = {"docstatus": 1} if scope == "submitted" else {}
        permitted_partner_ids = _perm.get_effective_partner_ids()
        if permitted_partner_ids is not None:
            filters["partner_id"] = ["in", permitted_partner_ids or ["__none__"]]
        names = frappe.get_all(
            "Creche Caregiver Salary and Benefits",
            filters=filters,
            pluck="name",
            order_by="creation asc",
        )
        if not names:
            frappe.throw(frappe._("No matching records found to export."))
    else:
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

    docs = [frappe.get_doc("Creche Caregiver Salary and Benefits", n) for n in names]

    if scope in ("all", "submitted"):
        # These weren't individually requested — the partner-level
        # pre-filter above only narrows the query, it doesn't guarantee
        # every matched record's own state/district/block is permitted
        # (a partner can be reachable via a totally different record's
        # location). Drop anything that doesn't hold up rather than fail
        # the whole export over one out-of-scope record.
        docs = [doc for doc in docs if _is_caregiver_record_permitted(doc)]
        if not docs:
            frappe.throw(frappe._("No matching records found to export."))
    else:
        # "selected" records were explicitly named by the caller — deny
        # outright rather than silently drop, since that's a genuine
        # attempt to access something specific.
        for doc in docs:
            _assert_caregiver_record_permitted(doc)

    wb = Workbook()
    ws = wb.active
    ws.title = "Caregiver Salary and Benefits"

    center = Alignment(horizontal="center", vertical="center", wrap_text=True)
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
    # HEADER — two group bands, three header rows (matching the reference
    # data-collection sheet: a group band, an "Employer/Employee
    # Contribution" sub-header under PF and ESI, then the field labels)
    # -----------------------
    # (key, label, sub_header, group) — group spans are derived from this
    # list below rather than hardcoded, so adding/removing a column can't
    # silently desync the header merge math from the actual column count.
    COLUMNS = [
        ("s_no",               "S.No",                                   None,     ""),
        ("partner_name",       "Name of the Partner",                    None,     "Partner Details"),
        ("creche_ruralurban",  "Creche Rural/Urban",                     None,     "Partner Details"),
        ("state",              "State",                                  None,     "Partner Details"),
        ("district",           "District",                               None,     "Partner Details"),
        ("block",              "Block",                                  None,     "Partner Details"),
        ("total_caregivers",   "Total No. of Current Caregivers",        None,     "Partner Details"),
        ("min_salary",         "Minimum salary of caregiver",            None,     "Partner Details"),
        ("max_salary",         "Maximum salary of caregiver",            None,     "Partner Details"),
        ("avg_salary",         "Average Salary of Caregivers",           None,     "Partner Details"),
        ("pf",                 "PF (yes/no)",                            None,     "Deductions if any from the salary/honorarium"),
        ("pf_employer",        "Employer Contribution",                  "pf_sub", "Deductions if any from the salary/honorarium"),
        ("pf_employee",        "Employee Contribution",                  "pf_sub", "Deductions if any from the salary/honorarium"),
        ("esi",                "ESI (yes/no)",                           None,     "Deductions if any from the salary/honorarium"),
        ("esi_employer",       "Employer Contribution",                  "esi_sub", "Deductions if any from the salary/honorarium"),
        ("esi_employee",       "Employee Contribution",                  "esi_sub", "Deductions if any from the salary/honorarium"),
        ("health_insurance",   "Health Insurance (yes/no)",              None,     "Deductions if any from the salary/honorarium"),
        ("health_insurance_amount", "Health Insurance (Annual Premium Amount)", None, "Deductions if any from the salary/honorarium"),
        ("life_insurance",     "Life/Accidental Insurance (yes/no)",     None,     "Deductions if any from the salary/honorarium"),
        ("life_insurance_amount", "Life/Accidental (Annual Premium Amount)", None, "Deductions if any from the salary/honorarium"),
        ("tds",                "TDS (yes/no)",                           None,     "Deductions if any from the salary/honorarium"),
    ]
    ncols = len(COLUMNS)

    # Derive (label, colspan) group bands from consecutive COLUMNS entries
    # sharing the same group label, in order.
    GROUPS = []
    for _, _, _, group in COLUMNS:
        if GROUPS and GROUPS[-1][0] == group:
            GROUPS[-1] = (group, GROUPS[-1][1] + 1)
        else:
            GROUPS.append((group, 1))

    # Row 1: group band ("Partner Details" / "Deductions...")
    col = 1
    for label, span in GROUPS:
        if label:
            ws.merge_cells(start_row=1, start_column=col, end_row=1, end_column=col + span - 1)
        c = ws.cell(row=1, column=col, value=label)
        style(c, bold_font=True, fill=header_fill, align=center)
        for extra in range(1, span):
            style(ws.cell(row=1, column=col + extra), fill=header_fill)
        col += span

    # Row 2: "If yes, provide the details" sub-band over PF/ESI's two
    # contribution columns each (matches the reference sheet's middle row)
    sub_bands = {"pf_sub": "If yes, provide the details", "esi_sub": "If yes, provide the details"}
    sub_col_start = {}
    for i, (key, label, sub, group) in enumerate(COLUMNS, start=1):
        if sub and sub not in sub_col_start:
            sub_col_start[sub] = i
    for sub, start_col in sub_col_start.items():
        ws.merge_cells(start_row=2, start_column=start_col, end_row=2, end_column=start_col + 1)
        c = ws.cell(row=2, column=start_col, value=sub_bands[sub])
        style(c, bold_font=True, fill=header_fill, align=center)
        style(ws.cell(row=2, column=start_col + 1), fill=header_fill)

    # Row 3: field labels. Columns with no sub-header merge rows 2-3 so the
    # label doesn't look orphaned under an empty row 2 cell.
    for i, (key, label, sub, group) in enumerate(COLUMNS, start=1):
        if sub:
            c = ws.cell(row=3, column=i, value=label)
            style(c, bold_font=True, fill=header_fill, align=center)
        else:
            ws.merge_cells(start_row=2, start_column=i, end_row=3, end_column=i)
            c = ws.cell(row=2, column=i, value=label)
            style(c, bold_font=True, fill=header_fill, align=center)
            style(ws.cell(row=3, column=i), fill=header_fill)

    # -----------------------
    # DATA
    # -----------------------
    row = 4
    for idx, doc in enumerate(docs, start=1):
        values = {
            "s_no": idx,
            "partner_name": doc.partner_name,
            "creche_ruralurban": doc.creche_ruralurban,
            "state": doc.state,
            "district": doc.district,
            "block": doc.block,
            "total_caregivers": doc.total_no_of_current_caregivers,
            "min_salary": doc.minimum_salary_of_caregiver,
            "max_salary": doc.maximum_salary_of_caregiver,
            "avg_salary": doc.average_salary_of_caregivers,
            "pf": doc.pf,
            "pf_employer": doc.pf_employer_contribution if doc.pf == "Yes" else None,
            "pf_employee": doc.pf_employee_contribution if doc.pf == "Yes" else None,
            "esi": doc.esi,
            "esi_employer": doc.esi_employer_contribution if doc.esi == "Yes" else None,
            "esi_employee": doc.esi_employee_contribution if doc.esi == "Yes" else None,
            "health_insurance": doc.health_insurance,
            "health_insurance_amount": doc.health_insurance_amount if doc.health_insurance == "Yes" else None,
            "life_insurance": doc.life_accidental_insurance,
            "life_insurance_amount": doc.life_accidental_insurance_amount if doc.life_accidental_insurance == "Yes" else None,
            "tds": doc.tds_tax_deducted_at_source,
        }
        for i, (key, label, sub, group) in enumerate(COLUMNS, start=1):
            v = values.get(key)
            cell = ws.cell(row=row, column=i, value=_safe_cell_value(v) if v is not None else "")
            style(cell, align=Alignment(horizontal="center", vertical="center"))
        row += 1

    # -----------------------
    # COLUMN WIDTHS
    # -----------------------
    widths = [5, 22, 14, 14, 14, 14, 12, 12, 12, 14, 10, 12, 12, 10, 12, 12, 14, 18, 16, 16, 10]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.freeze_panes = "A4"

    # -----------------------
    # OUTPUT
    # -----------------------
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    if scope == "all":
        filename = "Creche_Caregiver_Salary_and_Benefits_All.xlsx"
    elif scope == "submitted":
        filename = "Creche_Caregiver_Salary_and_Benefits_Submitted.xlsx"
    elif len(names) > 1:
        filename = "Creche_Caregiver_Salary_and_Benefits.xlsx"
    else:
        filename = f"{names[0]}_Creche_Caregiver_Salary_and_Benefits.xlsx"

    frappe.response["filename"] = filename
    frappe.response["filecontent"] = stream.getvalue()
    frappe.response["type"] = "binary"
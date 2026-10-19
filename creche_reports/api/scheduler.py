import frappe
from frappe.utils import getdate, add_months, get_first_day, get_last_day, add_days, now_datetime


def send_utilisation_reminders():
    """Daily scheduler to send utilisation reminders."""

    today = getdate()

    # Start reminders only from the 5th
    if today.day < 5:
        return

    # Send every 3 days: 5,8,11,14,17...
    if (today.day - 5) % 3 != 0:
        return

    # Previous month is the reporting month
    report_date = add_months(today, -1)

    report_month = report_date.strftime("%B")
    month_start = get_first_day(report_date)
    month_end = get_last_day(report_date)

    budgets = frappe.get_all(
        "Creche Budget",
        fields=[
            "name",
            "budget_reference_name",
            "partner_id",
            "partner_name",
            "grant_id",
            "financial_year",
            "start_date",
            "end_date"
        ]
    )

    # Creche Partners has no email field of its own — resolve emails via the
    # same helper the rest of the app uses (the User linked to each partner
    # through a "User Permission" record, with a direct-field fallback).
    from creche_reports.api.budget_utilisation_summary import _get_partner_emails
    partner_ids = list({b.partner_id for b in budgets if b.partner_id})
    email_map = _get_partner_emails(partner_ids)

    for budget in budgets:

        start_date = getdate(budget.start_date)
        end_date = getdate(budget.end_date)

        # Skip if reporting month is outside budget period
        if month_end < start_date:
            continue

        if month_start > end_date:
            continue

        # Check whether utilisation is submitted
        submitted = frappe.db.exists(
            "Creche utilisation",
            {
                "budget_reference_id": budget.name,
                "month": report_month
            }
        )

        if submitted:
            continue

        send_email(budget, report_month, email_map.get(budget.partner_id))


def send_email(budget, report_month, email):

    if not email:
        frappe.log_error(
            f"No email found for Partner {budget.partner_name}",
            "Creche Utilisation Reminder"
        )
        return

    subject = f"Reminder: Submit Utilisation for {report_month}"

    message = f"""
    <p>Dear {budget.partner_name},</p>

    <p>
    This is a reminder to submit the utilisation report for
    <strong>{report_month}</strong>.
    </p>

    <table border="1" cellpadding="6" cellspacing="0">
        <tr>
            <td><b>Budget Reference</b></td>
            <td>{budget.budget_reference_name}</td>
        </tr>
        <tr>
            <td><b>Grant ID</b></td>
            <td>{budget.grant_id}</td>
        </tr>
        <tr>
            <td><b>Financial Year</b></td>
            <td>{budget.financial_year}</td>
        </tr>
    </table>

    <br>

    <p>
    Kindly submit the utilisation report as soon as possible.
    Reminder emails will continue every 3 days until the report is submitted.
    </p>

    <br>

    <p>
    Regards,<br>
    Creche Finance MIS
    </p>
    """

    frappe.sendmail(
        recipients=[email],
        subject=subject,
        message=message
    )


DEFAULT_MONTH_END_SUBJECT = "Reminder: Submit Utilisation Report for {month}"

DEFAULT_MONTH_END_MESSAGE = """
<p>Dear {partner_name},</p>

<p>
The month of <strong>{month}</strong> is closing soon. Please submit your
utilisation report for this month before it ends.
</p>

<table border="1" cellpadding="6" cellspacing="0">
    <tr>
        <td><b>Budget Reference</b></td>
        <td>{budget_reference_name}</td>
    </tr>
    <tr>
        <td><b>Grant ID</b></td>
        <td>{grant_id}</td>
    </tr>
    <tr>
        <td><b>Financial Year</b></td>
        <td>{financial_year}</td>
    </tr>
</table>

<br>

<p>Kindly submit the utilisation report at your earliest convenience.</p>

<br>

<p>
Regards,<br>
Creche Finance MIS
</p>
"""


def send_month_end_utilisation_reminders():
    """Daily scheduler: sends a once-a-month "the month is closing, please
    submit your utilisation" nudge, gated by the "Enable Month-End
    Utilisation Reminder" setting in Creche Reminder Settings.

    Unlike send_utilisation_reminders() above (which chases an OVERDUE
    report for the PREVIOUS month every 3 days from the 5th), this reminds
    partners about the CURRENT month while it's still open, once — on the
    last calendar day of the month by default, or a configurable number of
    days before it.
    """
    settings = frappe.get_single("Creche Reminder Settings")
    if not settings.enable_month_end_reminder:
        return

    today = getdate()
    month_end = get_last_day(today)
    days_before = settings.days_before_month_end or 0
    trigger_date = add_days(month_end, -days_before)

    if today != trigger_date:
        return

    report_month = today.strftime("%B")
    month_start = get_first_day(today)

    budgets = frappe.get_all(
        "Creche Budget",
        fields=[
            "name",
            "budget_reference_name",
            "partner_id",
            "partner_name",
            "grant_id",
            "financial_year",
            "start_date",
            "end_date",
        ],
    )

    # Creche Partners has no email field of its own — resolve emails the
    # same way the rest of the app does (via _get_partner_emails), which
    # looks at the User linked to each partner through a "User Permission"
    # record, falling back to a handful of possible direct-field names.
    from creche_reports.api.budget_utilisation_summary import _get_partner_emails
    partner_ids = list({b.partner_id for b in budgets if b.partner_id})
    email_map = _get_partner_emails(partner_ids)

    sent, skipped_submitted, skipped_no_email = 0, 0, 0

    for budget in budgets:
        start_date = getdate(budget.start_date) if budget.start_date else None
        end_date = getdate(budget.end_date) if budget.end_date else None

        if not start_date or not end_date:
            continue

        # Skip if the current month is outside this budget's own period
        if month_end < start_date or month_start > end_date:
            continue

        already_submitted = frappe.db.exists(
            "Creche utilisation",
            {"budget_reference_id": budget.name, "month": report_month},
        )
        if already_submitted:
            skipped_submitted += 1
            continue

        email = email_map.get(budget.partner_id)
        if send_month_end_email(budget, report_month, settings, email):
            sent += 1
        else:
            skipped_no_email += 1

    settings.db_set("last_run_on", now_datetime(), update_modified=False)
    settings.db_set(
        "last_run_summary",
        f"{report_month}: {sent} sent, {skipped_submitted} already submitted, {skipped_no_email} skipped (no email on file).",
        update_modified=False,
    )


def send_month_end_email(budget, report_month, settings, email):
    if not email:
        frappe.log_error(
            f"No email found for Partner {budget.partner_name}",
            "Creche Month-End Utilisation Reminder",
        )
        return False

    placeholders = {
        "month": report_month,
        "partner_name": budget.partner_name or "",
        "budget_reference_name": budget.budget_reference_name or "",
        "grant_id": budget.grant_id or "",
        "financial_year": budget.financial_year or "",
    }

    subject_template = settings.reminder_email_subject or DEFAULT_MONTH_END_SUBJECT
    message_template = settings.reminder_email_message or DEFAULT_MONTH_END_MESSAGE

    try:
        subject = subject_template.format(**placeholders)
        message = message_template.format(**placeholders)
    except (KeyError, ValueError, IndexError):
        # A malformed custom subject/message (unknown placeholder, stray
        # brace) shouldn't silently block every reminder for the day —
        # fall back to the default template so the notification still goes
        # out, and log it once so the admin can fix the customisation.
        frappe.log_error(
            f"Invalid placeholder in Creche Reminder Settings subject/message: "
            f"{subject_template!r} / {message_template!r}",
            "Creche Month-End Utilisation Reminder",
        )
        subject = DEFAULT_MONTH_END_SUBJECT.format(**placeholders)
        message = DEFAULT_MONTH_END_MESSAGE.format(**placeholders)

    frappe.sendmail(
        recipients=[email],
        subject=subject,
        message=message,
    )
    return True
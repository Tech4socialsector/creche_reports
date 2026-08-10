import frappe
from frappe.utils import getdate, add_months, get_first_day, get_last_day


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

        send_email(budget, report_month)


def send_email(budget, report_month):

    email = frappe.db.get_value(
        "Creche Partners",
        budget.partner_id,
        "email"
    )

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
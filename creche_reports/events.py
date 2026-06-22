import frappe

def send_import_email(doc, method=None):
    recipients = [
        "vijay.singh@azimpremjifoundation.org"
        "augustin.moses@azimpremjifoundation.org"
    ]

    cc = [
        "abhisek.dutta@azimpremjifoundation.org",
    ]

    site_url = frappe.utils.get_url()

    record_url = (
        f"{site_url}/desk/creche-budget/"
        f"{doc.name}"
    )

    timestamp = frappe.utils.now_datetime().strftime("%d %b %Y, %I:%M %p")

    partner_name = getattr(doc, "partner_name", None) or ""
    partner_suffix = f" for {partner_name}" if partner_name else ""

    grant_id = getattr(doc, "grant_id", None) or "N/A"

    budget_reference = getattr(doc, "budget_reference_name", None) or "N/A"

    frappe.sendmail(

        recipients=recipients,
        cc=cc,
        subject=f"Creche Budget Imported — {doc.doctype} · {doc.name}{partner_suffix} · Ref: {budget_reference}",

        message=f"""
        <div style="
            font-family: Arial, sans-serif;
            max-width: 620px;
            margin: auto;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
        ">

            <!-- HEADER -->
            <div style="background: #1e3a5f; padding: 28px 32px;">
                <span style="font-size: 18px; font-weight: 600; color: #ffffff;">
                    Creche Budget MIS
                </span>
                <p style="margin: 8px 0 0; font-size: 13px; color: rgba(255,255,255,0.6);">
                    Management Information System &middot; Automated Notification
                </p>
            </div>

            <!-- SUCCESS BANNER -->
            <div style="
                background: #eaf3de;
                border-bottom: 1px solid #c0dd97;
                padding: 14px 32px;
            ">
                <span style="font-size: 14px; font-weight: 600; color: #27500a;">
                    Record imported successfully
                </span>
            </div>

            <!-- BODY -->
            <div style="padding: 28px 32px;">

                <p style="font-size: 15px; color: #111827; font-weight: 600; margin: 0 0 6px;">Hello,</p>
                <p style="font-size: 14px; color: #6b7280; line-height: 1.7; margin: 0 0 24px;">
                    A new record has been successfully imported into the
                    <strong>Creche Budget MIS</strong> system. Please review
                    the details below and open the record to verify the data is correct.
                </p>

                <!-- DETAILS TABLE -->
                <div style="background: #f9fafb; border-radius: 8px; overflow: hidden;">

                    <div style="
                        display: flex; align-items: center; gap: 12px;
                        padding: 12px 16px;
                        border-bottom: 1px solid #e5e7eb;
                    ">
                        <span style="font-size: 13px; color: #6b7280; width: 130px; flex-shrink: 0;">Document type</span>
                        <span style="font-size: 13px; color: #111827; font-weight: 600;">
                            {doc.doctype}
                        </span>
                    </div>

                    <div style="
                        display: flex; align-items: center; gap: 12px;
                        padding: 12px 16px;
                        border-bottom: 1px solid #e5e7eb;
                    ">
                        <span style="font-size: 13px; color: #6b7280; width: 130px; flex-shrink: 0;">Partner name</span>
                        <span style="font-size: 13px; color: #111827; font-weight: 600;">
                            {partner_name}
                        </span>
                    </div>

                    <div style="
                        display: flex; align-items: center; gap: 12px;
                        padding: 12px 16px;
                        border-bottom: 1px solid #e5e7eb;
                    ">
                        <span style="font-size: 13px; color: #6b7280; width: 130px; flex-shrink: 0;">Record ID</span>
                        <span style="font-size: 13px; color: #111827; font-weight: 600; font-family: monospace;">
                            {doc.name}
                        </span>
                    </div>

                    <div style="
                        display: flex; align-items: center; gap: 12px;
                        padding: 12px 16px;
                        border-bottom: 1px solid #e5e7eb;
                    ">
                        <span style="font-size: 13px; color: #6b7280; width: 130px; flex-shrink: 0;">Grant ID</span>
                        <span style="font-size: 13px; color: #111827; font-weight: 600; font-family: monospace;">
                            {grant_id}
                        </span>
                    </div>

                    <div style="
                        display: flex; align-items: center; gap: 12px;
                        padding: 12px 16px;
                        border-bottom: 1px solid #e5e7eb;
                    ">
                        <span style="font-size: 13px; color: #6b7280; width: 130px; flex-shrink: 0;">Budget reference</span>
                        <span style="font-size: 13px; color: #111827; font-weight: 600; font-family: monospace;">
                            {budget_reference}
                        </span>
                    </div>

                    <div style="
                        display: flex; align-items: center; gap: 12px;
                        padding: 12px 16px;
                        border-bottom: 1px solid #e5e7eb;
                    ">
                        <span style="font-size: 13px; color: #6b7280; width: 130px; flex-shrink: 0;">Imported by</span>
                        <span style="font-size: 13px; color: #111827; font-weight: 600;">
                            {frappe.session.user}
                        </span>
                    </div>

                    <div style="
                        display: flex; align-items: center; gap: 12px;
                        padding: 12px 16px;
                    ">
                        <span style="font-size: 13px; color: #6b7280; width: 130px; flex-shrink: 0;">Timestamp</span>
                        <span style="font-size: 13px; color: #111827; font-weight: 600;">
                            {timestamp}
                        </span>
                    </div>

                </div>

                <!-- CTA BUTTON -->
                <div style="margin-top: 28px; text-align: center;">
                    <a href="{record_url}" style="
                        display: inline-block;
                        background: #1e3a5f;
                        color: #ffffff;
                        padding: 13px 30px;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        text-decoration: none;
                    ">
                        Open Record
                    </a>
                </div>

                <!-- FALLBACK URL -->
                <div style="
                    margin-top: 20px;
                    padding: 12px 16px;
                    background: #eff6ff;
                    border-radius: 8px;
                    border-left: 3px solid #3b82f6;
                ">
                    <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">
                        If the button doesn't work, copy this link:
                    </p>
                    <a href="{record_url}" style="
                        font-size: 12px;
                        color: #1d4ed8;
                        font-family: monospace;
                        word-break: break-all;
                    ">
                        {record_url}
                    </a>
                </div>

            </div>

            <!-- FOOTER -->
            <div style="
                border-top: 1px solid #e5e7eb;
                padding: 16px 32px;
                display: flex;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 8px;
            ">
                <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                    Sent by Creche Budget MIS &middot; Do not reply to this email
                </p>
                <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                    This is an automated message
                </p>
            </div>

        </div>
        """
    )


# def send_utilisation_import_email(doc, method=None):
#     recipients = [
#         "vijay.singh@azimpremjifoundation.org",
#         # "augustin.moses@azimpremjifoundation.org"

#     ]

#     cc = [
#         "abhisek.dutta@azimpremjifoundation.org",
#     ]

#     site_url = frappe.utils.get_url()

#     record_url = (
#         f"{site_url}/desk/creche-utilisation/"
#         f"{doc.name}"
#     )

#     timestamp = frappe.utils.now_datetime().strftime("%d %b %Y, %I:%M %p")

#     partner_name = getattr(doc, "partner_name", None) or "N/A"
#     partner_suffix = f" for {partner_name}" if partner_name else ""

#     budget_reference_name = getattr(doc, "budget_reference_name", None) or "N/A"

#     financial_year = getattr(doc, "financial_year", None) or "N/A"

#     month = getattr(doc, "month", None) or "N/A"

#     total_utilisation = frappe.utils.fmt_money(
#         getattr(doc, "total_utilisation", 0) or 0
#     )

#     balance_amount = frappe.utils.fmt_money(
#         getattr(doc, "balance_amount", 0) or 0
#     )

#     frappe.sendmail(

#         recipients=recipients,
#         cc=cc,
#         subject=f"Creche Utilisation Imported — {doc.name}{partner_suffix} · {month} · {financial_year}",

#         message=f"""
#         <div style="
#             font-family: Arial, sans-serif;
#             max-width: 620px;
#             margin: auto;
#             background: #ffffff;
#             border: 1px solid #e5e7eb;
#             border-radius: 12px;
#             overflow: hidden;
#         ">

#             <!-- HEADER -->
#             <div style="background: #1e3a5f; padding: 28px 32px;">
#                 <span style="font-size: 18px; font-weight: 600; color: #ffffff;">
#                     Creche Budget MIS
#                 </span>
#                 <p style="margin: 8px 0 0; font-size: 13px; color: rgba(255,255,255,0.6);">
#                     Management Information System &middot; Automated Notification
#                 </p>
#             </div>

#             <!-- SUCCESS BANNER -->
#             <div style="
#                 background: #eaf3de;
#                 border-bottom: 1px solid #c0dd97;
#                 padding: 14px 32px;
#             ">
#                 <span style="font-size: 14px; font-weight: 600; color: #27500a;">
#                     Record imported successfully
#                 </span>
#             </div>

#             <!-- BODY -->
#             <div style="padding: 28px 32px;">

#                 <p style="font-size: 15px; color: #111827; font-weight: 600; margin: 0 0 6px;">Hello,</p>
#                 <p style="font-size: 14px; color: #6b7280; line-height: 1.7; margin: 0 0 24px;">
#                     A new record has been successfully imported into the
#                     <strong>Creche Budget MIS</strong> system. Please review
#                     the details below and open the record to verify the data is correct.
#                 </p>

#                 <!-- DETAILS TABLE -->
#                 <div style="background: #f9fafb; border-radius: 8px; overflow: hidden;">

#                     <div style="
#                         display: flex; align-items: center; gap: 12px;
#                         padding: 12px 16px;
#                         border-bottom: 1px solid #e5e7eb;
#                     ">
#                         <span style="font-size: 13px; color: #6b7280; width: 160px; flex-shrink: 0;">Document type</span>
#                         <span style="font-size: 13px; color: #111827; font-weight: 600;">
#                             {doc.doctype}
#                         </span>
#                     </div>

#                     <div style="
#                         display: flex; align-items: center; gap: 12px;
#                         padding: 12px 16px;
#                         border-bottom: 1px solid #e5e7eb;
#                     ">
#                         <span style="font-size: 13px; color: #6b7280; width: 160px; flex-shrink: 0;">Record ID</span>
#                         <span style="font-size: 13px; color: #111827; font-weight: 600; font-family: monospace;">
#                             {doc.name}
#                         </span>
#                     </div>

#                     <div style="
#                         display: flex; align-items: center; gap: 12px;
#                         padding: 12px 16px;
#                         border-bottom: 1px solid #e5e7eb;
#                     ">
#                         <span style="font-size: 13px; color: #6b7280; width: 160px; flex-shrink: 0;">Partner name</span>
#                         <span style="font-size: 13px; color: #111827; font-weight: 600;">
#                             {partner_name}
#                         </span>
#                     </div>

#                     <div style="
#                         display: flex; align-items: center; gap: 12px;
#                         padding: 12px 16px;
#                         border-bottom: 1px solid #e5e7eb;
#                     ">
#                         <span style="font-size: 13px; color: #6b7280; width: 160px; flex-shrink: 0;">Budget reference</span>
#                         <span style="font-size: 13px; color: #111827; font-weight: 600; font-family: monospace;">
#                             {budget_reference_name}
#                         </span>
#                     </div>

#                     <div style="
#                         display: flex; align-items: center; gap: 12px;
#                         padding: 12px 16px;
#                         border-bottom: 1px solid #e5e7eb;
#                     ">
#                         <span style="font-size: 13px; color: #6b7280; width: 160px; flex-shrink: 0;">Financial year</span>
#                         <span style="font-size: 13px; color: #111827; font-weight: 600;">
#                             {financial_year}
#                         </span>
#                     </div>

#                     <div style="
#                         display: flex; align-items: center; gap: 12px;
#                         padding: 12px 16px;
#                         border-bottom: 1px solid #e5e7eb;
#                     ">
#                         <span style="font-size: 13px; color: #6b7280; width: 160px; flex-shrink: 0;">Month</span>
#                         <span style="font-size: 13px; color: #111827; font-weight: 600;">
#                             {month}
#                         </span>
#                     </div>

#                     <div style="
#                         display: flex; align-items: center; gap: 12px;
#                         padding: 12px 16px;
#                         border-bottom: 1px solid #e5e7eb;
#                     ">
#                         <span style="font-size: 13px; color: #6b7280; width: 160px; flex-shrink: 0;">Total utilisation</span>
#                         <span style="font-size: 13px; color: #111827; font-weight: 600;">
#                             {total_utilisation}
#                         </span>
#                     </div>

#                     <div style="
#                         display: flex; align-items: center; gap: 12px;
#                         padding: 12px 16px;
#                         border-bottom: 1px solid #e5e7eb;
#                     ">
#                         <span style="font-size: 13px; color: #6b7280; width: 160px; flex-shrink: 0;">Bank + Cash balance</span>
#                         <span style="font-size: 13px; color: #111827; font-weight: 600;">
#                             {balance_amount}
#                         </span>
#                     </div>

#                     <div style="
#                         display: flex; align-items: center; gap: 12px;
#                         padding: 12px 16px;
#                         border-bottom: 1px solid #e5e7eb;
#                     ">
#                         <span style="font-size: 13px; color: #6b7280; width: 160px; flex-shrink: 0;">Imported by</span>
#                         <span style="font-size: 13px; color: #111827; font-weight: 600;">
#                             {frappe.session.user}
#                         </span>
#                     </div>

#                     <div style="
#                         display: flex; align-items: center; gap: 12px;
#                         padding: 12px 16px;
#                     ">
#                         <span style="font-size: 13px; color: #6b7280; width: 160px; flex-shrink: 0;">Imported at</span>
#                         <span style="font-size: 13px; color: #111827; font-weight: 600;">
#                             {timestamp}
#                         </span>
#                     </div>

#                 </div>

#                 <!-- CTA BUTTON -->
#                 <div style="margin-top: 28px; text-align: center;">
#                     <a href="{record_url}" style="
#                         display: inline-block;
#                         background: #1e3a5f;
#                         color: #ffffff;
#                         padding: 13px 30px;
#                         border-radius: 8px;
#                         font-size: 14px;
#                         font-weight: 600;
#                         text-decoration: none;
#                     ">
#                         Open Record
#                     </a>
#                 </div>

#                 <!-- FALLBACK URL -->
#                 <div style="
#                     margin-top: 20px;
#                     padding: 12px 16px;
#                     background: #eff6ff;
#                     border-radius: 8px;
#                     border-left: 3px solid #3b82f6;
#                 ">
#                     <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">
#                         If the button doesn't work, copy this link:
#                     </p>
#                     <a href="{record_url}" style="
#                         font-size: 12px;
#                         color: #1d4ed8;
#                         font-family: monospace;
#                         word-break: break-all;
#                     ">
#                         {record_url}
#                     </a>
#                 </div>

#             </div>

#             <!-- FOOTER -->
#             <div style="
#                 border-top: 1px solid #e5e7eb;
#                 padding: 16px 32px;
#                 display: flex;
#                 justify-content: space-between;
#                 flex-wrap: wrap;
#                 gap: 8px;
#             ">
#                 <p style="font-size: 12px; color: #9ca3af; margin: 0;">
#                     Sent by Creche Budget MIS &middot; Do not reply to this email
#                 </p>
#                 <p style="font-size: 12px; color: #9ca3af; margin: 0;">
#                     This is an automated message
#                 </p>
#             </div>

#         </div>
#         """
#     )

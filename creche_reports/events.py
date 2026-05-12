import frappe


def send_import_email(doc, method):

    recipients = [
        "postbox7823@gamil.com"
    ]

    frappe.sendmail(

        recipients=recipients,

        subject=f"""
            New Record Imported :
            {doc.name}
        """,

        message=f"""
            <h3>Record Imported Successfully</h3>

            <p>
                Doctype:
                <b>{doc.doctype}</b>
            </p>

            <p>
                Record ID:
                <b>{doc.name}</b>
            </p>
        """
    )

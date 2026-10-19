"""What may leave the server for the external language model.

creche_reports data is organizational/financial (partner budgets, disbursements,
utilisation, caregiver salary aggregates) rather than individual case data, so
there is no household/respondent-style PII in these doctypes today. The
redaction layers below are kept anyway, generically, so a future doctype or
field (e.g. an individual caregiver's bank account number or contact details)
is covered automatically rather than needing someone to remember to update
this file first:
  1. data_service never returns fields in PERSONAL_FIELDNAMES, or Phone / Email /
     Geolocation fields, whatever an AI Data Policy says.
  2. scrub() removes anything that still looks like a phone number, e-mail
     address, PAN/Aadhaar-shaped number, bank account number, GPS position or
     file link from every text sent to the model (the user's own typing, the
     conversation history and the tool results).
  3. Requests ask the provider to route only to endpoints that do not store or
     train on the data.
"""

import re

# People's names: the model refers to people by record ID only.
NAME_FIELDNAMES = {
	"partner_name", "contact_person", "full_name", "first_name", "last_name",
}
# Everything that identifies, locates or contacts a person. The model never sees these values: it gets a
# placeholder (see token()) that the app replaces with the real value, for the signed-in user only, in the reply.
PERSONAL_FIELDNAMES = NAME_FIELDNAMES | {
	"mobile_number", "contact_number", "phone", "email", "address", "bank_account_number",
	"account_number", "ifsc_code", "latitude", "longitude", "geo_location", "date_of_birth",
	"dob", "user",
}
PERSONAL_OPTIONS = {"Phone", "Email", "URL"}
PERSONAL_FIELDTYPES = {"Geolocation", "Phone"}

_PATTERNS = (
	(re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"), "[email]"),
	(re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b"), "[id number]"),
	(re.compile(r"(?<!\d)(?:\+?91[\s-]?)?\d{5}[\s-]?\d{5}(?!\d)"), "[phone]"),
	(re.compile(r"(?<!\d)\d{4}[\s-]?\d{4}[\s-]?\d{4}(?!\d)"), "[id number]"),
	(re.compile(r"(?<!\d)-?\d{1,3}\.\d{4,}(?!\d)"), "[location]"),
	(re.compile(r"/(?:private/)?files/\S+"), "[file]"),
)


def scrub_text(text):
	for pattern, replacement in _PATTERNS:
		text = pattern.sub(replacement, text)
	return text


def scrub(value):
	"""scrub_text applied to every string inside a message, a tool result, or any nested list/dict."""
	if isinstance(value, str):
		return scrub_text(value)
	if isinstance(value, dict):
		return {key: scrub(item) for key, item in value.items()}
	if isinstance(value, (list, tuple)):
		return [scrub(item) for item in value]
	return value


def is_personal_field(df):
	return (
		df.fieldname in PERSONAL_FIELDNAMES
		or df.fieldtype in PERSONAL_FIELDTYPES
		or (df.fieldtype == "Data" and (df.options or "") in PERSONAL_OPTIONS)
	)


# A placeholder for one personal value: [[Doctype|RECORD-ID|fieldname]]
TOKEN_RE = re.compile(r"\[\[([^|\[\]]{1,80})\|([^|\[\]]{1,140})\|([a-z0-9_]{1,64})\]\]")


def token(doctype, name, fieldname):
	return f"[[{doctype}|{name}|{fieldname}]]"

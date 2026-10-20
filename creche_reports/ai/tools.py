"""Tool implementations the AI assistant can call.

Every data tool is a thin wrapper over creche_reports.ai.data_service - the
one place that decides what the assistant may see or change (default-deny
AI Data Policy per doctype, the signed-in user's own permissions including
field-level ones, hidden/read-only field rules, query-shape limits, audit
log). Nothing here ever uses ignore_permissions or switches user; read that
module's docstring before adding a tool, and route any new data access
through it rather than calling frappe directly.
"""

import frappe
from frappe import _

from creche_reports.ai import blocks, data_service


def list_doctypes():
	"""Doctypes the assistant may use and this user can read - the assistant's
	grounding for "what data exists here"."""
	return data_service.list_available_doctypes()


def get_doctype_meta(doctype):
	"""Readable fields of `doctype` (never hidden ones), each flagged with
	whether the assistant may set it - so it knows what a form would take."""
	return data_service.describe_doctype(doctype)


def search_records(doctype, filters=None, fields=None, limit=20):
	"""List records the current user can read, with only fields the assistant
	is allowed to see."""
	return data_service.search(doctype, filters=filters, fields=fields, limit=limit)


def get_record(doctype, name):
	"""One record (and, where allowed, its child-table rows), minus every
	field the assistant or this user may not see."""
	return data_service.read(doctype, name)


def count_records(doctype, group_by, filters=None):
	"""How many records have each value of one field - the numbers behind a chart or a summary."""
	return data_service.count_by(doctype, group_by, filters=filters)


def get_dashboard_summary(filters=None):
	"""The real, permission-scoped totals (sum of total_budget/total_disbursement/
	total_utilisation/etc.) across every matching budget - the same numbers the
	Dashboard page itself shows. Always use this for a total/sum, never add up
	search_records rows by hand."""
	return data_service.get_dashboard_summary(filters=filters)


def show_table(title, columns, rows):
	"""Put a table into the chat for the user."""
	return blocks.add_table(title, columns, rows)


def show_chart(title, chart_type, labels, series, unit=None):
	"""Put a chart (bar, line, pie or donut) into the chat for the user."""
	return blocks.add_chart(title, chart_type, labels, series, unit=unit)


def create_record(doctype, values):
	"""Create a record as the current user, setting only fields the assistant
	is allowed to write."""
	return data_service.create(doctype, values)


def update_record(doctype, name, values):
	"""Update fields on an existing record, changing only fields the
	assistant is allowed to write."""
	return data_service.update(doctype, name, values)


def navigate_to(doctype=None, name=None):
	"""Not a data operation - just a validated pointer the frontend turns into
	a router.push. Still permission-checked so the assistant can't direct a
	user toward a form/record they can't actually open."""
	if doctype:
		data_service.require_access(doctype)
		if name and not frappe.has_permission(doctype, ptype="read", doc=name):
			frappe.throw(_("You do not have permission to open this record"), frappe.PermissionError)
	return {"type": "navigate", "doctype": doctype, "name": name}


TOOL_FUNCTIONS = {
	"list_doctypes": list_doctypes,
	"get_doctype_meta": get_doctype_meta,
	"search_records": search_records,
	"count_records": count_records,
	"get_dashboard_summary": get_dashboard_summary,
	"show_table": show_table,
	"show_chart": show_chart,
	"get_record": get_record,
	"create_record": create_record,
	"update_record": update_record,
	"navigate_to": navigate_to,
}


TOOL_SCHEMAS = [
	{
		"type": "function",
		"function": {
			"name": "list_doctypes",
			"description": "List the data types (doctypes) available in this app for the current user. Call this first if unsure what data exists.",
			"parameters": {"type": "object", "properties": {}},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "get_doctype_meta",
			"description": "Get the field list (name, label, type, required) for a doctype. Always call this before create_record or update_record so you know which fields are required and never guess a required value the user has not given you - ask them instead.",
			"parameters": {
				"type": "object",
				"properties": {"doctype": {"type": "string"}},
				"required": ["doctype"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "search_records",
			"description": "Search/list records of a doctype the user can see, optionally filtered. Use this to answer questions like counts, lookups, or budget/utilisation/disbursement status for a partner.",
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {"type": "string"},
					"filters": {
						"type": "object",
						"description": 'Frappe filter dict, e.g. {"partner_id": "PARTNER-0001"}. Omit for no filter.',
					},
					"fields": {
						"type": "array",
						"items": {"type": "string"},
						"description": "Fieldnames to return. Omit to use the doctype's default list columns.",
					},
					"limit": {"type": "integer", "description": "Max rows, default 20, hard cap 50."},
				},
				"required": ["doctype"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "count_records",
			"description": "Count the records of a doctype grouped by one plain field (for example state, or district). Returns [{value, count}]. Use it for any \"how many per ...\" question and as the numbers for a chart.",
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {"type": "string"},
					"group_by": {"type": "string", "description": "Fieldname to group by."},
					"filters": {"type": "object", "description": "Optional Frappe filter dict."},
				},
				"required": ["doctype", "group_by"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "get_dashboard_summary",
			"description": "Get the real total budget, disbursement, utilisation, bank balance and related percentages across every matching budget - the exact same numbers the Dashboard page's own Financial Overview cards show. This is the ONLY correct way to answer any \"what is the total/sum of...\" question (approved budget, disbursement, utilisation, bank balance, etc.), for one partner or across all of them. NEVER compute a total yourself by adding up rows from search_records or count_records - those are capped at 50 rows each, so a manual sum silently undercounts the moment there are more matching records than that, which is wrong (and was reported wrong in production) far more easily than it looks.",
			"parameters": {
				"type": "object",
				"properties": {
					"filters": {
						"type": "object",
						"description": 'Optional filters, all plain Frappe filter dicts on Creche Budget: partner_id, budget_ref, grant_id, state, district, block, budget_status (e.g. {"budget_status": ["Active"]} for active-only), start_date, end_date. Omit any you don\'t need - omitting all of them totals across everything the user can see.',
					},
				},
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "show_table",
			"description": "Show a table to the user in the chat (max 100 rows, 8 columns). Use it when the user asks for a table, list or comparison, with data you got from the other tools. If a cell would hold a placeholder you received from a tool, put it in the cell exactly as it is. Do not repeat the table in your text reply; add one short sentence about it.",
			"parameters": {
				"type": "object",
				"properties": {
					"title": {"type": "string"},
					"columns": {"type": "array", "items": {"type": "string"}},
					"rows": {"type": "array", "items": {"type": "array", "items": {}}, "description": "One list of cells per row, in column order."},
				},
				"required": ["title", "columns", "rows"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "show_chart",
			"description": "Show a chart to the user in the chat: bar (comparisons), line (change over time), pie or donut (shares of a whole, one series). Use only numbers you got from the other tools - never invent values. Do not describe the chart point by point in your text reply; add one short sentence.",
			"parameters": {
				"type": "object",
				"properties": {
					"title": {"type": "string"},
					"chart_type": {"type": "string", "enum": ["bar", "line", "pie", "donut"]},
					"labels": {"type": "array", "items": {"type": "string"}, "description": "Category or x-axis labels (max 30)."},
					"series": {
						"type": "array",
						"description": "Up to 4 series, each with a name and one number per label.",
						"items": {
							"type": "object",
							"properties": {"name": {"type": "string"}, "data": {"type": "array", "items": {"type": "number"}}},
							"required": ["name", "data"],
						},
					},
					"unit": {"type": "string", "description": 'Optional unit shown with values, e.g. "INR".'},
				},
				"required": ["title", "chart_type", "labels", "series"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "get_record",
			"description": "Get the full field values of one specific record by name.",
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {"type": "string"},
					"name": {"type": "string"},
				},
				"required": ["doctype", "name"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "create_record",
			"description": "Create a new record. Call get_doctype_meta first, confirm the values with the user in plain language, and only then call this. Never invent a value for a required field - ask the user for it instead.",
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {"type": "string"},
					"values": {"type": "object", "description": "fieldname -> value map"},
				},
				"required": ["doctype", "values"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "update_record",
			"description": "Update fields on an existing record. Confirm the change with the user before calling this.",
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {"type": "string"},
					"name": {"type": "string"},
					"values": {"type": "object", "description": "fieldname -> new value map"},
				},
				"required": ["doctype", "name", "values"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "navigate_to",
			"description": 'Send the user to a list page (doctype only) or a specific record\'s form (doctype + name) in the app. Use this when the user asks to "open"/"go to"/"show me" something, or after creating a record if they might want to review it.',
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {"type": "string"},
					"name": {"type": "string", "description": "Omit to navigate to the list page instead of a specific record."},
				},
				"required": ["doctype"],
			},
		},
	},
]

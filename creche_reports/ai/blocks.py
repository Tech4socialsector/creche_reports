"""Tables and charts the assistant can put into the chat.

The model describes them with the show_table / show_chart tools; this module checks the shape and size, keeps
them for the current request, and (after the model has finished) fills in any personal-detail placeholders for
the signed-in user - so a table can show real values to the person asking while the model only ever handled
record IDs and numbers.
"""

import frappe
from frappe import _

from creche_reports.ai.data_service import rehydrate

MAX_TABLE_ROWS = 100
MAX_TABLE_COLUMNS = 8
MAX_CHART_POINTS = 30
MAX_SERIES = 4
MAX_TEXT = 160
CHART_TYPES = ("bar", "line", "pie", "donut")


def _blocks():
	if getattr(frappe.local, "creche_reports_ai_blocks", None) is None:
		frappe.local.creche_reports_ai_blocks = []
	return frappe.local.creche_reports_ai_blocks


def reset():
	frappe.local.creche_reports_ai_blocks = []


def _text(value):
	return "" if value is None else str(value)[:MAX_TEXT]


def add_table(title, columns, rows):
	if not isinstance(columns, list) or not columns or len(columns) > MAX_TABLE_COLUMNS:
		frappe.throw(_("A table needs between 1 and {0} columns.").format(MAX_TABLE_COLUMNS), frappe.ValidationError)
	if not isinstance(rows, list) or not rows:
		frappe.throw(_("A table needs at least one row."), frappe.ValidationError)
	clean_rows = []
	for row in rows[:MAX_TABLE_ROWS]:
		if not isinstance(row, (list, tuple)):
			frappe.throw(_("Each table row must be a list of cells."), frappe.ValidationError)
		cells = [_text(cell) for cell in list(row)[: len(columns)]]
		clean_rows.append(cells + [""] * (len(columns) - len(cells)))
	_blocks().append({"type": "table", "title": _text(title), "columns": [_text(c) for c in columns], "rows": clean_rows})
	return {"ok": True, "shown": "table", "rows": len(clean_rows)}


def _number(value):
	try:
		number = float(value)
	except (TypeError, ValueError):
		frappe.throw(_("Chart values must be numbers."), frappe.ValidationError)
	if number != number or number in (float("inf"), float("-inf")):
		frappe.throw(_("Chart values must be numbers."), frappe.ValidationError)
	return int(number) if number == int(number) else round(number, 4)


def add_chart(title, chart_type, labels, series, unit=None):
	if chart_type not in CHART_TYPES:
		frappe.throw(_("Chart type must be one of: {0}.").format(", ".join(CHART_TYPES)), frappe.ValidationError)
	if not isinstance(labels, list) or not labels or len(labels) > MAX_CHART_POINTS:
		frappe.throw(_("A chart needs between 1 and {0} labels.").format(MAX_CHART_POINTS), frappe.ValidationError)
	if not isinstance(series, list) or not series or len(series) > MAX_SERIES:
		frappe.throw(_("A chart needs between 1 and {0} series.").format(MAX_SERIES), frappe.ValidationError)
	clean_series = []
	for item in series:
		if not isinstance(item, dict) or not isinstance(item.get("data"), list):
			frappe.throw(_("Each series needs a name and a list of values."), frappe.ValidationError)
		data = [_number(v) for v in item["data"][: len(labels)]]
		clean_series.append({"name": _text(item.get("name")) or _("Value"), "data": data + [0] * (len(labels) - len(data))})
	if chart_type in ("pie", "donut"):
		clean_series = clean_series[:1]
		if any(v < 0 for v in clean_series[0]["data"]):
			frappe.throw(_("A pie chart cannot have negative values."), frappe.ValidationError)
	_blocks().append(
		{"type": "chart", "chart": chart_type, "title": _text(title), "unit": _text(unit), "labels": [_text(l) for l in labels], "series": clean_series}
	)
	return {"ok": True, "shown": "chart"}


def collect():
	"""The blocks of this request, placeholders replaced by the real values for the signed-in user."""
	blocks = list(_blocks())
	reset()
	out = []
	for block in blocks:
		if block["type"] == "table":
			block = {
				**block,
				"title": rehydrate(block["title"]),
				"columns": [rehydrate(c) for c in block["columns"]],
				"rows": [[rehydrate(cell) for cell in row] for row in block["rows"]],
			}
		else:
			block = {**block, "title": rehydrate(block["title"]), "labels": [rehydrate(l) for l in block["labels"]]}
		out.append(block)
	return out

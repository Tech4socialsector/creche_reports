# Copyright (c) 2026, TFSS and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class SidebarItem(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF
		from creche_reports.creche_child.doctype.sidebar_item_child.sidebar_item_child import SidebarItemChild

		allowed_roles: DF.TableMultiSelect[DF.HasRole]
		enabled: DF.Check
		group_items: DF.Table[SidebarItemChild]
		icon: DF.Icon | None
		is_group: DF.Check
		item_name: DF.Data
		page_route: DF.Literal[None]
		section_break_group: DF.Data | None
		section_break_roles: DF.Data | None
		sequence_id: DF.Int
		target_doctype: DF.Link | None
	# end: auto-generated types

	def validate(self):
		# Imported inside the method, not at module load time: api/sidebar.py
		# also imports from this doctype's own cache-busting hooks (on_update/
		# on_trash below), so a module-level import here would create a import
		# cycle between the two files.
		from creche_reports.api.sidebar import ROUTABLE_DOCTYPES

		if self.is_group:
			if self.target_doctype or self.page_route:
				frappe.throw(
					_("A Group has no link of its own, it's a header for Group Items List below.")
				)
			if not self.group_items:
				frappe.throw(
					_("A Group must contain at least one item in Group Items List - an empty group is just clutter.")
				)
		else:
			if self.target_doctype and self.page_route:
				frappe.throw(_("Pick either a Doctype or a Page, not both."))
			if not self.target_doctype and not self.page_route:
				frappe.throw(_("Pick a Doctype or a Page, unless this item is a Group."))
			if self.target_doctype and self.target_doctype not in ROUTABLE_DOCTYPES:
				frappe.throw(
					_("{0} is not a doctype this app can link to from the sidebar.").format(
						frappe.bold(self.target_doctype)
					)
				)

		self._validate_sequence_id()
		self._validate_group_items()

	def _validate_sequence_id(self):
		# Two top-level items tied on the same Sequence ID don't error - they
		# just silently fall back to alphabetical-by-item-name order, which
		# looks like "my sequence change didn't take effect" to an admin who
		# only changed one of the two. Catching the collision here instead
		# makes the actual cause visible immediately, at save time.
		clashing = frappe.get_all(
			"Sidebar Item",
			filters={"sequence_id": self.sequence_id, "name": ["!=", self.name or ""]},
			fields=["name"],
			limit=1,
		)
		if clashing:
			frappe.throw(
				_("Sequence ID {0} is already used by {1} - pick a different number.").format(
					self.sequence_id, frappe.bold(clashing[0].name)
				)
			)

	def _validate_group_items(self):
		seen_sequence_ids = {}
		for row in self.group_items or []:
			if row.target_doctype and row.page_route:
				frappe.throw(
					_("Group Items List row {0}: pick either a Target Doctype or a Page, not both.").format(row.idx)
				)
			if not row.target_doctype and not row.page_route:
				frappe.throw(
					_("Group Items List row {0}: pick a Target Doctype or a Page.").format(row.idx)
				)
			# Unique within THIS group's own children only - a different
			# group's children are an independent list, so the same number
			# reused there is not a collision.
			if row.sequence_id in seen_sequence_ids:
				frappe.throw(
					_("Group Items List rows {0} and {1} both use Sequence ID {2} - pick different numbers.").format(
						seen_sequence_ids[row.sequence_id], row.idx, row.sequence_id
					)
				)
			seen_sequence_ids[row.sequence_id] = row.idx

	def on_update(self):
		_bust_sidebar_items_cache()

	def on_trash(self):
		_bust_sidebar_items_cache()


def _bust_sidebar_items_cache():
	# get_sidebar_items() caches per-user under f"{SIDEBAR_ITEMS_CACHE_KEY}:{user}"
	# (its result depends on the signed-in user's roles/permissions) -
	# delete_keys does a prefix-wildcard match, clearing every user's entry
	# at once, since this row's change can affect what ANY user sees, not
	# just whoever saved it. A Sidebar Item Child row only ever changes via
	# its parent Sidebar Item being saved (it's a plain child table row, not
	# independently saveable), so this same on_update also covers every
	# group_items edit - there's no separate child-doctype hook to wire.
	from creche_reports.api.sidebar import SIDEBAR_ITEMS_CACHE_KEY

	frappe.cache().delete_keys(SIDEBAR_ITEMS_CACHE_KEY)

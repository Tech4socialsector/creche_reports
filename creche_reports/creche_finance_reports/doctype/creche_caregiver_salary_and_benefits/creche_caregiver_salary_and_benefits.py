# Copyright (c) 2026, TFSS and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class CrecheCaregiverSalaryandBenefits(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		amended_from: DF.Link | None
		average_salary_of_caregivers: DF.Currency
		block: DF.Link
		creche_ruralurban: DF.Literal["", "Rural", "Urban"]
		district: DF.Link
		esi: DF.Literal["", "Yes", "No"]
		esi_employee_contribution: DF.Percent
		esi_employer_contribution: DF.Percent
		health_insurance: DF.Literal["", "Yes", "No"]
		health_insurance_amount: DF.Currency
		life_accidental_insurance: DF.Literal["", "Yes", "No"]
		life_accidental_insurance_amount: DF.Currency
		maximum_salary_of_caregiver: DF.Currency
		minimum_salary_of_caregiver: DF.Currency
		partner_id: DF.Link
		partner_name: DF.Data | None
		pf: DF.Literal["", "Yes", "No"]
		pf_employee_contribution: DF.Percent
		pf_employer_contribution: DF.Percent
		state: DF.Link
		tds_tax_deducted_at_source: DF.Literal["", "Yes", "No"]
		total_no_of_current_caregivers: DF.Int
	# end: auto-generated types

	pass

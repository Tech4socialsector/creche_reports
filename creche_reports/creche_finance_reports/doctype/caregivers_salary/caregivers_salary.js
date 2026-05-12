// Copyright (c) 2026, TFSS and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Caregivers Salary", {
// 	refresh(frm) {

// 	},
// });

frappe.ui.form.on('Caregivers Salary', {
    refresh(frm) {
        frm.trigger('setup_caregiver_salary_auto_open');
    },

    setup_caregiver_salary_auto_open(frm) {
        setTimeout(() => {
            const salary_field = frm.get_field('table_isll'); 

            if (salary_field && salary_field.grid) {
                const grid = salary_field.grid;

                if (!grid.__original_add_new_row) {
                    grid.__original_add_new_row = grid.add_new_row;
                }

                grid.add_new_row = function (idx, callback, show_dialog = true) {
                    const new_row = grid.__original_add_new_row.call(this, idx, callback);

                    if (new_row && show_dialog) {
                        setTimeout(() => {
                            try {
                                grid.open_form_if_editable(new_row);
                            } catch (error) {
                                setTimeout(() => {
                                    try {
                                        const row_wrapper = grid.grid_rows_by_docname[new_row.name];
                                        if (row_wrapper && row_wrapper.show_form) {
                                            row_wrapper.show_form();
                                        }
                                    } catch (e2) {}
                                }, 50);
                            }
                        }, 150);
                    }

                    return new_row;
                };

            } else {
                setTimeout(() => frm.trigger('setup_caregiver_salary_auto_open'), 400);
            }
        }, 200);
    }
});


// 2. CHILD TABLE LOGIC
frappe.ui.form.on("Caregivers Salary batch items", {

    recruited_since(frm, cdt, cdn) {
        validate_row(frm, cdt, cdn);
    },

    "1st_increment"(frm, cdt, cdn) {
        validate_row(frm, cdt, cdn);
    },

    "2nd_increment"(frm, cdt, cdn) {
        validate_row(frm, cdt, cdn);
    }
});

function validate_row(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    let recruited   = parseDate(row.recruited_since);
    let first_inc   = parseDate(row["1st_increment"]);
    let second_inc  = parseDate(row["2nd_increment"]);
    let today       = new Date();

    // 1) Recruited Since — cannot be future
    if (row.recruited_since && recruited > today) {
        frappe.show_alert({
            message: "Recruited Since cannot be a future date.",
            indicator: "red"
        }, 5);
        frappe.model.set_value(cdt, cdn, "recruited_since", "");
        frappe.model.set_value(cdt, cdn, "duration_of_service", "");
        // Clear dependents too since the base is now invalid
        frappe.model.set_value(cdt, cdn, "1st_increment", "");
        frappe.model.set_value(cdt, cdn, "2nd_increment", "");
        frm.refresh_field("table_isll");
        return;
    }

    // ✔ Update Duration whenever recruited_since is valid
    if (row.recruited_since) {
        let months = calc_total_months(row.recruited_since);
        frappe.model.set_value(cdt, cdn, "duration_of_service", `${months} Months`);
    } else {
        frappe.model.set_value(cdt, cdn, "duration_of_service", "");
    }

    // 2) 1st Increment — must be > recruited_since
    if (row["1st_increment"]) {
        if (!row.recruited_since) {
            frappe.show_alert({
                message: "Please fill Recruited before setting 1st Increment.",
                indicator: "red"
            }, 5);
            frappe.model.set_value(cdt, cdn, "1st_increment", "");
            frappe.model.set_value(cdt, cdn, "2nd_increment", "");
            frm.refresh_field("table_isll");
            return;
        }

        if (first_inc <= recruited) {
            frappe.show_alert({
                message: "1st Increment must be greater than Recruited date.",
                indicator: "red"
            }, 5);
            frappe.model.set_value(cdt, cdn, "1st_increment", "");
            frappe.model.set_value(cdt, cdn, "2nd_increment", "");
            frm.refresh_field("table_isll");
            return;
        }
    }

    // 3) 2nd Increment — must be > 1st Increment
    if (row["2nd_increment"]) {
        if (!row["1st_increment"]) {
            frappe.show_alert({
                message: "Please fill 1st Increment before setting 2nd Increment date.",
                indicator: "red"
            }, 5);
            frappe.model.set_value(cdt, cdn, "2nd_increment", "");
            frm.refresh_field("table_isll");
            return;
        }

        if (second_inc <= first_inc) {
            frappe.show_alert({
                message: "2nd Increment must be greater than 1st Increment date.",
                indicator: "red"
            }, 5);
            frappe.model.set_value(cdt, cdn, "2nd_increment", "");
            frm.refresh_field("table_isll");
            return;
        }
    }

    frm.refresh_field("table_isll");
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    let parts = dateStr.split("-");
    let formatted =
        parts[2] && parts[2].length === 4
            ? `${parts[2]}-${parts[1]}-${parts[0]}`
            : dateStr;
    let d = new Date(formatted);
    return isNaN(d) ? null : d;
}

function calc_total_months(dateStr) {
    let d = parseDate(dateStr);
    if (!d) return null;

    let today = new Date();
    let totalMonths = (today.getFullYear() - d.getFullYear()) * 12;
    totalMonths += today.getMonth() - d.getMonth();

    if (today.getDate() < d.getDate()) totalMonths -= 1;

    return Math.max(totalMonths, 0);
}
// Copyright (c) 2026, TFSS and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Creche Budget", {
// 	refresh(frm) {

// 	},
// });



frappe.ui.form.on('Creche Budget', {

    refresh: function(frm) {

        if (!frm.doc.financial_year) {

            let today = new Date();
            let year = today.getFullYear();
            let month = today.getMonth() + 1;

            let start_year;
            let end_year;

            // Financial Year starts from April
            if (month >= 4) {
                start_year = year;
                end_year = String(year + 1).slice(-2);
            } else {
                start_year = year - 1;
                end_year = String(year).slice(-2);
            }

            let financial_year = `${start_year}-${end_year}`;

            frm.set_value('financial_year', financial_year);
        }
        if(doc.total_budget==""||doc.total_budget==null){
        calculate_parent_total(frm);
    }
    },
    
    // Start Date Change
    start_date: function(frm) {
        validate_dates(frm);
    },

    // End Date Change
    end_date: function(frm) {
        validate_dates(frm);
    }

    
});


frappe.ui.form.on('Budget Items', {
    year_1: function(frm, cdt, cdn) {
        calculate_total(frm, cdt, cdn);
    },

    year_2: function(frm, cdt, cdn) {
        calculate_total(frm, cdt, cdn);
    },

    year_3: function(frm, cdt, cdn) {
        calculate_total(frm, cdt, cdn);
    },
    total_amount: function(frm, cdt, cdn) {
        split_total(frm, cdt, cdn);
        calculate_parent_total(frm);
        frappe.show_alert({
        message: __('Total Amount Updated'),
        indicator: 'green'
    }, 2);
    }

});

// Date Validation
function validate_dates(frm) {

    if (frm.doc.start_date && frm.doc.end_date) {

        if (frm.doc.end_date < frm.doc.start_date) {
            frm.set_value('end_date', '');
            frappe.show_alert({
                message: __('Please select a valid End Date'),
                indicator: 'red'
            }, 3);
        }
    }
}

// Calculate Row Total
function calculate_total(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let total =
        flt(row.year_1) +
        flt(row.year_2) +
        flt(row.year_3);
    frappe.model.set_value(cdt, cdn, 'total_amount', total);
    calculate_parent_total(frm);
}


// Split Total into 3 
function split_total(frm, cdt, cdn) {

    let row = locals[cdt][cdn];
    if (
        flt(row.year_1) > 0 ||
        flt(row.year_2) > 0 ||
        flt(row.year_3) > 0
    ) {

        frappe.show_alert({
            message: __('Year values already exist. Split skipped'),
            indicator: 'orange'
        }, 3);

        return;
    }

    let total = flt(row.total_amount);

    if (!total) {
        return;
    }

    let split = total / 3;

    frappe.model.set_value(cdt, cdn, 'year_1', split);
    frappe.model.set_value(cdt, cdn, 'year_2', split);
    frappe.model.set_value(cdt, cdn, 'year_3', split);

    frappe.show_alert({
        message: __('Total Amount Split Across 3 Years'),
        indicator: 'blue'
    }, 2);
}


function calculate_parent_total(frm) {
    let grand_total = 0;
    (frm.doc.budget_items_list || []).forEach(row => {
        grand_total += flt(row.total_amount);
    });
    frm.set_value('total_budget', grand_total);

}
// Copyright (c) 2026, TFSS and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Creche Disbursement", {
// 	refresh(frm) {

// 	},
// });


frappe.ui.form.on('Creche Disbursement', {

    refresh: function(frm) {

        if (!frm.doc.financial_year) {
            let today = new Date();
            let year = today.getFullYear();
            let month = today.getMonth() + 1;

            let start_year;
            let end_year;
            if (month >= 4) {
                start_year = year;
                end_year = String(year + 1).slice(-2);
            } else {
                start_year = year - 1;
                end_year = String(year).slice(-2);
            }

            let financial_year = `${start_year}-${end_year}`;

            frm.set_value('financial_year', financial_year);

            // frappe.show_alert({
            //     message: __('Financial Year Auto Filled'),
            //     indicator: 'blue'
            // }, 2);
        }

        calculate_disbursement_totals(frm);
    }

});


frappe.ui.form.on('Disbursement Tracker', {

    disbursement_add: function(frm, cdt, cdn) {

        let row = locals[cdt][cdn];

        frappe.model.set_value(
            cdt,
            cdn,
            'date_of_disbursement',
            frappe.datetime.get_today()
        );

        frappe.show_alert({
            message: __('Current Date Auto Filled'),
            indicator: 'green'
        }, 2);
    },

    disbursed_amount: function(frm, cdt, cdn) {

        calculate_disbursement_totals(frm);

        frappe.show_alert({
            message: __('Disbursement Amount Updated'),
            indicator: 'green'
        }, 2);
    }

});

function calculate_disbursement_totals(frm) {

    let total_disbursement = 0;
    (frm.doc.disbursement || []).forEach(row => {

        total_disbursement += flt(row.disbursed_amount);
    });
    frm.set_value('total_disbursement', total_disbursement);


    // Calculate Balance Budget
    let total_budget = flt(frm.doc.total_budget);

    let balance_budget = total_budget - total_disbursement;

    frm.set_value('balence_budget', balance_budget);


    // Alert if disbursement exceeds budget
    if (total_disbursement > total_budget) {

        frappe.show_alert({
            message: __('Disbursement exceeds Total Budget'),
            indicator: 'red'
        }, 5);
    }
}
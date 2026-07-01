// Copyright (c) 2026, TFSS and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Creche utilisation", {
// 	refresh(frm) {

// 	},
// });


frappe.ui.form.on('Creche utilisation', {
    refresh: function(frm) {
        // Auto Set Current Date
        if (!frm.doc.date) {

            frm.set_value('date', frappe.datetime.get_today());

            // frappe.show_alert({
            //     message: __('Current Date Auto Filled'),
            //     indicator: 'green'
            // }, 2);
        }
        // Auto Set Current Financial Year
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

            // frappe.show_alert({
            //     message: __('Financial Year Auto Filled'),
            //     indicator: 'blue'
            // }, 2);
        }
        // Auto Set Current Month
        if (!frm.doc.month) {

            const months = [
                "January", "February", "March",
                "April", "May", "June",
                "July", "August", "September",
                "October", "November", "December"
            ];

            let current_month = months[new Date().getMonth()];

            frm.set_value('month', current_month);

            // frappe.show_alert({
            //     message: __('Current Month Auto Filled'),
            //     indicator: 'green'
            // }, 2);
        }
        if(doc.total_utilisation==""||doc.total_utilisation==null){
        calculate_total_utilisation(frm);
    }
    },
    // Declaration Validation
    validate: function(frm) {

        if (!frm.doc.declaration) {
            frappe.show_alert({
                message: __('Declaration is Mandatory'),
                indicator: 'red'
            }, 3);

            frappe.validated = false;
        }
    }
});


frappe.ui.form.on('Utilisation Items', {

    total_amount: function(frm, cdt, cdn) {

        calculate_total_utilisation(frm);

        frappe.show_alert({
            message: __('Utilisation Total Amount Updated'),
            indicator: 'green'
        }, 2);
    }

});

// Calculate Parent Total Utilisation
function calculate_total_utilisation(frm) {

    let total_utilisation = 0;

    (frm.doc.utilisation_items_list || []).forEach(row => {
        total_utilisation += flt(row.total_amount);
    });

    frm.set_value('total_utilisation', total_utilisation);
}
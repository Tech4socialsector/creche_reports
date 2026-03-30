// Copyright (c) 2026, TFSS and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Test", {
// 	refresh(frm) {

// 	},
// });

frappe.ui.form.on('Test', {

	refresh(frm) {


            window.open(
                "/api/method/creche_reports.api.export_reports.export_creche_utilisation_excel"
            );

        }
    

});
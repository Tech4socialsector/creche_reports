// Copyright (c) 2026, TFSS and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Creche Data Import", {
// 	refresh(frm) {

// 	},
// });


frappe.ui.form.on("Creche Data Import", {

    refresh(frm) {

        if (!frm.is_new()) {

            frm.add_custom_button("Start Import", () => {

                if (!frm.doc.attach_file) {

                    frappe.show_alert({
                        message: "Please upload file",
                        indicator: "red"
                    });

                    return;
                }

                frappe.call({

                    method: "creche_reports.api.common.dynamic_import",

                    args: {
                        file_url: frm.doc.attach_file,
                        target_doctype:"Creche Budget"                    },

                    freeze: true,
                    freeze_message:
                        "Importing Data...",

                    callback(r) {

                        frappe.show_alert({
                            message:
                                r.message.message,

                            indicator:
                                r.message.status
                                === "success"
                                ? "green"
                                : "red"
                        });

                    }

                });

            }).addClass("btn-primary");

        }

    }

});

frappe.ui.form.on("Creche Data Import", {

    refresh(frm) {

        // show only after save
        if (!frm.is_new()) {

            frm.add_custom_button("Start Import", () => {

                // validate file
                if (!frm.doc.attach_file) {

                    frappe.show_alert({
                        message: "Please upload file",
                        indicator: "red"
                    });

                    return;
                }
                frappe.call({

                    method: "creche_reports.api.common.dynamic_import",

                    args: {
                        file_url: frm.doc.attach_file,
                        target_doctype:"Creche Budget"                    },

                    freeze: true,
                    freeze_message:
                        "Importing Data...",

                    callback(r) {

                        frappe.show_alert({
                            message:
                                r.message.message,

                            indicator:
                                r.message.status
                                === "success"
                                ? "green"
                                : "red"
                        });

                    }

                });

            }).addClass("btn-primary");

        }

    }

});
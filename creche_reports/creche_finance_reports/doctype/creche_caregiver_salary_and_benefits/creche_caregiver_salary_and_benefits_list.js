frappe.listview_settings["Creche Caregiver Salary and Benefits"] = {
	onload: function (listview) {
		// Standalone button (not grouped under "Actions") so it renders in
		// the toolbar right next to the "Add" primary-action button, styled
		// to match it.
		listview.page.add_inner_button(
			__("Export Excel"),
			function () {
				creche_caregiver_salary_export_dialog(listview);
			},
			null,
			"primary"
		);
	},
};

// Lets the user choose what to export before generating the workbook:
// every record, only submitted ones, or (if rows are checked in the list)
// just the selection.
function creche_caregiver_salary_export_dialog(listview) {
	const checked_names = (listview && listview.get_checked_items().map((d) => d.name)) || [];

	// frappe.ui.Dialog's Select field takes a flat newline list where the
	// value shown IS the option — use the label as the value here and map
	// it back to the scope keyword the backend expects on submit, instead
	// of poking at the rendered <option> DOM to relabel it.
	const LABEL_TO_SCOPE = {
		[__("All Records")]: "all",
		[__("Submitted Only")]: "submitted",
	};
	const option_labels = [__("All Records"), __("Submitted Only")];
	if (checked_names.length) {
		const selected_label = __("Selected Records ({0})", [checked_names.length]);
		LABEL_TO_SCOPE[selected_label] = "selected";
		option_labels.unshift(selected_label);
	}

	const dialog = new frappe.ui.Dialog({
		title: __("Export Caregiver Salary and Benefits"),
		fields: [
			{
				fieldname: "scope",
				fieldtype: "Select",
				label: __("Export"),
				options: option_labels.join("\n"),
				default: option_labels[0],
				reqd: 1,
			},
		],
		primary_action_label: __("Export"),
		primary_action: (values) => {
			dialog.hide();
			creche_caregiver_salary_export_excel(LABEL_TO_SCOPE[values.scope], checked_names);
		},
	});

	dialog.show();
}

// Downloads one workbook matching the standard Partner Details / Deductions
// data-collection format, via
// creche_reports.api.export_reports.export_creche_caregiver_salary_excel.
// scope: "all" | "submitted" | "selected" — for "selected", `names` must be
// the checked row names; for "all"/"submitted" the backend resolves the
// record list itself (permission-scoped) and `names` is ignored.
// Kept self-contained here since list-view JS and form-view JS
// (creche_caregiver_salary_and_benefits.js) load independently and don't
// share scope.
function creche_caregiver_salary_export_excel(scope, names) {
	if (scope === "selected" && (!names || !names.length)) {
		frappe.show_alert({ message: __("Select at least one record"), indicator: "orange" }, 3);
		return;
	}

	frappe.show_alert({ message: __("Generating Excel…"), indicator: "blue" }, 2);

	fetch("/api/method/creche_reports.api.export_reports.export_creche_caregiver_salary_excel", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Frappe-CSRF-Token": frappe.csrf_token,
		},
		body: JSON.stringify({ scope: scope, names: scope === "selected" ? names : undefined }),
	})
		.then(function (res) {
			if (!res.ok) {
				return res.json().then(function (err) {
					var msg = err && err.exception ? err.exception : "Server error while generating Excel.";
					frappe.show_alert({ message: msg, indicator: "red" }, 5);
				});
			}
			return res.blob().then(function (blob) {
				var disposition = res.headers.get("content-disposition") || "";
				var match = disposition.match(/filename[^;=\n]*=(["']?)([^"'\n;]+)\1/);
				var filename = match ? match[2] : "Creche_Caregiver_Salary_and_Benefits.xlsx";
				var url = URL.createObjectURL(blob);
				var a = document.createElement("a");
				a.href = url;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				setTimeout(function () {
					URL.revokeObjectURL(url);
					a.remove();
				}, 1000);
				frappe.show_alert({ message: __("Excel downloaded successfully."), indicator: "green" }, 3);
			});
		})
		.catch(function (err) {
			console.error(err);
			frappe.show_alert({ message: __("Failed to generate Excel. Check console for details."), indicator: "red" }, 5);
		});
}

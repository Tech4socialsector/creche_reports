frappe.listview_settings["Creche Budget"] = {
	onload: function (listview) {
		listview.page.add_action_item(__("Export Excel"), function () {
			const names = listview.get_checked_items().map((d) => d.name);
			if (!names.length) {
				frappe.show_alert({ message: __("Select at least one record"), indicator: "orange" }, 3);
				return;
			}
			creche_budget_export_excel(names);
		});
	},
};

// Downloads one workbook (one sheet per selected record) via
// creche_reports.api.export_reports.export_creche_budget_excel.
// Kept self-contained here since list-view JS and form-view JS
// (creche_budget.js) load independently and don't share scope.
function creche_budget_export_excel(names) {
	if (!names || !names.length) return;

	frappe.show_alert({ message: __("Generating Excel…"), indicator: "blue" }, 2);

	fetch("/api/method/creche_reports.api.export_reports.export_creche_budget_excel", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Frappe-CSRF-Token": frappe.csrf_token,
		},
		body: JSON.stringify({ names: names }),
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
				var filename = match ? match[2] : "Creche_Budget.xlsx";
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

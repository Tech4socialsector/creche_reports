// // Copyright (c) 2026, Azim Premji Foundation and contributors

// const EXCEL_METHOD =
// 	"creche_reports.creche_finance_reports.report.creche_budget_utilisation_report" +
// 	".creche_budget_utilisation_report.download_excel";

// // ─── CSS injected once: partner row + grand total row highlight ───────────────
// const CBUR_CSS = `
// 	.dt-scrollable .dt-row:has(.cbur-partner) .dt-cell {
// 		background-color: #EBF5FB !important;
// 	}
// 	.dt-scrollable .dt-row:has(.cbur-partner) .dt-cell__content {
// 		font-weight: 700 !important;
// 		color: #1A5276 !important;
// 	}
// 	.dt-scrollable .dt-row:has(.cbur-partner) .dt-cell:first-of-type {
// 		border-left: 3px solid #378ADD !important;
// 	}
// 	.dt-scrollable .dt-row:has(.cbur-grand-total) .dt-cell {
// 		background-color: #1A5276 !important;
// 	}
// 	.dt-scrollable .dt-row:has(.cbur-grand-total) .dt-cell__content {
// 		font-weight: 700 !important;
// 		color: #FFFFFF !important;
// 	}
// 	.dt-scrollable .dt-row:has(.cbur-grand-total) .dt-cell:first-of-type {
// 		border-left: 3px solid #0A2744 !important;
// 	}
// `;

// frappe.query_reports["Creche Budget Utilisation Report"] = {
// 	tree: true,
// 	name_field: "row_name",
// 	initial_depth: 1,

// 	// ── Auto-fit columns to fill available width ──────────────────────────────
// 	get_datatable_options: function (options) {
// 		return Object.assign(options, { layout: "fluid" });
// 	},

// 	// ── Filters — MultiSelectList with cascading, mirrors the Summary page ────
// 	filters: [
// 		{
// 			fieldname: "partner_id",
// 			label: __("Partner"),
// 			fieldtype: "MultiSelectList",
// 			get_data: function (txt) {
// 				return frappe
// 					.call({
// 						method:
// 							"creche_reports.api.budget_utilisation_summary.get_partner_options",
// 						args: { txt: txt || "" },
// 					})
// 					.then((r) =>
// 						(r.message || []).map((p) => ({
// 							value: p.partner_name || p.name,
// 							description: p.name,
// 						}))
// 					);
// 			},
// 		},
// 		{
// 			fieldname: "budget_reference",
// 			label: __("Budget Reference"),
// 			fieldtype: "MultiSelectList",
// 			get_data: function (txt) {
// 				const partners = frappe.query_report.get_filter_value("partner_id") || [];
// 				const f = {};
// 				if (partners.length) f.partner_name = ["in", partners];
// 				if (txt) f.budget_reference_name = ["like", `%${txt}%`];
// 				return frappe.db
// 					.get_list("Creche Budget", { filters: f, fields: ["budget_reference_name"], limit: 50 })
// 					.then((rows) =>
// 						[...new Set(rows.map((r) => r.budget_reference_name).filter(Boolean))].map(
// 							(v) => ({ value: v, description: "" })
// 						)
// 					);
// 			},
// 		},
// 		{
// 			fieldname: "grant_id",
// 			label: __("Grant ID"),
// 			fieldtype: "MultiSelectList",
// 			get_data: function (txt) {
// 				const partners = frappe.query_report.get_filter_value("partner_id") || [];
// 				const f = {};
// 				if (partners.length) f.partner_name = ["in", partners];
// 				if (txt) f.grant_id = ["like", `%${txt}%`];
// 				return frappe.db
// 					.get_list("Creche Budget", { filters: f, fields: ["grant_id"], limit: 50 })
// 					.then((rows) =>
// 						[...new Set(rows.map((r) => r.grant_id).filter(Boolean))].map((v) => ({
// 							value: v,
// 							description: "",
// 						}))
// 					);
// 			},
// 		},
// 		{
// 			fieldname: "financial_year",
// 			label: __("Financial Year"),
// 			fieldtype: "MultiSelectList",
// 			get_data: function (txt) {
// 				return frappe.db
// 					.get_list("Financial year", {
// 						fields: ["name"],
// 						limit: 50,
// 						order_by: "name desc",
// 						...(txt ? { filters: { name: ["like", `%${txt}%`] } } : {}),
// 					})
// 					.then((rows) => rows.map((r) => ({ value: r.name, description: "" })));
// 			},
// 		},
// 		{
// 			fieldname: "state",
// 			label: __("State"),
// 			fieldtype: "MultiSelectList",
// 			get_data: function (txt) {
// 				const partners = frappe.query_report.get_filter_value("partner_id") || [];
// 				const f = {};
// 				if (partners.length) f.partner_name = ["in", partners];
// 				if (txt) f.state = ["like", `%${txt}%`];
// 				return frappe.db
// 					.get_list("Creche Budget", { filters: f, fields: ["state"], limit: 100 })
// 					.then((rows) =>
// 						[...new Set(rows.map((r) => r.state).filter(Boolean))]
// 							.sort()
// 							.map((v) => ({ value: v, description: "" }))
// 					);
// 			},
// 		},
// 		{
// 			fieldname: "district",
// 			label: __("District"),
// 			fieldtype: "MultiSelectList",
// 			get_data: function (txt) {
// 				const partners = frappe.query_report.get_filter_value("partner_id") || [];
// 				const f = {};
// 				if (partners.length) f.partner_name = ["in", partners];
// 				if (txt) f.district = ["like", `%${txt}%`];
// 				return frappe.db
// 					.get_list("Creche Budget", { filters: f, fields: ["district"], limit: 100 })
// 					.then((rows) =>
// 						[...new Set(rows.map((r) => r.district).filter(Boolean))]
// 							.sort()
// 							.map((v) => ({ value: v, description: "" }))
// 					);
// 			},
// 		},
// 		{
// 			fieldname: "block",
// 			label: __("Block"),
// 			fieldtype: "MultiSelectList",
// 			get_data: function (txt) {
// 				const partners = frappe.query_report.get_filter_value("partner_id") || [];
// 				const f = {};
// 				if (partners.length) f.partner_name = ["in", partners];
// 				if (txt) f.block = ["like", `%${txt}%`];
// 				return frappe.db
// 					.get_list("Creche Budget", { filters: f, fields: ["block"], limit: 100 })
// 					.then((rows) =>
// 						[...new Set(rows.map((r) => r.block).filter(Boolean))]
// 							.sort()
// 							.map((v) => ({ value: v, description: "" }))
// 					);
// 			},
// 		},
// 		{
// 			fieldname: "start_date",
// 			label: __("Start Date"),
// 			fieldtype: "Date",
// 		},
// 		{
// 			fieldname: "end_date",
// 			label: __("End Date"),
// 			fieldtype: "Date",
// 		},
// 	],

// 	// ── One-time setup ────────────────────────────────────────────────────────
// 	onload: function (report) {
// 		// 1. Inject row-color CSS
// 		if (!document.getElementById("cbur-row-styles")) {
// 			const s = document.createElement("style");
// 			s.id = "cbur-row-styles";
// 			s.textContent = CBUR_CSS;
// 			document.head.appendChild(s);
// 		}

// 		// 2. Excel download button
// 		report.page.add_button(__("⬇ Export Excel"), function () {
// 			const filters = {};
// 			(frappe.query_report.filters || []).forEach((f) => {
// 				const v = f.value;
// 				const empty =
// 					v === undefined ||
// 					v === null ||
// 					v === "" ||
// 					(Array.isArray(v) && v.length === 0);
// 				if (!empty) filters[f.fieldname] = v;
// 			});
// 			window.open(
// 				"/api/method/" +
// 					EXCEL_METHOD +
// 					"?filters=" +
// 					encodeURIComponent(JSON.stringify(filters))
// 			);
// 		});

// 		// 3. Wire partner → clear cascaded filters when partner changes
// 		//    setTimeout waits for Frappe to finish rendering filter controls.
// 		setTimeout(() => {
// 			const pf = report.get_filter("partner_id");
// 			if (pf && pf.$input) {
// 				pf.$input.on("awesomplete-selectcomplete change", function () {
// 					["budget_reference", "grant_id", "state", "district", "block"].forEach((k) => {
// 						const ctrl = report.get_filter(k);
// 						if (ctrl) {
// 							try {
// 								ctrl.set_value([]);
// 							} catch (_) {}
// 						}
// 					});
// 				});
// 			}
// 		}, 800);
// 	},

// 	// ── Per-cell formatting ───────────────────────────────────────────────────
// 	formatter: function (value, row, column, data, default_formatter) {
// 		value = default_formatter(value, row, column, data);
// 		const isGrandTotal = data && data.is_grand_total;
// 		const isPartner = data && data.indent === 0;

// 		// Grand total row — dark navy styling via CSS :has()
// 		if (isGrandTotal) {
// 			return `<span class="cbur-grand-total">${value}</span>`;
// 		}

// 		// Mark every cell of a partner row so CSS :has() can target the row
// 		if (isPartner) {
// 			return `<span class="cbur-partner">${value}</span>`;
// 		}

// 		// Traffic-light pill for percent columns (budget rows only)
// 		if (
// 			column.fieldname === "utilised_vs_budget" ||
// 			column.fieldname === "utilised_vs_disbursed"
// 		) {
// 			const pct = parseFloat(data[column.fieldname]) || 0;
// 			const [bg, fg] =
// 				pct >= 75
// 					? ["#D5F5E3", "#1E8449"]
// 					: pct >= 50
// 					? ["#FEF9E7", "#D35400"]
// 					: ["#FADBD8", "#C0392B"];
// 			return (
// 				`<span style="background:${bg};color:${fg};padding:2px 10px;` +
// 				`border-radius:12px;font-weight:700;display:inline-block;` +
// 				`min-width:52px;text-align:center;">${value}</span>`
// 			);
// 		}

// 		return value;
// 	},
// };






// Copyright (c) 2026, Azim Premji Foundation and contributors

const EXCEL_METHOD =
	"creche_reports.creche_finance_reports.report.creche_budget_utilisation_report" +
	".creche_budget_utilisation_report.download_excel";

// ─── Styles injected once ─────────────────────────────────────────────────────
const CBUR_CSS = `
	/* ── Cell text behaviour ── */
	.dt-cell__content {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* ── Column alignment: first col left, rest right ── */
	.dt-cell[data-col-index="0"] .dt-cell__content,
	.dt-header .dt-cell[data-col-index="0"] .dt-cell__content {
		text-align: left !important;
		justify-content: flex-start !important;
	}
	.dt-cell[data-col-index]:not([data-col-index="0"]) .dt-cell__content,
	.dt-header .dt-cell:not([data-col-index="0"]) .dt-cell__content {
		text-align: right !important;
		justify-content: flex-end !important;
	}

	/* ── Partner (indent-0) row — light blue ── */
	.dt-scrollable .dt-row:has(.cbur-partner) .dt-cell {
		background-color: #EBF5FB !important;
	}
	.dt-scrollable .dt-row:has(.cbur-partner) .dt-cell__content {
		font-weight: 700 !important;
		color: #1A5276 !important;
	}
	.dt-scrollable .dt-row:has(.cbur-partner) .dt-cell:first-of-type {
		border-left: 3px solid #378ADD !important;
	}

	/* ── Grand-total row — dark navy ── */
	.dt-scrollable .dt-row:has(.cbur-grand-total) .dt-cell {
		background-color: #1A5276 !important;
	}
	.dt-scrollable .dt-row:has(.cbur-grand-total) .dt-cell__content {
		font-weight: 700 !important;
		color: #FFFFFF !important;
	}
	.dt-scrollable .dt-row:has(.cbur-grand-total) .dt-cell:first-of-type {
		border-left: 3px solid #0A2744 !important;
	}
`;

// ─── Report definition ────────────────────────────────────────────────────────
frappe.query_reports["Creche Budget Utilisation Report"] = {
	tree: true,
	name_field: "row_name",
	initial_depth: 0,          // hint to Frappe (may be overridden — JS handles it too)

	get_datatable_options(options) {
		return Object.assign(options, {
			layout: "fixed",   // we set column widths manually
			cellHeight: 35,
			headerDropdown: [],
		});
	},

	// ── Filters ──────────────────────────────────────────────────────────────
	filters: [
		{
			fieldname: "partner_id",
			label: __("Partner"),
			fieldtype: "MultiSelectList",
			get_data(txt) {
				return frappe
					.call({
						method: "creche_reports.api.budget_utilisation_summary.get_partner_options",
						args: { txt: txt || "" },
					})
					.then((r) =>
						(r.message || []).map((p) => ({
							value: p.partner_name || p.name,
							description: p.name,
						}))
					);
			},
		},
		{
			fieldname: "budget_reference",
			label: __("Budget Reference"),
			fieldtype: "MultiSelectList",
			get_data(txt) {
				const partners = frappe.query_report.get_filter_value("partner_id") || [];
				const f = {};
				if (partners.length) f.partner_name = ["in", partners];
				if (txt) f.budget_reference_name = ["like", `%${txt}%`];
				return frappe.db
					.get_list("Creche Budget", {
						filters: f, fields: ["budget_reference_name"], limit: 50,
					})
					.then((rows) =>
						[...new Set(rows.map((r) => r.budget_reference_name).filter(Boolean))].map(
							(v) => ({ value: v, description: "" })
						)
					);
			},
		},
		{
			fieldname: "grant_id",
			label: __("Grant ID"),
			fieldtype: "MultiSelectList",
			get_data(txt) {
				const partners = frappe.query_report.get_filter_value("partner_id") || [];
				const f = {};
				if (partners.length) f.partner_name = ["in", partners];
				if (txt) f.grant_id = ["like", `%${txt}%`];
				return frappe.db
					.get_list("Creche Budget", { filters: f, fields: ["grant_id"], limit: 50 })
					.then((rows) =>
						[...new Set(rows.map((r) => r.grant_id).filter(Boolean))].map(
							(v) => ({ value: v, description: "" })
						)
					);
			},
		},
		{
			fieldname: "financial_year",
			label: __("Financial Year"),
			fieldtype: "MultiSelectList",
			get_data(txt) {
				return frappe.db
					.get_list("Financial year", {
						fields: ["name"],
						limit: 50,
						order_by: "name desc",
						...(txt ? { filters: { name: ["like", `%${txt}%`] } } : {}),
					})
					.then((rows) => rows.map((r) => ({ value: r.name, description: "" })));
			},
		},
		{
			fieldname: "state",
			label: __("State"),
			fieldtype: "MultiSelectList",
			get_data(txt) {
				const partners = frappe.query_report.get_filter_value("partner_id") || [];
				const f = {};
				if (partners.length) f.partner_name = ["in", partners];
				if (txt) f.state = ["like", `%${txt}%`];
				return frappe.db
					.get_list("Creche Budget", { filters: f, fields: ["state"], limit: 100 })
					.then((rows) =>
						[...new Set(rows.map((r) => r.state).filter(Boolean))]
							.sort()
							.map((v) => ({ value: v, description: "" }))
					);
			},
		},
		{
			fieldname: "district",
			label: __("District"),
			fieldtype: "MultiSelectList",
			get_data(txt) {
				const partners = frappe.query_report.get_filter_value("partner_id") || [];
				const f = {};
				if (partners.length) f.partner_name = ["in", partners];
				if (txt) f.district = ["like", `%${txt}%`];
				return frappe.db
					.get_list("Creche Budget", { filters: f, fields: ["district"], limit: 100 })
					.then((rows) =>
						[...new Set(rows.map((r) => r.district).filter(Boolean))]
							.sort()
							.map((v) => ({ value: v, description: "" }))
					);
			},
		},
		{
			fieldname: "block",
			label: __("Block"),
			fieldtype: "MultiSelectList",
			get_data(txt) {
				const partners = frappe.query_report.get_filter_value("partner_id") || [];
				const f = {};
				if (partners.length) f.partner_name = ["in", partners];
				if (txt) f.block = ["like", `%${txt}%`];
				return frappe.db
					.get_list("Creche Budget", { filters: f, fields: ["block"], limit: 100 })
					.then((rows) =>
						[...new Set(rows.map((r) => r.block).filter(Boolean))]
							.sort()
							.map((v) => ({ value: v, description: "" }))
					);
			},
		},
		{ fieldname: "start_date", label: __("Start Date"), fieldtype: "Date" },
		{ fieldname: "end_date",   label: __("End Date"),   fieldtype: "Date" },
	],

	// ── onload ────────────────────────────────────────────────────────────────
	onload(report) {

		// 1. CSS — inject once, never duplicate
		if (!document.getElementById("cbur-styles")) {
			const s = document.createElement("style");
			s.id = "cbur-styles";
			s.textContent = CBUR_CSS;
			document.head.appendChild(s);
		}

		// 2. Ruler span — reuse across calls, clean up old one if present
		let ruler = document.getElementById("cbur-ruler");
		if (!ruler) {
			ruler = document.createElement("span");
			ruler.id = "cbur-ruler";
			Object.assign(ruler.style, {
				position:   "fixed",
				top:        "-9999px",
				left:       "-9999px",
				visibility: "hidden",
				whiteSpace: "nowrap",
				fontSize:   "13px",
				fontFamily: "var(--font-stack, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)",
				fontWeight: "normal",
				padding:    "0",
				margin:     "0",
				border:     "none",
			});
			document.body.appendChild(ruler);
		}
		const measure = (str) => {
			ruler.textContent = String(str ?? "");
			return ruler.getBoundingClientRect().width;
		};

		// 3. Height observer — single instance, replaced on each full run
		let _heightObs = null;

		const pinHeight = () => {
			const el = document.querySelector(".report-results .dt-scrollable");
			if (!el) return;
			const newH = Math.max(120, window.innerHeight - el.getBoundingClientRect().top - 56) + "px";
			el.style.setProperty("height",     newH, "important");
			el.style.setProperty("max-height", newH, "important");
			el.style.setProperty("min-height", newH, "important");
			el.style.setProperty("overflow-y", "auto", "important");
		};

		const watchHeight = () => {
			if (_heightObs) { _heightObs.disconnect(); _heightObs = null; }
			const el = document.querySelector(".report-results .dt-scrollable");
			if (!el) return;
			_heightObs = new MutationObserver(pinHeight);
			_heightObs.observe(el, { attributes: true, attributeFilter: ["style"] });
		};

		// 4. Column auto-fit — measures ALL visible DOM cells (expanded state)
		//    Must run BEFORE collapsing so child-row content is in the DOM.
		const autoFitColumns = () => {
			const dt = frappe.query_report.datatable;
			if (!dt) return;

			const PAD   = 28;   // left + right cell padding
			const MIN_W = 60;
			const BUF   = 10;   // safety buffer

			let columns = [];
			try { columns = dt.datamanager.getColumns(false); } catch (_) { return; }
			if (!columns.length) return;

			// Seed widths from header labels
			const widths = columns.map((col) =>
				Math.max(MIN_W, measure(col.name || col.label || col.id || "") + PAD + BUF)
			);

			// Widen from rendered cell text
			columns.forEach((col, i) => {
				const idx = col.colIndex ?? i;
				document
					.querySelectorAll(
						`.report-results .dt-scrollable .dt-cell[data-col-index="${idx}"] .dt-cell__content,
						 .report-results .dt-header .dt-cell[data-col-index="${idx}"] .dt-cell__content`
					)
					.forEach((el) => {
						const w = measure((el.innerText || el.textContent || "").trim()) + PAD + BUF;
						if (w > widths[i]) widths[i] = w;
					});
			});

			// Scale up proportionally if total < container width
			const container = document.querySelector(".report-results");
			const availW = container ? container.getBoundingClientRect().width : window.innerWidth - 80;
			const totalW = widths.reduce((a, b) => a + b, 0);
			const final  = totalW < availW
				? widths.map((w) => Math.round(w * availW / totalW))
				: widths;

			columns.forEach((col, i) => {
				try { dt.style.setColumnWidth(col.colIndex ?? i, final[i]); } catch (_) {}
			});
			try { dt.style.distributeRemainingWidth(); } catch (_) {}
			try { dt.rowmanager.refreshRows();          } catch (_) {}
		};

		// 5. Collapse all indent-0 (partner) rows
		//    Correct order: measure widths FIRST (all rows visible), THEN collapse.
		const collapsePartnerRows = () => {
			const dt = frappe.query_report.datatable;
			if (!dt) return;

			// Primary: use DataTable's rowmanager.collapseRow(rowIndex)
			// dt.datamanager.rows is a plain array of row-arrays where
			// each row-array[0] has { rowIndex, indent, ... }
			try {
				const allRows = dt.datamanager.rows || [];
				allRows.forEach((rowArr) => {
					const meta = Array.isArray(rowArr) ? rowArr[0] : rowArr;
					if (meta && meta.indent === 0 && !meta.isLeaf) {
						try { dt.rowmanager.collapseRow(meta.rowIndex); } catch (_) {}
					}
				});
				return; // if we got here without throw, primary worked
			} catch (_) {}

			// Fallback: DOM — click open row-toggles on indent-0 rows only
			document
				.querySelectorAll(".report-results .dt-scrollable .dt-row[data-indent='0']")
				.forEach((rowEl) => {
					if (rowEl.getAttribute("data-is-open") !== "true") return;
					const toggle = rowEl.querySelector(".dt-row-toggle");
					if (toggle) { try { toggle.click(); } catch (_) {} }
				});
		};

		// 6. Master sequence: fit → pin height → watch → collapse
		//    Collapse is always LAST so measurement happens on full data.
		const fullRun = () => {
			autoFitColumns();           // step A: measure all rows (expanded)
			pinHeight();                // step B: lock scrollable height
			watchHeight();              // step C: keep it locked
			setTimeout(collapsePartnerRows, 80); // step D: collapse after reflow
		};

		// 7. Wire up — use a named handler so we can remove it on re-entry
		if (window._cburResizeHandler) {
			window.removeEventListener("resize", window._cburResizeHandler);
		}
		window._cburResizeHandler = () => {
			if (_heightObs) { _heightObs.disconnect(); _heightObs = null; }
			setTimeout(() => { autoFitColumns(); pinHeight(); watchHeight(); }, 120);
		};
		window.addEventListener("resize", window._cburResizeHandler);

		// Initial paint — wait for Frappe to fully render the datatable
		setTimeout(fullRun, 800);

		// After every report refresh
		frappe.query_report.after_datatable_render = () => {
			if (_heightObs) { _heightObs.disconnect(); _heightObs = null; }
			// Pass 1: approximate widths
			setTimeout(() => {
				autoFitColumns();
				// Pass 2: accurate widths after reflow, then collapse
				setTimeout(() => {
					autoFitColumns();
					pinHeight();
					watchHeight();
					setTimeout(collapsePartnerRows, 80);
				}, 200);
			}, 300);
		};

		// 8. Excel export button
		report.page.add_button(__("⬇ Export Excel"), () => {
			const filters = {};
			(frappe.query_report.filters || []).forEach((f) => {
				const v = f.value;
				if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length))
					filters[f.fieldname] = v;
			});
			window.open(
				"/api/method/" + EXCEL_METHOD +
				"?filters=" + encodeURIComponent(JSON.stringify(filters))
			);
		});

		// 9. Partner filter → cascade-clear dependent filters
		setTimeout(() => {
			const pf = report.get_filter("partner_id");
			if (pf && pf.$input) {
				pf.$input.on("awesomplete-selectcomplete change", () => {
					["budget_reference", "grant_id", "state", "district", "block"].forEach((k) => {
						const ctrl = report.get_filter(k);
						if (ctrl) { try { ctrl.set_value([]); } catch (_) {} }
					});
				});
			}
		}, 800);
	},

	// ── Cell formatter ────────────────────────────────────────────────────────
	formatter(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		// Grand total — navy pill
		if (data && data.is_grand_total)
			return `<span class="cbur-grand-total">${value}</span>`;

		// Partner row — blue pill
		if (data && data.indent === 0)
			return `<span class="cbur-partner">${value}</span>`;

		// % utilisation — traffic-light pill
		if (
			column.fieldname === "utilised_vs_budget" ||
			column.fieldname === "utilised_vs_disbursed"
		) {
			const pct = parseFloat(data[column.fieldname]) || 0;
			const [bg, fg] =
				pct >= 75 ? ["#D5F5E3", "#1E8449"] :
				pct >= 50 ? ["#FEF9E7", "#D35400"] :
				            ["#FADBD8", "#C0392B"];
			return (
				`<span style="background:${bg};color:${fg};padding:2px 10px;` +
				`border-radius:12px;font-weight:700;display:inline-block;` +
				`min-width:52px;text-align:center;">${value}</span>`
			);
		}

		return value;
	},
};
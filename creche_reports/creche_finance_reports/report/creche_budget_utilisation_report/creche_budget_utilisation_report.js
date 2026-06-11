
// // Copyright (c) 2026, Azim Premji Foundation and contributors

// const EXCEL_METHOD =
// 	"creche_reports.creche_finance_reports.report.creche_budget_utilisation_report" +
// 	".creche_budget_utilisation_report.download_excel";

// // ─── Styles injected once ─────────────────────────────────────────────────────
// const CBUR_CSS = `
// 	/* ── Cell text behaviour ── */
// 	.dt-cell__content {
// 		overflow: hidden;
// 		text-overflow: ellipsis;
// 		white-space: nowrap;
// 	}

// 	/* ── Column alignment: first col left, rest right ── */
// 	.dt-cell[data-col-index="0"] .dt-cell__content,
// 	.dt-header .dt-cell[data-col-index="0"] .dt-cell__content {
// 		text-align: left !important;
// 		justify-content: flex-start !important;
// 	}
// 	.dt-cell[data-col-index]:not([data-col-index="0"]) .dt-cell__content,
// 	.dt-header .dt-cell:not([data-col-index="0"]) .dt-cell__content {
// 		text-align: right !important;
// 		justify-content: flex-end !important;
// 	}

// 	/* ── Partner (indent-0) row — light blue ── */
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

// 	/* ── Grand-total row — dark navy ── */
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

// // ─── Report definition ────────────────────────────────────────────────────────
// frappe.query_reports["Creche Budget Utilisation Report"] = {
// 	tree: true,
// 	name_field: "row_name",
// 	initial_depth: 0,          // hint to Frappe (may be overridden — JS handles it too)

// 	get_datatable_options(options) {
// 		return Object.assign(options, {
// 			layout: "fixed",   // we set column widths manually
// 			cellHeight: 35,
// 			headerDropdown: [],
// 		});
// 	},

// 	// ── Filters ──────────────────────────────────────────────────────────────
// 	filters: [
// 		{
// 			fieldname: "partner_id",
// 			label: __("Partner"),
// 			fieldtype: "MultiSelectList",
// 			get_data(txt) {
// 				return frappe
// 					.call({
// 						method: "creche_reports.api.budget_utilisation_summary.get_partner_options",
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
// 			get_data(txt) {
// 				const partners = frappe.query_report.get_filter_value("partner_id") || [];
// 				const f = {};
// 				if (partners.length) f.partner_name = ["in", partners];
// 				if (txt) f.budget_reference_name = ["like", `%${txt}%`];
// 				return frappe.db
// 					.get_list("Creche Budget", {
// 						filters: f, fields: ["budget_reference_name"], limit: 50,
// 					})
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
// 			get_data(txt) {
// 				const partners = frappe.query_report.get_filter_value("partner_id") || [];
// 				const f = {};
// 				if (partners.length) f.partner_name = ["in", partners];
// 				if (txt) f.grant_id = ["like", `%${txt}%`];
// 				return frappe.db
// 					.get_list("Creche Budget", { filters: f, fields: ["grant_id"], limit: 50 })
// 					.then((rows) =>
// 						[...new Set(rows.map((r) => r.grant_id).filter(Boolean))].map(
// 							(v) => ({ value: v, description: "" })
// 						)
// 					);
// 			},
// 		},
// 		{
// 			fieldname: "financial_year",
// 			label: __("Financial Year"),
// 			fieldtype: "MultiSelectList",
// 			get_data(txt) {
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
// 			get_data(txt) {
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
// 			get_data(txt) {
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
// 			get_data(txt) {
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
// 		{ fieldname: "start_date", label: __("Start Date"), fieldtype: "Date" },
// 		{ fieldname: "end_date",   label: __("End Date"),   fieldtype: "Date" },
// 	],

// 	// ── onload ────────────────────────────────────────────────────────────────
// 	onload(report) {

// 		// 1. CSS — inject once, never duplicate
// 		if (!document.getElementById("cbur-styles")) {
// 			const s = document.createElement("style");
// 			s.id = "cbur-styles";
// 			s.textContent = CBUR_CSS;
// 			document.head.appendChild(s);
// 		}

// 		// 2. Ruler span — reuse across calls, clean up old one if present
// 		let ruler = document.getElementById("cbur-ruler");
// 		if (!ruler) {
// 			ruler = document.createElement("span");
// 			ruler.id = "cbur-ruler";
// 			Object.assign(ruler.style, {
// 				position:   "fixed",
// 				top:        "-9999px",
// 				left:       "-9999px",
// 				visibility: "hidden",
// 				whiteSpace: "nowrap",
// 				fontSize:   "13px",
// 				fontFamily: "var(--font-stack, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)",
// 				fontWeight: "normal",
// 				padding:    "0",
// 				margin:     "0",
// 				border:     "none",
// 			});
// 			document.body.appendChild(ruler);
// 		}
// 		const measure = (str) => {
// 			ruler.textContent = String(str ?? "");
// 			return ruler.getBoundingClientRect().width;
// 		};

// 		// 3. Height observer — single instance, replaced on each full run
// 		let _heightObs = null;

// 		const pinHeight = () => {
// 			const el = document.querySelector(".report-results .dt-scrollable");
// 			if (!el) return;
// 			const newH = Math.max(120, window.innerHeight - el.getBoundingClientRect().top - 56) + "px";
// 			el.style.setProperty("height",     newH, "important");
// 			el.style.setProperty("max-height", newH, "important");
// 			el.style.setProperty("min-height", newH, "important");
// 			el.style.setProperty("overflow-y", "auto", "important");
// 		};

// 		const watchHeight = () => {
// 			if (_heightObs) { _heightObs.disconnect(); _heightObs = null; }
// 			const el = document.querySelector(".report-results .dt-scrollable");
// 			if (!el) return;
// 			_heightObs = new MutationObserver(pinHeight);
// 			_heightObs.observe(el, { attributes: true, attributeFilter: ["style"] });
// 		};

// 		// 4. Column auto-fit — measures ALL visible DOM cells (expanded state)
// 		//    Must run BEFORE collapsing so child-row content is in the DOM.
// 		const autoFitColumns = () => {
// 			const dt = frappe.query_report.datatable;
// 			if (!dt) return;

// 			const PAD   = 28;   // left + right cell padding
// 			const MIN_W = 60;
// 			const BUF   = 10;   // safety buffer

// 			let columns = [];
// 			try { columns = dt.datamanager.getColumns(false); } catch (_) { return; }
// 			if (!columns.length) return;

// 			// Seed widths from header labels
// 			const widths = columns.map((col) =>
// 				Math.max(MIN_W, measure(col.name || col.label || col.id || "") + PAD + BUF)
// 			);

// 			// Widen from rendered cell text
// 			columns.forEach((col, i) => {
// 				const idx = col.colIndex ?? i;
// 				document
// 					.querySelectorAll(
// 						`.report-results .dt-scrollable .dt-cell[data-col-index="${idx}"] .dt-cell__content,
// 						 .report-results .dt-header .dt-cell[data-col-index="${idx}"] .dt-cell__content`
// 					)
// 					.forEach((el) => {
// 						const w = measure((el.innerText || el.textContent || "").trim()) + PAD + BUF;
// 						if (w > widths[i]) widths[i] = w;
// 					});
// 			});

// 			// Scale up proportionally if total < container width
// 			const container = document.querySelector(".report-results");
// 			const availW = container ? container.getBoundingClientRect().width : window.innerWidth - 80;
// 			const totalW = widths.reduce((a, b) => a + b, 0);
// 			const final  = totalW < availW
// 				? widths.map((w) => Math.round(w * availW / totalW))
// 				: widths;

// 			columns.forEach((col, i) => {
// 				try { dt.style.setColumnWidth(col.colIndex ?? i, final[i]); } catch (_) {}
// 			});
// 			try { dt.style.distributeRemainingWidth(); } catch (_) {}
// 			try { dt.rowmanager.refreshRows();          } catch (_) {}
// 		};

// 		// 5. Collapse all indent-0 (partner) rows
// 		//    Correct order: measure widths FIRST (all rows visible), THEN collapse.
// 		const collapsePartnerRows = () => {
// 			const dt = frappe.query_report.datatable;
// 			if (!dt) return;

// 			// Primary: use DataTable's rowmanager.collapseRow(rowIndex)
// 			// dt.datamanager.rows is a plain array of row-arrays where
// 			// each row-array[0] has { rowIndex, indent, ... }
// 			try {
// 				const allRows = dt.datamanager.rows || [];
// 				allRows.forEach((rowArr) => {
// 					const meta = Array.isArray(rowArr) ? rowArr[0] : rowArr;
// 					if (meta && meta.indent === 0 && !meta.isLeaf) {
// 						try { dt.rowmanager.collapseRow(meta.rowIndex); } catch (_) {}
// 					}
// 				});
// 				return; // if we got here without throw, primary worked
// 			} catch (_) {}

// 			// Fallback: DOM — click open row-toggles on indent-0 rows only
// 			document
// 				.querySelectorAll(".report-results .dt-scrollable .dt-row[data-indent='0']")
// 				.forEach((rowEl) => {
// 					if (rowEl.getAttribute("data-is-open") !== "true") return;
// 					const toggle = rowEl.querySelector(".dt-row-toggle");
// 					if (toggle) { try { toggle.click(); } catch (_) {} }
// 				});
// 		};

// 		// 6. Master sequence: fit → pin height → watch → collapse
// 		//    Collapse is always LAST so measurement happens on full data.
// 		const fullRun = () => {
// 			autoFitColumns();           // step A: measure all rows (expanded)
// 			pinHeight();                // step B: lock scrollable height
// 			watchHeight();              // step C: keep it locked
// 			setTimeout(collapsePartnerRows, 80); // step D: collapse after reflow
// 		};

// 		// 7. Wire up — use a named handler so we can remove it on re-entry
// 		if (window._cburResizeHandler) {
// 			window.removeEventListener("resize", window._cburResizeHandler);
// 		}
// 		window._cburResizeHandler = () => {
// 			if (_heightObs) { _heightObs.disconnect(); _heightObs = null; }
// 			setTimeout(() => { autoFitColumns(); pinHeight(); watchHeight(); }, 120);
// 		};
// 		window.addEventListener("resize", window._cburResizeHandler);

// 		// Initial paint — wait for Frappe to fully render the datatable
// 		setTimeout(fullRun, 800);

// 		// After every report refresh
// 		frappe.query_report.after_datatable_render = () => {
// 			if (_heightObs) { _heightObs.disconnect(); _heightObs = null; }
// 			// Pass 1: approximate widths
// 			setTimeout(() => {
// 				autoFitColumns();
// 				// Pass 2: accurate widths after reflow, then collapse
// 				setTimeout(() => {
// 					autoFitColumns();
// 					pinHeight();
// 					watchHeight();
// 					setTimeout(collapsePartnerRows, 80);
// 				}, 200);
// 			}, 300);
// 		};

// 		// 8. Excel export button
// 		report.page.add_button(__("⬇ Export Excel"), () => {
// 			const filters = {};
// 			(frappe.query_report.filters || []).forEach((f) => {
// 				const v = f.value;
// 				if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length))
// 					filters[f.fieldname] = v;
// 			});
// 			window.open(
// 				"/api/method/" + EXCEL_METHOD +
// 				"?filters=" + encodeURIComponent(JSON.stringify(filters))
// 			);
// 		});

// 		// 9. Partner filter → cascade-clear dependent filters
// 		setTimeout(() => {
// 			const pf = report.get_filter("partner_id");
// 			if (pf && pf.$input) {
// 				pf.$input.on("awesomplete-selectcomplete change", () => {
// 					["budget_reference", "grant_id", "state", "district", "block"].forEach((k) => {
// 						const ctrl = report.get_filter(k);
// 						if (ctrl) { try { ctrl.set_value([]); } catch (_) {} }
// 					});
// 				});
// 			}
// 		}, 800);
// 	},

// 	// ── Cell formatter ────────────────────────────────────────────────────────
// 	formatter(value, row, column, data, default_formatter) {
// 		value = default_formatter(value, row, column, data);

// 		// Grand total — navy pill
// 		if (data && data.is_grand_total)
// 			return `<span class="cbur-grand-total">${value}</span>`;

// 		// Partner row — blue pill
// 		if (data && data.indent === 0)
// 			return `<span class="cbur-partner">${value}</span>`;

// 		// % utilisation — traffic-light pill
// 		if (
// 			column.fieldname === "utilised_vs_budget" ||
// 			column.fieldname === "utilised_vs_disbursed"
// 		) {
// 			const pct = parseFloat(data[column.fieldname]) || 0;
// 			const [bg, fg] =
// 				pct >= 75 ? ["#D5F5E3", "#1E8449"] :
// 				pct >= 50 ? ["#FEF9E7", "#D35400"] :
// 				            ["#FADBD8", "#C0392B"];
// 			return (
// 				`<span style="background:${bg};color:${fg};padding:2px 10px;` +
// 				`border-radius:12px;font-weight:700;display:inline-block;` +
// 				`min-width:52px;text-align:center;">${value}</span>`
// 			);
// 		}

// 		return value;
// 	},
// };



// last working ===========================================================================================================

// // Copyright (c) 2026, Azim Premji Foundation and contributors

// const EXCEL_METHOD =
// 	"creche_reports.creche_finance_reports.report.creche_budget_utilisation_report" +
// 	".creche_budget_utilisation_report.download_excel";

// const CBUR_CSS = `
// 	.dt-cell__content { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

// 	.dt-cell[data-col-index="0"] .dt-cell__content,
// 	.dt-header .dt-cell[data-col-index="0"] .dt-cell__content {
// 		text-align:left !important; justify-content:flex-start !important;
// 	}
// 	.dt-cell[data-col-index]:not([data-col-index="0"]) .dt-cell__content,
// 	.dt-header .dt-cell:not([data-col-index="0"]) .dt-cell__content {
// 		text-align:right !important; justify-content:flex-end !important;
// 	}

// 	.dt-scrollable .dt-row:has(.cbur-partner) .dt-cell          { background-color:#E8F5E9 !important; }
// 	.dt-scrollable .dt-row:has(.cbur-partner) .dt-cell__content { font-weight:700 !important; color:#1B5E20 !important; }
// 	.dt-scrollable .dt-row:has(.cbur-partner) .dt-cell:first-of-type { border-left:4px solid #43A047 !important; }
// 	.dt-scrollable .dt-row:has(.cbur-child-odd) .dt-cell        { background-color:#F9FBE7 !important; }
// 	.dt-scrollable .dt-row:has(.cbur-grand-total) .dt-cell      { background-color:#1B5E20 !important; }
// 	.dt-scrollable .dt-row:has(.cbur-grand-total) .dt-cell__content { font-weight:700 !important; color:#FFFFFF !important; }
// 	.dt-scrollable .dt-row:has(.cbur-grand-total) .dt-cell:first-of-type { border-left:4px solid #081C09 !important; }

// 	/* Hide native Run button */
// 	.page-run-filter-btn { display:none !important; }

// 	/* Clear button bar */
// 	.cbur-btn-bar {
// 		display:flex; gap:8px; align-items:center;
// 		padding:8px 15px 10px; flex-wrap:wrap;
// 		border-top:1px solid var(--border-color,#EBEFF2);
// 		background:var(--fg-color,#fff);
// 	}

// 	/* Mutual-exclusion hide — targets the outermost filter cell */
// 	.cbur-col-hidden { display:none !important; }
// `;

// frappe.query_reports["Creche Budget Utilisation Report"] = {
// 	tree: true,
// 	name_field: "row_name",
// 	initial_depth: 0,

// 	get_datatable_options(options) {
// 		return Object.assign(options, { layout:"fixed", cellHeight:35, headerDropdown:[] });
// 	},

// 	filters: [
// 		{
// 			fieldname: "level",
// 			label: __("Level"),
// 			fieldtype: "Select",
// 			options: "Partner Wise\nBudget Wise\nState\nDistrict\nBlock",
// 			default: "Partner Wise",
// 		},
// 		{
// 			fieldname: "partner_id",
// 			label: __("Partner"),
// 			fieldtype: "MultiSelectList",
// 			get_data(txt) {
// 				return frappe.call({
// 					method: "creche_reports.api.budget_utilisation_summary.get_partner_options",
// 					args: { txt: txt || "" },
// 				}).then((r) => (r.message || []).map((p) => ({ value: p.partner_name || p.name, description: p.name })));
// 			},
// 		},
// 		{
// 			fieldname: "budget_reference",
// 			label: __("Budget Reference"),
// 			fieldtype: "MultiSelectList",
// 			get_data(txt) {
// 				const partners = frappe.query_report.get_filter_value("partner_id") || [];
// 				const f = {};
// 				if (partners.length) f.partner_name = ["in", partners];
// 				if (txt) f.budget_reference_name = ["like", `%${txt}%`];
// 				return frappe.db.get_list("Creche Budget", { filters:f, fields:["budget_reference_name"], limit:50 })
// 					.then((rows) => [...new Set(rows.map((r) => r.budget_reference_name).filter(Boolean))].map((v) => ({ value:v, description:"" })));
// 			},
// 		},
// 		{
// 			fieldname: "grant_id",
// 			label: __("Grant ID"),
// 			fieldtype: "MultiSelectList",
// 			get_data(txt) {
// 				const partners = frappe.query_report.get_filter_value("partner_id") || [];
// 				const f = {};
// 				if (partners.length) f.partner_name = ["in", partners];
// 				if (txt) f.grant_id = ["like", `%${txt}%`];
// 				return frappe.db.get_list("Creche Budget", { filters:f, fields:["grant_id"], limit:50 })
// 					.then((rows) => [...new Set(rows.map((r) => r.grant_id).filter(Boolean))].map((v) => ({ value:v, description:"" })));
// 			},
// 		},
// 		{
// 			fieldname: "financial_year",
// 			label: __("Financial Year"),
// 			fieldtype: "MultiSelectList",
// 			get_data(txt) {
// 				return frappe.db.get_list("Financial year", {
// 					fields:["name"], limit:50, order_by:"name desc",
// 					...(txt ? { filters:{ name:["like",`%${txt}%`] } } : {}),
// 				}).then((rows) => rows.map((r) => ({ value:r.name, description:"" })));
// 			},
// 		},
// 		{
// 			fieldname: "month",
// 			label: __("Month"),
// 			fieldtype: "MultiSelectList",
// 			get_data(txt) {
// 				return frappe.db.get_list("Months", {
// 					fields:["name"], limit:20, order_by:"name asc",
// 					...(txt ? { filters:{ name:["like",`%${txt}%`] } } : {}),
// 				}).then((rows) => rows.map((r) => ({ value:r.name, description:"" })));
// 			},
// 		},
// 		{
// 			fieldname: "state",
// 			label: __("State"),
// 			fieldtype: "MultiSelectList",
// 			get_data(txt) {
// 				const partners = frappe.query_report.get_filter_value("partner_id") || [];
// 				const f = {};
// 				if (partners.length) f.partner_name = ["in", partners];
// 				if (txt) f.state = ["like", `%${txt}%`];
// 				return frappe.db.get_list("Creche Budget", { filters:f, fields:["state"], limit:100 })
// 					.then((rows) => [...new Set(rows.map((r) => r.state).filter(Boolean))].sort().map((v) => ({ value:v, description:"" })));
// 			},
// 		},
// 		{
// 			fieldname: "district",
// 			label: __("District"),
// 			fieldtype: "MultiSelectList",
// 			get_data(txt) {
// 				const partners = frappe.query_report.get_filter_value("partner_id") || [];
// 				const f = {};
// 				if (partners.length) f.partner_name = ["in", partners];
// 				if (txt) f.district = ["like", `%${txt}%`];
// 				return frappe.db.get_list("Creche Budget", { filters:f, fields:["district"], limit:100 })
// 					.then((rows) => [...new Set(rows.map((r) => r.district).filter(Boolean))].sort().map((v) => ({ value:v, description:"" })));
// 			},
// 		},
// 		{
// 			fieldname: "block",
// 			label: __("Block"),
// 			fieldtype: "MultiSelectList",
// 			get_data(txt) {
// 				const partners = frappe.query_report.get_filter_value("partner_id") || [];
// 				const f = {};
// 				if (partners.length) f.partner_name = ["in", partners];
// 				if (txt) f.block = ["like", `%${txt}%`];
// 				return frappe.db.get_list("Creche Budget", { filters:f, fields:["block"], limit:100 })
// 					.then((rows) => [...new Set(rows.map((r) => r.block).filter(Boolean))].sort().map((v) => ({ value:v, description:"" })));
// 			},
// 		},
// 		{ fieldname: "start_date", label: __("Start Date"), fieldtype: "Date" },
// 		{ fieldname: "end_date",   label: __("End Date"),   fieldtype: "Date" },
// 	],

// 	onload(report) {

// 		// ── 1. CSS ────────────────────────────────────────────────────────────
// 		if (!document.getElementById("cbur-styles")) {
// 			const s = document.createElement("style");
// 			s.id = "cbur-styles"; s.textContent = CBUR_CSS;
// 			document.head.appendChild(s);
// 		}

// 		// ── 2. Ruler ──────────────────────────────────────────────────────────
// 		let ruler = document.getElementById("cbur-ruler");
// 		if (!ruler) {
// 			ruler = document.createElement("span");
// 			ruler.id = "cbur-ruler";
// 			Object.assign(ruler.style, {
// 				position:"fixed", top:"-9999px", left:"-9999px", visibility:"hidden",
// 				whiteSpace:"nowrap", fontSize:"13px", padding:"0", margin:"0", border:"none",
// 				fontFamily:"var(--font-stack,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif)",
// 			});
// 			document.body.appendChild(ruler);
// 		}
// 		const measure = (str) => { ruler.textContent = String(str ?? ""); return ruler.getBoundingClientRect().width; };

// 		// ── 3. Height ─────────────────────────────────────────────────────────
// 		let _heightObs = null;
// 		const pinHeight = () => {
// 			const el = document.querySelector(".report-results .dt-scrollable");
// 			if (!el) return;
// 			const h = Math.max(120, window.innerHeight - el.getBoundingClientRect().top - 56) + "px";
// 			["height","max-height","min-height"].forEach((p) => el.style.setProperty(p, h, "important"));
// 			el.style.setProperty("overflow-y", "auto", "important");
// 		};
// 		const watchHeight = () => {
// 			if (_heightObs) { _heightObs.disconnect(); _heightObs = null; }
// 			const el = document.querySelector(".report-results .dt-scrollable");
// 			if (!el) return;
// 			_heightObs = new MutationObserver(pinHeight);
// 			_heightObs.observe(el, { attributes:true, attributeFilter:["style"] });
// 		};

// 		// ── 4. Column auto-fit ────────────────────────────────────────────────
// 		const autoFitColumns = () => {
// 			const dt = frappe.query_report.datatable;
// 			if (!dt) return;
// 			const PAD = 28, MIN_W = 60, BUF = 10;
// 			let cols = [];
// 			try { cols = dt.datamanager.getColumns(false); } catch (_) { return; }
// 			if (!cols.length) return;
// 			const widths = cols.map((c) => Math.max(MIN_W, measure(c.name || c.label || c.id || "") + PAD + BUF));
// 			cols.forEach((c, i) => {
// 				document.querySelectorAll(
// 					`.report-results .dt-scrollable .dt-cell[data-col-index="${c.colIndex??i}"] .dt-cell__content,
// 					 .report-results .dt-header .dt-cell[data-col-index="${c.colIndex??i}"] .dt-cell__content`
// 				).forEach((el) => { const w = measure((el.innerText||el.textContent||"").trim())+PAD+BUF; if(w>widths[i]) widths[i]=w; });
// 			});
// 			const avail = document.querySelector(".report-results")?.getBoundingClientRect().width || window.innerWidth-80;
// 			const total = widths.reduce((a,b)=>a+b,0);
// 			const final = total<avail ? widths.map((w)=>Math.round(w*avail/total)) : widths;
// 			cols.forEach((c,i) => { try { dt.style.setColumnWidth(c.colIndex??i, final[i]); } catch(_){} });
// 			try { dt.style.distributeRemainingWidth(); } catch(_){}
// 			try { dt.rowmanager.refreshRows(); } catch(_){}
// 		};

// 		// ── 5. Collapse rows ──────────────────────────────────────────────────
// 		const collapsePartnerRows = () => {
// 			const dt = frappe.query_report.datatable;
// 			if (!dt) return;
// 			try {
// 				(dt.datamanager.rows||[]).forEach((rowArr) => {
// 					const meta = Array.isArray(rowArr) ? rowArr[0] : rowArr;
// 					if (meta && meta.indent===0 && !meta.isLeaf) { try { dt.rowmanager.collapseRow(meta.rowIndex); } catch(_){} }
// 				});
// 			} catch(_) {
// 				document.querySelectorAll(".report-results .dt-scrollable .dt-row[data-indent='0']").forEach((rowEl) => {
// 					if (rowEl.getAttribute("data-is-open")!=="true") return;
// 					const t = rowEl.querySelector(".dt-row-toggle");
// 					if (t) { try { t.click(); } catch(_){} }
// 				});
// 			}
// 		};

// 		// ── 6. Master run ─────────────────────────────────────────────────────
// 		const fullRun = () => { autoFitColumns(); pinHeight(); watchHeight(); setTimeout(collapsePartnerRows,80); };
// 		if (window._cburResizeHandler) window.removeEventListener("resize", window._cburResizeHandler);
// 		window._cburResizeHandler = () => { if(_heightObs){_heightObs.disconnect();_heightObs=null;} setTimeout(()=>{autoFitColumns();pinHeight();watchHeight();},120); };
// 		window.addEventListener("resize", window._cburResizeHandler);
// 		setTimeout(fullRun, 800);
// 		frappe.query_report.after_datatable_render = () => {
// 			if(_heightObs){_heightObs.disconnect();_heightObs=null;}
// 			setTimeout(()=>{ autoFitColumns(); setTimeout(()=>{ autoFitColumns(); pinHeight(); watchHeight(); setTimeout(collapsePartnerRows,80); },200); },300);
// 		};

// 		// ── 7. Excel export ───────────────────────────────────────────────────
// 		report.page.add_button(__("Export Excel"), () => {
// 			const filters = {};
// 			(frappe.query_report.filters||[]).forEach((f) => {
// 				const v = f.value;
// 				if (v!==undefined && v!==null && v!=="" && !(Array.isArray(v)&&!v.length)) filters[f.fieldname]=v;
// 			});
// 			window.open("/api/method/"+EXCEL_METHOD+"?filters="+encodeURIComponent(JSON.stringify(filters)));
// 		}, __("Download"));

// 		// ── 8. Mutually-exclusive filter visibility ───────────────────────────
// 		//
// 		// Group A = [financial_year, month]  — hide when Group B has a value
// 		// Group B = [start_date, end_date]   — hide when Group A has a value
// 		//
// 		// KEY INSIGHT: Frappe's filter object has a $wrapper property that points
// 		// directly to the outermost jQuery element for that filter cell (including
// 		// the label). We use that instead of DOM-walking, which was fragile.
// 		// ─────────────────────────────────────────────────────────────────────

// 		const GROUP_A = ["financial_year", "month"];
// 		const GROUP_B = ["start_date", "end_date"];

// 		// Get the outermost DOM element for a filter — try $wrapper first, then walk up
// 		const _getFilterEl = (fieldname) => {
// 			const f = report.get_filter(fieldname);
// 			if (!f) return null;

// 			// Frappe filter object exposes $wrapper (the full cell including label)
// 			if (f.$wrapper && f.$wrapper[0]) return f.$wrapper[0];

// 			// Fallback: walk up from $input until we're a direct child of .page-form
// 			const inp = f.$input && f.$input[0];
// 			if (!inp) return null;
// 			let el = inp;
// 			const pageForm = document.querySelector(".page-form");
// 			while (el && el.parentElement && el.parentElement !== pageForm && el.parentElement !== document.body) {
// 				el = el.parentElement;
// 			}
// 			return el;
// 		};

// 		const _hasValue = (fn) => {
// 			try {
// 				const v = frappe.query_report.get_filter_value(fn);
// 				if (v == null || v === "") return false;
// 				return Array.isArray(v) ? v.length > 0 : String(v).trim() !== "";
// 			} catch (_) { return false; }
// 		};

// 		const _setVisible = (fieldnames, show) => {
// 			fieldnames.forEach((fn) => {
// 				const el = _getFilterEl(fn);
// 				if (!el) return;
// 				if (show) { el.classList.remove("cbur-col-hidden"); el.style.removeProperty("display"); }
// 				else      { el.classList.add("cbur-col-hidden"); }
// 			});
// 		};

// 		const _syncVisibility = () => {
// 			const aOn = GROUP_A.some(_hasValue);
// 			const bOn = GROUP_B.some(_hasValue);
// 			if      (bOn && !aOn) { _setVisible(GROUP_A, false); _setVisible(GROUP_B, true);  }
// 			else if (aOn && !bOn) { _setVisible(GROUP_A, true);  _setVisible(GROUP_B, false); }
// 			else                  { _setVisible(GROUP_A, true);  _setVisible(GROUP_B, true);  }
// 		};

// 		// Listen for value changes on all 4 filters
// 		const _attachSyncListeners = () => {
// 			let n = 0;
// 			[...GROUP_A, ...GROUP_B].forEach((fn) => {
// 				const f = report.get_filter(fn);
// 				if (!f) return;
// 				if (f.$input) {
// 					f.$input.off(".cburvis")
// 						.on("change.cburvis input.cburvis awesomplete-selectcomplete.cburvis dp.change.cburvis",
// 							() => setTimeout(_syncVisibility, 80));
// 					n++;
// 				}
// 				// MultiSelectList pill × button
// 				const el = _getFilterEl(fn);
// 				if (el && !el._cburVisClick) {
// 					el._cburVisClick = true;
// 					el.addEventListener("click", (e) => {
// 						if (e.target.closest(".tb-close-icon, .remove, .btn-remove, [data-action='remove']"))
// 							setTimeout(_syncVisibility, 150);
// 					});
// 				}
// 			});
// 			return n >= 2;
// 		};

// 		let _visN = 0;
// 		const _visTimer = setInterval(() => {
// 			_visN++;
// 			const ok = _attachSyncListeners();
// 			_syncVisibility();
// 			if (ok || _visN >= 30) clearInterval(_visTimer);
// 		}, 200);

// 		// ── 9. Clear filters ──────────────────────────────────────────────────
// 		const clearFilters = () => {
// 			["partner_id","budget_reference","grant_id","financial_year","state","district","block","month"]
// 				.forEach((k) => { try { report.get_filter(k)?.set_value([]); } catch(_){} });
// 			["start_date","end_date"]
// 				.forEach((k) => { try { report.get_filter(k)?.set_value(""); } catch(_){} });
// 			try { report.get_filter("level")?.set_value("Partner Wise"); } catch(_){}
// 			setTimeout(() => { _syncVisibility(); frappe.query_report.refresh(); }, 50);
// 		};

// 		// ── 10. Partner cascade-clear ─────────────────────────────────────────
// 		setTimeout(() => {
// 			const pf = report.get_filter("partner_id");
// 			if (pf?.$input) {
// 				pf.$input.on("awesomplete-selectcomplete change", () => {
// 					["budget_reference","grant_id","state","district","block"]
// 						.forEach((k) => { try { report.get_filter(k)?.set_value([]); } catch(_){} });
// 				});
// 			}
// 		}, 800);

// 		// ── 11. Clear-only button bar ─────────────────────────────────────────
// 		const injectClearBar = () => {
// 			if (document.getElementById("cbur-btn-bar")) return true;
// 			const anchor = document.querySelector(".page-form")
// 				|| document.querySelector(".filters-form")
// 				|| document.querySelector(".standard-filter-section")
// 				|| document.querySelector(".filter-section");
// 			if (!anchor) return false;

// 			const bar = document.createElement("div");
// 			bar.id = "cbur-btn-bar";
// 			bar.className = "cbur-btn-bar";
// 			bar.innerHTML = `
// 				<button class="btn btn-default btn-sm cbur-clear">
// 					<svg class="icon icon-xs" style="margin-right:5px;vertical-align:-2px;">
// 						<use href="#icon-filter-x" xlink:href="#icon-filter-x"></use>
// 					</svg>${__("Clear All Filters")}
// 				</button>
// 			`;
// 			anchor.appendChild(bar);
// 			bar.querySelector(".cbur-clear").addEventListener("click", clearFilters);
// 			return true;
// 		};

// 		let _barN = 0;
// 		const _barTimer = setInterval(() => {
// 			_barN++;
// 			if (injectClearBar() || _barN >= 20) clearInterval(_barTimer);
// 		}, 200);
// 	},

// 	formatter(value, row, column, data, default_formatter) {
// 		value = default_formatter(value, row, column, data);
// 		if (data?.is_grand_total)
// 			return `<span class="cbur-grand-total">${value}</span>`;
// 		if (data?.indent === 0 && !data.is_budget_row)
// 			return `<span class="cbur-partner">${value}</span>`;
// 		if (data?.indent === 1 && data._row_idx % 2 === 1)
// 			return `<span class="cbur-child-odd">${value}</span>`;
// 		if (column.fieldname==="utilised_vs_budget" || column.fieldname==="utilised_vs_disbursed") {
// 			const pct = parseFloat(data[column.fieldname]) || 0;
// 			const [bg,fg] = pct>=75 ? ["#DCFCE7","#166534"] : pct>=50 ? ["#FEF9C3","#854D0E"] : ["#FEE2E2","#991B1B"];
// 			return `<span style="background:${bg};color:${fg};padding:2px 10px;border-radius:12px;font-weight:700;display:inline-block;min-width:52px;text-align:center;">${value}</span>`;
// 		}
// 		return value;
// 	},
// };





// Copyright (c) 2026, Azim Premji Foundation and contributors

const EXCEL_METHOD =
	"creche_reports.creche_finance_reports.report.creche_budget_utilisation_report" +
	".creche_budget_utilisation_report.download_excel";

const CBUR_CSS = `
	/* ── Column alignment ── */
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

	/* ── Cell text ── */
	.dt-cell__content {
		white-space: nowrap !important;
		overflow: hidden !important;
		text-overflow: ellipsis !important;
	}

	/* ── Row colours — grey / neutral palette ── */

	/* Parent / group row — slate blue-grey */
	.dt-scrollable .dt-row:has(.cbur-partner) .dt-cell {
		background-color: #E8EDF2 !important;
	}
	.dt-scrollable .dt-row:has(.cbur-partner) .dt-cell__content {
		font-weight: 700 !important;
		color: #1E3A5F !important;
	}
	.dt-scrollable .dt-row:has(.cbur-partner) .dt-cell:first-of-type {
		border-left: 4px solid #4A7AB5 !important;
	}

	/* Odd child rows — very light grey */
	.dt-scrollable .dt-row:has(.cbur-child-odd) .dt-cell {
		background-color: #F5F6F8 !important;
	}

	/* Even child rows — pure white (DataTable default) */
	.dt-scrollable .dt-row:not(:has(.cbur-partner)):not(:has(.cbur-child-odd)):not(:has(.cbur-grand-total)) .dt-cell {
		background-color: #FFFFFF !important;
	}

	/* Grand total row — deep charcoal */
	.dt-scrollable .dt-row:has(.cbur-grand-total) .dt-cell {
		background-color: #2C3E50 !important;
	}
	.dt-scrollable .dt-row:has(.cbur-grand-total) .dt-cell__content {
		font-weight: 700 !important;
		color: #FFFFFF !important;
	}
	.dt-scrollable .dt-row:has(.cbur-grand-total) .dt-cell:first-of-type {
		border-left: 4px solid #1A252F !important;
	}

	/* ── Scroll architecture: ONE scrollbar per axis ── */
	.report-results {
		width: 100% !important;
		overflow: visible !important;
		box-sizing: border-box !important;
	}
	/* Horizontal scroll lives here */
	.report-results .datatable,
	.report-results .dt-instance {
		width: 100% !important;
		overflow-x: auto !important;
		overflow-y: visible !important;
		-webkit-overflow-scrolling: touch;
	}
	/* Vertical scroll only here — no second horizontal bar */
	.report-results .dt-scrollable {
		overflow-x: hidden !important;
		overflow-y: auto !important;
		-webkit-overflow-scrolling: touch;
	}
	.report-results .dt-header {
		overflow: visible !important;
	}

	/* ── Hide native Run button ── */
	.page-run-filter-btn { display: none !important; }

	/* ── Clear button bar ── */
	.cbur-btn-bar {
		display: flex;
		gap: 8px;
		align-items: center;
		padding: 8px 15px 10px;
		flex-wrap: wrap;
		border-top: 1px solid var(--border-color, #E2E6EA);
		background: var(--fg-color, #fff);
	}

	/* ── Hidden filter column ── */
	.cbur-col-hidden { display: none !important; }
`;

frappe.query_reports["Creche Budget Utilisation Report"] = {
	tree: true,
	name_field: "row_name",
	initial_depth: 0,

	get_datatable_options(options) {
		return Object.assign(options, {
			layout: "fixed",
			cellHeight: 35,
			headerDropdown: [],
		});
	},

	filters: [
		{
			fieldname: "level",
			label: __("Level"),
			fieldtype: "Select",
			options: "Partner Wise\nBudget Wise\nState\nDistrict\nBlock",
			default: "Partner Wise",
		},
		{
			fieldname: "partner_id",
			label: __("Partner"),
			fieldtype: "MultiSelectList",
			get_data(txt) {
				return frappe.call({
					method: "creche_reports.api.budget_utilisation_summary.get_partner_options",
					args: { txt: txt || "" },
				}).then((r) => (r.message || []).map((p) => ({ value: p.partner_name || p.name, description: p.name })));
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
				return frappe.db.get_list("Creche Budget", { filters: f, fields: ["budget_reference_name"], limit: 50 })
					.then((rows) => [...new Set(rows.map((r) => r.budget_reference_name).filter(Boolean))].map((v) => ({ value: v, description: "" })));
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
				return frappe.db.get_list("Creche Budget", { filters: f, fields: ["grant_id"], limit: 50 })
					.then((rows) => [...new Set(rows.map((r) => r.grant_id).filter(Boolean))].map((v) => ({ value: v, description: "" })));
			},
		},
		{
			fieldname: "financial_year",
			label: __("Financial Year"),
			fieldtype: "MultiSelectList",
			get_data(txt) {
				return frappe.db.get_list("Financial year", {
					fields: ["name"], limit: 50, order_by: "name desc",
					...(txt ? { filters: { name: ["like", `%${txt}%`] } } : {}),
				}).then((rows) => rows.map((r) => ({ value: r.name, description: "" })));
			},
		},
		{
			fieldname: "month",
			label: __("Month"),
			fieldtype: "MultiSelectList",
			get_data(txt) {
				return frappe.db.get_list("Months", {
					fields: ["name"], limit: 20, order_by: "name asc",
					...(txt ? { filters: { name: ["like", `%${txt}%`] } } : {}),
				}).then((rows) => rows.map((r) => ({ value: r.name, description: "" })));
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
				return frappe.db.get_list("Creche Budget", { filters: f, fields: ["state"], limit: 100 })
					.then((rows) => [...new Set(rows.map((r) => r.state).filter(Boolean))].sort().map((v) => ({ value: v, description: "" })));
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
				return frappe.db.get_list("Creche Budget", { filters: f, fields: ["district"], limit: 100 })
					.then((rows) => [...new Set(rows.map((r) => r.district).filter(Boolean))].sort().map((v) => ({ value: v, description: "" })));
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
				return frappe.db.get_list("Creche Budget", { filters: f, fields: ["block"], limit: 100 })
					.then((rows) => [...new Set(rows.map((r) => r.block).filter(Boolean))].sort().map((v) => ({ value: v, description: "" })));
			},
		},
		{ fieldname: "start_date", label: __("Start Date"), fieldtype: "Date" },
		{ fieldname: "end_date",   label: __("End Date"),   fieldtype: "Date" },
	],

	onload(report) {

		// ── 1. CSS ────────────────────────────────────────────────────────────
		if (!document.getElementById("cbur-styles")) {
			const s = document.createElement("style");
			s.id = "cbur-styles"; s.textContent = CBUR_CSS;
			document.head.appendChild(s);
		}

		// ── 2. Off-screen canvas for pixel-accurate text measurement ──────────
		// Canvas.measureText is the most reliable cross-browser approach:
		// it doesn't require a DOM element to be visible, always returns the
		// exact rendered width at any font, and is not affected by CSS transforms.
		let _canvas = null;
		let _ctx    = null;

		const _getCtx = () => {
			if (_ctx) return _ctx;
			_canvas = document.createElement("canvas");
			_ctx    = _canvas.getContext("2d");
			return _ctx;
		};

		// Sync the canvas font to the actual rendered table font
		const _syncFont = () => {
			const ctx  = _getCtx();
			const cell = document.querySelector(".report-results .dt-cell__content");
			if (cell) {
				const cs = window.getComputedStyle(cell);
				ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
			} else {
				ctx.font = "normal 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
			}
		};

		// Also need a bold variant for header / parent rows
		const _syncFontBold = () => {
			const ctx  = _getCtx();
			const cell = document.querySelector(".report-results .dt-header .dt-cell__content");
			if (cell) {
				const cs = window.getComputedStyle(cell);
				ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
			} else {
				ctx.font = "600 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
			}
		};

		const measureText = (str, bold = false) => {
			if (bold) _syncFontBold(); else _syncFont();
			return _getCtx().measureText(String(str ?? "")).width;
		};

		// ── 3. Vertical height pinning ────────────────────────────────────────
		let _heightObs = null;
		const pinHeight = () => {
			const scrollEl = document.querySelector(".report-results .dt-scrollable");
			if (!scrollEl) return;
			const top = scrollEl.getBoundingClientRect().top;
			const h   = Math.max(200, window.innerHeight - top - 40) + "px";
			scrollEl.style.setProperty("height",     h, "important");
			scrollEl.style.setProperty("max-height", h, "important");
			scrollEl.style.setProperty("overflow-y", "auto",   "important");
			scrollEl.style.setProperty("overflow-x", "hidden", "important");
		};
		const watchHeight = () => {
			if (_heightObs) { _heightObs.disconnect(); _heightObs = null; }
			const el = document.querySelector(".report-results .dt-scrollable");
			if (!el) return;
			_heightObs = new MutationObserver(pinHeight);
			_heightObs.observe(el, { attributes: true, attributeFilter: ["style"] });
		};

		const autoFitColumns = () => {
			const dt = frappe.query_report.datatable;
			if (!dt) return;

			const CELL_PAD = 22;   // total L+R padding inside a cell
			const SORT_W   = 22;   // sort-arrow icon width in header cells
			const INDENT_W = 18;   // per-level indent added by DataTable tree view
			const MIN_W    = 55;   // absolute minimum column width

			let cols = [];
			try { cols = dt.datamanager.getColumns(false); } catch (_) { return; }
			if (!cols.length) return;

			// ── Step 1: seed width from header label ──────────────────────────
			const nat = cols.map((c) => {
				const label = c.name || c.label || c.id || "";
				return Math.max(MIN_W, measureText(label, true) + CELL_PAD + SORT_W);
			});

			// ── Step 2: walk every rendered cell and expand nat[i] if wider ───
			cols.forEach((c, i) => {
				const idx = c.colIndex ?? i;

				// Header cells (bold font)
				document.querySelectorAll(
					`.report-results .dt-header .dt-cell[data-col-index="${idx}"] .dt-cell__content`
				).forEach((el) => {
					const t = (el.innerText || el.textContent || "").trim();
					if (!t) return;
					const w = measureText(t, true) + CELL_PAD + SORT_W;
					if (w > nat[i]) nat[i] = w;
				});

				// Data cells — measure every row including indent for col 0
				document.querySelectorAll(
					`.report-results .dt-scrollable .dt-cell[data-col-index="${idx}"] .dt-cell__content`
				).forEach((el) => {
					const t = (el.innerText || el.textContent || "").trim();
					if (!t) return;
					// For col 0 account for tree indent
					const indent = (i === 0)
						? (parseInt(el.closest(".dt-row")?.getAttribute("data-indent") || "0", 10) * INDENT_W)
						: 0;
					const w = measureText(t, false) + CELL_PAD + indent;
					if (w > nat[i]) nat[i] = w;
				});
			});

			// ── Step 3: find the true available content width ─────────────────
			// Walk up from .report-results to find the nearest ancestor that has
			// a real layout width (i.e. is not overflow:visible / auto with no
			// explicit width). Frappe's .layout-main-section or .page-body is
			// reliable in all Frappe v14–v16 layouts.
			const layoutEl =
				document.querySelector(".layout-main-section-wrapper") ||
				document.querySelector(".layout-main-section") ||
				document.querySelector(".page-content") ||
				document.querySelector(".main-section") ||
				document.body;

			const availWidth = Math.floor(layoutEl.getBoundingClientRect().width) - 10;

			const totalNat = nat.reduce((a, b) => a + b, 0);

			// ── Step 4: distribute widths ─────────────────────────────────────
			let final;
			if (totalNat > 0 && totalNat < availWidth) {
				// Scale proportionally to fill
				final = nat.map((w) => Math.floor((w / totalNat) * availWidth));
				// Give rounding remainder to col 0
				const used = final.reduce((a, b) => a + b, 0);
				if (availWidth > used) final[0] += availWidth - used;
			} else {
				// Natural widths — table will scroll horizontally
				final = nat;
			}

			// ── Step 5: apply ─────────────────────────────────────────────────
			cols.forEach((c, i) => {
				try { dt.style.setColumnWidth(c.colIndex ?? i, final[i]); } catch (_) {}
			});
			try { dt.style.distributeRemainingWidth(); } catch (_) {}
			try { dt.rowmanager.refreshRows(); } catch (_) {}
		};

		// ── 5. Collapse indent-0 rows ─────────────────────────────────────────
		const collapsePartnerRows = () => {
			const dt = frappe.query_report.datatable;
			if (!dt) return;
			try {
				(dt.datamanager.rows || []).forEach((rowArr) => {
					const meta = Array.isArray(rowArr) ? rowArr[0] : rowArr;
					if (meta && meta.indent === 0 && !meta.isLeaf) {
						try { dt.rowmanager.collapseRow(meta.rowIndex); } catch (_) {}
					}
				});
			} catch (_) {
				document.querySelectorAll(".report-results .dt-scrollable .dt-row[data-indent='0']")
					.forEach((rowEl) => {
						if (rowEl.getAttribute("data-is-open") !== "true") return;
						const t = rowEl.querySelector(".dt-row-toggle");
						if (t) { try { t.click(); } catch (_) {} }
					});
			}
		};

		// ── 6. Run sequence ───────────────────────────────────────────────────
		const fullRun = () => {
			autoFitColumns();
			setTimeout(() => { autoFitColumns(); pinHeight(); watchHeight(); setTimeout(collapsePartnerRows, 80); }, 200);
		};

		if (window._cburResizeHandler) window.removeEventListener("resize", window._cburResizeHandler);
		window._cburResizeHandler = () => {
			if (_heightObs) { _heightObs.disconnect(); _heightObs = null; }
			clearTimeout(window._cburResizeTimer);
			window._cburResizeTimer = setTimeout(() => { autoFitColumns(); pinHeight(); watchHeight(); }, 160);
		};
		window.addEventListener("resize", window._cburResizeHandler);

		setTimeout(fullRun, 500);

		frappe.query_report.after_datatable_render = () => {
			if (_heightObs) { _heightObs.disconnect(); _heightObs = null; }
			autoFitColumns();
			setTimeout(() => { autoFitColumns(); pinHeight(); watchHeight(); }, 250);
			setTimeout(() => { autoFitColumns(); pinHeight(); watchHeight(); setTimeout(collapsePartnerRows, 80); }, 550);
		};

		// ── 7. Excel export ───────────────────────────────────────────────────
		report.page.add_button(__("Export Excel"), () => {
			const filters = {};
			(frappe.query_report.filters || []).forEach((f) => {
				const v = f.value;
				if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length))
					filters[f.fieldname] = v;
			});
			window.open("/api/method/" + EXCEL_METHOD + "?filters=" + encodeURIComponent(JSON.stringify(filters)));
		}, __("Download"));

		// ── 8. Date validation: start_date must not be after end_date ──────────
		const _showDateError = (msg) => {
			frappe.show_alert({ message: __(msg), indicator: "red" }, 4);
		};

		const _validateDates = (changed) => {
			const sdF = report.get_filter("start_date");
			const edF = report.get_filter("end_date");
			const sd  = sdF?.get_value ? sdF.get_value() : "";
			const ed  = edF?.get_value ? edF.get_value() : "";
			if (!sd || !ed) return true;
			const sdD = new Date(sd), edD = new Date(ed);
			if (isNaN(sdD) || isNaN(edD)) return true;
			if (sdD > edD) {
				_showDateError("Start Date cannot be later than End Date.");
				try {
					if (changed === "start_date") report.get_filter("start_date")?.set_value("");
					else                          report.get_filter("end_date")?.set_value("");
				} catch (_) {}
				return false;
			}
			return true;
		};

		const _attachDateValidation = () => {
			["start_date", "end_date"].forEach((fn) => {
				const f = report.get_filter(fn);
				if (!f?.$input) return;
				f.$input.off(".cburdate")
					.on("change.cburdate dp.change.cburdate blur.cburdate",
						() => setTimeout(() => _validateDates(fn), 100));
			});
		};
		setTimeout(_attachDateValidation, 1000);

		// ── 9. Mutual-exclusion filter visibility ─────────────────────────────
		// Group A = [financial_year, month]  — hide when Group B has a value
		// Group B = [start_date, end_date]   — hide when Group A has a value
		//
		// Three-layer detection to catch all ways Frappe updates filter values:
		//   1. jQuery events on $input  (typing, datepicker, Link select)
		//   2. MutationObserver on each filter wrapper  (MultiSelectList pill add/remove)
		//   3. MutationObserver on .page-form  (Frappe re-renders filters after refresh)
		// ─────────────────────────────────────────────────────────────────────
		const GROUP_A = ["financial_year", "month"];
		const GROUP_B = ["start_date", "end_date"];

		const _getFilterEl = (fieldname) => {
			const f = report.get_filter(fieldname);
			if (!f) return null;
			if (f.$wrapper?.[0]) return f.$wrapper[0];
			const inp = f.$input?.[0];
			if (!inp) return null;
			let el = inp;
			const pf = document.querySelector(".page-form");
			while (el?.parentElement && el.parentElement !== pf && el.parentElement !== document.body)
				el = el.parentElement;
			return el;
		};

		const _hasValue = (fn) => {
			try {
				const f = report.get_filter(fn);
				const v = f?.get_value ? f.get_value() : frappe.query_report.get_filter_value(fn);
				if (v == null || v === "") return false;
				return Array.isArray(v) ? v.length > 0 : String(v).trim() !== "";
			} catch (_) { return false; }
		};

		const _setVisible = (fieldnames, show) => {
			fieldnames.forEach((fn) => {
				const el = _getFilterEl(fn);
				if (!el) return;
				if (show) { el.classList.remove("cbur-col-hidden"); el.style.removeProperty("display"); }
				else      { el.classList.add("cbur-col-hidden"); }
			});
		};

		const _syncVisibility = () => {
			const aOn = GROUP_A.some(_hasValue);
			const bOn = GROUP_B.some(_hasValue);
			if      (bOn && !aOn) { _setVisible(GROUP_A, false); _setVisible(GROUP_B, true);  }
			else if (aOn && !bOn) { _setVisible(GROUP_A, true);  _setVisible(GROUP_B, false); }
			else                  { _setVisible(GROUP_A, true);  _setVisible(GROUP_B, true);  }
		};

		const _attachSyncListeners = () => {
			let n = 0;
			[...GROUP_A, ...GROUP_B].forEach((fn) => {
				const f = report.get_filter(fn);
				if (!f) return;
				// Layer 1: jQuery input events
				if (f.$input) {
					f.$input.off(".cburvis")
						.on("change.cburvis input.cburvis awesomplete-selectcomplete.cburvis dp.change.cburvis blur.cburvis",
							() => setTimeout(_syncVisibility, 80));
					n++;
				}
				// Layer 2: MutationObserver on wrapper (MultiSelectList pills)
				const el = _getFilterEl(fn);
				if (el && !el._cburMutObs) {
					const obs = new MutationObserver(() => setTimeout(_syncVisibility, 80));
					obs.observe(el, { childList: true, subtree: true });
					el._cburMutObs = obs;
				}
			});
			return n >= 2;
		};

		// Layer 3: watch .page-form for Frappe re-renders (refresh rebuilds filter DOM)
		const _pageFormEl = document.querySelector(".page-form");
		if (_pageFormEl && !_pageFormEl._cburFormObs) {
			const _formObs = new MutationObserver(() => {
				_attachSyncListeners();
				setTimeout(_syncVisibility, 120);
			});
			_formObs.observe(_pageFormEl, { childList: true, subtree: false });
			_pageFormEl._cburFormObs = _formObs;
		}

		// Poll for 6 s (20 × 300 ms) to catch any late-rendered filters
		let _visN = 0;
		const _visTimer = setInterval(() => {
			_visN++;
			_attachSyncListeners();
			_syncVisibility();
			if (_visN >= 20) clearInterval(_visTimer);
		}, 300);

		// ── 10. Clear filters ────────────────────────────────────────────────────
		const clearFilters = () => {
			["partner_id","budget_reference","grant_id","financial_year","state","district","block","month"]
				.forEach((k) => { try { report.get_filter(k)?.set_value([]); } catch (_) {} });
			["start_date","end_date"]
				.forEach((k) => { try { report.get_filter(k)?.set_value(""); } catch (_) {} });
			try { report.get_filter("level")?.set_value("Partner Wise"); } catch (_) {}
			setTimeout(() => { _syncVisibility(); frappe.query_report.refresh(); }, 50);
		};

		// ── 11. Partner cascade-clear ──────────────────────────────────────────
		setTimeout(() => {
			const pf = report.get_filter("partner_id");
			if (pf?.$input) {
				pf.$input.on("awesomplete-selectcomplete change", () => {
					["budget_reference","grant_id","state","district","block"]
						.forEach((k) => { try { report.get_filter(k)?.set_value([]); } catch (_) {} });
				});
			}
		}, 800);

		// ── 11. Clear-only button bar ─────────────────────────────────────────
		const injectClearBar = () => {
			if (document.getElementById("cbur-btn-bar")) return true;
			const anchor = document.querySelector(".page-form")
				|| document.querySelector(".filters-form")
				|| document.querySelector(".standard-filter-section")
				|| document.querySelector(".filter-section");
			if (!anchor) return false;
			const bar = document.createElement("div");
			bar.id = "cbur-btn-bar"; bar.className = "cbur-btn-bar";
			bar.innerHTML = `
				<button class="btn btn-default btn-sm cbur-clear">
					<svg class="icon icon-xs" style="margin-right:5px;vertical-align:-2px;">
						<use href="#icon-filter-x" xlink:href="#icon-filter-x"></use>
					</svg>${__("Clear All Filters")}
				</button>`;
			anchor.appendChild(bar);
			bar.querySelector(".cbur-clear").addEventListener("click", clearFilters);
			return true;
		};

		let _barN = 0;
		const _barTimer = setInterval(() => {
			_barN++;
			if (injectClearBar() || _barN >= 20) clearInterval(_barTimer);
		}, 200);
	},

	formatter(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		if (data?.is_grand_total)
			return `<span class="cbur-grand-total">${value}</span>`;

		if (data?.indent === 0 && !data.is_budget_row)
			return `<span class="cbur-partner">${value}</span>`;

		if (data?.indent === 1 && data._row_idx % 2 === 1)
			return `<span class="cbur-child-odd">${value}</span>`;

		if (column.fieldname === "utilised_vs_budget" || column.fieldname === "utilised_vs_disbursed") {
			const pct = parseFloat(data[column.fieldname]) || 0;
			// Grey-scale traffic light: dark grey → mid grey → light grey
			const [bg, fg] =
				pct >= 75 ? ["#D6EAF8", "#1A5276"] :   // blue-grey: good
				pct >= 50 ? ["#FDEBD0", "#784212"] :   // warm amber: mid
				            ["#FADBD8", "#922B21"];     // muted red: low
			return `<span style="background:${bg};color:${fg};padding:2px 10px;` +
				`border-radius:12px;font-weight:700;display:inline-block;` +
				`min-width:52px;text-align:center;">${value}</span>`;
		}

		return value;
	},
};
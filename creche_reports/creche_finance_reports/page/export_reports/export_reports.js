// frappe.pages['export-reports'].on_page_load = function(wrapper) {
// 	var page = frappe.ui.make_app_page({
// 		parent: wrapper,
// 		title: 'Export Creche Reports',
// 		single_column: true
// 	});
// }


// Place in: your_app/creche_finance_reports/page/export_reports/export_reports.js

frappe.pages['export-reports'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Export Creche Reports',
		single_column: true
	});

	$(wrapper).find('.page-content').append(`
		<style>
			.er-wrap * { box-sizing: border-box; }
			.er-wrap { font-family: var(--font-stack); color: var(--text-color); padding: 16px; }

			/* ── Filters ── */
			.er-filters { background:var(--card-bg);border:1px solid var(--border-color);border-radius:var(--border-radius-lg);padding:20px;margin-bottom:20px; }
			.er-filters-title { font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:14px; }
			.er-filters-grid { display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin-bottom:18px; }
			@media (max-width:1400px) { .er-filters-grid { grid-template-columns:repeat(3,1fr); } }
			@media (max-width:800px)  { .er-filters-grid { grid-template-columns:repeat(2,1fr); } }
			@media (max-width:500px)  { .er-filters-grid { grid-template-columns:1fr; } }
			.er-filter-item .control-label { font-family:var(--font-stack)!important;font-size:var(--text-xs)!important;font-weight:600!important;color:var(--text-muted)!important; }
			.er-filter-item input.input-with-feedback,
			.er-filter-item .form-control { font-family:var(--font-stack)!important;font-size:var(--text-sm)!important;color:var(--text-color)!important;background:var(--control-bg)!important;border-color:var(--border-color)!important;border-radius:var(--border-radius)!important; }
			.er-filter-item.er-mandatory .control-label::after { content:' *';color:var(--red); }
			.er-filter-item.er-readonly input.input-with-feedback,
			.er-filter-item.er-readonly .form-control { background:var(--subtle-fg)!important;color:var(--text-muted)!important;cursor:not-allowed!important; }
			.er-native-select { font-family:var(--font-stack)!important;font-size:var(--text-sm)!important;color:var(--text-color)!important;background:var(--control-bg)!important;border:1px solid var(--border-color)!important;border-radius:var(--border-radius)!important;height:32px;width:100%;padding:0 8px; }

			/* ── Filter footer (button row) ── */
			.er-filter-footer { display:flex;align-items:center;justify-content:flex-end;gap:8px;padding-top:14px;border-top:1px solid var(--border-color); }

			/* ── Summary Card ── */
			.er-summary-card { background:var(--card-bg);border:1px solid var(--border-color);border-radius:var(--border-radius-lg);overflow:hidden;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,0.06); }
			.er-summary-header { display:flex;align-items:center;gap:10px;padding:12px 20px;border-bottom:1px solid var(--border-color);background:linear-gradient(90deg,#1a4f8a 0%,#1e5fa8 100%); }
			.er-summary-header-dot { width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.7);flex-shrink:0; }
			.er-summary-header-title { font-size:11px;font-weight:700;color:#ffffff;letter-spacing:0.08em;text-transform:uppercase; }
			.er-summary-grid { display:grid;grid-template-columns:repeat(6,1fr);gap:0; }
			@media (max-width:1200px) { .er-summary-grid { grid-template-columns:repeat(3,1fr); } }
			@media (max-width:600px)  { .er-summary-grid { grid-template-columns:repeat(2,1fr); } }
			.er-summary-item { padding:14px 18px;border-right:1px solid var(--border-color);border-bottom:1px solid var(--border-color);min-width:0; }
			.er-summary-item:nth-child(6n)        { border-right:none; }
			.er-summary-item:nth-last-child(-n+6) { border-bottom:none; }
			@media (max-width:1200px) {
				.er-summary-item:nth-child(6n)        { border-right:1px solid var(--border-color); }
				.er-summary-item:nth-child(3n)        { border-right:none; }
				.er-summary-item:nth-last-child(-n+3) { border-bottom:none; }
				.er-summary-item:nth-last-child(-n+6) { border-bottom:1px solid var(--border-color); }
			}
			.er-summary-label { font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:5px; }
			.er-summary-value { font-size:14px;font-weight:700;color:var(--text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
			.er-summary-value.empty { font-size:12px;font-weight:400;color:var(--text-extra-muted);font-style:italic; }
			.er-grant-pill { display:inline-flex;align-items:center;background:#e8f0fb;border:1px solid #c0d0e8;border-radius:4px;padding:2px 8px;font-size:12px;font-weight:700;color:#1a4f8a; }

			/* ── Section heading ── */
			.er-section-heading { display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:2px solid #1a4f8a;margin-bottom:16px;flex-wrap:wrap;gap:8px; }
			.er-section-heading-title { font-size:13px;font-weight:700;color:#1a4f8a;text-transform:uppercase;letter-spacing:0.05em; }
			.er-section-heading-right { display:flex;align-items:center;gap:8px; }

			/* ── Table ── */
			.er-table-scroll { overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid #c5cdd8;border-radius:8px; }
			.er-table-scroll.er-scrollable { max-height:380px;overflow-y:auto; }
			.er-table-scroll table { width:100%;border-collapse:separate;border-spacing:0;font-size:var(--text-sm);min-width:520px; }
			.er-table-scroll thead tr { background:#1a4f8a; }
			.er-table-scroll thead th { padding:11px 16px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.06em;white-space:nowrap;border-right:1px solid rgba(255,255,255,0.2);border-bottom:1px solid rgba(255,255,255,0.15);position:sticky;top:0;z-index:2;background:#1a4f8a; }
			.er-table-scroll thead th:first-child { text-align:center;width:52px; }
			.er-table-scroll thead th:last-child { border-right:none; }
			.er-table-scroll tbody tr { background:#ffffff;transition:background 0.12s; }
			.er-table-scroll tbody tr:nth-child(even) { background:#f4f7fa; }
			.er-table-scroll tbody tr:hover { background:#e8f0fb !important; }
			.er-table-scroll tbody td { padding:9px 16px;font-size:var(--text-sm);color:var(--text-color);border-right:1px solid #dde3ea;border-bottom:1px solid #dde3ea;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px; }
			.er-table-scroll tbody tr:last-child td { border-bottom:none; }
			.er-table-scroll tbody td:last-child { border-right:none; }
			.er-td-num  { text-align:center !important;width:52px;font-weight:600;font-size:12px;color:var(--text-muted); }
			.er-td-main { font-weight:600;color:var(--text-color); }
			.er-td-muted { color:var(--text-muted); }
			.er-empty { text-align:center;padding:48px 20px;font-size:var(--text-sm);color:var(--text-muted); }
			.er-empty-icon { font-size:26px;margin-bottom:8px; }

			/* ── Status Pills ── */
			.er-pill { display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em; }
			.er-pill-queued     { background:#fef9c3;color:#854d0e; }
			.er-pill-processing { background:#dbeafe;color:#1e40af; }
			.er-pill-completed  { background:#dcfce7;color:#166534; }
			.er-pill-failed     { background:#fee2e2;color:#991b1b; }

			/* ── Job Banner ── */
			.er-job-banner { display:flex;align-items:center;gap:14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:var(--border-radius-lg);padding:14px 20px;margin-bottom:18px; }
			.er-job-banner.er-status-completed { background:#f0fdf4;border-color:#bbf7d0; }
			.er-job-banner.er-status-failed    { background:#fef2f2;border-color:#fecaca; }
			.er-job-info { flex:1;display:flex;flex-direction:column;gap:2px; }
			.er-job-info-title { font-size:13px;font-weight:700;color:#1e40af; }
			.er-status-completed .er-job-info-title { color:#166534; }
			.er-status-failed    .er-job-info-title { color:#991b1b; }
			.er-job-info-sub { font-size:11px;color:var(--text-muted); }
			.er-spinner { width:20px;height:20px;border:2px solid #bfdbfe;border-top-color:#2563eb;border-radius:50%;animation:erSpin 0.7s linear infinite;flex-shrink:0; }
			.er-status-completed .er-spinner,
			.er-status-failed    .er-spinner { display:none; }
			@keyframes erSpin { to { transform:rotate(360deg); } }

			/* ── Download btn in banner ── */
			.er-btn-dl { display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;border:none;cursor:pointer;text-decoration:none;background:#16a34a;color:#fff;transition:background 0.15s; }
			.er-btn-dl:hover { background:#15803d; }

			/* ── Modal ── */
			.er-modal-backdrop { position:fixed;inset:0;background:rgba(15,23,42,0.55);backdrop-filter:blur(2px);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;animation:erFadeIn 0.18s ease; }
			@keyframes erFadeIn { from{opacity:0} to{opacity:1} }
			.er-modal { background:var(--card-bg);border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.22),0 4px 16px rgba(0,0,0,0.12);width:100%;max-width:680px;overflow:hidden;animation:erSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1); }
			@keyframes erSlideUp { from{opacity:0;transform:translateY(24px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
			.er-modal-header { display:flex;align-items:center;justify-content:space-between;padding:18px 24px 16px;background:linear-gradient(90deg,#1a4f8a 0%,#1e5fa8 100%); }
			.er-modal-header-left { display:flex;align-items:center;gap:12px; }
			.er-modal-header-icon { width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0; }
			.er-modal-title { font-size:15px;font-weight:700;color:#ffffff;line-height:1.2; }
			.er-modal-subtitle { font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px; }
			.er-modal-close { width:32px;height:32px;border-radius:6px;background:rgba(255,255,255,0.12);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.8);font-size:18px;transition:background 0.15s;flex-shrink:0; }
			.er-modal-close:hover { background:rgba(255,255,255,0.25);color:#fff; }
			.er-modal-body { padding:20px 24px 24px; }
			.er-modal-desc { font-size:13px;color:var(--text-muted);margin:0 0 16px;line-height:1.5; }
			.er-modal-cards { display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px; }
			@media (max-width:500px) { .er-modal-cards { grid-template-columns:repeat(2,1fr); } }
			.er-modal-card { background:var(--subtle-fg);border:1px solid var(--border-color);border-radius:8px;padding:12px 14px;min-width:0;transition:border-color 0.15s,background 0.15s; }
			.er-modal-card:hover { border-color:#a8c0e0;background:#f0f5fc; }
			.er-modal-card-label { font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.09em;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
			.er-modal-card-value { font-size:13px;font-weight:700;color:#1a4f8a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3; }
			.er-modal-card-value.empty { font-size:12px;font-weight:400;color:var(--text-extra-muted);font-style:italic; }
			.er-modal-footer { display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:14px 24px;border-top:1px solid var(--border-color);background:var(--subtle-fg); }
			.er-btn-cancel  { background:var(--card-bg);color:var(--text-muted);border:1px solid var(--border-color);display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;font-family:var(--font-stack); }
			.er-btn-cancel:hover { background:var(--border-color);color:var(--text-color); }
			.er-btn-confirm { background:linear-gradient(135deg,#1a4f8a 0%,#1e5fa8 100%);color:#ffffff;box-shadow:0 2px 8px rgba(26,79,138,0.35);display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600;border:none;cursor:pointer;transition:all 0.15s;font-family:var(--font-stack); }
			.er-btn-confirm:hover:not(:disabled) { background:linear-gradient(135deg,#163f70 0%,#1a4f8a 100%);box-shadow:0 4px 12px rgba(26,79,138,0.45);transform:translateY(-1px); }
			.er-btn-confirm:disabled { background:#9ab3d0;box-shadow:none;cursor:not-allowed;transform:none; }

			/* ── Declaration ── */
			.er-declaration { display:flex;align-items:flex-start;gap:10px;background:#f0f5fc;border:1px solid #c0d0e8;border-radius:8px;padding:12px 14px;cursor:pointer;transition:background 0.15s,border-color 0.15s; }
			.er-declaration:hover { background:#e4edf8;border-color:#a0b8d8; }
			.er-declaration.checked { background:#ddeaf8;border-color:#1a4f8a; }
			.er-decl-box { width:18px;height:18px;border:2px solid #a0b8d8;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;transition:all 0.15s; }
			.er-declaration.checked .er-decl-box { background:#1a4f8a;border-color:#1a4f8a; }
			.er-decl-tick { display:none;color:#fff;font-size:11px;font-weight:700;line-height:1; }
			.er-declaration.checked .er-decl-tick { display:block; }
			.er-decl-text { font-size:12px;color:var(--text-color);line-height:1.5; }
			.er-decl-text strong { color:#1a4f8a; }
		</style>

		<div class="er-wrap">

			<!-- ── Filters ── -->
			<div class="er-filters">
				<div class="er-filters-title">&#128209; Export Filters</div>
				<div class="er-filters-grid">
					<!-- Report Type Name — free-text Data field -->
					<div class="er-filter-item er-mandatory" id="er-report-type-name-field"></div>
					<!-- Budget Reference Name — native select -->
					<div class="er-filter-item er-mandatory" id="er-budget-ref-field">
						<div class="frappe-control">
							<div class="form-group">
								<label class="control-label" style="font-size:var(--text-xs);font-weight:600;color:var(--text-muted);">
									Budget Reference Name
								</label>
								<select id="er-budget-select" class="er-native-select">
									<option value="">— Loading… —</option>
								</select>
							</div>
						</div>
					</div>
					<!-- Partner Name (auto-filled readonly) -->
					<div class="er-filter-item er-readonly" id="er-partner-name-field"></div>
					<!-- Grant ID (auto-filled readonly) -->
					<div class="er-filter-item er-readonly" id="er-grant-id-field"></div>
					<!-- Financial Year — Link to "Financial year" doctype -->
					<div class="er-filter-item er-mandatory" id="er-financial-year-field"></div>
					<!-- Month — Select, starts empty -->
					<div class="er-filter-item er-mandatory" id="er-month-field"></div>
				</div>

				<!-- Generate Export button — sits below the filters inside the card -->
				<div class="er-filter-footer" id="er-filter-footer-btns"></div>
			</div>

			<!-- ── Summary Card ── -->
			<div class="er-summary-card">
				<div class="er-summary-header">
					<div class="er-summary-header-dot"></div>
					<span class="er-summary-header-title">Partner &amp; Export Details</span>
				</div>
				<div class="er-summary-grid">
					<div class="er-summary-item">
						<div class="er-summary-label">Report Type Name</div>
						<div class="er-summary-value empty" id="er-card-report-type-name">Not set</div>
					</div>
					<div class="er-summary-item">
						<div class="er-summary-label">Budget Ref. Name</div>
						<div class="er-summary-value empty" id="er-card-budget-ref">Not set</div>
					</div>
					<div class="er-summary-item">
						<div class="er-summary-label">Partner Name</div>
						<div class="er-summary-value empty" id="er-card-partner-name">Not set</div>
					</div>
					<div class="er-summary-item">
						<div class="er-summary-label">Grant ID</div>
						<div id="er-card-grant-pills"><span class="er-summary-value empty">Not set</span></div>
					</div>
					<div class="er-summary-item">
						<div class="er-summary-label">Financial Year</div>
						<div class="er-summary-value empty" id="er-card-financial-year">Not set</div>
					</div>
					<div class="er-summary-item">
						<div class="er-summary-label">Month</div>
						<div class="er-summary-value empty" id="er-card-month">Not set</div>
					</div>
				</div>
			</div>

			<!-- ── Active Job Banner ── -->
			<div class="er-job-banner" id="er-job-banner" style="display:none;">
				<div class="er-spinner"></div>
				<div class="er-job-info">
					<div class="er-job-info-title" id="er-job-status-label">Processing…</div>
					<div class="er-job-info-sub" id="er-job-id-label"></div>
				</div>
				<a class="er-btn-dl" id="er-job-download-btn" href="#" target="_blank" style="display:none;">
					&#11015; Download File
				</a>
			</div>

			<!-- ── Export History ── -->
			<div class="er-section-heading">
				<span class="er-section-heading-title">Export History</span>
				<div class="er-section-heading-right" id="er-history-btn-wrap"></div>
			</div>

			<div class="er-table-scroll er-scrollable">
				<table>
					<thead>
						<tr>
							<th>#</th>
							<th>Export ID</th>
							<th>Report Type Name</th>
							<th>Budget Ref.</th>
							<th>Partner</th>
							<th>Financial Year</th>
							<th>Month</th>
							<th>Status</th>
							<th>Created</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody id="er-history-tbody">
						<tr><td colspan="10" class="er-empty"><div class="er-empty-icon">&#128203;</div><div>Loading…</div></td></tr>
					</tbody>
				</table>
			</div>

		</div>

		<!-- ── Confirm Modal ── -->
		<div class="er-modal-backdrop" id="er-modal-backdrop" style="display:none;">
			<div class="er-modal">
				<div class="er-modal-header">
					<div class="er-modal-header-left">
						<div class="er-modal-header-icon">&#11015;</div>
						<div>
							<div class="er-modal-title">Confirm Export</div>
							<div class="er-modal-subtitle">Review the details before generating the Excel file</div>
						</div>
					</div>
					<button class="er-modal-close" id="er-modal-close-btn">&#215;</button>
				</div>
				<div class="er-modal-body">
					<p class="er-modal-desc">
						An Excel report will be generated for all Creche Utilisation records matching the filters below. The job runs in the background — download will be available in Export History once complete.
					</p>
					<div class="er-modal-cards" id="er-modal-cards"></div>
					<div class="er-declaration" id="er-declaration">
						<div class="er-decl-box">
							<span class="er-decl-tick">&#10003;</span>
						</div>
						<div class="er-decl-text">
							I confirm that <strong>all the filter details above are correct</strong> and authorise the generation of this Creche Utilisation export.
						</div>
					</div>
				</div>
				<div class="er-modal-footer">
					<button class="er-btn-cancel" id="er-modal-cancel-btn">Cancel</button>
					<button class="er-btn-confirm" id="er-modal-confirm-btn" disabled>&#10003;&nbsp; Confirm &amp; Generate</button>
				</div>
			</div>
		</div>
	`);

	// ─────────────────────────────────────────────────────────────
	// HELPERS
	// ─────────────────────────────────────────────────────────────
	function $w(sel) { return $(wrapper).find(sel); }

	function show_alert(msg, indicator) {
		frappe.show_alert({ message: __(msg), indicator: indicator || 'red' }, 5);
	}

	function fmt_date(val) {
		if (!val) return '—';
		return frappe.datetime.str_to_user(val) || val;
	}

	function set_card(id, value) {
		var $el = $w('#' + id);
		if (value) { $el.text(value).removeClass('empty'); }
		else        { $el.text('Not set').addClass('empty'); }
	}

	function make_field(id) { return $w('#' + id)[0]; }

	// ─────────────────────────────────────────────────────────────
	// STATE
	// ─────────────────────────────────────────────────────────────
	var all_budgets  = [];
	var poll_interval = null;

	// ─────────────────────────────────────────────────────────────
	// FRAPPE CONTROLS
	// ─────────────────────────────────────────────────────────────

	// Report Type Name — free Data field, first in the grid
	var report_type_name_ctrl = frappe.ui.form.make_control({
		parent: make_field('er-report-type-name-field'),
		df: {
			label: 'Report Type Name',
			fieldtype: 'Data',
			fieldname: 'report_type_name',
			placeholder: 'e.g. Q1 Utilisation Report',
			change: function() {
				set_card('er-card-report-type-name', report_type_name_ctrl.get_value());
			}
		},
		render_input: true
	});

	var partner_name_ctrl = frappe.ui.form.make_control({
		parent: make_field('er-partner-name-field'),
		df: { label: 'Partner Name', fieldtype: 'Data', fieldname: 'partner_name', read_only: 1 },
		render_input: true
	});

	var grant_id_ctrl = frappe.ui.form.make_control({
		parent: make_field('er-grant-id-field'),
		df: { label: 'Grant ID', fieldtype: 'Data', fieldname: 'grant_id', read_only: 1 },
		render_input: true
	});

	// Financial Year — Link field, starts empty
	var financial_year_ctrl = frappe.ui.form.make_control({
		parent: make_field('er-financial-year-field'),
		df: {
			label: 'Financial Year',
			fieldtype: 'Link',
			fieldname: 'financial_year',
			options: 'Financial year',
			placeholder: 'Select Financial Year',
			change: function() {
				set_card('er-card-financial-year', financial_year_ctrl.get_value());
			}
		},
		render_input: true
	});

	// Month — Select, first option blank so it starts empty
	var month_ctrl = frappe.ui.form.make_control({
		parent: make_field('er-month-field'),
		df: {
			label: 'Month',
			fieldtype: 'Select',
			fieldname: 'month',
			options: [
				'',
				'January','February','March','April',
				'May','June','July','August',
				'September','October','November','December'
			].join('\n'),
			change: function() {
				set_card('er-card-month', month_ctrl.get_value());
			}
		},
		render_input: true
	});

	[report_type_name_ctrl, partner_name_ctrl, grant_id_ctrl, financial_year_ctrl, month_ctrl].forEach(function(f) { f.refresh(); });

	// ─────────────────────────────────────────────────────────────
	// FRAPPE BUTTONS
	// ─────────────────────────────────────────────────────────────

	// "Generate Export" — inside the filter card footer
	var $filter_footer = $w('#er-filter-footer-btns');

	var $generate_btn = $('<button>')
		.addClass('btn btn-primary btn-sm')
		.html('<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:5px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Generate Export')
		.on('click', function() {
			var values = get_filter_values();
			if (!validate(values)) return;
			open_confirm_modal(values);
		});

	$filter_footer.append($generate_btn);

	// "Refresh History" — next to the history section heading, using frappe button style
	var $refresh_btn = $('<button>')
		.addClass('btn btn-default btn-xs')
		.html('&#8635; Refresh')
		.on('click', function() { load_history(); });

	$w('#er-history-btn-wrap').append($refresh_btn);

	// ─────────────────────────────────────────────────────────────
	// BUDGET SELECT
	// ─────────────────────────────────────────────────────────────
	function load_budgets() {
		$w('#er-budget-select').empty().append('<option value="">— Loading… —</option>');
		frappe.call({
			method: 'creche_reports.api.common.get_all_budgets',
			callback: function(r) {
				all_budgets = r.message || [];
				populate_budget_select();
			},
			error: function() {
				show_alert('Failed to load budgets. Please refresh.', 'red');
				$w('#er-budget-select').empty().append('<option value="">— Error loading —</option>');
			}
		});
	}

	function populate_budget_select() {
		var $sel = $w('#er-budget-select');
		if (!$sel.length) { setTimeout(populate_budget_select, 100); return; }
		$sel.empty().append('<option value="">— Select Budget —</option>');
		all_budgets.forEach(function(b) {
			$sel.append($('<option>', { value: b.name, text: (b.budget_reference_name || b.name).trim() }));
		});
	}

	function on_budget_change(selected_name) {
		var b = all_budgets.find(function(x) { return x.name === selected_name; });
		if (b) {
			partner_name_ctrl.set_value(b.partner_name || '');
			grant_id_ctrl.set_value(b.grant_id || '');
			set_card('er-card-budget-ref',   (b.budget_reference_name || '').trim());
			set_card('er-card-partner-name', b.partner_name);
			var $pills = $w('#er-card-grant-pills');
			if (b.grant_id) {
				$pills.html('<span class="er-grant-pill">' + frappe.utils.escape_html(b.grant_id) + '</span>');
			} else {
				$pills.html('<span class="er-summary-value empty">Not set</span>');
			}
		} else {
			partner_name_ctrl.set_value('');
			grant_id_ctrl.set_value('');
			set_card('er-card-budget-ref', '');
			set_card('er-card-partner-name', '');
			$w('#er-card-grant-pills').html('<span class="er-summary-value empty">Not set</span>');
		}
	}

	$w('#er-budget-select').on('change', function() { on_budget_change($(this).val()); });

	// ─────────────────────────────────────────────────────────────
	// GET FILTER VALUES
	// ─────────────────────────────────────────────────────────────
	function get_filter_values() {
		var selected_budget = $w('#er-budget-select').val() || '';
		var b = all_budgets.find(function(x) { return x.name === selected_budget; });
		return {
			report_type_name:      report_type_name_ctrl.get_value(),
			budget_name:           selected_budget,
			budget_reference_name: b ? (b.budget_reference_name || '').trim() : '',
			partner_name:          b ? (b.partner_name  || '') : '',
			grant_id:              b ? (b.grant_id      || '') : '',
			financial_year:        financial_year_ctrl.get_value(),
			month:                 month_ctrl.get_value(),
		};
	}

	// ─────────────────────────────────────────────────────────────
	// VALIDATE
	// ─────────────────────────────────────────────────────────────
	function validate(values) {
		var missing = [];
		if (!values.report_type_name) missing.push('Report Type Name');
		if (!values.budget_name)      missing.push('Budget Reference Name');
		if (!values.financial_year)   missing.push('Financial Year');
		if (!values.month)            missing.push('Month');
		if (missing.length) {
			show_alert('Please fill mandatory fields: ' + missing.join(', '), 'orange');
			return false;
		}
		return true;
	}

	// ─────────────────────────────────────────────────────────────
	// CONFIRM MODAL
	// ─────────────────────────────────────────────────────────────
	function open_confirm_modal(values) {
		var cards = [
			{ label: 'Report Type Name', val: values.report_type_name },
			{ label: 'Budget Ref. Name', val: values.budget_reference_name },
			{ label: 'Partner Name',     val: values.partner_name },
			{ label: 'Grant ID',         val: values.grant_id },
			{ label: 'Financial Year',   val: values.financial_year },
			{ label: 'Month',            val: values.month },
		];

		$w('#er-modal-cards').html(cards.map(function(f) {
			var d = (f.val !== null && f.val !== undefined && String(f.val).trim() !== '') ? String(f.val) : null;
			return '<div class="er-modal-card">' +
				'<div class="er-modal-card-label">' + frappe.utils.escape_html(f.label) + '</div>' +
				'<div class="er-modal-card-value' + (d ? '' : ' empty') + '">' + frappe.utils.escape_html(d || '—') + '</div>' +
			'</div>';
		}).join(''));

		$w('#er-modal-backdrop').fadeIn(160);
		$w('#er-declaration').removeClass('checked');
		$w('#er-modal-confirm-btn').prop('disabled', true);

		$w('#er-declaration').off('click.er').on('click.er', function() {
			var checked = $(this).toggleClass('checked').hasClass('checked');
			$w('#er-modal-confirm-btn').prop('disabled', !checked);
		});

		function close_modal() { $w('#er-modal-backdrop').fadeOut(140); }

		$w('#er-modal-close-btn').off('click.er').on('click.er', close_modal);
		$w('#er-modal-cancel-btn').off('click.er').on('click.er', close_modal);
		$w('#er-modal-backdrop').off('click.er').on('click.er', function(e) {
			if ($(e.target).is($w('#er-modal-backdrop'))) close_modal();
		});
		$(document).off('keydown.er-modal').on('keydown.er-modal', function(e) {
			if (e.key === 'Escape') { close_modal(); $(document).off('keydown.er-modal'); }
		});
		$w('#er-modal-confirm-btn').off('click.er').on('click.er', function() {
			close_modal();
			do_export(values);
		});
	}

	// ─────────────────────────────────────────────────────────────
	// DO EXPORT
	// ─────────────────────────────────────────────────────────────
	function do_export(values) {
		frappe.call({
			method: 'creche_reports.api.export_reports.create_creche_utilisation_export',
			args: {
				report_type_name:      values.report_type_name,
				budget_name:           values.budget_name,
				budget_reference_name: values.budget_reference_name,
				partner_name:          values.partner_name,
				grant_id:              values.grant_id,
				financial_year:        values.financial_year,
				month:                 values.month,
			},
			callback: function(r) {
				if (r.message && r.message.success) {
					show_alert('Export queued successfully!', 'green');
					start_polling(r.message.export_id);
					load_history();
				} else {
					show_alert('Failed to queue export.', 'red');
				}
			},
			error: function() {
				show_alert('Server error. Please try again.', 'red');
			}
		});
	}

	// ─────────────────────────────────────────────────────────────
	// POLLING
	// ─────────────────────────────────────────────────────────────
	function start_polling(export_id) {
		show_banner(export_id, 'Queued', null);
		if (poll_interval) clearInterval(poll_interval);

		poll_interval = setInterval(function() {
			frappe.call({
				method: 'creche_reports.api.export_reports.get_export_status',
				args: { export_id: export_id },
				callback: function(r) {
					var d = r.message;
					if (!d) return;
					show_banner(export_id, d.status, d.export_file);
					update_history_row(export_id, d.status, d.export_file);
					if (d.status === 'Completed' || d.status === 'Failed') {
						clearInterval(poll_interval);
						poll_interval = null;
						if (d.status === 'Failed')
							show_alert('Export failed. Check error log in Creche Reports Export.', 'red');
						load_history();
					}
				}
			});
		}, 3000);
	}

	function show_banner(export_id, status, file_url) {
		$w('#er-job-banner').show().attr('class', 'er-job-banner er-status-' + status.toLowerCase());
		$w('#er-job-status-label').text('Export ' + status);
		$w('#er-job-id-label').text(export_id);
		if (status === 'Completed' && file_url) {
			$w('#er-job-download-btn').attr('href', file_url).show();
		} else {
			$w('#er-job-download-btn').hide();
		}
	}

	// ─────────────────────────────────────────────────────────────
	// EXPORT HISTORY
	// ─────────────────────────────────────────────────────────────
	function load_history() {
		frappe.call({
			method: 'creche_reports.api.export_reports.get_recent_exports',
			args: { export_type: 'Creche Utilisation', limit: 20 },
			callback: function(r) { render_history(r.message || []); }
		});
	}

	function render_history(rows) {
		if (!rows.length) {
			$w('#er-history-tbody').html('<tr><td colspan="10" class="er-empty"><div class="er-empty-icon">&#128203;</div><div>No exports yet.</div></td></tr>');
			return;
		}
		var html = rows.map(function(r, i) {
			var sc   = 'er-pill-' + (r.status || '').toLowerCase();
			var meta = {};
			try { meta = JSON.parse(r.reference_names || '{}'); } catch(e) {}
			return '<tr id="er-hist-' + r.name + '">' +
				'<td class="er-td-num">'  + (i + 1) + '</td>' +
				'<td class="er-td-muted" style="font-size:11px;">' + frappe.utils.escape_html(r.name) + '</td>' +
				'<td class="er-td-main">' + frappe.utils.escape_html(meta.report_type_name || '—') + '</td>' +
				'<td>' + frappe.utils.escape_html(meta.budget_reference_name || '—') + '</td>' +
				'<td class="er-td-muted">' + frappe.utils.escape_html(meta.partner_name || '—') + '</td>' +
				'<td>' + frappe.utils.escape_html(meta.financial_year || '—') + '</td>' +
				'<td>' + frappe.utils.escape_html(meta.month || '—') + '</td>' +
				'<td><span class="er-pill ' + sc + '">' + frappe.utils.escape_html(r.status || '—') + '</span></td>' +
				'<td class="er-td-muted">' + fmt_date(r.creation) + '</td>' +
				'<td>' + (
					r.export_file
						? '<a href="' + frappe.utils.escape_html(r.export_file) + '" target="_blank" class="btn btn-success btn-xs">&#11015; Download</a>'
						: r.status === 'Failed'
							? '<span class="er-td-muted" style="font-size:11px;">Failed</span>'
							: '<span class="er-td-muted">—</span>'
				) + '</td>' +
			'</tr>';
		}).join('');
		$w('#er-history-tbody').html(html);
	}

	function update_history_row(export_id, status, file_url) {
		var $row = $w('#er-hist-' + export_id);
		if (!$row.length) return;
		$row.find('.er-pill').attr('class', 'er-pill er-pill-' + status.toLowerCase()).text(status);
		if (status === 'Completed' && file_url)
			$row.find('td:last-child').html('<a href="' + frappe.utils.escape_html(file_url) + '" target="_blank" class="btn btn-success btn-xs">&#11015; Download</a>');
	}

	// ─────────────────────────────────────────────────────────────
	// on_page_show — reload on every visit
	// ─────────────────────────────────────────────────────────────
	frappe.pages['export-reports'].on_page_show = function() {
		load_budgets();
		load_history();
	};

	// ─────────────────────────────────────────────────────────────
	// BOOT
	// ─────────────────────────────────────────────────────────────
	load_budgets();
	load_history();
};
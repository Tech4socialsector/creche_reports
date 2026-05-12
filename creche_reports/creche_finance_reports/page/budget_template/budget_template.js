frappe.pages['budget-template'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Budget Import Template',
		single_column: true
	});

	$(wrapper).find('.page-content').append(`
		<style>
			.bt-wrap * { box-sizing: border-box; }
			.bt-wrap {
				font-family: var(--font-stack);
				color: var(--text-color);
				padding: 16px;
			}

			/* ── Filters ── */
			.bt-filters {
				background: var(--card-bg);
				border: 1px solid var(--border-color);
				border-radius: var(--border-radius-lg);
				padding: 20px;
				margin-bottom: 20px;
			}
			.bt-filters-grid {
				display: grid;
				grid-template-columns: repeat(4, 1fr);
				gap: 14px;
			}
			@media (max-width: 1100px) { .bt-filters-grid { grid-template-columns: repeat(3,1fr); } }
			@media (max-width: 800px)  { .bt-filters-grid { grid-template-columns: repeat(2,1fr); } }
			@media (max-width: 500px)  { .bt-filters-grid { grid-template-columns: 1fr; } }
			.bt-filter-item .control-label {
				font-family: var(--font-stack) !important;
				font-size: var(--text-xs) !important;
				font-weight: 600 !important;
				color: var(--text-muted) !important;
			}
			.bt-filter-item input.input-with-feedback,
			.bt-filter-item .form-control {
				font-family: var(--font-stack) !important;
				font-size: var(--text-sm) !important;
				color: var(--text-color) !important;
				background: var(--control-bg) !important;
				border-color: var(--border-color) !important;
				border-radius: var(--border-radius) !important;
			}
			.bt-filter-item.bt-mandatory .control-label::after {
				content: ' *';
				color: var(--red);
			}

			/* ── Summary Card ── */
			.bt-summary-card {
				background: var(--card-bg);
				border: 1px solid var(--border-color);
				border-radius: var(--border-radius-lg);
				overflow: hidden;
				margin-bottom: 24px;
				box-shadow: 0 1px 4px rgba(0,0,0,0.06);
			}
			.bt-summary-header {
				display: flex;
				align-items: center;
				gap: 10px;
				padding: 12px 20px;
				border-bottom: 1px solid var(--border-color);
				background: linear-gradient(90deg, #1a4f8a 0%, #1e5fa8 100%);
			}
			.bt-summary-header-dot {
				width: 8px; height: 8px;
				border-radius: 50%;
				background: rgba(255,255,255,0.7);
				flex-shrink: 0;
			}
			.bt-summary-header-title {
				font-size: 11px;
				font-weight: 700;
				color: #ffffff;
				letter-spacing: 0.08em;
				text-transform: uppercase;
			}
			.bt-summary-grid {
				display: grid;
				grid-template-columns: repeat(3, 1fr);
				gap: 0;
			}
			@media (max-width: 900px) { .bt-summary-grid { grid-template-columns: repeat(2,1fr); } }
			@media (max-width: 500px) { .bt-summary-grid { grid-template-columns: 1fr; } }
			.bt-summary-item {
				padding: 16px 20px;
				border-right: 1px solid var(--border-color);
				border-bottom: 1px solid var(--border-color);
				min-width: 0;
				position: relative;
			}
			.bt-summary-item:nth-child(3n) { border-right: none; }
			.bt-summary-item:nth-last-child(-n+3) { border-bottom: none; }
			@media (max-width: 900px) {
				.bt-summary-item:nth-child(3n)  { border-right: 1px solid var(--border-color); }
				.bt-summary-item:nth-child(2n)  { border-right: none; }
				.bt-summary-item:nth-last-child(-n+2) { border-bottom: none; }
				.bt-summary-item:nth-last-child(-n+3) { border-bottom: 1px solid var(--border-color); }
			}
			.bt-summary-label {
				font-size: 10px;
				font-weight: 700;
				color: var(--text-muted);
				text-transform: uppercase;
				letter-spacing: 0.08em;
				margin-bottom: 6px;
			}
			.bt-summary-value {
				font-size: 14px;
				font-weight: 700;
				color: var(--text-color);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			.bt-summary-value.empty {
				font-size: 12px;
				font-weight: 400;
				color: var(--text-extra-muted);
				font-style: italic;
			}
			.bt-grant-pill {
				display: inline-flex;
				align-items: center;
				background: #e8f0fb;
				border: 1px solid #c0d0e8;
				border-radius: 4px;
				padding: 2px 8px;
				font-size: 12px;
				font-weight: 700;
				color: #1a4f8a;
			}

			/* ── Section heading ── */
			.bt-section-heading {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding-bottom: 10px;
				border-bottom: 2px solid #1a4f8a;
				margin-bottom: 16px;
				flex-wrap: wrap;
				gap: 8px;
			}
			.bt-section-heading-left { display:flex;align-items:center;gap:10px; }
			.bt-section-heading-title { font-size:15px;font-weight:700;color:#1a4f8a;text-transform:uppercase;letter-spacing:0.04em; }
			.bt-section-heading-right { display:flex;align-items:center;gap:8px; }

			/* ── Budget Table ── */
			.bt-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
			.bt-table-scroll table {
				width: 100%;
				border-collapse: collapse;
				font-size: var(--text-sm);
				min-width: 480px;
				border: 1px solid #c5cdd8;
				border-radius: 8px;
				overflow: hidden;
			}
			.bt-table-scroll thead tr { background: #1a4f8a; }
			.bt-table-scroll thead th {
				padding: 11px 16px;
				text-align: left;
				font-size: 11px;
				font-weight: 700;
				color: #ffffff;
				text-transform: uppercase;
				letter-spacing: 0.06em;
				white-space: nowrap;
				border-right: 1px solid rgba(255,255,255,0.2);
			}
			.bt-table-scroll thead th:first-child { text-align:center;width:52px; }
			.bt-table-scroll thead th:last-child { border-right:none; }
			.bt-table-scroll tbody tr { background:#ffffff;border-bottom:1px solid #dde3ea;transition:background 0.12s; }
			.bt-table-scroll tbody tr:nth-child(even) { background:#f4f7fa; }
			.bt-table-scroll tbody tr:last-child { border-bottom:none; }
			.bt-table-scroll tbody tr:hover { background:#e8f0fb !important; }
			.bt-table-scroll tbody td {
				padding: 10px 16px;
				font-size: var(--text-sm);
				color: var(--text-color);
				border-right: 1px solid #dde3ea;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				max-width: 300px;
			}
			.bt-table-scroll tbody td:last-child { border-right:none; }
			.bt-td-num { text-align:center;width:52px;font-weight:600;font-size:12px;color:var(--text-muted); }
			.bt-td-main { font-weight:600;color:var(--text-color); }
			.bt-td-sub  { color:var(--text-muted); }
			.bt-td-type { color:var(--text-muted); }
			.bt-empty { text-align:center;padding:44px 20px;font-size:var(--text-sm);color:var(--text-muted); }
			.bt-empty-icon { font-size:24px;margin-bottom:8px; }

			/* ── Custom Confirmation Modal ── */
			.bt-modal-backdrop {
				position: fixed;
				inset: 0;
				background: rgba(15, 23, 42, 0.55);
				backdrop-filter: blur(2px);
				z-index: 9998;
				display: flex;
				align-items: center;
				justify-content: center;
				padding: 20px;
				animation: btFadeIn 0.18s ease;
			}
			@keyframes btFadeIn {
				from { opacity: 0; }
				to   { opacity: 1; }
			}
			.bt-modal {
				background: var(--card-bg);
				border-radius: 12px;
				box-shadow: 0 20px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.12);
				width: 100%;
				max-width: 680px;
				overflow: hidden;
				animation: btSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1);
				z-index: 9999;
			}
			@keyframes btSlideUp {
				from { opacity: 0; transform: translateY(24px) scale(0.97); }
				to   { opacity: 1; transform: translateY(0) scale(1); }
			}
			.bt-modal-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 18px 24px 16px;
				border-bottom: 1px solid var(--border-color);
				background: linear-gradient(90deg, #1a4f8a 0%, #1e5fa8 100%);
			}
			.bt-modal-header-left { display:flex;align-items:center;gap:12px; }
			.bt-modal-header-icon {
				width: 36px; height: 36px;
				border-radius: 8px;
				background: rgba(255,255,255,0.15);
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 18px;
				flex-shrink: 0;
			}
			.bt-modal-header-text {}
			.bt-modal-title {
				font-size: 15px;
				font-weight: 700;
				color: #ffffff;
				line-height: 1.2;
			}
			.bt-modal-subtitle {
				font-size: 11px;
				color: rgba(255,255,255,0.7);
				margin-top: 2px;
			}
			.bt-modal-close {
				width: 32px; height: 32px;
				border-radius: 6px;
				background: rgba(255,255,255,0.12);
				border: none;
				cursor: pointer;
				display: flex;
				align-items: center;
				justify-content: center;
				color: rgba(255,255,255,0.8);
				font-size: 18px;
				line-height: 1;
				transition: background 0.15s;
				flex-shrink: 0;
			}
			.bt-modal-close:hover { background: rgba(255,255,255,0.25); color: #fff; }

			.bt-modal-body { padding: 20px 24px 24px; }
			.bt-modal-desc {
				font-size: 13px;
				color: var(--text-muted);
				margin: 0 0 16px;
				line-height: 1.5;
			}

			/* Confirmation cards grid */
			.bt-modal-cards {
				display: grid;
				grid-template-columns: repeat(3, 1fr);
				gap: 10px;
				margin-bottom: 24px;
			}
			@media (max-width: 500px) { .bt-modal-cards { grid-template-columns: repeat(2,1fr); } }
			.bt-modal-card {
				background: var(--subtle-fg);
				border: 1px solid var(--border-color);
				border-radius: 8px;
				padding: 12px 14px;
				min-width: 0;
				transition: border-color 0.15s, background 0.15s;
			}
			.bt-modal-card:hover { border-color: #a8c0e0; background: #f0f5fc; }
			.bt-modal-card-label {
				font-size: 9px;
				font-weight: 700;
				color: var(--text-muted);
				text-transform: uppercase;
				letter-spacing: 0.09em;
				margin-bottom: 6px;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			.bt-modal-card-value {
				font-size: 13px;
				font-weight: 700;
				color: #1a4f8a;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				line-height: 1.3;
			}
			.bt-modal-card-value.empty {
				font-size: 12px;
				font-weight: 400;
				color: var(--text-extra-muted);
				font-style: italic;
			}

			/* Modal footer */
			.bt-modal-footer {
				display: flex;
				align-items: center;
				justify-content: flex-end;
				gap: 10px;
				padding: 14px 24px;
				border-top: 1px solid var(--border-color);
				background: var(--subtle-fg);
			}
			.bt-btn {
				display: inline-flex;
				align-items: center;
				gap: 6px;
				padding: 8px 18px;
				border-radius: 6px;
				font-size: 13px;
				font-weight: 600;
				border: none;
				cursor: pointer;
				transition: all 0.15s;
				line-height: 1;
			}
			.bt-btn-cancel {
				background: var(--card-bg);
				color: var(--text-muted);
				border: 1px solid var(--border-color);
			}
			.bt-btn-cancel:hover { background: var(--border-color); color: var(--text-color); }
			.bt-btn-confirm {
				background: linear-gradient(135deg, #1a4f8a 0%, #1e5fa8 100%);
				color: #ffffff;
				box-shadow: 0 2px 8px rgba(26,79,138,0.35);
			}
			.bt-btn-confirm:hover { background: linear-gradient(135deg, #163f70 0%, #1a4f8a 100%); box-shadow: 0 4px 12px rgba(26,79,138,0.45); transform: translateY(-1px); }
			.bt-btn-confirm:active { transform: translateY(0); }
		</style>

		<div class="bt-wrap">

			<!-- Filters -->
			<div class="bt-filters">
				<div class="bt-filters-grid">
					<div class="bt-filter-item bt-mandatory" id="budget-ref-name-field"></div>
					<div class="bt-filter-item bt-mandatory" id="partner-name-field"></div>
					<div class="bt-filter-item" id="grant-id-field"></div>
					<div class="bt-filter-item bt-mandatory" id="financial-year-field"></div>
					<div class="bt-filter-item bt-mandatory" id="state-field"></div>
					<div class="bt-filter-item bt-mandatory" id="no-of-creches-field"></div>
					<div class="bt-filter-item bt-mandatory" id="date-of-approval-field"></div>
					<div class="bt-filter-item bt-mandatory" id="start-date-field"></div>
					<div class="bt-filter-item bt-mandatory" id="end-date-field"></div>
				</div>
			</div>

			<!-- Summary Card -->
			<div class="bt-summary-card">
				<div class="bt-summary-header">
					<div class="bt-summary-header-dot"></div>
					<span class="bt-summary-header-title">Grant Summary</span>
				</div>
				<div class="bt-summary-grid">
					<div class="bt-summary-item">
						<div class="bt-summary-label">Budget Ref. Name</div>
						<div class="bt-summary-value empty" id="card-budget-ref-name">Not set</div>
					</div>
					<div class="bt-summary-item">
						<div class="bt-summary-label">Partner Name</div>
						<div class="bt-summary-value empty" id="card-partner-name">Not set</div>
					</div>
					<div class="bt-summary-item">
						<div class="bt-summary-label">Grant ID</div>
						<div id="card-grant-pills"><span class="bt-summary-value empty">Not set</span></div>
					</div>
					<div class="bt-summary-item">
						<div class="bt-summary-label">Financial Year</div>
						<div class="bt-summary-value empty" id="card-financial-year">Not set</div>
					</div>
					<div class="bt-summary-item">
						<div class="bt-summary-label">State</div>
						<div class="bt-summary-value empty" id="card-state">Not set</div>
					</div>
					<div class="bt-summary-item">
						<div class="bt-summary-label">No. of Crèches</div>
						<div class="bt-summary-value empty" id="card-no-of-creches">Not set</div>
					</div>
					<div class="bt-summary-item">
						<div class="bt-summary-label">Date of Approval</div>
						<div class="bt-summary-value empty" id="card-date-of-approval">Not set</div>
					</div>
					<div class="bt-summary-item">
						<div class="bt-summary-label">Start Date</div>
						<div class="bt-summary-value empty" id="card-start-date">Not set</div>
					</div>
					<div class="bt-summary-item">
						<div class="bt-summary-label">End Date</div>
						<div class="bt-summary-value empty" id="card-end-date">Not set</div>
					</div>
				</div>
			</div>

			<!-- Section heading -->
			<div class="bt-section-heading">
				<div class="bt-section-heading-left">
					<span class="bt-section-heading-title">Budget Lines</span>
				</div>
				<div class="bt-section-heading-right">
					<span id="bt-add-btn-container"></span>
				</div>
			</div>

			<!-- Table -->
			<div class="bt-table-scroll">
				<table>
					<thead>
						<tr>
							<th>#</th>
							<th>Budget Main Head</th>
							<th>Budget Sub Head</th>
							<th>Type of Expenses</th>
						</tr>
					</thead>
					<tbody id="bt-tbody">
						<tr><td colspan="4" class="bt-empty">
							<div class="bt-empty-icon">&#128203;</div>
							<div>Loading...</div>
						</td></tr>
					</tbody>
				</table>
			</div>

		</div>

		<!-- ── Custom Confirmation Modal ── -->
		<div class="bt-modal-backdrop" id="bt-confirm-backdrop" style="display:none;">
			<div class="bt-modal" id="bt-confirm-modal">
				<div class="bt-modal-header">
					<div class="bt-modal-header-left">
						<div class="bt-modal-header-icon">&#128203;</div>
						<div class="bt-modal-header-text">
							<div class="bt-modal-title">Check Basic Details</div>
							<div class="bt-modal-subtitle">Please verify before generating the template</div>
						</div>
					</div>
					<button class="bt-modal-close" id="bt-modal-close-btn">&#215;</button>
				</div>
				<div class="bt-modal-body">
					<p class="bt-modal-desc">Review all details carefully. Once you confirm, the budget import template will be generated and downloaded.</p>
					<div class="bt-modal-cards" id="bt-modal-cards"></div>
				</div>
				<div class="bt-modal-footer">
					<button class="bt-btn bt-btn-cancel" id="bt-modal-cancel-btn">Cancel</button>
					<button class="bt-btn bt-btn-confirm" id="bt-modal-confirm-btn">&#10003;&nbsp; Confirm &amp; Download</button>
				</div>
			</div>
		</div>
	`);

	// ── Add Budget Item button ────────────────────────────────────────
	var $add_btn = $('<button class="btn btn-sm btn-primary">+ Add Budget Item</button>');
	$add_btn.on('click', function() {
		frappe.set_route('Form', 'Budget and Expense Items List', 'new-budget-and-expense-items-list-1');
	});
	$(wrapper).find('#bt-add-btn-container').append($add_btn);

	// ── Refresh on page show ──────────────────────────────────────────
	frappe.pages['budget-template'].on_page_show = function() {
		fetch_budget_items();
	};

	// ── Helpers ──────────────────────────────────────────────────────
	function make_field(id) { return $(wrapper).find('#' + id)[0]; }

	function set_card(id, value) {
		var $el = $(wrapper).find('#' + id);
		if (value) { $el.text(value).removeClass('empty'); }
		else { $el.text('Not set').addClass('empty'); }
	}

	function show_alert(message, indicator) {
		frappe.show_alert({ message: __(message), indicator: indicator || 'red' }, 5);
	}

	// ── Partner data cache ────────────────────────────────────────────
	var all_partners = [];

	function load_partners() {
		fetch('/api/method/creche_reports.api.common.get_all_partners', {
			headers: { 'X-Frappe-CSRF-Token': frappe.csrf_token }
		})
		.then(function(res){ return res.json(); })
		.then(function(data){
			all_partners = data.message || [];
			var $sel = $(wrapper).find('#partner-name-field select');
			if ($sel.length) {
				$sel.empty();
				$sel.append('<option value="">— Select Partner —</option>');
				all_partners.forEach(function(p){
					$sel.append('<option value="' + frappe.utils.escape_html(p.name) + '">' + frappe.utils.escape_html(p.partner_name) + '</option>');
				});
			}
		})
		.catch(function(err){
			console.error('Failed to load partners', err);
			show_alert('Failed to load partners. Please refresh.', 'red');
		});
	}

	function on_partner_change(partner_id) {
		var partner = all_partners.find(function(p){ return p.name === partner_id; });
		if (partner) {
			set_card('card-partner-name', partner.partner_name);
			grant_id_filter.set_value(partner.grant_id || '');
			set_card_grant_pill(partner.grant_id);
		} else {
			set_card('card-partner-name', '');
			grant_id_filter.set_value('');
			set_card_grant_pill('');
		}
	}

	function set_card_grant_pill(grant_id) {
		var $pills = $(wrapper).find('#card-grant-pills');
		if (grant_id) {
			$pills.html('<span class="bt-grant-pill">' + frappe.utils.escape_html(grant_id) + '</span>');
		} else {
			$pills.html('<span class="bt-summary-value empty">Not set</span>');
		}
	}

	// ── Controls ─────────────────────────────────────────────────────
	var budget_ref_name_filter = frappe.ui.form.make_control({
		parent: make_field('budget-ref-name-field'),
		df: { label: 'Budget Reference Name', fieldtype: 'Data', fieldname: 'budget_ref_name',
			change: function(){ set_card('card-budget-ref-name', budget_ref_name_filter.get_value()); } },
		render_input: true
	});

	var partner_name_filter = frappe.ui.form.make_control({
		parent: make_field('partner-name-field'),
		df: { label: 'Partner Name', fieldtype: 'Select', fieldname: 'partner_name',
			options: '— Loading... —',
			change: function(){ on_partner_change(partner_name_filter.get_value()); } },
		render_input: true
	});

	var grant_id_filter = frappe.ui.form.make_control({
		parent: make_field('grant-id-field'),
		df: { label: 'Grant ID', fieldtype: 'Data', fieldname: 'grant_id', read_only: 1 },
		render_input: true
	});

	var financial_year_filter = frappe.ui.form.make_control({
		parent: make_field('financial-year-field'),
		df: { label: 'Financial Year', fieldtype: 'Link', fieldname: 'financial_year',
			options: 'Financial year',
			change: function(){ set_card('card-financial-year', financial_year_filter.get_value()); } },
		render_input: true
	});

	var state_filter = frappe.ui.form.make_control({
		parent: make_field('state-field'),
		df: { label: 'State', fieldtype: 'Link', fieldname: 'state',
			options: 'State',
			change: function(){ set_card('card-state', state_filter.get_value()); } },
		render_input: true
	});

	var no_of_creches_filter = frappe.ui.form.make_control({
		parent: make_field('no-of-creches-field'),
		df: { label: 'No. of Crèches', fieldtype: 'Int', fieldname: 'no_of_creches',
			change: function(){ set_card('card-no-of-creches', no_of_creches_filter.get_value()); } },
		render_input: true
	});

	var date_of_approval_filter = frappe.ui.form.make_control({
		parent: make_field('date-of-approval-field'),
		df: { label: 'Date of Approval', fieldtype: 'Date', fieldname: 'date_of_approval',
			change: function(){ set_card('card-date-of-approval', frappe.datetime.str_to_user(date_of_approval_filter.get_value())); } },
		render_input: true
	});

	var start_date_filter = frappe.ui.form.make_control({
		parent: make_field('start-date-field'),
		df: { label: 'Start Date', fieldtype: 'Date', fieldname: 'start_date',
			change: function(){
				var s = start_date_filter.get_value();
				var e = end_date_filter ? end_date_filter.get_value() : '';
				if (s && e && s > e) {
					show_alert('Start Date cannot be after End Date.', 'red');
					start_date_filter.set_value(''); set_card('card-start-date', ''); return;
				}
				set_card('card-start-date', frappe.datetime.str_to_user(s));
			} },
		render_input: true
	});

	var end_date_filter = frappe.ui.form.make_control({
		parent: make_field('end-date-field'),
		df: { label: 'End Date', fieldtype: 'Date', fieldname: 'end_date',
			change: function(){
				var s = start_date_filter ? start_date_filter.get_value() : '';
				var e = end_date_filter.get_value();
				if (s && e && e < s) {
					show_alert('End Date cannot be before Start Date.', 'red');
					end_date_filter.set_value(''); set_card('card-end-date', ''); return;
				}
				set_card('card-end-date', frappe.datetime.str_to_user(e));
			} },
		render_input: true
	});

	[budget_ref_name_filter, partner_name_filter, grant_id_filter,
	 financial_year_filter, state_filter, no_of_creches_filter,
	 date_of_approval_filter, start_date_filter, end_date_filter].forEach(function(f){ f.refresh(); });

	load_partners();

	// ── Collect values ────────────────────────────────────────────────
	function get_values() {
		var partner_id  = partner_name_filter.get_value();
		var partner_obj = all_partners.find(function(p){ return p.name === partner_id; });
		return {
			budget_reference_name: budget_ref_name_filter.get_value(),
			partner_id:            partner_id,
			partner_name:          partner_obj ? partner_obj.partner_name : partner_id,
			grant_id:              grant_id_filter.get_value(),
			financial_year:        financial_year_filter.get_value(),
			state:                 state_filter.get_value(),
			no_of_creches:         no_of_creches_filter.get_value(),
			date_of_approval:      date_of_approval_filter.get_value(),
			start_date:            start_date_filter.get_value(),
			end_date:              end_date_filter.get_value(),
		};
	}

	// ── Mandatory validation ──────────────────────────────────────────
	function validate_mandatory(values) {
		var checks = [
			{ key: 'budget_reference_name', label: 'Budget Reference Name' },
			{ key: 'partner_id',            label: 'Partner Name' },
			{ key: 'financial_year',        label: 'Financial Year' },
			{ key: 'state',                 label: 'State' },
			{ key: 'no_of_creches',         label: 'No. of Crèches' },
			{ key: 'date_of_approval',      label: 'Date of Approval' },
			{ key: 'start_date',            label: 'Start Date' },
			{ key: 'end_date',              label: 'End Date' },
		];
		var missing = checks.filter(function(f){ return !values[f.key]; });
		if (missing.length) {
			show_alert('Please fill mandatory fields: ' + missing.map(function(f){ return f.label; }).join(', '), 'red');
			return false;
		}
		if (values.start_date && values.end_date && values.start_date > values.end_date) {
			show_alert('Start Date cannot be after End Date.', 'red');
			return false;
		}
		return true;
	}

	// ── Custom modal helpers ──────────────────────────────────────────
	function open_confirm_modal(values, on_confirm) {
		var fields = [
			{ label: 'Budget Ref. Name',  val: values.budget_reference_name },
			{ label: 'Partner Name',      val: values.partner_name },
			{ label: 'Partner ID',        val: values.partner_id },
			{ label: 'Grant ID',          val: values.grant_id },
			{ label: 'Financial Year',    val: values.financial_year },
			{ label: 'State',             val: values.state },
			{ label: 'No. of Crèches',   val: values.no_of_creches },
			{ label: 'Date of Approval',  val: values.date_of_approval ? frappe.datetime.str_to_user(values.date_of_approval) : '' },
			{ label: 'Start Date',        val: values.start_date ? frappe.datetime.str_to_user(values.start_date) : '' },
			{ label: 'End Date',          val: values.end_date   ? frappe.datetime.str_to_user(values.end_date)   : '' },
		];

		var cards_html = fields.map(function(f){
			var display = (f.val !== null && f.val !== undefined && String(f.val).trim() !== '') ? String(f.val) : null;
			return '<div class="bt-modal-card">' +
				'<div class="bt-modal-card-label">' + frappe.utils.escape_html(f.label) + '</div>' +
				'<div class="bt-modal-card-value' + (display ? '' : ' empty') + '">' +
					frappe.utils.escape_html(display || '—') +
				'</div>' +
			'</div>';
		}).join('');

		$(wrapper).find('#bt-modal-cards').html(cards_html);

		var $backdrop = $(wrapper).find('#bt-confirm-backdrop');
		$backdrop.fadeIn(160);

		// Close handlers
		function close_modal() { $backdrop.fadeOut(140); }

		$(wrapper).find('#bt-modal-close-btn').off('click').on('click', close_modal);
		$(wrapper).find('#bt-modal-cancel-btn').off('click').on('click', close_modal);

		// Close on backdrop click (outside modal box)
		$backdrop.off('click').on('click', function(e){
			if ($(e.target).is($backdrop)) close_modal();
		});

		// Confirm
		$(wrapper).find('#bt-modal-confirm-btn').off('click').on('click', function(){
			close_modal();
			on_confirm();
		});

		// ESC key
		$(document).off('keydown.bt-modal').on('keydown.bt-modal', function(e){
			if (e.key === 'Escape') { close_modal(); $(document).off('keydown.bt-modal'); }
		});
	}

	// ── Download ──────────────────────────────────────────────────────
	function do_download(values) {
		var payload = {
			budget_reference_name: values.budget_reference_name,
			partner_name:          values.partner_name,
			partner_id:            values.partner_id,
			grant_id:              values.grant_id,
			no_of_creches:         parseInt(values.no_of_creches) || 0,
			state:                 values.state,
			financial_year:        values.financial_year,
			date_of_approval:      values.date_of_approval,
			start_date:            values.start_date,
			end_date:              values.end_date,
		};

		show_alert('Generating template, please wait…', 'blue');

		fetch('/api/method/creche_reports.api.import_template.download_budget_template', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Frappe-CSRF-Token': frappe.csrf_token
			},
			body: JSON.stringify({ data: payload })
		})
		.then(function(res){
			if (!res.ok) {
				return res.json().then(function(err){
					var msg = (err && err.exception) ? err.exception : 'Server error while generating template.';
					show_alert(msg, 'red');
				});
			}
			var contentType = res.headers.get('content-type') || '';
			if (!contentType.includes('application/json')) {
				return res.blob().then(function(blob){
					var disposition = res.headers.get('content-disposition') || '';
					var match = disposition.match(/filename[^;=\n]*=(["']?)([^"'\n;]+)\1/);
					var filename = match ? match[2] : 'budget_template.xlsx';
					var url = URL.createObjectURL(blob);
					var a = document.createElement('a');
					a.href = url; a.download = filename;
					document.body.appendChild(a); a.click();
					setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 1000);
					show_alert('Template downloaded successfully.', 'green');
				});
			}
			return res.json().then(function(data){
				show_alert((data && data.message) ? data.message : 'Template generated.', 'green');
			});
		})
		.catch(function(err){
			console.error(err);
			show_alert('Failed to generate template. Check console for details.', 'red');
		});
	}

	// ── Primary Action ───────────────────────────────────────────────
	page.set_primary_action('Generate Import Template', function() {
		var values = get_values();
		if (!validate_mandatory(values)) return;
		open_confirm_modal(values, function(){ do_download(values); });
	}, 'download');

	// ── Table fetch ──────────────────────────────────────────────────
	function fetch_budget_items() {
		var $tbody = $(wrapper).find('#bt-tbody');
		$tbody.html('<tr><td colspan="4" class="bt-empty"><div>Loading...</div></td></tr>');

		fetch('/api/method/creche_reports.api.import_template.get_all_budget_items', {
			method: 'GET',
			headers: { 'X-Frappe-CSRF-Token': frappe.csrf_token, 'Content-Type': 'application/json' }
		})
		.then(function(res){ return res.json(); })
		.then(function(data){
			var rows = data.message || [];
			if (!rows.length) {
				$tbody.html('<tr><td colspan="4" class="bt-empty"><div class="bt-empty-icon">&#128193;</div><div>No budget items found</div></td></tr>');
				return;
			}
			$tbody.html(rows.map(function(row, i){
				return '<tr>' +
					'<td class="bt-td-num">'  + (i + 1) + '</td>' +
					'<td class="bt-td-main">' + (row.budget_main_head || '—') + '</td>' +
					'<td class="bt-td-sub">'  + (row.budget_sub_head  || '—') + '</td>' +
					'<td class="bt-td-type">' + (row.type_of_expenses || '—') + '</td>' +
					'</tr>';
			}).join(''));
		})
		.catch(function(err){
			$tbody.html('<tr><td colspan="4" class="bt-empty"><div class="bt-empty-icon">&#9888;</div><div>Failed to load. Check console.</div></td></tr>');
			show_alert('Failed to load budget items.', 'red');
			console.error(err);
		});
	}

	fetch_budget_items();
};
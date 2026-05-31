// frappe.pages['utilisation_import_template'].on_page_load = function(wrapper) {
// 	var page = frappe.ui.make_app_page({
// 		parent: wrapper,
// 		title: 'Utilisation Import Template',
// 		single_column: true
// 	});
// }




// frappe.pages['utilisation_import_template'].on_page_load = function(wrapper) {
// 	var page = frappe.ui.make_app_page({
// 		parent: wrapper,
// 		title: 'Utilisation Import Template',
// 		single_column: true
// 	});

// 	$(wrapper).find('.page-content').append(`
// 		<style>
// 			.ut-wrap * { box-sizing: border-box; }
// 			.ut-wrap { font-family: var(--font-stack); color: var(--text-color); padding: 16px; }

// 			/* ── Filters ── */
// 			.ut-filters { background:var(--card-bg);border:1px solid var(--border-color);border-radius:var(--border-radius-lg);padding:20px;margin-bottom:20px; }
// 			.ut-filters-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:14px; }
// 			@media (max-width:1100px) { .ut-filters-grid { grid-template-columns:repeat(3,1fr); } }
// 			@media (max-width:800px)  { .ut-filters-grid { grid-template-columns:repeat(2,1fr); } }
// 			@media (max-width:500px)  { .ut-filters-grid { grid-template-columns:1fr; } }
// 			.ut-filter-item .control-label { font-family:var(--font-stack)!important;font-size:var(--text-xs)!important;font-weight:600!important;color:var(--text-muted)!important; }
// 			.ut-filter-item input.input-with-feedback,
// 			.ut-filter-item .form-control { font-family:var(--font-stack)!important;font-size:var(--text-sm)!important;color:var(--text-color)!important;background:var(--control-bg)!important;border-color:var(--border-color)!important;border-radius:var(--border-radius)!important; }
// 			.ut-filter-item.ut-mandatory .control-label::after { content:' *';color:var(--red); }
// 			.ut-filter-item.ut-readonly input.input-with-feedback,
// 			.ut-filter-item.ut-readonly .form-control { background:var(--subtle-fg)!important;color:var(--text-muted)!important;cursor:not-allowed!important; }

// 			/* ── Summary Card ── */
// 			.ut-summary-card { background:var(--card-bg);border:1px solid var(--border-color);border-radius:var(--border-radius-lg);overflow:hidden;margin-bottom:24px;box-shadow:0 1px 4px rgba(0,0,0,0.06); }
// 			.ut-summary-header { display:flex;align-items:center;gap:10px;padding:12px 20px;border-bottom:1px solid var(--border-color);background:linear-gradient(90deg,#1a4f8a 0%,#1e5fa8 100%); }
// 			.ut-summary-header-dot { width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.7);flex-shrink:0; }
// 			.ut-summary-header-title { font-size:11px;font-weight:700;color:#ffffff;letter-spacing:0.08em;text-transform:uppercase; }
// 			.ut-summary-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:0; }
// 			@media (max-width:900px) { .ut-summary-grid { grid-template-columns:repeat(2,1fr); } }
// 			@media (max-width:500px) { .ut-summary-grid { grid-template-columns:1fr; } }
// 			.ut-summary-item { padding:16px 20px;border-right:1px solid var(--border-color);border-bottom:1px solid var(--border-color);min-width:0; }
// 			.ut-summary-item:nth-child(4n) { border-right:none; }
// 			.ut-summary-item:nth-last-child(-n+4) { border-bottom:none; }
// 			@media (max-width:900px) {
// 				.ut-summary-item:nth-child(4n) { border-right:1px solid var(--border-color); }
// 				.ut-summary-item:nth-child(2n) { border-right:none; }
// 				.ut-summary-item:nth-last-child(-n+2) { border-bottom:none; }
// 				.ut-summary-item:nth-last-child(-n+4) { border-bottom:1px solid var(--border-color); }
// 			}
// 			.ut-summary-label { font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px; }
// 			.ut-summary-value { font-size:14px;font-weight:700;color:var(--text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
// 			.ut-summary-value.empty { font-size:12px;font-weight:400;color:var(--text-extra-muted);font-style:italic; }
// 			.ut-grant-pill { display:inline-flex;align-items:center;background:#e8f0fb;border:1px solid #c0d0e8;border-radius:4px;padding:2px 8px;font-size:12px;font-weight:700;color:#1a4f8a; }

// 			/* ── Section heading ── */
// 			.ut-section-heading { display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:2px solid #1a4f8a;margin-bottom:16px;flex-wrap:wrap;gap:8px; }
// 			.ut-section-heading-title { font-size:15px;font-weight:700;color:#1a4f8a;text-transform:uppercase;letter-spacing:0.04em; }

// 			/* ── Table ── */
// 			.ut-table-scroll { overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid #c5cdd8;border-radius:8px; }
// 			.ut-table-scroll.ut-scrollable { max-height:420px;overflow-y:auto; }
// 			.ut-table-scroll table { width:100%;border-collapse:separate;border-spacing:0;font-size:var(--text-sm);min-width:480px; }
// 			.ut-table-scroll thead tr { background:#1a4f8a; }
// 			.ut-table-scroll thead th {
// 				padding:11px 16px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;
// 				text-transform:uppercase;letter-spacing:0.06em;white-space:nowrap;
// 				border-right:1px solid rgba(255,255,255,0.2);
// 				border-bottom:1px solid rgba(255,255,255,0.15);
// 				position:sticky;top:0;z-index:2;background:#1a4f8a;
// 			}
// 			.ut-table-scroll thead th:first-child { text-align:center;width:52px; }
// 			.ut-table-scroll thead th:last-child { border-right:none; }
// 			.ut-table-scroll tbody tr { background:#ffffff;transition:background 0.12s; }
// 			.ut-table-scroll tbody tr:nth-child(even) { background:#f4f7fa; }
// 			.ut-table-scroll tbody tr:hover { background:#e8f0fb !important; }
// 			.ut-table-scroll tbody td {
// 				padding:10px 16px;font-size:var(--text-sm);color:var(--text-color);
// 				border-right:1px solid #dde3ea;border-bottom:1px solid #dde3ea;
// 				white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px;
// 			}
// 			.ut-table-scroll tbody tr:last-child td { border-bottom:none; }
// 			.ut-table-scroll tbody td:last-child { border-right:none; }
// 			.ut-td-num  { text-align:center;width:52px;font-weight:600;font-size:12px;color:var(--text-muted); }
// 			.ut-td-main { font-weight:600;color:var(--text-color); }
// 			.ut-td-sub  { color:var(--text-muted); }
// 			.ut-td-type { color:var(--text-muted); }
// 			.ut-empty { text-align:center;padding:44px 20px;font-size:var(--text-sm);color:var(--text-muted); }
// 			.ut-empty-icon { font-size:24px;margin-bottom:8px; }

// 			/* ── Modal ── */
// 			.ut-modal-backdrop { position:fixed;inset:0;background:rgba(15,23,42,0.55);backdrop-filter:blur(2px);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;animation:utFadeIn 0.18s ease; }
// 			@keyframes utFadeIn { from{opacity:0} to{opacity:1} }
// 			.ut-modal { background:var(--card-bg);border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.22),0 4px 16px rgba(0,0,0,0.12);width:100%;max-width:680px;overflow:hidden;animation:utSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1); }
// 			@keyframes utSlideUp { from{opacity:0;transform:translateY(24px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
// 			.ut-modal-header { display:flex;align-items:center;justify-content:space-between;padding:18px 24px 16px;background:linear-gradient(90deg,#1a4f8a 0%,#1e5fa8 100%); }
// 			.ut-modal-header-left { display:flex;align-items:center;gap:12px; }
// 			.ut-modal-header-icon { width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0; }
// 			.ut-modal-title { font-size:15px;font-weight:700;color:#ffffff;line-height:1.2; }
// 			.ut-modal-subtitle { font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px; }
// 			.ut-modal-close { width:32px;height:32px;border-radius:6px;background:rgba(255,255,255,0.12);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.8);font-size:18px;transition:background 0.15s;flex-shrink:0; }
// 			.ut-modal-close:hover { background:rgba(255,255,255,0.25);color:#fff; }
// 			.ut-modal-body { padding:20px 24px 24px; }
// 			.ut-modal-desc { font-size:13px;color:var(--text-muted);margin:0 0 16px;line-height:1.5; }
// 			.ut-modal-cards { display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px; }
// 			@media (max-width:500px) { .ut-modal-cards { grid-template-columns:repeat(2,1fr); } }
// 			.ut-modal-card { background:var(--subtle-fg);border:1px solid var(--border-color);border-radius:8px;padding:12px 14px;min-width:0;transition:border-color 0.15s,background 0.15s; }
// 			.ut-modal-card:hover { border-color:#a8c0e0;background:#f0f5fc; }
// 			.ut-modal-card-label { font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.09em;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
// 			.ut-modal-card-value { font-size:13px;font-weight:700;color:#1a4f8a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3; }
// 			.ut-modal-card-value.empty { font-size:12px;font-weight:400;color:var(--text-extra-muted);font-style:italic; }
// 			.ut-modal-footer { display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:14px 24px;border-top:1px solid var(--border-color);background:var(--subtle-fg); }
// 			.ut-btn { display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600;border:none;cursor:pointer;transition:all 0.15s;line-height:1; }
// 			.ut-btn-cancel { background:var(--card-bg);color:var(--text-muted);border:1px solid var(--border-color); }
// 			.ut-btn-cancel:hover { background:var(--border-color);color:var(--text-color); }
// 			.ut-btn-confirm { background:linear-gradient(135deg,#1a4f8a 0%,#1e5fa8 100%);color:#ffffff;box-shadow:0 2px 8px rgba(26,79,138,0.35); }
// 			.ut-btn-confirm:hover { background:linear-gradient(135deg,#163f70 0%,#1a4f8a 100%);box-shadow:0 4px 12px rgba(26,79,138,0.45);transform:translateY(-1px); }
// 			.ut-btn-confirm:active { transform:translateY(0); }
// 			.ut-btn-confirm:disabled { background:#9ab3d0;box-shadow:none;cursor:not-allowed;transform:none; }

// 			/* ── Declaration checkbox ── */
// 			.ut-declaration {
// 				display: flex;
// 				align-items: flex-start;
// 				gap: 10px;
// 				background: #f0f5fc;
// 				border: 1px solid #c0d0e8;
// 				border-radius: 8px;
// 				padding: 12px 14px;
// 				margin-bottom: 0;
// 				cursor: pointer;
// 				transition: background 0.15s, border-color 0.15s;
// 			}
// 			.ut-declaration:hover { background: #e4edf8; border-color: #a0b8d8; }
// 			.ut-declaration.checked { background: #ddeaf8; border-color: #1a4f8a; }
// 			.ut-declaration-checkbox {
// 				width: 18px; height: 18px;
// 				border: 2px solid #a0b8d8;
// 				border-radius: 4px;
// 				background: #ffffff;
// 				display: flex; align-items: center; justify-content: center;
// 				flex-shrink: 0;
// 				margin-top: 1px;
// 				transition: all 0.15s;
// 			}
// 			.ut-declaration.checked .ut-declaration-checkbox {
// 				background: #1a4f8a;
// 				border-color: #1a4f8a;
// 			}
// 			.ut-declaration-checkbox-tick {
// 				display: none;
// 				color: #ffffff;
// 				font-size: 11px;
// 				font-weight: 700;
// 				line-height: 1;
// 			}
// 			.ut-declaration.checked .ut-declaration-checkbox-tick { display: block; }
// 			.ut-declaration-text {
// 				font-size: 12px;
// 				color: var(--text-color);
// 				line-height: 1.5;
// 			}
// 			.ut-declaration-text strong { color: #1a4f8a; }
// 		</style>

// 		<div class="ut-wrap">

// 			<!-- Filters -->
// 			<div class="ut-filters">
// 				<div class="ut-filters-grid">
// 					<!-- Budget Reference Name: plain native select styled to match Frappe -->
// 					<div class="ut-filter-item ut-mandatory" id="ut-budget-ref-name-field">
// 						<div class="frappe-control">
// 							<div class="form-group">
// 								<label class="control-label" style="font-size:var(--text-xs);font-weight:600;color:var(--text-muted);">
// 									Budget Reference Name
// 								</label>
// 								<select id="ut-budget-select"
// 									class="form-control input-with-feedback"
// 									style="font-family:var(--font-stack);font-size:var(--text-sm);color:var(--text-color);background:var(--control-bg);border:1px solid var(--border-color);border-radius:var(--border-radius);height:32px;width:100%;padding:0 8px;">
// 									<option value="">— Loading… —</option>
// 								</select>
// 							</div>
// 						</div>
// 					</div>
// 					<div class="ut-filter-item ut-readonly"  id="ut-partner-name-field"></div>
// 					<div class="ut-filter-item ut-readonly"  id="ut-grant-id-field"></div>
// 					<div class="ut-filter-item ut-readonly"  id="ut-state-field"></div>
// 					<div class="ut-filter-item ut-readonly"  id="ut-no-of-creches-field"></div>
// 					<div class="ut-filter-item ut-mandatory" id="ut-financial-year-field"></div>
// 					<div class="ut-filter-item ut-mandatory" id="ut-month-field"></div>
// 				</div>
// 			</div>

// 			<!-- Summary Card -->
// 			<div class="ut-summary-card">
// 				<div class="ut-summary-header">
// 					<div class="ut-summary-header-dot"></div>
// 					<span class="ut-summary-header-title">Partner & Utilisation Details </span>
// 				</div>
// 				<div class="ut-summary-grid">
// 					<div class="ut-summary-item"><div class="ut-summary-label">Budget Ref. Name</div><div class="ut-summary-value empty" id="ut-card-budget-ref-name">Not set</div></div>
// 					<div class="ut-summary-item"><div class="ut-summary-label">Partner Name</div><div class="ut-summary-value empty" id="ut-card-partner-name">Not set</div></div>
// 					<div class="ut-summary-item"><div class="ut-summary-label">Grant ID</div><div id="ut-card-grant-pills"><span class="ut-summary-value empty">Not set</span></div></div>
// 					<div class="ut-summary-item"><div class="ut-summary-label">State</div><div class="ut-summary-value empty" id="ut-card-state">Not set</div></div>
// 					<div class="ut-summary-item"><div class="ut-summary-label">No. of Crèches</div><div class="ut-summary-value empty" id="ut-card-no-of-creches">Not set</div></div>
// 					<div class="ut-summary-item"><div class="ut-summary-label">Financial Year</div><div class="ut-summary-value empty" id="ut-card-financial-year">Not set</div></div>
// 					<div class="ut-summary-item"><div class="ut-summary-label">Month</div><div class="ut-summary-value empty" id="ut-card-month">Not set</div></div>
// 					<div class="ut-summary-item" style="border-right:none;"></div>
// 				</div>
// 			</div>

// 			<!-- Section heading -->
// 			<div class="ut-section-heading">
// 				<span class="ut-section-heading-title">Utilisation Items Lines</span>
// 			</div>

// 			<!-- Table -->
// 			<div class="ut-table-scroll">
// 				<table>
// 					<thead>
// 						<tr>
// 							<th>#</th>
// 							<th>Budget Main Head</th>
// 							<th>Budget Sub Head</th>
// 							<th>Type of Expenses</th>
// 						</tr>
// 					</thead>
// 					<tbody id="ut-tbody">
// 						<tr><td colspan="4" class="ut-empty"><div class="ut-empty-icon">&#128203;</div><div>Loading...</div></td></tr>
// 					</tbody>
// 				</table>
// 			</div>

// 		</div>

// 		<!-- Custom Confirmation Modal -->
// 		<div class="ut-modal-backdrop" id="ut-confirm-backdrop" style="display:none;">
// 			<div class="ut-modal">
// 				<div class="ut-modal-header">
// 					<div class="ut-modal-header-left">
// 						<div class="ut-modal-header-icon">&#128203;</div>
// 						<div>
// 							<div class="ut-modal-title">Check Basic Details</div>
// 							<div class="ut-modal-subtitle">Please verify before generating the template</div>
// 						</div>
// 					</div>
// 					<button class="ut-modal-close" id="ut-modal-close-btn">&#215;</button>
// 				</div>
// 				<div class="ut-modal-body">
// 					<p class="ut-modal-desc">Review all details carefully. Once you confirm, the utilisation import template will be generated and downloaded.</p>
// 					<div class="ut-modal-cards" id="ut-modal-cards"></div>
// 					<div class="ut-declaration" id="ut-declaration">
// 						<div class="ut-declaration-checkbox">
// 							<span class="ut-declaration-checkbox-tick">&#10003;</span>
// 						</div>
// 						<div class="ut-declaration-text">
// 							I hereby declare that <strong>all the details provided above are correct</strong> and I take full responsibility for the accuracy of the information submitted for generating this utilisation import template.
// 						</div>
// 					</div>
// 				</div>
// 				<div class="ut-modal-footer">
// 					<button class="ut-btn ut-btn-cancel" id="ut-modal-cancel-btn">Cancel</button>
// 					<button class="ut-btn ut-btn-confirm" id="ut-modal-confirm-btn" disabled>&#10003;&nbsp; Confirm &amp; Download</button>
// 				</div>
// 			</div>
// 		</div>
// 	`);

// 	// ── on_page_show: reload both budgets + table on every visit ──────
// 	frappe.pages['utilisation_import_template'].on_page_show = function() {
// 		fetch_budget_items();
// 		load_budgets();
// 	};

// 	// ── Helpers ───────────────────────────────────────────────────────
// 	function make_field(id) { return $(wrapper).find('#' + id)[0]; }

// 	function set_card(id, value) {
// 		var $el = $(wrapper).find('#' + id);
// 		if (value) { $el.text(value).removeClass('empty'); }
// 		else       { $el.text('Not set').addClass('empty'); }
// 	}

// 	function show_alert(msg, indicator) {
// 		frappe.show_alert({ message: __(msg), indicator: indicator || 'red' }, 5);
// 	}

// 	// ── Budget data cache ─────────────────────────────────────────────
// 	var all_budgets = [];

// 	function load_budgets() {
// 		var $sel = $(wrapper).find('#ut-budget-select');
// 		$sel.empty().append('<option value="">— Loading… —</option>');

// 		frappe.call({
// 			method: 'creche_reports.api.common.get_all_budgets',
// 			callback: function(r) {
// 				all_budgets = (r.message) || [];
// 				populate_budget_select();
// 			},
// 			error: function(err) {
// 				console.error('Failed to load budgets', err);
// 				show_alert('Failed to load budgets. Please refresh.', 'red');
// 				$(wrapper).find('#ut-budget-select')
// 					.empty()
// 					.append('<option value="">— Error loading —</option>');
// 			}
// 		});
// 	}

// 	function populate_budget_select() {
// 		var $sel = $(wrapper).find('#ut-budget-select');

// 		if (!$sel.length) {
// 			setTimeout(populate_budget_select, 100);
// 			return;
// 		}

// 		$sel.empty().append('<option value="">— Select Budget —</option>');

// 		all_budgets.forEach(function(b) {
// 			$sel.append(
// 				$('<option>', {
// 					value: b.name,
// 					text:  (b.budget_reference_name || b.name).trim()
// 				})
// 			);
// 		});
// 	}

// 	function on_budget_change(selected_name) {
// 		var b = all_budgets.find(function(x){ return x.name === selected_name; });
// 		if (b) {
// 			partner_name_filter.set_value(b.partner_name || '');
// 			grant_id_filter.set_value(b.grant_id || '');
// 			state_filter.set_value(b.state || '');
// 			no_of_creches_filter.set_value(b.no_of_creches || '');

// 			set_card('ut-card-budget-ref-name', (b.budget_reference_name || '').trim());
// 			set_card('ut-card-partner-name', b.partner_name);
// 			set_card('ut-card-state', b.state);
// 			set_card('ut-card-no-of-creches', b.no_of_creches);

// 			var $pills = $(wrapper).find('#ut-card-grant-pills');
// 			if (b.grant_id) {
// 				$pills.html('<span class="ut-grant-pill">' + frappe.utils.escape_html(b.grant_id) + '</span>');
// 			} else {
// 				$pills.html('<span class="ut-summary-value empty">Not set</span>');
// 			}
// 		} else {
// 			[partner_name_filter, grant_id_filter, state_filter, no_of_creches_filter]
// 				.forEach(function(f){ f.set_value(''); });
// 			['ut-card-budget-ref-name','ut-card-partner-name','ut-card-state','ut-card-no-of-creches']
// 				.forEach(function(id){ set_card(id, ''); });
// 			$(wrapper).find('#ut-card-grant-pills').html('<span class="ut-summary-value empty">Not set</span>');
// 		}
// 	}

// 	// ── Controls ──────────────────────────────────────────────────────
// 	function get_budget_value() {
// 		return $(wrapper).find('#ut-budget-select').val() || '';
// 	}

// 	$(wrapper).on('change', '#ut-budget-select', function(){
// 		on_budget_change($(this).val());
// 	});

// 	var partner_name_filter = frappe.ui.form.make_control({
// 		parent: make_field('ut-partner-name-field'),
// 		df: { label: 'Partner Name', fieldtype: 'Data', fieldname: 'partner_name', read_only: 1 },
// 		render_input: true
// 	});

// 	var grant_id_filter = frappe.ui.form.make_control({
// 		parent: make_field('ut-grant-id-field'),
// 		df: { label: 'Grant ID', fieldtype: 'Data', fieldname: 'grant_id', read_only: 1 },
// 		render_input: true
// 	});

// 	var state_filter = frappe.ui.form.make_control({
// 		parent: make_field('ut-state-field'),
// 		df: { label: 'State', fieldtype: 'Data', fieldname: 'state', read_only: 1 },
// 		render_input: true
// 	});

// 	var no_of_creches_filter = frappe.ui.form.make_control({
// 		parent: make_field('ut-no-of-creches-field'),
// 		df: { label: 'No. of Crèches', fieldtype: 'Data', fieldname: 'no_of_creches', read_only: 1 },
// 		render_input: true
// 	});

// 	var financial_year_filter = frappe.ui.form.make_control({
// 		parent: make_field('ut-financial-year-field'),
// 		df: {
// 			label: 'Financial Year', fieldtype: 'Link', fieldname: 'financial_year',
// 			options: 'Financial year',
// 			change: function(){ set_card('ut-card-financial-year', financial_year_filter.get_value()); }
// 		},
// 		render_input: true
// 	});

// 	var month_filter = frappe.ui.form.make_control({
// 		parent: make_field('ut-month-field'),
// 		df: {
// 			label: 'Month', fieldtype: 'Select', fieldname: 'month',
// 			options: ['','January','February','March','April','May','June','July','August','September','October','November','December'].join('\n'),
// 			change: function(){ set_card('ut-card-month', month_filter.get_value()); }
// 		},
// 		render_input: true
// 	});

// 	[partner_name_filter, grant_id_filter,
// 	 state_filter, no_of_creches_filter, financial_year_filter,
// 	 month_filter].forEach(function(f){ f.refresh(); });

// 	load_budgets();
// 	auto_fill_date_fields();

// 	// ── Auto-fill Financial Year & Month from current date ───────────
// 	function auto_fill_date_fields() {
// 		var now   = new Date();
// 		var month = now.toLocaleString('en-US', { month: 'long' });

// 		month_filter.set_value(month);
// 		set_card('ut-card-month', month);

// 		frappe.call({
// 			method: 'frappe.client.get_list',
// 			args: { doctype: 'Financial year', fields: ['name'], limit: 50 },
// 			callback: function(r) {
// 				if (!r.message || !r.message.length) return;

// 				var year = now.getFullYear();
// 				var fy_start = now.getMonth() >= 3 ? year : year - 1;
// 				var fy_end_2digit = String(fy_start + 1).slice(-2);

// 				var match = r.message.find(function(fy) {
// 					return fy.name === String(fy_start) + '-' + fy_end_2digit;
// 				});

// 				if (!match) {
// 					match = r.message.find(function(fy) {
// 						return fy.name.indexOf(String(fy_start)) !== -1 && fy.name.indexOf(fy_end_2digit) !== -1;
// 					});
// 				}

// 				if (!match) match = r.message[r.message.length - 1];

// 				financial_year_filter.set_value(match.name);
// 				set_card('ut-card-financial-year', match.name);
// 			}
// 		});
// 	}

// 	// ── Collect values ────────────────────────────────────────────────
// 	function get_values() {
// 		var selected_name = get_budget_value();
// 		var b = all_budgets.find(function(x){ return x.name === selected_name; });
// 		return {
// 			// FIX: use dedicated budget_reference_id field if present,
// 			// fall back to b.name (the Frappe document name) as a last resort
// 			budget_reference_id:   b ? (b.budget_reference_id   || b.name  || '').trim() : '',
// 			budget_reference_name: b ? (b.budget_reference_name || '').trim() : '',
// 			partner_name:          b ? (b.partner_name   || '') : '',
// 			partner_id:            b ? (b.partner_id     || '') : '',
// 			grant_id:              b ? (b.grant_id       || '') : '',
// 			state:                 b ? (b.state          || '') : '',
// 			no_of_creches:         b ? (b.no_of_creches  || '') : '',
// 			financial_year:        financial_year_filter.get_value(),
// 			month:                 month_filter.get_value(),
// 		};
// 	}

// 	// ── Mandatory validation ──────────────────────────────────────────
// 	function validate_mandatory(values) {
// 		var checks = [
// 			{ key: 'budget_reference_name', label: 'Budget Reference Name' },
// 			{ key: 'financial_year',        label: 'Financial Year' },
// 			{ key: 'month',                 label: 'Month' },
// 		];
// 		var missing = checks.filter(function(f){ return !values[f.key]; });
// 		if (missing.length) {
// 			show_alert('Please fill mandatory fields: ' + missing.map(function(f){ return f.label; }).join(', '), 'red');
// 			return false;
// 		}
// 		return true;
// 	}

// 	// ── Confirm modal ─────────────────────────────────────────────────
// 	function open_confirm_modal(values, on_confirm) {
// 		var fields = [
// 			{ label: 'Budget Ref. Name', val: values.budget_reference_name },
// 			{ label: 'Partner Name',     val: values.partner_name },
// 			{ label: 'Partner ID',       val: values.partner_id },
// 			{ label: 'Grant ID',         val: values.grant_id },
// 			{ label: 'State',            val: values.state },
// 			{ label: 'No. of Crèches',  val: values.no_of_creches },
// 			{ label: 'Financial Year',   val: values.financial_year },
// 			{ label: 'Month',            val: values.month },
// 		];

// 		$(wrapper).find('#ut-modal-cards').html(fields.map(function(f){
// 			var d = (f.val !== null && f.val !== undefined && String(f.val).trim() !== '') ? String(f.val) : null;
// 			return '<div class="ut-modal-card">' +
// 				'<div class="ut-modal-card-label">' + frappe.utils.escape_html(f.label) + '</div>' +
// 				'<div class="ut-modal-card-value' + (d ? '' : ' empty') + '">' + frappe.utils.escape_html(d || '—') + '</div>' +
// 			'</div>';
// 		}).join(''));

// 		var $backdrop = $(wrapper).find('#ut-confirm-backdrop');
// 		$backdrop.fadeIn(160);

// 		$(wrapper).find('#ut-declaration').removeClass('checked');
// 		$(wrapper).find('#ut-modal-confirm-btn').prop('disabled', true);

// 		$(wrapper).find('#ut-declaration').off('click').on('click', function(){
// 			var $decl = $(this);
// 			var checked = $decl.toggleClass('checked').hasClass('checked');
// 			$(wrapper).find('#ut-modal-confirm-btn').prop('disabled', !checked);
// 		});

// 		function close_modal() { $backdrop.fadeOut(140); }

// 		$(wrapper).find('#ut-modal-close-btn').off('click').on('click', close_modal);
// 		$(wrapper).find('#ut-modal-cancel-btn').off('click').on('click', close_modal);
// 		$backdrop.off('click').on('click', function(e){ if ($(e.target).is($backdrop)) close_modal(); });
// 		$(wrapper).find('#ut-modal-confirm-btn').off('click').on('click', function(){ close_modal(); on_confirm(); });
// 		$(document).off('keydown.ut-modal').on('keydown.ut-modal', function(e){
// 			if (e.key === 'Escape') { close_modal(); $(document).off('keydown.ut-modal'); }
// 		});
// 	}

// 	// ── Download ──────────────────────────────────────────────────────
// 	function do_download(values) {
// 		var payload = {
// 			budget_reference_id:   values.budget_reference_id,
// 			budget_reference_name: values.budget_reference_name,
// 			partner_name:          values.partner_name,
// 			partner_id:            values.partner_id,
// 			grant_id:              values.grant_id,
// 			state:                 values.state,
// 			no_of_creches:         parseInt(values.no_of_creches) || 0,
// 			financial_year:        values.financial_year,
// 			month:                 values.month,
// 		};

// 		show_alert('Generating template, please wait…', 'blue');

// 		fetch('/api/method/creche_reports.api.import_template.download_utilisation_template', {
// 			method: 'POST',
// 			headers: { 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': frappe.csrf_token },
// 			body: JSON.stringify({ data: payload })
// 		})
// 		.then(function(res){
// 			if (!res.ok) return res.json().then(function(err){ show_alert((err && err.exception) ? err.exception : 'Server error.', 'red'); });
// 			var ct = res.headers.get('content-type') || '';
// 			if (!ct.includes('application/json')) {
// 				return res.blob().then(function(blob){
// 					var match = (res.headers.get('content-disposition') || '').match(/filename[^;=\n]*=(["']?)([^"'\n;]+)\1/);
// 					var filename = match ? match[2] : 'utilisation_template.xlsx';
// 					var url = URL.createObjectURL(blob);
// 					var a = document.createElement('a'); a.href = url; a.download = filename;
// 					document.body.appendChild(a); a.click();
// 					setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 1000);
// 					show_alert('Template downloaded successfully.', 'green');
// 				});
// 			}
// 			return res.json().then(function(d){ show_alert((d && d.message) ? d.message : 'Template generated.', 'green'); });
// 		})
// 		.catch(function(err){ console.error(err); show_alert('Failed to generate template.', 'red'); });
// 	}

// 	// ── Primary Action ────────────────────────────────────────────────
// 	page.set_primary_action('Generate Import Template', function() {
// 		var values = get_values();
// 		if (!validate_mandatory(values)) return;
// 		open_confirm_modal(values, function(){ do_download(values); });
// 	}, 'download');

// 	// ── Table ─────────────────────────────────────────────────────────
// 	function fetch_budget_items() {
// 		var $tbody = $(wrapper).find('#ut-tbody');
// 		$tbody.html('<tr><td colspan="4" class="ut-empty"><div>Loading...</div></td></tr>');
// 		fetch('/api/method/creche_reports.api.import_template.get_all_budget_items', {
// 			method: 'GET',
// 			headers: { 'X-Frappe-CSRF-Token': frappe.csrf_token, 'Content-Type': 'application/json' }
// 		})
// 		.then(function(res){ return res.json(); })
// 		.then(function(data){
// 			var rows = data.message || [];
// 			if (!rows.length) {
// 				$tbody.html('<tr><td colspan="4" class="ut-empty"><div class="ut-empty-icon">&#128193;</div><div>No budget items found</div></td></tr>');
// 				$(wrapper).find('.ut-table-scroll').removeClass('ut-scrollable');
// 				return;
// 			}
// 			// Enable vertical scroll when rows exceed 10
// 			$(wrapper).find('.ut-table-scroll').toggleClass('ut-scrollable', rows.length > 10);
// 			$tbody.html(rows.map(function(row, i){
// 				return '<tr>' +
// 					'<td class="ut-td-num">' + (i + 1) + '</td>' +
// 					'<td class="ut-td-main">' + frappe.utils.escape_html(row.budget_main_head || '—') + '</td>' +
// 					'<td class="ut-td-sub">'  + frappe.utils.escape_html(row.budget_sub_head  || '—') + '</td>' +
// 					'<td class="ut-td-type">' + frappe.utils.escape_html(row.type_of_expenses || '—') + '</td>' +
// 				'</tr>';
// 			}).join(''));
// 		})
// 		.catch(function(err){
// 			$tbody.html('<tr><td colspan="4" class="ut-empty"><div class="ut-empty-icon">&#9888;</div><div>Failed to load.</div></td></tr>');
// 			show_alert('Failed to load budget items.', 'red');
// 			console.error(err);
// 		});
// 	}

// 	fetch_budget_items();
// };

frappe.pages['utilisation_import_template'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Utilisation Import Template',
        single_column: true
    });

    $(wrapper).find('.page-content').append(`
        <style>
            .ut-wrap * { box-sizing: border-box; }
            .ut-wrap { font-family: var(--font-stack); color: var(--text-color); padding: 16px; }

            /* ── Filters ── */
            .ut-filters { background:var(--card-bg);border:1px solid var(--border-color);border-radius:var(--border-radius-lg);padding:20px;margin-bottom:20px; }
            .ut-filters-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:14px; }
            @media (max-width:1100px) { .ut-filters-grid { grid-template-columns:repeat(3,1fr); } }
            @media (max-width:800px)  { .ut-filters-grid { grid-template-columns:repeat(2,1fr); } }
            @media (max-width:500px)  { .ut-filters-grid { grid-template-columns:1fr; } }
            .ut-filter-item .control-label { font-family:var(--font-stack)!important;font-size:var(--text-xs)!important;font-weight:600!important;color:var(--text-muted)!important; }
            .ut-filter-item input.input-with-feedback,
            .ut-filter-item .form-control { font-family:var(--font-stack)!important;font-size:var(--text-sm)!important;color:var(--text-color)!important;background:var(--control-bg)!important;border-color:var(--border-color)!important;border-radius:var(--border-radius)!important; }
            .ut-filter-item.ut-mandatory .control-label::after { content:' *';color:var(--red); }
            .ut-filter-item.ut-readonly input.input-with-feedback,
            .ut-filter-item.ut-readonly .form-control { background:var(--subtle-fg)!important;color:var(--text-muted)!important;cursor:not-allowed!important; }

            /* ── Summary Card ── */
            .ut-summary-card { background:var(--card-bg);border:1px solid var(--border-color);border-radius:var(--border-radius-lg);overflow:hidden;margin-bottom:24px;box-shadow:0 1px 4px rgba(0,0,0,0.06); }
            .ut-summary-header { display:flex;align-items:center;gap:10px;padding:12px 20px;border-bottom:1px solid var(--border-color);background:linear-gradient(90deg,#1a4f8a 0%,#1e5fa8 100%); }
            .ut-summary-header-dot { width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.7);flex-shrink:0; }
            .ut-summary-header-title { font-size:11px;font-weight:700;color:#ffffff;letter-spacing:0.08em;text-transform:uppercase; }
            .ut-summary-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:0; }
            @media (max-width:900px) { .ut-summary-grid { grid-template-columns:repeat(2,1fr); } }
            @media (max-width:500px) { .ut-summary-grid { grid-template-columns:1fr; } }
            .ut-summary-item { padding:16px 20px;border-right:1px solid var(--border-color);border-bottom:1px solid var(--border-color);min-width:0; }
            .ut-summary-item:nth-child(4n) { border-right:none; }
            .ut-summary-item:nth-last-child(-n+4) { border-bottom:none; }
            @media (max-width:900px) {
                .ut-summary-item:nth-child(4n) { border-right:1px solid var(--border-color); }
                .ut-summary-item:nth-child(2n) { border-right:none; }
                .ut-summary-item:nth-last-child(-n+2) { border-bottom:none; }
                .ut-summary-item:nth-last-child(-n+4) { border-bottom:1px solid var(--border-color); }
            }
            .ut-summary-label { font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px; }
            .ut-summary-value { font-size:14px;font-weight:700;color:var(--text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
            .ut-summary-value.empty { font-size:12px;font-weight:400;color:var(--text-extra-muted);font-style:italic; }
            .ut-grant-pill { display:inline-flex;align-items:center;background:#e8f0fb;border:1px solid #c0d0e8;border-radius:4px;padding:2px 8px;font-size:12px;font-weight:700;color:#1a4f8a; }

            /* ── Section heading ── */
            .ut-section-heading { display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:2px solid #1a4f8a;margin-bottom:16px;flex-wrap:wrap;gap:8px; }
            .ut-section-heading-title { font-size:15px;font-weight:700;color:#1a4f8a;text-transform:uppercase;letter-spacing:0.04em; }

            /* ── Table ── */
            .ut-table-scroll { overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid #c5cdd8;border-radius:8px; }
            .ut-table-scroll.ut-scrollable { max-height:420px;overflow-y:auto; }
            .ut-table-scroll table { width:100%;border-collapse:separate;border-spacing:0;font-size:var(--text-sm);min-width:480px; }
            .ut-table-scroll thead tr { background:#1a4f8a; }
            .ut-table-scroll thead th {
                padding:11px 16px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;
                text-transform:uppercase;letter-spacing:0.06em;white-space:nowrap;
                border-right:1px solid rgba(255,255,255,0.2);
                border-bottom:1px solid rgba(255,255,255,0.15);
                position:sticky;top:0;z-index:2;background:#1a4f8a;
            }
            .ut-table-scroll thead th:first-child { text-align:center;width:52px; }
            .ut-table-scroll thead th:last-child { border-right:none; }
            .ut-table-scroll tbody tr { background:#ffffff;transition:background 0.12s; }
            .ut-table-scroll tbody tr:nth-child(even) { background:#f4f7fa; }
            .ut-table-scroll tbody tr:hover { background:#e8f0fb !important; }
            .ut-table-scroll tbody td {
                padding:10px 16px;font-size:var(--text-sm);color:var(--text-color);
                border-right:1px solid #dde3ea;border-bottom:1px solid #dde3ea;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px;
            }
            .ut-table-scroll tbody tr:last-child td { border-bottom:none; }
            .ut-table-scroll tbody td:last-child { border-right:none; }
            .ut-td-num  { text-align:center;width:52px;font-weight:600;font-size:12px;color:var(--text-muted); }
            .ut-td-main { font-weight:600;color:var(--text-color); }
            .ut-td-sub  { color:var(--text-muted); }
            .ut-td-type { color:var(--text-muted); }
            .ut-empty { text-align:center;padding:44px 20px;font-size:var(--text-sm);color:var(--text-muted); }
            .ut-empty-icon { font-size:24px;margin-bottom:8px; }

            /* ── Modal ── */
            .ut-modal-backdrop { position:fixed;inset:0;background:rgba(15,23,42,0.55);backdrop-filter:blur(2px);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;animation:utFadeIn 0.18s ease; }
            @keyframes utFadeIn { from{opacity:0} to{opacity:1} }
            .ut-modal { background:var(--card-bg);border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.22),0 4px 16px rgba(0,0,0,0.12);width:100%;max-width:680px;overflow:hidden;animation:utSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1); }
            @keyframes utSlideUp { from{opacity:0;transform:translateY(24px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
            .ut-modal-header { display:flex;align-items:center;justify-content:space-between;padding:18px 24px 16px;background:linear-gradient(90deg,#1a4f8a 0%,#1e5fa8 100%); }
            .ut-modal-header-left { display:flex;align-items:center;gap:12px; }
            .ut-modal-header-icon { width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0; }
            .ut-modal-title { font-size:15px;font-weight:700;color:#ffffff;line-height:1.2; }
            .ut-modal-subtitle { font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px; }
            .ut-modal-close { width:32px;height:32px;border-radius:6px;background:rgba(255,255,255,0.12);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.8);font-size:18px;transition:background 0.15s;flex-shrink:0; }
            .ut-modal-close:hover { background:rgba(255,255,255,0.25);color:#fff; }
            .ut-modal-body { padding:20px 24px 24px; }
            .ut-modal-desc { font-size:13px;color:var(--text-muted);margin:0 0 16px;line-height:1.5; }
            .ut-modal-cards { display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px; }
            @media (max-width:500px) { .ut-modal-cards { grid-template-columns:repeat(2,1fr); } }
            .ut-modal-card { background:var(--subtle-fg);border:1px solid var(--border-color);border-radius:8px;padding:12px 14px;min-width:0;transition:border-color 0.15s,background 0.15s; }
            .ut-modal-card:hover { border-color:#a8c0e0;background:#f0f5fc; }
            .ut-modal-card-label { font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.09em;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
            .ut-modal-card-value { font-size:13px;font-weight:700;color:#1a4f8a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3; }
            .ut-modal-card-value.empty { font-size:12px;font-weight:400;color:var(--text-extra-muted);font-style:italic; }
            .ut-modal-footer { display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:14px 24px;border-top:1px solid var(--border-color);background:var(--subtle-fg); }
            .ut-btn { display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600;border:none;cursor:pointer;transition:all 0.15s;line-height:1; }
            .ut-btn-cancel { background:var(--card-bg);color:var(--text-muted);border:1px solid var(--border-color); }
            .ut-btn-cancel:hover { background:var(--border-color);color:var(--text-color); }
            .ut-btn-confirm { background:linear-gradient(135deg,#1a4f8a 0%,#1e5fa8 100%);color:#ffffff;box-shadow:0 2px 8px rgba(26,79,138,0.35); }
            .ut-btn-confirm:hover { background:linear-gradient(135deg,#163f70 0%,#1a4f8a 100%);box-shadow:0 4px 12px rgba(26,79,138,0.45);transform:translateY(-1px); }
            .ut-btn-confirm:active { transform:translateY(0); }
            .ut-btn-confirm:disabled { background:#9ab3d0;box-shadow:none;cursor:not-allowed;transform:none; }

            /* ── Declaration checkbox ── */
            .ut-declaration {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                background: #f0f5fc;
                border: 1px solid #c0d0e8;
                border-radius: 8px;
                padding: 12px 14px;
                margin-bottom: 0;
                cursor: pointer;
                transition: background 0.15s, border-color 0.15s;
            }
            .ut-declaration:hover { background: #e4edf8; border-color: #a0b8d8; }
            .ut-declaration.checked { background: #ddeaf8; border-color: #1a4f8a; }
            .ut-declaration-checkbox {
                width: 18px; height: 18px;
                border: 2px solid #a0b8d8;
                border-radius: 4px;
                background: #ffffff;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
                margin-top: 1px;
                transition: all 0.15s;
            }
            .ut-declaration.checked .ut-declaration-checkbox {
                background: #1a4f8a;
                border-color: #1a4f8a;
            }
            .ut-declaration-checkbox-tick {
                display: none;
                color: #ffffff;
                font-size: 11px;
                font-weight: 700;
                line-height: 1;
            }
            .ut-declaration.checked .ut-declaration-checkbox-tick { display: block; }
            .ut-declaration-text {
                font-size: 12px;
                color: var(--text-color);
                line-height: 1.5;
            }
            .ut-declaration-text strong { color: #1a4f8a; }
        </style>

        <div class="ut-wrap">

            <!-- Filters -->
            <div class="ut-filters">
                <div class="ut-filters-grid">
                    <div class="ut-filter-item ut-mandatory" id="ut-budget-ref-name-field">
                        <div class="frappe-control">
                            <div class="form-group">
                                <label class="control-label" style="font-size:var(--text-xs);font-weight:600;color:var(--text-muted);">
                                    Budget Reference Name
                                </label>
                                <select id="ut-budget-select"
                                    class="form-control input-with-feedback"
                                    style="font-family:var(--font-stack);font-size:var(--text-sm);color:var(--text-color);background:var(--control-bg);border:1px solid var(--border-color);border-radius:var(--border-radius);height:32px;width:100%;padding:0 8px;">
                                    <option value="">— Loading… —</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="ut-filter-item ut-readonly"  id="ut-partner-name-field"></div>
                    <div class="ut-filter-item ut-readonly"  id="ut-grant-id-field"></div>
                    <div class="ut-filter-item ut-readonly"  id="ut-state-field"></div>
                    <div class="ut-filter-item ut-readonly"  id="ut-no-of-creches-field"></div>
                    <div class="ut-filter-item ut-mandatory" id="ut-block-field"></div>
                    <div class="ut-filter-item ut-mandatory" id="ut-district-field"></div>
                    <div class="ut-filter-item ut-mandatory" id="ut-financial-year-field"></div>
                    <div class="ut-filter-item ut-mandatory" id="ut-month-field"></div>
                </div>
            </div>

            <!-- Summary Card -->
            <div class="ut-summary-card">
                <div class="ut-summary-header">
                    <div class="ut-summary-header-dot"></div>
                    <span class="ut-summary-header-title">Partner & Utilisation Details</span>
                </div>
                <div class="ut-summary-grid">
                    <div class="ut-summary-item"><div class="ut-summary-label">Budget Ref. Name</div><div class="ut-summary-value empty" id="ut-card-budget-ref-name">Not set</div></div>
                    <div class="ut-summary-item"><div class="ut-summary-label">Partner Name</div><div class="ut-summary-value empty" id="ut-card-partner-name">Not set</div></div>
                    <div class="ut-summary-item"><div class="ut-summary-label">Grant ID</div><div id="ut-card-grant-pills"><span class="ut-summary-value empty">Not set</span></div></div>
                    <div class="ut-summary-item"><div class="ut-summary-label">State</div><div class="ut-summary-value empty" id="ut-card-state">Not set</div></div>
                    <div class="ut-summary-item"><div class="ut-summary-label">No. of Crèches</div><div class="ut-summary-value empty" id="ut-card-no-of-creches">Not set</div></div>
                    <div class="ut-summary-item"><div class="ut-summary-label">Block</div><div class="ut-summary-value empty" id="ut-card-block">Not set</div></div>
                    <div class="ut-summary-item"><div class="ut-summary-label">District</div><div class="ut-summary-value empty" id="ut-card-district">Not set</div></div>
                    <div class="ut-summary-item"><div class="ut-summary-label">Financial Year</div><div class="ut-summary-value empty" id="ut-card-financial-year">Not set</div></div>
                    <div class="ut-summary-item"><div class="ut-summary-label">Month</div><div class="ut-summary-value empty" id="ut-card-month">Not set</div></div>
                    <div class="ut-summary-item" style="border-right:none;"></div>
                    <div class="ut-summary-item" style="border-right:none;"></div>
                    <div class="ut-summary-item" style="border-right:none;"></div>
                </div>
            </div>

            <!-- Section heading -->
            <div class="ut-section-heading">
                <span class="ut-section-heading-title">Utilisation Items Lines</span>
            </div>

            <!-- Table -->
            <div class="ut-table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Budget Main Head</th>
                            <th>Budget Sub Head</th>
                            <th>Type of Expenses</th>
                        </tr>
                    </thead>
                    <tbody id="ut-tbody">
                        <tr><td colspan="4" class="ut-empty"><div class="ut-empty-icon">&#128203;</div><div>Loading...</div></td></tr>
                    </tbody>
                </table>
            </div>

        </div>

        <!-- Confirmation Modal -->
        <div class="ut-modal-backdrop" id="ut-confirm-backdrop" style="display:none;">
            <div class="ut-modal">
                <div class="ut-modal-header">
                    <div class="ut-modal-header-left">
                        <div class="ut-modal-header-icon">&#128203;</div>
                        <div>
                            <div class="ut-modal-title">Check Basic Details</div>
                            <div class="ut-modal-subtitle">Please verify before generating the template</div>
                        </div>
                    </div>
                    <button class="ut-modal-close" id="ut-modal-close-btn">&#215;</button>
                </div>
                <div class="ut-modal-body">
                    <p class="ut-modal-desc">Review all details carefully. Once you confirm, the utilisation import template will be generated and downloaded.</p>
                    <div class="ut-modal-cards" id="ut-modal-cards"></div>
                    <div class="ut-declaration" id="ut-declaration">
                        <div class="ut-declaration-checkbox">
                            <span class="ut-declaration-checkbox-tick">&#10003;</span>
                        </div>
                        <div class="ut-declaration-text">
                            I hereby declare that <strong>all the details provided above are correct</strong> and I take full responsibility for the accuracy of the information submitted for generating this utilisation import template.
                        </div>
                    </div>
                </div>
                <div class="ut-modal-footer">
                    <button class="ut-btn ut-btn-cancel" id="ut-modal-cancel-btn">Cancel</button>
                    <button class="ut-btn ut-btn-confirm" id="ut-modal-confirm-btn" disabled>&#10003;&nbsp; Confirm &amp; Download</button>
                </div>
            </div>
        </div>
    `);

    // ── on_page_show ──────────────────────────────────────────────────
    frappe.pages['utilisation_import_template'].on_page_show = function() {
        fetch_budget_items();
        load_budgets();
    };

    // ── Helpers ───────────────────────────────────────────────────────
    function make_field(id) { return $(wrapper).find('#' + id)[0]; }

    function set_card(id, value) {
        var $el = $(wrapper).find('#' + id);
        if (value) { $el.text(value).removeClass('empty'); }
        else       { $el.text('Not set').addClass('empty'); }
    }

    function show_alert(msg, indicator) {
        frappe.show_alert({ message: __(msg), indicator: indicator || 'red' }, 5);
    }

    // ── Budget data cache ─────────────────────────────────────────────
    var all_budgets = [];

    function load_budgets() {
        var $sel = $(wrapper).find('#ut-budget-select');
        $sel.empty().append('<option value="">— Loading… —</option>');

        frappe.call({
            method: 'creche_reports.api.common.get_all_budgets',
            callback: function(r) {
                all_budgets = (r.message) || [];
                populate_budget_select();
            },
            error: function(err) {
                console.error('Failed to load budgets', err);
                show_alert('Failed to load budgets. Please refresh.', 'red');
                $(wrapper).find('#ut-budget-select')
                    .empty()
                    .append('<option value="">— Error loading —</option>');
            }
        });
    }

    function populate_budget_select() {
        var $sel = $(wrapper).find('#ut-budget-select');

        if (!$sel.length) {
            setTimeout(populate_budget_select, 100);
            return;
        }

        $sel.empty().append('<option value="">— Select Budget —</option>');

        all_budgets.forEach(function(b) {
            $sel.append(
                $('<option>', {
                    value: b.name,
                    text:  (b.budget_reference_name || b.name).trim()
                })
            );
        });
    }

    function on_budget_change(selected_name) {
        var b = all_budgets.find(function(x){ return x.name === selected_name; });
        if (b) {
            partner_name_filter.set_value(b.partner_name   || '');
            grant_id_filter.set_value(b.grant_id           || '');
            state_filter.set_value(b.state                 || '');
            no_of_creches_filter.set_value(b.no_of_creches || '');
            block_filter.set_value(b.block                 || '');
            district_filter.set_value(b.district           || '');

            set_card('ut-card-budget-ref-name', (b.budget_reference_name || '').trim());
            set_card('ut-card-partner-name',    b.partner_name);
            set_card('ut-card-state',           b.state);
            set_card('ut-card-no-of-creches',   b.no_of_creches);
            set_card('ut-card-block',           b.block);
            set_card('ut-card-district',        b.district);

            var $pills = $(wrapper).find('#ut-card-grant-pills');
            if (b.grant_id) {
                $pills.html('<span class="ut-grant-pill">' + frappe.utils.escape_html(b.grant_id) + '</span>');
            } else {
                $pills.html('<span class="ut-summary-value empty">Not set</span>');
            }
        } else {
            [partner_name_filter, grant_id_filter, state_filter,
             no_of_creches_filter, block_filter, district_filter]
                .forEach(function(f){ f.set_value(''); });
            ['ut-card-budget-ref-name','ut-card-partner-name','ut-card-state',
             'ut-card-no-of-creches','ut-card-block','ut-card-district']
                .forEach(function(id){ set_card(id, ''); });
            $(wrapper).find('#ut-card-grant-pills')
                .html('<span class="ut-summary-value empty">Not set</span>');
        }
    }

    // ── Controls ──────────────────────────────────────────────────────
    function get_budget_value() {
        return $(wrapper).find('#ut-budget-select').val() || '';
    }

    $(wrapper).on('change', '#ut-budget-select', function(){
        on_budget_change($(this).val());
    });

    var partner_name_filter = frappe.ui.form.make_control({
        parent: make_field('ut-partner-name-field'),
        df: { label: 'Partner Name', fieldtype: 'Data', fieldname: 'partner_name', read_only: 1 },
        render_input: true
    });

    var grant_id_filter = frappe.ui.form.make_control({
        parent: make_field('ut-grant-id-field'),
        df: { label: 'Grant ID', fieldtype: 'Data', fieldname: 'grant_id', read_only: 1 },
        render_input: true
    });

    var state_filter = frappe.ui.form.make_control({
        parent: make_field('ut-state-field'),
        df: { label: 'State', fieldtype: 'Data', fieldname: 'state', read_only: 1 },
        render_input: true
    });

    var no_of_creches_filter = frappe.ui.form.make_control({
        parent: make_field('ut-no-of-creches-field'),
        df: { label: 'No. of Crèches', fieldtype: 'Data', fieldname: 'no_of_creches', read_only: 1 },
        render_input: true
    });

    var block_filter = frappe.ui.form.make_control({
        parent: make_field('ut-block-field'),
        df: {
            label: 'Block', fieldtype: 'Link', fieldname: 'block',
            options: 'Block',
            change: function(){ set_card('ut-card-block', block_filter.get_value()); }
        },
        render_input: true
    });

    var district_filter = frappe.ui.form.make_control({
        parent: make_field('ut-district-field'),
        df: {
            label: 'District', fieldtype: 'Link', fieldname: 'district',
            options: 'District',
            change: function(){ set_card('ut-card-district', district_filter.get_value()); }
        },
        render_input: true
    });

    var financial_year_filter = frappe.ui.form.make_control({
        parent: make_field('ut-financial-year-field'),
        df: {
            label: 'Financial Year', fieldtype: 'Link', fieldname: 'financial_year',
            options: 'Financial year',
            change: function(){ set_card('ut-card-financial-year', financial_year_filter.get_value()); }
        },
        render_input: true
    });

    var month_filter = frappe.ui.form.make_control({
        parent: make_field('ut-month-field'),
        df: {
            label: 'Month', fieldtype: 'Select', fieldname: 'month',
            options: ['','January','February','March','April','May','June','July','August','September','October','November','December'].join('\n'),
            change: function(){ set_card('ut-card-month', month_filter.get_value()); }
        },
        render_input: true
    });

    [partner_name_filter, grant_id_filter,
     state_filter, no_of_creches_filter,
     block_filter, district_filter,
     financial_year_filter, month_filter
    ].forEach(function(f){ f.refresh(); });

    load_budgets();
    auto_fill_date_fields();

    // ── Auto-fill Financial Year & Month ──────────────────────────────
    function auto_fill_date_fields() {
        var now   = new Date();
        var month = now.toLocaleString('en-US', { month: 'long' });

        month_filter.set_value(month);
        set_card('ut-card-month', month);

        frappe.call({
            method: 'frappe.client.get_list',
            args: { doctype: 'Financial year', fields: ['name'], limit: 50 },
            callback: function(r) {
                if (!r.message || !r.message.length) return;

                var year = now.getFullYear();
                var fy_start = now.getMonth() >= 3 ? year : year - 1;
                var fy_end_2digit = String(fy_start + 1).slice(-2);

                var match = r.message.find(function(fy) {
                    return fy.name === String(fy_start) + '-' + fy_end_2digit;
                });

                if (!match) {
                    match = r.message.find(function(fy) {
                        return fy.name.indexOf(String(fy_start)) !== -1
                            && fy.name.indexOf(fy_end_2digit) !== -1;
                    });
                }

                if (!match) match = r.message[r.message.length - 1];

                financial_year_filter.set_value(match.name);
                set_card('ut-card-financial-year', match.name);
            }
        });
    }

    // ── Collect values ────────────────────────────────────────────────
    function get_values() {
        var selected_name = get_budget_value();
        var b = all_budgets.find(function(x){ return x.name === selected_name; });
        return {
            budget_reference_id:   b ? (b.budget_reference_id   || b.name || '').trim() : '',
            budget_reference_name: b ? (b.budget_reference_name || '').trim() : '',
            partner_name:          b ? (b.partner_name   || '') : '',
            partner_id:            b ? (b.partner_id     || '') : '',
            grant_id:              b ? (b.grant_id       || '') : '',
            state:                 b ? (b.state          || '') : '',
            no_of_creches:         b ? (b.no_of_creches  || '') : '',
            block:                 block_filter.get_value()    || '',
            district:              district_filter.get_value() || '',
            financial_year:        financial_year_filter.get_value(),
            month:                 month_filter.get_value(),
        };
    }

    // ── Mandatory validation ──────────────────────────────────────────
    function validate_mandatory(values) {
        var checks = [
            { key: 'budget_reference_name', label: 'Budget Reference Name' },
            { key: 'financial_year',        label: 'Financial Year' },
            { key: 'month',                 label: 'Month' },
        ];
        var missing = checks.filter(function(f){ return !values[f.key]; });
        if (missing.length) {
            show_alert('Please fill mandatory fields: ' + missing.map(function(f){ return f.label; }).join(', '), 'red');
            return false;
        }
        return true;
    }

    // ── Confirm modal ─────────────────────────────────────────────────
    function open_confirm_modal(values, on_confirm) {
        var fields = [
            { label: 'Budget Ref. Name', val: values.budget_reference_name },
            { label: 'Partner Name',     val: values.partner_name },
            { label: 'Partner ID',       val: values.partner_id },
            { label: 'Grant ID',         val: values.grant_id },
            { label: 'State',            val: values.state },
            { label: 'Block',            val: values.block },
            { label: 'District',         val: values.district },
            { label: 'No. of Crèches',  val: values.no_of_creches },
            { label: 'Financial Year',   val: values.financial_year },
            { label: 'Month',            val: values.month },
        ];

        $(wrapper).find('#ut-modal-cards').html(fields.map(function(f){
            var d = (f.val !== null && f.val !== undefined && String(f.val).trim() !== '')
                ? String(f.val) : null;
            return '<div class="ut-modal-card">' +
                '<div class="ut-modal-card-label">' + frappe.utils.escape_html(f.label) + '</div>' +
                '<div class="ut-modal-card-value' + (d ? '' : ' empty') + '">' +
                    frappe.utils.escape_html(d || '—') +
                '</div>' +
            '</div>';
        }).join(''));

        var $backdrop = $(wrapper).find('#ut-confirm-backdrop');
        $backdrop.fadeIn(160);

        $(wrapper).find('#ut-declaration').removeClass('checked');
        $(wrapper).find('#ut-modal-confirm-btn').prop('disabled', true);

        $(wrapper).find('#ut-declaration').off('click').on('click', function(){
            var checked = $(this).toggleClass('checked').hasClass('checked');
            $(wrapper).find('#ut-modal-confirm-btn').prop('disabled', !checked);
        });

        function close_modal() { $backdrop.fadeOut(140); }

        $(wrapper).find('#ut-modal-close-btn').off('click').on('click', close_modal);
        $(wrapper).find('#ut-modal-cancel-btn').off('click').on('click', close_modal);
        $backdrop.off('click').on('click', function(e){
            if ($(e.target).is($backdrop)) close_modal();
        });
        $(wrapper).find('#ut-modal-confirm-btn').off('click').on('click', function(){
            close_modal();
            on_confirm();
        });
        $(document).off('keydown.ut-modal').on('keydown.ut-modal', function(e){
            if (e.key === 'Escape') { close_modal(); $(document).off('keydown.ut-modal'); }
        });
    }

    // ── Download ──────────────────────────────────────────────────────
    function do_download(values) {
        var payload = {
            budget_reference_id:   values.budget_reference_id,
            budget_reference_name: values.budget_reference_name,
            partner_name:          values.partner_name,
            partner_id:            values.partner_id,
            grant_id:              values.grant_id,
            state:                 values.state,
            no_of_creches:         parseInt(values.no_of_creches) || 0,
            block:                 values.block,
            district:              values.district,
            financial_year:        values.financial_year,
            month:                 values.month,
        };

        show_alert('Generating template, please wait…', 'blue');

        fetch('/api/method/creche_reports.api.import_template.download_utilisation_template', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Frappe-CSRF-Token': frappe.csrf_token
            },
            body: JSON.stringify({ data: payload })
        })
        .then(function(res){
            if (!res.ok) return res.json().then(function(err){
                show_alert((err && err.exception) ? err.exception : 'Server error.', 'red');
            });
            var ct = res.headers.get('content-type') || '';
            if (!ct.includes('application/json')) {
                return res.blob().then(function(blob){
                    var match = (res.headers.get('content-disposition') || '')
                        .match(/filename[^;=\n]*=(["']?)([^"'\n;]+)\1/);
                    var filename = match ? match[2] : 'utilisation_template.xlsx';
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url; a.download = filename;
                    document.body.appendChild(a); a.click();
                    setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 1000);
                    show_alert('Template downloaded successfully.', 'green');
                });
            }
            return res.json().then(function(d){
                show_alert((d && d.message) ? d.message : 'Template generated.', 'green');
            });
        })
        .catch(function(err){
            console.error(err);
            show_alert('Failed to generate template.', 'red');
        });
    }

    // ── Primary Action ────────────────────────────────────────────────
    page.set_primary_action('Generate Import Template', function() {
        var values = get_values();
        if (!validate_mandatory(values)) return;
        open_confirm_modal(values, function(){ do_download(values); });
    }, 'download');

    // ── Table ─────────────────────────────────────────────────────────
    function fetch_budget_items() {
        var $tbody = $(wrapper).find('#ut-tbody');
        $tbody.html('<tr><td colspan="4" class="ut-empty"><div>Loading...</div></td></tr>');
        fetch('/api/method/creche_reports.api.import_template.get_all_budget_items', {
            method: 'GET',
            headers: {
                'X-Frappe-CSRF-Token': frappe.csrf_token,
                'Content-Type': 'application/json'
            }
        })
        .then(function(res){ return res.json(); })
        .then(function(data){
            var rows = data.message || [];
            if (!rows.length) {
                $tbody.html('<tr><td colspan="4" class="ut-empty"><div class="ut-empty-icon">&#128193;</div><div>No budget items found</div></td></tr>');
                $(wrapper).find('.ut-table-scroll').removeClass('ut-scrollable');
                return;
            }
            $(wrapper).find('.ut-table-scroll').toggleClass('ut-scrollable', rows.length > 10);
            $tbody.html(rows.map(function(row, i){
                return '<tr>' +
                    '<td class="ut-td-num">'  + (i + 1) + '</td>' +
                    '<td class="ut-td-main">' + frappe.utils.escape_html(row.budget_main_head || '—') + '</td>' +
                    '<td class="ut-td-sub">'  + frappe.utils.escape_html(row.budget_sub_head  || '—') + '</td>' +
                    '<td class="ut-td-type">' + frappe.utils.escape_html(row.type_of_expenses || '—') + '</td>' +
                '</tr>';
            }).join(''));
        })
        .catch(function(err){
            $tbody.html('<tr><td colspan="4" class="ut-empty"><div class="ut-empty-icon">&#9888;</div><div>Failed to load.</div></td></tr>');
            show_alert('Failed to load budget items.', 'red');
            console.error(err);
        });
    }

    fetch_budget_items();
};
// // // frappe.pages['creche_budget_utilisation_summary'].on_page_load = function(wrapper) {
// // // 	var page = frappe.ui.make_app_page({
// // // 		parent: wrapper,
// // // 		title: 'Creche Budget & Utilisation Summary',
// // // 		single_column: true
// // // 	});
// // // }


// frappe.pages['creche_budget_utilisation_summary'].on_page_load = function (wrapper) {
// 	const page = frappe.ui.make_app_page({
// 		parent: wrapper,
// 		title: 'Creche Budget & Utilisation Summary',
// 		single_column: true
// 	});
// 	new CrecheBudgetDashboard(page);
// };

// class CrecheBudgetDashboard {

// 	constructor(page) {
// 		this.page = page;
// 		this.panel = null;
// 		this._perm_scope = null;
// 		this.make();
// 		this._init_with_permissions();
// 	}

// 	// ─────────────────────────────────────────────
// 	// SCAFFOLD
// 	// ─────────────────────────────────────────────

// 	make() {
// 		this.page.main.html(`
// 			<div class="cbd-root">
// 				<div class="cbd-overview-strip" id="cbd_overview_strip" style="display:none"></div>
// 				<div class="cbd-summary-cards" id="cbd_summary_cards"></div>
// 				<div class="cbd-section-label">Partners &amp; Grants</div>
// 				<div id="cbd_partners"></div>
// 			</div>
// 		`);

// 		// Apply + Clear in the Frappe page title bar (top right)
// 		this.page.set_secondary_action('Clear all', () => this._clear_filters(), 'close');
// 		this.page.set_primary_action('Apply', () => this.load_data(this._get_effective_filters()), 'filter');

// 		this._inject_styles();
// 		this._ensure_panels();
// 		this._build_filters();
// 	}

// 	// ─────────────────────────────────────────────
// 	// PERMISSION-AWARE INITIAL LOAD
// 	// ─────────────────────────────────────────────

// 	_init_with_permissions() {
// 		// Fetch all partners this user can see.
// 		// frappe.db.get_list automatically respects Frappe User Permissions —
// 		// a restricted user will only get their assigned partners back.
// 		frappe.dom.freeze('Loading…');

// 		frappe.call({
// 			method: 'creche_reports.api.budget_utilisation_summary.get_partner_options',
// 			args: { txt: '' },
// 		}).then(r => {
// 			frappe.dom.unfreeze();
// 			const rows = r.message || [];

// 			if (!rows.length) {
// 				this._render_no_access();
// 				return;
// 			}

// 			// Build ID→name map so we can load data with IDs
// 			const partner_ids = rows.map(r => r.name);

// 			// Build name→ID map so _get_filter_values resolves labels back to IDs
// 			this._partner_label_to_id = {};
// 			rows.forEach(r => {
// 				this._partner_label_to_id[r.partner_name || r.name] = r.name;
// 			});

// 			const f = this._fields && this._fields.partner_id;
// 			if (f) {
// 				// Use partner_name as value so pills show name not ID
// 				const opts = rows.map(r => ({
// 					value:       r.partner_name || r.name,
// 					description: '',
// 				}));
// 				const orig = f.df.get_data;
// 				f.df.get_data = () => opts;
// 				try { f.set_value(opts.map(o => o.value)); } catch(e) {}
// 				f.df.get_data = orig;
// 			}

// 			// Load data with the actual record IDs
// 			this.load_data({ partner_id: partner_ids });

// 		}).catch(() => {
// 			frappe.dom.unfreeze();
// 			// Fallback: load with no filter (server still enforces permissions)
// 			this.load_data({});
// 		});
// 	}

// 	_render_no_access() {
// 		const sc = document.getElementById('cbd_summary_cards');
// 		const pa = document.getElementById('cbd_partners');
// 		const ov = document.getElementById('cbd_overview_strip');
// 		if (sc) sc.innerHTML = '';
// 		if (ov) ov.style.display = 'none';
// 		if (pa) pa.innerHTML = `
// 			<div class="cbd-empty" style="padding:40px;text-align:center">
// 				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d8dd"
// 					stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
// 					style="margin-bottom:12px">
// 					<circle cx="12" cy="12" r="10"/>
// 					<line x1="12" y1="8" x2="12" y2="12"/>
// 					<line x1="12" y1="16" x2="12.01" y2="16"/>
// 				</svg>
// 				<div style="font-size:14px;font-weight:600;color:#6b7280">No access</div>
// 				<div style="font-size:12px;color:#9ca3af;margin-top:4px">
// 					You do not have any partner assigned. Contact your administrator.
// 				</div>
// 			</div>`;
// 	}

// 	// _get_effective_filters — now just an alias for _get_filter_values
// 	// The partner field is pre-populated on load with all visible partners,
// 	// so _get_filter_values already contains the correct scope.
// 	_get_effective_filters() {
// 		return this._get_filter_values();
// 	}


// 	// ─────────────────────────────────────────────
// 	// FILTERS  — exact same pattern as reference code
// 	// ─────────────────────────────────────────────

// 	_build_filters() {
// 		const $root = $(this.page.main).find('.cbd-root');

// 		// Row 1
// 		const $row1 = $(`<div class="frappe-control-group row custom-filter-row" id="cbd_frow1"></div>`).prependTo($root);
// 		// Row 2
// 		const $row2 = $(`<div class="frappe-control-group row custom-filter-row" id="cbd_frow2"></div>`).insertAfter($row1);
// 		this._fields = {};
// 		this._sel    = {};

// 		// Make a col helper — equal 20% width per col (5 per row)
// 		const col = ($row, key) => {
// 			const $c = $(`<div class="cbd-filter-col col-sm-12" id="cbd_fcol_${key}"></div>`).appendTo($row);
// 			return $c;
// 		};

// 		// ── ROW 1 ─────────────────────────────────────────────────
// 		// Partner — MultiSelectList, options loaded async
// 		const partner_ctrl = frappe.ui.form.make_control({
// 			parent: col($row1, 'partner_id'),
// 			df: {
// 				label: 'Partner', fieldtype: 'MultiSelectList', fieldname: 'partner_id',
// 				get_data: (txt) => {
// 					return frappe.call({
// 						method: 'creche_reports.api.budget_utilisation_summary.get_partner_options',
// 						args: { txt: txt || '' },
// 					}).then(r => {
// 						const rows = r.message || [];
// 						// Build name↔label map for _get_filter_values to resolve IDs
// 						this._partner_label_to_id = this._partner_label_to_id || {};
// 						rows.forEach(p => {
// 							this._partner_label_to_id[p.partner_name || p.name] = p.name;
// 						});
// 						// value = partner_name (shown as main text in pill & dropdown)
// 						// description = '' (no subtitle — ID is hidden)
// 						return rows.map(p => ({
// 							value:       p.partner_name || p.name,
// 							description: '',
// 						}));
// 					});
// 				},
// 				change: () => {
// 					// Reset + refresh dependent fields so get_data re-runs with new partner scope
// 					['budget_ref', 'grant_id', 'state', 'district', 'block'].forEach(k => {
// 						const f = this._fields[k];
// 						if (!f) return;
// 						f.set_value([]);
// 						f.refresh();
// 					});
// 					this._sel.partner_id = partner_ctrl.get_value() || [];
// 					this._on_filter_change('partner_id');
// 				},
// 			},
// 			render_input: true,
// 		});
// 		partner_ctrl.refresh();
// 		this._fields.partner_id = partner_ctrl;

// 		// Budget Reference — MultiSelectList, filtered by partner
// 		const budget_ref_ctrl = frappe.ui.form.make_control({
// 			parent: col($row1, 'budget_ref'),
// 			df: {
// 				label: 'Budget Reference', fieldtype: 'MultiSelectList', fieldname: 'budget_ref',
// 				get_data: (txt) => {
// 					// Partner field stores partner_name as value — resolve back to IDs
// 					const raw_partners = (this._fields.partner_id?.get_value() || []);
// 					const partners = raw_partners.map(label =>
// 						(this._partner_label_to_id && this._partner_label_to_id[label]) || label
// 					);
// 					const filters = {};
// 					if (partners.length) filters.partner_id = ['in', partners];
// 					if (txt) filters.budget_reference_name = ['like', `%${txt}%`];
// 					return frappe.db.get_list('Creche Budget', { filters, fields: ['budget_reference_name'], limit: 50 })
// 						.then(rows => [...new Set(rows.map(r => r.budget_reference_name).filter(Boolean))]
// 							.map(v => ({ value: v, description: '' })));
// 				},
// 				change: () => { this._sel.budget_ref = budget_ref_ctrl.get_value() || []; },
// 			},
// 			render_input: true,
// 		});
// 		budget_ref_ctrl.refresh();
// 		this._fields.budget_ref = budget_ref_ctrl;

// 		// Grant ID — MultiSelectList, filtered by partner
// 		const grant_id_ctrl = frappe.ui.form.make_control({
// 			parent: col($row1, 'grant_id'),
// 			df: {
// 				label: 'Grant ID', fieldtype: 'MultiSelectList', fieldname: 'grant_id',
// 				get_data: (txt) => {
// 					// Partner field stores partner_name as value — resolve back to IDs
// 					const raw_partners = (this._fields.partner_id?.get_value() || []);
// 					const partners = raw_partners.map(label =>
// 						(this._partner_label_to_id && this._partner_label_to_id[label]) || label
// 					);
// 					const filters = {};
// 					if (partners.length) filters.partner_id = ['in', partners];
// 					if (txt) filters.grant_id = ['like', `%${txt}%`];
// 					return frappe.db.get_list('Creche Budget', { filters, fields: ['grant_id'], limit: 50 })
// 						.then(rows => [...new Set(rows.map(r => r.grant_id).filter(Boolean))]
// 							.map(v => ({ value: v, description: '' })));
// 				},
// 				change: () => { this._sel.grant_id = grant_id_ctrl.get_value() || []; },
// 			},
// 			render_input: true,
// 		});
// 		grant_id_ctrl.refresh();
// 		this._fields.grant_id = grant_id_ctrl;

// 		// Financial Year — MultiSelectList from Financial year doctype
// 		const fy_ctrl = frappe.ui.form.make_control({
// 			parent: col($row1, 'financial_year'),
// 			df: {
// 				label: 'Financial Year', fieldtype: 'MultiSelectList', fieldname: 'financial_year',
// 				get_data: (txt) => {
// 					return frappe.db.get_list('Financial year', {
// 						fields: ['name'], limit: 50, order_by: 'name desc',
// 						...(txt ? { filters: { name: ['like', `%${txt}%`] } } : {}),
// 					}).then(rows => rows.map(r => ({ value: r.name, description: '' })));
// 				},
// 				change: () => {
// 					this._sel.financial_year = fy_ctrl.get_value() || [];
// 					this._on_filter_change('financial_year');
// 				},
// 			},
// 			render_input: true,
// 		});
// 		fy_ctrl.refresh();
// 		this._fields.financial_year = fy_ctrl;

// 		// Month — MultiSelectList from Months doctype
// 		const month_ctrl = frappe.ui.form.make_control({
// 			parent: col($row1, 'month'),
// 			df: {
// 				label: 'Month', fieldtype: 'MultiSelectList', fieldname: 'month',
// 				get_data: (txt) => {
// 					const ORDER = ['January','February','March','April','May','June',
// 						'July','August','September','October','November','December'];
// 					return frappe.db.get_list('Months', { fields: ['name'], limit: 12 })
// 						.then(rows => rows
// 							.filter(r => !txt || r.name.toLowerCase().includes(txt.toLowerCase()))
// 							.sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name))
// 							.map(r => ({ value: r.name, description: '' })));
// 				},
// 				change: () => {
// 					this._sel.month = month_ctrl.get_value() || [];
// 					this._on_filter_change('month');
// 				},
// 			},
// 			render_input: true,
// 		});
// 		month_ctrl.refresh();
// 		this._fields.month = month_ctrl;

// 		// ── ROW 2 ─────────────────────────────────────────────────
// 		// Start Date
// 		const start_ctrl = frappe.ui.form.make_control({
// 			parent: col($row2, 'start_date'),
// 			df: {
// 				label: 'Start Date', fieldtype: 'Date', fieldname: 'start_date',
// 				change: () => {
// 					this._sel.start_date = start_ctrl.get_value() || '';
// 					this._on_filter_change('start_date');
// 				},
// 			},
// 			render_input: true,
// 		});
// 		start_ctrl.refresh();
// 		this._fields.start_date = start_ctrl;

// 		// End Date
// 		const end_ctrl = frappe.ui.form.make_control({
// 			parent: col($row2, 'end_date'),
// 			df: {
// 				label: 'End Date', fieldtype: 'Date', fieldname: 'end_date',
// 				change: () => {
// 					this._sel.end_date = end_ctrl.get_value() || '';
// 					this._on_filter_change('end_date');
// 				},
// 			},
// 			render_input: true,
// 		});
// 		end_ctrl.refresh();
// 		this._fields.end_date = end_ctrl;

// 		// State — MultiSelectList from Creche Budget
// 		const state_ctrl = frappe.ui.form.make_control({
// 			parent: col($row2, 'state'),
// 			df: {
// 				label: 'State', fieldtype: 'MultiSelectList', fieldname: 'state',
// 				get_data: (txt) => {
// 					// Partner field stores partner_name as value — resolve back to IDs
// 					const raw_partners = (this._fields.partner_id?.get_value() || []);
// 					const partners = raw_partners.map(label =>
// 						(this._partner_label_to_id && this._partner_label_to_id[label]) || label
// 					);
// 					const filters = {};
// 					if (partners.length) filters.partner_id = ['in', partners];
// 					if (txt) filters.state = ['like', `%${txt}%`];
// 					return frappe.db.get_list('Creche Budget', { filters, fields: ['state'], limit: 100 })
// 						.then(rows => [...new Set(rows.map(r => r.state).filter(Boolean))].sort()
// 							.map(v => ({ value: v, description: '' })));
// 				},
// 				change: () => { this._sel.state = state_ctrl.get_value() || []; },
// 			},
// 			render_input: true,
// 		});
// 		state_ctrl.refresh();
// 		this._fields.state = state_ctrl;

// 		// District — MultiSelectList from Creche Budget
// 		const district_ctrl = frappe.ui.form.make_control({
// 			parent: col($row2, 'district'),
// 			df: {
// 				label: 'District', fieldtype: 'MultiSelectList', fieldname: 'district',
// 				get_data: (txt) => {
// 					// Partner field stores partner_name as value — resolve back to IDs
// 					const raw_partners = (this._fields.partner_id?.get_value() || []);
// 					const partners = raw_partners.map(label =>
// 						(this._partner_label_to_id && this._partner_label_to_id[label]) || label
// 					);
// 					const filters = {};
// 					if (partners.length) filters.partner_id = ['in', partners];
// 					if (txt) filters.district = ['like', `%${txt}%`];
// 					return frappe.db.get_list('Creche Budget', { filters, fields: ['district'], limit: 100 })
// 						.then(rows => [...new Set(rows.map(r => r.district).filter(Boolean))].sort()
// 							.map(v => ({ value: v, description: '' })));
// 				},
// 				change: () => { this._sel.district = district_ctrl.get_value() || []; },
// 			},
// 			render_input: true,
// 		});
// 		district_ctrl.refresh();
// 		this._fields.district = district_ctrl;

// 		// Block — MultiSelectList from Creche Budget
// 		const block_ctrl = frappe.ui.form.make_control({
// 			parent: col($row2, 'block'),
// 			df: {
// 				label: 'Block', fieldtype: 'MultiSelectList', fieldname: 'block',
// 				get_data: (txt) => {
// 					// Partner field stores partner_name as value — resolve back to IDs
// 					const raw_partners = (this._fields.partner_id?.get_value() || []);
// 					const partners = raw_partners.map(label =>
// 						(this._partner_label_to_id && this._partner_label_to_id[label]) || label
// 					);
// 					const filters = {};
// 					if (partners.length) filters.partner_id = ['in', partners];
// 					if (txt) filters.block = ['like', `%${txt}%`];
// 					return frappe.db.get_list('Creche Budget', { filters, fields: ['block'], limit: 100 })
// 						.then(rows => [...new Set(rows.map(r => r.block).filter(Boolean))].sort()
// 							.map(v => ({ value: v, description: '' })));
// 				},
// 				change: () => { this._sel.block = block_ctrl.get_value() || []; },
// 			},
// 			render_input: true,
// 		});
// 		block_ctrl.refresh();
// 		this._fields.block = block_ctrl;

// 	}


// 	_ensure_panels() {
// 		if (document.getElementById('cbd_overlay')) return;
// 		const overlay = document.createElement('div');
// 		overlay.className = 'cbd-overlay';
// 		overlay.id = 'cbd_overlay';
// 		const left = document.createElement('div');
// 		left.className = 'cbd-panel-left';
// 		left.id = 'cbd_panel_left';
// 		const right = document.createElement('div');
// 		right.className = 'cbd-panel-right';
// 		right.id = 'cbd_panel_right';
// 		// Centre close button — visible only when both panels are open
// 		const centre = document.createElement('button');
// 		centre.id = 'cbd_centre_close';
// 		centre.className = 'cbd-centre-close';
// 		centre.title = 'Close both panels';
// 		centre.innerHTML = `
// 			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
// 				stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
// 				<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
// 			</svg>
// 			<span>Close both</span>`;
// 		document.body.appendChild(overlay);
// 		document.body.appendChild(left);
// 		document.body.appendChild(right);
// 		document.body.appendChild(centre);
// 		overlay.addEventListener('click', () => this._close_panels());
// 		centre.addEventListener('click', () => this._close_panels());

// 		// Global delegated handler for all expand-all checkboxes in any panel
// 		[left, right].forEach(panel => {
// 			panel.addEventListener('change', e => {
// 				const chk = e.target.closest('.cbd-expand-all');
// 				if (!chk) return;
// 				const expand = chk.checked;
// 				// Find the .cbd-panel__body sibling
// 				const body = panel.querySelector('.cbd-panel__body');
// 				if (!body) return;
// 				body.querySelectorAll('.cbd-item-group__body').forEach(b => {
// 					b.classList.toggle('cbd-item-group__body--collapsed', !expand);
// 				});
// 				body.querySelectorAll('.cbd-igh-chevron').forEach(chv => {
// 					chv.style.transform = expand ? '' : 'rotate(-90deg)';
// 				});
// 			});
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// FILTER HELPERS
// 	// ─────────────────────────────────────────────

// 	_get_val(key) {
// 		const f = this._fields && this._fields[key];
// 		if (!f) return [];
// 		const v = f.get_value();
// 		if (!v) return [];
// 		if (Array.isArray(v)) return v.filter(Boolean);
// 		return [v];
// 	}

// 	_get_filter_values() {
// 		const v = {};
// 		['partner_id','budget_ref','grant_id','financial_year','month','state','district','block'].forEach(k => {
// 			let arr = this._get_val(k);
// 			if (arr.length) {
// 				// Partner field stores partner_name as value — resolve back to record ID
// 				if (k === 'partner_id' && this._partner_label_to_id) {
// 					arr = arr.map(label => this._partner_label_to_id[label] || label);
// 				}
// 				v[k] = arr;
// 			}
// 		});
// 		['start_date','end_date'].forEach(k => {
// 			const f = this._fields && this._fields[k];
// 			const val = f ? f.get_value() : '';
// 			if (val) v[k] = val;
// 		});
// 		return v;
// 	}

// 	_on_filter_change(key) {
// 		const has_date = !!(this._fields.start_date?.get_value() || this._fields.end_date?.get_value());
// 		const has_mfy  = !!(this._get_val('month').length || this._get_val('financial_year').length);

// 		if ((key === 'start_date' || key === 'end_date') && has_date) {
// 			['month','financial_year'].forEach(k => {
// 				this._fields[k]?.set_value([]);
// 				const col = document.getElementById('cbd_fcol_' + k);
// 				if (col) col.style.display = 'none';
// 			});
// 		} else if ((key === 'month' || key === 'financial_year') && has_mfy) {
// 			['start_date','end_date'].forEach(k => {
// 				this._fields[k]?.set_value('');
// 				const col = document.getElementById('cbd_fcol_' + k);
// 				if (col) col.style.display = 'none';
// 			});
// 		} else if (!has_date && !has_mfy) {
// 			['month','financial_year','start_date','end_date'].forEach(k => {
// 				const col = document.getElementById('cbd_fcol_' + k);
// 				if (col) col.style.display = '';
// 			});
// 		}
// 	}

// 	_clear_filters() {
// 		Object.entries(this._fields || {}).forEach(([k, f]) => {
// 			try {
// 				f.set_value(f.df.fieldtype === 'Date' ? '' : []);
// 			} catch(e) {}
// 		});
// 		['month','financial_year','start_date','end_date'].forEach(k => {
// 			const col = document.getElementById('cbd_fcol_' + k);
// 			if (col) col.style.display = '';
// 		});
// 		this.load_data({});
// 	}

// 	// ─────────────────────────────────────────────
// 	// DATA
// 	// ─────────────────────────────────────────────

// 	load_data(filters) {
// 		frappe.call({
// 			method: 'creche_reports.api.budget_utilisation_summary.get_partner_budget_summary',
// 			freeze: true,
// 			freeze_message: 'Loading budget summary…',
// 			args: { filters: filters || {} },
// 			callback: (r) => {
// 				if (!r.message) return;
// 				this.render_summary(r.message.summary);
// 				this.render_partners(r.message.partners);
// 			}
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// SUMMARY CARDS
// 	// ─────────────────────────────────────────────

// 	render_summary(s) {
// 		if (!s) return;
// 		const el = document.getElementById('cbd_summary_cards');
// 		if (!el) return;

// 		const cards = [
// 			{
// 				label:  'Total Budget',
// 				value:  this._fmt(s.total_budget),
// 				sub:    'Approved budget',
// 				accent: 'blue',
// 				panel:  'budget',
// 				drill:  'View budget items →',
// 				icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
// 			},
// 			{
// 				label:  'Total Utilisation',
// 				value:  this._fmt(s.total_utilisation),
// 				sub:    'Reported utilisation',
// 				accent: 'green',
// 				panel:  'utilisation',
// 				drill:  'View utilisation →',
// 				icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#639922" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
// 			},
// 			{
// 				label:  'Total Disbursement',
// 				value:  this._fmt(s.total_disbursement),
// 				sub:    'Released amount',
// 				accent: 'purple',
// 				panel:  'both',
// 				drill:  'View line items →',
// 				icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/><polyline points="7 17 12 22 17 17"/></svg>`,
// 			},
// 			{
// 				label:  'Total Creches',
// 				value:  (s.total_creches || 0).toLocaleString('en-IN'),
// 				sub:    'Operational creches',
// 				accent: 'amber',
// 				panel:  'both',
// 				drill:  'View details →',
// 				icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#BA7517" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
// 			},
// 		];

// 		el.innerHTML = cards.map(c => `
// 			<div class="cbd-scard cbd-scard--${c.accent}"
// 				data-panel="${c.panel}"
// 				style="cursor:pointer"
// 				title="${c.drill}">
// 				<div class="cbd-scard__top">
// 					<span class="cbd-scard__label">${c.label}</span>
// 					<span class="cbd-scard__svg">${c.icon}</span>
// 				</div>
// 				<div class="cbd-scard__value">${c.value}</div>
// 				<div class="cbd-scard__sub">
// 					${c.sub}
// 					<span class="cbd-scard__drill">${c.drill}</span>
// 				</div>
// 			</div>
// 		`).join('');

// 		// Per-card click — open only the relevant panel(s)
// 		el.querySelectorAll('.cbd-scard').forEach(card => {
// 			card.addEventListener('click', () => {
// 				const panel = card.dataset.panel;
// 				this._open_overall_panels(panel);
// 			});
// 		});
// 	}

// 	// panel: "budget" | "utilisation" | "both"
// 	_open_overall_panels(panel = 'both') {
// 		if (!this._all_partners || !this._all_partners.length) {
// 			frappe.msgprint('No data loaded yet.');
// 			return;
// 		}
// 		const all_budget_ids = this._all_partners
// 			.flatMap(p => (p.budgets || []).map(b => b.budget_id)).filter(Boolean);
// 		const all_starts = this._all_partners
// 			.flatMap(p => (p.budgets || []).map(b => b.grant_start)).filter(Boolean).sort();
// 		const all_ends = this._all_partners
// 			.flatMap(p => (p.budgets || []).map(b => b.grant_end)).filter(Boolean).sort().reverse();

// 		if (!all_budget_ids.length) { frappe.msgprint('No budgets found.'); return; }

// 		// Title suffix per panel type
// 		const titles = {
// 			budget:      'Overall — Budget Line Items',
// 			utilisation: 'Overall — Utilisation Line Items',
// 			both:        'Overall Summary',
// 		};

// 		this._open_consolidated_panels_typed(
// 			all_budget_ids,
// 			titles[panel] || 'Overall Summary',
// 			all_starts[0] || '',
// 			all_ends[0]   || '',
// 			panel
// 		);
// 	}

// 	// Like _open_consolidated_panels but can show only left, right, or both
// 	_open_consolidated_panels_typed(budget_ids, title, grant_start, grant_end, panel) {
// 		const overlay = document.getElementById('cbd_overlay');
// 		const left    = document.getElementById('cbd_panel_left');
// 		const right   = document.getElementById('cbd_panel_right');

// 		overlay.classList.add('cbd-overlay--active');
// 		document.body.classList.add('cbd-panels-open');
// 		const sidebar = document.querySelector('.layout-side-section, .desk-sidebar, #sidebar-menu');
// 		if (sidebar) { sidebar.dataset.cbdPrevZ = sidebar.style.zIndex || ''; sidebar.style.zIndex = '1'; }

// 		const badge = `<span class="cbd-panel__consolidated-badge">Overall</span>`;
// 		const sub   = `${budget_ids.length} budget${budget_ids.length > 1 ? 's' : ''} · All Partners`;

// 		const left_html = `
// 			<div class="cbd-panel__header">
// 				<div>
// 					<div class="cbd-panel__title">${badge} Budget Line Items</div>
// 					<div class="cbd-panel__sub">${frappe.utils.escape_html(sub)}</div>
// 				</div>
// 				<div class="cbd-panel__header-actions">
					
// 					<label class="cbd-expand-all-label" title="Expand / collapse all groups">
// 						<input type="checkbox" class="cbd-expand-chk cbd-expand-all">
// 						Expand all
// 					</label>
// 					<button class="cbd-panel__close" id="cbd_close_panels">&#10005;</button>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__body" id="cbd_left_body">
// 				<div class="cbd-panel-loading">Loading…</div>
// 			</div>
// 			<div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none">
// 				<span>Grand Total</span><span id="cbd_left_total_val">—</span>
// 			</div>`;

// 		const right_html = `
// 			<div class="cbd-panel__header">
// 				<div>
// 					<div class="cbd-panel__title">${badge} Utilisation Line Items</div>
// 					<div class="cbd-panel__sub">${frappe.utils.escape_html(sub)}</div>
// 				</div>
// 				<div class="cbd-panel__header-actions">
					
// 					<label class="cbd-expand-all-label" title="Expand / collapse all groups">
// 						<input type="checkbox" class="cbd-expand-chk cbd-expand-all">
// 						Expand all
// 					</label>
// 					<button class="cbd-panel__close" id="cbd_close_panels2">&#10005;</button>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__filter" id="cbd_month_filter_wrap">
// 				<div class="cbd-filter-row">
// 					<div class="cbd-filter-col"><div class="cbd-filter-label">Financial Year</div><div id="cbd_fy_multiselect"></div></div>
// 					<div class="cbd-filter-col"><div class="cbd-filter-label">Month</div><div id="cbd_month_multiselect"></div></div>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__body" id="cbd_right_body">
// 				<div class="cbd-panel-loading">Loading…</div>
// 			</div>
// 			<div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none">
// 				<span id="cbd_right_total_lbl">Total</span>
// 				<span id="cbd_right_total_val">—</span>
// 			</div>`;

// 		if (panel === 'budget') {
// 			left.classList.add('cbd-panel--open', 'cbd-panel--full');
// 			right.classList.remove('cbd-panel--open');
// 			left.innerHTML = left_html;
// 		} else if (panel === 'utilisation') {
// 			right.classList.add('cbd-panel--open', 'cbd-panel--full');
// 			left.classList.remove('cbd-panel--open');
// 			right.innerHTML = right_html;
// 		} else {
// 			left.classList.add('cbd-panel--open');
// 			right.classList.add('cbd-panel--open');
// 			left.innerHTML  = left_html;
// 			right.innerHTML = right_html;
// 			// Show centre close only when both panels are open
// 			const _cc = document.getElementById('cbd_centre_close');
// 			if (_cc) _cc.classList.add('cbd-centre-close--visible');
// 		}

// 		// Wire close buttons
// 		const wire = (id, fn) => { const b = document.getElementById(id); if (b) b.addEventListener('click', fn); };
// 		wire('cbd_close_panels',    () => this._close_left());
// 		wire('cbd_close_panels2',   () => this._close_right());


// 		// Load data into whichever panels are open
// 		if (panel === 'budget' || panel === 'both') {
// 			this._load_consolidated_budget_items(budget_ids);
// 		}
// 		if (panel === 'utilisation' || panel === 'both') {
// 			this._load_consolidated_utilisation_items(budget_ids, grant_start, grant_end);
// 		}
// 	}

// 	// ─────────────────────────────────────────────
// 	// OVERVIEW STRIP
// 	// ─────────────────────────────────────────────

// 	_render_overview_strip(partners) {
// 		const el = document.getElementById('cbd_overview_strip');
// 		if (!el) return;
// 		if (!partners.length) { el.style.display = 'none'; return; }

// 		const num_partners  = partners.length;
// 		const num_budgets   = partners.reduce((s, p) => s + (p.budgets || []).length, 0);
// 		const all_states    = [...new Set(partners.flatMap(p => (p.budgets || []).map(b => b.state).filter(Boolean)))];
// 		const all_districts = [...new Set(partners.flatMap(p =>
// 			(p.budgets || []).flatMap(b => b.district ? [b.district] : [])))];
// 		const all_blocks    = [...new Set(partners.flatMap(p =>
// 			(p.budgets || []).flatMap(b => b.block ? [b.block] : [])))];

// 		const stats = [
// 			{
// 				value: num_partners,
// 				label: 'Partner' + (num_partners !== 1 ? 's' : ''),
// 				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
// 			},
// 			{
// 				value: num_budgets,
// 				label: 'Allocated Budget' + (num_budgets !== 1 ? 's' : ''),
// 				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
// 			},
// 			{
// 				value: all_states.length,
// 				label: 'Working State' + (all_states.length !== 1 ? 's' : ''),
// 				tip:   all_states.join(', ') || '—',
// 				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
// 			},
// 			{
// 				value: all_districts.length,
// 				label: 'District' + (all_districts.length !== 1 ? 's' : ''),
// 				tip:   all_districts.join(', ') || '—',
// 				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
// 			},
// 			{
// 				value: all_blocks.length,
// 				label: 'Block' + (all_blocks.length !== 1 ? 's' : ''),
// 				tip:   all_blocks.join(', ') || '—',
// 				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
// 			},
// 		];

// 		el.style.display = '';
// 		el.innerHTML = stats.map(s => `
// 			<div class="cbd-ostat" ${s.tip ? `title="${frappe.utils.escape_html(s.tip)}"` : ''}>
// 				<span class="cbd-ostat__icon">${s.icon}</span>
// 				<div class="cbd-ostat__body">
// 					<div class="cbd-ostat__value">${s.value}</div>
// 					<div class="cbd-ostat__label">${s.label}</div>
// 				</div>
// 			</div>
// 		`).join('');
// 	}

// 	// ─────────────────────────────────────────────
// 	// PARTNER ACCORDIONS
// 	// ─────────────────────────────────────────────

// 	render_partners(partners) {
// 		this._all_partners = partners || [];  // cache for _open_overall_panels
// 		this._render_overview_strip(partners || []);
// 		const el = document.getElementById('cbd_partners');
// 		if (!partners || !partners.length) {
// 			el.innerHTML = '<div class="cbd-empty">No partner data available.</div>';
// 			return;
// 		}
// 		el.innerHTML = '';

// 		partners.forEach((partner, idx) => {
// 			const u_pct     = parseFloat(partner.utilised_pct) || 0;
// 			const badge_cls = this._badge_cls(u_pct);
// 			const fill_cls  = this._fill_cls(u_pct);

// 			const total_creches = (partner.budgets || []).reduce((s, b) => s + (parseInt(b.no_of_creches) || 0), 0);
// 			const states = [...new Set((partner.budgets || []).map(b => b.state).filter(Boolean))].sort();
// 			const refs   = [...new Set((partner.budgets || []).map(b => b.budget_reference_name).filter(Boolean))].sort();

// 			const state_tags = states.length
// 				? states.map(s => `<span class="cbd-stag cbd-stag--blue"><span class="cbd-stag__dot cbd-stag__dot--blue"></span>${frappe.utils.escape_html(s)}</span>`).join('')
// 				: '<span class="cbd-stag cbd-stag--gray">—</span>';

// 			const ref_tags = refs.length
// 				? refs.map(r => `<span class="cbd-stag cbd-stag--purple"><span class="cbd-stag__dot cbd-stag__dot--purple"></span>${frappe.utils.escape_html(r)}</span>`).join('')
// 				: '<span class="cbd-stag cbd-stag--gray">—</span>';

// 			const card = document.createElement('div');
// 			card.className = 'cbd-partner';
// 			card.innerHTML = `
// 				<div class="cbd-partner__head" id="cbd_ph_${idx}">
// 					<div class="cbd-partner__left">
// 						<div class="cbd-partner__name">
// 							${this._icon_partner()}
// 							${frappe.utils.escape_html(partner.partner_name || '—')}
// 						</div>
// 						<div class="cbd-partner__grants">Grants: ${frappe.utils.escape_html(partner.grant_ids || '—')}</div>
// 						<div class="cbd-partner__metrics">
// 							${this._metric('Budget',        this._fmt(partner.total_budget))}
// 							${this._metric('Disbursed',     this._fmt(partner.total_disbursement))}
// 							${this._metric('Utilised',      this._fmt(partner.total_utilisation))}
// 							${this._metric('Bal. Budget',   this._fmt(partner.total_balance_budget))}
// 							${this._metric('Bank Bal.',     this._fmt(partner.total_bank_balance))}
// 							${this._metric('Interest',      this._fmt(partner.total_interest))}
// 							${this._metric('Total Creches', total_creches)}
// 						</div>
// 						<div class="cbd-partner__footer">
// 							<div class="cbd-footer-block">
// 								<div class="cbd-footer-block__label">
// 									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
// 									Operating States
// 								</div>
// 								<div class="cbd-footer-block__tags">${state_tags}</div>
// 							</div>
// 							<div class="cbd-footer-block">
// 								<div class="cbd-footer-block__label">
// 									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
// 									Budget References
// 								</div>
// 								<div class="cbd-footer-block__tags">${ref_tags}</div>
// 							</div>
// 						</div>
// 						<div class="cbd-prog" style="margin-top:7px">
// 							<div class="cbd-prog__fill cbd-prog__fill--${fill_cls}" style="width:${Math.min(u_pct,100)}%"></div>
// 						</div>
// 					</div>
// 					<div class="cbd-partner__right">
// 						<div class="cbd-badge cbd-badge--${badge_cls}">${u_pct.toFixed(1)}% utilised</div>
// 						<button class="cbd-consolidated-btn"
// 							data-partner-name="${frappe.utils.escape_html(partner.partner_name || '')}"
// 							data-budget-ids="${frappe.utils.escape_html((partner.budgets || []).map(b => b.budget_id).join(','))}"
// 							data-grant-start="${frappe.utils.escape_html((partner.budgets || []).map(b => b.grant_start).filter(Boolean).sort()[0] || '')}"
// 							data-grant-end="${frappe.utils.escape_html((partner.budgets || []).map(b => b.grant_end).filter(Boolean).sort().reverse()[0] || '')}">
// 							<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
// 							Consolidated
// 						</button>
// 						<div class="cbd-chevron" id="cbd_chv_${idx}">&#9654;</div>
// 					</div>
// 				</div>
// 				<div class="cbd-partner__body" id="cbd_pb_${idx}">
// 					${this._build_table(partner.budgets || [], partner.partner_name || '')}
// 				</div>
// 			`;
// 			el.appendChild(card);

// 			card.querySelector(`#cbd_ph_${idx}`).addEventListener('click', (e) => {
// 				if (e.target.closest('.cbd-consolidated-btn')) return;
// 				const body = document.getElementById(`cbd_pb_${idx}`);
// 				const chv  = document.getElementById(`cbd_chv_${idx}`);
// 				const open = body.style.display === 'block';
// 				body.style.display = open ? 'none' : 'block';
// 				chv.classList.toggle('cbd-chevron--open', !open);
// 			});
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// DETAIL TABLE  (with View Line Items button)
// 	// ─────────────────────────────────────────────

// 	_build_table(budgets, partner_name) {
// 		if (!budgets.length) return '<div class="cbd-empty">No budget rows.</div>';

// 		const rows = budgets.map(r => {
// 			const u_pct  = parseFloat(r.utilised_pct)             || 0;
// 			const ud_pct = parseFloat(r.utilised_disbursement_pct) || 0;
// 			return `
// 				<tr>
// 					<td>
// 						<span class="cbd-chip cbd-chip--blue">${frappe.utils.escape_html(r.budget_reference_name || '—')}</span>
// 					</td>
// 					<td><span class="cbd-chip cbd-chip--teal">${frappe.utils.escape_html(r.grant_id || '—')}</span></td>
// 					<td>${frappe.utils.escape_html(r.financial_year || '—')}</td>
// 					<td>${frappe.utils.escape_html(r.state || '—')}</td>
// 					<td>${this._date(r.grant_start)}</td>
// 					<td>${this._date(r.grant_end)}</td>
// 					<td class="cbd-r">${r.no_of_creches || 0}</td>
// 					<td class="cbd-r">${this._fmt(r.budget)}</td>
// 					<td class="cbd-r">${this._fmt(r.disbursement)}</td>
// 					<td class="cbd-r">${this._fmt(r.utilisation)}</td>
// 					<td class="cbd-r"><span class="cbd-chip cbd-chip--${this._chip_cls(u_pct)}">${u_pct.toFixed(1)}%</span></td>
// 					<td class="cbd-r"><span class="cbd-chip cbd-chip--${this._chip_cls(ud_pct)}">${ud_pct.toFixed(1)}%</span></td>
// 					<td class="cbd-r">${this._fmt(r.balance_budget_amount)}</td>
// 					<td class="cbd-r">${this._fmt(r.bank_balance)}</td>
// 					<td class="cbd-r">${this._fmt(r.interest_from_bank)}</td>
// 					<td>
// 						<button class="cbd-view-btn"
// 							data-budget-id="${frappe.utils.escape_html(r.budget_id)}"
// 							data-ref-name="${frappe.utils.escape_html(r.budget_reference_name || '')}"
// 							data-grant-start="${frappe.utils.escape_html(r.grant_start || '')}"
// 							data-grant-end="${frappe.utils.escape_html(r.grant_end || '')}">
// 							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
// 							Line Items
// 						</button>
// 					</td>
// 				</tr>
// 			`;
// 		}).join('');

// 		return `
// 			<div class="cbd-tbl-wrap">
// 				<table class="cbd-table" role="table" aria-label="Budget rows for ${frappe.utils.escape_html(partner_name)}">
// 					<thead>
// 						<tr>
// 							<th>Reference</th>
// 							<th>Grant ID</th>
// 							<th>FY</th>
// 							<th>State</th>
// 							<th>Start</th>
// 							<th>End</th>
// 							<th class="cbd-r">Creches</th>
// 							<th class="cbd-r">Budget</th>
// 							<th class="cbd-r">Disbursed</th>
// 							<th class="cbd-r">Utilised</th>
// 							<th class="cbd-r">Util %</th>
// 							<th class="cbd-r">Util vs Disb.</th>
// 							<th class="cbd-r">Bal. Budget</th>
// 							<th class="cbd-r">Bank Bal.</th>
// 							<th class="cbd-r">Interest</th>
// 							<th></th>
// 						</tr>
// 					</thead>
// 					<tbody>${rows}</tbody>
// 				</table>
// 			</div>
// 		`;
// 	}

// 	// ─────────────────────────────────────────────
// 	// SIDE PANELS
// 	// ─────────────────────────────────────────────

// 	_open_panels(budget_id, ref_name, grant_start, grant_end) {
// 		const overlay = document.getElementById('cbd_overlay');
// 		const left    = document.getElementById('cbd_panel_left');
// 		const right   = document.getElementById('cbd_panel_right');

// 		overlay.classList.add('cbd-overlay--active');
// 		left.classList.add('cbd-panel--open');
// 		right.classList.add('cbd-panel--open');
// 		document.body.classList.add('cbd-panels-open');
// 		const cclose = document.getElementById('cbd_centre_close');
// 		if (cclose) cclose.classList.add('cbd-centre-close--visible');

// 		// Push Frappe sidebar behind the overlay
// 		const sidebar = document.querySelector('.layout-side-section, .desk-sidebar, #sidebar-menu, .main-container > .col.layout-side-section');
// 		if (sidebar) {
// 			sidebar.dataset.cbdPrevZ = sidebar.style.zIndex || '';
// 			sidebar.style.zIndex = '1';
// 			sidebar.style.transition = 'z-index 0s';
// 		}

// 		// Left panel: Budget line items skeleton
// 		left.innerHTML = `
// 			<div class="cbd-panel__header">
// 				<div>
// 					<div class="cbd-panel__title">Budget Line Items</div>
// 					<div class="cbd-panel__sub">${frappe.utils.escape_html(ref_name)}</div>
// 				</div>
// 				<div class="cbd-panel__header-actions">
// 					<label class="cbd-expand-all-label" title="Expand / collapse all groups">
// 						<input type="checkbox" id="cbd_left_expand_all" class="cbd-expand-chk">
// 						Expand all
// 					</label>
// 					<button class="cbd-panel__close" id="cbd_close_panels" title="Close this panel">&#10005;</button>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__body" id="cbd_left_body">
// 				<div class="cbd-panel-loading">Loading…</div>
// 			</div>
// 			<div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none">
// 				<span>Grand Total</span><span id="cbd_left_total_val">—</span>
// 			</div>
// 		`;

// 		// Right panel: Utilisation line items skeleton
// 		right.innerHTML = `
// 			<div class="cbd-panel__header">
// 				<div>
// 					<div class="cbd-panel__title">Utilisation Line Items</div>
// 					<div class="cbd-panel__sub">${frappe.utils.escape_html(ref_name)}</div>
// 				</div>
// 				<div class="cbd-panel__header-actions">
// 					<label class="cbd-expand-all-label" title="Expand / collapse all groups">
// 						<input type="checkbox" id="cbd_right_expand_all" class="cbd-expand-chk">
// 						Expand all
// 					</label>
// 					<button class="cbd-panel__close" id="cbd_close_panels2" title="Close this panel">&#10005;</button>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__filter" id="cbd_month_filter_wrap">
// 				<div class="cbd-filter-row">
// 					<div class="cbd-filter-col">
// 						<div class="cbd-filter-label">Financial Year</div>
// 						<div id="cbd_fy_multiselect"></div>
// 					</div>
// 					<div class="cbd-filter-col">
// 						<div class="cbd-filter-label">Month</div>
// 						<div id="cbd_month_multiselect"></div>
// 					</div>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__body" id="cbd_right_body">
// 				<div class="cbd-panel-loading">Loading…</div>
// 			</div>
// 			<div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none">
// 				<span id="cbd_right_total_lbl">Total</span>
// 				<span id="cbd_right_total_val">—</span>
// 			</div>
// 		`;

// 		document.getElementById('cbd_close_panels').addEventListener('click',  () => this._close_left());
// 		document.getElementById('cbd_close_panels2').addEventListener('click', () => this._close_right());


// 		this._load_budget_items(budget_id);
// 		this._load_utilisation_items(budget_id, grant_start, grant_end);
// 	}

// 	_close_panels() {
// 		document.getElementById('cbd_overlay').classList.remove('cbd-overlay--active');
// 		document.getElementById('cbd_panel_left').classList.remove('cbd-panel--open', 'cbd-panel--full');
// 		document.getElementById('cbd_panel_right').classList.remove('cbd-panel--open', 'cbd-panel--full');
// 		document.body.classList.remove('cbd-panels-open');
// 		const sidebar = document.querySelector('.layout-side-section, .desk-sidebar, #sidebar-menu, .main-container > .col.layout-side-section');
// 		if (sidebar) sidebar.style.zIndex = sidebar.dataset.cbdPrevZ || '';
// 		const cc = document.getElementById('cbd_centre_close');
// 		if (cc) cc.classList.remove('cbd-centre-close--visible');
// 	}

// 	_close_left() {
// 		const left  = document.getElementById('cbd_panel_left');
// 		const right = document.getElementById('cbd_panel_right');
// 		left.classList.remove('cbd-panel--open', 'cbd-panel--full');
// 		const cc = document.getElementById('cbd_centre_close');
// 		if (cc) cc.classList.remove('cbd-centre-close--visible');
// 		if (!right.classList.contains('cbd-panel--open')) this._close_panels();
// 	}

// 	_close_right() {
// 		const left  = document.getElementById('cbd_panel_left');
// 		const right = document.getElementById('cbd_panel_right');
// 		right.classList.remove('cbd-panel--open', 'cbd-panel--full');
// 		const cc = document.getElementById('cbd_centre_close');
// 		if (cc) cc.classList.remove('cbd-centre-close--visible');
// 		if (!left.classList.contains('cbd-panel--open')) this._close_panels();
// 	}

// 	// ─────────────────────────────────────────────
// 	// LEFT PANEL  — Budget Items (collapsible groups)
// 	// ─────────────────────────────────────────────

// 	_load_budget_items(budget_id) {
// 		frappe.call({
// 			method: 'creche_reports.api.budget_utilisation_summary.get_budget_line_items',
// 			args: { budget_id },
// 			callback: (r) => {
// 				const el = document.getElementById('cbd_left_body');
// 				if (!el) return;
// 				const items = (r.message || []);
// 				if (!items.length) {
// 					el.innerHTML = '<div class="cbd-panel-empty">No budget line items found.</div>';
// 					return;
// 				}

// 				// Group by budget_main_head
// 				const groups = {};
// 				items.forEach(item => {
// 					const head = item.budget_main_head || 'Other';
// 					if (!groups[head]) groups[head] = [];
// 					groups[head].push(item);
// 				});

// 				el.innerHTML = '';

// 				Object.entries(groups).forEach(([head, rows], gidx) => {
// 					const group_total = rows.reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);
// 					const gid = 'lgrp_' + gidx;

// 					const grp = document.createElement('div');
// 					grp.className = 'cbd-item-group';
// 					grp.innerHTML = `
// 						<div class="cbd-item-group__head cbd-item-group__head--toggle" data-target="${gid}">
// 							<div class="cbd-igh-left">
// 								<span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span>
// 								<span>${frappe.utils.escape_html(head)}</span>
// 							</div>
// 							<span class="cbd-item-group__total">${this._fmt(group_total)}</span>
// 						</div>
// 						<div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}">
// 							<table class="cbd-li-table">
// 								<thead>
// 									<tr>
// 										<th>Expense Type</th>
// 										<th>Sub Head</th>
// 										<th class="cbd-li-r">Amount</th>
// 										<th class="cbd-li-r">Y1</th>
// 										<th class="cbd-li-r">Y2</th>
// 										<th class="cbd-li-r">Y3</th>
// 									</tr>
// 								</thead>
// 								<tbody>
// 									${rows.map(row => `
// 										<tr>
// 											<td>
// 												<div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses || '—')}</div>
// 												${row.notes ? `<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>` : ''}
// 											</td>
// 											<td>${frappe.utils.escape_html(row.budget_sub_head || '—')}</td>
// 											<td class="cbd-li-r cbd-li-amt">${this._fmt(row.total_amount)}</td>
// 											<td class="cbd-li-r">${row.year_1 ? this._fmt(row.year_1) : '—'}</td>
// 											<td class="cbd-li-r">${row.year_2 ? this._fmt(row.year_2) : '—'}</td>
// 											<td class="cbd-li-r">${row.year_3 ? this._fmt(row.year_3) : '—'}</td>
// 										</tr>
// 									`).join('')}
// 								</tbody>
// 							</table>
// 						</div>
// 					`;
// 					el.appendChild(grp);

// 					grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click', () => {
// 						const body = document.getElementById(gid);
// 						const chv  = grp.querySelector('.cbd-igh-chevron');
// 						const collapsed = body.classList.toggle('cbd-item-group__body--collapsed');
// 						chv.style.transform = collapsed ? 'rotate(-90deg)' : '';
// 					});
// 				});

// 				// Sticky total
// 				const grand = items.reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);
// 				const tot = document.getElementById('cbd_left_total');
// 				const tot_val = document.getElementById('cbd_left_total_val');
// 				if (tot) { tot.style.display = 'flex'; tot_val.textContent = this._fmt(grand); }


// 			}
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// RIGHT PANEL  — Utilisation Items + FY & Month multiselects
// 	// ─────────────────────────────────────────────

// 	_load_utilisation_items(budget_id, grant_start, grant_end) {
// 		frappe.call({
// 			method: 'creche_reports.api.budget_utilisation_summary.get_utilisation_line_items',
// 			args: { budget_id },
// 			callback: (r) => {
// 				const data       = r.message || {};
// 				const records    = data.records  || [];
// 				const all_months = data.months   || [];

// 				// All 12 calendar months always shown as options
// 				const ALL_12 = [
// 					'January','February','March','April','May','June',
// 					'July','August','September','October','November','December'
// 				];

// 				// Derive financial years from grant dates
// 				const fy_options = this._derive_fy_options(grant_start, grant_end);
// 				// All FYs that have actual records
// 				const record_fys = [...new Set(records.map(r => r.financial_year).filter(Boolean))];

// 				this._util_records    = records;
// 				this._selected_months = new Set(ALL_12);
// 				this._selected_fys    = new Set(fy_options.map(f => f.value));

// 				const fy_wrap    = document.getElementById('cbd_fy_multiselect');
// 				const month_wrap = document.getElementById('cbd_month_multiselect');
// 				if (!fy_wrap || !month_wrap) return;

// 				// ── Financial Year multiselect ─────────────
// 				this._fy_field = frappe.ui.form.make_control({
// 					df: {
// 						fieldtype: 'MultiSelectList',
// 						fieldname: 'fy_filter',
// 						label:     'Financial Year',
// 						get_data: () => fy_options,
// 					},
// 					parent: $(fy_wrap),
// 					render_input: true,
// 				});
// 				this._fy_field.refresh();
// 				this._fy_field.set_value(fy_options.map(f => f.value));
// 				this._fy_field.df.onchange = () => {
// 					const val = this._fy_field.get_value() || [];
// 					this._selected_fys = new Set(Array.isArray(val) ? val : [val]);
// 					this._render_utilisation();
// 				};

// 				// ── Month multiselect (always all 12) ──────
// 				this._month_field = frappe.ui.form.make_control({
// 					df: {
// 						fieldtype: 'MultiSelectList',
// 						fieldname: 'month_filter',
// 						label:     'Month',
// 						get_data: () => ALL_12.map(m => ({ value: m, description: '' })),
// 					},
// 					parent: $(month_wrap),
// 					render_input: true,
// 				});
// 				this._month_field.refresh();
// 				this._month_field.set_value(ALL_12);
// 				this._month_field.df.onchange = () => {
// 					const val = this._month_field.get_value() || [];
// 					this._selected_months = new Set(Array.isArray(val) ? val : [val]);
// 					this._render_utilisation();
// 				};

// 				// Default: show everything
// 				if (!records.length) {
// 					document.getElementById('cbd_right_body').innerHTML = '<div class="cbd-panel-empty">No utilisation records found for this budget.</div>';
// 					return;
// 				}
// 				this._render_utilisation();
// 			}
// 		});
// 	}

// 	// Derive financial year options from grant start → end dates
// 	// e.g. 2022-04-01 to 2024-03-31 → ["2022-23", "2023-24"]
// 	_derive_fy_options(start_str, end_str) {
// 		const ALL_12 = [
// 			'January','February','March','April','May','June',
// 			'July','August','September','October','November','December'
// 		];
// 		const to_fy = (date_str) => {
// 			if (!date_str) return null;
// 			const d    = new Date(date_str);
// 			const yr   = d.getFullYear();
// 			const mo   = d.getMonth() + 1; // 1-based
// 			const fy_start = mo >= 4 ? yr : yr - 1;
// 			return `${fy_start}-${String(fy_start + 1).slice(-2)}`;
// 		};

// 		const start_fy = to_fy(start_str);
// 		const end_fy   = to_fy(end_str);

// 		if (!start_fy) return [];

// 		const options = [];
// 		let [sy] = start_fy.split('-').map(Number);
// 		const [ey] = (end_fy || start_fy).split('-').map(Number);

// 		while (sy <= ey) {
// 			const label = `${sy}-${String(sy + 1).slice(-2)}`;
// 			options.push({ value: label, description: '' });
// 			sy++;
// 		}
// 		return options;
// 	}

// 	_render_utilisation() {
// 		const el = document.getElementById('cbd_right_body');
// 		if (!el) return;

// 		const MONTH_ORDER = [
// 			'January','February','March','April','May','June',
// 			'July','August','September','October','November','December'
// 		];

// 		const sel_months = this._selected_months || new Set();
// 		const sel_fys    = this._selected_fys    || new Set();

// 		const records = (this._util_records || []).filter(r => {
// 			const month_ok = sel_months.size === 0 || sel_months.has(r.month);
// 			const fy_ok    = sel_fys.size === 0    || sel_fys.has(r.financial_year);
// 			return month_ok && fy_ok;
// 		});

// 		if (!records.length) {
// 			el.innerHTML = '<div class="cbd-panel-empty">No data for selected period.</div>';
// 			const rt = document.getElementById('cbd_right_total');
// 			if (rt) rt.style.display = 'none';
// 			return;
// 		}

// 		// Sorted months present in filtered records
// 		const active_months = [...new Set(records.map(r => r.month))]
// 			.sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));
// 		const is_multi = active_months.length > 1;

// 		// YTD combine: sum total_amount per expense type across all selected records
// 		// Also keep per-month breakdown for multi-month view
// 		const combined = {};   // key → { meta, total_amount, by_month:{month→amt} }
// 		records.forEach(rec => {
// 			(rec.items || []).forEach(item => {
// 				const key = item.type_of_expenses_id || item.type_of_expenses || 'unknown';
// 				if (!combined[key]) {
// 					combined[key] = {
// 						type_of_expenses: item.type_of_expenses,
// 						budget_main_head: item.budget_main_head,
// 						budget_sub_head:  item.budget_sub_head,
// 						notes:            item.notes,
// 						total_amount:     0,
// 						by_month:         {},
// 					};
// 				}
// 				const amt = parseFloat(item.total_amount) || 0;
// 				combined[key].total_amount += amt;
// 				combined[key].by_month[rec.month] = (combined[key].by_month[rec.month] || 0) + amt;
// 			});
// 		});

// 		// Group by main head
// 		const groups = {};
// 		Object.values(combined).forEach(item => {
// 			const head = item.budget_main_head || 'Other';
// 			if (!groups[head]) groups[head] = [];
// 			groups[head].push(item);
// 		});

// 		el.innerHTML = '';

// 		// YTD label bar
// 		if (is_multi) {
// 			const bar = document.createElement('div');
// 			bar.className = 'cbd-ytd-bar';
// 			bar.innerHTML = `
// 				<span class="cbd-ytd-badge">YTD</span>
// 				<span class="cbd-ytd-label">
// 					Combined across <b>${active_months.length}</b> months:
// 					${active_months.map(m => `<span class="cbd-ytd-month">${frappe.utils.escape_html(m)}</span>`).join('')}
// 				</span>
// 			`;
// 			el.appendChild(bar);
// 		}

// 		let grand = 0;

// 		Object.entries(groups).forEach(([head, rows], gidx) => {
// 			const group_total = rows.reduce((s, r) => s + r.total_amount, 0);
// 			grand += group_total;
// 			const gid = 'rgrp_' + gidx;

// 			const grp = document.createElement('div');
// 			grp.className = 'cbd-item-group';

// 			// Build month header cols (only in multi-month mode)
// 			const month_ths = is_multi
// 				? active_months.map(m => `<th class="cbd-li-r cbd-li-month-col">${m.slice(0,3)}</th>`).join('')
// 				: '';
// 			const month_tds = (row) => is_multi
// 				? active_months.map(m => `<td class="cbd-li-r cbd-li-month-col">${row.by_month[m] ? this._fmt(row.by_month[m]) : '—'}</td>`).join('')
// 				: '';

// 			grp.innerHTML = `
// 				<div class="cbd-item-group__head cbd-item-group__head--toggle" data-target="${gid}">
// 					<div class="cbd-igh-left">
// 						<span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span>
// 						<span>${frappe.utils.escape_html(head)}</span>
// 					</div>
// 					<span class="cbd-item-group__total">${this._fmt(group_total)}</span>
// 				</div>
// 				<div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}">
// 					<table class="cbd-li-table">
// 						<thead>
// 							<tr>
// 								<th>Expense Type</th>
// 								<th>Sub Head</th>
// 								${month_ths}
// 								<th class="cbd-li-r">${is_multi ? 'YTD Total' : 'Amount'}</th>
// 							</tr>
// 						</thead>
// 						<tbody>
// 							${rows.map(row => `
// 								<tr>
// 									<td>
// 										<div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses || '—')}</div>
// 										${row.notes ? `<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>` : ''}
// 									</td>
// 									<td class="cbd-li-sub">${frappe.utils.escape_html(row.budget_sub_head || '—')}</td>
// 									${month_tds(row)}
// 									<td class="cbd-li-r cbd-li-amt">${this._fmt(row.total_amount)}</td>
// 								</tr>
// 							`).join('')}
// 						</tbody>
// 					</table>
// 				</div>
// 			`;
// 			el.appendChild(grp);

// 			grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click', () => {
// 				const body = document.getElementById(gid);
// 				const chv  = grp.querySelector('.cbd-igh-chevron');
// 				const collapsed = body.classList.toggle('cbd-item-group__body--collapsed');
// 				chv.style.transform = collapsed ? 'rotate(-90deg)' : '';
// 			});
// 		});

// 		// Update sticky total
// 		const rt     = document.getElementById('cbd_right_total');
// 		const rt_val = document.getElementById('cbd_right_total_val');
// 		const rt_lbl = document.getElementById('cbd_right_total_lbl');
// 		if (rt) {
// 			rt.style.display = 'flex';
// 			rt_val.textContent = this._fmt(grand);
// 			if (rt_lbl) rt_lbl.textContent = is_multi ? `YTD Total (${active_months.length} months)` : 'Total';
// 		}


// 	}

// 	// ─────────────────────────────────────────────
// 	// CONSOLIDATED PANELS  (partner-level)
// 	// ─────────────────────────────────────────────

// 	_open_consolidated_panels(budget_ids, partner_name, grant_start, grant_end) {
// 		const overlay = document.getElementById('cbd_overlay');
// 		const left    = document.getElementById('cbd_panel_left');
// 		const right   = document.getElementById('cbd_panel_right');

// 		overlay.classList.add('cbd-overlay--active');
// 		left.classList.add('cbd-panel--open');
// 		right.classList.add('cbd-panel--open');
// 		document.body.classList.add('cbd-panels-open');
// 		const _consol_cc = document.getElementById('cbd_centre_close');
// 		if (_consol_cc) _consol_cc.classList.add('cbd-centre-close--visible');

// 		const sidebar = document.querySelector('.layout-side-section, .desk-sidebar, #sidebar-menu, .main-container > .col.layout-side-section');
// 		if (sidebar) {
// 			sidebar.dataset.cbdPrevZ = sidebar.style.zIndex || '';
// 			sidebar.style.zIndex = '1';
// 		}

// 		const title_sub = `${budget_ids.length} budget${budget_ids.length > 1 ? 's' : ''} · Consolidated`;

// 		// Left panel
// 		left.innerHTML = `
// 			<div class="cbd-panel__header">
// 				<div>
// 					<div class="cbd-panel__title">
// 						<span class="cbd-panel__consolidated-badge">Consolidated</span>
// 						Budget Line Items
// 					</div>
// 					<div class="cbd-panel__sub">${frappe.utils.escape_html(partner_name)} &mdash; ${frappe.utils.escape_html(title_sub)}</div>
// 				</div>
// 				<div class="cbd-panel__header-actions">
					
// 					<label class="cbd-expand-all-label" title="Expand / collapse all groups">
// 						<input type="checkbox" class="cbd-expand-chk cbd-expand-all">
// 						Expand all
// 					</label>
// 					<button class="cbd-panel__close" id="cbd_close_panels" title="Close this panel">&#10005;</button>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__body" id="cbd_left_body">
// 				<div class="cbd-panel-loading">Loading ${budget_ids.length} budgets…</div>
// 			</div>
// 			<div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none">
// 				<span>Grand Total</span><span id="cbd_left_total_val">—</span>
// 			</div>
// 		`;

// 		// Right panel
// 		right.innerHTML = `
// 			<div class="cbd-panel__header">
// 				<div>
// 					<div class="cbd-panel__title">
// 						<span class="cbd-panel__consolidated-badge">Consolidated</span>
// 						Utilisation Line Items
// 					</div>
// 					<div class="cbd-panel__sub">${frappe.utils.escape_html(partner_name)} &mdash; ${frappe.utils.escape_html(title_sub)}</div>
// 				</div>
// 				<div class="cbd-panel__header-actions">
					
// 					<label class="cbd-expand-all-label" title="Expand / collapse all groups">
// 						<input type="checkbox" class="cbd-expand-chk cbd-expand-all">
// 						Expand all
// 					</label>
// 					<button class="cbd-panel__close" id="cbd_close_panels2" title="Close this panel">&#10005;</button>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__filter" id="cbd_month_filter_wrap">
// 				<div class="cbd-filter-row">
// 					<div class="cbd-filter-col">
// 						<div class="cbd-filter-label">Financial Year</div>
// 						<div id="cbd_fy_multiselect"></div>
// 					</div>
// 					<div class="cbd-filter-col">
// 						<div class="cbd-filter-label">Month</div>
// 						<div id="cbd_month_multiselect"></div>
// 					</div>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__body" id="cbd_right_body">
// 				<div class="cbd-panel-loading">Loading…</div>
// 			</div>
// 			<div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none">
// 				<span id="cbd_right_total_lbl">Total</span>
// 				<span id="cbd_right_total_val">—</span>
// 			</div>
// 		`;

// 		document.getElementById('cbd_close_panels').addEventListener('click',  () => this._close_left());
// 		document.getElementById('cbd_close_panels2').addEventListener('click', () => this._close_right());


// 		// Load all budget line items and merge them
// 		this._load_consolidated_budget_items(budget_ids);
// 		this._load_consolidated_utilisation_items(budget_ids, grant_start, grant_end);
// 	}

// 	// Consolidated budget items — fetch all budget_ids in parallel, merge by expense type
// 	_load_consolidated_budget_items(budget_ids) {
// 		const promises = budget_ids.map(bid =>
// 			frappe.call({
// 				method: 'creche_reports.api.budget_utilisation_summary.get_budget_line_items',
// 				args:   { budget_id: bid },
// 			})
// 		);

// 		Promise.all(promises).then(results => {
// 			const el = document.getElementById('cbd_left_body');
// 			if (!el) return;

// 			// Merge all items, sum by type_of_expenses_id
// 			const merged = {};
// 			results.forEach(r => {
// 				(r.message || []).forEach(item => {
// 					const key = item.type_of_expenses_id || item.type_of_expenses || 'unknown';
// 					if (!merged[key]) {
// 						merged[key] = {
// 							type_of_expenses: item.type_of_expenses,
// 							budget_main_head: item.budget_main_head,
// 							budget_sub_head:  item.budget_sub_head,
// 							notes:            item.notes,
// 							total_amount:     0,
// 							year_1: 0, year_2: 0, year_3: 0,
// 						};
// 					}
// 					merged[key].total_amount += parseFloat(item.total_amount) || 0;
// 					merged[key].year_1       += parseFloat(item.year_1)       || 0;
// 					merged[key].year_2       += parseFloat(item.year_2)       || 0;
// 					merged[key].year_3       += parseFloat(item.year_3)       || 0;
// 				});
// 			});

// 			const items = Object.values(merged);
// 			if (!items.length) {
// 				el.innerHTML = '<div class="cbd-panel-empty">No budget line items found.</div>';
// 				return;
// 			}

// 			// Group by main head
// 			const groups = {};
// 			items.forEach(item => {
// 				const head = item.budget_main_head || 'Other';
// 				if (!groups[head]) groups[head] = [];
// 				groups[head].push(item);
// 			});

// 			el.innerHTML = '';
// 			Object.entries(groups).forEach(([head, rows], gidx) => {
// 				const group_total = rows.reduce((s, r) => s + r.total_amount, 0);
// 				const gid = 'clgrp_' + gidx;
// 				const grp = document.createElement('div');
// 				grp.className = 'cbd-item-group';
// 				grp.innerHTML = `
// 					<div class="cbd-item-group__head cbd-item-group__head--toggle">
// 						<div class="cbd-igh-left">
// 							<span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span>
// 							<span>${frappe.utils.escape_html(head)}</span>
// 						</div>
// 						<span class="cbd-item-group__total">${this._fmt(group_total)}</span>
// 					</div>
// 					<div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}">
// 						<table class="cbd-li-table">
// 							<thead><tr>
// 								<th>Expense Type</th><th>Sub Head</th>
// 								<th class="cbd-li-r">Total</th>
// 								<th class="cbd-li-r">Y1</th><th class="cbd-li-r">Y2</th><th class="cbd-li-r">Y3</th>
// 							</tr></thead>
// 							<tbody>
// 								${rows.map(row => `
// 									<tr>
// 										<td><div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses||'—')}</div>
// 										${row.notes?`<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>`:''}</td>
// 										<td class="cbd-li-sub">${frappe.utils.escape_html(row.budget_sub_head||'—')}</td>
// 										<td class="cbd-li-r cbd-li-amt">${this._fmt(row.total_amount)}</td>
// 										<td class="cbd-li-r">${row.year_1?this._fmt(row.year_1):'—'}</td>
// 										<td class="cbd-li-r">${row.year_2?this._fmt(row.year_2):'—'}</td>
// 										<td class="cbd-li-r">${row.year_3?this._fmt(row.year_3):'—'}</td>
// 									</tr>
// 								`).join('')}
// 							</tbody>
// 						</table>
// 					</div>
// 				`;
// 				el.appendChild(grp);
// 				grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click', () => {
// 					const body = document.getElementById(gid);
// 					const chv  = grp.querySelector('.cbd-igh-chevron');
// 					const collapsed = body.classList.toggle('cbd-item-group__body--collapsed');
// 					chv.style.transform = collapsed ? 'rotate(-90deg)' : '';
// 				});
// 			});

// 			const grand = items.reduce((s, r) => s + r.total_amount, 0);
// 			const tot = document.getElementById('cbd_left_total');
// 			const tot_val = document.getElementById('cbd_left_total_val');
// 			if (tot) { tot.style.display = 'flex'; tot_val.textContent = this._fmt(grand); }
// 		});
// 	}

// 	// Consolidated utilisation — fetch all budget_ids, merge records, then use existing filter/render
// 	_load_consolidated_utilisation_items(budget_ids, grant_start, grant_end) {
// 		const promises = budget_ids.map(bid =>
// 			frappe.call({
// 				method: 'creche_reports.api.budget_utilisation_summary.get_utilisation_line_items',
// 				args:   { budget_id: bid },
// 			})
// 		);

// 		Promise.all(promises).then(results => {
// 			// Merge all records arrays from every budget
// 			const all_records = [];
// 			results.forEach(r => {
// 				((r.message || {}).records || []).forEach(rec => all_records.push(rec));
// 			});

// 			const ALL_12 = [
// 				'January','February','March','April','May','June',
// 				'July','August','September','October','November','December'
// 			];

// 			const fy_options = this._derive_fy_options(grant_start, grant_end);
// 			this._util_records    = all_records;
// 			this._selected_months = new Set(ALL_12);
// 			this._selected_fys    = new Set(fy_options.map(f => f.value));

// 			const fy_wrap    = document.getElementById('cbd_fy_multiselect');
// 			const month_wrap = document.getElementById('cbd_month_multiselect');
// 			if (!fy_wrap || !month_wrap) return;

// 			// Financial Year multiselect
// 			this._fy_field = frappe.ui.form.make_control({
// 				df: { fieldtype:'MultiSelectList', fieldname:'fy_filter', label:'FY',
// 					get_data: () => fy_options },
// 				parent: $(fy_wrap), render_input: true,
// 			});
// 			this._fy_field.refresh();
// 			this._fy_field.set_value(fy_options.map(f => f.value));
// 			this._fy_field.df.onchange = () => {
// 				const val = this._fy_field.get_value() || [];
// 				this._selected_fys = new Set(Array.isArray(val) ? val : [val]);
// 				this._render_utilisation();
// 			};

// 			// Month multiselect (all 12)
// 			this._month_field = frappe.ui.form.make_control({
// 				df: { fieldtype:'MultiSelectList', fieldname:'month_filter', label:'Month',
// 					get_data: () => ALL_12.map(m => ({ value: m, description: '' })) },
// 				parent: $(month_wrap), render_input: true,
// 			});
// 			this._month_field.refresh();
// 			this._month_field.set_value(ALL_12);
// 			this._month_field.df.onchange = () => {
// 				const val = this._month_field.get_value() || [];
// 				this._selected_months = new Set(Array.isArray(val) ? val : [val]);
// 				this._render_utilisation();
// 			};

// 			if (!all_records.length) {
// 				document.getElementById('cbd_right_body').innerHTML = '<div class="cbd-panel-empty">No utilisation records found.</div>';
// 				return;
// 			}
// 			this._render_utilisation();
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// HELPERS
// 	// ─────────────────────────────────────────────

// 	_fmt(n) {
// 		if (n === null || n === undefined || n === '') return '—';
// 		const v = parseFloat(n) || 0;
// 		if (Math.abs(v) >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr';
// 		if (Math.abs(v) >= 100000)   return '₹' + (v / 100000).toFixed(2)   + ' L';
// 		return '₹' + Math.round(v).toLocaleString('en-IN');
// 	}

// 	_date(d) {
// 		if (!d) return '—';
// 		return frappe.datetime.str_to_user(d) || d;
// 	}

// 	_metric(label, value) {
// 		return `<div class="cbd-metric"><span class="cbd-metric__label">${label}</span><span class="cbd-metric__value">${value}</span></div>`;
// 	}

// 	_icon_partner() {
// 		return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0"><rect x="3" y="7" width="18" height="14" rx="1"/><path d="M8 21V11h8v10"/><path d="M3 7l9-4 9 4"/></svg>`;
// 	}

// 	_fill_cls(v)  { return v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red'; }
// 	_chip_cls(v)  { return v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red'; }
// 	_badge_cls(v) { return v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red'; }

// 	// ─────────────────────────────────────────────
// 	// EVENT DELEGATION for View Line Items
// 	// ─────────────────────────────────────────────

// 	_bind_view_buttons() {
// 		document.getElementById('cbd_partners').addEventListener('click', (e) => {

// 			// Single budget line items
// 			const btn = e.target.closest('.cbd-view-btn');
// 			if (btn) {
// 				e.stopPropagation();
// 				this._open_panels(
// 					btn.dataset.budgetId,
// 					btn.dataset.refName,
// 					btn.dataset.grantStart || '',
// 					btn.dataset.grantEnd   || ''
// 				);
// 				return;
// 			}

// 			// Partner consolidated
// 			const cbtn = e.target.closest('.cbd-consolidated-btn');
// 			if (cbtn) {
// 				e.stopPropagation();
// 				const budget_ids  = (cbtn.dataset.budgetIds || '').split(',').filter(Boolean);
// 				const partner_name = cbtn.dataset.partnerName || 'Partner';
// 				const grant_start  = cbtn.dataset.grantStart || '';
// 				const grant_end    = cbtn.dataset.grantEnd   || '';
// 				this._open_consolidated_panels(budget_ids, partner_name, grant_start, grant_end);
// 				return;
// 			}
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// STYLES
// 	// ─────────────────────────────────────────────

// 	_inject_styles() {
// 		if (document.getElementById('cbd-styles')) return;
// 		const style = document.createElement('style');
// 		style.id = 'cbd-styles';
// 		style.textContent = `

// 		.cbd-root { padding: 16px 20px 40px; }

// 		/* ── Filter rows ─────────────────────────── */
// 		.custom-filter-row {
// 			padding: 0;
// 			background: var(--card-bg,#fff);
// 			border-radius: 6px;
// 			margin-top: 0;
// 			margin-left: 0;
// 			margin-right: 0;
// 		}
// 		/* 5 equal cols via flex */
// 		.custom-filter-row { display: flex; flex-wrap: wrap; }
// 		.cbd-filter-col {
// 			flex: 1 1 20%;
// 			min-width: 0;
// 			padding: 8px 8px 0;
// 			box-sizing: border-box;
// 		}
// 		.custom-filter-actions {
// 			padding: 8px 8px 10px !important;
// 			border-top: 1px solid var(--border-color,#d1d8dd);
// 			margin-top: 4px;
// 			width: 100%;
// 			display: flex;
// 			justify-content: flex-end;
// 		}
// 		.custom-filter-actions .col-md-12 {
// 			padding: 0;
// 			width: 100%;
// 			text-align: right;
// 		}

// 		/* ── Custom multiselect ───────────────── */
// 		.cbd-ms { position: relative; }

// 		/* Caret icon inside real Frappe input */
// 		.cbd-ms-caret {
// 			position: absolute;
// 			right: 8px;
// 			top: 50%;
// 			transform: translateY(-50%);
// 			font-size: 10px;
// 			color: var(--text-muted,#8d99a6);
// 			pointer-events: none;
// 			z-index: 1;
// 		}
// 		/* Pad input so text doesn't overlap caret */
// 		.cbd-ms-inp { padding-right: 22px !important; cursor: pointer !important; }

// 		/* Dropdown panel — sits under control-input-wrapper */
// 		.control-input-wrapper { position: relative; }
// 		.cbd-ms__drop {
// 			display: none;
// 			position: absolute;
// 			top: 100%;
// 			left: 0;
// 			right: 0;
// 			min-width: 220px;
// 			background: var(--card-bg,#fff);
// 			border: 1px solid var(--border-color,#d1d8dd);
// 			border-radius: 6px;
// 			box-shadow: 0 8px 24px rgba(0,0,0,.13);
// 			z-index: 3000;
// 			overflow: hidden;
// 		}

// 		/* Selected tags strip */
// 		.cbd-ms__tags {
// 			display: flex;
// 			flex-wrap: wrap;
// 			gap: 3px;
// 			margin-top: 4px;
// 		}
// 		.cbd-ms__tag {
// 			display: inline-flex;
// 			align-items: center;
// 			gap: 3px;
// 			padding: 2px 8px;
// 			background: #E6F1FB;
// 			color: #0C447C;
// 			border: 1px solid #B5D4F4;
// 			border-radius: 12px;
// 			font-size: 11px;
// 			font-weight: 500;
// 		}
// 		.cbd-ms__tagx {
// 			cursor: pointer;
// 			color: #378ADD;
// 			font-size: 13px;
// 			line-height: 1;
// 			margin-left: 1px;
// 		}
// 		.cbd-ms__tagx:hover { color: #A32D2D; }

// 		/* Search */
// 		.cbd-ms__search-wrap {
// 			padding: 8px 10px 6px;
// 			border-bottom: 1px solid var(--border-color,#d1d8dd);
// 		}
// 		.cbd-ms__search {
// 			width: 100%;
// 			height: 28px;
// 			padding: 4px 8px;
// 			font-size: 12px;
// 			border: 1px solid var(--border-color,#d1d8dd);
// 			border-radius: 5px;
// 			background: var(--control-bg,#f7f7f7);
// 			outline: none;
// 			color: var(--text-color,#1c2126);
// 		}
// 		.cbd-ms__search:focus { border-color: #378ADD; background: #fff; }

// 		/* Options list */
// 		.cbd-ms__list {
// 			max-height: 200px;
// 			overflow-y: auto;
// 		}
// 		.cbd-ms__list::-webkit-scrollbar { width: 4px; }
// 		.cbd-ms__list::-webkit-scrollbar-thumb { background: var(--border-color,#d1d8dd); border-radius: 2px; }

// 		.cbd-ms__opt {
// 			display: flex;
// 			align-items: center;
// 			gap: 9px;
// 			padding: 8px 12px;
// 			font-size: 13px;
// 			color: var(--text-color,#1c2126);
// 			cursor: pointer;
// 			border-bottom: 1px solid var(--border-color,#d1d8dd);
// 		}
// 		.cbd-ms__opt:last-child { border-bottom: none; }
// 		.cbd-ms__opt:hover { background: var(--control-bg,#f7f7f7); }
// 		.cbd-ms__opt--on { background: #f0faf3; }
// 		.cbd-ms__opt--on:hover { background: #e3f6e9; }

// 		.cbd-ms__cb {
// 			width: 16px;
// 			height: 16px;
// 			border: 1.5px solid var(--border-color,#d1d8dd);
// 			border-radius: 4px;
// 			background: #fff;
// 			display: inline-flex;
// 			align-items: center;
// 			justify-content: center;
// 			flex-shrink: 0;
// 			transition: border-color .1s, background .1s;
// 		}
// 		.cbd-ms__opt--on .cbd-ms__cb {
// 			background: #EAF6EF;
// 			border-color: #2D9C5A;
// 		}
// 		.cbd-ms__optlabel { flex: 1; }

// 		/* Footer */
// 		.cbd-ms__footer {
// 			display: flex;
// 			justify-content: flex-end;
// 			gap: 6px;
// 			padding: 7px 10px;
// 			border-top: 1px solid var(--border-color,#d1d8dd);
// 			background: var(--control-bg,#f7f7f7);
// 		}
// 		.cbd-ms__footer-btn {
// 			padding: 3px 10px;
// 			font-size: 11px;
// 			font-weight: 600;
// 			border-radius: 5px;
// 			border: 1px solid var(--border-color,#d1d8dd);
// 			background: #fff;
// 			color: #185FA5;
// 			cursor: pointer;
// 		}
// 		.cbd-ms__footer-btn:hover { background: #E6F1FB; border-color: #B5D4F4; }
// 		.cbd-ms__footer-btn--clear { color: #A32D2D; }
// 		.cbd-ms__footer-btn--clear:hover { background: #FCEBEB; border-color: #F09595; }

// 		.cbd-ms__empty {
// 			padding: 14px;
// 			text-align: center;
// 			color: var(--text-muted,#8d99a6);
// 			font-size: 12px;
// 		}

// 		/* ── Filter actions ───────────────────── */
// 		.cbd-filter-bar__actions {
// 			display: flex;
// 			gap: 8px;
// 			padding-top: 10px;
// 			border-top: 1px solid var(--border-color,#d1d8dd);
// 			justify-content: flex-end;
// 			align-items: center;
// 			margin-top: 4px;
// 		}
// 		.cbd-filter-bar__actions .btn {
// 			min-width: 80px;
// 			display: inline-flex;
// 			align-items: center;
// 			justify-content: center;
// 			gap: 4px;
// 		}

// 		/* ── Overview strip ────────────────────── */
// 		.cbd-overview-strip {
// 			display: flex;
// 			align-items: stretch;
// 			gap: 0;
// 			background: var(--card-bg,#fff);
// 			border: 1px solid var(--border-color,#d1d8dd);
// 			border-radius: 10px;
// 			margin-bottom: 12px;
// 			overflow: hidden;
// 		}
// 		.cbd-ostat {
// 			display: flex;
// 			align-items: center;
// 			gap: 10px;
// 			flex: 1;
// 			padding: 14px 18px;
// 			min-width: 0;
// 			border-right: 1px solid var(--border-color,#d1d8dd);
// 			cursor: default;
// 			transition: background .12s;
// 		}
// 		.cbd-ostat:last-child { border-right: none; }
// 		.cbd-ostat[title] { cursor: help; }
// 		.cbd-ostat[title]:hover { background: var(--control-bg,#f7f7f7); }
// 		.cbd-ostat__icon {
// 			width: 36px;
// 			height: 36px;
// 			display: flex;
// 			align-items: center;
// 			justify-content: center;
// 			border-radius: 8px;
// 			background: var(--control-bg,#f0f4f8);
// 			color: #378ADD;
// 			flex-shrink: 0;
// 		}
// 		.cbd-ostat__body { min-width: 0; }
// 		.cbd-ostat__value {
// 			font-size: 20px;
// 			font-weight: 600;
// 			color: var(--text-color,#1c2126);
// 			line-height: 1.1;
// 		}
// 		.cbd-ostat__label {
// 			font-size: 10px;
// 			font-weight: 500;
// 			text-transform: uppercase;
// 			letter-spacing: .6px;
// 			color: var(--text-muted,#8d99a6);
// 			margin-top: 2px;
// 			white-space: nowrap;
// 			overflow: hidden;
// 			text-overflow: ellipsis;
// 		}

// 		/* ── Summary cards ─────────────────────── */
// 		.cbd-summary-cards {
// 			display: grid;
// 			grid-template-columns: repeat(4,1fr);
// 			gap: 10px;
// 			margin-bottom: 14px;
// 		}
// 		.cbd-scard {
// 			background: var(--card-bg,#fff);
// 			border: 1px solid var(--border-color,#d1d8dd);
// 			border-radius: 10px;
// 			padding: 14px 16px;
// 			border-left: 4px solid transparent;
// 			transition: box-shadow .15s;
// 		}
// 		.cbd-scard:hover { box-shadow: 0 2px 12px rgba(0,0,0,.08); }
// 		.cbd-scard--blue   { border-left-color:#378ADD; }
// 		.cbd-scard--green  { border-left-color:#639922; }
// 		.cbd-scard--purple { border-left-color:#7F77DD; }
// 		.cbd-scard--amber  { border-left-color:#BA7517; }
// 		.cbd-scard__top {
// 			display: flex;
// 			justify-content: space-between;
// 			align-items: flex-start;
// 		}
// 		.cbd-scard__label {
// 			font-size: 10px;
// 			font-weight: 700;
// 			text-transform: uppercase;
// 			letter-spacing: .6px;
// 			color: var(--text-muted,#8d99a6);
// 		}
// 		.cbd-scard__icon { font-size: 16px; }
// 		.cbd-scard__svg { display:flex; align-items:center; flex-shrink:0; }
// 		.cbd-scard__value {
// 			font-size: 22px;
// 			font-weight: 600;
// 			color: var(--text-color,#1c2126);
// 			margin-top: 8px;
// 			line-height: 1;
// 		}
// 		.cbd-scard__sub {
// 			font-size: 11px;
// 			color: var(--text-muted,#8d99a6);
// 			margin-top: 4px;
// 			display: flex;
// 			align-items: center;
// 			gap: 8px;
// 			flex-wrap: wrap;
// 		}
// 		.cbd-scard__drill {
// 			font-size: 10px;
// 			font-weight: 600;
// 			color: #378ADD;
// 			opacity: 0;
// 			transition: opacity .15s;
// 		}
// 		.cbd-scard:hover .cbd-scard__drill { opacity: 1; }
// 		.cbd-scard:hover { box-shadow: 0 4px 16px rgba(55,138,221,.15); border-color: #B5D4F4; }

// 		/* ── Progress ───────────────────────────── */
// 		.cbd-prog { height:4px; background:var(--border-color,#d1d8dd); border-radius:2px; margin-top:10px; overflow:hidden; }
// 		.cbd-prog__fill { height:100%; border-radius:2px; transition:width .5s ease; }
// 		.cbd-prog__fill--green { background:#639922; }
// 		.cbd-prog__fill--amber { background:#BA7517; }
// 		.cbd-prog__fill--red   { background:#E24B4A; }
// 		.cbd-prog__fill--blue  { background:#378ADD; }

// 		/* ── Section label ──────────────────────── */
// 		.cbd-section-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.9px; color:var(--text-muted,#8d99a6); margin-bottom:10px; margin-top:0; }

// 		/* ── Partners scroll ────────────────────── */
// 		#cbd_partners { max-height:calc(100vh - 320px); overflow-y:auto; padding-right:4px; }
// 		#cbd_partners::-webkit-scrollbar { width:4px; }
// 		#cbd_partners::-webkit-scrollbar-track { background:transparent; }
// 		#cbd_partners::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }

// 		/* ── Partner card ───────────────────────── */
// 		.cbd-partner { background:var(--card-bg,#fff); border:1px solid var(--border-color,#d1d8dd); border-radius:10px; margin-bottom:10px; overflow:hidden; }

// 		.cbd-partner__head { display:flex; align-items:flex-start; justify-content:space-between; padding:10px 14px; cursor:pointer; gap:16px; border-left:3px solid #378ADD; }
// 		.cbd-partner__head:hover { background:var(--control-bg,#f7f7f7); }
// 		.cbd-partner__left { flex:1; min-width:0; }

// 		.cbd-partner__name { font-size:14px; font-weight:600; color:var(--text-color,#1c2126); display:flex; align-items:center; gap:7px; }
// 		.cbd-partner__grants { font-size:13px; font-weight:500; color:var(--text-muted,#8d99a6); margin-top:4px; padding-left:22px; }

// 		.cbd-partner__metrics { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
// 		.cbd-metric { display:flex; flex-direction:column; background:var(--control-bg,#f7f7f7); border:1px solid var(--border-color,#d1d8dd); border-radius:6px; padding:3px 8px; min-width:72px; }
// 		.cbd-metric__label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-muted,#8d99a6); }
// 		.cbd-metric__value { font-size:12px; font-weight:600; color:var(--text-color,#1c2126); margin-top:1px; }

// 		.cbd-partner__footer { display:flex; align-items:stretch; margin-top:7px; border:1px solid var(--border-color,#d1d8dd); border-radius:8px; overflow:hidden; }
// 		.cbd-footer-block { flex:1; padding:5px 10px; display:flex; flex-direction:column; gap:5px; }
// 		.cbd-footer-block + .cbd-footer-block { border-left:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-footer-block__label { display:flex; align-items:center; gap:5px; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text-muted,#8d99a6); }
// 		.cbd-footer-block__tags { display:flex; flex-wrap:wrap; gap:4px; }

// 		.cbd-stag { display:inline-flex; align-items:center; gap:5px; border-radius:4px; padding:3px 8px; font-size:11px; font-weight:600; }
// 		.cbd-stag--blue   { background:#E6F1FB; color:#0C447C; }
// 		.cbd-stag--purple { background:#EEEDFE; color:#3C3489; }
// 		.cbd-stag--gray   { background:var(--control-bg,#f7f7f7); color:var(--text-muted,#8d99a6); }
// 		.cbd-stag__dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
// 		.cbd-stag__dot--blue   { background:#378ADD; }
// 		.cbd-stag__dot--purple { background:#7F77DD; }

// 		.cbd-partner__right { display:flex; flex-direction:column; align-items:flex-end; gap:10px; flex-shrink:0; padding-top:2px; }

// 		.cbd-badge { display:inline-flex; align-items:center; border-radius:6px; padding:4px 10px; font-size:12px; font-weight:600; white-space:nowrap; }
// 		.cbd-badge--green { background:#EAF3DE; color:#3B6D11; }
// 		.cbd-badge--amber { background:#FAEEDA; color:#854F0B; }
// 		.cbd-badge--red   { background:#FCEBEB; color:#A32D2D; }

// 		.cbd-chevron { font-size:11px; color:var(--text-muted,#8d99a6); transition:transform .2s ease; line-height:1; }
// 		.cbd-chevron--open { transform:rotate(90deg); }

// 		/* ── Detail table ───────────────────────── */
// 		.cbd-partner__body { display:none; border-top:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-tbl-wrap { overflow-x:auto; }
// 		.cbd-table {
// 			width: 100%;
// 			border-collapse: collapse;
// 			font-size: 12px;
// 			white-space: nowrap;
// 			border: 1px solid var(--border-color,#d1d8dd);
// 		}
// 		.cbd-table thead { position:sticky; top:0; z-index:1; }
// 		.cbd-table th {
// 			padding: 9px 12px;
// 			text-align: left;
// 			font-size: 10px;
// 			font-weight: 700;
// 			text-transform: uppercase;
// 			letter-spacing: .5px;
// 			color: var(--text-muted,#8d99a6);
// 			background: var(--control-bg,#f7f7f7);
// 			border: 1px solid var(--border-color,#d1d8dd);
// 		}
// 		.cbd-table td {
// 			padding: 8px 12px;
// 			color: var(--text-color,#1c2126);
// 			border: 1px solid var(--border-color,#d1d8dd);
// 			vertical-align: middle;
// 		}
// 		.cbd-table tbody tr:hover td { background: var(--control-bg,#f7f7f7); }
// 		.cbd-r { text-align:right !important; }

// 		.cbd-chip { display:inline-flex; align-items:center; border-radius:4px; padding:2px 7px; font-size:11px; font-weight:600; }
// 		.cbd-chip--blue   { background:#E6F1FB; color:#185FA5; }
// 		.cbd-chip--teal   { background:#E1F5EE; color:#0F6E56; }
// 		.cbd-chip--green  { background:#EAF3DE; color:#3B6D11; }
// 		.cbd-chip--amber  { background:#FAEEDA; color:#854F0B; }
// 		.cbd-chip--red    { background:#FCEBEB; color:#A32D2D; }

// 		/* ── Consolidated button (partner level) ── */
// 		.cbd-consolidated-btn {
// 			display: inline-flex;
// 			align-items: center;
// 			gap: 5px;
// 			padding: 4px 10px;
// 			font-size: 11px;
// 			font-weight: 600;
// 			color: #3C3489;
// 			background: #EEEDFE;
// 			border: 1px solid #AFA9EC;
// 			border-radius: 5px;
// 			cursor: pointer;
// 			white-space: nowrap;
// 			transition: background .15s;
// 		}
// 		.cbd-consolidated-btn:hover { background: #CECBF6; }

// 		/* ── Consolidated panel badge ───────────── */
// 		.cbd-panel__consolidated-badge {
// 			display: inline-flex;
// 			align-items: center;
// 			padding: 1px 7px;
// 			background: #534AB7;
// 			color: #fff;
// 			border-radius: 4px;
// 			font-size: 10px;
// 			font-weight: 700;
// 			letter-spacing: .4px;
// 			margin-right: 5px;
// 			vertical-align: middle;
// 		}

// 		/* ── View Line Items button ─────────────── */
// 		.cbd-view-btn {
// 			display: inline-flex;
// 			align-items: center;
// 			gap: 5px;
// 			padding: 4px 10px;
// 			font-size: 11px;
// 			font-weight: 600;
// 			color: #185FA5;
// 			background: #E6F1FB;
// 			border: none;
// 			border-radius: 5px;
// 			cursor: pointer;
// 			white-space: nowrap;
// 			transition: background .15s;
// 		}
// 		.cbd-view-btn:hover { background: #B5D4F4; }

// 		/* ── Overlay ────────────────────────────── */
// 		.cbd-overlay {
// 			display: none;
// 			position: fixed;
// 			inset: 0;
// 			background: rgba(0,0,0,.45);
// 			z-index: 2000;
// 		}
// 		.cbd-overlay--active { display:block; }

// 		/* ── Side panels ────────────────────────── */
// 		.cbd-panel-left,
// 		.cbd-panel-right {
// 			position: fixed;
// 			top: 0;
// 			bottom: 0;
// 			width: 44vw;
// 			max-width: 600px;
// 			min-width: 380px;
// 			background: var(--card-bg,#fff);
// 			z-index: 2001;
// 			display: flex;
// 			flex-direction: column;
// 			transition: transform .28s cubic-bezier(.4,0,.2,1);
// 			overflow: hidden;
// 		}
// 		.cbd-panel-left  { left:0;  transform:translateX(-100%); border-right:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-panel-right { right:0; transform:translateX(100%);  border-left:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-panel-left.cbd-panel--open  { transform:translateX(0); }
// 		.cbd-panel-right.cbd-panel--open { transform:translateX(0); }
// 		/* Full-width single panel (budget or utilisation only) */
// 		.cbd-panel-left.cbd-panel--full,
// 		.cbd-panel-right.cbd-panel--full {
// 			width: 60vw;
// 			max-width: 860px;
// 		}

// 		.cbd-panel__header {
// 			display: flex;
// 			align-items: flex-start;
// 			justify-content: space-between;
// 			padding: 16px 18px 14px;
// 			border-bottom: 1px solid var(--border-color,#d1d8dd);
// 			flex-shrink: 0;
// 		}
// 		.cbd-panel__title { font-size:14px; font-weight:700; color:var(--text-color,#1c2126); }
// 		.cbd-panel__sub   { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:3px; }
// 		.cbd-panel__close {
// 			background: none;
// 			border: none;
// 			font-size: 16px;
// 			cursor: pointer;
// 			color: var(--text-muted,#8d99a6);
// 			padding: 0 4px;
// 			line-height: 1;
// 		}
// 		.cbd-panel__close:hover { color:var(--text-color,#1c2126); }

// 		/* ── Month filter ───────────────────────── */
// 		.cbd-panel__filter {
// 			padding: 10px 18px;
// 			border-bottom: 1px solid var(--border-color,#d1d8dd);
// 			flex-shrink: 0;
// 		}
// 		.cbd-filter-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text-muted,#8d99a6); margin-bottom:7px; }


// 		/* ── Panel body ─────────────────────────── */
// 		.cbd-panel__body {
// 			flex: 1;
// 			overflow-y: auto;
// 			padding: 14px 18px;
// 		}
// 		.cbd-panel__body::-webkit-scrollbar { width:4px; }
// 		.cbd-panel__body::-webkit-scrollbar-track { background:transparent; }
// 		.cbd-panel__body::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }

// 		.cbd-panel-loading { text-align:center; color:var(--text-muted,#8d99a6); font-size:13px; padding:30px 0; }
// 		.cbd-panel-empty   { text-align:center; color:var(--text-muted,#8d99a6); font-size:13px; padding:30px 0; }

// 		/* ── Item groups ────────────────────────── */
// 		.cbd-item-group { margin-bottom:10px; border:1px solid var(--border-color,#d1d8dd); border-radius:7px; overflow:hidden; }
// 		.cbd-item-group__head {
// 			display: flex;
// 			justify-content: space-between;
// 			align-items: center;
// 			font-size: 10px;
// 			font-weight: 700;
// 			text-transform: uppercase;
// 			letter-spacing: .6px;
// 			color: #0C447C;
// 			background: #E6F1FB;
// 			padding: 6px 10px;
// 			border-radius: 0;
// 			margin-bottom: 0;
// 		}
// 		.cbd-item-group__total { font-size:12px; color:#0C447C; font-weight:700; }

// 		.cbd-item-row {
// 			display: flex;
// 			justify-content: space-between;
// 			align-items: center;
// 			padding: 6px 10px;
// 			border-bottom: 1px solid var(--border-color,#d1d8dd);
// 			gap: 16px;
// 		}
// 		.cbd-item-row:last-child { border-bottom:none; }
// 		.cbd-item-row:hover { background: var(--control-bg,#f7f7f7); }
// 		.cbd-item-row__left  { flex:1; min-width:0; }
// 		.cbd-item-row__right { flex-shrink:0; text-align:right; min-width:70px; }
// 		.cbd-item-row__name   { font-size:12px; font-weight:500; color:var(--text-color,#1c2126); line-height:1.3; }
// 		.cbd-item-row__sub    { font-size:10px; color:var(--text-muted,#8d99a6); margin-top:1px; }
// 		.cbd-item-row__note   { font-size:10px; color:var(--text-muted,#8d99a6); font-style:italic; margin-top:1px; }
// 		.cbd-item-row__amount { font-size:13px; font-weight:700; color:var(--text-color,#1c2126); }
// 		.cbd-item-row__years  { display:flex; gap:5px; flex-wrap:wrap; margin-top:3px; justify-content:flex-end; }
// 		.cbd-item-row__years span { font-size:10px; color:var(--text-muted,#8d99a6); background:var(--control-bg,#f7f7f7); padding:1px 5px; border-radius:3px; }





// 		/* ── Frappe navbar suppress when panels open ── */
// 		body.cbd-panels-open .navbar,
// 		body.cbd-panels-open .container-fluid.page-container > .row > .col:first-child {
// 			z-index: 1 !important;
// 		}

// 		/* ── Panel header actions ──────────────── */
// 		.cbd-panel__header-actions {
// 			display: flex;
// 			align-items: center;
// 			gap: 8px;
// 			flex-shrink: 0;
// 		}
// 		/* .cbd-close-both-btn removed — replaced by centre floating button */

// 		/* ── Line items table ───────────────────── */
// 		.cbd-li-table {
// 			width: 100%;
// 			border-collapse: collapse;
// 			font-size: 12px;
// 			border: 1px solid var(--border-color,#d1d8dd);
// 		}
// 		.cbd-li-table th {
// 			padding: 6px 10px;
// 			text-align: left;
// 			font-size: 10px;
// 			font-weight: 700;
// 			text-transform: uppercase;
// 			letter-spacing: .4px;
// 			color: var(--text-muted,#8d99a6);
// 			background: var(--control-bg,#f7f7f7);
// 			border: 1px solid var(--border-color,#d1d8dd);
// 			white-space: nowrap;
// 		}
// 		.cbd-li-table td {
// 			padding: 6px 10px;
// 			color: var(--text-color,#1c2126);
// 			border: 1px solid var(--border-color,#d1d8dd);
// 			vertical-align: middle;
// 		}
// 		.cbd-li-table tbody tr:hover td { background: var(--control-bg,#f7f7f7); }
// 		.cbd-li-r { text-align: right !important; }
// 		.cbd-li-amt { font-weight: 700; color: var(--text-color,#1c2126); }
// 		.cbd-li-name { font-size: 12px; font-weight: 500; color: var(--text-color,#1c2126); }
// 		.cbd-li-note { font-size: 10px; color: var(--text-muted,#8d99a6); font-style: italic; margin-top: 2px; }

// 		/* ── Collapsible group head ─────────────── */
// 		.cbd-item-group__head--toggle {
// 			cursor: pointer;
// 			user-select: none;
// 		}
// 		.cbd-item-group__head--toggle:hover {
// 			filter: brightness(.96);
// 		}
// 		.cbd-igh-left {
// 			display: flex;
// 			align-items: center;
// 			gap: 6px;
// 		}
// 		.cbd-igh-chevron {
// 			font-size: 9px;
// 			color: #0C447C;
// 			transition: transform .18s ease;
// 			display: inline-block;
// 		}
// 		.cbd-item-group__body {
// 			overflow: hidden;
// 			transition: max-height .22s ease;
// 			max-height: 2000px;
// 		}
// 		.cbd-item-group__body--collapsed {
// 			max-height: 0 !important;
// 		}

// 		/* ── Sticky panel total ─────────────────── */
// 		.cbd-panel__sticky-total {
// 			display: flex;
// 			justify-content: space-between;
// 			align-items: center;
// 			padding: 10px 18px;
// 			background: #E6F1FB;
// 			border-top: 1px solid #B5D4F4;
// 			font-size: 13px;
// 			font-weight: 700;
// 			color: #0C447C;
// 			flex-shrink: 0;
// 		}

// 		/* ── YTD bar ────────────────────────────── */
// 		.cbd-ytd-bar {
// 			display: flex;
// 			align-items: center;
// 			flex-wrap: wrap;
// 			gap: 6px;
// 			padding: 7px 10px;
// 			background: #EEEDFE;
// 			border-radius: 6px;
// 			margin-bottom: 10px;
// 			font-size: 11px;
// 			color: #3C3489;
// 		}
// 		.cbd-ytd-badge {
// 			display: inline-flex;
// 			align-items: center;
// 			padding: 2px 7px;
// 			background: #534AB7;
// 			color: #fff;
// 			border-radius: 4px;
// 			font-size: 10px;
// 			font-weight: 700;
// 			letter-spacing: .5px;
// 			flex-shrink: 0;
// 		}
// 		.cbd-ytd-label { color: #3C3489; }
// 		.cbd-ytd-label b { color: #26215C; }
// 		.cbd-ytd-month {
// 			display: inline-flex;
// 			padding: 1px 6px;
// 			background: #CECBF6;
// 			color: #26215C;
// 			border-radius: 3px;
// 			font-size: 10px;
// 			font-weight: 600;
// 			margin-left: 2px;
// 		}

// 		/* ── Month breakdown columns ─────────────── */
// 		.cbd-li-month-col {
// 			color: var(--text-muted,#8d99a6);
// 			font-size: 11px;
// 			white-space: nowrap;
// 		}
// 		.cbd-li-sub {
// 			color: var(--text-muted,#8d99a6);
// 			font-size: 11px;
// 		}

// 		/* ── Filter row (2 cols) ───────────────── */
// 		.cbd-filter-row {
// 			display: grid;
// 			grid-template-columns: 1fr 1fr;
// 			gap: 10px;
// 		}
// 		.cbd-filter-col { min-width: 0; }

// 		/* ── Frappe MultiSelectList overrides ───── */
// 		#cbd_month_multiselect .form-group,
// 		#cbd_fy_multiselect .form-group { margin-bottom: 0; }

// 		#cbd_month_multiselect .control-label,
// 		#cbd_fy_multiselect .control-label { display: none; }

// 		#cbd_month_multiselect .awesomplete,
// 		#cbd_fy_multiselect .awesomplete { width: 100%; }

// 		#cbd_month_multiselect input.input-with-feedback,
// 		#cbd_fy_multiselect input.input-with-feedback {
// 			height: 28px;
// 			padding: 3px 8px;
// 			font-size: 12px;
// 			border-radius: 5px;
// 		}
// 		#cbd_month_multiselect .multiselect-list,
// 		#cbd_fy_multiselect .multiselect-list {
// 			display: flex;
// 			flex-wrap: wrap;
// 			gap: 3px;
// 			margin-top: 5px;
// 		}
// 		#cbd_month_multiselect .btn-xs,
// 		#cbd_fy_multiselect .btn-xs {
// 			padding: 2px 7px;
// 			font-size: 11px;
// 			border-radius: 10px;
// 			background: #E6F1FB;
// 			color: #0C447C;
// 			border: 1px solid #B5D4F4;
// 		}
// 		#cbd_fy_multiselect .btn-xs {
// 			background: #EEEDFE;
// 			color: #3C3489;
// 			border-color: #AFA9EC;
// 		}

// 		/* ── Centre close button ───────────────── */
// 		.cbd-centre-close {
// 			position: fixed;
// 			top: 50%;
// 			left: 50%;
// 			transform: translate(-50%, -50%);
// 			z-index: 2005;
// 			display: none;
// 			align-items: center;
// 			gap: 6px;
// 			padding: 10px 18px;
// 			background: #1c2126;
// 			color: #fff;
// 			border: none;
// 			border-radius: 24px;
// 			font-size: 13px;
// 			font-weight: 600;
// 			cursor: pointer;
// 			box-shadow: 0 4px 20px rgba(0,0,0,.4);
// 			transition: background .15s, transform .15s;
// 		}
// 		.cbd-centre-close:hover {
// 			background: #A32D2D;
// 			transform: translate(-50%, -50%) scale(1.04);
// 		}
// 		.cbd-centre-close--visible { display: flex; }

// 		/* ── Expand-all checkbox ────────────────── */
// 		.cbd-expand-all-label {
// 			display: inline-flex;
// 			align-items: center;
// 			gap: 5px;
// 			font-size: 11px;
// 			font-weight: 500;
// 			color: var(--text-muted,#8d99a6);
// 			cursor: pointer;
// 			user-select: none;
// 			white-space: nowrap;
// 		}
// 		.cbd-expand-chk {
// 			width: 14px;
// 			height: 14px;
// 			cursor: pointer;
// 			accent-color: #378ADD;
// 		}

// 		/* ── Empty ──────────────────────────────── */
// 		.cbd-empty { padding:24px; text-align:center; color:var(--text-muted,#8d99a6); font-size:13px; }

// 		`;
// 		document.head.appendChild(style);

// 		// bind delegation after DOM is ready
// 		setTimeout(() => this._bind_view_buttons(), 0);
// 	}
// }




// frappe.pages['creche_budget_utilisation_summary'].on_page_load = function (wrapper) {
// 	const page = frappe.ui.make_app_page({
// 		parent: wrapper,
// 		title: 'Creche Budget & Utilisation Summary',
// 		single_column: true
// 	});
// 	new CrecheBudgetDashboard(page);
// };

// class CrecheBudgetDashboard {

// 	constructor(page) {
// 		this.page = page;
// 		this.panel = null;
// 		this._perm_scope = null;
// 		this.make();
// 		this._init_with_permissions();
// 	}

// 	// ─────────────────────────────────────────────
// 	// SCAFFOLD
// 	// ─────────────────────────────────────────────

// 	make() {
// 		this.page.main.html(`
// 			<div class="cbd-root">
// 				<div class="cbd-overview-strip" id="cbd_overview_strip" style="display:none"></div>
// 				<div class="cbd-summary-cards" id="cbd_summary_cards"></div>
// 				<div class="cbd-section-label">Partners &amp; Grants</div>
// 				<div id="cbd_partners"></div>
// 			</div>
// 		`);

// 		this.page.set_secondary_action('Clear all', () => this._clear_filters(), 'close');
// 		this.page.set_primary_action('Apply', () => this.load_data(this._get_effective_filters()), 'filter');

// 		this._inject_styles();
// 		this._ensure_panels();
// 		this._build_filters();
// 	}

// 	// ─────────────────────────────────────────────
// 	// PERMISSION-AWARE INITIAL LOAD
// 	// ─────────────────────────────────────────────

// 	_init_with_permissions() {
// 		frappe.dom.freeze('Loading…');
// 		frappe.call({
// 			method: 'creche_reports.api.budget_utilisation_summary.get_partner_options',
// 			args: { txt: '' },
// 		}).then(r => {
// 			frappe.dom.unfreeze();
// 			const rows = r.message || [];
// 			if (!rows.length) { this._render_no_access(); return; }

// 			const partner_ids = rows.map(r => r.name);
// 			this._partner_label_to_id = {};
// 			rows.forEach(r => { this._partner_label_to_id[r.partner_name || r.name] = r.name; });

// 			const f = this._fields && this._fields.partner_id;
// 			if (f) {
// 				const opts = rows.map(r => ({ value: r.partner_name || r.name, description: '' }));
// 				const orig = f.df.get_data;
// 				f.df.get_data = () => opts;
// 				try { f.set_value(opts.map(o => o.value)); } catch(e) {}
// 				f.df.get_data = orig;
// 			}
// 			this.load_data({ partner_id: partner_ids });
// 		}).catch(() => {
// 			frappe.dom.unfreeze();
// 			this.load_data({});
// 		});
// 	}

// 	_render_no_access() {
// 		const sc = document.getElementById('cbd_summary_cards');
// 		const pa = document.getElementById('cbd_partners');
// 		const ov = document.getElementById('cbd_overview_strip');
// 		if (sc) sc.innerHTML = '';
// 		if (ov) ov.style.display = 'none';
// 		if (pa) pa.innerHTML = `
// 			<div class="cbd-empty" style="padding:40px;text-align:center">
// 				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d8dd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px">
// 					<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
// 				</svg>
// 				<div style="font-size:14px;font-weight:600;color:#6b7280">No access</div>
// 				<div style="font-size:12px;color:#9ca3af;margin-top:4px">You do not have any partner assigned. Contact your administrator.</div>
// 			</div>`;
// 	}

// 	_get_effective_filters() { return this._get_filter_values(); }

// 	// ─────────────────────────────────────────────
// 	// FILTERS
// 	// ─────────────────────────────────────────────

// 	_build_filters() {
// 		const $root = $(this.page.main).find('.cbd-root');
// 		const $row1 = $(`<div class="frappe-control-group row custom-filter-row" id="cbd_frow1"></div>`).prependTo($root);
// 		const $row2 = $(`<div class="frappe-control-group row custom-filter-row" id="cbd_frow2"></div>`).insertAfter($row1);
// 		this._fields = {};
// 		this._sel    = {};

// 		const col = ($row, key) => $(`<div class="cbd-filter-col col-sm-12" id="cbd_fcol_${key}"></div>`).appendTo($row);

// 		// Partner
// 		const partner_ctrl = frappe.ui.form.make_control({
// 			parent: col($row1, 'partner_id'),
// 			df: {
// 				label: 'Partner', fieldtype: 'MultiSelectList', fieldname: 'partner_id',
// 				get_data: (txt) => frappe.call({
// 					method: 'creche_reports.api.budget_utilisation_summary.get_partner_options',
// 					args: { txt: txt || '' },
// 				}).then(r => {
// 					const rows = r.message || [];
// 					this._partner_label_to_id = this._partner_label_to_id || {};
// 					rows.forEach(p => { this._partner_label_to_id[p.partner_name || p.name] = p.name; });
// 					return rows.map(p => ({ value: p.partner_name || p.name, description: '' }));
// 				}),
// 				change: () => {
// 					['budget_ref','grant_id','state','district','block'].forEach(k => {
// 						const f = this._fields[k]; if (!f) return; f.set_value([]); f.refresh();
// 					});
// 					this._sel.partner_id = partner_ctrl.get_value() || [];
// 					this._on_filter_change('partner_id');
// 				},
// 			},
// 			render_input: true,
// 		});
// 		partner_ctrl.refresh();
// 		this._fields.partner_id = partner_ctrl;

// 		// Budget Reference
// 		const budget_ref_ctrl = frappe.ui.form.make_control({
// 			parent: col($row1, 'budget_ref'),
// 			df: {
// 				label: 'Budget Reference', fieldtype: 'MultiSelectList', fieldname: 'budget_ref',
// 				get_data: (txt) => {
// 					const raw = (this._fields.partner_id?.get_value() || []);
// 					const partners = raw.map(l => (this._partner_label_to_id && this._partner_label_to_id[l]) || l);
// 					const filters = {};
// 					if (partners.length) filters.partner_id = ['in', partners];
// 					if (txt) filters.budget_reference_name = ['like', `%${txt}%`];
// 					return frappe.db.get_list('Creche Budget', { filters, fields: ['budget_reference_name'], limit: 50 })
// 						.then(rows => [...new Set(rows.map(r => r.budget_reference_name).filter(Boolean))].map(v => ({ value: v, description: '' })));
// 				},
// 				change: () => { this._sel.budget_ref = budget_ref_ctrl.get_value() || []; },
// 			},
// 			render_input: true,
// 		});
// 		budget_ref_ctrl.refresh();
// 		this._fields.budget_ref = budget_ref_ctrl;

// 		// Grant ID
// 		const grant_id_ctrl = frappe.ui.form.make_control({
// 			parent: col($row1, 'grant_id'),
// 			df: {
// 				label: 'Grant ID', fieldtype: 'MultiSelectList', fieldname: 'grant_id',
// 				get_data: (txt) => {
// 					const raw = (this._fields.partner_id?.get_value() || []);
// 					const partners = raw.map(l => (this._partner_label_to_id && this._partner_label_to_id[l]) || l);
// 					const filters = {};
// 					if (partners.length) filters.partner_id = ['in', partners];
// 					if (txt) filters.grant_id = ['like', `%${txt}%`];
// 					return frappe.db.get_list('Creche Budget', { filters, fields: ['grant_id'], limit: 50 })
// 						.then(rows => [...new Set(rows.map(r => r.grant_id).filter(Boolean))].map(v => ({ value: v, description: '' })));
// 				},
// 				change: () => { this._sel.grant_id = grant_id_ctrl.get_value() || []; },
// 			},
// 			render_input: true,
// 		});
// 		grant_id_ctrl.refresh();
// 		this._fields.grant_id = grant_id_ctrl;

// 		// Financial Year
// 		const fy_ctrl = frappe.ui.form.make_control({
// 			parent: col($row1, 'financial_year'),
// 			df: {
// 				label: 'Financial Year', fieldtype: 'MultiSelectList', fieldname: 'financial_year',
// 				get_data: (txt) => frappe.db.get_list('Financial year', {
// 					fields: ['name'], limit: 50, order_by: 'name desc',
// 					...(txt ? { filters: { name: ['like', `%${txt}%`] } } : {}),
// 				}).then(rows => rows.map(r => ({ value: r.name, description: '' }))),
// 				change: () => { this._sel.financial_year = fy_ctrl.get_value() || []; this._on_filter_change('financial_year'); },
// 			},
// 			render_input: true,
// 		});
// 		fy_ctrl.refresh();
// 		this._fields.financial_year = fy_ctrl;

// 		// Month
// 		const month_ctrl = frappe.ui.form.make_control({
// 			parent: col($row1, 'month'),
// 			df: {
// 				label: 'Month', fieldtype: 'MultiSelectList', fieldname: 'month',
// 				get_data: (txt) => {
// 					const ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];
// 					return frappe.db.get_list('Months', { fields: ['name'], limit: 12 })
// 						.then(rows => rows.filter(r => !txt || r.name.toLowerCase().includes(txt.toLowerCase()))
// 							.sort((a,b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name))
// 							.map(r => ({ value: r.name, description: '' })));
// 				},
// 				change: () => { this._sel.month = month_ctrl.get_value() || []; this._on_filter_change('month'); },
// 			},
// 			render_input: true,
// 		});
// 		month_ctrl.refresh();
// 		this._fields.month = month_ctrl;

// 		// Start/End Date
// 		const start_ctrl = frappe.ui.form.make_control({
// 			parent: col($row2, 'start_date'),
// 			df: { label: 'Start Date', fieldtype: 'Date', fieldname: 'start_date', change: () => { this._sel.start_date = start_ctrl.get_value() || ''; this._on_filter_change('start_date'); } },
// 			render_input: true,
// 		});
// 		start_ctrl.refresh();
// 		this._fields.start_date = start_ctrl;

// 		const end_ctrl = frappe.ui.form.make_control({
// 			parent: col($row2, 'end_date'),
// 			df: { label: 'End Date', fieldtype: 'Date', fieldname: 'end_date', change: () => { this._sel.end_date = end_ctrl.get_value() || ''; this._on_filter_change('end_date'); } },
// 			render_input: true,
// 		});
// 		end_ctrl.refresh();
// 		this._fields.end_date = end_ctrl;

// 		// State / District / Block
// 		['state','district','block'].forEach(key => {
// 			const ctrl = frappe.ui.form.make_control({
// 				parent: col($row2, key),
// 				df: {
// 					label: key.charAt(0).toUpperCase() + key.slice(1),
// 					fieldtype: 'MultiSelectList', fieldname: key,
// 					get_data: (txt) => {
// 						const raw = (this._fields.partner_id?.get_value() || []);
// 						const partners = raw.map(l => (this._partner_label_to_id && this._partner_label_to_id[l]) || l);
// 						const filters = {};
// 						if (partners.length) filters.partner_id = ['in', partners];
// 						if (txt) filters[key] = ['like', `%${txt}%`];
// 						return frappe.db.get_list('Creche Budget', { filters, fields: [key], limit: 100 })
// 							.then(rows => [...new Set(rows.map(r => r[key]).filter(Boolean))].sort().map(v => ({ value: v, description: '' })));
// 					},
// 					change: () => { this._sel[key] = ctrl.get_value() || []; },
// 				},
// 				render_input: true,
// 			});
// 			ctrl.refresh();
// 			this._fields[key] = ctrl;
// 		});
// 	}

// 	_ensure_panels() {
// 		if (document.getElementById('cbd_overlay')) return;
// 		const overlay = document.createElement('div');
// 		overlay.className = 'cbd-overlay'; overlay.id = 'cbd_overlay';
// 		const left  = document.createElement('div'); left.className  = 'cbd-panel-left';  left.id  = 'cbd_panel_left';
// 		const right = document.createElement('div'); right.className = 'cbd-panel-right'; right.id = 'cbd_panel_right';
// 		// Disbursement modal — centered dialog (not a side panel)
// 		const disb_modal   = document.createElement('div');
// 		disb_modal.id        = 'cbd_disb_modal';
// 		disb_modal.className = 'cbd-disb-modal';
// 		const disb_overlay   = document.createElement('div');
// 		disb_overlay.id        = 'cbd_disb_overlay';
// 		disb_overlay.className = 'cbd-disb-overlay';

// 		const centre = document.createElement('button');
// 		centre.id = 'cbd_centre_close'; centre.className = 'cbd-centre-close'; centre.title = 'Close both panels';
// 		centre.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span>Close both</span>`;

// 		document.body.appendChild(overlay);
// 		document.body.appendChild(left);
// 		document.body.appendChild(right);
// 		document.body.appendChild(disb_overlay);
// 		document.body.appendChild(disb_modal);
// 		document.body.appendChild(centre);

// 		disb_overlay.addEventListener('click', () => this._close_disb_panel());

// 		overlay.addEventListener('click', () => this._close_all_panels());
// 		centre.addEventListener('click',  () => this._close_panels());

// 		[left, right].forEach(panel => {
// 			panel.addEventListener('change', e => {
// 				const chk = e.target.closest('.cbd-expand-all');
// 				if (!chk) return;
// 				const expand = chk.checked;
// 				const body = panel.querySelector('.cbd-panel__body');
// 				if (!body) return;
// 				body.querySelectorAll('.cbd-item-group__body').forEach(b => b.classList.toggle('cbd-item-group__body--collapsed', !expand));
// 				body.querySelectorAll('.cbd-igh-chevron').forEach(chv => { chv.style.transform = expand ? '' : 'rotate(-90deg)'; });
// 			});
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// FILTER HELPERS
// 	// ─────────────────────────────────────────────

// 	_get_val(key) {
// 		const f = this._fields && this._fields[key];
// 		if (!f) return [];
// 		const v = f.get_value();
// 		if (!v) return [];
// 		if (Array.isArray(v)) return v.filter(Boolean);
// 		return [v];
// 	}

// 	_get_filter_values() {
// 		const v = {};
// 		['partner_id','budget_ref','grant_id','financial_year','month','state','district','block'].forEach(k => {
// 			let arr = this._get_val(k);
// 			if (arr.length) {
// 				if (k === 'partner_id' && this._partner_label_to_id) {
// 					arr = arr.map(label => this._partner_label_to_id[label] || label);
// 				}
// 				v[k] = arr;
// 			}
// 		});
// 		['start_date','end_date'].forEach(k => {
// 			const f = this._fields && this._fields[k];
// 			const val = f ? f.get_value() : '';
// 			if (val) v[k] = val;
// 		});
// 		return v;
// 	}

// 	_on_filter_change(key) {
// 		const has_date = !!(this._fields.start_date?.get_value() || this._fields.end_date?.get_value());
// 		const has_mfy  = !!(this._get_val('month').length || this._get_val('financial_year').length);
// 		if ((key === 'start_date' || key === 'end_date') && has_date) {
// 			['month','financial_year'].forEach(k => { this._fields[k]?.set_value([]); const c = document.getElementById('cbd_fcol_' + k); if (c) c.style.display = 'none'; });
// 		} else if ((key === 'month' || key === 'financial_year') && has_mfy) {
// 			['start_date','end_date'].forEach(k => { this._fields[k]?.set_value(''); const c = document.getElementById('cbd_fcol_' + k); if (c) c.style.display = 'none'; });
// 		} else if (!has_date && !has_mfy) {
// 			['month','financial_year','start_date','end_date'].forEach(k => { const c = document.getElementById('cbd_fcol_' + k); if (c) c.style.display = ''; });
// 		}
// 	}

// 	_clear_filters() {
// 		Object.entries(this._fields || {}).forEach(([k, f]) => { try { f.set_value(f.df.fieldtype === 'Date' ? '' : []); } catch(e) {} });
// 		['month','financial_year','start_date','end_date'].forEach(k => { const c = document.getElementById('cbd_fcol_' + k); if (c) c.style.display = ''; });
// 		this.load_data({});
// 	}

// 	// ─────────────────────────────────────────────
// 	// DATA
// 	// ─────────────────────────────────────────────

// 	load_data(filters) {
// 		frappe.call({
// 			method: 'creche_reports.api.budget_utilisation_summary.get_partner_budget_summary',
// 			freeze: true,
// 			freeze_message: 'Loading budget summary…',
// 			args: { filters: filters || {} },
// 			callback: (r) => {
// 				if (!r.message) return;
// 				this.render_summary(r.message.summary);
// 				this.render_partners(r.message.partners);
// 			}
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// SUMMARY CARDS
// 	// ─────────────────────────────────────────────

// 	render_summary(s) {
// 		if (!s) return;
// 		const el = document.getElementById('cbd_summary_cards');
// 		if (!el) return;

// 		const cards = [
// 			{
// 				label: 'Total Budget', value: this._fmt(s.total_budget),
// 				sub: 'Approved budget', accent: 'blue', panel: 'budget', drill: 'View budget items →',
// 				icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
// 			},
// 			{
// 				label: 'Total Utilisation', value: this._fmt(s.total_utilisation),
// 				sub: 'Reported utilisation', accent: 'green', panel: 'utilisation', drill: 'View utilisation →',
// 				icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#639922" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
// 			},
// 			{
// 				label: 'Total Disbursement', value: this._fmt(s.total_disbursement),
// 				sub: 'Released amount', accent: 'purple', panel: 'disbursement', drill: 'View disbursements →',
// 				icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>`,
// 			},
// 		];

// 		el.innerHTML = cards.map(c => `
// 			<div class="cbd-scard cbd-scard--${c.accent}" data-panel="${c.panel}" style="cursor:pointer" title="${c.drill}">
// 				<div class="cbd-scard__top">
// 					<span class="cbd-scard__label">${c.label}</span>
// 					<span class="cbd-scard__svg">${c.icon}</span>
// 				</div>
// 				<div class="cbd-scard__value">${c.value}</div>
// 				<div class="cbd-scard__sub">${c.sub}<span class="cbd-scard__drill">${c.drill}</span></div>
// 			</div>
// 		`).join('');

// 		el.querySelectorAll('.cbd-scard').forEach(card => {
// 			card.addEventListener('click', () => {
// 				const panel = card.dataset.panel;
// 				if (panel === 'disbursement') {
// 					const all_partner_ids = (this._all_partners || []).map(p => p.partner_id).filter(Boolean);
// 					this._open_disbursement_panel('Overall Disbursements', null, all_partner_ids);
// 				} else {
// 					this._open_overall_panels(panel);
// 				}
// 			});
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// OVERVIEW STRIP  (with Total Creches added)
// 	// ─────────────────────────────────────────────

// 	_render_overview_strip(partners) {
// 		const el = document.getElementById('cbd_overview_strip');
// 		if (!el) return;
// 		if (!partners.length) { el.style.display = 'none'; return; }

// 		const num_partners  = partners.length;
// 		const num_budgets   = partners.reduce((s, p) => s + (p.budgets || []).length, 0);
// 		const total_creches = partners.reduce((s, p) => s + (p.total_creches || 0), 0);
// 		const all_states    = [...new Set(partners.flatMap(p => (p.budgets || []).map(b => b.state).filter(Boolean)))];
// 		const all_districts = [...new Set(partners.flatMap(p => (p.budgets || []).flatMap(b => b.district ? [b.district] : [])))];
// 		const all_blocks    = [...new Set(partners.flatMap(p => (p.budgets || []).flatMap(b => b.block ? [b.block] : [])))];

// 		const stats = [
// 			{
// 				value: num_partners, label: 'Partner' + (num_partners !== 1 ? 's' : ''),
// 				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
// 			},
// 			{
// 				value: num_budgets, label: 'Allocated Budget' + (num_budgets !== 1 ? 's' : ''),
// 				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
// 			},
// 			{
// 				// ← NEW: Total Creches in overview strip
// 				value: total_creches.toLocaleString('en-IN'),
// 				label: 'Total Creche' + (total_creches !== 1 ? 's' : ''),
// 				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
// 			},
// 			{
// 				value: all_states.length, label: 'Working State' + (all_states.length !== 1 ? 's' : ''),
// 				tip: all_states.join(', ') || '—',
// 				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
// 			},
// 			{
// 				value: all_districts.length, label: 'District' + (all_districts.length !== 1 ? 's' : ''),
// 				tip: all_districts.join(', ') || '—',
// 				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
// 			},
// 			{
// 				value: all_blocks.length, label: 'Block' + (all_blocks.length !== 1 ? 's' : ''),
// 				tip: all_blocks.join(', ') || '—',
// 				icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
// 			},
// 		];

// 		el.style.display = '';
// 		el.innerHTML = stats.map(s => `
// 			<div class="cbd-ostat" ${s.tip ? `title="${frappe.utils.escape_html(s.tip)}"` : ''}>
// 				<span class="cbd-ostat__icon">${s.icon}</span>
// 				<div class="cbd-ostat__body">
// 					<div class="cbd-ostat__value">${s.value}</div>
// 					<div class="cbd-ostat__label">${s.label}</div>
// 				</div>
// 			</div>
// 		`).join('');
// 	}

// 	// ─────────────────────────────────────────────
// 	// PARTNER ACCORDIONS
// 	// ─────────────────────────────────────────────

// 	render_partners(partners) {
// 		this._all_partners = partners || [];
// 		this._render_overview_strip(partners || []);
// 		const el = document.getElementById('cbd_partners');
// 		if (!partners || !partners.length) { el.innerHTML = '<div class="cbd-empty">No partner data available.</div>'; return; }
// 		el.innerHTML = '';

// 		partners.forEach((partner, idx) => {
// 			const u_pct     = parseFloat(partner.utilised_pct) || 0;
// 			const badge_cls = this._badge_cls(u_pct);
// 			const fill_cls  = this._fill_cls(u_pct);
// 			const total_creches = (partner.budgets || []).reduce((s, b) => s + (parseInt(b.no_of_creches) || 0), 0);
// 			const states = [...new Set((partner.budgets || []).map(b => b.state).filter(Boolean))].sort();
// 			const refs   = [...new Set((partner.budgets || []).map(b => b.budget_reference_name).filter(Boolean))].sort();

// 			const state_tags = states.length
// 				? states.map(s => `<span class="cbd-stag cbd-stag--blue"><span class="cbd-stag__dot cbd-stag__dot--blue"></span>${frappe.utils.escape_html(s)}</span>`).join('')
// 				: '<span class="cbd-stag cbd-stag--gray">—</span>';
// 			const ref_tags = refs.length
// 				? refs.map(r => `<span class="cbd-stag cbd-stag--purple"><span class="cbd-stag__dot cbd-stag__dot--purple"></span>${frappe.utils.escape_html(r)}</span>`).join('')
// 				: '<span class="cbd-stag cbd-stag--gray">—</span>';

// 			const budget_ids_str  = frappe.utils.escape_html((partner.budgets || []).map(b => b.budget_id).join(','));
// 			const partner_id_esc  = frappe.utils.escape_html(partner.partner_id || '');
// 			const partner_name_esc = frappe.utils.escape_html(partner.partner_name || '');

// 			const card = document.createElement('div');
// 			card.className = 'cbd-partner';
// 			card.innerHTML = `
// 				<div class="cbd-partner__head" id="cbd_ph_${idx}">
// 					<div class="cbd-partner__left">
// 						<div class="cbd-partner__name">${this._icon_partner()}${partner_name_esc}</div>
// 						<div class="cbd-partner__grants">Grants: ${frappe.utils.escape_html(partner.grant_ids || '—')}</div>
// 						<div class="cbd-partner__metrics">
// 							${this._metric('Budget',        this._fmt(partner.total_budget))}
// 							${this._metric('Disbursed',     this._fmt(partner.total_disbursement))}
// 							${this._metric('Utilised',      this._fmt(partner.total_utilisation))}
// 							${this._metric('Bal. Budget',   this._fmt(partner.total_balance_budget))}
// 							${this._metric('Bank Bal.',     this._fmt(partner.total_bank_balance))}
// 							${this._metric('Interest',      this._fmt(partner.total_interest))}
// 							${this._metric('Total Creches', total_creches)}
// 							${this._metric_pct('Util % of Budget',    u_pct)}
// 							${this._metric_pct('Util % vs Disbursed', this._util_vs_disb_pct(partner))}
// 						</div>
// 						<div class="cbd-partner__footer">
// 							<div class="cbd-footer-block">
// 								<div class="cbd-footer-block__label">
// 									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
// 									Operating States
// 								</div>
// 								<div class="cbd-footer-block__tags">${state_tags}</div>
// 							</div>
// 							<div class="cbd-footer-block">
// 								<div class="cbd-footer-block__label">
// 									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
// 									Budget References
// 								</div>
// 								<div class="cbd-footer-block__tags">${ref_tags}</div>
// 							</div>
// 						</div>
// 						<div class="cbd-prog" style="margin-top:7px">
// 							<div class="cbd-prog__fill cbd-prog__fill--${fill_cls}" style="width:${Math.min(u_pct,100)}%"></div>
// 						</div>
// 					</div>
// 					<div class="cbd-partner__right">
// 						<div class="cbd-badge cbd-badge--${badge_cls}">${u_pct.toFixed(1)}% utilised</div>
// 						<div class="cbd-partner__btn-group">
// 							<!-- Consolidated — icon only -->
// 							<button class="cbd-consolidated-btn cbd-icon-btn" title="View Consolidated Budget &amp; Utilisation"
// 								data-partner-name="${partner_name_esc}"
// 								data-budget-ids="${budget_ids_str}"
// 								data-grant-start="${frappe.utils.escape_html((partner.budgets || []).map(b => b.grant_start).filter(Boolean).sort()[0] || '')}"
// 								data-grant-end="${frappe.utils.escape_html((partner.budgets || []).map(b => b.grant_end).filter(Boolean).sort().reverse()[0] || '')}">
// 								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
// 							</button>
// 							<!-- Disbursement — icon only -->
// 							<button class="cbd-disb-btn cbd-icon-btn" title="View Disbursements"
// 								data-partner-name="${partner_name_esc}"
// 								data-partner-id="${partner_id_esc}"
// 								data-budget-ids="${budget_ids_str}">
// 								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>
// 							</button>
// 						</div>
// 						<div class="cbd-chevron" id="cbd_chv_${idx}">&#9654;</div>
// 					</div>
// 				</div>
// 				<div class="cbd-partner__body" id="cbd_pb_${idx}">
// 					${this._build_table(partner.budgets || [], partner.partner_name || '')}
// 				</div>
// 			`;
// 			el.appendChild(card);

// 			card.querySelector(`#cbd_ph_${idx}`).addEventListener('click', (e) => {
// 				if (e.target.closest('.cbd-consolidated-btn') || e.target.closest('.cbd-disb-btn')) return;
// 				const body = document.getElementById(`cbd_pb_${idx}`);
// 				const chv  = document.getElementById(`cbd_chv_${idx}`);
// 				const open = body.style.display === 'block';
// 				body.style.display = open ? 'none' : 'block';
// 				chv.classList.toggle('cbd-chevron--open', !open);
// 			});
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// DETAIL TABLE
// 	// ─────────────────────────────────────────────

// 	_build_table(budgets, partner_name) {
// 		if (!budgets.length) return '<div class="cbd-empty">No budget rows.</div>';
// 		const rows = budgets.map(r => {
// 			const u_pct  = parseFloat(r.utilised_pct)             || 0;
// 			const ud_pct = parseFloat(r.utilised_disbursement_pct) || 0;
// 			return `
// 				<tr>
// 					<td><span class="cbd-chip cbd-chip--blue">${frappe.utils.escape_html(r.budget_reference_name || '—')}</span></td>
// 					<td><span class="cbd-chip cbd-chip--teal">${frappe.utils.escape_html(r.grant_id || '—')}</span></td>
// 					<td>${frappe.utils.escape_html(r.financial_year || '—')}</td>
// 					<td>${frappe.utils.escape_html(r.state || '—')}</td>
// 					<td>${this._date(r.grant_start)}</td>
// 					<td>${this._date(r.grant_end)}</td>
// 					<td class="cbd-r">${r.no_of_creches || 0}</td>
// 					<td class="cbd-r">${this._fmt(r.budget)}</td>
// 					<td class="cbd-r">${this._fmt(r.disbursement)}</td>
// 					<td class="cbd-r">${this._fmt(r.utilisation)}</td>
// 					<td class="cbd-r"><span class="cbd-chip cbd-chip--${this._chip_cls(u_pct)}">${u_pct.toFixed(1)}%</span></td>
// 					<td class="cbd-r"><span class="cbd-chip cbd-chip--${this._chip_cls(ud_pct)}">${ud_pct.toFixed(1)}%</span></td>
// 					<td class="cbd-r">${this._fmt(r.balance_budget_amount)}</td>
// 					<td class="cbd-r">${this._fmt(r.bank_balance)}</td>
// 					<td class="cbd-r">${this._fmt(r.interest_from_bank)}</td>
// 					<td class="cbd-actions-cell">
// 						<button class="cbd-view-btn cbd-icon-btn" title="View Line Items"
// 							data-budget-id="${frappe.utils.escape_html(r.budget_id)}"
// 							data-ref-name="${frappe.utils.escape_html(r.budget_reference_name || '')}"
// 							data-grant-start="${frappe.utils.escape_html(r.grant_start || '')}"
// 							data-grant-end="${frappe.utils.escape_html(r.grant_end || '')}">
// 							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
// 						</button>
// 						<button class="cbd-row-disb-btn cbd-icon-btn" title="View Disbursements"
// 							data-budget-id="${frappe.utils.escape_html(r.budget_id)}"
// 							data-ref-name="${frappe.utils.escape_html(r.budget_reference_name || '')}">
// 							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>
// 						</button>
// 					</td>
// 				</tr>
// 			`;
// 		}).join('');

// 		return `
// 			<div class="cbd-tbl-wrap">
// 				<table class="cbd-table" role="table" aria-label="Budget rows for ${frappe.utils.escape_html(partner_name)}">
// 					<thead><tr>
// 						<th>Reference</th><th>Grant ID</th><th>FY</th><th>State</th>
// 						<th>Start</th><th>End</th>
// 						<th class="cbd-r">Creches</th><th class="cbd-r">Budget</th>
// 						<th class="cbd-r">Disbursed</th><th class="cbd-r">Utilised</th>
// 						<th class="cbd-r">Util %</th><th class="cbd-r">Util vs Disb.</th>
// 						<th class="cbd-r">Bal. Budget</th><th class="cbd-r">Bank Bal.</th>
// 						<th class="cbd-r">Interest</th><th class="cbd-actions-col">Actions</th>
// 					</tr></thead>
// 					<tbody>${rows}</tbody>
// 				</table>
// 			</div>
// 		`;
// 	}

// 	// ─────────────────────────────────────────────
// 	// DISBURSEMENT — Right Side Panel
// 	// ─────────────────────────────────────────────

// 	_open_disbursement_panel(title, budget_ids, partner_ids) {
// 		const overlay = document.getElementById('cbd_disb_overlay');
// 		const panel   = document.getElementById('cbd_disb_modal');

// 		overlay.classList.add('cbd-disb-overlay--active');
// 		panel.classList.add('cbd-disb-modal--open');

// 		panel.innerHTML = `
// 			<div class="cbd-panel__header">
// 				<div>
// 					<div class="cbd-panel__title">
// 						<span class="cbd-panel__disb-badge">Disbursement</span>
// 					</div>
// 					<div class="cbd-panel__sub">${frappe.utils.escape_html(title)}</div>
// 				</div>
// 				<div class="cbd-panel__header-actions">
// 					<label class="cbd-expand-all-label" title="Expand / collapse all partners">
// 						<input type="checkbox" class="cbd-expand-chk" id="cbd_disb_expand_all">
// 						Expand all
// 					</label>
// 					<button class="cbd-panel__close" id="cbd_close_disb" title="Close">&#10005;</button>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__body" id="cbd_disb_body">
// 				<div class="cbd-panel-loading">Loading…</div>
// 			</div>
// 			<div class="cbd-panel__sticky-total" id="cbd_disb_total" style="display:none">
// 				<span>Grand Total Disbursed</span>
// 				<span id="cbd_disb_total_val">—</span>
// 			</div>
// 		`;

// 		document.getElementById('cbd_close_disb').addEventListener('click', () => this._close_disb_panel());

// 		// Expand / collapse all partner groups
// 		document.getElementById('cbd_disb_expand_all').addEventListener('change', (e) => {
// 			const expand = e.target.checked;
// 			const body   = document.getElementById('cbd_disb_body');
// 			if (!body) return;
// 			body.querySelectorAll('.cbd-item-group__body').forEach(b => {
// 				b.classList.toggle('cbd-item-group__body--collapsed', !expand);
// 			});
// 			body.querySelectorAll('.cbd-igh-chevron').forEach(chv => {
// 				chv.style.transform = expand ? '' : 'rotate(-90deg)';
// 			});
// 		});

// 		this._load_disbursement_panel_data(budget_ids, partner_ids);
// 	}

// 	_close_disb_panel() {
// 		const panel   = document.getElementById('cbd_disb_modal');
// 		const overlay = document.getElementById('cbd_disb_overlay');
// 		if (panel)   panel.classList.remove('cbd-disb-modal--open');
// 		if (overlay) overlay.classList.remove('cbd-disb-overlay--active');
// 	}

// 	_load_disbursement_panel_data(budget_ids, partner_ids) {
// 		frappe.call({
// 			method: 'creche_reports.api.budget_utilisation_summary.get_disbursement_panel_data',
// 			args: {
// 				budget_ids:  budget_ids  ? JSON.stringify(budget_ids)  : null,
// 				partner_ids: partner_ids ? JSON.stringify(partner_ids) : null,
// 			},
// 			callback: (r) => {
// 				const records = r.message || [];
// 				const body    = document.getElementById('cbd_disb_body');
// 				if (!body) return;

// 				const flt = v => parseFloat(v) || 0;

// 				if (!records.length) {
// 					body.innerHTML = '<div class="cbd-panel-empty">No disbursement records found.</div>';
// 					return;
// 				}

// 				// Group by partner
// 				const by_partner = {};
// 				records.forEach(doc => {
// 					const key = doc.partner_id || doc.partner_name || 'Unknown';
// 					if (!by_partner[key]) by_partner[key] = {
// 						name: doc.partner_name || doc.partner_id || 'Unknown',
// 						docs: [], total: 0,
// 					};
// 					by_partner[key].docs.push(doc);
// 					by_partner[key].total += flt(doc.total_disbursement);
// 				});

// 				const grand_total = Object.values(by_partner).reduce((s, p) => s + p.total, 0);
// 				body.innerHTML = '';

// 				Object.values(by_partner).forEach((partner, pidx) => {
// 					const p_id = `cbd_dp_${pidx}`;
// 					const b_pct_cls = grand_total > 0
// 						? (partner.total / grand_total * 100 >= 80 ? 'green' : partner.total / grand_total * 100 >= 50 ? 'amber' : 'red')
// 						: 'red';

// 					// ── Partner accordion block (same as cbd-item-group) ──────
// 					const grp = document.createElement('div');
// 					grp.className = 'cbd-item-group';
// 					grp.innerHTML = `
// 						<div class="cbd-item-group__head cbd-item-group__head--toggle cbd-dt__p-head" id="cbd_ph_${pidx}">
// 							<div class="cbd-igh-left">
// 								<span class="cbd-igh-chevron">&#9660;</span>
// 								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
// 								<span>${frappe.utils.escape_html(partner.name)}</span>
// 								<span class="cbd-dt__partner-count">${partner.docs.length} budget${partner.docs.length !== 1 ? 's' : ''}</span>
// 							</div>
// 							<span class="cbd-item-group__total">${this._fmt(partner.total)}</span>
// 						</div>
// 						<div class="cbd-item-group__body" id="${p_id}">
// 							<div class="cbd-dt-wrap">
// 								<table class="cbd-dt" id="cbd_dt_${pidx}">
// 									<thead>
// 										<tr class="cbd-dt__head-row">
// 											<th style="width:32px"></th>
// 											<th>Reference</th>
// 											<th>Grant ID</th>
// 											<th>State</th>
// 											<th>FY</th>
// 											<th class="cbd-li-r">Budget</th>
// 											<th class="cbd-li-r">Disbursed</th>
// 											<th class="cbd-li-r">Balance</th>
// 											<th class="cbd-li-r">%</th>
// 										</tr>
// 									</thead>
// 									<tbody id="cbd_dtb_${pidx}"></tbody>
// 								</table>
// 							</div>
// 							<div class="cbd-dt__subtotal-row">
// 								<span class="cbd-dt__subtotal-label">Partner Total</span>
// 								<span style="font-weight:700;color:#0C447C">${this._fmt(partner.total)}</span>
// 							</div>
// 						</div>
// 					`;
// 					body.appendChild(grp);

// 					// Toggle partner accordion
// 					grp.querySelector(`#cbd_ph_${pidx}`).addEventListener('click', () => {
// 						const pb  = document.getElementById(p_id);
// 						const chv = grp.querySelector('.cbd-igh-chevron');
// 						const collapsed = pb.classList.toggle('cbd-item-group__body--collapsed');
// 						chv.style.transform = collapsed ? 'rotate(-90deg)' : '';
// 					});

// 					// ── Budget rows inside partner ────────────────────────────
// 					const tbody = grp.querySelector(`#cbd_dtb_${pidx}`);

// 					partner.docs.forEach((doc, bidx) => {
// 						const b_pct   = flt(doc.total_budget) > 0
// 							? Math.min((flt(doc.total_disbursement) / flt(doc.total_budget)) * 100, 100) : 0;
// 						const pct_cls = b_pct >= 80 ? 'green' : b_pct >= 50 ? 'amber' : 'red';
// 						const d_id    = `cbd_dtr_${pidx}_${bidx}`;

// 						// Budget summary row
// 						const b_row = document.createElement('tr');
// 						b_row.className = 'cbd-dt__b-row';
// 						b_row.innerHTML = `
// 							<td style="width:32px;text-align:center;border-right:1px solid var(--border-color,#d1d8dd)">
// 								<span class="cbd-dt__chevron" style="font-size:9px;color:var(--text-muted,#8d99a6)">&#9654;</span>
// 							</td>
// 							<td class="cbd-dt__ref-cell">${frappe.utils.escape_html(doc.budget_reference_name || doc.budget_reference_id || '—')}</td>
// 							<td>${doc.grant_id ? `<span class="cbd-dt__tag cbd-dt__tag--teal">${frappe.utils.escape_html(doc.grant_id)}</span>` : '—'}</td>
// 							<td>${frappe.utils.escape_html(doc.state || '—')}</td>
// 							<td>${frappe.utils.escape_html(doc.financial_year || '—')}</td>
// 							<td class="cbd-li-r">${this._fmt(doc.total_budget)}</td>
// 							<td class="cbd-li-r cbd-dt__disb-val">${this._fmt(doc.total_disbursement)}</td>
// 							<td class="cbd-li-r">${this._fmt(doc.balence_budget)}</td>
// 							<td class="cbd-li-r"><span class="cbd-dt__pct cbd-dt__pct--${pct_cls}">${b_pct.toFixed(1)}%</span></td>
// 						`;
// 						tbody.appendChild(b_row);

// 						// Tracker detail row
// 						const tracker = doc.tracker || [];
// 						const trk_inner = tracker.length
// 							? tracker.map((t, i) => `
// 								<div class="cbd-dt__trk-item ${i === tracker.length - 1 ? 'cbd-dt__trk-item--last' : ''}">
// 									<span class="cbd-dt__trk-dot ${i === 0 ? 'cbd-dt__trk-dot--first' : ''}"></span>
// 									<span class="cbd-dt__trk-date">${this._date(t.date_of_disbursement)}</span>
// 									<span class="cbd-dt__trk-amt">${this._fmt(t.disbursed_amount)}</span>
// 								</div>`).join('')
// 							: `<div class="cbd-dt__trk-empty">No payment entries recorded.</div>`;

// 						const d_row = document.createElement('tr');
// 						d_row.className = 'cbd-dt__detail-row cbd-dt__detail-row--collapsed';
// 						d_row.id = d_id;
// 						d_row.innerHTML = `<td colspan="9" class="cbd-dt__detail-cell">${trk_inner}</td>`;
// 						tbody.appendChild(d_row);

// 						// Toggle tracker
// 						b_row.addEventListener('click', () => {
// 							const open = !d_row.classList.contains('cbd-dt__detail-row--collapsed');
// 							d_row.classList.toggle('cbd-dt__detail-row--collapsed', open);
// 							b_row.querySelector('.cbd-dt__chevron').style.transform = open ? '' : 'rotate(90deg)';
// 						});
// 					});
// 				});

// 				// Grand total
// 				const tot     = document.getElementById('cbd_disb_total');
// 				const tot_val = document.getElementById('cbd_disb_total_val');
// 				if (tot) { tot.style.display = 'flex'; tot_val.textContent = this._fmt(grand_total); }
// 			}
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// OVERALL PANELS (budget / utilisation)
// 	// ─────────────────────────────────────────────

// 	_open_overall_panels(panel = 'both') {
// 		if (!this._all_partners || !this._all_partners.length) { frappe.msgprint('No data loaded yet.'); return; }
// 		const all_budget_ids = this._all_partners.flatMap(p => (p.budgets || []).map(b => b.budget_id)).filter(Boolean);
// 		const all_starts = this._all_partners.flatMap(p => (p.budgets || []).map(b => b.grant_start)).filter(Boolean).sort();
// 		const all_ends   = this._all_partners.flatMap(p => (p.budgets || []).map(b => b.grant_end)).filter(Boolean).sort().reverse();
// 		if (!all_budget_ids.length) { frappe.msgprint('No budgets found.'); return; }
// 		this._open_consolidated_panels_typed(all_budget_ids, 'Overall Summary', all_starts[0] || '', all_ends[0] || '', panel);
// 	}

// 	_open_consolidated_panels_typed(budget_ids, title, grant_start, grant_end, panel) {
// 		const overlay = document.getElementById('cbd_overlay');
// 		const left    = document.getElementById('cbd_panel_left');
// 		const right   = document.getElementById('cbd_panel_right');

// 		overlay.classList.add('cbd-overlay--active');
// 		document.body.classList.add('cbd-panels-open');
// 		const sidebar = document.querySelector('.layout-side-section, .desk-sidebar, #sidebar-menu');
// 		if (sidebar) { sidebar.dataset.cbdPrevZ = sidebar.style.zIndex || ''; sidebar.style.zIndex = '1'; }

// 		const badge = `<span class="cbd-panel__consolidated-badge">Overall</span>`;
// 		const sub   = `${budget_ids.length} budget${budget_ids.length > 1 ? 's' : ''} · All Partners`;

// 		const left_html = `
// 			<div class="cbd-panel__header">
// 				<div><div class="cbd-panel__title">${badge} Budget Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(sub)}</div></div>
// 				<div class="cbd-panel__header-actions">
// 					<label class="cbd-expand-all-label" title="Expand / collapse all groups"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label>
// 					<button class="cbd-panel__close" id="cbd_close_panels">&#10005;</button>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__body" id="cbd_left_body"><div class="cbd-panel-loading">Loading…</div></div>
// 			<div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none"><span>Grand Total</span><span id="cbd_left_total_val">—</span></div>`;

// 		const right_html = `
// 			<div class="cbd-panel__header">
// 				<div><div class="cbd-panel__title">${badge} Utilisation Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(sub)}</div></div>
// 				<div class="cbd-panel__header-actions">
// 					<label class="cbd-expand-all-label" title="Expand / collapse all groups"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label>
// 					<button class="cbd-panel__close" id="cbd_close_panels2">&#10005;</button>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__filter" id="cbd_month_filter_wrap">
// 				<div class="cbd-filter-row">
// 					<div class="cbd-filter-col"><div class="cbd-filter-label">Financial Year</div><div id="cbd_fy_multiselect"></div></div>
// 					<div class="cbd-filter-col"><div class="cbd-filter-label">Month</div><div id="cbd_month_multiselect"></div></div>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__body" id="cbd_right_body"><div class="cbd-panel-loading">Loading…</div></div>
// 			<div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none"><span id="cbd_right_total_lbl">Total</span><span id="cbd_right_total_val">—</span></div>`;

// 		if (panel === 'budget') {
// 			left.classList.add('cbd-panel--open', 'cbd-panel--full'); right.classList.remove('cbd-panel--open'); left.innerHTML = left_html;
// 		} else if (panel === 'utilisation') {
// 			right.classList.add('cbd-panel--open', 'cbd-panel--full'); left.classList.remove('cbd-panel--open'); right.innerHTML = right_html;
// 		} else {
// 			left.classList.add('cbd-panel--open'); right.classList.add('cbd-panel--open');
// 			left.innerHTML = left_html; right.innerHTML = right_html;
// 			const cc = document.getElementById('cbd_centre_close'); if (cc) cc.classList.add('cbd-centre-close--visible');
// 		}

// 		const wire = (id, fn) => { const b = document.getElementById(id); if (b) b.addEventListener('click', fn); };
// 		wire('cbd_close_panels',  () => this._close_left());
// 		wire('cbd_close_panels2', () => this._close_right());

// 		if (panel === 'budget' || panel === 'both') this._load_consolidated_budget_items(budget_ids);
// 		if (panel === 'utilisation' || panel === 'both') this._load_consolidated_utilisation_items(budget_ids, grant_start, grant_end);
// 	}

// 	// ─────────────────────────────────────────────
// 	// SIDE PANELS — open/close
// 	// ─────────────────────────────────────────────

// 	_open_panels(budget_id, ref_name, grant_start, grant_end) {
// 		const overlay = document.getElementById('cbd_overlay');
// 		const left    = document.getElementById('cbd_panel_left');
// 		const right   = document.getElementById('cbd_panel_right');

// 		overlay.classList.add('cbd-overlay--active');
// 		left.classList.add('cbd-panel--open');
// 		right.classList.add('cbd-panel--open');
// 		document.body.classList.add('cbd-panels-open');
// 		const cclose = document.getElementById('cbd_centre_close'); if (cclose) cclose.classList.add('cbd-centre-close--visible');

// 		const sidebar = document.querySelector('.layout-side-section, .desk-sidebar, #sidebar-menu, .main-container > .col.layout-side-section');
// 		if (sidebar) { sidebar.dataset.cbdPrevZ = sidebar.style.zIndex || ''; sidebar.style.zIndex = '1'; }

// 		left.innerHTML = `
// 			<div class="cbd-panel__header">
// 				<div><div class="cbd-panel__title">Budget Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(ref_name)}</div></div>
// 				<div class="cbd-panel__header-actions">
// 					<label class="cbd-expand-all-label" title="Expand / collapse all groups"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label>
// 					<button class="cbd-panel__close" id="cbd_close_panels">&#10005;</button>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__body" id="cbd_left_body"><div class="cbd-panel-loading">Loading…</div></div>
// 			<div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none"><span>Grand Total</span><span id="cbd_left_total_val">—</span></div>`;

// 		right.innerHTML = `
// 			<div class="cbd-panel__header">
// 				<div><div class="cbd-panel__title">Utilisation Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(ref_name)}</div></div>
// 				<div class="cbd-panel__header-actions">
// 					<label class="cbd-expand-all-label" title="Expand / collapse all groups"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label>
// 					<button class="cbd-panel__close" id="cbd_close_panels2">&#10005;</button>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__filter">
// 				<div class="cbd-filter-row">
// 					<div class="cbd-filter-col"><div class="cbd-filter-label">Financial Year</div><div id="cbd_fy_multiselect"></div></div>
// 					<div class="cbd-filter-col"><div class="cbd-filter-label">Month</div><div id="cbd_month_multiselect"></div></div>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__body" id="cbd_right_body"><div class="cbd-panel-loading">Loading…</div></div>
// 			<div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none"><span id="cbd_right_total_lbl">Total</span><span id="cbd_right_total_val">—</span></div>`;

// 		document.getElementById('cbd_close_panels').addEventListener('click',  () => this._close_left());
// 		document.getElementById('cbd_close_panels2').addEventListener('click', () => this._close_right());

// 		this._load_budget_items(budget_id);
// 		this._load_utilisation_items(budget_id, grant_start, grant_end);
// 	}

// 	_close_all_panels() {
// 		this._close_panels();
// 		this._close_disb_panel();
// 	}

// 	_close_disb_panel_silent() {
// 		const modal         = document.getElementById('cbd_disb_modal');
// 		const modal_overlay = document.getElementById('cbd_disb_overlay');
// 		if (modal)         modal.classList.remove('cbd-disb-modal--open');
// 		if (modal_overlay) modal_overlay.classList.remove('cbd-disb-overlay--active');
// 	}

// 	_close_panels() {
// 		document.getElementById('cbd_overlay').classList.remove('cbd-overlay--active');
// 		document.getElementById('cbd_panel_left').classList.remove('cbd-panel--open', 'cbd-panel--full');
// 		document.getElementById('cbd_panel_right').classList.remove('cbd-panel--open', 'cbd-panel--full');
// 		document.body.classList.remove('cbd-panels-open');
// 		const sidebar = document.querySelector('.layout-side-section, .desk-sidebar, #sidebar-menu, .main-container > .col.layout-side-section');
// 		if (sidebar) sidebar.style.zIndex = sidebar.dataset.cbdPrevZ || '';
// 		const cc = document.getElementById('cbd_centre_close'); if (cc) cc.classList.remove('cbd-centre-close--visible');
// 	}

// 	_close_left() {
// 		const left = document.getElementById('cbd_panel_left'); left.classList.remove('cbd-panel--open', 'cbd-panel--full');
// 		const cc = document.getElementById('cbd_centre_close'); if (cc) cc.classList.remove('cbd-centre-close--visible');
// 		const right = document.getElementById('cbd_panel_right');
// 		if (!right.classList.contains('cbd-panel--open')) this._close_panels();
// 	}

// 	_close_right() {
// 		const right = document.getElementById('cbd_panel_right'); right.classList.remove('cbd-panel--open', 'cbd-panel--full');
// 		const cc = document.getElementById('cbd_centre_close'); if (cc) cc.classList.remove('cbd-centre-close--visible');
// 		const left = document.getElementById('cbd_panel_left');
// 		if (!left.classList.contains('cbd-panel--open')) this._close_panels();
// 	}

// 	// ─────────────────────────────────────────────
// 	// LEFT PANEL — Budget Items
// 	// ─────────────────────────────────────────────

// 	_load_budget_items(budget_id) {
// 		frappe.call({
// 			method: 'creche_reports.api.budget_utilisation_summary.get_budget_line_items',
// 			args: { budget_id },
// 			callback: (r) => {
// 				const el = document.getElementById('cbd_left_body'); if (!el) return;
// 				const items = r.message || [];
// 				if (!items.length) { el.innerHTML = '<div class="cbd-panel-empty">No budget line items found.</div>'; return; }

// 				const groups = {};
// 				items.forEach(item => { const h = item.budget_main_head || 'Other'; if (!groups[h]) groups[h] = []; groups[h].push(item); });

// 				el.innerHTML = '';
// 				Object.entries(groups).forEach(([head, rows], gidx) => {
// 					const group_total = rows.reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);
// 					const gid = 'lgrp_' + gidx;
// 					const grp = document.createElement('div'); grp.className = 'cbd-item-group';
// 					grp.innerHTML = `
// 						<div class="cbd-item-group__head cbd-item-group__head--toggle">
// 							<div class="cbd-igh-left"><span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span><span>${frappe.utils.escape_html(head)}</span></div>
// 							<span class="cbd-item-group__total">${this._fmt(group_total)}</span>
// 						</div>
// 						<div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}">
// 							<div class="cbd-li-scroll-wrap">
// 							<table class="cbd-li-table"><thead><tr>
// 								<th class="cbd-li-sticky cbd-li-sticky--1">Expense Type</th>
// 								<th class="cbd-li-sticky cbd-li-sticky--2">Sub Head</th>
// 								<th class="cbd-li-r">Amount</th><th class="cbd-li-r">Y1</th><th class="cbd-li-r">Y2</th><th class="cbd-li-r">Y3</th>
// 							</tr></thead><tbody>
// 							${rows.map(row => `<tr>
// 								<td class="cbd-li-sticky cbd-li-sticky--1"><div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses || '—')}</div>${row.notes ? `<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>` : ''}</td>
// 								<td class="cbd-li-sticky cbd-li-sticky--2">${frappe.utils.escape_html(row.budget_sub_head || '—')}</td>
// 								<td class="cbd-li-r cbd-li-amt">${this._fmt(row.total_amount)}</td>
// 								<td class="cbd-li-r">${row.year_1 ? this._fmt(row.year_1) : '—'}</td>
// 								<td class="cbd-li-r">${row.year_2 ? this._fmt(row.year_2) : '—'}</td>
// 								<td class="cbd-li-r">${row.year_3 ? this._fmt(row.year_3) : '—'}</td>
// 							</tr>`).join('')}
// 							</tbody></table>
// 							</div>
// 						</div>`;
// 					el.appendChild(grp);
// 					grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click', () => {
// 						const body = document.getElementById(gid); const chv = grp.querySelector('.cbd-igh-chevron');
// 						const collapsed = body.classList.toggle('cbd-item-group__body--collapsed');
// 						chv.style.transform = collapsed ? 'rotate(-90deg)' : '';
// 					});
// 				});
// 				const grand = items.reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);
// 				const tot = document.getElementById('cbd_left_total'); const tot_val = document.getElementById('cbd_left_total_val');
// 				if (tot) { tot.style.display = 'flex'; tot_val.textContent = this._fmt(grand); }
// 			}
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// RIGHT PANEL — Utilisation
// 	// ─────────────────────────────────────────────

// 	_load_utilisation_items(budget_id, grant_start, grant_end) {
// 		frappe.call({
// 			method: 'creche_reports.api.budget_utilisation_summary.get_utilisation_line_items',
// 			args: { budget_id },
// 			callback: (r) => {
// 				const data = r.message || {};
// 				const records = data.records || [];
// 				const ALL_12 = ['January','February','March','April','May','June','July','August','September','October','November','December'];
// 				const fy_options = this._derive_fy_options(grant_start, grant_end);

// 				this._util_records    = records;
// 				this._selected_months = new Set(ALL_12);
// 				this._selected_fys    = new Set(fy_options.map(f => f.value));

// 				const fy_wrap    = document.getElementById('cbd_fy_multiselect');
// 				const month_wrap = document.getElementById('cbd_month_multiselect');
// 				if (!fy_wrap || !month_wrap) return;

// 				this._fy_field = frappe.ui.form.make_control({ df: { fieldtype:'MultiSelectList', fieldname:'fy_filter', label:'FY', get_data: () => fy_options }, parent: $(fy_wrap), render_input: true });
// 				this._fy_field.refresh(); this._fy_field.set_value(fy_options.map(f => f.value));
// 				this._fy_field.df.onchange = () => { const val = this._fy_field.get_value() || []; this._selected_fys = new Set(Array.isArray(val) ? val : [val]); this._render_utilisation(); };

// 				this._month_field = frappe.ui.form.make_control({ df: { fieldtype:'MultiSelectList', fieldname:'month_filter', label:'Month', get_data: () => ALL_12.map(m => ({ value: m, description: '' })) }, parent: $(month_wrap), render_input: true });
// 				this._month_field.refresh(); this._month_field.set_value(ALL_12);
// 				this._month_field.df.onchange = () => { const val = this._month_field.get_value() || []; this._selected_months = new Set(Array.isArray(val) ? val : [val]); this._render_utilisation(); };

// 				if (!records.length) { document.getElementById('cbd_right_body').innerHTML = '<div class="cbd-panel-empty">No utilisation records found for this budget.</div>'; return; }
// 				this._render_utilisation();
// 			}
// 		});
// 	}

// 	_derive_fy_options(start_str, end_str) {
// 		const to_fy = (ds) => { if (!ds) return null; const d = new Date(ds); const yr = d.getFullYear(); const mo = d.getMonth() + 1; const fy = mo >= 4 ? yr : yr - 1; return `${fy}-${String(fy+1).slice(-2)}`; };
// 		const start_fy = to_fy(start_str); const end_fy = to_fy(end_str);
// 		if (!start_fy) return [];
// 		const options = []; let [sy] = start_fy.split('-').map(Number); const [ey] = (end_fy || start_fy).split('-').map(Number);
// 		while (sy <= ey) { options.push({ value: `${sy}-${String(sy+1).slice(-2)}`, description: '' }); sy++; }
// 		return options;
// 	}

// 	_render_utilisation() {
// 		const el = document.getElementById('cbd_right_body'); if (!el) return;
// 		const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];
// 		const sel_months = this._selected_months || new Set(); const sel_fys = this._selected_fys || new Set();
// 		const records = (this._util_records || []).filter(r => (sel_months.size === 0 || sel_months.has(r.month)) && (sel_fys.size === 0 || sel_fys.has(r.financial_year)));

// 		if (!records.length) { el.innerHTML = '<div class="cbd-panel-empty">No data for selected period.</div>'; const rt = document.getElementById('cbd_right_total'); if (rt) rt.style.display = 'none'; return; }

// 		const active_months = [...new Set(records.map(r => r.month))].sort((a,b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));
// 		const is_multi = active_months.length > 1;

// 		const combined = {};
// 		records.forEach(rec => {
// 			(rec.items || []).forEach(item => {
// 				const key = item.type_of_expenses_id || item.type_of_expenses || 'unknown';
// 				if (!combined[key]) combined[key] = { type_of_expenses: item.type_of_expenses, budget_main_head: item.budget_main_head, budget_sub_head: item.budget_sub_head, notes: item.notes, total_amount: 0, by_month: {} };
// 				const amt = parseFloat(item.total_amount) || 0;
// 				combined[key].total_amount += amt;
// 				combined[key].by_month[rec.month] = (combined[key].by_month[rec.month] || 0) + amt;
// 			});
// 		});

// 		const groups = {};
// 		Object.values(combined).forEach(item => { const h = item.budget_main_head || 'Other'; if (!groups[h]) groups[h] = []; groups[h].push(item); });

// 		el.innerHTML = '';
// 		if (is_multi) {
// 			const bar = document.createElement('div'); bar.className = 'cbd-ytd-bar';
// 			bar.innerHTML = `<span class="cbd-ytd-badge">YTD</span><span class="cbd-ytd-label">Combined across <b>${active_months.length}</b> months: ${active_months.map(m => `<span class="cbd-ytd-month">${m}</span>`).join('')}</span>`;
// 			el.appendChild(bar);
// 		}

// 		let grand = 0;
// 		Object.entries(groups).forEach(([head, rows], gidx) => {
// 			const group_total = rows.reduce((s, r) => s + r.total_amount, 0); grand += group_total;
// 			const gid = 'rgrp_' + gidx;

// 			// Build FY → months mapping for grouped header row
// 			let fy_header_row = '';
// 			let month_header_row = '';
// 			if (is_multi) {
// 				// Group active months by their FY
// 				const fy_groups = {}; // fy → [month, ...]
// 				active_months.forEach(m => {
// 					// find fy from records
// 					const rec = records.find(r => r.month === m);
// 					const fy  = rec ? (rec.financial_year || 'Unknown') : 'Unknown';
// 					if (!fy_groups[fy]) fy_groups[fy] = [];
// 					fy_groups[fy].push(m);
// 				});
// 				// FY header row (with colspan)
// 				fy_header_row = `<tr class="cbd-li-fy-row">
// 					<th class="cbd-li-sticky cbd-li-sticky--1 cbd-li-fy-blank" rowspan="2">Expense Type</th>
// 					<th class="cbd-li-sticky cbd-li-sticky--2 cbd-li-fy-blank" rowspan="2">Sub Head</th>
// 					${Object.entries(fy_groups).map(([fy, months]) =>
// 						`<th colspan="${months.length}" class="cbd-li-fy-hdr">${frappe.utils.escape_html(fy)}</th>`
// 					).join('')}
// 					<th rowspan="2" class="cbd-li-r cbd-li-ytd-hdr">YTD Total</th>
// 				</tr>`;
// 				// Month sub-header row
// 				month_header_row = `<tr class="cbd-li-month-row">
// 					${active_months.map(m => `<th class="cbd-li-r cbd-li-month-col">${m.slice(0,3)}</th>`).join('')}
// 				</tr>`;
// 			}

// 			const month_tds = (row) => is_multi
// 				? active_months.map(m => `<td class="cbd-li-r cbd-li-month-col">${row.by_month[m] ? this._fmt(row.by_month[m]) : '—'}</td>`).join('')
// 				: '';

// 			const grp = document.createElement('div'); grp.className = 'cbd-item-group';
// 			grp.innerHTML = `
// 				<div class="cbd-item-group__head cbd-item-group__head--toggle">
// 					<div class="cbd-igh-left"><span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span><span>${frappe.utils.escape_html(head)}</span></div>
// 					<span class="cbd-item-group__total">${this._fmt(group_total)}</span>
// 				</div>
// 				<div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}">
// 					<div class="cbd-li-scroll-wrap">
// 					<table class="cbd-li-table">
// 						<thead>
// 							${is_multi ? fy_header_row + month_header_row : `<tr>
// 								<th class="cbd-li-sticky cbd-li-sticky--1">Expense Type</th>
// 								<th class="cbd-li-sticky cbd-li-sticky--2">Sub Head</th>
// 								<th class="cbd-li-r">Amount</th>
// 							</tr>`}
// 						</thead>
// 						<tbody>${rows.map(row => `<tr>
// 							<td class="cbd-li-sticky cbd-li-sticky--1"><div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses || '—')}</div>${row.notes ? `<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>` : ''}</td>
// 							<td class="cbd-li-sticky cbd-li-sticky--2 cbd-li-sub">${frappe.utils.escape_html(row.budget_sub_head || '—')}</td>
// 							${month_tds(row)}
// 							<td class="cbd-li-r cbd-li-amt">${this._fmt(row.total_amount)}</td>
// 						</tr>`).join('')}</tbody>
// 					</table>
// 					</div>
// 				</div>`;
// 			el.appendChild(grp);
// 			grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click', () => {
// 				const body = document.getElementById(gid); const chv = grp.querySelector('.cbd-igh-chevron');
// 				const collapsed = body.classList.toggle('cbd-item-group__body--collapsed');
// 				chv.style.transform = collapsed ? 'rotate(-90deg)' : '';
// 			});
// 		});

// 		const rt = document.getElementById('cbd_right_total'); const rt_val = document.getElementById('cbd_right_total_val'); const rt_lbl = document.getElementById('cbd_right_total_lbl');
// 		if (rt) { rt.style.display = 'flex'; rt_val.textContent = this._fmt(grand); if (rt_lbl) rt_lbl.textContent = is_multi ? `YTD Total (${active_months.length} months)` : 'Total'; }
// 	}

// 	// ─────────────────────────────────────────────
// 	// CONSOLIDATED PANELS (partner level)
// 	// ─────────────────────────────────────────────

// 	_open_consolidated_panels(budget_ids, partner_name, grant_start, grant_end) {
// 		const overlay = document.getElementById('cbd_overlay'); const left = document.getElementById('cbd_panel_left'); const right = document.getElementById('cbd_panel_right');
// 		overlay.classList.add('cbd-overlay--active'); left.classList.add('cbd-panel--open'); right.classList.add('cbd-panel--open');
// 		document.body.classList.add('cbd-panels-open');
// 		const cc = document.getElementById('cbd_centre_close'); if (cc) cc.classList.add('cbd-centre-close--visible');
// 		const sidebar = document.querySelector('.layout-side-section, .desk-sidebar, #sidebar-menu, .main-container > .col.layout-side-section');
// 		if (sidebar) { sidebar.dataset.cbdPrevZ = sidebar.style.zIndex || ''; sidebar.style.zIndex = '1'; }

// 		const title_sub = `${budget_ids.length} budget${budget_ids.length > 1 ? 's' : ''} · Consolidated`;

// 		left.innerHTML = `
// 			<div class="cbd-panel__header">
// 				<div><div class="cbd-panel__title"><span class="cbd-panel__consolidated-badge">Consolidated</span> Budget Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(partner_name)} &mdash; ${frappe.utils.escape_html(title_sub)}</div></div>
// 				<div class="cbd-panel__header-actions">
// 					<label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label>
// 					<button class="cbd-panel__close" id="cbd_close_panels">&#10005;</button>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__body" id="cbd_left_body"><div class="cbd-panel-loading">Loading…</div></div>
// 			<div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none"><span>Grand Total</span><span id="cbd_left_total_val">—</span></div>`;

// 		right.innerHTML = `
// 			<div class="cbd-panel__header">
// 				<div><div class="cbd-panel__title"><span class="cbd-panel__consolidated-badge">Consolidated</span> Utilisation Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(partner_name)} &mdash; ${frappe.utils.escape_html(title_sub)}</div></div>
// 				<div class="cbd-panel__header-actions">
// 					<label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label>
// 					<button class="cbd-panel__close" id="cbd_close_panels2">&#10005;</button>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__filter">
// 				<div class="cbd-filter-row">
// 					<div class="cbd-filter-col"><div class="cbd-filter-label">Financial Year</div><div id="cbd_fy_multiselect"></div></div>
// 					<div class="cbd-filter-col"><div class="cbd-filter-label">Month</div><div id="cbd_month_multiselect"></div></div>
// 				</div>
// 			</div>
// 			<div class="cbd-panel__body" id="cbd_right_body"><div class="cbd-panel-loading">Loading…</div></div>
// 			<div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none"><span id="cbd_right_total_lbl">Total</span><span id="cbd_right_total_val">—</span></div>`;

// 		document.getElementById('cbd_close_panels').addEventListener('click',  () => this._close_left());
// 		document.getElementById('cbd_close_panels2').addEventListener('click', () => this._close_right());

// 		this._load_consolidated_budget_items(budget_ids);
// 		this._load_consolidated_utilisation_items(budget_ids, grant_start, grant_end);
// 	}

// 	_load_consolidated_budget_items(budget_ids) {
// 		const promises = budget_ids.map(bid => frappe.call({ method: 'creche_reports.api.budget_utilisation_summary.get_budget_line_items', args: { budget_id: bid } }));
// 		Promise.all(promises).then(results => {
// 			const el = document.getElementById('cbd_left_body'); if (!el) return;
// 			const merged = {};
// 			results.forEach(r => { (r.message || []).forEach(item => { const key = item.type_of_expenses_id || item.type_of_expenses || 'unknown'; if (!merged[key]) merged[key] = { type_of_expenses: item.type_of_expenses, budget_main_head: item.budget_main_head, budget_sub_head: item.budget_sub_head, notes: item.notes, total_amount: 0, year_1: 0, year_2: 0, year_3: 0 }; merged[key].total_amount += parseFloat(item.total_amount) || 0; merged[key].year_1 += parseFloat(item.year_1) || 0; merged[key].year_2 += parseFloat(item.year_2) || 0; merged[key].year_3 += parseFloat(item.year_3) || 0; }); });
// 			const items = Object.values(merged);
// 			if (!items.length) { el.innerHTML = '<div class="cbd-panel-empty">No budget line items found.</div>'; return; }
// 			const groups = {}; items.forEach(item => { const h = item.budget_main_head || 'Other'; if (!groups[h]) groups[h] = []; groups[h].push(item); });
// 			el.innerHTML = '';
// 			Object.entries(groups).forEach(([head, rows], gidx) => {
// 				const group_total = rows.reduce((s, r) => s + r.total_amount, 0); const gid = 'clgrp_' + gidx;
// 				const grp = document.createElement('div'); grp.className = 'cbd-item-group';
// 				grp.innerHTML = `
// 					<div class="cbd-item-group__head cbd-item-group__head--toggle">
// 						<div class="cbd-igh-left"><span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span><span>${frappe.utils.escape_html(head)}</span></div>
// 						<span class="cbd-item-group__total">${this._fmt(group_total)}</span>
// 					</div>
// 					<div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}">
// 						<table class="cbd-li-table"><thead><tr><th>Expense Type</th><th>Sub Head</th><th class="cbd-li-r">Total</th><th class="cbd-li-r">Y1</th><th class="cbd-li-r">Y2</th><th class="cbd-li-r">Y3</th></tr></thead>
// 						<tbody>${rows.map(row => `<tr><td><div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses||'—')}</div>${row.notes?`<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>`:''}</td><td class="cbd-li-sub">${frappe.utils.escape_html(row.budget_sub_head||'—')}</td><td class="cbd-li-r cbd-li-amt">${this._fmt(row.total_amount)}</td><td class="cbd-li-r">${row.year_1?this._fmt(row.year_1):'—'}</td><td class="cbd-li-r">${row.year_2?this._fmt(row.year_2):'—'}</td><td class="cbd-li-r">${row.year_3?this._fmt(row.year_3):'—'}</td></tr>`).join('')}</tbody></table>
// 					</div>`;
// 				el.appendChild(grp);
// 				grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click', () => { const body = document.getElementById(gid); const chv = grp.querySelector('.cbd-igh-chevron'); const collapsed = body.classList.toggle('cbd-item-group__body--collapsed'); chv.style.transform = collapsed ? 'rotate(-90deg)' : ''; });
// 			});
// 			const grand = items.reduce((s, r) => s + r.total_amount, 0);
// 			const tot = document.getElementById('cbd_left_total'); const tot_val = document.getElementById('cbd_left_total_val');
// 			if (tot) { tot.style.display = 'flex'; tot_val.textContent = this._fmt(grand); }
// 		});
// 	}

// 	_load_consolidated_utilisation_items(budget_ids, grant_start, grant_end) {
// 		const promises = budget_ids.map(bid => frappe.call({ method: 'creche_reports.api.budget_utilisation_summary.get_utilisation_line_items', args: { budget_id: bid } }));
// 		Promise.all(promises).then(results => {
// 			const all_records = [];
// 			results.forEach(r => { ((r.message || {}).records || []).forEach(rec => all_records.push(rec)); });
// 			const ALL_12 = ['January','February','March','April','May','June','July','August','September','October','November','December'];
// 			const fy_options = this._derive_fy_options(grant_start, grant_end);
// 			this._util_records = all_records; this._selected_months = new Set(ALL_12); this._selected_fys = new Set(fy_options.map(f => f.value));
// 			const fy_wrap = document.getElementById('cbd_fy_multiselect'); const month_wrap = document.getElementById('cbd_month_multiselect');
// 			if (!fy_wrap || !month_wrap) return;
// 			this._fy_field = frappe.ui.form.make_control({ df: { fieldtype:'MultiSelectList', fieldname:'fy_filter', label:'FY', get_data: () => fy_options }, parent: $(fy_wrap), render_input: true });
// 			this._fy_field.refresh(); this._fy_field.set_value(fy_options.map(f => f.value));
// 			this._fy_field.df.onchange = () => { const val = this._fy_field.get_value() || []; this._selected_fys = new Set(Array.isArray(val) ? val : [val]); this._render_utilisation(); };
// 			this._month_field = frappe.ui.form.make_control({ df: { fieldtype:'MultiSelectList', fieldname:'month_filter', label:'Month', get_data: () => ALL_12.map(m => ({ value: m, description: '' })) }, parent: $(month_wrap), render_input: true });
// 			this._month_field.refresh(); this._month_field.set_value(ALL_12);
// 			this._month_field.df.onchange = () => { const val = this._month_field.get_value() || []; this._selected_months = new Set(Array.isArray(val) ? val : [val]); this._render_utilisation(); };
// 			if (!all_records.length) { document.getElementById('cbd_right_body').innerHTML = '<div class="cbd-panel-empty">No utilisation records found.</div>'; return; }
// 			this._render_utilisation();
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// HELPERS
// 	// ─────────────────────────────────────────────

// 	_fmt(n) {
// 		if (n === null || n === undefined || n === '') return '—';
// 		const v = parseFloat(n) || 0;
// 		if (Math.abs(v) >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr';
// 		if (Math.abs(v) >= 100000)   return '₹' + (v / 100000).toFixed(2)   + ' L';
// 		return '₹' + Math.round(v).toLocaleString('en-IN');
// 	}
// 	_date(d) { if (!d) return '—'; return frappe.datetime.str_to_user(d) || d; }
// 	_metric(label, value) { return `<div class="cbd-metric"><span class="cbd-metric__label">${label}</span><span class="cbd-metric__value">${value}</span></div>`; }

// 	_metric_pct(label, pct) {
// 		const v   = parseFloat(pct) || 0;
// 		const cls = v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red';
// 		return `<div class="cbd-metric cbd-metric--pct">
// 			<span class="cbd-metric__label">${label}</span>
// 			<span class="cbd-metric__value cbd-metric__pct cbd-metric__pct--${cls}">${v.toFixed(1)}%</span>
// 		</div>`;
// 	}

// 	_util_vs_disb_pct(partner) {
// 		const d = parseFloat(partner.total_disbursement) || 0;
// 		const u = parseFloat(partner.total_utilisation)  || 0;
// 		return d > 0 ? ((u / d) * 100) : 0;
// 	}
// 	_icon_partner() { return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0"><rect x="3" y="7" width="18" height="14" rx="1"/><path d="M8 21V11h8v10"/><path d="M3 7l9-4 9 4"/></svg>`; }
// 	_fill_cls(v)  { return v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red'; }
// 	_chip_cls(v)  { return v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red'; }
// 	_badge_cls(v) { return v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red'; }

// 	// ─────────────────────────────────────────────
// 	// EVENT DELEGATION
// 	// ─────────────────────────────────────────────

// 	_bind_view_buttons() {
// 		document.getElementById('cbd_partners').addEventListener('click', (e) => {
// 			// Single budget line items
// 			const btn = e.target.closest('.cbd-view-btn');
// 			if (btn) {
// 				e.stopPropagation();
// 				this._open_panels(btn.dataset.budgetId, btn.dataset.refName, btn.dataset.grantStart || '', btn.dataset.grantEnd || '');
// 				return;
// 			}
// 			// Row-level disbursement button (single budget)
// 			const rbtn = e.target.closest('.cbd-row-disb-btn');
// 			if (rbtn) {
// 				e.stopPropagation();
// 				const bid      = rbtn.dataset.budgetId;
// 				const ref_name = rbtn.dataset.refName || bid;
// 				this._open_disbursement_panel(`${ref_name} — Disbursements`, [bid], null);
// 				return;
// 			}
// 			// Partner consolidated
// 			const cbtn = e.target.closest('.cbd-consolidated-btn');
// 			if (cbtn) {
// 				e.stopPropagation();
// 				const budget_ids   = (cbtn.dataset.budgetIds || '').split(',').filter(Boolean);
// 				const partner_name = cbtn.dataset.partnerName || 'Partner';
// 				const grant_start  = cbtn.dataset.grantStart || '';
// 				const grant_end    = cbtn.dataset.grantEnd   || '';
// 				this._open_consolidated_panels(budget_ids, partner_name, grant_start, grant_end);
// 				return;
// 			}
// 			// Partner disbursement  ← NEW
// 			const dbtn = e.target.closest('.cbd-disb-btn');
// 			if (dbtn) {
// 				e.stopPropagation();
// 				const budget_ids   = (dbtn.dataset.budgetIds || '').split(',').filter(Boolean);
// 				const partner_name = dbtn.dataset.partnerName || 'Partner';
// 				this._open_disbursement_panel(`${partner_name} — Disbursements`, budget_ids, null);
// 				return;
// 			}
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// STYLES
// 	// ─────────────────────────────────────────────

// 	_inject_styles() {
// 		if (document.getElementById('cbd-styles')) return;
// 		const style = document.createElement('style');
// 		style.id = 'cbd-styles';
// 		style.textContent = `

// 		/* ═══════════════════════════════════════════════════════════
// 		   ROOT & FILTER
// 		   ═══════════════════════════════════════════════════════════ */
// 		.cbd-root { padding: 12px 16px 40px; }

// 		.custom-filter-row { padding:0; margin:0; display:flex; flex-wrap:wrap; }
// 		.cbd-filter-col { flex:1 1 20%; min-width:160px; padding:8px 8px 0; box-sizing:border-box; }

// 		/* ═══════════════════════════════════════════════════════════
// 		   OVERVIEW STRIP
// 		   ═══════════════════════════════════════════════════════════ */
// 		.cbd-overview-strip {
// 			display:flex; align-items:stretch; flex-wrap:nowrap;
// 			background:var(--card-bg,#fff);
// 			border:1px solid var(--border-color,#d1d8dd);
// 			border-radius:10px; margin-bottom:12px; overflow:hidden;
// 		}
// 		.cbd-ostat {
// 			display:flex; align-items:center; gap:8px; flex:1;
// 			padding:10px 12px; min-width:0;
// 			border-right:1px solid var(--border-color,#d1d8dd);
// 			cursor:default; transition:background .12s;
// 		}
// 		.cbd-ostat:last-child { border-right:none; }
// 		.cbd-ostat[title] { cursor:help; }
// 		.cbd-ostat[title]:hover { background:var(--control-bg,#f7f7f7); }
// 		.cbd-ostat__icon {
// 			width:32px; height:32px; flex-shrink:0;
// 			display:flex; align-items:center; justify-content:center;
// 			border-radius:8px; background:var(--control-bg,#f0f4f8); color:#378ADD;
// 		}
// 		.cbd-ostat__body { min-width:0; }
// 		.cbd-ostat__value { font-size:16px; font-weight:700; color:var(--text-color,#1c2126); line-height:1.1; }
// 		.cbd-ostat__label { font-size:9px; font-weight:500; text-transform:uppercase; letter-spacing:.6px; color:var(--text-muted,#8d99a6); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

// 		/* ═══════════════════════════════════════════════════════════
// 		   SUMMARY CARDS
// 		   ═══════════════════════════════════════════════════════════ */
// 		.cbd-summary-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:14px; }
// 		.cbd-scard { background:var(--card-bg,#fff); border:1px solid var(--border-color,#d1d8dd); border-radius:10px; padding:14px 16px; border-left:4px solid transparent; transition:box-shadow .15s; cursor:pointer; }
// 		.cbd-scard:hover { box-shadow:0 4px 16px rgba(55,138,221,.15); border-color:#B5D4F4; }
// 		.cbd-scard--blue   { border-left-color:#378ADD; }
// 		.cbd-scard--green  { border-left-color:#639922; }
// 		.cbd-scard--purple { border-left-color:#7F77DD; }
// 		.cbd-scard--amber  { border-left-color:#BA7517; }
// 		.cbd-scard__top { display:flex; justify-content:space-between; align-items:flex-start; }
// 		.cbd-scard__label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text-muted,#8d99a6); }
// 		.cbd-scard__svg { display:flex; align-items:center; flex-shrink:0; }
// 		.cbd-scard__value { font-size:22px; font-weight:600; color:var(--text-color,#1c2126); margin-top:8px; line-height:1; }
// 		.cbd-scard__sub { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:4px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
// 		.cbd-scard__drill { font-size:10px; font-weight:600; color:#378ADD; opacity:0; transition:opacity .15s; }
// 		.cbd-scard:hover .cbd-scard__drill { opacity:1; }

// 		/* ═══════════════════════════════════════════════════════════
// 		   PROGRESS
// 		   ═══════════════════════════════════════════════════════════ */
// 		.cbd-prog { height:4px; background:var(--border-color,#d1d8dd); border-radius:2px; margin-top:10px; overflow:hidden; }
// 		.cbd-prog__fill { height:100%; border-radius:2px; transition:width .5s ease; }
// 		.cbd-prog__fill--green { background:#639922; }
// 		.cbd-prog__fill--amber { background:#BA7517; }
// 		.cbd-prog__fill--red   { background:#E24B4A; }
// 		.cbd-prog__fill--blue  { background:#378ADD; }

// 		/* ═══════════════════════════════════════════════════════════
// 		   SECTION LABEL
// 		   ═══════════════════════════════════════════════════════════ */
// 		.cbd-section-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.9px; color:var(--text-muted,#8d99a6); margin-bottom:10px; margin-top:0; }

// 		/* ═══════════════════════════════════════════════════════════
// 		   PARTNER LIST
// 		   ═══════════════════════════════════════════════════════════ */
// 		#cbd_partners { max-height:calc(100vh - 300px); overflow-y:auto; padding-right:4px; }
// 		#cbd_partners::-webkit-scrollbar { width:4px; }
// 		#cbd_partners::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }

// 		.cbd-partner { background:var(--card-bg,#fff); border:1px solid var(--border-color,#d1d8dd); border-radius:10px; margin-bottom:10px; overflow:hidden; }
// 		.cbd-partner__head { display:flex; align-items:stretch; justify-content:space-between; padding:10px 14px; cursor:pointer; gap:12px; border-left:3px solid #378ADD; }
// 		.cbd-partner__head:hover { background:var(--control-bg,#f7f7f7); }
// 		.cbd-partner__left { flex:1; min-width:0; }
// 		.cbd-partner__name { font-size:14px; font-weight:600; color:var(--text-color,#1c2126); display:flex; align-items:center; gap:7px; }
// 		.cbd-partner__grants { font-size:12px; font-weight:500; color:var(--text-muted,#8d99a6); margin-top:4px; padding-left:22px; }
// 		.cbd-partner__metrics { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
// 		.cbd-metric { display:flex; flex-direction:column; background:var(--control-bg,#f7f7f7); border:1px solid var(--border-color,#d1d8dd); border-radius:6px; padding:3px 8px; min-width:68px; }
// 		.cbd-metric__label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-muted,#8d99a6); }
// 		.cbd-metric__value { font-size:12px; font-weight:600; color:var(--text-color,#1c2126); margin-top:1px; }
// 		.cbd-metric--pct { border-style:dashed; }
// 		.cbd-metric__pct { font-size:13px; font-weight:700; }
// 		.cbd-metric__pct--green { color:#3B6D11; }
// 		.cbd-metric__pct--amber { color:#854F0B; }
// 		.cbd-metric__pct--red   { color:#A32D2D; }

// 		.cbd-partner__footer { display:flex; align-items:stretch; margin-top:7px; border:1px solid var(--border-color,#d1d8dd); border-radius:8px; overflow:hidden; }
// 		.cbd-footer-block { flex:1; padding:5px 10px; display:flex; flex-direction:column; gap:5px; }
// 		.cbd-footer-block + .cbd-footer-block { border-left:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-footer-block__label { display:flex; align-items:center; gap:5px; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text-muted,#8d99a6); }
// 		.cbd-footer-block__tags { display:flex; flex-wrap:wrap; gap:4px; }

// 		.cbd-stag { display:inline-flex; align-items:center; gap:5px; border-radius:4px; padding:3px 8px; font-size:11px; font-weight:600; }
// 		.cbd-stag--blue   { background:#E6F1FB; color:#0C447C; }
// 		.cbd-stag--purple { background:#EEEDFE; color:#3C3489; }
// 		.cbd-stag--gray   { background:var(--control-bg,#f7f7f7); color:var(--text-muted,#8d99a6); }
// 		.cbd-stag__dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
// 		.cbd-stag__dot--blue   { background:#378ADD; }
// 		.cbd-stag__dot--purple { background:#7F77DD; }

// 		.cbd-partner__right { display:flex; flex-direction:column; align-items:flex-end; justify-content:space-between; gap:8px; flex-shrink:0; padding:2px 0; }
// 		.cbd-badge { display:inline-flex; align-items:center; border-radius:6px; padding:4px 10px; font-size:12px; font-weight:600; white-space:nowrap; }
// 		.cbd-badge--green { background:#EAF3DE; color:#3B6D11; }
// 		.cbd-badge--amber { background:#FAEEDA; color:#854F0B; }
// 		.cbd-badge--red   { background:#FCEBEB; color:#A32D2D; }
// 		.cbd-chevron { font-size:10px; color:var(--text-muted,#8d99a6); transition:transform .2s ease; line-height:1; }
// 		.cbd-chevron--open { transform:rotate(90deg); }

// 		.cbd-partner__btn-group { display:flex; flex-direction:row; align-items:center; gap:4px; }
// 		.cbd-consolidated-btn, .cbd-disb-btn {
// 			display:inline-flex; align-items:center; justify-content:center;
// 			width:28px; height:28px; padding:0 !important;
// 			border-radius:6px; cursor:pointer;
// 			transition:background .15s, box-shadow .15s;
// 			flex-shrink:0; border-width:1px; border-style:solid;
// 		}
// 		.cbd-consolidated-btn { color:#3C3489; background:#EEEDFE; border-color:#AFA9EC; }
// 		.cbd-consolidated-btn:hover { background:#CECBF6; box-shadow:0 2px 6px rgba(83,74,183,.25); }
// 		.cbd-disb-btn { color:#0F6E56; background:#E1F5EE; border-color:#7ECFB8; }
// 		.cbd-disb-btn:hover { background:#B8EAD8; box-shadow:0 2px 6px rgba(15,110,86,.2); }

// 		/* ═══════════════════════════════════════════════════════════
// 		   PARTNER DETAIL TABLE
// 		   ═══════════════════════════════════════════════════════════ */
// 		.cbd-partner__body { display:none; border-top:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-tbl-wrap { overflow-x:auto; }
// 		.cbd-table { width:100%; border-collapse:collapse; font-size:12px; white-space:nowrap; border:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-table thead { position:sticky; top:0; z-index:1; }
// 		.cbd-table th { padding:9px 12px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-muted,#8d99a6); background:var(--control-bg,#f7f7f7); border:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-table td { padding:8px 12px; color:var(--text-color,#1c2126); border:1px solid var(--border-color,#d1d8dd); vertical-align:middle; }
// 		.cbd-table tbody tr:hover td { background:var(--control-bg,#f7f7f7); }
// 		.cbd-r { text-align:right !important; }

// 		.cbd-chip { display:inline-flex; align-items:center; border-radius:4px; padding:2px 7px; font-size:11px; font-weight:600; }
// 		.cbd-chip--blue   { background:#E6F1FB; color:#185FA5; }
// 		.cbd-chip--teal   { background:#E1F5EE; color:#0F6E56; }
// 		.cbd-chip--green  { background:#EAF3DE; color:#3B6D11; }
// 		.cbd-chip--amber  { background:#FAEEDA; color:#854F0B; }
// 		.cbd-chip--red    { background:#FCEBEB; color:#A32D2D; }
// 		.cbd-chip--gray   { background:var(--control-bg,#f7f7f7); color:var(--text-muted,#8d99a6); }

// 		.cbd-view-btn { display:inline-flex; align-items:center; justify-content:center; gap:5px; padding:4px 10px; font-size:11px; font-weight:600; color:#185FA5; background:#E6F1FB; border:none; border-radius:5px; cursor:pointer; white-space:nowrap; transition:background .15s; }
// 		.cbd-view-btn:hover { background:#B5D4F4; }
// 		.cbd-view-btn.cbd-icon-btn, .cbd-row-disb-btn.cbd-icon-btn { width:28px; height:28px; padding:0; gap:0; }
// 		.cbd-row-disb-btn { display:inline-flex; align-items:center; justify-content:center; gap:5px; padding:4px 10px; font-size:11px; font-weight:600; color:#0F6E56; background:#E1F5EE; border:1px solid #7ECFB8; border-radius:5px; cursor:pointer; white-space:nowrap; transition:background .15s; }
// 		.cbd-row-disb-btn:hover { background:#B8EAD8; }
// 		.cbd-actions-cell { display:flex; flex-direction:row; align-items:center; gap:4px; padding:6px 10px; vertical-align:middle; }
// 		td.cbd-actions-cell { border:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-actions-col { white-space:nowrap; min-width:70px; text-align:center; }

// 		/* ═══════════════════════════════════════════════════════════
// 		   LINE ITEM TABLES (panel body)
// 		   ═══════════════════════════════════════════════════════════ */
// 		.cbd-li-scroll-wrap { overflow-x:auto; }
// 		.cbd-li-scroll-wrap::-webkit-scrollbar { height:4px; }
// 		.cbd-li-scroll-wrap::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }
// 		.cbd-li-sticky { position:sticky; z-index:2; background:var(--card-bg,#fff); }
// 		thead .cbd-li-sticky { background:var(--control-bg,#f7f7f7); z-index:3; }
// 		.cbd-li-sticky--1 { left:0; min-width:140px; max-width:200px; }
// 		.cbd-li-sticky--2 { left:140px; min-width:90px; max-width:130px; border-right:2px solid var(--border-color,#d1d8dd) !important; }
// 		.cbd-li-scroll-wrap .cbd-li-sticky--2 { box-shadow:3px 0 6px -2px rgba(0,0,0,.08); }

// 		.cbd-li-fy-row th { background:#EEF4FC; }
// 		.cbd-li-fy-hdr { text-align:center !important; background:#D6E8F9; color:#0C447C; font-size:10px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; border-bottom:1px solid #B5D4F4 !important; padding:5px 10px; }
// 		.cbd-li-fy-blank { background:var(--control-bg,#f7f7f7) !important; }
// 		.cbd-li-ytd-hdr { background:#D6E8F9; color:#0C447C; font-size:10px; font-weight:800; }
// 		.cbd-li-month-row th { background:var(--control-bg,#f7f7f7); }

// 		.cbd-li-table { width:100%; border-collapse:collapse; font-size:12px; border:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-li-table th { padding:6px 10px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; color:var(--text-muted,#8d99a6); background:var(--control-bg,#f7f7f7); border:1px solid var(--border-color,#d1d8dd); white-space:nowrap; }
// 		.cbd-li-table td { padding:6px 10px; color:var(--text-color,#1c2126); border:1px solid var(--border-color,#d1d8dd); vertical-align:middle; }
// 		.cbd-li-table tbody tr:hover td { background:var(--control-bg,#f7f7f7); }
// 		.cbd-li-r { text-align:right !important; }
// 		.cbd-li-amt { font-weight:700; }
// 		.cbd-li-name { font-size:12px; font-weight:500; }
// 		.cbd-li-note { font-size:10px; color:var(--text-muted,#8d99a6); font-style:italic; margin-top:2px; }
// 		.cbd-li-sub  { color:var(--text-muted,#8d99a6); font-size:11px; }
// 		.cbd-li-month-col { color:var(--text-muted,#8d99a6); font-size:11px; white-space:nowrap; }

// 		/* ═══════════════════════════════════════════════════════════
// 		   OVERLAY & SIDE PANELS
// 		   ═══════════════════════════════════════════════════════════ */
// 		.cbd-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:2000; }
// 		.cbd-overlay--active { display:block; }

// 		.cbd-panel-left, .cbd-panel-right {
// 			position:fixed; top:0; bottom:0;
// 			width:49vw; max-width:720px; min-width:340px;
// 			background:var(--card-bg,#fff); z-index:2001;
// 			display:flex; flex-direction:column;
// 			transition:transform .28s cubic-bezier(.4,0,.2,1); overflow:hidden;
// 		}
// 		.cbd-panel-left  { left:0;  transform:translateX(-100%); border-right:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-panel-right { right:0; transform:translateX(100%);  border-left:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-panel-left.cbd-panel--open  { transform:translateX(0); }
// 		.cbd-panel-right.cbd-panel--open { transform:translateX(0); }
// 		.cbd-panel-left.cbd-panel--full, .cbd-panel-right.cbd-panel--full { width:60vw; max-width:860px; }

// 		/* ═══════════════════════════════════════════════════════════
// 		   PANEL HEADER
// 		   ═══════════════════════════════════════════════════════════ */
// 		.cbd-panel__header {
// 			display:flex; align-items:center;
// 			padding:0 14px; height:50px;
// 			border-bottom:1px solid var(--border-color,#d1d8dd);
// 			flex-shrink:0; gap:8px;
// 		}
// 		.cbd-panel__header > div:first-child { flex:1; min-width:0; }
// 		.cbd-panel__title { font-size:13px; font-weight:700; color:var(--text-color,#1c2126); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
// 		.cbd-panel__sub   { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
// 		.cbd-panel__close {
// 			display:inline-flex; align-items:center; justify-content:center;
// 			width:26px; height:26px; background:none;
// 			border:1px solid var(--border-color,#d1d8dd); border-radius:5px;
// 			font-size:13px; cursor:pointer; color:var(--text-muted,#8d99a6);
// 			line-height:1; flex-shrink:0; transition:background .12s, color .12s, border-color .12s;
// 		}
// 		.cbd-panel__close:hover { background:#FCEBEB; color:#A32D2D; border-color:#F09595; }
// 		.cbd-panel__header-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
// 		.cbd-expand-all-label {
// 			display:inline-flex; align-items:center; gap:5px;
// 			height:26px; padding:0 9px; font-size:11px; font-weight:500;
// 			color:var(--text-muted,#8d99a6); cursor:pointer; user-select:none;
// 			white-space:nowrap; border:1px solid var(--border-color,#d1d8dd);
// 			border-radius:5px; background:var(--control-bg,#f7f7f7);
// 			transition:background .12s, color .12s, border-color .12s; line-height:1;
// 			margin-top:9px;
// 		}
// 		.cbd-expand-all-label:hover { background:#E6F1FB; border-color:#B5D4F4; color:#185FA5; }
// 		.cbd-expand-chk { width:13px; height:13px; cursor:pointer; accent-color:#378ADD; margin:0; flex-shrink:0; vertical-align:middle; }

// 		/* ── Panel filter / body / total ── */
// 		.cbd-panel__filter { padding:10px 18px; border-bottom:1px solid var(--border-color,#d1d8dd); flex-shrink:0; }
// 		.cbd-filter-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text-muted,#8d99a6); margin-bottom:7px; }
// 		.cbd-filter-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
// 		.cbd-panel__body { flex:1; overflow-y:auto; padding:14px 18px; }
// 		.cbd-panel__body::-webkit-scrollbar { width:4px; }
// 		.cbd-panel__body::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }
// 		.cbd-panel-loading, .cbd-panel-empty { text-align:center; color:var(--text-muted,#8d99a6); font-size:13px; padding:30px 0; }
// 		.cbd-panel__sticky-total { display:flex; justify-content:space-between; align-items:center; padding:10px 18px; background:#E6F1FB; border-top:1px solid #B5D4F4; font-size:13px; font-weight:700; color:#0C447C; flex-shrink:0; }

// 		/* ── Item groups ── */
// 		.cbd-item-group { margin-bottom:10px; border:1px solid var(--border-color,#d1d8dd); border-radius:7px; overflow:hidden; }
// 		.cbd-item-group__head { display:flex; justify-content:space-between; align-items:center; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:#0C447C; background:#E6F1FB; padding:6px 10px; }
// 		.cbd-item-group__total { font-size:12px; color:#0C447C; font-weight:700; }
// 		.cbd-item-group__head--toggle { cursor:pointer; user-select:none; }
// 		.cbd-item-group__head--toggle:hover { filter:brightness(.96); }
// 		.cbd-igh-left { display:flex; align-items:center; gap:6px; }
// 		.cbd-igh-chevron { font-size:9px; color:#0C447C; transition:transform .18s ease; display:inline-block; }
// 		.cbd-item-group__body { overflow:hidden; transition:max-height .22s ease; max-height:2000px; }
// 		.cbd-item-group__body--collapsed { max-height:0 !important; }

// 		/* ── YTD / month cols ── */
// 		.cbd-ytd-bar { display:flex; align-items:center; flex-wrap:wrap; gap:6px; padding:7px 10px; background:#EEEDFE; border-radius:6px; margin-bottom:10px; font-size:11px; color:#3C3489; }
// 		.cbd-ytd-badge { display:inline-flex; align-items:center; padding:2px 7px; background:#534AB7; color:#fff; border-radius:4px; font-size:10px; font-weight:700; letter-spacing:.5px; flex-shrink:0; }
// 		.cbd-ytd-label { color:#3C3489; }
// 		.cbd-ytd-label b { color:#26215C; }
// 		.cbd-ytd-month { display:inline-flex; padding:1px 6px; background:#CECBF6; color:#26215C; border-radius:3px; font-size:10px; font-weight:600; margin-left:2px; }

// 		/* ── Centre close / panel badges ── */
// 		.cbd-centre-close { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:2005; display:none; align-items:center; gap:6px; padding:10px 18px; background:#1c2126; color:#fff; border:none; border-radius:24px; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 4px 20px rgba(0,0,0,.4); transition:background .15s,transform .15s; }
// 		.cbd-centre-close:hover { background:#A32D2D; transform:translate(-50%,-50%) scale(1.04); }
// 		.cbd-centre-close--visible { display:flex; }
// 		.cbd-panel__consolidated-badge { display:inline-flex; align-items:center; padding:1px 7px; background:#534AB7; color:#fff; border-radius:4px; font-size:10px; font-weight:700; letter-spacing:.4px; margin-right:5px; vertical-align:middle; }
// 		.cbd-panel__disb-badge { display:inline-flex; align-items:center; padding:2px 9px; background:#0d5c48; color:#fff; border-radius:5px; font-size:10px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; }

// 		/* ── Frappe MultiSelectList overrides ── */
// 		#cbd_month_multiselect .form-group, #cbd_fy_multiselect .form-group { margin-bottom:0; }
// 		#cbd_month_multiselect .control-label, #cbd_fy_multiselect .control-label { display:none; }
// 		#cbd_month_multiselect input.input-with-feedback, #cbd_fy_multiselect input.input-with-feedback { height:28px; padding:3px 8px; font-size:12px; border-radius:5px; }
// 		#cbd_month_multiselect .multiselect-list, #cbd_fy_multiselect .multiselect-list { display:flex; flex-wrap:wrap; gap:3px; margin-top:5px; }
// 		#cbd_month_multiselect .btn-xs, #cbd_fy_multiselect .btn-xs { padding:2px 7px; font-size:11px; border-radius:10px; background:#E6F1FB; color:#0C447C; border:1px solid #B5D4F4; }
// 		#cbd_fy_multiselect .btn-xs { background:#EEEDFE; color:#3C3489; border-color:#AFA9EC; }

// 		body.cbd-panels-open .navbar,
// 		body.cbd-panels-open .container-fluid.page-container > .row > .col:first-child { z-index:1 !important; }

// 		/* ── Empty ── */
// 		.cbd-empty { padding:24px; text-align:center; color:var(--text-muted,#8d99a6); font-size:13px; }

// 		/* ═══════════════════════════════════════════════════════════
// 		   DISBURSEMENT SIDE PANEL — MATCHES UTILISATION PANEL STYLE
// 		   ═══════════════════════════════════════════════════════════ */

// 		.cbd-disb-overlay {
// 			visibility:hidden; opacity:0;
// 			position:fixed; inset:0;
// 			background:rgba(0,0,0,.32);
// 			z-index:3000;
// 			transition:opacity .2s ease, visibility .2s ease;
// 		}
// 		.cbd-disb-overlay--active { visibility:visible; opacity:1; }

// 		/* Same dimensions as budget/utilisation panels */
// 		.cbd-disb-modal {
// 			position:fixed; top:0; bottom:0; right:0;
// 			width:50vw; max-width:760px; min-width:360px;
// 			background:var(--card-bg,#fff);
// 			z-index:3001;
// 			display:flex; flex-direction:column; overflow:hidden;
// 			border-left:1px solid var(--border-color,#d1d8dd);
// 			transform:translateX(100%);
// 			transition:transform .28s cubic-bezier(.4,0,.2,1);
// 		}
// 		.cbd-disb-modal--open { transform:translateX(0); }

// 		/* Badge — matches consolidated badge style */
// 		.cbd-panel__disb-badge {
// 			display:inline-flex; align-items:center;
// 			padding:1px 7px;
// 			background:#0d5c48; color:#fff;
// 			border-radius:4px;
// 			font-size:10px; font-weight:700;
// 			letter-spacing:.4px; margin-right:5px;
// 			vertical-align:middle;
// 		}

// 		/* ── Table wrapper ── */
// 		.cbd-dt-wrap { overflow-x:auto; }
// 		.cbd-dt-wrap::-webkit-scrollbar { height:4px; }
// 		.cbd-dt-wrap::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }

// 		/* ── Main table — same as cbd-li-table ── */
// 		.cbd-dt {
// 			width:100%; border-collapse:collapse;
// 			font-size:12px; white-space:nowrap;
// 		}
// 		.cbd-dt thead { position:sticky; top:0; z-index:2; }
// 		.cbd-dt__head-row th {
// 			padding:9px 12px;
// 			text-align:left;
// 			font-size:10px; font-weight:700;
// 			text-transform:uppercase; letter-spacing:.5px;
// 			color:var(--text-muted,#8d99a6);
// 			background:var(--control-bg,#f7f7f7);
// 			border-bottom:1px solid var(--border-color,#d1d8dd);
// 			border-right:1px solid var(--border-color,#d1d8dd);
// 		}
// 		.cbd-dt__head-row th:last-child { border-right:none; }

// 		/* ── Partner group header — same as cbd-item-group__head ── */
// 		.cbd-dt__partner-row td {
// 			padding:0;
// 			border-top:2px solid transparent;
// 		}
// 		.cbd-dt__partner-cell {
// 			display:flex; align-items:center; gap:8px;
// 			padding:6px 12px;
// 			background:#E6F1FB;
// 			font-size:10px; font-weight:700;
// 			text-transform:uppercase; letter-spacing:.6px;
// 			color:#0C447C;
// 			border-bottom:1px solid var(--border-color,#d1d8dd);
// 		}
// 		.cbd-dt__partner-icon {
// 			width:18px; height:18px;
// 			display:inline-flex; align-items:center; justify-content:center;
// 			flex-shrink:0; color:#0C447C;
// 		}
// 		.cbd-dt__partner-name { color:#0C447C; }
// 		.cbd-dt__partner-count {
// 			font-size:10px; color:#0C447C;
// 			background:rgba(55,138,221,.12);
// 			border-radius:10px; padding:0 7px;
// 			font-weight:600; text-transform:none; letter-spacing:0;
// 		}
// 		.cbd-dt__partner-total {
// 			margin-left:auto;
// 			font-size:12px; font-weight:700; color:#0C447C;
// 		}

// 		/* ── Budget rows ── */
// 		.cbd-dt__b-row { cursor:pointer; transition:background .1s; }
// 		.cbd-dt__b-row:hover td { background:var(--control-bg,#f7f7f7); }
// 		.cbd-dt__b-row td {
// 			padding:8px 12px;
// 			border-bottom:1px solid var(--border-color,#d1d8dd);
// 			border-right:1px solid var(--border-color,#d1d8dd);
// 			vertical-align:middle; color:var(--text-color,#1c2126);
// 		}
// 		.cbd-dt__b-row td:last-child { border-right:none; }

// 		.cbd-dt__ref-cell {
// 			display:flex; align-items:center; gap:7px;
// 			font-weight:600; color:var(--text-color,#1c2126);
// 		}
// 		.cbd-dt__chevron {
// 			display:inline-block;
// 			font-size:9px; color:var(--text-muted,#8d99a6);
// 			transition:transform .16s ease; flex-shrink:0;
// 		}
// 		.cbd-dt__disb-val { font-weight:700; color:#0C447C; }

// 		.cbd-dt__tag {
// 			display:inline-flex; align-items:center;
// 			font-size:11px; font-weight:600;
// 			border-radius:4px; padding:2px 7px;
// 		}
// 		.cbd-dt__tag--teal { background:#E1F5EE; color:#185FA5; border:none; }

// 		.cbd-dt__pct {
// 			display:inline-flex; align-items:center; justify-content:center;
// 			font-size:11px; font-weight:600;
// 			border-radius:4px; padding:2px 7px;
// 		}
// 		.cbd-dt__pct--green { background:#EAF3DE; color:#3B6D11; }
// 		.cbd-dt__pct--amber { background:#FAEEDA; color:#854F0B; }
// 		.cbd-dt__pct--red   { background:#FCEBEB; color:#A32D2D; }

// 		/* ── Tracker detail row ── */
// 		.cbd-dt__detail-row--collapsed { display:none; }
// 		.cbd-dt__detail-row td { padding:0; }
// 		.cbd-dt__detail-cell {
// 			background:#f7f9fc;
// 			border-bottom:1px solid var(--border-color,#d1d8dd);
// 		}

// 		/* Inner tracker — receipt/timeline style (no table headers) */
// 		.cbd-dt__trk-item {
// 			display:flex; align-items:center; gap:10px;
// 			padding:8px 16px 8px 20px;
// 			border-bottom:1px solid var(--border-color,#d1d8dd);
// 			position:relative;
// 		}
// 		.cbd-dt__trk-item--last { border-bottom:none; }
// 		.cbd-dt__trk-item:hover { background:var(--control-bg,#f7f7f7); }
// 		/* Timeline dot */
// 		.cbd-dt__trk-dot {
// 			width:8px; height:8px; flex-shrink:0;
// 			border-radius:50%;
// 			border:2px solid var(--border-color,#d1d8dd);
// 			background:var(--card-bg,#fff);
// 			position:relative; z-index:1;
// 		}
// 		.cbd-dt__trk-dot--first { border-color:#378ADD; background:#378ADD; }
// 		/* Vertical connector line between dots */
// 		.cbd-dt__trk-item:not(.cbd-dt__trk-item--last)::after {
// 			content:''; position:absolute;
// 			left:23px; top:22px;
// 			width:1px; bottom:-1px;
// 			background:var(--border-color,#d1d8dd);
// 		}
// 		.cbd-dt__trk-date { font-size:12px; color:var(--text-color,#1c2126); flex:1; }
// 		.cbd-dt__trk-amt  { font-size:13px; font-weight:700; color:#185FA5; flex-shrink:0; }
// 		.cbd-dt__trk-empty {
// 			padding:12px 16px; font-size:12px;
// 			color:var(--text-muted,#8d99a6); text-align:center;
// 		}

// 		/* ── Partner subtotal (flex div below table) ── */
// 		.cbd-dt__subtotal-row {
// 			display:flex; justify-content:space-between; align-items:center;
// 			padding:7px 14px;
// 			background:var(--control-bg,#f7f7f7);
// 			border-top:1px solid var(--border-color,#d1d8dd);
// 			font-size:11px;
// 		}
// 		.cbd-dt__subtotal-label { color:var(--text-muted,#8d99a6); font-weight:500; }

// 		/* ═══════════════════════════════════════════════════════════
// 		   RESPONSIVE — TABLET (≤1024px)
// 		   ═══════════════════════════════════════════════════════════ */
// 		@media (max-width: 1024px) {
// 			.cbd-root { padding: 10px 12px 30px; }
// 			.cbd-filter-col { flex:1 1 33.33%; }
// 			.cbd-overview-strip { flex-wrap:wrap; }
// 			.cbd-ostat { flex:1 1 33%; border-bottom:1px solid var(--border-color,#d1d8dd); }
// 			.cbd-summary-cards { grid-template-columns:1fr 1fr; }
// 			.cbd-partner__metrics { gap:4px; }
// 			.cbd-panel-left, .cbd-panel-right { width:60vw; max-width:100%; }
// 			.cbd-disb-modal { width:65vw; }
// 			.cbd-partner__footer { flex-wrap:wrap; }
// 		}

// 		/* ═══════════════════════════════════════════════════════════
// 		   RESPONSIVE — MOBILE (≤768px)
// 		   ═══════════════════════════════════════════════════════════ */
// 		@media (max-width: 768px) {
// 			.cbd-root { padding: 8px 10px 24px; }

// 			/* Filters: 2 per row */
// 			.cbd-filter-col { flex:1 1 50%; min-width:140px; }

// 			/* Overview: 2 per row */
// 			.cbd-overview-strip { flex-wrap:wrap; border-radius:8px; }
// 			.cbd-ostat { flex:1 1 50%; border-bottom:1px solid var(--border-color,#d1d8dd); }
// 			.cbd-ostat:nth-child(even) { border-right:none; }
// 			.cbd-ostat:nth-last-child(-n+2) { border-bottom:none; }
// 			.cbd-ostat__value { font-size:14px; }
// 			.cbd-ostat__icon { width:28px; height:28px; }

// 			/* Summary cards: stacked */
// 			.cbd-summary-cards { grid-template-columns:1fr; gap:8px; }
// 			.cbd-scard__value { font-size:18px; }

// 			/* Partner card: stack left/right */
// 			.cbd-partner__head { flex-direction:column; gap:8px; }
// 			.cbd-partner__right { flex-direction:row; align-items:center; justify-content:flex-start; flex-wrap:wrap; }
// 			.cbd-partner__metrics { gap:4px; }
// 			.cbd-metric { min-width:60px; padding:2px 6px; }
// 			.cbd-metric__value { font-size:11px; }
// 			.cbd-partner__footer { flex-direction:column; }
// 			.cbd-footer-block + .cbd-footer-block { border-left:none; border-top:1px solid var(--border-color,#d1d8dd); }

// 			/* Panels: full width on mobile */
// 			.cbd-panel-left, .cbd-panel-right {
// 				width:100vw; max-width:100%; min-width:0;
// 			}
// 			.cbd-panel-left  { left:0; }
// 			.cbd-panel-right { right:0; }
// 			.cbd-panel-left.cbd-panel--full, .cbd-panel-right.cbd-panel--full { width:100vw; max-width:100%; }

// 			/* Disbursement panel: full width */
// 			.cbd-disb-modal { width:100vw; max-width:100%; min-width:0; }

// 			/* Panel header: tighter */
// 			.cbd-panel__header { height:44px; padding:0 10px; }
// 			.cbd-panel__title { font-size:12px; }

// 			/* Table: smaller font */
// 			.cbd-table { font-size:11px; }
// 			.cbd-table th, .cbd-table td { padding:6px 8px; }
// 			.cbd-dt { font-size:11px; }
// 			.cbd-dt__head-row th, .cbd-dt__b-row td { padding:6px 8px; }

// 			/* Partner max-height */
// 			#cbd_partners { max-height:none; }
// 		}

// 		/* ═══════════════════════════════════════════════════════════
// 		   RESPONSIVE — SMALL MOBILE (≤480px)
// 		   ═══════════════════════════════════════════════════════════ */
// 		@media (max-width: 480px) {
// 			.cbd-filter-col { flex:1 1 100%; }
// 			.cbd-ostat { flex:1 1 100%; }
// 			.cbd-partner__metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:4px; }
// 			.cbd-metric { min-width:0; }
// 			.cbd-scard__value { font-size:16px; }
// 			.cbd-panel__header-actions .cbd-expand-all-label { display:none; }
// 		}

// 		`;
// 		document.head.appendChild(style);
// 		setTimeout(() => this._bind_view_buttons(), 0);
// 	}
// }

















frappe.pages['creche_budget_utilisation_summary'].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Creche Budget & Utilisation Summary',
		single_column: true
	});
	new CrecheBudgetDashboard(page);
};

class CrecheBudgetDashboard {

	constructor(page) {
		this.page = page;
		this.panel = null;
		this._perm_scope = null;
		this.make();
		this._init_with_permissions();
	}

	make() {
		this.page.main.html(`
			<div class="cbd-root">
				<div class="cbd-overview-strip" id="cbd_overview_strip" style="display:none"></div>
				<div class="cbd-summary-cards" id="cbd_summary_cards"></div>
				<div class="cbd-section-label">Partners &amp; Grants</div>
				<div id="cbd_partners"></div>
			</div>
		`);

		this.page.set_secondary_action('Clear all', () => this._clear_filters(), 'close');
		this.page.set_primary_action('Apply', () => this.load_data(this._get_effective_filters()), 'filter');

		this._inject_styles();
		this._ensure_panels();
		this._build_filters();
	}

	_init_with_permissions() {
		frappe.dom.freeze('Loading…');
		frappe.call({
			method: 'creche_reports.api.budget_utilisation_summary.get_partner_options',
			args: { txt: '' },
		}).then(r => {
			frappe.dom.unfreeze();
			const rows = r.message || [];
			if (!rows.length) { this._render_no_access(); return; }

			const partner_ids = rows.map(r => r.name);
			this._partner_label_to_id = {};
			rows.forEach(r => { this._partner_label_to_id[r.partner_name || r.name] = r.name; });

			const f = this._fields && this._fields.partner_id;
			if (f) {
				const opts = rows.map(r => ({ value: r.partner_name || r.name, description: '' }));
				const orig = f.df.get_data;
				f.df.get_data = () => opts;
				try { f.set_value(opts.map(o => o.value)); } catch(e) {}
				f.df.get_data = orig;
			}
			this.load_data({ partner_id: partner_ids });
		}).catch(() => {
			frappe.dom.unfreeze();
			this.load_data({});
		});
	}

	_render_no_access() {
		const sc = document.getElementById('cbd_summary_cards');
		const pa = document.getElementById('cbd_partners');
		const ov = document.getElementById('cbd_overview_strip');
		if (sc) sc.innerHTML = '';
		if (ov) ov.style.display = 'none';
		if (pa) pa.innerHTML = `
			<div class="cbd-empty" style="padding:40px;text-align:center">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d8dd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px">
					<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
				</svg>
				<div style="font-size:14px;font-weight:600;color:#6b7280">No access</div>
				<div style="font-size:12px;color:#9ca3af;margin-top:4px">You do not have any partner assigned. Contact your administrator.</div>
			</div>`;
	}

	_get_effective_filters() { return this._get_filter_values(); }

	// ─────────────────────────────────────────────
	// FILTERS
	// ─────────────────────────────────────────────

	_build_filters() {
		const $root = $(this.page.main).find('.cbd-root');
		const $row1 = $(`<div class="frappe-control-group row custom-filter-row" id="cbd_frow1"></div>`).prependTo($root);
		const $row2 = $(`<div class="frappe-control-group row custom-filter-row" id="cbd_frow2"></div>`).insertAfter($row1);
		this._fields = {};
		this._sel    = {};

		const col = ($row, key) => $(`<div class="cbd-filter-col col-sm-12" id="cbd_fcol_${key}"></div>`).appendTo($row);

		// ── Partner ──────────────────────────────────────────────────────────
		const partner_ctrl = frappe.ui.form.make_control({
			parent: col($row1, 'partner_id'),
			df: {
				label: 'Partner', fieldtype: 'MultiSelectList', fieldname: 'partner_id',
				get_data: (txt) => frappe.call({
					method: 'creche_reports.api.budget_utilisation_summary.get_partner_options',
					args: { txt: txt || '' },
				}).then(r => {
					const rows = r.message || [];
					this._partner_label_to_id = this._partner_label_to_id || {};
					rows.forEach(p => { this._partner_label_to_id[p.partner_name || p.name] = p.name; });
					return rows.map(p => ({ value: p.partner_name || p.name, description: '' }));
				}),
				change: () => {
					['budget_ref','grant_id','state','district','block'].forEach(k => {
						const f = this._fields[k]; if (!f) return; f.set_value([]); f.refresh();
					});
					this._sel.partner_id = partner_ctrl.get_value() || [];
				},
			},
			render_input: true,
		});
		partner_ctrl.refresh();
		this._fields.partner_id = partner_ctrl;

		// ── Budget Reference ─────────────────────────────────────────────────
		const budget_ref_ctrl = frappe.ui.form.make_control({
			parent: col($row1, 'budget_ref'),
			df: {
				label: 'Budget Reference', fieldtype: 'MultiSelectList', fieldname: 'budget_ref',
				get_data: (txt) => {
					const raw = (this._fields.partner_id?.get_value() || []);
					const partners = raw.map(l => (this._partner_label_to_id && this._partner_label_to_id[l]) || l);
					const filters = {};
					if (partners.length) filters.partner_id = ['in', partners];
					if (txt) filters.budget_reference_name = ['like', `%${txt}%`];
					return frappe.db.get_list('Creche Budget', { filters, fields: ['budget_reference_name'], limit: 50 })
						.then(rows => [...new Set(rows.map(r => r.budget_reference_name).filter(Boolean))].map(v => ({ value: v, description: '' })));
				},
				change: () => { this._sel.budget_ref = budget_ref_ctrl.get_value() || []; },
			},
			render_input: true,
		});
		budget_ref_ctrl.refresh();
		this._fields.budget_ref = budget_ref_ctrl;

		// ── Grant ID ─────────────────────────────────────────────────────────
		const grant_id_ctrl = frappe.ui.form.make_control({
			parent: col($row1, 'grant_id'),
			df: {
				label: 'Grant ID', fieldtype: 'MultiSelectList', fieldname: 'grant_id',
				get_data: (txt) => {
					const raw = (this._fields.partner_id?.get_value() || []);
					const partners = raw.map(l => (this._partner_label_to_id && this._partner_label_to_id[l]) || l);
					const filters = {};
					if (partners.length) filters.partner_id = ['in', partners];
					if (txt) filters.grant_id = ['like', `%${txt}%`];
					return frappe.db.get_list('Creche Budget', { filters, fields: ['grant_id'], limit: 50 })
						.then(rows => [...new Set(rows.map(r => r.grant_id).filter(Boolean))].map(v => ({ value: v, description: '' })));
				},
				change: () => { this._sel.grant_id = grant_id_ctrl.get_value() || []; },
			},
			render_input: true,
		});
		grant_id_ctrl.refresh();
		this._fields.grant_id = grant_id_ctrl;

		// ── Financial Year ────────────────────────────────────────────────────
		const fy_ctrl = frappe.ui.form.make_control({
			parent: col($row1, 'financial_year'),
			df: {
				label: 'Financial Year', fieldtype: 'MultiSelectList', fieldname: 'financial_year',
				get_data: (txt) => frappe.db.get_list('Financial year', {
					fields: ['name'], limit: 50, order_by: 'name desc',
					...(txt ? { filters: { name: ['like', `%${txt}%`] } } : {}),
				}).then(rows => rows.map(r => ({ value: r.name, description: '' }))),
				change: () => {
					this._sel.financial_year = fy_ctrl.get_value() || [];
					this._on_filter_change('financial_year');
				},
			},
			render_input: true,
		});
		fy_ctrl.refresh();
		this._fields.financial_year = fy_ctrl;

		// ── Month ─────────────────────────────────────────────────────────────
		const month_ctrl = frappe.ui.form.make_control({
			parent: col($row1, 'month'),
			df: {
				label: 'Month', fieldtype: 'MultiSelectList', fieldname: 'month',
				get_data: (txt) => {
					const ORDER = ['April','May','June','July','August','September',
					               'October','November','December','January','February','March'];
					return frappe.db.get_list('Months', { fields: ['name'], limit: 12 })
						.then(rows => rows.filter(r => !txt || r.name.toLowerCase().includes(txt.toLowerCase()))
							.sort((a,b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name))
							.map(r => ({ value: r.name, description: '' })));
				},
				change: () => {
					this._sel.month = month_ctrl.get_value() || [];
					this._on_filter_change('month');
				},
			},
			render_input: true,
		});
		month_ctrl.refresh();
		this._fields.month = month_ctrl;

		// ── Start Date ────────────────────────────────────────────────────────
		const start_ctrl = frappe.ui.form.make_control({
			parent: col($row2, 'start_date'),
			df: {
				label: 'Start Date', fieldtype: 'Date', fieldname: 'start_date',
				change: () => {
					this._sel.start_date = start_ctrl.get_value() || '';
					this._on_filter_change('start_date');
					this._validate_dates('start_date');
				},
			},
			render_input: true,
		});
		start_ctrl.refresh();
		this._fields.start_date = start_ctrl;

		// ── End Date ──────────────────────────────────────────────────────────
		const end_ctrl = frappe.ui.form.make_control({
			parent: col($row2, 'end_date'),
			df: {
				label: 'End Date', fieldtype: 'Date', fieldname: 'end_date',
				change: () => {
					this._sel.end_date = end_ctrl.get_value() || '';
					this._on_filter_change('end_date');
					this._validate_dates('end_date');
				},
			},
			render_input: true,
		});
		end_ctrl.refresh();
		this._fields.end_date = end_ctrl;

		// ── State / District / Block ──────────────────────────────────────────
		['state','district','block'].forEach(key => {
			const ctrl = frappe.ui.form.make_control({
				parent: col($row2, key),
				df: {
					label: key.charAt(0).toUpperCase() + key.slice(1),
					fieldtype: 'MultiSelectList', fieldname: key,
					get_data: (txt) => {
						const raw = (this._fields.partner_id?.get_value() || []);
						const partners = raw.map(l => (this._partner_label_to_id && this._partner_label_to_id[l]) || l);
						const filters = {};
						if (partners.length) filters.partner_id = ['in', partners];
						if (txt) filters[key] = ['like', `%${txt}%`];
						return frappe.db.get_list('Creche Budget', { filters, fields: [key], limit: 100 })
							.then(rows => [...new Set(rows.map(r => r[key]).filter(Boolean))].sort().map(v => ({ value: v, description: '' })));
					},
					change: () => { this._sel[key] = ctrl.get_value() || []; },
				},
				render_input: true,
			});
			ctrl.refresh();
			this._fields[key] = ctrl;
		});

		// FIX 6: retry loop instead of a single 400ms timeout
		let _visN = 0;
		const _visT = setInterval(() => {
			_visN++;
			// Check if all key controls have rendered their $wrapper
			const ready = ['financial_year','month','start_date','end_date'].every(k => {
				const f = this._fields[k];
				return f && f.$wrapper && f.$wrapper[0];
			});
			if (ready || _visN >= 30) {
				clearInterval(_visT);
				this._setup_filter_visibility();
			}
		}, 200);
	}

	// ─────────────────────────────────────────────
	// DATE VALIDATION
	// ─────────────────────────────────────────────

	_validate_dates(changed_field) {
		const sd = this._fields.start_date?.get_value() || '';
		const ed = this._fields.end_date?.get_value()   || '';
		if (!sd || !ed) return true;
		if (new Date(sd) > new Date(ed)) {
			frappe.show_alert({ message: __('Start Date cannot be later than End Date.'), indicator: 'orange' }, 4);
			try {
				if (changed_field === 'start_date') this._fields.start_date.set_value('');
				else                                this._fields.end_date.set_value('');
			} catch(_) {}
			return false;
		}
		return true;
	}

	// ─────────────────────────────────────────────
	// FILTER VISIBILITY
	// ─────────────────────────────────────────────

	_setup_filter_visibility() {
		const GROUP_A = ['financial_year', 'month'];
		const GROUP_B = ['start_date', 'end_date'];

		const _hasValue = (key) => {
			try {
				const f = this._fields[key];
				const v = f?.get_value ? f.get_value() : null;
				if (v == null || v === '') return false;
				return Array.isArray(v) ? v.length > 0 : String(v).trim() !== '';
			} catch(_) { return false; }
		};

		const _getEl = (key) => {
			const col = document.getElementById(`cbd_fcol_${key}`);
			if (col) return col;
			const f = this._fields[key];
			if (f?.$wrapper?.[0]) return f.$wrapper[0];
			return null;
		};

		const _setVisible = (keys, show) => {
			keys.forEach(k => {
				const el = _getEl(k);
				if (!el) return;
				el.style.display = show ? '' : 'none';
			});
		};

		const _sync = () => {
			const aOn = GROUP_A.some(_hasValue);
			const bOn = GROUP_B.some(_hasValue);
			if (bOn && !aOn)      { _setVisible(GROUP_A, false); _setVisible(GROUP_B, true);  }
			else if (aOn && !bOn) { _setVisible(GROUP_A, true);  _setVisible(GROUP_B, false); }
			else                  { _setVisible(GROUP_A, true);  _setVisible(GROUP_B, true);  }
		};

		[...GROUP_A, ...GROUP_B].forEach(key => {
			const el = _getEl(key);
			if (el && !el._cbdMutObs) {
				const obs = new MutationObserver(() => setTimeout(_sync, 80));
				obs.observe(el, { childList: true, subtree: true });
				el._cbdMutObs = obs;
			}
		});

		['cbd_frow1','cbd_frow2'].forEach(rowId => {
			const rowEl = document.getElementById(rowId);
			if (rowEl && !rowEl._cbdFormObs) {
				const obs = new MutationObserver(() => { _sync(); });
				obs.observe(rowEl, { childList: true, subtree: false });
				rowEl._cbdFormObs = obs;
			}
		});

		this._sync_filter_visibility = _sync;
		_sync();
	}

	// ─────────────────────────────────────────────
	// FILTER HELPERS
	// ─────────────────────────────────────────────

	_on_filter_change(key) {
		if (this._sync_filter_visibility) {
			setTimeout(this._sync_filter_visibility, 50);
		}
	}

	_clear_filters() {
		// FIX 4: reset _active_filters immediately before the API call
		this._active_filters = {};

		Object.entries(this._fields || {}).forEach(([k, f]) => {
			try { f.set_value(f.df.fieldtype === 'Date' ? '' : []); } catch(e) {}
		});
		['financial_year','month','start_date','end_date'].forEach(k => {
			const el = document.getElementById(`cbd_fcol_${k}`);
			if (el) el.style.display = '';
		});
		this.load_data({});
	}

	_get_val(key) {
		const f = this._fields && this._fields[key];
		if (!f) return [];
		const v = f.get_value();
		if (!v) return [];
		if (Array.isArray(v)) return v.filter(Boolean);
		return [v];
	}

	_get_filter_values() {
		const v = {};
		['partner_id','budget_ref','grant_id','financial_year','month','state','district','block'].forEach(k => {
			let arr = this._get_val(k);
			if (arr.length) {
				if (k === 'partner_id' && this._partner_label_to_id) {
					arr = arr.map(label => this._partner_label_to_id[label] || label);
				}
				v[k] = arr;
			}
		});
		['start_date','end_date'].forEach(k => {
			const f = this._fields && this._fields[k];
			const val = f ? f.get_value() : '';
			if (val) v[k] = val;
		});
		return v;
	}

	// FIX 2: _panel_filters now includes partner_id
	_panel_filters() {
		const af = this._active_filters || {};
		return {
			partner_id:     af.partner_id     || null,
			start_date:     af.start_date     || null,
			end_date:       af.end_date       || null,
			financial_year: af.financial_year || null,
			month:          af.month          || null,
		};
	}

	// ─────────────────────────────────────────────
	// DATA
	// ─────────────────────────────────────────────

	load_data(filters) {
		this._active_filters = filters || {};
		frappe.call({
			method: 'creche_reports.api.budget_utilisation_summary.get_partner_budget_summary',
			freeze: true, freeze_message: 'Loading budget summary…',
			args: { filters: filters || {} },
			callback: (r) => {
				if (!r.message) return;
				// FIX 3: populate _all_partners BEFORE render_summary wires card clicks
				this._all_partners = r.message.partners || [];
				this.render_summary(r.message.summary);
				this.render_partners(r.message.partners);
			}
		});
	}

	// ─────────────────────────────────────────────
	// SUMMARY CARDS
	// ─────────────────────────────────────────────

	render_summary(s) {
		if (!s) return;
		const el = document.getElementById('cbd_summary_cards');
		if (!el) return;
		const cards = [
			{ label:'Total Budget', value:this._fmt(s.total_budget), sub:'Approved budget', accent:'blue', panel:'budget', drill:'View budget items →', icon:`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>` },
			{ label:'Total Utilisation', value:this._fmt(s.total_utilisation), sub:'Reported utilisation', accent:'green', panel:'utilisation', drill:'View utilisation →', icon:`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#639922" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` },
			{ label:'Total Disbursement', value:this._fmt(s.total_disbursement), sub:'Released amount', accent:'purple', panel:'disbursement', drill:'View disbursements →', icon:`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>` },
		];
		const cardsWithRaw = [
			{...cards[0], raw: s.total_budget},
			{...cards[1], raw: s.total_utilisation},
			{...cards[2], raw: s.total_disbursement},
		];
		el.innerHTML = cardsWithRaw.map(c => `
			<div class="cbd-scard cbd-scard--${c.accent}" data-panel="${c.panel}">
				<div class="cbd-scard__top">
					<span class="cbd-scard__label">${c.label}</span>
					<span class="cbd-scard__svg">${c.icon}</span>
				</div>
				<div class="cbd-scard__value">${this._fmtTip(c.raw, c.label)}</div>
				<div class="cbd-scard__sub">${c.sub}<span class="cbd-scard__drill">${c.drill}</span></div>
			</div>`).join('');
		el.querySelectorAll('.cbd-scard').forEach(card => {
			card.addEventListener('click', () => {
				const panel = card.dataset.panel;
				if (panel === 'disbursement') { const all_partner_ids = (this._all_partners || []).map(p => p.partner_id).filter(Boolean); this._open_disbursement_panel('Overall Disbursements', null, all_partner_ids); }
				else { this._open_overall_panels(panel); }
			});
		});
	}

	_render_overview_strip(partners) {
		const el = document.getElementById('cbd_overview_strip');
		if (!el) return;
		if (!partners.length) { el.style.display = 'none'; return; }

		const num_partners  = partners.length;
		const num_budgets   = partners.reduce((s,p) => s+(p.budgets||[]).length, 0);
		const total_creches = partners.reduce((s,p) => s+(p.total_creches||0), 0);
		const all_states    = [...new Set(partners.flatMap(p=>(p.budgets||[]).map(b=>b.state).filter(Boolean)))].sort();
		const all_districts = [...new Set(partners.flatMap(p=>(p.budgets||[]).flatMap(b=>b.district?[b.district]:[])))].sort();
		const all_blocks    = [...new Set(partners.flatMap(p=>(p.budgets||[]).flatMap(b=>b.block?[b.block]:[])))].sort();

		const partner_rows = partners.map(p => ({
			name:    p.partner_name,
			budgets: (p.budgets||[]).length,
			creches: p.total_creches || 0,
			util:    p.utilised_pct  || 0,
		}));

		const budget_rows = partners.flatMap(p =>
			(p.budgets||[]).map(b => ({
				ref:     b.budget_reference_name,
				partner: p.partner_name,
				state:   b.state,
				fy:      b.financial_year,
				creches: b.no_of_creches || 0,
			}))
		);

		// FIX 6: store raw numeric count alongside formatted value for pluralisation
		const stats = [
			{
				key:'partners', value:num_partners, rawCount: num_partners,
				label:'Partner'+(num_partners!==1?'s':''),
				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
				drillData: partner_rows,
				drillType: 'partners',
			},
			{
				key:'budgets', value:num_budgets, rawCount: num_budgets,
				label:'Allocated Budget'+(num_budgets!==1?'s':''),
				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
				drillData: budget_rows,
				drillType: 'budgets',
			},
			{
				key:'creches', value:total_creches.toLocaleString('en-IN'), rawCount: total_creches,
				label:'Total Creche'+(total_creches!==1?'s':''),
				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
				drillData: budget_rows,
				drillType: 'creches',
			},
			{
				key:'states', value:all_states.length, rawCount: all_states.length,
				label:'Working State'+(all_states.length!==1?'s':''),
				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
				drillData: all_states,
				drillType: 'list',
			},
			{
				key:'districts', value:all_districts.length, rawCount: all_districts.length,
				label:'District'+(all_districts.length!==1?'s':''),
				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
				drillData: all_districts,
				drillType: 'list',
			},
			{
				key:'blocks', value:all_blocks.length, rawCount: all_blocks.length,
				label:'Block'+(all_blocks.length!==1?'s':''),
				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
				drillData: all_blocks,
				drillType: 'list',
			},
		];

		el.style.display = '';
		el.innerHTML = stats.map(s => `
			<div class="cbd-ostat cbd-ostat--clickable" data-key="${s.key}" title="Click to see details">
				<span class="cbd-ostat__icon">${s.icon}</span>
				<div class="cbd-ostat__body">
					<div class="cbd-ostat__value">${s.value}</div>
					<div class="cbd-ostat__label">${s.label}</div>
				</div>
				<svg class="cbd-ostat__arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
			</div>`).join('');

		el.querySelectorAll('.cbd-ostat--clickable').forEach(card => {
			const key  = card.dataset.key;
			const stat = stats.find(s => s.key === key);
			if (!stat) return;
			card.addEventListener('click', () => this._open_ostat_drill(stat));
		});
	}

	// ── Overview stat drill-down ────────────────────────────────────────────
	_open_ostat_drill(stat) {
		const old = document.getElementById('cbd_drill_modal_wrap');
		if (old) old.remove();

		const wrap = document.createElement('div');
		wrap.id        = 'cbd_drill_modal_wrap';
		wrap.className = 'cbd-drill-modal-wrap';

		const isWide = (stat.drillType === 'partners' || stat.drillType === 'budgets' || stat.drillType === 'creches');

		// FIX 6: use rawCount (number) for pluralisation, value (possibly formatted string) for display
		const rawCount = stat.rawCount !== undefined ? stat.rawCount : stat.value;

		wrap.innerHTML = `
			<div class="cbd-drill-modal ${isWide ? 'cbd-drill-modal--wide' : 'cbd-drill-modal--narrow'}">
				<div class="cbd-drill-modal__header">
					<div class="cbd-drill-modal__header-left">
						<span class="cbd-drill-modal__icon">${stat.icon}</span>
						<div>
							<div class="cbd-drill-modal__title">${frappe.utils.escape_html(stat.label)}</div>
							<div class="cbd-drill-modal__sub">${stat.value} record${rawCount != 1 ? 's' : ''}</div>
						</div>
					</div>
					<button class="cbd-drill-modal__close" id="cbd_drill_close" title="Close">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				</div>
				<div class="cbd-drill-modal__body">${this._build_ostat_content(stat)}</div>
				<div class="cbd-drill-modal__footer">
					<button class="btn btn-default btn-sm" id="cbd_drill_footer_close">Close</button>
				</div>
			</div>`;

		document.body.appendChild(wrap);

		wrap.addEventListener('click', (e) => {
			if (e.target === wrap) this._close_drill_panel();
		});
		wrap.querySelector('#cbd_drill_close').addEventListener('click', () => this._close_drill_panel());
		wrap.querySelector('#cbd_drill_footer_close').addEventListener('click', () => this._close_drill_panel());

		this._drill_key_handler = (e) => { if (e.key === 'Escape') this._close_drill_panel(); };
		document.addEventListener('keydown', this._drill_key_handler);

		requestAnimationFrame(() => wrap.classList.add('cbd-drill-modal-wrap--open'));
	}

	_close_drill_panel() {
		const wrap = document.getElementById('cbd_drill_modal_wrap');
		if (!wrap) return;
		wrap.classList.remove('cbd-drill-modal-wrap--open');
		wrap.addEventListener('transitionend', () => wrap.remove(), { once: true });
		if (this._drill_key_handler) {
			document.removeEventListener('keydown', this._drill_key_handler);
			this._drill_key_handler = null;
		}
	}

	_build_ostat_content(stat) {
		const { drillType, drillData } = stat;

		if (drillType === 'list') {
			if (!drillData.length) return '<div class="cbd-drill-empty">No data available.</div>';
			const allPartners = this._all_partners || [];
			return `<div class="cbd-drill-list">
				${drillData.map((item, i) => {
					const matching = allPartners.flatMap(p =>
						(p.budgets||[]).filter(b =>
							b.state === item || b.district === item || b.block === item
						).map(b => ({ ref: b.budget_reference_name, partner: p.partner_name, creches: b.no_of_creches||0 }))
					);
					const total_creches = matching.reduce((s,b) => s + b.creches, 0);
					const partner_names = [...new Set(matching.map(b => b.partner))];
					return `
					<div class="cbd-drill-list__row">
						<span class="cbd-drill-list__num">${i+1}</span>
						<span class="cbd-drill-list__dot"></span>
						<div class="cbd-drill-list__body">
							<div class="cbd-drill-list__text">${frappe.utils.escape_html(item)}</div>
							<div class="cbd-drill-list__detail">
								${matching.length} budget${matching.length!==1?'s':''}
								${total_creches ? ` · ${total_creches.toLocaleString('en-IN')} creches` : ''}
								${partner_names.length ? ` · ${partner_names.map(n => frappe.utils.escape_html(n)).join(', ')}` : ''}
							</div>
						</div>
						${total_creches ? `<span class="cbd-drill-brow__creche-badge">${total_creches.toLocaleString('en-IN')}</span>` : ''}
					</div>`;
				}).join('')}
			</div>`;
		}

		if (drillType === 'partners') {
			if (!drillData.length) return '<div class="cbd-drill-empty">No partners found.</div>';
			return `
			<div class="cbd-drill-cards">
				${drillData.map((p) => {
					const util    = parseFloat(p.util) || 0;
					const bar_cls = util >= 75 ? 'green' : util >= 50 ? 'amber' : 'red';
					const chip_cls = util >= 75 ? 'cbd-chip--green' : util >= 50 ? 'cbd-chip--amber' : 'cbd-chip--red';
					const initials = p.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
					const full = (this._all_partners||[]).find(ap => ap.partner_name === p.name);
					const states = full ? [...new Set((full.budgets||[]).map(b=>b.state).filter(Boolean))].sort() : [];
					return `
					<div class="cbd-drill-card">
						<div class="cbd-drill-card__top">
							<div class="cbd-drill-card__avatar">${frappe.utils.escape_html(initials)}</div>
							<div class="cbd-drill-card__info">
								<div class="cbd-drill-card__name">${frappe.utils.escape_html(p.name)}</div>
								<div class="cbd-drill-card__meta">
									${p.budgets} budget${p.budgets!==1?'s':''}
									<span class="cbd-drill-card__sep">·</span>
									${p.creches.toLocaleString('en-IN')} creches
									${states.length ? '<span class="cbd-drill-card__sep">·</span>' + states.map(s => frappe.utils.escape_html(s)).join(', ') : ''}
								</div>
							</div>
							<span class="cbd-chip ${chip_cls}">${util.toFixed(1)}%</span>
						</div>
						<div class="cbd-drill-card__amounts">
							<div class="cbd-drill-card__amt-item">
								<span class="cbd-drill-card__amt-label">Budget</span>
								<span class="cbd-drill-card__amt-val">${this._fmtTip(full ? full.total_budget : null,'Budget')}</span>
							</div>
							<div class="cbd-drill-card__amt-item">
								<span class="cbd-drill-card__amt-label">Disbursed</span>
								<span class="cbd-drill-card__amt-val">${this._fmtTip(full ? full.total_disbursement : null,'Disbursed')}</span>
							</div>
							<div class="cbd-drill-card__amt-item">
								<span class="cbd-drill-card__amt-label">Utilised</span>
								<span class="cbd-drill-card__amt-val" style="color:#3B6D11;font-weight:600">${this._fmtTip(full ? full.total_utilisation : null,'Utilised')}</span>
							</div>
						</div>
						<div class="cbd-drill-card__bar-track">
							<div class="cbd-drill-card__bar-fill cbd-drill-card__bar-fill--${bar_cls}" style="width:${Math.min(util,100)}%"></div>
						</div>
					</div>`;
				}).join('')}
			</div>`;
		}

		if (drillType === 'budgets' || drillType === 'creches') {
			if (!drillData.length) return '<div class="cbd-drill-empty">No budgets found.</div>';
			const show_creches = drillType === 'creches';
			const allPartners = this._all_partners || [];
			return `
			<div class="cbd-drill-blist">
				${drillData.map((b, i) => {
					const pdata  = allPartners.find(p => p.partner_name === b.partner);
					const bdata  = pdata ? (pdata.budgets||[]).find(bd => bd.budget_reference_name === b.ref) : null;
					const b_amt  = bdata ? this._fmt(bdata.budget)       : null;
					const u_amt  = bdata ? this._fmt(bdata.utilisation)   : null;
					const u_pct  = bdata ? parseFloat(bdata.utilised_pct)||0 : 0;
					const pct_cls = u_pct >= 75 ? 'cbd-chip--green' : u_pct >= 50 ? 'cbd-chip--amber' : 'cbd-chip--red';
					return `
					<div class="cbd-drill-brow">
						<div class="cbd-drill-brow__left">
							<div class="cbd-drill-brow__seq">${i+1}</div>
							<div class="cbd-drill-brow__detail">
								<div class="cbd-drill-brow__ref">
									<span class="cbd-chip cbd-chip--blue">${frappe.utils.escape_html(b.ref||'—')}</span>
									${show_creches && b.creches ? `<span class="cbd-drill-brow__creche-badge">${b.creches.toLocaleString('en-IN')} creches</span>` : ''}
									${bdata && u_pct ? `<span class="cbd-chip ${pct_cls}" style="font-size:10px">${u_pct.toFixed(1)}%</span>` : ''}
								</div>
								<div class="cbd-drill-brow__meta">
									<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
									${frappe.utils.escape_html(b.partner||'—')}
									<span class="cbd-drill-brow__sep">|</span>
									<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
									${frappe.utils.escape_html(b.state||'—')}
									${b_amt ? `<span class="cbd-drill-brow__sep">|</span> Budget: <strong>${frappe.utils.escape_html(b_amt)}</strong>` : ''}
									${u_amt ? `· Utilised: <strong style="color:#3B6D11">${frappe.utils.escape_html(u_amt)}</strong>` : ''}
								</div>
							</div>
						</div>
						<span class="cbd-drill-brow__fy">${frappe.utils.escape_html(b.fy||'—')}</span>
					</div>`;
				}).join('')}
			</div>`;
		}

		return '<div class="cbd-drill-empty">No details available.</div>';
	}

	render_partners(partners) {
		this._all_partners = partners || [];
		this._render_overview_strip(partners || []);
		const el = document.getElementById('cbd_partners');
		if (!partners || !partners.length) { el.innerHTML = '<div class="cbd-empty">No partner data available.</div>'; return; }
		el.innerHTML = '';
		partners.forEach((partner, idx) => {
			const u_pct = parseFloat(partner.utilised_pct)||0;
			const badge_cls = this._badge_cls(u_pct); const fill_cls = this._fill_cls(u_pct);
			const total_creches = (partner.budgets||[]).reduce((s,b)=>s+(parseInt(b.no_of_creches)||0),0);
			const states = [...new Set((partner.budgets||[]).map(b=>b.state).filter(Boolean))].sort();
			const refs   = [...new Set((partner.budgets||[]).map(b=>b.budget_reference_name).filter(Boolean))].sort();
			const state_tags = states.length ? states.map(s=>`<span class="cbd-stag cbd-stag--blue"><span class="cbd-stag__dot cbd-stag__dot--blue"></span>${frappe.utils.escape_html(s)}</span>`).join('') : '<span class="cbd-stag cbd-stag--gray">—</span>';
			const ref_tags = refs.length ? refs.map(r=>`<span class="cbd-stag cbd-stag--purple"><span class="cbd-stag__dot cbd-stag__dot--purple"></span>${frappe.utils.escape_html(r)}</span>`).join('') : '<span class="cbd-stag cbd-stag--gray">—</span>';
			const budget_ids_str = frappe.utils.escape_html((partner.budgets||[]).map(b=>b.budget_id).join(','));
			const partner_id_esc = frappe.utils.escape_html(partner.partner_id||'');
			const partner_name_esc = frappe.utils.escape_html(partner.partner_name||'');
			const card = document.createElement('div');
			card.className = 'cbd-partner';
			card.innerHTML = `
				<div class="cbd-partner__head" id="cbd_ph_${idx}">
					<div class="cbd-partner__left">
						<div class="cbd-partner__name">${this._icon_partner()}${partner_name_esc}</div>
						<div class="cbd-partner__grants">Grants: ${frappe.utils.escape_html(partner.grant_ids||'—')}</div>
						<div class="cbd-partner__metrics">
							${this._metric('Budget',null,partner.total_budget)}
							${this._metric('Disbursed',null,partner.total_disbursement)}
							${this._metric('Utilised',null,partner.total_utilisation)}
							${this._metric('Bal. Budget',null,partner.total_balance_budget)}
							${this._metric('Bank Bal.',null,partner.total_bank_balance)}
							${this._metric('Interest',null,partner.total_interest)}
							${this._metric('Total Creches',total_creches)}
							${this._metric_pct('Util % of Budget',u_pct)}
							${this._metric_pct('Util % vs Disbursed',this._util_vs_disb_pct(partner))}
						</div>
						<div class="cbd-partner__footer">
							<div class="cbd-footer-block"><div class="cbd-footer-block__label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>Operating States</div><div class="cbd-footer-block__tags">${state_tags}</div></div>
							<div class="cbd-footer-block"><div class="cbd-footer-block__label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Budget References</div><div class="cbd-footer-block__tags">${ref_tags}</div></div>
						</div>
						<div class="cbd-prog" style="margin-top:7px"><div class="cbd-prog__fill cbd-prog__fill--${fill_cls}" style="width:${Math.min(u_pct,100)}%"></div></div>
					</div>
					<div class="cbd-partner__right">
						<div class="cbd-badge cbd-badge--${badge_cls}">${u_pct.toFixed(1)}% utilised</div>
						<div class="cbd-partner__btn-group">
							<button class="cbd-consolidated-btn cbd-icon-btn" title="View Consolidated Budget &amp; Utilisation" data-partner-name="${partner_name_esc}" data-budget-ids="${budget_ids_str}" data-grant-start="${frappe.utils.escape_html((partner.budgets||[]).map(b=>b.grant_start).filter(Boolean).sort()[0]||'')}" data-grant-end="${frappe.utils.escape_html((partner.budgets||[]).map(b=>b.grant_end).filter(Boolean).sort().reverse()[0]||'')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
							<button class="cbd-disb-btn cbd-icon-btn" title="View Disbursements" data-partner-name="${partner_name_esc}" data-partner-id="${partner_id_esc}" data-budget-ids="${budget_ids_str}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg></button>
						</div>
						<div class="cbd-chevron" id="cbd_chv_${idx}">&#9654;</div>
					</div>
				</div>
				<div class="cbd-partner__body" id="cbd_pb_${idx}">${this._build_table(partner.budgets||[], partner.partner_name||'')}</div>`;
			el.appendChild(card);
			card.querySelector(`#cbd_ph_${idx}`).addEventListener('click', (e) => {
				if (e.target.closest('.cbd-consolidated-btn')||e.target.closest('.cbd-disb-btn')) return;
				const body = document.getElementById(`cbd_pb_${idx}`); const chv = document.getElementById(`cbd_chv_${idx}`);
				const open = body.style.display === 'block';
				body.style.display = open ? 'none' : 'block'; chv.classList.toggle('cbd-chevron--open', !open);
			});
		});

		// FIX 1: re-bind view buttons after every render (innerHTML replacement detaches old listeners)
		this._bind_view_buttons();
	}

	_build_table(budgets, partner_name) {
		if (!budgets.length) return '<div class="cbd-empty">No budget rows.</div>';
		const rows = budgets.map(r => {
			const u_pct = parseFloat(r.utilised_pct)||0; const ud_pct = parseFloat(r.utilised_disbursement_pct)||0;
			return `<tr>
				<td><span class="cbd-chip cbd-chip--blue">${frappe.utils.escape_html(r.budget_reference_name||'—')}</span></td>
				<td><span class="cbd-chip cbd-chip--teal">${frappe.utils.escape_html(r.grant_id||'—')}</span></td>
				<td>${frappe.utils.escape_html(r.financial_year||'—')}</td>
				<td>${frappe.utils.escape_html(r.state||'—')}</td>
				<td>${this._date(r.grant_start)}</td><td>${this._date(r.grant_end)}</td>
				<td class="cbd-r">${r.no_of_creches||0}</td>
				<td class="cbd-r">${this._fmtTip(r.budget)}</td>
				<td class="cbd-r">${this._fmtTip(r.disbursement)}</td>
				<td class="cbd-r">${this._fmtTip(r.utilisation)}</td>
				<td class="cbd-r"><span class="cbd-chip cbd-chip--${this._chip_cls(u_pct)}">${u_pct.toFixed(1)}%</span></td>
				<td class="cbd-r"><span class="cbd-chip cbd-chip--${this._chip_cls(ud_pct)}">${ud_pct.toFixed(1)}%</span></td>
				<td class="cbd-r">${this._fmtTip(r.balance_budget_amount)}</td>
				<td class="cbd-r">${this._fmtTip(r.bank_balance)}</td>
				<td class="cbd-r">${this._fmtTip(r.interest_from_bank)}</td>
				<td class="cbd-actions-cell">
					<button class="cbd-view-btn cbd-icon-btn" title="View Line Items" data-budget-id="${frappe.utils.escape_html(r.budget_id)}" data-ref-name="${frappe.utils.escape_html(r.budget_reference_name||'')}" data-grant-start="${frappe.utils.escape_html(r.grant_start||'')}" data-grant-end="${frappe.utils.escape_html(r.grant_end||'')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
					<button class="cbd-row-disb-btn cbd-icon-btn" title="View Disbursements" data-budget-id="${frappe.utils.escape_html(r.budget_id)}" data-ref-name="${frappe.utils.escape_html(r.budget_reference_name||'')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg></button>
				</td>
			</tr>`;
		}).join('');
		return `<div class="cbd-tbl-wrap"><table class="cbd-table" role="table" aria-label="Budget rows for ${frappe.utils.escape_html(partner_name)}"><thead><tr><th>Reference</th><th>Grant ID</th><th>FY</th><th>State</th><th>Start</th><th>End</th><th class="cbd-r">Creches</th><th class="cbd-r">Budget</th><th class="cbd-r">Disbursed</th><th class="cbd-r">Utilised</th><th class="cbd-r">Util %</th><th class="cbd-r">Util vs Disb.</th><th class="cbd-r">Bal. Budget</th><th class="cbd-r">Bank Bal.</th><th class="cbd-r">Interest</th><th class="cbd-actions-col">Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
	}

	_open_disbursement_panel(title, budget_ids, partner_ids) {
		const overlay = document.getElementById('cbd_disb_overlay'); const panel = document.getElementById('cbd_disb_modal');
		overlay.classList.add('cbd-disb-overlay--active'); panel.classList.add('cbd-disb-modal--open');
		panel.innerHTML = `<div class="cbd-panel__header"><div><div class="cbd-panel__title"><span class="cbd-panel__disb-badge">Disbursement</span></div><div class="cbd-panel__sub">${frappe.utils.escape_html(title)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label" title="Expand / collapse all partners"><input type="checkbox" class="cbd-expand-chk" id="cbd_disb_expand_all">Expand all</label><button class="cbd-panel__close" id="cbd_close_disb" title="Close">&#10005;</button></div></div><div class="cbd-panel__body" id="cbd_disb_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_disb_total" style="display:none"><span>Grand Total Disbursed</span><span id="cbd_disb_total_val">—</span></div>`;
		document.getElementById('cbd_close_disb').addEventListener('click', () => this._close_disb_panel());
		document.getElementById('cbd_disb_expand_all').addEventListener('change', (e) => {
			const expand = e.target.checked; const body = document.getElementById('cbd_disb_body'); if (!body) return;
			body.querySelectorAll('.cbd-item-group__body').forEach(b=>b.classList.toggle('cbd-item-group__body--collapsed',!expand));
			body.querySelectorAll('.cbd-igh-chevron').forEach(chv=>{chv.style.transform=expand?'':'rotate(-90deg)';});
		});
		this._load_disbursement_panel_data(budget_ids, partner_ids);
	}

	_close_disb_panel() {
		const panel = document.getElementById('cbd_disb_modal'); const overlay = document.getElementById('cbd_disb_overlay');
		if (panel) panel.classList.remove('cbd-disb-modal--open');
		if (overlay) overlay.classList.remove('cbd-disb-overlay--active');
	}

	_load_disbursement_panel_data(budget_ids, partner_ids) {
		const pf = this._panel_filters();
		frappe.call({
			method: 'creche_reports.api.budget_utilisation_summary.get_disbursement_panel_data',
			args: { budget_ids: budget_ids?JSON.stringify(budget_ids):null, partner_ids:partner_ids?JSON.stringify(partner_ids):null, start_date:pf.start_date||null, end_date:pf.end_date||null, financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null, month:pf.month?JSON.stringify(pf.month):null },
			callback: (r) => {
				const records = r.message||[]; const body = document.getElementById('cbd_disb_body'); if (!body) return;
				const flt = v=>parseFloat(v)||0;
				if (!records.length) { body.innerHTML='<div class="cbd-panel-empty">No disbursement records found.</div>'; return; }
				const by_partner = {};
				records.forEach(doc=>{ const key=doc.partner_id||doc.partner_name||'Unknown'; if(!by_partner[key]) by_partner[key]={name:doc.partner_name||doc.partner_id||'Unknown',docs:[],total:0}; by_partner[key].docs.push(doc); by_partner[key].total+=flt(doc.total_disbursement); });
				const grand_total = Object.values(by_partner).reduce((s,p)=>s+p.total,0);
				body.innerHTML='';
				Object.values(by_partner).forEach((partner,pidx)=>{
					const p_id=`cbd_dp_${pidx}`; const grp=document.createElement('div'); grp.className='cbd-item-group';
					grp.innerHTML=`<div class="cbd-item-group__head cbd-item-group__head--toggle cbd-dt__p-head" id="cbd_ph_d${pidx}"><div class="cbd-igh-left"><span class="cbd-igh-chevron">&#9660;</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><span>${frappe.utils.escape_html(partner.name)}</span><span class="cbd-dt__partner-count">${partner.docs.length} budget${partner.docs.length!==1?'s':''}</span></div><span class="cbd-item-group__total">${this._fmtTip(partner.total,'Partner Total')}</span></div><div class="cbd-item-group__body" id="${p_id}"><div class="cbd-dt-wrap"><table class="cbd-dt" id="cbd_dt_${pidx}"><thead><tr class="cbd-dt__head-row"><th style="width:32px"></th><th>Reference</th><th>Grant ID</th><th>State</th><th>FY</th><th class="cbd-li-r">Budget</th><th class="cbd-li-r">Disbursed</th><th class="cbd-li-r">Balance</th><th class="cbd-li-r">%</th></tr></thead><tbody id="cbd_dtb_${pidx}"></tbody></table></div><div class="cbd-dt__subtotal-row"><span class="cbd-dt__subtotal-label">Partner Total</span><span style="font-weight:700;color:#0C447C">${this._fmtTip(partner.total,'Partner Total')}</span></div></div>`;
					body.appendChild(grp);
					grp.querySelector(`#cbd_ph_d${pidx}`).addEventListener('click',()=>{const pb=document.getElementById(p_id);const chv=grp.querySelector('.cbd-igh-chevron');const collapsed=pb.classList.toggle('cbd-item-group__body--collapsed');chv.style.transform=collapsed?'rotate(-90deg)':'';});
					const tbody=grp.querySelector(`#cbd_dtb_${pidx}`);
					partner.docs.forEach((doc,bidx)=>{
						const b_pct=flt(doc.total_budget)>0?Math.min((flt(doc.total_disbursement)/flt(doc.total_budget))*100,100):0;
						const pct_cls=b_pct>=80?'green':b_pct>=50?'amber':'red'; const d_id=`cbd_dtr_${pidx}_${bidx}`;
						const b_row=document.createElement('tr'); b_row.className='cbd-dt__b-row';
						b_row.innerHTML=`<td style="width:32px;text-align:center;border-right:1px solid var(--border-color,#d1d8dd)"><span class="cbd-dt__chevron" style="font-size:9px;color:var(--text-muted,#8d99a6)">&#9654;</span></td><td class="cbd-dt__ref-cell">${frappe.utils.escape_html(doc.budget_reference_name||doc.budget_reference_id||'—')}</td><td>${doc.grant_id?`<span class="cbd-dt__tag cbd-dt__tag--teal">${frappe.utils.escape_html(doc.grant_id)}</span>`:'—'}</td><td>${frappe.utils.escape_html(doc.state||'—')}</td><td>${frappe.utils.escape_html(doc.financial_year||'—')}</td><td class="cbd-li-r">${this._fmt(doc.total_budget)}</td><td class="cbd-li-r cbd-dt__disb-val">${this._fmt(doc.total_disbursement)}</td><td class="cbd-li-r">${this._fmt(doc.balence_budget)}</td><td class="cbd-li-r"><span class="cbd-dt__pct cbd-dt__pct--${pct_cls}">${b_pct.toFixed(1)}%</span></td>`;
						tbody.appendChild(b_row);
						const tracker=doc.tracker||[];
						const trk_inner=tracker.length?tracker.map((t,i)=>`<div class="cbd-dt__trk-item ${i===tracker.length-1?'cbd-dt__trk-item--last':''}"><span class="cbd-dt__trk-dot ${i===0?'cbd-dt__trk-dot--first':''}"></span><span class="cbd-dt__trk-date">${this._date(t.date_of_disbursement)}</span><span class="cbd-dt__trk-amt">${this._fmtTip(t.disbursed_amount,'Disbursed')}</span></div>`).join(''):`<div class="cbd-dt__trk-empty">No payment entries recorded.</div>`;
						const d_row=document.createElement('tr'); d_row.className='cbd-dt__detail-row cbd-dt__detail-row--collapsed'; d_row.id=d_id;
						d_row.innerHTML=`<td colspan="9" class="cbd-dt__detail-cell">${trk_inner}</td>`; tbody.appendChild(d_row);
						b_row.addEventListener('click',()=>{const open=!d_row.classList.contains('cbd-dt__detail-row--collapsed');d_row.classList.toggle('cbd-dt__detail-row--collapsed',open);b_row.querySelector('.cbd-dt__chevron').style.transform=open?'':'rotate(90deg)';});
					});
				});
				const tot=document.getElementById('cbd_disb_total');const tot_val=document.getElementById('cbd_disb_total_val');
				if(tot){tot.style.display='flex';tot_val.innerHTML=this._fmtTip(grand_total,'Grand Total');}
			}
		});
	}

	_open_overall_panels(panel='both') {
		if (!this._all_partners||!this._all_partners.length){frappe.msgprint('No data loaded yet.');return;}
		const all_budget_ids=this._all_partners.flatMap(p=>(p.budgets||[]).map(b=>b.budget_id)).filter(Boolean);
		const all_starts=this._all_partners.flatMap(p=>(p.budgets||[]).map(b=>b.grant_start)).filter(Boolean).sort();
		const all_ends=this._all_partners.flatMap(p=>(p.budgets||[]).map(b=>b.grant_end)).filter(Boolean).sort().reverse();
		if (!all_budget_ids.length){frappe.msgprint('No budgets found.');return;}
		this._open_consolidated_panels_typed(all_budget_ids,'Overall Summary',all_starts[0]||'',all_ends[0]||'',panel);
	}

	_open_consolidated_panels_typed(budget_ids,title,grant_start,grant_end,panel) {
		const overlay=document.getElementById('cbd_overlay');const left=document.getElementById('cbd_panel_left');const right=document.getElementById('cbd_panel_right');
		overlay.classList.add('cbd-overlay--active');document.body.classList.add('cbd-panels-open');
		const sidebar=document.querySelector('.layout-side-section,.desk-sidebar,#sidebar-menu');if(sidebar){sidebar.dataset.cbdPrevZ=sidebar.style.zIndex||'';sidebar.style.zIndex='1';}
		const badge=`<span class="cbd-panel__consolidated-badge">Overall</span>`;const sub=`${budget_ids.length} budget${budget_ids.length>1?'s':''} · All Partners`;
		const left_html=`<div class="cbd-panel__header"><div><div class="cbd-panel__title">${badge} Budget Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(sub)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels">&#10005;</button></div></div><div class="cbd-panel__body" id="cbd_left_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none"><span>Grand Total</span><span id="cbd_left_total_val">—</span></div>`;
		const right_html=`<div class="cbd-panel__header"><div><div class="cbd-panel__title">${badge} Utilisation Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(sub)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels2">&#10005;</button></div></div><div class="cbd-panel__filter" id="cbd_month_filter_wrap"><div class="cbd-filter-row"><div class="cbd-filter-col"><div class="cbd-filter-label">Financial Year</div><div id="cbd_fy_multiselect"></div></div><div class="cbd-filter-col"><div class="cbd-filter-label">Month</div><div id="cbd_month_multiselect"></div></div></div></div><div class="cbd-panel__body" id="cbd_right_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none"><span id="cbd_right_total_lbl">Total</span><span id="cbd_right_total_val">—</span></div>`;
		if(panel==='budget'){left.classList.add('cbd-panel--open','cbd-panel--full');right.classList.remove('cbd-panel--open');left.innerHTML=left_html;}
		else if(panel==='utilisation'){right.classList.add('cbd-panel--open','cbd-panel--full');left.classList.remove('cbd-panel--open');right.innerHTML=right_html;}
		else{left.classList.add('cbd-panel--open');right.classList.add('cbd-panel--open');left.innerHTML=left_html;right.innerHTML=right_html;const cc=document.getElementById('cbd_centre_close');if(cc)cc.classList.add('cbd-centre-close--visible');}
		const wire=(id,fn)=>{const b=document.getElementById(id);if(b)b.addEventListener('click',fn);};
		wire('cbd_close_panels',()=>this._close_left());wire('cbd_close_panels2',()=>this._close_right());
		if(panel==='budget'||panel==='both')this._load_consolidated_budget_items(budget_ids);
		if(panel==='utilisation'||panel==='both')this._load_consolidated_utilisation_items(budget_ids,grant_start,grant_end);
	}

	_open_panels(budget_id,ref_name,grant_start,grant_end) {
		const overlay=document.getElementById('cbd_overlay');const left=document.getElementById('cbd_panel_left');const right=document.getElementById('cbd_panel_right');
		overlay.classList.add('cbd-overlay--active');left.classList.add('cbd-panel--open');right.classList.add('cbd-panel--open');document.body.classList.add('cbd-panels-open');
		const cclose=document.getElementById('cbd_centre_close');if(cclose)cclose.classList.add('cbd-centre-close--visible');
		const sidebar=document.querySelector('.layout-side-section,.desk-sidebar,#sidebar-menu,.main-container>.col.layout-side-section');
		if(sidebar){sidebar.dataset.cbdPrevZ=sidebar.style.zIndex||'';sidebar.style.zIndex='1';}
		left.innerHTML=`<div class="cbd-panel__header"><div><div class="cbd-panel__title">Budget Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(ref_name)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels">&#10005;</button></div></div><div class="cbd-panel__body" id="cbd_left_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none"><span>Grand Total</span><span id="cbd_left_total_val">—</span></div>`;
		right.innerHTML=`<div class="cbd-panel__header"><div><div class="cbd-panel__title">Utilisation Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(ref_name)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels2">&#10005;</button></div></div><div class="cbd-panel__filter"><div class="cbd-filter-row"><div class="cbd-filter-col"><div class="cbd-filter-label">Financial Year</div><div id="cbd_fy_multiselect"></div></div><div class="cbd-filter-col"><div class="cbd-filter-label">Month</div><div id="cbd_month_multiselect"></div></div></div></div><div class="cbd-panel__body" id="cbd_right_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none"><span id="cbd_right_total_lbl">Total</span><span id="cbd_right_total_val">—</span></div>`;
		document.getElementById('cbd_close_panels').addEventListener('click',()=>this._close_left());
		document.getElementById('cbd_close_panels2').addEventListener('click',()=>this._close_right());
		this._load_budget_items(budget_id);this._load_utilisation_items(budget_id,grant_start,grant_end);
	}

	_close_all_panels(){this._close_panels();this._close_disb_panel();}
	_close_panels(){
		document.getElementById('cbd_overlay').classList.remove('cbd-overlay--active');
		document.getElementById('cbd_panel_left').classList.remove('cbd-panel--open','cbd-panel--full');
		document.getElementById('cbd_panel_right').classList.remove('cbd-panel--open','cbd-panel--full');
		document.body.classList.remove('cbd-panels-open');
		const sidebar=document.querySelector('.layout-side-section,.desk-sidebar,#sidebar-menu,.main-container>.col.layout-side-section');
		if(sidebar)sidebar.style.zIndex=sidebar.dataset.cbdPrevZ||'';
		const cc=document.getElementById('cbd_centre_close');if(cc)cc.classList.remove('cbd-centre-close--visible');
	}
	_close_left(){const left=document.getElementById('cbd_panel_left');left.classList.remove('cbd-panel--open','cbd-panel--full');const cc=document.getElementById('cbd_centre_close');if(cc)cc.classList.remove('cbd-centre-close--visible');const right=document.getElementById('cbd_panel_right');if(!right.classList.contains('cbd-panel--open'))this._close_panels();}
	_close_right(){const right=document.getElementById('cbd_panel_right');right.classList.remove('cbd-panel--open','cbd-panel--full');const cc=document.getElementById('cbd_centre_close');if(cc)cc.classList.remove('cbd-centre-close--visible');const left=document.getElementById('cbd_panel_left');if(!left.classList.contains('cbd-panel--open'))this._close_panels();}

	_load_budget_items(budget_id) {
		const _pf=this._panel_filters();frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_budget_line_items',args:{budget_id,start_date:_pf.start_date||null,end_date:_pf.end_date||null,financial_year:_pf.financial_year?JSON.stringify(_pf.financial_year):null,month:_pf.month?JSON.stringify(_pf.month):null},callback:(r)=>{
			const el=document.getElementById('cbd_left_body');if(!el)return;
			const items=r.message||[];if(!items.length){el.innerHTML='<div class="cbd-panel-empty">No budget line items found.</div>';return;}
			const groups={};items.forEach(item=>{const h=item.budget_main_head||'Other';if(!groups[h])groups[h]=[];groups[h].push(item);});
			el.innerHTML='';
			Object.entries(groups).forEach(([head,rows],gidx)=>{
				const group_total=rows.reduce((s,r)=>s+(parseFloat(r.total_amount)||0),0);const gid='lgrp_'+gidx;
				const grp=document.createElement('div');grp.className='cbd-item-group';
				grp.innerHTML=`<div class="cbd-item-group__head cbd-item-group__head--toggle"><div class="cbd-igh-left"><span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span><span>${frappe.utils.escape_html(head)}</span></div><span class="cbd-item-group__total">${this._fmtTip(group_total,'Category Total')}</span></div><div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}"><div class="cbd-li-scroll-wrap"><table class="cbd-li-table"><thead><tr><th class="cbd-li-sticky cbd-li-sticky--1">Expense Type</th><th class="cbd-li-sticky cbd-li-sticky--2">Sub Head</th><th class="cbd-li-r">Amount</th><th class="cbd-li-r">Y1</th><th class="cbd-li-r">Y2</th><th class="cbd-li-r">Y3</th></tr></thead><tbody>${rows.map(row=>`<tr><td class="cbd-li-sticky cbd-li-sticky--1"><div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses||'—')}</div>${row.notes?`<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>`:''}</td><td class="cbd-li-sticky cbd-li-sticky--2">${frappe.utils.escape_html(row.budget_sub_head||'—')}</td><td class="cbd-li-r cbd-li-amt">${this._fmtTip(row.total_amount,'Amount')}</td><td class="cbd-li-r">${row.year_1?this._fmt(row.year_1):'—'}</td><td class="cbd-li-r">${row.year_2?this._fmt(row.year_2):'—'}</td><td class="cbd-li-r">${row.year_3?this._fmt(row.year_3):'—'}</td></tr>`).join('')}</tbody></table></div></div>`;
				el.appendChild(grp);
				grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click',()=>{const body=document.getElementById(gid);const chv=grp.querySelector('.cbd-igh-chevron');const collapsed=body.classList.toggle('cbd-item-group__body--collapsed');chv.style.transform=collapsed?'rotate(-90deg)':'';});
			});
			const grand=items.reduce((s,r)=>s+(parseFloat(r.total_amount)||0),0);
			const tot=document.getElementById('cbd_left_total');const tot_val=document.getElementById('cbd_left_total_val');
			if(tot){tot.style.display='flex';tot_val.textContent=this._fmt(grand);}
		}});
	}

	_load_utilisation_items(budget_id,grant_start,grant_end) {
		const pf=this._panel_filters();
		frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_utilisation_line_items',args:{budget_id,start_date:pf.start_date,end_date:pf.end_date,financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,month:pf.month?JSON.stringify(pf.month):null},callback:(r)=>{
			const data=r.message||{};const records=data.records||[];
			const ALL_12=['January','February','March','April','May','June','July','August','September','October','November','December'];
			const fy_from_server=[...new Set(records.map(r=>r.financial_year).filter(Boolean))];
			const fy_options_derived=this._derive_fy_options(grant_start,grant_end);
			const fy_options=fy_options_derived.length?fy_options_derived:fy_from_server.map(v=>({value:v,description:''}));
			const has_main_filter = !!(pf.financial_year || pf.month || pf.start_date || pf.end_date);
			let active_fys, active_months;
			if (pf.financial_year) {
				active_fys = new Set(pf.financial_year);
				active_months = pf.month ? new Set(pf.month) : new Set(ALL_12);
			} else if (pf.month) {
				active_fys = new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
				active_months = new Set(pf.month);
			} else if (pf.start_date || pf.end_date) {
				const derived = this._fym_from_date_range(pf.start_date, pf.end_date);
				active_fys = derived.fys.size ? derived.fys : new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
				active_months = derived.months.size ? derived.months : new Set(ALL_12);
			} else {
				active_fys = new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
				active_months = new Set(ALL_12);
			}
			this._util_records=records;this._selected_months=active_months;this._selected_fys=active_fys;
			const fy_wrap=document.getElementById('cbd_fy_multiselect');const month_wrap=document.getElementById('cbd_month_multiselect');
			if(!fy_wrap||!month_wrap)return;
			this._fy_field=frappe.ui.form.make_control({df:{fieldtype:'MultiSelectList',fieldname:'fy_filter',label:'FY',get_data:()=>fy_options},parent:$(fy_wrap),render_input:true});
			this._fy_field.refresh();this._fy_field.set_value([...active_fys]);
			this._fy_field.df.onchange=()=>{const val=this._fy_field.get_value()||[];this._selected_fys=new Set(Array.isArray(val)?val:[val]);this._render_utilisation();};
			const month_opts_available=ALL_12.filter(m=>records.some(r=>r.month===m));
			const month_opts_display=month_opts_available.length?month_opts_available:ALL_12;
			this._month_field=frappe.ui.form.make_control({df:{fieldtype:'MultiSelectList',fieldname:'month_filter',label:'Month',get_data:()=>month_opts_display.map(m=>({value:m,description:''}))},parent:$(month_wrap),render_input:true});
			this._month_field.refresh();this._month_field.set_value([...active_months].filter(m=>month_opts_display.includes(m)));
			this._month_field.df.onchange=()=>{const val=this._month_field.get_value()||[];this._selected_months=new Set(Array.isArray(val)?val:[val]);this._render_utilisation();};
			if(!records.length){document.getElementById('cbd_right_body').innerHTML='<div class="cbd-panel-empty">No utilisation records found for the selected filters.</div>';return;}
			this._render_utilisation();
		}});
	}

	_derive_fy_options(start_str,end_str) {
		const to_fy=(ds)=>{if(!ds)return null;const d=new Date(ds);const yr=d.getFullYear();const mo=d.getMonth()+1;const fy=mo>=4?yr:yr-1;return `${fy}-${String(fy+1).slice(-2)}`;};
		const start_fy=to_fy(start_str);const end_fy=to_fy(end_str);
		if(!start_fy)return[];const options=[];let[sy]=start_fy.split('-').map(Number);const[ey]=(end_fy||start_fy).split('-').map(Number);
		while(sy<=ey){options.push({value:`${sy}-${String(sy+1).slice(-2)}`,description:''});sy++;}
		return options;
	}

	// Returns {fys: Set, months: Set} covering all calendar months between start_date and end_date.
	// Used to pre-select the panel FY/month filters when the main filter is date-range based.
	_fym_from_date_range(start_date_str, end_date_str) {
		const MONTH_NAMES = ['January','February','March','April','May','June',
		                     'July','August','September','October','November','December'];
		const to_fy = (yr, mo) => { const fy = mo >= 4 ? yr : yr - 1; return `${fy}-${String(fy+1).slice(-2)}`; };
		const fys = new Set(); const months = new Set();
		if (!start_date_str) return { fys, months };
		const sd = new Date(start_date_str);
		const ed = end_date_str ? new Date(end_date_str) : new Date();
		// clamp ed to end of its month
		let y = sd.getFullYear(), m = sd.getMonth(); // 0-indexed
		const ey = ed.getFullYear(), em = ed.getMonth();
		while (y < ey || (y === ey && m <= em)) {
			fys.add(to_fy(y, m + 1));   // m+1 = 1-indexed month
			months.add(MONTH_NAMES[m]);
			m++; if (m > 11) { m = 0; y++; }
		}
		return { fys, months };
	}

	_render_utilisation() {
		const el=document.getElementById('cbd_right_body');if(!el)return;
		const MONTH_ORDER=['January','February','March','April','May','June','July','August','September','October','November','December'];
		const sel_months=this._selected_months||new Set();const sel_fys=this._selected_fys||new Set();
		const records=(this._util_records||[]).filter(r=>(sel_months.size===0||sel_months.has(r.month))&&(sel_fys.size===0||sel_fys.has(r.financial_year)));
		if(!records.length){el.innerHTML='<div class="cbd-panel-empty">No data for selected period.</div>';const rt=document.getElementById('cbd_right_total');if(rt)rt.style.display='none';return;}
		const active_months=[...new Set(records.map(r=>r.month))].sort((a,b)=>MONTH_ORDER.indexOf(a)-MONTH_ORDER.indexOf(b));
		const is_multi=active_months.length>1;
		const combined={};
		records.forEach(rec=>{(rec.items||[]).forEach(item=>{const key=item.type_of_expenses_id||item.type_of_expenses||'unknown';if(!combined[key])combined[key]={type_of_expenses:item.type_of_expenses,budget_main_head:item.budget_main_head,budget_sub_head:item.budget_sub_head,notes:item.notes,total_amount:0,by_month:{}};const amt=parseFloat(item.total_amount)||0;combined[key].total_amount+=amt;combined[key].by_month[rec.month]=(combined[key].by_month[rec.month]||0)+amt;});});
		const groups={};Object.values(combined).forEach(item=>{const h=item.budget_main_head||'Other';if(!groups[h])groups[h]=[];groups[h].push(item);});
		el.innerHTML='';
		if(is_multi){const bar=document.createElement('div');bar.className='cbd-ytd-bar';bar.innerHTML=`<span class="cbd-ytd-badge">YTD</span><span class="cbd-ytd-label">Combined across <b>${active_months.length}</b> months: ${active_months.map(m=>`<span class="cbd-ytd-month">${m}</span>`).join('')}</span>`;el.appendChild(bar);}
		let grand=0;
		Object.entries(groups).forEach(([head,rows],gidx)=>{
			const group_total=rows.reduce((s,r)=>s+r.total_amount,0);grand+=group_total;const gid='rgrp_'+gidx;
			let fy_header_row='';let month_header_row='';
			if(is_multi){const fy_groups={};active_months.forEach(m=>{const rec=records.find(r=>r.month===m);const fy=rec?(rec.financial_year||'Unknown'):'Unknown';if(!fy_groups[fy])fy_groups[fy]=[];fy_groups[fy].push(m);});fy_header_row=`<tr class="cbd-li-fy-row"><th class="cbd-li-sticky cbd-li-sticky--1 cbd-li-fy-blank" rowspan="2">Expense Type</th><th class="cbd-li-sticky cbd-li-sticky--2 cbd-li-fy-blank" rowspan="2">Sub Head</th>${Object.entries(fy_groups).map(([fy,months])=>`<th colspan="${months.length}" class="cbd-li-fy-hdr">${frappe.utils.escape_html(fy)}</th>`).join('')}<th rowspan="2" class="cbd-li-r cbd-li-ytd-hdr">YTD Total</th></tr>`;month_header_row=`<tr class="cbd-li-month-row">${active_months.map(m=>`<th class="cbd-li-r cbd-li-month-col">${m.slice(0,3)}</th>`).join('')}</tr>`;}
			const month_tds=(row)=>is_multi?active_months.map(m=>`<td class="cbd-li-r cbd-li-month-col">${row.by_month[m]?this._fmt(row.by_month[m]):'—'}</td>`).join(''):'';
			const grp=document.createElement('div');grp.className='cbd-item-group';
			grp.innerHTML=`<div class="cbd-item-group__head cbd-item-group__head--toggle"><div class="cbd-igh-left"><span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span><span>${frappe.utils.escape_html(head)}</span></div><span class="cbd-item-group__total">${this._fmtTip(group_total,'Category Total')}</span></div><div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}"><div class="cbd-li-scroll-wrap"><table class="cbd-li-table"><thead>${is_multi?fy_header_row+month_header_row:`<tr><th class="cbd-li-sticky cbd-li-sticky--1">Expense Type</th><th class="cbd-li-sticky cbd-li-sticky--2">Sub Head</th><th class="cbd-li-r">Amount</th></tr>`}</thead><tbody>${rows.map(row=>`<tr><td class="cbd-li-sticky cbd-li-sticky--1"><div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses||'—')}</div>${row.notes?`<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>`:''}</td><td class="cbd-li-sticky cbd-li-sticky--2 cbd-li-sub">${frappe.utils.escape_html(row.budget_sub_head||'—')}</td>${month_tds(row)}<td class="cbd-li-r cbd-li-amt">${this._fmtTip(row.total_amount,'Amount')}</td></tr>`).join('')}</tbody></table></div></div>`;
			el.appendChild(grp);
			grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click',()=>{const body=document.getElementById(gid);const chv=grp.querySelector('.cbd-igh-chevron');const collapsed=body.classList.toggle('cbd-item-group__body--collapsed');chv.style.transform=collapsed?'rotate(-90deg)':'';});
		});
		const rt=document.getElementById('cbd_right_total');const rt_val=document.getElementById('cbd_right_total_val');const rt_lbl=document.getElementById('cbd_right_total_lbl');
		if(rt){rt.style.display='flex';rt_val.textContent=this._fmt(grand);if(rt_lbl)rt_lbl.textContent=is_multi?`YTD Total (${active_months.length} months)`:'Total';}
	}

	_open_consolidated_panels(budget_ids,partner_name,grant_start,grant_end) {
		const overlay=document.getElementById('cbd_overlay');const left=document.getElementById('cbd_panel_left');const right=document.getElementById('cbd_panel_right');
		overlay.classList.add('cbd-overlay--active');left.classList.add('cbd-panel--open');right.classList.add('cbd-panel--open');document.body.classList.add('cbd-panels-open');
		const cc=document.getElementById('cbd_centre_close');if(cc)cc.classList.add('cbd-centre-close--visible');
		const sidebar=document.querySelector('.layout-side-section,.desk-sidebar,#sidebar-menu,.main-container>.col.layout-side-section');
		if(sidebar){sidebar.dataset.cbdPrevZ=sidebar.style.zIndex||'';sidebar.style.zIndex='1';}
		const title_sub=`${budget_ids.length} budget${budget_ids.length>1?'s':''} · Consolidated`;
		left.innerHTML=`<div class="cbd-panel__header"><div><div class="cbd-panel__title"><span class="cbd-panel__consolidated-badge">Consolidated</span> Budget Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(partner_name)} &mdash; ${frappe.utils.escape_html(title_sub)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels">&#10005;</button></div></div><div class="cbd-panel__body" id="cbd_left_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none"><span>Grand Total</span><span id="cbd_left_total_val">—</span></div>`;
		right.innerHTML=`<div class="cbd-panel__header"><div><div class="cbd-panel__title"><span class="cbd-panel__consolidated-badge">Consolidated</span> Utilisation Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(partner_name)} &mdash; ${frappe.utils.escape_html(title_sub)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels2">&#10005;</button></div></div><div class="cbd-panel__filter"><div class="cbd-filter-row"><div class="cbd-filter-col"><div class="cbd-filter-label">Financial Year</div><div id="cbd_fy_multiselect"></div></div><div class="cbd-filter-col"><div class="cbd-filter-label">Month</div><div id="cbd_month_multiselect"></div></div></div></div><div class="cbd-panel__body" id="cbd_right_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none"><span id="cbd_right_total_lbl">Total</span><span id="cbd_right_total_val">—</span></div>`;
		document.getElementById('cbd_close_panels').addEventListener('click',()=>this._close_left());
		document.getElementById('cbd_close_panels2').addEventListener('click',()=>this._close_right());
		this._load_consolidated_budget_items(budget_ids);this._load_consolidated_utilisation_items(budget_ids,grant_start,grant_end);
	}

	_load_consolidated_budget_items(budget_ids) {
		const _cpf=this._panel_filters();const promises=budget_ids.map(bid=>frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_budget_line_items',args:{budget_id:bid,start_date:_cpf.start_date||null,end_date:_cpf.end_date||null,financial_year:_cpf.financial_year?JSON.stringify(_cpf.financial_year):null,month:_cpf.month?JSON.stringify(_cpf.month):null}}));
		Promise.all(promises).then(results=>{
			const el=document.getElementById('cbd_left_body');if(!el)return;
			const merged={};
			results.forEach(r=>{(r.message||[]).forEach(item=>{const key=item.type_of_expenses_id||item.type_of_expenses||'unknown';if(!merged[key])merged[key]={type_of_expenses:item.type_of_expenses,budget_main_head:item.budget_main_head,budget_sub_head:item.budget_sub_head,notes:item.notes,total_amount:0,year_1:0,year_2:0,year_3:0};merged[key].total_amount+=parseFloat(item.total_amount)||0;merged[key].year_1+=parseFloat(item.year_1)||0;merged[key].year_2+=parseFloat(item.year_2)||0;merged[key].year_3+=parseFloat(item.year_3)||0;});});
			const items=Object.values(merged);if(!items.length){el.innerHTML='<div class="cbd-panel-empty">No budget line items found.</div>';return;}
			const groups={};items.forEach(item=>{const h=item.budget_main_head||'Other';if(!groups[h])groups[h]=[];groups[h].push(item);});
			el.innerHTML='';
			Object.entries(groups).forEach(([head,rows],gidx)=>{
				const group_total=rows.reduce((s,r)=>s+r.total_amount,0);const gid='clgrp_'+gidx;
				const grp=document.createElement('div');grp.className='cbd-item-group';
				grp.innerHTML=`<div class="cbd-item-group__head cbd-item-group__head--toggle"><div class="cbd-igh-left"><span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span><span>${frappe.utils.escape_html(head)}</span></div><span class="cbd-item-group__total">${this._fmtTip(group_total,'Category Total')}</span></div><div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}"><table class="cbd-li-table"><thead><tr><th>Expense Type</th><th>Sub Head</th><th class="cbd-li-r">Total</th><th class="cbd-li-r">Y1</th><th class="cbd-li-r">Y2</th><th class="cbd-li-r">Y3</th></tr></thead><tbody>${rows.map(row=>`<tr><td><div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses||'—')}</div>${row.notes?`<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>`:''}</td><td class="cbd-li-sub">${frappe.utils.escape_html(row.budget_sub_head||'—')}</td><td class="cbd-li-r cbd-li-amt">${this._fmtTip(row.total_amount,'Amount')}</td><td class="cbd-li-r">${row.year_1?this._fmt(row.year_1):'—'}</td><td class="cbd-li-r">${row.year_2?this._fmt(row.year_2):'—'}</td><td class="cbd-li-r">${row.year_3?this._fmt(row.year_3):'—'}</td></tr>`).join('')}</tbody></table></div>`;
				el.appendChild(grp);
				grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click',()=>{const body=document.getElementById(gid);const chv=grp.querySelector('.cbd-igh-chevron');const collapsed=body.classList.toggle('cbd-item-group__body--collapsed');chv.style.transform=collapsed?'rotate(-90deg)':'';});
			});
			const grand=items.reduce((s,r)=>s+r.total_amount,0);
			const tot=document.getElementById('cbd_left_total');const tot_val=document.getElementById('cbd_left_total_val');
			if(tot){tot.style.display='flex';tot_val.textContent=this._fmt(grand);}
		});
	}

	_load_consolidated_utilisation_items(budget_ids,grant_start,grant_end) {
		const pf=this._panel_filters();
		const call_args=(bid)=>({budget_id:bid,start_date:pf.start_date,end_date:pf.end_date,financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,month:pf.month?JSON.stringify(pf.month):null});
		const promises=budget_ids.map(bid=>frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_utilisation_line_items',args:call_args(bid)}));
		Promise.all(promises).then(results=>{
			const all_records=[];results.forEach(r=>{((r.message||{}).records||[]).forEach(rec=>all_records.push(rec));});
			const ALL_12=['January','February','March','April','May','June','July','August','September','October','November','December'];
			const fy_from_server=[...new Set(all_records.map(r=>r.financial_year).filter(Boolean))];
			const fy_options_derived=this._derive_fy_options(grant_start,grant_end);
			const fy_options=fy_options_derived.length?fy_options_derived:fy_from_server.map(v=>({value:v,description:''}));
			const _has_main = !!(pf.financial_year || pf.month || pf.start_date || pf.end_date);
			let active_fys, active_months;
			if (pf.financial_year) {
				active_fys = new Set(pf.financial_year);
				active_months = pf.month ? new Set(pf.month) : new Set(ALL_12);
			} else if (pf.month) {
				active_fys = new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
				active_months = new Set(pf.month);
			} else if (pf.start_date || pf.end_date) {
				const derived = this._fym_from_date_range(pf.start_date, pf.end_date);
				active_fys = derived.fys.size ? derived.fys : new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
				active_months = derived.months.size ? derived.months : new Set(ALL_12);
			} else {
				active_fys = new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
				active_months = new Set(ALL_12);
			}
			this._util_records=all_records;this._selected_months=active_months;this._selected_fys=active_fys;
			const fy_wrap=document.getElementById('cbd_fy_multiselect');const month_wrap=document.getElementById('cbd_month_multiselect');if(!fy_wrap||!month_wrap)return;
			this._fy_field=frappe.ui.form.make_control({df:{fieldtype:'MultiSelectList',fieldname:'fy_filter',label:'FY',get_data:()=>fy_options},parent:$(fy_wrap),render_input:true});
			this._fy_field.refresh();this._fy_field.set_value([...active_fys]);
			this._fy_field.df.onchange=()=>{const val=this._fy_field.get_value()||[];this._selected_fys=new Set(Array.isArray(val)?val:[val]);this._render_utilisation();};
			const month_opts_available=ALL_12.filter(m=>all_records.some(r=>r.month===m));
			const month_opts_display=month_opts_available.length?month_opts_available:ALL_12;
			this._month_field=frappe.ui.form.make_control({df:{fieldtype:'MultiSelectList',fieldname:'month_filter',label:'Month',get_data:()=>month_opts_display.map(m=>({value:m,description:''}))},parent:$(month_wrap),render_input:true});
			this._month_field.refresh();this._month_field.set_value([...active_months].filter(m=>month_opts_display.includes(m)));
			this._month_field.df.onchange=()=>{const val=this._month_field.get_value()||[];this._selected_months=new Set(Array.isArray(val)?val:[val]);this._render_utilisation();};
			if(!all_records.length){document.getElementById('cbd_right_body').innerHTML='<div class="cbd-panel-empty">No utilisation records found for the selected filters.</div>';return;}
			this._render_utilisation();
		});
	}

	// ─────────────────────────────────────────────
	// HELPERS
	// ─────────────────────────────────────────────

	_fmt(n){
		if(n===null||n===undefined||n==='')return'—';
		const v=parseFloat(n)||0;
		if(Math.abs(v)>=10000000)return'₹'+(v/10000000).toFixed(2)+' Cr';
		if(Math.abs(v)>=100000)return'₹'+(v/100000).toFixed(2)+' L';
		return'₹'+Math.round(v).toLocaleString('en-IN');
	}

	_fmtFull(n){
		if(n===null||n===undefined||n==='')return'—';
		const v=parseFloat(n)||0;
		return '₹'+v.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
	}

	_fmtTip(n, label='Full amount'){
		if(n===null||n===undefined||n==='')return'<span>—</span>';
		const v=parseFloat(n)||0;
		const short=this._fmt(v);
		const full=this._fmtFull(v);
		const abbreviated = short.endsWith(' Cr') || short.endsWith(' L');
		if(!abbreviated) return `<span>${short}</span>`;
		return `<span class="cbd-tip-wrap" data-tip="${frappe.utils.escape_html(full)}" data-tip-label="${frappe.utils.escape_html(label)}">${short}</span>`;
	}
	_date(d){if(!d)return'—';return frappe.datetime.str_to_user(d)||d;}
	_metric(label,value,rawNum=null){
		const display = rawNum!==null ? this._fmtTip(rawNum, label) : value;
		return `<div class="cbd-metric"><span class="cbd-metric__label">${label}</span><span class="cbd-metric__value">${display}</span></div>`;
	}
	_metric_pct(label,pct){const v=parseFloat(pct)||0;const cls=v>=80?'green':v>=50?'amber':'red';return `<div class="cbd-metric cbd-metric--pct"><span class="cbd-metric__label">${label}</span><span class="cbd-metric__value cbd-metric__pct cbd-metric__pct--${cls}">${v.toFixed(1)}%</span></div>`;}
	_util_vs_disb_pct(partner){const d=parseFloat(partner.total_disbursement)||0;const u=parseFloat(partner.total_utilisation)||0;return d>0?((u/d)*100):0;}
	_icon_partner(){return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0"><rect x="3" y="7" width="18" height="14" rx="1"/><path d="M8 21V11h8v10"/><path d="M3 7l9-4 9 4"/></svg>`;}
	_fill_cls(v){return v>=80?'green':v>=50?'amber':'red';}
	_chip_cls(v){return v>=80?'green':v>=50?'amber':'red';}
	_badge_cls(v){return v>=80?'green':v>=50?'amber':'red';}

	// ─────────────────────────────────────────────
	// EVENT DELEGATION  (FIX 1: called after every render_partners)
	// ─────────────────────────────────────────────

	_bind_view_buttons(){
		// Remove previous listener to avoid stacking
		const el = document.getElementById('cbd_partners');
		if (!el) return;
		if (el._cbdViewListener) {
			el.removeEventListener('click', el._cbdViewListener);
		}
		const handler = (e) => {
			const btn=e.target.closest('.cbd-view-btn');if(btn){e.stopPropagation();this._open_panels(btn.dataset.budgetId,btn.dataset.refName,btn.dataset.grantStart||'',btn.dataset.grantEnd||'');return;}
			const rbtn=e.target.closest('.cbd-row-disb-btn');if(rbtn){e.stopPropagation();this._open_disbursement_panel(`${rbtn.dataset.refName||rbtn.dataset.budgetId} — Disbursements`,[rbtn.dataset.budgetId],null);return;}
			const cbtn=e.target.closest('.cbd-consolidated-btn');if(cbtn){e.stopPropagation();this._open_consolidated_panels((cbtn.dataset.budgetIds||'').split(',').filter(Boolean),cbtn.dataset.partnerName||'Partner',cbtn.dataset.grantStart||'',cbtn.dataset.grantEnd||'');return;}
			const dbtn=e.target.closest('.cbd-disb-btn');if(dbtn){e.stopPropagation();this._open_disbursement_panel(`${dbtn.dataset.partnerName||'Partner'} — Disbursements`,(dbtn.dataset.budgetIds||'').split(',').filter(Boolean),null);return;}
		};
		el._cbdViewListener = handler;
		el.addEventListener('click', handler);
	}

	// ─────────────────────────────────────────────
	// PANELS SCAFFOLD
	// ─────────────────────────────────────────────

	_ensure_panels(){
		if(document.getElementById('cbd_overlay'))return;
		const overlay=document.createElement('div');overlay.className='cbd-overlay';overlay.id='cbd_overlay';
		const left=document.createElement('div');left.className='cbd-panel-left';left.id='cbd_panel_left';
		const right=document.createElement('div');right.className='cbd-panel-right';right.id='cbd_panel_right';
		const disb_modal=document.createElement('div');disb_modal.id='cbd_disb_modal';disb_modal.className='cbd-disb-modal';
		const disb_overlay=document.createElement('div');disb_overlay.id='cbd_disb_overlay';disb_overlay.className='cbd-disb-overlay';
		const centre=document.createElement('button');centre.id='cbd_centre_close';centre.className='cbd-centre-close';centre.title='Close both panels';centre.innerHTML=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span>Close both</span>`;
		document.body.appendChild(overlay);document.body.appendChild(left);document.body.appendChild(right);document.body.appendChild(disb_overlay);document.body.appendChild(disb_modal);document.body.appendChild(centre);
		disb_overlay.addEventListener('click',()=>this._close_disb_panel());
		overlay.addEventListener('click',()=>this._close_all_panels());
		centre.addEventListener('click',()=>this._close_panels());
		[left,right].forEach(panel=>{panel.addEventListener('change',e=>{const chk=e.target.closest('.cbd-expand-all');if(!chk)return;const expand=chk.checked;const body=panel.querySelector('.cbd-panel__body');if(!body)return;body.querySelectorAll('.cbd-item-group__body').forEach(b=>b.classList.toggle('cbd-item-group__body--collapsed',!expand));body.querySelectorAll('.cbd-igh-chevron').forEach(chv=>{chv.style.transform=expand?'':'rotate(-90deg)';});});});
	}

	_inject_styles() {
		if (document.getElementById('cbd-styles')) return;
		const style = document.createElement('style');
		style.id = 'cbd-styles';
		style.textContent = `
		/* ═══════════════════════════════════════════════════════════
		   ROOT & FILTER
		   ═══════════════════════════════════════════════════════════ */
		.cbd-root { padding: 12px 16px 40px; }
		.custom-filter-row { padding:0; margin:0; display:flex; flex-wrap:wrap; }
		.cbd-filter-col { flex:1 1 20%; min-width:160px; padding:8px 8px 0; box-sizing:border-box; }

		/* ═══════════════════════════════════════════════════════════
		   OVERVIEW STRIP
		   ═══════════════════════════════════════════════════════════ */
		.cbd-overview-strip { display:flex; align-items:stretch; flex-wrap:nowrap; background:var(--card-bg,#fff); border:1px solid var(--border-color,#d1d8dd); border-radius:10px; margin-bottom:12px; overflow:hidden; }
		.cbd-ostat { display:flex; align-items:center; gap:8px; flex:1; padding:10px 12px; min-width:0; border-right:1px solid var(--border-color,#d1d8dd); position:relative; }
		.cbd-ostat--clickable { cursor:pointer; transition:background .12s; }
		.cbd-ostat--clickable:hover { background:var(--control-bg,#f0f4f8); }
		.cbd-ostat--clickable:hover .cbd-ostat__arrow { opacity:1; }
		.cbd-ostat__arrow { position:absolute; right:8px; top:50%; transform:translateY(-50%); color:#378ADD; opacity:0; transition:opacity .15s; flex-shrink:0; }
		/* ── Drill centered modal ── */
		.cbd-drill-modal-wrap {
			position:fixed; inset:0; z-index:3200;
			background:rgba(0,0,0,0);
			display:flex; align-items:center; justify-content:center;
			padding:16px; box-sizing:border-box;
			transition:background .2s ease;
			pointer-events:none;
		}
		.cbd-drill-modal-wrap--open {
			background:rgba(0,0,0,.45);
			pointer-events:all;
		}
		.cbd-drill-modal {
			background:var(--card-bg,#fff);
			border-radius:12px;
			border:1px solid var(--border-color,#d1d8dd);
			box-shadow:0 8px 40px rgba(0,0,0,.18);
			display:flex; flex-direction:column;
			max-height:80vh; width:100%;
			opacity:0; transform:scale(.96) translateY(8px);
			transition:opacity .22s ease, transform .22s cubic-bezier(.34,1.56,.64,1);
			overflow:hidden;
		}
		.cbd-drill-modal-wrap--open .cbd-drill-modal {
			opacity:1; transform:scale(1) translateY(0);
		}
		.cbd-drill-modal--wide   { max-width:640px; }
		.cbd-drill-modal--narrow { max-width:400px; }
		@media (max-width:600px) {
			.cbd-drill-modal-wrap { align-items:flex-end; padding:0; }
			.cbd-drill-modal { border-radius:16px 16px 0 0; max-width:100vw; max-height:85vh; transform:translateY(20px); }
			.cbd-drill-modal-wrap--open .cbd-drill-modal { transform:translateY(0); }
		}
		.cbd-drill-modal__header {
			display:flex; align-items:center; justify-content:space-between;
			padding:16px 18px 14px; border-bottom:1px solid var(--border-color,#d1d8dd);
			flex-shrink:0;
		}
		.cbd-drill-modal__header-left { display:flex; align-items:center; gap:12px; min-width:0; }
		.cbd-drill-modal__icon {
			width:38px; height:38px; flex-shrink:0;
			display:flex; align-items:center; justify-content:center;
			border-radius:10px; background:#EEF5FC; color:#378ADD;
		}
		.cbd-drill-modal__title { font-size:15px; font-weight:700; color:var(--text-color,#1c2126); }
		.cbd-drill-modal__sub   { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:2px; }
		.cbd-drill-modal__close {
			width:30px; height:30px; flex-shrink:0;
			display:flex; align-items:center; justify-content:center;
			border:1px solid var(--border-color,#d1d8dd); border-radius:7px;
			background:none; cursor:pointer; color:var(--text-muted,#8d99a6);
			transition:background .12s, color .12s, border-color .12s;
		}
		.cbd-drill-modal__close:hover { background:#FCEBEB; color:#A32D2D; border-color:#F09595; }
		.cbd-drill-modal__body {
			flex:1; overflow-y:auto; padding:0;
		}
		.cbd-drill-modal__body::-webkit-scrollbar { width:4px; }
		.cbd-drill-modal__body::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }
		.cbd-drill-modal__footer {
			display:flex; justify-content:flex-end; align-items:center;
			padding:10px 18px; border-top:1px solid var(--border-color,#d1d8dd);
			flex-shrink:0; background:var(--control-bg,#f9f9f9);
		}

		/* ── Partner cards layout ── */
		.cbd-drill-cards { display:flex; flex-direction:column; gap:0; }
		.cbd-drill-card { padding:14px 16px; border-bottom:1px solid var(--border-color,#d1d8dd); transition:background .1s; }
		.cbd-drill-card:hover { background:var(--control-bg,#f7f9fc); }
		.cbd-drill-card__top { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
		.cbd-drill-card__avatar { width:34px; height:34px; flex-shrink:0; border-radius:50%; background:#E6F1FB; color:#0C447C; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; }
		.cbd-drill-card__info { flex:1; min-width:0; }
		.cbd-drill-card__name { font-size:13px; font-weight:600; color:var(--text-color,#1c2126); }
		.cbd-drill-card__meta { font-size:11px; color:var(--text-muted,#8d99a6); display:flex; align-items:center; gap:5px; margin-top:1px; }
		.cbd-drill-card__sep { color:var(--border-color,#d1d8dd); }
		.cbd-drill-card__bar-track { height:4px; background:var(--border-color,#d1d8dd); border-radius:2px; overflow:hidden; }
		.cbd-drill-card__amounts { display:flex; gap:0; border:1px solid var(--border-color,#d1d8dd); border-radius:6px; overflow:hidden; margin-bottom:7px; }
		.cbd-drill-card__amt-item { flex:1; padding:5px 8px; border-right:1px solid var(--border-color,#d1d8dd); text-align:center; }
		.cbd-drill-card__amt-item:last-child { border-right:none; }
		.cbd-drill-card__amt-label { display:block; font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:.4px; color:var(--text-muted,#8d99a6); margin-bottom:2px; }
		.cbd-drill-card__amt-val { display:block; font-size:12px; font-weight:600; color:var(--text-color,#1c2126); }
		.cbd-drill-card__bar-fill { height:100%; border-radius:2px; transition:width .4s ease; }
		.cbd-drill-card__bar-fill--green { background:#639922; }
		.cbd-drill-card__bar-fill--amber { background:#BA7517; }
		.cbd-drill-card__bar-fill--red   { background:#E24B4A; }

		/* ── Budget list layout ── */
		.cbd-drill-blist { display:flex; flex-direction:column; }
		.cbd-drill-brow { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid var(--border-color,#d1d8dd); gap:10px; transition:background .1s; }
		.cbd-drill-brow:hover { background:var(--control-bg,#f7f9fc); }
		.cbd-drill-brow__left { display:flex; align-items:flex-start; gap:10px; min-width:0; flex:1; }
		.cbd-drill-brow__seq { width:22px; height:22px; flex-shrink:0; border-radius:50%; background:var(--control-bg,#f0f4f8); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:var(--text-muted,#8d99a6); margin-top:2px; }
		.cbd-drill-brow__detail { flex:1; min-width:0; }
		.cbd-drill-brow__ref { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:4px; }
		.cbd-drill-brow__creche-badge { display:inline-flex; align-items:center; padding:1px 7px; background:#E6F1FB; color:#0C447C; border-radius:10px; font-size:10px; font-weight:600; }
		.cbd-drill-brow__meta { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--text-muted,#8d99a6); flex-wrap:wrap; }
		.cbd-drill-brow__meta svg { color:var(--text-muted,#8d99a6); flex-shrink:0; }
		.cbd-drill-brow__sep { color:var(--border-color,#d1d8dd); margin:0 2px; }
		.cbd-drill-brow__fy { flex-shrink:0; font-size:11px; font-weight:600; color:var(--text-muted,#8d99a6); background:var(--control-bg,#f0f4f8); padding:2px 8px; border-radius:10px; white-space:nowrap; }

		/* ── Location list layout ── */
		.cbd-drill-list { padding:4px 0; }
		.cbd-drill-list__row { display:flex; align-items:center; gap:12px; padding:10px 16px; border-bottom:1px solid var(--border-color,#d1d8dd); transition:background .1s; }
		.cbd-drill-list__row:last-child { border-bottom:none; }
		.cbd-drill-list__row:hover { background:var(--control-bg,#f7f9fc); }
		.cbd-drill-list__num { width:24px; height:24px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:#E6F1FB; font-size:10px; font-weight:700; color:#0C447C; flex-shrink:0; }
		.cbd-drill-list__dot { width:6px; height:6px; border-radius:50%; background:#378ADD; flex-shrink:0; }
		.cbd-drill-list__body { flex:1; min-width:0; }
		.cbd-drill-list__text { font-size:13px; font-weight:500; color:var(--text-color,#1c2126); }
		.cbd-drill-list__detail { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:2px; }

		.cbd-drill-empty { padding:40px 20px; text-align:center; font-size:13px; color:var(--text-muted,#8d99a6); }
		.cbd-ostat:last-child { border-right:none; }
		.cbd-ostat__icon { width:32px; height:32px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border-radius:8px; background:var(--control-bg,#f0f4f8); color:#378ADD; }
		.cbd-ostat__body { min-width:0; }
		.cbd-ostat__value { font-size:16px; font-weight:700; color:var(--text-color,#1c2126); line-height:1.1; }
		.cbd-ostat__label { font-size:9px; font-weight:500; text-transform:uppercase; letter-spacing:.6px; color:var(--text-muted,#8d99a6); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

		/* ═══════════════════════════════════════════════════════════
		   SUMMARY CARDS
		   ═══════════════════════════════════════════════════════════ */
		.cbd-summary-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:14px; }
		.cbd-scard { background:var(--card-bg,#fff); border:1px solid var(--border-color,#d1d8dd); border-radius:10px; padding:14px 16px; border-left:4px solid transparent; transition:box-shadow .15s; cursor:pointer; }
		.cbd-scard:hover { box-shadow:0 4px 16px rgba(55,138,221,.15); border-color:#B5D4F4; }
		.cbd-scard--blue   { border-left-color:#378ADD; }
		.cbd-scard--green  { border-left-color:#639922; }
		.cbd-scard--purple { border-left-color:#7F77DD; }
		.cbd-scard--amber  { border-left-color:#BA7517; }
		.cbd-scard__top { display:flex; justify-content:space-between; align-items:flex-start; }
		.cbd-scard__label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text-muted,#8d99a6); }
		.cbd-scard__svg { display:flex; align-items:center; flex-shrink:0; }
		.cbd-scard__value { font-size:22px; font-weight:600; color:var(--text-color,#1c2126); margin-top:8px; line-height:1; }
		.cbd-scard__sub { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:4px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
		.cbd-scard__drill { font-size:10px; font-weight:600; color:#378ADD; opacity:0; transition:opacity .15s; }
		.cbd-scard:hover .cbd-scard__drill { opacity:1; }

		/* ═══════════════════════════════════════════════════════════
		   PROGRESS
		   ═══════════════════════════════════════════════════════════ */
		.cbd-prog { height:4px; background:var(--border-color,#d1d8dd); border-radius:2px; margin-top:10px; overflow:hidden; }
		.cbd-prog__fill { height:100%; border-radius:2px; transition:width .5s ease; }
		.cbd-prog__fill--green { background:#639922; }
		.cbd-prog__fill--amber { background:#BA7517; }
		.cbd-prog__fill--red   { background:#E24B4A; }
		.cbd-prog__fill--blue  { background:#378ADD; }

		/* ═══════════════════════════════════════════════════════════
		   SECTION LABEL
		   ═══════════════════════════════════════════════════════════ */
		.cbd-section-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.9px; color:var(--text-muted,#8d99a6); margin-bottom:10px; margin-top:0; }

		/* ═══════════════════════════════════════════════════════════
		   PARTNER LIST
		   ═══════════════════════════════════════════════════════════ */
		#cbd_partners { max-height:calc(100vh - 300px); overflow-y:auto; padding-right:4px; }
		#cbd_partners::-webkit-scrollbar { width:4px; }
		#cbd_partners::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }
		.cbd-partner { background:var(--card-bg,#fff); border:1px solid var(--border-color,#d1d8dd); border-radius:10px; margin-bottom:10px; overflow:hidden; }
		.cbd-partner__head { display:flex; align-items:stretch; justify-content:space-between; padding:10px 14px; cursor:pointer; gap:12px; border-left:3px solid #378ADD; }
		.cbd-partner__head:hover { background:var(--control-bg,#f7f7f7); }
		.cbd-partner__left { flex:1; min-width:0; }
		.cbd-partner__name { font-size:14px; font-weight:600; color:var(--text-color,#1c2126); display:flex; align-items:center; gap:7px; }
		.cbd-partner__grants { font-size:12px; font-weight:500; color:var(--text-muted,#8d99a6); margin-top:4px; padding-left:22px; }
		.cbd-partner__metrics { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
		.cbd-metric { display:flex; flex-direction:column; background:var(--control-bg,#f7f7f7); border:1px solid var(--border-color,#d1d8dd); border-radius:6px; padding:3px 8px; min-width:68px; }
		.cbd-metric__label { font-size:12px; font-weight:600; color:var(--text-muted,#8d99a6); }
		.cbd-metric__value { font-size:12px; font-weight:600; color:var(--text-color,#1c2126); margin-top:1px; }
		.cbd-metric--pct { border-style:dashed; }
		.cbd-metric__pct { font-size:13px; font-weight:700; }
		.cbd-metric__pct--green { color:#3B6D11; }
		.cbd-metric__pct--amber { color:#854F0B; }
		.cbd-metric__pct--red   { color:#A32D2D; }
		.cbd-partner__footer { display:flex; align-items:stretch; margin-top:7px; border:1px solid var(--border-color,#d1d8dd); border-radius:8px; overflow:hidden; }
		.cbd-footer-block { flex:1; padding:5px 10px; display:flex; flex-direction:column; gap:5px; }
		.cbd-footer-block + .cbd-footer-block { border-left:1px solid var(--border-color,#d1d8dd); }
		.cbd-footer-block__label { display:flex; align-items:center; gap:5px; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text-muted,#8d99a6); }
		.cbd-footer-block__tags { display:flex; flex-wrap:wrap; gap:4px; }
		.cbd-stag { display:inline-flex; align-items:center; gap:5px; border-radius:4px; padding:3px 8px; font-size:11px; font-weight:600; }
		.cbd-stag--blue   { background:#E6F1FB; color:#0C447C; }
		.cbd-stag--purple { background:#EEEDFE; color:#3C3489; }
		.cbd-stag--gray   { background:var(--control-bg,#f7f7f7); color:var(--text-muted,#8d99a6); }
		.cbd-stag__dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
		.cbd-stag__dot--blue   { background:#378ADD; }
		.cbd-stag__dot--purple { background:#7F77DD; }
		.cbd-partner__right { display:flex; flex-direction:column; align-items:flex-end; justify-content:space-between; gap:8px; flex-shrink:0; padding:2px 0; }
		.cbd-badge { display:inline-flex; align-items:center; border-radius:6px; padding:4px 10px; font-size:12px; font-weight:600; white-space:nowrap; }
		.cbd-badge--green { background:#EAF3DE; color:#3B6D11; }
		.cbd-badge--amber { background:#FAEEDA; color:#854F0B; }
		.cbd-badge--red   { background:#FCEBEB; color:#A32D2D; }
		.cbd-chevron { font-size:10px; color:var(--text-muted,#8d99a6); transition:transform .2s ease; line-height:1; }
		.cbd-chevron--open { transform:rotate(90deg); }
		.cbd-partner__btn-group { display:flex; flex-direction:row; align-items:center; gap:4px; }
		.cbd-icon-btn { display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; padding:0 !important; border-radius:6px; cursor:pointer; transition:background .15s, box-shadow .15s; flex-shrink:0; border-width:1px; border-style:solid; }
		.cbd-consolidated-btn { color:#3C3489; background:#EEEDFE; border-color:#AFA9EC; }
		.cbd-consolidated-btn:hover { background:#CECBF6; box-shadow:0 2px 6px rgba(83,74,183,.25); }
		.cbd-disb-btn { color:#0F6E56; background:#E1F5EE; border-color:#7ECFB8; }
		.cbd-disb-btn:hover { background:#B8EAD8; box-shadow:0 2px 6px rgba(15,110,86,.2); }

		/* ═══════════════════════════════════════════════════════════
		   PARTNER DETAIL TABLE
		   ═══════════════════════════════════════════════════════════ */
		.cbd-partner__body { display:none; border-top:1px solid var(--border-color,#d1d8dd); }
		.cbd-tbl-wrap { overflow-x:auto; }
		.cbd-table { width:100%; border-collapse:collapse; font-size:12px; white-space:nowrap; border:1px solid var(--border-color,#d1d8dd); }
		.cbd-table thead { position:sticky; top:0; z-index:1; }
		.cbd-table th { padding:9px 12px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-muted,#8d99a6); background:var(--control-bg,#f7f7f7); border:1px solid var(--border-color,#d1d8dd); }
		.cbd-table td { padding:8px 12px; color:var(--text-color,#1c2126); border:1px solid var(--border-color,#d1d8dd); vertical-align:middle; }
		.cbd-table tbody tr:hover td { background:var(--control-bg,#f7f7f7); }
		.cbd-r { text-align:right !important; }
		.cbd-chip { display:inline-flex; align-items:center; border-radius:4px; padding:2px 7px; font-size:11px; font-weight:600; }
		.cbd-chip--blue   { background:#E6F1FB; color:#185FA5; }
		.cbd-chip--teal   { background:#E1F5EE; color:#0F6E56; }
		.cbd-chip--green  { background:#EAF3DE; color:#3B6D11; }
		.cbd-chip--amber  { background:#FAEEDA; color:#854F0B; }
		.cbd-chip--red    { background:#FCEBEB; color:#A32D2D; }
		.cbd-chip--gray   { background:var(--control-bg,#f7f7f7); color:var(--text-muted,#8d99a6); }
		.cbd-view-btn { display:inline-flex; align-items:center; justify-content:center; gap:5px; padding:4px 10px; font-size:11px; font-weight:600; color:#185FA5; background:#E6F1FB; border:none; border-radius:5px; cursor:pointer; white-space:nowrap; transition:background .15s; }
		.cbd-view-btn:hover { background:#B5D4F4; }
		.cbd-view-btn.cbd-icon-btn, .cbd-row-disb-btn.cbd-icon-btn { width:28px; height:28px; padding:0; gap:0; }
		.cbd-row-disb-btn { display:inline-flex; align-items:center; justify-content:center; gap:5px; padding:4px 10px; font-size:11px; font-weight:600; color:#0F6E56; background:#E1F5EE; border:1px solid #7ECFB8; border-radius:5px; cursor:pointer; white-space:nowrap; transition:background .15s; }
		.cbd-row-disb-btn:hover { background:#B8EAD8; }
		.cbd-actions-cell { display:flex; flex-direction:row; align-items:center; gap:4px; padding:6px 10px; vertical-align:middle; }
		td.cbd-actions-cell { border:1px solid var(--border-color,#d1d8dd); }
		.cbd-actions-col { white-space:nowrap; min-width:70px; text-align:center; }

		/* ═══════════════════════════════════════════════════════════
		   LINE ITEM TABLES
		   ═══════════════════════════════════════════════════════════ */
		.cbd-li-scroll-wrap { overflow-x:auto; }
		.cbd-li-sticky { position:sticky; z-index:2; background:var(--card-bg,#fff); }
		thead .cbd-li-sticky { background:var(--control-bg,#f7f7f7); z-index:3; }
		.cbd-li-sticky--1 { left:0; min-width:140px; max-width:200px; }
		.cbd-li-sticky--2 { left:140px; min-width:90px; max-width:130px; border-right:2px solid var(--border-color,#d1d8dd) !important; }
		.cbd-li-fy-row th { background:#EEF4FC; }
		.cbd-li-fy-hdr { text-align:center !important; background:#D6E8F9; color:#0C447C; font-size:10px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; border-bottom:1px solid #B5D4F4 !important; padding:5px 10px; }
		.cbd-li-fy-blank { background:var(--control-bg,#f7f7f7) !important; }
		.cbd-li-ytd-hdr { background:#D6E8F9; color:#0C447C; font-size:10px; font-weight:800; }
		.cbd-li-month-row th { background:var(--control-bg,#f7f7f7); }
		.cbd-li-table { width:100%; border-collapse:collapse; font-size:12px; border:1px solid var(--border-color,#d1d8dd); }
		.cbd-li-table th { padding:6px 10px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; color:var(--text-muted,#8d99a6); background:var(--control-bg,#f7f7f7); border:1px solid var(--border-color,#d1d8dd); white-space:nowrap; }
		.cbd-li-table td { padding:6px 10px; color:var(--text-color,#1c2126); border:1px solid var(--border-color,#d1d8dd); vertical-align:middle; }
		.cbd-li-table tbody tr:hover td { background:var(--control-bg,#f7f7f7); }
		.cbd-li-r { text-align:right !important; }
		.cbd-li-amt { font-weight:700; }
		.cbd-li-name { font-size:12px; font-weight:500; }
		.cbd-li-note { font-size:10px; color:var(--text-muted,#8d99a6); font-style:italic; margin-top:2px; }
		.cbd-li-sub  { color:var(--text-muted,#8d99a6); font-size:11px; }
		.cbd-li-month-col { color:var(--text-muted,#8d99a6); font-size:11px; white-space:nowrap; }

		/* ═══════════════════════════════════════════════════════════
		   OVERLAY & SIDE PANELS
		   ═══════════════════════════════════════════════════════════ */
		.cbd-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:2000; }
		.cbd-overlay--active { display:block; }
		.cbd-panel-left, .cbd-panel-right { position:fixed; top:0; bottom:0; width:49vw; max-width:720px; min-width:340px; background:var(--card-bg,#fff); z-index:2001; display:flex; flex-direction:column; transition:transform .28s cubic-bezier(.4,0,.2,1); overflow:hidden; }
		.cbd-panel-left  { left:0;  transform:translateX(-100%); border-right:1px solid var(--border-color,#d1d8dd); }
		.cbd-panel-right { right:0; transform:translateX(100%);  border-left:1px solid var(--border-color,#d1d8dd); }
		.cbd-panel-left.cbd-panel--open  { transform:translateX(0); }
		.cbd-panel-right.cbd-panel--open { transform:translateX(0); }
		.cbd-panel-left.cbd-panel--full, .cbd-panel-right.cbd-panel--full { width:60vw; max-width:860px; }
		.cbd-panel__header { display:flex; align-items:center; padding:0 14px; height:50px; border-bottom:1px solid var(--border-color,#d1d8dd); flex-shrink:0; gap:8px; }
		.cbd-panel__header > div:first-child { flex:1; min-width:0; }
		.cbd-panel__title { font-size:13px; font-weight:700; color:var(--text-color,#1c2126); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
		.cbd-panel__sub   { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
		.cbd-panel__close { display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; background:none; border:1px solid var(--border-color,#d1d8dd); border-radius:5px; font-size:13px; cursor:pointer; color:var(--text-muted,#8d99a6); line-height:1; flex-shrink:0; transition:background .12s, color .12s, border-color .12s; }
		.cbd-panel__close:hover { background:#FCEBEB; color:#A32D2D; border-color:#F09595; }
		.cbd-panel__header-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
		.cbd-expand-all-label { display:inline-flex; align-items:center; gap:5px; height:26px; padding:0 9px; font-size:11px; font-weight:500; color:var(--text-muted,#8d99a6); cursor:pointer; user-select:none; white-space:nowrap; border:1px solid var(--border-color,#d1d8dd); border-radius:5px; background:var(--control-bg,#f7f7f7); transition:background .12s, color .12s, border-color .12s; line-height:1; margin-top:9px; }
		.cbd-expand-all-label:hover { background:#E6F1FB; border-color:#B5D4F4; color:#185FA5; }
		.cbd-expand-chk { width:13px; height:13px; cursor:pointer; accent-color:#378ADD; margin:0; flex-shrink:0; vertical-align:middle; }
		.cbd-panel__filter { padding:10px 18px; border-bottom:1px solid var(--border-color,#d1d8dd); flex-shrink:0; }
		.cbd-filter-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text-muted,#8d99a6); margin-bottom:7px; }
		.cbd-filter-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
		.cbd-panel__body { flex:1; overflow-y:auto; padding:14px 18px; }
		.cbd-panel__body::-webkit-scrollbar { width:4px; }
		.cbd-panel__body::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }
		.cbd-panel-loading, .cbd-panel-empty { text-align:center; color:var(--text-muted,#8d99a6); font-size:13px; padding:30px 0; }
		.cbd-panel__sticky-total { display:flex; justify-content:space-between; align-items:center; padding:10px 18px; background:#E6F1FB; border-top:1px solid #B5D4F4; font-size:13px; font-weight:700; color:#0C447C; flex-shrink:0; }
		.cbd-item-group { margin-bottom:10px; border:1px solid var(--border-color,#d1d8dd); border-radius:7px; overflow:hidden; }
		.cbd-item-group__head { display:flex; justify-content:space-between; align-items:center; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:#0C447C; background:#E6F1FB; padding:6px 10px; }
		.cbd-item-group__total { font-size:12px; color:#0C447C; font-weight:700; }
		.cbd-item-group__head--toggle { cursor:pointer; user-select:none; }
		.cbd-item-group__head--toggle:hover { filter:brightness(.96); }
		.cbd-igh-left { display:flex; align-items:center; gap:6px; }
		.cbd-igh-chevron { font-size:9px; color:#0C447C; transition:transform .18s ease; display:inline-block; }
		.cbd-item-group__body { overflow:hidden; transition:max-height .22s ease; max-height:2000px; }
		.cbd-item-group__body--collapsed { max-height:0 !important; }
		.cbd-ytd-bar { display:flex; align-items:center; flex-wrap:wrap; gap:6px; padding:7px 10px; background:#EEEDFE; border-radius:6px; margin-bottom:10px; font-size:11px; color:#3C3489; }
		.cbd-ytd-badge { display:inline-flex; align-items:center; padding:2px 7px; background:#534AB7; color:#fff; border-radius:4px; font-size:10px; font-weight:700; letter-spacing:.5px; flex-shrink:0; }
		.cbd-ytd-label { color:#3C3489; }
		.cbd-ytd-label b { color:#26215C; }
		.cbd-ytd-month { display:inline-flex; padding:1px 6px; background:#CECBF6; color:#26215C; border-radius:3px; font-size:10px; font-weight:600; margin-left:2px; }
		.cbd-centre-close { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:2005; display:none; align-items:center; gap:6px; padding:10px 18px; background:#1c2126; color:#fff; border:none; border-radius:24px; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 4px 20px rgba(0,0,0,.4); }
		.cbd-centre-close:hover { background:#A32D2D; }
		.cbd-centre-close--visible { display:flex; }
		@media (max-width:768px) { .cbd-centre-close { display:none !important; } }
		.cbd-panel__consolidated-badge { display:inline-flex; align-items:center; padding:1px 7px; background:#534AB7; color:#fff; border-radius:4px; font-size:10px; font-weight:700; letter-spacing:.4px; margin-right:5px; vertical-align:middle; }
		.cbd-panel__disb-badge { display:inline-flex; align-items:center; padding:2px 9px; background:#0d5c48; color:#fff; border-radius:5px; font-size:10px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; }
		#cbd_month_multiselect .form-group, #cbd_fy_multiselect .form-group { margin-bottom:0; }
		#cbd_month_multiselect .control-label, #cbd_fy_multiselect .control-label { display:none; }

		/* ═══════════════════════════════════════════════════════════
		   DISBURSEMENT PANEL
		   ═══════════════════════════════════════════════════════════ */
		.cbd-disb-overlay { visibility:hidden; opacity:0; position:fixed; inset:0; background:rgba(0,0,0,.32); z-index:3000; transition:opacity .2s ease, visibility .2s ease; }
		.cbd-disb-overlay--active { visibility:visible; opacity:1; }
		.cbd-disb-modal { position:fixed; top:0; bottom:0; right:0; width:50vw; max-width:760px; min-width:360px; background:var(--card-bg,#fff); z-index:3001; display:flex; flex-direction:column; overflow:hidden; border-left:1px solid var(--border-color,#d1d8dd); transform:translateX(100%); transition:transform .28s cubic-bezier(.4,0,.2,1); }
		.cbd-disb-modal--open { transform:translateX(0); }
		.cbd-dt-wrap { overflow-x:auto; }
		.cbd-dt { width:100%; border-collapse:collapse; font-size:12px; white-space:nowrap; }
		.cbd-dt thead { position:sticky; top:0; z-index:2; }
		.cbd-dt__head-row th { padding:9px 12px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-muted,#8d99a6); background:var(--control-bg,#f7f7f7); border-bottom:1px solid var(--border-color,#d1d8dd); border-right:1px solid var(--border-color,#d1d8dd); }
		.cbd-dt__b-row { cursor:pointer; transition:background .1s; }
		.cbd-dt__b-row:hover td { background:var(--control-bg,#f7f7f7); }
		.cbd-dt__b-row td { padding:8px 12px; border-bottom:1px solid var(--border-color,#d1d8dd); border-right:1px solid var(--border-color,#d1d8dd); vertical-align:middle; color:var(--text-color,#1c2126); }
		.cbd-dt__ref-cell { display:flex; align-items:center; gap:7px; font-weight:600; }
		.cbd-dt__chevron { display:inline-block; font-size:9px; color:var(--text-muted,#8d99a6); transition:transform .16s ease; flex-shrink:0; }
		.cbd-dt__disb-val { font-weight:700; color:#0C447C; }
		.cbd-dt__tag { display:inline-flex; align-items:center; font-size:11px; font-weight:600; border-radius:4px; padding:2px 7px; }
		.cbd-dt__tag--teal { background:#E1F5EE; color:#185FA5; }
		.cbd-dt__pct { display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:600; border-radius:4px; padding:2px 7px; }
		.cbd-dt__pct--green { background:#EAF3DE; color:#3B6D11; }
		.cbd-dt__pct--amber { background:#FAEEDA; color:#854F0B; }
		.cbd-dt__pct--red   { background:#FCEBEB; color:#A32D2D; }
		.cbd-dt__partner-count { font-size:10px; color:#0C447C; background:rgba(55,138,221,.12); border-radius:10px; padding:0 7px; font-weight:600; }
		.cbd-dt__detail-row--collapsed { display:none; }
		.cbd-dt__detail-row td { padding:0; }
		.cbd-dt__detail-cell { background:#f7f9fc; border-bottom:1px solid var(--border-color,#d1d8dd); }
		.cbd-dt__trk-item { display:flex; align-items:center; gap:10px; padding:8px 16px 8px 20px; border-bottom:1px solid var(--border-color,#d1d8dd); position:relative; }
		.cbd-dt__trk-item--last { border-bottom:none; }
		.cbd-dt__trk-item:hover { background:var(--control-bg,#f7f7f7); }
		.cbd-dt__trk-dot { width:8px; height:8px; flex-shrink:0; border-radius:50%; border:2px solid var(--border-color,#d1d8dd); background:var(--card-bg,#fff); position:relative; z-index:1; }
		.cbd-dt__trk-dot--first { border-color:#378ADD; background:#378ADD; }
		.cbd-dt__trk-item:not(.cbd-dt__trk-item--last)::after { content:''; position:absolute; left:23px; top:22px; width:1px; bottom:-1px; background:var(--border-color,#d1d8dd); }
		.cbd-dt__trk-date { font-size:12px; color:var(--text-color,#1c2126); flex:1; }
		.cbd-dt__trk-amt  { font-size:13px; font-weight:700; color:#185FA5; flex-shrink:0; }
		.cbd-dt__trk-empty { padding:12px 16px; font-size:12px; color:var(--text-muted,#8d99a6); text-align:center; }
		.cbd-dt__subtotal-row { display:flex; justify-content:space-between; align-items:center; padding:7px 14px; background:var(--control-bg,#f7f7f7); border-top:1px solid var(--border-color,#d1d8dd); font-size:11px; }
		.cbd-dt__subtotal-label { color:var(--text-muted,#8d99a6); font-weight:500; }

		.cbd-empty { padding:24px; text-align:center; color:var(--text-muted,#8d99a6); font-size:13px; }
		body.cbd-panels-open .navbar, body.cbd-panels-open .container-fluid.page-container > .row > .col:first-child { z-index:1 !important; }

		/* ── Tooltip ── */
		.cbd-tip-wrap {
			position:relative; display:inline-flex; align-items:center; gap:2px;
			border-bottom:1.5px dashed rgba(55,138,221,.45);
			padding-bottom:1px;
			transition:border-color .15s;
		}
		.cbd-tip-wrap:hover { border-bottom-color:rgba(55,138,221,.9); }
		#cbd-global-tip {
			position:fixed; z-index:9999; pointer-events:none;
			background:#1A1D23;
			border:1px solid rgba(255,255,255,.10);
			color:#fff;
			border-radius:10px;
			font-family:inherit;
			box-shadow:0 12px 32px rgba(0,0,0,.30), 0 2px 8px rgba(0,0,0,.20);
			opacity:0; transform:translateY(8px) scale(.96);
			transition:opacity .16s ease, transform .2s cubic-bezier(.22,1,.36,1);
			min-width:150px; max-width:260px;
			overflow:hidden; padding:0;
		}
		#cbd-global-tip .cbd-tip__header {
			padding:7px 12px 5px;
			border-bottom:1px solid rgba(255,255,255,.08);
			display:flex; align-items:center; gap:6px;
		}
		#cbd-global-tip .cbd-tip__icon {
			width:16px; height:16px; border-radius:4px;
			background:rgba(55,138,221,.25);
			display:flex; align-items:center; justify-content:center; flex-shrink:0;
		}
		#cbd-global-tip .cbd-tip__label {
			font-size:10px; font-weight:600;
			text-transform:uppercase; letter-spacing:.7px;
			color:rgba(255,255,255,.50);
		}
		#cbd-global-tip .cbd-tip__body { padding:6px 12px 10px; }
		#cbd-global-tip .cbd-tip__amount {
			font-size:16px; font-weight:700; letter-spacing:.3px;
			color:#fff; display:block;
		}
		#cbd-global-tip .cbd-tip__hint {
			font-size:10px; color:rgba(255,255,255,.35);
			margin-top:2px; display:block;
		}
		#cbd-global-tip::after {
			content:''; position:absolute;
			left:50%; transform:translateX(-50%);
			bottom:-6px;
			border:6px solid transparent;
			border-bottom:none; border-top-color:#1A1D23;
		}
		#cbd-global-tip.cbd-tip--visible { opacity:1; transform:translateY(0) scale(1); }
		#cbd-global-tip.cbd-tip--below::after {
			bottom:auto; top:-6px;
			border-top:none; border-bottom:6px solid #1A1D23;
		}

		/* ── Responsive ── */
		@media (max-width:1024px) {
			.cbd-filter-col { flex:1 1 33.33%; min-width:140px; }
			.cbd-summary-cards { grid-template-columns:1fr 1fr; gap:8px; }
			.cbd-overview-strip { flex-wrap:wrap; }
			.cbd-ostat { flex:1 1 33%; border-bottom:1px solid var(--border-color,#d1d8dd); }
			.cbd-panel-left, .cbd-panel-right { width:62vw; }
			.cbd-disb-modal { width:68vw; }

			.cbd-scard__value { font-size:18px; }
			.cbd-partner__footer { flex-wrap:wrap; }
		}
		@media (max-width:768px) {
			.cbd-root { padding:8px 10px 30px; }
			.cbd-filter-col { flex:1 1 50%; min-width:130px; }
			.cbd-summary-cards { grid-template-columns:1fr; gap:8px; }
			.cbd-overview-strip { flex-wrap:wrap; }
			.cbd-ostat { flex:1 1 50%; }
			.cbd-partner__head { flex-direction:column; gap:8px; }
			.cbd-partner__right { flex-direction:row; align-items:center; justify-content:space-between; flex-wrap:wrap; width:100%; }
			.cbd-partner__metrics { gap:4px; }
			.cbd-metric { min-width:60px; padding:2px 6px; }
			.cbd-metric__value { font-size:11px; }
			.cbd-partner__footer { flex-direction:column; }
			.cbd-footer-block + .cbd-footer-block { border-left:none; border-top:1px solid var(--border-color,#d1d8dd); }
			.cbd-partner__grants { padding-left:0; }
			.cbd-panel-left, .cbd-panel-right { width:100vw; max-width:100vw; border-radius:0; }
			.cbd-panel-left.cbd-panel--full, .cbd-panel-right.cbd-panel--full { width:100vw; }
			.cbd-disb-modal { width:100vw; max-width:100vw; border-radius:0; }

			.cbd-table { font-size:11px; }
			.cbd-table th, .cbd-table td { padding:6px 8px; }
			#cbd_partners { max-height:none; overflow-y:visible; }
			.cbd-centre-close { display:none !important; }
		}
		@media (max-width:480px) {
			.cbd-root { padding:6px 8px 24px; }
			.cbd-filter-col { flex:1 1 100%; min-width:0; }
			.cbd-summary-cards { grid-template-columns:1fr; gap:6px; }
			.cbd-overview-strip { display:grid; grid-template-columns:1fr 1fr; }
			.cbd-ostat { border-right:1px solid var(--border-color,#d1d8dd); border-bottom:1px solid var(--border-color,#d1d8dd); }
			.cbd-ostat__value { font-size:14px; }
			.cbd-partner__metrics { display:grid; grid-template-columns:repeat(2,1fr); gap:4px; }
			.cbd-metric { min-width:0; }
			.cbd-metric__label { font-size:10px; }
			.cbd-scard { padding:10px 12px; }
			.cbd-scard__value { font-size:16px; }
			.cbd-panel__header-actions .cbd-expand-all-label { display:none; }
			.cbd-panel__title { font-size:12px; }
		}
		@media (max-width:360px) {
			.cbd-filter-col { padding:3px 4px 0; }
			.cbd-scard__value { font-size:14px; }
		}
		`;
		document.head.appendChild(style);

		// ── Global tooltip singleton ──────────────────────────────────────
		if (!document.getElementById('cbd-global-tip')) {
			const tip = document.createElement('div');
			tip.id = 'cbd-global-tip';
			document.body.appendChild(tip);

			let _hide_timer = null;
			const _show = (el) => {
				const text  = el.dataset.tip;
				if (!text) return;
				clearTimeout(_hide_timer);
				const lbl   = el.dataset.tipLabel || 'Full amount';
				const short = el.textContent.trim();
				const icon_svg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(55,138,221,.9)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';
				tip.innerHTML =
					'<div class="cbd-tip__header">' +
						'<span class="cbd-tip__icon">' + icon_svg + '</span>' +
						'<span class="cbd-tip__label">' + frappe.utils.escape_html(lbl) + '</span>' +
					'</div>' +
					'<div class="cbd-tip__body">' +
						'<span class="cbd-tip__amount">' + frappe.utils.escape_html(text) + '</span>' +
						'<span class="cbd-tip__hint">Abbreviated as ' + frappe.utils.escape_html(short) + '</span>' +
					'</div>';
				tip.classList.add('cbd-tip--visible');
				const r = el.getBoundingClientRect();
				const tw = tip.offsetWidth || 200;
				const th = tip.offsetHeight || 60;
				tip.classList.remove('cbd-tip--visible');
				let left = r.left + r.width / 2 - tw / 2;
				left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
				const spaceAbove = r.top;
				const above = spaceAbove > th + 10;
				tip.classList.toggle('cbd-tip--below', !above);
				const top = above
					? r.top + window.scrollY - th - 10
					: r.bottom + window.scrollY + 8;
				tip.style.left = left + 'px';
				tip.style.top  = top  + 'px';
				tip.classList.add('cbd-tip--visible');
			};
			const _hide = () => {
				_hide_timer = setTimeout(() => tip.classList.remove('cbd-tip--visible'), 120);
			};
			document.addEventListener('mouseover', (e) => {
				const el = e.target.closest('.cbd-tip-wrap');
				if (el && el.dataset.tip) _show(el);
			});
			document.addEventListener('mouseout', (e) => {
				const el = e.target.closest('.cbd-tip-wrap');
				if (el) _hide();
			});
			document.addEventListener('scroll', () => tip.classList.remove('cbd-tip--visible'), true);
		}
	}
}
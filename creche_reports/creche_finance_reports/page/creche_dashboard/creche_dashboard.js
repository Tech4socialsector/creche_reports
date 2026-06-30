// frappe.pages['creche-dashboard'].on_page_load = function(wrapper) {
// 	const page = frappe.ui.make_app_page({
// 		parent: wrapper,
// 		title: 'Creche Dashboard',
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

// 	make() {
// 		this.page.main.html(`
// 			<div class="cbd-root">
// 				<div class="cbd-overview-strip" id="cbd_overview_strip" style="display:none"></div>
// 				<div class="cbd-summary-cards" id="cbd_summary_cards"></div>
// 			</div>
// 		`);

// 		this.page.set_secondary_action('Clear all', () => this._clear_filters(), 'close');
// 		this.page.set_primary_action('Apply', () => this.load_data(this._get_effective_filters()), 'filter');

// 		this._inject_styles();
// 		this._ensure_panels();
// 		this._build_filters();
// 	}

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

// 		// ── Partner ──────────────────────────────────────────────────────────
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
// 				},
// 			},
// 			render_input: true,
// 		});
// 		partner_ctrl.refresh();
// 		this._fields.partner_id = partner_ctrl;

// 		// ── Budget Reference ─────────────────────────────────────────────────
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

// 		// ── Grant ID ─────────────────────────────────────────────────────────
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

// 		// ── Financial Year ────────────────────────────────────────────────────
// 		const fy_ctrl = frappe.ui.form.make_control({
// 			parent: col($row1, 'financial_year'),
// 			df: {
// 				label: 'Financial Year', fieldtype: 'MultiSelectList', fieldname: 'financial_year',
// 				get_data: (txt) => frappe.db.get_list('Financial year', {
// 					fields: ['name'], limit: 50, order_by: 'name desc',
// 					...(txt ? { filters: { name: ['like', `%${txt}%`] } } : {}),
// 				}).then(rows => rows.map(r => ({ value: r.name, description: '' }))),
// 				change: () => {
// 					this._sel.financial_year = fy_ctrl.get_value() || [];
// 					this._on_filter_change('financial_year');
// 				},
// 			},
// 			render_input: true,
// 		});
// 		fy_ctrl.refresh();
// 		this._fields.financial_year = fy_ctrl;

// 		// ── Month ─────────────────────────────────────────────────────────────
// 		const month_ctrl = frappe.ui.form.make_control({
// 			parent: col($row1, 'month'),
// 			df: {
// 				label: 'Month', fieldtype: 'MultiSelectList', fieldname: 'month',
// 				get_data: (txt) => {
// 					const ORDER = ['April','May','June','July','August','September',
// 					               'October','November','December','January','February','March'];
// 					return frappe.db.get_list('Months', { fields: ['name'], limit: 12 })
// 						.then(rows => rows.filter(r => !txt || r.name.toLowerCase().includes(txt.toLowerCase()))
// 							.sort((a,b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name))
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

// 		// ── Start Date ────────────────────────────────────────────────────────
// 		const start_ctrl = frappe.ui.form.make_control({
// 			parent: col($row2, 'start_date'),
// 			df: {
// 				label: 'Start Date', fieldtype: 'Date', fieldname: 'start_date',
// 				change: () => {
// 					this._sel.start_date = start_ctrl.get_value() || '';
// 					this._on_filter_change('start_date');
// 					this._validate_dates('start_date');
// 				},
// 			},
// 			render_input: true,
// 		});
// 		start_ctrl.refresh();
// 		this._fields.start_date = start_ctrl;

// 		// ── End Date ──────────────────────────────────────────────────────────
// 		const end_ctrl = frappe.ui.form.make_control({
// 			parent: col($row2, 'end_date'),
// 			df: {
// 				label: 'End Date', fieldtype: 'Date', fieldname: 'end_date',
// 				change: () => {
// 					this._sel.end_date = end_ctrl.get_value() || '';
// 					this._on_filter_change('end_date');
// 					this._validate_dates('end_date');
// 				},
// 			},
// 			render_input: true,
// 		});
// 		end_ctrl.refresh();
// 		this._fields.end_date = end_ctrl;

// 		// ── State / District / Block ──────────────────────────────────────────
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

// 		// FIX 6: retry loop instead of a single 400ms timeout
// 		let _visN = 0;
// 		const _visT = setInterval(() => {
// 			_visN++;
// 			// Check if all key controls have rendered their $wrapper
// 			const ready = ['financial_year','month','start_date','end_date'].every(k => {
// 				const f = this._fields[k];
// 				return f && f.$wrapper && f.$wrapper[0];
// 			});
// 			if (ready || _visN >= 30) {
// 				clearInterval(_visT);
// 				this._setup_filter_visibility();
// 			}
// 		}, 200);
// 	}

// 	// ─────────────────────────────────────────────
// 	// DATE VALIDATION
// 	// ─────────────────────────────────────────────

// 	_validate_dates(changed_field) {
// 		const sd = this._fields.start_date?.get_value() || '';
// 		const ed = this._fields.end_date?.get_value()   || '';
// 		if (!sd || !ed) return true;
// 		if (new Date(sd) > new Date(ed)) {
// 			frappe.show_alert({ message: __('Start Date cannot be later than End Date.'), indicator: 'orange' }, 4);
// 			try {
// 				if (changed_field === 'start_date') this._fields.start_date.set_value('');
// 				else                                this._fields.end_date.set_value('');
// 			} catch(_) {}
// 			return false;
// 		}
// 		return true;
// 	}

// 	// ─────────────────────────────────────────────
// 	// FILTER VISIBILITY
// 	// ─────────────────────────────────────────────

// 	_setup_filter_visibility() {
// 		const GROUP_A = ['financial_year', 'month'];
// 		const GROUP_B = ['start_date', 'end_date'];

// 		const _hasValue = (key) => {
// 			try {
// 				const f = this._fields[key];
// 				const v = f?.get_value ? f.get_value() : null;
// 				if (v == null || v === '') return false;
// 				return Array.isArray(v) ? v.length > 0 : String(v).trim() !== '';
// 			} catch(_) { return false; }
// 		};

// 		const _getEl = (key) => {
// 			const col = document.getElementById(`cbd_fcol_${key}`);
// 			if (col) return col;
// 			const f = this._fields[key];
// 			if (f?.$wrapper?.[0]) return f.$wrapper[0];
// 			return null;
// 		};

// 		const _setVisible = (keys, show) => {
// 			keys.forEach(k => {
// 				const el = _getEl(k);
// 				if (!el) return;
// 				el.style.display = show ? '' : 'none';
// 			});
// 		};

// 		const _sync = () => {
// 			const aOn = GROUP_A.some(_hasValue);
// 			const bOn = GROUP_B.some(_hasValue);
// 			if (bOn && !aOn)      { _setVisible(GROUP_A, false); _setVisible(GROUP_B, true);  }
// 			else if (aOn && !bOn) { _setVisible(GROUP_A, true);  _setVisible(GROUP_B, false); }
// 			else                  { _setVisible(GROUP_A, true);  _setVisible(GROUP_B, true);  }
// 		};

// 		[...GROUP_A, ...GROUP_B].forEach(key => {
// 			const el = _getEl(key);
// 			if (el && !el._cbdMutObs) {
// 				const obs = new MutationObserver(() => setTimeout(_sync, 80));
// 				obs.observe(el, { childList: true, subtree: true });
// 				el._cbdMutObs = obs;
// 			}
// 		});

// 		['cbd_frow1','cbd_frow2'].forEach(rowId => {
// 			const rowEl = document.getElementById(rowId);
// 			if (rowEl && !rowEl._cbdFormObs) {
// 				const obs = new MutationObserver(() => { _sync(); });
// 				obs.observe(rowEl, { childList: true, subtree: false });
// 				rowEl._cbdFormObs = obs;
// 			}
// 		});

// 		this._sync_filter_visibility = _sync;
// 		_sync();
// 	}

// 	// ─────────────────────────────────────────────
// 	// FILTER HELPERS
// 	// ─────────────────────────────────────────────

// 	_on_filter_change(key) {
// 		if (this._sync_filter_visibility) {
// 			setTimeout(this._sync_filter_visibility, 50);
// 		}
// 	}

// 	_clear_filters() {
// 		// FIX 4: reset _active_filters immediately before the API call
// 		this._active_filters = {};

// 		Object.entries(this._fields || {}).forEach(([k, f]) => {
// 			try { f.set_value(f.df.fieldtype === 'Date' ? '' : []); } catch(e) {}
// 		});
// 		['financial_year','month','start_date','end_date'].forEach(k => {
// 			const el = document.getElementById(`cbd_fcol_${k}`);
// 			if (el) el.style.display = '';
// 		});
// 		this.load_data({});
// 	}

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

// 	// FIX 2: _panel_filters now includes partner_id
// 	_panel_filters() {
// 		const af = this._active_filters || {};
// 		return {
// 			partner_id:     af.partner_id     || null,
// 			start_date:     af.start_date     || null,
// 			end_date:       af.end_date       || null,
// 			financial_year: af.financial_year || null,
// 			month:          af.month          || null,
// 		};
// 	}

// 	// ─────────────────────────────────────────────
// 	// DATA
// 	// ─────────────────────────────────────────────

// 	load_data(filters) {
// 		this._active_filters = filters || {};
// 		frappe.call({
// 			method: 'creche_reports.api.budget_utilisation_summary.get_partner_budget_summary',
// 			freeze: true, freeze_message: 'Loading budget summary…',
// 			args: { filters: filters || {} },
// 			callback: (r) => {
// 				if (!r.message) return;
// 				// FIX 3: populate _all_partners BEFORE render_summary wires card clicks
// 				this._all_partners = r.message.partners || [];
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
// 			{ label:'Total Budget', value:this._fmt(s.total_budget), sub:'Approved budget', accent:'blue', panel:'budget', drill:'View partner breakdown →',
// 			  icon:`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>` },
// 			{ label:'Total Utilisation', value:this._fmt(s.total_utilisation), sub:'Reported utilisation', accent:'green', panel:'utilisation', drill:'View partner breakdown →',
// 			  icon:`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#639922" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` },
// 			{ label:'Total Disbursement', value:this._fmt(s.total_disbursement), sub:'Released amount', accent:'purple', panel:'disbursement', drill:'View partner breakdown →',
// 			  icon:`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>` },
// 		];
// 		const cardsWithRaw = [
// 			{...cards[0], raw: s.total_budget},
// 			{...cards[1], raw: s.total_utilisation},
// 			{...cards[2], raw: s.total_disbursement},
// 		];
// 		el.innerHTML = cardsWithRaw.map(c => `
// 			<div class="cbd-scard cbd-scard--${c.accent}" data-panel="${c.panel}">
// 				<div class="cbd-scard__top">
// 					<span class="cbd-scard__label">${c.label}</span>
// 					<span class="cbd-scard__svg">${c.icon}</span>
// 				</div>
// 				<div class="cbd-scard__value">${this._fmtTip(c.raw, c.label)}</div>
// 				<div class="cbd-scard__sub">${c.sub}<span class="cbd-scard__drill">${c.drill}</span></div>
// 			</div>`).join('');
// 		el.querySelectorAll('.cbd-scard').forEach(card => {
// 			card.addEventListener('click', () => {
// 				const panel = card.dataset.panel;
// 				if (panel === 'disbursement') {
// 					const all_partner_ids = (this._all_partners || []).map(p => p.partner_id).filter(Boolean);
// 					this._open_disbursement_panel('Overall Disbursements', null, all_partner_ids);
// 				} else {
// 					this._open_summary_modal(panel);
// 				}
// 			});
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// SUMMARY MODAL  (full-screen partner breakdown)
// 	// ─────────────────────────────────────────────

// 	_open_summary_modal(panel) {
// 		const old = document.getElementById('cbd_summary_modal_wrap');
// 		if (old) old.remove();

// 		const partners = this._all_partners || [];
// 		if (!partners.length) { frappe.msgprint('No data loaded yet.'); return; }

// 		const is_budget  = panel === 'budget';
// 		const title      = is_budget ? 'Budget Breakdown by Partner' : 'Utilisation Breakdown by Partner';
// 		const col_label  = is_budget ? 'Budget' : 'Utilisation';

// 		const grand_val  = partners.reduce((s,p) => s + (parseFloat(is_budget ? p.total_budget : p.total_utilisation)||0), 0);
// 		const grand_disb = partners.reduce((s,p) => s + (parseFloat(p.total_disbursement)||0), 0);
// 		const grand_util = partners.reduce((s,p) => s + (parseFloat(p.total_utilisation)||0), 0);
// 		const grand_bud  = partners.reduce((s,p) => s + (parseFloat(p.total_budget)||0), 0);
// 		const grand_bal  = partners.reduce((s,p) => s + (parseFloat(p.total_balance_budget)||0), 0);
// 		const grand_bank = partners.reduce((s,p) => s + (parseFloat(p.total_bank_balance)||0), 0);

// 		const wrap = document.createElement('div');
// 		wrap.id        = 'cbd_summary_modal_wrap';
// 		wrap.className = 'cbd-sm-wrap';

// 		// Build one summary row per partner
// 		const tbody_html = partners.map((p, idx) => {
// 			const u_pct   = parseFloat(p.utilised_pct) || 0;
// 			const ud_pct  = parseFloat(p.utilised_disbursement_pct) || 0;
// 			const chip_u  = u_pct  >= 75 ? 'cbd-chip--green' : u_pct  >= 50 ? 'cbd-chip--amber' : 'cbd-chip--red';
// 			const chip_ud = ud_pct >= 75 ? 'cbd-chip--green' : ud_pct >= 50 ? 'cbd-chip--amber' : 'cbd-chip--red';
// 			const total_creches  = (p.budgets||[]).reduce((s,b)=>s+(parseInt(b.no_of_creches)||0),0);
// 			const budget_ids_str = (p.budgets||[]).map(b=>b.budget_id).join(',');
// 			const grant_start    = (p.budgets||[]).map(b=>b.grant_start).filter(Boolean).sort()[0]||'';
// 			const grant_end      = (p.budgets||[]).map(b=>b.grant_end).filter(Boolean).sort().reverse()[0]||'';
// 			const pname_esc      = frappe.utils.escape_html(p.partner_name||'—');
// 			const bids_esc       = frappe.utils.escape_html(budget_ids_str);

// 			// Summary row
// 			const summary_row = `
// 			<tr class="cbd-sm__summary-row" data-idx="${idx}">
// 				<td class="cbd-sm__td-expand">
// 					<span class="cbd-sm__expand-icon" id="cbd_sm_icon_${idx}">&#9654;</span>
// 				</td>
// 				<td class="cbd-sm__td-name">
// 					<div class="cbd-sm__partner-name">${pname_esc}</div>
// 					<div class="cbd-sm__partner-meta">${frappe.utils.escape_html(p.grant_ids||'—')} · ${(p.budgets||[]).length} budget${(p.budgets||[]).length!==1?'s':''}</div>
// 				</td>
// 				<td class="cbd-sm__td-r">${this._fmtTip(p.total_budget,'Budget')}</td>
// 				<td class="cbd-sm__td-r">${this._fmtTip(p.total_disbursement,'Disbursed')}</td>
// 				<td class="cbd-sm__td-r">${this._fmtTip(p.total_utilisation,'Utilised')}</td>
// 				<td class="cbd-sm__td-r">${this._fmtTip(p.total_balance_budget,'Bal. Budget')}</td>
// 				<td class="cbd-sm__td-r">${this._fmtTip(p.total_bank_balance,'Bank Bal.')}</td>
// 				<td class="cbd-sm__td-r">${total_creches.toLocaleString('en-IN')}</td>
// 				<td class="cbd-sm__td-pct"><span class="cbd-chip ${chip_u}">${u_pct.toFixed(1)}%</span></td>
// 				<td class="cbd-sm__td-pct"><span class="cbd-chip ${chip_ud}">${ud_pct.toFixed(1)}%</span></td>
// 				<td class="cbd-sm__td-actions">
// 					<button class="cbd-icon-btn cbd-consolidated-btn cbd-sm__btn-view"
// 						title="View Consolidated Line Items"
// 						data-budget-ids="${bids_esc}"
// 						data-partner-name="${pname_esc}"
// 						data-grant-start="${frappe.utils.escape_html(grant_start)}"
// 						data-grant-end="${frappe.utils.escape_html(grant_end)}">
// 						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
// 					</button>
// 					<button class="cbd-icon-btn cbd-disb-btn cbd-sm__btn-disb"
// 						title="View Disbursements"
// 						data-budget-ids="${bids_esc}"
// 						data-partner-name="${pname_esc}">
// 						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>
// 					</button>
// 				</td>
// 			</tr>`;

// 			// Expand row — contains the per-budget detail table
// 			const expand_row = `
// 			<tr class="cbd-sm__expand-row" id="cbd_sm_expand_${idx}" style="display:none">
// 				<td colspan="11" class="cbd-sm__expand-td">
// 					${this._build_table(p.budgets||[], p.partner_name||'')}
// 				</td>
// 			</tr>`;

// 			return summary_row + expand_row;
// 		}).join('');

// 		// Grand total footer row
// 		const grand_u_pct  = grand_bud  > 0 ? (grand_util / grand_bud  * 100) : 0;
// 		const grand_ud_pct = grand_disb > 0 ? (grand_util / grand_disb * 100) : 0;
// 		const chip_gu  = grand_u_pct  >= 75 ? 'cbd-chip--green' : grand_u_pct  >= 50 ? 'cbd-chip--amber' : 'cbd-chip--red';
// 		const chip_gud = grand_ud_pct >= 75 ? 'cbd-chip--green' : grand_ud_pct >= 50 ? 'cbd-chip--amber' : 'cbd-chip--red';

// 		const tfoot_html = `
// 		<tr class="cbd-sm__grand-row">
// 			<td></td>
// 			<td><strong>Grand Total</strong><div class="cbd-sm__partner-meta">${partners.length} partners</div></td>
// 			<td class="cbd-sm__td-r"><strong>${this._fmtTip(grand_bud,'Budget')}</strong></td>
// 			<td class="cbd-sm__td-r"><strong>${this._fmtTip(grand_disb,'Disbursed')}</strong></td>
// 			<td class="cbd-sm__td-r"><strong>${this._fmtTip(grand_util,'Utilised')}</strong></td>
// 			<td class="cbd-sm__td-r"><strong>${this._fmtTip(grand_bal,'Bal. Budget')}</strong></td>
// 			<td class="cbd-sm__td-r"><strong>${this._fmtTip(grand_bank,'Bank Bal.')}</strong></td>
// 			<td class="cbd-sm__td-r"><strong>${partners.reduce((s,p)=>s+(p.total_creches||0),0).toLocaleString('en-IN')}</strong></td>
// 			<td class="cbd-sm__td-pct"><span class="cbd-chip ${chip_gu}">${grand_u_pct.toFixed(1)}%</span></td>
// 			<td class="cbd-sm__td-pct"><span class="cbd-chip ${chip_gud}">${grand_ud_pct.toFixed(1)}%</span></td>
// 			<td></td>
// 		</tr>`;

// 		wrap.innerHTML = `
// 			<div class="cbd-sm-modal">
// 				<div class="cbd-sm-modal__header">
// 					<div class="cbd-sm-modal__header-left">
// 						<div class="cbd-sm-modal__title">${frappe.utils.escape_html(title)}</div>
// 						<div class="cbd-sm-modal__sub">${partners.length} partner${partners.length!==1?'s':''} · ${this._fmt(grand_val)} total ${col_label.toLowerCase()}</div>
// 					</div>
// 					<button class="cbd-sm-modal__close" id="cbd_sm_close" title="Close (Esc)">
// 						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
// 					</button>
// 				</div>
// 				<div class="cbd-sm-modal__body">
// 					<div class="cbd-sm-tbl-wrap">
// 						<table class="cbd-sm-table">
// 							<thead>
// 								<tr>
// 									<th style="width:28px"></th>
// 									<th style="min-width:200px">Partner</th>
// 									<th class="cbd-sm__td-r">Budget</th>
// 									<th class="cbd-sm__td-r">Disbursed</th>
// 									<th class="cbd-sm__td-r">Utilised</th>
// 									<th class="cbd-sm__td-r">Bal. Budget</th>
// 									<th class="cbd-sm__td-r">Bank Bal.</th>
// 									<th class="cbd-sm__td-r">Creches</th>
// 									<th class="cbd-sm__td-pct">Util %</th>
// 									<th class="cbd-sm__td-pct">Util vs Disb.</th>
// 									<th style="width:72px; text-align:center">Actions</th>
// 								</tr>
// 							</thead>
// 							<tbody>${tbody_html}</tbody>
// 							<tfoot>${tfoot_html}</tfoot>
// 						</table>
// 					</div>
// 				</div>
// 			</div>`;

// 		document.body.appendChild(wrap);
// 		requestAnimationFrame(() => wrap.classList.add('cbd-sm-wrap--open'));

// 		// ── Close ──────────────────────────────────────────────────────────────
// 		const close = () => {
// 			wrap.classList.remove('cbd-sm-wrap--open');
// 			wrap.addEventListener('transitionend', () => wrap.remove(), { once: true });
// 			document.removeEventListener('keydown', _esc);
// 		};
// 		const _esc = (e) => { if (e.key === 'Escape') close(); };
// 		wrap.querySelector('#cbd_sm_close').addEventListener('click', close);
// 		wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
// 		document.addEventListener('keydown', _esc);

// 		// ── Row expand — click summary row to toggle budget sub-table ──────────
// 		wrap.querySelectorAll('.cbd-sm__summary-row').forEach(row => {
// 			row.addEventListener('click', (e) => {
// 				if (e.target.closest('.cbd-sm__btn-view') || e.target.closest('.cbd-sm__btn-disb')) return;
// 				const idx      = row.dataset.idx;
// 				const exp_row  = document.getElementById(`cbd_sm_expand_${idx}`);
// 				const icon     = document.getElementById(`cbd_sm_icon_${idx}`);
// 				if (!exp_row) return;
// 				const is_open  = exp_row.style.display !== 'none';
// 				// collapse all
// 				wrap.querySelectorAll('.cbd-sm__expand-row').forEach(r => r.style.display = 'none');
// 				wrap.querySelectorAll('.cbd-sm__expand-icon').forEach(i => { i.style.transform = ''; i.style.color = ''; });
// 				wrap.querySelectorAll('.cbd-sm__summary-row').forEach(r => r.classList.remove('cbd-sm__summary-row--open'));
// 				if (!is_open) {
// 					exp_row.style.display = '';
// 					icon.style.transform  = 'rotate(90deg)';
// 					icon.style.color      = '#378ADD';
// 					row.classList.add('cbd-sm__summary-row--open');
// 				}
// 			});
// 		});

// 		// ── Action buttons ─────────────────────────────────────────────────────
// 		wrap.addEventListener('click', (e) => {
// 			const vbtn = e.target.closest('.cbd-sm__btn-view');
// 			if (vbtn) {
// 				e.stopPropagation();
// 				this._open_consolidated_panels(
// 					(vbtn.dataset.budgetIds||'').split(',').filter(Boolean),
// 					vbtn.dataset.partnerName || '',
// 					vbtn.dataset.grantStart  || '',
// 					vbtn.dataset.grantEnd    || ''
// 				);
// 				return;
// 			}
// 			const dbtn = e.target.closest('.cbd-sm__btn-disb');
// 			if (dbtn) {
// 				e.stopPropagation();
// 				this._open_disbursement_panel(
// 					`${dbtn.dataset.partnerName||'Partner'} — Disbursements`,
// 					(dbtn.dataset.budgetIds||'').split(',').filter(Boolean),
// 					null
// 				);
// 				return;
// 			}
// 			// Buttons inside the expanded budget sub-table
// 			const tbv = e.target.closest('.cbd-view-btn');
// 			if (tbv) {
// 				e.stopPropagation();
// 				this._open_panels(tbv.dataset.budgetId, tbv.dataset.refName, tbv.dataset.grantStart||'', tbv.dataset.grantEnd||'');
// 				return;
// 			}
// 			const tbd = e.target.closest('.cbd-row-disb-btn');
// 			if (tbd) {
// 				e.stopPropagation();
// 				this._open_disbursement_panel(
// 					`${tbd.dataset.refName||tbd.dataset.budgetId} — Disbursements`,
// 					[tbd.dataset.budgetId], null
// 				);
// 				return;
// 			}
// 		});
// 	}

// 	_render_overview_strip(partners) {
// 		const el = document.getElementById('cbd_overview_strip');
// 		if (!el) return;
// 		if (!partners.length) { el.style.display = 'none'; return; }

// 		const num_partners  = partners.length;
// 		const num_budgets   = partners.reduce((s,p) => s+(p.budgets||[]).length, 0);
// 		const total_creches = partners.reduce((s,p) => s+(p.total_creches||0), 0);
// 		const all_states    = [...new Set(partners.flatMap(p=>(p.budgets||[]).map(b=>b.state).filter(Boolean)))].sort();
// 		const all_districts = [...new Set(partners.flatMap(p=>(p.budgets||[]).flatMap(b=>b.district?[b.district]:[])))].sort();
// 		const all_blocks    = [...new Set(partners.flatMap(p=>(p.budgets||[]).flatMap(b=>b.block?[b.block]:[])))].sort();

// 		const partner_rows = partners.map(p => ({
// 			name:    p.partner_name,
// 			budgets: (p.budgets||[]).length,
// 			creches: p.total_creches || 0,
// 			util:    p.utilised_pct  || 0,
// 		}));

// 		const budget_rows = partners.flatMap(p =>
// 			(p.budgets||[]).map(b => ({
// 				ref:     b.budget_reference_name,
// 				partner: p.partner_name,
// 				state:   b.state,
// 				fy:      b.financial_year,
// 				creches: b.no_of_creches || 0,
// 			}))
// 		);

// 		// FIX 6: store raw numeric count alongside formatted value for pluralisation
// 		const stats = [
// 			{
// 				key:'partners', value:num_partners, rawCount: num_partners,
// 				label:'Partner'+(num_partners!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
// 				drillData: partner_rows,
// 				drillType: 'partners',
// 			},
// 			{
// 				key:'budgets', value:num_budgets, rawCount: num_budgets,
// 				label:'Allocated Budget'+(num_budgets!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
// 				drillData: budget_rows,
// 				drillType: 'budgets',
// 			},
// 			{
// 				key:'creches', value:total_creches.toLocaleString('en-IN'), rawCount: total_creches,
// 				label:'Total Creche'+(total_creches!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
// 				drillData: budget_rows,
// 				drillType: 'creches',
// 			},
// 			{
// 				key:'states', value:all_states.length, rawCount: all_states.length,
// 				label:'Working State'+(all_states.length!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
// 				drillData: all_states,
// 				drillType: 'list',
// 			},
// 			{
// 				key:'districts', value:all_districts.length, rawCount: all_districts.length,
// 				label:'District'+(all_districts.length!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
// 				drillData: all_districts,
// 				drillType: 'list',
// 			},
// 			{
// 				key:'blocks', value:all_blocks.length, rawCount: all_blocks.length,
// 				label:'Block'+(all_blocks.length!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
// 				drillData: all_blocks,
// 				drillType: 'list',
// 			},
// 		];

// 		el.style.display = '';
// 		el.innerHTML = stats.map(s => `
// 			<div class="cbd-ostat cbd-ostat--clickable" data-key="${s.key}" title="Click to see details">
// 				<span class="cbd-ostat__icon">${s.icon}</span>
// 				<div class="cbd-ostat__body">
// 					<div class="cbd-ostat__value">${s.value}</div>
// 					<div class="cbd-ostat__label">${s.label}</div>
// 				</div>
// 				<svg class="cbd-ostat__arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
// 			</div>`).join('');

// 		el.querySelectorAll('.cbd-ostat--clickable').forEach(card => {
// 			const key  = card.dataset.key;
// 			const stat = stats.find(s => s.key === key);
// 			if (!stat) return;
// 			card.addEventListener('click', () => this._open_ostat_drill(stat));
// 		});
// 	}

// 	// ── Overview stat drill-down ────────────────────────────────────────────
// 	_open_ostat_drill(stat) {
// 		const old = document.getElementById('cbd_drill_modal_wrap');
// 		if (old) old.remove();

// 		const wrap = document.createElement('div');
// 		wrap.id        = 'cbd_drill_modal_wrap';
// 		wrap.className = 'cbd-drill-modal-wrap';

// 		const isWide = (stat.drillType === 'partners' || stat.drillType === 'budgets' || stat.drillType === 'creches');

// 		// FIX 6: use rawCount (number) for pluralisation, value (possibly formatted string) for display
// 		const rawCount = stat.rawCount !== undefined ? stat.rawCount : stat.value;

// 		wrap.innerHTML = `
// 			<div class="cbd-drill-modal ${isWide ? 'cbd-drill-modal--wide' : 'cbd-drill-modal--narrow'}">
// 				<div class="cbd-drill-modal__header">
// 					<div class="cbd-drill-modal__header-left">
// 						<span class="cbd-drill-modal__icon">${stat.icon}</span>
// 						<div>
// 							<div class="cbd-drill-modal__title">${frappe.utils.escape_html(stat.label)}</div>
// 							<div class="cbd-drill-modal__sub">${stat.value} record${rawCount != 1 ? 's' : ''}</div>
// 						</div>
// 					</div>
// 					<button class="cbd-drill-modal__close" id="cbd_drill_close" title="Close">
// 						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
// 					</button>
// 				</div>
// 				<div class="cbd-drill-modal__body">${this._build_ostat_content(stat)}</div>
// 				<div class="cbd-drill-modal__footer">
// 					<button class="btn btn-default btn-sm" id="cbd_drill_footer_close">Close</button>
// 				</div>
// 			</div>`;

// 		document.body.appendChild(wrap);

// 		wrap.addEventListener('click', (e) => {
// 			if (e.target === wrap) this._close_drill_panel();
// 		});
// 		wrap.querySelector('#cbd_drill_close').addEventListener('click', () => this._close_drill_panel());
// 		wrap.querySelector('#cbd_drill_footer_close').addEventListener('click', () => this._close_drill_panel());

// 		this._drill_key_handler = (e) => { if (e.key === 'Escape') this._close_drill_panel(); };
// 		document.addEventListener('keydown', this._drill_key_handler);

// 		requestAnimationFrame(() => wrap.classList.add('cbd-drill-modal-wrap--open'));
// 	}

// 	_close_drill_panel() {
// 		const wrap = document.getElementById('cbd_drill_modal_wrap');
// 		if (!wrap) return;
// 		wrap.classList.remove('cbd-drill-modal-wrap--open');
// 		wrap.addEventListener('transitionend', () => wrap.remove(), { once: true });
// 		if (this._drill_key_handler) {
// 			document.removeEventListener('keydown', this._drill_key_handler);
// 			this._drill_key_handler = null;
// 		}
// 	}

// 	_build_ostat_content(stat) {
// 		const { drillType, drillData } = stat;

// 		if (drillType === 'list') {
// 			if (!drillData.length) return '<div class="cbd-drill-empty">No data available.</div>';
// 			const allPartners = this._all_partners || [];
// 			return `<div class="cbd-drill-list">
// 				${drillData.map((item, i) => {
// 					const matching = allPartners.flatMap(p =>
// 						(p.budgets||[]).filter(b =>
// 							b.state === item || b.district === item || b.block === item
// 						).map(b => ({ ref: b.budget_reference_name, partner: p.partner_name, creches: b.no_of_creches||0 }))
// 					);
// 					const total_creches = matching.reduce((s,b) => s + b.creches, 0);
// 					const partner_names = [...new Set(matching.map(b => b.partner))];
// 					return `
// 					<div class="cbd-drill-list__row">
// 						<span class="cbd-drill-list__num">${i+1}</span>
// 						<span class="cbd-drill-list__dot"></span>
// 						<div class="cbd-drill-list__body">
// 							<div class="cbd-drill-list__text">${frappe.utils.escape_html(item)}</div>
// 							<div class="cbd-drill-list__detail">
// 								${matching.length} budget${matching.length!==1?'s':''}
// 								${total_creches ? ` · ${total_creches.toLocaleString('en-IN')} creches` : ''}
// 								${partner_names.length ? ` · ${partner_names.map(n => frappe.utils.escape_html(n)).join(', ')}` : ''}
// 							</div>
// 						</div>
// 						${total_creches ? `<span class="cbd-drill-brow__creche-badge">${total_creches.toLocaleString('en-IN')}</span>` : ''}
// 					</div>`;
// 				}).join('')}
// 			</div>`;
// 		}

// 		if (drillType === 'partners') {
// 			if (!drillData.length) return '<div class="cbd-drill-empty">No partners found.</div>';
// 			return `
// 			<div class="cbd-drill-cards">
// 				${drillData.map((p) => {
// 					const util    = parseFloat(p.util) || 0;
// 					const bar_cls = util >= 75 ? 'green' : util >= 50 ? 'amber' : 'red';
// 					const chip_cls = util >= 75 ? 'cbd-chip--green' : util >= 50 ? 'cbd-chip--amber' : 'cbd-chip--red';
// 					const initials = p.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
// 					const full = (this._all_partners||[]).find(ap => ap.partner_name === p.name);
// 					const states = full ? [...new Set((full.budgets||[]).map(b=>b.state).filter(Boolean))].sort() : [];
// 					return `
// 					<div class="cbd-drill-card">
// 						<div class="cbd-drill-card__top">
// 							<div class="cbd-drill-card__avatar">${frappe.utils.escape_html(initials)}</div>
// 							<div class="cbd-drill-card__info">
// 								<div class="cbd-drill-card__name">${frappe.utils.escape_html(p.name)}</div>
// 								<div class="cbd-drill-card__meta">
// 									${p.budgets} budget${p.budgets!==1?'s':''}
// 									<span class="cbd-drill-card__sep">·</span>
// 									${p.creches.toLocaleString('en-IN')} creches
// 									${states.length ? '<span class="cbd-drill-card__sep">·</span>' + states.map(s => frappe.utils.escape_html(s)).join(', ') : ''}
// 								</div>
// 							</div>
// 							<span class="cbd-chip ${chip_cls}">${util.toFixed(1)}%</span>
// 						</div>
// 						<div class="cbd-drill-card__amounts">
// 							<div class="cbd-drill-card__amt-item">
// 								<span class="cbd-drill-card__amt-label">Budget</span>
// 								<span class="cbd-drill-card__amt-val">${this._fmtTip(full ? full.total_budget : null,'Budget')}</span>
// 							</div>
// 							<div class="cbd-drill-card__amt-item">
// 								<span class="cbd-drill-card__amt-label">Disbursed</span>
// 								<span class="cbd-drill-card__amt-val">${this._fmtTip(full ? full.total_disbursement : null,'Disbursed')}</span>
// 							</div>
// 							<div class="cbd-drill-card__amt-item">
// 								<span class="cbd-drill-card__amt-label">Utilised</span>
// 								<span class="cbd-drill-card__amt-val" style="color:#3B6D11;font-weight:600">${this._fmtTip(full ? full.total_utilisation : null,'Utilised')}</span>
// 							</div>
// 						</div>
// 						<div class="cbd-drill-card__bar-track">
// 							<div class="cbd-drill-card__bar-fill cbd-drill-card__bar-fill--${bar_cls}" style="width:${Math.min(util,100)}%"></div>
// 						</div>
// 					</div>`;
// 				}).join('')}
// 			</div>`;
// 		}

// 		if (drillType === 'budgets' || drillType === 'creches') {
// 			if (!drillData.length) return '<div class="cbd-drill-empty">No budgets found.</div>';
// 			const show_creches = drillType === 'creches';
// 			const allPartners = this._all_partners || [];
// 			return `
// 			<div class="cbd-drill-blist">
// 				${drillData.map((b, i) => {
// 					const pdata  = allPartners.find(p => p.partner_name === b.partner);
// 					const bdata  = pdata ? (pdata.budgets||[]).find(bd => bd.budget_reference_name === b.ref) : null;
// 					const b_amt  = bdata ? this._fmt(bdata.budget)       : null;
// 					const u_amt  = bdata ? this._fmt(bdata.utilisation)   : null;
// 					const u_pct  = bdata ? parseFloat(bdata.utilised_pct)||0 : 0;
// 					const pct_cls = u_pct >= 75 ? 'cbd-chip--green' : u_pct >= 50 ? 'cbd-chip--amber' : 'cbd-chip--red';
// 					return `
// 					<div class="cbd-drill-brow">
// 						<div class="cbd-drill-brow__left">
// 							<div class="cbd-drill-brow__seq">${i+1}</div>
// 							<div class="cbd-drill-brow__detail">
// 								<div class="cbd-drill-brow__ref">
// 									<span class="cbd-chip cbd-chip--blue">${frappe.utils.escape_html(b.ref||'—')}</span>
// 									${show_creches && b.creches ? `<span class="cbd-drill-brow__creche-badge">${b.creches.toLocaleString('en-IN')} creches</span>` : ''}
// 									${bdata && u_pct ? `<span class="cbd-chip ${pct_cls}" style="font-size:10px">${u_pct.toFixed(1)}%</span>` : ''}
// 								</div>
// 								<div class="cbd-drill-brow__meta">
// 									<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
// 									${frappe.utils.escape_html(b.partner||'—')}
// 									<span class="cbd-drill-brow__sep">|</span>
// 									<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
// 									${frappe.utils.escape_html(b.state||'—')}
// 									${b_amt ? `<span class="cbd-drill-brow__sep">|</span> Budget: <strong>${frappe.utils.escape_html(b_amt)}</strong>` : ''}
// 									${u_amt ? `· Utilised: <strong style="color:#3B6D11">${frappe.utils.escape_html(u_amt)}</strong>` : ''}
// 								</div>
// 							</div>
// 						</div>
// 						<span class="cbd-drill-brow__fy">${frappe.utils.escape_html(b.fy||'—')}</span>
// 					</div>`;
// 				}).join('')}
// 			</div>`;
// 		}

// 		return '<div class="cbd-drill-empty">No details available.</div>';
// 	}

// 	render_partners(partners) {
// 		this._all_partners = partners || [];
// 		this._render_overview_strip(partners || []);
// 		// Partner cards removed — breakdown now lives in the summary modal
// 	}

// 	_render_partners_OLD_UNUSED(partners) {
// 		const el = document.getElementById('cbd_partners');
// 		if (!partners || !partners.length) { el.innerHTML = '<div class="cbd-empty">No partner data available.</div>'; return; }
// 		el.innerHTML = '';
// 		partners.forEach((partner, idx) => {
// 			const u_pct = parseFloat(partner.utilised_pct)||0;
// 			const badge_cls = this._badge_cls(u_pct); const fill_cls = this._fill_cls(u_pct);
// 			const total_creches = (partner.budgets||[]).reduce((s,b)=>s+(parseInt(b.no_of_creches)||0),0);
// 			const states = [...new Set((partner.budgets||[]).map(b=>b.state).filter(Boolean))].sort();
// 			const refs   = [...new Set((partner.budgets||[]).map(b=>b.budget_reference_name).filter(Boolean))].sort();
// 			const state_tags = states.length ? states.map(s=>`<span class="cbd-stag cbd-stag--blue"><span class="cbd-stag__dot cbd-stag__dot--blue"></span>${frappe.utils.escape_html(s)}</span>`).join('') : '<span class="cbd-stag cbd-stag--gray">—</span>';
// 			const ref_tags = refs.length ? refs.map(r=>`<span class="cbd-stag cbd-stag--purple"><span class="cbd-stag__dot cbd-stag__dot--purple"></span>${frappe.utils.escape_html(r)}</span>`).join('') : '<span class="cbd-stag cbd-stag--gray">—</span>';
// 			const budget_ids_str = frappe.utils.escape_html((partner.budgets||[]).map(b=>b.budget_id).join(','));
// 			const partner_id_esc = frappe.utils.escape_html(partner.partner_id||'');
// 			const partner_name_esc = frappe.utils.escape_html(partner.partner_name||'');
// 			const card = document.createElement('div');
// 			card.className = 'cbd-partner';
// 			card.innerHTML = `
// 				<div class="cbd-partner__head" id="cbd_ph_${idx}">
// 					<div class="cbd-partner__left">
// 						<div class="cbd-partner__name">${this._icon_partner()}${partner_name_esc}</div>
// 						<div class="cbd-partner__grants">Grants: ${frappe.utils.escape_html(partner.grant_ids||'—')}</div>
// 						<div class="cbd-partner__metrics">
// 							${this._metric('Budget',null,partner.total_budget)}
// 							${this._metric('Disbursed',null,partner.total_disbursement)}
// 							${this._metric('Utilised',null,partner.total_utilisation)}
// 							${this._metric('Bal. Budget',null,partner.total_balance_budget)}
// 							${this._metric('Bank Bal.',null,partner.total_bank_balance)}
// 							${this._metric('Interest',null,partner.total_interest)}
// 							${this._metric('Total Creches',total_creches)}
// 							${this._metric_pct('Util % of Budget',u_pct)}
// 							${this._metric_pct('Util % vs Disbursed',this._util_vs_disb_pct(partner))}
// 						</div>
// 						<div class="cbd-partner__footer">
// 							<div class="cbd-footer-block"><div class="cbd-footer-block__label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>Operating States</div><div class="cbd-footer-block__tags">${state_tags}</div></div>
// 							<div class="cbd-footer-block"><div class="cbd-footer-block__label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Budget References</div><div class="cbd-footer-block__tags">${ref_tags}</div></div>
// 						</div>
// 						<div class="cbd-prog" style="margin-top:7px"><div class="cbd-prog__fill cbd-prog__fill--${fill_cls}" style="width:${Math.min(u_pct,100)}%"></div></div>
// 					</div>
// 					<div class="cbd-partner__right">
// 						<div class="cbd-badge cbd-badge--${badge_cls}">${u_pct.toFixed(1)}% utilised</div>
// 						<div class="cbd-partner__btn-group">
// 							<button class="cbd-consolidated-btn cbd-icon-btn" title="View Consolidated Budget &amp; Utilisation" data-partner-name="${partner_name_esc}" data-budget-ids="${budget_ids_str}" data-grant-start="${frappe.utils.escape_html((partner.budgets||[]).map(b=>b.grant_start).filter(Boolean).sort()[0]||'')}" data-grant-end="${frappe.utils.escape_html((partner.budgets||[]).map(b=>b.grant_end).filter(Boolean).sort().reverse()[0]||'')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
// 							<button class="cbd-disb-btn cbd-icon-btn" title="View Disbursements" data-partner-name="${partner_name_esc}" data-partner-id="${partner_id_esc}" data-budget-ids="${budget_ids_str}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg></button>
// 						</div>
// 						<div class="cbd-chevron" id="cbd_chv_${idx}">&#9654;</div>
// 					</div>
// 				</div>
// 				<div class="cbd-partner__body" id="cbd_pb_${idx}">${this._build_table(partner.budgets||[], partner.partner_name||'')}</div>`;
// 			el.appendChild(card);
// 			card.querySelector(`#cbd_ph_${idx}`).addEventListener('click', (e) => {
// 				if (e.target.closest('.cbd-consolidated-btn')||e.target.closest('.cbd-disb-btn')) return;
// 				const body = document.getElementById(`cbd_pb_${idx}`); const chv = document.getElementById(`cbd_chv_${idx}`);
// 				const open = body.style.display === 'block';
// 				body.style.display = open ? 'none' : 'block'; chv.classList.toggle('cbd-chevron--open', !open);
// 			});
// 		});

// 		// FIX 1: re-bind view buttons after every render (innerHTML replacement detaches old listeners)
// 		this._bind_view_buttons();
// 	}

// 	_build_table(budgets, partner_name) {
// 		if (!budgets.length) return '<div class="cbd-empty">No budget rows.</div>';
// 		const rows = budgets.map(r => {
// 			const u_pct = parseFloat(r.utilised_pct)||0; const ud_pct = parseFloat(r.utilised_disbursement_pct)||0;
// 			return `<tr>
// 				<td><span class="cbd-chip cbd-chip--blue">${frappe.utils.escape_html(r.budget_reference_name||'—')}</span></td>
// 				<td><span class="cbd-chip cbd-chip--teal">${frappe.utils.escape_html(r.grant_id||'—')}</span></td>
// 				<td>${frappe.utils.escape_html(r.financial_year||'—')}</td>
// 				<td>${frappe.utils.escape_html(r.state||'—')}</td>
// 				<td>${this._date(r.grant_start)}</td><td>${this._date(r.grant_end)}</td>
// 				<td class="cbd-r">${r.no_of_creches||0}</td>
// 				<td class="cbd-r">${this._fmtTip(r.budget)}</td>
// 				<td class="cbd-r">${this._fmtTip(r.disbursement)}</td>
// 				<td class="cbd-r">${this._fmtTip(r.utilisation)}</td>
// 				<td class="cbd-r"><span class="cbd-chip cbd-chip--${this._chip_cls(u_pct)}">${u_pct.toFixed(1)}%</span></td>
// 				<td class="cbd-r"><span class="cbd-chip cbd-chip--${this._chip_cls(ud_pct)}">${ud_pct.toFixed(1)}%</span></td>
// 				<td class="cbd-r">${this._fmtTip(r.balance_budget_amount)}</td>
// 				<td class="cbd-r">${this._fmtTip(r.bank_balance)}</td>
// 				<td class="cbd-r">${this._fmtTip(r.interest_from_bank)}</td>
// 				<td class="cbd-actions-cell">
// 					<button class="cbd-view-btn cbd-icon-btn" title="View Line Items" data-budget-id="${frappe.utils.escape_html(r.budget_id)}" data-ref-name="${frappe.utils.escape_html(r.budget_reference_name||'')}" data-grant-start="${frappe.utils.escape_html(r.grant_start||'')}" data-grant-end="${frappe.utils.escape_html(r.grant_end||'')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
// 					<button class="cbd-row-disb-btn cbd-icon-btn" title="View Disbursements" data-budget-id="${frappe.utils.escape_html(r.budget_id)}" data-ref-name="${frappe.utils.escape_html(r.budget_reference_name||'')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg></button>
// 				</td>
// 			</tr>`;
// 		}).join('');
// 		return `<div class="cbd-tbl-wrap"><table class="cbd-table" role="table" aria-label="Budget rows for ${frappe.utils.escape_html(partner_name)}"><thead><tr><th>Reference</th><th>Grant ID</th><th>FY</th><th>State</th><th>Start</th><th>End</th><th class="cbd-r">Creches</th><th class="cbd-r">Budget</th><th class="cbd-r">Disbursed</th><th class="cbd-r">Utilised</th><th class="cbd-r">Util %</th><th class="cbd-r">Util vs Disb.</th><th class="cbd-r">Bal. Budget</th><th class="cbd-r">Bank Bal.</th><th class="cbd-r">Interest</th><th class="cbd-actions-col">Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
// 	}

// 	_open_disbursement_panel(title, budget_ids, partner_ids) {
// 		const overlay = document.getElementById('cbd_disb_overlay'); const panel = document.getElementById('cbd_disb_modal');
// 		overlay.classList.add('cbd-disb-overlay--active'); panel.classList.add('cbd-disb-modal--open');
// 		panel.innerHTML = `<div class="cbd-panel__header"><div><div class="cbd-panel__title"><span class="cbd-panel__disb-badge">Disbursement</span></div><div class="cbd-panel__sub">${frappe.utils.escape_html(title)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label" title="Expand / collapse all partners"><input type="checkbox" class="cbd-expand-chk" id="cbd_disb_expand_all">Expand all</label><button class="cbd-panel__close" id="cbd_close_disb" title="Close">&#10005;</button></div></div><div class="cbd-panel__body" id="cbd_disb_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_disb_total" style="display:none"><span>Grand Total Disbursed</span><span id="cbd_disb_total_val">—</span></div>`;
// 		document.getElementById('cbd_close_disb').addEventListener('click', () => this._close_disb_panel());
// 		document.getElementById('cbd_disb_expand_all').addEventListener('change', (e) => {
// 			const expand = e.target.checked; const body = document.getElementById('cbd_disb_body'); if (!body) return;
// 			body.querySelectorAll('.cbd-item-group__body').forEach(b=>b.classList.toggle('cbd-item-group__body--collapsed',!expand));
// 			body.querySelectorAll('.cbd-igh-chevron').forEach(chv=>{chv.style.transform=expand?'':'rotate(-90deg)';});
// 		});
// 		this._load_disbursement_panel_data(budget_ids, partner_ids);
// 	}

// 	_close_disb_panel() {
// 		const panel = document.getElementById('cbd_disb_modal'); const overlay = document.getElementById('cbd_disb_overlay');
// 		if (panel) panel.classList.remove('cbd-disb-modal--open');
// 		if (overlay) overlay.classList.remove('cbd-disb-overlay--active');
// 	}

// 	_load_disbursement_panel_data(budget_ids, partner_ids) {
// 		const pf = this._panel_filters();
// 		frappe.call({
// 			method: 'creche_reports.api.budget_utilisation_summary.get_disbursement_panel_data',
// 			args: { budget_ids: budget_ids?JSON.stringify(budget_ids):null, partner_ids:partner_ids?JSON.stringify(partner_ids):null, start_date:pf.start_date||null, end_date:pf.end_date||null, financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null, month:pf.month?JSON.stringify(pf.month):null },
// 			callback: (r) => {
// 				const records = r.message||[]; const body = document.getElementById('cbd_disb_body'); if (!body) return;
// 				const flt = v=>parseFloat(v)||0;
// 				if (!records.length) { body.innerHTML='<div class="cbd-panel-empty">No disbursement records found.</div>'; return; }
// 				const by_partner = {};
// 				records.forEach(doc=>{ const key=doc.partner_id||doc.partner_name||'Unknown'; if(!by_partner[key]) by_partner[key]={name:doc.partner_name||doc.partner_id||'Unknown',docs:[],total:0}; by_partner[key].docs.push(doc); by_partner[key].total+=flt(doc.total_disbursement); });
// 				const grand_total = Object.values(by_partner).reduce((s,p)=>s+p.total,0);
// 				body.innerHTML='';
// 				Object.values(by_partner).forEach((partner,pidx)=>{
// 					const p_id=`cbd_dp_${pidx}`; const grp=document.createElement('div'); grp.className='cbd-item-group';
// 					grp.innerHTML=`<div class="cbd-item-group__head cbd-item-group__head--toggle cbd-dt__p-head" id="cbd_ph_d${pidx}"><div class="cbd-igh-left"><span class="cbd-igh-chevron">&#9660;</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><span>${frappe.utils.escape_html(partner.name)}</span><span class="cbd-dt__partner-count">${partner.docs.length} budget${partner.docs.length!==1?'s':''}</span></div><span class="cbd-item-group__total">${this._fmtTip(partner.total,'Partner Total')}</span></div><div class="cbd-item-group__body" id="${p_id}"><div class="cbd-dt-wrap"><table class="cbd-dt" id="cbd_dt_${pidx}"><thead><tr class="cbd-dt__head-row"><th style="width:32px"></th><th>Reference</th><th>Grant ID</th><th>State</th><th>FY</th><th class="cbd-li-r">Budget</th><th class="cbd-li-r">Disbursed</th><th class="cbd-li-r">Balance</th><th class="cbd-li-r">%</th></tr></thead><tbody id="cbd_dtb_${pidx}"></tbody></table></div><div class="cbd-dt__subtotal-row"><span class="cbd-dt__subtotal-label">Partner Total</span><span style="font-weight:700;color:#0C447C">${this._fmtTip(partner.total,'Partner Total')}</span></div></div>`;
// 					body.appendChild(grp);
// 					grp.querySelector(`#cbd_ph_d${pidx}`).addEventListener('click',()=>{const pb=document.getElementById(p_id);const chv=grp.querySelector('.cbd-igh-chevron');const collapsed=pb.classList.toggle('cbd-item-group__body--collapsed');chv.style.transform=collapsed?'rotate(-90deg)':'';});
// 					const tbody=grp.querySelector(`#cbd_dtb_${pidx}`);
// 					partner.docs.forEach((doc,bidx)=>{
// 						const b_pct=flt(doc.total_budget)>0?Math.min((flt(doc.total_disbursement)/flt(doc.total_budget))*100,100):0;
// 						const pct_cls=b_pct>=80?'green':b_pct>=50?'amber':'red'; const d_id=`cbd_dtr_${pidx}_${bidx}`;
// 						const b_row=document.createElement('tr'); b_row.className='cbd-dt__b-row';
// 						b_row.innerHTML=`<td style="width:32px;text-align:center;border-right:1px solid var(--border-color,#d1d8dd)"><span class="cbd-dt__chevron" style="font-size:9px;color:var(--text-muted,#8d99a6)">&#9654;</span></td><td class="cbd-dt__ref-cell">${frappe.utils.escape_html(doc.budget_reference_name||doc.budget_reference_id||'—')}</td><td>${doc.grant_id?`<span class="cbd-dt__tag cbd-dt__tag--teal">${frappe.utils.escape_html(doc.grant_id)}</span>`:'—'}</td><td>${frappe.utils.escape_html(doc.state||'—')}</td><td>${frappe.utils.escape_html(doc.financial_year||'—')}</td><td class="cbd-li-r">${this._fmt(doc.total_budget)}</td><td class="cbd-li-r cbd-dt__disb-val">${this._fmt(doc.total_disbursement)}</td><td class="cbd-li-r">${this._fmt(doc.balence_budget)}</td><td class="cbd-li-r"><span class="cbd-dt__pct cbd-dt__pct--${pct_cls}">${b_pct.toFixed(1)}%</span></td>`;
// 						tbody.appendChild(b_row);
// 						const tracker=doc.tracker||[];
// 						const trk_inner=tracker.length?tracker.map((t,i)=>`<div class="cbd-dt__trk-item ${i===tracker.length-1?'cbd-dt__trk-item--last':''}"><span class="cbd-dt__trk-dot ${i===0?'cbd-dt__trk-dot--first':''}"></span><span class="cbd-dt__trk-date">${this._date(t.date_of_disbursement)}</span><span class="cbd-dt__trk-amt">${this._fmtTip(t.disbursed_amount,'Disbursed')}</span></div>`).join(''):`<div class="cbd-dt__trk-empty">No payment entries recorded.</div>`;
// 						const d_row=document.createElement('tr'); d_row.className='cbd-dt__detail-row cbd-dt__detail-row--collapsed'; d_row.id=d_id;
// 						d_row.innerHTML=`<td colspan="9" class="cbd-dt__detail-cell">${trk_inner}</td>`; tbody.appendChild(d_row);
// 						b_row.addEventListener('click',()=>{const open=!d_row.classList.contains('cbd-dt__detail-row--collapsed');d_row.classList.toggle('cbd-dt__detail-row--collapsed',open);b_row.querySelector('.cbd-dt__chevron').style.transform=open?'':'rotate(90deg)';});
// 					});
// 				});
// 				const tot=document.getElementById('cbd_disb_total');const tot_val=document.getElementById('cbd_disb_total_val');
// 				if(tot){tot.style.display='flex';tot_val.innerHTML=this._fmtTip(grand_total,'Grand Total');}
// 			}
// 		});
// 	}

// 	_open_overall_panels(panel='both') {
// 		if (!this._all_partners||!this._all_partners.length){frappe.msgprint('No data loaded yet.');return;}
// 		const all_budget_ids=this._all_partners.flatMap(p=>(p.budgets||[]).map(b=>b.budget_id)).filter(Boolean);
// 		const all_starts=this._all_partners.flatMap(p=>(p.budgets||[]).map(b=>b.grant_start)).filter(Boolean).sort();
// 		const all_ends=this._all_partners.flatMap(p=>(p.budgets||[]).map(b=>b.grant_end)).filter(Boolean).sort().reverse();
// 		if (!all_budget_ids.length){frappe.msgprint('No budgets found.');return;}
// 		this._open_consolidated_panels_typed(all_budget_ids,'Overall Summary',all_starts[0]||'',all_ends[0]||'',panel);
// 	}

// 	_open_consolidated_panels_typed(budget_ids,title,grant_start,grant_end,panel) {
// 		const overlay=document.getElementById('cbd_overlay');const left=document.getElementById('cbd_panel_left');const right=document.getElementById('cbd_panel_right');
// 		overlay.classList.add('cbd-overlay--active');document.body.classList.add('cbd-panels-open');
// 		const sidebar=document.querySelector('.layout-side-section,.desk-sidebar,#sidebar-menu');if(sidebar){sidebar.dataset.cbdPrevZ=sidebar.style.zIndex||'';sidebar.style.zIndex='1';}
// 		const badge=`<span class="cbd-panel__consolidated-badge">Overall</span>`;const sub=`${budget_ids.length} budget${budget_ids.length>1?'s':''} · All Partners`;
// 		const left_html=`<div class="cbd-panel__header"><div><div class="cbd-panel__title">${badge} Budget Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(sub)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels">&#10005;</button></div></div><div class="cbd-panel__body" id="cbd_left_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none"><span>Grand Total</span><span id="cbd_left_total_val">—</span></div>`;
// 		const right_html=`<div class="cbd-panel__header"><div><div class="cbd-panel__title">${badge} Utilisation Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(sub)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels2">&#10005;</button></div></div><div class="cbd-panel__filter" id="cbd_month_filter_wrap"><div class="cbd-filter-row"><div class="cbd-filter-col"><div class="cbd-filter-label">Financial Year</div><div id="cbd_fy_multiselect"></div></div><div class="cbd-filter-col"><div class="cbd-filter-label">Month</div><div id="cbd_month_multiselect"></div></div></div></div><div class="cbd-panel__body" id="cbd_right_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none"><span id="cbd_right_total_lbl">Total</span><span id="cbd_right_total_val">—</span></div>`;
// 		if(panel==='budget'){left.classList.add('cbd-panel--open','cbd-panel--full');right.classList.remove('cbd-panel--open');left.innerHTML=left_html;}
// 		else if(panel==='utilisation'){right.classList.add('cbd-panel--open','cbd-panel--full');left.classList.remove('cbd-panel--open');right.innerHTML=right_html;}
// 		else{left.classList.add('cbd-panel--open');right.classList.add('cbd-panel--open');left.innerHTML=left_html;right.innerHTML=right_html;const cc=document.getElementById('cbd_centre_close');if(cc)cc.classList.add('cbd-centre-close--visible');}
// 		const wire=(id,fn)=>{const b=document.getElementById(id);if(b)b.addEventListener('click',fn);};
// 		wire('cbd_close_panels',()=>this._close_left());wire('cbd_close_panels2',()=>this._close_right());
// 		if(panel==='budget'||panel==='both')this._load_consolidated_budget_items(budget_ids);
// 		if(panel==='utilisation'||panel==='both')this._load_consolidated_utilisation_items(budget_ids,grant_start,grant_end);
// 	}

// 	_open_panels(budget_id,ref_name,grant_start,grant_end) {
// 		const overlay=document.getElementById('cbd_overlay');const left=document.getElementById('cbd_panel_left');const right=document.getElementById('cbd_panel_right');
// 		overlay.classList.add('cbd-overlay--active');left.classList.add('cbd-panel--open');right.classList.add('cbd-panel--open');document.body.classList.add('cbd-panels-open');
// 		const cclose=document.getElementById('cbd_centre_close');if(cclose)cclose.classList.add('cbd-centre-close--visible');
// 		const sidebar=document.querySelector('.layout-side-section,.desk-sidebar,#sidebar-menu,.main-container>.col.layout-side-section');
// 		if(sidebar){sidebar.dataset.cbdPrevZ=sidebar.style.zIndex||'';sidebar.style.zIndex='1';}
// 		left.innerHTML=`<div class="cbd-panel__header"><div><div class="cbd-panel__title">Budget Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(ref_name)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels">&#10005;</button></div></div><div class="cbd-panel__body" id="cbd_left_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none"><span>Grand Total</span><span id="cbd_left_total_val">—</span></div>`;
// 		right.innerHTML=`<div class="cbd-panel__header"><div><div class="cbd-panel__title">Utilisation Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(ref_name)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels2">&#10005;</button></div></div><div class="cbd-panel__filter"><div class="cbd-filter-row"><div class="cbd-filter-col"><div class="cbd-filter-label">Financial Year</div><div id="cbd_fy_multiselect"></div></div><div class="cbd-filter-col"><div class="cbd-filter-label">Month</div><div id="cbd_month_multiselect"></div></div></div></div><div class="cbd-panel__body" id="cbd_right_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none"><span id="cbd_right_total_lbl">Total</span><span id="cbd_right_total_val">—</span></div>`;
// 		document.getElementById('cbd_close_panels').addEventListener('click',()=>this._close_left());
// 		document.getElementById('cbd_close_panels2').addEventListener('click',()=>this._close_right());
// 		this._load_budget_items(budget_id);this._load_utilisation_items(budget_id,grant_start,grant_end);
// 	}

// 	_close_all_panels(){this._close_panels();this._close_disb_panel();}
// 	_close_panels(){
// 		document.getElementById('cbd_overlay').classList.remove('cbd-overlay--active');
// 		document.getElementById('cbd_panel_left').classList.remove('cbd-panel--open','cbd-panel--full');
// 		document.getElementById('cbd_panel_right').classList.remove('cbd-panel--open','cbd-panel--full');
// 		document.body.classList.remove('cbd-panels-open');
// 		const sidebar=document.querySelector('.layout-side-section,.desk-sidebar,#sidebar-menu,.main-container>.col.layout-side-section');
// 		if(sidebar)sidebar.style.zIndex=sidebar.dataset.cbdPrevZ||'';
// 		const cc=document.getElementById('cbd_centre_close');if(cc)cc.classList.remove('cbd-centre-close--visible');
// 	}
// 	_close_left(){const left=document.getElementById('cbd_panel_left');left.classList.remove('cbd-panel--open','cbd-panel--full');const cc=document.getElementById('cbd_centre_close');if(cc)cc.classList.remove('cbd-centre-close--visible');const right=document.getElementById('cbd_panel_right');if(!right.classList.contains('cbd-panel--open'))this._close_panels();}
// 	_close_right(){const right=document.getElementById('cbd_panel_right');right.classList.remove('cbd-panel--open','cbd-panel--full');const cc=document.getElementById('cbd_centre_close');if(cc)cc.classList.remove('cbd-centre-close--visible');const left=document.getElementById('cbd_panel_left');if(!left.classList.contains('cbd-panel--open'))this._close_panels();}

// 	_load_budget_items(budget_id) {
// 		const _pf=this._panel_filters();frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_budget_line_items',args:{budget_id,start_date:_pf.start_date||null,end_date:_pf.end_date||null,financial_year:_pf.financial_year?JSON.stringify(_pf.financial_year):null,month:_pf.month?JSON.stringify(_pf.month):null},callback:(r)=>{
// 			const el=document.getElementById('cbd_left_body');if(!el)return;
// 			const items=r.message||[];if(!items.length){el.innerHTML='<div class="cbd-panel-empty">No budget line items found.</div>';return;}
// 			const groups={};items.forEach(item=>{const h=item.budget_main_head||'Other';if(!groups[h])groups[h]=[];groups[h].push(item);});
// 			el.innerHTML='';
// 			Object.entries(groups).forEach(([head,rows],gidx)=>{
// 				const group_total=rows.reduce((s,r)=>s+(parseFloat(r.total_amount)||0),0);const gid='lgrp_'+gidx;
// 				const grp=document.createElement('div');grp.className='cbd-item-group';
// 				grp.innerHTML=`<div class="cbd-item-group__head cbd-item-group__head--toggle"><div class="cbd-igh-left"><span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span><span>${frappe.utils.escape_html(head)}</span></div><span class="cbd-item-group__total">${this._fmtTip(group_total,'Category Total')}</span></div><div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}"><div class="cbd-li-scroll-wrap"><table class="cbd-li-table"><thead><tr><th class="cbd-li-sticky cbd-li-sticky--1">Expense Type</th><th class="cbd-li-sticky cbd-li-sticky--2">Sub Head</th><th class="cbd-li-r">Amount</th><th class="cbd-li-r">Y1</th><th class="cbd-li-r">Y2</th><th class="cbd-li-r">Y3</th></tr></thead><tbody>${rows.map(row=>`<tr><td class="cbd-li-sticky cbd-li-sticky--1"><div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses||'—')}</div>${row.notes?`<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>`:''}</td><td class="cbd-li-sticky cbd-li-sticky--2">${frappe.utils.escape_html(row.budget_sub_head||'—')}</td><td class="cbd-li-r cbd-li-amt">${this._fmtTip(row.total_amount,'Amount')}</td><td class="cbd-li-r">${row.year_1?this._fmt(row.year_1):'—'}</td><td class="cbd-li-r">${row.year_2?this._fmt(row.year_2):'—'}</td><td class="cbd-li-r">${row.year_3?this._fmt(row.year_3):'—'}</td></tr>`).join('')}</tbody></table></div></div>`;
// 				el.appendChild(grp);
// 				grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click',()=>{const body=document.getElementById(gid);const chv=grp.querySelector('.cbd-igh-chevron');const collapsed=body.classList.toggle('cbd-item-group__body--collapsed');chv.style.transform=collapsed?'rotate(-90deg)':'';});
// 			});
// 			const grand=items.reduce((s,r)=>s+(parseFloat(r.total_amount)||0),0);
// 			const tot=document.getElementById('cbd_left_total');const tot_val=document.getElementById('cbd_left_total_val');
// 			if(tot){tot.style.display='flex';tot_val.textContent=this._fmt(grand);}
// 		}});
// 	}

// 	_load_utilisation_items(budget_id,grant_start,grant_end) {
// 		const pf=this._panel_filters();
// 		frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_utilisation_line_items',args:{budget_id,start_date:pf.start_date,end_date:pf.end_date,financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,month:pf.month?JSON.stringify(pf.month):null},callback:(r)=>{
// 			const data=r.message||{};const records=data.records||[];
// 			const ALL_12=['January','February','March','April','May','June','July','August','September','October','November','December'];
// 			const fy_from_server=[...new Set(records.map(r=>r.financial_year).filter(Boolean))];
// 			const fy_options_derived=this._derive_fy_options(grant_start,grant_end);
// 			const fy_options=fy_options_derived.length?fy_options_derived:fy_from_server.map(v=>({value:v,description:''}));
// 			const has_main_filter = !!(pf.financial_year || pf.month || pf.start_date || pf.end_date);
// 			let active_fys, active_months;
// 			if (pf.financial_year) {
// 				active_fys = new Set(pf.financial_year);
// 				active_months = pf.month ? new Set(pf.month) : new Set(ALL_12);
// 			} else if (pf.month) {
// 				active_fys = new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
// 				active_months = new Set(pf.month);
// 			} else if (pf.start_date || pf.end_date) {
// 				const derived = this._fym_from_date_range(pf.start_date, pf.end_date);
// 				active_fys = derived.fys.size ? derived.fys : new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
// 				active_months = derived.months.size ? derived.months : new Set(ALL_12);
// 			} else {
// 				active_fys = new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
// 				active_months = new Set(ALL_12);
// 			}
// 			this._util_records=records;this._selected_months=active_months;this._selected_fys=active_fys;
// 			const fy_wrap=document.getElementById('cbd_fy_multiselect');const month_wrap=document.getElementById('cbd_month_multiselect');
// 			if(!fy_wrap||!month_wrap)return;
// 			this._fy_field=frappe.ui.form.make_control({df:{fieldtype:'MultiSelectList',fieldname:'fy_filter',label:'FY',get_data:()=>fy_options},parent:$(fy_wrap),render_input:true});
// 			this._fy_field.refresh();this._fy_field.set_value([...active_fys]);
// 			this._fy_field.df.onchange=()=>{const val=this._fy_field.get_value()||[];this._selected_fys=new Set(Array.isArray(val)?val:[val]);this._render_utilisation();};
// 			const month_opts_available=ALL_12.filter(m=>records.some(r=>r.month===m));
// 			const month_opts_display=month_opts_available.length?month_opts_available:ALL_12;
// 			this._month_field=frappe.ui.form.make_control({df:{fieldtype:'MultiSelectList',fieldname:'month_filter',label:'Month',get_data:()=>month_opts_display.map(m=>({value:m,description:''}))},parent:$(month_wrap),render_input:true});
// 			this._month_field.refresh();this._month_field.set_value([...active_months].filter(m=>month_opts_display.includes(m)));
// 			this._month_field.df.onchange=()=>{const val=this._month_field.get_value()||[];this._selected_months=new Set(Array.isArray(val)?val:[val]);this._render_utilisation();};
// 			if(!records.length){document.getElementById('cbd_right_body').innerHTML='<div class="cbd-panel-empty">No utilisation records found for the selected filters.</div>';return;}
// 			this._render_utilisation();
// 		}});
// 	}

// 	_derive_fy_options(start_str,end_str) {
// 		const to_fy=(ds)=>{if(!ds)return null;const d=new Date(ds);const yr=d.getFullYear();const mo=d.getMonth()+1;const fy=mo>=4?yr:yr-1;return `${fy}-${String(fy+1).slice(-2)}`;};
// 		const start_fy=to_fy(start_str);const end_fy=to_fy(end_str);
// 		if(!start_fy)return[];const options=[];let[sy]=start_fy.split('-').map(Number);const[ey]=(end_fy||start_fy).split('-').map(Number);
// 		while(sy<=ey){options.push({value:`${sy}-${String(sy+1).slice(-2)}`,description:''});sy++;}
// 		return options;
// 	}

// 	// Returns {fys: Set, months: Set} covering all calendar months between start_date and end_date.
// 	// Used to pre-select the panel FY/month filters when the main filter is date-range based.
// 	_fym_from_date_range(start_date_str, end_date_str) {
// 		const MONTH_NAMES = ['January','February','March','April','May','June',
// 		                     'July','August','September','October','November','December'];
// 		const to_fy = (yr, mo) => { const fy = mo >= 4 ? yr : yr - 1; return `${fy}-${String(fy+1).slice(-2)}`; };
// 		const fys = new Set(); const months = new Set();
// 		if (!start_date_str) return { fys, months };
// 		const sd = new Date(start_date_str);
// 		const ed = end_date_str ? new Date(end_date_str) : new Date();
// 		// clamp ed to end of its month
// 		let y = sd.getFullYear(), m = sd.getMonth(); // 0-indexed
// 		const ey = ed.getFullYear(), em = ed.getMonth();
// 		while (y < ey || (y === ey && m <= em)) {
// 			fys.add(to_fy(y, m + 1));   // m+1 = 1-indexed month
// 			months.add(MONTH_NAMES[m]);
// 			m++; if (m > 11) { m = 0; y++; }
// 		}
// 		return { fys, months };
// 	}

// 	_render_utilisation() {
// 		const el=document.getElementById('cbd_right_body');if(!el)return;
// 		const MONTH_ORDER=['January','February','March','April','May','June','July','August','September','October','November','December'];
// 		const sel_months=this._selected_months||new Set();const sel_fys=this._selected_fys||new Set();
// 		const records=(this._util_records||[]).filter(r=>(sel_months.size===0||sel_months.has(r.month))&&(sel_fys.size===0||sel_fys.has(r.financial_year)));
// 		if(!records.length){el.innerHTML='<div class="cbd-panel-empty">No data for selected period.</div>';const rt=document.getElementById('cbd_right_total');if(rt)rt.style.display='none';return;}
// 		const active_months=[...new Set(records.map(r=>r.month))].sort((a,b)=>MONTH_ORDER.indexOf(a)-MONTH_ORDER.indexOf(b));
// 		const is_multi=active_months.length>1;
// 		const combined={};
// 		records.forEach(rec=>{(rec.items||[]).forEach(item=>{const key=item.type_of_expenses_id||item.type_of_expenses||'unknown';if(!combined[key])combined[key]={type_of_expenses:item.type_of_expenses,budget_main_head:item.budget_main_head,budget_sub_head:item.budget_sub_head,notes:item.notes,total_amount:0,by_month:{}};const amt=parseFloat(item.total_amount)||0;combined[key].total_amount+=amt;combined[key].by_month[rec.month]=(combined[key].by_month[rec.month]||0)+amt;});});
// 		const groups={};Object.values(combined).forEach(item=>{const h=item.budget_main_head||'Other';if(!groups[h])groups[h]=[];groups[h].push(item);});
// 		el.innerHTML='';
// 		if(is_multi){const bar=document.createElement('div');bar.className='cbd-ytd-bar';bar.innerHTML=`<span class="cbd-ytd-badge">YTD</span><span class="cbd-ytd-label">Combined across <b>${active_months.length}</b> months: ${active_months.map(m=>`<span class="cbd-ytd-month">${m}</span>`).join('')}</span>`;el.appendChild(bar);}
// 		let grand=0;
// 		Object.entries(groups).forEach(([head,rows],gidx)=>{
// 			const group_total=rows.reduce((s,r)=>s+r.total_amount,0);grand+=group_total;const gid='rgrp_'+gidx;
// 			let fy_header_row='';let month_header_row='';
// 			if(is_multi){const fy_groups={};active_months.forEach(m=>{const rec=records.find(r=>r.month===m);const fy=rec?(rec.financial_year||'Unknown'):'Unknown';if(!fy_groups[fy])fy_groups[fy]=[];fy_groups[fy].push(m);});fy_header_row=`<tr class="cbd-li-fy-row"><th class="cbd-li-sticky cbd-li-sticky--1 cbd-li-fy-blank" rowspan="2">Expense Type</th><th class="cbd-li-sticky cbd-li-sticky--2 cbd-li-fy-blank" rowspan="2">Sub Head</th>${Object.entries(fy_groups).map(([fy,months])=>`<th colspan="${months.length}" class="cbd-li-fy-hdr">${frappe.utils.escape_html(fy)}</th>`).join('')}<th rowspan="2" class="cbd-li-r cbd-li-ytd-hdr">YTD Total</th></tr>`;month_header_row=`<tr class="cbd-li-month-row">${active_months.map(m=>`<th class="cbd-li-r cbd-li-month-col">${m.slice(0,3)}</th>`).join('')}</tr>`;}
// 			const month_tds=(row)=>is_multi?active_months.map(m=>`<td class="cbd-li-r cbd-li-month-col">${row.by_month[m]?this._fmt(row.by_month[m]):'—'}</td>`).join(''):'';
// 			const grp=document.createElement('div');grp.className='cbd-item-group';
// 			grp.innerHTML=`<div class="cbd-item-group__head cbd-item-group__head--toggle"><div class="cbd-igh-left"><span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span><span>${frappe.utils.escape_html(head)}</span></div><span class="cbd-item-group__total">${this._fmtTip(group_total,'Category Total')}</span></div><div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}"><div class="cbd-li-scroll-wrap"><table class="cbd-li-table"><thead>${is_multi?fy_header_row+month_header_row:`<tr><th class="cbd-li-sticky cbd-li-sticky--1">Expense Type</th><th class="cbd-li-sticky cbd-li-sticky--2">Sub Head</th><th class="cbd-li-r">Amount</th></tr>`}</thead><tbody>${rows.map(row=>`<tr><td class="cbd-li-sticky cbd-li-sticky--1"><div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses||'—')}</div>${row.notes?`<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>`:''}</td><td class="cbd-li-sticky cbd-li-sticky--2 cbd-li-sub">${frappe.utils.escape_html(row.budget_sub_head||'—')}</td>${month_tds(row)}<td class="cbd-li-r cbd-li-amt">${this._fmtTip(row.total_amount,'Amount')}</td></tr>`).join('')}</tbody></table></div></div>`;
// 			el.appendChild(grp);
// 			grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click',()=>{const body=document.getElementById(gid);const chv=grp.querySelector('.cbd-igh-chevron');const collapsed=body.classList.toggle('cbd-item-group__body--collapsed');chv.style.transform=collapsed?'rotate(-90deg)':'';});
// 		});
// 		const rt=document.getElementById('cbd_right_total');const rt_val=document.getElementById('cbd_right_total_val');const rt_lbl=document.getElementById('cbd_right_total_lbl');
// 		if(rt){rt.style.display='flex';rt_val.textContent=this._fmt(grand);if(rt_lbl)rt_lbl.textContent=is_multi?`YTD Total (${active_months.length} months)`:'Total';}
// 	}

// 	_open_consolidated_panels(budget_ids,partner_name,grant_start,grant_end) {
// 		const overlay=document.getElementById('cbd_overlay');const left=document.getElementById('cbd_panel_left');const right=document.getElementById('cbd_panel_right');
// 		overlay.classList.add('cbd-overlay--active');left.classList.add('cbd-panel--open');right.classList.add('cbd-panel--open');document.body.classList.add('cbd-panels-open');
// 		const cc=document.getElementById('cbd_centre_close');if(cc)cc.classList.add('cbd-centre-close--visible');
// 		const sidebar=document.querySelector('.layout-side-section,.desk-sidebar,#sidebar-menu,.main-container>.col.layout-side-section');
// 		if(sidebar){sidebar.dataset.cbdPrevZ=sidebar.style.zIndex||'';sidebar.style.zIndex='1';}
// 		const title_sub=`${budget_ids.length} budget${budget_ids.length>1?'s':''} · Consolidated`;
// 		left.innerHTML=`<div class="cbd-panel__header"><div><div class="cbd-panel__title"><span class="cbd-panel__consolidated-badge">Consolidated</span> Budget Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(partner_name)} &mdash; ${frappe.utils.escape_html(title_sub)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels">&#10005;</button></div></div><div class="cbd-panel__body" id="cbd_left_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none"><span>Grand Total</span><span id="cbd_left_total_val">—</span></div>`;
// 		right.innerHTML=`<div class="cbd-panel__header"><div><div class="cbd-panel__title"><span class="cbd-panel__consolidated-badge">Consolidated</span> Utilisation Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(partner_name)} &mdash; ${frappe.utils.escape_html(title_sub)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels2">&#10005;</button></div></div><div class="cbd-panel__filter"><div class="cbd-filter-row"><div class="cbd-filter-col"><div class="cbd-filter-label">Financial Year</div><div id="cbd_fy_multiselect"></div></div><div class="cbd-filter-col"><div class="cbd-filter-label">Month</div><div id="cbd_month_multiselect"></div></div></div></div><div class="cbd-panel__body" id="cbd_right_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none"><span id="cbd_right_total_lbl">Total</span><span id="cbd_right_total_val">—</span></div>`;
// 		document.getElementById('cbd_close_panels').addEventListener('click',()=>this._close_left());
// 		document.getElementById('cbd_close_panels2').addEventListener('click',()=>this._close_right());
// 		this._load_consolidated_budget_items(budget_ids);this._load_consolidated_utilisation_items(budget_ids,grant_start,grant_end);
// 	}

// 	_load_consolidated_budget_items(budget_ids) {
// 		const _cpf=this._panel_filters();const promises=budget_ids.map(bid=>frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_budget_line_items',args:{budget_id:bid,start_date:_cpf.start_date||null,end_date:_cpf.end_date||null,financial_year:_cpf.financial_year?JSON.stringify(_cpf.financial_year):null,month:_cpf.month?JSON.stringify(_cpf.month):null}}));
// 		Promise.all(promises).then(results=>{
// 			const el=document.getElementById('cbd_left_body');if(!el)return;
// 			const merged={};
// 			results.forEach(r=>{(r.message||[]).forEach(item=>{const key=item.type_of_expenses_id||item.type_of_expenses||'unknown';if(!merged[key])merged[key]={type_of_expenses:item.type_of_expenses,budget_main_head:item.budget_main_head,budget_sub_head:item.budget_sub_head,notes:item.notes,total_amount:0,year_1:0,year_2:0,year_3:0};merged[key].total_amount+=parseFloat(item.total_amount)||0;merged[key].year_1+=parseFloat(item.year_1)||0;merged[key].year_2+=parseFloat(item.year_2)||0;merged[key].year_3+=parseFloat(item.year_3)||0;});});
// 			const items=Object.values(merged);if(!items.length){el.innerHTML='<div class="cbd-panel-empty">No budget line items found.</div>';return;}
// 			const groups={};items.forEach(item=>{const h=item.budget_main_head||'Other';if(!groups[h])groups[h]=[];groups[h].push(item);});
// 			el.innerHTML='';
// 			Object.entries(groups).forEach(([head,rows],gidx)=>{
// 				const group_total=rows.reduce((s,r)=>s+r.total_amount,0);const gid='clgrp_'+gidx;
// 				const grp=document.createElement('div');grp.className='cbd-item-group';
// 				grp.innerHTML=`<div class="cbd-item-group__head cbd-item-group__head--toggle"><div class="cbd-igh-left"><span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span><span>${frappe.utils.escape_html(head)}</span></div><span class="cbd-item-group__total">${this._fmtTip(group_total,'Category Total')}</span></div><div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}"><table class="cbd-li-table"><thead><tr><th>Expense Type</th><th>Sub Head</th><th class="cbd-li-r">Total</th><th class="cbd-li-r">Y1</th><th class="cbd-li-r">Y2</th><th class="cbd-li-r">Y3</th></tr></thead><tbody>${rows.map(row=>`<tr><td><div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses||'—')}</div>${row.notes?`<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>`:''}</td><td class="cbd-li-sub">${frappe.utils.escape_html(row.budget_sub_head||'—')}</td><td class="cbd-li-r cbd-li-amt">${this._fmtTip(row.total_amount,'Amount')}</td><td class="cbd-li-r">${row.year_1?this._fmt(row.year_1):'—'}</td><td class="cbd-li-r">${row.year_2?this._fmt(row.year_2):'—'}</td><td class="cbd-li-r">${row.year_3?this._fmt(row.year_3):'—'}</td></tr>`).join('')}</tbody></table></div>`;
// 				el.appendChild(grp);
// 				grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click',()=>{const body=document.getElementById(gid);const chv=grp.querySelector('.cbd-igh-chevron');const collapsed=body.classList.toggle('cbd-item-group__body--collapsed');chv.style.transform=collapsed?'rotate(-90deg)':'';});
// 			});
// 			const grand=items.reduce((s,r)=>s+r.total_amount,0);
// 			const tot=document.getElementById('cbd_left_total');const tot_val=document.getElementById('cbd_left_total_val');
// 			if(tot){tot.style.display='flex';tot_val.textContent=this._fmt(grand);}
// 		});
// 	}

// 	_load_consolidated_utilisation_items(budget_ids,grant_start,grant_end) {
// 		const pf=this._panel_filters();
// 		const call_args=(bid)=>({budget_id:bid,start_date:pf.start_date,end_date:pf.end_date,financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,month:pf.month?JSON.stringify(pf.month):null});
// 		const promises=budget_ids.map(bid=>frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_utilisation_line_items',args:call_args(bid)}));
// 		Promise.all(promises).then(results=>{
// 			const all_records=[];results.forEach(r=>{((r.message||{}).records||[]).forEach(rec=>all_records.push(rec));});
// 			const ALL_12=['January','February','March','April','May','June','July','August','September','October','November','December'];
// 			const fy_from_server=[...new Set(all_records.map(r=>r.financial_year).filter(Boolean))];
// 			const fy_options_derived=this._derive_fy_options(grant_start,grant_end);
// 			const fy_options=fy_options_derived.length?fy_options_derived:fy_from_server.map(v=>({value:v,description:''}));
// 			const _has_main = !!(pf.financial_year || pf.month || pf.start_date || pf.end_date);
// 			let active_fys, active_months;
// 			if (pf.financial_year) {
// 				active_fys = new Set(pf.financial_year);
// 				active_months = pf.month ? new Set(pf.month) : new Set(ALL_12);
// 			} else if (pf.month) {
// 				active_fys = new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
// 				active_months = new Set(pf.month);
// 			} else if (pf.start_date || pf.end_date) {
// 				const derived = this._fym_from_date_range(pf.start_date, pf.end_date);
// 				active_fys = derived.fys.size ? derived.fys : new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
// 				active_months = derived.months.size ? derived.months : new Set(ALL_12);
// 			} else {
// 				active_fys = new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
// 				active_months = new Set(ALL_12);
// 			}
// 			this._util_records=all_records;this._selected_months=active_months;this._selected_fys=active_fys;
// 			const fy_wrap=document.getElementById('cbd_fy_multiselect');const month_wrap=document.getElementById('cbd_month_multiselect');if(!fy_wrap||!month_wrap)return;
// 			this._fy_field=frappe.ui.form.make_control({df:{fieldtype:'MultiSelectList',fieldname:'fy_filter',label:'FY',get_data:()=>fy_options},parent:$(fy_wrap),render_input:true});
// 			this._fy_field.refresh();this._fy_field.set_value([...active_fys]);
// 			this._fy_field.df.onchange=()=>{const val=this._fy_field.get_value()||[];this._selected_fys=new Set(Array.isArray(val)?val:[val]);this._render_utilisation();};
// 			const month_opts_available=ALL_12.filter(m=>all_records.some(r=>r.month===m));
// 			const month_opts_display=month_opts_available.length?month_opts_available:ALL_12;
// 			this._month_field=frappe.ui.form.make_control({df:{fieldtype:'MultiSelectList',fieldname:'month_filter',label:'Month',get_data:()=>month_opts_display.map(m=>({value:m,description:''}))},parent:$(month_wrap),render_input:true});
// 			this._month_field.refresh();this._month_field.set_value([...active_months].filter(m=>month_opts_display.includes(m)));
// 			this._month_field.df.onchange=()=>{const val=this._month_field.get_value()||[];this._selected_months=new Set(Array.isArray(val)?val:[val]);this._render_utilisation();};
// 			if(!all_records.length){document.getElementById('cbd_right_body').innerHTML='<div class="cbd-panel-empty">No utilisation records found for the selected filters.</div>';return;}
// 			this._render_utilisation();
// 		});
// 	}

// 	// ─────────────────────────────────────────────
// 	// HELPERS
// 	// ─────────────────────────────────────────────

// 	_fmt(n){
// 		if(n===null||n===undefined||n==='')return'—';
// 		const v=parseFloat(n)||0;
// 		if(Math.abs(v)>=10000000)return'₹'+(v/10000000).toFixed(2)+' Cr';
// 		if(Math.abs(v)>=100000)return'₹'+(v/100000).toFixed(2)+' L';
// 		return'₹'+Math.round(v).toLocaleString('en-IN');
// 	}

// 	_fmtFull(n){
// 		if(n===null||n===undefined||n==='')return'—';
// 		const v=parseFloat(n)||0;
// 		return '₹'+v.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
// 	}

// 	_fmtTip(n, label='Full amount'){
// 		if(n===null||n===undefined||n==='')return'<span>—</span>';
// 		const v=parseFloat(n)||0;
// 		const short=this._fmt(v);
// 		const full=this._fmtFull(v);
// 		const abbreviated = short.endsWith(' Cr') || short.endsWith(' L');
// 		if(!abbreviated) return `<span>${short}</span>`;
// 		return `<span class="cbd-tip-wrap" data-tip="${frappe.utils.escape_html(full)}" data-tip-label="${frappe.utils.escape_html(label)}">${short}</span>`;
// 	}
// 	_date(d){if(!d)return'—';return frappe.datetime.str_to_user(d)||d;}
// 	_metric(label,value,rawNum=null){
// 		const display = rawNum!==null ? this._fmtTip(rawNum, label) : value;
// 		return `<div class="cbd-metric"><span class="cbd-metric__label">${label}</span><span class="cbd-metric__value">${display}</span></div>`;
// 	}
// 	_metric_pct(label,pct){const v=parseFloat(pct)||0;const cls=v>=80?'green':v>=50?'amber':'red';return `<div class="cbd-metric cbd-metric--pct"><span class="cbd-metric__label">${label}</span><span class="cbd-metric__value cbd-metric__pct cbd-metric__pct--${cls}">${v.toFixed(1)}%</span></div>`;}
// 	_util_vs_disb_pct(partner){const d=parseFloat(partner.total_disbursement)||0;const u=parseFloat(partner.total_utilisation)||0;return d>0?((u/d)*100):0;}
// 	_icon_partner(){return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0"><rect x="3" y="7" width="18" height="14" rx="1"/><path d="M8 21V11h8v10"/><path d="M3 7l9-4 9 4"/></svg>`;}
// 	_fill_cls(v){return v>=80?'green':v>=50?'amber':'red';}
// 	_chip_cls(v){return v>=80?'green':v>=50?'amber':'red';}
// 	_badge_cls(v){return v>=80?'green':v>=50?'amber':'red';}

// 	// ─────────────────────────────────────────────
// 	// EVENT DELEGATION  (FIX 1: called after every render_partners)
// 	// ─────────────────────────────────────────────

// 	_bind_view_buttons(){
// 		// Remove previous listener to avoid stacking
// 		const el = document.getElementById('cbd_partners');
// 		if (!el) return;
// 		if (el._cbdViewListener) {
// 			el.removeEventListener('click', el._cbdViewListener);
// 		}
// 		const handler = (e) => {
// 			const btn=e.target.closest('.cbd-view-btn');if(btn){e.stopPropagation();this._open_panels(btn.dataset.budgetId,btn.dataset.refName,btn.dataset.grantStart||'',btn.dataset.grantEnd||'');return;}
// 			const rbtn=e.target.closest('.cbd-row-disb-btn');if(rbtn){e.stopPropagation();this._open_disbursement_panel(`${rbtn.dataset.refName||rbtn.dataset.budgetId} — Disbursements`,[rbtn.dataset.budgetId],null);return;}
// 			const cbtn=e.target.closest('.cbd-consolidated-btn');if(cbtn){e.stopPropagation();this._open_consolidated_panels((cbtn.dataset.budgetIds||'').split(',').filter(Boolean),cbtn.dataset.partnerName||'Partner',cbtn.dataset.grantStart||'',cbtn.dataset.grantEnd||'');return;}
// 			const dbtn=e.target.closest('.cbd-disb-btn');if(dbtn){e.stopPropagation();this._open_disbursement_panel(`${dbtn.dataset.partnerName||'Partner'} — Disbursements`,(dbtn.dataset.budgetIds||'').split(',').filter(Boolean),null);return;}
// 		};
// 		el._cbdViewListener = handler;
// 		el.addEventListener('click', handler);
// 	}

// 	// ─────────────────────────────────────────────
// 	// PANELS SCAFFOLD
// 	// ─────────────────────────────────────────────

// 	_ensure_panels(){
// 		if(document.getElementById('cbd_overlay'))return;
// 		const overlay=document.createElement('div');overlay.className='cbd-overlay';overlay.id='cbd_overlay';
// 		const left=document.createElement('div');left.className='cbd-panel-left';left.id='cbd_panel_left';
// 		const right=document.createElement('div');right.className='cbd-panel-right';right.id='cbd_panel_right';
// 		const disb_modal=document.createElement('div');disb_modal.id='cbd_disb_modal';disb_modal.className='cbd-disb-modal';
// 		const disb_overlay=document.createElement('div');disb_overlay.id='cbd_disb_overlay';disb_overlay.className='cbd-disb-overlay';
// 		const centre=document.createElement('button');centre.id='cbd_centre_close';centre.className='cbd-centre-close';centre.title='Close both panels';centre.innerHTML=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span>Close both</span>`;
// 		document.body.appendChild(overlay);document.body.appendChild(left);document.body.appendChild(right);document.body.appendChild(disb_overlay);document.body.appendChild(disb_modal);document.body.appendChild(centre);
// 		disb_overlay.addEventListener('click',()=>this._close_disb_panel());
// 		overlay.addEventListener('click',()=>this._close_all_panels());
// 		centre.addEventListener('click',()=>this._close_panels());
// 		[left,right].forEach(panel=>{panel.addEventListener('change',e=>{const chk=e.target.closest('.cbd-expand-all');if(!chk)return;const expand=chk.checked;const body=panel.querySelector('.cbd-panel__body');if(!body)return;body.querySelectorAll('.cbd-item-group__body').forEach(b=>b.classList.toggle('cbd-item-group__body--collapsed',!expand));body.querySelectorAll('.cbd-igh-chevron').forEach(chv=>{chv.style.transform=expand?'':'rotate(-90deg)';});});});
// 	}

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
// 		.cbd-overview-strip { display:flex; align-items:stretch; flex-wrap:nowrap; background:var(--card-bg,#fff); border:1px solid var(--border-color,#d1d8dd); border-radius:10px; margin-bottom:12px; overflow:hidden; }
// 		.cbd-ostat { display:flex; align-items:center; gap:8px; flex:1; padding:10px 12px; min-width:0; border-right:1px solid var(--border-color,#d1d8dd); position:relative; }
// 		.cbd-ostat--clickable { cursor:pointer; transition:background .12s; }
// 		.cbd-ostat--clickable:hover { background:var(--control-bg,#f0f4f8); }
// 		.cbd-ostat--clickable:hover .cbd-ostat__arrow { opacity:1; }
// 		.cbd-ostat__arrow { position:absolute; right:8px; top:50%; transform:translateY(-50%); color:#378ADD; opacity:0; transition:opacity .15s; flex-shrink:0; }
// 		/* ── Drill centered modal ── */
// 		.cbd-drill-modal-wrap {
// 			position:fixed; inset:0; z-index:3200;
// 			background:rgba(0,0,0,0);
// 			display:flex; align-items:center; justify-content:center;
// 			padding:16px; box-sizing:border-box;
// 			transition:background .2s ease;
// 			pointer-events:none;
// 		}
// 		.cbd-drill-modal-wrap--open {
// 			background:rgba(0,0,0,.45);
// 			pointer-events:all;
// 		}
// 		.cbd-drill-modal {
// 			background:var(--card-bg,#fff);
// 			border-radius:12px;
// 			border:1px solid var(--border-color,#d1d8dd);
// 			box-shadow:0 8px 40px rgba(0,0,0,.18);
// 			display:flex; flex-direction:column;
// 			max-height:80vh; width:100%;
// 			opacity:0; transform:scale(.96) translateY(8px);
// 			transition:opacity .22s ease, transform .22s cubic-bezier(.34,1.56,.64,1);
// 			overflow:hidden;
// 		}
// 		.cbd-drill-modal-wrap--open .cbd-drill-modal {
// 			opacity:1; transform:scale(1) translateY(0);
// 		}
// 		.cbd-drill-modal--wide   { max-width:640px; }
// 		.cbd-drill-modal--narrow { max-width:400px; }
// 		@media (max-width:600px) {
// 			.cbd-drill-modal-wrap { align-items:flex-end; padding:0; }
// 			.cbd-drill-modal { border-radius:16px 16px 0 0; max-width:100vw; max-height:85vh; transform:translateY(20px); }
// 			.cbd-drill-modal-wrap--open .cbd-drill-modal { transform:translateY(0); }
// 		}
// 		.cbd-drill-modal__header {
// 			display:flex; align-items:center; justify-content:space-between;
// 			padding:16px 18px 14px; border-bottom:1px solid var(--border-color,#d1d8dd);
// 			flex-shrink:0;
// 		}
// 		.cbd-drill-modal__header-left { display:flex; align-items:center; gap:12px; min-width:0; }
// 		.cbd-drill-modal__icon {
// 			width:38px; height:38px; flex-shrink:0;
// 			display:flex; align-items:center; justify-content:center;
// 			border-radius:10px; background:#EEF5FC; color:#378ADD;
// 		}
// 		.cbd-drill-modal__title { font-size:15px; font-weight:700; color:var(--text-color,#1c2126); }
// 		.cbd-drill-modal__sub   { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:2px; }
// 		.cbd-drill-modal__close {
// 			width:30px; height:30px; flex-shrink:0;
// 			display:flex; align-items:center; justify-content:center;
// 			border:1px solid var(--border-color,#d1d8dd); border-radius:7px;
// 			background:none; cursor:pointer; color:var(--text-muted,#8d99a6);
// 			transition:background .12s, color .12s, border-color .12s;
// 		}
// 		.cbd-drill-modal__close:hover { background:#FCEBEB; color:#A32D2D; border-color:#F09595; }
// 		.cbd-drill-modal__body {
// 			flex:1; overflow-y:auto; padding:0;
// 		}
// 		.cbd-drill-modal__body::-webkit-scrollbar { width:4px; }
// 		.cbd-drill-modal__body::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }
// 		.cbd-drill-modal__footer {
// 			display:flex; justify-content:flex-end; align-items:center;
// 			padding:10px 18px; border-top:1px solid var(--border-color,#d1d8dd);
// 			flex-shrink:0; background:var(--control-bg,#f9f9f9);
// 		}

// 		/* ── Partner cards layout ── */
// 		.cbd-drill-cards { display:flex; flex-direction:column; gap:0; }
// 		.cbd-drill-card { padding:14px 16px; border-bottom:1px solid var(--border-color,#d1d8dd); transition:background .1s; }
// 		.cbd-drill-card:hover { background:var(--control-bg,#f7f9fc); }
// 		.cbd-drill-card__top { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
// 		.cbd-drill-card__avatar { width:34px; height:34px; flex-shrink:0; border-radius:50%; background:#E6F1FB; color:#0C447C; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; }
// 		.cbd-drill-card__info { flex:1; min-width:0; }
// 		.cbd-drill-card__name { font-size:13px; font-weight:600; color:var(--text-color,#1c2126); }
// 		.cbd-drill-card__meta { font-size:11px; color:var(--text-muted,#8d99a6); display:flex; align-items:center; gap:5px; margin-top:1px; }
// 		.cbd-drill-card__sep { color:var(--border-color,#d1d8dd); }
// 		.cbd-drill-card__bar-track { height:4px; background:var(--border-color,#d1d8dd); border-radius:2px; overflow:hidden; }
// 		.cbd-drill-card__amounts { display:flex; gap:0; border:1px solid var(--border-color,#d1d8dd); border-radius:6px; overflow:hidden; margin-bottom:7px; }
// 		.cbd-drill-card__amt-item { flex:1; padding:5px 8px; border-right:1px solid var(--border-color,#d1d8dd); text-align:center; }
// 		.cbd-drill-card__amt-item:last-child { border-right:none; }
// 		.cbd-drill-card__amt-label { display:block; font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:.4px; color:var(--text-muted,#8d99a6); margin-bottom:2px; }
// 		.cbd-drill-card__amt-val { display:block; font-size:12px; font-weight:600; color:var(--text-color,#1c2126); }
// 		.cbd-drill-card__bar-fill { height:100%; border-radius:2px; transition:width .4s ease; }
// 		.cbd-drill-card__bar-fill--green { background:#639922; }
// 		.cbd-drill-card__bar-fill--amber { background:#BA7517; }
// 		.cbd-drill-card__bar-fill--red   { background:#E24B4A; }

// 		/* ── Budget list layout ── */
// 		.cbd-drill-blist { display:flex; flex-direction:column; }
// 		.cbd-drill-brow { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid var(--border-color,#d1d8dd); gap:10px; transition:background .1s; }
// 		.cbd-drill-brow:hover { background:var(--control-bg,#f7f9fc); }
// 		.cbd-drill-brow__left { display:flex; align-items:flex-start; gap:10px; min-width:0; flex:1; }
// 		.cbd-drill-brow__seq { width:22px; height:22px; flex-shrink:0; border-radius:50%; background:var(--control-bg,#f0f4f8); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:var(--text-muted,#8d99a6); margin-top:2px; }
// 		.cbd-drill-brow__detail { flex:1; min-width:0; }
// 		.cbd-drill-brow__ref { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:4px; }
// 		.cbd-drill-brow__creche-badge { display:inline-flex; align-items:center; padding:1px 7px; background:#E6F1FB; color:#0C447C; border-radius:10px; font-size:10px; font-weight:600; }
// 		.cbd-drill-brow__meta { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--text-muted,#8d99a6); flex-wrap:wrap; }
// 		.cbd-drill-brow__meta svg { color:var(--text-muted,#8d99a6); flex-shrink:0; }
// 		.cbd-drill-brow__sep { color:var(--border-color,#d1d8dd); margin:0 2px; }
// 		.cbd-drill-brow__fy { flex-shrink:0; font-size:11px; font-weight:600; color:var(--text-muted,#8d99a6); background:var(--control-bg,#f0f4f8); padding:2px 8px; border-radius:10px; white-space:nowrap; }

// 		/* ── Location list layout ── */
// 		.cbd-drill-list { padding:4px 0; }
// 		.cbd-drill-list__row { display:flex; align-items:center; gap:12px; padding:10px 16px; border-bottom:1px solid var(--border-color,#d1d8dd); transition:background .1s; }
// 		.cbd-drill-list__row:last-child { border-bottom:none; }
// 		.cbd-drill-list__row:hover { background:var(--control-bg,#f7f9fc); }
// 		.cbd-drill-list__num { width:24px; height:24px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:#E6F1FB; font-size:10px; font-weight:700; color:#0C447C; flex-shrink:0; }
// 		.cbd-drill-list__dot { width:6px; height:6px; border-radius:50%; background:#378ADD; flex-shrink:0; }
// 		.cbd-drill-list__body { flex:1; min-width:0; }
// 		.cbd-drill-list__text { font-size:13px; font-weight:500; color:var(--text-color,#1c2126); }
// 		.cbd-drill-list__detail { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:2px; }

// 		.cbd-drill-empty { padding:40px 20px; text-align:center; font-size:13px; color:var(--text-muted,#8d99a6); }
// 		.cbd-ostat:last-child { border-right:none; }
// 		.cbd-ostat__icon { width:32px; height:32px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border-radius:8px; background:var(--control-bg,#f0f4f8); color:#378ADD; }
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
// 		.cbd-metric__label { font-size:12px; font-weight:600; color:var(--text-muted,#8d99a6); }
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
// 		.cbd-icon-btn { display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; padding:0 !important; border-radius:6px; cursor:pointer; transition:background .15s, box-shadow .15s; flex-shrink:0; border-width:1px; border-style:solid; }
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
// 		   LINE ITEM TABLES
// 		   ═══════════════════════════════════════════════════════════ */
// 		.cbd-li-scroll-wrap { overflow-x:auto; }
// 		.cbd-li-sticky { position:sticky; z-index:2; background:var(--card-bg,#fff); }
// 		thead .cbd-li-sticky { background:var(--control-bg,#f7f7f7); z-index:3; }
// 		.cbd-li-sticky--1 { left:0; min-width:140px; max-width:200px; }
// 		.cbd-li-sticky--2 { left:140px; min-width:90px; max-width:130px; border-right:2px solid var(--border-color,#d1d8dd) !important; }
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
// 		.cbd-panel-left, .cbd-panel-right { position:fixed; top:0; bottom:0; width:49vw; max-width:720px; min-width:340px; background:var(--card-bg,#fff); z-index:2001; display:flex; flex-direction:column; transition:transform .28s cubic-bezier(.4,0,.2,1); overflow:hidden; }
// 		.cbd-panel-left  { left:0;  transform:translateX(-100%); border-right:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-panel-right { right:0; transform:translateX(100%);  border-left:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-panel-left.cbd-panel--open  { transform:translateX(0); }
// 		.cbd-panel-right.cbd-panel--open { transform:translateX(0); }
// 		.cbd-panel-left.cbd-panel--full, .cbd-panel-right.cbd-panel--full { width:60vw; max-width:860px; }
// 		.cbd-panel__header { display:flex; align-items:center; padding:0 14px; height:50px; border-bottom:1px solid var(--border-color,#d1d8dd); flex-shrink:0; gap:8px; }
// 		.cbd-panel__header > div:first-child { flex:1; min-width:0; }
// 		.cbd-panel__title { font-size:13px; font-weight:700; color:var(--text-color,#1c2126); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
// 		.cbd-panel__sub   { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
// 		.cbd-panel__close { display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; background:none; border:1px solid var(--border-color,#d1d8dd); border-radius:5px; font-size:13px; cursor:pointer; color:var(--text-muted,#8d99a6); line-height:1; flex-shrink:0; transition:background .12s, color .12s, border-color .12s; }
// 		.cbd-panel__close:hover { background:#FCEBEB; color:#A32D2D; border-color:#F09595; }
// 		.cbd-panel__header-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
// 		.cbd-expand-all-label { display:inline-flex; align-items:center; gap:5px; height:26px; padding:0 9px; font-size:11px; font-weight:500; color:var(--text-muted,#8d99a6); cursor:pointer; user-select:none; white-space:nowrap; border:1px solid var(--border-color,#d1d8dd); border-radius:5px; background:var(--control-bg,#f7f7f7); transition:background .12s, color .12s, border-color .12s; line-height:1; margin-top:9px; }
// 		.cbd-expand-all-label:hover { background:#E6F1FB; border-color:#B5D4F4; color:#185FA5; }
// 		.cbd-expand-chk { width:13px; height:13px; cursor:pointer; accent-color:#378ADD; margin:0; flex-shrink:0; vertical-align:middle; }
// 		.cbd-panel__filter { padding:10px 18px; border-bottom:1px solid var(--border-color,#d1d8dd); flex-shrink:0; }
// 		.cbd-filter-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text-muted,#8d99a6); margin-bottom:7px; }
// 		.cbd-filter-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
// 		.cbd-panel__body { flex:1; overflow-y:auto; padding:14px 18px; }
// 		.cbd-panel__body::-webkit-scrollbar { width:4px; }
// 		.cbd-panel__body::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }
// 		.cbd-panel-loading, .cbd-panel-empty { text-align:center; color:var(--text-muted,#8d99a6); font-size:13px; padding:30px 0; }
// 		.cbd-panel__sticky-total { display:flex; justify-content:space-between; align-items:center; padding:10px 18px; background:#E6F1FB; border-top:1px solid #B5D4F4; font-size:13px; font-weight:700; color:#0C447C; flex-shrink:0; }
// 		.cbd-item-group { margin-bottom:10px; border:1px solid var(--border-color,#d1d8dd); border-radius:7px; overflow:hidden; }
// 		.cbd-item-group__head { display:flex; justify-content:space-between; align-items:center; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:#0C447C; background:#E6F1FB; padding:6px 10px; }
// 		.cbd-item-group__total { font-size:12px; color:#0C447C; font-weight:700; }
// 		.cbd-item-group__head--toggle { cursor:pointer; user-select:none; }
// 		.cbd-item-group__head--toggle:hover { filter:brightness(.96); }
// 		.cbd-igh-left { display:flex; align-items:center; gap:6px; }
// 		.cbd-igh-chevron { font-size:9px; color:#0C447C; transition:transform .18s ease; display:inline-block; }
// 		.cbd-item-group__body { overflow:hidden; transition:max-height .22s ease; max-height:2000px; }
// 		.cbd-item-group__body--collapsed { max-height:0 !important; }
// 		.cbd-ytd-bar { display:flex; align-items:center; flex-wrap:wrap; gap:6px; padding:7px 10px; background:#EEEDFE; border-radius:6px; margin-bottom:10px; font-size:11px; color:#3C3489; }
// 		.cbd-ytd-badge { display:inline-flex; align-items:center; padding:2px 7px; background:#534AB7; color:#fff; border-radius:4px; font-size:10px; font-weight:700; letter-spacing:.5px; flex-shrink:0; }
// 		.cbd-ytd-label { color:#3C3489; }
// 		.cbd-ytd-label b { color:#26215C; }
// 		.cbd-ytd-month { display:inline-flex; padding:1px 6px; background:#CECBF6; color:#26215C; border-radius:3px; font-size:10px; font-weight:600; margin-left:2px; }
// 		.cbd-centre-close { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:2005; display:none; align-items:center; gap:6px; padding:10px 18px; background:#1c2126; color:#fff; border:none; border-radius:24px; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 4px 20px rgba(0,0,0,.4); }
// 		.cbd-centre-close:hover { background:#A32D2D; }
// 		.cbd-centre-close--visible { display:flex; }
// 		@media (max-width:768px) { .cbd-centre-close { display:none !important; } }
// 		.cbd-panel__consolidated-badge { display:inline-flex; align-items:center; padding:1px 7px; background:#534AB7; color:#fff; border-radius:4px; font-size:10px; font-weight:700; letter-spacing:.4px; margin-right:5px; vertical-align:middle; }
// 		.cbd-panel__disb-badge { display:inline-flex; align-items:center; padding:2px 9px; background:#0d5c48; color:#fff; border-radius:5px; font-size:10px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; }
// 		#cbd_month_multiselect .form-group, #cbd_fy_multiselect .form-group { margin-bottom:0; }
// 		#cbd_month_multiselect .control-label, #cbd_fy_multiselect .control-label { display:none; }

// 		/* ═══════════════════════════════════════════════════════════
// 		   DISBURSEMENT PANEL
// 		   ═══════════════════════════════════════════════════════════ */
// 		.cbd-disb-overlay { visibility:hidden; opacity:0; position:fixed; inset:0; background:rgba(0,0,0,.32); z-index:3000; transition:opacity .2s ease, visibility .2s ease; }
// 		.cbd-disb-overlay--active { visibility:visible; opacity:1; }
// 		.cbd-disb-modal { position:fixed; top:0; bottom:0; right:0; width:50vw; max-width:760px; min-width:360px; background:var(--card-bg,#fff); z-index:3001; display:flex; flex-direction:column; overflow:hidden; border-left:1px solid var(--border-color,#d1d8dd); transform:translateX(100%); transition:transform .28s cubic-bezier(.4,0,.2,1); }
// 		.cbd-disb-modal--open { transform:translateX(0); }
// 		.cbd-dt-wrap { overflow-x:auto; }
// 		.cbd-dt { width:100%; border-collapse:collapse; font-size:12px; white-space:nowrap; }
// 		.cbd-dt thead { position:sticky; top:0; z-index:2; }
// 		.cbd-dt__head-row th { padding:9px 12px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-muted,#8d99a6); background:var(--control-bg,#f7f7f7); border-bottom:1px solid var(--border-color,#d1d8dd); border-right:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-dt__b-row { cursor:pointer; transition:background .1s; }
// 		.cbd-dt__b-row:hover td { background:var(--control-bg,#f7f7f7); }
// 		.cbd-dt__b-row td { padding:8px 12px; border-bottom:1px solid var(--border-color,#d1d8dd); border-right:1px solid var(--border-color,#d1d8dd); vertical-align:middle; color:var(--text-color,#1c2126); }
// 		.cbd-dt__ref-cell { display:flex; align-items:center; gap:7px; font-weight:600; }
// 		.cbd-dt__chevron { display:inline-block; font-size:9px; color:var(--text-muted,#8d99a6); transition:transform .16s ease; flex-shrink:0; }
// 		.cbd-dt__disb-val { font-weight:700; color:#0C447C; }
// 		.cbd-dt__tag { display:inline-flex; align-items:center; font-size:11px; font-weight:600; border-radius:4px; padding:2px 7px; }
// 		.cbd-dt__tag--teal { background:#E1F5EE; color:#185FA5; }
// 		.cbd-dt__pct { display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:600; border-radius:4px; padding:2px 7px; }
// 		.cbd-dt__pct--green { background:#EAF3DE; color:#3B6D11; }
// 		.cbd-dt__pct--amber { background:#FAEEDA; color:#854F0B; }
// 		.cbd-dt__pct--red   { background:#FCEBEB; color:#A32D2D; }
// 		.cbd-dt__partner-count { font-size:10px; color:#0C447C; background:rgba(55,138,221,.12); border-radius:10px; padding:0 7px; font-weight:600; }
// 		.cbd-dt__detail-row--collapsed { display:none; }
// 		.cbd-dt__detail-row td { padding:0; }
// 		.cbd-dt__detail-cell { background:#f7f9fc; border-bottom:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-dt__trk-item { display:flex; align-items:center; gap:10px; padding:8px 16px 8px 20px; border-bottom:1px solid var(--border-color,#d1d8dd); position:relative; }
// 		.cbd-dt__trk-item--last { border-bottom:none; }
// 		.cbd-dt__trk-item:hover { background:var(--control-bg,#f7f7f7); }
// 		.cbd-dt__trk-dot { width:8px; height:8px; flex-shrink:0; border-radius:50%; border:2px solid var(--border-color,#d1d8dd); background:var(--card-bg,#fff); position:relative; z-index:1; }
// 		.cbd-dt__trk-dot--first { border-color:#378ADD; background:#378ADD; }
// 		.cbd-dt__trk-item:not(.cbd-dt__trk-item--last)::after { content:''; position:absolute; left:23px; top:22px; width:1px; bottom:-1px; background:var(--border-color,#d1d8dd); }
// 		.cbd-dt__trk-date { font-size:12px; color:var(--text-color,#1c2126); flex:1; }
// 		.cbd-dt__trk-amt  { font-size:13px; font-weight:700; color:#185FA5; flex-shrink:0; }
// 		.cbd-dt__trk-empty { padding:12px 16px; font-size:12px; color:var(--text-muted,#8d99a6); text-align:center; }
// 		.cbd-dt__subtotal-row { display:flex; justify-content:space-between; align-items:center; padding:7px 14px; background:var(--control-bg,#f7f7f7); border-top:1px solid var(--border-color,#d1d8dd); font-size:11px; }
// 		.cbd-dt__subtotal-label { color:var(--text-muted,#8d99a6); font-weight:500; }

// 		.cbd-empty { padding:24px; text-align:center; color:var(--text-muted,#8d99a6); font-size:13px; }
// 		body.cbd-panels-open .navbar, body.cbd-panels-open .container-fluid.page-container > .row > .col:first-child { z-index:1 !important; }

// 		/* ═══════════════════════════════════════════════════════════
// 		   SUMMARY MODAL  (full-screen partner breakdown)
// 		   ═══════════════════════════════════════════════════════════ */
// 		.cbd-sm-wrap {
// 			position:fixed; inset:0; z-index:3100;
// 			background:rgba(0,0,0,0);
// 			display:flex; align-items:stretch; justify-content:center;
// 			padding:0; box-sizing:border-box;
// 			transition:background .2s ease;
// 			pointer-events:none;
// 		}
// 		.cbd-sm-wrap--open {
// 			background:rgba(0,0,0,.5);
// 			pointer-events:all;
// 		}
// 		.cbd-sm-modal {
// 			background:var(--card-bg,#fff);
// 			width:100%; max-width:1200px;
// 			margin:24px auto;
// 			border-radius:12px;
// 			border:1px solid var(--border-color,#d1d8dd);
// 			box-shadow:0 24px 80px rgba(0,0,0,.22);
// 			display:flex; flex-direction:column;
// 			max-height:calc(100vh - 48px);
// 			opacity:0; transform:translateY(24px) scale(.98);
// 			transition:opacity .22s ease, transform .24s cubic-bezier(.34,1.3,.64,1);
// 			overflow:hidden;
// 		}
// 		.cbd-sm-wrap--open .cbd-sm-modal {
// 			opacity:1; transform:translateY(0) scale(1);
// 		}
// 		.cbd-sm-modal__header {
// 			display:flex; align-items:center; justify-content:space-between;
// 			padding:18px 24px 16px;
// 			border-bottom:1px solid var(--border-color,#d1d8dd);
// 			flex-shrink:0;
// 		}
// 		.cbd-sm-modal__title {
// 			font-size:16px; font-weight:700; color:var(--text-color,#1c2126);
// 		}
// 		.cbd-sm-modal__sub {
// 			font-size:12px; color:var(--text-muted,#8d99a6); margin-top:3px;
// 		}
// 		.cbd-sm-modal__close {
// 			width:32px; height:32px; flex-shrink:0;
// 			display:flex; align-items:center; justify-content:center;
// 			border:1px solid var(--border-color,#d1d8dd); border-radius:7px;
// 			background:none; cursor:pointer; color:var(--text-muted,#8d99a6);
// 			transition:background .12s, color .12s, border-color .12s;
// 		}
// 		.cbd-sm-modal__close:hover { background:#FCEBEB; color:#A32D2D; border-color:#F09595; }
// 		.cbd-sm-modal__body {
// 			flex:1; overflow-y:auto; padding:0;
// 		}
// 		.cbd-sm-modal__body::-webkit-scrollbar { width:5px; }
// 		.cbd-sm-modal__body::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:3px; }

// 		/* Summary table */
// 		.cbd-sm-table {
// 			width:100%; border-collapse:collapse; font-size:13px;
// 		}
// 		.cbd-sm-table thead th {
// 			padding:10px 16px;
// 			text-align:left; font-size:10px; font-weight:700;
// 			text-transform:uppercase; letter-spacing:.5px;
// 			color:var(--text-muted,#8d99a6);
// 			background:var(--control-bg,#f7f7f7);
// 			border-bottom:2px solid var(--border-color,#d1d8dd);
// 			position:sticky; top:0; z-index:2;
// 		}
// 		.cbd-sm__row {
// 			cursor:pointer;
// 			transition:background .1s;
// 			border-bottom:1px solid var(--border-color,#d1d8dd);
// 		}
// 		.cbd-sm__row:hover { background:var(--control-bg,#f7f9fc); }
// 		.cbd-sm__row--active { background:#EEF5FC; }
// 		.cbd-sm__row--active:hover { background:#E6F1FB; }
// 		.cbd-sm__row td { padding:12px 16px; vertical-align:middle; }
// 		.cbd-sm__partner-name { font-size:13px; font-weight:600; color:var(--text-color,#1c2126); }
// 		.cbd-sm__partner-meta { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:2px; }
// 		.cbd-sm__td-amt { text-align:right; white-space:nowrap; }
// 		.cbd-sm__amt-main { font-size:13px; font-weight:600; color:var(--text-color,#1c2126); }
// 		.cbd-sm__bar-track {
// 			height:3px; background:var(--border-color,#d1d8dd);
// 			border-radius:2px; overflow:hidden; margin-top:5px; min-width:80px;
// 		}
// 		.cbd-sm__bar-fill { height:100%; border-radius:2px; transition:width .4s ease; }
// 		.cbd-sm__bar-fill--green { background:#639922; }
// 		.cbd-sm__bar-fill--amber { background:#BA7517; }
// 		.cbd-sm__bar-fill--red   { background:#E24B4A; }
// 		.cbd-sm__td-pct { text-align:center; }
// 		.cbd-sm__td-actions { text-align:center; white-space:nowrap; }
// 		.cbd-sm__btn-view {
// 			color:#185FA5; background:#E6F1FB; border-color:#B5D4F4;
// 		}
// 		.cbd-sm__btn-view:hover { background:#B5D4F4; }
// 		.cbd-sm__btn-disb {
// 			color:#0F6E56; background:#E1F5EE; border-color:#7ECFB8;
// 			margin-left:4px;
// 		}
// 		.cbd-sm__btn-disb:hover { background:#B8EAD8; }
// 		/* Expanded sub-table row */
// 		.cbd-sm__sub-row { background:var(--control-bg,#f7f9fc); }
// 		.cbd-sm__sub-td { padding:0 0 0 32px; border-bottom:2px solid var(--border-color,#d1d8dd); }
// 		.cbd-sm__sub-td .cbd-tbl-wrap { border-radius:0; border-left:3px solid #378ADD; }
// 		/* Grand total footer */
// 		.cbd-sm__foot-row td {
// 			padding:12px 16px;
// 			background:var(--control-bg,#f7f7f7);
// 			border-top:2px solid var(--border-color,#d1d8dd);
// 			font-size:13px;
// 		}
// 		.cbd-sm__foot-row .cbd-sm__td-amt { text-align:right; }
// 		@media (max-width:768px) {
// 			.cbd-sm-modal { margin:0; border-radius:16px 16px 0 0; max-height:92vh; }
// 			.cbd-sm-wrap { align-items:flex-end; }
// 			.cbd-sm-wrap--open .cbd-sm-modal { transform:translateY(0); }
// 		}

// 		/* ── Summary modal — table layout ── */
// 		.cbd-sm-tbl-wrap  { overflow-x:auto; }
// 		.cbd-sm-table     { width:100%; border-collapse:collapse; font-size:12px; white-space:nowrap; }
// 		.cbd-sm-table thead th {
// 			padding:9px 12px; text-align:left;
// 			font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px;
// 			color:var(--text-muted,#8d99a6);
// 			background:var(--control-bg,#f7f7f7);
// 			border-bottom:2px solid var(--border-color,#d1d8dd);
// 			position:sticky; top:0; z-index:2;
// 		}
// 		.cbd-sm__summary-row {
// 			cursor:pointer; border-bottom:1px solid var(--border-color,#d1d8dd);
// 			transition:background .1s;
// 		}
// 		.cbd-sm__summary-row:hover { background:var(--control-bg,#f7f9fc); }
// 		.cbd-sm__summary-row--open { background:#EEF5FC; }
// 		.cbd-sm__summary-row--open:hover { background:#E6F1FB; }
// 		.cbd-sm__summary-row td { padding:10px 12px; vertical-align:middle; }
// 		.cbd-sm__td-expand {
// 			text-align:center; width:28px; padding:10px 8px !important;
// 			color:var(--text-muted,#8d99a6);
// 		}
// 		.cbd-sm__expand-icon {
// 			font-size:9px; display:inline-block;
// 			transition:transform .18s ease, color .18s ease;
// 		}
// 		.cbd-sm__td-name { min-width:200px; }
// 		.cbd-sm__partner-name { font-size:12px; font-weight:600; color:var(--text-color,#1c2126); }
// 		.cbd-sm__partner-meta { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:2px; }
// 		.cbd-sm__td-r   { text-align:right !important; }
// 		.cbd-sm__td-pct { text-align:center !important; }
// 		.cbd-sm__td-actions { text-align:center !important; white-space:nowrap; }
// 		/* Expand row */
// 		.cbd-sm__expand-row td { padding:0 !important; }
// 		.cbd-sm__expand-td {
// 			border-bottom:2px solid var(--border-color,#d1d8dd);
// 			border-left:3px solid #378ADD;
// 		}
// 		.cbd-sm__expand-td .cbd-tbl-wrap { border-radius:0; }
// 		/* Grand total row */
// 		.cbd-sm__grand-row td {
// 			padding:10px 12px;
// 			background:var(--control-bg,#f7f7f7);
// 			border-top:2px solid var(--border-color,#d1d8dd);
// 			font-size:12px;
// 		}
// 		.cbd-sm__btn-view { color:#3C3489; background:#EEEDFE; border-color:#AFA9EC; }
// 		.cbd-sm__btn-view:hover { background:#CECBF6; }
// 		.cbd-sm__btn-disb { color:#0F6E56; background:#E1F5EE; border-color:#7ECFB8; margin-left:4px; }
// 		.cbd-sm__btn-disb:hover { background:#B8EAD8; }

// 		/* ── Tooltip ── */
// 		.cbd-tip-wrap {
// 			position:relative; display:inline-flex; align-items:center; gap:2px;
// 			border-bottom:1.5px dashed rgba(55,138,221,.45);
// 			padding-bottom:1px;
// 			transition:border-color .15s;
// 		}
// 		.cbd-tip-wrap:hover { border-bottom-color:rgba(55,138,221,.9); }
// 		#cbd-global-tip {
// 			position:fixed; z-index:9999; pointer-events:none;
// 			background:#1A1D23;
// 			border:1px solid rgba(255,255,255,.10);
// 			color:#fff;
// 			border-radius:10px;
// 			font-family:inherit;
// 			box-shadow:0 12px 32px rgba(0,0,0,.30), 0 2px 8px rgba(0,0,0,.20);
// 			opacity:0; transform:translateY(8px) scale(.96);
// 			transition:opacity .16s ease, transform .2s cubic-bezier(.22,1,.36,1);
// 			min-width:150px; max-width:260px;
// 			overflow:hidden; padding:0;
// 		}
// 		#cbd-global-tip .cbd-tip__header {
// 			padding:7px 12px 5px;
// 			border-bottom:1px solid rgba(255,255,255,.08);
// 			display:flex; align-items:center; gap:6px;
// 		}
// 		#cbd-global-tip .cbd-tip__icon {
// 			width:16px; height:16px; border-radius:4px;
// 			background:rgba(55,138,221,.25);
// 			display:flex; align-items:center; justify-content:center; flex-shrink:0;
// 		}
// 		#cbd-global-tip .cbd-tip__label {
// 			font-size:10px; font-weight:600;
// 			text-transform:uppercase; letter-spacing:.7px;
// 			color:rgba(255,255,255,.50);
// 		}
// 		#cbd-global-tip .cbd-tip__body { padding:6px 12px 10px; }
// 		#cbd-global-tip .cbd-tip__amount {
// 			font-size:16px; font-weight:700; letter-spacing:.3px;
// 			color:#fff; display:block;
// 		}
// 		#cbd-global-tip .cbd-tip__hint {
// 			font-size:10px; color:rgba(255,255,255,.35);
// 			margin-top:2px; display:block;
// 		}
// 		#cbd-global-tip::after {
// 			content:''; position:absolute;
// 			left:50%; transform:translateX(-50%);
// 			bottom:-6px;
// 			border:6px solid transparent;
// 			border-bottom:none; border-top-color:#1A1D23;
// 		}
// 		#cbd-global-tip.cbd-tip--visible { opacity:1; transform:translateY(0) scale(1); }
// 		#cbd-global-tip.cbd-tip--below::after {
// 			bottom:auto; top:-6px;
// 			border-top:none; border-bottom:6px solid #1A1D23;
// 		}

// 		/* ── Responsive ── */
// 		@media (max-width:1024px) {
// 			.cbd-filter-col { flex:1 1 33.33%; min-width:140px; }
// 			.cbd-summary-cards { grid-template-columns:1fr 1fr; gap:8px; }
// 			.cbd-overview-strip { flex-wrap:wrap; }
// 			.cbd-ostat { flex:1 1 33%; border-bottom:1px solid var(--border-color,#d1d8dd); }
// 			.cbd-panel-left, .cbd-panel-right { width:62vw; }
// 			.cbd-disb-modal { width:68vw; }

// 			.cbd-scard__value { font-size:18px; }
// 			.cbd-partner__footer { flex-wrap:wrap; }
// 		}
// 		@media (max-width:768px) {
// 			.cbd-root { padding:8px 10px 30px; }
// 			.cbd-filter-col { flex:1 1 50%; min-width:130px; }
// 			.cbd-summary-cards { grid-template-columns:1fr; gap:8px; }
// 			.cbd-overview-strip { flex-wrap:wrap; }
// 			.cbd-ostat { flex:1 1 50%; }
// 			.cbd-partner__head { flex-direction:column; gap:8px; }
// 			.cbd-partner__right { flex-direction:row; align-items:center; justify-content:space-between; flex-wrap:wrap; width:100%; }
// 			.cbd-partner__metrics { gap:4px; }
// 			.cbd-metric { min-width:60px; padding:2px 6px; }
// 			.cbd-metric__value { font-size:11px; }
// 			.cbd-partner__footer { flex-direction:column; }
// 			.cbd-footer-block + .cbd-footer-block { border-left:none; border-top:1px solid var(--border-color,#d1d8dd); }
// 			.cbd-partner__grants { padding-left:0; }
// 			.cbd-panel-left, .cbd-panel-right { width:100vw; max-width:100vw; border-radius:0; }
// 			.cbd-panel-left.cbd-panel--full, .cbd-panel-right.cbd-panel--full { width:100vw; }
// 			.cbd-disb-modal { width:100vw; max-width:100vw; border-radius:0; }

// 			.cbd-table { font-size:11px; }
// 			.cbd-table th, .cbd-table td { padding:6px 8px; }
// 			#cbd_partners { max-height:none; overflow-y:visible; }
// 			.cbd-centre-close { display:none !important; }
// 		}
// 		@media (max-width:480px) {
// 			.cbd-root { padding:6px 8px 24px; }
// 			.cbd-filter-col { flex:1 1 100%; min-width:0; }
// 			.cbd-summary-cards { grid-template-columns:1fr; gap:6px; }
// 			.cbd-overview-strip { display:grid; grid-template-columns:1fr 1fr; }
// 			.cbd-ostat { border-right:1px solid var(--border-color,#d1d8dd); border-bottom:1px solid var(--border-color,#d1d8dd); }
// 			.cbd-ostat__value { font-size:14px; }
// 			.cbd-partner__metrics { display:grid; grid-template-columns:repeat(2,1fr); gap:4px; }
// 			.cbd-metric { min-width:0; }
// 			.cbd-metric__label { font-size:10px; }
// 			.cbd-scard { padding:10px 12px; }
// 			.cbd-scard__value { font-size:16px; }
// 			.cbd-panel__header-actions .cbd-expand-all-label { display:none; }
// 			.cbd-panel__title { font-size:12px; }
// 		}
// 		@media (max-width:360px) {
// 			.cbd-filter-col { padding:3px 4px 0; }
// 			.cbd-scard__value { font-size:14px; }
// 		}
// 		`;
// 		document.head.appendChild(style);

// 		// ── Global tooltip singleton ──────────────────────────────────────
// 		if (!document.getElementById('cbd-global-tip')) {
// 			const tip = document.createElement('div');
// 			tip.id = 'cbd-global-tip';
// 			document.body.appendChild(tip);

// 			let _hide_timer = null;
// 			const _show = (el) => {
// 				const text  = el.dataset.tip;
// 				if (!text) return;
// 				clearTimeout(_hide_timer);
// 				const lbl   = el.dataset.tipLabel || 'Full amount';
// 				const short = el.textContent.trim();
// 				const icon_svg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(55,138,221,.9)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';
// 				tip.innerHTML =
// 					'<div class="cbd-tip__header">' +
// 						'<span class="cbd-tip__icon">' + icon_svg + '</span>' +
// 						'<span class="cbd-tip__label">' + frappe.utils.escape_html(lbl) + '</span>' +
// 					'</div>' +
// 					'<div class="cbd-tip__body">' +
// 						'<span class="cbd-tip__amount">' + frappe.utils.escape_html(text) + '</span>' +
// 						'<span class="cbd-tip__hint">Abbreviated as ' + frappe.utils.escape_html(short) + '</span>' +
// 					'</div>';
// 				tip.classList.add('cbd-tip--visible');
// 				const r = el.getBoundingClientRect();
// 				const tw = tip.offsetWidth || 200;
// 				const th = tip.offsetHeight || 60;
// 				tip.classList.remove('cbd-tip--visible');
// 				let left = r.left + r.width / 2 - tw / 2;
// 				left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
// 				const spaceAbove = r.top;
// 				const above = spaceAbove > th + 10;
// 				tip.classList.toggle('cbd-tip--below', !above);
// 				const top = above
// 					? r.top + window.scrollY - th - 10
// 					: r.bottom + window.scrollY + 8;
// 				tip.style.left = left + 'px';
// 				tip.style.top  = top  + 'px';
// 				tip.classList.add('cbd-tip--visible');
// 			};
// 			const _hide = () => {
// 				_hide_timer = setTimeout(() => tip.classList.remove('cbd-tip--visible'), 120);
// 			};
// 			document.addEventListener('mouseover', (e) => {
// 				const el = e.target.closest('.cbd-tip-wrap');
// 				if (el && el.dataset.tip) _show(el);
// 			});
// 			document.addEventListener('mouseout', (e) => {
// 				const el = e.target.closest('.cbd-tip-wrap');
// 				if (el) _hide();
// 			});
// 			document.addEventListener('scroll', () => tip.classList.remove('cbd-tip--visible'), true);
// 		}
// 	}
// }




























// frappe.pages['creche-dashboard'].on_page_load = function(wrapper) {
// 	const page = frappe.ui.make_app_page({
// 		parent: wrapper,
// 		title: 'Creche Dashboard',
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

// 	make() {
// 		this.page.main.html(`
// 			<div class="cbd-root">
// 				<div id="cbd_overview_hd" class="cbd-section-hd" style="display:none">
// 					<span class="cbd-section-hd__label">Operational Overview</span>
// 					<span class="cbd-section-hd__line"></span>
// 				</div>
// 				<div class="cbd-overview-strip" id="cbd_overview_strip" style="display:none"></div>
// 				<div id="cbd_summary_hd" class="cbd-section-hd" style="display:none">
// 					<span class="cbd-section-hd__label">Financial Overview</span>
// 					<span class="cbd-section-hd__line"></span>
// 				</div>
// 				<div class="cbd-summary-cards" id="cbd_summary_cards"></div>
// 			</div>
// 		`);

// 		this.page.set_secondary_action('Clear all', () => this._clear_filters(), 'close');
// 		this.page.set_primary_action('Apply', () => this.load_data(this._get_effective_filters()), 'filter');

// 		this._inject_styles();
// 		this._ensure_panels();
// 		this._build_filters();
// 	}

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

// 	_build_filters() {
// 		const $root = $(this.page.main).find('.cbd-root');
// 		const $row1 = $(`<div class="frappe-control-group row custom-filter-row" id="cbd_frow1"></div>`).prependTo($root);
// 		const $row2 = $(`<div class="frappe-control-group row custom-filter-row" id="cbd_frow2"></div>`).insertAfter($row1);
// 		this._fields = {};
// 		this._sel    = {};

// 		const col = ($row, key) => $(`<div class="cbd-filter-col col-sm-12" id="cbd_fcol_${key}"></div>`).appendTo($row);

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
// 				},
// 			},
// 			render_input: true,
// 		});
// 		partner_ctrl.refresh();
// 		this._fields.partner_id = partner_ctrl;

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

// 		const fy_ctrl = frappe.ui.form.make_control({
// 			parent: col($row1, 'financial_year'),
// 			df: {
// 				label: 'Financial Year', fieldtype: 'MultiSelectList', fieldname: 'financial_year',
// 				get_data: (txt) => frappe.db.get_list('Financial year', {
// 					fields: ['name'], limit: 50, order_by: 'name desc',
// 					...(txt ? { filters: { name: ['like', `%${txt}%`] } } : {}),
// 				}).then(rows => rows.map(r => ({ value: r.name, description: '' }))),
// 				change: () => {
// 					this._sel.financial_year = fy_ctrl.get_value() || [];
// 					this._on_filter_change('financial_year');
// 				},
// 			},
// 			render_input: true,
// 		});
// 		fy_ctrl.refresh();
// 		this._fields.financial_year = fy_ctrl;

// 		const month_ctrl = frappe.ui.form.make_control({
// 			parent: col($row1, 'month'),
// 			df: {
// 				label: 'Month', fieldtype: 'MultiSelectList', fieldname: 'month',
// 				get_data: (txt) => {
// 					const ORDER = ['April','May','June','July','August','September',
// 					               'October','November','December','January','February','March'];
// 					return frappe.db.get_list('Months', { fields: ['name'], limit: 12 })
// 						.then(rows => rows.filter(r => !txt || r.name.toLowerCase().includes(txt.toLowerCase()))
// 							.sort((a,b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name))
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

// 		const start_ctrl = frappe.ui.form.make_control({
// 			parent: col($row2, 'start_date'),
// 			df: {
// 				label: 'Start Date', fieldtype: 'Date', fieldname: 'start_date',
// 				change: () => {
// 					this._sel.start_date = start_ctrl.get_value() || '';
// 					this._on_filter_change('start_date');
// 					this._validate_dates('start_date');
// 				},
// 			},
// 			render_input: true,
// 		});
// 		start_ctrl.refresh();
// 		this._fields.start_date = start_ctrl;

// 		const end_ctrl = frappe.ui.form.make_control({
// 			parent: col($row2, 'end_date'),
// 			df: {
// 				label: 'End Date', fieldtype: 'Date', fieldname: 'end_date',
// 				change: () => {
// 					this._sel.end_date = end_ctrl.get_value() || '';
// 					this._on_filter_change('end_date');
// 					this._validate_dates('end_date');
// 				},
// 			},
// 			render_input: true,
// 		});
// 		end_ctrl.refresh();
// 		this._fields.end_date = end_ctrl;

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

// 		let _visN = 0;
// 		const _visT = setInterval(() => {
// 			_visN++;
// 			const ready = ['financial_year','month','start_date','end_date'].every(k => {
// 				const f = this._fields[k];
// 				return f && f.$wrapper && f.$wrapper[0];
// 			});
// 			if (ready || _visN >= 30) {
// 				clearInterval(_visT);
// 				this._setup_filter_visibility();
// 			}
// 		}, 200);
// 	}

// 	_validate_dates(changed_field) {
// 		const sd = this._fields.start_date?.get_value() || '';
// 		const ed = this._fields.end_date?.get_value()   || '';
// 		if (!sd || !ed) return true;
// 		if (new Date(sd) > new Date(ed)) {
// 			frappe.show_alert({ message: __('Start Date cannot be later than End Date.'), indicator: 'orange' }, 4);
// 			try {
// 				if (changed_field === 'start_date') this._fields.start_date.set_value('');
// 				else                                this._fields.end_date.set_value('');
// 			} catch(_) {}
// 			return false;
// 		}
// 		return true;
// 	}

// 	_setup_filter_visibility() {
// 		const GROUP_A = ['financial_year', 'month'];
// 		const GROUP_B = ['start_date', 'end_date'];

// 		const _hasValue = (key) => {
// 			try {
// 				const f = this._fields[key];
// 				const v = f?.get_value ? f.get_value() : null;
// 				if (v == null || v === '') return false;
// 				return Array.isArray(v) ? v.length > 0 : String(v).trim() !== '';
// 			} catch(_) { return false; }
// 		};

// 		const _getEl = (key) => {
// 			const col = document.getElementById(`cbd_fcol_${key}`);
// 			if (col) return col;
// 			const f = this._fields[key];
// 			if (f?.$wrapper?.[0]) return f.$wrapper[0];
// 			return null;
// 		};

// 		const _setVisible = (keys, show) => {
// 			keys.forEach(k => {
// 				const el = _getEl(k);
// 				if (!el) return;
// 				el.style.display = show ? '' : 'none';
// 			});
// 		};

// 		const _sync = () => {
// 			const aOn = GROUP_A.some(_hasValue);
// 			const bOn = GROUP_B.some(_hasValue);
// 			if (bOn && !aOn)      { _setVisible(GROUP_A, false); _setVisible(GROUP_B, true);  }
// 			else if (aOn && !bOn) { _setVisible(GROUP_A, true);  _setVisible(GROUP_B, false); }
// 			else                  { _setVisible(GROUP_A, true);  _setVisible(GROUP_B, true);  }
// 		};

// 		[...GROUP_A, ...GROUP_B].forEach(key => {
// 			const el = _getEl(key);
// 			if (el && !el._cbdMutObs) {
// 				const obs = new MutationObserver(() => setTimeout(_sync, 80));
// 				obs.observe(el, { childList: true, subtree: true });
// 				el._cbdMutObs = obs;
// 			}
// 		});

// 		['cbd_frow1','cbd_frow2'].forEach(rowId => {
// 			const rowEl = document.getElementById(rowId);
// 			if (rowEl && !rowEl._cbdFormObs) {
// 				const obs = new MutationObserver(() => { _sync(); });
// 				obs.observe(rowEl, { childList: true, subtree: false });
// 				rowEl._cbdFormObs = obs;
// 			}
// 		});

// 		this._sync_filter_visibility = _sync;
// 		_sync();
// 	}

// 	_on_filter_change(key) {
// 		if (this._sync_filter_visibility) setTimeout(this._sync_filter_visibility, 50);
// 	}

// 	_clear_filters() {
// 		this._active_filters = {};
// 		Object.entries(this._fields || {}).forEach(([k, f]) => {
// 			try { f.set_value(f.df.fieldtype === 'Date' ? '' : []); } catch(e) {}
// 		});
// 		['financial_year','month','start_date','end_date'].forEach(k => {
// 			const el = document.getElementById(`cbd_fcol_${k}`);
// 			if (el) el.style.display = '';
// 		});
// 		this.load_data({});
// 	}

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

// 	_panel_filters() {
// 		const af = this._active_filters || {};
// 		return {
// 			partner_id:     af.partner_id     || null,
// 			start_date:     af.start_date     || null,
// 			end_date:       af.end_date       || null,
// 			financial_year: af.financial_year || null,
// 			month:          af.month          || null,
// 		};
// 	}

// 	load_data(filters) {
// 		this._active_filters = filters || {};
// 		frappe.call({
// 			method: 'creche_reports.api.budget_utilisation_summary.get_partner_budget_summary',
// 			freeze: true, freeze_message: 'Loading budget summary…',
// 			args: { filters: filters || {} },
// 			callback: (r) => {
// 				if (!r.message) return;
// 				this._all_partners = r.message.partners || [];
// 				this.render_summary(r.message.summary);
// 				this.render_partners(r.message.partners);
// 			}
// 		});
// 	}


// 	// ═══════════════════════════════════════════════════════════════════════
// 	// CARD DESIGN  — render_summary  (7 cards, fresh colour palette)
// 	// ═══════════════════════════════════════════════════════════════════════

// 	render_summary(s) {
// 		if (!s) return;
// 		const el = document.getElementById('cbd_summary_cards');
// 		if (!el) return;

// 		const bank_bal            = parseFloat(s.total_bank_balance) || 0;
// 		const total_disb          = parseFloat(s.total_disbursement)  || 0;
// 		const total_util          = parseFloat(s.total_utilisation)   || 0;
// 		const unutilised_disb     = Math.max(total_disb - total_util, 0);
// 		const unutilised_disb_bal = Math.max(bank_bal  - total_util, 0);
// 		const partners_pending    = (this._all_partners || []).filter(p => (parseFloat(p.utilised_pct)||0) < 100).length;

// 		const CARDS = [
// 			// ORDER: Budget, Disbursement, Utilisation, Unutilized Disb,
// 			//        Bank Balance, Unutilized Disb–Bank Bal, Pending Utilization
// 			{
// 				panel:'budget', label:'Total Budget', sub:'Approved budget',
// 				raw: s.total_budget,
// 				color:'#2563EB', iconBg:'#DBEAFE', iconC:'#1D4ED8',
// 				icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>',
// 			},
// 			{
// 				panel:'disbursement', label:'Total Disbursement', sub:'Released to partners',
// 				raw: s.total_disbursement,
// 				color:'#7C3AED', iconBg:'#DDD6FE', iconC:'#6D28D9',
// 				icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>',
// 			},
// 			{
// 				panel:'utilisation', label:'Total Utilisation', sub:'Reported utilisation',
// 				raw: s.total_utilisation,
// 				color:'#059669', iconBg:'#A7F3D0', iconC:'#047857',
// 				icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
// 			},
// 			{
// 				panel:'unutilised_disb', label:'Unutilized Disbursement', sub:'Disbursed but not utilised',
// 				raw: unutilised_disb,
// 				color:'#D97706', iconBg:'#FDE68A', iconC:'#B45309',
// 				icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
// 			},
// 			{
// 				panel:'bank_balance', label:'Reported Bank Balance', sub:'Bank balance on record',
// 				raw: bank_bal,
// 				color:'#0891B2', iconBg:'#A5F3FC', iconC:'#0E7490',
// 				icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
// 			},
// 			{
// 				panel:'unutilised_disb_bal', label:'Unutilized Disb – Bank Bal.', sub:'Bank bal. minus utilisation',
// 				raw: unutilised_disb_bal,
// 				color:'#DB2777', iconBg:'#FBCFE8', iconC:'#BE185D',
// 				icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
// 			},
// 			{
// 				panel:'pending_util', label:'Pending Utilization', sub:'Partners below 100% util',
// 				raw: null, count: partners_pending,
// 				color:'#EA580C', iconBg:'#FED7AA', iconC:'#C2410C',
// 				icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
// 			},
// 		];

// 		el.innerHTML = CARDS.map(c => {
// 			// Summary cards: NO icon — typography-first
// 			// Large Cr value dominates, label sits above, footer has sub + view link
// 			const numHtml = c.count !== undefined
// 				? `<div class="cbd-scard__num" style="color:var(--card-accent)">${c.count}<span class="cbd-scard__unit">partners</span></div>`
// 				: `<div class="cbd-scard__num">${this._fmtCard(c.raw, c.label)}</div>`;
// 			return `
// 			<div class="cbd-scard" data-panel="${c.panel}"
// 			     style="--card-accent:${c.color};">
// 				<div class="cbd-scard__lbl">${c.label}</div>
// 				${numHtml}
// 				<div class="cbd-scard__foot">
// 					<span class="cbd-scard__sub">${c.sub}</span>
// 					<span class="cbd-scard__cta">View details ↗</span>
// 				</div>
// 			</div>`;
// 		}).join('');

// 		// PFO alert — placed at very top of cbd-root, before filters
// 		const pfo_old = document.getElementById('cbd_pfo_banner');
// 		if (pfo_old) pfo_old.remove();
// 		if ((frappe.user_roles||[]).includes('Creche Finance PFO')) {
// 			const root = document.querySelector('.cbd-root');
// 			const alert = document.createElement('div');
// 			alert.id = 'cbd_pfo_banner';
// 			alert.className = 'cbd-alert cbd-alert--warning';
// 			const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
// 			const _now = new Date();
// 			// "coming month" = next month
// 			const _nextMonth = MONTHS[(_now.getMonth() + 1) % 12];
// 			alert.innerHTML = `
// 				<div class="cbd-alert__icon">
// 					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
// 				</div>
// 				<div class="cbd-alert__body">
// 					<span class="cbd-alert__title">Action Required</span>
// 					<span class="cbd-alert__msg">Requesting you to submit your utilization report by <strong>${_nextMonth} 5th</strong>.</span>
// 				</div>
// 				<button class="cbd-alert__dismiss" onclick="this.closest('.cbd-alert').remove()" title="Dismiss">
// 					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
// 				</button>`;
// 			if (root) root.insertBefore(alert, root.firstChild);
// 			else document.getElementById('cbd_summary_cards').before(alert);
// 		}

// 		el.querySelectorAll('.cbd-scard').forEach(card => {
// 			card.addEventListener('click', () => {
// 				const panel = card.dataset.panel;
// 				if (panel === 'budget')       this._open_drill_modal('budget');
// 				else if (panel === 'utilisation')  this._open_drill_modal('utilisation');
// 				else if (panel === 'disbursement') this._open_drill_modal('disbursement');
// 				else this._open_card_drill_modal(panel);
// 			});
// 		});
// 	}

// 	// ═══════════════════════════════════════════════════════════════════════
// 	// UNIVERSAL DRILL MODAL  — budget / utilisation / disbursement
// 	// Up to 3 pages: partners → budgets → line items
// 	// ═══════════════════════════════════════════════════════════════════════

// 	// Routes bank_balance / unutilised_disb / unutilised_disb_bal / pending_util
// 	// into the same 3-page drill modal using a virtual "type" config
// 	_open_card_drill_modal(panel) {
// 		const CFG = {
// 			bank_balance:       { title:'Reported Bank Balance',         col1:'Bank Balance',         getVal: p => parseFloat(p.total_bank_balance)||0, getBVal: b => parseFloat(b.bank_balance)||0 },
// 			unutilised_disb:    { title:'Unutilized Disbursement',        col1:'Unutilized (Disb–Util)',getVal: p => Math.max((parseFloat(p.total_disbursement)||0)-(parseFloat(p.total_utilisation)||0),0), getBVal: b => Math.max((parseFloat(b.disbursement)||0)-(parseFloat(b.utilisation)||0),0) },
// 			unutilised_disb_bal:{ title:'Unutilized Disb – Bank Bal.',   col1:'Bank Bal – Utilised',  getVal: p => Math.max((parseFloat(p.total_bank_balance)||0)-(parseFloat(p.total_utilisation)||0),0), getBVal: b => Math.max((parseFloat(b.bank_balance)||0)-(parseFloat(b.utilisation)||0),0) },
// 			pending_util:       { title:'Partners – Pending Utilization', col1:'Util %',               getVal: p => parseFloat(p.utilised_pct)||0, getBVal: b => parseFloat(b.utilised_pct)||0, isPct: true },
// 		};
// 		const cfg = CFG[panel];
// 		if (!cfg) return;

// 		const old = document.getElementById('cbd_drill_wrap');
// 		if (old) old.remove();

// 		const wrap = document.createElement('div');
// 		wrap.id        = 'cbd_drill_wrap';
// 		wrap.className = 'cbd-dw';
// 		wrap.innerHTML = `
// 			<div class="cbd-dm" id="cbd_dm_box">
// 				<div class="cbd-dm__track" id="cbd_dm_track">
// 					<div class="cbd-dm__page" id="cbd_dm_p1"></div>
// 					<div class="cbd-dm__page" id="cbd_dm_p2"></div>
// 				</div>
// 				<div class="cbd-dm__footer">
// 					<button class="cbd-dm__close" title="Close (Esc)">
// 						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
// 						Close
// 					</button>
// 				</div>
// 			</div>`;
// 		document.body.appendChild(wrap);
// 		requestAnimationFrame(() => wrap.classList.add('cbd-dw--open'));

// 		const box = wrap.querySelector('#cbd_dm_box');
// 		box.addEventListener('click', e => {
// 			if (e.target.closest('.cbd-dm__close'))    { this._close_drill_modal_main(); return; }
// 			const xb = e.target.closest('.cbd-exp-btn--xls'); if (xb) { this._export_excel(xb.dataset.tbl, xb.dataset.fname); return; }
// 			const pb = e.target.closest('.cbd-exp-btn--pdf'); if (pb) { this._export_pdf(pb.dataset.tbl, pb.dataset.fname); return; }
// 			// breadcrumb & back button both go to page 1
// 			if (e.target.closest('#cbd_bc_root') || e.target.closest('#cbd_bc_root_btn')) {
// 				this._dm_page = 1;
// 				const tr = document.getElementById('cbd_dm_track'); if (tr) tr.style.transform='translateX(0)';
// 				return;
// 			}
// 		});

// 		wrap.addEventListener('click', e => { if (e.target===wrap) this._close_drill_modal_main(); });
// 		const _esc = e => { if (e.key==='Escape') this._close_drill_modal_main(); };
// 		document.addEventListener('keydown', _esc);
// 		wrap._esc = _esc;

// 		// Render 2-page track: partners → budget rows
// 		this._dm_page = 1;
// 		const partners = this._all_partners || [];
// 		const table_id  = 'cbd_dm_t1';
// 		const fname     = cfg.title.replace(/\s+/g,'_');

// 		const rows = partners.map((p,idx) => {
// 			const val = cfg.getVal(p);
// 			const disp = cfg.isPct ? `<span class="cbd-dt__pct" style="color:${val<75?'#dc2626':'#16a34a'}">${val.toFixed(1)}%</span>` : this._fmtTip(val, cfg.col1);
// 			return `<tr class="cbd-dt__row">
// 				<td class="cbd-dt__num">${idx+1}</td>
// 				<td class="cbd-dt__name">${frappe.utils.escape_html(p.partner_name||'—')}</td>
// 				<td class="cbd-dt__r">${disp}</td>
// 				<td class="cbd-dt__act"><button class="cbd-dt__btn cbd-dm__cdrill" data-pidx="${idx}">Details ›</button></td>
// 			</tr>`;
// 		}).join('');
// 		const gt = cfg.isPct ? '' : this._fmtTip(partners.reduce((s,p)=>s+cfg.getVal(p),0));

// 		const p1 = document.getElementById('cbd_dm_p1');
// 		p1.innerHTML = `
// 			${this._dm_topbar(cfg.title, null, null, 1, table_id, fname)}
// 			<div class="cbd-dm__body">
// 				<div class="cbd-dm__tbl-wrap">
// 					<table class="cbd-dt" id="${table_id}">
// 						<thead><tr>
// 							<th class="cbd-dt__th cbd-dt__th--num">#</th>
// 							<th class="cbd-dt__th">Partner</th>
// 							<th class="cbd-dt__th cbd-dt__th--r">${cfg.col1}</th>
// 							<th class="cbd-dt__th" style="width:90px"></th>
// 						</tr></thead>
// 						<tbody>${rows}</tbody>
// 						<tfoot><tr>
// 							<td class="cbd-dt__foot" colspan="2">Total</td>
// 							<td class="cbd-dt__r cbd-dt__foot">${gt}</td>
// 							<td class="cbd-dt__foot"></td>
// 						</tr></tfoot>
// 					</table>
// 				</div>
// 			</div>`;

// 		p1.addEventListener('click', e => {
// 			const btn = e.target.closest('.cbd-dm__cdrill');
// 			if (!btn) return;
// 			e.stopPropagation();
// 			const partner = (this._all_partners||[])[parseInt(btn.dataset.pidx)];
// 			if (!partner) return;
// 			// render page2 for this partner
// 			this._dm_page = 2;
// 			const track2 = document.getElementById('cbd_dm_track');
// 			if (track2) track2.style.transform = 'translateX(-50%)';
// 			const p2 = document.getElementById('cbd_dm_p2');
// 			const budgets = partner.budgets || [];
// 			const pname   = frappe.utils.escape_html(partner.partner_name||'Partner');
// 			const t2id    = 'cbd_dm_t2';
// 			const fn2     = `${fname}_${pname.replace(/\s+/g,'_')}`;
// 			const brows = budgets.map((b,i) => {
// 				const bval = cfg.getBVal(b);
// 				const bdisp = cfg.isPct ? `<span class="cbd-dt__pct" style="color:${bval<75?'#dc2626':'#16a34a'}">${bval.toFixed(1)}%</span>` : this._fmtTip(bval, cfg.col1);
// 				return `<tr class="cbd-dt__row">
// 					<td class="cbd-dt__num">${i+1}</td>
// 					<td class="cbd-dt__name"><div style="font-weight:600">${frappe.utils.escape_html(b.budget_reference_name||'—')}</div><div style="font-size:11px;color:#9ca3af">${frappe.utils.escape_html(b.state||'')} ${b.financial_year?'· '+frappe.utils.escape_html(b.financial_year):''}</div></td>
// 					<td class="cbd-dt__r">${bdisp}</td>
// 				</tr>`;
// 			}).join('');
// 			const bgt = cfg.isPct ? '' : this._fmtTip(budgets.reduce((s,b)=>s+cfg.getBVal(b),0));
// 			p2.innerHTML = `
// 				${this._dm_topbar(cfg.title, pname, null, 2, t2id, fn2)}
// 				<div class="cbd-dm__body">
// 					<div class="cbd-dm__tbl-wrap">
// 						<table class="cbd-dt" id="${t2id}">
// 							<thead><tr>
// 								<th class="cbd-dt__th cbd-dt__th--num">#</th>
// 								<th class="cbd-dt__th">Budget Reference</th>
// 								<th class="cbd-dt__th cbd-dt__th--r">${cfg.col1}</th>
// 							</tr></thead>
// 							<tbody>${brows}</tbody>
// 							<tfoot><tr>
// 								<td class="cbd-dt__foot" colspan="2">Total</td>
// 								<td class="cbd-dt__r cbd-dt__foot">${bgt}</td>
// 							</tr></tfoot>
// 						</table>
// 					</div>
// 				</div>`;
// 			// wire breadcrumb back for page2
// 			const bcR = p2.querySelector('#cbd_bc_root');
// 			if (bcR) bcR.addEventListener('click', () => {
// 				this._dm_page = 1;
// 				const tr = document.getElementById('cbd_dm_track');
// 				if (tr) tr.style.transform = 'translateX(0)';
// 			});
// 		});
// 	}

// 		_open_drill_modal(type) {
// 		const old = document.getElementById('cbd_drill_wrap');
// 		if (old) old.remove();

// 		const wrap = document.createElement('div');
// 		wrap.id        = 'cbd_drill_wrap';
// 		wrap.className = 'cbd-dw';
// 		wrap.innerHTML = `
// 			<div class="cbd-dm" id="cbd_dm_box">
// 				<div class="cbd-dm__track" id="cbd_dm_track">
// 					<div class="cbd-dm__page" id="cbd_dm_p1"></div>
// 					<div class="cbd-dm__page" id="cbd_dm_p2"></div>
// 					<div class="cbd-dm__page" id="cbd_dm_p3"></div>
// 				</div>
// 				<div class="cbd-dm__footer">
// 					<button class="cbd-dm__close" title="Close (Esc)">
// 						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
// 						Close
// 					</button>
// 				</div>
// 			</div>`;

// 		document.body.appendChild(wrap);
// 		requestAnimationFrame(() => wrap.classList.add('cbd-dw--open'));

// 		// ── Single delegated listener on the box — handles ALL button clicks ──
// 		const box = wrap.querySelector('#cbd_dm_box');
// 		box.addEventListener('click', e => {
// 			// Close (topbar or footer)
// 			if (e.target.closest('.cbd-dm__close')) {
// 				this._close_drill_modal_main(); return;
// 			}
// 			// Export Excel
// 			const xbtn = e.target.closest('.cbd-exp-btn--xls');
// 			if (xbtn) { e.stopPropagation(); this._export_excel(xbtn.dataset.tbl, xbtn.dataset.fname); return; }
// 			// Export PDF
// 			const pbtn = e.target.closest('.cbd-exp-btn--pdf');
// 			if (pbtn) { e.stopPropagation(); this._export_pdf(pbtn.dataset.tbl, pbtn.dataset.fname); return; }
// 			// Breadcrumb: clicking parent crumb navigates back
// 			if (e.target.closest('#cbd_bc_root')) { this._dm_goto(1); return; }
// 			if (e.target.closest('#cbd_bc_p2'))   { this._dm_goto(2); return; }
// 			// Back button (separate from breadcrumb)
// 			if (e.target.closest('#cbd_bc_root_btn')) { this._dm_goto(1); return; }
// 			if (e.target.closest('#cbd_bc_p2_btn'))   { this._dm_goto(2); return; }
// 		});

// 		// Close on overlay click
// 		wrap.addEventListener('click', e => { if (e.target === wrap) this._close_drill_modal_main(); });

// 		const _esc = e => { if (e.key === 'Escape') this._close_drill_modal_main(); };
// 		document.addEventListener('keydown', _esc);
// 		wrap._esc = _esc;

// 		this._dm_type    = type;
// 		this._dm_partner = null;
// 		this._dm_budget  = null;
// 		this._dm_page    = 1;
// 		this._render_dm_page1();
// 	}

// 	_close_drill_modal_main() {
// 		const wrap = document.getElementById('cbd_drill_wrap');
// 		if (!wrap) return;
// 		wrap.classList.remove('cbd-dw--open');
// 		wrap.addEventListener('transitionend', () => wrap.remove(), { once:true });
// 		if (wrap._esc) document.removeEventListener('keydown', wrap._esc);
// 	}

// 	_dm_goto(page) {
// 		this._dm_page = page;
// 		const track = document.getElementById('cbd_dm_track');
// 		if (track) track.style.transform = `translateX(-${(page-1)*100/3}%)`;
// 		// Re-render the target page if it hasn't been rendered yet (back navigation is instant)
// 	}

// 	// ─── Page 1: Partners ────────────────────────────────────────────────
// 	_render_dm_page1() {
// 		const p1   = document.getElementById('cbd_dm_p1');
// 		if (!p1) return;
// 		this._dm_goto(1);

// 		const type     = this._dm_type;
// 		const partners = this._all_partners || [];
// 		const TITLE = { budget:'Total Budget', utilisation:'Total Utilisation', disbursement:'Total Disbursement' };
// 		const COLS  = {
// 			budget:       ['Partner', 'Budget', 'Util %'],
// 			utilisation:  ['Partner', 'Utilisation', 'Budget', 'Util %'],
// 			disbursement: ['Partner', 'Budget', 'Disbursed', 'Disb %', 'Utilised', 'Util %'],
// 		};

// 		const rows = partners.map((p, idx) => {
// 			const bud  = parseFloat(p.total_budget)       || 0;
// 			const util = parseFloat(p.total_utilisation)  || 0;
// 			const disb = parseFloat(p.total_disbursement) || 0;
// 			const pct  = parseFloat(p.utilised_pct)       || 0;
// 			const chip = pct>=75?'#16a34a':'#dc2626';
// 			const pname = frappe.utils.escape_html(p.partner_name||'—');
// 			let cells = '';
// 			if (type === 'budget') {
// 				cells = `<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
// 				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
// 			} else if (type === 'utilisation') {
// 				cells = `<td class="cbd-dt__r">${this._fmtTip(util,'Utilisation')}</td>
// 				         <td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
// 				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
// 			} else {
// 				const disb_pct = bud>0?(disb/bud*100):0;
// 				const chip_d   = disb_pct>=75?'#16a34a':'#d97706';
// 				cells = `<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
// 				         <td class="cbd-dt__r">${this._fmtTip(disb,'Disbursed')}</td>
// 				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip_d}">${disb_pct.toFixed(1)}%</span></td>
// 				         <td class="cbd-dt__r">${this._fmtTip(util,'Utilised')}</td>
// 				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
// 			}
// 			return `<tr class="cbd-dt__row" data-pidx="${idx}">
// 				<td class="cbd-dt__num">${idx+1}</td>
// 				<td class="cbd-dt__name">${pname}</td>
// 				${cells}
// 				<td class="cbd-dt__act"><button class="cbd-dt__btn cbd-dm__drillp1" data-pidx="${idx}">Details ›</button></td>
// 			</tr>`;
// 		}).join('');

// 		const gt_bud  = partners.reduce((s,p)=>s+(parseFloat(p.total_budget)||0),0);
// 		const gt_util = partners.reduce((s,p)=>s+(parseFloat(p.total_utilisation)||0),0);
// 		const gt_disb = partners.reduce((s,p)=>s+(parseFloat(p.total_disbursement)||0),0);
// 		const gt_pct      = gt_bud>0?(gt_util/gt_bud*100):0;
// 		const gt_disb_pct = gt_bud>0?(gt_disb/gt_bud*100):0;
// 		let foot_cells = '';
// 		if (type==='budget')        foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;
// 		else if (type==='utilisation') foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;
// 		else foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_disb)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_disb_pct.toFixed(1)}%</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;

// 		const thead_html = COLS[type].map(h=>`<th class="cbd-dt__th">${h}</th>`).join('');
// 		const table_id   = 'cbd_dm_t1';
// 		const fname      = TITLE[type].replace(/\s+/g,'_');

// 		p1.innerHTML = `
// 			${this._dm_topbar(TITLE[type], null, null, 1, table_id, fname)}
// 			<div class="cbd-dm__body">
// 				<div class="cbd-dm__tbl-wrap">
// 					<table class="cbd-dt" id="${table_id}">
// 						<thead><tr>
// 							<th class="cbd-dt__th cbd-dt__th--num">#</th>
// 							${thead_html}
// 							<th class="cbd-dt__th" style="width:90px"></th>
// 						</tr></thead>
// 						<tbody>${rows}</tbody>
// 					</table>
// 				</div>
// 			</div>
// 			<div class="cbd-dm__sticky-foot">
// 				<table class="cbd-dt cbd-dt--foot-only">
// 					<tfoot><tr>
// 						<td class="cbd-dt__foot cbd-dt__foot--num"></td>
// 						<td class="cbd-dt__foot" style="font-weight:800">Grand Total</td>
// 						${foot_cells}
// 						<td class="cbd-dt__foot" style="width:90px"></td>
// 					</tr></tfoot>
// 				</table>
// 			</div>`;

// 		// Wire drill buttons via delegation on p1
// 		p1.addEventListener('click', e => {
// 			const btn = e.target.closest('.cbd-dm__drillp1');
// 			if (!btn) return;
// 			e.stopPropagation();
// 			const idx = parseInt(btn.dataset.pidx);
// 			this._dm_partner = (this._all_partners||[])[idx];
// 			if (this._dm_partner) this._render_dm_page2();
// 		});
// 	}

// 	// ─── Page 2: Budget rows ────────────────────────────────────────────
// 	_render_dm_page2() {
// 		const p2      = document.getElementById('cbd_dm_p2');
// 		if (!p2) return;
// 		this._dm_goto(2);

// 		const type    = this._dm_type;
// 		const partner = this._dm_partner;
// 		const budgets = partner.budgets || [];
// 		const pname   = frappe.utils.escape_html(partner.partner_name||'Partner');
// 		const TITLE   = { budget:'Total Budget', utilisation:'Total Utilisation', disbursement:'Total Disbursement' };
// 		const COLS    = {
// 			budget:       ['Budget Reference', 'Budget', 'Util %'],
// 			utilisation:  ['Budget Reference', 'Utilisation', 'Budget', 'Util %'],
// 			disbursement: ['Budget Reference', 'Budget', 'Disbursed', 'Disb %', 'Utilised', 'Util %'],
// 		};

// 		const rows = budgets.map((b, i) => {
// 			const bud  = parseFloat(b.budget)       || 0;
// 			const util = parseFloat(b.utilisation)  || 0;
// 			const disb = parseFloat(b.disbursement) || 0;
// 			const pct  = parseFloat(b.utilised_pct) || 0;
// 			const chip = pct>=75?'#16a34a':'#dc2626';
// 			let cells = '';
// 			if (type === 'budget') {
// 				cells = `<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
// 				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
// 			} else if (type === 'utilisation') {
// 				cells = `<td class="cbd-dt__r">${this._fmtTip(util,'Utilisation')}</td>
// 				         <td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
// 				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
// 			} else {
// 				const disb_pct = bud>0?(disb/bud*100):0;
// 				const chip_d   = disb_pct>=75?'#16a34a':'#d97706';
// 				cells = `<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
// 				         <td class="cbd-dt__r">${this._fmtTip(disb,'Disbursed')}</td>
// 				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip_d}">${disb_pct.toFixed(1)}%</span></td>
// 				         <td class="cbd-dt__r">${this._fmtTip(util,'Utilised')}</td>
// 				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
// 			}
// 			return `<tr class="cbd-dt__row">
// 				<td class="cbd-dt__num">${i+1}</td>
// 				<td class="cbd-dt__name">
// 					<div style="font-weight:600;color:#111827">${frappe.utils.escape_html(b.budget_reference_name||'—')}</div>
// 					<div style="font-size:11px;color:#9ca3af">${frappe.utils.escape_html(b.grant_id||'')}${b.state?' · '+frappe.utils.escape_html(b.state):''}</div>
// 				</td>
// 				${cells}
// 				<td class="cbd-dt__act"><button class="cbd-dt__btn cbd-dm__drillp2" data-bidx="${i}">Line Items ›</button></td>
// 			</tr>`;
// 		}).join('');

// 		const gt_bud  = budgets.reduce((s,b)=>s+(parseFloat(b.budget)||0),0);
// 		const gt_util = budgets.reduce((s,b)=>s+(parseFloat(b.utilisation)||0),0);
// 		const gt_disb = budgets.reduce((s,b)=>s+(parseFloat(b.disbursement)||0),0);
// 		const gt_pct      = gt_bud>0?(gt_util/gt_bud*100):0;
// 		const gt_disb_pct = gt_bud>0?(gt_disb/gt_bud*100):0;
// 		let foot_cells = '';
// 		if (type==='budget')        foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;
// 		else if (type==='utilisation') foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;
// 		else foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_disb)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_disb_pct.toFixed(1)}%</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;

// 		const thead_html = COLS[type].map(h=>`<th class="cbd-dt__th">${h}</th>`).join('');
// 		const table_id   = 'cbd_dm_t2';
// 		const fname      = `${TITLE[type].replace(/\s+/g,'_')}_${pname.replace(/\s+/g,'_')}`;

// 		p2.innerHTML = `
// 			${this._dm_topbar(TITLE[type], pname, null, 2, table_id, fname)}
// 			<div class="cbd-dm__body">
// 				<div class="cbd-dm__tbl-wrap">
// 					<table class="cbd-dt" id="${table_id}">
// 						<thead><tr>
// 							<th class="cbd-dt__th cbd-dt__th--num">#</th>
// 							${thead_html}
// 							<th class="cbd-dt__th" style="width:110px"></th>
// 						</tr></thead>
// 						<tbody>${rows}</tbody>
// 					</table>
// 				</div>
// 			</div>
// 			<div class="cbd-dm__sticky-foot">
// 				<table class="cbd-dt cbd-dt--foot-only">
// 					<tfoot><tr>
// 						<td class="cbd-dt__foot cbd-dt__foot--num"></td>
// 						<td class="cbd-dt__foot" style="font-weight:800">Total</td>
// 						${foot_cells}
// 						<td class="cbd-dt__foot" style="width:110px"></td>
// 					</tr></tfoot>
// 				</table>
// 			</div>`;

// 		p2.addEventListener('click', e => {
// 			const btn = e.target.closest('.cbd-dm__drillp2');
// 			if (!btn) return;
// 			e.stopPropagation();
// 			const bidx = parseInt(btn.dataset.bidx);
// 			this._dm_budget = (partner.budgets||[])[bidx];
// 			if (this._dm_budget) this._render_dm_page3();
// 		});
// 	}

// 	// ─── Page 3: Line Items ─────────────────────────────────────────────
// 	_render_dm_page3() {
// 		const p3    = document.getElementById('cbd_dm_p3');
// 		if (!p3) return;
// 		this._dm_goto(3);

// 		const type    = this._dm_type;
// 		const partner = this._dm_partner;
// 		const budget  = this._dm_budget;
// 		const pname   = frappe.utils.escape_html(partner.partner_name||'Partner');
// 		const bname   = frappe.utils.escape_html(budget.budget_reference_name||'Budget');
// 		const TITLE   = { budget:'Total Budget', utilisation:'Total Utilisation', disbursement:'Total Disbursement' };
// 		const fname   = `${TITLE[type].replace(/\s+/g,'_')}_${bname.replace(/\s+/g,'_')}`;

// 		p3.innerHTML = `
// 			${this._dm_topbar(TITLE[type], pname, bname, 3, 'cbd_dm_t3', fname)}
// 			<div class="cbd-dm__body" id="cbd_dm_p3_body">
// 				<div class="cbd-dm__loading">Loading line items…</div>
// 			</div>`;

// 		const pf = this._panel_filters();
// 		const budget_id = budget.budget_id;

// 		if (type === 'budget') {
// 			frappe.call({
// 				method:'creche_reports.api.budget_utilisation_summary.get_budget_line_items',
// 				args:{budget_id, start_date:pf.start_date||null, end_date:pf.end_date||null,
// 				      financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,
// 				      month:pf.month?JSON.stringify(pf.month):null},
// 				callback: r => this._render_dm_budget_items(r.message||[]),
// 			});
// 		} else if (type === 'utilisation') {
// 			Promise.all([
// 				frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_budget_line_items',
// 					args:{budget_id, start_date:pf.start_date||null, end_date:pf.end_date||null,
// 					      financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,
// 					      month:pf.month?JSON.stringify(pf.month):null}}),
// 				frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_utilisation_line_items',
// 					args:{budget_id, start_date:pf.start_date, end_date:pf.end_date,
// 					      financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,
// 					      month:pf.month?JSON.stringify(pf.month):null}}),
// 			]).then(([rb, ru]) => this._render_dm_util_items(rb.message||[], (ru.message||{}).records||[]));
// 		} else {
// 			frappe.call({
// 				method:'creche_reports.api.budget_utilisation_summary.get_disbursement_panel_data',
// 				args:{budget_ids:JSON.stringify([budget_id]), partner_ids:null,
// 				      start_date:pf.start_date||null, end_date:pf.end_date||null,
// 				      financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,
// 				      month:pf.month?JSON.stringify(pf.month):null},
// 				callback: r => this._render_dm_disb_items(r.message||[]),
// 			});
// 		}
// 	}

// 	_render_dm_budget_items(items) {
// 		const body = document.getElementById('cbd_dm_p3_body');
// 		if (!body) return;
// 		if (!items.length) { body.innerHTML='<div class="cbd-dm__empty">No budget line items found.</div>'; return; }

// 		// Determine which amount column(s) to show based on active filters
// 		const pf = this._panel_filters();
// 		const af = this._active_filters || {};
// 		const hasFY     = !!(af.financial_year && af.financial_year.length);
// 		const hasMonth  = !!(af.month && af.month.length);
// 		const hasDate   = !!(pf.start_date || pf.end_date);
// 		const hasFilter = hasFY || hasMonth || hasDate;

// 		// When a filter is active: only show a single "Amount" column (filtered total)
// 		// When no filter: show Amount + Y1 + Y2 + Y3
// 		const showYears = !hasFilter;

// 		// Build a filter period label for the amount column header
// 		let amtLabel = 'Amount';
// 		if (hasFY && hasMonth)  amtLabel = `${af.financial_year.join(', ')} — ${af.month.join(', ')}`;
// 		else if (hasFY)         amtLabel = af.financial_year.join(', ');
// 		else if (hasMonth)      amtLabel = af.month.join(', ');
// 		else if (hasDate)       amtLabel = `${pf.start_date||''}${pf.end_date?' → '+pf.end_date:''}`;

// 		const rows = items.map((r,i) => {
// 			const yearTds = showYears
// 				? `<td class="cbd-dt__r">${r.year_1?this._fmt(r.year_1):'—'}</td><td class="cbd-dt__r">${r.year_2?this._fmt(r.year_2):'—'}</td><td class="cbd-dt__r">${r.year_3?this._fmt(r.year_3):'—'}</td>`
// 				: '';
// 			return `
// 			<tr class="cbd-dt__row">
// 				<td class="cbd-dt__num">${i+1}</td>
// 				<td>${frappe.utils.escape_html(r.type_of_expenses||'—')}</td>
// 				<td>${frappe.utils.escape_html(r.budget_sub_head||'—')}</td>
// 				<td>${frappe.utils.escape_html(r.budget_main_head||'—')}</td>
// 				<td class="cbd-dt__r">${this._fmtTip(r.total_amount, amtLabel)}</td>
// 				${yearTds}
// 			</tr>`;
// 		}).join('');
// 		const grand  = items.reduce((s,r)=>s+(parseFloat(r.total_amount)||0),0);
// 		const grand1 = items.reduce((s,r)=>s+(parseFloat(r.year_1)||0),0);
// 		const grand2 = items.reduce((s,r)=>s+(parseFloat(r.year_2)||0),0);
// 		const grand3 = items.reduce((s,r)=>s+(parseFloat(r.year_3)||0),0);
// 		const yearThds = showYears ? `<th class="cbd-dt__th cbd-dt__th--r">Y1</th><th class="cbd-dt__th cbd-dt__th--r">Y2</th><th class="cbd-dt__th cbd-dt__th--r">Y3</th>` : '';
// 		const yearFoot = showYears
// 			? `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(grand1,'Y1 Total')}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(grand2,'Y2 Total')}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(grand3,'Y3 Total')}</td>`
// 			: '';
// 		body.innerHTML = `
// 			<div class="cbd-dm__tbl-wrap">
// 				<table class="cbd-dt" id="cbd_dm_t3">
// 					<thead><tr>
// 						<th class="cbd-dt__th cbd-dt__th--num">#</th>
// 						<th class="cbd-dt__th">Expense Type</th>
// 						<th class="cbd-dt__th">Sub Head</th>
// 						<th class="cbd-dt__th">Main Head</th>
// 						<th class="cbd-dt__th cbd-dt__th--r" title="${frappe.utils.escape_html(amtLabel)}">${frappe.utils.escape_html(amtLabel)}</th>
// 						${yearThds}
// 					</tr></thead>
// 					<tbody>${rows}</tbody>
// 				</table>
// 			</div>
// 			</div>
// 			<div class="cbd-dm__sticky-foot">
// 				<table class="cbd-dt cbd-dt--foot-only">
// 					<tfoot><tr>
// 						<td class="cbd-dt__foot" colspan="4" style="font-weight:800">Total</td>
// 						<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(grand,'Total')}</td>
// 						${yearFoot}
// 					</tr></tfoot>
// 				</table>
// 			</div>`;
// 	}

// 	_render_dm_util_items(bud_items, util_records) {
// 		const body = document.getElementById('cbd_dm_p3_body');
// 		if (!body) return;
// 		const merged = {};
// 		(bud_items||[]).forEach(r => {
// 			const k = r.type_of_expenses||r.budget_sub_head||'?';
// 			if (!merged[k]) merged[k]={type:r.type_of_expenses||'—',sub:r.budget_sub_head||'—',main:r.budget_main_head||'—',bud:0,util:0};
// 			merged[k].bud += parseFloat(r.total_amount)||0;
// 		});
// 		(util_records||[]).forEach(rec => {
// 			(rec.items||[]).forEach(r => {
// 				const k = r.type_of_expenses||r.budget_sub_head||'?';
// 				if (!merged[k]) merged[k]={type:r.type_of_expenses||'—',sub:r.budget_sub_head||'—',main:r.budget_main_head||'—',bud:0,util:0};
// 				merged[k].util += parseFloat(r.total_amount)||0;
// 			});
// 		});
// 		const items = Object.values(merged);
// 		if (!items.length) { body.innerHTML='<div class="cbd-dm__empty">No line items found.</div>'; return; }
// 		const rows = items.map((r,i) => {
// 			const pct = r.bud>0?(r.util/r.bud*100):0;
// 			const chip = pct>=75?'#16a34a':pct>=50?'#d97706':'#dc2626';
// 			return `<tr class="cbd-dt__row">
// 				<td class="cbd-dt__num">${i+1}</td>
// 				<td>${frappe.utils.escape_html(r.type)}</td>
// 				<td>${frappe.utils.escape_html(r.sub)}</td>
// 				<td>${frappe.utils.escape_html(r.main)}</td>
// 				<td class="cbd-dt__r">${this._fmtTip(r.bud,'Budget')}</td>
// 				<td class="cbd-dt__r">${this._fmtTip(r.util,'Utilised')}</td>
// 				<td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>
// 			</tr>`;
// 		}).join('');
// 		const gt_bud = items.reduce((s,r)=>s+r.bud,0);
// 		const gt_util = items.reduce((s,r)=>s+r.util,0);
// 		const gt_pct = gt_bud>0?(gt_util/gt_bud*100):0;
// 		body.innerHTML = `
// 			<div class="cbd-dm__tbl-wrap">
// 				<table class="cbd-dt" id="cbd_dm_t3">
// 					<thead><tr>
// 						<th class="cbd-dt__th cbd-dt__th--num">#</th>
// 						<th class="cbd-dt__th">Expense Type</th>
// 						<th class="cbd-dt__th">Sub Head</th>
// 						<th class="cbd-dt__th">Main Head</th>
// 						<th class="cbd-dt__th cbd-dt__th--r">Budget</th>
// 						<th class="cbd-dt__th cbd-dt__th--r">Utilised</th>
// 						<th class="cbd-dt__th cbd-dt__th--r">Util %</th>
// 					</tr></thead>
// 					<tbody>${rows}</tbody>
// 				</table>
// 			</div>
// 			</div>
// 			<div class="cbd-dm__sticky-foot">
// 				<table class="cbd-dt cbd-dt--foot-only">
// 					<tfoot><tr>
// 						<td class="cbd-dt__foot" colspan="4" style="font-weight:800">Total</td>
// 						<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td>
// 						<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td>
// 						<td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>
// 					</tr></tfoot>
// 				</table>
// 			</div>`;
// 	}

// 	_render_dm_disb_items(records) {
// 		const body = document.getElementById('cbd_dm_p3_body');
// 		if (!body) return;
// 		const entries = [];
// 		records.forEach(p => {
// 			(p.docs||[]).forEach(d => {
// 				(d.tracker||[]).forEach(t => {
// 					entries.push({date:t.date_of_disbursement||'', amount:t.disbursed_amount||0, ref:d.budget_reference_name||'—'});
// 				});
// 			});
// 		});
// 		if (!entries.length) { body.innerHTML='<div class="cbd-dm__empty">No disbursement entries found.</div>'; return; }
// 		const rows = entries.map((e,i) => `
// 			<tr class="cbd-dt__row">
// 				<td class="cbd-dt__num">${i+1}</td>
// 				<td>${this._date(e.date)||'—'}</td>
// 				<td>${frappe.utils.escape_html(e.ref)}</td>
// 				<td class="cbd-dt__r">${this._fmtTip(e.amount,'Amount')}</td>
// 			</tr>`).join('');
// 		const grand = entries.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
// 		body.innerHTML = `
// 			<div class="cbd-dm__tbl-wrap">
// 				<table class="cbd-dt" id="cbd_dm_t3">
// 					<thead><tr>
// 						<th class="cbd-dt__th cbd-dt__th--num">#</th>
// 						<th class="cbd-dt__th">Date</th>
// 						<th class="cbd-dt__th">Reference</th>
// 						<th class="cbd-dt__th cbd-dt__th--r">Amount</th>
// 					</tr></thead>
// 					<tbody>${rows}</tbody>
// 				</table>
// 			</div>
// 			</div>
// 			<div class="cbd-dm__sticky-foot">
// 				<table class="cbd-dt cbd-dt--foot-only">
// 					<tfoot><tr>
// 						<td class="cbd-dt__foot" colspan="3" style="font-weight:800">Total</td>
// 						<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(grand)}</td>
// 					</tr></tfoot>
// 				</table>
// 			</div>`;
// 	}

// 	// ─── Topbar: breadcrumb + export buttons (pure HTML, no listeners needed) ──
// 	// ─── Human-readable breadcrumb labels per card type + level ────────────
// 	_dm_breadcrumb_names() {
// 		const type = this._dm_type || 'budget';
// 		const MAP = {
// 			budget:              { p1:'Partner Summary',       p2:'Allocated Budgets',     p3:'Budget Line Items'     },
// 			utilisation:         { p1:'Partner Summary',       p2:'Allocated Budgets',     p3:'Utilisation Details'   },
// 			disbursement:        { p1:'Partner Summary',       p2:'Allocated Budgets',     p3:'Disbursement Log'      },
// 			bank_balance:        { p1:'Bank Balance Overview', p2:'Budget-wise Balances',  p3:null                    },
// 			unutilised_disb:     { p1:'Unutilized Overview',   p2:'Budget-wise Details',   p3:null                    },
// 			unutilised_disb_bal: { p1:'Unutilized Overview',   p2:'Budget-wise Details',   p3:null                    },
// 			pending_util:        { p1:'Pending Utilization',   p2:'Partner Budgets',       p3:null                    },
// 		};
// 		return MAP[type] || { p1:'Summary', p2:'Details', p3:'Line Items' };
// 	}

// 	_dm_topbar(title, p2label, p3label, page, tableId, fname) {
// 		const N = this._dm_breadcrumb_names();

// 		// Page 1 label: "Partner Summary" / "Bank Balance Overview" etc.
// 		// Page 2 label: "Allocated Budgets – [Partner Name]"
// 		// Page 3 label: "Budget Line Items – [Budget Ref]"
// 		const bc_label1 = N.p1;
// 		const bc_label2 = p2label ? `${N.p2} – ${p2label}` : (N.p2 || '');
// 		const bc_label3 = p3label ? `${N.p3} – ${p3label}` : (N.p3 || '');

// 		const bc1 = page === 1
// 			? `<span class="cbd-bc__item cbd-bc__item--active">${frappe.utils.escape_html(bc_label1)}</span>`
// 			: `<button class="cbd-bc__item cbd-bc__item--link" id="cbd_bc_root" title="Back to ${frappe.utils.escape_html(bc_label1)}">${frappe.utils.escape_html(bc_label1)}</button>`;

// 		let bc2 = '', bc3 = '';
// 		if (p2label || page >= 2) {
// 			bc2 = page <= 2
// 				? `<span class="cbd-bc__sep">›</span><span class="cbd-bc__item cbd-bc__item--active">${frappe.utils.escape_html(bc_label2)}</span>`
// 				: `<span class="cbd-bc__sep">›</span><button class="cbd-bc__item cbd-bc__item--link" id="cbd_bc_p2" title="Back to ${frappe.utils.escape_html(bc_label2)}">${frappe.utils.escape_html(bc_label2)}</button>`;
// 		}
// 		if (p3label) {
// 			bc3 = `<span class="cbd-bc__sep">›</span><span class="cbd-bc__item cbd-bc__item--active">${frappe.utils.escape_html(bc_label3)}</span>`;
// 		}

// 		const backBtn = page > 1
// 			? `<button class="cbd-dm__back" id="${page===2?'cbd_bc_root_btn':'cbd_bc_p2_btn'}" title="Go back">
// 				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
// 				Back
// 			</button>`
// 			: '';

// 		// Page-level indicator badge
// 		const pageLabels = ['Partner','Budget','Line Items'];
// 		const pageBadge = `<span class="cbd-dm__page-badge">${pageLabels[page-1] || ''}</span>`;

// 		return `
// 			<div class="cbd-dm__topbar">
// 				<div class="cbd-dm__topbar-left">
// 					${backBtn}
// 					<nav class="cbd-bc">${bc1}${bc2}${bc3}</nav>
// 				</div>
// 				<div class="cbd-dm__actions">
// 					${pageBadge}
// 					<button class="cbd-exp-btn cbd-exp-btn--xls" data-tbl="${tableId}" data-fname="${frappe.utils.escape_html(fname)}">
// 						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
// 						Excel
// 					</button>
// 					<button class="cbd-exp-btn cbd-exp-btn--pdf" data-tbl="${tableId}" data-fname="${frappe.utils.escape_html(fname)}">
// 						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
// 						PDF
// 					</button>
// 				</div>
// 			</div>`;
// 	}
// 	// ─── Export: Excel (CSV fallback) ────────────────────────────────────
// 	_export_excel(tableId, fname) {
// 		const table = document.getElementById(tableId);
// 		if (!table) { frappe.show_alert({message:'Table not ready', indicator:'orange'}); return; }

// 		const _doExport = () => {
// 			try {
// 				// ── Build clean data array from table ──────────────────────
// 				const clone = table.cloneNode(true);
// 				clone.querySelectorAll('td.cbd-dt__act, .cbd-dt__btn, button').forEach(el => {
// 					const td = el.closest('td,th'); if (td) td.remove();
// 				});
// 				const rows = [];
// 				clone.querySelectorAll('tr').forEach(tr => {
// 					rows.push([...tr.querySelectorAll('th,td')].map(c => (c.innerText||'').replace(/\n/g,' ').trim()));
// 				});
// 				if (!rows.length) return;

// 				// ── Create workbook ────────────────────────────────────────
// 				const wb = XLSX.utils.book_new();
// 				const ws = XLSX.utils.aoa_to_sheet(rows);

// 				// ── Styles ────────────────────────────────────────────────
// 				const range = XLSX.utils.decode_range(ws['!ref']);
// 				const HEADER_STYLE = {
// 					font:      { bold:true, color:{ rgb:'FFFFFF' }, sz:11 },
// 					fill:      { patternType:'solid', fgColor:{ rgb:'1E3A5F' } },
// 					alignment: { horizontal:'center', vertical:'center', wrapText:true },
// 					border: {
// 						bottom:{ style:'medium', color:{ rgb:'2563EB' } },
// 						right: { style:'thin',   color:{ rgb:'FFFFFF' } }
// 					}
// 				};
// 				const FOOTER_STYLE = {
// 					font:      { bold:true, color:{ rgb:'1E3A5F' }, sz:11 },
// 					fill:      { patternType:'solid', fgColor:{ rgb:'BFDBFE' } },
// 					alignment: { horizontal:'right' },
// 					border:    { top:{ style:'medium', color:{ rgb:'3B82F6' } } }
// 				};
// 				const ODD_STYLE  = { fill:{ patternType:'solid', fgColor:{ rgb:'FFFFFF' } } };
// 				const EVEN_STYLE = { fill:{ patternType:'solid', fgColor:{ rgb:'EFF6FF' } } };
// 				const NUM_STYLE  = { alignment:{ horizontal:'right' } };

// 				for (let R = range.s.r; R <= range.e.r; R++) {
// 					for (let C = range.s.c; C <= range.e.c; C++) {
// 						const addr = XLSX.utils.encode_cell({r:R, c:C});
// 						const cell = ws[addr];
// 						if (!cell) continue;
// 						if (R === 0) {
// 							cell.s = HEADER_STYLE;
// 						} else if (R === range.e.r) {
// 							cell.s = FOOTER_STYLE;
// 						} else {
// 							const base = R % 2 === 0 ? ODD_STYLE : EVEN_STYLE;
// 							// Try to parse numbers
// 							const v = String(cell.v || '').replace(/[₹,\s]/g,'');
// 							const n = parseFloat(v);
// 							if (!isNaN(n) && v !== '') {
// 								cell.v = n; cell.t = 'n';
// 								cell.z = '#,##0.00';
// 								cell.s = { ...base, ...NUM_STYLE };
// 							} else {
// 								cell.s = base;
// 							}
// 						}
// 					}
// 				}

// 				// ── Column widths ──────────────────────────────────────────
// 				const colW = [];
// 				for (let C = range.s.c; C <= range.e.c; C++) {
// 					let w = 10;
// 					for (let R = range.s.r; R <= range.e.r; R++) {
// 						const cell = ws[XLSX.utils.encode_cell({r:R,c:C})];
// 						if (cell && cell.v) w = Math.max(w, String(cell.v).length + 3);
// 					}
// 					colW.push({ wch: Math.min(w, 45) });
// 				}
// 				ws['!cols'] = colW;
// 				ws['!rows'] = [{ hpt:20 }]; // Header row height

// 				// ── Freeze header row ─────────────────────────────────────
// 				ws['!freeze'] = { xSplit:0, ySplit:1, topLeftCell:'A2', activeCell:'A2', sqref:'A2' };

// 				// ── Sheet title ───────────────────────────────────────────
// 				const sheetName = (fname||'Report').replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,28)||'Data';
// 				XLSX.utils.book_append_sheet(wb, ws, sheetName);
// 				wb.Props = {
// 					Title: fname||'Report',
// 					Author: frappe.session.user || 'Creche Dashboard',
// 					CreatedDate: new Date()
// 				};

// 				XLSX.writeFile(wb, `${fname||'export'}.xlsx`, { bookType:'xlsx', type:'binary', cellStyles:true });
// 				frappe.show_alert({message:`<b>${fname||'Report'}</b> downloaded`, indicator:'green'}, 4);
// 			} catch(err) {
// 				console.error('XLSX error', err);
// 				frappe.show_alert({message:'Export failed: '+err.message, indicator:'red'}, 5);
// 			}
// 		};

// 		if (typeof XLSX !== 'undefined') {
// 			_doExport();
// 		} else {
// 			// Load SheetJS from CDN then export
// 			const s = document.createElement('script');
// 			s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
// 			s.onload  = _doExport;
// 			s.onerror = () => frappe.show_alert({message:'Could not load Excel library', indicator:'red'}, 5);
// 			document.head.appendChild(s);
// 		}
// 	}

// 	// ─── Export: PDF ─────────────────────────────────────────────────────
// 	_export_pdf(tableId, fname) {
// 		const table = document.getElementById(tableId);
// 		if (!table) { frappe.show_alert({message:'Table not ready — try again in a moment', indicator:'orange'}); return; }
// 		const title = (fname || 'Report').replace(/_/g,' ');
// 		const clone = table.cloneNode(true);
// 		// strip action columns
// 		clone.querySelectorAll('td.cbd-dt__act, th:last-child').forEach(el => el.remove());
// 		const win = window.open('', '_blank');
// 		if (!win) { frappe.show_alert({message:'Allow pop-ups to export PDF', indicator:'orange'}); return; }
// 		win.document.write(`<!DOCTYPE html><html><head>
// 			<meta charset="utf-8"><title>${title}</title>
// 			<style>
// 				* { box-sizing:border-box; margin:0; padding:0; }
// 				body { font-family:Arial,sans-serif; font-size:11px; padding:16px; color:#111; }
// 				h2   { font-size:14px; font-weight:700; margin-bottom:10px; color:#1e40af; border-bottom:2px solid #1e40af; padding-bottom:6px; }
// 				p.meta { font-size:10px; color:#6b7280; margin-bottom:12px; }
// 				table { border-collapse:collapse; width:100%; }
// 				th    { background:#1e40af; color:#fff; padding:6px 8px; text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:.4px; }
// 				td    { padding:6px 8px; border-bottom:1px solid #e5e7eb; vertical-align:middle; }
// 				tr:nth-child(even) td { background:#f8fafc; }
// 				tfoot td { font-weight:700; background:#eff6ff; border-top:2px solid #93c5fd; }
// 				@media print { @page { margin:12mm; size:A4 landscape; } }
// 			</style>
// 		</head><body>
// 			<h2>${title}</h2>
// 			<p class="meta">Exported: ${new Date().toLocaleString('en-IN')}</p>
// 			${clone.outerHTML}
// 		</body></html>`);
// 		win.document.close();
// 		setTimeout(() => { win.focus(); win.print(); }, 500);
// 	}


// 	// ─────────────────────────────────────────────────────────────────────────
// 	// BUDGET MODAL  — single container, two pages, slide transition
// 	// ─────────────────────────────────────────────────────────────────────────

// 	_open_budget_summary_modal() {
// 		const old = document.getElementById('cbd_budget_modal_wrap');
// 		if (old) old.remove();

// 		const wrap = document.createElement('div');
// 		wrap.id        = 'cbd_budget_modal_wrap';
// 		wrap.className = 'cbd-sm-wrap';
// 		wrap.innerHTML = `
// 			<div class="cbd-sm-modal cbd-bm__modal">
// 				<div class="cbd-bm__viewport">
// 					<div class="cbd-bm__page" id="cbd_bm_page1"></div>
// 					<div class="cbd-bm__page cbd-bm__page--detail" id="cbd_bm_page2"></div>
// 				</div>
// 			</div>`;

// 		document.body.appendChild(wrap);
// 		requestAnimationFrame(() => wrap.classList.add('cbd-sm-wrap--open'));

// 		// Esc key closes entirely
// 		const _esc = (e) => { if (e.key === 'Escape') this._close_budget_modal(); };
// 		document.addEventListener('keydown', _esc);
// 		wrap._escHandler = _esc;
// 		wrap.addEventListener('click', (e) => { if (e.target === wrap) this._close_budget_modal(); });

// 		this._render_budget_page1();
// 	}

// 	_close_budget_modal() {
// 		const wrap = document.getElementById('cbd_budget_modal_wrap');
// 		if (!wrap) return;
// 		wrap.classList.remove('cbd-sm-wrap--open');
// 		wrap.addEventListener('transitionend', () => wrap.remove(), { once: true });
// 		if (wrap._escHandler) document.removeEventListener('keydown', wrap._escHandler);
// 	}

// 	_render_budget_page1() {
// 		const page1 = document.getElementById('cbd_bm_page1');
// 		if (!page1) return;
// 		const modal = page1.closest('.cbd-bm__modal');
// 		modal.classList.remove('cbd-bm__modal--detail');

// 		const partners = this._all_partners || [];
// 		const grand    = partners.reduce((s,p) => s + (parseFloat(p.total_budget)||0), 0);

// 		const rows = partners.map((p, idx) => {
// 			const bud   = parseFloat(p.total_budget) || 0;
// 			const pname = frappe.utils.escape_html(p.partner_name||'—');
// 			return `
// 			<tr>
// 				<td class="cbd-st__num">${idx + 1}</td>
// 				<td class="cbd-st__cell">${pname}</td>
// 				<td class="cbd-st__cell cbd-st__r">${this._fmtTip(bud,'Approved Budget')}</td>
// 				<td class="cbd-st__cell cbd-st__action">
// 					<button class="cbd-st__drill-btn" data-idx="${idx}">View in Detail</button>
// 				</td>
// 			</tr>`;
// 		}).join('');

// 		const tfoot = `
// 			<tr>
// 				<td class="cbd-st__foot" colspan="2">Grand Total</td>
// 				<td class="cbd-st__foot cbd-st__r">${this._fmtTip(grand,'Total Approved Budget')}</td>
// 				<td class="cbd-st__foot"></td>
// 			</tr>`;

// 		page1.innerHTML = `
// 			<div class="cbd-bm__topbar">
// 				<nav class="cbd-bc">
// 					<span class="cbd-bc__item cbd-bc__item--root">Total Budget</span>
// 				</nav>
// 				<button class="cbd-bm__close" id="cbd_bm_close1" title="Close">
// 					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
// 				</button>
// 			</div>
// 			<div class="cbd-bm__body">
// 				<div class="cbd-sm-tbl-wrap">
// 					<table class="cbd-st">
// 						<thead>
// 							<tr>
// 								<th class="cbd-st__th cbd-st__th--num">#</th>
// 								<th class="cbd-st__th">Partner</th>
// 								<th class="cbd-st__th cbd-st__th--r">Approved Budget</th>
// 								<th class="cbd-st__th" style="width:120px"></th>
// 							</tr>
// 						</thead>
// 						<tbody>${rows}</tbody>
// 						<tfoot>${tfoot}</tfoot>
// 					</table>
// 				</div>
// 			</div>`;

// 		page1.querySelector('#cbd_bm_close1').addEventListener('click', () => this._close_budget_modal());
// 		page1.addEventListener('click', (e) => {
// 			const btn = e.target.closest('.cbd-st__drill-btn');
// 			if (!btn) return;
// 			const partner = (this._all_partners || [])[parseInt(btn.dataset.idx)];
// 			if (partner) this._render_budget_page2(partner);
// 		});
// 	}

// 		_render_budget_page2(partner) {
// 		const page2 = document.getElementById('cbd_bm_page2');
// 		if (!page2) return;
// 		const modal = page2.closest('.cbd-bm__modal');
// 		modal.classList.add('cbd-bm__modal--detail');

// 		const budgets = partner.budgets || [];
// 		const grand   = budgets.reduce((s,b) => s + (parseFloat(b.budget)||0), 0);
// 		const pname   = frappe.utils.escape_html(partner.partner_name||'Partner');

// 		const rows = budgets.map((b, i) => `
// 			<tr>
// 				<td class="cbd-st__num">${i + 1}</td>
// 				<td class="cbd-st__cell">${frappe.utils.escape_html(b.budget_reference_name||'—')}</td>
// 				<td class="cbd-st__cell cbd-st__r">${this._fmtTip(b.budget,'Approved Budget')}</td>
// 			</tr>`).join('');

// 		const tfoot = `
// 			<tr>
// 				<td class="cbd-st__foot" colspan="2">Total</td>
// 				<td class="cbd-st__foot cbd-st__r">${this._fmtTip(grand,'Total Approved Budget')}</td>
// 			</tr>`;

// 		page2.innerHTML = `
// 			<div class="cbd-bm__topbar">
// 				<nav class="cbd-bc">
// 					<button class="cbd-bc__item cbd-bc__item--link" id="cbd_bm_back">Total Budget</button>
// 					<span class="cbd-bc__sep">›</span>
// 					<span class="cbd-bc__item cbd-bc__item--active">${pname}</span>
// 				</nav>
// 				<button class="cbd-bm__close" id="cbd_bm_close2" title="Close">
// 					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
// 				</button>
// 			</div>
// 			<div class="cbd-bm__body">
// 				<div class="cbd-sm-tbl-wrap">
// 					<table class="cbd-st">
// 						<thead>
// 							<tr>
// 								<th class="cbd-st__th cbd-st__th--num">#</th>
// 								<th class="cbd-st__th">Budget Reference</th>
// 								<th class="cbd-st__th cbd-st__th--r">Approved Budget</th>
// 							</tr>
// 						</thead>
// 						<tbody>${rows}</tbody>
// 						<tfoot>${tfoot}</tfoot>
// 					</table>
// 				</div>
// 			</div>`;

// 		page2.querySelector('#cbd_bm_close2').addEventListener('click', () => this._close_budget_modal());
// 		page2.querySelector('#cbd_bm_back').addEventListener('click', () => this._render_budget_page1());
// 	}

// 	_render_overview_strip(partners) {
// 		const el = document.getElementById('cbd_overview_strip');
// 		if (!el) return;
// 		if (!partners.length) { el.style.display = 'none'; return; }

// 		const num_partners  = partners.length;
// 		const num_budgets   = partners.reduce((s,p) => s+(p.budgets||[]).length, 0);
// 		const total_creches = partners.reduce((s,p) => s+(p.total_creches||0), 0);
// 		const all_states    = [...new Set(partners.flatMap(p=>(p.budgets||[]).map(b=>b.state).filter(Boolean)))].sort();
// 		const all_districts = [...new Set(partners.flatMap(p=>(p.budgets||[]).flatMap(b=>b.district?[b.district]:[])))].sort();
// 		const all_blocks    = [...new Set(partners.flatMap(p=>(p.budgets||[]).flatMap(b=>b.block?[b.block]:[])))].sort();
// 		const total_budget_amt = partners.reduce((s,p)=>s+(parseFloat(p.total_budget)||0),0);
// 		const avg_creche_per_partner = num_partners>0 ? (total_creches/num_partners) : 0;
// 		const avg_budget_per_creche  = total_creches>0 ? (total_budget_amt/total_creches) : 0;

// 		const partner_rows = partners.map(p => ({ name: p.partner_name }));

// 		const budget_rows = partners.flatMap(p =>
// 			(p.budgets||[]).map(b => ({ ref: b.budget_reference_name, creches: b.no_of_creches || 0 }))
// 		);

// 		const stats = [
// 			{
// 				key:'partners', value:num_partners, rawCount: num_partners,
// 				label:'Partner'+(num_partners!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
// 				drillData: partner_rows,
// 				drillType: 'partners',
// 			},
// 			{
// 				key:'budgets', value:num_budgets, rawCount: num_budgets,
// 				label:'Allocated Budget'+(num_budgets!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
// 				drillData: budget_rows,
// 				drillType: 'budgets',
// 			},
// 			{
// 				key:'creches', value:total_creches.toLocaleString('en-IN'), rawCount: total_creches,
// 				label:'Total Creche'+(total_creches!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
// 				drillData: budget_rows,
// 				drillType: 'creches',
// 			},
// 			{
// 				key:'states', value:all_states.length, rawCount: all_states.length,
// 				label:'Working State'+(all_states.length!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
// 				drillData: all_states,
// 				drillType: 'states',
// 			},
// 			{
// 				key:'districts', value:all_districts.length, rawCount: all_districts.length,
// 				label:'District'+(all_districts.length!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
// 				drillData: all_districts,
// 				drillType: 'districts',
// 			},
// 			{
// 				key:'blocks', value:all_blocks.length, rawCount: all_blocks.length,
// 				label:'Block'+(all_blocks.length!==1?'s':''),
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
// 				drillData: all_blocks,
// 				drillType: 'blocks',
// 			},
// 			{
// 				key:'avg_creche', value:avg_creche_per_partner.toFixed(1), rawCount: avg_creche_per_partner,
// 				label:'Avg Creches / Partner',
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
// 				drillData: [], drillType: 'avg_creche', noDrill: true,
// 			},
// 			{
// 				key:'avg_budget', value:this._fmt(avg_budget_per_creche), rawCount: avg_budget_per_creche,
// 				label:'Avg Budget / Creche',
// 				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
// 				drillData: [], drillType: 'avg_budget', noDrill: true,
// 			},
// 		];

// 		// Accent colours per stat card
// 		const OSTAT_PALETTE = {
// 			partners:   { color:'#6366F1', ibg:'#EEF2FF' },
// 			budgets:    { color:'#2563EB', ibg:'#DBEAFE' },
// 			creches:    { color:'#0891B2', ibg:'#CFFAFE' },
// 			states:     { color:'#059669', ibg:'#D1FAE5' },
// 			districts:  { color:'#D97706', ibg:'#FEF3C7' },
// 			blocks:     { color:'#DB2777', ibg:'#FCE7F3' },
// 			avg_creche: { color:'#7C3AED', ibg:'#EDE9FE' },
// 			avg_budget: { color:'#EA580C', ibg:'#FFEDD5' },
// 		};
// 		el.style.display = '';
// 		const _ohd = document.getElementById('cbd_overview_hd');
// 		if (_ohd) _ohd.style.display = '';
// 		const _shd = document.getElementById('cbd_summary_hd');
// 		if (_shd) _shd.style.display = '';
// 		el.innerHTML = stats.map(s => {
// 			const pal = OSTAT_PALETTE[s.key] || { color:'#6366F1', ibg:'#EEF2FF' };
// 			const clickableCls = s.noDrill ? '' : 'cbd-ostat--clickable';
// 			const arrowSvg = s.noDrill ? '' : `<svg class="cbd-ostat__arrow" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
// 			return `
// 			<div class="cbd-ostat ${clickableCls}" data-key="${s.key}" title="${s.label}"
// 			     style="--card-accent:${pal.color};--ost-ibg:${pal.ibg}">
// 				<span class="cbd-ostat__icon">${s.icon}</span>
// 				<div class="cbd-ostat__body">
// 					<div class="cbd-ostat__value">${s.value}</div>
// 					<div class="cbd-ostat__label">${s.label}</div>
// 				</div>
// 				${arrowSvg}
// 			</div>`;
// 		}).join('');

// 		el.querySelectorAll('.cbd-ostat--clickable').forEach(card => {
// 			const key  = card.dataset.key;
// 			const stat = stats.find(s => s.key === key);
// 			if (!stat || stat.noDrill) return;
// 			card.addEventListener('click', () => this._open_ostat_drill(stat));
// 		});
// 	}

// 	_open_ostat_drill(stat) {
// 		const old = document.getElementById('cbd_drill_modal_wrap');
// 		if (old) old.remove();

// 		const wrap = document.createElement('div');
// 		wrap.id        = 'cbd_drill_modal_wrap';
// 		wrap.className = 'cbd-drill-modal-wrap';

// 		const rawCount = stat.rawCount !== undefined ? stat.rawCount : stat.value;
// 		const accentMap = { partners:'indigo', budgets:'blue', creches:'teal', states:'orange', districts:'violet', blocks:'rose' };
// 		const accent = accentMap[stat.drillType] || 'blue';

// 		wrap.innerHTML = `
// 			<div class="cbd-drill-modal cbd-drill-modal--narrow cbd-drill-modal--${accent}">
// 				<div class="cbd-drill-modal__header">
// 					<div class="cbd-drill-modal__header-left">
// 						<span class="cbd-drill-modal__icon">${stat.icon}</span>
// 						<div>
// 							<div class="cbd-drill-modal__title">${frappe.utils.escape_html(stat.label)}</div>
// 							<div class="cbd-drill-modal__sub">${stat.value} record${rawCount != 1 ? 's' : ''}</div>
// 						</div>
// 					</div>
// 					<button class="cbd-drill-modal__close" id="cbd_drill_close" title="Close">
// 						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
// 					</button>
// 				</div>
// 				<div class="cbd-drill-modal__body">${this._build_ostat_content(stat)}</div>
// 				<div class="cbd-drill-modal__footer">
// 					<button class="btn btn-default btn-sm" id="cbd_drill_footer_close">Close</button>
// 				</div>
// 			</div>`;

// 		document.body.appendChild(wrap);
// 		wrap.addEventListener('click', (e) => { if (e.target === wrap) this._close_drill_panel(); });
// 		wrap.querySelector('#cbd_drill_close').addEventListener('click', () => this._close_drill_panel());
// 		wrap.querySelector('#cbd_drill_footer_close').addEventListener('click', () => this._close_drill_panel());
// 		this._drill_key_handler = (e) => { if (e.key === 'Escape') this._close_drill_panel(); };
// 		document.addEventListener('keydown', this._drill_key_handler);
// 		requestAnimationFrame(() => wrap.classList.add('cbd-drill-modal-wrap--open'));
// 	}

// 	_close_drill_panel() {
// 		const wrap = document.getElementById('cbd_drill_modal_wrap');
// 		if (!wrap) return;
// 		wrap.classList.remove('cbd-drill-modal-wrap--open');
// 		wrap.addEventListener('transitionend', () => wrap.remove(), { once: true });
// 		if (this._drill_key_handler) {
// 			document.removeEventListener('keydown', this._drill_key_handler);
// 			this._drill_key_handler = null;
// 		}
// 	}

// 	// ─────────────────────────────────────────────
// 	// DRILL-DOWN CONTENT — each card shows only its own relevant data
// 	// ─────────────────────────────────────────────

// 	_build_ostat_content(stat) {
// 		const { drillType, drillData } = stat;

// 		if (!drillData || !drillData.length)
// 			return '<div class="cbd-drill-empty">No data available.</div>';

// 		// Each card gets its own colour palette
// 		const PALETTE = {
// 			partners:  { hdr:'#4F46E5', hdrText:'#fff',  badge:'#EEF2FF', badgeText:'#3730A3', dot:'#818CF8' },
// 			budgets:   { hdr:'#0369A1', hdrText:'#fff',  badge:'#E0F2FE', badgeText:'#075985', dot:'#38BDF8' },
// 			creches:   { hdr:'#0D9488', hdrText:'#fff',  badge:'#CCFBF1', badgeText:'#115E59', dot:'#2DD4BF' },
// 			states:    { hdr:'#B45309', hdrText:'#fff',  badge:'#FEF3C7', badgeText:'#92400E', dot:'#FBBF24' },
// 			districts: { hdr:'#7C3AED', hdrText:'#fff',  badge:'#EDE9FE', badgeText:'#4C1D95', dot:'#A78BFA' },
// 			blocks:    { hdr:'#BE185D', hdrText:'#fff',  badge:'#FCE7F3', badgeText:'#831843', dot:'#F472B6' },
// 		};
// 		const p = PALETTE[drillType] || PALETTE.partners;

// 		// ── Partners: #  | Partner Name ─────────────────────────────
// 		if (drillType === 'partners') {
// 			const rows = drillData.map((item, i) => `
// 				<tr>
// 					<td class="cbd-dt2__num" style="background:${p.badge};color:${p.badgeText}">${i + 1}</td>
// 					<td class="cbd-dt2__cell">${frappe.utils.escape_html(item.name)}</td>
// 				</tr>`).join('');
// 			return `
// 				<table class="cbd-dt2" style="--dt2-hdr:${p.hdr};--dt2-hdr-text:${p.hdrText};--dt2-dot:${p.dot}">
// 					<thead><tr>
// 						<th class="cbd-dt2__th-num">#</th>
// 						<th class="cbd-dt2__th">Partner Name</th>
// 					</tr></thead>
// 					<tbody>${rows}</tbody>
// 				</table>`;
// 		}

// 		// ── Budgets: #  | Budget Reference ─────────────────────────
// 		if (drillType === 'budgets') {
// 			const rows = drillData.map((item, i) => `
// 				<tr>
// 					<td class="cbd-dt2__num" style="background:${p.badge};color:${p.badgeText}">${i + 1}</td>
// 					<td class="cbd-dt2__cell">${frappe.utils.escape_html(item.ref || '—')}</td>
// 				</tr>`).join('');
// 			return `
// 				<table class="cbd-dt2" style="--dt2-hdr:${p.hdr};--dt2-hdr-text:${p.hdrText};--dt2-dot:${p.dot}">
// 					<thead><tr>
// 						<th class="cbd-dt2__th-num">#</th>
// 						<th class="cbd-dt2__th">Budget Reference</th>
// 					</tr></thead>
// 					<tbody>${rows}</tbody>
// 				</table>`;
// 		}

// 		// ── Creches: #  | Budget Reference  | Creches ───────────────
// 		if (drillType === 'creches') {
// 			const rows = drillData.map((item, i) => `
// 				<tr>
// 					<td class="cbd-dt2__num" style="background:${p.badge};color:${p.badgeText}">${i + 1}</td>
// 					<td class="cbd-dt2__cell">${frappe.utils.escape_html(item.ref || '—')}</td>
// 					<td class="cbd-dt2__badge-cell">
// 						${item.creches ? `<span class="cbd-dt2__pill" style="background:${p.badge};color:${p.badgeText};border-color:${p.dot}">${item.creches.toLocaleString('en-IN')}</span>` : '—'}
// 					</td>
// 				</tr>`).join('');
// 			return `
// 				<table class="cbd-dt2" style="--dt2-hdr:${p.hdr};--dt2-hdr-text:${p.hdrText};--dt2-dot:${p.dot}">
// 					<thead><tr>
// 						<th class="cbd-dt2__th-num">#</th>
// 						<th class="cbd-dt2__th">Budget Reference</th>
// 						<th class="cbd-dt2__th cbd-dt2__th--r">Creches</th>
// 					</tr></thead>
// 					<tbody>${rows}</tbody>
// 				</table>`;
// 		}

// 		// ── States / Districts / Blocks: #  | Name ──────────────────
// 		if (drillType === 'states' || drillType === 'districts' || drillType === 'blocks') {
// 			const label = drillType === 'states' ? 'State' : drillType === 'districts' ? 'District' : 'Block';
// 			const rows = drillData.map((item, i) => `
// 				<tr>
// 					<td class="cbd-dt2__num" style="background:${p.badge};color:${p.badgeText}">${i + 1}</td>
// 					<td class="cbd-dt2__cell">${frappe.utils.escape_html(item)}</td>
// 				</tr>`).join('');
// 			return `
// 				<table class="cbd-dt2" style="--dt2-hdr:${p.hdr};--dt2-hdr-text:${p.hdrText};--dt2-dot:${p.dot}">
// 					<thead><tr>
// 						<th class="cbd-dt2__th-num">#</th>
// 						<th class="cbd-dt2__th">${label} Name</th>
// 					</tr></thead>
// 					<tbody>${rows}</tbody>
// 				</table>`;
// 		}

// 		return '<div class="cbd-drill-empty">No details available.</div>';
// 	}


// 	render_partners(partners) {
// 		this._all_partners = partners || [];
// 		this._render_overview_strip(partners || []);
// 		// Partner cards removed — breakdown now lives in the summary modal
// 	}

// 	_render_partners_OLD_UNUSED(partners) {
// 		const el = document.getElementById('cbd_partners');
// 		if (!partners || !partners.length) { el.innerHTML = '<div class="cbd-empty">No partner data available.</div>'; return; }
// 		el.innerHTML = '';
// 		partners.forEach((partner, idx) => {
// 			const u_pct = parseFloat(partner.utilised_pct)||0;
// 			const badge_cls = this._badge_cls(u_pct); const fill_cls = this._fill_cls(u_pct);
// 			const total_creches = (partner.budgets||[]).reduce((s,b)=>s+(parseInt(b.no_of_creches)||0),0);
// 			const states = [...new Set((partner.budgets||[]).map(b=>b.state).filter(Boolean))].sort();
// 			const refs   = [...new Set((partner.budgets||[]).map(b=>b.budget_reference_name).filter(Boolean))].sort();
// 			const state_tags = states.length ? states.map(s=>`<span class="cbd-stag cbd-stag--blue"><span class="cbd-stag__dot cbd-stag__dot--blue"></span>${frappe.utils.escape_html(s)}</span>`).join('') : '<span class="cbd-stag cbd-stag--gray">—</span>';
// 			const ref_tags = refs.length ? refs.map(r=>`<span class="cbd-stag cbd-stag--purple"><span class="cbd-stag__dot cbd-stag__dot--purple"></span>${frappe.utils.escape_html(r)}</span>`).join('') : '<span class="cbd-stag cbd-stag--gray">—</span>';
// 			const budget_ids_str = frappe.utils.escape_html((partner.budgets||[]).map(b=>b.budget_id).join(','));
// 			const partner_id_esc = frappe.utils.escape_html(partner.partner_id||'');
// 			const partner_name_esc = frappe.utils.escape_html(partner.partner_name||'');
// 			const card = document.createElement('div');
// 			card.className = 'cbd-partner';
// 			card.innerHTML = `
// 				<div class="cbd-partner__head" id="cbd_ph_${idx}">
// 					<div class="cbd-partner__left">
// 						<div class="cbd-partner__name">${this._icon_partner()}${partner_name_esc}</div>
// 						<div class="cbd-partner__grants">Grants: ${frappe.utils.escape_html(partner.grant_ids||'—')}</div>
// 						<div class="cbd-partner__metrics">
// 							${this._metric('Budget',null,partner.total_budget)}
// 							${this._metric('Disbursed',null,partner.total_disbursement)}
// 							${this._metric('Utilised',null,partner.total_utilisation)}
// 							${this._metric('Bal. Budget',null,partner.total_balance_budget)}
// 							${this._metric('Bank Bal.',null,partner.total_bank_balance)}
// 							${this._metric('Interest',null,partner.total_interest)}
// 							${this._metric('Total Creches',total_creches)}
// 							${this._metric_pct('Util % of Budget',u_pct)}
// 							${this._metric_pct('Util % vs Disbursed',this._util_vs_disb_pct(partner))}
// 						</div>
// 						<div class="cbd-partner__footer">
// 							<div class="cbd-footer-block"><div class="cbd-footer-block__label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>Operating States</div><div class="cbd-footer-block__tags">${state_tags}</div></div>
// 							<div class="cbd-footer-block"><div class="cbd-footer-block__label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Budget References</div><div class="cbd-footer-block__tags">${ref_tags}</div></div>
// 						</div>
// 						<div class="cbd-prog" style="margin-top:7px"><div class="cbd-prog__fill cbd-prog__fill--${fill_cls}" style="width:${Math.min(u_pct,100)}%"></div></div>
// 					</div>
// 					<div class="cbd-partner__right">
// 						<div class="cbd-badge cbd-badge--${badge_cls}">${u_pct.toFixed(1)}% utilised</div>
// 						<div class="cbd-partner__btn-group">
// 							<button class="cbd-consolidated-btn cbd-icon-btn" title="View Consolidated Budget &amp; Utilisation" data-partner-name="${partner_name_esc}" data-budget-ids="${budget_ids_str}" data-grant-start="${frappe.utils.escape_html((partner.budgets||[]).map(b=>b.grant_start).filter(Boolean).sort()[0]||'')}" data-grant-end="${frappe.utils.escape_html((partner.budgets||[]).map(b=>b.grant_end).filter(Boolean).sort().reverse()[0]||'')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
// 							<button class="cbd-disb-btn cbd-icon-btn" title="View Disbursements" data-partner-name="${partner_name_esc}" data-partner-id="${partner_id_esc}" data-budget-ids="${budget_ids_str}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg></button>
// 						</div>
// 						<div class="cbd-chevron" id="cbd_chv_${idx}">&#9654;</div>
// 					</div>
// 				</div>
// 				<div class="cbd-partner__body" id="cbd_pb_${idx}">${this._build_table(partner.budgets||[], partner.partner_name||'')}</div>`;
// 			el.appendChild(card);
// 			card.querySelector(`#cbd_ph_${idx}`).addEventListener('click', (e) => {
// 				if (e.target.closest('.cbd-consolidated-btn')||e.target.closest('.cbd-disb-btn')) return;
// 				const body = document.getElementById(`cbd_pb_${idx}`); const chv = document.getElementById(`cbd_chv_${idx}`);
// 				const open = body.style.display === 'block';
// 				body.style.display = open ? 'none' : 'block'; chv.classList.toggle('cbd-chevron--open', !open);
// 			});
// 		});

// 		this._bind_view_buttons();
// 	}

// 	_build_table(budgets, partner_name) {
// 		if (!budgets.length) return '<div class="cbd-empty">No budget rows.</div>';
// 		const rows = budgets.map(r => {
// 			const u_pct = parseFloat(r.utilised_pct)||0; const ud_pct = parseFloat(r.utilised_disbursement_pct)||0;
// 			return `<tr>
// 				<td><span class="cbd-chip cbd-chip--blue">${frappe.utils.escape_html(r.budget_reference_name||'—')}</span></td>
// 				<td><span class="cbd-chip cbd-chip--teal">${frappe.utils.escape_html(r.grant_id||'—')}</span></td>
// 				<td>${frappe.utils.escape_html(r.financial_year||'—')}</td>
// 				<td>${frappe.utils.escape_html(r.state||'—')}</td>
// 				<td>${this._date(r.grant_start)}</td><td>${this._date(r.grant_end)}</td>
// 				<td class="cbd-r">${r.no_of_creches||0}</td>
// 				<td class="cbd-r">${this._fmtTip(r.budget)}</td>
// 				<td class="cbd-r">${this._fmtTip(r.disbursement)}</td>
// 				<td class="cbd-r">${this._fmtTip(r.utilisation)}</td>
// 				<td class="cbd-r"><span class="cbd-chip cbd-chip--${this._chip_cls(u_pct)}">${u_pct.toFixed(1)}%</span></td>
// 				<td class="cbd-r"><span class="cbd-chip cbd-chip--${this._chip_cls(ud_pct)}">${ud_pct.toFixed(1)}%</span></td>
// 				<td class="cbd-r">${this._fmtTip(r.balance_budget_amount)}</td>
// 				<td class="cbd-r">${this._fmtTip(r.bank_balance)}</td>
// 				<td class="cbd-r">${this._fmtTip(r.interest_from_bank)}</td>
// 				<td class="cbd-actions-cell">
// 					<button class="cbd-view-btn cbd-icon-btn" title="View Line Items" data-budget-id="${frappe.utils.escape_html(r.budget_id)}" data-ref-name="${frappe.utils.escape_html(r.budget_reference_name||'')}" data-grant-start="${frappe.utils.escape_html(r.grant_start||'')}" data-grant-end="${frappe.utils.escape_html(r.grant_end||'')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
// 					<button class="cbd-row-disb-btn cbd-icon-btn" title="View Disbursements" data-budget-id="${frappe.utils.escape_html(r.budget_id)}" data-ref-name="${frappe.utils.escape_html(r.budget_reference_name||'')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg></button>
// 				</td>
// 			</tr>`;
// 		}).join('');
// 		return `<div class="cbd-tbl-wrap"><table class="cbd-table" role="table" aria-label="Budget rows for ${frappe.utils.escape_html(partner_name)}"><thead><tr><th>Reference</th><th>Grant ID</th><th>FY</th><th>State</th><th>Start</th><th>End</th><th class="cbd-r">Creches</th><th class="cbd-r">Budget</th><th class="cbd-r">Disbursed</th><th class="cbd-r">Utilised</th><th class="cbd-r">Util %</th><th class="cbd-r">Util vs Disb.</th><th class="cbd-r">Bal. Budget</th><th class="cbd-r">Bank Bal.</th><th class="cbd-r">Interest</th><th class="cbd-actions-col">Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
// 	}

// 	_open_disbursement_panel(title, budget_ids, partner_ids) {
// 		const overlay = document.getElementById('cbd_disb_overlay'); const panel = document.getElementById('cbd_disb_modal');
// 		overlay.classList.add('cbd-disb-overlay--active'); panel.classList.add('cbd-disb-modal--open');
// 		panel.innerHTML = `<div class="cbd-panel__header"><div><div class="cbd-panel__title"><span class="cbd-panel__disb-badge">Disbursement</span></div><div class="cbd-panel__sub">${frappe.utils.escape_html(title)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label" title="Expand / collapse all partners"><input type="checkbox" class="cbd-expand-chk" id="cbd_disb_expand_all">Expand all</label><button class="cbd-panel__close" id="cbd_close_disb" title="Close">&#10005;</button></div></div><div class="cbd-panel__body" id="cbd_disb_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_disb_total" style="display:none"><span>Grand Total Disbursed</span><span id="cbd_disb_total_val">—</span></div>`;
// 		document.getElementById('cbd_close_disb').addEventListener('click', () => this._close_disb_panel());
// 		document.getElementById('cbd_disb_expand_all').addEventListener('change', (e) => {
// 			const expand = e.target.checked; const body = document.getElementById('cbd_disb_body'); if (!body) return;
// 			body.querySelectorAll('.cbd-item-group__body').forEach(b=>b.classList.toggle('cbd-item-group__body--collapsed',!expand));
// 			body.querySelectorAll('.cbd-igh-chevron').forEach(chv=>{chv.style.transform=expand?'':'rotate(-90deg)';});
// 		});
// 		this._load_disbursement_panel_data(budget_ids, partner_ids);
// 	}

// 	_close_disb_panel() {
// 		const panel = document.getElementById('cbd_disb_modal'); const overlay = document.getElementById('cbd_disb_overlay');
// 		if (panel) panel.classList.remove('cbd-disb-modal--open');
// 		if (overlay) overlay.classList.remove('cbd-disb-overlay--active');
// 	}

// 	_load_disbursement_panel_data(budget_ids, partner_ids) {
// 		const pf = this._panel_filters();
// 		frappe.call({
// 			method: 'creche_reports.api.budget_utilisation_summary.get_disbursement_panel_data',
// 			args: { budget_ids: budget_ids?JSON.stringify(budget_ids):null, partner_ids:partner_ids?JSON.stringify(partner_ids):null, start_date:pf.start_date||null, end_date:pf.end_date||null, financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null, month:pf.month?JSON.stringify(pf.month):null },
// 			callback: (r) => {
// 				const records = r.message||[]; const body = document.getElementById('cbd_disb_body'); if (!body) return;
// 				const flt = v=>parseFloat(v)||0;
// 				if (!records.length) { body.innerHTML='<div class="cbd-panel-empty">No disbursement records found.</div>'; return; }
// 				const by_partner = {};
// 				records.forEach(doc=>{ const key=doc.partner_id||doc.partner_name||'Unknown'; if(!by_partner[key]) by_partner[key]={name:doc.partner_name||doc.partner_id||'Unknown',docs:[],total:0}; by_partner[key].docs.push(doc); by_partner[key].total+=flt(doc.total_disbursement); });
// 				const grand_total = Object.values(by_partner).reduce((s,p)=>s+p.total,0);
// 				body.innerHTML='';
// 				Object.values(by_partner).forEach((partner,pidx)=>{
// 					const p_id=`cbd_dp_${pidx}`; const grp=document.createElement('div'); grp.className='cbd-item-group';
// 					grp.innerHTML=`<div class="cbd-item-group__head cbd-item-group__head--toggle cbd-dt__p-head" id="cbd_ph_d${pidx}"><div class="cbd-igh-left"><span class="cbd-igh-chevron">&#9660;</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><span>${frappe.utils.escape_html(partner.name)}</span><span class="cbd-dt__partner-count">${partner.docs.length} budget${partner.docs.length!==1?'s':''}</span></div><span class="cbd-item-group__total">${this._fmtTip(partner.total,'Partner Total')}</span></div><div class="cbd-item-group__body" id="${p_id}"><div class="cbd-dt-wrap"><table class="cbd-dt" id="cbd_dt_${pidx}"><thead><tr class="cbd-dt__head-row"><th style="width:32px"></th><th>Reference</th><th>Grant ID</th><th>State</th><th>FY</th><th class="cbd-li-r">Budget</th><th class="cbd-li-r">Disbursed</th><th class="cbd-li-r">Balance</th><th class="cbd-li-r">%</th></tr></thead><tbody id="cbd_dtb_${pidx}"></tbody></table></div><div class="cbd-dt__subtotal-row"><span class="cbd-dt__subtotal-label">Partner Total</span><span style="font-weight:700;color:#0C447C">${this._fmtTip(partner.total,'Partner Total')}</span></div></div>`;
// 					body.appendChild(grp);
// 					grp.querySelector(`#cbd_ph_d${pidx}`).addEventListener('click',()=>{const pb=document.getElementById(p_id);const chv=grp.querySelector('.cbd-igh-chevron');const collapsed=pb.classList.toggle('cbd-item-group__body--collapsed');chv.style.transform=collapsed?'rotate(-90deg)':'';});
// 					const tbody=grp.querySelector(`#cbd_dtb_${pidx}`);
// 					partner.docs.forEach((doc,bidx)=>{
// 						const b_pct=flt(doc.total_budget)>0?Math.min((flt(doc.total_disbursement)/flt(doc.total_budget))*100,100):0;
// 						const pct_cls=b_pct>=80?'green':b_pct>=50?'amber':'red'; const d_id=`cbd_dtr_${pidx}_${bidx}`;
// 						const b_row=document.createElement('tr'); b_row.className='cbd-dt__b-row';
// 						b_row.innerHTML=`<td style="width:32px;text-align:center;border-right:1px solid var(--border-color,#d1d8dd)"><span class="cbd-dt__chevron" style="font-size:9px;color:var(--text-muted,#8d99a6)">&#9654;</span></td><td class="cbd-dt__ref-cell">${frappe.utils.escape_html(doc.budget_reference_name||doc.budget_reference_id||'—')}</td><td>${doc.grant_id?`<span class="cbd-dt__tag cbd-dt__tag--teal">${frappe.utils.escape_html(doc.grant_id)}</span>`:'—'}</td><td>${frappe.utils.escape_html(doc.state||'—')}</td><td>${frappe.utils.escape_html(doc.financial_year||'—')}</td><td class="cbd-li-r">${this._fmt(doc.total_budget)}</td><td class="cbd-li-r cbd-dt__disb-val">${this._fmt(doc.total_disbursement)}</td><td class="cbd-li-r">${this._fmt(doc.balence_budget)}</td><td class="cbd-li-r"><span class="cbd-dt__pct cbd-dt__pct--${pct_cls}">${b_pct.toFixed(1)}%</span></td>`;
// 						tbody.appendChild(b_row);
// 						const tracker=doc.tracker||[];
// 						const trk_inner=tracker.length?tracker.map((t,i)=>`<div class="cbd-dt__trk-item ${i===tracker.length-1?'cbd-dt__trk-item--last':''}"><span class="cbd-dt__trk-dot ${i===0?'cbd-dt__trk-dot--first':''}"></span><span class="cbd-dt__trk-date">${this._date(t.date_of_disbursement)}</span><span class="cbd-dt__trk-amt">${this._fmtTip(t.disbursed_amount,'Disbursed')}</span></div>`).join(''):`<div class="cbd-dt__trk-empty">No payment entries recorded.</div>`;
// 						const d_row=document.createElement('tr'); d_row.className='cbd-dt__detail-row cbd-dt__detail-row--collapsed'; d_row.id=d_id;
// 						d_row.innerHTML=`<td colspan="9" class="cbd-dt__detail-cell">${trk_inner}</td>`; tbody.appendChild(d_row);
// 						b_row.addEventListener('click',()=>{const open=!d_row.classList.contains('cbd-dt__detail-row--collapsed');d_row.classList.toggle('cbd-dt__detail-row--collapsed',open);b_row.querySelector('.cbd-dt__chevron').style.transform=open?'':'rotate(90deg)';});
// 					});
// 				});
// 				const tot=document.getElementById('cbd_disb_total');const tot_val=document.getElementById('cbd_disb_total_val');
// 				if(tot){tot.style.display='flex';tot_val.innerHTML=this._fmtTip(grand_total,'Grand Total');}
// 			}
// 		});
// 	}

// 	_open_overall_panels(panel='both') {
// 		if (!this._all_partners||!this._all_partners.length){frappe.msgprint('No data loaded yet.');return;}
// 		const all_budget_ids=this._all_partners.flatMap(p=>(p.budgets||[]).map(b=>b.budget_id)).filter(Boolean);
// 		const all_starts=this._all_partners.flatMap(p=>(p.budgets||[]).map(b=>b.grant_start)).filter(Boolean).sort();
// 		const all_ends=this._all_partners.flatMap(p=>(p.budgets||[]).map(b=>b.grant_end)).filter(Boolean).sort().reverse();
// 		if (!all_budget_ids.length){frappe.msgprint('No budgets found.');return;}
// 		this._open_consolidated_panels_typed(all_budget_ids,'Overall Summary',all_starts[0]||'',all_ends[0]||'',panel);
// 	}

// 	_open_consolidated_panels_typed(budget_ids,title,grant_start,grant_end,panel) {
// 		const overlay=document.getElementById('cbd_overlay');const left=document.getElementById('cbd_panel_left');const right=document.getElementById('cbd_panel_right');
// 		overlay.classList.add('cbd-overlay--active');document.body.classList.add('cbd-panels-open');
// 		const sidebar=document.querySelector('.layout-side-section,.desk-sidebar,#sidebar-menu');if(sidebar){sidebar.dataset.cbdPrevZ=sidebar.style.zIndex||'';sidebar.style.zIndex='1';}
// 		const badge=`<span class="cbd-panel__consolidated-badge">Overall</span>`;const sub=`${budget_ids.length} budget${budget_ids.length>1?'s':''} · All Partners`;
// 		const left_html=`<div class="cbd-panel__header"><div><div class="cbd-panel__title">${badge} Budget Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(sub)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels">&#10005;</button></div></div><div class="cbd-panel__body" id="cbd_left_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none"><span>Grand Total</span><span id="cbd_left_total_val">—</span></div>`;
// 		const right_html=`<div class="cbd-panel__header"><div><div class="cbd-panel__title">${badge} Utilisation Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(sub)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels2">&#10005;</button></div></div><div class="cbd-panel__filter" id="cbd_month_filter_wrap"><div class="cbd-filter-row"><div class="cbd-filter-col"><div class="cbd-filter-label">Financial Year</div><div id="cbd_fy_multiselect"></div></div><div class="cbd-filter-col"><div class="cbd-filter-label">Month</div><div id="cbd_month_multiselect"></div></div></div></div><div class="cbd-panel__body" id="cbd_right_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none"><span id="cbd_right_total_lbl">Total</span><span id="cbd_right_total_val">—</span></div>`;
// 		if(panel==='budget'){left.classList.add('cbd-panel--open','cbd-panel--full');right.classList.remove('cbd-panel--open');left.innerHTML=left_html;}
// 		else if(panel==='utilisation'){right.classList.add('cbd-panel--open','cbd-panel--full');left.classList.remove('cbd-panel--open');right.innerHTML=right_html;}
// 		else{left.classList.add('cbd-panel--open');right.classList.add('cbd-panel--open');left.innerHTML=left_html;right.innerHTML=right_html;}
// 		const wire=(id,fn)=>{const b=document.getElementById(id);if(b)b.addEventListener('click',fn);};
// 		wire('cbd_close_panels',()=>this._close_left());wire('cbd_close_panels2',()=>this._close_right());
// 		if(panel==='budget'||panel==='both')this._load_consolidated_budget_items(budget_ids);
// 		if(panel==='utilisation'||panel==='both')this._load_consolidated_utilisation_items(budget_ids,grant_start,grant_end);
// 	}

// 	_open_panels(budget_id,ref_name,grant_start,grant_end) {
// 		const overlay=document.getElementById('cbd_overlay');const left=document.getElementById('cbd_panel_left');const right=document.getElementById('cbd_panel_right');
// 		overlay.classList.add('cbd-overlay--active');left.classList.add('cbd-panel--open');right.classList.add('cbd-panel--open');document.body.classList.add('cbd-panels-open');
// 		const sidebar=document.querySelector('.layout-side-section,.desk-sidebar,#sidebar-menu,.main-container>.col.layout-side-section');
// 		if(sidebar){sidebar.dataset.cbdPrevZ=sidebar.style.zIndex||'';sidebar.style.zIndex='1';}
// 		left.innerHTML=`<div class="cbd-panel__header"><div><div class="cbd-panel__title">Budget Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(ref_name)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels">&#10005;</button></div></div><div class="cbd-panel__body" id="cbd_left_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none"><span>Grand Total</span><span id="cbd_left_total_val">—</span></div>`;
// 		right.innerHTML=`<div class="cbd-panel__header"><div><div class="cbd-panel__title">Utilisation Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(ref_name)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels2">&#10005;</button></div></div><div class="cbd-panel__filter"><div class="cbd-filter-row"><div class="cbd-filter-col"><div class="cbd-filter-label">Financial Year</div><div id="cbd_fy_multiselect"></div></div><div class="cbd-filter-col"><div class="cbd-filter-label">Month</div><div id="cbd_month_multiselect"></div></div></div></div><div class="cbd-panel__body" id="cbd_right_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none"><span id="cbd_right_total_lbl">Total</span><span id="cbd_right_total_val">—</span></div>`;
// 		document.getElementById('cbd_close_panels').addEventListener('click',()=>this._close_left());
// 		document.getElementById('cbd_close_panels2').addEventListener('click',()=>this._close_right());
// 		this._load_budget_items(budget_id);this._load_utilisation_items(budget_id,grant_start,grant_end);
// 	}

// 	_close_all_panels(){this._close_panels();this._close_disb_panel();}
// 	_close_panels(){
// 		document.getElementById('cbd_overlay').classList.remove('cbd-overlay--active');
// 		document.getElementById('cbd_panel_left').classList.remove('cbd-panel--open','cbd-panel--full');
// 		document.getElementById('cbd_panel_right').classList.remove('cbd-panel--open','cbd-panel--full');
// 		document.body.classList.remove('cbd-panels-open');
// 		const sidebar=document.querySelector('.layout-side-section,.desk-sidebar,#sidebar-menu,.main-container>.col.layout-side-section');
// 		if(sidebar)sidebar.style.zIndex=sidebar.dataset.cbdPrevZ||'';
// 	}
// 	_close_left(){const left=document.getElementById('cbd_panel_left');left.classList.remove('cbd-panel--open','cbd-panel--full');const right=document.getElementById('cbd_panel_right');if(!right.classList.contains('cbd-panel--open'))this._close_panels();}
// 	_close_right(){const right=document.getElementById('cbd_panel_right');right.classList.remove('cbd-panel--open','cbd-panel--full');const left=document.getElementById('cbd_panel_left');if(!left.classList.contains('cbd-panel--open'))this._close_panels();}

// 	_load_budget_items(budget_id) {
// 		const _pf=this._panel_filters();frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_budget_line_items',args:{budget_id,start_date:_pf.start_date||null,end_date:_pf.end_date||null,financial_year:_pf.financial_year?JSON.stringify(_pf.financial_year):null,month:_pf.month?JSON.stringify(_pf.month):null},callback:(r)=>{
// 			const el=document.getElementById('cbd_left_body');if(!el)return;
// 			const items=r.message||[];if(!items.length){el.innerHTML='<div class="cbd-panel-empty">No budget line items found.</div>';return;}
// 			const groups={};items.forEach(item=>{const h=item.budget_main_head||'Other';if(!groups[h])groups[h]=[];groups[h].push(item);});
// 			el.innerHTML='';
// 			Object.entries(groups).forEach(([head,rows],gidx)=>{
// 				const group_total=rows.reduce((s,r)=>s+(parseFloat(r.total_amount)||0),0);const gid='lgrp_'+gidx;
// 				const grp=document.createElement('div');grp.className='cbd-item-group';
// 				grp.innerHTML=`<div class="cbd-item-group__head cbd-item-group__head--toggle"><div class="cbd-igh-left"><span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span><span>${frappe.utils.escape_html(head)}</span></div><span class="cbd-item-group__total">${this._fmtTip(group_total,'Category Total')}</span></div><div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}"><div class="cbd-li-scroll-wrap"><table class="cbd-li-table"><thead><tr><th class="cbd-li-sticky cbd-li-sticky--1">Expense Type</th><th class="cbd-li-sticky cbd-li-sticky--2">Sub Head</th><th class="cbd-li-r">Amount</th><th class="cbd-li-r">Y1</th><th class="cbd-li-r">Y2</th><th class="cbd-li-r">Y3</th></tr></thead><tbody>${rows.map(row=>`<tr><td class="cbd-li-sticky cbd-li-sticky--1"><div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses||'—')}</div>${row.notes?`<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>`:''}</td><td class="cbd-li-sticky cbd-li-sticky--2">${frappe.utils.escape_html(row.budget_sub_head||'—')}</td><td class="cbd-li-r cbd-li-amt">${this._fmtTip(row.total_amount,'Amount')}</td><td class="cbd-li-r">${row.year_1?this._fmt(row.year_1):'—'}</td><td class="cbd-li-r">${row.year_2?this._fmt(row.year_2):'—'}</td><td class="cbd-li-r">${row.year_3?this._fmt(row.year_3):'—'}</td></tr>`).join('')}</tbody></table></div></div>`;
// 				el.appendChild(grp);
// 				grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click',()=>{const body=document.getElementById(gid);const chv=grp.querySelector('.cbd-igh-chevron');const collapsed=body.classList.toggle('cbd-item-group__body--collapsed');chv.style.transform=collapsed?'rotate(-90deg)':'';});
// 			});
// 			const grand=items.reduce((s,r)=>s+(parseFloat(r.total_amount)||0),0);
// 			const tot=document.getElementById('cbd_left_total');const tot_val=document.getElementById('cbd_left_total_val');
// 			if(tot){tot.style.display='flex';tot_val.textContent=this._fmt(grand);}
// 		}});
// 	}

// 	_load_utilisation_items(budget_id,grant_start,grant_end) {
// 		const pf=this._panel_filters();
// 		frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_utilisation_line_items',args:{budget_id,start_date:pf.start_date,end_date:pf.end_date,financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,month:pf.month?JSON.stringify(pf.month):null},callback:(r)=>{
// 			const data=r.message||{};const records=data.records||[];
// 			const ALL_12=['January','February','March','April','May','June','July','August','September','October','November','December'];
// 			const fy_from_server=[...new Set(records.map(r=>r.financial_year).filter(Boolean))];
// 			const fy_options_derived=this._derive_fy_options(grant_start,grant_end);
// 			const fy_options=fy_options_derived.length?fy_options_derived:fy_from_server.map(v=>({value:v,description:''}));
// 			const has_main_filter = !!(pf.financial_year || pf.month || pf.start_date || pf.end_date);
// 			let active_fys, active_months;
// 			if (pf.financial_year) {
// 				active_fys = new Set(pf.financial_year);
// 				active_months = pf.month ? new Set(pf.month) : new Set(ALL_12);
// 			} else if (pf.month) {
// 				active_fys = new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
// 				active_months = new Set(pf.month);
// 			} else if (pf.start_date || pf.end_date) {
// 				const derived = this._fym_from_date_range(pf.start_date, pf.end_date);
// 				active_fys = derived.fys.size ? derived.fys : new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
// 				active_months = derived.months.size ? derived.months : new Set(ALL_12);
// 			} else {
// 				active_fys = new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
// 				active_months = new Set(ALL_12);
// 			}
// 			this._util_records=records;this._selected_months=active_months;this._selected_fys=active_fys;
// 			const fy_wrap=document.getElementById('cbd_fy_multiselect');const month_wrap=document.getElementById('cbd_month_multiselect');
// 			if(!fy_wrap||!month_wrap)return;
// 			this._fy_field=frappe.ui.form.make_control({df:{fieldtype:'MultiSelectList',fieldname:'fy_filter',label:'FY',get_data:()=>fy_options},parent:$(fy_wrap),render_input:true});
// 			this._fy_field.refresh();this._fy_field.set_value([...active_fys]);
// 			this._fy_field.df.onchange=()=>{const val=this._fy_field.get_value()||[];this._selected_fys=new Set(Array.isArray(val)?val:[val]);this._render_utilisation();};
// 			const month_opts_available=ALL_12.filter(m=>records.some(r=>r.month===m));
// 			const month_opts_display=month_opts_available.length?month_opts_available:ALL_12;
// 			this._month_field=frappe.ui.form.make_control({df:{fieldtype:'MultiSelectList',fieldname:'month_filter',label:'Month',get_data:()=>month_opts_display.map(m=>({value:m,description:''}))},parent:$(month_wrap),render_input:true});
// 			this._month_field.refresh();this._month_field.set_value([...active_months].filter(m=>month_opts_display.includes(m)));
// 			this._month_field.df.onchange=()=>{const val=this._month_field.get_value()||[];this._selected_months=new Set(Array.isArray(val)?val:[val]);this._render_utilisation();};
// 			if(!records.length){document.getElementById('cbd_right_body').innerHTML='<div class="cbd-panel-empty">No utilisation records found for the selected filters.</div>';return;}
// 			this._render_utilisation();
// 		}});
// 	}

// 	_derive_fy_options(start_str,end_str) {
// 		const to_fy=(ds)=>{if(!ds)return null;const d=new Date(ds);const yr=d.getFullYear();const mo=d.getMonth()+1;const fy=mo>=4?yr:yr-1;return `${fy}-${String(fy+1).slice(-2)}`;};
// 		const start_fy=to_fy(start_str);const end_fy=to_fy(end_str);
// 		if(!start_fy)return[];const options=[];let[sy]=start_fy.split('-').map(Number);const[ey]=(end_fy||start_fy).split('-').map(Number);
// 		while(sy<=ey){options.push({value:`${sy}-${String(sy+1).slice(-2)}`,description:''});sy++;}
// 		return options;
// 	}

// 	_fym_from_date_range(start_date_str, end_date_str) {
// 		const MONTH_NAMES = ['January','February','March','April','May','June',
// 		                     'July','August','September','October','November','December'];
// 		const to_fy = (yr, mo) => { const fy = mo >= 4 ? yr : yr - 1; return `${fy}-${String(fy+1).slice(-2)}`; };
// 		const fys = new Set(); const months = new Set();
// 		if (!start_date_str) return { fys, months };
// 		const sd = new Date(start_date_str);
// 		const ed = end_date_str ? new Date(end_date_str) : new Date();
// 		let y = sd.getFullYear(), m = sd.getMonth();
// 		const ey = ed.getFullYear(), em = ed.getMonth();
// 		while (y < ey || (y === ey && m <= em)) {
// 			fys.add(to_fy(y, m + 1));
// 			months.add(MONTH_NAMES[m]);
// 			m++; if (m > 11) { m = 0; y++; }
// 		}
// 		return { fys, months };
// 	}

// 	_render_utilisation() {
// 		const el=document.getElementById('cbd_right_body');if(!el)return;
// 		const MONTH_ORDER=['January','February','March','April','May','June','July','August','September','October','November','December'];
// 		const sel_months=this._selected_months||new Set();const sel_fys=this._selected_fys||new Set();
// 		const records=(this._util_records||[]).filter(r=>(sel_months.size===0||sel_months.has(r.month))&&(sel_fys.size===0||sel_fys.has(r.financial_year)));
// 		if(!records.length){el.innerHTML='<div class="cbd-panel-empty">No data for selected period.</div>';const rt=document.getElementById('cbd_right_total');if(rt)rt.style.display='none';return;}
// 		const active_months=[...new Set(records.map(r=>r.month))].sort((a,b)=>MONTH_ORDER.indexOf(a)-MONTH_ORDER.indexOf(b));
// 		const is_multi=active_months.length>1;
// 		const combined={};
// 		records.forEach(rec=>{(rec.items||[]).forEach(item=>{const key=item.type_of_expenses_id||item.type_of_expenses||'unknown';if(!combined[key])combined[key]={type_of_expenses:item.type_of_expenses,budget_main_head:item.budget_main_head,budget_sub_head:item.budget_sub_head,notes:item.notes,total_amount:0,by_month:{}};const amt=parseFloat(item.total_amount)||0;combined[key].total_amount+=amt;combined[key].by_month[rec.month]=(combined[key].by_month[rec.month]||0)+amt;});});
// 		const groups={};Object.values(combined).forEach(item=>{const h=item.budget_main_head||'Other';if(!groups[h])groups[h]=[];groups[h].push(item);});
// 		el.innerHTML='';
// 		if(is_multi){const bar=document.createElement('div');bar.className='cbd-ytd-bar';bar.innerHTML=`<span class="cbd-ytd-badge">YTD</span><span class="cbd-ytd-label">Combined across <b>${active_months.length}</b> months: ${active_months.map(m=>`<span class="cbd-ytd-month">${m}</span>`).join('')}</span>`;el.appendChild(bar);}
// 		let grand=0;
// 		Object.entries(groups).forEach(([head,rows],gidx)=>{
// 			const group_total=rows.reduce((s,r)=>s+r.total_amount,0);grand+=group_total;const gid='rgrp_'+gidx;
// 			let fy_header_row='';let month_header_row='';
// 			if(is_multi){const fy_groups={};active_months.forEach(m=>{const rec=records.find(r=>r.month===m);const fy=rec?(rec.financial_year||'Unknown'):'Unknown';if(!fy_groups[fy])fy_groups[fy]=[];fy_groups[fy].push(m);});fy_header_row=`<tr class="cbd-li-fy-row"><th class="cbd-li-sticky cbd-li-sticky--1 cbd-li-fy-blank" rowspan="2">Expense Type</th><th class="cbd-li-sticky cbd-li-sticky--2 cbd-li-fy-blank" rowspan="2">Sub Head</th>${Object.entries(fy_groups).map(([fy,months])=>`<th colspan="${months.length}" class="cbd-li-fy-hdr">${frappe.utils.escape_html(fy)}</th>`).join('')}<th rowspan="2" class="cbd-li-r cbd-li-ytd-hdr">YTD Total</th></tr>`;month_header_row=`<tr class="cbd-li-month-row">${active_months.map(m=>`<th class="cbd-li-r cbd-li-month-col">${m.slice(0,3)}</th>`).join('')}</tr>`;}
// 			const month_tds=(row)=>is_multi?active_months.map(m=>`<td class="cbd-li-r cbd-li-month-col">${row.by_month[m]?this._fmt(row.by_month[m]):'—'}</td>`).join(''):'';
// 			const grp=document.createElement('div');grp.className='cbd-item-group';
// 			grp.innerHTML=`<div class="cbd-item-group__head cbd-item-group__head--toggle"><div class="cbd-igh-left"><span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span><span>${frappe.utils.escape_html(head)}</span></div><span class="cbd-item-group__total">${this._fmtTip(group_total,'Category Total')}</span></div><div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}"><div class="cbd-li-scroll-wrap"><table class="cbd-li-table"><thead>${is_multi?fy_header_row+month_header_row:`<tr><th class="cbd-li-sticky cbd-li-sticky--1">Expense Type</th><th class="cbd-li-sticky cbd-li-sticky--2">Sub Head</th><th class="cbd-li-r">Amount</th></tr>`}</thead><tbody>${rows.map(row=>`<tr><td class="cbd-li-sticky cbd-li-sticky--1"><div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses||'—')}</div>${row.notes?`<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>`:''}</td><td class="cbd-li-sticky cbd-li-sticky--2 cbd-li-sub">${frappe.utils.escape_html(row.budget_sub_head||'—')}</td>${month_tds(row)}<td class="cbd-li-r cbd-li-amt">${this._fmtTip(row.total_amount,'Amount')}</td></tr>`).join('')}</tbody></table></div></div>`;
// 			el.appendChild(grp);
// 			grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click',()=>{const body=document.getElementById(gid);const chv=grp.querySelector('.cbd-igh-chevron');const collapsed=body.classList.toggle('cbd-item-group__body--collapsed');chv.style.transform=collapsed?'rotate(-90deg)':'';});
// 		});
// 		const rt=document.getElementById('cbd_right_total');const rt_val=document.getElementById('cbd_right_total_val');const rt_lbl=document.getElementById('cbd_right_total_lbl');
// 		if(rt){rt.style.display='flex';rt_val.textContent=this._fmt(grand);if(rt_lbl)rt_lbl.textContent=is_multi?`YTD Total (${active_months.length} months)`:'Total';}
// 	}

// 	_open_consolidated_panels(budget_ids,partner_name,grant_start,grant_end) {
// 		const overlay=document.getElementById('cbd_overlay');const left=document.getElementById('cbd_panel_left');const right=document.getElementById('cbd_panel_right');
// 		overlay.classList.add('cbd-overlay--active');left.classList.add('cbd-panel--open');right.classList.add('cbd-panel--open');document.body.classList.add('cbd-panels-open');
// 		const sidebar=document.querySelector('.layout-side-section,.desk-sidebar,#sidebar-menu,.main-container>.col.layout-side-section');
// 		if(sidebar){sidebar.dataset.cbdPrevZ=sidebar.style.zIndex||'';sidebar.style.zIndex='1';}
// 		const title_sub=`${budget_ids.length} budget${budget_ids.length>1?'s':''} · Consolidated`;
// 		left.innerHTML=`<div class="cbd-panel__header"><div><div class="cbd-panel__title"><span class="cbd-panel__consolidated-badge">Consolidated</span> Budget Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(partner_name)} &mdash; ${frappe.utils.escape_html(title_sub)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels">&#10005;</button></div></div><div class="cbd-panel__body" id="cbd_left_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_left_total" style="display:none"><span>Grand Total</span><span id="cbd_left_total_val">—</span></div>`;
// 		right.innerHTML=`<div class="cbd-panel__header"><div><div class="cbd-panel__title"><span class="cbd-panel__consolidated-badge">Consolidated</span> Utilisation Line Items</div><div class="cbd-panel__sub">${frappe.utils.escape_html(partner_name)} &mdash; ${frappe.utils.escape_html(title_sub)}</div></div><div class="cbd-panel__header-actions"><label class="cbd-expand-all-label"><input type="checkbox" class="cbd-expand-chk cbd-expand-all">Expand all</label><button class="cbd-panel__close" id="cbd_close_panels2">&#10005;</button></div></div><div class="cbd-panel__filter"><div class="cbd-filter-row"><div class="cbd-filter-col"><div class="cbd-filter-label">Financial Year</div><div id="cbd_fy_multiselect"></div></div><div class="cbd-filter-col"><div class="cbd-filter-label">Month</div><div id="cbd_month_multiselect"></div></div></div></div><div class="cbd-panel__body" id="cbd_right_body"><div class="cbd-panel-loading">Loading…</div></div><div class="cbd-panel__sticky-total" id="cbd_right_total" style="display:none"><span id="cbd_right_total_lbl">Total</span><span id="cbd_right_total_val">—</span></div>`;
// 		document.getElementById('cbd_close_panels').addEventListener('click',()=>this._close_left());
// 		document.getElementById('cbd_close_panels2').addEventListener('click',()=>this._close_right());
// 		this._load_consolidated_budget_items(budget_ids);this._load_consolidated_utilisation_items(budget_ids,grant_start,grant_end);
// 	}

// 	_load_consolidated_budget_items(budget_ids) {
// 		const _cpf=this._panel_filters();const promises=budget_ids.map(bid=>frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_budget_line_items',args:{budget_id:bid,start_date:_cpf.start_date||null,end_date:_cpf.end_date||null,financial_year:_cpf.financial_year?JSON.stringify(_cpf.financial_year):null,month:_cpf.month?JSON.stringify(_cpf.month):null}}));
// 		Promise.all(promises).then(results=>{
// 			const el=document.getElementById('cbd_left_body');if(!el)return;
// 			const merged={};
// 			results.forEach(r=>{(r.message||[]).forEach(item=>{const key=item.type_of_expenses_id||item.type_of_expenses||'unknown';if(!merged[key])merged[key]={type_of_expenses:item.type_of_expenses,budget_main_head:item.budget_main_head,budget_sub_head:item.budget_sub_head,notes:item.notes,total_amount:0,year_1:0,year_2:0,year_3:0};merged[key].total_amount+=parseFloat(item.total_amount)||0;merged[key].year_1+=parseFloat(item.year_1)||0;merged[key].year_2+=parseFloat(item.year_2)||0;merged[key].year_3+=parseFloat(item.year_3)||0;});});
// 			const items=Object.values(merged);if(!items.length){el.innerHTML='<div class="cbd-panel-empty">No budget line items found.</div>';return;}
// 			const groups={};items.forEach(item=>{const h=item.budget_main_head||'Other';if(!groups[h])groups[h]=[];groups[h].push(item);});
// 			el.innerHTML='';
// 			Object.entries(groups).forEach(([head,rows],gidx)=>{
// 				const group_total=rows.reduce((s,r)=>s+r.total_amount,0);const gid='clgrp_'+gidx;
// 				const grp=document.createElement('div');grp.className='cbd-item-group';
// 				grp.innerHTML=`<div class="cbd-item-group__head cbd-item-group__head--toggle"><div class="cbd-igh-left"><span class="cbd-igh-chevron" style="transform:rotate(-90deg)">&#9660;</span><span>${frappe.utils.escape_html(head)}</span></div><span class="cbd-item-group__total">${this._fmtTip(group_total,'Category Total')}</span></div><div class="cbd-item-group__body cbd-item-group__body--collapsed" id="${gid}"><table class="cbd-li-table"><thead><tr><th>Expense Type</th><th>Sub Head</th><th class="cbd-li-r">Total</th><th class="cbd-li-r">Y1</th><th class="cbd-li-r">Y2</th><th class="cbd-li-r">Y3</th></tr></thead><tbody>${rows.map(row=>`<tr><td><div class="cbd-li-name">${frappe.utils.escape_html(row.type_of_expenses||'—')}</div>${row.notes?`<div class="cbd-li-note">${frappe.utils.escape_html(row.notes)}</div>`:''}</td><td class="cbd-li-sub">${frappe.utils.escape_html(row.budget_sub_head||'—')}</td><td class="cbd-li-r cbd-li-amt">${this._fmtTip(row.total_amount,'Amount')}</td><td class="cbd-li-r">${row.year_1?this._fmt(row.year_1):'—'}</td><td class="cbd-li-r">${row.year_2?this._fmt(row.year_2):'—'}</td><td class="cbd-li-r">${row.year_3?this._fmt(row.year_3):'—'}</td></tr>`).join('')}</tbody></table></div>`;
// 				el.appendChild(grp);
// 				grp.querySelector('.cbd-item-group__head--toggle').addEventListener('click',()=>{const body=document.getElementById(gid);const chv=grp.querySelector('.cbd-igh-chevron');const collapsed=body.classList.toggle('cbd-item-group__body--collapsed');chv.style.transform=collapsed?'rotate(-90deg)':'';});
// 			});
// 			const grand=items.reduce((s,r)=>s+r.total_amount,0);
// 			const tot=document.getElementById('cbd_left_total');const tot_val=document.getElementById('cbd_left_total_val');
// 			if(tot){tot.style.display='flex';tot_val.textContent=this._fmt(grand);}
// 		});
// 	}

// 	_load_consolidated_utilisation_items(budget_ids,grant_start,grant_end) {
// 		const pf=this._panel_filters();
// 		const call_args=(bid)=>({budget_id:bid,start_date:pf.start_date,end_date:pf.end_date,financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,month:pf.month?JSON.stringify(pf.month):null});
// 		const promises=budget_ids.map(bid=>frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_utilisation_line_items',args:call_args(bid)}));
// 		Promise.all(promises).then(results=>{
// 			const all_records=[];results.forEach(r=>{((r.message||{}).records||[]).forEach(rec=>all_records.push(rec));});
// 			const ALL_12=['January','February','March','April','May','June','July','August','September','October','November','December'];
// 			const fy_from_server=[...new Set(all_records.map(r=>r.financial_year).filter(Boolean))];
// 			const fy_options_derived=this._derive_fy_options(grant_start,grant_end);
// 			const fy_options=fy_options_derived.length?fy_options_derived:fy_from_server.map(v=>({value:v,description:''}));
// 			const _has_main = !!(pf.financial_year || pf.month || pf.start_date || pf.end_date);
// 			let active_fys, active_months;
// 			if (pf.financial_year) {
// 				active_fys = new Set(pf.financial_year);
// 				active_months = pf.month ? new Set(pf.month) : new Set(ALL_12);
// 			} else if (pf.month) {
// 				active_fys = new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
// 				active_months = new Set(pf.month);
// 			} else if (pf.start_date || pf.end_date) {
// 				const derived = this._fym_from_date_range(pf.start_date, pf.end_date);
// 				active_fys = derived.fys.size ? derived.fys : new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
// 				active_months = derived.months.size ? derived.months : new Set(ALL_12);
// 			} else {
// 				active_fys = new Set(fy_from_server.length ? fy_from_server : fy_options.map(f=>f.value));
// 				active_months = new Set(ALL_12);
// 			}
// 			this._util_records=all_records;this._selected_months=active_months;this._selected_fys=active_fys;
// 			const fy_wrap=document.getElementById('cbd_fy_multiselect');const month_wrap=document.getElementById('cbd_month_multiselect');if(!fy_wrap||!month_wrap)return;
// 			this._fy_field=frappe.ui.form.make_control({df:{fieldtype:'MultiSelectList',fieldname:'fy_filter',label:'FY',get_data:()=>fy_options},parent:$(fy_wrap),render_input:true});
// 			this._fy_field.refresh();this._fy_field.set_value([...active_fys]);
// 			this._fy_field.df.onchange=()=>{const val=this._fy_field.get_value()||[];this._selected_fys=new Set(Array.isArray(val)?val:[val]);this._render_utilisation();};
// 			const month_opts_available=ALL_12.filter(m=>all_records.some(r=>r.month===m));
// 			const month_opts_display=month_opts_available.length?month_opts_available:ALL_12;
// 			this._month_field=frappe.ui.form.make_control({df:{fieldtype:'MultiSelectList',fieldname:'month_filter',label:'Month',get_data:()=>month_opts_display.map(m=>({value:m,description:''}))},parent:$(month_wrap),render_input:true});
// 			this._month_field.refresh();this._month_field.set_value([...active_months].filter(m=>month_opts_display.includes(m)));
// 			this._month_field.df.onchange=()=>{const val=this._month_field.get_value()||[];this._selected_months=new Set(Array.isArray(val)?val:[val]);this._render_utilisation();};
// 			if(!all_records.length){document.getElementById('cbd_right_body').innerHTML='<div class="cbd-panel-empty">No utilisation records found for the selected filters.</div>';return;}
// 			this._render_utilisation();
// 		});
// 	}

// 	// ─── Number formatting ──────────────────────────────────────────────
// 	// ── Number formatting ──────────────────────────────────────────────────
// 	// Short form: ₹1.23 Cr / ₹45.60 L / ₹1.2 K / ₹999
// 	_fmt(n) {
// 		if (n === null || n === undefined || n === '') return '—';
// 		const v = parseFloat(n) || 0;
// 		const abs = Math.abs(v);
// 		if (abs >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr';
// 		if (abs >= 100000)   return '₹' + (v / 100000).toFixed(2)   + ' L';
// 		if (abs >= 1000)     return '₹' + (v / 1000).toFixed(1)     + ' K';
// 		return '₹' + Math.round(v).toLocaleString('en-IN');
// 	}

// 	// Full exact value — Indian comma format, 2 decimals
// 	_fmtFull(n) {
// 		if (n === null || n === undefined || n === '') return '—';
// 		const v = parseFloat(n) || 0;
// 		return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// 	}

// 	// Card format: always shows Cr if >= 1 Cr, L if >= 1 L, else exact
// 	_fmtCr(n) {
// 		if (n === null || n === undefined || n === '') return '—';
// 		const v   = parseFloat(n) || 0;
// 		const abs = Math.abs(v);
// 		if (abs >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr';
// 		if (abs >= 100000)   return '₹' + (v / 100000).toFixed(2)   + ' L';
// 		if (abs >= 1000)     return '₹' + (v / 1000).toFixed(1)     + ' K';
// 		return '₹' + Math.round(v).toLocaleString('en-IN');
// 	}

// 	// Tooltip-enabled inline value for TABLES
// 	// • Short display (Cr/L/K)
// 	// • Tooltip: "Label: ₹1,23,456.00 (₹1.23 L)"
// 	_fmtTip(n, label = 'Amount') {
// 		if (n === null || n === undefined || n === '') return '<span>—</span>';
// 		const v     = parseFloat(n) || 0;
// 		const short = this._fmt(v);
// 		const full  = this._fmtFull(v);
// 		// Always show tooltip so users can verify exact values
// 		const tipText = label ? `${label}\n${full}` : full;
// 		return `<span class="cbd-tip-wrap" data-tip="${frappe.utils.escape_html(tipText)}" style="cursor:default;border-bottom:1px dotted #94a3b8">${short}</span>`;
// 	}

// 	// Card number: Cr display + tooltip with full Indian value
// 	_fmtCard(n, label = '') {
// 		if (n === null || n === undefined || n === '') return '<span class="cbd-scard__num-val">—</span>';
// 		const v       = parseFloat(n) || 0;
// 		const display = this._fmtCr(v);
// 		const full    = this._fmtFull(v);
// 		const tipText = label ? `${label}\n${full}` : full;
// 		return `<span class="cbd-scard__num-val cbd-tip-wrap" data-tip="${frappe.utils.escape_html(tipText)}" style="cursor:default">${display}</span>`;
// 	}
// 	_date(d){if(!d)return'—';return frappe.datetime.str_to_user(d)||d;}
// 	_metric(label,value,rawNum=null){
// 		const display = rawNum!==null ? this._fmtTip(rawNum, label) : value;
// 		return `<div class="cbd-metric"><span class="cbd-metric__label">${label}</span><span class="cbd-metric__value">${display}</span></div>`;
// 	}
// 	_metric_pct(label,pct){const v=parseFloat(pct)||0;const cls=v>=80?'green':v>=50?'amber':'red';return `<div class="cbd-metric cbd-metric--pct"><span class="cbd-metric__label">${label}</span><span class="cbd-metric__value cbd-metric__pct cbd-metric__pct--${cls}">${v.toFixed(1)}%</span></div>`;}
// 	_util_vs_disb_pct(partner){const d=parseFloat(partner.total_disbursement)||0;const u=parseFloat(partner.total_utilisation)||0;return d>0?((u/d)*100):0;}
// 	_icon_partner(){return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0"><rect x="3" y="7" width="18" height="14" rx="1"/><path d="M8 21V11h8v10"/><path d="M3 7l9-4 9 4"/></svg>`;}
// 	_fill_cls(v){return v>=80?'green':v>=50?'amber':'red';}
// 	_chip_cls(v){return v>=80?'green':v>=50?'amber':'red';}
// 	_badge_cls(v){return v>=80?'green':v>=50?'amber':'red';}

// 	_bind_view_buttons(){
// 		const el = document.getElementById('cbd_partners');
// 		if (!el) return;
// 		if (el._cbdViewListener) {
// 			el.removeEventListener('click', el._cbdViewListener);
// 		}
// 		const handler = (e) => {
// 			const btn=e.target.closest('.cbd-view-btn');if(btn){e.stopPropagation();this._open_panels(btn.dataset.budgetId,btn.dataset.refName,btn.dataset.grantStart||'',btn.dataset.grantEnd||'');return;}
// 			const rbtn=e.target.closest('.cbd-row-disb-btn');if(rbtn){e.stopPropagation();this._open_disbursement_panel(`${rbtn.dataset.refName||rbtn.dataset.budgetId} — Disbursements`,[rbtn.dataset.budgetId],null);return;}
// 			const cbtn=e.target.closest('.cbd-consolidated-btn');if(cbtn){e.stopPropagation();this._open_consolidated_panels((cbtn.dataset.budgetIds||'').split(',').filter(Boolean),cbtn.dataset.partnerName||'Partner',cbtn.dataset.grantStart||'',cbtn.dataset.grantEnd||'');return;}
// 			const dbtn=e.target.closest('.cbd-disb-btn');if(dbtn){e.stopPropagation();this._open_disbursement_panel(`${dbtn.dataset.partnerName||'Partner'} — Disbursements`,(dbtn.dataset.budgetIds||'').split(',').filter(Boolean),null);return;}
// 		};
// 		el._cbdViewListener = handler;
// 		el.addEventListener('click', handler);
// 	}

// 	_ensure_panels(){
// 		if(document.getElementById('cbd_overlay'))return;
// 		const overlay=document.createElement('div');overlay.className='cbd-overlay';overlay.id='cbd_overlay';
// 		const left=document.createElement('div');left.className='cbd-panel-left';left.id='cbd_panel_left';
// 		const right=document.createElement('div');right.className='cbd-panel-right';right.id='cbd_panel_right';
// 		const disb_modal=document.createElement('div');disb_modal.id='cbd_disb_modal';disb_modal.className='cbd-disb-modal';
// 		const disb_overlay=document.createElement('div');disb_overlay.id='cbd_disb_overlay';disb_overlay.className='cbd-disb-overlay';
// 		document.body.appendChild(overlay);document.body.appendChild(left);document.body.appendChild(right);document.body.appendChild(disb_overlay);document.body.appendChild(disb_modal);
// 		disb_overlay.addEventListener('click',()=>this._close_disb_panel());
// 		overlay.addEventListener('click',()=>this._close_all_panels());
// 		[left,right].forEach(panel=>{panel.addEventListener('change',e=>{const chk=e.target.closest('.cbd-expand-all');if(!chk)return;const expand=chk.checked;const body=panel.querySelector('.cbd-panel__body');if(!body)return;body.querySelectorAll('.cbd-item-group__body').forEach(b=>b.classList.toggle('cbd-item-group__body--collapsed',!expand));body.querySelectorAll('.cbd-igh-chevron').forEach(chv=>{chv.style.transform=expand?'':'rotate(-90deg)';});});});
// 	}


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
// 		.cbd-overview-strip {
// 			display:grid;
// 			grid-template-columns:repeat(8,1fr);
// 			gap:8px; margin-bottom:12px;
// 		}
// 		.cbd-ostat {
// 			display:flex; align-items:center; gap:10px;
// 			padding:12px 14px; min-width:0; word-break:break-word;
// 			background:#fff;
// 			border:1px solid #e8edf3;
// 			border-left:4px solid var(--ost-color,#378ADD);
// 			border-radius:12px; position:relative;
// 			transition:box-shadow .2s;
// 		}
// 		.cbd-ostat--clickable { cursor:pointer; }
// 		.cbd-ostat--clickable:hover { box-shadow:0 4px 16px rgba(0,0,0,.08); }
// 		.cbd-ostat--clickable:hover .cbd-ostat__arrow { opacity:1; }
// 		.cbd-ostat__arrow { position:absolute; right:10px; top:50%; transform:translateY(-50%); color:var(--ost-color,#378ADD); opacity:0; transition:opacity .15s; flex-shrink:0; font-size:12px; }
// 		.cbd-drill-modal-wrap { position:fixed; inset:0; z-index:3200; background:rgba(0,0,0,0); display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box; transition:background .2s ease; pointer-events:none; }
// 		.cbd-drill-modal-wrap--open { background:rgba(0,0,0,.45); pointer-events:all; }
// 		.cbd-drill-modal { background:var(--card-bg,#fff); border-radius:12px; border:1px solid var(--border-color,#d1d8dd); box-shadow:0 8px 40px rgba(0,0,0,.18); display:flex; flex-direction:column; max-height:80vh; width:100%; opacity:0; transform:scale(.96) translateY(8px); transition:opacity .22s ease, transform .22s cubic-bezier(.34,1.56,.64,1); overflow:hidden; }
// 		.cbd-drill-modal-wrap--open .cbd-drill-modal { opacity:1; transform:scale(1) translateY(0); }
// 		.cbd-drill-modal--wide   { max-width:640px; }
// 		.cbd-drill-modal--narrow { max-width:400px; }
// 		@media (max-width:600px) { .cbd-drill-modal-wrap { align-items:flex-end; padding:0; } .cbd-drill-modal { border-radius:16px 16px 0 0; max-width:100vw; max-height:85vh; transform:translateY(20px); } .cbd-drill-modal-wrap--open .cbd-drill-modal { transform:translateY(0); } }
// 		.cbd-drill-modal__header { display:flex; align-items:center; justify-content:space-between; padding:16px 18px 14px; border-bottom:1px solid var(--border-color,#d1d8dd); flex-shrink:0; }
// 		.cbd-drill-modal__header-left { display:flex; align-items:center; gap:12px; min-width:0; }
// 		.cbd-drill-modal__icon { width:38px; height:38px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border-radius:10px; background:#EEF5FC; color:#378ADD; }
// 		.cbd-drill-modal__title { font-size:15px; font-weight:700; color:var(--text-color,#1c2126); }
// 		.cbd-drill-modal__sub   { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:2px; }
// 		.cbd-drill-modal__close { width:30px; height:30px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border:1px solid var(--border-color,#d1d8dd); border-radius:7px; background:none; cursor:pointer; color:var(--text-muted,#8d99a6); transition:background .12s, color .12s, border-color .12s; }
// 		.cbd-drill-modal__close:hover { background:#FCEBEB; color:#A32D2D; border-color:#F09595; }
// 		.cbd-drill-modal__body { flex:1; overflow-y:auto; padding:0; }
// 		.cbd-drill-modal__body::-webkit-scrollbar { width:4px; }
// 		.cbd-drill-modal__body::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }
// 		.cbd-drill-modal__footer { display:flex; justify-content:flex-end; align-items:center; padding:10px 18px; border-top:1px solid var(--border-color,#d1d8dd); flex-shrink:0; background:var(--control-bg,#f9f9f9); }
// 		.cbd-drill-cards { display:flex; flex-direction:column; gap:0; }
// 		.cbd-drill-card { padding:14px 16px; border-bottom:1px solid var(--border-color,#d1d8dd); transition:background .1s; }
// 		.cbd-drill-card:hover { background:var(--control-bg,#f7f9fc); }
// 		.cbd-drill-card__top { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
// 		.cbd-drill-card__avatar { width:34px; height:34px; flex-shrink:0; border-radius:50%; background:#E6F1FB; color:#0C447C; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; }
// 		.cbd-drill-card__info { flex:1; min-width:0; }
// 		.cbd-drill-card__name { font-size:13px; font-weight:600; color:var(--text-color,#1c2126); }
// 		.cbd-drill-card__meta { font-size:11px; color:var(--text-muted,#8d99a6); display:flex; align-items:center; gap:5px; margin-top:1px; }
// 		.cbd-drill-card__sep { color:var(--border-color,#d1d8dd); }
// 		.cbd-drill-card__bar-track { height:4px; background:var(--border-color,#d1d8dd); border-radius:2px; overflow:hidden; }
// 		.cbd-drill-card__amounts { display:flex; gap:0; border:1px solid var(--border-color,#d1d8dd); border-radius:6px; overflow:hidden; margin-bottom:7px; }
// 		.cbd-drill-card__amt-item { flex:1; padding:5px 8px; border-right:1px solid var(--border-color,#d1d8dd); text-align:center; }
// 		.cbd-drill-card__amt-item:last-child { border-right:none; }
// 		.cbd-drill-card__amt-label { display:block; font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:.4px; color:var(--text-muted,#8d99a6); margin-bottom:2px; }
// 		.cbd-drill-card__amt-val { display:block; font-size:12px; font-weight:600; color:var(--text-color,#1c2126); }
// 		.cbd-drill-card__bar-fill { height:100%; border-radius:2px; transition:width .4s ease; }
// 		.cbd-drill-card__bar-fill--green { background:#639922; }
// 		.cbd-drill-card__bar-fill--amber { background:#BA7517; }
// 		.cbd-drill-card__bar-fill--red   { background:#E24B4A; }
// 		.cbd-drill-blist { display:flex; flex-direction:column; }
// 		.cbd-drill-brow { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid var(--border-color,#d1d8dd); gap:10px; transition:background .1s; }
// 		.cbd-drill-brow:hover { background:var(--control-bg,#f7f9fc); }
// 		.cbd-drill-brow__left { display:flex; align-items:flex-start; gap:10px; min-width:0; flex:1; }
// 		.cbd-drill-brow__seq { width:22px; height:22px; flex-shrink:0; border-radius:50%; background:var(--control-bg,#f0f4f8); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:var(--text-muted,#8d99a6); margin-top:2px; }
// 		.cbd-drill-brow__detail { flex:1; min-width:0; }
// 		.cbd-drill-brow__ref { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:4px; }
// 		.cbd-drill-brow__creche-badge { display:inline-flex; align-items:center; padding:1px 7px; background:#E6F1FB; color:#0C447C; border-radius:10px; font-size:10px; font-weight:600; }
// 		.cbd-drill-brow__meta { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--text-muted,#8d99a6); flex-wrap:wrap; }
// 		.cbd-drill-brow__meta svg { color:var(--text-muted,#8d99a6); flex-shrink:0; }
// 		.cbd-drill-brow__sep { color:var(--border-color,#d1d8dd); margin:0 2px; }
// 		.cbd-drill-brow__fy { flex-shrink:0; font-size:11px; font-weight:600; color:var(--text-muted,#8d99a6); background:var(--control-bg,#f0f4f8); padding:2px 8px; border-radius:10px; white-space:nowrap; }
// 		.cbd-drill-list { padding:4px 0; }
// 		.cbd-drill-list__row { display:flex; align-items:center; gap:12px; padding:10px 16px; border-bottom:1px solid var(--border-color,#d1d8dd); transition:background .1s; }
// 		.cbd-drill-list__row:last-child { border-bottom:none; }
// 		.cbd-drill-list__row:hover { background:var(--control-bg,#f7f9fc); }
// 		.cbd-drill-list__num { width:24px; height:24px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:#E6F1FB; font-size:10px; font-weight:700; color:#0C447C; flex-shrink:0; }
// 		.cbd-drill-list__dot { width:6px; height:6px; border-radius:50%; background:#378ADD; flex-shrink:0; }
// 		.cbd-drill-list__body { flex:1; min-width:0; }
// 		.cbd-drill-list__text { font-size:13px; font-weight:500; color:var(--text-color,#1c2126); }
// 		.cbd-drill-list__detail { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:2px; }
// 		.cbd-drill-empty { padding:40px 20px; text-align:center; font-size:13px; color:var(--text-muted,#8d99a6); }
// 		.cbd-ostat__icon {
// 			width:34px; height:34px; flex-shrink:0;
// 			display:flex; align-items:center; justify-content:center;
// 			border-radius:8px;
// 			background:var(--ost-ibg,#EEF2FF);
// 			color:var(--ost-color,#378ADD);
// 		}
// 		.cbd-ostat__body { min-width:0; flex:1; }
// 		.cbd-ostat__value {
// 			font-size:18px; font-weight:800; color:#1f2d3d;
// 			line-height:1.1; margin-bottom:1px;
// 		}
// 		.cbd-ostat__label {
// 			font-size:9px; font-weight:700; text-transform:uppercase;
// 			letter-spacing:.5px; color:#8492a6;
// 			margin-top:2px; white-space:nowrap;
// 			overflow:hidden; text-overflow:ellipsis;
// 		}
// 				/* ════════════════════════════════════════════════════════
// 		   UNIFIED CARD ATOM  (overview strip + summary cards)
// 		   Both groups use the same base card — only the grid
// 		   columns differ so sizes stay identical.
// 		   ════════════════════════════════════════════════════════ */

// 		/* ── Section labels above each group ── */
// 		.cbd-section-hd {
// 			display:flex; align-items:center; gap:10px;
// 			margin:0 0 10px;
// 		}
// 		.cbd-section-hd__line {
// 			flex:1; height:1px; background:#e8edf3;
// 		}
// 		.cbd-section-hd__label {
// 			font-size:10px; font-weight:700; text-transform:uppercase;
// 			letter-spacing:.8px; color:#a0aec0;
// 			white-space:nowrap; flex-shrink:0;
// 		}

// 		/* ── Overview strip — 8 compact cards in one row ── */
// 		.cbd-overview-strip {
// 			display:grid;
// 			grid-template-columns:repeat(8,1fr);
// 			gap:8px; margin-bottom:6px;
// 		}

// 		/* ── Summary cards (4-col, same as overview strip) ── */
// 		.cbd-summary-cards {
// 			display:grid;
// 			grid-template-columns:repeat(4,1fr);
// 			gap:10px; margin-bottom:6px;
// 		}

// 		/* ── Shared card base ── */
// 		.cbd-ostat,
// 		.cbd-scard {
// 			background:#fff;
// 			border:1px solid #e8edf3;
// 			border-left:4px solid var(--card-accent,#378ADD);
// 			border-radius:10px;
// 			min-width:0; word-break:break-word;
// 			transition:box-shadow .2s;
// 		}
// 		/* scard: generous padding, fixed min-height */
// 		.cbd-scard { padding:16px 16px 13px; min-height:120px; }
// 		/* ostat: compact padding, no min-height — fits naturally */
// 		.cbd-ostat { padding:11px 12px 10px; min-height:0; position:relative; }
// 		.cbd-ostat--clickable { cursor:pointer; }
// 		.cbd-ostat:hover,
// 		.cbd-scard:hover {
// 			box-shadow:0 4px 18px rgba(0,0,0,.09);
// 		}

// 		/* ostat inherits card atom but also needs flex */
// 		.cbd-ostat {
// 			display:flex; align-items:center; gap:10px;
// 			position:relative;
// 		}
// 		.cbd-ostat--clickable:hover .cbd-ostat__arrow { opacity:1; }
// 		.cbd-ostat__arrow {
// 			position:absolute; right:10px; top:50%; transform:translateY(-50%);
// 			color:var(--card-accent,#378ADD); opacity:0;
// 			transition:opacity .15s; font-size:12px; flex-shrink:0;
// 		}
// 		/* ostat: compact horizontal row */
// 		.cbd-ostat {
// 			display:flex !important; flex-direction:row !important;
// 			align-items:center !important; gap:10px;
// 		}
// 		.cbd-ostat__head { display:none; }
// 		.cbd-ostat__icon {
// 			width:32px; height:32px; flex-shrink:0;
// 			display:flex; align-items:center; justify-content:center;
// 			border-radius:7px;
// 			background:var(--ost-ibg,#EEF2FF);
// 			color:var(--card-accent,#378ADD);
// 		}
// 		.cbd-ostat__icon svg { width:16px; height:16px; }
// 		.cbd-ostat__body { min-width:0; flex:1; }
// 		.cbd-ostat__value {
// 			font-size:17px; font-weight:800; color:#1a202c;
// 			line-height:1.1; margin-bottom:1px;
// 		}
// 		.cbd-ostat__label {
// 			font-size:9px; font-weight:700; text-transform:uppercase;
// 			letter-spacing:.55px; color:#8492a6; line-height:1.3;
// 			white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
// 		}
// 		.cbd-ostat__arrow {
// 			position:absolute; right:8px; top:50%; transform:translateY(-50%);
// 			color:var(--card-accent,#378ADD);
// 			opacity:0; transition:opacity .15s; font-size:11px;
// 		}
// 		.cbd-ostat--clickable:hover .cbd-ostat__arrow { opacity:1; }

// 		/* ── Summary card inner (NO icon) ── */
// 		.cbd-scard {
// 			display:flex; flex-direction:column; cursor:pointer;
// 		}
// 		.cbd-scard__lbl {
// 			font-size:10px; font-weight:700; text-transform:uppercase;
// 			letter-spacing:.65px; color:#8492a6; line-height:1.3;
// 			margin-bottom:8px;
// 		}
// 		.cbd-scard__num {
// 			font-size:26px; font-weight:800; color:#1a202c;
// 			line-height:1; margin-bottom:6px; letter-spacing:-.5px;
// 		}
// 		.cbd-scard__num-val { display:inline; }
// 		.cbd-scard__unit { font-size:11px; font-weight:500; color:#8492a6; margin-left:4px; letter-spacing:0; }
// 		.cbd-scard__foot {
// 			display:flex; align-items:center; justify-content:space-between;
// 			padding-top:8px; margin-top:auto;
// 			border-top:1px solid #f0f4f8;
// 		}
// 		.cbd-scard__sub { font-size:10px; color:#a0aec0; line-height:1.3; }
// 		.cbd-scard__cta {
// 			display:inline-flex; align-items:center; gap:2px;
// 			font-size:10px; font-weight:700; color:var(--card-accent,#378ADD);
// 			opacity:0; transition:opacity .15s; white-space:nowrap;
// 		}
// 		.cbd-scard:hover .cbd-scard__cta { opacity:1; }

// 		/* ─── Alert component ─── */
// 		.cbd-alert {
// 			display:flex; align-items:flex-start; gap:12px;
// 			padding:12px 16px; margin-bottom:14px;
// 			border-radius:8px; border:1px solid transparent;
// 			animation:cbd-slide-in .3s ease;
// 		}
// 		@keyframes cbd-slide-in { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
// 		.cbd-alert--warning {
// 			background:#fffbeb; border-color:#fde68a; border-left:4px solid #f59e0b;
// 		}
// 		.cbd-alert__icon { flex-shrink:0; color:#d97706; margin-top:1px; }
// 		.cbd-alert__body { flex:1; min-width:0; }
// 		.cbd-alert__title { display:block; font-size:12px; font-weight:700; color:#92400e; margin-bottom:2px; }
// 		.cbd-alert__msg   { display:block; font-size:12px; color:#78350f; }
// 		.cbd-alert__dismiss {
// 			flex-shrink:0; background:none; border:none; cursor:pointer;
// 			color:#a16207; padding:2px; border-radius:4px; opacity:.7;
// 			transition:opacity .12s, background .12s;
// 		}
// 		.cbd-alert__dismiss:hover { opacity:1; background:rgba(0,0,0,.06); }

// 		/* ═══ Drill-down tables (cbd-dt2) — per-card accent colours ═══ */
// 		.cbd-dt2 { width:100%; border-collapse:collapse; font-size:13px; }
// 		.cbd-dt2 thead tr { background:var(--dt2-hdr,#4F46E5); }
// 		.cbd-dt2 .cbd-dt2__th-num,
// 		.cbd-dt2 .cbd-dt2__th { padding:9px 12px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--dt2-hdr-text,#fff); border:1px solid rgba(255,255,255,.2); white-space:nowrap; }
// 		.cbd-dt2 .cbd-dt2__th--r { text-align:right; }
// 		.cbd-dt2 .cbd-dt2__th-num { width:42px; text-align:center; }
// 		.cbd-dt2 tbody tr { transition:background .1s; }
// 		.cbd-dt2 tbody tr:hover td { background:#f7f9fc; }
// 		.cbd-dt2 tbody tr:nth-child(even) td { background:#fafafa; }
// 		.cbd-dt2 tbody tr:nth-child(even):hover td { background:#f0f4f8; }
// 		.cbd-dt2__num { text-align:center; font-size:11px; font-weight:700; border:1px solid var(--border-color,#d1d8dd); padding:8px 6px; }
// 		.cbd-dt2__cell { padding:9px 12px; font-size:13px; font-weight:500; color:var(--text-color,#1c2126); border:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-dt2__badge-cell { padding:7px 12px; text-align:right; border:1px solid var(--border-color,#d1d8dd); }
// 		.cbd-dt2__pill { display:inline-flex; align-items:center; border-radius:20px; padding:3px 10px; font-size:12px; font-weight:700; border:1px solid; }

// 		/* ═══ Drill modal accent modifiers ═══ */
// 		.cbd-drill-modal--indigo .cbd-drill-modal__icon { background:#EEF2FF; color:#4F46E5; }
// 		.cbd-drill-modal--blue   .cbd-drill-modal__icon { background:#E0F2FE; color:#0369A1; }
// 		.cbd-drill-modal--teal   .cbd-drill-modal__icon { background:#CCFBF1; color:#0D9488; }
// 		.cbd-drill-modal--orange .cbd-drill-modal__icon { background:#FEF3C7; color:#B45309; }
// 		.cbd-drill-modal--violet .cbd-drill-modal__icon { background:#EDE9FE; color:#7C3AED; }
// 		.cbd-drill-modal--rose   .cbd-drill-modal__icon { background:#FCE7F3; color:#BE185D; }
// 		.cbd-drill-modal--indigo .cbd-drill-modal__title { color:#3730A3; }
// 		.cbd-drill-modal--blue   .cbd-drill-modal__title { color:#075985; }
// 		.cbd-drill-modal--teal   .cbd-drill-modal__title { color:#115E59; }
// 		.cbd-drill-modal--orange .cbd-drill-modal__title { color:#92400E; }
// 		.cbd-drill-modal--violet .cbd-drill-modal__title { color:#4C1D95; }
// 		.cbd-drill-modal--rose   .cbd-drill-modal__title { color:#831843; }
// 		.cbd-drill-modal--indigo { border-top:3px solid #4F46E5; }
// 		.cbd-drill-modal--blue   { border-top:3px solid #0369A1; }
// 		.cbd-drill-modal--teal   { border-top:3px solid #0D9488; }
// 		.cbd-drill-modal--orange { border-top:3px solid #B45309; }
// 		.cbd-drill-modal--violet { border-top:3px solid #7C3AED; }
// 		.cbd-drill-modal--rose   { border-top:3px solid #BE185D; }

// 		/* ═══ Budget modal — viewport slide ═══ */
// 		.cbd-bm__modal {
// 			overflow:hidden; max-width:720px;
// 			display:flex; flex-direction:column;
// 		}
// 		.cbd-bm__modal .cbd-bm__viewport {
// 			display:flex; width:200%; flex:1;
// 			transition:transform .28s cubic-bezier(.4,0,.2,1);
// 		}
// 		.cbd-bm__modal--detail .cbd-bm__viewport { transform:translateX(-50%); }
// 		.cbd-bm__page {
// 			width:50%; flex-shrink:0;
// 			display:flex; flex-direction:column; overflow:hidden; min-height:200px;
// 		}
// 		.cbd-bm__body { flex:1; overflow-y:auto; }
// 		.cbd-bm__body::-webkit-scrollbar { width:4px; }
// 		.cbd-bm__body::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }

// 		/* Topbar with breadcrumb */
// 		.cbd-bm__topbar {
// 			display:flex; align-items:center; justify-content:space-between;
// 			padding:12px 18px;
// 			border-bottom:1px solid #e5e7eb;
// 			flex-shrink:0; background:#fff;
// 		}
// 		.cbd-bm__close {
// 			width:28px; height:28px; display:flex; align-items:center; justify-content:center;
// 			border:1px solid var(--border-color,#d1d8dd); border-radius:6px;
// 			background:none; cursor:pointer; color:var(--text-muted,#8d99a6); flex-shrink:0;
// 			transition:background .12s, color .12s;
// 		}
// 		.cbd-bm__close:hover { background:#FCEBEB; color:#A32D2D; border-color:#F09595; }

// 		/* Breadcrumb */
// 		.cbd-bc { display:flex; align-items:center; gap:4px; min-width:0; flex:1; }
// 		.cbd-bc__item { font-size:13px; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
// 		.cbd-bc__item--root   { font-weight:700; color:var(--text-color,#1c2126); }
// 		.cbd-bc__item--active { font-weight:700; color:var(--text-color,#1c2126); }
// 		.cbd-bc__item--link { background:none; border:none; padding:0; cursor:pointer; color:#4F46E5; font-weight:500; font-size:13px; transition:color .12s; white-space:nowrap; }
// 		.cbd-bc__item--link:hover { color:#3730A3; text-decoration:underline; }
// 		.cbd-bc__sep { color:var(--text-muted,#8d99a6); font-size:15px; line-height:1; flex-shrink:0; }

// 		/* Simple table (cbd-st) */
// 		.cbd-st { width:100%; border-collapse:collapse; font-size:13px; }
// 		.cbd-st th, .cbd-st td { border:1px solid #e5e7eb; padding:9px 12px; }
// 		.cbd-st__th { text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#6b7280; background:#f9fafb; }
// 		.cbd-st__th--num { width:44px; text-align:center; }
// 		.cbd-st__th--r   { text-align:right; }
// 		.cbd-st__num  { text-align:center; color:var(--text-muted,#8d99a6); font-size:12px; background:var(--control-bg,#fafafa); }
// 		.cbd-st__cell { color:var(--text-color,#1c2126); }
// 		.cbd-st__r    { text-align:right; font-weight:600; }
// 		.cbd-st__foot { background:#f9fafb; color:#374151; font-weight:600; font-size:13px; border-top:1px solid #e5e7eb !important; }
// 		.cbd-st tbody tr:hover td { background:#f9fafb; }
// 		.cbd-st__action { text-align:center; }
// 		.cbd-st__drill-btn { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; font-size:11px; font-weight:600; color:#4F46E5; background:#EEF2FF; border:1px solid #c7d2fe; border-radius:5px; cursor:pointer; white-space:nowrap; transition:background .12s; }
// 		.cbd-st__drill-btn:hover { background:#e0e7ff; }

// 				/* PFO banner */
// 		.cbd-pfo-banner {
// 			display:flex; align-items:center; gap:10px;
// 			padding:12px 16px; margin-bottom:12px;
// 			background:linear-gradient(135deg,#FFF7ED,#FFEDD5);
// 			border:1px solid #FED7AA; border-left:4px solid #F97316;
// 			border-radius:10px; font-size:13px; font-weight:500; color:#7C2D12;
// 			box-shadow:0 2px 8px rgba(249,115,22,.15);
// 		}
// 		.cbd-pfo-banner svg { flex-shrink:0; color:#F97316; width:18px; height:18px; }
// 				/* ─── Summary / Budget modal overlay ───────────── */
// 		.cbd-sm-wrap {
// 			position:fixed; inset:0; z-index:3100;
// 			background:rgba(0,0,0,0);
// 			display:flex; align-items:flex-start; justify-content:center;
// 			padding:0; box-sizing:border-box; overflow-y:auto;
// 			transition:background .2s ease; pointer-events:none;
// 		}
// 		.cbd-sm-wrap--open { background:rgba(0,0,0,.4); pointer-events:all; }

// 		.cbd-sm-modal {
// 			background:#fff; width:auto; min-width:440px;
// 			max-width:min(95vw,820px); margin:40px auto;
// 			border-radius:10px; border:1px solid #e5e7eb;
// 			box-shadow:0 8px 32px rgba(0,0,0,.12);
// 			display:flex; flex-direction:column;
// 			max-height:calc(100vh - 80px);
// 			opacity:0; transform:translateY(12px);
// 			transition:opacity .2s ease, transform .2s ease; overflow:hidden;
// 		}
// 		.cbd-sm-wrap--open .cbd-sm-modal { opacity:1; transform:translateY(0); }

// 		.cbd-sm-modal__header {
// 			display:flex; align-items:center; justify-content:space-between;
// 			padding:16px 20px; border-bottom:1px solid #e5e7eb; flex-shrink:0;
// 		}
// 		.cbd-sm-modal__header-left { display:flex; align-items:center; gap:12px; }
// 		.cbd-sm-modal__title { font-size:15px; font-weight:700; color:#111827; }
// 		.cbd-sm-modal__sub   { font-size:12px; color:#6b7280; margin-top:2px; }
// 		.cbd-sm-modal__close {
// 			width:28px; height:28px; display:flex; align-items:center; justify-content:center;
// 			border:1px solid #e5e7eb; border-radius:6px; background:none;
// 			cursor:pointer; color:#6b7280; transition:background .12s, color .12s;
// 		}
// 		.cbd-sm-modal__close:hover { background:#fee2e2; color:#dc2626; border-color:#fca5a5; }
// 		.cbd-sm-modal__body { flex:1; overflow-y:auto; }
// 		.cbd-sm-modal__body::-webkit-scrollbar { width:4px; }
// 		.cbd-sm-modal__body::-webkit-scrollbar-thumb { background:#e5e7eb; border-radius:2px; }
// 		.cbd-sm-tbl-wrap { overflow-x:auto; }

// 		/* summary table inside _open_summary_modal */
// 		.cbd-sm-table { width:100%; border-collapse:collapse; font-size:13px; white-space:nowrap; }
// 		.cbd-sm-table thead th {
// 			padding:9px 12px; text-align:left; font-size:10px; font-weight:700;
// 			text-transform:uppercase; letter-spacing:.5px; color:#6b7280;
// 			background:#f9fafb; border-bottom:2px solid #e5e7eb; position:sticky; top:0; z-index:2;
// 		}
// 		.cbd-sm__summary-row { cursor:pointer; border-bottom:1px solid #e5e7eb; transition:background .1s; }
// 		.cbd-sm__summary-row:hover { background:#f9fafb; }
// 		.cbd-sm__summary-row--open { background:#f5f3ff; }
// 		.cbd-sm__summary-row td { padding:10px 12px; vertical-align:middle; }
// 		.cbd-sm__td-expand { text-align:center; width:28px; }
// 		.cbd-sm__expand-icon { font-size:9px; display:inline-block; transition:transform .15s, color .15s; }
// 		.cbd-sm__td-name { min-width:180px; }
// 		.cbd-sm__partner-name { font-size:12px; font-weight:600; color:#111827; }
// 		.cbd-sm__partner-meta { font-size:11px; color:#9ca3af; margin-top:1px; }
// 		.cbd-sm__td-r   { text-align:right !important; }
// 		.cbd-sm__td-pct { text-align:center !important; }
// 		.cbd-sm__td-actions { text-align:center !important; white-space:nowrap; }
// 		.cbd-sm__expand-row td { padding:0 !important; }
// 		.cbd-sm__expand-td { border-bottom:2px solid #e5e7eb; border-left:3px solid #6366F1; }
// 		.cbd-sm__expand-td .cbd-tbl-wrap { border-radius:0; }
// 		.cbd-sm__grand-row td { padding:10px 12px; background:#f9fafb; border-top:2px solid #e5e7eb; font-size:12px; }
// 		.cbd-sm__btn-view { color:#4F46E5; background:#EEF2FF; border-color:#c7d2fe; }
// 		.cbd-sm__btn-view:hover { background:#e0e7ff; }
// 		.cbd-sm__btn-disb { color:#059669; background:#d1fae5; border-color:#6ee7b7; margin-left:4px; }
// 		.cbd-sm__btn-disb:hover { background:#a7f3d0; }

// 		/* ─── Budget modal (bm) — two-page slide ─────── */
// 		.cbd-bm__modal { overflow:hidden; max-width:640px; display:flex; flex-direction:column; }
// 		.cbd-bm__modal .cbd-bm__viewport { display:flex; width:200%; flex:1; transition:transform .28s cubic-bezier(.4,0,.2,1); }
// 		.cbd-bm__modal--detail .cbd-bm__viewport { transform:translateX(-50%); }
// 		.cbd-bm__page { width:50%; flex-shrink:0; display:flex; flex-direction:column; overflow:hidden; min-height:200px; }
// 		.cbd-bm__body { flex:1; overflow-y:auto; }
// 		.cbd-bm__body::-webkit-scrollbar { width:4px; }
// 		.cbd-bm__body::-webkit-scrollbar-thumb { background:#e5e7eb; border-radius:2px; }
// 		.cbd-bm__topbar {
// 			display:flex; align-items:center; justify-content:space-between;
// 			padding:12px 18px; border-bottom:1px solid #e5e7eb; flex-shrink:0; background:#fff;
// 		}
// 		.cbd-bm__close {
// 			width:28px; height:28px; display:flex; align-items:center; justify-content:center;
// 			border:1px solid #e5e7eb; border-radius:6px; background:none;
// 			cursor:pointer; color:#6b7280; flex-shrink:0; transition:background .12s, color .12s;
// 		}
// 		.cbd-bm__close:hover { background:#fee2e2; color:#dc2626; border-color:#fca5a5; }

// 		/* ─── Breadcrumb ─────────────────────────────── */
// 		.cbd-bc { display:flex; align-items:center; gap:4px; min-width:0; flex:1; }
// 		.cbd-bc__item { font-size:13px; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
// 		.cbd-bc__item--root   { font-weight:700; color:#111827; }
// 		.cbd-bc__item--active { font-weight:700; color:#111827; }
// 		.cbd-bc__item--link {
// 			background:none; border:none; padding:0; cursor:pointer;
// 			color:#4F46E5; font-weight:500; font-size:13px;
// 			transition:color .12s; white-space:nowrap;
// 		}
// 		.cbd-bc__item--link:hover { color:#3730A3; text-decoration:underline; }
// 		.cbd-bc__sep { color:#d1d5db; font-size:15px; line-height:1; flex-shrink:0; }

// 				/* ─── Universal Drill Modal (cbd-dw) ─── */
// 		.cbd-dw {
// 			position:fixed; inset:0; z-index:3200;
// 			background:rgba(0,0,0,0);
// 			display:flex; align-items:flex-start; justify-content:center;
// 			padding:0; overflow-y:auto; box-sizing:border-box;
// 			transition:background .2s ease; pointer-events:none;
// 		}
// 		.cbd-dw--open { background:rgba(0,0,0,.45); pointer-events:all; }
// 		.cbd-dm {
// 			background:#fff;
// 			width:min(99vw, 1380px);
// 			margin:14px auto; border-radius:12px;
// 			border:1px solid #e2e8f0;
// 			box-shadow:0 24px 64px rgba(0,0,0,.20);
// 			display:flex; flex-direction:column;
// 			min-height:200px;
// 			max-height:calc(100vh - 28px);
// 			overflow:hidden;
// 			opacity:0; transform:translateY(14px);
// 			transition:opacity .2s ease, transform .2s ease;
// 		}
// 		.cbd-dw--open .cbd-dm { opacity:1; transform:translateY(0); }
// 		.cbd-dm__track {
// 			display:flex; width:300%; flex:1;
// 			transition:transform .28s cubic-bezier(.4,0,.2,1);
// 			min-height:0;
// 		}
// 		.cbd-dm__page {
// 			width:calc(100%/3); flex-shrink:0;
// 			display:flex; flex-direction:column;
// 			overflow:hidden; min-height:0;
// 		}
// 		.cbd-dm__topbar {
// 			display:flex; align-items:center; justify-content:space-between;
// 			padding:11px 18px; border-bottom:2px solid #e8edf3;
// 			flex-shrink:0; gap:12px;
// 			background:linear-gradient(to right,#f8fafc,#fff);
// 		}
// 		.cbd-dm__topbar-left { display:flex; align-items:center; gap:8px; min-width:0; flex:1; }
// 		.cbd-dm__back {
// 			display:inline-flex; align-items:center; gap:4px;
// 			padding:4px 10px; font-size:12px; font-weight:600;
// 			color:#374151; background:#fff; border:1px solid #d1d5db;
// 			border-radius:6px; cursor:pointer; white-space:nowrap; flex-shrink:0;
// 			transition:background .12s, border-color .12s;
// 		}
// 		.cbd-dm__back:hover { background:#f3f4f6; border-color:#9ca3af; }
// 		.cbd-dm__actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
// 		.cbd-dm__body {
// 			flex:1; overflow-y:auto; overflow-x:hidden;
// 			min-height:0;
// 		}
// 		.cbd-dm__body::-webkit-scrollbar { width:5px; }
// 		.cbd-dm__body::-webkit-scrollbar-track { background:#f1f5f9; }
// 		.cbd-dm__body::-webkit-scrollbar-thumb { background:#94a3b8; border-radius:3px; }
// 		.cbd-dm__tbl-wrap {
// 			overflow-x:auto; overflow-y:visible;
// 		}
// 		.cbd-dm__tbl-wrap::-webkit-scrollbar { height:5px; }
// 		.cbd-dm__tbl-wrap::-webkit-scrollbar-track { background:#f1f5f9; }
// 		.cbd-dm__tbl-wrap::-webkit-scrollbar-thumb { background:#94a3b8; border-radius:3px; }

// 		/* ── Sticky totals bar — never scrolls, always visible ── */
// 		.cbd-dm__sticky-foot {
// 			flex-shrink:0; flex-grow:0;
// 			overflow-x:auto;
// 			border-top:2px solid #3b82f6;
// 			background:#dbeafe;
// 			z-index:10;
// 			/* sticky within flex column — always at bottom of page */
// 			position:sticky; bottom:0;
// 		}
// 		.cbd-dm__sticky-foot::-webkit-scrollbar { height:0; }
// 		.cbd-dm__sticky-foot::-webkit-scrollbar-thumb { background:#93c5fd; }
// 		.cbd-dt--foot-only {
// 			width:100%; border-collapse:collapse;
// 			white-space:nowrap; table-layout:fixed;
// 			border:1px solid #93c5fd;
// 		}
// 		.cbd-dt--foot-only td {
// 			padding:10px 14px; font-weight:800; font-size:13px;
// 			color:#1e3a5f; background:#bfdbfe;
// 			border:1px solid #93c5fd;
// 		}
// 		.cbd-dt__foot--num { width:44px; }

// 		/* ── Page level badge in topbar ── */
// 		.cbd-dm__page-badge {
// 			display:inline-flex; align-items:center;
// 			padding:2px 9px; font-size:10px; font-weight:700;
// 			text-transform:uppercase; letter-spacing:.5px;
// 			border-radius:20px; background:#eff6ff;
// 			color:#1d4ed8; border:1px solid #bfdbfe;
// 			white-space:nowrap; flex-shrink:0;
// 		}
// 		.cbd-dm__loading { padding:32px; text-align:center; color:#9ca3af; font-size:13px; }
// 		.cbd-dm__empty   { padding:32px; text-align:center; color:#9ca3af; font-size:13px; }
// 		.cbd-dm__footer {
// 			display:flex; align-items:center; justify-content:center;
// 			padding:10px 18px; border-top:1px solid #e8edf3; flex-shrink:0;
// 			background:#f8fafc; gap:12px;
// 		}
// 		.cbd-dm__close {
// 			display:inline-flex; align-items:center; gap:6px;
// 			padding:7px 24px; font-size:13px; font-weight:600;
// 			border:1px solid #fca5a5; border-radius:6px;
// 			background:#fff5f5; cursor:pointer; color:#dc2626;
// 			transition:background .12s;
// 		}
// 		.cbd-dm__close:hover { background:#fee2e2; }

// 		/* Breadcrumb */
// 		.cbd-bc { display:flex; align-items:center; gap:5px; flex:1; min-width:0; }
// 		.cbd-bc__item { font-size:13px; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
// 		.cbd-bc__item--active { font-weight:700; color:#111827; }
// 		.cbd-bc__item--muted  { font-weight:400; color:#9ca3af; }
// 		.cbd-bc__item--link {
// 			font-weight:500; color:#2563EB; cursor:pointer;
// 			background:none; border:none; padding:0; font-size:13px;
// 			text-decoration:none; transition:color .1s;
// 		}
// 		.cbd-bc__item--link:hover { color:#1d4ed8; text-decoration:underline; }
// 		.cbd-bc__sep { color:#d1d5db; font-size:14px; flex-shrink:0; }

// 		/* ─── Drill-down table — full grid, clean borders ─── */
// 		.cbd-dt {
// 			width:100%; border-collapse:collapse;
// 			font-size:13px; white-space:nowrap;
// 			border:1px solid #cbd5e1;
// 		}
// 		.cbd-dt thead { position:sticky; top:0; z-index:2; }
// 		.cbd-dt th {
// 			padding:10px 14px; text-align:left;
// 			font-size:10px; font-weight:700; text-transform:uppercase;
// 			letter-spacing:.5px;
// 			color:#1e3a5f; background:#dbeafe;
// 			border:1px solid #93c5fd;
// 		}
// 		.cbd-dt td {
// 			padding:9px 14px;
// 			border:1px solid #e2e8f0;
// 			vertical-align:middle; color:#334155;
// 			background:#fff;
// 		}
// 		.cbd-dt__th--num { width:44px; text-align:center; }
// 		.cbd-dt__th--r   { text-align:right; }
// 		/* Subtle hover only — no alternating stripes, like report-card table */
// 		.cbd-dt__row:hover td { background:#eff6ff !important; transition:background .08s; }
// 		.cbd-dt__num  { text-align:center; color:#64748b; font-size:11px; width:44px; font-weight:600; background:#f8fafc; }
// 		.cbd-dt__name { color:#0f172a; font-weight:500; }
// 		.cbd-dt__r    { text-align:right; font-weight:700; color:#0f172a; }
// 		.cbd-dt__pct  { font-weight:800; }
// 		.cbd-dt__act  { text-align:center; }
// 		/* Footer / Total row */
// 		.cbd-dt tfoot tr td,
// 		.cbd-dt__foot {
// 			padding:10px 14px; font-weight:800; font-size:13px;
// 			color:#1e3a5f; background:#bfdbfe !important;
// 			border:1px solid #93c5fd !important;
// 		}
// 		.cbd-dt__btn {
// 			display:inline-flex; align-items:center; gap:4px;
// 			padding:4px 12px; font-size:11px; font-weight:600;
// 			color:#1d4ed8; background:#eff6ff; border:1px solid #93c5fd;
// 			border-radius:6px; cursor:pointer; transition:all .12s;
// 		}
// 		.cbd-dt__btn:hover { background:#dbeafe; box-shadow:0 2px 6px rgba(37,99,235,.2); }

// 		/* Export buttons */
// 		.cbd-exp-btn {
// 			display:inline-flex; align-items:center; gap:5px;
// 			padding:4px 11px; font-size:11px; font-weight:600;
// 			border-radius:5px; cursor:pointer; transition:background .12s;
// 		}
// 		.cbd-exp-btn--xls { color:#166534; background:#dcfce7; border:1px solid #86efac; }
// 		.cbd-exp-btn--xls:hover { background:#bbf7d0; }
// 		.cbd-exp-btn--pdf { color:#7c2d12; background:#fef3c7; border:1px solid #fcd34d; }
// 		.cbd-exp-btn--pdf:hover { background:#fde68a; }

// 				.cbd-tip-wrap { border-bottom:1px dashed #94a3b8; cursor:default; }
// 		.cbd-tip-wrap-bak { position:relative; display:inline-flex; align-items:center; gap:2px; border-bottom:1.5px dashed rgba(55,138,221,.45); padding-bottom:1px; transition:border-color .15s; }
// 		.cbd-tip-wrap:hover { border-bottom-color:rgba(55,138,221,.9); }
// 		#cbd-global-tip { position:fixed; z-index:9999; pointer-events:none; background:#1A1D23; border:1px solid rgba(255,255,255,.10); color:#fff; border-radius:10px; font-family:inherit; box-shadow:0 12px 32px rgba(0,0,0,.30), 0 2px 8px rgba(0,0,0,.20); opacity:0; transform:translateY(8px) scale(.96); transition:opacity .16s ease, transform .2s cubic-bezier(.22,1,.36,1); min-width:150px; max-width:260px; overflow:hidden; padding:0; }
// 		#cbd-global-tip .cbd-tip__header { padding:7px 12px 5px; border-bottom:1px solid rgba(255,255,255,.08); display:flex; align-items:center; gap:6px; }
// 		#cbd-global-tip .cbd-tip__icon { width:16px; height:16px; border-radius:4px; background:rgba(55,138,221,.25); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
// 		#cbd-global-tip .cbd-tip__label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.7px; color:rgba(255,255,255,.50); }
// 		#cbd-global-tip .cbd-tip__body { padding:6px 12px 10px; }
// 		#cbd-global-tip .cbd-tip__amount { font-size:16px; font-weight:700; letter-spacing:.3px; color:#fff; display:block; }
// 		#cbd-global-tip .cbd-tip__hint { font-size:10px; color:rgba(255,255,255,.35); margin-top:2px; display:block; }
// 		#cbd-global-tip::after { content:''; position:absolute; left:50%; transform:translateX(-50%); bottom:-6px; border:6px solid transparent; border-bottom:none; border-top-color:#1A1D23; }
// 		#cbd-global-tip.cbd-tip--visible { opacity:1; transform:translateY(0) scale(1); }
// 		#cbd-global-tip.cbd-tip--below::after { bottom:auto; top:-6px; border-top:none; border-bottom:6px solid #1A1D23; }
// 		@media (max-width:1024px) { .cbd-filter-col { flex:1 1 33.33%; min-width:140px; } .cbd-summary-cards { grid-template-columns:repeat(4,1fr); gap:10px; } .cbd-overview-strip { grid-template-columns:repeat(2,1fr); }  .cbd-panel-left, .cbd-panel-right { width:62vw; } .cbd-disb-modal { width:68vw; } .cbd-scard__num { font-size:18px; } .cbd-partner__footer { flex-wrap:wrap; } }
// 		@media (max-width:768px) { .cbd-root { padding:8px 10px 30px; } .cbd-filter-col { flex:1 1 50%; min-width:130px; } .cbd-summary-cards { grid-template-columns:repeat(2,1fr); gap:10px; } .cbd-overview-strip { flex-wrap:wrap; } .cbd-ostat { flex:1 1 50%; } .cbd-partner__head { flex-direction:column; gap:8px; } .cbd-partner__right { flex-direction:row; align-items:center; justify-content:space-between; flex-wrap:wrap; width:100%; } .cbd-partner__metrics { gap:4px; } .cbd-metric { min-width:60px; padding:2px 6px; } .cbd-metric__value { font-size:11px; } .cbd-partner__footer { flex-direction:column; } .cbd-footer-block + .cbd-footer-block { border-left:none; border-top:1px solid var(--border-color,#d1d8dd); } .cbd-partner__grants { padding-left:0; } .cbd-panel-left, .cbd-panel-right { width:100vw; max-width:100vw; border-radius:0; } .cbd-panel-left.cbd-panel--full, .cbd-panel-right.cbd-panel--full { width:100vw; } .cbd-disb-modal { width:100vw; max-width:100vw; border-radius:0; } .cbd-table { font-size:11px; } .cbd-table th, .cbd-table td { padding:6px 8px; } #cbd_partners { max-height:none; overflow-y:visible; } .cbd-centre-close { display:none !important; } }
// 		@media (max-width:480px) { .cbd-root { padding:6px 8px 24px; } .cbd-filter-col { flex:1 1 100%; min-width:0; } .cbd-summary-cards { grid-template-columns:repeat(2,1fr); gap:8px; } .cbd-overview-strip { display:grid; grid-template-columns:1fr 1fr; } .cbd-ostat { border-right:1px solid var(--border-color,#d1d8dd); border-bottom:1px solid var(--border-color,#d1d8dd); } .cbd-ostat__value { font-size:14px; } .cbd-partner__metrics { display:grid; grid-template-columns:repeat(2,1fr); gap:4px; } .cbd-metric { min-width:0; } .cbd-metric__label { font-size:10px; } .cbd-scard { padding:10px 10px; } .cbd-scard__num { font-size:16px; } .cbd-panel__header-actions .cbd-expand-all-label { display:none; } .cbd-panel__title { font-size:12px; } }
// 		@media (max-width:360px) { .cbd-filter-col { padding:3px 4px 0; } .cbd-scard__num { font-size:14px; } }
// 		`;
// 		document.head.appendChild(style);

// 		if (!document.getElementById('cbd-global-tip')) {
// 			const tip = document.createElement('div');
// 			tip.id = 'cbd-global-tip';
// 			document.body.appendChild(tip);

// 			let _hide_timer = null;
// 			const _show = (el) => {
// 				const text  = el.dataset.tip;
// 				if (!text) return;
// 				clearTimeout(_hide_timer);
// 				const lbl   = el.dataset.tipLabel || 'Full amount';
// 				const short = el.textContent.trim();
// 				const icon_svg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(55,138,221,.9)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';
// 				tip.innerHTML =
// 					'<div class="cbd-tip__header">' +
// 						'<span class="cbd-tip__icon">' + icon_svg + '</span>' +
// 						'<span class="cbd-tip__label">' + frappe.utils.escape_html(lbl) + '</span>' +
// 					'</div>' +
// 					'<div class="cbd-tip__body">' +
// 						'<span class="cbd-tip__amount">' + frappe.utils.escape_html(text) + '</span>' +
// 						'<span class="cbd-tip__hint">Abbreviated as ' + frappe.utils.escape_html(short) + '</span>' +
// 					'</div>';
// 				tip.classList.add('cbd-tip--visible');
// 				const r = el.getBoundingClientRect();
// 				const tw = tip.offsetWidth || 200;
// 				const th = tip.offsetHeight || 60;
// 				tip.classList.remove('cbd-tip--visible');
// 				let left = r.left + r.width / 2 - tw / 2;
// 				left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
// 				const spaceAbove = r.top;
// 				const above = spaceAbove > th + 10;
// 				tip.classList.toggle('cbd-tip--below', !above);
// 				const top = above
// 					? r.top + window.scrollY - th - 10
// 					: r.bottom + window.scrollY + 8;
// 				tip.style.left = left + 'px';
// 				tip.style.top  = top  + 'px';
// 				tip.classList.add('cbd-tip--visible');
// 			};
// 			const _hide = () => {
// 				_hide_timer = setTimeout(() => tip.classList.remove('cbd-tip--visible'), 120);
// 			};
// 			document.addEventListener('mouseover', (e) => {
// 				const el = e.target.closest('.cbd-tip-wrap');
// 				if (el && el.dataset.tip) _show(el);
// 			});
// 			document.addEventListener('mouseout', (e) => {
// 				const el = e.target.closest('.cbd-tip-wrap');
// 				if (el) _hide();
// 			});
// 			document.addEventListener('scroll', () => tip.classList.remove('cbd-tip--visible'), true);
// 		}
// 	}
// }


frappe.pages['creche-dashboard'].on_page_load = function(wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Creche Dashboard',
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
				<div id="cbd_overview_hd" class="cbd-section-hd" style="display:none">
					<span class="cbd-section-hd__label">Operational Overview</span>
					<span class="cbd-section-hd__line"></span>
				</div>
				<div class="cbd-overview-strip" id="cbd_overview_strip" style="display:none"></div>
				<div id="cbd_summary_hd" class="cbd-section-hd" style="display:none">
					<span class="cbd-section-hd__label">Financial Overview</span>
					<span class="cbd-section-hd__line"></span>
				</div>
				<div class="cbd-summary-cards" id="cbd_summary_cards"></div>
				<div id="cbd_chart_hd" class="cbd-section-hd" style="display:none">
					<span class="cbd-section-hd__label">Utilisation Breakdown</span>
					<span class="cbd-section-hd__line"></span>
				</div>
				<div class="cbd-chart-card" id="cbd_chart_card" style="display:none">
					<div class="cbd-chart-card__legend" id="cbd_chart_legend"></div>
					<div class="cbd-chart-card__body" id="cbd_chart_body"></div>
				</div>
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
		frappe.call({ method: 'creche_reports.api.budget_utilisation_summary.get_user_permission_scope' })
			.then(r => { this._user_permission_scope = r.message || null; })
			.catch(() => { this._user_permission_scope = null; });
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

	_build_filters() {
		const $root = $(this.page.main).find('.cbd-root');
		const $row1 = $(`<div class="frappe-control-group row custom-filter-row" id="cbd_frow1"></div>`).prependTo($root);
		const $row2 = $(`<div class="frappe-control-group row custom-filter-row" id="cbd_frow2"></div>`).insertAfter($row1);
		this._fields = {};
		this._sel    = {};

		const col = ($row, key) => $(`<div class="cbd-filter-col col-sm-12" id="cbd_fcol_${key}"></div>`).appendTo($row);

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

		let _visN = 0;
		const _visT = setInterval(() => {
			_visN++;
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

	_on_filter_change(key) {
		if (this._sync_filter_visibility) setTimeout(this._sync_filter_visibility, 50);
	}

	_clear_filters() {
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

	// Returns { active:bool, label:string } describing the currently
	// selected time filter (FY / Month / Date range) — used by both the
	// line-items table header and the summary chart so they stay in sync.
	_filter_period_label() {
		const pf = this._panel_filters();
		const af = this._active_filters || {};
		const hasFY    = !!(af.financial_year && af.financial_year.length);
		const hasMonth = !!(af.month && af.month.length);
		const hasDate  = !!(pf.start_date || pf.end_date);
		const active   = hasFY || hasMonth || hasDate;

		let label = 'Amount';
		if (hasFY && hasMonth)  label = `${af.financial_year.join(', ')} — ${af.month.join(', ')}`;
		else if (hasFY)         label = af.financial_year.join(', ');
		else if (hasMonth)      label = af.month.join(', ');
		else if (hasDate)       label = `${pf.start_date||''}${pf.end_date?' → '+pf.end_date:''}`;

		return { active, label, hasFY, hasMonth, hasDate };
	}

	load_data(filters) {
		this._active_filters = filters || {};
		frappe.call({
			method: 'creche_reports.api.budget_utilisation_summary.get_partner_budget_summary',
			freeze: true, freeze_message: 'Loading budget summary…',
			args: { filters: filters || {} },
			callback: (r) => {
				if (!r.message) return;
				this._all_partners = r.message.partners || [];
				this.render_summary(r.message.summary);
				this.render_partners(r.message.partners);
			}
		});
	}


	// ═══════════════════════════════════════════════════════════════════════
	// CARD DESIGN  — render_summary  (7 cards, fresh colour palette)
	// ═══════════════════════════════════════════════════════════════════════

	render_summary(s) {
		if (!s) return;
		const el = document.getElementById('cbd_summary_cards');
		if (!el) return;

		const bank_bal            = parseFloat(s.total_bank_balance) || 0;
		const total_disb          = parseFloat(s.total_disbursement)  || 0;
		const total_util          = parseFloat(s.total_utilisation)   || 0;
		const total_budget        = parseFloat(s.total_budget)        || 0;
		const unutilised_disb     = Math.max(total_disb - total_util, 0);
		const unutilised_disb_bal = Math.max(bank_bal  - total_util, 0);

		// Distinct accent per card — mirrors the "Units" reference layout
		// (coloured left border + matching link colour), but each card
		// keeps a calm, light palette rather than saturated brand colours.
		const CARDS = [
			{ panel:'budget',              label:'Total Budget',               raw: total_budget,        base: total_budget,  accent:'#2563eb' },
			{ panel:'disbursement',        label:'Total Disbursement',         raw: total_disb,          base: total_budget,  accent:'#059669' },
			{ panel:'utilisation',         label:'Total Utilisation',          raw: total_util,          base: total_budget,  accent:'#d97706' },
			{ panel:'unutilised_disb',     label:'Unutilized Disbursement',    raw: unutilised_disb,     base: total_budget,  accent:'#7c3aed' },
			{ panel:'bank_balance',        label:'Reported Bank Balance',      raw: bank_bal,            base: total_budget,  accent:'#0891b2' },
			{ panel:'unutilised_disb_bal', label:'Unutilized Disb – Bank Bal.',raw: unutilised_disb_bal, base: total_budget,  accent:'#db2777' },
			{ panel:'pending_util',        label:'Pending Utilization',        raw:null, count:'…', loading:true, accent:'#dc2626' },
		];

		el.innerHTML = CARDS.map(c => {
			const pct = (!c.loading && c.base > 0) ? (c.raw / c.base * 100) : null;
			const numHtml = c.count !== undefined
				? `<div class="cbd-scard__num" style="color:${c.accent}">${c.count}</div>`
				: `<div class="cbd-scard__num" style="color:${c.accent}">${this._fmtCard(c.raw, c.label)}</div>`;
			const subText = c.loading ? 'Loading…' : (pct !== null ? `${pct.toFixed(1)}% of total` : '');
			return `
			<div class="cbd-scard" data-panel="${c.panel}" style="border-left-color:${c.accent}">
				<div class="cbd-scard__lbl">${c.label}</div>
				${numHtml}
				<div class="cbd-scard__sub" id="${c.loading ? 'cbd_pending_sub' : ''}">${subText}</div>
				<div class="cbd-scard__cta" style="color:${c.accent}">
					<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
					View Line Items
				</div>
			</div>`;
		}).join('');

		// PFO alert is rendered once pending-utilisation data loads (see
		// _load_pending_utilisation_count below) so the message reflects
		// the logged-in user's ACTUAL submission status, not a blanket reminder.
		const pfo_old = document.getElementById('cbd_pfo_banner');
		if (pfo_old) pfo_old.remove();

		el.querySelectorAll('.cbd-scard').forEach(card => {
			card.addEventListener('click', () => {
				const panel = card.dataset.panel;
				if (panel === 'budget')       this._open_drill_modal('budget');
				else if (panel === 'utilisation')  this._open_drill_modal('utilisation');
				else if (panel === 'disbursement') this._open_drill_modal('disbursement');
				else if (panel === 'pending_util') this._open_pending_utilisation_modal();
				else this._open_card_drill_modal(panel);
			});
		});

		this._last_summary = s;
		this._render_partner_chart();
		this._load_pending_utilisation_count();
	}

	// Fetches the real "submission missing" count (not just util% < 100%)
	// and updates the Pending Utilization card once it's ready.
	_load_pending_utilisation_count() {
		frappe.call({
			method: 'creche_reports.api.budget_utilisation_summary.get_pending_utilisation_summary',
			callback: (r) => {
				const data = (r.message && r.message.partners) || [];
				this._pending_util_data = data;
				const card = document.querySelector('.cbd-scard[data-panel="pending_util"]');
				if (card) {
					const numEl = card.querySelector('.cbd-scard__num');
					const subEl = card.querySelector('#cbd_pending_sub');
					if (numEl) numEl.textContent = data.length;
					if (subEl) { subEl.id = ''; subEl.textContent = `partner${data.length===1?'':'s'} — report not submitted`; }
				}
				this._render_pfo_alert(data);
			},
			error: () => {
				const card = document.querySelector('.cbd-scard[data-panel="pending_util"]');
				if (!card) return;
				const subEl = card.querySelector('#cbd_pending_sub');
				if (subEl) { subEl.id = ''; subEl.textContent = 'Could not load'; }
			},
		});
	}

	// Status-aware reminder banner — only meaningful for users scoped to a
	// single partner (i.e. the partner's own login). Shows one of three
	// states based on the SAME data that drives the Pending Utilization
	// card, so the two never disagree:
	//   • no pending rows for this user at all  → "All caught up" (green)
	//   • pending rows exist, none overdue       → "Please submit" (amber)
	//   • pending rows exist, overdue (>0 days)  → "Overdue"        (red)
	// If the viewer isn't scoped to a single partner (e.g. Finance Head
	// looking at everyone), no personal banner is shown — that's what the
	// Pending Utilization card itself is for.
	_render_pfo_alert(data) {
		const old = document.getElementById('cbd_pfo_banner');
		if (old) old.remove();

		const scope = this._user_permission_scope;
		// Only show a personal banner when the logged-in user is restricted
		// to exactly one partner — otherwise this is an org-wide viewer.
		if (!scope || !scope.restricted || !scope.partner_ids || scope.partner_ids.length !== 1) return;

		const myId  = scope.partner_ids[0];
		const myRow = (data || []).find(p => p.partner_id === myId);

		const root = document.querySelector('.cbd-root');
		const el   = document.getElementById('cbd_summary_cards');
		if (!root && !el) return;

		const alert = document.createElement('div');
		alert.id = 'cbd_pfo_banner';

		if (!myRow) {
			alert.className = 'cbd-alert cbd-alert--success';
			alert.innerHTML = `
				<div class="cbd-alert__icon">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
				</div>
				<div class="cbd-alert__body">
					<span class="cbd-alert__title">All caught up</span>
					<span class="cbd-alert__msg">Your utilization reports are submitted and up to date. Thank you!</span>
				</div>
				<button class="cbd-alert__dismiss" onclick="this.closest('.cbd-alert').remove()" title="Dismiss">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>`;
		} else {
			const overdue = myRow.max_days_overdue > 0;
			const months = myRow.budgets.flatMap(b => b.missing_months.map(m => `${m.month} ${m.financial_year}`));
			const uniqueMonths = [...new Set(months)];
			const monthsText = uniqueMonths.slice(0, 3).join(', ') + (uniqueMonths.length > 3 ? `, +${uniqueMonths.length-3} more` : '');

			alert.className = overdue ? 'cbd-alert--danger cbd-alert' : 'cbd-alert--warning cbd-alert';
			const title = overdue ? 'Submission Overdue' : 'Action Required';
			const icon = overdue
				? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
				: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
			const msg = overdue
				? `Your utilization report is <strong>${myRow.max_days_overdue} day${myRow.max_days_overdue===1?'':'s'} overdue</strong> for ${frappe.utils.escape_html(monthsText)}. Please submit it as soon as possible.`
				: `Please submit your utilization report for <strong>${frappe.utils.escape_html(monthsText)}</strong> at the earliest.`;

			alert.innerHTML = `
				<div class="cbd-alert__icon">${icon}</div>
				<div class="cbd-alert__body">
					<span class="cbd-alert__title">${title}</span>
					<span class="cbd-alert__msg">${msg}</span>
				</div>
				<button class="cbd-alert__dismiss" onclick="this.closest('.cbd-alert').remove()" title="Dismiss">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>`;
		}

		if (root) root.insertBefore(alert, root.firstChild);
		else if (el) el.before(alert);
	}

	// ═══════════════════════════════════════════════════════════════════════
	// CHART — Three side-by-side comparison donuts:
	//   1. Budget vs Utilisation
	//   2. Disbursement vs Utilisation
	//   3. Reported Bank Balance vs Unutilized Disb. – Bank Balance
	// Same for every viewer (org-wide totals, not per-partner). Reflects the
	// active date/FY/month filter via the period label shown in the header.
	// Hover uses the existing global tooltip system (.cbd-tip-wrap / data-tip)
	// since native SVG <title> tooltips are unreliable across browsers.
	// Click a slice/legend row → opens that metric's drill-down.
	// ═══════════════════════════════════════════════════════════════════════
	_render_partner_chart() {
		const hd   = document.getElementById('cbd_chart_hd');
		const card = document.getElementById('cbd_chart_card');
		const body = document.getElementById('cbd_chart_body');
		const legendEl = document.getElementById('cbd_chart_legend');
		if (!card || !body) return;

		const s = this._last_summary;
		if (!s) { card.style.display = 'none'; if (hd) hd.style.display = 'none'; return; }
		card.style.display = ''; if (hd) hd.style.display = '';

		const period = this._filter_period_label();

		const budget   = parseFloat(s.total_budget) || 0;
		const disb     = parseFloat(s.total_disbursement) || 0;
		const util     = parseFloat(s.total_utilisation) || 0;
		const bankBal  = parseFloat(s.total_bank_balance) || 0;
		const unutilDisbBankBal = Math.max(bankBal - util, 0);

		legendEl.innerHTML = `
			<div class="cbd-chart-legend__items">
				<span class="cbd-chart-legend__item" style="font-weight:700;color:#0f172a">Utilisation Breakdown</span>
			</div>
			<span class="cbd-chart-legend__period" title="Active filter period">${frappe.utils.escape_html(period.label)}</span>`;

		// Each donut compares a "base" figure against Utilisation drawn
		// against that base, plus the remaining (unutilised) share.
		const DONUTS = [
			{
				title: 'Budget vs Utilisation',
				baseLabel: 'Budget', baseVal: budget,
				usedLabel: 'Utilised', usedVal: util,
				usedColor: '#16a34a', remColor: '#e2e8f0', remLabel: 'Remaining Budget',
				drillType: 'utilisation',
			},
			{
				title: 'Disbursement vs Utilisation',
				baseLabel: 'Disbursement', baseVal: disb,
				usedLabel: 'Utilised', usedVal: util,
				usedColor: '#0891b2', remColor: '#fde68a', remLabel: 'Unutilised Disbursement',
				drillType: 'disbursement',
			},
			{
				title: 'Bank Balance vs Unutilized',
				baseLabel: 'Reported Bank Balance', baseVal: bankBal,
				usedLabel: 'Unutilized Disb. – Bank Bal.', usedVal: unutilDisbBankBal,
				usedColor: '#db2777', remColor: '#e2e8f0', remLabel: 'Remaining Bank Balance',
				drillType: 'bank_balance',
			},
		];

		const R = 54, CX = 70, CY = 70, STROKE = 20;
		const circumference = 2 * Math.PI * R;

		const panelsHtml = DONUTS.map((d, di) => {
			const base = Math.max(d.baseVal, 0);
			const used = Math.max(Math.min(d.usedVal, base), 0); // clamp so the ring never overflows past 100%
			const rem  = Math.max(base - used, 0);
			const overflow = d.usedVal > base && base > 0; // flag when the "used" figure actually exceeds base

			const usedPct = base > 0 ? (used / base * 100) : 0;
			const segments = base > 0
				? [
					{ val: used, color: d.usedColor, label: d.usedLabel, type: d.drillType },
					{ val: rem,  color: d.remColor,  label: d.remLabel,  type: d.drillType },
				].filter(sg => sg.val > 0)
				: [];

			let offsetAcc = 0;
			const segHtml = segments.map(sg => {
				const pct = sg.val / base;
				const segLen = pct * circumference;
				const dasharray = `${segLen.toFixed(2)} ${(circumference - segLen).toFixed(2)}`;
				const dashoffset = (-offsetAcc).toFixed(2);
				offsetAcc += segLen;
				const tipText = `${this._fmtFull ? this._fmtFull(sg.val) : this._fmt(sg.val)} (${(pct*100).toFixed(1)}%)`;
				return `<circle class="cbd-donut__seg cbd-tip-wrap" data-type="${sg.type}" data-tip="${frappe.utils.escape_html(tipText)}" data-tip-label="${frappe.utils.escape_html(sg.label)}"
					cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${sg.color}"
					stroke-width="${STROKE}" stroke-dasharray="${dasharray}"
					stroke-dashoffset="${dashoffset}" transform="rotate(-90 ${CX} ${CY})"></circle>`;
			}).join('');

			const emptyRing = !segments.length
				? `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#f1f5f9" stroke-width="${STROKE}"></circle>`
				: '';

			const legendRows = segments.map(sg => {
				const tipText = `${this._fmtFull ? this._fmtFull(sg.val) : this._fmt(sg.val)}`;
				return `
				<div class="cbd-donut__row cbd-tip-wrap" data-type="${sg.type}" data-tip="${frappe.utils.escape_html(tipText)}" data-tip-label="${frappe.utils.escape_html(sg.label)}">
					<span class="cbd-donut__dot" style="background:${sg.color}"></span>
					<span class="cbd-donut__row-lbl">${frappe.utils.escape_html(sg.label)}</span>
					<span class="cbd-donut__row-val">${this._fmt(sg.val)}</span>
				</div>`;
			}).join('');

			const overflowNote = overflow
				? `<div class="cbd-donut__overflow">⚠ ${d.usedLabel} (${this._fmt(d.usedVal)}) exceeds ${d.baseLabel.toLowerCase()}</div>`
				: '';

			return `
			<div class="cbd-donut__panel" data-panel-idx="${di}">
				<div class="cbd-donut__panel-title">${d.title}</div>
				<div class="cbd-donut">
					<div class="cbd-donut__chart">
						<svg viewBox="0 0 140 140" width="140" height="140">
							${emptyRing}${segHtml}
						</svg>
						<div class="cbd-donut__center">
							<div class="cbd-donut__center-pct">${usedPct.toFixed(0)}%</div>
							<div class="cbd-donut__center-lbl">of ${frappe.utils.escape_html(d.baseLabel)}</div>
						</div>
					</div>
					<div class="cbd-donut__legend">${legendRows || '<div class="cbd-donut__empty">No data yet</div>'}</div>
				</div>
				${overflowNote}
			</div>`;
		}).join('');

		body.innerHTML = `<div class="cbd-donut__grid">${panelsHtml}</div>`;

		body.querySelectorAll('.cbd-donut__seg, .cbd-donut__row').forEach(el => {
			el.style.cursor = 'pointer';
			el.addEventListener('click', () => {
				const type = el.dataset.type;
				if (type === 'bank_balance' || type === 'unutilised_disb' || type === 'unutilised_disb_bal') {
					this._open_card_drill_modal(type === 'bank_balance' ? 'bank_balance' : type);
					return;
				}
				this._open_drill_modal(type === 'budget' || type === 'utilisation' || type === 'disbursement' ? type : 'budget');
			});
		});
	}

	// ═══════════════════════════════════════════════════════════════════════
	// UNIVERSAL DRILL MODAL  — budget / utilisation / disbursement
	// Up to 3 pages: partners → budgets → line items
	// ═══════════════════════════════════════════════════════════════════════

	// Routes bank_balance / unutilised_disb / unutilised_disb_bal / pending_util
	// into the same 3-page drill modal using a virtual "type" config
	// ═══════════════════════════════════════════════════════════════════════
	// PENDING UTILIZATION MODAL — partners who haven't submitted their
	// utilisation report for the expected month, with email + reminder send
	// ═══════════════════════════════════════════════════════════════════════
	_open_pending_utilisation_modal() {
		const old = document.getElementById('cbd_drill_wrap');
		if (old) old.remove();

		const data = this._pending_util_data || [];

		const wrap = document.createElement('div');
		wrap.id = 'cbd_drill_wrap';
		wrap.className = 'cbd-dw';
		wrap.innerHTML = `
			<div class="cbd-dm" id="cbd_dm_box" style="max-width:820px">
				<div class="cbd-dm__topbar">
					<div class="cbd-dm__topbar-left">
						<span class="cbd-bc__item cbd-bc__item--active">Pending Utilization — Report Not Submitted</span>
					</div>
					<div class="cbd-dm__actions">
						<button class="cbd-dt__btn" id="cbd_pu_send_all" ${data.length?'':'disabled'}>
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
							Send Reminder to All
						</button>
						<button class="cbd-dm__close" title="Close (Esc)">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
						</button>
					</div>
				</div>
				<div class="cbd-pu__msgbar">
					<label class="cbd-pu__msglbl" for="cbd_pu_msg">Reminder message <span class="cbd-pu__msglbl-opt">(optional — default message used if left blank)</span></label>
					<textarea id="cbd_pu_msg" class="cbd-pu__msgbox" rows="2" placeholder="e.g. Kindly submit your utilisation report for the pending months by this Friday."></textarea>
				</div>
				<div class="cbd-dm__body">
					<div class="cbd-dm__tbl-wrap" id="cbd_pu_body"></div>
				</div>
			</div>`;
		document.body.appendChild(wrap);
		requestAnimationFrame(() => wrap.classList.add('cbd-dw--open'));

		const _esc = e => { if (e.key === 'Escape') this._close_drill_modal_main(); };
		document.addEventListener('keydown', _esc);
		wrap._esc = _esc;
		wrap.addEventListener('click', e => { if (e.target === wrap) this._close_drill_modal_main(); });

		const box = wrap.querySelector('#cbd_dm_box');
		const getCustomMessage = () => {
			const ta = document.getElementById('cbd_pu_msg');
			const v = ta ? ta.value.trim() : '';
			return v || null;
		};
		box.addEventListener('click', e => {
			if (e.target.closest('.cbd-dm__close')) { this._close_drill_modal_main(); return; }
			const sendOne = e.target.closest('.cbd-pu__send-one');
			if (sendOne) { this._send_utilisation_reminder([sendOne.dataset.pid], sendOne, getCustomMessage()); return; }
			const sendAll = e.target.closest('#cbd_pu_send_all');
			if (sendAll) {
				const ids = data.map(d => d.partner_id).filter(Boolean);
				this._send_utilisation_reminder(ids, sendAll, getCustomMessage());
			}
		});

		this._render_pending_utilisation_rows(data);
	}

	_render_pending_utilisation_rows(data) {
		const body = document.getElementById('cbd_pu_body');
		if (!body) return;

		if (!data.length) {
			body.innerHTML = `<div class="cbd-dm__empty">All partners are up to date — no pending submissions.</div>`;
			return;
		}

		const rows = data.map((p, i) => {
			const monthsBadges = p.budgets.flatMap(b => b.missing_months.map(m => `${m.month} ${m.financial_year}`));
			const uniqueMonths = [...new Set(monthsBadges)];
			const monthsHtml = uniqueMonths.slice(0, 3).map(m => `<span class="cbd-pu__month-chip">${frappe.utils.escape_html(m)}</span>`).join('');
			const moreHtml = uniqueMonths.length > 3 ? `<span class="cbd-pu__month-chip cbd-pu__month-chip--more">+${uniqueMonths.length - 3} more</span>` : '';
			const emailHtml = p.email
				? frappe.utils.escape_html(p.email)
				: `<span class="cbd-pu__no-email">No email on file</span>`;
			const overdueColor = p.max_days_overdue > 30 ? '#dc2626' : (p.max_days_overdue > 0 ? '#d97706' : '#64748b');
			return `<tr class="cbd-dt__row">
				<td class="cbd-dt__num">${i+1}</td>
				<td class="cbd-dt__name">${frappe.utils.escape_html(p.partner_name||'—')}</td>
				<td>${emailHtml}</td>
				<td>${monthsHtml}${moreHtml}</td>
				<td class="cbd-dt__r"><span style="color:${overdueColor};font-weight:700">${p.max_days_overdue}d</span></td>
				<td class="cbd-dt__act">
					<button class="cbd-dt__btn cbd-pu__send-one" data-pid="${frappe.utils.escape_html(p.partner_id||'')}" ${p.email?'':'disabled'}>Remind</button>
				</td>
			</tr>`;
		}).join('');

		body.innerHTML = `
			<table class="cbd-dt" id="cbd_pu_table">
				<thead><tr>
					<th class="cbd-dt__th cbd-dt__th--num">#</th>
					<th class="cbd-dt__th">Partner</th>
					<th class="cbd-dt__th">Email</th>
					<th class="cbd-dt__th">Missing Months</th>
					<th class="cbd-dt__th cbd-dt__th--r">Overdue</th>
					<th class="cbd-dt__th" style="width:90px"></th>
				</tr></thead>
				<tbody>${rows}</tbody>
			</table>`;
	}

	_send_utilisation_reminder(partner_ids, triggerBtn, customMessage) {
		if (!partner_ids || !partner_ids.length) return;
		const originalLabel = triggerBtn.innerHTML;
		triggerBtn.disabled = true;
		triggerBtn.textContent = 'Sending…';
		frappe.call({
			method: 'creche_reports.api.pending_utilisation.send_utilisation_reminder',
			args: { partner_ids: JSON.stringify(partner_ids), custom_message: customMessage || undefined },
			callback: (r) => {
				const res = r.message || { sent: [], failed: [] };
				triggerBtn.disabled = false;
				triggerBtn.innerHTML = originalLabel;
				if (res.sent.length && !res.failed.length) {
					frappe.show_alert({ message: `Reminder sent to ${res.sent.length} partner${res.sent.length===1?'':'s'}`, indicator: 'green' }, 4);
				} else if (res.sent.length && res.failed.length) {
					frappe.show_alert({ message: `Sent to ${res.sent.length}, failed for ${res.failed.length} (missing email or send error)`, indicator: 'orange' }, 5);
				} else {
					frappe.show_alert({ message: `Could not send — no valid email addresses found`, indicator: 'red' }, 5);
				}
			},
			error: () => {
				triggerBtn.disabled = false;
				triggerBtn.innerHTML = originalLabel;
				frappe.show_alert({ message: 'Failed to send reminder — server error', indicator: 'red' }, 5);
			},
		});
	}
	_open_card_drill_modal(panel) {
		const CFG = {
			bank_balance:       { title:'Reported Bank Balance',         col1:'Bank Balance',         getVal: p => parseFloat(p.total_bank_balance)||0, getBVal: b => parseFloat(b.bank_balance)||0 },
			unutilised_disb:    { title:'Unutilized Disbursement',        col1:'Unutilized (Disb–Util)',getVal: p => Math.max((parseFloat(p.total_disbursement)||0)-(parseFloat(p.total_utilisation)||0),0), getBVal: b => Math.max((parseFloat(b.disbursement)||0)-(parseFloat(b.utilisation)||0),0) },
			unutilised_disb_bal:{ title:'Unutilized Disb – Bank Bal.',   col1:'Bank Bal – Utilised',  getVal: p => Math.max((parseFloat(p.total_bank_balance)||0)-(parseFloat(p.total_utilisation)||0),0), getBVal: b => Math.max((parseFloat(b.bank_balance)||0)-(parseFloat(b.utilisation)||0),0) },
			pending_util:       { title:'Partners – Pending Utilization', col1:'Util %',               getVal: p => parseFloat(p.utilised_pct)||0, getBVal: b => parseFloat(b.utilised_pct)||0, isPct: true },
		};
		const cfg = CFG[panel];
		if (!cfg) return;

		const old = document.getElementById('cbd_drill_wrap');
		if (old) old.remove();

		const wrap = document.createElement('div');
		wrap.id        = 'cbd_drill_wrap';
		wrap.className = 'cbd-dw';
		wrap.innerHTML = `
			<div class="cbd-dm" id="cbd_dm_box">
				<div class="cbd-dm__track cbd-dm__track--2" id="cbd_dm_track">
					<div class="cbd-dm__page cbd-dm__page--2" id="cbd_dm_p1"></div>
					<div class="cbd-dm__page cbd-dm__page--2" id="cbd_dm_p2"></div>
				</div>
			</div>`;
		document.body.appendChild(wrap);
		requestAnimationFrame(() => wrap.classList.add('cbd-dw--open'));

		const box = wrap.querySelector('#cbd_dm_box');
		box.addEventListener('click', e => {
			if (e.target.closest('.cbd-dm__close'))    { this._close_drill_modal_main(); return; }
			// Export dropdown toggle
			const expMain = e.target.closest('.cbd-exp-btn--main');
			if (expMain) { e.stopPropagation(); expMain.closest('.cbd-exp-dd').classList.toggle('cbd-exp-dd--open'); return; }
			const ddItem = e.target.closest('.cbd-exp-dd__item');
			if (ddItem) {
				e.stopPropagation();
				const dd = ddItem.closest('.cbd-exp-dd');
				const mainBtn = dd.querySelector('.cbd-exp-btn--main');
				dd.classList.remove('cbd-exp-dd--open');
				this._export_table(mainBtn.dataset.tbl, mainBtn.dataset.fname, mainBtn.dataset.title, ddItem.dataset.fmt);
				return;
			}
			// breadcrumb & back button both go to page 1
			if (e.target.closest('#cbd_bc_root') || e.target.closest('#cbd_bc_root_btn')) {
				this._dm_page = 1;
				const tr = document.getElementById('cbd_dm_track'); if (tr) tr.style.transform='translateX(0)';
				return;
			}
		});
		box.addEventListener('input', e => {
			const inp = e.target.closest('.cbd-dm__search-input');
			if (inp) this._filter_table_rows(inp.dataset.tbl, inp.value);
		});
		document.addEventListener('click', e => {
			if (!e.target.closest('.cbd-exp-dd')) {
				box.querySelectorAll('.cbd-exp-dd--open').forEach(d => d.classList.remove('cbd-exp-dd--open'));
			}
		});

		wrap.addEventListener('click', e => { if (e.target===wrap) this._close_drill_modal_main(); });
		const _esc = e => { if (e.key==='Escape') this._close_drill_modal_main(); };
		document.addEventListener('keydown', _esc);
		wrap._esc = _esc;

		// Render 2-page track: partners → budget rows
		this._dm_page = 1;
		const partners = this._all_partners || [];
		const table_id  = 'cbd_dm_t1';
		const fname     = cfg.title.replace(/\s+/g,'_');

		const rows = partners.map((p,idx) => {
			const val = cfg.getVal(p);
			const disp = cfg.isPct ? `<span class="cbd-dt__pct" style="color:${val<75?'#dc2626':'#16a34a'}">${val.toFixed(1)}%</span>` : this._fmtTip(val, cfg.col1);
			return `<tr class="cbd-dt__row">
				<td class="cbd-dt__num">${idx+1}</td>
				<td class="cbd-dt__name">${frappe.utils.escape_html(p.partner_name||'—')}</td>
				<td class="cbd-dt__r">${disp}</td>
				<td class="cbd-dt__act"><button class="cbd-dt__btn cbd-dm__cdrill" data-pidx="${idx}">Details ›</button></td>
			</tr>`;
		}).join('');
		const gt = cfg.isPct ? '' : this._fmtTip(partners.reduce((s,p)=>s+cfg.getVal(p),0));

		const p1 = document.getElementById('cbd_dm_p1');
		p1.innerHTML = `
			${this._dm_topbar(cfg.title, null, null, 1, table_id, fname)}
			<div class="cbd-dm__body">
				<div class="cbd-dm__tbl-wrap">
					<table class="cbd-dt" id="${table_id}">
						<thead><tr>
							<th class="cbd-dt__th cbd-dt__th--num">#</th>
							<th class="cbd-dt__th">Partner</th>
							<th class="cbd-dt__th cbd-dt__th--r">${cfg.col1}</th>
							<th class="cbd-dt__th" style="width:90px"></th>
						</tr></thead>
						<tbody>${rows}</tbody>
						<tfoot><tr>
							<td class="cbd-dt__foot" colspan="2">Total</td>
							<td class="cbd-dt__r cbd-dt__foot">${gt}</td>
							<td class="cbd-dt__foot"></td>
						</tr></tfoot>
					</table>
				</div>
			</div>`;

		p1.addEventListener('click', e => {
			const btn = e.target.closest('.cbd-dm__cdrill');
			if (!btn) return;
			e.stopPropagation();
			const partner = (this._all_partners||[])[parseInt(btn.dataset.pidx)];
			if (!partner) return;
			// render page2 for this partner
			this._dm_page = 2;
			const track2 = document.getElementById('cbd_dm_track');
			if (track2) track2.style.transform = 'translateX(-50%)';
			const p2 = document.getElementById('cbd_dm_p2');
			const budgets = partner.budgets || [];
			const pname   = frappe.utils.escape_html(partner.partner_name||'Partner');
			const t2id    = 'cbd_dm_t2';
			const fn2     = `${fname}_${pname.replace(/\s+/g,'_')}`;
			const brows = budgets.map((b,i) => {
				const bval = cfg.getBVal(b);
				const bdisp = cfg.isPct ? `<span class="cbd-dt__pct" style="color:${bval<75?'#dc2626':'#16a34a'}">${bval.toFixed(1)}%</span>` : this._fmtTip(bval, cfg.col1);
				return `<tr class="cbd-dt__row">
					<td class="cbd-dt__num">${i+1}</td>
					<td class="cbd-dt__name"><div style="font-weight:600">${frappe.utils.escape_html(b.budget_reference_name||'—')}</div><div style="font-size:11px;color:#9ca3af">${frappe.utils.escape_html(b.state||'')} ${b.financial_year?'· '+frappe.utils.escape_html(b.financial_year):''}</div></td>
					<td class="cbd-dt__r">${bdisp}</td>
				</tr>`;
			}).join('');
			const bgt = cfg.isPct ? '' : this._fmtTip(budgets.reduce((s,b)=>s+cfg.getBVal(b),0));
			p2.innerHTML = `
				${this._dm_topbar(cfg.title, pname, null, 2, t2id, fn2)}
				<div class="cbd-dm__body">
					<div class="cbd-dm__tbl-wrap">
						<table class="cbd-dt" id="${t2id}">
							<thead><tr>
								<th class="cbd-dt__th cbd-dt__th--num">#</th>
								<th class="cbd-dt__th">Budget Reference</th>
								<th class="cbd-dt__th cbd-dt__th--r">${cfg.col1}</th>
							</tr></thead>
							<tbody>${brows}</tbody>
							<tfoot><tr>
								<td class="cbd-dt__foot" colspan="2">Total</td>
								<td class="cbd-dt__r cbd-dt__foot">${bgt}</td>
							</tr></tfoot>
						</table>
					</div>
				</div>`;
			// wire breadcrumb back for page2
			const bcR = p2.querySelector('#cbd_bc_root');
			if (bcR) bcR.addEventListener('click', () => {
				this._dm_page = 1;
				const tr = document.getElementById('cbd_dm_track');
				if (tr) tr.style.transform = 'translateX(0)';
			});
		});
	}

		_open_drill_modal(type) {
		const old = document.getElementById('cbd_drill_wrap');
		if (old) old.remove();

		const wrap = document.createElement('div');
		wrap.id        = 'cbd_drill_wrap';
		wrap.className = 'cbd-dw';
		wrap.innerHTML = `
			<div class="cbd-dm" id="cbd_dm_box">
				<div class="cbd-dm__track" id="cbd_dm_track">
					<div class="cbd-dm__page" id="cbd_dm_p1"></div>
					<div class="cbd-dm__page" id="cbd_dm_p2"></div>
					<div class="cbd-dm__page" id="cbd_dm_p3"></div>
				</div>
			</div>`;

		document.body.appendChild(wrap);
		requestAnimationFrame(() => wrap.classList.add('cbd-dw--open'));

		// ── Single delegated listener on the box — handles ALL button clicks ──
		const box = wrap.querySelector('#cbd_dm_box');
		box.addEventListener('click', e => {
			// Close
			if (e.target.closest('.cbd-dm__close')) {
				this._close_drill_modal_main(); return;
			}
			// Export dropdown toggle
			const expMain = e.target.closest('.cbd-exp-btn--main');
			if (expMain) { e.stopPropagation(); expMain.closest('.cbd-exp-dd').classList.toggle('cbd-exp-dd--open'); return; }
			const ddItem = e.target.closest('.cbd-exp-dd__item');
			if (ddItem) {
				e.stopPropagation();
				const dd = ddItem.closest('.cbd-exp-dd');
				const mainBtn = dd.querySelector('.cbd-exp-btn--main');
				dd.classList.remove('cbd-exp-dd--open');
				this._export_table(mainBtn.dataset.tbl, mainBtn.dataset.fname, mainBtn.dataset.title, ddItem.dataset.fmt);
				return;
			}
			// Breadcrumb: clicking parent crumb navigates back
			if (e.target.closest('#cbd_bc_root')) { this._dm_goto(1); return; }
			if (e.target.closest('#cbd_bc_p2'))   { this._dm_goto(2); return; }
			// Back button (separate from breadcrumb)
			if (e.target.closest('#cbd_bc_root_btn')) { this._dm_goto(1); return; }
			if (e.target.closest('#cbd_bc_p2_btn'))   { this._dm_goto(2); return; }
		});
		box.addEventListener('input', e => {
			const inp = e.target.closest('.cbd-dm__search-input');
			if (inp) this._filter_table_rows(inp.dataset.tbl, inp.value);
		});
		document.addEventListener('click', e => {
			if (!e.target.closest('.cbd-exp-dd')) {
				box.querySelectorAll('.cbd-exp-dd--open').forEach(d => d.classList.remove('cbd-exp-dd--open'));
			}
		});

		// Close on overlay click
		wrap.addEventListener('click', e => { if (e.target === wrap) this._close_drill_modal_main(); });

		const _esc = e => { if (e.key === 'Escape') this._close_drill_modal_main(); };
		document.addEventListener('keydown', _esc);
		wrap._esc = _esc;

		this._dm_type    = type;
		this._dm_partner = null;
		this._dm_budget  = null;
		this._dm_page    = 1;
		this._render_dm_page1();
	}

	_close_drill_modal_main() {
		const wrap = document.getElementById('cbd_drill_wrap');
		if (!wrap) return;
		wrap.classList.remove('cbd-dw--open');
		wrap.addEventListener('transitionend', () => wrap.remove(), { once:true });
		if (wrap._esc) document.removeEventListener('keydown', wrap._esc);
	}

	_dm_goto(page) {
		this._dm_page = page;
		const track = document.getElementById('cbd_dm_track');
		if (track) track.style.transform = `translateX(-${(page-1)*100/3}%)`;
		// Re-render the target page if it hasn't been rendered yet (back navigation is instant)
	}

	// ─── Page 1: Partners ────────────────────────────────────────────────
	_render_dm_page1() {
		const p1   = document.getElementById('cbd_dm_p1');
		if (!p1) return;
		this._dm_goto(1);

		const type     = this._dm_type;
		const partners = this._all_partners || [];
		const TITLE = { budget:'Total Budget', utilisation:'Total Utilisation', disbursement:'Total Disbursement' };
		const COLS  = {
			budget:       ['Partner', 'Budget', 'Util %'],
			utilisation:  ['Partner', 'Utilisation', 'Budget', 'Util %'],
			disbursement: ['Partner', 'Budget', 'Disbursed', 'Disb %', 'Utilised', 'Util %'],
		};

		const rows = partners.map((p, idx) => {
			const bud  = parseFloat(p.total_budget)       || 0;
			const util = parseFloat(p.total_utilisation)  || 0;
			const disb = parseFloat(p.total_disbursement) || 0;
			const pct  = parseFloat(p.utilised_pct)       || 0;
			const chip = pct>=75?'#16a34a':'#dc2626';
			const pname = frappe.utils.escape_html(p.partner_name||'—');
			let cells = '';
			if (type === 'budget') {
				cells = `<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
			} else if (type === 'utilisation') {
				cells = `<td class="cbd-dt__r">${this._fmtTip(util,'Utilisation')}</td>
				         <td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
			} else {
				const disb_pct = bud>0?(disb/bud*100):0;
				const chip_d   = disb_pct>=75?'#16a34a':'#d97706';
				cells = `<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
				         <td class="cbd-dt__r">${this._fmtTip(disb,'Disbursed')}</td>
				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip_d}">${disb_pct.toFixed(1)}%</span></td>
				         <td class="cbd-dt__r">${this._fmtTip(util,'Utilised')}</td>
				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
			}
			return `<tr class="cbd-dt__row" data-pidx="${idx}">
				<td class="cbd-dt__num">${idx+1}</td>
				<td class="cbd-dt__name">${pname}</td>
				${cells}
				<td class="cbd-dt__act"><button class="cbd-dt__btn cbd-dm__drillp1" data-pidx="${idx}">Details ›</button></td>
			</tr>`;
		}).join('');

		const gt_bud  = partners.reduce((s,p)=>s+(parseFloat(p.total_budget)||0),0);
		const gt_util = partners.reduce((s,p)=>s+(parseFloat(p.total_utilisation)||0),0);
		const gt_disb = partners.reduce((s,p)=>s+(parseFloat(p.total_disbursement)||0),0);
		const gt_pct      = gt_bud>0?(gt_util/gt_bud*100):0;
		const gt_disb_pct = gt_bud>0?(gt_disb/gt_bud*100):0;
		let foot_cells = '';
		if (type==='budget')        foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;
		else if (type==='utilisation') foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;
		else foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_disb)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_disb_pct.toFixed(1)}%</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;

		const thead_html = COLS[type].map(h=>`<th class="cbd-dt__th">${h}</th>`).join('');
		const table_id   = 'cbd_dm_t1';
		const fname      = TITLE[type].replace(/\s+/g,'_');

		p1.innerHTML = `
			${this._dm_topbar(TITLE[type], null, null, 1, table_id, fname)}
			<div class="cbd-dm__body">
				<div class="cbd-dm__tbl-wrap">
					<table class="cbd-dt" id="${table_id}">
						<thead><tr>
							<th class="cbd-dt__th cbd-dt__th--num">#</th>
							${thead_html}
							<th class="cbd-dt__th" style="width:90px"></th>
						</tr></thead>
						<tbody>${rows}</tbody>
						<tfoot><tr>
							<td class="cbd-dt__foot">&nbsp;</td>
							<td class="cbd-dt__foot" style="font-weight:800">Grand Total</td>
							${foot_cells}
							<td class="cbd-dt__foot"></td>
						</tr></tfoot>
					</table>
				</div>
			</div>`;

		// Wire drill buttons via delegation on p1
		p1.addEventListener('click', e => {
			const btn = e.target.closest('.cbd-dm__drillp1');
			if (!btn) return;
			e.stopPropagation();
			const idx = parseInt(btn.dataset.pidx);
			this._dm_partner = (this._all_partners||[])[idx];
			if (this._dm_partner) this._render_dm_page2();
		});
	}

	// ─── Page 2: Budget rows ────────────────────────────────────────────
	_render_dm_page2() {
		const p2      = document.getElementById('cbd_dm_p2');
		if (!p2) return;
		this._dm_goto(2);

		const type    = this._dm_type;
		const partner = this._dm_partner;
		const budgets = partner.budgets || [];
		const pname   = frappe.utils.escape_html(partner.partner_name||'Partner');
		const TITLE   = { budget:'Total Budget', utilisation:'Total Utilisation', disbursement:'Total Disbursement' };
		const COLS    = {
			budget:       ['Budget Reference', 'Grant ID', 'Budget', 'Util %'],
			utilisation:  ['Budget Reference', 'Grant ID', 'Utilisation', 'Budget', 'Util %'],
			disbursement: ['Budget Reference', 'Grant ID', 'Budget', 'Disbursed', 'Disb %', 'Utilised', 'Util %'],
		};

		const rows = budgets.map((b, i) => {
			const bud  = parseFloat(b.budget)       || 0;
			const util = parseFloat(b.utilisation)  || 0;
			const disb = parseFloat(b.disbursement) || 0;
			const pct  = parseFloat(b.utilised_pct) || 0;
			const chip = pct>=75?'#16a34a':'#dc2626';
			let cells = '';
			if (type === 'budget') {
				cells = `<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
			} else if (type === 'utilisation') {
				cells = `<td class="cbd-dt__r">${this._fmtTip(util,'Utilisation')}</td>
				         <td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
			} else {
				const disb_pct = bud>0?(disb/bud*100):0;
				const chip_d   = disb_pct>=75?'#16a34a':'#d97706';
				cells = `<td class="cbd-dt__r">${this._fmtTip(bud,'Budget')}</td>
				         <td class="cbd-dt__r">${this._fmtTip(disb,'Disbursed')}</td>
				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip_d}">${disb_pct.toFixed(1)}%</span></td>
				         <td class="cbd-dt__r">${this._fmtTip(util,'Utilised')}</td>
				         <td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>`;
			}
			return `<tr class="cbd-dt__row">
				<td class="cbd-dt__num">${i+1}</td>
				<td class="cbd-dt__name">
					<div style="font-weight:600;color:#111827">${frappe.utils.escape_html(b.budget_reference_name||'—')}</div>
					${b.state?`<div style="font-size:11px;color:#9ca3af">${frappe.utils.escape_html(b.state)}</div>`:''}
				</td>
				<td>${frappe.utils.escape_html(b.grant_id||'—')}</td>
				${cells}
				<td class="cbd-dt__act"><button class="cbd-dt__btn cbd-dm__drillp2" data-bidx="${i}">Line Items ›</button></td>
			</tr>`;
		}).join('');

		const gt_bud  = budgets.reduce((s,b)=>s+(parseFloat(b.budget)||0),0);
		const gt_util = budgets.reduce((s,b)=>s+(parseFloat(b.utilisation)||0),0);
		const gt_disb = budgets.reduce((s,b)=>s+(parseFloat(b.disbursement)||0),0);
		const gt_pct      = gt_bud>0?(gt_util/gt_bud*100):0;
		const gt_disb_pct = gt_bud>0?(gt_disb/gt_bud*100):0;
		let foot_cells = '';
		if (type==='budget')        foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;
		else if (type==='utilisation') foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;
		else foot_cells = `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_disb)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_disb_pct.toFixed(1)}%</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td><td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>`;

		const thead_html = COLS[type].map(h=>`<th class="cbd-dt__th">${h}</th>`).join('');
		const table_id   = 'cbd_dm_t2';
		const fname      = `${TITLE[type].replace(/\s+/g,'_')}_${pname.replace(/\s+/g,'_')}`;

		// Consolidated line-items button — only meaningful when the partner
		// has more than one budget to merge together. Disbursement doesn't
		// have a comparable "line items" concept, so it's budget/utilisation only.
		const showConsolidated = budgets.length > 1 && (type === 'budget' || type === 'utilisation');
		const consolidatedBtnHtml = showConsolidated ? `
			<button class="cbd-dt__btn cbd-dm__consolidated-btn" id="cbd_dm_consolidated" style="margin-bottom:10px">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
				View Consolidated Line Items (${budgets.length} budgets)
			</button>` : '';

		p2.innerHTML = `
			${this._dm_topbar(TITLE[type], pname, null, 2, table_id, fname)}
			<div class="cbd-dm__body">
				<div class="cbd-dm__tbl-wrap">
					${consolidatedBtnHtml}
					<table class="cbd-dt" id="${table_id}">
						<thead><tr>
							<th class="cbd-dt__th cbd-dt__th--num">#</th>
							${thead_html}
							<th class="cbd-dt__th" style="width:110px"></th>
						</tr></thead>
						<tbody>${rows}</tbody>
						<tfoot><tr>
							<td class="cbd-dt__foot">&nbsp;</td>
							<td class="cbd-dt__foot" style="font-weight:800">Total</td>
							<td class="cbd-dt__foot"></td>
							${foot_cells}
							<td class="cbd-dt__foot"></td>
						</tr></tfoot>
					</table>
				</div>
			</div>`;

		p2.addEventListener('click', e => {
			const consolidatedBtn = e.target.closest('#cbd_dm_consolidated');
			if (consolidatedBtn) {
				e.stopPropagation();
				this._dm_budget = null; // signals "consolidated" mode to page3
				this._render_dm_page3(true);
				return;
			}
			const btn = e.target.closest('.cbd-dm__drillp2');
			if (!btn) return;
			e.stopPropagation();
			const bidx = parseInt(btn.dataset.bidx);
			this._dm_budget = (partner.budgets||[])[bidx];
			if (this._dm_budget) this._render_dm_page3();
		});
	}

	// ─── Page 3: Line Items ─────────────────────────────────────────────
	_render_dm_page3(consolidated) {
		const p3    = document.getElementById('cbd_dm_p3');
		if (!p3) return;
		this._dm_goto(3);

		const type    = this._dm_type;
		const partner = this._dm_partner;
		const budget  = this._dm_budget;
		const pname   = frappe.utils.escape_html(partner.partner_name||'Partner');
		const TITLE   = { budget:'Total Budget', utilisation:'Total Utilisation', disbursement:'Total Disbursement' };

		const bname   = consolidated
			? `Consolidated (${(partner.budgets||[]).length} budgets)`
			: frappe.utils.escape_html(budget.budget_reference_name||'Budget');
		const fname   = `${TITLE[type].replace(/\s+/g,'_')}_${(consolidated?'Consolidated':bname).replace(/\s+/g,'_')}_${pname.replace(/\s+/g,'_')}`;

		p3.innerHTML = `
			${this._dm_topbar(TITLE[type], pname, bname, 3, 'cbd_dm_t3', fname)}
			<div class="cbd-dm__body" id="cbd_dm_p3_body">
				<div class="cbd-dm__loading">Loading line items…</div>
			</div>`;

		const pf = this._panel_filters();

		if (consolidated) {
			// Fetch line items for EVERY budget this partner has, then merge
			// by line item (Expense Type + Sub Head + Main Head) so the user
			// sees one consolidated amount per line item across all budgets.
			const budgetIds = (partner.budgets || []).map(b => b.budget_id).filter(Boolean);
			if (type === 'budget') {
				Promise.all(budgetIds.map(budget_id => frappe.call({
					method:'creche_reports.api.budget_utilisation_summary.get_budget_line_items',
					args:{budget_id, start_date:pf.start_date||null, end_date:pf.end_date||null,
					      financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,
					      month:pf.month?JSON.stringify(pf.month):null},
				}))).then(responses => {
					const merged = [];
					responses.forEach(r => (r.message||[]).forEach(item => merged.push(item)));
					this._render_dm_budget_items(merged, true);
				});
			} else if (type === 'utilisation') {
				Promise.all(budgetIds.flatMap(budget_id => [
					frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_budget_line_items',
						args:{budget_id, start_date:pf.start_date||null, end_date:pf.end_date||null,
						      financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,
						      month:pf.month?JSON.stringify(pf.month):null}}),
					frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_utilisation_line_items',
						args:{budget_id, start_date:pf.start_date, end_date:pf.end_date,
						      financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,
						      month:pf.month?JSON.stringify(pf.month):null}}),
				])).then(responses => {
					const mergedBud = [], mergedUtilRecords = [];
					for (let i = 0; i < responses.length; i += 2) {
						mergedBud.push(...(responses[i].message || []));
						mergedUtilRecords.push(...((responses[i+1].message||{}).records || []));
					}
					this._render_dm_util_items(mergedBud, mergedUtilRecords, true);
				});
			}
			return;
		}

		const budget_id = budget.budget_id;

		if (type === 'budget') {
			frappe.call({
				method:'creche_reports.api.budget_utilisation_summary.get_budget_line_items',
				args:{budget_id, start_date:pf.start_date||null, end_date:pf.end_date||null,
				      financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,
				      month:pf.month?JSON.stringify(pf.month):null},
				callback: r => this._render_dm_budget_items(r.message||[]),
			});
		} else if (type === 'utilisation') {
			Promise.all([
				frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_budget_line_items',
					args:{budget_id, start_date:pf.start_date||null, end_date:pf.end_date||null,
					      financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,
					      month:pf.month?JSON.stringify(pf.month):null}}),
				frappe.call({method:'creche_reports.api.budget_utilisation_summary.get_utilisation_line_items',
					args:{budget_id, start_date:pf.start_date, end_date:pf.end_date,
					      financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,
					      month:pf.month?JSON.stringify(pf.month):null}}),
			]).then(([rb, ru]) => this._render_dm_util_items(rb.message||[], (ru.message||{}).records||[]));
		} else {
			frappe.call({
				method:'creche_reports.api.budget_utilisation_summary.get_disbursement_panel_data',
				args:{budget_ids:JSON.stringify([budget_id]), partner_ids:null,
				      start_date:pf.start_date||null, end_date:pf.end_date||null,
				      financial_year:pf.financial_year?JSON.stringify(pf.financial_year):null,
				      month:pf.month?JSON.stringify(pf.month):null},
				callback: r => this._render_dm_disb_items(r.message||[]),
			});
		}
	}

	_render_dm_budget_items(items, consolidated) {
		const body = document.getElementById('cbd_dm_p3_body');
		if (!body) return;
		if (!items.length) { body.innerHTML='<div class="cbd-dm__empty">No budget line items found.</div>'; return; }

		// Determine which amount column(s) to show based on active filters
		const { active: hasFilter, label: amtLabel } = this._filter_period_label();

		// When a filter is active: only show a single "Amount" column (filtered total)
		// When no filter: show Amount + Y1 + Y2 + Y3
		const showYears = !hasFilter;

		// In consolidated mode, merge rows that share the same Expense Type +
		// Sub Head + Main Head across all the partner's budgets into one row.
		let displayItems = items;
		if (consolidated) {
			const merged = {};
			items.forEach(r => {
				const k = [r.type_of_expenses||'—', r.budget_sub_head||'—', r.budget_main_head||'—'].join('||');
				if (!merged[k]) {
					merged[k] = {
						type_of_expenses: r.type_of_expenses, budget_sub_head: r.budget_sub_head,
						budget_main_head: r.budget_main_head,
						total_amount: 0, year_1: 0, year_2: 0, year_3: 0,
					};
				}
				merged[k].total_amount += parseFloat(r.total_amount)||0;
				merged[k].year_1 += parseFloat(r.year_1)||0;
				merged[k].year_2 += parseFloat(r.year_2)||0;
				merged[k].year_3 += parseFloat(r.year_3)||0;
			});
			displayItems = Object.values(merged);
		}

		const grand  = displayItems.reduce((s,r)=>s+(parseFloat(r.total_amount)||0),0);
		const grand1 = displayItems.reduce((s,r)=>s+(parseFloat(r.year_1)||0),0);
		const grand2 = displayItems.reduce((s,r)=>s+(parseFloat(r.year_2)||0),0);
		const grand3 = displayItems.reduce((s,r)=>s+(parseFloat(r.year_3)||0),0);
		const yearThds = showYears ? `<th class="cbd-dt__th cbd-dt__th--r">Y1</th><th class="cbd-dt__th cbd-dt__th--r">Y2</th><th class="cbd-dt__th cbd-dt__th--r">Y3</th>` : '';
		const yearFoot = showYears
			? `<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(grand1,'Y1 Total')}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(grand2,'Y2 Total')}</td><td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(grand3,'Y3 Total')}</td>`
			: '';

		// Group rows by Main Head, each group collapsible.
		const colCount = showYears ? 8 : 5; // # + Expense Type + Sub Head + Main Head + Amount [+Y1+Y2+Y3]
		const rowHtmlFn = (r, i) => {
			const yearTds = showYears
				? `<td class="cbd-dt__r">${r.year_1?this._fmt(r.year_1):'—'}</td><td class="cbd-dt__r">${r.year_2?this._fmt(r.year_2):'—'}</td><td class="cbd-dt__r">${r.year_3?this._fmt(r.year_3):'—'}</td>`
				: '';
			return `
			<tr class="cbd-dt__row cbd-grp__child-row">
				<td class="cbd-dt__num">${i+1}</td>
				<td>${frappe.utils.escape_html(r.type_of_expenses||'—')}</td>
				<td>${frappe.utils.escape_html(r.budget_sub_head||'—')}</td>
				<td>${frappe.utils.escape_html(r.budget_main_head||'—')}</td>
				<td class="cbd-dt__r">${this._fmtTip(r.total_amount, amtLabel)}</td>
				${yearTds}
			</tr>`;
		};
		const groupedHtml = this._render_main_head_groups(displayItems, rowHtmlFn, r => parseFloat(r.total_amount)||0, colCount, amtLabel, showYears);

		body.innerHTML = `
			<div class="cbd-dm__tbl-wrap">
				<table class="cbd-dt cbd-dt--grouped" id="cbd_dm_t3">
					<thead><tr>
						<th class="cbd-dt__th cbd-dt__th--num">#</th>
						<th class="cbd-dt__th">Expense Type</th>
						<th class="cbd-dt__th">Sub Head</th>
						<th class="cbd-dt__th">Main Head</th>
						<th class="cbd-dt__th cbd-dt__th--r" title="${frappe.utils.escape_html(amtLabel)}">${frappe.utils.escape_html(amtLabel)}</th>
						${yearThds}
					</tr></thead>
					<tbody>${groupedHtml}</tbody>
					<tfoot><tr>
						<td class="cbd-dt__foot" colspan="4" style="font-weight:800">Total</td>
						<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(grand,'Total')}</td>
						${yearFoot}
					</tr></tfoot>
				</table>
			</div>`;

		this._wire_main_head_toggle(body);
	}

	// Groups a flat list of line-item rows by "Main Head", rendering each
	// group as a clickable header row (with its own subtotal) followed by
	// its child rows, all collapsed by default. Returns the full <tbody>
	// HTML string. `rowHtmlFn(item, idx)` renders one child <tr>.
	// `amtGetter(item)` extracts the amount used for the group subtotal.
	_render_main_head_groups(items, rowHtmlFn, amtGetter, colCount, amtLabel, showYears) {
		const groups = {};
		const order = [];
		items.forEach(r => {
			const key = r.budget_main_head || '—';
			if (!groups[key]) { groups[key] = []; order.push(key); }
			groups[key].push(r);
		});

		let html = '';
		let groupIdx = 0;
		order.forEach(mainHead => {
			const groupRows = groups[mainHead];
			const groupTotal = groupRows.reduce((s, r) => s + amtGetter(r), 0);
			const gid = `cbd_grp_${groupIdx++}`;
			html += `
			<tr class="cbd-grp__header-row" data-grp-target="${gid}">
				<td colspan="${colCount}">
					<div class="cbd-grp__header">
						<svg class="cbd-grp__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
						<span class="cbd-grp__title">${frappe.utils.escape_html(mainHead)}</span>
						<span class="cbd-grp__count">${groupRows.length} item${groupRows.length===1?'':'s'}</span>
						<span class="cbd-grp__subtotal">${this._fmtTip(groupTotal, `${mainHead} — ${amtLabel}`)}</span>
					</div>
				</td>
			</tr>`;
			groupRows.forEach((r, i) => {
				html += rowHtmlFn(r, i).replace('<tr class="cbd-dt__row cbd-grp__child-row">', `<tr class="cbd-dt__row cbd-grp__child-row cbd-grp__child-row--hidden" data-grp-parent="${gid}">`);
			});
		});
		return html;
	}

	// Delegated click handler for group header rows — toggles visibility of
	// their child rows and flips the chevron. Call once per freshly-rendered
	// body that contains .cbd-grp__header-row elements.
	_wire_main_head_toggle(scopeEl) {
		scopeEl.querySelectorAll('.cbd-grp__header-row').forEach(headerRow => {
			headerRow.addEventListener('click', () => {
				const gid = headerRow.dataset.grpTarget;
				const expanded = headerRow.classList.toggle('cbd-grp__header-row--open');
				scopeEl.querySelectorAll(`[data-grp-parent="${gid}"]`).forEach(childRow => {
					childRow.classList.toggle('cbd-grp__child-row--hidden', !expanded);
				});
			});
		});
	}

	_render_dm_util_items(bud_items, util_records, consolidated) {
		const body = document.getElementById('cbd_dm_p3_body');
		if (!body) return;
		const merged = {};
		(bud_items||[]).forEach(r => {
			const k = r.type_of_expenses||r.budget_sub_head||'?';
			if (!merged[k]) merged[k]={type:r.type_of_expenses||'—',sub:r.budget_sub_head||'—',main:r.budget_main_head||'—',bud:0,util:0};
			merged[k].bud += parseFloat(r.total_amount)||0;
		});
		(util_records||[]).forEach(rec => {
			(rec.items||[]).forEach(r => {
				const k = r.type_of_expenses||r.budget_sub_head||'?';
				if (!merged[k]) merged[k]={type:r.type_of_expenses||'—',sub:r.budget_sub_head||'—',main:r.budget_main_head||'—',bud:0,util:0};
				merged[k].util += parseFloat(r.total_amount)||0;
			});
		});
		const items = Object.values(merged);
		if (!items.length) { body.innerHTML='<div class="cbd-dm__empty">No line items found.</div>'; return; }

		const colCount = 7; // # + Expense Type + Sub Head + Main Head + Budget + Utilised + Util%
		const rowHtmlFn = (r, i) => {
			const pct = r.bud>0?(r.util/r.bud*100):0;
			const chip = pct>=75?'#16a34a':pct>=50?'#d97706':'#dc2626';
			return `<tr class="cbd-dt__row cbd-grp__child-row">
				<td class="cbd-dt__num">${i+1}</td>
				<td>${frappe.utils.escape_html(r.type)}</td>
				<td>${frappe.utils.escape_html(r.sub)}</td>
				<td>${frappe.utils.escape_html(r.main)}</td>
				<td class="cbd-dt__r">${this._fmtTip(r.bud,'Budget')}</td>
				<td class="cbd-dt__r">${this._fmtTip(r.util,'Utilised')}</td>
				<td class="cbd-dt__r"><span class="cbd-dt__pct" style="color:${chip}">${pct.toFixed(1)}%</span></td>
			</tr>`;
		};
		// Group by Main Head — note the helper keys on `r.budget_main_head`,
		// so map `main` -> that field for this dataset's row shape.
		const itemsForGrouping = items.map(r => ({ ...r, budget_main_head: r.main }));
		const groupedHtml = this._render_main_head_groups(itemsForGrouping, rowHtmlFn, r => r.util, colCount, 'Utilised', false);

		const gt_bud = items.reduce((s,r)=>s+r.bud,0);
		const gt_util = items.reduce((s,r)=>s+r.util,0);
		const gt_pct = gt_bud>0?(gt_util/gt_bud*100):0;
		body.innerHTML = `
			<div class="cbd-dm__tbl-wrap">
				<table class="cbd-dt cbd-dt--grouped" id="cbd_dm_t3">
					<thead><tr>
						<th class="cbd-dt__th cbd-dt__th--num">#</th>
						<th class="cbd-dt__th">Expense Type</th>
						<th class="cbd-dt__th">Sub Head</th>
						<th class="cbd-dt__th">Main Head</th>
						<th class="cbd-dt__th cbd-dt__th--r">Budget</th>
						<th class="cbd-dt__th cbd-dt__th--r">Utilised</th>
						<th class="cbd-dt__th cbd-dt__th--r">Util %</th>
					</tr></thead>
					<tbody>${groupedHtml}</tbody>
					<tfoot><tr>
						<td class="cbd-dt__foot" colspan="4" style="font-weight:800">Total</td>
						<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_bud)}</td>
						<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(gt_util)}</td>
						<td class="cbd-dt__r cbd-dt__foot">${gt_pct.toFixed(1)}%</td>
					</tr></tfoot>
				</table>
			</div>`;

		this._wire_main_head_toggle(body);
	}

	_render_dm_disb_items(records) {
		const body = document.getElementById('cbd_dm_p3_body');
		if (!body) return;
		// API returns a flat list of disbursement docs, each with its own
		// `tracker` array directly on it (see get_disbursement_panel_data):
		// [{ name, budget_reference_name, partner_name, total_disbursement, tracker:[{date_of_disbursement, disbursed_amount}], ... }]
		const entries = [];
		(records||[]).forEach(d => {
			const ref = d.budget_reference_name || '—';
			const tracker = d.tracker || [];
			if (tracker.length) {
				tracker.forEach(t => {
					entries.push({ date: t.date_of_disbursement || '', amount: t.disbursed_amount || 0, ref });
				});
			} else if (parseFloat(d.total_disbursement)) {
				// No per-entry tracker rows (e.g. unfiltered) — fall back to the doc total
				entries.push({ date: '', amount: d.total_disbursement, ref });
			}
		});
		if (!entries.length) { body.innerHTML='<div class="cbd-dm__empty">No disbursement entries found.</div>'; return; }
		const rows = entries.map((e,i) => `
			<tr class="cbd-dt__row">
				<td class="cbd-dt__num">${i+1}</td>
				<td>${this._date(e.date)||'—'}</td>
				<td>${frappe.utils.escape_html(e.ref)}</td>
				<td class="cbd-dt__r">${this._fmtTip(e.amount,'Amount')}</td>
			</tr>`).join('');
		const grand = entries.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
		body.innerHTML = `
			<div class="cbd-dm__tbl-wrap">
				<table class="cbd-dt" id="cbd_dm_t3">
					<thead><tr>
						<th class="cbd-dt__th cbd-dt__th--num">#</th>
						<th class="cbd-dt__th">Date</th>
						<th class="cbd-dt__th">Reference</th>
						<th class="cbd-dt__th cbd-dt__th--r">Amount</th>
					</tr></thead>
					<tbody>${rows}</tbody>
					<tfoot><tr>
						<td class="cbd-dt__foot" colspan="3" style="font-weight:800">Total</td>
						<td class="cbd-dt__r cbd-dt__foot">${this._fmtTip(grand)}</td>
					</tr></tfoot>
				</table>
			</div>`;
	}

	// ─── Topbar: breadcrumb + export buttons (pure HTML, no listeners needed) ──
	// ─── Human-readable breadcrumb labels per card type + level ────────────
	_dm_breadcrumb_names() {
		const type = this._dm_type || 'budget';
		const MAP = {
			budget:              { p1:'Partner Summary',       p2:'Allocated Budgets',     p3:'Budget Line Items'     },
			utilisation:         { p1:'Partner Summary',       p2:'Allocated Budgets',     p3:'Utilisation Details'   },
			disbursement:        { p1:'Partner Summary',       p2:'Allocated Budgets',     p3:'Disbursement Log'      },
			bank_balance:        { p1:'Bank Balance Overview', p2:'Budget-wise Balances',  p3:null                    },
			unutilised_disb:     { p1:'Unutilized Overview',   p2:'Budget-wise Details',   p3:null                    },
			unutilised_disb_bal: { p1:'Unutilized Overview',   p2:'Budget-wise Details',   p3:null                    },
			pending_util:        { p1:'Pending Utilization',   p2:'Partner Budgets',       p3:null                    },
		};
		return MAP[type] || { p1:'Summary', p2:'Details', p3:'Line Items' };
	}

	_dm_topbar(title, p2label, p3label, page, tableId, fname) {
		const N = this._dm_breadcrumb_names();

		// Page 1 label: "Partner Summary" / "Bank Balance Overview" etc.
		// Page 2 label: "Allocated Budgets – [Partner Name]"
		// Page 3 label: "Budget Line Items – [Budget Ref]"
		const bc_label1 = N.p1;
		const bc_label2 = p2label ? `${N.p2} – ${p2label}` : (N.p2 || '');
		const bc_label3 = p3label ? `${N.p3} – ${p3label}` : (N.p3 || '');

		const bc1 = page === 1
			? `<span class="cbd-bc__item cbd-bc__item--active">${frappe.utils.escape_html(bc_label1)}</span>`
			: `<button class="cbd-bc__item cbd-bc__item--link" id="cbd_bc_root" title="Back to ${frappe.utils.escape_html(bc_label1)}">${frappe.utils.escape_html(bc_label1)}</button>`;

		let bc2 = '', bc3 = '';
		if (p2label || page >= 2) {
			bc2 = page <= 2
				? `<span class="cbd-bc__sep">›</span><span class="cbd-bc__item cbd-bc__item--active">${frappe.utils.escape_html(bc_label2)}</span>`
				: `<span class="cbd-bc__sep">›</span><button class="cbd-bc__item cbd-bc__item--link" id="cbd_bc_p2" title="Back to ${frappe.utils.escape_html(bc_label2)}">${frappe.utils.escape_html(bc_label2)}</button>`;
		}
		if (p3label) {
			bc3 = `<span class="cbd-bc__sep">›</span><span class="cbd-bc__item cbd-bc__item--active">${frappe.utils.escape_html(bc_label3)}</span>`;
		}

		const backBtn = page > 1
			? `<button class="cbd-dm__back" id="${page===2?'cbd_bc_root_btn':'cbd_bc_p2_btn'}" title="Go back">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
				Back
			</button>`
			: '';

		return `
			<div class="cbd-dm__topbar">
				<div class="cbd-dm__topbar-left">
					${backBtn}
					<nav class="cbd-bc">${bc1}${bc2}${bc3}</nav>
				</div>
				<div class="cbd-dm__actions">
					<div class="cbd-dm__search">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
						<input type="text" class="cbd-dm__search-input" data-tbl="${tableId}" placeholder="Search...">
					</div>
					<div class="cbd-exp-dd">
						<button class="cbd-exp-btn cbd-exp-btn--main" data-tbl="${tableId}" data-fname="${frappe.utils.escape_html(fname)}" data-title="${frappe.utils.escape_html(title||fname)}">
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
							Export
							<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
						</button>
						<div class="cbd-exp-dd__menu">
							<button class="cbd-exp-dd__item" data-fmt="xlsx">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
								Excel (.xlsx)
							</button>
							<button class="cbd-exp-dd__item" data-fmt="pdf">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
								PDF (A4)
							</button>
						</div>
					</div>
					<button class="cbd-dm__close" title="Close (Esc)">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				</div>
			</div>`;
	}
	// ─── Export: Excel (CSV fallback) ────────────────────────────────────
	// ─── Export: server-side via frappe.call (real .xlsx / PDF A4) ──────────
	_table_to_columns_rows(tableId) {
		const table = document.getElementById(tableId);
		if (!table) return null;
		const clone = table.cloneNode(true);
		clone.querySelectorAll('td.cbd-dt__act, .cbd-dt__btn, button').forEach(el => {
			const td = el.closest('td,th'); if (td) td.remove();
		});
		// only visible rows (respect search filter)
		const theadRow = clone.querySelector('thead tr');
		if (!theadRow) return null;
		const ths = [...theadRow.querySelectorAll('th')];
		const columns = ths.map((th, i) => ({
			label: (th.innerText || '').trim(),
			key: 'c' + i,
			align: th.classList.contains('cbd-dt__th--r') ? 'right' : 'left',
		}));
		const rows = [];
		clone.querySelectorAll('tbody tr, tfoot tr').forEach(tr => {
			if (tr.style.display === 'none') return; // respect search filter
			const tds = [...tr.querySelectorAll('td')];
			const row = {};
			tds.forEach((td, i) => {
				const key = columns[i] ? columns[i].key : ('c' + i);
				let txt = (td.innerText || '').replace(/\n/g, ' ').trim();
				const num = parseFloat(txt.replace(/[₹,\s%]/g, ''));
				row[key] = (!isNaN(num) && txt !== '' && /[\d]/.test(txt)) ? num : txt;
			});
			rows.push(row);
		});
		return { columns, rows };
	}

	_export_table(tableId, fname, title, format) {
		const data = this._table_to_columns_rows(tableId);
		if (!data || !data.rows.length) {
			frappe.show_alert({message:'Table not ready', indicator:'orange'}); return;
		}
		frappe.show_alert({message:`Generating ${format.toUpperCase()}…`, indicator:'blue'}, 2);
		frappe.call({
			method: 'creche_reports.api.budget_utilisation_summary.export_table',
			args: {
				title: title || fname || 'Report',
				columns: JSON.stringify(data.columns),
				rows: JSON.stringify(data.rows),
				format: format,
			},
			callback: (r) => {
				if (r.message && r.message.file_url) {
					window.open(r.message.file_url, '_blank');
					frappe.show_alert({message:'Download ready', indicator:'green'}, 3);
				} else {
					frappe.show_alert({message:'Export failed', indicator:'red'}, 4);
				}
			},
			error: () => frappe.show_alert({message:'Export failed — server error', indicator:'red'}, 5),
		});
	}

	// ─── Live search filter for drill-down tables ────────────────────────
	_filter_table_rows(tableId, query) {
		const table = document.getElementById(tableId);
		if (!table) return;
		const q = (query || '').trim().toLowerCase();
		table.querySelectorAll('tbody tr').forEach(tr => {
			if (!q) { tr.style.display = ''; return; }
			const text = tr.innerText.toLowerCase();
			tr.style.display = text.includes(q) ? '' : 'none';
		});
	}



	// ─────────────────────────────────────────────────────────────────────────
	// BUDGET MODAL  — single container, two pages, slide transition
	// ─────────────────────────────────────────────────────────────────────────

	_open_budget_summary_modal() {
		const old = document.getElementById('cbd_budget_modal_wrap');
		if (old) old.remove();

		const wrap = document.createElement('div');
		wrap.id        = 'cbd_budget_modal_wrap';
		wrap.className = 'cbd-sm-wrap';
		wrap.innerHTML = `
			<div class="cbd-sm-modal cbd-bm__modal">
				<div class="cbd-bm__viewport">
					<div class="cbd-bm__page" id="cbd_bm_page1"></div>
					<div class="cbd-bm__page cbd-bm__page--detail" id="cbd_bm_page2"></div>
				</div>
			</div>`;

		document.body.appendChild(wrap);
		requestAnimationFrame(() => wrap.classList.add('cbd-sm-wrap--open'));

		// Esc key closes entirely
		const _esc = (e) => { if (e.key === 'Escape') this._close_budget_modal(); };
		document.addEventListener('keydown', _esc);
		wrap._escHandler = _esc;
		wrap.addEventListener('click', (e) => { if (e.target === wrap) this._close_budget_modal(); });

		this._render_budget_page1();
	}

	_close_budget_modal() {
		const wrap = document.getElementById('cbd_budget_modal_wrap');
		if (!wrap) return;
		wrap.classList.remove('cbd-sm-wrap--open');
		wrap.addEventListener('transitionend', () => wrap.remove(), { once: true });
		if (wrap._escHandler) document.removeEventListener('keydown', wrap._escHandler);
	}

	_render_budget_page1() {
		const page1 = document.getElementById('cbd_bm_page1');
		if (!page1) return;
		const modal = page1.closest('.cbd-bm__modal');
		modal.classList.remove('cbd-bm__modal--detail');

		const partners = this._all_partners || [];
		const grand    = partners.reduce((s,p) => s + (parseFloat(p.total_budget)||0), 0);

		const rows = partners.map((p, idx) => {
			const bud   = parseFloat(p.total_budget) || 0;
			const pname = frappe.utils.escape_html(p.partner_name||'—');
			return `
			<tr>
				<td class="cbd-st__num">${idx + 1}</td>
				<td class="cbd-st__cell">${pname}</td>
				<td class="cbd-st__cell cbd-st__r">${this._fmtTip(bud,'Approved Budget')}</td>
				<td class="cbd-st__cell cbd-st__action">
					<button class="cbd-st__drill-btn" data-idx="${idx}">View in Detail</button>
				</td>
			</tr>`;
		}).join('');

		const tfoot = `
			<tr>
				<td class="cbd-st__foot" colspan="2">Grand Total</td>
				<td class="cbd-st__foot cbd-st__r">${this._fmtTip(grand,'Total Approved Budget')}</td>
				<td class="cbd-st__foot"></td>
			</tr>`;

		page1.innerHTML = `
			<div class="cbd-bm__topbar">
				<nav class="cbd-bc">
					<span class="cbd-bc__item cbd-bc__item--root">Total Budget</span>
				</nav>
				<button class="cbd-bm__close" id="cbd_bm_close1" title="Close">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<div class="cbd-bm__body">
				<div class="cbd-sm-tbl-wrap">
					<table class="cbd-st">
						<thead>
							<tr>
								<th class="cbd-st__th cbd-st__th--num">#</th>
								<th class="cbd-st__th">Partner</th>
								<th class="cbd-st__th cbd-st__th--r">Approved Budget</th>
								<th class="cbd-st__th" style="width:120px"></th>
							</tr>
						</thead>
						<tbody>${rows}</tbody>
						<tfoot>${tfoot}</tfoot>
					</table>
				</div>
			</div>`;

		page1.querySelector('#cbd_bm_close1').addEventListener('click', () => this._close_budget_modal());
		page1.addEventListener('click', (e) => {
			const btn = e.target.closest('.cbd-st__drill-btn');
			if (!btn) return;
			const partner = (this._all_partners || [])[parseInt(btn.dataset.idx)];
			if (partner) this._render_budget_page2(partner);
		});
	}

		_render_budget_page2(partner) {
		const page2 = document.getElementById('cbd_bm_page2');
		if (!page2) return;
		const modal = page2.closest('.cbd-bm__modal');
		modal.classList.add('cbd-bm__modal--detail');

		const budgets = partner.budgets || [];
		const grand   = budgets.reduce((s,b) => s + (parseFloat(b.budget)||0), 0);
		const pname   = frappe.utils.escape_html(partner.partner_name||'Partner');

		const rows = budgets.map((b, i) => `
			<tr>
				<td class="cbd-st__num">${i + 1}</td>
				<td class="cbd-st__cell">${frappe.utils.escape_html(b.budget_reference_name||'—')}</td>
				<td class="cbd-st__cell cbd-st__r">${this._fmtTip(b.budget,'Approved Budget')}</td>
			</tr>`).join('');

		const tfoot = `
			<tr>
				<td class="cbd-st__foot" colspan="2">Total</td>
				<td class="cbd-st__foot cbd-st__r">${this._fmtTip(grand,'Total Approved Budget')}</td>
			</tr>`;

		page2.innerHTML = `
			<div class="cbd-bm__topbar">
				<nav class="cbd-bc">
					<button class="cbd-bc__item cbd-bc__item--link" id="cbd_bm_back">Total Budget</button>
					<span class="cbd-bc__sep">›</span>
					<span class="cbd-bc__item cbd-bc__item--active">${pname}</span>
				</nav>
				<button class="cbd-bm__close" id="cbd_bm_close2" title="Close">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<div class="cbd-bm__body">
				<div class="cbd-sm-tbl-wrap">
					<table class="cbd-st">
						<thead>
							<tr>
								<th class="cbd-st__th cbd-st__th--num">#</th>
								<th class="cbd-st__th">Budget Reference</th>
								<th class="cbd-st__th cbd-st__th--r">Approved Budget</th>
							</tr>
						</thead>
						<tbody>${rows}</tbody>
						<tfoot>${tfoot}</tfoot>
					</table>
				</div>
			</div>`;

		page2.querySelector('#cbd_bm_close2').addEventListener('click', () => this._close_budget_modal());
		page2.querySelector('#cbd_bm_back').addEventListener('click', () => this._render_budget_page1());
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

		const partner_rows = partners.map(p => ({ name: p.partner_name }));

		const budget_rows = partners.flatMap(p =>
			(p.budgets||[]).map(b => ({ ref: b.budget_reference_name, creches: b.no_of_creches || 0 }))
		);

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
				drillType: 'states',
			},
			{
				key:'districts', value:all_districts.length, rawCount: all_districts.length,
				label:'District'+(all_districts.length!==1?'s':''),
				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
				drillData: all_districts,
				drillType: 'districts',
			},
			{
				key:'blocks', value:all_blocks.length, rawCount: all_blocks.length,
				label:'Block'+(all_blocks.length!==1?'s':''),
				icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
				drillData: all_blocks,
				drillType: 'blocks',
			},
		];

		// Accent colours per stat card
		const OSTAT_PALETTE = {
			partners:   { color:'#1e3a5f', ibg:'#e8f0fe' },
			budgets:    { color:'#1e3a5f', ibg:'#e8f0fe' },
			creches:    { color:'#1e3a5f', ibg:'#e8f0fe' },
			states:     { color:'#1e3a5f', ibg:'#e8f0fe' },
			districts:  { color:'#1e3a5f', ibg:'#e8f0fe' },
			blocks:     { color:'#1e3a5f', ibg:'#e8f0fe' },
		};
		el.style.display = '';
		const _ohd = document.getElementById('cbd_overview_hd');
		if (_ohd) _ohd.style.display = '';
		const _shd = document.getElementById('cbd_summary_hd');
		if (_shd) _shd.style.display = '';
		el.innerHTML = stats.map(s => {
			const pal = OSTAT_PALETTE[s.key] || { color:'#6366F1', ibg:'#EEF2FF' };
			const clickableCls = s.noDrill ? '' : 'cbd-ostat--clickable';
			const arrowSvg = s.noDrill ? '' : `<svg class="cbd-ostat__arrow" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
			return `
			<div class="cbd-ostat ${clickableCls}" data-key="${s.key}" title="${s.label}"
			     style="--card-accent:${pal.color};--ost-ibg:${pal.ibg}">
				<span class="cbd-ostat__icon">${s.icon}</span>
				<div class="cbd-ostat__body">
					<div class="cbd-ostat__value">${s.value}</div>
					<div class="cbd-ostat__label">${s.label}</div>
				</div>
				${arrowSvg}
			</div>`;
		}).join('');

		el.querySelectorAll('.cbd-ostat--clickable').forEach(card => {
			const key  = card.dataset.key;
			const stat = stats.find(s => s.key === key);
			if (!stat || stat.noDrill) return;
			card.addEventListener('click', () => this._open_ostat_drill(stat));
		});
	}

	_open_ostat_drill(stat) {
		const old = document.getElementById('cbd_drill_modal_wrap');
		if (old) old.remove();

		const wrap = document.createElement('div');
		wrap.id        = 'cbd_drill_modal_wrap';
		wrap.className = 'cbd-drill-modal-wrap';

		const rawCount = stat.rawCount !== undefined ? stat.rawCount : stat.value;
		const accentMap = { partners:'indigo', budgets:'blue', creches:'teal', states:'orange', districts:'violet', blocks:'rose' };
		const accent = accentMap[stat.drillType] || 'blue';

		wrap.innerHTML = `
			<div class="cbd-drill-modal cbd-drill-modal--narrow cbd-drill-modal--${accent}">
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
		wrap.addEventListener('click', (e) => { if (e.target === wrap) this._close_drill_panel(); });
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

	// ─────────────────────────────────────────────
	// DRILL-DOWN CONTENT — each card shows only its own relevant data
	// ─────────────────────────────────────────────

	_build_ostat_content(stat) {
		const { drillType, drillData } = stat;

		if (!drillData || !drillData.length)
			return '<div class="cbd-drill-empty">No data available.</div>';

		// Each card gets its own colour palette
		const PALETTE = {
			partners:  { hdr:'#4F46E5', hdrText:'#fff',  badge:'#EEF2FF', badgeText:'#3730A3', dot:'#818CF8' },
			budgets:   { hdr:'#0369A1', hdrText:'#fff',  badge:'#E0F2FE', badgeText:'#075985', dot:'#38BDF8' },
			creches:   { hdr:'#0D9488', hdrText:'#fff',  badge:'#CCFBF1', badgeText:'#115E59', dot:'#2DD4BF' },
			states:    { hdr:'#B45309', hdrText:'#fff',  badge:'#FEF3C7', badgeText:'#92400E', dot:'#FBBF24' },
			districts: { hdr:'#7C3AED', hdrText:'#fff',  badge:'#EDE9FE', badgeText:'#4C1D95', dot:'#A78BFA' },
			blocks:    { hdr:'#BE185D', hdrText:'#fff',  badge:'#FCE7F3', badgeText:'#831843', dot:'#F472B6' },
		};
		const p = PALETTE[drillType] || PALETTE.partners;

		// ── Partners: #  | Partner Name ─────────────────────────────
		if (drillType === 'partners') {
			const rows = drillData.map((item, i) => `
				<tr>
					<td class="cbd-dt2__num" style="background:${p.badge};color:${p.badgeText}">${i + 1}</td>
					<td class="cbd-dt2__cell">${frappe.utils.escape_html(item.name)}</td>
				</tr>`).join('');
			return `
				<table class="cbd-dt2" style="--dt2-hdr:${p.hdr};--dt2-hdr-text:${p.hdrText};--dt2-dot:${p.dot}">
					<thead><tr>
						<th class="cbd-dt2__th-num">#</th>
						<th class="cbd-dt2__th">Partner Name</th>
					</tr></thead>
					<tbody>${rows}</tbody>
				</table>`;
		}

		// ── Budgets: #  | Budget Reference ─────────────────────────
		if (drillType === 'budgets') {
			const rows = drillData.map((item, i) => `
				<tr>
					<td class="cbd-dt2__num" style="background:${p.badge};color:${p.badgeText}">${i + 1}</td>
					<td class="cbd-dt2__cell">${frappe.utils.escape_html(item.ref || '—')}</td>
				</tr>`).join('');
			return `
				<table class="cbd-dt2" style="--dt2-hdr:${p.hdr};--dt2-hdr-text:${p.hdrText};--dt2-dot:${p.dot}">
					<thead><tr>
						<th class="cbd-dt2__th-num">#</th>
						<th class="cbd-dt2__th">Budget Reference</th>
					</tr></thead>
					<tbody>${rows}</tbody>
				</table>`;
		}

		// ── Creches: #  | Budget Reference  | Creches ───────────────
		if (drillType === 'creches') {
			const rows = drillData.map((item, i) => `
				<tr>
					<td class="cbd-dt2__num" style="background:${p.badge};color:${p.badgeText}">${i + 1}</td>
					<td class="cbd-dt2__cell">${frappe.utils.escape_html(item.ref || '—')}</td>
					<td class="cbd-dt2__badge-cell">
						${item.creches ? `<span class="cbd-dt2__pill" style="background:${p.badge};color:${p.badgeText};border-color:${p.dot}">${item.creches.toLocaleString('en-IN')}</span>` : '—'}
					</td>
				</tr>`).join('');
			return `
				<table class="cbd-dt2" style="--dt2-hdr:${p.hdr};--dt2-hdr-text:${p.hdrText};--dt2-dot:${p.dot}">
					<thead><tr>
						<th class="cbd-dt2__th-num">#</th>
						<th class="cbd-dt2__th">Budget Reference</th>
						<th class="cbd-dt2__th cbd-dt2__th--r">Creches</th>
					</tr></thead>
					<tbody>${rows}</tbody>
				</table>`;
		}

		// ── States / Districts / Blocks: #  | Name ──────────────────
		if (drillType === 'states' || drillType === 'districts' || drillType === 'blocks') {
			const label = drillType === 'states' ? 'State' : drillType === 'districts' ? 'District' : 'Block';
			const rows = drillData.map((item, i) => `
				<tr>
					<td class="cbd-dt2__num" style="background:${p.badge};color:${p.badgeText}">${i + 1}</td>
					<td class="cbd-dt2__cell">${frappe.utils.escape_html(item)}</td>
				</tr>`).join('');
			return `
				<table class="cbd-dt2" style="--dt2-hdr:${p.hdr};--dt2-hdr-text:${p.hdrText};--dt2-dot:${p.dot}">
					<thead><tr>
						<th class="cbd-dt2__th-num">#</th>
						<th class="cbd-dt2__th">${label} Name</th>
					</tr></thead>
					<tbody>${rows}</tbody>
				</table>`;
		}

		return '<div class="cbd-drill-empty">No details available.</div>';
	}


	render_partners(partners) {
		this._all_partners = partners || [];
		this._render_overview_strip(partners || []);
		// Partner cards removed — breakdown now lives in the summary modal
	}

	_render_partners_OLD_UNUSED(partners) {
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
		else{left.classList.add('cbd-panel--open');right.classList.add('cbd-panel--open');left.innerHTML=left_html;right.innerHTML=right_html;}
		const wire=(id,fn)=>{const b=document.getElementById(id);if(b)b.addEventListener('click',fn);};
		wire('cbd_close_panels',()=>this._close_left());wire('cbd_close_panels2',()=>this._close_right());
		if(panel==='budget'||panel==='both')this._load_consolidated_budget_items(budget_ids);
		if(panel==='utilisation'||panel==='both')this._load_consolidated_utilisation_items(budget_ids,grant_start,grant_end);
	}

	_open_panels(budget_id,ref_name,grant_start,grant_end) {
		const overlay=document.getElementById('cbd_overlay');const left=document.getElementById('cbd_panel_left');const right=document.getElementById('cbd_panel_right');
		overlay.classList.add('cbd-overlay--active');left.classList.add('cbd-panel--open');right.classList.add('cbd-panel--open');document.body.classList.add('cbd-panels-open');
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
	}
	_close_left(){const left=document.getElementById('cbd_panel_left');left.classList.remove('cbd-panel--open','cbd-panel--full');const right=document.getElementById('cbd_panel_right');if(!right.classList.contains('cbd-panel--open'))this._close_panels();}
	_close_right(){const right=document.getElementById('cbd_panel_right');right.classList.remove('cbd-panel--open','cbd-panel--full');const left=document.getElementById('cbd_panel_left');if(!left.classList.contains('cbd-panel--open'))this._close_panels();}

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

	_fym_from_date_range(start_date_str, end_date_str) {
		const MONTH_NAMES = ['January','February','March','April','May','June',
		                     'July','August','September','October','November','December'];
		const to_fy = (yr, mo) => { const fy = mo >= 4 ? yr : yr - 1; return `${fy}-${String(fy+1).slice(-2)}`; };
		const fys = new Set(); const months = new Set();
		if (!start_date_str) return { fys, months };
		const sd = new Date(start_date_str);
		const ed = end_date_str ? new Date(end_date_str) : new Date();
		let y = sd.getFullYear(), m = sd.getMonth();
		const ey = ed.getFullYear(), em = ed.getMonth();
		while (y < ey || (y === ey && m <= em)) {
			fys.add(to_fy(y, m + 1));
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

	// ─── Number formatting ──────────────────────────────────────────────
	// ── Number formatting ──────────────────────────────────────────────────
	// Short form: ₹1.23 Cr / ₹45.60 L / ₹1.2 K / ₹999
	_fmt(n) {
		if (n === null || n === undefined || n === '') return '—';
		const v = parseFloat(n) || 0;
		const abs = Math.abs(v);
		if (abs >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr';
		if (abs >= 100000)   return '₹' + (v / 100000).toFixed(2)   + ' L';
		if (abs >= 1000)     return '₹' + (v / 1000).toFixed(1)     + ' K';
		return '₹' + Math.round(v).toLocaleString('en-IN');
	}

	// Full exact value — Indian comma format, 2 decimals
	_fmtFull(n) {
		if (n === null || n === undefined || n === '') return '—';
		const v = parseFloat(n) || 0;
		return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	// Card format: always shows Cr if >= 1 Cr, L if >= 1 L, else exact
	_fmtCr(n) {
		if (n === null || n === undefined || n === '') return '—';
		const v   = parseFloat(n) || 0;
		const abs = Math.abs(v);
		if (abs >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr';
		if (abs >= 100000)   return '₹' + (v / 100000).toFixed(2)   + ' L';
		if (abs >= 1000)     return '₹' + (v / 1000).toFixed(1)     + ' K';
		return '₹' + Math.round(v).toLocaleString('en-IN');
	}

	// Tooltip-enabled inline value for TABLES
	// • Short display (Cr/L/K)
	// • Tooltip: "Label: ₹1,23,456.00 (₹1.23 L)"
	_fmtTip(n, label = 'Amount') {
		if (n === null || n === undefined || n === '') return '<span>—</span>';
		const v     = parseFloat(n) || 0;
		const short = this._fmt(v);
		const full  = this._fmtFull(v);
		// Always show tooltip so users can verify exact values
		const tipText = label ? `${label}\n${full}` : full;
		return `<span class="cbd-tip-wrap" data-tip="${frappe.utils.escape_html(tipText)}" style="cursor:default;border-bottom:1px dotted #94a3b8">${short}</span>`;
	}

	// Card number: Cr display + tooltip with full Indian value
	_fmtCard(n, label = '') {
		if (n === null || n === undefined || n === '') return '<span class="cbd-scard__num-val">—</span>';
		const v       = parseFloat(n) || 0;
		const display = this._fmtCr(v);
		const full    = this._fmtFull(v);
		const tipText = label ? `${label}\n${full}` : full;
		return `<span class="cbd-scard__num-val cbd-tip-wrap" data-tip="${frappe.utils.escape_html(tipText)}" style="cursor:default">${display}</span>`;
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

	_bind_view_buttons(){
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

	_ensure_panels(){
		if(document.getElementById('cbd_overlay'))return;
		const overlay=document.createElement('div');overlay.className='cbd-overlay';overlay.id='cbd_overlay';
		const left=document.createElement('div');left.className='cbd-panel-left';left.id='cbd_panel_left';
		const right=document.createElement('div');right.className='cbd-panel-right';right.id='cbd_panel_right';
		const disb_modal=document.createElement('div');disb_modal.id='cbd_disb_modal';disb_modal.className='cbd-disb-modal';
		const disb_overlay=document.createElement('div');disb_overlay.id='cbd_disb_overlay';disb_overlay.className='cbd-disb-overlay';
		document.body.appendChild(overlay);document.body.appendChild(left);document.body.appendChild(right);document.body.appendChild(disb_overlay);document.body.appendChild(disb_modal);
		disb_overlay.addEventListener('click',()=>this._close_disb_panel());
		overlay.addEventListener('click',()=>this._close_all_panels());
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
		.cbd-overview-strip {
			display:grid;
			grid-template-columns:repeat(6,1fr);
			gap:8px; margin-bottom:12px;
		}
		.cbd-ostat {
			display:flex; align-items:center; gap:10px;
			padding:12px 14px; min-width:0; word-break:break-word;
			background:#fff;
			border:1px solid #e8edf3;
			border-left:4px solid var(--ost-color,#378ADD);
			border-radius:12px; position:relative;
			transition:box-shadow .2s;
		}
		.cbd-ostat--clickable { cursor:pointer; }
		.cbd-ostat--clickable:hover { box-shadow:0 4px 16px rgba(0,0,0,.08); }
		.cbd-ostat--clickable:hover .cbd-ostat__arrow { opacity:1; }
		.cbd-ostat__arrow { position:absolute; right:10px; top:50%; transform:translateY(-50%); color:var(--ost-color,#378ADD); opacity:0; transition:opacity .15s; flex-shrink:0; font-size:12px; }
		.cbd-drill-modal-wrap { position:fixed; inset:0; z-index:3200; background:rgba(0,0,0,0); display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box; transition:background .2s ease; pointer-events:none; }
		.cbd-drill-modal-wrap--open { background:rgba(0,0,0,.45); pointer-events:all; }
		.cbd-drill-modal { background:var(--card-bg,#fff); border-radius:12px; border:1px solid var(--border-color,#d1d8dd); box-shadow:0 8px 40px rgba(0,0,0,.18); display:flex; flex-direction:column; max-height:80vh; width:100%; opacity:0; transform:scale(.96) translateY(8px); transition:opacity .22s ease, transform .22s cubic-bezier(.34,1.56,.64,1); overflow:hidden; }
		.cbd-drill-modal-wrap--open .cbd-drill-modal { opacity:1; transform:scale(1) translateY(0); }
		.cbd-drill-modal--wide   { max-width:640px; }
		.cbd-drill-modal--narrow { max-width:400px; }
		@media (max-width:600px) { .cbd-drill-modal-wrap { align-items:flex-end; padding:0; } .cbd-drill-modal { border-radius:16px 16px 0 0; max-width:100vw; max-height:85vh; transform:translateY(20px); } .cbd-drill-modal-wrap--open .cbd-drill-modal { transform:translateY(0); } }
		.cbd-drill-modal__header { display:flex; align-items:center; justify-content:space-between; padding:16px 18px 14px; border-bottom:1px solid var(--border-color,#d1d8dd); flex-shrink:0; }
		.cbd-drill-modal__header-left { display:flex; align-items:center; gap:12px; min-width:0; }
		.cbd-drill-modal__icon { width:38px; height:38px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border-radius:10px; background:#EEF5FC; color:#378ADD; }
		.cbd-drill-modal__title { font-size:15px; font-weight:700; color:var(--text-color,#1c2126); }
		.cbd-drill-modal__sub   { font-size:11px; color:var(--text-muted,#8d99a6); margin-top:2px; }
		.cbd-drill-modal__close { width:30px; height:30px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border:1px solid var(--border-color,#d1d8dd); border-radius:7px; background:none; cursor:pointer; color:var(--text-muted,#8d99a6); transition:background .12s, color .12s, border-color .12s; }
		.cbd-drill-modal__close:hover { background:#FCEBEB; color:#A32D2D; border-color:#F09595; }
		.cbd-drill-modal__body { flex:1; overflow-y:auto; padding:0; }
		.cbd-drill-modal__body::-webkit-scrollbar { width:4px; }
		.cbd-drill-modal__body::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }
		.cbd-drill-modal__footer { display:flex; justify-content:flex-end; align-items:center; padding:10px 18px; border-top:1px solid var(--border-color,#d1d8dd); flex-shrink:0; background:var(--control-bg,#f9f9f9); }
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
		.cbd-ostat__icon {
			width:34px; height:34px; flex-shrink:0;
			display:flex; align-items:center; justify-content:center;
			border-radius:8px;
			background:var(--ost-ibg,#EEF2FF);
			color:var(--ost-color,#378ADD);
		}
		.cbd-ostat__body { min-width:0; flex:1; }
		.cbd-ostat__value {
			font-size:18px; font-weight:800; color:#1f2d3d;
			line-height:1.1; margin-bottom:1px;
		}
		.cbd-ostat__label {
			font-size:9px; font-weight:700; text-transform:uppercase;
			letter-spacing:.5px; color:#8492a6;
			margin-top:2px; white-space:nowrap;
			overflow:hidden; text-overflow:ellipsis;
		}
				/* ════════════════════════════════════════════════════════
		   UNIFIED CARD ATOM  (overview strip + summary cards)
		   Both groups use the same base card — only the grid
		   columns differ so sizes stay identical.
		   ════════════════════════════════════════════════════════ */

		/* ── Section labels above each group ── */
		.cbd-section-hd {
			display:flex; align-items:center; gap:10px;
			margin:0 0 10px;
		}
		.cbd-section-hd__line {
			flex:1; height:1px; background:#e8edf3;
		}
		.cbd-section-hd__label {
			font-size:10px; font-weight:700; text-transform:uppercase;
			letter-spacing:.8px; color:#a0aec0;
			white-space:nowrap; flex-shrink:0;
		}

		/* ── Common summary chart card (not per-partner) ── */
		.cbd-chart-card {
			background:#fff; border:1px solid #e8edf3; border-radius:12px;
			padding:18px 22px 18px; margin-bottom:16px;
			box-shadow:0 1px 3px rgba(15,23,42,.04);
		}
		.cbd-chart-card__legend {
			display:flex; align-items:center; justify-content:space-between;
			margin-bottom:16px; flex-wrap:wrap; gap:10px;
		}
		.cbd-chart-legend__items {
			display:flex; align-items:center; gap:18px; flex-wrap:wrap;
		}
		.cbd-chart-legend__item {
			display:inline-flex; align-items:center; gap:7px;
			font-size:13px; font-weight:600; color:#334155;
		}
		.cbd-chart-legend__swatch {
			width:11px; height:11px; border-radius:3px; display:inline-block;
		}
		.cbd-chart-legend__period {
			font-size:11px; font-weight:700;
			color:#1e3a5f; background:#eef4fd; border:1px solid #d3e3f8;
			border-radius:20px; padding:4px 12px; white-space:nowrap;
		}
		.cbd-chart-card__body { width:100%; }

		/* ── Utilisation Breakdown: 3 comparison donuts side by side ── */
		.cbd-donut__grid {
			display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
			gap:18px;
		}
		.cbd-donut__panel {
			border:1px solid #eef2f7; border-radius:10px; padding:14px 16px;
		}
		.cbd-donut__panel-title {
			font-size:11.5px; font-weight:700; color:#475569;
			margin-bottom:10px;
		}
		.cbd-donut {
			display:flex; align-items:center; gap:14px; flex-wrap:wrap;
		}
		.cbd-donut__chart {
			position:relative; flex-shrink:0; width:140px; height:140px;
		}
		.cbd-donut__seg { transition:opacity .12s; }
		.cbd-donut__seg:hover { opacity:.82; }
		.cbd-donut__center {
			position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
			text-align:center; pointer-events:none;
		}
		.cbd-donut__center-pct { font-size:21px; font-weight:800; color:#0f172a; line-height:1; }
		.cbd-donut__center-lbl { font-size:8.5px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.4px; margin-top:2px; }
		.cbd-donut__legend { flex:1; min-width:130px; display:flex; flex-direction:column; gap:6px; }
		.cbd-donut__row {
			cursor:pointer; display:flex; align-items:center; gap:8px;
			padding:5px 6px; border-radius:6px; transition:background .12s;
		}
		.cbd-donut__row:hover { background:#f8fafc; }
		.cbd-donut__dot { width:9px; height:9px; border-radius:3px; flex-shrink:0; }
		.cbd-donut__row-lbl { font-size:11px; font-weight:600; color:#334155; flex:1; line-height:1.3; }
		.cbd-donut__row-val { font-size:11px; font-weight:700; color:#0f172a; white-space:nowrap; }
		.cbd-donut__empty { font-size:11px; color:#cbd5e1; font-style:italic; }
		.cbd-donut__overflow {
			margin-top:10px; font-size:10.5px; font-weight:600; color:#b45309;
			background:#fffbeb; border:1px solid #fde68a; border-radius:6px;
			padding:5px 8px;
		}

		/* ── Overview strip — 6 compact cards in one row ── */
		.cbd-overview-strip {
			display:grid;
			grid-template-columns:repeat(6,1fr);
			gap:8px; margin-bottom:6px;
		}

		/* ── Summary cards (4-col, same as overview strip) ── */
		.cbd-summary-cards {
			display:grid;
			grid-template-columns:repeat(4,1fr);
			gap:10px; margin-bottom:6px;
		}

		/* ── Shared card base ── */
		.cbd-ostat,
		.cbd-scard {
			background:#fff;
			border:1px solid #e8edf3;
			border-left:4px solid #1e3a5f;
			border-radius:10px;
			min-width:0; word-break:break-word;
			transition:box-shadow .2s;
		}
		/* scard: generous padding, compact min-height (matches reference cards) */
		.cbd-scard { padding:14px 16px 12px; min-height:104px; }
		/* ostat: compact padding, no min-height — fits naturally */
		.cbd-ostat { padding:11px 12px 10px; min-height:0; position:relative; }
		.cbd-ostat--clickable { cursor:pointer; }
		.cbd-ostat:hover,
		.cbd-scard:hover {
			box-shadow:0 4px 18px rgba(0,0,0,.09);
		}

		/* ostat inherits card atom but also needs flex */
		.cbd-ostat {
			display:flex; align-items:center; gap:10px;
			position:relative;
		}
		.cbd-ostat--clickable:hover .cbd-ostat__arrow { opacity:1; }
		.cbd-ostat__arrow {
			position:absolute; right:10px; top:50%; transform:translateY(-50%);
			color:var(--card-accent,#378ADD); opacity:0;
			transition:opacity .15s; font-size:12px; flex-shrink:0;
		}
		/* ostat: compact horizontal row */
		.cbd-ostat {
			display:flex !important; flex-direction:row !important;
			align-items:center !important; gap:10px;
		}
		.cbd-ostat__head { display:none; }
		.cbd-ostat__icon {
			width:32px; height:32px; flex-shrink:0;
			display:flex; align-items:center; justify-content:center;
			border-radius:7px;
			background:var(--ost-ibg,#EEF2FF);
			color:var(--card-accent,#378ADD);
		}
		.cbd-ostat__icon svg { width:16px; height:16px; }
		.cbd-ostat__body { min-width:0; flex:1; }
		.cbd-ostat__value {
			font-size:17px; font-weight:800; color:#1a202c;
			line-height:1.1; margin-bottom:1px;
		}
		.cbd-ostat__label {
			font-size:9px; font-weight:700; text-transform:uppercase;
			letter-spacing:.55px; color:#8492a6; line-height:1.3;
			white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
		}
		.cbd-ostat__arrow {
			position:absolute; right:8px; top:50%; transform:translateY(-50%);
			color:var(--card-accent,#378ADD);
			opacity:0; transition:opacity .15s; font-size:11px;
		}
		.cbd-ostat--clickable:hover .cbd-ostat__arrow { opacity:1; }

		/* ── Summary card inner (reference-style: label / value / % / link) ── */
		.cbd-scard {
			display:flex; flex-direction:column; cursor:pointer;
		}
		.cbd-scard__lbl {
			font-size:10px; font-weight:700; text-transform:uppercase;
			letter-spacing:.65px; color:#8492a6; line-height:1.3;
			margin-bottom:8px;
		}
		.cbd-scard__num {
			font-size:24px; font-weight:800; color:#1a202c;
			line-height:1.15; margin-bottom:4px; letter-spacing:-.3px;
		}
		.cbd-scard__num-val { display:inline; }
		.cbd-scard__sub { font-size:11px; color:#9ca3af; line-height:1.3; margin-bottom:8px; }
		.cbd-scard__cta {
			display:inline-flex; align-items:center; gap:5px;
			font-size:10.5px; font-weight:700; letter-spacing:.3px;
			text-transform:uppercase; color:var(--card-accent,#378ADD);
			margin-top:auto;
		}
		.cbd-scard__cta svg { flex-shrink:0; }

		/* ─── Alert component ─── */
		.cbd-alert {
			display:flex; align-items:flex-start; gap:12px;
			padding:12px 16px; margin-bottom:14px;
			border-radius:8px; border:1px solid transparent;
			animation:cbd-slide-in .3s ease;
		}
		@keyframes cbd-slide-in { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
		.cbd-alert--warning {
			background:#fffbeb; border-color:#fde68a; border-left:4px solid #f59e0b;
		}
		.cbd-alert--warning .cbd-alert__icon   { color:#d97706; }
		.cbd-alert--warning .cbd-alert__title  { color:#92400e; }
		.cbd-alert--warning .cbd-alert__msg    { color:#78350f; }
		.cbd-alert--warning .cbd-alert__dismiss{ color:#a16207; }
		.cbd-alert--danger {
			background:#fef2f2; border-color:#fecaca; border-left:4px solid #dc2626;
		}
		.cbd-alert--danger .cbd-alert__icon   { color:#dc2626; }
		.cbd-alert--danger .cbd-alert__title  { color:#7f1d1d; }
		.cbd-alert--danger .cbd-alert__msg    { color:#991b1b; }
		.cbd-alert--danger .cbd-alert__dismiss{ color:#b91c1c; }
		.cbd-alert--success {
			background:#f0fdf4; border-color:#bbf7d0; border-left:4px solid #16a34a;
		}
		.cbd-alert--success .cbd-alert__icon   { color:#16a34a; }
		.cbd-alert--success .cbd-alert__title  { color:#14532d; }
		.cbd-alert--success .cbd-alert__msg    { color:#166534; }
		.cbd-alert--success .cbd-alert__dismiss{ color:#15803d; }
		.cbd-alert__icon { flex-shrink:0; margin-top:1px; }
		.cbd-alert__body { flex:1; min-width:0; }
		.cbd-alert__title { display:block; font-size:12px; font-weight:700; margin-bottom:2px; }
		.cbd-alert__msg   { display:block; font-size:12px; }
		.cbd-alert__dismiss {
			flex-shrink:0; background:none; border:none; cursor:pointer;
			padding:2px; border-radius:4px; opacity:.7;
			transition:opacity .12s, background .12s;
		}
		.cbd-alert__dismiss:hover { opacity:1; background:rgba(0,0,0,.06); }

		/* ═══ Drill-down tables (cbd-dt2) — per-card accent colours ═══ */
		.cbd-dt2 { width:100%; border-collapse:collapse; font-size:13px; }
		.cbd-dt2 thead tr { background:var(--dt2-hdr,#4F46E5); }
		.cbd-dt2 .cbd-dt2__th-num,
		.cbd-dt2 .cbd-dt2__th { padding:9px 12px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--dt2-hdr-text,#fff); border:1px solid rgba(255,255,255,.2); white-space:nowrap; }
		.cbd-dt2 .cbd-dt2__th--r { text-align:right; }
		.cbd-dt2 .cbd-dt2__th-num { width:42px; text-align:center; }
		.cbd-dt2 tbody tr { transition:background .1s; }
		.cbd-dt2 tbody tr:hover td { background:#f7f9fc; }
		.cbd-dt2 tbody tr:nth-child(even) td { background:#fafafa; }
		.cbd-dt2 tbody tr:nth-child(even):hover td { background:#f0f4f8; }
		.cbd-dt2__num { text-align:center; font-size:11px; font-weight:700; border:1px solid var(--border-color,#d1d8dd); padding:8px 6px; }
		.cbd-dt2__cell { padding:9px 12px; font-size:13px; font-weight:500; color:var(--text-color,#1c2126); border:1px solid var(--border-color,#d1d8dd); }
		.cbd-dt2__badge-cell { padding:7px 12px; text-align:right; border:1px solid var(--border-color,#d1d8dd); }
		.cbd-dt2__pill { display:inline-flex; align-items:center; border-radius:20px; padding:3px 10px; font-size:12px; font-weight:700; border:1px solid; }

		/* ═══ Drill modal accent modifiers ═══ */
		.cbd-drill-modal--indigo .cbd-drill-modal__icon { background:#EEF2FF; color:#4F46E5; }
		.cbd-drill-modal--blue   .cbd-drill-modal__icon { background:#E0F2FE; color:#0369A1; }
		.cbd-drill-modal--teal   .cbd-drill-modal__icon { background:#CCFBF1; color:#0D9488; }
		.cbd-drill-modal--orange .cbd-drill-modal__icon { background:#FEF3C7; color:#B45309; }
		.cbd-drill-modal--violet .cbd-drill-modal__icon { background:#EDE9FE; color:#7C3AED; }
		.cbd-drill-modal--rose   .cbd-drill-modal__icon { background:#FCE7F3; color:#BE185D; }
		.cbd-drill-modal--indigo .cbd-drill-modal__title { color:#3730A3; }
		.cbd-drill-modal--blue   .cbd-drill-modal__title { color:#075985; }
		.cbd-drill-modal--teal   .cbd-drill-modal__title { color:#115E59; }
		.cbd-drill-modal--orange .cbd-drill-modal__title { color:#92400E; }
		.cbd-drill-modal--violet .cbd-drill-modal__title { color:#4C1D95; }
		.cbd-drill-modal--rose   .cbd-drill-modal__title { color:#831843; }
		.cbd-drill-modal--indigo { border-top:3px solid #4F46E5; }
		.cbd-drill-modal--blue   { border-top:3px solid #0369A1; }
		.cbd-drill-modal--teal   { border-top:3px solid #0D9488; }
		.cbd-drill-modal--orange { border-top:3px solid #B45309; }
		.cbd-drill-modal--violet { border-top:3px solid #7C3AED; }
		.cbd-drill-modal--rose   { border-top:3px solid #BE185D; }

		/* ═══ Budget modal — viewport slide ═══ */
		.cbd-bm__modal {
			overflow:hidden; max-width:720px;
			display:flex; flex-direction:column;
		}
		.cbd-bm__modal .cbd-bm__viewport {
			display:flex; width:200%; flex:1;
			transition:transform .28s cubic-bezier(.4,0,.2,1);
		}
		.cbd-bm__modal--detail .cbd-bm__viewport { transform:translateX(-50%); }
		.cbd-bm__page {
			width:50%; flex-shrink:0;
			display:flex; flex-direction:column; overflow:hidden; min-height:200px;
		}
		.cbd-bm__body { flex:1; overflow-y:auto; }
		.cbd-bm__body::-webkit-scrollbar { width:4px; }
		.cbd-bm__body::-webkit-scrollbar-thumb { background:var(--border-color,#d1d8dd); border-radius:2px; }

		/* Topbar with breadcrumb */
		.cbd-bm__topbar {
			display:flex; align-items:center; justify-content:space-between;
			padding:12px 18px;
			border-bottom:1px solid #e5e7eb;
			flex-shrink:0; background:#fff;
		}
		.cbd-bm__close {
			width:28px; height:28px; display:flex; align-items:center; justify-content:center;
			border:1px solid var(--border-color,#d1d8dd); border-radius:6px;
			background:none; cursor:pointer; color:var(--text-muted,#8d99a6); flex-shrink:0;
			transition:background .12s, color .12s;
		}
		.cbd-bm__close:hover { background:#FCEBEB; color:#A32D2D; border-color:#F09595; }

		/* Breadcrumb */
		.cbd-bc { display:flex; align-items:center; gap:4px; min-width:0; flex:1; }
		.cbd-bc__item { font-size:13px; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
		.cbd-bc__item--root   { font-weight:700; color:var(--text-color,#1c2126); }
		.cbd-bc__item--active { font-weight:700; color:var(--text-color,#1c2126); }
		.cbd-bc__item--link { background:none; border:none; padding:0; cursor:pointer; color:#4F46E5; font-weight:500; font-size:13px; transition:color .12s; white-space:nowrap; }
		.cbd-bc__item--link:hover { color:#3730A3; text-decoration:underline; }
		.cbd-bc__sep { color:var(--text-muted,#8d99a6); font-size:15px; line-height:1; flex-shrink:0; }

		/* Simple table (cbd-st) */
		.cbd-st { width:100%; border-collapse:collapse; font-size:13px; }
		.cbd-st th, .cbd-st td { border:1px solid #e5e7eb; padding:9px 12px; }
		.cbd-st__th { text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#6b7280; background:#f9fafb; }
		.cbd-st__th--num { width:44px; text-align:center; }
		.cbd-st__th--r   { text-align:right; }
		.cbd-st__num  { text-align:center; color:var(--text-muted,#8d99a6); font-size:12px; background:var(--control-bg,#fafafa); }
		.cbd-st__cell { color:var(--text-color,#1c2126); }
		.cbd-st__r    { text-align:right; font-weight:600; }
		.cbd-st__foot { background:#f9fafb; color:#374151; font-weight:600; font-size:13px; border-top:1px solid #e5e7eb !important; }
		.cbd-st tbody tr:hover td { background:#f9fafb; }
		.cbd-st__action { text-align:center; }
		.cbd-st__drill-btn { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; font-size:11px; font-weight:600; color:#4F46E5; background:#EEF2FF; border:1px solid #c7d2fe; border-radius:5px; cursor:pointer; white-space:nowrap; transition:background .12s; }
		.cbd-st__drill-btn:hover { background:#e0e7ff; }

				/* PFO banner */
		.cbd-pfo-banner {
			display:flex; align-items:center; gap:10px;
			padding:12px 16px; margin-bottom:12px;
			background:linear-gradient(135deg,#FFF7ED,#FFEDD5);
			border:1px solid #FED7AA; border-left:4px solid #F97316;
			border-radius:10px; font-size:13px; font-weight:500; color:#7C2D12;
			box-shadow:0 2px 8px rgba(249,115,22,.15);
		}
		.cbd-pfo-banner svg { flex-shrink:0; color:#F97316; width:18px; height:18px; }
				/* ─── Summary / Budget modal overlay ───────────── */
		.cbd-sm-wrap {
			position:fixed; inset:0; z-index:3100;
			background:rgba(0,0,0,0);
			display:flex; align-items:flex-start; justify-content:center;
			padding:0; box-sizing:border-box; overflow-y:auto;
			transition:background .2s ease; pointer-events:none;
		}
		.cbd-sm-wrap--open { background:rgba(0,0,0,.4); pointer-events:all; }

		.cbd-sm-modal {
			background:#fff; width:auto; min-width:440px;
			max-width:min(95vw,820px); margin:40px auto;
			border-radius:10px; border:1px solid #e5e7eb;
			box-shadow:0 8px 32px rgba(0,0,0,.12);
			display:flex; flex-direction:column;
			max-height:calc(100vh - 80px);
			opacity:0; transform:translateY(12px);
			transition:opacity .2s ease, transform .2s ease; overflow:hidden;
		}
		.cbd-sm-wrap--open .cbd-sm-modal { opacity:1; transform:translateY(0); }

		.cbd-sm-modal__header {
			display:flex; align-items:center; justify-content:space-between;
			padding:16px 20px; border-bottom:1px solid #e5e7eb; flex-shrink:0;
		}
		.cbd-sm-modal__header-left { display:flex; align-items:center; gap:12px; }
		.cbd-sm-modal__title { font-size:15px; font-weight:700; color:#111827; }
		.cbd-sm-modal__sub   { font-size:12px; color:#6b7280; margin-top:2px; }
		.cbd-sm-modal__close {
			width:28px; height:28px; display:flex; align-items:center; justify-content:center;
			border:1px solid #e5e7eb; border-radius:6px; background:none;
			cursor:pointer; color:#6b7280; transition:background .12s, color .12s;
		}
		.cbd-sm-modal__close:hover { background:#fee2e2; color:#dc2626; border-color:#fca5a5; }
		.cbd-sm-modal__body { flex:1; overflow-y:auto; }
		.cbd-sm-modal__body::-webkit-scrollbar { width:4px; }
		.cbd-sm-modal__body::-webkit-scrollbar-thumb { background:#e5e7eb; border-radius:2px; }
		.cbd-sm-tbl-wrap { overflow-x:auto; }

		/* summary table inside _open_summary_modal */
		.cbd-sm-table { width:100%; border-collapse:collapse; font-size:13px; white-space:nowrap; }
		.cbd-sm-table thead th {
			padding:9px 12px; text-align:left; font-size:10px; font-weight:700;
			text-transform:uppercase; letter-spacing:.5px; color:#6b7280;
			background:#f9fafb; border-bottom:2px solid #e5e7eb; position:sticky; top:0; z-index:2;
		}
		.cbd-sm__summary-row { cursor:pointer; border-bottom:1px solid #e5e7eb; transition:background .1s; }
		.cbd-sm__summary-row:hover { background:#f9fafb; }
		.cbd-sm__summary-row--open { background:#f5f3ff; }
		.cbd-sm__summary-row td { padding:10px 12px; vertical-align:middle; }
		.cbd-sm__td-expand { text-align:center; width:28px; }
		.cbd-sm__expand-icon { font-size:9px; display:inline-block; transition:transform .15s, color .15s; }
		.cbd-sm__td-name { min-width:180px; }
		.cbd-sm__partner-name { font-size:12px; font-weight:600; color:#111827; }
		.cbd-sm__partner-meta { font-size:11px; color:#9ca3af; margin-top:1px; }
		.cbd-sm__td-r   { text-align:right !important; }
		.cbd-sm__td-pct { text-align:center !important; }
		.cbd-sm__td-actions { text-align:center !important; white-space:nowrap; }
		.cbd-sm__expand-row td { padding:0 !important; }
		.cbd-sm__expand-td { border-bottom:2px solid #e5e7eb; border-left:3px solid #6366F1; }
		.cbd-sm__expand-td .cbd-tbl-wrap { border-radius:0; }
		.cbd-sm__grand-row td { padding:10px 12px; background:#f9fafb; border-top:2px solid #e5e7eb; font-size:12px; }
		.cbd-sm__btn-view { color:#4F46E5; background:#EEF2FF; border-color:#c7d2fe; }
		.cbd-sm__btn-view:hover { background:#e0e7ff; }
		.cbd-sm__btn-disb { color:#059669; background:#d1fae5; border-color:#6ee7b7; margin-left:4px; }
		.cbd-sm__btn-disb:hover { background:#a7f3d0; }

		/* ─── Budget modal (bm) — two-page slide ─────── */
		.cbd-bm__modal { overflow:hidden; max-width:640px; display:flex; flex-direction:column; }
		.cbd-bm__modal .cbd-bm__viewport { display:flex; width:200%; flex:1; transition:transform .28s cubic-bezier(.4,0,.2,1); }
		.cbd-bm__modal--detail .cbd-bm__viewport { transform:translateX(-50%); }
		.cbd-bm__page { width:50%; flex-shrink:0; display:flex; flex-direction:column; overflow:hidden; min-height:200px; }
		.cbd-bm__body { flex:1; overflow-y:auto; }
		.cbd-bm__body::-webkit-scrollbar { width:4px; }
		.cbd-bm__body::-webkit-scrollbar-thumb { background:#e5e7eb; border-radius:2px; }
		.cbd-bm__topbar {
			display:flex; align-items:center; justify-content:space-between;
			padding:12px 18px; border-bottom:1px solid #e5e7eb; flex-shrink:0; background:#fff;
		}
		.cbd-bm__close {
			width:28px; height:28px; display:flex; align-items:center; justify-content:center;
			border:1px solid #e5e7eb; border-radius:6px; background:none;
			cursor:pointer; color:#6b7280; flex-shrink:0; transition:background .12s, color .12s;
		}
		.cbd-bm__close:hover { background:#fee2e2; color:#dc2626; border-color:#fca5a5; }

		/* ─── Breadcrumb ─────────────────────────────── */
		.cbd-bc { display:flex; align-items:center; gap:4px; min-width:0; flex:1; }
		.cbd-bc__item { font-size:13px; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
		.cbd-bc__item--root   { font-weight:700; color:#111827; }
		.cbd-bc__item--active { font-weight:700; color:#111827; }
		.cbd-bc__item--link {
			background:none; border:none; padding:0; cursor:pointer;
			color:#4F46E5; font-weight:500; font-size:13px;
			transition:color .12s; white-space:nowrap;
		}
		.cbd-bc__item--link:hover { color:#3730A3; text-decoration:underline; }
		.cbd-bc__sep { color:#d1d5db; font-size:15px; line-height:1; flex-shrink:0; }

				/* ─── Universal Drill Modal (cbd-dw) ─── */
		.cbd-dw {
			position:fixed; inset:0; z-index:3200;
			background:rgba(0,0,0,0);
			display:flex; align-items:flex-start; justify-content:center;
			padding:0; overflow-y:auto; box-sizing:border-box;
			transition:background .2s ease; pointer-events:none;
		}
		.cbd-dw--open { background:rgba(0,0,0,.45); pointer-events:all; }
		.cbd-dm {
			background:#fff;
			width:min(99vw, 1380px);
			margin:14px auto; border-radius:12px;
			border:1px solid #e2e8f0;
			box-shadow:0 24px 64px rgba(0,0,0,.20);
			display:flex; flex-direction:column;
			min-height:200px;
			max-height:calc(100vh - 28px);
			overflow:hidden;
			opacity:0; transform:translateY(14px);
			transition:opacity .2s ease, transform .2s ease;
		}
		.cbd-dw--open .cbd-dm { opacity:1; transform:translateY(0); }
		.cbd-dm__track {
			display:flex; width:300%; flex:1;
			transition:transform .28s cubic-bezier(.4,0,.2,1);
			min-height:0;
		}
		.cbd-dm__page {
			width:calc(100%/3); flex-shrink:0;
			display:flex; flex-direction:column;
			overflow:hidden; min-height:0;
		}
		/* 2-page variant (card drill modal: partner → budget) */
		.cbd-dm__track--2 { width:200%; }
		.cbd-dm__page--2  { width:50%; }
		.cbd-dm__topbar {
			display:flex; align-items:center; justify-content:space-between;
			padding:11px 18px; border-bottom:2px solid #e8edf3;
			flex-shrink:0; gap:12px;
			background:linear-gradient(to right,#f8fafc,#fff);
		}
		.cbd-dm__topbar-left { display:flex; align-items:center; gap:8px; min-width:0; flex:1; }
		.cbd-dm__back {
			display:inline-flex; align-items:center; gap:4px;
			padding:4px 10px; font-size:12px; font-weight:600;
			color:#374151; background:#fff; border:1px solid #d1d5db;
			border-radius:6px; cursor:pointer; white-space:nowrap; flex-shrink:0;
			transition:background .12s, border-color .12s;
		}
		.cbd-dm__back:hover { background:#f3f4f6; border-color:#9ca3af; }
		.cbd-dm__actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
		.cbd-dm__body {
			flex:1; overflow:hidden;
			min-height:0;
			display:flex; flex-direction:column;
		}
		.cbd-dm__tbl-wrap {
			flex:1; overflow:auto; min-height:0;
		}
		.cbd-dm__tbl-wrap::-webkit-scrollbar { width:5px; height:5px; }
		.cbd-dm__tbl-wrap::-webkit-scrollbar-track { background:#f1f5f9; }
		.cbd-dm__tbl-wrap::-webkit-scrollbar-thumb { background:#94a3b8; border-radius:3px; }

		.cbd-dm__loading { padding:32px; text-align:center; color:#9ca3af; font-size:13px; }
		.cbd-dm__empty   { padding:32px; text-align:center; color:#9ca3af; font-size:13px; }

		/* Pending Utilization modal — month chips, missing-email badge */
		.cbd-pu__month-chip {
			display:inline-block; font-size:10px; font-weight:600;
			color:#9a3412; background:#ffedd5; border:1px solid #fed7aa;
			border-radius:12px; padding:2px 8px; margin:1px 3px 1px 0;
			white-space:nowrap;
		}
		.cbd-pu__month-chip--more { color:#475569; background:#f1f5f9; border-color:#e2e8f0; }
		.cbd-pu__no-email { color:#cbd5e1; font-style:italic; font-size:12px; }
		.cbd-pu__msgbar {
			padding:10px 18px; border-bottom:1px solid #eef2f7; background:#f8fafc;
		}
		.cbd-pu__msglbl {
			display:block; font-size:11px; font-weight:700; color:#475569;
			margin-bottom:5px;
		}
		.cbd-pu__msglbl-opt { font-weight:500; color:#94a3b8; text-transform:none; letter-spacing:0; }
		.cbd-pu__msgbox {
			width:100%; resize:vertical; min-height:42px;
			font-size:12.5px; font-family:inherit; color:#1e293b;
			border:1px solid #e2e8f0; border-radius:7px; padding:8px 10px;
			background:#fff; transition:border-color .12s;
		}
		.cbd-pu__msgbox:focus { outline:none; border-color:#93c5fd; box-shadow:0 0 0 3px rgba(37,99,235,.08); }

		/* Close button — top-right of topbar, simple icon button */
		.cbd-dm__close {
			display:inline-flex; align-items:center; justify-content:center;
			width:30px; height:30px; flex-shrink:0;
			border:1px solid #e2e8f0; border-radius:7px;
			background:#fff; cursor:pointer; color:#64748b;
			transition:background .12s, color .12s, border-color .12s;
		}
		.cbd-dm__close:hover { background:#fee2e2; color:#dc2626; border-color:#fca5a5; }

		/* Search box in topbar */
		.cbd-dm__search {
			display:flex; align-items:center; gap:6px;
			padding:0 10px; height:30px;
			border:1px solid #e2e8f0; border-radius:7px;
			background:#f8fafc; color:#94a3b8;
			transition:border-color .12s;
		}
		.cbd-dm__search:focus-within { border-color:#93c5fd; background:#fff; }
		.cbd-dm__search-input {
			border:none; background:none; outline:none;
			font-size:12px; color:#1e293b; width:130px;
		}
		.cbd-dm__search-input::placeholder { color:#94a3b8; }

		/* Single export dropdown button */
		.cbd-exp-dd { position:relative; flex-shrink:0; }
		.cbd-exp-btn--main {
			display:inline-flex; align-items:center; gap:6px;
			height:30px; padding:0 12px; font-size:12px; font-weight:600;
			color:#1e3a5f; background:#e8f0fe; border:1px solid #93c5fd;
			border-radius:7px; cursor:pointer; transition:background .12s;
		}
		.cbd-exp-btn--main:hover { background:#dbeafe; }
		.cbd-exp-dd__menu {
			position:absolute; top:calc(100% + 4px); right:0;
			min-width:160px; background:#fff;
			border:1px solid #e2e8f0; border-radius:8px;
			box-shadow:0 8px 24px rgba(0,0,0,.12);
			opacity:0; visibility:hidden; transform:translateY(-4px);
			transition:opacity .12s, transform .12s, visibility .12s;
			z-index:20; overflow:hidden; padding:4px;
		}
		.cbd-exp-dd--open .cbd-exp-dd__menu { opacity:1; visibility:visible; transform:translateY(0); }
		.cbd-exp-dd__item {
			display:flex; align-items:center; gap:8px; width:100%;
			padding:8px 10px; font-size:12px; font-weight:500; text-align:left;
			color:#334155; background:none; border:none; border-radius:6px;
			cursor:pointer; transition:background .1s;
		}
		.cbd-exp-dd__item:hover { background:#f1f5f9; }

		/* Breadcrumb */
		.cbd-bc { display:flex; align-items:center; gap:5px; flex:1; min-width:0; }
		.cbd-bc__item { font-size:13px; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
		.cbd-bc__item--active { font-weight:700; color:#111827; }
		.cbd-bc__item--muted  { font-weight:400; color:#9ca3af; }
		.cbd-bc__item--link {
			font-weight:500; color:#2563EB; cursor:pointer;
			background:none; border:none; padding:0; font-size:13px;
			text-decoration:none; transition:color .1s;
		}
		.cbd-bc__item--link:hover { color:#1d4ed8; text-decoration:underline; }
		.cbd-bc__sep { color:#d1d5db; font-size:14px; flex-shrink:0; }

		/* ─── Drill-down table — full grid, clean borders ─── */
		.cbd-dt {
			width:100%; border-collapse:collapse;
			font-size:13px; white-space:nowrap;
			border:1px solid #cbd5e1;
		}
		.cbd-dt thead { position:sticky; top:0; z-index:3; }
		.cbd-dt tfoot { position:sticky; bottom:0; z-index:3; }
		.cbd-dt th {
			padding:10px 14px; text-align:left;
			font-size:10px; font-weight:700; text-transform:uppercase;
			letter-spacing:.5px;
			color:#1e3a5f; background:#dbeafe;
			border:1px solid #93c5fd;
		}
		.cbd-dt td {
			padding:9px 14px;
			border:1px solid #e2e8f0;
			vertical-align:middle; color:#334155;
			background:#fff;
		}
		.cbd-dt__th--num { width:44px; text-align:center; }
		.cbd-dt__th--r   { text-align:right; }
		/* Subtle hover only — no alternating stripes, like report-card table */
		.cbd-dt__row:hover td { background:#eff6ff !important; transition:background .08s; }
		.cbd-dt__num  { text-align:center; color:#64748b; font-size:11px; width:44px; font-weight:600; background:#f8fafc; }
		.cbd-dt__name { color:#0f172a; font-weight:500; }
		.cbd-dt__r    { text-align:right; font-weight:700; color:#0f172a; }
		.cbd-dt__pct  { font-weight:800; }
		.cbd-dt__act  { text-align:center; }
		/* Footer / Total row — same table, sticky to bottom of scroll wrap */
		.cbd-dt tfoot tr td,
		.cbd-dt__foot {
			padding:10px 14px; font-weight:800; font-size:13px;
			color:#1e3a5f; background:#bfdbfe !important;
			border:1px solid #93c5fd !important;
		}
		.cbd-dt__btn {
			display:inline-flex; align-items:center; gap:4px;
			padding:4px 12px; font-size:11px; font-weight:600;
			color:#1d4ed8; background:#eff6ff; border:1px solid #93c5fd;
			border-radius:6px; cursor:pointer; transition:all .12s;
		}
		.cbd-dt__btn:hover { background:#dbeafe; box-shadow:0 2px 6px rgba(37,99,235,.2); }
		.cbd-dm__consolidated-btn {
			display:flex; width:fit-content; font-weight:700;
		}

		/* ── Main Head expand/collapse grouping ── */
		.cbd-dt--grouped { table-layout:auto; }
		.cbd-grp__header-row {
			cursor:pointer; background:#f1f5f9 !important;
			transition:background .12s;
		}
		.cbd-grp__header-row:hover { background:#e2e8f0 !important; }
		.cbd-grp__header-row td {
			background:#f1f5f9 !important; border:1px solid #dbe3ea !important;
			padding:8px 14px !important;
		}
		.cbd-grp__header-row:hover td { background:#e2e8f0 !important; }
		.cbd-grp__header {
			display:flex; align-items:center; gap:10px;
		}
		.cbd-grp__chevron {
			flex-shrink:0; color:#64748b; transition:transform .15s;
		}
		.cbd-grp__header-row--open .cbd-grp__chevron { transform:rotate(90deg); }
		.cbd-grp__title { font-weight:700; color:#1e293b; font-size:12.5px; }
		.cbd-grp__count {
			font-size:10.5px; font-weight:600; color:#94a3b8;
			background:#fff; border:1px solid #e2e8f0; border-radius:10px;
			padding:1px 8px;
		}
		.cbd-grp__subtotal {
			margin-left:auto; font-weight:800; color:#0f172a; font-size:12.5px;
		}
		.cbd-grp__child-row--hidden { display:none; }

		.cbd-tip-wrap { border-bottom:1px dashed #94a3b8; cursor:default; }
		.cbd-tip-wrap-bak { position:relative; display:inline-flex; align-items:center; gap:2px; border-bottom:1.5px dashed rgba(55,138,221,.45); padding-bottom:1px; transition:border-color .15s; }
		.cbd-tip-wrap:hover { border-bottom-color:rgba(55,138,221,.9); }
		#cbd-global-tip { position:fixed; z-index:9999; pointer-events:none; background:#1A1D23; border:1px solid rgba(255,255,255,.10); color:#fff; border-radius:10px; font-family:inherit; box-shadow:0 12px 32px rgba(0,0,0,.30), 0 2px 8px rgba(0,0,0,.20); opacity:0; transform:translateY(8px) scale(.96); transition:opacity .16s ease, transform .2s cubic-bezier(.22,1,.36,1); min-width:150px; max-width:260px; overflow:hidden; padding:0; }
		#cbd-global-tip .cbd-tip__header { padding:7px 12px 5px; border-bottom:1px solid rgba(255,255,255,.08); display:flex; align-items:center; gap:6px; }
		#cbd-global-tip .cbd-tip__icon { width:16px; height:16px; border-radius:4px; background:rgba(55,138,221,.25); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
		#cbd-global-tip .cbd-tip__label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.7px; color:rgba(255,255,255,.50); }
		#cbd-global-tip .cbd-tip__body { padding:6px 12px 10px; }
		#cbd-global-tip .cbd-tip__amount { font-size:16px; font-weight:700; letter-spacing:.3px; color:#fff; display:block; }
		#cbd-global-tip .cbd-tip__hint { font-size:10px; color:rgba(255,255,255,.35); margin-top:2px; display:block; }
		#cbd-global-tip::after { content:''; position:absolute; left:50%; transform:translateX(-50%); bottom:-6px; border:6px solid transparent; border-bottom:none; border-top-color:#1A1D23; }
		#cbd-global-tip.cbd-tip--visible { opacity:1; transform:translateY(0) scale(1); }
		#cbd-global-tip.cbd-tip--below::after { bottom:auto; top:-6px; border-top:none; border-bottom:6px solid #1A1D23; }
		@media (max-width:1024px) { .cbd-filter-col { flex:1 1 33.33%; min-width:140px; } .cbd-summary-cards { grid-template-columns:repeat(4,1fr); gap:10px; } .cbd-overview-strip { grid-template-columns:repeat(2,1fr); }  .cbd-panel-left, .cbd-panel-right { width:62vw; } .cbd-disb-modal { width:68vw; } .cbd-scard__num { font-size:18px; } .cbd-partner__footer { flex-wrap:wrap; } }
		@media (max-width:768px) { .cbd-root { padding:8px 10px 30px; } .cbd-filter-col { flex:1 1 50%; min-width:130px; } .cbd-summary-cards { grid-template-columns:repeat(2,1fr); gap:10px; } .cbd-overview-strip { flex-wrap:wrap; } .cbd-ostat { flex:1 1 50%; } .cbd-partner__head { flex-direction:column; gap:8px; } .cbd-partner__right { flex-direction:row; align-items:center; justify-content:space-between; flex-wrap:wrap; width:100%; } .cbd-partner__metrics { gap:4px; } .cbd-metric { min-width:60px; padding:2px 6px; } .cbd-metric__value { font-size:11px; } .cbd-partner__footer { flex-direction:column; } .cbd-footer-block + .cbd-footer-block { border-left:none; border-top:1px solid var(--border-color,#d1d8dd); } .cbd-partner__grants { padding-left:0; } .cbd-panel-left, .cbd-panel-right { width:100vw; max-width:100vw; border-radius:0; } .cbd-panel-left.cbd-panel--full, .cbd-panel-right.cbd-panel--full { width:100vw; } .cbd-disb-modal { width:100vw; max-width:100vw; border-radius:0; } .cbd-table { font-size:11px; } .cbd-table th, .cbd-table td { padding:6px 8px; } #cbd_partners { max-height:none; overflow-y:visible; } .cbd-centre-close { display:none !important; } }
		@media (max-width:480px) { .cbd-root { padding:6px 8px 24px; } .cbd-filter-col { flex:1 1 100%; min-width:0; } .cbd-summary-cards { grid-template-columns:repeat(2,1fr); gap:8px; } .cbd-overview-strip { display:grid; grid-template-columns:1fr 1fr; } .cbd-ostat { border-right:1px solid var(--border-color,#d1d8dd); border-bottom:1px solid var(--border-color,#d1d8dd); } .cbd-ostat__value { font-size:14px; } .cbd-partner__metrics { display:grid; grid-template-columns:repeat(2,1fr); gap:4px; } .cbd-metric { min-width:0; } .cbd-metric__label { font-size:10px; } .cbd-scard { padding:10px 10px; } .cbd-scard__num { font-size:16px; } .cbd-panel__header-actions .cbd-expand-all-label { display:none; } .cbd-panel__title { font-size:12px; } }
		@media (max-width:360px) { .cbd-filter-col { padding:3px 4px 0; } .cbd-scard__num { font-size:14px; } }
		`;
		document.head.appendChild(style);

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